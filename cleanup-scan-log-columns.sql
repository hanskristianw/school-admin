-- ============================================
-- CLEANUP: Remove Unused Columns from attendance_scan_log
-- ============================================
-- This script removes columns that are NOT used in Daily QR system:
-- 1. session_id (for session QR only)
-- 2. token_slot (for session QR only)
-- 3. weekly_mode_flag (unknown/legacy)
-- 4. weekday_used (redundant - can get from created_at)
-- 
-- ⚠️ OPTIONAL: lat, lng, accuracy (only if you don't need geofencing)
-- ============================================

-- ============================================
-- STEP 1: VERIFY CURRENT STATE
-- ============================================

-- Check if columns exist
SELECT 
  '📋 Current Columns' as section,
  column_name,
  data_type,
  is_nullable,
  CASE 
    WHEN column_name IN ('session_id', 'token_slot', 'weekly_mode_flag', 'weekday_used') 
    THEN '❌ NOT USED (can be removed)'
    WHEN column_name IN ('lat', 'lng', 'accuracy') 
    THEN '⚠️ OPTIONAL (only for geofencing)'
    ELSE '✅ USED (keep)'
  END as status
FROM information_schema.columns
WHERE table_name = 'attendance_scan_log'
  AND table_schema = 'public'
ORDER BY 
  CASE 
    WHEN column_name = 'log_id' THEN 1
    WHEN column_name = 'detail_siswa_id' THEN 2
    WHEN column_name = 'result' THEN 3
    WHEN column_name = 'flagged_reason' THEN 4
    WHEN column_name = 'device_hash' THEN 5
    WHEN column_name = 'device_hash_client' THEN 6
    WHEN column_name = 'device_hash_uaip' THEN 7
    WHEN column_name = 'created_at' THEN 8
    ELSE 99
  END;

-- Check if data exists in these columns
SELECT 
  '🔍 Data Check' as section,
  COUNT(*) as total_records,
  COUNT(session_id) as has_session_id,
  COUNT(token_slot) as has_token_slot,
  COUNT(CASE WHEN weekly_mode_flag = true THEN 1 END) as has_weekly_mode,
  COUNT(weekday_used) as has_weekday_used,
  COUNT(lat) as has_lat,
  COUNT(lng) as has_lng,
  COUNT(accuracy) as has_accuracy
FROM attendance_scan_log;

-- ============================================
-- STEP 2: BACKUP (Optional but Recommended)
-- ============================================

-- Backup full table before removing columns
CREATE TABLE IF NOT EXISTS _backup_scan_log_before_column_cleanup AS 
SELECT *, NOW() as backup_at 
FROM attendance_scan_log;

SELECT 
  '💾 Backup Created' as status,
  COUNT(*) as records_backed_up
FROM _backup_scan_log_before_column_cleanup;

-- ============================================
-- STEP 3: REMOVE UNUSED COLUMNS
-- ============================================

-- Remove session_id (for session QR only)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_scan_log' AND column_name = 'session_id'
  ) THEN
    ALTER TABLE attendance_scan_log DROP COLUMN session_id;
    RAISE NOTICE '✅ Dropped column: session_id';
  ELSE
    RAISE NOTICE '✓ Column already removed: session_id';
  END IF;
END $$;

-- Remove token_slot (for session QR only)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_scan_log' AND column_name = 'token_slot'
  ) THEN
    ALTER TABLE attendance_scan_log DROP COLUMN token_slot;
    RAISE NOTICE '✅ Dropped column: token_slot';
  ELSE
    RAISE NOTICE '✓ Column already removed: token_slot';
  END IF;
END $$;

-- Remove weekly_mode_flag (unknown/legacy)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_scan_log' AND column_name = 'weekly_mode_flag'
  ) THEN
    ALTER TABLE attendance_scan_log DROP COLUMN weekly_mode_flag;
    RAISE NOTICE '✅ Dropped column: weekly_mode_flag';
  ELSE
    RAISE NOTICE '✓ Column already removed: weekly_mode_flag';
  END IF;
END $$;

-- Remove weekday_used (redundant - can extract from created_at)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_scan_log' AND column_name = 'weekday_used'
  ) THEN
    ALTER TABLE attendance_scan_log DROP COLUMN weekday_used;
    RAISE NOTICE '✅ Dropped column: weekday_used';
  ELSE
    RAISE NOTICE '✓ Column already removed: weekday_used';
  END IF;
END $$;

-- ============================================
-- STEP 4: OPTIONAL - REMOVE GEOFENCING COLUMNS
-- ============================================

-- UNCOMMENT BELOW if you don't need geofencing features
-- (lat, lng, accuracy are only useful if you track location)

