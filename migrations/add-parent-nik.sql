-- Add parent_nik column to student_applications
ALTER TABLE student_applications ADD COLUMN IF NOT EXISTS parent_nik VARCHAR(20) NULL;
