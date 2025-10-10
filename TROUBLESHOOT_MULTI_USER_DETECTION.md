# Troubleshooting Multi-User Device Detection

## Symptom: "Saya scan berkali-kali tapi tidak ada flag terdeteksi"

### Checklist Diagnosis

#### 1. ⚠️ User yang Sama vs User yang Berbeda

**PENTING**: Multi-user detection hanya mendeteksi ketika **USER BERBEDA** menggunakan device yang sama.

❌ **Tidak Akan Terdeteksi:**
- User A scan → User A scan lagi → **NO FLAG** (user yang sama)
- Scan ulang dari user yang sama dianggap normal (atau akan ditolak sebagai "duplicate")

✅ **Akan Terdeteksi:**
- User A scan → User B scan dengan device A → **FLAGGED** (user berbeda)
- Siswa A scan → Siswa B pinjam HP A untuk scan → **FLAGGED**

#### 2. 🔍 Check Environment Configuration

Pastikan settings di `.env.local`:

```bash
# Window waktu detection (default: 15 menit)
ATTENDANCE_DEVICE_WINDOW_MIN=15

# Mode: false = warning only (recommended), true = block
ATTENDANCE_BLOCK_MULTI_USER=false

# Match mode
ATTENDANCE_MULTI_MATCH=client_or_uaip
```

**Test dengan restart server:**
```bash
# Stop server
Ctrl+C

# Start server
npm run dev
```

#### 3. 📱 Check Device Hash

Device hash harus dikirim dari student app. Check di console server apakah muncul:

```
[scan] Device hashes: { clientDeviceHash: 'abc123...', deviceHash: 'xyz789...', uaIpHash: 'def456...' }
```

**Jika clientDeviceHash = undefined:**
- Student app tidak mengirim device hash
- Fallback ke UA+IP hash (kurang akurat)
- Perlu update student app untuk generate device hash

#### 4. 🕐 Check Timing Window

Detection window default: **15 menit**

**Scenario:**
- 09:00 - User A scan → OK
- 09:05 - User B scan dengan device A → **FLAGGED** ✅ (dalam 15 menit)
- 09:20 - User C scan dengan device A → **NOT FLAGGED** ❌ (sudah >15 menit dari User A)

**Solution jika perlu window lebih panjang:**
```bash
# Extend ke 30 menit
ATTENDANCE_DEVICE_WINDOW_MIN=30
```

#### 5. 📊 Check Database Logs

Query untuk cek apakah ada log sama sekali:

```sql
SELECT 
  log_id,
  detail_siswa_id,
  result,
  flagged_reason,
  device_hash_client,
  created_at
FROM attendance_scan_log
WHERE created_at >= CURRENT_DATE
  AND result = 'ok'
ORDER BY created_at DESC
LIMIT 20;
```

**Expected output:**
- Jika multi-user terjadi: `flagged_reason = 'device_multi_user'`
- Jika normal: `flagged_reason = NULL`

#### 6. 🖥️ Check Server Logs

Jalankan server dengan terminal terbuka, lalu scan:

**Expected logs:**
```
[scan] Request received: { hasDay: true, hasSid: false, day: 5, user_id: 123 }
[scan] Multi-user detection config: { windowMin: 15, blockMulti: false, matchMode: 'client_or_uaip' }
[scan] Device hashes: { clientDeviceHash: 'abc123...', deviceHash: 'xyz789...', uaIpHash: 'def456...' }
[scan] Checking for recent scans since: 2025-10-10T01:45:00.000Z
[scan] Query OR parts: [ 'device_hash.eq.abc123...', ... ]
[scan] Recent scans found: 0  <-- atau 1 jika ada multi-user
[scan] Recording success. MultiUser flag: false  <-- atau true jika detected
[scan] ✅ Success! Attendance recorded { detail_siswa_id: 123, flagged: false }
```

**Jika ada multi-user:**
```
[scan] Recent scans found: 1
[scan] Multi-user detected! Recent scan: { detail_siswa_id: 456, created_at: '...', device_hash_client: '...' }
[scan] Recording success. MultiUser flag: true
```

---

## Test Procedure

### Step-by-Step Test untuk Multi-User Detection:

#### Test 1: Same User (Should NOT Flag)
1. Login sebagai **Siswa A** di student app
2. Scan QR → Success, **tidak ada flag**
3. Logout
4. Login lagi sebagai **Siswa A** (user yang sama!)
5. Scan QR → "Duplicate" (sudah absen hari ini)
6. **Result**: Tidak ada flag (expected behavior)

