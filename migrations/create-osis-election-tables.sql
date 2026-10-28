-- Migration: OSIS Election & Live Quick Count Tables
-- Description: Supports Student Council Elections, candidate pairs, anonymous voting, and live quick counts.

CREATE TABLE IF NOT EXISTS osis_elections (
  id SERIAL PRIMARY KEY,
  year_id INTEGER REFERENCES year(year_id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  target_dpt INTEGER DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'draft', -- 'draft', 'active', 'closed'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS osis_candidates (
  id SERIAL PRIMARY KEY,
  election_id INTEGER NOT NULL REFERENCES osis_elections(id) ON DELETE CASCADE,
  candidate_number INTEGER NOT NULL,
  leader_name VARCHAR(150) NOT NULL,
  vice_name VARCHAR(150),
  photo_url TEXT,
  vision TEXT,
  mission TEXT,
  slogan VARCHAR(255),
  color VARCHAR(50) DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS osis_votes (
  id SERIAL PRIMARY KEY,
  election_id INTEGER NOT NULL REFERENCES osis_elections(id) ON DELETE CASCADE,
  candidate_id INTEGER NOT NULL REFERENCES osis_candidates(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_osis_candidates_election ON osis_candidates(election_id);
CREATE INDEX IF NOT EXISTS idx_osis_votes_election ON osis_votes(election_id);
CREATE INDEX IF NOT EXISTS idx_osis_votes_candidate ON osis_votes(candidate_id);
