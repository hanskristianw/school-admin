-- Migration: Add `semester` column to `pyp_unit` table for PYP Unit of Inquiry Planners
-- Date: 2026-08-20

-- 1. Add semester column to pyp_unit (1 = Semester 1, 2 = Semester 2)
ALTER TABLE public.pyp_unit 
ADD COLUMN IF NOT EXISTS semester smallint NOT NULL DEFAULT 1;

-- 2. Optional lookup index for class units filtering
CREATE INDEX IF NOT EXISTS idx_pyp_unit_kelas_year_sem 
ON public.pyp_unit (kelas_id, year_name, semester);

COMMENT ON COLUMN public.pyp_unit.semester IS '1 = Semester 1, 2 = Semester 2';
