<?php
/**
 * Proteksi Keamanan: Blokir akses langsung dari browser publik
 */
if (!defined('CCS_PORTAL_LOADED')) {
    http_response_code(403);
    header('Content-Type: text/plain');
    exit('403 Forbidden: Direct access is strictly prohibited.');
}

// Token rahasia sinkronisasi (Wajib sama dengan COURT_RENTAL_SECRET_KEY di .env.local Next.js)
define('API_SECRET_TOKEN', 'GANTI_DENGAN_TOKEN_RAHASIA_ANDA');

// URL Endpoint Next.js untuk sinkronisasi pesanan ke admin dashboard
define('NEXTJS_API_URL', 'https://www.manageccs.online/api/public/court-rental');
