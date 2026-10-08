<?php
/**
 * ==============================================================================
 * SISTEM CHECKLIST KEBERSIHAN RUANGAN VENDOR — CHUNG CHUNG CHRISTIAN SCHOOL
 * Yayasan Pendidikan Mayapada School
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

// ─── 3. AJAX ENDPOINT: PROSES UPLOAD FOTO & SINKRONISASI KE NEXT.JS ───────
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
        echo json_encode(['success' => false, 'message' => 'Nama petugas wajib diisi']);
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

$roomParam = htmlspecialchars(trim($_GET['room'] ?? ''));
?>
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Checklist Kebersihan Ruangan — Chung Chung Christian School</title>
  
  <!-- Favicon Resmi CCS -->
  <link rel="icon" type="image/png" sizes="16x16" href="https://ccs.sch.id/assets/images/favicon.png">

  <!-- Google Font: Poppins (Font Resmi ccs.sch.id, sewa lapangan & registrasi) -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

  <!-- FontAwesome 5 Icons (Identik dengan ccs.sch.id, sewa lapangan & registrasi) -->
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

    /* Tombol Khas CCS (.thm-btn) Identik Sewa Lapangan & Registrasi */
    .thm-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border: 2px solid #f16101;
      outline: none;
      background-color: #f16101;
      font-size: 15px;
      font-weight: 600;
      color: #ffffff;
      padding: 12px 32px;
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
    .thm-btn--outline {
      background-color: transparent;
      border-color: #0b4877;
      color: #0b4877;
    }
    .thm-btn--outline:hover {
      background-color: #0b4877;
      color: #ffffff;
    }
    .thm-btn--teal {
      background-color: #2da397;
      border-color: #2da397;
    }
    .thm-btn--teal:hover {
      background-color: #022c46;
      border-color: #022c46;
    }

    /* Footer Sesuai Website CCS Asli */
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
  <!-- 1. TOP BAR (TANGGAL RESMI CCS)                                          -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <div class="bg-ccsNavy text-white py-2">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-end">
      <div class="flex items-center gap-2 text-[13px] font-medium text-gray-200">
        <i class="far fa-calendar-alt text-ccsOrangeLight"></i>
        <span><?= date('d M Y') ?></span>
      </div>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!-- 2. NAVBAR IDENTIK SEWA LAPANGAN & REGISTRASI DENGAN LOGO RESMI CCS     -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <header class="bg-white sticky top-0 z-50 shadow-sm">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 h-[76px] flex items-center justify-between">
      <a href="https://ccs.sch.id/" class="flex items-center">
        <img 
          src="https://ccs.sch.id/assets/images/logo-cccs.png" 
          alt="Chung Chung Christian School" 
          class="main-logo"
          onerror="this.src='https://ccs.sch.id/assets/images/logo.png';"
        />
      </a>
      <nav class="flex items-center gap-6 text-[15px] font-medium">
        <a href="https://ccs.sch.id/" class="text-gray-800 hover:text-ccsOrange transition-colors">
          Home
        </a>
        <a href="index.php" class="text-ccsOrange font-semibold border-b-2 border-ccsOrange pb-1 transition-colors">
          Checklist Ruangan
        </a>
      </nav>
    </div>

    <!-- PITA 3 WARNA IKONIK CCS (Teal, Orange, Purple) TEPAT DI BAWAH NAVBAR -->
    <div class="w-full flex h-[6px]">
      <div class="flex-1 bg-ccsTeal"></div>
      <div class="flex-1 bg-ccsOrange"></div>
      <div class="flex-1 bg-ccsPurple"></div>
    </div>
  </header>

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!-- 3. KONTEN UTAMA: CHECKLIST RUANGAN VENDOR                              -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <main class="max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 w-full space-y-6">

    <!-- Loading State Card -->
    <div id="loadingCard" class="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center">
      <div class="w-12 h-12 border-4 border-ccsOrange border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p class="text-sm font-semibold text-ccsHeading">Memeriksa Data Ruangan...</p>
      <p class="text-xs text-gray-400 mt-1">Menghubungkan ke sistem kebersihan Chung Chung Christian School</p>
    </div>

    <!-- Scanner Section (Jika tidak ada parameter ?room=) -->
    <div id="scannerSection" class="hidden">
      <div class="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5">
        <div class="text-center">
          <div class="w-12 h-12 rounded-full bg-orange-100 text-ccsOrange font-bold flex items-center justify-center text-xl mx-auto mb-3">
            <i class="fas fa-qrcode"></i>
          </div>
          <h2 class="text-lg font-bold text-ccsHeading">Scan QR Code Ruangan</h2>
          <p class="text-xs text-gray-500 mt-1">Arahkan kamera ke stiker barcode di pintu ruangan sekolah</p>
        </div>

        <div id="qrReader" class="overflow-hidden rounded-xl border border-gray-200 bg-gray-900 min-h-[240px]"></div>

        <div class="pt-4 border-t border-gray-100 text-center">
          <p class="text-xs text-gray-400 mb-2 font-medium">Atau masukkan kode token ruangan:</p>
          <div class="flex gap-2">
            <input 
              type="text" 
              id="manualRoomToken" 
              placeholder="Contoh: rm_a1b2c3d4" 
              class="flex-1 px-4 py-2.5 text-xs border border-gray-200 rounded-xl focus:border-ccsNavy focus:ring-2 focus:ring-ccsNavy/10 font-mono uppercase outline-none"
            >
            <button onclick="handleManualToken()" class="thm-btn py-2 px-5 text-xs">
              Buka
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Room Information & Form Section -->
    <div id="formSection" class="hidden space-y-5">

      <!-- Room Header Box (Identik Box Form Sewa Lapangan) -->
      <div class="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm relative overflow-hidden">
        <div class="flex items-start justify-between gap-3">
          <div>
            <span class="text-[11px] font-bold tracking-wider uppercase text-ccsTeal bg-teal-50 px-2.5 py-1 rounded-md inline-block">
              <i class="fas fa-door-open mr-1"></i> Lokasi Ruangan
            </span>
            <h2 id="roomNameDisplay" class="text-lg sm:text-xl font-bold text-ccsHeading mt-2">
              Nama Ruangan
            </h2>
            <p id="roomTokenDisplay" class="text-xs font-mono text-gray-400 mt-0.5">
              Token: -
            </p>
          </div>
          <div id="statusBadge" class="shrink-0 text-xs font-bold px-3 py-1.5 rounded-full">
            <!-- Dynamic Status Badge -->
          </div>
        </div>
      </div>

      <!-- Identitas Petugas Vendor (Box Step 1 Identik Registrasi) -->
      <div class="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-orange-100 text-ccsOrange font-bold text-xs flex items-center justify-center shrink-0">
              <i class="fas fa-user"></i>
            </div>
            <h3 class="text-sm font-bold text-ccsHeading">Identitas Petugas Vendor</h3>
          </div>
          <span class="text-[11px] text-emerald-600 font-semibold flex items-center bg-emerald-50 px-2 py-0.5 rounded-md">
            <i class="fas fa-check-circle mr-1"></i> Tersimpan Otomatis
          </span>
        </div>

        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
            Nama Lengkap Petugas
          </label>
          <input 
            type="text" 
            id="workerNameInput" 
            placeholder="Masukkan nama petugas..."
            class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-ccsNavy focus:ring-2 focus:ring-ccsNavy/10 text-sm outline-none transition"
          >
          <p class="text-[11px] text-gray-400 mt-1.5">
            Nama Anda otomatis tersimpan di HP ini, tidak perlu diketik ulang untuk ruangan lainnya.
          </p>
        </div>
      </div>

      <!-- DYNAMIC STAGE CONTAINER (Identik Card Form CCS) -->
      <div id="stageContainer" class="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm space-y-4">
        <!-- Injected via JavaScript based on checklist state -->
      </div>

    </div>

  </main>

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!-- 4. COPYRIGHT FOOTER (1:1 SESUAI ccs.sch.id & SEWA LAPANGAN)             -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <footer class="site-footer bg-[#012237] py-6 text-center">
    <div class="max-w-4xl mx-auto px-4 flex items-center justify-center relative">
      <p class="site-footer__copy text-[#94a3ac] text-[15px] font-medium m-0 tracking-normal">
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

  <script>
    let currentRoomToken = '<?= $roomParam ?>';
    let currentRoomData = null;
    let currentChecklist = null;
    let selectedFileBlob = null;
    let qrScanner = null;

    document.addEventListener('DOMContentLoaded', () => {
      initWorkerName();
      if (currentRoomToken) {
        loadRoomChecklist(currentRoomToken);
      } else {
        showScannerSection();
      }
    });

    function initWorkerName() {
      const savedName = localStorage.getItem('ccs_vendor_worker_name');
      const nameInput = document.getElementById('workerNameInput');
      if (savedName) {
        nameInput.value = savedName;
      }
      nameInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (val) {
          localStorage.setItem('ccs_vendor_worker_name', val);
        }
      });
    }

    function showScannerSection() {
      document.getElementById('loadingCard').classList.add('hidden');
      document.getElementById('formSection').classList.add('hidden');
      document.getElementById('scannerSection').classList.remove('hidden');

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

    function handleDecodedQr(text) {
      if (qrScanner) {
        qrScanner.stop().catch(() => {});
      }
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
        Swal.fire({ icon: 'warning', title: 'Perhatian', text: 'Ketikkan token ruangan terlebih dahulu' });
        return;
      }
      window.location.href = `?room=${encodeURIComponent(input)}`;
    }

    async function loadRoomChecklist(token) {
      document.getElementById('loadingCard').classList.remove('hidden');
      document.getElementById('scannerSection').classList.add('hidden');
      document.getElementById('formSection').classList.add('hidden');

      try {
        const res = await fetch(`index.php?action=fetch_room&room_token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (!data.success) {
          document.getElementById('loadingCard').classList.add('hidden');
          Swal.fire({
            icon: 'error',
            title: 'Ruangan Tidak Ditemukan',
            text: data.message || 'QR code ruangan tidak valid atau tidak terdaftar.',
            confirmButtonText: 'Scan Ulang'
          }).then(() => {
            window.location.href = window.location.pathname;
          });
          return;
        }

        currentRoomData = data.room;
        currentChecklist = data.checklist;
        renderRoomInterface();
      } catch (err) {
        document.getElementById('loadingCard').classList.add('hidden');
        Swal.fire({
          icon: 'error',
          title: 'Gangguan Koneksi',
          text: 'Tidak dapat memuat status ruangan. Periksa koneksi internet Anda.'
        });
      }
    }

    function renderRoomInterface() {
      document.getElementById('loadingCard').classList.add('hidden');
      document.getElementById('formSection').classList.remove('hidden');

      document.getElementById('roomNameDisplay').textContent = currentRoomData.name;
      document.getElementById('roomTokenDisplay').textContent = `Token: ${currentRoomData.token}`;

      const statusBadge = document.getElementById('statusBadge');
      const stageContainer = document.getElementById('stageContainer');
      selectedFileBlob = null;
      const checklist = currentChecklist;

      // ─── STAGE 1: BELUM DIKERJAKAN ─────────────────────────────────────────
      if (!checklist) {
        statusBadge.className = 'shrink-0 text-xs font-bold px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200';
        statusBadge.innerHTML = '<i class="far fa-clock mr-1"></i> Belum Dikerjakan';

        stageContainer.innerHTML = `
          <div class="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div class="w-8 h-8 rounded-full bg-orange-100 text-ccsOrange font-bold text-xs flex items-center justify-center shrink-0">
              1
            </div>
            <div>
              <h3 class="text-sm font-bold text-ccsHeading">Tahap 1: Foto Sebelum Pembersihan (Before)</h3>
              <p class="text-xs text-gray-500">Ambil foto kondisi ruangan saat Anda pertama kali tiba</p>
            </div>
          </div>

          <!-- Camera Trigger Box -->
          <div id="dropZone" class="border-2 border-dashed border-gray-200 hover:border-ccsOrange rounded-2xl p-6 text-center cursor-pointer transition bg-gray-50/50" onclick="triggerCameraInput()">
            <input type="file" id="cameraInput" accept="image/*" capture="environment" class="hidden" onchange="handleFileSelect(event)">
            
            <div id="uploadPlaceholder">
              <div class="w-12 h-12 rounded-full bg-orange-100 text-ccsOrange flex items-center justify-center mx-auto mb-2 text-xl">
                <i class="fas fa-camera"></i>
              </div>
              <p class="text-xs font-bold text-ccsHeading">Ketuk untuk Ambil Foto Kamera</p>
              <p class="text-[11px] text-gray-400 mt-0.5">Kamera belakang HP otomatis diaktifkan</p>
            </div>

            <div id="previewBox" class="hidden">
              <img id="imgPreview" src="" alt="Preview" class="w-full h-44 object-cover rounded-xl mx-auto shadow-sm">
              <p class="text-xs text-emerald-600 font-bold mt-2 flex items-center justify-center">
                <i class="fas fa-check-circle mr-1"></i> Foto Siap Diunggah
              </p>
              <p class="text-[11px] text-gray-400">Ketuk kembali untuk foto ulang</p>
            </div>
          </div>

          <button id="btnSubmitStage" onclick="submitStage('start_progress')" class="thm-btn w-full py-3.5 text-sm mt-3">
            <i class="fas fa-play mr-1"></i> Mulai Bersihkan Ruangan
          </button>
        `;
        return;
      }

      // ─── STAGE 2: SEDANG DIKERJAKAN (IN PROGRESS) ──────────────────────────
      if (checklist.status === 'in_progress') {
        statusBadge.className = 'shrink-0 text-xs font-bold px-3 py-1.5 rounded-full bg-blue-50 text-ccsHeading border border-blue-200';
        statusBadge.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Sedang Dikerjakan';

        const startTimeStr = checklist.start_time ? new Date(checklist.start_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB' : '-';

        stageContainer.innerHTML = `
          <!-- Info Mulai -->
          <div class="border-l-4 border-ccsTeal bg-teal-50/60 p-3.5 rounded-r-xl text-xs space-y-1.5">
            <div class="flex items-center justify-between font-bold text-ccsHeading">
              <span><i class="fas fa-user mr-1.5 text-ccsTeal"></i> ${checklist.vendor_worker_name}</span>
              <span><i class="far fa-clock mr-1 text-ccsTeal"></i> Mulai: ${startTimeStr}</span>
            </div>
            <div class="pt-1.5 border-t border-teal-200/50 flex items-center justify-between text-[11px]">
              <span class="text-gray-500">Bukti Foto Sebelum:</span>
              <button onclick="viewRemotePhoto(${checklist.id}, 'before', 'Foto Sebelum (Before)')" class="text-ccsTeal font-bold hover:underline">
                <i class="fas fa-eye mr-1"></i> Lihat Foto Before
              </button>
            </div>
          </div>

          <div class="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div class="w-8 h-8 rounded-full bg-teal-100 text-ccsTeal font-bold text-xs flex items-center justify-center shrink-0">
              2
            </div>
            <div>
              <h3 class="text-sm font-bold text-ccsHeading">Tahap 2: Foto Sesudah Selesai (After)</h3>
              <p class="text-xs text-gray-500">Pekerjaan selesai? Ambil foto hasil ruangan yang bersih</p>
            </div>
          </div>

          <!-- Camera Trigger Box -->
          <div id="dropZone" class="border-2 border-dashed border-gray-200 hover:border-ccsTeal rounded-2xl p-6 text-center cursor-pointer transition bg-gray-50/50" onclick="triggerCameraInput()">
            <input type="file" id="cameraInput" accept="image/*" capture="environment" class="hidden" onchange="handleFileSelect(event)">
            
            <div id="uploadPlaceholder">
              <div class="w-12 h-12 rounded-full bg-teal-100 text-ccsTeal flex items-center justify-center mx-auto mb-2 text-xl">
                <i class="fas fa-camera"></i>
              </div>
              <p class="text-xs font-bold text-ccsHeading">Ketuk untuk Ambil Foto Selesai</p>
              <p class="text-[11px] text-gray-400 mt-0.5">Kamera belakang HP otomatis diaktifkan</p>
            </div>

            <div id="previewBox" class="hidden">
              <img id="imgPreview" src="" alt="Preview" class="w-full h-44 object-cover rounded-xl mx-auto shadow-sm">
              <p class="text-xs text-emerald-600 font-bold mt-2 flex items-center justify-center">
                <i class="fas fa-check-circle mr-1"></i> Foto Siap Diunggah
              </p>
              <p class="text-[11px] text-gray-400">Ketuk kembali untuk foto ulang</p>
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
              Catatan Pengerjaan (Opsional)
            </label>
            <textarea 
              id="stageNotes" 
              rows="2" 
              placeholder="Contoh: Lampu dan AC dimatikan, sampah sudah dibuang..."
              class="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-ccsNavy focus:ring-2 focus:ring-ccsNavy/10 outline-none"
            ></textarea>
          </div>

          <button id="btnSubmitStage" onclick="submitStage('submit_finish')" class="thm-btn thm-btn--teal w-full py-3.5 text-sm">
            <i class="fas fa-paper-plane mr-1"></i> Selesai & Kirim ke Supervisor
          </button>
        `;
        return;
      }

      // ─── STAGE 3: PENDING REVIEW ───────────────────────────────────────────
      if (checklist.status === 'pending_review') {
        statusBadge.className = 'shrink-0 text-xs font-bold px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300';
        statusBadge.innerHTML = '<i class="fas fa-hourglass-half mr-1"></i> Menunggu Review';

        stageContainer.innerHTML = `
          <div class="text-center py-4 space-y-3">
            <div class="w-14 h-14 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto text-2xl">
              <i class="fas fa-clock"></i>
            </div>
            <div>
              <h3 class="text-base font-bold text-ccsHeading">Menunggu Pemeriksaan Supervisor</h3>
              <p class="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Pekerjaan telah dikirimkan oleh <strong>${checklist.vendor_worker_name}</strong> dan sedang menunggu verifikasi dari supervisor operasional.
              </p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
            <button onclick="viewRemotePhoto(${checklist.id}, 'before', 'Foto Sebelum (Before)')" class="p-3 bg-gray-50 border border-gray-200 rounded-xl text-center hover:bg-gray-100 transition">
              <i class="fas fa-image text-gray-400 text-lg mb-1 block"></i>
              <span class="text-xs font-bold text-ccsHeading block">Foto Before</span>
              <span class="text-[10px] text-ccsOrange font-semibold">Lihat Gambar</span>
            </button>
            <button onclick="viewRemotePhoto(${checklist.id}, 'after', 'Foto Sesudah (After)')" class="p-3 bg-gray-50 border border-gray-200 rounded-xl text-center hover:bg-gray-100 transition">
              <i class="fas fa-check-circle text-emerald-500 text-lg mb-1 block"></i>
              <span class="text-xs font-bold text-ccsHeading block">Foto After</span>
              <span class="text-[10px] text-ccsOrange font-semibold">Lihat Gambar</span>
            </button>
          </div>

          <button onclick="loadRoomChecklist(currentRoomToken)" class="thm-btn thm-btn--outline w-full py-2.5 text-xs mt-3">
            <i class="fas fa-sync-alt mr-1"></i> Muat Ulang Status
          </button>
        `;
        return;
      }

      // ─── STAGE 4: PERLU REVISI ─────────────────────────────────────────────
      if (checklist.status === 'revision') {
        statusBadge.className = 'shrink-0 text-xs font-bold px-3 py-1.5 rounded-full bg-rose-50 text-rose-700 border border-rose-300';
        statusBadge.innerHTML = '<i class="fas fa-exclamation-triangle mr-1"></i> Perlu Revisi';

        stageContainer.innerHTML = `
          <!-- Catatan Supervisor (Identik Alert Box Sewa Lapangan) -->
          <div class="border-l-4 border-rose-500 bg-rose-50/70 p-4 rounded-r-xl space-y-1">
            <h4 class="text-xs font-bold text-rose-800 flex items-center">
              <i class="fas fa-comment-dots mr-1.5"></i> Catatan Revisi dari Supervisor:
            </h4>
            <p class="text-xs text-rose-900 font-medium bg-white p-2.5 rounded-lg border border-rose-200">
              "${checklist.review_notes || 'Mohon dibersihkan ulang bagian yang belum rapi.'}"
            </p>
          </div>

          <div class="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div class="w-8 h-8 rounded-full bg-rose-100 text-rose-600 font-bold text-xs flex items-center justify-center shrink-0">
              <i class="fas fa-redo-alt"></i>
            </div>
            <div>
              <h3 class="text-sm font-bold text-ccsHeading">Upload Foto Hasil Revisi</h3>
              <p class="text-xs text-gray-500">Bersihkan ulang sesuai catatan lalu foto hasilnya</p>
            </div>
          </div>

          <!-- Camera Trigger Box -->
          <div id="dropZone" class="border-2 border-dashed border-rose-200 hover:border-rose-400 rounded-2xl p-6 text-center cursor-pointer transition bg-rose-50/30" onclick="triggerCameraInput()">
            <input type="file" id="cameraInput" accept="image/*" capture="environment" class="hidden" onchange="handleFileSelect(event)">
            
            <div id="uploadPlaceholder">
              <div class="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-2 text-xl">
                <i class="fas fa-camera"></i>
              </div>
              <p class="text-xs font-bold text-ccsHeading">Ambil Foto Bukti Revisi</p>
              <p class="text-[11px] text-gray-400 mt-0.5">Kamera belakang HP otomatis diaktifkan</p>
            </div>

            <div id="previewBox" class="hidden">
              <img id="imgPreview" src="" alt="Preview" class="w-full h-44 object-cover rounded-xl mx-auto shadow-sm">
              <p class="text-xs text-emerald-600 font-bold mt-2 flex items-center justify-center">
                <i class="fas fa-check-circle mr-1"></i> Foto Siap Diunggah
              </p>
              <p class="text-[11px] text-gray-400">Ketuk kembali untuk foto ulang</p>
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
              Catatan Perbaikan Petugas
            </label>
            <textarea 
              id="stageNotes" 
              rows="2" 
              placeholder="Contoh: Kaca sudah dilap bersih, lantai sudah disapu ulang..."
              class="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-ccsNavy focus:ring-2 focus:ring-ccsNavy/10 outline-none"
            ></textarea>
          </div>

          <button id="btnSubmitStage" onclick="submitStage('submit_revision')" class="thm-btn w-full py-3.5 text-sm bg-rose-600 hover:bg-rose-700 border-rose-600">
            <i class="fas fa-redo-alt mr-1"></i> Kirim Ulang Bukti Revisi
          </button>
        `;
        return;
      }

      // ─── STAGE 5: APPROVED (DISETUJUI) ─────────────────────────────────────
      if (checklist.status === 'approved') {
        statusBadge.className = 'shrink-0 text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300';
        statusBadge.innerHTML = '<i class="fas fa-check-circle mr-1"></i> Disetujui';

        stageContainer.innerHTML = `
          <div class="text-center py-6 space-y-3">
            <div class="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl">
              <i class="fas fa-check"></i>
            </div>
            <div>
              <h3 class="text-lg font-bold text-ccsHeading">Ruangan Bersih & Disetujui!</h3>
              <p class="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Pekerjaan kebersihan untuk ruangan ini pada hari ini telah diperiksa dan disetujui oleh supervisor. Terima kasih atas kerja samanya!
              </p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
            <button onclick="viewRemotePhoto(${checklist.id}, 'before', 'Foto Sebelum (Before)')" class="p-3 bg-gray-50 border border-gray-200 rounded-xl text-center hover:bg-gray-100 transition">
              <i class="fas fa-image text-gray-400 text-lg mb-1 block"></i>
              <span class="text-xs font-bold text-ccsHeading block">Foto Before</span>
              <span class="text-[10px] text-ccsOrange font-semibold">Lihat Gambar</span>
            </button>
            <button onclick="viewRemotePhoto(${checklist.id}, 'after', 'Foto Sesudah (After)')" class="p-3 bg-gray-50 border border-gray-200 rounded-xl text-center hover:bg-gray-100 transition">
              <i class="fas fa-check-circle text-emerald-500 text-lg mb-1 block"></i>
              <span class="text-xs font-bold text-ccsHeading block">Foto After</span>
              <span class="text-[10px] text-ccsOrange font-semibold">Lihat Gambar</span>
            </button>
          </div>
        `;
        return;
      }

      // ─── STAGE 6: REJECTED ─────────────────────────────────────────────────
      if (checklist.status === 'rejected') {
        statusBadge.className = 'shrink-0 text-xs font-bold px-3 py-1.5 rounded-full bg-gray-200 text-gray-700 border border-gray-300';
        statusBadge.innerHTML = '<i class="fas fa-times-circle mr-1"></i> Ditolak';

        stageContainer.innerHTML = `
          <div class="text-center py-4 space-y-3">
            <div class="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto text-2xl">
              <i class="fas fa-times"></i>
            </div>
            <div>
              <h3 class="text-base font-bold text-ccsHeading">Checklist Ditolak</h3>
              <p class="text-xs text-rose-700 mt-1 bg-rose-50 p-3 rounded-xl border border-rose-200">
                "${checklist.review_notes || 'Pekerjaan kebersihan tidak memenuhi standar.'}"
              </p>
            </div>
          </div>
        `;
        return;
      }
    }

    function triggerCameraInput() {
      const input = document.getElementById('cameraInput');
      if (input) input.click();
    }

    function handleFileSelect(e) {
      const file = e.target.files[0];
      if (!file) return;

      compressImage(file, 1280, 0.8, (compressedBlob, dataUrl) => {
        selectedFileBlob = compressedBlob;
        document.getElementById('uploadPlaceholder').classList.add('hidden');
        document.getElementById('previewBox').classList.remove('hidden');
        document.getElementById('imgPreview').src = dataUrl;
      });
    }

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

    async function submitStage(actionType) {
      const workerNameInput = document.getElementById('workerNameInput');
      const workerName = workerNameInput ? workerNameInput.value.trim() : '';

      if (actionType === 'start_progress' && !workerName) {
        Swal.fire({
          icon: 'warning',
          title: 'Nama Petugas Kosong',
          text: 'Silakan isi nama petugas vendor sebelum memulai.'
        });
        workerNameInput.focus();
        return;
      }

      if (!selectedFileBlob) {
        Swal.fire({
          icon: 'warning',
          title: 'Foto Belum Diambil',
          text: 'Silakan ambil foto bukti pekerjaan terlebih dahulu menggunakan kamera.'
        });
        return;
      }

      const notesEl = document.getElementById('stageNotes');
      const notes = notesEl ? notesEl.value.trim() : '';

      const btn = document.getElementById('btnSubmitStage');
      const origText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Mengunggah & Menyimpan...';

      try {
        const formData = new FormData();
        formData.append('action', 'submit_step');
        formData.append('stage_action', actionType);
        formData.append('room_token', currentRoomToken);
        formData.append('worker_name', workerName);
        formData.append('notes', notes);
        formData.append('photo_file', selectedFileBlob, 'upload.jpg');

        const res = await fetch('index.php', {
          method: 'POST',
          body: formData
        });

        const result = await res.json();
        if (!result.success) {
          throw new Error(result.message || 'Gagal menyimpan data');
        }

        Swal.fire({
          icon: 'success',
          title: 'Berhasil!',
          text: result.message,
          timer: 2000,
          showConfirmButton: false
        }).then(() => {
          loadRoomChecklist(currentRoomToken);
        });

      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: 'Gagal Menyimpan',
          text: err.message || 'Terjadi kesalahan sistem'
        });
        btn.disabled = false;
        btn.innerHTML = origText;
      }
    }

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
