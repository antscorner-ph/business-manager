-- Add a low-stock threshold to products. This value is synced from Loyverse
-- (per-variant/store low_stock); when Loyverse has no value, it defaults to
-- 10% of the current inventory quantity.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS low_stock NUMERIC(12, 2);

-- Backfill existing rows: default the threshold to 10% of current qty (rounded),
-- only where it hasn't been set yet.
UPDATE public.products
SET low_stock = ROUND(COALESCE(qty, 0) * 0.10)
WHERE low_stock IS NULL;
