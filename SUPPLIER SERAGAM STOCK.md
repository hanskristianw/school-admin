create table public.uniform (
  uniform_id bigserial not null,
  unit_id integer null,
  uniform_code text null,
  uniform_name text not null,
  gender text null,
  notes text null,
  image_url text null,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  is_universal boolean not null default false,
  constraint uniform_pkey primary key (uniform_id),
  constraint uniform_unit_id_fkey foreign KEY (unit_id) references unit (unit_id) on delete CASCADE,
  constraint uniform_gender_check check (
    (
      gender = any (array['boy'::text, 'girl'::text, 'unisex'::text])
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_uniform_unit on public.uniform using btree (unit_id) TABLESPACE pg_default;

create unique INDEX IF not exists uq_uniform_code_per_unit on public.uniform using btree (unit_id, lower(uniform_code)) TABLESPACE pg_default;

create unique INDEX IF not exists uq_uniform_name_per_unit on public.uniform using btree (unit_id, lower(uniform_name)) TABLESPACE pg_default;

create index IF not exists idx_uniform_is_universal on public.uniform using btree (is_universal) TABLESPACE pg_default
where
  (is_universal = true);


create table public.uniform_purchase (
  purchase_id bigserial not null,
  unit_id integer not null,
  supplier_id bigint not null,
  purchase_date date not null default CURRENT_DATE,
  invoice_no text null,
  notes text null,
  status text not null default 'posted'::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  is_voided boolean not null default false,
  voided_at timestamp with time zone null,
  voided_by text null,
  void_reason text null,
  constraint uniform_purchase_pkey primary key (purchase_id),
  constraint uniform_purchase_supplier_id_fkey foreign KEY (supplier_id) references uniform_supplier (supplier_id) on delete RESTRICT,
  constraint uniform_purchase_unit_id_fkey foreign KEY (unit_id) references unit (unit_id) on delete RESTRICT,
  constraint uniform_purchase_status_check check (
    (
      status = any (
        array['draft'::text, 'posted'::text, 'cancelled'::text]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_uniform_purchase_unit on public.uniform_purchase using btree (unit_id) TABLESPACE pg_default;

create index IF not exists idx_uniform_purchase_supplier on public.uniform_purchase using btree (supplier_id) TABLESPACE pg_default;

create index IF not exists idx_uniform_purchase_is_voided on public.uniform_purchase using btree (is_voided) TABLESPACE pg_default;

create table public.uniform_purchase_item (
  item_id bigserial not null,
  purchase_id bigint not null,
  uniform_id bigint not null,
  size_id bigint not null,
  qty integer not null,
  unit_cost numeric(12, 2) not null default 0,
  created_at timestamp with time zone not null default now(),
  unit_id integer not null,
  constraint uniform_purchase_item_pkey primary key (item_id),
  constraint uniform_purchase_item_purchase_id_fkey foreign KEY (purchase_id) references uniform_purchase (purchase_id) on delete CASCADE,
  constraint uniform_purchase_item_size_id_fkey foreign KEY (size_id) references uniform_size (size_id) on delete RESTRICT,
  constraint uniform_purchase_item_uniform_id_fkey foreign KEY (uniform_id) references uniform (uniform_id) on delete RESTRICT,
  constraint uniform_purchase_item_unit_fk foreign KEY (unit_id) references unit (unit_id),
  constraint uniform_purchase_item_qty_check check ((qty > 0))
) TABLESPACE pg_default;

create index IF not exists idx_uniform_purchase_item_p on public.uniform_purchase_item using btree (purchase_id) TABLESPACE pg_default;

create table public.uniform_purchase_receipt (
  receipt_id bigserial not null,
  purchase_id bigint not null,
  receipt_date date not null default CURRENT_DATE,
  notes text null,
  created_at timestamp with time zone not null default now(),
  constraint uniform_purchase_receipt_pkey primary key (receipt_id),
  constraint uniform_purchase_receipt_purchase_id_fkey foreign KEY (purchase_id) references uniform_purchase (purchase_id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_uniform_purchase_receipt_p on public.uniform_purchase_receipt using btree (purchase_id) TABLESPACE pg_default;

create table public.uniform_purchase_receipt_item (
  receipt_item_id bigserial not null,
  receipt_id bigint not null,
  purchase_item_id bigint not null,
  qty_received integer not null,
  unit_cost numeric(12, 2) not null,
  created_at timestamp with time zone not null default now(),
  constraint uniform_purchase_receipt_item_pkey primary key (receipt_item_id),
  constraint uniform_purchase_receipt_item_purchase_item_id_fkey foreign KEY (purchase_item_id) references uniform_purchase_item (item_id) on delete RESTRICT,
  constraint uniform_purchase_receipt_item_receipt_id_fkey foreign KEY (receipt_id) references uniform_purchase_receipt (receipt_id) on delete CASCADE,
  constraint uniform_purchase_receipt_item_qty_received_check check ((qty_received > 0))
) TABLESPACE pg_default;

create index IF not exists idx_uniform_purchase_receipt_item_r on public.uniform_purchase_receipt_item using btree (receipt_id) TABLESPACE pg_default;

create index IF not exists idx_uniform_purchase_receipt_item_pi on public.uniform_purchase_receipt_item using btree (purchase_item_id) TABLESPACE pg_default;

create table public.uniform_sale (
  sale_id bigserial not null,
  user_id integer not null,
  unit_id integer not null,
  sale_date timestamp with time zone not null default now(),
  status text not null default 'pending'::text,
  payment_method text not null default 'transfer'::text,
  receipt_url text null,
  notes text null,
  total_amount numeric(12, 2) not null default 0,
  total_cost numeric(12, 2) not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  is_voided boolean not null default false,
  voided_at timestamp with time zone null,
  voided_by text null,
  void_reason text null,
  constraint uniform_sale_pkey primary key (sale_id),
  constraint uniform_sale_user_id_fkey foreign KEY (user_id) references users (user_id) on delete RESTRICT,
  constraint uniform_sale_unit_id_fkey foreign KEY (unit_id) references unit (unit_id) on delete RESTRICT,
  constraint uniform_sale_payment_method_check check ((payment_method = 'transfer'::text)),
  constraint uniform_sale_status_check check (
    (
      status = any (
        array['pending'::text, 'paid'::text, 'cancelled'::text]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_uniform_sale_user on public.uniform_sale using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_uniform_sale_unit on public.uniform_sale using btree (unit_id) TABLESPACE pg_default;

create index IF not exists idx_uniform_sale_is_voided on public.uniform_sale using btree (is_voided) TABLESPACE pg_default;

create table public.uniform_sale_item (
  item_id bigserial not null,
  sale_id bigint not null,
  uniform_id bigint not null,
  size_id bigint not null,
  qty integer not null,
  unit_price numeric(12, 2) not null,
  unit_hpp numeric(12, 2) not null,
  subtotal numeric(12, 2) not null,
  created_at timestamp with time zone not null default now(),
  constraint uniform_sale_item_pkey primary key (item_id),
  constraint uniform_sale_item_sale_id_fkey foreign KEY (sale_id) references uniform_sale (sale_id) on delete CASCADE,
  constraint uniform_sale_item_size_id_fkey foreign KEY (size_id) references uniform_size (size_id) on delete RESTRICT,
  constraint uniform_sale_item_uniform_id_fkey foreign KEY (uniform_id) references uniform (uniform_id) on delete RESTRICT,
  constraint uniform_sale_item_qty_check check ((qty > 0))
) TABLESPACE pg_default;

create index IF not exists idx_uniform_sale_item_sale on public.uniform_sale_item using btree (sale_id) TABLESPACE pg_default;

create table public.uniform_size (
  size_id bigserial not null,
  size_name text not null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint uniform_size_pkey primary key (size_id),
  constraint uniform_size_size_name_unique unique (size_name)
) TABLESPACE pg_default;

create table public.uniform_stock_txn (
  txn_id bigserial not null,
  uniform_id bigint not null,
  size_id bigint not null,
  qty_delta integer not null,
  txn_type text not null,
  ref_table text null,
  ref_id bigint null,
  notes text null,
  created_at timestamp with time zone not null default now(),
  supplier_id integer null,
  constraint uniform_stock_txn_pkey primary key (txn_id),
  constraint uniform_stock_txn_size_id_fkey foreign KEY (size_id) references uniform_size (size_id) on delete CASCADE,
  constraint uniform_stock_txn_supplier_id_fkey foreign KEY (supplier_id) references uniform_supplier (supplier_id) on delete set null,
  constraint uniform_stock_txn_uniform_id_fkey foreign KEY (uniform_id) references uniform (uniform_id) on delete CASCADE,
  constraint uniform_stock_txn_txn_type_check check (
    (
      txn_type = any (
        array[
          'init'::text,
          'adjust'::text,
          'purchase'::text,
          'sale'::text,
          'return_in'::text,
          'return_out'::text,
          'void'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_uniform_stock_txn_us on public.uniform_stock_txn using btree (uniform_id, size_id) TABLESPACE pg_default;

create index IF not exists idx_uniform_stock_txn_supplier_id on public.uniform_stock_txn using btree (supplier_id) TABLESPACE pg_default;

create table public.uniform_supplier (
  supplier_id bigserial not null,
  supplier_code text null,
  supplier_name text not null,
  contact_person text null,
  phone text null,
  email text null,
  address text null,
  notes text null,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint uniform_supplier_pkey primary key (supplier_id)
) TABLESPACE pg_default;

create index IF not exists idx_uniform_supplier_active on public.uniform_supplier using btree (is_active) TABLESPACE pg_default;

create table public.uniform_variant (
  variant_id bigserial not null,
  uniform_id bigint not null,
  size_id bigint not null,
  hpp numeric(12, 2) not null default 0,
  price numeric(12, 2) not null default 0,
  sku text null,
  barcode text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint uniform_variant_pkey primary key (variant_id),
  constraint uq_uniform_variant unique (uniform_id, size_id),
  constraint uniform_variant_size_id_fkey foreign KEY (size_id) references uniform_size (size_id) on delete CASCADE,
  constraint uniform_variant_uniform_id_fkey foreign KEY (uniform_id) references uniform (uniform_id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_uniform_variant_uniform on public.uniform_variant using btree (uniform_id) TABLESPACE pg_default;

create index IF not exists idx_uniform_variant_size on public.uniform_variant using btree (size_id) TABLESPACE pg_default;