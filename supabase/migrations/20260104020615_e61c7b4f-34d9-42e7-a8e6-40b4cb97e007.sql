-- Create table for daily reconciliations
CREATE TABLE public.daily_reconciliations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  opening_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_cash_in DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_cash_out DECIMAL(12, 2) NOT NULL DEFAULT 0,
  expected_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  actual_cash DECIMAL(12, 2),
  variance DECIMAL(12, 2),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(date)
);

-- Create table for transactions
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reconciliation_id UUID REFERENCES public.daily_reconciliations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('cash_in', 'cash_out')),
  category TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for denomination breakdown
CREATE TABLE public.denomination_counts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reconciliation_id UUID REFERENCES public.daily_reconciliations(id) ON DELETE CASCADE,
  denomination DECIMAL(10, 2) NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.daily_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.denomination_counts ENABLE ROW LEVEL SECURITY;

-- Create public access policies (no auth for now)
CREATE POLICY "Allow public read access" ON public.daily_reconciliations FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.daily_reconciliations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.daily_reconciliations FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.daily_reconciliations FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON public.transactions FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete access" ON public.transactions FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON public.denomination_counts FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.denomination_counts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.denomination_counts FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.denomination_counts FOR DELETE USING (true);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_daily_reconciliations_updated_at
  BEFORE UPDATE ON public.daily_reconciliations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();