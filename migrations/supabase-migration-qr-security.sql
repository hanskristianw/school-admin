-- QR Attendance Security Enhancements
-- Adds device/location fields to attendance_scan_log for geofencing and device-flagging.

-- Add columns if not exist
alter table if exists attendance_scan_log
  add column if not exists device_hash text,
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists accuracy double precision,
  add column if not exists flagged_reason text; -- e.g., 'device_multi_user'

create index if not exists idx_scan_log_device_time on attendance_scan_log(device_hash, created_at);
