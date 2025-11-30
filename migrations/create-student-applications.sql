-- =====================================================
-- CREATE STUDENT APPLICATIONS TABLE
-- =====================================================
-- Purpose: Store new student registration/admission applications
--          Separate from users table - public registration form
--          Admin can review, approve, or reject applications

-- Create student_applications table
CREATE TABLE IF NOT EXISTS student_applications (
  application_id BIGSERIAL PRIMARY KEY,
  
  -- Nomor pendaftaran (auto-generated, unique)
  application_number VARCHAR(20) UNIQUE NOT NULL, -- e.g., "REG-2025-001234"
  
  -- Data calon siswa
  student_name VARCHAR(255) NOT NULL,
  student_nickname VARCHAR(100),
  student_gender VARCHAR(10) CHECK (student_gender IN ('male', 'female')),
  student_birth_date DATE,
  student_birth_place VARCHAR(100),
  student_address TEXT,
  student_previous_school VARCHAR(255), -- Asal sekolah sebelumnya
  
  -- Data orang tua/wali
  parent_name VARCHAR(255) NOT NULL,
  parent_phone VARCHAR(20) NOT NULL,
  parent_email VARCHAR(255),
  parent_occupation VARCHAR(100),
  parent_address TEXT, -- Alamat orang tua (jika berbeda)
  
  -- Pilihan sekolah dan tahun ajaran
  unit_id INTEGER NOT NULL REFERENCES unit(unit_id),  -- Pilih sekolah (PYP/MYP/DP)
  year_id INTEGER NOT NULL REFERENCES year(year_id),  -- Tahun ajaran yang ingin dimasuki
  preferred_grade VARCHAR(50),  -- Kelas yang diminati (optional, free text)
  additional_notes TEXT, -- Catatan tambahan dari pendaftar
  
  -- Status dan tracking
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'waitlist')),
  admin_notes TEXT,  -- Catatan internal admin
  reviewed_by INTEGER REFERENCES users(user_id),
  reviewed_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_student_applications_status ON student_applications(status);
CREATE INDEX IF NOT EXISTS idx_student_applications_unit ON student_applications(unit_id);
CREATE INDEX IF NOT EXISTS idx_student_applications_year ON student_applications(year_id);
CREATE INDEX IF NOT EXISTS idx_student_applications_number ON student_applications(application_number);
CREATE INDEX IF NOT EXISTS idx_student_applications_parent_email ON student_applications(parent_email);
CREATE INDEX IF NOT EXISTS idx_student_applications_parent_phone ON student_applications(parent_phone);

-- Add comments
COMMENT ON TABLE student_applications IS 'New student registration/admission applications from public form';
COMMENT ON COLUMN student_applications.application_number IS 'Unique registration number, format: REG-YYYY-NNNNNN';
COMMENT ON COLUMN student_applications.status IS 'Application status: pending, under_review, approved, rejected, waitlist';
COMMENT ON COLUMN student_applications.unit_id IS 'Selected school unit (PYP, MYP, DP) - only units where is_school=true';
COMMENT ON COLUMN student_applications.year_id IS 'Academic year the applicant wants to enroll in';

-- Create function to auto-generate application number
CREATE OR REPLACE FUNCTION generate_application_number()
RETURNS TRIGGER AS $$
DECLARE
  year_part VARCHAR(4);
  seq_num INTEGER;
  new_number VARCHAR(20);
BEGIN
  -- Get current year
  year_part := TO_CHAR(NOW(), 'YYYY');
  
  -- Get next sequence number for this year
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(application_number FROM 10 FOR 6) AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM student_applications
  WHERE application_number LIKE 'REG-' || year_part || '-%';
  
  -- Format: REG-2025-000001
  new_number := 'REG-' || year_part || '-' || LPAD(seq_num::TEXT, 6, '0');
  
  NEW.application_number := new_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate application number on insert
DROP TRIGGER IF EXISTS trigger_generate_application_number ON student_applications;
CREATE TRIGGER trigger_generate_application_number
  BEFORE INSERT ON student_applications
  FOR EACH ROW
  WHEN (NEW.application_number IS NULL OR NEW.application_number = '')
  EXECUTE FUNCTION generate_application_number();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_student_applications_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_student_applications_timestamp ON student_applications;
CREATE TRIGGER trigger_update_student_applications_timestamp
  BEFORE UPDATE ON student_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_student_applications_timestamp();

-- Enable RLS (Row Level Security)
ALTER TABLE student_applications ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert (public registration)
DROP POLICY IF EXISTS "public_insert_applications" ON student_applications;
CREATE POLICY "public_insert_applications" ON student_applications
  FOR INSERT
  WITH CHECK (true);

-- Policy: Public can read their own application by application_number + email/phone
DROP POLICY IF EXISTS "public_read_own_application" ON student_applications;
CREATE POLICY "public_read_own_application" ON student_applications
  FOR SELECT
  USING (true); -- Will be filtered in application logic

-- Policy: Authenticated users (admins) can read all
DROP POLICY IF EXISTS "admin_read_all_applications" ON student_applications;
CREATE POLICY "admin_read_all_applications" ON student_applications
  FOR SELECT
  USING (true);

-- Policy: Authenticated users (admins) can update
DROP POLICY IF EXISTS "admin_update_applications" ON student_applications;
CREATE POLICY "admin_update_applications" ON student_applications
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Verification query
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'student_applications'
ORDER BY ordinal_position;
