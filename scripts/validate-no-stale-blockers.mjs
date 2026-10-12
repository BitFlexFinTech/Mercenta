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
import { readFileSync, readdirSync, existsSync } from 'node:fs';

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
/**
 * §REPOINTED 2026-10-12 (rule 08 §2 — an assertion about a REMOVED thing becomes an ABSENCE GUARD: never deleted,
 * never weakened). This assertion used to REQUIRE the resume block to name `WAVE 3 PART 6` (the visual-regression
 * gate) as the work that follows the programme. That item was CLOSED BY THE OWNER on 2026-10-12 — "i still have no
 * idea what this picture thing is man … i just want you to complete the build" — so the assertion that pinned it
 * now pins its ABSENCE: the resume block must name the CURRENT work (BATCH 10 — finishing the build) and must
 * record the closed item as CLOSED, never present it as the next task.
 */
/**
 * §REPOINTED (2026-10-12, rules 07/09 — NOT weakened). This assertion used to pin
 * the literal label `BATCH 10`. That label is a SESSION-LOCAL name for the current
 * programme, and it moved to `BATCH 11` on 2026-10-12 when the two remaining UX
 * decisions were built — so a literal label fails the gate for a reason that has
 * nothing to do with staleness (exactly the hand-maintained-literal trap of rule
 * 09 §4). It now pins the STABLE intent this check is named for: the resume block
 * names the work that FOLLOWS the plan — the FINISHING-THE-BUILD work. The batch
 * token itself stays gated by `validate-resume-state` (a token must exist, and the
 * two state files must agree on it).
 */
/**
 * §REPOINTED (2026-10-13, §BATCH 12, rules 07/09 — NOT weakened). This assertion used to
 * pin the literal `FINISHING THE BUILD`, and the sibling below pinned `CLOSED, NOT PENDING`.
 * BOTH were SESSION-LOCAL labels for a stage that has since ENDED: on 2026-10-13 the build
 * work genuinely finished (the WhatsApp/Twilio feature — the last build item — was removed),
 * so `FINISHING THE BUILD` is no longer the truth and pinning it would FORCE a false
 * statement into the resume block. That is exactly the hand-maintained-literal trap of rule
 * 09 §4, which this validator's own §REPOINTED note above already recognises.
 *
 * The check now pins the STABLE intent it is named for: the resume block must NAME the work
 * that follows the programme — which is now the OWNER'S remaining items (the `not_started`
 * decisions + the `phase15-*` launch prerequisites) and explicitly NOT build work. The
 * closed picture-comparison half is kept, and made STRONGER: it is an ABSENCE guard in the
 * resume block PLUS a positive pin on the registry row's CLOSED state (`deferred`), so the
 * item can neither re-appear as next work nor silently change status.
 */
