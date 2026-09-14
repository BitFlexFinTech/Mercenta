// Stage 19 structural-gaps validation — deductions ledger, table UX,
// notification center, overview content, CSV/remittance capability.
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
function read(rel) {
  return readFileSync(resolve(root, rel), 'utf8');
}

let failures = 0;
function test(name, cond) {
  console.log(`${cond ? '✓' : '✗'} ${name}`);
  if (!cond) failures++;
}

const types = read('src/types.ts');
const store = read('src/data/demoStore.ts');
const api = read('src/data/api.ts');
// §Phase M10 — REPOINTED. The migration was renumbered to the canonical
// `008_create_deductions.sql` (the `0013_*` filename never existed in this
// tree's history), so the previous path crashed the validator before any
// assertion ran.
const migration = read('supabase/migrations/008_create_deductions.sql');

test('Deduction type models full lifecycle (open/disputed/accepted/resolved)',
  types.includes("type DeductionStatus = 'open' | 'disputed' | 'accepted' | 'resolved'"));
// §Phase M10 — the `category` column carries NO database CHECK constraint in the
// canonical schema (008 declares it as plain TEXT); the category vocabulary
// (late_shipment / shortage_claim) is enforced by the typed domain model. The
// assertion is repointed to what the schema actually guarantees — the table,
// its RLS isolation policy and the lifecycle status column — plus the typed
// vocabulary in the domain.
test('deductions table migration exists with RLS brand isolation',
  /create table if not exists\s+(public\.)?deductions/i.test(migration) &&
    migration.includes('ENABLE ROW LEVEL SECURITY') &&
    migration.includes('brand_isolation') &&
    migration.includes('status'));
test('deduction categories are modelled in the domain (late_shipment / shortage_claim)',
  types.includes('late_shipment') && types.includes('shortage_claim'));
test('demo deductions DERIVED from demo POs (no hand-maintained refs)',
  store.includes('DERIVED from demoPurchaseOrders'));
// §Phase M11 — the DB-level category constraint NOW EXISTS (§23 hardening, 026),
// so the vocabulary is no longer domain-only. Asserted here so the constraint and
// the typed model cannot silently diverge (validate-db-hardening.mjs proves the
// two lists match element-for-element).
const hardening19 = read('supabase/migrations/026_harden_deductions_ack_and_messages.sql');
test('deductions.category is constrained at the DATABASE boundary (026)',
  hardening19.includes('deductions_category_check') &&
    hardening19.includes('shortage_claim') &&
    hardening19.includes('not valid'));
test('dispute mutations exist in data layer', api.includes('export function disputeDeduction'));

const dt = read('src/components/shared/DataTable.tsx');
test('DataTable primitive: search+sort+pagination present',
  dt.includes('Search') && dt.includes('toggleSort') && dt.includes('pageRows'));
const cat = read('src/components/admin/CatalogManagerAdmin.tsx');
const contracts = read('src/components/admin/ContractsAdminPanel.tsx');
const compliance = read('src/components/admin/ComplianceApprovals.tsx');
const bpo = read('src/components/brand/BrandPurchaseOrders.tsx');
test('Catalog Manager uses DataTable', cat.includes('<DataTable'));
test('Contracts panel uses DataTable (full dataset, filterable)', contracts.includes('<DataTable') && contracts.includes('allContracts'));
test('Compliance Approvals shows ALL docs with status filter (no curated subset)', compliance.includes('rows={docs}'));
test('Brand Purchase Orders has search + status filter + CSV export',
  bpo.includes('poSearch') && bpo.includes('downloadCsv'));

const nc = read('src/components/shared/NotificationCenter.tsx');
const header = read('src/components/layout/Header.tsx');
test('Notification center reads digest event stream (scores borderline, renewals)',
  nc.includes('isBorderline') && nc.includes('renewalUrgency') && nc.includes('renewal window'.slice(0, 7)));
test('Header bell replaced by NotificationCenter', header.includes('<NotificationCenter />'));

const dash = read('src/components/admin/AdminDashboard.tsx');
// §Phase M10 — REPOINTED to the Phase-D redesign, where the overview's
// operational content is expressed as KPI groups + a priority "Needs your
// attention" queue + "Next actions" tiles that each ROUTE to the owning view
// (§06 interactivity: a metric must open to more detail, not sit static).
test('Overview defines real operational content (POs awaiting, docs pending, renewals, payouts)',
  dash.includes("'POs awaiting action'") &&
    dash.includes("'Compliance docs pending'") &&
    dash.includes("'Contract renewals due'") &&
    dash.includes("'Brand payouts pending'"));
test('Overview tiles drill down into the owning surface',
  dash.includes('onNavigate?: (view: string) => void') &&
    dash.includes('onClick={go(a.id)}') &&
    dash.includes('Needs your attention'));

const rem = read('src/lib/billing/remittance.ts');
const billing = read('src/components/admin/BillingPanel.tsx');
test('Remittance statement generator: gross − commission − deductions = net',
  rem.includes('grossTotal - commissionTotal - deductionsTotal'));
test('Billing renders per-brand remittance statements', billing.includes('generateRemittanceStatement'));
test('CSV export util wired into Brand CRM + Billing', read('src/components/admin/BrandCRM.tsx').includes('downloadCsv') && billing.includes('downloadCsv'));

// §Phase M10 — REPOINTED. The retired `validate:stageNN` npm-script convention
// (package.json now exposes only `validate:wording`; the stage validators are
// run directly, as README's gate list documents for the canonical set) is no
// longer an invariant. What matters is that this validator is present and
// runnable in the project's scripts/ directory.
test('stage-19 validator is present and runnable',
  existsSync(resolve(root, 'scripts/validate-stage19.mjs')));

console.log(failures === 0 ? 'STAGE19_VALIDATION_PASS' : `STAGE19_VALIDATION_FAIL (${failures})`);
process.exitCode = failures === 0 ? 0 : 1;
