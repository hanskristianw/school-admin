-- ==============================================================================
-- HEALTH REPORT SCHEMA (PYP & MYP SUPPORT)
-- Run this script in the Supabase SQL Editor
-- ==============================================================================

-- 1. HEALTH REPORT CARD (Header per Student, Year, Semester)
CREATE TABLE IF NOT EXISTS public.health_report_card (
    id SERIAL PRIMARY KEY,
    student_user_id BIGINT NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    kelas_id BIGINT NOT NULL REFERENCES public.kelas(kelas_id) ON DELETE CASCADE,
    year_id BIGINT NOT NULL REFERENCES public.year(year_id) ON DELETE CASCADE,
    semester SMALLINT NOT NULL DEFAULT 1,
    report_type VARCHAR(10) DEFAULT 'PYP', -- 'PYP' or 'MYP'
    allergy TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_health_report_card_student_year_sem UNIQUE (student_user_id, year_id, semester)
);

-- Ensure report_type column exists if table was already created earlier
ALTER TABLE public.health_report_card 
ADD COLUMN IF NOT EXISTS report_type VARCHAR(10) DEFAULT 'PYP';


-- 2. GROWTH & DEVELOPMENT (TB & BB)
CREATE TABLE IF NOT EXISTS public.health_growth_development (
    id SERIAL PRIMARY KEY,
    health_report_id INTEGER NOT NULL REFERENCES public.health_report_card(id) ON DELETE CASCADE,
    month VARCHAR(10) NOT NULL, -- 'JAN', 'FEB', 'AUG', etc.
    height NUMERIC,             -- Tinggi Badan / TB (cm)
    weight NUMERIC,             -- Berat Badan / BB (kg)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- 3. PHYSICAL & CLINICAL EXAMINATION (Physical Check)
-- Accommodates both PYP and MYP requirements
CREATE TABLE IF NOT EXISTS public.health_physical_check (
    id SERIAL PRIMARY KEY,
    health_report_id INTEGER NOT NULL REFERENCES public.health_report_card(id) ON DELETE CASCADE,
    month VARCHAR(10) NOT NULL,
    -- Common Clinical Parameters (PYP & MYP)
    ear VARCHAR(100),              -- Ear / Telinga (Clean, Serumen, Serumen -/+)
    eye VARCHAR(100),              -- Eye / Mata (Normal, Ka Ki 5/20, KC Normal, dll)
    dental VARCHAR(100),           -- Dental / Gigi (Normal, Karies, dll)
    blood_pressure VARCHAR(50),    -- TD / Tekanan Darah (90/60, 120/80, dll)
    -- MYP Specific Clinical Parameters (SMP / Remaja)
    hair VARCHAR(100),             -- Hair / Rambut
    nails VARCHAR(100),            -- Nails / Kuku
    gda VARCHAR(50),               -- GDA / Gula Darah Acak (mg/dL)
    hb VARCHAR(50),                -- HB / Hemoglobin (g/dL)
    color_blindness VARCHAR(50),   -- Tes Buta Warna (Normal / Parsial)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- If table already exists, alter table to add missing clinical columns
ALTER TABLE public.health_physical_check
ADD COLUMN IF NOT EXISTS eye VARCHAR(100),
ADD COLUMN IF NOT EXISTS dental VARCHAR(100),
ADD COLUMN IF NOT EXISTS blood_pressure VARCHAR(50),
ADD COLUMN IF NOT EXISTS gda VARCHAR(50),
ADD COLUMN IF NOT EXISTS hb VARCHAR(50),
ADD COLUMN IF NOT EXISTS color_blindness VARCHAR(50);


-- 4. IMMUNIZATION (Catatan Imunisasi / Vaksinasi)
CREATE TABLE IF NOT EXISTS public.health_immunization (
    id SERIAL PRIMARY KEY,
    health_report_id INTEGER NOT NULL REFERENCES public.health_report_card(id) ON DELETE CASCADE,
    type VARCHAR(150) NOT NULL, -- Jenis Vaksin (e.g. Hepatitis B, Polio, MMR)
    date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- 5. HEALTH RECORD (Rekam Medis Kejadian Sakit / Tindakan UKS)
CREATE TABLE IF NOT EXISTS public.health_record (
    id SERIAL PRIMARY KEY,
    health_report_id INTEGER NOT NULL REFERENCES public.health_report_card(id) ON DELETE CASCADE,
    month VARCHAR(10),
    date_day INTEGER,           -- Tanggal kejadian (1-31)
    chronology TEXT,            -- Kronologi keluhan / kejadian sakit
    treatment TEXT,             -- Tindakan pengobatan / pertolongan pertama UKS
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- 6. INDEXES FOR FAST QUERYING
CREATE INDEX IF NOT EXISTS idx_hr_card_student_year_sem ON public.health_report_card (student_user_id, year_id, semester);
CREATE INDEX IF NOT EXISTS idx_hr_growth_report_id ON public.health_growth_development (health_report_id);
CREATE INDEX IF NOT EXISTS idx_hr_physical_report_id ON public.health_physical_check (health_report_id);
CREATE INDEX IF NOT EXISTS idx_hr_immunization_report_id ON public.health_immunization (health_report_id);
CREATE INDEX IF NOT EXISTS idx_hr_record_report_id ON public.health_record (health_report_id);


-- 7. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.health_report_card ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_growth_development ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_physical_check ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_immunization ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_record ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for health_report_card" ON public.health_report_card;
CREATE POLICY "Allow all for health_report_card" ON public.health_report_card FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for health_growth_development" ON public.health_growth_development;
CREATE POLICY "Allow all for health_growth_development" ON public.health_growth_development FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for health_physical_check" ON public.health_physical_check;
CREATE POLICY "Allow all for health_physical_check" ON public.health_physical_check FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for health_immunization" ON public.health_immunization;
CREATE POLICY "Allow all for health_immunization" ON public.health_immunization FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for health_record" ON public.health_record;
CREATE POLICY "Allow all for health_record" ON public.health_record FOR ALL USING (true) WITH CHECK (true);
