-- ==============================================================================
-- CONNECT pyp_strand_assessment TO pyp_unit (unit_id FK + unit_number)
-- Links per-unit strand grades directly to Tab Class Units (public.pyp_unit),
-- enabling relational joins (Unit, LOI, KC, ATL, Strand Grades) & cascade cleanup,
-- while aggregating assessed units automatically for Semester Report Cards.
-- Copy & Run in Supabase SQL Editor
-- ==============================================================================

ALTER TABLE public.pyp_strand_assessment
ADD COLUMN IF NOT EXISTS unit_id BIGINT NOT NULL REFERENCES public.pyp_unit(id) ON DELETE CASCADE;

ALTER TABLE public.pyp_strand_assessment
ADD COLUMN IF NOT EXISTS unit_number INTEGER NOT NULL DEFAULT 1;

ALTER TABLE public.pyp_strand_assessment
DROP CONSTRAINT IF EXISTS uq_pyp_strand_eval;

ALTER TABLE public.pyp_strand_assessment
ADD CONSTRAINT uq_pyp_strand_eval
  UNIQUE (year_id, kelas_id, student_id, strand_id, semester, unit_id);

DROP INDEX IF EXISTS idx_pyp_strand_assess_lookup;
CREATE INDEX IF NOT EXISTS idx_pyp_strand_assess_lookup
  ON public.pyp_strand_assessment (year_id, kelas_id, subject_id, semester, unit_id);

CREATE INDEX IF NOT EXISTS idx_pyp_strand_assess_unit
  ON public.pyp_strand_assessment (unit_id);
