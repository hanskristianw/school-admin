-- ============================================================
-- Migrasi: Sistem Pelaporan Fasilitas / Keluhan Ruangan
-- Jalankan di Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.room_facility_reports (
    id BIGSERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES public.room(room_id) ON DELETE CASCADE,
    reporter_name VARCHAR(150) NOT NULL,
    reporter_contact VARCHAR(100),
    issue_description TEXT NOT NULL,
    photo_file TEXT,
    hosting_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'resolved', 'cancelled'
    resolved_at TIMESTAMPTZ,
    resolved_by INTEGER REFERENCES public.users(user_id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk filter dan pencarian
CREATE INDEX IF NOT EXISTS idx_room_facility_reports_room ON public.room_facility_reports(room_id);
CREATE INDEX IF NOT EXISTS idx_room_facility_reports_status ON public.room_facility_reports(status);
CREATE INDEX IF NOT EXISTS idx_room_facility_reports_created ON public.room_facility_reports(created_at);

-- Row Level Security (RLS)
ALTER TABLE public.room_facility_reports ENABLE ROW LEVEL SECURITY;

-- Policy Select (Authenticated & Anon)
DROP POLICY IF EXISTS "Allow select room_facility_reports" ON public.room_facility_reports;
CREATE POLICY "Allow select room_facility_reports" 
ON public.room_facility_reports 
FOR SELECT 
TO authenticated, anon 
USING (true);

-- Policy Full Access untuk Service Role
DROP POLICY IF EXISTS "Allow all for service role on room_facility_reports" ON public.room_facility_reports;
CREATE POLICY "Allow all for service role on room_facility_reports" 
ON public.room_facility_reports 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);
