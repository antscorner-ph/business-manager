-- Create table for tracking receivables (credit sales, IOUs, etc.)
CREATE TABLE public.receivables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(12, 2) NOT NULL,
  date_issued DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partially_paid', 'paid', 'written_off')),
  amount_paid DECIMAL(12, 2) NOT NULL DEFAULT 0,
  balance DECIMAL(12, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for receivable payments
CREATE TABLE public.receivable_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receivable_id UUID NOT NULL REFERENCES public.receivables(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'cash',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for weekly bank deposits
CREATE TABLE public.bank_deposits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deposit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  bank_name TEXT NOT NULL,
  account_number TEXT,
  total_amount DECIMAL(12, 2) NOT NULL,
  deposit_slip_number TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'reconciled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for bank deposit items (breakdown of what's being deposited)
CREATE TABLE public.bank_deposit_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_deposit_id UUID NOT NULL REFERENCES public.bank_deposits(id) ON DELETE CASCADE,
  source TEXT NOT NULL, -- e.g., "Daily Sales", "Receivable Payment", "Other"
  reference_date DATE,
  amount DECIMAL(12, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receivable_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_deposit_items ENABLE ROW LEVEL SECURITY;

-- Create public access policies for receivables
CREATE POLICY "Allow public read access" ON public.receivables FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.receivables FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.receivables FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.receivables FOR DELETE USING (true);

-- Create public access policies for receivable_payments
CREATE POLICY "Allow public read access" ON public.receivable_payments FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.receivable_payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete access" ON public.receivable_payments FOR DELETE USING (true);

-- Create public access policies for bank_deposits
CREATE POLICY "Allow public read access" ON public.bank_deposits FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.bank_deposits FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.bank_deposits FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.bank_deposits FOR DELETE USING (true);

-- Create public access policies for bank_deposit_items
CREATE POLICY "Allow public read access" ON public.bank_deposit_items FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.bank_deposit_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.bank_deposit_items FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.bank_deposit_items FOR DELETE USING (true);

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_receivables_updated_at
  BEFORE UPDATE ON public.receivables
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bank_deposits_updated_at
  BEFORE UPDATE ON public.bank_deposits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to automatically update receivable balance and status
CREATE OR REPLACE FUNCTION public.update_receivable_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_receivable RECORD;
  v_total_paid DECIMAL(12, 2);
BEGIN
  -- Get the receivable and calculate total paid
  SELECT * INTO v_receivable FROM public.receivables WHERE id = NEW.receivable_id;
  
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid 
  FROM public.receivable_payments 
  WHERE receivable_id = NEW.receivable_id;
  
  -- Update the receivable
  UPDATE public.receivables
  SET 
    amount_paid = v_total_paid,
    balance = amount - v_total_paid,
    status = CASE
      WHEN v_total_paid >= amount THEN 'paid'
      WHEN v_total_paid > 0 THEN 'partially_paid'
      ELSE 'pending'
    END,
    updated_at = now()
  WHERE id = NEW.receivable_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_receivable_on_payment_trigger
  AFTER INSERT ON public.receivable_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_receivable_on_payment();

-- Function to calculate and update bank deposit total
CREATE OR REPLACE FUNCTION public.update_bank_deposit_total()
RETURNS TRIGGER AS $$
DECLARE
  v_total DECIMAL(12, 2);
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_total
  FROM public.bank_deposit_items
  WHERE bank_deposit_id = COALESCE(NEW.bank_deposit_id, OLD.bank_deposit_id);
  
  UPDATE public.bank_deposits
  SET total_amount = v_total, updated_at = now()
  WHERE id = COALESCE(NEW.bank_deposit_id, OLD.bank_deposit_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bank_deposit_total_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.bank_deposit_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_bank_deposit_total();

-- Create indexes for better query performance
CREATE INDEX idx_receivables_status ON public.receivables(status);
CREATE INDEX idx_receivables_date_issued ON public.receivables(date_issued);
CREATE INDEX idx_receivables_due_date ON public.receivables(due_date);
CREATE INDEX idx_receivable_payments_receivable_id ON public.receivable_payments(receivable_id);
CREATE INDEX idx_bank_deposits_date ON public.bank_deposits(deposit_date);
CREATE INDEX idx_bank_deposits_status ON public.bank_deposits(status);
CREATE INDEX idx_bank_deposit_items_deposit_id ON public.bank_deposit_items(bank_deposit_id);
