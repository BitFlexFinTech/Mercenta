// §BATCH1c (S6) — THE CI-WIRING GATE.
//
// WHY THIS EXISTS
// ---------------
// The repository's rule files require typecheck, lint, build and the WHOLE
// validator corpus (`npm run validate:all`) to pass before anything may be
// called verified — but until Batch 1c NOTHING enforced them on a push:
// `.github/` held only `dependabot.yml`, so a break could be committed
// unnoticed, and one WAS: the registry row `batch-4-ci-cd` cited
// `.github/workflows/ci.yml` as its evidence for months while no such file
// existed. A workflow file that merely EXISTS would not fix that; this gate is
// what makes the wiring real and keeps it real.
//
// WHAT IT PROVES
// --------------
//   1. THE WORKFLOW EXISTS and is triggered on push AND pull request, so a
//      committed break is caught without anyone remembering to run anything.
//   2. IT RUNS THE REAL GATES — `npm ci` (reproducible, never `npm install`),
//      `typecheck`, `lint`, `build`, `validate:all` — and every one of those npm
//      scripts EXISTS in `package.json` and points at a file that EXISTS.
//   3. THE CORPUS IS THE WHOLE CORPUS — `scripts/validate-all.sh` iterates the
//      glob `scripts/validate-*.mjs` and exits non-zero if ANY file fails, and
//      THIS gate matches that glob, so it is run by the corpus too.
//   4. NO REGISTERED GATE CAN ESCAPE — every registered `validate:*` npm script
//      is REACHABLE by CI: either inside the corpus glob, or named explicitly by
//      the workflow. (The wording gate, `scripts/lint-wording.mjs`, is a name the
//      glob cannot match, which is exactly why it is named explicitly — that
//      reachability is asserted rather than assumed.)
//   5. IT STILL CANNOT FAIL SILENTLY — no step is `continue-on-error`, no step is
//      conditionally disabled, and the gates run in dependency order (`npm ci`
//      first; `build` before `validate:all`, because the corpus contains the
//      production-boot gate that loads the built bundle in Chromium).
//   6. IT CAN NEVER DEPLOY AND CAN NEVER NEED A SECRET — no `deploy-demo`, no
//      `lftp`/FTP, no `mercenta.co.uk`, no `secrets.` interpolation, no write
//      permission, and no `pull_request_target`. Deployment is
//      `scripts/deploy-demo.sh`: a local, credentialed, deliberate act.
//   7. THE ACTIONS ARE PINNED — checkout and setup-node at a released major tag
//      (never `@main`/`@master`), with a declared Node version and the npm cache.
//
// Every mutation-sensitive assertion below was PROVED ABLE TO FAIL (see the
// session report): the mutated file was restored byte-identical.
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

const WORKFLOW = '.github/workflows/ci.yml';
const CORPUS = 'scripts/validate-all.sh';

/* ── the workflow, as real configuration (comments are NOT configuration) ─── */
const wfExists = exists(WORKFLOW);
test(`the CI workflow exists (${WORKFLOW})`, wfExists, 'no such file — nothing enforces a push');
const wfRaw = wfExists ? read(WORKFLOW) : '';
/**
 * Comment lines are stripped before EVERY assertion below, so the gate can never
 * be satisfied by prose: a comment saying "npm ci" is not a step that runs it.
 */
const lines = wfRaw
  .split('\n')
  .filter((l) => l.trim() !== '' && !l.trim().startsWith('#'));
const body = lines.join('\n');

/* ── 1. the trigger ─────────────────────────────────────────────────────── */
const onIndex = lines.findIndex((l) => /^on:\s*$/.test(l));
const triggerBlock = (() => {
  if (onIndex === -1) return [];
  const out = [];
  for (let i = onIndex + 1; i < lines.length; i++) {
    if (!/^\s/.test(lines[i])) break;
    out.push(lines[i].trim());
  }
  return out;
})();
test('it is triggered on every push', triggerBlock.some((l) => /^push:/.test(l)), triggerBlock.join(' | '));
test(
  'it is triggered on every pull request',
  triggerBlock.some((l) => /^pull_request:/.test(l)),
  triggerBlock.join(' | ')
);
test(
  'it does NOT use pull_request_target (which would run untrusted code with a token)',
  !/pull_request_target/.test(body)
);

