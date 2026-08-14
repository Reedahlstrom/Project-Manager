-- Minimal stand-in for the parts of Supabase the migration depends on, so the
-- schema and its policies can be exercised on a plain Postgres.
create schema if not exists auth;

create table if not exists auth.users (
  id    uuid primary key,
  email text unique
);

-- Supabase reads the subject claim out of the request JWT. Here it is just a
-- session GUC the test harness sets.
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('cadence.test_uid', true), '')::uuid
$$;

do $$
begin
  if not exists (select from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select from pg_roles where rolname = 'service_role') then create role service_role; end if;
end
$$;

-- Minimal storage schema. Supabase provides these; the local harness needs
-- just enough shape for the documents migration to apply and its policies to
-- be exercised.
create schema if not exists storage;

create table if not exists storage.buckets (
  id              text primary key,
  name            text not null,
  public          boolean not null default false,
  file_size_limit bigint,
  created_at      timestamptz not null default now()
);

create table if not exists storage.objects (
  id         uuid primary key default gen_random_uuid(),
  bucket_id  text references storage.buckets (id),
  name       text not null,
  owner      uuid,
  created_at timestamptz not null default now()
);

alter table storage.objects enable row level security;
alter table storage.objects force row level security;

grant usage on schema storage to anon, authenticated, service_role;
grant all on storage.objects to authenticated, service_role;
grant all on storage.buckets to authenticated, service_role;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to anon, authenticated, service_role;
