# 📊 School Admin Database Schema Documentation

## 🎯 Overview

Database schema untuk sistem administrasi sekolah yang didesain untuk mengelola user, role, menu permissions, unit organisasi, kelas, dan mata pelajaran.

**Technology Stack:**
- **Database**: Supabase PostgreSQL
- **ORM**: Direct SQL queries via Supabase client
- **Authentication**: Custom authentication system

---

## 📋 Tables Structure

### 1. 👥 `users` - Tabel User/Pengguna

Menyimpan data semua pengguna sistem (admin, guru, staff, siswa).

```sql
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    user_nama_depan VARCHAR(100) NOT NULL,
    user_nama_belakang VARCHAR(100) NOT NULL,
    user_username VARCHAR(50) UNIQUE NOT NULL,
    user_password VARCHAR(255) NOT NULL,  -- bcrypt hashed
    user_role_id INTEGER REFERENCES role(role_id),
    user_unit_id INTEGER REFERENCES unit(unit_id),
    is_active BOOLEAN DEFAULT TRUE
);
```

**Fields:**
- `user_id`: Primary key, auto increment
- `user_nama_depan`: Nama depan pengguna
- `user_nama_belakang`: Nama belakang pengguna
- `user_username`: Username unik untuk login
- `user_password`: Password yang di-hash menggunakan bcrypt
- `user_role_id`: Foreign key ke tabel `role`
- `user_unit_id`: Foreign key ke tabel `unit` (optional)
- `is_active`: Status aktif pengguna

**Sample Data:**
```sql
-- Default admin user (password: 123456)
INSERT INTO users VALUES (
    1, 'Administrator', 'System', 'admin',
    '$2a$10$qqE7esxoiQIKH8uU6xa6ieF5XCTC2q4Gtj3oNHpqZugVgRtbxXUke',
    1, NULL, true
);
```

---

### 2. 🎭 `role` - Tabel Role/Peran

Mendefinisikan peran pengguna dalam sistem.

```sql
CREATE TABLE role (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE
);
```

**Fields:**
- `role_id`: Primary key, auto increment
- `role_name`: Nama peran (admin, guru, staff, siswa)
- `is_admin`: Flag apakah role memiliki akses admin

**Sample Data:**
```sql
INSERT INTO role (role_id, role_name, is_admin) VALUES 
(1, 'admin', true),
(2, 'guru', false),
(3, 'siswa', false),
(4, 'staff', false);
```

---

### 3. 📑 `menus` - Tabel Menu Sistem

Menyimpan struktur menu aplikasi dengan hierarki parent-child.

```sql
CREATE TABLE menus (
    menu_id SERIAL PRIMARY KEY,
    menu_name VARCHAR(100) NOT NULL,
    menu_path VARCHAR(200),  -- URL path, NULL untuk parent menu
    menu_icon VARCHAR(50),   -- FontAwesome icon name
    menu_order INTEGER DEFAULT 0,
    menu_parent_id INTEGER REFERENCES menus(menu_id)
);
```

**Fields:**
- `menu_id`: Primary key, auto increment
- `menu_name`: Nama menu yang ditampilkan
- `menu_path`: URL path menu (NULL untuk parent menu)
- `menu_icon`: Nama icon FontAwesome
- `menu_order`: Urutan tampilan menu
- `menu_parent_id`: Foreign key ke parent menu (NULL untuk main menu)

**Sample Data:**
```sql
INSERT INTO menus VALUES 
(1, 'Dashboard', '/dashboard', 'fas fa-house', 1, NULL),
(2, 'Data Management', NULL, 'fas fa-database', 2, NULL),
(3, 'User Management', '/data/user', 'fas fa-users', 3, 2),
(4, 'Class Management', '/data/class', 'fas fa-graduation-cap', 4, 2),
(5, 'Subject Management', '/data/subject', 'fas fa-book', 5, 2);
```

---

### 4. 🔐 `menu_permissions` - Tabel Permission Menu

Mengatur hak akses menu berdasarkan role.

```sql
CREATE TABLE menu_permissions (
    permissions_id SERIAL PRIMARY KEY,
    menu_id INTEGER NOT NULL REFERENCES menus(menu_id),
    role_id INTEGER NOT NULL REFERENCES role(role_id),
    UNIQUE(menu_id, role_id)
);
```

**Fields:**
- `permissions_id`: Primary key, auto increment
- `menu_id`: Foreign key ke tabel `menus`
- `role_id`: Foreign key ke tabel `role`
- **Constraint**: Kombinasi `menu_id` dan `role_id` harus unik

**Logic:**
- Admin (`is_admin = true`) mendapat akses ke semua menu otomatis
- Non-admin hanya dapat akses menu yang ada di tabel ini

---

