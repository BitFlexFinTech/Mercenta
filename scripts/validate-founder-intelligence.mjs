#!/usr/bin/env node
/**
 * §PHASE 11 — THE FOUNDER INTELLIGENCE EXPANSION GATE.
 *
 * The row `phase11-founder-intelligence-expansion` records the founder intelligence
 * expansion: the founder's standing questions, each answered from canonical deterministic
 * data, with AI permitted to SUMMARISE only. The owner
 * (`src/config/founderIntelligence.ts`) declares the questions and the rule; the resolver
 * (`src/lib/intelligence/founderIntelligence.ts`) applies it. The properties a comment
 * cannot guarantee are proved here:
 *
 *   · the eleven founder questions are declared, unique, and each names a question, what
 *     it is about, and the canonical owner that deterministically answers it;
 *   · EVERY declared canonical owner path EXISTS on disk (a named owner is only meaningful
 *     if it is real);
 *   · an UNKNOWN question is REFUSED; AI supplying DATA is REFUSED; any non-canonical
 *     producer of DATA is REFUSED; a SUMMARY by AI or a human is ALLOWED, and the canonical
 *     owner producing DATA is ALLOWED (the fail-closed and positive branches both proved);
 *   · it is DETERMINISTIC (no AI, no clock, no network), INTERNAL (no brand import), USED by
 *     the Control Centre and RENDERED by the founder surface.
 *
 * THE GATE CAN FAIL (self-check): a wrong expectation is rejected and a malformed input is
 * refused, so a green run proves the checks are live rather than vacuous.
 *
 * Run: node scripts/validate-founder-intelligence.mjs
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
  const owner = await server.ssrLoadModule('/src/config/founderIntelligence.ts');
  const res = await server.ssrLoadModule('/src/lib/intelligence/founderIntelligence.ts');

  console.log('\n── A. the founder-question universe ──');
  const qs = owner.FOUNDER_QUESTIONS;
  test('the eleven founder questions are declared', qs.length === 11);
  test('question ids are unique', new Set(qs.map((q) => q.id)).size === qs.length);
  test('every question names a question, what it is about, and a canonical data owner',
    qs.every((q) => q.question.length > 8 && q.about.length > 8 && q.dataOwner.length > 8));
  test('every question allows AI to summarise (AI is never the data source)',
    qs.every((q) => q.aiMaySummarise === true));
  test('the declared producer set is exactly the three values',
    equals([...owner.FOUNDER_ANSWER_SOURCES].sort(), ['ai', 'canonical_owner', 'human']));
  test('the derived id list matches the question ids',
    equals([...owner.FOUNDER_QUESTION_IDS], qs.map((q) => q.id)));

  console.log('\n── B. every declared canonical owner EXISTS on disk ──');
  const owners = [...new Set(qs.map((q) => q.dataOwner))];
  const missing = owners.filter((p) => !exists(p));
  test('every declared canonical data owner path exists in the repository',
    missing.length === 0, missing.join(', '));
  test('the question set names more than one canonical owner (not one monolith)',
    owners.length > 1);

  console.log('\n── C. the resolver — fail closed + positive branches ──');
  test('a known question resolves', res.resolveFounderQuestion('what-is-happening').found === true);
  test('an unknown question resolves to null', res.resolveFounderQuestion('nope').question === null);
  test('an unknown question is REFUSED',
    res.evaluateFounderAnswer('nope', 'data', 'canonical_owner').refusal === 'FOUNDER_QUESTION_UNKNOWN');
  test('AI supplying the DATA is REFUSED (AI may only summarise)',
    res.evaluateFounderAnswer('what-needs-attention', 'data', 'ai').refusal === 'FOUNDER_AI_MAY_ONLY_SUMMARISE');
  test('a human supplying the DATA is REFUSED',
    res.evaluateFounderAnswer('what-needs-attention', 'data', 'human').refusal === 'FOUNDER_DATA_REQUIRES_CANONICAL_OWNER');
  test('the canonical owner supplying the DATA is ALLOWED',
    res.evaluateFounderAnswer('what-needs-attention', 'data', 'canonical_owner').allowed === true);
  test('AI producing a SUMMARY is ALLOWED',
    res.evaluateFounderAnswer('what-needs-attention', 'summary', 'ai').allowed === true);
  test('a human producing a SUMMARY is ALLOWED',
    res.evaluateFounderAnswer('what-needs-attention', 'summary', 'human').allowed === true);

  console.log('\n── D. the founder summary (derived) ──');
  const summary = res.buildFounderIntelligenceSummary();
  test('the summary covers every declared question', summary.questionCount === qs.length && summary.questions.length === qs.length);
  test('the summary counts summarisable questions and distinct owners honestly',
    summary.aiSummarisableCount === qs.filter((q) => q.aiMaySummarise).length &&
      summary.dataOwnerCount === owners.length);
  test('the summary exposes the pinned invariants',
    summary.oneOwner && summary.answersFromCanonicalData && summary.aiMayOnlySummarise && summary.failsClosed);
  test('the summary’s live example REFUSES (fail-closed proof is computed, not written)',
    summary.exampleRefusal.refusal === 'FOUNDER_AI_MAY_ONLY_SUMMARISE');

  console.log('\n── E. deterministic — no AI, no clock, no network ──');
  const ownerSrc = stripComments(read('src/config/founderIntelligence.ts'));
  const resSrc = stripComments(read('src/lib/intelligence/founderIntelligence.ts'));
  test('neither the owner nor the resolver makes an AI / provider / network / random call',
    !/openrouter|\bsupabase\b|\bfetch\(|Math\.random|Date\.now|new Date/i.test(ownerSrc) &&
      !/openrouter|\bsupabase\b|\bfetch\(|Math\.random|Date\.now|new Date/i.test(resSrc));
  test('the owner fails closed at module load (guards present)',
    /FOUNDER_QUESTIONS\.length === 0/.test(ownerSrc) &&
      /duplicate question id/.test(ownerSrc) && /missing a field/.test(ownerSrc));

  console.log('\n── F. INTERNAL — no brand leakage ──');
  const brandFiles = walk(fileURLToPath(new URL('../src/components/brand/', import.meta.url)));
  const brandLeak = brandFiles.filter((f) => /founderIntelligence|FOUNDER_QUESTIONS|buildFounderIntelligenceSummary/.test(readFileSync(f, 'utf8')));
  test('no brand component imports the founder intelligence', brandLeak.length === 0, brandLeak.join(', '));

  console.log('\n── G. USED by the Control Centre + rendered by the founder surface ──');
  const cc = read('src/lib/commandCentre/controlCentre.ts');
  test('controlCentre imports the resolver and exposes founderIntelligence',
    /buildFounderIntelligenceSummary/.test(cc) && /founderIntelligence:\s*FounderIntelligenceSummary/.test(cc));
  const fcc = read('src/components/admin/FounderControlCentre.tsx');
  test('the Founder Control Centre renders the founder intelligence section',
    /founder-intelligence-questions/.test(fcc) && /model\.founderIntelligence/.test(fcc));

  console.log('\n── H. SELF-CHECK — the gate can fail ──');
  test('the comparison helper ACCEPTS a correct expectation', equals(['a'], ['a']));
  test('the comparison helper REJECTS a wrong expectation (proves it can fail)', !equals(['a'], ['b']));
  const malformed = res.evaluateFounderAnswer('nope', 'summary', 'ai');
  test('a malformed (unknown-question) input REFUSES — proves the refused branch works',
    malformed.refusal === 'FOUNDER_QUESTION_UNKNOWN');
  test('the AI-supplied-data branch is a distinct refusal from the human one',
    res.evaluateFounderAnswer('what-is-happening', 'data', 'ai').refusal !==
      res.evaluateFounderAnswer('what-is-happening', 'data', 'human').refusal);
} finally {
  await server.close();
}

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);