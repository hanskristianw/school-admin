# School Admin System - Complete Documentation

## 📌 Changelog

### 2025-09-14
- Sales & Reports UX
  - Added section layouts so Sidebar appears on these namespaces:
    - `src/app/sales/layout.jsx` → wraps `/sales/*` with Sidebar + AccessGuard
    - `src/app/reports/layout.jsx` → wraps `/reports/*` with Sidebar + AccessGuard
  - Menu icons recommendation (supported by `iconMap`):
    - Sales Uniform → `fas fa-cart-shopping` (alias: `faCartShopping`)
    - Reports Uniform → `fas fa-clipboard-list` (alias: `faClipboardList`)
- Storage hardening (recommendation):
  - Make `uniform-receipts` a PRIVATE bucket and serve receipts via signed URLs; restrict read access to the purchasing student and staff/admin.

### 2025-09-13
- Unit Management enhancements:
 - FontAwesome Icons & Menu Icons:
   - Sidebar iconMap now supports both classic class names (e.g. `fas fa-user`) and alias names (e.g. `faUser`).
   - Added `sack-dollar` icon mapping (finance): use `fas fa-sack-dollar` (or alias `faSackDollar`).
   - Provided `update-icons.js` script to normalize legacy/inconsistent DB values to the supported keys.
  - Schema: `unit.is_school BOOLEAN NOT NULL DEFAULT false` to distinguish School units vs Management departments.
  - UI (/settings/unit):
    - Add/Edit form includes a checkbox “Merupakan Sekolah?”.
    - Table shows a “Tipe” column with badges: “Sekolah” (green) or “Manajemen” (gray).
  - Migration:
    ```sql
    alter table unit add column if not exists is_school boolean not null default false;
    ```
  - Notes: For existing data, you may update rows accordingly:
    ```sql
    update unit set is_school = true where unit_name ilike '%sd%' or unit_name ilike '%smp%' or unit_name ilike '%sma%';
    ```

### 2025-09-06
- Room Booking feature:
  - Pages/Paths:
    - Admin Master Rooms: `/data/room` (admin-only) — CRUD nama ruangan, popup modal add/edit, unique name
    - Booking: `/room/booking` (guru/admin) — Form ajukan (ruangan, tanggal, jam mulai/selesai, keperluan), daftar pengajuan, Setujui (admin), Batalkan (hanya oleh pengaju)
  - Double-booking policy: Pending boleh overlap; Approved tidak boleh overlap (dibatasi oleh constraint DB); back-to-back diperbolehkan dengan interval half-open `[start,end)`
  - Data model: `room` (room_name unik) dan `room_booking` (booking_time `tstzrange`, status `pending|approved|cancelled`, partial exclusion constraint hanya untuk `status='approved'`)
  - Middleware & Guard: `/room/:path*` ditambahkan ke SSR middleware; allowed_paths teacher override menambah `/room` dan `/room/booking` agar akses lancar; layout `/room` memakai Sidebar
  - Icons: `fas fa-building` (Room Master) dan `fas fa-calendar-days` (Booking) ditambahkan ke `iconMap` di `src/components/sidebar.jsx`
  - i18n: Halaman Room Booking dan Master Ruangan sepenuhnya dilokalisasi (EN/ID/ZH). Semua label, tombol, status, dan pesan error menggunakan kunci `roomBooking.*` dan `roomMaster.*`.
  - Error UX: Pesan error constraint overlap (`room_booking_no_overlap_approved`) dipetakan menjadi pesan yang ramah dan terjemahan tersedia; validasi “start < end” juga ditampilkan secara lokal.

- Subject Guide (link PDF):
  - Skema: kolom baru `subject.subject_guide` (TEXT) untuk menyimpan URL Google Drive (atau URL PDF lain).
  - `/data/subject`: Form tambah/edit menambahkan field "Subject Guide" (validasi URL http/https). Tabel menampilkan kolom "Guide Link" sebagai tautan "Open" bila tersedia.
  - `/data/topic`: Menampilkan tautan guide untuk subject yang dipilih. Jika filter "Semua Mata Pelajaran" dipilih, daftar link untuk semua subject yang diajarkan oleh guru ditampilkan (hanya tautan).

- Topic Planner (tautan per‑topik):
  - Skema: kolom baru `topic.topic_planner` (TEXT) untuk menyimpan URL Planner (mis. Google Drive/Docs).
  - `/data/topic`: Form tambah/edit menambahkan field "Planner (Google Drive URL)" dengan validasi URL (http/https). Pada tabel daftar topic, ditambahkan kolom "Planner" yang menampilkan tautan "Open" bila tersedia.
  - Migrasi: `alter table topic add column if not exists topic_planner text;`

- Nilai (Grade Entry) updates:
  - Path: `/teacher/nilai` (teacher-only)
  - UI: Table now hides internal IDs; columns shown are Student and Score only.
  - CSV: Export only (no import). Export format is `nama,nilai` where `nama` is the student full name and `nilai` is 1–8.
  - Behavior: Save overwrites existing values per (topic, student) via upsert; per-row delete supported. Client-side validation enforces integer 1–8.
  - Icons: Suggested menu icon `fas fa-clipboard-check` for this page.

### 2025-08-31
- Consultation (BK) page `/data/consultation` enhanced:
  - Dropdowns fixed to reliably load from `year`, `kelas`, dan `detail_siswa` (native `<select>`)
  - Added data table under the form with filters (by selected year/class/student), pagination, and actions
  - Edit modal to update all fields; Delete with confirmation; auto-refresh list after changes
  - DEV note: relies on broad RLS for now; tighten in production
 - Access Control hardening:
   - Teacher: `/teacher` namespace protected in middleware; login and client guard add `/teacher` and `/teacher/assessment_submission` to allowed paths when `role.is_teacher = true`. Admin bypass remains.
   - Student: `/student` namespace (incl. `/student/scan`) is protected in middleware; only roles with `role.is_student = true` can access. Login and client guard add `/student` and `/student/scan` to allowed paths for student roles. Admin bypass remains.
   - Middleware now also matches `/student/:path*` in addition to `/data`, `/settings`, and `/teacher`.
 - Sidebar Icons:
   - Role Management uses `fas fa-key` (Key icon)
   - Menu Management uses `fas fa-sitemap` (Sitemap icon)
   - Mapping added in `src/components/sidebar.jsx` iconMap; set `menus.menu_icon` accordingly in DB

