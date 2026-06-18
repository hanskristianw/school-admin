-- =============================================================
-- Migration: Webhook-based Attendance (Mesin Absensi IoT)
-- Created: 2026-06-18
-- Purpose:
--   1. Add user_pin column to users table (for matching IoT device PIN)
--   2. Create attendances table (separate from student QR absen system)
-- =============================================================

-- ─── Step 1: Add user_pin to users ────────────────────────────────────────
-- VARCHAR to safely handle leading zeros (e.g. '007', 'GURU-01')
-- and future devices that may use alphanumeric identifiers.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS user_pin VARCHAR(50) UNIQUE;

COMMENT ON COLUMN users.user_pin IS
  'PIN karyawan di mesin absensi IoT. VARCHAR agar aman dari leading-zero dan mendukung alfanumerik (contoh: 001, GURU-01). NULL = belum terdaftar di mesin absensi.';

-- ─── Step 2: Create attendances table ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendances (
  id           BIGSERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  scan_time    TIMESTAMPTZ NOT NULL,
  status_scan  VARCHAR(10),
  raw_payload  JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Idempotency: mesin IoT sering retry jika belum terima 200 OK.
  -- Kombinasi unik ini mencegah duplikat record dari retry tersebut.
  CONSTRAINT uq_attendances_user_scan UNIQUE (user_id, scan_time)
);

CREATE INDEX IF NOT EXISTS idx_attendances_user_id   ON attendances(user_id);
CREATE INDEX IF NOT EXISTS idx_attendances_scan_time ON attendances(scan_time DESC);

COMMENT ON TABLE attendances IS
  'Rekaman absensi dari mesin absensi IoT (fingerprint/wajah). Berbeda dengan tabel absen (siswa QR). Diisi via webhook POST /api/webhook/attendance.';

COMMENT ON COLUMN attendances.user_id      IS 'FK ke users.user_id. Dicocokkan via users.user_pin dari payload mesin.';
COMMENT ON COLUMN attendances.scan_time    IS 'Waktu absensi dari mesin, sudah dalam WIB (UTC+7). Disimpan sebagai TIMESTAMPTZ.';
COMMENT ON COLUMN attendances.status_scan  IS 'Status dari mesin: biasanya "0"=check-in, "1"=check-out. Tergantung konfigurasi mesin.';
COMMENT ON COLUMN attendances.raw_payload  IS 'Seluruh JSON body yang dikirim mesin, untuk keperluan debugging dan audit.';
