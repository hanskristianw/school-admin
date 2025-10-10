# Database Schema Reference - Users Table

## Users Table Structure

### Columns
```sql
CREATE TABLE users (
  user_id INTEGER PRIMARY KEY,
  user_username TEXT,
  user_password TEXT,
  user_nama_depan TEXT,      -- First name (NOT user_fullname!)
  user_nama_belakang TEXT,    -- Last name
  user_email TEXT,
  user_phone TEXT,
  user_role_id INTEGER,
  user_isactive BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Important Notes

#### ⚠️ Common Mistake
The users table does **NOT** have a `user_fullname` column!

❌ **WRONG:**
```javascript
.select('user_id, user_fullname')  // This will fail!
```

✅ **CORRECT:**
```javascript
.select('user_id, user_nama_depan, user_nama_belakang')
```

#### Combining Names
To display full name, concatenate `user_nama_depan` and `user_nama_belakang`:

**JavaScript:**
```javascript
const fullName = `${user.user_nama_depan || ''} ${user.user_nama_belakang || ''}`.trim();
```

**SQL:**
```sql
SELECT 
  user_id,
  CONCAT(user_nama_depan, ' ', user_nama_belakang) as full_name
FROM users;
```

**Supabase Query (with relationship):**
```javascript
const { data } = await supabase
  .from('detail_siswa')
  .select(`
    detail_siswa_id,
    users:detail_siswa_user_id (
      user_id,
      user_nama_depan,
      user_nama_belakang
    )
  `);

// Then in your component:
const userName = data.users 
  ? `${data.users.user_nama_depan || ''} ${data.users.user_nama_belakang || ''}`.trim()
  : 'Unknown User';
```

## Related Tables

### detail_siswa (Student Details)
Links students to users table:
```sql
CREATE TABLE detail_siswa (
  detail_siswa_id INTEGER PRIMARY KEY,
  detail_siswa_user_id INTEGER REFERENCES users(user_id),
  detail_siswa_kelas_id INTEGER REFERENCES kelas(kelas_id),
  ...
);
```

### Relationships
- `users` ← `detail_siswa` (via `detail_siswa_user_id`)
- `users` ← `kelas` (via `kelas_wali_user_id` for homeroom teacher)
- `users` ← `subject` (via `subject_teacher_id`)

## Query Examples

### Get Student with Full Name
```javascript
const { data: students } = await supabase
  .from('detail_siswa')
  .select(`
    detail_siswa_id,
    users:detail_siswa_user_id (
      user_id,
      user_nama_depan,
      user_nama_belakang
    ),
    kelas:detail_siswa_kelas_id (
      kelas_id,
      kelas_nama
    )
  `);

// Map to display format:
const formattedStudents = students.map(s => ({
  id: s.detail_siswa_id,
  fullName: `${s.users?.user_nama_depan || ''} ${s.users?.user_nama_belakang || ''}`.trim(),
  className: s.kelas?.kelas_nama || ''
}));
```

### Get All Users with Full Name
```javascript
const { data: users } = await supabase
  .from('users')
  .select('user_id, user_nama_depan, user_nama_belakang, user_role_id')
  .order('user_nama_depan');

const userOptions = users.map(u => ({
  value: u.user_id,
  label: `${u.user_nama_depan || ''} ${u.user_nama_belakang || ''}`.trim() || `User ${u.user_id}`
}));
```

### Filter by Name
```javascript
const searchTerm = 'john';
const filteredUsers = users.filter(u => {
  const fullName = `${u.user_nama_depan || ''} ${u.user_nama_belakang || ''}`.toLowerCase();
  return fullName.includes(searchTerm.toLowerCase());
});
```

## Migration Guide

If you have old code using `user_fullname`, update it:

### Before (Wrong):
```javascript
const { data } = await supabase
  .from('users')
  .select('user_id, user_fullname');  // ❌ Error!

const userName = data.user_fullname;   // ❌ Undefined!
```

### After (Correct):
```javascript
const { data } = await supabase
  .from('users')
  .select('user_id, user_nama_depan, user_nama_belakang');  // ✅

const userName = `${data.user_nama_depan || ''} ${data.user_nama_belakang || ''}`.trim();  // ✅
```

## Reusable Helper Function

Create a utility function for consistent name formatting:

```javascript
// lib/utils.js
export function formatUserName(user) {
  if (!user) return 'Unknown User';
  
  const firstName = user.user_nama_depan || '';
  const lastName = user.user_nama_belakang || '';
  const fullName = `${firstName} ${lastName}`.trim();
  
  return fullName || `User ${user.user_id || ''}` || 'Unknown';
}

// Usage:
import { formatUserName } from '@/lib/utils';

const displayName = formatUserName(student.users);
```

## Common Use Cases

### 1. Display Student Name in Table
```jsx
<td>{formatUserName(student.users)}</td>
```

### 2. Dropdown Options
```jsx
<select>
  {users.map(u => (
    <option key={u.user_id} value={u.user_id}>
      {formatUserName(u)}
    </option>
  ))}
</select>
```

### 3. Search/Filter
```javascript
const searchResults = students.filter(s => {
  const userName = formatUserName(s.users).toLowerCase();
  return userName.includes(searchQuery.toLowerCase());
});
```

### 4. Sort by Name
```javascript
const sorted = students.sort((a, b) => {
  const nameA = formatUserName(a.users).toLowerCase();
  const nameB = formatUserName(b.users).toLowerCase();
  return nameA.localeCompare(nameB);
});
```

## Troubleshooting

### Error: "column users.user_fullname does not exist"
**Cause**: Query is trying to select `user_fullname` which doesn't exist.

**Solution**: Change to:
```javascript
// Change this:
.select('user_id, user_fullname')

// To this:
.select('user_id, user_nama_depan, user_nama_belakang')
```

### Error: "users_2.user_fullname does not exist"
**Cause**: Nested query with relationship is selecting wrong column.

**Solution**: Update nested select:
```javascript
// Change this:
.select(`
  detail_siswa_id,
  users:detail_siswa_user_id (
    user_fullname  // ❌
  )
`)

// To this:
.select(`
  detail_siswa_id,
  users:detail_siswa_user_id (
    user_nama_depan,  // ✅
    user_nama_belakang  // ✅
  )
`)
```

---

**Last Updated**: October 2025  
**Applies to**: school-admin database schema
