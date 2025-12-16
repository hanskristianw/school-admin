-- Migration: Add Task Specific Clarification (TSC) column to assessment table
-- Date: December 14, 2025
-- Description: Adds JSONB column to store TSC data per strand and band level

-- Add the assessment_tsc column
ALTER TABLE assessment 
ADD COLUMN IF NOT EXISTS assessment_tsc JSONB DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN assessment.assessment_tsc IS 'Task Specific Clarification stored as JSON. Structure: { "strand_id": { "band_label": "tsc_content" } }. Example: { "123": { "7-8": "The student demonstrates...", "5-6": "..." } }';

-- Example of the JSON structure:
-- {
--   "123": {        -- strand_id as string key
--     "7-8": "The student demonstrates excellent understanding...",
--     "5-6": "The student shows substantial understanding...",
--     "3-4": "The student adequately demonstrates...",
--     "1-2": "The student attempts to demonstrate...",
--     "0": "The student does not reach a standard..."
--   },
--   "124": {        -- another strand_id
--     "7-8": "...",
--     "5-6": "...",
--     ...
--   }
-- }

-- Verify the column was added
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'assessment' AND column_name = 'assessment_tsc';
