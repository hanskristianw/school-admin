-- Hapus kolom deduct_quota dari leave_types
-- Logika baru: ada quota record = ada batas, tidak ada = bebas
ALTER TABLE leave_types DROP COLUMN IF EXISTS deduct_quota;

-- Verifikasi
SELECT column_name FROM information_schema.columns
WHERE table_name = 'leave_types' ORDER BY ordinal_position;
