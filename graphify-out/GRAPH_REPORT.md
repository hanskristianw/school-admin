# Graph Report - .  (2026-07-17)

## Corpus Check
- 327 files · ~402,758 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 936 nodes · 973 edges · 250 communities (153 shown, 97 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

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
- Module 167
- Module 227

## God Nodes (most connected - your core abstractions)
1. `jspdf` - 14 edges
2. `generateAssessmentPDFFromWizard()` - 12 edges
3. `generateAssessmentPDFFromCard()` - 12 edges
4. `handleNotify()` - 11 edges
5. `TopicNewPage()` - 10 edges
6. `School Admin System Documentation` - 9 edges
7. `Button()` - 8 edges
8. `GET()` - 7 edges
9. `exportAssessmentWordFromWizard()` - 7 edges
10. `exportAssessmentWordFromCard()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `PMB Documentation Skill` --related_to--> `School Admin System Documentation`  [INFERRED]
  src/Documentation PMB/SKILL.md → MAIN_DOCUMENTATION.md
- `AdmissionManagement()` --references--> `jspdf`  [EXTRACTED]
  src/app/data/admission/page.jsx → package.json
- `TopicPage()` --references--> `jspdf`  [EXTRACTED]
  src/app/data/topic/page.jsx → package.json
- `generateClassReportZIP()` --references--> `jszip`  [EXTRACTED]
  src/app/data/topic-new/lib/pdfGenerators.js → package.json
- `FeeSimulationPage()` --references--> `jspdf`  [EXTRACTED]
  src/app/data/admission/simulation/page.jsx → package.json

## Import Cycles
- None detected.

## Communities (250 total, 97 thin omitted)

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
Cohesion: 0.25
Nodes (14): _emailSecondStart, formatDateID(), GET(), getDayNumber(), getYesterdayWIB(), handleNotify(), POST(), resolveIsCheckIn() (+6 more)

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
Cohesion: 0.36
Nodes (9): DAY_ID, DAYS, extractHM(), formatWeekLabel(), getMonday(), overlaps(), parseRange(), toISO() (+1 more)

### Community 16 - "Third-party Libraries"
Cohesion: 0.22
Nodes (9): bcryptjs, browser-image-compression, docx, html5-qrcode, dependencies, bcryptjs, browser-image-compression, docx (+1 more)

### Community 17 - "Attendance Report API"
Cohesion: 0.42
Nodes (8): dateRange(), GET(), getDayNumber(), resolveIsCheckIn(), supabaseAdmin, timeToMinutes(), wibDateStr(), wibTimeStr()

### Community 19 - "WhatsApp Messaging Lib"
Cohesion: 0.25
Nodes (5): closingsGeneral, delay(), greetings, messageTemplates, sendWhatsApp()

### Community 21 - "Module 21"
Cohesion: 0.29
Nodes (3): Select, SelectItem, cn()

### Community 22 - "Module 22"
Cohesion: 0.29
Nodes (6): crons, functions, src/app/api/assessment-pdf/route.js, src/app/api/attendance/notify/route.js, maxDuration, maxDuration

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
Cohesion: 0.50
Nodes (3): files, fs, path

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

### Community 72 - "Module 72"
Cohesion: 0.83
Nodes (3): EditFpbPage(), emptyItem(), fmt()

### Community 73 - "Module 73"
Cohesion: 0.83
Nodes (3): parseRange(), RoomBookingPage(), toLocalDateKey()

### Community 75 - "Module 75"
Cohesion: 0.83
Nodes (3): getCroppedBlob(), ImageCropUploader(), loadImage()

## Knowledge Gaps
- **224 isolated node(s):** `extends`, `next/core-web-vitals`, `$schema`, `style`, `rsc` (+219 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **97 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Third-party Libraries` to `Module 128`, `Package Dependencies & Config`, `Module 129`, `Module 130`, `Module 131`, `Module 132`, `Module 133`, `Module 134`, `Module 135`, `Admission Management`, `Module 136`, `Module 137`, `Module 138`, `Module 139`, `Module 140`, `Module 142`, `Module 143`, `Module 144`, `Module 145`, `Module 146`, `Module 147`, `React UI Components`, `Module 148`, `Module 149`, `Module 150`, `Module 151`, `Module 152`, `Module 153`, `Module 154`, `Module 155`, `Module 156`, `Module 125`, `Module 126`, `Module 127`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `jspdf` connect `Admission Management` to `Third-party Libraries`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **What connects `extends`, `next/core-web-vitals`, `$schema` to the rest of the system?**
  _224 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Admission Management` be split into smaller, more focused modules?**
  _Cohesion score 0.12685560053981107 - nodes in this community are weakly interconnected._
- **Should `Package Dependencies & Config` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `RLS & Migration Scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.12380952380952381 - nodes in this community are weakly interconnected._
- **Should `Component Aliases & UI Library` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._