assessment
create table public.assessment (
  assessment_id serial not null,
  assessment_nama character varying(100) not null,
  assessment_tanggal date null,
  assessment_keterangan text null,
  assessment_status integer not null,
  assessment_user_id integer not null,
  assessment_detail_kelas_id integer null,
  assessment_topic_id integer not null,
  assessment_semester smallint null,
  assessment_conceptual_understanding text null,
  assessment_task_specific_description text null,
  assessment_instructions text null,
  assessment_tsc jsonb null default '{}'::jsonb,
  constraint assessment_pkey primary key (assessment_id),
  constraint assessment_assessment_topic_id_fkey foreign KEY (assessment_topic_id) references topic (topic_id) on delete RESTRICT
) TABLESPACE pg_default;

assessment_criteria
create table public.assessment_criteria (
  id serial not null,
  assessment_id integer not null,
  criterion_id integer not null,
  created_at timestamp without time zone null default now(),
  constraint assessment_criteria_pkey primary key (id),
  constraint assessment_criteria_assessment_id_criterion_id_key unique (assessment_id, criterion_id),
  constraint assessment_criteria_assessment_id_fkey foreign KEY (assessment_id) references assessment (assessment_id) on delete CASCADE,
  constraint assessment_criteria_criterion_id_fkey foreign KEY (criterion_id) references criteria (criterion_id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_assessment_criteria_assessment on public.assessment_criteria using btree (assessment_id) TABLESPACE pg_default;

create index IF not exists idx_assessment_criteria_criterion on public.assessment_criteria using btree (criterion_id) TABLESPACE pg_default;

assessment_grades
create table public.assessment_grades (
  grade_id bigserial not null,
  assessment_id integer not null,
  detail_siswa_id integer not null,
  criterion_a_grade smallint null,
  criterion_b_grade smallint null,
  criterion_c_grade smallint null,
  criterion_d_grade smallint null,
  final_grade smallint null,
  comments text null,
  created_by_user_id integer null,
  updated_by_user_id integer null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint assessment_grades_pkey primary key (grade_id),
  constraint uq_assessment_student unique (assessment_id, detail_siswa_id),
  constraint assessment_grades_assessment_id_fkey foreign KEY (assessment_id) references assessment (assessment_id) on delete CASCADE,
  constraint assessment_grades_created_by_user_id_fkey foreign KEY (created_by_user_id) references users (user_id) on delete set null,
  constraint assessment_grades_detail_siswa_id_fkey foreign KEY (detail_siswa_id) references detail_siswa (detail_siswa_id) on delete CASCADE,
  constraint assessment_grades_updated_by_user_id_fkey foreign KEY (updated_by_user_id) references users (user_id) on delete set null,
  constraint assessment_grades_criterion_a_grade_check check (
    (
      (criterion_a_grade >= 0)
      and (criterion_a_grade <= 8)
    )
  ),
  constraint assessment_grades_final_grade_check check (
    (
      (final_grade >= 1)
      and (final_grade <= 7)
    )
  ),
  constraint assessment_grades_criterion_b_grade_check check (
    (
      (criterion_b_grade >= 0)
      and (criterion_b_grade <= 8)
    )
  ),
  constraint assessment_grades_criterion_c_grade_check check (
    (
      (criterion_c_grade >= 0)
      and (criterion_c_grade <= 8)
    )
  ),
  constraint assessment_grades_criterion_d_grade_check check (
    (
      (criterion_d_grade >= 0)
      and (criterion_d_grade <= 8)
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_assessment_grades_assessment on public.assessment_grades using btree (assessment_id) TABLESPACE pg_default;

create index IF not exists idx_assessment_grades_student on public.assessment_grades using btree (detail_siswa_id) TABLESPACE pg_default;

topic
create table public.topic (
  topic_id serial not null,
  topic_nama text not null,
  topic_subject_id integer not null,
  topic_kelas_id integer not null,
  topic_planner text null,
  topic_global_context text null,
  topic_key_concept text null,
  topic_related_concept text null,
  topic_statement text null,
  topic_learner_profile text null,
  topic_service_learning text null,
  topic_formative_assessment text null,
  topic_summative_assessment text null,
  topic_inquiry_question text null,
  topic_urutan smallint null default '0'::smallint,
  topic_duration smallint null default '0'::smallint,
  topic_hours_per_week smallint null default '0'::smallint,
  topic_learning_process text null,
  topic_relationship_summative_assessment_statement_of_inquiry text null,
  topic_year smallint null,
  topic_resources text null,
  topic_atl text null,
  topic_reflection_prior text null,
  topic_reflection_after text null,
  constraint topic_pkey primary key (topic_id),
  constraint fk_topic_subject foreign KEY (topic_subject_id) references subject (subject_id) on delete RESTRICT,
  constraint topic_topic_kelas_id_fkey foreign KEY (topic_kelas_id) references kelas (kelas_id) on delete RESTRICT
) TABLESPACE pg_default;

create trigger trigger_generate_topic_weeks
after INSERT
or
update OF topic_duration on topic for EACH row
execute FUNCTION generate_topic_weeks ();