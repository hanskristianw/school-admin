# 📝 Assessment Submission System

## 🎯 Overview

Sistem Assessment Submission adalah fitur untuk guru/pengajar melakukan submit assessment berdasarkan mata pelajaran yang mereka ajar. Assessment yang disubmit akan memiliki status "Menunggu Persetujuan" dan harus diapprove oleh admin melalui halaman Assessment Approval.

## 🏗️ Database Integration

### Tabel Terkait
- **`assessment`**: Menyimpan data assessment yang disubmit
- **`subject`**: Mata pelajaran yang diajar oleh user
- **`users`**: Data pengajar/user

### Flow Data
1. **User Login** → Ambil `user_id` dari localStorage
2. **Load Subjects** → Query mata pelajaran yang `subject_user_id = user_id`
3. **Submit Assessment** → Insert ke tabel `assessment` dengan status = 0
4. **Display Assessments** → Query assessment yang `assessment_user_id = user_id`

## 🚀 Fitur Utama

### 1. **Subject-Based Submission**
- Hanya menampilkan mata pelajaran yang diajar oleh user tersebut
- Query: `SELECT * FROM subject WHERE subject_user_id = current_user_id`
- Jika tidak ada mata pelajaran, tampilkan pesan khusus

### 2. **Assessment Form**
- **Nama Assessment** (required): Judul/nama assessment
- **Tanggal Assessment** (required): Tanggal pelaksanaan (tidak boleh masa lalu)
- **Mata Pelajaran** (required): Dropdown dari subject yang diajar
- **Keterangan** (optional): Deskripsi tambahan

### 3. **Form Validation**
- Nama assessment wajib diisi
- Tanggal assessment wajib diisi dan tidak boleh masa lalu
- Mata pelajaran wajib dipilih
- Real-time validation dengan error messages

### 4. **User-Specific Display**
- Hanya menampilkan assessment yang disubmit oleh user tersebut
- Filter berdasarkan status, mata pelajaran, dan range tanggal
- Tabel dengan informasi lengkap assessment

### 5. **Status Tracking**
- 🟡 **Status 0**: Menunggu Persetujuan (default saat submit)
- 🟢 **Status 1**: Disetujui (diubah oleh admin)
- 🔴 **Status 2**: Ditolak (diubah oleh admin)

## 🎨 UI/UX Features

### Visual Design
- Card-based layout untuk better organization
- Status badges dengan color coding
- Responsive design untuk mobile
- Loading states dan error handling

### Interactive Elements
- Modal form untuk submit assessment baru
- Real-time form validation
- Filter system untuk assessment list
- Date picker dengan min date restriction

### User Experience
- Empty state messages yang informatif
- Success/error notifications
- Form reset setelah submit berhasil
- Disabled state untuk form elements

## 📱 Navigation & Menu

### Menu Structure
```
Teacher (parent menu)
└── Assessment Submission (/teacher/assessment_submission)
```

### Access Control
- **Role**: `guru` dan `admin`
- **Permission**: Menu permissions berbasis role
- **Authentication**: User harus login dan memiliki kr_id

## 🔧 Technical Implementation

### Frontend Stack
- **Framework**: Next.js 14 dengan App Router
- **UI Components**: Custom components dengan Tailwind CSS
- **State Management**: React useState/useEffect
- **Icons**: FontAwesome icons

### Data Flow
```javascript
// 1. Get current user
const userId = localStorage.getItem("kr_id");

// 2. Load user's subjects
const subjects = await supabase
  .from('subject')
  .select('subject_id, subject_name')
  .eq('subject_user_id', userId);

// 3. Submit new assessment
const assessment = await supabase
  .from('assessment')
  .insert([{
    assessment_nama: 'Assessment Name',
    assessment_tanggal: '2025-08-15',
    assessment_keterangan: 'Description',
    assessment_status: 0,  // Menunggu persetujuan
    assessment_user_id: userId,
    assessment_subject_id: subjectId
  }]);

// 4. Load user's assessments
const assessments = await supabase
  .from('assessment')
  .select('*')
  .eq('assessment_user_id', userId);
```

## 🛡️ Security & Validation

### Authentication
- User harus login dan memiliki `kr_id`
- Redirect ke login jika tidak authenticated

### Authorization
- Hanya bisa melihat assessment sendiri
- Hanya bisa submit untuk mata pelajaran yang diajar

### Data Validation
- **Client-side**: Real-time form validation
- **Server-side**: Database constraints dan foreign keys
- **Date validation**: Tidak boleh submit untuk masa lalu

## 🧪 Testing Scenarios

### Positive Tests
- [ ] User dengan mata pelajaran bisa submit assessment
- [ ] Form validation bekerja dengan benar
- [ ] Assessment muncul di list setelah submit
- [ ] Filter berfungsi dengan baik
- [ ] Status badge menampilkan warna yang benar

### Negative Tests
- [ ] User tanpa mata pelajaran melihat empty state
- [ ] Form tidak bisa submit dengan data kosong
- [ ] Tanggal masa lalu ditolak
- [ ] User tidak bisa melihat assessment user lain

### Edge Cases
- [ ] User dengan banyak mata pelajaran
- [ ] Assessment dengan tanggal yang sama
- [ ] Long description text handling
- [ ] Network error handling

## 📊 Database Queries

### Get User's Subjects
```sql
SELECT subject_id, subject_name 
FROM subject 
WHERE subject_user_id = ? 
ORDER BY subject_name;
```

### Submit New Assessment
```sql
INSERT INTO assessment (
  assessment_nama, 
  assessment_tanggal, 
  assessment_keterangan, 
  assessment_status, 
  assessment_user_id, 
  assessment_subject_id
) VALUES (?, ?, ?, 0, ?, ?);
```

### Get User's Assessments
```sql
SELECT * FROM assessment 
WHERE assessment_user_id = ? 
ORDER BY assessment_tanggal DESC;
```

## 🔗 Integration dengan Assessment Approval

### Workflow
1. **Teacher** submit assessment di `/teacher/assessment_submission`
2. Assessment tersimpan dengan `assessment_status = 0`
3. **Admin** lihat di `/data/assessment_approval`
4. **Admin** approve/reject assessment
5. Status berubah menjadi 1 (approved) atau 2 (rejected)
6. **Teacher** bisa lihat status terbaru di assessment list

### Status Synchronization
- Real-time status update menggunakan Supabase
- Status badge otomatis update sesuai perubahan database
- No manual refresh needed

## 📈 Future Enhancements

1. **Real-time Notifications**: Notifikasi saat status berubah
2. **Assessment History**: Log perubahan status
3. **Batch Operations**: Submit multiple assessments
4. **File Attachments**: Upload dokumen assessment
5. **Assessment Templates**: Template untuk assessment berulang
6. **Analytics**: Dashboard statistics untuk teacher

---

**📝 Created:** August 2025  
**🎯 Status:** Production Ready  
**👨‍💩 Developer:** School Admin System  
**🔗 Related:** Assessment Approval System
