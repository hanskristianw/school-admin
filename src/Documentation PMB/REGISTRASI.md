create table public.student_applications (
  application_id bigserial not null,
  application_number character varying(20) not null,
  student_name character varying(255) not null,
  student_nickname character varying(100) null,
  student_gender character varying(10) null,
  student_birth_date date null,
  student_birth_place character varying(100) null,
  student_address text null,
  student_previous_school character varying(255) null,
  parent_name character varying(255) not null,
  parent_phone character varying(20) not null,
  parent_email character varying(255) null,
  parent_occupation character varying(100) null,
  parent_address text null,
  unit_id integer not null,
  year_id integer not null,
  preferred_grade character varying(50) null,
  additional_notes text null,
  status character varying(20) null default 'pending'::character varying,
  admin_notes text null,
  reviewed_by integer null,
  reviewed_at timestamp without time zone null,
  created_at timestamp without time zone null default now(),
  updated_at timestamp without time zone null default now(),
  constraint student_applications_pkey primary key (application_id),
  constraint student_applications_application_number_key unique (application_number),
  constraint student_applications_unit_id_fkey foreign KEY (unit_id) references unit (unit_id),
  constraint student_applications_year_id_fkey foreign KEY (year_id) references year (year_id),
  constraint student_applications_reviewed_by_fkey foreign KEY (reviewed_by) references users (user_id),
  constraint student_applications_status_check check (
    (
      (status)::text = any (
        (
          array[
            'pending'::character varying,
            'under_review'::character varying,
            'approved'::character varying,
            'rejected'::character varying,
            'waitlist'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint student_applications_student_gender_check check (
    (
      (student_gender)::text = any (
        (
          array[
            'male'::character varying,
            'female'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_student_applications_status on public.student_applications using btree (status) TABLESPACE pg_default;

create index IF not exists idx_student_applications_unit on public.student_applications using btree (unit_id) TABLESPACE pg_default;

create index IF not exists idx_student_applications_year on public.student_applications using btree (year_id) TABLESPACE pg_default;

create index IF not exists idx_student_applications_number on public.student_applications using btree (application_number) TABLESPACE pg_default;

create index IF not exists idx_student_applications_parent_email on public.student_applications using btree (parent_email) TABLESPACE pg_default;

create index IF not exists idx_student_applications_parent_phone on public.student_applications using btree (parent_phone) TABLESPACE pg_default;

create trigger trigger_generate_application_number BEFORE INSERT on student_applications for EACH row when (
  new.application_number is null
  or new.application_number::text = ''::text
)
execute FUNCTION generate_application_number ();

create trigger trigger_update_student_applications_timestamp BEFORE
update on student_applications for EACH row
execute FUNCTION update_student_applications_timestamp ();

create table public.unit (
  unit_id serial not null,
  unit_name character varying(255) not null,
  created_at timestamp without time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp without time zone null default CURRENT_TIMESTAMP,
  is_school boolean null default true,
  constraint unit_pkey primary key (unit_id),
  constraint unit_unit_name_key unique (unit_name)
) TABLESPACE pg_default;

create table public.udp_definition (
  udp_def_id bigserial not null,
  unit_id bigint not null,
  year_id bigint not null,
  total_amount numeric(12, 2) not null,
  default_installments integer null,
  notes text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  is_active boolean not null default true,
  effective_from date null,
  effective_until date null,
  created_by integer null,
  updated_by integer null,
  constraint udp_definition_pkey primary key (udp_def_id),
  constraint uq_udp_def unique (unit_id, year_id),
  constraint udp_definition_unit_id_fkey foreign KEY (unit_id) references unit (unit_id) on delete CASCADE,
  constraint udp_definition_updated_by_fkey foreign KEY (updated_by) references users (user_id),
  constraint udp_definition_year_id_fkey foreign KEY (year_id) references year (year_id) on delete CASCADE,
  constraint udp_definition_created_by_fkey foreign KEY (created_by) references users (user_id),
  constraint udp_definition_total_amount_check check ((total_amount >= (0)::numeric)),
  constraint udp_definition_default_installments_check check (
    (
      (default_installments is null)
      or (default_installments >= 1)
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_udp_unit_year on public.udp_definition using btree (unit_id, year_id) TABLESPACE pg_default;

create index IF not exists idx_udp_active on public.udp_definition using btree (is_active) TABLESPACE pg_default
where
  (is_active = true);

create trigger trigger_udp_updated_at BEFORE
update on udp_definition for EACH row
execute FUNCTION update_updated_at_column ();

create table public.udp_installment_plan (
  plan_id bigserial not null,
  udp_def_id bigint not null,
  seq integer not null,
  month integer not null,
  amount numeric(12, 2) not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  due_date date null,
  constraint udp_installment_plan_pkey primary key (plan_id),
  constraint uq_udp_plan_month unique (udp_def_id, month),
  constraint uq_udp_plan_seq unique (udp_def_id, seq),
  constraint udp_installment_plan_udp_def_id_fkey foreign KEY (udp_def_id) references udp_definition (udp_def_id) on delete CASCADE,
  constraint udp_installment_plan_seq_check check ((seq >= 1)),
  constraint udp_installment_plan_month_check check (
    (
      (month >= 1)
      and (month <= 12)
    )
  ),
  constraint udp_installment_plan_amount_check check ((amount >= (0)::numeric))
) TABLESPACE pg_default;

create index IF not exists idx_udp_plan_def on public.udp_installment_plan using btree (udp_def_id) TABLESPACE pg_default;

create trigger trigger_udp_plan_updated_at BEFORE
update on udp_installment_plan for EACH row
execute FUNCTION update_updated_at_column ();