-- Make assessment_tanggal nullable
-- Assessment date will be set later before giving to students

ALTER TABLE assessment 
ALTER COLUMN assessment_tanggal DROP NOT NULL;

-- Comment
COMMENT ON COLUMN assessment.assessment_tanggal IS 'Assessment date - can be set later when ready to give to students';

-- Verify the change
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'assessment' 
  AND column_name = 'assessment_tanggal';
