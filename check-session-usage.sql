-- Check Session System Usage
-- Run this query to determine if session QR system is still being used

-- ============================================
-- 1. CHECK ATTENDANCE_SESSION TABLE
-- ============================================

-- Count total sessions
SELECT 
  'Total Sessions' as metric,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 0 THEN '🔴 NOT USED - Safe to remove'
    WHEN COUNT(*) < 10 THEN '⚠️ RARELY USED - Consider deprecating'
    ELSE '✅ ACTIVELY USED - Keep system'
  END as recommendation
FROM attendance_session;

-- Recent sessions (last 30 days)
SELECT 
  'Sessions (Last 30 Days)' as metric,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 0 THEN '🔴 NO RECENT USAGE'
    ELSE '✅ RECENTLY USED'
  END as status
FROM attendance_session
WHERE start_time >= CURRENT_DATE - INTERVAL '30 days';

-- Session details (if any exist)
SELECT 
  session_id,
  created_by_user_id,
  scope_type,
  session_date,
  status,
  start_time,
  end_time
FROM attendance_session
ORDER BY start_time DESC
LIMIT 10;

-- ============================================
-- 2. CHECK ATTENDANCE_SCAN_LOG
-- ============================================

-- Scans with session_id (session QR)
SELECT 
  'Session QR Scans' as metric,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM attendance_scan_log), 0), 2) as percentage,
  CASE 
    WHEN COUNT(*) = 0 THEN '🔴 ALL SCANS USE DAILY QR'
    WHEN COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM attendance_scan_log), 0) < 10 THEN '⚠️ MOSTLY DAILY QR'
    ELSE '✅ SESSION QR STILL USED'
  END as recommendation
FROM attendance_scan_log
WHERE session_id IS NOT NULL;

-- Scans without session_id (daily QR)
SELECT 
  'Daily QR Scans' as metric,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM attendance_scan_log), 0), 2) as percentage
FROM attendance_scan_log
WHERE session_id IS NULL;

-- Recent scan breakdown (last 7 days)
SELECT 
  CASE 
    WHEN session_id IS NOT NULL THEN 'Session QR'
    ELSE 'Daily QR'
  END as qr_type,
  COUNT(*) as scans,
  COUNT(DISTINCT detail_siswa_id) as unique_students,
  MIN(created_at) as first_scan,
  MAX(created_at) as last_scan
FROM attendance_scan_log
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY CASE WHEN session_id IS NOT NULL THEN 'Session QR' ELSE 'Daily QR' END
ORDER BY scans DESC;

-- ============================================
-- 3. CHECK ABSEN TABLE
-- ============================================

-- Absen with session_id
SELECT 
  'Absen with Session' as metric,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM absen), 0), 2) as percentage,
  CASE 
    WHEN COUNT(*) = 0 THEN '🔴 NO SESSION ABSEN'
    ELSE '✅ HAS SESSION ABSEN'
  END as status
FROM absen
WHERE absen_session_id IS NOT NULL;

-- Absen by method
SELECT 
  absen_method,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM absen), 0), 2) as percentage
FROM absen
GROUP BY absen_method
ORDER BY count DESC;

-- Recent absen breakdown (last 30 days)
SELECT 
  absen_method,
  COUNT(*) as total,
  COUNT(DISTINCT absen_detail_siswa_id) as unique_students,
  COUNT(DISTINCT absen_date) as unique_dates
FROM absen
WHERE absen_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY absen_method
ORDER BY total DESC;

-- ============================================
-- 4. STORAGE ANALYSIS
-- ============================================

-- Table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables
WHERE tablename IN ('attendance_session', 'attendance_scan_log', 'absen')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================
-- 5. FINAL RECOMMENDATION
-- ============================================

