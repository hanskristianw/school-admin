# Graph Report - school-admin  (2026-07-24)

## Corpus Check
- 324 files · ~430,337 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1557 nodes · 1592 edges · 302 communities (198 shown, 104 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `dae8d41b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Admission Management
- Package Dependencies & Config
- RLS & Migration Scripts
- Component Aliases & UI Library
- FPB Purchase Orders
- Attendance Excuses & Forms
- Transaction & Image Components
- Fee & Payment System
- Core Academic Concepts
- Attendance Notification API
- Attendance Form Page
- Uniform Purchase System
- React UI Components
- Teacher Dashboard & Permissions
- Attendance Leave Management
- Weekly Overview & Timetable
- Third-party Libraries
- Attendance Report API
- Student Ranking & IB Scores
- WhatsApp Messaging Lib
- Module 21
- Module 22
- Module 23
- Module 24
- Module 25
- Module 26
- Module 27
- Module 29
- Module 30
- Module 31
- Module 32
- Module 33
- Module 34
- Module 35
- Module 36
- Module 37
- Module 38
- Module 39
- Module 40
- Module 41
- Module 42
- Module 43
- Module 44
- Module 45
- Module 46
- Module 47
- Module 48
- Module 49
- Module 50
- Module 51
- Module 52
- Module 53
- Module 54
- Module 55
- Module 56
- Module 57
- Module 58
- Module 59
- Module 60
- Module 61
- Module 62
- Module 63
- Module 64
- Module 65
- Module 66
- Module 67
- Module 68
- Module 69
- Module 70
- Module 71
- Module 72
- Module 73
- Module 74
- Module 75
- Module 76
- Module 77
- Module 78
- Module 79
- Module 80
- Module 81
- Module 82
- Module 83
- Module 85
- Module 86
- Module 89
- Module 91
- Module 92
- Module 93
- Module 94
- Module 95
- Module 96
- Module 97
- Module 98
- Module 99
- Module 100
- Module 101
- Module 102
- Module 103
- Module 104
- Module 105
- Module 106
- Module 107
- Module 108
- Module 109
- Module 110
- Module 111
- Module 112
- Module 113
- Module 114
- Module 115
- Module 116
- Module 117
- Module 118
- Module 119
- Module 120
- Module 121
- Module 122
- Module 123
- Module 124
- Module 125
- Module 126
- Module 127
- Module 128
- Module 129
- Module 130
- Module 131
- Module 132
- Module 133
- Module 134
- Module 135
- Module 136
- Module 137
- Module 138
- Module 139
- Module 140
- Module 141
- Module 142
- Module 143
- Module 144
- Module 145
- Module 146
- Module 147
- Module 148
- Module 149
- Module 150
- Module 151
- Module 152
- Module 153
- Module 154
- Module 155
- Module 156
- Module 157
- Module 158
- Module 167
- Module 227
- Assessment Grading System Documentation
- Universal Uniform Size Schema Change
- Delete & Void Purchase Order Implementation
- IB MYP Criteria, Strands & Rubrics System Documentation
- Fitur Tanggal Pengambilan Seragam
- 📌 Changelog
- Sistem Penomoran PO Otomatis
- 🎯 **System Modules & Features**
- MYP Year Level Implementation
- DDL
- Database Migrations
- 5.1 Tables
- sendGoogleChatMessage
- 3.1 Tables
- 4.1 Tables
- School Admin System - Complete Documentation
- Protocol: Premium Utilitarian Minimalism UI Architect
- School Admin AI Guide
- 1.1 Tables
- 🎓 **IB MYP Assessment Grading System**
- 2.1 Tables
- 9.1 Tables
- Database Schema & Relationships
- 8.1 Tables
- 📋 **Common Issues & Solutions**
- 🔐 **Role-Based Access Control**
- 📊 **Database Queries Reference**
- 6.1 Tables
- 7.1 Tables
- **Key Components**
- 🚀 **Setup & Deployment**
- 🔧 **Technical Implementation**
- GlobalActionCards.jsx
- 📁 **Project Structure**
- route.js
- route.js
- browser-image-compression
- graphify
- graphify.md
- docx
- dotenv
- google-auth-library
- googleapis
- @googleapis/chat
- react-hook-form
- **3. Assessment System**
- class-variance-authority
- driver.js

## God Nodes (most connected - your core abstractions)
1. `🚀 Supabase Connection Fixed!` - 18 edges
2. `📌 Changelog` - 15 edges
3. `🎯 **System Modules & Features**` - 15 edges
4. `jspdf` - 14 edges
5. `Supplier-Based Stock Tracking System` - 14 edges
6. `Delete & Void Purchase Order Implementation` - 13 edges
7. `School Admin System - Complete Documentation` - 13 edges
8. `Sistem Penomoran PO Otomatis` - 13 edges
9. `generateAssessmentPDFFromWizard()` - 12 edges
10. `generateAssessmentPDFFromCard()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `PMB Documentation Skill` --related_to--> `School Admin System Documentation`  [INFERRED]
  src/Documentation PMB/SKILL.md → MAIN_DOCUMENTATION.md
- `AdmissionManagement()` --references--> `jspdf`  [EXTRACTED]
  src/app/data/admission/page.jsx → package.json
- `TopicPage()` --references--> `jspdf`  [EXTRACTED]
  src/app/data/topic/page.jsx → package.json
- `generateClassReportZIP()` --references--> `jszip`  [EXTRACTED]
  src/app/data/topic-new/lib/pdfGenerators.js → package.json
- `testTrigger()` --calls--> `sendGoogleChatMessage()`  [EXTRACTED]
  scratch/testDutyNotificationTrigger.js → src/lib/googleChat.js

## Import Cycles
- None detected.

## Communities (302 total, 104 thin omitted)

### Community 0 - "Admission Management"
Cohesion: 0.13
Nodes (31): jspdf, jspdf, AdmissionManagement(), statusConfig, FeeSimulationPage(), formatCurrency(), formatDateID(), monthNames (+23 more)

### Community 1 - "Package Dependencies & Config"
Cohesion: 0.09
Nodes (21): baseline-browser-mapping, eslint, eslint-config-next, devDependencies, baseline-browser-mapping, eslint, eslint-config-next, tailwindcss (+13 more)

### Community 2 - "RLS & Migration Scripts"
Cohesion: 0.12
Nodes (18): public.absen, public.attendance_scan_log, public.attendance_session, public.consultation, public.daftar_door_greeter, public.detail_kelas, public.detail_siswa, public.kelas (+10 more)

### Community 3 - "Component Aliases & UI Library"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 4 - "FPB Purchase Orders"
Cohesion: 0.20
Nodes (15): buildPrintHtml(), CreateFpbModal(), EditFpbModal(), emptyItem(), fmt(), fmtDate(), fmtDatePrint(), fmtDt() (+7 more)

### Community 5 - "Attendance Excuses & Forms"
Cohesion: 0.18
Nodes (15): AttendanceExcusesPage(), CATEGORIES_LATE_LEAVE_EARLY_STATIC, CATEGORIES_NO_SCAN_STATIC, compressImage(), createImage(), dbToCategory(), ExcuseModal(), fmtMins() (+7 more)

### Community 6 - "Transaction & Image Components"
Cohesion: 0.28
Nodes (5): getCroppedImg(), ImageCropModal(), Button(), buttonVariants, Modal()

### Community 7 - "Fee & Payment System"
Cohesion: 0.24
Nodes (14): public.fee_discount, public.school_fee_definition, public.student_fee_payment, public.udp_definition, public.udp_installment_plan, public.v_active_discounts, public.v_active_fees_summary, public.v_school_fee_monthly (+6 more)

### Community 8 - "Core Academic Concepts"
Cohesion: 0.15
Nodes (15): Assessment Approval Workflow, Door Greeter Module, IB MYP Grading System, QR Attendance System, Room Booking Module, Timetable Module, Weekly Overview, Internationalization (i18n) (+7 more)

### Community 9 - "Attendance Notification API"
Cohesion: 0.23
Nodes (15): _emailSecondStart, formatDateEN(), GET(), getDayNumber(), getYesterdayWIB(), handleNotify(), POST(), resolveIsCheckIn() (+7 more)

### Community 10 - "Attendance Form Page"
Cohesion: 0.22
Nodes (13): AttendanceFormPage(), CATEGORIES_LATE_LEAVE_EARLY_STATIC, CATEGORIES_NO_SCAN_STATIC, compressImage(), createImage(), dbToCategory(), ExcuseModal(), fmtMins() (+5 more)

### Community 11 - "Uniform Purchase System"
Cohesion: 0.37
Nodes (13): public.uniform, public.uniform_purchase, public.uniform_purchase_item, public.uniform_purchase_receipt, public.uniform_purchase_receipt_item, public.uniform_sale, public.uniform_sale_item, public.uniform_size (+5 more)

### Community 12 - "React UI Components"
Cohesion: 0.24
Nodes (10): react, react, FormControl(), FormDescription(), FormFieldContext, FormItem(), FormItemContext, FormLabel() (+2 more)

### Community 13 - "Teacher Dashboard & Permissions"
Cohesion: 0.22
Nodes (4): getPathIcon(), PATH_ICONS, TeacherDashboard(), isAdmin()

### Community 14 - "Attendance Leave Management"
Cohesion: 0.27
Nodes (6): ALL_ISSUE_TYPES, EMPTY_TYPE_FORM, fullName(), LeaveTypeCard(), QuotaInlineForm(), TopicPrintPage()

### Community 15 - "Weekly Overview & Timetable"
Cohesion: 0.33
Nodes (8): DAY_ID, DAYS, extractHM(), formatWeekLabel(), getMonday(), parseRange(), toISO(), WeeklyOverviewPage()

### Community 16 - "Third-party Libraries"
Cohesion: 0.18
Nodes (11): clsx, @fortawesome/react-fontawesome, googleapis, dependencies, clsx, @fortawesome/react-fontawesome, googleapis, pngjs (+3 more)

### Community 17 - "Attendance Report API"
Cohesion: 0.38
Nodes (9): dateRange(), GET(), getDayNumber(), resolveIsCheckIn(), supabaseAdmin, timeToMinutes(), timeToSeconds(), wibDateStr() (+1 more)

### Community 19 - "WhatsApp Messaging Lib"
Cohesion: 0.25
Nodes (5): closingsGeneral, delay(), greetings, messageTemplates, sendWhatsApp()

### Community 21 - "Module 21"
Cohesion: 0.29
Nodes (3): Select, SelectItem, cn()

### Community 22 - "Module 22"
Cohesion: 0.22
Nodes (8): crons, functions, src/app/api/assessment-pdf/route.js, src/app/api/attendance/notify/route.js, src/app/api/duty/notify/route.js, maxDuration, maxDuration, maxDuration

### Community 23 - "Module 23"
Cohesion: 0.29
Nodes (5): public.admission_level, public.fee_discount, public.school_fee_definition, public.student_applications, public.udp_definition

### Community 24 - "Module 24"
Cohesion: 0.38
Nodes (5): AttendanceSettingsPage(), DAY_LABELS, diffDays(), formatDateRange(), NOTIF_TYPES

### Community 25 - "Module 25"
Cohesion: 0.43
Nodes (5): fmt(), fmtDate(), fmtDt(), FpbDetailPage(), STATUS_META

### Community 26 - "Module 26"
Cohesion: 0.62
Nodes (6): fmtDate(), fmtThousands(), onlyDigits(), presentIDR(), SchoolFeePage(), toNumber()

### Community 27 - "Module 27"
Cohesion: 0.48
Nodes (6): DAYS, extractHM(), fmtDate(), formatRangeForInsert(), parseRange(), TimetablePage()

### Community 30 - "Module 30"
Cohesion: 0.33
Nodes (5): absen, attendance_scan_log, _backup_absen, _backup_attendance_scan_log, _backup_attendance_session

### Community 31 - "Module 31"
Cohesion: 0.33
Nodes (5): absen, attendance_scan_log, _backup_attendance_session, _backup_session_absen, _backup_session_scan_logs

### Community 32 - "Module 32"
Cohesion: 0.53
Nodes (5): generate_application_number(), student_applications, trigger_generate_application_number, trigger_update_student_applications_timestamp, update_student_applications_timestamp()

### Community 35 - "Module 35"
Cohesion: 0.40
Nodes (3): AttendanceReportPage(), fmtMins(), STATUS_META

### Community 36 - "Module 36"
Cohesion: 0.47
Nodes (5): BANDS, CRITERIA, MYP_YEARS, SEMESTERS, SubjectGroupPage()

### Community 37 - "Module 37"
Cohesion: 0.40
Nodes (4): dictionaries, getByPath(), I18nContext, I18nProvider()

### Community 38 - "Module 38"
Cohesion: 0.33
Nodes (3): DARK, LIGHT, ThemeContext

### Community 39 - "Module 39"
Cohesion: 0.60
Nodes (4): public.school_fee_definition, public.udp_definition, public.udp_installment_plan, public.v_school_fee_monthly

### Community 41 - "Module 41"
Cohesion: 0.80
Nodes (4): buildHtml(), buildRepeatingHeaderTemplate(), escapeHtml(), POST()

### Community 42 - "Module 42"
Cohesion: 0.60
Nodes (4): ALLOWED_EXTS, ALLOWED_TYPES, POST(), supabaseAdmin

### Community 45 - "Module 45"
Cohesion: 0.50
Nodes (4): appliesToColor, appliesToLabel, DiscountMasterPage(), formatCurrency()

### Community 46 - "Module 46"
Cohesion: 0.50
Nodes (4): AttendanceApprovalsPage(), CATEGORY_LABEL, fmtMins(), TYPE_LABEL

### Community 47 - "Module 47"
Cohesion: 0.80
Nodes (4): AttendanceMachinePage(), resolveStatus(), statusInfo(), toMinutes()

### Community 48 - "Module 48"
Cohesion: 0.60
Nodes (4): CreateFpbPage(), emptyItem(), fmt(), TYPE_ICONS

### Community 50 - "Module 50"
Cohesion: 0.40
Nodes (3): geistMono, geistSans, metadata

### Community 51 - "Module 51"
Cohesion: 0.50
Nodes (3): UniformSalesPage(), FpbSettingsPage(), userName()

### Community 53 - "Module 53"
Cohesion: 0.83
Nodes (3): check_year_date_overlap(), public.year, trg_year_no_overlap

### Community 54 - "Module 54"
Cohesion: 0.67
Nodes (3): public.application_discount, trigger_app_discount_updated_at, update_app_discount_timestamp()

### Community 55 - "Module 55"
Cohesion: 0.67
Nodes (3): public.application_installment, trigger_app_installment_updated_at, update_app_installment_timestamp()

### Community 57 - "Module 57"
Cohesion: 0.67
Nodes (3): settings, settings_updated_at, update_updated_at_column()

### Community 58 - "Module 58"
Cohesion: 0.67
Nodes (3): criterion_descriptors, subject, subject_group

### Community 59 - "Module 59"
Cohesion: 0.67
Nodes (3): generate_topic_weeks(), topic_weekly_plan, trigger_generate_topic_weeks

### Community 60 - "Module 60"
Cohesion: 0.67
Nodes (3): absen, attendance_scan_log, attendance_session

### Community 61 - "Module 61"
Cohesion: 0.05
Nodes (39): 1. Get Fee untuk Level & Year tertentu, 1. `school_fee_definition`, 2. Get Installment Plan untuk UDP, 2. `udp_definition`, 3. Get Discounts Available untuk Unit & Year (termasuk diskon semua-tahun), 3. `udp_installment_plan`, 4. Calculate Total Payment dengan Discount, 4. `fee_discount` (+31 more)

### Community 62 - "Module 62"
Cohesion: 0.83
Nodes (3): buildHtml(), escapeHtml(), POST()

### Community 66 - "Module 66"
Cohesion: 0.83
Nodes (3): decodeCredential(), getUserInfoFromAccessToken(), POST()

### Community 68 - "Module 68"
Cohesion: 0.83
Nodes (3): buildEmailContent(), formatDate(), POST()

### Community 69 - "Module 69"
Cohesion: 0.67
Nodes (3): checkRateLimit(), POST(), rateLimitMap

### Community 71 - "Module 71"
Cohesion: 0.67
Nodes (3): DAY_NAMES, DutySchedulePage(), formatDateLabel()

### Community 72 - "Module 72"
Cohesion: 0.83
Nodes (3): EditFpbPage(), emptyItem(), fmt()

### Community 73 - "Module 73"
Cohesion: 0.83
Nodes (3): parseRange(), RoomBookingPage(), toLocalDateKey()

### Community 75 - "Module 75"
Cohesion: 0.83
Nodes (3): getCroppedBlob(), ImageCropUploader(), loadImage()

### Community 125 - "Module 125"
Cohesion: 0.53
Nodes (5): GET(), getWibDateTime(), handleDutyNotification(), POST(), supabaseAdmin

### Community 137 - "Module 137"
Cohesion: 0.06
Nodes (34): 1. Tab "Receive" (Terima Barang), 2. Modal: Tambah Item Baru, 2. Tab "History" (Riwayat Transaksi Selesai), 3. Step 2 - Item Yang Dipesan, After Migration, After (New Schema), Before Migration, Before (Old Schema) (+26 more)

### Community 146 - "Module 146"
Cohesion: 0.06
Nodes (33): 1. Bulk Import, 1. `criteria`, 1. Data Entry, 1. Looping Through Strands, 2. Copy from Previous Year, 2. Curriculum Alignment, 2. Rubric Lookup Logic, 2. `strands` (+25 more)

### Community 150 - "Module 150"
Cohesion: 0.06
Nodes (33): 1. Purchase Receipt - Auto Track Supplier (/stock/uniform/add), 1. Stock Available per Item per Supplier, 1. uniform_stock_txn - Tambah kolom supplier_id, 2. Index untuk Performance, 2. Initial Stock Input (/stock/uniform/initial), 2. Stock Movement by Supplier, 3. Stock Out - Manual Supplier Selection (/sales/uniform/stock-out), 3. Total Stock per Supplier (All Items) (+25 more)

### Community 158 - "Module 158"
Cohesion: 0.06
Nodes (31): 1. Restart Development Server, 2. Test Connection, 3. Test Login, 4. ✅ Verifikasi Setup, 5. 🧪 Test Connection, 🧩 Additional Migrations, 🤖 AI (Gemini) Setup, ✨ AI Help in Unit Title (Topic) (+23 more)

### Community 250 - "Assessment Grading System Documentation"
Cohesion: 0.07
Nodes (29): 1. Assessment Card Button, 1. `assessment_grades` (Header/Summary), 1. Prerequisites, 2. `assessment_grade_strands` (Detail per Strand), 2. Grading Modal Layout, 2. User Flow, 3. Calculation Rules, 3. Visual Indicators (+21 more)

### Community 251 - "Universal Uniform Size Schema Change"
Cohesion: 0.07
Nodes (29): 1. `/data/uniform-size` Page, 2. `/stock/uniform/add` (Purchase Order), 3. Other Affected Pages, After Migration, Backward Compatibility, Before Migration, Best Practices, Breaking Changes (+21 more)

### Community 252 - "Delete & Void Purchase Order Implementation"
Cohesion: 0.07
Nodes (27): 1. State Management, 2. Delete Draft Function, 3. Void Posted Function, 4. Void Reason Modal, Business Rules, Cleanup Script: `cleanup-voided-purchase-stock.sql`, Database Changes, Delete (Draft Orders) (+19 more)

### Community 253 - "IB MYP Criteria, Strands & Rubrics System Documentation"
Cohesion: 0.08
Nodes (23): 1. `criteria` Table, 2. `strands` Table, 3. `rubrics` Table, Common Mistakes to Avoid, Data Flow in Assessment PDF Generation, Database Queries for Reference, Database Schema, Full criteria tree for a subject (+15 more)

### Community 254 - "Fitur Tanggal Pengambilan Seragam"
Cohesion: 0.09
Nodes (22): 1. Tab History - Tampilan Pickup Date, 2. Button "Tandai Diambil", 3. Modal Pickup Date, 4. Tab Laporan Penjualan, 5. Excel Export, Badge Display (History Tab), Benefits, Button Tandai Diambil (+14 more)

### Community 255 - "📌 Changelog"
Cohesion: 0.09
Nodes (22): 2025-08-13, 2025-08-17, 2025-08-17 (Subsequent Updates), 2025-08-20, 2025-08-21, 2025-08-22, 2025-08-23, 2025-08-30 (+14 more)

### Community 256 - "Sistem Penomoran PO Otomatis"
Cohesion: 0.10
Nodes (19): Database Schema, Features, Format Examples, Frontend Implementation, Function: `generatePONumber()`, Future Enhancements, Integration Points, Manual Reset Procedure (+11 more)

### Community 257 - "🎯 **System Modules & Features**"
Cohesion: 0.12
Nodes (17): **10. Data Mapping Note**, **11. Attendance (QR Sessions & Scans)**, **12. Student Consultation (BK)**, **13. Room Booking Module**, **14. Uniform Sales Module (NEW)**, **1. Authentication & User Management**, **2. Academic Data Management**, **3. Assessment System** (+9 more)

### Community 258 - "MYP Year Level Implementation"
Cohesion: 0.13
Nodes (14): 1. Assessment Form (topic-new/page.jsx), 2. Assessment Grading (handleOpenGrading), 3. Fetch Strands, Benefits, Code Changes, Creating Assessment, Database Changes, Input Nilai (+6 more)

### Community 259 - "DDL"
Cohesion: 0.13
Nodes (14): admission_level, application_discount, Daftar Tabel, DDL, Dokumentasi Schema PMB (Penerimaan Murid Baru), fee_discount, Halaman Terkait, Migration SQL (+6 more)

### Community 260 - "Database Migrations"
Cohesion: 0.14
Nodes (13): Active/Current Migrations, Core Attendance System, Database Migrations, 🚀 How to Run Migrations, ⚠️ Important Notes, 📋 Migration Checklist, Other Systems (Unrelated to Attendance), 🔄 Recent Changes (October 2025) (+5 more)

### Community 261 - "5.1 Tables"
Cohesion: 0.17
Nodes (12): 5.1 Tables, `attendance_excuses`, `attendance_notification_log`, `attendance_notify_run_log`, `attendances`, `leave_quotas`, `leave_types`, `role_approvers` (+4 more)

### Community 262 - "sendGoogleChatMessage"
Cohesion: 0.26
Nodes (10): supabaseAdmin, testTrigger(), getCredentials(), getPrivateKey(), getUserIdByEmail(), sendGoogleChatMessage(), run(), run() (+2 more)

### Community 263 - "3.1 Tables"
Cohesion: 0.20
Nodes (10): 3.1 Tables, 3.2 ERD / Relationships (Curriculum Domain), 3. Curriculum & Topics Domain (`/data/topic-new`, `/data/subject`, `/data/subject-group`), `criteria`, `criterion_descriptors`, `rubrics`, `strands`, `subject` (+2 more)

### Community 264 - "4.1 Tables"
Cohesion: 0.20
Nodes (10): 4.1 Tables, `fpb`, `fpb_approval_steps`, `fpb_approvals`, `fpb_budget_roles`, `fpb_items`, `fpb_revisions`, `fpb_role_approvers` (+2 more)

### Community 265 - "School Admin System - Complete Documentation"
Cohesion: 0.20
Nodes (9): Attendance (QR) Tables, **Completed Features:**, **Core Tables:**, �🏗️ **Database Structure**, Grades (Nilai) Table, **Key Business Rules:**, 📝 Recent Changes (Aug 2025), School Admin System - Complete Documentation (+1 more)

### Community 266 - "Protocol: Premium Utilitarian Minimalism UI Architect"
Cohesion: 0.20
Nodes (9): 1. Protocol Overview, 2. Absolute Negative Constraints (Banned Elements), 3. Typographic Architecture, 4. Color Palette (Warm Monochrome + Spot Pastels), 5. Component Specifications, 6. Iconography & Imagery Directives, 7. Subtle Motion & Micro-Animations, 8. Execution Protocol (+1 more)

### Community 267 - "School Admin AI Guide"
Cohesion: 0.25
Nodes (7): API & Server Routes, Architecture, Data & Business Rules, Development Workflow, Frontend Patterns, School Admin AI Guide, Tips for New Changes

### Community 268 - "1.1 Tables"
Cohesion: 0.22
Nodes (9): 1.1 Tables, 1.2 ERD / Relationships (User & Unit Domain), 1.3 Tables referencing `users`, 1. User, Role & Unit Management Domain (`/data/user`, `/data/role_management`, `/settings/unit`), `dashboard_type`, `report_settings`, `role`, `unit` (+1 more)

### Community 269 - "🎓 **IB MYP Assessment Grading System**"
Cohesion: 0.25
Nodes (8): **Assessment Cards** (`/data/topic-new`), **Database Migrations**, **Grading Modal**, **Grading Workflow**, 🎓 **IB MYP Assessment Grading System**, **Overview**, **Removed Features**, **UI Features**

### Community 270 - "2.1 Tables"
Cohesion: 0.29
Nodes (7): 2.1 Tables, 2.2 ERD / Relationships (Class Domain), 2. Academic & Class Management Domain (`/data/class`), `detail_kelas`, `detail_siswa`, `kelas`, `year`

### Community 271 - "9.1 Tables"
Cohesion: 0.29
Nodes (7): 9.1 Tables, 9.2 ERD / Relationships (Timetable & Schedule Domain), 9. Timetable & Schedule Management Domain (`/data/timetable`, `/data/weekly-overview`), `timetable`, `timetable_exception`, `topic_weekly_plan`, `weekly_overview_draft`

### Community 272 - "Database Schema & Relationships"
Cohesion: 0.33
Nodes (5): 4.2 ERD / Relationships (Purchasing Domain), 4. Purchasing & Budgeting Domain (/data/fpb), 5.2 ERD / Relationships (Attendance Domain), 5. Attendance & Leave Management Domain (`/data/attendance-settings`, `/data/attendance-leave`, `/data/attendance-form`), Database Schema & Relationships

### Community 273 - "8.1 Tables"
Cohesion: 0.33
Nodes (6): 8.1 Tables, 8.2 ERD / Relationships (Room Booking), 8. Room & Booking Management Domain (`/data/room`, `/room/booking`), `room`, `room_blocks`, `room_booking`

### Community 274 - "📋 **Common Issues & Solutions**"
Cohesion: 0.33
Nodes (6): **1. Icons Not Showing:**, **2. Teacher Filter Not Working:**, **3. Assessment Date Validation:**, **4. Menu Permissions:**, **5. RLS write blocked on subject-class mapping (detail_kelas)**, 📋 **Common Issues & Solutions**

### Community 275 - "🔐 **Role-Based Access Control**"
Cohesion: 0.33
Nodes (6): Access flow (guards), **Admin (`is_admin = true`):**, 🔐 **Role-Based Access Control**, **Staff (default):**, **Student (`is_student = true`):**, **Teacher (`is_teacher = true`):**

### Community 276 - "📊 **Database Queries Reference**"
Cohesion: 0.33
Nodes (6): **Assessment Calendar (View + RPC)**, **Assessment with Relations:**, 📊 **Database Queries Reference**, **Get Teachers Only:**, **Subject with Teacher & Unit:**, **Topics (Units) Queries:**

### Community 277 - "6.1 Tables"
Cohesion: 0.40
Nodes (5): 6.1 Tables, 6.2 ERD / Relationships (Assessment & Grading), 6. Assessment & Grading Domain (`/data/topic-new` / Reports), `assessment_grade_strands`, `assessment_grades`

### Community 278 - "7.1 Tables"
Cohesion: 0.40
Nodes (5): 7.1 Tables, 7.2 ERD / Relationships (Menu Domain), 7. Menu & Role Permissions Domain (`/data/menu_management`), `menu_permissions`, `menus`

### Community 279 - "**Key Components**"
Cohesion: 0.40
Nodes (5): **1. MYP Year Level Selection**, **2. Criterion Grades (A, B, C, D)**, **3. Strand Grades**, **4. Final Grade (1-7)**, **Key Components**

### Community 281 - "🔧 **Technical Implementation**"
Cohesion: 0.50
Nodes (4): **Backend & Database:**, **Frontend Stack:**, **Key Technical Notes:**, 🔧 **Technical Implementation**

### Community 282 - "GlobalActionCards.jsx"
Cohesion: 0.48
Nodes (6): DAY_NAMES, formatDutyDateLabel(), GlobalActionCards(), monthEnd(), monthStart(), resolveUserDuties()

### Community 283 - "📁 **Project Structure**"
Cohesion: 0.67
Nodes (3): **Important Files:**, **Key Directories:**, 📁 **Project Structure**

### Community 285 - "route.js"
Cohesion: 0.67
Nodes (5): buildWeeklyOverviewDocx(), compositeStampAndSignature(), fitAspect(), getImageDimensions(), POST()

### Community 289 - "docx"
Cohesion: 0.40
Nodes (5): 10.1 Tables, 10.2 ERD / Relationships (Duty & Devotion Schedule Domain), 10. Duty, Greeter & Devotion Schedule Domain (`/data/door_greeter`), `duty_schedules`, `duty_settings`

### Community 299 - "**3. Assessment System**"
Cohesion: 0.40
Nodes (5): **Additional Files:**, **Database Migration Files (Execute in Order):**, **Development:**, **Key Environment:**, 🚀 **Setup & Deployment**

## Knowledge Gaps
- **652 isolated node(s):** `extends`, `next/core-web-vitals`, `$schema`, `style`, `rsc` (+647 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **104 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Third-party Libraries` to `Module 128`, `Package Dependencies & Config`, `Module 129`, `Module 131`, `Module 130`, `Module 132`, `Module 133`, `Module 134`, `Module 135`, `Admission Management`, `Module 136`, `Module 138`, `Module 139`, `Module 140`, `Module 142`, `Module 143`, `Module 144`, `Module 145`, `React UI Components`, `Module 147`, `Module 148`, `Module 149`, `Module 151`, `🚀 **Setup & Deployment**`, `Module 152`, `Module 153`, `Module 154`, `Module 156`, `Module 155`, `browser-image-compression`, `dotenv`, `google-auth-library`, `googleapis`, `@googleapis/chat`, `react-hook-form`, `class-variance-authority`, `driver.js`, `Module 127`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `jspdf` connect `Admission Management` to `Third-party Libraries`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Why does `School Admin System - Complete Documentation` connect `School Admin System - Complete Documentation` to `🎯 **System Modules & Features**`, `**3. Assessment System**`, `🎓 **IB MYP Assessment Grading System**`, `📋 **Common Issues & Solutions**`, `🔐 **Role-Based Access Control**`, `📊 **Database Queries Reference**`, `🔧 **Technical Implementation**`, `📁 **Project Structure**`, `📌 Changelog`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **What connects `extends`, `next/core-web-vitals`, `$schema` to the rest of the system?**
  _652 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Admission Management` be split into smaller, more focused modules?**
  _Cohesion score 0.12685560053981107 - nodes in this community are weakly interconnected._
- **Should `Package Dependencies & Config` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `RLS & Migration Scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.12380952380952381 - nodes in this community are weakly interconnected._