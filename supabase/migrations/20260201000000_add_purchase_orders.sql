-- Create table for purchase orders
CREATE TABLE public.purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  voucher_no TEXT NOT NULL UNIQUE,
  supplier_name TEXT NOT NULL,
  or_no TEXT,
  items TEXT NOT NULL,
  total_amount DECIMAL(12, 2) NOT NULL,
  partial_payment_notes TEXT NULL DEFAULT NULL,
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'cancelled', 'delivered')),
  delivered_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on purchase_orders table
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

-- Create public access policies for purchase_orders
CREATE POLICY "Allow public read access" ON public.purchase_orders FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.purchase_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.purchase_orders FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.purchase_orders FOR DELETE USING (true);

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_purchase_orders_updated_at
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_purchase_orders_date ON public.purchase_orders(date DESC);
CREATE INDEX idx_purchase_orders_supplier ON public.purchase_orders(supplier_name);
CREATE INDEX idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX idx_purchase_orders_payment_status ON public.purchase_orders(payment_status);
