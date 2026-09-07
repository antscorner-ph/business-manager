-- Post-import validation views for historical accounting data.

BEGIN;

CREATE OR REPLACE VIEW public.v_import_validation_orphans AS
SELECT 'orphan_receivable_payments'::text AS check_name,
       COUNT(*)::bigint AS issue_count
FROM public.receivable_payments rp
LEFT JOIN public.receivables r ON r.id = rp.receivable_id
WHERE r.id IS NULL
UNION ALL
SELECT 'orphan_bank_deposit_items'::text,
       COUNT(*)::bigint
FROM public.bank_deposit_items bdi
LEFT JOIN public.bank_deposits bd ON bd.id = bdi.bank_deposit_id
WHERE bd.id IS NULL
UNION ALL
SELECT 'orphan_purchase_order_items'::text,
       COUNT(*)::bigint
FROM public.purchase_order_items poi
LEFT JOIN public.purchase_orders po ON po.id = poi.purchase_order_id
WHERE po.id IS NULL
UNION ALL
SELECT 'receivable_balance_mismatch'::text,
       COUNT(*)::bigint
FROM public.receivables r
WHERE r.status <> 'written_off'
  AND ABS(COALESCE(r.balance, 0) - (COALESCE(r.amount, 0) - COALESCE(r.amount_paid, 0))) > 0.01;

CREATE OR REPLACE VIEW public.v_import_validation_profit_loss_monthly AS
WITH revenue AS (
  SELECT to_char(created_at::date, 'YYYY-MM') AS month_key,
         SUM(amount)::numeric(14,2) AS revenue_cash_in
  FROM public.transactions
  WHERE type = 'cash_in'
  GROUP BY 1
),
paid_expenses AS (
  SELECT to_char(expense_date, 'YYYY-MM') AS month_key,
         SUM(amount)::numeric(14,2) AS paid_expenses
  FROM public.expenses
  WHERE status = 'paid'
  GROUP BY 1
)
SELECT
  COALESCE(r.month_key, e.month_key) AS month_key,
  COALESCE(r.revenue_cash_in, 0)::numeric(14,2) AS revenue_cash_in,
  COALESCE(e.paid_expenses, 0)::numeric(14,2) AS paid_expenses,
  (COALESCE(r.revenue_cash_in, 0) - COALESCE(e.paid_expenses, 0))::numeric(14,2) AS net_income_proxy
FROM revenue r
FULL OUTER JOIN paid_expenses e
  ON e.month_key = r.month_key
ORDER BY 1;

CREATE OR REPLACE VIEW public.v_import_validation_cash_flow_monthly AS
WITH rec AS (
  SELECT
    to_char(date, 'YYYY-MM') AS month_key,
    MIN(date) AS min_date,
    SUM(total_cash_in)::numeric(14,2) AS inflow,
    SUM(total_cash_out)::numeric(14,2) AS outflow_from_daily
  FROM public.daily_reconciliations
  GROUP BY 1
),
openings AS (
  SELECT
    to_char(d.date, 'YYYY-MM') AS month_key,
    d.opening_balance::numeric(14,2) AS opening_balance
  FROM public.daily_reconciliations d
  JOIN rec r ON r.min_date = d.date AND to_char(d.date, 'YYYY-MM') = r.month_key
),
paid_expenses AS (
  SELECT
    to_char(expense_date, 'YYYY-MM') AS month_key,
    SUM(amount)::numeric(14,2) AS outflow_paid_expenses
  FROM public.expenses
  WHERE status = 'paid'
  GROUP BY 1
)
SELECT
  r.month_key,
  COALESCE(o.opening_balance, 0)::numeric(14,2) AS opening_balance,
  COALESCE(r.inflow, 0)::numeric(14,2) AS inflow,
  COALESCE(r.outflow_from_daily, 0)::numeric(14,2) AS outflow_from_daily,
  COALESCE(e.outflow_paid_expenses, 0)::numeric(14,2) AS outflow_paid_expenses,
  (COALESCE(o.opening_balance, 0) + COALESCE(r.inflow, 0) - COALESCE(r.outflow_from_daily, 0))::numeric(14,2) AS ending_from_reconciliation
FROM rec r
LEFT JOIN openings o ON o.month_key = r.month_key
LEFT JOIN paid_expenses e ON e.month_key = r.month_key
ORDER BY r.month_key;

CREATE OR REPLACE VIEW public.v_import_validation_balance_sheet_snapshot AS
WITH latest_recon AS (
  SELECT expected_balance::numeric(14,2) AS expected_balance
  FROM public.daily_reconciliations
  ORDER BY date DESC
  LIMIT 1
),
assets AS (
  SELECT
    COALESCE((SELECT expected_balance FROM latest_recon), 0)
    + COALESCE((SELECT SUM(total_amount)::numeric(14,2) FROM public.bank_deposits WHERE status IN ('confirmed','reconciled')), 0)
    + COALESCE((SELECT SUM(balance)::numeric(14,2) FROM public.receivables WHERE status <> 'written_off'), 0)
    + COALESCE((SELECT SUM(COALESCE(qty,0) * COALESCE(price,0))::numeric(14,2) FROM public.products), 0)
    AS total_assets_proxy
),
liabilities AS (
  SELECT
    COALESCE((SELECT SUM(total_amount)::numeric(14,2) FROM public.purchase_orders WHERE status <> 'cancelled' AND payment_status <> 'paid'), 0)
    + COALESCE((SELECT SUM(amount)::numeric(14,2) FROM public.expenses WHERE status <> 'paid'), 0)
    AS total_liabilities_proxy
),
equity AS (
  SELECT
    COALESCE((SELECT SUM(amount)::numeric(14,2) FROM public.transactions WHERE type = 'cash_in'), 0)
    - COALESCE((SELECT SUM(amount)::numeric(14,2) FROM public.expenses WHERE status = 'paid'), 0)
    AS total_equity_proxy
)
SELECT
  a.total_assets_proxy,
  l.total_liabilities_proxy,
  e.total_equity_proxy,
  (a.total_assets_proxy - l.total_liabilities_proxy - e.total_equity_proxy)::numeric(14,2) AS equation_gap_proxy
FROM assets a
CROSS JOIN liabilities l
CROSS JOIN equity e;

COMMIT;
