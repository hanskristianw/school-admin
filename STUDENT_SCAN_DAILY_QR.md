# Student Scan Page - Daily QR Support

## Changes Made

### 1. Support Both QR Formats
Updated `/src/app/student/scan/page.jsx` to support both:
- **Daily QR**: `{day: 5, tok: "abc123..."}`
- **Session QR (legacy)**: `{sid: "uuid", tok: "xyz789..."}`

### 2. Payload Construction
```javascript
const payload = JSON.parse(decodedText);

const requestBody = {
  user_id: kr_id,
  deviceHash: deviceHashRef.current,
  geo: geoRef.current
};

if (payload.day) {
  // Daily static QR
  requestBody.day = payload.day;
  requestBody.tok = payload.tok;
} else if (payload.sid) {
  // Session-based QR (legacy)
  requestBody.sid = payload.sid;
  requestBody.tok = payload.tok;
} else {
  throw new Error('QR format tidak valid');
}
```

### 3. Enhanced Error Handling
Now displays debug messages from server for better troubleshooting:

- `invalid_token` → Shows token mismatch details
- `wrong_day` → Shows which day QR is for vs current day
- `invalid_day` → Shows day must be 1-5
- `not_configured` → Shows which secret needs to be set
- All errors → Falls back to debug message from server if available

### 4. Console Logging
Added debug logging:
```javascript
if (j.debug) {
  console.log('[Student Scan] Server debug:', j.debug);
}
```

## Testing Flow

1. **Generate Daily QR**:
   - Admin visits `/data/settings/daily_qr`
   - Sets secret for Friday: `attendance_secret_fri`
   - Visits `/data/door_greeter/attendance`
   - QR for Friday is displayed

2. **Student Scans**:
   - Student opens `/student/scan`
   - Camera scans QR with `{day: 5, tok: "..."}`
   - App sends request to `/api/attendance/scan`
   - Server validates token against secret
   - Success: Attendance recorded with `absen_method='qr_daily'`
   - Error: Debug message displayed to student

3. **Error Cases**:
   - Wrong day: "QR untuk hari Sen, tapi sekarang hari Jum"
   - Token mismatch: "Token tidak cocok. Expected: abc12345..., Got: xyz67890..."
   - Not configured: "Secret untuk hari Jum belum diset di /data/settings/daily_qr"
   - Weekend: "QR kehadiran hanya tersedia Senin-Jumat"

## Backward Compatibility

The student scan page still supports legacy session-based QR codes:
- If QR contains `{sid: "...", tok: "..."}`, uses session validation
- If QR contains `{day: ..., tok: "..."}`, uses daily validation
- Both can coexist during migration period

## Benefits

1. **Better UX**: Students see clear error messages instead of generic "QR invalid"
2. **Easier Debug**: Admin can copy token from Door Greeter page to verify
3. **Flexible**: Supports both old and new QR systems
4. **School-wide**: One QR per day for all students (no class filtering)
5. **Print & Forget**: QR can be printed and posted at entrance
