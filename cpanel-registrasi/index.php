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
        'nav_court' => 'Sewa Lapangan',
        'btn_check_status' => 'Cek Status Pendaftaran',
        'btn_back_form' => 'Kembali ke Formulir',

        // Form Section
        'form_title' => 'Formulir Pendaftaran Siswa Baru',
        'form_subtitle' => 'Silakan lengkapi 4 data awal di bawah ini untuk mendapatkan Nomor Registrasi resmi dan rincian rekening formulir.',
        'step1_title' => 'Pilihan Jenjang Pendidikan',
        'lbl_level' => 'Jenjang Pendidikan',
        'ph_level' => '-- Pilih Jenjang Pendidikan --',
        'step2_title' => 'Data Calon Siswa',
        'lbl_student_name' => 'Nama Lengkap Calon Siswa',
        'hint_student_name' => 'Tuliskan nama lengkap ananda sesuai dokumen akta kelahiran.',
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
        'btn_check_this' => 'Cek Status & Unggah Bukti Bayar',

        // Cek Status Section (1:1 Mirip Sewa Lapangan)
        'status_section_title' => 'Cek Status Pendaftaran Siswa Baru',
        'status_section_desc' => 'Gunakan nomor registrasi atau alamat email terdaftar untuk mengecek status verifikasi berkas dan mengunggah bukti pembayaran formulir.',
        'status_input_ph' => 'Contoh: CCS-ADM-2609-001 atau Email',
        'btn_check' => 'Cek Status',
        'status_verified' => 'Disetujui (Lunas)',
        'status_proof_uploaded' => 'Verifikasi Bukti Struk',
        'status_rejected' => 'Bukti Ditolak',
        'status_pending' => 'Menunggu Pembayaran',
        'dash_status_lbl' => 'Status Pendaftaran:',

        // Kartu Rekening Bank
        'bank_card_title' => 'Rekening Resmi Sekolah',
        'bank_card_nom' => 'Nominal Pembelian Formulir',
        'bank_card_rek' => 'Nomor Rekening Bank',
        'bank_card_an' => 'Atas Nama:',
        'bank_card_remark' => 'Berita Transfer:',
        'btn_copy' => 'Salin',
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

        // Formulir Lengkap (Ketika verified)
        'fullform_badge' => 'Pembayaran Formulir Telah Diverifikasi',
        'fullform_title' => 'Formulir Detail Calon Siswa & Orang Tua',
        'fullform_subtitle' => 'Silakan lengkapi seluruh data siswa dan orang tua di bawah ini untuk tahapan observasi dan administrasi sekolah.',
        'sec1_student' => '1. Biodata Lengkap Calon Siswa',
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
        'lbl_nik' => 'NIK Orang Tua (KTP/Paspor)',
        'lbl_occupation' => 'Pekerjaan Orang Tua',
        'lbl_notes' => 'Catatan Tambahan (Kondisi Khusus / Riwayat Belajar)',
        'btn_save_fullform' => 'Simpan Formulir Pendaftaran Lengkap',

        // Tanda Terima Selesai
        'receipt_title' => 'Formulir Pendaftaran Lengkap Telah Diterima!',
        'receipt_desc' => 'Seluruh data calon siswa telah tersimpan resmi di sistem Chung Chung Christian School.',
        'receipt_status' => 'Pembayaran Lunas & Data Lengkap',
        'receipt_contact_soon' => 'Tim Admissions CCS akan segera menghubungi nomor WhatsApp Anda untuk konfirmasi jadwal observasi dan tes penempatan.',

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
        'nav_court' => 'Court Rental',
        'btn_check_status' => 'Check Admission Status',
        'btn_back_form' => 'Back to Registration Form',

        // Form Section
        'form_title' => 'New Student Registration Form',
        'form_subtitle' => 'Please complete the initial details below to receive your official Registration Code and payment account information.',
        'step1_title' => 'Target Educational Program',
        'lbl_level' => 'Educational Program',
        'ph_level' => '-- Select Educational Program --',
        'step2_title' => 'Student Candidate Details',
        'lbl_student_name' => 'Student Candidate Full Name',
        'hint_student_name' => 'Please write the child\'s full legal name as in birth certificate or passport.',
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
        'btn_check_this' => 'Check Status & Upload Payment Proof',

        // Cek Status Section (1:1 Mirip Sewa Lapangan)
        'status_section_title' => 'Check New Student Admission Status',
        'status_section_desc' => 'Enter your registration number or registered email to check document status and upload your form payment receipt.',
        'status_input_ph' => 'Example: CCS-ADM-2609-001 or Email',
        'btn_check' => 'Check Status',
        'status_verified' => 'Approved (Verified)',
        'status_proof_uploaded' => 'Verifying Payment Receipt',
        'status_rejected' => 'Receipt Rejected',
        'status_pending' => 'Pending Form Payment',
        'dash_status_lbl' => 'Admission Status:',

        // Kartu Rekening Bank
        'bank_card_title' => 'Official School Bank Account',
        'bank_card_nom' => 'Application Form Fee Amount',
        'bank_card_rek' => 'Bank Account Number',
        'bank_card_an' => 'Beneficiary Name:',
        'bank_card_remark' => 'Transfer Remarks:',
        'btn_copy' => 'Copy',
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

        // Full Form
        'fullform_badge' => 'Application Form Payment Verified',
        'fullform_title' => 'Complete Student & Parent Background Form',
        'fullform_subtitle' => 'Please complete all details below for academic observation and school enrollment procedures.',
        'sec1_student' => '1. Student Personal Information',
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
        'lbl_nik' => 'Parent ID / Passport Number',
        'lbl_occupation' => 'Occupation',
        'lbl_notes' => 'Additional Notes (Special Needs / Learning History)',
        'btn_save_fullform' => 'Save & Submit Complete Form',

        // Receipt Done
        'receipt_title' => 'Complete Application Form Received!',
        'receipt_desc' => 'All candidate background details have been recorded in Chung Chung Christian School\'s official database.',
        'receipt_status' => 'Payment Settled & Data Complete',
        'receipt_contact_soon' => 'The CCS Admissions team will contact your WhatsApp number shortly to schedule the student observation and parent interview.',

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
        'nav_court' => '场地租赁',
        'btn_check_status' => '查询报名审核状态',
        'btn_back_form' => '返回报名表单',

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
        'btn_check_this' => '查询状态并上传付款凭证',

        // Cek Status Section (1:1 Mirip Sewa Lapangan)
        'status_section_title' => '查询新生入学报名状态',
        'status_section_desc' => '使用您的官方报名编号或已填写的电子邮箱，查询审核状态或上传报名表格付款凭证。',
        'status_input_ph' => '例如：CCS-ADM-2609-001 或电子邮箱',
        'btn_check' => '查询状态',
        'status_verified' => '已审核批准 (已缴费)',
        'status_proof_uploaded' => '凭证审核中',
        'status_rejected' => '凭证被驳回',
        'status_pending' => '等待支付报名表费用',
        'dash_status_lbl' => '报名审核状态：',

        // Kartu Rekening Bank
        'bank_card_title' => '学校官方指定收款账户',
        'bank_card_nom' => '报名表格购买费用',
        'bank_card_rek' => '银行账号',
        'bank_card_an' => '账户户名：',
        'bank_card_remark' => '转账附言：',
        'btn_copy' => '复制',
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

        // Full Form
        'fullform_badge' => '报名表格费用已审核确认',
        'fullform_title' => '学生及家庭详细背景信息表',
        'fullform_subtitle' => '请填写以下完整的学生与家庭信息，以供学校安排后续观察面试及正式入学建档。',
        'sec1_student' => '1. 学生个人详细资料',
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
        'lbl_nik' => '家长身份证号 / 护照号',
        'lbl_occupation' => '职业',
        'lbl_notes' => '补充说明 (特殊情况或过往学习经历)',
        'btn_save_fullform' => '保存并提交完整报名资料',

        // Receipt Done
        'receipt_title' => '完整报名表已成功接收！',
        'receipt_desc' => '学生所有详细资料已完整录入并安全归档于崇崇基督教学校官方管理系统。',
        'receipt_status' => '费用结清 & 资料完整',
        'receipt_contact_soon' => 'CCS 招生团队将尽快通过 WhatsApp 与您联系安排后续入学观察及面谈时间。',

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

