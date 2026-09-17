<?php
/**
 * KONFIGURASI SINKRONISASI SEWA LAPANGAN CCS (cPanel)
 * 
 * PANDUAN PENGGUNAAN:
 * 1. Salin/rename file ini menjadi 'config.php' di server cPanel Anda.
 * 2. Masukkan token rahasia yang sama dengan COURT_RENTAL_SECRET_KEY di file .env.local Next.js Anda.
 * 3. File 'config.php' ini otomatis diabaikan oleh Git (.gitignore) sehingga kredensial Anda 100% aman.
 */

// Token rahasia sinkronisasi (Wajib sama dengan COURT_RENTAL_SECRET_KEY di .env.local Next.js)
define('API_SECRET_TOKEN', 'GANTI_DENGAN_TOKEN_RAHASIA_ANDA');

// URL Endpoint Next.js untuk sinkronisasi pesanan ke admin dashboard
define('NEXTJS_API_URL', 'https://manageccs.online/api/public/court-rental');
