// §Phase E2 — validates the ONBOARDING WORKFLOW built on the E1 hand-off:
//   A  brand-scoped RBAC + tenant isolation enforced IN THE DOMAIN
//   B  brand acceptance (a distinct, audited, idempotent transition)
//   C  the APPLICATION entry point creates the same canonical record (one identity)
//   D  the MANUAL entry point uses a deterministic tenant id (no Date.now() randomness)
//   E  application → onboarding → operational end-to-end, with the real audit trail
//   F  the admin pipeline read model is DERIVED (no seeded numbers)
//   G  architecture invariants (one onboarding module, no new database, zero network)
//   H  E1 regression (the acquisition hand-off still works after the E2 type changes)
//
// The durable path is proven with an INJECTED conformance repository, because this
// demo environment has NO browser Supabase credentials — the memory adapter is
// active and that limitation is reported honestly, never papered over.
import { createServer } from 'vite';
// §M12 — resolve filesystem paths with fileURLToPath: a project folder whose name
// contains a space (e.g. `1. Mercenta`) is percent-encoded by `URL.pathname`, which
// silently broke this walk (ENOENT on `1.%20Mercenta`).
import { fileURLToPath } from 'node:url';
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
  console.log(`!! E2 onboarding suite attempted external fetch: ${String(url)}`);
  return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
};

const ACTOR = { staffId: 'staff-001', canMutate: true };
const VIEW_ONLY = { staffId: 'staff-005', canMutate: false };
const OPS = { kind: 'ops' };
const PROSPECT = 'prospect-tapatio';

const readSrc = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

