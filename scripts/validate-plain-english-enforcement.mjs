#!/usr/bin/env node
/**
 * PLAIN-ENGLISH ENFORCEMENT GATE — `npm run validate:plain-english`
 *
 * WHY THIS EXISTS (recorded incident, 2026-09-29)
 * ----------------------------------------------
 * The rule asking for plain English already existed in both global rules folders and
 * was byte-identical — and it was still not followed, so the owner was offered a
 * decision in words they could not evaluate and the work stopped. **Being written
 * down was not enough.** This gate makes the rule's PRESENCE, its IDENTITY across
 * every folder the assistant reads, and the OWNER-FACING summary mechanically
 * checkable, and it proves the checker itself can fail.
 *
 * It fails when:
 *   1  the rule is missing from the project, or no longer carries its hard-stop wording;
 *   2  the copies that DO exist differ from one another (a drift, so one reader sees
 *      a different rule from another);
 *   3  the files read first carry no pointer to the rule;
 *   4  `PROJECT_STATUS.md` has no `PLAIN SUMMARY (OWNER-FACING)` field in its resume block;
 *   5  that owner-facing summary contains a banned word with no explanation;
 *   6  the checker cannot detect a deliberately jargon-filled sample (a check that
 *      cannot fail proves nothing), or flags a correctly written one.
 *
 * A rules folder that does not exist on this machine (a fresh clone, a build server)
 * is SKIPPED with a warning rather than failed — absence there is not a drift.
 *
 * Run: node scripts/validate-plain-english-enforcement.mjs
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { BANNED_WITHOUT_EXPLANATION, findUnexplained } from './check-plain-english.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let pass = 0;
let fail = 0;
const errors = [];
function check(name, ok, detail = '') {
  if (ok) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    errors.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const RULE_IN_PROJECT = '.clinerules/plain-english-responses.md';
/**
 * Read DEFENSIVELY. If the rule is missing, this gate must REPORT that plainly and
 * fail — it must not die on an unreadable file, because a crash hides the real
 * finding ("the rule is gone") behind a stack trace.
 */
const ruleText = fs.existsSync(path.join(ROOT, RULE_IN_PROJECT)) ? read(RULE_IN_PROJECT) : '';

/** Every location the assistant's runtime reads for this project. */
const RULE_LOCATIONS = [
  { label: 'project', file: path.join(ROOT, RULE_IN_PROJECT), required: true },
  { label: '~/.cline/rules', file: path.join(os.homedir(), '.cline/rules/plain-english-responses.md') },
  {
    label: '~/Documents/Cline/Rules',
    file: path.join(os.homedir(), 'Documents/Cline/Rules/plain-english-responses.md'),
  },
];

const POINTER_LOCATIONS = [
  {
    label: '~/.cline/rules/00-task-mode-selection.md',
    file: path.join(os.homedir(), '.cline/rules/00-task-mode-selection.md'),
  },
  {
    label: '~/Documents/Cline/Rules/00-task-mode-selection.md',
    file: path.join(os.homedir(), 'Documents/Cline/Rules/00-task-mode-selection.md'),
  },
];

/* ── 1. the rule exists and still says what makes it a hard stop ──────────── */

console.log('§ 1. The rule is present and still carries its hard-stop contract\n');
check('the rule file exists in the project', fs.existsSync(RULE_LOCATIONS[0].file), RULE_IN_PROJECT);
check('it declares itself a HARD STOP', /HARD STOP/.test(ruleText));
check(
  'it says plainly that an unexplained technical word is a FAILED task',
  /unexplained technical word is a FAILED task/.test(ruleText)
);
check('it names the words banned without an explanation', /Words banned UNLESS explained/.test(ruleText));
check('it requires an explanation in the SAME sentence', /same sentence/.test(ruleText));
check('it gives the mandatory pre-send checks', /Mandatory check before sending ANY message/.test(ruleText));
check(
  'it records the incident that caused it to be strengthened',
  /2026-09-29/.test(ruleText) && /could not evaluate/.test(ruleText)
);

/**
 * The rule's own banned-word list must match the CHECKER's list — one source of
 * truth, so the written rule and the machine check can never disagree.
 */
const ruleList =
  (ruleText.split('## Words banned UNLESS explained in the same sentence')[1] ?? '')
    .split('##')[0]
    .replace(/\s+/g, ' ')
    .toLowerCase();
