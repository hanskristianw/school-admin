-- ============================================================
-- IMPORT DATA ABSENSI: PIN 62 — Juni 2026
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
(62, '2026-06-02', '07:27:09'),
(62, '2026-06-02', '16:41:16'),
(62, '2026-06-03', '07:29:15'),
(62, '2026-06-03', '16:46:44'),
(62, '2026-06-04', '07:28:22'),
(62, '2026-06-04', '16:31:12'),
(62, '2026-06-05', '07:29:15'),
(62, '2026-06-05', '16:45:36'),
(62, '2026-06-06', '07:27:03'),
(62, '2026-06-08', '07:27:41'),
(62, '2026-06-08', '16:38:59'),
(62, '2026-06-09', '07:20:51'),
(62, '2026-06-09', '17:31:43'),
(62, '2026-06-10', '07:24:17'),
(62, '2026-06-10', '16:43:02'),
(62, '2026-06-11', '07:28:23'),
(62, '2026-06-11', '16:39:09'),
(62, '2026-06-12', '07:29:31'),
(62, '2026-06-12', '17:02:48'),
(62, '2026-06-15', '07:33:54'),
(62, '2026-06-15', '16:40:48'),
(62, '2026-06-17', '07:04:30'),
(62, '2026-06-17', '16:32:19');

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
