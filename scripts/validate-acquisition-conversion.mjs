#!/usr/bin/env node
/**
 * §ACQ-CONVERSION — THE ACQUISITION CONVERSION GATE.
 *
 * WHY THIS EXISTS
 * ---------------
 * The acquisition conversion owner (`src/lib/acquisition/conversionMetrics.ts`)
 * reports reply / engagement / conversion rates. Its whole value rests on one
 * property a comment cannot guarantee: every funnel step must be defined as
 * "reached a CANONICAL acquisition stage", so the rates can never contradict the
 * canonical stage machine (`acquisitionStageOf`) or the canonical reply
 * classifier. If a step is redefined from a second list of stages, the rates
 * silently drift from the pipeline the founder already trusts.
 *
 * This gate EXECUTES the shipped owner (through the project's own Vite/TS
 * pipeline) and fails if:
 *   · a funnel step does not point at a real canonical stage;
 *   · the funnel is not monotonic (engaged must imply replied, which must imply
 *     contacted) or a draft (`outreach`) is counted as a contact;
 *   · the derivation is arithmetically wrong on known inputs;
 *   · a rate with a zero denominator is reported as 0 instead of `null`;
 *   · the segments do not partition the records;
 *   · the owner is not USED (the Control Centre does not consume it, or the
 *     founder surface does not render it).
 *
 * THE GATE CAN FAIL (self-check): the comparison helper is run against a
 * deliberately-wrong expectation as well as the correct one — the wrong one MUST
 * be rejected — so a green run proves the check works rather than that it is
 * vacuous.
 *
 * Run: node scripts/validate-acquisition-conversion.mjs
 */
import { execSync } from 'node:child_process';
import { createServer } from 'vite';

/** The canonical stage each funnel step MUST be defined against. */
const REQUIRED_THRESHOLDS = [
  ['contacted', 'follow_up', false],
  ['replied', 'response', false],
  ['engaged', 'meeting', false],
  ['converted', 'active_brand', true],
];

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
const test = (name, ok, detail = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) failures += 1;
};

/** Structural equality of two funnel counts (used by the real checks AND the self-check). */
function countsEqual(a, b) {
  return ['contacted', 'replied', 'engaged', 'converted'].every((k) => a[k] === b[k]);
}

/** Synthesised canonical records — only the fields the owner reads. */
const RECORDS = [
  { stage: 'prospect', category: 'Home', source: 'discovery', owner: 'staff:a' },
  { stage: 'qualification', category: 'Home', source: 'discovery', owner: 'staff:a' },
  { stage: 'outreach', category: 'Home', source: 'discovery', owner: 'staff:a' }, // a DRAFT — not a contact
  { stage: 'follow_up', category: 'Baby', source: 'referral', owner: 'staff:b' },
  { stage: 'response', category: 'Baby', source: 'referral', owner: 'staff:b' },
  { stage: 'meeting', category: 'Baby', source: 'referral', owner: 'staff:b' },
  { stage: 'active_brand', category: 'Grocery', source: 'referral', owner: 'staff:c' },
];

