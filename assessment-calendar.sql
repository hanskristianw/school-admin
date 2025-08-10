-- Assessment Calendar artifacts (matches current schema)
-- Tables referenced:
--   assessment(assessment_tanggal, assessment_detail_kelas_id)
--   detail_kelas(detail_kelas_id, detail_kelas_subject_id, detail_kelas_kelas_id)
--   kelas(kelas_id, kelas_nama)

begin;

create or replace view public.v_assessment_calendar as
select
  a.assessment_tanggal::date as day,
  k.kelas_id,
  k.kelas_nama,
  count(*)::int as assessment_count
from public.assessment a
join public.detail_kelas dk on dk.detail_kelas_id = a.assessment_detail_kelas_id
join public.kelas k on k.kelas_id = dk.detail_kelas_kelas_id
where a.assessment_status = 1
group by 1,2,3;

comment on view public.v_assessment_calendar is 'Daily assessment counts per class (uses detail_kelas_kelas_id)';

create or replace function public.f_assessment_calendar_range(
  p_from date,
  p_to date,
  p_kelas_id integer default null
)
returns table(day date, kelas_id integer, kelas_nama text, assessment_count int)
language sql
stable
as $$
  select day, kelas_id, kelas_nama, assessment_count
  from public.v_assessment_calendar
  where day between p_from and p_to
    and (p_kelas_id is null or kelas_id = p_kelas_id)
  order by day, kelas_nama;
$$;

comment on function public.f_assessment_calendar_range(date, date, integer)
  is 'Return assessment counts per day per class between dates; optional class filter.';

-- Basic grants (adjust to your RLS strategy). For anon/service roles as needed.
grant select on public.v_assessment_calendar to anon, authenticated, service_role;
grant execute on function public.f_assessment_calendar_range(date, date, integer) to anon, authenticated, service_role;

commit;
