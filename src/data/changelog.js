// ==============================================================================
// KEEP A CHANGELOG (1.1.0) SPECIFICATION FOR SCHOOL ADMIN SYSTEM
// Guiding principles:
// 1. Changelogs are for humans, not machines.
// 2. An entry for every single version.
// 3. Grouped categories: Added, Changed, Fixed, Security, Deprecated, Removed.
// 4. Chronological order (latest first) with release dates.
// 5. Daily Release Cadence: 1 single consolidated release per date.
// ==============================================================================

export const SYSTEM_RELEASES = [
  {
    "version": "0.6.2",
    "date": "2026-11-12",
    "isLatest": true,
    "summary": {
      "id": "Penghapusan penuh database SQLite lokal pada portal Sewa Lapangan (cpanel-sewa-lapangan/index.php) sehingga 100% terhubung langsung secara real-time ke Supabase (Hostinger khusus untuk antarmuka publik & penyimpanan berkas bukti transfer uploads/), pengamanan konsol admin legacy, dukungan pratinjau PDF & auto-retry bukti transfer, serta penyempurnaan kontrol Blackout Dates.",
      "en": "Complete removal of local SQLite database from the Court Rental portal (cpanel-sewa-lapangan/index.php) so 100% of data operations connect directly in real-time to Supabase (Hostinger used strictly for public UI & payment proof file storage in uploads/), legacy admin console removal, PDF & auto-retry payment proof preview, and standardized Blackout Dates time-slot selector.",
      "zh": "全面移除球场租赁门户（cpanel-sewa-lapangan/index.php）中的本地 SQLite 数据库，实现 100% 实时直连 Supabase（Hostinger 仅用于公共前端与 uploads/ 转账凭证文件存储），移除旧版内置管理入口，支持 PDF 与自动重试转账凭证预览，并规范化学校活动封锁时段（Blackout Dates）选择器。"
    },
    "sections": {
      "added": [
        {
          "id": "Endpoint pencarian kode booking langsung ke Supabase (?booking_code= pada /api/public/court-rental) sehingga fitur Cek Status Booking di portal publik menampilkan status real-time (Pending, Approved, Rejected) beserta catatan petugas langsung dari Supabase.",
          "en": "Direct Supabase booking code lookup endpoint (?booking_code= on /api/public/court-rental) so the public Check Booking Status feature displays real-time status (Pending, Approved, Rejected) and staff notes directly from Supabase.",
          "zh": "在 /api/public/court-rental 新增直连 Supabase 的预约代码查询端点（?booking_code=），使公共门户的预约状态查询实时显示 Supabase 中的最新审批状态及管理员备注。"
        }
      ],
      "changed": [
        {
          "id": "Menghapus seluruh kode dan ketergantungan SQLite (sewa_lapangan.db & folder data/) dari cpanel-sewa-lapangan/index.php dan menyeragamkan arsitekturnya seperti Vendor Checklist: seluruh pembacaan slot jadwal, penyimpanan reservasi baru, dan pengecekan status terhubung 100% ke Supabase melalui API Next.js, sementara Hostinger khusus menyimpan file bukti transfer di folder uploads/.",
          "en": "Removed all SQLite code and dependencies (sewa_lapangan.db & data/ directory) from cpanel-sewa-lapangan/index.php and unified its architecture with Vendor Checklist: all schedule slot lookups, new booking submissions, and status checks connect 100% to Supabase via the Next.js API, while Hostinger strictly stores payment proof files in uploads/.",
          "zh": "从 cpanel-sewa-lapangan/index.php 中彻底移除所有 SQLite 代码与依赖（sewa_lapangan.db 与 data/ 目录），并与保洁巡检系统统一架构：所有时段查询、新预约提交与状态查询 100% 通过 Next.js API 直连 Supabase，Hostinger 仅负责在 uploads/ 目录存储转账凭证文件。"
        },
        {
          "id": "Mengganti kolom input teks bebas Time Slot pada formulir Blackout Dates (/data/court-rental) menjadi dropdown pilihan sesi resmi 2 jam (Whole Day, 06:00 - 08:00 s/d 20:00 - 22:00) serta menghapus tombol duplikat 'Approve This Payment' di dalam modal pratinjau bukti transfer sesuai Single Action / Anti-Duplication Button Rule.",
          "en": "Replaced the free-text Time Slot input on the Blackout Dates form (/data/court-rental) with a standardized 2-hour session dropdown selector (Whole Day, 06:00 - 08:00 through 20:00 - 22:00) and removed the duplicate 'Approve This Payment' button inside the payment proof preview modal in compliance with the Single Action / Anti-Duplication Button Rule.",
          "zh": "将 /data/court-rental 学校活动封锁日期（Blackout Dates）表单中的自由文本时段输入框替换为标准 2 小时官方时段下拉菜单（全天、06:00 - 08:00 至 20:00 - 22:00），并遵循防按钮冗余规则移除转账凭证预览弹窗内的重复 'Approve This Payment' 按钮。"
        },
        {
          "id": "Menghapus konsol admin legacy (?admin=1) beserta tautan ikon gembok di footer pada cpanel-sewa-lapangan/index.php agar seluruh pengelolaan reservasi dan penutupan jadwal terpusat secara aman di dashboard Next.js (/data/court-rental).",
          "en": "Removed the legacy admin console (?admin=1) and footer lock link in cpanel-sewa-lapangan/index.php so all reservation and blackout management is securely centralized in the Next.js dashboard (/data/court-rental).",
          "zh": "移除 cpanel-sewa-lapangan/index.php 中的旧版内置管理台（?admin=1）及页脚锁形图标链接，将所有场地预约审批与活动封锁管理安全集中于 Next.js 管理后台（/data/court-rental）。"
        }
      ],
      "fixed": [
        {
          "id": "Memperbaiki validasi submit_booking pada Sewa Lapangan agar langsung tervalidasi terhadap tabel court_rentals dan court_blackout_dates di Supabase, serta menghapus otomatis file bukti transfer di Hostinger apabila jadwal ditolak oleh server.",
          "en": "Fixed submit_booking validation in Court Rental to validate directly against the court_rentals and court_blackout_dates tables in Supabase, automatically cleaning up the uploaded proof file on Hostinger if the schedule is rejected by the server.",
          "zh": "修复场地租赁预约提交（submit_booking）校验，直接针对 Supabase 的 court_rentals 与 court_blackout_dates 表进行实时验证，并在服务器拒绝排期时自动清理 Hostinger 上已上传的凭证文件。"
        },
        {
          "id": "Menambahkan dukungan pratinjau dokumen PDF (<iframe>) selain gambar, mekanisme auto-retry 3 kali pada proxy /api/court-rental/[id]/proof, tombol 'Retry / Coba Lagi' di modal pratinjau, serta standardisasi zona waktu WIB (Asia/Jakarta, UTC+7) untuk validasi batas pemesanan minimal H+2.",
          "en": "Added PDF document preview support (<iframe>) alongside images, a 3-attempt auto-retry mechanism in the /api/court-rental/[id]/proof proxy, an interactive 'Retry / Coba Lagi' button in the preview modal, and WIB timezone standardization (Asia/Jakarta, UTC+7) for minimum D+2 booking validation.",
          "zh": "在 /api/court-rental/[id]/proof 代理接口中新增 PDF 凭证内嵌预览（<iframe>）、3 次自动重试机制、弹窗内交互式重试按钮，并统一采用印尼西部时间（Asia/Jakarta, UTC+7）校验提前 2 天（H+2）预约限制。"
        }
      ]
    }
  },
  {
    "version": "0.6.1",
    "date": "2026-11-10",
    "isLatest": false,
    "summary": {
      "id": "Perombakan sistem kebersihan vendor & pelaporan fasilitas (pemisahan Portal QR General Pelapor, penugasan ruangan tetap Many-to-Many per petugas cleaning, serta upload foto Before & After 1 halaman di portal cleaner), ditambah standardisasi bahasa Inggris penuh pada Health Report Card.",
      "en": "Overhaul of the vendor cleaning & facility reporting system (dedicated General QR Reporter Portal, Many-to-Many static room assignments per cleaner, and single-page Before & After photo upload in the cleaner portal), plus full English standardization on Health Report Card.",
      "zh": "全面重构保洁巡检与设施报修系统（独立的通用二维码报修门户、保洁员与教室多对多固定排班分配、保洁端单页同屏上传前后对比照），并全面统一健康报告卡（Health Report Card）英文标准。"
    },
    "sections": {
      "added": [
        {
          "id": "Portal Pelapor Mandiri berbasis PHP di Hostinger dalam folder khusus terpisah (cpanel-report-facility/index.php untuk https://ccs.sch.id/reportfacility) menggunakan 1 QR Code General: mewajibkan upload Foto Kondisi dan Deskripsi Keluhan, serta Nama Pelapor bersifat opsional (bisa anonim).",
          "en": "Standalone PHP Facility Reporter Portal for Hostinger in a dedicated folder (cpanel-report-facility/index.php for https://ccs.sch.id/reportfacility) powered by 1 General QR Code: requires Condition Photo upload and Issue Description, while Reporter Name is optional (supports anonymous reporting).",
          "zh": "基于单一通用二维码的 Hostinger PHP 独立设施报修门户（独立目录 cpanel-report-facility/index.php 对应 https://ccs.sch.id/reportfacility）：必填现场照片与问题描述，报修人姓名为选填（支持匿名报修）。"
        },
        {
          "id": "Pengaturan Petugas Kebersihan langsung per Ruangan (misal: Computer Lab → pilih 1 atau lebih cleaner yang membersihkan) pada tabel /data/vendor-checklist beserta API /api/vendor-checklist/assignments.",
          "en": "Direct per-room Cleaning Staff assignment (e.g., Computer Lab → assign 1 or more cleaners responsible for cleaning the room) on the /data/vendor-checklist table along with the /api/vendor-checklist/assignments API.",
          "zh": "在 /data/vendor-checklist 表格中支持按教室直接分配保洁员（如：Computer Lab → 可指定 1 名或多名负责打扫的保洁员），配套 /api/vendor-checklist/assignments 接口。"
        },
        {
          "id": "Generator & Modal Cetak Stiker QR Code General Pelapor (PDF/PNG) pada halaman /data/vendor-checklist dan /data/room.",
          "en": "General Reporter QR Code Sticker generator & print modal (PDF/PNG) on /data/vendor-checklist and /data/room.",
          "zh": "在 /data/vendor-checklist 与 /data/room 新增通用报修二维码门贴生成器与 PDF/PNG 打印弹窗。"
        }
      ],
      "changed": [
        {
          "id": "Merombak portal web PHP cPanel (cpanel-vendor-checklist/index.php & cpanel-report-facility/index.php) menggunakan desain Utilitarian Editorial Minimalist dilengkapi logo resmi Chung Chung Christian School, header ringkas 'Operational' pada portal cleaner dan 'Report Facility' pada portal pelapor, menghapus badge QR general dan footer yang tidak diperlukan, palet warna Warm Monochrome & Spot Pastels, serta tipografi editorial Instrument Serif & JetBrains Mono.",
          "en": "Redesigned the cPanel PHP web portals (cpanel-vendor-checklist/index.php & cpanel-report-facility/index.php) using a Utilitarian Editorial Minimalist aesthetic featuring the official Chung Chung Christian School logo, concise header text ('Operational' on cleaner portal and 'Report Facility' on reporter portal), removing redundant QR badges and footers, Warm Monochrome & Spot Pastels palette, and Instrument Serif & JetBrains Mono editorial typography.",
          "zh": "采用极简实用主义编辑风格重构 cPanel PHP 门户（cpanel-vendor-checklist/index.php 与 cpanel-report-facility/index.php），配备中中基督学校（CCS）官方校徽、保洁端 'Operational' 与报修端 'Report Facility' 简明顶栏、移除报修端多余的右上角二维码标识与页脚、暖色单色与柔和粉彩配色，以及 Instrument Serif 与 JetBrains Mono 字体排版。"
        },
        {
          "id": "Menyeragamkan seluruh header kolom tabel, label antarmuka, tombol aksi, placeholder, dan pesan status pada halaman Health Report Card (/data/health_report) ke dalam bahasa Inggris resmi (EYE, EAR, DENTAL, BP, RBG, COLOR VISION, NAILS, HAIR, WEIGHT, HEIGHT, TYPE, DATE, CHRONOLOGY, TREATMENT).",
          "en": "Standardized all table column headers, UI labels, action buttons, placeholders, and status messages on the Health Report Card page (/data/health_report) into official English (EYE, EAR, DENTAL, BP, RBG, COLOR VISION, NAILS, HAIR, WEIGHT, HEIGHT, TYPE, DATE, CHRONOLOGY, TREATMENT).",
          "zh": "将健康报告卡页面（/data/health_report）中的所有表格列标题、界面标签、操作按钮、占位提示及状态消息统一规范为英文（EYE、EAR、DENTAL、BP、RBG、COLOR VISION、NAILS、HAIR、WEIGHT、HEIGHT、TYPE、DATE、CHRONOLOGY、TREATMENT）。"
        },
        {
          "id": "Menyeragamkan header tabel Physical Check / Clinical & Physical Check serta teks status pemeriksaan fisik Semester 2 Nursery pada generator PDF rapor PYP dan MYP ke dalam bahasa Inggris.",
          "en": "Standardized Physical Check / Clinical & Physical Check table headers and Nursery Semester 2 physical examination status text in the PYP and MYP PDF report card generators into English.",
          "zh": "将 PYP 与 MYP PDF 成绩单生成器中的体格检查（Physical Check / Clinical & Physical Check）表头及托班第二学期无体格检查提示文本统一为英文。"
        },
        {
          "id": "Menghapus tombol pintasan antar-halaman Master Ruangan pada halaman /data/vendor-checklist (serta pintasan sebaliknya pada /data/room) agar navigasi terpusat melalui menu utama.",
          "en": "Removed the cross-page Room Master shortcut button on /data/vendor-checklist (and the reverse shortcut on /data/room) so navigation remains centralized through the main menu.",
          "zh": "移除 /data/vendor-checklist 页面上的教室主数据跨页快捷按钮（以及 /data/room 上的反向快捷按钮），统一通过主菜单导航。"
        },
        {
          "id": "Menyederhanakan bilah navigasi dan tabel /data/vendor-checklist dengan menghapus 5 tab filter status yang tidak diperlukan (hanya menyisakan tab 'All Rooms'), serta menghapus tombol duplikat 'Atur Petugas Ruangan' di bagian bawah dan tombol '+ Kelola Ruangan' di bawah nama cleaner pada tabel kalender matriks, sehingga pengelolaan penugasan terpusat pada 1 tombol utama 'Atur Petugas Ruangan' di pojok kanan atas berdampingan dengan Role Supervisor dan QR General.",
          "en": "Simplified /data/vendor-checklist navigation and table by removing the 5 redundant status filter tabs (leaving exclusively the 'All Rooms' tab), and removing duplicate 'Atur Petugas Ruangan' buttons from the bottom and the '+ Kelola Ruangan' button under each cleaner's name in the matrix table, centralizing all assignment controls into 1 primary 'Atur Petugas Ruangan' button in the top-right toolbar alongside Role Supervisor and QR General.",
          "zh": "精简 /data/vendor-checklist 导航与表格，移除 5 个冗余状态筛选选项卡仅保留 'All Rooms'，并删除底部重复的'Atur Petugas Ruangan'按钮及日历矩阵表格中保洁员姓名下方的'+ Kelola Ruangan'按钮，使房间排班管理统一收敛至右上角与 Role Supervisor 及 QR General 并列的唯一主按钮。"
        },
        {
          "id": "Mengimplementasikan Tampilan Kalender Mingguan (Weekly Calendar View) sebagai tampilan tunggal di /data/vendor-checklist untuk memantau status pelaporan tugas kebersihan harian seluruh cleaner dalam seminggu penuh, menghapus widget 'Pantauan Pelaporan Hari Ini' serta pilihan mode 'Tabel Harian' dan 'Kartu Foto' demi antarmuka yang bersih dan fokus, serta menyediakan modal terpadu 'Atur Petugas Ruangan' untuk mempermudah pengaturan petugas per ruangan.",
          "en": "Implemented Weekly Calendar View as the sole view on /data/vendor-checklist to monitor cleaner daily cleaning reporting across the entire week, removing the 'Today's Reporting Spotlight' widget and the 'Daily Table' / 'Photo Cards' view switchers for a cleaner interface, and providing a unified 'Atur Petugas Ruangan' modal for easy room assignment management.",
          "zh": "在 /data/vendor-checklist 将周历视图（Weekly Calendar View）作为唯一监控视图，移除'今日报送看板'以及'每日表格'与'照片卡片'切换按钮以精简界面，并提供统一的'Atur Petugas Ruangan'弹窗以全面提升按教室指派保洁员的便捷度。"
        },
        {
          "id": "Menyinkronkan penugasan 95 slot ruangan ke 5 cleaner aktif berakhiran nama 'Triple S' (Davit: 18 ruangan, Risky: 17 ruangan, Darul: 24 ruangan, Fitria: 18 ruangan, Raditya: 18 ruangan) tanpa duplikasi ruangan pada master ruangan.",
          "en": "Synchronized 95 room assignment slots to 5 active cleaners with 'Triple S' suffix (Davit: 18 rooms, Risky: 17 rooms, Darul: 24 rooms, Fitria: 18 rooms, Raditya: 18 rooms) with zero duplication in the room master catalog.",
          "zh": "同步 95 间教室保洁排班至 5 名后缀为 'Triple S' 的在职保洁员（Davit：18 间、Risky：17 间、Darul：24 间、Fitria：18 间、Raditya：18 间），并确保教室主数据无重复记录。"
        },
        {
          "id": "Menghapus tombol duplikat 'Atur Ruangan Cleaner Ini' pada footer modal Detail Tugas di /data/vendor-checklist dan menetapkan aturan baku proyek (Single Action / Anti-Duplication Button Rule) yang melarang adanya lebih dari satu tombol yang mengarah ke modal atau fungsionalitas yang sama pada satu halaman atau sub-modal.",
          "en": "Removed the duplicate 'Atur Ruangan Cleaner Ini' button from the Task Detail modal footer on /data/vendor-checklist and established a project-wide rule (Single Action / Anti-Duplication Button Rule) prohibiting duplicate buttons pointing to the same modal or action across a page or sub-modal.",
          "zh": "移除 /data/vendor-checklist 任务详情弹窗底部的'Atur Ruangan Cleaner Ini'冗余按钮，并在项目规范中确立防按钮冗余规则（Single Action / Anti-Duplication Button Rule），禁止在单页面或子弹窗内存在多个指向相同弹窗或操作的重复按钮。"
        },
        {
          "id": "Menghapus teks sub-judul deskripsi di bawah judul halaman /data/vendor-checklist guna mewujudkan tata letak header yang lebih ringkas, bersih, dan fokus.",
          "en": "Removed the descriptive subtitle under the page title on /data/vendor-checklist for a more concise, uncluttered, and focused header layout.",
          "zh": "移除 /data/vendor-checklist 页面标题下方的描述性副标题文本，使顶栏排版更加紧凑、整洁与专注。"
        },
        {
          "id": "Menghapus pemilih tanggal harian tunggal pada bilah alat atas serta menghapus bilah pencarian ruangan/petugas dan selektor cleaner di /data/vendor-checklist agar navigasi terfokus penuh pada pemilih rentang mingguan kalender (Weekly Calendar View).",
          "en": "Removed the single daily date picker from the top toolbar as well as the search bar and cleaner dropdown selector on /data/vendor-checklist to streamline navigation directly onto the Weekly Calendar View.",
          "zh": "移除 /data/vendor-checklist 顶部工具栏中的单日日期选择器，并移除房间/保洁员搜索框与保洁员筛选下拉框，使日历导航完全聚焦于统一的周历视图（Weekly Calendar View）。"
        }
      ],
      "fixed": [
        {
          "id": "Memperbaiki error 403 Forbidden (Direct access is strictly prohibited) pada portal PHP cPanel (cpanel-report-facility/index.php & cpanel-vendor-checklist/index.php) dengan mendefinisikan konstanta proteksi CCS_VENDOR_LOADED sebelum memuat config.php serta menyelaraskan konstanta API_SECRET_TOKEN dan NEXTJS_API_URL.",
          "en": "Fixed the 403 Forbidden (Direct access is strictly prohibited) error on the cPanel PHP portals (cpanel-report-facility/index.php & cpanel-vendor-checklist/index.php) by defining the CCS_VENDOR_LOADED guard constant before loading config.php and aligning API_SECRET_TOKEN and NEXTJS_API_URL constants.",
          "zh": "修复 cPanel PHP 门户（cpanel-report-facility/index.php 与 cpanel-vendor-checklist/index.php）中的 403 Forbidden（Direct access is strictly prohibited）错误，在加载 config.php 前定义 CCS_VENDOR_LOADED 保护常量并统一 API_SECRET_TOKEN 与 NEXTJS_API_URL 常量。"
        },
        {
          "id": "Menambahkan pratinjau thumbnail foto kondisi keluhan pelapor pada tab 'Komplain Pelapor' di portal cleaner (/checklist/index.php) lengkap dengan modal lightbox interaktif untuk memperbesar foto saat diklik, serta dukungan streaming lintas folder uploads antara portal pelapor dan cleaner.",
          "en": "Added reporter condition photo thumbnail preview on the 'Komplain Pelapor' tab in the cleaner portal (/checklist/index.php) complete with an interactive lightbox modal to enlarge photos upon clicking, along with cross-folder upload streaming support between reporter and cleaner portals.",
          "zh": "在保洁员门户（/checklist/index.php）的'报修投诉'选项卡中新增报修人现场照片微缩图预览，并配备点击即可放大查看全图的交互式灯箱弹窗（Lightbox），同时支持报修端与保洁端跨 uploads 目录的文件流式访问。"
        },
        {
          "id": "Menambahkan proteksi konkurensi (atomic concurrency guard) pada API penyelesaian komplain (resolve_report) untuk mencegah race condition saat 2 cleaner menyelesaikan komplain yang sama secara bersamaan: cleaner kedua tidak akan menimpa data cleaner pertama melainkan menerima notifikasi bahwa laporan telah diselesaikan lebih dulu beserta nama petugas dan jamnya, lalu kartu otomatis diperbarui.",
          "en": "Added atomic concurrency guard to the complaint resolution API (resolve_report) to prevent race conditions when two cleaners resolve the same complaint simultaneously: the second cleaner will not overwrite the first cleaner's submission but will receive a notice stating it was already resolved along with the resolver's name and timestamp, automatically refreshing the card.",
          "zh": "在设施报修处理接口（resolve_report）中加入原子并发控制保护（Atomic Concurrency Guard），防止两名保洁员同时处理同一张报修单发生竞争覆写：后提交的保洁员不会覆盖先提交者的数据，而是会收到提示告知该报修单已由首位保洁员于几点几分完成，并自动刷新移除该卡片。"
        },
        {
          "id": "Memperbaiki kendala foto laporan fasilitas dan foto kebersihan yang terkadang gagal dimuat (broken image placeholder) pada modal inspeksi /data/vendor-checklist akibat latensi atau timeout resolusi DNS hosting sesaat: menambahkan mekanisme auto-retry transparan pada proxy API Next.js serta tombol 'Coba Lagi' interaktif dengan cache-buster di UI.",
          "en": "Fixed intermittent image load failures (broken image placeholder) on /data/vendor-checklist inspection modals caused by transient DNS resolution or network timeouts to the hosting: added transparent auto-retry mechanisms to Next.js photo proxy APIs and an interactive 'Coba Lagi' retry button with cache-busting in the UI.",
          "zh": "修复 /data/vendor-checklist 检查弹窗中因主机 DNS 解析超时或瞬时网络延迟偶发图片无法加载（碎图图标）的问题：在 Next.js 图片代理 API 中增加透明自动重试机制，并在界面增加带防缓存机制的'Coba Lagi'重试按钮。"
        },
        {
          "id": "Memperbaiki tabel Task-Specific Clarification (TSC) yang kosong pada perencana unit MYP (/data/topic-new) dengan memuat kriteria dan strand rubrik secara reaktif saat membuka unit planner (handleTopicOpen), memperbaiki guard dependensi kriteria pada UnitPlannerDocumentEditor, serta menyediakan fallback pemetaan kunci legacy (A_general_*, C_general_*) pada editor dan generator PDF.",
          "en": "Fixed blank Task-Specific Clarification (TSC) rubric tables in the MYP Unit Planner (/data/topic-new) by reactively loading criteria and rubric strands upon opening a unit planner (handleTopicOpen), fixing criteria dependency guards in UnitPlannerDocumentEditor, and adding fallback mapping for legacy clarification keys (A_general_*, C_general_*) in both the document editor and PDF generators.",
          "zh": "修复 MYP 单元备课计划（/data/topic-new）中任务特定细化表（Task-Specific Clarification / TSC）显示空白的问题：在打开备课计划时（handleTopicOpen）同步响应式加载学科准则（Criteria）与阶梯维度（Strands），修复 UnitPlannerDocumentEditor 内部阶梯依赖守卫，并在文档编辑器与 PDF 生成器中增加对旧版通用细化键（A_general_*、C_general_*）的回退映射支持。"
        }
      ]
    }
  },
  {
    "version": "0.6.0",
    "date": "2026-11-07",
    "isLatest": false,
    "summary": {
      "id": "Rilis komprehensif portal checklist kebersihan vendor & pusat penanganan komplain fasilitas ruangan (laci drawer hamburger, 2 tab komplain, upload bukti perbaikan), optimasi logo mobile, serta perombakan alur pendaftaran siswa baru dengan interactive tabbed stepper dan kartu referral mandiri.",
      "en": "Comprehensive release of vendor cleaning checklist & room facility complaint resolution center (slide-over hamburger drawer, 2-tab complaint view, resolution photo proof), mobile logo optimization, and applicant portal overhaul with interactive tabbed stepper and standalone referral step.",
      "zh": "保洁巡检与教室设施报修处理中心全面升级（移动端汉堡抽屉导航、双选项卡报修中心、整改现场双照闭环）、移动端校徽排版优化，并重构新生报名进度追踪交互式步进条与独立推荐人信息卡。"
    },
    "sections": {
      "added": [
        {
          "id": "Pusat Penanganan Komplain Fasilitas khusus pada portal vendor/cleaning (index.php) dengan antarmuka 2 tab terpadu: Tab 1 \"Komplain Aktif\" untuk menindaklanjuti dan menyelesaikan keluhan langsung dengan foto bukti perbaikan, dan Tab 2 \"History Komplain\" untuk melihat arsip keluhan yang telah selesai.",
          "en": "Dedicated Facility Complaint Handling center on vendor/cleaning portal (index.php) featuring a unified 2-tab view: Tab 1 \"Active Complaints\" for resolving issues with photo proof, and Tab 2 \"Complaint History\" for viewing resolved records and side-by-side photos.",
          "zh": "在保洁门户（index.php）新增“设施报修处理中心”专属页面，配备双选项卡：选项卡一“待处理报修”支持直接拍照整改提交；选项卡二“报修历史”归档查看已完成记录及双照对比。"
        },
        {
          "id": "Laci navigasi hamburger (Slide-over drawer) pada portal mobile cPanel untuk navigasi ergonomis antar Scanner, Penanganan Komplain, dan Ganti Peran, dilengkapi live counter badge jumlah komplain aktif.",
          "en": "Slide-over hamburger navigation drawer on cPanel mobile portal allowing seamless switching between Scanner, Complaint Center, and Role Settings, complete with live active complaint counter badge.",
          "zh": "在 cPanel 移动端门户引入侧滑抽屉汉堡菜单，轻松切换扫码、报修处理大厅及角色设置，并带未完成数量高亮角标提醒。"
        },
        {
          "id": "Tab terpadu \"Laporan & Komplain Fasilitas\" pada dashboard supervisor Next.js (/data/vendor-checklist) untuk pemantauan real-time, filter status kendala, preview foto sebelum/sesudah, dan ekspor laporan.",
          "en": "Unified \"Facility Complaints\" tab on Next.js supervisor dashboard (/data/vendor-checklist) for real-time monitoring, issue status filtering, before/after photo inspection, and report exports.",
          "zh": "在 Next.js 主管仪表板（/data/vendor-checklist）新增“设施报修与整改追踪”选项卡，支持实时监控、状态筛选、双照对比查阅及报表导出。"
        },
        {
          "id": "Sistem alur pendaftaran siswa baru berbasis Interactive Tabbed Stepper 6 tahap di status.php: setiap lingkaran tahap dapat diklik untuk berganti tampilan secara instan tanpa reload, navigasi antar tahap yang mulus, dan deteksi URL hash (#step-1 s/d #step-6).",
          "en": "6-stage Interactive Tabbed Stepper for student admissions on status.php: interactive stage anchors allowing instant switching without page reload, smooth navigation, and smart URL hash detection (#step-1 to #step-6).",
          "zh": "新生报名进度追踪页（status.php）全新升级 6 步交互式步进条：各阶段节点均可点击即时切换视图无刷新跳转，配备平滑滚动与 URL hash 智能锚点检测（#step-1 至 #step-6）。"
        },
        {
          "id": "Tahap ke-3 mandiri \"Referral (Opsional)\" pada alur pendaftaran dengan form input nama orang tua & siswa yang merekomendasikan, tombol \"Simpan Referral\", dan \"Lewati Tahap Ini\" yang tetap dapat diakses di setiap tahapan.",
          "en": "Standalone Step 3 \"Referral (Optional)\" in the admission flow with referring parent & student input, \"Save Referral\" button, and \"Skip This Step\" button, persistently accessible across all admission stages.",
          "zh": "独立的第 3 步“推荐人（选填）”信息卡，配备推荐家长与学生姓名输入框、一键“保存推荐人”按钮以及“跳过此步骤”按钮，在录取后仍永久保留可随时补录。"
        },
        {
          "id": "Mekanisme proteksi kunci kamera scanner: jika peran adalah Petugas Kebersihan namun nama belum dipilih, kamera scanner otomatis dinonaktifkan (kamera mati) dan digantikan prompt interaktif untuk memilih nama petugas.",
          "en": "Strict scanner lock protection: if role is Cleaning Staff but no individual name is selected, camera is completely disabled and replaced with an interactive prompt to select staff identity first.",
          "zh": "摄像头权限硬锁定保护机制：若当前角色为保洁员但尚未选择具体员工姓名，摄像头保持关闭状态并展示醒目警示卡，选定姓名后方可解锁并开启扫描。"
        },
        {
          "id": "Tombol navigasi cepat \"Lanjut ke Ruangan Lain (Scan QR)\" pada checklist status pending review & approved serta opsi instan pada dialog sukses selesai membersihkan.",
          "en": "Quick action \"Continue to Next Room (Scan QR)\" on pending review & approved checklist screens and cleaning completion success dialog to immediately switch to next room scanner.",
          "zh": "在“等待审核”与“已审核”状态页面及打扫完成弹窗中新增“继续扫描下一间教室（扫码）”主操作按钮，快速唤起摄像头进入下一间教室扫码。"
        },
        {
          "id": "Endpoint Next.js API dan tabel database room_facility_reports serta handler save_referral & update_referral di /api/public/admission.",
          "en": "Next.js API endpoints, room_facility_reports database table, and save_referral & update_referral handlers in /api/public/admission.",
          "zh": "新增 room_facility_reports 数据表与 Next.js 接口网关，并在 /api/public/admission 中集成 save_referral 与 update_referral 处理端点。"
        },
        {
          "id": "Tampilan kartu versi rilis expandable dropdown (accordion) pada halaman Changelog (/data/feedback): rincian perubahan kini tersimpan rapi dan dapat dibuka secara interaktif dengan mengklik tombol panah ke bawah (chevron down) pada setiap kartu versi.",
          "en": "Interactive expandable dropdown cards (accordion) for release notes on the Changelog page (/data/feedback): detailed category items are cleanly tucked away and revealed upon clicking the downward chevron arrow on any version card.",
          "zh": "Changelog 更新日志页面（/data/feedback）全新支持折叠展开式下拉卡片（Accordion）：详细的更新条款默认整洁收纳，点击版本卡片右侧的向下箭头即可平滑展开查阅明细。"
        },
        {
          "id": "Tombol kontrol \"Buka Semua / Tutup Semua Detail\" serta indikator badge jumlah perubahan (+Added, ~Changed, ✓Fixed) pada kartu versi yang belum diexpand.",
          "en": "\"Expand All / Collapse All Details\" master control button and preview badges (+Added, ~Changed, ✓Fixed) on collapsed version cards.",
          "zh": "新增“展开全部 / 折叠全部详情”全局快捷按钮，并在收起状态的版本卡片上直观提供变更数量小角标（+Added、~Changed、✓Fixed）。"
        }
      ],
      "changed": [
        {
          "id": "Penataan ulang kartu petugas kebersihan aktif (#activeRoleBar): tombol \"Ganti Nama\" diposisikan rapi tepat di bawah nama petugas, dan kartu notifikasi \"Komplain Ruangan Perlu Ditangani\" ditempatkan di bawah tombol ganti nama.",
          "en": "Refined active cleaner header card (#activeRoleBar): positioned \"Change Name\" button neatly below the cleaner name, and placed \"Room Complaints Need Attention\" alert card directly beneath it.",
          "zh": "重构顶栏保洁员卡片（#activeRoleBar）：将“更换姓名”按钮置于员工姓名正下方，并将“教室报修待处理”提醒卡紧凑排列于其下方。"
        },
        {
          "id": "Pembersihan elemen redundan: menghapus tombol duplikat penanganan komplain di sebelah nama petugas serta menghapus kartu notifikasi komplain panjang dari dasar halaman scanner.",
          "en": "Eliminated redundant UI elements: removed duplicate complaint button next to cleaner name and removed the long complaints banner from the bottom of the scanner page.",
          "zh": "精简冗余操作元素：移除员工姓名旁重复的跳转按钮，并清空扫码框下方冗长的报修列表。"
        },
        {
          "id": "Pemisahan alur kebersihan ruangan: formulir ruangan kini fokus murni pada pengerjaan kebersihan harian (Foto Before -> Selesai -> Foto After) tanpa tumpang tindih dengan pelaporan komplain.",
          "en": "Streamlined room cleaning workflow: room checklist form now focuses purely on daily routine tasks (Before Photo -> Finished -> After Photo), cleanly separated from complaint management.",
          "zh": "清洁工作流程规范化：教室打卡表单回归纯粹的日常流程（打扫前照片 -> 完成 -> 打扫后照片），彻底告别与设施报修的重叠干扰。"
        },
        {
          "id": "Perapian kartu komplain aktif: menyederhanakan teks tombol menjadi \"Tangani\" dan \"Lihat Foto\", menghapus badge status berlebih, dan menyusun tombol aksi vertikal di bawah nama pelapor.",
          "en": "Refined active complaint cards: shortened buttons to \"Resolve\" and \"View Photo\", removed redundant badges, and arranged action buttons vertically below reporter details.",
          "zh": "精简待处理报修卡片布局：简化操作按钮为“处理”与“查看照片”，移除多余角标，并将操作按钮垂直排列于报修人信息下方。"
        },
        {
          "id": "Penyederhanaan formulir pelaporan: menghapus input kontak/nomor WhatsApp agar proses pelaporan kendala ruangan lebih cepat, ringkas, dan instan.",
          "en": "Simplified reporting form: removed contact/WhatsApp number field for a faster, friction-free reporting experience.",
          "zh": "简化报修表单：移除手机号/WhatsApp 输入框，实现极速免繁琐直接报修。"
        },
        {
          "id": "Penyederhanaan tampilan Step 1 Pendaftaran: menghapus tombol cetak bukti registrasi agar alur tetap ringkas, bersih, dan konsisten dengan kaidah minimalist design.",
          "en": "Streamlined Step 1 Admission view: removed print registration receipt button in favor of a cleaner minimalist layout.",
          "zh": "精简新生报名第 1 步页面：移除打印凭条按钮，保持界面极简干净。"
        },
        {
          "id": "Pilihan nama petugas kebersihan kini otomatis diingat secara permanen (localStorage) dan tersinkronisasi otomatis (auto-selected) di semua layar.",
          "en": "Selected cleaner name is now permanently remembered in localStorage and auto-selected across all views.",
          "zh": "所选保洁员姓名现已永久持久化至本地缓存（localStorage），并在所有界面实现全自动匹配选中。"
        }
      ],
      "fixed": [
        {
          "id": "Pembersihan memori posisi ruangan: setiap pengguna memilih \"Laporkan Masalah\" atau berganti peran, parameter ruangan sebelumnya otomatis di-reset dan kamera langsung diarahkan untuk memindai ruangan baru.",
          "en": "Cleared room persistence for complaints: whenever users select \"Report Issue\" or switch roles, previous room state is cleared and scanner opens immediately to scan the actual affected room.",
          "zh": "消除报修模式下的房间位置记忆：每次进入报修或切换角色时均自动清空历史房间状态并强制重新扫码。"
        },
        {
          "id": "Perampingan logo sekolah pada mobile: mengecilkan batas lebar logo resmi CCS dari 128px menjadi 78px (tinggi proporsional maks 42px) dan memadatkan header mobile dari 72px ke 56px.",
          "en": "Optimized school logo on mobile devices: reduced CCS official logo width from 128px to 78px (max proportional height 42px) and tightened mobile header height from 72px to 56px.",
          "zh": "移动端校徽尺寸紧凑化：将 CCS 校徽从 128px 缩小至 78px（最大高 42px），顶栏高度从 72px 压减至 56px。"
        },
        {
          "id": "Perbaikan aksesibilitas kartu referral: kartu referral kini tetap terlihat, dapat diisi, dan diubah di semua tahapan status pendaftaran bahkan setelah calon siswa resmi diterima.",
          "en": "Fixed referral card accessibility: referral card is now persistently positioned so parents can view, fill, or edit referral across all admission stages even after official admission.",
          "zh": "修复学生被录取后或填写档案时推荐人卡片消失的问题：推荐人卡片现已独立全局展示，家长在任何阶段均可随时查看或补录推荐人。"
        },
        {
          "id": "Perbaikan status visual Tahap 3 (Referral) pada stepper: ketika siswa telah berada di tahap lanjut namun belum mengisi referral, status tampil elegan sebagai \"Dilewati (Opsional)\".",
          "en": "Fixed visual state of Step 3 (Referral) in stepper: when applicants are at advanced stages without referral, it displays elegantly as \"Skipped (Optional)\".",
          "zh": "修复步进条第 3 步（推荐人）的视觉状态：当学生已进入后续流程且未填推荐人时，优雅展示为“已跳过（选填）”。"
        },
        {
          "id": "Scanner QR internal tanpa reload penuh: pemindaian kode QR di dalam portal kini memuat data ruangan langsung via AJAX tanpa menempelkan parameter \"?room=...\" ke dalam riwayat URL browser permanen.",
          "en": "In-app QR scanner now seamlessly loads room data via AJAX without persisting \"?room=...\" into permanent browser URL.",
          "zh": "站内二维码扫描改用 AJAX 无刷新加载，避免在浏览器地址栏遗留 \"?room=...\" 参数导致页面记忆旧房间。"
        },
        {
          "id": "Penyesuaian penutup tag container HTML (</div>) pada #scannerSection di cpanel-vendor-checklist/index.php untuk integritas struktur DOM yang valid.",
          "en": "Fixed closing container </div> tags on #scannerSection in cpanel-vendor-checklist/index.php ensuring valid DOM structure and seamless rendering.",
          "zh": "修复 cpanel-vendor-checklist/index.php 中 #scannerSection 的 HTML 闭合标签嵌套层级，保障 DOM 结构标准规范。"
        }
      ]
    }
  },
  {
    "version": "0.5.0",
    "date": "2026-11-06",
    "isLatest": false,
    "summary": {
      "id": "Pembaruan sistem pelaporan kendala menjadi Changelog publik berbasis standar Keep a Changelog 1.1.0, dialog Customer Support Desk & Bug Reporting di navbar, integrasi notifikasi bot Google Chat, serta pengelolaan tiket staf.",
      "en": "System feedback evolution into structured public Changelog based on Keep a Changelog 1.1.0 standard, global Bug Reporting dialog in navbar, Google Chat bot notification integration, and staff ticket management desk.",
      "zh": "全面升级问题反馈中心为遵循 Keep a Changelog 1.1.0 标准的公开更新日志、顶栏全局报修弹窗、Google Chat 机器人自动通知与员工工单管理大厅。"
    },
    "sections": {
      "added": [
        {
          "id": "Akses cepat tombol Bug Reporting di navbar atas yang dapat membuka modal pelaporan kendala dari halaman mana saja di sistem.",
          "en": "Quick-access Bug Reporting button on top navbar allowing staff to open bug reporting modal from anywhere in the app.",
          "zh": "在系统顶部导航栏新增“反馈与建议”快速入口，支持随时随地唤起工单上报弹窗。"
        },
        {
          "id": "Halaman Changelog publik terstruktur dengan kategori Added, Changed, dan Fixed, filter kategori, serta pencarian instan.",
          "en": "Structured public Changelog page featuring Added, Changed, and Fixed categories, filter tabs, and instant search.",
          "zh": "全新设计公开更新日志中心，严谨分类 Added、Changed 与 Fixed 更新条目，支持分类筛选与实时搜索。"
        },
        {
          "id": "Dukungan penuh Multilingual (Bahasa Indonesia, English, 中文) terintegrasi secara dinamis di seluruh modal Bug Reporting dan Changelog.",
          "en": "Full dynamic Multilingual support (Indonesian, English, Chinese) across Bug Reporting modal and Changelog.",
          "zh": "在工单提交弹窗与系统更新日志全线提供多语言（印尼语、英语、中文）无缝动态切换。"
        },
        {
          "id": "Fitur upload screenshot error langsung ke Supabase Storage (bucket attachments) dengan kompresi gambar otomatis di browser.",
          "en": "Direct error screenshot upload to Supabase Storage (attachments bucket) with automatic in-browser image compression.",
          "zh": "支持将错误截图或照片直传至 Supabase Storage 存储桶，并在浏览器端自动高效无损压缩。"
        },
        {
          "id": "Integrasi notifikasi bot Google Chat otomatis ke ruang koordinasi saat ada tiket baru maupun pembaruan status penyelesaian.",
          "en": "Automated Google Chat webhook notifications sent directly to staff space upon ticket submission and status updates.",
          "zh": "全面集成 Google Chat 机器人 Webhook，在工单提交及状态变更时自动向工作区推送结构化卡片通知。"
        },
        {
          "id": "Tab terintegrasi \"Tiket Saya\" di dalam modal Bug Reporting yang dapat diakses langsung oleh staf tanpa berpindah halaman.",
          "en": "Integrated \"My Tickets\" tab inside the Bug Reporting modal accessible instantly without page redirection.",
          "zh": "在反馈弹窗内直接内置“我的工单”选项卡，方便员工即时查看历史反馈与处理进度。"
        },
        {
          "id": "Panel pengaturan penerima notifikasi laporan masuk (Admin Only) dengan opsi aktivasi/deaktivasi staf penerima.",
          "en": "Notification recipients manager panel (Admin Only) allowing admins to toggle active staff bot notification subscribers.",
          "zh": "新增管理员专属“通知接收人配置面板”，支持灵活指派或启停接收机器人通知的教职员工。"
        }
      ],
      "changed": [
        {
          "id": "Halaman /data/feedback kini 100% didedikasikan murni untuk Changelog rilis sistem, sementara pengelolaan laporan terpusat di modal interaktif.",
          "en": "Page /data/feedback is now 100% dedicated to system release Changelog, while ticket handling is consolidated into interactive modal.",
          "zh": "/data/feedback 页面全面专注呈现系统版本更新日志，工单提交与跟进统一移至全局交互弹窗。"
        },
        {
          "id": "Penghapusan fitur voting/thumbs up lama dan pembersihan skema database agar sistem tiket lebih fokus pada penanganan kendala nyata.",
          "en": "Removed legacy upvoting/thumbs-up feature and cleaned database schema to focus squarely on practical issue resolution.",
          "zh": "彻底废弃原旧版点赞机制并精简数据库结构，聚焦高效的实际运维与故障响应。"
        },
        {
          "id": "Membuka modal pelaporan kini menyajikan 2 kartu aksi terpisah (\"Laporkan Kendala Baru\" dan \"Lihat Kendala Sedang Ditangani\") untuk transparansi alur.",
          "en": "Bug reporting modal entry now displays 2 distinct action cards (\"Report New Issue\" and \"View Ongoing Fixes\") for process transparency.",
          "zh": "弹窗首页清晰展示“提交新反馈”与“查看处理中问题”双卡片入口，增强运维透明度。"
        },
        {
          "id": "Format notifikasi bot Google Chat distandarisasi ke bahasa Inggris dengan tipografi yang bersih dan profesional.",
          "en": "Standardized Google Chat bot notification layout into English with clean, professional typography.",
          "zh": "将 Google Chat 机器人通知文案全线标准化为规范雅致的英文排版。"
        }
      ],
      "fixed": [
        {
          "id": "Penyelarasan properti URL respon (publicUrl & url) pada endpoint upload screenshot serta dukungan format clipboard screenshot.",
          "en": "Aligned response URL properties (publicUrl & url) on screenshot upload endpoint with direct clipboard screenshot support.",
          "zh": "统一截图上传接口的返回字段（publicUrl 与 url），并全面支持剪贴板图片直接粘贴上传。"
        },
        {
          "id": "Lokalisasi penuh teks antarmuka modal Bug Reporting, Customer Support Desk, dan panel admin tiket pada seluruh varian bahasa.",
          "en": "Full i18n localization of all UI strings across Bug Reporting modal, Support Desk, and admin ticket panels.",
          "zh": "全面完善反馈弹窗、客户支持台及工单状态管理界面的所有多语言字典翻译。"
        },
        {
          "id": "Perbaikan tata letak tombol Tambah Penerima di modal pengaturan notifikasi bot dan validasi form input staf.",
          "en": "Fixed layout of Add Recipient button in notification modal and improved staff selection input validation.",
          "zh": "修复机器人通知配置弹窗中“添加接收人”按钮的排版样式，并完善员工下拉选择校验。"
        }
      ]
    }
  },
  {
    "version": "0.4.0",
    "date": "2026-11-04",
    "isLatest": false,
    "summary": {
      "id": "Penambahan kurikulum PYP strand assessment matrices dan perbaikan batas paginasi data PostgREST.",
      "en": "Added PYP strand assessment matrices and PostgREST chunked pagination fixes.",
      "zh": "新增 PYP 细分评估矩阵并解决 PostgREST 分页限制。"
    },
    "sections": {
      "added": [
        {
          "id": "Modul matriks penilaian PYP Subject Strands & Approaches to Learning (ATL) dengan ekspor PDF rekap per kelas.",
          "en": "PYP Subject Strands & Approaches to Learning (ATL) assessment matrix with class PDF export.",
          "zh": "PYP 学科细分与学习方法（ATL）评估矩阵，支持导出班级 PDF 报告。"
        },
        {
          "id": "Generator PDF laporan perkembangan usia dini (Nursery Learning Progression & Developmental Milestones).",
          "en": "Nursery Learning Progression & Developmental Milestones PDF generator.",
          "zh": "幼儿园早期成长与发育里程碑 PDF 评估报告生成器。"
        }
      ],
      "changed": [
        {
          "id": "Menerapkan paginasi chunked range (1.000 baris) pada seluruh query riwayat absensi untuk mencegah pemotongan data otomatis oleh PostgREST.",
          "en": "Implemented chunked range pagination (1,000 rows) on attendance queries to prevent silent truncation.",
          "zh": "对出勤历史查询强制执行 1000 行分块分页，防止 PostgREST 静默截断数据。"
        }
      ],
      "fixed": [
        {
          "id": "Pencatatan waktu jam masuk dan keluar absensi staf kini diperhitungkan hingga presisi detik.",
          "en": "Staff check-in and check-out time calculations now accurately compute down to the second.",
          "zh": "教职工上下班打卡时间计算精确到秒。"
        }
      ]
    }
  }
]
