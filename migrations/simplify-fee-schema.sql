-- =====================================================
-- SIMPLIFY FEE SCHEMA
-- =====================================================
-- Remove monthly_amounts from school_fee_definition (no longer needed, 
-- per-student pricing handled via application_discount)
-- Remove udp_installment_plan table (replaced by application_installment)
-- Remove default_installments from udp_definition

-- 1. Drop views that depend on monthly_amounts first
DROP VIEW IF EXISTS public.v_monthly_fee_schedule CASCADE;
DROP VIEW IF EXISTS public.v_active_fees_summary CASCADE;
DROP VIEW IF EXISTS public.v_school_fee_monthly CASCADE;

-- 2. Drop monthly_amounts column and its constraint
ALTER TABLE public.school_fee_definition DROP CONSTRAINT IF EXISTS chk_monthly_len;
ALTER TABLE public.school_fee_definition DROP COLUMN IF EXISTS monthly_amounts;

-- 3. Drop udp_installment_plan table (replaced by per-student application_installment)
DROP TABLE IF EXISTS public.udp_installment_plan CASCADE;

-- 4. Drop default_installments from udp_definition
ALTER TABLE public.udp_definition DROP COLUMN IF EXISTS default_installments;
