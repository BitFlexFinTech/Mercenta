/**
 * §7 Stage-7 static RLS audit — runs TODAY, no database required.
 *
 * Parses the migration SQL and verifies:
 *   1. every brand-scoped table has `enable row level security`;
 *   2. every brand-scoped table has at least one owner-scoped policy
 *      (or is on the documented deny-all allowlist);
 *   3. no table that holds brand data is left without RLS.
 *
 * The RUNTIME cross-brand query test lives in rls-cross-brand-test.mjs and
 * executes against a live project once Supabase credentials are configured.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const migrationsDir = new URL('../supabase/migrations/', import.meta.url).pathname;
const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
const sql = files.map((f) => readFileSync(join(migrationsDir, f), 'utf8')).join('\n');

/** Tables holding per-brand rows — must be RLS + owner-policy covered. */
const BRAND_SCOPED = [
  'brands', 'products', 'purchase_orders', 'shipments', 'contracts',
  'compliance_documents', 'messages', 'subscriptions', 'commissions',
  'fulfillment_scores', 'ad_spend_budgets', 'shipping_margins', 'audit_log',
];

/** Staff-sourced tables where deny-by-default (RLS on, zero policies) is correct. */
const DENY_ALL_OK = ['leads', 'integration_connections'];

let failures = 0;
function check(name, ok) {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failures++;
}

for (const t of BRAND_SCOPED) {
  const rlsOn = sql.match(new RegExp(`alter table public\\.${t} enable row level security`));
  check(`${t}: RLS enabled`, !!rlsOn);

  const policies = [...sql.matchAll(new RegExp(`create\\s+policy\\s+"[^"]+"\\s+on\\s+public\\.${t}\\b([\\s\\S]*?);`, 'g'))];
  const ownerScoped = policies.some(([, body]) => body.includes('auth.uid()'));
  check(`${t}: has owner-scoped policy`, ownerScoped);
}

for (const t of DENY_ALL_OK) {
  const rlsOn = sql.match(new RegExp(`alter table public\\.${t} enable row level security`));
  const policies = [...sql.matchAll(new RegExp(`create\\s+policy\\s+"[^"]+"\\s+on\\s+public\\.${t}\\b`, 'g'))];
  check(`${t}: RLS enabled, deny-all documented`, !!rlsOn && policies.length === 0);
}

// No policy may grant blanket access to all rows.
const loose = /create policy "[^"]+"[\s\S]*?for (select|all)[\s\S]*?using \(\s*true\s*\)/.test(sql);
check('no using(true) blanket policies', !loose);

console.log(failures === 0 ? 'RLS_STATIC_AUDIT_PASS' : `RLS_STATIC_AUDIT_FAIL (${failures})`);
process.exit(failures === 0 ? 0 : 1);
