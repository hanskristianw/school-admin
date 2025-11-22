-- Migration: Add Junction Table for Assessment-Criteria Many-to-Many Relationship
-- Date: 2025-11-22
-- Description: Allows multiple criteria per assessment

-- Step 1: Create junction table
CREATE TABLE IF NOT EXISTS assessment_criteria (
  id SERIAL PRIMARY KEY,
  assessment_id INTEGER NOT NULL REFERENCES assessment(assessment_id) ON DELETE CASCADE,
  criterion_id INTEGER NOT NULL REFERENCES criteria(criterion_id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(assessment_id, criterion_id)
);

-- Step 2: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_assessment_criteria_assessment ON assessment_criteria(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_criteria_criterion ON assessment_criteria(criterion_id);

-- Step 3: Migrate existing data (if assessment_criterion_id column exists and has data)
-- This will copy old single criterion relationships to the new junction table
INSERT INTO assessment_criteria (assessment_id, criterion_id)
SELECT assessment_id, assessment_criterion_id
FROM assessment
WHERE assessment_criterion_id IS NOT NULL
ON CONFLICT (assessment_id, criterion_id) DO NOTHING;

-- Step 4: Remove old column (optional - uncomment after verifying migration)
-- ALTER TABLE assessment DROP COLUMN IF EXISTS assessment_criterion_id;

-- Verification queries:
-- SELECT COUNT(*) FROM assessment_criteria;
-- SELECT a.assessment_nama, c.code, c.name
-- FROM assessment a
-- JOIN assessment_criteria ac ON a.assessment_id = ac.assessment_id
-- JOIN criteria c ON ac.criterion_id = c.criterion_id;
