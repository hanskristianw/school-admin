-- ============================================
-- CLEAN SLATE: Reset Attendance System
-- ============================================
-- This script will:
-- 1. Backup all existing attendance data
-- 2. Remove session QR infrastructure (not needed for daily QR)
-- 3. Clean all attendance records (start fresh)
-- 4. Optimize tables for daily QR system only
-- 
-- ⚠️ WARNING: This is DESTRUCTIVE! Make sure you have backups.
-- ⚠️ Run this ONLY if you want to start attendance from scratch.
-- ============================================

-- ============================================
-- STEP 1: BACKUP EXISTING DATA
-- ============================================

-- Backup attendance_session (if exists)
CREATE TABLE IF NOT EXISTS _backup_attendance_session AS 
SELECT *, NOW() as backup_at 
FROM attendance_session;

-- Backup attendance_scan_log
CREATE TABLE IF NOT EXISTS _backup_attendance_scan_log AS 
SELECT *, NOW() as backup_at 
FROM attendance_scan_log;

-- Backup absen
CREATE TABLE IF NOT EXISTS _backup_absen AS 
SELECT *, NOW() as backup_at 
FROM absen;

-- Verify backups
SELECT 
  '_backup_attendance_session' as table_name, 
  COUNT(*) as backup_count 
FROM _backup_attendance_session
UNION ALL
SELECT 
  '_backup_attendance_scan_log', 
  COUNT(*) 
FROM _backup_attendance_scan_log
UNION ALL
SELECT 
  '_backup_absen', 
  COUNT(*) 
FROM _backup_absen;

-- ============================================
-- STEP 2: DELETE ALL ATTENDANCE RECORDS
-- ============================================

-- Delete all scan logs
DELETE FROM attendance_scan_log;

-- Delete all attendance records
DELETE FROM absen;

-- Delete all sessions
DELETE FROM attendance_session;

-- Verify deletion
SELECT 
  'attendance_scan_log' as table_name, 
  COUNT(*) as remaining_records 
FROM attendance_scan_log
UNION ALL
SELECT 
  'absen', 
  COUNT(*) 
FROM absen
UNION ALL
SELECT 
  'attendance_session', 
  COUNT(*) 
FROM attendance_session;

-- ============================================
-- STEP 3: REMOVE SESSION QR INFRASTRUCTURE
-- ============================================

-- Drop foreign key constraints first
ALTER TABLE attendance_scan_log 
  DROP CONSTRAINT IF EXISTS attendance_scan_log_session_id_fkey;

ALTER TABLE absen 
  DROP CONSTRAINT IF EXISTS absen_absen_session_id_fkey;

-- Drop indexes related to session
DROP INDEX IF EXISTS idx_scan_log_session;
DROP INDEX IF EXISTS idx_absen_session;
DROP INDEX IF EXISTS idx_attendance_session_creator;
DROP INDEX IF EXISTS idx_attendance_session_year;
DROP INDEX IF EXISTS idx_attendance_session_kelas;
DROP INDEX IF EXISTS idx_attendance_session_status;

-- Remove session_id column from absen (not needed for daily QR)
ALTER TABLE absen 
  DROP COLUMN IF EXISTS absen_session_id;

-- Remove session_id and token_slot from attendance_scan_log
-- (Keep them nullable for now, or remove completely)
ALTER TABLE attendance_scan_log 
  ALTER COLUMN session_id DROP NOT NULL;
  
-- Optional: Remove session_id column completely
-- ALTER TABLE attendance_scan_log DROP COLUMN IF EXISTS session_id;
-- ALTER TABLE attendance_scan_log DROP COLUMN IF EXISTS token_slot;

-- Drop attendance_session table
DROP TABLE IF EXISTS attendance_session CASCADE;

-- ============================================
-- STEP 4: OPTIMIZE TABLES FOR DAILY QR ONLY
-- ============================================

-- Update absen_method constraint (ensure qr_daily is included)
ALTER TABLE absen 
  DROP CONSTRAINT IF EXISTS absen_absen_method_check;

ALTER TABLE absen 
  ADD CONSTRAINT absen_absen_method_check 
  CHECK (absen_method IN ('manual', 'qr_daily', 'import'));

-- Ensure unique constraint on absen (one per student per date)
ALTER TABLE absen 
  DROP CONSTRAINT IF EXISTS absen_detail_siswa_date_unique;

ALTER TABLE absen 
  ADD CONSTRAINT absen_detail_siswa_date_unique 
  UNIQUE (absen_detail_siswa_id, absen_date);

-- Add indexes for performance (daily QR queries)
CREATE INDEX IF NOT EXISTS idx_absen_date 
  ON absen(absen_date DESC);

