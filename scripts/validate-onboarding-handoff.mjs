// §Phase E1 — validates the OPPORTUNITY → BRAND ONBOARDING HAND-OFF:
//   A  canonical identity (one onboarding record module, deterministic ids,
//      tenant id derived from the canonical brand key — no second identity)
//   B  RBAC enforced in the DOMAIN (a view-only actor is refused, not just hidden)
//   C  eligibility gate (an unqualified opportunity cannot become a tenant)
//   D  real state change (record + Opportunity.brandId + timeline + audit + port)
//   E  strict step ordering + explicit completion (no claimed progress)
//   F  idempotence + reload semantics (no duplicate identity, durable read-back)
//   G  tenant isolation (a brand scope sees only its own onboarding)
//   H  migration/RLS + simulation honesty (zero network, no fabricated persistence)
//
// The durable path is proven with an INJECTED conformance repository, because
// this demo environment has NO browser Supabase credentials — the memory adapter
// is active and that limitation is reported honestly, never papered over.
import { createServer } from 'vite';
import { readFileSync, readdirSync } from 'node:fs';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
const test = (name, ok) => {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failures++;
};

let externalFetches = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url) => {
  externalFetches++;
  console.log(`!! E1 onboarding suite attempted external fetch: ${String(url)}`);
  return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
};

const ACTOR = { staffId: 'staff-001', canMutate: true };
const VIEW_ONLY = { staffId: 'staff-005', canMutate: false };
const OPS = { kind: 'ops' };
const PROSPECT = 'prospect-tapatio';

const readSrc = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

/**
 * Strip comments before scanning for forbidden CODE. Documentation that merely
 * *mentions* a rule (e.g. "no blanket using(true) policy") is not a violation —
 * only executable/DDL references count.
 */
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '').replace(/\/\/[^\n]*/g, '');

/** A durable CONFORMANCE DOUBLE implementing the DomainRepository contract. */
class ConformanceRepository {
  constructor() {
    this.backend = 'supabase';
    this.durable = true;
    this.rows = new Map();
    this.writes = 0;
  }
  _put(table, id, payload, tenantId) {
    this.writes++;
    this.rows.set(`${table}:${id}`, { table, id, payload, tenantId });
    return Promise.resolve({ ok: true, backend: 'supabase', durable: true, table, id });
  }
  persistOutreach(r, t) { return this._put('acquisition_outreach', r.id, r, t); }
  persistResponse(r, t) { return this._put('acquisition_responses', r.id, r, t); }
  persistOpportunity(o, t, b) {
    return this._put('acquisition_opportunities', o.id, { ...o, brandId: b ?? o.brandId }, t);
  }
  persistEvent(e, t) { return this._put('acquisition_events', e.id, e, t); }
  persistProspect(p, t) { return this._put('bi_prospects', p.id, p, t); }
  persistRun(r, t) { return this._put('bi_intelligence_runs', r.runId, r, t); }
  persistChange(c, t) { return this._put('bi_prospect_changes', c.id, c, t); }
  persistSnapshot(s, t) { return this._put('bi_snapshots', `${s.brandId}-${s.snapshotDate}`, s, t); }
  persistBrandOnboarding(o, t) { return this._put('brand_onboarding', o.id, o, t); }
  async hydrate(scope) {
    const pick = (table) => [...this.rows.values()]
      .filter((r) => r.table === table)
      .filter((r) => scope.kind === 'ops' || r.tenantId === scope.tenantId ||
        ((table === 'acquisition_opportunities' || table === 'brand_onboarding') &&
          r.payload.brandId === scope.tenantId))
      .map((r) => r.payload);
    return {
      outreach: pick('acquisition_outreach'),
      responses: pick('acquisition_responses'),
      opportunities: pick('acquisition_opportunities'),
      events: pick('acquisition_events'),
      prospects: pick('bi_prospects'),
      runs: pick('bi_intelligence_runs'),
      changes: pick('bi_prospect_changes'),
      snapshots: pick('bi_snapshots'),
      brandOnboarding: pick('brand_onboarding'),
    };
  }
  flush() { return Promise.resolve(); }
}

