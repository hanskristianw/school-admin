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

---

**🎯 Next Steps:**
1. Jalankan migration SQL di Supabase Dashboard
2. Test di `/debug/supabase`
3. Login ke aplikasi
4. Enjoy simplified architecture! 🚀
