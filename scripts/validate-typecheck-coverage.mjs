// §OPTION-A (2026-10-04) — THE TYPE-CHECK COVERAGE GATE.
//
// WHY THIS EXISTS
// ---------------
// 121 TypeScript files OUTSIDE `src` belonged to NO TypeScript project: 96 under
// `e2e/`, 23 under `supabase/functions/`, plus `playwright.config.ts` and a stray
// `scripts/brain-runtime-check.ts` (since DELETED with the Mercenta Brain — see
// §BATCH 4 below). The editor therefore checked them with wrong
// defaults and invented ~178 problems, and `npm run typecheck` NEVER checked them
// at all — a real error there could ship unnoticed.
//
// THE FIX (this file guards it):
//   * `tsconfig.e2e.json`        — the Playwright browser-test project
//   * `tsconfig.functions.json`  — the Supabase Edge Function project
//   * `tsconfig.node.json`       — covered the stray `scripts/brain-runtime-check.ts`
//                                  (§BATCH 4: that file is deleted, so the mapping
//                                   and the include are gone — see below)
//   all referenced from the root `tsconfig.json`, and `npm run typecheck` runs
//   every one of them.
//
// WHAT THIS GATE PROVES — it FAILS if the coverage is removed or drifts aside:
//   1. both new project files exist;
//   2. the root `tsconfig.json` references them;
//   3. `npm run typecheck` actually runs every project (app · node · e2e ·
//      functions), so a file cannot be silently dropped from the check;
//   4. each project's `include` really covers its folder;
//   5. the ambient Edge-runtime types exist and declare the Deno surface used;
//   6. the folders genuinely hold the TypeScript they are meant to cover.
//   7. §BATCH 0 (2026-11-21) — GITIGNORED material is excluded from the walk.
//      The walk used to read the raw filesystem, so a design reference dropped
//      into the repository (the gitignored `0. Company Documents/` homepage
//      blueprint) was type-checked as application source and failed the whole
//      corpus on material Git does not track. The ignored set is now DISCOVERED
//      from Git's own resolution, so a newly ignored folder is skipped
//      automatically and this class cannot recur.
//
// Every assertion below is proved able to fail by mutation (see the session
// report): the mutated file was restored byte-identical.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

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

/** Paths Git ignores are NOT source. Discovered from Git's own resolution (never
 *  a retyped list) so an ignored folder added later is excluded automatically.
 *  `--directory` collapses whole ignored trees to one entry, which keeps this
 *  cheap even with `node_modules/` present. */
const GITIGNORED = (() => {
  try {
    const out = execSync('git ls-files --others --ignored --exclude-standard --directory', {
      cwd: fileURLToPath(ROOT), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    });
    return new Set(
      out.split('\n').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean),
    );
  } catch {
    return new Set();
  }
})();
const isGitignored = (p) => {
  for (const ig of GITIGNORED) if (p === ig || p.startsWith(`${ig}/`)) return true;
  return false;
};

/** Every `.ts` file under a folder (recursive) — used to prove the folders hold
 *  the TypeScript the projects are declared to cover. */
function listTs(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(new URL(d, ROOT), { withFileTypes: true })) {
      const p = `${d}/${e.name}`;
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.ts')) out.push(p);
    }
  };
  walk(dir);
  return out;
}

/* ── 1. the two new projects exist ──────────────────────────────────────── */
test('the Playwright test project exists (tsconfig.e2e.json)', exists('tsconfig.e2e.json'));
test('the Edge Function project exists (tsconfig.functions.json)', exists('tsconfig.functions.json'));

/* ── 2. the root project references them ────────────────────────────────── */
const root = exists('tsconfig.json') ? read('tsconfig.json') : '';
test('the root tsconfig references the e2e project', /tsconfig\.e2e\.json/.test(root));
test('the root tsconfig references the functions project', /tsconfig\.functions\.json/.test(root));

