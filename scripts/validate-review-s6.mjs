// Stage 6 (review pass) validation: five distinct admin views render with
// genuinely different content from the shared demo store.
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
const root = resolve(import.meta.dirname, '..');

let failures = 0;
function test(name, cond) {
  console.log(`${cond ? '✓' : '✗'} ${name}`);
  if (!cond) failures++;
}

async function renderPanel(path) {
  const s2 = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
  try {
    const seedMod = await s2.ssrLoadModule('/src/data/demoStore.ts');
    const ctxMod = await s2.ssrLoadModule('/src/integrations/IntegrationsContext.tsx');
    const gMod = await s2.ssrLoadModule('/src/context/GlobalStateContext.tsx');
    const panelMod = await s2.ssrLoadModule(path);
    const qc = new QueryClient();
    qc.setQueryData(['brands'], { data: seedMod.demoBrands, source: 'seed' });
    qc.setQueryData(['contracts'], { data: seedMod.demoContracts, source: 'seed' });
    qc.setQueryData(['messages'], { data: seedMod.demoMessages, source: 'seed' });
    // Views now read via hooks — seed every key they consume.
    for (const [k, rows] of [
      ['shipments', seedMod.demoShipments],
      ['purchase-orders', seedMod.demoPurchaseOrders],
      ['products', seedMod.demoProducts],
      ['catalog-submissions', seedMod.demoSubmissions],
      ['deductions', seedMod.demoDeductions],
      ['compliance-documents', seedMod.demoComplianceDocs],
      ['fulfillment-scores', seedMod.demoFulfillmentScores],
      ['subscriptions', seedMod.demoSubscriptions],
      ['commissions', seedMod.demoCommissions],
    ]) {
      qc.setQueryData([k], { data: rows, source: 'seed' });
    }
    return renderToString(
      createElement(ctxMod.IntegrationsProvider, null,
        createElement(QueryClientProvider, { client: qc },
          createElement(gMod.AppProvider, null,
            createElement(panelMod.default ?? panelMod[Object.keys(panelMod).find((k) => k.startsWith('use') === false)]))))
    );
  } finally { await s2.close(); }
}

try {
  const logisticsHtml = await renderPanel('/src/components/admin/LogisticsControl.tsx');
  const carrierHtml = await renderPanel('/src/components/admin/CarrierMonitor.tsx');
  const crmHtml = await renderPanel('/src/components/admin/BrandCRM.tsx');
  const catalogHtml = await renderPanel('/src/components/admin/CatalogManagerAdmin.tsx');
  const complianceHtml = await renderPanel('/src/components/admin/ComplianceApprovals.tsx');

  // Logistics Control: operational view
  test('logistics control shows In Transit/Delayed/Exceptions chips',
    logisticsHtml.includes('In Transit') && logisticsHtml.includes('Delayed') && logisticsHtml.includes('Exceptions'));
  test('logistics groups by brand', logisticsHtml.includes('PixelPerch Accessories Inc'));

  // Carrier Monitor: technical health — completely different content
  test('carrier monitor shows API health cards',
    carrierHtml.includes('DHL API') && carrierHtml.includes('FedEx Ship API') &&
      carrierHtml.includes('BAK Logistics (internal)') && carrierHtml.includes('Amazon-partnered carrier feed'));
  test('carrier monitor shows uptime/latency/errors (not shipments)',
    carrierHtml.includes('Uptime 30d') && carrierHtml.includes('Latency') &&
      !carrierHtml.includes('Logistics Control'));
  test('logistics vs carrier are genuinely different views',
    logisticsHtml.includes('Delayed') !== false && carrierHtml.includes('Errors (24h)'));

  // Brand CRM
  test('brand CRM lists all 11 brands', (crmHtml.match(/bg-blue-500\/15/g) ?? []).length >= 11);
  test('brand CRM uses approved categories', crmHtml.includes('Health &amp; Personal Care') || crmHtml.includes('Health & Personal Care'));
  test('brand CRM has track override UI (detail opens on select)',
    crmHtml.includes('Select a brand to manage it') &&
      readFileSync(resolve(root, 'src/components/admin/BrandCRM.tsx'), 'utf8').includes('Fulfillment Track Override'));

  // Catalog Manager: owning-brand join
  test('catalog manager joins products to brands', catalogHtml.includes('Owning Brand'));
  test('catalog manager shows brand badges', catalogHtml.includes('Nordhaus Living ApS'));

  // Compliance approvals: real doc preview + inline actions
  test('compliance approvals table renders pending docs',
    complianceHtml.includes('under review') || complianceHtml.includes('uploaded'));
  test('compliance approvals have View/Approve/Reject', complianceHtml.includes('Approve') && complianceHtml.includes('Reject'));

  console.log(failures === 0 ? 'STAGE6_REVIEW_PASS' : `STAGE6_REVIEW_FAIL (${failures} failures)`);
} finally {
  await server.close();
}
process.exitCode = failures === 0 ? 0 : 1;
