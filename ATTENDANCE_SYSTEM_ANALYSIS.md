# 📊 Analisa Sistem Absensi - Daily QR vs Session QR

## 🎯 Executive Summary

**Current State:**
- Sistem sudah menggunakan **Daily QR** (static QR per hari, Senin-Jumat)
- Masih ada **Session QR infrastructure** (tabel `attendance_session`) yang **TIDAK DIGUNAKAN**
- Banyak column `session_id` yang selalu **NULL** untuk daily QR

**Recommendation:**
- **FASE 1:** Keep session infrastructure (backward compatibility)
- **FASE 2:** Deprecate session system jika tidak digunakan dalam 3-6 bulan
- **FASE 3:** Remove session tables dan columns (clean up)

---

## 📋 Tabel-Tabel Absensi

### 1. ✅ `attendance_scan_log` (CORE - DIPERLUKAN)

**Purpose:** Audit log untuk setiap scan QR (security & debugging)

**Columns:**
| Column | Type | Current Use | Daily QR | Session QR | Action |
|--------|------|-------------|----------|------------|--------|
| `log_id` | BIGSERIAL | ✅ Primary key | ✅ NEED | ✅ NEED | **KEEP** |
| `session_id` | UUID | ⚠️ Always NULL for daily | ❌ NULL | ✅ NEED | **NULLABLE** |
| `detail_siswa_id` | BIGINT | ✅ Student reference | ✅ NEED | ✅ NEED | **KEEP** |
| `token_slot` | BIGINT | ⚠️ Not used for daily | ❌ N/A | ✅ NEED | **NULLABLE** |
| `result` | TEXT | ✅ ok/duplicate/invalid | ✅ NEED | ✅ NEED | **KEEP** |
| `device_hash` | TEXT | ✅ Server device hash | ✅ NEED | ✅ NEED | **KEEP** |
| `device_hash_client` | TEXT | ✅ Client fingerprint | ✅ NEED | ✅ NEED | **KEEP** |
| `device_hash_uaip` | TEXT | ✅ UA+IP hash | ✅ NEED | ✅ NEED | **KEEP** |
| `lat`, `lng`, `accuracy` | FLOAT | ✅ Geofencing | ✅ NEED | ✅ NEED | **KEEP** |
| `flagged_reason` | TEXT | ✅ Multi-user detection | ✅ NEED | ✅ NEED | **KEEP** |
| `ip`, `user_agent` | TEXT | ✅ Metadata | ✅ NEED | ✅ NEED | **KEEP** |
| `created_at` | TIMESTAMPTZ | ✅ Timestamp | ✅ NEED | ✅ NEED | **KEEP** |

**Verdict:** 
- ✅ **KEEP TABLE** - Critical for audit & security
- ⚠️ `session_id` dan `token_slot` bisa NULL untuk daily QR (already implemented)

---

### 2. ⚠️ `attendance_session` (LEGACY - EVALUASI)

**Purpose:** Manage rotating QR sessions (old system)

**Columns:**
| Column | Type | Current Use | Daily QR | Session QR | Action |
|--------|------|-------------|----------|------------|--------|
| `session_id` | UUID | 🔴 NOT USED | ❌ N/A | ✅ NEED | **REMOVE IF NO SESSION** |
| `created_by_user_id` | BIGINT | 🔴 NOT USED | ❌ N/A | ✅ NEED | **REMOVE IF NO SESSION** |
| `scope_type` | TEXT | 🔴 NOT USED | ❌ N/A | ✅ NEED | **REMOVE IF NO SESSION** |
| `scope_year_id` | BIGINT | 🔴 NOT USED | ❌ N/A | ✅ NEED | **REMOVE IF NO SESSION** |
| `scope_kelas_id` | BIGINT | 🔴 NOT USED | ❌ N/A | ✅ NEED | **REMOVE IF NO SESSION** |
| `session_date` | DATE | 🔴 NOT USED | ❌ N/A | ✅ NEED | **REMOVE IF NO SESSION** |
| `start_time` | TIMESTAMPTZ | 🔴 NOT USED | ❌ N/A | ✅ NEED | **REMOVE IF NO SESSION** |
| `end_time` | TIMESTAMPTZ | 🔴 NOT USED | ❌ N/A | ✅ NEED | **REMOVE IF NO SESSION** |
| `token_step_seconds` | SMALLINT | 🔴 NOT USED | ❌ N/A | ✅ NEED | **REMOVE IF NO SESSION** |
| `clock_skew_seconds` | SMALLINT | 🔴 NOT USED | ❌ N/A | ✅ NEED | **REMOVE IF NO SESSION** |
| `secret` | TEXT | 🔴 NOT USED | ❌ N/A | ✅ NEED | **REMOVE IF NO SESSION** |
| `status` | TEXT | 🔴 NOT USED | ❌ N/A | ✅ NEED | **REMOVE IF NO SESSION** |

