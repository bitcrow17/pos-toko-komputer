-- ==============================================================================
-- Migrasi: Skema Tabel Pembelian, Purchase Items, Mutasi Stok, dan Fungsi RPC
-- Aplikasi: Retail Komputer POS & Servis
-- Sifat: Aman & Idempotent (Dapat dijalankan berulang kali tanpa error)
-- ==============================================================================

-- 1. Tabel purchases (Header Transaksi Pembelian / Kulakan)
CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  invoice_number TEXT,
  supplier_name TEXT,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  total_items INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'completed', -- 'completed' | 'void'
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabel purchase_items (Rincian Item Barang Pembelian)
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

-- 3. Tabel stock_mutations (Log Riwayat Perubahan Stok Barang)
CREATE TABLE IF NOT EXISTS stock_mutations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  mutation_type TEXT NOT NULL, -- 'PURCHASE', 'PURCHASE_VOID', 'SALE', 'SALE_RETURN', 'ADJUSTMENT'
  reference_type TEXT NOT NULL DEFAULT 'purchases',
  reference_id TEXT NOT NULL,
  quantity_change INTEGER NOT NULL,
  stock_before INTEGER NOT NULL,
  stock_after INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index Performa Query
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases (purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases (status);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON purchase_items (purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_product_id ON purchase_items (product_id);
CREATE INDEX IF NOT EXISTS idx_stock_mutations_product_id ON stock_mutations (product_id);
CREATE INDEX IF NOT EXISTS idx_stock_mutations_created_at ON stock_mutations (created_at DESC);

-- Terapkan Row Level Security (RLS)
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_mutations ENABLE ROW LEVEL SECURITY;

-- Kebijakan RLS Aman & Idempotent (selaras dengan tabel POS lainnya)
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


-- ==============================================================================
-- FUNGSI RPC 1: create_purchase_transaction
-- Operasi Atomik:
-- 1. Simpan header ke purchases
-- 2. Simpan item ke purchase_items
-- 3. Tambah stok pada products
-- 4. Hitung ulang harga modal (purchase_price) produk menggunakan metode Weighted Average
-- 5. Update harga jual (selling_price) HANYA JIKA update_selling_price dicentang
-- 6. Catat riwayat perubahan ke tabel stock_mutations
-- ==============================================================================
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
  -- Validasi input dasar
  IF p_purchase_id IS NULL OR TRIM(p_purchase_id) = '' THEN
    RAISE EXCEPTION 'ID Transaksi Pembelian tidak boleh kosong';
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Item pembelian tidak boleh kosong';
  END IF;

  -- 1. Insert header pembelian
  INSERT INTO purchases (
    id,
    invoice_number,
    supplier_name,
    purchase_date,
    total_amount,
    total_items,
    notes,
    status,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    p_purchase_id,
    p_invoice_number,
    p_supplier_name,
    COALESCE(p_purchase_date, CURRENT_DATE),
    COALESCE(p_total_amount, 0),
    COALESCE(p_total_items, 0),
    p_notes,
    'completed',
    p_created_by,
    NOW(),
    NOW()
  );

  -- 2. Proses masing-masing item barang
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

    -- Lock baris produk di tabel products untuk mencegah race condition
    SELECT id, name, stock, purchase_price, selling_price
    INTO v_product
    FROM products
    WHERE id = v_prod_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produk dengan ID "%" tidak ditemukan dalam database', v_prod_id;
    END IF;

    -- Hitung Weighted Average Cost (Modal Rata-rata Tertimbang):
    -- Rumus: ((stok_lama * modal_lama) + (qty_baru * harga_beli_baru)) / (stok_lama + qty_baru)
    -- Jika stok lama <= 0, harga modal langsung mengacu pada harga beli baru
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

    -- Update produk (stok, harga modal baru, dan opsi harga jual)
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

    -- Insert ke rincian purchase_items
    INSERT INTO purchase_items (
      purchase_id,
      product_id,
      product_name,
      quantity,
      purchase_price,
      subtotal,
      update_selling_price,
      new_selling_price,
      prev_stock,
      prev_purchase_price,
      created_at
    ) VALUES (
      p_purchase_id,
      v_prod_id,
      COALESCE(v_prod_name, v_product.name),
      v_quantity,
      v_purchase_price,
      v_quantity * v_purchase_price,
      v_update_selling,
      v_new_selling,
      v_product.stock,
      v_product.purchase_price,
      NOW()
    );

    -- Catat riwayat ke log mutasi stok
    INSERT INTO stock_mutations (
      product_id,
      mutation_type,
      reference_type,
      reference_id,
      quantity_change,
      stock_before,
      stock_after,
      notes,
      created_at
    ) VALUES (
      v_prod_id,
      'PURCHASE',
      'purchases',
      p_purchase_id,
      v_quantity,
      v_product.stock,
      v_new_stock,
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


-- ==============================================================================
-- FUNGSI RPC 2: void_purchase_transaction
-- Operasi Atomik:
-- 1. Validasi transaksi ada dan belum di-void
-- 2. Validasi stok saat ini di products: TOLAK (raise exception) jika stok saat ini < qty pembelian
-- 3. Kurangi stok produk dan catat ke stock_mutations (PURCHASE_VOID)
-- 4. Ubah status transaksi pembelian menjadi 'void'
-- ==============================================================================
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
  -- 1. Kunci dan cek header transaksi pembelian
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

  -- 2. Validasi stok SEMUA item terlebih dahulu (kunci baris produk)
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

  -- 3. Kurangi stok dan catat mutasi stok pembatalan
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
      product_id,
      mutation_type,
      reference_type,
      reference_id,
      quantity_change,
      stock_before,
      stock_after,
      notes,
      created_at
    ) VALUES (
      v_item.product_id,
      'PURCHASE_VOID',
      'purchases',
      p_purchase_id,
      -v_item.quantity,
      v_item.current_stock,
      v_new_stock,
      'Pembatalan (Void) Pembelian No: ' || p_purchase_id ||
        COALESCE(' - Alasan: ' || p_void_reason, '') ||
        COALESCE(' (oleh ' || p_voided_by || ')', ''),
      NOW()
    );
  END LOOP;

  -- 4. Ubah status transaksi menjadi 'void'
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

