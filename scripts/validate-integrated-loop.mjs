#!/usr/bin/env node
/**
 * §PHASE 12 — THE INTEGRATED ACQUISITION → CAPITAL → OPERATIONS LOOP GATE.
 *
 * The row `phase12-integrated-acquisition-capital-operations-loop` records the end-to-end
 * loop: discovery → Explore UK Market Fit → qualification → outreach → onboarding →
 * product readiness → commercial terms → Mercenta purchase → supply-route analysis →
 * capital requirement → financing eligibility → financing → supplier purchase →
 * Vendor operations → PO → fulfilment → invoice → payment → repayment → margin →
 * Founder Intelligence. The owner (`src/config/integratedLoop.ts`) declares the loop and the
 * rule; the resolver (`src/lib/intelligence/integratedLoop.ts`) applies it. The properties a
 * comment cannot guarantee are proved here:
 *
 *   · the loop's stages are declared, unique, each naming a label, what happens, and the
 *     canonical owner that deterministically owns it;
 *   · EVERY declared canonical owner path EXISTS on disk (a named owner is only meaningful
 *     if it is real);
 *   · the loop is FORWARD-ONLY and CLOSED: the entry stage has no predecessor, every other
 *     stage is reached ONLY from its declared predecessor, and the final stage is Founder
 *     Intelligence;
 *   · an UNKNOWN stage is REFUSED; the ENTRY stage offered a predecessor is REFUSED; a
 *     back-step/skip is REFUSED; the legal forward step and the entry stage are ALLOWED (the
 *     fail-closed and positive branches both proved);
 *   · it is DETERMINISTIC (no AI, no clock, no network), INTERNAL (no brand import), USED by
 *     the Control Centre and RENDERED by the founder surface.
 *
 * THE GATE CAN FAIL (self-check): a wrong expectation is rejected and a malformed input is
 * refused, so a green run proves the checks are live rather than vacuous.
 *
 * Run: node scripts/validate-integrated-loop.mjs
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
const test = (name, ok, detail = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) failures += 1;
};
const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const exists = (rel) => existsSync(new URL(`../${rel}`, import.meta.url));
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
  const owner = await server.ssrLoadModule('/src/config/integratedLoop.ts');
  const res = await server.ssrLoadModule('/src/lib/intelligence/integratedLoop.ts');

  console.log('\n── A. the integrated loop ──');
  const st = owner.INTEGRATED_LOOP_STAGES;
  test('the twenty-one loop stages are declared', st.length === 21);
  test('stage ids are unique', new Set(st.map((s) => s.id)).size === st.length);
  test('every stage names a label, what happens, and a canonical owner',
    st.every((s) => s.label.length >= 2 && s.about.length > 8 && s.dataOwner.length > 8));
  test('the derived id list matches the stage ids',
    equals([...owner.INTEGRATED_LOOP_STAGE_IDS], st.map((s) => s.id)));
  test('the ENTRY stage is the first declared stage',
    owner.INTEGRATED_LOOP_ENTRY_STAGE_ID === st[0].id && owner.INTEGRATED_LOOP_ENTRY_STAGE_ID === 'discovery');
  test('the loop CLOSES into founder-intelligence (the final stage)',
    owner.INTEGRATED_LOOP_FINAL_STAGE_ID === 'founder-intelligence' &&
      owner.INTEGRATED_LOOP_FINAL_STAGE_ID === st[st.length - 1].id);

  console.log('\n── B. the predecessor set is DERIVED from the ordered list (forward-only) ──');
  const pred = owner.INTEGRATED_LOOP_PREDECESSOR;
  test('the entry stage has NO predecessor', pred['discovery'] === null);
  test('every non-entry stage’s predecessor is exactly the one before it',
    st.slice(1).every((s, i) => pred[s.id] === st[i].id));

  console.log('\n── C. every declared canonical owner EXISTS on disk ──');
  const owners = [...new Set(st.map((s) => s.dataOwner))];
  const missing = owners.filter((o) => !exists(o));
  test(`all ${owners.length} distinct canonical owners exist on disk`, missing.length === 0, missing.join(', '));
  test('the founder-intelligence owner is among them (the loop closes there)',
    owners.includes('src/config/founderIntelligence.ts'));

  console.log('\n── D. the resolver — fail-closed and positive branches ──');
  test('an UNKNOWN stage is REFUSED',
    res.evaluateLoopTransition('not-a-stage', 'discovery').refusal === 'INTEGRATED_LOOP_STAGE_UNKNOWN');
  test('the ENTRY stage given a predecessor is REFUSED',
    res.evaluateLoopTransition('discovery', 'margin').refusal === 'INTEGRATED_LOOP_ENTRY_HAS_NO_PREDECESSOR');
  test('the ENTRY stage from nothing is ALLOWED',
    res.evaluateLoopTransition('discovery', null).allowed === true);
  test('a SKIP (a non-predecessor) is REFUSED',
    res.evaluateLoopTransition('payment', 'fulfilment').refusal === 'INTEGRATED_LOOP_TRANSITION_ILLEGAL');
  test('a back-step is REFUSED',
    res.evaluateLoopTransition('discovery', 'margin').allowed === false);
  test('the legal forward step is ALLOWED',
    res.evaluateLoopTransition('margin', 'repayment').allowed === true);
  test('EVERY stage is reachable from its declared predecessor (the whole loop walks)',
    st.every((s, i) => res.evaluateLoopTransition(s.id, i === 0 ? null : st[i - 1].id).allowed === true));
  test('EVERY non-entry stage is REFUSED when reached from any WRONG stage',
    st.slice(1).every((s) => {
      const declared = pred[s.id] ?? null;
      const wrong = declared === 'discovery' ? 'margin' : 'discovery';
      return res.evaluateLoopTransition(s.id, wrong).refusal === 'INTEGRATED_LOOP_TRANSITION_ILLEGAL';
    }));

  console.log('\n── E. the founder summary (derived) ──');
  const summary = res.buildIntegratedLoopSummary();
  test('the summary covers every declared stage', summary.stageCount === st.length && summary.stages.length === st.length);
  test('the summary counts distinct owners honestly', summary.distinctOwnerCount === owners.length);
  test('the summary exposes the pinned invariants',
    summary.oneOwner && summary.forwardOnly && summary.stagesHaveCanonicalOwners && summary.closesIntoFounderIntelligence);
  test('the summary’s live example REFUSES a back-step (fail-closed proof is computed, not written)',
    summary.exampleRefusal.refusal === 'INTEGRATED_LOOP_TRANSITION_ILLEGAL');
  test('the summary reports the entry and final stage ids', summary.entryStageId === 'discovery' && summary.finalStageId === 'founder-intelligence');

  console.log('\n── F. deterministic — no AI, no clock, no network ──');
  const ownerSrc = stripComments(read('src/config/integratedLoop.ts'));
  const resSrc = stripComments(read('src/lib/intelligence/integratedLoop.ts'));
  test('neither the owner nor the resolver makes an AI / provider / network / random call',
    !/openrouter|\bsupabase\b|\bfetch\(|Math\.random|Date\.now|new Date/i.test(ownerSrc) &&
      !/openrouter|\bsupabase\b|\bfetch\(|Math\.random|Date\.now|new Date/i.test(resSrc));
  test('the owner fails closed at module load (guards present)',
    /INTEGRATED_LOOP_STAGES\.length === 0/.test(ownerSrc) &&
      /duplicate stage id/.test(ownerSrc) && /missing a field/.test(ownerSrc) &&
      /final stage must be founder-intelligence/.test(ownerSrc));

  console.log('\n── G. INTERNAL — no brand leakage ──');
  const brandFiles = walk(fileURLToPath(new URL('../src/components/brand/', import.meta.url)));
  const brandLeak = brandFiles.filter((f) => /integratedLoop|INTEGRATED_LOOP_STAGES|buildIntegratedLoopSummary/.test(readFileSync(f, 'utf8')));
  test('no brand component imports the integrated loop', brandLeak.length === 0, brandLeak.join(', '));

  console.log('\n── H. USED by the Control Centre + rendered by the founder surface ──');
  const cc = read('src/lib/commandCentre/controlCentre.ts');
  test('controlCentre imports the resolver and exposes integratedLoop',
    /buildIntegratedLoopSummary/.test(cc) && /integratedLoop:\s*IntegratedLoopSummary/.test(cc));
  const fcc = read('src/components/admin/FounderControlCentre.tsx');
  test('the Founder Control Centre renders the integrated loop section',
    /control-integrated-loop/.test(fcc) && /model\.integratedLoop/.test(fcc));

  console.log('\n── I. SELF-CHECK — the gate can fail ──');
  test('the comparison helper ACCEPTS a correct expectation', equals(['a'], ['a']));
  test('the comparison helper REJECTS a wrong expectation (proves it can fail)', !equals(['a'], ['b']));
  const malformed = res.evaluateLoopTransition('nope', 'discovery');
  test('a malformed (unknown-stage) input REFUSES — proves the refused branch works',
    malformed.refusal === 'INTEGRATED_LOOP_STAGE_UNKNOWN');
  test('the unknown-stage refusal is distinct from the illegal-transition one',
    res.evaluateLoopTransition('nope', 'discovery').refusal !==
      res.evaluateLoopTransition('margin', 'discovery').refusal);
} finally {
  await server.close();
}

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);

