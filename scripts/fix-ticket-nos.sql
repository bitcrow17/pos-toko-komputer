-- ============================================================
-- Script: fix-ticket-nos.sql
-- Tujuan: Memperbaiki nomor tiket servis yang rusak di database Supabase
-- Format target: SVC-YYYYMMDD-NNN  (contoh: SVC-20261105-001)
-- 
-- Cara penggunaan:
--   1. Buka Supabase Dashboard → SQL Editor
--   2. Jalankan bagian "PREVIEW" dulu untuk melihat data yang akan diubah
--   3. Jika sudah yakin, jalankan bagian "UPDATE"
-- ============================================================


-- ─────────────────────────────────────────
-- LANGKAH 1: PREVIEW — Lihat tiket yang formatnya rusak/tidak sesuai
-- ─────────────────────────────────────────
SELECT
  id,
  ticket_no,
  customer_name,
  created_at
FROM services
WHERE ticket_no !~ '^SVC-\d{8}-\d{3}$'   -- tidak cocok format SVC-YYYYMMDD-NNN
ORDER BY created_at;


-- ─────────────────────────────────────────
-- LANGKAH 2: UPDATE — Perbaiki tiket yang rusak
-- Strategi: Assign ulang nomor urut berdasarkan urutan created_at per hari
-- Timezone: Asia/Makassar (WITA, UTC+8) — sesuaikan jika perlu
-- ─────────────────────────────────────────
WITH ranked AS (
  SELECT
    id,
    created_at,
    to_char(created_at AT TIME ZONE 'Asia/Makassar', 'YYYYMMDD') AS date_part,
    ROW_NUMBER() OVER (
      PARTITION BY to_char(created_at AT TIME ZONE 'Asia/Makassar', 'YYYYMMDD')
      ORDER BY created_at ASC
    ) AS day_seq
  FROM services
  WHERE ticket_no !~ '^SVC-\d{8}-\d{3}$'
)
UPDATE services s
SET ticket_no = 'SVC-' || r.date_part || '-' || lpad(r.day_seq::text, 3, '0')
FROM ranked r
WHERE s.id = r.id;


-- ─────────────────────────────────────────
-- LANGKAH 3: VERIFIKASI — Pastikan semua tiket sudah berformat benar
-- ─────────────────────────────────────────
SELECT
  id,
  ticket_no,
  customer_name,
  created_at
FROM services
ORDER BY created_at DESC
LIMIT 50;

-- Jika masih ada yang rusak, kueri ini akan menampilkannya:
SELECT COUNT(*) AS tiket_masih_rusak
FROM services
WHERE ticket_no !~ '^SVC-\d{8}-\d{3}$';

