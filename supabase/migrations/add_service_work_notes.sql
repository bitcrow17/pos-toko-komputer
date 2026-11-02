-- Catatan pengerjaan teknisi/mitra pada tiket servis (boleh diubah kapan saja)
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS work_notes TEXT;
