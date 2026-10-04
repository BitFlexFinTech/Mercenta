// §2026-10-04 — NO STALE BLOCKERS, NO STALE RECORDS.
//
// WHY THIS EXISTS
// ---------------
// The Founder reported two real defects, both fixed at source on 2026-10-04:
//   (1) sessions kept ASKING HIM FOR AMAZON CREDENTIALS and listing them as a "founder action",
//       even though the standing rule is that credentials are an ACTIVATION step and never a build
//       blocker. The state files framed them as blockers, so every session repeated the ask.
//   (2) STALE RECORDS: PRODUCTION_READINESS.md still said "P9–P12 are NOT STARTED" (the programme is
//       complete) and described an `api.ts` "TODO" that does not exist; the single plan still said
//       "Part 2b — REMAINING" (part 2b is DONE); HANDOFF.md's old NEXT PLAN section read as current.
//
// A defect found is fixed at source with a gate that can fail (`.clinerules/defect-remediation.md`,
// global rule `07-fix-defects-at-source.md`). This is that gate: it asserts the standing decision is
// WRITTEN where every session reads it, and that the specific stale claims are GONE — so their return
// fails the build.
import { readFileSync } from 'node:fs';

let failures = 0;
let checks = 0;
const test = (name, ok) => {
  checks++;
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failures++;
};

const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');

/**
 * The project records an old, superseded claim inline as a `§date — REPOINTED` note
 * (history is never destroyed). A stale phrase therefore still EXISTS as a QUOTATION;
 * only a LIVE claim matters. Strip the lines that carry a REPOINTED note before testing.
 */
const stripRepointed = (s) => s.split('\n').filter((line) => !/REPOINTED/.test(line)).join('\n');

/* 1. the STANDING DECISION is written in the rule every session reads first */
const rule = read('.clinerules/mercenta-business-model.md');
test(
  'the rule states credentials are pending, never a build blocker, and never asked for',
  /never a build blocker/i.test(rule) && /Never ask the Founder for credentials/i.test(rule)
);

/* 2. the resume block carries the same standing decision, so no session repeats the ask */
const status = read('PROJECT_STATUS.md');
const resumeStart = status.indexOf('## CURRENT RESUME STATE');
const resumeEnd = status.indexOf('\n## ', resumeStart + 3);
const resume = resumeStart >= 0 && resumeEnd > resumeStart ? status.slice(resumeStart, resumeEnd) : '';
test('the resume block exists and was read', resume.length > 200);
test('the resume block states the credentials are NEVER a build blocker', /never a build blocker/i.test(resume));
test(
  'the resume block no longer lists the vendor codes as a BLOCKED founder action',
  !/BLOCKED on the owner confirming with Amazon/i.test(resume)
);

/* 3. HANDOFF mirrors the standing decision */
test('HANDOFF mirrors the standing decision', /never a build blocker/i.test(read('HANDOFF.md')));

/* 4. the stale records are GONE (their return fails this gate) */
const pr = stripRepointed(read('PRODUCTION_READINESS.md'));
test('PRODUCTION_READINESS no longer claims "P9-P12 are NOT STARTED"', !/P9.{0,3}P12 are NOT STARTED/.test(pr));
test('PRODUCTION_READINESS no longer claims an api.ts "TODO" call site', !/marked TODO at that call site/.test(pr));
const plan = stripRepointed(read('docs/CLEANUP_AND_VERIFICATION_PLAN_2026-09-30.md'));
test('the single plan no longer says "Part 2b - REMAINING"', !/Part 2b.{0,3}REMAINING/.test(plan));
test('the single plan records Part 2b as DONE', /Part 2b.{0,3}DONE/.test(plan));

/* 5. HANDOFF's old NEXT PLAN section is marked historical (not a live resume point) */
test(
  "HANDOFF's old NEXT PLAN section is marked SUPERSEDED",
  /NEXT PLAN — BATCHES 1, 2 and 3[^\n]*SUPERSEDED/.test(read('HANDOFF.md'))
);

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.error(`✗ ${failures} stale-blocker check(s) FAILED`);
  process.exit(1);
}
console.log('✓ no stale blockers and no stale records (credentials never block the build)');
