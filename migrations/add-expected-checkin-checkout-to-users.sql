-- Tambah kolom expected_check_in dan expected_check_out ke tabel users
-- Jika kosong (NULL), sistem akan menggunakan default 07:30 dan 16:30

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS expected_check_in  TIME DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS expected_check_out TIME DEFAULT NULL;
