// Stage 1 (review pass) validation: demo dataset coverage + PO workflow
// store mutations visible across fetchers + panel renders with banners.
import { createServer } from 'vite';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });

let failures = 0;
function test(name, cond) {
  console.log(`${cond ? '✓' : '✗'} ${name}`);
  if (!cond) failures++;
}

try {
  const api = await server.ssrLoadModule('/src/data/api.ts');
  const store = await server.ssrLoadModule('/src/data/demoStore.ts');
  const demo = await server.ssrLoadModule('/src/data/demoData.ts');

  // ── Coverage ──
  const brands = (await api.fetchBrands()).data;
  // §Phase 7F — derive from the canonical dataset instead of a hardcoded count
  // (the dataset now includes 2 deterministic compliance-scenario tenants).
  test('every canonical demo brand is seeded', brands.length === demo.ALL_DEMO_BRANDS.length);
  const categoriesCovered = new Set(brands.map((b) => b.category));
  const missing = demo.approvedCategories?.() ?? [];
  // All 10 approved categories present:
  const catsMod = await server.ssrLoadModule('/src/types.ts');
  const approved = catsMod.APPROVED_CATEGORIES;
  const allCovered = approved.every((c) => categoriesCovered.has(c));
  test('all 10 approved categories covered', allCovered);

  // ── PO states ──
  const pos = (await api.fetchPurchaseOrders()).data;
  const statuses = new Set(pos.map((p) => p.status));
  // §Phase 7F — derive from the canonical seed (cleared tenants only have POs;
  // the compliant-state matrix tenants intentionally have none yet).
  test('every canonical purchase order is seeded', pos.length === demo.DEMO_PURCHASE_ORDERS.length);
  // §Phase M10 — REPOINTED. The previous assertion required the SEED to contain
  // all seven PO states. That is no longer true by owner-level decision (recorded
  // in PROJECT_STATUS §M9): no seeded PO is in a shipping state, so
  // DEMO_SHIPMENTS is legitimately empty and demo data must not be edited to
  // manufacture coverage. The invariant that actually holds — and that actually
  // protects the workflow — is asserted instead, against the canonical SSOT:
  //   (a) every seeded PO carries a status from the canonical workflow vocabulary;
  //   (b) that vocabulary covers all seven states.
  // Runtime coverage of ready_to_fulfil/shipped/delivered is proven by
  // scripts/validate-investor-demo.mjs (the canonical 24-stage lifecycle).
  const statusMod = await server.ssrLoadModule('/src/lib/statusPresentation.ts');
  test('every seeded PO uses a canonical workflow status',
    pos.every((p) => statusMod.PO_STATUS_ORDER.includes(p.status)));
  test('the canonical PO workflow vocabulary covers every state',
    ['received', 'under_review', 'accepted', 'rejected', 'ready_to_fulfil', 'shipped', 'delivered']
      .every((s) => statusMod.PO_STATUS_ORDER.includes(s)));
  test('rejected POs carry logged reasons',
    pos.filter((p) => p.status === 'rejected').every((p) => Boolean(p.rejectionReason)));

  // ── Shipments across the CANONICAL carrier accounts ──
  // §Phase M10 — REPOINTED from the retired FedEx/BAK carrier set to the
  // canonical shipping model (§11): international → DHL, UK domestic →
  // Palletline, partnered pseudo-carrier only on Freight Collect. The routing
  // rule is read from its single declaration (src/config/shipping.ts) instead of
  // being re-stated here, and the retired carriers are asserted ABSENT.
  // The seeded shipment set is empty by owner decision (§M9 finding); the
  // shipment lifecycle itself is proven by validate-canonical-model.mjs and
  // validate-investor-demo.mjs.
  const shipping = await server.ssrLoadModule('/src/config/shipping.ts');
  const shipments = (await api.fetchShipmentsAll()).data;
  const carriers = new Set(shipments.map((s) => s.carrier));
  test('every seeded shipment uses a canonical Mercenta carrier account',
    [...carriers].every((c) =>
      shipping.MERCENTA_CARRIER_ACCOUNTS.includes(c) || c === shipping.AMAZON_PARTNERED_CARRIER));
  test('canonical carrier accounts are exactly DHL + Palletline',
    shipping.MERCENTA_CARRIER_ACCOUNTS.length === 2 &&
      shipping.MERCENTA_CARRIER_ACCOUNTS.includes('dhl') &&
      shipping.MERCENTA_CARRIER_ACCOUNTS.includes('palletline'));
  test('lane routing resolves international → DHL and UK domestic → Palletline',
    shipping.SHIPPING_CARRIER_ROUTING.international === 'dhl' &&
      shipping.SHIPPING_CARRIER_ROUTING.uk_domestic === 'palletline');
  test('the retired carriers are no longer Mercenta carrier accounts',
    ['fedex', 'bak'].every((c) => !shipping.MERCENTA_CARRIER_ACCOUNTS.includes(c)));

  // ── Contracts / compliance / messages variety ──
  const contracts = (await api.fetchContracts()).data;
  const contractStates = new Set(contracts.map((c) => c.status));
  test('contracts in ≥4 distinct states', contractStates.size >= 4);
  const docs = (await api.fetchComplianceDocuments()).data;
  const docStates = new Set(docs.map((d) => d.status));
  test('compliance docs in varied states', docStates.size >= 3);
  const msgs = (await api.fetchMessages()).data;
  test('message threads for every brand', msgs.length >= brands.length);
  test('hot-lead message flagged requiresHuman',
    msgs.some((m) => m.requiresHuman === true));

  // ── Fulfillment scores sum invariant ──
  const scores = (await api.fetchFulfillmentScores()).data;
  test('scores sum correctly for all brands',
    scores.every((s) =>
      s.tradingHistoryScore + s.exportExperienceScore + s.scaleScore +
      s.workingCapitalScore + s.categoryRiskScore + s.reliabilityScore === s.totalScore));

  // ── PO workflow mutation visibility ──
  const receivedPO = pos.find((p) => p.status === 'received');
  await api.updatePurchaseOrderStatus(receivedPO.id, 'accepted');
  const reread = (await api.fetchPurchaseOrders()).data.find((p) => p.id === receivedPO.id);
  test('accept mutation persists in shared store', reread.status === 'accepted');

  // ── Panel renders with demo data + banner ──
  const ctxMod = await server.ssrLoadModule('/src/integrations/IntegrationsContext.tsx');
  const appCtx = await server.ssrLoadModule('/src/context/GlobalStateContext.tsx');
  const typesInt = await server.ssrLoadModule('/src/integrations/types.ts');
  const pipeMod = await server.ssrLoadModule('/src/components/admin/RetailPipeline.tsx');
  const billMod = await server.ssrLoadModule('/src/components/admin/BillingPanel.tsx');

  const qc = new QueryClient();
  qc.setQueryData(['brands'], { data: brands, source: 'seed' });
  qc.setQueryData(['purchase_orders'], { data: pos, source: 'seed' });
  qc.setQueryData(['subscriptions'], { data: (await api.fetchSubscriptions()).data, source: 'seed' });
  qc.setQueryData(['commissions'], { data: (await api.fetchCommissions()).data, source: 'seed' });

  const connectedState = {
    amazon_sp_api: { status: 'connected', sandbox: false, lastVerifiedAt: new Date().toISOString(), metadata: {} },
    stripe: { status: 'connected', sandbox: false, lastVerifiedAt: new Date().toISOString(), metadata: {} },
  };

  const pipeHtml = renderToString(
    createElement(appCtx.AppProvider, null,
      createElement(ctxMod.IntegrationsProvider, { initialState: connectedState },
        createElement(QueryClientProvider, { client: qc },
          createElement(pipeMod.RetailPipelinePanel))))
  );
  test('retail pipeline shows live-shaped demo submissions', pipeHtml.includes('Catalog Submissions'));
  // §Phase M10 — the banner text is read from its single declaration
  // (src/config/demo.ts) instead of a hardcoded 'Demo data' literal, so the
  // assertion can never drift from the copy the platform actually shows.
  const demoCfg = await server.ssrLoadModule('/src/config/demo.ts');
  test('retail pipeline shows the canonical investor-demo notice',
    demoCfg.DEMO_MODE === true && pipeHtml.includes(demoCfg.DEMO_BANNER_TEXT));

  const billHtml = renderToString(
    createElement(appCtx.AppProvider, null,
      createElement(ctxMod.IntegrationsProvider, { initialState: connectedState },
        createElement(QueryClientProvider, { client: qc },
          createElement(billMod.BillingPanel))))
  );
  test('billing shows subscription table with demo rows', billHtml.includes('Brand Subscriptions'));
  test('billing shows the canonical investor-demo notice',
    billHtml.includes(demoCfg.DEMO_BANNER_TEXT));

  console.log(failures === 0 ? 'STAGE1_REVIEW_PASS' : `STAGE1_REVIEW_FAIL (${failures} failures)`);
} finally {
  await server.close();
}
process.exitCode = failures === 0 ? 0 : 1;
