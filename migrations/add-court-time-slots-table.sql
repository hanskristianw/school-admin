-- ============================================================
-- Migrasi: Master Sesi Jam Sewa Lapangan (Court Time Slots)
-- Jalankan di Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.court_time_slots (
    id BIGSERIAL PRIMARY KEY,
    day_type VARCHAR(20) NOT NULL, -- 'weekday' (Senin-Jumat) atau 'weekend' (Sabtu-Minggu)
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    time_slot VARCHAR(50) NOT NULL, -- Format display: '16:00 - 18:00'
    label VARCHAR(100), -- Opsional: 'Sesi Sore', 'Sesi Malam'
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_court_slot_day UNIQUE (day_type, time_slot)
);

CREATE INDEX IF NOT EXISTS idx_court_time_slots_day ON public.court_time_slots(day_type, is_active, sort_order);

-- Seeding data awal sesuai jadwal operasional yang sudah berjalan
INSERT INTO public.court_time_slots (day_type, start_time, end_time, time_slot, label, is_active, sort_order)
VALUES
    -- Sesi Weekday (Senin - Jumat)
    ('weekday', '16:00', '18:00', '16:00 - 18:00', 'Sesi Sore', true, 1),
    ('weekday', '18:00', '20:00', '18:00 - 20:00', 'Sesi Malam 1', true, 2),
    ('weekday', '20:00', '22:00', '20:00 - 22:00', 'Sesi Malam 2', true, 3),
    -- Sesi Weekend (Sabtu - Minggu)
    ('weekend', '06:00', '08:00', '06:00 - 08:00', 'Sesi Pagi 1', true, 1),
    ('weekend', '08:00', '10:00', '08:00 - 10:00', 'Sesi Pagi 2', true, 2),
    ('weekend', '10:00', '12:00', '10:00 - 12:00', 'Sesi Siang 1', true, 3),
    ('weekend', '14:00', '16:00', '14:00 - 16:00', 'Sesi Siang 2', true, 4),
    ('weekend', '16:00', '18:00', '16:00 - 18:00', 'Sesi Sore', true, 5),
    ('weekend', '18:00', '20:00', '18:00 - 20:00', 'Sesi Malam 1', true, 6),
    ('weekend', '20:00', '22:00', '20:00 - 22:00', 'Sesi Malam 2', true, 7)
ON CONFLICT (day_type, time_slot) DO NOTHING;
