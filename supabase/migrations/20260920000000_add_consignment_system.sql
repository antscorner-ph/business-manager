-- Create Consignees table
CREATE TABLE public.consignees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Products table
CREATE TABLE public.products (
  product_sku TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Consigned Products table (The relationship)
CREATE TABLE public.consignee_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  consignee_id UUID NOT NULL REFERENCES public.consignees(id) ON DELETE CASCADE,
  product_sku TEXT NOT NULL REFERENCES public.products(product_sku) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(consignee_id, product_sku)
);

-- Create Consignment Transactions table
CREATE TABLE public.consignment_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  consignee_id UUID NOT NULL REFERENCES public.consignees(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('REMITTANCE', 'RESTOCK')),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Consignment Transaction Items table
CREATE TABLE public.consignment_transaction_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.consignment_transactions(id) ON DELETE CASCADE,
  product_sku TEXT NOT NULL REFERENCES public.products(product_sku) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.consignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consignee_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consignment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consignment_transaction_items ENABLE ROW LEVEL SECURITY;

-- Create public access policies
CREATE POLICY "Allow public read access" ON public.consignees FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.consignees FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.consignees FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.consignees FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON public.products FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.products FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.products FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON public.consignee_products FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.consignee_products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.consignee_products FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.consignee_products FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON public.consignment_transactions FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.consignment_transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete access" ON public.consignment_transactions FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON public.consignment_transaction_items FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.consignment_transaction_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete access" ON public.consignment_transaction_items FOR DELETE USING (true);

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_consignees_updated_at
  BEFORE UPDATE ON public.consignees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_consignee_products_updated_at
  BEFORE UPDATE ON public.consignee_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_consignee_products_consignee_id ON public.consignee_products(consignee_id);
CREATE INDEX idx_consignee_products_product_sku ON public.consignee_products(product_sku);
CREATE INDEX idx_consignment_transactions_consignee_id ON public.consignment_transactions(consignee_id);
CREATE INDEX idx_consignment_transaction_items_transaction_id ON public.consignment_transaction_items(transaction_id);
