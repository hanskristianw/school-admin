-- =====================================================
-- IMPROVED FEE SYSTEM (UDP & USEK)
-- =====================================================
-- Features:
-- 1. School Fee (USEK) per unit & year - monthly
-- 2. UDP (one-time) per unit & year - with installments
-- 3. Discount system (percentage & fixed amount)
-- 4. Audit trail (created_by, updated_by)
-- 5. Active status & effective dates

-- =====================================================
-- 1. SCHOOL FEE DEFINITION (USEK - Uang Sekolah)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.school_fee_definition (
  fee_def_id BIGSERIAL PRIMARY KEY,
  unit_id INTEGER NOT NULL REFERENCES public.unit(unit_id) ON DELETE CASCADE,
  year_id INTEGER NOT NULL REFERENCES public.year(year_id) ON DELETE CASCADE,
  
  -- Default amount untuk semua bulan
  default_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (default_amount >= 0),
  
  -- Override per-month (array 12 elemen, null berarti pakai default)
  monthly_amounts NUMERIC(12,2)[] NULL,
  
  -- Notes & metadata
  notes TEXT NULL,
  
  -- Audit trail
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add new columns if table already exists (backward compatible)
ALTER TABLE public.school_fee_definition ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.school_fee_definition ADD COLUMN IF NOT EXISTS effective_from DATE NULL;
ALTER TABLE public.school_fee_definition ADD COLUMN IF NOT EXISTS effective_until DATE NULL;
ALTER TABLE public.school_fee_definition ADD COLUMN IF NOT EXISTS created_by INTEGER NULL REFERENCES public.users(user_id);
ALTER TABLE public.school_fee_definition ADD COLUMN IF NOT EXISTS updated_by INTEGER NULL REFERENCES public.users(user_id);

-- Add unique constraint if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_school_fee_def') THEN
    ALTER TABLE public.school_fee_definition ADD CONSTRAINT uq_school_fee_def UNIQUE(unit_id, year_id);
  END IF;
END $$;

-- Add check constraint if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_monthly_len') THEN
    ALTER TABLE public.school_fee_definition ADD CONSTRAINT chk_monthly_len CHECK (monthly_amounts IS NULL OR array_length(monthly_amounts, 1) = 12);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_school_fee_unit_year ON public.school_fee_definition(unit_id, year_id);
CREATE INDEX IF NOT EXISTS idx_school_fee_active ON public.school_fee_definition(is_active) WHERE is_active = true;

COMMENT ON TABLE public.school_fee_definition IS 'Definisi Uang Sekolah (USEK) bulanan per unit dan tahun ajaran';
COMMENT ON COLUMN public.school_fee_definition.monthly_amounts IS 'Array 12 elemen untuk override per-month, null berarti pakai default_amount';

-- =====================================================
-- 2. UDP DEFINITION
-- =====================================================
CREATE TABLE IF NOT EXISTS public.udp_definition (
  udp_def_id BIGSERIAL PRIMARY KEY,
  unit_id INTEGER NOT NULL REFERENCES public.unit(unit_id) ON DELETE CASCADE,
  year_id INTEGER NOT NULL REFERENCES public.year(year_id) ON DELETE CASCADE,
  
  -- Total UDP amount
  total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
  
  -- Default number of installments (optional)
  default_installments INTEGER NULL CHECK (default_installments IS NULL OR default_installments >= 1),
  
  -- Notes & metadata
  notes TEXT NULL,
  
  -- Audit trail
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add new columns if table already exists (backward compatible)
ALTER TABLE public.udp_definition ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.udp_definition ADD COLUMN IF NOT EXISTS effective_from DATE NULL;
ALTER TABLE public.udp_definition ADD COLUMN IF NOT EXISTS effective_until DATE NULL;
ALTER TABLE public.udp_definition ADD COLUMN IF NOT EXISTS created_by INTEGER NULL REFERENCES public.users(user_id);
ALTER TABLE public.udp_definition ADD COLUMN IF NOT EXISTS updated_by INTEGER NULL REFERENCES public.users(user_id);

-- Add unique constraint if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_udp_def') THEN
    ALTER TABLE public.udp_definition ADD CONSTRAINT uq_udp_def UNIQUE(unit_id, year_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_udp_unit_year ON public.udp_definition(unit_id, year_id);
CREATE INDEX IF NOT EXISTS idx_udp_active ON public.udp_definition(is_active) WHERE is_active = true;

COMMENT ON TABLE public.udp_definition IS 'Definisi UDP (Uang Daftar & Pengembangan) per unit dan tahun ajaran';

-- =====================================================
-- 3. UDP INSTALLMENT PLAN
-- =====================================================
CREATE TABLE IF NOT EXISTS public.udp_installment_plan (
  plan_id BIGSERIAL PRIMARY KEY,
  udp_def_id BIGINT NOT NULL REFERENCES public.udp_definition(udp_def_id) ON DELETE CASCADE,
  
  -- Sequence number (1, 2, 3, ...)
  seq INTEGER NOT NULL CHECK (seq >= 1),
  
  -- Month (1-12) when this installment is due
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  
  -- Amount for this installment
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  
  -- Audit trail
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add new column if table already exists (backward compatible)
ALTER TABLE public.udp_installment_plan ADD COLUMN IF NOT EXISTS due_date DATE NULL;

-- Add unique constraints if not exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_udp_plan_month') THEN
    ALTER TABLE public.udp_installment_plan ADD CONSTRAINT uq_udp_plan_month UNIQUE(udp_def_id, month);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_udp_plan_seq') THEN
    ALTER TABLE public.udp_installment_plan ADD CONSTRAINT uq_udp_plan_seq UNIQUE(udp_def_id, seq);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_udp_plan_def ON public.udp_installment_plan(udp_def_id);

COMMENT ON TABLE public.udp_installment_plan IS 'Rencana cicilan UDP per bulan';
COMMENT ON COLUMN public.udp_installment_plan.seq IS 'Urutan cicilan (1, 2, 3, ...)';
COMMENT ON COLUMN public.udp_installment_plan.month IS 'Bulan jatuh tempo cicilan (1=Jan, 12=Des)';

-- =====================================================
-- 4. FEE DISCOUNT SYSTEM
-- =====================================================
CREATE TABLE IF NOT EXISTS public.fee_discount (
  discount_id BIGSERIAL PRIMARY KEY,
  
  -- Scope
  unit_id INTEGER NOT NULL REFERENCES public.unit(unit_id) ON DELETE CASCADE,
  year_id INTEGER NOT NULL REFERENCES public.year(year_id) ON DELETE CASCADE,
  
  -- Discount details
  discount_code VARCHAR(50) NOT NULL,
  discount_name VARCHAR(255) NOT NULL,
  discount_description TEXT NULL,
  
  -- Discount type & value
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(12,2) NOT NULL CHECK (discount_value >= 0),
  
  -- Applies to which fee
  applies_to VARCHAR(20) NOT NULL CHECK (applies_to IN ('udp', 'usek', 'both')),
  
  -- Validity period
  valid_from DATE NULL,
  valid_until DATE NULL,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Usage limits (optional)
  max_usage INTEGER NULL CHECK (max_usage IS NULL OR max_usage > 0),
  current_usage INTEGER NOT NULL DEFAULT 0 CHECK (current_usage >= 0),
  
  -- Additional conditions (JSON for flexibility)
  conditions JSONB NULL,
  
  -- Audit trail
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by INTEGER NULL REFERENCES public.users(user_id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by INTEGER NULL REFERENCES public.users(user_id),
  
  -- Constraints
  CONSTRAINT uq_discount_code UNIQUE(unit_id, year_id, discount_code)
);

CREATE INDEX IF NOT EXISTS idx_discount_unit_year ON public.fee_discount(unit_id, year_id);
CREATE INDEX IF NOT EXISTS idx_discount_code ON public.fee_discount(discount_code);
CREATE INDEX IF NOT EXISTS idx_discount_active ON public.fee_discount(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_discount_valid ON public.fee_discount(valid_from, valid_until);

COMMENT ON TABLE public.fee_discount IS 'Sistem potongan/diskon untuk UDP dan USEK';
COMMENT ON COLUMN public.fee_discount.discount_type IS 'percentage: potongan persen (0-100), fixed: potongan nominal tetap';
COMMENT ON COLUMN public.fee_discount.applies_to IS 'udp: hanya UDP, usek: hanya USEK, both: keduanya';
COMMENT ON COLUMN public.fee_discount.conditions IS 'Kondisi tambahan dalam format JSON (misal: {"min_siblings": 2, "student_type": "new"})';

-- =====================================================
-- 5. STUDENT FEE TRANSACTIONS (Track actual payments)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.student_fee_payment (
  payment_id BIGSERIAL PRIMARY KEY,
  
  -- Student reference (from student_applications or users table)
  student_id INTEGER NOT NULL, -- Could reference users(user_id) or student_applications(application_id)
  student_name VARCHAR(255) NOT NULL,
  
  -- Fee reference
  unit_id INTEGER NOT NULL REFERENCES public.unit(unit_id),
  year_id INTEGER NOT NULL REFERENCES public.year(year_id),
  
  -- Payment details
  fee_type VARCHAR(20) NOT NULL CHECK (fee_type IN ('udp', 'usek')),
  payment_period VARCHAR(50) NULL, -- 'Month 1', 'Month 2', 'Cicilan 1', etc
  
  -- Amounts
  base_amount NUMERIC(12,2) NOT NULL CHECK (base_amount >= 0),
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  final_amount NUMERIC(12,2) NOT NULL CHECK (final_amount >= 0),
  
  -- Discount applied
  discount_id BIGINT NULL REFERENCES public.fee_discount(discount_id),
  discount_notes TEXT NULL,
  
  -- Payment info
  payment_date DATE NOT NULL,
  payment_method VARCHAR(50) NULL, -- 'transfer', 'cash', 'credit_card', etc
  payment_proof_url TEXT NULL,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'confirmed', 'cancelled')),
  
  -- Notes
  notes TEXT NULL,
  
  -- Audit trail
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by INTEGER NULL REFERENCES public.users(user_id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by INTEGER NULL REFERENCES public.users(user_id),
  
  -- Constraints
  CONSTRAINT chk_final_amount CHECK (final_amount = base_amount - discount_amount)
);

CREATE INDEX IF NOT EXISTS idx_fee_payment_student ON public.student_fee_payment(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_payment_unit_year ON public.student_fee_payment(unit_id, year_id);
CREATE INDEX IF NOT EXISTS idx_fee_payment_status ON public.student_fee_payment(status);
CREATE INDEX IF NOT EXISTS idx_fee_payment_date ON public.student_fee_payment(payment_date);

COMMENT ON TABLE public.student_fee_payment IS 'Transaksi pembayaran UDP dan USEK per siswa';
COMMENT ON COLUMN public.student_fee_payment.final_amount IS 'Amount setelah diskon = base_amount - discount_amount';

-- =====================================================
-- 6. HELPER VIEWS
-- =====================================================

-- Drop existing views first to avoid column mismatch errors
DROP VIEW IF EXISTS public.v_school_fee_monthly CASCADE;
DROP VIEW IF EXISTS public.v_active_fees_summary CASCADE;
DROP VIEW IF EXISTS public.v_active_discounts CASCADE;

-- View: School Fee Monthly (with fallback to default)
CREATE VIEW public.v_school_fee_monthly AS
SELECT 
  sfd.fee_def_id,
  sfd.unit_id,
  u.unit_name,
  sfd.year_id,
  y.year_name,
  gs.m AS month,
  COALESCE(sfd.monthly_amounts[gs.m], sfd.default_amount) AS amount,
  sfd.is_active
FROM public.school_fee_definition sfd
INNER JOIN public.unit u ON u.unit_id = sfd.unit_id
INNER JOIN public.year y ON y.year_id = sfd.year_id
CROSS JOIN LATERAL generate_series(1, 12) AS gs(m)
WHERE sfd.is_active = true;

COMMENT ON VIEW public.v_school_fee_monthly IS 'View untuk fee bulanan dengan fallback ke default_amount';

-- View: Active fees summary
CREATE VIEW public.v_active_fees_summary AS
SELECT 
  u.unit_id,
  u.unit_name,
  y.year_id,
  y.year_name,
  sfd.fee_def_id,
  sfd.default_amount AS usek_default,
  ud.udp_def_id,
  ud.total_amount AS udp_total,
  ud.default_installments,
  (SELECT COUNT(*) FROM udp_installment_plan WHERE udp_def_id = ud.udp_def_id) AS installment_count
FROM public.unit u
CROSS JOIN public.year y
LEFT JOIN public.school_fee_definition sfd ON sfd.unit_id = u.unit_id AND sfd.year_id = y.year_id AND sfd.is_active = true
LEFT JOIN public.udp_definition ud ON ud.unit_id = u.unit_id AND ud.year_id = y.year_id AND ud.is_active = true
WHERE u.is_school = true
ORDER BY u.unit_name, y.year_name DESC;

COMMENT ON VIEW public.v_active_fees_summary IS 'Ringkasan fee aktif per unit dan tahun ajaran';

-- View: Active discounts
CREATE VIEW public.v_active_discounts AS
SELECT 
  fd.discount_id,
  u.unit_name,
  y.year_name,
  fd.discount_code,
  fd.discount_name,
  fd.discount_type,
  fd.discount_value,
  fd.applies_to,
  fd.valid_from,
  fd.valid_until,
  fd.max_usage,
  fd.current_usage,
  CASE 
    WHEN fd.max_usage IS NOT NULL THEN fd.max_usage - fd.current_usage
    ELSE NULL
  END AS remaining_usage
FROM public.fee_discount fd
INNER JOIN public.unit u ON u.unit_id = fd.unit_id
INNER JOIN public.year y ON y.year_id = fd.year_id
WHERE fd.is_active = true
  AND (fd.valid_from IS NULL OR fd.valid_from <= CURRENT_DATE)
  AND (fd.valid_until IS NULL OR fd.valid_until >= CURRENT_DATE)
  AND (fd.max_usage IS NULL OR fd.current_usage < fd.max_usage)
ORDER BY u.unit_name, y.year_name DESC, fd.discount_code;

COMMENT ON VIEW public.v_active_discounts IS 'Daftar diskon yang masih aktif dan bisa digunakan';

-- =====================================================
-- 7. TRIGGERS
-- =====================================================

-- Trigger: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
DROP TRIGGER IF EXISTS trigger_school_fee_updated_at ON public.school_fee_definition;
CREATE TRIGGER trigger_school_fee_updated_at
  BEFORE UPDATE ON public.school_fee_definition
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_udp_updated_at ON public.udp_definition;
CREATE TRIGGER trigger_udp_updated_at
  BEFORE UPDATE ON public.udp_definition
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_udp_plan_updated_at ON public.udp_installment_plan;
CREATE TRIGGER trigger_udp_plan_updated_at
  BEFORE UPDATE ON public.udp_installment_plan
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_discount_updated_at ON public.fee_discount;
CREATE TRIGGER trigger_discount_updated_at
  BEFORE UPDATE ON public.fee_discount
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_fee_payment_updated_at ON public.student_fee_payment;
CREATE TRIGGER trigger_fee_payment_updated_at
  BEFORE UPDATE ON public.student_fee_payment
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. RLS POLICIES (Development - adjust for production)
-- =====================================================

ALTER TABLE public.school_fee_definition ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.udp_definition ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.udp_installment_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_discount ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_fee_payment ENABLE ROW LEVEL SECURITY;

-- Broad policies for development (tighten in production)
CREATE POLICY "dev_all_school_fee" ON public.school_fee_definition FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all_udp" ON public.udp_definition FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all_udp_plan" ON public.udp_installment_plan FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all_discount" ON public.fee_discount FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all_fee_payment" ON public.student_fee_payment FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 9. SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Example: Insert sample discount
-- INSERT INTO public.fee_discount (
--   unit_id, year_id, discount_code, discount_name, discount_type, 
--   discount_value, applies_to, is_active
-- ) VALUES (
--   1, 1, 'SIBLING10', 'Potongan Anak Kedua', 'percentage', 10, 'both', true
-- );

-- INSERT INTO public.fee_discount (
--   unit_id, year_id, discount_code, discount_name, discount_type, 
--   discount_value, applies_to, is_active
-- ) VALUES (
--   1, 1, 'EARLYBIRD', 'Early Bird Rp 500K', 'fixed', 500000, 'udp', true
-- );

COMMENT ON SCHEMA public IS 'Improved Fee System - UDP & USEK with Discount Support';
