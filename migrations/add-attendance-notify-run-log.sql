-- Tabel untuk mencatat setiap eksekusi cron notifikasi absensi
-- Setiap kali cron berjalan (baik berhasil, skip, atau error), satu baris dicatat.
CREATE TABLE IF NOT EXISTS attendance_notify_run_log (
  id              bigserial PRIMARY KEY,
  ran_at          timestamptz NOT NULL DEFAULT now(),     -- kapan cron dijalankan (UTC)
  target_date     date,                                   -- tanggal absensi yang diproses (kemarin)
  users_processed int         NOT NULL DEFAULT 0,         -- jumlah user yang dicek
  violations_found int        NOT NULL DEFAULT 0,         -- jumlah pelanggaran ditemukan
  emails_sent     int         NOT NULL DEFAULT 0,         -- jumlah email terkirim berhasil
  emails_failed   int         NOT NULL DEFAULT 0,         -- jumlah email gagal terkirim
  admin_emails    text[]      DEFAULT '{}',               -- daftar email admin penerima rekap
  admin_email_ok  boolean,                                -- apakah rekap admin berhasil dikirim?
  skipped_reason  text,                                   -- jika skip: 'holiday', 'disabled', dll
  error_message   text                                    -- jika ada error fatal
);

CREATE INDEX IF NOT EXISTS idx_notify_run_log_ran_at ON attendance_notify_run_log(ran_at DESC);

COMMENT ON TABLE attendance_notify_run_log IS
  'Rekap tiap eksekusi cron notifikasi absensi. Satu baris per run.';
