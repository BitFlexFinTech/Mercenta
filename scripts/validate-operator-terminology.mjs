// §OPERATOR-RELABEL — THE NON-CANONICAL ROLE NAME GATE.
//
// WHY THIS EXISTS
// ---------------
// Founder decision T-3 (docs/AMAZON_RECONCILIATION_STATUS.md) is explicit: the
// canonical human control role is **Founder / Super Admin**, NOT "Mercenta
// Operator". The phrase "Mercenta operator" had leaked into application code as a
// human review/approval role (16 occurrences in `src/`, 1 in an Edge Function),
// contradicting T-3 and inventing a role the type system does not contain
// (`SessionRole`/`StaffRole` are Brand Partner · Mercenta Admin · Super Admin).
// Matrix row D13-14 recorded it as OPEN — RELABEL.
//
// This gate makes the relabel permanent and mechanical:
//   1. NO file under `src/` or `supabase/functions/` may use the non-canonical
//      role name ("Mercenta operator", any case) — the affirmative use that
//      contradicts T-3. (Negative quotations of the term in decision records and
//      historical reconcile scripts live OUTSIDE this scope, by design.)
//   2. Every file that had carried the non-canonical term must carry the canonical
//      "Founder / Super Admin" instead — so a silent deletion cannot pass.
//   3. The canonical role still exists in the type system (Super Admin).
//   4. The RECORDS are no longer stale: matrix D13-14 is DONE and the registry row
//      is no longer `not_started`.
//
// A revert to the old wording, a rename to some THIRD invented role, or a stale
// "OPEN" record FAILS this gate.
import { readFileSync, readdirSync, statSync } from 'node:fs';

let failures = 0;
let checks = 0;
const test = (name, ok, detail) => {
  checks++;
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) {
    failures++;
    if (detail !== undefined) console.log(`      ${String(detail).slice(0, 600)}`);
  }
};

const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');

/** Recursively collect code files under a directory (relative to the project root). */
function walk(dir) {
  const out = [];
  for (const name of readdirSync(new URL(dir, ROOT))) {
    const rel = `${dir}${name}`;
    if (statSync(new URL(rel, ROOT)).isDirectory()) out.push(...walk(`${rel}/`));
    else if (/\.(ts|tsx|mjs|cjs|js|jsx)$/.test(name)) out.push(rel);
  }
  return out;
}

/* ── 1. the non-canonical role name is gone from application code ──────────── */
const BANNED = /mercenta\s+operator/i;
const codeFiles = [...walk('src/'), ...walk('supabase/functions/')];
test('the application code tree was actually walked (fails closed on an empty scan)',
  codeFiles.length > 100, `${codeFiles.length} files`);

const offenders = [];
for (const f of codeFiles) {
  read(f).split('\n').forEach((line, i) => {
    if (BANNED.test(line)) offenders.push(`${f}:${i + 1}`);
  });
}
test('NO application file uses the non-canonical role name "Mercenta operator" (T-3)',
  offenders.length === 0, offenders.join(', '));

/* ── 2. every relabelled file carries the canonical role name ──────────────── */
const RELABELLED = [
  'src/integrations/registry.ts',
  'src/components/admin/LogisticsControl.tsx',
  'src/components/admin/AccountingPanel.tsx',
  'src/components/admin/ComplianceApprovals.tsx',
  'src/lib/commerce/channelPurchaseOrderIngestion.ts',
  'src/lib/simulation/investorDemo.ts',
  'src/lib/verification/documentVerification.ts',
  'src/lib/finance/financialReconciliation.ts',
  'src/data/api.ts',
  'supabase/functions/payouts-transfer/index.ts',
];
const CANONICAL = 'Founder / Super Admin';
const missingCanonical = RELABELLED.filter((f) => !read(f).includes(CANONICAL));
test(`every relabelled file names the canonical role "${CANONICAL}"`,
  missingCanonical.length === 0, missingCanonical.join(', '));

/* ── 3. the canonical role still exists in the type system ─────────────────── */
const types = read('src/types.ts');
const sessionRoleBlock = types.slice(types.indexOf('export type SessionRole'), types.indexOf('export type AdminDepartment'));
const staffRoleBlock = types.slice(types.indexOf('export type StaffRole'), types.indexOf('export interface StaffMember'));
test('SessionRole still declares the canonical Super Admin role',
  sessionRoleBlock.includes("'Super Admin'"));
test('StaffRole still declares the canonical Super Admin role',
  staffRoleBlock.includes("'Super Admin'"));

/* ── 4. the records are no longer stale ────────────────────────────────────── */
const matrix = read('docs/MERCENTA_MASTER_FEATURE_FUNCTION_MATRIX.md');
const d1314Row = matrix.split('\n').find((l) => l.includes('D13-14'));
test('matrix D13-14 is marked DONE — RELABELLED, not OPEN — RELABEL',
  d1314Row !== undefined && d1314Row.includes('DONE — RELABELLED'),
  d1314Row);
test('the D13-14 row no longer claims the wording is still open',
  d1314Row !== undefined && !d1314Row.includes('OPEN — RELABEL'));

const registry = JSON.parse(read('requirements-registry.json'));
const row = registry.entries.find((e) => e.id === 's0-discovered-operator-terminology-reconciliation');
test('the registry row s0-discovered-operator-terminology-reconciliation exists',
  row !== undefined);
test('the registry row is no longer `not_started`',
  row !== undefined && row.status !== 'not_started', row && row.status);
test('the registry row records the OLD status inline (never silently overwritten)',
  row !== undefined && /not_started/.test(row._audit_note ?? ''));

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures) {
  console.error(`\n${failures} FAILED`);
  process.exit(1);
}
console.log('OPERATOR_TERMINOLOGY_VALIDATION_PASS');
process.exit(0);