### 2025-08-30
- Student Dashboard Enhancements:
  - Added dedicated student view showing a schedule list with start–end times per lesson (parsed from `timetable.timetable_time`).
  - Day selector (Monday–Sunday) with default to today; labels localized via `doorGreeter.days.*`.
  - QR Scan quick action button linking to `/student/scan`.
  - New i18n keys used: `dashboard.todaySchedule`, `dashboard.noScheduleToday`, `dashboard.dayLabel`, `dashboard.classLabel`, `student.qrScan`, `student.scanHint` (provided in en/id/zh).
  - More robust `tsrange` parser to reliably extract time ranges regardless of stored format (`[start,end)`, `start-end`, or with weekday hints).
- RLS (DEV convenience): Allow client-side management of class–subject relations under RLS by adding DEV-only write policies on `detail_kelas` (insert/update/delete). For production, move writes to server routes (service role) or restrict to admin roles.

### 2025-08-23
- QR Attendance: API `POST /api/attendance/scan` kini mengembalikan `{ status: 'ok', flagged: 'device_multi_user' | null }` saat sukses; UI siswa menampilkan catatan sopan bila perangkat terdeteksi dipakai beberapa akun.
- Deteksi multi-user perangkat dapat dikonfigurasi via `ATTENDANCE_MULTI_MATCH`:
  - `client_strict` – hanya berdasarkan hash perangkat dari klien (minim false positive)
  - `client_or_uaip` – juga mempertimbangkan hash UA+IP (menangkap shared-device; lebih sensitif)
- Variabel env baru: `ATTENDANCE_BLOCK_MULTI_USER` (blokir scan kedua) dan `ATTENDANCE_MULTI_MATCH`.
- UI siswa: hash perangkat dibuat stabil (persisten di localStorage) dan pesan sukses ditambah catatan bila flagged.
- Skema: `attendance_scan_log` ditambah `device_hash_client`, `device_hash_uaip` + index.

### 2025-08-22
- Geofence & Logging: Lokasi wajib. Geofence opsional dengan `ATTENDANCE_CENTER_LAT`, `ATTENDANCE_CENTER_LNG`, `ATTENDANCE_RADIUS_M`.
- Log menyimpan `lat`, `lng`, `accuracy`, `device_hash`; `flagged_reason` menggunakan nilai seperti `outside_geofence`, `no_location`, `device_multi_user`.
- UI siswa: pesan terlokalisasi untuk lokasi wajib, di luar area, dan tidak diizinkan.

### 2025-08-21
- Realtime & WIB: Halaman presensi guru auto-refresh (realtime + fallback polling). Penentuan tanggal/jam presensi memakai WIB (GMT+7).

### 2025-08-20
- QR Sessions: Token QR dinamis (HMAC berbasis slot ~20s, toleransi ±1). Scope sesi `all|year|class`.
- Tabel baru: `attendance_session`, `attendance_scan_log`. Tabel `absen` menambah `absen_session_id`, `absen_method` dan unique per siswa per tanggal.

### 2025-08-17 (Subsequent Updates)
- Door Greeter Module (`/data/door_greeter`): Weekly duty roster assigning at most one teacher per weekday (Mon–Fri). Dashboard notification card shows if teacher is on duty today (red theme) or tomorrow (amber). Fully localized (`doorGreeter.*`).
- Door Greeter Table: `daftar_door_greeter (daftar_door_greeter_id, daftar_door_greeter_user_id FK users, daftar_door_greeter_day text)`; recommend unique constraint on day: `alter table daftar_door_greeter add constraint uq_door_greeter_day unique (daftar_door_greeter_day);`.
- Timetable Module (`/data/timetable`): Added weekly recurring schedule blocks. Schema: `timetable (timetable_id, timetable_user_id FK users, timetable_detail_kelas_id FK detail_kelas, timetable_day text, timetable_time tsrange)`. Uses placeholder date `2000-01-01` inside `timetable_time` so only time-of-day matters.
- Timetable Flow: Teacher → Subject (filtered by teacher) → Class (filtered `detail_kelas` rows for chosen subject) → Day → Start/End time. Replaced earlier direct subject storage with `detail_kelas_id` to bind subject-class pair. Added robust tsrange parser to fix truncated time / NaN duration issues.
- Calendar Enhancement: Assessment calendar chips now include `subject_code` (from subject via detail_kelas) for clearer identification.
- Recommended Constraints:
  - Door Greeter uniqueness per weekday (see above).
  - Timetable overlap prevention (after `btree_gist` extension):
    ```sql
    create extension if not exists btree_gist;
    alter table timetable add constraint timetable_no_overlap exclude using gist (
      timetable_user_id with =,
      timetable_day with =,
      timetable_time with &&
    );
    ```
- Pending: i18n for timetable labels; optional timetable view for easier joins.

### 2025-08-17
- Subject Management: Added optional `subject_code` field (short identifier shown in Subject CRUD). Recommend adding unique index if codes must be unique: `create unique index concurrently if not exists idx_subject_subject_code on subject(lower(subject_code));` (nullable so duplicates allowed unless enforced).
- Topic Management (`/data/topic`): Topics now link to a specific class via `topic_kelas_id`. Form enforces class selection based on available `detail_kelas` mappings for the chosen subject (only classes where the teacher actually teaches that subject). Topic list shows the human‑readable class name.
- Assessment Submission (`/teacher/assessment_submission`): Added topic selection (`assessment_topic_id`). Topics are filtered by both selected subject and class (grade). Cache key uses `subject_id|kelas_id` to avoid cross-grade leakage. Topic is required only when at least one topic exists for that pair.
- Assessment Approval (`/data/assessment_approval`): Added Topic column and topic detail in approval/rejection/delete confirmation modal. Gracefully shows “No Topic” when not set.
- i18n: Added keys for topic selection & validation (`teacherSubmission.topic*`), class selection in topic page (`topic.class*`), and approval page topic display (`assessmentApproval.thTopic`, `labelTopic`, `unknownTopic`, `noTopic`). All provided in en/id/zh; fixed JSON integrity earlier (no duplicates, proper nesting).
- Schema Updates: Added columns `subject.subject_code`, `topic.topic_kelas_id`, `assessment.assessment_topic_id`.
- Business Rule Reinforcement: Submission per class per date (max 2 approved) logic extended to approval step (prevents admin approval if limit already reached); topic requirement dynamically enforced client-side.
- Internal: Introduced lightweight in-memory maps for (subject|kelas) topic caching and kelas name resolution for topic list.

