-- QR Attendance Migration
-- Creates attendance_session and attendance_scan_log tables, alters absen, and adds indexes/constraints.

-- Enable pgcrypto if needed for gen_random_uuid
create extension if not exists pgcrypto;

-- Attendance session
create table if not exists attendance_session (
  session_id uuid primary key default gen_random_uuid(),
  created_by_user_id bigint not null references users(user_id) on delete cascade,
  scope_type text not null check (scope_type in ('year','class','all')),
  scope_year_id bigint references year(year_id) on delete set null,
  scope_kelas_id bigint references kelas(kelas_id) on delete set null,
  session_date date not null default current_date,
  start_time timestamptz not null default now(),
  end_time timestamptz null,
  token_step_seconds smallint not null default 20,
  clock_skew_seconds smallint not null default 5,
  secret text not null,
  status text not null default 'open' check (status in ('open','closed'))
);

create index if not exists idx_attendance_session_creator on attendance_session(created_by_user_id);
create index if not exists idx_attendance_session_year on attendance_session(scope_year_id);
create index if not exists idx_attendance_session_kelas on attendance_session(scope_kelas_id);
create index if not exists idx_attendance_session_status on attendance_session(status);

-- Scan log (optional but recommended)
create table if not exists attendance_scan_log (
  log_id bigserial primary key,
  session_id uuid not null references attendance_session(session_id) on delete cascade,
  detail_siswa_id bigint null references detail_siswa(detail_siswa_id) on delete set null,
  token_slot bigint not null,
  result text not null check (result in ('ok','duplicate','expired','invalid','closed','not_allowed')),
  ip inet null,
  user_agent text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_scan_log_session on attendance_scan_log(session_id);
create index if not exists idx_scan_log_detail on attendance_scan_log(detail_siswa_id);

-- Alter absen
alter table absen add column if not exists absen_session_id uuid references attendance_session(session_id) on delete set null;
alter table absen add column if not exists absen_method text not null default 'manual' check (absen_method in ('manual','qr','import'));

-- Ensure unique per student per date
do $$
begin
  -- Try to add unique constraint; ignore if it already exists
  alter table public.absen add constraint uq_absen_detail_date unique (absen_detail_siswa_id, absen_date);
exception
  when duplicate_object then
    -- constraint already exists; no action
    null;
end $$;

create index if not exists idx_absen_session on absen(absen_session_id);

-- RLS policies (sketch, adapt as needed)
-- alter table attendance_session enable row level security;
-- create policy "own_sessions" on attendance_session for select using (created_by_user_id = auth.uid());
-- Note: Use service role (Edge/Server) to access session.secret and to write scan logs safely.
