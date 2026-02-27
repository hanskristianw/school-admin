-- Add core_subject and print_order columns to subject table
ALTER TABLE subject
  ADD COLUMN IF NOT EXISTS core_subject boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS print_order integer NOT NULL DEFAULT 0;

-- Optional: Add a comment for clarity
COMMENT ON COLUMN subject.core_subject IS 'Marks this subject as a core/compulsory subject';
COMMENT ON COLUMN subject.print_order IS 'Order used when printing reports (lower number prints first)';
