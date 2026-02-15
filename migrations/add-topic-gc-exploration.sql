-- Add gc_exploration column to topic table
-- This stores the selected possible explorations for the chosen Global Context
ALTER TABLE topic
ADD COLUMN IF NOT EXISTS topic_gc_exploration TEXT;

COMMENT ON COLUMN topic.topic_gc_exploration IS 'Selected possible explorations from IB MYP Global Contexts (comma-separated)';
