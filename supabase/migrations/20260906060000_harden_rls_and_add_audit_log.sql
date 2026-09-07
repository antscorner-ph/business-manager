-- Security hardening: move from public policies to authenticated-only access
-- and add immutable audit logging for critical business tables.

BEGIN;

-- 1) Centralized audit log table
CREATE TABLE IF NOT EXISTS public.audit_log (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_by UUID,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  old_data JSONB,
  new_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON public.audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON public.audit_log(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_by ON public.audit_log(changed_by);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read" ON public.audit_log;
DROP POLICY IF EXISTS "Allow public read access" ON public.audit_log;
DROP POLICY IF EXISTS "Allow public insert access" ON public.audit_log;
DROP POLICY IF EXISTS "Allow public update access" ON public.audit_log;
DROP POLICY IF EXISTS "Allow public delete access" ON public.audit_log;

CREATE POLICY "Authenticated read"
  ON public.audit_log
  FOR SELECT
  TO authenticated
  USING (true);

-- No insert/update/delete policies on audit_log: client cannot mutate audit rows.

CREATE OR REPLACE FUNCTION public.write_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, changed_by, old_data, new_data)
    VALUES (TG_TABLE_NAME, to_jsonb(NEW)->>'id', TG_OP, v_user_id, NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, changed_by, old_data, new_data)
    VALUES (TG_TABLE_NAME, to_jsonb(NEW)->>'id', TG_OP, v_user_id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, changed_by, old_data, new_data)
    VALUES (TG_TABLE_NAME, to_jsonb(OLD)->>'id', TG_OP, v_user_id, to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- 2) Replace permissive RLS policies with authenticated-only policies.
DO $$
DECLARE
  tbl TEXT;
  pol TEXT;
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
    'expenses',
    'employees',
    'time_entries'
  ];
  old_policy_names TEXT[] := ARRAY[
    'Allow public read access',
    'Allow public insert access',
    'Allow public update access',
    'Allow public delete access',
    'Authenticated read',
    'Authenticated insert',
    'Authenticated update',
    'Authenticated delete'
  ];
BEGIN
  FOREACH tbl IN ARRAY target_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

    FOREACH pol IN ARRAY old_policy_names LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol, tbl);
    END LOOP;

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)',
      'Authenticated read',
      tbl
    );

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (true)',
      'Authenticated insert',
      tbl
    );

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)',
      'Authenticated update',
      tbl
    );

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (true)',
      'Authenticated delete',
      tbl
    );
  END LOOP;
END
$$;

-- 3) Attach audit triggers to critical operational/financial tables.
DO $$
DECLARE
  tbl TEXT;
  audited_tables TEXT[] := ARRAY[
    'daily_reconciliations',
    'transactions',
    'denomination_counts',
    'receivables',
    'receivable_payments',
    'bank_deposits',
    'bank_deposit_items',
    'purchase_orders',
    'purchase_order_items',
    'expenses',
    'employees',
    'time_entries'
  ];
BEGIN
  FOREACH tbl IN ARRAY audited_tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', 'audit_log_trigger', tbl);
    EXECUTE format(
      'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.write_audit_log()',
      'audit_log_trigger',
      tbl
    );
  END LOOP;
END
$$;

COMMIT;
