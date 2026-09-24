-- =====================================================
-- Athletic Day Scoring & Live Board Migration
-- =====================================================

-- 1. Table: athletic_events
CREATE TABLE IF NOT EXISTS athletic_events (
  id SERIAL PRIMARY KEY,
  year_id INTEGER NOT NULL REFERENCES year(year_id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(50),
  banner_color VARCHAR(50) DEFAULT '#2563eb',
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table: athletic_teams
CREATE TABLE IF NOT EXISTS athletic_teams (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES athletic_events(id) ON DELETE CASCADE,
  year_id INTEGER NOT NULL REFERENCES year(year_id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(50) DEFAULT '#3b82f6',
  secondary_color VARCHAR(50) DEFAULT '#1d4ed8',
  icon VARCHAR(50) DEFAULT 'shield',
  motto VARCHAR(255),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Table: athletic_scores
CREATE TABLE IF NOT EXISTS athletic_scores (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES athletic_teams(id) ON DELETE CASCADE,
  event_id INTEGER NOT NULL REFERENCES athletic_events(id) ON DELETE CASCADE,
  activity_name VARCHAR(150) NOT NULL,
  points INTEGER NOT NULL,
  notes TEXT,
  recorded_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_athletic_events_year ON athletic_events(year_id);
CREATE INDEX IF NOT EXISTS idx_athletic_teams_event ON athletic_teams(event_id);
CREATE INDEX IF NOT EXISTS idx_athletic_teams_year ON athletic_teams(year_id);
CREATE INDEX IF NOT EXISTS idx_athletic_scores_team ON athletic_scores(team_id);
CREATE INDEX IF NOT EXISTS idx_athletic_scores_event ON athletic_scores(event_id);

-- Enable RLS
ALTER TABLE athletic_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletic_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletic_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow read for all
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'athletic_events' AND policyname = 'Public read athletic_events') THEN
    CREATE POLICY "Public read athletic_events" ON athletic_events FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'athletic_teams' AND policyname = 'Public read athletic_teams') THEN
    CREATE POLICY "Public read athletic_teams" ON athletic_teams FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'athletic_scores' AND policyname = 'Public read athletic_scores') THEN
    CREATE POLICY "Public read athletic_scores" ON athletic_scores FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'athletic_events' AND policyname = 'Allow write athletic_events') THEN
    CREATE POLICY "Allow write athletic_events" ON athletic_events FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'athletic_teams' AND policyname = 'Allow write athletic_teams') THEN
    CREATE POLICY "Allow write athletic_teams" ON athletic_teams FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'athletic_scores' AND policyname = 'Allow write athletic_scores') THEN
    CREATE POLICY "Allow write athletic_scores" ON athletic_scores FOR ALL USING (true);
  END IF;
END $$;

-- 4. Seed default events & teams for current academic year (e.g. 2026/2027)
DO $$
DECLARE
  v_year_id INTEGER;
  v_pyp_event_id INTEGER;
  v_myp_event_id INTEGER;
  v_dp_event_id INTEGER;
BEGIN
  -- Get active/current academic year
  SELECT year_id INTO v_year_id FROM year WHERE year_name = '2026/2027' LIMIT 1;
  IF v_year_id IS NULL THEN
    SELECT year_id INTO v_year_id FROM year ORDER BY year_id DESC LIMIT 1;
  END IF;

  IF v_year_id IS NOT NULL THEN
    -- 1) Event PYP
    IF NOT EXISTS (SELECT 1 FROM athletic_events WHERE year_id = v_year_id AND code = 'PYP') THEN
      INSERT INTO athletic_events (year_id, name, code, banner_color, description)
      VALUES (v_year_id, 'PYP Athletic Day', 'PYP', '#2563eb', 'Primary Years Programme Sports Championship')
      RETURNING id INTO v_pyp_event_id;

      -- PYP 4 Teams
      INSERT INTO athletic_teams (event_id, year_id, name, color, secondary_color, icon, sort_order) VALUES
        (v_pyp_event_id, v_year_id, 'Red Dragon', '#ef4444', '#b91c1c', 'dragon', 1),
        (v_pyp_event_id, v_year_id, 'Blue Shark', '#3b82f6', '#1d4ed8', 'fish', 2),
        (v_pyp_event_id, v_year_id, 'Green Eagle', '#10b981', '#047857', 'feather', 3),
        (v_pyp_event_id, v_year_id, 'Yellow Tiger', '#f59e0b', '#b45309', 'paw', 4);
    END IF;

    -- 2) Event MYP
    IF NOT EXISTS (SELECT 1 FROM athletic_events WHERE year_id = v_year_id AND code = 'MYP') THEN
      INSERT INTO athletic_events (year_id, name, code, banner_color, description)
      VALUES (v_year_id, 'MYP Athletic Day', 'MYP', '#7c3aed', 'Middle Years Programme Sports Championship')
      RETURNING id INTO v_myp_event_id;

      -- MYP 5 Teams
      INSERT INTO athletic_teams (event_id, year_id, name, color, secondary_color, icon, sort_order) VALUES
        (v_myp_event_id, v_year_id, 'Garuda', '#dc2626', '#991b1b', 'feather', 1),
        (v_myp_event_id, v_year_id, 'Falcon', '#2563eb', '#1e40af', 'bolt', 2),
        (v_myp_event_id, v_year_id, 'Phoenix', '#ea580c', '#c2410c', 'fire', 3),
        (v_myp_event_id, v_year_id, 'Cobra', '#059669', '#065f46', 'shield', 4),
        (v_myp_event_id, v_year_id, 'Wolf', '#7c3aed', '#5b21b6', 'paw', 5);
    END IF;

    -- 3) Event DP
    IF NOT EXISTS (SELECT 1 FROM athletic_events WHERE year_id = v_year_id AND code = 'DP') THEN
      INSERT INTO athletic_events (year_id, name, code, banner_color, description)
      VALUES (v_year_id, 'DP Athletic Day', 'DP', '#0d9488', 'Diploma Programme Sports Championship')
      RETURNING id INTO v_dp_event_id;

      -- DP 4 Teams
      INSERT INTO athletic_teams (event_id, year_id, name, color, secondary_color, icon, sort_order) VALUES
        (v_dp_event_id, v_year_id, 'Atlas', '#0284c7', '#0369a1', 'globe', 1),
        (v_dp_event_id, v_year_id, 'Pegasus', '#9333ea', '#6b21a8', 'horse', 2),
        (v_dp_event_id, v_year_id, 'Titan', '#d97706', '#92400e', 'mountain', 3),
        (v_dp_event_id, v_year_id, 'Orion', '#4f46e5', '#3730a3', 'star', 4);
    END IF;

    RAISE NOTICE 'Athletic Day seeded successfully for year %', v_year_id;
  END IF;
END $$;
