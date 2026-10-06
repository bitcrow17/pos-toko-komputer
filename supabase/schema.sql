-- Schema Supabase untuk Retail Komputer
-- Jalankan di SQL Editor Supabase sebelum menggunakan aplikasi

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  purchase_price NUMERIC NOT NULL DEFAULT 0,
  selling_price NUMERIC NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  serial_number TEXT,
  barcode TEXT,
  minimum_stock INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type TEXT DEFAULT 'RETAIL',
  total_harga NUMERIC NOT NULL,
  nominal_bayar NUMERIC NOT NULL,
  kembalian NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'CASH',
  customer_id TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  debt_id TEXT,
  service_ticket_id TEXT,
  service_ticket_no TEXT,
  service_partner_fee NUMERIC,
  service_sparepart_cost NUMERIC,
  service_net_profit NUMERIC
);

CREATE TABLE IF NOT EXISTS transaction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL
);

CREATE TABLE IF NOT EXISTS debts (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL REFERENCES transactions(id),
  customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  total_amount NUMERIC NOT NULL,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  remaining_amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'UNPAID',
  payment_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS partners (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  ticket_no TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  device_name TEXT NOT NULL,
  serial_number TEXT,
  problem TEXT NOT NULL,
  handling_type TEXT NOT NULL DEFAULT 'INTERNAL',
  partner_id TEXT,
  partner_status TEXT,
  partner_fee NUMERIC NOT NULL DEFAULT 0,
  customer_fee NUMERIC NOT NULL DEFAULT 0,
  is_complaint BOOLEAN NOT NULL DEFAULT FALSE,
  original_ticket_no TEXT,
  accessories JSONB DEFAULT '["UNIT"]'::jsonb,
  estimated_completion_date DATE,
  sparepart_cost NUMERIC DEFAULT 0,
  net_profit NUMERIC,
  is_paid BOOLEAN DEFAULT FALSE,
  payment_transaction_id TEXT,
  collected_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'QUEUED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_name ON products (name);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products (barcode);
CREATE INDEX IF NOT EXISTS idx_transaction_items_tx ON transaction_items (transaction_id);
CREATE INDEX IF NOT EXISTS idx_debts_customer ON debts (customer_id);
CREATE INDEX IF NOT EXISTS idx_services_ticket_no ON services (ticket_no);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers (name);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers (phone);
CREATE INDEX IF NOT EXISTS idx_partners_name ON partners (name);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions (timestamp DESC);
