-- ============================================
-- CONSERVATIVE CLEANUP: Remove Session Infrastructure Only
-- ============================================
-- This script will:
-- 1. Backup session-related data
-- 2. Remove session QR infrastructure
-- 3. KEEP all attendance records (absen & scan logs)
-- 4. Optimize for daily QR system
-- 
-- ⚠️ This does NOT delete attendance records
-- ⚠️ Safer option if you want to keep historical data
-- ============================================

-- ============================================
-- STEP 1: BACKUP SESSION DATA
-- ============================================

-- Backup attendance_session table
CREATE TABLE IF NOT EXISTS _backup_attendance_session AS 
SELECT *, NOW() as backup_at 
FROM attendance_session;

-- Backup scan logs with session_id
CREATE TABLE IF NOT EXISTS _backup_session_scan_logs AS 
SELECT *, NOW() as backup_at 
FROM attendance_scan_log
WHERE session_id IS NOT NULL;

-- Backup absen with session_id
CREATE TABLE IF NOT EXISTS _backup_session_absen AS 
SELECT *, NOW() as backup_at 
FROM absen
WHERE absen_session_id IS NOT NULL;

SELECT 
  'Backup created' as status,
  json_build_object(
    'sessions_backed_up', (SELECT COUNT(*) FROM _backup_attendance_session),
    'session_scans_backed_up', (SELECT COUNT(*) FROM _backup_session_scan_logs),
    'session_absen_backed_up', (SELECT COUNT(*) FROM _backup_session_absen)
  ) as counts;

-- ============================================
-- STEP 2: CLEAN SESSION REFERENCES (Keep Data)
-- ============================================

-- Set session_id to NULL in attendance_scan_log (keep the records!)
UPDATE attendance_scan_log 
SET session_id = NULL 
WHERE session_id IS NOT NULL;

-- Set absen_session_id to NULL in absen (keep the records!)
UPDATE absen 
SET absen_session_id = NULL 
WHERE absen_session_id IS NOT NULL;

SELECT 
  'Session references cleaned' as status,
  json_build_object(
    'scan_logs_updated', (SELECT COUNT(*) FROM attendance_scan_log WHERE session_id IS NULL),
    'absen_updated', (SELECT COUNT(*) FROM absen WHERE absen_session_id IS NULL)
  ) as result;

-- ============================================
-- STEP 3: REMOVE SESSION INFRASTRUCTURE
-- ============================================

-- Drop foreign key constraints
ALTER TABLE attendance_scan_log 
  DROP CONSTRAINT IF EXISTS attendance_scan_log_session_id_fkey;

ALTER TABLE absen 
  DROP CONSTRAINT IF EXISTS absen_absen_session_id_fkey;

-- Drop indexes
DROP INDEX IF EXISTS idx_scan_log_session;
DROP INDEX IF EXISTS idx_absen_session;
DROP INDEX IF EXISTS idx_attendance_session_creator;
DROP INDEX IF EXISTS idx_attendance_session_year;
DROP INDEX IF EXISTS idx_attendance_session_kelas;
DROP INDEX IF EXISTS idx_attendance_session_status;

-- Remove columns
ALTER TABLE absen 
  DROP COLUMN IF EXISTS absen_session_id;

ALTER TABLE attendance_scan_log 
  DROP COLUMN IF EXISTS session_id;

ALTER TABLE attendance_scan_log 
  DROP COLUMN IF EXISTS token_slot;

-- Drop attendance_session table
DROP TABLE IF EXISTS attendance_session CASCADE;

SELECT '✅ Session infrastructure removed' as status;

-- ============================================
-- STEP 4: UPDATE CONSTRAINTS FOR DAILY QR
-- ============================================

-- Update absen_method constraint
ALTER TABLE absen 
  DROP CONSTRAINT IF EXISTS absen_absen_method_check;

ALTER TABLE absen 
  ADD CONSTRAINT absen_absen_method_check 
  CHECK (absen_method IN ('manual', 'qr_daily', 'import'));

-- Ensure unique constraint
ALTER TABLE absen 
  DROP CONSTRAINT IF EXISTS absen_detail_siswa_date_unique;

ALTER TABLE absen 
  ADD CONSTRAINT absen_detail_siswa_date_unique 
  UNIQUE (absen_detail_siswa_id, absen_date);

SELECT '✅ Constraints updated' as status;

