-- =============================================================
-- Migration: Extend school_holidays for per-role & date ranges
-- Created: 2026-06-24
-- Changes:
--   1. Drop UNIQUE constraint on date (single-date only)
--   2. Add date_start / date_end columns (range support)
--   3. Add role_id column (NULL = global, int = specific role)
--   4. Migrate existing data to new format
-- =============================================================

-- Step 1: Add new columns (keep date for backward compat temporarily)
ALTER TABLE school_holidays
  ADD COLUMN IF NOT EXISTS date_start DATE,
  ADD COLUMN IF NOT EXISTS date_end   DATE,
  ADD COLUMN IF NOT EXISTS role_id    INTEGER REFERENCES role(role_id) ON DELETE CASCADE;

-- Step 2: Migrate existing single-date rows → range rows
UPDATE school_holidays
  SET date_start = date, date_end = date
  WHERE date_start IS NULL AND date IS NOT NULL;

-- Step 3: Make date_start / date_end NOT NULL
ALTER TABLE school_holidays
  ALTER COLUMN date_start SET NOT NULL,
  ALTER COLUMN date_end   SET NOT NULL;

-- Step 4: Add constraint: date_end >= date_start
ALTER TABLE school_holidays
  DROP CONSTRAINT IF EXISTS chk_holiday_date_range;
ALTER TABLE school_holidays
  ADD CONSTRAINT chk_holiday_date_range CHECK (date_end >= date_start);

-- Step 5: Remove old unique constraint on date if it exists
ALTER TABLE school_holidays
  DROP CONSTRAINT IF EXISTS school_holidays_date_key;

-- Step 6: Add a unique constraint to prevent exact duplicate ranges per role
-- (role_id nullable, so use COALESCE trick — just add index)
CREATE UNIQUE INDEX IF NOT EXISTS uq_holidays_range_role
  ON school_holidays (date_start, date_end, COALESCE(role_id, -1));

-- Step 7: Drop old date column (optional, keep if you want backward compat)
-- ALTER TABLE school_holidays DROP COLUMN IF EXISTS date;

-- Step 8: Add indexes
CREATE INDEX IF NOT EXISTS idx_holidays_role_id    ON school_holidays(role_id);
CREATE INDEX IF NOT EXISTS idx_holidays_date_start ON school_holidays(date_start);
CREATE INDEX IF NOT EXISTS idx_holidays_date_end   ON school_holidays(date_end);

-- Update comment
COMMENT ON TABLE school_holidays IS
  'Kalender hari libur sekolah. role_id NULL = berlaku untuk semua role (global). '
  'role_id berisi ID role tertentu = hanya berlaku untuk role tersebut. '
  'Mendukung range tanggal (date_start s/d date_end).';

COMMENT ON COLUMN school_holidays.role_id IS
  'NULL = libur global (semua role). Integer = libur khusus role tersebut.';
COMMENT ON COLUMN school_holidays.date_start IS 'Awal periode libur (inclusive).';
COMMENT ON COLUMN school_holidays.date_end   IS 'Akhir periode libur (inclusive). Sama dengan date_start untuk libur 1 hari.';
