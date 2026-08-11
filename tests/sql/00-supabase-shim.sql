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

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to anon, authenticated, service_role;
