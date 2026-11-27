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
 * failing gate must never be introduced as "progress"): 32 rows are missing at
 * least one of {description, source, evidence, last_verified} — that needs a
 * DECISION about the matrix's vocabulary before a gate can be written.
 *
 * §CORRECTED 2026-11-27 — A FALSE CLAIM REMOVED. This comment also read "3 rows carry a
 * status outside the declared enum (`removed`, `removed`, `complete`)". Both of those
 * statuses ARE declared in `_meta.status_enum`, and the registry actually holds **35
 * `removed` + 2 `complete`** rows, not three — so the sentence was wrong twice over. It
 * was removed rather than restated, because a reader cannot check a per-row claim from a
 * comment; the per-status counts are asserted from the entries themselves by this gate's
 * sibling `scripts/validate-no-stale-blockers.mjs`. The same false sentence appeared in
 * the registry's own row for this check and was corrected in the same change.
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
}

console.log(`\nREGISTRY INTEGRITY: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) console.log(errors.map((e) => `  x ${e}`).join('\n'));
process.exit(fail === 0 ? 0 : 1);
