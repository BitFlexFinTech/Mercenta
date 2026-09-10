// §Phase A — validates the Brand Intelligence → ICP canonical identity bridge:
//   deterministic brand matching · no false-positive linking of the seeded
//   demo lead universe · CSV-ingestion link with canonical segment inheritance
//   · BI→ICP derivation that never invents an origin region · derived leads
//   flow through the live fit-scoring + auto-enroll gates.
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
const test = (name, ok) => {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failures++;
};

try {
  const pp = await server.ssrLoadModule('/src/lib/intelligence/prospectPipeline.ts');
  const m = await server.ssrLoadModule('/src/lib/marketing.ts');
  const bps = await server.ssrLoadModule('/src/data/brandProspectSeed.ts');
  const bes = await server.ssrLoadModule('/src/data/brandExtraSeed.ts');
  const boot = await server.ssrLoadModule('/src/data/bootstrap.ts');

  const UNIVERSE = [...bps.SEED_PROSPECTS, ...bes.EXTRA_PROSPECTS];

  // ── Canonical universe invariants ──
  test('canonical BI universe = exactly 12 prospects (3 + 9)', UNIVERSE.length === 12);
  test('exactly 10 shown after the documented disqualifications',
    UNIVERSE.filter((p) => !p.disqualified).length === 10);

  // ── Deterministic brand matching ──
  test("normalizeBrandKey strips diacritics ('Tapatío' → 'tapatio')",
    pp.normalizeBrandKey('Tapatío') === 'tapatio');
  test("normalizeBrandKey strips punctuation ('Kit & Kin' → 'kitkin')",
    pp.normalizeBrandKey('Kit & Kin') === 'kitkin');

  // ── CSV-ingestion linking ──
  const parse = m.parseLeadsCsv('Tapatío,Sherry Zhang,partners@tapatio.com,Austin TX,us,\nAcme Organics,Jane Doe,j@acme.com,Lagos,africa,Organic Food\nJuniper Works,,hello@juniper.ke,Nairobi,africa,');
  test('CSV parser produced 3 leads (1 linked, 2 unlinked)', parse.leads.length === 3);
  const linked = pp.matchLeadsToProspects(parse.leads, UNIVERSE);
  test('imported Tapatío inherits canonical prospectId prospect-tapatio',
    linked[0].prospectId === 'prospect-tapatio');
  test('imported Tapatío inherits canonical segment Grocery (CSV left it blank)',
    linked[0].segment === 'Grocery');
  test('unknown brand with EXPLICIT segment stays unlinked and keeps its data (no fabrication, no overwrite)',
    linked[1].prospectId === undefined && linked[1].segment === 'Organic Food');
  test('unknown brand with BLANK segment stays unlinked and keeps parse default (no invented link)',
    linked[2].prospectId === undefined && linked[2].segment === 'Uncategorized');

  // ── Seeded demo lead universe must NOT false-positive ──
  const seeded = pp.matchLeadsToProspects(boot.INITIAL_LEADS, UNIVERSE);
  test('no seeded INITIAL_LEADS lead collides with a canonical BI prospect',
    seeded.every((l) => l.prospectId === undefined));

  // ── BI → ICP derivation ──
  const tapatio = UNIVERSE.find((p) => p.id === 'prospect-tapatio');
  const derived = pp.deriveLeadFromProspect(tapatio, 'us');
  test('deriveLeadFromProspect(region=us) yields a linked lead',
    derived !== null && derived.prospectId === 'prospect-tapatio');
  test('derived lead keeps canonical brand + segment (Grocery)',
    derived.company === 'Tapatío' && derived.segment === 'Grocery');
  test('derived lead carries the BI-contact persona',
    derived.persona === 'Sherry Zhang, VP International Sales');
  test('derived fitScore starts 0 — ICP live-scores, never stale-seeds',
    derived.fitScore === 0);
  test('deriveLeadFromProspect(region=invalid) returns null — origin is never invented',
    pp.deriveLeadFromProspect(tapatio, 'uk') === null);

  // ── Derived leads flow through the ICP gates ──
  const icp = {
    description: 'spicy sauces and grocery challenger brands exporting to the UK',
    categories: ['Grocery'],
    regions: ['us', 'eu', 'africa'],
  };
  const fit = m.scoreLeadFit(derived, icp);
  test('derived lead scores against ICP deterministically',
    fit === 85 && m.shouldAutoEnroll(fit, 'Scraped') === true);
  test('fit gating still drops low scorers',
    m.shouldAutoEnroll(40, 'Scraped') === false);
  test('already-sequenced leads are never re-enrolled',
    m.shouldAutoEnroll(fit, 'Sequenced') === false);

  console.log(failures === 0 ? 'PROSPECT_PIPELINE_VALIDATION_PASS' : `PROSPECT_PIPELINE_VALIDATION_FAIL (${failures})`);
} finally {
  await server.close();
}
if (failures > 0) process.exit(1);