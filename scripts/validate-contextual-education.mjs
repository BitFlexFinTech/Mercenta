#!/usr/bin/env node
/**
 * §PHASE 5 — THE CONTEXTUAL EDUCATION GATE.
 *
 * WHY THIS EXISTS — the contextual-education feature's value rests on properties a
 * comment cannot guarantee:
 *   · every "why do we need this?" explanation points at a canonical Knowledge Base
 *     article that REALLY EXISTS — the help text is never duplicated and never a
 *     dead link;
 *   · every explanation is attached to a REAL screen, and each screen names a
 *     canonical guided tour that really exists in the tour registry;
 *   · field keys are unique, so a lookup is unambiguous;
 *   · an UNKNOWN field key is REFUSED (fail closed) — no explanation is guessed;
 *   · an explanation whose article does not exist is REFUSED (fail closed);
 *   · the owner and resolver are PURE (no clock, randomness, network, dynamic import);
 *   · there is exactly ONE owner and ONE resolver, they are USED by the Control
 *     Centre and the founder surface, and NO brand-facing component imports them.
 *
 * THE GATE CAN FAIL (self-check): a synthetic explanation with a missing article
 * must be refused, and an unknown key must be refused.
 *
 * Run: node scripts/validate-contextual-education.mjs
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
  const owner = await server.ssrLoadModule('/src/config/contextualEducation.ts');
  const resolver = await server.ssrLoadModule('/src/lib/education/resolveContextualHelp.ts');
  const kb = await server.ssrLoadModule('/src/data/knowledgeBase.ts');
  const tours = await server.ssrLoadModule('/src/config/tours/tourDefinitions.ts');
  const ownerCode = stripComments(read('src/config/contextualEducation.ts'));
  const resolverSrc = read('src/lib/education/resolveContextualHelp.ts');
  const controlCentre = read('src/lib/commandCentre/controlCentre.ts');
  const surface = read('src/components/admin/FounderControlCentre.tsx');

  const kbIds = new Set(kb.KB_ARTICLES.map((a) => a.id));

  /* ══ A. the owner ═══════════════════════════════════════════════════════ */
  test('A1 at least one explanation is declared', owner.CONTEXTUAL_EXPLANATIONS.length > 0);
  test('A2 every explanation points at a Knowledge Base article that exists',
    owner.CONTEXTUAL_EXPLANATIONS.every((e) => kbIds.has(e.articleId)),
    owner.CONTEXTUAL_EXPLANATIONS.filter((e) => !kbIds.has(e.articleId)).map((e) => e.key).join(', '));
  test('A3 field keys are unique',
    new Set(owner.CONTEXTUAL_EXPLANATIONS.map((e) => e.key)).size === owner.CONTEXTUAL_EXPLANATIONS.length);
  test('A4 every explanation attaches to a declared screen',
    owner.CONTEXTUAL_EXPLANATIONS.every((e) => !!owner.CONTEXTUAL_SCREENS[e.screen]));
  test('A5 every screen names a guided tour that exists (or none)',
    owner.CONTEXTUAL_SCREEN_ORDER.every((id) => {
      const t = owner.CONTEXTUAL_SCREENS[id].tourId;
      return t === null || !!tours.TOUR_REGISTRY[t];
    }));
  test('A6 every explanation carries a non-empty "why"', owner.CONTEXTUAL_EXPLANATIONS.every((e) => e.why.trim().length > 0));
  test('A7 the pinned invariants are true',
    owner.EXPLANATIONS_REUSE_CANONICAL_KB === true && owner.EXPLANATIONS_ATTACH_TO_REAL_SCREENS === true);

  /* ══ B. the resolver ════════════════════════════════════════════════════ */
  test('B1 a known field resolves to its canonical article + tour', (() => {
    const r = resolver.resolveContextualHelp('po.acknowledgedQuantity');
    const article = kb.getKnowledgeArticle('kb-purchase-orders');
    return r.refused === null && r.article?.id === 'kb-purchase-orders' && r.article?.title === article.title &&
      r.tour?.id === 'po-acknowledgment' && r.why.trim().length > 0;
  })());
  test('B2 every declared field resolves without refusal',
    owner.CONTEXTUAL_EXPLANATIONS.every((e) => resolver.resolveContextualHelp(e.key).refused === null));
  test('B3 an UNKNOWN field key is REFUSED (fail closed)',
    resolver.resolveContextualHelp('no.such.field').refused === 'CONTEXTUAL_HELP_UNKNOWN');
  test('B4 an explanation whose article does not exist is REFUSED (fail closed)',
    resolver.resolveContextualExplanation({
      key: 'x.missing', screen: 'product-catalog', label: 'X', why: 'x', articleId: 'kb-does-not-exist',
    }).refused === 'CONTEXTUAL_HELP_ARTICLE_MISSING');
  test('B5 a refused explanation carries no body (never a guess)',
    resolver.resolveContextualHelp('no.such.field').article === null &&
      resolver.resolveContextualHelp('no.such.field').why === '');

  /* ══ C. purity — no clock, randomness, network or dynamic import ═══════ */
  test('C1 the owner holds no fetch/random/clock/dynamic import',
    !/fetch\s*\(/.test(ownerCode) && !/Math\.random/.test(ownerCode) && !/Date\.now/.test(ownerCode) && !/\bimport\s*\(/.test(ownerCode));
  test('C2 the resolver holds no fetch/random/clock/dynamic import', (() => {
    const c = stripComments(resolverSrc);
    return !/fetch\s*\(/.test(c) && !/Math\.random/.test(c) && !/Date\.now/.test(c) && !/\bimport\s*\(/.test(c);
  })());

  /* ══ D. ONE owner + ONE resolver + USED ════════════════════════════════ */
  const srcFiles = walk(fileURLToPath(new URL('../src', import.meta.url)));
  const ownerFiles = srcFiles.filter((f) => /export const CONTEXTUAL_EXPLANATIONS\s*[:=]/.test(readFileSync(f, 'utf8')));
  const resolverFiles = srcFiles.filter((f) => /export function resolveContextualHelp\s*\(/.test(readFileSync(f, 'utf8')));
  test('D1 exactly ONE contextual-education owner exists',
    ownerFiles.length === 1 && /config\/contextualEducation\.ts$/.test(ownerFiles[0]));
  test('D2 exactly ONE resolver exists',
    resolverFiles.length === 1 && /resolveContextualHelp\.ts$/.test(resolverFiles[0]));
  test('D3 the Control Centre uses the owner',
    /buildContextualEducationSummary/.test(controlCentre) && /contextualEducation/.test(controlCentre));
  test('D4 the founder surface renders it',
    /contextual-education-screens/.test(surface) && /model\.contextualEducation\.explanations/.test(surface));
  const brandFiles = walk(fileURLToPath(new URL('../src/components/brand', import.meta.url)));
  test('D5 NO brand-facing component imports the contextual-education owner',
    brandFiles.every((f) => !/contextualEducation|education\/resolveContextualHelp/.test(readFileSync(f, 'utf8'))));

  /* ══ E. the summary ═════════════════════════════════════════════════════ */
  const summary = resolver.buildContextualEducationSummary();
  test('E1 the summary reports every explanation and screen',
    summary.explanationCount === owner.CONTEXTUAL_EXPLANATIONS.length && summary.screenCount === owner.CONTEXTUAL_SCREEN_ORDER.length);
  test('E2 every explanation in the summary resolves to a non-empty article title',
    summary.explanations.every((e) => e.articleTitle.trim().length > 0));
  test('E3 the summary reports the reusable canonical articles',
    summary.articleIds.length > 0 && summary.articleIds.every((id) => kbIds.has(id)));
  test('E4 the summary reports the pinned invariants',
    summary.reuseCanonicalKb === true && summary.attachToRealScreens === true);
  test('E5 the DEMO field resolves with its article title', summary.demo !== null && summary.demo.articleTitle.trim().length > 0);

  /* ══ F. the gate can fail (self-check) ════════════════════════════════ */
  test('F1 not vacuous: refusing an unknown key is a real, distinct outcome',
    resolver.resolveContextualHelp('no.such.field').refused === 'CONTEXTUAL_HELP_UNKNOWN' &&
      resolver.resolveContextualHelp(owner.CONTEXTUAL_EXPLANATIONS[0].key).refused === null);
  test('F2 not vacuous: the owner and resolver are distinct modules',
    Array.isArray(owner.CONTEXTUAL_EXPLANATIONS) && typeof resolver.buildContextualEducationSummary === 'function');
} catch (err) {
  console.error('CONTEXTUAL_EDUCATION_VALIDATION_FAIL:', err.message);
  failures += 1;
} finally {
  await server.close();
  console.log(`\nCONTEXTUAL_EDUCATION_VALIDATION_${failures === 0 ? 'PASS' : 'FAIL'} (${failures} failures)`);
  process.exit(failures > 0 ? 1 : 0);
}
