// Stage 4 validation: renders the real IntegrationsPanel through Vite's
// module loader and asserts on actual rendered output; also verifies the
// connection-gating rule that sandbox connects never count as verified.
import { createServer } from 'vite';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';

const server = await createServer({
  server: { middlewareMode: true },
  logLevel: 'error',
});

try {
  const panelMod = await server.ssrLoadModule(
    '/src/components/admin/integrations/IntegrationsPanel.tsx'
  );
  const ctxMod = await server.ssrLoadModule('/src/integrations/IntegrationsContext.tsx');
  const typesMod = await server.ssrLoadModule('/src/integrations/types.ts');

  const html = renderToString(
    createElement(ctxMod.IntegrationsProvider, null, createElement(panelMod.IntegrationsPanel))
  );

  const expectedCards = [
    'Amazon Selling Partner API',
    'Amazon Ads API',
    'Stripe',
    'E-Signature',
    'Transactional Email',
    'Lead Sourcing',
  ];
  const missing = expectedCards.filter((n) => !html.includes(n));
  console.log('all 6 integration cards rendered:', missing.length === 0);
  if (missing.length) console.log('  missing:', missing.join(', '));
  console.log('cards show Not connected initially:', html.includes('Not connected'));
  console.log(
    'sandbox warning banner present:',
    html.includes('sandbox mode')
  );

  // Gating rule: sandbox/connected states must NOT satisfy isConnected()
  const { isConnected } = typesMod;
  const sandboxConnected = {
    status: 'connected',
    sandbox: true,
    lastVerifiedAt: new Date().toISOString(),
  };
  const liveConnected = { status: 'connected', sandbox: false };
  const gateSandbox = isConnected(sandboxConnected);
  const gateLive = isConnected(liveConnected);
  const gateDisconnected = isConnected({ status: 'disconnected', sandbox: false });
  console.log('gate blocks sandbox-connected:', gateSandbox === false);
  console.log('gate allows live-connected:', gateLive === true);
  console.log('gate blocks disconnected:', gateDisconnected === false);

  const pass =
    missing.length === 0 &&
    html.includes('Not connected') &&
    html.includes('sandbox mode') &&
    gateSandbox === false &&
    gateLive === true &&
    gateDisconnected === false;

  console.log(pass ? 'STAGE4_VALIDATION_PASS' : 'STAGE4_VALIDATION_FAIL');
} finally {
  await server.close();
}
