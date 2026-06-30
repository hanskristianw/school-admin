-- ============================================================
-- Hapus data absensi untuk karyawan dengan PIN: 15, 44, 12
-- JALANKAN BAGIAN SELECT DULU untuk verifikasi sebelum DELETE
-- ============================================================

-- ── STEP 1: Preview — cek data yang akan dihapus ─────────────────────────────
SELECT
  a.id,
  a.user_id,
  u.user_nama_depan,
  u.user_nama_belakang,
  u.user_pin,
  a.scan_time
FROM attendances a
JOIN users u ON u.user_id = a.user_id
WHERE u.user_pin IN ('15', '44', '12')
ORDER BY u.user_pin, a.scan_time;


-- ── STEP 2: Hitung total baris yang akan dihapus ─────────────────────────────
SELECT
  u.user_pin,
  u.user_nama_depan || ' ' || u.user_nama_belakang AS nama,
  COUNT(*) AS jumlah_absensi
FROM attendances a
JOIN users u ON u.user_id = a.user_id
WHERE u.user_pin IN ('15', '44', '12')
GROUP BY u.user_pin, u.user_nama_depan, u.user_nama_belakang
ORDER BY u.user_pin;


-- ── STEP 3: DELETE — jalankan setelah verifikasi di atas ─────────────────────
-- Hapus menggunakan subquery berdasarkan user_id yang PIN-nya cocok
DELETE FROM attendances
WHERE user_id IN (
  SELECT user_id FROM users WHERE user_pin IN ('15', '44', '12')
);

-- Konfirmasi jumlah baris yang terhapus akan muncul otomatis di Supabase
