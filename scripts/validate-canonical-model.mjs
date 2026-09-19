#!/usr/bin/env node
/**
 * §Canonical model (M1/M3/M5) — CANONICAL MODEL validator.
 *
 * Proves the canonical Mercenta business rules reconciled this session by
 * running the REAL domain modules (no mocks of the modules under test):
 *
 *   A. SHIPPING ROUTING (§11) — international → DHL, UK domestic → Palletline;
 *      arbitrary carriers refused; Amazon-arranged freight allowed on collect POs.
 *   B. SHIPPING COMMERCIALS (§12) — negotiated discount, carrier invoice cost and
 *      brand charge BOTH preserved, margin derived, configurable VAT, no
 *      hardcoded mark-up, and no overwriting of the carrier cost by the price.
 *   C. PO-GATED / TENANT-SCOPED SHIPMENT (§10) — a shipment cannot be derived
 *      from another tenant's PO or with a non-canonical carrier.
 *   D. CASES (§15) — a brand case can NEVER reach Amazon without a Mercenta
 *      admin review decision; escalation is idempotent; provider mode is
 *      fail-closed; the failure path leaves no false success; tenant reads scoped.
 *
 * Usage: node scripts/validate-canonical-model.mjs
 * Exit code: 0 if all checks pass, 1 on failure.
 */
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
const test = (name, ok, detail = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) failures++;
};
const near = (a, b, eps = 0.011) => Math.abs(a - b) < eps;

