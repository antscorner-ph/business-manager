-- Structured line items for purchase orders.
-- The existing purchase_orders.items TEXT column is kept for backward compatibility
-- and is populated with a human-readable summary generated from these rows.
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  -- Reference to the catalog product (nullable to allow ad-hoc lines not in the catalog).
  product_sku TEXT REFERENCES public.products(sku) ON DELETE SET NULL,
  -- Name snapshot so the PO stays accurate even if the catalog entry is later edited.
  name TEXT NOT NULL,
  unit TEXT,
  po_in_pcs NUMERIC(12, 2) NOT NULL DEFAULT 0,
  unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  line_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  -- Free-text inventory reference (prefilled with catalog qty at time of order,
  -- e.g. "120 on hand" or an alternate supplier note like "YOOMS/FONE").
  inventory_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS to match the rest of the app's public-access policies.
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON public.purchase_order_items
  FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.purchase_order_items
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.purchase_order_items
  FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.purchase_order_items
  FOR DELETE USING (true);

-- Index for fetching all line items belonging to a purchase order.
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po
  ON public.purchase_order_items(purchase_order_id);
