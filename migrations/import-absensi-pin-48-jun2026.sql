-- ============================================================
-- IMPORT DATA ABSENSI: PIN 48 — Juni 2026
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
(48, '2026-06-02', '07:25:49'),
(48, '2026-06-02', '17:26:58'),
(48, '2026-06-03', '07:17:45'),
(48, '2026-06-03', '17:14:44'),
(48, '2026-06-04', '07:21:17'),
(48, '2026-06-04', '17:17:56'),
(48, '2026-06-05', '07:21:43'),
(48, '2026-06-05', '17:29:12'),
(48, '2026-06-06', '07:31:25'),
(48, '2026-06-06', '08:11:38'),
(48, '2026-06-06', '13:26:22'),
(48, '2026-06-08', '07:20:48'),
(48, '2026-06-08', '16:43:01'),
(48, '2026-06-09', '07:13:39'),
(48, '2026-06-09', '17:45:23'),
(48, '2026-06-10', '07:21:54'),
(48, '2026-06-10', '16:34:35'),
(48, '2026-06-11', '07:18:23'),
(48, '2026-06-11', '17:04:53'),
(48, '2026-06-12', '07:27:12'),
(48, '2026-06-12', '17:13:36'),
(48, '2026-06-15', '07:24:31'),
(48, '2026-06-15', '17:05:49'),
(48, '2026-06-17', '07:13:53'),
(48, '2026-06-17', '15:51:15');

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