### 2025-08-13
- Internationalization: Class Management page (`/data/class`) fully localized (en/id/zh) with comprehensive `classManagement.*` keys; validations, confirmations, and notifications translated.
- Teacher submission rule: Enforced “max 2 assessments per class-detail per date” with a contextual, localized message (`teacherSubmission.limitPerDayReachedSubmit`). Recommend DB-level enforcement for concurrency.
- Dashboard calendar: Per-class chips and class name text are color-coded via `kelas.kelas_color_name` (success|warning|error).

## �🏗️ **Database Structure**

### **Core Tables:**
```sql
-- Users & Authentication
users (
  user_id SERIAL PRIMARY KEY,
  user_nama_depan VARCHAR(50),
  user_nama_belakang VARCHAR(50),
  user_username VARCHAR(50) UNIQUE,
  -- Passwords are stored as bcrypt hashes only; no plaintext is kept
  user_password_hash TEXT,
  user_role_id INTEGER REFERENCES role(role_id),
  is_active BOOLEAN DEFAULT true,
  -- Profile fields
  user_profile_picture TEXT,
  user_email VARCHAR(100) UNIQUE,
  user_phone VARCHAR(20),
  user_bio TEXT,
  user_birth_date DATE,
  user_address TEXT,
  user_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

-- Roles & Permissions
role (
  role_id SERIAL PRIMARY KEY,
  role_name VARCHAR(50),
  is_teacher BOOLEAN DEFAULT false,
  is_admin BOOLEAN DEFAULT false,
  is_principal BOOLEAN DEFAULT false,
  is_student BOOLEAN DEFAULT false
)

-- Academic Structure
unit (
  unit_id SERIAL PRIMARY KEY,
  unit_name VARCHAR(100),
  is_school BOOLEAN NOT NULL DEFAULT false -- true: School unit, false: Management/department
)

year (
  year_id SERIAL PRIMARY KEY,
  year_name VARCHAR(50) UNIQUE
)

kelas (
  kelas_id SERIAL PRIMARY KEY,
  kelas_nama VARCHAR(50),
  kelas_user_id INTEGER REFERENCES users(user_id), -- Wali Kelas
  kelas_unit_id INTEGER REFERENCES unit(unit_id),
  kelas_year_id INTEGER REFERENCES year(year_id), -- Tahun Ajaran
  -- Semantic color for calendar badges and labels
  kelas_color_name VARCHAR(20) -- expected values: 'success' | 'warning' | 'error'
)

subject (
  subject_id SERIAL PRIMARY KEY,
  subject_name VARCHAR(100),
  subject_user_id INTEGER REFERENCES users(user_id), -- Teacher
  subject_unit_id INTEGER REFERENCES unit(unit_id),
  subject_code VARCHAR(30), -- Optional short code (e.g. MATH7A); nullable. Add unique index if required.
  subject_guide TEXT -- Optional: URL to subject guide (Google Drive/PDF)
)

-- Topics (IB Units)
topic (
  topic_id SERIAL PRIMARY KEY,
  topic_nama VARCHAR(100) NOT NULL, -- Unit Title
  topic_subject_id INTEGER NOT NULL REFERENCES subject(subject_id) ON DELETE RESTRICT,
  topic_kelas_id INTEGER REFERENCES kelas(kelas_id) ON DELETE RESTRICT, -- Optional: binds topic to specific class
  topic_planner TEXT -- Optional: URL to planner (Google Drive/Docs)
)

-- Subject assignment to Class (per-class-per-subject mapping)
detail_kelas (
  detail_kelas_id SERIAL PRIMARY KEY,
  detail_kelas_subject_id INTEGER NOT NULL REFERENCES subject(subject_id) ON DELETE RESTRICT,
  detail_kelas_kelas_id INTEGER NOT NULL REFERENCES kelas(kelas_id) ON DELETE RESTRICT
)

-- Assessment System
assessment (
  assessment_id SERIAL PRIMARY KEY,
  assessment_nama VARCHAR(200),
  assessment_deskripsi TEXT,
  assessment_tanggal DATE,
  assessment_user_id INTEGER REFERENCES users(user_id), -- Teacher
  assessment_detail_kelas_id INTEGER REFERENCES detail_kelas(detail_kelas_id),
  assessment_topic_id INTEGER REFERENCES topic(topic_id), -- Optional selected topic
  -- Status (numeric):
  -- 0 = Waiting for admin approval
  -- 1 = Approved (final)
  -- 2 = Rejected
  -- 3 = Waiting for principal approval
  assessment_status INTEGER DEFAULT 0,
  assessment_catatan TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)

-- Menu System
menus (
  menu_id SERIAL PRIMARY KEY,
  menu_name VARCHAR(100),
  menu_path VARCHAR(200),
  menu_icon VARCHAR(50),
  menu_order INTEGER,
  menu_parent_id INTEGER
)

-- Menu Permissions (role-based access to menus)
menu_permissions (
  permissions_id SERIAL PRIMARY KEY,
  menu_id INTEGER NOT NULL REFERENCES menus(menu_id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES role(role_id) ON DELETE CASCADE
)

-- Door Greeter (one teacher per weekday)
daftar_door_greeter (
  daftar_door_greeter_id SERIAL PRIMARY KEY,
  daftar_door_greeter_user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  daftar_door_greeter_day TEXT NOT NULL -- 'Monday'..'Friday'
  -- Recommended: alter table daftar_door_greeter add constraint uq_door_greeter_day unique (daftar_door_greeter_day);
)

-- Weekly Timetable (recurring schedule)
timetable (
  timetable_id SERIAL PRIMARY KEY,
  timetable_user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE, -- Teacher
  timetable_detail_kelas_id INTEGER NOT NULL REFERENCES detail_kelas(detail_kelas_id) ON DELETE CASCADE,
  timetable_day TEXT NOT NULL,  -- 'Monday'..'Friday'
  timetable_time TSRANGE NOT NULL -- Stored as [2000-01-01 HH:MM,2000-01-01 HH:MM)
  -- Optional overlap constraint (requires btree_gist):
  -- create extension if not exists btree_gist;
  -- alter table timetable add constraint timetable_no_overlap exclude using gist (
  --   timetable_user_id with =,
  --   timetable_day with =,
  --   timetable_time with &&
  -- );
)
```

### Grades (Nilai) Table

