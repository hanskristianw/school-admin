-- Cek detail: user PIN 133, apakah ada di attendances untuk 17 Jun?
-- Dan bagaimana scan_time-nya disimpan di DB?
SELECT
  u.user_id,
  u.user_pin,
  u.user_nama_depan || ' ' || u.user_nama_belakang AS nama,
  u.expected_check_in,
  u.expected_check_out,
  a.scan_time,
  a.scan_time AT TIME ZONE 'Asia/Jakarta' AS scan_wib,
  DATE(a.scan_time AT TIME ZONE 'Asia/Jakarta') AS tanggal_wib,
  EXTRACT(HOUR   FROM (a.scan_time AT TIME ZONE 'Asia/Jakarta')) * 60
    + EXTRACT(MINUTE FROM (a.scan_time AT TIME ZONE 'Asia/Jakarta')) AS menit_dari_midnight,
  -- midpoint hitung dari expected atau default
  CASE
    WHEN u.expected_check_in IS NOT NULL AND u.expected_check_out IS NOT NULL
    THEN (
      EXTRACT(HOUR   FROM u.expected_check_in::time) * 60
        + EXTRACT(MINUTE FROM u.expected_check_in::time)
      + EXTRACT(HOUR   FROM u.expected_check_out::time) * 60
        + EXTRACT(MINUTE FROM u.expected_check_out::time)
    ) / 2
    ELSE 720  -- default: (07:30 + 16:30) / 2 = 12:00 = 720 menit
  END AS midpoint_menit,
  CASE
    WHEN (
      EXTRACT(HOUR FROM (a.scan_time AT TIME ZONE 'Asia/Jakarta')) * 60
        + EXTRACT(MINUTE FROM (a.scan_time AT TIME ZONE 'Asia/Jakarta'))
    ) <= CASE
      WHEN u.expected_check_in IS NOT NULL AND u.expected_check_out IS NOT NULL
      THEN (
        EXTRACT(HOUR FROM u.expected_check_in::time) * 60
          + EXTRACT(MINUTE FROM u.expected_check_in::time)
        + EXTRACT(HOUR FROM u.expected_check_out::time) * 60
          + EXTRACT(MINUTE FROM u.expected_check_out::time)
      ) / 2
      ELSE 720
    END
    THEN 'CHECK-IN'
    ELSE 'CHECK-OUT'
  END AS klasifikasi
FROM users u
JOIN attendances a ON a.user_id = u.user_id
WHERE u.user_pin = '133'
  AND a.scan_time >= '2026-06-17T00:00:00+07:00'
  AND a.scan_time <  '2026-06-18T00:00:00+07:00'
ORDER BY a.scan_time;
