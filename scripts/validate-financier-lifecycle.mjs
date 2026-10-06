#!/usr/bin/env node
/**
 * §PHASE 7 — THE FINANCIER LIFECYCLE GATE.
 *
 * WHY THIS EXISTS
 * ---------------
 * The financier-lifecycle owner (`src/config/financierLifecycle.ts`) declares the
 * lifecycle a financing partner moves through, and the resolver
 * (`src/lib/finance/financierLifecycle.ts`) applies it. The row's one
 * NON-NEGOTIABLE rule is: "a provider is NEVER marked ACTIVE merely because it was
 * researched." That is a property a comment cannot guarantee, so this gate proves:
 *
 *   · the forward path is EXACTLY the nine canonical stages, ACTIVE last;
 *   · the transitions are DERIVED from that order (one forward step, plus the two
 *     off-ramps REJECTED and PARKED), with ACTIVE PARTNER and REJECTED terminal and
 *     PARKED re-entering at RESEARCHED;
 *   · ACTIVE PARTNER is reachable ONLY from PILOT, and an attempt to jump a
 *     researched provider straight to ACTIVE is REFUSED (FINANCIER_ACTIVE_REQUIRES_PILOT);
 *   · an UNKNOWN stage or an undeclared transition is REFUSED — fail closed;
 *   · the machine is deterministic — no AI, no clock, no randomness, no network;
 *   · it is INTERNAL — no brand component imports it; and
 *   · it is actually USED by the Control Centre and rendered by the founder surface.
 *
 * THE GATE CAN FAIL (self-check): the comparison helper is run against a
 * deliberately-wrong expectation as well as the correct one, and a malformed input
 * is exercised — the wrong expectation MUST be rejected and the malformed input
 * MUST refuse, so a green run proves the checks work rather than being vacuous.
 *
 * Run: node scripts/validate-financier-lifecycle.mjs
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
/** Strip comments so a documented example (`Math.random`, a date) is not read as code. */
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

const CANONICAL_ORDER = [
  'researched',
  'qualified',
  'target',
  'contacted',
  'engaged',
  'due_diligence',
  'terms',
  'pilot',
  'active_partner',
];
const OFFRAMPS = ['rejected', 'parked'];

