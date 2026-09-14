// §Phase E4 — validates the COMMERCE / AMAZON-STYLE OPERATIONAL SIMULATION:
//   A  canonical entities (one declaration each, no duplicate concepts)
//   B  operational eligibility DERIVED from the E3 catalog lifecycle
//   C  refusal of an ineligible product, with ZERO state mutation
//   D  truthful simulation provenance on every operational record
//   E  deterministic ids + idempotency across the lifecycle
//   F  the PO lifecycle (create → acknowledge → fulfil → receive)
//   G  shipment progression along the EXISTING freight track
//   H  receiving (clean + shortfall) and the EXISTING reconciliation seam
//   I  simulated invoice + simulated payment
//   J  exceptions / chargebacks / dispute / resolution
//   K  invalid transition refusal, with no state mutation
//   L  tenant isolation enforced IN THE DOMAIN (mutations + reads)
//   M  RBAC enforced IN THE DOMAIN (view-only refused, read allowed)
//   N  audit on the ONE existing platform log
//   O  the D4 persistence contract (memory honest + injected durable double)
//   P  provider safety + ZERO external network calls
//   Q  architecture invariants (migration 023, no second DB, real email path untouched)
//
// The durable path is proven with an INJECTED conformance repository, because
// this demo environment has NO browser Supabase credentials — the memory adapter
// is active, nothing is durable, and that is reported honestly.
import { createServer } from 'vite';
// §M12 — resolve filesystem paths with fileURLToPath: a project folder whose name
// contains a space (e.g. `1. Mercenta`) is percent-encoded by `URL.pathname`, which
// silently broke this walk (ENOENT on `1.%20Mercenta`).
import { fileURLToPath } from 'node:url';
import { readFileSync, readdirSync } from 'node:fs';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
const test = (name, ok) => {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failures++;
};

let externalFetches = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url) => {
  externalFetches++;
  console.log(`!! E4 commerce suite attempted external fetch: ${String(url)}`);
  return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
};

const readSrc = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

/** A durable CONFORMANCE DOUBLE implementing the extended DomainRepository contract. */
class ConformanceRepository {
  constructor() {
    this.backend = 'supabase';
    this.durable = true;
    this.rows = new Map();
    this.writes = 0;
    this.failNext = false;
  }
  _put(table, id, payload, tenantId) {
    if (this.failNext) {
      this.failNext = false;
      return Promise.resolve({ ok: false, backend: 'supabase', durable: false, table, id, error: 'conformance: injected failure' });
    }
    this.writes++;
    // Idempotent upsert on the canonical id — same contract as the real adapter.
    this.rows.set(`${table}:${id}`, { table, id, payload, tenantId });
    return Promise.resolve({ ok: true, backend: 'supabase', durable: true, table, id });
  }
  persistOutreach(r, t) { return this._put('acquisition_outreach', r.id, r, t); }
  persistResponse(r, t) { return this._put('acquisition_responses', r.id, r, t); }
  persistOpportunity(o, t, b) { return this._put('acquisition_opportunities', o.id, { ...o, brandId: b ?? o.brandId }, t); }
  persistEvent(e, t) { return this._put('acquisition_events', e.id, e, t); }
  persistProspect(p, t) { return this._put('bi_prospects', p.id, p, t); }
  persistRun(r, t) { return this._put('bi_intelligence_runs', r.runId, r, t); }
  persistChange(c, t) { return this._put('bi_prospect_changes', c.id, c, t); }
  persistSnapshot(s, t) { return this._put('bi_snapshots', `${s.brandId}-${s.snapshotDate}`, s, t); }
  persistBrandOnboarding(o, t) { return this._put('brand_onboarding', o.id, o, t); }
  persistCatalogSubmission(s, t) { return this._put('catalog_submissions', s.id, s, t); }
  persistCommercePurchaseOrder(p, t) { return this._put('commerce_purchase_orders', p.id, p, t); }
  persistCommerceInvoice(i, t) { return this._put('commerce_invoices', i.id, i, t); }
  persistCommercePayment(p, t) { return this._put('commerce_payments', p.id, p, t); }
  persistCommerceActivity(a, t) { return this._put('commerce_activities', a.id, a, t); }
  async hydrate(scope) {
    const pick = (table) => [...this.rows.values()]
      .filter((r) => r.table === table)
      .filter((r) => scope.kind === 'ops' || r.tenantId === scope.tenantId)
      .map((r) => r.payload);
    return {
      outreach: pick('acquisition_outreach'),
      responses: pick('acquisition_responses'),
      opportunities: pick('acquisition_opportunities'),
      events: pick('acquisition_events'),
      prospects: pick('bi_prospects'),
      runs: pick('bi_intelligence_runs'),
      changes: pick('bi_prospect_changes'),
      snapshots: pick('bi_snapshots'),
      brandOnboarding: pick('brand_onboarding'),
      catalogSubmissions: pick('catalog_submissions'),
      commercePurchaseOrders: pick('commerce_purchase_orders'),
      commerceInvoices: pick('commerce_invoices'),
      commercePayments: pick('commerce_payments'),
      commerceActivities: pick('commerce_activities'),
    };
  }
  flush() { return Promise.resolve(); }
}

