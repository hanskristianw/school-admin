# Static Daily QR Attendance System

## Overview
Sistem absensi menggunakan QR code **static harian** yang berbeda untuk setiap hari (Senin-Jumat). QR tidak berubah sepanjang hari dan dapat dicetak untuk dipasang di pintu masuk.

## Features
- ✅ **Static QR per Day**: Setiap hari kerja (Mon-Fri) memiliki QR unik yang tidak berubah
- ✅ **Printable**: QR dapat dicetak dan dipasang permanen
- ✅ **School-wide**: 1 QR berlaku untuk seluruh sekolah (all classes/years)
- ✅ **Weekend Blocking**: QR hanya valid Senin-Jumat
- ✅ **Day Verification**: Siswa hanya bisa scan QR sesuai hari WIB saat ini
- ✅ **Geofencing Support**: Optional location verification (via env vars)
- ✅ **Device Multi-user Detection**: Optional anti-fraud (via env vars)

## Setup Instructions

### 1. Database Setup
Run the migration to create settings table:
```sql
psql -h [host] -U [user] -d [database] -f migrations/create_settings_table.sql
```

Or via Supabase dashboard:
- Go to SQL Editor
- Paste content from `migrations/create_settings_table.sql`
- Run query

### 2. Configure Daily Secrets
1. Login as Admin/Principal
2. Navigate to **Data → Settings → Daily QR**
3. Click **"Generate Semua"** to auto-generate secure secrets for all days
4. Or manually enter custom secrets (min 16 characters recommended)
5. Click **"Simpan Konfigurasi"**

⚠️ **Important**: After changing secrets, old QR codes become invalid. Re-print new QR codes.

### 3. Print QR Codes
1. Go to **Data → Door Greeter → Attendance**
2. You'll see the QR for current day (WIB)
3. Click **"Print QR [Day]"** to open print-friendly window
4. Print and post at entrance

**Pro Tip**: Print all 5 QR codes (Monday-Friday) once and laminate them for the entire school year!

### 4. Student Scanning
Students scan the QR via Student app:
- QR payload: `{ "day": 1-5, "tok": "..." }` (1=Mon, 5=Fri)
- Backend verifies:
  - Token matches secret for current weekday (WIB)
  - Current day matches scanned QR day
  - Student is enrolled (has detail_siswa)
  - Optional: geofence, device multi-user

Success → Attendance recorded in `absen` table with `absen_method='qr_daily'`

## API Endpoints

### GET `/api/attendance/daily-qr`
Returns token for current weekday (WIB).

**Response:**
```json
{
  "token": "abc123...",
  "day": 1
}
```

**Errors:**
- `400 weekend`: Called on Saturday/Sunday
- `500 not_configured`: Secret not set for current day

### POST `/api/attendance/scan`
Verify QR and record attendance.

**Request Body:**
```json
{
  "day": 1,
  "tok": "abc123...",
  "user_id": 123,
  "deviceHash": "...",
  "geo": {
    "lat": -6.123,
    "lng": 106.456,
    "accuracy": 10
  }
}
```

**Response:**
- `200 { "status": "ok" }`: Success
- `400 invalid_day`: Wrong day or weekend
- `400 invalid`: Token mismatch
- `403 not_allowed`: Student not enrolled or scope mismatch
- `403 outside_geofence`: Location check failed
- `403 device_multi_user`: Multiple users on same device

## Environment Variables (Optional)

```env
# Geofencing (optional)
ATTENDANCE_CENTER_LAT=-6.123456
ATTENDANCE_CENTER_LNG=106.789012
ATTENDANCE_RADIUS_M=100

# Device multi-user detection (optional)
ATTENDANCE_BLOCK_MULTI_USER=false
ATTENDANCE_DEVICE_WINDOW_MIN=15
ATTENDANCE_MULTI_MATCH=client_strict
```

## Migration from Session-based QR

The old rotating QR system (session-based) is still supported for backward compatibility:
- If scan payload has `{ sid, tok }` → uses session verification
- If scan payload has `{ day, tok }` → uses daily static verification

To fully deprecate old system, remove `/api/attendance/session` endpoints.

## Security Notes

1. **Secrets Storage**: Secrets stored in `settings` table. Ensure RLS policies restrict access to admins only.
2. **Token Algorithm**: HMAC-SHA256(`secret`, `"daily:{day}"`).slice(0,16)
3. **No Expiry**: Static tokens don't expire within the day (by design for printable QR)
4. **Weekend Protection**: Backend rejects scans on Sat/Sun
5. **Day Mismatch**: Backend rejects if scanned day ≠ current WIB day

## Troubleshooting

**Q: QR tidak muncul di Door Greeter page?**
- Pastikan secret sudah diset di Settings → Daily QR
- Check browser console untuk error
- Verify `/api/attendance/daily-qr` returns 200

**Q: Student scan tapi attendance tidak tercatat?**
- Check `attendance_scan_log` table untuk result & flagged_reason
- Verify student punya `detail_siswa` aktif
- Check geofence settings jika enabled

**Q: Ingin QR berbeda setiap minggu/bulan?**
- Generate ulang secrets di Settings → Daily QR
- Re-print QR codes
- Old QR otomatis invalid

## Files Modified

- `src/app/data/door_greeter/attendance/page.jsx`: Removed session logic, added static daily QR UI
- `src/app/api/attendance/daily-qr/route.js`: New endpoint to get daily token
- `src/app/api/attendance/scan/route.js`: Updated to support both session & daily QR
- `src/app/data/settings/daily_qr/page.jsx`: Admin UI to manage secrets
- `migrations/create_settings_table.sql`: Settings table schema

## Support

For issues or questions, contact system administrator.
