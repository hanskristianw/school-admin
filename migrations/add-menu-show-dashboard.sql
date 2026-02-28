-- Add column to control which menus appear on the dashboard card grid
ALTER TABLE menus
  ADD COLUMN IF NOT EXISTS menu_show_dashboard BOOLEAN NOT NULL DEFAULT FALSE;

-- Optionally set some common teacher menus to show on dashboard
-- UPDATE menus SET menu_show_dashboard = TRUE WHERE menu_path IN ('/teacher/assessment_submission', '/data/topic-new', '/student', '/data/schedule');
