# Dokumentasi Schema PMB (Penerimaan Murid Baru)

## Daftar Tabel
1. `unit` – Unit akademik (PYP, MYP, DP)
2. `admission_level` – Jenjang pendaftaran per unit (Nursery 1, K1, Elementary, JHS, SHS)
3. `student_applications` – Data pendaftaran siswa baru
4. `udp_definition` – Definisi biaya UDP (Uang Dana Pembangunan) per jenjang per tahun
5. `udp_installment_plan` – Rencana cicilan UDP
6. `school_fee_definition` – Definisi biaya SPP (USEK) per jenjang per tahun
7. `fee_discount` – Master diskon (bisa per unit atau per jenjang)
8. `application_discount` – Diskon yang diterapkan per pendaftar

---

## Relasi Utama

```
unit (PYP, MYP, DP)
  └── admission_level (Nursery 1, Nursery 2, K1, K2, Elementary 1-6, JHS, SHS)
        ├── udp_definition (DPP per jenjang per tahun)
        ├── school_fee_definition (SPP per jenjang per tahun)
        └── student_applications (pendaftaran siswa → jenjang tertentu)
              └── application_discount (diskon per pendaftar)
```

---

## DDL

### unit

```sql
create table public.unit (
  unit_id serial not null,
  unit_name character varying(255) not null,
  created_at timestamp without time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp without time zone null default CURRENT_TIMESTAMP,
  is_school boolean null default true,
  constraint unit_pkey primary key (unit_id),
  constraint unit_unit_name_key unique (unit_name)
) TABLESPACE pg_default;
```

### admission_level

Tabel baru untuk membagi unit akademik menjadi jenjang pendaftaran yang lebih spesifik.
Setiap jenjang memiliki definisi biaya sendiri (UDP/SPP).

Contoh data:
| level_id | unit_id | level_name    | level_order |
|----------|---------|---------------|-------------|
| 1        | PYP     | Nursery 1     | 1           |
| 2        | PYP     | Nursery 2     | 2           |
| 3        | PYP     | Kindergarten 1| 3           |
| 4        | PYP     | Kindergarten 2| 4           |
| 5        | PYP     | Elementary 1-6| 5           |
| 6        | MYP     | JHS           | 6           |
| 7        | DP      | SHS           | 7           |

```sql
create table public.admission_level (
  level_id serial not null,
  unit_id integer not null,
  level_name character varying(100) not null,
  level_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint admission_level_pkey primary key (level_id),
  constraint admission_level_unit_fkey foreign key (unit_id) references unit (unit_id) on delete cascade,
  constraint uq_admission_level unique (unit_id, level_name)
) tablespace pg_default;

create index if not exists idx_admission_level_unit on public.admission_level using btree (unit_id) tablespace pg_default;
create index if not exists idx_admission_level_active on public.admission_level using btree (is_active) tablespace pg_default where is_active = true;

-- RLS
alter table public.admission_level enable row level security;
create policy "dev_all_admission_level" on public.admission_level for all using (true) with check (true);

-- Trigger updated_at
create trigger trigger_admission_level_updated
  before update on public.admission_level
  for each row execute function update_admission_level_timestamp();
```

### student_applications

Kolom penting yang berubah:
- `level_id` (baru): FK ke `admission_level` → menggantikan free-text `preferred_grade`
- `unit_id`: tetap ada, di-derive dari `admission_level.unit_id` saat insert

