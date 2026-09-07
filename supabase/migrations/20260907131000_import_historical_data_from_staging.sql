-- Imports historical data from public.import_stage_* tables into operational tables.
-- Idempotent where natural/primary keys exist.

BEGIN;

-- 1) Master data
WITH parsed AS (
  SELECT
    COALESCE(NULLIF(btrim(id), '')::uuid, gen_random_uuid()) AS id,
    btrim(name) AS name,
    NULLIF(btrim(email), '') AS email,
    NULLIF(btrim(phone), '') AS phone,
    NULLIF(btrim(address), '') AS address,
    NULLIF(btrim(city), '') AS city,
    NULLIF(btrim(postal_code), '') AS postal_code,
    NULLIF(btrim(contact_person), '') AS contact_person,
    NULLIF(btrim(payment_terms), '') AS payment_terms,
    NULLIF(btrim(notes), '') AS notes,
    COALESCE(NULLIF(btrim(created_at), '')::timestamptz, now()) AS created_at,
    COALESCE(NULLIF(btrim(updated_at), '')::timestamptz, now()) AS updated_at
  FROM public.import_stage_suppliers
  WHERE NULLIF(btrim(name), '') IS NOT NULL
)
INSERT INTO public.suppliers (
  id, name, email, phone, address, city, postal_code, contact_person, payment_terms, notes, created_at, updated_at
)
SELECT * FROM parsed
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  address = EXCLUDED.address,
  city = EXCLUDED.city,
  postal_code = EXCLUDED.postal_code,
  contact_person = EXCLUDED.contact_person,
  payment_terms = EXCLUDED.payment_terms,
  notes = EXCLUDED.notes,
  updated_at = EXCLUDED.updated_at;

WITH parsed AS (
  SELECT
    COALESCE(NULLIF(btrim(id), '')::uuid, gen_random_uuid()) AS id,
    btrim(name) AS name,
    NULLIF(btrim(email), '') AS email,
    NULLIF(btrim(phone), '') AS phone,
    NULLIF(btrim(address), '') AS address,
    NULLIF(btrim(city), '') AS city,
    NULLIF(btrim(postal_code), '') AS postal_code,
    NULLIF(btrim(contact_person), '') AS contact_person,
    NULLIF(btrim(notes), '') AS notes,
    COALESCE(NULLIF(btrim(created_at), '')::timestamptz, now()) AS created_at,
    COALESCE(NULLIF(btrim(updated_at), '')::timestamptz, now()) AS updated_at
  FROM public.import_stage_customers
  WHERE NULLIF(btrim(name), '') IS NOT NULL
)
INSERT INTO public.customers (
  id, name, email, phone, address, city, postal_code, contact_person, notes, created_at, updated_at
)
SELECT * FROM parsed
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  address = EXCLUDED.address,
  city = EXCLUDED.city,
  postal_code = EXCLUDED.postal_code,
  contact_person = EXCLUDED.contact_person,
  notes = EXCLUDED.notes,
  updated_at = EXCLUDED.updated_at;

WITH parsed AS (
  SELECT
    btrim(sku) AS sku,
    NULLIF(btrim(name), '') AS name,
    NULLIF(btrim(category), '') AS category,
    NULLIF(btrim(desc), '') AS desc,
    NULLIF(regexp_replace(price, '[^0-9.\-]', '', 'g'), '')::numeric(12,2) AS price,
    NULLIF(regexp_replace(qty, '[^0-9.\-]', '', 'g'), '')::numeric(12,2) AS qty,
    NULLIF(btrim(image), '') AS image,
    NULLIF(regexp_replace(low_stock, '[^0-9.\-]', '', 'g'), '')::numeric(12,2) AS low_stock
  FROM public.import_stage_products
  WHERE NULLIF(btrim(sku), '') IS NOT NULL
)
INSERT INTO public.products (sku, name, category, desc, price, qty, image, low_stock)
SELECT * FROM parsed
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  desc = EXCLUDED.desc,
  price = EXCLUDED.price,
  qty = EXCLUDED.qty,
  image = EXCLUDED.image,
  low_stock = EXCLUDED.low_stock;

