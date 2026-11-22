-- Schema Supabase untuk Retail Komputer
-- Jalankan di SQL Editor Supabase sebelum menggunakan aplikasi

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  -- Kategori produk: ink_toner, printer_scanner, laptop, desktop, monitor, component, storage, ram, gpu, cpu, networking, cctv_security, accessory, cable_connector, keyboard, mouse, service_fee, other
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
  work_notes TEXT,
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

-- ==============================================================================
-- TABEL & FUNGSI PEMBELIAN / KULAKAN (PURCHASES) & MUTASI STOK
-- ==============================================================================

CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  invoice_number TEXT,
  supplier_name TEXT,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  total_items INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id TEXT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  purchase_price NUMERIC NOT NULL CHECK (purchase_price >= 0),
  subtotal NUMERIC NOT NULL CHECK (subtotal >= 0),
  update_selling_price BOOLEAN NOT NULL DEFAULT FALSE,
  new_selling_price NUMERIC,
  prev_stock INTEGER NOT NULL DEFAULT 0,
  prev_purchase_price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_mutations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  mutation_type TEXT NOT NULL,
  reference_type TEXT NOT NULL DEFAULT 'purchases',
  reference_id TEXT NOT NULL,
  quantity_change INTEGER NOT NULL,
  stock_before INTEGER NOT NULL,
  stock_after INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases (purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases (status);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON purchase_items (purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_product_id ON purchase_items (product_id);
CREATE INDEX IF NOT EXISTS idx_stock_mutations_product_id ON stock_mutations (product_id);
CREATE INDEX IF NOT EXISTS idx_stock_mutations_created_at ON stock_mutations (created_at DESC);

-- RLS
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_mutations ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'purchases' AND policyname = 'Allow all operations on purchases'
  ) THEN
    CREATE POLICY "Allow all operations on purchases" ON purchases FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'purchase_items' AND policyname = 'Allow all operations on purchase_items'
  ) THEN
    CREATE POLICY "Allow all operations on purchase_items" ON purchase_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'stock_mutations' AND policyname = 'Allow all operations on stock_mutations'
  ) THEN
    CREATE POLICY "Allow all operations on stock_mutations" ON stock_mutations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- RPC Simpan Pembelian dengan Weighted Average Cost & Log Mutasi
CREATE OR REPLACE FUNCTION create_purchase_transaction(
  p_purchase_id TEXT,
  p_invoice_number TEXT,
  p_supplier_name TEXT,
  p_purchase_date DATE,
  p_total_amount NUMERIC,
  p_total_items INTEGER,
  p_notes TEXT,
  p_created_by TEXT,
  p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item RECORD;
  v_product RECORD;
  v_new_avg_cost NUMERIC;
  v_new_stock INTEGER;
  v_quantity INTEGER;
  v_purchase_price NUMERIC;
  v_update_selling BOOLEAN;
  v_new_selling NUMERIC;
  v_prod_id TEXT;
  v_prod_name TEXT;
BEGIN
  IF p_purchase_id IS NULL OR TRIM(p_purchase_id) = '' THEN
    RAISE EXCEPTION 'ID Transaksi Pembelian tidak boleh kosong';
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Item pembelian tidak boleh kosong';
  END IF;

  INSERT INTO purchases (
    id, invoice_number, supplier_name, purchase_date,
    total_amount, total_items, notes, status, created_by,
    created_at, updated_at
  ) VALUES (
    p_purchase_id, p_invoice_number, p_supplier_name,
    COALESCE(p_purchase_date, CURRENT_DATE),
    COALESCE(p_total_amount, 0), COALESCE(p_total_items, 0),
    p_notes, 'completed', p_created_by, NOW(), NOW()
  );

  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
    product_id TEXT,
    product_name TEXT,
    quantity INTEGER,
    purchase_price NUMERIC,
    update_selling_price BOOLEAN,
    new_selling_price NUMERIC
  )
  LOOP
    v_prod_id := v_item.product_id;
    v_prod_name := v_item.product_name;
    v_quantity := v_item.quantity;
    v_purchase_price := v_item.purchase_price;
    v_update_selling := COALESCE(v_item.update_selling_price, FALSE);
    v_new_selling := v_item.new_selling_price;

    IF v_quantity <= 0 THEN
      RAISE EXCEPTION 'Kuantitas barang "%" harus lebih besar dari 0', v_prod_name;
    END IF;

    IF v_purchase_price < 0 THEN
      RAISE EXCEPTION 'Harga beli barang "%" tidak boleh negatif', v_prod_name;
    END IF;

    SELECT id, name, stock, purchase_price, selling_price
    INTO v_product
    FROM products
    WHERE id = v_prod_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produk dengan ID "%" tidak ditemukan dalam database', v_prod_id;
    END IF;

    IF v_product.stock <= 0 THEN
      v_new_avg_cost := v_purchase_price;
    ELSE
      v_new_avg_cost := ROUND(
        ((v_product.stock * v_product.purchase_price) + (v_quantity * v_purchase_price))
        / (v_product.stock + v_quantity),
        2
      );
    END IF;

    v_new_stock := v_product.stock + v_quantity;

    IF v_update_selling AND v_new_selling IS NOT NULL AND v_new_selling > 0 THEN
      UPDATE products
      SET
        stock = v_new_stock,
        purchase_price = v_new_avg_cost,
        selling_price = v_new_selling
      WHERE id = v_prod_id;
    ELSE
      UPDATE products
      SET
        stock = v_new_stock,
        purchase_price = v_new_avg_cost
      WHERE id = v_prod_id;
    END IF;

    INSERT INTO purchase_items (
      purchase_id, product_id, product_name, quantity, purchase_price,
      subtotal, update_selling_price, new_selling_price, prev_stock,
      prev_purchase_price, created_at
    ) VALUES (
      p_purchase_id, v_prod_id, COALESCE(v_prod_name, v_product.name),
      v_quantity, v_purchase_price, v_quantity * v_purchase_price,
      v_update_selling, v_new_selling, v_product.stock,
      v_product.purchase_price, NOW()
    );

    INSERT INTO stock_mutations (
      product_id, mutation_type, reference_type, reference_id,
      quantity_change, stock_before, stock_after, notes, created_at
    ) VALUES (
      v_prod_id, 'PURCHASE', 'purchases', p_purchase_id,
      v_quantity, v_product.stock, v_new_stock,
      'Pembelian Masuk No: ' || p_purchase_id || COALESCE(' (' || p_supplier_name || ')', ''),
      NOW()
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'purchase_id', p_purchase_id,
    'message', 'Transaksi pembelian kulakan berhasil disimpan'
  );
