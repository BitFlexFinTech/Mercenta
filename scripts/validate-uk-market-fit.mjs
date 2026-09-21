// §Phase 1 — validates the Explore UK Market Fit / pre-audit engine:
//   A. the public CTA + the Partner Login hierarchy
//   B. required-field validation + progressive collection
//   C. the deterministic research seam (simulation, labelled, ZERO network)
//   D. the UK presence ladder A–F
//   E. the THREE separate indicators (catalogue eligibility / commercial / supply)
//   F. the eight-section UK Opportunity Snapshot + hedged wording
//   G. evidence, confidence, unknowns and thresholds retained
//   H. prospect ≠ brand, acquisition feed, tenant isolation, determinism
//   I. AI/OpenRouter unavailable is safe; no prohibited promise is generated
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
const test = (name, ok, detail = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

try {
  const cfg = await server.ssrLoadModule('/src/config/ukMarketFit.ts');
  const engine = await server.ssrLoadModule('/src/lib/preaudit/ukMarketFitEngine.ts');
  const seam = await server.ssrLoadModule('/src/lib/preaudit/researchProvider.ts');
  const fixtures = await server.ssrLoadModule('/src/lib/preaudit/fixtures.ts');
  const store = await server.ssrLoadModule('/src/data/preAuditStore.ts');
  const bridge = await server.ssrLoadModule('/src/lib/preaudit/preAuditAcquisitionBridge.ts');
  const prospects = await server.ssrLoadModule('/src/data/prospectStore.ts');
  const acquisition = await server.ssrLoadModule('/src/data/acquisitionStore.ts');
  const engineAcq = await server.ssrLoadModule('/src/lib/acquisition/acquisitionEngine.ts');
  const intel = await server.ssrLoadModule('/src/lib/intelligence/intelligenceLayer.ts');
  const events = await server.ssrLoadModule('/src/lib/events/eventFeed.ts');
  const integrationTypes = await server.ssrLoadModule('/src/integrations/types.ts');
  const demo = await server.ssrLoadModule('/src/data/demoStore.ts');
  const fsMod = await import('node:fs');

  /* ── Zero network for the whole run ─────────────────────────────────────── */
  const originalFetch = globalThis.fetch;
  let networkCalls = 0;
  globalThis.fetch = async (...args) => {
    networkCalls++;
    throw new Error(`NO LIVE NETWORK ALLOWED IN VALIDATION: ${String(args[0])}`);
  };

  const read = (p) => fsMod.readFileSync(p, 'utf8');
  const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

  /* ── A. The public CTA + the Partner Login hierarchy ────────────────────── */
  const HOME = read('src/components/marketing/Home.tsx');
  const HOME_COPY = stripComments(HOME);
  const NAV = read('src/components/marketing/PublicNav.tsx');
  const CONTENT = read('src/config/homepageContent.ts');
  const CONTENT_COPY = stripComments(CONTENT);

  test('the canonical CTA is "Explore UK Market Fit"', cfg.EXPLORE_UK_MARKET_FIT_CTA === 'Explore UK Market Fit');
  test(
    'the retired CTA wording cannot return',
    !/See (My|Your) UK Potential/i.test(CONTENT_COPY) && !/See (My|Your) UK Potential/i.test(HOME_COPY)
  );
  test('the homepage renders the assessment CTA from the content model', HOME.includes('c.hero.primaryCta'));
  test('the homepage primary CTA opens the assessment, not the portal',
    // §CLEAN-SLATE RECONCILIATION 2026-09-21 — REPOINTED (intent unchanged).
    // The CTA previously called the local view setter directly
    // (`setPublicView('explore-uk-market-fit')`). The §SEO FOUNDATION increment
    // routed every public navigation through the ONE in-app navigation function,
    // which sets the view, pushes the canonical URL and applies the route
    // metadata — so this validator (written for the pre-SEO call) has to read the
    // CURRENT canonical call. The contract is identical: the hero's primary CTA
    // opens the assessment rather than the portal, and it carries its test id.
    HOME.includes("navigate('explore-uk-market-fit')") && HOME.includes('PRE_AUDIT_TESTIDS.cta'));
  test('the homepage primary CTA carries the declared test id', HOME.includes('data-testid={PRE_AUDIT_TESTIDS.cta}'));
  test('the hero no longer renders a competing Partner Login button',
    !/c\.hero\.secondaryCta/.test(HOME_COPY));
  test('Partner Login remains the header utility action', NAV.includes('Partner Login') && NAV.includes('PRE_AUDIT_TESTIDS.headerUtility'));
  test('the header utility action carries a declared test id', NAV.includes('data-testid={PRE_AUDIT_TESTIDS.headerUtility}'));
  test('the assessment is discoverable from the public nav', NAV.includes("page: 'explore-uk-market-fit'"));
  test('the assessment has its own public route', cfg.EXPLORE_UK_MARKET_FIT_PATH === '/explore-uk-market-fit');
  test('the route is detected for direct URL access',
    // §CLEAN-SLATE RECONCILIATION 2026-09-21 — REPOINTED (intent unchanged).
    // Direct-URL detection was an inline path chain inside Home.tsx that had to be
    // kept in sync with robots.txt/sitemap by hand. It is now resolved from the
    // SEO route SSOT (`resolveRoute(window.location.pathname)`), whose public-route
    // table derives the assessment path from the canonical config
    // (`EXPLORE_UK_MARKET_FIT_PATH`). The contract is identical — a direct visit to
    // the assessment URL opens the assessment — and it is now also true of every
    // other public route, from ONE declaration.
    HOME.includes('resolveRoute(window.location.pathname)') &&
      read('src/lib/seo/publicRoutes.ts').includes('EXPLORE_UK_MARKET_FIT_PATH'));
  test('the public page union includes the assessment', NAV.includes("'explore-uk-market-fit'"));
  test('the assessment surface is code-split (not in the homepage bundle)', /lazy\(\(\) =>\s*import\('@\/components\/marketing\/ExploreUkMarketFit'\)/.test(HOME));

  /* ── B. Required validation + progressive collection ───────────────────── */
  const empty = engine.validatePreAuditInput({});
  test('validation rejects an empty assessment', !empty.valid && Object.keys(empty.errors).length === 4);
  test('validation names the four required fields',
    Boolean(empty.errors.brandName && empty.errors.website && empty.errors.country && empty.errors.category));
  test('validation rejects a malformed website',
    !engine.validatePreAuditInput({ brandName: 'Fixture Brand Alpha', website: 'nope', country: 'Germany', category: 'Home' }).valid);
  test('validation accepts a complete identity',
    engine.validatePreAuditInput({ brandName: 'Fixture Brand Alpha', website: 'https://example.com', country: 'Germany', category: 'Home' }).valid);
  test('exactly four fields are REQUIRED', cfg.PRE_AUDIT_REQUIRED_FIELDS.length === 4);
  test('everything else is optional', cfg.PRE_AUDIT_OPTIONAL_FIELDS.length >= 10);
  test('four progressive steps are declared', cfg.PRE_AUDIT_STEPS.length === 4);
  test('the steps are identity → products → research → result',
    cfg.PRE_AUDIT_STEPS.map((s) => s.id).join(',') === 'identity,products,research,result');
  const SURFACE = read('src/components/marketing/ExploreUkMarketFit.tsx');
  test('the surface renders each declared step', cfg.PRE_AUDIT_STEPS.every((s) => SURFACE.includes(`PRE_AUDIT_TESTIDS.step('${s.id}')`)));
  test('the surface lets a visitor supply only the missing information', SURFACE.includes('supplyMissing'));
  test('contact details are asked for only at the review step', SURFACE.includes('ukmf-review-email'));


  /* ── C. The research seam: simulation, labelled, fail-closed, zero network ─ */
  const provider = seam.resolvePreAuditResearchProvider();
  test('the seam resolves to the mock provider when live research is not configured', provider.id === 'preaudit-mock-research');
  test('the resolved provider is simulation-safe', seam.isPreAuditResearchSimulationSafe(provider));
  test('live research readiness is reported honestly and is NOT ready', seam.preAuditLiveResearchReadiness().ready === false);
  test('every declared research provider is named in the refusal reason',
    ['firecrawl', 'keepa', 'amazon_sp_api'].every((p) => seam.preAuditLiveResearchReadiness().reason.includes(p)));
  test('the canonical simulation-safety helper agrees with the seam', integrationTypes.isProviderSimulationSafe('simulation'));
  test('an UNKNOWN provider mode is never treated as simulation', !integrationTypes.isProviderSimulationSafe('unknown'));

  const research = await provider.fetchBrandResearch({
    brandName: 'Fixture Brand Alpha', website: 'https://example.com', country: 'Germany', category: 'Home',
  });
  test('the simulation research result is ok and explicitly simulated', research.ok && research.simulated === true);
  test('the simulation research performs ZERO network calls', research.networkCalls === 0);
  test('the simulation research carries an unmistakable fixture id', String(research.fixture?.fixtureId).startsWith('fixture-uk-'));
  test('the fixture states it is not a real company', /NOT a real company/i.test(research.fixture?.fixtureNote ?? ''));
  test('every declared source carries its honest canonical provider mode',
    research.sources.length === cfg.PRE_AUDIT_RESEARCH_SOURCES.length && research.sources.every((s) => 'providerMode' in s));
  test('no source claims to be live', research.sources.every((s) => s.providerMode !== 'live'));

  const realProvider = new seam.RealPreAuditResearchProvider();
  const realResult = await realProvider.fetchBrandResearch({
    brandName: 'Fixture Brand Alpha', website: 'https://example.com', country: 'Germany', category: 'Home',
  });
  test('the REAL provider REFUSES rather than fabricating', realResult.ok === false);
  test('the refusal is explicit and reasoned', realResult.reason.length > 40 && realResult.fixture === null);
  test('the refusal never claims live data', realResult.simulated === false && realResult.mode === 'unconfigured');
  test('the refusal states that nothing was fabricated', /fabricated/i.test(realResult.reason));

  /* ── D. The UK presence ladder A–F ──────────────────────────────────────── */
  test('exactly six presence classes are declared A–F',
    cfg.UK_PRESENCE_CLASSES.map((c) => c.id).join('') === 'ABCDEF');
  const reachable = new Set();
  for (const fixture of fixtures.PRE_AUDIT_FIXTURES) {
    const synthetic = {
      ok: true,
      mode: 'simulation',
      providerId: 'validator',
      reason: 'validator fixture',
      simulated: true,
      fixture,
      sources: [],
      observedAt: '2026-01-01',
      networkCalls: 0,
    };
    const c = engine.classifyUkPresence(
      { brandName: fixture.fixtureBrand, website: 'https://example.com', country: 'Germany', category: 'Home' },
      synthetic
    );
    reachable.add(c.presence);
  }
  test('the ladder reaches every class A–F across the declared fixtures',
    ['A', 'B', 'C', 'D', 'E', 'F'].every((c) => reachable.has(c)),
    [...reachable].sort().join(','));
  const unknownPresence = engine.classifyUkPresence(
    { brandName: 'x', website: 'https://example.com', country: 'Germany', category: 'Home' },
    { ok: false, mode: 'unconfigured', providerId: 'x', reason: 'no source', simulated: false, fixture: null, sources: [], observedAt: '2026-01-01', networkCalls: 0 }
  );
  test('presence FAILS CLOSED to unknown when no research is available', unknownPresence.presence === 'unknown');


  /* ── E/F/G. The three indicators, the snapshot, evidence and thresholds ──── */
  const input = {
    brandName: 'Fixture Brand Alpha',
    website: 'https://example.com',
    country: 'United States',
    category: 'Home',
    productName: 'Fixture Storage Basket',
    productIdentifiers: ['B0FIXTURE1', '5012345678900'],
    origin: 'United States',
    leadTimeDays: 21,
    moq: 300,
    casePack: 6,
    wholesaleCost: 8,
    retailPrice: 15,
    knownDocumentation: ['Declaration of conformity', 'Test report'],
    contactEmail: 'buyer@example.com',
    contactName: 'Fixture Buyer',
  };
  const richResearch = await provider.fetchBrandResearch({
    brandName: input.brandName, website: input.website, country: input.country, category: input.category,
  });
  const result = engine.assessUkMarketFit('preaudit-fixturealpha-1', input, richResearch);
  const snap = result.snapshot;

  test('exactly three indicators are produced', snap.indicators.length === 3);
  test('the three indicators are the declared, distinct ones',
    snap.indicators.map((i) => i.id).join(',') === 'catalogue_eligibility,commercial_opportunity,supply_viability');
  test('catalogue eligibility is the regulatory indicator', snap.indicators[0].regulatory === true);
  test('the commercial and supply indicators are NOT regulatory',
    snap.indicators[1].regulatory === false && snap.indicators[2].regulatory === false);
  test('catalogue eligibility carries its own rationale, distinct from commercial',
    snap.indicators[0].rationale !== snap.indicators[1].rationale);
  test('supply viability carries its own rationale, distinct from commercial',
    snap.indicators[2].rationale !== snap.indicators[1].rationale);
  test('every indicator exposes basis, evidence, observed, rules, confidence and unknowns',
    snap.indicators.every((i) => i.basis && Array.isArray(i.evidence) && Array.isArray(i.observed) && Array.isArray(i.rules) && i.confidence && Array.isArray(i.unknowns)));
  test('every indicator exposes at least one rule with the value it observed',
    snap.indicators.every((i) => i.rules.length > 0 && i.rules.every((r) => r.id && r.threshold && r.observed)));
  test('seven dimension findings are produced', snap.dimensions.length === cfg.UK_MARKET_FIT_DIMENSIONS.length);
  test('the eight snapshot sections are present in canonical order',
    snap.sections.map((s) => s.id).join(',') === cfg.UK_OPPORTUNITY_SNAPSHOT_SECTIONS.map((s) => s.id).join(','));
  test('every snapshot section is titled from the config',
    snap.sections.every((s, i) => s.title === cfg.UK_OPPORTUNITY_SNAPSHOT_SECTIONS[i].title));
  test('the snapshot carries evidence, confidence and unknowns',
    snap.sections.every((s) => s.basis && s.confidence && Array.isArray(s.unknowns)));
  test('the snapshot carries open questions', snap.openQuestions.length > 0);
  test('the snapshot captures the educational gaps for the future Academy', snap.educationalGaps.length > 0);
  test('every educational gap names the Academy stage that will teach it',
    snap.educationalGaps.every((g) => typeof g.academyStage === 'number' && g.academyStage >= 1));
  test('the snapshot states ONE recommended next step', snap.recommendedNextStep.startsWith('Recommended next step:'));
  test('the snapshot carries the honest disclaimer', snap.disclaimer === cfg.PRE_AUDIT_DISCLAIMER);
  test('simulated research is LABELLED on the result',
    snap.researchMode === 'simulated' && snap.simulationLabel === cfg.PRE_AUDIT_SIMULATION_LABEL);


  /* ── §9 — no single success score, anywhere ─────────────────────────────── */
  test('there is NO single success score in the snapshot', engine.snapshotHasNoSuccessScore(snap));
  test('the no-single-score rule is declared', cfg.NO_SINGLE_SUCCESS_SCORE === true);
  const engineSrc = stripComments(read('src/lib/preaudit/ukMarketFitEngine.ts'));
  test('the engine never computes an aggregate success score', !/successScore\s*[:=]\s*\d/.test(engineSrc));
  test('the engine has no Math.random', !/Math\.random\s*\(/.test(engineSrc));
  test('the engine uses no timer', !/setInterval\s*\(|setTimeout\s*\(/.test(engineSrc));
  test('the engine makes no network call', !/\bfetch\s*\(|XMLHttpRequest/.test(engineSrc));

  /* ── §10 — hedged wording, and no prohibited promise ───────────────────── */
  test('every generated statement uses the declared hedged vocabulary', engine.statementsUseDeclaredVocabulary(snap));
  /**
   * The disclaimer is the DECLARED NEGATION ("not a promise of…, not an
   * endorsement, a partnership or an approval"), so it is deliberately excluded
   * from the claim scan and asserted separately below. Scanning it would make
   * the gate fail on the very text that makes the result honest.
   */
  const claimText = [
    snap.headline,
    snap.recommendedNextStep,
    ...snap.sections.flatMap((s) => s.statements),
  ].join(' ').toLowerCase();
  test('no prohibited promise appears anywhere in the result CLAIMS',
    engine.statementsAvoidProhibitedPromises(
      { ...snap, disclaimer: '' },
      cfg.PRE_AUDIT_PROHIBITED_PROMISES
    ));
  test('the disclaimer explicitly denies every prohibited claim',
    /not a promise of/i.test(snap.disclaimer) &&
      /nothing here is an endorsement, a partnership or an approval/i.test(snap.disclaimer));
  test('the result never claims an approval, endorsement or partnership',
    !/\bapproved\b|\bendorsed\b|\bpartnership\b/.test(claimText));
  test('the result never uses the word guarantee', !/guarantee/.test(claimText));

  /* ── §9 — a real number is only ever derived from a supplied number ────── */
  const commercial = snap.indicators.find((i) => i.id === 'commercial_opportunity');
  test('the commercial indicator computes a spread from the SUPPLIED cost and price',
    commercial.observed.some((o) => o.includes('gross spread share')));
  test('the computed spread matches the supplied figures (8 → 15 = 46.7%)',
    commercial.observed.some((o) => o.includes('46.7%')),
    commercial.observed.join(' | '));
  test('the commercial indicator declares that additional costs were NOT applied',
    commercial.unknowns.some((u) => /not been applied/i.test(u)));

  const minimalInput = {
    brandName: 'Fixture Brand Zeta', website: 'https://example.com', country: 'France', category: 'Home',
  };
  const noNumbers = engine.assessUkMarketFit(
    'preaudit-minimal-1',
    minimalInput,
    await provider.fetchBrandResearch(minimalInput)
  );
  const noCommercial = noNumbers.snapshot.indicators.find((i) => i.id === 'commercial_opportunity');
  test('with no supplied figures NO margin is invented', noCommercial.state === 'unknown');
  test('the indicator says plainly that no figure was invented', /no figure has been invented/i.test(noCommercial.rationale));
  const noSupply = noNumbers.snapshot.indicators.find((i) => i.id === 'supply_viability');
  test('with no supplied lead time NO lead-time verdict is invented', noSupply.state === 'unknown');
  test('the supply indicator declares its own planning bar as a rule with its observed value',
    noSupply.rules.some((r) => r.id === 'long_lead_time_days' && r.threshold && r.observed));
  test('the supply indicator never states a universal maximum lead time',
    !/maximum lead time/i.test(noSupply.rationale + noSupply.unknowns.join(' ')) ||
      /not a rule imposed/i.test(noSupply.unknowns.join(' ')));

  /* ── §9 — the approved-category gate fails closed and is not silent ─────── */
  const outOfCategory = engine.assessUkMarketFit('preaudit-ooc-1', {
    brandName: 'Fixture Brand OutOfCategory', website: 'https://example.com', country: 'France', category: 'Sports Equipment',
  }, await provider.fetchBrandResearch({
    brandName: 'Fixture Brand OutOfCategory', website: 'https://example.com', country: 'France', category: 'Sports Equipment',
  }));
  test('an out-of-category product is reported as INELIGIBLE, never silently analysed',
    outOfCategory.snapshot.qualification === 'ineligible');
  test('the ineligible result states the reason', /not one of the categories/i.test(outOfCategory.snapshot.sections[7].statements.join(' ')));
  test('the approved-category gate names the canonical categories',
    outOfCategory.snapshot.indicators[0].rules.some((r) => r.id === 'approved_category_gate' && r.threshold.includes('Health')));

  /* ── §7 — the canonical records the assessment produces ─────────────────── */
  test('a Brand Opportunity record is produced', Boolean(result.brandOpportunity.dedupeKey));
  test('the Brand Opportunity uses the CANONICAL brand identity key',
    result.brandOpportunity.dedupeKey === result.brandOpportunity.dedupeKey.toLowerCase().replace(/[^a-z0-9]+/g, ''));
  test('a Product Opportunity record is produced', result.productOpportunities.length === 1);
  test('the Product Opportunity records the match relationship',
    ['exact', 'probable', 'related', 'none', 'unknown'].includes(result.productOpportunities[0].matchRelationship));
  test('the Product Opportunity carries NO invented UK ASIN', result.productOpportunities[0].ukAsin === null);
  test('the Product Opportunity carries the supplied GTIN', result.productOpportunities[0].gtin === '5012345678900');
  test('a Supply Profile record is produced', Boolean(result.supplyProfile.id));
  test('the Supply Profile states what it does NOT know', result.supplyProfile.unknowns.length > 0);
  test('the Supply Profile invents no safety buffer', result.supplyProfile.safetyBufferDays === null);
  test('the Supply Profile invents no transit estimate', result.supplyProfile.transitEstimateDays === null);

  /* ── §16 — the educational gaps are captured, not taught here ──────────── */
  test('educational gaps are captured for the Academy seam', noNumbers.snapshot.educationalGaps.length > result.snapshot.educationalGaps.length);
  test('the assessment never teaches the gap (no Academy content in this phase)',
    !/academy lesson|learn more about/i.test(claimText));


  /* ── H. The store: ownership, tenant isolation, determinism ────────────── */
  prospects.resetProspectStore();
  acquisition.resetAcquisitionStore();
  store.resetPreAuditStore();
  events.resetEvents();
  demo.demoAuditLog.length = 0;

  const ownerA = { kind: 'public_session', sessionId: 'session-a' };
  const ownerB = { kind: 'public_session', sessionId: 'session-b' };

  const recA = store.startAssessment(ownerA, input);
  const recB = store.startAssessment(ownerB, minimalInput);
  const resultA = engine.assessUkMarketFit(recA.id, input, richResearch);
  store.attachAssessmentResult(recA.id, resultA);
  store.attachAssessmentResult(
    recB.id,
    engine.assessUkMarketFit(recB.id, minimalInput, await provider.fetchBrandResearch(minimalInput))
  );

  test('two assessments are stored', store.allPreAuditAssessments().length === 2);
  test('assessment ids are deterministic, never time-derived',
    recA.id === 'preaudit-fixturebrandalpha-1' && recB.id === 'preaudit-fixturebrandzeta-1',
    `${recA.id} / ${recB.id}`);
  test('a public session sees ONLY its own assessment',
    store.assessmentsForScope({ kind: 'public_session', sessionId: 'session-a' }).length === 1 &&
      store.assessmentsForScope({ kind: 'public_session', sessionId: 'session-a' })[0].id === recA.id);
  test('another public session cannot see the first visitor assessment',
    store.assessmentsForScope({ kind: 'public_session', sessionId: 'session-b' }).every((a) => a.id !== recA.id));
  test('a brand tenant sees NO pre-audit records it does not own',
    store.assessmentsForScope({ kind: 'brand', tenantId: 'demo-brand-a' }).length === 0);
  test('ops sees the whole pre-audit universe (Mercenta owns prospect research)',
    store.assessmentsForScope({ kind: 'ops' }).length === 2);
  test('ownership is explicit on every record',
    store.allPreAuditAssessments().every((a) => a.owner && typeof a.owner.kind === 'string'));
  test('the completed assessment records its result and status',
    store.getPreAuditAssessment(recA.id).status === 'assessed' && store.getPreAuditAssessment(recA.id).snapshot !== null);


  /* ── §11 — pre-audit FEEDS the canonical acquisition engine ────────────── */
  const prospectsBefore = prospects.getProspects().length;
  const refused = bridge.feedAssessmentToAcquisition(recB.id, 'staff:founder');
  test('an UNQUALIFIED assessment is REFUSED by the bridge', refused.ok === false);
  test('the refusal is explicit and reasoned', refused.reason.length > 30);
  test('a refused feed writes NOTHING', prospects.getProspects().length === prospectsBefore);
  test('a refused feed can never create a brand tenant', refused.createdBrandTenant === false);

  test('the fully-supplied assessment is qualified', resultA.snapshot.qualification === 'qualified',
    resultA.snapshot.qualificationLabel);
  const fed = bridge.feedAssessmentToAcquisition(recA.id, 'staff:founder');
  test('a QUALIFIED assessment is fed into the canonical acquisition pipeline', fed.ok === true, fed.reason);
  test('the feed creates a canonical BI prospect', fed.created === true && fed.prospectId !== null);
  test('the prospect lands in the canonical BI store',
    prospects.getProspects().some((p) => p.id === fed.prospectId));
  test('the prospect is scored by the ONE canonical scoring client',
    (prospects.getProspect(fed.prospectId)?.score.total ?? -1) >= 0);
  test('the prospect is NOT a brand', engineAcq.isProspectActivatedBrand(fed.prospectId) === false);
  test('the feed reports the canonical acquisition stage',
    typeof fed.stage === 'string' && fed.stage.length > 0, String(fed.stage));
  test('the prospect appears in the canonical acquisition lifecycle',
    engineAcq.acquisitionRecords().some((r) => r.prospectId === fed.prospectId));
  test('a canonical AcquisitionEvent was recorded',
    acquisition.getAcquisitionEvents(fed.prospectId).some((e) => e.type === 'opportunity_created'));
  test('the feed is attributed and audited',
    demo.demoAuditLog.some((r) => r.action === 'pre_audit_fed_to_acquisition' && r.actorId === 'staff:founder'));
  test('the assessment records the canonical prospect it fed',
    store.getPreAuditAssessment(recA.id).fedProspectId === fed.prospectId);
  test('the prospect carries the assessment evidence',
    (prospects.getProspect(fed.prospectId)?.evidence.length ?? 0) > 0);
  test('the prospect carries NO invented ASIN', (prospects.getProspect(fed.prospectId)?.asins.length ?? 1) === 0);

  const refeed = bridge.feedAssessmentToAcquisition(recA.id, 'staff:founder');
  test('re-feeding does NOT duplicate the prospect', refeed.ok === true && refeed.created === false);
  test('the canonical prospect universe grew by exactly one',
    prospects.getProspects().length === prospectsBefore + 1, String(prospects.getProspects().length));

  /* ── §12 — prospect ≠ brand is preserved by the whole layer ────────────── */
  const bridgeSrc = stripComments(read('src/lib/preaudit/preAuditAcquisitionBridge.ts'));
  test('the bridge never creates a brand tenant', !/saveOnboarding|updateOnboarding/.test(bridgeSrc));
  test('the bridge declares createdBrandTenant as the literal false', /createdBrandTenant:\s*false/.test(bridgeSrc));
  test('the bridge refuses anything that is not qualified',
    bridgeSrc.includes('PRE_AUDIT_FEEDS_ACQUISITION_STATES.includes'));
  test('only the qualified state may feed acquisition',
    cfg.PRE_AUDIT_FEEDS_ACQUISITION_STATES.join(',') === 'qualified');
  const storeSrc = stripComments(read('src/data/preAuditStore.ts'));
  test('the store never creates a brand tenant', !/demoBrands\.push|saveOnboarding/.test(storeSrc));

  /* ── §20 — canonical events through the EXISTING feed ─────────────────── */
  const emittedTypes = new Set(events.queryEvents({}).map((e) => e.type));
  test('the assessment emits assessment_started through the existing event feed',
    emittedTypes.has('assessment_started'));
  test('the assessment emits assessment_completed through the existing event feed',
    emittedTypes.has('assessment_completed'));
  test('the assessment emits opportunity_created through the existing event feed',
    emittedTypes.has('opportunity_created'));
  test('a qualified assessment emits opportunity_qualified', emittedTypes.has('opportunity_qualified'));
  test('a non-qualified assessment emits research_required', emittedTypes.has('research_required'));
  test('every declared Phase 1 event type is a canonical EventType',
    cfg.PRE_AUDIT_EVENT_TYPES.every((t) => typeof events.EVENT_SEVERITY_MAP[t] === 'string'));
  test('requesting a review emits outreach_ready through the existing feed', (() => {
    events.resetEvents();
    store.requestMercentaReview(recA.id, { email: 'buyer@example.com' });
    return events.queryEvents({}).some((e) => e.type === 'outreach_ready');
  })());


  /* ── I. AI / OpenRouter unavailable is SAFE (Phase 1 needs no AI) ──────── */
  const aiClient = await server.ssrLoadModule('/src/lib/ai/founderAiClient.ts');
  const availability = aiClient.aiAvailability();
  test('AI availability is resolved honestly and is not silently live',
    availability.state !== 'free_model_ready' || availability.mode === 'live', availability.state);
  test('no paid AI fallback is permitted', availability.paidFallbackAllowed === false);
  test('the AI credential seam is server-side (never a VITE variable)',
    availability.credentialSeam === 'server_side');
  const seamSrc = stripComments(read('src/lib/preaudit/researchProvider.ts'));
  test('the research seam reads no VITE environment variable', !/import\.meta\.env/.test(seamSrc));
  test('the research seam takes its credential from a server-side seam',
    seamSrc.includes('preAuditResearchCredentialSeam'));
  test('the pre-audit layer imports NO AI module', !/from '@\/lib\/ai/.test(seamSrc + engineSrc));
  const storeSrc2 = stripComments(read('src/data/preAuditStore.ts'));
  test('the pre-audit STORE imports no AI module', !/from '@\/lib\/ai/.test(storeSrc2));

  /* ── §13/§23 — no external provider call anywhere in the run ───────────── */
  test('the whole validation run made ZERO external network calls', networkCalls === 0, String(networkCalls));
  test('the seam declares networkCalls as the literal 0', /networkCalls:\s*0/.test(seamSrc));
  test('the fixtures module has no Math.random', !/Math\.random\s*\(/.test(stripComments(read('src/lib/preaudit/fixtures.ts'))));
  test('the fixtures module makes no network call',
    !/\bfetch\s*\(|XMLHttpRequest/.test(stripComments(read('src/lib/preaudit/fixtures.ts'))));

  /* ── §21 — reset / repeatability ──────────────────────────────────────── */
  store.resetPreAuditStore();
  const again = store.startAssessment(ownerA, input);
  test('after a reset the same inputs produce the SAME deterministic id', again.id === recA.id, again.id);
  const run1 = engine.assessUkMarketFit('x-1', input, richResearch);
  const run2 = engine.assessUkMarketFit('x-1', input, richResearch);
  test('the engine is PURE — the same inputs produce an identical result',
    JSON.stringify(run1.snapshot) === JSON.stringify(run2.snapshot));
  test('the engine produces the same snapshot for a fresh assessment id',
    JSON.stringify(run1.snapshot) === JSON.stringify(resultA.snapshot));

  /* ── §7 — the canonical seams are re-used, not duplicated ──────────────── */
  test('the pre-audit re-uses the canonical evidence bases (no fifth basis)',
    cfg.PRE_AUDIT_EVIDENCE_BASES.join(',') === Object.keys(intel.INTELLIGENCE_BASIS_LABELS).join(','));
  test('the pre-audit persists through the SAME domain port',
    read('src/data/domainRepository.ts').includes("preAuditAssessments: 'preaudit_assessments'"));
  test('the domain port declares the pre-audit table',
    read('src/data/domainRepository.ts').includes('persistPreAuditAssessment'));
  test('the pre-audit store mirrors every mutation through the port',
    storeSrc2.includes('createPersistenceMirror') && storeSrc2.includes('persistPreAuditAssessment'));
  test('no second database, ORM or store mechanism was introduced',
    !/sqlite|indexedDB|localStorage|new Dexie/i.test(storeSrc2 + seamSrc + engineSrc));

  /* ── §19 — RBAC: the founder surface is Super-Admin guarded ────────────── */
  const SHELL = read('src/components/layout/AdminShell.tsx');
  test('the founder Control Centre remains Super-Admin guarded',
    SHELL.includes("adminView === 'control_centre' && (isSuper ?"));
  test('the pre-audit queue lives inside the Super-Admin Control Centre',
    read('src/components/admin/FounderControlCentre.tsx').includes('Explore UK Market Fit'));
  test('the pre-audit queue feeds acquisition through the canonical bridge only',
    read('src/components/admin/FounderControlCentre.tsx').includes('feedAssessmentToAcquisition'));
  test('no brand-facing component imports the pre-audit store',
    !read('src/components/layout/BrandShell.tsx').includes('preAuditStore'));

  /* ── The public surface presents no internal scoring ───────────────────── */
  const surfaceSrc = stripComments(SURFACE);
  test('the public surface leaks no internal BI score or tier',
    !/\.score\b|\btier\b/.test(surfaceSrc));
  test('the public surface labels the simulation badge',
    surfaceSrc.includes('PRE_AUDIT_TESTIDS.simulationBadge'));
  test('the public surface shows the disclaimer', surfaceSrc.includes('snapshot.disclaimer'));
  test('the public surface states what could not be established',
    surfaceSrc.includes('couldNotEstablish'));
  test('the public surface carries the three separate indicators',
    surfaceSrc.includes('snapshot.indicators.map'));
  test('the public surface renders all eight snapshot sections',
    surfaceSrc.includes('snapshot.sections.map'));
  test('the public surface has no bespoke colour literals',
    !/#[0-9a-fA-F]{6}\b/.test(surfaceSrc));


  /* ── Wording: the assessment copy names no retail channel ──────────────── */
  const cfgCopy = stripComments(read('src/config/ukMarketFit.ts'));
  /**
   * The DEFINITIONS and the DECLARED NEGATIONS are excluded from the copy scan:
   * `PRE_AUDIT_PROHIBITED_PROMISES` necessarily contains the phrases it forbids,
   * and the disclaimer necessarily negates them. Every other 20+ character
   * quoted string in the config is outward-facing copy and is scanned.
   */
  const outwardStrings = [...cfgCopy.matchAll(/'([^']{20,})'/g)]
    .map((m) => m[1])
    .filter((s) => !cfg.PRE_AUDIT_PROHIBITED_PROMISES.includes(s) && s !== cfg.PRE_AUDIT_DISCLAIMER);
  test('no outward-facing assessment string names the retail channel',
    !outwardStrings.some((s) => /\bamazon\b|\bvendor central\b|\bseller central\b|\b1p\b/i.test(s)));
  test('no outward-facing assessment string promises an outcome',
    !outwardStrings.some((s) => /guarantee|guaranteed/i.test(s)),
    outwardStrings.filter((s) => /guarantee/i.test(s)).join(' | '));
  test('the prohibited-promise list is declared and non-empty',
    cfg.PRE_AUDIT_PROHIBITED_PROMISES.length >= 8);
  test('the hedged vocabulary is declared', Object.keys(cfg.PRE_AUDIT_HEDGES).length >= 5);
  test('every declared test id is unique',
    new Set(Object.values(cfg.PRE_AUDIT_TESTIDS).filter((v) => typeof v === 'string')).size ===
      Object.values(cfg.PRE_AUDIT_TESTIDS).filter((v) => typeof v === 'string').length);

  /* ── Restore the environment ──────────────────────────────────────────── */
  globalThis.fetch = originalFetch;
  store.resetPreAuditStore();
  prospects.resetProspectStore();
  acquisition.resetAcquisitionStore();
  events.resetEvents();
} catch (error) {
  console.error('VALIDATOR ERROR:', error);
  failures += 1;
}

console.log(`\nUK MARKET FIT (Phase 1): ${failures === 0 ? 'PASS' : 'FAIL'} — ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);

