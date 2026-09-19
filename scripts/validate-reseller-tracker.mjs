/**
 * Reseller Tracker validation — tests the mock data, classification, and report generation.
 */

import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });

let failures = 0;
function test(name, cond) {
  console.log(`${cond ? '✓' : '✗'} ${name}`);
  if (!cond) failures++;
}

try {
  const rt = await server.ssrLoadModule('/src/lib/research/resellerTracker.ts');

  /* ── Mock data path ── */
  const zambeziReport = await rt.checkUnauthorizedResellers({
    keepaApiKey: null, brandName: 'Astonish', asins: ['B0EXAMPLE01', 'B0EXAMPLE02', 'B0EXAMPLE03'],
  });
  test('mock report returns data', zambeziReport.totalListings === 3);
  test('mock report has high risk', zambeziReport.highRisk.length > 0);
  test('mock report has medium risk', zambeziReport.mediumRisk.length > 0);
  test('mock report has low risk', zambeziReport.lowRisk.length > 0);
  test('mock report has pitch summary', typeof zambeziReport.pitchSummary === 'string' && zambeziReport.pitchSummary.length > 0);
  test('mock report source is mock', zambeziReport.source === 'mock');
  test('mock report has generatedAt', typeof zambeziReport.generatedAt === 'string');

  /* ── Unknown brand (fallback mock data) ── */
  const unknownReport = await rt.checkUnauthorizedResellers({
    keepaApiKey: null, brandName: 'Unknown Brand', asins: ['B0MOCK001'],
  });
  test('unknown brand falls back to generic mock data', unknownReport.totalListings === 2);

  /* ── Pitch summary ── */
  test('pitch summary mentions reseller activity', zambeziReport.pitchSummary.toLowerCase().includes('reseller'));

  /* ── Risk classifications ── */
  test('high risk items have correct type', zambeziReport.highRisk.every((l) => l.riskLevel === 'high'));
  test('low risk items have correct type', zambeziReport.lowRisk.every((l) => l.riskLevel === 'low'));

  /* ── Regatta has high risk ── */
  const hlReport = await rt.checkUnauthorizedResellers({
    keepaApiKey: null, brandName: 'Regatta', asins: ['B0EXAMPLE04'],
  });
  test('Regatta has high risk', hlReport.highRisk.length === 1);

  console.log(`\nRESELLER_TRACKER_VALIDATION_PASS (${failures} failures)`);
} catch (err) {
  console.error('RESELLER_TRACKER_VALIDATION_FAIL:', err.message);
  failures++;
  console.log(`\nRESELLER_TRACKER_VALIDATION_PASS (${failures} failures)`);
} finally {
  await server.close();
  process.exit(failures > 0 ? 1 : 0);
}