#!/usr/bin/env node
/**
 * §Phase D6 — TENANT COHERENCE validator (the canonical guard for demo data).
 *
 * A real defect motivated this gate: the returns seed referenced ANOTHER
 * tenant's purchase order (a Astonish return pointing at Tapatío's PO-9003) and
 * a non-existent PO-9005 owned by a brand with no products at all, so a brand's
 * own dashboard displayed a foreign PO number. Type-checks, lint and the build
 * all pass with that class of defect present — only an explicit coherence check
 * catches it.
 *
 * Invariants asserted (all from the canonical stores, no re-derivation):
 *   1. every return references a PO and a SKU that ITS OWN brand owns;
 *   2. a return's linked deduction (if any) belongs to the same tenant;
 *   3. every deduction's brand matches the brand of the PO it charges;
 *   4. every commission's brand matches the PO it commissions;
 *   5. the payout lifecycle is deterministic: settle → paid, reset → baseline.
 *
 * Usage: node scripts/validate-tenant-coherence.mjs
 * Exit code: 0 if all checks pass, 1 on failure.
 */
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
const test = (name, ok, detail = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) failures++;
};

try {
  const store = await server.ssrLoadModule('/src/data/demoStore.ts');
  const pos = store.demoPurchaseOrders ?? [];
  const poByNumber = new Map(pos.map((p) => [p.poNumber, p]));
  const poById = new Map(pos.map((p) => [p.id, p]));
  const skusForBrand = (brandId) => store.productsForBrandFromStore(brandId).map((p) => p.sku);

  // 1. Returns are brand-coherent (PO + SKU belong to the return's own brand).
  const returns = store.demoReturns ?? [];
  test('returns exist for the demo tenants', returns.length > 0);
  let badReturn = '';
  for (const r of returns) {
    const po = poByNumber.get(r.poNumber);
    if (!po || po.brandId !== r.brandId) {
      badReturn = `${r.id}: PO ${r.poNumber} belongs to ${po ? po.brandId : 'no brand'}, return says ${r.brandId}`;
      break;
    }
    if (!skusForBrand(r.brandId).includes(r.productSku)) {
      badReturn = `${r.id}: SKU ${r.productSku} is not owned by ${r.brandId}`;
      break;
    }
  }
  test('every return references its OWN brand\'s PO and SKU', !badReturn, badReturn);

  // 2. A return's linked deduction is the same tenant's.
  let badLink = '';
  for (const r of returns) {
    if (!r.linkedDeductionId) continue;
    const d = (store.demoDeductions ?? []).find((x) => x.id === r.linkedDeductionId);
    if (!d || d.brandId !== r.brandId) {
      badLink = `${r.id} → ${r.linkedDeductionId} (${d ? d.brandId : 'missing'}) ≠ ${r.brandId}`;
      break;
    }
  }
  test('return → linked deduction stays inside the tenant', !badLink, badLink);

  // 3. Deductions charge the brand that owns the PO.
  let badDeduction = '';
  for (const d of store.demoDeductions ?? []) {
    const po = poByNumber.get(d.purchaseOrderId);
    if (!po || po.brandId !== d.brandId) {
      badDeduction = `${d.id}: PO ${d.purchaseOrderId} belongs to ${po ? po.brandId : 'no brand'}, deduction says ${d.brandId}`;
      break;
    }
  }
  test('every deduction charges the PO owner', !badDeduction, badDeduction);

  // 4. Commissions are a projection of the PO store, per tenant.
  const commissions = store.listCommissionsForPayout();
  let badCommission = '';
  for (const c of commissions) {
    const poId = c.id.replace(/^comm-/, '');
    const po = poById.get(poId);
    if (!po || po.brandId !== c.brandId || po.poNumber !== c.purchaseOrderId) {
      badCommission = `${c.id}: does not match its PO (${po ? `${po.brandId}/${po.poNumber}` : 'missing'})`;
      break;
    }
  }
  test('every commission matches its PO and tenant', !badCommission, badCommission);
  test('commissions accrue only from accrued-status POs',
    commissions.every((c) => ['accepted', 'ready_to_fulfil', 'shipped', 'delivered'].includes(poById.get(c.id.replace(/^comm-/, ''))?.status)));

  // 5. Deterministic lifecycle: settle → paid; reset → baseline.
  const target = commissions.find((c) => c.status !== 'paid');
  test('a pending commission exists to exercise the lifecycle', !!target);
  if (target) {
    const baseline = store.listCommissionsForPayout().filter((c) => c.status !== 'paid').length;
    store.markCommissionPaid(target.id);
    test('settling marks exactly that commission paid',
      store.getCommission(target.id)?.status === 'paid' &&
      store.listCommissionsForPayout().filter((c) => c.status !== 'paid').length === baseline - 1);
    store.resetSettledCommissions();
    test('reset restores the baseline deterministically',
      store.getCommission(target.id)?.status !== 'paid' &&
      store.listCommissionsForPayout().filter((c) => c.status !== 'paid').length === baseline);
  }

  console.log(failures === 0 ? 'TENANT_COHERENCE_PASS' : `TENANT_COHERENCE_FAIL (${failures})`);
} finally {
  await server.close();
}
if (failures > 0) process.exit(1);