**Verdict:**
- 🔴 **CANDIDATE FOR REMOVAL** - Tidak digunakan untuk daily QR
- ⚠️ Check dulu: Apakah ada fitur session QR yang masih digunakan?
- 💡 **Alternative:** Deprecate dulu, remove setelah 3-6 bulan

---

### 3. ✅ `absen` (CORE - DIPERLUKAN)

**Purpose:** Record attendance (final result)

**Columns:**
| Column | Type | Current Use | Daily QR | Session QR | Action |
|--------|------|-------------|----------|------------|--------|
| `absen_id` | SERIAL | ✅ Primary key | ✅ NEED | ✅ NEED | **KEEP** |
| `absen_detail_siswa_id` | BIGINT | ✅ Student reference | ✅ NEED | ✅ NEED | **KEEP** |
| `absen_date` | DATE | ✅ Attendance date | ✅ NEED | ✅ NEED | **KEEP** |
| `absen_time` | TIME | ✅ Attendance time | ✅ NEED | ✅ NEED | **KEEP** |
| `absen_session_id` | UUID | ⚠️ Always NULL for daily | ❌ NULL | ✅ NEED | **NULLABLE (or REMOVE)** |
| `absen_method` | TEXT | ✅ qr_daily/qr/manual/import | ✅ NEED | ✅ NEED | **KEEP** |

**Verdict:**
- ✅ **KEEP TABLE** - Core attendance record
- ⚠️ `absen_session_id` → **NULL for daily QR** (acceptable)
- 💡 **Consider:** Remove `absen_session_id` jika tidak ada session QR

---

### 4. ✅ `settings` (CORE - DIPERLUKAN)

**Purpose:** Store daily QR secrets

**Columns for Daily QR:**
- `attendance_secret_mon` - Secret untuk Senin
- `attendance_secret_tue` - Secret untuk Selasa
- `attendance_secret_wed` - Secret untuk Rabu
- `attendance_secret_thu` - Secret untuk Kamis
- `attendance_secret_fri` - Secret untuk Jumat

**Verdict:**
- ✅ **KEEP** - Essential untuk daily QR system

---

## 🔍 Code Analysis

### Files Using Session System:

#### 1. `/api/attendance/session/route.js`
```javascript
// ❌ TIDAK DIGUNAKAN untuk daily QR
// Endpoint untuk create/manage session QR
```
**Action:** ⚠️ Deprecate atau remove jika tidak ada UI yang pakai

#### 2. `/api/attendance/scan/route.js`
```javascript
// ✅ HYBRID - Support both daily & session
if (isDaily) {
  // Daily QR logic - session_id = null
} else {
  // Session QR logic - query attendance_session
}
```
**Action:** ✅ KEEP - Already handles both modes

#### 3. Student Scan Page
```javascript
// ✅ Support both QR formats
if (payload.day) {
  // Daily QR
} else if (payload.sid) {
  // Session QR
}
```
**Action:** ✅ KEEP - Backward compatible

---

## 📊 Database Usage Statistics

**To check if session system is used:**
```sql
-- Count sessions created
SELECT COUNT(*) FROM attendance_session;

-- Count scans with session_id
SELECT COUNT(*) FROM attendance_scan_log WHERE session_id IS NOT NULL;

-- Count absen with session_id
SELECT COUNT(*) FROM absen WHERE absen_session_id IS NOT NULL;
```

**If all return 0 → Session system TIDAK DIGUNAKAN**

---

## 🎯 Rekomendasi

### ✅ FASE 1: Keep Current State (SEKARANG)

**Why:**
- Backward compatibility
- Tidak ada masalah performa
- Effort minimal

**Do:**
- ✅ Keep all tables
- ✅ Keep nullable session_id columns
- ✅ Monitor usage

---

### ⚠️ FASE 2: Deprecate Session System (3-6 bulan)

**Jika session system TIDAK DIGUNAKAN:**

**Mark as deprecated:**
```javascript
// src/app/api/attendance/session/route.js
export async function POST(req) {
  console.warn('[DEPRECATED] Session QR system will be removed in v2.0');
  // ... existing code
}
```

**Add warning di UI:**
```jsx
{/* Door Greeter page */}
<div className="bg-yellow-100 border border-yellow-300 rounded p-3">
  ⚠️ Session QR is deprecated. Please use Daily QR instead.
</div>
```

---

### 🔴 FASE 3: Remove Session System (6-12 bulan)