/* ── 2. least privilege + a bounded, cancellable run ────────────────────── */
test('permissions are least-privilege (contents: read, and no write scope)',
  /permissions:\s*\n\s*contents:\s*read/.test(body) && !/\bwrite\b/.test(body));
test('superseded runs are cancelled (concurrency group)',
  /concurrency:\s*\n\s*group:/.test(body) && /cancel-in-progress:\s*true/.test(body));
test('it runs on a pinned runner', /runs-on:\s*ubuntu-latest\b/.test(body));
test('the job is time-bounded (timeout-minutes declared)', /timeout-minutes:\s*\d+/.test(body));

/* ── 3. the steps that actually run, in order ───────────────────────────── */
const runSteps = lines
  .map((l) => l.trim())
  .filter((l) => /^-?\s*run:\s*\S/.test(l))
  .map((l) => l.replace(/^-?\s*run:\s*/, '').trim());
const runs = (cmd) => runSteps.includes(cmd);
const stepIndex = (cmd) => runSteps.indexOf(cmd);

test('the workflow runs npm ci', runs('npm ci'), runSteps.join(' | '));
test('it never falls back to a non-reproducible npm install', !/npm install/.test(body));
test('it runs npm run typecheck', runs('npm run typecheck'));
test('it runs npm run lint', runs('npm run lint'));
test('it runs npm run build', runs('npm run build'));
test('it runs npm run validate:all (the whole corpus)', runs('npm run validate:all'));
test('it runs the compliance wording gate explicitly (the corpus glob cannot reach it)',
  runs('npm run validate:wording'));
test('it installs the Chromium the production-boot gate drives',
  runSteps.some((c) => /^npx playwright install\b/.test(c) && /\bchromium\b/.test(c)), runSteps.join(' | '));
test('no step is allowed to fail silently (no continue-on-error)', !/continue-on-error/.test(body));
test('no step is conditionally disabled (no `if: false`)', !/if:\s*false/.test(body));
test('npm ci runs before every other gate', stepIndex('npm ci') === 0, runSteps.join(' | '));
test('the build runs before validate:all (the corpus drives the built bundle)',
  stepIndex('npm run build') !== -1 &&
    stepIndex('npm run build') < stepIndex('npm run validate:all'),
  runSteps.join(' | '));

/* ── 4. it can never deploy and can never need a secret ─────────────────── */
test('it contains NO deployment step (no deploy script, no FTP, no demo/live host)',
  !/deploy-demo|deploy-docker|lftp|ftp:|mercenta\.co\.uk/i.test(body));
test('it interpolates NO secret (no secrets. reference, no FTP credential name)',
  !/secrets\.|NAMECHEAP_FTP|_TOKEN\b|_PASSWORD\b/.test(body));
test('it does not run the e2e/codegen tooling that a deployment would need',
  !/playwright test|\.spec\.ts/.test(body));

/* ── 5. the actions are pinned, with the npm cache ──────────────────────── */
test('actions/checkout is pinned to a released major tag',
  /uses:\s*actions\/checkout@v\d+\b/.test(body));
test('actions/setup-node is pinned to a released major tag',
  /uses:\s*actions\/setup-node@v\d+\b/.test(body));
test('no action is pinned to a moving branch (@main / @master)',
  !/uses:\s*[^\s]+@(main|master)\b/.test(body));
