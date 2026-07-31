-- ============================================================
-- MIGRATION: Temporary Exit Permission & Unit Principal Approval
-- Support Izin Keluar Jam Kerja (temporary_exit) dan Unit Principal Overview
-- Jalankan di: Supabase SQL Editor
-- ============================================================

-- 1. Tambah kolom exit_time, return_time, dan unit_id pada attendance_excuses
ALTER TABLE attendance_excuses
  ADD COLUMN IF NOT EXISTS exit_time TIME,
  ADD COLUMN IF NOT EXISTS return_time TIME,
  ADD COLUMN IF NOT EXISTS unit_id INTEGER REFERENCES unit(unit_id);

-- 2. Update CHECK constraint pada excuse_type
ALTER TABLE attendance_excuses
  DROP CONSTRAINT IF EXISTS attendance_excuses_excuse_type_check;

ALTER TABLE attendance_excuses
  ADD CONSTRAINT attendance_excuses_excuse_type_check
  CHECK (excuse_type IN ('late', 'leave_early', 'absent', 'no_checkin', 'no_checkout', 'temporary_exit', 'other'));

-- 3. Backfill unit_id dari tabel users untuk data yang sudah ada
UPDATE attendance_excuses ae
SET unit_id = u.user_unit_id
FROM users u
WHERE ae.user_id = u.user_id AND ae.unit_id IS NULL;

-- 4. Indeks performa untuk kueri per unit
CREATE INDEX IF NOT EXISTS idx_excuses_unit_id ON attendance_excuses (unit_id);
CREATE INDEX IF NOT EXISTS idx_excuses_type ON attendance_excuses (excuse_type);

SELECT 'Migration temporary_exit dan unit_id untuk attendance_excuses berhasil' AS status;
