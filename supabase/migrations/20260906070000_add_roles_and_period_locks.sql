-- Top-priority hardening: role-based authorization + period close locks.
-- This migration:
-- 1) introduces user_roles with bootstrap owner assignment,
-- 2) restricts audit log visibility to owner/manager,
-- 3) replaces broad authenticated CRUD with role-aware table policies,
-- 4) prevents writes/deletes in closed accounting periods.

BEGIN;

-- 1) Role model
CREATE TABLE IF NOT EXISTS public.user_roles (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'staff')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User can view own role" ON public.user_roles;
DROP POLICY IF EXISTS "Owner manager view roles" ON public.user_roles;
DROP POLICY IF EXISTS "Owner manages roles" ON public.user_roles;
DROP POLICY IF EXISTS "Bootstrap first owner" ON public.user_roles;

-- First app user can bootstrap themselves as owner only when table is empty.
CREATE POLICY "Bootstrap first owner"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND role = 'owner'
    AND NOT EXISTS (SELECT 1 FROM public.user_roles)
  );

CREATE OR REPLACE FUNCTION public.user_has_any_role(required_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = ANY(required_roles)
  );
END;
$$;

CREATE POLICY "User can view own role"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR public.user_has_any_role(ARRAY['owner', 'manager'])
  );

CREATE POLICY "Owner manages roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (public.user_has_any_role(ARRAY['owner']))
  WITH CHECK (public.user_has_any_role(ARRAY['owner']));

-- 2) Period close locks
CREATE TABLE IF NOT EXISTS public.accounting_period_locks (
  year_month TEXT PRIMARY KEY,
  is_closed BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  closed_by UUID,
  closed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT accounting_period_locks_format CHECK (year_month ~ '^\\d{4}-\\d{2}$')
);

ALTER TABLE public.accounting_period_locks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read period locks" ON public.accounting_period_locks;
DROP POLICY IF EXISTS "Manage period locks" ON public.accounting_period_locks;

CREATE POLICY "Read period locks"
  ON public.accounting_period_locks
  FOR SELECT
  TO authenticated
  USING (public.user_has_any_role(ARRAY['owner', 'manager', 'staff']));

CREATE POLICY "Manage period locks"
  ON public.accounting_period_locks
  FOR ALL
  TO authenticated
  USING (public.user_has_any_role(ARRAY['owner', 'manager']))
  WITH CHECK (public.user_has_any_role(ARRAY['owner', 'manager']));

CREATE OR REPLACE FUNCTION public.is_period_open(input_date DATE)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.accounting_period_locks apl
    WHERE apl.year_month = to_char(input_date, 'YYYY-MM')
      AND apl.is_closed = true
  );
$$;

-- Keep updated_at fresh for new tables.
DROP TRIGGER IF EXISTS update_user_roles_updated_at ON public.user_roles;
CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_accounting_period_locks_updated_at ON public.accounting_period_locks;
CREATE TRIGGER update_accounting_period_locks_updated_at
  BEFORE UPDATE ON public.accounting_period_locks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Restrict audit log visibility to owner/manager only.
DROP POLICY IF EXISTS "Authenticated read" ON public.audit_log;
DROP POLICY IF EXISTS "Owner manager read audit" ON public.audit_log;

CREATE POLICY "Owner manager read audit"
  ON public.audit_log
  FOR SELECT
  TO authenticated
  USING (public.user_has_any_role(ARRAY['owner', 'manager']));

-- 4) Replace broad authenticated policies with role-aware + period checks.
-- Helper block to clear generic policies introduced previously.
DO $$
DECLARE
  tbl TEXT;
  target_tables TEXT[] := ARRAY[
    'daily_reconciliations',
    'transactions',
    'denomination_counts',
    'receivables',
    'receivable_payments',
    'bank_deposits',
    'bank_deposit_items',
    'purchase_orders',
    'purchase_order_items',
    'customers',
    'suppliers',
    'products',
    'expenses',
    'employees',
    'time_entries'
  ];
  old_policy_names TEXT[] := ARRAY[
    'Authenticated read',
    'Authenticated insert',
    'Authenticated update',
    'Authenticated delete',
    'Read by role',
    'Insert by role',
    'Update by role',
    'Delete by role'
  ];
  pol TEXT;
