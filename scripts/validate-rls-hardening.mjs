/**
 * §39 / Phase M13 — RLS HARDENING validator.
 *
 * Proves the two genuine findings M13 resolved are ACTUALLY fixed in the canonical
 * migration history, so the hardening cannot silently regress:
 *
 *   1. `audit_log` (created WITHOUT RLS by migration 015) now has RLS, a
 *      staff-only SELECT policy, an authenticated append-only INSERT policy, and
 *      NO update/delete policy at all (audit history is never destroyed);
 *   2. `applications` (created WITHOUT RLS by migration 018) now has RLS, a public
 *      INSERT that can only create `pending` rows (so a submitter cannot approve
 *      itself), and staff-only SELECT/UPDATE.
 *
 * It also pins the real, evidenced conclusion behind the repoint of
 * `rls-audit.mjs`: the "missing RLS" table names the old hardcoded audit reported
 * (`shipping_margins`, `subscriptions`, `commissions`, `fulfillment_scores`,
 * `ad_spend_budgets`, `leads`) DO NOT EXIST in the schema — they were stale names,
 * not unprotected tables.
 *
 * §BATCH1b (2026-09-28) — `integration_connections` WAS one of those stale names,
 * and Batch 1b has now CREATED it for real (migration 028, the connect wizard's
 * connection-record table), so it is pinned BELOW as a genuine RLS-protected table
 * instead of being listed as absent.
 *
 * The general per-table invariant (EVERY schema table is RLS-protected) is audited
 * by `scripts/rls-audit.mjs`; this validator is the focused, regression-proof pin.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../supabase/migrations/', import.meta.url));
const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
const read = (f) => readFileSync(join(dir, f), 'utf8');
const all = files.map(read).join('\n');
const code = all.replace(/--[^\n]*/g, '');

