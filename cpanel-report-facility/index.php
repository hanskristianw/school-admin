<?php
/**
 * ============================================================================
 * CHUNG CHUNG CHRISTIAN SCHOOL - PORTAL PELAPORAN KELUHAN & FASILITAS (QR GENERAL)
 * File: index.php (Hostinger / cPanel: public_html/reportfacility/index.php)
 * URL Publik: https://ccs.sch.id/reportfacility
 * Aesthetic: Utilitarian Editorial Minimalism (Warm Monochrome + Spot Pastels)
 * ============================================================================
 * Portal mandiri khusus Pelapor saat memindai (scan) QR Code General:
 *   1. Upload Foto Kondisi (Wajib)
 *   2. Textarea Deskripsi Keluhan (Wajib)
 *   3. Textbox Nama Pelapor (Opsional — Bisa Anonim)
 * ============================================================================
 */

define('CCS_VENDOR_LOADED', true);

if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
}

if (!defined('API_SECRET_TOKEN')) {
    define('API_SECRET_TOKEN', 'ccs_court_auth_2026_x7k9p2m4');
}
if (!defined('NEXTJS_API_URL')) {
    define('NEXTJS_API_URL', 'https://www.manageccs.online/api/public/vendor-checklist');
}
if (!defined('UPLOAD_DIR')) {
    define('UPLOAD_DIR', __DIR__ . '/uploads/');
}
if (!defined('MAX_IMAGE_SIZE_BYTES')) {
    define('MAX_IMAGE_SIZE_BYTES', 15 * 1024 * 1024);
}

// Inisialisasi & proteksi folder uploads otomatis
if (!file_exists(UPLOAD_DIR)) {
    @mkdir(UPLOAD_DIR, 0755, true);
}
if (!file_exists(UPLOAD_DIR . '.htaccess')) {
    @file_put_contents(UPLOAD_DIR . '.htaccess', "Options -Indexes\nOrder Deny,Allow\nDeny from all\n<IfModule mod_authz_core.c>\nRequire all denied\n</IfModule>\n<FilesMatch \"\\.(php|phtml|php5|pl|py|cgi|sh)$\">\nRequire all denied\n</FilesMatch>\n");
}
if (!file_exists(UPLOAD_DIR . 'index.html')) {
    @file_put_contents(UPLOAD_DIR . 'index.html', '<!DOCTYPE html><html><head><title>403 Forbidden</title></head><body><h1>Directory access is forbidden.</h1></body></html>');
}

// ── 1. SECURE STREAMING FOTO UNTUK NEXT.JS ADMIN & PREVIEW ──────────────────
if (isset($_GET['action']) && ($_GET['action'] === 'view_photo' || $_GET['action'] === 'view_uploaded_photo')) {
    if ($_GET['action'] === 'view_photo') {
        $token = $_GET['token'] ?? '';
        $validTokens = [
            API_SECRET_TOKEN,
            'ccs_vendor_auth_2026_v9x2k7p4',
            'ccs_court_auth_2026_x7k9p2m4'
        ];
        if (!in_array($token, $validTokens, true)) {
            http_response_code(403);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Forbidden: Invalid security token']);
            exit;
        }
    }

    $file = basename($_GET['file'] ?? '');
    $filePath = UPLOAD_DIR . $file;
    $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));

    if (!$file || !file_exists($filePath) || !is_file($filePath) || !in_array($ext, ['jpg', 'jpeg', 'png', 'webp'])) {
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'File not found']);
        exit;
    }

    $mimeTypes = [
        'jpg'  => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png'  => 'image/png',
        'webp' => 'image/webp'
    ];
    header('Content-Type: ' . ($mimeTypes[$ext] ?? 'image/jpeg'));
    header('Content-Length: ' . filesize($filePath));
    header('Cache-Control: private, max-age=86400');
    header('Content-Disposition: inline; filename="' . $file . '"');
    readfile($filePath);
    exit;
}

