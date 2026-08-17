-- Closing the loop properly: the other person has to say it is good.
--
-- The cadence is: receive a commandment → do it immediately → report back →
-- receive the next one. The report is not the end of it. In the pattern this
-- app is built on, the report is answered — and until it is answered, the loop
-- is still open.
--
-- Until now the schema had two states: done, and reported. Both were set by
-- Reed. That makes "reported" self-attested, which is precisely what the cadence
-- exists to avoid: the point is not that you say you did the work, it is that
-- the person who asked has acknowledged it.
--
-- So there are three acts, by two different people:
--
--   completed_at    Reed finished the work
--   reported_back_at Reed told them            <- Reed's act
--   confirmed_at    they said it was good      <- THEIR act
--
-- A commitment that is reported but unconfirmed is not finished. It is waiting
-- on someone, exactly like a `waiting` commitment is — and it belongs on the
-- same kind of chase list.

alter table public.commitments
  -- When the requester acknowledged it. Null while the report is outstanding.
  add column confirmed_at timestamptz,
  -- Who confirmed. Normally the requester, but recorded explicitly because a
  -- confirmation given verbally is entered by Reed on their behalf, and the
  -- difference between "Paul confirmed" and "Reed says Paul confirmed" matters.
  add column confirmed_by uuid references public.profiles (id) on delete set null,
  -- Whether it was entered by the requester themselves or logged second-hand.
  add column confirmed_in_app boolean not null default false,
  -- What they said back. "It is good" is the short version; sometimes there is
  -- more, and that is the most useful sentence in the whole record.
  add column confirmation_note text;

-- A confirmation cannot precede the report it answers.
alter table public.commitments
  add constraint commitments_confirm_needs_report
    check (confirmed_at is null or reported_back_at is not null);

-- Reported but unanswered — the new chase list.
create index commitments_awaiting_confirmation_idx
  on public.commitments (reported_back_at)
  where reported_back_at is not null
    and confirmed_at is null
    and deleted_at is null;

-- What the requester needs to answer, from their side.
create index commitments_to_confirm_idx
  on public.commitments (requested_by, reported_back_at)
  where reported_back_at is not null
    and confirmed_at is null
    and deleted_at is null;

comment on column public.commitments.confirmed_at is
  'When the person who asked said it was good. The loop is not closed until this is set — reporting alone is self-attested.';
comment on column public.commitments.confirmed_in_app is
  'True when the requester confirmed it themselves; false when Reed logged a confirmation given in person or by reply.';