try {
  // ── modules under test ──
  const dr = await server.ssrLoadModule('/src/data/domainRepository.ts');
  const store = await server.ssrLoadModule('/src/data/prospectStore.ts');
  const acqStore = await server.ssrLoadModule('/src/data/acquisitionStore.ts');
  const acq = await server.ssrLoadModule('/src/lib/acquisition/outreachLifecycle.ts');
  const onb = await server.ssrLoadModule('/src/lib/onboarding/onboardingLifecycle.ts');
  const demoStore = await server.ssrLoadModule('/src/data/demoStore.ts');

  const onbSrc = readSrc('src/lib/onboarding/onboardingLifecycle.ts');
  const storeSrc = readSrc('src/data/acquisitionStore.ts');
  const typesSrc = readSrc('src/types.ts');

  // ══ A. Canonical identity — no second identity system ══
  test('A1 onboarding ids are deterministic and workflow-owned',
    onb.onboardingIdFor('prospect-x') === 'onb-prospect-x' &&
    onb.onboardingIdFor(PROSPECT) === 'onb-prospect-tapatio');
  test('A2 the tenant id is derived from the CANONICAL brand key (diacritics folded)',
    onb.tenantIdForBrand('Tapatío') === 'brand-tapatio' &&
    onb.tenantIdForBrand('Seep') === 'brand-seep');
  test('A3 exactly ONE canonical onboarding record type exists (in src/types.ts)',
    /export interface BrandOnboarding/.test(typesSrc) && !/export interface BrandOnboarding/.test(onbSrc));
  test('A4 onboarding state lives in the EXISTING canonical acquisition store (no second store)',
    /getOnboardingForProspect/.test(storeSrc) &&
    /getOnboardings/.test(storeSrc));
  test('A5 the onboarding lifecycle performs no network / no direct Supabase access',
    !/fetch\(|@\/lib\/supabase|new WebSocket|axios/.test(onbSrc));

  // ══ HONEST environment report (before any injection) ══
  test('A6 this environment honestly reports NO durable persistence (memory adapter active)',
    acqStore.getPersistenceStatus().backend === 'memory' &&
    acqStore.getPersistenceStatus().durable === false &&
    dr.getDomainRepository().durable === false);

  // Inject the durable conformance double (no live Supabase project here).
  const double = new ConformanceRepository();
  dr.setDomainRepository(double);

  // ══ C/D setup — run the canonical acquisition workflow to a real opportunity ══
  acqStore.resetAcquisitionStore();
  store.resetProspectStore();
  const rec = acq.prepareOutreach(PROSPECT, ACTOR);
  acq.approveOutreach(rec.value.record.id, ACTOR);
  await acq.sendOutreach(rec.value.record.id, ACTOR);
  await acq.simulateResponse(PROSPECT, ACTOR);
  const created = acq.createOpportunityFromResponse(PROSPECT, ACTOR);
  test('D0 the canonical acquisition workflow produced a real opportunity',
    created.ok === true && created.value.prospectId === PROSPECT);
  const opp = created.value;

  // ══ B. RBAC enforced in the domain ══
  const before = acqStore.getOnboardings().length;
  test('B1 a view-only actor cannot BEGIN onboarding', (() => {
    const r = onb.beginBrandOnboarding(opp.id, VIEW_ONLY);
    return r.ok === false && /FORBIDDEN/.test(r.error);
  })());
  test('B2 a view-only actor cannot COMPLETE a step', (() => {
    const r = onb.completeOnboardingStep(onb.onboardingIdFor(PROSPECT), 'profile', VIEW_ONLY);
    return r.ok === false && /FORBIDDEN/.test(r.error);
  })());
  test('B3 a view-only actor cannot FINISH onboarding', (() => {
    const r = onb.finishBrandOnboarding(onb.onboardingIdFor(PROSPECT), VIEW_ONLY);
    return r.ok === false && /FORBIDDEN/.test(r.error);
  })());
  test('B4 the refused attempts changed no state at all',
    acqStore.getOnboardings().length === before && before === 0);

  // ══ C. Eligibility gate — an unqualified opportunity is never a tenant ══
  acqStore.updateOpportunity(opp.id, { stage: 'new' }); // test-only state setup
  const early = onb.beginBrandOnboarding(opp.id, ACTOR);
  test('C1 onboarding is refused before the opportunity is qualified',
    early.ok === false && /ILLEGAL_TRANSITION/.test(early.error));
  test('C2 the refusal created no onboarding record', acqStore.getOnboardings().length === 0);
  test('C3 the opportunity can be qualified through the canonical transition',
    acq.setOpportunityStage(opp.id, 'qualified', ACTOR).ok === true);
  const begin = onb.beginBrandOnboarding(opp.id, ACTOR);
  test('C4 a qualified opportunity starts onboarding', begin.ok === true);
  test('C5 exactly ONE onboarding record now exists', acqStore.getOnboardings().length === 1);

  // ══ D. Real state change (not a toast) ══
  const onboarding = begin.value;
  test('D1 the record starts at "initiated" with step 1 in progress and the rest pending',
    onboarding.status === 'initiated' && onboarding.steps.length === 5 &&
    onboarding.steps[0].status === 'in_progress' &&
    onboarding.steps.slice(1).every((s) => s.status === 'pending'));
  test('D2 THE D4 GAP IS CLOSED — the opportunity now names the tenant it onboarded into',
    acqStore.getOpportunityForProspect(PROSPECT).brandId === onb.tenantIdForBrand('Tapatío') &&
    onboarding.brandId === onb.tenantIdForBrand('Tapatío'));
  test('D3 the record retains the acquisition relationship (prospect + opportunity)',
    onboarding.prospectId === PROSPECT && onboarding.opportunityId === opp.id &&
    onboarding.origin === 'acquisition_opportunity');
  test('D4 the BI snapshot carried from the opportunity is preserved (never re-derived)',
    onboarding.biScore === opp.biScore && onboarding.biTier === opp.biTier);
  test('D5 the hand-off is on the acquisition relationship timeline',
    acqStore.getAcquisitionEvents(PROSPECT).some((e) => e.type === 'onboarding_started'));
  test('D6 the hand-off is in the ONE platform audit log',
    demoStore.demoAuditLog.some((a) => a.action === 'acquisition_onboarding_started'));
  test('D7 the onboarding record reached the persistence port (write-through)',
    double.rows.has(`brand_onboarding:${onboarding.id}`) && double.writes >= 1);
  test('D8 the fulfillment track is NOT invented at hand-off (unassigned until the brand decides)',
    onboarding.track === 'unassigned');

  // ══ E. Strict step ordering + explicit completion ══
  test('E1 a later step cannot be completed before its predecessors', (() => {
    const r = onb.completeOnboardingStep(onboarding.id, 'banking', ACTOR);
    return r.ok === false && /ILLEGAL_TRANSITION/.test(r.error);
  })());
  test('E2 finishing while steps are outstanding is refused', (() => {
    const r = onb.finishBrandOnboarding(onboarding.id, ACTOR);
    return r.ok === false && /INCOMPLETE_STEPS/.test(r.error);
  })());
  test('E3 step 1 completes, is attributed, and advances step 2', (() => {
    const r = onb.completeOnboardingStep(onboarding.id, 'profile', ACTOR, 'Profile confirmed');
    const s = r.value.steps;
    return r.ok === true && s[0].status === 'done' && s[0].completedBy === 'staff-001' &&
      s[1].status === 'in_progress' && s[0].note === 'Profile confirmed';
  })());
  const stepResults = ['legal_agreements', 'banking', 'carriers', 'compliance']
    .map((stepId) => onb.completeOnboardingStep(onboarding.id, stepId, ACTOR));
  test('E4 the remaining steps complete in order', stepResults.every((r) => r.ok === true));
  const progressed = acqStore.getOnboardingById(onboarding.id);
  test('E5 completing every step does NOT auto-complete onboarding (a distinct explicit act)',
    progressed.steps.every((s) => s.status === 'done') && progressed.status === 'in_progress');
  test('E6 re-completing a done step is idempotent (timestamp unchanged)', (() => {
    const first = progressed.steps[0].completedAt;
    const r = onb.completeOnboardingStep(onboarding.id, 'profile', ACTOR);
    return r.ok === true && acqStore.getOnboardingById(onboarding.id).steps[0].completedAt === first;
  })());
  const finished = onb.finishBrandOnboarding(onboarding.id, ACTOR);
  test('E7 onboarding completes and the brand becomes operational',
    finished.ok === true && finished.value.status === 'completed' &&
    typeof finished.value.completedAt === 'string' && finished.value.completedBy === 'staff-001');
  test('E8 completion is on the timeline and in the audit log',
    acqStore.getAcquisitionEvents(PROSPECT).some((e) => e.type === 'onboarding_completed') &&
    demoStore.demoAuditLog.some((a) => a.action === 'acquisition_onboarding_completed'));
  test('E9 a completed onboarding cannot take further steps', (() => {
    const r = onb.completeOnboardingStep(onboarding.id, 'profile', ACTOR);
    return r.ok === false && /ILLEGAL_TRANSITION/.test(r.error);
  })());

  // ══ F. Idempotence + reload semantics ══
  const again = onb.beginBrandOnboarding(opp.id, ACTOR);
  test('F1 replaying the hand-off returns the SAME record (no duplicate identity)',
    again.ok === true && again.value.id === onboarding.id && acqStore.getOnboardings().length === 1);
  await acqStore.flushAcquisitionPersistence();
  acqStore.resetAcquisitionStore();
  test('F2 a reset clears the in-memory working set (the documented honest default)',
    acqStore.getOnboardings().length === 0);
  const hydrated = await acqStore.hydrateAcquisitionFromPersistence(OPS);
  const restored = acqStore.getOnboardingById(onboarding.id);
  test('F3 reload restores the SAME onboarding identity from the durable backend',
    hydrated.brandOnboarding.length === 1 && !!restored &&
    restored.brandId === onboarding.brandId && restored.status === 'completed' &&
    restored.prospectId === PROSPECT);
  test('F4 reload preserves the opportunity ↔ tenant link',
    acqStore.getOpportunityForProspect(PROSPECT)?.brandId === onboarding.brandId);

  // ══ G. Tenant isolation ══
  const brandScope = await double.hydrate({ kind: 'brand', tenantId: onboarding.brandId });
  const otherScope = await double.hydrate({ kind: 'brand', tenantId: 'brand-somewhere-else' });
  test('G1 a brand scope can read its OWN onboarding record', brandScope.brandOnboarding.length === 1);
  test('G2 a DIFFERENT brand scope sees no onboarding record',
    otherScope.brandOnboarding.length === 0 && otherScope.opportunities.length === 0);
  test('G3 the ops scope sees the record', (await double.hydrate(OPS)).brandOnboarding.length === 1);

  // ══ H. Migration / RLS + simulation honesty ══
  const migDir = new URL('../supabase/migrations/', import.meta.url).pathname;
  const migFiles = readdirSync(migDir).filter((f) => f.startsWith('021'));
  test('H1 the E1 onboarding migration exists', migFiles.length === 1);
  const mig = migFiles.length ? readFileSync(`${migDir}${migFiles[0]}`, 'utf8') : '';
  test('H2 the onboarding table enables row level security',
    /ALTER TABLE brand_onboarding ENABLE ROW LEVEL SECURITY/.test(mig));
  test('H3 it carries explicit admin + brand-isolation policies',
    /CREATE POLICY "admin_brand_onboarding" ON brand_onboarding/.test(mig) &&
    /CREATE POLICY "brand_own_onboarding" ON brand_onboarding[\s\S]*?brand_id = \(auth\.jwt\(\) ->> 'tenant_id'\)/.test(mig));
  test('H4 no blanket permissive policy was introduced',
    !/using\s*\(\s*true\s*\)/i.test(stripComments(mig)));
  const drSrc = readSrc('src/data/domainRepository.ts');
  test('H5 the EXISTING persistence port gained the artefact (interface + both adapters)',
    /persistBrandOnboarding\(onboarding: BrandOnboarding, tenantId: string\): Promise<PersistResult>/.test(drSrc) &&
    (drSrc.match(/persistBrandOnboarding\(/g) || []).length >= 3);
  test('H6 the whole hand-off ran with ZERO external network calls', externalFetches === 0);

  console.log(failures === 0
    ? 'ONBOARDING_HANDOFF_VALIDATION_PASS'
    : `ONBOARDING_HANDOFF_VALIDATION_FAIL (${failures})`);
} catch (err) {
  console.log('VALIDATOR ERROR: ' + (err && err.stack ? err.stack : String(err)));
  failures++;
} finally {
  globalThis.fetch = originalFetch;
  await server.close();
}
if (failures > 0) process.exit(1);
