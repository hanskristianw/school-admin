-- ============================================================
-- IMPORT DATA ABSENSI: PIN 85 — Juni 2026
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
(85, '2026-06-02', '07:36:15'),
(85, '2026-06-02', '17:00:05'),
(85, '2026-06-03', '07:08:50'),
(85, '2026-06-03', '16:06:20'),
(85, '2026-06-04', '07:17:10'),
(85, '2026-06-04', '17:00:33'),
(85, '2026-06-05', '07:19:42'),
(85, '2026-06-05', '17:00:29'),
(85, '2026-06-06', '06:17:17'),
(85, '2026-06-06', '15:17:12'),
(85, '2026-06-08', '07:21:34'),
(85, '2026-06-08', '17:02:16'),
(85, '2026-06-09', '07:28:51'),
(85, '2026-06-09', '17:00:20'),
(85, '2026-06-10', '07:11:02'),
(85, '2026-06-10', '17:00:08'),
(85, '2026-06-11', '07:13:26'),
(85, '2026-06-11', '17:00:03'),
(85, '2026-06-12', '07:16:19'),
(85, '2026-06-12', '17:05:24'),
(85, '2026-06-15', '06:36:49'),
(85, '2026-06-18', '06:48:07'),
(85, '2026-06-18', '17:00:53'),
(85, '2026-06-22', '07:25:38'),
(85, '2026-06-22', '17:05:15'),
(85, '2026-06-23', '07:42:22'),
(85, '2026-06-23', '17:08:33'),
(85, '2026-06-24', '07:12:45'),
(85, '2026-06-24', '17:00:24'),
(85, '2026-06-25', '07:25:59'),
(85, '2026-06-25', '17:00:21'),
(85, '2026-06-26', '07:17:07'),
(85, '2026-06-26', '17:00:04'),
(85, '2026-06-29', '07:19:11'),
(85, '2026-06-29', '17:01:13'),
(85, '2026-06-30', '07:08:55');

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