// ── 2. POST HANDLER: KIRIM LAPORAN KELUHAN FASILITAS ────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json; charset=utf-8');

    $rawBody = file_get_contents('php://input');
    $input = json_decode($rawBody, true);
    if (!is_array($input)) {
        $input = $_POST;
    }

    $reporterName     = trim($input['reporter_name'] ?? '');
    $issueDescription = trim($input['issue_description'] ?? '');
    $imageBase64      = $input['image_base64'] ?? '';

    if ($issueDescription === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Deskripsi keluhan wajib diisi.']);
        exit;
    }

    if ($imageBase64 === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Foto kondisi wajib dilampirkan.']);
        exit;
    }

    // Simpan foto kondisi ke folder uploads/ di Hostinger
    if (preg_match('/^data:image\/(\w+);base64,/', $imageBase64, $type)) {
        $imageBase64 = substr($imageBase64, strpos($imageBase64, ',') + 1);
    }

    $decodedImage = base64_decode($imageBase64);
    if ($decodedImage === false) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Format foto kondisi tidak valid.']);
        exit;
    }

    if (strlen($decodedImage) > MAX_IMAGE_SIZE_BYTES) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Ukuran foto melebihi batas maksimal 15MB.']);
        exit;
    }

    $datePrefix = date('Ymd_His');
    $randHash = substr(md5(uniqid((string)mt_rand(), true)), 0, 6);
    $savedFilename = "report_general_{$datePrefix}_{$randHash}.jpg";
    $filePath = UPLOAD_DIR . $savedFilename;

    if (file_put_contents($filePath, $decodedImage) === false) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Gagal menyimpan file foto di server hosting.']);
        exit;
    }

    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'ccs.sch.id';
    $baseDir = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\');
    $hostingUrl = "{$protocol}://{$host}{$baseDir}/";

    $apiUrl = NEXTJS_API_URL;
    $payload = json_encode([
        'secret_token'      => API_SECRET_TOKEN,
        'action'            => 'submit_report',
        'reporter_name'     => $reporterName !== '' ? $reporterName : 'Anonim',
        'issue_description' => $issueDescription,
        'image_file'        => $savedFilename,
        'hosting_url'       => $hostingUrl
    ]);

    $ch = curl_init($apiUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_TIMEOUT        => 25,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . API_SECRET_TOKEN,
            'x-vendor-secret: ' . API_SECRET_TOKEN
        ]
    ]);
    $resBody = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr = curl_error($ch);
    curl_close($ch);

    if ($curlErr) {
        @unlink($filePath);
        http_response_code(502);
        echo json_encode(['success' => false, 'message' => 'Gagal menghubungi server pusat: ' . $curlErr]);
        exit;
    }

    http_response_code($httpCode ?: 200);
    echo $resBody;
    exit;
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>Lapor Keluhan &amp; Fasilitas — Chung Chung Christian School</title>
  <link rel="icon" type="image/png" sizes="16x16" href="https://ccs.sch.id/assets/images/favicon.png" />

  <!-- Editorial & Geometric Typography (No Inter/Roboto) -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">

  <!-- Phosphor Icons (Bold & Fill Weights) -->
  <script src="https://unpkg.com/@phosphor-icons/web"></script>

  <style>
    :root {
      --canvas: #FBFBFA;
      --surface: #FFFFFF;
      --surface-alt: #F7F6F3;
      --border: #EAEAEA;
      --border-strong: #D6D5D0;
      --text-primary: #111111;
      --text-body: #2F3437;
      --text-muted: #787774;

      /* Desaturated Spot Pastels */
      --pastel-green-bg: #EDF3EC;
      --pastel-green-text: #346538;
      --pastel-green-border: #D4E4D2;

      --pastel-yellow-bg: #FBF3DB;
      --pastel-yellow-text: #956400;
      --pastel-yellow-border: #EFE1B6;

      --pastel-red-bg: #FDEBEC;
      --pastel-red-text: #9F2F2D;
      --pastel-red-border: #F5D0D2;

      --pastel-blue-bg: #E1F3FE;
      --pastel-blue-text: #1F6C9F;
      --pastel-blue-border: #C4E5FA;

      --font-sans: 'Plus Jakarta Sans', 'SF Pro Display', 'Helvetica Neue', sans-serif;
      --font-serif: 'Instrument Serif', Georgia, serif;
      --font-mono: 'JetBrains Mono', 'SF Mono', monospace;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: var(--font-sans);
      background-color: var(--canvas);
      color: var(--text-body);
      line-height: 1.6;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      -webkit-font-smoothing: antialiased;
      position: relative;
    }

    /* Subtle Architectural Grid Background */
    .ambient-canvas {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 0;
      background-image:
        radial-gradient(circle at 80% 10%, rgba(215, 208, 195, 0.16) 0%, transparent 45%),
        linear-gradient(to right, rgba(0, 0, 0, 0.018) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(0, 0, 0, 0.018) 1px, transparent 1px);
      background-size: 100% 100%, 48px 48px, 48px 48px;
    }

    /* Top Minimalist Brand Bar */
    .site-header {
      position: sticky;
      top: 0;
      z-index: 40;
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(8px);
      border-bottom: 1px solid var(--border);
    }

    .header-inner {
      max-width: 680px;
      margin: 0 auto;
      padding: 14px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .brand-group {
      display: flex;
      align-items: center;
      gap: 14px;
      text-decoration: none;
      color: var(--text-primary);
    }

    .school-logo {
      height: 40px;
      width: auto;
      max-width: 115px;
      object-fit: contain;
      display: block;
    }

    .brand-divider {
      width: 1px;
      height: 26px;
      background: var(--border);
    }

    .brand-meta {
      display: flex;
      flex-direction: column;
    }

    .brand-eyebrow {
      font-family: var(--font-mono);
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--text-muted);
      line-height: 1.2;
    }

    .brand-title {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.01em;
      line-height: 1.3;
    }

    .qr-kbd {
      font-family: var(--font-mono);
      font-size: 10.5px;
      font-weight: 500;
      color: var(--text-body);
      background: var(--surface-alt);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 4px 9px;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }

    /* Main Workspace Container */
    .workspace {
      position: relative;
      z-index: 1;
      max-width: 680px;
      width: 100%;
      margin: 0 auto;
      padding: 36px 20px 64px;
      flex: 1;
    }

    /* Editorial Intro Block */
    .editorial-header {
      margin-bottom: 24px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .editorial-kicker {
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
    }

    .editorial-heading {
      font-family: var(--font-serif);
      font-size: 34px;
      font-weight: 400;
      color: var(--text-primary);
      letter-spacing: -0.02em;
      line-height: 1.12;
    }

    .editorial-sub {
      font-size: 13.5px;
      color: var(--text-muted);
      max-width: 560px;
    }

    /* Bento Card */
    .bento-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 26px;
      transition: box-shadow 0.2s ease;
      animation: revealUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    .bento-card:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
    }

    @keyframes revealUp {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Form Fields */
    .field-block {
      margin-bottom: 20px;
    }

    .field-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 8px;
    }

    .field-label {
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-primary);
    }

    /* Status Badges (Muted Pastels) */
    .pastel-tag {
      font-family: var(--font-mono);
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      padding: 2px 8px;
      border-radius: 9999px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .tag-red {
      background: var(--pastel-red-bg);
      color: var(--pastel-red-text);
      border: 1px solid var(--pastel-red-border);
    }
    .tag-green {
      background: var(--pastel-green-bg);
      color: var(--pastel-green-text);
      border: 1px solid var(--pastel-green-border);
    }

    /* Photo Upload Box */
    .upload-zone {
      border: 1px dashed var(--border-strong);
      border-radius: 8px;
      background: var(--surface-alt);
      padding: 24px 16px;
      text-align: center;
      cursor: pointer;
      transition: border-color 0.18s ease, background 0.18s ease;
    }

    .upload-zone:hover {
      border-color: var(--text-primary);
      background: var(--surface);
    }

    .upload-zone.has-image {
      border-style: solid;
      border-color: var(--pastel-green-border);
      background: var(--pastel-green-bg);
      padding: 12px;
    }

    .upload-icon-box {
      width: 40px;
      height: 40px;
      border-radius: 6px;
      background: var(--surface);
      border: 1px solid var(--border);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--text-primary);
      font-size: 20px;
      margin-bottom: 10px;
    }

    .preview-img {
      width: 100%;
      max-height: 260px;
      object-fit: cover;
      border-radius: 6px;
      display: block;
      border: 1px solid var(--border);
    }

    .input-control,
    .textarea-control {
      width: 100%;
      font-family: var(--font-sans);
      font-size: 14px;
      color: var(--text-primary);
      background: var(--surface-alt);
      border: 1px solid var(--border-strong);
      border-radius: 6px;
      padding: 12px 14px;
      outline: none;
      transition: border-color 0.15s ease, background 0.15s ease;
    }

    .input-control:focus,
    .textarea-control:focus {
      background: var(--surface);
      border-color: var(--text-primary);
    }

    .textarea-control {
      min-height: 115px;
      resize: vertical;
      line-height: 1.55;
    }

    /* Utilitarian Primary Button (#111111) */
    .btn-primary {
      width: 100%;
      background: var(--text-primary);
      color: #FFFFFF;
      font-family: var(--font-sans);
      font-size: 14px;
      font-weight: 600;
      border: 1px solid var(--text-primary);
      border-radius: 6px;
      padding: 13px 18px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: background 0.15s ease, transform 0.1s ease;
    }

    .btn-primary:hover {
      background: #2B2B2B;
    }

    .btn-primary:active {
      transform: scale(0.98);
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    .btn-secondary {
      background: var(--surface);
      color: var(--text-primary);
      font-family: var(--font-sans);
      font-size: 13px;
      font-weight: 600;
      border: 1px solid var(--border-strong);
      border-radius: 6px;
      padding: 10px 18px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin-top: 18px;
      transition: border-color 0.15s ease;
    }

    .btn-secondary:hover {
      border-color: var(--text-primary);
    }

    .alert-box {
      display: none;
      padding: 12px 14px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 18px;
      align-items: center;
      gap: 9px;
      background: var(--pastel-red-bg);
      color: var(--pastel-red-text);
      border: 1px solid var(--pastel-red-border);
    }

    /* Success State View */
    .success-state {
      display: none;
      text-align: center;
      padding: 20px 8px;
    }

    .success-badge-icon {
      width: 48px;
      height: 48px;
      border-radius: 8px;
      background: var(--pastel-green-bg);
      border: 1px solid var(--pastel-green-border);
      color: var(--pastel-green-text);
      font-size: 24px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 14px;
    }

    .site-footer {
      border-top: 1px solid var(--border);
      background: var(--surface);
      padding: 18px 20px;
      text-align: center;
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-muted);
      position: relative;
      z-index: 1;
    }

    @media (max-width: 520px) {
      .header-inner {
        padding: 12px 16px;
      }
      .workspace {
        padding: 24px 16px 48px;
      }
      .editorial-heading {
        font-size: 28px;
      }
      .bento-card {
        padding: 20px;
      }
    }
  </style>