const missingFromRule = BANNED_WITHOUT_EXPLANATION.filter((term) => !ruleList.includes(term));
check(
  `the rule's banned list matches the checker's (${BANNED_WITHOUT_EXPLANATION.length} words)`,
  missingFromRule.length === 0,
  missingFromRule.length ? `missing from the rule: ${missingFromRule.join(', ')}` : ''
);

/* ── 2. every location that exists carries the SAME rule ─────────────────── */

console.log('\n§ 2. Every location the assistant reads carries the SAME rule\n');
const present = [];
for (const location of RULE_LOCATIONS) {
  const exists = fs.existsSync(location.file);
  if (exists) {
    present.push({ ...location, text: fs.readFileSync(location.file, 'utf8') });
  } else if (location.required) {
    check(`${location.label} carries the rule`, false, 'MISSING');
  } else {
    console.log(`  SKIP  ${location.label} — not installed on this machine (not a drift)`);
  }
}
const drift = present.filter((l) => l.text !== present[0].text).map((l) => l.label);
check(
  `every installed copy carries the SAME rule (${present.length} location(s) checked)`,
  present.length > 0 && drift.length === 0,
  drift.length ? `DIFFERENT: ${drift.join(', ')}` : ''
);

/* ── 3. the files read FIRST point at the rule ───────────────────────────── */

console.log('\n§ 3. The files read first point at the rule\n');
const POINTER_MARKER = 'PLAIN ENGLISH IS A HARD STOP';
for (const pointer of POINTER_LOCATIONS) {
  if (!fs.existsSync(pointer.file)) {
    console.log(`  SKIP  ${pointer.label} — not installed on this machine (not a drift)`);
    continue;
  }
  check(`${pointer.label} points at the rule`, fs.readFileSync(pointer.file, 'utf8').includes(POINTER_MARKER));
}
check(
  'the project operating model points at the rule',
  read('.clinerules/operating-model.md').includes(POINTER_MARKER)
);
check(
  'the project safety rules point at the rule',
  read('.clinerules/protection-rules.md').includes(POINTER_MARKER)
);

/* ── 4/5. the owner-facing summary exists and is written in plain English ── */

console.log('\n§ 4. The owner-facing summary is present, and is actually plain English\n');
const resumeBlock = read('PROJECT_STATUS.md').split('## CURRENT PLATFORM POSITION')[0];
const summaryMatch = /^PLAIN SUMMARY \(OWNER-FACING\):([\s\S]*?)\n\s*\n/m.exec(resumeBlock);
check(
  'PROJECT_STATUS.md carries a PLAIN SUMMARY (OWNER-FACING) field in its resume block',
  Boolean(summaryMatch)
);
const summary = (summaryMatch ? summaryMatch[1] : '').trim();
check('that summary is not empty', summary.length > 0, `length ${summary.length}`);
check(
  'the owner-facing summary uses no banned word without an explanation',
  summary.length > 0 && findUnexplained(summary).length === 0,
  findUnexplained(summary)
    .map((h) => h.term)
    .join(', ')
);

/* ── 6. the checker itself must be able to FAIL ──────────────────────────── */

console.log('\n§ 6. The checker is proved able to fail (a check that cannot fail proves nothing)\n');
const BAD_SAMPLE =
  'I will declare the seam in the scope guard so the mock keeps the canonical provenance.';
const GOOD_SAMPLE =
  'I will add two small labelled boxes to the one file, on a branch (a separate copy of the project ' +
  'files), that our own rules ask me to check with you first, so a cancelled order is noticed and the ' +
  'brand is stopped from sending it.';
check('it FLAGS a deliberately jargon-filled sentence', findUnexplained(BAD_SAMPLE).length > 0);
check(
  'it PASSES a sentence whose banned word IS explained in brackets',
  findUnexplained(GOOD_SAMPLE).length === 0,
  JSON.stringify(findUnexplained(GOOD_SAMPLE))
);
check(
  'a bracketed aside that does NOT follow the word still flags it',
  findUnexplained('The gate stays open (and this is a very long aside indeed).').length > 0
);
check(
  'an explanation of fewer than three words does not count',
  findUnexplained('The gate (open) stays that way.').length > 0
);

console.log('');
if (fail === 0) {
  console.log(`PLAIN_ENGLISH_ENFORCEMENT_PASS (${pass} passed, 0 failed)`);
  process.exit(0);
}
console.log(`PLAIN_ENGLISH_ENFORCEMENT_FAIL (${pass} passed, ${fail} failed)`);
for (const error of errors) console.log(`  · ${error}`);
process.exit(1);

