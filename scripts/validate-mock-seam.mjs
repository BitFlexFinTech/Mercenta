// Validates the §14 mock-first integration seam:
//   - MockAmazonSPAPIClient submission lifecycle (submitted → review → live,
//     every 4th rejected)
//   - rotating simulated PO pool
//   - factory returns mock while no real credentials exist
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
function test(name, ok) {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failures++;
}

try {
  const mod = await server.ssrLoadModule('/src/lib/spapi/index.ts');
  const apiMod = await server.ssrLoadModule('/src/data/api.ts');
  const { createMockSpApiClient, resetMockAmazonState } = await server.ssrLoadModule(
    '/src/lib/spapi/mockClient.ts'
  );

  // Factory: no credentials → mock mode.
  const { client: factoryClient, mode } = mod.createSPApiClientForConnection({
    credentials: null,
    edgeFunctionBase: '/functions/v1/spapi',
  });
  test('factory returns mock client without credentials', mode === 'mock');

  // Factory: verified real credentials → real mode.
  const real = mod.createSPApiClientForConnection({
    credentials: { secretRef: 'vault://real-ref', marketplaceId: 'A1REAL000', verified: true },
    edgeFunctionBase: '/functions/v1/spapi',
  });
  test('factory returns real client with verified credentials', real.mode === 'real');

  // Mock sandbox ref is never mistaken for a real one.
  test('mock secretRef detected', mod.isMockSecretRef('mock:lwa-token') === true);
  test('real secretRef not flagged', mod.isMockSecretRef('vault://x') === false);

  // Submission lifecycle through api.submitCatalogItem (cleared brand).
  resetMockAmazonState();
  const s1 = await apiMod.submitCatalogItem('brand-astonish', {
    commodityCode: '3304990090', vatStatus: 'Standard 20%', hazmat: false,
    length: 10, width: 10, height: 20, weight: 1,
  });
  test('submission accepted via mock SP-API', s1.ok === true && !!s1.submissionId && s1.mode === 'mock');

  let st = await apiMod.pollSubmissionStatus(s1.submissionId);
  test('poll 1 → submitted', st.status === 'submitted');
  st = await apiMod.pollSubmissionStatus(s1.submissionId);
  test('poll 2 → under_amazon_review', st.status === 'under_amazon_review');
  st = await apiMod.pollSubmissionStatus(s1.submissionId);
  test('poll 3 → live', st.status === 'live');

  // Rejection path: submissions 1-3 were fine; #4 must reject on poll 3.
  for (let i = 0; i < 3; i++) {
    await apiMod.submitCatalogItem('brand-astonish', {
      commodityCode: '3304990090', vatStatus: 'Standard 20%', hazmat: false,
      length: 10, width: 10, height: 20, weight: 1,
    });
  }
  const rejId = `MOCK-SUB-00004`;
  await apiMod.pollSubmissionStatus(rejId);
  await apiMod.pollSubmissionStatus(rejId);
  const rej = await apiMod.pollSubmissionStatus(rejId);
  test('every 4th submission rejects with realistic reason',
    rej.status === 'rejected' && typeof rej.rejectionReason === 'string' && rej.rejectionReason.length > 10);

  /**
   * §P11 — REPOINTED (not weakened). OLD CONTRACT (recorded verbatim):
   *
   *   'PO poll returns simulated POs'
   *     → `po1.ok && po1.purchaseOrders?.length === 2 &&
   *        po1.purchaseOrders[0].purchaseOrderId !== po2.purchaseOrders[0].purchaseOrderId`
   *
   * i.e. the read ROTATED exactly 2 POs per poll. Programme decision 3 makes this
   * read the SOURCE of channel purchase-order ingestion, so it must now carry the
   * PO's own LINES (what Mercenta routes the PO to a brand by) and must be STABLE
   * for a given window — a rotating window would make ingestion's idempotency
   * guard untestable and would mean the same channel PO reappears forever. The
   * invariant is unchanged and is now asserted MORE strongly: the mock returns the
   * exact shape and depth the real client returns, unmistakably simulated, with
   * the fields the caller actually needs.
   */
  const po1 = await apiMod.fetchSpApiPurchaseOrders(new Date().toISOString());
  const po2 = await apiMod.fetchSpApiPurchaseOrders(new Date().toISOString());
  const pos = po1.purchaseOrders ?? [];
  test('PO poll returns the channel’s POs with the fields ingestion ROUTES by',
    po1.ok && pos.length > 0 &&
    pos.every((p) => Array.isArray(p.lines) && p.lines.length > 0 &&
      typeof p.lines[0].vendorSku === 'string' && p.lines[0].vendorSku.length > 0 &&
      typeof p.lines[0].quantity === 'number' &&
      typeof p.shipToPartyId === 'string' && p.shipToPartyId.length > 0));
  test('every simulated PO is unmistakably simulated and DECLARED simulated by the seam',
    pos.every((p) => /^MOCK-PO-/.test(p.purchaseOrderId) && p.simulated === true));
  test('a re-read over the SAME window returns the same set (ingestion idempotency is exercisable)',
    JSON.stringify((po2.purchaseOrders ?? []).map((p) => p.purchaseOrderId)) ===
      JSON.stringify(pos.map((p) => p.purchaseOrderId)));
  test('at least one simulated PO is OUTSIDE the catalogue (the refusal path is reachable)',
    pos.some((p) => p.lines.some((l) => /^MOCK-UNKNOWN-/.test(l.vendorSku))));

  console.log(failures === 0 ? 'MOCK_SEAM_VALIDATION_PASS' : `MOCK_SEAM_VALIDATION_FAIL (${failures})`);
} finally {
  await server.close();
}
if (failures > 0) process.exit(1);
