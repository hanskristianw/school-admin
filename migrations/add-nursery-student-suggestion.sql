-- ==============================================================================
-- Migration: Add nursery_student_suggestion table
-- Description: Stores "Suggestion to move forward" holistic notes per student per Nursery class
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.nursery_student_suggestion (
  suggestion_id SERIAL PRIMARY KEY,
  kelas_id INTEGER NOT NULL REFERENCES public.kelas(kelas_id) ON DELETE CASCADE,
  student_user_id INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  suggestion_text TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_nursery_student_class_suggestion UNIQUE (kelas_id, student_user_id)
);

-- Index for fast lookups by class and student
CREATE INDEX IF NOT EXISTS idx_nursery_suggestion_lookup 
ON public.nursery_student_suggestion (kelas_id, student_user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.nursery_student_suggestion ENABLE ROW LEVEL SECURITY;

-- Permissive policies for authenticated users
CREATE POLICY "Allow all operations on nursery_student_suggestion for authenticated users"
ON public.nursery_student_suggestion
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Permissive policies for anon users (development)
CREATE POLICY "Allow all operations on nursery_student_suggestion for anon"
ON public.nursery_student_suggestion
FOR ALL
TO anon
USING (true)
WITH CHECK (true);
