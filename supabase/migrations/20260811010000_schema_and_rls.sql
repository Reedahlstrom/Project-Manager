-- Cadence — schema, row-level security, triggers, and seed data.
--
-- READ THIS BEFORE CHANGING ANY POLICY IN THIS FILE.
--
-- The security boundary of this application is the set of RLS policies below.
-- It is not the UI, not a TypeScript type, and not a filter in a React hook.
-- Three people use this app and one of them (Heather) must never be able to
-- read `restricted` material, nor infer that it exists.
--
-- Two rules govern everything here:
--
--   1. Deny by default. RLS is enabled on every table including join tables.
--      A table with RLS on and no matching policy returns zero rows.
--
--   2. Restricted cascades. A row belonging to a restricted project is
--      restricted, whatever its own sensitivity column says.
--
-- NOTE ON SCOPE — this is deliberately stricter than the written spec.
-- The spec says the cascade covers notes and documents. This migration cascades
-- to events, commitments, decisions, milestones, documents, notes, attendees and
-- comments as well. Leaving a restricted project's commitments readable would
-- disclose the project's name, its people, and its work to someone barred from
-- the project itself, which defeats the point. Narrowing this later is a
-- deliberate decision to make, not something to do by accident.

create extension if not exists "pgcrypto";

-- =============================================================================
-- ENUMS
-- =============================================================================

create type public.user_role         as enum ('reed', 'paul', 'heather');
create type public.sensitivity       as enum ('standard', 'sensitive', 'restricted');
create type public.project_status    as enum ('active', 'paused', 'closed');
create type public.health            as enum ('green', 'amber', 'red');
create type public.relationship      as enum ('principal', 'advisor', 'partner', 'staff', 'external');
create type public.event_type        as enum ('meeting', 'convening', 'launch', 'deadline');
create type public.event_status      as enum ('planned', 'confirmed', 'done', 'cancelled');
create type public.attendee_role     as enum ('host', 'attendee', 'speaker', 'optional');
create type public.rsvp_status       as enum ('unknown', 'yes', 'no', 'tentative');
create type public.owner_type        as enum ('me', 'paul', 'heather', 'external');
create type public.commitment_status as enum ('open', 'waiting', 'blocked', 'done', 'dropped');
create type public.commitment_source as enum ('manual', 'meeting', 'import', 'email', 'checklist');
create type public.milestone_status  as enum ('upcoming', 'hit', 'missed', 'moved');
create type public.comment_parent    as enum ('commitment', 'event', 'note');
create type public.inbox_source      as enum ('quick', 'email', 'share');

