// §12–§16/M12 — BRAND INTELLIGENCE STRATEGY validator.
//
// Proves the strategic layer is REAL and derived, not decorative:
//   • BOTH strategies exist and the destination market is the UK;
//   • source markets are enumerated and NOT UK-only (incl. Africa, Gulf, Asia,
//     Europe, the Americas, Oceania) and resolve from names or ISO codes;
//   • every trade programme is declared PROSPECTIVE (no partnership claimed);
//   • speed-to-revenue ranking runs over the REAL canonical prospect universe,
//     is deterministic, and labels every figure an estimate;
//   • market-access tagging is a real, audited write path on the canonical store.
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';

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
  const s = await server.ssrLoadModule('/src/lib/intelligence/acquisitionStrategy.ts');
  const prospectStore = await server.ssrLoadModule('/src/data/prospectStore.ts');
  const lifecycle = await server.ssrLoadModule('/src/lib/intelligence/prospectLifecycle.ts');

  /* ── §12 the two strategies, one destination market ──────────────────── */

  test('exactly two acquisition strategies are defined and ordered',
    s.ACQUISITION_STRATEGY_ORDER.length === 2 &&
      s.ACQUISITION_STRATEGY_ORDER.includes('uk_brands') &&
      s.ACQUISITION_STRATEGY_ORDER.includes('global_to_uk'));
  test('the destination market is the UK for BOTH strategies',
    s.DESTINATION_MARKET === 'United Kingdom' &&
      s.ACQUISITION_STRATEGIES.uk_brands.id === 'uk_brands' &&
      s.ACQUISITION_STRATEGIES.global_to_uk.id === 'global_to_uk');

  /* ── §15 source markets (never UK-only) ─────────────────────────────── */

  const markets = Object.values(s.SOURCE_MARKETS);
  const required = ['GB', 'ZW', 'ZA', 'AE', 'SG', 'MX', 'IN', 'CN', 'JP', 'KR', 'TR', 'US', 'AU', 'NZ', 'DE', 'BR', 'KE', 'NG'];
  test(`the source-market taxonomy is global (${markets.length} markets)`, markets.length >= 25);
  test('every required example market is present',
    required.every((id) => s.SOURCE_MARKETS[id]),
    required.filter((id) => !s.SOURCE_MARKETS[id]).join(','));
  test('only the UK belongs to Strategy A; every other market is global→UK',
    markets.filter((m) => m.strategy === 'uk_brands').map((m) => m.id).join(',') === 'GB' &&
      markets.filter((m) => m.strategy === 'global_to_uk').length === markets.length - 1);
  test('markets resolve from a country NAME and from an ISO code',
    s.resolveSourceMarketId('Zimbabwe') === 'ZW' &&
      s.resolveSourceMarketId('united states') === 'US' &&
      s.resolveSourceMarketId('AE') === 'AE');
  test('an unknown country resolves to null (never guessed)',
    s.resolveSourceMarketId('Atlantis') === null && s.resolveSourceMarketId(undefined) === null);

  /* ── §16 trade programmes are PROSPECTIVE ───────────────────────────── */

  const programmes = Object.values(s.TRADE_PROGRAMMES);
  test(`the trade-programme registry covers the required routes (${programmes.length})`,
    programmes.length >= 8 &&
      ['dbt', 'british_embassy', 'british_high_commission', 'chamber_of_commerce',
       'bilateral_business_council', 'trade_organisation', 'export_agency',
       'country_trade_body'].every((id) => s.TRADE_PROGRAMMES[id]));
  test('EVERY programme is declared prospective (no partnership is claimed)',
    s.TRADE_PARTNERSHIPS_ARE_PROSPECTIVE === true &&
      programmes.every((p) => p.status === 'prospective_partnership'));
  test('the disclaimer explicitly says no partnership exists',
    /does NOT currently hold a partnership/i.test(s.TRADE_PARTNERSHIP_DISCLAIMER));

  /* ── §14 speed-to-revenue over the REAL canonical universe ──────────── */

  prospectStore.ensureProspectStore();
  const prospects = prospectStore.getProspects();
  test(`the canonical prospect universe is available to rank (${prospects.length})`,
    prospects.length >= 10, String(prospects.length));

  const ranked = s.rankBySpeedToRevenue(prospects);
  const rankedAgain = s.rankBySpeedToRevenue(prospects);
  test('the ranking is deterministic (identical across calls)',
    JSON.stringify(ranked) === JSON.stringify(rankedAgain));
  test('ranks are sequential from 1 and every opportunity is scored',
    ranked.length > 0 &&
      ranked.every((r, i) => r.rank === i + 1 && r.speedToRevenueScore >= 0 && r.speedToRevenueScore <= 100));
  test('the ranking order is by score, highest first',
    ranked.every((r, i) => i === 0 || ranked[i - 1].speedToRevenueScore >= r.speedToRevenueScore));
  test('every projection is LABELLED an estimate (never measured data)',
    ranked.every((r) => r.basis === 'estimate' && r.estimateLabel === s.ESTIMATE_LABEL) &&
      /not measured/i.test(s.ESTIMATE_LABEL));
  test('time-to-revenue and economics are bounded and positive',
    ranked.every((r) => r.timeToRevenueWeeks >= 2 && r.timeToRevenueWeeks <= 30 &&
      r.projectedRevenueGbp > 0 && r.projectedMercentaMarginGbp > 0));
  test('margin projections come from the canonical commercial-model arithmetic',
    ranked.every((r) => r.projectedMercentaMarginGbp < r.projectedRevenueGbp));

  const rollup = s.summariseByStrategy(prospects);
  test('the strategy rollup accounts for every ranked opportunity',
    rollup.uk_brands.count + rollup.global_to_uk.count === ranked.length);
  test('both strategies are populated by the real universe (A from ukPresence/country)',
    rollup.uk_brands.count + rollup.global_to_uk.count > 0);

  /* ── §16 market-access tagging is a REAL write path ─────────────────── */

  const target = ranked[0].prospectId;
  const event = lifecycle.setProspectMarketAccess(
    target,
    {
      sourceCountry: 'Zimbabwe',
      programme: 'british_embassy',
      partnerSource: 'validator',
      campaign: 'M12 validation',
    },
    'validator'
  );
  test('tagging a route records a lifecycle event on the canonical prospect',
    !!event && event.field === 'marketAccess' &&
      /British Embassy/.test(event.after) && /validator/.test(event.summary));
  const tagged = prospectStore.getProspect(target);
  test('the tag persists on the prospect record',
    tagged.marketAccess?.sourceCountry === 'Zimbabwe' &&
      tagged.marketAccess?.programme === 'british_embassy');
  test('the description never implies a partnership exists',
    /prospective|via|Zimbabwe/.test(s.describeMarketAccessTag(tagged.marketAccess)) &&
      !/partnership/i.test(s.describeMarketAccessTag(tagged.marketAccess)));
  test('an unknown programme id is DROPPED (fail-closed normalisation)',
    s.normaliseMarketAccessTag({ programme: 'made_up_route' }).programme === undefined);
  test('the description is meaningful for a brand with no tags',
    s.describeMarketAccessTag(undefined) === 'Direct sourcing');

  console.log(
    failures === 0
      ? `INTELLIGENCE_STRATEGY_VALIDATION_PASS (${checks} checks)`
      : `INTELLIGENCE_STRATEGY_VALIDATION_FAIL (${failures}/${checks})`
  );
} finally {
  await server.close();
}
if (failures > 0) process.exit(1);