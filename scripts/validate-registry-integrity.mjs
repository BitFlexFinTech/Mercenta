#!/usr/bin/env node
/**
 * §REGISTRY INTEGRITY — the Master Matrix's own arithmetic, gated.
 *
 * WHY THIS EXISTS
 * ---------------
 * `requirements-registry.json` is the granular source of truth the other four
 * project-state sources are projections of. Its `_meta.total_entries` has
 * DRIFTED from the real `entries.length` across sessions (505 -> 506 -> 507, each
 * corrected by hand), and until now NOTHING checked it: a session could add a row,
 * forget the count, and every gate would still pass while the matrix quietly
 * misreported its own size. Two sessions in a row found and fixed that by hand.
 *
 * WHAT IT ASSERTS (deliberately small, deterministic, no false positives —
 * every assertion below is TRUE of the repository as committed):
 *   1. the file parses as JSON;
 *   2. `_meta.total_entries` EQUALS the real number of entries;
 *   3. every entry id is a non-empty string and no id is duplicated (a duplicate
 *      makes the matrix ambiguous for both a human and R6's cross-referencing);
 *   4. `_meta.status_enum` is non-empty and holds no duplicates.
 *
 * WHAT IT DELIBERATELY DOES NOT assert (recorded as outstanding work, because a
 * failing gate must never be introduced as "progress"): rows missing at least one of
 * {description, source, evidence, last_verified} need a DECISION about the matrix's
 * vocabulary before a COMPLETENESS gate can be written.
 *
 * §CORRECTED 2026-11-28 (BATCH 5 PART 4) — THE FIGURE THAT USED TO BE HERE WAS WRONG. It read
 * "32 rows are missing at least one of {description, source, evidence, last_verified}". Measured
 * over the committed registry with exactly that definition it is **52**, not 32 — a false number
 * in a live comment, which is the defect. Rather than restate a figure a reader cannot check, the
 * debt is now a CEILING this gate asserts (the final assertion below), so it can only ever shrink
 * and cannot drift in silence again.
 *
 * §CORRECTED 2026-11-27 — A FALSE CLAIM REMOVED. This comment also read "3 rows carry a
 * status outside the declared enum (`removed`, `removed`, `complete`)". Both of those
 * statuses ARE declared in `_meta.status_enum`, and the registry actually holds **35
 * `removed` + 2 `complete`** rows, not three — so the sentence was wrong twice over. It
 * was removed rather than restated, because a reader cannot check a per-row claim from a
 * comment; the per-status counts are asserted from the entries themselves by this gate's
 * sibling `scripts/validate-no-stale-blockers.mjs`. The same false sentence appeared in
 * the registry's own row for this check and was corrected in the same change.
 *
 * §CORRECTED 2026-11-28 (BATCH 5 PART 5) — THAT LAST SENTENCE WAS ITSELF WRONG, AND IS NOW TRUE.
 * It claimed the sibling asserted "the per-status counts"; `scripts/validate-no-stale-blockers.mjs`
 * asserts ONLY `_meta.status_counts.not_started` (its section 7), so `built_and_tested`, `built`,
 * `deferred`, `removed`, `blocked` and `complete` were UNCHECKED — and `built_and_tested` had drifted
 * to 347 while the entries held 348 (the declared counts summed to 595 against a `total_entries` of
 * 596). The claim is corrected here AND made true: the assertion below now compares EVERY declared
 * per-status count against the entries, so the sibling's narrower check is no longer the only one.
 */
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'requirements-registry.json');

let pass = 0;
let fail = 0;
const errors = [];
function check(name, ok) {
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; errors.push(name); console.log(`  FAIL  ${name}`); }
}

let registry = null;
try {
  registry = JSON.parse(readFileSync(FILE, 'utf8'));
  check('the registry parses as JSON', true);
} catch (e) {
  check(`the registry parses as JSON (${e.message})`, false);
}

if (registry) {
  const entries = registry.entries;
  const meta = registry._meta || {};
  const ids = entries.map((e) => e.id);

  check('the registry has an entries array', Array.isArray(entries));
  check(
    `_meta.total_entries (${meta.total_entries}) equals the real entry count (${entries.length})`,
    meta.total_entries === entries.length
  );
  check('every entry id is a non-empty string', ids.every((id) => typeof id === 'string' && id.length > 0));
  check('no entry id is duplicated', new Set(ids).size === ids.length);
  check('_meta.status_enum is a non-empty array', Array.isArray(meta.status_enum) && meta.status_enum.length > 0);
  check(
    '_meta.status_enum holds no duplicates',
    Array.isArray(meta.status_enum) && new Set(meta.status_enum).size === meta.status_enum.length
  );

  /**
   * §2026-11-28 (BATCH 5 PART 4) — THE DEBT IS A CEILING, NOT A SENTENCE IN A COMMENT.
   *
   * The header used to state a figure ("32 rows") that a reader could not check and that was
   * simply wrong (measured: 52). A number in a comment drifts; a number a gate asserts cannot.
   * The debt may only SHRINK — raising the ceiling is a recorded decision, not an edit.
   */
  const incomplete = entries.filter(
    (e) => !e.description || !e.source || !e.evidence || !e.last_verified
  );
  check(
    `no more than 52 rows lack one of {description, source, evidence, last_verified} — measured ${incomplete.length} (the debt may only shrink)`,
    incomplete.length <= 52
  );

  /**
   * §2026-11-28 (BATCH 5 PART 5) — THE PER-STATUS SNAPSHOT IS ASSERTED, NOT TRUSTED.
   *
   * Measured when this was added: the declared `_meta.status_counts.built_and_tested` read 347 while the
   * entries themselves held 348, so the seven declared counts summed to 595 against a `total_entries` of
   * 596 — and nothing caught it (this gate asserted only `total_entries`; its sibling asserted only
   * `not_started`). A hand-maintained figure drifts; one a gate compares against the owner cannot. Every
   * declared count must EQUAL the count computed from the entries, and the counts must sum to the real
   * total — so the snapshot can never disagree with the matrix again.
   */
  const actualCounts = entries.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1;
    return acc;
  }, {});
  const declaredCounts = meta.status_counts || {};
  const declaredKeys = Object.keys(declaredCounts).filter((k) => k !== '_note');
  const driftedCounts = declaredKeys.filter((k) => declaredCounts[k] !== (actualCounts[k] || 0));
  check(
    `every declared per-status count equals the entries themselves (${declaredKeys
      .map((k) => `${k}=${declaredCounts[k]}`)
      .join(' · ')})`,
    declaredKeys.length > 0 && driftedCounts.length === 0
  );
  check(
    'the declared per-status counts sum to the real entry count (the snapshot is internally consistent)',
    declaredKeys.reduce((s, k) => s + declaredCounts[k], 0) === entries.length
  );
}

console.log(`\nREGISTRY INTEGRITY: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) console.log(errors.map((e) => `  x ${e}`).join('\n'));
process.exit(fail === 0 ? 0 : 1);
