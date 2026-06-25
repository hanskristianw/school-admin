-- ============================================================
-- DIAGNOSA: Cek apakah data Juni 17 sudah ada di DB
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- 1. Berapa scan yang ada di DB untuk tanggal 17 Juni?
SELECT
  DATE(scan_time AT TIME ZONE 'Asia/Jakarta') AS tanggal,
  COUNT(*) AS total_scan,
  COUNT(DISTINCT user_id) AS total_user
FROM attendances
WHERE scan_time >= '2026-06-17T00:00:00+07:00'
  AND scan_time <= '2026-06-17T23:59:59+07:00'
GROUP BY 1;

-- 2. Jika ada, tampilkan sampel scan beserta klasifikasi midpoint
--    Default midpoint = (07:30 + 16:30) / 2 = 12:00
SELECT
  u.user_pin,
  u.user_nama_depan || ' ' || u.user_nama_belakang AS nama,
  a.scan_time AT TIME ZONE 'Asia/Jakarta' AS scan_wib,
  EXTRACT(HOUR FROM (a.scan_time AT TIME ZONE 'Asia/Jakarta')) * 60
    + EXTRACT(MINUTE FROM (a.scan_time AT TIME ZONE 'Asia/Jakarta')) AS scan_menit,
  720 AS midpoint_menit, -- 12:00
  CASE
    WHEN EXTRACT(HOUR FROM (a.scan_time AT TIME ZONE 'Asia/Jakarta')) * 60
         + EXTRACT(MINUTE FROM (a.scan_time AT TIME ZONE 'Asia/Jakarta')) <= 720
    THEN 'CHECK-IN'
    ELSE 'CHECK-OUT'
  END AS klasifikasi
FROM attendances a
JOIN users u ON u.user_id = a.user_id
WHERE a.scan_time >= '2026-06-17T00:00:00+07:00'
  AND a.scan_time <= '2026-06-17T23:59:59+07:00'
ORDER BY a.scan_time;

-- 3. Cek apakah tanggal 17 Juni dianggap hari libur di DB
SELECT * FROM school_holidays
WHERE date_start <= '2026-06-17' AND date_end >= '2026-06-17';

-- 4. Cek hari dalam seminggu: 17 Juni 2026 = ?
SELECT TO_CHAR(DATE '2026-06-17', 'Day') AS nama_hari,
       EXTRACT(DOW FROM DATE '2026-06-17') AS dow_0sun_6sat;
-- DOW: 0=Sun, 1=Mon, ..., 6=Sat
-- Sistem kita: 1=Mon...7=Sun
