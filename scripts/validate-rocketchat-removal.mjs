// §Phase D1 — Rocket.Chat removal gate (static + domain level).
//
// Proves Rocket.Chat is absent from the executable product, not merely
// unlinked:
//   1. The Rocket.Chat files/directory no longer exist.
//   2. No Rocket.Chat reference remains in any executable path (src/, e2e/,
//      scripts/, supabase/, eslint.config.js, docker-compose.services.yml,
//      package.json) — only the intentional Phase D1 annotation is allowlisted.
//   3. The integration registry drops 19 → 18 providers with no 'rocketchat'
//      id/order/meta entry, while the other communications providers survive.
//   4. IntegrationId has no 'rocketchat' member and INITIAL_INTEGRATIONS has
//      no rocketchat state.
//   5. The simulation CASE scenario runs with ZERO providers registered
//      (helpdesk-only), while a provider-dependent scenario is STILL refused —
//      i.e. the safety gate was not weakened by the removal.
import { createServer } from 'vite';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const test = (name, ok) => {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failures++;
};

// ── 1. Removed artefacts must not exist ─────────────────────────────────
const REMOVED_FILES = [
  'src/components/admin/RocketChatAdminPanel.tsx',
  'src/lib/rocketchat/rocketChatClient.ts',
  'src/lib/rocketchat/rocketChatSSO.ts',
];
for (const p of REMOVED_FILES) {
  test(`removed file absent: ${p}`, !existsSync(resolve(ROOT, p)));
}
test('removed directory absent: src/lib/rocketchat', !existsSync(resolve(ROOT, 'src/lib/rocketchat')));

// ── 2. No Rocket.Chat reference in executable paths ─────────────────────
const INTENTIONAL = [
  // Phase D1's own explanatory comment on the CASE scenario (documents the
  // removal at the call site — not a dependency).
  { file: 'src/lib/simulation/scenarioEngine.ts', contains: 'Phase D1 — Rocket.Chat removed' },
  // Phase D1's removal note in the self-hosted services stack (documents that
  // the service was deleted — not a service definition).
  { file: 'docker-compose.services.yml', contains: 'Phase D1 (2026-09-11): Rocket.Chat removed' },
];
const SKIP_FILES = new Set([
  'e2e/rocketchat-removal.spec.ts',
  'scripts/validate-rocketchat-removal.mjs',
]);
const SCAN_DIRS = ['src', 'e2e', 'scripts', 'supabase'];
const SCAN_EXTS = ['.ts', '.tsx', '.js', '.mjs', '.cjs', '.yml', '.yaml', '.json'];
const SCAN_SINGLE_FILES = ['eslint.config.js', 'docker-compose.services.yml', 'package.json'];

const hits = [];
function scanFile(rel, full) {
  const text = readFileSync(full, 'utf-8');
  text.split('\n').forEach((line, i) => {
    if (!/rocket/i.test(line)) return;
    const intentional = INTENTIONAL.some((a) => a.file === rel && line.includes(a.contains));
    if (!intentional) hits.push(`${rel}:${i + 1}: ${line.trim()}`);
  });
}
function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist') continue;
    const full = join(dir, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) { walk(full); continue; }
    const rel = relative(ROOT, full);
    if (SKIP_FILES.has(rel)) continue;
    if (!SCAN_EXTS.some((e) => name.endsWith(e))) continue;
    scanFile(rel, full);
  }
}
for (const d of SCAN_DIRS) {
  const p = resolve(ROOT, d);
  if (existsSync(p)) walk(p);
}
for (const f of SCAN_SINGLE_FILES) {
  const p = resolve(ROOT, f);
  if (existsSync(p)) scanFile(f, p);
}
test('no Rocket.Chat reference remains in executable product paths', hits.length === 0);
if (hits.length) hits.forEach((h) => console.log('    ' + h));
// ── 3–5. Domain-level assertions through the real modules ───────────────
const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
try {
  const reg = await server.ssrLoadModule('/src/integrations/registry.ts');
  const types = await server.ssrLoadModule('/src/integrations/types.ts');
  const scenarios = await server.ssrLoadModule('/src/lib/simulation/scenarioEngine.ts');
  const adminShell = readFileSync(resolve(ROOT, 'src/components/layout/AdminShell.tsx'), 'utf-8');

  const ids = Object.keys(reg.INTEGRATION_REGISTRY);
  // §Phase M10 — REPOINTED. "18 providers" was a point-in-time count that went
  // stale when later phases legitimately registered new providers (e.g.
  // palletline, §11). The removal's REAL invariant is that the registry and its
  // declared order agree with each other and that rocketchat is absent — both
  // asserted here against the registry itself rather than a frozen number.
  test('provider registry and INTEGRATION_ORDER are consistent',
    ids.length >= 18 &&
      reg.INTEGRATION_ORDER.length === ids.length &&
      reg.INTEGRATION_ORDER.every((id) => ids.includes(id)) &&
      ids.every((id) => reg.INTEGRATION_ORDER.includes(id)));
  test('no rocketchat id in INTEGRATION_REGISTRY', !ids.includes('rocketchat'));
  test('no rocketchat id in INTEGRATION_ORDER', !reg.INTEGRATION_ORDER.includes('rocketchat'));
  test('no rocketchat key in INTEGRATION_META', !('rocketchat' in reg.INTEGRATION_META));
  test('no rocketchat key in INITIAL_INTEGRATIONS', !('rocketchat' in types.INITIAL_INTEGRATIONS));
  test('other communications providers intact (usertour, twilio_whatsapp, postiz)',
    ['usertour', 'twilio_whatsapp', 'postiz'].every((p) => ids.includes(p)));

  test('AdminShell has no rocketchat nav id / route / import', !/rocketchat/i.test(adminShell));

  // CASE requires no provider → runs even when EVERYTHING resolves
  // 'not_registered' (the strongest "no external dependency" proof).
  const notRegistered = () => 'not_registered';
  const caseRun = await scenarios.runScenario('CASE', { seed: 7, getMode: notRegistered });
  test('CASE scenario runs with zero providers registered (helpdesk-only)',
    caseRun.status === 'ok' && caseRun.steps.length === 3);

  // …and the gate is NOT weakened: a provider-dependent scenario is refused.
  const normalRun = await scenarios.runScenario('NORMAL_PO', { seed: 7, getMode: notRegistered });
  test('NORMAL_PO is STILL safety-refused when its providers are not simulation',
    normalRun.status === 'safety_refused' && /not positively SIMULATION/.test(normalRun.safetyReason ?? ''));

  console.log(failures === 0 ? 'ROCKETCHAT_REMOVAL_VALIDATION_PASS' : `ROCKETCHAT_REMOVAL_VALIDATION_FAIL (${failures})`);
} finally {
  await server.close();
}
if (failures > 0) process.exit(1);