/* ── 3. `npm run typecheck` runs EVERY project ──────────────────────────── */
const pkg = JSON.parse(read('package.json'));
const tc = String(pkg.scripts?.typecheck ?? '');
for (const cfg of ['tsconfig.app.json', 'tsconfig.node.json', 'tsconfig.e2e.json', 'tsconfig.functions.json']) {
  test(`npm run typecheck runs ${cfg}`, tc.includes(cfg), tc);
}

/* ── 4. each project's include covers its folder ────────────────────────── */
const e2eCfg = exists('tsconfig.e2e.json') ? read('tsconfig.e2e.json') : '';
const fnCfg = exists('tsconfig.functions.json') ? read('tsconfig.functions.json') : '';
const nodeCfg = exists('tsconfig.node.json') ? read('tsconfig.node.json') : '';
test('the e2e project includes the e2e/ folder', /"e2e"/.test(e2eCfg), e2eCfg);
test('the e2e project includes playwright.config.ts', /playwright\.config\.ts/.test(e2eCfg), e2eCfg);
test('the functions project includes supabase/functions', /supabase\/functions/.test(fnCfg), fnCfg);
/* §BATCH 4 (2026-10-10) — REPOINTED into an ABSENCE guard (rule 08). This
   assertion used to REQUIRE the tooling project to include the one stray
   `scripts/brain-runtime-check.ts`. That file exercised the Mercenta Brain, which
   the owner instructed us to remove, so it is DELETED and must not be referenced
   here again (a stale include would make `npm run typecheck` fail on a missing
   file — exactly the drift this whole gate exists to catch). */
