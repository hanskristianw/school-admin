-- Migration: Add is_permanent to users table
-- Description: Tracks employee permanent status (true = Permanent / Karyawan Tetap, false = Contract / Kontrak / Probation / Part-time)

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_permanent BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.users.is_permanent IS 'Status kepegawaian tetap (true = Permanent / Karyawan Tetap, false = Kontrak / Probation / Part-time)';
