-- Ball knowledge.
--
-- The things you'd otherwise have to ask Paul, or work out again every time:
-- where he takes people in American Fork, which events he actually turns up to,
-- what he sends as a thank-you.
--
-- This is not a notes table and it is not a list of options. The point is a fast
-- decision, so the shape is built around one field: `is_go_to`. When there is a
-- default answer, you want the default answer — not five restaurants to weigh up
-- while someone waits on the phone.
--
-- Grouped by category, narrowed by area, because "a restaurant" is the wrong
-- question and "a restaurant near American Fork" is the right one.

create table public.playbook (
  id          uuid primary key default gen_random_uuid(),
  -- Free text rather than an enum: the categories that matter will emerge from
  -- use, and a schema migration is a bad reason not to write something down.
  category    text not null,
  name        text not null,
  -- Where this applies. Null means anywhere.
  area        text,
  -- The actual knowledge. "His go-to. Good for a working lunch, never loud."
  note        text,
  -- The default answer for this category and area. What makes this a decision
  -- rather than a list.
  is_go_to    boolean not null default false,
  -- Whose preference. Mostly Paul, but advisors have them too.
  who         text,
  link        text,
  tags        text[] not null default '{}',
  sensitivity public.sensitivity not null default 'standard',
  created_by  uuid references public.profiles (id) on delete set null,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index playbook_category_idx on public.playbook (category) where deleted_at is null;
create index playbook_go_to_idx on public.playbook (category, area) where is_go_to and deleted_at is null;
create index playbook_tags_idx on public.playbook using gin (tags);

create index playbook_fts_idx on public.playbook using gin (
  to_tsvector('english',
    coalesce(name, '') || ' ' || coalesce(note, '') || ' ' ||
    coalesce(area, '') || ' ' || coalesce(category, ''))
);

alter table public.playbook enable row level security;
alter table public.playbook force row level security;

-- Same rule as everywhere else: restricted is Reed and Paul only.
create policy playbook_all on public.playbook
  for all to authenticated
  using (public.is_privileged() or sensitivity <> 'restricted')
  with check (
    public.is_member() and (public.is_privileged() or sensitivity <> 'restricted')
  );

create trigger set_updated_at before update on public.playbook
  for each row execute function public.tg_set_updated_at();

-- The first entry, and the one that prompted the feature.
insert into public.playbook (category, name, area, note, is_go_to, who) values
  ('Restaurants', 'Sol Agave', 'American Fork',
   'Paul''s go-to when he''s in the American Fork area. Where he takes people.',
   true, 'Paul');
