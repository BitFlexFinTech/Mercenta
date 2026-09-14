-- §Canonical model §22 — daily digest cron schedule.
--
-- WHY: the admin daily digest (§8 commission-billing approval queue) must be
-- generated every morning without a human remembering to run it. `pg_cron`
-- schedules the job inside Postgres and `pg_net` performs the HTTPS POST to the
-- `daily-digest` Edge Function.
--
-- ⚠️ NUMBERING (honest): the production-readiness notes historically referred to
-- this file as `0011_cron_daily_digest.sql`. That number was already taken by
-- `011_create_messages.sql`, so the file never existed under that name. The
-- reference was stale and has been repointed to the real, sequential history
-- (023 was the newest before this phase).
--
-- ⚠️ DEPLOY-TIME PLACEHOLDERS: `<PROJECT_REF>` and `<SERVICE_ROLE_KEY>` must be
-- substituted before this migration is applied. They are deliberately left
-- obvious so an un-substituted file cannot silently schedule a job that posts to
-- a URL that does not exist.
--
-- NON-DESTRUCTIVE: purely additive. It enables two extensions, defines one
-- wrapper function and schedules one named job.
--
-- NOTE (honest): this migration has NOT been executed against any database in
-- the current demo environment (no browser Supabase credentials are configured
-- there, so the memory adapter is active).

create extension if not exists pg_cron;
create extension if not exists pg_net;

/**
 * Posts the daily digest to the deployed Edge Function.
 *
 * Kept as a named function so the schedule references a stable identity and the
 * request shape lives in exactly one place.
 */
create or replace function public.trigger_daily_digest()
returns bigint
language plpgsql
security definer
set search_path = public, net
as $$
declare
  v_request_id bigint;
begin
  select net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/daily-digest',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    ),
    body    := jsonb_build_object('source', 'pg_cron', 'schedule', 'daily')
  )
  into v_request_id;

  return v_request_id;
end;
$$;

comment on function public.trigger_daily_digest() is
  '§22 — posts the daily admin digest to the daily-digest Edge Function. Called by the daily-digest-0700-uk cron job.';

-- Replace-then-schedule so re-running the migration is safe.
select cron.unschedule('daily-digest-0700-uk')
where exists (select 1 from cron.job where jobname = 'daily-digest-0700-uk');

select cron.schedule(
  'daily-digest-0700-uk',
  '0 7 * * *',
  $$select public.trigger_daily_digest();$$
);
