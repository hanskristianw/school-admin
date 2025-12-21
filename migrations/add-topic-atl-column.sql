-- Add topic_atl column to topic table
-- This column stores ATL (Approaches to Learning) skills text for IB MYP

-- Add the column (stores text description of ATL skills)
ALTER TABLE topic 
ADD COLUMN IF NOT EXISTS topic_atl TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN topic.topic_atl IS 'ATL (Approaches to Learning) skills text for this unit/topic. AI will suggest based on grade level.';

-- Verify the addition
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'topic'
  AND column_name = 'topic_atl';
