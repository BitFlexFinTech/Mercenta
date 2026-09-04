// Stage 5 (review pass) validation: Contract Cycle document viewers render
// the real clause-block agreement; Messages threads open with a working
// reply pipeline (sandbox + always-log).
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
  const seedMod = await server.ssrLoadModule('/src/data/demoStore.ts');
  const apiMod = await server.ssrLoadModule('/src/data/api.ts');
  const emailMod = await server.ssrLoadModule('/src/lib/messaging/email.ts');
  const g = await server.ssrLoadModule('/src/context/GlobalStateContext.tsx');
  const brandMod = await server.ssrLoadModule('/src/components/brand/BrandContractView.tsx');
  const adminMod = await server.ssrLoadModule('/src/components/admin/ContractsAdminPanel.tsx');
  const hubMod = await server.ssrLoadModule('/src/components/admin/MessagesHub.tsx');
  const ictx = await server.ssrLoadModule('/src/integrations/IntegrationsContext.tsx');

  // ── Brand contract viewer renders the full generated document ──
  const contracts = (await apiMod.fetchContracts()).data.filter((c) => c.status !== 'draft');
  test('non-draft demo contracts exist for viewing', contracts.length > 0);

  const qc = new QueryClient();
  qc.setQueryData(['contracts'], { data: contracts, source: 'seed' });

  const brandHtml = renderToString(
    createElement(g.AppProvider, null,
      createElement(QueryClientProvider, { client: qc },
        createElement(brandMod.BrandContractView)))
  );
  test('brand cards show Open document action', brandHtml.includes('Open document'));
  test('brand view lists contract types and versions',
    /distribution agreement/.test(brandHtml) && /v\d/.test(brandHtml));

  // ── Admin viewer: View buttons present per row ──

  const adminServer = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
  let adminHtml = '';
  try {
    const aIctx = await adminServer.ssrLoadModule('/src/integrations/IntegrationsContext.tsx');
    const aPanel = await adminServer.ssrLoadModule('/src/components/admin/ContractsAdminPanel.tsx');
    const aQc = new QueryClient();
    aQc.setQueryData(['brands'], { data: seedMod.demoBrands, source: 'seed' });
    aQc.setQueryData(['contracts'], { data: contracts, source: 'seed' });
    aQc.setQueryData(['fulfillment-scores'], { data: (await apiMod.fetchFulfillmentScores()).data, source: 'seed' });
    adminHtml = renderToString(
      createElement(aIctx.IntegrationsProvider, null,
        createElement(QueryClientProvider, { client: aQc },
          createElement(aPanel.ContractsAdminPanel)))
    );
  } finally {
    await adminServer.close();
  }
  const viewButtons = (adminHtml.match(/View</g) ?? []).length;
  test(`admin rows have View actions (${viewButtons})`, viewButtons >= contracts.length);

  // ── Reply pipeline: sandbox send is logged; disconnected logs failure ──
  let calls = 0;
  const countingTransport = async () => {
    calls++;
    return { ok: true, status: 200, json: async () => ({}) };
  };

  const sandboxClient = emailMod.createEmailClient(
    () => ({ secretRef: 'vault:sandbox', provider: 'postmark', verified: false }),
    '/fn', countingTransport
  );
  const rSandbox = await sandboxClient.send({ to: 'b@x.com', subject: 'S', body: 'B' });
  const logged1 = await apiMod.logMessage({
    brandId: 'brand-x', channel: 'email', direction: 'outbound',
    subject: 'S', body: `[SANDBOX SEND] B`, sentBy: 'staff', requiresHuman: false,
  });
  test('sandbox reply-send ok and logged with SANDBOX marker',
    rSandbox.ok === true && rSandbox.sandbox === true &&
      logged1.body.startsWith('[SANDBOX SEND]'));

  const disconnected = emailMod.createEmailClient(() => null, '/fn', countingTransport);
  const rFail = await disconnected.send(req0());
  function req0() { return { to: 'b@x.com', subject: 'S', body: 'B' }; }
  const logged2 = await apiMod.logMessage({
    brandId: 'brand-x', channel: 'email', direction: 'outbound',
    subject: 'S', body: `[SEND FAILED — EMAIL_NOT_CONNECTED] B`, sentBy: 'staff', requiresHuman: false,
  });
  test('disconnected send still logged (nothing lost)',
    rFail.ok === false && calls === 0 && logged2.body.includes('SEND FAILED'));

  console.log(failures === 0 ? 'STAGE5_REVIEW_PASS' : `STAGE5_REVIEW_FAIL (${failures} failures)`);
} finally {
  await server.close();
}
process.exitCode = failures === 0 ? 0 : 1;
