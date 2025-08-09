# School Admin System - Complete Documentation

## 🏗️ **Database Structure**

### **Core Tables:**
```sql
-- Users & Authentication
users (
  user_id SERIAL PRIMARY KEY,
  user_nama_depan VARCHAR(50),
  user_nama_belakang VARCHAR(50),
  user_username VARCHAR(50) UNIQUE,
  user_password VARCHAR(255),
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
  is_principal BOOLEAN DEFAULT false
)

-- Academic Structure
unit (
  unit_id SERIAL PRIMARY KEY,
  unit_name VARCHAR(100)
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
  kelas_year_id INTEGER REFERENCES year(year_id) -- Tahun Ajaran
)

subject (
  subject_id SERIAL PRIMARY KEY,
  subject_name VARCHAR(100),
  subject_user_id INTEGER REFERENCES users(user_id), -- Teacher
  subject_unit_id INTEGER REFERENCES unit(unit_id)
)

-- Assessment System
assessment (
  assessment_id SERIAL PRIMARY KEY,
  assessment_nama VARCHAR(200),
  assessment_deskripsi TEXT,
  assessment_tanggal DATE,
  assessment_user_id INTEGER REFERENCES users(user_id), -- Teacher
  assessment_subject_id INTEGER REFERENCES subject(subject_id),
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
  menu_url VARCHAR(200),
  menu_icon VARCHAR(50),
  menu_order INTEGER,
  menu_parent_id INTEGER,
  menu_type VARCHAR(20), -- 'admin', 'teacher', 'staff'
  is_active BOOLEAN DEFAULT true,
  is_visible BOOLEAN DEFAULT true
)
```

## 🎯 **System Modules & Features**

### **1. Authentication & User Management**
- **Login**: `/login` - User authentication
- **Dashboard**: `/dashboard` - Simple welcome page with profile picture and name
- **User Profile**: `/profile` - Complete profile management with photo upload
- **User Management**: `/data/user` - User CRUD, role management (Admin only)
- **Access**: All authenticated users for dashboard/profile, Admin only for user management
- **Key Tables**: `users`, `role`

### **2. Academic Data Management**
- **Units**: `/data/unit` - Manage school units
- **Years**: `/data/year` - Manage academic years
- **Classes**: `/data/class` - Manage classes with wali kelas and academic year association
- **Subjects**: `/data/subject` - Manage subjects with teachers
- **Access**: Admin only
- **Key Tables**: `unit`, `year`, `kelas`, `subject`
- **New Feature**: Classes now linked to academic years via `kelas_year_id` foreign key

### **3. Assessment System**
#### **Teacher Workflow**:
- **Path**: `/teacher/assessment_submission`
- **Features**: Submit assessments with date validation
- **Business Rule**: Cannot submit if date difference > 2 days
- **Status Flow**: `pending` → admin review

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
- **Access**: All authenticated users

### **6. Internationalization (i18n)**
- **Languages**: English (en), Indonesian (id), Chinese (zh)
- **Implementation**: Custom provider `useI18n`, JSON dictionaries per locale.
- **Recent Additions**:
  - Full localization for Assessment Approval, including statuses and notifications
  - New keys: `assessmentApproval.statusWaitingPrincipal`, `assessmentApproval.allSubjects`, `assessmentApproval.allTeachers`
  - Chinese dictionary fixed and extended; placeholders and titles are localized

### **7. UI/UX Improvements**
- **Assessment Approval Filters**:
  - Subject/Teacher default options now use dedicated i18n placeholders (All Subjects/All Teachers)
  - For principals, status filter is constrained to Waiting for principal approval (status = 3)
- **Badges & Icons**: Consistent FontAwesome icon usage; added status badge for status 3

## 🔧 **Technical Implementation**

### **Frontend Stack:**
- **Framework**: Next.js 14 with App Router
- **UI**: Tailwind CSS + Custom Components
- **Icons**: FontAwesome React Components
- **Forms**: React Hook Form + Validation
- **State**: React useState/useEffect

### **Backend & Database:**
- **Database**: Supabase PostgreSQL
- **Auth**: Custom authentication with localStorage
- **API**: Supabase client-side queries
- **Real-time**: Supabase subscriptions

### **Key Technical Notes:**
1. **FontAwesome**: Use React components, not CSS classes
   ```jsx
   // ✅ Correct
   <FontAwesomeIcon icon={faEdit} />
   // ❌ Wrong  
   <i className="fas fa-edit"></i>
   ```

2. **Teacher Filter**: Use RPC function or manual JOIN
   ```sql
   -- RPC Function
   SELECT * FROM get_teacher_users();
   
   -- Manual JOIN fallback
   SELECT u.*, r.role_name FROM users u 
   JOIN role r ON u.user_role_id = r.role_id 
   WHERE r.is_teacher = true;
   ```

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

### **Development:**
```bash
npm install
npm run dev
# Access: http://localhost:3000
```

### **Key Environment:**
- **Supabase URL**: https://gzucqoupjfnwkesgyybc.supabase.co
- **Default Admin**: admin/password (change after setup)

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
- View own subjects
- Dashboard access

### **Staff (default):**
- Dashboard access only
- Limited view permissions

## 📋 **Common Issues & Solutions**

### **1. Icons Not Showing:**
- **Issue**: Using CSS classes instead of React components
- **Fix**: Import and use FontAwesome React components

### **2. Teacher Filter Not Working:**
- **Issue**: Supabase relationship not found
- **Fix**: Use RPC function or manual JOIN approach

### **3. Assessment Date Validation:**
- **Issue**: Business rule enforcement
- **Fix**: Client-side validation + server-side backup

### **4. Menu Permissions:**
- **Issue**: Wrong role access
- **Fix**: Check `menu_type` vs user role in sidebar

## 📊 **Database Queries Reference**

### **Get Teachers Only:**
```sql
SELECT u.*, r.role_name FROM users u
JOIN role r ON u.user_role_id = r.role_id  
WHERE u.is_active = true AND r.is_teacher = true;
```

### **Assessment with Relations:**
```sql
SELECT a.*, u.user_nama_depan, u.user_nama_belakang, s.subject_name
FROM assessment a
LEFT JOIN users u ON a.assessment_user_id = u.user_id
LEFT JOIN subject s ON a.assessment_subject_id = s.subject_id
ORDER BY a.assessment_tanggal DESC;
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

### **Key Business Rules:**
- ✅ Only teachers can submit assessments
- ✅ Assessment submission has 2-day limit
- ✅ Only admins can approve/reject assessments
- ✅ Subject assignment only to teachers
- ✅ Menu visibility based on user role

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
