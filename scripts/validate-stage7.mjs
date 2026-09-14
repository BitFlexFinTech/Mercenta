// Stage 7 validation: catalog transform, PO→commission drafts incl. the
// £10k auto-approve boundary, SP-API client gating (mock transport), and
// locked/unlocked Retail Pipeline renders.
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
// Static import (not ssrLoadModule) so this is the SAME react-query instance
// the app modules use — otherwise the provider/context pairing breaks.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });

let failures = 0;
function test(name, cond) {
  console.log(`${cond ? '✓' : '✗'} ${name}`);
  if (!cond) failures++;
}

try {
  const t = await server.ssrLoadModule('/src/lib/spapi/transform.ts');
    const clientMod = await server.ssrLoadModule('/src/lib/spapi/client.ts');

  // ── Catalog transform ──
  const product = {
    id: 'p1', name: 'Test Oil', sku: 'SKU-1', barcode: '6001234567890',
    image: '📦', exWorksPrice: 10, ukRetailPrice: 25,
    commodityCode: '1515906090', vatStatus: 'Zero-rated', hazmat: false,
    length: 10, width: 10, height: 20, weight: 0.5,
  };
  const payload = t.transformProductForCatalog(product, { category: 'Health & Personal Care' });
  test('transform produces UK marketplace payload',
    payload !== null && payload.marketplaceId === t.UK_MARKETPLACE_ID);
  test('transform carries sku/gtin/pricing/compliance/dimensions',
    payload.product.sku === 'SKU-1' && payload.product.gtin === '6001234567890' &&
      payload.product.pricing.currency === 'GBP' &&
      payload.product.compliance.commodityCode === '1515906090' &&
      payload.product.dimensions.weightKg === 0.5);

  // §13 guard: non-approved category is rejected outright.
  const badCategory = t.transformProductForCatalog(product, { category: 'Toys' });
  test('non-approved category rejected (§13)', badCategory === null);

  // ── PO → commission drafts + £10k threshold ──
  const smallPO = t.draftCommissionFromPO({ purchaseOrderId: 'PO-A', poValue: 9800 }, 12);
  const bigPO = t.draftCommissionFromPO({ purchaseOrderId: 'PO-B', poValue: 12400 }, 12);
  const edgePO = t.draftCommissionFromPO({ purchaseOrderId: 'PO-C', poValue: 10000 }, 12);
  test('£9,800 PO → £1,176 commission, auto-approved',
    smallPO.commissionAmount === 1176 && smallPO.autoApprove === true);
  test('£12,400 PO → held for approval',
    bigPO.autoApprove === false);
  test('exactly £10k PO → held (threshold is <)', edgePO.autoApprove === false);

  // ── Client gating (mock transport must never be called when locked) ──
  let transportCalls = 0;
  const countingTransport = async () => { transportCalls++; return { ok: true, status: 200, json: async () => ({}) }; };

  const lockedClient = clientMod.createSpApiClient(() => null, '/fn', countingTransport);
  let threwLocked = '';
  try { await lockedClient.submitCatalogItem({}); }
  catch (e) { threwLocked = e.message; }
  test('disconnected → throws connect-required error',
    /not connected/i.test(threwLocked) && transportCalls === 0);

  const sandboxCreds = { secretRef: 'vault:sandbox', marketplaceId: 'A1F83G8C2ARO7P', verified: false };
  const sandboxClient = clientMod.createSpApiClient(() => sandboxCreds, '/fn', countingTransport);
  let threwSandbox = '';
  try { await sandboxClient.submitCatalogItem({}); }
  catch (e) { threwSandbox = e.message; }
  test('sandbox-only connection refuses to submit',
    /sandbox/i.test(threwSandbox) && transportCalls === 0);

  // Verified connection → transport actually used.
  const liveCreds = { secretRef: 'vault:live', marketplaceId: 'A1F83G8C2ARO7P', verified: true };
  const liveClient = clientMod.createSpApiClient(() => liveCreds, '/fn', countingTransport);
  const subResult = await liveClient.submitCatalogItem(payload);
  test('verified connection submits through transport', subResult.ok === true && transportCalls === 1);

  // ── Panel renders ──
  const ctxMod = await server.ssrLoadModule('/src/integrations/IntegrationsContext.tsx');
  const typesMod = await server.ssrLoadModule('/src/integrations/types.ts');
  const panelMod = await server.ssrLoadModule('/src/components/admin/RetailPipeline.tsx');
  // §Stage-25 — DeliveryReconciliation consumes useApp, so panel renders are
  // wrapped in AppProvider exactly as the real admin shell does.
  const globalCtxMod = await server.ssrLoadModule('/src/context/GlobalStateContext.tsx');
  const AppProviderEl = (children, integrationsState) =>
    createElement(globalCtxMod.AppProvider, null,
      createElement(ctxMod.IntegrationsProvider,
        integrationsState ? { initialState: integrationsState } : null,
        createElement(QueryClientProvider, { client: pipelineQc }, children)));
  // RetailPipeline reads through React Query hooks (Stage-16 refactor), so both
  // renders need a QueryClientProvider with the pipeline caches hydrated.
  const apiMod = await server.ssrLoadModule('/src/data/api.ts');
  const pipelineQc = new QueryClient();
  pipelineQc.setQueryData(['purchase-orders'], { data: (await apiMod.fetchPurchaseOrders()).data, source: 'seed' });
  pipelineQc.setQueryData(['deductions'], { data: (await apiMod.fetchDeductions()).data, source: 'seed' });
  pipelineQc.setQueryData(['catalog-submissions'], { data: (await apiMod.fetchCatalogSubmissions()).data, source: 'seed' });

  // §Phase M10 — REPOINTED. The disconnected "locked" gate was deliberately
  // removed from the DEMO path (the comment in RetailPipelinePanel records why:
  // it hid every feature from investors). The invariants that must still hold —
  // and are asserted here — are:
  //   1. the demo path is usable WITHOUT a live Amazon connection, and
  //   2. it labels itself honestly as investor-demo/simulated data rather than
  //      implying a real SP-API connection;
  //   3. the refusal component that DOES gate production wiring still exists, so
  //      the locked state was not deleted, only unwired in demo mode.
  const initialMap = structuredClone(typesMod.INITIAL_INTEGRATIONS);
  const demoCfg = await server.ssrLoadModule('/src/config/demo.ts');
  const pipelineSrc = readFileSync('src/components/admin/RetailPipeline.tsx', 'utf8');
  const htmlLocked = renderToString(
    AppProviderEl(createElement(panelMod.RetailPipelinePanel))
  );
  test('demo pipeline is usable without a live Amazon connection',
    htmlLocked.includes('Catalog Submissions'));
  test('demo pipeline states its data is simulated (no false live claim)',
    htmlLocked.includes(demoCfg.DEMO_BANNER_TEXT));
  test('the production locked-gate component still exists',
    pipelineSrc.includes('function LockedPipeline') &&
      pipelineSrc.includes('Connect Amazon SP-API to enable this'));

  // Unlocked view requires seeding connected state through the provider.
  const connectedState = {
    amazon_sp_api: {
      status: 'connected',
      sandbox: false,
      provider: 'amazon',
      metadata: { marketplaceId: 'A1F83G8C2ARO7P (UK)' },
      lastVerifiedAt: new Date().toISOString(),
    },
  };
  const htmlUnlocked = renderToString(
    AppProviderEl(createElement(panelMod.RetailPipelinePanel), connectedState)
  );
  test('unlocked view shows catalog submissions', htmlUnlocked.includes('Catalog Submissions'));
  test('rejected submission surfaces reason for human review', htmlUnlocked.includes('GTIN barcode') && htmlUnlocked.includes('never auto-resubmitted'));
  test('PO commission board shows approval split', htmlUnlocked.includes('Auto-invoice') && htmlUnlocked.includes('Held for approval'));
  test('deduction/chargeback log renders', htmlUnlocked.includes('Deductions ') && htmlUnlocked.includes('Chargebacks'));

  console.log(failures === 0 ? 'STAGE7_VALIDATION_PASS' : `STAGE7_VALIDATION_FAIL (${failures} failures)`);
} finally {
  await server.close();
}
process.exitCode = failures === 0 ? 0 : 1;
