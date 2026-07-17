# Database Schema & Relationships

## 1. User Management Domain (`/data/user`)

This domain handles the core users of the system, their roles, and organizational units. It is centered around the `users` table.

### 1.1 Tables

#### `users`
The main table storing user accounts (staff, teachers, admin, students, etc).

| Column Name | Type | Description / Constraint |
| --- | --- | --- |
| `user_id` | `SERIAL` | Primary Key |
| `user_nama_depan` | `VARCHAR(100)` | First Name |
| `user_nama_belakang`| `VARCHAR(100)` | Last Name |
| `user_email` | `VARCHAR(100)` | Unique, User's email |
| `user_role_id` | `INTEGER` | Foreign Key to `role(role_id)` |
| `user_unit_id` | `INTEGER` | Foreign Key to `unit(unit_id)` |
| `is_active` | `BOOLEAN` | Default `true` |
| `user_profile_picture`| `TEXT` | URL to profile picture |
| `user_phone` | `VARCHAR(20)` | Phone number |
| `user_bio` | `TEXT` | Biography/Notes |
| `user_birth_date` | `DATE` | Date of birth |
| `user_address` | `TEXT` | Address |
| `user_pin` | `VARCHAR` | PIN for machine attendance |
| `expected_check_in` | `TIME` | Expected arrival time |
| `expected_check_out`| `TIME` | Expected departure time |
| `join_date` | `DATE` | Date joined |
| `user_theme` | `VARCHAR` | User UI theme preference |
| `user_password_hash`| `VARCHAR` | Bcrypt password hash |
| `user_created_at` | `TIMESTAMP` | Record creation date |
| `user_updated_at` | `TIMESTAMP` | Record update date |

> [!NOTE]
> `user_username` column existed previously but was dropped during migration (`drop-user-username-column.sql`).

#### `role`
Defines the permissions and types of users in the system.

| Column Name | Type | Description / Constraint |
| --- | --- | --- |
| `role_id` | `SERIAL` | Primary Key |
| `role_name` | `VARCHAR(50)` | Name of the role (e.g. Admin, Teacher, Staff) |
| `is_teacher` | `BOOLEAN` | Default `false` |
| `is_admin` | `BOOLEAN` | Default `false` |
| `is_principal` | `BOOLEAN` | Default `false` |
| `is_student` | `BOOLEAN` | Default `false` |
| `is_vendor` | `BOOLEAN` | Flag for vendor roles |
| `is_part_time_staff`| `BOOLEAN` | Flag for part-time staff |
| `work_days` | `VARCHAR` | CSV of work days (e.g. "1,2,3,4,5" for Mon-Fri) |

#### `unit`
Represents the school level, department or division the user belongs to.

| Column Name | Type | Description / Constraint |
| --- | --- | --- |
| `unit_id` | `SERIAL` | Primary Key |
| `unit_name` | `VARCHAR(100)`| Name (e.g. Primary, Secondary, Management) |
| `is_school` | `BOOLEAN` | `true` for school unit, `false` for management |


### 1.2 ERD / Relationships (User Domain)

```mermaid
erDiagram
    role ||--o{ users : "assigns"
    unit ||--o{ users : "belongs_to"
    
    role {
        int role_id PK
        string role_name
        boolean is_teacher
        boolean is_admin
    }
    
    unit {
        int unit_id PK
        string unit_name
        boolean is_school
    }
    
    users {
        int user_id PK
        string user_email UK
        int user_role_id FK
        int user_unit_id FK
        string user_nama_depan
        string user_password_hash
        boolean is_active
    }
```

### 1.3 Tables referencing `users`
Many tables in the system reference `users` for ownership, assignment or action tracking:
- **Academic Setup:** `kelas` (`kelas_user_id` as Wali Kelas)
- **Subjects:** `subject` (`subject_user_id` as Teacher)
- **Assessments:** `assessment` (`assessment_user_id` as Teacher)
- **Timetable:** `timetable` (`timetable_user_id`)
- **Greeter:** `daftar_door_greeter` (`daftar_door_greeter_user_id`)
- **Attendance:** `attendance`, `attendance_scan_log`
- **Leave/Quota:** `leave_quotas` (`user_id`), `leave_requests` (`user_id`)
- **Purchasing:** `unit_approvers` (`user_id`), `role_approvers` (`user_id`)
- **Logs/Tracking:** Countless tables via `created_by_user_id`

---

## 2. Academic & Class Management Domain (`/data/class`)

This domain handles the core structure for academic years, classes, and assigning students and subjects to these classes.

### 2.1 Tables

#### `year`
Stores the academic years.

