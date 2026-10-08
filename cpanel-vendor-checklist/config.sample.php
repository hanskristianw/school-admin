<?php
if (!defined('CCS_VENDOR_LOADED')) {
    http_response_code(403);
    header('Content-Type: text/plain');
    exit('403 Forbidden: Direct access is strictly prohibited.');
}

// Konfigurasi Sinkronisasi cPanel Vendor Checklist ke Next.js (manageccs.online)
// Menggunakan token yang sama dengan Sewa Lapangan (COURT_RENTAL_SECRET_KEY)
// Salin file ini menjadi config.php di server cPanel
define('API_SECRET_TOKEN', 'ccs_court_auth_2026_x7k9p2m4');
define('NEXTJS_API_URL', 'https://www.manageccs.online/api/public/vendor-checklist');
