-- Disable RLS for attendance_scan_log table
-- Run this in Supabase SQL Editor if RLS is blocking reads

-- Check current RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'attendance_scan_log';

-- Option 1: Completely disable RLS (easiest for development)
ALTER TABLE attendance_scan_log DISABLE ROW LEVEL SECURITY;

-- Option 2: Keep RLS enabled but add permissive read policy for all
-- (Better for production - allows reads but RLS still active for other operations)
/*
ALTER TABLE attendance_scan_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access"
  ON attendance_scan_log
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow anon read access"
  ON attendance_scan_log
  FOR SELECT
  TO anon
  USING (true);
*/

-- Verify RLS is disabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'attendance_scan_log';

-- Test query (should return data if RLS is disabled)
SELECT COUNT(*) as total_rows FROM attendance_scan_log;
