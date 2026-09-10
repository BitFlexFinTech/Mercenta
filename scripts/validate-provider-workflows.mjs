/**
 * §Priority-1 — workflow-level simulation validation.
 *
 * Runs the two new provider-driven scenarios (SHIPMENT_PROGRESSION,
 * COMPLIANCE_VERIFICATION) plus the DHL domain + compliance domain directly,
 * and proves:
 *  - deterministic outcome (status ok, expected steps/audit/events);
 *  - ZERO external network calls across an entire scenario run
 *    (global.fetch is instrumented; mock adapters must never call it);
 *  - the safety gate refuses when a required provider resolves live/unknown.
 *
 * This is the automated "networkCalls === 0 for simulation scenarios" proof.
 */
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });

let failures = 0;
function test(name, cond) {
  console.log(`${cond ? '✓' : '✗'} ${name}`);
  if (!cond) failures++;
}

// Instrument any fetch attempt that would leave the process.
let externalFetches = 0;
let originalFetch = globalThis.fetch;
const hijackedFetch = async (url, init) => {
  externalFetches++;
  console.log(`!! scenario attempted external fetch: ${String(url)}`);
  return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
};

try {
  const engineMod = await server.ssrLoadModule('/src/lib/simulation/scenarioEngine.ts');
  const compMod = await server.ssrLoadModule('/src/lib/compliance/complianceSync.ts');
  const storeMod = await server.ssrLoadModule('/src/data/demoStore.ts');
  const eventsMod = await server.ssrLoadModule('/src/lib/events/eventFeed.ts');

  const brandId = 'brand-zambezi';
  const simulationForAll = Object.freeze(
    new Proxy({}, { get: () => 'simulation' })
  );

  /* ── SHIPMENT_PROGRESSION ── */
  const auditBefore = storeMod.demoAuditLog.length;
  const eventsBefore = eventsMod.queryEvents().length;
  const run1 = await engineMod.runScenario('SHIPMENT_PROGRESSION', {
    brandId, seed: 7, getMode: () => 'simulation', actorId: 'probe',
  });
  test(`SHIPMENT_PROGRESSION: ok with >=6 steps + shipment + audit/event trail`,
    run1.status === 'ok'
    && typeof run1.created?.shipmentId === 'string'
    && run1.steps.length >= 6
    && (storeMod.demoAuditLog.length - auditBefore) >= 6
    && (eventsMod.queryEvents().length - eventsBefore) >= 3);
  const shipment = storeMod.demoShipments.find((s) => s.id === run1.created?.shipmentId);
  test('SHIPMENT_PROGRESSION: real domain shipment exists with waybill/tracking',
    !!shipment && typeof shipment.waybill === 'string' && typeof shipment.trackingNumber === 'string');

  /* ── COMPLIANCE_VERIFICATION ── */
  const auditBefore2 = storeMod.demoAuditLog.length;
  const run2 = await engineMod.runScenario('COMPLIANCE_VERIFICATION', {
    brandId, seed: 7, getMode: () => 'simulation', actorId: 'probe',
  });
  test(`COMPLIANCE_VERIFICATION: ok with company_verified + vat steps + audit/event trail`,
    run2.status === 'ok'
    && run2.steps.some((st) => st.action === 'company_verified' || st.action === 'company_not_verified')
    && run2.steps.some((st) => st.action === 'vat_status_checked')
    && (storeMod.demoAuditLog.length - auditBefore2) >= 5);
  const verification = storeMod.demoCompanyVerifications.find((v) => v.brandId === brandId);
  test('COMPLIANCE_VERIFICATION: stores a tenant-scoped company verification',
    !!verification && verification.companyNumber.startsWith('MOCK-CH-') && verification.brandId === brandId);
  const filing = compMod.getLatestVatFiling(brandId);
  test('COMPLIANCE_VERIFICATION: HMRC filing recorded with simulation agency',
    !!filing && filing.agency === 'simulation');
  test('COMPLIANCE_VERIFICATION: tenant-safe filing is brand-scoped', filing?.brandId === brandId);

  /* ── Determinism: same seed → same run id & success ── */
  const run1b = await engineMod.runScenario('SHIPMENT_PROGRESSION', {
    brandId, seed: 7, getMode: () => 'simulation',
  });
  test('determinism: same seed produces the same run id', run1.runId === run1b.runId);

  /* ── Safety gates at the workflow boundary ── */
  const liveRefused = await engineMod.runScenario('SHIPMENT_PROGRESSION', {
    brandId, seed: 1, getMode: (pid) => (pid === 'dhl' ? 'live' : 'simulation'),
  });
  test('SHIPMENT_PROGRESSION refused when DHL resolves LIVE',
    liveRefused.status === 'safety_refused' && liveRefused.safetyReason.includes('dhl'));
  const unknownRefused = await engineMod.runScenario('COMPLIANCE_VERIFICATION', {
    brandId, seed: 1, getMode: (pid) => (pid === 'hmrc' ? 'unknown' : 'simulation'),
  });
  test('COMPLIANCE_VERIFICATION refused when HMRC resolves UNKNOWN',
    unknownRefused.status === 'safety_refused' && unknownRefused.safetyReason.includes('hmrc'));

  /* ── Network isolation: instrumented fetch must remain untouched ── */
  globalThis.fetch = hijackedFetch;
  const runFixed = await engineMod.runScenario('SHIPMENT_PROGRESSION', {
    brandId, seed: 3, getMode: () => 'simulation',
  });
  const runComp = await engineMod.runScenario('COMPLIANCE_VERIFICATION', {
    brandId, seed: 3, getMode: () => 'simulation',
  });
  // Standalone verify (deterministic every-4th rate limit → retry once).
  let verComp = await compMod.verifyBrandCompany(brandId, { getMode: () => 'simulation' });
  if (!verComp.ok && verComp.status !== 'safety_refused') {
    verComp = await compMod.verifyBrandCompany(brandId, { getMode: () => 'simulation' });
  }
  test('scenarios + compliance domain made ZERO external network calls',
    runFixed.status === 'ok' && runComp.status === 'ok' && verComp.ok === true && externalFetches === 0);

  console.log(failures === 0 ? 'PROVIDER_WORKFLOW_VALIDATION_PASS' : `PROVIDER_WORKFLOW_VALIDATION_FAIL (${failures} failures)`);
} finally {
  globalThis.fetch = originalFetch;
  await server.close();
}
process.exitCode = failures === 0 ? 0 : 1;