-- ============================================================
-- 1. Tambah default_days ke leave_types
--    Jika diisi → jatah global berlaku untuk semua karyawan
--    Jika NULL  → harus diset manual per orang di leave_quotas
-- ============================================================

ALTER TABLE leave_types
  ADD COLUMN IF NOT EXISTS default_days INTEGER DEFAULT NULL;

COMMENT ON COLUMN leave_types.default_days IS
  'Jatah global (hari) yang berlaku untuk semua karyawan. NULL = harus diset manual per karyawan.';

-- Update icon menu di sidebar
-- Tipe Ijin: fa-list-check (📋 daftar jenis ijin)
-- Jatah Cuti: fa-calendar-check (🗓️ jatah per karyawan)
UPDATE menu
SET icon = 'fas fa-list-check'
WHERE path LIKE '%attendance-leave-types%'
   OR label ILIKE '%tipe%ijin%'
   OR label ILIKE '%leave type%';

UPDATE menu
SET icon = 'fas fa-calendar-check'
WHERE path LIKE '%attendance-leave-quota%'
   OR label ILIKE '%jatah%cuti%'
   OR label ILIKE '%leave quota%';

-- Verifikasi
SELECT id, label, path, icon FROM menu WHERE path LIKE '%leave%' ORDER BY path;
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'leave_types' AND column_name = 'default_days';