```sql
create table public.student_applications (
  application_id bigserial not null,
  application_number character varying(20) not null,
  student_name character varying(255) not null,
  student_nickname character varying(100) null,
  student_gender character varying(10) null,
  student_birth_date date null,
  student_birth_place character varying(100) null,
  student_religion character varying(30) null,
  student_nationality character varying(10) null default 'WNI'::character varying,
  student_address text null,
  student_domicile_address text null,
  student_city character varying(100) null,
  student_province character varying(100) null,
  student_postal_code character varying(10) null,
  student_previous_school character varying(255) null,
  parent_nik character varying(20) null,
  parent_name character varying(255) not null,
  parent_phone character varying(20) not null,
  parent_email character varying(255) null,
  parent_occupation character varying(100) null,
  parent_address text null,
  unit_id integer null,
  level_id integer null,
  year_id integer not null,
  additional_notes text null,
  status character varying(20) null default 'pending'::character varying,
  admin_notes text null,
  reviewed_by integer null,
  reviewed_at timestamp without time zone null,
  created_at timestamp without time zone null default now(),
  updated_at timestamp without time zone null default now(),
  constraint student_applications_pkey primary key (application_id),
  constraint student_applications_application_number_key unique (application_number),
  constraint student_applications_unit_id_fkey foreign key (unit_id) references unit (unit_id),
  constraint student_applications_level_id_fkey foreign key (level_id) references admission_level (level_id),
  constraint student_applications_year_id_fkey foreign key (year_id) references year (year_id),
  constraint student_applications_reviewed_by_fkey foreign key (reviewed_by) references users (user_id),
  constraint student_applications_status_check check (
    (status)::text = any (array[
      'pending', 'under_review', 'approved', 'rejected', 'waitlist'
    ]::text[])
  ),
  constraint student_applications_student_gender_check check (
    (student_gender)::text = any (array['male', 'female']::text[])
  ),
  constraint student_applications_student_religion_check check (
    (student_religion)::text = any (array[
      'Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Konghucu', 'Lainnya'
    ]::text[])
  ),
  constraint student_applications_student_nationality_check check (
    (student_nationality)::text = any (array['WNI', 'WNA']::text[])
  )
) tablespace pg_default;

create index if not exists idx_student_applications_status on public.student_applications using btree (status) tablespace pg_default;
create index if not exists idx_student_applications_unit on public.student_applications using btree (unit_id) tablespace pg_default;
create index if not exists idx_student_applications_level on public.student_applications using btree (level_id) tablespace pg_default;
create index if not exists idx_student_applications_year on public.student_applications using btree (year_id) tablespace pg_default;
create index if not exists idx_student_applications_number on public.student_applications using btree (application_number) tablespace pg_default;
create index if not exists idx_student_applications_parent_email on public.student_applications using btree (parent_email) tablespace pg_default;
create index if not exists idx_student_applications_parent_phone on public.student_applications using btree (parent_phone) tablespace pg_default;

create trigger trigger_generate_application_number before insert on student_applications
  for each row when (new.application_number is null or new.application_number::text = ''::text)
  execute function generate_application_number();

create trigger trigger_update_student_applications_timestamp before update on student_applications
  for each row execute function update_student_applications_timestamp();
```

### udp_definition

DPP (Uang Dana Pembangunan) bervariasi berdasarkan:
- **Jenjang** (`level_id`) — tiap jenjang harga berbeda
- **Periode pendaftaran** (`effective_from`/`effective_until`) — early bird vs reguler vs late
- **Kategori siswa** (`student_category`) — eksternal (baru) vs internal (pindah jenjang)
- **Tahun ajaran** (`year_id`)

Unique constraint: `(level_id, year_id, student_category, effective_from)` —
memungkinkan beberapa entry DPP per jenjang per tahun dengan periode dan kategori berbeda.

```sql
create table public.udp_definition (
  udp_def_id bigserial not null,
  unit_id bigint null,
  level_id integer null,
  year_id bigint not null,
  total_amount numeric(12, 2) not null,
  student_category varchar(20) not null default 'eksternal',
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
  constraint uq_udp_def_level unique (level_id, year_id, student_category, effective_from),
  constraint udp_definition_unit_id_fkey foreign key (unit_id) references unit (unit_id) on delete cascade,
  constraint udp_definition_level_id_fkey foreign key (level_id) references admission_level (level_id),
  constraint udp_definition_year_id_fkey foreign key (year_id) references year (year_id) on delete cascade,
  constraint udp_definition_created_by_fkey foreign key (created_by) references users (user_id),
  constraint udp_definition_updated_by_fkey foreign key (updated_by) references users (user_id),
  constraint udp_definition_total_amount_check check (total_amount >= 0),
  constraint udp_definition_student_category_check check (student_category in ('eksternal', 'internal')),
  constraint udp_definition_default_installments_check check (
    default_installments is null or default_installments >= 1
  )
) tablespace pg_default;

create index if not exists idx_udp_level_year on public.udp_definition using btree (level_id, year_id) tablespace pg_default;
create index if not exists idx_udp_active on public.udp_definition using btree (is_active) tablespace pg_default where is_active = true;

create trigger trigger_udp_updated_at before update on udp_definition
  for each row execute function update_updated_at_column();
```

