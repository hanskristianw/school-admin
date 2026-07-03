-- ============================================================
-- Update leave_quotas: ganti kolom year INTEGER → year_id FK
-- yang merujuk ke tabel year (tahun ajaran)
-- ============================================================

-- 1. Tambah kolom year_id (nullable dulu supaya bisa diisi sebelum NOT NULL)
ALTER TABLE leave_quotas
  ADD COLUMN IF NOT EXISTS year_id INTEGER REFERENCES year(year_id) ON DELETE CASCADE;

-- 2. Hapus unique constraint lama (yang pakai kolom year)
ALTER TABLE leave_quotas
  DROP CONSTRAINT IF EXISTS leave_quotas_user_id_leave_type_code_year_key;

-- 3. Hapus index lama
DROP INDEX IF EXISTS idx_leave_quotas_user_year;

-- 4. Hapus kolom year INTEGER lama (hanya jika sudah ada year_id)
ALTER TABLE leave_quotas DROP COLUMN IF EXISTS year;

-- 5. Set year_id NOT NULL setelah data dimigrasikan (jika ada data lama, skip ini)
-- ALTER TABLE leave_quotas ALTER COLUMN year_id SET NOT NULL;
-- (dijalankan manual setelah memastikan semua row sudah punya year_id)

-- 6. Unique constraint baru
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_leave_quotas_user_type_year'
  ) THEN
    ALTER TABLE leave_quotas
      ADD CONSTRAINT uq_leave_quotas_user_type_year
      UNIQUE (user_id, leave_type_code, year_id);
  END IF;
END $$;

-- 7. Index baru
CREATE INDEX IF NOT EXISTS idx_leave_quotas_user_year_id ON leave_quotas(user_id, year_id);
CREATE INDEX IF NOT EXISTS idx_leave_quotas_year_id ON leave_quotas(year_id);

-- Verifikasi
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'leave_quotas'
ORDER BY ordinal_position;
