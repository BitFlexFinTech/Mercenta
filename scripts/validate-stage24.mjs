// Stage 24 validation — research-verified Vendor Central criteria.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const read = (rel) => readFileSync(resolve(root, rel), 'utf8');

let failures = 0;
const test = (name, cond) => {
  console.log(`${cond ? '✓' : '✗'} ${name}`);
  if (!cond) failures++;
};

const types = read('src/types.ts');
const api = read('src/data/api.ts');
const bpo = read('src/components/brand/BrandPurchaseOrders.tsx');
const catalog = read('src/components/brand/ProductCatalog.tsx');
// §Phase M10 — REPOINTED. The `0014_vc_ack_asn_fields.sql` filename never
// existed in this tree's history (it crashed the validator before any assertion
// ran). The acknowledgement fields live in the canonical
// `005_create_purchase_order_lines.sql` (acknowledged_qty / status / reason_code
// / scheduled_ship_date).
const migration = read('supabase/migrations/005_create_purchase_order_lines.sql');
const comm = read('src/components/shared/BrandComm.tsx');

// PO acknowledgment
test('line-item ack model: Accepted / Rejected / Backordered',
  types.includes("'accepted' | 'rejected' | 'backordered'"));
test('real rejection reason codes (not free text only)',
  types.includes('TemporarilyUnavailable') && types.includes('PO_REJECTION_CODES'));
// §Phase M10 — the canonical schema carries the acknowledgement COLUMNS
// (acknowledged_qty against ordered_qty); the "cannot exceed ordered quantity"
// rule is enforced in the domain layer (src/data/api.ts), not by a DB trigger.
// No migration in this tree ever declared that trigger, so asserting one here
// would assert something the schema does not (and never did) promise. The
// invariant asserted is the real, testable one: the columns exist AND the
// domain guard exists.
test('acknowledged qty ≤ ordered qty enforced in the domain over the ack columns',
  api.includes('cannot exceed ordered quantity') &&
    migration.includes('ordered_qty') &&
    migration.includes('acknowledged_qty'));
// §Phase M11 — the DB-level half of the same rule NOW EXISTS. §23 database
// hardening added `purchase_order_lines_ack_within_ordered` (migration 026), so
// the rule is no longer domain-only. Asserted here so the two layers cannot
// silently diverge; the constraint is NOT VALID, so it binds new writes without
// risking legacy rows.
const hardening = read('supabase/migrations/026_harden_deductions_ack_and_messages.sql');
test('acknowledged qty ≤ ordered qty is also a DATABASE constraint (026)',
  hardening.includes('purchase_order_lines_ack_within_ordered') &&
    hardening.includes('acknowledged_qty <= ordered_qty') &&
    hardening.includes('not valid'));
test('backordered requires scheduledShipDate', api.includes("is backordered \u2014 a scheduled ship date is required"));
test('all-or-line-complete acknowledgment enforced',
  api.includes('all-or-line-item-complete'));
test('24h ack deadline surfaced as countdown in brand PO view',
  bpo.includes('AckDeadline') && bpo.includes('24 * 60 * 60 * 1000'));

// ASN
test('ASN captures carton detail (qty/weight/dims per carton)',
  api.includes('interface AsnCarton') && api.includes('weightKg') && api.includes('lengthCm'));
test('ASN carries PRO/BOL/trailer identifiers',
  api.includes('proNumber') && api.includes('bolNumber') && api.includes('trailerNumber'));
test('ASN validated against acknowledged quantities before submission',
  api.includes('were acknowledged'));
test('lot + expiry required for perishable/regulated categories',
  api.includes("LOT_REQUIRED_CATEGORIES") && api.includes('Lot number and expiry date are required'));

// Deductions linkage
test('ASN shortfall auto-creates shortage-claim Deduction',
  api.includes('createDeductionInStore') && api.includes('shortage_claim'));

// Catalog
test('case-pack/master-carton quantity + caseOrderable on products',
  types.includes('unitsPerCase') && types.includes('caseOrderable'));
test('Product Tax Code field with A_GEN_TAX default',
  types.includes("DEFAULT_PRODUCT_TAX_CODE = 'A_GEN_TAX'") && catalog.includes('productTaxCode'));

// CRM linkage
test('messages can be tied to a specific PO (poRef)', comm.includes('poRef') && types.includes('poRef?: string'));

console.log(failures === 0 ? 'STAGE24_VALIDATION_PASS' : `STAGE24_VALIDATION_FAIL (${failures})`);
process.exitCode = failures === 0 ? 0 : 1;
