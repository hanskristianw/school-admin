# 📋 Assessment Approval System

## 🎯 Overview

Sistem persetujuan assessment adalah fitur untuk mengelola proses approval/penolakan assessment yang dibuat oleh pengajar. Sistem ini memberikan kontrol kepada admin untuk menyetujui atau menolak assessment sebelum dapat digunakan.

## 🏗️ Database Schema

### Tabel Assessment
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

### Status Assessment
- **0**: Menunggu Persetujuan (default)
- **1**: Disetujui
- **2**: Ditolak

## 🚀 Fitur Utama

### 1. **Dashboard Assessment Approval**
- Menampilkan daftar semua assessment
- Filter berdasarkan status, mata pelajaran, dan pengajar
- Badge visual untuk status assessment
- Informasi detail assessment

### 2. **Sistem Persetujuan**
- Tombol Setujui/Tolak untuk assessment dengan status "Menunggu"
- Modal konfirmasi sebelum melakukan aksi
- Update status real-time tanpa refresh halaman
- Notifikasi berhasil/gagal

### 3. **Filter dan Pencarian**
- Filter berdasarkan status persetujuan
- Filter berdasarkan mata pelajaran
- Filter berdasarkan pengajar
- Kombinasi multiple filter

## 🎨 UI/UX Features

### Visual Status Indicators
- 🟡 **Kuning**: Menunggu Persetujuan
- 🟢 **Hijau**: Disetujui  
- 🔴 **Merah**: Ditolak

### Interactive Elements
- Hover effects pada tabel
- Loading states untuk aksi
- Responsive design untuk mobile
- Accessible button states

### User Experience
- Konfirmasi modal dengan detail assessment
- Loading indicators saat processing
- Toast notifications untuk feedback
- Keyboard navigation support

## 📱 Responsive Design

Halaman ini fully responsive dengan:
- Mobile-first approach
- Collapsible filters pada mobile
- Horizontal scroll untuk tabel pada layar kecil
- Touch-friendly button sizes

## 🔐 Security & Permissions

### Role-Based Access
- Hanya role dengan permission dapat mengakses
- Admin mendapat akses otomatis
- Menu permissions dapat dikonfigurasi per role

### Data Validation
- Foreign key constraints untuk data integrity
- Status validation (hanya 0, 1, 2)
- Required field validation

## 🛠️ Setup Instructions

### 1. Database Migration
```bash
# Jalankan file SQL migration
psql -h [host] -U [username] -d [database] -f assessment-migration.sql
```

### 2. Menu Configuration
Menu sudah otomatis ditambahkan dengan path `/data/assessment_approval`

### 3. Permissions
Admin role otomatis mendapat akses. Untuk role lain:
```sql
INSERT INTO menu_permissions (menu_id, role_id)
SELECT m.menu_id, r.role_id
FROM menus m, role r
WHERE m.menu_path = '/data/assessment_approval' 
  AND r.role_name = 'your_role_name';
```

## 🔧 Technical Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS
- **Backend**: Supabase PostgreSQL
- **UI Components**: Custom UI components dengan shadcn/ui
- **Icons**: FontAwesome
- **State Management**: React useState/useEffect

## 📊 API Endpoints (Supabase)

### Get Assessments
```javascript
const { data, error } = await supabase
  .from('assessment')
  .select('*')
  .order('assessment_tanggal', { ascending: false });
```

### Get Subjects for Filter
```javascript
const { data, error } = await supabase
  .from('subject')
  .select('subject_id, subject_name')
  .order('subject_name');
```

### Update Assessment Status
```javascript
const { error } = await supabase
  .from('assessment')
  .update({ assessment_status: newStatus })
  .eq('assessment_id', assessmentId);
```

## 🎯 User Workflow

1. **Pengajar** membuat assessment (status = 0)
2. **Admin** masuk ke halaman Assessment Approval
3. **Admin** melihat daftar assessment menunggu persetujuan
4. **Admin** klik tombol "Setujui" atau "Tolak"
5. **Sistem** menampilkan modal konfirmasi
6. **Admin** konfirmasi aksi
7. **Sistem** update status dan menampilkan notifikasi

## 🧪 Testing

### Manual Testing Checklist
- [ ] Load halaman assessment approval
- [ ] Filter berdasarkan status
- [ ] Filter berdasarkan mata pelajaran
- [ ] Filter berdasarkan pengajar
- [ ] Setujui assessment (status 0 → 1)
- [ ] Tolak assessment (status 0 → 2)
- [ ] Verifikasi assessment yang sudah diproses tidak bisa diubah
- [ ] Test responsive design
- [ ] Test notification system

### Sample Test Data
```sql
-- Insert test assessments
INSERT INTO assessment VALUES 
(100, 'Test Assessment 1', '2025-08-10', 'Testing approval system', 0, 2, 1),
(101, 'Test Assessment 2', '2025-08-11', 'Testing rejection system', 0, 3, 2);
```

## 🐛 Troubleshooting

### Common Issues

1. **Assessment tidak muncul**
   - Periksa foreign key relationships
   - Pastikan users dan subjects ada

2. **Button tidak berfungsi**
   - Periksa console untuk JavaScript errors
   - Pastikan Supabase connection OK

3. **Permission denied**
   - Periksa menu_permissions table
   - Pastikan user memiliki role yang sesuai

### Debug Queries
```sql
-- Check assessment with related data
SELECT a.*, 
       u.user_nama_depan || ' ' || u.user_nama_belakang as teacher,
       s.subject_name
FROM assessment a
LEFT JOIN users u ON a.assessment_user_id = u.user_id
LEFT JOIN subject s ON a.assessment_subject_id = s.subject_id;

-- Check menu permissions
SELECT m.menu_name, r.role_name
FROM menu_permissions mp
JOIN menus m ON mp.menu_id = m.menu_id
JOIN role r ON mp.role_id = r.role_id
WHERE m.menu_path = '/data/assessment_approval';
```

## 📈 Future Enhancements

1. **Bulk Operations**: Setujui/tolak multiple assessments
2. **Comments**: Alasan penolakan assessment
3. **Email Notifications**: Notifikasi ke pengajar
4. **Assessment History**: Log perubahan status
5. **Advanced Filters**: Date range, search by name
6. **Export**: Export data assessment ke Excel/PDF

---

**📝 Created:** August 2025  
**🎯 Status:** Production Ready  
**👨‍💻 Developer:** School Admin System
