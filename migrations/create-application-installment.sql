-- =====================================================
-- APPLICATION INSTALLMENT (Skema Cicilan per Pendaftar)
-- =====================================================
-- Stores the installment scheme for each application
-- Total biaya masuk = UDP (after discounts) + SPP bulan pertama (after discounts)
-- UTJ = percentage of total (default 30%), sisanya dicicil N bulan

CREATE TABLE IF NOT EXISTS public.application_installment (
  installment_id   BIGSERIAL PRIMARY KEY,
  
  -- One plan per application
  application_id   BIGINT NOT NULL UNIQUE
                   REFERENCES public.student_applications(application_id) ON DELETE CASCADE,
  
  -- Source amounts (after discounts, captured at plan creation)
  udp_amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
  spp_first_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_entry_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  
  -- UTJ (Uang Tanda Jadi) configuration
  utj_percentage   NUMERIC(5,2) NOT NULL DEFAULT 30
                   CHECK (utj_percentage >= 0 AND utj_percentage <= 100),
  utj_amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
  
  -- Remaining split into monthly installments
  remaining_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  num_installments    INTEGER NOT NULL DEFAULT 11 CHECK (num_installments >= 1),
  monthly_installment NUMERIC(12,2) NOT NULL DEFAULT 0,
  
  -- Schedule configuration
  start_month      INTEGER NOT NULL DEFAULT 7 CHECK (start_month BETWEEN 1 AND 12),
  start_year       INTEGER NOT NULL DEFAULT 2026,
  
  notes            TEXT NULL,
  
  -- Audit
  created_by       INTEGER NULL REFERENCES public.users(user_id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_installment_application
  ON public.application_installment(application_id);

COMMENT ON TABLE public.application_installment
  IS 'Skema cicilan biaya masuk per pendaftar. Total = UDP + SPP bulan pertama, dipotong UTJ, sisanya dicicil';
COMMENT ON COLUMN public.application_installment.utj_percentage
  IS 'Persentase Uang Tanda Jadi dari total biaya masuk (default 30%)';
COMMENT ON COLUMN public.application_installment.start_month
  IS 'Bulan mulai cicilan (default 7 = Juli, awal tahun ajaran)';
COMMENT ON COLUMN public.application_installment.monthly_installment
  IS 'Nominal cicilan per bulan (remaining / num_installments, pembulatan ke bawah)';

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_app_installment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_app_installment_updated_at ON public.application_installment;
CREATE TRIGGER trigger_app_installment_updated_at
  BEFORE UPDATE ON public.application_installment
  FOR EACH ROW
  EXECUTE FUNCTION update_app_installment_timestamp();

-- RLS (dev mode: allow all)
ALTER TABLE public.application_installment ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dev_all_app_installment" ON public.application_installment;
CREATE POLICY "dev_all_app_installment" ON public.application_installment
  FOR ALL USING (true) WITH CHECK (true);
