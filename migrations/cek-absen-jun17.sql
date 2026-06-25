-- Perbandingan: total user dengan PIN vs yang scan di June 17
-- Ini menjelaskan kenapa banyak user dianggap "tidak masuk"

SELECT
  total_user_pin,
  scan_jun17,
  total_user_pin - scan_jun17 AS tidak_scan_jun17,
  ROUND(scan_jun17::numeric / total_user_pin * 100, 1) AS pct_hadir
FROM (
  SELECT
    (SELECT COUNT(*) FROM users WHERE user_pin IS NOT NULL AND is_active = true) AS total_user_pin,
    (SELECT COUNT(DISTINCT user_id) FROM attendances
     WHERE scan_time >= '2026-06-17T00:00:00+07:00'
       AND scan_time <  '2026-06-18T00:00:00+07:00') AS scan_jun17
) x;

-- Detail: user dengan PIN yang TIDAK ADA scan di June 17
-- (kemungkinan memang tidak masuk, atau datanya belum diimport)
SELECT
  u.user_pin,
  u.user_nama_depan || ' ' || u.user_nama_belakang AS nama,
  u.user_unit_id,
  r.role_name
FROM users u
LEFT JOIN role r ON r.role_id = u.user_role_id
WHERE u.user_pin IS NOT NULL
  AND u.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM attendances a
    WHERE a.user_id = u.user_id
      AND a.scan_time >= '2026-06-17T00:00:00+07:00'
      AND a.scan_time <  '2026-06-18T00:00:00+07:00'
  )
ORDER BY u.user_pin::integer;
