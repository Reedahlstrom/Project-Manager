-- Run the syncs on a schedule instead of only when someone presses a button.
--
-- Until now triage-email and sync-calendar only ran when invoked by hand, which
-- meant the integration worked exactly once — the time it was tested — and then
-- silently stopped. An integration that needs remembering is not an integration.
--
-- pg_cron fires them from inside Postgres, so nothing depends on a browser being
-- open or a laptop being awake.
--
-- The key used to call them is the PUBLISHABLE key, deliberately. It is already
-- compiled into the browser bundle and readable by anyone with devtools, so it
-- is not a secret and does not belong in Vault. The service role key would be a
-- real secret and is not needed here: the functions hold their own privileged
-- access internally, and all a caller gets back is a count.
--
-- Triggering a sync is also close to free for an attacker and useless: every
-- message id is claimed in `processed_messages` on first sight, so repeat runs
-- do almost nothing.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Idempotent: unschedule first so re-running this migration doesn't stack jobs.
do $$
begin
  perform cron.unschedule('triage-email');
exception when others then null;
end
$$;

do $$
begin
  perform cron.unschedule('sync-calendar');
exception when others then null;
end
$$;

-- Email every 10 minutes. New mail is the thing most likely to need a fast
-- response, and a run with nothing new costs one Gmail list call.
select cron.schedule(
  'triage-email',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := 'https://vgsfqcuhiliazgmjznje.supabase.co/functions/v1/triage-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sb_publishable_DvS7WpO59iq2Bj0UnHgkYg_LfTQ9EpJ'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
  $$
);

-- Calendar every 30 minutes. Meetings move, but not on a ten-minute cadence.
select cron.schedule(
  'sync-calendar',
  '*/30 * * * *',
  $$
  select net.http_post(
    url := 'https://vgsfqcuhiliazgmjznje.supabase.co/functions/v1/sync-calendar',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sb_publishable_DvS7WpO59iq2Bj0UnHgkYg_LfTQ9EpJ'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
  $$
);

-- Reed needs to be able to see whether the schedule is actually alive without
-- the Supabase dashboard. cron.job is superuser-only, so expose just what
-- Settings needs.
create or replace function public.sync_schedule()
returns table (job_name text, schedule text, active boolean)
language sql
stable
security definer
set search_path = public, cron
as $$
  select jobname::text, schedule::text, active
  from cron.job
  where jobname in ('triage-email', 'sync-calendar')
$$;

revoke execute on function public.sync_schedule() from public, anon;
grant execute on function public.sync_schedule() to authenticated;
