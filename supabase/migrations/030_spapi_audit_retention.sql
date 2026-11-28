-- §PHASE 3 / ITEM 3 — RETENTION PURGE FOR THE SP-API ACCESS LOG.
--
-- WHY THIS EXISTS
-- ---------------
-- `029_spapi_tenant_scope.sql` creates `spapi_access_audit` as an APPEND-ONLY log, and
-- deliberately grants no DELETE to anyone. A log nobody can delete is a log that grows
-- forever, which is its own compliance problem: the Data Protection Policy requires
-- personal data to be kept only as long as it is needed. So the deletion path lives
-- HERE, in one function that runs as the table owner, is scheduled by pg_cron, and is
-- reachable by NOBODY else (no EXECUTE grant to anon/authenticated, and no delete policy).
--
-- THE RULE
--   · rows older than RETENTION_DAYS are deleted daily — 90 days by default;
--   · the constant is declared ONCE here (`90`) and mirrored ONCE in TypeScript
--     (`SPAPI_AUDIT_RETENTION_DAYS` in `supabase/functions/_shared/tenantScope.ts`);
--     `scripts/validate-audit-retention.mjs` FAILS if the two ever disagree;
--   · a malformed retention value raises, so the job can never be argued down to
--     "delete everything" by an accidental 0 or a null.
--
-- NOTE (honest): like 025, this migration has not been executed against a live database
-- in this environment (no Supabase credentials are configured here). It is verified
-- statically by the gate named above.

create extension if not exists pg_cron;

create or replace function public.purge_spapi_access_audit(retention_days integer default 90)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  if retention_days is null or retention_days < 1 then
    raise exception 'purge_spapi_access_audit: retention_days must be >= 1 (got %)', retention_days;
  end if;

  delete from spapi_access_audit
   where at < now() - make_interval(days => retention_days);

  get diagnostics removed = row_count;
  return removed;
end;
$$;

comment on function public.purge_spapi_access_audit(integer) is
  'Deletes SP-API access-audit rows older than retention_days (default 90). Scheduled daily by pg_cron; callable by no end-user role.';

-- Nobody but the owner may run it: not anon, not authenticated, not a brand session.
revoke all on function public.purge_spapi_access_audit(integer) from public;
revoke all on function public.purge_spapi_access_audit(integer) from anon;
revoke all on function public.purge_spapi_access_audit(integer) from authenticated;

-- Idempotent scheduling: re-applying the migration must not create a second job.
do $$
begin
  perform cron.unschedule('spapi_audit_retention_daily');
exception
  when others then null;
end;
$$;

select cron.schedule(
  'spapi_audit_retention_daily',
  '17 3 * * *',
  $$select public.purge_spapi_access_audit(90)$$
);