BEGIN
  FOREACH tbl IN ARRAY target_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    FOREACH pol IN ARRAY old_policy_names LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol, tbl);
    END LOOP;
  END LOOP;
END
$$;

-- Daily reconciliations
CREATE POLICY "Read by role" ON public.daily_reconciliations
  FOR SELECT TO authenticated
  USING (public.user_has_any_role(ARRAY['owner','manager','staff']));

CREATE POLICY "Insert by role" ON public.daily_reconciliations
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_has_any_role(ARRAY['owner','manager','staff'])
    AND public.is_period_open(date)
  );

CREATE POLICY "Update by role" ON public.daily_reconciliations
  FOR UPDATE TO authenticated
  USING (
    public.user_has_any_role(ARRAY['owner','manager','staff'])
    AND public.is_period_open(date)
  )
  WITH CHECK (
    public.user_has_any_role(ARRAY['owner','manager','staff'])
    AND public.is_period_open(date)
  );

CREATE POLICY "Delete by role" ON public.daily_reconciliations
  FOR DELETE TO authenticated
  USING (
    public.user_has_any_role(ARRAY['owner','manager'])
    AND public.is_period_open(date)
  );

-- Transactions
CREATE POLICY "Read by role" ON public.transactions
  FOR SELECT TO authenticated
  USING (public.user_has_any_role(ARRAY['owner','manager','staff']));

CREATE POLICY "Insert by role" ON public.transactions
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_has_any_role(ARRAY['owner','manager','staff'])
    AND public.is_period_open((created_at AT TIME ZONE 'UTC')::date)
  );

CREATE POLICY "Update by role" ON public.transactions
  FOR UPDATE TO authenticated
  USING (
    public.user_has_any_role(ARRAY['owner','manager','staff'])
    AND public.is_period_open((created_at AT TIME ZONE 'UTC')::date)
  )
  WITH CHECK (
    public.user_has_any_role(ARRAY['owner','manager','staff'])
    AND public.is_period_open((created_at AT TIME ZONE 'UTC')::date)
  );

CREATE POLICY "Delete by role" ON public.transactions
  FOR DELETE TO authenticated
  USING (
    public.user_has_any_role(ARRAY['owner','manager'])
    AND public.is_period_open((created_at AT TIME ZONE 'UTC')::date)
  );

-- Denomination counts (period lock follows parent reconciliation date)
CREATE POLICY "Read by role" ON public.denomination_counts
  FOR SELECT TO authenticated
  USING (public.user_has_any_role(ARRAY['owner','manager','staff']));

CREATE POLICY "Insert by role" ON public.denomination_counts
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_has_any_role(ARRAY['owner','manager','staff'])
    AND reconciliation_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.daily_reconciliations dr
      WHERE dr.id = reconciliation_id
        AND public.is_period_open(dr.date)
    )
  );

CREATE POLICY "Update by role" ON public.denomination_counts
  FOR UPDATE TO authenticated
  USING (
    public.user_has_any_role(ARRAY['owner','manager','staff'])
    AND reconciliation_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.daily_reconciliations dr
      WHERE dr.id = reconciliation_id
        AND public.is_period_open(dr.date)
    )
  )
  WITH CHECK (
    public.user_has_any_role(ARRAY['owner','manager','staff'])
    AND reconciliation_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.daily_reconciliations dr
      WHERE dr.id = reconciliation_id
        AND public.is_period_open(dr.date)
    )
  );

