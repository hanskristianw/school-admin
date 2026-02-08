-- ===================================================
-- CLEANUP: Hapus semua data diskon & cicilan, reset schema
-- ===================================================

-- 1. Hapus data terkait terlebih dahulu (child → parent)
DELETE FROM application_discount;
DELETE FROM application_installment;
DELETE FROM fee_discount;

-- 2. Reset sequences
ALTER SEQUENCE IF EXISTS application_discount_app_discount_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS fee_discount_discount_id_seq RESTART WITH 1;

-- 3. Pastikan level_id ada di fee_discount
ALTER TABLE public.fee_discount
  ADD COLUMN IF NOT EXISTS level_id INTEGER REFERENCES public.admission_level(level_id);

-- 4. Buat index untuk level_id
CREATE INDEX IF NOT EXISTS idx_discount_level ON public.fee_discount(level_id) WHERE level_id IS NOT NULL;
