# Multi-User Device Detection

## Overview
Sistem ini mendeteksi ketika satu device digunakan oleh multiple users untuk absen dalam waktu singkat (default: 15 menit). Ini membantu mendeteksi kemungkinan abuse seperti:
- Siswa meminjamkan HP ke teman untuk absen
- Satu HP digunakan bergantian oleh beberapa siswa
- Device sharing untuk bypass geofencing

## Konfigurasi

### Environment Variables (.env.local)

```bash
# Window waktu untuk deteksi multi-user (dalam menit)
ATTENDANCE_DEVICE_WINDOW_MIN=15

# Apakah block attendance jika terdeteksi multi-user?
# false = hanya warning/flag (recommended)
# true = block attendance
ATTENDANCE_BLOCK_MULTI_USER=false

# Mode matching device hash:
# - client_strict  : hanya cocokkan client device hash
# - client_or_uaip : cocokkan client hash ATAU UA+IP hash (lebih ketat)
ATTENDANCE_MULTI_MATCH=client_or_uaip
```

### Recommended Settings

**Mode: Warning Only (Recommended)**
```bash
ATTENDANCE_BLOCK_MULTI_USER=false
```
- Attendance tetap tercatat
- Ditandai dengan `flagged_reason='device_multi_user'`
- Admin/guru dapat review manual
- Menghindari false positive (misal: siblings menggunakan HP orangtua)

**Mode: Block (Strict)**
```bash
ATTENDANCE_BLOCK_MULTI_USER=true
```
- Attendance ditolak jika terdeteksi multi-user
- User kedua mendapat error
- Lebih strict, tapi bisa false positive

## Cara Kerja

### 1. Device Hash Generation
Setiap scan QR, sistem membuat device hash berdasarkan:
- **Client Hash**: Hash dari browser fingerprint (generated di student app)
- **UA+IP Hash**: Hash dari User-Agent + IP address (generated di server)

### 2. Detection Logic
Ketika siswa scan QR:
1. Server cek `attendance_scan_log` untuk device hash yang sama dalam 15 menit terakhir
2. Jika ditemukan `detail_siswa_id` yang berbeda → multi-user detected
3. Jika `ATTENDANCE_BLOCK_MULTI_USER=true` → tolak attendance
4. Jika `false` → catat attendance tapi flag dengan `flagged_reason='device_multi_user'`

### 3. Database Schema
```sql
-- attendance_scan_log table
CREATE TABLE attendance_scan_log (
  scan_log_id SERIAL PRIMARY KEY,
  session_id UUID,
  detail_siswa_id INTEGER,
  result TEXT, -- 'ok', 'invalid', 'duplicate', 'not_allowed'
  device_hash TEXT, -- Server-side: SHA256(UA + IP)
  device_hash_client TEXT, -- Client-side: browser fingerprint hash
  device_hash_uaip TEXT, -- Backup: UA+IP hash
  flagged_reason TEXT, -- 'device_multi_user', 'outside_geofence', etc.
  created_at TIMESTAMP DEFAULT NOW(),
  ...
);
```

## UI Components

### 1. Door Greeter Alert (`/data/door_greeter/attendance`)
Menampilkan alert amber di top page jika ada flagged attendance hari ini:
```
⚠️ X Kehadiran Terdeteksi Suspicious Hari Ini
   Multiple users menggunakan device yang sama dalam waktu singkat
   [Lihat Detail]
```

### 2. Flagged Attendance Page (`/data/attendance_flags`)
Halaman dedicated untuk review flagged attendance:
- Filter by date
- List semua attendance dengan flag
- Menampilkan:
  - Nama siswa & kelas
  - Waktu scan
  - Device hash
  - Lokasi GPS (lat/lng)
  - Alasan flag
  - Catatan: "Kehadiran tetap tercatat, perlu verifikasi manual"

### 3. Student Scan Page (`/student/scan`)
Jika terdeteksi multi-user:
- **Mode Block**: Error "Device ini terdeteksi digunakan untuk beberapa akun dalam waktu singkat"
- **Mode Warning**: Success tapi ada catatan "Catatan: Perangkat ini terdeteksi digunakan oleh beberapa akun. Silakan konfirmasi dengan guru."

## User Flow

### Scenario: Siswa A & B Bergantian Scan dengan HP yang Sama

**Warning Mode (Recommended):**
1. **09:00** - Siswa A scan QR → ✅ Success, tercatat
2. **09:05** - Siswa B scan QR dengan HP yang sama → ✅ Success, tercatat + **flagged**
3. **09:10** - Admin buka Door Greeter → melihat alert amber "2 Kehadiran Terdeteksi Suspicious"
4. **09:15** - Admin klik "Lihat Detail" → melihat Siswa A & B menggunakan device hash yang sama
5. **Manual Verification** - Guru konfirmasi ke kedua siswa, decide keep or delete