let failures = 0;
let checks = 0;
const test = (name, ok, detail = '') => {
  checks++;
  console.log(`${ok ? '✓' : '✗'} ${name}${!ok && detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

/* ── The hardening migration exists and is sequential ─────────────────────── */
const HARDENING = '027_harden_audit_log_rls.sql';
/**
 * §BATCH1b — REPOINTED (not weakened).
 * OLD CONTRACT: 027 was asserted to be the NEWEST file in the history. That was
 * true when M13 wrote this validator, but Batch 1b legitimately added
 * `028_create_integration_connections.sql` (the connection-record schema the
 * connect wizard needs), so the newest file moved. The INTENT — "the M13
 * hardening is still present and its invariants still hold" — is unchanged, and
 * the invariants themselves are asserted individually below. What must never
 * happen is 027 disappearing or its hardening being undone.
 * The M13 hardening migration (027) is present in the sequential history.
 */
test('the M13 hardening migration (027) is present in the sequential history',
  files.some((f) => f.startsWith('027_')), files.at(-1));
const sql = read(HARDENING);

/* ── 1. audit_log ─────────────────────────────────────────────────────────── */
const policies = [...code.matchAll(/create\s+policy\s+"([^"]+)"\s+on\s+(?:public\.)?(\w+)([\s\S]*?);/gi)]
  .map((m) => ({ name: m[1], table: m[2].toLowerCase(), body: m[3] }));
const forTable = (t) => policies.filter((p) => p.table === t);

test('audit_log: RLS is enabled',
  /alter\s+table\s+(?:public\.)?audit_log\s+enable\s+row\s+level\s+security/i.test(sql));
test('audit_log: a SELECT policy exists and is staff-scoped',
  forTable('audit_log').some((p) =>
    /for\s+select/i.test(p.body) && /auth\.jwt\(\)\s*->>\s*'role'/.test(p.body)));
test('audit_log: SELECT is NOT blanket-open',
  !forTable('audit_log').some((p) => /for\s+select/i.test(p.body) && /using\s*\(\s*true\s*\)/i.test(p.body)));
test('audit_log: an authenticated append-only INSERT policy exists',
  forTable('audit_log').some((p) =>
    /for\s+insert/i.test(p.body) && /auth\.role\(\)\s*=\s*'authenticated'/.test(p.body)));
test('audit_log: NO update policy anywhere (history cannot be rewritten)',
  !forTable('audit_log').some((p) => /for\s+update/i.test(p.body)));
test('audit_log: NO delete policy anywhere (history cannot be destroyed)',
  !forTable('audit_log').some((p) => /for\s+delete/i.test(p.body)));
test('audit_log: the columns the client insert paths actually write now exist',
  /add\s+column\s+if\s+not\s+exists\s+brand_id/i.test(sql) &&
    /add\s+column\s+if\s+not\s+exists\s+reason/i.test(sql) &&
    /add\s+column\s+if\s+not\s+exists\s+metadata/i.test(sql));

/* ── 2. applications ──────────────────────────────────────────────────────── */
test('applications: RLS is enabled',
  /alter\s+table\s+(?:public\.)?applications\s+enable\s+row\s+level\s+security/i.test(sql));
const appPolicies = forTable('applications');
test('applications: public INSERT is permitted for the unauthenticated apply form',
  appPolicies.some((p) => /for\s+insert/i.test(p.body) && /to\s+anon/i.test(p.body)));
test('applications: a public INSERT can only create a PENDING row (no self-approval)',
  appPolicies.some((p) => /for\s+insert/i.test(p.body) && /with\s+check\s*\(\s*status\s*=\s*'pending'\s*\)/i.test(p.body)));
test('applications: SELECT and UPDATE are staff-only',
  appPolicies.some((p) => /for\s+select/i.test(p.body) && /auth\.jwt\(\)\s*->>\s*'role'/.test(p.body)) &&
    appPolicies.some((p) => /for\s+update/i.test(p.body) && /auth\.jwt\(\)\s*->>\s*'role'/.test(p.body)));
test('applications: NO delete policy (an application is a retained record)',
  !appPolicies.some((p) => /for\s+delete/i.test(p.body)));

/* ── 3. the stale-name conclusion is pinned ──────────────────────────────── */
/**
 * §BATCH1b — REPOINTED (not weakened).
 * OLD CONTRACT: `integration_connections` was pinned as a GHOST — a name the old
 * hardcoded audit reported as "missing RLS" that did not exist in the schema at
 * all. Batch 1b has now CREATED it (migration 028, the connect wizard's
 * connection-record table), so it is no longer a ghost. It is removed from the
 * ghost list and — so the change makes this validator STRONGER, never weaker — it
 * is pinned as a real table that MUST have RLS enabled and staff-scoped policies
 * with NO delete policy. The remaining ghosts are still asserted absent.
 */
const GHOSTS = ['shipping_margins', 'subscriptions', 'commissions', 'fulfillment_scores',
  'ad_spend_budgets', 'leads'];
const created = new Set(
  [...code.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z_][a-z0-9_]*)/gi)]
    .map((m) => m[1].toLowerCase()));
const ghostsPresent = GHOSTS.filter((t) => created.has(t));
test('the old audit\'s "missing RLS" names are genuinely absent from the schema',
  ghostsPresent.length === 0, ghostsPresent.join(', '));

/* ── 3b. §BATCH1b — the created connection table is RLS-protected ────────── */
test('integration_connections: created by migration 028 and RLS is enabled',
  created.has('integration_connections') &&
    /alter\s+table\s+(?:public\.)?integration_connections\s+enable\s+row\s+level\s+security/i.test(all));
const connPolicies = policies.filter((p) => p.table === 'integration_connections');
test('integration_connections: every policy is staff-scoped (never blanket-open)',
  connPolicies.length > 0 &&
    connPolicies.every((p) =>
      /auth\.jwt\(\)\s*->>\s*'role'/.test(p.body) && !/using\s*\(\s*true\s*\)/i.test(p.body)));
test('integration_connections: NO delete policy (a connection record is retained)',
  !connPolicies.some((p) => /for\s+delete/i.test(p.body)));
test('integration_connections: a LIVE row must hold a `vault:` reference (plaintext is impossible)',
  /secret_ref\s+text\s+check\s*\(\s*secret_ref\s+is\s+null\s+or\s+secret_ref\s+like\s+'vault:%'/i.test(all) &&
    /check\s*\(\s*sandbox\s+or\s+secret_ref\s+is\s+not\s+null\s*\)/i.test(all));

/* ── 4. the tenancy predicate is the canonical one ───────────────────────── */
test('the hardening uses the canonical `auth.jwt() ->> \'role\'` staff predicate',
  /auth\.jwt\(\)\s*->>\s*'role'/.test(sql));
test('the hardening introduces no blanket `using (true)` policy',
  !/using\s*\(\s*true\s*\)/i.test(sql));

console.log(`\nRLS_HARDENING_${failures === 0 ? 'PASS' : `FAIL (${failures}/${checks})`}`);
process.exit(failures === 0 ? 0 : 1);
