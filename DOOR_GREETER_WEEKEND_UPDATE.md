# Door Greeter Attendance - Weekend Support Update

## 📋 Changes Summary

Updated `/data/door_greeter/attendance` page to support **7-day attendance** (Monday-Sunday) instead of weekday-only (Monday-Friday).

---

## 🔧 What Was Changed

### **File:** `src/app/data/door_greeter/attendance/page.jsx`

#### 1. **QR Fetch Logic** (Line 278)
**Before:**
```javascript
if (day < 1 || day > 5) {
  const msg = 'QR hanya tersedia Senin-Jumat';
  console.warn('[Daily QR]', msg);
  setDailyQrError(msg);
  setDailyQrToken(null);
  return;
}
```

**After:**
```javascript
if (day < 1 || day > 7) {
  const msg = 'QR hanya tersedia Senin-Minggu';
  console.warn('[Daily QR]', msg);
  setDailyQrError(msg);
  setDailyQrToken(null);
  return;
}
```

**Impact:** System now fetches QR tokens for weekends

---

#### 2. **Print QR Function** (Line 315)
**Before:**
```javascript
if (!dailyQrToken || day < 1 || day > 5) return;
```

**After:**
```javascript
if (!dailyQrToken || day < 1 || day > 7) return;
```

**Impact:** Print button now works on weekends

---

#### 3. **UI Display** (Line 478)
**Before:**
```javascript
if (day < 1 || day > 5) {
  return (
    <div className="text-center py-8">
      <div className="text-sm text-amber-600 mb-2">QR kehadiran hanya tersedia Senin-Jumat</div>
      <div className="text-xs text-gray-500">Hari ini: {getWeekdayLabel(day)}</div>
    </div>
  );
}
```

**After:**
```javascript
if (day < 1 || day > 7) {
  return (
    <div className="text-center py-8">
      <div className="text-sm text-amber-600 mb-2">QR kehadiran tersedia 7 hari (Senin-Minggu)</div>
      <div className="text-xs text-gray-500">Hari ini: {getWeekdayLabel(day)}</div>
    </div>
  );
}
```

**Impact:** UI now shows positive message about 7-day support

---

## 🎯 Behavior Changes

### **Before Update:**

| Day | Behavior |
|-----|----------|
| Monday-Friday | ✅ Shows QR code |
| Saturday | ❌ "QR hanya tersedia Senin-Jumat" |
| Sunday | ❌ "QR hanya tersedia Senin-Jumat" |

### **After Update:**

| Day | Behavior |
|-----|----------|
| Monday | ✅ Shows QR code (day=1) |
| Tuesday | ✅ Shows QR code (day=2) |
| Wednesday | ✅ Shows QR code (day=3) |
| Thursday | ✅ Shows QR code (day=4) |
| Friday | ✅ Shows QR code (day=5) |
| Saturday | ✅ Shows QR code (day=6) ⭐ **NEW** |
| Sunday | ✅ Shows QR code (day=7) ⭐ **NEW** |

---

## 📊 UI Screenshots Comparison

### **Before (Weekday Only):**
```
╔══════════════════════════════════════╗
║  QR Kehadiran Harian                 ║
╠══════════════════════════════════════╣
║                                      ║
║  ⚠️ QR kehadiran hanya tersedia      ║
║     Senin-Jumat                      ║
║                                      ║
║  Hari ini: Sabtu                     ║
║                                      ║
╚══════════════════════════════════════╝
```

### **After (7 Days Support):**
```
╔══════════════════════════════════════╗
║  QR Kehadiran Harian                 ║
╠══════════════════════════════════════╣
║  QR Kehadiran Sabtu                  ║
║                                      ║
║  ┌──────────────────────┐            ║
║  │   ▄▄▄▄▄▄▄  ▄▄  ▄▄▄▄  │            ║
║  │   █ ▄▄▄ █ ▄█ ▄ █▄▄█  │            ║
║  │   █ ███ █ █▀█▀ ▀█▄▄  │            ║
║  │   █▄▄▄▄▄█ ▄ ▄ █ █ █  │            ║
║  │   ▄▄  ▄  ▄ ██▀▀▀ ▀▄  │            ║
║  │   ▄▄▄▄▄▄▄ █▄█ █ ▀ █  │            ║
║  └──────────────────────┘            ║
║                                      ║
║  [🖨️ Print QR]  [⚙️ Settings]       ║
║                                      ║
╚══════════════════════════════════════╝
```

---

## ✅ Testing Checklist

After this update, verify:

- [ ] Visit `/data/door_greeter/attendance` on **Monday** → QR shows
- [ ] Visit on **Tuesday-Friday** → QR shows
- [ ] Visit on **Saturday** → QR shows (was blocked before)
- [ ] Visit on **Sunday** → QR shows (was blocked before)
- [ ] Print button works on all 7 days
- [ ] Error message if secret not configured shows proper link
- [ ] QR code displays correct day label (Sabtu/Minggu)

---

## 🔗 Related Changes

This update is part of the **Weekend Attendance Support** implementation. Related files:

1. **Settings UI** - `/data/settings/daily_qr` (7 secret fields)
2. **Scan API** - `/api/attendance/scan` (accepts day 1-7)
3. **Database** - Added `attendance_secret_sat` and `attendance_secret_sun`

See `WEEKEND_ATTENDANCE_IMPLEMENTATION.md` for complete documentation.

---

## ⚠️ Important Notes

### 1. **Requires Database Setup**
Weekend QR won't work until you:
- Add `attendance_secret_sat` and `attendance_secret_sun` to settings table
- Generate secrets via `/data/settings/daily_qr`

### 2. **Backward Compatible**
- Existing Monday-Friday setup continues to work
- Weekend support is additive, not breaking

### 3. **Day Detection**
- Uses Asia/Jakarta timezone (WIB)
- Day 1=Monday, 7=Sunday
- Auto-detects current day on page load

### 4. **Error Handling**
If weekend secret not configured, shows:
```
❌ Secret QR belum dikonfigurasi. Silakan set di Settings → Daily QR
[Klik di sini untuk konfigurasi QR secrets]
```

---

## 🚀 Deployment Steps

1. **Update database** - Run `add-weekend-attendance-secrets.sql`
2. **Generate secrets** - Visit `/data/settings/daily_qr` → Click "Generate Semua"
3. **Test weekend** - Visit `/data/door_greeter/attendance` on Saturday/Sunday
4. **Print QR codes** - Use "Print QR" button to generate physical QR posters

---

## 📞 Troubleshooting

### Issue: "QR hanya tersedia Senin-Minggu" shows

**Cause:** This is the fallback message for invalid days (should never show unless system clock is wrong)

**Solution:** Check server timezone settings

---

### Issue: Weekend shows error "Secret QR belum dikonfigurasi"

**Cause:** `attendance_secret_sat` or `attendance_secret_sun` not set in database

**Solution:**
1. Run: `add-weekend-attendance-secrets.sql`
2. Visit: `/data/settings/daily_qr`
3. Click "Generate" for Sabtu and Minggu
4. Click "Simpan Konfigurasi"

---

### Issue: QR shows but scan fails with "not_configured"

**Cause:** Secret exists but is empty string

**Solution:** Regenerate secret via UI (must be non-empty string)

---

**Last Updated:** October 11, 2025  
**Version:** 2.0 (Weekend Support)
