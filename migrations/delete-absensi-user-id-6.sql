-- ============================================================
-- Hapus data absensi untuk user_id = 6 (Martin Maradani)
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
WHERE a.user_id = 6
ORDER BY a.scan_time;


-- ── STEP 2: Hitung total baris ────────────────────────────────────────────────
SELECT COUNT(*) AS jumlah_absensi
FROM attendances
WHERE user_id = 6;


-- ── STEP 3: DELETE ────────────────────────────────────────────────────────────
DELETE FROM attendances
WHERE user_id = 6;
