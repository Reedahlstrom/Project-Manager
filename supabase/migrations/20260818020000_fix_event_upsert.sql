-- Calendar sync was failing on every run.
--
--   "there is no unique or exclusion constraint matching the ON CONFLICT
--    specification"
--
-- The index it needed was partial:
--
--   create unique index events_external_idx on events (external_source, external_id)
--     where external_source is not null and external_id is not null;
--
-- Postgres will only use a partial index for ON CONFLICT if the statement
-- restates the predicate, and PostgREST's `onConflict` parameter has no way to
-- express one. So every upsert raised, the function returned 500, and the only
-- visible symptom was a red line in Settings — meetings quietly never synced.
--
-- A plain unique index works because Postgres treats NULLs as distinct by
-- default: rows created by hand, which have no external_source, still never
-- collide with each other.

drop index if exists public.events_external_idx;

create unique index events_external_idx
  on public.events (external_source, external_id);

comment on index public.events_external_idx is
  'Deliberately NOT partial: ON CONFLICT cannot target a partial index through PostgREST. NULLs are distinct, so hand-created events do not collide.';