END;
$$;

-- RPC Batalkan (Void) Pembelian
CREATE OR REPLACE FUNCTION void_purchase_transaction(
  p_purchase_id TEXT,
  p_void_reason TEXT DEFAULT NULL,
  p_voided_by TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_purchase RECORD;
  v_item RECORD;
  v_new_stock INTEGER;
BEGIN
  SELECT * INTO v_purchase
  FROM purchases
  WHERE id = p_purchase_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaksi pembelian dengan ID "%" tidak ditemukan', p_purchase_id;
  END IF;

  IF v_purchase.status = 'void' THEN
    RAISE EXCEPTION 'Transaksi pembelian "%" sudah dibatalkan sebelumnya (sudah void)', p_purchase_id;
  END IF;

  FOR v_item IN
    SELECT pi.*, p.name AS current_product_name, p.stock AS current_stock
    FROM purchase_items pi
    JOIN products p ON p.id = pi.product_id
    WHERE pi.purchase_id = p_purchase_id
    FOR UPDATE OF p
  LOOP
    IF v_item.current_stock < v_item.quantity THEN
      RAISE EXCEPTION 'Gagal membatalkan pembelian: Stok produk "%" tidak mencukupi untuk dikurangi. Stok saat ini: %, qty yang harus dikurangi: %',
        v_item.current_product_name, v_item.current_stock, v_item.quantity;
    END IF;
  END LOOP;

  FOR v_item IN
    SELECT pi.*, p.stock AS current_stock
    FROM purchase_items pi
    JOIN products p ON p.id = pi.product_id
    WHERE pi.purchase_id = p_purchase_id
  LOOP
    v_new_stock := v_item.current_stock - v_item.quantity;

    UPDATE products
    SET stock = v_new_stock
    WHERE id = v_item.product_id;

    INSERT INTO stock_mutations (
      product_id, mutation_type, reference_type, reference_id,
      quantity_change, stock_before, stock_after, notes, created_at
    ) VALUES (
      v_item.product_id, 'PURCHASE_VOID', 'purchases', p_purchase_id,
      -v_item.quantity, v_item.current_stock, v_new_stock,
      'Pembatalan (Void) Pembelian No: ' || p_purchase_id ||
        COALESCE(' - Alasan: ' || p_void_reason, '') ||
        COALESCE(' (oleh ' || p_voided_by || ')', ''),
      NOW()
    );
  END LOOP;

  UPDATE purchases
  SET
    status = 'void',
    notes = CASE
      WHEN notes IS NULL OR notes = '' THEN '[VOID]: ' || COALESCE(p_void_reason, 'Dibatalkan')
      ELSE notes || E'\n[VOID]: ' || COALESCE(p_void_reason, 'Dibatalkan')
    END,
    updated_at = NOW()
  WHERE id = p_purchase_id;

  RETURN jsonb_build_object(
    'success', true,
    'purchase_id', p_purchase_id,
    'message', 'Transaksi pembelian berhasil dibatalkan (void)'
  );
END;
$$;