```sql
nilai (
  nilai_id SERIAL PRIMARY KEY,
  nilai_topic_id INTEGER NOT NULL REFERENCES topic(topic_id) ON DELETE RESTRICT,
  nilai_detail_siswa_id INTEGER NOT NULL REFERENCES detail_siswa(detail_siswa_id) ON DELETE RESTRICT,
  nilai_value SMALLINT NOT NULL CHECK (nilai_value BETWEEN 1 AND 8),
  created_by_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT uq_nilai_topic_student UNIQUE (nilai_topic_id, nilai_detail_siswa_id)
)
```

### Attendance (QR) Tables

```sql
-- Sesi QR (token dinamis per slot waktu)
attendance_session (
  session_id uuid primary key,
  created_by_user_id bigint not null references users(user_id) on delete cascade,
  scope_type text not null check (scope_type in ('year','class','all')),
  scope_year_id bigint references year(year_id) on delete set null,
  scope_kelas_id bigint references kelas(kelas_id) on delete set null,
  session_date date not null default current_date,
  start_time timestamptz not null default now(),
  end_time timestamptz null,
  token_step_seconds smallint not null default 20,
  clock_skew_seconds smallint not null default 5,
  secret text not null,
  status text not null default 'open' check (status in ('open','closed'))
)

-- Log scan (rekam semua percobaan dan flag)
attendance_scan_log (
  log_id bigserial primary key,
  session_id uuid not null references attendance_session(session_id) on delete cascade,
  detail_siswa_id bigint null references detail_siswa(detail_siswa_id) on delete set null,
  token_slot bigint not null,
  result text not null check (result in ('ok','duplicate','expired','invalid','closed','not_allowed')),
  ip inet null,
  user_agent text null,
  created_at timestamptz not null default now(),
  -- Geofence & device
  device_hash text,
  device_hash_client text,
  device_hash_uaip text,
  lat double precision,
  lng double precision,
  accuracy double precision,
  flagged_reason text -- contoh: 'device_multi_user' | 'outside_geofence' | 'no_location'
)

-- Perubahan pada absen
-- 1) Unique per siswa per tanggal
-- 2) Tambah kolom sesi & metode
alter table absen add column if not exists absen_session_id uuid references attendance_session(session_id) on delete set null;
alter table absen add column if not exists absen_method text not null default 'manual' check (absen_method in ('manual','qr','import'));
-- (Unique constraint pada (absen_detail_siswa_id, absen_date))
```

## 🎯 **System Modules & Features**

### **1. Authentication & User Management**
- **Login**: `/login` - User authentication
- **Dashboard**: `/dashboard` - Simple welcome page with profile picture and name
- **User Profile**: `/profile` - Complete profile management with photo upload
- **User Management**: `/data/user` - User CRUD, role management (Admin only)
- **Access**: All authenticated users for dashboard/profile, Admin only for user management
- **Key Tables**: `users`, `role`

Auth specifics:
- Server-side authentication using Next.js App Router routes with Supabase Service Role (bypasses RLS for secure operations).
- Passwords verified against `users.user_password_hash` via Postgres function `verify_password` (pgcrypto/bcrypt); server falls back to bcryptjs if the function is unavailable.
- Endpoints:
  - `POST /api/auth/login` – verify credentials and return safe user payload.
  - `POST /api/profile/change-password` – change the current user’s password securely.
  - `POST /api/admin/users/set-password` – admin-only, set any user’s password (hashes in DB).
- Import on `/data/user` uses CSV column `user_password` for plaintext input, but the client never writes it to the table; after inserting the user record (without a password), the server API is called to hash and store `user_password_hash`.

### **2. Academic Data Management**
- **Units**: `/data/unit` - Manage school units
- **Years**: `/data/year` - Manage academic years
- **Classes**: `/data/class` - Manage classes with wali kelas and academic year association
- **Subjects**: `/data/subject` - Manage subjects with teachers
- **Topics (Units)**: `/data/topic` - Manage topics (IB units) per subject
- **Access**: Admin only
- **Key Tables**: `unit`, `year`, `kelas`, `subject`
- **New Feature**: Classes now linked to academic years via `kelas_year_id` foreign key

Notes:
- Topic management page (`/data/topic`) is scoped to the logged-in teacher. Only subjects where `subject_user_id` matches the current user are available for selection, and only topics under those subjects are listed. Admins can expose broader management via menus or separate admin tooling if desired.

### **3. Assessment System**
#### **Teacher Workflow**:
- **Path**: `/teacher/assessment_submission`
- **Features**: Submit assessments with date validation
- **Business Rules**:
  - Cannot submit if date difference > 2 days
  - Maximum 2 assessments per class-detail per date; additional attempts are blocked with a localized message that includes the class name and the selected date
- **Status Flow**: `pending` → admin review
- **Notifications**: After each successful submission the app calls `/api/notifications/assessment-submitted`, which emails every “Vice Principal Curriculum” role holder in the same unit (requires `RESEND_API_KEY` + `RESEND_FROM_EMAIL`).

#### **Admin Workflow**:
- **Path**: `/data/assessment_approval`
- **Features**: Approve/reject teacher assessments
- **Status Flow (Admin)**: 0 (waiting) → 1 (approved) / 2 (rejected)
- **Status Flow (Principal)**:
  - Principal only sees items with status 3 (Waiting for principal approval)
  - Principal Approve: changes status 3 → 0 (back to waiting for admin)
  - Principal Reject: changes status 3 → 2 (rejected)
- **Filters**:
  - Admin: can filter by All Status, Waiting, Waiting (Principal), Approved, Rejected.
  - Principal: status filter is constrained to “Waiting for principal approval” and the list only displays status = 3.
- **Key Tables**: `assessment`, `subject`, `users`

### **4. User Profile System**
- **Dashboard**: `/dashboard` - Simple welcome page with user photo, name, and quick navigation
- **Profile Management**: `/profile` - Complete profile editing system
- **Features**: 
  - Profile picture upload to Supabase Storage + URL input
  - Personal information (name, email, phone, bio)
  - Birth date and address
  - Read-only account information
  - File upload with validation (5MB max, image types)
- **Storage**: Supabase Storage bucket 'profile-pictures' with public read access
- **Access**: All authenticated users (own profile only)
- **Edit Mode**: In-place editing with save/cancel functionality

### **5. Dashboard**
- **Path**: `/dashboard`
- **Features**: Statistics, charts, summary data
  - Assessment calendar shows per-day totals and per-class counts
  - Per-class chips and class name text are colored based on `kelas_color_name`
  - Color mapping: `success` (green), `warning` (amber), `error` (red); defaults to gray when unset
  - Door Greeter duty card: Shows today/tomorrow assignment for logged-in teacher with contextual color (today=red, tomorrow=amber)
