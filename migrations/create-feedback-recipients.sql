-- ============================================================
-- Migration: Konfigurasi Penerima Notifikasi Laporan Kendala (Feedback Recipients)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.system_feedback_recipients (
  id                    SERIAL PRIMARY KEY,
  user_id               INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  notify_on_new_ticket  BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_feedback_recipients_user ON public.system_feedback_recipients(user_id);

-- Aktifkan Row Level Security
ALTER TABLE public.system_feedback_recipients ENABLE ROW LEVEL SECURITY;

-- Kebijakan akses RLS
DROP POLICY IF EXISTS "Allow all read feedback recipients" ON public.system_feedback_recipients;
CREATE POLICY "Allow all read feedback recipients" 
  ON public.system_feedback_recipients FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Allow service role and admin manage feedback recipients" ON public.system_feedback_recipients;
CREATE POLICY "Allow service role and admin manage feedback recipients" 
  ON public.system_feedback_recipients FOR ALL 
  USING (true) WITH CHECK (true);
