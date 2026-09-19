-- ==============================================================================
-- CHUNG CHUNG CHRISTIAN SCHOOL - ADMISSION STEPPER & EMAIL LOGS MIGRATION
-- ==============================================================================
-- Skema ini melengkapi alur 5-step pendaftaran terpadu di portal admin dan siswa:
-- 1. Registrasi Akun & Terbit Nomor Pendaftaran
-- 2. Verifikasi Pembayaran Biaya Formulir
-- 3. Biodata Siswa & Jadwal Tes/Wawancara (Termasuk Pendampingan Orang Tua)
-- 4. Observasi & Biaya Pendidikan (Diskon DPP/UDP & SPP/USEK, Cicilan Inhouse)
-- 5. Hasil Seleksi & Kelulusan (LoA / Keputusan Admisi)
-- Serta pencatatan audit trail email notifikasi di setiap tahapan.
-- ==============================================================================

-- 1. Pastikan kolom-kolom jadwal, pendampingan orang tua, dan tracking email di student_applications
ALTER TABLE public.student_applications
  ADD COLUMN IF NOT EXISTS test_date DATE NULL,
  ADD COLUMN IF NOT EXISTS test_session VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS interview_date DATE NULL,
  ADD COLUMN IF NOT EXISTS interview_session VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS schedule_notes TEXT NULL,
  ADD COLUMN IF NOT EXISTS parent_attendance_notes TEXT NULL,
  ADD COLUMN IF NOT EXISTS step1_email_sent_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS step2_email_sent_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS step3_email_sent_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS step4_email_sent_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS step5_email_sent_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS last_email_sent_type VARCHAR(100) NULL;

-- 2. Buat tabel audit trail log pengiriman email pendaftaran
CREATE TABLE IF NOT EXISTS public.admission_email_logs (
  log_id BIGSERIAL PRIMARY KEY,
  application_id INTEGER REFERENCES public.student_applications(application_id) ON DELETE CASCADE,
  application_number VARCHAR(50) NULL,
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255) NULL,
  email_step INTEGER NULL CHECK (email_step BETWEEN 1 AND 5),
  email_type VARCHAR(100) NOT NULL,
  subject TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'sent',
  resend_id VARCHAR(100) NULL,
  error_message TEXT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  sent_by INTEGER REFERENCES public.users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeks performa untuk query cepat di tab riwayat email
CREATE INDEX IF NOT EXISTS idx_admission_email_logs_app_id ON public.admission_email_logs(application_id);
CREATE INDEX IF NOT EXISTS idx_admission_email_logs_app_no ON public.admission_email_logs(application_number);
CREATE INDEX IF NOT EXISTS idx_admission_email_logs_email ON public.admission_email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_admission_email_logs_created ON public.admission_email_logs(created_at DESC);

-- 3. Kebijakan Keamanan (Row Level Security / RLS)
ALTER TABLE public.admission_email_logs ENABLE ROW LEVEL SECURITY;

-- Izinkan service_role dan user terautentikasi (admin/staff) membaca dan menulis log
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'admission_email_logs' AND policyname = 'allow_authenticated_all'
  ) THEN
    CREATE POLICY allow_authenticated_all ON public.admission_email_logs
      FOR ALL TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'admission_email_logs' AND policyname = 'allow_anon_select_for_verification'
  ) THEN
    CREATE POLICY allow_anon_select_for_verification ON public.admission_email_logs
      FOR SELECT TO anon
      USING (true);
  END IF;
END $$;

COMMENT ON TABLE public.admission_email_logs IS 'Audit trail pengiriman email notifikasi admisi siswa baru (PPDB/SPMB)';
