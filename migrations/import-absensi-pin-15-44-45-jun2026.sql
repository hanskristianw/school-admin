-- ============================================================
-- IMPORT DATA ABSENSI: PIN 15, 44, 45 — Juni 2026
-- Jalankan di: Supabase SQL Editor
-- ============================================================

-- LANGKAH 1: Buat tabel sementara
CREATE TEMP TABLE tmp_absen_import (
  pin     INTEGER NOT NULL,
  tanggal DATE    NOT NULL,
  waktu   TIME    NOT NULL
);

-- LANGKAH 2: Masukkan data mentah dari mesin
INSERT INTO tmp_absen_import (pin, tanggal, waktu) VALUES
(15, '2026-06-02', '07:09:22'),
(45, '2026-06-02', '07:25:26'),
(44, '2026-06-02', '07:27:21'),
(44, '2026-06-02', '16:36:22'),
(15, '2026-06-02', '16:38:41'),
(45, '2026-06-02', '17:01:55'),
(15, '2026-06-03', '07:06:05'),
(45, '2026-06-03', '07:17:05'),
(44, '2026-06-03', '07:25:39'),
(44, '2026-06-03', '16:32:31'),
(15, '2026-06-03', '16:41:22'),
(45, '2026-06-03', '16:45:36'),
(45, '2026-06-04', '07:03:38'),
(15, '2026-06-04', '07:04:28'),
(44, '2026-06-04', '07:25:15'),
(15, '2026-06-04', '16:32:31'),
(44, '2026-06-04', '16:36:39'),
(45, '2026-06-04', '17:22:04'),
(45, '2026-06-05', '07:00:56'),
(15, '2026-06-05', '07:08:00'),
(44, '2026-06-05', '07:27:02'),
(15, '2026-06-05', '16:43:38'),
(44, '2026-06-05', '16:44:31'),
(45, '2026-06-05', '16:52:19'),
(45, '2026-06-06', '07:21:43'),
(44, '2026-06-06', '07:34:34'),
(44, '2026-06-06', '12:57:49'),
(15, '2026-06-06', '13:20:22'),
(45, '2026-06-06', '13:29:10'),
(15, '2026-06-08', '07:01:07'),
(45, '2026-06-08', '07:10:34'),
(44, '2026-06-08', '07:24:40'),
(15, '2026-06-08', '16:38:39'),
(44, '2026-06-08', '16:45:47'),
(45, '2026-06-08', '17:39:08'),
(15, '2026-06-09', '07:07:21'),
(45, '2026-06-09', '07:13:54'),
(44, '2026-06-09', '07:29:40'),
(15, '2026-06-09', '16:32:24'),
(44, '2026-06-09', '16:44:16'),
(45, '2026-06-09', '17:37:31'),
(45, '2026-06-09', '17:38:38'),
(15, '2026-06-10', '07:10:07'),
(45, '2026-06-10', '07:18:05'),
(44, '2026-06-10', '07:29:52'),
(15, '2026-06-10', '16:38:38'),
(44, '2026-06-10', '16:48:55'),
(45, '2026-06-10', '17:26:45'),
(15, '2026-06-11', '07:03:40'),
(45, '2026-06-11', '07:15:01'),
(44, '2026-06-11', '07:22:16'),
(45, '2026-06-11', '16:51:47'),
(44, '2026-06-11', '17:09:07'),
(15, '2026-06-11', '18:40:35'),
(45, '2026-06-12', '06:57:26'),
(15, '2026-06-12', '07:20:27'),
(44, '2026-06-12', '07:30:35'),
(44, '2026-06-12', '16:47:51'),
(15, '2026-06-12', '17:56:06'),
(45, '2026-06-12', '18:35:30'),
(15, '2026-06-15', '07:18:15'),
(45, '2026-06-15', '07:22:08'),
(44, '2026-06-15', '07:31:12'),
(44, '2026-06-15', '16:46:01'),
(45, '2026-06-15', '17:04:54'),
(15, '2026-06-15', '17:27:53'),
(45, '2026-06-17', '06:58:50'),
(15, '2026-06-17', '07:19:20'),
(44, '2026-06-17', '07:26:43'),
(15, '2026-06-17', '15:24:48'),
(44, '2026-06-17', '15:57:57'),
(45, '2026-06-17', '16:44:33');

-- LANGKAH 3: Preview — cek PIN mana yang cocok/tidak cocok ke user
SELECT
  t.pin,
  t.tanggal,
  t.waktu,
  u.user_id,
  u.user_nama_depan || ' ' || u.user_nama_belakang AS nama,
  CASE WHEN u.user_id IS NULL THEN '❌ PIN tidak ditemukan' ELSE '✅ OK' END AS status
FROM tmp_absen_import t
LEFT JOIN users u ON u.user_pin = t.pin::TEXT
ORDER BY t.pin, t.tanggal, t.waktu;

-- LANGKAH 4: Ringkasan per PIN
SELECT
  t.pin,
  u.user_nama_depan || ' ' || u.user_nama_belakang AS nama,
  COUNT(*) AS jumlah_scan
FROM tmp_absen_import t
LEFT JOIN users u ON u.user_pin = t.pin::TEXT
GROUP BY t.pin, u.user_nama_depan, u.user_nama_belakang
ORDER BY t.pin;

-- LANGKAH 5: INSERT ke tabel attendances
-- Waktu dari mesin adalah WIB (UTC+7), dikonversi ke UTC untuk disimpan
-- Duplikat akan diabaikan (ON CONFLICT DO NOTHING)
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

-- LANGKAH 6: Cek hasil — berapa yang berhasil masuk vs sudah ada
SELECT
  'Total data input'    AS keterangan, COUNT(*) AS jumlah FROM tmp_absen_import
UNION ALL
SELECT
  'PIN tidak cocok ke user', COUNT(*) FROM tmp_absen_import t
  LEFT JOIN users u ON u.user_pin = t.pin::TEXT WHERE u.user_id IS NULL;
