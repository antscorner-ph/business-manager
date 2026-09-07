-- Create table for business expenses
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'gcash', 'check', 'bank_transfer', 'other')),
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'unpaid', 'partially_paid')),
  amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON public.expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON public.expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_payment_method ON public.expenses(payment_method);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON public.expenses FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.expenses FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.expenses FOR DELETE USING (true);

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