/*
-- Remove lat (geofencing only)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_scan_log' AND column_name = 'lat'
  ) THEN
    ALTER TABLE attendance_scan_log DROP COLUMN lat;
    RAISE NOTICE '✅ Dropped column: lat';
  ELSE
    RAISE NOTICE '✓ Column already removed: lat';
  END IF;
END $$;

-- Remove lng (geofencing only)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_scan_log' AND column_name = 'lng'
  ) THEN
    ALTER TABLE attendance_scan_log DROP COLUMN lng;
    RAISE NOTICE '✅ Dropped column: lng';
  ELSE
    RAISE NOTICE '✓ Column already removed: lng';
  END IF;
END $$;

-- Remove accuracy (geofencing only)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_scan_log' AND column_name = 'accuracy'
  ) THEN
    ALTER TABLE attendance_scan_log DROP COLUMN accuracy;
    RAISE NOTICE '✅ Dropped column: accuracy';
  ELSE
    RAISE NOTICE '✓ Column already removed: accuracy';
  END IF;
END $$;
*/

-- ============================================
-- STEP 5: VERIFY FINAL STATE
-- ============================================

-- Show remaining columns
SELECT 
  '✅ Final Schema' as section,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'attendance_scan_log'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verify removed columns
DO $$
DECLARE
  all_good BOOLEAN := TRUE;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════';
  RAISE NOTICE '📋 COLUMN CLEANUP VERIFICATION';
  RAISE NOTICE '═══════════════════════════════════════════';
  
  -- Check session_id
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_scan_log' AND column_name = 'session_id') THEN
    RAISE NOTICE '❌ session_id: STILL EXISTS';
    all_good := FALSE;
  ELSE
    RAISE NOTICE '✅ session_id: REMOVED';
  END IF;
  
  -- Check token_slot
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_scan_log' AND column_name = 'token_slot') THEN
    RAISE NOTICE '❌ token_slot: STILL EXISTS';
    all_good := FALSE;
  ELSE
    RAISE NOTICE '✅ token_slot: REMOVED';
  END IF;
  
  -- Check weekly_mode_flag
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_scan_log' AND column_name = 'weekly_mode_flag') THEN
    RAISE NOTICE '❌ weekly_mode_flag: STILL EXISTS';
    all_good := FALSE;
  ELSE
    RAISE NOTICE '✅ weekly_mode_flag: REMOVED';
  END IF;
  
  -- Check weekday_used
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_scan_log' AND column_name = 'weekday_used') THEN
    RAISE NOTICE '❌ weekday_used: STILL EXISTS';
    all_good := FALSE;
  ELSE
    RAISE NOTICE '✅ weekday_used: REMOVED';
  END IF;
  
  -- Check core columns still exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_scan_log' AND column_name = 'log_id') THEN
    RAISE NOTICE '❌ log_id: MISSING (ERROR!)';
    all_good := FALSE;
  ELSE
    RAISE NOTICE '✅ log_id: EXISTS';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_scan_log' AND column_name = 'device_hash_client') THEN
    RAISE NOTICE '❌ device_hash_client: MISSING (ERROR!)';
    all_good := FALSE;
  ELSE
    RAISE NOTICE '✅ device_hash_client: EXISTS';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_scan_log' AND column_name = 'flagged_reason') THEN
    RAISE NOTICE '❌ flagged_reason: MISSING (ERROR!)';
    all_good := FALSE;
  ELSE
    RAISE NOTICE '✅ flagged_reason: EXISTS';
  END IF;
  
  RAISE NOTICE '═══════════════════════════════════════════';
  
  IF all_good THEN
    RAISE NOTICE '🎉 CLEANUP COMPLETE!';
    RAISE NOTICE '   Unused columns removed successfully';
    RAISE NOTICE '   Core columns intact';
  ELSE
    RAISE NOTICE '⚠️  Some issues detected';
    RAISE NOTICE '   Review messages above';
  END IF;
  
  RAISE NOTICE '═══════════════════════════════════════════';
END $$;

-- ============================================
-- SUMMARY
-- ============================================

SELECT 
  '✅ Column Cleanup Complete' as status,
  json_build_object(
    'total_columns', (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'attendance_scan_log'),
    'session_removed', NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_scan_log' AND column_name = 'session_id'),
    'token_slot_removed', NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_scan_log' AND column_name = 'token_slot'),
    'weekly_mode_removed', NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_scan_log' AND column_name = 'weekly_mode_flag'),
    'weekday_used_removed', NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_scan_log' AND column_name = 'weekday_used'),
    'core_columns_intact', (
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_scan_log' AND column_name = 'log_id')
      AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_scan_log' AND column_name = 'device_hash_client')
      AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_scan_log' AND column_name = 'flagged_reason')
    ),
    'backup_created', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_backup_scan_log_before_column_cleanup')
  ) as result;

-- ============================================
-- NOTES:
-- ============================================
-- ✅ session_id, token_slot - REMOVED (session QR only)
-- ✅ weekly_mode_flag, weekday_used - REMOVED (not used)
-- ⚠️ lat, lng, accuracy - KEPT (geofencing - remove if not needed)
-- ✅ Backup created: _backup_scan_log_before_column_cleanup
-- 
-- To restore columns (if needed):
-- DROP TABLE attendance_scan_log;
-- CREATE TABLE attendance_scan_log AS SELECT * FROM _backup_scan_log_before_column_cleanup;
-- (Then recreate indexes and constraints)
-- ============================================
