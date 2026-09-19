-- ==============================================================================
-- CHUNG CHUNG CHRISTIAN SCHOOL - PROMO CODE & COUPON IN ADMISSION MIGRATION
-- ==============================================================================
-- Skema ini menambahkan kolom pencatatan kode promosi / kupon diskon
-- yang diinput oleh calon siswa saat registrasi online.
-- ==============================================================================

-- 1. Tambahkan kolom promo di tabel student_applications
ALTER TABLE public.student_applications
  ADD COLUMN IF NOT EXISTS promo_code VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS promo_discount_id BIGINT NULL REFERENCES public.fee_discount(discount_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS promo_status VARCHAR(50) NULL DEFAULT 'claimed',
  ADD COLUMN IF NOT EXISTS promo_details JSONB NULL DEFAULT '{}'::jsonb;

-- 2. Tambahkan indeks performa untuk pencarian cepat berdasarkan kode promo
CREATE INDEX IF NOT EXISTS idx_student_applications_promo_code 
  ON public.student_applications(promo_code);

CREATE INDEX IF NOT EXISTS idx_student_applications_promo_discount_id 
  ON public.student_applications(promo_discount_id);

-- 3. Keterangan Kolom (Dokumentasi Database)
COMMENT ON COLUMN public.student_applications.promo_code IS 'Kode kupon promosi yang diinput saat registrasi online';
COMMENT ON COLUMN public.student_applications.promo_discount_id IS 'Foreign key ke tabel fee_discount';
COMMENT ON COLUMN public.student_applications.promo_status IS 'Status klaim kupon: claimed (diklaim), verified (disetujui), applied (diterapkan ke biaya)';
COMMENT ON COLUMN public.student_applications.promo_details IS 'Snapshot rincian diskon saat kupon diklaim (nama, nilai potongan, target)';