CREATE POLICY "Delete by role" ON public.denomination_counts
  FOR DELETE TO authenticated
  USING (
    public.user_has_any_role(ARRAY['owner','manager'])
    AND reconciliation_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.daily_reconciliations dr
      WHERE dr.id = reconciliation_id
        AND public.is_period_open(dr.date)
    )
  );

-- Receivables
CREATE POLICY "Read by role" ON public.receivables
  FOR SELECT TO authenticated
  USING (public.user_has_any_role(ARRAY['owner','manager','staff']));

CREATE POLICY "Insert by role" ON public.receivables
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_has_any_role(ARRAY['owner','manager','staff'])
    AND public.is_period_open(date_issued)
  );

CREATE POLICY "Update by role" ON public.receivables
  FOR UPDATE TO authenticated
  USING (
    public.user_has_any_role(ARRAY['owner','manager','staff'])
    AND public.is_period_open(date_issued)
  )
  WITH CHECK (
    public.user_has_any_role(ARRAY['owner','manager','staff'])
    AND public.is_period_open(date_issued)
  );

CREATE POLICY "Delete by role" ON public.receivables
  FOR DELETE TO authenticated
  USING (
    public.user_has_any_role(ARRAY['owner','manager'])
    AND public.is_period_open(date_issued)
  );

-- Receivable payments
CREATE POLICY "Read by role" ON public.receivable_payments
  FOR SELECT TO authenticated
  USING (public.user_has_any_role(ARRAY['owner','manager','staff']));

CREATE POLICY "Insert by role" ON public.receivable_payments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_has_any_role(ARRAY['owner','manager','staff'])
    AND public.is_period_open(payment_date)
  );

CREATE POLICY "Update by role" ON public.receivable_payments
  FOR UPDATE TO authenticated
  USING (
    public.user_has_any_role(ARRAY['owner','manager','staff'])
    AND public.is_period_open(payment_date)
  )
  WITH CHECK (
    public.user_has_any_role(ARRAY['owner','manager','staff'])
    AND public.is_period_open(payment_date)
  );

CREATE POLICY "Delete by role" ON public.receivable_payments
  FOR DELETE TO authenticated
  USING (
    public.user_has_any_role(ARRAY['owner','manager'])
    AND public.is_period_open(payment_date)
  );

-- Bank deposits
CREATE POLICY "Read by role" ON public.bank_deposits
  FOR SELECT TO authenticated
  USING (public.user_has_any_role(ARRAY['owner','manager','staff']));

CREATE POLICY "Insert by role" ON public.bank_deposits
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_has_any_role(ARRAY['owner','manager','staff'])
    AND public.is_period_open(deposit_date)
  );

CREATE POLICY "Update by role" ON public.bank_deposits
  FOR UPDATE TO authenticated
  USING (
    public.user_has_any_role(ARRAY['owner','manager','staff'])
    AND public.is_period_open(deposit_date)
  )
  WITH CHECK (
    public.user_has_any_role(ARRAY['owner','manager','staff'])
    AND public.is_period_open(deposit_date)
  );

CREATE POLICY "Delete by role" ON public.bank_deposits
  FOR DELETE TO authenticated
  USING (
    public.user_has_any_role(ARRAY['owner','manager'])
    AND public.is_period_open(deposit_date)
  );

-- Bank deposit items (period lock follows parent deposit date)
CREATE POLICY "Read by role" ON public.bank_deposit_items
  FOR SELECT TO authenticated
  USING (public.user_has_any_role(ARRAY['owner','manager','staff']));

CREATE POLICY "Insert by role" ON public.bank_deposit_items
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_has_any_role(ARRAY['owner','manager','staff'])
    AND EXISTS (
      SELECT 1 FROM public.bank_deposits bd
      WHERE bd.id = bank_deposit_id
        AND public.is_period_open(bd.deposit_date)
    )
  );

