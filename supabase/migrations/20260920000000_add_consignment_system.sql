-- Consignment system.
--
-- Business model: the business places its own products in a consignee's store.
-- The consignee sells on the business's behalf and periodically "remits" for
-- units sold. Consignees may keep a commission (percentage of sold value); the
-- remaining amount becomes an outstanding balance owed to the business, settled
-- through consignment_payments (mirrors the receivable_payments pattern).
--
-- IMPORTANT: this references the REAL products table (products.sku / products.price),
-- which already exists. We do NOT create a products table here.

BEGIN;

-- ---------------------------------------------------------------------------
-- Consignees (the stores that hold our stock).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.consignees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  -- Commission the consignee keeps on each sale, as a fraction [0,1].
  -- 0 = straight remittance (business is owed full sold value).
  commission_rate NUMERIC(5, 4) NOT NULL DEFAULT 0
    CHECK (commission_rate >= 0 AND commission_rate <= 1),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Consigned products: stock currently held by a consignee.
-- unit_price is snapshotted at placement so valuation is stable even if the
-- catalog price later changes.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.consignee_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  consignee_id UUID NOT NULL REFERENCES public.consignees(id) ON DELETE CASCADE,
  product_sku TEXT NOT NULL REFERENCES public.products(sku) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(consignee_id, product_sku)
);

-- ---------------------------------------------------------------------------
-- Consignment transactions (header). A REMITTANCE reports units sold and may
-- generate an amount the consignee owes. A RESTOCK adds inventory.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.consignment_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  consignee_id UUID NOT NULL REFERENCES public.consignees(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('REMITTANCE', 'RESTOCK')),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Financials (populated for REMITTANCE; zero for RESTOCK):
  gross_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,      -- sold value at snapshot price
  commission_amount NUMERIC(12, 2) NOT NULL DEFAULT 0, -- consignee's cut
  amount_due NUMERIC(12, 2) NOT NULL DEFAULT 0,        -- owed to the business (gross - commission)
  amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0,
  balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Transaction line items.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.consignment_transaction_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.consignment_transactions(id) ON DELETE CASCADE,
  product_sku TEXT NOT NULL REFERENCES public.products(sku) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Payments against remittance balances (settlement of what the consignee owes).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.consignment_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.consignment_transactions(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'cash'
    CHECK (payment_method IN ('cash', 'gcash', 'check', 'bank_transfer', 'other')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- RLS: scoped to authenticated users (the rest of the hardened schema uses
-- authenticated-only access; see 20260906060000_harden_rls_and_add_audit_log).
-- ---------------------------------------------------------------------------
ALTER TABLE public.consignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consignee_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consignment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consignment_transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consignment_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated full access" ON public.consignees
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON public.consignee_products
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON public.consignment_transactions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON public.consignment_transaction_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON public.consignment_payments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- updated_at triggers (function defined in the initial migration).
-- ---------------------------------------------------------------------------
CREATE TRIGGER update_consignees_updated_at
  BEFORE UPDATE ON public.consignees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_consignee_products_updated_at
  BEFORE UPDATE ON public.consignee_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Indexes.
-- ---------------------------------------------------------------------------
CREATE INDEX idx_consignee_products_consignee_id ON public.consignee_products(consignee_id);
CREATE INDEX idx_consignee_products_product_sku ON public.consignee_products(product_sku);
CREATE INDEX idx_consignment_transactions_consignee_id ON public.consignment_transactions(consignee_id);
CREATE INDEX idx_consignment_transaction_items_transaction_id ON public.consignment_transaction_items(transaction_id);
CREATE INDEX idx_consignment_payments_transaction_id ON public.consignment_payments(transaction_id);

COMMIT;
