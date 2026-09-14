// §9–§14 / Phase M13 — OPPORTUNITY DISCOVERY ENGINE validator.
//
// Proves the ADDITIONAL discovery layer is wired to the EXISTING engine and obeys
// the non-negotiables:
//   • the ASIN-level Brand Intelligence prospect universe remains the source (no
//     parallel universe, no fabricated ASIN data);
//   • the eight §9 verticals exist and the sports vertical is seeded with Tottenham
//     FIRST, as a POTENTIAL distribution opportunity — never a confirmed partnership;
//   • §6 category eligibility is FAIL-CLOSED on the ten permitted categories;
//   • ranking is by estimated PO potential, deterministic across replays, and
//     ineligible records are separated rather than discarded;
//   • PO potential and Mercenta revenue come from ONE formula / the canonical
//     commercial-model arithmetic (no second money engine);
//   • zero network calls.
import { createServer } from 'vite';

let networkCalls = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = (...args) => {
  networkCalls += 1;
  console.error('[validate-opportunity-discovery] UNEXPECTED network call:', args[0]);
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

try {
  const od = await server.ssrLoadModule('/src/lib/intelligence/opportunityDiscovery.ts');
  const types = await server.ssrLoadModule('/src/types.ts');
  const store = await server.ssrLoadModule('/src/data/prospectStore.ts');
  const finance = await server.ssrLoadModule('/src/lib/finance/commercialModel.ts');
  const config = await server.ssrLoadModule('/src/config/commercialModel.ts');

  store.ensureProspectStore();
  const prospects = store.getProspects();

  /* ── §9 the verticals ─────────────────────────────────────────────────── */
  test('the eight §9 discovery verticals are declared',
    od.OPPORTUNITY_VERTICAL_ORDER.length === 8 &&
      od.OPPORTUNITY_VERTICAL_ORDER.every((v) => !!od.OPPORTUNITY_VERTICALS[v]));
  test('every vertical declares a claim duty that is never a confirmed partnership',
    od.OPPORTUNITY_VERTICAL_ORDER.every((v) => {
      const duty = od.OPPORTUNITY_VERTICALS[v].claimDuty;
      return duty === 'potential_distribution_opportunity' ||
        duty === 'prospective_network_opportunity';
    }));
  test('the sports vertical is present and named for sports/team/club',
    od.OPPORTUNITY_VERTICALS.sports_team_club.label.includes('Sports'));

  /* ── §6 category eligibility, fail-closed ─────────────────────────────── */
  test('all ten permitted categories are eligible',
    types.APPROVED_CATEGORIES.every((c) => od.categoryEligibility(c).eligibility === 'eligible'));
  test('APPROVED_CATEGORIES has exactly ten entries (the §6 limit)',
    types.APPROVED_CATEGORIES.length === 10, String(types.APPROVED_CATEGORIES.length));
  const outOfScope = ['Books', 'Sports & Outdoors', 'Toys & Games', 'Pet Supplies'];
  test('out-of-scope categories are marked INELIGIBLE (never silently treated as fine)',
    outOfScope.every((c) => od.categoryEligibility(c).eligibility === 'ineligible_unknown_category'),
    outOfScope.join(', '));
  test('an unknown / missing category fails CLOSED',
    od.categoryEligibility(undefined).eligibility === 'ineligible_unknown_category' &&
      od.categoryEligibility(null).eligibility === 'ineligible_unknown_category' &&
      od.categoryEligibility('').eligibility === 'ineligible_unknown_category');
  test('the ineligible verdict explains itself to the operator',
    od.categoryEligibility('Books').reason.includes('not one of the 10 permitted'));

  /* ── the engine is the EXISTING prospect universe ─────────────────────── */
  test('the discovery layer reads the canonical prospect store (no second universe)',
    Array.isArray(prospects) && prospects.length > 0, `${prospects.length} stored prospects`);

  const { ranked, ineligible } = od.rankOpportunities(prospects);
  test('every non-disqualified stored prospect becomes an opportunity',
    ranked.length + ineligible.length === prospects.filter((p) => !p.disqualified).length);
  test('a prospect with an out-of-list category is separated, not dropped',
    ranked.every((r) => r.eligibility.eligibility === 'eligible') &&
      ineligible.every((r) => r.eligibility.eligibility !== 'eligible'));

  /* ── §13 ranking ──────────────────────────────────────────────────────── */
  test('ranking is by estimated PO potential, descending',
    ranked.every((r, i) => i === 0 || ranked[i - 1].estimatedPoPotentialGbp >= r.estimatedPoPotentialGbp));
  test('ranks are 1..n with no gaps', ranked.every((r, i) => r.rank === i + 1));
  const again = od.rankOpportunities(prospects);
  test('ranking is deterministic across replays',
    JSON.stringify(ranked.map((r) => [r.id, r.rank, r.estimatedPoPotentialGbp])) ===
      JSON.stringify(again.ranked.map((r) => [r.id, r.rank, r.estimatedPoPotentialGbp])));

  /* ── §5/§12/§13 claim discipline ─────────────────────────────────────── */
  const allRecords = [...ranked, ...ineligible];
  test('NO record claims a confirmed partnership',
    allRecords.every((r) => r.confirmedPartnership === false));
  const validClaims = ['confirmed_fact', 'estimate', 'simulation', 'third_party_research', 'pending_confirmation'];
  test('every record declares a valid claim class',
    allRecords.every((r) => validClaims.includes(r.claim)));
  const banned = /\bguaranteed?\b|\bwe sell directly to\b|\bbypass\b/i;
  test('no record uses guaranteed/bypass wording',
    allRecords.every((r) =>
      ![r.distributionOpportunity, r.existingDistributorEvidence, r.recommendedCta, r.sellerStatusEvidence]
        .some((t) => banned.test(t))));

  /* ── §13/§14 money comes from ONE engine ──────────────────────────────── */
  test('PO potential matches the declared shared formula on every record',
    allRecords.every(
      (r) => r.estimatedPoPotentialGbp === od.poPotentialGbp(r.estimatedMonthlyRevenueGbp, r.sellerCountMax)
    ), od.PO_POTENTIAL_FORMULA);
  test('Mercenta revenue uses the canonical commercial-model arithmetic',
    ranked.every((r) => {
      const expected = finance.computeCommissionModel({
        retailChannelRevenueGbp: r.estimatedPoPotentialGbp,
        commissionRatePct: config.DEMO_COMMISSION_RATE_PCT,
      }).mercentaCommissionGbp;
      return r.estimatedMercentaRevenueGbp === Math.round(expected * 100) / 100;
    }));

  /* ── §14 ASIN-level evidence is preserved, never invented ─────────────── */
  const byId = new Map(prospects.map((p) => ['opp-' + p.id, p]));
  test("observed demand is the sum of the prospect's OWN ASIN estimates (no invention)",
    ranked.every((r) => {
      const p = byId.get(r.id);
      if (!p) return false;
      const expected =
        Math.round((p.asins ?? []).reduce((s, a) => s + (a.estimatedRevenue ?? 0), 0) * 100) / 100;
      return r.estimatedMonthlyRevenueGbp === expected && r.topAsins.length <= od.TOP_ASIN_COUNT;
    }));
  test('every carried ASIN is one the prospect actually holds',
    ranked.every((r) => {
      const owned = new Set((byId.get(r.id)?.asins ?? []).map((a) => a.asin));
      return r.topAsins.every((a) => owned.has(a.asin));
    }));

  /* ── §12 the sports vertical, Tottenham FIRST ────────────────────────── */
  const sports = od.sportsOpportunities();
  test('the sports vertical is seeded with Tottenham Hotspur FIRST',
    sports.length >= 1 && sports[0].brand === 'Tottenham Hotspur', sports[0]?.brand);
  test('the Tottenham opportunity is in the sports/team/club vertical',
    sports[0].vertical === 'sports_team_club');
  test('Tottenham is an Apparel opportunity and is therefore ELIGIBLE',
    sports[0].category === 'Apparel' && sports[0].eligibility.eligibility === 'eligible');
  test('Tottenham is a POTENTIAL opportunity, not a confirmed partnership',
    sports[0].confirmedPartnership === false &&
      sports[0].claimDuty === 'potential_distribution_opportunity');
  test('Tottenham carries NO fabricated ASIN evidence and says so',
    sports[0].asinCount === 0 &&
      /NOT captured yet/i.test(sports[0].sellerStatusEvidence) &&
      sports[0].estimatedPoPotentialGbp === 0);
  test('the standing disclaimer states no approach and no agreement',
    /has NOT been approached/i.test(od.SEEDED_OPPORTUNITY_DISCLAIMER) &&
      /not a confirmed partnership/i.test(od.SEEDED_OPPORTUNITY_DISCLAIMER));
  test('unverified club-venture leads are tagged pending_confirmation, not fact',
    od.TOTTENHAM_OPPORTUNITY.networkRoutes.filter((r) => r.claim === 'confirmed_fact').length === 1 &&
      od.TOTTENHAM_OPPORTUNITY.networkRoutes.some(
        (r) => /Hotspur Labs/i.test(r.label) && r.claim === 'pending_confirmation'
      ));
  test('the Tottenham record carries a next action and a distribution proposition',
    /Brand Intelligence discovery/i.test(sports[0].recommendedCta) &&
      /potential distribution opportunity/i.test(sports[0].distributionOpportunity));

  /* ── §9 rollup ───────────────────────────────────────────────────────── */
  const rollup = od.rollupByVertical(allRecords);
  test('the vertical rollup counts every record exactly once',
    Object.values(rollup).reduce((s, v) => s + v.count, 0) === allRecords.length);

  test('the discovery engine makes ZERO network calls', networkCalls === 0, `observed ${networkCalls}`);
} catch (err) {
  console.error('[validate-opportunity-discovery] THREW:', err);
  failures++;
}

console.log(
  `\nOPPORTUNITY_DISCOVERY_VALIDATION_${failures === 0 ? 'PASS' : `FAIL (${failures})`} (${checks} checks)`
);
process.exit(failures === 0 ? 0 : 1);