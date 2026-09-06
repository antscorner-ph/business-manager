-- Migrate away from the legacy free-text purchase_orders.items column in favor
-- of the structured purchase_order_items table.
--
-- Step 1: Backfill. For every purchase order that has NO structured line items
-- yet but does have legacy items text, create a single line item that preserves
-- that text (so no historical information is lost when the column is dropped).
-- The whole PO total is placed on this single synthesized line.
INSERT INTO public.purchase_order_items
  (purchase_order_id, product_sku, name, unit, po_in_pcs, unit_cost, line_total, inventory_note)
SELECT
  po.id,
  NULL,
  COALESCE(NULLIF(btrim(po.items), ''), 'Imported items'),
  NULL,
  0,
  0,
  po.total_amount,
  NULL
FROM public.purchase_orders po
WHERE NOT EXISTS (
  SELECT 1 FROM public.purchase_order_items poi
  WHERE poi.purchase_order_id = po.id
);

-- Step 2: Drop the legacy column now that its data is preserved as line items.
ALTER TABLE public.purchase_orders DROP COLUMN IF EXISTS items;
