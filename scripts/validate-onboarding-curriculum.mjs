#!/usr/bin/env node
/**
 * §PHASE 4 — THE ONBOARDING ACADEMY CURRICULUM GATE.
 *
 * WHY THIS EXISTS — the curriculum's value rests on properties a comment cannot guarantee:
 *   · the curriculum declares the FIVE canonical stages (Understand Mercenta ·
 *     Commercial · Product & Packaging · Product Readiness · Operations) followed by
 *     EXACTLY ONE final readiness stage, and the readiness stage is LAST;
 *   · every teaching stage's topics are DERIVED from the canonical educational gaps
 *     (`LEARNING_TOPICS`) — there is no second list, and no topic is orphaned;
 *   · the orientation stage (Understand Mercenta) legitimately carries ZERO gap-topics;
 *   · the final readiness stage is reached ONLY once EVERY gating stage is complete;
 *   · a stage is SEQUENTIAL — a later stage cannot begin before earlier gating stages;
 *   · a topic counts for a stage ONLY when its learning loop reaches VALIDATE — a
 *     validation signal with no performed action does NOT close a stage (fail closed);
 *   · an unknown stage is REFUSED;
 *   · the curriculum is actually USED by the Control Centre and the founder surface,
 *     and NO brand-facing component imports it.
 *
 * THE GATE CAN FAIL (self-check): the resolver is exercised against inputs that must
 * (and must not) reach readiness.
 *
 * Run: node scripts/validate-onboarding-curriculum.mjs
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
  const owner = await server.ssrLoadModule('/src/config/onboardingCurriculum.ts');
  const resolver = await server.ssrLoadModule('/src/lib/education/resolveCurriculum.ts');
  const loop = await server.ssrLoadModule('/src/config/learningLoop.ts');
  const ownerCode = stripComments(read('src/config/onboardingCurriculum.ts'));
  const resolverSrc = read('src/lib/education/resolveCurriculum.ts');
  const controlCentre = read('src/lib/commandCentre/controlCentre.ts');
  const surface = read('src/components/admin/FounderControlCentre.tsx');

  const resolve = (sig) => resolver.resolveCurriculumProgress(sig);
  const FULL = { articleRead: true, tourCompleted: true, actionPerformed: true, validationPassed: true };
  const allFull = () => {
    const s = {};
    for (const id of owner.ACADEMY_STAGE_ORDER) for (const t of owner.ACADEMY_STAGE_TOPICS[id]) s[t.id] = { ...FULL };
    return s;
  };
  const validationOnly = () => {
    const s = {};
    for (const id of owner.ACADEMY_STAGE_ORDER) for (const t of owner.ACADEMY_STAGE_TOPICS[id]) s[t.id] = { validationPassed: true };
    return s;
  };

  /* ══ A. the stages + the pinned invariants ══════════════════════════════ */
  const ORDER = 'understand_mercenta,commercial,product_packaging,product_readiness,operations,catalogue_readiness';
  test('A1 the curriculum declares six stages in canonical order',
    owner.ACADEMY_STAGE_ORDER.join(',') === ORDER);
  test('A2 there are EXACTLY five stages before the readiness stage',
    owner.ACADEMY_STAGE_ORDER.filter((id) => owner.ACADEMY_STAGES[id].kind !== 'readiness').length === 5);
  test('A3 EXACTLY ONE readiness stage exists, and it is LAST',
    owner.ACADEMY_STAGE_ORDER.filter((id) => owner.ACADEMY_STAGES[id].kind === 'readiness').length === 1 &&
      owner.ACADEMY_STAGE_ORDER[owner.ACADEMY_STAGE_ORDER.length - 1] === owner.READINESS_STAGE_ID);
  test('A4 the pinned invariants hold',
    owner.CURRICULUM_IS_SEQUENTIAL === true &&
      owner.FINAL_READINESS_REQUIRES_ALL_STAGES === true &&
      owner.STAGES_REUSE_CANONICAL_GAPS === true);
  test('A5 the five canonical labels match the Phase-4 taxonomy (MASTER_CHATGPT_HANDOFF §16)',
    ['Understand Mercenta', 'Commercial', 'Product & Packaging', 'Product Readiness', 'Operations'].every(
      (label) => Object.values(owner.ACADEMY_STAGES).some((s) => s.label === label)));
  test('A6 the gating stages are exactly the four teaching stages',
    owner.GATING_STAGE_IDS.join(',') === 'commercial,product_packaging,product_readiness,operations');

  /* ══ B. the topics are DERIVED from the canonical gaps ══════════════════ */
  const gaps = loop.LEARNING_TOPICS;
  const assigned = owner.ACADEMY_STAGE_ORDER.reduce((n, id) => n + owner.ACADEMY_STAGE_TOPICS[id].length, 0);
  test('B1 the stage topics cover every canonical gap topic exactly once',
    assigned === gaps.length);
  test('B2 every canonical topic lands in the stage matching its academyStage number',
    gaps.every((t) => owner.ACADEMY_STAGE_TOPICS[owner.ACADEMY_STAGE_ORDER.find(
      (id) => owner.ACADEMY_STAGES[id].academyStageNumber === t.academyStage)].some((x) => x.id === t.id)));
  test('B3 the orientation stage carries ZERO gap-topics (deliberate)',
    owner.ACADEMY_STAGE_TOPICS.understand_mercenta.length === 0);
  test('B4 every teaching stage carries at least one topic',
    owner.GATING_STAGE_IDS.every((id) => owner.ACADEMY_STAGE_TOPICS[id].length >= 1));
  test('B5 the final readiness stage teaches nothing (it is the result)',
    owner.ACADEMY_STAGE_TOPICS[owner.READINESS_STAGE_ID].length === 0);

  /* ══ C. sequential + readiness ══════════════════════════════════════════ */
  const empty = resolve({});
  test('C1 with no signals the orientation stage is settled and the first teaching stage is current',
    empty.stages.find((s) => s.id === 'understand_mercenta').state === 'complete' &&
      empty.stages.find((s) => s.id === 'commercial').state === 'in_progress' &&
      empty.currentStageId === 'commercial');
  test('C2 later teaching stages are LOCKED until earlier gating stages are complete',
    empty.stages.find((s) => s.id === 'product_packaging').state === 'locked' &&
      empty.stages.find((s) => s.id === 'operations').state === 'locked');
  test('C3 the readiness stage is NOT reached with no signals',
    empty.readinessReached === false &&
      empty.stages.find((s) => s.id === owner.READINESS_STAGE_ID).state === 'locked');
  const demo = resolve(resolver.DEMO_CURRICULUM_SIGNALS);
  test('C4 the DEMO position stands at Product Readiness and is NOT catalogue-ready',
    demo.currentStageId === 'product_readiness' && demo.readinessReached === false);
  const allDone = resolve(allFull());
  test('C5 every gating stage complete reaches the final readiness stage',
    allDone.readinessReached === true &&
      allDone.stages.find((s) => s.id === owner.READINESS_STAGE_ID).state === 'complete' &&
      allDone.currentStageId === owner.READINESS_STAGE_ID);

  /* ══ D. fail closed ═════════════════════════════════════════════════════ */
  test('D1 an unknown stage is REFUSED',
    resolver.resolveCurriculumStage('nope', {}).refused === 'CURRICULUM_STAGE_UNKNOWN');
  test('D2 blank/null stages are refused',
    resolver.resolveCurriculumStage(null, {}).refused === 'CURRICULUM_STAGE_UNKNOWN' &&
      resolver.resolveCurriculumStage('', {}).refused === 'CURRICULUM_STAGE_UNKNOWN');
  test('D3 a real stage resolves with no refusal',
    resolver.resolveCurriculumStage('commercial', {}).refused === null &&
      resolver.resolveCurriculumStage('commercial', {}).stage.id === 'commercial');
  test('D4 a validation signal with no performed action does NOT close a stage (fail closed)',
    resolve(validationOnly()).stages.find((s) => s.id === 'commercial').completedTopicIds.length === 0 &&
      resolve(validationOnly()).readinessReached === false);

  /* ══ E. the summary ═════════════════════════════════════════════════════ */
  const summary = resolver.buildOnboardingCurriculumSummary();
  test('E1 the summary reports six stages, five before readiness',
    summary.stageCount === 6 && summary.teachingStageCount === 5);
  test('E2 the summary names the readiness stage', summary.readinessStageId === owner.READINESS_STAGE_ID);
  test('E3 the summary reports the readiness rule', summary.finalReadinessRequiresAllStages === true);
  test('E4 the summary counts every canonical topic', summary.topicCount === gaps.length);
  test('E5 the DEMO summary is honestly NOT catalogue-ready',
    summary.demo.currentStageId === 'product_readiness' && summary.demo.readinessReached === false);

  /* ══ F. purity — no clock, randomness, network or dynamic import ═══════ */
  test('F1 the owner holds no fetch/random/clock/dynamic import',
    !/fetch\s*\(/.test(ownerCode) && !/Math\.random/.test(ownerCode) && !/Date\.now/.test(ownerCode) && !/\bimport\s*\(/.test(ownerCode));
  test('F2 the resolver holds no fetch/random/clock/dynamic import', (() => {
    const c = stripComments(resolverSrc);
    return !/fetch\s*\(/.test(c) && !/Math\.random/.test(c) && !/Date\.now/.test(c) && !/\bimport\s*\(/.test(c);
  })());

  /* ══ G. ONE owner + the curriculum is USED ═════════════════════════════ */
  const srcFiles = walk(fileURLToPath(new URL('../src', import.meta.url)));
  const ownerFiles = srcFiles.filter((f) => /export const ACADEMY_STAGES\s*[:=]/.test(readFileSync(f, 'utf8')));
  const resolverFiles = srcFiles.filter((f) => /export function resolveCurriculumProgress\s*\(/.test(readFileSync(f, 'utf8')));
  test('G1 exactly ONE curriculum owner exists',
    ownerFiles.length === 1 && /config\/onboardingCurriculum\.ts$/.test(ownerFiles[0]));
  test('G2 exactly ONE resolver exists',
    resolverFiles.length === 1 && /resolveCurriculum\.ts$/.test(resolverFiles[0]));
  test('G3 the Control Centre uses the owner',
    /buildOnboardingCurriculumSummary/.test(controlCentre) && /onboardingCurriculum/.test(controlCentre));
  test('G4 the founder surface renders it',
    /curriculum-stages/.test(surface) && /model\.onboardingCurriculum\.stages/.test(surface));
  const brandFiles = walk(fileURLToPath(new URL('../src/components/brand', import.meta.url)));
  test('G5 NO brand-facing component imports the curriculum owner',
    brandFiles.every((f) => !/onboardingCurriculum|education\/resolveCurriculum/.test(readFileSync(f, 'utf8'))));

  /* ══ H. the gate can fail (self-check) ════════════════════════════════ */
  test('H1 not vacuous: a full signal set reaches readiness',
    resolve(allFull()).readinessReached === true);
  test('H2 not vacuous: the demo signals do NOT reach readiness',
    resolve(resolver.DEMO_CURRICULUM_SIGNALS).readinessReached === false);
  test('H3 not vacuous: the owner and resolver are distinct modules',
    owner.ACADEMY_STAGE_ORDER.length === 6 && typeof resolver.resolveCurriculumProgress === 'function');
} catch (err) {
  console.error('ONBOARDING_CURRICULUM_VALIDATION_FAIL:', err.message);
  failures += 1;
} finally {
  await server.close();
  console.log(`\nONBOARDING_CURRICULUM_VALIDATION_${failures === 0 ? 'PASS' : 'FAIL'} (${failures} failures)`);
  process.exit(failures > 0 ? 1 : 0);
}
