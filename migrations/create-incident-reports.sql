-- ============================================================
-- STUDENT INCIDENT REPORTS & NOTIFICATION SYSTEM MIGRATION
-- ============================================================

-- 1. Table for Incident Reports Header
CREATE TABLE IF NOT EXISTS incident_reports (
  id SERIAL PRIMARY KEY,
  incident_number VARCHAR(50) UNIQUE,
  title VARCHAR(255) NOT NULL,
  student_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  reporter_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  unit_id INTEGER REFERENCES unit(unit_id) ON DELETE SET NULL,
  incident_date DATE NOT NULL DEFAULT CURRENT_DATE,
  incident_time TIME NOT NULL DEFAULT CURRENT_TIME,
  incident_record VARCHAR(255) NOT NULL DEFAULT '-',
  description TEXT NOT NULL,
  action_taken TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'waiting', -- 'waiting', 'on_progress', 'completed'
  place_of_incident VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table for Incident Report Follow-up Timeline Entries
CREATE TABLE IF NOT EXISTS incident_followups (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER NOT NULL REFERENCES incident_reports(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  followup_date DATE NOT NULL DEFAULT CURRENT_DATE,
  followup_time TIME NOT NULL DEFAULT CURRENT_TIME,
  location VARCHAR(255) DEFAULT '-',
  action_details TEXT NOT NULL,
  resulting_status VARCHAR(30) DEFAULT 'on_progress',
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure attachment_url column exists if table was created previously
ALTER TABLE incident_followups ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- 3. Table for Per-Unit Incident Notification Recipients
CREATE TABLE IF NOT EXISTS incident_unit_recipients (
  id SERIAL PRIMARY KEY,
  unit_id INTEGER NOT NULL REFERENCES unit(unit_id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(unit_id, user_id)
);

-- 4. Junction Table for Multi-Student Incidents Relational Querying
CREATE TABLE IF NOT EXISTS incident_report_students (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER NOT NULL REFERENCES incident_reports(id) ON DELETE CASCADE,
  student_user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(incident_id, student_user_id)
);

-- Register initial menus in menus table if needed
INSERT INTO menus (menu_name, menu_path, menu_icon, menu_order, menu_show_dashboard)
VALUES 
  ('Pastoral Care', NULL, 'faHandHoldingHeart', 44, true),
  ('Incident Report', '/data/incident-report', 'faExclamationTriangle', 45, true),
  ('Incident Handling', '/data/incident-report-approval', 'faClipboardCheck', 46, true),
  ('Incident Settings', '/settings/incident-report', 'faSliders', 47, false)
ON CONFLICT DO NOTHING;
