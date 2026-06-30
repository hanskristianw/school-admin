-- ============================================================
-- Tambah kolom attachment_url ke tabel attendance_excuses
-- Untuk menyimpan URL file upload (surat dokter, surat tugas, dll)
-- ============================================================

ALTER TABLE attendance_excuses
  ADD COLUMN IF NOT EXISTS attachment_url TEXT DEFAULT NULL;

SELECT 'Migration attachment_url berhasil' AS status;
