#!/usr/bin/env node
/**
 * PLAIN ENGLISH CHECKER — `npm run check:plain`
 *
 * WHY THIS EXISTS (recorded incident, 2026-09-29)
 * ----------------------------------------------
 * The owner was offered a real business decision in words they could not evaluate
 * ("declare `src/lib/spapi/client.ts` in the Batch 2c scope guard"). The rule asking
 * for plain English already existed in every rules folder — so writing it down was
 * not enough, and the work stopped. This checker is the mechanical half of the fix:
 * it flags a banned word used WITHOUT an explanation in the same sentence, so a
 * message, report or summary can be checked BEFORE it reaches the owner.
 *
 * WHAT COUNTS AS EXPLAINED
 * ------------------------
 * The word must be followed, in the SAME sentence, by a bracketed explanation of at
 * least three words — e.g.  branch (a separate copy of the project's files)
 *
 * Usage:
 *   node scripts/check-plain-english.mjs --text "…the drafted message…"
 *   node scripts/check-plain-english.mjs <file> [<file> …]
 * Exits 1 when anything is flagged, 0 when clean.
 */
import fs from 'fs';

/**
 * THE ONE LIST (single source of truth). The rules file must list the same words —
 * `scripts/validate-plain-english-enforcement.mjs` fails the build if it does not.
 */
export const BANNED_WITHOUT_EXPLANATION = [
  'repository',
  'branch',
  'commit',
  'push',
  'deploy',
  'endpoint',
  'schema',
  'migration',
  'refactor',
  'idempotent',
  'validator',
  'gate',
  'typecheck',
  'lint',
  'module',
  'dependency',
  'mock',
  'seam',
  'api',
  'json',
  'ci',
  'pipeline',
  'hash',
  'regression',
  'fixture',
  'tenant',
  'rbac',
  'ssot',
  'scope guard',
  'protected path',
  'provenance',
  'canonical',
];

/** The words inside a bracketed explanation must number at least this many. */
const MIN_EXPLANATION_WORDS = 3;

/** Split into sentences without pulling in a parser: enough for this purpose. */
const sentencesOf = (text) => text.split(/(?<=[.!?])\s+|\n+/).filter((s) => s.trim().length > 0);

const wordCount = (phrase) => phrase.trim().split(/\s+/).filter(Boolean).length;

/**
 * WHOLE-WORD matching, deliberately. A plain substring test would report "ci" inside
 * "decision" and "notice", "seam" inside "seamless", and so on — a checker that cries
 * wolf is a checker nobody reads.
 */
const termRegex = (term) =>
  new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');

/**
 * Does an explanation follow the term inside this sentence?
 * The bracketed explanation must come IMMEDIATELY after the term (allowing a space
 * and one joining mark such as a comma or dash), and hold at least
 * `MIN_EXPLANATION_WORDS` words — so a bracket that merely appears later in the
 * sentence does NOT count as explaining the word.
 */
function explainedIn(term, sentence) {
  const match = termRegex(term).exec(sentence);
  if (!match) return false;
  const rest = sentence.slice(match.index + match[0].length);
  const explanation = /^\s*[,:;—–-]?\s*\(([^)]*)\)/.exec(rest);
  return Boolean(explanation) && wordCount(explanation[1]) >= MIN_EXPLANATION_WORDS;
}

/** Every flagged use: { term, sentence }. Empty array = the text is clean. */
export function findUnexplained(text) {
  const found = [];
  for (const sentence of sentencesOf(text)) {
    for (const term of BANNED_WITHOUT_EXPLANATION) {
      if (!termRegex(term).test(sentence)) continue;
      if (explainedIn(term, sentence)) continue;
      found.push({ term, sentence: sentence.trim().slice(0, 160) });
    }
  }
  return found;
}

/* ── CLI ──────────────────────────────────────────────────────────────────── */
const isMain = process.argv[1] && process.argv[1].endsWith('check-plain-english.mjs');
if (isMain) {
  const args = process.argv.slice(2);
  const samples = [];
  if (args[0] === '--text') {
    samples.push({ label: '(text)', text: args.slice(1).join(' ') });
  } else if (args.length === 0) {
    console.log('usage: node scripts/check-plain-english.mjs --text "<message>" | <file> [...]');
    process.exit(2);
  } else {
    for (const file of args) {
      samples.push({ label: file, text: fs.readFileSync(file, 'utf8') });
    }
  }

  let flagged = 0;
  for (const sample of samples) {
    const found = findUnexplained(sample.text);
    flagged += found.length;
    for (const hit of found) {
      console.log(`  FLAGGED  ${sample.label}: "${hit.term}" used without an explanation`);
      console.log(`           ${hit.sentence}`);
      console.log('           fix: explain it in brackets, in the same sentence — term (plain meaning)');
    }
  }

  if (flagged === 0) {
    console.log('PLAIN_ENGLISH_OK (0 flagged)');
    process.exit(0);
  }
  console.log(`PLAIN_ENGLISH_FLAGGED (${flagged})`);
  process.exit(1);
}
