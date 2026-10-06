#!/usr/bin/env node
/**
 * §PHASE 5 — THE SHARED WORKFLOW REUSE GATE.
 *
 * WHY THIS EXISTS — the shared-workflow feature's value rests on properties a
 * comment cannot guarantee:
 *   · every canonical workflow points at a guided tour that REALLY EXISTS in the
 *     tour registry and a Knowledge Base article that REALLY EXISTS;
 *   · every workflow names a canonical E2E spec that REALLY EXISTS on disk;
 *   · the STEPS are DERIVED from the canonical tour — the owner must NOT contain
 *     a second, hand-maintained list of `data-tour` anchors;
 *   · the anchors the workflow exposes are EXACTLY the canonical tour's
 *     `targetSelector`s — the SAME contract a Playwright test drives;
 *   · ONE automation supports all three consumers (onboarding walkthrough,
 *     tutorial recording, E2E test);
 *   · an UNKNOWN workflow id is REFUSED (fail closed) — no workflow is guessed;
 *   · a workflow whose tour does not exist is REFUSED (fail closed);
 *   · the owner and resolver are PURE (no clock, randomness, network, dynamic import);
 *   · there is exactly ONE owner and ONE resolver, they are USED by the Control
 *     Centre and the founder surface, and NO brand-facing component imports them.
 *
 * THE GATE CAN FAIL (self-check): a synthetic workflow with a missing tour must be
 * refused, and an unknown id must be refused.
 *
 * Run: node scripts/validate-shared-workflow-reuse.mjs
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
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
  const owner = await server.ssrLoadModule('/src/config/sharedWorkflows.ts');
  const resolver = await server.ssrLoadModule('/src/lib/education/resolveSharedWorkflow.ts');
  const kb = await server.ssrLoadModule('/src/data/knowledgeBase.ts');
  const tours = await server.ssrLoadModule('/src/config/tours/tourDefinitions.ts');
  const ownerCode = stripComments(read('src/config/sharedWorkflows.ts'));
  const resolverSrc = read('src/lib/education/resolveSharedWorkflow.ts');
  const controlCentre = read('src/lib/commandCentre/controlCentre.ts');
  const surface = read('src/components/admin/FounderControlCentre.tsx');

  const kbIds = new Set(kb.KB_ARTICLES.map((a) => a.id));
  const root = fileURLToPath(new URL('..', import.meta.url));

  /* ══ A. the owner ═══════════════════════════════════════════════════════ */
  test('A1 at least one workflow is declared', owner.SHARED_WORKFLOWS.length > 0);
  test('A2 workflow ids are unique',
    new Set(owner.SHARED_WORKFLOWS.map((w) => w.id)).size === owner.SHARED_WORKFLOWS.length);
  test('A3 every workflow names a guided tour that exists',
    owner.SHARED_WORKFLOWS.every((w) => !!tours.TOUR_REGISTRY[w.tourId]),
    owner.SHARED_WORKFLOWS.filter((w) => !tours.TOUR_REGISTRY[w.tourId]).map((w) => w.id).join(', '));
  test('A4 every workflow names a Knowledge Base article that exists',
    owner.SHARED_WORKFLOWS.every((w) => kbIds.has(w.kbArticleId)),
    owner.SHARED_WORKFLOWS.filter((w) => !kbIds.has(w.kbArticleId)).map((w) => w.id).join(', '));
  test('A5 every workflow names a canonical E2E spec ending .spec.ts',
    owner.SHARED_WORKFLOWS.every((w) => typeof w.e2eSpec === 'string' && w.e2eSpec.endsWith('.spec.ts')));
  test('A6 exactly three consumers share the one automation', owner.WORKFLOW_CONSUMERS.length === 3);
  test('A7 the owner holds NO second list of data-tour SELECTORS (steps are derived)',
    !/\[data-tour=/.test(ownerCode));

  /* ══ B. the E2E specs exist on disk ════════════════════════════════════ */
  test('B1 every declared E2E spec exists on disk',
    owner.SHARED_WORKFLOWS.every((w) => existsSync(`${root}${w.e2eSpec}`)),
    owner.SHARED_WORKFLOWS.filter((w) => !existsSync(`${root}${w.e2eSpec}`)).map((w) => w.e2eSpec).join(', '));

  /* ══ C. the resolver — steps DERIVED from the canonical tour ═══════════ */
  const resolved = owner.SHARED_WORKFLOWS.map((w) => resolver.resolveSharedWorkflow(w.id));
  test('C1 every workflow resolves with no refusal',
    resolved.every((r) => r.refused === null));
  test('C2 the step count equals the canonical tour step count (steps are DERIVED)',
    owner.SHARED_WORKFLOWS.every((w) => {
      const r = resolver.resolveSharedWorkflow(w.id);
      return r.stepCount === tours.TOUR_REGISTRY[w.tourId].steps.length;
    }));
  test('C3 the anchors ARE the canonical tour targetSelectors (the shared contract)',
    owner.SHARED_WORKFLOWS.every((w) => {
      const r = resolver.resolveSharedWorkflow(w.id);
      const expected = tours.TOUR_REGISTRY[w.tourId].steps.map((s) => s.targetSelector);
      return JSON.stringify(r.steps.map((s) => s.anchor)) === JSON.stringify(expected);
    }));
  test('C4 every anchor is a real data-tour selector',
    resolved.every((r) => r.steps.every((s) => /data-tour=/.test(s.anchor))));
  test('C5 an unknown workflow id is REFUSED (fail closed)',
    resolver.resolveSharedWorkflow('no.such.workflow').refused === 'WORKFLOW_UNKNOWN');
  test('C6 a workflow whose tour does not exist is REFUSED (fail closed)',
    resolver.resolveSharedWorkflowDefinition({
      id: 'synthetic', label: 'x', description: 'x', tourId: 'no-such-tour', e2eSpec: 'e2e/tours.spec.ts', kbArticleId: 'kb-welcome',
    }).refused === 'WORKFLOW_TOUR_MISSING');

  /* ══ D. purity — no clock, randomness, network or dynamic import ═══════ */
  test('D1 the owner holds no fetch/random/clock/dynamic import',
    !/fetch\s*\(/.test(ownerCode) && !/Math\.random/.test(ownerCode) && !/Date\.now/.test(ownerCode) && !/\bimport\s*\(/.test(ownerCode));
  test('D2 the resolver holds no fetch/random/clock/dynamic import', (() => {
    const c = stripComments(resolverSrc);
    return !/fetch\s*\(/.test(c) && !/Math\.random/.test(c) && !/Date\.now/.test(c) && !/\bimport\s*\(/.test(c);
  })());

  /* ══ E. ONE owner + ONE resolver + USED ════════════════════════════════ */
  const srcFiles = walk(fileURLToPath(new URL('../src', import.meta.url)));
  const ownerFiles = srcFiles.filter((f) => /export const SHARED_WORKFLOWS\s*[:=]/.test(readFileSync(f, 'utf8')));
  const resolverFiles = srcFiles.filter((f) => /export function resolveSharedWorkflow\s*\(/.test(readFileSync(f, 'utf8')));
  test('E1 exactly ONE shared-workflow owner exists',
    ownerFiles.length === 1 && /config\/sharedWorkflows\.ts$/.test(ownerFiles[0]));
  test('E2 exactly ONE resolver exists',
    resolverFiles.length === 1 && /resolveSharedWorkflow\.ts$/.test(resolverFiles[0]));
  test('E3 the Control Centre uses the owner',
    /buildSharedWorkflowSummary/.test(controlCentre) && /sharedWorkflows/.test(controlCentre));
  test('E4 the founder surface renders it',
    /shared-workflows-list/.test(surface) && /model\.sharedWorkflows\.workflows/.test(surface));
  const brandFiles = walk(fileURLToPath(new URL('../src/components/brand', import.meta.url)));
  test('E5 NO brand-facing component imports the shared-workflow owner',
    brandFiles.every((f) => !/sharedWorkflows|education\/resolveSharedWorkflow/.test(readFileSync(f, 'utf8'))));

  /* ══ F. the summary ═════════════════════════════════════════════════════ */
  const summary = resolver.buildSharedWorkflowSummary();
  test('F1 the summary reports every workflow and consumer',
    summary.workflowCount === owner.SHARED_WORKFLOWS.length && summary.consumerCount === 3);
  test('F2 every workflow in the summary resolves to a non-empty article title',
    summary.workflows.every((w) => w.articleTitle.trim().length > 0));
  test('F3 every workflow in the summary has at least one anchored step',
    summary.workflows.every((w) => w.stepCount > 0 && w.anchors.every((a) => /data-tour=/.test(a))));
  test('F4 the summary reports the pinned invariants',
    summary.oneOwner === true && summary.reuseCanonicalTours === true && summary.mapToRealE2eSpecs === true);
  test('F5 the DEMO workflow resolves with its derived steps',
    summary.demo !== null && summary.demo.stepCount > 0 && summary.demo.consumerCount === 3);

  /* ══ G. the gate can fail (self-check) ════════════════════════════════ */
  test('G1 not vacuous: refusing an unknown id is a real, distinct outcome',
    resolver.resolveSharedWorkflow('no.such.workflow').refused === 'WORKFLOW_UNKNOWN' &&
      resolver.resolveSharedWorkflow(owner.SHARED_WORKFLOWS[0].id).refused === null);
  test('G2 not vacuous: the owner and resolver are distinct modules',
    Array.isArray(owner.SHARED_WORKFLOWS) && typeof resolver.buildSharedWorkflowSummary === 'function');
} catch (err) {
  console.error('SHARED_WORKFLOW_VALIDATION_FAIL:', err.message);
  failures += 1;
} finally {
  await server.close();
  console.log(`\nSHARED_WORKFLOW_VALIDATION_${failures === 0 ? 'PASS' : 'FAIL'} (${failures} failures)`);
  process.exit(failures > 0 ? 1 : 0);
}
