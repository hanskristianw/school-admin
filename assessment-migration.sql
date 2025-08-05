-- Assessment Management - SQL Migration
-- Menambahkan tabel assessment dan menu untuk assessment approval
-- Updated untuk menggunakan field name yang benar

-- 0. Pastikan tabel subject menggunakan field name yang benar
DO $$ 
BEGIN
    -- Cek apakah kolom subject_nama ada dan subject_name tidak ada
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='subject' AND column_name='subject_nama')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='subject' AND column_name='subject_name') THEN
        -- Rename kolom dari subject_nama ke subject_name
        ALTER TABLE subject RENAME COLUMN subject_nama TO subject_name;
        RAISE NOTICE 'Column subject_nama renamed to subject_name';
    END IF;
END $$;

-- 1. Membuat tabel assessment
CREATE TABLE IF NOT EXISTS assessment (
    assessment_id SERIAL PRIMARY KEY,
    assessment_nama VARCHAR(100) NOT NULL,
    assessment_tanggal DATE NOT NULL,
    assessment_keterangan TEXT,
    assessment_status INTEGER NOT NULL DEFAULT 0,
    assessment_user_id INTEGER NOT NULL REFERENCES users(user_id),
    assessment_subject_id INTEGER NOT NULL REFERENCES subject(subject_id)
);

-- 2. Menambahkan menu Assessment Approval dan Teacher Assessment Submission
INSERT INTO menus (menu_name, menu_path, menu_icon, menu_order, menu_parent_id) VALUES
('Assessment Approval', '/data/assessment_approval', 'fas fa-clipboard-check', 6, 2),
('Teacher', NULL, 'fas fa-chalkboard-teacher', 3, NULL),
('Assessment Submission', '/teacher/assessment_submission', 'fas fa-paper-plane', 1, (SELECT menu_id FROM menus WHERE menu_name = 'Teacher'))
ON CONFLICT DO NOTHING;

-- 3. Sample data assessment
INSERT INTO assessment (assessment_nama, assessment_tanggal, assessment_keterangan, assessment_status, assessment_user_id, assessment_subject_id) VALUES 
('Ujian Tengah Semester - Matematika', '2025-03-15', 'Ujian tengah semester untuk kelas Elementary', 0, 2, 1),
('Quiz Harian - English Language', '2025-03-10', 'Quiz vocabulary dan grammar dasar', 0, 3, 2),
('Praktikum - Science', '2025-03-20', 'Praktikum eksperimen sederhana untuk siswa', 1, 2, 3),
('Assessment Bulanan - Matematika', '2025-02-28', 'Penilaian bulanan kemampuan matematika', 2, 2, 1),
('Final Test - English', '2025-04-05', 'Ujian akhir semester bahasa Inggris', 0, 3, 2)
ON CONFLICT DO NOTHING;

-- 4. Menambahkan indexes untuk performa
CREATE INDEX IF NOT EXISTS idx_assessment_user_id ON assessment(assessment_user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_subject_id ON assessment(assessment_subject_id);
CREATE INDEX IF NOT EXISTS idx_assessment_status ON assessment(assessment_status);
CREATE INDEX IF NOT EXISTS idx_assessment_tanggal ON assessment(assessment_tanggal);

-- 5. Memberikan permission menu untuk role admin dan guru
-- Admin mendapat akses Assessment Approval
INSERT INTO menu_permissions (menu_id, role_id)
SELECT m.menu_id, r.role_id
FROM menus m
CROSS JOIN role r
WHERE m.menu_path = '/data/assessment_approval' 
  AND r.role_name = 'admin'
ON CONFLICT (menu_id, role_id) DO NOTHING;

-- Guru mendapat akses Assessment Submission
INSERT INTO menu_permissions (menu_id, role_id)
SELECT m.menu_id, r.role_id
FROM menus m
CROSS JOIN role r
WHERE m.menu_name = 'Teacher'
  AND r.role_name IN ('guru', 'admin')
ON CONFLICT (menu_id, role_id) DO NOTHING;

INSERT INTO menu_permissions (menu_id, role_id)
SELECT m.menu_id, r.role_id
FROM menus m
CROSS JOIN role r
WHERE m.menu_path = '/teacher/assessment_submission'
  AND r.role_name IN ('guru', 'admin')
ON CONFLICT (menu_id, role_id) DO NOTHING;

-- 6. Comment untuk dokumentasi
COMMENT ON TABLE assessment IS 'Tabel untuk menyimpan data assessment/penilaian dengan sistem persetujuan';
COMMENT ON COLUMN assessment.assessment_status IS 'Status persetujuan: 0=Menunggu, 1=Disetujui, 2=Ditolak';
COMMENT ON COLUMN assessment.assessment_user_id IS 'ID pengajar yang membuat assessment';
COMMENT ON COLUMN assessment.assessment_subject_id IS 'ID mata pelajaran terkait assessment';