- **Student view** (when `role.is_student = true`):
  - Shows “Today’s Schedule” list for the selected day (default today) with subject, teacher, and time range (start–end) derived from `timetable_time`.
  - Day selector (Mon–Sun) with localized weekday labels.
  - Quick action button for “QR Scan” that navigates to `/student/scan`.
  - All labels are localized; see new i18n keys under the i18n section.
- **Access**: All authenticated users

### **6. Internationalization (i18n)**
- **Languages**: English (en), Indonesian (id), Chinese (zh)
- **Implementation**: Custom provider `useI18n`, JSON dictionaries per locale.
- **Recent Additions**:
  - Class Management (`/data/class`): fully localized UI, forms, validations, confirmations, and notifications under `classManagement.*`
  - Teacher Submission: contextual limit message key `teacherSubmission.limitPerDayReachedSubmit` supports placeholders `{class}` and `{date}`
  - Assessment Approval: statuses and notifications; keys include `assessmentApproval.statusWaitingPrincipal`, `assessmentApproval.allSubjects`, `assessmentApproval.allTeachers`
  - Chinese dictionary fixed and extended; placeholders and titles localized
  - Student Dashboard keys (en/id/zh):
    - `dashboard.todaySchedule`, `dashboard.noScheduleToday`, `dashboard.dayLabel`, `dashboard.classLabel`
    - `student.qrScan`, `student.scanHint`
    - Weekday labels reused via `doorGreeter.days.*`

### **7. UI/UX Improvements**
- **Assessment Approval Filters**:
  - Subject/Teacher default options now use dedicated i18n placeholders (All Subjects/All Teachers)
  - For principals, status filter is constrained to Waiting for principal approval (status = 3)
- **Badges & Icons**: Consistent FontAwesome icon usage; added status badge for status 3
  - Door Greeter dashboard notification (today vs tomorrow color logic)

### **8. Door Greeter Module**
- **Path**: `/data/door_greeter`
- **Goal**: Assign one teacher per weekday (Mon–Fri) to greeting duty.
- **Business Rules**:
  - One assignment per weekday (enforced client-side; DB unique recommended).
  - Only teacher-role users listed.
  - Weekday list fixed; always displayed in logical order.
  - Editing a day replaces prior assignment (blocked if duplicate exists until deleted/changed).
- **Dashboard**: Highlights today's and tomorrow's duty for current teacher.
- **Schema**: See `daftar_door_greeter` table.
- **i18n**: Keys under `doorGreeter.*` (EN/ID/ZH) for table headers, form, validation, notifications.

### **9. Timetable Module**
- **Path**: `/data/timetable`
- **Goal**: Maintain weekly recurring lesson blocks per teacher/subject/class.
- **Selection Flow**: Teacher → Subject (filtered by `subject.subject_user_id`) → Class (from `detail_kelas` entries for that subject) → Day → Start/End time.
- **Storage Strategy**:
  - `timetable_day` stores weekday text; repetition is weekly.
  - `timetable_time` tsrange uses constant date `2000-01-01` to represent only time-of-day.
  - `timetable_detail_kelas_id` links to subject+class mapping; teacher derived from subject.
- **Student Dashboard Consumption**:
  - The student dashboard reads the weekly `timetable` and shows start–end times parsed robustly from `timetable_time`.
  - If time format varies (e.g., `[07:30,08:10)`, `07:30-08:10`, or contains weekday text), the parser extracts the first two HH:MM tokens.
- **Client Validation**:
  - Prevent overlapping ranges (same teacher + day) before insert/update.
  - Ensure start < end; show human readable error.
- **Recommended DB Constraint**: GIST EXCLUDE for concurrency-safe overlap prevention (see Changelog snippet).
- **Future Enhancements**: i18n for labels, bulk import, per-day copy, or generation of actual dated events.

### **10. Data Mapping Note**
- `detail_kelas` does not carry a teacher column; teacher is inferred through `subject.subject_user_id` ensuring single-source-of-truth for ownership.

### **13. Room Booking Module**
- Paths:
  - Master Rooms: `/data/room` (Admin only). CRUD nama ruangan via modal popup. Nama unik.
  - Booking: `/room/booking` (Guru/Admin). Ajukan booking, lihat daftar, Admin menyetujui, pembatalan hanya oleh pengaju (creator only).
- Business Rules:
  - Pending boleh tumpang tindih (overlap) dengan booking lain.
  - Approved tidak boleh overlap untuk ruangan yang sama. Back-to-back (mis. 10:00–11:00 vs 11:00–12:00) boleh, memakai interval `[start,end)`.
  - Client-side check mencegah ajukan di slot yang bertabrakan dengan booking Approved yang ada; approval admin juga dilindungi constraint DB.
  - Error Handling & i18n:
    - Pesan error database untuk overlap (`room_booking_no_overlap_approved` / exclusion `&&`) ditampilkan sebagai pesan ramah yang telah dilokalisasi.
    - Validasi waktu tidak valid (start ≥ end) ditampilkan dengan pesan terjemahan.
    - Semua label, tombol, status, dan tabel pada halaman Booking memakai kunci `roomBooking.*`.
    - Halaman Master Ruangan memakai kunci `roomMaster.*` (label field, tombol, modal title, konfirmasi hapus, dan pesan duplicate-name).
- Schema Ringkas:
  ```sql
  -- Rooms
  room (
    room_id bigserial primary key,
    room_name text not null unique,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );

  -- Bookings
  room_booking (
    booking_id bigserial primary key,
    room_id bigint not null references room(room_id) on delete cascade,
    requested_by_user_id bigint references users(user_id) on delete set null,
    status text not null default 'pending' check (status in ('pending','approved','cancelled')),
    booking_time tstzrange not null, -- [start,end)
    purpose text,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    constraint room_booking_nonempty check (lower(booking_time) < upper(booking_time))
  );

  -- No overlap among approved only
  alter table room_booking add constraint room_booking_no_overlap_approved
    exclude using gist (room_id with =, booking_time with &&)
    where (status = 'approved');
  ```
- RLS (DEV): `enable-rls-examples.sql` menambah kebijakan baca publik dan write DEV untuk `room` dan `room_booking`. Untuk produksi, pindahkan write ke server routes (service role) atau batasi role (guru/admin).
- UI Catatan: `/room/booking` memakai layout `/room` sehingga sidebar konsisten dengan menu lainnya.
 - Menu i18n: Label menu untuk “Room Master” dan “Room Booking” ditambahkan pada kamus i18n (`menus.Room Master`, `menus.Room Booking`).

