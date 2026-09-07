-- Staging tables for historical data import.
-- Load CSV files into these tables first (Dashboard Table Editor import),
-- then run the import migration that maps into production tables.

BEGIN;

CREATE TABLE IF NOT EXISTS public.import_stage_suppliers (
  id TEXT,
  name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  contact_person TEXT,
  payment_terms TEXT,
  notes TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS public.import_stage_customers (
  id TEXT,
  name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  contact_person TEXT,
  notes TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS public.import_stage_products (
  sku TEXT,
  name TEXT,
  category TEXT,
  desc TEXT,
  price TEXT,
  qty TEXT,
  image TEXT,
  low_stock TEXT
);

CREATE TABLE IF NOT EXISTS public.import_stage_purchase_orders (
  id TEXT,
  date TEXT,
  voucher_no TEXT,
  supplier_id TEXT,
  supplier_name TEXT,
  or_no TEXT,
  total_amount TEXT,
  partial_payment_notes TEXT,
  payment_status TEXT,
  status TEXT,
  delivered_date TEXT,
  notes TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS public.import_stage_purchase_order_items (
  id TEXT,
  purchase_order_id TEXT,
  product_sku TEXT,
  name TEXT,
  unit TEXT,
  po_in_pcs TEXT,
  unit_cost TEXT,
  line_total TEXT,
  inventory_note TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS public.import_stage_receivables (
  id TEXT,
  customer_id TEXT,
  customer_name TEXT,
  description TEXT,
  amount TEXT,
  date_issued TEXT,
  due_date TEXT,
  status TEXT,
  amount_paid TEXT,
  balance TEXT,
  notes TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS public.import_stage_receivable_payments (
  id TEXT,
  receivable_id TEXT,
  amount TEXT,
  payment_date TEXT,
  payment_method TEXT,
  notes TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS public.import_stage_expenses (
  id TEXT,
  expense_date TEXT,
  description TEXT,
  category TEXT,
  payment_method TEXT,
  status TEXT,
  amount TEXT,
  notes TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS public.import_stage_daily_reconciliations (
  id TEXT,
  date TEXT,
  opening_balance TEXT,
  total_cash_in TEXT,
  total_cash_out TEXT,
  expected_balance TEXT,
  actual_cash TEXT,
  variance TEXT,
  status TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS public.import_stage_transactions (
  id TEXT,
  reconciliation_id TEXT,
  type TEXT,
  category TEXT,
  description TEXT,
  amount TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS public.import_stage_bank_deposits (
  id TEXT,
  deposit_date TEXT,
  bank_name TEXT,
  account_number TEXT,
  total_amount TEXT,
  deposit_slip_number TEXT,
  notes TEXT,
  status TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS public.import_stage_bank_deposit_items (
  id TEXT,
  bank_deposit_id TEXT,
  source TEXT,
  reference_date TEXT,
  amount TEXT,
  notes TEXT,
  created_at TEXT
);

COMMIT;
