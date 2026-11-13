<?php
require_once __DIR__ . '/config.php';
error_reporting(E_ALL);
ini_set('display_errors', 0);
date_default_timezone_set('Asia/Jakarta');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: index.php');
    exit;
}

$nama = trim($_POST['nama'] ?? '');
$posisi = trim($_POST['posisi'] ?? '');
$tanggal = trim($_POST['tanggal'] ?? date('Y-m-d'));
$answers = $_POST['answers'] ?? [];

if (empty($nama) || empty($posisi) || empty($tanggal)) {
    die("
    <div style='font-family: Arial, sans-serif; text-align: center; margin-top: 50px;'>
        <h3 style='color: #e74c3c;'>Error: Data Tidak Lengkap</h3>
        <p>Full Name, Position Applied for, dan Test Date wajib diisi.</p>
        <button onclick='history.back()' style='padding: 10px 20px; background: #d97706; color: #fff; border: none; border-radius: 6px; cursor: pointer;'>Kembali ke Form</button>
    </div>
    ");
}

$payload = [
    'nama'    => $nama,
    'posisi'  => $posisi,
    'tanggal' => $tanggal,
    'answers' => $answers
];

$response = callNextJsApi('POST', [], $payload);
?>
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/png" sizes="16x16" href="../assets/images/favicon.png">
  <title>Hasil Pengiriman - CCS Agility Check</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f6f8fa;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
    }
    .card {
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.08);
      padding: 40px;
      text-align: center;
      max-width: 500px;
      width: 100%;
      border: 1px solid #e1e4e8;
    }
    .icon-box {
      font-size: 52px;
      line-height: 1;
      margin-bottom: 16px;
    }
    .info-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px;
      margin: 20px 0;
      text-align: left;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px dashed #e2e8f0;
      font-size: 14px;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      color: #64748b;
      font-weight: 500;
    }
    .info-val {
      color: #0f172a;
      font-weight: 600;
    }
    .note {
      font-size: 13px;
      color: #94a3b8;
      margin-top: 15px;
    }
  </style>
</head>
<body>

  <div class="card">
    <?php if (!empty($response['success'])): ?>
      <div class="icon-box">✅</div>
      <h3 class="fw-bold">Jawaban Berhasil Disimpan!</h3>
      <p class="text-secondary" style="font-size: 14px;">Terima kasih telah menyelesaikan CCS Agility Check. Jawaban Anda telah tersimpan dan akan dievaluasi oleh tim HR.</p>

      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Full Name</span>
          <span class="info-val"><?= htmlspecialchars($nama) ?></span>
        </div>
        <div class="info-row">
          <span class="info-label">Position</span>
          <span class="info-val"><?= htmlspecialchars($posisi) ?></span>
        </div>
        <div class="info-row">
          <span class="info-label">Test Date</span>
          <span class="info-val"><?= htmlspecialchars($tanggal) ?></span>
        </div>
        <div class="info-row">
          <span class="info-label">Status</span>
          <span class="info-val text-success">Tersimpan</span>
        </div>
      </div>

      <div class="note">Anda dapat menutup jendela atau tab peramban ini.</div>

    <?php else: ?>
      <div class="icon-box">❌</div>
      <h3 class="fw-bold text-danger">Gagal Menyimpan Jawaban</h3>
      <p class="text-secondary" style="font-size: 14px;">
        <?= htmlspecialchars($response['message'] ?? 'Terjadi kendala saat menghubungi server sekolah.') ?>
      </p>

      <button type="button" onclick="history.back()" class="btn btn-danger mt-3 px-4 fw-semibold">
        Kembali &amp; Coba Lagi
      </button>

      <div class="note">Data yang telah Anda isi tidak akan hilang saat menekan tombol di atas.</div>
    <?php endif; ?>
  </div>

</body>
</html>
