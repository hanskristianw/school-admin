-- ============================================================================
-- MIGRATION: Restructure Vendor Cleaning Schedule & General Reporter QR
-- Date: 2026-11-10
-- ============================================================================

-- 1. Tambah kolom cleaner_user_ids (array of user_id) pada tabel public.room
--    sehingga setiap ruangan (misal Computer Lab) menyimpan siapa saja cleaner
--    yang membersihkannya (bisa 1 orang atau lebih dari 1).
ALTER TABLE public.room
    ADD COLUMN IF NOT EXISTS cleaner_user_ids INTEGER[] NOT NULL DEFAULT '{}';

-- 2. Tabel Relasi Many-to-Many: Petugas Cleaning (users) <-> Ruangan (room)
CREATE TABLE IF NOT EXISTS public.vendor_cleaner_rooms (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    room_id INTEGER NOT NULL REFERENCES public.room(room_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_vendor_cleaner_room UNIQUE (user_id, room_id)
);

CREATE INDEX IF NOT EXISTS idx_vendor_cleaner_rooms_user ON public.vendor_cleaner_rooms(user_id);
CREATE INDEX IF NOT EXISTS idx_vendor_cleaner_rooms_room ON public.vendor_cleaner_rooms(room_id);

ALTER TABLE public.vendor_cleaner_rooms ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'vendor_cleaner_rooms'
          AND policyname = 'Allow select vendor_cleaner_rooms'
    ) THEN
        CREATE POLICY "Allow select vendor_cleaner_rooms"
            ON public.vendor_cleaner_rooms FOR SELECT TO authenticated, anon USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'vendor_cleaner_rooms'
          AND policyname = 'Allow all for service role on vendor_cleaner_rooms'
    ) THEN
        CREATE POLICY "Allow all for service role on vendor_cleaner_rooms"
            ON public.vendor_cleaner_rooms FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 3. Sesuaikan tabel room_facility_reports untuk QR General Pelapor:
--    - room_id menjadi NULLABLE (karena QR bersifat General / tidak per ruangan)
--    - reporter_name menjadi NULLABLE / DEFAULT 'Anonim' (karena nama pelapor opsional)
ALTER TABLE public.room_facility_reports
    ALTER COLUMN room_id DROP NOT NULL,
    ALTER COLUMN reporter_name DROP NOT NULL,
    ALTER COLUMN reporter_name SET DEFAULT 'Anonim';
