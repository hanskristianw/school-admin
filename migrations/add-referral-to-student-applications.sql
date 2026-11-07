-- ==============================================================================
-- CHUNG CHUNG CHRISTIAN SCHOOL - ADMISSION REFERRAL FIELD MIGRATION
-- ==============================================================================
-- Menambahkan kolom referral_name pada tabel student_applications untuk
-- mencatat nama orang tua dan siswa CCS yang mereferensikan pendaftar baru
-- saat proses pembayaran / upload bukti transfer biaya formulir.
-- ==============================================================================

ALTER TABLE public.student_applications
  ADD COLUMN IF NOT EXISTS referral_name TEXT NULL;

COMMENT ON COLUMN public.student_applications.referral_name IS 'Nama orang tua & siswa yang mereferensikan (Referral)';

CREATE INDEX IF NOT EXISTS idx_student_applications_referral ON public.student_applications(referral_name)
  WHERE referral_name IS NOT NULL;
