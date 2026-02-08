-- =====================================================
-- APPLICATION DISCOUNT (Potongan per Pendaftar)
-- =====================================================
-- Supports stacked/layered discounts with ordering
-- e.g. Diskon Pameran Rp 1jt first, then Sibling 5%
-- Order (seq) matters for final calculation

CREATE TABLE IF NOT EXISTS public.application_discount (
  app_discount_id  BIGSERIAL PRIMARY KEY,
  
  -- Application reference
  application_id   BIGINT NOT NULL REFERENCES public.student_applications(application_id) ON DELETE CASCADE,
  
  -- Discount master reference
  discount_id      BIGINT NOT NULL REFERENCES public.fee_discount(discount_id),
  
  -- Target: which fee does this discount apply to
  fee_target       VARCHAR(10) NOT NULL CHECK (fee_target IN ('udp', 'usek')),
  
  -- Order of application (seq 1 applied first, then 2, etc.)
  seq              INTEGER NOT NULL CHECK (seq >= 1),
  
  -- Discount value (copied from master, can be overridden per application)
  value_type       VARCHAR(20) NOT NULL CHECK (value_type IN ('percentage', 'fixed')),
  value            NUMERIC(12,2) NOT NULL CHECK (value >= 0),
  
  -- Calculation audit trail (filled when calculated)
  base_before      NUMERIC(12,2) NOT NULL DEFAULT 0,  -- subtotal before this discount
  calculated_amount NUMERIC(12,2) NOT NULL DEFAULT 0, -- actual discount amount
  subtotal_after   NUMERIC(12,2) NOT NULL DEFAULT 0,  -- subtotal after this discount
  
  -- Notes
  notes            TEXT NULL,
  
  -- Audit trail
  created_by       INTEGER NULL REFERENCES public.users(user_id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Each application can only use the same discount once per fee target
  CONSTRAINT uq_app_discount_item UNIQUE(application_id, fee_target, discount_id),
  -- Each seq must be unique per application + fee target
  CONSTRAINT uq_app_discount_seq UNIQUE(application_id, fee_target, seq)
);

CREATE INDEX IF NOT EXISTS idx_app_discount_application ON public.application_discount(application_id);
CREATE INDEX IF NOT EXISTS idx_app_discount_discount ON public.application_discount(discount_id);

COMMENT ON TABLE public.application_discount IS 'Potongan/diskon yang diterapkan per pendaftar, mendukung stacking berlapis dengan urutan';
COMMENT ON COLUMN public.application_discount.seq IS 'Urutan penerapan diskon (1=pertama, 2=kedua, dst). Urutan mempengaruhi kalkulasi';
COMMENT ON COLUMN public.application_discount.value_type IS 'percentage: persen dari subtotal saat ini, fixed: nominal tetap';
COMMENT ON COLUMN public.application_discount.base_before IS 'Subtotal sebelum diskon ini diterapkan';
COMMENT ON COLUMN public.application_discount.calculated_amount IS 'Nominal potongan aktual yang dihitung';
COMMENT ON COLUMN public.application_discount.subtotal_after IS 'Subtotal setelah diskon ini diterapkan';

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_app_discount_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_app_discount_updated_at ON public.application_discount;
CREATE TRIGGER trigger_app_discount_updated_at
  BEFORE UPDATE ON public.application_discount
  FOR EACH ROW
  EXECUTE FUNCTION update_app_discount_timestamp();

-- RLS (dev mode: allow all)
ALTER TABLE public.application_discount ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dev_all_app_discount" ON public.application_discount;
CREATE POLICY "dev_all_app_discount" ON public.application_discount FOR ALL USING (true) WITH CHECK (true);
