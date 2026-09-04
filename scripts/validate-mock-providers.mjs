/**
 * Stage 19 validation — per-provider mock-first clients.
 *
 * Covers: Stripe mock client (success + dunning + cancel-error paths),
 * e-sign mock client (sent→viewed→completed + deterministic decline path +
 * unknown-envelope error), transactional-email mock (deliver + hard-bounce),
 * and factory selection for all three (verified connection → real transport
 * called; anything else → mock answered with unmistakable `mock:` ids).
 */
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
  const stripeMod = await server.ssrLoadModule('/src/lib/billing/stripe.ts');
  const stripeMockMod = await server.ssrLoadModule('/src/lib/billing/stripeMock.ts');
  const esignMod = await server.ssrLoadModule('/src/lib/esign/esign.ts');
  const mailMod = await server.ssrLoadModule('/src/lib/mail/mail.ts');

  /* ── Stripe mock ── */
  stripeMockMod.resetMockStripeState();
  const mStripe = stripeMockMod.createMockStripeClient();
  const sub1 = await mStripe.startSubscription('brand-zambezi', 'growth', 'a@b.c');
  test('mock stripe start → ok with unmistakable mock id',
    sub1.ok === true && /^mock:sub-\d+$/.test(sub1.stripeSubscriptionId ?? ''));
  const st1 = await mStripe.getSubscriptionStatus(sub1.stripeSubscriptionId);
  test('mock stripe status of fresh sub → active', st1.ok && st1.status === 'active');
  const stBad = await mStripe.getSubscriptionStatus('sub_does_not_exist');
  test('mock stripe unknown sub → realistic error', !stBad.ok && /No such subscription/.test(stBad.error ?? ''));
  const cBad = await mStripe.cancelSubscription('sub_unknown');
  test('mock stripe cancel unknown → error', !cBad.ok);

  // Dunning schedule: every 5th subscription reports past_due. sub1 was
  // counter 1; the next four are counters 2–5, so ONLY the last is past_due.
  const dunningIds = [];
  for (let i = 0; i < 4; i++) {
    const s = await mStripe.startSubscription(`b${i}`, 'starter', 'x@y.z');
    dunningIds.push(s.stripeSubscriptionId ?? '');
  }
  const stEarly = await mStripe.getSubscriptionStatus(dunningIds[2]);
  const stFifth = await mStripe.getSubscriptionStatus(dunningIds[3]);
  test('every 5th mock subscription → past_due, others active (dunning path testable)',
    stEarly.status === 'active' && stFifth.status === 'past_due');

  /* ── Stripe factory ── */
  let realCalls = 0;
  const countingTransport = async () => { realCalls++; return { ok: true, status: 200, json: async () => ({}) }; };
  const realStripe = stripeMod.createStripeClientForConnection(
    () => ({ secretRef: 'vault:live', verified: true }), '/fn', countingTransport
  );
  await realStripe.getSubscriptionStatus('sub_x');
  test('factory: verified connection → REAL client through transport', realCalls === 1);
  const mockViaFactory = stripeMod.createStripeClientForConnection(() => null, '/fn', countingTransport);
  const fSub = await mockViaFactory.startSubscription('b', 'growth', 'a@b.c');
  test('factory: no credentials → MOCK client with mock: id',
    realCalls === 1 && /^mock:sub-/.test(fSub.stripeSubscriptionId ?? ''));

  /* ── E-signature mock ── */
  esignMod.resetMockEsignState();
  const mEsign = esignMod.createMockEsignClient();
  const env1 = await mEsign.sendForSignature({ contractId: 'c1', documentText: 'doc', signatoryName: 'A', signatoryEmail: 's@example.com' });
  test('mock esign send → ok with unmistakable envelope id',
    env1.ok && /^mock:env-\d+$/.test(env1.envelopeId ?? ''));
  const e1 = await mEsign.getEnvelopeStatus(env1.envelopeId);
  const e2 = await mEsign.getEnvelopeStatus(env1.envelopeId);
  const e3 = await mEsign.getEnvelopeStatus(env1.envelopeId);
  test('mock esign lifecycle sent → viewed → completed',
    e1.status === 'sent' && e2.status === 'viewed' && e3.status === 'completed');

  // Deterministic decline: every 4th envelope declines after two polls.
  // env1 was counter 1; two more fills counters 2–3, so the NEXT is the
  // 4th overall and must decline.
  await mEsign.sendForSignature({ contractId: 'c2', documentText: '', signatoryName: 'A', signatoryEmail: 's@example.com' });
  await mEsign.sendForSignature({ contractId: 'c3', documentText: '', signatoryName: 'A', signatoryEmail: 's@example.com' });
  const env4 = await mEsign.sendForSignature({ contractId: 'c4', documentText: '', signatoryName: 'A', signatoryEmail: 's@example.com' });
  await mEsign.getEnvelopeStatus(env4.envelopeId);
  await mEsign.getEnvelopeStatus(env4.envelopeId);
  const declined = await mEsign.getEnvelopeStatus(env4.envelopeId);
  test('every 4th mock envelope → declined WITH reason (rejection path testable)',
    declined.status === 'declined' && typeof declined.declineReason === 'string');
  const envUnknown = await mEsign.getEnvelopeStatus('env_nope');
  test('mock esign unknown envelope → realistic error', !envUnknown.ok && /No such envelope/.test(envUnknown.error ?? ''));

  /* ── E-sign factory ── */
  const realEsign = esignMod.createEsignClient(
    () => ({ provider: 'docusign', secretRef: 'vault:esign', verified: true }),
    '/fn',
    countingTransport
  );
  await realEsign.sendForSignature({ contractId: 'c', documentText: 'd', signatoryName: 'A', signatoryEmail: 's@e.f' });
  test('esign factory: verified connection → REAL client through transport', realCalls >= 2);
  const mockEsign = esignMod.createEsignClient(() => null, '/fn', countingTransport);
  const meRes = await mockEsign.sendForSignature({ contractId: 'c', documentText: 'd', signatoryName: 'A', signatoryEmail: 's@e.f' });
  test('esign factory: no connection → MOCK client with mock: id',
    /^mock:env-/.test(meRes.envelopeId ?? ''));

  /* ── Transactional email mock ── */
  mailMod.resetMockMailState();
  const mMail = mailMod.createMockMailClient();
  const good = await mMail.sendEmail({ to: 'buyer@example.com', subject: 'Hi', text: 'body' });
  test('mock mail valid send → ok with unmistakable message id',
    good.ok && /^mock:msg-\d+$/.test(good.messageId ?? ''));
  const bad = await mMail.sendEmail({ to: 'not-an-address', subject: 'Hi', text: 'body' });
  test('mock mail malformed recipient → simulated hard bounce', !bad.ok && /Invalid recipient/.test(bad.error ?? ''));

  /* ── Mail factory ── */
  const realMail = mailMod.createMailClient(
    () => ({ provider: 'postmark', secretRef: 'vault:mail', verified: true }),
    '/fn',
    countingTransport
  );
  await realMail.sendEmail({ to: 'a@bc.com', subject: 's', text: 't' });
  test('mail factory: verified connection → REAL client through transport', realCalls >= 3);
  const mockMail = mailMod.createMailClient(() => null, '/fn', countingTransport);
  const mmRes = await mockMail.sendEmail({ to: 'a@bc.com', subject: 's', text: 't' });
  test('mail factory: no connection → MOCK client with mock: id',
    /^mock:msg-/.test(mmRes.messageId ?? ''));

  /* ── UI labeling ── */
  const apiMod = await server.ssrLoadModule('/src/data/api.ts');
  const ctxMod = await server.ssrLoadModule('/src/integrations/IntegrationsContext.tsx');
  const billingPanel = await server.ssrLoadModule('/src/components/admin/BillingPanel.tsx');
  const qc = new QueryClient();
  qc.setQueryData(['brands'], { data: (await apiMod.fetchBrands()).data, source: 'seed' });
  qc.setQueryData(['subscriptions'], { data: (await apiMod.fetchSubscriptions()).data, source: 'seed' });
  qc.setQueryData(['commissions'], { data: (await apiMod.fetchCommissions()).data, source: 'seed' });
  qc.setQueryData(['shipping-margins'], { data: (await apiMod.fetchShippingMargins()).data, source: 'seed' });
  const htmlDisconnected = renderToString(
    createElement(ctxMod.IntegrationsProvider, null,
      createElement(QueryClientProvider, { client: qc },
        createElement(billingPanel.BillingPanel)))
  );
  test('billing panel labels itself (Mock) mode when stripe disconnected',
    htmlDisconnected.includes('(Mock) mode') && htmlDisconnected.includes('mock:sub-'));
  test('billing panel still fully renders in mock mode (navigable platform)',
    htmlDisconnected.includes('Brand Subscriptions'));

  console.log(failures === 0 ? 'MOCK_PROVIDERS_VALIDATION_PASS' : `MOCK_PROVIDERS_VALIDATION_FAIL (${failures} failures)`);
} finally {
  await server.close();
}
process.exitCode = failures === 0 ? 0 : 1;