test('the tooling project no longer references the removed scripts/brain-runtime-check.ts',
  /* test the CODE, not the file's prose: the §BATCH 4 repoint comment necessarily
     names the removed file, and a gate that fails on its own documentation is a
     broken gate (the same reason the original validators strip comments). */
  !/brain-runtime-check\.ts/.test(nodeCfg.replace(/\/\*[\s\S]*?\*\//g, '')), nodeCfg);

/* ── 5. the ambient Edge-runtime types exist and declare the Deno surface ── */
const AMBIENT = 'supabase/functions/_types/edge-runtime.d.ts';
test('the Edge-runtime ambient types exist', exists(AMBIENT));
const amb = exists(AMBIENT) ? read(AMBIENT) : '';
test('the ambient types declare the Deno global the functions use', /declare namespace Deno/.test(amb), amb.slice(0, 120));
test('the ambient types declare Deno.serve', /function serve\(/.test(amb));
test('the ambient types declare Deno.env.get', /function get\(/.test(amb));

/* ── 6. the folders genuinely hold the TypeScript they cover ────────────── */
const e2eTs = listTs('e2e');
const fnTs = listTs('supabase/functions');
test(`the e2e folder holds its browser specs (${e2eTs.length} .ts files)`, e2eTs.length > 90,
  `found ${e2eTs.length}`);
test(`the Edge Function folder holds its functions (${fnTs.length} .ts files)`, fnTs.length > 15,
  `found ${fnTs.length}`);
test('playwright.config.ts exists at the root', exists('playwright.config.ts'));
test('§BATCH4 the removed scripts/brain-runtime-check.ts is GONE', !exists('scripts/brain-runtime-check.ts'));

/* ── 6b. rule 09 §1/§3 — THE COVERAGE GATE: no TypeScript file sits outside
       every declared project ─────────────────────────────────────────────────
   WHY: sections 1–6 fix WHAT the projects check; this proves NOTHING is left
   out of them. The original defect was exactly one stray file —
   `scripts/brain-runtime-check.ts` — which belonged to NO project, so the editor
   invented problems for it AND `npm run typecheck` never checked it at all. Rather
   than freeze a folder list (which would go stale the moment a project changed),
   the covered roots are DISCOVERED from the projects' own `include` arrays: a
   project that stops including a folder fails HERE instead of silently
   un-covering it. Generated/output folders are excluded because nothing in them
   is source. */
const SKIP_DIRS = new Set([
  'node_modules', 'dist', '.git', 'coverage', 'test-results', 'playwright-report',
  'e2e-report', 'test-screenshots', 'forensic-captures', 'Review Zip', '.geo-cache',
]);
function listAllTs(dir, out = []) {
  for (const e of readdirSync(new URL(`${dir}/`, ROOT), { withFileTypes: true })) {
    if (e.isDirectory()) {
      const rel = `${dir}/${e.name}`.replace(/^\.\//, '');
      if (!SKIP_DIRS.has(e.name) && !isGitignored(rel)) listAllTs(`${dir}/${e.name}`, out);
    } else if (/\.tsx?$/.test(e.name)) {
      out.push(`${dir}/${e.name}`.replace(/^\.\//, ''));
    }
  }
  return out;
}
const includeEntries = [];
for (const cfg of ['tsconfig.app.json', 'tsconfig.node.json', 'tsconfig.e2e.json', 'tsconfig.functions.json']) {
  if (!exists(cfg)) continue;
  const body = read(cfg).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const m = body.match(/"include"\s*:\s*\[([\s\S]*?)\]/);
  if (m) includeEntries.push(...[...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]));
}
const allTs = listAllTs('.');
const isCovered = (f) =>
  includeEntries.some((entry) => (/\.tsx?$/.test(entry) ? f === entry : f.startsWith(`${entry}/`)));
const uncovered = allTs.filter((f) => !isCovered(f));
test('rule 09 §1/§3 COVERAGE GATE — every TypeScript file belongs to a declared project',
  uncovered.length === 0, uncovered.join(', '));
test(`the coverage gate really walked the source tree (${allTs.length} .ts/.tsx files discovered)`,
  allTs.length > 400);
// A discovery that finds nothing is a FAILURE, not a pass (rule 06): if Git's
// ignore resolution ever returns nothing here, the exclusion is silently
// vacuous and this gate would certify the wrong state.
test(`the walk skips gitignored reference material (${GITIGNORED.size} ignored path(s) discovered)`,
  GITIGNORED.size > 0);

/* ── 7. the editor root — the committed pin (half 2 of rule 09) ──────────── */
// WHY: coverage (above) fixes what the command line checks; it does NOT stop the
// editor inventing problems with its own bundled compiler. Half 2 pins the editor
// to THIS project's TypeScript via a workspace-relative path, committed so every
// clone gets it. See ~/.cline/rules/09-editor-and-cli-agree.md.
const VSCODE = '.vscode/settings.json';
test('the committed editor settings exist (.vscode/settings.json)', exists(VSCODE));
const vs = exists(VSCODE) ? read(VSCODE) : '';
test("the editor is pinned to THIS project's TypeScript (workspace-relative tsdk)",
  /"typescript\.tsdk"\s*:\s*"node_modules\/typescript\/lib"/.test(vs), vs);
test('the editor is told to use the workspace TypeScript without prompting',
  /"typescript\.enablePromptUseWorkspaceTsdk"\s*:\s*true/.test(vs), vs);

/* ── summary ────────────────────────────────────────────────────────────── */
/* §BATCH 4 (2026-10-10) — the former `+ 2` also counted
   `scripts/brain-runtime-check.ts`, which is now deleted; only
   `playwright.config.ts` remains. */
const covered = e2eTs.length + fnTs.length + 1; // + playwright.config.ts
console.log('');
console.log(`TypeScript files OUTSIDE src now covered by a project: ${covered} (${e2eTs.length} e2e · ${fnTs.length} functions · playwright.config.ts)`);
console.log(`Assertions run: ${checks} · failures: ${failures}`);
console.log(failures === 0 ? 'TYPECHECK_COVERAGE_VALIDATION_PASS' : `TYPECHECK_COVERAGE_VALIDATION_FAIL (${failures})`);
process.exit(failures === 0 ? 0 : 1);
