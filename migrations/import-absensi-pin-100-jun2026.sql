-- ============================================================
-- IMPORT DATA ABSENSI: PIN 100 — Juni 2026
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
(100, '2026-06-02', '07:27:36'),
(100, '2026-06-02', '17:45:58'),
(100, '2026-06-03', '07:26:39'),
(100, '2026-06-03', '16:42:48'),
(100, '2026-06-04', '07:28:43'),
(100, '2026-06-04', '16:33:57'),
(100, '2026-06-05', '07:26:14'),
(100, '2026-06-05', '16:41:20'),
(100, '2026-06-06', '07:23:19'),
(100, '2026-06-06', '13:30:01'),
(100, '2026-06-06', '13:52:32'),
(100, '2026-06-08', '07:28:38'),
(100, '2026-06-08', '17:23:31'),
(100, '2026-06-09', '07:27:09'),
(100, '2026-06-09', '16:34:11'),
(100, '2026-06-09', '16:38:21'),
(100, '2026-06-10', '07:26:31'),
(100, '2026-06-10', '17:19:14'),
(100, '2026-06-11', '07:27:10'),
(100, '2026-06-11', '17:49:48'),
(100, '2026-06-12', '07:29:14'),
(100, '2026-06-12', '18:18:39'),
(100, '2026-06-15', '07:26:58'),
(100, '2026-06-15', '16:53:07'),
(100, '2026-06-17', '07:26:50'),
(100, '2026-06-17', '15:49:40');

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
  'Total data input'     AS keterangan, COUNT(*) AS jumlah FROM tmp_absen_import
UNION ALL
SELECT
  'PIN tidak cocok ke user', COUNT(*) FROM tmp_absen_import t
  LEFT JOIN users u ON u.user_pin = t.pin::TEXT WHERE u.user_id IS NULL;
