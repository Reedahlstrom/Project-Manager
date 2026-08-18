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

-- pg_cron and pg_net are Supabase-provided and absent from a plain Postgres.
-- Everything below is guarded so the local RLS harness — which runs the real
-- migrations against a throwaway server with no Docker — still applies this
-- file and keeps exercising the policies. On Supabase it does the real work.
do $$
begin
  create extension if not exists pg_cron with schema extensions;
  create extension if not exists pg_net with schema extensions;
exception when others then
  raise notice 'pg_cron/pg_net unavailable — skipping schedule (expected outside Supabase)';
end
$$;

do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise notice 'pg_cron absent — no jobs scheduled';
    return;
  end if;

  -- Idempotent: unschedule first so re-running this doesn't stack jobs.
  begin perform cron.unschedule('triage-email'); exception when others then null; end;
  begin perform cron.unschedule('sync-calendar'); exception when others then null; end;

  -- Email every 10 minutes. New mail is the thing most likely to need a fast
  -- response, and a run with nothing new costs one Gmail list call.
  perform cron.schedule('triage-email', '*/10 * * * *', $cron$
    select net.http_post(
      url := 'https://vgsfqcuhiliazgmjznje.supabase.co/functions/v1/triage-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer sb_publishable_DvS7WpO59iq2Bj0UnHgkYg_LfTQ9EpJ'
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 55000
    );
  $cron$);

  -- Calendar every 30 minutes. Meetings move, but not on a ten-minute cadence.
  perform cron.schedule('sync-calendar', '*/30 * * * *', $cron$
    select net.http_post(
      url := 'https://vgsfqcuhiliazgmjznje.supabase.co/functions/v1/sync-calendar',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer sb_publishable_DvS7WpO59iq2Bj0UnHgkYg_LfTQ9EpJ'
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 55000
    );
  $cron$);
end
$$;

-- Reed needs to be able to see whether the schedule is actually alive without
-- the Supabase dashboard. cron.job is superuser-only, so expose just what
-- Settings needs.
create or replace function public.sync_schedule()
returns table (job_name text, schedule text, active boolean)
language plpgsql
stable
security definer
set search_path = public, cron
as $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    return;
  end if;
  return query
    select jobname::text, schedule::text, active
    from cron.job
    where jobname in ('triage-email', 'sync-calendar');
end
$$;

revoke execute on function public.sync_schedule() from public, anon;
grant execute on function public.sync_schedule() to authenticated;
