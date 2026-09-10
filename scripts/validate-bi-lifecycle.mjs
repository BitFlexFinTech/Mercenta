// §Phase B — validates the Brand Intelligence real-data lifecycle:
//   canonical universe boot (12/10/2) · seed baseline + created events ·
//   deterministic manual runs (no fabricated discoveries) · run idempotence ·
//   candidate intake with canonical dedupe (re-discovery merges, never a
//   second record) · genuine new discoveries · sticky manual disqualification ·
//   re-qualification · snapshot accumulation · pipeline status · ZERO external
//   network calls across every lifecycle operation · MarketingHub identity
//   bridge consuming the SAME canonical store.
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
const test = (name, ok) => {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failures++;
};

// Instrument any fetch attempt that would leave the process.
let externalFetches = 0;
let originalFetch = globalThis.fetch;
const hijackedFetch = async (url, init) => {
  externalFetches++;
  console.log(`!! lifecycle attempted external fetch: ${String(url)}`);
  return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
};

try {
  globalThis.fetch = hijackedFetch;

  const store = await server.ssrLoadModule('/src/data/prospectStore.ts');
  const lc = await server.ssrLoadModule('/src/lib/intelligence/prospectLifecycle.ts');
  const pp = await server.ssrLoadModule('/src/lib/intelligence/prospectPipeline.ts');
  const m = await server.ssrLoadModule('/src/lib/marketing.ts');

  // ── A. Canonical universe + provenance origin ──
  test('store boots a canonical universe of exactly 12 prospects', store.getProspects().length === 12);
  test('exactly 10 active after the documented disqualifications (Truthbrush, UpCircle)',
    store.getProspects().filter((p) => !p.disqualified).length === 10);
  test('disqualified seeds stay tracked in the store (2)', store.getProspects().filter((p) => p.disqualified).length === 2);
  test('stable canonical ids survive boot (prospect-tapatio unique)', store.getProspects().filter((p) => p.id === 'prospect-tapatio').length === 1);
  const keys = store.getProspects().map((p) => pp.normalizeBrandKey(p.brand));
  test('no duplicate normalized brand keys in the universe', new Set(keys).size === keys.length);
  test('seed baseline recorded as origin run', store.getRuns().length === 1 && store.getRuns()[0].trigger === 'seed' && store.getRuns()[0].scannedCount === 12);
  const created = store.getChanges().filter((c) => c.changeType === 'created');
  test('one "created" change event per canonical prospect (history origin)', created.length === 12);
  const tapatioTimeline = store.getProspectTimeline('prospect-tapatio');
  test('Tapatío timeline starts with its created event', tapatioTimeline.length === 1 && tapatioTimeline[0].changeType === 'created' && tapatioTimeline[0].brand === 'Tapatío');

  // ── B. Deterministic manual run (no fabricated discoveries) ──
  const r1 = await lc.runBrandIntelligence({ trigger: 'manual' });
  test('manual run #1: new 0 / updated 0 / disq 0 / unchanged 12',
    r1.run.newCount === 0 && r1.run.updatedCount === 0 && r1.run.disqualifiedCount === 0 && r1.run.unchangedCount === 12);
  test('manual run #1 recorded with trigger manual and mode mock',
    r1.run.trigger === 'manual' && r1.run.mode === 'mock' && r1.run.status === 'completed');
  const r2 = await lc.runBrandIntelligence({ trigger: 'manual' });
  test('manual run #2 is idempotent (unchanged 12, no new events)',
    r2.run.unchangedCount === 12 && r2.run.newCount === 0 && r2.events.length === 0);
  test('run history retains every run (1 seed + 2 manual = 3)', store.getRuns().length === 3);
  test('every prospect stamped lastChecked + nextCheck (+7d) after a run',
    store.getProspects().every((p) => !!p.lastChecked && !!p.nextCheck && p.nextCheck > p.lastChecked));
  const between = Date.parse(store.getProspects()[0].nextCheck) - Date.parse(store.getProspects()[0].lastChecked);
  test('nextCheck is ~7 days after lastChecked', between > 6 * 86400000 && between < 8 * 86400000);

  // ── C. Candidate intake → canonical dedupe + genuine discoveries ──
  const rc = await lc.runBrandIntelligence({
    trigger: 'manual',
    candidates: [{ brand: 'Tapatío', website: 'https://tapatiohotsauce.com', whyInteresting: 'Refreshed observation: strong UK pull.' }],
  });
  test('re-discovered Tapatío candidate merges — still exactly one Tapatío record', store.getProspects().filter((p) => p.brand === 'Tapatío').length === 1);
  test('re-discovery records an "updated" event with field discovery', rc.run.updatedCount === 1 && rc.events.some((e) => e.prospectId === 'prospect-tapatio' && e.changeType === 'updated' && e.field === 'discovery'));
  test('universe size unchanged by re-discovery (12)', store.getProspects().length === 12);

  const rk = await lc.runBrandIntelligence({
    trigger: 'manual',
    candidates: [{ brand: 'Kit&Kin', website: 'https://kitandkin.com', whyInteresting: 'Refreshed.' }],
  });
  test("'Kit&Kin' (no space/&) dedupes onto canonical 'Kit & Kin' record", store.getProspects().filter((p) => p.brand === 'Kit & Kin').length === 1 && store.getProspects().length === 12 && rk.run.updatedCount === 1);

  // Genuine new discovery — a REAL brand absent from the universe.
  const rn = await lc.runBrandIntelligence({
    trigger: 'manual',
    candidates: [{
      brand: 'Tabasco', category: 'Grocery', website: 'https://tabasco.com', brandMaturity: 'challenger', ukPresence: true,
      asins: [{ asin: 'B0TAB01', title: 'Tabasco Original 12oz', category: 'Grocery', price: 8.99, rating: 4.7, reviewCount: 9100, bsr: 620, amazonUrl: 'https://amazon.co.uk/dp/B0TAB01', sellerCount: 14, amazonRetailSeller: false, prime: true, amazonOfferClass: 'MARKETPLACE_HEAVY', amazonOfferConfidence: 'medium', lastObserved: '2026-09-10', sourceLabel: 'Amazon UK', evidence: [] }],
      wholesale: { wholesaleAvailable: true, distributorProgramme: true, retailerProgramme: false, source: 'Brand', sourceUrl: 'https://tabasco.com', confidence: 'high', evidence: [] },
    }],
  });
  test('genuine new discovery recorded as created (universe 12 → 13)', rn.run.newCount === 1 && store.getProspects().length === 13 && rn.events.some((e) => e.changeType === 'created' && e.brand === 'Tabasco'));

  // ── D. Disqualify / re-qualify + sticky semantics ──
  store.resetProspectStore();
  const fresh = store.getProspects();
  test('store reset re-boots deterministically (12/10/2)', fresh.length === 12 && fresh.filter((p) => !p.disqualified).length === 10 && fresh.filter((p) => p.disqualified).length === 2);
  const dq = lc.disqualifyProspect('prospect-cholula', 'Exclusive UK distributor conflict — probe fixture');
  test('disqualifyProspect mutates the canonical record + audits the event', dq !== null && store.getProspect('prospect-cholula').disqualified === true && store.getProspect('prospect-cholula').disqualificationReason.indexOf('probe') >= 0 && store.getProspectTimeline('prospect-cholula').some((c) => c.changeType === 'disqualified'));
  const r3 = await lc.runBrandIntelligence({ trigger: 'manual' });
  test('manual disqualification is STICKY — re-scan does not reactivate it', store.getProspect('prospect-cholula').disqualified === true && r3.events.every((e) => e.prospectId !== 'prospect-cholula' || e.changeType !== 'requalified') && r3.run.disqualifiedCount === 0 && r3.run.unchangedCount === 12);
  const rq = lc.requalifyProspect('prospect-cholula');
  test('requalifyProspect restores active + audits the event', rq !== null && store.getProspect('prospect-cholula').disqualified === false && store.getProspect('prospect-cholula').disqualificationReason === undefined && store.getProspectTimeline('prospect-cholula').some((c) => c.changeType === 'requalified'));
  const r4 = await lc.runBrandIntelligence({ trigger: 'manual' });
  test('after requalify a re-scan keeps it active', store.getProspect('prospect-cholula').disqualified === false && r4.run.disqualifiedCount === 0);

  // ── E. Snapshots, pipeline status, identity-bridge single source, isolation ──
  const snapCount = store.getSnapshots().length;
  test('snapshots accumulate per run (12 prospects × 2 runs on the reset store = 24)', snapCount === 24);
  const tapaSnaps = store.getSnapshots().filter((s) => s.brandId === 'prospect-tapatio');
  test('Tapatío has a score snapshot per run (2)', tapaSnaps.length === 2 && tapaSnaps.every((s) => s.score.total > 0));
  const status = lc.getPipelineStatus();
  test('pipeline status reflects store truth (12 tracked / 10 active / 2 dq / 3 runs logged)', status.totalTracked === 12 && status.activeCount === 10 && status.disqualifiedCount === 2 && status.runCount === 3 && !!status.lastRun && !!status.nextScheduledCheck);
  const parsed = m.parseLeadsCsv('Tapatío,Sherry Zhang,partners@tapatio.com,Austin TX,us,\nAcme Organics,Jane Doe,j@acme.com,Lagos,africa,Organic Food');
  const linked = pp.matchLeadsToProspects(parsed.leads, store.getProspects());
  test('MarketingHub identity bridge consumes the SAME canonical store (CSV Tapatío → prospect-tapatio, segment Grocery)', linked[0].prospectId === 'prospect-tapatio' && linked[0].segment === 'Grocery' && linked[1].prospectId === undefined);
  const hub = await server.ssrLoadModule('/src/components/admin/MarketingHub.tsx');
  test('seed modules are ONLY read through the store (MarketingHub no longer imports seeds)', !('CANONICAL_BI_UNIVERSE' in hub));
  test('ZERO external network calls across all lifecycle operations', externalFetches === 0);

  console.log(failures === 0 ? 'BI_LIFECYCLE_VALIDATION_PASS' : `BI_LIFECYCLE_VALIDATION_FAIL (${failures})`);
} finally {
  globalThis.fetch = originalFetch;
  await server.close();
}
if (failures > 0) process.exit(1);