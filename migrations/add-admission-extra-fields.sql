-- Add extra fields to student_applications table
-- religion, nationality, domicile address, city, province, postal code

-- Make birth_date NOT NULL (update existing NULLs first if any)
-- UPDATE public.student_applications SET student_birth_date = '2000-01-01' WHERE student_birth_date IS NULL;
-- ALTER TABLE public.student_applications ALTER COLUMN student_birth_date SET NOT NULL;

-- Add new columns
ALTER TABLE public.student_applications
ADD COLUMN IF NOT EXISTS student_religion character varying(30) NULL,
ADD COLUMN IF NOT EXISTS student_nationality character varying(10) NULL DEFAULT 'WNI',
ADD COLUMN IF NOT EXISTS student_domicile_address text NULL,
ADD COLUMN IF NOT EXISTS student_city character varying(100) NULL,
ADD COLUMN IF NOT EXISTS student_province character varying(100) NULL,
ADD COLUMN IF NOT EXISTS student_postal_code character varying(10) NULL;

-- Add constraints
ALTER TABLE public.student_applications
ADD CONSTRAINT student_applications_religion_check CHECK (
  student_religion IS NULL OR student_religion::text = ANY (
    ARRAY['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Konghucu', 'Lainnya']::text[]
  )
);

ALTER TABLE public.student_applications
ADD CONSTRAINT student_applications_nationality_check CHECK (
  student_nationality IS NULL OR student_nationality::text = ANY (
    ARRAY['WNI', 'WNA']::text[]
  )
);

COMMENT ON COLUMN public.student_applications.student_religion IS 'Agama siswa';
COMMENT ON COLUMN public.student_applications.student_nationality IS 'Kewarganegaraan: WNI atau WNA';
COMMENT ON COLUMN public.student_applications.student_domicile_address IS 'Alamat domisili (jika berbeda dari alamat KTP)';
COMMENT ON COLUMN public.student_applications.student_city IS 'Kota domisili';
COMMENT ON COLUMN public.student_applications.student_province IS 'Provinsi (auto-filled dari kota)';
COMMENT ON COLUMN public.student_applications.student_postal_code IS 'Kode pos';
