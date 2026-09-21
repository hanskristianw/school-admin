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

        // Stepper Visual Lingkaran-Lingkaran (Multi-Stage Track)
        'stepper_title' => 'Alur & Status Posisi Pendaftaran',
        'stepper_subtitle' => 'Pantau setiap tahap proses pendaftaran calon siswa secara transparan dari awal hingga penerimaan.',
        'stepper_step1_title' => '1. Registrasi',
        'stepper_step1_sub' => 'Nomor Registrasi Terbit',
        'stepper_step2_title' => '2. Biaya Formulir',
        'stepper_step2_sub_upload' => 'Unggah Bukti Bayar',
        'stepper_step2_sub_review' => 'Verifikasi Struk',
        'stepper_step2_sub_rejected' => 'Bukti Ditolak',
        'stepper_step2_sub_done' => 'Lunas Terverifikasi',
        'stepper_step3_title' => '3. Biodata Lengkap',
        'stepper_step3_sub_locked' => 'Menunggu Pelunasan',
        'stepper_step3_sub_fill' => 'Lengkapi Biodata',
        'stepper_step3_sub_done' => 'Biodata Lengkap',
        'stepper_step4_title' => '4. Observasi & Review',
        'stepper_step4_sub_locked' => 'Menunggu Berkas',
        'stepper_step4_sub_process' => 'Peninjauan Berkas',
        'stepper_step4_sub_done' => 'Observasi Selesai',
        'stepper_step5_title' => '5. Hasil Seleksi',
        'stepper_step5_sub_locked' => 'Tahap Akhir',
        'stepper_step5_sub_approved' => 'Resmi Diterima!',
        'stepper_step5_sub_rejected' => 'Belum Lolos Seleksi',

        // Callout Kotak Posisi Saat Ini
        'callout_title_fee_upload' => 'Posisi Anda Saat Ini: Tahap 2 — Menunggu Bukti Pembayaran Formulir',
        'callout_text_fee_upload' => 'Pendaftaran awal berhasil diajukan. Silakan lakukan transfer biaya formulir ke rekening resmi Bank Mayapada di bawah, lalu unggah struk bukti bayar pada formulir yang tersedia.',
        'callout_title_fee_wait' => 'Posisi Anda Saat Ini: Tahap 2 — Menunggu Verifikasi Struk Pembayaran',
        'callout_text_fee_wait' => 'Bukti transfer Anda telah kami terima dan sedang diverifikasi oleh staf Admissions CCS. Segera setelah pembayaran diverifikasi, Tahap 3 (Formulir Biodata Lengkap) akan terbuka otomatis.',
        'callout_title_fee_rejected' => 'Posisi Anda Saat Ini: Tahap 2 — Bukti Pembayaran Perlu Diperbaiki',
        'callout_text_fee_rejected' => 'Bukti pembayaran sebelumnya ditolak oleh admin sekolah. Silakan periksa kembali rincian nominal dan rekening, lalu unggah kembali struk bukti transfer yang jelas dan sah.',
        'callout_title_fill' => 'Posisi Anda Saat Ini: Tahap 3 — Pengisian Formulir Biodata Calon Siswa & Orang Tua',
        'callout_text_fill' => 'Pembayaran biaya formulir telah LUNAS & DIVERIFIKASI! Silakan lengkapi biodata calon siswa dan orang tua di bawah ini untuk persiapan jadwal observasi dan tes penempatan.',
        'callout_title_review' => 'Posisi Anda Saat Ini: Tahap 4 — Peninjauan Berkas & Penjadwalan Observasi',
        'callout_text_review' => 'Seluruh biodata calon siswa telah lengkap tersimpan. Tim Admissions CCS sedang meninjau berkas dan akan segera menghubungi nomor WhatsApp Anda untuk konfirmasi jadwal observasi dan wawancara.',
        'callout_title_approved' => '🎉 Selamat! Calon Siswa Resmi DITERIMA di Chung Chung Christian School',
        'callout_text_approved' => 'Selamat, pendaftaran calon siswa telah disetujui dan dinyatakan resmi diterima. Tim sekolah akan segera menghubungi Anda untuk pengiriman surat penerimaan dan prosedur daftar ulang.',
        'callout_title_rejected' => 'Status Pendaftaran: Belum Memenuhi Kriteria Penerimaan',
        'callout_text_rejected' => 'Mohon maaf, pendaftaran calon siswa belum dapat diterima pada periode saat ini. Terima kasih atas minat dan kepercayaan Anda terhadap Chung Chung Christian School.',

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

        // Pilihan Jadwal Tes & Wawancara (Section 3)
        'sec3_schedule' => '3. Pilihan Jadwal Tes Penempatan Siswa & Wawancara Orang Tua',
        'sec3_schedule_desc' => 'Silakan tentukan jadwal tes penempatan calon siswa dan jadwal wawancara orang tua. Tes dan wawancara dapat dijadwalkan pada hari yang sama maupun pada hari yang berbeda sesuai kenyamanan Anda.',
        'lbl_same_day_toggle' => 'Jadwalkan Tes & Wawancara pada Hari yang Sama (Direkomendasikan)',
        'lbl_test_date' => 'Tanggal Tes Penempatan Siswa',
        'lbl_test_session' => 'Pilihan Sesi Waktu Tes',
        'lbl_interview_date' => 'Tanggal Wawancara Orang Tua',
        'lbl_interview_session' => 'Pilihan Sesi Waktu Wawancara',
        'lbl_schedule_notes' => 'Catatan Tambahan Mengenai Jadwal (Opsional)',
        'session_opt_1' => 'Sesi 1 (08:30 - 10:00 WIB)',
        'session_opt_2' => 'Sesi 2 (10:30 - 12:00 WIB)',
        'session_opt_3' => 'Sesi 3 (13:00 - 14:30 WIB)',
        'session_opt_4' => 'Sesi 4 (15:00 - 16:30 WIB)',
        'confirmed_schedule_title' => 'Jadwal Tes Penempatan & Wawancara Orang Tua',
        'test_schedule_badge' => 'Tes Penempatan Calon Siswa',
        'interview_schedule_badge' => 'Wawancara Orang Tua & Observasi',
        'btn_reschedule' => 'Ajukan Perubahan Jadwal (Reschedule)',
        'schedule_location' => 'Lokasi: Kampus Chung Chung Christian School, Jl. Raya Gn. Anyar Sawah No.18, Gn. Anyar, Kec. Gn. Anyar, Surabaya, Jawa Timur 60294',
        'schedule_notes_label' => 'Catatan Jadwal:',

        // Tanda Terima Selesai
        'receipt_title' => 'Formulir Pendaftaran Lengkap Telah Diterima!',
        'receipt_desc' => 'Seluruh data calon siswa telah tersimpan resmi di sistem Chung Chung Christian School.',
        'receipt_status' => 'Pembayaran Lunas & Data Lengkap',
        'receipt_contact_soon' => 'Tim Admissions CCS akan segera menghubungi nomor WhatsApp Anda untuk konfirmasi pelaksanaan jadwal observasi dan tes penempatan.',

        // Hasil Seleksi Diterima (Official Acceptance)
        'approved_card_title' => 'Selamat! Calon Siswa Resmi Diterima di CCS',
        'approved_card_desc' => 'Pendaftaran atas nama %s pada jenjang %s telah resmi disetujui. Tim sekolah telah mengirimkan Surat Keputusan Penerimaan (Letter of Acceptance) dan panduan daftar ulang ke email Anda.',
        'approved_card_badge' => 'Hasil Seleksi: Resmi Diterima',
        'approved_card_status' => 'Resmi Diterima di CCS',
        'approved_card_email_notice' => 'Surat Keputusan Penerimaan resmi (Letter of Acceptance) telah dikirimkan ke alamat email terdaftar. Silakan periksa kotak masuk atau folder spam email Anda untuk panduan registrasi ulang.',
        'approved_card_admin_notes' => 'Catatan Tim Admissions:',
        'approved_sched_history_title' => 'Riwayat Observasi & Tes Penempatan',
        'approved_sched_history_sub' => 'Telah Dilaksanakan',
        'approved_sched_history_badge' => 'Selesai',

        // Kupon Promosi Status
        'promo_default_title' => 'Kupon Promosi Pendaftaran',
        'promo_applied_text' => 'Kupon promosi resmi terkonfirmasi dan telah diterapkan pada rincian pembiayaan calon siswa ini.',
        'promo_confirmed_text' => 'Kupon promosi resmi terkonfirmasi dan kuota potongan biaya telah terkunci untuk calon siswa ini.',
        'promo_exhausted_text' => 'Mohon maaf, kuota kode promosi ini telah habis terisi oleh pendaftar lain yang menyelesaikan pembayaran formulir lebih awal.',
        'promo_pending_text' => 'Klaim kode promosi tercatat. Kuota promosi akan resmi terkunci setelah pembayaran biaya formulir diverifikasi lunas oleh pihak sekolah.',
        'promo_badge_applied' => 'Kupon Diterapkan',
        'promo_badge_confirmed' => 'Kuota Terkonfirmasi',
        'promo_badge_exhausted' => 'Kuota Habis',
        'promo_badge_pending' => 'Menunggu Pelunasan Formulir',

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

        // Stepper Visual Multi-Stage Circles
        'stepper_title' => 'Admission Process & Stage Status',
        'stepper_subtitle' => 'Track each milestone of your application journey from submission to enrollment.',
        'stepper_step1_title' => '1. Registration',
        'stepper_step1_sub' => 'Registration Code Issued',
        'stepper_step2_title' => '2. Form Fee',
        'stepper_step2_sub_upload' => 'Upload Receipt',
        'stepper_step2_sub_review' => 'Verifying Payment',
        'stepper_step2_sub_rejected' => 'Receipt Rejected',
        'stepper_step2_sub_done' => 'Payment Verified',
        'stepper_step3_title' => '3. Complete Profile',
        'stepper_step3_sub_locked' => 'Locked (Pending Fee)',
        'stepper_step3_sub_fill' => 'Fill Candidate Profile',
        'stepper_step3_sub_done' => 'Profile Completed',
        'stepper_step4_title' => '4. Observation',
        'stepper_step4_sub_locked' => 'Waiting Profile',
        'stepper_step4_sub_process' => 'Document Review',
        'stepper_step4_sub_done' => 'Observation Done',
        'stepper_step5_title' => '5. Final Admission',
        'stepper_step5_sub_locked' => 'Final Stage',
        'stepper_step5_sub_approved' => 'Officially Accepted!',
        'stepper_step5_sub_rejected' => 'Not Accepted',

        // Callout Current Position
        'callout_title_fee_upload' => 'Current Position: Stage 2 — Awaiting Form Fee Transfer Receipt',
        'callout_text_fee_upload' => 'Initial registration recorded. Please transfer the form fee to the official Bank Mayapada account below and upload your transfer receipt.',
        'callout_title_fee_wait' => 'Current Position: Stage 2 — Verifying Payment Receipt',
        'callout_text_fee_wait' => 'Your transfer receipt has been received and is being verified by Admissions staff. Once verified, Stage 3 (Complete Student Background Profile) will open automatically.',
        'callout_title_fee_rejected' => 'Current Position: Stage 2 — Payment Receipt Needs Correction',
        'callout_text_fee_rejected' => 'Your previous receipt was rejected. Please review the transfer details and re-upload a clear, valid payment receipt.',
        'callout_title_fill' => 'Current Position: Stage 3 — Complete Candidate & Parent Profile',
        'callout_text_fill' => 'Form fee payment has been VERIFIED! Please complete all student candidate and parent details below for observation and placement procedures.',
        'callout_title_review' => 'Current Position: Stage 4 — Document Review & Observation Scheduling',
        'callout_text_review' => 'All candidate details have been successfully recorded. Admissions staff will contact your WhatsApp shortly to confirm observation and interview schedules.',
        'callout_title_approved' => '🎉 Congratulations! Candidate Officially ACCEPTED at CCS',
        'callout_text_approved' => 'Congratulations, the candidate application has been approved and officially accepted. Our school team will contact you regarding enrollment procedures.',
        'callout_title_rejected' => 'Application Status: Not Accepted',
        'callout_text_rejected' => 'We regret to inform you that the application does not meet the admission criteria for this intake. Thank you for your interest in Chung Chung Christian School.',

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

        // Schedule Selection (Section 3)
        'sec3_schedule' => '3. Student Placement Test & Parent Interview Schedule',
        'sec3_schedule_desc' => 'Please select the candidate placement test date and parent interview date. Both can be scheduled on the same day or on different dates according to your availability.',
        'lbl_same_day_toggle' => 'Schedule Test & Interview on the Same Day (Recommended)',
        'lbl_test_date' => 'Student Placement Test Date',
        'lbl_test_session' => 'Test Time Session',
        'lbl_interview_date' => 'Parent Interview Date',
        'lbl_interview_session' => 'Interview Time Session',
        'lbl_schedule_notes' => 'Additional Schedule Notes (Optional)',
        'session_opt_1' => 'Session 1 (08:30 - 10:00 WIB)',
        'session_opt_2' => 'Session 2 (10:30 - 12:00 WIB)',
        'session_opt_3' => 'Session 3 (13:00 - 14:30 WIB)',
        'session_opt_4' => 'Session 4 (15:00 - 16:30 WIB)',
        'confirmed_schedule_title' => 'Confirmed Placement Test & Parent Interview Schedule',
        'test_schedule_badge' => 'Student Placement Test',
        'interview_schedule_badge' => 'Parent Interview & Observation',
        'btn_reschedule' => 'Request Schedule Adjustment (Reschedule)',
        'schedule_location' => 'Venue: Chung Chung Christian School Campus, Jl. Raya Gn. Anyar Sawah No.18, Gn. Anyar, Kec. Gn. Anyar, Surabaya, Jawa Timur 60294',
        'schedule_notes_label' => 'Schedule Notes:',

        // Receipt Done
        'receipt_title' => 'Complete Application Form Received!',
        'receipt_desc' => 'All candidate background details have been recorded in Chung Chung Christian School\'s official database.',
        'receipt_status' => 'Payment Settled & Data Complete',
        'receipt_contact_soon' => 'The CCS Admissions team will contact your WhatsApp number shortly to confirm your scheduled observation and placement test.',

        // Selection Result Accepted (Official Acceptance)
        'approved_card_title' => 'Congratulations! Candidate Officially Accepted at CCS',
        'approved_card_desc' => 'The application for %s for grade level %s has been officially approved. The school has issued the official Letter of Acceptance (LoA) and enrollment guidelines to your email.',
        'approved_card_badge' => 'Selection Result: Officially Accepted',
        'approved_card_status' => 'Officially Accepted at CCS',
        'approved_card_email_notice' => 'The official Letter of Acceptance (LoA) has been sent to your registered email address. Please check your inbox or spam folder for re-registration details.',
        'approved_card_admin_notes' => 'Admissions Notes:',
        'approved_sched_history_title' => 'Observation & Placement Test Records',
        'approved_sched_history_sub' => 'Successfully Completed',
        'approved_sched_history_badge' => 'Completed',

        // Promo Coupon Status
        'promo_default_title' => 'Registration Promo Coupon',
        'promo_applied_text' => 'Promo coupon officially confirmed and applied to this student\'s fee structure.',
        'promo_confirmed_text' => 'Promo coupon officially confirmed and discount quota locked for this candidate.',
        'promo_exhausted_text' => 'We apologize, the quota for this promo code has been filled by other applicants who completed form payment earlier.',
        'promo_pending_text' => 'Promo code claim recorded. Promo quota will be officially locked once form fee payment is verified.',
        'promo_badge_applied' => 'Coupon Applied',
        'promo_badge_confirmed' => 'Quota Confirmed',
        'promo_badge_exhausted' => 'Quota Exhausted',
        'promo_badge_pending' => 'Awaiting Form Payment',

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

        // Stepper Visual Multi-Stage Circles
        'stepper_title' => '新生入学报名进度与状态',
        'stepper_subtitle' => '实时查看学生入学申请的各项环节进度与录取状态。',
        'stepper_step1_title' => '1. 初始申请',
        'stepper_step1_sub' => '报名编号已生成',
        'stepper_step2_title' => '2. 表格缴费',
        'stepper_step2_sub_upload' => '上传转账凭证',
        'stepper_step2_sub_review' => '凭证核实中',
        'stepper_step2_sub_rejected' => '凭证被驳回',
        'stepper_step2_sub_done' => '已核实缴费',
        'stepper_step3_title' => '3. 完善档案',
        'stepper_step3_sub_locked' => '锁定 (待缴费)',
        'stepper_step3_sub_fill' => '请完善学生档案',
        'stepper_step3_sub_done' => '档案已录入',
        'stepper_step4_title' => '4. 观察审核',
        'stepper_step4_sub_locked' => '待档案录入',
        'stepper_step4_sub_process' => '资料审核中',
        'stepper_step4_sub_done' => '评估已完成',
        'stepper_step5_title' => '5. 录取结果',
        'stepper_step5_sub_locked' => '最终结果',
        'stepper_step5_sub_approved' => '正式录取！',
        'stepper_step5_sub_rejected' => '未予录取',

        // Callout Current Position
        'callout_title_fee_upload' => '当前所处阶段：第 2 步 — 等待上传转账付款凭证',
        'callout_text_fee_upload' => '初步申请已登记成功。请向下方官方 Bank Mayapada 银行账户转账报名费，并在下方表单中上传转账凭证。',
        'callout_title_fee_wait' => '当前所处阶段：第 2 步 — 凭证正在核查中',
        'callout_text_fee_wait' => '您的转账凭证已收到并正在由 CCS 招生团队审核。一旦通过核准，系统将自动开启第 3 步（学生与家庭详细档案表）。',
        'callout_title_fee_rejected' => '当前所处阶段：第 2 步 — 付款凭证需重新上传',
        'callout_text_fee_rejected' => '您之前提交的转账凭证已被驳回。请仔细核对转账单据，重新上传清晰有效的转账凭证。',
        'callout_title_fill' => '当前所处阶段：第 3 步 — 填写学生与家庭详细背景档案',
        'callout_text_fill' => '报名费已审核确认！请在下方完整填写拟入学学生与家长的详细背景资料，以供学校安排后续观察与面谈。',
        'callout_title_review' => '当前所处阶段：第 4 步 — 资料审核与安排入学观察',
        'callout_text_review' => '学生详细档案已全部录入归档。CCS 招生团队正在审核资料并将尽快通过 WhatsApp 联系您确定入学观察与面谈的时间。',
        'callout_title_approved' => '🎉 祝贺！学生已被崇崇基督教学校 (CCS) 正式录取',
        'callout_text_approved' => '祝贺您，学生入学申请已获审核批准并正式录取。学校招生处老师将尽快与您联系后续入学建档及注册手续。',
        'callout_title_rejected' => '申请状态：暂未达到本次录取要求',
        'callout_text_rejected' => '很遗憾，学生本次申请暂未符合本期录取标准。衷心感谢您对崇崇基督教学校的关注与支持。',

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

        // Schedule Selection (Section 3)
        'sec3_schedule' => '3. 学生入学测试与家长面谈时间预约',
        'sec3_schedule_desc' => '请预约学生入学分班测试及家长面谈的时间。两项活动可根据您的方便安排在同一天或不同日期。',
        'lbl_same_day_toggle' => '在同一天安排测试与面谈（推荐）',
        'lbl_test_date' => '学生入学测试日期',
        'lbl_test_session' => '测试时段选择',
        'lbl_interview_date' => '家长面谈日期',
        'lbl_interview_session' => '面谈时段选择',
        'lbl_schedule_notes' => '日程特别备注（可选）',
        'session_opt_1' => '第 1 场 (08:30 - 10:00 印尼西部时间)',
        'session_opt_2' => '第 2 场 (10:30 - 12:00 印尼西部时间)',
        'session_opt_3' => '第 3 场 (13:00 - 14:30 印尼西部时间)',
        'session_opt_4' => '第 4 场 (15:00 - 16:30 印尼西部时间)',
        'confirmed_schedule_title' => '已确认入学测试与家长面谈安排',
        'test_schedule_badge' => '学生入学分班测试',
        'interview_schedule_badge' => '家长面谈与入学观察',
        'btn_reschedule' => '申请调整时间 (改期)',
        'schedule_location' => '地点：崇崇基督教学校校园，Jl. Raya Gn. Anyar Sawah No.18, Gn. Anyar, Kec. Gn. Anyar, Surabaya, Jawa Timur 60294',
        'schedule_notes_label' => '时间安排备注：',

        // Receipt Done
        'receipt_title' => '完整报名表已成功接收！',
        'receipt_desc' => '学生所有详细资料已完整录入并安全归档于崇崇基督教学校官方管理系统。',
        'receipt_status' => '费用结清 & 资料完整',
        'receipt_contact_soon' => 'CCS 招生团队将尽快通过 WhatsApp 与您联系确认测试与面谈安排。',

        // Selection Result Accepted (Official Acceptance)
        'approved_card_title' => '热烈祝贺！学生已正式被崇崇基督教学校 (CCS) 录取',
        'approved_card_desc' => '学生 %s 申请就读 %s 阶段已获得官方正式批准。学校已将正式录取通知书（Letter of Acceptance）及入学注册指引发送至您的邮箱。',
        'approved_card_badge' => '审核结果：正式录取',
        'approved_card_status' => '正式录取 (Approved)',
        'approved_card_email_notice' => '官方录取通知书（Letter of Acceptance）已发送至您的注册邮箱。请查阅收件箱或垃圾邮件文件夹以获取后续注册及缴费指引。',
        'approved_card_admin_notes' => '招生团队审核意见：',
        'approved_sched_history_title' => '入学观察与分班测试记录',
        'approved_sched_history_sub' => '已顺利完成',
        'approved_sched_history_badge' => '已完成',

        // Promo Coupon Status
        'promo_default_title' => '新生优惠代码',
        'promo_applied_text' => '优惠代码已正式确认，并已成功应用于该学生的学费明细中。',
        'promo_confirmed_text' => '优惠代码已正式确认，折扣名额已为该候选学生成功锁定。',
        'promo_exhausted_text' => '很抱歉，该优惠代码的名额已被更早完成缴费的其他申请人占满。',
        'promo_pending_text' => '优惠代码登记成功。报名表费用经学校审核结清后，优惠名额将正式锁定。',
        'promo_badge_applied' => '优惠已应用',
        'promo_badge_confirmed' => '名额已锁定',
        'promo_badge_exhausted' => '名额已满',
        'promo_badge_pending' => '等待报名表缴费',

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
        $sameDay = !empty($_POST['same_day_schedule']);
        $testDate = trim($_POST['test_date'] ?? '');
        $interviewDate = $sameDay ? $testDate : trim($_POST['interview_date'] ?? '');

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
            'additional_notes' => trim($_POST['additional_notes'] ?? ''),
            'test_date' => $testDate,
            'test_session' => trim($_POST['test_session'] ?? 'Sesi 1 (08:30 - 10:00 WIB)'),
            'interview_date' => $interviewDate,
            'interview_session' => trim($_POST['interview_session'] ?? 'Sesi 1 (08:30 - 10:00 WIB)'),
            'schedule_notes' => trim($_POST['schedule_notes'] ?? '')
        ];

        $res = callNextJsApi('POST', [], $payload);

        if (!empty($res['success'])) {
            $flashMsg = 'Selamat! Formulir biodata calon siswa dan pilihan jadwal tes/wawancara telah lengkap tersimpan.';
            $flashType = 'success';
        } else {
            $flashMsg = 'Gagal menyimpan formulir lengkap: ' . ($res['message'] ?? 'Error');
            $flashType = 'error';
        }
    }
}

