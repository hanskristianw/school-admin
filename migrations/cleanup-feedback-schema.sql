-- ==============================================================================
-- Migration: Cleanup Feedback Schema (Hapus Fitur Upvotes & Thumbs Up)
-- ==============================================================================

-- 1. Hapus tabel relasi upvote yang sudah tidak digunakan
DROP TABLE IF EXISTS public.system_feedback_upvotes CASCADE;

-- 2. Hapus kolom upvotes_count dari tabel utama system_feedback
ALTER TABLE public.system_feedback DROP COLUMN IF EXISTS upvotes_count;
