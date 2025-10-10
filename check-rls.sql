-- Check RLS status and policies for attendance_scan_log
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'attendance_scan_log';

-- Show all policies on attendance_scan_log
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'attendance_scan_log';

-- Count total rows (bypass RLS with admin)
SELECT COUNT(*) as total_rows FROM attendance_scan_log;

-- Show sample data (last 5 records)
SELECT 
  log_id,
  result,
  detail_siswa_id,
  device_hash_client,
  flagged_reason,
  created_at
FROM attendance_scan_log
ORDER BY created_at DESC
LIMIT 5;
