# Link attendance_scan_log to absen Table

## 🎯 Tujuan

Setiap kali siswa scan QR dan berhasil absen, **`attendance_scan_log`** sekarang akan menyimpan **`absen_id`** yang baru dibuat, sehingga kita bisa:

1. ✅ **Track relationship** - Tau scan log mana yang menghasilkan attendance record mana
2. ✅ **Join queries** - Query gabungan antara scan log dan attendance
3. ✅ **Audit trail** - Lihat detail scan yang menghasilkan attendance
4. ✅ **Better reporting** - Report yang lebih lengkap dengan device info

---

## 📊 Database Schema Changes

### **Before:**
```sql
attendance_scan_log
├─ log_id (PK)
├─ detail_siswa_id
├─ result ('ok', 'error', 'duplicate')
├─ flagged_reason
├─ device_hash_client
└─ ... (no link to absen)

absen
├─ absen_id (PK)
├─ absen_detail_siswa_id
├─ absen_date
└─ ... (no link to scan_log)

❌ No relationship!
```

### **After:**
```sql
attendance_scan_log
├─ log_id (PK)
├─ detail_siswa_id
├─ result ('ok', 'error', 'duplicate')
├─ absen_id (FK) → absen.absen_id ⭐ NEW!
├─ flagged_reason
├─ device_hash_client
└─ ...

absen
├─ absen_id (PK)
├─ absen_detail_siswa_id
├─ absen_date
└─ ...

✅ Now linked via Foreign Key!
```

---

## 🔧 Changes Made

### **1. Database Migration**
**File:** `add-absen-id-to-scan-log.sql`

```sql
-- Add column
ALTER TABLE attendance_scan_log 
  ADD COLUMN absen_id INT8;

-- Add foreign key
ALTER TABLE attendance_scan_log 
  ADD CONSTRAINT fk_scan_log_absen 
  FOREIGN KEY (absen_id) 
  REFERENCES absen(absen_id) 
  ON DELETE SET NULL;

-- Add index
CREATE INDEX idx_scan_log_absen_id 
  ON attendance_scan_log(absen_id);
```

---

### **2. API Changes**
**File:** `src/app/api/attendance/scan/route.js`

#### **Change 1: Capture `absen_id` from insert**

**Before:**
```javascript
const { error: insErr } = await supabaseAdmin
  .from('absen')
  .insert([{ ... }])
if (insErr) throw insErr
```

**After:**
```javascript
const { data: absenData, error: insErr } = await supabaseAdmin
  .from('absen')
  .insert([{ 
    absen_detail_siswa_id: allowedDetail.detail_siswa_id, 
    absen_date: today, 
    absen_time: nowTime, 
    absen_method: isDaily ? 'qr_daily' : 'qr',
    absen_status: 'hadir' 
  }])
  .select()  // ⭐ Now select the created record
  .single()  // ⭐ Get single record

if (insErr) throw insErr

const absenId = absenData?.absen_id  // ⭐ Capture absen_id
```

#### **Change 2: Save `absen_id` to scan log (Success)**

**Before:**
```javascript
await supabaseAdmin.from('attendance_scan_log').insert([{ 
  result: 'ok', 
  detail_siswa_id: allowedDetail.detail_siswa_id, 
  // ❌ No absen_id
  ip, user_agent, ...
}])
```

**After:**
```javascript
await supabaseAdmin.from('attendance_scan_log').insert([{ 
  result: 'ok', 
  detail_siswa_id: allowedDetail.detail_siswa_id, 
  absen_id: absenId, // ⭐ Link to created absen record
  ip, user_agent, ...
}])
```

#### **Change 3: Save `absen_id` to scan log (Duplicate)**

**Before:**
```javascript
if (existing) {
  await supabaseAdmin.from('attendance_scan_log').insert([{ 
    result: 'duplicate', 
    // ❌ No absen_id
    ...
  }])
}
```

**After:**
```javascript
if (existing) {
  await supabaseAdmin.from('attendance_scan_log').insert([{ 
    result: 'duplicate', 
    absen_id: existing.absen_id, // ⭐ Link to existing absen record
    ...
  }])
}
```