Contoh data DPP Nursery 1 tahun 2025-2026:
| student_category | effective_from | effective_until | total_amount |
|------------------|---------------|-----------------|-------------|
| eksternal | 2025-06-01 | 2025-12-15 | 21.000.000 |
| eksternal | 2026-01-01 | 2026-03-31 | 22.500.000 |
| eksternal | 2026-04-01 | 2026-07-31 | 24.000.000 |

### udp_installment_plan

Tidak berubah.

```sql
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
  constraint udp_installment_plan_udp_def_id_fkey foreign key (udp_def_id) references udp_definition (udp_def_id) on delete cascade,
  constraint udp_installment_plan_seq_check check (seq >= 1),
  constraint udp_installment_plan_month_check check (month >= 1 and month <= 12),
  constraint udp_installment_plan_amount_check check (amount >= 0)
) tablespace pg_default;

create index if not exists idx_udp_plan_def on public.udp_installment_plan using btree (udp_def_id) tablespace pg_default;

create trigger trigger_udp_plan_updated_at before update on udp_installment_plan
  for each row execute function update_updated_at_column();
```

### school_fee_definition

Perubahan: unique constraint sekarang `(level_id, year_id)` bukan `(unit_id, year_id)`.

```sql
create table public.school_fee_definition (
  fee_def_id bigserial not null,
  unit_id bigint null,
  level_id integer null,
  year_id bigint not null,
  monthly_amount numeric(12, 2) not null,
  notes text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  is_active boolean not null default true,
  created_by integer null,
  updated_by integer null,
  constraint school_fee_definition_pkey primary key (fee_def_id),
  constraint uq_school_fee_def_level unique (level_id, year_id),
  constraint school_fee_definition_unit_id_fkey foreign key (unit_id) references unit (unit_id) on delete cascade,
  constraint school_fee_definition_level_id_fkey foreign key (level_id) references admission_level (level_id),
  constraint school_fee_definition_year_id_fkey foreign key (year_id) references year (year_id) on delete cascade,
  constraint school_fee_definition_created_by_fkey foreign key (created_by) references users (user_id),
  constraint school_fee_definition_updated_by_fkey foreign key (updated_by) references users (user_id),
  constraint school_fee_definition_monthly_amount_check check (monthly_amount >= 0)
) tablespace pg_default;

create index if not exists idx_school_fee_level_year on public.school_fee_definition using btree (level_id, year_id) tablespace pg_default;
```

### fee_discount

Master diskon/potongan untuk DPP dan SPP.
- `unit_id` (wajib): scope tingkat unit
- `level_id` (opsional): jika diisi, diskon spesifik per jenjang; jika NULL, berlaku semua jenjang dalam unit
- `applies_to`: `'udp'` (DPP), `'usek'` (SPP), atau `'both'`

Saat menampilkan daftar diskon untuk suatu pendaftar, filter:
`unit_id = app.unit_id AND year_id = app.year_id AND (level_id IS NULL OR level_id = app.level_id)`

