-- =====================================================
-- ADMISSION LEVEL (Jenjang Pendaftaran)
-- Subdivides academic units into enrollment levels
-- e.g. PYP → Nursery 1, Nursery 2, K1, K2, Elementary 1-6
--      MYP → Junior High School
--      DP  → Senior High School
-- =====================================================

-- 1. Create admission_level table
CREATE TABLE IF NOT EXISTS public.admission_level (
  level_id SERIAL NOT NULL,
  unit_id INTEGER NOT NULL,
  level_name VARCHAR(100) NOT NULL,
  level_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT admission_level_pkey PRIMARY KEY (level_id),
  CONSTRAINT admission_level_unit_fkey FOREIGN KEY (unit_id) REFERENCES unit(unit_id) ON DELETE CASCADE,
  CONSTRAINT uq_admission_level UNIQUE (unit_id, level_name)
);

CREATE INDEX IF NOT EXISTS idx_admission_level_unit ON public.admission_level(unit_id);
CREATE INDEX IF NOT EXISTS idx_admission_level_active ON public.admission_level(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE public.admission_level ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'admission_level' AND policyname = 'dev_all_admission_level'
  ) THEN
    CREATE POLICY "dev_all_admission_level" ON public.admission_level FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 2. Add level_id to student_applications
ALTER TABLE public.student_applications
  ADD COLUMN IF NOT EXISTS level_id INTEGER REFERENCES public.admission_level(level_id);

CREATE INDEX IF NOT EXISTS idx_student_applications_level ON public.student_applications(level_id);

-- 3. Add level_id + student_category to udp_definition
ALTER TABLE public.udp_definition
  ADD COLUMN IF NOT EXISTS level_id INTEGER REFERENCES public.admission_level(level_id);

ALTER TABLE public.udp_definition
  ADD COLUMN IF NOT EXISTS student_category VARCHAR(20) NOT NULL DEFAULT 'eksternal';

-- Drop old unique constraint and create new one (allows multiple periods per level per year)
ALTER TABLE public.udp_definition DROP CONSTRAINT IF EXISTS uq_udp_def;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_udp_def_level') THEN
    ALTER TABLE public.udp_definition DROP CONSTRAINT uq_udp_def_level;
  END IF;
  ALTER TABLE public.udp_definition ADD CONSTRAINT uq_udp_def_level UNIQUE (level_id, year_id, student_category, effective_from);
END $$;

-- Check constraint for student_category
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'udp_definition_student_category_check'
  ) THEN
    ALTER TABLE public.udp_definition
      ADD CONSTRAINT udp_definition_student_category_check
      CHECK (student_category IN ('eksternal', 'internal'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_udp_level_year ON public.udp_definition(level_id, year_id);

-- 4. Add level_id to school_fee_definition
ALTER TABLE public.school_fee_definition
  ADD COLUMN IF NOT EXISTS level_id INTEGER REFERENCES public.admission_level(level_id);

-- Drop old unique constraint and create new one
ALTER TABLE public.school_fee_definition DROP CONSTRAINT IF EXISTS uq_school_fee_def;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_school_fee_def_level') THEN
    ALTER TABLE public.school_fee_definition ADD CONSTRAINT uq_school_fee_def_level UNIQUE (level_id, year_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_school_fee_level_year ON public.school_fee_definition(level_id, year_id);

-- 5. Add level_id to fee_discount (optional per-level discounts)
ALTER TABLE public.fee_discount
  ADD COLUMN IF NOT EXISTS level_id INTEGER REFERENCES public.admission_level(level_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_admission_level_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_admission_level_updated') THEN
    CREATE TRIGGER trigger_admission_level_updated
      BEFORE UPDATE ON public.admission_level
      FOR EACH ROW EXECUTE FUNCTION update_admission_level_timestamp();
  END IF;
END $$;