#### **Change 4: Return `absen_id` in response**

**Before:**
```javascript
return NextResponse.json({ 
  status: 'ok', 
  flagged: multiUser ? 'device_multi_user' : null 
})
```

**After:**
```javascript
return NextResponse.json({ 
  status: 'ok', 
  absen_id: absenId, // ⭐ Return absen_id to client
  flagged: multiUser ? 'device_multi_user' : null 
})
```

---

## 🚀 Setup Instructions

### **Step 1: Run Database Migration**

```bash
# Copy contents of add-absen-id-to-scan-log.sql
# Paste in Supabase SQL Editor
# Click Run
```

**Expected Output:**
```
✅ Column Added: absen_id (int8, nullable)
✅ Foreign Key Added: fk_scan_log_absen
✅ Indexes Added: idx_scan_log_absen_id
🎉 MIGRATION COMPLETE!
```

### **Step 2: Verify Migration**

```sql
-- Check column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'attendance_scan_log' 
  AND column_name = 'absen_id';

-- Should return:
-- absen_id | bigint (int8)
```

### **Step 3: Test Student Scan**

Student scans QR → Check database:

```sql
-- Check recent scans with absen_id
SELECT 
  log_id,
  detail_siswa_id,
  result,
  absen_id,  -- ⭐ Should be filled now!
  flagged_reason,
  created_at
FROM attendance_scan_log
ORDER BY created_at DESC
LIMIT 5;
```

**Expected Result:**
```
log_id | detail_siswa_id | result | absen_id | flagged_reason | created_at
-------|-----------------|--------|----------|----------------|------------
  123  |      456        |  ok    |   789    | NULL           | 2025-10-11 07:30:00
  124  |      457        |  ok    |   790    | device_multi.. | 2025-10-11 07:31:00
```

---

## 📊 New Query Capabilities

### **Query 1: Find attendance with device info**
```sql
SELECT 
  a.absen_id,
  a.absen_detail_siswa_id,
  a.absen_date,
  a.absen_time,
  asl.device_hash_client,
  asl.ip,
  asl.flagged_reason,
  u.user_fullname
FROM absen a
JOIN attendance_scan_log asl ON a.absen_id = asl.absen_id
JOIN detail_siswa ds ON a.absen_detail_siswa_id = ds.detail_siswa_id
JOIN users u ON ds.detail_siswa_user_id = u.user_id
WHERE a.absen_date = CURRENT_DATE
  AND asl.result = 'ok'
ORDER BY a.absen_time DESC;
```

### **Query 2: Find flagged attendance with full context**
```sql
SELECT 
  asl.log_id,
  asl.flagged_reason,
  asl.device_hash_client,
  a.absen_id,
  a.absen_date,
  a.absen_time,
  u.user_fullname
FROM attendance_scan_log asl
LEFT JOIN absen a ON asl.absen_id = a.absen_id
LEFT JOIN detail_siswa ds ON asl.detail_siswa_id = ds.detail_siswa_id
LEFT JOIN users u ON ds.detail_siswa_user_id = u.user_id
WHERE asl.flagged_reason IS NOT NULL
ORDER BY asl.created_at DESC;
```

### **Query 3: Find duplicate scans**
```sql
SELECT 
  asl.log_id,
  asl.result,
  asl.created_at as scan_time,
  a.absen_id,
  a.absen_time as first_attendance_time,
  u.user_fullname
FROM attendance_scan_log asl
JOIN absen a ON asl.absen_id = a.absen_id
JOIN detail_siswa ds ON asl.detail_siswa_id = ds.detail_siswa_id
JOIN users u ON ds.detail_siswa_user_id = u.user_id
WHERE asl.result = 'duplicate'
ORDER BY asl.created_at DESC;
```

