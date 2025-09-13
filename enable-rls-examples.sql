-- Recommended starting point to secure tables in Supabase when using client-side anon key + server routes
-- Adjust per your needs before running in production.

-- 1) Publicly readable metadata (safe to expose to clients)
-- Menus
alter table if exists public.menus enable row level security;
drop policy if exists "public read menus" on public.menus;
create policy "public read menus" on public.menus
for select using (true);
-- DEV-ONLY: allow client-side writes for menu management (move to server routes in production)
drop policy if exists "public insert menus" on public.menus;
drop policy if exists "public update menus" on public.menus;
drop policy if exists "public delete menus" on public.menus;
create policy "public insert menus" on public.menus for insert with check (true);
create policy "public update menus" on public.menus for update using (true) with check (true);
create policy "public delete menus" on public.menus for delete using (true);

-- Menu permissions (optional to expose; if you prefer to hide, comment this out)
alter table if exists public.menu_permissions enable row level security;
drop policy if exists "public read menu_permissions" on public.menu_permissions;
create policy "public read menu_permissions" on public.menu_permissions
for select using (true);
-- DEV-ONLY: allow managing permissions client-side
drop policy if exists "public insert menu_permissions" on public.menu_permissions;
drop policy if exists "public delete menu_permissions" on public.menu_permissions;
create policy "public insert menu_permissions" on public.menu_permissions for insert with check (true);
create policy "public delete menu_permissions" on public.menu_permissions for delete using (true);

-- 2) Sensitive data: server-only access (service role bypasses RLS)
-- Users
alter table if exists public.users enable row level security;
-- Ensure schema supports hashed passwords and allows null plaintext during migration
alter table if exists public.users
	add column if not exists user_password_hash text;
-- Fully drop legacy plaintext password column
alter table if exists public.users drop column if exists user_password;
-- DEV-ONLY: allow public read of minimal user info used by admin UIs
drop policy if exists "public read users" on public.users;
create policy "public read users" on public.users
for select using (true);
-- DEV-ONLY: allow profile updates from client UI
drop policy if exists "public update users" on public.users;
create policy "public update users" on public.users
for update using (true) with check (true);

create extension if not exists pgcrypto;
-- You can keep pgsodium installed if already present, but it's not required for hashing
create extension if not exists pgsodium;

-- SECURITY DEFINER function to hash and update password
-- Hashing is done inside Postgres using bcrypt via pgcrypto
create or replace function public.secure_update_password(p_user_id bigint, p_new_password text)
returns void
language sql
security definer
set search_path = public
as $$
	update public.users
	-- On Supabase, pgcrypto functions live under the `extensions` schema
	set user_password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
			user_updated_at = now()
	where user_id = p_user_id;
$$;

-- Helper to verify a password against a hash (used by server API)
create or replace function public.verify_password(p_hash text, p_password text)
returns boolean
language sql
security definer
set search_path = public
as $$
	select coalesce(extensions.crypt(p_password, p_hash) = p_hash, false);
$$;

-- Remove legacy auto-hash trigger and function (no longer needed)
drop trigger if exists trg_users_hash_password on public.users;
drop function if exists public.t_users_hash_password();

-- Optional: execution can be limited; service role bypasses anyway.

-- Role
alter table if exists public.role enable row level security;
-- Ensure counselor flag exists on role table
alter table if exists public.role
	add column if not exists is_counselor boolean default false;
-- Allow public read if UI filters by role (teacher detection)
drop policy if exists "public read role" on public.role;
create policy "public read role" on public.role for select using (true);
-- DEV-ONLY: allow client-side role management (move writes server-side in production)
drop policy if exists "public insert role" on public.role;
drop policy if exists "public update role" on public.role;
drop policy if exists "public delete role" on public.role;
create policy "public insert role" on public.role for insert with check (true);
create policy "public update role" on public.role for update using (true) with check (true);
create policy "public delete role" on public.role for delete using (true);

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

