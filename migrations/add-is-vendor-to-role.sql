-- ============================================================
-- Add is_vendor column to role table
-- ============================================================

ALTER TABLE role ADD COLUMN IF NOT EXISTS is_vendor BOOLEAN NOT NULL DEFAULT FALSE;

-- Verifikasi
SELECT role_id, role_name, is_vendor FROM role ORDER BY role_name;
