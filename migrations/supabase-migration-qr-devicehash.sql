-- Extend attendance_scan_log with client/server-side device hash variants for better detection
alter table if exists attendance_scan_log
  add column if not exists device_hash_client text,
  add column if not exists device_hash_uaip text;

create index if not exists idx_scan_log_device_client_time on attendance_scan_log(device_hash_client, created_at);
create index if not exists idx_scan_log_device_uaip_time on attendance_scan_log(device_hash_uaip, created_at);