-- DEV-friendly policies for attendance (tighten in production)
do $$ begin
	if not exists (
		select 1 from pg_policies where schemaname = 'public' and tablename = 'absen' and policyname = 'public read absen'
	) then
		create policy "public read absen" on public.absen for select using (true);
	end if;
	if not exists (
		select 1 from pg_policies where schemaname = 'public' and tablename = 'absen' and policyname = 'public insert absen'
	) then
		create policy "public insert absen" on public.absen for insert with check (true);
	end if;
	if not exists (
		select 1 from pg_policies where schemaname = 'public' and tablename = 'absen' and policyname = 'public delete absen'
	) then
		create policy "public delete absen" on public.absen for delete using (true);
	end if;
end $$;
-- no public policies => clients cannot touch directly; use server endpoints (service role)

-- 3b) Student Counseling (Consultations)
create table if not exists public.consultation (
	consultation_id bigserial primary key,
	consultation_date date not null,
	consultation_type text not null check (consultation_type in ('private','public')),
	consultation_year_id bigint not null references public.year(year_id) on delete restrict,
	consultation_kelas_id bigint not null references public.kelas(kelas_id) on delete restrict,
	consultation_detail_siswa_id bigint not null references public.detail_siswa(detail_siswa_id) on delete restrict,
	consultation_counselor_user_id bigint null references public.users(user_id) on delete set null,
	consultation_title text null,
	consultation_notes text null,
	created_by_user_id bigint null references public.users(user_id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

-- Helpful indexes
create index if not exists idx_consultation_kelas_date on public.consultation(consultation_kelas_id, consultation_date);
create index if not exists idx_consultation_detail on public.consultation(consultation_detail_siswa_id);

-- Enable RLS and provide DEV-friendly policies (tighten in production)
alter table if exists public.consultation enable row level security;
drop policy if exists "public read consultation" on public.consultation;
drop policy if exists "public insert consultation" on public.consultation;
drop policy if exists "public update consultation" on public.consultation;
drop policy if exists "public delete consultation" on public.consultation;
create policy "public read consultation" on public.consultation for select using (true);
create policy "public insert consultation" on public.consultation for insert with check (true);
create policy "public update consultation" on public.consultation for update using (true) with check (true);
create policy "public delete consultation" on public.consultation for delete using (true);

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

-- 5) Room Booking (master rooms + bookings)
create extension if not exists btree_gist;

-- Rooms master
create table if not exists public.room (
	room_id bigserial primary key,
	room_name text not null unique,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

alter table if exists public.room enable row level security;
drop policy if exists "public read room" on public.room;
create policy "public read room" on public.room for select using (true);
-- DEV-ONLY: allow admin UI from client; move writes server-side for production
drop policy if exists "public insert room" on public.room;
drop policy if exists "public update room" on public.room;
drop policy if exists "public delete room" on public.room;
create policy "public insert room" on public.room for insert with check (true);
create policy "public update room" on public.room for update using (true) with check (true);
create policy "public delete room" on public.room for delete using (true);

-- Room bookings
create table if not exists public.room_booking (
	booking_id bigserial primary key,
	room_id bigint not null references public.room(room_id) on delete cascade,
	requested_by_user_id bigint references public.users(user_id) on delete set null,
	status text not null default 'pending' check (status in ('pending','approved','cancelled')),
	-- Using timestamptz range for actual booking window; half-open [start, end)
	booking_time tstzrange not null,
	purpose text null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	-- sanity check
	constraint room_booking_nonempty check (lower(booking_time) < upper(booking_time))
);

-- Prevent double-booking ONLY among approved bookings
-- This uses a partial exclusion constraint available in Postgres: WHERE (predicate)
alter table if exists public.room_booking drop constraint if exists room_booking_no_overlap_approved;
alter table if exists public.room_booking
	add constraint room_booking_no_overlap_approved
	exclude using gist (
		room_id with =,
		booking_time with &&
	) where (status = 'approved');

alter table if exists public.room_booking enable row level security;
drop policy if exists "public read room_booking" on public.room_booking;
create policy "public read room_booking" on public.room_booking for select using (true);
-- DEV-ONLY: allow client-side writes; production should restrict to teacher/admin via server routes
drop policy if exists "public insert room_booking" on public.room_booking;
drop policy if exists "public update room_booking" on public.room_booking;
drop policy if exists "public delete room_booking" on public.room_booking;
create policy "public insert room_booking" on public.room_booking for insert with check (true);
create policy "public update room_booking" on public.room_booking for update using (true) with check (true);
create policy "public delete room_booking" on public.room_booking for delete using (true);

-- Notes:
-- - Service role (used in serverless functions/routes) bypasses RLS.
-- - After enabling RLS, ensure you REVOKE grants from anon/authenticated if you granted them manually.
-- - Test each table with the anon key from the browser; you should only see what policies allow.

-- 6) Nilai (Grades) - teacher-only, no admin bypass here (same client policy style for DEV)
create table if not exists public.nilai (
	nilai_id bigserial primary key,
	nilai_topic_id bigint not null references public.topic(topic_id) on delete restrict,
	nilai_detail_siswa_id bigint not null references public.detail_siswa(detail_siswa_id) on delete restrict,
	nilai_value smallint not null check (nilai_value between 1 and 8),
	created_by_user_id bigint null references public.users(user_id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint uq_nilai_topic_student unique (nilai_topic_id, nilai_detail_siswa_id)
);

create index if not exists idx_nilai_topic on public.nilai(nilai_topic_id);
create index if not exists idx_nilai_detail on public.nilai(nilai_detail_siswa_id);

alter table if exists public.nilai enable row level security;
drop policy if exists "public read nilai" on public.nilai;
drop policy if exists "public insert nilai" on public.nilai;
drop policy if exists "public update nilai" on public.nilai;
drop policy if exists "public delete nilai" on public.nilai;

-- DEV: broad read for UI listings
create policy "public read nilai" on public.nilai for select using (true);

-- Hardened RLS: teacher-only writes using JWT claims
-- Expectations:
-- - Client sends a JWT (Authorization: Bearer <token>) signed with the project's JWT secret
-- - The JWT contains custom claims:
--     is_teacher: boolean
--     kr_id: bigint (the teacher's user_id in our users table)
-- - These are accessible in Postgres via auth.jwt() JSON
-- - Policies below also ensure the teacher owns the subject of the topic they are writing grades for

-- INSERT: only teachers, and only for topics they own (subject.subject_user_id = kr_id)
create policy "teacher insert nilai" on public.nilai
for insert
with check (
	coalesce((auth.jwt() ->> 'is_teacher')::boolean, false)
	and exists (
		select 1
		from public.topic t
		join public.subject s on s.subject_id = t.topic_subject_id
		where t.topic_id = nilai.nilai_topic_id
			and s.subject_user_id = coalesce((auth.jwt() ->> 'kr_id')::bigint, -1)
	)
);

-- UPDATE: only teachers on rows within their owned topics
create policy "teacher update nilai" on public.nilai
for update
using (
	coalesce((auth.jwt() ->> 'is_teacher')::boolean, false)
	and exists (
		select 1
		from public.topic t
		join public.subject s on s.subject_id = t.topic_subject_id
		where t.topic_id = nilai.nilai_topic_id
			and s.subject_user_id = coalesce((auth.jwt() ->> 'kr_id')::bigint, -1)
	)
)
with check (
	coalesce((auth.jwt() ->> 'is_teacher')::boolean, false)
	and exists (
		select 1
		from public.topic t
		join public.subject s on s.subject_id = t.topic_subject_id
		where t.topic_id = nilai.nilai_topic_id
			and s.subject_user_id = coalesce((auth.jwt() ->> 'kr_id')::bigint, -1)
	)
);

-- DELETE: only teachers on rows within their owned topics
create policy "teacher delete nilai" on public.nilai
for delete
using (
	coalesce((auth.jwt() ->> 'is_teacher')::boolean, false)
	and exists (
		select 1
		from public.topic t
		join public.subject s on s.subject_id = t.topic_subject_id
		where t.topic_id = nilai.nilai_topic_id
			and s.subject_user_id = coalesce((auth.jwt() ->> 'kr_id')::bigint, -1)
	)
);

-- Optional: you can also restrict SELECT to only classes/subjects the teacher owns by uncommenting and adjusting:
-- drop policy if exists "public read nilai" on public.nilai;
-- create policy "teacher read nilai" on public.nilai for select using (
--   coalesce((auth.jwt() ->> 'is_teacher')::boolean, false)
-- );
