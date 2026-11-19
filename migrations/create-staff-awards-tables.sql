-- Migration: Teachers & Staff Recognition / Staff Awards Tables
-- Description: Supports yearly Staff Awards events, award categories, strict 1-user-1-vote participation tracking (unique per event+voter), and anonymous ballot choices.

CREATE TABLE IF NOT EXISTS staff_award_events (
  id SERIAL PRIMARY KEY,
  year_id INTEGER REFERENCES year(year_id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'active', -- 'draft', 'active', 'closed'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_award_categories (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES staff_award_events(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 1,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  icon VARCHAR(50) NOT NULL DEFAULT 'award',
  color_gradient VARCHAR(100) NOT NULL DEFAULT 'from-amber-400 to-orange-500',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Participation ledger: enforces strictly 1 vote submission per user per event
CREATE TABLE IF NOT EXISTS staff_award_submissions (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES staff_award_events(id) ON DELETE CASCADE,
  voter_user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, voter_user_id)
);

-- Anonymous ballot selections: intentionally omits voter_user_id so individual choices remain secret
CREATE TABLE IF NOT EXISTS staff_award_votes (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES staff_award_events(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES staff_award_categories(id) ON DELETE CASCADE,
  nominee_user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_award_categories_event ON staff_award_categories(event_id);
CREATE INDEX IF NOT EXISTS idx_staff_award_submissions_event ON staff_award_submissions(event_id);
CREATE INDEX IF NOT EXISTS idx_staff_award_votes_event ON staff_award_votes(event_id);
CREATE INDEX IF NOT EXISTS idx_staff_award_votes_category ON staff_award_votes(category_id);
CREATE INDEX IF NOT EXISTS idx_staff_award_votes_nominee ON staff_award_votes(nominee_user_id);
