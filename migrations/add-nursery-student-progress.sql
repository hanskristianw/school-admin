-- ==============================================================================
-- Migration: Create nursery_student_progress table
-- Stores student developmental milestone scores across Term 1 - 4
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.nursery_student_progress (
    progress_id SERIAL PRIMARY KEY,
    kelas_id INTEGER NOT NULL REFERENCES public.kelas(kelas_id) ON DELETE CASCADE,
    student_user_id INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    criteria_id INTEGER NOT NULL REFERENCES public.class_development_criteria(criteria_id) ON DELETE CASCADE,
    term INTEGER NOT NULL CHECK (term BETWEEN 1 AND 4),
    score INTEGER NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 3),
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (student_user_id, criteria_id, term)
);

-- Index for fast lookup by class, student, and term
CREATE INDEX IF NOT EXISTS idx_nursery_progress_lookup 
ON public.nursery_student_progress(kelas_id, student_user_id, term);

-- Enable RLS and Permissive Policies
ALTER TABLE public.nursery_student_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all select nursery_student_progress" ON public.nursery_student_progress;
CREATE POLICY "Allow all select nursery_student_progress" ON public.nursery_student_progress FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all insert nursery_student_progress" ON public.nursery_student_progress;
CREATE POLICY "Allow all insert nursery_student_progress" ON public.nursery_student_progress FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all update nursery_student_progress" ON public.nursery_student_progress;
CREATE POLICY "Allow all update nursery_student_progress" ON public.nursery_student_progress FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow all delete nursery_student_progress" ON public.nursery_student_progress;
CREATE POLICY "Allow all delete nursery_student_progress" ON public.nursery_student_progress FOR DELETE USING (true);

COMMENT ON TABLE public.nursery_student_progress IS 'Stores Early Years / Nursery developmental milestone scores (0-3 boxes) per student, criteria, and term.';
