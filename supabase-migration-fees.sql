-- School Fees & UDP (Development - adjust RLS for production)
create table if not exists public.school_fee_definition (
	fee_def_id bigserial primary key,
	unit_id bigint not null references public.unit(unit_id) on delete cascade,
	year_id bigint not null references public.year(year_id) on delete cascade,
	default_amount numeric(12,2) not null default 0 check (default_amount >= 0),
	monthly_amounts numeric(12,2)[] null,
	notes text null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint uq_school_fee_def unique(unit_id, year_id),
	constraint chk_monthly_len check (monthly_amounts is null or array_length(monthly_amounts, 1) = 12)
);

create index if not exists idx_school_fee_unit_year on public.school_fee_definition(unit_id, year_id);

alter table if exists public.school_fee_definition enable row level security;
-- DEV: broad policies (tighten later)
drop policy if exists "public read school_fee_definition" on public.school_fee_definition;
drop policy if exists "public upsert school_fee_definition" on public.school_fee_definition;
create policy "public read school_fee_definition" on public.school_fee_definition for select using (true);
create policy "public upsert school_fee_definition" on public.school_fee_definition for all using (true) with check (true);

-- UDP Definitions
create table if not exists public.udp_definition (
	udp_def_id bigserial primary key,
	unit_id bigint not null references public.unit(unit_id) on delete cascade,
	year_id bigint not null references public.year(year_id) on delete cascade,
	total_amount numeric(12,2) not null check (total_amount >= 0),
	default_installments integer null check (default_installments is null or default_installments >= 1),
	notes text null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint uq_udp_def unique(unit_id, year_id)
);

create index if not exists idx_udp_unit_year on public.udp_definition(unit_id, year_id);

alter table if exists public.udp_definition enable row level security;
drop policy if exists "public read udp_definition" on public.udp_definition;
drop policy if exists "public upsert udp_definition" on public.udp_definition;
create policy "public read udp_definition" on public.udp_definition for select using (true);
create policy "public upsert udp_definition" on public.udp_definition for all using (true) with check (true);

-- UDP Installment Plan (per year, month 1..12)
create table if not exists public.udp_installment_plan (
	plan_id bigserial primary key,
	udp_def_id bigint not null references public.udp_definition(udp_def_id) on delete cascade,
	seq integer not null check (seq >= 1),
	month integer not null check (month between 1 and 12),
	amount numeric(12,2) not null check (amount >= 0),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint uq_udp_plan_month unique(udp_def_id, month),
	constraint uq_udp_plan_seq unique(udp_def_id, seq)
);

create index if not exists idx_udp_plan_def on public.udp_installment_plan(udp_def_id);

alter table if exists public.udp_installment_plan enable row level security;
drop policy if exists "public read udp_installment_plan" on public.udp_installment_plan;
drop policy if exists "public upsert udp_installment_plan" on public.udp_installment_plan;
create policy "public read udp_installment_plan" on public.udp_installment_plan for select using (true);
create policy "public upsert udp_installment_plan" on public.udp_installment_plan for all using (true) with check (true);

-- Optional helper view for effective monthly school fee (fallback to default when monthly is null)
create or replace view public.v_school_fee_monthly as
select 
	d.fee_def_id,
	d.unit_id,
	d.year_id,
	gs.m as month,
	coalesce(d.monthly_amounts[gs.m], d.default_amount) as amount
from public.school_fee_definition d
cross join lateral generate_series(1,12) as gs(m);
