/**
 * §PHASE 1 — DETERMINISTIC RESEARCH FIXTURES (clearly identified simulation).
 *
 * WHY THIS FILE EXISTS: the pre-audit must be fully testable and demonstrable
 * with ZERO live credentials (see `.clinerules` mock-first policy). Where a live
 * source is not configured, the research seam returns one of these fixtures.
 *
 * RULES THIS FILE OBEYS — NON-NEGOTIABLE
 * -------------------------------------
 * 1. A fixture is NEVER presented as live research. Every fixture carries
 *    `simulated: true`, an unmistakable `fixtureId` (`fixture-uk-0N`) and a
 *    `fixtureNote` that names it as a fixture; the engine copies the basis
 *    `simulated` onto every evidence record it derives from it, and the surface
 *    shows the simulation label.
 * 2. A fixture is DETERMINISTIC. Selection is a declared hash of the canonical
 *    brand key, so the same brand always receives the same fixture — the same
 *    reset produces the same scenario, and there is no `Math.random` anywhere.
 * 3. A fixture is NOT a real brand. The brand names below are deliberately
 *    synthetic ("Fixture Brand …"); none of them is a real company and none is
 *    presented as a research finding about a real company.
 * 4. A fixture exercises the interesting paths — including a demand-without-
 *    availability case and a no-presence case — so the downstream
 *    classifications, indicators and open questions are all reachable.
 * 5. No network. Nothing here fetches anything.
 */

export interface PreAuditResearchFixture {
  /** Unmistakable fixture identity — always surfaced on the result. */
  fixtureId: string;
  /** Synthetic brand label. NOT a real company. */
  fixtureBrand: string;
  fixtureNote: string;
  simulated: true;
  /** What the fixture says about the brand's UK position. */
  brandPresentInUk: boolean;
  /** UK listings observed for the brand (0 = none found). */
  ukListingCount: number;
  /** Whether the exact product was found listed in the UK. */
  exactProductListedInUk: boolean;
  /** Whether an equivalent product appears listed under another UK identity. */
  equivalentProductListedInUk: boolean;
  /** Evidence of UK demand where the product is NOT available. */
  ukDemandWithoutAvailability: boolean;
  /** Source-market listings observed for the brand. */
  sourceMarketListingCount: number;
  /** Aggregate source-market review volume observed. */
  sourceMarketReviewVolume: number;
  /** Aggregate source-market rating observed. */
  sourceMarketRating: number;
  /** Observed source-market price band (GBP), for context only. */
  observedPriceBandGbp: [number, number];
  /** Whether the category appears crowded in the UK. */
  ukCategoryCrowded: boolean;
  /** Whether a differentiated positioning appears to exist. */
  differentiationApparent: boolean;
  /** The brand's origin market as observed. */
  originMarket: string;
}

/**
 * The declared fixture set. Three profiles, each deliberately a different shape
 * so every UK-presence classification and every indicator state is reachable.
 */