try {
  const routing = await server.ssrLoadModule('/src/lib/shipping/carrierRouting.ts');
  const calc = await server.ssrLoadModule('/src/lib/shipping/shippingCalculator.ts');
  const ticketStore = await server.ssrLoadModule('/src/lib/helpdesk/ticketStore.ts');
  const caseClient = await server.ssrLoadModule('/src/lib/helpdesk/amazonCaseClient.ts');
  const api = await server.ssrLoadModule('/src/data/api.ts');
  const store = await server.ssrLoadModule('/src/data/demoStore.ts');

  console.log('\n── A. Shipping routing (§11) ─────────────────────────────────');

  test('international brand → DHL',
    routing.selectCarrierForShipment({ brandNation: 'Zimbabwe' }).carrier === 'dhl');
  test('UK domestic brand → Palletline',
    routing.selectCarrierForShipment({ brandNation: 'United Kingdom' }).carrier === 'palletline');
  test('UK alias "GB" recognised as domestic',
    routing.resolveShippingLane({ brandNation: 'GB' }) === 'uk_domestic');
  test('Europe is NOT domestic (Denmark → international/DHL)',
    routing.resolveShippingLane({ brandNation: 'Denmark' }) === 'international');
  test('unknown origin defaults to international/DHL (conservative)',
    routing.resolveShippingLane({}) === 'international');
  test('arbitrary carrier (fedex) refused',
    routing.validateCarrierForShipment({ carrier: 'fedex', brandNation: 'United States' }).ok === false);
  test('arbitrary carrier (bak) refused',
    routing.validateCarrierForShipment({ carrier: 'bak', brandNation: 'United Kingdom' }).ok === false);
  test('canonical carrier accepted',
    routing.validateCarrierForShipment({ carrier: 'dhl', brandNation: 'United States' }).ok === true);
  test('partnered carrier refused on a prepaid (non-collect) PO',
    routing.validateCarrierForShipment({ carrier: 'amazon_partner', freightTerm: 'prepaid' }).ok === false);
  test('partnered carrier allowed on an Amazon collect PO',
    routing.validateCarrierForShipment({ carrier: 'amazon_partner', freightTerm: 'collect' }).ok === true);

  console.log('\n── B. Shipping commercial model (§12) ───────────────────────');

  const estimate = calc.computeShippingEstimate({
    carrier: 'dhl', totalWeightKg: 120, totalCbm: 2, cartonCount: 10,
  });
  const comm = calc.computeShippingCommercials({ lane: 'international', carrier: 'dhl', carrierListCost: estimate.baseCarrierCost });
  test('carrier invoice cost is discounted BELOW the list cost',
    comm.carrierInvoiceCost < comm.carrierListCost && comm.negotiatedDiscountAmount > 0,
    `list ${comm.carrierListCost} invoice ${comm.carrierInvoiceCost}`);
  test('both sides preserved — brand charge is NOT the carrier cost',
    comm.brandAmountCharged > comm.carrierInvoiceCost);
  test('brand charge = invoice + mark-up + surcharge + handling',
    near(comm.brandAmountCharged, comm.carrierInvoiceCost + comm.markUpAmount + comm.surchargeAmount + comm.handlingFee));
  test('gross margin = brand charge − carrier invoice cost',
    near(comm.grossShippingMargin, comm.brandAmountCharged - comm.carrierInvoiceCost));
  test('VAT split: charged / recoverable / payable are distinct',
    near(comm.vatPayableToHmrc, comm.vatAmount - comm.inputVatRecoverable) &&
    comm.vatAmount > 0 && comm.inputVatRecoverable > 0);
  test('net Mercenta revenue = gross margin − VAT payable to HMRC',
    near(comm.netMercentaRevenue, comm.grossShippingMargin - comm.vatPayableToHmrc));
  test('no hardcoded 90%: margin fraction is well below it and terms are flagged placeholder',
    comm.grossShippingMargin / comm.brandAmountCharged < 0.9 && comm.placeholderTerms === true);
  test('commercials are deterministic (same input ⇒ same breakdown)',
    JSON.stringify(calc.computeShippingCommercials({ lane: 'international', carrier: 'dhl', carrierListCost: estimate.baseCarrierCost })) === JSON.stringify(comm));

  console.log('\n── C. PO-gated, tenant-scoped shipment (§10) ────────────────');

  const accepted = store.demoPurchaseOrders.find((p) => p.status === 'accepted');
  test('seed contains an accepted PO to derive a shipment from', !!accepted);
  if (accepted) {
    const asn = {
      cartons: accepted.lineItems.map((l) => ({ sku: l.sku, quantity: l.quantity, weightKg: 5, lengthCm: 30, widthCm: 20, heightCm: 15 })),
      shipDate: '2026-10-01',
      carrier: 'dhl',
      // The seed accepted PO belongs to a canonical Grocery tenant (Tapatío),
      // which is a perishable/regulated category — lot + expiry are required.
      lotNumber: `SIM-LOT-${accepted.poNumber}`,
      expiryDate: '2027-10-01',
    };
    const wrongTenant = api.createShipmentForPO(accepted.id, asn, undefined, 'brand-not-this-one');
    test('another tenant cannot create a shipment from this PO',
      wrongTenant.ok === false && /does not belong to this brand/.test(wrongTenant.error ?? ''),
      wrongTenant.error);
    const goodTenant = api.createShipmentForPO(accepted.id, asn, undefined, accepted.brandId);
    test('the owning tenant can derive a shipment from its eligible PO',
      goodTenant.ok === true, goodTenant.error);
    const badCarrierPO = store.demoPurchaseOrders.find((p) => p.status === 'accepted' && p.id !== accepted.id);
    if (badCarrierPO) {
      const bad = api.createShipmentForPO(badCarrierPO.id, { ...asn, carrier: 'fedex' }, undefined, badCarrierPO.brandId);
      test('a shipment with a non-canonical carrier is refused at the domain',
        bad.ok === false && /not a Mercenta carrier account/.test(bad.error ?? ''), bad.error);
    }
  }

  console.log('\n── D. Cases: admin review before Amazon escalation (§15) ────');

  caseClient.resetMockAmazonCases();
  ticketStore.resetCaseSequence(0);

  const c = ticketStore.createCase({
    brandId: 'brand-astonish',
    subject: 'PO-9001 pricing discrepancy',
    description: 'Amazon shows a lower unit price than our agreed ex-works price.',
    caseCategory: 'po_question',
    relatedPoNumber: 'PO-9001',
    id: 'case-canonical-1',
    caseRef: 'MC-0001',
  });
  test('brand-opened case starts awaiting Mercenta review',
    c.escalationState === 'brand_submitted' && c.caseRef === 'MC-0001');

  const early = await ticketStore.escalateCaseToProvider(c.id, 'staff-001', 'simulation');
  test('a brand case can NEVER be escalated to Amazon before review',
    early.ok === false && !c.amazonCase, early.error);

  ticketStore.beginCaseReview(c.id, 'staff-001');
  const reviewed = ticketStore.reviewCase(c.id, 'staff-001', 'approve_escalation', 'Corrected the unit price.');
  test('Mercenta review approves escalation',
    reviewed.ok === true && reviewed.ticket.escalationState === 'approved_for_escalation');

  const unknownMode = await ticketStore.escalateCaseToProvider(c.id, 'staff-001', 'unknown');
  test('FAIL-CLOSED: an unknown provider mode never simulates an Amazon case',
    unknownMode.ok === false && !c.amazonCase, unknownMode.error);

  const escalated = await ticketStore.escalateCaseToProvider(c.id, 'staff-001', 'simulation');
  test('simulation mode opens a clearly-fake Amazon case',
    escalated.ok === true && /^AMZ-CASE-MOCK-/.test(escalated.caseReferenceId ?? '') && c.amazonCase?.simulated === true,
    escalated.caseReferenceId);

  const again = await ticketStore.escalateCaseToProvider(c.id, 'staff-001', 'simulation');
  test('escalation is idempotent — a retry returns the SAME provider case',
    again.ok === true && again.caseReferenceId === escalated.caseReferenceId);

  ticketStore.recordProviderCaseResponse(c.id, 'staff-001', { outcome: 'accepted', response: 'Amazon approved the corrected price.' });
  test('provider response is recorded and visible', c.escalationState === 'provider_responded' && !!c.providerResponse);
  const resolved = ticketStore.resolveCase(c.id, 'staff-001', 'Price corrected with Amazon; brand notified.');
  test('Mercenta resolves the case', resolved.ok === true && c.escalationState === 'resolved');

  const cf = ticketStore.createCase({
    brandId: 'brand-astonish',
    subject: 'Provider failure path',
    description: `${caseClient.SIMULATED_PROVIDER_FAILURE_MARKER} retail-channel case API unavailable`,
    caseCategory: 'amazon_related',
    id: 'case-canonical-fail',
    caseRef: 'MC-0002',
  });
  ticketStore.reviewCase(cf.id, 'staff-001', 'approve_escalation', 'Verified.');
  const failed = await ticketStore.escalateCaseToProvider(cf.id, 'staff-001', 'simulation');
  test('provider failure produces NO false success and leaves the case recoverable',
    failed.ok === false && !cf.amazonCase && cf.escalationState === 'approved_for_escalation', failed.error);
  const retried = await ticketStore.escalateCaseToProvider(cf.id, 'staff-001', 'simulation');
  test('retry after failure is safe (no duplicate, still no success claimed)',
    retried.ok === false && !cf.amazonCase);

  test("brand-scoped case read model returns ONLY the brand's own cases",
    ticketStore.listCasesForBrand('brand-astonish').every((t) => t.brandId === 'brand-astonish') &&
    ticketStore.listCasesForBrand('brand-seep').length === 0);
  test('operator read model sees cases across tenants',
    ticketStore.listAllCases().length >= 2);

  const auditActions = store.demoAuditLog.map((a) => a.action);
  test('every case transition is audited',
    auditActions.includes('case_created') && auditActions.includes('case_reviewed') &&
    auditActions.includes('case_escalated_to_provider') && auditActions.includes('case_resolved'));

} finally {
  await server.close();
}

console.log(failures === 0 ? 'ALL CANONICAL-MODEL CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
