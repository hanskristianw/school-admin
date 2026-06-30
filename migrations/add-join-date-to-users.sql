-- ============================================================
-- Tambah kolom join_date ke tabel users
-- Untuk filter laporan: guru yang join Juli 2026 tidak muncul
-- di laporan Juni 2026 dan tidak dihitung absen sebelum join
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS join_date DATE DEFAULT NULL;

SELECT 'Migration join_date berhasil' AS status;
