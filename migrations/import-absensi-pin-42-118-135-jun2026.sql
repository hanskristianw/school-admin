-- ============================================================
-- IMPORT DATA ABSENSI: PIN 42, 118, 135 — Juni 2026
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
(42,  '2026-06-02', '07:18:09'),
(118, '2026-06-02', '07:24:38'),
(135, '2026-06-02', '07:26:34'),
(42,  '2026-06-02', '16:39:06'),
(135, '2026-06-02', '16:41:09'),
(118, '2026-06-02', '16:50:09'),
(42,  '2026-06-03', '07:15:43'),
(118, '2026-06-03', '07:26:52'),
(42,  '2026-06-03', '16:35:33'),
(118, '2026-06-03', '16:50:24'),
(118, '2026-06-04', '07:27:07'),
(42,  '2026-06-04', '07:28:03'),
(135, '2026-06-04', '07:28:10'),
(135, '2026-06-04', '16:33:34'),
(42,  '2026-06-04', '16:34:48'),
(118, '2026-06-04', '17:44:40'),
(118, '2026-06-05', '07:25:22'),
(42,  '2026-06-05', '07:30:53'),
(42,  '2026-06-05', '16:36:18'),
(118, '2026-06-05', '17:34:28'),
(118, '2026-06-06', '07:13:08'),
(42,  '2026-06-06', '07:26:56'),
(118, '2026-06-06', '14:11:15'),
(42,  '2026-06-08', '07:21:04'),
(118, '2026-06-08', '07:28:02'),
(118, '2026-06-08', '16:31:04'),
(42,  '2026-06-08', '16:33:49'),
(42,  '2026-06-09', '07:15:11'),
(118, '2026-06-09', '07:25:58'),
(135, '2026-06-09', '07:28:15'),
(135, '2026-06-09', '16:32:06'),
(118, '2026-06-09', '16:32:16'),
(42,  '2026-06-09', '16:52:51'),
(42,  '2026-06-10', '07:20:57'),
(118, '2026-06-10', '07:21:43'),
(118, '2026-06-10', '16:32:13'),
(42,  '2026-06-10', '16:38:16'),
(118, '2026-06-11', '07:25:28'),
(42,  '2026-06-11', '07:36:27'),
(42,  '2026-06-11', '16:36:20'),
(118, '2026-06-11', '16:47:08'),
(42,  '2026-06-12', '07:20:04'),
(118, '2026-06-12', '07:25:07'),
(42,  '2026-06-12', '16:59:11'),
(118, '2026-06-12', '17:02:58'),
(118, '2026-06-15', '07:25:35'),
(135, '2026-06-15', '07:41:43'),
(135, '2026-06-15', '16:33:06'),
(118, '2026-06-15', '16:41:14'),
(42,  '2026-06-15', '16:43:38'),
(42,  '2026-06-17', '07:25:59'),
(135, '2026-06-17', '07:29:26'),
(135, '2026-06-17', '15:07:56'),
(42,  '2026-06-17', '15:37:34'),
(118, '2026-06-19', '07:23:16'),
(118, '2026-06-19', '17:46:52'),
(118, '2026-06-22', '07:26:03'),
(118, '2026-06-22', '16:34:07'),
(118, '2026-06-23', '10:28:17'),
(118, '2026-06-23', '16:32:26'),
(118, '2026-06-24', '07:25:18'),
(118, '2026-06-24', '16:38:29'),
(118, '2026-06-25', '07:26:21'),
(118, '2026-06-25', '16:33:32'),
(118, '2026-06-26', '07:26:51'),
(118, '2026-06-26', '16:39:06'),
(118, '2026-06-29', '07:24:09'),
(118, '2026-06-29', '16:39:43'),
(118, '2026-06-30', '07:27:43'),
(118, '2026-06-30', '16:35:24');

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

-- LANGKAH 4: Ringkasan per PIN
SELECT
  t.pin,
  u.user_nama_depan || ' ' || u.user_nama_belakang AS nama,
  COUNT(*) AS jumlah_scan
FROM tmp_absen_import t
LEFT JOIN users u ON u.user_pin = t.pin::TEXT
GROUP BY t.pin, u.user_nama_depan, u.user_nama_belakang
ORDER BY t.pin;

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