| Column Name | Type | Description / Constraint |
| --- | --- | --- |
| `year_id` | `SERIAL` | Primary Key |
| `year_name` | `VARCHAR(50)` | Unique, e.g. "2025/2026" |
| `start_date` | `DATE` | Start date of the academic year |
| `end_date` | `DATE` | End date of the academic year |

#### `kelas`
The main table for classes.

| Column Name | Type | Description / Constraint |
| --- | --- | --- |
| `kelas_id` | `SERIAL` | Primary Key |
| `kelas_nama` | `VARCHAR(50)` | Name of the class (e.g. "7A") |
| `kelas_user_id` | `INTEGER` | FK to `users(user_id)` (Wali Kelas / Homeroom Teacher) |
| `kelas_unit_id` | `INTEGER` | FK to `unit(unit_id)` |
| `kelas_year_id` | `INTEGER` | FK to `year(year_id)` |
| `kelas_color_name` | `VARCHAR(20)` | UI badge color ('success', 'warning', 'error') |

#### `detail_kelas`
Maps a class to a specific subject, and assigns a teacher who will teach that subject for that class.

| Column Name | Type | Description / Constraint |
| --- | --- | --- |
| `detail_kelas_id` | `SERIAL` | Primary Key |
| `detail_kelas_subject_id` | `INTEGER` | FK to `subject(subject_id)` |
| `detail_kelas_kelas_id` | `INTEGER` | FK to `kelas(kelas_id)` |
| `teacher_user_id` | `INTEGER` | FK to `users(user_id)` (Subject Teacher) |

#### `detail_siswa`
Assigns a student to a specific class.

| Column Name | Type | Description / Constraint |
| --- | --- | --- |
| `detail_siswa_id` | `SERIAL` | Primary Key |
| `detail_siswa_kelas_id` | `INTEGER` | FK to `kelas(kelas_id)` |
| `detail_siswa_user_id` | `INTEGER` | FK to `users(user_id)` (The Student) |

### 2.2 ERD / Relationships (Class Domain)

```mermaid
erDiagram
    year ||--o{ kelas : "has"
    unit ||--o{ kelas : "has"
    users ||--o{ kelas : "wali_kelas"
    
    kelas ||--o{ detail_kelas : "teaches_subject"
    subject ||--o{ detail_kelas : "assigned_to"
    users ||--o{ detail_kelas : "taught_by"
    
    kelas ||--o{ detail_siswa : "has_student"
    users ||--o{ detail_siswa : "is_student"
    
    year {
        int year_id PK
        string year_name
        date start_date
        date end_date
    }
    
    kelas {
        int kelas_id PK
        string kelas_nama
        int kelas_user_id FK
        int kelas_unit_id FK
        int kelas_year_id FK
    }
    
    detail_kelas {
        int detail_kelas_id PK
        int detail_kelas_subject_id FK
        int detail_kelas_kelas_id FK
        int teacher_user_id FK
    }
    
    detail_siswa {
        int detail_siswa_id PK
        int detail_siswa_kelas_id FK
        int detail_siswa_user_id FK
    }
    
    subject {
        int subject_id PK
        string subject_name
    }
```

---

## 3. Curriculum & Topics Domain (`/data/topic-new`)

This domain manages the academic curriculum, focusing on subjects and their detailed topics (IB MYP Unit Planners).

### 3.1 Tables

#### `subject`
Represents the subjects taught in the school.

| Column Name | Type | Description / Constraint |
| --- | --- | --- |
| `subject_id` | `SERIAL` | Primary Key |
| `subject_name` | `VARCHAR(100)` | Name of the subject |
| `subject_user_id` | `INTEGER` | FK to `users(user_id)` (Subject Coordinator/Teacher) |
| `subject_unit_id` | `INTEGER` | FK to `unit(unit_id)` |
| `subject_code` | `VARCHAR(30)` | Short code (e.g., MATH7A) |
| `subject_guide` | `TEXT` | URL to subject guide (Google Drive/PDF) |
| `grading_method` | `VARCHAR(20)` | IB MYP grading calculation method ('highest', 'average', 'median', 'mode'). Default 'highest' |

#### `topic`
Represents an IB MYP Unit Planner / Topic. Contains extensive fields for IB MYP planning.

