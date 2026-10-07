#!/usr/bin/env node
/**
 * §PHASE 10 — THE UK OPPORTUNITY STATES AT SCALE GATE.
 *
 * The row `phase10-uk-opportunity-states` records that the six UK opportunity
 * states A–F must operate AT SCALE, feeding UK Market Fit → qualification →
 * outreach. §PHASE 1 already implements the classification; this increment adds the
 * ONE owner of the SCALED EVIDENCE behind each state
 * (`src/config/ukOpportunityStates.ts`) and the pure resolver
 * (`src/lib/intelligence/ukOpportunityStates.ts`). The properties a comment cannot
 * guarantee are proved here:
 *
 *   · the six states, the four evidence sources and the three chain stages are
 *     declared, unique and complete;
 *   · the states REUSE the canonical `UK_PRESENCE_CLASSES` (ids AND labels);
 *   · the evidence sources REUSE canonical integration providers (none invented),
 *     and the chain REUSES the canonical integrated-loop stage ids;
 *   · the resolver FAILS CLOSED — an unknown state, a state with no evidence, a
 *     state naming an unknown source and a state with an unavailable provider are
 *     ALL refused — while a fully-shaped state backed by an available provider is
 *     ALLOWED (both branches proved);
 *   · the asserted-state count is ZERO (nothing is fabricated);
 *   · it is DETERMINISTIC (no AI, no clock, no network), INTERNAL (no brand import),
 *     USED by the Control Centre and RENDERED by the founder surface.
 *
 * Run: node scripts/validate-uk-opportunity-states.mjs
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
  const owner = await server.ssrLoadModule('/src/config/ukOpportunityStates.ts');
  const res = await server.ssrLoadModule('/src/lib/intelligence/ukOpportunityStates.ts');
  const registry = await server.ssrLoadModule('/src/integrations/registry.ts');
  const marketFit = await server.ssrLoadModule('/src/config/ukMarketFit.ts');
  const loop = await server.ssrLoadModule('/src/config/integratedLoop.ts');

  const states = owner.UK_OPPORTUNITY_STATES;
  const sources = owner.UK_OPPORTUNITY_EVIDENCE_SOURCES;
  const chain = owner.UK_OPPORTUNITY_CHAIN_STAGES;

  console.log('\n── A. the declared states, evidence sources and chain ──');
  test('the six opportunity states are declared', states.length === 6, String(states.length));
  test('state ids are unique', new Set(states.map((s) => s.id)).size === states.length);
  test('every state names a label and at least one evidence source',
    states.every((s) => s.label.length >= 2 && s.evidenceSourceIds.length > 0));
  test('the four evidence sources are declared', sources.length === 4, String(sources.length));
  test('evidence-source ids are unique', new Set(sources.map((s) => s.id)).size === sources.length);
  test('every evidence source names a provider id and a description',
    sources.every((s) => s.providerId.trim().length > 0 && s.description.length > 8));
  test('the three chain stages are declared and unique',
    chain.length === 3 && new Set(chain.map((s) => s.id)).size === chain.length, String(chain.length));
  test('every state evidence source is a DECLARED source',
    states.every((s) => s.evidenceSourceIds.every((id) => sources.some((src) => src.id === id))));

  console.log('\n── B. the evidence sources REUSE canonical providers (none invented) ──');
  test('every source provider is a canonical integration provider (never not_registered)',
    sources.every((s) => registry.defaultIntegrationMode(s.providerId) !== 'not_registered'),
    sources.map((s) => `${s.id}:${s.providerId}:${registry.defaultIntegrationMode(s.providerId)}`).join(', '));
  test('every source provider is in the canonical integration order',
    sources.every((s) => registry.INTEGRATION_ORDER.includes(s.providerId)));
  test('no evidence source uses AI (openrouter)',
    sources.every((s) => s.providerId !== 'openrouter'));

  console.log('\n── C. the six states REUSE the canonical UK presence classes ──');
  const classIds = marketFit.UK_PRESENCE_CLASSES.map((c) => c.id);
  test('the state ids are exactly the six UK_PRESENCE_CLASSES ids',
    equals(states.map((s) => s.id).sort(), [...classIds].sort()));
  test('every state label equals its canonical class label',
    states.every((s) => marketFit.UK_PRESENCE_CLASSES.find((c) => c.id === s.id)?.label === s.label));

  console.log('\n── D. the chain REUSES the canonical integrated-loop stage ids ──');
  const loopIds = new Set(loop.INTEGRATED_LOOP_STAGES.map((s) => s.id));
  test('every chain stage id is a canonical integrated-loop stage id',
    chain.every((s) => loopIds.has(s.id)), chain.map((s) => s.id).join(', '));
  test('the chain reads UK Market Fit → qualification → outreach in order',
    equals(chain.map((s) => s.id), ['uk-market-fit', 'qualification', 'outreach']));

  console.log('\n── E. the resolver FAILS CLOSED ──');
  const allowed = () => true;
  const denied = () => false;
  const decide = (state, avail) => res.evaluateUkOpportunityState(state, avail);
  test('a state on an unknown id is REFUSED',
    decide({ id: 'Z', evidenceSourceIds: ['marketplace_listing_data'] }, allowed).refusal === 'STATE_UNKNOWN');
  test('a state naming NO evidence source is REFUSED',
    decide({ id: 'A', evidenceSourceIds: [] }, allowed).refusal === 'STATE_REQUIRES_EVIDENCE');
  test('a state naming an unknown evidence source is REFUSED',
    decide({ id: 'A', evidenceSourceIds: ['nope'] }, allowed).refusal === 'STATE_EVIDENCE_SOURCE_UNKNOWN');
  test('a state with an unavailable provider is REFUSED (never fabricated)',
    decide({ id: 'A', evidenceSourceIds: ['marketplace_listing_data'] }, denied).refusal === 'STATE_UNAVAILABLE_WITHOUT_EVIDENCE');
  test('a fully-shaped state backed by an available provider is ALLOWED',
    decide({ id: 'F', evidenceSourceIds: ['product_history_demand', 'marketplace_listing_data'] }, allowed).allowed === true);
  test('the four refusals are DISTINCT (no collapse)',
    new Set([
      decide({ id: 'Z', evidenceSourceIds: ['marketplace_listing_data'] }, allowed).refusal,
      decide({ id: 'A', evidenceSourceIds: [] }, allowed).refusal,
      decide({ id: 'A', evidenceSourceIds: ['nope'] }, allowed).refusal,
      decide({ id: 'A', evidenceSourceIds: ['marketplace_listing_data'] }, denied).refusal,
    ]).size === 4);

  console.log('\n── F. the founder summary (derived) ──');
  const summary = res.buildUkOpportunityStatesSummary();           // default: nothing available
  const summaryAll = res.buildUkOpportunityStatesSummary(allowed); // stub: everything available
  test('the summary covers the states, the sources and the chain',
    summary.states.length === 6 && summary.evidenceSources.length === 4 && summary.chainStages.length === 3);
  test('the summary reports ZERO asserted states', summary.realAssertedCount === 0);
  test('the summary REFUSES every state by default (computed, not written)',
    summary.states.length === 6 && summary.refusedCount === 6 && summary.assertableCount === 0);
  test('the summary reports ZERO available evidence sources by default', summary.availableEvidenceSourceCount === 0);
  test('the summary’s live example REFUSES with the unavailable-evidence reason',
    summary.exampleRefusal.refusal === 'STATE_UNAVAILABLE_WITHOUT_EVIDENCE');
  test('with a stub availability every state is ALLOWED (allowed branch works)',
    summaryAll.assertableCount === 6 && summaryAll.states[0].assertable === true);
  test('the summary exposes the pinned invariants',
    summary.oneOwner && summary.reusesClasses && summary.requiresEvidence && summary.neverFabricates && summary.sourcesReused && summary.feedsMarketFitChain);

  console.log('\n── G. deterministic — no AI, no clock, no network ──');
  const ownerSrc = stripComments(read('src/config/ukOpportunityStates.ts'));
  const resSrc = stripComments(read('src/lib/intelligence/ukOpportunityStates.ts'));
  const banned = (s) => /openrouter|\bsupabase\b|\bfetch\(|Math\.random|Date\.now|new Date/i.test(s);
  test('neither the owner nor the resolver makes an AI / provider / network / random call',
    !banned(ownerSrc) && !banned(resSrc));
  test('the owner fails closed at module load (guards present)',
    /at least one evidence source must be declared/.test(ownerSrc) &&
      /must REUSE the presence-class label/.test(ownerSrc) &&
      /names an undeclared evidence source/.test(ownerSrc));

  console.log('\n── H. INTERNAL — no brand leakage ──');
  const brandFiles = walk(fileURLToPath(new URL('../src/components/brand/', import.meta.url)));
  const brandLeak = brandFiles.filter((f) => /ukOpportunityStates|UK_OPPORTUNITY_STATES|buildUkOpportunityStatesSummary/.test(readFileSync(f, 'utf8')));
  test('no brand component imports the UK opportunity states', brandLeak.length === 0, brandLeak.join(', '));

  console.log('\n── I. USED by the Control Centre + rendered by the founder surface ──');
  const cc = read('src/lib/commandCentre/controlCentre.ts');
  test('controlCentre imports the resolver and exposes ukOpportunityStates',
    /buildUkOpportunityStatesSummary/.test(cc) && /ukOpportunityStates:\s*UkOpportunityStatesSummary/.test(cc));
  const fcc = read('src/components/admin/FounderControlCentre.tsx');
  test('the Founder Control Centre renders the UK opportunity states section',
    /control-uk-opportunity-states-states/.test(fcc) && /model\.ukOpportunityStates/.test(fcc));

  console.log('\n── J. SELF-CHECK — the gate can fail ──');
  test('the comparison helper ACCEPTS a correct expectation', equals(['a'], ['a']));
  test('the comparison helper REJECTS a wrong expectation (proves it can fail)', !equals(['a'], ['b']));
  test('a malformed (unknown-state) input REFUSES — proves the refused branch works',
    res.evaluateUkOpportunityState({ id: '', evidenceSourceIds: ['marketplace_listing_data'] }, allowed).refusal === 'STATE_UNKNOWN');
} finally {
  await server.close();
}

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
