-- =====================================================
-- ADD MYP YEAR TO ASSESSMENT TABLE
-- =====================================================
-- Purpose: Allow teachers to specify MYP year level (1-5) when creating assessment
--          This is more accurate than deriving from grade, especially for:
--          - Grade 9 Semester 2 = MYP Year 3 (not Year 4)
--          - Different semester/term transitions

-- Add assessment_myp_year column to assessment table
ALTER TABLE assessment
ADD COLUMN IF NOT EXISTS assessment_myp_year INT;

-- Add check constraint to ensure valid MYP year levels (1, 3, 5 only - IB standard)
ALTER TABLE assessment
ADD CONSTRAINT assessment_myp_year_check 
CHECK (assessment_myp_year IS NULL OR assessment_myp_year IN (1, 3, 5));

-- Add comment
COMMENT ON COLUMN assessment.assessment_myp_year IS 
'MYP Year Level (1, 3, or 5 - IB Standard) for this assessment. Required for accurate strand/rubric selection. Set by teacher when creating assessment.';

-- Set default MYP Year 1 for all existing assessments that don't have it set
UPDATE assessment
SET assessment_myp_year = 1
WHERE assessment_myp_year IS NULL;

-- Verification query
SELECT 
    assessment_id,
    assessment_nama,
    assessment_myp_year,
    assessment_tanggal
FROM assessment
ORDER BY assessment_id DESC
LIMIT 10;
