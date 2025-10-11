-- ============================================
-- ADD absen_id LINK TO attendance_scan_log
-- ============================================
-- This migration adds a foreign key relationship between
-- attendance_scan_log and absen table, so we can track
-- which scan resulted in which attendance record.
-- ============================================

-- ============================================
-- STEP 1: ADD COLUMN
-- ============================================

-- Add absen_id column (nullable - old records won't have it)
ALTER TABLE attendance_scan_log 
  ADD COLUMN IF NOT EXISTS absen_id INT8;

-- ============================================
-- STEP 2: ADD FOREIGN KEY
-- ============================================

-- Drop constraint if it exists (to make script rerunnable)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_scan_log_absen' 
      AND table_name = 'attendance_scan_log'
  ) THEN
    ALTER TABLE attendance_scan_log DROP CONSTRAINT fk_scan_log_absen;
  END IF;
END $$;

-- Add foreign key constraint to absen table
ALTER TABLE attendance_scan_log 
  ADD CONSTRAINT fk_scan_log_absen 
  FOREIGN KEY (absen_id) 
  REFERENCES absen(absen_id) 
  ON DELETE SET NULL;

-- ============================================
-- STEP 3: ADD INDEX FOR PERFORMANCE
-- ============================================

-- Index for querying by absen_id
CREATE INDEX IF NOT EXISTS idx_scan_log_absen_id 
  ON attendance_scan_log(absen_id);

-- Composite index for common queries (student + result)
CREATE INDEX IF NOT EXISTS idx_scan_log_student_result 
  ON attendance_scan_log(detail_siswa_id, result, created_at DESC);

-- ============================================
-- STEP 4: VERIFY SCHEMA
-- ============================================

-- Check column was added
SELECT 
  '✅ Column Added' as status,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'attendance_scan_log'
  AND column_name = 'absen_id';

-- Check foreign key was added
SELECT 
  '✅ Foreign Key Added' as status,
  constraint_name,
  table_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'attendance_scan_log'
  AND constraint_name = 'fk_scan_log_absen';

-- Check indexes were added
SELECT 
  '✅ Indexes Added' as status,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'attendance_scan_log'
  AND indexname IN ('idx_scan_log_absen_id', 'idx_scan_log_student_result')
ORDER BY indexname;

-- ============================================
-- STEP 5: VERIFY RELATIONSHIP
-- ============================================

-- Test query: Find scan logs with their attendance records
SELECT 
  'Test Query' as section,
  COUNT(*) as total_scan_logs,
  COUNT(asl.absen_id) as linked_to_absen,
  COUNT(a.absen_id) as valid_links,
  COUNT(asl.log_id) - COUNT(asl.absen_id) as unlinked_logs
FROM attendance_scan_log asl
LEFT JOIN absen a ON asl.absen_id = a.absen_id;

-- ============================================
-- STEP 6: OPTIONAL - BACKFILL OLD DATA
-- ============================================

-- This tries to match old scan logs to absen records
-- based on detail_siswa_id, date, and time proximity
-- UNCOMMENT if you want to link historical data:

/*
UPDATE attendance_scan_log asl
SET absen_id = a.absen_id
FROM absen a
WHERE asl.absen_id IS NULL
  AND asl.result = 'ok'
  AND asl.detail_siswa_id = a.absen_detail_siswa_id
  AND DATE(asl.created_at AT TIME ZONE 'Asia/Jakarta') = a.absen_date
  AND ABS(EXTRACT(EPOCH FROM (
    asl.created_at AT TIME ZONE 'Asia/Jakarta' - 
    (a.absen_date + a.absen_time)::TIMESTAMP
  ))) < 60; -- Within 60 seconds

SELECT 
  '✅ Backfill Complete' as status,
  COUNT(*) as records_linked
FROM attendance_scan_log
WHERE absen_id IS NOT NULL;
*/

-- ============================================
-- SUMMARY
-- ============================================

SELECT 
  '🎉 MIGRATION COMPLETE!' as message,
  json_build_object(
    'absen_id_column_added', EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'attendance_scan_log' 
        AND column_name = 'absen_id'
    ),
    'foreign_key_added', EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_name = 'attendance_scan_log' 
        AND constraint_name = 'fk_scan_log_absen'
    ),
    'indexes_added', (
      SELECT COUNT(*) 
      FROM pg_indexes 
      WHERE tablename = 'attendance_scan_log' 
        AND indexname IN ('idx_scan_log_absen_id', 'idx_scan_log_student_result')
    ),
    'ready_to_use', true
  ) as result;

-- ============================================
-- USAGE EXAMPLES
-- ============================================

-- Find attendance record from scan log
-- SELECT a.* 
-- FROM attendance_scan_log asl
-- JOIN absen a ON asl.absen_id = a.absen_id
-- WHERE asl.log_id = 123;

-- Find all scans for an attendance record
-- SELECT asl.* 
-- FROM attendance_scan_log asl
-- WHERE asl.absen_id = 456;

-- Find successful scans that created attendance
-- SELECT 
--   asl.log_id,
--   asl.result,
--   asl.flagged_reason,
--   a.absen_id,
--   a.absen_date,
--   a.absen_time,
--   a.absen_method
-- FROM attendance_scan_log asl
-- LEFT JOIN absen a ON asl.absen_id = a.absen_id
-- WHERE asl.result = 'ok'
-- ORDER BY asl.created_at DESC
-- LIMIT 10;
