// Stage 6 validation: automated tests for the §5 scoring engine + SSR render
// check of the Fulfillment Track panel (list view with seeded data).
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
  const s = await server.ssrLoadModule('/src/lib/scoring.ts');
  const {
    computeComponentScores,
    scoreBrand,
    assignTrack,
    isBorderline,
    BORDERLINE_BAND,
  } = s;

  // ── Component score tests ──
  const maxed = computeComponentScores({
    yearsExporting: 99,
    priorUkEuExport: true,
    hasEori: true,
    annualRevenueGbp: 5_000_000,
    catalogSize: 200,
    workingCapitalAnswer: 'yes',
    hazmatOrPerishableCategory: false,
    onTimeShipRate: 1,
  });
  test('trading history clamps at 20', maxed.tradingHistoryScore === 20);
  test('export experience max 15', maxed.exportExperienceScore === 15);
  test('scale max 20', maxed.scaleScore === 20);
  test('working capital yes = 20', maxed.workingCapitalScore === 20);
  test('clean category = 15', maxed.categoryRiskScore === 15);
  test('reliability 100% = 10', maxed.reliabilityScore === 10);

  const floored = computeComponentScores({
    yearsExporting: 0,
    priorUkEuExport: false,
    hasEori: false,
    annualRevenueGbp: 0,
    catalogSize: 0,
    workingCapitalAnswer: 'no',
    hazmatOrPerishableCategory: true,
  });
  test('zeroed inputs floor correctly', floored.tradingHistoryScore === 0 &&
    floored.exportExperienceScore === 0 && floored.scaleScore === 4 &&
    floored.workingCapitalScore === 0 && floored.categoryRiskScore === 7 &&
    floored.reliabilityScore === 0);
  test('totalScore equals sum of components',
    floored.totalScore === floored.tradingHistoryScore + floored.exportExperienceScore +
      floored.scaleScore + floored.workingCapitalScore + floored.categoryRiskScore +
      floored.reliabilityScore);

  // ── Working capital mapping ──
  const partial = computeComponentScores({
    yearsExporting: 2, priorUkEuExport: false, hasEori: false,
    annualRevenueGbp: 0, catalogSize: 0,
    workingCapitalAnswer: 'partially', hazmatOrPerishableCategory: false,
  });
  test('working capital partially = 10', partial.workingCapitalScore === 10);

  // ── Reliability pre-launch vs live ──
  const preLaunch = computeComponentScores({
    yearsExporting: 1, priorUkEuExport: true, hasEori: true,
    annualRevenueGbp: 100_000, catalogSize: 5,
    workingCapitalAnswer: 'yes', hazmatOrPerishableCategory: false,
  });
  test('pre-launch reliability = 0', preLaunch.reliabilityScore === 0);
  const live = computeComponentScores({
    yearsExporting: 1, priorUkEuExport: true, hasEori: true,
    annualRevenueGbp: 100_000, catalogSize: 5,
    workingCapitalAnswer: 'yes', hazmatOrPerishableCategory: false,
    onTimeShipRate: 0.85,
  });
  test('on-time 0.85 → reliability 9', live.reliabilityScore === 9);

  // ── Track assignment + borderline band ──
  test('assignTrack: 65 → direct_fulfillment', assignTrack(65) === 'direct_fulfillment');
  test('assignTrack: 64 → financed', assignTrack(64) === 'financed');
  test('isBorderline: 54 no / 55 yes / 74 yes / 75 no',
    !isBorderline(54) && isBorderline(55) && isBorderline(74) && !isBorderline(75));

  // Borderline: NOT silently auto-assigned — held for manual review.
  const borderlineResult = scoreBrand({
    yearsExporting: 4, priorUkEuExport: true, hasEori: true,
    annualRevenueGbp: 300_000, catalogSize: 25,
    workingCapitalAnswer: 'partially', hazmatOrPerishableCategory: false,
  });
  test(`borderline band is ${BORDERLINE_BAND.min}–${BORDERLINE_BAND.max}`,
    BORDERLINE_BAND.min === 55 && BORDERLINE_BAND.max === 74);
  test(
    `borderline score (${borderlineResult.components.totalScore}) flagged needsManualReview`,
    !isBorderline(borderlineResult.components.totalScore) ||
      borderlineResult.needsManualReview === true
  );
  if (isBorderline(borderlineResult.components.totalScore)) {
    test('borderline does not silently auto-assign', borderlineResult.proposedTrack === 'unassigned');
  }

  // Clear pass: auto-assigns without review.
  const clearResult = scoreBrand({
    yearsExporting: 5, priorUkEuExport: true, hasEori: true,
    annualRevenueGbp: 2_000_000, catalogSize: 60,
    workingCapitalAnswer: 'yes', hazmatOrPerishableCategory: false,
    onTimeShipRate: 0.95,
  });
  test('strong brand ≥65 auto-assigns direct fulfillment',
    clearResult.components.totalScore >= 65 &&
      clearResult.proposedTrack === 'direct_fulfillment' &&
      clearResult.needsManualReview === false);

  // Weak brand: below 55 → financed, no review flag.
  const weakResult = scoreBrand({
    yearsExporting: 1, priorUkEuExport: false, hasEori: false,
    annualRevenueGbp: 50_000, catalogSize: 2,
    workingCapitalAnswer: 'no', hazmatOrPerishableCategory: true,
  });
  test('weak brand <55 → financed, no review flag',
    weakResult.components.totalScore < 55 &&
      weakResult.proposedTrack === 'financed' &&
      weakResult.needsManualReview === false);

  // Manual override wins over engine.
  const overridden = scoreBrand({
    yearsExporting: 5, priorUkEuExport: true, hasEori: true,
    annualRevenueGbp: 2_000_000, catalogSize: 60,
    workingCapitalAnswer: 'yes', hazmatOrPerishableCategory: false,
    onTimeShipRate: 0.95,
  }, { manualOverride: true, track: 'financed' });
  test('manual override keeps existing track even when engine disagrees',
    overridden.proposedTrack === 'financed' && overridden.needsManualReview === false);

  // ── Panel render (with hydrated query cache) ──
  const storeMod = await server.ssrLoadModule('/src/data/demoStore.ts');
  const apiMod = await server.ssrLoadModule('/src/data/api.ts');
  const panelMod = await server.ssrLoadModule('/src/components/admin/FulfillmentTrack.tsx');

  const qc = new QueryClient();
  // Brands and scores must come from the SAME data universe (demoStore) so the
  // score.brandId ↔ brand.id join resolves, exactly as it would over real tables.
  const brands = storeMod.demoBrands;
  const scores = (await apiMod.fetchFulfillmentScores()).data;
  qc.setQueryData(['brands'], { data: brands, source: 'seed' });
  qc.setQueryData(['fulfillment-scores'], { data: scores, source: 'seed' });

  const html = renderToString(
    createElement(QueryClientProvider, { client: qc },
      createElement(panelMod.FulfillmentTrackPanel))
  );

  test('panel lists all seeded brands', brands.every((b) => html.includes(b.profile.businessName)));
  test('panel shows Needs review badge (borderline zambezi @57)', html.includes('Needs review'));
  test('panel shows both track badge types', html.includes('Direct fulfillment') && html.includes('Financed'));
  test('filters render', html.includes('All tracks') && html.includes('Score ≥'));

  console.log(failures === 0 ? 'STAGE6_VALIDATION_PASS' : `STAGE6_VALIDATION_FAIL (${failures} failures)`);
} finally {
  await server.close();
}
process.exitCode = failures === 0 ? 0 : 1;
