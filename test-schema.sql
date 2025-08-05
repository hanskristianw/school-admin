-- Test Query untuk Verifikasi Schema
-- Jalankan query ini untuk memastikan semua tabel dan field sudah benar

-- 1. Cek struktur tabel subject
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'subject'
ORDER BY ordinal_position;

-- 2. Cek struktur tabel assessment (jika sudah ada)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'assessment'
ORDER BY ordinal_position;

-- 3. Test query assessment dengan join
SELECT a.assessment_id, a.assessment_nama,
       u.user_nama_depan || ' ' || u.user_nama_belakang as teacher_name,
       s.subject_name as subject_name
FROM assessment a
LEFT JOIN users u ON a.assessment_user_id = u.user_id
LEFT JOIN subject s ON a.assessment_subject_id = s.subject_id
LIMIT 5;

-- 4. Cek data subject yang ada
SELECT subject_id, subject_name, subject_user_id, subject_unit_id
FROM subject
ORDER BY subject_id
LIMIT 10;

-- 5. Cek menu yang terkait assessment
SELECT menu_id, menu_name, menu_path
FROM menus
WHERE menu_path LIKE '%assessment%';

-- 6. Test foreign key relationships
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND (tc.table_name='assessment' OR tc.table_name='subject');
