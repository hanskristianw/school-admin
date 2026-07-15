# Graph Report - .  (2026-07-15)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 741 nodes · 760 edges · 202 communities (125 shown, 77 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.77)
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
- Community 124
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

## God Nodes (most connected - your core abstractions)
1. `jspdf` - 14 edges
2. `generateAssessmentPDFFromWizard()` - 12 edges
3. `generateAssessmentPDFFromCard()` - 12 edges
4. `handleNotify()` - 11 edges
5. `TopicNewPage()` - 10 edges
6. `Button()` - 8 edges
7. `exportAssessmentWordFromWizard()` - 7 edges
8. `exportAssessmentWordFromCard()` - 7 edges
9. `GET()` - 7 edges
10. `fmt()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `Assessment Grades Table Schema` --semantically_similar_to--> `Assessment Grades (Criterion A-D, 0-8 scale)`  [INFERRED] [semantically similar]
  ASSESSMENT Table.md → GRADING_SYSTEM_DOCUMENTATION.md
- `Assessment Grades (Criterion A-D, 0-8 scale)` --semantically_similar_to--> `IB MYP Rubrics System`  [INFERRED] [semantically similar]
  GRADING_SYSTEM_DOCUMENTATION.md → RUBRICS_SYSTEM_DOCUMENTATION.md
- `Holistic and Inclusive Admissions Process` --semantically_similar_to--> `Student Applications Table`  [INFERRED] [semantically similar]
  migrations/Admission Policy.docx.txt → src/Documentation PMB/REGISTRASI.md
- `AdmissionManagement()` --references--> `jspdf`  [EXTRACTED]
  src/app/data/admission/page.jsx → package.json
- `FeeSimulationPage()` --references--> `jspdf`  [EXTRACTED]
  src/app/data/admission/simulation/page.jsx → package.json

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **IB MYP Grading Pipeline** — criteria_strands_rubrics_documentation_ib_myp_criteria, criteria_strands_rubrics_documentation_strands_table, criteria_strands_rubrics_documentation_rubrics_table, grading_system_documentation_assessment_grades, myp_year_implementation_assessment_myp_year [EXTRACTED 0.95]
- **Uniform Purchase Workflow** — multi_unit_purchase_order_guide_multi_unit_po, po_number_automation_po_number_system, supplier_stock_tracking_supplier_stock_system, delete_void_implementation_purchase_order_void, pickup_date_feature_uniform_pickup_date [INFERRED 0.85]
- **PMB (New Student Registration) Pipeline** — migrations_admission_policy_ccs_admission_policy, src_documentation_pmb_registrasi_admission_level, src_documentation_pmb_registrasi_student_applications, src_documentation_pmb_fee_system_documentation_fee_system [EXTRACTED 0.90]
- **CCS School Policy Documents** — migrations_admission_policy_ccs_admission_policy, migrations_assessment_policy_ccs_assessment_policy, migrations_ccs_language_policy_language_policy, migrations_inclusion_policy_inclusion_policy, migrations_professional_conduct_teacher_conduct [INFERRED 0.85]

## Communities (202 total, 77 thin omitted)

### Community 0 - "Admission & PDF Generation"
Cohesion: 0.16
Nodes (27): jspdf, jspdf, AdmissionManagement(), statusConfig, CommunityProjectTab(), WizardStepContent(), addPageNumbers(), buildAssessmentCriteriaForPdf() (+19 more)

### Community 1 - "Project Config & ESLint"
Cohesion: 0.09
Nodes (21): baseline-browser-mapping, eslint, eslint-config-next, devDependencies, baseline-browser-mapping, eslint, eslint-config-next, tailwindcss (+13 more)

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

### Community 11 - "Package Dependencies"
Cohesion: 0.22
Nodes (9): bcryptjs, docx, @fortawesome/fontawesome-svg-core, dependencies, bcryptjs, docx, @fortawesome/fontawesome-svg-core, tailwind-merge (+1 more)

### Community 12 - "Attendance Report API"
Cohesion: 0.42
Nodes (8): dateRange(), GET(), getDayNumber(), resolveIsCheckIn(), supabaseAdmin, timeToMinutes(), wibDateStr(), wibTimeStr()

### Community 14 - "WhatsApp Messaging Library"
Cohesion: 0.25
Nodes (5): closingsGeneral, delay(), greetings, messageTemplates, sendWhatsApp()

### Community 15 - "School Policy & PMB Registration"
Cohesion: 0.29
Nodes (8): CCS Admission Policy (Chung Chung Christian School), Holistic and Inclusive Admissions Process, Database Migration Runbook, School Fee System (UDP & USEK), School Fee Definition Table (USEK Monthly), UDP Definition Table (One-time Development Fee), Admission Level Table (Nursery, K1, Elementary, JHS, SHS), Student Applications Table

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
Cohesion: 0.40
Nodes (6): Purchase Order Void Mechanism, Stock Transaction Reversal on Void, Uniform Pickup Date Tracking, Supplier-Based Stock Tracking System, Uniform Stock Transaction Table, Universal Uniform Size Schema (unit-independent)

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
Cohesion: 0.60
Nodes (4): FeeSimulationPage(), formatCurrency(), formatDateID(), monthNames

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

### Community 45 - "Community 45"
Cohesion: 0.50
Nodes (4): Multi-User Fraud Detection (15-min window), QR Code Attendance System, Custom Integer-Based Auth (no Supabase Auth), Supabase Database Connection

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

## Knowledge Gaps
- **176 isolated node(s):** `extends`, `next/core-web-vitals`, `paths`, `nextConfig`, `name` (+171 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **77 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Package Dependencies` to `Admission & PDF Generation`, `Project Config & ESLint`, `React & Form UI`, `Community 76`, `Community 77`, `Community 78`, `Community 79`, `Community 80`, `Community 81`, `Community 83`, `Community 84`, `Community 85`, `Community 86`, `Community 87`, `Community 88`, `Community 89`, `Community 90`, `Community 93`, `Community 94`, `Community 96`, `Community 97`, `Community 98`, `Community 99`, `Community 100`, `Community 101`, `Community 102`, `Community 103`, `Community 104`, `Community 105`, `Community 106`, `Community 107`, `Community 108`, `Community 109`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `jspdf` connect `Admission & PDF Generation` to `Package Dependencies`, `Admission Fee Simulation`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `extends`, `next/core-web-vitals`, `paths` to the rest of the system?**
  _176 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Project Config & ESLint` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `UI Component Aliases` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._