### **11. Attendance (QR Sessions & Scans)**
- Teacher session controls: mulai/tutup sesi presensi dan tampilkan QR dinamis (token berganti ~20 detik). Tanggal selalu hari ini (WIB), tanpa pemilih tanggal.
- Student scan: `/student/scan` memakai kamera (Html5Qrcode). Wajib aktifkan lokasi sebelum kamera. Debounce dan cooldown untuk mencegah spam.
- Geofence: pusat dan radius dikonfigurasi via env; jika di luar radius (memperhitungkan `accuracy`), scan ditolak dengan pesan yang sesuai.
- Device tracking: hash perangkat stabil di klien (localStorage) + fallback UA+IP di server. Deteksi perangkat dipakai multi akun dalam jendela waktu → di-flag `device_multi_user` (bisa juga diblokir jika diaktifkan).
- Realtime: halaman guru auto-refresh perubahan absen hari ini; polling fallback tersedia.

### **12. Student Consultation (BK)**
### **14. Uniform Sales Module (NEW)**
- Scope: Only students can buy. No Year scope; scoped by Unit. Payment method: transfer with receipt upload.
- Pages:
  - Master Ukuran Seragam: `/data/uniform-size` – manage dynamic sizes per Unit (add any label, order, active flag).
  - Master Seragam: `/data/uniform` – manage uniforms per Unit (code, name, gender, notes, image). Per-size pricing/HPP via variants.
  - Penjualan Seragam: `/sales/uniform` – select student, unit, add items (uniform+size+qty), upload transfer receipt, finalize sale.
  - Laporan Seragam: `/reports/uniform` – sales summary by period, uniform, size, unit; gross profit (price − HPP).
- Schema (summary):
  - `uniform_size (size_id, unit_id, size_name, display_order, is_active, ...)` unique per unit.
  - `uniform (uniform_id, unit_id, code, name, gender, notes, image_url, is_active, ...)` unique code/name per unit.
  - `uniform_variant (variant_id, uniform_id, size_id, hpp, price, sku, barcode, ...)` unique (uniform_id, size_id).
  - `uniform_stock_txn (txn_id, uniform_id, size_id, qty_delta, txn_type, ref_table, ref_id, ...)` source of truth for stock.
  - `v_uniform_stock` view: aggregated current stock per (uniform,size).
  - `uniform_sale (sale_id, detail_siswa_id, unit_id, sale_date, status, payment_method=transfer, receipt_url, totals, ...)`.
  - `uniform_sale_item (item_id, sale_id, uniform_id, size_id, qty, unit_price, unit_hpp, subtotal, ...)`.
- RLS: DEV policies allow read/write for all; tighten in production to admin-only writes or server routes.
- Icons (suggested):
  - Master Ukuran → `fas fa-ruler`
  - Master Seragam → `fas fa-shirt`
  - Penjualan → `fas fa-cart-shopping`
  - Laporan → `fas fa-clipboard-list`

- Layouts & Guarding:
  - `/sales/*` and `/reports/*` use dedicated layouts that include the Sidebar and `AccessGuard` for consistent navigation and client-side access checks.

- Path: `/data/consultation`
- Goal: Catat konsultasi siswa (private/public) oleh guru BK.
- Form: pilih Tahun → Kelas → Siswa, tanggal, jenis, judul (opsional), catatan (opsional).
- List: tabel di bawah form menampilkan konsultasi yang sudah disimpan, terfilter oleh pilihan (Tahun/Kelas/Siswa) beserta pagination dan tombol Refresh.
- Actions:
  - Edit: buka modal dengan field lengkap (tahun/kelas/siswa/tanggal/jenis/judul/catatan), simpan perubahan.
  - Delete: konfirmasi hapus baris.
- Access: DEV semua role diizinkan untuk kemudahan; untuk produksi batasi ke BK/Admin dan/atau wali kelas terkait.
- Key Tables: `consultation`, `year`, `kelas`, `detail_siswa`, `users`.

Notes:
- Dropdown Tahun, Kelas, Siswa memuat data langsung dari tabel yang relevan (`year`, `kelas` berdasarkan `kelas_year_id`, `detail_siswa` + join nama `users`).
- Setelah Simpan/Edit/Hapus, daftar akan otomatis refresh; pagination default 10 baris/halaman.

## 🔧 **Technical Implementation**

### **Frontend Stack:**
- **Framework**: Next.js 15 with App Router
- **UI**: Tailwind CSS + Custom Components
- **Icons**: FontAwesome React Components
- **Forms**: React Hook Form + Validation
- **State**: React useState/useEffect

### **Backend & Database:**
- **Database**: Supabase PostgreSQL
- **Auth**: Custom server-side routes (service role) + cookies/localStorage for client state; passwords hashed (bcrypt via pgcrypto) and never stored in plaintext.
- **API**: Server routes for sensitive operations (login, password changes). Client-side Supabase queries only for safe, public/metadata reads.
- **Real-time**: Supabase subscriptions

### **Key Technical Notes:**
1. **FontAwesome**: Use React components, not CSS classes
   ```jsx
   // ✅ Correct
   <FontAwesomeIcon icon={faEdit} />
   // ❌ Wrong  
   <i className="fas fa-edit"></i>
   ```

4. **Menu Icons (Sidebar) – cara menambah/mengubah**
   - Nilai kolom `menus.menu_icon` kini didukung dalam 2 format:
     - Klasik: `fas fa-user`, `fas fa-database`, `fas fa-sack-dollar`, dll.
     - Alias FontAwesome React: `faUser`, `faDatabase`, `faSackDollar`, dll.
   - Di UI, `src/components/sidebar.jsx` melakukan mapping string → komponen React FontAwesome lewat objek `iconMap`, dengan alias untuk kedua format di atas.
   - Tambah icon baru:
     1) Import icon di `sidebar.jsx`, contoh: `import { faUser } from '@fortawesome/free-solid-svg-icons'`.
     2) Tambah entry di `iconMap`: `'fas fa-user': faUser,` dan opsional alias `'faUser': faUser,`.
     3) Set nilai `menu_icon` di tabel `menus` pada menu terkait ke salah satu format (disarankan format klasik untuk konsistensi).
   - Jika tidak ditemukan di `iconMap`, aplikasi fallback ke ikon default (faTable) dan log peringatan di console. Lihat utilitas `update-icons.js` di root untuk normalisasi massal.

  Preset yang dipakai di proyek ini:
  - Role Management → `fas fa-key`
  - Menu Management → `fas fa-sitemap`
  - Consultation (BK) → `fas fa-comments`
  - Door Greeter → `fas fa-door-open`
  - Student Scan → `fas fa-qrcode`
  - Room Master → `fas fa-building`
  - Room Booking → `fas fa-calendar-days`
  - Grade Entry → `fas fa-clipboard-check`
  - School Fee & UDP → `fas fa-sack-dollar`
  - Uniform Sales → `fas fa-cart-shopping`
  - Uniform Reports → `fas fa-clipboard-list`