export const PRE_AUDIT_FIXTURES: readonly PreAuditResearchFixture[] = [
  {
    fixtureId: 'fixture-uk-01',
    fixtureBrand: 'Fixture Brand Alpha',
    fixtureNote:
      'Deterministic simulation fixture (fixture-uk-01). Synthetic brand — this is NOT a real company and NOT a live research finding.',
    simulated: true,
    brandPresentInUk: true,
    ukListingCount: 2,
    exactProductListedInUk: true,
    equivalentProductListedInUk: false,
    ukDemandWithoutAvailability: false,
    sourceMarketListingCount: 7,
    sourceMarketReviewVolume: 1240,
    sourceMarketRating: 4.5,
    observedPriceBandGbp: [12, 19],
    ukCategoryCrowded: true,
    differentiationApparent: false,
    originMarket: 'United States',
  },
  {
    fixtureId: 'fixture-uk-02',
    fixtureBrand: 'Fixture Brand Beta',
    fixtureNote:
      'Deterministic simulation fixture (fixture-uk-02). Synthetic brand — this is NOT a real company and NOT a live research finding.',
    simulated: true,
    brandPresentInUk: true,
    ukListingCount: 1,
    exactProductListedInUk: false,
    equivalentProductListedInUk: true,
    ukDemandWithoutAvailability: false,
    sourceMarketListingCount: 5,
    sourceMarketReviewVolume: 320,
    sourceMarketRating: 4.2,
    observedPriceBandGbp: [8, 14],
    ukCategoryCrowded: false,
    differentiationApparent: true,
    originMarket: 'Germany',
  },
  {
    fixtureId: 'fixture-uk-03',
    fixtureBrand: 'Fixture Brand Gamma',
    fixtureNote:
      'Deterministic simulation fixture (fixture-uk-03). Synthetic brand — this is NOT a real company and NOT a live research finding.',
    simulated: true,
    brandPresentInUk: false,
    ukListingCount: 0,
    exactProductListedInUk: false,
    equivalentProductListedInUk: false,
    ukDemandWithoutAvailability: true,
    sourceMarketListingCount: 4,
    sourceMarketReviewVolume: 86,
    sourceMarketRating: 3.9,
    observedPriceBandGbp: [15, 27],
    ukCategoryCrowded: false,
    differentiationApparent: true,
    originMarket: 'South Africa',
  },
  {
    fixtureId: 'fixture-uk-04',
    fixtureBrand: 'Fixture Brand Delta',
    fixtureNote:
      'Deterministic simulation fixture (fixture-uk-04). Synthetic brand — this is NOT a real company and NOT a live research finding.',
    simulated: true,
    brandPresentInUk: true,
    ukListingCount: 4,
    exactProductListedInUk: false,
    equivalentProductListedInUk: false,
    ukDemandWithoutAvailability: false,
    sourceMarketListingCount: 9,
    sourceMarketReviewVolume: 610,
    sourceMarketRating: 4.4,
    observedPriceBandGbp: [10, 22],
    ukCategoryCrowded: true,
    differentiationApparent: true,
    originMarket: 'Netherlands',
  },
  {
    fixtureId: 'fixture-uk-05',
    fixtureBrand: 'Fixture Brand Epsilon',
    fixtureNote:
      'Deterministic simulation fixture (fixture-uk-05). Synthetic brand — this is NOT a real company and NOT a live research finding.',
    simulated: true,
    brandPresentInUk: true,
    ukListingCount: 1,
    exactProductListedInUk: false,
    equivalentProductListedInUk: false,
    ukDemandWithoutAvailability: false,
    sourceMarketListingCount: 6,
    sourceMarketReviewVolume: 240,
    sourceMarketRating: 4.1,
    observedPriceBandGbp: [9, 17],
    ukCategoryCrowded: false,
    differentiationApparent: false,
    originMarket: 'France',
  },
  {
    fixtureId: 'fixture-uk-06',
    fixtureBrand: 'Fixture Brand Zeta',
    fixtureNote:
      'Deterministic simulation fixture (fixture-uk-06). Synthetic brand — this is NOT a real company and NOT a live research finding.',
    simulated: true,
    brandPresentInUk: false,
    ukListingCount: 0,
    exactProductListedInUk: false,
    equivalentProductListedInUk: false,
    ukDemandWithoutAvailability: false,
    sourceMarketListingCount: 2,
    sourceMarketReviewVolume: 34,
    sourceMarketRating: 3.7,
    observedPriceBandGbp: [18, 30],
    ukCategoryCrowded: false,
    differentiationApparent: false,
    originMarket: 'United States',
  },
] as const;

/**
 * Deterministic fixture selection. A declared FNV-1a-style hash of the canonical
 * brand key modulo the fixture count — no randomness, no clock, no network, and
 * the same brand always selects the same fixture.
 */
export function selectPreAuditFixture(brandKey: string): PreAuditResearchFixture {
  let hash = 2166136261;
  for (let i = 0; i < brandKey.length; i += 1) {
    hash ^= brandKey.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const index = Math.abs(hash) % PRE_AUDIT_FIXTURES.length;
  return PRE_AUDIT_FIXTURES[index];
}

/** Every fixture is labelled simulation — pinned so a fixture cannot be unlabelled. */
export function fixtureIsLabelledSimulation(fixture: PreAuditResearchFixture): boolean {
  return fixture.simulated === true && fixture.fixtureId.startsWith('fixture-uk-') && fixture.fixtureNote.length > 0;
}
