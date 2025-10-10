# Database Schema Reference - attendance_scan_log Table

## Table Structure

```sql
CREATE TABLE attendance_scan_log (
  -- Primary Key
  log_id BIGSERIAL PRIMARY KEY,  -- ⚠️ NOT scan_log_id!
  
  -- Session Reference
  session_id UUID REFERENCES attendance_session(session_id) ON DELETE CASCADE,
  
  -- Student Reference
  detail_siswa_id BIGINT REFERENCES detail_siswa(detail_siswa_id) ON DELETE SET NULL,
  
  -- QR Token Validation
  token_slot BIGINT NOT NULL,  -- Time slot for token validation (for session-based QR)
  
  -- Scan Result
  result TEXT NOT NULL CHECK (result IN ('ok', 'duplicate', 'expired', 'invalid', 'closed', 'not_allowed')),
  
  -- Security & Location (added via migration)
  device_hash TEXT,              -- Server-side device hash (SHA256 of UA+IP)
  device_hash_client TEXT,       -- Client-side device fingerprint
  device_hash_uaip TEXT,         -- Backup UA+IP hash
  lat DOUBLE PRECISION,          -- GPS latitude
  lng DOUBLE PRECISION,          -- GPS longitude
  accuracy DOUBLE PRECISION,     -- GPS accuracy in meters
  flagged_reason TEXT,           -- 'device_multi_user', 'outside_geofence', etc.
  
  -- Request Metadata
  ip INET,                       -- Client IP address
  user_agent TEXT,               -- Browser user agent string
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Indexes

```sql
CREATE INDEX idx_scan_log_session ON attendance_scan_log(session_id);
CREATE INDEX idx_scan_log_detail ON attendance_scan_log(detail_siswa_id);
CREATE INDEX idx_scan_log_device_time ON attendance_scan_log(device_hash, created_at);
CREATE INDEX idx_scan_log_device_client_time ON attendance_scan_log(device_hash_client, created_at);
CREATE INDEX idx_scan_log_device_uaip_time ON attendance_scan_log(device_hash_uaip, created_at);
```

## Important Notes

### ⚠️ Primary Key
The primary key is **`log_id`**, NOT `scan_log_id`!

❌ **WRONG:**
```javascript
.select('scan_log_id, result, ...')  // This will fail!
```

✅ **CORRECT:**
```javascript
.select('log_id, result, ...')
```

### Result Values
- `'ok'` - Scan successful, attendance recorded
- `'duplicate'` - Student already scanned today
- `'expired'` - Token expired (for session-based QR)
- `'invalid'` - Token invalid or wrong day (for daily QR)
- `'closed'` - Session closed (for session-based QR)
- `'not_allowed'` - Student not in session scope

### Flagged Reasons
- `'device_multi_user'` - Multiple users on same device within time window
- `'outside_geofence'` - GPS location outside allowed radius
- `'no_location'` - GPS data not provided
- `null` - No flag (normal scan)

## Query Examples

### Get All Flagged Scans for Today
```javascript
const today = new Date().toISOString().slice(0, 10);
const { data } = await supabase
  .from('attendance_scan_log')
  .select(`
    log_id,
    result,
    flagged_reason,
    created_at,
    device_hash_client,
    lat,
    lng,
    detail_siswa:detail_siswa_id (
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
    )
  `)
  .gte('created_at', `${today}T00:00:00`)
  .lte('created_at', `${today}T23:59:59`)
  .eq('result', 'ok')
  .not('flagged_reason', 'is', null)
  .order('created_at', { ascending: false });
```

### Get Successful Scans for a Session
```javascript
const { data } = await supabase
  .from('attendance_scan_log')
  .select('log_id, detail_siswa_id, created_at')
  .eq('session_id', sessionId)
  .eq('result', 'ok')
  .order('created_at', { ascending: false });
```

### Find Multi-User Devices
```javascript
const windowStart = new Date(Date.now() - 15 * 60 * 1000).toISOString();
const { data } = await supabase
  .from('attendance_scan_log')
  .select('device_hash_client, detail_siswa_id, created_at')
  .eq('device_hash_client', deviceHash)
  .gte('created_at', windowStart)
  .eq('result', 'ok')
  .not('detail_siswa_id', 'is', null);
```

### Count Scans by Result
```sql
SELECT 
  result,
  COUNT(*) as count
