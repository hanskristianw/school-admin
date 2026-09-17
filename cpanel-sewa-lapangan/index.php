<?php
/**
 * ==============================================================================
 * SISTEM PERSEWAAN SPORT HALL CCS — CHUNG CHUNG CHRISTIAN SCHOOL
 * Yayasan Pendidikan Mayapada
 * ==============================================================================
 * Standalone PHP 7.4 - 8.3 Application
 * Template & Styling: Authentic Chung Chung Christian School (ccs.sch.id)
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// ─── 0. SISTEM MULTI-BAHASA (INDONESIA, ENGLISH, CHINESE) ─────────────
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
        'nav_home' => 'Home',
        'nav_rental' => 'Sewa Lapangan',
        'title' => 'Persewaan Lapangan CCS',
        'btn_check_status' => 'Cek Status Booking',
        'btn_back_form' => 'Kembali ke Formulir',
        'price_list_title' => 'Price List Persewaan Lapangan CCS',
        'pkg1_name' => 'PRICE LIST - 1 Persewaan Lapangan CCS',
        'pkg1_opt' => 'PRICE LIST - 1 (Penggunaan AC 2 Unit)',
        'pkg1_benefits' => [
            'Sport hall / 2 jam',
            'Penggunaan lampu',
            'Penggunaan AC ( 2 unit)'
        ],
        'pkg2_name' => 'PRICE LIST - 2 Persewaan Lapangan CCS',
        'pkg2_opt' => 'PRICE LIST - 2 (Tanpa AC)',
        'pkg2_benefits' => [
            'Sport hall / 2 jam',
            'Penggunaan lampu',
            'Tanpa penggunaan AC'
        ],
        'btn_select_pkg' => 'Pilih Paket Ini',
        'form_title' => 'Formulir Sewa Lapangan',
        'step1_title' => 'Pilihan Paket Sewa',
        'step2_title' => 'Pilih Tanggal & Sesi Jam Bermain',
        'lbl_date' => 'Tanggal Sewa',
        'lbl_slots' => 'Pilihan Sesi Jam (Durasi 2 Jam Penuh)',
        'notice_select_date' => 'Pilih tanggal terlebih dahulu untuk melihat ketersediaan jadwal.',
        'notice_loading' => 'Memeriksa ketersediaan jadwal lapangan...',
        'slot_available' => 'Tersedia',
        'slot_school_event' => 'Kegiatan Sekolah',
        'slot_booked' => 'Sudah Dipesan',
        'step3_title' => 'Data Identitas Penanggung Jawab',
        'lbl_name' => 'Nama Lengkap Pemesan',
        'lbl_phone' => 'No. WhatsApp Aktif',
        'hint_phone' => 'Konfirmasi dan bukti booking dikirim ke nomor ini.',
        'lbl_email' => 'Alamat Email',
        'hint_email' => 'Harap mengisi alamat email dengan benar karena segala bentuk konfirmasi akan dilakukan by email.',
        'lbl_org' => 'Nama Klub / Komunitas / Instansi',
        'lbl_purpose' => 'Tujuan Penggunaan Lapangan',
        'step4_title' => 'Ketentuan & Tata Tertib Sewa Lapangan',
        'rules_header' => 'Ketentuan Sewa Lapangan:',
        'agree_rules' => 'Saya telah membaca dan menyetujui seluruh <strong>Ketentuan Sewa Lapangan</strong> di atas, termasuk kewajiban menjaga kebersihan (denda Rp 50.000 jika kotor) dan larangan merokok di area lapangan dan sekolah.',
        'step5_title' => 'Informasi Pembayaran Bank Mayapada',
        'lbl_copy_rek' => 'Salin No. Rekening',
        'lbl_proof' => 'Upload Bukti Transfer (Wajib):',
        'hint_proof' => 'Bukti transfer wajib diunggah. Format file: JPG, PNG, WEBP, atau PDF (maksimal 5 MB).',
        'modal_error_title' => 'Periksa Kembali Formulir Anda',
        'modal_error_desc' => 'Terdapat beberapa data wajib yang belum diisi atau belum sesuai. Mohon lengkapi bagian berikut:',
        'modal_error_btn' => 'Lengkapi Formulir Sekarang',
        'btn_submit' => 'Ajukan Permohonan Sewa Lapangan',
        'status_section_title' => 'Cek Status Pemesanan Lapangan',
        'status_input_ph' => 'Contoh: CCS-2609-ABC123',
        'btn_check' => 'Cek Status',
        'lbl_code' => 'Kode Reservasi',
        'rules' => [
            'Area lapangan hanya bisa disewa diluar jam sekolah dan diluar kegiatan sekolah.',
            'Jika ada kegiatan sekolah secara mendadak maka opsi pilihan hari tidak akan muncul pada website booking.',
            'Penyewa menyetujui untuk tidak meninggalkan barang apapun di area lapangan/area sekolah.',
            'Pihak Sekolah tidak akan bertanggung jawab atas kehilangan barang apapun.',
            'Penyewa diminta untuk meninggalkan area lapangan dan sekolah dalam kondisi bersih seperti semula, jika tidak maka akan ada denda sebesar Rp 50.000 sebelum penyewa meninggalkan area sekolah.',
            'Pengunaan AC atau lampu dan atau keduanya dinyalakan sesuai dengan jam sewa.',
            'Dilarang merokok di area lapangan dan sekolah.',
            'Segala bentuk kerusakan yang terjadi selama durasi sewa, maka penyewa wajib mengganti rugi sesuai dengan biaya perbaikan kerusakan.',
            'Pembayaran sewa wajib dilakukan sebelum lapangan digunakan. Biaya sewa dapat ditransfer ke rekening berikut : Yayasan Pendidikan Mayapada, Nomor Rekening : 100-3000-3853. Mohon mencantumkan keterangan transfer : KodeBooking_NamaPenyewa.',
            'Status booking lapangan akan berubah menjadi sukses, ketika penyewa sudah upload bukti pembayaran dan mendapat email konfirmasi penyewaan lapangan.',
            'Harap mengisi alamat email dengan benar karena segala bentuk konfirmasi akan dilakukan by email. Apabila tidak terdapat konfirmasi melalui email, maka reservasi dianggap belum disetujui, sehingga penyewa tidak diizinkan memasuki area lapangan.',
            'Khusus untuk penyewaan lapangan dalam rangka event atau kegiatan dengan durasi sewa yang lebih lama, silakan menghubungi Contact Person: +62 859-5986-0430.',
            'Proses booking lapangan hanya dapat dilakukan pada hari kerja, Senin-Jumat pukul 08.00-16.00. Pesanan yang masuk di luar jam operasional akan diproses pada hari kerja berikutnya. Khusus pesanan yang masuk pada hari Jumat di luar jam operasional, proses akan dilakukan pada hari Senin.',
            'Perubahan atau penjadwalan ulang sewa tidak diperkenankan. Penyewa wajib memastikan dan memeriksa kembali jadwal yang dipilih sebelum melakukan pembayaran.',
            'Dengan hormat kami informasikan bahwa mulai Juli 2026 telah dilakukan penyesuaian tarif sewa lapangan.'
        ]
    ],
    'en' => [
        'nav_home' => 'Home',
        'nav_rental' => 'Court Rental',
        'title' => 'CCS Court Rental',
        'btn_check_status' => 'Check Booking Status',
        'btn_back_form' => 'Back to Form',
        'price_list_title' => 'CCS Court Rental Price List',
        'pkg1_name' => 'PRICE LIST - 1 CCS Court Rental',
        'pkg1_opt' => 'PRICE LIST - 1 (With 2 AC Units)',
        'pkg1_benefits' => [
            'Sport hall / 2 hours',
            'Lighting included',
            'Air Conditioning (2 units)'
        ],
        'pkg2_name' => 'PRICE LIST - 2 CCS Court Rental',
        'pkg2_opt' => 'PRICE LIST - 2 (Without AC)',
        'pkg2_benefits' => [
            'Sport hall / 2 hours',
            'Lighting included',
            'Without Air Conditioning'
        ],
        'btn_select_pkg' => 'Select This Package',
        'form_title' => 'Court Rental Booking Form',
        'step1_title' => 'Rental Package Option',
        'step2_title' => 'Select Date & Playing Time Slot',
        'lbl_date' => 'Rental Date',
        'lbl_slots' => 'Time Slot (Full 2-Hour Duration)',
        'notice_select_date' => 'Please select a date first to view schedule availability.',
        'notice_loading' => 'Checking court schedule availability...',
        'slot_available' => 'Available',
        'slot_school_event' => 'School Event',
        'slot_booked' => 'Booked',
        'step3_title' => 'Person in Charge Information',
        'lbl_name' => 'Full Name',
        'lbl_phone' => 'Active WhatsApp Number',
        'hint_phone' => 'Confirmation and booking vouchers will be sent to this number.',
        'lbl_email' => 'Email Address',
        'hint_email' => 'Please enter your email address correctly as all confirmations will be sent by email.',
        'lbl_org' => 'Club / Community / Organization Name',
        'lbl_purpose' => 'Purpose of Rental',
        'step4_title' => 'Court Rental Terms & Regulations',
        'rules_header' => 'Court Rental Terms:',
        'agree_rules' => 'I have read and agree to all the <strong>Court Rental Terms</strong> above, including the cleanliness obligation (Rp 50,000 fine if left unclean) and the strict no-smoking policy in court and school area.',
        'step5_title' => 'Bank Mayapada Payment Information',
        'lbl_copy_rek' => 'Copy Account Number',
        'lbl_proof' => 'Upload Payment Proof (Mandatory):',
        'hint_proof' => 'Payment proof is required. Format: JPG, PNG, WEBP, or PDF (max 5 MB).',
        'modal_error_title' => 'Please Complete Your Form',
        'modal_error_desc' => 'Some required fields are missing or invalid. Please correct the following items:',
        'modal_error_btn' => 'Complete Form Now',
        'btn_submit' => 'Submit Court Rental Booking',
        'status_section_title' => 'Check Booking Status',
        'status_input_ph' => 'Example: CCS-2609-ABC123',
        'btn_check' => 'Check Status',
        'lbl_code' => 'Booking Code',
        'rules' => [
            'The court area can only be rented outside school hours and outside school activities.',
            'If there is a sudden school activity, the date option will not appear on the booking website.',
            'Renters agree not to leave any belongings in the court area or school area.',
            'The School will not be responsible for any loss of personal belongings.',
            'Renters are required to leave the court and school area in a clean condition as originally found; otherwise, a fine of Rp 50,000 will be charged before leaving the school area.',
            'The use of AC and/or lights will only be turned on according to the rental hours.',
            'Smoking is prohibited in the court and school area.',
            'For any damage that occurs during the rental duration, the renter is obliged to compensate according to the repair cost.',
            'Rental payment must be made before the court is used. Rental fees can be transferred to: Yayasan Pendidikan Mayapada, Account Number: 100-3000-3853. Please include transfer remarks: BookingCode_RenterName.',
            'The court booking status will change to successful once the renter has uploaded proof of payment and received a rental confirmation email.',
            'Please enter your email address correctly as all confirmations will be sent by email. If there is no email confirmation, the reservation is considered unapproved, and the renter will not be permitted to enter the court area.',
            'For court rentals for events or activities with longer durations, please contact: +62 859-5986-0430.',
            'The court booking process is only conducted on working days, Monday-Friday 08:00-16:00. Bookings received outside operational hours will be processed on the next working day. Bookings placed on Friday outside operational hours will be processed on Monday.',
            'Changes or rescheduling of rental bookings are not permitted. Renters must ensure and recheck the selected schedule before making payment.',
            'Please be respectfully informed that effective July 2026, a court rental tariff adjustment has been implemented.'
        ]
    ],
    'cn' => [
        'nav_home' => '首页',
        'nav_rental' => '场地租赁',
        'title' => 'CCS 场地租赁',
        'btn_check_status' => '查询预约状态',
        'btn_back_form' => '返回预约表',
        'price_list_title' => 'CCS 场地租赁价格表',
        'pkg1_name' => '价格表 - 1 CCS 场地租赁',
        'pkg1_opt' => '价格表 - 1 (含2台空调)',
        'pkg1_benefits' => [
            '体育馆 / 2小时',
            '含球场照明',
            '含空调使用 (2台)'
        ],
        'pkg2_name' => '价格表 - 2 CCS 场地租赁',
        'pkg2_opt' => '价格表 - 2 (无空调)',
        'pkg2_benefits' => [
            '体育馆 / 2小时',
            '含球场照明',
            '无空调使用'
        ],
        'btn_select_pkg' => '选择此套餐',
        'form_title' => '场地租赁预约表',
        'step1_title' => '选择租赁套餐',
        'step2_title' => '选择预约日期与时段',
        'lbl_date' => '租赁日期',
        'lbl_slots' => '选择时段 (整2小时)',
        'notice_select_date' => '请先选择日期以查看可用时段。',
        'notice_loading' => '正在查询场地可用状态...',
        'slot_available' => '可用',
        'slot_school_event' => '学校活动',
        'slot_booked' => '已被预约',
        'step3_title' => '负责人信息',
        'lbl_name' => '负责人全名',
        'lbl_phone' => 'WhatsApp 手机号码',
        'hint_phone' => '预约凭证及确认信息将发送至此号码。',
        'lbl_email' => '电子邮箱地址',
        'hint_email' => '请务必准确填写电子邮箱地址，所有确认函均通过邮件发送。',
        'lbl_org' => '俱乐部 / 社区 / 机构名称',
        'lbl_purpose' => '场地使用目的',
        'step4_title' => '场地租赁规章制度',
        'rules_header' => '场地租赁须知：',
        'agree_rules' => '我已阅读并同意上述所有<strong>场地租赁规章制度</strong>，包括保持清洁义务（未清理罚款 Rp 50,000）及严禁在球场与校园区域内吸烟的规定。',
        'step5_title' => 'Bank Mayapada 银行转账信息',
        'lbl_copy_rek' => '复制银行账号',
        'lbl_proof' => '上传转账凭证（必填）：',
        'hint_proof' => '必须上传转账凭证。格式：JPG, PNG, WEBP 或 PDF（最大 5 MB）。',
        'modal_error_title' => '请检查并完善表单内容',
        'modal_error_desc' => '有几项必填信息尚未填写或不符合要求，请补充完善：',
        'modal_error_btn' => '立即完善表单',
        'btn_submit' => '提交场地租赁预约',
        'status_section_title' => '查询预约状态',
        'status_input_ph' => '例如：CCS-2609-ABC123',
        'btn_check' => '查询状态',
        'lbl_code' => '预约代码',
        'rules' => [
            '场地仅限在非上课时间及学校活动之外租用。',
            '若学校有突发活动，预约网站上将不显示该日期选项。',
            '承租方同意不在场地或校园区域内遗留任何物品。',
            '学校对任何个人物品的遗失概不负责。',
            '承租方须将球场及校园区域恢复原状并保持清洁，否则须在离校前缴纳 Rp 50,000 罚款。',
            '空调和/或照明设备仅在预约租赁时间内开启。',
            '球场及校园区域内严禁吸烟。',
            '租赁期间若发生任何设施损坏，承租方须按维修费用全额赔偿。',
            '场地使用前须付清租金。租金请转账至：Yayasan Pendidikan Mayapada，账号：100-3000-3853。转账附言请注明：预约代码_承租人姓名。',
            '承租方上传付款凭证并收到确认邮件后，场地预约状态方转为成功。',
            '请务必准确填写电子邮箱地址，所有确认函均通过邮件发送。若未收到确认邮件，则预约视为未获批准，承租方不得进入球场区域。',
            '如需举办活动或更长时段的场地租赁，请联系专员：+62 859-5986-0430。',
            '场地预约审核仅在工作日（周一至周五 08:00-16:00）进行。工作时间外提交的预约将在下一个工作日处理；周五工作时间外提交的预约将在周一处理。',
            '场地租赁不可更改或改期。承租方在付款前须仔细核对确认所选时间。',
            '谨此通知，自2026年7月起已对场地租赁费用进行相应调整。'
        ]
    ]
];

$L = $i18n[$currLang] ?? $i18n['id'];

// ─── 1. KONFIGURASI SISTEM ───────────────────────────────────────────
define('CCS_PORTAL_LOADED', true);

// Muat konfigurasi rahasia jika file config.php tersedia (file ini di-ignore oleh Git)
if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
}

if (!defined('APP_NAME')) define('APP_NAME', 'Sport Hall CCS');
if (!defined('SCHOOL_NAME')) define('SCHOOL_NAME', 'Chung Chung Christian School');
if (!defined('ORG_NAME')) define('ORG_NAME', 'Yayasan Pendidikan Mayapada');
if (!defined('BANK_NAME')) define('BANK_NAME', 'Bank Mayapada');
if (!defined('BANK_REK')) define('BANK_REK', '100-3000-3853');
if (!defined('BANK_AN')) define('BANK_AN', 'Yayasan Pendidikan Mayapada');
if (!defined('CONTACT_PHONE')) define('CONTACT_PHONE', '031 8788 4800');
if (!defined('CONTACT_WA')) define('CONTACT_WA', '+62 859-5986-0430');
if (!defined('SCHOOL_ADDRESS')) define('SCHOOL_ADDRESS', 'Gunung Anyar Sawah No. 18, Surabaya Timur');
if (!defined('ADMIN_PASS')) define('ADMIN_PASS', 'adminccs2026');

// Konfigurasi Integrasi Next.js Admin & Keamanan Bukti Transfer
// Nilai rahasia diatur di config.php (atau environment variable) sehingga TIDAK tersimpan di Git
if (!defined('API_SECRET_TOKEN')) define('API_SECRET_TOKEN', getenv('COURT_RENTAL_SECRET_KEY') ?: '');
if (!defined('NEXTJS_API_URL')) define('NEXTJS_API_URL', 'https://www.manageccs.online/api/public/court-rental');

// Folder penyimpanan internal
define('DATA_DIR', __DIR__ . '/data');
define('UPLOAD_DIR', __DIR__ . '/uploads');
define('DB_FILE', DATA_DIR . '/sewa_lapangan.db');

// Inisialisasi folder & proteksi keamanan
if (!file_exists(DATA_DIR)) {
    @mkdir(DATA_DIR, 0755, true);
    @file_put_contents(DATA_DIR . '/.htaccess', "Order Deny,Allow\nDeny from all\n");
}
if (!file_exists(UPLOAD_DIR)) {
    @mkdir(UPLOAD_DIR, 0755, true);
}
// Pilihan Keamanan A: Kunci total folder uploads/ dari akses web publik (Deny from all)
@file_put_contents(UPLOAD_DIR . '/.htaccess', "Options -Indexes\nOrder Deny,Allow\nDeny from all\n<IfModule mod_authz_core.c>\nRequire all denied\n</IfModule>\n<FilesMatch \"\\.(php|phtml|php5|pl|py|cgi|sh)$\">\nRequire all denied\n</FilesMatch>\n");
@file_put_contents(UPLOAD_DIR . '/index.html', '<!DOCTYPE html><html><head><title>403 Forbidden</title></head><body><h1>Directory access is forbidden.</h1></body></html>');


// ─── 2. KONEKSI DATABASE (SQLite) ────────────────────────────────────
function getDb() {
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO('sqlite:' . DB_FILE);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

        $pdo->exec("
            CREATE TABLE IF NOT EXISTS bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                booking_code TEXT UNIQUE,
                package_type TEXT,
                package_name TEXT,
                price INTEGER,
                booking_date TEXT,
                time_slot TEXT,
                renter_name TEXT,
                renter_phone TEXT,
                renter_email TEXT,
                renter_org TEXT,
                renter_purpose TEXT,
                payment_proof TEXT,
                status TEXT DEFAULT 'pending_payment',
                admin_notes TEXT,
                created_at TEXT,
                updated_at TEXT
            );

            CREATE TABLE IF NOT EXISTS blackout_dates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT,
                time_slot TEXT,
                reason TEXT,
                created_at TEXT
            );
        ");
    }
    return $pdo;
}

// Helper Slot Waktu Berdasarkan Hari
function getSlotsForDay($dayOfWeek) {
    if ($dayOfWeek == 0 || $dayOfWeek == 6) {
        return [
            '06:00 - 08:00',
            '08:00 - 10:00',
            '10:00 - 12:00',
            '14:00 - 16:00',
            '16:00 - 18:00',
            '18:00 - 20:00',
            '20:00 - 22:00'
        ];
    } else {
        return [
            '16:00 - 18:00',
            '18:00 - 20:00',
            '20:00 - 22:00'
        ];
    }
}

// ─── 2.5 PROTECTED STREAMING BUKTI TRANSFER (KEAMANAN OPSI A) ────────
if (isset($_GET['action']) && $_GET['action'] === 'view_proof') {
    $token = $_GET['token'] ?? '';
    if ($token !== API_SECRET_TOKEN) {
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
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png' => 'image/png',
        'webp' => 'image/webp',
        'pdf' => 'application/pdf'
    ];
    $contentType = $mimeTypes[$ext] ?? 'application/octet-stream';

    header('Content-Type: ' . $contentType);
    header('Content-Length: ' . filesize($filePath));
    header('Cache-Control: private, max-age=86400');
    header('Content-Disposition: inline; filename="' . $file . '"');
    readfile($filePath);
    exit;
}

// ─── 3. API AJAX SLOT AVAILABILITY ────────────────────────────────────
if (isset($_GET['action']) && $_GET['action'] === 'get_slots') {
    header('Content-Type: application/json');
    $date = $_GET['date'] ?? '';
    $ajaxLang = $_GET['lang'] ?? 'id';
    $labelMap = [
        'id' => ['avail' => 'Tersedia', 'school' => 'Kegiatan Sekolah', 'booked' => 'Sudah Dipesan'],
        'en' => ['avail' => 'Available', 'school' => 'School Event', 'booked' => 'Booked'],
        'cn' => ['avail' => '可用', 'school' => '学校活动', 'booked' => '已被预约']
    ][$ajaxLang] ?? ['avail' => 'Tersedia', 'school' => 'Kegiatan Sekolah', 'booked' => 'Sudah Dipesan'];

    if (!$date || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        echo json_encode(['status' => 'error', 'message' => 'Tanggal tidak valid']);
        exit;
    }

    $ts = strtotime($date);
    $today = strtotime(date('Y-m-d'));
    if ($ts < $today) {
        echo json_encode(['status' => 'error', 'message' => 'Tanggal sudah lewat']);
        exit;
    }

    $db = getDb();
    $dayOfWeek = (int)date('w', $ts);
    $availableSlots = getSlotsForDay($dayOfWeek);

    $blackoutSlots = [];
    $isWholeDayBlocked = false;
    $blockReason = '';
    $bookedSlots = [];

    // Coba ambil sinkronisasi dari Next.js API terlebih dahulu
    if (defined('NEXTJS_API_URL') && !empty(NEXTJS_API_URL)) {
        $apiCheckUrl = NEXTJS_API_URL . '?date=' . urlencode($date);
        $remoteData = null;
        if (function_exists('curl_init')) {
            $ch = curl_init($apiCheckUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 2);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
            $remoteData = @curl_exec($ch);
            @curl_close($ch);
        } else {
            $ctx = stream_context_create(['http' => ['timeout' => 2]]);
            $remoteData = @file_get_contents($apiCheckUrl, false, $ctx);
        }

        if ($remoteData) {
            $json = json_decode($remoteData, true);
            if (isset($json['success']) && $json['success']) {
                if (!empty($json['blackouts'])) {
                    foreach ($json['blackouts'] as $b) {
                        if (empty($b['time_slot'])) {
                            $isWholeDayBlocked = true;
                            $blockReason = $b['reason'] ?: 'Kegiatan Khusus Sekolah';
                            break;
                        } else {
                            $blackoutSlots[$b['time_slot']] = $b['reason'] ?: 'Kegiatan Sekolah';
                        }
                    }
                }
                if (!empty($json['bookedSlots'])) {
                    $bookedSlots = $json['bookedSlots'];
                }
            }
        }
    }

    // Gabungkan dengan SQLite lokal
    $stmt = $db->prepare("SELECT time_slot, reason FROM blackout_dates WHERE date = ?");
    $stmt->execute([$date]);
    $blackouts = $stmt->fetchAll();
    
    foreach ($blackouts as $b) {
        if (empty($b['time_slot'])) {
            $isWholeDayBlocked = true;
            $blockReason = $b['reason'] ?: 'Kegiatan Khusus Sekolah';
            break;
        } else {
            $blackoutSlots[$b['time_slot']] = $b['reason'] ?: 'Kegiatan Sekolah';
        }
    }

    if ($isWholeDayBlocked) {
        echo json_encode([
            'status' => 'ok',
            'whole_day_blocked' => true,
            'reason' => $blockReason,
            'slots' => []
        ]);
        exit;
    }

    $stmt = $db->prepare("SELECT time_slot FROM bookings WHERE booking_date = ? AND status IN ('pending_payment', 'payment_uploaded', 'approved')");
    $stmt->execute([$date]);
    $bookedRows = $stmt->fetchAll();
    $localBooked = array_column($bookedRows, 'time_slot');
    $bookedSlots = array_unique(array_merge($bookedSlots, $localBooked));

    $resultSlots = [];
    foreach ($availableSlots as $slot) {
        $status = 'available';
        $note = $labelMap['avail'];

        if (isset($blackoutSlots[$slot])) {
            $status = 'school_event';
            $note = $blackoutSlots[$slot] ?: $labelMap['school'];
        } elseif (in_array($slot, $bookedSlots)) {
            $status = 'booked';
            $note = $labelMap['booked'];
        }

        $resultSlots[] = [
            'slot' => $slot,
            'status' => $status,
            'note' => $note
        ];
    }

    echo json_encode([
        'status' => 'ok',
        'whole_day_blocked' => false,
        'slots' => $resultSlots
    ]);
    exit;
}

// ─── 4. PENGIRIMAN FORMULIR BOOKING (POST) ───────────────────────────
$successBooking = null;
$errorMessage = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'submit_booking') {
    $pkgKey = $_POST['package_type'] ?? '';
    $bookingDate = trim($_POST['booking_date'] ?? '');
    $timeSlot = trim($_POST['time_slot'] ?? '');
    $renterName = trim($_POST['renter_name'] ?? '');
    $renterPhone = trim($_POST['renter_phone'] ?? '');
    $renterEmail = trim($_POST['renter_email'] ?? '');
    $renterOrg = trim($_POST['renter_org'] ?? '');
    $renterPurpose = trim($_POST['renter_purpose'] ?? '');
    $agreeRules = isset($_POST['agree_rules']);

    $validPkgs = [
        'paket_1' => ['name' => 'Price List - 1 Persewaan Lapangan CCS', 'price' => 550000, 'formatted_price' => 'Rp 550.000,-'],
        'paket_2' => ['name' => 'Price List - 2 Persewaan Lapangan CCS', 'price' => 350000, 'formatted_price' => 'Rp 350.000,-']
    ];

    if (!$agreeRules) {
        $errorMessage = ($currLang === 'en') ? 'You must agree to the Court Rental Terms.' : (($currLang === 'cn') ? '您必须同意场地租赁规章制度。' : 'Anda wajib menyetujui Ketentuan Sewa Lapangan.');
    } elseif (!isset($validPkgs[$pkgKey])) {
        $errorMessage = 'Paket sewa yang dipilih tidak valid.';
    } elseif (empty($bookingDate) || empty($timeSlot) || empty($renterName) || empty($renterPhone) || empty($renterEmail)) {
        $errorMessage = ($currLang === 'en') ? 'Please complete all required fields (Package, Date, Time Slot, Name, WhatsApp, and Email).' : (($currLang === 'cn') ? '请完整填写所有必填信息（套餐、日期、时段、姓名、WhatsApp 及电子邮箱）。' : 'Mohon lengkapi semua data wajib (Paket, Tanggal, Jam, Nama, No. WhatsApp, dan Alamat Email).');
    } elseif (!filter_var($renterEmail, FILTER_VALIDATE_EMAIL)) {
        $errorMessage = ($currLang === 'en') ? 'Please enter a valid email address.' : (($currLang === 'cn') ? '请输入有效的电子邮箱地址。' : 'Format alamat email tidak valid. Pastikan penulisan email benar.');
    } elseif (!isset($_FILES['payment_proof']) || $_FILES['payment_proof']['error'] === UPLOAD_ERR_NO_FILE) {
        $errorMessage = ($currLang === 'en') ? 'Proof of payment transfer is mandatory. Please upload your transfer receipt.' : (($currLang === 'cn') ? '付款转账凭证为必填项。请上传您的银行转账凭证。' : 'Bukti transfer pembayaran Bank Mayapada wajib diunggah.');
    } elseif ($_FILES['payment_proof']['error'] !== UPLOAD_ERR_OK) {
        $errorMessage = ($currLang === 'en') ? 'Failed to upload payment proof. Please try again.' : 'Terjadi kesalahan saat mengunggah bukti transfer. Silakan coba lagi.';
    } else {
        $fileTmp = $_FILES['payment_proof']['tmp_name'];
        $fileName = $_FILES['payment_proof']['name'];
        $fileSize = $_FILES['payment_proof']['size'];
        $fileExt = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
        $allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];

        if (!in_array($fileExt, $allowedExts)) {
            $errorMessage = ($currLang === 'en') ? 'Invalid file format for payment proof. Allowed formats: JPG, PNG, WEBP, PDF.' : 'Format berkas bukti transfer tidak didukung. Harap gunakan file JPG, PNG, WEBP, atau PDF.';
        } elseif ($fileSize > 5 * 1024 * 1024) {
            $errorMessage = ($currLang === 'en') ? 'Payment proof file exceeds maximum limit of 5 MB.' : 'Ukuran berkas bukti transfer melebihi batas maksimal 5 MB.';
        } else {
            $db = getDb();

            $stmt = $db->prepare("SELECT COUNT(*) FROM bookings WHERE booking_date = ? AND time_slot = ? AND status IN ('pending_payment', 'payment_uploaded', 'approved')");
            $stmt->execute([$bookingDate, $timeSlot]);
            if ($stmt->fetchColumn() > 0) {
                $errorMessage = ($currLang === 'en') ? 'Sorry, this time slot has just been booked. Please choose another.' : 'Maaf, sesi jam tersebut baru saja dipesan orang lain. Silakan pilih sesi lain.';
            } else {
                $stmt = $db->prepare("SELECT COUNT(*) FROM blackout_dates WHERE date = ? AND (time_slot = ? OR time_slot = '' OR time_slot IS NULL)");
                $stmt->execute([$bookingDate, $timeSlot]);
                if ($stmt->fetchColumn() > 0) {
                    $errorMessage = ($currLang === 'en') ? 'Sorry, this time slot is reserved for a school event.' : 'Maaf, sesi jam tersebut sedang digunakan untuk kegiatan sekolah mendadak.';
                } else {
                    $newFileName = 'bukti_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $fileExt;
                    if (!move_uploaded_file($fileTmp, UPLOAD_DIR . '/' . $newFileName)) {
                        $errorMessage = ($currLang === 'en') ? 'Failed to save payment proof file to server.' : 'Gagal menyimpan berkas bukti transfer ke server hosting.';
                    } else {
                        $paymentProofFile = $newFileName;
                        $initialStatus = 'payment_uploaded';

                $bookingCode = 'CCS-' . date('ym') . '-' . strtoupper(bin2hex(random_bytes(3)));
                $selectedPkg = $validPkgs[$pkgKey];
                $now = date('Y-m-d H:i:s');

                $stmt = $db->prepare("
                    INSERT INTO bookings (
                        booking_code, package_type, package_name, price,
                        booking_date, time_slot, renter_name, renter_phone,
                        renter_email, renter_org, renter_purpose,
                        payment_proof, status, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");

                $stmt->execute([
                    $bookingCode,
                    $pkgKey,
                    $selectedPkg['name'],
                    $selectedPkg['price'],
                    $bookingDate,
                    $timeSlot,
                    $renterName,
                    $renterPhone,
                    $renterEmail,
                    $renterOrg,
                    $renterPurpose,
                    $paymentProofFile,
                    $initialStatus,
                    $now,
                    $now
                ]);

                // Sinkronisasi otomatis ke Next.js Admin API (Supabase)
                $scheme = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https' : 'http';
                $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
                $scriptPath = dirname($_SERVER['SCRIPT_NAME'] ?? $_SERVER['PHP_SELF'] ?? '');
                $hostingUrl = rtrim($scheme . '://' . $host . $scriptPath, '/');

                $payload = json_encode([
                    'booking_code' => $bookingCode,
                    'package_type' => $pkgKey,
                    'package_name' => $selectedPkg['name'],
                    'price' => $selectedPkg['price'],
                    'booking_date' => $bookingDate,
                    'time_slot' => $timeSlot,
                    'renter_name' => $renterName,
                    'renter_phone' => $renterPhone,
                    'renter_email' => $renterEmail,
                    'renter_org' => $renterOrg,
                    'renter_purpose' => $renterPurpose,
                    'payment_proof_file' => $paymentProofFile,
                    'hosting_url' => $hostingUrl,
                    'status' => $initialStatus
                ]);

                // Sinkronisasi otomatis ke Next.js API (dengan API_SECRET_TOKEN aman)
                if (defined('NEXTJS_API_URL') && !empty(NEXTJS_API_URL)) {
                    if (function_exists('curl_init')) {
                        $ch = curl_init(NEXTJS_API_URL);
                        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                        curl_setopt($ch, CURLOPT_POST, true);
                        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
                        curl_setopt($ch, CURLOPT_HTTPHEADER, [
                            'Content-Type: application/json',
                            'Authorization: Bearer ' . API_SECRET_TOKEN
                        ]);
                        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
                        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
                        $syncResp = @curl_exec($ch);
                        $syncCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                        @curl_close($ch);
                        @file_put_contents(DATA_DIR . '/sync.log', date('Y-m-d H:i:s') . " | HTTP: $syncCode | Token: " . (API_SECRET_TOKEN ? 'Present' : 'EMPTY') . " | Resp: " . substr((string)$syncResp, 0, 150) . "\n", FILE_APPEND);
                    } else {
                        $opts = [
                            'http' => [
                                'method'  => 'POST',
                                'header'  => "Content-Type: application/json\r\n" .
                                             "Authorization: Bearer " . API_SECRET_TOKEN . "\r\n",
                                'content' => $payload,
                                'timeout' => 5
                            ]
                        ];
                        $context = stream_context_create($opts);
                        @file_get_contents(NEXTJS_API_URL, false, $context);
                    }
                }


                $_SESSION['last_booking'] = [
                    'code' => $bookingCode,
                    'package' => $selectedPkg['name'],
                    'price' => $selectedPkg['formatted_price'],
                    'date' => $bookingDate,
                    'slot' => $timeSlot,
                    'name' => $renterName,
                    'phone' => $renterPhone,
                    'status' => $initialStatus,
                    'has_proof' => !empty($paymentProofFile)
                ];

                header('Location: ?success=1' . ($currLang !== 'id' ? '&lang=' . $currLang : ''));
                exit;
                    }
                }
            }
        }
    }
}

if (isset($_GET['success']) && isset($_SESSION['last_booking'])) {
    $successBooking = $_SESSION['last_booking'];
}

// ─── 5. PANEL ADMIN INTERN ────────────────────────────────────────────
$isAdminView = isset($_GET['admin']);
$adminAuth = false;
$adminError = '';

if ($isAdminView) {
    if (isset($_POST['admin_login'])) {
        if (($_POST['password'] ?? '') === ADMIN_PASS) {
            $_SESSION['ccs_admin_auth'] = true;
        } else {
            $adminError = 'Kata sandi akses admin salah.';
        }
    }

    if (isset($_GET['logout'])) {
        unset($_SESSION['ccs_admin_auth']);
        header('Location: ?admin=1');
        exit;
    }

    $adminAuth = !empty($_SESSION['ccs_admin_auth']);

    if ($adminAuth && isset($_POST['update_status'])) {
        $db = getDb();
        $code = $_POST['booking_code'] ?? '';
        $newStatus = $_POST['status'] ?? '';
        $notes = $_POST['admin_notes'] ?? '';
        $now = date('Y-m-d H:i:s');

        $stmt = $db->prepare("UPDATE bookings SET status = ?, admin_notes = ?, updated_at = ? WHERE booking_code = ?");
        $stmt->execute([$newStatus, $notes, $now, $code]);
        header('Location: ?admin=1&msg=Status+berhasil+diperbarui');
        exit;
    }

    if ($adminAuth && isset($_POST['add_blackout'])) {
        $db = getDb();
        $bDate = $_POST['blackout_date'] ?? '';
        $bSlot = $_POST['blackout_slot'] ?? '';
        $bReason = $_POST['blackout_reason'] ?? '';
        $now = date('Y-m-d H:i:s');

        if ($bDate) {
            $stmt = $db->prepare("INSERT INTO blackout_dates (date, time_slot, reason, created_at) VALUES (?, ?, ?, ?)");
            $stmt->execute([$bDate, $bSlot, $bReason, $now]);
        }
        header('Location: ?admin=1&msg=Jadwal+kegiatan+sekolah+berhasil+ditetapkan');
        exit;
    }

    if ($adminAuth && isset($_GET['del_blackout'])) {
        $db = getDb();
        $delId = (int)$_GET['del_blackout'];
        $db->prepare("DELETE FROM blackout_dates WHERE id = ?")->execute([$delId]);
        header('Location: ?admin=1&msg=Jadwal+kegiatan+dihapus');
        exit;
    }
}

// ─── 6. PENCARIAN STATUS BOOKING PUBLIK ───────────────────────────────
$searchQuery = trim($_GET['cek'] ?? '');
$searchResult = null;
$searchError = '';

if (!empty($searchQuery)) {
    $db = getDb();
    $stmt = $db->prepare("SELECT * FROM bookings WHERE booking_code = ?");
    $stmt->execute([$searchQuery]);
    $searchResult = $stmt->fetch();
    if (!$searchResult) {
        $searchError = "Kode pemesanan '{$searchQuery}' tidak ditemukan dalam sistem.";
    }
}
?>
<!DOCTYPE html>
<html lang="<?= $currLang === 'cn' ? 'zh-CN' : $currLang ?>">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= htmlspecialchars($L['title']) ?> — Chung Chung Christian School</title>
  
  <!-- Favicon Resmi CCS -->
  <link rel="icon" type="image/png" sizes="16x16" href="https://ccs.sch.id/assets/images/favicon.png">

  <!-- Google Font: Poppins (Font Resmi ccs.sch.id) -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

  <!-- FontAwesome Icons -->
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
    /* Standar Font & Tipografi Sesuai ccs.sch.id */
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

    /* Proteksi FontAwesome: Jangan sampai tertimpa Poppins */
    .fa, .fas, .far, .fal, .fad, .fab,
    .fa::before, .fas::before, .far::before, .fal::before, .fab::before,
    [class*="fa-"]::before {
      font-family: "Font Awesome 5 Free" !important;
      display: inline-block;
    }
    .far, .far::before {
      font-weight: 400 !important;
    }
    .fas, .fas::before {
      font-weight: 900 !important;
    }
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

    /* ─── Tombol Khas CCS (.thm-btn) ─── */
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
      padding: 10px 32px;
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

    /* ─── Radio Selector Paket Sewa ─── */
    .package-radio:checked + .package-box {
      border-color: #f16101;
      background-color: #fff9f5;
      box-shadow: 0 4px 16px rgba(241, 97, 1, 0.12);
    }
    .package-radio:checked + .package-box .pkg-dot {
      background-color: #f16101;
      border-color: #f16101;
    }

    /* ─── Footer Sesuai Website CCS Asli ─── */
    .site-footer {
      background-color: #012237;
    }
    .site-footer__bottom {
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

    /* ─── Floating WhatsApp ─── */
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
  <!-- 1. TOP BAR BAHASA BERFUNGSI AKTIF (ENGLISH | BAHASA | 中文)             -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <div class="bg-ccsNavy text-white py-2">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-end">
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
  <!-- 2. NAVBAR: HANYA 2 MENU (HOME & SEWA LAPANGAN) DENGAN LOGO RESMI CCS  -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <header class="bg-white sticky top-0 z-50 shadow-sm">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 h-[84px] flex items-center justify-between">
      <!-- Logo Resmi CCS (Persis 1:1 sesuai ccs.sch.id) -->
      <a href="https://ccs.sch.id/" class="flex items-center">
        <img 
          src="https://ccs.sch.id/assets/images/logo-cccs.png" 
          alt="Chung Chung Christian School" 
          class="main-logo"
          onerror="this.src='assets/images/logo-cccs.png';"
        />
      </a>

      <!-- Menu: CUKUP 2 MENU SAJA SESUAI PERMINTAAN USER -->
      <nav class="flex items-center gap-8 text-[15px] font-medium">
        <a href="https://ccs.sch.id/" class="text-gray-800 hover:text-ccsOrange transition-colors">
          <?= htmlspecialchars($L['nav_home']) ?>
        </a>
        <a href="index.php?lang=<?= $currLang ?>" class="text-ccsOrange font-semibold border-b-2 border-ccsOrange pb-1 transition-colors">
          <?= htmlspecialchars($L['nav_rental']) ?>
        </a>
      </nav>
    </div>

    <!-- PITA 3 WARNA IKONIK CCS (Teal, Orange, Purple) TEPAT DI BAWAH NAVBAR -->
    <div class="w-full flex h-[8px]">
      <div class="flex-1 bg-ccsTeal"></div>
      <div class="flex-1 bg-ccsOrange"></div>
      <div class="flex-1 bg-ccsPurple"></div>
    </div>
  </header>

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!-- 3. KONTEN UTAMA: DAFTAR PAKET & FORMULIR RESERVASI                     -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <main class="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex-1 w-full space-y-12">

    <?php if ($isAdminView): ?>
      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <!-- ADMIN CONSOLE KHUSUS PETUGAS CCS                                    -->
      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <?php if (!$adminAuth): ?>
        <div class="max-w-md mx-auto my-12 bg-white p-8 border border-gray-200 rounded-2xl shadow-sm space-y-5 text-center">
          <div class="w-14 h-14 mx-auto rounded-full bg-orange-100 flex items-center justify-center text-ccsOrange text-2xl">
            <i class="fas fa-user-shield"></i>
          </div>
          <div>
            <h2 class="text-xl font-bold text-ccsHeading">Konsol Petugas Lapangan</h2>
            <p class="text-xs text-gray-500 mt-1">Khusus staf dan pengelola Sport Hall Chung Chung Christian School</p>
          </div>

          <?php if (!empty($adminError)): ?>
            <div class="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl text-left font-medium">
              <i class="fas fa-exclamation-circle mr-1"></i> <?= htmlspecialchars($adminError) ?>
            </div>
          <?php endif; ?>

          <form method="POST" class="space-y-4 text-left">
            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1">Kata Sandi Akses</label>
              <input
                type="password"
                name="password"
                required
                placeholder="Masukkan kata sandi..."
                class="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-ccsOrange focus:border-ccsOrange outline-none"
                autofocus
              />
            </div>
            <button
              type="submit"
              name="admin_login"
              class="w-full thm-btn py-2.5 text-xs font-semibold"
            >
              Masuk Konsol
            </button>
          </form>
          <div class="text-xs text-gray-400">Password default: <span class="font-mono font-semibold text-gray-600">adminccs2026</span></div>
          <div class="pt-2">
            <a href="?lang=<?= $currLang ?>" class="text-xs text-gray-500 hover:text-ccsHeading underline">
              &larr; <?= htmlspecialchars($L['btn_back_form']) ?>
            </a>
          </div>
        </div>

      <?php else: ?>
        <?php
          $db = getDb();
          $allBookings = $db->query("SELECT * FROM bookings ORDER BY id DESC")->fetchAll();
          $blackoutList = $db->query("SELECT * FROM blackout_dates ORDER BY date ASC")->fetchAll();
          $msg = $_GET['msg'] ?? '';
        ?>
        <div class="space-y-8">
          <div class="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              <span class="text-xs font-bold text-ccsOrange uppercase tracking-wider">INTERNAL ADMIN CONSOLE</span>
              <h2 class="text-2xl font-bold text-ccsHeading">Manajemen Reservasi Sport Hall</h2>
            </div>
            <div class="flex items-center gap-3 text-xs">
              <a href="?lang=<?= $currLang ?>" class="px-4 py-2 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 font-medium">
                Lihat Halaman Publik
              </a>
              <a href="?admin=1&logout=1" class="px-4 py-2 rounded-full bg-red-50 text-red-600 hover:bg-red-100 font-medium">
                Keluar
              </a>
            </div>
          </div>

          <?php if ($msg): ?>
            <div class="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
              <i class="fas fa-check-circle text-emerald-600"></i> <?= htmlspecialchars($msg) ?>
            </div>
          <?php endif; ?>

          <!-- Penutupan Jadwal / Kegiatan Sekolah Mendadak -->
          <section class="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div class="border-b border-gray-100 pb-3">
              <h3 class="text-base font-bold text-ccsHeading flex items-center gap-2">
                <i class="fas fa-calendar-times text-ccsOrange"></i> Penutupan Jadwal (Kegiatan Sekolah Mendadak)
              </h3>
              <p class="text-xs text-gray-500 mt-1">
                Sesuai aturan sekolah: Tanggal atau jam yang ditambahkan di sini <strong>otomatis tidak akan muncul / tidak bisa dipilih</strong> oleh penyewa di formulir pemesanan.
              </p>
            </div>

            <form method="POST" class="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label class="block text-gray-700 font-medium mb-1">Tanggal Kegiatan</label>
                <input type="date" name="blackout_date" required class="w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none focus:border-ccsOrange" />
              </div>
              <div>
                <label class="block text-gray-700 font-medium mb-1">Slot Waktu</label>
                <select name="blackout_slot" class="w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none focus:border-ccsOrange">
                  <option value="">Seharian Penuh</option>
                  <option value="16:00 - 18:00">16:00 - 18:00</option>
                  <option value="18:00 - 20:00">18:00 - 20:00</option>
                  <option value="20:00 - 22:00">20:00 - 22:00</option>
                  <option value="06:00 - 08:00">06:00 - 08:00 (Weekend)</option>
                  <option value="08:00 - 10:00">08:00 - 10:00 (Weekend)</option>
                  <option value="10:00 - 12:00">10:00 - 12:00 (Weekend)</option>
                  <option value="14:00 - 16:00">14:00 - 16:00 (Weekend)</option>
                </select>
              </div>
              <div>
                <label class="block text-gray-700 font-medium mb-1">Keterangan Kegiatan</label>
                <input type="text" name="blackout_reason" placeholder="Contoh: Pertandingan Antar Kelas CCS" class="w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none focus:border-ccsOrange" />
              </div>
              <div class="flex items-end">
                <button type="submit" name="add_blackout" class="w-full thm-btn py-2.5 text-xs">
                  Kunci Tanggal Ini
                </button>
              </div>
            </form>

            <?php if (count($blackoutList) > 0): ?>
              <div class="pt-3">
                <table class="w-full text-xs border border-gray-200 rounded-xl overflow-hidden">
                  <thead class="bg-gray-50 text-gray-600 font-semibold">
                    <tr>
                      <th class="p-2.5 text-left border-b border-gray-200">Tanggal</th>
                      <th class="p-2.5 text-left border-b border-gray-200">Sesi Jam</th>
                      <th class="p-2.5 text-left border-b border-gray-200">Alasan</th>
                      <th class="p-2.5 text-center border-b border-gray-200 w-20">Aksi</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100">
                    <?php foreach ($blackoutList as $bo): ?>
                      <tr class="hover:bg-gray-50">
                        <td class="p-2.5 font-medium text-gray-900"><?= htmlspecialchars($bo['date']) ?></td>
                        <td class="p-2.5"><?= htmlspecialchars($bo['time_slot'] ?: 'Seharian Penuh') ?></td>
                        <td class="p-2.5 text-gray-600"><?= htmlspecialchars($bo['reason'] ?: 'Kegiatan Sekolah') ?></td>
                        <td class="p-2.5 text-center">
                          <a href="?admin=1&del_blackout=<?= $bo['id'] ?>" onclick="return confirm('Buka kembali slot ini untuk publik?')" class="text-red-600 hover:underline">Hapus</a>
                        </td>
                      </tr>
                    <?php endforeach; ?>
                  </tbody>
                </table>
              </div>
            <?php endif; ?>
          </section>

          <!-- Bookings Table -->
          <section class="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div class="flex items-baseline justify-between border-b border-gray-100 pb-3">
              <h3 class="text-base font-bold text-ccsHeading flex items-center gap-2">
                <i class="fas fa-list-alt text-ccsTeal"></i> Permohonan Reservasi Masuk (<?= count($allBookings) ?> Data)
              </h3>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-xs border border-gray-200 rounded-xl overflow-hidden">
                <thead class="bg-gray-50 text-gray-600 font-semibold text-[11px]">
                  <tr>
                    <th class="p-3 text-left border-b border-gray-200">Kode & Tanggal Buat</th>
                    <th class="p-3 text-left border-b border-gray-200">Jadwal Main</th>
                    <th class="p-3 text-left border-b border-gray-200">Data Penyewa</th>
                    <th class="p-3 text-left border-b border-gray-200">Paket & Total</th>
                    <th class="p-3 text-center border-b border-gray-200">Bukti Transfer</th>
                    <th class="p-3 text-center border-b border-gray-200">Status</th>
                    <th class="p-3 text-right border-b border-gray-200">Update Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <?php if (count($allBookings) === 0): ?>
                    <tr><td colspan="7" class="p-8 text-center text-gray-400 italic">Belum ada permohonan sewa lapangan yang masuk.</td></tr>
                  <?php else: ?>
                    <?php foreach ($allBookings as $bk): ?>
                      <tr class="hover:bg-blue-50/40 transition">
                        <td class="p-3 align-top">
                          <div class="font-bold text-ccsHeading font-mono"><?= htmlspecialchars($bk['booking_code']) ?></div>
                          <div class="text-[10px] text-gray-400"><?= htmlspecialchars($bk['created_at']) ?></div>
                        </td>
                        <td class="p-3 align-top">
                          <div class="font-semibold text-gray-800"><?= htmlspecialchars($bk['booking_date']) ?></div>
                          <div class="text-[11px] text-gray-500 font-medium"><?= htmlspecialchars($bk['time_slot']) ?></div>
                        </td>
                        <td class="p-3 align-top">
                          <div class="font-semibold text-gray-900"><?= htmlspecialchars($bk['renter_name']) ?></div>
                          <div class="text-[11px] text-gray-600"><?= htmlspecialchars($bk['renter_phone']) ?></div>
                          <div class="text-[10px] text-gray-400"><?= htmlspecialchars($bk['renter_email']) ?></div>
                          <?php if ($bk['renter_org']): ?>
                            <div class="text-[10px] text-gray-500 italic mt-0.5">Instansi: <?= htmlspecialchars($bk['renter_org']) ?></div>
                          <?php endif; ?>
                        </td>
                        <td class="p-3 align-top">
                          <div class="font-medium text-gray-800"><?= htmlspecialchars($bk['package_name']) ?></div>
                          <div class="font-bold text-ccsOrange font-mono text-sm">Rp <?= number_format($bk['price'], 0, ',', '.') ?></div>
                        </td>
                        <td class="p-3 text-center align-top">
                          <?php if (!empty($bk['payment_proof'])): ?>
                            <a href="uploads/<?= htmlspecialchars($bk['payment_proof']) ?>" target="_blank" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-300 text-[11px] text-ccsHeading hover:bg-gray-100 font-medium">
                              <i class="fas fa-image text-ccsTeal"></i> Buka Foto
                            </a>
                          <?php else: ?>
                            <span class="text-gray-400 text-[11px] italic">Belum Ada</span>
                          <?php endif; ?>
                        </td>
                        <td class="p-3 text-center align-top">
                          <?php
                            $stMap = [
                              'pending_payment' => ['bg-amber-100 text-amber-800', 'Menunggu Bayar'],
                              'payment_uploaded' => ['bg-blue-100 text-blue-800', 'Verifikasi Bukti'],
                              'approved' => ['bg-emerald-100 text-emerald-800', 'Disetujui'],
                              'rejected' => ['bg-rose-100 text-rose-800', 'Ditolak'],
                              'completed' => ['bg-gray-100 text-gray-800', 'Selesai']
                            ][$bk['status']] ?? ['bg-gray-100 text-gray-700', $bk['status']];
                          ?>
                          <span class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold <?= $stMap[0] ?>">
                            <?= $stMap[1] ?>
                          </span>
                        </td>
                        <td class="p-3 text-right align-top space-y-1.5">
                          <form method="POST" class="flex flex-col gap-1 items-end">
                            <input type="hidden" name="booking_code" value="<?= htmlspecialchars($bk['booking_code']) ?>" />
                            <select name="status" class="px-2 py-1 border border-gray-300 rounded text-[11px] bg-white">
                              <option value="pending_payment" <?= $bk['status'] === 'pending_payment' ? 'selected' : '' ?>>Menunggu Bayar</option>
                              <option value="payment_uploaded" <?= $bk['status'] === 'payment_uploaded' ? 'selected' : '' ?>>Verifikasi Bukti</option>
                              <option value="approved" <?= $bk['status'] === 'approved' ? 'selected' : '' ?>>Disetujui</option>
                              <option value="rejected" <?= $bk['status'] === 'rejected' ? 'selected' : '' ?>>Ditolak</option>
                              <option value="completed" <?= $bk['status'] === 'completed' ? 'selected' : '' ?>>Selesai</option>
                            </select>
                            <button type="submit" name="update_status" class="px-2.5 py-1 bg-ccsHeading text-white rounded text-[10px] font-semibold hover:bg-ccsNavy">
                              Simpan
                            </button>
                            <?php
                              $waNum = preg_replace('/[^0-9]/', '', $bk['renter_phone']);
                              if (substr($waNum, 0, 1) === '0') $waNum = '62' . substr($waNum, 1);
                              $waMsg = urlencode("Halo Bapak/Ibu {$bk['renter_name']},\n\nKami dari Petugas Sport Hall Chung Chung Christian School (CCS) mengonfirmasi permohonan booking Anda:\n- Kode: *{$bk['booking_code']}*\n- Paket: {$bk['package_name']}\n- Jadwal: {$bk['booking_date']}, {$bk['time_slot']}\n- Status Saat Ini: *" . strtoupper($bk['status']) . "*\n\nTerima kasih.");
                            ?>
                            <a href="https://wa.me/<?= $waNum ?>?text=<?= $waMsg ?>" target="_blank" class="inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:underline pt-0.5 font-medium">
                              <i class="fab fa-whatsapp"></i> Chat WA
                            </a>
                          </form>
                        </td>
                      </tr>
                    <?php endforeach; ?>
                  <?php endif; ?>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      <?php endif; ?>

    <?php else: ?>

      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <!-- NOTIFIKASI SUKSES BOOKING                                           -->
      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <?php if ($successBooking): ?>
        <div class="bg-white border-2 border-emerald-500 rounded-3xl p-8 shadow-md space-y-6 text-center max-w-2xl mx-auto">
          <div class="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl mx-auto">
            <i class="fas fa-check"></i>
          </div>
          <div>
            <span class="text-xs font-bold text-emerald-600 uppercase tracking-wider">Reservasi Berhasil Diajukan!</span>
            <h2 class="text-2xl font-bold text-ccsHeading mt-1"><?= htmlspecialchars($L['lbl_code']) ?></h2>
            <div class="inline-block mt-3 px-6 py-2.5 bg-gray-100 border border-gray-300 rounded-2xl font-mono text-2xl font-bold text-ccsOrange tracking-wider select-all">
              <?= htmlspecialchars($successBooking['code']) ?>
            </div>
            <p class="text-xs text-gray-500 mt-2">Simpan kode booking ini untuk mengecek status atau ditunjukkan saat tiba di Sport Hall CCS.</p>
          </div>

          <div class="bg-gray-50 rounded-2xl p-5 text-sm text-left grid grid-cols-2 gap-4 border border-gray-200">
            <div>
              <span class="text-gray-400 text-xs block">Paket:</span>
              <strong class="text-gray-800"><?= htmlspecialchars($successBooking['package']) ?></strong>
            </div>
            <div>
              <span class="text-gray-400 text-xs block">Total Biaya:</span>
              <strong class="text-ccsOrange font-mono font-bold text-base"><?= htmlspecialchars($successBooking['price']) ?></strong>
            </div>
            <div>
              <span class="text-gray-400 text-xs block">Jadwal:</span>
              <strong class="text-gray-800"><?= htmlspecialchars($successBooking['date']) ?></strong>
            </div>
            <div>
              <span class="text-gray-400 text-xs block">Sesi Jam:</span>
              <strong class="text-gray-800"><?= htmlspecialchars($successBooking['slot']) ?></strong>
            </div>
          </div>

          <div class="space-y-3 pt-2">
            <a href="?cek=<?= urlencode($successBooking['code']) ?>&lang=<?= $currLang ?>" class="thm-btn w-full sm:w-auto">
              <i class="fas fa-eye"></i> Cek Status Reservasi Ini
            </a>
            <div>
              <a href="?lang=<?= $currLang ?>" class="text-xs text-gray-500 hover:text-ccsNavy underline"><?= htmlspecialchars($L['btn_back_form']) ?></a>
            </div>
          </div>
        </div>
      <?php endif; ?>

      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <!-- SECTION 1: PRICE LIST PERSEWAAN LAPANGAN CCS                        -->
      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <section id="daftar-paket" class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 pb-3 gap-3">
          <h2 class="text-2xl font-bold text-ccsHeading"><?= htmlspecialchars($L['price_list_title']) ?></h2>
          <a href="#cek-status" class="inline-flex items-center gap-2 text-xs font-semibold text-ccsHeading hover:text-ccsOrange transition">
            <i class="fas fa-search text-xs"></i> <?= htmlspecialchars($L['btn_check_status']) ?>
          </a>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- PRICE LIST 1 -->
          <div class="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 flex flex-col justify-between hover:border-ccsOrange transition">
            <div class="space-y-4">
              <div>
                <h3 class="text-xl font-bold text-ccsHeading"><?= htmlspecialchars($L['pkg1_name']) ?></h3>
                <div class="mt-2 text-3xl font-extrabold text-ccsOrange font-mono">Rp 550.000,-</div>
              </div>

              <div class="border-t border-gray-100 pt-4">
                <span class="text-sm font-semibold text-gray-800 block mb-2">Benefit :</span>
                <ul class="space-y-2 text-sm text-gray-600">
                  <?php foreach ($L['pkg1_benefits'] as $bnf): ?>
                    <li class="flex items-center gap-2.5">
                      <i class="fas fa-check text-ccsTeal text-xs"></i>
                      <span><?= htmlspecialchars($bnf) ?></span>
                    </li>
                  <?php endforeach; ?>
                </ul>
              </div>
            </div>

            <div class="pt-6">
              <a href="#form-pemesanan" onclick="selectPackageFromList('paket_1')" class="thm-btn w-full text-center">
                <?= htmlspecialchars($L['btn_select_pkg']) ?>
              </a>
            </div>
          </div>

          <!-- PRICE LIST 2 -->
          <div class="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 flex flex-col justify-between hover:border-ccsOrange transition">
            <div class="space-y-4">
              <div>
                <h3 class="text-xl font-bold text-ccsHeading"><?= htmlspecialchars($L['pkg2_name']) ?></h3>
                <div class="mt-2 text-3xl font-extrabold text-ccsOrange font-mono">Rp 350.000,-</div>
              </div>

              <div class="border-t border-gray-100 pt-4">
                <span class="text-sm font-semibold text-gray-800 block mb-2">Benefit :</span>
                <ul class="space-y-2 text-sm text-gray-600">
                  <?php foreach ($L['pkg2_benefits'] as $bnf): ?>
                    <li class="flex items-center gap-2.5">
                      <i class="fas fa-check text-ccsTeal text-xs"></i>
                      <span><?= htmlspecialchars($bnf) ?></span>
                    </li>
                  <?php endforeach; ?>
                </ul>
              </div>
            </div>

            <div class="pt-6">
              <a href="#form-pemesanan" onclick="selectPackageFromList('paket_2')" class="thm-btn w-full text-center">
                <?= htmlspecialchars($L['btn_select_pkg']) ?>
              </a>
            </div>
          </div>
        </div>
      </section>

      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <!-- SECTION 2: FORMULIR PEMESANAN LAPANGAN                              -->
      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <section id="form-pemesanan" class="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 space-y-8">
        
        <div class="border-b border-gray-200 pb-4">
          <h2 class="text-2xl font-bold text-ccsHeading"><?= htmlspecialchars($L['form_title']) ?></h2>
        </div>

        <?php if (!empty($errorMessage)): ?>
          <div class="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center gap-3">
            <i class="fas fa-exclamation-triangle text-red-500 text-lg shrink-0"></i>
            <div><?= htmlspecialchars($errorMessage) ?></div>
          </div>
        <?php endif; ?>

        <form method="POST" enctype="multipart/form-data" class="space-y-8" id="bookingForm" novalidate>
          <input type="hidden" name="action" value="submit_booking" />

          <!-- LANGKAH 1: PILIH PAKET -->
          <div class="space-y-3">
            <label class="block text-sm font-bold text-ccsHeading">
              <?= htmlspecialchars($L['step1_title']) ?>
            </label>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label class="block relative cursor-pointer select-none">
                <input
                  type="radio"
                  name="package_type"
                  value="paket_1"
                  class="sr-only package-radio"
                  id="radio_paket_1"
                  checked
                />
                <div class="package-box p-4 rounded-xl border-2 border-gray-200 transition-all flex items-center justify-between">
                  <div>
                    <h4 class="font-bold text-gray-900 text-sm"><?= htmlspecialchars($L['pkg1_opt']) ?></h4>
                    <div class="text-ccsOrange font-mono font-bold text-base mt-0.5">Rp 550.000,- <span class="text-xs text-gray-500 font-normal">/ 2 Jam</span></div>
                  </div>
                  <div class="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center pkg-dot shrink-0">
                    <div class="w-2.5 h-2.5 rounded-full bg-white"></div>
                  </div>
                </div>
              </label>

              <label class="block relative cursor-pointer select-none">
                <input
                  type="radio"
                  name="package_type"
                  value="paket_2"
                  class="sr-only package-radio"
                  id="radio_paket_2"
                />
                <div class="package-box p-4 rounded-xl border-2 border-gray-200 transition-all flex items-center justify-between">
                  <div>
                    <h4 class="font-bold text-gray-900 text-sm"><?= htmlspecialchars($L['pkg2_opt']) ?></h4>
                    <div class="text-ccsOrange font-mono font-bold text-base mt-0.5">Rp 350.000,- <span class="text-xs text-gray-500 font-normal">/ 2 Jam</span></div>
                  </div>
                  <div class="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center pkg-dot shrink-0">
                    <div class="w-2.5 h-2.5 rounded-full bg-white"></div>
                  </div>
                </div>
              </label>
            </div>
          </div>

          <!-- LANGKAH 2: PILIH TANGGAL & SESI WAKTU -->
          <div class="space-y-4">
            <label class="block text-sm font-bold text-ccsHeading">
              <?= htmlspecialchars($L['step2_title']) ?>
            </label>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div class="space-y-1.5">
                <label class="text-sm text-gray-700 font-medium"><?= htmlspecialchars($L['lbl_date']) ?></label>
                <input
                  type="date"
                  name="booking_date"
                  id="bookingDateInput"
                  required
                  min="<?= date('Y-m-d') ?>"
                  class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-ccsOrange focus:border-ccsOrange outline-none"
                />
              </div>

              <div class="sm:col-span-2 space-y-1.5">
                <label class="text-sm text-gray-700 font-medium"><?= htmlspecialchars($L['lbl_slots']) ?></label>
                
                <div id="slotNotice" class="text-sm text-gray-400 italic py-2">
                  <i class="far fa-calendar-alt mr-1"></i> <?= htmlspecialchars($L['notice_select_date']) ?>
                </div>

                <div id="slotContainer" class="hidden grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <!-- Diisi secara dinamis via JavaScript dari API -->
                </div>

                <input type="hidden" name="time_slot" id="selectedTimeSlot" required />
              </div>
            </div>
          </div>

          <!-- LANGKAH 3: DATA PENYEWA -->
          <div class="space-y-4">
            <label class="block text-sm font-bold text-ccsHeading">
              <?= htmlspecialchars($L['step3_title']) ?>
            </label>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div class="space-y-1">
                <label class="font-medium text-gray-700"><?= htmlspecialchars($L['lbl_name']) ?> <span class="text-red-500">*</span></label>
                <input type="text" name="renter_name" required placeholder="Contoh: Bpk. Hendra Wijaya" class="w-full px-4 py-2.5 border border-gray-300 rounded-xl outline-none focus:border-ccsOrange text-sm" />
              </div>

              <div class="space-y-1">
                <label class="font-medium text-gray-700"><?= htmlspecialchars($L['lbl_phone']) ?> <span class="text-red-500">*</span></label>
                <input type="tel" name="renter_phone" required placeholder="Contoh: 081234567890" class="w-full px-4 py-2.5 border border-gray-300 rounded-xl outline-none focus:border-ccsOrange text-sm" />
                <span class="text-xs text-gray-400 block"><?= htmlspecialchars($L['hint_phone']) ?></span>
              </div>

              <div class="space-y-1">
                <label class="font-medium text-gray-700"><?= htmlspecialchars($L['lbl_email']) ?> <span class="text-red-500">*</span></label>
                <input type="email" name="renter_email" required placeholder="Contoh: hendra@gmail.com" class="w-full px-4 py-2.5 border border-gray-300 rounded-xl outline-none focus:border-ccsOrange text-sm" />
                <span class="text-xs text-gray-400 block"><?= htmlspecialchars($L['hint_email']) ?></span>
              </div>

              <div class="space-y-1">
                <label class="font-medium text-gray-700"><?= htmlspecialchars($L['lbl_org']) ?></label>
                <input type="text" name="renter_org" placeholder="Contoh: Alumni CCS / Tim Basket Mayapada" class="w-full px-4 py-2.5 border border-gray-300 rounded-xl outline-none focus:border-ccsOrange text-sm" />
              </div>

              <div class="sm:col-span-2 space-y-1">
                <label class="font-medium text-gray-700"><?= htmlspecialchars($L['lbl_purpose']) ?></label>
                <input type="text" name="renter_purpose" placeholder="Contoh: Latihan Rutin Basket / Sparring Futsal" class="w-full px-4 py-2.5 border border-gray-300 rounded-xl outline-none focus:border-ccsOrange text-sm" />
              </div>
            </div>
          </div>

          <!-- LANGKAH 4: KETENTUAN SEWA LAPANGAN (15 BUTIR RESMI) -->
          <div class="space-y-3">
            <label class="block text-sm font-bold text-ccsHeading">
              <?= htmlspecialchars($L['step4_title']) ?>
            </label>

            <div class="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-sm text-gray-700 space-y-3 max-h-64 overflow-y-auto">
              <div class="font-bold text-ccsHeading mb-2 flex items-center gap-2">
                <i class="fas fa-shield-alt text-ccsOrange"></i> <?= htmlspecialchars($L['rules_header']) ?>
              </div>
              <ol class="list-decimal pl-5 space-y-2 leading-relaxed">
                <?php foreach ($L['rules'] as $rule): ?>
                  <li><?= htmlspecialchars($rule) ?></li>
                <?php endforeach; ?>
              </ol>
            </div>

            <label class="flex items-start gap-3 cursor-pointer pt-1">
              <input type="checkbox" name="agree_rules" required class="mt-1 h-4 w-4 rounded border-gray-300 text-ccsOrange focus:ring-ccsOrange" />
              <span class="text-sm text-gray-700 leading-relaxed">
                <?= $L['agree_rules'] ?>
              </span>
            </label>
          </div>

          <!-- LANGKAH 5: METODE PEMBAYARAN BANK MAYAPADA & UPLOAD BUKTI -->
          <div class="space-y-4">
            <label class="block text-sm font-bold text-ccsHeading">
              <?= htmlspecialchars($L['step5_title']) ?>
            </label>

            <div class="bg-blue-50/60 border-2 border-blue-200 rounded-2xl p-6 space-y-4">
              <div class="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h4 class="text-lg font-bold text-ccsHeading"><?= BANK_NAME ?></h4>
                  <div class="text-2xl sm:text-3xl font-mono font-bold text-gray-900 mt-1" id="rekText">
                    <?= BANK_REK ?>
                  </div>
                  <div class="text-sm text-gray-600 mt-0.5">a.n. <strong><?= BANK_AN ?></strong></div>
                </div>

                <button
                  type="button"
                  onclick="copyRekening()"
                  id="copyBtn"
                  class="px-5 py-2.5 rounded-xl bg-white border border-blue-300 text-ccsHeading font-semibold text-xs hover:bg-blue-100 transition shadow-sm flex items-center gap-2"
                >
                  <i class="far fa-copy"></i> <?= htmlspecialchars($L['lbl_copy_rek'] ?? 'Salin No. Rekening') ?>
                </button>
              </div>

              <div class="border-t border-blue-200 pt-4 space-y-3">
                <div class="flex items-center justify-between">
                  <label class="block text-sm font-semibold text-gray-800">
                    <?= htmlspecialchars($L['lbl_proof']) ?> <span class="text-rose-600 font-bold">*</span>
                  </label>
                  <span class="text-[11px] font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                    <?= $currLang === 'en' ? 'Required' : ($currLang === 'cn' ? '必填' : 'Wajib Diunggah') ?>
                  </span>
                </div>
                
                <input
                  type="file"
                  name="payment_proof"
                  id="paymentProofInput"
                  required
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  class="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-5 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-ccsOrange file:text-white hover:file:bg-ccsNavy file:cursor-pointer cursor-pointer"
                />

                <!-- Preview file terpilih -->
                <div id="filePreviewContainer" class="hidden items-center justify-between p-3 bg-white border border-blue-200 rounded-xl shadow-xs">
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="w-9 h-9 rounded-lg bg-orange-50 text-ccsOrange flex items-center justify-center text-base shrink-0">
                      <i class="fas fa-file-invoice" id="filePreviewIcon"></i>
                    </div>
                    <div class="min-w-0">
                      <div class="text-xs font-semibold text-gray-800 truncate" id="filePreviewName"></div>
                      <div class="text-[11px] text-gray-500" id="filePreviewSize"></div>
                    </div>
                  </div>
                  <button type="button" onclick="clearProofFile()" class="text-xs text-rose-500 hover:text-rose-700 font-medium px-2.5 py-1 rounded-lg hover:bg-rose-50 flex items-center gap-1">
                    <i class="fas fa-times"></i> <?= $currLang === 'en' ? 'Remove' : ($currLang === 'cn' ? '清除' : 'Hapus') ?>
                  </button>
                </div>

                <span class="text-xs text-gray-500 block"><?= htmlspecialchars($L['hint_proof']) ?></span>
              </div>
            </div>
          </div>

          <!-- TOMBOL SUBMIT -->
          <div class="pt-4 text-center sm:text-right">
            <button type="submit" class="thm-btn w-full sm:w-auto px-10 py-3.5 text-base font-semibold">
              <i class="fas fa-paper-plane"></i> <?= htmlspecialchars($L['btn_submit']) ?>
            </button>
          </div>

        </form>

      </section>

      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <!-- SECTION 3: CEK STATUS PEMESANAN LAPANGAN                           -->
      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <section id="cek-status" class="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        <div class="border-b border-gray-200 pb-3">
          <h2 class="text-2xl font-bold text-ccsHeading"><?= htmlspecialchars($L['status_section_title']) ?></h2>
        </div>

        <form method="GET" class="flex flex-wrap sm:flex-nowrap gap-3 max-w-lg">
          <input type="hidden" name="lang" value="<?= htmlspecialchars($currLang) ?>" />
          <input
            type="text"
            name="cek"
            value="<?= htmlspecialchars($searchQuery) ?>"
            placeholder="<?= htmlspecialchars($L['status_input_ph']) ?>"
            required
            class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-mono font-semibold uppercase outline-none focus:border-ccsOrange"
          />
          <button type="submit" class="thm-btn px-6 py-2.5 whitespace-nowrap text-xs font-semibold">
            <i class="fas fa-search"></i> <?= htmlspecialchars($L['btn_check']) ?>
          </button>
        </form>

        <?php if (!empty($searchError)): ?>
          <div class="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-2xl">
            <i class="fas fa-times-circle mr-1 text-rose-500"></i> <?= htmlspecialchars($searchError) ?>
          </div>
        <?php endif; ?>

        <?php if ($searchResult): ?>
          <div class="bg-gray-50 border border-gray-200 rounded-2xl p-6 space-y-4 max-w-2xl">
            <div class="flex items-center justify-between border-b border-gray-200 pb-3">
              <div>
                <span class="text-xs text-gray-400 uppercase font-semibold"><?= htmlspecialchars($L['lbl_code']) ?></span>
                <div class="text-xl font-bold font-mono text-ccsHeading"><?= htmlspecialchars($searchResult['booking_code']) ?></div>
              </div>
              <div>
                <?php
                  $sMap = [
                    'pending_payment' => ['bg-amber-100 text-amber-800', ($currLang === 'en' ? 'Pending Payment' : ($currLang === 'cn' ? '等待付款' : 'Menunggu Pembayaran'))],
                    'payment_uploaded' => ['bg-blue-100 text-blue-800', ($currLang === 'en' ? 'Verifying Proof' : ($currLang === 'cn' ? '凭证审核中' : 'Verifikasi Staf Lapangan'))],
                    'approved' => ['bg-emerald-100 text-emerald-800', ($currLang === 'en' ? 'Approved / Scheduled' : ($currLang === 'cn' ? '已批准 / 已排期' : 'Disetujui / Terjadwal'))],
                    'rejected' => ['bg-rose-100 text-rose-800', ($currLang === 'en' ? 'Rejected' : ($currLang === 'cn' ? '已拒绝' : 'Ditolak'))],
                    'completed' => ['bg-gray-100 text-gray-800', ($currLang === 'en' ? 'Completed' : ($currLang === 'cn' ? '已完成' : 'Selesai'))]
                  ][$searchResult['status']] ?? ['bg-gray-100 text-gray-800', $searchResult['status']];
                ?>
                <span class="px-3.5 py-1 rounded-full text-xs font-bold <?= $sMap[0] ?>">
                  <?= $sMap[1] ?>
                </span>
              </div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span class="text-gray-400 block text-xs"><?= htmlspecialchars($L['lbl_name']) ?></span>
                <strong class="text-gray-800"><?= htmlspecialchars($searchResult['renter_name']) ?></strong>
              </div>
              <div>
                <span class="text-gray-400 block text-xs">Paket</span>
                <strong class="text-gray-800"><?= htmlspecialchars($searchResult['package_name']) ?></strong>
              </div>
              <div>
                <span class="text-gray-400 block text-xs">Total</span>
                <strong class="text-ccsOrange font-mono font-bold text-base">Rp <?= number_format($searchResult['price'], 0, ',', '.') ?></strong>
              </div>
              <div>
                <span class="text-gray-400 block text-xs"><?= htmlspecialchars($L['lbl_date']) ?></span>
                <strong class="text-gray-800"><?= htmlspecialchars($searchResult['booking_date']) ?></strong>
              </div>
              <div>
                <span class="text-gray-400 block text-xs"><?= htmlspecialchars($L['lbl_slots']) ?></span>
                <strong class="text-gray-800"><?= htmlspecialchars($searchResult['time_slot']) ?></strong>
              </div>
              <div>
                <span class="text-gray-400 block text-xs">Bukti</span>
                <?php if ($searchResult['payment_proof']): ?>
                  <span class="text-emerald-600 font-semibold"><i class="fas fa-check"></i> <?= $currLang === 'en' ? 'Uploaded' : ($currLang === 'cn' ? '已上传' : 'Sudah Diunggah') ?></span>
                <?php else: ?>
                  <span class="text-amber-600 font-semibold"><i class="fas fa-clock"></i> <?= $currLang === 'en' ? 'Not uploaded' : ($currLang === 'cn' ? '未上传' : 'Belum Diunggah') ?></span>
                <?php endif; ?>
              </div>
            </div>

            <?php if (!empty($searchResult['admin_notes'])): ?>
              <div class="p-3.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-700">
                <span class="font-bold text-ccsHeading block mb-1">Catatan Petugas Lapangan:</span>
                <?= htmlspecialchars($searchResult['admin_notes']) ?>
              </div>
            <?php endif; ?>
          </div>
        <?php endif; ?>
      </section>

    <?php endif; ?>

  </main>

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!-- 5. COPYRIGHT FOOTER (PERSIS SESUAI ccs.sch.id & GAMBAR REFERENSI)      -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <footer class="site-footer bg-[#012237] py-6 text-center">
    <div class="max-w-6xl mx-auto px-4 flex items-center justify-center relative">
      <p class="site-footer__copy text-[#94a3ac] text-[15px] font-medium m-0 tracking-normal">
        &copy; <?= date('Y') ?> Chung Chung Christian School. All Right Reserved
      </p>
      <a href="?admin=1" class="text-[#012237] hover:text-[#94a3ac] text-xs transition ml-2 inline-block" title="Staf CCS">
        <i class="fas fa-lock"></i>
      </a>
    </div>
  </footer>

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!-- 6. FLOATING WHATSAPP BUTTON RESMI                                     -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <div class="floating-wa">
    <a 
      href="https://api.whatsapp.com/send?phone=6285959860430&text=Halo%20Admin%20Sport%20Hall%20CCS,%20saya%20ingin%20bertanya%20mengenai%20sewa%20lapangan." 
      target="_blank"
      class="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center text-3xl shadow-xl transition"
      title="Hubungi Kami via WhatsApp"
    >
      <i class="fab fa-whatsapp"></i>
    </a>
  </div>

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!-- MODAL POPUP VALIDASI FORMULIR (PESAN ERROR JELAS & TEGAS)             -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <div 
    id="validationErrorModal" 
    class="fixed inset-0 z-[9999] hidden items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-200"
    role="dialog"
    aria-modal="true"
    aria-labelledby="validationModalTitle"
    onclick="handleModalBackdropClick(event)"
  >
    <div 
      class="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100 transform transition-all scale-95 opacity-0 duration-200 relative overflow-hidden text-center" 
      id="validationModalCard"
    >
      <!-- Tombol Tutup Silang di Kanan Atas -->
      <button 
        type="button" 
        onclick="closeValidationErrorModal()" 
        class="absolute top-5 right-5 text-gray-400 hover:text-gray-700 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition"
        aria-label="Tutup"
      >
        <i class="fas fa-times text-sm"></i>
      </button>

      <!-- Ikon Peringatan & Judul -->
      <div class="space-y-2.5">
        <div class="w-16 h-16 rounded-2xl bg-rose-50 border-2 border-rose-200 text-rose-600 flex items-center justify-center text-2xl mx-auto shadow-xs">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <div>
          <h3 class="text-xl font-bold text-ccsHeading" id="validationModalTitle">
            <?= htmlspecialchars($L['modal_error_title']) ?>
          </h3>
          <p class="text-xs text-gray-500 mt-1" id="validationModalDesc">
            <?= htmlspecialchars($L['modal_error_desc']) ?>
          </p>
        </div>
      </div>

      <!-- Wadah Daftar Field yang Belum Lengkap -->
      <div class="my-5 max-h-64 overflow-y-auto space-y-2.5 pr-1 text-left" id="validationErrorList">
        <!-- Disuntikkan secara dinamis oleh JavaScript -->
      </div>

      <!-- Tombol Tindakan -->
      <div class="pt-2">
        <button
          type="button"
          id="btnDismissErrorModal"
          onclick="closeValidationErrorModal()"
          class="w-full thm-btn py-3.5 text-sm font-semibold rounded-2xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition"
        >
          <span><?= htmlspecialchars($L['modal_error_btn']) ?></span>
          <i class="fas fa-arrow-right text-xs"></i>
        </button>
      </div>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!-- 7. LOGIKA JAVASCRIPT: DYNAMIC SLOTS, PREVIEW, VALIDASI MODAL            -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <script>
    const currentLang = "<?= $currLang ?>";

    // Copy Nomor Rekening
    function copyRekening() {
      const rek = "10030003853";
      navigator.clipboard.writeText(rek).then(() => {
        const btn = document.getElementById('copyBtn');
        const originalText = btn.innerHTML;
        const copiedLabel = currentLang === 'en' ? 'Copied!' : (currentLang === 'cn' ? '已复制！' : 'Tersalin!');
        btn.innerHTML = '<i class="fas fa-check text-emerald-600"></i> ' + copiedLabel;
        setTimeout(() => {
          btn.innerHTML = originalText;
        }, 2000);
      }).catch(err => {
        alert("Nomor rekening: " + rek);
      });
    }

    // Pilih paket dari tombol Price List
    function selectPackageFromList(pkgKey) {
      const radio = document.getElementById('radio_' + pkgKey);
      if (radio) {
        radio.checked = true;
      }
    }

    // ─── FILE PROOF PREVIEW & CLEAR ──────────────────────────────────────
    const proofInput = document.getElementById('paymentProofInput');
    const previewBox = document.getElementById('filePreviewContainer');
    const previewName = document.getElementById('filePreviewName');
    const previewSize = document.getElementById('filePreviewSize');
    const previewIcon = document.getElementById('filePreviewIcon');

    if (proofInput) {
      proofInput.addEventListener('change', function() {
        if (this.files && this.files.length > 0) {
          const file = this.files[0];
          const ext = file.name.split('.').pop().toLowerCase();
          const sizeKb = Math.round(file.size / 1024);
          const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
          const formattedSize = file.size > 1024 * 1024 ? `${sizeMb} MB` : `${sizeKb} KB`;

          previewName.textContent = file.name;
          previewSize.textContent = formattedSize;

          if (ext === 'pdf') {
            previewIcon.className = 'fas fa-file-pdf text-red-500';
          } else {
            previewIcon.className = 'fas fa-file-image text-ccsOrange';
          }

          previewBox.classList.remove('hidden');
          previewBox.classList.add('flex');
        } else {
          clearProofFile();
        }
      });
    }

    function clearProofFile() {
      if (proofInput) {
        proofInput.value = '';
      }
      if (previewBox) {
        previewBox.classList.add('hidden');
        previewBox.classList.remove('flex');
      }
    }

    // ─── MODAL POPUP VALIDASI ERROR ─────────────────────────────────────
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
          item.className = 'p-3.5 bg-rose-50/90 border border-rose-200 rounded-2xl flex items-start gap-3 text-xs text-gray-800';
          item.innerHTML = `
            <div class="w-6 h-6 rounded-full bg-rose-200 text-rose-700 flex items-center justify-center text-[11px] shrink-0 mt-0.5 font-bold shadow-xs">
              <i class="fas fa-exclamation"></i>
            </div>
            <div class="flex-1 min-w-0">
              <strong class="font-bold text-rose-950 block text-[13px] leading-snug">${err.label}</strong>
              <span class="text-rose-800 leading-relaxed block mt-0.5">${err.msg}</span>
            </div>
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

    function showSingleErrorModal(title, message) {
      showValidationErrorModal([{
        label: title || (currentLang === 'en' ? 'Notice' : (currentLang === 'cn' ? '提示' : 'Perhatian')),
        msg: message,
        el: null
      }]);
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
          // Highlight visual sementara pada input terkait
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

    // ─── AJAX PEMILIHAN SESI JAM BERDASARKAN TANGGAL ─────────────────────
    const dateInput = document.getElementById('bookingDateInput');
    const slotContainer = document.getElementById('slotContainer');
    const slotNotice = document.getElementById('slotNotice');
    const selectedSlotInput = document.getElementById('selectedTimeSlot');

    if (dateInput) {
      dateInput.addEventListener('change', function() {
        const dateVal = this.value;
        if (!dateVal) {
          slotContainer.classList.add('hidden');
          slotNotice.classList.remove('hidden');
          slotNotice.innerHTML = '<i class="far fa-calendar-alt mr-1"></i> <?= htmlspecialchars($L['notice_select_date']) ?>';
          return;
        }

        slotNotice.classList.remove('hidden');
        slotNotice.innerHTML = '<i class="fas fa-spinner fa-spin text-ccsOrange mr-1"></i> <?= htmlspecialchars($L['notice_loading']) ?>';
        slotContainer.classList.add('hidden');
        selectedSlotInput.value = '';

        fetch('?action=get_slots&date=' + encodeURIComponent(dateVal) + '&lang=' + encodeURIComponent(currentLang))
          .then(res => res.json())
          .then(data => {
            if (data.status !== 'ok') {
              slotNotice.innerHTML = '<span class="text-rose-600 font-semibold">' + (data.message || 'Gagal memuat jadwal.') + '</span>';
              return;
            }

            if (data.whole_day_blocked) {
              const closedLabel = currentLang === 'en' ? 'Schedule Unavailable' : (currentLang === 'cn' ? '时段不可用' : 'Jadwal Tidak Tersedia');
              const defaultReason = currentLang === 'en' ? 'Official School Activity' : (currentLang === 'cn' ? '学校官方活动' : 'Agenda Resmi Sekolah');
              slotNotice.innerHTML = '<div class="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs"><i class="fas fa-ban mr-1.5 text-rose-500"></i><strong>' + closedLabel + ':</strong> ' + (data.reason || defaultReason) + '</div>';
              return;
            }

            slotNotice.classList.add('hidden');
            slotContainer.innerHTML = '';
            slotContainer.classList.remove('hidden');

            data.slots.forEach((s) => {
              const btn = document.createElement('button');
              btn.type = 'button';

              if (s.status === 'available') {
                btn.className = 'slot-btn p-3 rounded-xl border border-gray-200 hover:border-ccsOrange bg-white text-left transition flex items-center justify-between text-xs cursor-pointer';
                btn.innerHTML = '<div><strong class="text-gray-900 block">' + s.slot + '</strong><span class="text-[11px] text-emerald-600 font-medium">' + s.note + '</span></div><i class="far fa-circle text-gray-300 slot-icon"></i>';
                btn.onclick = function() {
                  document.querySelectorAll('.slot-btn').forEach(b => {
                    b.classList.remove('border-ccsOrange', 'bg-orange-50/60');
                    const ic = b.querySelector('.slot-icon');
                    if (ic) {
                      ic.className = 'far fa-circle text-gray-300 slot-icon';
                    }
                  });
                  btn.classList.add('border-ccsOrange', 'bg-orange-50/60');
                  const activeIcon = btn.querySelector('.slot-icon');
                  if (activeIcon) {
                    activeIcon.className = 'fas fa-check-circle text-ccsOrange slot-icon';
                  }
                  selectedSlotInput.value = s.slot;
                };
              } else {
                btn.className = 'p-3 rounded-xl border border-gray-200 bg-gray-100 text-left text-xs cursor-not-allowed opacity-60 flex items-center justify-between';
                btn.disabled = true;
                btn.innerHTML = '<div><strong class="text-gray-400 block line-through">' + s.slot + '</strong><span class="text-[11px] text-rose-500 font-medium">' + s.note + '</span></div><i class="fas fa-lock text-gray-400"></i>';
              }

              slotContainer.appendChild(btn);
            });
          })
          .catch(err => {
            slotNotice.innerHTML = '<span class="text-rose-600">Gagal mengambil jadwal. Silakan muat ulang halaman.</span>';
          });
      });
    }

    // ─── VALIDASI FORM SEBELUM SUBMIT (MODAL POPUP TEGAS & LENGKAP) ─────
    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
      bookingForm.addEventListener('submit', function(e) {
        const errors = [];

        // 1. Validasi Paket Sewa
        const pkgInput = document.querySelector('input[name="package_type"]:checked');
        if (!pkgInput) {
          errors.push({
            label: currentLang === 'en' ? 'Rental Package' : (currentLang === 'cn' ? '租赁套餐' : 'Paket Sewa Lapangan'),
            msg: currentLang === 'en' ? 'Please select a rental package option.' : (currentLang === 'cn' ? '请选择一个租赁套餐。' : 'Silakan pilih salah satu paket sewa lapangan.'),
            el: document.getElementById('radio_paket_1')
          });
        }

        // 2. Validasi Tanggal Sewa
        const dateEl = document.getElementById('bookingDateInput');
        if (!dateEl || !dateEl.value) {
          errors.push({
            label: currentLang === 'en' ? 'Rental Date' : (currentLang === 'cn' ? '租赁日期' : 'Tanggal Sewa Lapangan'),
            msg: currentLang === 'en' ? 'Please select the date you wish to rent the sport hall.' : (currentLang === 'cn' ? '请选择预约日期。' : 'Silakan tentukan tanggal pemakaian lapangan.'),
            el: dateEl
          });
        }

        // 3. Validasi Sesi Jam Bermain
        const slotEl = document.getElementById('selectedTimeSlot');
        if (!slotEl || !slotEl.value) {
          const targetSlotEl = document.getElementById('slotContainer');
          errors.push({
            label: currentLang === 'en' ? 'Playing Time Slot' : (currentLang === 'cn' ? '预约时段' : 'Sesi Jam Bermain'),
            msg: currentLang === 'en' ? 'Please choose an available 2-hour playing slot from the list.' : (currentLang === 'cn' ? '请在列表中选择一个可用的 2 小时时段。' : 'Silakan klik salah satu sesi jam bermain yang masih tersedia.'),
            el: (targetSlotEl && !targetSlotEl.classList.contains('hidden')) ? targetSlotEl : dateEl
          });
        }

        // 4. Validasi Nama Lengkap Pemesan
        const nameEl = document.querySelector('input[name="renter_name"]');
        if (!nameEl || !nameEl.value.trim()) {
          errors.push({
            label: currentLang === 'en' ? 'Full Name' : (currentLang === 'cn' ? '负责人全名' : 'Nama Lengkap Pemesan'),
            msg: currentLang === 'en' ? 'Full name of the person in charge is mandatory.' : (currentLang === 'cn' ? '负责人全名为必填项。' : 'Nama lengkap penanggung jawab pemesanan wajib diisi.'),
            el: nameEl
          });
        }

        // 5. Validasi No. WhatsApp Aktif
        const phoneEl = document.querySelector('input[name="renter_phone"]');
        const phoneVal = phoneEl ? phoneEl.value.replace(/[^0-9]/g, '') : '';
        if (!phoneEl || !phoneEl.value.trim() || phoneVal.length < 8) {
          errors.push({
            label: currentLang === 'en' ? 'WhatsApp Number' : (currentLang === 'cn' ? 'WhatsApp 手机号码' : 'No. WhatsApp Aktif'),
            msg: currentLang === 'en' ? 'Active WhatsApp number is mandatory (min. 8 digits).' : (currentLang === 'cn' ? '请输入有效的 WhatsApp 手机号码（至少8位数字）。' : 'Nomor WhatsApp aktif wajib diisi dengan benar (minimal 8 digit angka).'),
            el: phoneEl
          });
        }

        // 6. Validasi Alamat Email
        const emailEl = document.querySelector('input[name="renter_email"]');
        const emailVal = emailEl ? emailEl.value.trim() : '';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailEl || !emailVal || !emailRegex.test(emailVal)) {
          errors.push({
            label: currentLang === 'en' ? 'Email Address' : (currentLang === 'cn' ? '电子邮箱地址' : 'Alamat Email Pemesan'),
            msg: currentLang === 'en' ? 'Valid email address is mandatory for confirmation dispatch.' : (currentLang === 'cn' ? '电子邮箱为必填项，用于接收官方确认函。' : 'Alamat email wajib diisi dengan format yang benar (contoh: nama@domain.com) untuk pengiriman konfirmasi booking.'),
            el: emailEl
          });
        }

        // 7. Validasi Persetujuan Ketentuan Sewa
        const agreeEl = document.querySelector('input[name="agree_rules"]');
        if (!agreeEl || !agreeEl.checked) {
          errors.push({
            label: currentLang === 'en' ? 'Court Rental Terms' : (currentLang === 'cn' ? '场地租赁规章制度' : 'Ketentuan & Tata Tertib Sewa'),
            msg: currentLang === 'en' ? 'You must read and agree to all Court Rental Terms.' : (currentLang === 'cn' ? '您必须阅读并勾选同意场地租赁须知及规章制度。' : 'Anda wajib mencentang persetujuan Ketentuan & Tata Tertib Sewa Lapangan.'),
            el: agreeEl
          });
        }

        // 8. Validasi Upload Bukti Transfer (WAJIB)
        const proofEl = document.getElementById('paymentProofInput');
        if (!proofEl || !proofEl.files || proofEl.files.length === 0) {
          errors.push({
            label: currentLang === 'en' ? 'Proof of Payment' : (currentLang === 'cn' ? '付款转账凭证' : 'Upload Bukti Transfer Bank Mayapada'),
            msg: currentLang === 'en' ? 'Proof of payment transfer is mandatory. Please upload your transfer receipt.' : (currentLang === 'cn' ? '付款转账凭证为必填项。请上传您的银行转账凭证。' : 'Bukti transfer pembayaran Bank Mayapada wajib diunggah. Silakan lampirkan foto/struk transfer.'),
            el: proofEl
          });
        } else {
          const file = proofEl.files[0];
          const ext = file.name.split('.').pop().toLowerCase();
          const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];
          if (!allowedExts.includes(ext)) {
            errors.push({
              label: currentLang === 'en' ? 'Proof File Format' : (currentLang === 'cn' ? '文件格式错误' : 'Format Berkas Bukti Transfer'),
              msg: currentLang === 'en' ? 'Invalid file format. Allowed formats: JPG, PNG, WEBP, or PDF.' : (currentLang === 'cn' ? '文件格式不支持。仅支持 JPG、PNG、WEBP 或 PDF。' : 'Format berkas bukti transfer tidak didukung. Harap gunakan file JPG, PNG, WEBP, atau PDF.'),
              el: proofEl
            });
          } else if (file.size > 5 * 1024 * 1024) {
            errors.push({
              label: currentLang === 'en' ? 'Proof File Size' : (currentLang === 'cn' ? '文件大小超限' : 'Ukuran Berkas Bukti Transfer'),
              msg: currentLang === 'en' ? 'File exceeds maximum limit of 5 MB.' : (currentLang === 'cn' ? '文件大小超过 5 MB 限制。' : 'Ukuran berkas bukti transfer melebihi batas maksimal 5 MB.'),
              el: proofEl
            });
          }
        }

        // Jika terdapat field yang belum lengkap / tidak valid, tampilkan MODAL POPUP
        if (errors.length > 0) {
          e.preventDefault();
          showValidationErrorModal(errors);
        }
      });
    }

    // Jika ada pesan error dari server PHP, munculkan otomatis via modal popup
    <?php if (!empty($errorMessage)): ?>
    document.addEventListener('DOMContentLoaded', function() {
      showSingleErrorModal(
        '<?= $currLang === 'en' ? 'Booking Submission Error' : ($currLang === 'cn' ? '提交预约失败' : 'Formulir Belum Lengkap') ?>',
        <?= json_encode($errorMessage) ?>
      );
    });
    <?php endif; ?>
  </script>

</body>
</html>
