-- ============================================================
-- Migrasi: Kolom Bukti Penyelesaian Komplain oleh Tim Cleaning
-- Jalankan di Supabase SQL Editor
-- ============================================================

ALTER TABLE public.room_facility_reports 
ADD COLUMN IF NOT EXISTS resolution_photo_file TEXT,
ADD COLUMN IF NOT EXISTS resolved_by_name VARCHAR(150),
ADD COLUMN IF NOT EXISTS resolution_notes TEXT;
