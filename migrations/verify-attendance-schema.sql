-- ============================================
-- VERIFY ATTENDANCE SCHEMA
-- ============================================
-- This script checks the current state of attendance tables
-- after running clean-slate-attendance.sql
-- ============================================

-- Check if tables exist
SELECT 
  '📋 Table Existence Check' as section,
  table_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'absen') 
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as absen_table,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_scan_log') 
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as scan_log_table,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_session') 
    THEN '⚠️ STILL EXISTS (should be removed)'
    ELSE '✅ REMOVED'
  END as session_table
FROM (SELECT 1) t;

-- Check absen table columns
SELECT 
  '📊 ABSEN Table Columns' as section,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'absen'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check attendance_scan_log columns
SELECT 
  '📊 ATTENDANCE_SCAN_LOG Table Columns' as section,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'attendance_scan_log'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check specific problematic columns
SELECT 
  '🔍 Session Column Check' as section,
  'absen.absen_session_id' as column_path,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'absen' 
        AND column_name = 'absen_session_id'
    ) 
    THEN '⚠️ STILL EXISTS (should be removed)'
    ELSE '✅ REMOVED'
  END as status
UNION ALL
SELECT 
  '🔍 Session Column Check',
  'attendance_scan_log.session_id',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'attendance_scan_log' 
        AND column_name = 'session_id'
    ) 
    THEN '⚠️ STILL EXISTS (nullable is OK, can be removed later)'
    ELSE '✅ REMOVED'
  END
UNION ALL
SELECT 
  '🔍 Session Column Check',
  'attendance_scan_log.token_slot',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'attendance_scan_log' 
        AND column_name = 'token_slot'
    ) 
    THEN '⚠️ STILL EXISTS (can be removed)'
    ELSE '✅ REMOVED'
  END;

-- Check constraints
SELECT 
  '🔒 Constraints' as section,
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_name IN ('absen', 'attendance_scan_log', 'attendance_session')
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_type;

-- Check indexes
SELECT 
  '📑 Indexes' as section,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('absen', 'attendance_scan_log')
  AND schemaname = 'public'
ORDER BY tablename, indexname;

-- Check data counts
SELECT 
  '📈 Data Counts' as section,
  'absen' as table_name,
  COUNT(*) as record_count,
  COUNT(CASE WHEN absen_method = 'qr_daily' THEN 1 END) as qr_daily_count,
  COUNT(CASE WHEN absen_method = 'manual' THEN 1 END) as manual_count
FROM absen
UNION ALL
SELECT 
  '📈 Data Counts',
  'attendance_scan_log',
  COUNT(*),
  COUNT(CASE WHEN result = 'ok' THEN 1 END),
  COUNT(CASE WHEN flagged_reason IS NOT NULL THEN 1 END)
FROM attendance_scan_log;

-- Check backup tables
SELECT 
  '💾 Backup Tables' as section,
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_name LIKE '_backup_%'
  AND table_schema = 'public'
ORDER BY table_name;

-- Final summary
SELECT 
  '✅ Schema Verification Summary' as title,
  json_build_object(
    'absen_table_exists', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'absen'),
    'scan_log_exists', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_scan_log'),
    'session_table_removed', NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_session'),
    'absen_session_column_removed', NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'absen' AND column_name = 'absen_session_id'
    ),
    'scan_log_session_column_status', (
      SELECT 
        CASE 
          WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_scan_log' AND column_name = 'session_id')
          THEN 'exists_nullable'
          ELSE 'removed'
        END
    ),
    'ready_for_daily_qr', (
      EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'absen')
      AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_scan_log')
      AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'absen' AND column_name = 'absen_session_id')
    )
  ) as status;
