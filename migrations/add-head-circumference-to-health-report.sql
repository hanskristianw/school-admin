-- ==============================================================================
-- MIGRATION: Add Head Circumference (HC / Lingkar Kepala) to Health Report
-- Run this script in the Supabase SQL Editor
-- ==============================================================================

-- 1. Add head_circumference column to health_growth_development table
ALTER TABLE public.health_growth_development
ADD COLUMN IF NOT EXISTS head_circumference NUMERIC;

-- 2. Optional: Add head_circumference column to health_physical_check table as well for schema flexibility
ALTER TABLE public.health_physical_check
ADD COLUMN IF NOT EXISTS head_circumference NUMERIC;

-- 3. Comments for documentation
COMMENT ON COLUMN public.health_growth_development.head_circumference IS 'Head Circumference / Lingkar Kepala (HC) in cm, specifically tracked for Nursery / Early Childhood growth monitoring';
