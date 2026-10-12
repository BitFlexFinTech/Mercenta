// §Phase D1 — Rocket.Chat removal gate (static + domain level).
//
// §BATCH 7 PART 5.1 (2026-10-11) — THE CONSOLIDATED PART-2 ABSENCE RECORD.
// This file is now the ONE place that guards EVERY removal the owner instructed
// on 2026-10-10, so the whole removal is swept by `npm run validate:all`:
//   §2b  2.1 — the shared WorkWorkspace "How this works" card
//   §2c  2.6 — Mercenta Social (16 files + 4 dirs + 21 live markers)
//   §2d  2.2 — the Consolidation card on BOTH logistics surfaces (owner lib kept)
//   §2e  2.3 — the interactive operational map on BOTH surfaces (derivation kept)
//   §2f  2.4 — the Logistics Hero and its whole pipeline (+ .geo-cache, npm scripts)
//   §2g  2.5 — the Mercenta Brain (surface, renderers, graph, hooks, harness)
// Groups §2b–§2g are ABSENCE GUARDS (global rule 08): each FAILS if the removed
// thing returns. The heavier specialist guards stay where they are and are
// cross-referenced in each group's comment (validate-mercenta-brain.mjs 18
// assertions · validate-logistics-map.mjs §11 · validate-logistics-providers.mjs
// §9a · validate-e6-brand-surfaces.mjs §BATCH3) — this file is the consolidated
// record, not a replacement for them.
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

// ── 2d. §BATCH 2 (2026-10-10) — THE CONSOLIDATION CARD is ABSENT ──────────
/**
 * The owner instructed the "Consolidation" card's removal from BOTH logistics
 * workspaces. ABSENCE GUARD (rule 08) — it FAILS if the card returns to either
 * surface. The canonical owner `src/lib/shipping/consolidation.ts` and the
 * retained (now unmounted) `ConsolidationPosturePanel` STAY: programme decision 11
 * ("deferred, not designed out") is a recorded Founder decision, so only the CARD
 * was removed. The behavioural guard lives in validate-logistics-providers §9a;
 * this group is the consolidated Part-2 record.
 */
const stripComments = (s) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');
const HUB_SRC = stripComments(readFileSync(resolve(ROOT, 'src/components/brand/LogisticsHub.tsx'), 'utf-8'));
const CONTROL_SRC = stripComments(readFileSync(resolve(ROOT, 'src/components/admin/LogisticsControl.tsx'), 'utf-8'));

test('ABSENCE GUARD — the brand Hub mounts no ConsolidationPosturePanel and renders no Consolidation card',
  !/ConsolidationPosturePanel/.test(HUB_SRC) && !/title="Consolidation"/.test(HUB_SRC));
test('ABSENCE GUARD — the admin Control mounts no ConsolidationPosturePanel and renders no Consolidation card',
  !/ConsolidationPosturePanel/.test(CONTROL_SRC) && !/title="Consolidation"/.test(CONTROL_SRC));
test('the consolidation DECISION is kept — the owner lib and the unmounted panel survive',
  existsSync(resolve(ROOT, 'src/lib/shipping/consolidation.ts')) &&
    /CONSOLIDATION_POSTURE/.test(readFileSync(resolve(ROOT, 'src/lib/shipping/consolidation.ts'), 'utf-8')) &&
    existsSync(resolve(ROOT, 'src/components/shared/logistics/ConsolidationPosturePanel.tsx')));

// ── 2e. §BATCH 3 (2026-10-10) — THE OPERATIONAL MAP is ABSENT ─────────────
/**
 * The owner instructed the interactive operational map's removal from BOTH
 * logistics surfaces. ABSENCE GUARD (rule 08) — it FAILS if the map returns.
 * The DERIVATION is deliberately KEPT: `src/lib/logistics/operationsMap.ts` is
 * still the ONE owner the consignment list and the consignment inspector on BOTH
 * surfaces read (verified, not assumed), so only the canvas and the map-only
 * helpers were removed. The module-level guard lives in validate-logistics-map §11.
 */
const OPS_MAP_SRC = readFileSync(resolve(ROOT, 'src/lib/logistics/operationsMap.ts'), 'utf-8');
test('§BATCH3 ABSENCE GUARD — the map canvas component is DELETED',
  !existsSync(resolve(ROOT, 'src/components/shared/logistics/LogisticsMapCanvas.tsx')));
test('§BATCH3 ABSENCE GUARD — neither logistics surface imports or mounts the map canvas',
  !/import\s*\{[^}]*\bLogisticsMapCanvas\b/.test(HUB_SRC) && !/<LogisticsMapCanvas\b/.test(HUB_SRC) &&
    !/import\s*\{[^}]*\bLogisticsMapCanvas\b/.test(CONTROL_SRC) && !/<LogisticsMapCanvas\b/.test(CONTROL_SRC));
test('§BATCH3 ABSENCE GUARD — neither surface renders a map testid',
  !/logistics-map'|admin-logistics-map|logistics-marker-|logistics-map-evidence|logistics-map-legend/.test(
    HUB_SRC + CONTROL_SRC));
test('§BATCH3 the DERIVATION is KEPT — both surfaces still read buildOperationalMap',
  existsSync(resolve(ROOT, 'src/lib/logistics/operationsMap.ts')) &&
    HUB_SRC.includes('buildOperationalMap(') && CONTROL_SRC.includes('buildOperationalMap('));
