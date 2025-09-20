-- AI Rule configuration (single-row table)
create table if not exists public.ai_rule (
  ai_rule_id bigserial primary key,
  ai_rule_unit text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep at least one row present
do $$ begin
  if (select count(*) from public.ai_rule) = 0 then
    insert into public.ai_rule (ai_rule_unit) values ('');
  end if;
end $$;

-- Indexes
create index if not exists idx_ai_rule_updated_at on public.ai_rule(updated_at desc);

-- RLS (DEV liberal policies; tighten for prod)
alter table public.ai_rule enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='ai_rule' and policyname='read_ai_rule'
  ) then
    create policy read_ai_rule on public.ai_rule for select using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='ai_rule' and policyname='write_ai_rule'
  ) then
    create policy write_ai_rule on public.ai_rule for all using (true) with check (true);
  end if;
end $$;
