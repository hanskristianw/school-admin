-- Migration: Add 'qr_daily' to absen_method check constraint
-- This allows the new static daily QR attendance method

-- Drop the old constraint
ALTER TABLE absen DROP CONSTRAINT IF EXISTS absen_absen_method_check;

-- Add new constraint with 'qr_daily' included
ALTER TABLE absen ADD CONSTRAINT absen_absen_method_check 
  CHECK (absen_method IN ('manual', 'qr', 'qr_daily', 'import'));

-- Verify the constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'absen_absen_method_check';
