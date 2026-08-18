-- One note per day.
--
-- Capture already existed, but it fed a queue: you typed a line, it went into
-- an inbox, and the day itself left no trace. A day is the unit Reed actually
-- works in — "what happened Tuesday" is a real question and there was nowhere
-- to answer it.
--
-- Lines are stored as plain text separated by newlines rather than as a table of
-- line rows. Ordering, reordering and deleting are then just string operations,
-- and the whole day round-trips as one value. A `daily_note_lines` table would
-- buy nothing here and cost an ordering column and a migration every time the
-- shape of a line changes.

create table public.daily_notes (
  id         uuid primary key default gen_random_uuid(),
  note_date  date not null,
  author_id  uuid not null references public.profiles (id) on delete cascade,
  body       text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One per person per day. The upsert target for capture.
  unique (note_date, author_id)
);

create index daily_notes_author_date_idx on public.daily_notes (author_id, note_date desc);

alter table public.daily_notes enable row level security;
alter table public.daily_notes force row level security;

-- Private, like the inbox. A day's raw notes are half-formed thoughts about
-- named people; they are not for the other two.
create policy daily_notes_all on public.daily_notes
  for all to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create trigger set_updated_at before update on public.daily_notes
  for each row execute function public.tg_set_updated_at();

-- Where a commitment came from, so a line and the thing it became stay linked.
alter table public.commitments
  add column source_daily_note_id uuid references public.daily_notes (id) on delete set null;

/**
 * Append a line to today's note, creating the note if this is the first line.
 *
 * Done in one statement because capture must never block: two round trips (read
 * then write) is a race if you type quickly, and the second line would overwrite
 * the first. The unique constraint plus ON CONFLICT makes it atomic.
 */
create or replace function public.append_to_daily_note(p_line text, p_date date default current_date)
returns public.daily_notes
language plpgsql
security invoker
set search_path = public
as $$
declare
  result public.daily_notes;
begin
  insert into public.daily_notes (note_date, author_id, body)
  values (p_date, auth.uid(), p_line)
  on conflict (note_date, author_id) do update
    -- Empty note: no leading blank line.
    set body = case
      when public.daily_notes.body = '' then excluded.body
      else public.daily_notes.body || E'\n' || excluded.body
    end
  returning * into result;

  return result;
end
$$;

revoke execute on function public.append_to_daily_note(text, date) from public, anon;
grant execute on function public.append_to_daily_note(text, date) to authenticated;