test('§BATCH3 the map-only helpers are gone from the derivation',
  !/export function isLegInMotion/.test(OPS_MAP_SRC) && !/export function truthPresentation/.test(OPS_MAP_SRC));

// ── 2f. §BATCH 3 (2026-10-10) — THE LOGISTICS HERO is ABSENT ──────────────
/**
 * The owner instructed the removal of the cinematic "fixed camera" Logistics Hero
 * AND its whole pipeline. ABSENCE GUARD (rule 08) — it FAILS if any part of the
 * hero returns: its two renderers, its network derivation, its geometry config and
 * data, the build script that generated the geometry, its own validator and spec,
 * the generated `.geo-cache/` and the two `package.json` scripts that drove them.
 * The full declaration of the removal's file set lives in validate-e6-brand-surfaces
 * (§BATCH3); this group is the consolidated Part-2 record.
 */
const HERO_REMOVED_FILES = [
  'src/components/shared/logistics/LogisticsHero.tsx',
  'src/components/shared/logistics/LogisticsHeroScene.tsx',
  'src/lib/logistics/heroNetwork.ts',
  'src/config/logisticsHero.ts',
  'src/data/logisticsHeroGeo.ts',
  'scripts/build-logistics-hero-geo.mjs',
  'scripts/validate-logistics-hero.mjs',
  'e2e/logistics-hero.spec.ts',
];
for (const p of HERO_REMOVED_FILES) {
  test(`§BATCH3 removed hero file absent: ${p}`, !existsSync(resolve(ROOT, p)));
}
test('§BATCH3 the generated hero geometry cache (.geo-cache/) is GONE',
  !existsSync(resolve(ROOT, '.geo-cache')));
test('§BATCH3 the hero build/validate npm scripts are GONE from package.json',
  !/logistics-hero|hero-geo/.test(readFileSync(resolve(ROOT, 'package.json'), 'utf-8')));
test('§BATCH3 the `.geo-cache` ignore block is GONE from .gitignore',
  !/geo-cache/.test(readFileSync(resolve(ROOT, '.gitignore'), 'utf-8')));
test('§BATCH3 the hub no longer carries a heroLegs mount (comments excluded)',
  !/heroLegs/.test(HUB_SRC) && !/heroLegs/.test(CONTROL_SRC));
/** No live source file under src/ may reference a removed hero module. */
const heroHits = [];
(function walkHero(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) { walkHero(full); continue; }
    if (!/\.tsx?$/.test(name)) continue;
    const body = stripComments(readFileSync(full, 'utf-8'));
    if (/logisticsHero|heroNetwork|LogisticsHeroScene|LogisticsHero\b/.test(body)) heroHits.push(relative(ROOT, full));
  }
})(resolve(ROOT, 'src'));
test('§BATCH3 no live source file under src/ references a removed hero module',
  heroHits.length === 0);
if (heroHits.length) heroHits.forEach((h) => console.log('    ' + h));

// ── 2g. §BATCH 4 (2026-10-10) — THE MERCENTA BRAIN is ABSENT ──────────────
/**
 * The owner instructed the Mercenta Brain's COMPLETE removal ("it serves no
 * purpose"). ABSENCE GUARD (rule 08) — it FAILS if any part returns: the surface,
 * its renderers, its five graph modules, the brand relationship graph, its two
 * dedicated hooks and its runtime harness. The FULL 18-assertion guard (including
 * the whole-src "no file mentions the Brain" scan) is `validate-mercenta-brain.mjs`;
 * this group is the consolidated Part-2 record.
 */
const BRAIN_REMOVED_FILES = [
  'src/components/admin/MercentaBrain.tsx',
  'src/components/brand/BrandRelationshipMap.tsx',
  'src/lib/hooks/useWebglPalette.ts',
  'src/lib/hooks/usePrefersReducedMotion.ts',
  'scripts/brain-runtime-check.ts',
];
for (const p of BRAIN_REMOVED_FILES) {
  test(`§BATCH4 removed Brain file absent: ${p}`, !existsSync(resolve(ROOT, p)));
}
for (const d of ['src/components/shared/brain', 'src/lib/intelligence/brain']) {
  test(`§BATCH4 removed Brain directory absent: ${d}`, !existsSync(resolve(ROOT, d)));
}
const ADMIN_SHELL_SRC = stripComments(readFileSync(resolve(ROOT, 'src/components/layout/AdminShell.tsx'), 'utf-8'));
test('§BATCH4 the admin shell declares no brain destination (comments excluded)',
  !/\bbrain\b/i.test(ADMIN_SHELL_SRC));
test('§BATCH4 Brand Intelligence no longer imports or mounts the relationship graph (comments excluded)',
  !/BrandRelationshipMap/.test(stripComments(readFileSync(resolve(ROOT, 'src/components/brand/BrandIntelligence.tsx'), 'utf-8'))));

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
  test('other communications providers intact (usertour) and the WhatsApp/Twilio one is GONE',
    ['usertour'].every((p) => ids.includes(p)) && !ids.includes('twilio_whatsapp'));
  /**
   * §2026-10-12 — REPOINTED, not weakened. This list held TWO providers
   * ('usertour', 'twilio_whatsapp'). The WhatsApp/Twilio escalation feature was
   * removed on the Owner's instruction (WhatsApp is not needed), so `twilio_whatsapp`
   * left the registry and moved to the ABSENCE assertion just above; the other
   * communications provider survives and no over-removal happened. The §BATCH 5 note
   * below records the earlier Postiz removal the same way.
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
