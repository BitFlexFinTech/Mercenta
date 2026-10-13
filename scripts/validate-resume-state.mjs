// §SESSION 43 — THE RESUME-STATE GATE.
//
// WHY THIS EXISTS
// ---------------
// `.clinerules/operating-model.md` §12 (CHAT IS NOT PROJECT MEMORY) and
// `.clinerules/project-state-contract.md` require `PROJECT_STATUS.md` to begin
// with a `## CURRENT RESUME STATE` block holding EXACTLY the ten declared
// fields, mirrored by `HANDOFF.md`. A brand-new session resumes from that block
// alone — so a block that is duplicated, partially stale or contradictory is not
// cosmetic: it tells the next session to do work that is already finished.
//
// THAT IS NOT HYPOTHETICAL. On 2026-09-28 (session 43) the block held TWO field
// sets: the current Batch 1c one, and a stale Batch 1b duplicate underneath it
// whose `NEXT TASK` still said "BATCH 1c — S6 CI wiring" — a task already
// complete — while `HANDOFF.md` correctly said "BATCH 2". Nothing failed,
// because nothing checked. A rule with no gate is a rule that can be broken
// silently.
//
// WHAT IT PROVES
// --------------
//   1. `PROJECT_STATUS.md` starts with the resume block, and there is exactly
//      ONE such heading (no second, competing resume block).
//   2. The block carries EXACTLY ONE line for each of the ten declared fields,
//      every field is present, every value is non-empty, and no value is a
//      placeholder (`TBD`, `<...>`, `TODO`).
//   3. `HANDOFF.md` carries the same ten fields exactly once, so its mirror
//      cannot silently drop or duplicate one.
//   4. The two files AGREE on the task in `NEXT TASK`: the first batch/stage
//      token named by each must be the SAME token. This is what catches a state
//      file that has drifted a session behind the handoff.
//
//      §REPOINTED (2026-10-08) — NOT weakened. The token vocabulary used to be
//      `BATCH n` / `S n` ONLY. The 2026-10-04 rename (operating-model §2) moved
//      the E2E coverage programme OFF the "Batch" label onto its own label
//      `E2E-n`, so a resume state correctly saying "resume at E2E-2" could NOT
//      satisfy the old regex at all and a session was forced to invent a
//      `BATCH`/`S` token to pass. The regex now accepts `BATCH n`, `S n` AND
//      `E2E-n`, while STILL requiring BOTH files to name the SAME token. The
//      widened vocabulary is proved able to work by the self-check below.
//      §REPOINTED (2026-10-08) — NOT weakened, and the SAME class of breakage as
//      the note above. The order item 3 (E2E coverage) programme COMPLETED at
//      E2E-9, so the next work is named by the plan it lives in
//      (`docs/CLEANUP_AND_VERIFICATION_PLAN_2026-09-30.md` §0b) as "order item 4",
//      whose first open row is "Wave 3 Part 3" — a label the old `BATCH n` / `S n`
//      / `E2E-n` vocabulary could NOT express, so a resume state that is CORRECT
//      would have failed this gate. `WAVE n` is now accepted as a fourth token.
//      The drift check is UNCHANGED in strength: both files must still name the
//      SAME first token, and the negative self-check below still requires a
//      resume state with no token to fail.
//   5. `EXACT NEXT STARTING POINT` in `PROJECT_STATUS.md` names real files — the
//      backticked paths in it must exist on disk. A resume state pointing a new
//      session at a file that does not exist is the same class of defect as the
//      registry row that cited a workflow for months while no workflow existed
//      (found in Batch 1c).
//
// Every mutation-sensitive assertion below was PROVED ABLE TO FAIL (see the
// session report): each mutated file was restored byte-identical.
import { readFileSync, existsSync } from 'node:fs';

let failures = 0;
let checks = 0;
const test = (name, ok, detail) => {
  checks++;
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) {
    failures++;
    if (detail !== undefined) console.log(`      ${String(detail).slice(0, 400)}`);
  }
};

const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
const exists = (p) => existsSync(new URL(p, ROOT));

/** The ten declared fields, in the contract's order. */
const FIELDS = [
  'LAST COMPLETED TASK',
  'CURRENT VERIFIED STATE',
  'CURRENT BRANCH',
  'LAST VERIFIED COMMIT',
  'GITHUB PUSH',
  'DEMO DEPLOYMENT',
  'LIVE VERIFICATION',
  'OUTSTANDING BLOCKER',
  'NEXT TASK',
  'EXACT NEXT STARTING POINT',
];

const status = read('PROJECT_STATUS.md');
const handoff = read('HANDOFF.md');

/** Every line of a file that begins with `FIELD:` (value may be empty). */
const fieldLines = (text, field) =>
  text.split('\n').filter((l) => l.startsWith(`${field}:`));
const fieldValue = (text, field) => {
  const line = fieldLines(text, field)[0];
  return line ? line.slice(field.length + 1).trim() : '';
};

