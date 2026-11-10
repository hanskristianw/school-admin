<?php
/**
 * ============================================================================
 * CHUNG CHUNG CHRISTIAN SCHOOL - PORTAL KHUSUS VENDOR CLEANER (WEB CCS PHP)
 * File: index.php (Hostinger / cPanel: public_html/checklist/index.php)
 * URL Publik: https://ccs.sch.id/checklist
 * Aesthetic: Utilitarian Editorial Minimalism (Warm Monochrome + Spot Pastels)
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

// ── 0. SECURE STREAMING FOTO UNTUK NEXT.JS ADMIN & PREVIEW ──────────────────
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

// ── 1. AJAX HANDLER: GET (Load Cleaners / Assigned Rooms / Complaints) ──────
if (isset($_GET['ajax_action'])) {
    header('Content-Type: application/json; charset=utf-8');
    $ajaxAction = $_GET['ajax_action'];

    $apiUrl = NEXTJS_API_URL . '?secret_token=' . urlencode(API_SECRET_TOKEN);

    if ($ajaxAction === 'get_cleaners') {
        $apiUrl .= '&action=get_cleaners';
    } elseif ($ajaxAction === 'get_cleaner_rooms') {
        $userId = $_GET['user_id'] ?? '';
        $workerName = $_GET['worker_name'] ?? '';
        $apiUrl .= '&action=get_cleaner_rooms&user_id=' . urlencode($userId) . '&worker_name=' . urlencode($workerName);
    } elseif ($ajaxAction === 'get_complaints') {
        $apiUrl .= '&action=get_active_reports';
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid ajax_action']);
        exit;
    }

    $ch = curl_init($apiUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_TIMEOUT        => 20,
        CURLOPT_HTTPHEADER     => [
            'Accept: application/json',
            'Authorization: Bearer ' . API_SECRET_TOKEN,
            'x-vendor-secret: ' . API_SECRET_TOKEN
        ]
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr  = curl_error($ch);
    curl_close($ch);

    if ($curlErr) {
        http_response_code(502);
        echo json_encode(['success' => false, 'message' => 'Gagal menghubungi server: ' . $curlErr]);
        exit;
    }

    http_response_code($httpCode ?: 200);
    echo $response;
    exit;
}

// ── 2. POST HANDLER: UPLOAD BEFORE & AFTER / REVISI / SELESAIKAN KOMPLAIN ───
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json; charset=utf-8');

    $rawBody = file_get_contents('php://input');
    $input = json_decode($rawBody, true);
    if (!is_array($input)) {
        $input = $_POST;
    }

    $action     = $input['action'] ?? '';
    $roomId     = $input['room_id'] ?? '';
    $roomToken  = $input['room_token'] ?? '';
    $workerName = trim($input['worker_name'] ?? '');
    $notes      = trim($input['notes'] ?? '');

    if ($workerName === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Silakan pilih Nama Petugas terlebih dahulu.']);
        exit;
    }

    function saveBase64Photo($base64Str, $prefix) {
        if (!$base64Str) return null;
        if (preg_match('/^data:image\/(\w+);base64,/', $base64Str)) {
            $base64Str = substr($base64Str, strpos($base64Str, ',') + 1);
        }
        $decoded = base64_decode($base64Str);
        if ($decoded === false) return null;
        if (strlen($decoded) > MAX_IMAGE_SIZE_BYTES) return false;

        $datePrefix = date('Ymd_His');
        $randHash = substr(md5(uniqid((string)mt_rand(), true)), 0, 6);
        $filename = "{$prefix}_{$datePrefix}_{$randHash}.jpg";
        $filePath = UPLOAD_DIR . $filename;

        if (file_put_contents($filePath, $decoded) === false) return null;
        return $filename;
    }

    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'ccs.sch.id';
    $baseDir = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\');
    $hostingUrl = "{$protocol}://{$host}{$baseDir}/";
    $apiUrl = NEXTJS_API_URL;

    // A. SUBMIT BEFORE & AFTER SEKALIGUS (1 Halaman)
    if ($action === 'submit_before_after') {
        $beforeB64 = $input['image_before_base64'] ?? '';
        $afterB64  = $input['image_after_base64'] ?? '';

        if ($beforeB64 === '' || $afterB64 === '') {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Foto Before dan Foto After wajib diunggah keduanya.']);
            exit;
        }

        $safeRoom = preg_replace('/[^a-zA-Z0-9_-]/', '', (string)($roomId ?: $roomToken));
        $beforeFile = saveBase64Photo($beforeB64, "chk_{$safeRoom}_before");
        $afterFile  = saveBase64Photo($afterB64, "chk_{$safeRoom}_after");

        if (!$beforeFile || !$afterFile) {
            if ($beforeFile) @unlink(UPLOAD_DIR . $beforeFile);
            if ($afterFile) @unlink(UPLOAD_DIR . $afterFile);
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Gagal menyimpan file foto atau ukuran melebihi 15MB.']);
            exit;
        }

        $payload = json_encode([
            'secret_token'      => API_SECRET_TOKEN,
            'action'            => 'submit_before_after',
            'room_id'           => $roomId ? (int)$roomId : null,
            'room_token'        => $roomToken,
            'worker_name'       => $workerName,
            'notes'             => $notes,
            'image_before_file' => $beforeFile,
            'image_after_file'  => $afterFile,
            'hosting_url'       => $hostingUrl
        ]);
    }
    // B. SUBMIT REVISI
    elseif ($action === 'submit_revision') {
        $revB64 = $input['image_base64'] ?? '';
        if ($revB64 === '') {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Foto perbaikan revisi wajib diunggah.']);
            exit;
        }
        $safeRoom = preg_replace('/[^a-zA-Z0-9_-]/', '', (string)($roomId ?: $roomToken));
        $revFile = saveBase64Photo($revB64, "chk_{$safeRoom}_revision");
        if (!$revFile) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Gagal menyimpan foto revisi.']);
            exit;
        }

        $payload = json_encode([
            'secret_token' => API_SECRET_TOKEN,
            'action'       => 'submit_revision',
            'room_id'      => $roomId ? (int)$roomId : null,
            'room_token'   => $roomToken,
            'worker_name'  => $workerName,
            'notes'        => $notes,
            'image_file'   => $revFile,
            'hosting_url'  => $hostingUrl
        ]);
    }
    // C. RESOLVE COMPLAINT
    elseif ($action === 'resolve_report') {
        $reportId = $input['report_id'] ?? '';
        $resB64   = $input['image_base64'] ?? '';
        $resNotes = trim($input['resolution_notes'] ?? '');

        if (!$reportId || !$resB64) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Foto bukti penyelesaian komplain wajib diunggah.']);
            exit;
        }
        $resFile = saveBase64Photo($resB64, "resolve_{$reportId}");
        if (!$resFile) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Gagal menyimpan foto penyelesaian.']);
            exit;
        }

        $payload = json_encode([
            'secret_token'     => API_SECRET_TOKEN,
            'action'           => 'resolve_report',
            'report_id'        => $reportId,
            'worker_name'      => $workerName,
            'resolution_notes' => $resNotes,
            'image_file'       => $resFile,
            'hosting_url'      => $hostingUrl
        ]);
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Aksi tidak dikenali.']);
        exit;
    }

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
  <title>Portal Kebersihan Ruangan — Chung Chung Christian School</title>
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
        radial-gradient(circle at 18% 12%, rgba(215, 208, 195, 0.16) 0%, transparent 45%),
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
      max-width: 760px;
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

    .date-kbd {
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 500;
      color: var(--text-body);
      background: var(--surface-alt);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 4px 10px;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    /* Main Workspace Container */
    .workspace {
      position: relative;
      z-index: 1;
      max-width: 760px;
      width: 100%;
      margin: 0 auto;
      padding: 36px 20px 64px;
      flex: 1;
    }

    /* Editorial Intro Block */
    .editorial-header {
      margin-bottom: 28px;
      padding-bottom: 22px;
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
      max-width: 580px;
    }

    /* Navigation Tabs */
    .nav-tabs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      background: var(--surface-alt);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 4px;
      margin-bottom: 24px;
    }

    .nav-tab {
      border: 1px solid transparent;
      background: transparent;
      color: var(--text-muted);
      font-family: var(--font-sans);
      font-size: 12.5px;
      font-weight: 600;
      padding: 9px 12px;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.18s ease;
    }

    .nav-tab.active {
      background: var(--surface);
      color: var(--text-primary);
      border-color: var(--border);
    }

    .count-pill {
      font-family: var(--font-mono);
      font-size: 10px;
      font-weight: 600;
      padding: 1px 7px;
      border-radius: 9999px;
      background: var(--pastel-red-bg);
      color: var(--pastel-red-text);
      border: 1px solid var(--pastel-red-border);
    }

    /* Bento Cards */
    .bento-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 24px;
      margin-bottom: 16px;
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

    /* Form Controls */
    .field-block {
      margin-bottom: 18px;
    }
    .field-block:last-child {
      margin-bottom: 0;
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
      font-size: 10.5px;
      font-weight: 500;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      padding: 2px 9px;
      border-radius: 9999px;
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    .tag-green {
      background: var(--pastel-green-bg);
      color: var(--pastel-green-text);
      border: 1px solid var(--pastel-green-border);
    }
    .tag-yellow {
      background: var(--pastel-yellow-bg);
      color: var(--pastel-yellow-text);
      border: 1px solid var(--pastel-yellow-border);
    }
    .tag-red {
      background: var(--pastel-red-bg);
      color: var(--pastel-red-text);
      border: 1px solid var(--pastel-red-border);
    }
    .tag-blue {
      background: var(--pastel-blue-bg);
      color: var(--pastel-blue-text);
      border: 1px solid var(--pastel-blue-border);
    }

    .select-wrap {
      position: relative;
    }

    .select-control {
      width: 100%;
      appearance: none;
      -webkit-appearance: none;
      font-family: var(--font-sans);
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
      background: var(--surface-alt);
      border: 1px solid var(--border-strong);
      border-radius: 6px;
      padding: 12px 38px 12px 14px;
      outline: none;
      cursor: pointer;
      transition: border-color 0.15s ease, background 0.15s ease;
    }

    .select-control:focus {
      background: var(--surface);
      border-color: var(--text-primary);
    }

    .select-control:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }

    .select-caret {
      position: absolute;
      right: 13px;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
      color: var(--text-muted);
      font-size: 15px;
    }

    /* Progress Bar & Room Chips */
    .progress-panel {
      margin-top: 18px;
      padding-top: 18px;
      border-top: 1px solid var(--border);
    }

    .progress-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-muted);
      margin-bottom: 8px;
    }

    .progress-track {
      height: 6px;
      width: 100%;
      background: var(--surface-alt);
      border: 1px solid var(--border);
      border-radius: 9999px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: var(--text-primary);
      transition: width 0.3s ease;
    }

    .room-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 12px;
    }

    .room-chip {
      font-family: var(--font-sans);
      font-size: 12px;
      font-weight: 600;
      padding: 6px 11px;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text-body);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }

    .room-chip:hover {
      border-color: var(--text-primary);
    }

    .room-chip.active {
      background: var(--text-primary);
      color: #FFFFFF;
      border-color: var(--text-primary);
    }

    .room-chip.done:not(.active) {
      background: var(--pastel-green-bg);
      color: var(--pastel-green-text);
      border-color: var(--pastel-green-border);
    }

    .room-chip.revision:not(.active) {
      background: var(--pastel-red-bg);
      color: var(--pastel-red-text);
      border-color: var(--pastel-red-border);
    }

    /* Empty / Notice Card */
    .empty-bento {
      background: var(--surface-alt);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 22px;
      text-align: center;
      margin-top: 16px;
    }

    .empty-icon {
      width: 36px;
      height: 36px;
      border-radius: 6px;
      background: var(--surface);
      border: 1px solid var(--border);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
      font-size: 18px;
      margin-bottom: 10px;
    }

    /* Dual Photo Upload Grid */
    .photo-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin: 18px 0;
    }

    @media (max-width: 520px) {
      .photo-grid {
        grid-template-columns: 1fr;
      }
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
        padding: 18px;
      }
    }

    .upload-slot {
      border: 1px dashed var(--border-strong);
      border-radius: 8px;
      background: var(--surface-alt);
      padding: 20px 14px;
      text-align: center;
      cursor: pointer;
      transition: border-color 0.18s ease, background 0.18s ease;
    }

    .upload-slot:hover {
      border-color: var(--text-primary);
      background: var(--surface);
    }

    .upload-slot.ready {
      border-style: solid;
      border-color: var(--pastel-green-border);
      background: var(--pastel-green-bg);
      padding: 10px;
    }

    .upload-slot img {
      width: 100%;
      height: 175px;
      object-fit: cover;
      border-radius: 6px;
      display: block;
      border: 1px solid var(--border);
    }

    .slot-kicker {
      font-family: var(--font-mono);
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 3px 8px;
      border-radius: 4px;
      display: inline-block;
      margin-bottom: 10px;
    }

    .textarea-control {
      width: 100%;
      font-family: var(--font-sans);
      font-size: 13.5px;
      color: var(--text-primary);
      background: var(--surface-alt);
      border: 1px solid var(--border-strong);
      border-radius: 6px;
      padding: 11px 13px;
      outline: none;
      resize: vertical;
      min-height: 68px;
      transition: border-color 0.15s ease, background 0.15s ease;
    }

    .textarea-control:focus {
      background: var(--surface);
      border-color: var(--text-primary);
    }

    /* Utilitarian Primary Button (#111111) */
    .btn-primary {
      width: 100%;
      background: var(--text-primary);
      color: #FFFFFF;
      font-family: var(--font-sans);
      font-size: 13.5px;
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

    /* Banners & Alerts */
    .notice-banner {
      padding: 12px 14px;
      border-radius: 6px;
      font-size: 12.5px;
      margin-bottom: 16px;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      line-height: 1.5;
    }

    .notice-done {
      background: var(--pastel-green-bg);
      color: var(--pastel-green-text);
      border: 1px solid var(--pastel-green-border);
    }

    .notice-revision {
      background: var(--pastel-red-bg);
      color: var(--pastel-red-text);
      border: 1px solid var(--pastel-red-border);
    }

    .alert-box {
      display: none;
      padding: 13px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 16px;
      align-items: center;
      gap: 10px;
    }
    .alert-error {
      background: var(--pastel-red-bg);
      color: var(--pastel-red-text);
      border: 1px solid var(--pastel-red-border);
    }
    .alert-success {
      background: var(--pastel-green-bg);
      color: var(--pastel-green-text);
      border: 1px solid var(--pastel-green-border);
    }

    /* Complaint Item */
    .complaint-card {
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 18px;
      background: var(--surface);
      margin-bottom: 12px;
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
          <span class="brand-eyebrow">Facility Operations</span>
          <span class="brand-title">Cleaner Workspace</span>
        </div>
      </a>

      <div class="date-kbd">
        <i class="ph-bold ph-calendar-blank"></i>
        <span id="dateBadgeText">Hari Ini</span>
      </div>
    </div>
  </header>

  <main class="workspace">
    <!-- EDITORIAL HEADER -->
    <div class="editorial-header">
      <span class="editorial-kicker">[01] Daily Sanitation Log &amp; Verification</span>
      <h1 class="editorial-heading">Laporan Kebersihan Harian</h1>
      <p class="editorial-sub">
        Pilih nama petugas dan ruangan yang ditugaskan kepada Anda, lalu lampirkan dokumentasi foto kondisi sebelum (Before) dan sesudah (After) pembersihan.
      </p>
    </div>

    <!-- NAVIGATION TABS -->
    <div class="nav-tabs">
      <button type="button" class="nav-tab active" id="tabBtnCleaning" onclick="switchTab('cleaning')">
        <i class="ph-bold ph-broom"></i>
        <span>Checklist Ruangan</span>
      </button>
      <button type="button" class="nav-tab" id="tabBtnComplaints" onclick="switchTab('complaints')">
        <i class="ph-bold ph-warning-circle"></i>
        <span>Komplain Pelapor</span>
        <span class="count-pill" id="complaintCountPill" style="display:none;">0</span>
      </button>
    </div>

    <div id="alertBox" class="alert-box"></div>

    <!-- ══════════════════════════════════════════════════════════════════════ -->
    <!-- TAB 1: CHECKLIST KEBERSIHAN RUANGAN                                    -->
    <!-- ══════════════════════════════════════════════════════════════════════ -->
    <div id="paneCleaning">
      <!-- BENTO CARD 1: DROPDOWN 1 (NAMA CLEANER) & DROPDOWN 2 (RUANGAN) -->
      <section class="bento-card">
        <!-- DROPDOWN 1: PILIH NAMA CLEANER -->
        <div class="field-block">
          <div class="field-top">
            <label class="field-label" for="cleanerDropdown">01 / Pilih Nama Petugas (Cleaner)</label>
            <span class="pastel-tag tag-green" id="rememberedHint" style="display:none;">
              <i class="ph-bold ph-check"></i> Tersimpan Otomatis
            </span>
          </div>
          <div class="select-wrap">
            <select id="cleanerDropdown" class="select-control" onchange="onCleanerChange()">
              <option value="">Memuat daftar nama petugas...</option>
            </select>
            <i class="ph-bold ph-caret-down select-caret"></i>
          </div>
        </div>

        <!-- DROPDOWN 2: PILIH RUANGAN YANG BERKAITAN DENGAN CLEANER TERSEBUT -->
        <div class="field-block" id="roomSelectGroup" style="display:none;">
          <div class="field-top">
            <label class="field-label" for="roomDropdown">02 / Pilih Ruangan Tanggung Jawab Anda</label>
            <span class="pastel-tag tag-blue" id="roomCountLabel">0 Ruangan</span>
          </div>
          <div class="select-wrap">
            <select id="roomDropdown" class="select-control" onchange="onRoomChange()">
              <option value="">-- Pilih Ruangan --</option>
            </select>
            <i class="ph-bold ph-caret-down select-caret"></i>
          </div>

          <!-- Empty State jika Cleaner belum memiliki ruangan yang ditugaskan -->
          <div id="noAssignedRoomsBox" class="empty-bento" style="display:none;">
            <div class="empty-icon">
              <i class="ph-bold ph-door-open"></i>
            </div>
            <div style="font-size:13.5px; font-weight:700; color:var(--text-primary);">
              Belum Ada Ruangan yang Ditugaskan
            </div>
            <p style="font-size:12.5px; color:var(--text-muted); margin-top:4px; max-width:440px; margin-left:auto; margin-right:auto;">
              Nama Anda saat ini belum terdaftar pada jadwal ruangan di sistem supervisor. Silakan pilih nama petugas lain atau hubungi supervisor untuk mengatur petugas ruangan.
            </p>
          </div>

          <!-- Indikator Target Harian Cleaner -->
          <div class="progress-panel" id="dailyProgressBox" style="display:none;">
            <div class="progress-meta">
              <span>PROGRES KEBERSIHAN HARI INI</span>
              <span id="progressText" style="color:var(--text-primary); font-weight:600;">0 / 0 Selesai</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" id="progressBarFill" style="width:0%;"></div>
            </div>
            <div class="room-chips" id="roomChipsContainer"></div>
          </div>
        </div>
      </section>

      <!-- BENTO CARD 2: FORM UPLOAD FOTO BEFORE & AFTER UNTUK RUANGAN TERPILIH -->
      <section class="bento-card" id="uploadCard" style="display:none;">
        <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px; padding-bottom:16px; border-bottom:1px solid var(--border); margin-bottom:16px;">
          <div>
            <div style="font-family:var(--font-mono); font-size:10.5px; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em;">
              RUANGAN AKTIF
            </div>
            <h2 id="activeRoomTitle" style="font-family:var(--font-serif); font-size:26px; font-weight:400; color:var(--text-primary); line-height:1.2; margin-top:2px;">
              Nama Ruangan
            </h2>
          </div>
          <span id="activeRoomBadge" class="pastel-tag tag-yellow">Wajib Upload</span>
        </div>

        <!-- Banner Status -->
        <div id="roomStatusBanner" class="notice-banner" style="display:none;"></div>

        <!-- Area Upload Before & After (Mode Normal) -->
        <div id="beforeAfterSection">
          <p style="font-size:13px; color:var(--text-muted);">
            Ambil atau unggah foto kondisi ruangan <strong style="color:var(--text-primary);">Sebelum (Before)</strong> dan <strong style="color:var(--text-primary);">Sesudah (After)</strong> dibersihkan untuk hari ini:
          </p>

          <div class="photo-grid">
            <!-- SLOT 1: FOTO BEFORE -->
            <div>
              <input type="file" id="beforeInput" accept="image/*" capture="environment" style="display:none;" onchange="handlePhotoSelect(event, 'before')" />
              <div class="upload-slot" id="beforeSlot" onclick="document.getElementById('beforeInput').click()">
                <div id="beforePlaceholder">
                  <span class="slot-kicker tag-yellow">1. Foto Before</span>
                  <div style="margin:6px 0; color:var(--text-primary); font-size:24px;">
                    <i class="ph-bold ph-camera"></i>
                  </div>
                  <div style="font-size:13px; font-weight:600; color:var(--text-primary);">Ambil Foto Sebelum</div>
                  <div style="font-size:11.5px; color:var(--text-muted); margin-top:2px;">Kondisi awal ruangan</div>
                </div>
                <div id="beforePreviewWrap" style="display:none;">
                  <img id="beforePreviewImg" src="" alt="Preview Before" />
                  <div style="font-family:var(--font-mono); font-size:11px; font-weight:600; color:var(--pastel-green-text); margin-top:8px; display:flex; align-items:center; justify-content:center; gap:4px;">
                    <i class="ph-bold ph-check-circle"></i> Foto Before Siap (Klik ganti)
                  </div>
                </div>
              </div>
            </div>

            <!-- SLOT 2: FOTO AFTER -->
            <div>
              <input type="file" id="afterInput" accept="image/*" capture="environment" style="display:none;" onchange="handlePhotoSelect(event, 'after')" />
              <div class="upload-slot" id="afterSlot" onclick="document.getElementById('afterInput').click()">
                <div id="afterPlaceholder">
                  <span class="slot-kicker tag-green">2. Foto After</span>
                  <div style="margin:6px 0; color:var(--text-primary); font-size:24px;">
                    <i class="ph-bold ph-sparkle"></i>
                  </div>
                  <div style="font-size:13px; font-weight:600; color:var(--text-primary);">Ambil Foto Sesudah</div>
                  <div style="font-size:11.5px; color:var(--text-muted); margin-top:2px;">Kondisi setelah bersih</div>
                </div>
                <div id="afterPreviewWrap" style="display:none;">
                  <img id="afterPreviewImg" src="" alt="Preview After" />
                  <div style="font-family:var(--font-mono); font-size:11px; font-weight:600; color:var(--pastel-green-text); margin-top:8px; display:flex; align-items:center; justify-content:center; gap:4px;">
                    <i class="ph-bold ph-check-circle"></i> Foto After Siap (Klik ganti)
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="field-block" style="margin-bottom:16px;">
            <div class="field-top">
              <label class="field-label" for="cleaningNotes">Catatan Tambahan (Opsional)</label>
            </div>
            <textarea id="cleaningNotes" class="textarea-control" placeholder="Ketik catatan singkat bila diperlukan..."></textarea>
          </div>

          <button type="button" class="btn-primary" id="btnSubmitBeforeAfter" onclick="submitBeforeAfter()">
            <i class="ph-bold ph-upload-simple"></i>
            <span>Simpan Foto Before &amp; After</span>
          </button>
        </div>

        <!-- Area Upload Revisi (Jika diminta revisi oleh Supervisor) -->
        <div id="revisionSection" style="display:none;">
          <input type="file" id="revisionInput" accept="image/*" capture="environment" style="display:none;" onchange="handlePhotoSelect(event, 'revision')" />
          <div class="upload-slot" id="revisionSlot" onclick="document.getElementById('revisionInput').click()" style="margin-bottom:16px;">
            <div id="revisionPlaceholder">
              <span class="slot-kicker tag-red">Foto Perbaikan Revisi</span>
              <div style="margin:6px 0; color:var(--pastel-red-text); font-size:24px;">
                <i class="ph-bold ph-camera-rotate"></i>
              </div>
              <div style="font-size:13px; font-weight:600; color:var(--text-primary);">Ambil Foto Hasil Perbaikan</div>
            </div>
            <div id="revisionPreviewWrap" style="display:none;">
              <img id="revisionPreviewImg" src="" alt="Preview Revisi" />
              <div style="font-family:var(--font-mono); font-size:11px; font-weight:600; color:var(--pastel-green-text); margin-top:8px;">
                Foto Revisi Siap (Klik untuk ganti)
              </div>
            </div>
          </div>

          <button type="button" class="btn-primary" id="btnSubmitRevision" onclick="submitRevision()">
            <i class="ph-bold ph-paper-plane-tilt"></i>
            <span>Kirim Foto Perbaikan Revisi</span>
          </button>
        </div>
      </section>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════════ -->
    <!-- TAB 2: DAFTAR KOMPLAIN PELAPOR (QR GENERAL)                            -->
    <!-- ══════════════════════════════════════════════════════════════════════ -->
    <div id="paneComplaints" style="display:none;">
      <section class="bento-card">
        <div style="margin-bottom:16px; padding-bottom:14px; border-bottom:1px solid var(--border);">
          <div style="font-family:var(--font-mono); font-size:10.5px; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em;">
            PUBLIC FACILITY REPORTS
          </div>
          <h2 style="font-family:var(--font-serif); font-size:24px; font-weight:400; color:var(--text-primary); margin-top:2px;">
            Daftar Keluhan &amp; Laporan Masuk
          </h2>
          <p style="font-size:12.5px; color:var(--text-muted); margin-top:2px;">
            Laporan dari warga sekolah melalui QR General. Unggah foto bukti penanganan untuk menandai selesai.
          </p>
        </div>
        <div id="complaintsListContainer">
          <div style="text-align:center; padding:28px 0; color:var(--text-muted); font-size:13px;">
            Memuat daftar komplain...
          </div>
        </div>
      </section>
    </div>
  </main>

  <footer class="site-footer">
    CHUNG CHUNG CHRISTIAN SCHOOL &mdash; FACILITY SANITATION &amp; MAINTENANCE SYSTEM
  </footer>

  <script>
    const STORAGE_USER_ID   = 'ccs_cleaner_user_id';
    const STORAGE_USER_NAME = 'ccs_cleaner_name';

    let cleanersList = [];
    let assignedRooms = [];
    let activeRoom = null;
    let selectedCleaner = {
      userId: localStorage.getItem(STORAGE_USER_ID) || '',
      name: localStorage.getItem(STORAGE_USER_NAME) || ''
    };

    let beforeBase64 = '';
    let afterBase64 = '';
    let revisionBase64 = '';
    let resolvePhotosMap = {};

    // Format Tanggal Hari Ini
    const now = new Date();
    document.getElementById('dateBadgeText').textContent = now.toLocaleDateString('id-ID', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    });

    function showAlert(msg, type = 'error') {
      const box = document.getElementById('alertBox');
      box.className = 'alert-box ' + (type === 'success' ? 'alert-success' : 'alert-error');
      const icon = type === 'success' ? 'ph-check-circle' : 'ph-warning-circle';
      box.innerHTML = `<i class="ph-bold ${icon}" style="font-size:17px; flex-shrink:0;"></i><span>${msg}</span>`;
      box.style.display = 'flex';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function hideAlert() {
      const box = document.getElementById('alertBox');
      box.style.display = 'none';
    }

    function switchTab(tab) {
      hideAlert();
      document.getElementById('tabBtnCleaning').classList.toggle('active', tab === 'cleaning');
      document.getElementById('tabBtnComplaints').classList.toggle('active', tab === 'complaints');
      document.getElementById('paneCleaning').style.display = tab === 'cleaning' ? 'block' : 'none';
      document.getElementById('paneComplaints').style.display = tab === 'complaints' ? 'block' : 'none';
      if (tab === 'complaints') {
        loadComplaints();
      }
    }

    // Kompresi gambar di sisi browser
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

    async function handlePhotoSelect(event, type) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      hideAlert();
      try {
        const b64 = await compressImageFile(file);
        if (type === 'before') {
          beforeBase64 = b64;
          document.getElementById('beforePreviewImg').src = b64;
          document.getElementById('beforePlaceholder').style.display = 'none';
          document.getElementById('beforePreviewWrap').style.display = 'block';
          document.getElementById('beforeSlot').classList.add('ready');
        } else if (type === 'after') {
          afterBase64 = b64;
          document.getElementById('afterPreviewImg').src = b64;
          document.getElementById('afterPlaceholder').style.display = 'none';
          document.getElementById('afterPreviewWrap').style.display = 'block';
          document.getElementById('afterSlot').classList.add('ready');
        } else if (type === 'revision') {
          revisionBase64 = b64;
          document.getElementById('revisionPreviewImg').src = b64;
          document.getElementById('revisionPlaceholder').style.display = 'none';
          document.getElementById('revisionPreviewWrap').style.display = 'block';
          document.getElementById('revisionSlot').classList.add('ready');
        }
      } catch (err) {
        showAlert('Gagal memproses foto. Silakan ulangi kembali.');
      }
    }

    // 1. Inisialisasi Portal Cleaner & Ingat Pilihan Sebelumnya (localStorage)
    async function initCleanerPortal() {
      loadComplaintsCountOnly();
      const dropdown = document.getElementById('cleanerDropdown');
      try {
        const res = await fetch('?ajax_action=get_cleaners');
        const data = await res.json();
        cleanersList = (data.cleaners || []).map(c => ({
          user_id: String(c.user_id || ''),
          full_name: c.full_name || c.name || ''
        }));

        dropdown.innerHTML = '<option value="">-- Pilih Nama Anda --</option>' +
          cleanersList.map(c => `<option value="${c.user_id}" data-name="${c.full_name.replace(/"/g, '&quot;')}">${c.full_name}</option>`).join('');

        if (selectedCleaner.userId || selectedCleaner.name) {
          const match = cleanersList.find(
            c => c.user_id === String(selectedCleaner.userId) || c.full_name === selectedCleaner.name
          );
          if (match) {
            dropdown.value = match.user_id;
            selectedCleaner.userId = match.user_id;
            selectedCleaner.name = match.full_name;
            document.getElementById('rememberedHint').style.display = 'inline-flex';
            await loadCleanerRooms();
          }
        }
      } catch (err) {
        dropdown.innerHTML = '<option value="">Gagal memuat daftar petugas</option>';
      }
    }

    async function onCleanerChange() {
      hideAlert();
      const dropdown = document.getElementById('cleanerDropdown');
      const userId = dropdown.value;
      const opt = dropdown.options[dropdown.selectedIndex];
      const fullName = opt ? (opt.getAttribute('data-name') || opt.textContent) : '';

      if (!userId) {
        localStorage.removeItem(STORAGE_USER_ID);
        localStorage.removeItem(STORAGE_USER_NAME);
        selectedCleaner = { userId: '', name: '' };
        document.getElementById('rememberedHint').style.display = 'none';
        document.getElementById('roomSelectGroup').style.display = 'none';
        document.getElementById('uploadCard').style.display = 'none';
        return;
      }

      selectedCleaner = { userId, name: fullName };
      localStorage.setItem(STORAGE_USER_ID, userId);
      localStorage.setItem(STORAGE_USER_NAME, fullName);
      document.getElementById('rememberedHint').style.display = 'inline-flex';

      await loadCleanerRooms();
    }

    // 2. Load Daftar Ruangan yang berkaitan dengan Nama Cleaner tersebut
    async function loadCleanerRooms(preserveRoomId = null) {
      const roomGroup = document.getElementById('roomSelectGroup');
      const roomDropdown = document.getElementById('roomDropdown');
      const progressBox = document.getElementById('dailyProgressBox');
      const noRoomsBox = document.getElementById('noAssignedRoomsBox');

      roomGroup.style.display = 'block';
      roomDropdown.disabled = true;
      roomDropdown.innerHTML = '<option value="">Memuat ruangan tanggung jawab Anda...</option>';
      noRoomsBox.style.display = 'none';

      try {
        const url = `?ajax_action=get_cleaner_rooms&user_id=${encodeURIComponent(selectedCleaner.userId)}&worker_name=${encodeURIComponent(selectedCleaner.name)}`;
        const res = await fetch(url);
        const data = await res.json();
        assignedRooms = data.rooms || [];

        document.getElementById('roomCountLabel').textContent = `${assignedRooms.length} Ruangan`;

        if (assignedRooms.length === 0) {
          roomDropdown.innerHTML = '<option value="">Belum ada ruangan yang ditugaskan untuk Anda</option>';
          progressBox.style.display = 'none';
          noRoomsBox.style.display = 'block';
          document.getElementById('uploadCard').style.display = 'none';
          return;
        }

        roomDropdown.disabled = false;

        let doneCount = 0;
        assignedRooms.forEach(r => {
          if (r.status === 'pending_review' || r.status === 'approved') doneCount++;
        });

        const totalCount = assignedRooms.length;
        const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
        document.getElementById('progressText').textContent = `${doneCount} / ${totalCount} Ruangan Selesai`;
        document.getElementById('progressBarFill').style.width = `${pct}%`;
        progressBox.style.display = 'block';

        roomDropdown.innerHTML = assignedRooms.map(r => {
          let statusLabel = '[Belum Upload]';
          if (r.status === 'pending_review' || r.status === 'approved') statusLabel = '[Sudah Upload]';
          else if (r.status === 'revision') statusLabel = '[Perlu Revisi]';
          return `<option value="${r.room_id}">${statusLabel} ${r.room_name}</option>`;
        }).join('');

        let targetRoom = null;
        if (preserveRoomId) {
          targetRoom = assignedRooms.find(r => Number(r.room_id) === Number(preserveRoomId));
        }
        if (!targetRoom) {
          targetRoom = assignedRooms.find(r => r.status !== 'pending_review' && r.status !== 'approved') || assignedRooms[0];
        }

        if (targetRoom) {
          roomDropdown.value = String(targetRoom.room_id);
          selectRoom(targetRoom.room_id);
        }
      } catch (err) {
        roomDropdown.innerHTML = '<option value="">Gagal memuat daftar ruangan</option>';
      }
    }

    function onRoomChange() {
      hideAlert();
      const roomId = document.getElementById('roomDropdown').value;
      if (roomId) selectRoom(roomId);
    }

    function renderRoomChips() {
      const container = document.getElementById('roomChipsContainer');
      container.innerHTML = assignedRooms.map(r => {
        const isDone = r.status === 'pending_review' || r.status === 'approved';
        const isRev = r.status === 'revision';
        const isActive = activeRoom && Number(activeRoom.room_id) === Number(r.room_id);
        let cls = 'room-chip';
        if (isDone) cls += ' done';
        else if (isRev) cls += ' revision';
        if (isActive) cls += ' active';

        const icon = isDone
          ? '<i class="ph-bold ph-check-circle"></i>'
          : isRev
          ? '<i class="ph-bold ph-warning-circle"></i>'
          : '<i class="ph-bold ph-clock"></i>';

        return `<button type="button" class="${cls}" onclick="quickSelectRoom(${r.room_id})">${icon}<span>${r.room_name}</span></button>`;
      }).join('');
    }

    function quickSelectRoom(roomId) {
      hideAlert();
      const roomDropdown = document.getElementById('roomDropdown');
      roomDropdown.value = String(roomId);
      selectRoom(roomId);
    }

    function resetPhotoInputs() {
      beforeBase64 = '';
      afterBase64 = '';
      revisionBase64 = '';
      document.getElementById('beforeInput').value = '';
      document.getElementById('afterInput').value = '';
      document.getElementById('revisionInput').value = '';

      document.getElementById('beforePlaceholder').style.display = 'block';
      document.getElementById('beforePreviewWrap').style.display = 'none';
      document.getElementById('beforeSlot').classList.remove('ready');

      document.getElementById('afterPlaceholder').style.display = 'block';
      document.getElementById('afterPreviewWrap').style.display = 'none';
      document.getElementById('afterSlot').classList.remove('ready');

      document.getElementById('revisionPlaceholder').style.display = 'block';
      document.getElementById('revisionPreviewWrap').style.display = 'none';
      document.getElementById('revisionSlot').classList.remove('ready');

      document.getElementById('cleaningNotes').value = '';
    }

    function selectRoom(roomId) {
      const room = assignedRooms.find(r => Number(r.room_id) === Number(roomId));
      if (!room) return;
      activeRoom = room;
      renderRoomChips();
      resetPhotoInputs();

      const card = document.getElementById('uploadCard');
      const title = document.getElementById('activeRoomTitle');
      const badge = document.getElementById('activeRoomBadge');
      const banner = document.getElementById('roomStatusBanner');
      const baSection = document.getElementById('beforeAfterSection');
      const revSection = document.getElementById('revisionSection');
      const btnSubmit = document.getElementById('btnSubmitBeforeAfter');

      card.style.display = 'block';
      title.textContent = room.room_name;

      if (room.status === 'approved' || room.status === 'pending_review') {
        badge.className = 'pastel-tag tag-green';
        badge.innerHTML = `<i class="ph-bold ph-check"></i> ${room.status === 'approved' ? 'Disetujui Supervisor' : 'Sudah Upload Hari Ini'}`;

        banner.className = 'notice-banner notice-done';
        banner.innerHTML = '<i class="ph-bold ph-check-circle" style="font-size:17px; flex-shrink:0; margin-top:2px;"></i><div><strong>Foto Before &amp; After untuk ruangan ini sudah diunggah hari ini.</strong> Anda tetap dapat mengunggah ulang foto baru di bawah jika ingin memperbarui.</div>';
        banner.style.display = 'flex';

        baSection.style.display = 'block';
        revSection.style.display = 'none';
        btnSubmit.innerHTML = '<i class="ph-bold ph-arrows-clockwise"></i><span>Perbarui Foto Before &amp; After</span>';
      } else if (room.status === 'revision') {
        badge.className = 'pastel-tag tag-red';
        badge.innerHTML = '<i class="ph-bold ph-warning-circle"></i> Perlu Revisi';

        banner.className = 'notice-banner notice-revision';
        banner.innerHTML = `<i class="ph-bold ph-warning" style="font-size:17px; flex-shrink:0; margin-top:2px;"></i><div><strong>Catatan Revisi Supervisor:</strong> "${room.checklist?.review_notes || 'Mohon dibersihkan kembali'}"</div>`;
        banner.style.display = 'flex';

        baSection.style.display = 'none';
        revSection.style.display = 'block';
      } else {
        badge.className = 'pastel-tag tag-yellow';
        badge.innerHTML = '<i class="ph-bold ph-clock"></i> Wajib Upload Hari Ini';

        banner.style.display = 'none';
        baSection.style.display = 'block';
        revSection.style.display = 'none';
        btnSubmit.innerHTML = '<i class="ph-bold ph-upload-simple"></i><span>Simpan Foto Before &amp; After</span>';
      }
    }

    async function submitBeforeAfter() {
      hideAlert();
      if (!activeRoom) return;
      if (!beforeBase64 || !afterBase64) {
        showAlert('Foto Before (Sebelum) dan Foto After (Sesudah) wajib diambil keduanya.', 'error');
        return;
      }

      const btn = document.getElementById('btnSubmitBeforeAfter');
      btn.disabled = true;
      btn.innerHTML = '<i class="ph-bold ph-spinner"></i><span>Mengunggah Foto Before &amp; After...</span>';

      try {
        const res = await fetch(window.location.pathname, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'submit_before_after',
            room_id: activeRoom.room_id,
            room_token: activeRoom.room_token || activeRoom.qr_code_token,
            worker_name: selectedCleaner.name,
            notes: document.getElementById('cleaningNotes').value.trim(),
            image_before_base64: beforeBase64,
            image_after_base64: afterBase64
          })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Gagal mengunggah foto.');

        const finishedRoomName = activeRoom.room_name;
        await loadCleanerRooms();
        showAlert(`Berhasil menyimpan foto Before & After untuk ${finishedRoomName}.`, 'success');
      } catch (err) {
        showAlert(err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    }

    async function submitRevision() {
      hideAlert();
      if (!activeRoom || !revisionBase64) {
        showAlert('Mohon ambil foto hasil perbaikan revisi terlebih dahulu.', 'error');
        return;
      }

      const btn = document.getElementById('btnSubmitRevision');
      btn.disabled = true;
      btn.innerHTML = '<i class="ph-bold ph-spinner"></i><span>Mengirim Foto Revisi...</span>';

      try {
        const res = await fetch(window.location.pathname, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'submit_revision',
            room_id: activeRoom.room_id,
            room_token: activeRoom.room_token || activeRoom.qr_code_token,
            worker_name: selectedCleaner.name,
            image_base64: revisionBase64
          })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Gagal mengirim revisi.');

        await loadCleanerRooms();
        showAlert('Foto perbaikan revisi berhasil dikirim.', 'success');
      } catch (err) {
        showAlert(err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="ph-bold ph-paper-plane-tilt"></i><span>Kirim Foto Perbaikan Revisi</span>';
      }
    }

    // ── KOMPLAIN PELAPOR ─────────────────────────────────────────────────────
    async function loadComplaintsCountOnly() {
      try {
        const res = await fetch('?ajax_action=get_complaints');
        const data = await res.json();
        const list = data.reports || data.complaints || [];
        const pill = document.getElementById('complaintCountPill');
        if (list.length > 0) {
          pill.textContent = list.length;
          pill.style.display = 'inline-flex';
        } else {
          pill.style.display = 'none';
        }
      } catch (e) {}
    }

    async function loadComplaints() {
      const container = document.getElementById('complaintsListContainer');
      container.innerHTML = '<div style="text-align:center; padding:24px 0; color:var(--text-muted); font-size:13px;">Memuat daftar komplain...</div>';
      try {
        const res = await fetch('?ajax_action=get_complaints');
        const data = await res.json();
        const list = data.reports || data.complaints || [];
        const pill = document.getElementById('complaintCountPill');
        if (list.length > 0) {
          pill.textContent = list.length;
          pill.style.display = 'inline-flex';
        } else {
          pill.style.display = 'none';
          container.innerHTML = `
            <div class="empty-bento" style="margin-top:0;">
              <div class="empty-icon"><i class="ph-bold ph-check-circle"></i></div>
              <div style="font-size:13.5px; font-weight:700; color:var(--text-primary);">Tidak Ada Komplain Aktif</div>
              <p style="font-size:12.5px; color:var(--text-muted); margin-top:4px;">Seluruh laporan keluhan fasilitas sudah ditangani dengan baik.</p>
            </div>`;
          return;
        }

        container.innerHTML = list.map(item => `
          <div class="complaint-card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <span class="pastel-tag tag-red">${item.room_name || 'Laporan Umum'}</span>
              <span style="font-family:var(--font-mono); font-size:11px; color:var(--text-muted);">Pelapor: ${item.reporter_name || 'Anonim'}</span>
            </div>
            <div style="font-size:13.5px; color:var(--text-primary); font-weight:500; margin-bottom:12px;">
              "${item.issue_description || ''}"
            </div>
            <input type="file" id="resFile_${item.id}" accept="image/*" capture="environment" style="display:none;" onchange="onSelectResolvePhoto(event, ${item.id})" />
            <div class="upload-slot" id="resSlot_${item.id}" onclick="document.getElementById('resFile_${item.id}').click()" style="padding:12px; margin-bottom:10px;">
              <div id="resPlaceholder_${item.id}" style="font-size:12px; font-weight:600; color:var(--text-primary); display:flex; align-items:center; justify-content:center; gap:6px;">
                <i class="ph-bold ph-camera"></i> Ambil Foto Bukti Penanganan
              </div>
              <div id="resPreviewWrap_${item.id}" style="display:none;">
                <img id="resPreviewImg_${item.id}" src="" style="height:130px;" />
              </div>
            </div>
            <button type="button" class="btn-primary" id="btnResolve_${item.id}" onclick="submitResolveComplaint(${item.id})">
              <i class="ph-bold ph-check"></i>
              <span>Tandai Selesai Ditangani</span>
            </button>
          </div>
        `).join('');
      } catch (err) {
        container.innerHTML = '<div style="text-align:center; padding:20px; color:var(--pastel-red-text);">Gagal memuat komplain.</div>';
      }
    }

    async function onSelectResolvePhoto(event, reportId) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      const b64 = await compressImageFile(file);
      resolvePhotosMap[reportId] = b64;
      document.getElementById(`resPreviewImg_${reportId}`).src = b64;
      document.getElementById(`resPlaceholder_${reportId}`).style.display = 'none';
      document.getElementById(`resPreviewWrap_${reportId}`).style.display = 'block';
      document.getElementById(`resSlot_${reportId}`).classList.add('ready');
    }

    async function submitResolveComplaint(reportId) {
      if (!selectedCleaner.name) {
        showAlert('Pilih Nama Anda pada tab Checklist Ruangan terlebih dahulu.', 'error');
        return;
      }
      const b64 = resolvePhotosMap[reportId];
      if (!b64) {
        showAlert('Mohon ambil foto bukti penanganan komplain terlebih dahulu.', 'error');
        return;
      }
      const btn = document.getElementById(`btnResolve_${reportId}`);
      btn.disabled = true;
      btn.innerHTML = '<span>Mengirim...</span>';
      try {
        const res = await fetch(window.location.pathname, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'resolve_report',
            report_id: reportId,
            worker_name: selectedCleaner.name,
            image_base64: b64
          })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Gagal menyelesaikan komplain.');
        showAlert('Komplain berhasil diselesaikan.', 'success');
        await loadComplaints();
      } catch (err) {
        showAlert(err.message, 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="ph-bold ph-check"></i><span>Tandai Selesai Ditangani</span>';
      }
    }

    initCleanerPortal();
  </script>
</body>
</html>
