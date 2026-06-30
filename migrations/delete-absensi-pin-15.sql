-- ============================================================
-- Hapus data absensi untuk user dengan PIN = 15
-- (data ini salah input sebelumnya)
-- JALANKAN STEP 1 DULU untuk verifikasi sebelum DELETE
-- ============================================================

-- ── STEP 1: Preview data yang akan dihapus ───────────────────────────────────
SELECT
  a.id,
  a.user_id,
  u.user_nama_depan,
  u.user_nama_belakang,
  u.user_pin,
  a.scan_time
FROM attendances a
JOIN users u ON u.user_id = a.user_id
WHERE u.user_pin = '15'
ORDER BY a.scan_time;


-- ── STEP 2: Hitung total baris ────────────────────────────────────────────────
SELECT
  u.user_pin,
  u.user_nama_depan || ' ' || u.user_nama_belakang AS nama,
  COUNT(*) AS jumlah_absensi
FROM attendances a
JOIN users u ON u.user_id = a.user_id
WHERE u.user_pin = '15'
GROUP BY u.user_pin, u.user_nama_depan, u.user_nama_belakang;


-- ── STEP 3: DELETE ────────────────────────────────────────────────────────────
DELETE FROM attendances
WHERE user_id IN (
  SELECT user_id FROM users WHERE user_pin = '15'
);