**Block Mode (Strict):**
1. **09:00** - Siswa A scan QR → ✅ Success, tercatat
2. **09:05** - Siswa B scan QR dengan HP yang sama → ❌ **Error**: "Device ini terdeteksi digunakan..."
3. Siswa B harus gunakan HP lain atau tunggu >15 menit

## API Response Format

### Success (Warning Mode)
```json
{
  "status": "ok",
  "flagged": "device_multi_user"
}
```

### Error (Block Mode)
```json
{
  "error": "device_multi_user",
  "debug": "Device ini baru digunakan siswa lain dalam 15 menit terakhir"
}
```

## Troubleshooting

### False Positives
**Problem**: Dua siblings menggunakan HP orangtua untuk absen
**Solution**: 
- Gunakan Warning Mode (jangan Block)
- Review manual di `/data/attendance_flags`
- Whitelist device hash jika memang sah

### Not Detecting
**Problem**: Multi-user tidak terdeteksi padahal jelas device sharing
**Possible Causes**:
1. Client device hash tidak dikirim (student app outdated?)
2. `ATTENDANCE_DEVICE_WINDOW_MIN` terlalu kecil
3. User menggunakan incognito/private mode (device hash berubah)
**Solution**:
- Update student app untuk send device hash
- Increase window (misal: 30 menit)
- Gunakan `ATTENDANCE_MULTI_MATCH=client_or_uaip` untuk fallback ke UA+IP

### Too Many Flags
**Problem**: Banyak false positive, admin overwhelmed
**Solution**:
- Increase `ATTENDANCE_DEVICE_WINDOW_MIN` (misal: 30 menit → 10 menit)
- Ubah `ATTENDANCE_MULTI_MATCH=client_strict` (hanya match client hash, abaikan UA+IP)

## Best Practices

1. **Start with Warning Mode**: Jangan langsung block, observe dulu pattern
2. **Regular Review**: Admin/guru check `/data/attendance_flags` setiap hari
3. **Educate Students**: Jelaskan ke siswa bahwa device sharing akan terdeteksi
4. **Adjust Window**: Sesuaikan `ATTENDANCE_DEVICE_WINDOW_MIN` dengan kondisi sekolah
5. **Combine with Geofencing**: Gunakan bersama geofencing untuk double protection

## Database Queries

### Get Flagged Attendance for Today
```sql
SELECT 
  sl.created_at,
  u.user_fullname,
  k.kelas_nama,
  sl.device_hash_client,
  sl.flagged_reason
FROM attendance_scan_log sl
JOIN detail_siswa ds ON sl.detail_siswa_id = ds.detail_siswa_id
JOIN users u ON ds.detail_siswa_user_id = u.user_id
JOIN kelas k ON ds.detail_siswa_kelas_id = k.kelas_id
WHERE sl.created_at >= CURRENT_DATE
  AND sl.result = 'ok'
  AND sl.flagged_reason IS NOT NULL
ORDER BY sl.created_at DESC;
```

### Find Device Hash Used by Multiple Users
```sql
SELECT 
  device_hash_client,
  COUNT(DISTINCT detail_siswa_id) as user_count,
  ARRAY_AGG(DISTINCT u.user_fullname) as users
FROM attendance_scan_log sl
JOIN detail_siswa ds ON sl.detail_siswa_id = ds.detail_siswa_id
JOIN users u ON ds.detail_siswa_user_id = u.user_id
WHERE sl.created_at >= CURRENT_DATE
  AND sl.result = 'ok'
  AND device_hash_client IS NOT NULL
GROUP BY device_hash_client
HAVING COUNT(DISTINCT detail_siswa_id) > 1
ORDER BY user_count DESC;
```

## Integration with Other Features

### Works With:
- ✅ Daily Static QR (recommended)
- ✅ Session-based QR (legacy)
- ✅ Geofencing
- ✅ Manual attendance (not flagged)

### Doesn't Apply To:
- ❌ Manual attendance by admin/guru
- ❌ Import from Excel/CSV
- ❌ Attendance marked outside QR system

## Future Enhancements

1. **ML-based Detection**: Use pattern recognition to detect unusual behavior
2. **Auto-review**: AI suggests which flags are likely false positive
3. **Device Whitelist**: Admin can whitelist known shared devices (e.g., school tablets)
4. **Parent Notification**: Auto-notify parents if child's attendance flagged
5. **Analytics Dashboard**: Trend analysis of device sharing patterns