2. **Teacher Filter**: Use RPC function or manual JOIN
   ```sql
   -- RPC Function
   SELECT * FROM get_teacher_users();
   
   -- Manual JOIN fallback
   SELECT u.*, r.role_name FROM users u 
   JOIN role r ON u.user_role_id = r.role_id 
   WHERE r.is_teacher = true;
   ```

3. **Topic Page Subject Scope**:
  - The Topic CRUD page reads the logged-in user ID from localStorage (`kr_id`) and loads only subjects with `subject_user_id = kr_id`.
  - The topics list and the "Subject" dropdown are restricted to that subject set; client-side validation prevents selecting a non-owned subject.

3. **Assessment Date Validation**:
   ```jsx
   const daysDiff = Math.abs(new Date(date) - new Date()) / (1000 * 60 * 60 * 24);
   if (daysDiff > 2) return "Cannot submit after 2 days";
   ```

## 🚀 **Setup & Deployment**

### **Database Migration Files (Execute in Order):**
1. **`supabase-migration.sql`** - Core tables (users, role, unit, kelas, subject, menus)
2. **`assessment-migration.sql`** - Assessment system tables and menus
3. **`year-migration.sql`** - Year management table and menu
4. **`add-kelas-year-migration.sql`** - Add year association to kelas table
5. **`add-user-profile-migration.sql`** - Add profile fields to users table
6. **`add-profile-menu.sql`** - Add Dashboard and Profile menu items
7. **`setup-supabase-storage.sql`** - Storage bucket and policies for profile pictures
8. **`create-teacher-rpc-functions.sql`** - Helper functions for teacher queries
9. **`fix-foreign-key-relationship.sql`** - Foreign key setup and verification
10. **`update-icons.sql`** - FontAwesome icon updates
11. **`topic-migration.sql`** - Topic (Unit) table and optional menu wiring
12. **`supabase-migration-qr-attendance.sql`** - Tabel `attendance_session`, `attendance_scan_log`, perubahan `absen`
13. **`supabase-migration-qr-security.sql`** - Kolom device/location & index (device+time)
14. **`supabase-migration-qr-devicehash.sql`** - Kolom `device_hash_client`, `device_hash_uaip` & index

15. (Optional) Add subject guide column
  ```sql
  alter table subject add column if not exists subject_guide text;
  ```
  - RLS note: if RLS is enabled on subject, ensure appropriate update/insert policies allow writing `subject_guide` for admins.

16. (Optional) Add topic planner column
  ```sql
  alter table topic add column if not exists topic_planner text;
  ```
  - If RLS is enabled on `topic`, ensure insert/update policies allow admins/owners to write `topic_planner`.

### **Development:**
```bash
npm install
npm run dev
# Access: http://localhost:3000
```

### **Key Environment:**
- **Supabase URL**: https://gzucqoupjfnwkesgyybc.supabase.co
- **Default Admin**: admin/password (change after setup)

**Attendance (QR) Environment:**
- `ATTENDANCE_CENTER_LAT` / `ATTENDANCE_CENTER_LNG` / `ATTENDANCE_RADIUS_M` — pusat kampus dan radius (meter). Radius 0 menonaktifkan geofence (lokasi tetap wajib).
- `ATTENDANCE_DEVICE_WINDOW_MIN` — jendela waktu deteksi multi-user perangkat (menit).
- `ATTENDANCE_BLOCK_MULTI_USER` — `true` memblokir scan kedua; `false` hanya menandai (flag) di log dan response sukses.
- `ATTENDANCE_MULTI_MATCH` — `client_strict` (hanya hash klien) atau `client_or_uaip` (tambahkan UA+IP).

### **Additional Files:**
- **`SETUP_SUPABASE.md`** - Supabase setup instructions
- **`disable-rls.sql`** - Disable RLS for development
- **`update-icons.*`** - Tools for updating FontAwesome icons

## 🔐 **Role-Based Access Control**

### **Admin (`is_admin = true`):**
- All `/data/*` management pages
- User management
- Assessment approval
- Full system access

### **Teacher (`is_teacher = true`):**
- Assessment submission
- Grade entry (`/teacher/nilai`)
- View own subjects
- Dashboard access

### **Student (`is_student = true`):**
- QR Attendance Scan at `/student/scan`
- Student dashboard access and UI elements relevant to students
- Notes: Scan requires geolocation permission and uses a stable client device hash as part of anti-abuse checks

### **Staff (default):**
- Dashboard access only
- Limited view permissions

### Access flow (guards)
- Client: `AccessGuard` reads role flags and menu permissions; it constructs an allowed paths list and updates the `allowed_paths` cookie for SSR. It applies role-based overrides for Counselor (`/data/consultation`), Teacher (`/teacher`, `/teacher/assessment_submission`), and Student (`/student`, `/student/scan`). Admins bypass.
- Server (Edge): `middleware.ts` protects `/data/:path*`, `/settings/:path*`, `/teacher/:path*`, and `/student/:path*`. It allows admins or any path present in the `allowed_paths` cookie; otherwise redirects to `/dashboard?forbidden=1`.

## 📋 **Common Issues & Solutions**

### **1. Icons Not Showing:**
- **Issue**: Using CSS classes instead of React components
- **Fix**: Import and use FontAwesome React components

### **2. Teacher Filter Not Working:**
- **Issue**: Supabase relationship not found
- **Fix**: Use RPC function or manual JOIN approach

### **3. Assessment Date Validation:**
- **Issue**: Business rule enforcement
- **Fix**: Client-side validation + server-side backup; for the per-day submission cap (max 2), consider a DB constraint or trigger to prevent race conditions

### **4. Menu Permissions:**
- **Issue**: Wrong role access
- **Fix**: Ensure `menu_permissions` rows exist for the role-menu pairs and that the client fetch uses those permissions

