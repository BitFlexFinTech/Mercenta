#!/usr/bin/env node
/**
 * §PHASE 7 — THE FOUNDER OUTREACH PIPELINE GATE.
 *
 * WHY THIS EXISTS
 * ---------------
 * The outreach owner (`src/config/founderOutreach.ts`) declares the ordered approach
 * Mercenta runs over the financing-partner universe, and the resolver
 * (`src/lib/finance/founderOutreach.ts`) applies it. The row's rules — outreach begins
 * at TARGET, the pipeline is forward-only (a follow-up requires an open contact) and
 * every touchpoint names a declared channel and type — are properties a comment cannot
 * guarantee, so this gate proves:
 *
 *   · the channels and touchpoint types are declared once and are internally valid;
 *   · the cadence is a strictly-increasing sequence of day OFFSETS starting with the
 *     initial contact, and every step references a declared type;
 *   · the three outreach stages are REUSED from the ONE lifecycle owner (no second list);
 *   · the resolver allows an initial contact ONLY at TARGET, refuses a follow-up before
 *     an open contact, refuses a second initial contact, refuses an off-ramped provider,
 *     and REFUSES an unknown channel, type or stage — fail closed;
 *   · the cadence advance is deterministic and refuses an undeclared step;
 *   · it is DETERMINISTIC — no AI, no clock, no randomness, no network;
 *   · it is INTERNAL — no brand component imports it; and
 *   · it is actually USED by the Control Centre and rendered by the founder surface.
 *
 * THE GATE CAN FAIL (self-check): the comparison helper is run against a
 * deliberately-wrong expectation as well as the correct one, and a malformed input is
 * exercised — the wrong expectation MUST be rejected and the malformed input MUST
 * refuse, so a green run proves the checks work rather than being vacuous.
 *
 * Run: node scripts/validate-founder-outreach.mjs
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

try {
  const cfg = await server.ssrLoadModule('/src/config/founderOutreach.ts');
  const res = await server.ssrLoadModule('/src/lib/finance/founderOutreach.ts');
  const lifecycle = await server.ssrLoadModule('/src/config/financierLifecycle.ts');

  console.log('\n── A. the declared channels ──');
  test('at least one channel is declared', cfg.OUTREACH_CHANNELS.length >= 1);
  test('channel ids are unique', new Set(cfg.OUTREACH_CHANNELS.map((c) => c.id)).size === cfg.OUTREACH_CHANNELS.length);
  test('every channel has a label and a description', cfg.OUTREACH_CHANNELS.every((c) => c.label && c.description));

  console.log('\n── B. the declared touchpoint types ──');
  test('the first touchpoint type is the initial contact', cfg.OUTREACH_TOUCHPOINT_TYPES[0].id === 'initial_contact');
  test('type ids are unique', new Set(cfg.OUTREACH_TOUCHPOINT_TYPES.map((t) => t.id)).size === cfg.OUTREACH_TOUCHPOINT_TYPES.length);
  test('exactly two touchpoint types advance the pipeline', cfg.OUTREACH_TOUCHPOINT_TYPES.filter((t) => t.advancesPipeline).length === 2);
  test(
    'the advancing types are the initial contact and the held meeting',
    equals(cfg.OUTREACH_TOUCHPOINT_TYPES.filter((t) => t.advancesPipeline).map((t) => t.id), ['initial_contact', 'meeting_held'])
  );

  console.log('\n── C. the deterministic cadence ──');
  test('the first cadence step is the initial contact', cfg.OUTREACH_CADENCE[0].typeId === 'initial_contact');
  test(
    'cadence day offsets are strictly increasing',
    cfg.OUTREACH_CADENCE.every((s, i) => i === 0 || s.dayOffset > cfg.OUTREACH_CADENCE[i - 1].dayOffset)
  );
  test(
    'every cadence step references a declared touchpoint type',
    cfg.OUTREACH_CADENCE.every((s) => cfg.OUTREACH_TOUCHPOINT_TYPES.some((t) => t.id === s.typeId))
  );

  console.log('\n── D. the lifecycle stages are REUSED, never duplicated ──');
  test('outreach begins at the TARGET stage', cfg.OUTREACH_ENTRY_STAGE === 'target');
  test('the contacted stage is CONTACTED', cfg.OUTREACH_CONTACTED_STAGE === 'contacted');
  test('the engaged stage is ENGAGED', cfg.OUTREACH_ENGAGED_STAGE === 'engaged');
  test('the entry stage is a declared financier stage (reused)', lifecycle.FINANCIER_STAGE_ORDER.includes(cfg.OUTREACH_ENTRY_STAGE));
  test('the engaged stage is a declared financier stage (reused)', lifecycle.FINANCIER_STAGE_ORDER.includes(cfg.OUTREACH_ENGAGED_STAGE));

  console.log('\n── E. the resolver enforces the pipeline rules ──');
  const t1 = res.planOutreachTouchpoint('target', 'email', 'initial_contact');
  test('an initial contact at TARGET is allowed', t1.allowed === true);
  const t2 = res.planOutreachTouchpoint('target', 'email', 'follow_up');
  test('a follow-up at TARGET is refused (requires a contact)', t2.allowed === false && t2.refusal === 'OUTREACH_FOLLOWUP_REQUIRES_CONTACT');
  const t3 = res.planOutreachTouchpoint('contacted', 'phone', 'meeting_request');
  test('a meeting request at CONTACTED is allowed', t3.allowed === true);
  const t4 = res.planOutreachTouchpoint('contacted', 'email', 'meeting_held');
  test('a held meeting at CONTACTED is allowed', t4.allowed === true);
  const t5 = res.planOutreachTouchpoint('qualified', 'email', 'initial_contact');
  test('an initial contact at QUALIFIED is refused (requires TARGET)', t5.allowed === false && t5.refusal === 'OUTREACH_REQUIRES_TARGET_STAGE');
  const t6 = res.planOutreachTouchpoint('researched', 'email', 'initial_contact');
  test('an initial contact at RESEARCHED is refused', t6.allowed === false && t6.refusal === 'OUTREACH_REQUIRES_TARGET_STAGE');
  const t7 = res.planOutreachTouchpoint('contacted', 'email', 'initial_contact');
  test('a second initial contact is refused', t7.allowed === false && t7.refusal === 'OUTREACH_INITIAL_ALREADY_DONE');
  const t8 = res.planOutreachTouchpoint('target', 'carrier_pigeon', 'initial_contact');
  test('an unknown channel is refused', t8.allowed === false && t8.refusal === 'OUTREACH_CHANNEL_UNKNOWN');
  const t9 = res.planOutreachTouchpoint('target', 'email', 'telepathy');
  test('an unknown touchpoint type is refused', t9.allowed === false && t9.refusal === 'OUTREACH_TYPE_UNKNOWN');
  const t10 = res.planOutreachTouchpoint('bogus', 'email', 'initial_contact');
  test('an unknown stage is refused', t10.allowed === false && t10.refusal === 'OUTREACH_STAGE_UNKNOWN');
  const t11 = res.planOutreachTouchpoint('rejected', 'email', 'initial_contact');
  test('an off-ramped provider is not in the pipeline', t11.allowed === false && t11.refusal === 'OUTREACH_STAGE_NOT_IN_PIPELINE');
  const t12 = res.planOutreachTouchpoint('parked', 'email', 'check_in');
  test('a parked provider is not in the pipeline', t12.allowed === false && t12.refusal === 'OUTREACH_STAGE_NOT_IN_PIPELINE');
  test('isOutreachChannel recognises declared and missing ids', res.isOutreachChannel('email') === true && res.isOutreachChannel('nope') === false && res.isOutreachChannel(null) === false);
  test('isOutreachTouchpointType recognises declared and missing ids', res.isOutreachTouchpointType('follow_up') === true && res.isOutreachTouchpointType('nope') === false);

  console.log('\n── F. the deterministic cadence advance ──');
  const c0 = res.advanceOutreachCadence('day_0_initial');
  test('the step after day 0 is the day-3 follow-up', c0.next !== null && c0.next.id === 'day_3_follow_up' && c0.atEnd === false);
  const lastId = cfg.OUTREACH_CADENCE[cfg.OUTREACH_CADENCE.length - 1].id;
  const cLast = res.advanceOutreachCadence(lastId);
  test('the last step reports the cadence complete', cLast.atEnd === true && cLast.next === null && cLast.refused === false);
  const cBad = res.advanceOutreachCadence('day_999');
  test('an undeclared cadence step refuses', cBad.refused === true && cBad.next === null);

  console.log('\n── G. deterministic — no AI, no clock, no network ──');
  const ownerSrc = stripComments(read('src/config/founderOutreach.ts'));
  const resSrc = stripComments(read('src/lib/finance/founderOutreach.ts'));
  test(
    'neither the owner nor the resolver makes an AI / provider / network / random call',
    !/openrouter|\bsupabase\b|\bfetch\(|Math\.random|Date\.now|new Date/i.test(ownerSrc) &&
      !/openrouter|\bsupabase\b|\bfetch\(|Math\.random|Date\.now|new Date/i.test(resSrc)
  );


  console.log('\n── H. INTERNAL — no brand leakage ──');
  const brandFiles = walk(fileURLToPath(new URL('../src/components/brand/', import.meta.url)));
  const brandLeak = brandFiles.filter((f) => /founderOutreach|planOutreachTouchpoint|DEMO_OUTREACH_TOUCHPOINTS/.test(readFileSync(f, 'utf8')));
  test('no brand component imports the founder outreach pipeline', brandLeak.length === 0, brandLeak.join(', '));

  console.log('\n── I. USED by the Control Centre + rendered by the founder surface ──');
  const cc = read('src/lib/commandCentre/controlCentre.ts');
  test(
    'controlCentre imports the resolver and exposes founderOutreach',
    /buildFounderOutreachSummary/.test(cc) && /founderOutreach:\s*FounderOutreachSummary/.test(cc)
  );
  const fcc = read('src/components/admin/FounderControlCentre.tsx');
  test(
    'the Founder Control Centre renders the outreach pipeline section',
    /control-founder-outreach/.test(fcc) && /model\.founderOutreach/.test(fcc)
  );

  console.log('\n── J. SELF-CHECK — the gate can fail ──');
  test('the comparison helper ACCEPTS a correct expectation', equals(['a'], ['a']));
  test('the comparison helper REJECTS a wrong expectation (proves it can fail)', !equals(['a'], ['b']));
  const malformed = res.planOutreachTouchpoint('target', '', 'initial_contact');
  test(
    'a malformed (empty) channel REFUSES — proves the fail-closed branch works',
    malformed.allowed === false && malformed.refusal === 'OUTREACH_CHANNEL_UNKNOWN'
  );
} finally {
  await server.close();
}

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);

