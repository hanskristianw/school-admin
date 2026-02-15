-- Add conceptual_understanding column to topic table
-- This stores the unit-level conceptual understanding (separate from assessment-level)
ALTER TABLE topic
ADD COLUMN IF NOT EXISTS topic_conceptual_understanding TEXT;

COMMENT ON COLUMN topic.topic_conceptual_understanding IS 'Unit-level conceptual understanding that students will develop through this unit';
