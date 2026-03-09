-- Update myp_year constraints to allow years 1, 2, 3, 4, 5 (was 1, 3, 5 only)

ALTER TABLE detail_kelas DROP CONSTRAINT IF EXISTS detail_kelas_myp_year_s1_check;
ALTER TABLE detail_kelas DROP CONSTRAINT IF EXISTS detail_kelas_myp_year_s2_check;
ALTER TABLE detail_kelas ADD CONSTRAINT detail_kelas_myp_year_s1_check CHECK (myp_year_s1 IN (1, 2, 3, 4, 5));
ALTER TABLE detail_kelas ADD CONSTRAINT detail_kelas_myp_year_s2_check CHECK (myp_year_s2 IN (1, 2, 3, 4, 5));

ALTER TABLE criterion_descriptors DROP CONSTRAINT IF EXISTS criterion_descriptors_myp_year_check;
ALTER TABLE criterion_descriptors ADD CONSTRAINT criterion_descriptors_myp_year_check CHECK (myp_year IN (1, 2, 3, 4, 5));
