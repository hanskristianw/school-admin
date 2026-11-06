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
    version: '0.5.7',
    date: '2026-11-06',
    isLatest: true,
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
