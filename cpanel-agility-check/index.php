<?php
require_once __DIR__ . '/config.php';

// Ambil soal aktif secara real-time dari Supabase via Next.js API (tanpa kunci jawaban)
$apiResp = callNextJsApi('GET');
$questions = $apiResp['data'] ?? [];

if (empty($questions)) {
    die("
    <div style='font-family: Segoe UI, Tahoma, sans-serif; text-align: center; margin-top: 80px;'>
        <h3 style='color: #dc2626;'>Gagal Memuat Soal Agility Check</h3>
        <p style='color: #64748b; font-size: 15px;'>Tidak dapat terhubung ke server sekolah atau belum ada soal aktif yang tersedia.</p>
        <button onclick='location.reload()' style='margin-top: 10px; padding: 10px 22px; background: #d97706; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;'>Muat Ulang Halaman</button>
    </div>
    ");
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/png" sizes="16x16" href="../assets/images/favicon.png">
  <title>CCS Agility Check</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    body {
      padding-top: 76px;
      background-color: #f8fafc;
    }
    .header-fixed {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      z-index: 1050;
      background-color: #fff;
      padding: 10px 0;
      box-shadow: 0 2px 6px rgba(0,0,0,0.08);
    }
    .header-fixed img {
      width: 44px;
      height: auto;
    }
    .question-card {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03);
    }
    .option-label {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 14px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s ease;
      background: #fff;
      margin-bottom: 8px;
    }
    .option-label:last-child {
      margin-bottom: 0;
    }
    .option-label:hover {
      background-color: #fffbeb;
      border-color: #f59e0b;
    }
    .option-label input[type="radio"] {
      margin-top: 4px;
      flex-shrink: 0;
    }
    .option-label.selected {
      background-color: #fef3c7;
      border-color: #d97706;
      font-weight: 500;
    }
    @media (max-width: 768px) {
      body { padding-top: 64px; }
      .header-fixed img { width: 34px; }
      .header-fixed h3 { font-size: 1.15rem; }
    }
  </style>
</head>
<body>

<div class="header-fixed">
  <h3 class="text-center d-flex justify-content-center align-items-center gap-3 mb-0 fs-4 fw-bold">
    <img src="../assets/images/logo-cccs.png" alt="CCS Logo">
    <span>CCS Agility Check</span>
  </h3>
</div>

<div class="container my-4" style="max-width: 860px;">
  <div class="alert alert-light border mb-4" role="alert" style="font-size: 14px;">
    <strong>Petunjuk Pengisian:</strong> Pilihlah <strong>satu jawaban terbaik (A, B, C, atau D)</strong> yang paling mencerminkan langkah atau respons Anda pada setiap situasi berikut.
  </div>

  <form id="agilityForm" action="submit.php" method="post">
    <!-- Informasi Peserta -->
    <div class="card question-card mb-4">
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-4">
            <label for="nama" class="form-label fw-semibold">Full Name</label>
            <input type="text" name="nama" id="nama" class="form-control" required placeholder="Nama lengkap Anda">
          </div>
          <div class="col-md-4">
            <label for="posisi" class="form-label fw-semibold">Position Applied for</label>
            <input type="text" name="posisi" id="posisi" class="form-control" required placeholder="Posisi yang dilamar">
          </div>
          <div class="col-md-4">
            <label for="tanggal" class="form-label fw-semibold">Test Date</label>
            <input type="date" name="tanggal" id="tanggal" class="form-control" required>
          </div>
        </div>
      </div>
    </div>

    <!-- Daftar Soal -->
    <?php foreach ($questions as $q): ?>
      <?php
        $qid = (int) $q['id'];
        $qno = (int) $q['question_no'];
        $options = [
          'A' => $q['option_a'] ?? '',
          'B' => $q['option_b'] ?? '',
          'C' => $q['option_c'] ?? '',
          'D' => $q['option_d'] ?? ''
        ];
      ?>
      <div class="card question-card mb-3" data-question-no="<?= $qno ?>" data-question-id="<?= $qid ?>">
        <div class="card-body">
          <div class="fw-bold mb-3" style="font-size: 15px; color: #0f172a; line-height: 1.5;">
            <?= $qno ?>. <?= nl2br(htmlspecialchars($q['question_text'] ?? '')) ?>
          </div>

          <div class="options-group">
            <?php foreach ($options as $letter => $optText): ?>
              <label class="option-label">
                <input
                  type="radio"
                  name="answers[<?= $qid ?>]"
                  value="<?= $letter ?>"
                  class="agility-radio"
                  data-qno="<?= $qno ?>"
                  data-qid="<?= $qid ?>"
                >
                <span><strong><?= $letter ?>.</strong> <?= htmlspecialchars($optText) ?></span>
              </label>
            <?php endforeach; ?>
          </div>
        </div>
      </div>
    <?php endforeach; ?>

    <div class="text-center my-4">
      <button type="submit" id="btnSubmit" class="btn btn-warning text-white px-5 py-2 fw-bold" style="background-color: #d97706; border-color: #d97706;">
        Submit Jawaban
      </button>
    </div>
  </form>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
  const today = new Date().toISOString().split('T')[0];
  const tglInput = document.getElementById('tanggal');
  if (tglInput && !tglInput.value) {
    tglInput.value = today;
  }
});

document.querySelectorAll('.agility-radio').forEach(radio => {
  radio.addEventListener('change', function() {
    const qid = this.dataset.qid;
    document.querySelectorAll(`.agility-radio[data-qid="${qid}"]`).forEach(r => {
      r.closest('.option-label')?.classList.remove('selected');
    });
    if (this.checked) {
      this.closest('.option-label')?.classList.add('selected');
    }
  });
});

document.getElementById('agilityForm').addEventListener('submit', function(e) {
  const nama = document.getElementById('nama').value.trim();
  const posisi = document.getElementById('posisi').value.trim();
  const tanggal = document.getElementById('tanggal').value.trim();

  if (!nama || !posisi || !tanggal) {
    e.preventDefault();
    alert('Full Name, Position Applied for, dan Test Date wajib diisi.');
    return;
  }

  const cards = [...document.querySelectorAll('.question-card[data-question-id]')];
  const unanswered = [];

  cards.forEach(card => {
    const qid = card.dataset.questionId;
    const qno = card.dataset.questionNo;
    const checked = card.querySelector(`.agility-radio[data-qid="${qid}"]:checked`);
    if (!checked) {
      unanswered.push(qno);
    }
  });

  if (unanswered.length > 0) {
    e.preventDefault();
    alert(`Masih ada ${unanswered.length} nomor soal yang belum dipilih jawabannya: No. ${unanswered.join(', ')}`);
    const firstMissing = document.querySelector(`.question-card[data-question-no="${unanswered[0]}"]`);
    firstMissing?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const btn = document.getElementById('btnSubmit');
  if (btn) {
    btn.disabled = true;
    btn.innerText = 'Mengirim Jawaban...';
  }
});
</script>

</body>
</html>
