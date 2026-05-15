create extension if not exists pgcrypto;

create table if not exists admins (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password text not null,
  created_at timestamptz not null default now()
);

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  dd_number text not null unique,
  student_name text,
  password text not null,
  email text,
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  rejection_note text,
  receipt_url text,
  receipt_date timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  force_password_change boolean not null default true,
  last_login_requested_at timestamptz,
  receipt_validation_status text check (receipt_validation_status in ('VALID', 'INVALID', 'UNREADABLE')),
  receipt_validation_message text,
  receipt_ocr_debug_text text
);

alter table students add column if not exists student_name text;
alter table students add column if not exists receipt_ocr_debug_text text;

create table if not exists student_forms (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references students(id) on delete cascade,
  full_name text not null,
  dob timestamptz not null,
  gender text not null,
  address text not null,
  phone text not null,
  email text not null,
  course text not null,
  branch text not null,
  semester integer not null,
  year_of_admission integer not null,
  cgpa double precision not null,
  parent_name text not null,
  parent_relation text not null,
  parent_phone text not null,
  emergency_contact text not null,
  emergency_phone text not null,
  form_data jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now()
);

alter table student_forms add column if not exists form_data jsonb not null default '{}'::jsonb;

create table if not exists registration_form_configs (
  id uuid primary key default gen_random_uuid(),
  fields jsonb not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists semester_configs (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  start_date timestamptz not null,
  end_date timestamptz not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references admins(id) on delete cascade,
  action text not null,
  target_id text not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists students_status_idx on students(status);
create index if not exists students_last_login_requested_at_idx on students(last_login_requested_at desc);
create index if not exists student_forms_student_id_idx on student_forms(student_id);
create index if not exists registration_form_configs_is_active_idx on registration_form_configs(is_active);
create index if not exists semester_configs_is_active_idx on semester_configs(is_active);
