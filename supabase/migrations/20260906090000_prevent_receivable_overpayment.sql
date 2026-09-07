-- Receivables integrity hardening:
-- 1) prevent overpayments on receivable_payments,
-- 2) keep receivable balances non-negative,
-- 3) recalc on insert/update/delete of payments.

BEGIN;

CREATE OR REPLACE FUNCTION public.validate_receivable_payment_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receivable_amount NUMERIC(12,2);
  v_paid_so_far NUMERIC(12,2);
BEGIN
  IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  -- Lock target receivable row to avoid concurrent overpayment races.
  SELECT r.amount
  INTO v_receivable_amount
  FROM public.receivables r
  WHERE r.id = NEW.receivable_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Receivable not found';
  END IF;

  SELECT COALESCE(SUM(rp.amount), 0)
  INTO v_paid_so_far
  FROM public.receivable_payments rp
  WHERE rp.receivable_id = NEW.receivable_id
    AND (TG_OP <> 'UPDATE' OR rp.id <> NEW.id);

  IF v_paid_so_far + NEW.amount > v_receivable_amount THEN
    RAISE EXCEPTION 'Payment exceeds remaining receivable balance';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_receivable_payment_amount_trigger ON public.receivable_payments;
CREATE TRIGGER validate_receivable_payment_amount_trigger
  BEFORE INSERT OR UPDATE ON public.receivable_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_receivable_payment_amount();

CREATE OR REPLACE FUNCTION public.update_receivable_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receivable_id UUID;
BEGIN
  -- Recompute for the affected receivable (NEW on insert/update, OLD on delete).
  v_receivable_id := COALESCE(NEW.receivable_id, OLD.receivable_id);

  UPDATE public.receivables r
  SET
    amount_paid = p.total_paid,
    balance = GREATEST(r.amount - p.total_paid, 0),
    status = CASE
      WHEN p.total_paid >= r.amount THEN 'paid'
      WHEN p.total_paid > 0 THEN 'partially_paid'
      ELSE 'pending'
    END,
    updated_at = now()
  FROM (
    SELECT COALESCE(SUM(amount), 0) AS total_paid
    FROM public.receivable_payments
    WHERE receivable_id = v_receivable_id
  ) p
  WHERE r.id = v_receivable_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS update_receivable_on_payment_trigger ON public.receivable_payments;
CREATE TRIGGER update_receivable_on_payment_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.receivable_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_receivable_on_payment();

-- Backfill existing receivables to enforce non-negative balances with current payments.
WITH payment_totals AS (
  SELECT receivable_id, COALESCE(SUM(amount), 0) AS total_paid
  FROM public.receivable_payments
  GROUP BY receivable_id
)
UPDATE public.receivables r
SET
  amount_paid = COALESCE(pt.total_paid, 0),
  balance = GREATEST(r.amount - COALESCE(pt.total_paid, 0), 0),
  status = CASE
    WHEN COALESCE(pt.total_paid, 0) >= r.amount THEN 'paid'
    WHEN COALESCE(pt.total_paid, 0) > 0 THEN 'partially_paid'
    ELSE 'pending'
  END,
  updated_at = now()
FROM payment_totals pt
WHERE pt.receivable_id = r.id;

COMMIT;
