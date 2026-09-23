<?php
require_once __DIR__ . '/config.php';

// Ambil pertanyaan secara tersentralisasi dan real-time dari Supabase via Next.js API
$apiResp = callNextJsApi('GET');
$data = $apiResp['data'] ?? [];

if (empty($data)) {
    die("
    <div style='font-family: Segoe UI, Tahoma, sans-serif; text-align: center; margin-top: 80px;'>
        <h3 style='color: #dc2626;'>Gagal Memuat Soal</h3>
        <p style='color: #64748b; font-size: 15px;'>Tidak dapat terhubung ke server sekolah untuk mengambil daftar pertanyaan tes.</p>
        <button onclick='location.reload()' style='margin-top: 10px; padding: 10px 22px; background: #2563eb; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;'>Muat Ulang Halaman</button>
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
  <title>CCS Psychological Test</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    .table td {
      vertical-align: middle;
    }
    .radio-col {
      width: 120px;
      text-align: center;
    }
    
    h3 img {
      width: 100px;
      height: auto;
    }
    
    .header-fixed {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      z-index: 1050;
      background-color: #fff;
      padding: 8px 0;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
    }
    
    .icon-radio {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;         
    }

    .icon-text {
      display: inline-block;
      width: 24px;         
      text-align: center;
      font-family: "Courier New", monospace;
      font-weight: bold;
      font-size: 1.1rem;
      color: #000;
      line-height: 1;      
      white-space: nowrap; 
    }

    body {
      padding-top: 70px; /* default untuk desktop */
    }
    
    @media (max-width: 768px) {
      body {
        padding-top: 55px; /* lebih kecil di tablet */
      }

      .header-fixed img {
        width: 35px;
      }

      .header-fixed {
        padding: 5px 0;
      }
    }

    @media (max-width: 480px) {
      body {
        padding-top: 45px; /* lebih kecil di HP */
      }

      .header-fixed img {
        width: 30px;
      }

      .header-fixed h3 {
        font-size: 1.1rem;
      }
    }
  </style>
</head>
<body class="bg-light">

<div class="container my-5">
  <h3 class="header-fixed text-center d-flex justify-content-center align-items-center gap-3 mb-0">
    <img src="../assets/images/logo-cccs.png" alt="CCS Logo" width="50" height="50" class="me-2">
    CCS Psychological Test
  </h3>

  <form id="tesForm" action="submit.php" method="post">
    <!-- ===== Informasi Diri ===== -->
    <div class="card mb-4">
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-4">
            <label for="nama" class="form-label">Full Name</label>
            <input type="text" name="nama" id="nama" class="form-control" required>
          </div>
          <div class="col-md-4">
            <label for="posisi" class="form-label">Position Applied for</label>
            <input type="text" name="posisi" id="posisi" class="form-control" required>
          </div>
          <div class="col-md-4">
            <label for="tanggal" class="form-label">Test Date</label>
            <input type="date" name="tanggal" id="tanggal" class="form-control" required>
          </div>
        </div>
      </div>
    </div>
    
    <?php foreach ($data as $no => $items): ?>
      <div class="card mb-4">
        <div class="card-header fw-bold">
          No <?= htmlspecialchars($no) ?>
        </div>
        <div class="card-body p-0">
          <table class="table table-bordered mb-0">
            <thead class="table-secondary">
              <tr>
                <th>Indicator<br><i>Indikator</i></th>
                <th class="radio-col">Most like me<br><i>Paling Mirip Saya</i></th>
                <th class="radio-col">Least like me<br><i>Paling Tidak Mirip Saya</i></th>
              </tr>
            </thead>
            <tbody>
              <?php foreach ($items as $index => $item): ?>
              <tr>
                <?php
                $lines = explode("\n", $item['text']);
                ?>
                <td>
                  <?= htmlspecialchars($lines[0]) ?><br>
                  <i><?= htmlspecialchars($lines[1] ?? '') ?></i>
                </td>
                <td>
                  <div class="icon-radio">
                    <span class="icon-text"><?= htmlspecialchars($item['p_icon']) ?></span>
                    <input type="radio"
                           name="p[<?= $no ?>]"
                           value="<?= $index ?>"
                           class="radio-p"
                           data-group="<?= $no ?>"
                           data-index="<?= $index ?>"
                    >
                  </div>
                </td>
                <td>
                  <div class="icon-radio">
                    <span class="icon-text"><?= htmlspecialchars($item['k_icon']) ?></span>
                    <input type="radio"
                           name="k[<?= $no ?>]"
                           value="<?= $index ?>"
                           class="radio-k"
                           data-group="<?= $no ?>"
                           data-index="<?= $index ?>"
                    >
                  </div>
                </td>
              </tr>
              <?php endforeach; ?>
            </tbody>
          </table>
        </div>
      </div>
    <?php endforeach; ?>

    <div class="text-center">
      <button type="submit" id="btnSubmit" class="btn btn-primary px-5 py-2 fw-bold">Submit Jawaban</button>
    </div>
  </form>
</div>

<script>
// Isi otomatis tanggal hari ini
document.addEventListener('DOMContentLoaded', function() {
  const today = new Date().toISOString().split('T')[0];
  const tglInput = document.getElementById('tanggal');
  if (tglInput && !tglInput.value) {
    tglInput.value = today;
  }
});

document.querySelectorAll('input[type="date"]').forEach(input => {
  input.addEventListener('click', function (e) {
    this.showPicker?.();
  });
});

// ===== Validasi agar P dan K tidak boleh sama dalam satu baris pertanyaan =====
document.querySelectorAll('.radio-p').forEach(radio => {
  radio.addEventListener('change', function() {
    const group = this.dataset.group;
    const index = this.dataset.index;
    const kOption = document.querySelector(`.radio-k[data-group="${group}"][data-index="${index}"]`);
    if (this.checked && kOption && kOption.checked) {
      kOption.checked = false; // batalkan pilihan K jika baris sama
    }
  });
});

document.querySelectorAll('.radio-k').forEach(radio => {
  radio.addEventListener('change', function() {
    const group = this.dataset.group;
    const index = this.dataset.index;
    const pOption = document.querySelector(`.radio-p[data-group="${group}"][data-index="${index}"]`);
    if (this.checked && pOption && pOption.checked) {
      pOption.checked = false; // batalkan pilihan P jika baris sama
    }
  });
});

// ===== Validasi sebelum submit =====
document.getElementById('tesForm').addEventListener('submit', function(e) {
  let valid = true;
  const groups = [...new Set([...document.querySelectorAll('.radio-p')].map(r => r.dataset.group))];
  
  // Validasi identitas
  const nama = document.getElementById('nama').value.trim();
  const posisi = document.getElementById('posisi').value.trim();
  const tanggal = document.getElementById('tanggal').value.trim();

  if (!nama || !posisi || !tanggal) {
    alert('Name, Position & Date must be filled');
    valid = false;
  }

  let incomplete = [];

  groups.forEach(group => {
    const pChecked = document.querySelector(`.radio-p[data-group="${group}"]:checked`);
    const kChecked = document.querySelector(`.radio-k[data-group="${group}"]:checked`);
    if (!pChecked || !kChecked) {
      incomplete.push(group);
    } else if (pChecked.value === kChecked.value) {
      alert(`Nomor ${group}: Pilihan P dan K tidak boleh sama!`);
      valid = false;
    }
  });

  if (incomplete.length > 0 && valid) {
    alert(`Ada ${incomplete.length} nomor yang belum diisi lengkap (wajib isi Most dan Least): ${incomplete.join(', ')}`);
    valid = false;
  }

  if (!valid) {
    e.preventDefault();
  } else {
    const btn = document.getElementById('btnSubmit');
    if (btn) {
      btn.disabled = true;
      btn.innerText = 'Mengirim Jawaban...';
    }
  }
});
</script>

</body>
</html>