### 5. 🏢 `unit` - Tabel Unit Organisasi

Menyimpan unit organisasi sekolah (Elementary, Middle School, High School, dll).

```sql
CREATE TABLE unit (
    unit_id SERIAL PRIMARY KEY,
    unit_name VARCHAR(100) NOT NULL UNIQUE
);
```

**Fields:**
- `unit_id`: Primary key, auto increment
- `unit_name`: Nama unit organisasi

**Sample Data:**
```sql
INSERT INTO unit VALUES 
(1, 'Elementary School'),
(2, 'Middle School'), 
(3, 'High School'),
(4, 'Administration');
```

---

### 6. 🎓 `kelas` - Tabel Kelas

Menyimpan data kelas dengan wali kelas dan unit terkait.

```sql
CREATE TABLE kelas (
    kelas_id SERIAL PRIMARY KEY,
    kelas_nama VARCHAR(50) NOT NULL UNIQUE,
    kelas_user_id INTEGER REFERENCES users(user_id),  -- Wali kelas
    kelas_unit_id INTEGER REFERENCES unit(unit_id)
);
```

**Fields:**
- `kelas_id`: Primary key, auto increment
- `kelas_nama`: Nama kelas (Grade 1A, Grade 2B, dll)
- `kelas_user_id`: Foreign key ke `users` (wali kelas)
- `kelas_unit_id`: Foreign key ke `unit`

**Sample Data:**
```sql
INSERT INTO kelas VALUES 
(1, 'Grade 1A', 2, 1),
(2, 'Grade 2B', 3, 1),
(3, 'Grade 7A', 4, 2);
```

---

### 7. 📚 `subject` - Tabel Mata Pelajaran

Menyimpan data mata pelajaran dengan guru pengampu dan unit terkait.

```sql
CREATE TABLE subject (
    subject_id SERIAL PRIMARY KEY,
    subject_name VARCHAR(100) NOT NULL,
    subject_user_id INTEGER REFERENCES users(user_id),  -- Guru pengampu
    subject_unit_id INTEGER REFERENCES unit(unit_id)
);
```

**Fields:**
- `subject_id`: Primary key, auto increment
- `subject_name`: Nama mata pelajaran
- `subject_user_id`: Foreign key ke `users` (guru pengampu)
- `subject_unit_id`: Foreign key ke `unit`

**Sample Data:**
```sql
INSERT INTO subject VALUES 
(1, 'Mathematics', 2, 1),
(2, 'English Language', 3, 1),
(3, 'Science', 4, 2);
```

---

### 8. 📝 `assessment` - Tabel Assessment

Menyimpan data assessment/penilaian dengan status persetujuan.

```sql
CREATE TABLE assessment (
    assessment_id SERIAL PRIMARY KEY,
    assessment_nama VARCHAR(100) NOT NULL,
    assessment_tanggal DATE NOT NULL,
    assessment_keterangan TEXT,
    assessment_status INTEGER NOT NULL DEFAULT 0,
    assessment_user_id INTEGER NOT NULL REFERENCES users(user_id),
    assessment_subject_id INTEGER NOT NULL REFERENCES subject(subject_id)
);
```

**Fields:**
- `assessment_id`: Primary key, auto increment
- `assessment_nama`: Nama assessment/penilaian
- `assessment_tanggal`: Tanggal assessment
- `assessment_keterangan`: Keterangan/deskripsi assessment (optional)
- `assessment_status`: Status persetujuan (0=Menunggu, 1=Disetujui, 2=Ditolak)
- `assessment_user_id`: Foreign key ke `users` (pengajar)
- `assessment_subject_id`: Foreign key ke `subject` (mata pelajaran)

**Assessment Status Values:**
- `0`: Menunggu Persetujuan (default)
- `1`: Disetujui
- `2`: Ditolak

**Sample Data:**
```sql
INSERT INTO assessment VALUES 
(1, 'Ujian Tengah Semester - Matematika', '2025-03-15', 'Ujian tengah semester untuk kelas 1A', 0, 2, 1),
(2, 'Quiz Harian - English', '2025-03-10', 'Quiz vocabulary dan grammar', 1, 3, 2),
(3, 'Praktikum - Science', '2025-03-20', 'Praktikum eksperimen sederhana', 2, 4, 3);
```

---

## 🔗 Relationships (ERD)

```
users ─┬─ role (many-to-one)
       ├─ unit (many-to-one, optional)
       ├─ kelas.kelas_user_id (one-to-many) 
       ├─ subject.subject_user_id (one-to-many)
       └─ assessment.assessment_user_id (one-to-many)

role ──── menu_permissions (one-to-many)

menus ─┬─ menus.menu_parent_id (self-referencing)
       └─ menu_permissions (one-to-many)

unit ─┬─ users (one-to-many)
      ├─ kelas (one-to-many)
      └─ subject (one-to-many)

subject ─── assessment.assessment_subject_id (one-to-many)
```

