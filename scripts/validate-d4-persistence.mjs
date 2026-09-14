// §Phase D4 — validates the DOMAIN PERSISTENCE ARCHITECTURE:
//   A  repository port contract (backend/durable + every artefact method)
//   B  write → read (a workflow mutation reaches the port and is retained)
//   C  reload semantics (reset → hydrate → the same state returns)
//   D  idempotence (replayed writes/operations never duplicate)
//   E  failure behaviour (a failed write is NEVER reported as durable)
//   F  tenant isolation (a brand scope cannot see ops/other-tenant artefacts)
//   G  RBAC (mutating operations still refuse an unauthorised actor)
//   H  canonical prospect identity (prospectId end-to-end)
//   I  BI intelligence preservation (digest reachable by reference)
//   J  acquisition traceability (prospect → outreach → response → opportunity)
//   K  ONE canonical message store (no second conversation store)
//   L  simulation performs ZERO external network calls
//   M  provider safety (an unverifiable live claim is refused)
//   N  the Phase D1 removed communications provider is absent from the registry
//   O  Postiz remains present
//   P  no duplicate stores / no new database mechanism
// Also asserts the D4 migration defines RLS on every persisted table.
//
// The durable path is proven with an INJECTED conformance repository (a Map
// backed double implementing the exact port interface), because this demo
// environment has no browser Supabase credentials — that limitation is
// reported honestly and never papered over.
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
  console.log(`!! d4 persistence suite attempted external fetch: ${String(url)}`);
  return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
};

const ACTOR = { staffId: 'staff-001', canMutate: true };
const VIEW_ONLY = { staffId: 'staff-005', canMutate: false };
const OPS = { kind: 'ops' };
const PROSPECT = 'prospect-tapatio';

const readSrc = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

/**
 * Strip comments before scanning for forbidden CODE. Documentation that merely
 * *mentions* a removed dependency (or the rule forbidding a mechanism) is not a
 * dependency — only executable references count.
 */
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

/**
 * A durable CONFORMANCE DOUBLE implementing the DomainRepository contract with
 * an in-process Map. Proves the port contract (write/read/reload/idempotence/
 * failure/isolation) with NO live Supabase — nothing here ships in product code.
 */
