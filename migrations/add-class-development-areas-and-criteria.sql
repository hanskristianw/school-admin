-- ==============================================================================
-- Migration: Create class_development_areas and class_development_criteria tables
-- Option A: Relational Schema for Nursery Area of Development
-- ==============================================================================

-- 1. Create Parent Table: class_development_areas
CREATE TABLE IF NOT EXISTS public.class_development_areas (
    area_id SERIAL PRIMARY KEY,
    kelas_id INTEGER NOT NULL REFERENCES public.kelas(kelas_id) ON DELETE CASCADE,
    area_name VARCHAR(255) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by class
CREATE INDEX IF NOT EXISTS idx_class_dev_areas_kelas_id 
ON public.class_development_areas(kelas_id);

-- 2. Create Child Table: class_development_criteria
CREATE TABLE IF NOT EXISTS public.class_development_criteria (
    criteria_id SERIAL PRIMARY KEY,
    area_id INTEGER NOT NULL REFERENCES public.class_development_areas(area_id) ON DELETE CASCADE,
    criteria_text TEXT NOT NULL,
    criteria_translation TEXT DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by area
CREATE INDEX IF NOT EXISTS idx_class_dev_criteria_area_id 
ON public.class_development_criteria(area_id);

-- 3. Enable RLS and Permissive Policies
ALTER TABLE public.class_development_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_development_criteria ENABLE ROW LEVEL SECURITY;

-- Policies for class_development_areas
DROP POLICY IF EXISTS "Allow all select class_development_areas" ON public.class_development_areas;
CREATE POLICY "Allow all select class_development_areas" ON public.class_development_areas FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all insert class_development_areas" ON public.class_development_areas;
CREATE POLICY "Allow all insert class_development_areas" ON public.class_development_areas FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all update class_development_areas" ON public.class_development_areas;
CREATE POLICY "Allow all update class_development_areas" ON public.class_development_areas FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow all delete class_development_areas" ON public.class_development_areas;
CREATE POLICY "Allow all delete class_development_areas" ON public.class_development_areas FOR DELETE USING (true);

-- Policies for class_development_criteria
DROP POLICY IF EXISTS "Allow all select class_development_criteria" ON public.class_development_criteria;
CREATE POLICY "Allow all select class_development_criteria" ON public.class_development_criteria FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all insert class_development_criteria" ON public.class_development_criteria;
CREATE POLICY "Allow all insert class_development_criteria" ON public.class_development_criteria FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all update class_development_criteria" ON public.class_development_criteria;
CREATE POLICY "Allow all update class_development_criteria" ON public.class_development_criteria FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow all delete class_development_criteria" ON public.class_development_criteria;
CREATE POLICY "Allow all delete class_development_criteria" ON public.class_development_criteria FOR DELETE USING (true);

-- 4. Table Comments for Documentation
COMMENT ON TABLE public.class_development_areas IS 'Parent table storing Areas of Development configured per class (Nursery).';
COMMENT ON TABLE public.class_development_criteria IS 'Child table storing Criteria items and their Indonesian translations per Area of Development.';
