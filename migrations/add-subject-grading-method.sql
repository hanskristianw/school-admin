-- =====================================================
-- ADD GRADING METHOD TO SUBJECT
-- =====================================================
-- Purpose: Allow teachers to choose how criterion grades are calculated from strand grades
-- Options: 'highest' (best-fit), 'average', 'median', 'mode'

-- Add grading_method column to subject table
ALTER TABLE subject 
ADD COLUMN IF NOT EXISTS grading_method VARCHAR(20) DEFAULT 'highest' 
CHECK (grading_method IN ('highest', 'average', 'median', 'mode'));

-- Add comment to explain the column
COMMENT ON COLUMN subject.grading_method IS 
'Method to calculate criterion grade from strand grades:
- highest: Take the highest strand grade (IB best-fit approach) [DEFAULT]
- average: Calculate mean of all strand grades (rounded)
- median: Take the middle value of sorted strand grades
- mode: Take the most frequent strand grade';

-- Update existing subjects to use default 'highest' method
UPDATE subject 
SET grading_method = 'highest' 
WHERE grading_method IS NULL;