try {
  /* ── modules under test (the EXISTING architecture) ── */
  const dr = await server.ssrLoadModule('/src/data/domainRepository.ts');
  const api = await server.ssrLoadModule('/src/data/api.ts');
  const store = await server.ssrLoadModule('/src/data/demoStore.ts');
  const commerce = await server.ssrLoadModule('/src/lib/commerce/commerceLifecycle.ts');
  const catalog = await server.ssrLoadModule('/src/lib/catalog/catalogLifecycle.ts');
  const mockAmazon = await server.ssrLoadModule('/src/lib/spapi/mockClient.ts');
  const integrations = await server.ssrLoadModule('/src/integrations/types.ts');
  const tickets = await server.ssrLoadModule('/src/lib/helpdesk/ticketStore.ts');

  const ZAMBEZI = 'brand-zambezi';     // cleared compliance gate
  const DESKFORGE = 'brand-deskforge'; // cleared compliance gate
  const NORDHAUS = 'brand-nordhaus';   // gate still blocked

  const zambeziActor = { staffId: `brand:${ZAMBEZI}`, canMutate: true, tenantId: ZAMBEZI };
  const deskforgeActor = { staffId: `brand:${DESKFORGE}`, canMutate: true, tenantId: DESKFORGE };
  const nordhausActor = { staffId: `brand:${NORDHAUS}`, canMutate: true, tenantId: NORDHAUS };
  const viewOnly = { staffId: 'staff-005', canMutate: false, tenantId: ZAMBEZI };
  const opsActor = { staffId: 'staff-001', canMutate: true };

  /** A COMPLETE product payload (every prerequisite genuinely supplied). */
  const commerceProduct = (sku, over = {}) => ({
    id: '',
    name: `E4 commerce product ${sku}`,
    sku,
    barcode: '600999000099',
    image: '',
    exWorksPrice: 12.5,
    ukRetailPrice: 29.99,
    commodityCode: '3304990090',
    vatStatus: 'Standard 20%',
    hazmat: false,
    length: 12,
    width: 10,
    height: 18,
    weight: 0.5,
    ...over,
  });

  /* ── the eligible, E3-completed product every lifecycle test drives ── */
  const ELIGIBLE_SKU = 'E4-COMM-001';
  store.addCatalogProduct(ZAMBEZI, commerceProduct(ELIGIBLE_SKU));
  mockAmazon.resetMockAmazonState();
  const submitted = await catalog.submitCatalogProduct(
    ZAMBEZI,
    store.findCatalogProduct(ZAMBEZI, ELIGIBLE_SKU),
    zambeziActor
  );
  test('A0 the E3 submission seam produced a real (simulated) submission for the test product',
    submitted.ok === true && submitted.value.simulated === true);

  /* ── a SECOND eligible product — used for the exception / shortfall path ── */
  const EXCEPTION_SKU = 'E4-COMM-002';
  store.addCatalogProduct(ZAMBEZI, commerceProduct(EXCEPTION_SKU));
  const submitted2 = await catalog.submitCatalogProduct(
    ZAMBEZI,
    store.findCatalogProduct(ZAMBEZI, EXCEPTION_SKU),
    zambeziActor
  );
  test('A0b a SECOND eligible product exists for the exception path',
    submitted2.ok === true && submitted2.value.simulated === true);

  /* ══ A. canonical entities — ONE declaration each ══ */
  const typesSrc = readSrc('src/types.ts');
  const storeSrc = readSrc('src/data/demoStore.ts');
  const commerceSrc = readSrc('src/lib/commerce/commerceLifecycle.ts');
  const countDecl = (src, name) => (src.match(new RegExp(`export interface ${name} \\{`, 'g')) || []).length;
  test('A1 the operational activity record is declared ONCE (CommerceActivity)', countDecl(typesSrc, 'CommerceActivity') === 1);
  test('A2 eligibility / invoice / payment are declared ONCE each',
    countDecl(typesSrc, 'CommerceEligibility') === 1 &&
    countDecl(typesSrc, 'CommerceInvoice') === 1 &&
    countDecl(typesSrc, 'CommercePayment') === 1);
  test('A3 the existing PO type gains OPTIONAL provenance (no duplicated status vocabulary)',
    /mode\?: CommerceMode;[\s\S]{0,120}simulated\?: boolean;/.test(typesSrc) &&
    (typesSrc.match(/export type PurchaseOrderStatus =/g) || []).length === 1);
  test('A4 the commerce stores live in the ONE canonical store module',
    /export const demoCommerceActivities/.test(storeSrc) &&
    /export const demoCommerceInvoices/.test(storeSrc) &&
    /export const demoCommercePayments/.test(storeSrc));
  test('A5 no second storage mechanism was introduced by the commerce lifecycle',
    !/indexedDB|localStorage|sqlite|Dexie/i.test(commerceSrc + storeSrc));
  test('A6 the lifecycle REUSES the existing seams (no re-declared PO/shipment/deduction)',
    /from '@\/data\/api'/.test(commerceSrc) &&
    /from '@\/data\/demoStore'/.test(commerceSrc) &&
    !/export interface PurchaseOrder/.test(commerceSrc) &&
    !/export interface Deduction/.test(commerceSrc));

  /* ══ B. operational eligibility DERIVED from E3 ══ */
  const eligibility = await commerce.evaluateCommerceEligibility(ZAMBEZI, ELIGIBLE_SKU, zambeziActor);

  const noSubSku = 'E4-NOSUB-001';
  store.addCatalogProduct(ZAMBEZI, commerceProduct(noSubSku));
  const noSub = await commerce.evaluateCommerceEligibility(ZAMBEZI, noSubSku, zambeziActor);
  test('B1 a product with no catalog submission is NOT eligible',
    noSub.ok === true && noSub.value.eligible === false &&
    noSub.value.reasons.some((r) => /submission/i.test(r)));

  const incompleteSku = 'E4-INCOMPLETE-001';
  store.addCatalogProduct(ZAMBEZI, commerceProduct(incompleteSku, { commodityCode: '' }));
  const incomplete = await commerce.evaluateCommerceEligibility(ZAMBEZI, incompleteSku, zambeziActor);
  test('B2 a product with incomplete information is NOT eligible',
    incomplete.ok === true && incomplete.value.eligible === false &&
    incomplete.value.readiness.complete === false);

  const blockedSku = 'E4-BLOCKED-001';
  store.addCatalogProduct(NORDHAUS, commerceProduct(blockedSku));
  const blocked = await commerce.evaluateCommerceEligibility(NORDHAUS, blockedSku, nordhausActor);
  test('B3 a compliance-blocked tenant is NOT eligible (the EXISTING gate is reused, not bypassed)',
    blocked.ok === true && blocked.value.eligible === false &&
    blocked.value.readiness.compliant === false);

  const rejectedSeed = store.demoProducts.find(
    (p) => store.latestSubmissionForProduct(p.brandId, p.sku)?.status === 'rejected'
  );
  const rejectedVerdict = rejectedSeed
    ? await commerce.evaluateCommerceEligibility(rejectedSeed.brandId, rejectedSeed.sku, {
        staffId: 'validator', canMutate: true, tenantId: rejectedSeed.brandId,
      })
    : null;
  test('B4 a REJECTED catalog submission is refused for commerce',
    !!rejectedSeed && rejectedVerdict.ok === true && rejectedVerdict.value.eligible === false &&
    rejectedVerdict.value.reasons.some((r) => /REJECTED/.test(r)));

  test('B5 a product that completed the E3 lifecycle IS eligible',
    eligibility.ok === true && eligibility.value.eligible === true &&
    eligibility.value.submissionStatus !== undefined);
  test('B6 eligibility carries the DERIVED E3 readiness (never a second rule set)',
    eligibility.ok === true &&
    typeof eligibility.value.readiness.readyForSubmission === 'boolean' &&
    typeof eligibility.value.readiness.compliant === 'boolean' &&
    typeof eligibility.value.readiness.complete === 'boolean');

  /* ══ C. refusal of an ineligible product mutates NOTHING ══ */
  const poCountBefore = store.demoPurchaseOrders.length;
  const actCountBefore = store.demoCommerceActivities.length;
  const refusedCreate = await commerce.createCommercePurchaseOrder(ZAMBEZI, noSubSku, 10, zambeziActor);
  test('C1 raising a PO for an ineligible product is REFUSED with reasons',
    refusedCreate.ok === false && /NOT_ELIGIBLE/.test(refusedCreate.error) &&
    Array.isArray(refusedCreate.reasons) && refusedCreate.reasons.length > 0);
  test('C2 the refusal created NO purchase order', store.demoPurchaseOrders.length === poCountBefore);
  test('C3 the refusal recorded NO operational activity', store.demoCommerceActivities.length === actCountBefore);

  /* ══ D. simulated purchase order ══ */
  const created = await commerce.createCommercePurchaseOrder(ZAMBEZI, ELIGIBLE_SKU, 250, zambeziActor);
  const poId = created.ok ? created.value.id : '';
  test('D1 an ELIGIBLE product raises a SIMULATED purchase order', created.ok === true && created.value.status === 'received');
  test('D2 the PO id is DETERMINISTIC (po-sim-<tenant>-<productId>)', /^po-sim-brand-zambezi-/.test(poId));
  test('D3 the PO carries EXPLICIT simulation provenance', created.ok === true && created.value.mode === 'simulation' && created.value.simulated === true);
  test('D4 the PO is linked to the canonical brand AND the canonical product',
    created.ok === true && created.value.brandId === ZAMBEZI && !!created.value.originProductId);
  test('D5 the PO number is deterministic from the canonical keys', created.ok === true && /^PO-SIM-BRAND-ZAMBEZI-/.test(created.value.poNumber));
  test('D6 the PO is tenant-scoped and auditable (an activity + an audit entry exist)',
    store.getCommerceActivitiesForBrand(ZAMBEZI).some((a) => a.type === 'po_created' && a.purchaseOrderId === poId) &&
    store.demoAuditLog.some((e) => e.entityType === 'commerce' && e.action === 'commerce_po_created'));

  /* ══ E. determinism + idempotency + provenance ══ */
  const simulatedPoCount = store.demoPurchaseOrders.filter((p) => p.simulated === true).length;
  const replay = await commerce.createCommercePurchaseOrder(ZAMBEZI, ELIGIBLE_SKU, 250, zambeziActor);
  test('E1 replaying PO creation returns the SAME PO (idempotent, no duplicate row)',
    replay.ok === true && replay.value.id === poId &&
    store.demoPurchaseOrders.filter((p) => p.simulated === true).length === simulatedPoCount);
  test('E2 exactly ONE po_created activity exists despite the replay',
    store.getCommerceActivitiesForBrand(ZAMBEZI).filter((a) => a.type === 'po_created' && a.purchaseOrderId === poId).length === 1);
  test('E3 every operational activity id is deterministic (com-<tenant>-<type>-<n>)',
    store.demoCommerceActivities.every((a) => /^com-brand-/.test(a.id)));
  test('E4 EVERY operational activity is truthfully marked simulated',
    store.demoCommerceActivities.every((a) => a.simulated === true && a.mode === 'simulation'));
  test('E5 no record claims a real Amazon/DHL/Xero outcome',
    store.demoCommerceActivities.every((a) => !/Amazon issued|DHL delivered|Xero payment received/i.test(a.detail)) &&
    /No live provider contacted|No email sent|No accounting provider contacted|No payment provider contacted/.test(
      store.demoCommerceActivities.map((a) => a.detail).join(' ')
    ));

  /* ══ F. PO acknowledgement ══ */
  const ack = commerce.acknowledgeCommercePurchaseOrder(poId, zambeziActor);
  test('F1 an acknowledged PO moves received → accepted', ack.ok === true && ack.value.status === 'accepted');
  test('F2 every accepted line records its acknowledged quantity',
    ack.ok === true && ack.value.lineItems.every((l) => l.ackStatus === 'accepted' && l.acknowledgedQty === l.quantity));
  test('F3 the PO remains explicitly simulated after acknowledgement', ack.ok === true && ack.value.simulated === true);
  test('F4 a DUPLICATE acknowledgement is refused (no double transition)',
    commerce.acknowledgeCommercePurchaseOrder(poId, zambeziActor).ok === false);
  test('F5 the acknowledgement is auditable (activity + audit entry)',
    store.getCommerceActivitiesForBrand(ZAMBEZI).some((a) => a.type === 'po_acknowledged' && a.purchaseOrderId === poId) &&
    store.demoAuditLog.some((e) => e.action === 'commerce_po_acknowledged'));

  /* ══ G. fulfilment / shipment ══ */
  const fulfil = commerce.fulfilCommercePurchaseOrder(poId, zambeziActor);
  const shipmentId = fulfil.ok ? fulfil.value.shipmentId : '';
  test('G1 an accepted PO can be fulfilled — a shipment is created', fulfil.ok === true && !!shipmentId);
  test('G2 the PO advances to shipped', fulfil.ok === true && fulfil.value.po.status === 'shipped');
  const shipment = store.demoShipments.find((s) => s.id === shipmentId);
  test('G3 the shipment uses the EXISTING freight vocabulary (factory_intake), not a new one',
    !!shipment && shipment.status === 'factory_intake' && shipment.brandId === ZAMBEZI);
  const advanced = commerce.advanceCommerceShipment(shipmentId, zambeziActor);
  test('G4 a simulated shipment advances ONE step along the existing track',
    advanced.ok === true && advanced.value.status === 'bak_depot');
  test('G5 the shipment step is auditable and simulated',
    store.getCommerceActivitiesForBrand(ZAMBEZI).some((a) => a.type === 'shipment_advanced' && a.shipmentId === shipmentId && a.simulated === true));

  /* ══ H. receiving (clean) ══ */
  const received = commerce.receiveCommercePurchaseOrder(poId, zambeziActor);
  test('H1 receiving a shipped PO advances it to delivered', received.ok === true && received.value.po.status === 'delivered');
  test('H2 a clean delivery produces NO shortfall and NO deduction',
    received.ok === true && received.value.shortfalls.length === 0 && received.value.deductions.length === 0);
  test('H3 the received quantity is recorded on the canonical PO lines',
    received.ok === true && received.value.po.lineItems.every((l) => typeof l.receivedQty === 'number'));

  /* ══ I. simulated invoice ══ */
  const invoice = commerce.issueCommerceInvoice(poId, zambeziActor);
  test('I1 a DELIVERED PO produces a simulated invoice', invoice.ok === true && invoice.value.status === 'issued');
  test('I2 the invoice is linked to the brand, the PO and the quantities',
    invoice.ok === true && invoice.value.brandId === ZAMBEZI &&
    invoice.value.purchaseOrderId === poId && invoice.value.lines.length > 0);
  test('I3 the invoice carries explicit simulation provenance and GBP currency',
    invoice.ok === true && invoice.value.simulated === true &&
    invoice.value.mode === 'simulation' && invoice.value.currency === 'GBP');
  test('I4 the invoice id is deterministic and keyed by the PO',
    invoice.ok === true && created.ok === true &&
    invoice.value.id === `cinv-${ZAMBEZI}-${created.value.poNumber}`);
  const invoiceAgain = commerce.issueCommerceInvoice(poId, zambeziActor);
  test('I5 issuing the invoice twice returns the SAME invoice (idempotent)',
    invoice.ok === true && invoiceAgain.ok === true && invoiceAgain.value.id === invoice.value.id &&
    store.getCommerceInvoicesForBrand(ZAMBEZI).length === 1);
  test('I6 no accounting provider (Xero) is referenced anywhere on the invoice',
    invoice.ok === true && !/xero/i.test(JSON.stringify(invoice.value)));

  /* ══ J. simulated payment ══ */
  const payment = invoice.ok ? commerce.recordCommercePayment(invoice.value.id, zambeziActor) : { ok: false };
  test('J1 a simulated payment settles against the invoice', payment.ok === true && payment.value.status === 'settled');
  test('J2 the payment method is explicitly simulated (no real payment provider)',
    payment.ok === true && payment.value.method === 'simulated_bank_transfer' && payment.value.simulated === true);
  test('J3 the invoice reflects the settled payment',
    invoice.ok === true && store.getCommerceInvoice(invoice.value.id)?.status === 'paid');
  const paymentAgain = invoice.ok ? commerce.recordCommercePayment(invoice.value.id, zambeziActor) : { ok: false };
  test('J4 recording the payment twice returns the SAME payment (idempotent)',
    invoice.ok === true && paymentAgain.ok === true && payment.ok === true &&
    paymentAgain.value.id === payment.value.id &&
    store.getCommercePaymentsForInvoice(invoice.value.id).length === 1);

  /* ══ K+M. the exception path and illegal-transition refusal ══ */
  const created2 = await commerce.createCommercePurchaseOrder(ZAMBEZI, EXCEPTION_SKU, 80, zambeziActor);
  const po2 = created2.ok ? created2.value.id : '';
  const actsBeforeIllegal = store.demoCommerceActivities.length;

  const invoiceTooEarly = commerce.issueCommerceInvoice(po2, zambeziActor);
  test('M1 an invoice before DELIVERY is refused',
    invoiceTooEarly.ok === false && /ILLEGAL_TRANSITION/.test(invoiceTooEarly.error));
  test('M2 the refused invoice created no invoice and no activity',
    store.getCommerceInvoicesForBrand(ZAMBEZI).length === 1 &&
    store.demoCommerceActivities.length === actsBeforeIllegal);

  const receiveBeforeShip = commerce.receiveCommercePurchaseOrder(po2, zambeziActor);
  test('M3 receiving a PO that was never shipped is refused', receiveBeforeShip.ok === false);
  const fulfilBeforeAck = commerce.fulfilCommercePurchaseOrder(po2, zambeziActor);
  test('M4 fulfilling a PO that was never acknowledged is refused', fulfilBeforeAck.ok === false);
  test('M5 the refused transitions left the PO untouched in "received"',
    api.fetchPurchaseOrder(po2)?.status === 'received' &&
    store.demoCommerceActivities.length === actsBeforeIllegal);

  const ack2 = commerce.acknowledgeCommercePurchaseOrder(po2, zambeziActor);
  const fulfil2 = commerce.fulfilCommercePurchaseOrder(po2, zambeziActor);
  const fulfilDuplicate = commerce.fulfilCommercePurchaseOrder(po2, zambeziActor);
  test('M6 a duplicate fulfilment is refused', ack2.ok === true && fulfil2.ok === true && fulfilDuplicate.ok === false);

  const shortReceive = commerce.receiveCommercePurchaseOrder(po2, zambeziActor, { [EXCEPTION_SKU]: 30 });
  const receiveDuplicate = commerce.receiveCommercePurchaseOrder(po2, zambeziActor);
  test('M7 a duplicate receiving is refused', shortReceive.ok === true && receiveDuplicate.ok === false);
  test('M8 acknowledging an already-delivered PO is refused',
    commerce.acknowledgeCommercePurchaseOrder(po2, zambeziActor).ok === false);
  test('M9 settling a payment against an unknown invoice is refused',
    commerce.recordCommercePayment('cinv-does-not-exist', zambeziActor).ok === false);

  const advances = [];
  for (let i = 0; i < 8; i++) {
    const r = commerce.advanceCommerceShipment(shipmentId, zambeziActor);
    if (r.ok) advances.push(r.value.status);
  }
  test('M10 shipment advancement stops at the end of the EXISTING track',
    advances[advances.length - 1] === 'live_amazon' &&
    commerce.advanceCommerceShipment(shipmentId, zambeziActor).ok === false);

  test('K1 a receiving shortfall is detected against the acknowledged quantity',
    shortReceive.ok === true && shortReceive.value.shortfalls.length === 1 &&
    shortReceive.value.shortfalls[0].receivedQty === 30);
  test('K2 the shortfall auto-raises a shortage-claim exception on the EXISTING ledger',
    shortReceive.ok === true && shortReceive.value.deductions.length === 1 &&
    shortReceive.value.deductions[0].type === 'shortage_claim');
  const shortDeduction = shortReceive.ok ? shortReceive.value.deductions[0] : null;
  test('K3 the exception carries explicit simulation provenance',
    !!shortDeduction && shortDeduction.simulated === true && shortDeduction.mode === 'simulation');
  test('K4 the exception is on the canonical activity trail',
    !!shortDeduction && store.getCommerceActivitiesForBrand(ZAMBEZI).some(
      (a) => a.type === 'exception_raised' && a.deductionId === shortDeduction.id));
  test('K5 the PO still reaches DELIVERED despite the shortfall',
    shortReceive.ok === true && shortReceive.value.po.status === 'delivered');

  /* ══ L. manual exception → dispute → resolution ══ */
  const manual = commerce.raiseCommerceException(poId, 'late_shipment', 77.25, 'Simulated late-delivery exception', zambeziActor);
  test('L1 a manual exception is raised on the EXISTING deduction ledger',
    manual.ok === true && manual.value.status === 'open' &&
    created.ok === true && manual.value.purchaseOrderId === created.value.poNumber);
  test('L2 the manual exception is explicitly simulated', manual.ok === true && manual.value.simulated === true);
  const dispute = manual.ok ? commerce.openCommerceDispute(manual.value.id, 'Simulated dispute notes', zambeziActor) : { ok: false };
  test('L3 a dispute can be opened on the exception', dispute.ok === true && dispute.value.status === 'disputed');
  const resolved = manual.ok ? commerce.resolveCommerceDispute(manual.value.id, 'won', zambeziActor) : { ok: false };
  /**
   * §M9 repoint — Phase E2E made outcome resolution OPERATOR-ONLY (a brand can no
   * longer declare its own dispute outcome; that was a real defect). The old form
   * of L4/L5 used the brand actor and therefore asserted a rule the platform no
   * longer — and should not — follow. The invariant is unchanged: the dispute
   * resolves with a REAL recorded outcome, and resolving it again is refused.
   * The brand-refusal half is now asserted explicitly too.
   */
  test('L4a a BRAND cannot declare its own dispute outcome',
    resolved.ok === false && /operator|CROSS_TENANT|not authorised|forbidden/i.test(resolved.error ?? ''));
  const operatorResolved = manual.ok
    ? commerce.resolveCommerceDispute(manual.value.id, 'won', opsActor)
    : { ok: false };
  test('L4 the dispute resolves with a real outcome (operator decision)',
    operatorResolved.ok === true && operatorResolved.value.status === 'resolved' &&
    operatorResolved.value.dispute.outcome === 'won');
  const resolveAgain = manual.ok ? commerce.resolveCommerceDispute(manual.value.id, 'lost', opsActor) : { ok: false };
  test('L5 resolving an already-resolved dispute is refused', resolveAgain.ok === false);

  /* ══ N. tenant isolation enforced IN THE DOMAIN ══ */
  const foreignRead = commerce.listBrandCommerceActivity(ZAMBEZI, deskforgeActor);
  test('N1 a brand-pinned actor cannot READ another tenant\'s commerce activity',
    foreignRead.ok === false && /CROSS_TENANT/.test(foreignRead.error));
  const foreignAck = commerce.acknowledgeCommercePurchaseOrder(po2, deskforgeActor);
  test('N2 a brand-pinned actor cannot MUTATE another tenant\'s PO',
    foreignAck.ok === false && /CROSS_TENANT/.test(foreignAck.error));
  const foreignException = commerce.raiseCommerceException(poId, 'other', 5, 'cross-tenant attempt', deskforgeActor);
  test('N3 a brand-pinned actor cannot raise an exception on another tenant\'s PO',
    foreignException.ok === false && /CROSS_TENANT/.test(foreignException.error));
  const foreignCreate = await commerce.createCommercePurchaseOrder(ZAMBEZI, ELIGIBLE_SKU, 5, deskforgeActor);
  test('N4 a brand-pinned actor cannot raise a PO for another tenant',
    foreignCreate.ok === false && /CROSS_TENANT/.test(foreignCreate.error));
  test('N5 the ops-wide read is refused for a brand-pinned actor',
    commerce.listAllCommerceActivity(zambeziActor).ok === false);
  const opsAll = commerce.listAllCommerceActivity(opsActor);
  test('N6 an ops actor (no tenant pin) can read the whole operation',
    opsAll.ok === true && opsAll.value.length === store.demoCommerceActivities.length);
  const foreignInvoices = commerce.listBrandCommerceInvoices(DESKFORGE, deskforgeActor);
  test('N7 a brand reads ONLY its own records (empty for a brand with none)',
    foreignInvoices.ok === true && foreignInvoices.value.length === 0);
  test('N8 the foreign attempts wrote NOTHING for the foreign tenant',
    store.getCommerceActivitiesForBrand(DESKFORGE).length === 0 &&
    store.demoCommerceInvoices.filter((i) => i.brandId === DESKFORGE).length === 0 &&
    api.fetchPurchaseOrder(po2)?.brandId === ZAMBEZI);

  /* ══ O. RBAC enforced IN THE DOMAIN ══ */
  const actsBeforeRbac = store.demoCommerceActivities.length;
  const viewCreate = await commerce.createCommercePurchaseOrder(ZAMBEZI, EXCEPTION_SKU, 5, viewOnly);
  test('O1 a view-only account cannot raise a PO (FORBIDDEN)',
    viewCreate.ok === false && /FORBIDDEN/.test(viewCreate.error));
  const viewAck = commerce.acknowledgeCommercePurchaseOrder(po2, viewOnly);
  test('O2 a view-only account cannot acknowledge a PO',
    viewAck.ok === false && /FORBIDDEN/.test(viewAck.error));
  const viewException = commerce.raiseCommerceException(poId, 'other', 5, 'view-only attempt', viewOnly);
  test('O3 a view-only account cannot raise an exception',
    viewException.ok === false && /FORBIDDEN/.test(viewException.error));
  test('O4 the RBAC refusals mutated NOTHING', store.demoCommerceActivities.length === actsBeforeRbac);
  const viewRead = commerce.listBrandCommerceActivity(ZAMBEZI, viewOnly);
  test('O5 a view-only account MAY read (view-only restricts mutation, not sight)',
    viewRead.ok === true && viewRead.value.length > 0);

  /* ══ P. audit on the ONE existing platform log ══ */
  const commerceAudits = store.demoAuditLog.filter((e) => e.entityType === 'commerce');
  test('P1 commerce operations are audited on the existing platform audit log', commerceAudits.length > 0);
  test('P2 every audit entry identifies actor, tenant, entity, action and simulation mode',
    commerceAudits.every((e) => !!e.actorId && e.brandId === ZAMBEZI && !!e.entityId && !!e.action &&
      e.metadata && e.metadata.mode === 'simulation'));
  test('P3 no second audit system was introduced',
    /demoAuditLog\.push/.test(storeSrc) &&
    !/audit_log_2|secondAudit|AuditStore|new AuditLog/i.test(commerceSrc));

  /* ══ Q. the D4 persistence contract ══ */
  test('Q0 the memory adapter is active and honestly non-durable',
    commerce.getCommercePersistenceStatus().backend === 'memory' &&
    commerce.getCommercePersistenceStatus().durable === false);

  const conformance = new ConformanceRepository();
  dr.setDomainRepository(conformance);
  const confInvoice = commerce.issueCommerceInvoice(po2, zambeziActor);
  await commerce.flushCommercePersistence();
  const confActivityRows = [...conformance.rows.values()].filter((r) => r.table === 'commerce_activities');
  test('Q1 an injected durable repository receives the canonical commerce writes',
    confInvoice.ok === true && confActivityRows.length >= 1 &&
    conformance.rows.has(`commerce_invoices:${confInvoice.value.id}`));
  test('Q2 the durable write is reported honestly (backend supabase, durable true)',
    commerce.getCommercePersistenceStatus().backend === 'supabase' &&
    commerce.getCommercePersistenceStatus().durable === true);
  test('Q3 writes are idempotent upserts on the canonical id (no duplicate rows)',
    conformance.writes === conformance.rows.size);
  const confScope = await dr.getDomainRepository().hydrate({ kind: 'brand', tenantId: ZAMBEZI });
  const confForeign = await dr.getDomainRepository().hydrate({ kind: 'brand', tenantId: DESKFORGE });
  test('Q4 hydrate respects tenant scope (a brand sees only its own rows)',
    confScope.commerceInvoices.length >= 1 && confForeign.commerceInvoices.length === 0);
  conformance.failNext = true;
  const failedWrite = await conformance.persistCommerceActivity({ id: 'com-conf-fail', brandId: ZAMBEZI }, ZAMBEZI);
  test('Q5 the durable adapter reports an explicit failure, never a silent success',
    conformance.failNext === false && failedWrite.ok === false && !!failedWrite.error);
  dr.resetDomainRepository();
  test('Q6 the factory-selected repository is restored after conformance testing',
    dr.getDomainRepository().backend === 'memory');

  /* ══ R. provider safety + zero network ══ */
  test('R1 UNKNOWN is never simulation-safe (the fail-closed provider gate is preserved)',
    integrations.isProviderSimulationSafe('unknown') === false &&
    integrations.isProviderSimulationSafe(undefined) === false &&
    integrations.isProviderSimulationSafe('not_registered') === false &&
    integrations.isProviderSimulationSafe('simulation') === true);
  test('R2 the commerce lifecycle contains NO direct network call',
    !/fetch\s*\(/.test(commerceSrc) && !/XMLHttpRequest/.test(commerceSrc));
  test('R3 the commerce lifecycle never imports a live provider client',
    !/spapi\/client|dhl\/client|services\/xero|postmarkNotifier/i.test(commerceSrc));
  test('R4 ZERO external network calls occurred across the whole suite', externalFetches === 0);

  /* ══ S. architecture invariants ══ */
  const apiSrc = readSrc('src/data/api.ts');
  test('S1 createPurchaseOrder STILL performs its real notification (behaviour untouched)',
    /export function createPurchaseOrder\(/.test(apiSrc) && /sendPostmarkEmail/.test(apiSrc));
  const simStart = apiSrc.indexOf('export function createSimulatedPurchaseOrder');
  const simEnd = apiSrc.indexOf('/**\n * §Stage-24', simStart);
  const simBody = simStart >= 0 && simEnd > simStart ? apiSrc.slice(simStart, simEnd) : '';
  test('S2 the simulation-safe PO path sends NO email and touches NO provider',
    simStart >= 0 && simEnd > simStart && !/sendPostmarkEmail|fetch\s*\(|supabase/i.test(simBody));
  test('S3 the eligibility verdict is derived from the E3 lifecycle, never re-implemented',
    /from '@\/lib\/catalog\/catalogLifecycle'/.test(commerceSrc) &&
    !/REQUIRED_SUBMISSION_FIELDS|evaluateComplianceGate/.test(commerceSrc));

  const migDir = fileURLToPath(new URL('../supabase/migrations/', import.meta.url));
  const migFiles = readdirSync(migDir).filter((f) => f.startsWith('023'));
  test('S4 the E4 persistence migration exists (additive, after 022)', migFiles.length === 1);
  const mig = migFiles.length ? readFileSync(`${migDir}${migFiles[0]}`, 'utf8') : '';
  test('S5 it creates the four operational tables with RLS + brand isolation',
    ['commerce_purchase_orders', 'commerce_invoices', 'commerce_payments', 'commerce_activities'].every(
      (t) => new RegExp(`CREATE TABLE IF NOT EXISTS ${t} \\(`).test(mig) &&
        new RegExp(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`).test(mig) &&
        new RegExp(`CREATE POLICY "brand_own_${t}"`).test(mig)));
  test('S6 no blanket using(true) and no destructive statement',
    !/using\s*\(\s*true\s*\)/i.test(mig) &&
    !/DROP TABLE|DROP COLUMN|DELETE FROM/i.test(mig) &&
    !/ALTER TABLE (products|purchase_orders|shipments|deductions|billing_invoices)\b/.test(mig));
  test('S7 simulated provenance is NOT NULL on every operational table',
    (mig.match(/simulated boolean NOT NULL DEFAULT true/g) || []).length === 4);
  test('S8 the pre-existing migrations 001–022 are untouched (exactly 22 legacy files)',
    readdirSync(migDir).filter((f) => /^0(0[1-9]|1[0-9]|2[0-2])/.test(f)).length === 22);
  test('S9 no second database / ORM was introduced anywhere in the phase',
    !/(?:from|require\()\s*['"](?:dexie|sqlite3|better-sqlite3|@prisma\/client|typeorm|knex)['"]\)?/i.test(
      commerceSrc + storeSrc + readSrc('src/data/domainRepository.ts')) &&
    !/indexedDB\.open|localStorage\.setItem|new Dexie\(/.test(commerceSrc + storeSrc));

  test('T1 still zero external network calls after every assertion', externalFetches === 0);

  console.log(failures === 0
    ? 'E4_COMMERCE_VALIDATION_PASS'
    : `E4_COMMERCE_VALIDATION_FAIL (${failures})`);
} catch (err) {
  console.log('VALIDATOR ERROR: ' + (err && err.stack ? err.stack : String(err)));
  failures++;
} finally {
  globalThis.fetch = originalFetch;
  await server.close();
}
if (failures > 0) process.exit(1);
