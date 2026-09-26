// §Phase E3 — validates the CATALOG / PRODUCT-MANAGEMENT lifecycle:
//   A  product creation + access through the ONE canonical catalog store
//   B  product completeness (prerequisites derived from the existing rule)
//   C  the compliance gate is enforced and NOT weakened
//   D  an incomplete product can NEVER be submitted
//   E  a ready product submits through the EXISTING seam
//   F  the submission is EXPLICITLY simulated (UNKNOWN never becomes LIVE)
//   G  simulated processing advances through the seam
//   H  the resulting product state is correct and readable by the admin surface
//   I  the whole flow makes ZERO external network calls
//   J  tenant isolation is enforced IN THE DOMAIN
//   K  RBAC is enforced IN THE DOMAIN
//   L  persistence adapter semantics (memory honest, durable double, idempotent)
//   M  E1/E2 regression (the onboarding hand-off still works)
//   N  D/C regression + architecture invariants (no second store, migration 022)
//
// The durable path is proven with an INJECTED conformance repository, because
// this demo environment has NO browser Supabase credentials — the memory adapter
// is active, nothing is durable, and that is reported honestly.
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
  console.log(`!! E3 catalog suite attempted external fetch: ${String(url)}`);
  return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
};

const readSrc = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

/** A durable CONFORMANCE DOUBLE implementing the DomainRepository contract. */
class ConformanceRepository {
  constructor() {
    this.backend = 'supabase';
    this.durable = true;
    this.rows = new Map();
    this.writes = 0;
    this.failNext = false;
  }
  _put(table, id, payload, tenantId) {
    if (this.failNext) {
      this.failNext = false;
      return Promise.resolve({ ok: false, backend: 'supabase', durable: false, table, id, error: 'conformance: injected failure' });
    }
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
  persistCatalogSubmission(s, t) { return this._put('catalog_submissions', s.id, s, t); }
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
      catalogSubmissions: pick('catalog_submissions'),
    };
  }
  flush() { return Promise.resolve(); }
}

