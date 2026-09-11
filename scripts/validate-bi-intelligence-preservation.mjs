// §Phase D2 — validates that canonical Brand Intelligence survives THROUGH
// acquisition, by reference (no lossy copy, no second intelligence store):
//   · identity continuity BI → ICP → outreach → response → Opportunity → CRM
//   · ASIN-level intelligence (per-ASIN metrics + nested evidence) reachable
//   · contacts (name/title/email-confidence/source) reachable, not discarded
//   · evidence + provenance traceable (every item sourced; sources/URLs grouped)
//   · scoring traceable to BI (all 7 factors + total + tier + calculatedAt)
//   · empty sections REPORTED as empty (never dropped, never fabricated)
//   · by-reference proof: a canonical mutation is immediately visible downstream
//   · the outreach record stores a REFERENCE only (no copied intelligence arrays)
//   · the 10 real canonical brands remain the active universe; no mock universe
//   · read-only access does not bypass RBAC; ZERO external network calls
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';

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
  console.log(`!! intelligence preservation attempted external fetch: ${String(url)}`);
  return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
};

const ACTOR = { staffId: 'staff-001', canMutate: true };
const VIEW_ONLY = { staffId: 'staff-005', canMutate: false };
const REAL_BRANDS = [
  'Tapatío', 'Seep', 'Astonish', 'Fly By Jing', 'LocknLock',
  "Mike's Hot Honey", 'Cholula', 'Valentina', 'Delphis Eco', 'Kit & Kin',
];

