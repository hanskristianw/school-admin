-- ============================================================
-- Add is_part_time_staff column to role table
-- ============================================================

ALTER TABLE role ADD COLUMN IF NOT EXISTS is_part_time_staff BOOLEAN NOT NULL DEFAULT FALSE;

-- Verifikasi
SELECT role_id, role_name, is_part_time_staff FROM role ORDER BY role_name;
