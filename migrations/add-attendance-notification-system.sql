-- =============================================================
-- Migration: Attendance Notification System
-- Created: 2026-06-24
-- Purpose:
--   1. Add work_days column to role table
--   2. Create school_holidays table
--   3. Create attendance_notification_log table
--   4. Add notification settings to settings table
--   5. Add menu entry for attendance-settings page
-- =============================================================

-- ─── Step 1: Add work_days to role table ──────────────────────────────────
-- Format: comma-separated day numbers (1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun)
-- Default: Monday-Friday (most roles)
ALTER TABLE role
  ADD COLUMN IF NOT EXISTS work_days TEXT NOT NULL DEFAULT '1,2,3,4,5';

COMMENT ON COLUMN role.work_days IS
  'Hari kerja untuk role ini. Format: comma-separated (1=Sen,2=Sel,3=Rab,4=Kam,5=Jum,6=Sab,7=Min). '
  'Contoh: "1,2,3,4,5" = Senin-Jumat. Digunakan untuk menentukan apakah absensi hari tsb perlu dipantau.';

-- ─── Step 2: Create school_holidays table ─────────────────────────────────
CREATE TABLE IF NOT EXISTS school_holidays (
  id          BIGSERIAL PRIMARY KEY,
  date        DATE NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_holidays_date ON school_holidays(date);

COMMENT ON TABLE school_holidays IS
  'Kalender hari libur sekolah global. Pada hari-hari ini tidak ada notifikasi absensi yang dikirim untuk semua role.';

-- ─── Step 3: Create attendance_notification_log table ──────────────────────
CREATE TABLE IF NOT EXISTS attendance_notification_log (
  id          BIGSERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  notif_date  DATE NOT NULL,
  notif_type  TEXT NOT NULL CHECK (notif_type IN ('late', 'leave_early', 'no_checkin', 'no_checkout')),
  minutes_diff INTEGER,         -- Selisih menit (keterlambatan atau leave early)
  scheduled_time TEXT,          -- Jam yang seharusnya (HH:MM)
  actual_time    TEXT,          -- Jam aktual absensi (HH:MM) atau NULL jika tidak hadir
  email_to    TEXT[],           -- Array email penerima
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success     BOOLEAN NOT NULL DEFAULT TRUE,
  error_msg   TEXT,

  CONSTRAINT uq_notif_user_date_type UNIQUE (user_id, notif_date, notif_type)
);

CREATE INDEX IF NOT EXISTS idx_notif_log_user    ON attendance_notification_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_log_date    ON attendance_notification_log(notif_date DESC);
CREATE INDEX IF NOT EXISTS idx_notif_log_sent_at ON attendance_notification_log(sent_at DESC);

COMMENT ON TABLE attendance_notification_log IS
  'Log pengiriman notifikasi absensi. Mencegah duplikat pengiriman dan menyediakan audit trail.';

-- ─── Step 4: Add notification settings to settings table ──────────────────
-- Insert default settings (skip if already exist)
INSERT INTO settings (key, value) VALUES
  ('attendance_notif_admin_emails', ''),
  ('attendance_notif_grace_minutes', '0'),
  ('attendance_notif_enabled', 'true'),
  ('attendance_notif_cron_secret', '')
ON CONFLICT (key) DO NOTHING;

COMMENT ON COLUMN settings.key IS 'Kunci setting. attendance_notif_* untuk pengaturan notifikasi absensi.';

-- ─── Step 5: Add menu for attendance-settings page ────────────────────────
-- Tambah sebagai submenu dari parent menu yang sesuai (sesuaikan parent_id dengan kondisi database Anda)
-- Jalankan SELECT menu_id, menu_name, menu_path FROM menu ORDER BY menu_id; untuk cek parent_id yang tepat
-- INSERT INTO menu (menu_name, menu_path, menu_icon, menu_parent_id, menu_order)
-- VALUES ('Pengaturan Absensi', '/data/attendance-settings', 'fas fa-bell', <parent_id>, 99)
-- ON CONFLICT DO NOTHING;
