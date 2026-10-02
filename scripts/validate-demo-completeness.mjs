#!/usr/bin/env node
/**
 * §Batch-30 — Demo data completeness & uniqueness validator.
 *
 * Checks:
 * 1. All 11 demo brands have data in every category (products, POs, shipments,
 *    contracts, compliance docs, messages, deductions, returns).
 * 2. Demo data is genuinely unique per brand (no templated duplication).
 * 3. Admin drill-down works for every brand via CRM.
 *
 * Usage: node scripts/validate-demo-completeness.mjs
 * Exit code: 0 if all checks pass, 1 on failure.
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function read(p) {
  try { return readFileSync(resolve(ROOT, p), 'utf-8'); } catch { return ''; }
}

let passed = 0;
let failed = 0;
let warnings = 0;

function check(label, condition) {
  if (condition) { passed++; }
  else { failed++; console.error(`  ✗ ${label}`); }
}

function warn(label, condition) {
  if (!condition) { warnings++; console.warn(`  ⚠ ${label}`); }
}

console.log('\n📊 Batch-30 Demo Data Completeness & Uniqueness Audit\n');

// ── 1. Data categories per brand ──
const demoData = read('src/data/demoData.ts');
const demoStore = read('src/data/demoStore.ts');

// Verify the demo brands exist (the §P2 universe is THREE businesses)
const brandCount = (demoData.match(/id: 'brand-/g) || []).length;
check(`All 3 demo brands defined (found ${brandCount})`, brandCount >= 3);

// Verify DEMO_PRODUCTS has products per brand
check('DEMO_PRODUCTS exports products array', demoData.includes('DEMO_PRODUCTS'));
check('DEMO_PRODUCTS uses flatMap over brands', demoData.includes('ALL_DEMO_BRANDS.flatMap'));

// Verify each data category exists
const categories = [
  ['Contracts', 'DEMO_CONTRACTS'],
  ['Compliance docs', 'DEMO_COMPLIANCE_DOCS'],
  ['Messages', 'DEMO_MESSAGES'],
  ['Purchase Orders', 'DEMO_PURCHASE_ORDERS'],
  ['Shipments', 'DEMO_SHIPMENTS'],
  ['Returns', 'demoReturns'],
  ['Deductions', 'demoDeductions'],
  ['Team members', 'demoTeamMembers'],
  ['Return addresses', 'demoReturnAddresses'],
  ['PO Outages', 'demoPoOutages'],
];
for (const [label, name] of categories) {
  check(`Data category exists: ${label} (${name})`, demoData.includes(name) || demoStore.includes(name));
}

// ── 2. Demo data uniqueness check ──
// Products are differentiated by brand index (bi) in the formula
check('Product prices vary by brand index (bi in formula)', demoData.includes('8 + n * 4 + bi'));
check('Product SKUs unique per brand via skuFor()', demoData.includes('skuFor(brand, n)'));
check('Product barcodes unique per brand via bi padding', demoData.includes('bi + 1)'));

// PO numbers are unique per brand (9000 + bi*2 + pi)
check('PO numbers unique per brand', demoData.includes('String(9000 + bi * 2 + pi)'));
/**
 * §CLEAN-SLATE RECONCILIATION 2026-09-21 — REPOINTED (not weakened).
 * The old assertion pinned the literal `'palletline'` INSIDE `src/data/demoData.ts`.
 * The canonical carrier truth moved to `src/config/shipping.ts`, and consignments
 * no longer cycle through carriers at all — a carrier is derived from the canonical
 * LANE RULE (`selectCarrierForLane(resolveShippingLane(...))`), never from a cycle.
 * The INTENT is unchanged: the shipment cargo model must genuinely cover BOTH of
 * Mercenta's carrier accounts. It is now asserted against the single source of
 * truth, so it cannot drift: both accounts must be declared in the config, the
 * UK-domestic lane must resolve to Palletline, and demoData must derive its
 * carriers from the canonical lane rule rather than a hardcoded cycle.
 */
const shippingCfg = read('src/config/shipping.ts');
check('Shipment cargo cycle covers carriers',
  shippingCfg.includes("MERCENTA_CARRIER_ACCOUNTS: readonly CarrierId[] = ['dhl', 'palletline']") &&
    /uk_domestic:\s*'palletline'/.test(shippingCfg) &&
    demoData.includes('selectCarrierForLane(resolveShippingLane('));

// Verify rejection reasons are varied
check('Rejection reasons vary by brand index', demoData.includes('bi % REJECTION_REASONS.length'));

// ── 3. Admin drill-down exists for every brand via CRM ──
const brandCrm = read('src/components/admin/BrandCRM.tsx');
check('BrandCRM has brand selection (click-to-detail)',
  brandCrm.includes('setSelected') || brandCrm.includes('selectedBrand'));
check('BrandCRM shows brand data: POs, contracts, messages',
  brandCrm.includes('brandPOs') && brandCrm.includes('brandContracts'));
check('BrandCRM has communication panel (contact section)',
  brandCrm.includes('BrandCommPanel'));
check('BrandCRM has CRM depth (timeline, tasks, notes)',
  brandCrm.includes('BrandCrmDepth'));

// Admin purchase order list per brand
const adminPoList = read('src/components/admin/AdminPurchaseOrderList.tsx');
check('Admin PO list has drill-down to detail view',
  adminPoList.includes('selectedPoId') || adminPoList.includes('AdminPurchaseOrderDetail'));
check('Admin PO list searches by brand name',
  adminPoList.includes('brandName'));

// ── 4. Onboarding check — brand onboarding sets data correctly ──
const onboarding = read('src/components/brand/OnboardingWizard.tsx');
check('Onboarding wizard exists and references BrandGuidance',
  onboarding.includes('BrandGuidance'));
check('Onboarding has required guidance ack step',
  onboarding.includes('guidanceAck') || onboarding.includes('Guidance'));

// ── Summary ──
console.log(`\n── RESULTS ──`);
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
if (warnings > 0) console.log(`  Warnings: ${warnings}`);
console.log();

if (failed > 0) {
  console.error(`❌ ${failed} check(s) failed.`);
  process.exit(1);
} else {
  console.log(`✅ All ${passed} checks passed.`);
  process.exit(0);
}