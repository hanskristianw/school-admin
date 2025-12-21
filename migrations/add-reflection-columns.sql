-- Add reflection columns to topic table
-- Prior reflection: Before teaching the unit
-- After reflection: After teaching the unit

ALTER TABLE topic 
ADD COLUMN IF NOT EXISTS topic_reflection_prior TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS topic_reflection_after TEXT DEFAULT NULL;

-- Comments
COMMENT ON COLUMN topic.topic_reflection_prior IS 'Reflection before teaching the unit - planning and expectations';
COMMENT ON COLUMN topic.topic_reflection_after IS 'Reflection after teaching the unit - outcomes and improvements';

-- Verify the columns
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'topic' 
  AND column_name IN ('topic_reflection_prior', 'topic_reflection_after')
ORDER BY column_name;
