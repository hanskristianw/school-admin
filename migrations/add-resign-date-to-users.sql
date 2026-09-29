-- ============================================================
-- Migration: Add resign_date to users table
-- ============================================================

-- 1. Add resign_date column if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS resign_date DATE;

-- 2. Set resign date for Donny William Montolalu (user_id: 85)
UPDATE users
SET resign_date = '2026-09-25'
WHERE user_id = 85;

-- 3. Add column comment for documentation
COMMENT ON COLUMN users.resign_date IS 'Effective resignation date. Days after this date are excluded from attendance tracking and reporting.';