test(
  'the resume block names the work that FOLLOWS the programme (the Owner’s remaining items, not build work)',
  /NEXT TASK:[^\n]*NOT BUILD WORK/.test(resumeBlockNow) &&
    /NEXT TASK:[^\n]*(OWNER|DECISION|prerequisite)/i.test(resumeBlockNow)
);
test(
  'the closed picture-comparison check is NOT presented as the next work (absence guard) and its registry row stays CLOSED',
  !/NEXT TASK:[^\n]*WAVE 3 PART 6/.test(resumeBlockNow) &&
    !/NEXT TASK:[^\n]*picture-comparison/i.test(resumeBlockNow) &&
    (() => {
      try {
        const reg = JSON.parse(read('requirements-registry.json'));
        const row = (reg.entries || []).find((e) => e.id === 'uiux-wave3-visual-regression-gate');
        return !!row && row.status === 'deferred';
      } catch {
        return false;
      }
    })()
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
/**
 * §CLOSED 2026-10-12 — THE OWNER'S CLOSURE OF THE PICTURE-CHECK, PINNED.
 *
 * The owner closed this item in his own words ("i still have no idea what this picture thing is man … i just
 * want you to complete the build"). Recording that in the registry ALONE would be a hope, not a fact: a later
 * session could quietly re-open it and put the same question to him AGAIN — which is exactly the drift rule 10
 * exists to stop. So the closure is pinned here, AND in the script that REGENERATES the row, so a re-run cannot
 * reopen it either. Both assertions were proved able to fail.
 */
test(
  "the row records the OWNER'S CLOSURE (2026-10-12): not part of the build, question withdrawn, never raised again",
  /§CLOSED 2026-10-12 BY THE OWNER/.test(rowText) &&
    /NOT PART OF THE BUILD/.test(rowText) &&
    /NO SESSION MAY RAISE IT WITH THE OWNER AGAIN/.test(rowText)
);
test(
  `the picture row is DEFERRED, not outstanding work (status: ${(regressionRow || {}).status || 'MISSING'})`,
  Boolean(regressionRow) && regressionRow.status === 'deferred'
);
const reconcileGenLines = read('scripts/reconcile-uiux-wave3-registry.cjs').split('\n');
const genClosureIdx = reconcileGenLines.findIndex((l) => /§CLOSED 2026-10-12 BY THE OWNER/.test(l));
test(
  'the script that REGENERATES the row makes it deferred at once, so a re-run cannot reopen it',
  genClosureIdx !== -1 && (reconcileGenLines[genClosureIdx + 1] || '').trim() === "'deferred',"
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




/**
 * §10 — THE CARRIER-USER CLAIM, PINNED (2026-10-11, rule 07).
 *
 * An owner-facing report described a screenshot as "the page a carrier sees first". The owner challenged it:
 * carriers do not connect to Mercenta — Mercenta calls the carriers' APIs. **The owner was right and the
 * project was already right**: the whole 3PL carrier surface was REMOVED on 2026-09-23 (§P9, programme
 * decision 4 / Founder decision T-2 — "no external carrier users/logins"), `rbac.ts` and `types.ts` say so
 * inline, and `validate-conversion-gate` asserts the files' absence. What had NOT been updated was FOUR
 * documents that still described the carrier branch as live, plus a leftover picture of the deleted screen
 * sitting in the throwaway folder — which is precisely what the report misread. The corrections are pinned
 * here so the claim cannot come back, and the shell list is DISCOVERED from disk (rule 09), never retyped.
 */
const layoutFiles = readdirSync(new URL('src/components/layout/', ROOT))
  .filter((f) => f.endsWith('Shell.tsx'))
  .sort();
test(
  `the shells on disk are exactly the four that exist — no carrier shell (found: ${layoutFiles.join(', ')})`,
  layoutFiles.join(',') === 'AdminShell.tsx,AppShell.tsx,BrandShell.tsx,HomeShell.tsx'
);
const archText = read('docs/ARCHITECTURE.md');
/* The `AppShell` wrapper is deliberately NOT a route branch, so the routing tree omits it — that is a
   discovered exclusion (the file ends in `Shell.tsx` but is not one of the `environment` branches), not a
   hand-written excuse. Every OTHER shell must be named. */
for (const shell of layoutFiles.filter((f) => f !== 'AppShell.tsx')) {
  // The document names shells by component ("HomeShell"), not by file ("HomeShell.tsx") — assert the name.
  test(`ARCHITECTURE.md names the shell that exists on disk: ${shell}`, archText.includes(shell.replace(/\.tsx$/, '')));
}
test(
  'ARCHITECTURE.md carries the carrier-removal §REPOINTED note',
  /§REPOINTED \(2026-10-11, rule 07\) — THERE IS NO CARRIER BRANCH/.test(archText)
);
test(
  'ARCHITECTURE.md no longer presents a carrier branch as a live route',
  !/─+\s*carrier\s*→/.test(archText.replace(/^>.*$/gm, ''))
);
test(
  'src/types.ts offers exactly home/login/brand/admin — the carrier environment is gone',
  /export type Environment = 'home' \| 'login' \| 'brand' \| 'admin';/.test(read('src/types.ts'))
);
test(
  'rbac.ts states the fact where every session reads it: a carrier never logs into Mercenta',
  /a carrier never logs into Mercenta/.test(read('src/lib/auth/rbac.ts'))
);
test(
  'the gap analysis carries the D-8 carrier correction too (not only the D-4 one)',
  /§REPOINTED \(2026-10-11, rule 07\) — the D-8 row above is ALSO STALE/.test(read('docs/UNIFIED_PLATFORM_GAP_ANALYSIS_2026-09-20.md'))
);
test(
  'the runtime-parity plan warns that its carrier-terminal sections are history',
  /EVERY CARRIER-USER REFERENCE BELOW IS HISTORICAL/.test(read('docs/RUNTIME_PARITY_PLAN_2026-09-21.md'))
);
test(
  'MERCENTA_MASTER_CONTEXT.md warns that the carrier portal it lists does not exist',
  /THE CARRIER PORTAL BELOW DOES NOT EXIST/.test(read('MERCENTA_MASTER_CONTEXT.md'))
);
const verifyRegistryText = read('scripts/verify-registry.mjs');
test(
  'verify-registry no longer treats the retired CARRIER_NAV as a live source, and self-checks its lookup',
  !/ADMIN_NAV\|BRAND_NAV\|CARRIER_NAV/.test(verifyRegistryText) &&
    /the reachability lookup discovered ZERO nav ids/.test(verifyRegistryText)
);


/**
 * §11 — DESCRIBERS MATCH REALITY, THE CLASS-WIDE VERSION (2026-10-11).
 *
 * Global rule `10-describers-must-match-reality.md` demands that a project CHECK its describers against reality
 * instead of trusting them. Sections 9–10 pinned two known drift classes by hand; this section does the general
 * job from the registry itself: **every file the matrix says was DELETED must actually be absent.**
 *
 * The paths are DISCOVERED from the registry (two conventions the project already uses — a path marked
 * `(DELETED)`, and a `Deleted: a; b; c` list). Two things are asserted that most checks get wrong:
 *   · the extraction must not silently truncate (`MercentaSocial.tsx` must not be read as `.ts`, which would
 *     "pass" because that path never exists — the exact cannot-fail bug found while writing this);
 *   · the discovery must not come back EMPTY — rule 10 §5: a check that finds nothing is a FAILURE, not a pass.
 * Mutation-proved twice (re-create a deleted file ⇒ FAIL; break the `(DELETED)` convention ⇒ the vacuity guard
 * FAILS), every file restored byte-identical.
 */
const removedRows = (JSON.parse(registryJson).entries || []).filter((e) => e.status === 'removed');
const claimedDeleted = new Map();
for (const e of removedRows) {
  const text = (e.description || '') + ' ' + (e.evidence || '');
  for (const m of text.matchAll(/(src\/[\w./-]+\.(?:tsx|ts|css)\b)\s*\(DELETED/gi)) claimedDeleted.set(m[1], e.id);
  for (const m of text.matchAll(/Deleted:([\s\S]*?)(?=\.\s+[A-Z]|$)/gi)) {
    for (const p of m[1].matchAll(/(src\/[\w./-]+\.(?:tsx|ts|css)\b)/g)) claimedDeleted.set(p[1], e.id);
  }
}
test(
  `the registry's removed rows were found (${removedRows.length})`,
  removedRows.length > 20
);
test(
  `the DELETED-file discovery is not vacuous — it found ${claimedDeleted.size} claimed-deleted paths (a check that finds nothing is a FAILURE)`,
  claimedDeleted.size >= 5
);
const survivors = [...claimedDeleted.entries()].filter(([p]) => existsSync(new URL(p, ROOT)));
test(
  `every file the matrix says was DELETED is actually absent (${claimedDeleted.size} checked)`,
  survivors.length === 0,
  survivors.map(([p, id]) => `${p} (row ${id})`).join(', ')
);
test(
  'the deleted-path extraction keeps real extensions (no `.tsx` silently truncated to `.ts`)',
  [...claimedDeleted.keys()].every((p) => /\.(tsx|ts|css)$/.test(p))
);


/**
 * §12 — NO `not_started` ROW WITHOUT A DISPOSITION, AND NO RESUME BLOCK PROMISING
 * BUILD WORK THAT DOES NOT EXIST (2026-10-12, rule 10 §8 — the CLASS, not the instance).
 *
 * THE DEFECT THIS PINS. The resume block's `NEXT TASK` told the next session to close
 * "the remaining code-only `not_started` rows". The trouble is that a `not_started`
 * STATUS records only that a row is not done — never WHY. So a session opening the
 * registry saw eight `not_started` rows and could not tell which (if any) was ordinary
 * build work. In fact NONE of the eight is buildable: seven wait on an Owner decision
 * and one is a record of decisions already taken. The block promised build work that
 * does not exist — exactly the drift rule `10-describers-must-match-reality.md` forbids,
 * and the kind that costs the Owner a session each time it is believed.
 *
 * THE FIX, AT ITS SOURCE. Every `not_started` row now carries a `_disposition` whose
 * tag names its class (`BUILD` · `OWNER DECISION` · `EXTERNAL INPUT` · `RECORD`), so
 * the reason lives WITH the row rather than in a session's memory. This section:
 *   · DISCOVERS the rows from the registry (never a retyped list);
 *   · refuses a VACUOUS discovery (rule 10 §5 — a check that finds nothing FAILS);
 *   · requires a valid, tagged `_disposition` on every `not_started` row;
 *   · ties `_meta.status_counts.not_started` to the rows, because that snapshot has
 *     silently gone stale twice before and nothing checked it;
 *   · and carries an ABSENCE GUARD (rule 08 §2) for the retired claim string, so the
 *     stale promise cannot be typed back in.
 * Mutation-proved: deleting one `_disposition`, and re-inserting the retired claim,
 * each produced a FAILURE; both files were then restored byte-identical.
 */
const notStartedRows = (registry.entries || []).filter((e) => e.status === 'not_started');
const DISPOSITION_TAGS = ['BUILD', 'OWNER DECISION', 'EXTERNAL INPUT', 'RECORD'];
const dispositionTag = (row) => {
  const m = /^(BUILD|OWNER DECISION|EXTERNAL INPUT|RECORD)\b/.exec(((row && row._disposition) || '').trim());
  return m ? m[1] : '';
};
test(
  `the not_started rows were discovered from the registry (${notStartedRows.length}) — a check that finds nothing is a FAILURE`,
  notStartedRows.length > 0
);
const missingDisposition = notStartedRows.filter((e) => !((e._disposition || '').trim()));
test(
  `every not_started row declares WHY it is not started, via a _disposition (${notStartedRows.length - missingDisposition.length}/${notStartedRows.length})`,
  missingDisposition.length === 0
);
const unknownTag = notStartedRows.filter((e) => !DISPOSITION_TAGS.includes(dispositionTag(e)));
test(
  `every _disposition starts with a declared tag (${DISPOSITION_TAGS.join(' · ')})`,
  unknownTag.length === 0
);
test(
  `_meta.status_counts.not_started (${(registry._meta || {}).status_counts ? registry._meta.status_counts.not_started : 'absent'}) equals the discovered count (${notStartedRows.length})`,
  !!registry._meta && !!registry._meta.status_counts && registry._meta.status_counts.not_started === notStartedRows.length
);
test(
  'the disposition-tag parser is self-checked (a known-good tag is read; an untagged value is not)',
  dispositionTag({ _disposition: 'BUILD · x' }) === 'BUILD' &&
    dispositionTag({ _disposition: 'OWNER DECISION · x' }) === 'OWNER DECISION' &&
    dispositionTag({ _disposition: 'EXTERNAL INPUT · x' }) === 'EXTERNAL INPUT' &&
    dispositionTag({ _disposition: 'RECORD · x' }) === 'RECORD' &&
    dispositionTag({ _disposition: 'not started yet' }) === '' &&
    dispositionTag({}) === ''
);
test(
  'the resume block no longer promises a code-only not_started scope (ABSENCE GUARD for the retired claim)',
  !/the remaining code-only/i.test(resume)
);

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.error(`✗ ${failures} stale-blocker check(s) FAILED`);
  process.exit(1);
}
console.log('✓ no stale blockers and no stale records (credentials never block the build)');