-- 2) Purchase orders and line items
WITH parsed AS (
  SELECT
    COALESCE(NULLIF(btrim(i.id), '')::uuid, gen_random_uuid()) AS id,
    COALESCE(NULLIF(btrim(i.date), '')::date, CURRENT_DATE) AS date,
    btrim(i.voucher_no) AS voucher_no,
    COALESCE(
      NULLIF(btrim(i.supplier_id), '')::uuid,
      s.id
    ) AS supplier_id,
    COALESCE(NULLIF(btrim(i.supplier_name), ''), s.name) AS supplier_name,
    NULLIF(btrim(i.or_no), '') AS or_no,
    COALESCE(NULLIF(regexp_replace(i.total_amount, '[^0-9.\-]', '', 'g'), '')::numeric(12,2), 0) AS total_amount,
    NULLIF(btrim(i.partial_payment_notes), '') AS partial_payment_notes,
    CASE
      WHEN lower(btrim(i.payment_status)) IN ('unpaid', 'partial', 'paid') THEN lower(btrim(i.payment_status))
      ELSE 'unpaid'
    END AS payment_status,
    CASE
      WHEN lower(btrim(i.status)) IN ('pending', 'approved', 'cancelled', 'delivered') THEN lower(btrim(i.status))
      ELSE 'pending'
    END AS status,
    NULLIF(btrim(i.delivered_date), '')::date AS delivered_date,
    NULLIF(btrim(i.notes), '') AS notes,
    COALESCE(NULLIF(btrim(i.created_at), '')::timestamptz, now()) AS created_at,
    COALESCE(NULLIF(btrim(i.updated_at), '')::timestamptz, now()) AS updated_at
  FROM public.import_stage_purchase_orders i
  LEFT JOIN public.suppliers s
    ON lower(btrim(s.name)) = lower(btrim(i.supplier_name))
  WHERE NULLIF(btrim(i.voucher_no), '') IS NOT NULL
)
INSERT INTO public.purchase_orders (
  id, date, voucher_no, supplier_id, supplier_name, or_no, total_amount,
  partial_payment_notes, payment_status, status, delivered_date, notes, created_at, updated_at
)
SELECT * FROM parsed
ON CONFLICT (voucher_no) DO UPDATE SET
  date = EXCLUDED.date,
  supplier_id = EXCLUDED.supplier_id,
  supplier_name = EXCLUDED.supplier_name,
  or_no = EXCLUDED.or_no,
  total_amount = EXCLUDED.total_amount,
  partial_payment_notes = EXCLUDED.partial_payment_notes,
  payment_status = EXCLUDED.payment_status,
  status = EXCLUDED.status,
  delivered_date = EXCLUDED.delivered_date,
  notes = EXCLUDED.notes,
  updated_at = EXCLUDED.updated_at;

WITH parsed AS (
  SELECT
    COALESCE(NULLIF(btrim(id), '')::uuid, gen_random_uuid()) AS id,
    NULLIF(btrim(purchase_order_id), '')::uuid AS purchase_order_id,
    NULLIF(btrim(product_sku), '') AS product_sku,
    btrim(name) AS name,
    NULLIF(btrim(unit), '') AS unit,
    COALESCE(NULLIF(regexp_replace(po_in_pcs, '[^0-9.\-]', '', 'g'), '')::numeric(12,2), 0) AS po_in_pcs,
    COALESCE(NULLIF(regexp_replace(unit_cost, '[^0-9.\-]', '', 'g'), '')::numeric(12,2), 0) AS unit_cost,
    NULLIF(regexp_replace(line_total, '[^0-9.\-]', '', 'g'), '')::numeric(12,2) AS line_total,
    NULLIF(btrim(inventory_note), '') AS inventory_note,
    COALESCE(NULLIF(btrim(created_at), '')::timestamptz, now()) AS created_at
  FROM public.import_stage_purchase_order_items
  WHERE NULLIF(btrim(name), '') IS NOT NULL
    AND NULLIF(btrim(purchase_order_id), '') IS NOT NULL
)
INSERT INTO public.purchase_order_items (
  id, purchase_order_id, product_sku, name, unit, po_in_pcs, unit_cost, line_total, inventory_note, created_at
)
SELECT
  p.id,
  p.purchase_order_id,
  p.product_sku,
  p.name,
  p.unit,
  p.po_in_pcs,
  p.unit_cost,
  COALESCE(p.line_total, ROUND(p.po_in_pcs * p.unit_cost, 2)),
  p.inventory_note,
  p.created_at