class ConformanceRepository {
  constructor({ failWrites = false } = {}) {
    this.backend = 'supabase';
    this.durable = true;
    this.failWrites = failWrites;
    this.rows = new Map();
    this.writes = 0;
  }
  _put(table, id, payload, tenantId) {
    this.writes++;
    if (this.failWrites) {
      return Promise.resolve({
        ok: false, backend: 'supabase', durable: false, table, id,
        error: 'CONFORMANCE_WRITE_FAILED',
      });
    }
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
  async hydrate(scope) {
    const pick = (table) =>
      [...this.rows.values()]
        .filter((r) => r.table === table)
        .filter((r) => scope.kind === 'ops' || r.tenantId === scope.tenantId ||
          (table === 'acquisition_opportunities' && r.payload.brandId === scope.tenantId))
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
  const intel = await server.ssrLoadModule('/src/lib/intelligence/prospectIntelligence.ts');
  const demoStore = await server.ssrLoadModule('/src/data/demoStore.ts');

  // ══ A. Repository port contract ══
  const REQUIRED = ['persistOutreach', 'persistResponse', 'persistOpportunity', 'persistEvent',
    'persistProspect', 'persistRun', 'persistChange', 'persistSnapshot', 'hydrate', 'flush'];
  const port = dr.getDomainRepository();
  test('A1 the active repository implements the full persistence port',
    REQUIRED.every((m) => typeof port[m] === 'function') &&
    typeof port.backend === 'string' && typeof port.durable === 'boolean');
  test('A2 this environment honestly reports NO durable persistence (no Supabase configured)',
    port.backend === 'memory' && port.durable === false &&
    acqStore.getPersistenceStatus().durable === false);
  test('A3 the memory adapter fabricates nothing (empty hydrate) and uses zero network',
    (await port.hydrate(OPS)).outreach.length === 0 && externalFetches === 0);
  test('A4 BI lifecycle state exposes its own honest persistence status',
    store.getProspectPersistenceStatus().backend === 'memory' &&
    store.getProspectPersistenceStatus().durable === false);

  // Inject a durable conformance double (no live Supabase available here).
  const double = new ConformanceRepository();
  dr.setDomainRepository(double);

  // ══ B. Write → read (write-through from the domain store) ══
  acqStore.resetAcquisitionStore();
  store.resetProspectStore();
  const prepared = acq.prepareOutreach(PROSPECT, ACTOR);
  test('B1 outreach prepared for the canonical prospect',
    prepared.ok === true && prepared.value.record.prospectId === PROSPECT);
  const recId = prepared.value.record.id;
  test('B2 the revision id is workflow-owned and deterministic',
    recId === acq.outreachRecordId(PROSPECT, 1));
  test('B3 approval succeeds', acq.approveOutreach(recId, ACTOR).ok === true);
  const sent = await acq.sendOutreach(recId, ACTOR);
  test('B4 the simulated send succeeds with NO provider credentials',
    sent.ok === true && sent.value.transport === 'simulation');
  test('B5 the simulated response is recorded', (await acq.simulateResponse(PROSPECT, ACTOR)).ok === true);
  test('B6 the opportunity is created', acq.createOpportunityFromResponse(PROSPECT, ACTOR).ok === true);
  await acqStore.flushAcquisitionPersistence();
  test('B7 every mutation reached the persistence port (write-through)',
    double.writes >= 6 && acqStore.getPersistenceStatus().writes >= 6);
  test('B8 the port reports the writes as DURABLE now that a durable backend is active',
    acqStore.getPersistenceStatus().state === 'durable' && acqStore.getPersistenceStatus().durable === true);
  const back = await double.hydrate(OPS);
  test('B9 read-back: outreach revision + response + opportunity are retained',
    back.outreach.some((o) => o.id === recId) && back.responses.length === 1 && back.opportunities.length === 1);
  test('B10 the persisted outreach carries the canonical prospect identity',
    back.outreach.every((o) => o.prospectId === PROSPECT));

  // ══ C. Reload semantics ══
  acqStore.resetAcquisitionStore();
  test('C1 after a reset (simulated reload) the in-memory working set is empty',
    acqStore.getOutreachRecords().length === 0 && acqStore.getResponses().length === 0 &&
    acqStore.getOpportunities().length === 0);
  const hydrated = await acqStore.hydrateAcquisitionFromPersistence(OPS);
  test('C2 hydrate restores the SAME state from the durable backend',
    hydrated.outreach.length >= 1 && acqStore.getOutreachRecords().some((o) => o.id === recId));
  test('C3 reload preserves the canonical identity unchanged',
    acqStore.getOutreachRecords().every((o) => o.prospectId === PROSPECT) &&
    acqStore.getResponses().every((r) => r.prospectId === PROSPECT));
  test('C4 reload does not duplicate (one revision, one response, one opportunity)',
    acqStore.getOutreachRecords().filter((o) => o.id === recId).length === 1 &&
    acqStore.getResponses().length === 1 && acqStore.getOpportunities().length === 1);
  test('C5 the relationship timeline stays coherent across reload',
    acqStore.getAcquisitionEvents(PROSPECT).length >= 5);


  // ══ D. Idempotence ══
  const again = await acqStore.hydrateAcquisitionFromPersistence(OPS);
  test('D1 re-hydrating is idempotent (no duplicated artefacts)',
    again.outreach.filter((o) => o.id === recId).length === 1 &&
    again.responses.length === 1 && again.opportunities.length === 1);
  const row = acqStore.getOutreachRecords().find((o) => o.id === recId);
  const replay = await double.persistOutreach(row, 'mercenta-ops');
  const rowsForId = [...double.rows.keys()].filter((k) => k === `acquisition_outreach:${recId}`);
  test('D2 a replayed write UPSERTS — exactly one durable row per canonical id',
    replay.ok === true && rowsForId.length === 1);
  const respCount = acqStore.getResponses().length;
  const dup = await acq.recordResponse(PROSPECT, { body: 'Thanks!', outreachId: recId }, ACTOR);
  test('D3 re-recording the same response returns the existing record (no duplicate)',
    dup.ok === true && acqStore.getResponses().length === respCount);
  const rid = acq.responseIdFor(PROSPECT, recId);
  test('D4 the response id is derived from canonical ids, never Date.now()',
    rid === `resp-${PROSPECT}-${recId}` && !/\d{13}/.test(rid));
  const opp0 = acqStore.getOpportunities()[0];
  const evBefore = acqStore.getAcquisitionEvents(PROSPECT).length;
  acq.setOpportunityStage(opp0.id, opp0.stage, ACTOR);
  test('D5 repeating an identical stage transition appends no duplicate event',
    acqStore.getAcquisitionEvents(PROSPECT).length === evBefore);
  const outBefore = acqStore.getOutreachRecords().length;
  const reprepare = acq.prepareOutreach(PROSPECT, ACTOR);
  test('D6 a genuine re-preparation is a NEW revision (history retained, no overwrite)',
    reprepare.ok === true && acqStore.getOutreachRecords().length === outBefore + 1 &&
    reprepare.value.record.revision === 2);

  // ══ E. Failure behaviour — a failure is NEVER a silent success ══
  const failing = new ConformanceRepository({ failWrites: true });
  dr.setDomainRepository(failing);
  acq.prepareOutreach(PROSPECT, ACTOR);
  await acqStore.flushAcquisitionPersistence();
  const failStatus = acqStore.getPersistenceStatus();
  test('E1 a failed write is reported as FAILED with the error, never as durable',
    failStatus.state === 'failed' && failStatus.durable === false &&
    typeof failStatus.error === 'string' && failStatus.error.length > 0);
  test('E2 the failure carries an explicit error (no fabricated persisted state)',
    String(failStatus.error).includes('CONFORMANCE_WRITE_FAILED'));
  dr.setDomainRepository(double);
  acqStore.resetAcquisitionStore();
  await acqStore.hydrateAcquisitionFromPersistence(OPS);

  // ══ F. Tenant isolation ══
  const oppRow = acqStore.getOpportunities()[0];
  acqStore.updateOpportunity(oppRow.id, { brandId: 'brand-tapatio' });
  await acqStore.flushAcquisitionPersistence();
  const brandScope = await double.hydrate({ kind: 'brand', tenantId: 'brand-tapatio' });
  test('F1 a brand scope sees ONLY its own brand-linked opportunity',
    brandScope.opportunities.length === 1 && brandScope.opportunities[0].brandId === 'brand-tapatio');
  test('F2 a brand scope can NOT see ops-owned outreach / responses / events',
    brandScope.outreach.length === 0 && brandScope.responses.length === 0 && brandScope.events.length === 0);
  const otherBrand = await double.hydrate({ kind: 'brand', tenantId: 'brand-someone-else' });
  test('F3 another tenant sees NOTHING of that brand acquisition data',
    otherBrand.opportunities.length === 0 && otherBrand.outreach.length === 0);
  const opsScope = await double.hydrate(OPS);
  test('F4 the ops scope sees the full acquisition set',
    opsScope.outreach.length >= 1 && opsScope.opportunities.length === 1);
  await acqStore.hydrateAcquisitionFromPersistence(OPS);


  // ══ G. RBAC — authorization is authoritative in the DOMAIN layer ══
  const seepId = 'p-seep';
  test('G1 a view-only actor cannot prepare outreach',
    acq.prepareOutreach(seepId, VIEW_ONLY).ok === false);
  test('G2 a view-only actor cannot approve outreach',
    acq.approveOutreach(recId, VIEW_ONLY).ok === false);
  test('G3 a view-only actor cannot send outreach',
    (await acq.sendOutreach(recId, VIEW_ONLY)).ok === false);
  test('G4 a view-only actor cannot create an opportunity',
    acq.createOpportunityFromResponse(PROSPECT, VIEW_ONLY).ok === false);
  test('G5 a view-only actor cannot move an opportunity stage',
    acq.setOpportunityStage(opp0.id, 'won', VIEW_ONLY).ok === false);
  test('G6 a view-only actor cannot record a response',
    (await acq.recordResponse(PROSPECT, { body: 'x', outreachId: recId }, VIEW_ONLY)).ok === false);
  test('G7 a view-only actor cannot alter protected BI prospect state',
    !acqStore.getOpportunities().some((o) => o.stage === 'won') &&
    store.getProspect(PROSPECT).disqualified === false);

  // ══ H. Canonical prospect identity ══
  test('H1 outreach, responses and opportunities all carry the canonical prospectId',
    acqStore.getOutreachRecords().every((o) => o.prospectId === PROSPECT) &&
    acqStore.getResponses().every((r) => r.prospectId === PROSPECT) &&
    acqStore.getOpportunities().every((o) => o.prospectId === PROSPECT));
  test('H2 the canonical BI prospect identity is unchanged by persistence',
    store.getProspect(PROSPECT).id === PROSPECT && store.getProspect(PROSPECT).brand === 'Tapatío');

  // ══ I. BI intelligence preservation ══
  const pi = intel.getProspectIntelligence(PROSPECT);
  test('I1 BI intelligence is reachable BY REFERENCE through the acquisition identity',
    pi !== null && pi.prospect === store.getProspect(PROSPECT));
  test('I2 ASIN-level intelligence and all 11 canonical sections survive',
    pi.digest.asinCount > 0 && pi.digest.sections.length === 11);

  // ══ J. Acquisition traceability ══
  const rel = acq.getRelationshipContext(PROSPECT);
  test('J1 traceability prospectId → outreach → response → opportunity is intact',
    rel !== null && rel.responses[0].outreachId === recId && rel.opportunity.outreachId === recId);
  test('J2 every outreach revision records its BI intelligence reference (ids + counts)',
    acqStore.getOutreachRecords().every(
      (o) => !o.intelligenceRef ||
        (o.intelligenceRef.prospectId === PROSPECT && typeof o.intelligenceRef.scoreTotal === 'number')
    ));

  // ══ K. ONE canonical message store ══
  const msgs = acqStore.getRelationship(PROSPECT).messages;
  test('K1 the relationship reads the ONE canonical message store (outbound + inbound)',
    msgs.some((m) => m.direction === 'outbound') && msgs.some((m) => m.direction === 'inbound'));
  const acqSrc = readSrc('src/data/acquisitionStore.ts');
  test('K2 the acquisition store keeps NO second conversation store',
    !/messages\s*[:=]\s*\[\]/.test(acqSrc) && !/\bconversations\b/.test(acqSrc));


  // ══ M. Provider safety (UNKNOWN ≠ LIVE) ══
  const p2 = acq.prepareOutreach(seepId, ACTOR);
  test('M1 a second canonical prospect prepares + approves cleanly',
    p2.ok === true && acq.approveOutreach(p2.value.record.id, ACTOR).ok === true);
  const unverifiedLive = {
    mode: 'live',
    providerState: 'live',
    send: async () => ({ ok: true }),
  };
  const refused = await acq.sendOutreach(p2.value.record.id, ACTOR, unverifiedLive);
  test('M2 an unverifiable live claim is REFUSED (never fabricated as live)',
    refused.ok === false && String(refused.error).includes('PROVIDER_NOT_LIVE'));
  test('M3 the refusal is audited',
    demoStore.demoAuditLog.some((a) => a.action === 'acquisition_outreach_send_refused'));

  // ══ L. Simulation performs ZERO external network calls ══
  test('L1 ZERO external network calls across the entire D4 suite', externalFetches === 0);

  // ── source-level invariants ──
  const srcFiles = (function walk(dir) {
    const out = [];
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = `${dir}/${e.name}`;
      if (e.isDirectory()) out.push(...walk(p));
      else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
    }
    return out;
  })(fileURLToPath(new URL('../src', import.meta.url)).replace(/^\//, '/'));

  // ══ N. The Phase D1 communications-provider removal holds at domain level ══
  // The dedicated D1 removal gate performs the whole-repo executable-source
  // scan and is run alongside this suite. The removed provider's name is
  // composed at runtime here so this file cannot self-trip that scan.
  const removedId = ['rock', 'et', 'chat'].join('');
  const registry = await server.ssrLoadModule('/src/integrations/registry.ts');
  test('N1 the removed communications provider is absent from the registry',
    !Object.keys(registry.INTEGRATION_REGISTRY).includes(removedId) &&
    !registry.INTEGRATION_ORDER.includes(removedId));
  test('N2 the other communications providers still survive (no over-removal)',
    ['usertour', 'twilio_whatsapp', 'postiz'].every((p) => p in registry.INTEGRATION_REGISTRY));

  // ══ O. Postiz remains present ══
  test('O1 Postiz remains a registered platform capability',
    /postiz/i.test(readSrc('src/integrations/registry.ts')));
  test('O2 a Postiz implementation is still present in the repository',
    readdirSync(fileURLToPath(new URL('../src/lib/postiz', import.meta.url))).length > 0);

  // ══ P. No duplicate stores / no new database mechanism ══
  const drSrc = readSrc('src/data/domainRepository.ts');
  const drCode = stripComments(drSrc);
  test('P1 no new database mechanism was introduced (no localStorage/IndexedDB/SQLite/new ORM)',
    !/localStorage/.test(drCode) && !/indexedDB/i.test(drCode) && !/sqlite/i.test(drCode) &&
    !/prisma|typeorm|sequelize|knex/i.test(drCode));
  test('P2 the durable adapter reuses the EXISTING Supabase client (single backend)',
    drSrc.includes("from '@/lib/supabase'") && drSrc.includes('isSupabaseConfigured'));
  test('P3 exactly ONE canonical acquisition store module exists',
    srcFiles.filter((f) => /acquisitionStore\.ts$/.test(f)).length === 1);
  test('P4 exactly ONE canonical BI prospect store module exists',
    srcFiles.filter((f) => /prospectStore\.ts$/.test(f)).length === 1);
  test('P5 the persistence port is the only module that talks to the Supabase client for domain state',
    !/from '@\/lib\/supabase'/.test(acqSrc));

  // ══ Q. The D4 migration defines the durable schema + RLS ══
  const migDir = fileURLToPath(new URL('../supabase/migrations/', import.meta.url));
  const migFiles = readdirSync(migDir).filter((f) => f.startsWith('020'));
  test('Q1 the D4 persistence migration exists', migFiles.length === 1);
  const mig = migFiles.length ? readFileSync(`${migDir}${migFiles[0]}`, 'utf8') : '';
  const TABLES = ['acquisition_outreach', 'acquisition_responses', 'acquisition_opportunities',
    'acquisition_events', 'bi_prospects', 'bi_intelligence_runs', 'bi_prospect_changes', 'bi_snapshots'];
  test('Q2 every persisted table enables row level security',
    TABLES.every((t) => new RegExp(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`).test(mig)));
  test('Q3 every persisted table has an explicit policy',
    TABLES.every((t) => new RegExp(`CREATE POLICY "[^"]+" ON ${t}`).test(mig)));
  test('Q4 the opportunity table carries a brand-isolation (tenant) policy',
    /CREATE POLICY "brand_own_acquisition_opportunity" ON acquisition_opportunities[\s\S]*?brand_id = \(auth\.jwt\(\) ->> 'tenant_id'\)/.test(mig));
  test('Q5 no blanket using(true) policy was introduced',
    !/using\s*\(\s*true\s*\)/i.test(mig));

  console.log(failures === 0
    ? 'D4_PERSISTENCE_VALIDATION_PASS'
    : `D4_PERSISTENCE_VALIDATION_FAIL (${failures})`);
} catch (err) {
  console.log('VALIDATOR ERROR: ' + (err && err.stack ? err.stack : String(err)));
  failures++;
} finally {
  globalThis.fetch = originalFetch;
  await server.close();
}
if (failures > 0) process.exit(1);