---

## 🔍 Common Queries

### Authentication
```sql
-- Login user
SELECT u.*, r.role_name, r.is_admin, un.unit_name 
FROM users u
LEFT JOIN role r ON u.user_role_id = r.role_id
LEFT JOIN unit un ON u.user_unit_id = un.unit_id
WHERE u.user_username = 'admin' AND u.is_active = true;
```

### Menu System
```sql
-- Get menus for admin
SELECT * FROM menus ORDER BY menu_order;

-- Get menus for specific role
SELECT DISTINCT m.* 
FROM menus m
JOIN menu_permissions mp ON m.menu_id = mp.menu_id
JOIN role r ON mp.role_id = r.role_id
WHERE r.role_name = 'guru'
ORDER BY m.menu_order;
```

### Data Management
```sql
-- Get classes with wali kelas and unit info
SELECT k.*, 
       u.user_nama_depan, u.user_nama_belakang,
       un.unit_name
FROM kelas k
LEFT JOIN users u ON k.kelas_user_id = u.user_id
LEFT JOIN unit un ON k.kelas_unit_id = un.unit_id
ORDER BY k.kelas_nama;

-- Get subjects with teacher and unit info
SELECT s.*,
       u.user_nama_depan, u.user_nama_belakang,
       un.unit_name
FROM subject s
LEFT JOIN users u ON s.subject_user_id = u.user_id
LEFT JOIN unit un ON s.subject_unit_id = un.unit_id
ORDER BY s.subject_name;

-- Get assessments with teacher and subject info
SELECT a.*,
       u.user_nama_depan, u.user_nama_belakang,
       s.subject_name
FROM assessment a
LEFT JOIN users u ON a.assessment_user_id = u.user_id
LEFT JOIN subject s ON a.assessment_subject_id = s.subject_id
ORDER BY a.assessment_tanggal DESC;
```

### Assessment Management
```sql
-- Get pending assessments for approval
SELECT a.*,
       u.user_nama_depan || ' ' || u.user_nama_belakang as teacher_name,
       s.subject_name
FROM assessment a
JOIN users u ON a.assessment_user_id = u.user_id
JOIN subject s ON a.assessment_subject_id = s.subject_id
WHERE a.assessment_status = 0
ORDER BY a.assessment_tanggal ASC;

-- Update assessment status (approve/reject)
UPDATE assessment 
SET assessment_status = 1  -- 1 for approve, 2 for reject
WHERE assessment_id = ?;
```

---

## 🛡️ Security Considerations

### 1. **Password Security**
- Passwords di-hash menggunakan bcrypt dengan salt
- Default admin password: `123456` (harus diganti di production)

### 2. **Role-Based Access Control**
- Menu permissions berbasis role
- Admin memiliki akses penuh otomatis
- Non-admin hanya dapat akses menu yang di-assign

### 3. **Data Integrity**
- Foreign key constraints untuk data consistency
- Unique constraints untuk mencegah duplikasi
- NOT NULL constraints untuk field wajib

### 4. **Active Users**
- Field `is_active` untuk soft delete users
- Hanya user aktif yang bisa login

---

## 📈 Performance Optimization

### Indexes
```sql
-- Recommended indexes
CREATE INDEX idx_users_username ON users(user_username);
CREATE INDEX idx_users_role_id ON users(user_role_id);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_menu_permissions_role_id ON menu_permissions(role_id);
CREATE INDEX idx_menus_parent_id ON menus(menu_parent_id);
CREATE INDEX idx_kelas_user_id ON kelas(kelas_user_id);
CREATE INDEX idx_subject_user_id ON subject(subject_user_id);
CREATE INDEX idx_assessment_user_id ON assessment(assessment_user_id);
CREATE INDEX idx_assessment_subject_id ON assessment(assessment_subject_id);
CREATE INDEX idx_assessment_status ON assessment(assessment_status);
CREATE INDEX idx_assessment_tanggal ON assessment(assessment_tanggal);
```

---

## 🚀 Migration Notes

### From Neon to Supabase
- Schema structure tetap sama
- Data berhasil di-migrate
- Environment variables berubah ke Supabase endpoints
- Authentication logic disesuaikan dengan Supabase client

### Key Changes
- Direct database queries via Supabase client
- Removed Go API backend dependencies
- Simplified JOIN queries menjadi separate queries untuk compatibility
- Icon names standardized ke FontAwesome format

---

**📝 Last Updated:** August 2025  
**🎯 Status:** Production Ready  
**🔧 Technology:** Supabase PostgreSQL + Next.js