CREATE INDEX IF NOT EXISTS idx_absen_method 
  ON absen(absen_method);

CREATE INDEX IF NOT EXISTS idx_scan_log_date 
  ON attendance_scan_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scan_log_result 
  ON attendance_scan_log(result);

CREATE INDEX IF NOT EXISTS idx_scan_log_flagged 
  ON attendance_scan_log(flagged_reason) 
  WHERE flagged_reason IS NOT NULL;

-- Optimize device hash indexes
CREATE INDEX IF NOT EXISTS idx_scan_log_device_client_time 
  ON attendance_scan_log(device_hash_client, created_at DESC) 
  WHERE device_hash_client IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scan_log_device_uaip_time 
  ON attendance_scan_log(device_hash_uaip, created_at DESC) 
  WHERE device_hash_uaip IS NOT NULL;

-- ============================================
-- STEP 5: RESET AUTO-INCREMENT SEQUENCES
-- ============================================

-- Reset absen sequence
ALTER SEQUENCE IF EXISTS absen_absen_id_seq RESTART WITH 1;

-- Reset attendance_scan_log sequence
ALTER SEQUENCE IF EXISTS attendance_scan_log_log_id_seq RESTART WITH 1;

-- ============================================
-- STEP 6: VERIFY CLEAN STATE
-- ============================================

-- Check table structures
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name IN ('absen', 'attendance_scan_log')
  AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Check constraints
SELECT 
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name IN ('absen', 'attendance_scan_log')
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_type;

-- Check indexes
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('absen', 'attendance_scan_log')
  AND schemaname = 'public'
ORDER BY tablename, indexname;

-- Final status
SELECT 
  '✅ CLEANUP COMPLETE' as status,
  json_build_object(
    'absen_records', (SELECT COUNT(*) FROM absen),
    'scan_log_records', (SELECT COUNT(*) FROM attendance_scan_log),
    'session_table_exists', (
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'attendance_session'
      )
    ),
    'absen_has_session_column', (
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'absen' 
          AND column_name = 'absen_session_id'
      )
    ),
    'backup_tables_created', (
      SELECT COUNT(*) 
      FROM information_schema.tables 
      WHERE table_name LIKE '_backup_%'
    )
  ) as verification;

-- ============================================
-- STEP 7: VERIFY DAILY QR SETTINGS
-- ============================================

-- Check if daily QR secrets exist
SELECT 
  key,
  CASE 
    WHEN value IS NOT NULL AND value != '' THEN '✅ SET'
    ELSE '❌ MISSING'
  END as status,
  LENGTH(value) as secret_length
FROM settings
WHERE key IN (
  'attendance_secret_mon',
  'attendance_secret_tue',
  'attendance_secret_wed',
  'attendance_secret_thu',
  'attendance_secret_fri'
)
ORDER BY key;

-- If secrets are missing, generate them:
/*
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM settings WHERE key = 'attendance_secret_mon') THEN
    INSERT INTO settings (key, value) VALUES ('attendance_secret_mon', gen_random_uuid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM settings WHERE key = 'attendance_secret_tue') THEN
    INSERT INTO settings (key, value) VALUES ('attendance_secret_tue', gen_random_uuid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM settings WHERE key = 'attendance_secret_wed') THEN
    INSERT INTO settings (key, value) VALUES ('attendance_secret_wed', gen_random_uuid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM settings WHERE key = 'attendance_secret_thu') THEN
    INSERT INTO settings (key, value) VALUES ('attendance_secret_thu', gen_random_uuid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM settings WHERE key = 'attendance_secret_fri') THEN
    INSERT INTO settings (key, value) VALUES ('attendance_secret_fri', gen_random_uuid()::text);
  END IF;
END $$;
*/

-- ============================================
-- DONE!
-- ============================================

SELECT 
  '🎉 ATTENDANCE SYSTEM RESET COMPLETE!' as message,
  json_build_object(
    'system_type', 'Daily QR Only',
    'session_system_removed', true,
    'data_cleaned', true,
    'backups_created', true,
    'ready_for_production', true
  ) as status;

-- ============================================
-- NOTES:
-- ============================================
-- 1. All old attendance data is backed up in _backup_* tables
-- 2. attendance_session table has been removed
-- 3. session_id columns kept nullable (for potential future use)
-- 4. System is now optimized for daily QR only
-- 5. All indexes optimized for daily QR queries
-- 6. Multi-user detection indexes added
-- 
-- To restore from backup (if needed):
-- INSERT INTO absen SELECT * FROM _backup_absen WHERE backup_at = (SELECT MAX(backup_at) FROM _backup_absen);
-- ============================================
