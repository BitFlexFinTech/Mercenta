/**
 * §7 Stage-7 static RLS audit — runs TODAY, no database required.
 *
 * §Phase M13 — REPOINTED. The audit previously checked a HARDCODED list of table
 * names. That list had drifted from the schema it claims to audit, and its policy
 * test demanded `auth.uid()` — which this schema does not use. Result: 23 reported
 * "failures", almost all FALSE NEGATIVES, with a genuine gap (audit_log had no RLS
 * at all) hidden inside the noise.
 *
 * What was actually true (established by reading the migrations, 2026-09-14):
 *   • the canonical tenancy predicate in EVERY migration is
 *     `(auth.jwt() ->> 'tenant_id')::uuid` (+ `auth.jwt() ->> 'role'` for staff),
 *     NOT `auth.uid()` — so the old check could never pass;
 *   • `shipping_margins`, `subscriptions`, `commissions`, `fulfillment_scores`,
 *     `ad_spend_budgets`, `leads`, `integration_connections` DO NOT EXIST anywhere
 *     in the migration history (grep → 0 hits) — there is no table, so there was no
 *     RLS gap to report; the names were stale;
 *   • `compliance_documents` is really `compliance_docs`;
 *   • `audit_log` genuinely had NO RLS (migration 015) — fixed by migration 027.
 *
 * The repointed audit keeps its ORIGINAL INVARIANTS and strengthens them: it now
 * derives the table list from the migrations themselves (single source of truth),
 * so it cannot silently drift again, and it audits EVERY table rather than 13
 * hand-picked names:
 *
 *   1. every table in the schema has `enable row level security`;
 *   2. every RLS-on table has ≥1 policy, or is on the documented deny-all list
 *      (an RLS-on table with no policy is a silent deny-all);
 *   3. every brand-scoped table has an owner-scoped policy using the CANONICAL
 *      tenancy predicate;
 *   4. no blanket `using (true)` policy except the documented public-content table;
 *   5. the audit ledger is append-only (no update/delete policy).
 *
 * The RUNTIME cross-brand query test lives in rls-cross-brand-test.mjs and
 * executes against a live project once Supabase credentials are configured.
 */
// §M12 — resolve filesystem paths with fileURLToPath: a project folder whose name
// contains a space (e.g. `1. Mercenta`) is percent-encoded by `URL.pathname`, which
// silently broke this walk (ENOENT on `1.%20Mercenta`).
import { fileURLToPath } from 'node:url';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const migrationsDir = fileURLToPath(new URL('../supabase/migrations/', import.meta.url));
const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
const sql = files.map((f) => readFileSync(join(migrationsDir, f), 'utf8')).join('\n');

/** Strip SQL comments so a commented-out example can never satisfy a check. */
const code = sql.replace(/--[^\n]*/g, '');

/** Every table the schema actually creates — the single source of truth. */
const TABLES = [
  ...code.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z_][a-z0-9_]*)/gi),
].map((m) => m[1].toLowerCase());
const TABLE_SET = new Set(TABLES);

/** Tables with RLS switched on. */
const RLS_ON = new Set(
  [...code.matchAll(/alter\s+table\s+(?:public\.)?([a-z_][a-z0-9_]*)\s+enable\s+row\s+level\s+security/gi)].map(
    (m) => m[1].toLowerCase()
  )
);

/** Every declared policy, with the table it guards and its body. */
const POLICIES = [
  ...code.matchAll(/create\s+policy\s+"([^"]+)"\s+on\s+(?:public\.)?([a-z_][a-z0-9_]*)([\s\S]*?);/gi),
].map((m) => ({
  name: m[1],
  table: m[2].toLowerCase(),
  body: m[3],
  isSelect: /for\s+select/i.test(m[3]),
}));
const policiesFor = (t) => POLICIES.filter((p) => p.table === t);

/**
 * The canonical tenancy predicates. `tenant_id` is what every migration uses;
 * `auth.uid()` is accepted ONLY as a documented alternative, so a future table
 * that legitimately scopes by auth user id is not a false failure.
 */
const TENANCY_PREDICATES = [/auth\.jwt\(\)\s*->>\s*'tenant_id'/, /auth\.uid\(\)/];
const isOwnerScoped = (body) => TENANCY_PREDICATES.some((re) => re.test(body));

/** A brand-scoped table is one whose policies scope by a tenant/brand/partner key. */
const BRAND_KEYS = /\b(tenant_id|brand_id|partner_id)\b/;

/** Tables intentionally LEFT WITHOUT RLS. Empty, and asserted to stay empty. */
const NO_RLS_OK = new Set([]);

/**
 * Tables intentionally RLS-on with ZERO policies (deny-by-default, service-role
 * reachable only). Naming one here is an explicit decision, never an accident.
 */
const DENY_ALL_OK = new Set([]);

/**
 * The ONE documented blanket-read policy: `homepage_content` is public marketing
 * copy an anonymous visitor must render. It holds no brand data, which is why it is
 * an explicit exception rather than a violation.
 */
const PUBLIC_CONTENT_OK = new Set(['homepage_content']);

let failures = 0;
let checks = 0;
function check(name, ok) {
  checks++;
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failures++;
}

/* ── 1. every table is RLS-protected (or explicitly excused) ─────────────── */
for (const t of TABLE_SET) {
  check(`${t}: RLS enabled`, RLS_ON.has(t) || NO_RLS_OK.has(t));
}

/* ── 2. every RLS-on table has a policy, or is a documented deny-all ─────── */
for (const t of RLS_ON) {
  check(`${t}: RLS-on table has ≥1 policy (or documented deny-all)`,
    policiesFor(t).length > 0 || DENY_ALL_OK.has(t));
}

/* ── 3. brand-scoped tables are owner-scoped by the canonical predicate ──── */
const brandScoped = [...RLS_ON].filter((t) => policiesFor(t).some((p) => BRAND_KEYS.test(p.body)));
for (const t of brandScoped) {
  check(`${t}: has owner-scoped policy (canonical tenancy predicate)`,
    policiesFor(t).some((p) => isOwnerScoped(p.body)));
}

/* ── 4. no blanket using(true) policy outside the public-content table ───── */
for (const p of POLICIES) {
  if (!/using\s*\(\s*true\s*\)/i.test(p.body)) continue;
  check(`${p.name} (${p.table}): blanket using(true) is a documented public-content policy`,
    PUBLIC_CONTENT_OK.has(p.table) && p.isSelect);
}

/* ── 5. the audit ledger is append-only ──────────────────────────────────── */
const auditPolicies = policiesFor('audit_log');
check('audit_log: RLS enabled', RLS_ON.has('audit_log'));
check('audit_log: staff-only read (no blanket read)',
  auditPolicies.some((p) => p.isSelect && /auth\.jwt\(\)\s*->>\s*'role'/.test(p.body)));
check('audit_log: no update policy (history is never destroyed)',
  !auditPolicies.some((p) => /for\s+update/i.test(p.body)));
check('audit_log: no delete policy (history is never destroyed)',
  !auditPolicies.some((p) => /for\s+delete/i.test(p.body)));

console.log(
  `\nAudited ${TABLE_SET.size} tables · ${RLS_ON.size} RLS-enabled · ${POLICIES.length} policies · ${checks} checks`
);
console.log(failures === 0 ? 'RLS_STATIC_AUDIT_PASS' : `RLS_STATIC_AUDIT_FAIL (${failures})`);
process.exit(failures === 0 ? 0 : 1);
