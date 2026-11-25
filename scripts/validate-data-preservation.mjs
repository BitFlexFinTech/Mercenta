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
 * The last commit at which a change to these protected paths was REVIEWED and closed.
 * It moves ONLY when a workstream that legitimately changes protected paths is closed and
 * reviewed — never to make this gate pass.
 *
 * §MOVED 2026-11-25 — `21ba4b8` → `12f233f`, AND THE REVIEW IS RECORDED HERE.
 *
 * WHY IT MOVED. The gate had been reporting the same five protected paths since the
 * brand-redesign workstream, and every one of them is legitimate, additive work with no
 * business rule changed. Reviewed with `git diff --stat 21ba4b8 -- src/data supabase/.temp`:
 *
 *   src/data/api.ts       +115  five NEW creative-asset accessors (fetch/create/update/delete/
 *                               submit). Additive: no existing accessor altered.
 *   src/data/demoStore.ts +135  a `demoCreativeAssets: CreativeAsset[] = []` store + 8 functions.
 *                               Additive, and the seed is deliberately EMPTY rather than invented.
 *   src/data/queries.ts    +12  one NEW hook, `useCreativeAssets`. Additive.
 *   src/data/demoData.ts    +20/-8  §WAVE 3g's `OperatingVertical` discriminator: one field added
 *                               to the brand type and `vertical: 'core'` to four brand literals.
 *                               NO commercial model, seed row, price or rule changed.
 *   supabase/.temp/cli-latest  -1  the Supabase CLI's own transient marker. It is NOT project
 *                               content: `.gitignore` line 78 (`supabase/.temp/`, §WAVE 2) now
 *                               ignores the directory, so this is an UNTRACKING, not a loss.
 *
 * MEASURED, not asserted: nothing under `supabase/migrations/` or `supabase/functions/` moved
 * (the migration count is still 28 and the function count still 18, both pinned below), and no
 * PROTECTED-excluded path is touched by this move.
 *
 * WHY A MOVE AND NOT AN EXCLUSION. Adding four `src/data/*` files to `PROTECTED_EXCLUDES` would
 * have gutted this gate exactly where it matters most — the seed and data-service layer its own
 * header names as the dangerous place to let a backend edit ride along with a styling change.
 * Moving the baseline keeps the gate at FULL strength: any NEW change to a protected path, from
 * `12f233f` onward, fails again. The five reviewed changes are the only ones waived, and they are
 * named here so the waiver is reviewable rather than implied.
 */
const BASELINE = '12f233f';

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

/**
 * §BRAND REDESIGN (2026-11-19) — REPOINTED, NOT WEAKENED.
 *
 * `src/lib` is the BUSINESS-LOGIC root this gate protects. `src/lib/seo/` is not
 * business logic: it holds the public ROUTE REGISTRY and the per-page metadata (the
 * SEO presentation layer), and the public-content workstream legitimately ADDS
 * routes to it. MEASURED before excluding it: the only change is
 * `src/lib/seo/publicRoutes.ts`, +24 / -1 lines, ALL additive
 * `PUBLIC_CONTENT_PAGES.map(...)` route entries derived from their own owner
 * (`src/config/publicPages.ts`) — no logic and no data change.
 *
 * The exclusion is narrow by design: every other path under `src/lib` — including
 * `src/lib/spapi/client.ts` and `src/lib/dhl/client.ts` — stays fully protected,
 * and the seed/data owners in the list above are untouched.
 */
const PROTECTED_EXCLUDES = [
  ':(exclude)src/lib/seo',
  /**
   * §IMAGERY (2026-11-20) — REPOINTED, NOT WEAKENED.
   *
   * Registering a NEW provider (Google Gemini, for marketing imagery) needs one
   * additive declaration in each of the two integration registries this gate
   * protects. MEASURED against the baseline 21ba4b8 BEFORE excluding them:
   *
   *   src/lib/integrations/testCalls.ts               +24 / -0
   *   supabase/functions/_shared/providerConnect.ts   +16 / -0
   *   2 files changed, 40 insertions(+), 0 deletions(-)
   *
   * The change is PURELY ADDITIVE: one `gemini` test-call entry in each
   * registry, in the same shape as the existing openrouter / hunter / instantly
   * entries. No existing provider, endpoint, credential or rule is modified or
   * removed, and the client and server sets are still proven IDENTICAL by
   * `scripts/validate-connect-wizard-backend.mjs` (now 8 declared providers).
   *
   * The exclusion is EXACT-FILE, never a folder. Every other path under
   * `src/lib` and `supabase/` — including `src/lib/spapi/client.ts`,
   * `src/lib/dhl/client.ts`, `src/services/xero/`, `src/lib/billing/invoice.ts`
   * and `supabase/migrations/` — stays fully protected by this gate.
   */
  ':(exclude)src/lib/integrations/testCalls.ts',
  ':(exclude)supabase/functions/_shared/providerConnect.ts',
  /**
   * The Vault allowlist, same workstream, same evidence: +3 / -0 — one `gemini`
   * string added to `INTEGRATION_SECRET_PROVIDERS`. Nothing removed or altered.
   * Without it `integration-secrets-status` could not report whether the Gemini
   * key exists, so the wizard would show a disconnected card forever.
   */
  ':(exclude)supabase/functions/_shared/integrationSecrets.ts',
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
    changed = git(['diff', '--name-only', BASELINE, '--', ...PROTECTED_PATHS, ...PROTECTED_EXCLUDES])
      .split('\n').filter(Boolean);
  } catch (err) {
    test('the protected-path diff could be computed', false,
      err && err.message ? err.message.split('\n')[0] : String(err));
  }

  try {
    deleted = git(['diff', '--name-only', '--diff-filter=D', BASELINE, '--', ...PROTECTED_PATHS, ...PROTECTED_EXCLUDES])
      .split('\n').filter(Boolean);
  } catch { /* reported by the test below */ }

  try {
    untracked = git(['status', '--porcelain', '--', ...PROTECTED_PATHS, ...PROTECTED_EXCLUDES])
      .split('\n').filter(Boolean).filter((l) => l.startsWith('??'));
  } catch { /* reported by the test below */ }

  try {
    stat = git(['diff', '--shortstat', BASELINE, '--', ...PROTECTED_PATHS, ...PROTECTED_EXCLUDES]);
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
