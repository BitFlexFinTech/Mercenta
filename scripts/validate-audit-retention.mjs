#!/usr/bin/env node
/**
 * §PHASE 3 / ITEM 3 — THE RETENTION GATE.
 *
 * A retention policy that exists only in prose is not a policy. This gate fails the
 * build when:
 *   1. no purge path exists at all (no function, no schedule);
 *   2. the purge function is not SECURITY DEFINER (it would be blocked by the table's
 *      own RLS and silently delete nothing);
 *   3. the schedule does not name the purge function;
 *   4. the SQL retention default and the TypeScript constant DISAGREE (they are the
 *      same number stated twice — drift is the defect this catches);
 *   5. the function is executable by anon or authenticated (a brand could delete its
 *      own audit trail — the exact opposite of the requirement);
 *   6. the function does not actually delete by age.
 *
 * §REPOINTED 2026-11-28 — §PHASE 3 created this gate; it is wired into `validate:all`
 * by the validator runner's own glob (no hand-maintained list).
 */
import { readFileSync, existsSync } from 'node:fs';

const MIGRATION = 'supabase/migrations/030_spapi_audit_retention.sql';
const MODULE = 'supabase/functions/_shared/tenantScope.ts';

let pass = 0;
const failures = [];
const test = (name, ok, detail = '') => {
  if (ok) {
    pass++;
    console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    failures.push(name);
    console.log(`✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

test('A1 the retention migration exists', existsSync(MIGRATION), MIGRATION);
if (!existsSync(MIGRATION)) {
  console.log(`\nAUDIT_RETENTION_VALIDATION_FAIL — ${failures.length} failure(s)`);
  process.exit(1);
}

const sql = readFileSync(MIGRATION, 'utf8');
const ts = existsSync(MODULE) ? readFileSync(MODULE, 'utf8') : '';

test('A2 a purge function exists', /create or replace function public\.purge_spapi_access_audit/i.test(sql));
test('A3 the purge is SECURITY DEFINER', /security definer/i.test(sql));
test('A4 the purge deletes by AGE, not by any other rule', /delete from spapi_access_audit[\s\S]{0,120}at < now\(\) - make_interval\(days => retention_days\)/i.test(sql));
test('A5 a malformed retention value RAISES (cannot become "delete everything")', /retention_days is null or retention_days < 1/i.test(sql));
test('A6 pg_cron schedules the purge', /cron\.schedule\(\s*'spapi_audit_retention_daily'[\s\S]{0,200}purge_spapi_access_audit/i.test(sql));
test('A7 the schedule is idempotent (unschedule guard present)', /cron\.unschedule\('spapi_audit_retention_daily'\)/i.test(sql));
test('A8 anon cannot execute the purge', /revoke all on function public\.purge_spapi_access_audit\(integer\) from anon;/i.test(sql));
test('A9 authenticated (a brand session) cannot execute the purge', /revoke all on function public\.purge_spapi_access_audit\(integer\) from authenticated;/i.test(sql));

const sqlDefault = sql.match(/purge_spapi_access_audit\(retention_days integer default (\d+)\)/i)?.[1] ?? '';
const scheduled = sql.match(/purge_spapi_access_audit\((\d+)\)\$\$/)?.[1] ?? '';
const tsConstant = ts.match(/SPAPI_AUDIT_RETENTION_DAYS\s*=\s*(\d+)/)?.[1] ?? '';

test('B1 the SQL default retention is a positive number of days', Number(sqlDefault) >= 1, `default=${sqlDefault || 'MISSING'}`);
test('B2 the scheduled call passes the SAME number as the default', sqlDefault !== '' && sqlDefault === scheduled, `default=${sqlDefault} scheduled=${scheduled}`);
test('B3 the TypeScript constant AGREES with the SQL default (one number, stated twice)', sqlDefault !== '' && tsConstant === sqlDefault, `sql=${sqlDefault} ts=${tsConstant || 'MISSING'}`);

/* The gate must be able to FAIL: prove the matcher rejects a broken copy. */
const broken = sql.replace(/delete from spapi_access_audit[\s\S]{0,120}at < now\(\)/i, 'delete from spapi_access_audit where true');
test('C1 self-check: the age rule matcher REJECTS a purge that deletes everything',
  !/delete from spapi_access_audit[\s\S]{0,120}at < now\(\) - make_interval\(days => retention_days\)/i.test(broken));

console.log(
  failures.length === 0
    ? `\nAUDIT_RETENTION_VALIDATION_PASS — a bounded, scheduled, owner-only purge path exists. (${pass} assertions)`
    : `\nAUDIT_RETENTION_VALIDATION_FAIL — ${failures.length} of ${pass + failures.length} assertions failed: ${failures.join(', ')}`
);
process.exit(failures.length === 0 ? 0 : 1);