# 📚 School Admin - Attendance System Documentation

**Last Updated:** October 11, 2025  
**System Version:** Daily QR with Weekend Support + Multi-User Detection + Scan Log Linking

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Database Schema](#database-schema)
3. [Daily QR Attendance System](#daily-qr-attendance-system)
4. [Multi-User Detection](#multi-user-detection)
5. [Scan Log to Absen Linking](#scan-log-to-absen-linking)
6. [API Endpoints](#api-endpoints)
7. [Frontend Pages](#frontend-pages)
8. [Troubleshooting](#troubleshooting)
9. [Migration History](#migration-history)

---

## 🎯 System Overview

### Purpose
A comprehensive attendance system for schools using QR code scanning with:
- **Daily QR codes** (7 days: Monday-Sunday)
- **Multi-user fraud detection** (device tracking)
- **Audit trail** (scan logs linked to attendance records)
- **Weekend support** (optional Saturday/Sunday attendance)

### Technology Stack
- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** Supabase PostgreSQL
- **Auth:** Custom integer-based user system
- **Timezone:** WIB (Asia/Jakarta)

### Key Features
✅ Daily QR codes that never expire (one per day of week)  
✅ Multi-device fraud detection (15-minute window)  
✅ Weekend attendance support  
✅ Complete audit trail with device tracking  
✅ Foreign key linking between scan logs and attendance  
✅ Admin door greeter with QR display  
✅ Student self-scanning interface  

---

## 🗄️ Database Schema

### Table: `absen`
Main attendance records table.

```sql
CREATE TABLE absen (
  absen_id SERIAL PRIMARY KEY,
  absen_detail_siswa_id INT NOT NULL,
  absen_date DATE NOT NULL,
  absen_time TIME NOT NULL,
  absen_method VARCHAR(20) DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(absen_detail_siswa_id, absen_date)
);
```

**Columns:**
- `absen_id`: Primary key
- `absen_detail_siswa_id`: Foreign key to detail_siswa (student)
- `absen_date`: Date of attendance (WIB)
- `absen_time`: Time of attendance (WIB)
- `absen_method`: `'manual'`, `'qr'`, or `'qr_daily'`
- `created_at`, `updated_at`: Timestamps

**Important:** 
- No `absen_status` column (removed in clean-slate)
- No `absen_session_id` column (removed in clean-slate)
- One record per student per day (UNIQUE constraint)

---

### Table: `attendance_scan_log`
Audit trail for all QR scan attempts (success, duplicate, error).

```sql
CREATE TABLE attendance_scan_log (
  log_id SERIAL PRIMARY KEY,
  result VARCHAR(20) NOT NULL,
  detail_siswa_id INT NOT NULL,
  absen_id INT8,  -- NEW: Links to created attendance record
  ip VARCHAR(100),
  user_agent TEXT,
  device_hash VARCHAR(64),
  device_hash_client VARCHAR(64),
  device_hash_uaip VARCHAR(64),
  lat NUMERIC(10, 8),
  lng NUMERIC(11, 8),
  accuracy NUMERIC(10, 2),
  flagged BOOLEAN DEFAULT FALSE,
  flagged_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fk_scan_log_absen 
    FOREIGN KEY (absen_id) 
    REFERENCES absen(absen_id) 
    ON DELETE SET NULL
);

CREATE INDEX idx_scan_log_absen_id ON attendance_scan_log(absen_id);
CREATE INDEX idx_scan_log_student_result ON attendance_scan_log(detail_siswa_id, result, created_at DESC);
```

**Columns:**
- `log_id`: Primary key
- `result`: `'ok'`, `'duplicate'`, `'error'`
- `detail_siswa_id`: Student who scanned
- `absen_id`: **NEW!** Links to created `absen` record (nullable for old data)
- `ip`: Client IP address
- `user_agent`: Browser user agent
- `device_hash`: Server-calculated device fingerprint
- `device_hash_client`: Client-calculated device fingerprint (optional)
- `device_hash_uaip`: Hash of user agent + IP (fallback)
- `lat`, `lng`, `accuracy`: Geolocation data (optional)
- `flagged`: TRUE if multi-user detected
- `flagged_reason`: Explanation of fraud detection
- `created_at`: Timestamp

**RLS:** Disabled (no Row Level Security)

---

### Table: `settings`
System-wide configuration (includes daily QR secrets).

```sql
CREATE TABLE settings (
  key VARCHAR(255) PRIMARY KEY,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Daily QR Secret Keys:**
```
attendance_secret_mon   → Monday QR secret
attendance_secret_tue   → Tuesday QR secret
attendance_secret_wed   → Wednesday QR secret
attendance_secret_thu   → Thursday QR secret
attendance_secret_fri   → Friday QR secret
attendance_secret_sat   → Saturday QR secret (optional)
attendance_secret_sun   → Sunday QR secret (optional)
```

**Other Keys:**
- `ATTENDANCE_BLOCK_MULTI_USER`: `'true'` or `'false'`
- `ATTENDANCE_MULTI_USER_WINDOW`: Minutes (default: `'15'`)

---

## 🎫 Daily QR Attendance System

### Concept
Instead of generating new QR codes daily, we use **7 permanent secrets** (one for each day of the week). The system:
1. Checks current day (1=Monday, 7=Sunday)
2. Fetches corresponding secret from `settings` table
3. Generates token: `HMAC-SHA256(studentId + date, secret)`
4. Student scans QR → Token validated → Attendance created

### Why Daily QR?
✅ **No expiry** - QR codes are permanent  
✅ **Secure** - Different secret each day  
✅ **Simple** - No session/schedule management  
✅ **Weekend support** - Saturday/Sunday optional  
✅ **School-wide** - One QR per day for entire school  

### Token Generation Algorithm
```javascript
// Server generates token
const secret = settings[`attendance_secret_${dayName}`] // e.g., 'mon'
const message = `${studentId}|${date}` // e.g., "123|2025-10-11"
const token = crypto.createHmac('sha256', secret).update(message).digest('hex')
```

### Token Validation Flow
```
1. Student scans QR with token
2. API extracts studentId from user session
3. API gets current WIB date
4. API gets current day (1-7)
5. API fetches secret for that day
6. API regenerates token with same algorithm
7. Compare: If match → Create attendance ✅
8. If mismatch → Return error ❌
```

### Weekend Support (Added Recently)
- **Before:** Only Monday-Friday (day 1-5)
- **After:** Monday-Sunday (day 1-7)
- **Implementation:**
  - Settings UI supports 7 secrets
  - API validates day 1-7 (was 1-5)
  - Door greeter shows weekend QR codes
  - Secrets can be empty (weekend optional)

---

## 🚨 Multi-User Detection

### Purpose
Detect when multiple students use the same device to scan QR codes (fraud prevention).

### How It Works
1. **Device Fingerprinting:**
   - Server calculates: `SHA256(userAgent + ip)`
   - Client optionally sends: `device_hash_client` (browser fingerprint)
   - Fallback: `SHA256(userAgent + ip)` = `device_hash_uaip`

2. **Multi-User Window Check:**
   - When student scans, check last 15 minutes of scan logs
   - Query: Same device hash, different students
   - If found → Flag as multi-user

3. **Action Modes:**
   - **Warning Mode** (`ATTENDANCE_BLOCK_MULTI_USER=false`):
     - Allow attendance ✅
     - Set `flagged=true` and `flagged_reason`
     - Admin can review later
   
   - **Blocking Mode** (`ATTENDANCE_BLOCK_MULTI_USER=true`):
     - Reject scan ❌
     - Return error to student
     - Log attempt with flag

### Configuration
```sql
-- Enable/disable blocking
UPDATE settings SET value = 'false' WHERE key = 'ATTENDANCE_BLOCK_MULTI_USER';

-- Set detection window (minutes)
UPDATE settings SET value = '15' WHERE key = 'ATTENDANCE_MULTI_USER_WINDOW';
```

### Query Flagged Scans
```sql
SELECT 
  log_id,
  detail_siswa_id,
  result,
  flagged,
  flagged_reason,
  device_hash,
  created_at
FROM attendance_scan_log
WHERE flagged = TRUE
ORDER BY created_at DESC;
```

---

## 🔗 Scan Log to Absen Linking

### Purpose
Link audit logs (`attendance_scan_log`) to attendance records (`absen`) for complete traceability.

### Implementation (Recent Feature)
Added `absen_id` foreign key column to `attendance_scan_log`:

```sql
ALTER TABLE attendance_scan_log ADD COLUMN absen_id INT8;

ALTER TABLE attendance_scan_log 
  ADD CONSTRAINT fk_scan_log_absen 
  FOREIGN KEY (absen_id) 
  REFERENCES absen(absen_id) 
  ON DELETE SET NULL;
```

### API Changes
When attendance is created, API now:
1. Inserts to `absen` table
2. **Captures** `absen_id` from insert: `.select().single()`
3. **Saves** `absen_id` to scan log

```javascript
// Create attendance and get ID
const { data: absenData, error: insErr } = await supabaseAdmin
  .from('absen')
  .insert([{ ... }])
  .select()
  .single()

const absenId = absenData?.absen_id

// Link to scan log
await supabaseAdmin.from('attendance_scan_log').insert([{
  result: 'ok',
  detail_siswa_id: studentId,
  absen_id: absenId,  // ← NEW!
  ...
}])
```

### Use Cases

#### 1. Find Device Info for Attendance
```sql
SELECT 
  a.absen_id,
  a.absen_date,
  a.absen_time,
  asl.device_hash,
  asl.ip,
  asl.user_agent,
  asl.flagged,
  asl.flagged_reason
FROM absen a
JOIN attendance_scan_log asl ON a.absen_id = asl.absen_id
WHERE a.absen_id = 123;
```

#### 2. Find All Attendance from Flagged Scans
```sql
SELECT 
  asl.log_id,
  asl.flagged_reason,
  a.absen_id,
  a.absen_date,
  a.absen_detail_siswa_id,
  a.absen_method
FROM attendance_scan_log asl
JOIN absen a ON asl.absen_id = a.absen_id
WHERE asl.flagged = TRUE
ORDER BY asl.created_at DESC;
```

#### 3. Device Usage Report
```sql
SELECT 
  asl.device_hash,
  COUNT(DISTINCT asl.detail_siswa_id) as unique_students,
  COUNT(a.absen_id) as successful_attendance,
  COUNT(asl.log_id) FILTER (WHERE asl.flagged) as flagged_scans
FROM attendance_scan_log asl
LEFT JOIN absen a ON asl.absen_id = a.absen_id
GROUP BY asl.device_hash
HAVING COUNT(DISTINCT asl.detail_siswa_id) > 1
ORDER BY unique_students DESC;
```

#### 4. Complete Audit Trail
```sql
SELECT 
  asl.log_id,
  asl.result,
  asl.detail_siswa_id,
  asl.device_hash,
  asl.flagged,
  a.absen_id,
  a.absen_date,
  a.absen_time,
  a.absen_method
FROM attendance_scan_log asl
LEFT JOIN absen a ON asl.absen_id = a.absen_id
WHERE asl.created_at >= CURRENT_DATE
ORDER BY asl.created_at DESC;
```

---

## 🔌 API Endpoints

### 1. Generate Daily QR Token
**Endpoint:** `POST /api/attendance/daily-qr`

**Purpose:** Generate QR token for current day (used by door greeter).

**Request:**
```json
{
  "day": 1  // 1=Mon, 2=Tue, ..., 7=Sun (optional, defaults to today)
}
```

**Response (Success):**
```json
{
  "status": "ok",
  "token": "abc123...",
  "day": 1,
  "date": "2025-10-11"
}
```

**Logic:**
1. Get current WIB day (or use provided day)
2. Validate day is 1-7
3. Fetch secret from settings
4. Generate token: `HMAC(studentId + date, secret)`
5. Return token

---

### 2. Scan QR Code (Student)
**Endpoint:** `POST /api/attendance/scan`

**Purpose:** Validate QR token and create attendance.

**Request:**
```json
{
  "token": "abc123...",
  "lat": -6.123,
  "lng": 106.456,
  "accuracy": 10.5,
  "device_hash_client": "xyz789..."  // optional
}
```

**Response (Success):**
```json
{
  "status": "ok",
  "message": "Absensi berhasil",
  "absen_id": 123,
  "flagged": false
}
```

**Response (Duplicate):**
```json
{
  "status": "duplicate",
  "message": "Sudah absen hari ini"
}
```

**Response (Multi-User Warning):**
```json
{
  "status": "ok",
  "message": "Absensi berhasil (terdeteksi multi-user)",
  "flagged": true,
  "flag_reason": "Device digunakan 3 siswa dalam 15 menit terakhir"
}
```

**Response (Multi-User Blocked):**
```json
{
  "status": "error",
  "message": "Device digunakan oleh siswa lain",
  "detail": "..."
}
```

**Logic:**
1. Authenticate user (get studentId)
2. Get current WIB date and time
3. Check for duplicate attendance today
4. Get current day (1-7)
5. Fetch secret for that day
6. Regenerate token and compare
7. If valid → Check multi-user detection
8. If multi-user found:
   - Blocking mode → Return error
   - Warning mode → Create attendance + flag
9. Create attendance record
10. **Capture `absen_id`**
11. Create scan log with `absen_id` link
12. Return success

---

## 🖥️ Frontend Pages

### 1. Settings - Daily QR Management
**Path:** `/data/settings/daily_qr`

**Features:**
- Display 7 secret fields (Mon-Sun)
- Load existing secrets from database
- Generate new secrets (crypto.randomBytes)
- Save individual or all secrets
- Copy secret to clipboard

**Key Functions:**
```javascript
const [secrets, setSecrets] = useState({
  mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: ''
})

const handleGenerateAll = () => {
  // Generate 7 random secrets
}

const handleSaveAll = async () => {
  // Save all 7 to settings table
}
```

---

### 2. Door Greeter - Display QR
**Path:** `/data/door_greeter/attendance`

**Features:**
- Display current day's QR code
- Auto-refresh every 30 seconds
- Print QR code
- Show current date/time
- Support all 7 days (Mon-Sun)

**Logic:**
1. Fetch token from `/api/attendance/daily-qr`
2. Generate QR code: `https://yoursite.com/scan?token=xxx`
3. Display with QRCode.js
4. Auto-refresh to update time display

---

### 3. Student Scan Page
**Path:** `/scan` (or `/attendance/scan`)

**Features:**
- Scan QR code via URL parameter
- Get user's location (optional)
- Calculate device fingerprint (optional)
- Submit to `/api/attendance/scan`
- Show success/error message

**Logic:**
```javascript
const handleScan = async () => {
  const token = new URLSearchParams(window.location.search).get('token')
  const geo = await getLocation()
  const deviceHash = calculateDeviceHash()
  
  const response = await fetch('/api/attendance/scan', {
    method: 'POST',
    body: JSON.stringify({ token, ...geo, device_hash_client: deviceHash })
  })
  
  // Show result
}
```

---

## 🐛 Troubleshooting

### Error: "could not find absen_session_id column"
**Cause:** Clean-slate script removed column, but API still references it.

**Solution:** Remove all `absen_session_id` from insert statements in `/api/attendance/scan/route.js`.

---

### Error: "could not find absen_status column"
**Cause:** Column doesn't exist in schema (removed in clean-slate).

**Solution:** Remove `absen_status: 'hadir'` from insert statement:
```javascript
// ❌ Before
.insert([{ ..., absen_status: 'hadir' }])

// ✅ After
.insert([{ ... }])  // No absen_status
```

---

### Error: "syntax error at or near NOT" (ADD CONSTRAINT IF NOT EXISTS)
**Cause:** PostgreSQL doesn't support `IF NOT EXISTS` for `ADD CONSTRAINT`.

**Solution:** Use DO block to check first:
```sql
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_scan_log_absen'
  ) THEN
    ALTER TABLE attendance_scan_log DROP CONSTRAINT fk_scan_log_absen;
  END IF;
END $$;

ALTER TABLE attendance_scan_log 
  ADD CONSTRAINT fk_scan_log_absen ...;
```

---

### Weekend QR Not Working
**Symptoms:** 
- Settings UI only shows Mon-Fri
- Door greeter shows error on weekends
- API rejects day 6-7 scans

**Solution:** Ensure all components updated:
1. Settings UI: 7 secret fields
2. Daily QR API: Accept day 1-7 (not 1-5)
3. Scan API: Accept day 1-7
4. Door greeter: Show QR for day 1-7

**Check validation code:**
```javascript
// ❌ Old (blocks weekend)
if (day < 1 || day > 5) return error

// ✅ New (allows weekend)
if (day < 1 || day > 7) return error
```

---

### Multi-User Not Detecting
**Symptoms:** Flagged scans not appearing even with multiple students on same device.

**Checks:**
1. Verify `ATTENDANCE_MULTI_USER_WINDOW` setting exists
2. Check device_hash is being calculated
3. Verify time window logic (15 minutes)
4. Check query for other students:
```sql
SELECT * FROM attendance_scan_log
WHERE device_hash = 'xxx'
  AND detail_siswa_id != 123
  AND created_at > NOW() - INTERVAL '15 minutes';
```

---

### Scan Log Not Linking to Absen
**Symptoms:** `absen_id` is NULL in `attendance_scan_log`.

**Checks:**
1. Migration ran? `SELECT column_name FROM information_schema.columns WHERE table_name = 'attendance_scan_log' AND column_name = 'absen_id'`
2. API capturing ID? Check `.select().single()` in insert
3. Check recent scans:
```sql
SELECT log_id, result, absen_id, detail_siswa_id 
FROM attendance_scan_log 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## 📜 Migration History

### 2024 (Early Development)
- **supabase-migration-qr-attendance.sql** - Initial QR attendance
- **supabase-migration-qr-security.sql** - Security enhancements
- **supabase-migration-qr-devicehash.sql** - Device hash tracking
- **supabase-migration-fees.sql** - Fee management (unrelated)
- **supabase-migration-uniform.sql** - Uniform tracking (unrelated)
- **supabase-migration-ai.sql** - AI features (unrelated)

### Daily QR Implementation
- **add-qr-daily-method.sql** - Added `qr_daily` method to `absen_method` enum

### Weekend Support (October 2025)
- **add-weekend-attendance-secrets.sql** - Added sat/sun secrets to settings
- Updated settings UI from 5 to 7 days
- Updated all API endpoints to accept day 1-7
- Updated door greeter to show weekend QR

### Database Cleanup (October 2025)
- **clean-slate-attendance.sql** - Major cleanup:
  - Removed `absen_session_id` column
  - Removed `absen_status` column
  - Simplified schema
  - Added 7-day secrets verification
- **cleanup-scan-log-columns.sql** - Removed unused columns:
  - `session_id`
  - `token_slot`
  - `weekly_mode_flag`
  - `weekday_used`

### Scan Log Linking (October 2025)
- **add-absen-id-to-scan-log.sql** - Added FK relationship:
  - Added `absen_id INT8` column
  - Added foreign key constraint
  - Added performance indexes
  - Updated API to capture and save `absen_id`
  - Fixed `absen_status` column error

### Utility Scripts
- **verify-attendance-schema.sql** - Check schema consistency
- **fix-attendance-schema.sql** - Safe schema repairs
- **check-rls.sql** - Verify RLS policies
- **check-session-usage.sql** - Verify session usage
- **disable-rls-attendance-scan-log.sql** - Disable RLS on scan log
- **enable-rls-examples.sql** - Example RLS policies
- **assessment-calendar.sql** - Assessment calendar (unrelated)

---

## 📊 Current System State (October 2025)

### ✅ Features Complete
- Daily QR attendance (7 days: Mon-Sun)
- Multi-user fraud detection (warning mode)
- Scan log audit trail
- Foreign key linking (scan log → absen)
- Weekend attendance support
- Device fingerprinting
- Geolocation tracking
- Admin door greeter interface
- Student self-scan interface
- Settings management UI

### 🔧 Configuration
```sql
-- Current settings
SELECT * FROM settings WHERE key LIKE 'attendance%';

-- Should show:
-- attendance_secret_mon = 'xxx'
-- attendance_secret_tue = 'xxx'
-- attendance_secret_wed = 'xxx'
-- attendance_secret_thu = 'xxx'
-- attendance_secret_fri = 'xxx'
-- attendance_secret_sat = 'xxx' (optional)
-- attendance_secret_sun = 'xxx' (optional)
-- ATTENDANCE_BLOCK_MULTI_USER = 'false'
-- ATTENDANCE_MULTI_USER_WINDOW = '15'
```

### 📈 Database Stats
```sql
-- Total attendance records
SELECT COUNT(*) FROM absen;

-- Total scan logs
SELECT COUNT(*) FROM attendance_scan_log;

-- Scan success rate
SELECT 
  result,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM attendance_scan_log
GROUP BY result;

-- Flagged scans
SELECT COUNT(*) FROM attendance_scan_log WHERE flagged = TRUE;

-- Linked scans (with absen_id)
SELECT COUNT(*) FROM attendance_scan_log WHERE absen_id IS NOT NULL;
```

---

## 🚀 Next Steps / Future Improvements

### Potential Enhancements
1. **Admin Dashboard:**
   - View daily attendance rates
   - Review flagged scans
   - Device usage reports
   - Export to CSV/Excel

2. **Student App:**
   - History of attendance
   - QR code in student profile
   - Push notifications

3. **Advanced Fraud Detection:**
   - Machine learning for device patterns
   - Location-based validation
   - Time-based restrictions (only during school hours)

4. **Reporting:**
   - Monthly attendance reports
   - Class-based statistics
   - Absence notifications to parents

5. **Integration:**
   - Push to school management system
   - Parent portal integration
   - SMS notifications

---

## 📞 Support & Maintenance

### Key Files to Know
```
src/app/api/attendance/
  ├── daily-qr/route.js       # Generate tokens
  └── scan/route.js            # Validate scans, create attendance

src/app/data/
  ├── settings/daily_qr/page.jsx   # Admin settings UI
  └── door_greeter/attendance/page.jsx  # Display QR

migrations/
  └── (all SQL migration files)

ATTENDANCE_SYSTEM_DOCS.md   # This file
```

### Quick Commands
```bash
# Start development server
npm run dev

# Check database schema
psql -h your-host -U your-user -d your-db -f verify-attendance-schema.sql

# Run migration
psql -h your-host -U your-user -d your-db -f add-absen-id-to-scan-log.sql

# View logs
tail -f .next/logs/attendance.log
```

---

**End of Documentation** 📚

For questions or issues, refer to this document or check the `migrations/` folder for SQL scripts.