WITH usage_stats AS (
  SELECT 
    (SELECT COUNT(*) FROM attendance_session) as total_sessions,
    (SELECT COUNT(*) FROM attendance_session WHERE start_time >= CURRENT_DATE - INTERVAL '30 days') as recent_sessions,
    (SELECT COUNT(*) FROM attendance_scan_log WHERE session_id IS NOT NULL) as session_scans,
    (SELECT COUNT(*) FROM attendance_scan_log) as total_scans,
    (SELECT COUNT(*) FROM absen WHERE absen_session_id IS NOT NULL) as session_absen,
    (SELECT COUNT(*) FROM absen) as total_absen
)
SELECT 
  '🎯 FINAL RECOMMENDATION' as title,
  CASE
    -- Scenario 1: Session system completely unused
    WHEN total_sessions = 0 AND session_scans = 0 AND session_absen = 0 THEN
      '🔴 REMOVE PHASE 3: Session system is NOT used at all. Safe to remove attendance_session table and related columns after backup.'
    
    -- Scenario 2: Session system not used recently
    WHEN recent_sessions = 0 AND session_scans * 100.0 / NULLIF(total_scans, 0) < 1 THEN
      '⚠️ DEPRECATE PHASE 2: Session system rarely used (<1% of scans). Consider deprecating and migrating to daily QR.'
    
    -- Scenario 3: Hybrid usage
    WHEN session_scans * 100.0 / NULLIF(total_scans, 0) BETWEEN 1 AND 20 THEN
      '⚠️ HYBRID SYSTEM: ' || ROUND(session_scans * 100.0 / NULLIF(total_scans, 0), 1) || '% of scans use session QR. Evaluate if session QR features are worth maintaining.'
    
    -- Scenario 4: Active session usage
    WHEN session_scans * 100.0 / NULLIF(total_scans, 0) > 20 THEN
      '✅ KEEP BOTH SYSTEMS: ' || ROUND(session_scans * 100.0 / NULLIF(total_scans, 0), 1) || '% of scans use session QR. Both systems are actively used.'
    
    ELSE
      '❓ INSUFFICIENT DATA: Unable to determine usage pattern.'
  END as recommendation,
  
  -- Stats summary
  json_build_object(
    'total_sessions', total_sessions,
    'recent_sessions_30d', recent_sessions,
    'session_scans', session_scans,
    'session_scan_percentage', ROUND(session_scans * 100.0 / NULLIF(total_scans, 0), 2),
    'daily_scans', total_scans - session_scans,
    'daily_scan_percentage', ROUND((total_scans - session_scans) * 100.0 / NULLIF(total_scans, 0), 2),
    'session_absen', session_absen,
    'total_absen', total_absen
  ) as statistics
FROM usage_stats;

-- ============================================
-- 6. MIGRATION READINESS CHECK
-- ============================================

-- Check if safe to remove session system
SELECT 
  '🔍 Migration Safety Check' as title,
  CASE
    WHEN (SELECT COUNT(*) FROM attendance_session WHERE status = 'open') > 0 THEN
      '❌ NOT SAFE: There are OPEN sessions. Close or migrate them first.'
    WHEN (SELECT COUNT(*) FROM attendance_scan_log WHERE session_id IS NOT NULL AND created_at >= CURRENT_DATE - INTERVAL '7 days') > 0 THEN
      '❌ NOT SAFE: Session QR scans detected in last 7 days. System still in use.'
    WHEN (SELECT COUNT(*) FROM attendance_session) = 0 THEN
      '✅ SAFE: No sessions exist. Can proceed with cleanup.'
    ELSE
      '⚠️ PROCEED WITH CAUTION: Old sessions exist but no recent activity. Backup recommended before removal.'
  END as safety_status,
  
  json_build_object(
    'open_sessions', (SELECT COUNT(*) FROM attendance_session WHERE status = 'open'),
    'recent_session_scans_7d', (SELECT COUNT(*) FROM attendance_scan_log WHERE session_id IS NOT NULL AND created_at >= CURRENT_DATE - INTERVAL '7 days'),
    'total_sessions', (SELECT COUNT(*) FROM attendance_session),
    'oldest_session', (SELECT MIN(start_time) FROM attendance_session),
    'newest_session', (SELECT MAX(start_time) FROM attendance_session)
  ) as details;
