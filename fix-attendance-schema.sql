-- ============================================
-- FIX ATTENDANCE SCHEMA AFTER CLEAN SLATE
-- ============================================
-- This script safely removes any remaining session columns
-- after running clean-slate-attendance.sql
-- 
-- Safe to run multiple times (uses IF EXISTS)
-- ============================================

-- ============================================
-- STEP 1: VERIFY CURRENT STATE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '🔍 Checking current schema state...';
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_session') THEN
    RAISE NOTICE '⚠️  attendance_session table still exists';
  ELSE
    RAISE NOTICE '✅ attendance_session table removed';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'absen' AND column_name = 'absen_session_id') THEN
    RAISE NOTICE '⚠️  absen.absen_session_id column still exists';
  ELSE
    RAISE NOTICE '✅ absen.absen_session_id column removed';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_scan_log' AND column_name = 'session_id') THEN
    RAISE NOTICE '⚠️  attendance_scan_log.session_id column still exists';
  ELSE
    RAISE NOTICE '✅ attendance_scan_log.session_id column removed';
  END IF;
END $$;

-- ============================================
-- STEP 2: REMOVE FOREIGN KEY CONSTRAINTS (IF EXIST)
-- ============================================

-- Drop FK from attendance_scan_log
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'attendance_scan_log_session_id_fkey'
  ) THEN
    ALTER TABLE attendance_scan_log DROP CONSTRAINT attendance_scan_log_session_id_fkey;
    RAISE NOTICE '✅ Dropped constraint: attendance_scan_log_session_id_fkey';
  ELSE
    RAISE NOTICE '✓ Constraint already removed: attendance_scan_log_session_id_fkey';
  END IF;
END $$;

-- Drop FK from absen
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'absen_absen_session_id_fkey'
  ) THEN
    ALTER TABLE absen DROP CONSTRAINT absen_absen_session_id_fkey;
    RAISE NOTICE '✅ Dropped constraint: absen_absen_session_id_fkey';
  ELSE
    RAISE NOTICE '✓ Constraint already removed: absen_absen_session_id_fkey';
  END IF;
END $$;

-- ============================================
-- STEP 3: REMOVE SESSION COLUMNS (IF EXIST)
-- ============================================

-- Remove absen.absen_session_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'absen' AND column_name = 'absen_session_id'
  ) THEN
    ALTER TABLE absen DROP COLUMN absen_session_id;
    RAISE NOTICE '✅ Dropped column: absen.absen_session_id';
  ELSE
    RAISE NOTICE '✓ Column already removed: absen.absen_session_id';
  END IF;
END $$;

-- Remove attendance_scan_log.session_id (optional - can keep as nullable)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_scan_log' AND column_name = 'session_id'
  ) THEN
    -- First make it nullable if not already
    ALTER TABLE attendance_scan_log ALTER COLUMN session_id DROP NOT NULL;
    -- Then drop the column (optional - uncomment if you want to remove completely)
    -- ALTER TABLE attendance_scan_log DROP COLUMN session_id;
    RAISE NOTICE '✅ Made nullable: attendance_scan_log.session_id (kept for backward compatibility)';
    RAISE NOTICE '   To remove completely, uncomment the DROP COLUMN line in this script';
  ELSE
    RAISE NOTICE '✓ Column already removed: attendance_scan_log.session_id';
  END IF;
END $$;

-- Remove attendance_scan_log.token_slot (optional)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_scan_log' AND column_name = 'token_slot'
  ) THEN
    -- ALTER TABLE attendance_scan_log DROP COLUMN token_slot;
    RAISE NOTICE '⚠️  Column still exists: attendance_scan_log.token_slot (kept for backward compatibility)';
    RAISE NOTICE '   To remove, uncomment the DROP COLUMN line in this script';
  ELSE
    RAISE NOTICE '✓ Column already removed: attendance_scan_log.token_slot';
  END IF;
END $$;

-- ============================================
-- STEP 4: DROP ATTENDANCE_SESSION TABLE
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'attendance_session'
  ) THEN
    DROP TABLE attendance_session CASCADE;
    RAISE NOTICE '✅ Dropped table: attendance_session';
  ELSE
    RAISE NOTICE '✓ Table already removed: attendance_session';
  END IF;
END $$;

-- ============================================
-- STEP 5: REMOVE SESSION-RELATED INDEXES
-- ============================================

DROP INDEX IF EXISTS idx_scan_log_session;
DROP INDEX IF EXISTS idx_absen_session;
DROP INDEX IF EXISTS idx_attendance_session_creator;
DROP INDEX IF EXISTS idx_attendance_session_year;
DROP INDEX IF EXISTS idx_attendance_session_kelas;
DROP INDEX IF EXISTS idx_attendance_session_status;

-- ============================================
-- STEP 6: VERIFY FINAL STATE
-- ============================================

DO $$
DECLARE
  all_good BOOLEAN := TRUE;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════';
  RAISE NOTICE '📋 FINAL VERIFICATION';
  RAISE NOTICE '═══════════════════════════════════════════';
  
  -- Check attendance_session table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_session') THEN
    RAISE NOTICE '❌ attendance_session table: STILL EXISTS';
    all_good := FALSE;
  ELSE
    RAISE NOTICE '✅ attendance_session table: REMOVED';
  END IF;
  
  -- Check absen.absen_session_id
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'absen' AND column_name = 'absen_session_id') THEN
    RAISE NOTICE '❌ absen.absen_session_id column: STILL EXISTS';
    all_good := FALSE;
  ELSE
    RAISE NOTICE '✅ absen.absen_session_id column: REMOVED';
  END IF;
  
  -- Check attendance_scan_log.session_id
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_scan_log' AND column_name = 'session_id') THEN
    RAISE NOTICE '⚠️  attendance_scan_log.session_id column: EXISTS (nullable, OK for backward compatibility)';
  ELSE
    RAISE NOTICE '✅ attendance_scan_log.session_id column: REMOVED';
  END IF;
  
  -- Check constraints
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name LIKE '%session%') THEN
    RAISE NOTICE '⚠️  Session-related constraints: STILL EXIST';
  ELSE
    RAISE NOTICE '✅ Session-related constraints: ALL REMOVED';
  END IF;
  
  RAISE NOTICE '═══════════════════════════════════════════';
  
  IF all_good THEN
    RAISE NOTICE '🎉 SCHEMA CLEANUP COMPLETE!';
    RAISE NOTICE '   System is ready for daily QR only';
  ELSE
    RAISE NOTICE '⚠️  Some session infrastructure still exists';
    RAISE NOTICE '   Review the messages above for details';
  END IF;
  
  RAISE NOTICE '═══════════════════════════════════════════';
END $$;

-- ============================================
-- SUMMARY
-- ============================================

SELECT 
  '✅ Schema Fix Complete' as status,
  json_build_object(
    'absen_table', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'absen'),
    'scan_log_table', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_scan_log'),
    'session_table_removed', NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_session'),
    'absen_session_column_removed', NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'absen' AND column_name = 'absen_session_id'
    ),
    'ready_for_daily_qr', TRUE
  ) as result;