### **Query 4: Device usage report**
```sql
SELECT 
  asl.device_hash_client,
  COUNT(DISTINCT asl.detail_siswa_id) as total_users,
  COUNT(DISTINCT asl.absen_id) as successful_attendance,
  COUNT(*) as total_scans,
  MAX(asl.created_at) as last_used
FROM attendance_scan_log asl
WHERE asl.device_hash_client IS NOT NULL
  AND asl.created_at >= NOW() - INTERVAL '7 days'
GROUP BY asl.device_hash_client
HAVING COUNT(DISTINCT asl.detail_siswa_id) > 1  -- Shared devices
ORDER BY total_users DESC;
```

---

## 🎯 Use Cases

### **1. Audit Trail**
```javascript
// Find all scan attempts for an attendance record
const { data } = await supabase
  .from('attendance_scan_log')
  .select('*')
  .eq('absen_id', 123)
  .order('created_at', { ascending: true });

// Shows: duplicate attempts, flagged scans, etc.
```

### **2. Device Tracking**
```javascript
// Find all attendance created from a specific device
const { data } = await supabase
  .from('attendance_scan_log')
  .select(`
    *,
    absen (
      absen_id,
      absen_date,
      absen_time,
      detail_siswa (
        detail_siswa_id,
        users (user_fullname)
      )
    )
  `)
  .eq('device_hash_client', 'abc123...')
  .eq('result', 'ok');
```

### **3. Fraud Investigation**
```javascript
// Find attendance records created by flagged scans
const { data } = await supabase
  .from('attendance_scan_log')
  .select(`
    *,
    absen (*)
  `)
  .eq('flagged_reason', 'device_multi_user')
  .not('absen_id', 'is', null);

// Review these records for potential fraud
```

---

## 📈 Benefits

| Before | After |
|--------|-------|
| ❌ No connection between scan and attendance | ✅ Direct FK relationship |
| ❌ Can't find device used for attendance | ✅ Easy join to get device info |
| ❌ Can't see flagged scans with attendance | ✅ Full audit trail visible |
| ❌ Manual correlation by time + student | ✅ Automatic linking via absen_id |
| ❌ Reporting requires complex queries | ✅ Simple joins with full context |

---

## ⚠️ Important Notes

### **1. Nullable Column**
- `absen_id` is **nullable** because:
  - Old scan logs won't have it
  - Failed scans (result='error') won't create attendance
  - Duplicate scans reference existing attendance

### **2. ON DELETE SET NULL**
- If `absen` record deleted → `absen_id` in scan log becomes NULL
- Scan log preserved for audit trail
- Won't cascade delete scan logs

### **3. Backfill Historical Data**
- Script includes **optional backfill** query
- Matches old scan logs to attendance by:
  - Student ID
  - Date
  - Time proximity (within 60 seconds)
- Uncomment in migration if needed

---

## 🧪 Testing Checklist

After implementation:

- [ ] Migration runs without errors
- [ ] Column `absen_id` exists in `attendance_scan_log`
- [ ] Foreign key constraint created
- [ ] Indexes created
- [ ] Student scan creates attendance with `absen_id`
- [ ] Scan log records the `absen_id`
- [ ] Duplicate scans record existing `absen_id`
- [ ] Join queries work correctly
- [ ] Response includes `absen_id`

### **Quick Test:**

```bash
# Simulate student scan
curl -X POST http://localhost:3000/api/attendance/scan \
  -H "Content-Type: application/json" \
  -d '{
    "day": 5,
    "tok": "<your-token>",
    "user_id": 123,
    "deviceHash": "test-device"
  }'

# Expected Response:
# {
#   "status": "ok",
#   "absen_id": 789,  ⭐ NEW!
#   "flagged": null
# }
```

---

## 📞 Summary

**What Changed:**
1. ✅ Added `absen_id` column to `attendance_scan_log`
2. ✅ Added FK constraint to `absen` table
3. ✅ API now captures and saves `absen_id`
4. ✅ Response includes `absen_id`

**Benefits:**
- ✅ Complete audit trail with relationships
- ✅ Easy queries joining scan logs and attendance
- ✅ Better fraud detection and reporting
- ✅ Full context for every attendance record

**Files:**
- `add-absen-id-to-scan-log.sql` - Database migration
- `src/app/api/attendance/scan/route.js` - API updates

---

**Ready to use!** 🚀 Jalankan migration dan test student scan.
