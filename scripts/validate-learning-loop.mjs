#!/usr/bin/env node
/**
 * §PHASE 4 — THE BRAND LEARNING LOOP GATE.
 *
 * WHY THIS EXISTS — the loop's value rests on properties a comment cannot guarantee:
 *   · the loop declares EXACTLY FIVE stages, in canonical order, with EXACTLY ONE
 *     gate stage (VALIDATE);
 *   · a topic is COMPLETE only once its VALIDATE stage is satisfied by a REAL
 *     signal — performing the action (`DO`) is NOT completion;
 *   · the loop is SEQUENTIAL — a stage cannot begin before every earlier stage is done;
 *   · a validation signal that arrives before the action is REFUSED (fail closed);
 *   · the topic list is DERIVED from the canonical educational gaps — there is no
 *     second, hand-maintained list, and no drift;
 *   · every topic's LEARN article and WATCH tour are REAL ids in their canonical
 *     owners (`KB_ARTICLES` / `TOUR_REGISTRY`);
 *   · the loop is actually USED by the Control Centre and the founder surface, and
 *     NO brand-facing component imports it.
 *
 * THE GATE CAN FAIL (self-check): the resolver is exercised against inputs that
 * must (and must not) complete, so a change that made completion depend on the
 * action rather than validation — or that broke the fail-closed behaviour — would
 * fail here.
 *
 * Run: node scripts/validate-learning-loop.mjs
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

try {
  const owner = await server.ssrLoadModule('/src/config/learningLoop.ts');
  const resolver = await server.ssrLoadModule('/src/lib/education/resolveLearningProgress.ts');
  const ukMarketFit = await server.ssrLoadModule('/src/config/ukMarketFit.ts');
  const kb = await server.ssrLoadModule('/src/data/knowledgeBase.ts');
  const tours = await server.ssrLoadModule('/src/config/tours/tourDefinitions.ts');
  const ownerCode = stripComments(read('src/config/learningLoop.ts'));
  const resolverSrc = read('src/lib/education/resolveLearningProgress.ts');
  const controlCentre = read('src/lib/commandCentre/controlCentre.ts');
  const surface = read('src/components/admin/FounderControlCentre.tsx');

  const resolve = (id, sig) => resolver.resolveLearningProgress(id, sig);
  const ORDER = 'learn,watch,do,validate,complete';

  /* ══ A. the five stages + the pinned invariants ═════════════════════════ */
  test('A1 the loop declares EXACTLY five stages in canonical order',
    owner.LEARNING_STAGE_ORDER.join(',') === ORDER);
  test('A2 the five stages are all defined',
    owner.LEARNING_STAGE_ORDER.every((id) => Boolean(owner.LEARNING_STAGES[id])));
  test('A3 EXACTLY ONE gate stage exists, and it is VALIDATE',
    owner.LEARNING_STAGE_ORDER.filter((id) => owner.LEARNING_STAGES[id].gate).length === 1 &&
      owner.LEARNING_STAGES.validate.gate === true &&
      owner.LEARNING_GATE_STAGE === 'validate');
  test('A4 the pinned invariants hold',
    owner.VALIDATE_REQUIRES_EVIDENCE === true &&
      owner.STAGES_ARE_SEQUENTIAL === true &&
      owner.LEARNING_LOOP_IS_DETERMINISTIC === true);
  test('A5 every stage names a label, a meaning, an action and an evidence kind',
    owner.LEARNING_STAGE_ORDER.every((id) => {
      const s = owner.LEARNING_STAGES[id];
      return s.label && s.meaning && s.action && s.evidenceKind;
    }));
  test('A6 LEARN reads an article; WATCH completes a tour',
    owner.LEARNING_STAGES.learn.evidenceKind === 'article_read' &&
      owner.LEARNING_STAGES.watch.evidenceKind === 'tour_completed' &&
      owner.LEARNING_STAGES.validate.evidenceKind === 'validation_passed');

  /* ══ B. the topics are DERIVED from the canonical gaps ══════════════════ */
  const gaps = ukMarketFit.PRE_AUDIT_EDUCATIONAL_GAPS;
  test('B1 the topic list covers every canonical educational gap',
    owner.LEARNING_TOPICS.length === gaps.length);
  test('B2 every gap id appears EXACTLY once',
    new Set(owner.LEARNING_TOPICS.map((t) => t.id)).size === gaps.length &&
      gaps.every((g) => owner.LEARNING_TOPICS.filter((t) => t.id === g.id).length === 1));
  test('B3 no drift: each topic reuses the gap’s academyStage',
    gaps.every((g) => owner.LEARNING_TOPICS.find((t) => t.id === g.id)?.academyStage === g.academyStage));
  const srcFiles = walk(fileURLToPath(new URL('../src', import.meta.url)));
  const sourceOwners = srcFiles.filter((f) =>
    /export const GAP_LEARNING_SOURCE\s*[:=]/.test(readFileSync(f, 'utf8'))
  );
  test('B4 exactly ONE gap-source owner exists (no second list)',
    sourceOwners.length === 1 && /config\/learningLoop\.ts$/.test(sourceOwners[0]));

  /* ══ C. the sources are REAL ids in their canonical owners ══════════════ */
  const articleIds = new Set(kb.KB_ARTICLES.map((a) => a.id));
  const tourIds = new Set(Object.keys(tours.TOUR_REGISTRY));
  test('C1 every topic’s LEARN article is a real Knowledge Base article',
    owner.LEARNING_TOPICS.every((t) => articleIds.has(t.articleId)));
  test('C2 every topic’s WATCH tour is a real guided tour',
    owner.LEARNING_TOPICS.every((t) => tourIds.has(t.tourId)));

  /* ══ D. the resolver — the VALIDATE gate + FAIL CLOSED ══════════════════ */
  const acted = { articleRead: true, tourCompleted: true, actionPerformed: true };
  const actedNoValidation = resolve('moq', acted);
  test('D1 read + watch + DO (no validation) does NOT complete — it stands at VALIDATE',
    actedNoValidation.currentStage === 'validate' && actedNoValidation.complete === false &&
      actedNoValidation.validateSatisfied === false);
  const validated = resolve('moq', { ...acted, validationPassed: true });
  test('D2 a real validation signal completes the topic',
    validated.complete === true && validated.validateSatisfied === true &&
      validated.currentStage === 'complete');
  const watchedOnly = resolve('moq', { tourCompleted: true });
  test('D3 the loop is SEQUENTIAL — watching without learning stands at LEARN',
    watchedOnly.currentStage === 'learn' && watchedOnly.complete === false);
  const unknown = resolve('not-a-real-topic', acted);
  test('D4 an unknown topic is REFUSED (fail closed)',
    unknown.refused === 'LEARNING_TOPIC_UNKNOWN' && unknown.complete === false &&
      unknown.validateSatisfied === false && unknown.stages.every((s) => s.state === 'locked'));
  const validationFirst = resolve('moq', { validationPassed: true });
  test('D5 validation before the action is REFUSED (fail closed)',
    validationFirst.refused === 'VALIDATION_WITHOUT_ACTION' &&
      validationFirst.validateSatisfied === false && validationFirst.complete === false);
  test('D6 a stage is never `done` before every earlier stage is done',
    actedNoValidation.stages.find((s) => s.id === 'validate')?.state !== 'done' &&
      actedNoValidation.stages.find((s) => s.id === 'complete')?.state === 'locked' &&
      actedNoValidation.stages.filter((s) => s.state === 'done').map((s) => s.id).join(',') === 'learn,watch,do');
  test('D7 blank/null topics fail closed',
    resolve(null, acted).refused === 'LEARNING_TOPIC_UNKNOWN' &&
      resolve('', acted).refused === 'LEARNING_TOPIC_UNKNOWN');

  /* ══ E. the summary ═════════════════════════════════════════════════════ */
  const summary = resolver.buildLearningLoopSummary();
  test('E1 the summary carries the five stages', summary.stages.length === 5);
  test('E2 the summary names VALIDATE as the ONE gate stage', summary.gateStage === 'validate');
  test('E3 the summary reports validation requires evidence', summary.validateRequiresEvidence === true);
  test('E4 the DEMO topic is the labelled one and is honestly NOT complete',
    summary.demo.topicId === owner.DEMO_LEARNING_TOPIC_ID && summary.demo.complete === false &&
      summary.demo.currentStage === 'validate');
  test('E5 the summary counts every canonical topic', summary.topicCount === gaps.length);

  /* ══ F. purity — no clock, randomness, network or dynamic import ═══════ */
  test('F1 the owner holds no fetch/random/clock/dynamic import',
    !/fetch\s*\(/.test(ownerCode) && !/Math\.random/.test(ownerCode) && !/Date\.now/.test(ownerCode) && !/\bimport\s*\(/.test(ownerCode));
  test('F2 the resolver holds no fetch/random/clock/dynamic import', (() => {
    const c = stripComments(resolverSrc);
    return !/fetch\s*\(/.test(c) && !/Math\.random/.test(c) && !/Date\.now/.test(c) && !/\bimport\s*\(/.test(c);
  })());

  /* ══ G. ONE owner + the loop is USED ════════════════════════════════════ */
  const loopOwners = srcFiles.filter((f) => /export const LEARNING_STAGES\s*[:=]/.test(readFileSync(f, 'utf8')));
  const resolverOwners = srcFiles.filter((f) => /export function resolveLearningProgress\s*\(/.test(readFileSync(f, 'utf8')));
  test('G1 exactly ONE learning-loop owner exists',
    loopOwners.length === 1 && /config\/learningLoop\.ts$/.test(loopOwners[0]));
  test('G2 exactly ONE resolver exists',
    resolverOwners.length === 1 && /resolveLearningProgress\.ts$/.test(resolverOwners[0]));
  test('G3 the Control Centre uses the owner',
    /buildLearningLoopSummary/.test(controlCentre) && /learningLoop/.test(controlCentre));
  test('G4 the founder surface renders it',
    /learning-loop-stages/.test(surface) && /model\.learningLoop\.stages/.test(surface));
  const brandFiles = walk(fileURLToPath(new URL('../src/components/brand', import.meta.url)));
  test('G5 NO brand-facing component imports the learning-loop owner',
    brandFiles.every((f) => !/learningLoop|education\/resolveLearningProgress/.test(readFileSync(f, 'utf8'))));

  /* ══ H. the gate can fail (self-check) ════════════════════════════════ */
  const expect = (actual, expected) => actual === expected;
  test('H1 not vacuous: a real topic resolves', expect(resolve('moq', acted).refused, null) === true);
  test('H2 not vacuous: a full signal set completes', expect(resolve('moq', { ...acted, validationPassed: true }).complete, true) === true);
  test('H3 not vacuous: the demo signals leave the loop open', expect(summary.demo.complete, false) === true);
} catch (err) {
  console.error('LEARNING_LOOP_VALIDATION_FAIL:', err.message);
  failures += 1;
} finally {
  await server.close();
  console.log(`\nLEARNING_LOOP_VALIDATION_${failures === 0 ? 'PASS' : 'FAIL'} (${failures} failures)`);
  process.exit(failures > 0 ? 1 : 0);
}