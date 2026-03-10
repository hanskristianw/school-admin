-- Add custom_grade_boundaries column to subject table
-- This allows subjects like Bible or Civics to define their own grade boundary thresholds
-- instead of using the default IB MYP proportional formula.
--
-- Format: JSON array of 6 numbers representing upper bounds for grades 1-6.
-- Score <= b[0] → grade 1, <= b[1] → grade 2, ..., > b[5] → grade 7
--
-- Example: Bible (3 criteria, max 24):  [4, 7, 11, 14, 17, 20]
-- Example: Civics (2 criteria, max 16): [2, 4, 7, 9, 11, 13]
-- NULL = use default IB proportional formula

ALTER TABLE subject
  ADD COLUMN IF NOT EXISTS custom_grade_boundaries JSONB DEFAULT NULL;
