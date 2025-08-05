-- Subject Table Fix - Migration
-- Memastikan tabel subject menggunakan field name yang benar

-- 1. Cek apakah kolom subject_name sudah ada, jika belum rename dari subject_nama
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
    
    -- Jika tabel subject belum ada, buat dengan struktur yang benar
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='subject') THEN
        CREATE TABLE subject (
            subject_id SERIAL PRIMARY KEY,
            subject_name VARCHAR(100) NOT NULL,
            subject_user_id INTEGER REFERENCES users(user_id),
            subject_unit_id INTEGER REFERENCES unit(unit_id)
        );
        
        -- Insert sample data
        INSERT INTO subject (subject_name, subject_user_id, subject_unit_id) VALUES 
        ('Mathematics', 2, 1),
        ('English Language', 3, 1),
        ('Science', 2, 2);
        
        RAISE NOTICE 'Subject table created with correct field names';
    END IF;
END $$;

-- 2. Update dokumentasi dengan comment
COMMENT ON COLUMN subject.subject_name IS 'Nama mata pelajaran (field name yang benar)';

-- 3. Pastikan index ada
CREATE INDEX IF NOT EXISTS idx_subject_name ON subject(subject_name);
CREATE INDEX IF NOT EXISTS idx_subject_user_id ON subject(subject_user_id);
CREATE INDEX IF NOT EXISTS idx_subject_unit_id ON subject(subject_unit_id);
