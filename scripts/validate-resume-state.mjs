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
import { execSync } from 'node:child_process';

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
  /**
   * §REPOINTED 2026-11-19 — the vocabulary gained its own `INT-n` family.
   * The four-system integration programme is a SEPARATE programme from the design programme
   * (which owns PHASE C→G), so borrowing its numbering would make two programmes share one
   * counter and the resume record ambiguous. This is an EXTENSION, never a weakening: a phrase
   * with no work token still yields '' (see the self-check below), so the contract is unchanged
   * in force and only wider in vocabulary.
   */
  const m = value.match(/\b(?:(?:BATCH|E2E|WAVE|S|INT)\s?-?\d+[a-z]?|PHASE\s?-?[A-Z]\d?)\b/i);
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
    /* §PHASE C — the programme also uses SUB-phase labels (`C2`, `C4`). The
       original letter form required a word boundary straight after the letter, so
       `PHASE C2` produced NO token and the mirror check failed although both
       documents agreed. The sub-phase form is now accepted too. */
    firstTaskToken('NEXT TASK: §PHASE C2 → G — continue') === 'PHASE C2' &&
    firstTaskToken('NEXT TASK: PHASE C4 — primitives') === 'PHASE C4' &&
    /* §REPOINTED 2026-11-19 — the integration programme's own family. */
    firstTaskToken('NEXT TASK: INT-1 — prove Drive write') === 'INT-1' &&
    firstTaskToken('NEXT TASK: **INT 2 — six system pairs**') === 'INT 2' &&
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

/* ── 5b. The mirror agrees BY VALUE, not only by token (session 147) ─────── */
/**
 * WHY THIS EXISTS. On 2026-10-15 (session 146) commit `bb18c3c` rewrote
 * `PROJECT_STATUS.md`'s resume block, touched NOTHING else, and claimed a
 * "HANDOFF mirror" update in its own message. `HANDOFF.md` kept the PREVIOUS
 * session's `LAST VERIFIED COMMIT` (`53cabaa`) and its last-completed task, and
 * THIS gate printed PASS — because assertion 4 above compares only the NEXT-TASK
 * token. A mirror a whole session behind on every other field is exactly what
 * assertion 4 says it exists to catch, so the fix belongs HERE, not in a note
 * (rule 10 §8: gate the whole class, not the instance).
 *
 * WHAT IT PROVES. The two files must name the SAME commit hash in
 * `LAST VERIFIED COMMIT`, and the SAME batch/stage token in
 * `LAST COMPLETED TASK`. A commit hash is the strongest available identity for
 * "the state this record describes", so two files describing two different states
 * can no longer claim to mirror each other.
 *
 * Proved able to fail (session 147): `HANDOFF.md`'s hash reverted to the stale
 * `53cabaa` ⇒ FAIL (1 of 59) → restored byte-identical ⇒ PASS.
 */
console.log('\n§ 5b. HANDOFF mirrors PROJECT_STATUS BY VALUE (commit hash + task token)\n');
const hashesOf = (text) =>
  (fieldValue(text, 'LAST VERIFIED COMMIT').match(/\b[0-9a-f]{7,40}\b/gi) ?? []).map((h) =>
    h.toLowerCase()
  );