try {
  const engine = await server.ssrLoadModule('/src/lib/acquisition/acquisitionEngine.ts');
  const conv = await server.ssrLoadModule('/src/lib/acquisition/conversionMetrics.ts');

  console.log('── A. the owner exports the whole funnel contract ──');
  test('ACQUISITION_FUNNEL_STEPS is exported (4 steps)', Array.isArray(conv.ACQUISITION_FUNNEL_STEPS) && conv.ACQUISITION_FUNNEL_STEPS.length === 4);
  test('funnelCounts / conversionRates / computeConversionMetrics / formatRate exist',
    typeof conv.funnelCounts === 'function' && typeof conv.conversionRates === 'function' &&
    typeof conv.computeConversionMetrics === 'function' && typeof conv.formatRate === 'function');

  console.log('\n── B. every step points at a REAL canonical stage ──');
  const stageIds = new Set(engine.ACQUISITION_STAGES.map((s) => s.id));
  const missing = REQUIRED_THRESHOLDS.filter(([, sid]) => !stageIds.has(sid));
  test('every threshold stage exists in ACQUISITION_STAGES', missing.length === 0, missing.map(([id, s]) => `${id}->${s}`).join(' | '));
  const wrong = REQUIRED_THRESHOLDS.filter(([id, sid, exact]) => {
    const stp = conv.ACQUISITION_FUNNEL_STEPS.find((s) => s.id === id);
    return !stp || stp.thresholdStage !== sid || stp.exact !== exact;
  });
  test('each step is defined against its canonical stage (contacted=follow_up, replied=response, engaged=meeting, converted=active_brand exact)',
    wrong.length === 0, wrong.map(([id]) => id).join(' | '));

  console.log('\n── C. the funnel is monotonic and excludes the draft stage ──');
  const step = (id) => conv.ACQUISITION_FUNNEL_STEPS.find((s) => s.id === id);
  const monotonic = engine.ACQUISITION_STAGES.every((s) => {
    const c = conv.reachedStep(s.id, step('contacted'));
    const r = conv.reachedStep(s.id, step('replied'));
    const e = conv.reachedStep(s.id, step('engaged'));
    const v = conv.reachedStep(s.id, step('converted'));
    return (!r || c) && (!e || r) && (!v || e);
  });
  test('replied ⇒ contacted, engaged ⇒ replied, converted ⇒ engaged for EVERY stage', monotonic);
  test('a DRAFT (stage "outreach") is NOT counted as contacted', conv.reachedStep('outreach', step('contacted')) === false);

  console.log('\n── D. the derivation is arithmetically correct on known input ──');
  const counts = conv.funnelCounts(RECORDS);
  test('funnel counts are correct', countsEqual(counts, { contacted: 4, replied: 3, engaged: 2, converted: 1 }),
    JSON.stringify(counts));
  const rates = conv.conversionRates(counts);
  test('replyRate = 3/4', rates.replyRate === 0.75);
  test('engagementRate = 2/4', rates.engagementRate === 0.5);
  test('conversionRate = 1/4', rates.conversionRate === 0.25);
  test('replyToEngagementRate = 2/3', Math.abs(rates.replyToEngagementRate - 2 / 3) < 1e-9);

  console.log('\n── E. an undefined rate is null, never a misleading 0 ──');
  const empty = conv.conversionRates(conv.funnelCounts([]));
  test('no contacts ⇒ every rate is null (not 0)', empty.replyRate === null && empty.engagementRate === null && empty.conversionRate === null && empty.replyToEngagementRate === null);
  test('formatRate(null) is an em-dash', conv.formatRate(null) === '—');
  test('formatRate(0.5) is a percentage', conv.formatRate(0.5) === '50%');

  console.log('\n── F. every segment partitions the records ──');
  const metrics = conv.computeConversionMetrics(RECORDS);
  const sum = (segs, field) => segs.reduce((n, s) => n + s.counts[field], 0);
  test('byCategory partitions contacted', sum(metrics.byCategory, 'contacted') === counts.contacted && metrics.byCategory.length === 3);
  test('bySource partitions contacted', sum(metrics.bySource, 'contacted') === counts.contacted);
  test('byOwner partitions contacted', sum(metrics.byOwner, 'contacted') === counts.contacted);
  test('totalRecords is the record count', metrics.totalRecords === RECORDS.length);

  console.log('\n── G. the owner is USED (Control Centre model + founder surface) ──');
  const reads = (pattern, file) => {
    try {
      return execSync(`grep -c "${pattern}" "${file}"`, { encoding: 'utf8' }).trim();
    } catch {
      return '0';
    }
  };
  test('controlCentre.ts computes the conversion model',
    Number(reads('computeConversionMetrics', 'src/lib/commandCentre/controlCentre.ts')) > 0);
  test('controlCentre.ts exposes acquisitionConversion on the model',
    Number(reads('acquisitionConversion', 'src/lib/commandCentre/controlCentre.ts')) > 1);
  test('FounderControlCentre.tsx renders the conversion section',
    Number(reads('acquisitionConversion', 'src/components/admin/FounderControlCentre.tsx')) > 0);
  const componentImporters = (() => {
    try {
      return execSync("grep -rl 'conversionMetrics' src/components", { encoding: 'utf8' }).split('\n').filter(Boolean);
    } catch {
      return [];
    }
  })();
  test('the founder surface imports the ONE owner (not a re-implementation)',
    componentImporters.includes('src/components/admin/FounderControlCentre.tsx'), componentImporters.join(' | '));

  console.log('\n── H. the gate can FAIL (self-check, not vacuous) ──');
  test('self-check: countsEqual ACCEPTS the correct expectation',
    countsEqual({ contacted: 4, replied: 3, engaged: 2, converted: 1 }, { contacted: 4, replied: 3, engaged: 2, converted: 1 }));
  test('self-check: countsEqual REJECTS a wrong expectation (would be REPORTED)',
    !countsEqual({ contacted: 4, replied: 3, engaged: 2, converted: 1 }, { contacted: 4, replied: 3, engaged: 2, converted: 2 }));
} catch (error) {
  console.error('[validate-acquisition-conversion] THREW:', error);
  failures += 1;
} finally {
  await server.close();
}

console.log(failures === 0
  ? '\nACQUISITION_CONVERSION_VALIDATION_PASS'
  : `\nACQUISITION_CONVERSION_VALIDATION_FAIL (${failures})`);
process.exit(failures === 0 ? 0 : 1);

