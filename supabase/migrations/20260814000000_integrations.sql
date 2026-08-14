-- Google Calendar and Gmail integration.
--
-- Three ideas here, and the first one is the important one.
--
-- 1. NOTHING IS REMEMBERED IN MEMORY. Edge Functions are stateless and pg_cron
--    starts them fresh, so "have I already seen this message" has to be a row
--    in a table. A seen-set held in a module variable — the obvious approach,
--    and the one a long-running worker gets away with — would re-alert on every
--    message on every tick here.
--
-- 2. Inbound mail lands in `inbox_items`, never straight into `commitments`.
--    Capture is not commitment. A model decides what is worth your attention;
--    only you decide what you owe someone.
--
-- 3. Routing is rules you write, not inference. A message or meeting is
--    attached to a project because a rule you can read and edit said so.

-- --- Where external things came from ----------------------------------------

alter table public.events
  add column external_source text,
  add column external_id text,
  add column external_updated_at timestamptz;

-- Re-running a sync must update, never duplicate.
create unique index events_external_idx
  on public.events (external_source, external_id)
  where external_source is not null and external_id is not null;

-- Carry the link back to the original. An alert you can't act on in one tap
-- is a notification you dismiss.
alter table public.inbox_items
  add column source_url text,
  add column source_ref text,
  add column project_id uuid references public.projects (id) on delete set null;

create unique index inbox_items_source_ref_idx
  on public.inbox_items (source, source_ref)
  where source_ref is not null;

-- --- Idempotency ------------------------------------------------------------

create table public.processed_messages (
  id           bigserial primary key,
  source       text not null,            -- 'gmail' | 'calendar'
  external_id  text not null,
  decision     text,                     -- 'flagged' | 'ignored' | 'synced'
  reason       text,
  processed_at timestamptz not null default now()
);

-- The insert is the lock: a conflict means another invocation already handled
-- this message, which is how two overlapping cron ticks stay safe.
create unique index processed_messages_unique
  on public.processed_messages (source, external_id);

create index processed_messages_at_idx on public.processed_messages (processed_at desc);

-- --- Routing ----------------------------------------------------------------

create type public.rule_kind as enum ('sender', 'domain', 'keyword', 'attendee');

create table public.routing_rules (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  kind       public.rule_kind not null,
  value      text not null,
  -- Always flag a match regardless of what the model thinks. Used for people
  -- who matter: Paul, an advisor, Kylin Brown.
  always     boolean not null default false,
  created_at timestamptz not null default now()
);

create index routing_rules_project_idx on public.routing_rules (project_id);
create unique index routing_rules_unique on public.routing_rules (kind, lower(value), project_id);

-- --- Credentials ------------------------------------------------------------
--
-- The Google refresh token. RLS is enabled and there is deliberately NO select
-- policy: no signed-in user can read this table from a browser at all, only the
-- service role inside an Edge Function. A token that can read the whole mailbox
-- should not be one query away from the client bundle.

create table public.integration_credentials (
  provider      text primary key,        -- 'google'
  refresh_token text not null,
  scopes        text,
  account_email text,
  connected_at  timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.integration_credentials enable row level security;
alter table public.integration_credentials force row level security;
revoke all on public.integration_credentials from authenticated, anon;

-- A place to remember how far each sync got, so a poll asks Google for "what
-- changed" rather than re-reading everything.
create table public.integration_state (
  provider   text primary key,
  sync_token text,
  last_run_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now()
);

alter table public.integration_state enable row level security;
alter table public.integration_state force row level security;

create policy integration_state_read on public.integration_state
  for select to authenticated
  using (public.is_privileged());

-- --- RLS for the new tables -------------------------------------------------

alter table public.processed_messages enable row level security;
alter table public.processed_messages force row level security;

create policy processed_messages_read on public.processed_messages
  for select to authenticated
  using (public.is_privileged());

alter table public.routing_rules enable row level security;
alter table public.routing_rules force row level security;

-- Rules follow their project, so a rule on a restricted project is invisible
-- to Heather exactly as the project is.
create policy routing_rules_all on public.routing_rules
  for all to authenticated
  using (public.can_access_project(project_id))
  with check (public.is_member() and public.can_access_project(project_id));

create trigger set_updated_at before update on public.integration_credentials
  for each row execute function public.tg_set_updated_at();
create trigger set_updated_at before update on public.integration_state
  for each row execute function public.tg_set_updated_at();
