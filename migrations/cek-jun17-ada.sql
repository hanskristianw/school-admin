-- ============================================================
-- CEK SEMUA SEKALIGUS — jalankan setiap query satu per satu
-- di Supabase SQL Editor
-- ============================================================

-- QUERY A: Apakah data Juni 17 ada di DB?
-- Jika hasilnya kosong = data BELUM diimport
SELECT
  DATE(scan_time AT TIME ZONE 'Asia/Jakarta') AS tanggal,
  COUNT(*) AS total_scan,
  COUNT(DISTINCT user_id) AS jumlah_user
FROM attendances
WHERE scan_time >= '2026-06-17T00:00:00+07:00'
  AND scan_time <  '2026-06-18T00:00:00+07:00'
GROUP BY 1;
