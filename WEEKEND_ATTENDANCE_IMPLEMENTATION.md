# Weekend Attendance Support - Implementation Guide

## 🎉 What's New

**Weekend attendance support has been added!** The daily QR attendance system now supports all 7 days of the week (Monday-Sunday), not just Monday-Friday.

## 📋 Changes Made

### 1. **UI Updates** (`/data/settings/daily_qr`)
- ✅ Added **Sabtu (Saturday)** secret field
- ✅ Added **Minggu (Sunday)** secret field
- ✅ Updated description: "7 hari (Senin-Minggu)"
- ✅ Generate All button now creates 7 secrets

### 2. **API Updates** (`/api/attendance/scan`)
- ✅ Day validation now supports days 1-7 (was 1-5)
- ✅ Secret lookup supports SAT and SUN
- ✅ Error messages updated with 7-day names

### 3. **Database Changes**
- ✅ New settings keys:
  - `attendance_secret_sat`
  - `attendance_secret_sun`
- ✅ Cleanup scripts updated for 7 days

---

## 🚀 Setup Instructions

### Step 1: Add Weekend Secrets to Database

Run this SQL in Supabase SQL Editor:

```sql
-- Add Saturday and Sunday secret keys
INSERT INTO settings (key, value, description)
VALUES 
  ('attendance_secret_sat', '', 'Secret key untuk QR kehadiran Sabtu'),
  ('attendance_secret_sun', '', 'Secret key untuk QR kehadiran Minggu')
ON CONFLICT (key) DO NOTHING;
```

**Or use the provided script:**
```bash
# Copy contents of add-weekend-attendance-secrets.sql
# Paste in Supabase SQL Editor and run
```

### Step 2: Generate Secrets via UI

1. Visit `/data/settings/daily_qr`
2. You'll see 7 fields now (Senin-Minggu)
3. Click **"Generate Semua"** to auto-generate all 7 secrets
4. OR click individual "Generate" buttons for Sabtu/Minggu
5. Click **"Simpan Konfigurasi"**

### Step 3: Generate QR Codes for Weekend

Use your QR generator app with these parameters:

**Saturday QR:**
```
Type: daily
Day: 6
Secret: [copy from Sabtu field]
```

**Sunday QR:**
```
Type: daily
Day: 7
Secret: [copy from Minggu field]
```

---

## 📊 Database Schema

### Settings Table (Updated)

| Key | Description | Example |
|-----|-------------|---------|
| `attendance_secret_mon` | Senin secret | `abc123...` |
| `attendance_secret_tue` | Selasa secret | `def456...` |
| `attendance_secret_wed` | Rabu secret | `ghi789...` |
| `attendance_secret_thu` | Kamis secret | `jkl012...` |
| `attendance_secret_fri` | Jumat secret | `mno345...` |
| `attendance_secret_sat` | **Sabtu secret** | `pqr678...` |
| `attendance_secret_sun` | **Minggu secret** | `stu901...` |

---

## 🔄 Migration Path

### If you already have Mon-Fri setup:

1. **No action needed for existing secrets** - they will continue to work
2. **Run `add-weekend-attendance-secrets.sql`** to add Sat/Sun rows
3. **Generate secrets via UI** for weekend days
4. **Print weekend QR codes** if needed

### If starting fresh:

1. **Run cleanup script** (optional): `clean-slate-attendance.sql`
2. **Visit `/data/settings/daily_qr`**
3. **Click "Generate Semua"** to create all 7 secrets at once
4. **Generate all 7 QR codes**

---

## 🧪 Testing

### Test Saturday Attendance

```bash
# Simulate Saturday scan (day=6)
curl -X POST http://localhost:3000/api/attendance/scan \
  -H "Content-Type: application/json" \
  -d '{
    "type": "daily",
    "day": 6,
    "token": "<your-saturday-token>",
    "studentId": 123,
    "clientDeviceHash": "test-device"
  }'
```

### Test Sunday Attendance

