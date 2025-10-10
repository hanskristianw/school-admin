-- Settings table for key-value configuration storage
-- Used for storing daily QR secrets and other app settings

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS for settings table
-- Since this app uses custom authentication (not Supabase Auth), 
-- permissions are handled at application layer via user roles
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;

-- Optional: Insert default placeholders for daily secrets
INSERT INTO settings (key, value, description)
VALUES
  ('attendance_secret_mon', '', 'Secret key untuk QR kehadiran Senin'),
  ('attendance_secret_tue', '', 'Secret key untuk QR kehadiran Selasa'),
  ('attendance_secret_wed', '', 'Secret key untuk QR kehadiran Rabu'),
  ('attendance_secret_thu', '', 'Secret key untuk QR kehadiran Kamis'),
  ('attendance_secret_fri', '', 'Secret key untuk QR kehadiran Jumat')
ON CONFLICT (key) DO NOTHING;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
