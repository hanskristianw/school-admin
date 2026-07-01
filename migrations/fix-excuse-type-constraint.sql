-- ============================================================
-- Fix CHECK constraint pada attendance_excuses.excuse_type
-- Tambahkan nilai: no_checkout, no_checkin
-- ============================================================

-- Lihat constraint yang ada saat ini
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'attendance_excuses'::regclass
  AND contype = 'c';

-- Hapus constraint lama
ALTER TABLE attendance_excuses
  DROP CONSTRAINT IF EXISTS attendance_excuses_excuse_type_check;

-- Buat ulang constraint dengan semua nilai yang valid
ALTER TABLE attendance_excuses
  ADD CONSTRAINT attendance_excuses_excuse_type_check
  CHECK (excuse_type IN ('late', 'absent', 'leave_early', 'no_checkout', 'no_checkin', 'other'));

-- Verifikasi
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'attendance_excuses'::regclass
  AND contype = 'c';
