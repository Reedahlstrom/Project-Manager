-- The cadence of trust.
--
-- Receive a commandment → do it immediately → report back → receive the next one.
--
-- The schema could express the first two steps and not the third. A commitment
-- could be `done` while the person who asked for it still had no idea it was
-- finished — which is precisely the moment trust fails to compound. Doing the
-- work and closing the loop are two different events and the database now knows
-- the difference.
--
-- This gives Today a second chase list, symmetric with the first:
--
--   "Chase these"  — we are waiting on someone else      (status = 'waiting')
--   "Report back"  — someone else is waiting on us       (done, not yet reported)
--
-- The first stops things falling through the cracks. The second is what makes
-- Reed trustworthy rather than merely productive.

alter table public.commitments
  -- Who gave the commandment. Null means Reed set it for himself — there is
  -- nobody to report back to and it never appears in the Report back list.
  add column requested_by public.owner_type,
  add column requested_by_person_id uuid references public.people (id) on delete set null,
  -- When the loop was actually closed. Deliberately separate from completed_at.
  add column reported_back_at timestamptz,
  -- What was said. This is the raw material for the weekly digest — a report
  -- already written once should never have to be written again.
  add column report_note text;

alter table public.commitments
  add constraint commitments_external_requester_needs_person
    check (requested_by <> 'external' or requested_by_person_id is not null);

-- The Report back query: finished, someone asked for it, loop still open.
create index commitments_report_back_idx
  on public.commitments (completed_at)
  where status = 'done'
    and requested_by is not null
    and reported_back_at is null
    and deleted_at is null;

comment on column public.commitments.requested_by is
  'Who asked for this. Null = self-directed, no report-back owed.';
comment on column public.commitments.reported_back_at is
  'When the loop was closed with the requester. Separate from completed_at on purpose: doing the work and saying so are different acts.';