FROM parsed p
ON CONFLICT (id) DO UPDATE SET
  purchase_order_id = EXCLUDED.purchase_order_id,
  product_sku = EXCLUDED.product_sku,
  name = EXCLUDED.name,
  unit = EXCLUDED.unit,
  po_in_pcs = EXCLUDED.po_in_pcs,
  unit_cost = EXCLUDED.unit_cost,
  line_total = EXCLUDED.line_total,
  inventory_note = EXCLUDED.inventory_note;

-- 3) Receivables
WITH parsed AS (
  SELECT
    COALESCE(NULLIF(btrim(i.id), '')::uuid, gen_random_uuid()) AS id,
    NULLIF(btrim(i.customer_id), '')::uuid AS customer_id,
    btrim(i.customer_name) AS customer_name,
    NULLIF(btrim(i.description), '') AS description,
    COALESCE(NULLIF(regexp_replace(i.amount, '[^0-9.\-]', '', 'g'), '')::numeric(12,2), 0) AS amount,
    COALESCE(NULLIF(btrim(i.date_issued), '')::date, CURRENT_DATE) AS date_issued,
    NULLIF(btrim(i.due_date), '')::date AS due_date,
    CASE
      WHEN lower(btrim(i.status)) IN ('pending', 'partially_paid', 'paid', 'written_off') THEN lower(btrim(i.status))
      ELSE 'pending'
    END AS status,
    COALESCE(NULLIF(regexp_replace(i.amount_paid, '[^0-9.\-]', '', 'g'), '')::numeric(12,2), 0) AS amount_paid,
    COALESCE(NULLIF(regexp_replace(i.balance, '[^0-9.\-]', '', 'g'), '')::numeric(12,2), 0) AS balance,
    NULLIF(btrim(i.notes), '') AS notes,
    COALESCE(NULLIF(btrim(i.created_at), '')::timestamptz, now()) AS created_at,
    COALESCE(NULLIF(btrim(i.updated_at), '')::timestamptz, now()) AS updated_at
  FROM public.import_stage_receivables i
  WHERE NULLIF(btrim(i.customer_name), '') IS NOT NULL
)
INSERT INTO public.receivables (
  id, customer_id, customer_name, description, amount, date_issued, due_date,
  status, amount_paid, balance, notes, created_at, updated_at
)
SELECT * FROM parsed
ON CONFLICT (id) DO UPDATE SET
  customer_id = EXCLUDED.customer_id,
  customer_name = EXCLUDED.customer_name,
  description = EXCLUDED.description,
  amount = EXCLUDED.amount,
  date_issued = EXCLUDED.date_issued,
  due_date = EXCLUDED.due_date,
  status = EXCLUDED.status,
  amount_paid = EXCLUDED.amount_paid,
  balance = EXCLUDED.balance,
  notes = EXCLUDED.notes,
  updated_at = EXCLUDED.updated_at;

WITH parsed AS (
  SELECT
    COALESCE(NULLIF(btrim(id), '')::uuid, gen_random_uuid()) AS id,
    NULLIF(btrim(receivable_id), '')::uuid AS receivable_id,
    COALESCE(NULLIF(regexp_replace(amount, '[^0-9.\-]', '', 'g'), '')::numeric(12,2), 0) AS amount,
    COALESCE(NULLIF(btrim(payment_date), '')::date, CURRENT_DATE) AS payment_date,
    NULLIF(btrim(payment_method), '') AS payment_method,
    NULLIF(btrim(notes), '') AS notes,
    COALESCE(NULLIF(btrim(created_at), '')::timestamptz, now()) AS created_at
  FROM public.import_stage_receivable_payments
  WHERE NULLIF(btrim(receivable_id), '') IS NOT NULL
)
INSERT INTO public.receivable_payments (
  id, receivable_id, amount, payment_date, payment_method, notes, created_at
)
SELECT * FROM parsed
ON CONFLICT (id) DO UPDATE SET
  receivable_id = EXCLUDED.receivable_id,
  amount = EXCLUDED.amount,
  payment_date = EXCLUDED.payment_date,
  payment_method = EXCLUDED.payment_method,
  notes = EXCLUDED.notes;