CREATE POLICY "Update by role" ON public.bank_deposit_items
  FOR UPDATE TO authenticated
  USING (
    public.user_has_any_role(ARRAY['owner','manager','staff'])
    AND EXISTS (
      SELECT 1 FROM public.bank_deposits bd
      WHERE bd.id = bank_deposit_id
        AND public.is_period_open(bd.deposit_date)
    )
  )
  WITH CHECK (
    public.user_has_any_role(ARRAY['owner','manager','staff'])
    AND EXISTS (
      SELECT 1 FROM public.bank_deposits bd
      WHERE bd.id = bank_deposit_id
        AND public.is_period_open(bd.deposit_date)
    )
  );

CREATE POLICY "Delete by role" ON public.bank_deposit_items
  FOR DELETE TO authenticated
  USING (
    public.user_has_any_role(ARRAY['owner','manager'])
    AND EXISTS (
      SELECT 1 FROM public.bank_deposits bd
      WHERE bd.id = bank_deposit_id
        AND public.is_period_open(bd.deposit_date)
    )
  );

-- Purchase orders
CREATE POLICY "Read by role" ON public.purchase_orders
  FOR SELECT TO authenticated
  USING (public.user_has_any_role(ARRAY['owner','manager','staff']));

CREATE POLICY "Insert by role" ON public.purchase_orders
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_has_any_role(ARRAY['owner','manager','staff'])
    AND public.is_period_open(date)
  );

CREATE POLICY "Update by role" ON public.purchase_orders
  FOR UPDATE TO authenticated
  USING (
    public.user_has_any_role(ARRAY['owner','manager','staff'])
    AND public.is_period_open(date)
  )
  WITH CHECK (
    public.user_has_any_role(ARRAY['owner','manager','staff'])
    AND public.is_period_open(date)
  );

CREATE POLICY "Delete by role" ON public.purchase_orders
  FOR DELETE TO authenticated
  USING (
    public.user_has_any_role(ARRAY['owner','manager'])
    AND public.is_period_open(date)
  );

-- Purchase order items (period lock follows parent PO date)
CREATE POLICY "Read by role" ON public.purchase_order_items
  FOR SELECT TO authenticated
  USING (public.user_has_any_role(ARRAY['owner','manager','staff']));

CREATE POLICY "Insert by role" ON public.purchase_order_items
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_has_any_role(ARRAY['owner','manager','staff'])
    AND EXISTS (
      SELECT 1 FROM public.purchase_orders po
      WHERE po.id = purchase_order_id
        AND public.is_period_open(po.date)
    )
  );

CREATE POLICY "Update by role" ON public.purchase_order_items
  FOR UPDATE TO authenticated
  USING (
    public.user_has_any_role(ARRAY['owner','manager','staff'])
    AND EXISTS (
      SELECT 1 FROM public.purchase_orders po
      WHERE po.id = purchase_order_id
        AND public.is_period_open(po.date)
    )
  )
  WITH CHECK (
    public.user_has_any_role(ARRAY['owner','manager','staff'])
    AND EXISTS (
      SELECT 1 FROM public.purchase_orders po
      WHERE po.id = purchase_order_id
        AND public.is_period_open(po.date)
    )
  );

CREATE POLICY "Delete by role" ON public.purchase_order_items
  FOR DELETE TO authenticated
  USING (
    public.user_has_any_role(ARRAY['owner','manager'])
    AND EXISTS (
      SELECT 1 FROM public.purchase_orders po
      WHERE po.id = purchase_order_id
        AND public.is_period_open(po.date)
    )
  );

-- Expenses
CREATE POLICY "Read by role" ON public.expenses
  FOR SELECT TO authenticated
  USING (public.user_has_any_role(ARRAY['owner','manager','staff']));

CREATE POLICY "Insert by role" ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_has_any_role(ARRAY['owner','manager','staff'])
    AND public.is_period_open(expense_date)
  );