| Column Name | Type | Description / Constraint |
| --- | --- | --- |
| `topic_id` | `SERIAL` | Primary Key |
| `topic_nama` | `VARCHAR(100)` | Unit Title / Topic Name |
| `topic_subject_id` | `INTEGER` | FK to `subject(subject_id)` |
| `topic_kelas_id` | `INTEGER` | FK to `kelas(kelas_id)` (Binds topic to a specific class) |
| `topic_year` | `VARCHAR` | Academic year context |
| `topic_urutan` | `INTEGER` | Ordering / Sequence of the topic |
| `topic_duration` | `INTEGER` | Duration in weeks |
| `topic_hours_per_week` | `INTEGER` | Hours per week |
| `topic_planner` | `TEXT` | URL to external planner |
| `topic_inquiry_question` | `TEXT` | Factual, Conceptual, Debatable questions |
| `topic_global_context` | `TEXT` | IB Global Context |
| `topic_gc_exploration` | `TEXT` | IB Global Context Exploration |
| `topic_key_concept` | `TEXT` | IB Key Concept |
| `topic_related_concept` | `TEXT` | IB Related Concepts |
| `topic_statement` | `TEXT` | Statement of Inquiry |
| `topic_conceptual_understanding`| `TEXT` | Conceptual Understanding |
| `topic_learner_profile` | `TEXT` | Learner Profile Attributes |
| `topic_service_learning` | `TEXT` | Service as action / Service learning |
| `topic_atl` | `TEXT` | Approaches to Learning (ATL) skills |
| `topic_learning_process` | `TEXT` | Learning Process description |
| `topic_formative_assessment`| `TEXT` | Formative assessments |
| `topic_summative_assessment`| `TEXT` | Summative assessments |
| `topic_relationship_summative_assessment_statement_of_inquiry` | `TEXT` | Relationship description |
| `topic_reflection_prior` | `TEXT` | Reflection prior to teaching |
| `topic_reflection_after` | `TEXT` | Reflection after teaching |

### 3.2 ERD / Relationships (Curriculum Domain)

```mermaid
erDiagram
    subject ||--o{ topic : "has_topics"
    kelas ||--o{ topic : "taught_in"
    users ||--o{ subject : "coordinates"
    unit ||--o{ subject : "belongs_to"
    
    subject {
        int subject_id PK
        string subject_name
        string subject_code
        int subject_user_id FK
        int subject_unit_id FK
    }
    
    topic {
        int topic_id PK
        string topic_nama
        int topic_subject_id FK
        int topic_kelas_id FK
        string topic_year
        int topic_duration
    }
    
    kelas {
        int kelas_id PK
    }
    
    users {
        int user_id PK
    }
```

---

## 4. Purchasing & Budgeting Domain (`/data/fpb`)

This domain handles the 'Form Pengajuan Barang' (FPB) or Purchase Request system, tracking requests, line items, and multi-step approvals.

### 4.1 Tables

#### `fpb`
The main header table for a purchase request.

| Column Name | Type | Description / Constraint |
| --- | --- | --- |
| `fpb_id` | `SERIAL` | Primary Key |
| `fpb_number` | `VARCHAR` | Unique identifier/document number |
| `fpb_type_id` | `INTEGER` | FK to `fpb_types` (e.g. General, Special) |
| `division` | `VARCHAR` | Division requesting the items |
| `submitted_by` | `INTEGER` | FK to `users(user_id)` |
| `grand_total` | `DECIMAL` | Total amount of the request |
| `note` | `TEXT` | Additional notes or justification |
| `usage_date` | `DATE` | When the items are needed |
| `status` | `VARCHAR` | `pending`, `approved`, `revision`, `rejected` |
| `current_step` | `INTEGER` | The current approval step |
| `revision_count` | `INTEGER` | Number of times revised |

#### `fpb_items`
The line items requested within an FPB.

| Column Name | Type | Description / Constraint |
| --- | --- | --- |
| `item_id` | `SERIAL` | Primary Key |
| `fpb_id` | `INTEGER` | FK to `fpb(fpb_id)` |
| `item_name` | `VARCHAR` | Name of the requested item |
| `quantity` | `INTEGER` | Quantity requested |
| `unit` | `VARCHAR` | Unit of measurement (pcs, box, etc) |
| `unit_price` | `DECIMAL` | Estimated price per unit |

#### `fpb_approvals`
Tracks the approval state for each required step of an FPB.

| Column Name | Type | Description / Constraint |
| --- | --- | --- |
| `approval_id` | `SERIAL` | Primary Key |
| `fpb_id` | `INTEGER` | FK to `fpb(fpb_id)` |
| `step_order` | `INTEGER` | Sequence of approval (1, 2, 3...) |
| `step_name` | `VARCHAR` | Name of the step (e.g. Principal Approval) |
| `approver_user_id`| `INTEGER` | FK to `users(user_id)` |
| `approver_role_id`| `INTEGER` | FK to `role(role_id)` (Role-based approver) |
| `status` | `VARCHAR` | `pending`, `approved`, `rejected` |
| `comment` | `TEXT` | Approver's note |
| `action_at` | `TIMESTAMP` | When the approval was actioned |

