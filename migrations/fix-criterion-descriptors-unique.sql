-- Fix unique constraint on criterion_descriptors to include semester column
-- Run this if the previous migration partially succeeded

ALTER TABLE criterion_descriptors
  DROP CONSTRAINT IF EXISTS criterion_descriptors_subject_group_id_myp_year_criterion_ban;
ALTER TABLE criterion_descriptors
  DROP CONSTRAINT IF EXISTS criterion_descriptors_subject_group_id_myp_year_criterion_b_key;
ALTER TABLE criterion_descriptors
  DROP CONSTRAINT IF EXISTS criterion_descriptors_unique;

ALTER TABLE criterion_descriptors
  ADD CONSTRAINT criterion_descriptors_unique
  UNIQUE (subject_group_id, myp_year, semester, criterion, band_min);