-- 4) Expenses, daily reconciliation, transactions
WITH parsed AS (
  SELECT
    COALESCE(NULLIF(btrim(id), '')::uuid, gen_random_uuid()) AS id,
    COALESCE(NULLIF(btrim(expense_date), '')::date, CURRENT_DATE) AS expense_date,
    btrim(description) AS description,
    COALESCE(NULLIF(btrim(category), ''), 'Other') AS category,
    CASE
      WHEN lower(btrim(payment_method)) IN ('cash', 'gcash', 'check', 'bank_transfer', 'other') THEN lower(btrim(payment_method))
      ELSE 'other'
    END AS payment_method,
    CASE
      WHEN lower(btrim(status)) IN ('paid', 'unpaid', 'partially_paid') THEN lower(btrim(status))
      ELSE 'paid'
    END AS status,
    COALESCE(NULLIF(regexp_replace(amount, '[^0-9.\-]', '', 'g'), '')::numeric(12,2), 0) AS amount,
    NULLIF(btrim(notes), '') AS notes,
    COALESCE(NULLIF(btrim(created_at), '')::timestamptz, now()) AS created_at,
    COALESCE(NULLIF(btrim(updated_at), '')::timestamptz, now()) AS updated_at
  FROM public.import_stage_expenses
  WHERE NULLIF(btrim(description), '') IS NOT NULL
)
INSERT INTO public.expenses (
  id, expense_date, description, category, payment_method, status, amount, notes, created_at, updated_at
)
SELECT * FROM parsed
ON CONFLICT (id) DO UPDATE SET
  expense_date = EXCLUDED.expense_date,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  payment_method = EXCLUDED.payment_method,
  status = EXCLUDED.status,
  amount = EXCLUDED.amount,
  notes = EXCLUDED.notes,
  updated_at = EXCLUDED.updated_at;

WITH parsed AS (
  SELECT
    COALESCE(NULLIF(btrim(id), '')::uuid, gen_random_uuid()) AS id,
    COALESCE(NULLIF(btrim(date), '')::date, CURRENT_DATE) AS date,
    COALESCE(NULLIF(regexp_replace(opening_balance, '[^0-9.\-]', '', 'g'), '')::numeric(12,2), 0) AS opening_balance,
    COALESCE(NULLIF(regexp_replace(total_cash_in, '[^0-9.\-]', '', 'g'), '')::numeric(12,2), 0) AS total_cash_in,
    COALESCE(NULLIF(regexp_replace(total_cash_out, '[^0-9.\-]', '', 'g'), '')::numeric(12,2), 0) AS total_cash_out,
    NULLIF(regexp_replace(expected_balance, '[^0-9.\-]', '', 'g'), '')::numeric(12,2) AS expected_balance,
    NULLIF(regexp_replace(actual_cash, '[^0-9.\-]', '', 'g'), '')::numeric(12,2) AS actual_cash,
    NULLIF(regexp_replace(variance, '[^0-9.\-]', '', 'g'), '')::numeric(12,2) AS variance,
    NULLIF(btrim(status), '') AS status,
    COALESCE(NULLIF(btrim(created_at), '')::timestamptz, now()) AS created_at,
    COALESCE(NULLIF(btrim(updated_at), '')::timestamptz, now()) AS updated_at
  FROM public.import_stage_daily_reconciliations
)
INSERT INTO public.daily_reconciliations (
  id, date, opening_balance, total_cash_in, total_cash_out, expected_balance,
  actual_cash, variance, status, created_at, updated_at
)
SELECT
  id,
  date,
  opening_balance,
  total_cash_in,
  total_cash_out,
  COALESCE(expected_balance, opening_balance + total_cash_in - total_cash_out),
  actual_cash,
  variance,
  status,
  created_at,
  updated_at
FROM parsed
ON CONFLICT (date) DO UPDATE SET
  opening_balance = EXCLUDED.opening_balance,
  total_cash_in = EXCLUDED.total_cash_in,
  total_cash_out = EXCLUDED.total_cash_out,
  expected_balance = EXCLUDED.expected_balance,
  actual_cash = EXCLUDED.actual_cash,
  variance = EXCLUDED.variance,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;