#### `fpb_types` & `fpb_approval_steps`
Configuration tables that define the types of FPB and the default approval routing steps for each type.

#### `fpb_role_approvers`
Maps a specific role to up to 3 specific users who can act as approvers on behalf of that role.

### 4.2 ERD / Relationships (Purchasing Domain)

```mermaid
erDiagram
    users ||--o{ fpb : "submits"
    fpb_types ||--o{ fpb : "categorizes"
    fpb ||--|{ fpb_items : "contains"
    fpb ||--|{ fpb_approvals : "requires"
    users ||--o{ fpb_approvals : "approves"
    role ||--o{ fpb_approvals : "approves_as"
    
    fpb {
        int fpb_id PK
        string fpb_number
        int fpb_type_id FK
        int submitted_by FK
        string status
        int current_step
    }
    
    fpb_items {
        int item_id PK
        int fpb_id FK
        string item_name
        int quantity
        decimal unit_price
    }
    
    fpb_approvals {
        int approval_id PK
        int fpb_id FK
        int approver_user_id FK
        int approver_role_id FK
        string status
        int step_order
    }
    
    fpb_types {
        int fpb_type_id PK
        string type_name
    }
```

---

## 5. Attendance & Leave Management Domain (`/data/attendance-settings`)

This domain handles the attendance settings, special days, holidays, notifications, and approver mappings.

### 5.1 Tables

#### `school_holidays`
Stores global or role-specific school holidays.

| Column Name | Type | Description / Constraint |
| --- | --- | --- |
| `id` | `SERIAL` | Primary Key |
| `name` | `VARCHAR` | Name of the holiday |
| `date_start` | `DATE` | Start date of the holiday |
| `date_end` | `DATE` | End date of the holiday |
| `role_id` | `INTEGER` | FK to `role(role_id)`. Null for global holiday. |
| `date` | `DATE` | Backward compatibility |

#### `special_day_rules`
Stores custom attendance rules for specific dates (e.g., event days) affecting all, a role, or a single user.

| Column Name | Type | Description / Constraint |
| --- | --- | --- |
| `id` | `SERIAL` | Primary Key |
| `tanggal` | `DATE` | Date the rule applies to |
| `scope_type` | `VARCHAR` | Scope: `all`, `role`, or `user` |
| `role_id` | `INTEGER` | FK to `role(role_id)` (if scope_type is `role`) |
| `user_id` | `INTEGER` | FK to `users(user_id)` (if scope_type is `user`) |
| `is_work_day` | `BOOLEAN` | Indicates if this day requires attendance |
| `custom_check_in` | `TIME` | Overrides default check-in time |
| `custom_check_out`| `TIME` | Overrides default check-out time |
| `keterangan` | `TEXT` | Notes |
| `created_at` | `TIMESTAMP`| Record creation time |

#### `attendances`
Stores the raw machine scan logs. Note: Check-in vs check-out is determined dynamically via time midpoint, not `status_scan`.

| Column Name | Type | Description / Constraint |
| --- | --- | --- |
| `id` | `SERIAL` | Primary Key |
| `user_id` | `INTEGER` | FK to `users(user_id)` |
| `scan_time` | `TIMESTAMPTZ`| When the user scanned |
| `status_scan` | `VARCHAR` | Check-in or check-out (not fully reliable) |

#### `attendance_excuses`
Stores excuse forms (surat keterangan) for attendance anomalies (late, absent, etc).

| Column Name | Type | Description / Constraint |
| --- | --- | --- |
| `id` | `SERIAL` | Primary Key |
| `user_id` | `INTEGER` | FK to `users(user_id)` (The submitter) |
| `excuse_type` | `VARCHAR` | `late`, `leave_early`, `absent`, `no_checkin`, `no_checkout` |
| `attendance_date`| `DATE` | The date of the anomaly |
| `late_minutes` | `INTEGER` | Minutes late (if applicable) |
| `category` | `VARCHAR` | Reason category (e.g. sick, annual_leave) |
| `other_reason` | `TEXT` | Additional explanation |
| `attachment_url` | `TEXT` | URL to attached proof |
| `status` | `VARCHAR` | `pending`, `approved_1`, `approved`, `rejected` |
| `approver1_id` | `INTEGER` | FK to `users(user_id)` |
| `approver2_id` | `INTEGER` | FK to `users(user_id)` |
| `approver1_action`| `VARCHAR` | `approved` or `rejected` |
| `approver1_note` | `TEXT` | Note from approver 1 |
| `approver1_at` | `TIMESTAMP`| Action timestamp |
| `approver2_action`| `VARCHAR` | `approved` or `rejected` |
| `approver2_note` | `TEXT` | Note from approver 2 |
| `approver2_at` | `TIMESTAMP`| Action timestamp |

