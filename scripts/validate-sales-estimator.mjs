// §18/§17/M12 — SALES ESTIMATOR + BORN-TO-RUN + AMAZON WORDING validator.
//
// Proves:
//   • the estimator is deterministic, banded, and ALWAYS labelled an estimate;
//   • its provider modes are truthful (no live data connection is ever claimed);
//   • the ASIN evidence comes from the EXISTING canonical Amazon data seam;
//   • Born-to-Run economics use the canonical commercial-model arithmetic and the
//     programme status is `not_confirmed_with_amazon` with TOS verification
//     flagged — no Amazon approval or programme place is claimed;
//   • the Amazon wording gate catches unverifiable claims and repairs copy.
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';

/* Network instrumentation — the estimator must make ZERO calls. */
let networkCalls = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = (...args) => {
  networkCalls += 1;
  console.error('[validate-sales-estimator] UNEXPECTED network call:', args[0]);
  return realFetch(...args);
};

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
let checks = 0;
const test = (name, ok, detail = '') => {
  checks++;
  console.log(`${ok ? '✓' : '✗'} ${name}${!ok && detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

try {
  const est = await server.ssrLoadModule('/src/lib/intelligence/salesEstimator.ts');
  const wording = await server.ssrLoadModule('/src/lib/intelligence/amazonWording.ts');
  const prospectStore = await server.ssrLoadModule('/src/data/prospectStore.ts');

  /* ── §18 the estimator ───────────────────────────────────────────────── */

  const input = {
    category: 'Grocery',
    priceGbp: 19.99,
    competitorCount: 12,
    reviewCount: 250,
    packSize: 2,
    listingMaturity: 3,
  };
  const a = est.estimateAmazonSales(input);
  const b = est.estimateAmazonSales(input);
  test('the estimator is deterministic (identical for identical inputs)',
    JSON.stringify(a) === JSON.stringify(b));
  test('the band is ordered low ≤ mid ≤ high, in orders and in units',
    a.estimatedMonthlyOrders.low <= a.estimatedMonthlyOrders.mid &&
      a.estimatedMonthlyOrders.mid <= a.estimatedMonthlyOrders.high &&
      a.estimatedMonthlyUnits.mid === a.estimatedMonthlyOrders.mid * 2);
  test('revenue is derived from price and pack size (no hidden constant)',
    a.estimatedMonthlyRevenueGbp.mid ===
      Math.round(a.estimatedMonthlyOrders.mid * 2 * 19.99 * 100) / 100);
  test('the annual figure is the monthly midpoint × 12',
    a.estimatedAnnualRevenueGbp.mid === Math.round(a.estimatedMonthlyRevenueGbp.mid * 12 * 100) / 100);
  test('the result is ALWAYS labelled an estimate, with disclaimers',
    a.basis === 'simulated_estimate' && a.dataSource === 'simulated_dataset' &&
      a.disclaimers.length >= 3 && /not measured/i.test(a.disclaimers[0]));

  test('more competition LOWERS the estimate',
    est.estimateAmazonSales({ ...input, competitorCount: 80 }).estimatedMonthlyOrders.mid <
      a.estimatedMonthlyOrders.mid);
  test('a brand-new listing estimates lower than an established one',
    est.estimateAmazonSales({ ...input, listingMaturity: 1 }).estimatedMonthlyOrders.mid <
      est.estimateAmazonSales({ ...input, listingMaturity: 5 }).estimatedMonthlyOrders.mid);
  test('confidence rises with real anchors and explains itself',
    est.estimateAmazonSales({ category: 'Grocery', priceGbp: 20 }).confidence === 'low' &&
      a.confidence === 'high' &&
      /anchor/i.test(a.confidenceReason));

  /* ── §25 truthful provider modes (never faked live) ─────────────────── */

  const modes = est.salesDataProviderModes();
  test('both registered sales-data providers are reported, neither claimed live',
    modes.length === 2 && modes.every((m) => m.live === false) &&
      modes.some((m) => m.provider === 'keepa') && modes.some((m) => m.provider === 'amazon_sp_api'));
  test('provider modes resolve through the canonical fail-closed resolver',
    read('src/lib/intelligence/salesEstimator.ts').includes('resolveProviderMode') &&
      read('src/lib/intelligence/salesEstimator.ts').includes('isProviderSimulationSafe'));
  test('the estimator reuses the EXISTING Amazon data seam (no parallel client)',
    read('src/lib/intelligence/salesEstimator.ts').includes("from './discoveryClient'") &&
      !read('src/lib/intelligence/salesEstimator.ts').includes('new MockAmazonDataClient'));

  /* ── §18 estimate from a stored prospect ────────────────────────────── */

  prospectStore.ensureProspectStore();
  const prospect = prospectStore.getProspects()[0];
  const fromProspect = await est.estimateFromProspect(prospect);
  test('an estimate can be produced from a stored prospect',
    fromProspect.basis === 'simulated_estimate' && fromProspect.estimatedMonthlyOrders.mid >= 0);
  test('the estimate reports how much ASIN evidence supported it',
    typeof fromProspect.asinEvidenceCount === 'number' && fromProspect.asinEvidenceCount >= 0);
  test('the canonical Amazon data seam reports its own (mock) mode',
    fromProspect.amazonDataMode === 'mock');

  /* ── §17 Born-to-Run modelling (identification only, never submission) ─ */

  const btr = est.modelBornToRunOpportunity(input);
  test('Born-to-Run identifies a new-to-channel opportunity',
    btr.newToAmazon === true && btr.projectedInitialMonthlyOrders > 0);
  test('a suggested launch quantity is derived from the top of the band',
    btr.suggestedLaunchQuantity === btr.estimate.estimatedMonthlyOrders.high);
  test('the launch revenue is quantity × pack × price (canonical arithmetic)',
    btr.estimatedLaunchRevenueGbp ===
      Math.round(btr.suggestedLaunchQuantity * 2 * 19.99 * 100) / 100);
  test('the programme status is NOT_CONFIRMED_WITH_AMAZON (no programme claimed)',
    btr.programmeStatus === 'not_confirmed_with_amazon' && btr.simulated === true);
  test('the TOS verification requirement is flagged',
    btr.tosVerificationRequired === true && /Verification required/i.test(btr.tosNote));
  test('the disclaimers state that nothing is submitted to Amazon',
    btr.disclaimers.some((d) => /no application, submission or listing/i.test(d)) &&
      btr.disclaimers.some((d) => /does not claim Amazon approval/i.test(d)));

  const btrCommission = btr.economics;
  test('Model A launch economics use the canonical 20% commission',
    btrCommission.model === 'commission_agent' &&
      btrCommission.mercentaCommissionGbp ===
        Math.round(btr.estimatedLaunchRevenueGbp * 0.2 * 100) / 100 &&
      btrCommission.brandAmountGbp ===
        Math.round((btr.estimatedLaunchRevenueGbp - btrCommission.mercentaCommissionGbp) * 100) / 100);
  const btrResell = est.modelBornToRunOpportunity({ ...input, model: 'buy_resell' }).economics;
  test('Model B launch economics state the gross spread and the net margin separately',
    btrResell.model === 'buy_resell' &&
      btrResell.grossCommercialSpreadGbp ===
        Math.round((btrResell.retailChannelRevenueGbp - btrResell.brandAcquisitionCostGbp) * 100) / 100 &&
      btrResell.netMercentaMarginGbp < btrResell.grossCommercialSpreadGbp);

  /* ── §17/§41.17 Amazon wording safeguards ───────────────────────────── */

  test('the programme-claim rules are declared and non-empty',
    wording.AMAZON_WORDING_RULES.length >= 6 &&
      wording.AMAZON_PROGRAMME_STATUS === 'not_confirmed_with_amazon' &&
      wording.AMAZON_TOS_VERIFICATION_REQUIRED === true);
  const unsafe = wording.lintAmazonWording(
    'We are an Amazon approved partner and your sales are guaranteed for every launch.'
  );
  test('an unverifiable Amazon claim is CAUGHT (approval + guarantee)',
    unsafe.fullySafe === false && unsafe.programmeHits.length >= 2,
    JSON.stringify(unsafe.programmeHits.map((h) => h.pattern)));
  const unsafeChannel = wording.lintAmazonWording('We will place your brand with Amazon Vendor Central.');
  test('the shared channel-naming gate is applied to the same text',
    unsafeChannel.fullySafe === false && unsafeChannel.channelHits.length >= 1);
  const safe = wording.lintAmazonWording(
    'Mercenta is a UK intermediary that can distribute your products through the UK retail channel.'
  );
  test('honest copy passes BOTH gates',
    safe.fullySafe === true && safe.safe === true);
  const repaired = wording.sanitiseAmazonClaim('We are an Amazon approved partner.');
  test('unsafe copy is repaired, not silently sent',
    /\[removed: unverified Amazon claim\]/.test(repaired) &&
      repaired.includes(wording.AMAZON_NO_APPROVAL_CLAIM) &&
      warningNoteIncluded(repaired));
  test('the estimator sources make no network call', networkCalls === 0, `observed ${networkCalls}`);

  console.log(
    failures === 0
      ? `SALES_ESTIMATOR_VALIDATION_PASS (${checks} checks)`
      : `SALES_ESTIMATOR_VALIDATION_FAIL (${failures}/${checks})`
  );
} finally {
  await server.close();
}
if (failures > 0) process.exit(1);

function warningNoteIncluded(text) {
  return /current Amazon Vendor terms/i.test(text);
}