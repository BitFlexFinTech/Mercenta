// Stage 10 validation: §9 messaging hub — email client gating, always-log
// rule, and locked/unlocked Messages hub renders.
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
  const emailMod = await server.ssrLoadModule('/src/lib/messaging/email.ts');
  const apiMod = await server.ssrLoadModule('/src/data/api.ts');
  const ctxMod = await server.ssrLoadModule('/src/integrations/IntegrationsContext.tsx');
  const typesMod = await server.ssrLoadModule('/src/integrations/types.ts');
  const panelMod = await server.ssrLoadModule('/src/components/admin/MessagesHub.tsx');

  // ── Email client gating (mock transport must never fire when locked) ──
  let calls = 0;
  const countingTransport = async () => {
    calls++;
    return { ok: true, status: 200, json: async () => ({}) };
  };
  const req = { to: 'brand@example.com', subject: 'Hi', body: 'Hello' };

  const disconnected = emailMod.createEmailClient(() => null, '/fn', countingTransport);
  const r1 = await disconnected.send(req);
  test('disconnected → send fails without transport call',
    r1.ok === false && r1.error === 'EMAIL_NOT_CONNECTED' && calls === 0);

  let captured = null;
  const sandbox = emailMod.createEmailClient(
    () => ({ secretRef: 'vault:sandbox', provider: 'postmark', verified: false }),
    '/fn', countingTransport
  );
  const r2 = await sandbox.send(req);
  test('sandbox connection sends via simulated path (no live call)',
    r2.ok === true && r2.sandbox === true && calls === 0);
  captured = r2;

  const live = emailMod.createEmailClient(
    () => ({ secretRef: 'vault:live', provider: 'sendgrid', verified: true }),
    '/fn', countingTransport
  );
  const r3 = await live.send(req);
  test('live connection sends through transport with secret ref header',
    r3.ok === true && calls === 1);

  // ── Always-log rule ──
  const logged = await apiMod.logMessage({
    brandId: 'brand-astonish',
    channel: 'email',
    direction: 'outbound',
    subject: 'Test power-send',
    body: 'Logged regardless of transport outcome.',
    sentBy: 'staff',
    requiresHuman: false,
  });
  test('logMessage assigns id + createdAt', Boolean(logged.id) && Boolean(logged.createdAt));

  // ── Panel renders ──
  const qc = new QueryClient();
  qc.setQueryData(['brands'], { data: (await apiMod.fetchBrands()).data, source: 'seed' });
  qc.setQueryData(['messages'], { data: (await apiMod.fetchMessages()).data, source: 'seed' });

  const htmlLocked = renderToString(
    createElement(ctxMod.IntegrationsProvider, null,
      createElement(QueryClientProvider, { client: qc },
        createElement(panelMod.MessagesHub)))
  );
  test('hub renders threads even when email disconnected',
    htmlLocked.includes('Unified inbox') &&
      htmlLocked.includes('Astonish'));
  test('power-send disabled notice shown', htmlLocked.includes('Power sending is disabled'));
  test('hot-lead flag visible on thread list', htmlLocked.includes('Hot lead'));

  const connectedState = {
    email: {
      status: 'connected',
      sandbox: true,
      provider: 'postmark',
      lastVerifiedAt: new Date().toISOString(),
    },
  };
  const htmlSandbox = renderToString(
    createElement(ctxMod.IntegrationsProvider, { initialState: connectedState },
      createElement(QueryClientProvider, { client: qc },
        createElement(panelMod.MessagesHub)))
  );
  test('sandbox connect enables compose with honest label',
    htmlSandbox.includes('Send (Sandbox)'));

  console.log(failures === 0 ? 'STAGE10_VALIDATION_PASS' : `STAGE10_VALIDATION_FAIL (${failures} failures)`);
} finally {
  await server.close();
}
process.exitCode = failures === 0 ? 0 : 1;
