-- Add include_in_print column to subject table
-- Determines whether this subject appears when printing report cards / documents
ALTER TABLE subject
  ADD COLUMN IF NOT EXISTS include_in_print boolean NOT NULL DEFAULT true;
