// ==============================================================================
// KEEP A CHANGELOG (1.1.0) SPECIFICATION FOR SCHOOL ADMIN SYSTEM
// Guiding principles:
// 1. Changelogs are for humans, not machines.
// 2. An entry for every single version.
// 3. Grouped categories: Added, Changed, Fixed, Security, Deprecated, Removed.
// 4. Chronological order (latest first) with release dates.
// ==============================================================================

export const SYSTEM_RELEASES = [
  {
    version: '0.7.1',
    date: '2026-11-07',
    isLatest: true,
    summary: {
      id: 'Perapian antarmuka Step 1 (Registrasi Awal): menghapus tombol cetak bukti registrasi agar alur tetap ringkas, bersih, dan konsisten dengan kaidah minimalist design.',
      en: 'Interface refinement on Step 1 (Initial Registration): removed the print registration proof button to keep the workflow clean, uncluttered, and strictly compliant with minimalist design standards.',
      zh: '第 1 步（初始注册）界面精简：移除打印登记证明按钮，保持界面纯粹克制，严格符合极简设计标准。'
    },
    sections: {
      removed: [
        {
          id: 'Menghapus tombol "Cetak Bukti Registrasi" pada kartu Tahap 1 di status.php untuk menjaga kerapian dan kesederhanaan tampilan informasi admisi.',
          en: 'Removed the "Cetak Bukti Registrasi" print button from Stage 1 card on status.php to keep admission layout clean, concise, and distraction-free.',
          zh: '移除 status.php 第 1 阶段卡片中的“打印登记凭证”按钮，去除多余操作杂音，维护界面纯粹与整洁。'
        }
      ]
    }
  },
  {
    version: '0.7.0',
    date: '2026-11-07',
    isLatest: false,
    summary: {
      id: 'Perombakan arsitektur portal pelacakan pendaftaran menjadi Interactive Tabbed Stepper minimalis: setiap lingkaran tahap dapat diklik untuk berganti tampilan secara instan tanpa reload, navigasi antar tahap yang mulus, dan tampilan data terfokus pada setiap fase admisi.',
      en: 'Architectural overhaul of applicant tracking portal into a minimalist Interactive Tabbed Stepper: each step circle acts as an interactive tab switching views instantly without reload, smooth inter-stage navigation, and focused phase data.',
      zh: '新生报名追踪门户全面重构为极简交互式分步标签页（Interactive Tabbed Stepper）：各步骤节点支持无刷新即时切换展示，阶段间无缝跳转，提供极致简洁优雅的各环节数据概览。'
    },
    sections: {
      added: [
        {
          id: 'Sistem Tab Navigator Interaktif 6 Tahap pada status.php: mengklik nomor tahap di stepper langsung mengganti panel kartu di bawahnya secara dinamis dengan animasi halus (fade-in) tanpa reload halaman.',
          en: 'Interactive 6-Stage Tab Navigator on status.php: clicking any step circle dynamically switches the active card panel below with a smooth fade-in animation without reloading.',
          zh: 'status.php 全新支持 6 阶段交互式分步选项卡系统：点击顶部任一步骤即可无刷新即时平滑切换至对应的卡片内容面板。'
        },
        {
          id: 'Panel mandiri untuk masing-masing 6 tahapan admisi (Tahap 1 Bukti Registrasi, Tahap 2 Pembayaran Formulir & Struk, Tahap 3 Referral, Tahap 4 Biodata Lengkap, Tahap 5 Jadwal Observasi & Wawancara, Tahap 6 Keputusan Hasil Seleksi).',
          en: 'Dedicated panels for each of the 6 admission stages (Step 1 Registration Slip, Step 2 Form Fee & Receipt, Step 3 Referral, Step 4 Complete Profile, Step 5 Observation & Interview Schedule, Step 6 Selection Result).',
          zh: '为 6 个招生阶段分别构建专属独立面板（第 1 步初始登记回执、第 2 步表格缴费与凭证、第 3 步推荐人、第 4 步详细档案、第 5 步评估与面试日程、第 6 步录取结果通知）。'
        },
        {
          id: 'Baris navigasi pintar & deteksi URL hash (#step-1 s/d #step-6) yang secara cerdas mengingat dan membuka langsung tab sesuai status terkini atau aksi terakhir pendaftar.',
          en: 'Smart navigation bar & URL hash detection (#step-1 to #step-6) intelligently auto-opening the relevant tab based on applicant current status or latest action.',
          zh: '智能导航指示栏与 URL 锚点探测（#step-1 至 #step-6），智能根据当前状态或最新提交动作自动高亮并定位目标阶段。'
        }
      ],
      changed: [
        {
          id: 'Penyederhanaan desain (minimalist design) pada seluruh kartu status: menghapus teks berlebihan dan menyajikan informasi ringkas, data terstruktur yang rapi, dan kontras visual yang elegan.',
          en: 'Minimalist design simplification across all status cards: removed verbose redundant text, delivering concise information, structured data tables, and dignified visual contrast.',
          zh: '遵循极简设计规范（Minimalist Design）深度精简各卡片排版：彻底剔除冗余修饰文本，呈现清晰凝练的结构化数据与高端雅致的视觉质感。'
        }
      ]
    }
  },
  {
    version: '0.6.5',
    date: '2026-11-07',
    isLatest: false,
    summary: {
      id: 'Perbaikan aksesibilitas tahap referral: kartu referral kini tetap dapat diakses, diisi, dan diubah kapan saja bahkan setelah calon siswa resmi diterima, disertai stepper interaktif dengan tautan langsung ke setiap tahap.',
      en: 'Fixed referral stage accessibility: referral card is now persistently accessible, fillable, and editable at any time even after official admission, with interactive stepper anchor links.',
      zh: '修复推荐人环节的访问支持：在学生正式录取后推荐人卡片仍永久保留并支持随时补充或修改，步进条全面支持点击直达对应阶段。'
    },
    sections: {
      fixed: [
        {
          id: 'Perbaikan status visual Tahap 3 (Referral) pada stepper: ketika siswa telah berada di tahap lanjut (sudah diterima / biodata lengkap) namun belum mengisi referral, status tidak lagi tertahan di warna oranye aktif melainkan tampil elegan sebagai "Dilewati (Opsional)".',
          en: 'Fixed visual state of Step 3 (Referral) in stepper: when applicants are at advanced stages (accepted / completed profile) without referral, it no longer stays stuck on active orange, displaying elegantly as "Skipped (Optional)".',
          zh: '修复步进条第 3 步（推荐人）的视觉状态：当学生已进入后续流程（已录取或档案已填完）且未填推荐人时，不再异常停留在橙色活跃状态，而是优雅展示为“已跳过（选填）”。'
        },
        {
          id: 'Perbaikan hilangnya kartu referral setelah siswa resmi diterima atau saat mengisi biodata: kartu informasi referral kini diposisikan mandiri sehingga tetap terlihat dan dapat diisi/diubah di semua tahapan status pendaftaran.',
          en: 'Fixed missing referral card upon official admission or during profile entry: referral card is now persistently positioned so parents can view, fill, or edit referral across all admission stages.',
          zh: '修复学生被录取后或填写档案时推荐人卡片消失的问题：推荐人卡片现已独立全局展示，家长在任何阶段均可随时查看或补录推荐人。'
        }
      ],
      added: [
        {
          id: 'Tautan interaktif langsung pada setiap lingkaran dan judul stepper (desktop & mobile) untuk melakukan navigasi / smooth-scroll cepat ke bagian tahapan terkait (#tahap-referral, #kartu-diterima, dll.).',
          en: 'Direct interactive links on every stepper circle and label (desktop & mobile) enabling quick navigation / smooth-scroll to corresponding stage cards (#tahap-referral, #kartu-diterima, etc.).',
          zh: '在步进条各节点（桌面与移动端）添加交互式锚点链接，支持点击一键平滑滚动至对应卡片（#tahap-referral、#kartu-diterima 等）。'
        }
      ]
    }
  },
  {
    version: '0.6.4',
    date: '2026-11-07',
    isLatest: false,
    summary: {
      id: 'Penyempurnaan alur pendaftaran siswa: penambahan tahap ke-3 (Referral Opsional) dalam alur stepper 6 tahap di portal pendaftar dengan kartu mandiri, opsi simpan/lewati tahap, serta integrasi API Next.js.',
      en: 'Refined student admission flow: added dedicated Step 3 (Optional Referral) in the 6-stage applicant stepper with standalone card, save/skip actions, and Next.js public API integration.',
      zh: '优化新生报名流程：在申请状态追踪中新增独立的第 3 步“推荐人（选填）”流程卡片（升级为 6 步进度条），支持一键保存或跳过，并全面打通 Next.js API 接口。'
    },
    sections: {
      added: [
        {
          id: 'Tahap ke-3 khusus "Referral (Opsional)" pada diagram alur (stepper) 6 tahap di portal status pendaftaran (cpanel-registrasi/status.php) pada tampilan desktop maupun mobile.',
          en: 'Dedicated Step 3 "Referral (Optional)" in the 6-step applicant status stepper (cpanel-registrasi/status.php) across both desktop and mobile views.',
          zh: '在报名进度追踪页（cpanel-registrasi/status.php）全新升级 6 步步进条，并在桌面端与移动端新增独立的第 3 步“推荐人（选填）”。'
        },
        {
          id: 'Kartu mandiri informasi referral (#tahap-referral) dengan form input nama orang tua & siswa yang merekomendasikan, tombol "Simpan Referral", dan tombol "Lewati Tahap Ini".',
          en: 'Standalone referral card (#tahap-referral) with referring parent & student input, "Save Referral" button, and "Skip This Step" button.',
          zh: '独立的推荐人信息卡片（#tahap-referral），配备推荐家长与学生姓名输入框、一键“保存推荐人”按钮以及“跳过此步骤”按钮。'
        },
        {
          id: 'Handler API Next.js action "save_referral" dan "update_referral" di /api/public/admission dengan dukungan fallback database otomatis.',
          en: 'Next.js API endpoint handler for "save_referral" and "update_referral" in /api/public/admission with automatic database schema fallback.',
          zh: '在 /api/public/admission 中新增 "save_referral" 与 "update_referral" 接口处理，支持字段兼容与自动降级保障。'
        }
      ],
      changed: [
        {
          id: 'Pemisahan input referral dari formulir unggah bukti transfer biaya formulir agar proses pembayaran tetap ringkas dan tahap referral dapat diisi secara opsional.',
          en: 'Separated referral input from the form fee payment receipt upload form, ensuring clean upload UX and an optional dedicated referral step.',
          zh: '将推荐人输入框从转账凭证上传表单中剥离为独立选填步骤，保证缴费上传流程清爽简洁。'
        }
      ]
    }
  },
  {
    version: '0.6.3',
    date: '2026-11-07',
    isLatest: false,
    summary: {
      id: 'Perapian total antarmuka mobile portal vendor & penguncian kamera scan QR jika nama petugas kebersihan belum dipilih.',
      en: 'Complete mobile UI overhaul for vendor portal & strict scanner camera lock when cleaner staff name is not selected.',
      zh: '外包服务门户移动端排版全面重构，并对未选择具体保洁员姓名的状态强制锁定摄像头扫码权限。'
    },
    sections: {
      added: [
        {
          id: 'Mekanisme proteksi kunci kamera: Jika status peran adalah Petugas Kebersihan namun nama belum dipilih, kamera scanner otomatis dinonaktifkan (kamera mati) dan digantikan kartu peringatan interaktif untuk memilih nama terlebih dahulu.',
          en: 'Strict scanner lock protection: If role is Cleaning Staff but no individual name is selected, camera is completely disabled and replaced with an interactive prompt to select staff identity first.',
          zh: '摄像头权限硬锁定保护机制：若当前角色为保洁员但尚未选择具体员工姓名，摄像头保持关闭状态并展示醒目警示卡，必须选定姓名后方可解锁并开启扫描。'
        }
      ],
      changed: [
        {
          id: 'Perombakan total header bar mobile: menghapus banner bertumpuk yang menyebabkan teks terpotong ("Petugas Kek" & "D Auto"), menggantikannya dengan 1 header ringkas berarsitektur mobile-first yang rapi dan elegan.',
          en: 'Complete mobile header overhaul: removed redundant stacked banners that caused severe text truncation ("Petugas Kek" & "D Auto"), unifying into a single elegant mobile-first header.',
          zh: '移动端顶部状态栏全面精简重构：彻底移除双层重叠横幅，杜绝“Petugas Kek”等文字被截断与排版挤压问题，升级为标准移动端极简卡片。'
        },
        {
          id: 'Penyelarasan tombol aksi header menjadi tombol pil ringkas "[Ganti]" dan tombol ikon ganti peran yang ergonomis untuk layar HP semua ukuran.',
          en: 'Streamlined header action buttons into a compact pill "[Change]" button and ergonomic icon role-switch button tailored for all smartphone screen sizes.',
          zh: '将操作按钮精简为紧凑型药丸状“[更换]”按钮及标准图标按钮，完美适应各种小屏手机尺寸。'
        }
      ]
    }
  },
  {
    version: '0.6.2',
    date: '2026-11-07',
    isLatest: false,
    summary: {
      id: 'Penyempurnaan alur pemilihan nama petugas kebersihan (cleaner): dropdown nama langsung di kartu peran, pre-render instan, banner info petugas aktif di scanner, dan auto-select permanen di perangkat.',
      en: 'Refined cleaning staff name selection workflow: name dropdown directly on role card, instant pre-rendering, active cleaner banner on scanner, and persistent device auto-selection.',
      zh: '优化保洁员身份选择流程：在角色卡片直观提供姓名下拉选择、即时静态预渲染、扫码界面展示当前保洁员横幅并实现设备端永久自动选中。'
    },
    sections: {
      added: [
        {
          id: 'Dropdown pemilihan nama petugas kebersihan langsung di dalam kartu Petugas Kebersihan pada layar pemilihan peran, sehingga petugas dapat memilih namanya sebelum masuk ke scanner ruangan.',
          en: 'Cleaning staff name selector directly within the Cleaner role card, allowing staff to pick their identity before entering the room scanner.',
          zh: '在角色选择界面的保洁员卡片内直接提供姓名下拉菜单，方便员工在进入教室扫码前完成身份确认。'
        },
        {
          id: 'Banner info "Petugas Kebersihan Aktif" lengkap dengan badge status "Auto-selected" dan dropdown ganti nama instan tepat di atas viewfinder kamera QR scanner.',
          en: '"Active Cleaning Staff" banner with an "Auto-selected" status badge and quick-switch dropdown positioned directly above the QR scanner viewfinder.',
          zh: '在二维码扫描取景框正上方新增“当前在线保洁员”横幅，附带“自动选中”标记并支持一键快速切换人员。'
        },
        {
          id: 'Tombol "Ganti Nama" pada Active Role Bar atas untuk memudahkan pergantian nama petugas kapan saja tanpa harus mereset peran.',
          en: 'Quick "Change Staff" button on the top Active Role Bar allowing easy staff identity switching without resetting the active role.',
          zh: '在顶部已选角色导航条中新增“更换姓名”快捷按钮，无需重置角色即可无缝切换保洁人员。'
        }
      ],
      changed: [
        {
          id: 'Pilihan nama petugas kini otomatis diingat secara permanen (localStorage) dan tersinkronisasi otomatis (auto-selected) di semua layar (kartu peran, banner scanner, dan formulir ruangan).',
          en: 'Selected cleaner name is now permanently remembered in localStorage and auto-selected across all views (role card, scanner banner, and room checklist form).',
          zh: '所选保洁员姓名现已永久持久化至本地缓存（localStorage），并在所有界面（角色卡、扫码横幅、教室巡检表单）实现全自动匹配选中。'
        },
        {
          id: 'Penyediaan data awal petugas kebersihan (pre-rendered array) di sisi PHP sehingga opsi dropdown langsung muncul secara instan tanpa menunggu respons cURL API.',
          en: 'Pre-rendered default cleaner dataset in PHP ensuring dropdown options populate instantly without waiting for API cURL latency.',
          zh: '在 PHP 服务端直接内嵌保洁员花名册预渲染数据，确保下拉列表秒开无延迟，避免依赖外部 API 响应等待。'
        }
      ]
    }
  },
  {
    version: '0.6.1',
    date: '2026-11-07',
    isLatest: false,
    summary: {
      id: 'Penambahan input referral (orang tua & siswa yang merekomendasikan) saat pembayaran biaya formulir di portal pendaftar dan integrasi penuh pada sistem Next.js.',
      en: 'Added referral input (referring parent & student name) during form fee payment on applicant portal with full Next.js admin integration.',
      zh: '在新生报名系统及表单缴费环节新增推荐人（推荐家长与学生姓名）文本输入框，并全面整合至 Next.js 管理后台。'
    },
    sections: {
      added: [
        {
          id: 'Penambahan textbox input "Referral (Nama Orang Tua & Siswa yang Mereferensikan)" pada formulir upload bukti transfer biaya formulir di portal cek status pendaftaran (cPanel & Next.js).',
          en: 'Added "Referral (Referring Parent & Student Name)" textbox to the form fee transfer receipt submission form on applicant portals (cPanel & Next.js).',
          zh: '在新生报名状态查询及缴费转账凭证提交表单中新增“推荐人（推荐家长与学生姓名）”输入框（支持中、英、印尼三语）。'
        },
        {
          id: 'Integrasi data referral pada modul Admisi Next.js: badge referral di tabel utama (/data/admission), kartu informasi referral khusus pada Step 2 (Biaya Formulir), serta kolom referral pada form edit Step 3 di UnifiedAdmissionModal.',
          en: 'Full referral integration across Next.js Admission module: referral badges on the main directory table (/data/admission), dedicated referral detail card in Step 2 (Form Fee), and editable referral field in Step 3 inside UnifiedAdmissionModal.',
          zh: '全面整合推荐人信息至 Next.js 招生管理系统：在报名花名册主表格展示推荐人标签、在第 2 步（表单缴费）新增独立推荐人卡片，并在第 3 步弹窗编辑模式中支持修改。'
        },
        {
          id: 'Dukungan skema database migrasi add-referral-to-student-applications.sql dan mekanisme fallback defensif [REFERRAL] di API /api/public/admission agar sistem tetap berjalan mulus sebelum maupun sesudah migrasi.',
          en: 'Database migration script add-referral-to-student-applications.sql and defensive API fallback [REFERRAL] in /api/public/admission ensuring seamless backward compatibility.',
          zh: '提供数据库迁移脚本 add-referral-to-student-applications.sql，并在 /api/public/admission API 中实现防御性降级兼容处理，确保无感平滑迁移。'
        }
      ]
    }
  },
  {
    version: '0.6.0',
    date: '2026-11-07',
    isLatest: false,
    summary: {
      id: 'Peningkatan portal vendor: pemilihan peran Petugas Kebersihan vs Pelapor Fasilitas, dropdown otomatis cleaner, pelaporan kerusakan fasilitas, dan dukungan dwi-bahasa (ID/EN).',
      en: 'Vendor portal overhaul: role selection (Cleaner vs Facility Reporter), automated cleaner dropdown, facility damage reporting, and full bilingual support (ID/EN).',
      zh: '外包服务门户重构：新增保洁与设施报修双重角色选择、保洁员动态下拉菜单、设施故障拍照报修及中英/印英双语界面。'
    },
    sections: {
      added: [
        {
          id: 'Portal web vendor cPanel kini dilengkapi pemilihan peran (Petugas Kebersihan vs Pelapor Fasilitas) sebelum scan QR code pintu ruangan, dengan penyimpanan preferensi otomatis (localStorage).',
          en: 'cPanel vendor web portal now features role selection (Cleaning Staff vs Facility Reporter) before scanning door QR codes, with automatic device memory (localStorage).',
          zh: 'cPanel 外包服务门户现已支持在扫码前选择角色（保洁员 vs 报修人），并通过本地缓存自动记住用户角色偏好。'
        },
        {
          id: 'Fitur pelaporan kendala & kerusakan fasilitas ruangan oleh guru, siswa, maupun staf umum lengkap dengan foto kamera beresolusi terkompresi (~300KB) dan deskripsi masalah.',
          en: 'Facility issue reporting module allowing teachers, staff, or reporters to log damaged room equipment with compressed camera photos (~300KB) and issue details.',
          zh: '新增教室设施报修模块，支持教职工或学生拍照反馈损坏设备（自动压缩至约300KB）并填写问题说明。'
        },
        {
          id: 'Tabel database baru room_facility_reports beserta API gateway di Next.js untuk mencatat seluruh keluhan fasilitas ruangan sekolah secara terpusat.',
          en: 'New room_facility_reports database table and Next.js API gateway to track and manage all facility complaints centrally.',
          zh: '新增 room_facility_reports 数据库表及 Next.js API 网关，用于集中记录和管理全校各教室设施故障。'
        }
      ],
      changed: [
        {
          id: 'Kolom input manual nama petugas kebersihan diganti menjadi dropdown dinamis yang mengambil data staf aktif divisi Cleaning (role_id 14) secara otomatis.',
          en: 'Replaced manual text input for cleaners with an automated dynamic dropdown fetching active staff from the Cleaning division (role_id 14).',
          zh: '将保洁员手工文本输入升级为动态下拉菜单，自动拉取保洁组在职员工名单（role_id 14）。'
        },
        {
          id: 'Penyediaan antarmuka dwi-bahasa (Bilingual: Bahasa Indonesia & English) dengan tombol switcher bahasa instan di bagian navigasi atas.',
          en: 'Added bilingual interface support (Indonesian & English) with an instant language toggle pill in the top header.',
          zh: '提供印尼语和英语双语界面，并在顶部导航栏配置一键即时语言切换按钮。'
        }
      ]
    }
  },
  {
    version: '0.5.7',
    date: '2026-11-06',
    isLatest: false,
    summary: {
      id: 'Perapian tata letak teks empty state modal pelaporan dan penghapusan tombol pelaporan redundan di halaman Changelog.',
      en: 'Fixed empty state text alignment in Bug Reporting modal and removed redundant report button on Changelog page.',
      zh: '修复系统问题报告弹窗中空状态文本居中排版，并移除更新日志页面上的冗余提报按钮。'
    },
    sections: {
      fixed: [
        {
          id: 'Memperbaiki tata letak teks informasi "Tidak Ada Kendala yang Sedang Berjalan" pada modal Bug Reporting agar simetris di tengah (center-aligned) dan tidak tampak miring / berat sebelah akibat konflik style margin.',
          en: 'Fixed text alignment in the "No Ongoing Issues Right Now" empty state within Bug Reporting modal, ensuring proper horizontal centering.',
          zh: '修复 Bug Reporting 弹窗中“当前暂无进行中的处理项目”提示文案因样式冲突导致的排版偏斜与不对齐问题，恢复标准对称居中。'
        },
        {
          id: 'Menstandarkan tipografi label formulir pelaporan menjadi sans-serif modern yang rapi dan serasi dengan antarmuka sistem sekolah.',
          en: 'Standardized report form input labels to modern sans-serif typography consistent with the school admin design system.',
          zh: '将报告表单的输入项标签规范为现代无衬线字体，与学校管理系统整体视觉风格保持一致。'
        }
      ],
      removed: [
        {
          id: 'Menghapus tombol pelaporan bug "+ Report Bug / Request Feature" pada header halaman /data/feedback karena fungsi pelaporan sudah terpusat dan dapat diakses dari tombol Bug Reporting di navbar atas.',
          en: 'Removed the redundant "+ Report Bug / Request Feature" button from /data/feedback header as reporting is globally accessible from the top navbar.',
          zh: '移除 /data/feedback 页面顶部的“+ 报告问题/功能建议”冗余按钮，因顶部导航栏已全局提供该入口。'
        }
      ]
    }
  },
  {
    version: '0.5.6',
    date: '2026-11-06',
    isLatest: false,
    summary: {
      id: 'Perombakan alur Bug Reporting menjadi hub transparansi perbaikan ongoing dan perapian label formulir.',
      en: 'Overhauled Bug Reporting modal into an ongoing development transparency hub and cleaned form labels.',
      zh: '重构系统故障与反馈弹窗为进行中项目透明流看板，并优化表单标签。'
    },
    sections: {
      added: [
        {
          id: 'Tampilan awal modal Bug Reporting kini menyajikan 2 kartu aksi terpisah (Laporkan Bug dan Usulkan Fitur) beserta daftar perbaikan/project yang sedang berjalan (Ongoing Development) agar staf dapat langsung melihat transparansi pengerjaan sebelum melaporkan kendala.',
          en: 'The Bug Reporting modal now opens to 2 quick action cards (Report Bug & Propose Feature) followed by a live stream of active fixes and ongoing development, giving staff immediate visibility into developer progress.',
          zh: 'Bug Reporting 弹窗首页现提供两个独立快捷操作卡片（报告错误与提出建议），并实时展示进行中的修复与开发项目流，方便教职工在提交前快速了解系统维护动态。'
        }
      ],
      changed: [
        {
          id: 'Membuka modal pelaporan tidak lagi langsung menampilkan formulir panjang, melainkan masuk ke tampilan overview dan hanya berpindah ke formulir setelah memilih jenis laporan.',
          en: 'Opening the reporting modal now defaults to the transparent overview hub instead of dumping a long input form upfront.',
          zh: '打开报告弹窗时不再直接呈现冗长表单，而是优先展示透明看板，点击对应操作卡片后再进入专用表单。'
        }
      ],
      fixed: [
        {
          id: 'Memperbaiki duplikasi tanda bintang wajib (* *) pada judul dan label kolom formulir di modal pelaporan.',
          en: 'Resolved duplicated required asterisks (* *) on report form input labels.',
          zh: '修复报告表单标题与字段标签中重复出现星号必填标记（* *）的问题。'
        }
      ]
    }
  },
  {
    version: '0.5.5',
    date: '2026-11-06',
    isLatest: false,
    summary: {
      id: 'Penyelarasan bahasa pesan notifikasi bot Google Chat ke bahasa Inggris.',
      en: 'Standardized automated Google Chat bot notifications to English.',
      zh: '将 Google Chat 机器人的系统工单自动通知文案统一规范为英文。'
    },
    sections: {
      changed: [
        {
          id: 'Format notifikasi bot Google Chat untuk laporan baru (New Ticket Submitted) dan pembaruan status tiket (Support Ticket Status Update) kini sepenuhnya menggunakan bahasa Inggris standar.',
          en: 'Google Chat bot alert templates for incoming reports (New Ticket Submitted) and status updates (Support Ticket Status Update) are now fully formatted in standard English.',
          zh: 'Google Chat 机器人推送的新工单提醒（New Ticket Submitted）与状态更新通知（Support Ticket Status Update）现已完全切换为标准英文。'
        }
      ]
    }
  },
  {
    version: '0.5.4',
    date: '2026-11-06',
    isLatest: false,
    summary: {
      id: 'Perbaikan kendala upload screenshot error pada formulir Bug Reporting.',
      en: 'Fixed screenshot upload error in the Bug Reporting modal form.',
      zh: '修复 Bug Reporting 弹窗中截图上传失败的问题。'
    },
    sections: {
      fixed: [
        {
          id: 'Penyelarasan properti URL respon (publicUrl & url) antara endpoint /api/system-feedback/upload dan modal Bug Reporting sehingga file screenshot berhasil disimpan ke Supabase Storage (bucket attachments) dan preview langsung muncul.',
          en: 'Aligned response URL properties (publicUrl & url) between /api/system-feedback/upload and Bug Reporting modal, resolving upload failures and ensuring live previews.',
          zh: '统一 /api/system-feedback/upload 接口与弹窗组件间的文件访问链接字段（publicUrl 与 url），彻底解决截图上传报错并恢复实时缩略图预览。'
        },
        {
          id: 'Peningkatan validasi tipe file gambar agar mendukung format screenshot dari clipboard browser dan snip tool dengan ekstensi PNG, JPG, WEBP, dan GIF.',
          en: 'Enhanced image file validation to robustly support clipboard and snip tool screenshots with PNG, JPG, WEBP, and GIF extensions.',
          zh: '增强图片类型校验机制，完美兼容剪贴板截图及截图工具生成的 PNG、JPG、WEBP 和 GIF 格式图片。'
        }
      ]
    }
  },
  {
    version: '0.5.3',
    date: '2026-11-06',
    isLatest: false,
    summary: {
      id: 'Perbaikan lokalisasi pesan rilis tidak ditemukan (empty search state) pada halaman Changelog.',
      en: 'Fixed localization for empty release notes search results on the Changelog page.',
      zh: '修复更新日志页面在未搜索到匹配版本时的多语言提示文案。'
    },
    sections: {
      fixed: [
        {
          id: 'Pesan "Tidak Ada Catatan Rilis yang Cocok" dan deskripsi panduan pencarian pada halaman Changelog kini sepenuhnya reaktif mengikuti bahasa aktif yang dipilih pengguna (Indonesia, English, 中文).',
          en: 'The "No Matching Release Notes" message and search guidance description on the Changelog page are now fully reactive to the selected language (ID, EN, ZH).',
          zh: '更新日志页面上的“未找到匹配的更新日志”标题与搜索指引文案现已全面支持多语言自适应切换。'
        }
      ]
    }
  },
  {
    version: '0.5.2',
    date: '2026-11-06',
    isLatest: false,
    summary: {
      id: 'Penyelarasan penuh lokalisasi multibahasa (i18n) pada modal Bug Reporting, Customer Support Desk, dan panel admin tiket.',
      en: 'Complete multilingual localization (i18n) harmonization across Bug Reporting modal, Support Desk, and admin ticket panels.',
      zh: '全面完善 Bug Reporting 弹窗、客户服务台及管理员工单面板的多语言国际化（i18n）支持。'
    },
    sections: {
      fixed: [
        {
          id: 'Perbaikan teks tombol "Semua Laporan Staf (Admin)" dan "Tiket Saya" agar berubah secara reaktif mengikuti bahasa aktif yang dipilih pengguna (Indonesia, English, 中文).',
          en: 'Fixed "All Staff Reports (Admin)" and "My Tickets" tab buttons to reactively adapt to the user selected language (ID, EN, ZH).',
          zh: '修复“全部员工报告（管理员）”与“我的工单”按钮文字，使其随用户选择的系统语言（印尼语、英语、中文）自适应切换。'
        },
        {
          id: 'Lokalisasi penuh pesan panduan siklus hidup tiket (lifecycle guidance) dan opsi status pada seluruh dropdown filter dan editor admin.',
          en: 'Full localization for ticket lifecycle guidance messages and status options across all filter dropdowns and admin editor dialogs.',
          zh: '全面本地化所有工单流转指引文案、状态筛选下拉菜单以及管理员编辑弹窗中的选项文字。'
        }
      ]
    }
  },
  {
    version: '0.5.1',
    date: '2026-11-06',
    isLatest: false,
    summary: {
      id: 'Konsolidasi Customer Support Desk "Tiket Saya" langsung ke dalam modal Bug Reporting global dan pembersihan halaman Changelog.',
      en: 'Consolidated Support Desk "My Tickets" directly into the global Bug Reporting modal and streamlined the Changelog page.',
      zh: '将客户服务台“我的工单”直接集成至全局 Bug Reporting 弹窗中，并彻底精简更新日志页面。'
    },
    sections: {
      added: [
        {
          id: 'Tab terintegrasi "Tiket Saya" di dalam modal Bug Reporting yang dapat diakses langsung dari navbar atas di halaman mana pun tanpa perlu berpindah layar.',
          en: 'Integrated "My Tickets" tab inside the Bug Reporting modal, accessible instantly from top navbar across all pages without navigation.',
          zh: 'Bug Reporting 弹窗内集成“我的工单”标签页，可在任意页面直接从顶部导航栏打开并查看工单进度，无需跳转页面。'
        },
        {
          id: 'Panel pengelolaan status tiket langsung di dalam modal untuk administrator dengan dispatch notifikasi bot Google Chat ke staf pelapor.',
          en: 'In-modal ticket status management for administrators with automated Google Chat bot dispatch to reporters.',
          zh: '弹窗内置管理员专属工单状态更新面板，变更状态时即时向提交人发送 Google Chat 机器人私聊通知。'
        }
      ],
      changed: [
        {
          id: 'Halaman /data/feedback kini 100% didedikasikan murni untuk Changelog rilis sistem dengan filter kategori Added, Changed, Fixed dan pencarian.',
          en: 'The /data/feedback page is now 100% dedicated to system Changelog feeds with Added, Changed, Fixed filters and search.',
          zh: '页面 /data/feedback 现已 100% 专用于系统更新日志展示，配备 Added、Changed、Fixed 过滤与快速检索功能。'
        },
        {
          id: 'Pembersihan riwayat versi lama (0.1.0 - 0.3.0) pada changelog agar fokus pada rilis aktif sistem saat ini.',
          en: 'Pruned legacy release history (0.1.0 - 0.3.0) to focus strictly on active system releases.',
          zh: '精简早期历史版本（0.1.0 - 0.3.0），使更新日志专注呈现当前活跃版本。'
        }
      ],
      fixed: [
        {
          id: 'Eliminasi redundansi alur pengguna: Staf tidak lagi harus berpindah-pindah halaman untuk memantau tanggapan pengembang atas laporan kendala.',
          en: 'Eliminated user navigation friction: Staff no longer need to switch pages to check developer responses on reported issues.',
          zh: '消除页面跳转摩擦：教职工无需切换页面即可实时追踪开发人员对所报问题的处理答复。'
        }
      ]
    }
  },
  {
    version: '0.5.0',
    date: '2026-11-06',
    isLatest: false,
    summary: {
      id: 'Pembaruan sistem pelaporan kendala menjadi Changelog publik berbasis standar Keep a Changelog 1.1.0, Customer Support Desk, dan tombol cepat Bug Reporting di navbar.',
      en: 'Refactored system feedback into public Changelog (Keep a Changelog 1.1.0), Customer Support Desk, and quick navbar Bug Reporting.',
      zh: '根据 Keep a Changelog 1.1.0 标准将反馈系统重构为公开更新日志、客户服务台以及顶部导航栏 Bug Reporting 快捷通道。'
    },
    sections: {
      added: [
        {
          id: 'Akses cepat tombol Bug Reporting di navbar atas yang dapat membuka modal pelaporan kendala secara instan dari seluruh halaman aplikasi.',
          en: 'Quick access Bug Reporting button in the top navbar that opens the issue reporting modal instantly from any screen.',
          zh: '顶部导航栏新增“Bug Reporting”（问题反馈）快捷按钮，可从系统任意页面即时调起问题报告弹窗。'
        },
        {
          id: 'Halaman Changelog publik terstruktur dengan kategori Added, Changed, dan Fixed.',
          en: 'Public structured Changelog feed with Added, Changed, and Fixed categories.',
          zh: '遵循 Added、Changed、Fixed 分类的公开更新日志界面。'
        },
        {
          id: 'Dukungan penuh Multilingual (Bahasa Indonesia, English, 中文) terintegrasi secara reaktif.',
          en: 'Full reactive multilingual support (Indonesian, English, Chinese).',
          zh: '全面支持响应式多语言（印尼语、英语、中文）。'
        },
        {
          id: 'Formulir pelaporan kendala dan usulan fitur cepat via dialog modal dengan upload screenshot dan notifikasi bot Google Chat.',
          en: 'Quick bug report & feature request modal dialog with direct screenshot upload and Google Chat bot alerts.',
          zh: '快速错误报告与新功能建议弹窗，支持直接截图上传与 Google Chat 机器人即时提醒。'
        },
        {
          id: 'Fitur upload screenshot error langsung ke Supabase Storage (bucket attachments) dengan preview gambar dan drag-and-drop.',
          en: 'Direct error screenshot upload to Supabase Storage (attachments bucket) with live preview and drag-and-drop.',
          zh: '直接将错误截图上传至 Supabase Storage（attachments 存储桶），支持实时预览与拖拽上传。'
        },
        {
          id: 'Integrasi notifikasi bot Google Chat otomatis ke pelapor tiket saat status diperbarui dan alert laporan baru ke daftar penerima admin (PIC).',
          en: 'Automated Google Chat bot notifications to ticket reporters upon status updates and new ticket alerts to configured admin recipients.',
          zh: '工单状态更新时通过 Google Chat 机器人自动私聊通知提交人，并在收到新工单时向已配置的管理员接收人发送即时提醒。'
        },
        {
          id: 'Panel pengaturan penerima notifikasi laporan masuk (Admin Only) dengan opsi aktivasi dan penghapusan dinamis.',
          en: 'Configurable notification recipients panel (Admin Only) with dynamic toggle and assignment options.',
          zh: '新工单通知接收人配置面板（仅管理员），支持动态添加、开关及删除通知接收人。'
        }
      ],
      changed: [
        {
          id: 'Penghapusan menyeluruh fitur thumbs up / voting dan pembersihan skema database dari tabel serta kolom yang tidak lagi dibutuhkan.',
          en: 'Completely removed thumbs up / voting system and cleaned up database schema from obsolete tables and columns.',
          zh: '彻底移除点赞/投票功能，清理数据库中不再使用的数据表与字段。'
        },
        {
          id: 'Menu sidebar kini dinamakan Changelog dan dikhususkan untuk menampilkan riwayat perubahan program dari waktu ke waktu.',
          en: 'Sidebar menu rebranded to Changelog dedicated to presenting historical program releases and updates over time.',
          zh: '侧边栏菜单更名为 Changelog（更新日志），专注于展示系统随时间推移的各项版本迭代与更新记录。'
        },
        {
          id: 'Pengetatan izin tombol pengaturan notifikasi bot agar secara eksklusif hanya tampil bagi user dengan flag is_admin: true di database.',
          en: 'Strict permission check for bot notification recipient settings button, appearing exclusively for users with role is_admin: true.',
          zh: '严格限制机器人通知设置按钮的显示权限，仅在数据库中标记为 is_admin: true 的超级管理员账户可见。'
        },
        {
          id: 'Tata letak halaman diubah menjadi edge-to-edge full width seperti pada modul PYP.',
          en: 'Page container transformed into edge-to-edge full-width layout matching PYP modules.',
          zh: '页面容器采用类似 PYP 模块的全面屏全宽边缘贴合排版。'
        }
      ],
      fixed: [
        {
          id: 'Perbaikan teks label dan judul pada modal Bug Reporting agar selalu memuat terjemahan yang tepat tanpa menampilkan kunci mentah (raw i18n keys).',
          en: 'Fixed label and title translations in Bug Reporting modal ensuring clean localized text without exposing raw i18n keys.',
          zh: '修复 Bug Reporting 弹窗中的文案与标题翻译，确保完整本地化展示且不暴露原始翻译键。'
        },
        {
          id: 'Perbaikan tata letak tombol Tambah Penerima di modal pengaturan notifikasi agar tidak terpotong atau melebihi batas kontainer pada teks nama staf yang panjang.',
          en: 'Fixed layout of Add Recipient button in notification modal preventing it from being pushed off-screen by long staff names.',
          zh: '修复通知接收人弹窗中“添加接收人”按钮在教职工名称过长时被挤出屏幕边缘的问题。'
        }
      ]
    }
  },
  {
    version: '0.4.0',
    date: '2026-11-04',
    isLatest: false,
    summary: {
      id: 'Penambahan kurikulum PYP strand assessment matrices dan perbaikan batas paginasi data PostgREST.',
      en: 'Added PYP strand assessment matrices and PostgREST chunked pagination fixes.',
      zh: '新增 PYP 细分评估矩阵并解决 PostgREST 分页限制。'
    },
    sections: {
      added: [
        {
          id: 'Modul matriks penilaian PYP Subject Strands & Approaches to Learning (ATL) dengan ekspor PDF rekap per kelas.',
          en: 'PYP Subject Strands & Approaches to Learning (ATL) assessment matrix with class PDF export.',
          zh: 'PYP 学科细分与学习方法（ATL）评估矩阵，支持导出班级 PDF 报告。'
        },
        {
          id: 'Generator PDF laporan perkembangan usia dini (Nursery Learning Progression & Developmental Milestones).',
          en: 'Nursery Learning Progression & Developmental Milestones PDF generator.',
          zh: '幼儿园早期成长与发育里程碑 PDF 评估报告生成器。'
        }
      ],
      changed: [
        {
          id: 'Menerapkan paginasi chunked range (1.000 baris) pada seluruh query riwayat absensi untuk mencegah pemotongan data otomatis oleh PostgREST.',
          en: 'Implemented chunked range pagination (1,000 rows) on attendance queries to prevent silent truncation.',
          zh: '对出勤历史查询强制执行 1000 行分块分页，防止 PostgREST 静默截断数据。'
        }
      ],
      fixed: [
        {
          id: 'Pencatatan waktu jam masuk dan keluar absensi staf kini diperhitungkan hingga presisi detik.',
          en: 'Staff check-in and check-out time calculations now accurately compute down to the second.',
          zh: '教职工上下班打卡时间计算精确到秒。'
        }
      ]
    }
  }
];
