-- Add semester column to criterion_descriptors
-- semester = 0 → shared (applies to both S1 and S2, used as fallback)
-- semester = 1 → S1 only
-- semester = 2 → S2 only
-- Existing records will default to 0 (shared), maintaining backward compatibility.

ALTER TABLE criterion_descriptors
  ADD COLUMN IF NOT EXISTS semester SMALLINT NOT NULL DEFAULT 0;

ALTER TABLE criterion_descriptors
  ADD CONSTRAINT criterion_descriptors_semester_check
  CHECK (semester IN (0, 1, 2));

-- Drop old unique constraint and recreate with semester included
-- (try both possible auto-generated names)
ALTER TABLE criterion_descriptors
  DROP CONSTRAINT IF EXISTS criterion_descriptors_subject_group_id_myp_year_criterion_ban;
ALTER TABLE criterion_descriptors
  DROP CONSTRAINT IF EXISTS criterion_descriptors_subject_group_id_myp_year_criterion_b_key;
ALTER TABLE criterion_descriptors
  DROP CONSTRAINT IF EXISTS criterion_descriptors_unique;

ALTER TABLE criterion_descriptors
  ADD CONSTRAINT criterion_descriptors_unique
  UNIQUE (subject_group_id, myp_year, semester, criterion, band_min);
