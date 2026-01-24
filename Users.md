create table public.users (
  user_id serial not null,
  user_nama_depan character varying(100) not null,
  user_nama_belakang character varying(100) not null,
  user_username character varying(50) not null,
  user_role_id integer not null,
  user_unit_id integer null,
  is_active boolean null default true,
  user_profile_picture text null,
  user_profile_picture text null,
  user_email character varying(100) null,
  user_phone character varying(20) null,
  user_bio text null,
  user_birth_date date null,
  user_address text null,
  user_created_at timestamp without time zone null default CURRENT_TIMESTAMP,
  user_updated_at timestamp without time zone null default CURRENT_TIMESTAMP,
  user_password_hash character varying null,
  constraint users_pkey primary key (user_id),
  constraint users_user_email_key unique (user_email),
  constraint users_user_username_key unique (user_username),
  constraint users_user_role_id_fkey foreign KEY (user_role_id) references role (role_id)
) TABLESPACE pg_default;

create index IF not exists idx_users_username on public.users using btree (user_username) TABLESPACE pg_default;

create index IF not exists idx_users_role on public.users using btree (user_role_id) TABLESPACE pg_default;

create index IF not exists idx_users_email on public.users using btree (user_email) TABLESPACE pg_default;

create index IF not exists idx_users_profile_picture on public.users using btree (user_profile_picture) TABLESPACE pg_default;