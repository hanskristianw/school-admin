-- ============================================================
-- IMPORT DATA ABSENSI: PIN 123 — Juni 2026
-- Catatan: data asli berurutan (pin, waktu, tanggal) — sudah dikoreksi
-- Jalankan di: Supabase SQL Editor
-- ============================================================

-- LANGKAH 1: Buat tabel sementara
CREATE TEMP TABLE tmp_absen_import (
  pin     INTEGER NOT NULL,
  tanggal DATE    NOT NULL,
  waktu   TIME    NOT NULL
);

-- LANGKAH 2: Masukkan data mentah dari mesin
-- (kolom asli: pin, waktu, tanggal — sudah diurutkan ulang ke pin, tanggal, waktu)
INSERT INTO tmp_absen_import (pin, tanggal, waktu) VALUES
(123, '2026-06-02', '07:30:26'),
(123, '2026-06-02', '18:04:13'),
(123, '2026-06-03', '07:24:41'),
(123, '2026-06-03', '17:44:24'),
(123, '2026-06-04', '07:27:39'),
(123, '2026-06-04', '16:30:47'),
(123, '2026-06-04', '19:12:44'),
(123, '2026-06-05', '07:27:12'),
(123, '2026-06-05', '17:34:47'),
(123, '2026-06-09', '07:28:37'),
(123, '2026-06-09', '18:03:42'),
(123, '2026-06-10', '07:31:48'),
(123, '2026-06-10', '19:18:25'),
(123, '2026-06-11', '07:32:25'),
(123, '2026-06-11', '19:23:09'),
(123, '2026-06-12', '07:24:53'),
(123, '2026-06-12', '19:51:48'),
(123, '2026-06-15', '07:21:50'),
(123, '2026-06-15', '18:30:48'),
(123, '2026-06-17', '07:21:48'),
(123, '2026-06-17', '16:27:26');

-- LANGKAH 3: Preview — cek PIN cocok ke user mana
SELECT
  t.pin,
  t.tanggal,
  t.waktu,
  u.user_id,
  u.user_nama_depan || ' ' || u.user_nama_belakang AS nama,
  CASE WHEN u.user_id IS NULL THEN '❌ PIN tidak ditemukan' ELSE '✅ OK' END AS status
FROM tmp_absen_import t
LEFT JOIN users u ON u.user_pin = t.pin::TEXT
ORDER BY t.tanggal, t.waktu;

-- LANGKAH 4: Ringkasan
SELECT
  t.pin,
  u.user_nama_depan || ' ' || u.user_nama_belakang AS nama,
  COUNT(*) AS jumlah_scan
FROM tmp_absen_import t
LEFT JOIN users u ON u.user_pin = t.pin::TEXT
GROUP BY t.pin, u.user_nama_depan, u.user_nama_belakang;

-- LANGKAH 5: INSERT ke tabel attendances (WIB → UTC, skip duplikat)
WITH matched AS (
  SELECT
    u.user_id,
    (t.tanggal::TEXT || ' ' || t.waktu::TEXT)::TIMESTAMP AT TIME ZONE 'Asia/Jakarta' AS scan_time
  FROM tmp_absen_import t
  INNER JOIN users u ON u.user_pin = t.pin::TEXT
)
INSERT INTO attendances (user_id, scan_time)
SELECT user_id, scan_time FROM matched
ON CONFLICT ON CONSTRAINT uq_attendances_user_scan DO NOTHING;

-- LANGKAH 6: Cek hasil
SELECT
  'Total data input'        AS keterangan, COUNT(*) AS jumlah FROM tmp_absen_import
UNION ALL
SELECT
  'PIN tidak cocok ke user', COUNT(*) FROM tmp_absen_import t
  LEFT JOIN users u ON u.user_pin = t.pin::TEXT WHERE u.user_id IS NULL;
