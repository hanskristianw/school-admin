-- Add myp_year_s1 and myp_year_s2 to detail_kelas
-- Each subject-class pairing can specify a different MYP year reference
-- for Semester 1 and Semester 2 (e.g. S1=Year 1, S2=Year 3).
-- Nullable so existing records are not affected.

ALTER TABLE detail_kelas
  ADD COLUMN IF NOT EXISTS myp_year_s1 SMALLINT CHECK (myp_year_s1 IN (1, 2, 3, 4, 5)),
  ADD COLUMN IF NOT EXISTS myp_year_s2 SMALLINT CHECK (myp_year_s2 IN (1, 2, 3, 4, 5));

COMMENT ON COLUMN detail_kelas.myp_year_s1 IS
  'MYP year reference for Achievement Level Descriptors in Semester 1 (1, 3, or 5).';
COMMENT ON COLUMN detail_kelas.myp_year_s2 IS
  'MYP year reference for Achievement Level Descriptors in Semester 2 (1, 3, or 5).';
