-- ============================================================
-- Migrasi: Sistem Persewaan Lapangan CCS (Court Rental)
-- Tabel: court_rentals, court_blackout_dates, dan pendaftaran menu
-- ============================================================

-- 1. Tabel Utama: court_rentals
CREATE TABLE IF NOT EXISTS public.court_rentals (
    id BIGSERIAL PRIMARY KEY,
    booking_code VARCHAR(50) UNIQUE NOT NULL,
    package_type VARCHAR(50) NOT NULL,
    package_name VARCHAR(150) NOT NULL,
    price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    booking_date DATE NOT NULL,
    time_slot VARCHAR(50) NOT NULL,
    renter_name VARCHAR(150) NOT NULL,
    renter_phone VARCHAR(50) NOT NULL,
    renter_email VARCHAR(150) NOT NULL,
    renter_org VARCHAR(150),
    renter_purpose TEXT,
    payment_proof_file TEXT,
    hosting_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'payment_uploaded', -- pending_payment, payment_uploaded, approved, rejected
    admin_notes TEXT,
    approved_by VARCHAR(100),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indeks untuk performa pencarian & filter jadwal
CREATE INDEX IF NOT EXISTS idx_court_rentals_date_slot ON public.court_rentals(booking_date, time_slot);
CREATE INDEX IF NOT EXISTS idx_court_rentals_status ON public.court_rentals(status);
CREATE INDEX IF NOT EXISTS idx_court_rentals_code ON public.court_rentals(booking_code);

-- 2. Tabel Agenda Sekolah Mendadak: court_blackout_dates
CREATE TABLE IF NOT EXISTS public.court_blackout_dates (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL,
    time_slot VARCHAR(50), -- NULL atau kosong berarti seharian penuh
    reason TEXT NOT NULL DEFAULT 'Kegiatan Sekolah',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_court_blackout_date ON public.court_blackout_dates(date);

-- 3. Daftarkan Menu "Sewa Lapangan" ke tabel menus (di bawah menu Operational, id: 112)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.menus WHERE menu_path = '/data/court-rental') THEN
        INSERT INTO public.menus (
            menu_name,
            menu_path,
            menu_icon,
            menu_order,
            menu_parent_id,
            menu_show_dashboard
        ) VALUES (
            'Sewa Lapangan',
            '/data/court-rental',
            'fas fa-futbol',
            5,
            112,
            true
        );
    END IF;
END $$;
