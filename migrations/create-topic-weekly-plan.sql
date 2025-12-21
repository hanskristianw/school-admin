-- Create topic_weekly_plan table
-- Simplified: just store weekly plan text for each week of a topic

CREATE TABLE IF NOT EXISTS topic_weekly_plan (
  id SERIAL PRIMARY KEY,
  topic_id INTEGER NOT NULL REFERENCES topic(topic_id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL CHECK (week_number > 0),
  week_objectives TEXT, -- Learning objectives untuk minggu ini
  week_activities TEXT, -- Learning activities untuk minggu ini
  week_resources TEXT, -- Resources yang dibutuhkan minggu ini
  week_reflection TEXT, -- During teaching reflection untuk minggu ini
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(topic_id, week_number)
);

-- Index for faster lookups
CREATE INDEX idx_topic_weekly_plan_topic ON topic_weekly_plan(topic_id);

-- Comments
COMMENT ON TABLE topic_weekly_plan IS 'Weekly planning breakdown for each topic/unit';
COMMENT ON COLUMN topic_weekly_plan.topic_id IS 'Reference to topic table';
COMMENT ON COLUMN topic_weekly_plan.week_number IS 'Week number (1, 2, 3, ...)';
COMMENT ON COLUMN topic_weekly_plan.week_objectives IS 'Learning objectives for this week';
COMMENT ON COLUMN topic_weekly_plan.week_activities IS 'Learning activities for this week';
COMMENT ON COLUMN topic_weekly_plan.week_resources IS 'Resources needed for this week';
COMMENT ON COLUMN topic_weekly_plan.week_reflection IS 'Reflection during teaching for this week';

-- Function to auto-generate weeks when topic is created/updated
CREATE OR REPLACE FUNCTION generate_topic_weeks()
RETURNS TRIGGER AS $$
BEGIN
  -- When topic_duration is set/changed, ensure weeks exist
  IF NEW.topic_duration IS NOT NULL AND NEW.topic_duration > 0 THEN
    -- Insert missing weeks (ignore if already exists)
    INSERT INTO topic_weekly_plan (topic_id, week_number)
    SELECT NEW.topic_id, generate_series(1, NEW.topic_duration::INTEGER)
    ON CONFLICT (topic_id, week_number) DO NOTHING;
    
    -- Delete weeks beyond new duration
    DELETE FROM topic_weekly_plan 
    WHERE topic_id = NEW.topic_id 
      AND week_number > NEW.topic_duration::INTEGER;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate weeks
DROP TRIGGER IF EXISTS trigger_generate_topic_weeks ON topic;
CREATE TRIGGER trigger_generate_topic_weeks
  AFTER INSERT OR UPDATE OF topic_duration ON topic
  FOR EACH ROW
  EXECUTE FUNCTION generate_topic_weeks();

-- Verify the table
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'topic_weekly_plan'
ORDER BY ordinal_position;
