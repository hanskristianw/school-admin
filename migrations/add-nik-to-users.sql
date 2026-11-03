-- Migration: Add nik to users table
-- Description: Stores National Identification Number (Nomor Induk Kependudukan / NIK) for students and staff.

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS nik VARCHAR(20);

COMMENT ON COLUMN public.users.nik IS 'Nomor Induk Kependudukan (NIK) resmi siswa atau staf';
