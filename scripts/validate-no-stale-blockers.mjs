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
//
// §BATCH 8 = Part 6 (2026-10-11) — SECTIONS 6-8 ADDED: the merged 2026-10-10 programme was closed out
// that session, and closing it exposed three stale statements (two registry citations still claiming
// only Part 6 remained, and one PROJECT_STATUS heading that had lost its SUPERSEDED marker). Sections
// 6-8 pin the corrected state, so the close-out cannot silently un-complete itself: the plan of record
// must still read COMPLETE, the registry must still carry `programme_2026_10_10_closeout`, and the
// resume block must not point back at the finished batch. Each assertion was mutation-proved.
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

/**
 * §RATE-LIMIT (2026-10-05) — two MORE stale records in the single plan, fixed at
 * source that session. Its order-item 2 was marked **NOT STARTED** and its text
 * named two pieces of "remaining" work that did not exist: "the two regressed
 * rows" (the registry holds ZERO `regressed` rows — both were removed 2026-10-04)
 * and "the tooling items" (no such list exists anywhere). The assertions below
 * pin the CORRECTED state, so the stale claims cannot return as live claims.
 */
test(
  'the single plan no longer marks the remaining BUILD BACKLOG as NOT STARTED',
  !/remaining BUILD BACKLOG[^\n]*NOT STARTED/i.test(plan)
);
test('the single plan records the §RATE-LIMIT increment', /RATE LIMITER/i.test(plan));
const registry = JSON.parse(read('requirements-registry.json'));
const regressedRows = (registry.entries ?? []).filter((e) => e.status === 'regressed');
test(
  'the registry holds ZERO regressed rows (the old "two regressed rows" claim is provably false)',
  regressedRows.length === 0
);

/* 5. HANDOFF's old NEXT PLAN section is marked historical (not a live resume point) */
test(
  "HANDOFF's old NEXT PLAN section is marked SUPERSEDED",
  /NEXT PLAN — BATCHES 1, 2 and 3[^\n]*SUPERSEDED/.test(read('HANDOFF.md'))
);

/**
 * §BATCH 8 = Part 6 (2026-10-11) — THE PROGRAMME'S CLOSE-OUT CANNOT UN-COMPLETE ITSELF.
 *
 * WHY THIS EXISTS. The merged 2026-10-10 programme was closed out this session, and closing it
 * exposed THREE stale statements that had to be fixed at source (`.clinerules/defect-remediation.md`,
 * global rule 07): TWO registry citations that still said "Only BATCH 8 = Part 6 (the close-out)
 * remains" although the plan they cite is complete, and ONE `PROJECT_STATUS.md` section heading that
 * had lost the SUPERSEDED marker every sibling section carries — so a reader could take a finished
 * batch's "NEXT EXECUTION SCOPE" as the live one.
 *
 * A close-out is exactly the kind of record a later session silently reverts (the plan gets re-marked
 * "REMAINING", the resume block points back at finished work, the registry re-adds the stale claim),
 * so the corrected state is PINNED here rather than merely written. This gate is already swept by
 * `npm run validate:all` (it globs every `scripts/validate-*.mjs`), so no hand-list had to change.
 * Every assertion below was proved able to fail (mutated, observed failing, restored byte-identical).
 */

/* 6. the plan of record still says the programme is COMPLETE, and claims nothing remains */
const planOfRecord = read('docs/NEXT_BUILD_PLAN_2026-10-10.md');
test(
  'the 2026-10-10 plan of record still states the WHOLE PROGRAMME is COMPLETE',
  /THE WHOLE PROGRAMME IS COMPLETE/.test(planOfRecord)
);
test(
  'the plan of record no longer claims ONLY PART 6 (the close-out) remains',
  !/ONLY PART 6/.test(planOfRecord)
);
test(
  'the plan of record marks PART 6 — CLOSE-OUT as DONE',
  /## PART 6 — CLOSE-OUT \(mandatory\) — ✅ \*\*DONE/.test(planOfRecord)
);
test('the plan of record states that nothing in it remains', /NOTHING IN THIS PLAN REMAINS/.test(planOfRecord));

/* 7. the registry carries the programme close-out record, and the stale claim is gone */
const registryJson = read('requirements-registry.json');
test(
  'the registry no longer says "Only BATCH 8 = Part 6 (the close-out) remains"',
  !/Only BATCH 8 = Part 6 \(the close-out\) remains/.test(registryJson)
);
test('the registry carries the 2026-10-10 programme close-out record', /"programme_2026_10_10_closeout"/.test(registryJson));
test(
  'that programme record states the programme is COMPLETE',
  /"status": "COMPLETE — nothing in the plan remains/.test(registryJson)
);

