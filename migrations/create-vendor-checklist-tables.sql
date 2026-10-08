-- ============================================================
-- Migrasi: Sistem Checklist Pekerjaan Vendor Ruangan (Cleaning / Facility)
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- 1. Tambah kolom qr_code_token dan is_active ke tabel room
ALTER TABLE public.room 
ADD COLUMN IF NOT EXISTS qr_code_token VARCHAR(64) UNIQUE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Generate token acak untuk ruangan yang belum memiliki token
UPDATE public.room
SET qr_code_token = 'rm_' || substring(md5(random()::text || clock_timestamp()::text) from 1 for 12)
WHERE qr_code_token IS NULL;

-- 2. Buat tabel vendor_room_checklists
CREATE TABLE IF NOT EXISTS public.vendor_room_checklists (
    id BIGSERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES public.room(room_id) ON DELETE CASCADE,
    check_date DATE NOT NULL DEFAULT CURRENT_DATE,
    vendor_worker_name VARCHAR(150) NOT NULL,
    image_before_file TEXT,
    image_after_file TEXT,
    image_revision_file TEXT,
    hosting_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'pending_review', 'approved', 'revision', 'rejected'
    notes TEXT,
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    reviewed_by INTEGER REFERENCES public.users(user_id) ON DELETE SET NULL,
    review_notes TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_vendor_room_date UNIQUE(room_id, check_date)
);

-- Index untuk performa query pencarian dan filter
CREATE INDEX IF NOT EXISTS idx_vendor_checklist_date ON public.vendor_room_checklists(check_date);
CREATE INDEX IF NOT EXISTS idx_vendor_checklist_room ON public.vendor_room_checklists(room_id);
CREATE INDEX IF NOT EXISTS idx_vendor_checklist_status ON public.vendor_room_checklists(status);
CREATE INDEX IF NOT EXISTS idx_room_qr_token ON public.room(qr_code_token);

-- 3. Setting default supervisor roles di tabel settings
INSERT INTO public.settings (key, value, description)
VALUES 
    ('vendor_checklist_supervisor_role_ids', '[1, 11, 16]', 'Daftar role_id yang berhak menjadi supervisor / review checklist vendor')
ON CONFLICT (key) DO NOTHING;

-- 4. Enable Row Level Security (RLS) & Policies
ALTER TABLE public.vendor_room_checklists ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to select
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'vendor_room_checklists' 
        AND policyname = 'Allow select vendor_room_checklists'
    ) THEN
        CREATE POLICY "Allow select vendor_room_checklists" 
        ON public.vendor_room_checklists 
        FOR SELECT 
        TO authenticated, anon 
        USING (true);
    END IF;
END $$;

-- Allow full access for service role
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'vendor_room_checklists' 
        AND policyname = 'Allow all for service role on vendor_room_checklists'
    ) THEN
        CREATE POLICY "Allow all for service role on vendor_room_checklists" 
        ON public.vendor_room_checklists 
        FOR ALL 
        TO service_role 
        USING (true) 
        WITH CHECK (true);
    END IF;
END $$;

-- 5. Tambahkan menu ke tabel menus & menu_permissions (Di bawah menu Operational ID 112)
INSERT INTO public.menus (menu_id, menu_name, menu_path, menu_icon, menu_order, menu_parent_id, menu_show_dashboard)
VALUES (131, 'Checklist Vendor', '/data/vendor-checklist', 'fas fa-clipboard-check', 8, 112, false)
ON CONFLICT (menu_id) DO UPDATE 
SET menu_name = EXCLUDED.menu_name,
    menu_path = EXCLUDED.menu_path,
    menu_icon = EXCLUDED.menu_icon,
    menu_parent_id = EXCLUDED.menu_parent_id;

-- Berikan izin akses menu ke role 1 (Admin MYP), 16 (Admin Head of School), 11 (Head of Operation), 14 (Cleaning)
INSERT INTO public.menu_permissions (menu_id, role_id)
SELECT 131, r.role_id 
FROM (VALUES (1), (16), (11), (14)) AS r(role_id)
WHERE NOT EXISTS (
    SELECT 1 FROM public.menu_permissions mp WHERE mp.menu_id = 131 AND mp.role_id = r.role_id
);

