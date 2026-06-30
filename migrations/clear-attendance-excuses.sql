-- ============================================================
-- Hapus semua data di attendance_excuses
-- Agar karyawan dapat mengisi ulang sesuai sistem baru (leave_types)
-- ============================================================

-- Cek jumlah data sebelum dihapus
SELECT COUNT(*) AS jumlah_sebelum_dihapus FROM attendance_excuses;

-- Hapus semua
DELETE FROM attendance_excuses;

-- Konfirmasi
SELECT COUNT(*) AS jumlah_setelah_dihapus FROM attendance_excuses;

SELECT 'Semua data attendance_excuses berhasil dihapus' AS status;
