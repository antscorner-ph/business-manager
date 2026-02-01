-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  email VARCHAR,
  phone VARCHAR,
  address TEXT,
  city VARCHAR,
  postal_code VARCHAR,
  contact_person VARCHAR,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  email VARCHAR,
  phone VARCHAR,
  address TEXT,
  city VARCHAR,
  postal_code VARCHAR,
  contact_person VARCHAR,
  payment_terms VARCHAR,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add customer_id foreign key to receivables
ALTER TABLE receivables 
ADD COLUMN customer_id UUID REFERENCES customers(id) ON DELETE CASCADE;

-- Add supplier_id foreign key to purchase_orders
ALTER TABLE purchase_orders 
ADD COLUMN supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_receivables_customer_id ON receivables(customer_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);

-- Enable RLS on new tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for customers
CREATE POLICY "Allow public read access" ON customers
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access" ON customers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access" ON customers
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access" ON customers
  FOR DELETE USING (true);

-- Create RLS policies for suppliers
CREATE POLICY "Allow public read access" ON suppliers
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access" ON suppliers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access" ON suppliers
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access" ON suppliers
  FOR DELETE USING (true);
