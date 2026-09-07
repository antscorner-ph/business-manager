-- Atomic purchase order creation: header + line items in one transaction.
-- Prevents orphaned headers when line item insert fails.

BEGIN;

CREATE OR REPLACE FUNCTION public.create_purchase_order_with_items(
  p_header JSONB,
  p_items JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_po_id UUID;
  v_item JSONB;
  v_name TEXT;
  v_unit TEXT;
  v_product_sku TEXT;
  v_inventory_note TEXT;
  v_qty NUMERIC(12,2);
  v_unit_cost NUMERIC(12,2);
  v_line_total NUMERIC(12,2);
  v_total NUMERIC(12,2) := 0;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'At least one line item is required';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_name := btrim(COALESCE(v_item->>'name', ''));
    v_qty := COALESCE((v_item->>'po_in_pcs')::NUMERIC, 0);
    v_unit_cost := COALESCE((v_item->>'unit_cost')::NUMERIC, 0);

    IF v_name = '' THEN
      RAISE EXCEPTION 'Line item name is required';
    END IF;

    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Line item quantity must be greater than zero';
    END IF;

    IF v_unit_cost < 0 THEN
      RAISE EXCEPTION 'Line item unit cost cannot be negative';
    END IF;

    v_line_total := ROUND(v_qty * v_unit_cost, 2);
    v_total := v_total + v_line_total;
  END LOOP;

  INSERT INTO public.purchase_orders (
    date,
    voucher_no,
    supplier_id,
    supplier_name,
    or_no,
    total_amount,
    partial_payment_notes,
    payment_status,
    status,
    delivered_date,
    notes
  )
  VALUES (
    COALESCE((p_header->>'date')::DATE, CURRENT_DATE),
    p_header->>'voucher_no',
    NULLIF(p_header->>'supplier_id', '')::UUID,
    COALESCE(p_header->>'supplier_name', ''),
    NULLIF(p_header->>'or_no', ''),
    v_total,
    NULLIF(p_header->>'partial_payment_notes', ''),
    COALESCE(p_header->>'payment_status', 'unpaid'),
    COALESCE(p_header->>'status', 'pending'),
    NULLIF(p_header->>'delivered_date', '')::DATE,
    NULLIF(p_header->>'notes', '')
  )
  RETURNING id INTO v_po_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_sku := NULLIF(v_item->>'product_sku', '');
    v_name := btrim(v_item->>'name');
    v_unit := NULLIF(v_item->>'unit', '');
    v_qty := COALESCE((v_item->>'po_in_pcs')::NUMERIC, 0);
    v_unit_cost := COALESCE((v_item->>'unit_cost')::NUMERIC, 0);
    v_inventory_note := NULLIF(v_item->>'inventory_note', '');
    v_line_total := ROUND(v_qty * v_unit_cost, 2);

    INSERT INTO public.purchase_order_items (
      purchase_order_id,
      product_sku,
      name,
      unit,
      po_in_pcs,
      unit_cost,
      line_total,
      inventory_note
    )
    VALUES (
      v_po_id,
      v_product_sku,
      v_name,
      v_unit,
      v_qty,
      v_unit_cost,
      v_line_total,
      v_inventory_note
    );
  END LOOP;

  RETURN v_po_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_purchase_order_with_items(JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_purchase_order_with_items(JSONB, JSONB) TO authenticated;

COMMIT;
