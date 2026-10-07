#!/usr/bin/env node
/**
 * §PHASE 10 — THE ACQUISITION INTELLIGENCE GATE.
 *
 * The row `phase10-acquisition-intelligence-scale` records that acquisition
 * intelligence must operate AT SCALE over the REAL research sources and must NEVER
 * be fabricated when no provider exists. The owner
 * (`src/config/acquisitionIntelligence.ts`) declares the dimensions and the research
 * sources; the resolver (`src/lib/intelligence/acquisitionIntelligence.ts`) applies
 * them. The properties a comment cannot guarantee are proved here:
 *
 *   · the dimensions and the research sources are declared, unique and complete;
 *   · every source names a canonical integration provider and a declared dimension,
 *     and the providers REUSE the platform registry (none invented);
 *   · AI (`openrouter`) is NOT a research source;
 *   · the resolver FAILS CLOSED — an unknown dimension, no source, an unknown source,
 *     a source that does not supply the dimension, and a signal with no available
 *     provider are ALL refused — while a fully-shaped signal backed by an available
 *     provider is ALLOWED (both branches proved);
 *   · the real-signal count is ZERO (nothing is fabricated);
 *   · it is DETERMINISTIC (no AI, no clock, no network), INTERNAL (no brand import),
 *     USED by the Control Centre and RENDERED by the founder surface.
 *
 * Run: node scripts/validate-acquisition-intelligence.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
const test = (name, ok, detail = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) failures += 1;
};
const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
const walk = (dir) => {
  let out = [];
  for (const f of readdirSync(dir)) {
    const p = `${dir}/${f}`;
    if (statSync(p).isDirectory()) out = out.concat(walk(p));
    else out.push(p);
  }
  return out;
};
const equals = (a, b) => JSON.stringify(a) === JSON.stringify(b);

try {
  const owner = await server.ssrLoadModule('/src/config/acquisitionIntelligence.ts');
  const res = await server.ssrLoadModule('/src/lib/intelligence/acquisitionIntelligence.ts');
  const registry = await server.ssrLoadModule('/src/integrations/registry.ts');

  const dims = owner.ACQUISITION_INTELLIGENCE_DIMENSIONS;
  const sources = owner.ACQUISITION_RESEARCH_SOURCES;
  const demo = owner.DEMO_ACQUISITION_SIGNALS;

  console.log('\n── A. the declared dimensions and sources ──');
  test('the six dimensions are declared', dims.length === 6, String(dims.length));
  test('dimension ids are unique', new Set(dims.map((d) => d.id)).size === dims.length);
  test('every dimension names a label and a description',
    dims.every((d) => d.label.length >= 2 && d.description.length > 8));
  test('the six research sources are declared', sources.length === 6, String(sources.length));
  test('research-source ids are unique', new Set(sources.map((s) => s.id)).size === sources.length);
  test('every source names a provider id and supplies a declared dimension',
    sources.every((s) => s.providerId.trim().length > 0 &&
      s.supplies.length > 0 && s.supplies.every((d) => dims.some((x) => x.id === d))));

  console.log('\n── B. the sources REUSE canonical providers (none invented) ──');
  test('every source provider is a canonical integration provider (never not_registered)',
    sources.every((s) => registry.defaultIntegrationMode(s.providerId) !== 'not_registered'),
    sources.map((s) => `${s.id}:${s.providerId}:${registry.defaultIntegrationMode(s.providerId)}`).join(', '));
  test('no research source uses AI (openrouter)',
    sources.every((s) => s.providerId !== 'openrouter'));

  console.log('\n── C. the resolver FAILS CLOSED ──');
  const allowed = () => true;
  const denied = () => false;
  const decision = (signal, avail) => res.evaluateAcquisitionSignal(signal, avail);
  test('a signal on an unknown dimension is REFUSED',
    decision({ id: 'x', dimensionId: 'nope', sourceId: 'product_history_demand', illustrative: true }, allowed).refusal === 'INTELLIGENCE_DIMENSION_UNKNOWN');
  test('a signal citing NO source is REFUSED',
    decision({ id: 'x', dimensionId: 'brand_profile', sourceId: null, illustrative: true }, allowed).refusal === 'INTELLIGENCE_REQUIRES_NAMED_SOURCE');
  test('a signal citing an unknown source is REFUSED',
    decision({ id: 'x', dimensionId: 'brand_profile', sourceId: 'nope', illustrative: true }, allowed).refusal === 'INTELLIGENCE_SOURCE_UNKNOWN');
  test('a signal whose source does not supply the dimension is REFUSED',
    decision({ id: 'x', dimensionId: 'company_register', sourceId: 'marketplace_catalogue', illustrative: true }, allowed).refusal === 'INTELLIGENCE_SOURCE_DOES_NOT_SUPPLY_DIMENSION');
  test('a signal with no available provider is REFUSED (never fabricated)',
    decision({ id: 'x', dimensionId: 'brand_profile', sourceId: 'brand_web_presence', illustrative: true }, denied).refusal === 'INTELLIGENCE_UNAVAILABLE_WITHOUT_PROVIDER');
  test('a fully-shaped signal backed by an available provider is ALLOWED',
    decision({ id: 'x', dimensionId: 'brand_profile', sourceId: 'brand_web_presence', illustrative: true }, allowed).allowed === true);
  test('the five refusals are DISTINCT (no collapse)',
    new Set([
      decision({ id: 'x', dimensionId: 'nope', sourceId: 'product_history_demand', illustrative: true }, allowed).refusal,
      decision({ id: 'x', dimensionId: 'brand_profile', sourceId: null, illustrative: true }, allowed).refusal,
      decision({ id: 'x', dimensionId: 'brand_profile', sourceId: 'nope', illustrative: true }, allowed).refusal,
      decision({ id: 'x', dimensionId: 'company_register', sourceId: 'marketplace_catalogue', illustrative: true }, allowed).refusal,
      decision({ id: 'x', dimensionId: 'brand_profile', sourceId: 'brand_web_presence', illustrative: true }, denied).refusal,
    ]).size === 5);

  console.log('\n── D. the founder summary (derived) ──');
  const summary = res.buildAcquisitionIntelligenceSummary();          // default: nothing available
  const summaryAll = res.buildAcquisitionIntelligenceSummary(allowed); // stub: everything available
  test('the summary covers the dimensions and the sources',
    summary.dimensions.length === 6 && summary.sources.length === 6);
  test('the summary reports ZERO real signals', summary.realSignalCount === 0);
  test('the summary REFUSES every demonstration by default (computed, not written)',
    summary.demonstrationCount === demo.length && summary.refusedCount === demo.length && summary.allowedCount === 0);
  test('the summary reports ZERO available sources by default', summary.availableSourceCount === 0);
  test('the summary’s live example REFUSES with the never-fabricate reason',
    summary.exampleRefusal.refusal === 'INTELLIGENCE_UNAVAILABLE_WITHOUT_PROVIDER');
  test('with a stub availability the first demonstration is ALLOWED (allowed branch works)',
    summaryAll.demonstrations[0].allowed === true);
  test('the summary exposes the pinned invariants',
    summary.oneOwner && summary.requiresNamedSource && summary.neverFabricates && summary.sourcesReused && summary.aiSummarisesOnly);

  console.log('\n── E. deterministic — no AI, no clock, no network ──');
  const ownerSrc = stripComments(read('src/config/acquisitionIntelligence.ts'));
  const resSrc = stripComments(read('src/lib/intelligence/acquisitionIntelligence.ts'));
  const banned = (s) => /openrouter|\bsupabase\b|\bfetch\(|Math\.random|Date\.now|new Date/i.test(s);
  test('neither the owner nor the resolver makes an AI / provider / network / random call',
    !banned(ownerSrc) && !banned(resSrc));
  test('the owner fails closed at module load (guards present)',
    /at least one dimension must be declared/.test(ownerSrc) &&
      /research-source ids must be unique/.test(ownerSrc) &&
      /supplies an undeclared dimension/.test(ownerSrc));

  console.log('\n── F. INTERNAL — no brand leakage ──');
  const brandFiles = walk(fileURLToPath(new URL('../src/components/brand/', import.meta.url)));
  const brandLeak = brandFiles.filter((f) => /acquisitionIntelligence|ACQUISITION_INTELLIGENCE_DIMENSIONS|buildAcquisitionIntelligenceSummary/.test(readFileSync(f, 'utf8')));
  test('no brand component imports acquisition intelligence', brandLeak.length === 0, brandLeak.join(', '));

  console.log('\n── G. USED by the Control Centre + rendered by the founder surface ──');
  const cc = read('src/lib/commandCentre/controlCentre.ts');
  test('controlCentre imports the resolver and exposes acquisitionIntelligence',
    /buildAcquisitionIntelligenceSummary/.test(cc) && /acquisitionIntelligence:\s*AcquisitionIntelligenceSummary/.test(cc));
  const fcc = read('src/components/admin/FounderControlCentre.tsx');
  test('the Founder Control Centre renders the acquisition intelligence section',
    /control-acquisition-intelligence-demonstrations/.test(fcc) && /model\.acquisitionIntelligence/.test(fcc));

  console.log('\n── H. SELF-CHECK — the gate can fail ──');
  test('the comparison helper ACCEPTS a correct expectation', equals(['a'], ['a']));
  test('the comparison helper REJECTS a wrong expectation (proves it can fail)', !equals(['a'], ['b']));
  test('a malformed (unknown-dimension) input REFUSES — proves the refused branch works',
    res.evaluateAcquisitionSignal({ id: 'x', dimensionId: '', sourceId: 'brand_web_presence', illustrative: true }, allowed).refusal === 'INTELLIGENCE_DIMENSION_UNKNOWN');
} finally {
  await server.close();
}

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);