```sql
create table public.fee_discount (
  discount_id bigserial not null,
  unit_id integer not null,
  level_id integer null,
  year_id integer not null,
  discount_code character varying(50) not null,
  discount_name character varying(255) not null,
  discount_description text null,
  discount_type character varying(20) not null,
  discount_value numeric(12,2) not null,
  applies_to character varying(20) not null,
  valid_from date null,
  valid_until date null,
  is_active boolean not null default true,
  max_usage integer null,
  current_usage integer not null default 0,
  conditions jsonb null,
  created_at timestamp with time zone not null default now(),
  created_by integer null,
  updated_at timestamp with time zone not null default now(),
  updated_by integer null,
  constraint fee_discount_pkey primary key (discount_id),
  constraint uq_discount_code unique (unit_id, year_id, discount_code),
  constraint fee_discount_unit_fkey foreign key (unit_id) references unit (unit_id) on delete cascade,
  constraint fee_discount_level_fkey foreign key (level_id) references admission_level (level_id),
  constraint fee_discount_year_fkey foreign key (year_id) references year (year_id) on delete cascade,
  constraint fee_discount_type_check check (discount_type in ('percentage', 'fixed')),
  constraint fee_discount_value_check check (discount_value >= 0),
  constraint fee_discount_applies_check check (applies_to in ('udp', 'usek', 'both')),
  constraint fee_discount_max_usage_check check (max_usage is null or max_usage > 0),
  constraint fee_discount_current_usage_check check (current_usage >= 0)
) tablespace pg_default;

create index if not exists idx_discount_unit_year on public.fee_discount(unit_id, year_id);
create index if not exists idx_discount_level on public.fee_discount(level_id) where level_id is not null;
create index if not exists idx_discount_active on public.fee_discount(is_active) where is_active = true;
```

### application_discount

Tidak berubah. Menyimpan diskon yang sudah diterapkan per pendaftar.

```sql
create table public.application_discount (
  app_discount_id bigserial not null,
  application_id bigint not null,
  discount_id bigint not null,
  fee_target character varying(10) not null,
  seq integer not null,
  value_type character varying(20) not null,
  value numeric(12,2) not null,
  base_before numeric(12,2) not null default 0,
  calculated_amount numeric(12,2) not null default 0,
  subtotal_after numeric(12,2) not null default 0,
  notes text null,
  created_by integer null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint application_discount_pkey primary key (app_discount_id),
  constraint application_discount_application_id_fkey foreign key (application_id) references student_applications (application_id) on delete cascade,
  constraint application_discount_discount_id_fkey foreign key (discount_id) references fee_discount (discount_id),
  constraint application_discount_created_by_fkey foreign key (created_by) references users (user_id),
  constraint uq_app_discount_item unique (application_id, fee_target, discount_id),
  constraint uq_app_discount_seq unique (application_id, fee_target, seq),
  constraint application_discount_fee_target_check check (fee_target in ('udp', 'usek')),
  constraint application_discount_value_type_check check (value_type in ('percentage', 'fixed')),
  constraint application_discount_value_check check (value >= 0),
  constraint application_discount_seq_check check (seq >= 1)
) tablespace pg_default;

create index if not exists idx_app_discount_application on public.application_discount using btree (application_id) tablespace pg_default;
create index if not exists idx_app_discount_discount on public.application_discount using btree (discount_id) tablespace pg_default;
```

Kolom penting:
- `fee_target`: `'udp'` atau `'usek'` (diskon master `'both'` dipecah jadi 2 baris)
- `seq`: urutan penerapan diskon (1=pertama, mempengaruhi kalkulasi)
- `value_type` + `value`: copy dari master, bisa di-override per pendaftar
- `base_before`: subtotal sebelum diskon ini
- `calculated_amount`: nominal potongan aktual
- `subtotal_after`: subtotal setelah diskon ini

Contoh stacking UDP = 15.000.000:
```
seq=1: Diskon Pameran (fixed 1.000.000) → 15jt - 1jt = 14jt
seq=2: Diskon Sibling (5%)            → 14jt × 5% = 700rb → 13.300.000
```

---

## Migration SQL

Untuk menerapkan perubahan schema ini pada database yang sudah ada, jalankan migration:
`migrations/create-admission-level.sql`

Migration tersebut akan:
1. Membuat tabel `admission_level`
2. Menambah kolom `level_id` ke `student_applications`
3. Menambah kolom `level_id` ke `udp_definition` + ubah unique constraint
4. Menambah kolom `level_id` ke `school_fee_definition` + ubah unique constraint
5. Menambah kolom `level_id` ke `fee_discount`

---

## Halaman Terkait

| Halaman | Path | Fungsi |
|---------|------|--------|
| Form Pendaftaran (public) | `/admission` | Orangtua mendaftar, pilih jenjang |
| Data Pendaftaran (admin) | `/data/admission` | Admin review, diskon, cicilan, PDF, email |
| Definisi Biaya Sekolah | `/data/school-fee` | Admin kelola DPP & SPP per jenjang per tahun |
