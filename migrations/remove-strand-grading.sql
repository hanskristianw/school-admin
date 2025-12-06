-- Migration: Remove Strand-Based Grading
-- Date: 2024-12-06
-- Purpose: Simplify grading system to direct per-criterion grading (0-8)
--          instead of per-strand grading
--
-- IMPORTANT: 
-- - Strands and Rubrics tables are KEPT for assessment paper creation
-- - Only assessment_grade_strands table is removed as it's no longer used
-- - Grading is now done directly on criteria (A, B, C, D) with values 0-8
--
-- Changes:
-- 1. Drop assessment_grade_strands table (no longer needed)
-- 2. Update comments on assessment_grades table

-- ============================================
-- 1. DROP assessment_grade_strands TABLE
-- ============================================
-- This table stored per-strand grades which are no longer used
-- Grading is now directly on criterion_a_grade, criterion_b_grade, etc.

DROP TABLE IF EXISTS assessment_grade_strands CASCADE;

-- ============================================
-- 2. ADD COMMENT TO assessment_grades TABLE
-- ============================================
COMMENT ON TABLE assessment_grades IS 
'Stores student grades for assessments. Grading is done directly per criterion (A, B, C, D) with values 0-8. Final grade is calculated using IB MYP conversion (total 0-32 → grade 1-7).';

COMMENT ON COLUMN assessment_grades.criterion_a_grade IS 'Direct grade for Criterion A (0-8 scale)';
COMMENT ON COLUMN assessment_grades.criterion_b_grade IS 'Direct grade for Criterion B (0-8 scale)';
COMMENT ON COLUMN assessment_grades.criterion_c_grade IS 'Direct grade for Criterion C (0-8 scale)';
COMMENT ON COLUMN assessment_grades.criterion_d_grade IS 'Direct grade for Criterion D (0-8 scale)';
COMMENT ON COLUMN assessment_grades.final_grade IS 'IB MYP final grade (1-7) calculated from sum of criteria grades';

-- ============================================
-- NOTES
-- ============================================
-- The following tables are KEPT and still in use:
-- - strands: Contains strand definitions (i, ii, iii, iv) per criterion per MYP year
-- - rubrics: Contains rubric descriptors for each strand
-- 
-- These are used for:
-- 1. Assessment paper generation (showing what strands are being assessed)
-- 2. Reference for teachers when grading
-- 3. Documentation of IB MYP standards
--
-- Grading flow is now:
-- 1. Teacher views assessment with criteria (A, B, C, D)
-- 2. Teacher gives direct grade (0-8) for each criterion
-- 3. System calculates final grade using IB MYP conversion table:
--    - Total 0-5   → Grade 1
--    - Total 6-9   → Grade 2
--    - Total 10-14 → Grade 3
--    - Total 15-18 → Grade 4
--    - Total 19-23 → Grade 5
--    - Total 24-27 → Grade 6
--    - Total 28-32 → Grade 7
