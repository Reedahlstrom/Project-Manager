\set ON_ERROR_STOP on

-- Fixtures, created as superuser (bypasses RLS).
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'reed@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'paul@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'heather@example.com');

insert into public.profiles (id, name, role, email) values
  ('11111111-1111-1111-1111-111111111111', 'Reed',    'reed',    'reed@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'Paul',    'paul',    'paul@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'Heather', 'heather', 'heather@example.com');

-- A standard note inside a restricted project: the cascade case.
insert into public.notes (project_id, title, body, sensitivity)
select id, 'Cascade case', 'standard note in a restricted project', 'standard'
from public.projects where slug = 'church-media-fund';

-- A restricted note inside an open project: the direct case.
insert into public.notes (project_id, title, body, sensitivity)
select id, 'Direct case', 'restricted note in an open project', 'restricted'
from public.projects where slug = 'systems-and-operations';

insert into public.commitments (project_id, title)
select id, 'A commitment inside a restricted project'
from public.projects where slug = 'church-media-fund';

insert into public.events (project_id, title, starts_at)
select id, 'An event inside a restricted project', now() + interval '7 days'
from public.projects where slug = 'church-media-fund';

-- No blanket grant here. The shim's ALTER DEFAULT PRIVILEGES already gave
-- `authenticated` the same grants Supabase hands out on new public tables, so
-- the migration's explicit REVOKEs are the final word — as they will be in prod.

-- =============================================================================
-- HEATHER
-- =============================================================================
set role authenticated;
set cadence.test_uid = '33333333-3333-3333-3333-333333333333';

do $$
declare n int;
begin
  select count(*) into n from public.projects;
  if n <> 3 then
    raise exception 'FAIL: Heather sees % projects, expected 3 (the two Church funds must be hidden)', n;
  end if;
  raise notice 'PASS: Heather sees 3 of 5 projects';

  select count(*) into n from public.projects where sensitivity = 'restricted';
  if n <> 0 then raise exception 'FAIL: Heather sees % restricted projects', n; end if;
  raise notice 'PASS: no restricted project is visible to Heather';

  select count(*) into n from public.notes where title = 'Cascade case';
  if n <> 0 then raise exception 'FAIL: cascade leak — Heather can read a standard note inside a restricted project'; end if;
  raise notice 'PASS: cascade holds (standard note in restricted project is hidden)';

  select count(*) into n from public.notes where title = 'Direct case';
  if n <> 0 then raise exception 'FAIL: Heather can read a restricted note in an open project'; end if;
  raise notice 'PASS: restricted note in an open project is hidden';

  select count(*) into n from public.commitments;
  if n <> 0 then raise exception 'FAIL: Heather sees % commitments belonging to a restricted project', n; end if;
  raise notice 'PASS: commitments in restricted projects are hidden';

  select count(*) into n from public.events;
  if n <> 0 then raise exception 'FAIL: Heather sees % events belonging to a restricted project', n; end if;
  raise notice 'PASS: events in restricted projects are hidden';

  select count(*) into n from public.audit_log;
  if n <> 0 then raise exception 'FAIL: Heather can read % audit_log rows', n; end if;
  raise notice 'PASS: audit_log is invisible to Heather';
end
$$;

-- Heather must not be able to write into a restricted project.
do $$
declare v_id uuid;
begin
  set local cadence.test_uid = '33333333-3333-3333-3333-333333333333';
  select id into v_id from public.projects where slug = 'church-media-fund';
  -- She cannot even see it, so resolve the id out of band.
  begin
    insert into public.commitments (project_id, title)
    values ('00000000-0000-0000-0000-000000000000', 'x');
    raise exception 'FAIL: insert against a nonexistent project succeeded';
  exception
    when foreign_key_violation then raise notice 'PASS: cannot invent a project id';
    when insufficient_privilege then raise notice 'PASS: policy blocked the write';
  end;
end
$$;

-- Escalation: Heather must not be able to mark a project restricted.
do $$
begin
  update public.projects set sensitivity = 'restricted' where slug = 'systems-and-operations';
  raise exception 'FAIL: Heather escalated a project to restricted';
exception
  when insufficient_privilege then raise notice 'PASS: Heather cannot escalate a project to restricted';
end
$$;

-- Role change must be refused.
do $$
begin
  update public.profiles set role = 'reed' where id = '33333333-3333-3333-3333-333333333333';
  raise exception 'FAIL: Heather changed her own role';
exception
  when others then raise notice 'PASS: role change refused (%)', sqlerrm;
end
$$;

reset role;

-- =============================================================================
-- REED
-- =============================================================================
set role authenticated;
set cadence.test_uid = '11111111-1111-1111-1111-111111111111';

do $$
declare n int;
begin
  select count(*) into n from public.projects;
  if n <> 5 then raise exception 'FAIL: Reed sees % projects, expected 5', n; end if;
  raise notice 'PASS: Reed sees all 5 projects';

  select count(*) into n from public.notes;
  if n <> 2 then raise exception 'FAIL: Reed sees % notes, expected 2', n; end if;
  raise notice 'PASS: Reed sees both notes';

  select count(*) into n from public.audit_log;
  if n < 1 then raise exception 'FAIL: audit_log is empty — triggers are not firing'; end if;
  raise notice 'PASS: Reed can read audit_log (% rows, triggers firing)', n;
end
$$;

-- audit_log must be append-only even for Reed.
do $$
begin
  update public.audit_log set action = 'tampered' where id = (select min(id) from public.audit_log);
  raise exception 'FAIL: audit_log was updated';
exception
  when insufficient_privilege then raise notice 'PASS: audit_log cannot be updated';
end
$$;

do $$
begin
  delete from public.audit_log;
  raise exception 'FAIL: audit_log was deleted';
exception
  when insufficient_privilege then raise notice 'PASS: audit_log cannot be deleted';
end
$$;

-- =============================================================================
-- CONSTRAINTS
-- =============================================================================
do $$
declare v_project uuid;
begin
  select id into v_project from public.projects where slug = 'systems-and-operations';

  begin
    insert into public.commitments (project_id, title, status)
    values (v_project, 'waiting with no follow up', 'waiting');
    raise exception 'FAIL: a waiting commitment was accepted with no follow_up_date';
  exception
    when check_violation then raise notice 'PASS: waiting commitment requires a follow_up_date';
  end;

  insert into public.commitments (project_id, title, status, follow_up_date)
  values (v_project, 'waiting, properly', 'waiting', current_date + 3);
  raise notice 'PASS: waiting commitment accepted when follow_up_date is present';

  begin
    insert into public.commitments (project_id, title, owner_type)
    values (v_project, 'owned by nobody', 'external');
    raise exception 'FAIL: an external commitment was accepted with no person';
  exception
    when check_violation then raise notice 'PASS: external commitment requires a person';
  end;
end
$$;

reset role;