-- ============================================
-- STEP 5: ADD OPTIMIZED INDEXES
-- ============================================

-- Performance indexes for daily QR
CREATE INDEX IF NOT EXISTS idx_absen_date 
  ON absen(absen_date DESC);

CREATE INDEX IF NOT EXISTS idx_absen_method 
  ON absen(absen_method);

CREATE INDEX IF NOT EXISTS idx_absen_detail_date 
  ON absen(absen_detail_siswa_id, absen_date);

CREATE INDEX IF NOT EXISTS idx_scan_log_date 
  ON attendance_scan_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scan_log_result 
  ON attendance_scan_log(result);

CREATE INDEX IF NOT EXISTS idx_scan_log_student_date 
  ON attendance_scan_log(detail_siswa_id, created_at DESC);

-- Flagged attendance index (for multi-user detection)
CREATE INDEX IF NOT EXISTS idx_scan_log_flagged 
  ON attendance_scan_log(flagged_reason, created_at DESC) 
  WHERE flagged_reason IS NOT NULL;

-- Multi-user detection indexes
CREATE INDEX IF NOT EXISTS idx_scan_log_device_client_time 
  ON attendance_scan_log(device_hash_client, created_at DESC) 
  WHERE device_hash_client IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scan_log_device_uaip_time 
  ON attendance_scan_log(device_hash_uaip, created_at DESC) 
  WHERE device_hash_uaip IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scan_log_device_time 
  ON attendance_scan_log(device_hash, created_at DESC) 
  WHERE device_hash IS NOT NULL;

SELECT '✅ Optimized indexes created' as status;

-- ============================================
-- STEP 6: VERIFY FINAL STATE
-- ============================================

-- Table structure
SELECT 
  '📋 Final Table Structure' as section,
  table_name,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name IN ('absen', 'attendance_scan_log')
  AND table_schema = 'public'
GROUP BY table_name;

-- Data counts
SELECT 
  '📊 Data Preserved' as section,
  'absen' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN absen_method = 'qr_daily' THEN 1 END) as qr_daily,
  COUNT(CASE WHEN absen_method = 'manual' THEN 1 END) as manual,
  COUNT(CASE WHEN absen_method = 'import' THEN 1 END) as import
FROM absen
UNION ALL
SELECT 
  '📊 Data Preserved',
  'attendance_scan_log',
  COUNT(*),
  COUNT(CASE WHEN result = 'ok' THEN 1 END),
  COUNT(CASE WHEN flagged_reason IS NOT NULL THEN 1 END),
  NULL
FROM attendance_scan_log;

-- Verify no session references remain
SELECT 
  '🔍 Verification' as section,
  'attendance_session table' as item,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_session')
    THEN '❌ Still exists'
    ELSE '✅ Removed'
  END as status
UNION ALL
SELECT 
  '🔍 Verification',
  'absen.absen_session_id column',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'absen' AND column_name = 'absen_session_id')
    THEN '❌ Still exists'
    ELSE '✅ Removed'
  END
UNION ALL
SELECT 
  '🔍 Verification',
  'attendance_scan_log.session_id column',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_scan_log' AND column_name = 'session_id')
    THEN '❌ Still exists'
    ELSE '✅ Removed'
  END;

-- ============================================
-- FINAL SUMMARY
-- ============================================

SELECT 
  '🎉 CONSERVATIVE CLEANUP COMPLETE!' as message,
  json_build_object(
    'attendance_records_kept', (SELECT COUNT(*) FROM absen),
    'scan_logs_kept', (SELECT COUNT(*) FROM attendance_scan_log),
    'session_infrastructure_removed', true,
    'data_loss', 'NONE - All attendance data preserved',
    'system_type', 'Daily QR Only',
    'backups_created', (SELECT COUNT(*) FROM information_schema.tables WHERE table_name LIKE '_backup_%')
  ) as summary;

-- ============================================
-- NOTES:
-- ============================================
-- ✅ All attendance data is PRESERVED
-- ✅ Session infrastructure REMOVED
-- ✅ Indexes OPTIMIZED for daily QR
-- ✅ Backups created for session data
-- 
-- To restore session infrastructure (if needed in future):
-- 1. Run original migration: supabase-migration-qr-attendance.sql
-- 2. Restore from backups: _backup_attendance_session, etc.
-- ============================================
