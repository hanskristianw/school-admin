-- ============================================================
-- IMPORT DATA ABSENSI: PIN 46 — Juni 2026
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
(46, '2026-06-02', '07:25:30'),
(46, '2026-06-02', '17:41:21'),
(46, '2026-06-03', '07:18:26'),
(46, '2026-06-03', '17:53:22'),
(46, '2026-06-04', '07:21:27'),
(46, '2026-06-04', '17:19:48'),
(46, '2026-06-05', '07:27:18'),
(46, '2026-06-05', '17:40:09'),
(46, '2026-06-06', '07:16:35'),
(46, '2026-06-06', '13:42:58'),
(46, '2026-06-08', '07:35:38'),
(46, '2026-06-08', '17:59:03'),
(46, '2026-06-09', '07:18:07'),
(46, '2026-06-09', '21:29:57'),
(46, '2026-06-10', '07:19:42'),
(46, '2026-06-10', '19:30:18'),
(46, '2026-06-11', '07:25:47'),
(46, '2026-06-11', '18:20:00'),
(46, '2026-06-12', '07:27:17'),
(46, '2026-06-12', '17:56:19'),
(46, '2026-06-15', '07:26:25'),
(46, '2026-06-15', '19:37:26'),
(46, '2026-06-17', '07:16:08'),
(46, '2026-06-17', '15:46:05');

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
