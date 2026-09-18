-- =====================================================
-- ADMISSION FORM FEE & PAYMENT PROOF SCHEMA
-- For ccs.sch.id simplified registration portal
-- =====================================================

-- 1. Create table for wave-based / periodic form fees
CREATE TABLE IF NOT EXISTS public.admission_form_fee (
  fee_id SERIAL PRIMARY KEY,
  year_id INTEGER REFERENCES public.year(year_id) ON DELETE CASCADE,
  unit_id INTEGER REFERENCES public.unit(unit_id) ON DELETE SET NULL,
  level_id INTEGER REFERENCES public.admission_level(level_id) ON DELETE SET NULL,
  wave_name VARCHAR(100) NOT NULL, -- e.g. "Early Bird Wave", "Gelombang 1", "Gelombang 2", "Reguler"
  amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  effective_from DATE NOT NULL,
  effective_until DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_form_fee_wave UNIQUE (wave_name, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_form_fee_dates ON public.admission_form_fee(effective_from, effective_until);
CREATE INDEX IF NOT EXISTS idx_form_fee_active ON public.admission_form_fee(is_active) WHERE is_active = true;

-- Sample initial waves for 2026/2027
INSERT INTO public.admission_form_fee (wave_name, amount, effective_from, effective_until, is_active, notes)
VALUES 
  ('Gelombang 1 - Early Bird', 150000.00, '2026-08-01', '2026-11-30', true, 'Tarif promo pendaftaran awal'),
  ('Gelombang 2 - Reguler', 250000.00, '2026-12-01', '2027-03-31', true, 'Tarif pendaftaran reguler'),
  ('Gelombang 3 - Late Intake', 350000.00, '2027-04-01', '2027-07-31', true, 'Tarif pendaftaran gelombang akhir')
ON CONFLICT DO NOTHING;

-- 2. Add columns to student_applications for form fee payment & applicant access
ALTER TABLE public.student_applications
  ADD COLUMN IF NOT EXISTS form_fee_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS form_fee_status VARCHAR(30) DEFAULT 'pending_payment',
  ADD COLUMN IF NOT EXISTS payment_proof_file TEXT NULL,
  ADD COLUMN IF NOT EXISTS access_token VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS wave_name VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS hosting_url TEXT NULL,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS verified_by INTEGER REFERENCES public.users(user_id),
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS is_form_completed BOOLEAN DEFAULT false;

-- Allow initial stage registration without full names yet
ALTER TABLE public.student_applications ALTER COLUMN student_name DROP NOT NULL;
ALTER TABLE public.student_applications ALTER COLUMN parent_name DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_student_app_fee_status ON public.student_applications(form_fee_status);
CREATE INDEX IF NOT EXISTS idx_student_app_token ON public.student_applications(access_token);
CREATE INDEX IF NOT EXISTS idx_student_app_email_phone ON public.student_applications(parent_email, parent_phone);

-- Constraint for form_fee_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'student_applications_form_fee_status_check'
  ) THEN
    ALTER TABLE public.student_applications
      ADD CONSTRAINT student_applications_form_fee_status_check
      CHECK (form_fee_status IN ('pending_payment', 'proof_uploaded', 'verified', 'rejected'));
  END IF;
END $$;

COMMENT ON TABLE public.admission_form_fee IS 'Master tarif biaya pembelian formulir pendaftaran berdasarkan periode gelombang waktu';
COMMENT ON COLUMN public.student_applications.form_fee_amount IS 'Nominal biaya formulir yang berlaku saat pendaftaran dibuat';
COMMENT ON COLUMN public.student_applications.form_fee_status IS 'Status pembayaran formulir: pending_payment, proof_uploaded, verified, rejected';
COMMENT ON COLUMN public.student_applications.payment_proof_file IS 'Nama berkas foto/dokumen bukti transfer pembayaran formulir';
COMMENT ON COLUMN public.student_applications.access_token IS 'Kode akses unik / PIN pendaftar untuk login mandiri dan upload bukti transfer di portal ccs.sch.id';
