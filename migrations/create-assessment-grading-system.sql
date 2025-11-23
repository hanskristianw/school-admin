-- =====================================================
-- ASSESSMENT GRADING SYSTEM
-- =====================================================
-- Purpose: Store student grades for assessments based on IB MYP criteria and strands
-- 
-- Flow:
-- 1. Teacher creates assessment (already exists)
-- 2. Teacher clicks "Input Nilai" on assessment card
-- 3. For each student, teacher inputs grade (1-8) per strand
-- 4. System calculates final criterion grade from strand grades
-- 5. Final assessment grade (1-7) calculated from all 4 criteria (A-D)

-- =====================================================
-- 1. ASSESSMENT GRADES (Header/Summary per Student)
-- =====================================================
CREATE TABLE IF NOT EXISTS assessment_grades (
    grade_id BIGSERIAL PRIMARY KEY,
    assessment_id INTEGER NOT NULL REFERENCES assessment(assessment_id) ON DELETE CASCADE,
    detail_siswa_id INTEGER NOT NULL REFERENCES detail_siswa(detail_siswa_id) ON DELETE CASCADE,
    
    -- Final criterion grades (0-8 scale, calculated from strands)
    criterion_a_grade SMALLINT CHECK (criterion_a_grade >= 0 AND criterion_a_grade <= 8),
    criterion_b_grade SMALLINT CHECK (criterion_b_grade >= 0 AND criterion_b_grade <= 8),
    criterion_c_grade SMALLINT CHECK (criterion_c_grade >= 0 AND criterion_c_grade <= 8),
    criterion_d_grade SMALLINT CHECK (criterion_d_grade >= 0 AND criterion_d_grade <= 8),
    
    -- Final assessment grade (1-7 scale, calculated from criteria total)
    final_grade SMALLINT CHECK (final_grade >= 1 AND final_grade <= 7),
    
    -- Optional comments
    comments TEXT,
    
    -- Audit fields
    created_by_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    updated_by_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one grade record per student per assessment
    CONSTRAINT uq_assessment_student UNIQUE (assessment_id, detail_siswa_id)
);

-- Index for faster lookups
CREATE INDEX idx_assessment_grades_assessment ON assessment_grades(assessment_id);
CREATE INDEX idx_assessment_grades_student ON assessment_grades(detail_siswa_id);

-- =====================================================
-- 2. ASSESSMENT GRADE STRANDS (Detail per Strand)
-- =====================================================
CREATE TABLE IF NOT EXISTS assessment_grade_strands (
    grade_strand_id BIGSERIAL PRIMARY KEY,
    grade_id BIGINT NOT NULL REFERENCES assessment_grades(grade_id) ON DELETE CASCADE,
    strand_id BIGINT NOT NULL REFERENCES strands(strand_id) ON DELETE CASCADE,
    
    -- Grade for this specific strand (0-8 scale)
    strand_grade SMALLINT NOT NULL CHECK (strand_grade >= 0 AND strand_grade <= 8),
    
    -- Optional: teacher notes per strand
    notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one grade per strand per student assessment
    CONSTRAINT uq_grade_strand UNIQUE (grade_id, strand_id)
);

-- Index for faster lookups
CREATE INDEX idx_grade_strands_grade ON assessment_grade_strands(grade_id);
CREATE INDEX idx_grade_strands_strand ON assessment_grade_strands(strand_id);

-- =====================================================
-- 3. HELPER FUNCTION: Calculate Final Grade (1-7 from total 0-32)
-- =====================================================
-- IB MYP conversion scale:
-- 1-5   → Grade 1
-- 6-9   → Grade 2
-- 10-14 → Grade 3
-- 15-18 → Grade 4
-- 19-23 → Grade 5
-- 24-27 → Grade 6
-- 28-32 → Grade 7

CREATE OR REPLACE FUNCTION calculate_final_grade(total_score INTEGER)
RETURNS SMALLINT AS $$
BEGIN
    IF total_score IS NULL OR total_score < 1 THEN
        RETURN 1;
    ELSIF total_score <= 5 THEN
        RETURN 1;
    ELSIF total_score <= 9 THEN
        RETURN 2;
    ELSIF total_score <= 14 THEN
        RETURN 3;
    ELSIF total_score <= 18 THEN
        RETURN 4;
    ELSIF total_score <= 23 THEN
        RETURN 5;
    ELSIF total_score <= 27 THEN
        RETURN 6;
    ELSE
        RETURN 7;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- 4. COMMENTS AND USAGE NOTES
-- =====================================================
-- 
-- WORKFLOW:
-- 1. Teacher creates assessment with selected criteria (A, B, C, D)
-- 2. Teacher clicks "Input Nilai" button on assessment card
-- 3. Modal opens showing all students in that class
-- 4. For each student, expand to see all strands for selected criteria
-- 5. Teacher inputs grade (1-8) for each strand
-- 6. Click Save:
--    a. Insert/Update assessment_grades record
--    b. Insert/Update assessment_grade_strands for each strand
--    c. Calculate criterion_X_grade = AVG or MAX of strands for that criterion
--    d. Calculate final_grade using calculate_final_grade(sum of 4 criteria)
--
-- CALCULATION RULES:
-- - Each criterion has multiple strands (i, ii, iii, iv)
-- - Criterion grade = HIGHEST strand grade (as per IB MYP best-fit approach)
-- - Final grade = calculate_final_grade(A + B + C + D)
--
-- EXAMPLE:
-- Assessment uses Criteria A and B
-- Student X:
--   - Criterion A: strand i=6, strand ii=7, strand iii=5, strand iv=6
--     → criterion_a_grade = 7 (highest)
--   - Criterion B: strand i=5, strand ii=6, strand iii=6, strand iv=5
--     → criterion_b_grade = 6 (highest)
--   - Total = 7 + 6 = 13 → final_grade = 3
--
-- QUERY EXAMPLES:
-- 
-- Get all grades for an assessment:
-- SELECT ag.*, u.user_nama_depan, u.user_nama_belakang
-- FROM assessment_grades ag
-- JOIN detail_siswa ds ON ag.detail_siswa_id = ds.detail_siswa_id
-- JOIN users u ON ds.detail_siswa_user_id = u.user_id
-- WHERE ag.assessment_id = ?;
--
-- Get strand details for a student:
-- SELECT ags.*, st.label, st.content, c.code
-- FROM assessment_grade_strands ags
-- JOIN strands st ON ags.strand_id = st.strand_id
-- JOIN criteria c ON st.criterion_id = c.criterion_id
-- WHERE ags.grade_id = ?
-- ORDER BY c.code, st.label;
--
-- Get all students without grades for an assessment:
-- SELECT ds.*, u.user_nama_depan, u.user_nama_belakang
-- FROM detail_siswa ds
-- JOIN users u ON ds.detail_siswa_user_id = u.user_id
-- JOIN assessment a ON a.assessment_detail_kelas_id = ds.detail_siswa_detail_kelas_id
-- LEFT JOIN assessment_grades ag ON ag.assessment_id = a.assessment_id AND ag.detail_siswa_id = ds.detail_siswa_id
-- WHERE a.assessment_id = ? AND ag.grade_id IS NULL;
