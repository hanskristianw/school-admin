# 🚀 School Admin - Next.js + Supabase Architecture

## 🎯 Arsitektur Baru (Simplified)

```
Frontend (Next.js) ← Direct Connection → Supabase PostgreSQL
```

**Tidak lagi membutuhkan Go API backend!** 🎉

## 📊 Perbandingan Arsitektur

### ❌ Arsitektur Lama (Kompleks)
```
Next.js Frontend → Go API (Chi Router) → Neon PostgreSQL
```

### ✅ Arsitektur Baru (Sederhana)
```
Next.js Frontend → Supabase PostgreSQL (Auto REST API)
```

## 🔥 Keuntungan Supabase

1. **Auto-generated REST API** - Tidak perlu buat endpoints manual
2. **Real-time subscriptions** - WebSocket otomatis untuk live updates
3. **Built-in authentication** - Meski kita pakai custom auth
4. **Row Level Security (RLS)** - Database-level security
5. **TypeScript types** - Auto-generated types dari schema
6. **Dashboard UI** - Interface untuk manage database
7. **Edge Functions** - Serverless functions jika diperlukan

## 📂 File Structure Yang Diupdate

```
src/
├── lib/
│   └── supabase.js          # ✅ Supabase client + custom auth
├── app/
│   ├── login/
│   │   └── page.jsx         # ✅ Login dengan Supabase
│   └── data/
│       └── subject/
│           └── page.jsx     # ✅ CRUD dengan Supabase
└── components/
    └── sidebar.jsx          # ✅ Menu dengan Supabase
```

## 🔧 Key Changes

### 1. Supabase Client (`src/lib/supabase.js`)
```javascript
// Custom auth functions
export const customAuth = {
  async login(username, password) {
    // Direct query ke Supabase dengan JOIN
    const { data } = await supabase
      .from('users')
      .select(`*, role(*), unit(*)`)
      .eq('user_username', username)
  },
  
  async getMenusByRole(roleName, isAdmin) {
    // Query menu berdasarkan role & permissions
  }
}
```

### 2. Login Page
```javascript
// Ganti fetch API → Supabase
const result = await customAuth.login(username, password)
```

### 3. Subject Management
```javascript
// Create
await supabase.from('subject').insert([data])

// Read dengan JOIN
await supabase.from('subject').select(`
  *, users(*), unit(*)
`)

// Update
await supabase.from('subject').update(data).eq('id', id)

// Delete
await supabase.from('subject').delete().eq('id', id)
```

## 🌐 Environment Variables

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://gzucqoupjfnwkesgyybceyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.pooler.supabase.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🔐 Database Migration

Schema sudah di-migrate ke Supabase menggunakan `supabase-migration.sql`:

- ✅ Tables: users, role, menus, menu_permissions, unit, kelas, subject
- ✅ Indexes: Performance optimization
- ✅ Sample data: Default admin user, roles, menus
- ✅ RLS policies: Row level security (disabled for custom auth)

## 🚦 Next Steps

1. ✅ **Migration Complete** - Database schema & data
2. ✅ **Frontend Updated** - Login, menus, subject management
3. 🔄 **Test & Debug** - Ensure all features work
4. 📋 **Update remaining pages** - User management, class management
5. 🔒 **Implement RLS** - Row level security policies (optional)
6. 🚀 **Deploy** - Vercel deployment (much simpler now!)

## 💡 Development Tips

### Testing Supabase Connection
```javascript
import { supabase } from '@/lib/supabase'

// Test connection
const { data, error } = await supabase.from('users').select('count')
console.log('Connection test:', { data, error })
```

### Query Examples
```javascript
// Simple select
const { data } = await supabase.from('subject').select('*')

// With JOIN
const { data } = await supabase
  .from('subject')
  .select(`
    *,
    users:subject_user_id (user_nama_depan, user_nama_belakang),
    unit:subject_unit_id (unit_name)
  `)

// With filters
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('is_active', true)
  .order('user_nama_depan')
```

## 🎯 Benefits Achieved

1. **Simplified Architecture** - No need for Go backend
2. **Reduced Complexity** - Less moving parts to maintain
3. **Better Performance** - Direct database connection
4. **Real-time Capability** - Built-in subscriptions
5. **Easier Deployment** - Just Next.js app on Vercel
6. **Better DX** - TypeScript support, better tooling

---

**🎉 Arsitektur baru ini jauh lebih sederhana dan powerful!**
