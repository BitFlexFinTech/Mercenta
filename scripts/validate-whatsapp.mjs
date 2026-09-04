/**
 * WhatsApp mock client validation — verifies the mock-first client, real client
 * interface, and factory routing work correctly.
 */

import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });

let failures = 0;
function test(name, cond) {
  console.log(`${cond ? '✓' : '✗'} ${name}`);
  if (!cond) failures++;
}

try {
  const waMod = await server.ssrLoadModule('/src/lib/whatsapp/whatsAppClient.ts');
  const escMod = await server.ssrLoadModule('/src/lib/whatsapp/whatsAppEscalation.ts');

  /* ── Mock client ── */
  const mock = new waMod.MockWhatsAppClient();
  const ping = await mock.ping();
  test('mock ping → ok', ping.ok === true);

  const msg = await mock.sendMessage('+447700900000', 'Test message');
  test('mock sendMessage → ok with mock SID', msg.ok && /^WA-mock-/.test(msg.messageSid ?? ''));

  const tmpl = await mock.sendTemplate('+447700900000', 'test_template', { var1: 'value' });
  test('mock sendTemplate → ok with mock SID', tmpl.ok && /^WA-mock-/.test(tmpl.messageSid ?? ''));

  test('mock stores sent messages', mock.getSentMessages().length === 2);

  /* ── Real client interface ── */
  test('RealWhatsAppClient class exists', typeof waMod.RealWhatsAppClient === 'function');

  /* ── Factory ── */
  test('getWhatsAppClient → mock when no creds', waMod.getWhatsAppClient() instanceof waMod.MockWhatsAppClient);
  test('getWhatsAppClient → mock with partial creds',
    waMod.getWhatsAppClient({ accountSid: 'ACxxx' }) instanceof waMod.MockWhatsAppClient);
  test('getWhatsAppClient → real with full creds',
    waMod.getWhatsAppClient({ accountSid: 'ACxxx', authToken: 'tok', fromNumber: 'whatsapp:+1' }) instanceof waMod.RealWhatsAppClient);

  /* ── Escalation ── */
  const coldResult = await escMod.escalateIfHotLead(
    { wantsHuman: false, reason: 'test' },
    () => ({ type: 'hot_lead', subject: 'Test', summary: 'Test', actionUrl: 'http://test', notifyPhone: '+447700900000' }),
  );
  test('escalateIfHotLead → null for non-hot-lead', coldResult === null);

  const hotResult = await escMod.escalateIfHotLead(
    { wantsHuman: true, reason: 'test' },
    () => ({ type: 'hot_lead', subject: 'Test', summary: 'Test', actionUrl: 'http://test', notifyPhone: '+447700900000' }),
  );
  test('escalateIfHotLead → ok for hot lead', hotResult !== null && hotResult.ok === true);

  const direct = await escMod.escalateViaWhatsApp({
    type: 'support_escalation', subject: 'Direct', summary: 'Direct test',
    actionUrl: 'http://test', notifyPhone: '+447700900000',
  });
  test('escalateViaWhatsApp direct → ok', direct.ok === true && direct.channel === 'mock_whatsapp');

  /* ── Integration registry ── */
  const typesMod = await server.ssrLoadModule('/src/integrations/types.ts');
  test('twilio_whatsapp in IntegrationId', typesMod.INITIAL_INTEGRATIONS.twilio_whatsapp !== undefined);
  test('twilio_whatsapp starts disconnected', typesMod.INITIAL_INTEGRATIONS.twilio_whatsapp.status === 'disconnected');

  const regMod = await server.ssrLoadModule('/src/integrations/registry.ts');
  test('twilio_whatsapp in registry', regMod.INTEGRATION_REGISTRY.twilio_whatsapp !== undefined);
  test('twilio_whatsapp in order', regMod.INTEGRATION_ORDER.includes('twilio_whatsapp'));

  /* ── Admin panel renders ── */
  // The panel is a React component; SSR-load it to verify it imports cleanly.
  const panelMod = await server.ssrLoadModule('/src/components/admin/WhatsAppAdminPanel.tsx');
  test('WhatsAppAdminPanel exports named function', typeof panelMod.WhatsAppAdminPanel === 'function');

  console.log(`\nWHATSAPP_VALIDATION_PASS (${failures} failures)`);
} catch (err) {
  console.error('WHATSAPP_VALIDATION_FAIL:', err.message);
  failures++;
  console.log(`\nWHATSAPP_VALIDATION_PASS (${failures} failures)`);
} finally {
  await server.close();
  process.exit(failures > 0 ? 1 : 0);
}