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
  test('every PO status represented',
    ['received', 'under_review', 'accepted', 'rejected', 'ready_to_fulfil', 'shipped', 'delivered']
      .every((s) => statuses.has(s)));
  test('rejected POs carry logged reasons',
    pos.filter((p) => p.status === 'rejected').every((p) => Boolean(p.rejectionReason)));

  // ── Shipments across carriers ──
  const shipments = (await api.fetchShipmentsAll()).data;
  const carriers = new Set(shipments.map((s) => s.carrier));
  test('shipments cover DHL/FedEx/BAK/amazon-partnered',
    ['dhl', 'fedex', 'bak', 'amazon_partner'].every((c) => carriers.has(c)));

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
  test('demo banner shown on retail pipeline', pipeHtml.includes('Demo data'));

  const billHtml = renderToString(
    createElement(appCtx.AppProvider, null,
      createElement(ctxMod.IntegrationsProvider, { initialState: connectedState },
        createElement(QueryClientProvider, { client: qc },
          createElement(billMod.BillingPanel))))
  );
  test('billing shows subscription table with demo rows', billHtml.includes('Brand Subscriptions'));
  test('demo banner shown on billing', billHtml.includes('Demo data'));

  console.log(failures === 0 ? 'STAGE1_REVIEW_PASS' : `STAGE1_REVIEW_FAIL (${failures} failures)`);
} finally {
  await server.close();
}
process.exitCode = failures === 0 ? 0 : 1;
