-- ============================================================
-- Migration: Sistem Pelaporan Bug & Feature Request (Feedback & Roadmap)
-- ============================================================

CREATE TABLE IF NOT EXISTS system_feedback (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  type            VARCHAR(50) NOT NULL DEFAULT 'bug', -- 'bug' | 'feature_request'
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  page_url        TEXT,
  priority        VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'low' | 'medium' | 'high' | 'critical'
  status          VARCHAR(50) NOT NULL DEFAULT 'submitted', -- 'submitted' | 'under_review' | 'in_progress' | 'planned' | 'resolved' | 'declined'
  attachment_url  TEXT,
  admin_notes     TEXT,
  upvotes_count   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS system_feedback_upvotes (
  id              SERIAL PRIMARY KEY,
  feedback_id     INTEGER NOT NULL REFERENCES system_feedback(id) ON DELETE CASCADE,
  user_id         INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (feedback_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_system_feedback_status ON system_feedback(status);
CREATE INDEX IF NOT EXISTS idx_system_feedback_type ON system_feedback(type);
CREATE INDEX IF NOT EXISTS idx_system_feedback_user ON system_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_system_feedback_upvotes ON system_feedback_upvotes(feedback_id, user_id);
