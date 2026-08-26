-- ==============================================================================
-- SQL MIGRATION: Add 'sakit' (Sick) to status check constraint on public.kelas_attendance
-- ==============================================================================

ALTER TABLE public.kelas_attendance 
DROP CONSTRAINT IF EXISTS kelas_attendance_status_check;

ALTER TABLE public.kelas_attendance 
ADD CONSTRAINT kelas_attendance_status_check 
CHECK (status IN ('hadir', 'tidak_hadir', 'ijin', 'sakit', 'terlambat', 'pulang_cepat'));