FROM attendance_scan_log
WHERE created_at >= CURRENT_DATE
GROUP BY result
ORDER BY count DESC;
```

### Get Flagged Scans with Full Details
```sql
SELECT 
  asl.log_id,
  asl.created_at,
  asl.result,
  asl.flagged_reason,
  asl.device_hash_client,
  asl.lat,
  asl.lng,
  CONCAT(u.user_nama_depan, ' ', u.user_nama_belakang) as student_name,
  k.kelas_nama
FROM attendance_scan_log asl
LEFT JOIN detail_siswa ds ON asl.detail_siswa_id = ds.detail_siswa_id
LEFT JOIN users u ON ds.detail_siswa_user_id = u.user_id
LEFT JOIN kelas k ON ds.detail_siswa_kelas_id = k.kelas_id
WHERE asl.created_at >= CURRENT_DATE
  AND asl.result = 'ok'
  AND asl.flagged_reason IS NOT NULL
ORDER BY asl.created_at DESC;
```

## Common Mistakes

### 1. Wrong Primary Key Name
❌ **WRONG:**
```javascript
key={log.scan_log_id}  // Undefined!
```

✅ **CORRECT:**
```javascript
key={log.log_id}
```

### 2. Forgetting Nullable Columns
Some columns can be `NULL`:
- `session_id` - NULL for daily QR scans
- `detail_siswa_id` - NULL if scan failed before student identification
- `flagged_reason` - NULL for normal (non-flagged) scans
- `ip`, `user_agent` - NULL if not captured
- `lat`, `lng`, `accuracy` - NULL if GPS not provided

Always check for null:
```javascript
const location = log.lat && log.lng 
  ? `${log.lat.toFixed(6)}, ${log.lng.toFixed(6)}`
  : 'No location';
```

### 3. Wrong Result Check
❌ **WRONG:**
```javascript
.eq('result', 'success')  // No such value!
```

✅ **CORRECT:**
```javascript
.eq('result', 'ok')  // Correct value
```

## Relationships

### detail_siswa
```javascript
.select(`
  log_id,
  detail_siswa:detail_siswa_id (
    detail_siswa_id,
    detail_siswa_user_id,
    detail_siswa_kelas_id
  )
`)
```

### attendance_session (for session-based QR)
```javascript
.select(`
  log_id,
  attendance_session:session_id (
    session_id,
    scope_type,
    session_date,
    status
  )
`)
```

## Use Cases

### 1. Audit Log
Track all scan attempts (successful and failed) for security auditing.

### 2. Multi-User Detection
Identify when multiple students use the same device for attendance.

### 3. Geofencing Validation
Log GPS coordinates and flag scans outside allowed radius.

### 4. Analytics
Analyze scan patterns, peak times, common errors, etc.

### 5. Troubleshooting
Debug why a student's scan failed by checking the log entry.

## Migration Files

1. **supabase-migration-qr-attendance.sql**
   - Creates base table with `log_id`, `session_id`, `detail_siswa_id`, `token_slot`, `result`, `ip`, `user_agent`, `created_at`

2. **supabase-migration-qr-security.sql**
   - Adds `device_hash`, `lat`, `lng`, `accuracy`, `flagged_reason`

3. **supabase-migration-qr-devicehash.sql**
   - Adds `device_hash_client`, `device_hash_uaip`

## Complete Column List

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `log_id` | BIGSERIAL | NO | Primary key (auto-increment) |
| `session_id` | UUID | YES | Reference to attendance_session (NULL for daily QR) |
| `detail_siswa_id` | BIGINT | YES | Reference to detail_siswa (NULL if failed) |
| `token_slot` | BIGINT | NO | Time slot for token validation |
| `result` | TEXT | NO | Scan result: 'ok', 'duplicate', 'invalid', etc. |
| `device_hash` | TEXT | YES | Server-side device hash |
| `device_hash_client` | TEXT | YES | Client-side device fingerprint |
| `device_hash_uaip` | TEXT | YES | Backup UA+IP hash |
| `lat` | DOUBLE PRECISION | YES | GPS latitude |
| `lng` | DOUBLE PRECISION | YES | GPS longitude |
| `accuracy` | DOUBLE PRECISION | YES | GPS accuracy (meters) |
| `flagged_reason` | TEXT | YES | Reason for flagging |
| `ip` | INET | YES | Client IP address |
| `user_agent` | TEXT | YES | Browser user agent |
| `created_at` | TIMESTAMPTZ | NO | Timestamp of scan |

---

**Last Updated**: October 2025  
**Table Name**: `attendance_scan_log`  
**Primary Key**: `log_id` ⚠️
