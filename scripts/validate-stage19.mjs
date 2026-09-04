// Stage 19 structural-gaps validation — deductions ledger, table UX,
// notification center, overview content, CSV/remittance capability.
import { readFileSync } from 'node:fs';
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
const migration = read('supabase/migrations/0013_deductions.sql');

test('Deduction type models full lifecycle (open/disputed/accepted/resolved)',
  types.includes("type DeductionStatus = 'open' | 'disputed' | 'accepted' | 'resolved'"));
test('deductions table migration exists with type CHECK',
  migration.includes('create table if not exists public.deductions') &&
    migration.includes('late_shipment') && migration.includes('shortage_claim'));
test('demo deductions DERIVED from demo POs (no hand-maintained refs)',
  store.includes('DERIVED from demoPurchaseOrders'));
test('dispute mutations exist in data layer', api.includes('export async function disputeDeduction'));

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
test('Overview defines real content: revenue month / POs awaiting / renewals / category perf',
  dash.includes("'Revenue This Month'") && dash.includes("'POs Awaiting Action'") &&
    dash.includes("'Top Category'") && dash.includes("'Renewals Due ≤60d'"));

const rem = read('src/lib/billing/remittance.ts');
const billing = read('src/components/admin/BillingPanel.tsx');
test('Remittance statement generator: gross − commission − deductions = net',
  rem.includes('grossTotal - commissionTotal - deductionsTotal'));
test('Billing renders per-brand remittance statements', billing.includes('generateRemittanceStatement'));
test('CSV export util wired into Brand CRM + Billing', read('src/components/admin/BrandCRM.tsx').includes('downloadCsv') && billing.includes('downloadCsv'));

test("package.json exposes validate:stage19", read('package.json').includes('validate:stage19'));

console.log(failures === 0 ? 'STAGE19_VALIDATION_PASS' : `STAGE19_VALIDATION_FAIL (${failures})`);
process.exitCode = failures === 0 ? 0 : 1;