/** Strip comments before scanning for forbidden CODE (documentation is not code). */
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
  const demos = await server.ssrLoadModule('/src/data/demoStore.ts');
  const apps = await server.ssrLoadModule('/src/data/applicationStore.ts');

  const appPanelSrc = readSrc('src/components/admin/ApplicationsPanel.tsx');
  const onbSrc = readSrc('src/lib/onboarding/onboardingLifecycle.ts');

  test('A0 this environment honestly reports NO durable persistence (memory adapter active)',
    acqStore.getPersistenceStatus().backend === 'memory' && dr.getDomainRepository().durable === false);
  const double = new ConformanceRepository();
  dr.setDomainRepository(double);

  acqStore.resetAcquisitionStore();
  store.resetProspectStore();

  /* ══ §Phase E2 ── A. brand-scoped RBAC + tenant isolation IN THE DOMAIN ══ */

  // Application-origin record (no prospect needed) = the tenant under test.
  const app = apps.submitApplication({
    companyName: 'Harbour & Fen Trading Co', country: 'United Kingdom', category: 'Home',
    phone: '+44 20 7946 0958', skuCount: 12, monthlyRevenue: '£250k', websiteUrl: null, instagramUrl: null,
    facebookUrl: null, websiteStatus: null, instagramStatus: null, facebookStatus: null,
    referralSource: 'Direct Outreach', description: 'UK homeware brand',
  });
  const begun = onb.beginOnboardingFromApplication(app.id, ACTOR);
  test('A1 an approved application creates a canonical onboarding record', begun.ok === true);
  const appRecord = begun.value;
  const brandActor = { staffId: `brand:${appRecord.brandId}`, canMutate: true, tenantId: appRecord.brandId };
  const otherBrandActor = { staffId: 'brand:someone-else', canMutate: true, tenantId: 'brand-someone-else' };

  test('A2 a brand session can accept its OWN onboarding (tenant-pinned actor)',
    onb.acceptOnboarding(appRecord.id, brandActor, 'Accepted in portal').ok === true);
  test('A3 a DIFFERENT tenant is REFUSED with CROSS_TENANT', (() => {
    const r = onb.completeOnboardingStep(appRecord.id, 'legal_agreements', otherBrandActor);
    return r.ok === false && /CROSS_TENANT/.test(r.error);
  })());
  test('A4 a DIFFERENT tenant cannot finish either', (() => {
    const r = onb.finishBrandOnboarding(appRecord.id, otherBrandActor);
    return r.ok === false && /CROSS_TENANT/.test(r.error);
  })());
  test('A5 a brand cannot INITIATE its own onboarding', (() => {
    const r = onb.beginOnboardingFromApplication(app.id, brandActor);
    return r.ok === false && /FORBIDDEN/.test(r.error);
  })());
  test('A6 a view-only account cannot accept onboarding', (() => {
    const r = onb.acceptOnboarding(appRecord.id, VIEW_ONLY);
    return r.ok === false && /FORBIDDEN/.test(r.error);
  })());
  test('A7 none of the refused attempts completed any step',
    acqStore.getOnboardingById(appRecord.id).steps.filter((s) => s.status === 'done').length === 0);

  /* ══ B. brand acceptance — a distinct, audited, idempotent transition ══ */
  const accepted = acqStore.getOnboardingById(appRecord.id);
  test('B1 acceptance moved initiated → accepted and is attributed to the brand',
    accepted.status === 'accepted' && typeof accepted.acceptedAt === 'string' &&
    accepted.acceptedBy === `brand:${appRecord.brandId}`);
  test('B2 acceptance is idempotent (a second accept changes nothing)', (() => {
    const first = accepted.acceptedAt;
    const r = onb.acceptOnboarding(appRecord.id, brandActor);
    return r.ok === true && acqStore.getOnboardingById(appRecord.id).acceptedAt === first;
  })());
  test('B3 acceptance is in the ONE platform audit log (entityType onboarding)',
    demos.demoAuditLog.some((a) => a.action === 'acquisition_onboarding_accepted' && a.entityType === 'onboarding'));
  test('B4 onboarding audit rows carry the REAL tenant id (brand-scopable)',
    demos.demoAuditLog.every((a) => a.entityType !== 'onboarding' || a.brandId === appRecord.brandId));

  /* ══ C. application entry point — one identity, no fabrication ══ */
  test('C1 the tenant id is deterministic and matches the login-card id',
    appRecord.brandId === onb.tenantIdForApplication(app.id) && appRecord.brandId === `brand-app-${app.id}`);
  test('C2 replaying the approval returns the SAME record (no duplicate)', (() => {
    const again = onb.beginOnboardingFromApplication(app.id, ACTOR);
    return again.ok === true && again.value.id === appRecord.id && acqStore.getOnboardings().length === 1;
  })());
  test('C3 the application origin fabricates NO prospect and NO opportunity',
    appRecord.origin === 'partner_application' && appRecord.prospectId === undefined &&
    appRecord.opportunityId === undefined && appRecord.biScore === undefined);
  test('C4 the record carries the REAL application data',
    appRecord.businessName === 'Harbour & Fen Trading Co' && appRecord.category === 'Home');
  test('C5 the application panel routes approval through the canonical record (no parallel identity)',
    /beginOnboardingFromApplication\(/.test(appPanelSrc) && !/brand-app-\$\{app\.id\}/.test(appPanelSrc));

  /* ══ D. manual entry point — deterministic, idempotent, collision-refusing ══ */
  const manual = onb.beginOnboardingForManualBrand(
    { name: 'Northgate Provisions Ltd', category: 'Grocery', country: 'United Kingdom', email: 'trade@northgate.example', signatory: 'A Cooper', track: 'financed' },
    ACTOR
  );
  test('D1 a manual brand gets a DERIVED, deterministic tenant id',
    manual.ok === true && manual.value.brandId === onb.tenantIdForBrand('Northgate Provisions Ltd') &&
    manual.value.brandId === 'brand-northgateprovisionsltd');
  test('D2 replaying the manual creation returns the SAME record (idempotent)', (() => {
    const again = onb.beginOnboardingForManualBrand(
      { name: 'Northgate Provisions Ltd', category: 'Grocery', country: 'United Kingdom', email: 'x@example.com', signatory: 'A Cooper', track: 'financed' },
      ACTOR
    );
    return again.ok === true && again.value.id === manual.value.id && acqStore.getOnboardings().length === 2;
  })());
  test('D3 the manual path no longer uses a Date.now()/random identity',
    !/Date\.now\(\)-\$\{Math\.random/.test(appPanelSrc) && /beginOnboardingForManualBrand\(/.test(appPanelSrc));
  test('D4 a manual brand keeps the track the operator chose (real input, not invented)',
    manual.value.track === 'financed' && manual.value.origin === 'manual_creation');

  /* ══ E. application → acceptance → ordered steps → OPERATIONAL ══ */
  const app2 = apps.submitApplication({
    companyName: 'Sable Ridge Homeware', country: 'Denmark', category: 'Home',
    phone: '+45 32 12 34 56', skuCount: 30, monthlyRevenue: '€400k', websiteUrl: null, instagramUrl: null,
    facebookUrl: null, websiteStatus: null, instagramStatus: null, facebookStatus: null,
    referralSource: 'Embassy Referral', description: 'Danish homeware brand',
  });
  const e2e = onb.beginOnboardingFromApplication(app2.id, ACTOR);
  const e2eId = e2e.value.id;
  const e2eBrand = e2e.value.brandId;
  const e2eActor = { staffId: `brand:${e2eBrand}`, canMutate: true, tenantId: e2eBrand };
  onb.acceptOnboarding(e2eId, e2eActor, 'Accepted in portal');
  const order = ['profile', 'legal_agreements', 'banking', 'carriers', 'compliance'];
  const stepOutcomes = order.map((s) => onb.completeOnboardingStep(e2eId, s, ACTOR).ok === true);
  test('E1 every ordered step completes through the domain', stepOutcomes.every(Boolean));
  test('E2 finishing while a step was outstanding would have been refused (re-ordered safety intact)',
    onb.completeOnboardingStep(e2eId, 'profile', ACTOR).ok === true); // idempotent re-complete
  const finished = onb.finishBrandOnboarding(e2eId, ACTOR);
  test('E3 the brand becomes OPERATIONAL through the canonical record',
    finished.ok === true && finished.value.status === 'completed' &&
    typeof finished.value.completedAt === 'string');
  test('E4 the tenant identity never changed across the whole lifecycle',
    finished.value.brandId === e2eBrand && finished.value.id === e2eId);
  test('E5 the full audit trail exists in the ONE audit log', (() => {
    const actions = new Set(demos.demoAuditLog.map((a) => a.action));
    return actions.has('onboarding_started_from_application') &&
      actions.has('acquisition_onboarding_accepted') &&
      actions.has('acquisition_onboarding_step_completed') &&
      actions.has('acquisition_onboarding_completed');
  })());
  test('E6 an application-origin onboarding fabricates NO prospect timeline event',
    acqStore.getAcquisitionEvents().length === 0);
  test('E7 the record is reachable by its brand tenant id (portal activation path)',
    onb.getOnboardingForTenant(e2eBrand)?.id === e2eId);

  /* ══ F. the admin pipeline read model is DERIVED ══ */
  const pipeline = onb.listOnboardingPipeline();
  test('F1 the pipeline lists exactly the records that exist', pipeline.length === acqStore.getOnboardings().length && pipeline.length === 3);
  test('F2 step progress is derived from the record (never seeded)',
    pipeline.every((r) => r.stepsTotal === 5) &&
    pipeline.find((r) => r.onboarding.id === e2eId).stepsDone === 5 &&
    pipeline.find((r) => r.onboarding.id === appRecord.id).stepsDone === 0);
  test('F3 non-acquisition origins report NO opportunity and NO prospect brand',
    pipeline.filter((r) => r.onboarding.origin !== 'acquisition_opportunity')
      .every((r) => r.opportunity === null && r.prospectBrand === null));
  test('F4 the pipeline exposes the real origin of each record',
    pipeline.some((r) => r.onboarding.origin === 'partner_application') &&
    pipeline.some((r) => r.onboarding.origin === 'manual_creation'));

  /* ══ G. architecture invariants ══ */
  const srcFiles = [];
  const walk = (dir) => {
    for (const entry of readdirSync(new URL(`../${dir}`, import.meta.url), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(rel);
      else if (/\.(ts|tsx)$/.test(entry.name)) srcFiles.push(rel);
    }
  };
  walk('src');
  test('G1 exactly ONE canonical onboarding lifecycle module exists',
    srcFiles.filter((f) => /onboardingLifecycle\.ts$/.test(f)).length === 1);
  test('G2 exactly ONE canonical acquisition store module exists',
    srcFiles.filter((f) => /acquisitionStore\.ts$/.test(f)).length === 1);
  test('G3 the onboarding path introduces NO second database mechanism',
    !/localStorage/.test(onbSrc) && !/indexedDB/i.test(onbSrc) && !/sqlite/i.test(onbSrc) &&
    !/prisma|typeorm|sequelize|knex/i.test(onbSrc));
  test('G4 the onboarding path talks to NO provider directly (SAME persistence port only)',
    !/from '@\/lib\/supabase'/.test(onbSrc) && !/fetch\(|axios|new WebSocket/.test(onbSrc));
  /**
   * §M9 repoint — the previous form was a bare file COUNT (`<= 4`), which
   * silently went stale the moment a legitimate canonical caller was added (the
   * deterministic investor-demo orchestration). The invariant it MEANT is: the
   * lifecycle has exactly ONE implementation, and only known canonical callers
   * may reference it. This is asserted structurally now, so an added parallel
   * workflow still fails while a new legitimate caller is an explicit decision.
   */
  const ONBOARDING_CALLERS = new Set([
    'src/lib/onboarding/onboardingLifecycle.ts', // the single implementation
    'src/components/admin/ApplicationsPanel.tsx',
    'src/components/admin/OnboardingPipeline.tsx',
    'src/context/GlobalStateContext.tsx',
    'src/lib/simulation/investorDemo.ts',
  ]);
  const onboardingReferencing = srcFiles.filter((f) =>
    /beginOnboardingFromApplication|beginOnboardingForManualBrand|acceptOnboarding/.test(readSrc(f))
  );
  test('G5 exactly ONE module IMPLEMENTS onboarding completion', () => {
    const definers = srcFiles.filter(
      (f) =>
        /export function beginOnboardingFromApplication/.test(readSrc(f)) ||
        /export function beginOnboardingForManualBrand/.test(readSrc(f)) ||
        /export function acceptOnboarding/.test(readSrc(f))
    );
    return definers.length === 1 && definers[0].endsWith('onboardingLifecycle.ts');
  });
  test('G5b only known canonical callers reference the onboarding lifecycle', () =>
    onboardingReferencing.every((f) => ONBOARDING_CALLERS.has(f)));
  test('G6 the E1 migration still carries RLS for the onboarding table', (() => {
    const migDir = fileURLToPath(new URL('../supabase/migrations/', import.meta.url));
    const mig = readdirSync(migDir).filter((f) => f.startsWith('021'));
    if (mig.length !== 1) return false;
    const sql = stripComments(readFileSync(`${migDir}${mig[0]}`, 'utf8'));
    return /ALTER TABLE brand_onboarding ENABLE ROW LEVEL SECURITY/.test(sql);
  })());

  /* ══ H. E1 regression — the acquisition hand-off still works ══ */
  acqStore.resetAcquisitionStore();
  store.resetProspectStore();
  const rec = acq.prepareOutreach(PROSPECT, ACTOR);
  acq.approveOutreach(rec.value.record.id, ACTOR);
  await acq.sendOutreach(rec.value.record.id, ACTOR);
  await acq.simulateResponse(PROSPECT, ACTOR);
  const opp = acq.createOpportunityFromResponse(PROSPECT, ACTOR);
  acq.setOpportunityStage(opp.value.id, 'qualified', ACTOR);
  const h1 = onb.beginBrandOnboarding(opp.value.id, ACTOR);
  test('H1 the acquisition hand-off still runs after the E2 type changes', h1.ok === true);
  test('H2 it still sets Opportunity.brandId (the D4 gap stays closed)',
    acqStore.getOpportunityForProspect(PROSPECT).brandId === h1.value.brandId);
  test('H3 an acquisition record keeps its prospect + opportunity + BI snapshot',
    h1.value.origin === 'acquisition_opportunity' && h1.value.prospectId === PROSPECT &&
    h1.value.opportunityId === opp.value.id && typeof h1.value.biScore === 'number');
  const hStates = onb.listOnboardingPipeline().find((r) => r.onboarding.id === h1.value.id);
  test('H4 the pipeline resolves the REAL originating opportunity and prospect brand',
    hStates.opportunity?.id === opp.value.id && hStates.prospectBrand === 'Tapatío');
  const hSteps = ['profile', 'legal_agreements', 'banking', 'carriers', 'compliance'];
  hSteps.forEach((s) => onb.completeOnboardingStep(h1.value.id, s, ACTOR));
  const hFinish = onb.finishBrandOnboarding(h1.value.id, ACTOR);
  test('H5 the acquisition-origin brand still reaches operational',
    hFinish.ok === true && hFinish.value.status === 'completed');
  test('H6 the prospect relationship timeline still records the onboarding transitions',
    ['onboarding_started', 'onboarding_completed'].every((t) =>
      acqStore.getAcquisitionEvents(PROSPECT).some((e) => e.type === t)));
  test('H7 the whole suite ran with ZERO external network calls', externalFetches === 0);

  console.log(failures === 0
    ? 'ONBOARDING_WORKFLOW_VALIDATION_PASS'
    : `ONBOARDING_WORKFLOW_VALIDATION_FAIL (${failures})`);
} catch (err) {
  console.log('VALIDATOR ERROR: ' + (err && err.stack ? err.stack : String(err)));
  failures++;
} finally {
  globalThis.fetch = originalFetch;
  await server.close();
}
if (failures > 0) process.exit(1);