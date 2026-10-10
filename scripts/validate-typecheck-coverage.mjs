// §OPTION-A (2026-10-04) — THE TYPE-CHECK COVERAGE GATE.
//
// WHY THIS EXISTS
// ---------------
// 121 TypeScript files OUTSIDE `src` belonged to NO TypeScript project: 96 under
// `e2e/`, 23 under `supabase/functions/`, plus `playwright.config.ts` and
// `scripts/brain-runtime-check.ts`. The editor therefore checked them with wrong
// defaults and invented ~178 problems, and `npm run typecheck` NEVER checked them
// at all — a real error there could ship unnoticed.
//
// THE FIX (this file guards it):
//   * `tsconfig.e2e.json`        — the Playwright browser-test project
//   * `tsconfig.functions.json`  — the Supabase Edge Function project
//   * `tsconfig.node.json`       — now also covers `scripts/brain-runtime-check.ts`
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
//
// Every assertion below is proved able to fail by mutation (see the session
// report): the mutated file was restored byte-identical.
import { readFileSync, existsSync, readdirSync } from 'node:fs';

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
test('the tooling project includes scripts/brain-runtime-check.ts',
  /brain-runtime-check\.ts/.test(nodeCfg), nodeCfg);

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
test('scripts/brain-runtime-check.ts exists', exists('scripts/brain-runtime-check.ts'));

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
const covered = e2eTs.length + fnTs.length + 2; // + playwright.config.ts + brain-runtime-check.ts
console.log('');
console.log(`TypeScript files OUTSIDE src now covered by a project: ${covered} (${e2eTs.length} e2e · ${fnTs.length} functions · playwright.config.ts · scripts/brain-runtime-check.ts)`);
console.log(`Assertions run: ${checks} · failures: ${failures}`);
console.log(failures === 0 ? 'TYPECHECK_COVERAGE_VALIDATION_PASS' : `TYPECHECK_COVERAGE_VALIDATION_FAIL (${failures})`);
process.exit(failures === 0 ? 0 : 1);
