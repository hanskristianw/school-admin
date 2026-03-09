-- =====================================================
-- SUBJECT GROUP & CRITERION DESCRIPTORS
-- =====================================================

-- 1. Subject Group table
CREATE TABLE IF NOT EXISTS subject_group (
  id    SERIAL PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE
);

-- 2. Add subject_group_id column to subject table
ALTER TABLE subject
  ADD COLUMN IF NOT EXISTS subject_group_id INTEGER REFERENCES subject_group(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_subject_group ON subject(subject_group_id);

-- 3. Criterion Descriptors table
CREATE TABLE IF NOT EXISTS criterion_descriptors (
  id               SERIAL PRIMARY KEY,
  subject_group_id INTEGER NOT NULL REFERENCES subject_group(id) ON DELETE CASCADE,
  myp_year         SMALLINT NOT NULL CHECK (myp_year IN (1, 2, 3, 4, 5)),
  criterion        CHAR(1) NOT NULL CHECK (criterion IN ('A','B','C','D')),
  band_min         SMALLINT NOT NULL CHECK (band_min IN (1,3,5,7)),
  band_max         SMALLINT NOT NULL CHECK (band_max IN (2,4,6,8)),
  descriptor       TEXT,
  UNIQUE(subject_group_id, myp_year, criterion, band_min)
);

CREATE INDEX IF NOT EXISTS idx_criterion_descriptors_group ON criterion_descriptors(subject_group_id);
CREATE INDEX IF NOT EXISTS idx_criterion_descriptors_lookup ON criterion_descriptors(subject_group_id, myp_year, criterion);
