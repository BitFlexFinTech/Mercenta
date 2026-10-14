#!/usr/bin/env node
/**
 * §OPENSHIP REPLICATION (Batch 2) — DATA PRESERVATION GATE.
 *
 * WHY THIS EXISTS
 * ---------------
 * The OpenShip replication is a UI-ONLY transformation: it replaces the
 * interface and nothing else. The single most dangerous way to get that wrong is
 * to let a "small" backend edit ride along with a styling change — a migration
 * added, a seed rewritten, a data service tweaked — and then have nobody notice,
 * because the app still builds and the screens still render.
 *
 * This gate makes that impossible to do silently. It compares the working tree
 * AND the committed history against a frozen BASELINE COMMIT for every protected
 * path, and fails if anything there has changed.
 *
 * HOW IT WORKS — no hand-maintained manifest to drift
 * ---------------------------------------------------
 * The authority is `git` itself, not a list somebody retypes. The baseline is the
 * last commit before the OpenShip workstream began. Anything that touches a
 * protected path after that commit is a finding.
 *
 * Because it diffs against a FIXED commit, ordinary UI work does not make it
 * fail — only protected-path work does. That property is the whole design.
 *
 * RULE 10 §5 — A CHECK THAT FINDS NOTHING IS A FAILURE, NOT A PASS.
 * If the baseline commit cannot be resolved, or a protected path does not exist,
 * this exits non-zero instead of reporting a comfortable green.
 *
 * Run: node scripts/validate-data-preservation.mjs   (via `npm run validate:all`)
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

let failures = 0;
let assertions = 0;
const test = (name, ok, detail = '') => {
  assertions += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

/**
 * The last commit before the OpenShip UI workstream began.
 * It moves ONLY when a workstream that legitimately changes protected paths is
 * closed and reviewed — never to make this gate pass.
 */
const BASELINE = '21ba4b8';

/** Paths this workstream must never touch. Mirrors the agreed scope. */
const PROTECTED_PATHS = [
  'supabase',                       // migrations + edge functions
  'src/lib',                        // business logic
  'src/services',                   // service layer
  'src/data',                       // seeds + deterministic demo data
  'src/config/commercialModel.ts',  // the two commercial models
  'src/config/shipping.ts',         // shipping economics
  'src/config/vat.ts',              // VAT treatment
  'src/config/payouts.ts',          // payout rails
  'src/config/amazonVendorCodes.ts',// vendor-code → category mapping
];

const git = (args) =>
  execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

/* ── 1. THE BASELINE MUST RESOLVE — otherwise this proves nothing ──────────── */

let baselineOk = false;
try {
  const type = git(['cat-file', '-t', BASELINE]);
  baselineOk = type === 'commit';
  test(`the baseline commit ${BASELINE} resolves to a commit`, baselineOk, type);
} catch (err) {
  test(`the baseline commit ${BASELINE} resolves to a commit`, false,
    err && err.message ? err.message.split('\n')[0] : String(err));
}

/* ── 2. THE PROTECTED PATHS MUST EXIST — a vacuous discovery is a failure ──── */

for (const p of PROTECTED_PATHS) {
  test(`protected path exists: ${p}`, existsSync(p));
}

/* ── 3. NOTHING MAY DIFFER FROM THE BASELINE IN A PROTECTED PATH ───────────── */

if (baselineOk) {
  let changed = [];
  let deleted = [];
  let untracked = [];
  let stat = '';

  try {
    changed = git(['diff', '--name-only', BASELINE, '--', ...PROTECTED_PATHS])
      .split('\n').filter(Boolean);
  } catch (err) {
    test('the protected-path diff could be computed', false,
      err && err.message ? err.message.split('\n')[0] : String(err));
  }

  try {
    deleted = git(['diff', '--name-only', '--diff-filter=D', BASELINE, '--', ...PROTECTED_PATHS])
      .split('\n').filter(Boolean);
  } catch { /* reported by the test below */ }

  try {
    untracked = git(['status', '--porcelain', '--', ...PROTECTED_PATHS])
      .split('\n').filter(Boolean).filter((l) => l.startsWith('??'));
  } catch { /* reported by the test below */ }

  try {
    stat = git(['diff', '--shortstat', BASELINE, '--', ...PROTECTED_PATHS]);
  } catch { /* shortstat is informational */ }

  test('NO protected path differs from the baseline', changed.length === 0,
    changed.length === 0 ? 'clean' : `${changed.length} changed: ${changed.slice(0, 8).join(', ')}`);

  test('NO protected file was DELETED', deleted.length === 0,
    deleted.length === 0 ? 'none' : deleted.join(', '));

  test('NO new file was added inside a protected path', untracked.length === 0,
    untracked.length === 0 ? 'none' : untracked.slice(0, 8).join(', '));
}

/* ── 4. THE MIGRATION AND FUNCTION COUNTS ARE UNCHANGED ────────────────────── */

try {
  const { readdirSync } = await import('node:fs');
  const migrations = readdirSync('supabase/migrations').filter((f) => f.endsWith('.sql'));
  const functions = readdirSync('supabase/functions', { withFileTypes: true })
    .filter((d) => d.isDirectory()).length;

  // Pinned at the workstream's start. A migration or function that appears
  // during a UI-only change is a defect, not a feature.
  test('the migration file count is unchanged (28)', migrations.length === 28,
    `measured ${migrations.length}`);
  test('the edge-function directory count is unchanged (18)', functions === 18,
    `measured ${functions}`);
} catch (err) {
  test('the migration/function inventory could be read', false,
    err && err.message ? err.message.split('\n')[0] : String(err));
}

console.log(
  `\nDATA PRESERVATION: ${failures === 0 ? 'PASS' : 'FAIL'} — ` +
  `${assertions} assertion(s), ${failures} failure(s)`
);
process.exit(failures === 0 ? 0 : 1);