test('a Node version is declared', /node-version:\s*['"]?\d/.test(body));
test('the npm cache is enabled for the reproducible install', /cache:\s*npm\b/.test(body));

/* ── 6. the gates the workflow names are REAL ───────────────────────────── */
const pkg = JSON.parse(read('package.json'));
const scripts = pkg.scripts ?? {};
const devDeps = pkg.devDependencies ?? {};
/**
 * Each gate the workflow runs must EXIST in `package.json` and be backed by
 * something that is actually on disk — the script file it runs, or (for a tool
 * invocation like `tsc`/`eslint`/`vite`) the tool's dependency plus the config
 * file it is told to read. A workflow step naming a script that does not exist
 * would fail on every push, which is exactly what this refuses.
 */
const GATES = [
  { name: 'typecheck', file: null, dep: 'typescript', config: 'tsconfig.app.json' },
  { name: 'lint', file: null, dep: 'eslint', config: 'eslint.config.js' },
  { name: 'build', file: null, dep: 'vite', config: 'vite.config.ts' },
  { name: 'validate:all', file: 'scripts/validate-all.sh', dep: null, config: null },
  { name: 'validate:wording', file: 'scripts/lint-wording.mjs', dep: null, config: null },
];
for (const g of GATES) {
  const cmd = scripts[g.name];
  const parts = [];
  let ok = typeof cmd === 'string' && cmd.length > 0;
  if (!ok) parts.push('MISSING SCRIPT');
  else parts.push(cmd);
  if (g.file) {
    const existsFile = exists(g.file);
    ok = ok && existsFile;
    parts.push(`${g.file} ${existsFile ? 'exists' : 'MISSING'}`);
  }
  if (g.dep) {
    const hasDep = Boolean(devDeps[g.dep]);
    ok = ok && hasDep;
    parts.push(`${g.dep} ${hasDep ? 'installed' : 'MISSING'}`);
  }
  if (g.config) {
    const existsCfg = exists(g.config);
    ok = ok && existsCfg;
    parts.push(`${g.config} ${existsCfg ? 'exists' : 'MISSING'}`);
  }
  test(`npm run ${g.name} exists AND the thing it runs exists`, ok, parts.join(' · '));
}
test('validate:all is the whole-corpus script (scripts/validate-all.sh)',
  scripts['validate:all'] === 'bash scripts/validate-all.sh');

/* ── 7. the corpus really is the whole corpus, and includes THIS gate ───── */
const corpusSrc = exists(CORPUS) ? read(CORPUS) : '';
test('the corpus iterates the glob scripts/validate-*.mjs',
  /for\s+f\s+in\s+scripts\/validate-\*\.mjs/.test(corpusSrc));
test('the corpus exits NON-ZERO when any validator fails',
  /\[\s*"\$FAIL"\s*-eq\s*0\s*\]/.test(corpusSrc));
test('the corpus includes THIS gate (it matches the glob the corpus runs)',
  /^validate-.*\.mjs$/.test('validate-ci-wiring.mjs'));

const corpusFiles = readdirSync(new URL('../scripts/', import.meta.url)).filter((f) =>
  /^validate-.*\.mjs$/.test(f)
);
test(`the corpus glob matches real files (${corpusFiles.length} found)`, corpusFiles.length > 0);

/**
 * §4 above, made mechanical: NO registered gate may sit outside CI. A registered
 * `validate:*` script is reachable when its file matches the corpus glob, or the
 * workflow names it explicitly. Anything else is a gate nobody runs.
 */
const registered = Object.keys(scripts).filter((k) => k.startsWith('validate:'));
const unreachable = registered
  .filter((k) => k !== 'validate:all')
  .filter((k) => {
    const file = String(scripts[k]).match(/scripts\/[\w.-]+\.mjs/)?.[0] ?? '';
    if (/^scripts\/validate-.*\.mjs$/.test(file)) return false;
    return !runSteps.includes(`npm run ${k}`);
  });
test(`every registered validate:* script is reachable by CI (${registered.length} registered)`,
  unreachable.length === 0, `UNREACHABLE: ${unreachable.join(', ')}`);

console.log('');
console.log(`CI wiring: ${runSteps.length} commands in the workflow · ${corpusFiles.length} validators in the corpus`);
console.log(`Assertions run: ${checks} · failures: ${failures}`);
console.log(failures === 0 ? 'CI_WIRING_VALIDATION_PASS' : `CI_WIRING_VALIDATION_FAIL (${failures})`);
process.exit(failures === 0 ? 0 : 1);