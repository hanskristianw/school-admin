<?php
/**
 * ==============================================================================
 * SISTEM CHECKLIST KEBERSIHAN & PELAPORAN FASILITAS RUANGAN — CCS
 * Yayasan Pendidikan Mayapada School — Chung Chung Christian School
 * ==============================================================================
 * Standalone PHP 7.4 - 8.3 Application
 * Desain & Tipografi: 1:1 Identik dengan Sistem Sewa Lapangan & Registrasi CCS (ccs.sch.id)
 * Lokasi Hosting: cpanel ccs.sch.id/checklist/
 * ==============================================================================
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

define('CCS_VENDOR_LOADED', true);

// Muat konfigurasi rahasia
if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
}

if (!defined('API_SECRET_TOKEN')) define('API_SECRET_TOKEN', getenv('COURT_RENTAL_SECRET_KEY') ?: 'ccs_court_auth_2026_x7k9p2m4');
if (!defined('NEXTJS_API_URL')) define('NEXTJS_API_URL', 'https://www.manageccs.online/api/public/vendor-checklist');

// Daftar Petugas Cleaning Default (Role ID 14) untuk Pre-render Cepat Tanpa Menunggu cURL
$DEFAULT_CLEANERS = [
    ['user_id' => 447, 'name' => 'Andrean Driver'],
    ['user_id' => 445, 'name' => 'Budi Taman'],
    ['user_id' => 439, 'name' => 'Darul Cleaning'],
    ['user_id' => 438, 'name' => 'Davit Cleaning'],
    ['user_id' => 436, 'name' => 'Evi Cleaning'],
    ['user_id' => 448, 'name' => 'Fadil Kolam'],
    ['user_id' => 442, 'name' => 'Fitria Cleaning'],
    ['user_id' => 441, 'name' => 'Juhariya Cleaning'],
    ['user_id' => 437, 'name' => 'Raditya Cleaning'],
    ['user_id' => 466, 'name' => 'Rahmani .'],
    ['user_id' => 444, 'name' => 'Risky Cleaning'],
    ['user_id' => 443, 'name' => 'Suhadi Cleaning'],
    ['user_id' => 446, 'name' => 'Toni Taman']
];

define('UPLOAD_DIR', __DIR__ . '/uploads');

// Inisialisasi & proteksi folder uploads
if (!file_exists(UPLOAD_DIR)) {
    @mkdir(UPLOAD_DIR, 0755, true);
}
@file_put_contents(UPLOAD_DIR . '/.htaccess', "Options -Indexes\nOrder Deny,Allow\nDeny from all\n<IfModule mod_authz_core.c>\nRequire all denied\n</IfModule>\n<FilesMatch \"\\.(php|phtml|php5|pl|py|cgi|sh)$\">\nRequire all denied\n</FilesMatch>\n");
@file_put_contents(UPLOAD_DIR . '/index.html', '<!DOCTYPE html><html><head><title>403 Forbidden</title></head><body><h1>Directory access is forbidden.</h1></body></html>');

// ─── 1. SECURE STREAMING FOTO UNTUK NEXT.JS ADMIN ─────────────────────────
if (isset($_GET['action']) && $_GET['action'] === 'view_photo') {
    $token = $_GET['token'] ?? '';
    $validTokens = [
        defined('API_SECRET_TOKEN') ? API_SECRET_TOKEN : 'ccs_vendor_auth_2026_v9x2k7p4',
        'ccs_vendor_auth_2026_v9x2k7p4',
        'ccs_court_auth_2026_x7k9p2m4'
    ];
    if (!in_array($token, $validTokens, true)) {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Forbidden: Invalid security token']);
        exit;
    }

    $file = basename($_GET['file'] ?? '');
    $filePath = UPLOAD_DIR . '/' . $file;

    if (!$file || !file_exists($filePath) || !is_file($filePath)) {
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'File not found']);
        exit;
    }

    $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
    $mimeTypes = [
        'jpg'  => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png'  => 'image/png',
        'webp' => 'image/webp'
    ];
    $contentType = $mimeTypes[$ext] ?? 'application/octet-stream';

    header('Content-Type: ' . $contentType);
    header('Content-Length: ' . filesize($filePath));
    header('Cache-Control: private, max-age=86400');
    header('Content-Disposition: inline; filename="' . $file . '"');
    readfile($filePath);
    exit;
}

// ─── 2. AJAX ENDPOINT: FETCH STATUS RUANGAN HARI INI ──────────────────────
if (isset($_GET['action']) && $_GET['action'] === 'fetch_room') {
    header('Content-Type: application/json');
    $roomToken = trim($_GET['room_token'] ?? '');
    if (!$roomToken) {
        echo json_encode(['success' => false, 'message' => 'Token ruangan tidak disertakan']);
        exit;
    }

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, NEXTJS_API_URL . '?room_token=' . urlencode($roomToken));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($response === false || $httpCode >= 500) {
        echo json_encode(['success' => false, 'message' => 'Gagal terhubung ke server utama manageccs.online']);
        exit;
    }

    echo $response;
    exit;
}

// ─── 2b. AJAX ENDPOINT: FETCH DAFTAR PETUGAS CLEANING (USERS ROLE ID 14) ──
if (isset($_GET['action']) && $_GET['action'] === 'fetch_cleaners') {
    header('Content-Type: application/json');

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, NEXTJS_API_URL . '?action=get_cleaners');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($response === false || $httpCode >= 500) {
        echo json_encode(['success' => false, 'message' => 'Gagal mengambil data petugas dari server']);
        exit;
    }

    echo $response;
    exit;
}

// ─── 3. AJAX ENDPOINT: PROSES UPLOAD FOTO & SINKRONISASI CLEANER ──────────
if (isset($_POST['action']) && $_POST['action'] === 'submit_step') {
    header('Content-Type: application/json');

    $roomToken   = trim($_POST['room_token'] ?? '');
    $stageAction = trim($_POST['stage_action'] ?? '');
    $workerName  = trim($_POST['worker_name'] ?? '');
    $notes       = trim($_POST['notes'] ?? '');

    if (!$roomToken || !$stageAction) {
        echo json_encode(['success' => false, 'message' => 'Data pengerjaan tidak lengkap']);
        exit;
    }

    if ($stageAction === 'start_progress' && empty($workerName)) {
        echo json_encode(['success' => false, 'message' => 'Nama petugas wajib dipilih']);
        exit;
    }

    if (!isset($_FILES['photo_file']) || $_FILES['photo_file']['error'] !== UPLOAD_ERR_OK) {
        echo json_encode(['success' => false, 'message' => 'Foto bukti pekerjaan wajib diunggah']);
        exit;
    }

    $fileTmp  = $_FILES['photo_file']['tmp_name'];
    $fileSize = $_FILES['photo_file']['size'];
    $rawName  = $_FILES['photo_file']['name'];
    $ext      = strtolower(pathinfo($rawName, PATHINFO_EXTENSION));

    if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp'])) {
        echo json_encode(['success' => false, 'message' => 'Format file harus berupa gambar (JPG, PNG, atau WEBP)']);
        exit;
    }

    if ($fileSize > 15 * 1024 * 1024) {
        echo json_encode(['success' => false, 'message' => 'Ukuran file foto maksimal 15 MB']);
        exit;
    }

    $prefixMap = [
        'start_progress'  => 'before',
        'submit_finish'   => 'after',
        'submit_revision' => 'revision'
    ];
    $stageTag = $prefixMap[$stageAction] ?? 'photo';
    $safeDate = date('Ymd_His');
    $fileName = 'room_' . preg_replace('/[^a-zA-Z0-9_-]/', '', $roomToken) . "_{$stageTag}_{$safeDate}_" . bin2hex(random_bytes(4)) . '.' . $ext;
    $targetPath = UPLOAD_DIR . '/' . $fileName;

    if (!move_uploaded_file($fileTmp, $targetPath)) {
        echo json_encode(['success' => false, 'message' => 'Gagal menyimpan file foto ke server hosting']);
        exit;
    }

    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https" : "http";
    $host = $_SERVER['HTTP_HOST'];
    $dir = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\');
    $hostingBaseUrl = "{$protocol}://{$host}{$dir}";

    $payload = [
        'secret_token' => API_SECRET_TOKEN,
        'action'       => $stageAction,
        'room_token'   => $roomToken,
        'worker_name'  => $workerName,
        'image_file'   => $fileName,
        'hosting_url'  => $hostingBaseUrl,
        'notes'        => $notes
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, NEXTJS_API_URL);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer ' . API_SECRET_TOKEN
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 20);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($response === false) {
        echo json_encode(['success' => false, 'message' => 'Gagal mengirim data verifikasi ke server utama']);
        exit;
    }

    $resData = json_decode($response, true);
    if ($httpCode >= 400 || (isset($resData['success']) && !$resData['success'])) {
        $errMsg = $resData['message'] ?? 'Terjadi kesalahan saat memproses data di server';
        echo json_encode(['success' => false, 'message' => $errMsg]);
        exit;
    }

    echo json_encode([
        'success'   => true,
        'message'   => $resData['message'] ?? 'Berhasil disimpan',
        'fileName'  => $fileName,
        'serverRes' => $resData
    ]);
    exit;
}

// ─── 4. AJAX ENDPOINT: PROSES LAPORAN FASILITAS / PELAPOR ─────────────────
if (isset($_POST['action']) && $_POST['action'] === 'submit_report') {
    header('Content-Type: application/json');

    $roomToken        = trim($_POST['room_token'] ?? '');
    $reporterName     = trim($_POST['reporter_name'] ?? '');
    $reporterContact  = trim($_POST['reporter_contact'] ?? '');
    $issueDescription = trim($_POST['issue_description'] ?? '');

    if (!$roomToken || !$reporterName || !$issueDescription) {
        echo json_encode(['success' => false, 'message' => 'Nama pelapor, ruangan, dan deskripsi keluhan wajib diisi']);
        exit;
    }

    if (!isset($_FILES['photo_file']) || $_FILES['photo_file']['error'] !== UPLOAD_ERR_OK) {
        echo json_encode(['success' => false, 'message' => 'Foto bukti kondisi/kerusakan wajib diunggah']);
        exit;
    }

    $fileTmp  = $_FILES['photo_file']['tmp_name'];
    $fileSize = $_FILES['photo_file']['size'];
    $rawName  = $_FILES['photo_file']['name'];
    $ext      = strtolower(pathinfo($rawName, PATHINFO_EXTENSION));

    if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp'])) {
        echo json_encode(['success' => false, 'message' => 'Format file harus berupa gambar (JPG, PNG, atau WEBP)']);
        exit;
    }

    if ($fileSize > 15 * 1024 * 1024) {
        echo json_encode(['success' => false, 'message' => 'Ukuran file foto maksimal 15 MB']);
        exit;
    }

    $safeDate = date('Ymd_His');
    $fileName = 'report_' . preg_replace('/[^a-zA-Z0-9_-]/', '', $roomToken) . "_{$safeDate}_" . bin2hex(random_bytes(4)) . '.' . $ext;
    $targetPath = UPLOAD_DIR . '/' . $fileName;

    if (!move_uploaded_file($fileTmp, $targetPath)) {
        echo json_encode(['success' => false, 'message' => 'Gagal menyimpan file foto ke server hosting']);
        exit;
    }

    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https" : "http";
    $host = $_SERVER['HTTP_HOST'];
    $dir = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\');
    $hostingBaseUrl = "{$protocol}://{$host}{$dir}";

    $payload = [
        'secret_token'      => API_SECRET_TOKEN,
        'action'            => 'submit_report',
        'room_token'        => $roomToken,
        'reporter_name'     => $reporterName,
        'reporter_contact'  => $reporterContact,
        'issue_description' => $issueDescription,
        'image_file'        => $fileName,
        'hosting_url'       => $hostingBaseUrl
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, NEXTJS_API_URL);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer ' . API_SECRET_TOKEN
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 20);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($response === false) {
        echo json_encode(['success' => false, 'message' => 'Gagal mengirim laporan ke server utama']);
        exit;
    }

    $resData = json_decode($response, true);
    if ($httpCode >= 400 || (isset($resData['success']) && !$resData['success'])) {
        $errMsg = $resData['message'] ?? 'Terjadi kesalahan saat memproses laporan di server';
        echo json_encode(['success' => false, 'message' => $errMsg]);
        exit;
    }

    echo json_encode([
        'success'   => true,
        'message'   => $resData['message'] ?? 'Laporan berhasil dikirim',
        'fileName'  => $fileName,
        'serverRes' => $resData
    ]);
    exit;
}

$roomParam = htmlspecialchars(trim($_GET['room'] ?? ''));
?>
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Portal Ruangan & Checklist — Chung Chung Christian School</title>
  
  <!-- Favicon Resmi CCS -->
  <link rel="icon" type="image/png" sizes="16x16" href="https://ccs.sch.id/assets/images/favicon.png">

  <!-- Google Font: Poppins -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

  <!-- FontAwesome 5 Icons -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">

  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['Poppins', 'sans-serif'],
          },
          colors: {
            ccsNavy: '#022c46',
            ccsNavyLight: '#0b4877',
            ccsOrange: '#f16101',
            ccsOrangeLight: '#f79e27',
            ccsTeal: '#2da397',
            ccsPurple: '#7c4bc0',
            ccsDark: '#012237',
            ccsText: '#595959',
            ccsHeading: '#0b4877',
            ccsBg: '#fcfcfc',
            ccsFooterCopy: '#94a3ac',
          }
        }
      }
    }
  </script>

  <!-- SweetAlert2 CDN -->
  <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
  <!-- HTML5 QR Code Scanner CDN -->
  <script src="https://unpkg.com/html5-qrcode" type="text/javascript"></script>

  <style>
    body, button, input, select, textarea {
      font-family: 'Poppins', sans-serif;
    }
    body {
      color: #595959;
      font-size: 15px;
      line-height: 1.7;
      background-color: #fbfbfc;
      -webkit-font-smoothing: antialiased;
      -webkit-tap-highlight-color: transparent;
    }

    .fa, .fas, .far, .fal, .fad, .fab,
    .fa::before, .fas::before, .far::before, .fal::before, .fab::before,
    [class*="fa-"]::before {
      font-family: "Font Awesome 5 Free" !important;
      display: inline-block;
    }

    h1, h2, h3, h4, h5, h6 {
      color: #0b4877;
      font-weight: 700;
    }

    .main-logo {
      width: 128px !important;
      height: auto !important;
      display: block;
    }

    .thm-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border: 2px solid #f16101;
      outline: none;
      background-color: #f16101;
      font-size: 14px;
      font-weight: 600;
      color: #ffffff;
      padding: 11px 24px;
      border-radius: 40px;
      transition: all 0.3s ease;
      cursor: pointer;
      text-transform: capitalize;
    }
    .thm-btn:hover {
      background-color: #022c46;
      border-color: #022c46;
      color: #ffffff;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(2, 44, 70, 0.15);
    }
    .thm-btn--teal {
      background-color: #2da397;
      border-color: #2da397;
    }
    .thm-btn--teal:hover {
      background-color: #022c46;
      border-color: #022c46;
    }
    .thm-btn--outline {
      background-color: transparent;
      border-color: #cbd5e1;
      color: #475569;
    }
    .thm-btn--outline:hover {
      background-color: #f1f5f9;
      border-color: #94a3ac;
      color: #0b4877;
    }

    .site-footer {
      background-color: #012237;
    }
    .site-footer__copy {
      color: #94a3ac !important;
      font-size: 13px !important;
      font-weight: 500 !important;
      margin: 0;
      text-align: center;
    }
  </style>
</head>
<body class="min-h-screen flex flex-col justify-between">

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!-- 1. TOP BAR (TANGGAL & BAHASA / LANGUAGE SWITCHER)                       -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <div class="bg-ccsNavy text-white py-2">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-between">
      <!-- Language Switcher Pill -->
      <div class="flex items-center gap-1.5 text-xs font-semibold bg-white/10 p-0.5 rounded-full border border-white/20">
        <button 
          id="btnLangID" 
          onclick="setLanguage('id')" 
          class="px-2.5 py-0.5 rounded-full text-[11px] transition-all bg-ccsOrange text-white shadow-xs"
        >
          ID
        </button>
        <button 
          id="btnLangEN" 
          onclick="setLanguage('en')" 
          class="px-2.5 py-0.5 rounded-full text-[11px] transition-all text-gray-300 hover:text-white"
        >
          EN
        </button>
      </div>

      <!-- Date Display -->
      <div class="flex items-center gap-2 text-[12px] sm:text-[13px] font-medium text-gray-200">
        <i class="far fa-calendar-alt text-ccsOrangeLight"></i>
        <span><?= date('d M Y') ?></span>
      </div>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!-- 2. NAVBAR DENGAN LOGO RESMI CCS                                         -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <header class="bg-white sticky top-0 z-50 shadow-sm">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 h-[72px] sm:h-[76px] flex items-center justify-between">
      <a href="https://ccs.sch.id/" class="flex items-center">
        <img 
          src="https://ccs.sch.id/assets/images/logo-cccs.png" 
          alt="Chung Chung Christian School" 
          class="main-logo"
          onerror="this.src='https://ccs.sch.id/assets/images/logo.png';"
        />
      </a>
      <nav class="flex items-center gap-3 sm:gap-6 text-xs sm:text-[15px] font-medium">
        <a href="https://ccs.sch.id/" class="text-gray-800 hover:text-ccsOrange transition-colors hidden sm:inline-block">
          Home
        </a>
        <a href="index.php" class="text-ccsOrange font-semibold border-b-2 border-ccsOrange pb-1 transition-colors">
          <span data-i18n="portal_title">Portal Ruangan</span>
        </a>
      </nav>
    </div>

    <!-- PITA 3 WARNA IKONIK CCS -->
    <div class="w-full flex h-[6px]">
      <div class="flex-1 bg-ccsTeal"></div>
      <div class="flex-1 bg-ccsOrange"></div>
      <div class="flex-1 bg-ccsPurple"></div>
    </div>
  </header>

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!-- 3. KONTEN UTAMA                                                         -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <main class="max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 w-full space-y-6">

    <!-- Active Role Header Indicator (Clean Mobile-First Header) -->
    <div id="activeRoleBar" class="hidden bg-white rounded-2xl p-3.5 border border-gray-100 shadow-sm flex items-center justify-between gap-2.5">
      <div class="flex items-center gap-3 min-w-0">
        <div id="activeRoleIcon" class="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold bg-orange-100 text-ccsOrange shrink-0 shadow-xs">
          <i class="fas fa-broom"></i>
        </div>
        <div class="min-w-0">
          <div id="activeRoleCategoryText" class="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-tight">
            Petugas Kebersihan
          </div>
          <div class="text-sm font-extrabold text-ccsHeading truncate leading-tight mt-0.5">
            <span id="activeCleanerNameText">Darul Cleaning</span>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-1.5 shrink-0">
        <button 
          id="btnChangeCleanerQuick"
          type="button"
          onclick="promptSwitchCleanerModal()" 
          class="hidden px-2.5 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-ccsOrange text-xs font-bold items-center gap-1 transition active:scale-95"
          title="Ganti Nama Petugas"
        >
          <i class="fas fa-user-edit text-[10px]"></i>
          <span data-i18n="change_worker">Ganti</span>
        </button>
        <button 
          type="button"
          onclick="resetRole()" 
          class="px-2.5 py-1.5 rounded-xl border border-gray-200 text-gray-500 hover:text-ccsNavy hover:bg-gray-50 text-xs font-semibold flex items-center gap-1 transition active:scale-95"
          title="Ganti Peran"
        >
          <i class="fas fa-sync-alt text-[10px]"></i>
          <span class="hidden sm:inline" data-i18n="switch_role">Ganti Peran</span>
        </button>
      </div>
    </div>

    <!-- Loading State Card -->
    <div id="loadingCard" class="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center">
      <div class="w-12 h-12 border-4 border-ccsOrange border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p class="text-sm font-semibold text-ccsHeading" data-i18n="loading_room">Memeriksa Data Ruangan...</p>
      <p class="text-xs text-gray-400 mt-1" data-i18n="connecting_server">Menghubungkan ke sistem Chung Chung Christian School</p>
    </div>

    <!-- ─── SECTION 1: ROLE SELECTION (PILIH PERAN) ─────────────────────── -->
    <div id="roleSelectionSection" class="hidden space-y-5">
      <div class="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center space-y-2">
        <div class="w-12 h-12 rounded-full bg-orange-100 text-ccsOrange font-bold flex items-center justify-center text-xl mx-auto mb-1">
          <i class="fas fa-user-tag"></i>
        </div>
        <h2 class="text-lg sm:text-xl font-bold text-ccsHeading" data-i18n="role_title">
          Pilih Peran Anda
        </h2>
        <p class="text-xs text-gray-500 max-w-sm mx-auto" data-i18n="role_subtitle">
          Silakan pilih apakah Anda bertugas sebagai tim kebersihan ruangan atau ingin melaporkan kendala fasilitas.
        </p>
      </div>

      <!-- Choice Cards (Responsive Mobile-First) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">

        <!-- Card: Cleaner (Petugas Kebersihan) -->
        <div 
          class="bg-white rounded-2xl p-5 border-2 border-orange-200 hover:border-ccsOrange transition-all duration-300 shadow-xs hover:shadow-md flex flex-col justify-between group relative overflow-hidden"
        >
          <div class="absolute top-0 right-0 w-16 h-16 bg-orange-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div>
            <div class="w-12 h-12 rounded-2xl bg-orange-100 text-ccsOrange flex items-center justify-center text-xl mb-3 group-hover:scale-105 transition-transform">
              <i class="fas fa-broom"></i>
            </div>
            <div class="flex items-center gap-2 mb-1">
              <h3 class="text-base font-bold text-ccsHeading" data-i18n="role_cleaner_name">Petugas Kebersihan</h3>
              <span class="text-[10px] font-semibold bg-orange-50 text-ccsOrange px-2 py-0.5 rounded-full" data-i18n="role_cleaner_badge">Cleaner</span>
            </div>
            <p class="text-xs text-gray-500 line-clamp-2 mb-3" data-i18n="role_cleaner_desc">
              Checklist pengerjaan kebersihan ruangan & unggah foto before / after.
            </p>

            <!-- Dropdown Pemilihan Nama Petugas Kebersihan -->
            <div class="pt-2.5 border-t border-orange-100/70 mb-3 text-left">
              <div class="flex items-center justify-between mb-1">
                <label class="block text-[11px] font-bold text-gray-700 uppercase tracking-wider" data-i18n="select_your_name">
                  Pilih Nama Anda:
                </label>
                <span id="roleWorkerSavedBadge" class="hidden text-[10px] text-emerald-600 font-semibold flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 rounded">
                  <i class="fas fa-check"></i> <span data-i18n="auto_saved">Tersimpan</span>
                </span>
              </div>
              <div class="relative">
                <select 
                  id="roleWorkerNameSelect" 
                  onchange="handleGlobalCleanerChange(this.value)"
                  class="w-full px-3 py-2.5 text-xs border border-orange-200 rounded-xl bg-orange-50/40 text-gray-800 font-semibold focus:border-ccsOrange focus:ring-2 focus:ring-ccsOrange/20 outline-none appearance-none cursor-pointer"
                >
                  <option value="" data-i18n="cleaner_placeholder">-- Pilih nama Anda --</option>
                </select>
                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-ccsOrange">
                  <i class="fas fa-chevron-down text-xs"></i>
                </div>
              </div>
              <p class="text-[10px] text-gray-400 mt-1" data-i18n="cleaner_auto_remember_hint">
                Pilihan nama otomatis diingat untuk semua ruangan berikutnya.
              </p>
            </div>
          </div>

          <button 
            type="button" 
            onclick="handleEnterCleaner()" 
            class="thm-btn w-full text-xs py-2.5 group-hover:bg-ccsNavy group-hover:border-ccsNavy shadow-xs"
          >
            <i class="fas fa-check-circle mr-1"></i>
            <span data-i18n="role_cleaner_btn">Masuk sebagai Cleaner</span>
          </button>
        </div>

        <!-- Card: Pelapor (Facility Reporter) -->
        <div 
          onclick="selectRole('reporter')" 
          class="bg-white rounded-2xl p-5 border-2 border-gray-100 hover:border-ccsTeal transition-all duration-300 shadow-xs hover:shadow-md cursor-pointer flex flex-col justify-between group relative overflow-hidden"
        >
          <div class="absolute top-0 right-0 w-16 h-16 bg-teal-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div>
            <div class="w-12 h-12 rounded-2xl bg-teal-100 text-ccsTeal flex items-center justify-center text-xl mb-4 group-hover:scale-105 transition-transform">
              <i class="fas fa-bullhorn"></i>
            </div>
            <div class="flex items-center gap-2 mb-1">
              <h3 class="text-base font-bold text-ccsHeading" data-i18n="role_reporter_name">Pelapor Fasilitas</h3>
              <span class="text-[10px] font-semibold bg-teal-50 text-ccsTeal px-2 py-0.5 rounded-full" data-i18n="role_reporter_badge">Reporter</span>
            </div>
            <p class="text-xs text-gray-500 line-clamp-3 mb-4" data-i18n="role_reporter_desc">
              Laporkan fasilitas ruangan yang rusak, bermasalah, atau memerlukan perbaikan.
            </p>
          </div>
          <button class="thm-btn thm-btn--teal w-full text-xs py-2.5 group-hover:bg-ccsNavy group-hover:border-ccsNavy">
            <i class="fas fa-exclamation-circle mr-1"></i>
            <span data-i18n="role_reporter_btn">Laporkan Masalah</span>
          </button>
        </div>

      </div>
    </div>

    <!-- ─── SECTION 2: QR SCANNER SECTION ───────────────────────────────── -->
    <div id="scannerSection" class="hidden">
      <div class="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm space-y-4">

        <!-- 2A. KOTAK KUNCI: JIKA PETUGAS BELUM PILIH NAMA (KAMERA WAJIB MATI) -->
        <div id="cleanerLockBox" class="hidden bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-6 text-center space-y-4">
          <div class="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-2xl mx-auto shadow-xs">
            <i class="fas fa-user-lock"></i>
          </div>
          <div>
            <h3 class="text-base font-extrabold text-ccsHeading" data-i18n="cleaner_required_title">
              Pilih Nama Petugas Terlebih Dahulu
            </h3>
            <p class="text-xs text-gray-600 mt-1.5 max-w-sm mx-auto" data-i18n="cleaner_required_subtitle">
              Kamera scanner tidak dapat digunakan sebelum Anda memilih identitas nama petugas kebersihan yang bertugas.
            </p>
          </div>
          <div class="max-w-xs mx-auto">
            <label class="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5 text-left" data-i18n="select_your_name">
              Pilih Nama Anda:
            </label>
            <div class="relative">
              <select 
                id="scannerLockWorkerSelect" 
                onchange="handleSelectCleanerAndUnlock(this.value)"
                class="w-full px-4 py-3 text-xs font-bold border-2 border-amber-300 rounded-xl bg-white text-gray-800 focus:border-ccsOrange focus:ring-2 focus:ring-ccsOrange/20 outline-none shadow-xs appearance-none cursor-pointer"
              >
                <option value="" data-i18n="cleaner_placeholder">-- Pilih nama Anda --</option>
              </select>
              <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-amber-600">
                <i class="fas fa-chevron-down text-xs"></i>
              </div>
            </div>
            <p class="text-[10px] text-gray-400 mt-2 text-left" data-i18n="cleaner_lock_hint">
              Setelah dipilih, kamera scanner akan aktif & nama diingat permanen di HP ini.
            </p>
          </div>
        </div>

        <!-- 2B. KOTAK SCANNER AKTIF (Hanya aktif jika nama sudah dipilih / mode pelapor) -->
        <div id="scannerActiveBox" class="space-y-4">
          <div class="text-center">
            <div id="scannerIconBox" class="w-12 h-12 rounded-full bg-orange-100 text-ccsOrange font-bold flex items-center justify-center text-xl mx-auto mb-2">
              <i class="fas fa-qrcode"></i>
            </div>
            <h2 id="scannerHeading" class="text-lg font-bold text-ccsHeading" data-i18n="scan_heading">Scan QR Code Ruangan</h2>
            <p id="scannerSubHeading" class="text-xs text-gray-500 mt-1" data-i18n="scan_subtitle">Arahkan kamera ke stiker barcode di pintu ruangan sekolah</p>
          </div>

          <div id="qrReader" class="overflow-hidden rounded-xl border border-gray-200 bg-gray-900 min-h-[240px]"></div>

          <div class="pt-4 border-t border-gray-100 text-center">
            <p class="text-xs text-gray-400 mb-2 font-medium" data-i18n="manual_token_label">Atau masukkan kode token ruangan:</p>
            <div class="flex gap-2">
              <input 
                type="text" 
                id="manualRoomToken" 
                placeholder="Contoh: rm_a1b2c3d4" 
                class="flex-1 px-4 py-2.5 text-xs border border-gray-200 rounded-xl focus:border-ccsNavy focus:ring-2 focus:ring-ccsNavy/10 font-mono uppercase outline-none"
              >
              <button onclick="handleManualToken()" class="thm-btn py-2 px-5 text-xs">
                <span data-i18n="open_btn">Buka</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- ─── SECTION 3: CLEANER FORM SECTION ─────────────────────────────── -->
    <div id="cleanerFormSection" class="hidden space-y-5">

      <!-- Room Header Box -->
      <div class="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm relative overflow-hidden">
        <div class="flex items-start justify-between gap-3">
          <div>
            <span class="text-[11px] font-bold tracking-wider uppercase text-ccsTeal bg-teal-50 px-2.5 py-1 rounded-md inline-block">
              <i class="fas fa-door-open mr-1"></i> <span data-i18n="room_location">Lokasi Ruangan</span>
            </span>
            <h2 id="cleanerRoomName" class="text-lg sm:text-xl font-bold text-ccsHeading mt-2">
              Nama Ruangan
            </h2>
            <p id="cleanerRoomToken" class="text-xs font-mono text-gray-400 mt-0.5">
              Token: -
            </p>
          </div>
          <div id="cleanerStatusBadge" class="shrink-0 text-xs font-bold px-3 py-1.5 rounded-full">
            <!-- Dynamic Status Badge -->
          </div>
        </div>
      </div>

      <!-- Identitas Petugas Cleaner (Dropdown dari users role Cleaning) -->
      <div class="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-orange-100 text-ccsOrange font-bold text-xs flex items-center justify-center shrink-0">
              <i class="fas fa-user"></i>
            </div>
            <h3 class="text-sm font-bold text-ccsHeading" data-i18n="cleaner_id_title">Identitas Petugas Kebersihan</h3>
          </div>
          <span class="text-[11px] text-emerald-600 font-semibold flex items-center bg-emerald-50 px-2 py-0.5 rounded-md">
            <i class="fas fa-check-circle mr-1"></i> <span data-i18n="auto_saved">Tersimpan Otomatis</span>
          </span>
        </div>

        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5" data-i18n="cleaner_select_label">
            Nama Lengkap Petugas
          </label>
          <div class="relative">
            <select 
              id="workerNameSelect" 
              onchange="handleGlobalCleanerChange(this.value)"
              class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-ccsNavy focus:ring-2 focus:ring-ccsNavy/10 text-sm outline-none transition bg-white appearance-none cursor-pointer"
            >
              <option value="" data-i18n="cleaner_loading">-- Memuat daftar petugas... --</option>
            </select>
            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
              <i class="fas fa-chevron-down text-xs"></i>
            </div>
          </div>
          <p class="text-[11px] text-gray-400 mt-1.5" data-i18n="cleaner_hint">
            Pilihan Anda otomatis tersimpan di HP ini, tidak perlu dipilih ulang untuk ruangan lainnya.
          </p>
        </div>
      </div>

      <!-- Dynamic Stage Container (Before / After / Revision) -->
      <div id="stageContainer" class="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm space-y-4">
        <!-- Injected via JavaScript -->
      </div>

    </div>

    <!-- ─── SECTION 4: PELAPOR / REPORTER FORM SECTION ───────────────────── -->
    <div id="reporterFormSection" class="hidden space-y-5">

      <!-- Room Header Box -->
      <div class="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm relative overflow-hidden">
        <div class="flex items-start justify-between gap-3">
          <div>
            <span class="text-[11px] font-bold tracking-wider uppercase text-ccsTeal bg-teal-50 px-2.5 py-1 rounded-md inline-block">
              <i class="fas fa-door-open mr-1"></i> <span data-i18n="room_location">Lokasi Ruangan</span>
            </span>
            <h2 id="reporterRoomName" class="text-lg sm:text-xl font-bold text-ccsHeading mt-2">
              Nama Ruangan
            </h2>
            <p id="reporterRoomToken" class="text-xs font-mono text-gray-400 mt-0.5">
              Token: -
            </p>
          </div>
          <div class="shrink-0 text-xs font-bold px-3 py-1.5 rounded-full bg-teal-50 text-ccsTeal border border-teal-200">
            <i class="fas fa-bullhorn mr-1"></i> <span data-i18n="facility_report_badge">Laporan Fasilitas</span>
          </div>
        </div>
      </div>

      <!-- Form Card: Pelaporan Kendala / Kerusakan Ruangan -->
      <div class="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm space-y-4">
        <div class="border-b border-gray-100 pb-3">
          <h3 class="text-sm font-bold text-ccsHeading flex items-center gap-2">
            <i class="fas fa-clipboard-list text-ccsTeal"></i>
            <span data-i18n="reporter_form_title">Formulir Laporan Fasilitas</span>
          </h3>
          <p class="text-xs text-gray-400 mt-1" data-i18n="reporter_form_subtitle">
            Kirimkan laporan kendala atau kerusakan ruangan untuk ditindaklanjuti tim operasional.
          </p>
        </div>

        <!-- Nama Pelapor -->
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
            <span data-i18n="reporter_name_label">Nama Lengkap Pelapor</span> <span class="text-rose-500">*</span>
          </label>
          <input 
            type="text" 
            id="reporterNameInput" 
            placeholder="Contoh: Budi Santoso / Ms. Sarah"
            data-i18n-ph="reporter_name_placeholder"
            class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-ccsTeal focus:ring-2 focus:ring-ccsTeal/10 text-sm outline-none transition"
          >
        </div>

        <!-- Kontak WhatsApp / Email (Opsional) -->
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
            <span data-i18n="reporter_contact_label">No. WhatsApp / Email</span> <span class="text-gray-400 font-normal text-[11px]" data-i18n="optional_tag">(Opsional)</span>
          </label>
          <input 
            type="text" 
            id="reporterContactInput" 
            placeholder="Untuk konfirmasi status tindak lanjut"
            data-i18n-ph="reporter_contact_placeholder"
            class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-ccsTeal focus:ring-2 focus:ring-ccsTeal/10 text-sm outline-none transition"
          >
        </div>

        <!-- Foto Bukti Kondisi / Kerusakan (Wajib) -->
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
            <span data-i18n="reporter_photo_label">Foto Bukti Kerusakan / Kondisi</span> <span class="text-rose-500">*</span>
          </label>

          <input 
            type="file" 
            id="reporterCameraInput" 
            accept="image/*" 
            capture="environment" 
            class="hidden" 
            onchange="handleReporterFileSelect(event)"
          >

          <!-- Upload Box / Camera Trigger -->
          <div 
            id="reporterUploadPlaceholder"
            onclick="triggerReporterCamera()"
            class="border-2 border-dashed border-gray-200 hover:border-ccsTeal rounded-2xl p-6 text-center cursor-pointer transition-colors bg-teal-50/20"
          >
            <div class="w-12 h-12 rounded-full bg-teal-100 text-ccsTeal flex items-center justify-center text-xl mx-auto mb-2">
              <i class="fas fa-camera"></i>
            </div>
            <p class="text-xs font-bold text-ccsHeading" data-i18n="take_photo_btn">Ambil Foto dengan Kamera</p>
            <p class="text-[11px] text-gray-400 mt-0.5" data-i18n="photo_auto_compress">Foto otomatis dikompresi agar hemat kuota</p>
          </div>

          <!-- Preview Box -->
          <div id="reporterPreviewBox" class="hidden space-y-2">
            <div class="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-900 flex items-center justify-center max-h-[260px]">
              <img id="reporterImgPreview" src="" alt="Bukti Laporan" class="w-full h-auto max-h-[260px] object-contain">
            </div>
            <button 
              type="button" 
              onclick="triggerReporterCamera()"
              class="w-full py-2 px-3 text-xs font-semibold text-ccsTeal hover:bg-teal-50 rounded-xl border border-teal-200 transition flex items-center justify-center gap-1.5"
            >
              <i class="fas fa-sync-alt"></i>
              <span data-i18n="retake_photo">Ganti / Foto Ulang</span>
            </button>
          </div>
        </div>

        <!-- Deskripsi Kendala / Kerusakan (Wajib) -->
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
            <span data-i18n="reporter_desc_label">Deskripsi Kendala / Kerusakan</span> <span class="text-rose-500">*</span>
          </label>
          <textarea 
            id="reporterIssueDesc" 
            rows="3" 
            placeholder="Jelaskan kendala fasilitas (misal: AC tidak dingin, lampu mati, proyektor bergaris, meja rusak, dll)..."
            data-i18n-ph="reporter_desc_placeholder"
            class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-ccsTeal focus:ring-2 focus:ring-ccsTeal/10 text-sm outline-none transition"
          ></textarea>
        </div>

        <!-- Submit Button -->
        <button 
          id="btnSubmitReport"
          onclick="submitReporterReport()" 
          class="thm-btn thm-btn--teal w-full py-3.5 text-sm font-semibold rounded-xl flex items-center justify-center gap-2"
        >
          <i class="fas fa-paper-plane"></i>
          <span data-i18n="submit_report_btn">Kirim Laporan Fasilitas</span>
        </button>

      </div>

    </div>

  </main>

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!-- 4. COPYRIGHT FOOTER                                                     -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <footer class="site-footer bg-[#012237] py-6 text-center">
    <div class="max-w-4xl mx-auto px-4 flex items-center justify-center relative">
      <p class="site-footer__copy text-[#94a3ac] text-[13px] sm:text-[14px] font-medium m-0 tracking-normal">
        &copy; <?= date('Y') ?> Chung Chung Christian School. All Right Reserved
      </p>
    </div>
  </footer>

  <!-- Modal Preview Gambar -->
  <div id="imagePreviewModal" class="fixed inset-0 bg-black/80 z-50 hidden flex items-center justify-center p-4 backdrop-blur-xs" onclick="closeImagePreview()">
    <div class="max-w-md w-full bg-white rounded-2xl overflow-hidden shadow-2xl relative" onclick="event.stopPropagation()">
      <div class="p-3.5 bg-ccsNavy text-white flex justify-between items-center">
        <span id="previewModalTitle" class="text-xs font-semibold">Preview Foto</span>
        <button onclick="closeImagePreview()" class="text-white hover:text-ccsOrange text-sm font-bold px-2 py-1">✕</button>
      </div>
      <div class="p-2 flex items-center justify-center bg-gray-900 max-h-[70vh] overflow-auto">
        <img id="modalPreviewImg" src="" alt="Bukti Foto" class="max-w-full max-h-[65vh] rounded-lg object-contain">
      </div>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!-- 5. JAVASCRIPT APLIKASI (BILINGUAL ID & EN, ROLE SELECTION, CAMERA)       -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <script>
    // ─── KAMUS BAHASA DUA ARAH (INDONESIAN & ENGLISH) ──────────────────────
    const I18N = {
      id: {
        portal_title: 'Portal Ruangan',
        active_role_label: 'Peran Saat Ini',
        switch_role: 'Ganti Peran',
        loading_room: 'Memeriksa Data Ruangan...',
        connecting_server: 'Menghubungkan ke sistem Chung Chung Christian School',
        role_title: 'Pilih Peran Anda',
        role_subtitle: 'Silakan pilih apakah Anda bertugas sebagai tim kebersihan ruangan atau ingin melaporkan kendala fasilitas.',
        role_cleaner_name: 'Petugas Kebersihan',
        role_cleaner_badge: 'Cleaner',
        role_cleaner_desc: 'Checklist pengerjaan kebersihan ruangan & unggah foto before / after.',
        role_cleaner_btn: 'Masuk sebagai Cleaner',
        role_reporter_name: 'Pelapor Fasilitas',
        role_reporter_badge: 'Reporter',
        role_reporter_desc: 'Laporkan fasilitas ruangan yang rusak, bermasalah, atau memerlukan perbaikan.',
        role_reporter_btn: 'Laporkan Masalah',
        scan_heading: 'Scan QR Code Ruangan',
        scan_cleaner_sub: 'Arahkan kamera ke stiker barcode di pintu ruangan sekolah',
        scan_reporter_sub: 'Arahkan kamera ke stiker barcode di pintu ruangan yang ingin dilaporkan',
        manual_token_label: 'Atau masukkan kode token ruangan:',
        manual_token_placeholder: 'Contoh: rm_a1b2c3d4',
        open_btn: 'Buka',
        room_location: 'Lokasi Ruangan',
        cleaner_id_title: 'Identitas Petugas Kebersihan',
        auto_saved: 'Tersimpan Otomatis',
        cleaner_select_label: 'Nama Lengkap Petugas',
        cleaner_loading: '-- Memuat daftar petugas... --',
        cleaner_placeholder: '-- Pilih nama Anda --',
        cleaner_hint: 'Pilihan Anda otomatis tersimpan di HP ini, tidak perlu dipilih ulang untuk ruangan lainnya.',
        facility_report_badge: 'Laporan Fasilitas',
        reporter_form_title: 'Formulir Laporan Fasilitas',
        reporter_form_subtitle: 'Kirimkan laporan kendala atau kerusakan ruangan untuk ditindaklanjuti tim operasional.',
        reporter_name_label: 'Nama Lengkap Pelapor',
        reporter_name_placeholder: 'Contoh: Budi Santoso / Ms. Sarah',
        reporter_contact_label: 'No. WhatsApp / Email',
        reporter_contact_placeholder: 'Untuk konfirmasi status tindak lanjut',
        optional_tag: '(Opsional)',
        reporter_photo_label: 'Foto Bukti Kerusakan / Kondisi',
        take_photo_btn: 'Ambil Foto dengan Kamera',
        photo_auto_compress: 'Foto otomatis dikompresi agar hemat kuota',
        retake_photo: 'Ganti / Foto Ulang',
        reporter_desc_label: 'Deskripsi Kendala / Kerusakan',
        reporter_desc_placeholder: 'Jelaskan kendala fasilitas (misal: AC tidak dingin, lampu mati, proyektor bergaris, meja rusak, dll)...',
        submit_report_btn: 'Kirim Laporan Fasilitas',
        submitting_report: 'Mengunggah & Mengirim Laporan...',
        report_success_title: 'Laporan Berhasil Terkirim!',
        report_success_desc: 'Terima kasih atas laporan Anda. Tim operasional sekolah akan segera memeriksa dan menindaklanjuti kendala di ruangan ini.',
        scan_another_room: 'Scan Ruangan Lain',
        alert_select_cleaner: 'Silakan pilih nama petugas kebersihan terlebih dahulu.',
        alert_take_photo: 'Silakan ambil foto bukti terlebih dahulu menggunakan kamera.',
        alert_enter_desc: 'Silakan isi deskripsi kendala kerusakan ruangan terlebih dahulu.',
        alert_enter_name: 'Silakan isi nama pelapor terlebih dahulu.',
        select_your_name: 'Pilih Nama Anda:',
        cleaner_auto_remember_hint: 'Pilihan nama otomatis diingat untuk semua ruangan berikutnya.',
        logged_in_cleaner: 'Petugas Kebersihan Aktif:',
        auto_selected: 'Tersimpan Otomatis',
        change_worker: 'Ganti Nama',
        active_worker: 'Petugas',
        prompt_select_worker: 'Silakan pilih nama petugas kebersihan terlebih dahulu.',
        cleaner_required_title: 'Pilih Nama Petugas Terlebih Dahulu',
        cleaner_required_subtitle: 'Kamera scanner tidak dapat digunakan sebelum Anda memilih identitas nama petugas kebersihan yang bertugas.',
        cleaner_lock_hint: 'Setelah dipilih, kamera scanner akan aktif & nama diingat permanen di HP ini.'
      },
      en: {
        portal_title: 'Room Portal',
        active_role_label: 'Current Role',
        switch_role: 'Switch Role',
        loading_room: 'Checking Room Data...',
        connecting_server: 'Connecting to Chung Chung Christian School system',
        role_title: 'Select Your Role',
        role_subtitle: 'Please select whether you are cleaning staff or reporting a facility issue.',
        role_cleaner_name: 'Cleaning Staff',
        role_cleaner_badge: 'Cleaner',
        role_cleaner_desc: 'Room cleaning checklist & before / after photo verification.',
        role_cleaner_btn: 'Enter as Cleaner',
        role_reporter_name: 'Facility Reporter',
        role_reporter_badge: 'Reporter',
        role_reporter_desc: 'Report damaged, malfunctioning, or dirty room facilities.',
        role_reporter_btn: 'Report an Issue',
        scan_heading: 'Scan Room QR Code',
        scan_cleaner_sub: 'Aim your camera at the QR sticker on the classroom door',
        scan_reporter_sub: 'Aim your camera at the QR sticker on the door of the room you wish to report',
        manual_token_label: 'Or enter room token code:',
        manual_token_placeholder: 'e.g.: rm_a1b2c3d4',
        open_btn: 'Open',
        room_location: 'Room Location',
        cleaner_id_title: 'Cleaning Staff Identity',
        auto_saved: 'Saved Automatically',
        cleaner_select_label: 'Staff Full Name',
        cleaner_loading: '-- Loading staff list... --',
        cleaner_placeholder: '-- Select your name --',
        cleaner_hint: 'Your selection is automatically saved on this phone for subsequent rooms.',
        facility_report_badge: 'Facility Report',
        reporter_form_title: 'Facility Issue Report Form',
        reporter_form_subtitle: 'Submit room issues or damage for operations team follow-up.',
        reporter_name_label: 'Reporter Full Name',
        reporter_name_placeholder: 'e.g.: Budi Santoso / Ms. Sarah',
        reporter_contact_label: 'WhatsApp No. / Email',
        reporter_contact_placeholder: 'For follow-up status updates',
        optional_tag: '(Optional)',
        reporter_photo_label: 'Photo of Issue / Condition',
        take_photo_btn: 'Take Photo with Camera',
        photo_auto_compress: 'Photos are automatically compressed to save cellular data',
        retake_photo: 'Retake Photo',
        reporter_desc_label: 'Issue / Damage Description',
        reporter_desc_placeholder: 'Describe the issue (e.g., AC not cold, lights flickering, broken projector, damaged desk, etc.)...',
        submit_report_btn: 'Submit Facility Report',
        submitting_report: 'Uploading & Submitting Report...',
        report_success_title: 'Report Submitted Successfully!',
        report_success_desc: 'Thank you for your report. The school operations team will inspect and follow up on this room shortly.',
        scan_another_room: 'Scan Another Room',
        alert_select_cleaner: 'Please select your cleaning staff name first.',
        alert_take_photo: 'Please take photo evidence using the camera first.',
        alert_enter_desc: 'Please provide a description of the issue or damage.',
        alert_enter_name: 'Please enter reporter name first.',
        select_your_name: 'Select Your Name:',
        cleaner_auto_remember_hint: 'Your name will be automatically remembered for upcoming rooms.',
        logged_in_cleaner: 'Active Cleaning Staff:',
        auto_selected: 'Auto-selected',
        change_worker: 'Change Staff',
        active_worker: 'Staff',
        prompt_select_worker: 'Please select your cleaning staff name first.',
        cleaner_required_title: 'Select Cleaning Staff Name First',
        cleaner_required_subtitle: 'Camera scanner is disabled until you select your cleaning staff identity.',
        cleaner_lock_hint: 'Once selected, the scanner camera will activate and remember your name on this phone.'
      }
    };

    let currentLang = localStorage.getItem('ccs_portal_lang') || 'id';
    let currentRole = localStorage.getItem('ccs_portal_role') || null; // 'cleaner' | 'reporter' | null
    let currentRoomToken = '<?= $roomParam ?>';
    let currentRoomData = null;
    let currentChecklist = null;
    let cleanersList = <?= json_encode($DEFAULT_CLEANERS ?? []) ?>;

    let selectedCleanerBlob = null;
    let selectedReporterBlob = null;
    let qrScanner = null;

    document.addEventListener('DOMContentLoaded', () => {
      applyLanguage(currentLang);
      populateCleanerSelect();
      fetchCleaners();

      const savedWorkerName = localStorage.getItem('ccs_vendor_worker_name');

      // Inisialisasi Alur Opsi A
      if (currentRoomToken) {
        if (currentRole === 'cleaner') {
          // Jika sudah peran cleaner tapi belum pernah pilih nama, buka role selection agar nama dipilih dulu
          if (!savedWorkerName) {
            showRoleSelectionSection();
          } else {
            selectRole('cleaner', false);
          }
        } else if (currentRole === 'reporter') {
          selectRole('reporter', false);
        } else {
          // Belum memilih peran tapi sudah scan QR ruangan
          showRoleSelectionSection();
        }
      } else {
        if (currentRole === 'cleaner') {
          if (!savedWorkerName) {
            showRoleSelectionSection();
          } else {
            selectRole('cleaner', false);
          }
        } else if (currentRole === 'reporter') {
          selectRole(currentRole, false);
        } else {
          showRoleSelectionSection();
        }
      }
    });

    // ─── FITUR BAHASA (I18N) ───────────────────────────────────────────────
    function setLanguage(lang) {
      currentLang = lang;
      localStorage.setItem('ccs_portal_lang', lang);
      applyLanguage(lang);
      if (currentChecklist && currentRole === 'cleaner') {
        renderCleanerStage(currentChecklist);
      }
    }

    function applyLanguage(lang) {
      const dict = I18N[lang] || I18N.id;

      // Update switcher UI
      const btnID = document.getElementById('btnLangID');
      const btnEN = document.getElementById('btnLangEN');
      if (btnID && btnEN) {
        if (lang === 'id') {
          btnID.className = 'px-2.5 py-0.5 rounded-full text-[11px] transition-all bg-ccsOrange text-white shadow-xs';
          btnEN.className = 'px-2.5 py-0.5 rounded-full text-[11px] transition-all text-gray-300 hover:text-white';
        } else {
          btnEN.className = 'px-2.5 py-0.5 rounded-full text-[11px] transition-all bg-ccsOrange text-white shadow-xs';
          btnID.className = 'px-2.5 py-0.5 rounded-full text-[11px] transition-all text-gray-300 hover:text-white';
        }
      }

      // Update all elements with data-i18n
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) el.textContent = dict[key];
      });

      // Update placeholders
      document.querySelectorAll('[data-i18n-ph]').forEach(el => {
        const key = el.getAttribute('data-i18n-ph');
        if (dict[key]) el.placeholder = dict[key];
      });

      // Update scanner subtitle depending on active role
      updateScannerText();
    }

    // ─── AMBIL DAFTAR CLEANERS DARI USERS (ROLE CLEANING) ─────────────────
    async function fetchCleaners() {
      try {
        const res = await fetch('index.php?action=fetch_cleaners');
        const data = await res.json();
        if (data.success && Array.isArray(data.cleaners) && data.cleaners.length > 0) {
          cleanersList = data.cleaners;
          populateCleanerSelect();
        }
      } catch (e) {
        console.warn('Gagal memuat update daftar cleaners dari server:', e);
      }
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function populateCleanerSelect() {
      const dict = I18N[currentLang] || I18N.id;
      const placeholder = dict.cleaner_placeholder || '-- Pilih nama Anda --';
      const saved = localStorage.getItem('ccs_vendor_worker_name') || '';

      const dropdownIds = ['roleWorkerNameSelect', 'scannerLockWorkerSelect', 'workerNameSelect'];

      dropdownIds.forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;

        let html = `<option value="">${placeholder}</option>`;
        cleanersList.forEach(c => {
          const isSelected = (saved && c.name === saved) ? 'selected' : '';
          html += `<option value="${escapeHtml(c.name)}" ${isSelected}>${escapeHtml(c.name)}</option>`;
        });

        sel.innerHTML = html;
        if (saved) {
          sel.value = saved;
        }
      });

      syncAllCleanerDropdowns(saved);
    }

    function syncAllCleanerDropdowns(selectedName) {
      const current = selectedName || localStorage.getItem('ccs_vendor_worker_name') || '';

      // 1. Sinkronkan nilai semua dropdown
      ['roleWorkerNameSelect', 'scannerLockWorkerSelect', 'workerNameSelect'].forEach(id => {
        const el = document.getElementById(id);
        if (el && el.value !== current) {
          el.value = current;
        }
      });

      // 2. Badge tersimpan di role card
      const savedBadge = document.getElementById('roleWorkerSavedBadge');
      if (savedBadge) {
        if (current) savedBadge.classList.remove('hidden');
        else savedBadge.classList.add('hidden');
      }

      // 3. Update tampilan mobile header (Active Role Bar)
      updateActiveRoleBarHeader(current);
    }

    function updateActiveRoleBarHeader(workerName) {
      const bar = document.getElementById('activeRoleBar');
      const icon = document.getElementById('activeRoleIcon');
      const categoryText = document.getElementById('activeRoleCategoryText');
      const cleanerNameEl = document.getElementById('activeCleanerNameText');
      const btnQuickChange = document.getElementById('btnChangeCleanerQuick');
      const dict = I18N[currentLang] || I18N.id;
      const isEN = currentLang === 'en';

      if (!currentRole) {
        if (bar) bar.classList.add('hidden');
        return;
      }

      if (bar) bar.classList.remove('hidden');

      if (currentRole === 'cleaner') {
        if (icon) {
          icon.className = 'w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold bg-orange-100 text-ccsOrange shrink-0 shadow-xs';
          icon.innerHTML = '<i class="fas fa-broom"></i>';
        }
        if (categoryText) {
          categoryText.textContent = dict.role_cleaner_name || 'Petugas Kebersihan';
        }
        const saved = workerName || localStorage.getItem('ccs_vendor_worker_name');
        if (cleanerNameEl) {
          cleanerNameEl.textContent = saved || (isEN ? 'Name Not Selected' : 'Nama Belum Dipilih');
          cleanerNameEl.className = saved ? 'text-ccsHeading font-extrabold' : 'text-amber-600 font-semibold italic';
        }
        if (btnQuickChange) {
          btnQuickChange.classList.remove('hidden');
          btnQuickChange.classList.add('flex');
        }
      } else {
        if (icon) {
          icon.className = 'w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold bg-teal-100 text-ccsTeal shrink-0 shadow-xs';
          icon.innerHTML = '<i class="fas fa-bullhorn"></i>';
        }
        if (categoryText) {
          categoryText.textContent = dict.role_reporter_badge || 'Reporter';
        }
        if (cleanerNameEl) {
          cleanerNameEl.textContent = dict.role_reporter_name || 'Pelapor Fasilitas';
          cleanerNameEl.className = 'text-ccsHeading font-extrabold';
        }
        if (btnQuickChange) {
          btnQuickChange.classList.add('hidden');
          btnQuickChange.classList.remove('flex');
        }
      }
    }

    function handleGlobalCleanerChange(name) {
      if (!name) return;
      localStorage.setItem('ccs_vendor_worker_name', name);
      syncAllCleanerDropdowns(name);
    }

    function handleSelectCleanerAndUnlock(name) {
      if (!name) return;
      localStorage.setItem('ccs_vendor_worker_name', name);
      syncAllCleanerDropdowns(name);
      showScannerSection(); // Unlocks and starts camera immediately!
    }

    function handleEnterCleaner() {
      const isEN = currentLang === 'en';
      const roleSelect = document.getElementById('roleWorkerNameSelect');
      let selected = (roleSelect ? roleSelect.value.trim() : '') || localStorage.getItem('ccs_vendor_worker_name') || '';

      if (!selected) {
        Swal.fire({
          icon: 'warning',
          title: isEN ? 'Select Your Name' : 'Pilih Nama Petugas',
          text: isEN ? 'Please select your cleaning staff name from the dropdown list before proceeding.' : 'Silakan pilih nama petugas kebersihan Anda dari daftar dropdown terlebih dahulu sebelum masuk ke scanner kamera.',
          confirmButtonText: isEN ? 'OK, I Will Select' : 'Baik, Saya Pilih'
        }).then(() => {
          if (roleSelect) {
            roleSelect.focus();
            roleSelect.classList.add('ring-2', 'ring-ccsOrange');
            setTimeout(() => roleSelect.classList.remove('ring-2', 'ring-ccsOrange'), 2000);
          }
        });
        return;
      }

      localStorage.setItem('ccs_vendor_worker_name', selected);
      selectRole('cleaner', true);
    }

    function promptSwitchCleanerModal() {
      const isEN = currentLang === 'en';
      const saved = localStorage.getItem('ccs_vendor_worker_name') || '';
      let optionsHtml = cleanersList.map(c => `
        <option value="${escapeHtml(c.name)}" ${c.name === saved ? 'selected' : ''}>${escapeHtml(c.name)}</option>
      `).join('');

      Swal.fire({
        title: isEN ? 'Switch Cleaning Staff' : 'Ganti Nama Petugas',
        html: `
          <p class="text-xs text-gray-500 mb-3">${isEN ? 'Select the active cleaning staff name:' : 'Pilih nama petugas kebersihan yang bertugas saat ini:'}</p>
          <div class="relative">
            <select id="swalWorkerSelect" class="w-full p-3 text-sm font-bold border-2 border-orange-300 rounded-xl outline-none focus:ring-2 focus:ring-orange-200 bg-white">
              <option value="">${isEN ? '-- Select your name --' : '-- Pilih nama Anda --'}</option>
              ${optionsHtml}
            </select>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: isEN ? 'Save & Switch' : 'Simpan & Ganti',
        cancelButtonText: isEN ? 'Cancel' : 'Batal',
        preConfirm: () => {
          const val = document.getElementById('swalWorkerSelect').value;
          if (!val) {
            Swal.showValidationMessage(isEN ? 'Please select a name' : 'Silakan pilih salah satu nama');
            return false;
          }
          return val;
        }
      }).then(result => {
        if (result.isConfirmed && result.value) {
          handleGlobalCleanerChange(result.value);
          // Jika tadi kamera terkunci, buka sekarang
          showScannerSection();
          Swal.fire({
            icon: 'success',
            title: isEN ? 'Staff Updated!' : 'Petugas Diperbarui!',
            text: isEN ? `Logged in as: ${result.value}` : `Petugas aktif: ${result.value}`,
            timer: 1500,
            showConfirmButton: false
          });
        }
      });
    }

    // ─── PENGATURAN PERAN (ROLE SELECTION) ─────────────────────────────────
    function showRoleSelectionSection() {
      stopScanner();
      document.getElementById('loadingCard').classList.add('hidden');
      document.getElementById('scannerSection').classList.add('hidden');
      document.getElementById('cleanerFormSection').classList.add('hidden');
      document.getElementById('reporterFormSection').classList.add('hidden');
      document.getElementById('activeRoleBar').classList.add('hidden');
      document.getElementById('roleSelectionSection').classList.remove('hidden');
      syncAllCleanerDropdowns();
    }

    function selectRole(role, saveStorage = true) {
      currentRole = role;
      if (saveStorage) {
        localStorage.setItem('ccs_portal_role', role);
      }

      updateActiveRoleBarHeader();
      syncAllCleanerDropdowns();

      document.getElementById('roleSelectionSection').classList.add('hidden');

      if (currentRoomToken) {
        if (role === 'cleaner') {
          loadRoomForCleaner(currentRoomToken);
        } else {
          loadRoomForReporter(currentRoomToken);
        }
      } else {
        showScannerSection();
      }
    }

    function resetRole() {
      stopScanner();
      currentRole = null;
      localStorage.removeItem('ccs_portal_role');
      showRoleSelectionSection();
    }

    // ─── QR SCANNER LOGIC ──────────────────────────────────────────────────
    function updateScannerText() {
      const dict = I18N[currentLang] || I18N.id;
      const sub = document.getElementById('scannerSubHeading');
      const iconBox = document.getElementById('scannerIconBox');
      if (!sub) return;

      if (currentRole === 'reporter') {
        sub.textContent = dict.scan_reporter_sub;
        if (iconBox) iconBox.className = 'w-12 h-12 rounded-full bg-teal-100 text-ccsTeal font-bold flex items-center justify-center text-xl mx-auto mb-2';
      } else {
        sub.textContent = dict.scan_cleaner_sub;
        if (iconBox) iconBox.className = 'w-12 h-12 rounded-full bg-orange-100 text-ccsOrange font-bold flex items-center justify-center text-xl mx-auto mb-2';
      }
    }

    function showScannerSection() {
      document.getElementById('loadingCard').classList.add('hidden');
      document.getElementById('cleanerFormSection').classList.add('hidden');
      document.getElementById('reporterFormSection').classList.add('hidden');
      document.getElementById('roleSelectionSection').classList.add('hidden');
      document.getElementById('scannerSection').classList.remove('hidden');

      const savedWorker = localStorage.getItem('ccs_vendor_worker_name');
      const lockBox = document.getElementById('cleanerLockBox');
      const activeBox = document.getElementById('scannerActiveBox');

      // SYARAT MUTLAK: Jika peran Cleaner tapi nama belum pernah dipilih, KAMERA HARUS DILARANG NYALA!
      if (currentRole === 'cleaner' && !savedWorker) {
        stopScanner();
        if (lockBox) lockBox.classList.remove('hidden');
        if (activeBox) activeBox.classList.add('hidden');
        updateActiveRoleBarHeader();
        return;
      }

      // Jika Cleaner sudah punya nama ATAU sebagai Reporter -> Buka kamera
      if (lockBox) lockBox.classList.add('hidden');
      if (activeBox) activeBox.classList.remove('hidden');
      updateScannerText();
      updateActiveRoleBarHeader();

      startCameraScanner();
    }

    function startCameraScanner() {
      stopScanner();
      try {
        qrScanner = new Html5Qrcode("qrReader");
        qrScanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            handleDecodedQr(decodedText);
          },
          (errorMessage) => {}
        ).catch(err => {
          console.warn("Camera QR scan error:", err);
        });
      } catch (e) {
        console.error("Failed to init qr scanner", e);
      }
    }

    function stopScanner() {
      if (qrScanner) {
        qrScanner.stop().catch(() => {});
        qrScanner = null;
      }
    }

    function handleDecodedQr(text) {
      stopScanner();
      let token = text.trim();
      if (token.includes('room=')) {
        const match = token.match(/room=([a-zA-Z0-9_-]+)/);
        if (match) token = match[1];
      } else if (token.startsWith('http')) {
        const url = new URL(token);
        token = url.searchParams.get('room') || token;
      }
      window.location.href = `?room=${encodeURIComponent(token)}`;
    }

    function handleManualToken() {
      const input = document.getElementById('manualRoomToken').value.trim();
      if (!input) {
        Swal.fire({ 
          icon: 'warning', 
          title: currentLang === 'en' ? 'Attention' : 'Perhatian', 
          text: currentLang === 'en' ? 'Please enter a room token first' : 'Ketikkan token ruangan terlebih dahulu' 
        });
        return;
      }
      window.location.href = `?room=${encodeURIComponent(input)}`;
    }

    // ─── CLEANER FLOW (FETCH ROOM & RENDER CHECKLIST) ──────────────────────
    async function loadRoomForCleaner(token) {
      stopScanner();
      document.getElementById('loadingCard').classList.remove('hidden');
      document.getElementById('scannerSection').classList.add('hidden');
      document.getElementById('reporterFormSection').classList.add('hidden');
      document.getElementById('cleanerFormSection').classList.add('hidden');

      try {
        const res = await fetch(`index.php?action=fetch_room&room_token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (!data.success) {
          document.getElementById('loadingCard').classList.add('hidden');
          Swal.fire({
            icon: 'error',
            title: currentLang === 'en' ? 'Room Not Found' : 'Ruangan Tidak Ditemukan',
            text: data.message || (currentLang === 'en' ? 'QR Code token is invalid' : 'QR Code ruangan tidak terdaftar di sistem.'),
            confirmButtonText: currentLang === 'en' ? 'Scan Another Room' : 'Scan Ulang Ruangan'
          }).then(() => {
            window.location.href = 'index.php';
          });
          return;
        }

        currentRoomData = data.room;
        currentChecklist = data.checklist;

        document.getElementById('cleanerRoomName').textContent = data.room.name;
        document.getElementById('cleanerRoomToken').textContent = `Token: ${data.room.token}`;

        document.getElementById('loadingCard').classList.add('hidden');
        document.getElementById('cleanerFormSection').classList.remove('hidden');

        populateCleanerSelect();
        renderCleanerStage(data.checklist);

      } catch (err) {
        document.getElementById('loadingCard').classList.add('hidden');
        Swal.fire({
          icon: 'error',
          title: currentLang === 'en' ? 'Connection Error' : 'Gangguan Koneksi',
          text: currentLang === 'en' ? 'Failed to connect to school server' : 'Gagal menghubungi server utama sekolah.'
        });
      }
    }

    function renderCleanerStage(checklist) {
      const container = document.getElementById('stageContainer');
      const statusBadge = document.getElementById('cleanerStatusBadge');
      const isEN = currentLang === 'en';

      if (!checklist || checklist.status === 'in_progress' && !checklist.image_before_file) {
        statusBadge.className = 'shrink-0 text-xs font-bold px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200';
        statusBadge.innerHTML = `<i class="fas fa-clock mr-1"></i> ${isEN ? 'Not Started' : 'Belum Dikerjakan'}`;

        container.innerHTML = `
          <div class="space-y-3">
            <div class="flex items-center justify-between border-b border-gray-100 pb-2">
              <span class="text-xs font-bold uppercase tracking-wider text-ccsHeading">
                <i class="fas fa-camera mr-1 text-ccsOrange"></i> ${isEN ? 'Step 1: Photo Before Cleaning' : 'Tahap 1: Foto Sebelum Dibersihkan (Before)'}
              </span>
              <span class="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                ${isEN ? 'Starting Cleaning' : 'Mulai Bersihkan'}
              </span>
            </div>

            <p class="text-xs text-gray-500">
              ${isEN 
                ? 'Take a photo of the room condition before cleaning. The system will record the start time automatically.' 
                : 'Ambil foto kondisi ruangan saat ini sebelum dibersihkan. Sistem akan mencatat waktu mulai secara otomatis.'}
            </p>

            <input type="file" id="cameraInput" accept="image/*" capture="environment" class="hidden" onchange="handleCleanerFileSelect(event)">

            <div id="uploadPlaceholder" onclick="triggerCleanerCamera()" class="border-2 border-dashed border-gray-200 hover:border-ccsOrange rounded-2xl p-6 text-center cursor-pointer transition-colors bg-orange-50/20">
              <div class="w-12 h-12 rounded-full bg-orange-100 text-ccsOrange flex items-center justify-center text-xl mx-auto mb-2">
                <i class="fas fa-camera"></i>
              </div>
              <p class="text-xs font-bold text-ccsHeading">${isEN ? 'Take Before Photo with Camera' : 'Ambil Foto Before dengan Kamera'}</p>
              <p class="text-[11px] text-gray-400 mt-0.5">${isEN ? 'Photo is automatically compressed to save data' : 'Foto otomatis dikompresi agar hemat kuota'}</p>
            </div>

            <div id="previewBox" class="hidden space-y-2">
              <div class="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-900 flex items-center justify-center max-h-[260px]">
                <img id="imgPreview" src="" alt="Preview" class="w-full h-auto max-h-[260px] object-contain">
              </div>
              <button type="button" onclick="triggerCleanerCamera()" class="w-full py-2 px-3 text-xs font-semibold text-ccsNavy hover:bg-gray-100 rounded-xl border border-gray-200 transition flex items-center justify-center gap-1.5">
                <i class="fas fa-sync-alt"></i> ${isEN ? 'Retake Photo' : 'Ganti / Foto Ulang'}
              </button>
            </div>

            <button id="btnSubmitStage" onclick="submitCleanerStage('start_progress')" class="thm-btn w-full py-3 text-sm font-semibold rounded-xl flex items-center justify-center gap-2">
              <i class="fas fa-play"></i> ${isEN ? 'Start Cleaning & Send Before Photo' : 'Mulai Bersihkan & Kirim Foto Before'}
            </button>
          </div>
        `;
        return;
      }

      if (checklist.status === 'in_progress') {
        statusBadge.className = 'shrink-0 text-xs font-bold px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200';
        statusBadge.innerHTML = `<i class="fas fa-spinner fa-spin mr-1"></i> ${isEN ? 'In Progress' : 'Sedang Dikerjakan'}`;

        container.innerHTML = `
          <div class="space-y-4">
            <div class="flex items-center justify-between border-b border-gray-100 pb-2">
              <span class="text-xs font-bold uppercase tracking-wider text-ccsHeading">
                <i class="fas fa-check-double mr-1 text-emerald-600"></i> ${isEN ? 'Step 2: Finish & Photo After' : 'Tahap 2: Selesai & Foto Hasil (After)'}
              </span>
              <span class="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                ${isEN ? 'Cleaning in Progress' : 'Sedang Dikerjakan'}
              </span>
            </div>

            <!-- Kartu Info Foto Before -->
            <div class="bg-gray-50 rounded-xl p-3 border border-gray-200 flex items-center justify-between text-xs">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <i class="fas fa-check"></i>
                </div>
                <div>
                  <div class="font-bold text-gray-800">${isEN ? 'Before Photo Recorded' : 'Foto Before Telah Tersimpan'}</div>
                  <div class="text-[11px] text-gray-500">${checklist.vendor_worker_name || '-'}</div>
                </div>
              </div>
              <button type="button" onclick="viewRemotePhoto(${checklist.id}, 'before', '${isEN ? 'Before Photo' : 'Foto Before Ruangan'}')" class="text-xs text-ccsOrange font-semibold hover:underline">
                <i class="fas fa-eye mr-1"></i> ${isEN ? 'View' : 'Lihat'}
              </button>
            </div>

            <p class="text-xs text-gray-500">
              ${isEN 
                ? 'After finishing cleaning, take a photo of the clean room to complete the task.' 
                : 'Setelah selesai membersihkan, ambil foto hasil ruangan yang sudah bersih untuk menyelesaikan tugas.'}
            </p>

            <input type="file" id="cameraInput" accept="image/*" capture="environment" class="hidden" onchange="handleCleanerFileSelect(event)">

            <div id="uploadPlaceholder" onclick="triggerCleanerCamera()" class="border-2 border-dashed border-gray-200 hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-emerald-50/20">
              <div class="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl mx-auto mb-2">
                <i class="fas fa-camera"></i>
              </div>
              <p class="text-xs font-bold text-ccsHeading">${isEN ? 'Take After Photo with Camera' : 'Ambil Foto After dengan Kamera'}</p>
              <p class="text-[11px] text-gray-400 mt-0.5">${isEN ? 'Photo is automatically compressed' : 'Foto otomatis dikompresi agar hemat kuota'}</p>
            </div>

            <div id="previewBox" class="hidden space-y-2">
              <div class="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-900 flex items-center justify-center max-h-[260px]">
                <img id="imgPreview" src="" alt="Preview" class="w-full h-auto max-h-[260px] object-contain">
              </div>
              <button type="button" onclick="triggerCleanerCamera()" class="w-full py-2 px-3 text-xs font-semibold text-ccsNavy hover:bg-gray-100 rounded-xl border border-gray-200 transition flex items-center justify-center gap-1.5">
                <i class="fas fa-sync-alt"></i> ${isEN ? 'Retake Photo' : 'Ganti / Foto Ulang'}
              </button>
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1">${isEN ? 'Notes (Optional)' : 'Catatan Petugas (Opsional)'}</label>
              <textarea id="stageNotes" rows="2" placeholder="${isEN ? 'e.g., mopped floor, trash emptied, etc.' : 'Misal: Lantai sudah dipel, tong sampah dikosongkan...'}" class="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-ccsNavy outline-none"></textarea>
            </div>

            <button id="btnSubmitStage" onclick="submitCleanerStage('submit_finish')" class="thm-btn w-full py-3 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 bg-emerald-600 border-emerald-600 hover:bg-emerald-700">
              <i class="fas fa-check-circle"></i> ${isEN ? 'Finish & Submit for Review' : 'Selesai & Kirim untuk Ditinjau'}
            </button>
          </div>
        `;
        return;
      }

      if (checklist.status === 'revision') {
        statusBadge.className = 'shrink-0 text-xs font-bold px-3 py-1.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200';
        statusBadge.innerHTML = `<i class="fas fa-exclamation-triangle mr-1"></i> ${isEN ? 'Revision Required' : 'Perlu Revisi'}`;

        container.innerHTML = `
          <div class="space-y-4">
            <div class="bg-rose-50 rounded-2xl p-4 border border-rose-200 text-rose-800 space-y-1.5">
              <div class="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-rose-700">
                <i class="fas fa-exclamation-circle text-sm"></i> ${isEN ? 'Supervisor Revision Instructions' : 'Instruksi Revisi Supervisor'}
              </div>
              <p class="text-xs font-medium pl-5">${checklist.review_notes || (isEN ? 'Please clean the room again properly.' : 'Harap bersihkan kembali ruangan dengan baik.')}</p>
            </div>

            <p class="text-xs text-gray-500">
              ${isEN 
                ? 'Please re-clean the areas requested by the supervisor, then upload proof of revision photo.' 
                : 'Silakan bersihkan ulang area yang diminta supervisor, lalu unggah foto bukti perbaikan revisi.'}
            </p>

            <input type="file" id="cameraInput" accept="image/*" capture="environment" class="hidden" onchange="handleCleanerFileSelect(event)">

            <div id="uploadPlaceholder" onclick="triggerCleanerCamera()" class="border-2 border-dashed border-rose-200 hover:border-rose-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-rose-50/20">
              <div class="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-xl mx-auto mb-2">
                <i class="fas fa-camera"></i>
              </div>
              <p class="text-xs font-bold text-ccsHeading">${isEN ? 'Take Revision Photo with Camera' : 'Ambil Foto Revisi dengan Kamera'}</p>
              <p class="text-[11px] text-gray-400 mt-0.5">${isEN ? 'Photo is automatically compressed' : 'Foto otomatis dikompresi'}</p>
            </div>

            <div id="previewBox" class="hidden space-y-2">
              <div class="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-900 flex items-center justify-center max-h-[260px]">
                <img id="imgPreview" src="" alt="Preview" class="w-full h-auto max-h-[260px] object-contain">
              </div>
              <button type="button" onclick="triggerCleanerCamera()" class="w-full py-2 px-3 text-xs font-semibold text-ccsNavy hover:bg-gray-100 rounded-xl border border-gray-200 transition flex items-center justify-center gap-1.5">
                <i class="fas fa-sync-alt"></i> ${isEN ? 'Retake Photo' : 'Ganti / Foto Ulang'}
              </button>
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1">${isEN ? 'Revision Notes' : 'Catatan Perbaikan'}</label>
              <textarea id="stageNotes" rows="2" placeholder="${isEN ? 'e.g., floor mopped again, trash emptied' : 'Misal: Area lantai sudah dipel ulang...'}" class="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-ccsNavy outline-none"></textarea>
            </div>

            <button id="btnSubmitStage" onclick="submitCleanerStage('submit_revision')" class="thm-btn w-full py-3 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 bg-rose-600 border-rose-600 hover:bg-rose-700">
              <i class="fas fa-paper-plane"></i> ${isEN ? 'Send Revision Photo' : 'Kirim Foto Bukti Revisi'}
            </button>
          </div>
        `;
        return;
      }

      if (checklist.status === 'pending_review') {
        statusBadge.className = 'shrink-0 text-xs font-bold px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200';
        statusBadge.innerHTML = `<i class="fas fa-hourglass-half mr-1"></i> ${isEN ? 'Pending Review' : 'Menunggu Review'}`;

        container.innerHTML = `
          <div class="text-center py-6 space-y-3">
            <div class="w-14 h-14 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center mx-auto text-2xl">
              <i class="fas fa-clipboard-check"></i>
            </div>
            <div>
              <h3 class="text-base font-bold text-ccsHeading">${isEN ? 'Checklist Awaiting Supervisor Review' : 'Pekerjaan Selesai & Menunggu Review'}</h3>
              <p class="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                ${isEN 
                  ? 'All photos have been submitted. The supervisor will inspect the cleaning quality soon.' 
                  : 'Foto sebelum dan sesudah telah dikirim. Supervisor akan memeriksa kualitas kebersihan ruangan ini.'}
              </p>
            </div>
            <div class="flex items-center justify-center gap-2 pt-2">
              <button type="button" onclick="viewRemotePhoto(${checklist.id}, 'before', '${isEN ? 'Before Photo' : 'Foto Sebelum'}')" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition">
                <i class="fas fa-eye mr-1"></i> ${isEN ? 'Before Photo' : 'Foto Sebelum'}
              </button>
              <button type="button" onclick="viewRemotePhoto(${checklist.id}, 'after', '${isEN ? 'After Photo' : 'Foto Sesudah'}')" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition">
                <i class="fas fa-eye mr-1"></i> ${isEN ? 'After Photo' : 'Foto Sesudah'}
              </button>
            </div>
          </div>
        `;
        return;
      }

      if (checklist.status === 'approved') {
        statusBadge.className = 'shrink-0 text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200';
        statusBadge.innerHTML = `<i class="fas fa-check-circle mr-1"></i> ${isEN ? 'Approved' : 'Disetujui'}`;

        container.innerHTML = `
          <div class="text-center py-6 space-y-3">
            <div class="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl">
              <i class="fas fa-shield-alt"></i>
            </div>
            <div>
              <h3 class="text-base font-bold text-ccsHeading">${isEN ? 'Room Clean & Approved!' : 'Ruangan Bersih & Disetujui!'}</h3>
              <p class="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                ${isEN 
                  ? 'Cleaning has been verified and approved by the supervisor.' 
                  : 'Hasil pekerjaan kebersihan ruangan ini telah diperiksa dan disetujui oleh supervisor.'}
              </p>
            </div>
            <div class="flex items-center justify-center gap-2 pt-2">
              <button type="button" onclick="viewRemotePhoto(${checklist.id}, 'before', '${isEN ? 'Before Photo' : 'Foto Sebelum'}')" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition">
                <i class="fas fa-eye mr-1"></i> ${isEN ? 'Before' : 'Sebelum'}
              </button>
              <button type="button" onclick="viewRemotePhoto(${checklist.id}, 'after', '${isEN ? 'After Photo' : 'Foto Sesudah'}')" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition">
                <i class="fas fa-eye mr-1"></i> ${isEN ? 'After' : 'Sesudah'}
              </button>
            </div>
          </div>
        `;
        return;
      }

      if (checklist.status === 'rejected') {
        statusBadge.className = 'shrink-0 text-xs font-bold px-3 py-1.5 rounded-full bg-gray-200 text-gray-700 border border-gray-300';
        statusBadge.innerHTML = `<i class="fas fa-times-circle mr-1"></i> ${isEN ? 'Rejected' : 'Ditolak'}`;

        container.innerHTML = `
          <div class="text-center py-4 space-y-3">
            <div class="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto text-2xl">
              <i class="fas fa-times"></i>
            </div>
            <div>
              <h3 class="text-base font-bold text-ccsHeading">${isEN ? 'Checklist Rejected' : 'Checklist Ditolak'}</h3>
              <p class="text-xs text-rose-700 mt-1 bg-rose-50 p-3 rounded-xl border border-rose-200">
                "${checklist.review_notes || (isEN ? 'Cleaning did not meet standard.' : 'Pekerjaan kebersihan tidak memenuhi standar.')}"
              </p>
            </div>
          </div>
        `;
        return;
      }
    }

    function triggerCleanerCamera() {
      const input = document.getElementById('cameraInput');
      if (input) input.click();
    }

    function handleCleanerFileSelect(e) {
      const file = e.target.files[0];
      if (!file) return;

      compressImage(file, 1280, 0.8, (compressedBlob, dataUrl) => {
        selectedCleanerBlob = compressedBlob;
        document.getElementById('uploadPlaceholder').classList.add('hidden');
        document.getElementById('previewBox').classList.remove('hidden');
        document.getElementById('imgPreview').src = dataUrl;
      });
    }

    async function submitCleanerStage(actionType) {
      const isEN = currentLang === 'en';
      const workerSelect = document.getElementById('workerNameSelect');
      const workerName = workerSelect ? workerSelect.value.trim() : '';

      if (actionType === 'start_progress' && !workerName) {
        Swal.fire({
          icon: 'warning',
          title: isEN ? 'Staff Not Selected' : 'Nama Petugas Belum Dipilih',
          text: isEN ? 'Please select your name from the dropdown list before starting.' : 'Silakan pilih nama petugas kebersihan dari dropdown terlebih dahulu.'
        });
        workerSelect.focus();
        return;
      }

      if (!selectedCleanerBlob) {
        Swal.fire({
          icon: 'warning',
          title: isEN ? 'Photo Required' : 'Foto Belum Diambil',
          text: isEN ? 'Please take photo evidence using the camera first.' : 'Silakan ambil foto bukti pekerjaan terlebih dahulu menggunakan kamera.'
        });
        return;
      }

      const notesEl = document.getElementById('stageNotes');
      const notes = notesEl ? notesEl.value.trim() : '';

      const btn = document.getElementById('btnSubmitStage');
      const origText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> ${isEN ? 'Uploading & Saving...' : 'Mengunggah & Menyimpan...'}`;

      try {
        const formData = new FormData();
        formData.append('action', 'submit_step');
        formData.append('stage_action', actionType);
        formData.append('room_token', currentRoomToken);
        formData.append('worker_name', workerName);
        formData.append('notes', notes);
        formData.append('photo_file', selectedCleanerBlob, 'upload.jpg');

        const res = await fetch('index.php', {
          method: 'POST',
          body: formData
        });

        const result = await res.json();
        if (!result.success) {
          throw new Error(result.message || (isEN ? 'Failed to save data' : 'Gagal menyimpan data'));
        }

        Swal.fire({
          icon: 'success',
          title: isEN ? 'Success!' : 'Berhasil!',
          text: result.message,
          timer: 2000,
          showConfirmButton: false
        }).then(() => {
          loadRoomForCleaner(currentRoomToken);
        });

      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: isEN ? 'Save Failed' : 'Gagal Menyimpan',
          text: err.message || (isEN ? 'System error occurred' : 'Terjadi kesalahan sistem')
        });
        btn.disabled = false;
        btn.innerHTML = origText;
      }
    }

    // ─── PELAPOR / REPORTER FLOW ───────────────────────────────────────────
    async function loadRoomForReporter(token) {
      stopScanner();
      document.getElementById('loadingCard').classList.remove('hidden');
      document.getElementById('scannerSection').classList.add('hidden');
      document.getElementById('cleanerFormSection').classList.add('hidden');
      document.getElementById('reporterFormSection').classList.add('hidden');

      try {
        const res = await fetch(`index.php?action=fetch_room&room_token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (!data.success) {
          document.getElementById('loadingCard').classList.add('hidden');
          Swal.fire({
            icon: 'error',
            title: currentLang === 'en' ? 'Room Not Found' : 'Ruangan Tidak Ditemukan',
            text: data.message || (currentLang === 'en' ? 'Room QR code is invalid' : 'QR Code ruangan tidak terdaftar.'),
            confirmButtonText: currentLang === 'en' ? 'Scan Another Room' : 'Scan Ulang'
          }).then(() => {
            window.location.href = 'index.php';
          });
          return;
        }

        currentRoomData = data.room;
        document.getElementById('reporterRoomName').textContent = data.room.name;
        document.getElementById('reporterRoomToken').textContent = `Token: ${data.room.token}`;

        // Restore saved reporter info
        const savedRepName = localStorage.getItem('ccs_reporter_name');
        const savedRepContact = localStorage.getItem('ccs_reporter_contact');
        if (savedRepName) document.getElementById('reporterNameInput').value = savedRepName;
        if (savedRepContact) document.getElementById('reporterContactInput').value = savedRepContact;

        document.getElementById('loadingCard').classList.add('hidden');
        document.getElementById('reporterFormSection').classList.remove('hidden');

      } catch (err) {
        document.getElementById('loadingCard').classList.add('hidden');
        Swal.fire({
          icon: 'error',
          title: currentLang === 'en' ? 'Connection Error' : 'Gangguan Koneksi',
          text: currentLang === 'en' ? 'Failed to connect to school server' : 'Gagal menghubungi server utama sekolah.'
        });
      }
    }

    function triggerReporterCamera() {
      const input = document.getElementById('reporterCameraInput');
      if (input) input.click();
    }

    function handleReporterFileSelect(e) {
      const file = e.target.files[0];
      if (!file) return;

      compressImage(file, 1280, 0.8, (compressedBlob, dataUrl) => {
        selectedReporterBlob = compressedBlob;
        document.getElementById('reporterUploadPlaceholder').classList.add('hidden');
        document.getElementById('reporterPreviewBox').classList.remove('hidden');
        document.getElementById('reporterImgPreview').src = dataUrl;
      });
    }

    async function submitReporterReport() {
      const isEN = currentLang === 'en';
      const nameInput = document.getElementById('reporterNameInput');
      const contactInput = document.getElementById('reporterContactInput');
      const descInput = document.getElementById('reporterIssueDesc');

      const repName = nameInput ? nameInput.value.trim() : '';
      const repContact = contactInput ? contactInput.value.trim() : '';
      const repDesc = descInput ? descInput.value.trim() : '';

      if (!repName) {
        Swal.fire({
          icon: 'warning',
          title: isEN ? 'Name Required' : 'Nama Pelapor Wajib Diisi',
          text: isEN ? 'Please enter your full name before submitting the report.' : 'Silakan isi nama lengkap pelapor terlebih dahulu.'
        });
        nameInput.focus();
        return;
      }

      if (!selectedReporterBlob) {
        Swal.fire({
          icon: 'warning',
          title: isEN ? 'Photo Required' : 'Foto Wajib Diambil',
          text: isEN ? 'Please take a photo of the damaged or problematic facility condition.' : 'Silakan ambil foto bukti kerusakan atau kondisi fasilitas terlebih dahulu.'
        });
        return;
      }

      if (!repDesc) {
        Swal.fire({
          icon: 'warning',
          title: isEN ? 'Description Required' : 'Deskripsi Keluhan Wajib Diisi',
          text: isEN ? 'Please describe the facility issue or damage in this room.' : 'Silakan jelaskan kendala atau kerusakan fasilitas yang terjadi.'
        });
        descInput.focus();
        return;
      }

      // Save to localStorage for convenience
      localStorage.setItem('ccs_reporter_name', repName);
      if (repContact) localStorage.setItem('ccs_reporter_contact', repContact);

      const btn = document.getElementById('btnSubmitReport');
      const origText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> ${isEN ? 'Submitting Report...' : 'Mengunggah & Mengirim Laporan...'}`;

      try {
        const formData = new FormData();
        formData.append('action', 'submit_report');
        formData.append('room_token', currentRoomToken);
        formData.append('reporter_name', repName);
        formData.append('reporter_contact', repContact);
        formData.append('issue_description', repDesc);
        formData.append('photo_file', selectedReporterBlob, 'report.jpg');

        const res = await fetch('index.php', {
          method: 'POST',
          body: formData
        });

        const result = await res.json();
        if (!result.success) {
          throw new Error(result.message || (isEN ? 'Failed to submit report' : 'Gagal mengirim laporan'));
        }

        Swal.fire({
          icon: 'success',
          title: isEN ? 'Report Submitted Successfully!' : 'Laporan Berhasil Terkirim!',
          text: isEN 
            ? 'Thank you for your report. The school operations team will inspect and follow up shortly.' 
            : 'Terima kasih atas laporan Anda. Tim operasional sekolah akan segera memeriksa dan menindaklanjuti kendala di ruangan ini.',
          confirmButtonText: isEN ? 'Scan Another Room' : 'Scan Ruangan Lain'
        }).then(() => {
          window.location.href = 'index.php';
        });

      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: isEN ? 'Submission Failed' : 'Gagal Mengirim Laporan',
          text: err.message || (isEN ? 'System error occurred' : 'Terjadi kesalahan sistem')
        });
        btn.disabled = false;
        btn.innerHTML = origText;
      }
    }

    // ─── KOMPRESI GAMBAR CLIENT-SIDE (CANVAS HTML5) ────────────────────────
    function compressImage(file, maxDimension, quality, callback) {
      const reader = new FileReader();
      reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDimension) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            }
          } else {
            if (height > maxDimension) {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            callback(blob, dataUrl);
          }, 'image/jpeg', quality);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }

    // ─── REMOTE IMAGE PREVIEW MODAL ────────────────────────────────────────
    function viewRemotePhoto(checklistId, type, title) {
      const modal = document.getElementById('imagePreviewModal');
      const modalTitle = document.getElementById('previewModalTitle');
      const modalImg = document.getElementById('modalPreviewImg');

      modalTitle.textContent = title;
      modalImg.src = `https://www.manageccs.online/api/vendor-checklist/${checklistId}/photo?type=${type}&t=${Date.now()}`;
      modal.classList.remove('hidden');
    }

    function closeImagePreview() {
      document.getElementById('imagePreviewModal').classList.add('hidden');
    }
  </script>
</body>
</html>
