-- =====================================================
-- ADD MYP YEAR LEVEL TO KELAS TABLE
-- =====================================================
-- Purpose: Allow explicit mapping of kelas to MYP year level (1-5)
--          This is needed because MYP year level depends on both
--          grade AND semester (e.g., Grade 8 Semester 1 = MYP Year 1,
--          but Grade 8 Semester 2 = MYP Year 3)

-- Add myp_year_level column to kelas table
ALTER TABLE kelas
ADD COLUMN IF NOT EXISTS kelas_myp_year INT;

-- Add check constraint to ensure valid MYP year levels (1-5)
ALTER TABLE kelas
ADD CONSTRAINT kelas_myp_year_check 
CHECK (kelas_myp_year IS NULL OR (kelas_myp_year >= 1 AND kelas_myp_year <= 5));

-- Add comment
COMMENT ON COLUMN kelas.kelas_myp_year IS 
'MYP Year Level (1-5). Required for accurate strand/rubric selection. Grade 8 Semester 1 = Year 1, Grade 8 Semester 2 = Year 3, etc.';

-- Example data updates (adjust based on your actual kelas data)
-- UPDATE kelas SET kelas_myp_year = 1 WHERE kelas_nama LIKE 'Grade 6%' OR kelas_nama LIKE '6%';
-- UPDATE kelas SET kelas_myp_year = 2 WHERE kelas_nama LIKE 'Grade 7%' OR kelas_nama LIKE '7%';
-- UPDATE kelas SET kelas_myp_year = 3 WHERE kelas_nama LIKE 'Grade 8%' OR kelas_nama LIKE '8%'; -- Default, may need manual adjustment
-- UPDATE kelas SET kelas_myp_year = 4 WHERE kelas_nama LIKE 'Grade 9%' OR kelas_nama LIKE '9%';
-- UPDATE kelas SET kelas_myp_year = 5 WHERE kelas_nama LIKE 'Grade 10%' OR kelas_nama LIKE '10%';

-- Verification query
SELECT 
    kelas_id,
    kelas_nama,
    kelas_myp_year,
    year.year_name as tahun_ajaran
FROM kelas
LEFT JOIN year ON kelas.kelas_year_id = year.year_id
ORDER BY kelas_nama;
