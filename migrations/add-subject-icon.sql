-- Add subject_icon column to subject table
-- Stores the public URL of the uploaded subject icon
ALTER TABLE subject
ADD COLUMN IF NOT EXISTS subject_icon TEXT;

COMMENT ON COLUMN subject.subject_icon IS 'Public URL of the subject icon image';
