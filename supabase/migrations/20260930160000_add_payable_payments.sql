-- Record-payment-from-Payables:
-- A single payment-history table that spans the two payable sources
-- (purchase_orders and expenses). Triggers:
--   1) validate_payable_payment_amount  -> reject non-positive & overpayment
--   2) update_payable_source_on_payment -> write back status on the source row
--
-- Enum note: purchase_orders.payment_status uses ('unpaid','partial','paid')
-- while expenses.status uses ('paid','unpaid','partially_paid'). The write-back
-- trigger maps to the correct enum per source_type.

BEGIN;

CREATE TABLE IF NOT EXISTS public.payable_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_type TEXT NOT NULL CHECK (source_type IN ('purchase_order', 'expense')),
  source_id UUID NOT NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'cash'
    CHECK (payment_method IN ('cash', 'gcash', 'check', 'bank_transfer', 'other')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payable_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON public.payable_payments FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.payable_payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete access" ON public.payable_payments FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_payable_payments_source
  ON public.payable_payments(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_payable_payments_date
  ON public.payable_payments(payment_date);

-- ---------------------------------------------------------------------------
-- Validation: positive amount + no overpayment (with row lock on the source).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_payable_payment_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source_total NUMERIC(12,2);
  v_paid_so_far NUMERIC(12,2);
BEGIN
  IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  -- Lock the source row to avoid concurrent overpayment races and fetch its total.
  IF NEW.source_type = 'purchase_order' THEN
    SELECT po.total_amount INTO v_source_total
    FROM public.purchase_orders po
    WHERE po.id = NEW.source_id
    FOR UPDATE;
  ELSIF NEW.source_type = 'expense' THEN
    SELECT e.amount INTO v_source_total
    FROM public.expenses e
    WHERE e.id = NEW.source_id
    FOR UPDATE;
  ELSE
    RAISE EXCEPTION 'Unknown payable source_type: %', NEW.source_type;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payable source not found (% %)', NEW.source_type, NEW.source_id;
  END IF;

  SELECT COALESCE(SUM(pp.amount), 0)
  INTO v_paid_so_far
  FROM public.payable_payments pp
  WHERE pp.source_type = NEW.source_type
    AND pp.source_id = NEW.source_id
    AND (TG_OP <> 'UPDATE' OR pp.id <> NEW.id);

  IF v_paid_so_far + NEW.amount > v_source_total THEN
    RAISE EXCEPTION 'Payment exceeds remaining payable balance';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_payable_payment_amount_trigger ON public.payable_payments;
CREATE TRIGGER validate_payable_payment_amount_trigger
  BEFORE INSERT OR UPDATE ON public.payable_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_payable_payment_amount();

-- ---------------------------------------------------------------------------
-- Write-back: recompute the source row's status from cumulative payments.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_payable_source_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source_type TEXT;
  v_source_id UUID;
  v_total_paid NUMERIC(12,2);
BEGIN
  v_source_type := COALESCE(NEW.source_type, OLD.source_type);
  v_source_id := COALESCE(NEW.source_id, OLD.source_id);

  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_paid
  FROM public.payable_payments
  WHERE source_type = v_source_type
    AND source_id = v_source_id;

  IF v_source_type = 'purchase_order' THEN
    UPDATE public.purchase_orders po
    SET
      payment_status = CASE
        WHEN v_total_paid >= po.total_amount THEN 'paid'
        WHEN v_total_paid > 0 THEN 'partial'
        ELSE 'unpaid'
      END,
      updated_at = now()
    WHERE po.id = v_source_id;
  ELSIF v_source_type = 'expense' THEN
    UPDATE public.expenses e
    SET
      status = CASE
        WHEN v_total_paid >= e.amount THEN 'paid'
        WHEN v_total_paid > 0 THEN 'partially_paid'
        ELSE 'unpaid'
      END,
      updated_at = now()
    WHERE e.id = v_source_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS update_payable_source_on_payment_trigger ON public.payable_payments;
CREATE TRIGGER update_payable_source_on_payment_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.payable_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_payable_source_on_payment();

COMMIT;