```bash
# Simulate Sunday scan (day=7)
curl -X POST http://localhost:3000/api/attendance/scan \
  -H "Content-Type: application/json" \
  -d '{
    "type": "daily",
    "day": 7,
    "token": "<your-sunday-token>",
    "studentId": 123,
    "clientDeviceHash": "test-device"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Kehadiran berhasil dicatat"
}
```

---

## 📝 Updated Files

| File | Changes |
|------|---------|
| `src/app/data/settings/daily_qr/page.jsx` | Added sat/sun fields, updated UI text |
| `src/app/api/attendance/scan/route.js` | Extended day arrays to 7 days |
| `src/app/api/attendance/daily-qr/route.js` | **NEW** - Removed Mon-Fri restriction, now generates tokens for all 7 days |
| `src/app/data/door_greeter/attendance/page.jsx` | Removed Mon-Fri restriction, now shows QR for all 7 days |
| `clean-slate-attendance.sql` | Updated to check 7 secrets |
| `conservative-cleanup-attendance.sql` | Updated verification |
| `add-weekend-attendance-secrets.sql` | **NEW** - Migration script |

---

## ⚠️ Important Notes

### 1. **Weekend Attendance is Optional**
- You don't have to use weekend attendance
- If secrets are not set, weekend scans will fail with "not_configured" error
- This is by design - only enable if you need weekend attendance

### 2. **Secret Security**
- Each day has its own secret for security
- Never reuse secrets across days
- Store secrets securely (already in database `settings` table)

### 3. **QR Code Validity**
- Weekend QR codes are **permanent** (like weekday QRs)
- They don't change unless you regenerate the secret
- Print once and reuse every weekend

### 4. **Day Detection**
- System automatically detects current day
- Students can't use Friday QR on Saturday (day validation)
- "wrong_day" error will be logged in `attendance_scan_log`

---

## 🔧 Troubleshooting

### Error: "Secret untuk hari Sab belum diset"

**Solution:**
1. Go to `/data/settings/daily_qr`
2. Generate secret for Sabtu
3. Click "Simpan Konfigurasi"

### Error: "QR untuk hari Sab, tapi sekarang hari Min"

**Cause:** Student scanned Saturday QR on Sunday

**Solution:** This is correct behavior - use proper QR for current day

### Weekend secrets showing as empty in UI

**Solution:**
```sql
-- Check database
SELECT key, value FROM settings 
WHERE key IN ('attendance_secret_sat', 'attendance_secret_sun');

-- If missing, run:
INSERT INTO settings (key, value, description)
VALUES 
  ('attendance_secret_sat', '', 'Secret key untuk QR kehadiran Sabtu'),
  ('attendance_secret_sun', '', 'Secret key untuk QR kehadiran Minggu')
ON CONFLICT (key) DO NOTHING;
```

---

## 📈 Future Considerations

### Optional Features (Not Implemented Yet)

1. **Weekend-specific time windows**
   - Different attendance hours for weekends
   - Currently uses same validation as weekdays

2. **Weekend holidays**
   - Mark certain Saturdays/Sundays as holidays
   - Disable attendance for those days

3. **Weekend-only classes**
   - Special class filtering for weekend attendance
   - Currently all students can attend any day

---

## ✅ Verification Checklist

After implementation, verify:

- [ ] 7 secret fields visible in `/data/settings/daily_qr`
- [ ] "Generate Semua" creates all 7 secrets
- [ ] Database has `attendance_secret_sat` and `attendance_secret_sun` rows
- [ ] API accepts day=6 and day=7 in scan requests
- [ ] Weekend QR codes validate correctly
- [ ] Multi-user detection works on weekends
- [ ] `attendance_scan_log` records weekend scans

---

## 📞 Support

If you encounter issues:

1. Check database: `SELECT * FROM settings WHERE key LIKE 'attendance_secret_%'`
2. Check API logs: Look for `[scan]` prefix messages
3. Check debug pages: `/debug/multi-user`, `/debug/database`
4. Verify day detection: Check `created_at` timezone in logs

---

**Last Updated:** October 11, 2025  
**Version:** 2.0 (Weekend Support)