const statusHashes = hashesOf(status);
const handoffHashes = hashesOf(handoff);
test(
  'both resume blocks name a LAST VERIFIED COMMIT hash (a check that finds nothing is a FAILURE)',
  statusHashes.length > 0 && handoffHashes.length > 0,
  `PROJECT_STATUS: ${statusHashes.join(',') || 'none'} · HANDOFF: ${handoffHashes.join(',') || 'none'}`
);
test(
  'HANDOFF names the SAME verified commit as PROJECT_STATUS (the mirror is not a session behind)',
  /* The FIRST hash on the line is the headline commit — the checkpoint the record
     describes. An "any shared hash" test was tried first and PROVED TOO WEAK by this
     section's own mutation proof: the line also names the commits it sits over, so a
     stale headline could hide behind a shared ancestor and the check still passed. */
  statusHashes.length > 0 && handoffHashes.length > 0 && statusHashes[0] === handoffHashes[0],
  `PROJECT_STATUS: ${statusHashes.join(',') || 'none'} · HANDOFF: ${handoffHashes.join(',') || 'none'}`
);
const taskTokenOf = (text) => {
  /** §REPOINTED 2026-11-19 — `INT` added to the family, matching `firstTaskToken` above. */
  const m = fieldValue(text, 'LAST COMPLETED TASK').match(
    /\b((?:OPENSHIP\s+)?(?:MAPPING\s+)?BATCH(?:ES)?|WAVE|E2E|S|INT|PHASE)\s?-?(\d+[a-z]?)\b/i
  );
  return m ? `${m[1].toUpperCase().replace(/\s+/g, ' ')} ${m[2].toUpperCase()}` : '';
};
const statusTaskToken = taskTokenOf(status);
const handoffTaskToken = taskTokenOf(handoff);
test(
  'both resume blocks name the SAME last-completed task token',
  statusTaskToken.length > 0 && statusTaskToken === handoffTaskToken,
  `PROJECT_STATUS="${statusTaskToken}" · HANDOFF="${handoffTaskToken}"`
);
test(
  'the last-completed-task token parser is self-checked (a known-good label parses; prose yields nothing)',
  (() => {
    const probe = (v) => {
      const m = v.match(
        /\b((?:OPENSHIP\s+)?(?:MAPPING\s+)?BATCH(?:ES)?|WAVE|E2E|S|INT|PHASE)\s?-?(\d+[a-z]?)\b/i
      );
      return m ? `${m[1].toUpperCase().replace(/\s+/g, ' ')} ${m[2].toUpperCase()}` : '';
    };
    return (
      probe('OPENSHIP MAPPING BATCH 3 (2026-10-15) — x') === 'OPENSHIP MAPPING BATCH 3' &&
      probe('§OPENSHIP BATCH 8 — x') === 'OPENSHIP BATCH 8' &&
      /* §REPOINTED 2026-11-19 — the integration programme's own family, and the
         negative case proving a token-less phrase still yields nothing. */
      probe('INT-1 — Google Drive write capability (2026-11-19)') === 'INT 1' &&
      probe('**INT 3 — six system pairs**') === 'INT 3' &&
      probe('nothing to see here') === ''
    );
  })()
);

/* ── 6. The named commit must be CURRENT, not merely real ─────────────────── */
console.log("\n§ 6. THE NAMED COMMIT IS CURRENT — the drift this gate could not previously see\n");
/**
 * WHY THIS EXISTS (2026-11-19). Four live records named `4965ebf` / `abd8c69` while the real HEAD was
 * `8193b40` — the legacy-styling migration had COMPLETED. Assertions 4 and 5b above could not see it:
 * they prove the two files agree WITH EACH OTHER, and that the named hash is real. Two documents
 * agreeing while both are stale passes such a check. Rule 10 §8: gate the whole class, not the instance.
 *
 * WHAT IT PROVES. The headline hash in `LAST VERIFIED COMMIT` must (a) exist in this repository,
 * (b) be an ancestor of HEAD, and (c) have NO application-runtime change (`src/`, `supabase/`) between
 * it and HEAD — because such a change is exactly what makes the record stale.
 *
 * A commit touching only documentation, rules or scripts does NOT invalidate the record: the record
 * describes the RUNTIME state, and a governance commit does not change it.
 *
 * Proved able to fail (2026-11-19): the named hash was replaced with the genuinely stale `4965ebf`
 * ⇒ FAIL → restored byte-identical ⇒ PASS.
 */
const gitOut = (cmd) => {
  try {
    return execSync(cmd, {
      cwd: new URL("..", import.meta.url),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
};
const namedCommit = statusHashes[0] ?? "";
const headCommit = gitOut("git rev-parse HEAD");
if (headCommit === null) {
  console.log("      SKIP — not a git checkout, so the ancestry check cannot run (stated, not silently passed).");
} else {
  const existsInRepo = gitOut(`git cat-file -e ${namedCommit}^{commit}`) !== null;
  test(`the named LAST VERIFIED COMMIT ${namedCommit} exists in this repository`, existsInRepo, namedCommit);
  const isAncestor = existsInRepo && gitOut(`git merge-base --is-ancestor ${namedCommit} ${headCommit}`) !== null;
  test(
    `the named commit is an ancestor of HEAD (${headCommit.slice(0, 7)})`,
    isAncestor,
    `${namedCommit} vs ${headCommit.slice(0, 7)}`
  );
  if (isAncestor) {
    const runtimeAfter = gitOut(`git rev-list ${namedCommit}..${headCommit} -- src supabase`) ?? "";
    test(
      "no APPLICATION-RUNTIME change (src/, supabase/) after the named commit — the record describes the newest runtime state",
      runtimeAfter === "",
      runtimeAfter === "" ? "none" : `${runtimeAfter.split("\n").length} commit(s) after the record`
    );
  }
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