WITH parsed AS (
  SELECT
    COALESCE(NULLIF(btrim(id), '')::uuid, gen_random_uuid()) AS id,
    NULLIF(btrim(reconciliation_id), '')::uuid AS reconciliation_id,
    CASE
      WHEN lower(btrim(type)) IN ('cash_in', 'cash_out') THEN lower(btrim(type))
      ELSE 'cash_in'
    END AS type,
    btrim(category) AS category,
    NULLIF(btrim(description), '') AS description,
    COALESCE(NULLIF(regexp_replace(amount, '[^0-9.\-]', '', 'g'), '')::numeric(12,2), 0) AS amount,
    COALESCE(NULLIF(btrim(created_at), '')::timestamptz, now()) AS created_at
  FROM public.import_stage_transactions
  WHERE NULLIF(btrim(category), '') IS NOT NULL
)
INSERT INTO public.transactions (
  id, reconciliation_id, type, category, description, amount, created_at
)
SELECT * FROM parsed
ON CONFLICT (id) DO UPDATE SET
  reconciliation_id = EXCLUDED.reconciliation_id,
  type = EXCLUDED.type,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  amount = EXCLUDED.amount,
  created_at = EXCLUDED.created_at;

-- 5) Bank deposits
WITH parsed AS (
  SELECT
    COALESCE(NULLIF(btrim(id), '')::uuid, gen_random_uuid()) AS id,
    COALESCE(NULLIF(btrim(deposit_date), '')::date, CURRENT_DATE) AS deposit_date,
    btrim(bank_name) AS bank_name,
    NULLIF(btrim(account_number), '') AS account_number,
    COALESCE(NULLIF(regexp_replace(total_amount, '[^0-9.\-]', '', 'g'), '')::numeric(12,2), 0) AS total_amount,
    NULLIF(btrim(deposit_slip_number), '') AS deposit_slip_number,
    NULLIF(btrim(notes), '') AS notes,
    CASE
      WHEN lower(btrim(status)) IN ('pending', 'confirmed', 'reconciled') THEN lower(btrim(status))
      ELSE 'pending'
    END AS status,
    COALESCE(NULLIF(btrim(created_at), '')::timestamptz, now()) AS created_at,
    COALESCE(NULLIF(btrim(updated_at), '')::timestamptz, now()) AS updated_at
  FROM public.import_stage_bank_deposits
  WHERE NULLIF(btrim(bank_name), '') IS NOT NULL
)
INSERT INTO public.bank_deposits (
  id, deposit_date, bank_name, account_number, total_amount,
  deposit_slip_number, notes, status, created_at, updated_at
)
SELECT * FROM parsed
ON CONFLICT (id) DO UPDATE SET
  deposit_date = EXCLUDED.deposit_date,
  bank_name = EXCLUDED.bank_name,
  account_number = EXCLUDED.account_number,
  total_amount = EXCLUDED.total_amount,
  deposit_slip_number = EXCLUDED.deposit_slip_number,
  notes = EXCLUDED.notes,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;

WITH parsed AS (
  SELECT
    COALESCE(NULLIF(btrim(id), '')::uuid, gen_random_uuid()) AS id,
    NULLIF(btrim(bank_deposit_id), '')::uuid AS bank_deposit_id,
    btrim(source) AS source,
    NULLIF(btrim(reference_date), '')::date AS reference_date,
    COALESCE(NULLIF(regexp_replace(amount, '[^0-9.\-]', '', 'g'), '')::numeric(12,2), 0) AS amount,
    NULLIF(btrim(notes), '') AS notes,
    COALESCE(NULLIF(btrim(created_at), '')::timestamptz, now()) AS created_at
  FROM public.import_stage_bank_deposit_items
  WHERE NULLIF(btrim(bank_deposit_id), '') IS NOT NULL
    AND NULLIF(btrim(source), '') IS NOT NULL
)
INSERT INTO public.bank_deposit_items (
  id, bank_deposit_id, source, reference_date, amount, notes, created_at
)
SELECT * FROM parsed
ON CONFLICT (id) DO UPDATE SET
  bank_deposit_id = EXCLUDED.bank_deposit_id,
  source = EXCLUDED.source,
  reference_date = EXCLUDED.reference_date,
  amount = EXCLUDED.amount,
  notes = EXCLUDED.notes;

COMMIT;
