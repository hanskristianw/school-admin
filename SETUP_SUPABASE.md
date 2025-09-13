# 🚀 Supabase Connection Fixed!

## ✅ SOLVED: API Key Issues

API key sudah diperbaiki dengan menggunakan secret key yang benar.

## 🔧 Final Configuration:

### Environment Variables (`.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=https://gzucqoupjfnwkesgyybc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6dWNxb3VwamZud2tlc2d5eWJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0NzcyMDIsImV4cCI6MjA2ODA1MzIwMn0.8arMBFFlzG5L_1ctcTp6j6boBES1lDCpxawM903KwdI
```

### ✅ API Key Fixed
- Using correct anon key from Supabase dashboard
- Should now connect successfully without "Invalid API key" error

## 🧪 Testing Steps:

### 1. Restart Development Server
```bash
# Stop server (Ctrl+C) then:
npm run dev
```

### 2. Test Connection
- Visit: `http://localhost:3000/debug/supabase`
- Click **"Test Supabase Connection"**
- All tests should now show ✅ green

### 3. Test Login
- Visit: `http://localhost:3000/login`
- Use credentials from database
- Should connect successfully to Supabase

## 🎯 Expected Results:

After restart, you should see:
- ✅ **connection** - Basic Supabase connection
- ✅ **table_users** - Users table accessible
- ✅ **table_role** - Role table accessible  
- ✅ **table_menus** - Menus table accessible
- ✅ **table_menu_permissions** - Permissions table accessible
- ✅ **roles** - Role data loaded
- ✅ **menus** - Menu data loaded
- ✅ **users** - User data loaded

### 4. ✅ Verifikasi Setup
Setelah migration, cek:
- **Table Editor** → Pastikan tables ada
- **Authentication** → Disabled (kita pakai custom auth)
- **Row Level Security** → Disabled untuk semua tables

### 5. 🧪 Test Connection
- Buka: `http://localhost:3000/debug/supabase`
- Klik **"Test Supabase Connection"**
- Pastikan semua test ✅ hijau

## 🔍 Debug Commands

### Test koneksi manual:
```javascript
import { supabase } from '@/lib/supabase'

// Test basic connection
const { data, error } = await supabase.from('users').select('count')
console.log({ data, error })

// Test tables
const tables = ['users', 'role', 'menus', 'menu_permissions']
for (const table of tables) {
  const result = await supabase.from(table).select('*').limit(1)
  console.log(`${table}:`, result)
}
```

## 📊 Expected Tables After Migration:

- ✅ `role` - User roles (admin, teacher, etc)
- ✅ `users` - User accounts dengan passwords
- ✅ `menus` - Navigation menu items
- ✅ `menu_permissions` - Role-based menu access
- ✅ `unit` - School units/departments
  - Column: `is_school boolean not null default false` (School vs Management)
- ✅ `kelas` - Classes
- ✅ `subject` - Academic subjects

## 🎯 Quick Fix untuk Test:

Jika ingin test tanpa full migration, minimal jalankan ini:

```sql
-- Minimal tables untuk test
CREATE TABLE role (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(255) UNIQUE NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE
);

CREATE TABLE menus (
    menu_id SERIAL PRIMARY KEY,
    menu_name VARCHAR(255) NOT NULL,
    menu_path VARCHAR(255),
    menu_icon VARCHAR(255),
    menu_order INTEGER DEFAULT 0,
    menu_parent_id INTEGER
);

-- Insert test data
INSERT INTO role (role_name, is_admin) VALUES ('admin', true);
INSERT INTO menus (menu_name, menu_path, menu_icon, menu_order) VALUES 
('Dashboard', '/dashboard', 'layout-dashboard', 1);
```

## 🔧 Environment Check:

Pastikan `.env.local` sudah benar:
```env
NEXT_PUBLIC_SUPABASE_URL=https://gzucqoupjfnwkesgyybc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```


**🎯 Next Steps:**
1. Jalankan migration SQL di Supabase Dashboard
2. Test di `/debug/supabase`
3. Login ke aplikasi
4. Enjoy simplified architecture! 🚀

## 🧩 Additional Migrations
### School Fee & UDP

Create tables for defining School Fee (monthly, with optional per-month overrides) and UDP (one-time, with installment plan) per Unit and Academic Year. Run the following SQL (or run the prepared file `supabase-migration-fees.sql`):