try {
  const store = await server.ssrLoadModule('/src/data/prospectStore.ts');
  const acqStore = await server.ssrLoadModule('/src/data/acquisitionStore.ts');
  const acq = await server.ssrLoadModule('/src/lib/acquisition/outreachLifecycle.ts');
  const intel = await server.ssrLoadModule('/src/lib/intelligence/prospectIntelligence.ts');
  const pp = await server.ssrLoadModule('/src/lib/intelligence/prospectPipeline.ts');
  const lc = await server.ssrLoadModule('/src/lib/intelligence/prospectLifecycle.ts');

  // Deterministic start.
  acqStore.resetAcquisitionStore();
  store.resetProspectStore();
  store.ensureProspectStore();

  // One operator-triggered discovery run so BI run/snapshot provenance exists.
  // Deterministic + documented: a re-check of the same universe finds no change.
  const run = await lc.runBrandIntelligence({ trigger: 'manual' });

  // ══ A. Identity continuity across the whole funnel ══
  const universe = store.getAcquisitionLeads();
  const bio = store.getProspect('prospect-tapatio');
  const intelTapatio = intel.getProspectIntelligence('prospect-tapatio');
  test('A1 intelligence view returns the SAME canonical object (read by reference)',
    !!intelTapatio && intelTapatio.prospect === bio && intelTapatio.prospectId === 'prospect-tapatio');
  const leadTapatio = universe.find((l) => l.prospectId === 'prospect-tapatio');
  test('A2 ICP lead preserves canonical identity and can reach its BI intelligence',
    !!leadTapatio && leadTapatio.id === 'lead-prospect-tapatio' &&
    intel.getIntelligenceForLead(leadTapatio)?.prospect === store.getProspect('prospect-tapatio'));
  test('A3 an unknown prospect resolves to null — never fabricated',
    intel.getProspectIntelligence('prospect-does-not-exist') === null &&
    intel.getIntelligenceForLead({}) === null);

  const prep = acq.prepareOutreach('prospect-tapatio', ACTOR, 'email');
  test('A4 outreach preparation succeeds for the canonical prospect', prep.ok === true);
  const record = prep.value.record;
  test('A5 outreach record carries canonical prospectId + leadId (no second identity)',
    record.prospectId === 'prospect-tapatio' && record.leadId === 'lead-prospect-tapatio');
  test('A6 outreach record reaches its BI intelligence by reference (the store\'s current object)',
    intel.getIntelligenceForOutreach(record)?.prospect === store.getProspect('prospect-tapatio'));

  const approved = acq.approveOutreach(record.id, ACTOR, 'D2 preservation check');
  const sent = await acq.sendOutreach(record.id, ACTOR);
  const responded = await acq.simulateResponse('prospect-tapatio', ACTOR);
  const oppResult = acq.createOpportunityFromResponse('prospect-tapatio', ACTOR);
  const rel = acq.getRelationshipContext('prospect-tapatio');
  test('A7 the full chain executes (approve → send → response → opportunity → relationship)',
    approved.ok && sent.ok && responded.ok && oppResult.ok && !!rel);
  test('A8 every downstream artefact keeps the SAME canonical prospect id',
    rel.prospect.id === 'prospect-tapatio' &&
    responded.value.prospectId === 'prospect-tapatio' &&
    oppResult.value.prospectId === 'prospect-tapatio' &&
    rel.opportunity.prospectId === 'prospect-tapatio' &&
    rel.outreach.every((o) => o.prospectId === 'prospect-tapatio') &&
    rel.responses.every((r) => r.prospectId === 'prospect-tapatio'));
  test('A9 intelligence is reachable from EVERY downstream artefact (response + opportunity)',
    intel.getIntelligenceForResponse(responded.value)?.prospect === store.getProspect('prospect-tapatio') &&
    intel.getIntelligenceForOpportunity(oppResult.value)?.prospect === store.getProspect('prospect-tapatio') &&
    rel.prospect === store.getProspect('prospect-tapatio'));
  test('A10 repeated reads track the CURRENT canonical state after every transition (no stale copy)',
    intel.getProspectIntelligence('prospect-tapatio').prospect === store.getProspect('prospect-tapatio') &&
    intel.getProspectIntelligence('prospect-tapatio').lifecycle.outreachStatus ===
      store.getProspect('prospect-tapatio').outreachStatus &&
    intel.getProspectIntelligence('prospect-tapatio').lifecycle.outreachStatus !== 'uncontacted');

  // ══ B. ASIN-level intelligence survives ══
  const dT = intelTapatio.digest;
  test('B1 ASIN count in the digest equals the canonical BI record',
    dT.asinCount === bio.asins.length && dT.asinCount === 2);
  test('B2 every ASIN keeps identity + metrics + nested evidence (nothing discarded)',
    bio.asins.every((a) =>
      !!a.asin && !!a.title && typeof a.bsr === 'number' && typeof a.rating === 'number' &&
      typeof a.reviewCount === 'number' && typeof a.price === 'number' &&
      typeof a.sellerCount === 'number' && !!a.amazonUrl &&
      typeof a.estimatedRevenue === 'number' && Array.isArray(a.evidence) && a.evidence.length > 0));
  const revFromBI = bio.asins.reduce((s, a) => s + (a.estimatedRevenue ?? 0), 0);
  const revFromView = intelTapatio.prospect.asins.reduce((s, a) => s + (a.estimatedRevenue ?? 0), 0);
  test('B3 per-ASIN aggregates recomputed downstream equal the BI record exactly',
    revFromBI === revFromView && revFromBI === 38400 + 34200);
  test('B4 the outreach revision recorded the ASIN count it was prepared against',
    record.intelligenceRef?.asinCount === bio.asins.length);
  test('B5 ASIN counts + uniqueness hold across the WHOLE active universe',
    universe.every((l) => {
      const p = store.getProspect(l.prospectId);
      return intel.getProspectIntelligence(l.prospectId).digest.asinCount === p.asins.length &&
        new Set(p.asins.map((a) => a.asin)).size === p.asins.length;
    }));

  // ══ C. Contact intelligence survives ══
  const cT = bio.contacts[0];
  test('C1 the canonical contact (name + title) is reachable downstream',
    !!cT && cT.name === 'Sherry Zhang' && cT.jobTitle === 'VP International Sales');
  test('C2 contact confidence + source provenance retained (not flattened away)',
    cT.emailConfidence === 'unverified' && cT.phoneConfidence === 'unverified' &&
    cT.source === 'LinkedIn' && !!cT.lastVerified && cT.evidence.length > 0);
  test('C3 contact counts downstream match BI for every active prospect',
    universe.every((l) => intel.getProspectIntelligence(l.prospectId).digest.contactCount ===
      store.getProspect(l.prospectId).contacts.length));
  const destinations = universe.map((l) => {
    const p = store.getProspect(l.prospectId);
    return { destination: acq.outreachDestination(p), email: p.contacts[0]?.email };
  });
  test('C4 no contact email is invented — the destination is the BI email or the .example placeholder',
    destinations.every(({ destination, email }) =>
      (email ? destination === email : destination.endsWith('.example'))));
  test('C5 placeholder slugs use the canonical brand key (diacritics folded, never dropped)',
    acq.outreachDestination(store.getProspect('prospect-tapatio')) === 'hello@tapatio.example' &&
    acq.outreachDestination(store.getProspect('p-lockn')) === 'hello@locknlock.example' &&
    acq.outreachDestination(store.getProspect('p-mikes')) === 'hello@mikeshothoney.example');

  // ══ D. Evidence + provenance traceability ══
  const allEvidence = intel.collectEvidence(bio);
  test('D1 the evidence set (incl. nested section evidence) reconciles with the digest',
    allEvidence.length === dT.evidenceCount && allEvidence.length > 0);
  test('D2 every evidence item is fully sourced',
    allEvidence.every((e) => !!e.field && !!e.value && !!e.source && !!e.sourceUrl &&
      !!e.dateObserved && !!e.confidence && !!e.classification));
  test('D3 provenance source counts reconcile with the evidence total (no lost items)',
    intelTapatio.provenance.evidenceSources.reduce((s, x) => s + x.count, 0) === dT.evidenceCount);
  test('D4 observed source URLs survive (Amazon + LinkedIn) and ASIN URLs are traceable',
    intelTapatio.provenance.evidenceSourceUrls.some((u) => u.includes('amazon.co.uk')) &&
    intelTapatio.provenance.evidenceSourceUrls.some((u) => u.includes('linkedin.com')) &&
    intelTapatio.provenance.asinSourceUrls.length === bio.asins.length);
  const freshT = intel.getProspectIntelligence('prospect-tapatio');
  const tapatioSnapshots = store.getSnapshots().filter((s) => s.brandId === 'prospect-tapatio');
  test('D5a provenance traces to the canonical run history (seed baseline + the recorded manual run)',
    freshT.provenance.runIds.includes('run-seed-baseline') &&
    freshT.provenance.runIds.length >= 1 &&
    store.getRuns().length === 2 && store.getRuns()[1].runId === run.run.runId);
  test('D5b provenance traces to the canonical score snapshots for this brand',
    freshT.provenance.snapshotDates.length === tapatioSnapshots.length && tapatioSnapshots.length >= 1);
  test('D5c provenance traces to the canonical prospect timeline, and a re-read reflects new events',
    freshT.provenance.changeEventIds.length === store.getProspectTimeline('prospect-tapatio').length &&
    freshT.provenance.changeEventIds.length > intelTapatio.provenance.changeEventIds.length);
  test('D5d an unchanged re-check records the run but claims NO change (truthful provenance, no invented updates)',
    run.run.changedProspectIds.length === 0 && run.run.unchangedCount === 12 && run.run.newCount === 0);

  // ══ E. Scoring intelligence traceable to BI ══
  const sf = dT.scoreFactors;
  const bf = bio.score;
  test('E1 all seven score factors match the canonical record exactly',
    sf.amazonDemand === bf.amazonDemand && sf.poPotential === bf.poPotential && sf.growth === bf.growth &&
    sf.distributionOpenness === bf.distributionOpenness &&
    sf.acceptanceProbability === bf.acceptanceProbability &&
    sf.mercentaFit === bf.mercentaFit && sf.logisticsSuitability === bf.logisticsSuitability);
  test('E2 total, tier and calculation date are the BI values (never re-derived downstream)',
    dT.scoreTotal === bf.total && dT.scoreTier === bf.tier && dT.scoreCalculatedAt === bf.calculatedAt);
  test('E3 the factor breakdown reconciles to the BI total (score model integrity)',
    sf.amazonDemand + sf.poPotential + sf.growth + sf.distributionOpenness +
    sf.acceptanceProbability + sf.mercentaFit + sf.logisticsSuitability === dT.scoreTotal);
  test('E4 every canonical section is always reported — empty means empty, never dropped',
    dT.sections.length === 11 &&
    dT.sections.map((s) => s.key).join(',') ===
      'identity,market,asins,contacts,distributors,wholesale,restrictions,growthSignals,evidence,score,lifecycle' &&
    dT.sections.every((s) => typeof s.count === 'number' &&
      s.populated === (s.key === 'wholesale' ? bio.wholesale.wholesaleAvailable : s.count > 0)));
  test('E5 the outreach revision snapshot matches BI at preparation time',
    record.intelligenceRef.scoreTotal === bf.total && record.intelligenceRef.scoreTier === bf.tier &&
    record.intelligenceRef.evidenceCount === dT.evidenceCount &&
    record.intelligenceRef.populatedSections.length > 0);

  // ══ F. By-reference proof: no copied, drift-prone intelligence record ══
  const currentCanonical = store.getProspect('prospect-tapatio');
  const before = intel.getProspectIntelligence('prospect-tapatio').digest.asinCount;
  const probeAsin = { ...currentCanonical.asins[0], asin: 'B0D2TEST', title: 'Phase D2 live-reference probe' };
  store.updateProspect({ ...currentCanonical, asins: [...currentCanonical.asins, probeAsin] });
  const after = intel.getProspectIntelligence('prospect-tapatio').digest.asinCount;
  test('F1 a canonical BI mutation is IMMEDIATELY visible downstream (live reference, no stale copy)',
    after === before + 1 && intel.getIntelligenceForOutreach(record).digest.asinCount === before + 1);
  store.updateProspect(currentCanonical); // restore the canonical record exactly
  test('F2 restoring the canonical record restores the downstream view (no divergent copy)',
    intel.getProspectIntelligence('prospect-tapatio').digest.asinCount === before &&
    intel.getProspectIntelligence('prospect-tapatio').lifecycle.outreachStatus ===
      currentCanonical.outreachStatus);
  const ref = record.intelligenceRef;
  test('F3 the outreach record stores a REFERENCE only — no copied intelligence data',
    !['asins', 'contacts', 'distributors', 'restrictions', 'growthSignals', 'evidence', 'wholesale', 'score']
      .some((k) => Object.keys(record).includes(k)) &&
    Object.values(ref).every((v) => typeof v === 'string' || typeof v === 'number' ||
      (Array.isArray(v) && v.every((x) => typeof x === 'string'))));
  const acqStoreSrc = readFileSync(new URL('../src/data/acquisitionStore.ts', import.meta.url), 'utf8');
  test('F4 the acquisition store declares NO second intelligence record (no ASIN/contact arrays)',
    !/(asins|contacts|distributors|growthSignals)\s*:/.test(acqStoreSrc) && !/ProspectASIN/.test(acqStoreSrc));

  // ══ G. Universe integrity, RBAC, no mock universe ══
  const keys = REAL_BRANDS.map((b) => pp.normalizeBrandKey(b));
  const actual = universe.map((l) => pp.normalizeBrandKey(l.company));
  test('G1 the active acquisition universe is exactly the 10 real canonical brands (no mock universe)',
    actual.length === 10 && keys.every((k) => actual.includes(k)) && actual.every((k) => keys.includes(k)));
  test('G2 outreach cannot be prepared for a non-canonical prospect (no fabricated lead)',
    acq.prepareOutreach('prospect-invented', ACTOR).ok === false);
  const dq = store.getProspects().filter((p) => p.disqualified);
  test('G3 a disqualified prospect stays resolvable in BI but is not targetable',
    dq.length === 2 &&
    dq.every((p) => intel.getProspectIntelligence(p.id)?.lifecycle.disqualified === true) &&
    !universe.some((l) => dq.some((p) => p.id === l.prospectId)));
  const firstActiveId = universe[0].prospectId;
  test('G4 read-only access never bypasses RBAC (intelligence reads are safe, mutations still refused)',
    acq.prepareOutreach(firstActiveId, VIEW_ONLY).ok === false &&
    intel.getProspectIntelligence(firstActiveId) !== null);

  // ══ H. Safety ══
  test('H1 ZERO external network calls across every intelligence read + workflow step',
    externalFetches === 0);

  console.log(failures === 0
    ? 'BI_INTELLIGENCE_PRESERVATION_VALIDATION_PASS'
    : `BI_INTELLIGENCE_PRESERVATION_VALIDATION_FAIL (${failures})`);
} catch (err) {
  console.log('VALIDATOR ERROR: ' + (err && err.stack ? err.stack : String(err)));
  failures++;
} finally {
  globalThis.fetch = originalFetch;
  await server.close();
}
if (failures > 0) process.exit(1);
