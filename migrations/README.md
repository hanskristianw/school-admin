# Database Migrations

This folder contains all SQL migration scripts for the school admin system.

## 📂 Structure

### Active/Current Migrations
- **add-user-email-column.sql** - Adds `user_email` field to `users` table for profile updates
- **add-absen-id-to-scan-log.sql** - ⭐ Latest: Links scan logs to attendance records (FK relationship)
- **cleanup-scan-log-columns.sql** - Remove unused columns from attendance_scan_log
- **add-weekend-attendance-secrets.sql** - Add Saturday/Sunday secrets for weekend attendance

### Core Attendance System
- **supabase-migration-qr-attendance.sql** - Initial QR attendance system
- **supabase-migration-qr-security.sql** - Security enhancements for QR system
- **supabase-migration-qr-devicehash.sql** - Device hash tracking for fraud detection
- **add-qr-daily-method.sql** - Add 'qr_daily' to absen_method enum
- **clean-slate-attendance.sql** - Major cleanup (removed absen_session_id, absen_status)

### Other Systems (Unrelated to Attendance)
- **supabase-migration-fees.sql** - Fee management system
- **supabase-migration-uniform.sql** - Uniform tracking
- **supabase-migration-ai.sql** - AI features
- **assessment-calendar.sql** - Assessment calendar

### Utility Scripts
- **verify-attendance-schema.sql** - Verify schema consistency
- **fix-attendance-schema.sql** - Safe schema repairs
- **check-rls.sql** - Check Row Level Security policies
- **check-session-usage.sql** - Verify session table usage
- **disable-rls-attendance-scan-log.sql** - Disable RLS on scan log
- **enable-rls-examples.sql** - Example RLS policies
- **create_settings_table.sql** - Create settings table
- **conservative-cleanup-attendance.sql** - Conservative cleanup approach

## 🚀 How to Run Migrations

### Using Supabase Dashboard
1. Go to SQL Editor in Supabase Dashboard
2. Open the migration file
3. Copy and paste the SQL
4. Click "Run"

### Using psql
```bash
psql -h your-host -U your-user -d your-db -f migrations/add-absen-id-to-scan-log.sql
```

### Using Supabase CLI
```bash
supabase db push
```

## ⚠️ Important Notes

1. **Order matters!** Run migrations in chronological order
2. **Backup first!** Always backup database before running migrations
3. **Test in staging** before production
4. **Read comments** in each SQL file for specific instructions
5. Some migrations are **optional** (e.g., weekend support if not needed)

## 📋 Migration Checklist

When running a new migration:
- [ ] Backup database
- [ ] Read migration file comments
- [ ] Check dependencies (does it require other migrations first?)
- [ ] Run in test/staging environment
- [ ] Verify results with verification queries
- [ ] Run in production
- [ ] Update documentation
- [ ] Test related features in app

## 🔄 Recent Changes (October 2025)

1. ✅ Weekend support added (day 1-7)
2. ✅ Clean slate cleanup (removed unused columns)
3. ✅ Scan log to absen linking (FK relationship)
4. ✅ Fixed absen_status and absen_session_id errors

See `ATTENDANCE_SYSTEM_DOCS.md` in root folder for complete system documentation.