/* 8. the resume block does NOT still name the FINISHED batch as the next task */
const resumeNow = read('PROJECT_STATUS.md');
const resumeStartNow = resumeNow.indexOf('## CURRENT RESUME STATE');
const resumeEndNow = resumeNow.indexOf('\n## ', resumeStartNow + 3);
const resumeBlockNow = resumeStartNow >= 0 && resumeEndNow > resumeStartNow ? resumeNow.slice(resumeStartNow, resumeEndNow) : '';
test('the resume block was read for the close-out check', resumeBlockNow.length > 200);
test(
  'the resume block does NOT still name the finished BATCH 8 = Part 6 as the NEXT TASK',
  !/NEXT TASK:[^\n]*BATCH 8 = Part 6/.test(resumeBlockNow)
);
test(
  'the resume block names the work that FOLLOWS the programme (WAVE 3 PART 6)',
  /NEXT TASK:[^\n]*WAVE 3 PART 6/.test(resumeBlockNow)
);
/**
 * §9 — THE PICTURE-COMPARISON JOB'S PREMISE, CORRECTED (2026-10-11, rule 07).
 *
 * The first thing the owner asked about the next job was the plainest one: "a photo of what?".
 * Answering it exposed a FOURTH stale statement — the registry row for `uiux-wave3-visual-regression-gate`
 * (and the reconcile script that generates it, and finding D-4 in the gap analysis) all claimed
 * "screenshots are captured and committed" and "the baseline PNGs are already committed". That was
 * true on 2026-09-20 and became FALSE on 2026-09-21, when the clean-slate reconciliation put
 * `test-screenshots/` on the never-tracked list. Measured: 224 pictures on disk, 0 kept.
 *
 * Left unchecked, the next session would hunt for baselines that do not exist. These assertions pin the
 * corrected premise AND the reason it must stay true: the folder is deliberately untracked, so the
 * missing work is capture-and-keep PLUS the policy decision — never just the policy decision.
 */
const gitignoreText = read('.gitignore');
test(
  'the picture folder test-screenshots/ is STILL deliberately never-tracked (the corrected premise)',
  /^test-screenshots\/$/m.test(gitignoreText)
);
const regressionRow = (JSON.parse(registryJson).entries || []).find((e) => e.id === 'uiux-wave3-visual-regression-gate');
test('the registry still carries the picture-comparison row', Boolean(regressionRow));
const rowText = JSON.stringify(regressionRow || {});
const rowDescription = (regressionRow || {}).description || '';
/**
 * §FIXED MY OWN FIRST TWO ATTEMPTS (2026-10-11) — recorded because both were real defects in the gate.
 *  (1) The first version tested the RAW text and therefore flagged the correction itself, which QUOTES the
 *      old wording on purpose (history is never destroyed). That was a false alarm, not a stale claim.
 *  (2) The second version stripped whole lines carrying `REPOINTED` — which cannot work for a row that is
 *      ONE long JSON line, so the strip removed everything and the assertion could not fail any more.
 *      A mutant (re-inserting the stale claim with no marker at all) PASSED, which is exactly how a
 *      cannot-fail assertion is caught. The rule now used is precise: the stale wording may appear only
 *      AFTER the `§REPOINTED` marker; anything before it is a live claim and fails.
 */
const livePart = (text) => text.split('§REPOINTED')[0];
test(
  'the row description makes the stale claim ONLY after its §REPOINTED marker',
  !/baseline PNGs are already committed|screenshots are captured and committed/i.test(livePart(rowDescription))
);
test(
  'the row description records the old wording as a dated §REPOINTED correction',
  /§REPOINTED 2026-10-11/.test(rowDescription)
);
test(
  'that row states the pictures are NOT kept, so no baseline set exists in the project',
  /NEVER-TRACKED list/.test(rowText) && /NONE of them is kept in the project/.test(rowText)
);
const gapAnalysisText = read('docs/UNIFIED_PLATFORM_GAP_ANALYSIS_2026-09-20.md');
test(
  'finding D-4 carries the 2026-10-11 REPOINTED correction (history kept, stale claim not left live)',
  /§REPOINTED \(2026-10-11, rule 07\) — the D-4 row above is STALE/.test(gapAnalysisText)
);
test(
  'that correction states no baseline set lives in the repository',
  /no baseline set lives in the repository/.test(gapAnalysisText)
);
const reconcileScriptText = read('scripts/reconcile-uiux-wave3-registry.cjs');
/** The script line that GENERATES the picture-comparison row's description. */
const scriptDescLine =
  reconcileScriptText.split('\n').find((l) => /pixel-(diff|comparison)|baseline PNGs/.test(l)) || '';
test(
  'the script that GENERATES that row was found, and carries the same correction',
  scriptDescLine.length > 0 && /NEVER-TRACKED list/.test(scriptDescLine)
);
test(
  'the generating script makes the stale claim ONLY after its §REPOINTED marker (so re-running it cannot restore the lie)',
  !/baseline PNGs are already committed|screenshots are captured and committed/i.test(livePart(scriptDescLine))
);




console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.error(`✗ ${failures} stale-blocker check(s) FAILED`);
  process.exit(1);
}
console.log('✓ no stale blockers and no stale records (credentials never block the build)');
