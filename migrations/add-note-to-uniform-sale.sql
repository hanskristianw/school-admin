-- ============================================================
-- MIGRATION: Tambah kolom note ke tabel uniform_sale
-- Tujuan: menyimpan catatan per penjualan (kelebihan bayar, dll)
-- Jalankan di: Supabase SQL Editor
-- ============================================================

ALTER TABLE uniform_sale
  ADD COLUMN IF NOT EXISTS note TEXT DEFAULT NULL;

SELECT 'uniform_sale.note column added' AS status;