#### `user_position_history`
Tracks the position title of a user over time for reporting.

| Column Name | Type | Description / Constraint |
| --- | --- | --- |
| `id` | `SERIAL` | Primary Key |
| `user_id` | `INTEGER` | FK to `users(user_id)` |
| `position_title` | `VARCHAR` | Title of the position |
| `start_date` | `DATE` | When the position started |
| `end_date` | `DATE` | When the position ended (null if active) |

#### `role_approvers`
Maps roles to their specific approvers (used for leave/attendance requests).

| Column Name | Type | Description / Constraint |
| --- | --- | --- |
| `role_id` | `INTEGER` | Primary Key, FK to `role(role_id)` |
| `approver1_id` | `INTEGER` | FK to `users(user_id)` (First approver) |
| `approver2_id` | `INTEGER` | FK to `users(user_id)` (Second approver, optional) |

#### `settings`
Global configuration key-value store.

| Column Name | Type | Description / Constraint |
| --- | --- | --- |
| `key` | `VARCHAR` | Primary Key (e.g., `attendance_notif_admin_emails`) |
| `value` | `TEXT` | Value of the setting |

#### `attendance_notification_log`
Tracks attendance violation emails sent to users.

| Column Name | Type | Description / Constraint |
| --- | --- | --- |
| `id` | `SERIAL` | Primary Key |
| `user_id` | `INTEGER` | FK to `users(user_id)` |
| `notif_date` | `DATE` | Target date of the attendance issue |
| `notif_type` | `VARCHAR` | E.g., `late`, `leave_early`, `no_checkin`, `no_checkout` |
| `minutes_diff` | `INTEGER` | Minutes late or early |
| `scheduled_time`| `TIME` | Expected time |
| `actual_time` | `TIME` | Actual scan time |
| `email_to` | `JSON/ARRAY`| Email recipient(s) |
| `success` | `BOOLEAN` | True if sent successfully, null if skipped |
| `sent_at` | `TIMESTAMP`| When the email was sent |

#### `attendance_notify_run_log`
Tracks the daily run of the cron job that processes attendance notifications.

| Column Name | Type | Description / Constraint |
| --- | --- | --- |
| `id` | `SERIAL` | Primary Key |
| `ran_at` | `TIMESTAMP`| Default to now() |
| `target_date` | `DATE` | The date being processed (usually yesterday) |
| `users_processed` | `INTEGER` | Number of users analyzed |
| `violations_found`| `INTEGER` | Total issues found |
| `emails_sent` | `INTEGER` | Total emails sent |
| `emails_failed` | `INTEGER` | Total emails failed |
| `admin_emails` | `JSON/ARRAY`| Admin email recipients |
| `admin_email_ok`| `BOOLEAN` | Success status of admin summary |
| `skipped_reason`| `TEXT` | Reason if skipping execution |
| `error_message` | `TEXT` | Any error during run |

### 5.2 ERD / Relationships (Attendance Domain)

```mermaid
erDiagram
    role ||--o{ school_holidays : "has_holiday"
    role ||--o{ special_day_rules : "has_rule"
    users ||--o{ special_day_rules : "has_rule"
    role ||--|{ role_approvers : "configured_by"
    users ||--o{ role_approvers : "approver1"
    users ||--o{ role_approvers : "approver2"
    users ||--o{ attendance_notification_log : "receives_notif"
    users ||--o{ attendances : "scans"
    users ||--o{ attendance_excuses : "submits"
    users ||--o{ user_position_history : "has_position"

    school_holidays {
        int id PK
        string name
        date date_start
        date date_end
        int role_id FK
    }

    special_day_rules {
        int id PK
        date tanggal
        string scope_type
        int role_id FK
        int user_id FK
    }

    attendances {
        int id PK
        int user_id FK
        timestamp scan_time
        string status_scan
    }

    attendance_excuses {
        int id PK
        int user_id FK
        string excuse_type
        date attendance_date
        string status
        int approver1_id FK
        int approver2_id FK
    }

    user_position_history {
        int id PK
        int user_id FK
        string position_title
        date start_date
        date end_date
    }

    role_approvers {
        int role_id PK
        int approver1_id FK
        int approver2_id FK
    }

    settings {
        string key PK
        text value
    }

    attendance_notification_log {
        int id PK
        int user_id FK
        date notif_date
        string notif_type
    }
```