try {
  /* ── modules under test (the EXISTING architecture) ── */
  const dr = await server.ssrLoadModule('/src/data/domainRepository.ts');
  const api = await server.ssrLoadModule('/src/data/api.ts');
  const store = await server.ssrLoadModule('/src/data/demoStore.ts');
  const catalog = await server.ssrLoadModule('/src/lib/catalog/catalogLifecycle.ts');
  const completeness = await server.ssrLoadModule('/src/lib/catalog/productCompleteness.ts');
  const compliance = await server.ssrLoadModule('/src/lib/compliance.ts');
  const connections = await server.ssrLoadModule('/src/integrations/connections.ts');
  const spapi = await server.ssrLoadModule('/src/lib/spapi/index.ts');
  const acqStore = await server.ssrLoadModule('/src/data/acquisitionStore.ts');
  const acq = await server.ssrLoadModule('/src/lib/acquisition/outreachLifecycle.ts');
  const onb = await server.ssrLoadModule('/src/lib/onboarding/onboardingLifecycle.ts');
  const apps = await server.ssrLoadModule('/src/data/applicationStore.ts');
  const prospectStore = await server.ssrLoadModule('/src/data/prospectStore.ts');

  const ZAMBEZI = 'brand-astonish';     // cleared gate (Health & Personal Care)
  const DESKFORGE = 'brand-tapatio'; // cleared gate (Office Products)
  const NORDHAUS = 'brand-seep';   // gate still blocked

  const zambeziActor = { staffId: `brand:${ZAMBEZI}`, canMutate: true, tenantId: ZAMBEZI };
  const deskforgeActor = { staffId: `brand:${DESKFORGE}`, canMutate: true, tenantId: DESKFORGE };
  const nordhausActor = { staffId: `brand:${NORDHAUS}`, canMutate: true, tenantId: NORDHAUS };
  const viewOnly = { staffId: 'staff-005', canMutate: false, tenantId: ZAMBEZI };

  const completeProduct = (sku, over = {}) => ({
    id: `prd-${sku}`, name: `E3 test product ${sku}`, sku, barcode: '600999000001',
    commodityCode: '3304990090', vatStatus: 'Standard 20%', hazmat: false,
    length: 12, width: 10, height: 18, weight: 0.5, ...over,
  });

  test('A0 this environment honestly reports NO durable persistence (memory adapter active)',
    catalog.getCatalogPersistenceStatus().backend === 'memory' &&
    catalog.getCatalogPersistenceStatus().durable === false);

  /* ══ A. product creation + access through the ONE canonical store ══ */
  const created = store.addCatalogProduct(ZAMBEZI, completeProduct('E3-A-001', { id: '' }));
  test('A1 a product is created with its owning tenant attached', created.brandId === ZAMBEZI && created.sku === 'E3-A-001');
  test('A2 the created product is readable for its own tenant',
    !!store.findCatalogProduct(ZAMBEZI, 'E3-A-001') &&
    store.productsForBrandFromStore(ZAMBEZI).some((p) => p.sku === 'E3-A-001'));
  test('A3 another tenant cannot see it in its own catalog read',
    !store.productsForBrandFromStore(NORDHAUS).some((p) => p.sku === 'E3-A-001'));
  const again = store.addCatalogProduct(ZAMBEZI, completeProduct('E3-A-001', { id: '' }));
  const countA1 = store.productsForBrandFromStore(ZAMBEZI).filter((p) => p.sku === 'E3-A-001').length;
  test('A4 creation is idempotent by (tenant, sku) — no duplicate SKU', countA1 === 1 && again.id === created.id);
  const fetched = await api.fetchProducts();
  test('A5 the created product is visible through the existing repository read (products)',
    fetched.data.some((p) => p.brandId === ZAMBEZI && p.sku === 'E3-A-001'));

  /* ══ B. product completeness (the EXISTING prerequisite rule) ══ */
  const cFull = completeness.evaluateProductCompleteness(completeProduct('X'));
  test('B1 a fully-supplied product is complete (100%)', cFull.complete === true && cFull.percent === 100);
  const cBlank = completeness.evaluateProductCompleteness(completeProduct('X', { length: '', width: '', height: '', weight: '' }));
  test('B2 blank prerequisites are reported missing, never silently defaulted',
    cBlank.complete === false &&
    ['length', 'width', 'height', 'weight'].every((f) => cBlank.missing.includes(f)) &&
    cBlank.missingLabels.length === 4);
  test('B3 hazmat:false is a SUPPLIED value (the pre-existing semantics are preserved)',
    completeness.evaluateProductCompleteness(completeProduct('X', { hazmat: false })).complete === true);
  test('B4 the prerequisite list is the legacy 7 fields (nothing invented)',
    completeness.REQUIRED_SUBMISSION_FIELDS.length === 7 &&
    ['commodityCode', 'vatStatus', 'hazmat', 'length', 'width', 'height', 'weight']
      .every((f) => completeness.REQUIRED_SUBMISSION_FIELDS.includes(f)));

  /* ══ C. the compliance gate is enforced and NOT weakened ══ */
  test('C1 the cleared tenant passes the real gate and the blocked tenant does not',
    (await api.isComplianceGateCleared(ZAMBEZI)) === true &&
    (await api.isComplianceGateCleared(NORDHAUS)) === false);
  test('C2 the gate still requires BOTH no-missing AND no-blocking documents',
    /cleared: missing\.length === 0 && blocking\.length === 0/.test(readSrc('src/lib/compliance.ts')));
  test('C3 category-specific requirements were NOT weakened (all 10 categories present)',
    Object.keys(compliance.CATEGORY_SPECIFIC_DOCUMENTS).length === 10);
  const blockedSubmit = await catalog.submitCatalogProduct(NORDHAUS, completeProduct('E3-C-001'), nordhausActor);
  test('C4 a non-compliant tenant is refused with COMPLIANCE_GATE_BLOCKED',
    blockedSubmit.ok === false && /COMPLIANCE_GATE_BLOCKED/.test(blockedSubmit.error));
  test('C5 the refused submission recorded nothing',
    store.getSubmissionsForBrand(NORDHAUS).every((s) => s.sku !== 'E3-C-001'));

  /* ══ D. an incomplete product can NEVER be submitted ══ */
  const incomplete = await catalog.submitCatalogProduct(
    ZAMBEZI,
    completeProduct('E3-D-001', { commodityCode: '', weight: '' }),
    zambeziActor
  );
  test('D1 an incomplete product is refused with INCOMPLETE_PRODUCT + the missing list',
    incomplete.ok === false && /INCOMPLETE_PRODUCT/.test(incomplete.error) &&
    incomplete.missing.includes('commodityCode') && incomplete.missing.includes('weight'));
  test('D2 the incomplete product created no submission',
    !store.latestSubmissionForProduct(ZAMBEZI, 'E3-D-001'));

  /* ══ E. a ready product submits through the EXISTING seam ══ */
  const submitted = await catalog.submitCatalogProduct(ZAMBEZI, completeProduct('E3-E-001'), zambeziActor);
  test('E1 a ready product submits successfully', submitted.ok === true);
  test('E2 the resulting state is "submitted" with a provider tracking id',
    submitted.value.status === 'submitted' && submitted.value.submissionId.length > 0);

  /* ══ F. the submission is EXPLICITLY simulated (UNKNOWN != LIVE) ══ */
  test('F1 no live SP-API credential exists in this environment',
    connections.spApiConnectionCredentials() === null);
  test('F2 the seam selects the mock client (never live without credentials)',
    spapi.createSPApiClientForConnection({ credentials: null, edgeFunctionBase: '/functions/v1/spapi' }).mode === 'mock');
  test('F3 the submission records mode "mock" and simulated:true',
    submitted.value.mode === 'mock' && submitted.value.simulated === true);
  test('F4 the platform audit states the submission was simulated',
    store.demoAuditLog.some((e) => e.action === 'catalog_product_submitted' &&
      e.entityId === submitted.value.id && /SIMULATED/.test(e.reason)));
  test('F5 no ASIN was fabricated for the simulated submission',
    submitted.value.asin === undefined);

  /* ══ G. simulated processing advances through the seam ══ */
  const p1 = await catalog.pollCatalogSubmission(submitted.value.id, zambeziActor);
  const p2 = await catalog.pollCatalogSubmission(submitted.value.id, zambeziActor);
  const p3 = await catalog.pollCatalogSubmission(submitted.value.id, zambeziActor);
  test('G1 poll 1 → submitted', p1.ok === true && p1.value.status === 'submitted');
  test('G2 poll 2 → under_amazon_review', p2.ok === true && p2.value.status === 'under_amazon_review');
  test('G3 poll 3 → a terminal result (live or rejected)',
    p3.ok === true && (p3.value.status === 'live' || p3.value.status === 'rejected'));
  test('G4 polling is recorded honestly (count + timestamp), still simulated',
    p3.value.polls === 3 && typeof p3.value.lastPolledAt === 'string' && p3.value.simulated === true);
  test('G5 a rejected result always carries a rejection reason',
    p3.value.status !== 'rejected' || (p3.value.rejectionReason ?? '').length > 0);

  /* ══ H. the resulting product state is correct and admin-readable ══ */
  const finalState = store.latestSubmissionForProduct(ZAMBEZI, 'E3-E-001');
  test('H1 the canonical store holds the resulting state', finalState.status === p3.value.status);
  test('H2 the derived product catalog state matches the submission',
    catalog.catalogStatusForProduct(ZAMBEZI, 'E3-E-001').status === p3.value.status);
  const adminRead = await api.fetchCatalogSubmissions();
  test('H3 the admin submission read model includes the brand submission',
    adminRead.data.some((s) => s.id === submitted.value.id && s.status === p3.value.status));
  test('H4 resubmitting the same product updates in place (canonical id, no duplicate)',
    store.demoProductSubmissions.filter((s) => s.id === submitted.value.id).length === 1);

  /* ══ I. the whole flow made ZERO external network calls ══ */
  test('I1 zero external network calls occurred during the entire E3 flow', externalFetches === 0);

  /* ══ J. tenant isolation IN THE DOMAIN ══ */
  const crossRead = catalog.listBrandCatalogSubmissions(ZAMBEZI, deskforgeActor);
  test('J1 a DIFFERENT tenant is refused with CROSS_TENANT on read',
    crossRead.ok === false && /CROSS_TENANT/.test(crossRead.error));
  const crossSubmit = await catalog.submitCatalogProduct(ZAMBEZI, completeProduct('E3-J-001'), deskforgeActor);
  test('J2 a DIFFERENT tenant cannot submit for this tenant',
    crossSubmit.ok === false && /CROSS_TENANT/.test(crossSubmit.error));
  const crossPoll = await catalog.pollCatalogSubmission(submitted.value.id, deskforgeActor);
  test('J3 a DIFFERENT tenant cannot poll this submission',
    crossPoll.ok === false && /CROSS_TENANT/.test(crossPoll.error));
  const deskRead = catalog.listBrandCatalogSubmissions(DESKFORGE, deskforgeActor);
  test('J4 a tenant reads ONLY its own submissions',
    deskRead.ok === true && deskRead.value.every((s) => s.brandId === DESKFORGE) &&
    !deskRead.value.some((s) => s.id === submitted.value.id));
  test('J5 a cross-tenant attempt changed nothing',
    !store.latestSubmissionForProduct(ZAMBEZI, 'E3-J-001') &&
    store.getCatalogSubmission(submitted.value.id).status === p3.value.status);

  /* ══ K. RBAC IN THE DOMAIN ══ */
  const rbacSubmit = await catalog.submitCatalogProduct(ZAMBEZI, completeProduct('E3-K-001'), viewOnly);
  test('K1 a view-only account cannot submit', rbacSubmit.ok === false && /FORBIDDEN/.test(rbacSubmit.error));
  const rbacPoll = await catalog.pollCatalogSubmission(submitted.value.id, viewOnly);
  test('K2 a view-only account cannot poll', rbacPoll.ok === false && /FORBIDDEN/.test(rbacPoll.error));
  test('K3 a view-only account MAY read its tenant (reads are not mutations)',
    catalog.listBrandCatalogSubmissions(ZAMBEZI, viewOnly).ok === true);
  test('K4 the refused attempts changed nothing',
    store.getCatalogSubmission(submitted.value.id).status === p3.value.status &&
    !store.latestSubmissionForProduct(ZAMBEZI, 'E3-K-001'));

  /* ══ L. persistence adapter semantics ══ */
  const double = new ConformanceRepository();
  dr.setDomainRepository(double);
  const durableSubmit = await catalog.submitCatalogProduct(ZAMBEZI, completeProduct('E3-L-001'), zambeziActor);
  await catalog.flushCatalogPersistence();
  const durableKey = `catalog_submissions:${durableSubmit.value.id}`;
  test('L1 the durable adapter receives the submission through the SAME port',
    durableSubmit.ok === true && double.rows.has(durableKey) &&
    double.rows.get(durableKey).tenantId === ZAMBEZI);
  const statusDurable = catalog.getCatalogPersistenceStatus();
  test('L2 the persistence status reports durable + the canonical table',
    statusDurable.state === 'durable' && statusDurable.durable === true &&
    statusDurable.lastWrite.table === 'catalog_submissions');
  const writesBefore = double.writes;
  await catalog.submitCatalogProduct(ZAMBEZI, completeProduct('E3-L-001'), zambeziActor);
  await catalog.flushCatalogPersistence();
  test('L3 a replayed submission upserts (one row, canonical id) — no duplicate',
    [...double.rows.values()].filter((r) => r.id === durableSubmit.value.id).length === 1 &&
    double.writes === writesBefore + 1);
  double.failNext = true;
  await catalog.submitCatalogProduct(ZAMBEZI, completeProduct('E3-L-002'), zambeziActor);
  await catalog.flushCatalogPersistence();
  const statusFailed = catalog.getCatalogPersistenceStatus();
  test('L4 a FAILED write is reported failed, never as durable',
    statusFailed.state === 'failed' && statusFailed.durable === false && !!statusFailed.error);
  dr.resetDomainRepository();
  test('L5 the memory adapter is restored as the environment default (nothing claimed durable)',
    dr.getDomainRepository().durable === false && catalog.getCatalogPersistenceStatus().durable === false);

  /* ══ M. E1/E2 regression — the onboarding hand-off still works ══ */
  acqStore.resetAcquisitionStore();
  const app = apps.submitApplication({
    companyName: 'E3 Regression Trading Co', country: 'United Kingdom', category: 'Home',
    phone: '+44 20 7946 0958', skuCount: 8, monthlyRevenue: '£120k', websiteUrl: null, instagramUrl: null,
    facebookUrl: null, websiteStatus: null, instagramStatus: null, facebookStatus: null,
    referralSource: 'Direct Outreach', description: 'E3 regression brand',
  });
  const begun = onb.beginOnboardingFromApplication(app.id, { staffId: 'staff-001', canMutate: true });
  test('M1 an approved application still creates a canonical onboarding record (E1/E2 intact)',
    begun.ok === true && begun.value.status === 'initiated');
  const regressionActor = {
    staffId: `brand:${begun.value.brandId}`, canMutate: true, tenantId: begun.value.brandId,
  };
  test('M2 a brand can still accept its own onboarding (E2 unchanged)',
    onb.acceptOnboarding(begun.value.id, regressionActor, 'Accepted in portal').ok === true);
  test('M3 onboarding tenant isolation is unchanged (a foreign tenant is still refused)',
    onb.completeOnboardingStep(begun.value.id, 'legal_agreements',
      { staffId: 'brand:someone-else', canMutate: true, tenantId: 'brand-someone-else' }).ok === false);
  const empty = dr.emptyHydratedState();
  test('M4 the E3 port extension is purely additive (no existing hydrated field was removed)',
    Array.isArray(empty.catalogSubmissions) && Array.isArray(empty.brandOnboarding) &&
    Array.isArray(empty.opportunities) && Array.isArray(empty.snapshots));

  /* ══ N. D/C regression + architecture invariants ══ */
  test('N1 the canonical BI prospect store is intact (BI untouched by E3)',
    prospectStore.getProspects().length > 0 && prospectStore.getAcquisitionLeads().length > 0);
  const demoDataSrc = readSrc('src/data/demoData.ts');
  const typesSrc = readSrc('src/types.ts');
  test('N2 the product shape is declared ONCE (DemoProduct extends Product)',
    /export interface DemoProduct extends Product \{/.test(demoDataSrc) &&
    /export interface Product \{/.test(typesSrc));
  test('N3 the submission shape is declared ONCE (SeedSubmission aliases ProductSubmission)',
    /export type SeedSubmission = ProductSubmission;/.test(demoDataSrc) &&
    /export interface ProductSubmission \{/.test(typesSrc));
  const catalogSrc = readSrc('src/lib/catalog/catalogLifecycle.ts') +
    readSrc('src/lib/catalog/productCompleteness.ts') + readSrc('src/data/demoStore.ts');
  test('N4 no new storage mechanism was introduced (no sqlite/indexeddb/localStorage)',
    !/indexedDB|localStorage|sqlite|Dexie/i.test(catalogSrc));
  const apiSrc = readSrc('src/data/api.ts');
  test('N5 the submission seam no longer performs the unrunnable ad-hoc insert',
    !/product_payload/.test(apiSrc) && !/from\('catalog_submissions'\)\s*\.insert/.test(apiSrc));
  test('N6 the prerequisite list has ONE definition (api imports it, never redeclares it)',
    /from '@\/lib\/catalog\/productCompleteness'/.test(apiSrc) &&
    !/const requiredFields = \[/.test(apiSrc));
  const migDir = fileURLToPath(new URL('../supabase/migrations/', import.meta.url));
  const migFiles = readdirSync(migDir).filter((f) => f.startsWith('022'));
  test('N7 the E3 persistence migration exists', migFiles.length === 1);
  const mig = migFiles.length ? readFileSync(`${migDir}${migFiles[0]}`, 'utf8') : '';
  test('N8 it enables RLS + a brand-isolation policy on catalog_submissions',
    /ALTER TABLE catalog_submissions ENABLE ROW LEVEL SECURITY/.test(mig) &&
    /CREATE POLICY "brand_own_catalog_submissions" ON catalog_submissions[\s\S]*?brand_id = \(auth\.jwt\(\) ->> 'tenant_id'\)/.test(mig));
  test('N9 no blanket using(true), no destructive statement, legacy products untouched',
    !/using\s*\(\s*true\s*\)/i.test(mig) && !/DROP TABLE|DROP COLUMN|DELETE FROM/i.test(mig) &&
    !/ALTER TABLE products\b/.test(mig));
  test('N10 simulated provenance is NOT NULL on the row (a mock can never be read as live)',
    /simulated boolean NOT NULL DEFAULT true/.test(mig));
  test('N11 the catalog lifecycle never calls the provider outside the existing seam',
    /from '@\/data\/api'/.test(readSrc('src/lib/catalog/catalogLifecycle.ts')) &&
    !/fetch\s*\(/.test(readSrc('src/lib/catalog/catalogLifecycle.ts')));

  test('I2 still zero external network calls after every assertion', externalFetches === 0);

  console.log(failures === 0
    ? 'E3_CATALOG_VALIDATION_PASS'
    : `E3_CATALOG_VALIDATION_FAIL (${failures})`);
} catch (err) {
  console.log('VALIDATOR ERROR: ' + (err && err.stack ? err.stack : String(err)));
  failures++;
} finally {
  globalThis.fetch = originalFetch;
  await server.close();
}
if (failures > 0) process.exit(1);