```sql
-- See file: supabase-migration-fees.sql
```

Notes:
- Uniqueness is enforced per (unit_id, year_id) for both definitions (only one active per Unit+Year).
- Monthly School Fee supports a 12-length array; null entries fall back to default.
- UDP installment plan enforces unique month per definition and sum equals total (validated in UI).
- RLS is enabled with DEV-friendly policies; tighten to admin-only writes for production.

Menu access:
- Add a menu entry for path `/data/school-fee` in `menus`.
- Grant visibility via `menu_permissions` for non-admin roles as needed. Admin sees all by default.

Add a column to distinguish School vs Management units:

```sql
alter table unit add column if not exists is_school boolean not null default false;
```

If RLS is enabled on `unit`, ensure insert/update policies allow writing `is_school` for admins.

### Uniform Sales Module
Run `supabase-migration-uniform.sql` to create masters (sizes, uniforms), per-size pricing, stock transactions, and sales tables.

Notes:
- DEV policies allow full read/write; restrict in production.
- Add menus for `/data/uniform-size`, `/data/uniform`, `/sales/uniform`, `/reports/uniform` and grant via `menu_permissions` as needed (buyers are always students, but only staff performs sales operations).
- Storage (receipts): Create a PRIVATE bucket `uniform-receipts`. Do NOT enable public read. The app should generate short‑lived signed URLs when users (buyer or staff/admin) view receipts.

Example policy approach (SQL Editor → Storage Policies):
```sql
-- Allow authenticated writes (upload by staff via service route preferable)
-- Read should generally be denied by default and accessed via signed URLs.
-- If you must allow direct reads, scope by ownership (detail_siswa) via custom claims.
```

## 🧰 Menu Icon Normalizer (optional)
To normalize inconsistent `menus.menu_icon` values to what the Sidebar supports, use `update-icons.js` at the repo root.

What it does:
- Converts short names like `users`, `book`, `graduation-cap`, `sack-dollar` → classic class names (`fas fa-users`, `fas fa-book`, `fas fa-graduation-cap`, `fas fa-sack-dollar`).
- Converts alias names like `faUsers`, `faBook`, `faGraduationCap`, `faSackDollar` → classic class names so both old and new entries are consistent.

How to run:
1) Open `update-icons.js` and temporarily uncomment the line `updateIconNames()` at the bottom.
2) Run the app (env must be available for Supabase client). Then execute the script in a Node context that can import the app’s Supabase client, or paste an adapted version into the browser console of a logged-in session.
3) Check the console output for updates and verify via Supabase table `menus`.

Note: The Sidebar supports both `fas fa-...` and `faXxx` formats, but we recommend storing classic class names (`fas fa-...`) in the DB for consistency.

## 📅 Assessment Calendar Setup

Untuk menampilkan jumlah assessment per hari per kelas di Dashboard, jalankan file SQL berikut di Supabase (SQL Editor):

1) Buka file `assessment-calendar.sql` di repo ini, salin seluruh isi, lalu jalankan di Supabase.
2) Pastikan view `v_assessment_calendar` dan function `f_assessment_calendar_range` berhasil dibuat.
3) Grant sudah disertakan untuk anon/authenticated; sesuaikan dengan kebijakan RLS anda jika perlu.

Dengan artifacts ini, frontend bisa mengambil agregasi per bulan menggunakan RPC:
- `rpc('f_assessment_calendar_range', { p_from: 'YYYY-MM-01', p_to: 'YYYY-MM-31', p_kelas_id: null })`.

## 🔐 Custom JWT for RLS

To enforce teacher-only writes for the `nilai` table via Postgres RLS, the app issues a signed JWT after login that carries custom claims. Configure the following environment variable in `.env.local`:

```
SUPABASE_JWT_SECRET=your_supabase_project_jwt_secret
```

Then, ensure your Supabase project uses the same JWT secret (Settings → API → JWT Settings). The token includes:

- role: user's role name
- is_teacher: boolean flag for RLS checks
- kr_id: numeric user id; used to verify ownership of subjects/topics

The client stores the token and sends it as `Authorization: Bearer <token>` for DB operations. Update or rotate the secret consistently across app and Supabase if needed.