CREATE POLICY "Update by role" ON public.expenses
  FOR UPDATE TO authenticated
  USING (
    public.user_has_any_role(ARRAY['owner','manager','staff'])
    AND public.is_period_open(expense_date)
  )
  WITH CHECK (
    public.user_has_any_role(ARRAY['owner','manager','staff'])
    AND public.is_period_open(expense_date)
  );

CREATE POLICY "Delete by role" ON public.expenses
  FOR DELETE TO authenticated
  USING (
    public.user_has_any_role(ARRAY['owner','manager'])
    AND public.is_period_open(expense_date)
  );

-- Directory/master data
CREATE POLICY "Read by role" ON public.customers
  FOR SELECT TO authenticated
  USING (public.user_has_any_role(ARRAY['owner','manager','staff']));

CREATE POLICY "Insert by role" ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_any_role(ARRAY['owner','manager']));

CREATE POLICY "Update by role" ON public.customers
  FOR UPDATE TO authenticated
  USING (public.user_has_any_role(ARRAY['owner','manager']))
  WITH CHECK (public.user_has_any_role(ARRAY['owner','manager']));

CREATE POLICY "Delete by role" ON public.customers
  FOR DELETE TO authenticated
  USING (public.user_has_any_role(ARRAY['owner']));

CREATE POLICY "Read by role" ON public.suppliers
  FOR SELECT TO authenticated
  USING (public.user_has_any_role(ARRAY['owner','manager','staff']));

CREATE POLICY "Insert by role" ON public.suppliers
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_any_role(ARRAY['owner','manager']));

CREATE POLICY "Update by role" ON public.suppliers
  FOR UPDATE TO authenticated
  USING (public.user_has_any_role(ARRAY['owner','manager']))
  WITH CHECK (public.user_has_any_role(ARRAY['owner','manager']));

CREATE POLICY "Delete by role" ON public.suppliers
  FOR DELETE TO authenticated
  USING (public.user_has_any_role(ARRAY['owner']));

CREATE POLICY "Read by role" ON public.products
  FOR SELECT TO authenticated
  USING (public.user_has_any_role(ARRAY['owner','manager','staff']));

CREATE POLICY "Insert by role" ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_any_role(ARRAY['owner','manager']));

CREATE POLICY "Update by role" ON public.products
  FOR UPDATE TO authenticated
  USING (public.user_has_any_role(ARRAY['owner','manager']))
  WITH CHECK (public.user_has_any_role(ARRAY['owner','manager']));

CREATE POLICY "Delete by role" ON public.products
  FOR DELETE TO authenticated
  USING (public.user_has_any_role(ARRAY['owner']));

-- HR data
CREATE POLICY "Read by role" ON public.employees
  FOR SELECT TO authenticated
  USING (public.user_has_any_role(ARRAY['owner','manager','staff']));

CREATE POLICY "Insert by role" ON public.employees
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_any_role(ARRAY['owner','manager']));

CREATE POLICY "Update by role" ON public.employees
  FOR UPDATE TO authenticated
  USING (public.user_has_any_role(ARRAY['owner','manager']))
  WITH CHECK (public.user_has_any_role(ARRAY['owner','manager']));

CREATE POLICY "Delete by role" ON public.employees
  FOR DELETE TO authenticated
  USING (public.user_has_any_role(ARRAY['owner']));

CREATE POLICY "Read by role" ON public.time_entries
  FOR SELECT TO authenticated
  USING (public.user_has_any_role(ARRAY['owner','manager','staff']));

CREATE POLICY "Insert by role" ON public.time_entries
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_any_role(ARRAY['owner','manager','staff']));

CREATE POLICY "Update by role" ON public.time_entries
  FOR UPDATE TO authenticated
  USING (public.user_has_any_role(ARRAY['owner','manager','staff']))
  WITH CHECK (public.user_has_any_role(ARRAY['owner','manager','staff']));

CREATE POLICY "Delete by role" ON public.time_entries
  FOR DELETE TO authenticated
  USING (public.user_has_any_role(ARRAY['owner','manager']));

COMMIT;