// ─── 5. AMBIL MASTER GELOMBANG & JENJANG DARI SUPABASE ──────────────────────
$feeResponse = callNextJsApi('GET', ['action' => 'get_active_fee']);
$activeWave = (!empty($feeResponse['success']) && !empty($feeResponse['data']))
    ? $feeResponse['data']
    : [
        'wave_name' => 'Gelombang 1 (Early Bird)',
        'amount' => DEFAULT_FORM_FEE,
        'effective_until' => date('Y-m-d', strtotime('+30 days'))
    ];

$levelsResponse = callNextJsApi('GET', ['action' => 'get_levels']);
$serverLevels = (!empty($levelsResponse['success']) && !empty($levelsResponse['data']))
    ? $levelsResponse['data']
    : [];

$standardLevels = ['Early Years (Nursery & Kindergarten)', 'Elementary (IB PYP SD)', 'Middle School (SMP)', 'High School (SMA)'];

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

// ─── 7. PROSES UPLOAD BUKTI TRANSFER DARI HASIL PENCARIAN / STATUS ──────────
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

// ─── 8. PROSES SIMPAN FORMULIR LENGKAP (KONDISIONAL HANYA JIKA VERIFIED) ────
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

// ─── 9. PENCARIAN STATUS PENDAFTARAN (1:1 DENGAN SEWA LAPANGAN) ─────────────
$searchQuery = trim($_GET['cek'] ?? ($_SESSION['applicant_app_no'] ?? ''));
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
            $searchError = "Data pendaftaran dengan kata kunci '{$searchQuery}' tidak ditemukan.";
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
  <!-- 1. TOP BAR BAHASA RESMI CCS (ENGLISH | BAHASA | 中文) 1:1 SEWA LAPANGAN -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <div class="bg-ccsNavy text-white py-2">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-end">
      <!-- Sisi Kanan: Multi-Bahasa (English | Bahasa | 中文) -->
      <div class="flex items-center gap-3 text-[13px] font-medium text-gray-200">
        <a 
          href="?lang=en<?= !empty($searchQuery) ? '&cek=' . urlencode($searchQuery) : '' ?>" 
          class="<?= $currLang === 'en' ? 'text-ccsOrangeLight font-semibold' : 'hover:text-ccsOrangeLight transition' ?>"
        >
          English
        </a>
        <span class="text-gray-500">|</span>
        <a 
          href="?lang=id<?= !empty($searchQuery) ? '&cek=' . urlencode($searchQuery) : '' ?>" 
          class="<?= $currLang === 'id' ? 'text-ccsOrangeLight font-semibold' : 'hover:text-ccsOrangeLight transition' ?>"
        >
          Bahasa
        </a>
        <span class="text-gray-500">|</span>
        <a 
          href="?lang=cn<?= !empty($searchQuery) ? '&cek=' . urlencode($searchQuery) : '' ?>" 
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

      <!-- Menu Navigasi: Home, Formulir Pendaftaran, Cek Status -->
      <nav class="flex items-center gap-8 text-[15px] font-medium">
        <a href="https://ccs.sch.id/" class="text-gray-800 hover:text-ccsOrange transition-colors">
          <?= htmlspecialchars($L['nav_home']) ?>
        </a>
        <a href="#form-pendaftaran" class="text-ccsOrange font-semibold border-b-2 border-ccsOrange pb-1 transition-colors">
          <?= htmlspecialchars($L['nav_admission']) ?>
        </a>
        <a href="#cek-status" class="text-gray-800 hover:text-ccsOrange transition-colors">
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
  <!-- 3. KONTEN UTAMA HALAMAN                                                 -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <main class="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-10">

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
          <div class="sm:col-span-2 pt-3 border-t border-slate-200 flex items-center justify-between">
            <span class="text-gray-600 text-xs font-medium"><?= htmlspecialchars($L['lbl_form_fee']) ?></span>
            <strong class="text-ccsOrange font-mono font-bold text-lg">
              Rp <?= number_format($successReg['form_fee_amount'] ?? DEFAULT_FORM_FEE, 0, ',', '.') ?>
            </strong>
          </div>
        </div>

        <div class="space-y-3 pt-2">
          <a href="?cek=<?= urlencode($successReg['application_number']) ?>&lang=<?= $currLang ?>#cek-status" class="thm-btn w-full sm:w-auto">
            <i class="fas fa-eye mr-1.5"></i> <?= htmlspecialchars($L['btn_check_this']) ?>
          </a>
          <div>
            <a href="?lang=<?= $currLang ?>" class="text-xs text-gray-500 hover:text-ccsNavy underline"><?= htmlspecialchars($L['btn_back_form']) ?></a>
          </div>
        </div>
      </div>
    <?php endif; ?>

    <!-- ═════════════════════════════════════════════════════════════════════ -->
    <!-- SECTION 1: FORMULIR PENDAFTARAN SISWA BARU (BERSIH & INSTITUSIONAL)  -->
    <!-- ═════════════════════════════════════════════════════════════════════ -->
    <section id="form-pendaftaran" class="bg-white border border-gray-200 rounded-md p-6 sm:p-8 space-y-6 shadow-xs">
      
      <!-- Header Form Institusional Bersih -->
      <div class="border-b border-gray-200 pb-4">
        <h2 class="text-2xl font-bold text-ccsHeading"><?= htmlspecialchars($L['form_title']) ?></h2>
      </div>

      <form method="POST" id="registrationForm" class="space-y-6" novalidate>
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
          <h3 class="text-sm font-bold text-ccsHeading">
            2. <?= htmlspecialchars($L['step2_title']) ?>
          </h3>
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
          <h3 class="text-sm font-bold text-ccsHeading">
            3. <?= htmlspecialchars($L['step3_title']) ?>
          </h3>

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
          <h3 class="text-sm font-bold text-ccsHeading">
            4. <?= htmlspecialchars($L['step4_title']) ?>
          </h3>

          <div class="bg-slate-50 border border-slate-200 rounded-md p-4 sm:p-5 space-y-3">
            <h4 class="font-semibold text-ccsHeading text-xs uppercase tracking-wide">
              <?= htmlspecialchars($L['rules_header']) ?>
            </h4>
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

    <!-- ═════════════════════════════════════════════════════════════════════ -->
    <!-- SECTION 2: CEK STATUS PENDAFTARAN (INSTITUSIONAL & BERSIH)            -->
    <!-- ═════════════════════════════════════════════════════════════════════ -->
    <section id="cek-status" class="bg-white border border-gray-200 rounded-md p-6 sm:p-8 shadow-xs space-y-6">
      <div class="border-b border-gray-200 pb-3">
        <h2 class="text-2xl font-bold text-ccsHeading"><?= htmlspecialchars($L['status_section_title']) ?></h2>
        <p class="text-xs text-gray-500 mt-1"><?= htmlspecialchars($L['status_section_desc'] ?? '') ?></p>
      </div>

      <!-- Search Form -->
      <form method="GET" class="flex flex-wrap sm:flex-nowrap gap-2.5 max-w-2xl">
        <input type="hidden" name="lang" value="<?= htmlspecialchars($currLang) ?>" />
        <input
          type="text"
          name="cek"
          value="<?= htmlspecialchars($searchQuery) ?>"
          placeholder="<?= htmlspecialchars($L['status_input_ph']) ?>"
          required
          class="school-input uppercase font-medium"
        />
        <input
          type="tel"
          name="phone"
          value="<?= htmlspecialchars($searchPhone) ?>"
          placeholder="<?= htmlspecialchars($L['lbl_parent_phone']) ?>"
          class="school-input sm:w-56"
        />
        <button type="submit" class="thm-btn px-6 py-2.5 whitespace-nowrap text-xs font-semibold shrink-0">
          <?= htmlspecialchars($L['btn_check']) ?>
        </button>
      </form>

      <?php if (!empty($searchError)): ?>
        <div class="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md max-w-2xl flex items-center gap-2">
          <i class="fas fa-exclamation-circle text-rose-500 shrink-0"></i>
          <span><?= htmlspecialchars($searchError) ?></span>
        </div>
      <?php endif; ?>

      <!-- Hasil Pencarian Status Pendaftar -->
      <?php if ($currentApplicant): ?>
        <div class="bg-white border border-gray-200 rounded-md p-5 sm:p-6 space-y-5 max-w-3xl">
          
          <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 pb-4 gap-2">
            <div>
              <span class="text-xs text-gray-500 uppercase tracking-wide font-medium"><?= htmlspecialchars($L['lbl_code']) ?></span>
              <div class="text-xl font-bold font-mono text-ccsHeading mt-0.5"><?= htmlspecialchars($currentApplicant['application_number']) ?></div>
            </div>
            <div>
              <?php
                $statusVal = $currentApplicant['form_fee_status'] ?? 'pending';
                if ($statusVal === 'verified') {
                    $badgeClass = 'bg-emerald-50 text-emerald-800 border border-emerald-200';
                    $badgeText = $L['status_verified'];
                } elseif ($statusVal === 'proof_uploaded') {
                    $badgeClass = 'bg-sky-50 text-sky-800 border border-sky-200';
                    $badgeText = $L['status_proof_uploaded'];
                } elseif ($statusVal === 'rejected') {
                    $badgeClass = 'bg-rose-50 text-rose-800 border border-rose-200';
                    $badgeText = $L['status_rejected'];
                } else {
                    $badgeClass = 'bg-amber-50 text-amber-800 border border-amber-200';
                    $badgeText = $L['status_pending'];
                }
              ?>
              <span class="px-3 py-1 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 <?= $badgeClass ?>">
                <?= htmlspecialchars($badgeText) ?>
              </span>
            </div>
          </div>

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
              <strong class="text-ccsOrange font-mono font-bold">
                Rp <?= number_format($currentApplicant['form_fee_amount'] ?? DEFAULT_FORM_FEE, 0, ',', '.') ?>
              </strong>
            </div>
          </div>

          <!-- KONDISI A: FORMULIR BELUM VERIFIED (TAMPILKAN FORM UPLOAD STRUK) -->
          <?php if (($currentApplicant['form_fee_status'] ?? '') !== 'verified'): ?>
            <div class="border-t border-gray-200 pt-5 space-y-4">
              <!-- Informasi Rekening Bank Mayapada: Tampilan Formal & Dignified (No AI gradient) -->
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
                    <i class="far fa-copy"></i> <span><?= htmlspecialchars($L['lbl_copy_rek']) ?></span>
                  </button>
                </div>
                <div class="text-[11px] text-gray-300 pt-2 border-t border-white/10 flex flex-wrap items-center gap-1.5">
                  <span><?= htmlspecialchars($L['bank_card_remark']) ?> <strong class="text-white font-mono"><?= htmlspecialchars($currentApplicant['application_number']) ?> <?= htmlspecialchars($currentApplicant['student_name']) ?></strong></span>
                </div>
              </div>

              <div class="pt-2">
                <h4 class="text-sm font-bold text-ccsHeading">
                  <?= empty($currentApplicant['payment_proof_file']) ? htmlspecialchars($L['upload_title']) : htmlspecialchars($L['upload_title_re']) ?>
                </h4>
              </div>

              <form method="POST" enctype="multipart/form-data" class="space-y-4">
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
                  <?= htmlspecialchars($L['btn_upload']) ?>
                </button>
              </form>

              <?php if (!empty($currentApplicant['payment_proof_file'])): ?>
                <div class="p-3 bg-sky-50 border border-sky-200 rounded-md text-xs text-sky-900 flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <i class="fas fa-info-circle text-sky-600 shrink-0"></i>
                    <span><?= htmlspecialchars($L['notice_waiting_approval']) ?></span>
                  </div>
                  <a href="?action=view_proof&file=<?= urlencode($currentApplicant['payment_proof_file']) ?>" target="_blank" class="text-ccsOrange font-semibold hover:underline ml-2 whitespace-nowrap">
                    <?= $L['btn_view_file'] ?>
                  </a>
                </div>
              <?php endif; ?>
            </div>

          <!-- KONDISI B: SUDAH VERIFIED (FORMULIR DETAIL TERBUKA) -->
          <?php else: ?>
            <?php if (empty($currentApplicant['is_form_completed'])): ?>
              <div class="border-t border-gray-200 pt-5 space-y-5">
                <div class="border-b border-gray-200 pb-3">
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 mb-1 border border-emerald-200">
                    <i class="fas fa-check-circle text-emerald-600"></i> <?= htmlspecialchars($L['fullform_badge']) ?>
                  </span>
                  <h3 class="text-xl font-bold text-ccsHeading"><?= htmlspecialchars($L['fullform_title']) ?></h3>
                  <p class="text-xs text-gray-500 mt-0.5"><?= htmlspecialchars($L['fullform_subtitle']) ?></p>
                </div>

                <form method="POST" class="space-y-6">
                  <input type="hidden" name="csrf_token" value="<?= $_SESSION['csrf_token'] ?>">
                  <input type="hidden" name="action_complete_form" value="1">
                  <input type="hidden" name="target_app_no" value="<?= htmlspecialchars($currentApplicant['application_number']) ?>">

                  <!-- Bagian 1: Data Siswa -->
                  <div class="space-y-4">
                    <h4 class="text-xs font-bold text-ccsHeading uppercase tracking-wider border-b border-gray-100 pb-2">
                      <?= htmlspecialchars($L['sec1_student']) ?>
                    </h4>
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
                    <h4 class="text-xs font-bold text-ccsHeading uppercase tracking-wider border-b border-gray-100 pb-2">
                      <?= htmlspecialchars($L['sec2_parent']) ?>
                    </h4>
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
                      <?= htmlspecialchars($L['btn_save_fullform']) ?>
                    </button>
                  </div>
                </form>
              </div>

            <?php else: ?>
              <!-- TANDA TERIMA FORMULIR LENGKAP SELESAI -->
              <div class="bg-white border border-gray-200 rounded-md p-6 text-center space-y-3">
                <div class="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 mx-auto flex items-center justify-center text-xl border border-emerald-200">
                  <i class="fas fa-check"></i>
                </div>
                <h3 class="text-xl font-bold text-ccsHeading"><?= htmlspecialchars($L['receipt_title']) ?></h3>
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
  <!-- 7. LOGIKA JAVASCRIPT: COPY REK, PREVIEW FILE, VALIDASI INTERAKTIF      -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <script>
    const currentLang = "<?= $currLang ?>";

    // ─── SALIN NOMOR REKENING ─────────────────────────────────────────────
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

    // ─── PREVIEW FILE BUKTI TRANSFER ──────────────────────────────────────
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
