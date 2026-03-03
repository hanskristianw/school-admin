-- Remove report-related columns from unit table (moved to report_settings)
ALTER TABLE unit
  DROP COLUMN IF EXISTS principal_name,
  DROP COLUMN IF EXISTS principal_title,
  DROP COLUMN IF EXISTS report_greeting;

-- Add report dates (per semester) to report_settings
ALTER TABLE report_settings
  ADD COLUMN IF NOT EXISTS report_date_s1 DATE,
  ADD COLUMN IF NOT EXISTS report_date_s2 DATE;