### **5. RLS write blocked on subject-class mapping (detail_kelas)**
- **Issue**: Error when saving subject relations in `/data/class` — `new row violates row-level security policy for table "detail_kelas"` after enabling RLS.
- **Fix (Development)**: Apply the updated `enable-rls-examples.sql` which includes DEV-only write policies for `detail_kelas` (insert/update/delete). This allows client-side management to work under RLS.
- **Production Recommendation**: Remove broad client write access; move writes to server routes (service role bypasses RLS) or restrict with role-based policies so only admins can modify `detail_kelas`.

## 📊 **Database Queries Reference**

### **Get Teachers Only:**
```sql
SELECT u.*, r.role_name FROM users u
JOIN role r ON u.user_role_id = r.role_id  
WHERE u.is_active = true AND r.is_teacher = true;
```

### **Assessment with Relations:**
```sql
SELECT 
  a.*,
  u.user_nama_depan,
  u.user_nama_belakang,
  s.subject_name,
  k.kelas_nama
FROM assessment a
LEFT JOIN users u ON a.assessment_user_id = u.user_id
LEFT JOIN detail_kelas dk ON dk.detail_kelas_id = a.assessment_detail_kelas_id
LEFT JOIN subject s ON s.subject_id = dk.detail_kelas_subject_id
LEFT JOIN kelas k ON k.kelas_id = dk.detail_kelas_kelas_id
ORDER BY a.assessment_tanggal DESC;
```

### **Topics (Units) Queries:**
```sql
-- Topics by teacher (only subjects taught by the user)
SELECT t.*, s.subject_name
FROM topic t
JOIN subject s ON s.subject_id = t.topic_subject_id
WHERE s.subject_user_id = :user_id
ORDER BY t.topic_nama;

-- Topics by subject
SELECT *
FROM topic
WHERE topic_subject_id = :subject_id
ORDER BY topic_nama;
```

### **Assessment Calendar (View + RPC)**

To support a dashboard calendar that shows the number of assessments per class per day, use this view and RPC. Note: uses detail_kelas_kelas_id and detail_kelas_subject_id per the schema.

```sql
-- View: daily counts per class
create or replace view v_assessment_calendar as
select
  a.assessment_tanggal::date as day,
  k.kelas_id,
  k.kelas_nama,
  count(*)::int as assessment_count
from assessment a
join detail_kelas dk on dk.detail_kelas_id = a.assessment_detail_kelas_id
join kelas k on k.kelas_id = dk.detail_kelas_kelas_id
where a.assessment_status = 1 -- only approved
group by 1,2,3;

-- RPC: ranged query with optional class filter
create or replace function f_assessment_calendar_range(
  p_from date,
  p_to date,
  p_kelas_id integer default null
)
returns table(day date, kelas_id integer, kelas_nama text, assessment_count int)
language sql stable as $$
  select day, kelas_id, kelas_nama, assessment_count
  from v_assessment_calendar
  where day between p_from and p_to
    and (p_kelas_id is null or kelas_id = p_kelas_id)
  order by day, kelas_nama;
$$;
```

Client usage (example): fetch range for the visible month, then group by day in the UI.

Note on colors: The UI applies semantic colors by joining `kelas.kelas_color_name`. Optionally include this field in the view to avoid an extra lookup:

```sql
-- Extended view with kelas_color_name
create or replace view v_assessment_calendar as
select
  a.assessment_tanggal::date as day,
  k.kelas_id,
  k.kelas_nama,
  k.kelas_color_name,
  count(*)::int as assessment_count
from assessment a
join detail_kelas dk on dk.detail_kelas_id = a.assessment_detail_kelas_id
join kelas k on k.kelas_id = dk.detail_kelas_kelas_id
where a.assessment_status = 1 -- only approved
group by 1,2,3,4;
```


### **Subject with Teacher & Unit:**
```sql
SELECT s.*, u.user_nama_depan, u.user_nama_belakang, un.unit_name
FROM subject s
LEFT JOIN users u ON s.subject_user_id = u.user_id
LEFT JOIN unit un ON s.subject_unit_id = un.unit_id;
```

## ✅ **System Status**

### **Completed Features:**
- ✅ Authentication system
- ✅ User & role management  
- ✅ Academic data management (unit, year, class, subject)
- ✅ Assessment submission (teacher)
- ✅ Assessment approval (admin)
- ✅ Role-based menu system
- ✅ FontAwesome icon integration
- ✅ Teacher filtering in subject management
- ✅ Topic (Unit) CRUD for teachers (scoped to own subjects)
- ✅ Door Greeter weekly duty with dashboard notification
- ✅ Timetable weekly recurring schedule (client overlap checks)

### **Key Business Rules:**
- ✅ Only teachers can submit assessments
- ✅ Assessment submission has 2-day limit
- ✅ Only admins can approve/reject assessments
- ✅ Subject assignment only to teachers
- ✅ Menu visibility based on user role
- ✅ One Door Greeter per weekday (proposed unique constraint)
- ✅ No timetable overlap per teacher+day (client-side; DB constraint proposed)

## 📁 **Project Structure**

### **Key Directories:**
- `/src/app/` - Next.js pages (dashboard, login, data management, teacher)
- `/src/components/` - Reusable UI components
- `/src/lib/` - Utilities (Supabase client, utils)
- `/public/` - Static assets

### **Important Files:**
- **`MAIN_DOCUMENTATION.md`** - This complete documentation
- **`SETUP_SUPABASE.md`** - Database setup instructions
- **`package.json`** - Dependencies and scripts
- **`*.sql`** - Database migration files (run in order)

**System is fully functional and ready for production use.** 🎉

---

## 📝 Recent Changes (Aug 2025)

- Assessment status model standardized to numeric values (0/1/2/3) with UI support for status 3 (Waiting for principal approval)
- Principal approval flow: principals see only status 3; Approve → status 0, Reject → status 2
- Assessment Approval page fully localized (en/id/zh), with locale-aware dates
- Added i18n keys: `assessmentApproval.statusWaitingPrincipal`, `assessmentApproval.allSubjects`, `assessmentApproval.allTeachers`
- Chinese translations file (`zh.json`) fixed (syntax) and expanded for Assessment Approval
- Subject/Teacher filter placeholders updated to “All Subjects/All Teachers” across locales
- Switched remaining raw Font Awesome <i> usages to React FontAwesomeIcon components
- Sidebar improvements: root detection by null/undefined parent, menu ordering by numeric `menu_order`, header text set to “School System”
- New: Topic (Unit) table and CRUD page at `/data/topic`; teachers see only their subjects and their topics