try {
  const cfg = await server.ssrLoadModule('/src/config/financierLifecycle.ts');
  const res = await server.ssrLoadModule('/src/lib/finance/financierLifecycle.ts');

  console.log('\n── A. the forward path is exactly the nine canonical stages ──');
  test(
    'the active stages are the nine canonical stages in order',
    equals([...cfg.FINANCIER_STAGE_ORDER], CANONICAL_ORDER)
  );
  test('ACTIVE PARTNER is the final active stage', cfg.FINANCIER_STAGE_ORDER.at(-1) === 'active_partner');
  test(
    'the two off-ramps are REJECTED and PARKED',
    equals([...cfg.FINANCIER_OFFRAMP_STAGES], OFFRAMPS)
  );
  const allStages = [...CANONICAL_ORDER, ...OFFRAMPS];
  test(
    'every stage (including the off-ramps) has a label',
    allStages.every((s) => typeof cfg.FINANCIER_STAGE_LABELS[s] === 'string' && cfg.FINANCIER_STAGE_LABELS[s].length > 0)
  );
  test(
    'every stage has a definition',
    allStages.every((s) => typeof cfg.FINANCIER_STAGE_DEFINITIONS[s] === 'string' && cfg.FINANCIER_STAGE_DEFINITIONS[s].length > 0)
  );

  console.log('\n── B. the transition map is DERIVED from the order (no second list) ──');
  const T = cfg.FINANCIER_LIFECYCLE_TRANSITIONS;
  let forwardOk = true;
  for (let i = 0; i < CANONICAL_ORDER.length - 1; i += 1) {
    const stage = CANONICAL_ORDER[i];
    const expected = [CANONICAL_ORDER[i + 1], 'rejected', 'parked'];
    if (!equals([...T[stage]], expected)) forwardOk = false;
  }
  test('each non-terminal active stage advanced one step, with both off-ramps', forwardOk);
  test('ACTIVE PARTNER is terminal (no outgoing transitions)', T.active_partner.length === 0);
  test('REJECTED is terminal (no outgoing transitions)', T.rejected.length === 0);
  test('PARKED re-enters at RESEARCHED', equals([...T.parked], ['researched']));
  test('no stage transitions to itself', allStages.every((s) => !T[s].includes(s)));

  console.log('\n── C. the non-negotiable rule: ACTIVE requires a completed PILOT ──');
  const intoActive = allStages.filter((s) => T[s].includes('active_partner'));
  test('ACTIVE PARTNER is reachable ONLY from PILOT', equals(intoActive, ['pilot']));
  const jump = res.transitionFinancier('c', 'researched', 'active_partner');
  test(
    'a researched provider is REFUSED ACTIVE (FINANCIER_ACTIVE_REQUIRES_PILOT)',
    jump.allowed === false && jump.refusal === 'FINANCIER_ACTIVE_REQUIRES_PILOT'
  );
  const happy = res.transitionFinancier('c', 'pilot', 'active_partner');
  test('a provider at PILOT is ALLOWED into ACTIVE PARTNER', happy.allowed === true && happy.refusal === null);
  const step = res.transitionFinancier('c', 'researched', 'qualified');
  test('one forward step (RESEARCHED → QUALIFIED) is ALLOWED', step.allowed === true);
  const skip = res.transitionFinancier('c', 'researched', 'terms');
  test(
    'a skipped stage (RESEARCHED → TERMS) is REFUSED (FINANCIER_TRANSITION_ILLEGAL)',
    skip.allowed === false && skip.refusal === 'FINANCIER_TRANSITION_ILLEGAL'
  );

  console.log('\n── D. FAIL CLOSED on an unknown stage ──');
  const unknownFrom = res.transitionFinancier('c', 'bogus', 'qualified');
  test(
    'an unknown FROM stage is REFUSED (FINANCIER_STAGE_UNKNOWN) with no stage reported',
    unknownFrom.allowed === false && unknownFrom.refusal === 'FINANCIER_STAGE_UNKNOWN' && unknownFrom.from === null
  );
  const unknownTo = res.transitionFinancier('c', 'researched', 'nope');
  test(
    'an unknown TO stage is REFUSED (FINANCIER_STAGE_UNKNOWN)',
    unknownTo.allowed === false && unknownTo.refusal === 'FINANCIER_STAGE_UNKNOWN'
  );
  test('allowedFinancierNextStages returns NOTHING for an unknown stage', res.allowedFinancierNextStages('bogus').length === 0);
  test('isFinancierStage accepts a real stage and rejects junk', res.isFinancierStage('researched') === true && res.isFinancierStage('bogus') === false && res.isFinancierStage('') === false && res.isFinancierStage(null) === false);

  console.log('\n── E. the off-ramps ──');
  const activeStagesExclTerminal = CANONICAL_ORDER.filter((s) => s !== 'active_partner');
  test(
    'every non-terminal active stage may be REJECTED or PARKED',
    activeStagesExclTerminal.every((s) => T[s].includes('rejected') && T[s].includes('parked'))
  );
  const activeReject = res.transitionFinancier('c', 'active_partner', 'rejected');
  test('an ACTIVE PARTNER cannot be rejected/parked (illegal)', activeReject.allowed === false && activeReject.refusal === 'FINANCIER_TRANSITION_ILLEGAL');
  const unpark = res.transitionFinancier('c', 'parked', 'researched');
  test('a PARKED provider re-enters at RESEARCHED', unpark.allowed === true);
  const parkedActive = res.transitionFinancier('c', 'parked', 'active_partner');
  test('a PARKED provider cannot jump to ACTIVE (requires PILOT)', parkedActive.allowed === false && parkedActive.refusal === 'FINANCIER_ACTIVE_REQUIRES_PILOT');
  const rejectedResume = res.transitionFinancier('c', 'rejected', 'researched');
  test('REJECTED is terminal (no resume)', rejectedResume.allowed === false);

  console.log('\n── F. deterministic — no AI, no clock, no network ──');
  const ownerSrc = stripComments(read('src/config/financierLifecycle.ts'));
  const resSrc = stripComments(read('src/lib/finance/financierLifecycle.ts'));
  test(
    'neither the owner nor the resolver makes an AI / provider / network / random call',
    !/openrouter|\bsupabase\b|\bfetch\(|Math\.random|Date\.now|new Date/i.test(ownerSrc) &&
      !/openrouter|\bsupabase\b|\bfetch\(|Math\.random|Date\.now|new Date/i.test(resSrc)
  );

  console.log('\n── G. INTERNAL — no brand leakage ──');
  const brandFiles = walk(fileURLToPath(new URL('../src/components/brand/', import.meta.url)));
  const brandLeak = brandFiles.filter((f) => /financierLifecycle|transitionFinancier|DEMO_FINANCIER_CANDIDATES/.test(readFileSync(f, 'utf8')));
  test('no brand component imports the financier lifecycle', brandLeak.length === 0, brandLeak.join(', '));

  console.log('\n── H. USED by the Control Centre + rendered by the founder surface ──');
  const cc = read('src/lib/commandCentre/controlCentre.ts');
  test(
    'controlCentre imports the resolver and exposes financierLifecycle',
    /financierLifecycle/.test(cc) && /financierLifecycle:\s*FinancierLifecycleSummary/.test(cc)
  );
  const fcc = read('src/components/admin/FounderControlCentre.tsx');
  test(
    'the Founder Control Centre renders the financier lifecycle section',
    /control-financier-lifecycle/.test(fcc) && /model\.financierLifecycle/.test(fcc)
  );
  const brandLeak2 = brandFiles.filter((f) => /financierLifecycle/.test(readFileSync(f, 'utf8')));
  test('no brand surface references the lifecycle summary', brandLeak2.length === 0, brandLeak2.join(', '));

  console.log('\n── I. SELF-CHECK — the gate can fail ──');
  test('the comparison helper ACCEPTS a correct expectation', equals(['qualified'], ['qualified']));
  test('the comparison helper REJECTS a wrong expectation (proves it can fail)', !equals(['qualified'], ['terms']));
  const malformed = res.transitionFinancier('x', '', 'qualified');
  test(
    'a malformed (empty) stage REFUSES — proves the fail-closed branch works',
    malformed.allowed === false && malformed.refusal === 'FINANCIER_STAGE_UNKNOWN'
  );
} finally {
  await server.close();
}

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
