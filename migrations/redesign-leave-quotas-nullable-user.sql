-- ============================================================
-- Redesign leave_quotas: user_id jadi nullable
-- user_id = NULL → record global (template untuk semua karyawan)
-- user_id = angka → record individual (override per orang)
-- ============================================================

-- 1. Hapus default_days dari leave_types (tidak dipakai lagi)
ALTER TABLE leave_types DROP COLUMN IF EXISTS default_days;

-- 2. Buat user_id nullable
ALTER TABLE leave_quotas ALTER COLUMN user_id DROP NOT NULL;

-- 3. Hapus unique constraint lama (tidak bisa handle NULL dengan benar)
ALTER TABLE leave_quotas
  DROP CONSTRAINT IF EXISTS uq_leave_quotas_user_type_year;
DROP INDEX IF EXISTS uq_leave_quotas_user_type_year;

-- 4. Dua partial unique index:
--    a) Satu global per (leave_type_code, year_id) — hanya 1 baris global
CREATE UNIQUE INDEX IF NOT EXISTS uq_leave_quotas_global
  ON leave_quotas (leave_type_code, year_id)
  WHERE user_id IS NULL;

--    b) Satu per karyawan per (user_id, leave_type_code, year_id)
CREATE UNIQUE INDEX IF NOT EXISTS uq_leave_quotas_individual
  ON leave_quotas (user_id, leave_type_code, year_id)
  WHERE user_id IS NOT NULL;

-- 5. Kolom is_global sebagai penanda (opsional, bisa diinfer dari user_id IS NULL)
--    Kita tidak tambah kolom baru, cukup user_id IS NULL = global

-- Verifikasi
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_name = 'leave_quotas'
ORDER BY ordinal_position;

SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'leave_quotas';
