-- Security hardening for employee time-clock PINs.
-- Moves from plain-text PIN storage to bcrypt hash verification.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS pin_hash TEXT;

-- Backfill existing plain-text PINs into bcrypt hash, then clear plain column.
UPDATE public.employees
SET pin_hash = crypt(pin, gen_salt('bf'))
WHERE pin IS NOT NULL AND btrim(pin) <> '' AND (pin_hash IS NULL OR pin_hash = '');

UPDATE public.employees
SET pin = NULL
WHERE pin IS NOT NULL;

-- Guardrail trigger: if anything writes to employees.pin, hash it and blank the plain value.
CREATE OR REPLACE FUNCTION public.hash_employee_pin_from_plain()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.pin IS NOT NULL AND btrim(NEW.pin) <> '' THEN
    NEW.pin_hash := crypt(NEW.pin, gen_salt('bf'));
    NEW.pin := NULL;
  ELSIF NEW.pin IS NOT NULL AND btrim(NEW.pin) = '' THEN
    NEW.pin := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hash_employee_pin_from_plain_trigger ON public.employees;
CREATE TRIGGER hash_employee_pin_from_plain_trigger
  BEFORE INSERT OR UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.hash_employee_pin_from_plain();

-- Explicit server-side pin setter. Allows owner/manager to set or clear PINs.
CREATE OR REPLACE FUNCTION public.set_employee_pin(p_employee_id UUID, p_pin TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.user_has_any_role(ARRAY['owner', 'manager']) THEN
    RAISE EXCEPTION 'Not authorized to set employee PIN';
  END IF;

  UPDATE public.employees
  SET
    pin_hash = CASE
      WHEN p_pin IS NULL OR btrim(p_pin) = '' THEN NULL
      ELSE crypt(p_pin, gen_salt('bf'))
    END,
    pin = NULL,
    updated_at = now()
  WHERE id = p_employee_id;
END;
$$;

-- Server-side verifier used by Time Clock screen.
CREATE OR REPLACE FUNCTION public.verify_employee_pin(p_employee_id UUID, p_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash TEXT;
BEGIN
  SELECT pin_hash INTO v_hash
  FROM public.employees
  WHERE id = p_employee_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- If no PIN is set for employee, treat as pass-through.
  IF v_hash IS NULL OR v_hash = '' THEN
    RETURN TRUE;
  END IF;

  IF p_pin IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN v_hash = crypt(p_pin, v_hash);
END;
$$;

REVOKE ALL ON FUNCTION public.set_employee_pin(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_employee_pin(UUID, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.verify_employee_pin(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_employee_pin(UUID, TEXT) TO authenticated;

COMMIT;