-- =============================================================================
-- TABLES
-- =============================================================================

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null,
  role        public.user_role not null,
  email       text not null unique,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.projects (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text not null unique,
  purpose      text,
  status       public.project_status not null default 'active',
  health       public.health not null default 'green',
  health_note  text,
  sensitivity  public.sensitivity not null default 'standard',
  sort_order   integer not null default 0,
  deleted_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.people (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  org                   text,
  title                 text,
  email                 text,
  phone                 text,
  relationship          public.relationship not null default 'external',
  how_we_know_them      text,
  what_matters_to_them  text,
  notes                 text,
  tags                  text[] not null default '{}',
  last_contact_at       timestamptz,
  next_touch_at         timestamptz,
  sensitivity           public.sensitivity not null default 'standard',
  deleted_at            timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table public.checklist_templates (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  event_type   public.event_type,
  description  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.events (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects (id) on delete cascade,
  title         text not null,
  type          public.event_type not null default 'meeting',
  -- Stored in UTC. `timezone` is the zone the event actually happens in, kept
  -- separately because a convening happens in a place and "3pm" means 3pm there.
  starts_at     timestamptz not null,
  ends_at       timestamptz,
  timezone      text not null default 'America/Denver',
  location      text,
  virtual_link  text,
  status        public.event_status not null default 'planned',
  agenda        text,
  template_id   uuid references public.checklist_templates (id) on delete set null,
  created_by    uuid references public.profiles (id) on delete set null,
  deleted_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint events_end_after_start check (ends_at is null or ends_at >= starts_at)
);

create table public.event_attendees (
  event_id   uuid not null references public.events (id) on delete cascade,
  person_id  uuid not null references public.people (id) on delete cascade,
  role       public.attendee_role not null default 'attendee',
  rsvp       public.rsvp_status not null default 'unknown',
  primary key (event_id, person_id)
);

create table public.notes (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid references public.projects (id) on delete cascade,
  event_id     uuid references public.events (id) on delete cascade,
  person_id    uuid references public.people (id) on delete cascade,
  title        text,
  body         text not null default '',
  author_id    uuid references public.profiles (id) on delete set null,
  sensitivity  public.sensitivity not null default 'standard',
  extracted_at timestamptz,
  deleted_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.note_versions (
  id         uuid primary key default gen_random_uuid(),
  note_id    uuid not null references public.notes (id) on delete cascade,
  body       text not null,
  author_id  uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.commitments (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid not null references public.projects (id) on delete cascade,
  event_id         uuid references public.events (id) on delete set null,
  title            text not null,
  detail           text,
  owner_type       public.owner_type not null default 'me',
  owner_person_id  uuid references public.people (id) on delete set null,
  due_date         date,
  -- The most important column in this schema. `due_date` is when the thing is
  -- owed; `follow_up_date` is when we chase whoever owes it. The "Chase these"
  -- section on Today is built on this and it is the anti-dropped-ball feature.
  follow_up_date   date,
  status           public.commitment_status not null default 'open',
  blocked_reason   text,
  source           public.commitment_source not null default 'manual',
  source_note_id   uuid references public.notes (id) on delete set null,
  last_nudged_at   timestamptz,
  completed_at     timestamptz,
  created_by       uuid references public.profiles (id) on delete set null,
  deleted_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  -- A waiting commitment with no follow-up date is precisely the thing that
  -- falls through the cracks. The database refuses to hold one.
  constraint commitments_waiting_needs_follow_up
    check (status <> 'waiting' or follow_up_date is not null),

  -- If someone outside the three of us owns it, we have to know who.
  constraint commitments_external_needs_person
    check (owner_type <> 'external' or owner_person_id is not null)
);

create table public.decisions (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  event_id    uuid references public.events (id) on delete set null,
  statement   text not null,
  decided_by  uuid references public.people (id) on delete set null,
  decided_at  timestamptz not null default now(),
  rationale   text,
  reversible  boolean not null default true,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.documents (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid references public.projects (id) on delete cascade,
  event_id     uuid references public.events (id) on delete set null,
  name         text not null,
  storage_path text not null,
  mime         text,
  size_bytes   bigint,
  uploaded_by  uuid references public.profiles (id) on delete set null,
  sensitivity  public.sensitivity not null default 'standard',
  deleted_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.checklist_items (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.checklist_templates (id) on delete cascade,
  title       text not null,
  -- Negative means before the event. -42 is six weeks of lead time.
  offset_days integer not null default 0,
  owner_type  public.owner_type not null default 'me',
  category    text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.milestones (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  title       text not null,
  target_date date,
  status      public.milestone_status not null default 'upcoming',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.comments (
  id          uuid primary key default gen_random_uuid(),
  parent_type public.comment_parent not null,
  parent_id   uuid not null,
  author_id   uuid references public.profiles (id) on delete set null,
  body        text not null,
  created_at  timestamptz not null default now()
);

create table public.inbox_items (
  id         uuid primary key default gen_random_uuid(),
  raw_text   text not null,
  source     public.inbox_source not null default 'quick',
  processed  boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.digests (
  id           uuid primary key default gen_random_uuid(),
  period_start date not null,
  period_end   date not null,
  body         text not null,
  sent_at      timestamptz,
  recipients   text[] not null default '{}',
  created_at   timestamptz not null default now()
);

-- Append-only. There is no UPDATE or DELETE policy on this table anywhere in
-- this file, and there must never be one.
create table public.audit_log (
  id         bigserial primary key,
  actor_id   uuid,
  action     text not null,
  table_name text not null,
  row_id     uuid,
  at         timestamptz not null default now(),
  ip         inet
);

-- =============================================================================
-- HELPER FUNCTIONS
--
-- Defined after the tables because a SQL-language function body is parsed and
-- validated at creation time — these cannot be declared before `profiles`
-- exists.
--
-- All of them are SECURITY DEFINER. That is required, not incidental: a policy
-- on `projects` that queried `profiles` directly would trigger the policy on
-- `profiles`, which would recurse. SECURITY DEFINER lets the helper read the
-- table without re-entering RLS.
--
-- `search_path` is pinned on every one. Without it a caller could create a
-- shadowing `profiles` table in a schema earlier on their path and change what
-- these return — which would hand them any role they liked.
-- =============================================================================

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- Reed and Paul. The only two who may see restricted material.
create or replace function public.is_privileged()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role in ('reed', 'paul') from public.profiles where id = auth.uid()),
    false
  )
$$;

-- Signed in at all. Cloudflare Access is the outer gate; this is the inner one.
create or replace function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid())
$$;

create or replace function public.project_is_restricted(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select sensitivity = 'restricted' from public.projects where id = p_project_id),
    false
  )
$$;

-- The single predicate every project-scoped table uses.
-- A null project_id (a note attached only to a person) cannot inherit a
-- restriction, so those rows fall back to their own sensitivity column.
create or replace function public.can_access_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_privileged()
      or p_project_id is null
      or not public.project_is_restricted(p_project_id)
$$;

-- These read privileged rows by design, so they must not be executable by an
-- unauthenticated caller.
revoke execute on function
  public.current_user_role(), public.is_privileged(), public.is_member(),
  public.project_is_restricted(uuid), public.can_access_project(uuid)
  from public, anon;

grant execute on function
  public.current_user_role(), public.is_privileged(), public.is_member(),
  public.project_is_restricted(uuid), public.can_access_project(uuid)
  to authenticated, service_role;

-- =============================================================================
-- INDEXES
-- =============================================================================

create index projects_status_idx      on public.projects (status) where deleted_at is null;
create index people_relationship_idx  on public.people (relationship) where deleted_at is null;
create index people_tags_idx          on public.people using gin (tags);

create index events_project_idx       on public.events (project_id, starts_at) where deleted_at is null;
create index events_starts_at_idx     on public.events (starts_at) where deleted_at is null;
create index event_attendees_person_idx on public.event_attendees (person_id);

create index commitments_project_idx  on public.commitments (project_id) where deleted_at is null;
create index commitments_event_idx    on public.commitments (event_id);
create index commitments_owner_idx    on public.commitments (owner_type, status) where deleted_at is null;
create index commitments_due_idx      on public.commitments (due_date) where deleted_at is null;
-- Powers "Chase these", which is the query that runs most often.
create index commitments_follow_up_idx on public.commitments (follow_up_date)
  where status = 'waiting' and deleted_at is null;

create index notes_project_idx        on public.notes (project_id) where deleted_at is null;
create index notes_event_idx          on public.notes (event_id);
create index notes_person_idx         on public.notes (person_id);
create index note_versions_note_idx   on public.note_versions (note_id, created_at desc);

create index decisions_project_idx    on public.decisions (project_id);
create index documents_project_idx    on public.documents (project_id);
create index milestones_project_idx   on public.milestones (project_id, target_date);
create index checklist_items_template_idx on public.checklist_items (template_id, sort_order);
create index comments_parent_idx      on public.comments (parent_type, parent_id, created_at);
create index inbox_unprocessed_idx    on public.inbox_items (created_at desc) where processed = false;
create index audit_log_at_idx         on public.audit_log (at desc);

-- Full text search. The regconfig is a literal so the expression is IMMUTABLE
-- and can be indexed.
create index notes_fts_idx on public.notes using gin (
  to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, ''))
);
create index people_fts_idx on public.people using gin (
  to_tsvector('english', coalesce(name, '') || ' ' || coalesce(notes, '') || ' ' || coalesce(org, ''))
);
create index commitments_fts_idx on public.commitments using gin (
  to_tsvector('english', coalesce(title, '') || ' ' || coalesce(detail, ''))
);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'projects', 'people', 'events', 'notes', 'commitments',
    'decisions', 'documents', 'checklist_templates', 'checklist_items', 'milestones'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.tg_set_updated_at()', t
    );
  end loop;
end
$$;

-- Nobody edits their own role. Roles are hardcoded and set out of band.
create or replace function public.tg_lock_role()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role then
    raise exception 'role is not editable';
  end if;
  return new;
end
$$;

create trigger lock_role before update on public.profiles
  for each row execute function public.tg_lock_role();

-- Audit. SECURITY DEFINER so the insert succeeds regardless of the caller's
-- policies — the log must not be suppressible by the person being logged.
create or replace function public.tg_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row uuid;
begin
  if tg_op = 'DELETE' then
    v_row := old.id;
  else
    v_row := new.id;
  end if;

  insert into public.audit_log (actor_id, action, table_name, row_id)
  values (auth.uid(), lower(tg_op), tg_table_name, v_row);

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'projects', 'commitments', 'decisions', 'notes', 'documents'
  ] loop
    execute format(
      'create trigger audit_changes after insert or update or delete on public.%I
         for each row execute function public.tg_audit()', t
    );
  end loop;
end
$$;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'projects', 'people', 'events', 'event_attendees', 'notes',
    'note_versions', 'commitments', 'decisions', 'documents',
    'checklist_templates', 'checklist_items', 'milestones', 'comments',
    'inbox_items', 'digests', 'audit_log'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
  end loop;
end
$$;

-- --- profiles ---------------------------------------------------------------
-- Everyone signed in can see who the other two are; names appear on every
-- commitment and note. Nobody inserts or deletes a profile from the client.

create policy profiles_select on public.profiles
  for select to authenticated
  using (public.is_member());

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- --- projects ---------------------------------------------------------------

create policy projects_select on public.projects
  for select to authenticated
  using (public.is_privileged() or sensitivity <> 'restricted');

create policy projects_insert on public.projects
  for insert to authenticated
  with check (
    public.is_member()
    and (public.is_privileged() or sensitivity <> 'restricted')
  );

create policy projects_update on public.projects
  for update to authenticated
  using (public.is_privileged() or sensitivity <> 'restricted')
  -- The WITH CHECK stops an unprivileged user marking a row restricted and
  -- thereby writing something they could no longer read, and equally stops them
  -- un-restricting a row.
  with check (public.is_privileged() or sensitivity <> 'restricted');

create policy projects_delete on public.projects
  for delete to authenticated
  using (public.is_privileged());

-- --- people -----------------------------------------------------------------

create policy people_select on public.people
  for select to authenticated
  using (public.is_privileged() or sensitivity <> 'restricted');

create policy people_insert on public.people
  for insert to authenticated
  with check (
    public.is_member()
    and (public.is_privileged() or sensitivity <> 'restricted')
  );

create policy people_update on public.people
  for update to authenticated
  using (public.is_privileged() or sensitivity <> 'restricted')
  with check (public.is_privileged() or sensitivity <> 'restricted');

create policy people_delete on public.people
  for delete to authenticated
  using (public.is_privileged());

-- --- project-scoped tables --------------------------------------------------
-- events, commitments, decisions, milestones all inherit from their project and
-- have no sensitivity column of their own.

create policy events_all on public.events
  for all to authenticated
  using (public.can_access_project(project_id))
  with check (public.is_member() and public.can_access_project(project_id));

create policy commitments_all on public.commitments
  for all to authenticated
  using (public.can_access_project(project_id))
  with check (public.is_member() and public.can_access_project(project_id));

create policy decisions_all on public.decisions
  for all to authenticated
  using (public.can_access_project(project_id))
  with check (public.is_member() and public.can_access_project(project_id));

create policy milestones_all on public.milestones
  for all to authenticated
  using (public.can_access_project(project_id))
  with check (public.is_member() and public.can_access_project(project_id));

-- --- notes ------------------------------------------------------------------
-- Own sensitivity OR the project's. Both have to pass.

create policy notes_all on public.notes
  for all to authenticated
  using (
    public.is_privileged()
    or (sensitivity <> 'restricted' and public.can_access_project(project_id))
  )
  with check (
    public.is_member()
    and (
      public.is_privileged()
      or (sensitivity <> 'restricted' and public.can_access_project(project_id))
    )
  );

-- Versions follow their note exactly.
create policy note_versions_all on public.note_versions
  for all to authenticated
  using (exists (select 1 from public.notes n where n.id = note_id))
  with check (public.is_member() and exists (select 1 from public.notes n where n.id = note_id));

-- --- documents --------------------------------------------------------------

create policy documents_all on public.documents
  for all to authenticated
  using (
    public.is_privileged()
    or (sensitivity <> 'restricted' and public.can_access_project(project_id))
  )
  with check (
    public.is_member()
    and (
      public.is_privileged()
      or (sensitivity <> 'restricted' and public.can_access_project(project_id))
    )
  );

-- --- join tables ------------------------------------------------------------
-- An attendee row is only visible if its event is. The EXISTS re-enters the
-- events policy, which is what we want — one definition of the rule.

create policy event_attendees_all on public.event_attendees
  for all to authenticated
  using (exists (select 1 from public.events e where e.id = event_id))
  with check (public.is_member() and exists (select 1 from public.events e where e.id = event_id));

-- Comments are polymorphic, so the check branches on parent_type.
create policy comments_all on public.comments
  for all to authenticated
  using (
    case parent_type
      when 'commitment' then exists (select 1 from public.commitments c where c.id = parent_id)
      when 'event'      then exists (select 1 from public.events e      where e.id = parent_id)
      when 'note'       then exists (select 1 from public.notes n       where n.id = parent_id)
    end
  )
  with check (
    public.is_member()
    and author_id = auth.uid()
    and case parent_type
      when 'commitment' then exists (select 1 from public.commitments c where c.id = parent_id)
      when 'event'      then exists (select 1 from public.events e      where e.id = parent_id)
      when 'note'       then exists (select 1 from public.notes n       where n.id = parent_id)
    end
  );

-- --- shared, non-project-scoped ---------------------------------------------
-- Checklist templates are operational knowledge, not confidential material.
-- Heather owns most of this expertise, so she gets full access by design.

create policy checklist_templates_all on public.checklist_templates
  for all to authenticated
  using (public.is_member())
  with check (public.is_member());

create policy checklist_items_all on public.checklist_items
  for all to authenticated
  using (public.is_member())
  with check (public.is_member());

-- Inbox items are private to whoever captured them. A half-formed thought
-- captured on a phone is not something to share with the other two.
create policy inbox_items_all on public.inbox_items
  for all to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- Digests are the receipt of what Paul was told and when. Reed and Paul only,
-- and never editable after the fact.
create policy digests_select on public.digests
  for select to authenticated
  using (public.is_privileged());

-- --- audit_log --------------------------------------------------------------
-- INSERT and SELECT only. No UPDATE policy and no DELETE policy exist, so with
-- RLS forced those operations are impossible for any non-superuser role.

create policy audit_log_insert on public.audit_log
  for insert to authenticated
  with check (public.is_member());

create policy audit_log_select on public.audit_log
  for select to authenticated
  using (public.is_privileged());

-- Defence in depth. The absence of an UPDATE/DELETE policy already means such a
-- statement matches zero rows, but it succeeds silently rather than failing.
-- Revoking the privilege outright turns a silent no-op into a hard error, which
-- is what you want from a tamper-evident log. Supabase grants ALL on new public
-- tables to `authenticated` by default, so this revoke has to be explicit.
revoke update, delete, truncate on public.audit_log from authenticated, anon;

-- Digests are a record of what Paul was told and when. Written by the Edge
-- Function with the service role; never touched from a browser.
revoke insert, update, delete, truncate on public.digests from authenticated, anon;

-- Note history is append-only — that is the entire point of keeping it.
revoke update, delete, truncate on public.note_versions from authenticated, anon;

-- =============================================================================
-- SEED
--
-- SENSITIVITY HERE IS A JUDGEMENT CALL — CONFIRM IT BEFORE REAL DATA GOES IN.
--
-- The two Church funds are seeded `restricted`, which means Heather cannot see
-- them at all. That was chosen because the failure modes are not symmetric:
-- over-restricting is noticed within a day and fixed with one UPDATE, while
-- under-restricting exposes First Presidency material and is noticed by nobody.
--
-- If Heather is meant to be inside this work, open them up deliberately:
--   update public.projects set sensitivity = 'sensitive' where slug in
--     ('church-media-fund', 'church-jobs-fund');
-- =============================================================================

insert into public.projects (name, slug, purpose, sensitivity, sort_order) values
  ('Angel Business Advisory Council', 'angel-bac',
   'Assemble and run a council of advisors for Angel Studios, and report back to the board.',
   'sensitive', 1),
  ('Church Media Fund', 'church-media-fund',
   'Deploy the First Presidency commitment alongside the matching resources Paul is bringing.',
   'restricted', 2),
  ('Church Jobs Fund', 'church-jobs-fund',
   'Open the conversation with Kylin Brown about employment. Not yet raised with the Church.',
   'restricted', 3),
  ('Obra', 'obra',
   'Understand the sales process, find what is and is not working, and build systems and channels.',
   'sensitive', 4),
  ('Systems & Operations', 'systems-and-operations',
   'The reusable layer underneath everything else.',
   'standard', 5);
