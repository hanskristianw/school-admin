<?php
/**
 * Konfigurasi Sistem Pendaftaran Siswa Baru (PPDB / SPMB) CCS
 * Salin file ini menjadi config.php jika belum ada.
 */
if (!defined('CCS_REG_LOADED')) {
    http_response_code(403);
    header('Content-Type: text/plain');
    exit('403 Forbidden: Direct access is strictly prohibited.');
}

// Token rahasia sinkronisasi (Wajib sama dengan ADMISSION_SECRET_KEY / COURT_RENTAL_SECRET_KEY di .env.local Next.js)
define('API_SECRET_TOKEN', 'GANTI_DENGAN_TOKEN_RAHASIA_ANDA');

// URL Endpoint Next.js untuk sinkronisasi pendaftar ke dasbor admin sekolah
define('NEXTJS_API_URL', 'https://www.manageccs.online/api/public/admission');

// URL Publik tempat file index.php ini dihosting (digunakan untuk proxy bukti transfer ke Next.js)
define('HOSTING_URL', 'https://ccs.sch.id/registrasi');

// Nama Yayasan / Institusi
define('ORG_NAME', 'Yayasan Pendidikan Mayapada School');

// Informasi Rekening Pembayaran Formulir
define('BANK_NAME', 'Bank Mayapada');
define('BANK_REK', '100-3000-3853');
define('BANK_AN', 'Yayasan Pendidikan Mayapada School');

// Kontak Layanan PMB
define('CONTACT_PERSON', '+62 859-5986-0430');
define('CONTACT_EMAIL', 'admissions@ccs.sch.id');

// Tarif Default Formulir (jika belum ada gelombang aktif di database)
define('DEFAULT_FORM_FEE', 250000);