</head>
<body>

  <div class="ambient-canvas"></div>

  <!-- TOP MINIMALIST HEADER WITH OFFICIAL CCS LOGO -->
  <header class="site-header">
    <div class="header-inner">
      <a href="https://ccs.sch.id/" class="brand-group">
        <img
          src="https://ccs.sch.id/assets/images/logo-cccs.png"
          alt="Chung Chung Christian School"
          class="school-logo"
          onerror="this.src='https://ccs.sch.id/assets/images/logo.png';"
        />
        <span class="brand-divider"></span>
        <div class="brand-meta">
          <span class="brand-title">Report Facility</span>
        </div>
      </a>
    </div>
  </header>

  <main class="workspace">
    <!-- EDITORIAL HEADER -->
    <div class="editorial-header">
      <span class="editorial-kicker">[01] Facility &amp; Cleanliness Report</span>
      <h1 class="editorial-heading">Lapor Keluhan &amp; Fasilitas</h1>
      <p class="editorial-sub">
        Sampaikan laporan kondisi kebersihan atau kerusakan fasilitas di area sekolah. Identitas pelapor bersifat opsional dan dapat dikirim secara anonim.
      </p>
    </div>

    <section class="bento-card">
      <div id="alertBox" class="alert-box"></div>

      <!-- FORM PELAPOR -->
      <form id="reportForm" onsubmit="handleReportSubmit(event)" novalidate>
        <!-- 1. UPLOAD FOTO KONDISI (WAJIB) -->
        <div class="field-block">
          <div class="field-top">
            <label class="field-label" for="photoInput">01 / Foto Kondisi Area / Fasilitas</label>
            <span class="pastel-tag tag-red">Wajib</span>
          </div>

          <input
            type="file"
            id="photoInput"
            accept="image/*"
            capture="environment"
            style="display:none;"
            onchange="handlePhotoChange(event)"
          />

          <div id="uploadZone" class="upload-zone" onclick="document.getElementById('photoInput').click()">
            <div id="uploadPlaceholder">
              <div class="upload-icon-box">
                <i class="ph-bold ph-camera"></i>
              </div>
              <div style="font-size:13.5px; font-weight:600; color:var(--text-primary);">
                Ambil Foto Kamera / Pilih Gambar
              </div>
              <div style="font-size:12px; color:var(--text-muted); margin-top:3px;">
                Lampirkan foto area kotor atau fasilitas yang bermasalah
              </div>
            </div>
            <div id="previewContainer" style="display:none;">
              <img id="previewImage" class="preview-img" src="" alt="Preview Foto Kondisi" />
              <div style="font-family:var(--font-mono); font-size:11px; font-weight:600; color:var(--pastel-green-text); margin-top:10px; display:flex; align-items:center; justify-content:center; gap:5px;">
                <i class="ph-bold ph-check-circle"></i> Foto Kondisi Siap Dikirim (Klik untuk mengganti)
              </div>
            </div>
          </div>
        </div>

        <!-- 2. TEXTAREA DESKRIPSI KELUHAN (WAJIB) -->
        <div class="field-block">
          <div class="field-top">
            <label class="field-label" for="issueDescription">02 / Lokasi &amp; Deskripsi Keluhan</label>
            <span class="pastel-tag tag-red">Wajib</span>
          </div>
          <textarea
            id="issueDescription"
            class="textarea-control"
            placeholder="Sebutkan lokasi ruangan/area beserta keluhan (contoh: Toilet Lantai 2 tisu habis, AC Ruang Lab Komputer bocor, atau lantai koridor basah)..."
            required
          ></textarea>
        </div>

        <!-- 3. TEXTBOX NAMA PELAPOR (OPSIONAL / BISA ANONIM) -->
        <div class="field-block">
          <div class="field-top">
            <label class="field-label" for="reporterName">03 / Nama Pelapor</label>
            <span class="pastel-tag tag-green">Opsional / Bisa Anonim</span>
          </div>
          <input
            type="text"
            id="reporterName"
            class="input-control"
            placeholder="Kosongkan bila ingin melapor secara Anonim..."
          />
        </div>

        <button type="submit" id="submitBtn" class="btn-primary">
          <i class="ph-bold ph-paper-plane-tilt"></i>
          <span id="submitBtnText">Kirim Laporan Fasilitas</span>
        </button>
      </form>

      <!-- TAMPILAN SUKSES -->
      <div id="successView" class="success-state">
        <div class="success-badge-icon">
          <i class="ph-bold ph-check"></i>
        </div>
        <h2 style="font-family:var(--font-serif); font-size:28px; font-weight:400; color:var(--text-primary);">
          Laporan Berhasil Diterima
        </h2>
        <p style="font-size:13.5px; color:var(--text-muted); margin-top:6px; max-width:420px; margin-left:auto; margin-right:auto;">
          Terima kasih atas kepedulian Anda. Tim kebersihan dan pemeliharaan fasilitas sekolah telah menerima laporan ini untuk segera ditindaklanjuti.
        </p>
        <button type="button" class="btn-secondary" onclick="resetForm()">
          <i class="ph-bold ph-plus"></i>
          <span>Buat Laporan Lainnya</span>
        </button>
      </div>
    </section>
  </main>

  <script>
    let compressedBase64 = '';

    function showError(msg) {
      const box = document.getElementById('alertBox');
      box.innerHTML = `<i class="ph-bold ph-warning-circle" style="font-size:17px; flex-shrink:0;"></i><span>${msg}</span>`;
      box.style.display = 'flex';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function hideError() {
      const box = document.getElementById('alertBox');
      box.style.display = 'none';
    }

    function compressImageFile(file, maxWidth = 1280, quality = 0.80) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = new Image();
          img.onload = () => {
            let w = img.width;
            let h = img.height;
            if (w > maxWidth) {
              h = Math.round((h * maxWidth) / w);
              w = maxWidth;
            }
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', quality));
          };
          img.onerror = reject;
          img.src = ev.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    async function handlePhotoChange(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      hideError();

      try {
        compressedBase64 = await compressImageFile(file);
        document.getElementById('previewImage').src = compressedBase64;
        document.getElementById('uploadPlaceholder').style.display = 'none';
        document.getElementById('previewContainer').style.display = 'block';
        document.getElementById('uploadZone').classList.add('has-image');
      } catch (err) {
        showError('Gagal memproses foto. Silakan pilih foto lain.');
      }
    }

    async function handleReportSubmit(event) {
      event.preventDefault();
      hideError();

      const desc = document.getElementById('issueDescription').value.trim();
      const name = document.getElementById('reporterName').value.trim();

      if (!compressedBase64) {
        showError('Foto kondisi wajib dilampirkan terlebih dahulu.');
        return;
      }

      if (!desc) {
        showError('Lokasi dan deskripsi keluhan wajib diisi.');
        document.getElementById('issueDescription').focus();
        return;
      }

      const btn = document.getElementById('submitBtn');
      const btnText = document.getElementById('submitBtnText');
      btn.disabled = true;
      btnText.textContent = 'Mengirim Laporan...';

      try {
        const res = await fetch(window.location.pathname, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reporter_name: name || 'Anonim',
            issue_description: desc,
            image_base64: compressedBase64
          })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Gagal mengirim laporan keluhan.');
        }

        document.getElementById('reportForm').style.display = 'none';
        document.getElementById('successView').style.display = 'block';
      } catch (err) {
        showError(err.message || 'Terjadi gangguan jaringan saat mengirim laporan.');
      } finally {
        btn.disabled = false;
        btnText.textContent = 'Kirim Laporan Fasilitas';
      }
    }

    function resetForm() {
      compressedBase64 = '';
      document.getElementById('photoInput').value = '';
      document.getElementById('issueDescription').value = '';
      document.getElementById('reporterName').value = '';
      document.getElementById('uploadPlaceholder').style.display = 'block';
      document.getElementById('previewContainer').style.display = 'none';
      document.getElementById('uploadZone').classList.remove('has-image');
      document.getElementById('successView').style.display = 'none';
      document.getElementById('reportForm').style.display = 'block';
      hideError();
    }
  </script>
</body>
</html>
