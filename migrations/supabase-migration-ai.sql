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

-- Widen long-text columns to TEXT (idempotent, no EXCEPTION clauses)
DO $$
DECLARE
  col text;
BEGIN
  -- topic table (only if exists)
  IF to_regclass('public.topic') IS NOT NULL THEN
    FOR col IN SELECT unnest(ARRAY[
      'topic_nama','topic_planner','topic_global_context','topic_key_concept',
      'topic_related_concept','topic_statement','topic_learner_profile',
      'topic_service_learning','topic_formative_assessment','topic_summative_assessment'
    ]) LOOP
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='topic' AND column_name=col
      ) THEN
        EXECUTE format('ALTER TABLE public.topic ALTER COLUMN %I TYPE text', col);
      END IF;
    END LOOP;
  END IF;

  -- ai_rule table (only if exists)
  IF to_regclass('public.ai_rule') IS NOT NULL THEN
    FOR col IN SELECT unnest(ARRAY[
      'ai_rule_unit','ai_rule_global_context','ai_rule_key_concept','ai_rule_related_concept',
      'ai_rule_statement','ai_rule_learner_profile','ai_rule_service_learning',
      'ai_rule_formative_assessment','ai_rule_summative_assessment'
    ]) LOOP
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='ai_rule' AND column_name=col
      ) THEN
        EXECUTE format('ALTER TABLE public.ai_rule ALTER COLUMN %I TYPE text', col);
      END IF;
    END LOOP;
  END IF;
END$$;
