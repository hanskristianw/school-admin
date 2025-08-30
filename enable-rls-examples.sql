-- Recommended starting point to secure tables in Supabase when using client-side anon key + server routes
-- Adjust per your needs before running in production.

-- 1) Publicly readable metadata (safe to expose to clients)
-- Menus
alter table if exists public.menus enable row level security;
drop policy if exists "public read menus" on public.menus;
create policy "public read menus" on public.menus
for select using (true);

-- Menu permissions (optional to expose; if you prefer to hide, comment this out)
alter table if exists public.menu_permissions enable row level security;
drop policy if exists "public read menu_permissions" on public.menu_permissions;
create policy "public read menu_permissions" on public.menu_permissions
for select using (true);

-- 2) Sensitive data: server-only access (service role bypasses RLS)
-- Users
alter table if exists public.users enable row level security;
-- DEV-ONLY: allow public read of minimal user info used by admin UIs
drop policy if exists "public read users" on public.users;
create policy "public read users" on public.users
for select using (true);

-- Role
alter table if exists public.role enable row level security;
-- Allow public read if UI filters by role (teacher detection)
drop policy if exists "public read role" on public.role;
create policy "public read role" on public.role for select using (true);

-- Academic data (adjust visibility as needed)
alter table if exists public.unit enable row level security;
drop policy if exists "public read unit" on public.unit;
create policy "public read unit" on public.unit for select using (true);

alter table if exists public.year enable row level security;
drop policy if exists "public read year" on public.year;
create policy "public read year" on public.year for select using (true);

alter table if exists public.kelas enable row level security;
drop policy if exists "public read kelas" on public.kelas;
create policy "public read kelas" on public.kelas for select using (true);

alter table if exists public.subject enable row level security;
drop policy if exists "public read subject" on public.subject;
create policy "public read subject" on public.subject for select using (true);

alter table if exists public.detail_kelas enable row level security;
drop policy if exists "public read detail_kelas" on public.detail_kelas;
create policy "public read detail_kelas" on public.detail_kelas for select using (true);
-- DEV-ONLY: allow managing class-subject relations from client UI
drop policy if exists "public insert detail_kelas" on public.detail_kelas;
drop policy if exists "public update detail_kelas" on public.detail_kelas;
drop policy if exists "public delete detail_kelas" on public.detail_kelas;
create policy "public insert detail_kelas" on public.detail_kelas for insert with check (true);
create policy "public update detail_kelas" on public.detail_kelas for update using (true) with check (true);
create policy "public delete detail_kelas" on public.detail_kelas for delete using (true);

-- Student-class mapping used by student dashboard
alter table if exists public.detail_siswa enable row level security;
drop policy if exists "public read detail_siswa" on public.detail_siswa;
create policy "public read detail_siswa" on public.detail_siswa for select using (true);

-- 3) Attendance tables: accessed via server API only
alter table if exists public.attendance_session enable row level security;
alter table if exists public.attendance_scan_log enable row level security;
alter table if exists public.absen enable row level security;
-- no public policies => clients cannot touch directly; use server endpoints (service role)

-- 4) Door greeter & timetable: usually admin pages only
alter table if exists public.daftar_door_greeter enable row level security;
-- DEV-ONLY: broad access so admin UI works from client. Move writes server-side for production.
drop policy if exists "public read door_greeter" on public.daftar_door_greeter;
drop policy if exists "public insert door_greeter" on public.daftar_door_greeter;
drop policy if exists "public update door_greeter" on public.daftar_door_greeter;
drop policy if exists "public delete door_greeter" on public.daftar_door_greeter;
create policy "public read door_greeter" on public.daftar_door_greeter for select using (true);
create policy "public insert door_greeter" on public.daftar_door_greeter for insert with check (true);
create policy "public update door_greeter" on public.daftar_door_greeter for update using (true) with check (true);
create policy "public delete door_greeter" on public.daftar_door_greeter for delete using (true);
alter table if exists public.timetable enable row level security;
-- DEV-ONLY: broad access so admin UI works from client. Move writes server-side for production.
drop policy if exists "public read timetable" on public.timetable;
drop policy if exists "public insert timetable" on public.timetable;
drop policy if exists "public update timetable" on public.timetable;
drop policy if exists "public delete timetable" on public.timetable;
create policy "public read timetable" on public.timetable for select using (true);
create policy "public insert timetable" on public.timetable for insert with check (true);
create policy "public update timetable" on public.timetable for update using (true) with check (true);
create policy "public delete timetable" on public.timetable for delete using (true);
-- leave without public policies, or add read-only if UI needs client-side read

-- Notes:
-- - Service role (used in serverless functions/routes) bypasses RLS.
-- - After enabling RLS, ensure you REVOKE grants from anon/authenticated if you granted them manually.
-- - Test each table with the anon key from the browser; you should only see what policies allow.
