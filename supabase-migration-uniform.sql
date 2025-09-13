-- Uniform Sales Module Migration (DEV)
-- Scope: per-Unit (no Year). Buyers are students only. Payments via transfer with receipt upload.

-- 1) Master: Sizes per Unit (dynamic)
create table if not exists public.uniform_size (
  size_id bigserial primary key,
  unit_id integer not null references public.unit(unit_id) on delete cascade,
  size_name text not null,
  display_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Master: Uniforms per Unit
create table if not exists public.uniform (
  uniform_id bigserial primary key,
  unit_id integer not null references public.unit(unit_id) on delete cascade,
  uniform_code text null,
  uniform_name text not null,
  gender text null check (gender in ('boy','girl','unisex')),
  notes text null,
  image_url text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
  -- Uniqueness enforced via expression indexes below
);

-- 3) Per-size pricing/HPP for a Uniform
create table if not exists public.uniform_variant (
  variant_id bigserial primary key,
  uniform_id bigint not null references public.uniform(uniform_id) on delete cascade,
  size_id bigint not null references public.uniform_size(size_id) on delete cascade,
  hpp numeric(12,2) not null default 0,
  price numeric(12,2) not null default 0,
  sku text null,
  barcode text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_uniform_variant unique (uniform_id, size_id)
);

-- 4) Stock transactions (derive current stock from these)
create table if not exists public.uniform_stock_txn (
  txn_id bigserial primary key,
  uniform_id bigint not null references public.uniform(uniform_id) on delete cascade,
  size_id bigint not null references public.uniform_size(size_id) on delete cascade,
  qty_delta integer not null,
  txn_type text not null check (txn_type in ('init','adjust','purchase','sale','return_in','return_out')),
  ref_table text null,
  ref_id bigint null,
  notes text null,
  created_at timestamptz not null default now()
);

-- Helper view: current stock per (uniform,size)
create or replace view public.v_uniform_stock as
select 
  u.uniform_id,
  us.size_id,
  coalesce(sum(t.qty_delta), 0)::int as qty
from public.uniform u
join public.uniform_variant uv on uv.uniform_id = u.uniform_id
join public.uniform_size us on us.size_id = uv.size_id
left join public.uniform_stock_txn t 
  on t.uniform_id = u.uniform_id and t.size_id = us.size_id
group by 1,2;

-- 5) Sales (students only)
create table if not exists public.uniform_sale (
  sale_id bigserial primary key,
  detail_siswa_id integer not null references public.detail_siswa(detail_siswa_id) on delete restrict,
  unit_id integer not null references public.unit(unit_id) on delete restrict,
  sale_date timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending','paid','cancelled')),
  payment_method text not null default 'transfer' check (payment_method in ('transfer')),
  receipt_url text null,
  notes text null,
  total_amount numeric(12,2) not null default 0,
  total_cost numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.uniform_sale_item (
  item_id bigserial primary key,
  sale_id bigint not null references public.uniform_sale(sale_id) on delete cascade,
  uniform_id bigint not null references public.uniform(uniform_id) on delete restrict,
  size_id bigint not null references public.uniform_size(size_id) on delete restrict,
  qty integer not null check (qty > 0),
  unit_price numeric(12,2) not null,
  unit_hpp numeric(12,2) not null,
  subtotal numeric(12,2) not null,
  created_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_uniform_unit on public.uniform(unit_id);
create index if not exists idx_uniform_size_unit on public.uniform_size(unit_id);
create index if not exists idx_uniform_variant_uniform on public.uniform_variant(uniform_id);
create index if not exists idx_uniform_variant_size on public.uniform_variant(size_id);
create index if not exists idx_uniform_stock_txn_us on public.uniform_stock_txn(uniform_id, size_id);
create index if not exists idx_uniform_sale_detail_siswa on public.uniform_sale(detail_siswa_id);
create index if not exists idx_uniform_sale_unit on public.uniform_sale(unit_id);
create index if not exists idx_uniform_sale_item_sale on public.uniform_sale_item(sale_id);

-- Expression-based uniqueness (use unique indexes instead of constraints)
create unique index if not exists uq_uniform_size_name_per_unit
  on public.uniform_size (unit_id, lower(size_name));
create unique index if not exists uq_uniform_code_per_unit
  on public.uniform (unit_id, lower(uniform_code));
create unique index if not exists uq_uniform_name_per_unit
  on public.uniform (unit_id, lower(uniform_name));

-- DEV RLS (allow reads and writes; tighten for production)
alter table public.uniform_size enable row level security;
alter table public.uniform enable row level security;
alter table public.uniform_variant enable row level security;
alter table public.uniform_stock_txn enable row level security;
alter table public.uniform_sale enable row level security;
alter table public.uniform_sale_item enable row level security;

do $$ begin
  -- Allow all read
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='uniform' and policyname='read_uniform'
  ) then
    create policy read_uniform on public.uniform for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='uniform_size' and policyname='read_uniform_size') then
    create policy read_uniform_size on public.uniform_size for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='uniform_variant' and policyname='read_uniform_variant') then
    create policy read_uniform_variant on public.uniform_variant for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='uniform_stock_txn' and policyname='read_uniform_stock_txn') then
    create policy read_uniform_stock_txn on public.uniform_stock_txn for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='uniform_sale' and policyname='read_uniform_sale') then
    create policy read_uniform_sale on public.uniform_sale for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='uniform_sale_item' and policyname='read_uniform_sale_item') then
    create policy read_uniform_sale_item on public.uniform_sale_item for select using (true);
  end if;

  -- DEV upsert policies (allow all write)
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='uniform' and policyname='write_uniform') then
    create policy write_uniform on public.uniform for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='uniform_size' and policyname='write_uniform_size') then
    create policy write_uniform_size on public.uniform_size for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='uniform_variant' and policyname='write_uniform_variant') then
    create policy write_uniform_variant on public.uniform_variant for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='uniform_stock_txn' and policyname='write_uniform_stock_txn') then
    create policy write_uniform_stock_txn on public.uniform_stock_txn for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='uniform_sale' and policyname='write_uniform_sale') then
    create policy write_uniform_sale on public.uniform_sale for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='uniform_sale_item' and policyname='write_uniform_sale_item') then
    create policy write_uniform_sale_item on public.uniform_sale_item for all using (true) with check (true);
  end if;
end $$;

-- Optional: Menus (run once; adjust order/parent as needed)
-- insert into public.menus (menu_name, menu_path, menu_icon, menu_order) values
-- ('Master Ukuran Seragam', '/data/uniform-size', 'fas fa-ruler', 50),
-- ('Master Seragam', '/data/uniform', 'fas fa-shirt', 51),
-- ('Penjualan Seragam', '/sales/uniform', 'fas fa-cart-shopping', 52),
-- ('Laporan Seragam', '/reports/uniform', 'fas fa-clipboard-list', 53);

-- Notes:
-- - Tighten RLS for production: restrict writes to admin roles or move to server routes using service role.
-- - Consider storage bucket 'uniform-receipts' for payment proofs; set appropriate storage policies.
-- - Use v_uniform_stock to display live stock per variant; update via uniform_stock_txn when selling/adjusting.