/* ── 1. The block exists, is first, and is singular ───────────────────────── */
const statusLines = status.split('\n');
test(
  'PROJECT_STATUS.md begins with the `# PROJECT_STATUS.md` title',
  statusLines[0].trim() === '# PROJECT_STATUS.md',
  statusLines[0]
);
const headings = statusLines.filter((l) => l.trim() === '## CURRENT RESUME STATE');
test(
  'exactly ONE `## CURRENT RESUME STATE` heading exists (no second, competing resume block)',
  headings.length === 1,
  `found ${headings.length}`
);
const headingIndex = statusLines.findIndex((l) => l.trim() === '## CURRENT RESUME STATE');
test(
  'the resume block is at the TOP of the file (starts within the first 20 lines)',
  headingIndex >= 0 && headingIndex < 20,
  `heading at file line ${headingIndex + 1}`
);
test('the ten declared fields are distinct and ten in number', FIELDS.length === 10 && new Set(FIELDS).size === 10);

/* ── 2. Ten fields, exactly once each, with real values ───────────────────── */
for (const field of FIELDS) {
  const lines = fieldLines(status, field);
  test(`PROJECT_STATUS.md carries exactly one \`${field}\` line`, lines.length === 1, `found ${lines.length}`);
  const value = fieldValue(status, field);
  test(`\`${field}\` has a non-empty value`, value.length > 0, JSON.stringify(value.slice(0, 60)));
  test(
    `\`${field}\` is not a placeholder`,
    !/^<?TBD>?$|^TODO$|^<.*>$|^…$/.test(value),
    JSON.stringify(value.slice(0, 60))
  );
}

/* ── 3. The HANDOFF mirror carries the same ten fields exactly once ───────── */
for (const field of FIELDS) {
  const lines = fieldLines(handoff, field);
  test(`HANDOFF.md mirrors exactly one \`${field}\` line`, lines.length === 1, `found ${lines.length}`);
}

/* ── 4. The two files AGREE on the next task ─────────────────────────────── */
/**
 * The first `BATCH n[a-z]?` / `S<n>` / `E2E-n` / `WAVE n` / `PHASE <letter>`
 * token named by a NEXT TASK line, or ''.
 *
 * §PHASE B (2026-10-13) — REPOINTED, vocabulary widened by ONE alternative.
 * The regex accepted only numeric labels, so a NEXT TASK stated with the current
 * programme's own naming (`PHASE C — …`, the letters the Owner's plan uses for
 * Phases B→G) produced NO token and the mirror check failed even though both
 * documents agreed. The contract is unchanged: a NEXT TASK must still name a
 * recognisable work token, and the self-check below pins every accepted form.
 */
const firstTaskToken = (text) => {
  const value = fieldValue(text, 'NEXT TASK');
  const m = value.match(/\b(?:(?:BATCH|E2E|WAVE|S)\s?-?\d+[a-z]?|PHASE\s?-?[A-Z])\b/i);
  return m ? m[0].toUpperCase().replace(/\s+/g, ' ') : '';
};
const statusToken = firstTaskToken(status);
const handoffToken = firstTaskToken(handoff);
test('PROJECT_STATUS.md names a next task token', statusToken.length > 0, fieldValue(status, 'NEXT TASK').slice(0, 120));
test('HANDOFF.md names a next task token', handoffToken.length > 0, fieldValue(handoff, 'NEXT TASK').slice(0, 120));
test(
  'both files agree on the SAME next task token (the mirror has not drifted a session behind)',
  statusToken !== '' && statusToken === handoffToken,
  `PROJECT_STATUS="${statusToken}" vs HANDOFF="${handoffToken}"`
);
test(
  'the next-task token vocabulary accepts BATCH n, S n, the renamed E2E-n label, the plan WAVE-n label AND the programme PHASE-letter label (self-check)',
  firstTaskToken('NEXT TASK: BATCH 2 — x') === 'BATCH 2' &&
    firstTaskToken('NEXT TASK: S12 — x') === 'S12' &&
    firstTaskToken('NEXT TASK: resume at E2E-2 — x') === 'E2E-2' &&
    firstTaskToken('NEXT TASK: WAVE 3 PART 3 — x') === 'WAVE 3' &&
    /** §PHASE B — the letter vocabulary the Owner's plan uses for Phases B→G. */
    firstTaskToken('NEXT TASK: **PHASE C — the premium UI redesign** (…)') === 'PHASE C' &&
    firstTaskToken('NEXT TASK: PHASE D — x') === 'PHASE D' &&
    /* And a phrase with NO work token still yields nothing — the contract holds. */
    firstTaskToken('NEXT TASK: nothing to see here') === '',
);

/* ── 5. The starting point names real files ──────────────────────────────── */
const startPoint = fieldValue(status, 'EXACT NEXT STARTING POINT');
const backticked = [...startPoint.matchAll(/`([^`]+)`/g)]
  .map((m) => m[1].trim())
  .filter((p) => /^(docs|scripts|src|supabase|e2e)\//.test(p) || /\.(md|json|ts|tsx|mjs|sh|yml)$/.test(p));
test('EXACT NEXT STARTING POINT names at least one file path', backticked.length > 0, startPoint.slice(0, 160));
for (const p of backticked) {
  test(`the cited starting point exists on disk: ${p}`, exists(p));
}

/* ── Verdict ─────────────────────────────────────────────────────────────── */
console.log('');
if (failures > 0) {
  console.log(`RESUME_STATE_VALIDATION_FAILED — ${failures} of ${checks} assertions failed.`);
  process.exit(1);
}
console.log(
  `RESUME_STATE_VALIDATION_PASS — the resume block holds one field set, mirrored and consistent (${checks} assertions).`
);

