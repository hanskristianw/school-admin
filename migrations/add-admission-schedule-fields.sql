-- ==============================================================================
-- MIGRATION: ADD ADMISSION TEST & INTERVIEW SCHEDULE FIELDS
-- Table: public.student_applications
-- ==============================================================================

ALTER TABLE public.student_applications
ADD COLUMN IF NOT EXISTS test_date DATE NULL,
ADD COLUMN IF NOT EXISTS test_session VARCHAR(60) NULL,
ADD COLUMN IF NOT EXISTS interview_date DATE NULL,
ADD COLUMN IF NOT EXISTS interview_session VARCHAR(60) NULL,
ADD COLUMN IF NOT EXISTS schedule_notes TEXT NULL;

COMMENT ON COLUMN public.student_applications.test_date IS 'Tanggal pelaksanaan tes penempatan / observasi calon siswa';
COMMENT ON COLUMN public.student_applications.test_session IS 'Sesi atau jam pelaksanaan tes penempatan';
COMMENT ON COLUMN public.student_applications.interview_date IS 'Tanggal pelaksanaan wawancara orang tua / calon siswa';
COMMENT ON COLUMN public.student_applications.interview_session IS 'Sesi atau jam pelaksanaan wawancara orang tua';
COMMENT ON COLUMN public.student_applications.schedule_notes IS 'Catatan preferensi atau penyesuaian jadwal tes dan wawancara';
