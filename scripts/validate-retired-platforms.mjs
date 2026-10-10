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
  /**
   * §REPO-CLEANUP (2026-10-04) — the E6/E7 SCOPE GUARDS must NAME the retired
   * guard's old paths to declare their rename in the change set. Those are
   * declaration lines (test metadata), not product code; allowed per-line here so
   * the guards themselves are still scanned for any OTHER occurrence.
   */
  { file: 'scripts/validate-e6-brand-surfaces.mjs', contains: 'validate-rocketchat-removal.mjs' },
  { file: 'scripts/validate-e6-brand-surfaces.mjs', contains: 'rocketchat-removal.spec.ts' },
  /* §BATCH 5 (2026-10-10) — the allowlist entry that named
     `scripts/validate-e7-embedded-social.mjs` is REMOVED WITH THAT FILE: it was
     deleted together with the Mercenta Social feature, so there is no file left to
     allow. Leaving the entry would keep a pointer to a non-existent script. */
];
const SKIP_FILES = new Set([
  'e2e/retired-platforms.spec.ts',
  'scripts/validate-retired-platforms.mjs',
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

// ── 2b. §Batch 2 (2026-10-10) — the removed work card is ABSENT ────────────
/**
 * The owner removed the "How this works" card from the shared Work Workspace
 * (`src/components/shared/WorkWorkspace.tsx`). It sat OUTSIDE the view switches, so it
 * cleared BOTH the Calendar and the Tasks & Deadlines views. `CommercialReadiness.tsx`
 * keeps its OWN, separate "How this works" card — only the shared workspace's copy was
 * removed. This is the ABSENCE GUARD for that removal (rule 08): re-introducing the card
 * into the shared workspace fails here.
 */
const workWorkspaceSource = readFileSync(resolve(ROOT, 'src/components/shared/WorkWorkspace.tsx'), 'utf-8');
test('ABSENCE GUARD — the shared WorkWorkspace renders no "How this works" card',
  !/title="How this works"/.test(workWorkspaceSource));
test('the CommercialReadiness "How this works" card is untouched (a separate card, not the one removed)',
  /title="How this works"/.test(readFileSync(resolve(ROOT, 'src/components/brand/CommercialReadiness.tsx'), 'utf-8')));

// ── 2c. §BATCH 5 (2026-10-10) — MERCENTA SOCIAL is ABSENT ────────────────
/**
 * The owner instructed Mercenta Social's COMPLETE removal. This is its ABSENCE
 * GUARD (rule 08): every assertion below FAILS if any part of the feature returns —
 * the files, the brand/admin destinations, the engine registration, the SSO bridge,
 * or the infrastructure that served it.
 *
 * Proved able to fail BEFORE the removal was reported done: re-creating a removed
 * module and re-adding a removed nav id each produced a FAIL; both were restored
 * byte-identical (hashes recorded in PROJECT_STATUS.md).
 */
const SOCIAL_REMOVED_FILES = [
  'src/config/mercentaSocial.ts',
  'src/components/brand/MercentaSocial.tsx',
  'src/components/brand/BrandSocialConnect.tsx',
  'src/components/admin/PostizAdminPanel.tsx',
  'src/lib/postiz/postizClient.ts',
  'src/lib/social/workspace.ts',
  'src/lib/social/engineAdapter.ts',
  'src/lib/social/brandStatus.ts',
  'src/lib/social/index.ts',
  'scripts/social-sso/server.mjs',
  'scripts/social-sso/engine-patches.mjs',
  'supabase/functions/social-session/index.ts',
  'scripts/validate-e7-embedded-social.mjs',
  'scripts/validate-postiz.mjs',
  'scripts/validate-social-simulation.mjs',
  'e2e/embedded-social.spec.ts',
];
for (const p of SOCIAL_REMOVED_FILES) {
  test(`§BATCH5 removed file absent: ${p}`, !existsSync(resolve(ROOT, p)));
}
for (const d of [
  'src/lib/social',
  'src/lib/postiz',
  'scripts/social-sso',
  'supabase/functions/social-session',
]) {
  test(`§BATCH5 removed directory absent: ${d}`, !existsSync(resolve(ROOT, d)));
}

/**
 * The SURVIVING files that registered, mounted or served the feature must carry no
 * LIVE trace of it. Each pattern is the exact marker the feature needed — never a
 * bare word — so a §BATCH 5 removal note may legitimately NAME what it deleted
 * while the code stays clean.
 */
const SOCIAL_MARKERS = [
  ['src/components/layout/BrandShell.tsx', /id: 'social'|MERCENTA_SOCIAL|BrandSocialConnect/],
  ['src/components/layout/AdminShell.tsx', /postiz|PostizAdminPanel/i],
  ['src/integrations/registry.ts', /postiz/i],
  ['src/integrations/types.ts', /postiz/i],
  ['src/config/dataProcessing.ts', /provider: 'postiz'|name: 'Postiz'/],
  ['src/config/operatingCosts.ts', /providerId: 'postiz'|id: 'social'/],
  ['src/config/themes.ts', /mr-feature-social/],
  ['src/lib/statusPresentation.ts', /socialPostStatePresentation|SOCIAL_POST_STATE/],
  ['src/lib/simulation/investorDemo.ts', /createSocialEngineClient|createIsolatedSimulatedSocialClient|'social'/],
  ['src/components/admin/integrations/InvestorDemoPanel.tsx', /integrations → social/],
  ['supabase/functions/_shared/rateLimit.ts', /social-session/],
  ['docker-compose.services.yml', /ghcr\.io\/gitroomhq\/postiz-app|^\s{2}postiz(-db|-redis)?:|^\s{2}social-sso:/m],
  ['scripts/Caddyfile', /^\(mercenta_social_engine\)|^postiz\.mercenta\.co\.uk \{/m],
  ['scripts/deploy-docker.sh', /postiz/i],
  ['scripts/vps-bootstrap.sh', /postiz/i],
  ['scripts/forensic-screenshots.mjs', /'social'|'postiz'/],
  ['e2e/app-shell.spec.ts', /text=Mercenta Social'\)\.first\(\)\.toBeVisible|'Social Media', 'WhatsApp'/],
  ['e2e/retired-platforms.spec.ts', /text=Social Media'\)\.first\(\)\.toBeVisible|hasText: 'Postiz' \}\)\.first\(\)\.toBeVisible/],
  ['e2e/integration-hub.spec.ts', /hasText: 'Postiz' \}\)\.first\(\)\.toBeVisible/],
  ['e2e/redesign-surfaces.spec.ts', /brand-social/],
  ['e2e/investor-demo.spec.ts', /investor-demo-stage-social"\]\)\.toContainText/],
];
for (const [file, pattern] of SOCIAL_MARKERS) {
  test(`§BATCH5 no LIVE Social marker remains in ${file}`,
    !pattern.test(readFileSync(resolve(ROOT, file), 'utf-8')));
}

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
  test('other communications providers intact (usertour, twilio_whatsapp)',
    ['usertour', 'twilio_whatsapp'].every((p) => ids.includes(p)));
  /**
   * §BATCH 5 (2026-10-10) — REPOINTED, not weakened. This list held THREE providers
   * ('usertour', 'twilio_whatsapp', 'postiz'). `postiz` was the Mercenta Social
   * engine and left the registry with the feature, so it moved to the §2c absence
   * guard above (where its ABSENCE is asserted). The D1 contract is unchanged: the
   * other communications providers survive and no over-removal happened.
   */
  test('§BATCH5 postiz is gone from the registry (it left with Mercenta Social)',
    !ids.includes('postiz') && !reg.INTEGRATION_ORDER.includes('postiz'));

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
