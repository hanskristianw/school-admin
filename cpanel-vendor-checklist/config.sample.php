<?php
if (!defined('CCS_VENDOR_LOADED')) {
    http_response_code(403);
    header('Content-Type: text/plain');
    exit('403 Forbidden: Direct access is strictly prohibited.');
}

// Konfigurasi Sinkronisasi cPanel Vendor Checklist ke Next.js (manageccs.online)
// Salin file ini menjadi config.php di server cPanel
define('API_SECRET_TOKEN', 'ccs_vendor_auth_2026_v9x2k7p4');
define('NEXTJS_API_URL', 'https://www.manageccs.online/api/public/vendor-checklist');
