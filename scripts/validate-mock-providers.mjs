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

  /* ── DHL mock (mock-first carrier seam) ── */
  const dhlMockMod = await server.ssrLoadModule('/src/lib/dhl/mockClient.ts');
  const dhlIndexMod = await server.ssrLoadModule('/src/lib/dhl/index.ts');
  dhlMockMod.resetMockDhlState();
  let dhlNetworkCalls = 0;
  const dhlCountingTransport = async () => { dhlNetworkCalls++; return { ok: true, status: 200, json: async () => ({}) }; };
  const mDhl = dhlMockMod.createMockDhlClient();
  const booked = await mDhl.createShipment({ reference: 'SHIPMENT-X', origin: 'Depot', destination: 'UK Hub', cartons: 2 });
  test('mock dhl books waybill with unmistakable fake id',
    booked.ok && /^MOCK-DHL-\d+$/.test(booked.waybill ?? '') && /^SIM-TRK-/.test(booked.trackingNumber ?? ''));
  const m1 = await mDhl.getShipmentStatus(booked.waybill);
  const m2 = await mDhl.getShipmentStatus(booked.waybill);
  const m3 = await mDhl.getShipmentStatus(booked.waybill);
  test('mock dhl milestones progress deterministically',
    m1.milestone === 'pickup_scheduled' && m2.milestone === 'picked_up' && ['in_transit', 'delivered'].includes(m3.milestone ?? ''));
  const unknown = await mDhl.getShipmentStatus('MOCK-DHL-9999');
  test('mock dhl unknown waybill → realistic error', !unknown.ok && /Unknown waybill/.test(unknown.error ?? ''));
  // Deterministic transient failure → retry recovers.
  dhlMockMod.simulateDhlTransientFailure(booked.waybill);
  const fail1 = await mDhl.getShipmentStatus(booked.waybill);
  const recovered = await mDhl.getShipmentStatus(booked.waybill);
  test('mock dhl transient failure fails once then recovers', !fail1.ok && recovered.ok && fail1.error.includes('retry'));

  // Factory: verified connection through a counting transport provokes real calls; mock/mock: secret → zero calls.
  const realSel = dhlIndexMod.createDhlClientForConnectionWithTransport(
    { credentials: { secretRef: 'vault:dhl', verified: true }, edgeFunctionBase: '/fn' }, dhlCountingTransport
  );
  await realSel.client.getShipmentStatus('X');
  test('dhl factory: verified connection → REAL client through transport', dhlNetworkCalls === 1);
  const mockSel = dhlIndexMod.createDhlClientForConnectionWithTransport(
    { credentials: null, edgeFunctionBase: '/fn' }, dhlCountingTransport
  );
  await mockSel.client.createShipment({ reference: 'R', origin: 'A', destination: 'B', cartons: 1 });
  test('dhl factory: no credentials → MOCK client and ZERO provider network calls', dhlNetworkCalls === 1);
  const mockSecretDhl = dhlIndexMod.createDhlClientForConnectionWithTransport(
    { credentials: { secretRef: 'mock:dhl-eu-demo-key', verified: true }, edgeFunctionBase: '/fn' }, dhlCountingTransport
  );
  await mockSecretDhl.client.createShipment({ reference: 'R2', origin: 'A', destination: 'B', cartons: 1 });
  test('dhl factory: mock: secret ref never forwarded to live transport', dhlNetworkCalls === 1);

  /* ── Companies House mock ── */
  const chMockMod = await server.ssrLoadModule('/src/lib/compliance/companiesHouseMock.ts');
  const chIndexMod = await server.ssrLoadModule('/src/lib/compliance/index.ts');
  chMockMod.resetMockCompaniesHouseState();
  let chNetworkCalls = 0;
  const chCountingTransport = async () => { chNetworkCalls++; return { ok: true, status: 200, json: async () => ({}) }; };
  const mCh = chMockMod.createMockCompaniesHouseClient();
  await chMockMod.seedCompaniesHouse([{ id: 'brand-zambezi', name: 'Zambezi Traders' }]);
  const found = await mCh.lookupCompany({ companyName: 'zambezi' });
  const missing = await mCh.lookupCompany({ companyNumber: 'ZZ000001' });
  test('mock CH finds seeded company with mock number',
    found.ok && found.match?.companyNumber?.startsWith('MOCK-CH-') && found.match?.status === 'active');
  test('mock CH unknown company → notFound (never invented data)', missing.ok && missing.notFound === true);
  // Every 4th lookup is rate-limited; the retry succeeds.
  const rl = await mCh.lookupCompany({ companyNumber: 'X1' });
  test('mock CH deterministic rate-limit → retryable error', !rl.ok && rl.rateLimited === true);
  const rlRetry = await mCh.lookupCompany({ companyName: 'zambezi' });
  test('mock CH retry after rate limit succeeds', rlRetry.ok);
  const realCh = chIndexMod.createCompaniesHouseClientForConnectionWithTransport(
    () => ({ secretRef: 'vault:ch', verified: true }), '/fn', chCountingTransport
  );
  await realCh.client.lookupCompany({ companyNumber: 'NC1' });
  test('CH factory: verified connection → REAL client through transport', chNetworkCalls === 1);
  const mockCh = chIndexMod.createCompaniesHouseClientForConnectionWithTransport(() => null, '/fn', chCountingTransport);
  await mockCh.client.lookupCompany({ companyName: 'zambezi' });
  const mockSecretCh = chIndexMod.createCompaniesHouseClientForConnectionWithTransport(
    () => ({ secretRef: 'mock:ch-demo-key', verified: true }), '/fn', chCountingTransport
  );
  await mockSecretCh.client.lookupCompany({ companyName: 'zambezi' });
  test('CH factory: mock/mock: credentials → ZERO provider network calls', chNetworkCalls === 1);

  /* ── HMRC mock ── */
  const hmrcMockMod = await server.ssrLoadModule('/src/lib/compliance/hmrcMock.ts');
  const hmrcIndexMod = await server.ssrLoadModule('/src/lib/compliance/index.ts');
  hmrcMockMod.resetMockHmrcState();
  let hmrcNetworkCalls = 0;
  const hmrcCountingTransport = async () => { hmrcNetworkCalls++; return { ok: true, status: 200, json: async () => ({}) }; };
  const mHmrc = hmrcMockMod.createMockHmrcClient();
  const vat = await mHmrc.getVatStatus('MOCK-VRN-ZAMBEZI');
  test('mock HMRC seeded VRN → registered with next deadline',
    vat.ok && vat.status === 'registered' && typeof vat.nextReturnDue === 'string');
  const f1 = await mHmrc.fileReturn({ vrn: 'MOCK-VRN-ZAMBEZI', period: 'Q3 2026', totalSalesGbp: 1000, vatDueGbp: 200 });
  const f2 = await mHmrc.fileReturn({ vrn: 'MOCK-VRN-ZAMBEZI', period: 'Q3 2026', totalSalesGbp: 1000, vatDueGbp: 200 });
  const f3 = await mHmrc.fileReturn({ vrn: 'MOCK-VRN-ZAMBEZI', period: 'Q3 2026', totalSalesGbp: 1000, vatDueGbp: 200 });
  test('mock HMRC every 3rd filing rejected once, retry accepted',
    f1.ok && f1.status === 'accepted' && f2.ok && f3.status === 'rejected');
  const f3Retry = await mHmrc.fileReturn({ vrn: 'MOCK-VRN-ZAMBEZI', period: 'Q3 2026', totalSalesGbp: 1000, vatDueGbp: 200 });
  test('mock HMRC retry after rejection is accepted', f3Retry.ok && f3Retry.status === 'accepted');
  hmrcMockMod.simulateHmrcOutage(true);
  const outage = await mHmrc.fileReturn({ vrn: 'MOCK-VRN-ZAMBEZI', period: 'Q3 2026', totalSalesGbp: 1, vatDueGbp: 1 });
  test('mock HMRC transient outage fails once (retryable)', !outage.ok);
  const realHmrc = hmrcIndexMod.createHmrcClientForConnectionWithTransport(
    () => ({ secretRef: 'vault:hmrc', verified: true }), '/fn', hmrcCountingTransport
  );
  await realHmrc.client.getVatStatus('GB123');
  test('HMRC factory: verified connection → REAL client through transport', hmrcNetworkCalls === 1);
  const mockHmrc = hmrcIndexMod.createHmrcClientForConnectionWithTransport(() => null, '/fn', hmrcCountingTransport);
  await mockHmrc.client.getVatStatus('MOCK-VRN-X');
  const mockSecretHmrc = hmrcIndexMod.createHmrcClientForConnectionWithTransport(
    () => ({ secretRef: 'mock:hmrc-demo-secret', verified: true }), '/fn', hmrcCountingTransport
  );
  await mockSecretHmrc.client.getVatStatus('MOCK-VRN-Y');
  test('HMRC factory: mock/mock: credentials → ZERO provider network calls', hmrcNetworkCalls === 1);

  /* ── DHL domain workflow (state + audit + event + safety gate) ── */
  const dhlDomainMod = await server.ssrLoadModule('/src/lib/dhl/domain.ts');
  const storeMod = await server.ssrLoadModule('/src/data/demoStore.ts');
  const stamp = (Date.now() % 1000000) + '';
  storeMod.demoShipments.push({
    id: `st-${stamp}`, brandId: 'brand-zambezi', poNumber: `ST-${stamp}`,
    carrier: 'dhl', reference: `ST-${stamp}`, title: 'Sim probe', value: 100,
    status: 'factory_intake', origin: 'Depot', destination: 'UK Hub', delayed: false, exception: false,
  });
  const simAdvance = await dhlDomainMod.advanceShipmentViaDhl({ shipmentId: `st-${stamp}`, getMode: () => 'simulation', actorId: 'probe' });
  test('dhl domain: simulation mode → milestone applies to domain state',
    simAdvance.ok && typeof simAdvance.to === 'string' && simAdvance.auditIds.length >= 1 && simAdvance.eventsEmitted >= 1);
  const refused = await dhlDomainMod.advanceShipmentViaDhl({ shipmentId: `st-${stamp}`, getMode: () => 'unknown' });
  test('dhl domain: UNKNOWN mode is refused (never simulated)',
    refused.ok === false && refused.status === 'safety_refused');
  const refusedLive = await dhlDomainMod.advanceShipmentViaDhl({ shipmentId: `st-${stamp}`, getMode: () => 'live' });
  test('dhl domain: LIVE mode is refused (gate-held demo path)',
    refusedLive.ok === false && refusedLive.status === 'safety_refused');

  console.log(failures === 0 ? 'MOCK_PROVIDERS_VALIDATION_PASS' : `MOCK_PROVIDERS_VALIDATION_FAIL (${failures} failures)`);
} finally {
  await server.close();
}
process.exitCode = failures === 0 ? 0 : 1;

