-- Meeting notes.
--
-- Reed records meetings on a device that already transcribes them and writes
-- action items. Those land here, get routed to a project, and the action items
-- become tracked commitments. The transcript then lives with the project rather
-- than in a separate app nobody opens again.
--
-- Deliberately not a general notes table: `notes` already exists and is written
-- by hand. This is the record of a specific conversation, with a source and a
-- date and a set of things that came out of it.

create table public.meetings (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references public.projects (id) on delete set null,
  title       text not null,
  met_at      timestamptz not null default now(),
  -- Whatever the device produced. The record of what was actually said.
  transcript  text not null default '',
  -- The device's own summary, when it wrote one.
  summary     text,
  attendees   text,
  source      text,
  -- Extraction is a separate act from upload: a meeting can sit unextracted,
  -- and a restricted one never gets extracted at all.
  extracted_at timestamptz,
  -- Set when routing was a guess rather than a rule, so it can be reviewed.
  auto_routed boolean not null default false,
  author_id   uuid references public.profiles (id) on delete set null,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index meetings_project_idx on public.meetings (project_id, met_at desc)
  where deleted_at is null;
create index meetings_unrouted_idx on public.meetings (met_at desc)
  where project_id is null and deleted_at is null;

create index meetings_fts_idx on public.meetings using gin (
  to_tsvector('english',
    coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(transcript, ''))
);

-- Where a commitment came from, so an action item and the meeting that produced
-- it stay linked.
alter table public.commitments
  add column source_meeting_id uuid references public.meetings (id) on delete set null;

alter table public.meetings enable row level security;
alter table public.meetings force row level security;

-- Access follows the project, exactly as notes and documents do — so a meeting
-- filed under a restricted project is invisible to Heather. An unrouted meeting
-- (project_id null) has not been filed yet and stays with whoever uploaded it,
-- because until it is routed nobody knows how sensitive it is.
create policy meetings_all on public.meetings
  for all to authenticated
  using (
    case
      when project_id is null then author_id = auth.uid()
      else public.can_access_project(project_id)
    end
  )
  with check (
    public.is_member()
    and case
      when project_id is null then author_id = auth.uid()
      else public.can_access_project(project_id)
    end
  );

create trigger set_updated_at before update on public.meetings
  for each row execute function public.tg_set_updated_at();

create trigger audit_changes after insert or update or delete on public.meetings
  for each row execute function public.tg_audit();
