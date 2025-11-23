-- =====================================================
-- DROP OLD NILAI TABLE
-- =====================================================
-- Purpose: Remove old grading system table that has been replaced
--          by assessment_grades and assessment_grade_strands
-- 
-- The new system provides:
-- - Per-strand grading with rubrics
-- - Linked to approved assessments
-- - Multiple calculation methods (highest, average, median, mode)
-- - Full IB MYP compliance

-- Drop the old nilai table
DROP TABLE IF EXISTS nilai CASCADE;

-- Remove any references or indexes
-- (CASCADE will handle any foreign keys)

-- Note: No data migration needed as confirmed by user
-- All future grading will use the new assessment-based system

COMMENT ON DATABASE current_database() IS 
'Old nilai table removed. Use assessment_grades and assessment_grade_strands for all grading.';
