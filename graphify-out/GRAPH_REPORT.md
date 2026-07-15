# Graph Report - school-admin  (2026-07-15)

## Corpus Check
- 308 files · ~389,565 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1205 nodes · 1212 edges · 223 communities (144 shown, 79 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4ed59f6f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Admission & PDF Generation
- Project Config & ESLint
- UI Component Aliases
- FPB (Purchase Request) Page
- Attendance Excuses Management
- Transaction Modals & Image Crop
- Attendance Notification API
- React & Form UI
- IB MYP Grading & Assessment Schema
- Teacher Dashboard
- Attendance Leave Management
- Package Dependencies
- Attendance Report API
- Student Ranking Page
- WhatsApp Messaging Library
- School Policy & PMB Registration
- Select UI & Utilities
- FPB Detail Page
- School Fee Management
- Supabase Auth Library
- Vercel Deployment Config
- Uniform Purchase & Stock Management
- Attendance Excuses API
- Attendance Special Day Rules API
- Attendance Report Page
- Attendance Settings
- Subject Group & MYP Criteria Page
- Timetable Management
- i18n Internationalization
- Theme Light Dark Mode
- Admission Status Page
- Assessment PDF Generation API
- Attendance Excuses Upload API
- Leave Quotas API
- Admission Discounts
- Admission Fee Simulation
- Attendance Approvals
- Attendance Machine Integration
- FPB Create Page
- Health Report Page
- Next.js App Layout
- Uniform Sales and FPB Settings
- City Province Data Library
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 65
- Community 68
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 101
- Community 102
- Community 103
- Community 104
- Community 105
- Community 106
- Community 107
- Community 108
- Community 109
- Community 110
- Community 111
- Community 112
- Community 116
- Community 118
- Community 124
- Community 127
- Community 144
- Community 149
- Community 176
- Community 187
- Community 188
- Community 189
- Community 190
- Community 191
- Community 192
- Community 193
- Community 194
- Community 195
- Community 196
- Community 198
- Community 199
- Community 200
- Community 201
- 📌 Changelog
- Database Migrations
- 🎓 **IB MYP Assessment Grading System**
- Protocol: Premium Utilitarian Minimalism UI Architect
- School Admin System - Complete Documentation
- School Admin AI Guide
- 📋 **Common Issues & Solutions**
- 🔐 **Role-Based Access Control**
- 📊 **Database Queries Reference**
- 🚀 **Setup & Deployment**
- �🏗️ **Database Structure**
- 🔧 **Technical Implementation**
- compilerOptions
- graphify.md
- graphify.md
- docx
- @fortawesome/fontawesome-svg-core
- tailwind-merge

## God Nodes (most connected - your core abstractions)
1. `🚀 Supabase Connection Fixed!` - 18 edges
2. `Supplier-Based Stock Tracking System` - 16 edges
3. `🎯 **System Modules & Features**` - 15 edges
4. `jspdf` - 14 edges
5. `📌 Changelog` - 14 edges
6. `Delete & Void Purchase Order Implementation` - 13 edges
7. `School Admin System - Complete Documentation` - 13 edges
8. `Sistem Penomoran PO Otomatis` - 13 edges
9. `generateAssessmentPDFFromWizard()` - 12 edges
10. `generateAssessmentPDFFromCard()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `Holistic and Inclusive Admissions Process` --semantically_similar_to--> `student_applications`  [INFERRED] [semantically similar]
  migrations/Admission Policy.docx.txt → src/Documentation PMB/REGISTRASI.md
- `Assessment Grades Table Schema` --semantically_similar_to--> `Assessment Grades (Criterion A-D, 0-8 scale)`  [INFERRED] [semantically similar]
  ASSESSMENT Table.md → GRADING_SYSTEM_DOCUMENTATION.md
- `Assessment Grades (Criterion A-D, 0-8 scale)` --semantically_similar_to--> `IB MYP Rubrics System`  [INFERRED] [semantically similar]
  GRADING_SYSTEM_DOCUMENTATION.md → RUBRICS_SYSTEM_DOCUMENTATION.md
- `AdmissionManagement()` --references--> `jspdf`  [EXTRACTED]
  src/app/data/admission/page.jsx → package.json
- `TopicPage()` --references--> `jspdf`  [EXTRACTED]
  src/app/data/topic/page.jsx → package.json

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **IB MYP Grading Pipeline** — criteria_strands_rubrics_documentation_ib_myp_criteria, criteria_strands_rubrics_documentation_strands_table, criteria_strands_rubrics_documentation_rubrics_table, grading_system_documentation_assessment_grades, myp_year_implementation_assessment_myp_year [EXTRACTED 0.95]
- **Uniform Purchase Workflow** — multi_unit_purchase_order_guide_multi_unit_po, po_number_automation_po_number_system, supplier_stock_tracking_supplier_stock_system, delete_void_implementation_purchase_order_void, pickup_date_feature_uniform_pickup_date [INFERRED 0.85]
- **PMB (New Student Registration) Pipeline** — migrations_admission_policy_ccs_admission_policy, src_documentation_pmb_registrasi_admission_level, src_documentation_pmb_registrasi_student_applications, src_documentation_pmb_fee_system_documentation_fee_system [EXTRACTED 0.90]
- **CCS School Policy Documents** — migrations_admission_policy_ccs_admission_policy, migrations_assessment_policy_ccs_assessment_policy, migrations_ccs_language_policy_language_policy, migrations_inclusion_policy_inclusion_policy, migrations_professional_conduct_teacher_conduct [INFERRED 0.85]

## Communities (223 total, 79 thin omitted)

### Community 0 - "Admission & PDF Generation"
Cohesion: 0.13
Nodes (31): jspdf, jspdf, AdmissionManagement(), statusConfig, FeeSimulationPage(), formatCurrency(), formatDateID(), monthNames (+23 more)

### Community 1 - "Project Config & ESLint"
Cohesion: 0.09
Nodes (21): baseline-browser-mapping, devDependencies, baseline-browser-mapping, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, tw-animate-css (+13 more)

### Community 2 - "UI Component Aliases"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 3 - "FPB (Purchase Request) Page"
Cohesion: 0.20
Nodes (15): buildPrintHtml(), CreateFpbModal(), EditFpbModal(), emptyItem(), fmt(), fmtDate(), fmtDatePrint(), fmtDt() (+7 more)

### Community 4 - "Attendance Excuses Management"
Cohesion: 0.18
Nodes (15): AttendanceExcusesPage(), CATEGORIES_LATE_LEAVE_EARLY_STATIC, CATEGORIES_NO_SCAN_STATIC, compressImage(), createImage(), dbToCategory(), ExcuseModal(), fmtMins() (+7 more)

### Community 5 - "Transaction Modals & Image Crop"
Cohesion: 0.28
Nodes (5): getCroppedImg(), ImageCropModal(), Button(), buttonVariants, Modal()

### Community 6 - "Attendance Notification API"
Cohesion: 0.25
Nodes (14): _emailSecondStart, formatDateID(), GET(), getDayNumber(), getYesterdayWIB(), handleNotify(), POST(), resolveIsCheckIn() (+6 more)

### Community 7 - "React & Form UI"
Cohesion: 0.24
Nodes (10): react, react, FormControl(), FormDescription(), FormFieldContext, FormItem(), FormItemContext, FormLabel() (+2 more)

### Community 8 - "IB MYP Grading & Assessment Schema"
Cohesion: 0.25
Nodes (11): Assessment Criteria Table Schema, Assessment Grades Table Schema, IB MYP Criteria System (A-D), Rubrics Table (Achievement Bands 0-8), Strands Table (Year-Level Specific), Assessment Grade Strands Detail Table, Assessment Grades (Criterion A-D, 0-8 scale), Final Grade Calculation (1-7 Scale) (+3 more)

### Community 9 - "Teacher Dashboard"
Cohesion: 0.22
Nodes (4): getPathIcon(), PATH_ICONS, TeacherDashboard(), isAdmin()

### Community 10 - "Attendance Leave Management"
Cohesion: 0.27
Nodes (6): ALL_ISSUE_TYPES, EMPTY_TYPE_FORM, fullName(), LeaveTypeCard(), QuotaInlineForm(), TopicPrintPage()

### Community 12 - "Attendance Report API"
Cohesion: 0.42
Nodes (8): dateRange(), GET(), getDayNumber(), resolveIsCheckIn(), supabaseAdmin, timeToMinutes(), wibDateStr(), wibTimeStr()

### Community 14 - "WhatsApp Messaging Library"
Cohesion: 0.25
Nodes (5): closingsGeneral, delay(), greetings, messageTemplates, sendWhatsApp()

### Community 15 - "School Policy & PMB Registration"
Cohesion: 0.10
Nodes (20): CCS Admission Policy (Chung Chung Christian School), Holistic and Inclusive Admissions Process, Database Migration Runbook, School Fee System (UDP & USEK), School Fee Definition Table (USEK Monthly), UDP Definition Table (One-time Development Fee), admission_level, application_discount (+12 more)

### Community 17 - "Select UI & Utilities"
Cohesion: 0.29
Nodes (3): Select, SelectItem, cn()

### Community 18 - "FPB Detail Page"
Cohesion: 0.43
Nodes (5): fmt(), fmtDate(), fmtDt(), FpbDetailPage(), STATUS_META

### Community 19 - "School Fee Management"
Cohesion: 0.62
Nodes (6): fmtDate(), fmtThousands(), onlyDigits(), presentIDR(), SchoolFeePage(), toNumber()

### Community 22 - "Vercel Deployment Config"
Cohesion: 0.29
Nodes (6): crons, functions, src/app/api/assessment-pdf/route.js, src/app/api/attendance/notify/route.js, maxDuration, maxDuration

### Community 23 - "Uniform Purchase & Stock Management"
Cohesion: 0.05
Nodes (38): Purchase Order Void Mechanism, Stock Transaction Reversal on Void, Uniform Pickup Date Tracking, 1. Purchase Receipt - Auto Track Supplier (/stock/uniform/add), 1. Stock Available per Item per Supplier, 1. uniform_stock_txn - Tambah kolom supplier_id, 2. Index untuk Performance, 2. Initial Stock Input (/stock/uniform/initial) (+30 more)

### Community 26 - "Attendance Report Page"
Cohesion: 0.40
Nodes (3): AttendanceReportPage(), fmtMins(), STATUS_META

### Community 27 - "Attendance Settings"
Cohesion: 0.47
Nodes (5): AttendanceSettingsPage(), DAY_LABELS, diffDays(), formatDateRange(), NOTIF_TYPES

### Community 28 - "Subject Group & MYP Criteria Page"
Cohesion: 0.47
Nodes (5): BANDS, CRITERIA, MYP_YEARS, SEMESTERS, SubjectGroupPage()

### Community 29 - "Timetable Management"
Cohesion: 0.53
Nodes (5): DAYS, extractHM(), formatRangeForInsert(), parseRange(), TimetablePage()

### Community 30 - "i18n Internationalization"
Cohesion: 0.40
Nodes (4): dictionaries, getByPath(), I18nContext, I18nProvider()

### Community 31 - "Theme Light Dark Mode"
Cohesion: 0.33
Nodes (3): DARK, LIGHT, ThemeContext

### Community 33 - "Assessment PDF Generation API"
Cohesion: 0.80
Nodes (4): buildHtml(), buildRepeatingHeaderTemplate(), escapeHtml(), POST()

### Community 34 - "Attendance Excuses Upload API"
Cohesion: 0.60
Nodes (4): ALLOWED_EXTS, ALLOWED_TYPES, POST(), supabaseAdmin

### Community 36 - "Admission Discounts"
Cohesion: 0.50
Nodes (4): appliesToColor, appliesToLabel, DiscountMasterPage(), formatCurrency()

### Community 37 - "Admission Fee Simulation"
Cohesion: 0.05
Nodes (39): 1. Get Fee untuk Level & Year tertentu, 1. `school_fee_definition`, 2. Get Installment Plan untuk UDP, 2. `udp_definition`, 3. Get Discounts Available untuk Unit & Year (termasuk diskon semua-tahun), 3. `udp_installment_plan`, 4. Calculate Total Payment dengan Discount, 4. `fee_discount` (+31 more)

### Community 38 - "Attendance Approvals"
Cohesion: 0.50
Nodes (4): AttendanceApprovalsPage(), CATEGORY_LABEL, fmtMins(), TYPE_LABEL

### Community 39 - "Attendance Machine Integration"
Cohesion: 0.80
Nodes (4): AttendanceMachinePage(), resolveStatus(), statusInfo(), toMinutes()

### Community 40 - "FPB Create Page"
Cohesion: 0.60
Nodes (4): CreateFpbPage(), emptyItem(), fmt(), TYPE_ICONS

### Community 42 - "Next.js App Layout"
Cohesion: 0.40
Nodes (3): geistMono, geistSans, metadata

### Community 43 - "Uniform Sales and FPB Settings"
Cohesion: 0.50
Nodes (3): UniformSalesPage(), FpbSettingsPage(), userName()

### Community 46 - "Community 46"
Cohesion: 0.50
Nodes (4): Multi-Unit Purchase Order, Uniform Purchase Item Table (with unit_id), Purchase Order Auto Numbering (PO/CCS/month/year/seq), Uniform PO Settings Table (singleton)

### Community 47 - "Community 47"
Cohesion: 0.50
Nodes (3): files, fs, path

### Community 48 - "Community 48"
Cohesion: 0.83
Nodes (3): buildHtml(), escapeHtml(), POST()

### Community 52 - "Community 52"
Cohesion: 0.83
Nodes (3): decodeCredential(), getUserInfoFromAccessToken(), POST()

### Community 53 - "Community 53"
Cohesion: 0.83
Nodes (3): buildEmailContent(), formatDate(), POST()

### Community 54 - "Community 54"
Cohesion: 0.67
Nodes (3): checkRateLimit(), POST(), rateLimitMap

### Community 57 - "Community 57"
Cohesion: 0.83
Nodes (3): EditFpbPage(), emptyItem(), fmt()

### Community 58 - "Community 58"
Cohesion: 0.83
Nodes (3): parseRange(), RoomBookingPage(), toLocalDateKey()

### Community 60 - "Community 60"
Cohesion: 0.83
Nodes (3): getCroppedBlob(), ImageCropUploader(), loadImage()

### Community 62 - "Community 62"
Cohesion: 0.06
Nodes (34): 1. Tab "Receive" (Terima Barang), 2. Modal: Tambah Item Baru, 2. Tab "History" (Riwayat Transaksi Selesai), 3. Step 2 - Item Yang Dipesan, After Migration, After (New Schema), Before Migration, Before (Old Schema) (+26 more)

### Community 75 - "Community 75"
Cohesion: 0.06
Nodes (33): 1. Bulk Import, 1. `criteria`, 1. Data Entry, 1. Looping Through Strands, 2. Copy from Previous Year, 2. Curriculum Alignment, 2. Rubric Lookup Logic, 2. `strands` (+25 more)

### Community 78 - "Community 78"
Cohesion: 0.22
Nodes (9): dependencies, class-variance-authority, next-auth, @radix-ui/react-slot, react-hook-form, class-variance-authority, next-auth, @radix-ui/react-slot (+1 more)

### Community 94 - "Community 94"
Cohesion: 0.06
Nodes (31): 1. Restart Development Server, 2. Test Connection, 3. Test Login, 4. ✅ Verifikasi Setup, 5. 🧪 Test Connection, 🧩 Additional Migrations, 🤖 AI (Gemini) Setup, ✨ AI Help in Unit Title (Topic) (+23 more)

### Community 101 - "Community 101"
Cohesion: 0.07
Nodes (29): 1. Assessment Card Button, 1. `assessment_grades` (Header/Summary), 1. Prerequisites, 2. `assessment_grade_strands` (Detail per Strand), 2. Grading Modal Layout, 2. User Flow, 3. Calculation Rules, 3. Visual Indicators (+21 more)

### Community 104 - "Community 104"
Cohesion: 0.07
Nodes (29): 1. `/data/uniform-size` Page, 2. `/stock/uniform/add` (Purchase Order), 3. Other Affected Pages, After Migration, Backward Compatibility, Before Migration, Best Practices, Breaking Changes (+21 more)

### Community 116 - "Community 116"
Cohesion: 0.07
Nodes (27): 1. State Management, 2. Delete Draft Function, 3. Void Posted Function, 4. Void Reason Modal, Business Rules, Cleanup Script: `cleanup-voided-purchase-stock.sql`, Database Changes, Delete (Draft Orders) (+19 more)

### Community 118 - "Community 118"
Cohesion: 0.08
Nodes (23): 1. `criteria` Table, 2. `strands` Table, 3. `rubrics` Table, Common Mistakes to Avoid, Data Flow in Assessment PDF Generation, Database Queries for Reference, Database Schema, Full criteria tree for a subject (+15 more)

### Community 127 - "Community 127"
Cohesion: 0.09
Nodes (22): 1. Tab History - Tampilan Pickup Date, 2. Button "Tandai Diambil", 3. Modal Pickup Date, 4. Tab Laporan Penjualan, 5. Excel Export, Badge Display (History Tab), Benefits, Button Tandai Diambil (+14 more)

### Community 144 - "Community 144"
Cohesion: 0.10
Nodes (19): Database Schema, Features, Format Examples, Frontend Implementation, Function: `generatePONumber()`, Future Enhancements, Integration Points, Manual Reset Procedure (+11 more)

### Community 149 - "Community 149"
Cohesion: 0.12
Nodes (17): **10. Data Mapping Note**, **11. Attendance (QR Sessions & Scans)**, **12. Student Consultation (BK)**, **13. Room Booking Module**, **14. Uniform Sales Module (NEW)**, **1. Authentication & User Management**, **2. Academic Data Management**, **3. Assessment System** (+9 more)

### Community 176 - "Community 176"
Cohesion: 0.13
Nodes (14): 1. Assessment Form (topic-new/page.jsx), 2. Assessment Grading (handleOpenGrading), 3. Fetch Strands, Benefits, Code Changes, Creating Assessment, Database Changes, Input Nilai (+6 more)

### Community 202 - "📌 Changelog"
Cohesion: 0.14
Nodes (14): 2025-08-13, 2025-08-17, 2025-08-17 (Subsequent Updates), 2025-08-20, 2025-08-21, 2025-08-22, 2025-08-23, 2025-08-30 (+6 more)

### Community 203 - "Database Migrations"
Cohesion: 0.14
Nodes (13): Active/Current Migrations, Core Attendance System, Database Migrations, 🚀 How to Run Migrations, ⚠️ Important Notes, 📋 Migration Checklist, Other Systems (Unrelated to Attendance), 🔄 Recent Changes (October 2025) (+5 more)

### Community 204 - "🎓 **IB MYP Assessment Grading System**"
Cohesion: 0.15
Nodes (13): **1. MYP Year Level Selection**, **2. Criterion Grades (A, B, C, D)**, **3. Strand Grades**, **4. Final Grade (1-7)**, **Assessment Cards** (`/data/topic-new`), **Database Migrations**, **Grading Modal**, **Grading Workflow** (+5 more)

### Community 205 - "Protocol: Premium Utilitarian Minimalism UI Architect"
Cohesion: 0.20
Nodes (9): 1. Protocol Overview, 2. Absolute Negative Constraints (Banned Elements), 3. Typographic Architecture, 4. Color Palette (Warm Monochrome + Spot Pastels), 5. Component Specifications, 6. Iconography & Imagery Directives, 7. Subtle Motion & Micro-Animations, 8. Execution Protocol (+1 more)

### Community 206 - "School Admin System - Complete Documentation"
Cohesion: 0.22
Nodes (8): **Completed Features:**, **Important Files:**, **Key Business Rules:**, **Key Directories:**, 📁 **Project Structure**, 📝 Recent Changes (Aug 2025), School Admin System - Complete Documentation, ✅ **System Status**

### Community 207 - "School Admin AI Guide"
Cohesion: 0.25
Nodes (7): API & Server Routes, Architecture, Data & Business Rules, Development Workflow, Frontend Patterns, School Admin AI Guide, Tips for New Changes

### Community 208 - "📋 **Common Issues & Solutions**"
Cohesion: 0.33
Nodes (6): **1. Icons Not Showing:**, **2. Teacher Filter Not Working:**, **3. Assessment Date Validation:**, **4. Menu Permissions:**, **5. RLS write blocked on subject-class mapping (detail_kelas)**, 📋 **Common Issues & Solutions**

### Community 209 - "🔐 **Role-Based Access Control**"
Cohesion: 0.33
Nodes (6): Access flow (guards), **Admin (`is_admin = true`):**, 🔐 **Role-Based Access Control**, **Staff (default):**, **Student (`is_student = true`):**, **Teacher (`is_teacher = true`):**

### Community 210 - "📊 **Database Queries Reference**"
Cohesion: 0.33
Nodes (6): **Assessment Calendar (View + RPC)**, **Assessment with Relations:**, 📊 **Database Queries Reference**, **Get Teachers Only:**, **Subject with Teacher & Unit:**, **Topics (Units) Queries:**

### Community 211 - "🚀 **Setup & Deployment**"
Cohesion: 0.40
Nodes (5): **Additional Files:**, **Database Migration Files (Execute in Order):**, **Development:**, **Key Environment:**, 🚀 **Setup & Deployment**

### Community 212 - "�🏗️ **Database Structure**"
Cohesion: 0.50
Nodes (4): Attendance (QR) Tables, **Core Tables:**, �🏗️ **Database Structure**, Grades (Nilai) Table

### Community 213 - "🔧 **Technical Implementation**"
Cohesion: 0.50
Nodes (4): **Backend & Database:**, **Frontend Stack:**, **Key Technical Notes:**, 🔧 **Technical Implementation**

## Knowledge Gaps
- **526 isolated node(s):** `extends`, `next/core-web-vitals`, `$schema`, `style`, `rsc` (+521 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **79 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Community 78` to `Admission & PDF Generation`, `Project Config & ESLint`, `React & Form UI`, `Package Dependencies`, `Community 76`, `Community 77`, `Community 79`, `Community 80`, `Community 81`, `Community 83`, `Community 84`, `Community 85`, `Community 86`, `Community 87`, `Community 88`, `Community 89`, `Community 90`, `docx`, `@fortawesome/fontawesome-svg-core`, `Community 93`, `tailwind-merge`, `Community 96`, `Community 97`, `Community 98`, `Community 99`, `Community 100`, `Community 102`, `Community 103`, `Community 105`, `Community 106`, `Community 107`, `Community 108`, `Community 109`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `jspdf` connect `Admission & PDF Generation` to `Community 78`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `School Admin System - Complete Documentation` connect `School Admin System - Complete Documentation` to `📌 Changelog`, `🎓 **IB MYP Assessment Grading System**`, `📋 **Common Issues & Solutions**`, `🔐 **Role-Based Access Control**`, `📊 **Database Queries Reference**`, `🚀 **Setup & Deployment**`, `�🏗️ **Database Structure**`, `Community 149`, `🔧 **Technical Implementation**`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **What connects `extends`, `next/core-web-vitals`, `$schema` to the rest of the system?**
  _526 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Admission & PDF Generation` be split into smaller, more focused modules?**
  _Cohesion score 0.12685560053981107 - nodes in this community are weakly interconnected._
- **Should `Project Config & ESLint` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `UI Component Aliases` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._