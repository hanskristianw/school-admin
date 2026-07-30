-- ============================================================
-- Add is_on_call_staff column to role table
-- ============================================================

ALTER TABLE role ADD COLUMN IF NOT EXISTS is_on_call_staff BOOLEAN NOT NULL DEFAULT FALSE;

-- Verifikasi
SELECT role_id, role_name, is_part_time_staff, is_flexible_hours, is_on_call_staff FROM role ORDER BY role_name;
