-- Consignment integrity: atomic transaction recording + payment settlement.
--
--   1) record_consignment_transaction(JSONB, JSONB)
--      - RESTOCK: adds quantity to consignee stock (upserts snapshot price).
--      - REMITTANCE: validates sufficient stock (no negative), deducts stock,
--        computes gross/commission/amount_due, all in one transaction.
--   2) validate_consignment_payment_amount -> reject non-positive & overpayment
--   3) update_consignment_transaction_on_payment -> write back paid/balance/status

BEGIN;

-- ---------------------------------------------------------------------------
-- Atomic transaction: header + items + stock mutation in a single commit.
-- p_header: { consignee_id, type, transaction_date?, notes? }
-- p_items:  [ { product_sku, quantity } , ... ]   (price is read from snapshot)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_consignment_transaction(
  p_header JSONB,
  p_items JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx_id UUID;
  v_consignee_id UUID;
  v_type TEXT;
  v_tx_date DATE;
  v_notes TEXT;
  v_commission_rate NUMERIC(5,4);
  v_item JSONB;
  v_sku TEXT;
  v_qty INTEGER;
  v_price NUMERIC(12,2);
  v_current_qty INTEGER;
  v_gross NUMERIC(12,2) := 0;
  v_commission NUMERIC(12,2) := 0;
  v_due NUMERIC(12,2) := 0;
BEGIN
  v_consignee_id := NULLIF(p_header->>'consignee_id', '')::UUID;
  v_type := p_header->>'type';
  v_tx_date := COALESCE((p_header->>'transaction_date')::DATE, CURRENT_DATE);
  v_notes := NULLIF(p_header->>'notes', '');

  IF v_consignee_id IS NULL THEN
    RAISE EXCEPTION 'consignee_id is required';
  END IF;

  IF v_type NOT IN ('REMITTANCE', 'RESTOCK') THEN
    RAISE EXCEPTION 'Invalid transaction type: %', v_type;
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'At least one line item is required';
  END IF;

  -- Lock consignee to read commission and serialize concurrent writes.
  SELECT commission_rate INTO v_commission_rate
  FROM public.consignees
  WHERE id = v_consignee_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Consignee not found';
  END IF;

  -- Insert header first (financials filled after processing items).
  INSERT INTO public.consignment_transactions (
    consignee_id, type, transaction_date, notes
  )
  VALUES (v_consignee_id, v_type, v_tx_date, v_notes)
  RETURNING id INTO v_tx_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_sku := NULLIF(v_item->>'product_sku', '');
    v_qty := COALESCE((v_item->>'quantity')::INTEGER, 0);

    IF v_sku IS NULL THEN
      RAISE EXCEPTION 'Line item product_sku is required';
    END IF;
    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Quantity must be greater than zero (sku %)', v_sku;
    END IF;

    IF v_type = 'RESTOCK' THEN
      -- Snapshot price from catalog if this product isn't placed yet.
      INSERT INTO public.consignee_products (consignee_id, product_sku, quantity, unit_price, status)
      VALUES (
        v_consignee_id,
        v_sku,
        v_qty,
        COALESCE((SELECT price FROM public.products WHERE sku = v_sku), 0),
        'ACTIVE'
      )
      ON CONFLICT (consignee_id, product_sku) DO UPDATE
        SET quantity = public.consignee_products.quantity + EXCLUDED.quantity,
            status = 'ACTIVE';

      -- Use the (possibly pre-existing) snapshot price for the line item.
      SELECT unit_price INTO v_price
      FROM public.consignee_products
      WHERE consignee_id = v_consignee_id AND product_sku = v_sku;

    ELSE -- REMITTANCE
      SELECT quantity, unit_price INTO v_current_qty, v_price
      FROM public.consignee_products
      WHERE consignee_id = v_consignee_id AND product_sku = v_sku
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Product % is not consigned to this consignee', v_sku;
      END IF;
      IF v_qty > v_current_qty THEN
        RAISE EXCEPTION 'Cannot remit % units of %; only % on hand', v_qty, v_sku, v_current_qty;
      END IF;

      UPDATE public.consignee_products
      SET quantity = quantity - v_qty
      WHERE consignee_id = v_consignee_id AND product_sku = v_sku;

      v_gross := v_gross + (v_qty * v_price);
    END IF;

    INSERT INTO public.consignment_transaction_items (transaction_id, product_sku, quantity, unit_price)
    VALUES (v_tx_id, v_sku, v_qty, COALESCE(v_price, 0));
  END LOOP;

  IF v_type = 'REMITTANCE' THEN
    v_commission := ROUND(v_gross * v_commission_rate, 2);
    v_due := v_gross - v_commission;

    UPDATE public.consignment_transactions
    SET gross_amount = v_gross,
        commission_amount = v_commission,
        amount_due = v_due,
        balance = v_due,
        payment_status = CASE WHEN v_due <= 0 THEN 'paid' ELSE 'unpaid' END
    WHERE id = v_tx_id;
  END IF;

  RETURN v_tx_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_consignment_transaction(JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_consignment_transaction(JSONB, JSONB) TO authenticated;

-- ---------------------------------------------------------------------------
-- Payment validation: positive amount, no overpayment, only against REMITTANCE.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_consignment_payment_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount_due NUMERIC(12,2);
  v_type TEXT;
  v_paid_so_far NUMERIC(12,2);
BEGIN
  IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  SELECT t.amount_due, t.type INTO v_amount_due, v_type
  FROM public.consignment_transactions t
  WHERE t.id = NEW.transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Consignment transaction not found';
  END IF;
  IF v_type <> 'REMITTANCE' THEN
    RAISE EXCEPTION 'Payments can only be recorded against remittances';
  END IF;

  SELECT COALESCE(SUM(cp.amount), 0) INTO v_paid_so_far
  FROM public.consignment_payments cp
  WHERE cp.transaction_id = NEW.transaction_id
    AND (TG_OP <> 'UPDATE' OR cp.id <> NEW.id);

  IF v_paid_so_far + NEW.amount > v_amount_due THEN
    RAISE EXCEPTION 'Payment exceeds remaining remittance balance';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_consignment_payment_amount_trigger ON public.consignment_payments;
CREATE TRIGGER validate_consignment_payment_amount_trigger
  BEFORE INSERT OR UPDATE ON public.consignment_payments
  FOR EACH ROW EXECUTE FUNCTION public.validate_consignment_payment_amount();

-- ---------------------------------------------------------------------------
-- Write-back: recompute amount_paid / balance / payment_status.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_consignment_transaction_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx_id UUID;
BEGIN
  v_tx_id := COALESCE(NEW.transaction_id, OLD.transaction_id);

  UPDATE public.consignment_transactions t
  SET amount_paid = p.total_paid,
      balance = GREATEST(t.amount_due - p.total_paid, 0),
      payment_status = CASE
        WHEN p.total_paid >= t.amount_due THEN 'paid'
        WHEN p.total_paid > 0 THEN 'partial'
        ELSE 'unpaid'
      END
  FROM (
    SELECT COALESCE(SUM(amount), 0) AS total_paid
    FROM public.consignment_payments
    WHERE transaction_id = v_tx_id
  ) p
  WHERE t.id = v_tx_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS update_consignment_transaction_on_payment_trigger ON public.consignment_payments;
CREATE TRIGGER update_consignment_transaction_on_payment_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.consignment_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_consignment_transaction_on_payment();

COMMIT;
