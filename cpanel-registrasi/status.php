<?php
/**
 * ==============================================================================
 * SISTEM CEK STATUS PENDAFTARAN & UNGGAH BUKTI BAYAR SISWA BARU CCS
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
        'page_title' => 'Cek Status Pendaftaran Siswa Baru — Chung Chung Christian School',
        'nav_home' => 'Home',
        'nav_admission' => 'Pendaftaran Siswa Baru',
        'nav_check_status' => 'Cek Status Pendaftaran',
        'banner_not_registered' => 'Belum mengajukan pendaftaran siswa baru?',
        'banner_register_link' => 'Isi Formulir Pendaftaran Siswa Baru di Sini',

        // Search Section
        'status_section_title' => 'Cek Status Pendaftaran Siswa Baru',
        'status_section_desc' => 'Gunakan alamat email terdaftar dan nomor WhatsApp/HP orang tua untuk mengecek status verifikasi berkas, mengunggah bukti transfer formulir, dan melengkapi data calon siswa.',
        'lbl_search_email' => 'Alamat Email Terdaftar',
        'status_input_ph' => 'Masukkan email terdaftar (contoh: orangtua@gmail.com)',
        'lbl_search_phone' => 'Nomor WhatsApp / HP',
        'phone_input_ph' => 'Contoh: 081234567890',
        'btn_check' => 'Cek Status',

        // Panduan 3 Langkah Awal (Saat Belum Cari)
        'guide_title' => 'Tahapan Pengecekan & Pembayaran Formulir PPDB CCS',
        'guide_step1_title' => '1. Masukkan Email & No. HP',
        'guide_step1_desc' => 'Gunakan data yang Anda daftarkan pada formulir awal untuk membuka data pendaftaran Anda.',
        'guide_step2_title' => '2. Transfer & Unggah Struk',
        'guide_step2_desc' => 'Kirim biaya formulir ke rekening resmi Bank Mayapada, lalu unggah foto struk atau berkas transfer.',
        'guide_step3_title' => '3. Lengkapi Data Siswa',
        'guide_step3_desc' => 'Setelah pembayaran diverifikasi oleh staf Admissions, isi formulir biodata lengkap calon siswa.',

        // Status Badges
        'status_verified' => 'Disetujui (Lunas)',
        'status_proof_uploaded' => 'Verifikasi Bukti Struk',
        'status_rejected' => 'Bukti Ditolak',
        'status_pending' => 'Menunggu Pembayaran',
        'dash_status_lbl' => 'Status Pendaftaran:',
        'lbl_code' => 'Nomor Registrasi',
        'lbl_student' => 'Calon Siswa',
        'lbl_level_selected' => 'Jenjang Pendidikan',
        'lbl_form_fee' => 'Total Biaya Formulir',

        // Kartu Rekening Bank
        'bank_card_title' => 'Rekening Resmi Sekolah',
        'bank_card_nom' => 'Nominal Pembelian Formulir',
        'bank_card_rek' => 'Nomor Rekening Bank',
        'bank_card_an' => 'Atas Nama:',
        'bank_card_remark' => 'Berita Transfer:',
        'btn_copy' => 'Salin',
        'lbl_copy_rek' => 'Salin Rekening',
        'msg_copied' => 'Nomor rekening berhasil disalin!',

        // Upload Bukti
        'upload_title' => 'Unggah Bukti Transfer Pembayaran',
        'upload_title_re' => 'Unggah Ulang Bukti Transfer',
        'upload_drag_title' => 'Pilih Berkas Struk Transfer (Foto atau PDF)',
        'upload_drag_hint' => 'Format file yang diperbolehkan: JPG, PNG, WEBP, atau PDF (Maksimal 5 MB).',
        'btn_upload' => 'Kirim Bukti Pembayaran',
        'proof_stored_notice' => 'Bukti tersimpan:',
        'btn_view_file' => 'Lihat Berkas &rarr;',
        'notice_waiting_approval' => 'Bukti pembayaran Anda telah diterima dan sedang menunggu proses verifikasi staf Admissions di sistem sekolah.',
        'notice_rejected_msg' => 'Bukti pembayaran sebelumnya ditolak oleh admin sekolah. Silakan unggah kembali bukti transfer yang jelas dan valid.',

        // Formulir Lengkap (Ketika verified)
        'fullform_badge' => 'Pembayaran Formulir Telah Diverifikasi',
        'fullform_title' => 'Formulir Detail Calon Siswa & Orang Tua',
        'fullform_subtitle' => 'Silakan lengkapi seluruh data calon siswa dan orang tua di bawah ini untuk tahapan observasi dan administrasi sekolah.',
        'sec1_student' => '1. Biodata Lengkap Calon Siswa',
        'lbl_student_name' => 'Nama Lengkap Calon Siswa',
        'lbl_nickname' => 'Nama Panggilan',
        'lbl_gender' => 'Jenis Kelamin',
        'gender_male' => 'Laki-laki',
        'gender_female' => 'Perempuan',
        'lbl_birth_place' => 'Tempat Lahir',
        'lbl_birth_date' => 'Tanggal Lahir',
        'lbl_religion' => 'Agama',
        'lbl_nationality' => 'Kewarganegaraan',
        'lbl_prev_school' => 'Asal Sekolah Sebelumnya',
        'lbl_domicile' => 'Alamat Tempat Tinggal Saat Ini',
        'sec2_parent' => '2. Data Orang Tua / Wali',
        'lbl_parent_full' => 'Nama Lengkap Orang Tua / Wali',
        'lbl_parent_phone' => 'Nomor WhatsApp / HP',
        'lbl_parent_email' => 'Alamat Email',
        'lbl_nik' => 'NIK Orang Tua (KTP/Paspor)',
        'lbl_occupation' => 'Pekerjaan Orang Tua',
        'lbl_notes' => 'Catatan Tambahan (Kondisi Khusus / Riwayat Belajar)',
        'btn_save_fullform' => 'Simpan Formulir Pendaftaran Lengkap',

        // Tanda Terima Selesai
        'receipt_title' => 'Formulir Pendaftaran Lengkap Telah Diterima!',
        'receipt_desc' => 'Seluruh data calon siswa telah tersimpan resmi di sistem Chung Chung Christian School.',
        'receipt_status' => 'Pembayaran Lunas & Data Lengkap',
        'receipt_contact_soon' => 'Tim Admissions CCS akan segera menghubungi nomor WhatsApp Anda untuk konfirmasi jadwal observasi dan tes penempatan.',

        // Floating WhatsApp
        'wa_title' => 'Hubungi Admissions via WhatsApp',
        'wa_text' => 'Halo Admin Admissions CCS, saya ingin bertanya mengenai status pendaftaran calon siswa.'
    ],

    'en' => [
        'page_title' => 'Check Admission Status — Chung Chung Christian School',
        'nav_home' => 'Home',
        'nav_admission' => 'New Student Admission',
        'nav_check_status' => 'Check Admission Status',
        'banner_not_registered' => 'Have not applied for admission yet?',
        'banner_register_link' => 'Fill Out New Student Registration Form Here',

        // Search Section
        'status_section_title' => 'Check New Student Admission Status',
        'status_section_desc' => 'Enter your registered email address and parent WhatsApp/phone number to check document status, upload form payment receipts, and complete student details.',
        'lbl_search_email' => 'Registered Email Address',
        'status_input_ph' => 'Enter registered email (e.g. parent@example.com)',
        'lbl_search_phone' => 'WhatsApp / Phone Number',
        'phone_input_ph' => 'e.g. 081234567890',
        'btn_check' => 'Check Status',

        // Guide 3 Steps
        'guide_title' => 'CCS Admission Verification & Payment Steps',
        'guide_step1_title' => '1. Enter Email & Phone',
        'guide_step1_desc' => 'Provide the credentials used in your initial registration form to retrieve your record.',
        'guide_step2_title' => '2. Transfer & Upload Receipt',
        'guide_step2_desc' => 'Transfer the form fee to the official Bank Mayapada account, then upload your transfer receipt.',
        'guide_step3_title' => '3. Complete Student Form',
        'guide_step3_desc' => 'Once payment is verified by Admissions staff, fill out the comprehensive candidate background profile.',

        // Status Badges
        'status_verified' => 'Approved (Verified)',
        'status_proof_uploaded' => 'Verifying Payment Receipt',
        'status_rejected' => 'Receipt Rejected',
        'status_pending' => 'Pending Form Payment',
        'dash_status_lbl' => 'Admission Status:',
        'lbl_code' => 'Registration No.',
        'lbl_student' => 'Student Candidate',
        'lbl_level_selected' => 'Target Program',
        'lbl_form_fee' => 'Total Form Fee',

        // Bank Card
        'bank_card_title' => 'Official School Bank Account',
        'bank_card_nom' => 'Application Form Fee Amount',
        'bank_card_rek' => 'Bank Account Number',
        'bank_card_an' => 'Beneficiary Name:',
        'bank_card_remark' => 'Transfer Remarks:',
        'btn_copy' => 'Copy',
        'lbl_copy_rek' => 'Copy Account',
        'msg_copied' => 'Account number copied successfully!',

        // Upload Proof
        'upload_title' => 'Upload Payment Transfer Receipt',
        'upload_title_re' => 'Re-upload Payment Transfer Receipt',
        'upload_drag_title' => 'Select Transfer Receipt File (Image or PDF)',
        'upload_drag_hint' => 'Accepted formats: JPG, PNG, WEBP, or PDF (Maximum 5 MB).',
        'btn_upload' => 'Submit Payment Proof',
        'proof_stored_notice' => 'Receipt stored:',
        'btn_view_file' => 'View Document &rarr;',
        'notice_waiting_approval' => 'Your payment receipt has been received and is currently under verification by the Admissions team in our school system.',
        'notice_rejected_msg' => 'Your previous payment receipt was rejected by the Admissions office. Please re-upload a clear and valid receipt.',

        // Full Form
        'fullform_badge' => 'Application Form Payment Verified',
        'fullform_title' => 'Complete Student & Parent Background Form',
        'fullform_subtitle' => 'Please complete all details below for academic observation and school enrollment procedures.',
        'sec1_student' => '1. Student Personal Information',
        'lbl_student_name' => 'Student Candidate Full Name',
        'lbl_nickname' => 'Preferred Nickname',
        'lbl_gender' => 'Gender',
        'gender_male' => 'Male',
        'gender_female' => 'Female',
        'lbl_birth_place' => 'Place of Birth',
        'lbl_birth_date' => 'Date of Birth',
        'lbl_religion' => 'Religion',
        'lbl_nationality' => 'Nationality',
        'lbl_prev_school' => 'Previous School Attended',
        'lbl_domicile' => 'Current Residential Address',
        'sec2_parent' => '2. Parent / Guardian Information',
        'lbl_parent_full' => 'Parent / Guardian Full Legal Name',
        'lbl_parent_phone' => 'WhatsApp / Phone Number',
        'lbl_parent_email' => 'Email Address',
        'lbl_nik' => 'Parent ID / Passport Number',
        'lbl_occupation' => 'Occupation',
        'lbl_notes' => 'Additional Notes (Special Needs / Learning History)',
        'btn_save_fullform' => 'Save & Submit Complete Form',

        // Receipt Done
        'receipt_title' => 'Complete Application Form Received!',
        'receipt_desc' => 'All candidate background details have been recorded in Chung Chung Christian School\'s official database.',
        'receipt_status' => 'Payment Settled & Data Complete',
        'receipt_contact_soon' => 'The CCS Admissions team will contact your WhatsApp number shortly to schedule the student observation and parent interview.',

        // Floating WhatsApp
        'wa_title' => 'Contact Admissions on WhatsApp',
        'wa_text' => 'Hello CCS Admissions, I would like to inquire regarding student application status.'
    ],

    'cn' => [
        'page_title' => '查询新生报名审核状态 — 崇崇基督教学校 (CCS)',
        'nav_home' => '首页',
        'nav_admission' => '新生招生报名',
        'nav_check_status' => '查询报名状态',
        'banner_not_registered' => '尚未提交新生报名申请？',
        'banner_register_link' => '在此填写新生入学报名表',

        // Search Section
        'status_section_title' => '查询新生入学报名状态',
        'status_section_desc' => '使用您注册时填写的电子邮箱和家长手机号码，查询审核状态、上传报名表格付款凭证，以及完善录取资料。',
        'lbl_search_email' => '已注册的电子邮箱',
        'status_input_ph' => '请输入注册时填写的电子邮箱 (例如: parent@example.com)',
        'lbl_search_phone' => 'WhatsApp / 手机号码',
        'phone_input_ph' => '例如: 081234567890',
        'btn_check' => '查询状态',

        // Guide 3 Steps
        'guide_title' => '崇崇基督教学校招生审核与缴费流程',
        'guide_step1_title' => '1. 输入邮箱与手机号',
        'guide_step1_desc' => '使用您在初步申请时填写的电子邮箱和 WhatsApp 号码查询您的报名档案。',
        'guide_step2_title' => '2. 转账并上传转账凭证',
        'guide_step2_desc' => '向官方 Bank Mayapada 账户转账报名表格费，并在此上传转账凭证照片或 PDF。',
        'guide_step3_title' => '3. 完善学生详细档案',
        'guide_step3_desc' => '缴费通过招生部老师审核后，在线填写完整的拟入学学生及家庭详细资料。',

        // Status Badges
        'status_verified' => '已审核批准 (已缴费)',
        'status_proof_uploaded' => '凭证审核中',
        'status_rejected' => '凭证被驳回',
        'status_pending' => '等待支付报名表费用',
        'dash_status_lbl' => '报名审核状态：',
        'lbl_code' => '报名编号',
        'lbl_student' => '报名学生',
        'lbl_level_selected' => '报读学段',
        'lbl_form_fee' => '报名表费用金额',

        // Bank Card
        'bank_card_title' => '学校官方指定收款账户',
        'bank_card_nom' => '报名表格购买费用',
        'bank_card_rek' => '银行账号',
        'bank_card_an' => '账户户名：',
        'bank_card_remark' => '转账附言：',
        'btn_copy' => '复制',
        'lbl_copy_rek' => '复制银行账号',
        'msg_copied' => '银行账号复制成功！',

        // Upload Proof
        'upload_title' => '上传银行转账付款凭证',
        'upload_title_re' => '重新上传转账凭证',
        'upload_drag_title' => '选择转账凭证文件 (照片或 PDF)',
        'upload_drag_hint' => '支持的文件格式：JPG, PNG, WEBP 或 PDF（最大 5 MB）。',
        'btn_upload' => '提交付款凭证',
        'proof_stored_notice' => '已归档凭证：',
        'btn_view_file' => '查看文件 &rarr;',
        'notice_waiting_approval' => '您的转账凭证已成功接收，正在等待学校招生团队在后台管理系统中核实确认。',
        'notice_rejected_msg' => '您之前提交的转账凭证已被驳回，请重新上传清晰有效的付款单据。',

        // Full Form
        'fullform_badge' => '报名表格费用已审核确认',
        'fullform_title' => '学生及家庭详细背景信息表',
        'fullform_subtitle' => '请填写以下完整的拟入学学生与家庭信息，以供学校安排后续观察面试及正式入学建档。',
        'sec1_student' => '1. 学生个人详细资料',
        'lbl_student_name' => '学生法定全名',
        'lbl_nickname' => '学生昵称',
        'lbl_gender' => '性别',
        'gender_male' => '男',
        'gender_female' => '女',
        'lbl_birth_place' => '出生地点',
        'lbl_birth_date' => '出生日期',
        'lbl_religion' => '宗教信仰',
        'lbl_nationality' => '国籍',
        'lbl_prev_school' => '原就读学校',
        'lbl_domicile' => '当前居住地址',
        'sec2_parent' => '2. 家长 / 监护人信息',
        'lbl_parent_full' => '家长/监护人法定全名',
        'lbl_parent_phone' => 'WhatsApp / 手机号码',
        'lbl_parent_email' => '电子邮箱地址',
        'lbl_nik' => '家长身份证号 / 护照号',
        'lbl_occupation' => '职业',
        'lbl_notes' => '补充说明 (特殊情况或过往学习经历)',
        'btn_save_fullform' => '保存并提交完整报名资料',

        // Receipt Done
        'receipt_title' => '完整报名表已成功接收！',
        'receipt_desc' => '学生所有详细资料已完整录入并安全归档于崇崇基督教学校官方管理系统。',
        'receipt_status' => '费用结清 & 资料完整',
        'receipt_contact_soon' => 'CCS 招生团队将尽快通过 WhatsApp 与您联系安排后续入学观察及面谈时间。',

        // Floating WhatsApp
        'wa_title' => '通过 WhatsApp 联系招生处',
        'wa_text' => '您好 CCS 招生老师，我想咨询新生报名的审核进度。'
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

$flashMsg = '';
$flashType = '';

// ─── 5. PROSES UPLOAD BUKTI TRANSFER ─────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action_upload_proof'])) {
    $csrf = $_POST['csrf_token'] ?? '';
    $targetAppNo = trim($_POST['target_app_no'] ?? ($_SESSION['applicant_app_no'] ?? ''));

    if ($csrf !== $_SESSION['csrf_token']) {
        $flashMsg = 'Sesi formulir kadaluarsa. Silakan muat ulang halaman.';
        $flashType = 'error';
    } elseif (empty($targetAppNo)) {
        $flashMsg = 'Nomor registrasi pendaftar tidak ditemukan.';
        $flashType = 'error';
    } elseif (!isset($_FILES['payment_proof']) || $_FILES['payment_proof']['error'] !== UPLOAD_ERR_OK) {
        $flashMsg = 'Wajib melampirkan berkas bukti transfer (foto atau PDF).';
        $flashType = 'error';
    } else {
        $file = $_FILES['payment_proof'];
        $maxBytes = 5 * 1024 * 1024; // 5 MB
        $allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

        if ($file['size'] > $maxBytes) {
            $flashMsg = 'Ukuran berkas bukti transfer melebihi batas maksimum 5 MB.';
            $flashType = 'error';
        } elseif (!in_array($ext, $allowedExts)) {
            $flashMsg = 'Format berkas tidak didukung. Harap gunakan file JPG, PNG, WEBP, atau PDF.';
            $flashType = 'error';
        } else {
            $appNoClean = preg_replace('/[^A-Za-z0-9]/', '', $targetAppNo);
            $newFilename = 'proof_' . $appNoClean . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
            $destination = $uploadDir . '/' . $newFilename;

            if (move_uploaded_file($file['tmp_name'], $destination)) {
                $payload = [
                    'action' => 'upload_proof',
                    'application_number' => $targetAppNo,
                    'payment_proof_file' => $newFilename,
                    'hosting_url' => HOSTING_URL
                ];

                $res = callNextJsApi('POST', [], $payload);

                if (!empty($res['success'])) {
                    $_SESSION['applicant_proof_file'] = $newFilename;
                    $flashMsg = 'Bukti transfer berhasil dikirimkan! Staf Admissions akan segera memverifikasi.';
                    $flashType = 'success';
                } else {
                    $flashMsg = 'Bukti tersimpan di server namun gagal sinkron: ' . ($res['message'] ?? 'Error');
                    $flashType = 'error';
                }
            } else {
                $flashMsg = 'Gagal menyimpan file bukti transfer ke direktori server hosting.';
                $flashType = 'error';
            }
        }
    }
}

// ─── 6. PROSES SIMPAN FORMULIR LENGKAP (KONDISIONAL HANYA JIKA VERIFIED) ────
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action_complete_form'])) {
    $csrf = $_POST['csrf_token'] ?? '';
    $targetAppNo = trim($_POST['target_app_no'] ?? ($_SESSION['applicant_app_no'] ?? ''));

    if ($csrf !== $_SESSION['csrf_token']) {
        $flashMsg = 'Sesi formulir kadaluarsa. Silakan coba lagi.';
        $flashType = 'error';
    } elseif (empty($targetAppNo)) {
        $flashMsg = 'Nomor registrasi pendaftar tidak valid.';
        $flashType = 'error';
    } else {
        $payload = [
            'action' => 'complete_form',
            'application_number' => $targetAppNo,
            'student_name' => trim($_POST['student_name'] ?? ''),
            'student_nickname' => trim($_POST['student_nickname'] ?? ''),
            'student_gender' => trim($_POST['student_gender'] ?? ''),
            'student_birth_place' => trim($_POST['student_birth_place'] ?? ''),
            'student_birth_date' => trim($_POST['student_birth_date'] ?? ''),
            'student_religion' => trim($_POST['student_religion'] ?? ''),
            'student_nationality' => trim($_POST['student_nationality'] ?? 'WNI'),
            'student_previous_school' => trim($_POST['student_previous_school'] ?? ''),
            'student_domicile_address' => trim($_POST['student_domicile_address'] ?? ''),
            'parent_name' => trim($_POST['parent_name'] ?? ''),
            'parent_phone' => trim($_POST['parent_phone'] ?? ''),
            'parent_email' => trim($_POST['parent_email'] ?? ''),
            'parent_occupation' => trim($_POST['parent_occupation'] ?? ''),
            'parent_nik' => trim($_POST['parent_nik'] ?? ''),
            'additional_notes' => trim($_POST['additional_notes'] ?? '')
        ];

        $res = callNextJsApi('POST', [], $payload);

        if (!empty($res['success'])) {
            $flashMsg = 'Selamat! Formulir biodata calon siswa telah lengkap tersimpan.';
            $flashType = 'success';
        } else {
            $flashMsg = 'Gagal menyimpan formulir lengkap: ' . ($res['message'] ?? 'Error');
            $flashType = 'error';
        }
    }
}

// ─── 7. PENCARIAN STATUS PENDAFTARAN (EMAIL ATAU KODE REGISTRASI + NO HP) ───
$searchQuery = trim($_GET['cek'] ?? ($_SESSION['applicant_email'] ?? ''));
$searchPhone = trim($_GET['phone'] ?? ($_SESSION['applicant_phone'] ?? ''));
$currentApplicant = null;
$searchError = '';

if (!empty($searchQuery)) {
    $isEmail = filter_var($searchQuery, FILTER_VALIDATE_EMAIL);
    $queryParams = [
        'action' => 'check_status',
        'phone' => $searchPhone
    ];
    if ($isEmail) {
        $queryParams['email'] = strtolower($searchQuery);
    } else {
        $queryParams['code'] = $searchQuery;
    }

    $res = callNextJsApi('GET', $queryParams);

    if (!empty($res['success']) && !empty($res['data'])) {
        $currentApplicant = $res['data'];
        $_SESSION['applicant_email']  = $currentApplicant['parent_email'] ?? $currentApplicant['father_email'] ?? '';
        $_SESSION['applicant_phone']  = $currentApplicant['parent_phone'] ?? $currentApplicant['father_phone'] ?? $searchPhone;
        $_SESSION['applicant_app_no'] = $currentApplicant['application_number'];
        if (!empty($currentApplicant['payment_proof_file'])) {
            $_SESSION['applicant_proof_file'] = $currentApplicant['payment_proof_file'];
        }
    } else {
        if (isset($_GET['cek'])) {
            $searchError = !empty($res['message']) ? $res['message'] : "Data pendaftaran dengan kata kunci '{$searchQuery}' tidak ditemukan.";
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

    /* Proteksi FontAwesome */
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

    /* Logo Resmi CCS */
    .main-logo {
      width: 128px !important;
      height: auto !important;
      display: block;
    }

    /* Tombol Khas CCS (.thm-btn) */
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

    /* Footer Copyright */
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
          href="status.php?lang=en<?= !empty($searchQuery) ? '&cek=' . urlencode($searchQuery) : '' ?><?= !empty($searchPhone) ? '&phone=' . urlencode($searchPhone) : '' ?>" 
          class="<?= $currLang === 'en' ? 'text-ccsOrangeLight font-semibold' : 'hover:text-ccsOrangeLight transition' ?>"
        >
          English
        </a>
        <span class="text-gray-500">|</span>
        <a 
          href="status.php?lang=id<?= !empty($searchQuery) ? '&cek=' . urlencode($searchQuery) : '' ?><?= !empty($searchPhone) ? '&phone=' . urlencode($searchPhone) : '' ?>" 
          class="<?= $currLang === 'id' ? 'text-ccsOrangeLight font-semibold' : 'hover:text-ccsOrangeLight transition' ?>"
        >
          Bahasa
        </a>
        <span class="text-gray-500">|</span>
        <a 
          href="status.php?lang=cn<?= !empty($searchQuery) ? '&cek=' . urlencode($searchQuery) : '' ?><?= !empty($searchPhone) ? '&phone=' . urlencode($searchPhone) : '' ?>" 
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

      <!-- Menu Navigasi: Home, Pendaftaran Siswa Baru, Cek Status Pendaftaran (Aktif) -->
      <nav class="flex items-center gap-8 text-[15px] font-medium">
        <a href="https://ccs.sch.id/" class="text-gray-800 hover:text-ccsOrange transition-colors">
          <?= htmlspecialchars($L['nav_home']) ?>
        </a>
        <a href="index.php?lang=<?= $currLang ?>" class="text-gray-800 hover:text-ccsOrange transition-colors">
          <?= htmlspecialchars($L['nav_admission']) ?>
        </a>
        <a href="status.php?lang=<?= $currLang ?>" class="text-ccsOrange font-semibold border-b-2 border-ccsOrange pb-1 transition-colors">
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
  <!-- 3. KONTEN UTAMA: CEK STATUS, REKENING, UPLOAD STRUK & FORM DETAIL      -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <main class="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-8">

    <!-- BANNER PANDUAN: JIKA BELUM MENDAFTAR -->
    <div class="bg-gradient-to-r from-blue-50 to-slate-50 border border-blue-200 rounded-md p-3.5 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
      <div class="flex items-center gap-2.5 text-slate-700 font-medium text-center sm:text-left">
        <i class="fas fa-user-plus text-ccsOrange text-base shrink-0"></i>
        <span><?= htmlspecialchars($L['banner_not_registered']) ?></span>
      </div>
      <a href="index.php?lang=<?= $currLang ?>" class="text-ccsNavy hover:text-ccsOrange font-semibold underline underline-offset-2 shrink-0">
        <?= htmlspecialchars($L['banner_register_link']) ?> &rarr;
      </a>
    </div>

    <!-- SECTION PENCARIAN STATUS PENDAFTARAN -->
    <section id="cek-status" class="bg-white border border-gray-200 rounded-md p-6 sm:p-8 shadow-xs space-y-6">
      <div class="border-b border-gray-200 pb-3">
        <h1 class="text-2xl font-bold text-ccsHeading"><?= htmlspecialchars($L['status_section_title']) ?></h1>
        <p class="text-xs text-gray-500 mt-1"><?= htmlspecialchars($L['status_section_desc']) ?></p>
      </div>

      <!-- Form Pencarian: Email & Nomor WhatsApp -->
      <form method="GET" action="status.php" class="space-y-4">
        <input type="hidden" name="lang" value="<?= htmlspecialchars($currLang) ?>" />
        
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="school-label" for="searchEmail">
              <?= htmlspecialchars($L['lbl_search_email']) ?> <span class="text-rose-500">*</span>
            </label>
            <input
              type="text"
              id="searchEmail"
              name="cek"
              value="<?= htmlspecialchars($searchQuery) ?>"
              placeholder="<?= htmlspecialchars($L['status_input_ph']) ?>"
              required
              class="school-input font-medium"
            />
          </div>

          <div>
            <label class="school-label" for="searchPhone">
              <?= htmlspecialchars($L['lbl_search_phone']) ?> <span class="text-rose-500">*</span>
            </label>
            <input
              type="tel"
              id="searchPhone"
              name="phone"
              value="<?= htmlspecialchars($searchPhone) ?>"
              placeholder="<?= htmlspecialchars($L['phone_input_ph']) ?>"
              required
              class="school-input font-medium"
            />
          </div>
        </div>

        <div>
          <button type="submit" class="thm-btn px-7 py-2.5 text-xs font-semibold">
            <i class="fas fa-search mr-1.5"></i> <?= htmlspecialchars($L['btn_check']) ?>
          </button>
        </div>
      </form>

      <!-- Alert Jika Data Tidak Ditemukan -->
      <?php if (!empty($searchError)): ?>
        <div class="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md flex items-center gap-3">
          <i class="fas fa-exclamation-circle text-rose-500 text-lg shrink-0"></i>
          <span class="leading-relaxed"><?= htmlspecialchars($searchError) ?></span>
        </div>
      <?php endif; ?>

      <!-- PANDUAN 3 LANGKAH (HANYA DITAMPILKAN JIKA BELUM ADA DATA PENDAFTAR DIBUKA) -->
      <?php if (!$currentApplicant && empty($searchError)): ?>
        <div class="border-t border-gray-100 pt-6 space-y-4">
          <h3 class="text-xs font-bold text-ccsHeading uppercase tracking-wider">
            <?= htmlspecialchars($L['guide_title']) ?>
          </h3>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="bg-slate-50 border border-slate-200 rounded-md p-4 space-y-1.5">
              <div class="w-8 h-8 rounded-full bg-blue-50 text-ccsHeading flex items-center justify-center font-bold text-xs border border-blue-100">1</div>
              <strong class="text-xs font-bold text-gray-900 block"><?= htmlspecialchars($L['guide_step1_title']) ?></strong>
              <p class="text-[11px] text-gray-500 leading-relaxed"><?= htmlspecialchars($L['guide_step1_desc']) ?></p>
            </div>
            <div class="bg-slate-50 border border-slate-200 rounded-md p-4 space-y-1.5">
              <div class="w-8 h-8 rounded-full bg-orange-50 text-ccsOrange flex items-center justify-center font-bold text-xs border border-orange-100">2</div>
              <strong class="text-xs font-bold text-gray-900 block"><?= htmlspecialchars($L['guide_step2_title']) ?></strong>
              <p class="text-[11px] text-gray-500 leading-relaxed"><?= htmlspecialchars($L['guide_step2_desc']) ?></p>
            </div>
            <div class="bg-slate-50 border border-slate-200 rounded-md p-4 space-y-1.5">
              <div class="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs border border-emerald-100">3</div>
              <strong class="text-xs font-bold text-gray-900 block"><?= htmlspecialchars($L['guide_step3_title']) ?></strong>
              <p class="text-[11px] text-gray-500 leading-relaxed"><?= htmlspecialchars($L['guide_step3_desc']) ?></p>
            </div>
          </div>
        </div>
      <?php endif; ?>

      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <!-- HASIL PENCARIAN STATUS PENDAFTAR                                    -->
      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <?php if ($currentApplicant): ?>
        <div class="bg-white border border-gray-200 rounded-md p-5 sm:p-6 space-y-5">
          
          <!-- Baris Header: Nomor Registrasi & Badge Status -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 pb-4 gap-2">
            <div>
              <span class="text-xs text-gray-500 uppercase tracking-wide font-medium"><?= htmlspecialchars($L['lbl_code']) ?></span>
              <div class="text-2xl font-bold font-mono text-ccsHeading mt-0.5 tracking-wider"><?= htmlspecialchars($currentApplicant['application_number']) ?></div>
            </div>
            <div>
              <?php
                $statusVal = $currentApplicant['form_fee_status'] ?? 'pending';
                if ($statusVal === 'verified') {
                    $badgeClass = 'bg-emerald-50 text-emerald-800 border border-emerald-200';
                    $badgeIcon  = 'fas fa-check-circle text-emerald-600';
                    $badgeText  = $L['status_verified'];
                } elseif ($statusVal === 'proof_uploaded') {
                    $badgeClass = 'bg-sky-50 text-sky-800 border border-sky-200';
                    $badgeIcon  = 'fas fa-clock text-sky-600';
                    $badgeText  = $L['status_proof_uploaded'];
                } elseif ($statusVal === 'rejected') {
                    $badgeClass = 'bg-rose-50 text-rose-800 border border-rose-200';
                    $badgeIcon  = 'fas fa-times-circle text-rose-600';
                    $badgeText  = $L['status_rejected'];
                } else {
                    $badgeClass = 'bg-amber-50 text-amber-800 border border-amber-200';
                    $badgeIcon  = 'fas fa-hourglass-half text-amber-600';
                    $badgeText  = $L['status_pending'];
                }
              ?>
              <span class="px-3.5 py-1.5 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 <?= $badgeClass ?>">
                <i class="<?= $badgeIcon ?>"></i> <?= htmlspecialchars($badgeText) ?>
              </span>
            </div>
          </div>

          <!-- Rincian Calon Siswa & Tagihan Formulir -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm bg-slate-50 p-4 rounded-md border border-slate-200">
            <div>
              <span class="text-gray-500 block text-xs"><?= htmlspecialchars($L['lbl_student']) ?></span>
              <strong class="text-gray-900"><?= htmlspecialchars($currentApplicant['student_name']) ?></strong>
            </div>
            <div>
              <span class="text-gray-500 block text-xs"><?= htmlspecialchars($L['lbl_level_selected']) ?></span>
              <strong class="text-gray-900"><?= htmlspecialchars($currentApplicant['level_name'] ?? $currentApplicant['preferred_grade'] ?? '-') ?></strong>
            </div>
            <div>
              <span class="text-gray-500 block text-xs"><?= htmlspecialchars($L['lbl_form_fee']) ?></span>
              <strong class="text-ccsOrange font-mono font-bold text-base">
                Rp <?= number_format($currentApplicant['form_fee_amount'] ?? DEFAULT_FORM_FEE, 0, ',', '.') ?>
              </strong>
            </div>
          </div>

          <!-- ───────────────────────────────────────────────────────────── -->
          <!-- KONDISI A: BELUM VERIFIED (REKENING BANK & UPLOAD STRUK)       -->
          <!-- ───────────────────────────────────────────────────────────── -->
          <?php if (($currentApplicant['form_fee_status'] ?? '') !== 'verified'): ?>
            <div id="tempat-unggah" class="border-t border-gray-200 pt-5 space-y-4 scroll-mt-28">
              
              <!-- Info Rekening Bank Mayapada: Formal & Dignified (No AI gradient) -->
              <div class="bg-[#022c46] text-white p-5 rounded-md border border-[#0b4877] space-y-3">
                <div class="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-sm tracking-wide text-white"><?= htmlspecialchars(BANK_NAME) ?></span>
                  </div>
                  <span class="text-[11px] font-mono bg-white/10 px-2 py-0.5 rounded text-gray-200">IDR</span>
                </div>
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div>
                    <span class="text-[11px] text-gray-300 block"><?= htmlspecialchars($L['bank_card_rek']) ?></span>
                    <span class="text-lg font-mono font-bold tracking-wider text-white select-all"><?= htmlspecialchars(BANK_REK) ?></span>
                    <span class="text-xs text-gray-300 block mt-0.5"><?= htmlspecialchars($L['bank_card_an']) ?> <strong class="text-white"><?= htmlspecialchars(BANK_AN) ?></strong></span>
                  </div>
                  <button 
                    type="button" 
                    id="copyRekBtn"
                    onclick="copyRekeningNumber()" 
                    class="self-start sm:self-center px-3 py-1.5 rounded bg-white/15 hover:bg-white/25 text-xs font-semibold text-white transition flex items-center gap-1.5"
                  >
                    <i class="far fa-copy"></i> <span><?= htmlspecialchars($L['lbl_copy_rek'] ?? 'Salin') ?></span>
                  </button>
                </div>
                <div class="text-[11px] text-gray-300 pt-2 border-t border-white/10 flex flex-wrap items-center gap-1.5">
                  <span><?= htmlspecialchars($L['bank_card_remark']) ?> <strong class="text-white font-mono"><?= htmlspecialchars($currentApplicant['application_number']) ?> <?= htmlspecialchars($currentApplicant['student_name']) ?></strong></span>
                </div>
              </div>

              <!-- Alert Jika Bukti Ditolak -->
              <?php if (($currentApplicant['form_fee_status'] ?? '') === 'rejected'): ?>
                <div class="p-3.5 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800 flex items-center gap-2.5">
                  <i class="fas fa-exclamation-triangle text-rose-600 shrink-0"></i>
                  <span><?= htmlspecialchars($L['notice_rejected_msg']) ?></span>
                </div>
              <?php endif; ?>

              <!-- Form Upload Bukti Struk Transfer -->
              <div class="pt-2">
                <h3 class="text-sm font-bold text-ccsHeading">
                  <?= empty($currentApplicant['payment_proof_file']) ? htmlspecialchars($L['upload_title']) : htmlspecialchars($L['upload_title_re']) ?>
                </h3>
              </div>

              <form method="POST" action="status.php?cek=<?= urlencode($searchQuery) ?>&phone=<?= urlencode($searchPhone) ?>&lang=<?= $currLang ?>#tempat-unggah" enctype="multipart/form-data" class="space-y-4">
                <input type="hidden" name="csrf_token" value="<?= $_SESSION['csrf_token'] ?>">
                <input type="hidden" name="action_upload_proof" value="1">
                <input type="hidden" name="target_app_no" value="<?= htmlspecialchars($currentApplicant['application_number']) ?>">

                <div class="border border-dashed border-gray-300 hover:border-ccsOrange rounded-md p-6 text-center transition bg-slate-50/50">
                  <input 
                    type="file" 
                    name="payment_proof" 
                    id="paymentProofFile" 
                    required 
                    accept=".jpg,.jpeg,.png,.webp,.pdf" 
                    class="hidden" 
                    onchange="handleProofFileSelect(this)"
                  >
                  <label for="paymentProofFile" class="cursor-pointer block">
                    <span class="text-sm font-semibold text-ccsHeading block"><?= htmlspecialchars($L['upload_drag_title']) ?></span>
                    <span class="text-xs text-gray-500 block mt-1"><?= htmlspecialchars($L['upload_drag_hint']) ?></span>
                    <div id="proofFileNameDisplay" class="text-xs font-mono font-bold text-ccsOrange mt-2 hidden"></div>
                  </label>
                </div>

                <button 
                  type="submit" 
                  class="thm-btn w-full sm:w-auto"
                >
                  <i class="fas fa-upload mr-1"></i> <?= htmlspecialchars($L['btn_upload']) ?>
                </button>
              </form>

              <!-- Notifikasi Bukti Telah Diterima -->
              <?php if (!empty($currentApplicant['payment_proof_file'])): ?>
                <div class="p-3 bg-sky-50 border border-sky-200 rounded-md text-xs text-sky-900 flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <i class="fas fa-info-circle text-sky-600 shrink-0"></i>
                    <span><?= htmlspecialchars($L['notice_waiting_approval']) ?></span>
                  </div>
                  <a href="status.php?action=view_proof&file=<?= urlencode($currentApplicant['payment_proof_file']) ?>" target="_blank" class="text-ccsOrange font-semibold hover:underline ml-2 whitespace-nowrap">
                    <?= $L['btn_view_file'] ?>
                  </a>
                </div>
              <?php endif; ?>
            </div>

          <!-- ───────────────────────────────────────────────────────────── -->
          <!-- KONDISI B: SUDAH VERIFIED (FORMULIR BIODATA LENGKAP TERBUKA)   -->
          <!-- ───────────────────────────────────────────────────────────── -->
          <?php else: ?>
            <?php if (empty($currentApplicant['is_form_completed'])): ?>
              <div class="border-t border-gray-200 pt-5 space-y-5">
                <div class="border-b border-gray-200 pb-3">
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 mb-1 border border-emerald-200">
                    <i class="fas fa-check-circle text-emerald-600"></i> <?= htmlspecialchars($L['fullform_badge']) ?>
                  </span>
                  <h2 class="text-xl font-bold text-ccsHeading"><?= htmlspecialchars($L['fullform_title']) ?></h2>
                  <p class="text-xs text-gray-500 mt-0.5"><?= htmlspecialchars($L['fullform_subtitle']) ?></p>
                </div>

                <form method="POST" action="status.php?cek=<?= urlencode($searchQuery) ?>&phone=<?= urlencode($searchPhone) ?>&lang=<?= $currLang ?>" class="space-y-6">
                  <input type="hidden" name="csrf_token" value="<?= $_SESSION['csrf_token'] ?>">
                  <input type="hidden" name="action_complete_form" value="1">
                  <input type="hidden" name="target_app_no" value="<?= htmlspecialchars($currentApplicant['application_number']) ?>">

                  <!-- Bagian 1: Data Calon Siswa -->
                  <div class="space-y-4">
                    <h3 class="text-xs font-bold text-ccsHeading uppercase tracking-wider border-b border-gray-100 pb-2">
                      <?= htmlspecialchars($L['sec1_student']) ?>
                    </h3>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div class="sm:col-span-2">
                        <label class="school-label"><?= htmlspecialchars($L['lbl_student_name']) ?> <span class="text-rose-500">*</span></label>
                        <input type="text" name="student_name" required value="<?= htmlspecialchars($currentApplicant['student_name'] ?? '') ?>" class="school-input">
                      </div>
                      <div>
                        <label class="school-label"><?= htmlspecialchars($L['lbl_nickname']) ?></label>
                        <input type="text" name="student_nickname" value="<?= htmlspecialchars($currentApplicant['student_nickname'] ?? '') ?>" class="school-input">
                      </div>
                      <div>
                        <label class="school-label"><?= htmlspecialchars($L['lbl_gender']) ?> <span class="text-rose-500">*</span></label>
                        <select name="student_gender" required class="school-select">
                          <option value="male" <?= ($currentApplicant['student_gender'] ?? '') === 'male' ? 'selected' : '' ?>><?= htmlspecialchars($L['gender_male']) ?></option>
                          <option value="female" <?= ($currentApplicant['student_gender'] ?? '') === 'female' ? 'selected' : '' ?>><?= htmlspecialchars($L['gender_female']) ?></option>
                        </select>
                      </div>
                      <div>
                        <label class="school-label"><?= htmlspecialchars($L['lbl_birth_place']) ?></label>
                        <input type="text" name="student_birth_place" value="<?= htmlspecialchars($currentApplicant['student_birth_place'] ?? '') ?>" class="school-input">
                      </div>
                      <div>
                        <label class="school-label"><?= htmlspecialchars($L['lbl_birth_date']) ?> <span class="text-rose-500">*</span></label>
                        <input type="date" name="student_birth_date" required value="<?= htmlspecialchars($currentApplicant['student_birth_date'] ?? '') ?>" class="school-input">
                      </div>
                      <div>
                        <label class="school-label"><?= htmlspecialchars($L['lbl_religion']) ?></label>
                        <select name="student_religion" class="school-select">
                          <option value="">-- <?= htmlspecialchars($L['lbl_religion']) ?> --</option>
                          <?php foreach (['Kristen', 'Katolik', 'Islam', 'Buddha', 'Hindu', 'Konghucu', 'Lainnya'] as $rel): ?>
                            <option value="<?= $rel ?>" <?= ($currentApplicant['student_religion'] ?? '') === $rel ? 'selected' : '' ?>><?= $rel ?></option>
                          <?php endforeach; ?>
                        </select>
                      </div>
                      <div>
                        <label class="school-label"><?= htmlspecialchars($L['lbl_nationality']) ?></label>
                        <select name="student_nationality" class="school-select">
                          <option value="WNI" <?= ($currentApplicant['student_nationality'] ?? 'WNI') === 'WNI' ? 'selected' : '' ?>>WNI</option>
                          <option value="WNA" <?= ($currentApplicant['student_nationality'] ?? '') === 'WNA' ? 'selected' : '' ?>>WNA</option>
                        </select>
                      </div>
                      <div class="sm:col-span-2">
                        <label class="school-label"><?= htmlspecialchars($L['lbl_prev_school']) ?></label>
                        <input type="text" name="student_previous_school" value="<?= htmlspecialchars($currentApplicant['student_previous_school'] ?? '') ?>" class="school-input">
                      </div>
                      <div class="sm:col-span-2">
                        <label class="school-label"><?= htmlspecialchars($L['lbl_domicile']) ?></label>
                        <textarea name="student_domicile_address" rows="2" class="school-textarea"><?= htmlspecialchars($currentApplicant['student_domicile_address'] ?? '') ?></textarea>
                      </div>
                    </div>
                  </div>

                  <!-- Bagian 2: Data Orang Tua -->
                  <div class="space-y-4 pt-4 border-t border-gray-200">
                    <h3 class="text-xs font-bold text-ccsHeading uppercase tracking-wider border-b border-gray-100 pb-2">
                      <?= htmlspecialchars($L['sec2_parent']) ?>
                    </h3>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div class="sm:col-span-2">
                        <label class="school-label"><?= htmlspecialchars($L['lbl_parent_full']) ?> <span class="text-rose-500">*</span></label>
                        <input type="text" name="parent_name" required value="<?= htmlspecialchars($currentApplicant['parent_name'] ?? '') ?>" class="school-input">
                      </div>
                      <div>
                        <label class="school-label"><?= htmlspecialchars($L['lbl_parent_phone']) ?> <span class="text-rose-500">*</span></label>
                        <input type="tel" name="parent_phone" required value="<?= htmlspecialchars($currentApplicant['parent_phone'] ?? '') ?>" class="school-input">
                      </div>
                      <div>
                        <label class="school-label"><?= htmlspecialchars($L['lbl_parent_email']) ?> <span class="text-rose-500">*</span></label>
                        <input type="email" name="parent_email" required value="<?= htmlspecialchars($currentApplicant['parent_email'] ?? '') ?>" class="school-input">
                      </div>
                      <div>
                        <label class="school-label"><?= htmlspecialchars($L['lbl_nik']) ?></label>
                        <input type="text" name="parent_nik" value="<?= htmlspecialchars($currentApplicant['parent_nik'] ?? '') ?>" class="school-input">
                      </div>
                      <div>
                        <label class="school-label"><?= htmlspecialchars($L['lbl_occupation']) ?></label>
                        <input type="text" name="parent_occupation" value="<?= htmlspecialchars($currentApplicant['parent_occupation'] ?? '') ?>" class="school-input">
                      </div>
                      <div class="sm:col-span-2">
                        <label class="school-label"><?= htmlspecialchars($L['lbl_notes']) ?></label>
                        <textarea name="additional_notes" rows="2" class="school-textarea"><?= htmlspecialchars($currentApplicant['additional_notes'] ?? '') ?></textarea>
                      </div>
                    </div>
                  </div>

                  <div class="pt-2">
                    <button 
                      type="submit" 
                      class="thm-btn w-full sm:w-auto"
                    >
                      <i class="fas fa-save mr-1"></i> <?= htmlspecialchars($L['btn_save_fullform']) ?>
                    </button>
                  </div>
                </form>
              </div>

            <?php else: ?>
              <!-- TANDA TERIMA FORMULIR LENGKAP SELESAI -->
              <div class="bg-white border border-gray-200 rounded-md p-6 text-center space-y-3">
                <div class="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 mx-auto flex items-center justify-center text-2xl border border-emerald-200">
                  <i class="fas fa-check"></i>
                </div>
                <h2 class="text-xl font-bold text-ccsHeading"><?= htmlspecialchars($L['receipt_title']) ?></h2>
                <p class="text-xs text-gray-500 max-w-md mx-auto"><?= htmlspecialchars($L['receipt_desc']) ?></p>

                <div class="p-4 bg-slate-50 rounded-md border border-slate-200 max-w-sm mx-auto text-left text-xs space-y-1.5 text-gray-700">
                  <div><strong><?= htmlspecialchars($L['lbl_code']) ?>:</strong> <span class="font-mono text-ccsHeading font-bold"><?= htmlspecialchars($currentApplicant['application_number']) ?></span></div>
                  <div><strong><?= htmlspecialchars($L['lbl_level_selected']) ?>:</strong> <?= htmlspecialchars($currentApplicant['level_name'] ?? $currentApplicant['preferred_grade'] ?? '') ?></div>
                  <div><strong>Status:</strong> <span class="text-emerald-700 font-semibold"><i class="fas fa-check-circle mr-1"></i> <?= htmlspecialchars($L['receipt_status']) ?></span></div>
                </div>

                <p class="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                  <?= htmlspecialchars($L['receipt_contact_soon']) ?>
                </p>
              </div>
            <?php endif; ?>
          <?php endif; ?>

        </div>
      <?php endif; ?>

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
  <!-- 6. LOGIKA JAVASCRIPT: COPY REK, PREVIEW FILE, AUTO SCROLL               -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <script>
    const currentLang = "<?= $currLang ?>";

    // Salin Nomor Rekening
    function copyRekeningNumber() {
      const rek = "<?= htmlspecialchars(BANK_REK) ?>";
      navigator.clipboard.writeText(rek).then(() => {
        const btn = document.getElementById('copyRekBtn');
        const copiedLabel = currentLang === 'en' ? 'Copied!' : (currentLang === 'cn' ? '已复制！' : 'Tersalin!');
        if (btn) {
          const orig = btn.innerHTML;
          btn.innerHTML = '<i class="fas fa-check text-emerald-400"></i> ' + copiedLabel;
          setTimeout(() => { btn.innerHTML = orig; }, 2000);
        } else {
          alert(copiedLabel);
        }
      }).catch(() => {
        alert("Nomor Rekening: " + rek);
      });
    }

    // Preview File Bukti Transfer
    function handleProofFileSelect(input) {
      const disp = document.getElementById('proofFileNameDisplay');
      if (input.files && input.files[0]) {
        const file = input.files[0];
        const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
        if (disp) {
          disp.textContent = `✓ ${file.name} (${sizeMb} MB)`;
          disp.classList.remove('hidden');
        }
      }
    }

    // Auto-scroll halus ke tempat unggah jika ada hash atau target
    window.addEventListener('load', function() {
      var hash = window.location.hash;
      var target = null;
      if (hash) {
        try {
          target = document.querySelector(hash);
        } catch(e) {}
      }
      <?php if ($currentApplicant): ?>
      if (!target) {
        target = document.getElementById('tempat-unggah') || document.getElementById('cek-status');
      }
      <?php endif; ?>

      if (target) {
        setTimeout(function() {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 250);
      }
    });
  </script>

</body>
</html>