#### Test 2: Different User (SHOULD Flag)
1. Login sebagai **Siswa A** di student app
2. Scan QR → Success
3. Logout
4. Login sebagai **Siswa B** (user berbeda!)
5. Scan QR → Success, **FLAGGED** ✅
6. Check console: `[scan] Multi-user detected!`
7. Check `/data/attendance_flags` → Siswa B muncul di list
8. **Result**: Siswa B ter-flag (expected behavior)

#### Test 3: Different Device (Should NOT Flag)
1. HP A: Login Siswa A → Scan → Success
2. HP B: Login Siswa B → Scan → Success, **tidak ada flag**
3. **Result**: Tidak flag karena device berbeda (expected)

#### Test 4: Window Timeout (Should NOT Flag)
1. 09:00 - Siswa A scan dengan HP → Success
2. 09:20 - Siswa B scan dengan HP yang sama (>15 menit) → Success, **tidak ada flag**
3. **Result**: Tidak flag karena sudah lewat window (expected)

---

## Common Issues & Solutions

### Issue 1: "Device hash selalu berbeda"
**Symptom**: Setiap scan, device_hash_client berubah

**Possible Causes:**
- Student app tidak persistent device hash
- User pakai incognito/private mode
- Browser cache di-clear

**Solution:**
- Update student app untuk save device hash ke localStorage
- Fallback ke UA+IP hash (set `ATTENDANCE_MULTI_MATCH=client_or_uaip`)

### Issue 2: "Terlalu banyak false positive"
**Symptom**: Device sharing legitimate tapi tetap flag (misal: siblings pakai HP orangtua)

**Solution:**
- Keep `ATTENDANCE_BLOCK_MULTI_USER=false` (warning mode)
- Admin review manual di `/data/attendance_flags`
- Consider whitelist device hash tertentu

### Issue 3: "Tidak terdeteksi sama sekali"
**Symptom**: Device sharing obvious tapi tidak ada flag

**Checklist:**
1. ✅ `ATTENDANCE_DEVICE_WINDOW_MIN > 0` (tidak boleh 0!)
2. ✅ Scan dengan **user berbeda** (bukan user yang sama)
3. ✅ Scan dalam window time (default 15 menit)
4. ✅ Device hash terkirim (check console log)
5. ✅ Server sudah restart setelah update .env

**Debug:**
```bash
# Di terminal server, pastikan muncul:
[scan] Multi-user detection config: { windowMin: 15, blockMulti: false, matchMode: 'client_or_uaip' }

# Jika windowMin: 0 → detection disabled!
```

### Issue 4: "Flagged tapi tidak muncul di /data/attendance_flags"
**Symptom**: Console log bilang flagged tapi UI tidak tampil

**Possible Causes:**
1. Query tanggal salah
2. Filter result='ok' terlalu strict
3. Relationship query salah

**Solution:**
1. Check tanggal filter di attendance_flags page
2. Query direct ke database:
```sql
SELECT * FROM attendance_scan_log
WHERE flagged_reason IS NOT NULL
  AND created_at >= CURRENT_DATE
ORDER BY created_at DESC;
```

---

## Advanced Debugging

### Query untuk cek detection logic:

```sql
-- Find all scans from same device within 15 minutes
WITH recent_scans AS (
  SELECT 
    log_id,
    detail_siswa_id,
    device_hash_client,
    created_at
  FROM attendance_scan_log
  WHERE created_at >= NOW() - INTERVAL '15 minutes'
    AND result = 'ok'
    AND detail_siswa_id IS NOT NULL
)
SELECT 
  a.log_id as scan1_id,
  a.detail_siswa_id as user1_id,
  b.log_id as scan2_id,
  b.detail_siswa_id as user2_id,
  a.device_hash_client,
  b.created_at - a.created_at as time_diff
FROM recent_scans a
JOIN recent_scans b ON a.device_hash_client = b.device_hash_client
WHERE a.detail_siswa_id != b.detail_siswa_id
  AND b.created_at > a.created_at
ORDER BY b.created_at DESC;
```

### Enable verbose logging:

Add more logging to scan API:
```javascript
// In scan/route.js, add after line 250:
console.log('[scan] Query result:', { 
  recentCount: recent?.length, 
  recentDetails: recent,
  currentUser: allowedDetail.detail_siswa_id 
});
```

---

## Summary

✅ **Multi-user detection HANYA untuk USER BERBEDA**  
✅ **Butuh device hash dari client (atau fallback UA+IP)**  
✅ **Window time default 15 menit**  
✅ **Mode warning (tidak block) - review manual di /data/attendance_flags**  
✅ **Check server logs untuk debugging**  

**Key point**: Jika Anda scan berkali-kali dengan **user yang sama**, itu TIDAK akan flag karena dianggap normal. Harus scan dengan **2 user berbeda** dalam 15 menit dengan device yang sama untuk trigger flag.