**Jika BENAR-BENAR tidak ada yang pakai:**

#### Step 1: Backup data
```sql
-- Backup session data (jaga-jaga)
CREATE TABLE attendance_session_backup AS SELECT * FROM attendance_session;
CREATE TABLE absen_backup AS SELECT * FROM absen;
```

#### Step 2: Remove foreign keys
```sql
-- Remove FK from attendance_scan_log
ALTER TABLE attendance_scan_log ALTER COLUMN session_id DROP NOT NULL;
-- Session_id sudah nullable, safe to keep

-- Remove FK from absen
ALTER TABLE absen DROP CONSTRAINT IF EXISTS absen_absen_session_id_fkey;
```

#### Step 3: Remove columns (optional)
```sql
-- Remove session_id from absen (OPTIONAL)
ALTER TABLE absen DROP COLUMN IF EXISTS absen_session_id;

-- Keep session_id in attendance_scan_log (for backward compatibility)
-- Just set to NULL for all records
UPDATE attendance_scan_log SET session_id = NULL WHERE session_id IS NOT NULL;
```

#### Step 4: Drop table (FINAL)
```sql
-- Drop attendance_session table
DROP TABLE IF EXISTS attendance_session CASCADE;
```

#### Step 5: Update code
```javascript
// Remove session logic from scan API
// Remove /api/attendance/session route
// Update documentation
```

---

## 💡 Alternatif: Hybrid Long-term

**Keep both systems:**
- Daily QR untuk attendance harian (default)
- Session QR untuk kasus khusus:
  - Event tertentu (ujian, acara)
  - Kelas dengan scope terbatas
  - Guru ingin kontrol penuh start/stop

**Benefit:**
- Flexibility maksimal
- No data loss
- Minimal effort

**Cost:**
- Slightly more complex code
- Nullable columns (acceptable)

---

## 📝 Summary

| Component | Status | Daily QR | Session QR | Action |
|-----------|--------|----------|------------|--------|
| `attendance_scan_log` | ✅ ACTIVE | ✅ YES | ✅ YES | **KEEP** |
| `attendance_session` | 🔴 UNUSED | ❌ NO | ✅ YES | **REMOVE FASE 3** |
| `absen` | ✅ ACTIVE | ✅ YES | ✅ YES | **KEEP** |
| `absen.absen_session_id` | ⚠️ NULLABLE | NULL | VALUE | **KEEP NULLABLE** |
| `attendance_scan_log.session_id` | ⚠️ NULLABLE | NULL | VALUE | **KEEP NULLABLE** |
| `settings` (daily secrets) | ✅ ACTIVE | ✅ YES | ❌ NO | **KEEP** |

---

## ✅ Final Recommendation

### For Now (IMMEDIATE):
**✅ NO CHANGES NEEDED**
- System works perfectly with daily QR
- Session infrastructure tidak ganggu
- Nullable columns acceptable

### Short-term (3 months):
1. **Monitor usage:**
   ```sql
   -- Run quarterly
   SELECT 
     (SELECT COUNT(*) FROM attendance_session) as total_sessions,
     (SELECT COUNT(*) FROM attendance_scan_log WHERE session_id IS NOT NULL) as session_scans,
     (SELECT COUNT(*) FROM absen WHERE absen_session_id IS NOT NULL) as session_absen;
   ```

2. **If all = 0 → Deprecate session system**

### Long-term (6-12 months):
1. **If still 0 usage → Remove:**
   - Drop `attendance_session` table
   - Drop `absen.absen_session_id` column (optional)
   - Remove `/api/attendance/session` route
   - Clean up scan API (remove session logic)

2. **If there's usage → Keep hybrid system**

---

## 🎯 Kesimpulan

**Apakah session tidak perlu?**
- ✅ **YES** - Untuk daily QR, session system **TIDAK DIPERLUKAN**
- ⚠️ **BUT** - Safe to keep untuk backward compatibility
- 🔴 **REMOVE** - Hanya jika sudah **dipastikan tidak ada yang pakai** (3-6 bulan monitoring)

**Column yang bisa NULL/Remove:**
1. `attendance_scan_log.session_id` → NULL untuk daily QR ✅
2. `attendance_scan_log.token_slot` → Not used untuk daily QR ✅
3. `absen.absen_session_id` → NULL untuk daily QR ✅

**Table yang bisa di-remove (fase 3):**
1. `attendance_session` → Tidak digunakan untuk daily QR 🔴

**Effort vs Benefit:**
- **Keep current state:** 0 effort, no risk ✅
- **Remove session system:** Medium effort, small benefit 🤷
- **Recommendation:** Keep for now, remove later if confirmed unused 👍