// ─── 6b. PROSES PERUBAHAN JADWAL TES & WAWANCARA (RESCHEDULE OLEH USER) ──────
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action_update_schedule'])) {
    $csrf = $_POST['csrf_token'] ?? '';
    $targetAppNo = trim($_POST['target_app_no'] ?? ($_SESSION['applicant_app_no'] ?? ''));

    if ($csrf !== $_SESSION['csrf_token']) {
        $flashMsg = 'Sesi formulir kadaluarsa. Silakan coba lagi.';
        $flashType = 'error';
    } elseif (empty($targetAppNo)) {
        $flashMsg = 'Nomor registrasi pendaftar tidak valid.';
        $flashType = 'error';
    } else {
        $sameDay = !empty($_POST['same_day_schedule']);
        $testDate = trim($_POST['test_date'] ?? '');
        $interviewDate = $sameDay ? $testDate : trim($_POST['interview_date'] ?? '');

        $payload = [
            'action' => 'update_schedule',
            'application_number' => $targetAppNo,
            'test_date' => $testDate,
            'test_session' => trim($_POST['test_session'] ?? 'Sesi 1 (08:30 - 10:00 WIB)'),
            'interview_date' => $interviewDate,
            'interview_session' => trim($_POST['interview_session'] ?? 'Sesi 1 (08:30 - 10:00 WIB)'),
            'schedule_notes' => trim($_POST['schedule_notes'] ?? '')
        ];

        $res = callNextJsApi('POST', [], $payload);

        if (!empty($res['success'])) {
            $flashMsg = 'Jadwal tes penempatan dan wawancara orang tua berhasil diperbarui!';
            $flashType = 'success';
        } else {
            $flashMsg = 'Gagal memperbarui jadwal: ' . ($res['message'] ?? 'Error');
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

// Helper untuk styling badge lingkaran stepper
function getCircleBadge($step) {
    $st = $step['state'];
    if ($st === 'done') {
        return [
            'circle' => 'bg-emerald-500 text-white shadow-sm ring-4 ring-emerald-100',
            'icon' => 'fas fa-check text-sm',
            'subClass' => 'text-emerald-700 font-semibold'
        ];
    } elseif ($st === 'waiting_review') {
        return [
            'circle' => 'bg-sky-500 text-white shadow-md ring-4 ring-sky-200 animate-pulse',
            'icon' => 'fas fa-clock text-sm',
            'subClass' => 'text-sky-700 font-bold'
        ];
    } elseif ($st === 'waiting_upload') {
        return [
            'circle' => 'bg-ccsOrange text-white shadow-md ring-4 ring-orange-200',
            'icon' => 'fas fa-arrow-down text-sm',
            'subClass' => 'text-ccsOrange font-bold'
        ];
    } elseif ($st === 'active_fill') {
        return [
            'circle' => 'bg-ccsOrange text-white shadow-md ring-4 ring-orange-200',
            'icon' => 'fas fa-edit text-sm',
            'subClass' => 'text-ccsOrange font-bold'
        ];
    } elseif ($st === 'in_review') {
        return [
            'circle' => 'bg-sky-600 text-white shadow-md ring-4 ring-sky-200 animate-pulse',
            'icon' => 'fas fa-search text-sm',
            'subClass' => 'text-sky-700 font-bold'
        ];
    } elseif ($st === 'approved') {
        return [
            'circle' => 'bg-emerald-600 text-white shadow-md ring-4 ring-emerald-200',
            'icon' => 'fas fa-graduation-cap text-sm',
            'subClass' => 'text-emerald-700 font-extrabold'
        ];
    } elseif ($st === 'rejected') {
        return [
            'circle' => 'bg-rose-500 text-white shadow-md ring-4 ring-rose-200',
            'icon' => 'fas fa-exclamation text-sm',
            'subClass' => 'text-rose-700 font-bold'
        ];
    } else {
        // locked
        return [
            'circle' => 'bg-slate-200 text-slate-400 ring-4 ring-slate-50',
            'icon' => 'fas fa-lock text-xs',
            'subClass' => 'text-slate-400 font-normal'
        ];
    }
}

// Helper format tanggal multi-bahasa
function formatTanggalIndo($dateStr, $lang = 'id') {
    if (!$dateStr) return '-';
    $t = strtotime($dateStr);
    if (!$t) return $dateStr;
    if ($lang === 'en') {
        return date('d M Y', $t);
    } elseif ($lang === 'cn') {
        return date('Y年m月d日', $t);
    }
    $bulan = [
        1 => 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    $d = date('j', $t);
    $m = (int)date('n', $t);
    $y = date('Y', $t);
    return "$d " . ($bulan[$m] ?? date('M', $t)) . " $y";
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
  <!-- 3. KONTEN UTAMA: CEK STATUS, STEPPER LINGKARAN, REKENING & UPLOAD      -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <main class="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-8">

    <!-- BANNER PANDUAN: JIKA BELUM MENDAFTAR -->
    <div class="bg-blue-50/60 border border-blue-200 rounded-md p-3.5 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
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
        <?php
          $feeStatus     = $currentApplicant['form_fee_status'] ?? 'pending';
          $isFormDone    = !empty($currentApplicant['is_form_completed']);
          $overallStatus = $currentApplicant['status'] ?? 'pending';

          // 1. Pendaftaran Awal (Selalu selesai jika record ada)
          $s1 = ['state' => 'done', 'title' => $L['stepper_step1_title'], 'sub' => $L['stepper_step1_sub']];

          // 2. Biaya Formulir
          if ($feeStatus === 'verified') {
              $s2 = ['state' => 'done', 'title' => $L['stepper_step2_title'], 'sub' => $L['stepper_step2_sub_done']];
          } elseif ($feeStatus === 'proof_uploaded') {
              $s2 = ['state' => 'waiting_review', 'title' => $L['stepper_step2_title'], 'sub' => $L['stepper_step2_sub_review']];
          } elseif ($feeStatus === 'rejected') {
              $s2 = ['state' => 'rejected', 'title' => $L['stepper_step2_title'], 'sub' => $L['stepper_step2_sub_rejected']];
          } else {
              $s2 = ['state' => 'waiting_upload', 'title' => $L['stepper_step2_title'], 'sub' => $L['stepper_step2_sub_upload']];
          }

          // 3. Formulir Biodata
          if ($isFormDone) {
              $s3 = ['state' => 'done', 'title' => $L['stepper_step3_title'], 'sub' => $L['stepper_step3_sub_done']];
          } elseif ($feeStatus === 'verified') {
              $s3 = ['state' => 'active_fill', 'title' => $L['stepper_step3_title'], 'sub' => $L['stepper_step3_sub_fill']];
          } else {
              $s3 = ['state' => 'locked', 'title' => $L['stepper_step3_title'], 'sub' => $L['stepper_step3_sub_locked']];
          }

          // 4. Observasi & Review
          if ($overallStatus === 'approved' || $overallStatus === 'rejected') {
              $s4 = ['state' => 'done', 'title' => $L['stepper_step4_title'], 'sub' => $L['stepper_step4_sub_done']];
          } elseif ($isFormDone) {
              $s4 = ['state' => 'in_review', 'title' => $L['stepper_step4_title'], 'sub' => $L['stepper_step4_sub_process']];
          } else {
              $s4 = ['state' => 'locked', 'title' => $L['stepper_step4_title'], 'sub' => $L['stepper_step4_sub_locked']];
          }

          // 5. Hasil Penerimaan
          if ($overallStatus === 'approved') {
              $s5 = ['state' => 'approved', 'title' => $L['stepper_step5_title'], 'sub' => $L['stepper_step5_sub_approved']];
          } elseif ($overallStatus === 'rejected') {
              $s5 = ['state' => 'rejected', 'title' => $L['stepper_step5_title'], 'sub' => $L['stepper_step5_sub_rejected']];
          } else {
              $s5 = ['state' => 'locked', 'title' => $L['stepper_step5_title'], 'sub' => $L['stepper_step5_sub_locked']];
          }

          $allSteps = [$s1, $s2, $s3, $s4, $s5];

          // Persentase garis track desktop
          if ($s5['state'] === 'approved' || $s5['state'] === 'rejected') {
              $progressPct = 100;
          } elseif ($s4['state'] === 'in_review' || $s4['state'] === 'done') {
              $progressPct = 75;
          } elseif ($s3['state'] === 'done' || $s3['state'] === 'active_fill') {
              $progressPct = 50;
          } elseif ($s2['state'] === 'done') {
              $progressPct = 50;
          } elseif ($s2['state'] === 'waiting_review') {
              $progressPct = 37.5;
          } else {
              $progressPct = 25;
          }

          // Callout Box Content
          if ($s5['state'] === 'approved') {
              $callout = [
                  'title' => $L['callout_title_approved'],
                  'text' => $L['callout_text_approved'],
                  'icon' => 'fas fa-graduation-cap text-emerald-800 text-lg',
                  'boxClass' => 'bg-emerald-50 border-emerald-300 text-emerald-900',
                  'iconBg' => 'bg-emerald-200/80',
                  'titleClass' => 'text-emerald-950 font-bold'
              ];
          } elseif ($s5['state'] === 'rejected') {
              $callout = [
                  'title' => $L['callout_title_rejected'],
                  'text' => $L['callout_text_rejected'],
                  'icon' => 'fas fa-times-circle text-rose-700 text-lg',
                  'boxClass' => 'bg-rose-50 border-rose-300 text-rose-900',
                  'iconBg' => 'bg-rose-200/80',
                  'titleClass' => 'text-rose-950 font-bold'
              ];
          } elseif ($s4['state'] === 'in_review') {
              $callout = [
                  'title' => $L['callout_title_review'],
                  'text' => $L['callout_text_review'],
                  'icon' => 'fas fa-user-clock text-sky-700 text-lg',
                  'boxClass' => 'bg-sky-50 border-sky-300 text-sky-900',
                  'iconBg' => 'bg-sky-200/80',
                  'titleClass' => 'text-sky-950 font-bold'
              ];
          } elseif ($s3['state'] === 'active_fill') {
              $callout = [
                  'title' => $L['callout_title_fill'],
                  'text' => $L['callout_text_fill'],
                  'icon' => 'fas fa-edit text-orange-700 text-lg',
                  'boxClass' => 'bg-orange-50 border-orange-300 text-orange-950',
                  'iconBg' => 'bg-orange-200/80',
                  'titleClass' => 'text-orange-950 font-bold'
              ];
          } elseif ($s2['state'] === 'waiting_review') {
              $callout = [
                  'title' => $L['callout_title_fee_wait'],
                  'text' => $L['callout_text_fee_wait'],
                  'icon' => 'fas fa-clock text-sky-700 text-lg',
                  'boxClass' => 'bg-sky-50 border-sky-300 text-sky-900',
                  'iconBg' => 'bg-sky-200/80',
                  'titleClass' => 'text-sky-950 font-bold'
              ];
          } elseif ($s2['state'] === 'rejected') {
              $callout = [
                  'title' => $L['callout_title_fee_rejected'],
                  'text' => $L['callout_text_fee_rejected'],
                  'icon' => 'fas fa-exclamation-triangle text-rose-700 text-lg',
                  'boxClass' => 'bg-rose-50 border-rose-300 text-rose-900',
                  'iconBg' => 'bg-rose-200/80',
                  'titleClass' => 'text-rose-950 font-bold'
              ];
          } else {
              $callout = [
                  'title' => $L['callout_title_fee_upload'],
                  'text' => $L['callout_text_fee_upload'],
                  'icon' => 'fas fa-arrow-down text-orange-700 text-lg',
                  'boxClass' => 'bg-orange-50 border-orange-300 text-orange-950',
                  'iconBg' => 'bg-orange-200/80',
                  'titleClass' => 'text-orange-950 font-bold'
              ];
          }
        ?>

        <div class="bg-white border border-gray-200 rounded-md p-5 sm:p-6 space-y-6">
          
          <!-- Baris Header: Nomor Registrasi & Badge Status -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 pb-4 gap-2">
            <div>
              <span class="text-xs text-gray-500 uppercase tracking-wide font-medium"><?= htmlspecialchars($L['lbl_code']) ?></span>
              <div class="text-2xl font-bold font-mono text-ccsHeading mt-0.5 tracking-wider"><?= htmlspecialchars($currentApplicant['application_number']) ?></div>
            </div>
            <div>
              <?php
                if ($overallStatus === 'approved') {
                    $badgeClass = 'bg-emerald-100 text-emerald-800 border border-emerald-300';
                    $badgeIcon  = 'fas fa-graduation-cap text-emerald-700';
                    $badgeText  = 'Diterima di CCS';
                } elseif ($overallStatus === 'rejected') {
                    $badgeClass = 'bg-rose-100 text-rose-800 border border-rose-300';
                    $badgeIcon  = 'fas fa-times-circle text-rose-700';
                    $badgeText  = 'Belum Diterima';
                } elseif ($feeStatus === 'verified') {
                    $badgeClass = 'bg-emerald-50 text-emerald-800 border border-emerald-200';
                    $badgeIcon  = 'fas fa-check-circle text-emerald-600';
                    $badgeText  = $L['status_verified'];
                } elseif ($feeStatus === 'proof_uploaded') {
                    $badgeClass = 'bg-sky-50 text-sky-800 border border-sky-200';
                    $badgeIcon  = 'fas fa-clock text-sky-600';
                    $badgeText  = $L['status_proof_uploaded'];
                } elseif ($feeStatus === 'rejected') {
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

          <?php if (!empty($currentApplicant['promo_code'])): 
            $pStatus = $currentApplicant['promo_status'] ?? 'pending_payment';
            $isFormVerified = ($currentApplicant['form_fee_status'] ?? '') === 'verified';
            $isConfirmed = in_array($pStatus, ['confirmed', 'applied']) || $isFormVerified;
            $isExhausted = ($pStatus === 'quota_exhausted') && !$isFormVerified;
            $isApplied = ($pStatus === 'applied');
          ?>
          <!-- Informasi Kupon Promosi Terdaftar -->
          <div class="border rounded-md p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs <?= $isConfirmed ? 'bg-emerald-50/70 border-emerald-200' : ($isExhausted ? 'bg-rose-50/70 border-rose-200' : 'bg-purple-50/70 border-purple-200') ?>">
            <div class="flex items-center gap-2.5">
              <span class="text-white font-mono font-bold px-2.5 py-1 rounded text-xs flex items-center gap-1.5 shadow-xs shrink-0 <?= $isConfirmed ? 'bg-emerald-700' : ($isExhausted ? 'bg-rose-700' : 'bg-purple-700') ?>">
                <i class="fas fa-tag"></i> <?= htmlspecialchars($currentApplicant['promo_code']) ?>
              </span>
              <div>
                <span class="font-bold block <?= $isConfirmed ? 'text-emerald-950' : ($isExhausted ? 'text-rose-950' : 'text-purple-950') ?>">
                  <?= htmlspecialchars($currentApplicant['promo_details']['discount_name'] ?? ($L['promo_default_title'] ?? 'Kupon Promosi Pendaftaran')) ?>
                </span>
                <span class="text-[11px] <?= $isConfirmed ? 'text-emerald-700' : ($isExhausted ? 'text-rose-700' : 'text-purple-700') ?>">
                  <?php if ($isConfirmed): ?>
                    <?php if ($isApplied): ?>
                      <?= htmlspecialchars($L['promo_applied_text'] ?? 'Kupon promosi resmi terkonfirmasi dan telah diterapkan pada rincian pembiayaan calon siswa ini.') ?>
                    <?php else: ?>
                      <?= htmlspecialchars($L['promo_confirmed_text'] ?? 'Kupon promosi resmi terkonfirmasi dan kuota potongan biaya telah terkunci untuk calon siswa ini.') ?>
                    <?php endif; ?>
                  <?php elseif ($isExhausted): ?>
                    <?= htmlspecialchars($L['promo_exhausted_text'] ?? 'Mohon maaf, kuota kode promosi ini telah habis terisi oleh pendaftar lain yang menyelesaikan pembayaran formulir lebih awal.') ?>
                  <?php else: ?>
                    <?= htmlspecialchars($L['promo_pending_text'] ?? 'Klaim kode promosi tercatat. Kuota promosi akan resmi terkunci setelah pembayaran biaya formulir diverifikasi lunas oleh pihak sekolah.') ?>
                  <?php endif; ?>
                </span>
              </div>
            </div>
            <span class="inline-block self-start sm:self-auto px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase border shrink-0 <?= $isConfirmed ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : ($isExhausted ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-amber-100 text-amber-800 border-amber-300') ?>">
              <?php if ($isConfirmed): ?>
                <?= htmlspecialchars($isApplied ? ($L['promo_badge_applied'] ?? 'Kupon Diterapkan') : ($L['promo_badge_confirmed'] ?? 'Kuota Terkonfirmasi')) ?>
              <?php elseif ($isExhausted): ?>
                <?= htmlspecialchars($L['promo_badge_exhausted'] ?? 'Kuota Habis') ?>
              <?php else: ?>
                <?= htmlspecialchars($L['promo_badge_pending'] ?? 'Menunggu Pelunasan Formulir') ?>
              <?php endif; ?>
            </span>
          </div>
          <?php endif; ?>

          <!-- ═══════════════════════════════════════════════════════════════ -->
          <!-- STEPPER VISUAL LINGKARAN-LINGKARAN (STATUS TRACKER)             -->
          <!-- ═══════════════════════════════════════════════════════════════ -->
          <div class="border border-slate-200 rounded-lg p-4 sm:p-6 bg-slate-50/70 shadow-xs space-y-4">
            
            <div class="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
              <div>
                <h2 class="text-xs font-bold text-ccsHeading uppercase tracking-wider flex items-center gap-2">
                  <i class="fas fa-route text-ccsOrange"></i> <?= htmlspecialchars($L['stepper_title']) ?>
                </h2>
                <p class="text-[11px] text-gray-500 mt-0.5"><?= htmlspecialchars($L['stepper_subtitle']) ?></p>
              </div>
            </div>

            <!-- TAMPILAN DESKTOP: 5 LINGKARAN HORIZONTAL & GARIS PROGRESS -->
            <div class="hidden sm:block relative py-3">
              <!-- Garis Penghubung Track Belakang -->
              <div class="absolute top-[28px] left-[10%] right-[10%] h-[3px] bg-slate-200 rounded-full -z-0">
                <div class="h-full bg-emerald-500 rounded-full transition-all duration-700" style="width: <?= $progressPct ?>%;"></div>
              </div>

              <!-- Grid 5 Lingkaran -->
              <div class="grid grid-cols-5 gap-2 relative z-10 text-center">
                <?php foreach ($allSteps as $idx => $step): 
                  $b = getCircleBadge($step);
                ?>
                  <div class="flex flex-col items-center">
                    <div class="w-11 h-11 rounded-full flex items-center justify-center <?= $b['circle'] ?> transition-transform hover:scale-105">
                      <i class="<?= $b['icon'] ?>"></i>
                    </div>
                    <div class="font-bold text-xs mt-2 text-ccsHeading leading-snug">
                      <?= htmlspecialchars($step['title']) ?>
                    </div>
                    <div class="text-[11px] mt-0.5 <?= $b['subClass'] ?> leading-tight">
                      <?= htmlspecialchars($step['sub']) ?>
                    </div>
                  </div>
                <?php endforeach; ?>
              </div>
            </div>

            <!-- TAMPILAN MOBILE: LIST VERTIKAL 5 TAHAP DENGAN INDIKATOR -->
            <div class="sm:hidden space-y-2.5 pt-1">
              <?php foreach ($allSteps as $idx => $step): 
                $b = getCircleBadge($step);
                $isActive = in_array($step['state'], ['waiting_upload', 'waiting_review', 'active_fill', 'in_review', 'approved']);
              ?>
                <div class="flex items-center gap-3 p-2.5 rounded-md <?= $isActive ? 'bg-white border-2 border-ccsOrange/50 shadow-xs' : 'bg-slate-100/70 border border-slate-200' ?>">
                  <div class="w-9 h-9 rounded-full flex items-center justify-center shrink-0 <?= $b['circle'] ?>">
                    <i class="<?= $b['icon'] ?>"></i>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-xs font-bold text-ccsHeading truncate"><?= htmlspecialchars($step['title']) ?></div>
                    <div class="text-[11px] <?= $b['subClass'] ?> truncate"><?= htmlspecialchars($step['sub']) ?></div>
                  </div>
                  <?php if ($isActive): ?>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 uppercase tracking-wider shrink-0">
                      Aktif
                    </span>
                  <?php endif; ?>
                </div>
              <?php endforeach; ?>
            </div>

            <!-- KOTAK NOTIFIKASI POSISI SAAT INI (CALLOUT BOX) -->
            <div class="p-3.5 sm:p-4 rounded-md border flex items-start gap-3 <?= $callout['boxClass'] ?>">
              <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 <?= $callout['iconBg'] ?>">
                <i class="<?= $callout['icon'] ?>"></i>
              </div>
              <div class="space-y-0.5">
                <h3 class="text-xs uppercase tracking-wide <?= $callout['titleClass'] ?>">
                  <?= htmlspecialchars($callout['title']) ?>
                </h3>
                <p class="text-xs leading-relaxed opacity-95">
                  <?= htmlspecialchars($callout['text']) ?>
                </p>
              </div>
            </div>

          </div>

          <!-- ═══════════════════════════════════════════════════════════════ -->
          <!-- KONDISI UTAMA: RESMI DITERIMA / BELUM VERIFIED / BIODATA / DST  -->
          <!-- ═══════════════════════════════════════════════════════════════ -->
          <?php if ($overallStatus === 'approved'): ?>
            <div class="border-t border-gray-200 pt-5 space-y-4">
              <!-- Kartu Status Diterima: Institutional, Dignified, Sesuai Gaya Halaman (No AI gradient) -->
              <div class="bg-white border border-gray-200 rounded-md p-6 sm:p-8 text-center space-y-4 shadow-xs">
                
                <div class="w-14 h-14 rounded-full bg-emerald-50 text-emerald-700 mx-auto flex items-center justify-center text-2xl border border-emerald-200">
                  <i class="fas fa-graduation-cap"></i>
                </div>

                <div class="space-y-1">
                  <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-1">
                    <i class="fas fa-check-circle text-emerald-600"></i> <?= htmlspecialchars($L['approved_card_badge']) ?>
                  </div>
                  <h2 class="text-xl sm:text-2xl font-bold text-ccsHeading">
                    <?= htmlspecialchars($L['approved_card_title']) ?>
                  </h2>
                  <p class="text-xs sm:text-sm text-gray-600 max-w-xl mx-auto leading-relaxed pt-1">
                    <?= sprintf(
                        $L['approved_card_desc'],
                        htmlspecialchars($currentApplicant['student_name']),
                        htmlspecialchars($currentApplicant['level_name'] ?? $currentApplicant['preferred_grade'] ?? '-')
                    ) ?>
                  </p>
                </div>

                <!-- Structured Metadata Box Sesuai Gaya Box Tanda Terima -->
                <div class="p-4 bg-slate-50 rounded-md border border-slate-200 max-w-md mx-auto text-left text-xs space-y-2 text-gray-700">
                  <div class="flex justify-between items-center pb-2 border-b border-slate-200/80">
                    <span class="text-gray-500"><?= htmlspecialchars($L['lbl_code']) ?>:</span>
                    <span class="font-mono text-ccsHeading font-bold"><?= htmlspecialchars($currentApplicant['application_number']) ?></span>
                  </div>
                  <div class="flex justify-between items-center pb-2 border-b border-slate-200/80">
                    <span class="text-gray-500"><?= htmlspecialchars($L['lbl_student']) ?>:</span>
                    <span class="font-semibold text-gray-900"><?= htmlspecialchars($currentApplicant['student_name']) ?></span>
                  </div>
                  <div class="flex justify-between items-center pb-2 border-b border-slate-200/80">
                    <span class="text-gray-500"><?= htmlspecialchars($L['lbl_level_selected']) ?>:</span>
                    <span class="font-medium text-gray-900"><?= htmlspecialchars($currentApplicant['level_name'] ?? $currentApplicant['preferred_grade'] ?? '-') ?></span>
                  </div>
                  <div class="flex justify-between items-center <?= !empty($currentApplicant['admin_notes']) ? 'pb-2 border-b border-slate-200/80' : '' ?>">
                    <span class="text-gray-500">Status Seleksi:</span>
                    <span class="text-emerald-700 font-bold inline-flex items-center gap-1">
                      <i class="fas fa-check-circle"></i> <?= htmlspecialchars($L['approved_card_status']) ?>
                    </span>
                  </div>
                  <?php if (!empty($currentApplicant['admin_notes'])): ?>
                    <div class="pt-1">
                      <span class="text-gray-500 block mb-1"><?= htmlspecialchars($L['approved_card_admin_notes']) ?></span>
                      <div class="p-2.5 bg-white rounded border border-slate-200 text-gray-800 italic text-[11px] leading-relaxed">
                        &ldquo;<?= nl2br(htmlspecialchars($currentApplicant['admin_notes'])) ?>&rdquo;
                      </div>
                    </div>
                  <?php endif; ?>
                </div>

                <p class="text-xs text-gray-500 max-w-md mx-auto leading-relaxed pt-1">
                  <?= htmlspecialchars($L['approved_card_email_notice']) ?>
                </p>
              </div>

              <!-- Rekam Jadwal Observasi & Wawancara (Sebagai Arsip Riwayat, Tanpa Tombol Reschedule) -->
              <?php if (!empty($currentApplicant['test_date']) || !empty($currentApplicant['interview_date'])): ?>
                <div class="bg-white border border-gray-200 rounded-md p-5 space-y-4 shadow-xs">
                  <div class="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-gray-200">
                    <div class="flex items-center gap-2">
                      <div class="w-8 h-8 rounded-full bg-slate-100 text-ccsHeading flex items-center justify-center border border-slate-200 text-sm">
                        <i class="far fa-calendar-check"></i>
                      </div>
                      <div>
                        <h3 class="text-xs font-bold text-ccsHeading uppercase tracking-wider"><?= htmlspecialchars($L['approved_sched_history_title']) ?></h3>
                        <p class="text-[11px] text-gray-500 font-mono"><?= htmlspecialchars($currentApplicant['application_number']) ?> &bull; <?= htmlspecialchars($currentApplicant['student_name']) ?></p>
                      </div>
                    </div>
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <?= htmlspecialchars($L['approved_sched_history_badge']) ?>
                    </span>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <?php if (!empty($currentApplicant['test_date'])): ?>
                      <div class="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-1">
                        <span class="text-[10px] text-gray-500 uppercase block font-mono"><?= htmlspecialchars($L['test_schedule_badge']) ?>:</span>
                        <div class="font-bold text-ccsHeading"><?= formatTanggalIndo($currentApplicant['test_date'], $currLang) ?></div>
                        <div class="text-gray-600 text-[11px]"><?= htmlspecialchars($currentApplicant['test_session'] ?? '-') ?></div>
                      </div>
                    <?php endif; ?>
                    <?php if (!empty($currentApplicant['interview_date'])): ?>
                      <div class="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-1">
                        <span class="text-[10px] text-gray-500 uppercase block font-mono"><?= htmlspecialchars($L['interview_schedule_badge']) ?>:</span>
                        <div class="font-bold text-ccsHeading"><?= formatTanggalIndo($currentApplicant['interview_date'], $currLang) ?></div>
                        <div class="text-gray-600 text-[11px]"><?= htmlspecialchars($currentApplicant['interview_session'] ?? '-') ?></div>
                      </div>
                    <?php endif; ?>
                  </div>
                </div>
              <?php endif; ?>

            </div>

          <!-- ───────────────────────────────────────────────────────────── -->
          <!-- KONDISI B: BELUM VERIFIED (REKENING BANK & UPLOAD STRUK)       -->
          <!-- ───────────────────────────────────────────────────────────── -->
          <?php elseif (($currentApplicant['form_fee_status'] ?? '') !== 'verified'): ?>
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
                        <?php 
                          $cleanFormNotes = trim(preg_replace('/\[SCHEDULE_META\]:.*$/s', '', $currentApplicant['additional_notes'] ?? ''));
                        ?>
                        <textarea name="additional_notes" rows="2" class="school-textarea"><?= htmlspecialchars($cleanFormNotes) ?></textarea>
                      </div>
                    </div>
                  </div>

                  <!-- Bagian 3: Pilihan Jadwal Tes Penempatan & Wawancara Orang Tua -->
                  <div class="space-y-4 pt-4 border-t border-gray-200">
                    <div class="border-b border-gray-100 pb-2">
                      <h3 class="text-xs font-bold text-ccsHeading uppercase tracking-wider">
                        <?= htmlspecialchars($L['sec3_schedule']) ?>
                      </h3>
                      <p class="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                        <?= htmlspecialchars($L['sec3_schedule_desc']) ?>
                      </p>
                    </div>

                    <!-- Checkbox Jadwal Hari Sama -->
                    <div class="flex items-center gap-2.5 p-3 bg-blue-50/70 border border-blue-200 rounded-md">
                      <input 
                        type="checkbox" 
                        id="sameDayScheduleToggle" 
                        name="same_day_schedule" 
                        value="1" 
                        checked 
                        onchange="toggleSameDaySchedule(this.checked)"
                        class="w-4 h-4 text-ccsHeading rounded border-gray-300 focus:ring-ccsHeading cursor-pointer"
                      >
                      <label for="sameDayScheduleToggle" class="text-xs font-semibold text-ccsHeading cursor-pointer select-none">
                        <?= htmlspecialchars($L['lbl_same_day_toggle']) ?>
                      </label>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <!-- Kolom 1: Tes Penempatan Siswa -->
                      <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-3">
                        <div class="font-bold text-ccsHeading flex items-center gap-1.5 pb-1.5 border-b border-slate-200 text-xs">
                          <i class="fas fa-graduation-cap text-ccsOrange"></i>
                          <span><?= htmlspecialchars($L['test_schedule_badge']) ?></span>
                        </div>
                        <div>
                          <label class="school-label"><?= htmlspecialchars($L['lbl_test_date']) ?> <span class="text-rose-500">*</span></label>
                          <input 
                            type="date" 
                            name="test_date" 
                            id="testDateInput" 
                            required 
                            min="<?= date('Y-m-d', strtotime('+1 day')) ?>"
                            value="<?= htmlspecialchars($currentApplicant['test_date'] ?? date('Y-m-d', strtotime('+3 days'))) ?>" 
                            onchange="syncInterviewDate(this.value)"
                            class="school-input"
                          >
                        </div>
                        <div>
                          <label class="school-label"><?= htmlspecialchars($L['lbl_test_session']) ?> <span class="text-rose-500">*</span></label>
                          <select name="test_session" required class="school-select">
                            <option value="Sesi 1 (08:30 - 10:00 WIB)" <?= ($currentApplicant['test_session'] ?? '') === 'Sesi 1 (08:30 - 10:00 WIB)' ? 'selected' : '' ?>><?= $L['session_opt_1'] ?></option>
                            <option value="Sesi 2 (10:30 - 12:00 WIB)" <?= ($currentApplicant['test_session'] ?? '') === 'Sesi 2 (10:30 - 12:00 WIB)' ? 'selected' : '' ?>><?= $L['session_opt_2'] ?></option>
                            <option value="Sesi 3 (13:00 - 14:30 WIB)" <?= ($currentApplicant['test_session'] ?? '') === 'Sesi 3 (13:00 - 14:30 WIB)' ? 'selected' : '' ?>><?= $L['session_opt_3'] ?></option>
                            <option value="Sesi 4 (15:00 - 16:30 WIB)" <?= ($currentApplicant['test_session'] ?? '') === 'Sesi 4 (15:00 - 16:30 WIB)' ? 'selected' : '' ?>><?= $L['session_opt_4'] ?></option>
                          </select>
                        </div>
                      </div>

                      <!-- Kolom 2: Wawancara Orang Tua -->
                      <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-3">
                        <div class="font-bold text-ccsHeading flex items-center gap-1.5 pb-1.5 border-b border-slate-200 text-xs">
                          <i class="fas fa-users text-ccsHeading"></i>
                          <span><?= htmlspecialchars($L['interview_schedule_badge']) ?></span>
                        </div>
                        <div>
                          <label class="school-label"><?= htmlspecialchars($L['lbl_interview_date']) ?> <span class="text-rose-500">*</span></label>
                          <input 
                            type="date" 
                            name="interview_date" 
                            id="interviewDateInput" 
                            required 
                            min="<?= date('Y-m-d', strtotime('+1 day')) ?>"
                            value="<?= htmlspecialchars($currentApplicant['interview_date'] ?? date('Y-m-d', strtotime('+3 days'))) ?>" 
                            readonly 
                            class="school-input bg-gray-100 cursor-not-allowed"
                          >
                        </div>
                        <div>
                          <label class="school-label"><?= htmlspecialchars($L['lbl_interview_session']) ?> <span class="text-rose-500">*</span></label>
                          <select name="interview_session" required class="school-select">
                            <option value="Sesi 1 (08:30 - 10:00 WIB)" <?= ($currentApplicant['interview_session'] ?? '') === 'Sesi 1 (08:30 - 10:00 WIB)' ? 'selected' : '' ?>><?= $L['session_opt_1'] ?></option>
                            <option value="Sesi 2 (10:30 - 12:00 WIB)" <?= ($currentApplicant['interview_session'] ?? '') === 'Sesi 2 (10:30 - 12:00 WIB)' ? 'selected' : '' ?>><?= $L['session_opt_2'] ?></option>
                            <option value="Sesi 3 (13:00 - 14:30 WIB)" <?= ($currentApplicant['interview_session'] ?? '') === 'Sesi 3 (13:00 - 14:30 WIB)' ? 'selected' : '' ?>><?= $L['session_opt_3'] ?></option>
                            <option value="Sesi 4 (15:00 - 16:30 WIB)" <?= ($currentApplicant['interview_session'] ?? '') === 'Sesi 4 (15:00 - 16:30 WIB)' ? 'selected' : '' ?>><?= $L['session_opt_4'] ?></option>
                          </select>
                        </div>
                      </div>

                      <div class="sm:col-span-2">
                        <label class="school-label"><?= htmlspecialchars($L['lbl_schedule_notes']) ?></label>
                        <input type="text" name="schedule_notes" value="<?= htmlspecialchars($currentApplicant['schedule_notes'] ?? '') ?>" placeholder="Misal: Hadir didampingi ayah dan ibu" class="school-input">
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
              <!-- TANDA TERIMA FORMULIR LENGKAP & JADWAL TERKONFIRMASI -->
              <div class="space-y-4">
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

                <!-- KARTU JADWAL TES & WAWANCARA TERKONFIRMASI -->
                <div class="bg-white border border-gray-200 rounded-md p-5 space-y-4 shadow-xs">
                  <div class="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-gray-200">
                    <div class="flex items-center gap-2">
                      <div class="w-8 h-8 rounded-full bg-blue-50 text-ccsHeading flex items-center justify-center border border-blue-200 text-sm">
                        <i class="far fa-calendar-alt"></i>
                      </div>
                      <div>
                        <h3 class="text-sm font-bold text-ccsHeading"><?= htmlspecialchars($L['confirmed_schedule_title']) ?></h3>
                        <p class="text-[11px] text-gray-500 font-mono"><?= htmlspecialchars($currentApplicant['application_number']) ?> &bull; <?= htmlspecialchars($currentApplicant['student_name']) ?></p>
                      </div>
                    </div>

                    <button 
                      type="button" 
                      onclick="toggleRescheduleForm()" 
                      class="px-3 py-1.5 rounded border border-ccsOrange text-ccsOrange hover:bg-orange-50 text-xs font-semibold transition flex items-center gap-1.5"
                    >
                      <i class="fas fa-calendar-check"></i>
                      <span><?= htmlspecialchars($L['btn_reschedule']) ?></span>
                    </button>
                  </div>

                  <!-- Detail Jadwal 2 Kolom -->
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <!-- Tes Penempatan -->
                    <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-2">
                      <div class="flex items-center justify-between pb-1.5 border-b border-slate-200">
                        <span class="font-bold text-ccsHeading flex items-center gap-1.5 text-xs">
                          <i class="fas fa-graduation-cap text-ccsOrange"></i>
                          <?= htmlspecialchars($L['test_schedule_badge']) ?>
                        </span>
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Terkonfirmasi
                        </span>
                      </div>
                      <div class="space-y-1 pt-1">
                        <div>
                          <span class="text-[10px] text-gray-500 uppercase block font-mono"><?= htmlspecialchars($L['lbl_test_date']) ?>:</span>
                          <span class="text-sm font-bold text-ccsHeading">
                            <?= formatTanggalIndo($currentApplicant['test_date'] ?? null, $currLang) ?>
                          </span>
                        </div>
                        <div>
                          <span class="text-[10px] text-gray-500 uppercase block font-mono"><?= htmlspecialchars($L['lbl_test_session']) ?>:</span>
                          <span class="text-xs font-semibold text-gray-700">
                            <?= htmlspecialchars($currentApplicant['test_session'] ?? 'Sesi 1 (08:30 - 10:00 WIB)') ?>
                          </span>
                        </div>
                      </div>
                    </div>

                    <!-- Wawancara Orang Tua -->
                    <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-2">
                      <div class="flex items-center justify-between pb-1.5 border-b border-slate-200">
                        <span class="font-bold text-ccsHeading flex items-center gap-1.5 text-xs">
                          <i class="fas fa-users text-ccsHeading"></i>
                          <?= htmlspecialchars($L['interview_schedule_badge']) ?>
                        </span>
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Terkonfirmasi
                        </span>
                      </div>
                      <div class="space-y-1 pt-1">
                        <div>
                          <span class="text-[10px] text-gray-500 uppercase block font-mono"><?= htmlspecialchars($L['lbl_interview_date']) ?>:</span>
                          <span class="text-sm font-bold text-ccsHeading">
                            <?= formatTanggalIndo($currentApplicant['interview_date'] ?? null, $currLang) ?>
                          </span>
                        </div>
                        <div>
                          <span class="text-[10px] text-gray-500 uppercase block font-mono"><?= htmlspecialchars($L['lbl_interview_session']) ?>:</span>
                          <span class="text-xs font-semibold text-gray-700">
                            <?= htmlspecialchars($currentApplicant['interview_session'] ?? 'Sesi 1 (08:30 - 10:00 WIB)') ?>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Info Lokasi & Catatan -->
                  <div class="p-3 bg-amber-50/70 border border-amber-200 rounded-md text-xs text-amber-900 flex items-start gap-2.5">
                    <i class="fas fa-map-marker-alt text-amber-600 shrink-0 mt-0.5"></i>
                    <div>
                      <span class="font-semibold block"><?= htmlspecialchars($L['schedule_location']) ?></span>
                      <?php if (!empty($currentApplicant['schedule_notes'])): ?>
                        <span class="text-[11px] text-amber-800 block mt-1"><?= htmlspecialchars($L['schedule_notes_label'] ?? 'Catatan Jadwal:') ?> <?= htmlspecialchars($currentApplicant['schedule_notes']) ?></span>
                      <?php endif; ?>
                    </div>
                  </div>

                  <!-- FORM RESCHEDULE (TERSEMBUNYI, DITAMPILKAN KETIKA KLIK UBAH JADWAL) -->
                  <div id="rescheduleFormContainer" class="hidden border-t border-gray-200 pt-4 mt-2">
                    <form method="POST" action="status.php?cek=<?= urlencode($searchQuery) ?>&phone=<?= urlencode($searchPhone) ?>&lang=<?= $currLang ?>" class="space-y-4">
                      <input type="hidden" name="csrf_token" value="<?= $_SESSION['csrf_token'] ?>">
                      <input type="hidden" name="action_update_schedule" value="1">
                      <input type="hidden" name="target_app_no" value="<?= htmlspecialchars($currentApplicant['application_number']) ?>">

                      <div class="border-b border-gray-100 pb-2 flex items-center justify-between">
                        <h4 class="text-xs font-bold text-ccsHeading uppercase tracking-wider">
                          <?= htmlspecialchars($L['reschedule_modal_title'] ?? 'Formulir Perubahan Jadwal') ?>
                        </h4>
                        <button type="button" onclick="toggleRescheduleForm()" class="text-xs text-gray-400 hover:text-gray-600">
                          <i class="fas fa-times"></i>
                        </button>
                      </div>

                      <div class="flex items-center gap-2.5 p-2.5 bg-blue-50/70 border border-blue-200 rounded-md">
                        <input 
                          type="checkbox" 
                          id="sameDayScheduleToggleResched" 
                          name="same_day_schedule" 
                          value="1" 
                          checked 
                          onchange="toggleSameDaySchedule(this.checked, 'Resched')"
                          class="w-4 h-4 text-ccsHeading rounded border-gray-300 focus:ring-ccsHeading cursor-pointer"
                        >
                        <label for="sameDayScheduleToggleResched" class="text-xs font-semibold text-ccsHeading cursor-pointer select-none">
                          <?= htmlspecialchars($L['lbl_same_day_toggle']) ?>
                        </label>
                      </div>

                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div class="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-2.5">
                          <label class="school-label"><?= htmlspecialchars($L['lbl_test_date']) ?> <span class="text-rose-500">*</span></label>
                          <input 
                            type="date" 
                            name="test_date" 
                            id="testDateInputResched" 
                            required 
                            min="<?= date('Y-m-d', strtotime('+1 day')) ?>"
                            value="<?= htmlspecialchars($currentApplicant['test_date'] ?? date('Y-m-d', strtotime('+3 days'))) ?>" 
                            onchange="syncInterviewDate(this.value, 'Resched')"
                            class="school-input"
                          >
                          <label class="school-label"><?= htmlspecialchars($L['lbl_test_session']) ?> <span class="text-rose-500">*</span></label>
                          <select name="test_session" required class="school-select">
                            <option value="Sesi 1 (08:30 - 10:00 WIB)" <?= ($currentApplicant['test_session'] ?? '') === 'Sesi 1 (08:30 - 10:00 WIB)' ? 'selected' : '' ?>><?= $L['session_opt_1'] ?></option>
                            <option value="Sesi 2 (10:30 - 12:00 WIB)" <?= ($currentApplicant['test_session'] ?? '') === 'Sesi 2 (10:30 - 12:00 WIB)' ? 'selected' : '' ?>><?= $L['session_opt_2'] ?></option>
                            <option value="Sesi 3 (13:00 - 14:30 WIB)" <?= ($currentApplicant['test_session'] ?? '') === 'Sesi 3 (13:00 - 14:30 WIB)' ? 'selected' : '' ?>><?= $L['session_opt_3'] ?></option>
                            <option value="Sesi 4 (15:00 - 16:30 WIB)" <?= ($currentApplicant['test_session'] ?? '') === 'Sesi 4 (15:00 - 16:30 WIB)' ? 'selected' : '' ?>><?= $L['session_opt_4'] ?></option>
                          </select>
                        </div>

                        <div class="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-2.5">
                          <label class="school-label"><?= htmlspecialchars($L['lbl_interview_date']) ?> <span class="text-rose-500">*</span></label>
                          <input 
                            type="date" 
                            name="interview_date" 
                            id="interviewDateInputResched" 
                            required 
                            min="<?= date('Y-m-d', strtotime('+1 day')) ?>"
                            value="<?= htmlspecialchars($currentApplicant['interview_date'] ?? date('Y-m-d', strtotime('+3 days'))) ?>" 
                            readonly 
                            class="school-input bg-gray-100 cursor-not-allowed"
                          >
                          <label class="school-label"><?= htmlspecialchars($L['lbl_interview_session']) ?> <span class="text-rose-500">*</span></label>
                          <select name="interview_session" required class="school-select">
                            <option value="Sesi 1 (08:30 - 10:00 WIB)" <?= ($currentApplicant['interview_session'] ?? '') === 'Sesi 1 (08:30 - 10:00 WIB)' ? 'selected' : '' ?>><?= $L['session_opt_1'] ?></option>
                            <option value="Sesi 2 (10:30 - 12:00 WIB)" <?= ($currentApplicant['interview_session'] ?? '') === 'Sesi 2 (10:30 - 12:00 WIB)' ? 'selected' : '' ?>><?= $L['session_opt_2'] ?></option>
                            <option value="Sesi 3 (13:00 - 14:30 WIB)" <?= ($currentApplicant['interview_session'] ?? '') === 'Sesi 3 (13:00 - 14:30 WIB)' ? 'selected' : '' ?>><?= $L['session_opt_3'] ?></option>
                            <option value="Sesi 4 (15:00 - 16:30 WIB)" <?= ($currentApplicant['interview_session'] ?? '') === 'Sesi 4 (15:00 - 16:30 WIB)' ? 'selected' : '' ?>><?= $L['session_opt_4'] ?></option>
                          </select>
                        </div>

                        <div class="sm:col-span-2">
                          <label class="school-label"><?= htmlspecialchars($L['lbl_schedule_notes']) ?></label>
                          <input type="text" name="schedule_notes" value="<?= htmlspecialchars($currentApplicant['schedule_notes'] ?? '') ?>" placeholder="Alasan perubahan atau catatan khusus" class="school-input">
                        </div>
                      </div>

                      <div class="flex items-center gap-2 pt-1">
                        <button type="submit" class="thm-btn text-xs py-2 px-4">
                          <i class="fas fa-save mr-1"></i> Simpan Jadwal Baru
                        </button>
                        <button type="button" onclick="toggleRescheduleForm()" class="px-3 py-2 text-xs border border-gray-300 rounded text-gray-600 hover:bg-gray-50">
                          Batal
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
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

    // Toggle Jadwal Tes & Wawancara Sama Hari
    function toggleSameDaySchedule(checked, suffix = '') {
      const interviewInput = document.getElementById('interviewDateInput' + suffix);
      const testInput = document.getElementById('testDateInput' + suffix);
      if (!interviewInput || !testInput) return;
      if (checked) {
        interviewInput.value = testInput.value;
        interviewInput.setAttribute('readonly', 'readonly');
        interviewInput.classList.add('bg-gray-100', 'cursor-not-allowed');
      } else {
        interviewInput.removeAttribute('readonly');
        interviewInput.classList.remove('bg-gray-100', 'cursor-not-allowed');
      }
    }

    // Sinkronisasi Tanggal Wawancara jika checkbox sama hari aktif
    function syncInterviewDate(val, suffix = '') {
      const toggle = document.getElementById('sameDayScheduleToggle' + suffix);
      if (toggle && toggle.checked) {
        const interviewInput = document.getElementById('interviewDateInput' + suffix);
        if (interviewInput) {
          interviewInput.value = val;
        }
      }
    }

    // Toggle Tampilan Form Reschedule di Tahap 4
    function toggleRescheduleForm() {
      const form = document.getElementById('rescheduleFormContainer');
      if (form) {
        form.classList.toggle('hidden');
        if (!form.classList.contains('hidden')) {
          form.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
