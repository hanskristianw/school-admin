<?php
/**
 * ==============================================================================
 * SISTEM PENDAFTARAN SISWA BARU (PPDB / ADMISSIONS) CCS
 * CHUNG CHUNG CHRISTIAN SCHOOL — IB WORLD SCHOOL
 * Yayasan Pendidikan Mayapada School
 * ==============================================================================
 * Standalone PHP 7.4 - 8.3 Application
 * Template & Styling: Authentic Chung Chung Christian School (ccs.sch.id)
 * 1:1 Identik dengan Sistem Sewa Lapangan & Website Utama CCS
 * Multi-Language: English | Bahasa Indonesia | 中文
 * ==============================================================================
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

define('CCS_REG_LOADED', true);

// ─── PENGALIHAN OTOMATIS: JIKA AKSES CEK STATUS, REDIRECT KE status.php ──────
if (isset($_GET['cek'])) {
    header('Location: status.php?' . http_build_query($_GET));
    exit;
}

// ─── 0. SISTEM MULTI-BAHASA (INDONESIA, ENGLISH, CHINESE) ───────────────────
if (isset($_GET['lang'])) {
    $reqLang = strtolower($_GET['lang']);
    if (in_array($reqLang, ['id', 'en', 'cn', 'zh'])) {
        $_SESSION['ccs_lang'] = ($reqLang === 'zh') ? 'cn' : $reqLang;
    }
}
$currLang = $_SESSION['ccs_lang'] ?? 'id';
if (!in_array($currLang, ['id', 'en', 'cn'])) {
    $currLang = 'id';
}

$i18n = [
    'id' => [
        'page_title' => 'Pendaftaran Siswa Baru (PPDB) — Chung Chung Christian School',
        'nav_home' => 'Home',
        'nav_admission' => 'Pendaftaran Siswa Baru',
        'nav_check_status' => 'Cek Status Pendaftaran',
        'banner_already_registered' => 'Sudah pernah mendaftar?',
        'banner_check_link' => 'Cek Status Pendaftaran & Unggah Bukti Bayar di Sini',

        // Form Section
        'form_title' => 'Formulir Pendaftaran Siswa Baru',
        'form_subtitle' => 'Silakan lengkapi 4 data awal di bawah ini untuk mendapatkan Nomor Registrasi resmi dan rincian rekening formulir.',
        'step1_title' => 'Pilihan Jenjang Pendidikan',
        'lbl_level' => 'Jenjang Pendidikan',
        'ph_level' => '-- Pilih Jenjang Pendidikan --',
        'step2_title' => 'Data Calon Siswa',
        'lbl_student_name' => 'Nama Lengkap Calon Siswa',
        'hint_student_name' => 'Tuliskan nama lengkap calon siswa sesuai dokumen akta kelahiran.',
        'step3_title' => 'Data Kontak Orang Tua / Wali',
        'lbl_parent_email' => 'Alamat Email Orang Tua / Pendaftar',
        'hint_parent_email' => 'Rincian tagihan formulir dan link akses status pendaftaran dikirimkan ke email ini.',
        'lbl_parent_phone' => 'Nomor WhatsApp / HP Aktif',
        'hint_parent_phone' => 'Digunakan untuk verifikasi cek status dan pengunggahan bukti transfer.',
        'step4_title' => 'Ketentuan & Prosedur Pendaftaran',
        'rules_header' => 'Ketentuan Pendaftaran Siswa Baru CCS:',
        'rules' => [
            'Jadwal observasi, wawancara orang tua, dan tes penempatan akan dikonfirmasikan oleh pihak sekolah via Email resmi dan WhatsApp.',
            'Segala bentuk konfirmasi resmi administrasi hanya dilakukan melalui kanal resmi Chung Chung Christian School.'
        ],
        'agree_rules' => 'Saya telah membaca dan menyetujui seluruh <strong>Ketentuan Pendaftaran Siswa Baru</strong> di atas, serta memastikan data yang diisi adalah benar dan sah.',
        'submit_email_note' => 'Instruksi pembayaran biaya formulir beserta nomor rekening Bank Mayapada akan otomatis dikirimkan ke alamat email Anda setelah pendaftaran diajukan.',
        'btn_submit' => 'Ajukan Pendaftaran Siswa Baru',

        // Notifikasi Sukses
        'success_reg_badge' => 'Pendaftaran Berhasil Diajukan!',
        'success_reg_title' => 'Nomor Registrasi PPDB Anda',
        'success_reg_hint' => 'Simpan nomor registrasi ini. Rincian tagihan formulir dan rekening resmi Bank Mayapada telah dikirimkan ke email Anda. Silakan cek kotak masuk email Anda.',
        'lbl_code' => 'Nomor Registrasi',
        'lbl_student' => 'Calon Siswa',
        'lbl_level_selected' => 'Jenjang',
        'lbl_form_fee' => 'Total Biaya Formulir',
        'success_reg_email_note' => 'Rincian biaya formulir & instruksi transfer Bank Mayapada telah dikirimkan ke email Anda.',
        'btn_check_this' => 'Cek Status & Unggah Bukti Bayar',
        'btn_register_another' => 'Daftarkan Siswa Lainnya',

        // Modal Error
        'modal_error_title' => 'Periksa Kembali Formulir Anda',
        'modal_error_desc' => 'Terdapat beberapa data wajib yang belum diisi atau belum sesuai. Mohon lengkapi bagian berikut:',
        'modal_error_btn' => 'Lengkapi Formulir Sekarang',

        // Floating WhatsApp
        'wa_title' => 'Hubungi Admissions via WhatsApp',
        'wa_text' => 'Halo Admin Admissions CCS, saya ingin bertanya mengenai pendaftaran siswa baru.'
    ],

    'en' => [
        'page_title' => 'New Student Admission (Admissions) — Chung Chung Christian School',
        'nav_home' => 'Home',
        'nav_admission' => 'New Student Admission',
        'nav_check_status' => 'Check Admission Status',
        'banner_already_registered' => 'Already registered?',
        'banner_check_link' => 'Check Admission Status & Upload Payment Proof Here',

        // Form Section
        'form_title' => 'New Student Registration Form',
        'form_subtitle' => 'Please complete the initial details below to receive your official Registration Code and payment account information.',
        'step1_title' => 'Target Educational Program',
        'lbl_level' => 'Educational Program',
        'ph_level' => '-- Select Educational Program --',
        'step2_title' => 'Student Candidate Details',
        'lbl_student_name' => 'Student Candidate Full Name',
        'hint_student_name' => 'Please write the student candidate\'s full legal name as in birth certificate or passport.',
        'step3_title' => 'Parent / Guardian Contact Details',
        'lbl_parent_email' => 'Parent / Guardian Email Address',
        'hint_parent_email' => 'Payment invoice details and status access links will be delivered to this email.',
        'lbl_parent_phone' => 'Active WhatsApp Number',
        'hint_parent_phone' => 'Used for verification when checking status and uploading payment receipts.',
        'step4_title' => 'Admission Terms & Regulations',
        'rules_header' => 'CCS Admission Regulations:',
        'rules' => [
            'Observation, parent interview, and placement test schedules will be officially confirmed via Email and WhatsApp.',
            'All official administrative communications are strictly conducted through official Chung Chung Christian School channels.'
        ],
        'agree_rules' => 'I have read and agree to all the <strong>Admission Terms & Regulations</strong> above and confirm that the submitted information is true and accurate.',
        'submit_email_note' => 'Payment instructions and official Bank Mayapada account details will be sent automatically to your registered email upon submission.',
        'btn_submit' => 'Submit New Student Registration',

        // Success Notification
        'success_reg_badge' => 'Registration Submitted Successfully!',
        'success_reg_title' => 'Your Official Registration Number',
        'success_reg_hint' => 'Please save this registration number. Form fee invoice and Bank Mayapada account details have been sent to your email. Please check your inbox.',
        'lbl_code' => 'Registration No.',
        'lbl_student' => 'Student Candidate',
        'lbl_level_selected' => 'Target Program',
        'lbl_form_fee' => 'Total Form Fee',
        'success_reg_email_note' => 'Form fee details and Bank Mayapada transfer instructions have been sent to your email.',
        'btn_check_this' => 'Check Status & Upload Payment Proof',
        'btn_register_another' => 'Register Another Student',

        // Modal Error
        'modal_error_title' => 'Please Review Your Form',
        'modal_error_desc' => 'Some required fields are missing or invalid. Please correct the highlighted items below:',
        'modal_error_btn' => 'Complete Form Now',

        // Floating WhatsApp
        'wa_title' => 'Contact Admissions on WhatsApp',
        'wa_text' => 'Hello CCS Admissions, I would like to inquire regarding new student admissions.'
    ],

    'cn' => [
        'page_title' => '新生入学报名系统 (招生) — 崇崇基督教学校 (CCS)',
        'nav_home' => '首页',
        'nav_admission' => '新生招生报名',
        'nav_check_status' => '查询报名状态',
        'banner_already_registered' => '已经提交报名？',
        'banner_check_link' => '在此查询报名状态并上传缴费凭证',

        // Form Section
        'form_title' => '新生入学报名申请表',
        'form_subtitle' => '请填写以下初步报名信息，系统将自动生成官方报名编号及缴费银行账号。',
        'step1_title' => '选择拟报读学段',
        'lbl_level' => '入学学段',
        'ph_level' => '-- 请选择入学学段 --',
        'step2_title' => '学生基本信息',
        'lbl_student_name' => '学生全名',
        'hint_student_name' => '请严格按照出生公证书或护照上的全名填写。',
        'step3_title' => '家长 / 监护人联系方式',
        'lbl_parent_email' => '家长电子邮箱地址',
        'hint_parent_email' => '报名费账单明细及状态查询链接将发送至此邮箱。',
        'lbl_parent_phone' => 'WhatsApp 手机号码',
        'hint_parent_phone' => '用于查询状态验证及上传付款凭证。',
        'step4_title' => '招生须知与规章条例',
        'rules_header' => '崇崇基督教学校招生须知：',
        'rules' => [
            '入学观察评估、家长面谈及分班测试的具体时间将通过官方电子邮件及 WhatsApp 进行确认。',
            '所有官方行政信息均仅通过崇崇基督教学校官方渠道正式发布。'
        ],
        'agree_rules' => '我已阅读并完全同意上述所有<strong>招生规章条例</strong>，并确认所填写的信息均真实有效。',
        'submit_email_note' => '提交报名后，报名表付款说明及官方 Bank Mayapada 银行账号将自动发送至您填写的电子邮箱。',
        'btn_submit' => '提交新生入学申请',

        // Success Notification
        'success_reg_badge' => '初步报名提交成功！',
        'success_reg_title' => '您的官方报名编号',
        'success_reg_hint' => '请妥善保存此报名编号。付款说明及官方 Bank Mayapada 银行账号已发送至您的电子邮箱，请查收。',
        'lbl_code' => '报名编号',
        'lbl_student' => '报名学生',
        'lbl_level_selected' => '报读学段',
        'lbl_form_fee' => '报名表费用金额',
        'success_reg_email_note' => '报名费明细及 Bank Mayapada 银行转账指引已发送至您的电子邮箱。',
        'btn_check_this' => '查询状态并上传付款凭证',
        'btn_register_another' => '登记其他新生',

        // Modal Error
        'modal_error_title' => '请检查并完善表单内容',
        'modal_error_desc' => '有几项必填信息尚未填写或不符合要求，请补充完善：',
        'modal_error_btn' => '立即完善表单',

        // Floating WhatsApp
        'wa_title' => '通过 WhatsApp 联系招生处',
        'wa_text' => '您好 CCS 招生老师，我想咨询新生入学报名的相关事宜。'
    ]
];

$L = $i18n[$currLang] ?? $i18n['id'];

// ─── 1. KONFIGURASI SISTEM & KREDENSIAL ──────────────────────────────────────
if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
}

if (!defined('API_SECRET_TOKEN')) define('API_SECRET_TOKEN', 'GANTI_DENGAN_TOKEN_RAHASIA_ANDA');
if (!defined('NEXTJS_API_URL'))   define('NEXTJS_API_URL', 'https://www.manageccs.online/api/public/admission');
if (!defined('HOSTING_URL'))      define('HOSTING_URL', 'https://ccs.sch.id/registrasi');
if (!defined('ORG_NAME'))         define('ORG_NAME', 'Yayasan Pendidikan Mayapada School');
if (!defined('BANK_NAME'))        define('BANK_NAME', 'Bank Mayapada');
if (!defined('BANK_REK'))         define('BANK_REK', '100-3000-3853');
if (!defined('BANK_AN'))          define('BANK_AN', 'Yayasan Pendidikan Mayapada School');
if (!defined('CONTACT_PERSON'))   define('CONTACT_PERSON', '+62 859-5986-0430');
if (!defined('CONTACT_EMAIL'))    define('CONTACT_EMAIL', 'admissions@ccs.sch.id');
if (!defined('DEFAULT_FORM_FEE')) define('DEFAULT_FORM_FEE', 250000);

if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// ─── 2. DIREKTORI FOTO BUKTI TRANSFER PADA SISI HOSTING (TERKUNCI) ───────────
$uploadDir = __DIR__ . '/uploads';
if (!is_dir($uploadDir)) {
    @mkdir($uploadDir, 0755, true);
}
@file_put_contents($uploadDir . '/.htaccess', "Options -Indexes\nOrder Deny,Allow\nDeny from all\n<IfModule mod_authz_core.c>\nRequire all denied\n</IfModule>\n<FilesMatch \"\\.(php|phtml|php5|pl|py|cgi|sh)$\">\nRequire all denied\n</FilesMatch>\n");
@file_put_contents($uploadDir . '/index.html', '<!DOCTYPE html><html><head><title>403 Forbidden</title></head><body><h1>Directory access is forbidden.</h1></body></html>');

// ─── 3. HELPER API KONEKSI KE SUPABASE / NEXT.JS ─────────────────────────────
function callNextJsApi($method = 'GET', $queryParams = [], $postData = null) {
    $url = NEXTJS_API_URL;
    if (!empty($queryParams)) {
        $url .= (strpos($url, '?') === false ? '?' : '&') . http_build_query($queryParams);
    }

    $headers = [
        'Content-Type: application/json',
        'Authorization: Bearer ' . API_SECRET_TOKEN,
        'User-Agent: CCS-Admission-PHPClient/2.0'
    ];

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 8);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            return ['success' => false, 'message' => 'Koneksi ke server sekolah gagal: ' . $error];
        }

        $json = json_decode($response, true);
        if ($httpCode >= 200 && $httpCode < 300) {
            return $json ?: ['success' => true];
        }
        return ['success' => false, 'message' => $json['message'] ?? "Error server (HTTP $httpCode)"];
    } else {
        $opts = [
            'http' => [
                'method' => $method,
                'header' => implode("\r\n", $headers) . "\r\n",
                'timeout' => 8,
                'ignore_errors' => true
            ]
        ];
        if ($method === 'POST' && $postData !== null) {
            $opts['http']['content'] = json_encode($postData);
        }
        $context = stream_context_create($opts);
        $res = @file_get_contents($url, false, $context);
        if ($res === false) {
            return ['success' => false, 'message' => 'Gagal melakukan request ke API server sekolah'];
        }
        $json = json_decode($res, true);
        return $json ?: ['success' => false, 'message' => 'Respon tidak valid'];
    }
}

// ─── 4. ENDPOINT STREAMING BUKTI TRANSFER (PROTEKSI TOKEN BACKOFFICE) ────────
if (isset($_GET['action']) && $_GET['action'] === 'view_proof') {
    $file = basename($_GET['file'] ?? '');
    $token = $_GET['token'] ?? '';

    $isOwner = (!empty($_SESSION['applicant_proof_file']) && $_SESSION['applicant_proof_file'] === $file);
    if ($token !== API_SECRET_TOKEN && !$isOwner) {
        http_response_code(403);
        die('403 Forbidden: Akses bukti transfer ditolak.');
    }

    $filePath = $uploadDir . '/' . $file;
    if (!$file || !file_exists($filePath)) {
        http_response_code(404);
        die('404 Not Found: File bukti transfer tidak ditemukan.');
    }

    $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
    $mimeTypes = [
        'jpg'  => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png'  => 'image/png',
        'webp' => 'image/webp',
        'pdf'  => 'application/pdf'
    ];
    $contentType = $mimeTypes[$ext] ?? 'application/octet-stream';

    header('Content-Type: ' . $contentType);
    header('Content-Length: ' . filesize($filePath));
    header('Content-Disposition: inline; filename="' . $file . '"');
    readfile($filePath);
    exit;
}

// ─── 5. AMBIL MASTER JENJANG PENDIDIKAN DARI SUPABASE ────────────────────────
$levelsResponse = callNextJsApi('GET', ['action' => 'get_levels']);
$serverLevels = (!empty($levelsResponse['success']) && !empty($levelsResponse['levels']))
    ? $levelsResponse['levels']
    : ((!empty($levelsResponse['success']) && !empty($levelsResponse['data'])) ? $levelsResponse['data'] : []);

$standardLevels = ['Nursery 1', 'Nursery 2', 'Kindergarten 1', 'Kindergarten 2', 'Elementary 1-6', 'Junior High School', 'Senior High School'];

$flashMsg = '';
$flashType = '';
$successReg = null;

// ─── 6. PROSES PENDAFTARAN AWAL (FORMULIR UTAMA) ────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action_register_simple'])) {
    $parentEmail = strtolower(trim($_POST['parent_email'] ?? ''));
    $parentPhone = trim($_POST['parent_phone'] ?? '');
    $studentName = trim($_POST['student_name'] ?? '');
    $levelName   = trim($_POST['level_name'] ?? '');
    $csrf        = $_POST['csrf_token'] ?? '';
    $agreeTerms  = !empty($_POST['agree_terms']);

    if ($csrf !== $_SESSION['csrf_token']) {
        $flashMsg = 'Sesi keamanan formulir kadaluarsa. Silakan muat ulang halaman.';
        $flashType = 'error';
    } elseif (!$agreeTerms) {
        $flashMsg = 'Anda wajib menyetujui Ketentuan Pendaftaran Siswa Baru untuk melanjutkan.';
        $flashType = 'error';
    } elseif (empty($parentEmail) || !filter_var($parentEmail, FILTER_VALIDATE_EMAIL)) {
        $flashMsg = 'Alamat email orang tua tidak valid.';
        $flashType = 'error';
    } elseif (strlen(preg_replace('/[^0-9]/', '', $parentPhone)) < 8) {
        $flashMsg = 'Nomor WhatsApp tidak valid (minimal 8 digit angka).';
        $flashType = 'error';
    } elseif (empty($studentName)) {
        $flashMsg = 'Nama lengkap calon siswa wajib diisi.';
        $flashType = 'error';
    } elseif (empty($levelName)) {
        $flashMsg = 'Silakan pilih jenjang pendidikan yang dituju.';
        $flashType = 'error';
    } else {
        $payload = [
            'action' => 'register_simple',
            'student_name' => $studentName,
            'parent_email' => $parentEmail,
            'parent_phone' => $parentPhone,
            'level_name' => $levelName,
            'notes' => 'Pendaftaran online melalui web resmi ccs.sch.id/registrasi'
        ];

        $res = callNextJsApi('POST', [], $payload);

        if (!empty($res['success']) && !empty($res['data'])) {
            $successReg = $res['data'];
            $_SESSION['applicant_email']  = $parentEmail;
            $_SESSION['applicant_phone']  = $parentPhone;
            $_SESSION['applicant_app_no'] = $res['data']['application_number'];

            $flashMsg = 'Pendaftaran awal berhasil! Nomor registrasi resmi Anda telah diterbitkan.';
            $flashType = 'success';
        } else {
            $flashMsg = $res['message'] ?? 'Terjadi kesalahan saat memproses pendaftaran.';
            $flashType = 'error';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="<?= $currLang === 'cn' ? 'zh-CN' : $currLang ?>">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= htmlspecialchars($L['page_title']) ?></title>
  
  <!-- Favicon Resmi CCS -->
  <link rel="icon" type="image/png" sizes="16x16" href="https://ccs.sch.id/assets/images/favicon.png">

  <!-- Google Font: Poppins (Font Resmi ccs.sch.id & sewa lapangan) -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

  <!-- FontAwesome 5 Icons (Identik dengan ccs.sch.id & sewa lapangan) -->
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

  <style>
    /* Standar Tipografi Sesuai ccs.sch.id */
    body, button, input, select, textarea {
      font-family: 'Poppins', sans-serif;
    }
    body {
      color: #595959;
      font-size: 15px;
      line-height: 1.7;
      background-color: #fbfbfc;
      -webkit-font-smoothing: antialiased;
    }

    /* Proteksi FontAwesome: Jangan sampai tertimpa font Poppins */
    .fa, .fas, .far, .fal, .fad, .fab,
    .fa::before, .fas::before, .far::before, .fal::before, .fab::before,
    [class*="fa-"]::before {
      font-family: "Font Awesome 5 Free" !important;
      display: inline-block;
    }
    .far, .far::before { font-weight: 400 !important; }
    .fas, .fas::before { font-weight: 900 !important; }
    .fab, .fab::before, [class*="fa-whatsapp"]::before {
      font-family: "Font Awesome 5 Brands" !important;
      font-weight: 400 !important;
    }

    h1, h2, h3, h4, h5, h6 {
      color: #0b4877;
      font-weight: 700;
    }

    /* Logo Resmi CCS — Persis Sesuai custom.css ccs.sch.id */
    .main-logo {
      width: 128px !important;
      height: auto !important;
      display: block;
    }

    /* Tombol Khas CCS (.thm-btn) — Presisi & Institusional */
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
      padding: 10px 28px;
      border-radius: 6px;
      transition: all 0.2s ease;
      cursor: pointer;
      text-transform: none;
    }
    .thm-btn:hover {
      background-color: #022c46;
      border-color: #022c46;
      color: #ffffff;
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

    /* Form Kontrol Resmi Sekolah */
    .school-input, .school-select, .school-textarea {
      width: 100%;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      padding: 9px 13px;
      font-size: 14px;
      color: #1f2937;
      background-color: #ffffff;
      outline: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .school-input:focus, .school-select:focus, .school-textarea:focus {
      border-color: #0b4877;
      box-shadow: 0 0 0 3px rgba(11, 72, 119, 0.12);
    }
    .school-label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 5px;
    }
    .school-hint {
      display: block;
      font-size: 12px;
      color: #6b7280;
      margin-top: 4px;
      line-height: 1.5;
    }

    /* Footer Copyright Sesuai ccs.sch.id */
    .site-footer {
      background-color: #012237;
    }
    .site-footer__copy {
      color: #94a3ac !important;
      font-size: 15px !important;
      font-weight: 500 !important;
      font-family: 'Poppins', sans-serif !important;
      margin: 0;
      text-align: center;
    }

    /* Floating WhatsApp */
    .floating-wa {
      position: fixed;
      bottom: 28px;
      right: 28px;
      z-index: 999;
      transition: transform 0.3s ease;
    }
    .floating-wa:hover {
      transform: scale(1.1);
    }
  </style>
</head>
<body class="min-h-screen flex flex-col justify-between">

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!-- 1. TOP BAR BAHASA RESMI CCS (ENGLISH | BAHASA | 中文)                   -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <div class="bg-ccsNavy text-white py-2">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-end">
      <div class="flex items-center gap-3 text-[13px] font-medium text-gray-200">
        <a 
          href="index.php?lang=en" 
          class="<?= $currLang === 'en' ? 'text-ccsOrangeLight font-semibold' : 'hover:text-ccsOrangeLight transition' ?>"
        >
          English
        </a>
        <span class="text-gray-500">|</span>
        <a 
          href="index.php?lang=id" 
          class="<?= $currLang === 'id' ? 'text-ccsOrangeLight font-semibold' : 'hover:text-ccsOrangeLight transition' ?>"
        >
          Bahasa
        </a>
        <span class="text-gray-500">|</span>
        <a 
          href="index.php?lang=cn" 
          class="<?= $currLang === 'cn' ? 'text-ccsOrangeLight font-semibold' : 'hover:text-ccsOrangeLight transition' ?>"
        >
          中文
        </a>
      </div>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!-- 2. NAVBAR RESMI CCS DENGAN LOGO & PITA 3 WARNA IKONIK                  -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <header class="bg-white sticky top-0 z-50 shadow-sm">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 h-[84px] flex items-center justify-between">
      <!-- Logo Resmi CCS -->
      <a href="https://ccs.sch.id/" class="flex items-center">
        <img 
          src="https://ccs.sch.id/assets/images/logo-cccs.png" 
          alt="Chung Chung Christian School" 
          class="main-logo"
          onerror="this.src='https://ccs.sch.id/assets/images/logo-cccs.png';"
        />
      </a>

      <!-- Menu Navigasi: Home, Formulir Pendaftaran (Aktif), Cek Status Pendaftaran -->
      <nav class="flex items-center gap-8 text-[15px] font-medium">
        <a href="https://ccs.sch.id/" class="text-gray-800 hover:text-ccsOrange transition-colors">
          <?= htmlspecialchars($L['nav_home']) ?>
        </a>
        <a href="index.php?lang=<?= $currLang ?>" class="text-ccsOrange font-semibold border-b-2 border-ccsOrange pb-1 transition-colors">
          <?= htmlspecialchars($L['nav_admission']) ?>
        </a>
        <a href="status.php?lang=<?= $currLang ?>" class="text-gray-800 hover:text-ccsOrange transition-colors">
          <?= htmlspecialchars($L['nav_check_status']) ?>
        </a>
      </nav>
    </div>

    <!-- PITA 3 WARNA IKONIK CCS (Teal, Orange, Purple) TEPAT DI BAWAH NAVBAR -->
    <div class="w-full flex h-[4px]">
      <div class="flex-1 bg-ccsTeal"></div>
      <div class="flex-1 bg-ccsOrange"></div>
      <div class="flex-1 bg-ccsPurple"></div>
    </div>
  </header>

  <!-- Flash Notification (Jika Ada) -->
  <?php if ($flashMsg): ?>
    <div class="max-w-4xl mx-auto px-4 sm:px-6 mt-6 w-full">
      <div class="p-4 rounded-md text-sm font-medium flex items-center justify-between shadow-xs <?= $flashType === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : ($flashType === 'error' ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-sky-50 text-sky-800 border border-sky-200') ?>">
        <div class="flex items-center gap-3">
          <i class="<?= $flashType === 'success' ? 'fas fa-check-circle text-emerald-600' : ($flashType === 'error' ? 'fas fa-exclamation-circle text-rose-600' : 'fas fa-info-circle text-sky-600') ?> text-lg shrink-0"></i>
          <div><?= htmlspecialchars($flashMsg) ?></div>
        </div>
        <button type="button" onclick="this.parentElement.remove()" class="text-gray-400 hover:text-gray-700 ml-4 p-1">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
  <?php endif; ?>

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!-- 3. KONTEN UTAMA HALAMAN: KHUSUS FORMULIR PENDAFTARAN SISWA BARU         -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <main class="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-8">

    <!-- BANNER PANDUAN: SUDAH PERNAH MENDAFTAR? CEK STATUS DI SINI -->
    <div class="bg-gradient-to-r from-orange-50 to-slate-50 border border-orange-200 rounded-md p-3.5 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
      <div class="flex items-center gap-2.5 text-slate-700 font-medium text-center sm:text-left">
        <i class="fas fa-info-circle text-ccsOrange text-base shrink-0"></i>
        <span><?= htmlspecialchars($L['banner_already_registered']) ?></span>
      </div>
      <a href="status.php?lang=<?= $currLang ?>" class="text-ccsNavy hover:text-ccsOrange font-semibold underline underline-offset-2 shrink-0">
        <?= htmlspecialchars($L['banner_check_link']) ?> &rarr;
      </a>
    </div>

    <!-- ─── NOTIFIKASI SUKSES PENDAFTARAN AWAL ─────────── -->
    <?php if ($successReg): ?>
      <div class="bg-white border border-emerald-300 rounded-md p-6 sm:p-8 shadow-xs space-y-5 text-center max-w-2xl mx-auto">
        <div class="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl mx-auto border border-emerald-200">
          <i class="fas fa-check"></i>
        </div>
        <div>
          <span class="text-xs font-semibold text-emerald-700 tracking-wide uppercase"><?= htmlspecialchars($L['success_reg_badge']) ?></span>
          <h2 class="text-2xl font-bold text-ccsHeading mt-1"><?= htmlspecialchars($L['success_reg_title']) ?></h2>
          <div class="inline-block mt-3 px-5 py-2 bg-slate-50 border border-slate-300 rounded-md font-mono text-xl font-bold text-ccsOrange tracking-wider select-all">
            <?= htmlspecialchars($successReg['application_number']) ?>
          </div>
          <p class="text-xs text-gray-500 mt-2 max-w-md mx-auto leading-relaxed"><?= htmlspecialchars($L['success_reg_hint']) ?></p>
        </div>

        <div class="bg-slate-50 rounded-md p-4 sm:p-5 text-sm text-left grid grid-cols-1 sm:grid-cols-2 gap-4 border border-slate-200">
          <div>
            <span class="text-gray-500 text-xs block"><?= htmlspecialchars($L['lbl_student']) ?></span>
            <strong class="text-gray-900"><?= htmlspecialchars($successReg['student_name'] ?? '') ?></strong>
          </div>
          <div>
            <span class="text-gray-500 text-xs block"><?= htmlspecialchars($L['lbl_level_selected']) ?></span>
            <strong class="text-gray-900"><?= htmlspecialchars($successReg['level_name'] ?? '-') ?></strong>
          </div>
          <div class="sm:col-span-2 pt-3 border-t border-slate-200 flex items-center gap-2 text-xs text-slate-700">
            <i class="fas fa-envelope text-ccsOrange shrink-0"></i>
            <span><?= htmlspecialchars($L['success_reg_email_note']) ?></span>
          </div>
        </div>

        <div class="space-y-3 pt-2">
          <a href="status.php?cek=<?= urlencode($successReg['parent_email'] ?? '') ?>&phone=<?= urlencode($successReg['parent_phone'] ?? '') ?>&lang=<?= $currLang ?>#tempat-unggah" class="thm-btn w-full sm:w-auto">
            <i class="fas fa-eye mr-1.5"></i> <?= htmlspecialchars($L['btn_check_this']) ?>
          </a>
          <div>
            <a href="index.php?lang=<?= $currLang ?>" class="text-xs text-gray-500 hover:text-ccsNavy underline"><?= htmlspecialchars($L['btn_register_another']) ?></a>
          </div>
        </div>
      </div>
    <?php endif; ?>

    <!-- ═════════════════════════════════════════════════════════════════════ -->
    <!-- FORMULIR PENDAFTARAN SISWA BARU (BERSIH & INSTITUSIONAL)              -->
    <!-- ═════════════════════════════════════════════════════════════════════ -->
    <section id="form-pendaftaran" class="bg-white border border-gray-200 rounded-md p-6 sm:p-8 space-y-6 shadow-xs">
      
      <!-- Header Form Institusional Bersih -->
      <div class="border-b border-gray-200 pb-4">
        <h1 class="text-2xl font-bold text-ccsHeading"><?= htmlspecialchars($L['form_title']) ?></h1>
        <p class="text-xs text-gray-500 mt-1"><?= htmlspecialchars($L['form_subtitle']) ?></p>
      </div>

      <form method="POST" action="index.php?lang=<?= $currLang ?>" id="registrationForm" class="space-y-6" novalidate>
        <input type="hidden" name="csrf_token" value="<?= $_SESSION['csrf_token'] ?>">
        <input type="hidden" name="action_register_simple" value="1">

        <!-- LANGKAH 1: PILIH JENJANG -->
        <div class="space-y-1.5">
          <label class="school-label" id="lblLevelStep" for="inputLevelSelect">
            1. <?= htmlspecialchars($L['step1_title']) ?> <span class="text-rose-500">*</span>
          </label>
          <div class="max-w-xl">
            <select 
              name="level_name" 
              id="inputLevelSelect" 
              required 
              class="school-select"
            >
              <option value=""><?= htmlspecialchars($L['ph_level']) ?></option>
              <?php if (!empty($serverLevels)): ?>
                <?php foreach ($serverLevels as $lvl): ?>
                  <option value="<?= htmlspecialchars($lvl['level_name']) ?>"><?= htmlspecialchars($lvl['level_name']) ?></option>
                <?php endforeach; ?>
              <?php else: ?>
                <?php foreach ($standardLevels as $lvl): ?>
                  <option value="<?= htmlspecialchars($lvl) ?>"><?= htmlspecialchars($lvl) ?></option>
                <?php endforeach; ?>
              <?php endif; ?>
            </select>
          </div>
        </div>

        <!-- LANGKAH 2: DATA CALON SISWA -->
        <div class="border-t border-gray-100 pt-5 space-y-3">
          <h2 class="text-sm font-bold text-ccsHeading">
            2. <?= htmlspecialchars($L['step2_title']) ?>
          </h2>
          <div class="max-w-xl">
            <label class="school-label" for="inputStudentName">
              <?= htmlspecialchars($L['lbl_student_name']) ?> <span class="text-rose-500">*</span>
            </label>
            <input 
              type="text" 
              name="student_name" 
              id="inputStudentName" 
              required 
              placeholder="Contoh: Jonathan Christian Santoso" 
              class="school-input"
            >
            <span class="school-hint"><?= htmlspecialchars($L['hint_student_name']) ?></span>
          </div>
        </div>

        <!-- LANGKAH 3: DATA KONTAK ORANG TUA / WALI -->
        <div class="border-t border-gray-100 pt-5 space-y-3">
          <h2 class="text-sm font-bold text-ccsHeading">
            3. <?= htmlspecialchars($L['step3_title']) ?>
          </h2>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl">
            <div>
              <label class="school-label" for="inputParentEmail">
                <?= htmlspecialchars($L['lbl_parent_email']) ?> <span class="text-rose-500">*</span>
              </label>
              <input 
                type="email" 
                name="parent_email" 
                id="inputParentEmail" 
                required 
                placeholder="nama@email.com" 
                class="school-input"
              >
              <span class="school-hint"><?= htmlspecialchars($L['hint_parent_email']) ?></span>
            </div>

            <div>
              <label class="school-label" for="inputParentPhone">
                <?= htmlspecialchars($L['lbl_parent_phone']) ?> <span class="text-rose-500">*</span>
              </label>
              <input 
                type="tel" 
                name="parent_phone" 
                id="inputParentPhone" 
                required 
                placeholder="081234567890" 
                class="school-input"
              >
              <span class="school-hint"><?= htmlspecialchars($L['hint_parent_phone']) ?></span>
            </div>
          </div>
        </div>

        <!-- LANGKAH 4: KETENTUAN PENDAFTARAN & TATA TERTIB -->
        <div class="border-t border-gray-100 pt-5 space-y-3">
          <h2 class="text-sm font-bold text-ccsHeading">
            4. <?= htmlspecialchars($L['step4_title']) ?>
          </h2>

          <div class="bg-slate-50 border border-slate-200 rounded-md p-4 sm:p-5 space-y-3">
            <h3 class="font-semibold text-ccsHeading text-xs uppercase tracking-wide">
              <?= htmlspecialchars($L['rules_header']) ?>
            </h3>
            <ul class="list-disc list-outside pl-4 text-xs text-gray-600 space-y-2 leading-relaxed">
              <?php foreach ($L['rules'] as $rule): ?>
                <li><?= htmlspecialchars($rule) ?></li>
              <?php endforeach; ?>
            </ul>

            <label class="flex items-start gap-2.5 cursor-pointer pt-3 border-t border-slate-200">
              <input 
                type="checkbox" 
                name="agree_terms" 
                id="agreeTermsCheckbox" 
                required 
                class="mt-0.5 w-4 h-4 text-ccsOrange border-gray-300 rounded focus:ring-ccsOrange cursor-pointer shrink-0" 
              />
              <span class="text-xs text-gray-700 select-none leading-relaxed">
                <?= $L['agree_rules'] ?>
              </span>
            </label>
          </div>
        </div>

        <!-- Tombol Submit -->
        <div class="pt-2 space-y-2">
          <button 
            type="submit" 
            id="btnSubmitReg"
            class="thm-btn w-full sm:w-auto"
          >
            <?= htmlspecialchars($L['btn_submit']) ?>
          </button>
          <p class="text-xs text-gray-500 max-w-xl leading-relaxed">
            <?= htmlspecialchars($L['submit_email_note']) ?>
          </p>
        </div>

      </form>
    </section>

  </main>

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!-- 4. COPYRIGHT FOOTER (1:1 SESUAI ccs.sch.id & SEWA LAPANGAN)             -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <footer class="site-footer bg-[#012237] py-6 text-center">
    <div class="max-w-6xl mx-auto px-4 flex items-center justify-center relative">
      <p class="site-footer__copy text-[#94a3ac] text-[15px] font-medium m-0 tracking-normal">
        &copy; <?= date('Y') ?> Chung Chung Christian School. All Right Reserved
      </p>
    </div>
  </footer>

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!-- 5. FLOATING WHATSAPP BUTTON RESMI                                       -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <div class="floating-wa">
    <a 
      href="https://api.whatsapp.com/send?phone=6285959860430&text=<?= urlencode($L['wa_text']) ?>" 
      target="_blank"
      class="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center text-3xl shadow-xl transition"
      title="<?= htmlspecialchars($L['wa_title']) ?>"
    >
      <i class="fab fa-whatsapp"></i>
    </a>
  </div>

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!-- 6. MODAL POPUP VALIDASI FORMULIR (INSTITUSIONAL & TEGAS)                -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <div 
    id="validationErrorModal" 
    class="fixed inset-0 z-[9999] hidden items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-all duration-200"
    role="dialog"
    aria-modal="true"
    aria-labelledby="validationModalTitle"
    onclick="handleModalBackdropClick(event)"
  >
    <div 
      class="bg-white rounded-md max-w-md w-full p-6 shadow-xl border border-gray-200 transform transition-all scale-95 opacity-0 duration-200 relative text-left" 
      id="validationModalCard"
    >
      <!-- Tombol Tutup Silang di Kanan Atas -->
      <button 
        type="button" 
        onclick="closeValidationErrorModal()" 
        class="absolute top-4 right-4 text-gray-400 hover:text-gray-700 w-7 h-7 rounded flex items-center justify-center hover:bg-gray-100 transition"
        aria-label="Tutup"
      >
        <i class="fas fa-times text-sm"></i>
      </button>

      <!-- Judul Modal -->
      <div class="border-b border-gray-200 pb-3 pr-8">
        <h3 class="text-base font-bold text-rose-700" id="validationModalTitle">
          <?= htmlspecialchars($L['modal_error_title']) ?>
        </h3>
        <p class="text-xs text-gray-500 mt-0.5" id="validationModalDesc">
          <?= htmlspecialchars($L['modal_error_desc']) ?>
        </p>
      </div>

      <!-- Wadah Daftar Field yang Belum Lengkap -->
      <div class="my-4 max-h-60 overflow-y-auto space-y-2 pr-1 text-left" id="validationErrorList">
        <!-- Disuntikkan secara dinamis oleh JavaScript -->
      </div>

      <!-- Tombol Tindakan -->
      <div class="pt-2 border-t border-gray-100">
        <button
          type="button"
          id="btnDismissErrorModal"
          onclick="closeValidationErrorModal()"
          class="w-full thm-btn py-2.5 text-xs font-semibold"
        >
          <?= htmlspecialchars($L['modal_error_btn']) ?>
        </button>
      </div>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!-- 7. LOGIKA JAVASCRIPT: VALIDASI INTERAKTIF & MODAL POPUP                 -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <script>
    const currentLang = "<?= $currLang ?>";

    // ─── MODAL VALIDASI ERROR POPUP ───────────────────────────────────────
    let firstErrorElement = null;

    function showValidationErrorModal(errors) {
      const modal = document.getElementById('validationErrorModal');
      const card = document.getElementById('validationModalCard');
      const list = document.getElementById('validationErrorList');
      if (!modal || !card || !list) return;

      list.innerHTML = '';
      firstErrorElement = null;

      if (errors && errors.length > 0) {
        firstErrorElement = errors[0].el || null;

        errors.forEach(err => {
          const item = document.createElement('div');
          item.className = 'border-l-4 border-rose-500 bg-rose-50/70 p-3 rounded-r text-xs';
          item.innerHTML = `
            <strong class="font-semibold text-rose-900 block text-xs">${err.label}</strong>
            <span class="text-rose-700 block mt-0.5">${err.msg}</span>
          `;
          list.appendChild(item);
        });
      }

      modal.classList.remove('hidden');
      modal.classList.add('flex');
      setTimeout(() => {
        card.classList.remove('scale-95', 'opacity-0');
        card.classList.add('scale-100', 'opacity-100');
      }, 10);
      document.body.style.overflow = 'hidden';
    }

    function closeValidationErrorModal() {
      const modal = document.getElementById('validationErrorModal');
      const card = document.getElementById('validationModalCard');
      if (!modal || !card) return;

      card.classList.remove('scale-100', 'opacity-100');
      card.classList.add('scale-95', 'opacity-0');
      setTimeout(() => {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
        document.body.style.overflow = '';

        if (firstErrorElement) {
          firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (typeof firstErrorElement.focus === 'function') {
            firstErrorElement.focus();
          }
          firstErrorElement.classList.add('ring-4', 'ring-rose-200', 'border-rose-500');
          setTimeout(() => {
            firstErrorElement.classList.remove('ring-4', 'ring-rose-200', 'border-rose-500');
          }, 2500);
        }
      }, 150);
    }

    function handleModalBackdropClick(e) {
      if (e.target.id === 'validationErrorModal') {
        closeValidationErrorModal();
      }
    }

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        const modal = document.getElementById('validationErrorModal');
        if (modal && !modal.classList.contains('hidden')) {
          closeValidationErrorModal();
        }
      }
    });

    // ─── CLIENT VALIDATION SAAT SUBMIT FORM REGISTRASI AWAL ───────────────
    const regForm = document.getElementById('registrationForm');
    if (regForm) {
      regForm.addEventListener('submit', function(e) {
        const errors = [];
        const levelSel = document.getElementById('inputLevelSelect');
        const studentName = document.getElementById('inputStudentName');
        const parentEmail = document.getElementById('inputParentEmail');
        const parentPhone = document.getElementById('inputParentPhone');
        const agreeTerms = document.getElementById('agreeTermsCheckbox');

        if (!levelSel || !levelSel.value) {
          errors.push({
            label: currentLang === 'en' ? 'Educational Program' : (currentLang === 'cn' ? '入学学段' : 'Jenjang Pendidikan'),
            msg: currentLang === 'en' ? 'Please choose the intended educational level.' : (currentLang === 'cn' ? '请选择拟报读的教育学段。' : 'Silakan pilih jenjang pendidikan yang dituju.'),
            el: levelSel
          });
        }

        if (!studentName || !studentName.value.trim()) {
          errors.push({
            label: currentLang === 'en' ? 'Student Full Name' : (currentLang === 'cn' ? '学生全名' : 'Nama Lengkap Siswa'),
            msg: currentLang === 'en' ? 'Please enter the student candidate\'s full name.' : (currentLang === 'cn' ? '请输入拟报读学生的全名。' : 'Nama lengkap calon siswa wajib diisi.'),
            el: studentName
          });
        }

        const emailVal = parentEmail ? parentEmail.value.trim() : '';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailVal || !emailRegex.test(emailVal)) {
          errors.push({
            label: currentLang === 'en' ? 'Parent Email' : (currentLang === 'cn' ? '家长电子邮箱' : 'Email Orang Tua'),
            msg: currentLang === 'en' ? 'Please provide a valid active email address.' : (currentLang === 'cn' ? '请提供有效的电子邮箱地址。' : 'Alamat email orang tua wajib diisi dengan benar.'),
            el: parentEmail
          });
        }

        const phoneVal = parentPhone ? parentPhone.value.replace(/[^0-9]/g, '') : '';
        if (!phoneVal || phoneVal.length < 8) {
          errors.push({
            label: currentLang === 'en' ? 'WhatsApp Number' : (currentLang === 'cn' ? 'WhatsApp 手机号码' : 'Nomor WhatsApp'),
            msg: currentLang === 'en' ? 'Please enter an active WhatsApp number (min 8 digits).' : (currentLang === 'cn' ? '请输入有效的 WhatsApp 手机号码（至少8位数字）。' : 'Nomor WhatsApp wajib diisi (minimal 8 digit).'),
            el: parentPhone
          });
        }

        if (!agreeTerms || !agreeTerms.checked) {
          errors.push({
            label: currentLang === 'en' ? 'Admission Terms & Regulations' : (currentLang === 'cn' ? '招生规章与条例' : 'Ketentuan Pendaftaran'),
            msg: currentLang === 'en' ? 'You must agree to the admission regulations to proceed.' : (currentLang === 'cn' ? '您须确认勾选并同意上述招生规章条例后方可继续。' : 'Anda wajib mencentang persetujuan ketentuan pendaftaran.'),
            el: agreeTerms
          });
        }

        if (errors.length > 0) {
          e.preventDefault();
          showValidationErrorModal(errors);
        }
      });
    }
  </script>

</body>
</html>
