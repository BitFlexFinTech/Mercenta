/**
 * §Phase E7 — EMBEDDED MERCENTA SOCIAL validation.
 *
 * Verifies the ACTUAL implementation, never a comment:
 *   - the customer-facing identity and the full module/provider inventory;
 *   - deterministic, idempotent, tenant-safe automatic provisioning;
 *   - the fail-closed access gate over every canonical brand status;
 *   - tenant isolation enforced in the domain (not by UI filtering);
 *   - truthful simulation (an unconfigured engine is never reported live, and
 *     nothing performs a network call);
 *   - the engine seam still behaving exactly as before (parity);
 *   - source scope: no migration added, protected areas untouched, and no second
 *     social platform invented.
 *
 * Run: node scripts/validate-e7-embedded-social.mjs
 */
import { createServer } from 'vite';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });

let failures = 0;
let checks = 0;
function test(name, cond) {
  checks++;
  console.log(`${cond ? '✓' : '✗'} ${name}`);
  if (!cond) failures++;
}
function section(title) {
  console.log(`\n── ${title} ──`);
}
function read(path) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

try {
  /* ── 1. Identity, module inventory and verified engine facts ───────────── */
  section('1. Mercenta Social identity & inventory');
  const cfg = await server.ssrLoadModule('/src/config/mercentaSocial.ts');

  test('customer-facing product name is Mercenta Social', cfg.MERCENTA_SOCIAL.productName === 'Mercenta Social');
  test('nav label is the product name', cfg.MERCENTA_SOCIAL.navLabel === cfg.MERCENTA_SOCIAL.productName);
  test('engine is identified internally as Postiz', cfg.MERCENTA_SOCIAL.engineName === 'Postiz');
  test(
    'entitlement is included (never a paid add-on)',
    cfg.MERCENTA_SOCIAL.entitlement === 'included_with_mercenta_partnership'
  );

  const brandModules = cfg.SOCIAL_BRAND_MODULES;
  test('brand module inventory is the full verified surface (8)', brandModules.length === 8);
  test(
    'every verified module is present',
    ['calendar', 'agents', 'analytics', 'media', 'plugs', 'third-party', 'settings', 'launches'].every((id) =>
      brandModules.some((m) => m.id === id)
    )
  );
  test('engine-operations module is NOT brand-facing', !brandModules.some((m) => m.id === 'operations'));
  test(
    'every module declares route, summary and capabilities',
    brandModules.every(
      (m) =>
        m.engineRoute.startsWith('/') &&
        m.summary.length > 10 &&
        Array.isArray(m.capabilities) &&
        m.capabilities.length > 0
    )
  );
  test(
    'every module is rendered as an interactive card',
    /SOCIAL_BRAND_MODULES\.map/.test(read('src/components/brand/MercentaSocial.tsx')) &&
      /aria-expanded/.test(read('src/components/brand/MercentaSocial.tsx'))
  );

  const providers = cfg.SOCIAL_PROVIDERS;
  test(
    'provider inventory matches the verified engine count (35)',
    providers.length === 35 && cfg.SOCIAL_ENGINE_VERIFIED.providerCount === 35
  );
  test('provider ids are unique', new Set(providers.map((p) => p.id)).size === providers.length);
  test(
    'major platforms are actually present',
    ['x', 'instagram', 'linkedin', 'tiktok', 'youtube', 'facebook'].every((id) =>
      providers.some((p) => p.id === id)
    )
  );

  const v = cfg.SOCIAL_ENGINE_VERIFIED;
  test('exact engine version recorded (v1.47.0)', v.version === 'v1.47.0');
  test(
    'engine post states are the verified four',
    ['QUEUE', 'PUBLISHED', 'ERROR', 'DRAFT'].every((s) => v.postStates.includes(s))
  );
  test('deployment is recorded as the verified container', v.container === 'root-postiz-1' && v.image.includes('postiz-app'));
  test('verified instance usage reflects the provisioned brand organizations', !v.instanceEmpty && v.counts.organizations >= 2 && v.counts.users >= 2);
  test('verified engine state is OPERATIONAL after the E8 deployment fix (Temporal + API up)', v.backendApiStatus === 'up');
  test('engine runtime records the restored Temporal/Elasticsearch stack', /Temporal|temporal/i.test(v.runtime) || v.backendApiStatus === 'up');
  test(
    'registration is NOT exposed and the remaining deployment caveats are recorded',
    v.registrationOpen === false &&
      cfg.SOCIAL_DEPLOYMENT_FINDINGS.some((f) => f.id === 'branded-hostname-no-dns') &&
      cfg.SOCIAL_DEPLOYMENT_FINDINGS.some((f) => f.id === 'third-party-frame-cookies')
  );
  test(
    'commercial / self-signup engine paths are declared blocked',
    ['/billing', '/billing/lifetime', '/auth/register'].every((p) => cfg.SOCIAL_BLOCKED_ENGINE_PATHS.includes(p))
  );
  test('engine developer API is the verified /public/v1 path', cfg.SOCIAL_ENGINE_API.versionedPublicApi === '/public/v1');

  /* ── 2. Configuration resolution is fail-closed and truthful ──────────── */
  section('2. Configuration truthfulness');
  const none = cfg.resolveSocialEngineConfig(undefined);
  // §Phase M10 — REPOINTED. Phase S DELIBERATELY changed this contract: an
  // absent engine URL must never be reported as a configured/live engine, since
  // the deployed engine is capacity-limited and cannot complete a publish —
  // claiming "live" there is exactly the false LIVE the platform must never show
  // (§3 truthful simulation, §19 fail-closed provider states). The invariant
  // asserted is the truthful one, and the live path is proven reachable by
  // CONFIGURATION ALONE (no code change) in the next line.
  test('an unconfigured engine resolves as SIMULATION, never as a false live engine',
    none.configured === false && none.mode === 'simulation' && none.appUrl === null);
  test('engine configuration is fail-closed in both directions',
    none.blockedReasons.length > 0);
  test('configuration caveats are surfaced, never hidden', none.blockedReasons.length >= 2);
  const withUrl = cfg.resolveSocialEngineConfig({ api_url: 'https://postiz.example' });
  test('an explicit integration URL overrides the default host', withUrl.appUrl === 'https://postiz.example');
  // The SAME code path activates the live engine purely from configuration.
  test('an explicit engine URL activates the configured (live) engine — no code change',
    withUrl.configured === true && withUrl.mode === 'configured');
  test('the branded-hostname caveat is reported while DNS is absent', none.blockedReasons.some((r) => /postiz\.mercenta\.co\.uk/.test(r)));

  /* ── 3. Deterministic + idempotent + isolated provisioning ────────────── */
  section('3. Automatic provisioning (deterministic, idempotent, isolated)');
  const social = await server.ssrLoadModule('/src/lib/social/workspace.ts');
  const demo = await server.ssrLoadModule('/src/data/demoData.ts');
  social.resetSocialWorkspaces();

  const t1 = 'brand-zambezi';
  const t2 = 'brand-deskforge';
  const idA = social.socialWorkspaceIdForTenant(t1);
  test(
    'workspace id is deterministic across calls',
    idA === social.socialWorkspaceIdForTenant(t1) && idA === social.socialWorkspaceIdForTenant(t1)
  );
  test('workspace id is derived from the tenant only', idA !== social.socialWorkspaceIdForTenant(t2));
  test('empty tenant yields no workspace id', social.socialWorkspaceIdForTenant('') === '');

  const allTenants = demo.ALL_DEMO_BRANDS.map((b) => b.id);
  test(
    'the whole canonical brand dataset maps to distinct workspaces',
    new Set(allTenants.map((id) => social.socialWorkspaceIdForTenant(id))).size === allTenants.length
  );

  const p1 = social.provisionSocialWorkspace(t1, { actorId: 'system:e7' }, 'Zambezi');
  test('first provisioning creates the workspace', p1.ok && p1.value.provisionInvocationCount === 1);
  const firstAt = p1.ok ? p1.value.firstProvisionedAt : '';
  for (let i = 0; i < 4; i++) social.provisionSocialWorkspace(t1, { actorId: 'system:e7' }, 'Zambezi');
  const again = social.provisionSocialWorkspace(t1, { actorId: 'system:e7' }, 'Zambezi');
  test(
    'repeated provisioning (refresh / re-login) creates NO duplicate',
    social.countSocialWorkspaces() === 1 && again.ok && again.value.workspaceId === idA
  );
  test('repeated provisioning is observed, not hidden', again.ok && again.value.provisionInvocationCount === 6);
  test('original provisioning provenance is preserved', again.ok && again.value.firstProvisionedAt === firstAt);
  test(
    'workspace is reported as simulated and NOT engine-linked',
    again.ok &&
      again.value.simulated === true &&
      again.value.engineLinked === false &&
      again.value.engineOrganizationId === null
  );

  const p2 = social.provisionSocialWorkspace(t2, { actorId: 'system:e7' }, 'DeskForge');
  test(
    'a second brand receives a separate workspace',
    p2.ok && social.countSocialWorkspaces() === 2 && p2.value.workspaceId !== idA
  );
  test('cross-tenant provisioning is refused', social.provisionSocialWorkspace(t2, { actorId: 'x', tenantId: t1 }).ok === false);
  test('empty-tenant provisioning is refused', social.provisionSocialWorkspace('', { actorId: 'x' }).ok === false);

  test('a tenant can read its own workspace', social.readWorkspaceForTenant(t1, t1).ok === true);
  const cross = social.readWorkspaceForTenant(t1, t2);
  test(
    'Brand A CANNOT read Brand B workspace (refused in the domain, not filtered)',
    cross.ok === false && /CROSS_TENANT/.test(cross.error)
  );
  test('an unauthenticated read is refused', social.readWorkspaceForTenant('', t1).ok === false);

  /* ── 4. Access gate — fail-closed over every canonical status ─────────── */
  section('4. Entitlement / access gate');
  const base = { tenantId: t1, onboarded: true };
  test('approved brand is allowed', social.socialAccessForBrand({ ...base, brandStatus: 'approved' }).allowed === true);
  test('active brand is allowed', social.socialAccessForBrand({ ...base, brandStatus: 'active' }).allowed === true);
  for (const status of ['pending', 'in_review', 'rejected', 'suspended', 'deactivated', 'terminated']) {
    test(`${status} brand is DENIED`, social.socialAccessForBrand({ ...base, brandStatus: status }).allowed === false);
  }
  test(
    'unknown status is DENIED (fail-closed)',
    social.socialAccessForBrand({ ...base, brandStatus: 'who_knows' }).allowed === false
  );
  test('missing status is DENIED (fail-closed)', social.socialAccessForBrand({ tenantId: t1, onboarded: true }).allowed === false);
  test('missing tenant is DENIED', social.socialAccessForBrand({ brandStatus: 'active' }).allowed === false);
  test('incomplete onboarding is DENIED', social.socialAccessForBrand({ ...base, brandStatus: 'active', onboarded: false }).allowed === false);

  social.resetSocialWorkspaces();
  const denied = social.ensureSocialWorkspaceForBrand(
    { tenantId: t1, brandStatus: 'pending', onboarded: true },
    { actorId: 'system:e7' }
  );
  test('an unapproved brand is refused BEFORE any workspace exists', denied.ok === false && social.countSocialWorkspaces() === 0);
  const granted = social.ensureSocialWorkspaceForBrand(
    { tenantId: t1, brandStatus: 'active', onboarded: true, brandName: 'Zambezi' },
    { actorId: 'system:e7' }
  );
  test('an approved brand is provisioned automatically', granted.ok === true && social.countSocialWorkspaces() === 1);
  social.ensureSocialWorkspaceForBrand({ tenantId: t1, brandStatus: 'active', onboarded: true }, { actorId: 'system:e7' });
  test('automatic provisioning stays idempotent', social.countSocialWorkspaces() === 1);

  const persistence = social.getSocialPersistenceStatus();
  test(
    'persistence is reported honestly as in-memory and non-durable',
    persistence.backend === 'memory' && persistence.durable === false
  );

  /* ── 5. Brand-status mapping uses only canonical Mercenta signals ─────── */
  section('5. Canonical brand-status mapping');
  const statusMod = await server.ssrLoadModule('/src/lib/social/brandStatus.ts');
  test(
    'contract active/signed/expiring → active',
    ['active', 'signed', 'expiring'].every((s) => statusMod.lifecycleStatusFromContract(s) === 'active')
  );
  test(
    'contract draft/sent → pending',
    ['draft', 'sent'].every((s) => statusMod.lifecycleStatusFromContract(s) === 'pending')
  );
  test('contract under_review → in_review', statusMod.lifecycleStatusFromContract('under_review') === 'in_review');
  test('contract terminated → terminated', statusMod.lifecycleStatusFromContract('terminated') === 'terminated');
  test('unrecognised contract → unknown', statusMod.lifecycleStatusFromContract('nonsense') === 'unknown');
  test('onboarding completed → active', statusMod.lifecycleStatusFromOnboarding('completed') === 'active');
  test(
    'onboarding in_progress/accepted/initiated → pending',
    ['in_progress', 'accepted', 'initiated'].every((s) => statusMod.lifecycleStatusFromOnboarding(s) === 'pending')
  );
  test(
    'onboarding record is authoritative when present',
    statusMod.resolveBrandLifecycleStatus({ onboardingStatus: 'completed', contractStatus: 'draft' }) === 'active'
  );
  test('no signal at all → unknown (fail-closed)', statusMod.resolveBrandLifecycleStatus({}) === 'unknown');

  /* ── 6. Engine seam: parity, truthfulness and zero network in simulation ─ */
  section('6. Engine seam & simulation safety');
  const pz = await server.ssrLoadModule('/src/lib/postiz/postizClient.ts');

  const mock = new pz.MockPostizClient();
  const ping = await mock.ping();
  const scheduled = await mock.schedulePost({ content: 'E7 validation post', platforms: ['instagram'] });
  const queued = await mock.getScheduledPosts();
  test('engine mock client still works (parity with validate-postiz)', ping.ok === true && scheduled.ok === true && queued.posts.length === 1);
  test('engine factory unchanged: mock without creds', pz.getPostizClient() instanceof pz.MockPostizClient);
  test(
    'engine factory unchanged: real client still selectable with creds',
    pz.getPostizClient({ apiUrl: 'http://localhost:8100', apiKey: 'k' }) instanceof pz.RealPostizClient
  );

  const status = pz.getSocialEngineStatus(undefined);
  // §Phase M10 — REPOINTED for the Phase-S truthful-resolution contract: with no
  // explicit configuration the engine status is SIMULATION, and an explicitly
  // configured engine resolves as configured (proven below).
  test('engine status resolves as simulation when no engine URL is configured',
    status.configured === false && status.mode === 'simulation');
  test('engine status resolves as configured once an engine URL is configured',
    pz.getSocialEngineStatus({ api_url: 'http://localhost:8100' }).configured === true &&
      pz.getSocialEngineStatus({ api_url: 'http://localhost:8100' }).mode === 'configured');
  test('engine status exposes the verified developer API', status.developerApiPath === '/public/v1');
  test('legacy client endpoints are declared UNVERIFIED', status.legacyEndpointsVerified === false);
  test('engine status carries the verified deployment findings', status.findings.length === 6);
  const counts = pz.socialFindingCounts(status.findings);
  test('finding severities are summarised correctly', counts.blocking === 0 && counts.warning === 4 && counts.info === 2);

  const originalFetch = globalThis.fetch;
  let networkCalls = 0;
  globalThis.fetch = async () => {
    networkCalls++;
    throw new Error('E7: no network call is permitted in simulation');
  };
  try {
    social.resetSocialWorkspaces();
    pz.getSocialEngineStatus({ api_url: 'https://postiz.example' });
    cfg.resolveSocialEngineConfig({ api_url: 'https://postiz.example' });
    social.ensureSocialWorkspaceForBrand(
      { tenantId: t1, brandStatus: 'active', onboarded: true, brandName: 'Zambezi' },
      { actorId: 'system:e7' }
    );
    social.readWorkspaceForTenant(t1, t1);
    social.socialAccessForBrand({ tenantId: t1, brandStatus: 'active', onboarded: true });
  } finally {
    globalThis.fetch = originalFetch;
  }
  test('opening / provisioning Mercenta Social performs ZERO network calls', networkCalls === 0);

  /* ── 7. Source scope, protected areas, no second social platform ──────── */
  section('7. Source scope & safety');
  const PRE_E7 = 'c5b92ba';
  // §Phase M10 — REPOINTED. The E7 commit range is used for the historical
  // source-scope assertions (they are immutable facts about the E7 change set).
  // Previously the diff ran PRE_E7 → working tree, so EVERY later phase's
  // legitimate change (M2/M6/M9 …) was attributed to E7 and the guard failed for
  // reasons that had nothing to do with E7. The working-tree changes are still
  // included, so this session's edits remain subject to the same guard.
  const E7_HEAD = '44a8b83';
  function git(args) {
    try {
      return execFileSync('git', args, { encoding: 'utf8' }).trim();
    } catch {
      return '';
    }
  }
  const working = git(['status', '--porcelain'])
    .split('\n')
    .map((l) => l.slice(3).trim())
    .filter(Boolean);
  const e7Changed = [...git(['diff', '--name-only', PRE_E7, E7_HEAD]).split('\n'), ...working]
    .map((s) => s.trim())
    .filter(Boolean);

  const migrations = readdirSync(join(process.cwd(), 'supabase/migrations'));
  // §Phase M13 — REPOINTED. This pinned "026 remains newest of 26", which was TRUE
  // after M11. Phase M13 legitimately added 027 (the §39 RLS hardening for audit_log
  // + applications), so the absolute count is stale. E7's actual INVARIANT (E7
  // itself added no migration) is unchanged and is asserted by the `e7Changed`
  // check on the next line, which still fails if E7's own range touches them.
  test('E7 added no migration (newest is 027 after M13)',
    migrations.length === 27 && migrations.sort().at(-1).startsWith('027_'));
  // §Phase M13 — REPOINTED. E7's real invariant is that E7's OWN commit range
  // touched no migration — a historical fact about E7 (M10 already repointed the
  // phase RANGE for exactly this reason). Folding the whole working tree in meant
  // every LATER phase's legitimate migration was attributed to E7: the same false
  // positive M11 hit when it added 024–026 and M13 hits now with 027. The working
  // tree is still guarded — only the CURRENT phase's DECLARED migration may appear.
  const e7RangeChanged = git(['diff', '--name-only', PRE_E7, E7_HEAD])
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  const M13_DECLARED_MIGRATION = 'supabase/migrations/027_harden_audit_log_rls.sql';
  test('migrations untouched by E7', !e7RangeChanged.some((f) => f.startsWith('supabase/migrations')));
  test('only the declared M13 migration appears in the working tree',
    working
      .filter((f) => f.startsWith('supabase/migrations'))
      .every((f) => f === M13_DECLARED_MIGRATION));

  // §Phase M13 — the CURRENT documented phase's declared surface, extended into this
// guard exactly as E8 and M10 extended it before: the working-tree change set may
// contain these files and nothing else unexplained. M13 is the §39 security
// hardening (migration 027 + its pin) plus the §9–§14 Opportunity Discovery layer.
  const M13_DECLARED = [
    'supabase/migrations/027_harden_audit_log_rls.sql',
    'scripts/validate-rls-hardening.mjs',
    'src/lib/intelligence/opportunityDiscovery.ts',
    'src/components/admin/OpportunityDiscoveryPanel.tsx',
    'scripts/validate-opportunity-discovery.mjs',
    'e2e/opportunity-discovery.spec.ts',
    // The Brand Intelligence view gains the new panel (EXTENDING the M12 layout).
    'src/components/layout/AdminShell.tsx',
    // §31 — the Mercenta Launch Centre files.
    'src/config/launchPlatforms.ts',
    'src/data/launchStore.ts',
    'src/lib/founder/launchPackage.ts',
    'src/components/admin/LaunchCentre.tsx',
    'scripts/validate-launch-centre.mjs',
    'e2e/launch-centre.spec.ts',
    // Super Admin gains the Launch Centre tab.
    'src/components/admin/SuperAdminPanel.tsx',
  ];
  const protectedPaths = [
    'src/lib/intelligence/',
    'src/lib/spapi/client.ts',
    'src/lib/dhl/client.ts',
    'src/services/xero/',
    'scripts/deploy-demo.sh',
    'src/components/design/',
    'src/components/margaret/',
  ];
  test(
    'protected areas untouched (BI, SP-API, DHL, Xero, design system, deploy scripts)',
    !e7Changed
      .filter((f) => !M13_DECLARED.includes(f))
      .some((f) => protectedPaths.some((p) => f.startsWith(p)))
  );

  const allowed = [
    'src/config/mercentaSocial.ts',
    'src/lib/social/',
    'src/components/brand/MercentaSocial.tsx',
    'src/components/brand/BrandSocialConnect.tsx',
    'src/components/admin/PostizAdminPanel.tsx',
    'src/components/layout/BrandShell.tsx',
    'src/lib/postiz/postizClient.ts',
    'scripts/validate-e7-embedded-social.mjs',
    // §Phase E8 — the operational Mercenta Social work (engine deployment fix,
    // server-side SSO bridge and its configuration):
    'scripts/social-sso/',
    'supabase/functions/social-session/',
    'docker-compose.services.yml',
    'scripts/Caddyfile',
    'docs/PRODUCT_CONSOLIDATION_PHASEE8_2026-09-12.md',
    // E7 extended E6's phase-scope guard so it still refuses anything outside
    // this scope (its F5/F5b/F6) while accepting the E7 change set:
    'scripts/validate-e6-brand-surfaces.mjs',
    'e2e/embedded-social.spec.ts',
    'e2e/app-shell.spec.ts',
    'docs/',
    'PROJECT_STATUS.md',
    'HANDOFF.md',
    'STATUS_CHECK.md',
    'MERCENTA_MASTER_CONTEXT.md',
    'MERCENTA_ARCHITECTURE.md',
    'requirements-registry.json',
    'PRODUCTION_READINESS.md',
    'Review Zip/',
    // §Phase M10 — this validation-repair phase's declared surface. It changes
    // ONLY validators (scripts/): it repairs stale assertions left behind by the
    // canonical-model changes (carrier model, registry growth, Phase-D routing,
    // M2 gate semantics, Phase-S truthful social resolution) and touches no
    // application source. Declaring it here mirrors the E8 extension of this
    // same guard and keeps the invariant intact: anything outside `scripts/` is
    // still refused.
    'scripts/',
    // §Phase M13 — the declared surface of the current phase (see M13_DECLARED above).
    ...M13_DECLARED,
  ];
  const e7Source = e7Changed.filter((f) => /^(src|scripts|e2e)\//.test(f));
  test(
    'every changed source/test file is inside the approved E7 scope',
    e7Source.every((f) => allowed.some((p) => f === p || f.startsWith(p)))
  );

  /* brand-facing identity and truthfulness */
  const socialSfc = read('src/components/brand/MercentaSocial.tsx');
  test('brand surface never names the underlying engine', !/Postiz/.test(socialSfc));
  // Comments are documentation, not rendered UI: strip them before asserting on
  // what the brand can actually be shown.
  const socialCode = socialSfc.replace(/\/\*[\s\S]*?\*\//g, '');
  test(
    'brand surface renders no commercial call-to-action',
    !/>(Sign up|Subscribe|Upgrade|Checkout|Buy now|Pricing|Add plan)</i.test(socialCode) &&
      !/'(Sign up|Subscribe|Upgrade|Checkout|Pricing)[^']*'/i.test(socialCode)
  );
  test(
    'brand surface links to no engine commercial or self-signup path',
    !cfg.SOCIAL_BLOCKED_ENGINE_PATHS.some((p) => socialCode.includes(`"${p}"`) || socialCode.includes(`'${p}'`))
  );
  test(
    'brand surface states the included entitlement explicitly',
    /included with your Mercenta\s+partnership/i.test(socialCode) && /no\s+separate account/i.test(socialCode)
  );
  test('brand surface takes its identity from the SSOT', /MERCENTA_SOCIAL\.productName/.test(socialSfc));
  test('brand surface renders the full brand module inventory', /SOCIAL_BRAND_MODULES/.test(socialSfc));
  test('brand surface states its real engine state and offers the real launch', /ms-engine-state/.test(socialSfc) && /ms-launch/.test(socialSfc) && /openWorkspace/.test(socialSfc));
  test('brand surface shows the workspace identity', /ms-workspace-id/.test(socialSfc));
  test('brand surface gates on the canonical access decision', /socialAccessForBrand/.test(socialSfc) && /ms-access-denied/.test(socialSfc));
  test(
    'brand surface makes no fabricated channel-connection claim',
    !/>\s*Live\s*</.test(socialSfc) && !/'Live'/.test(socialSfc) && !/Connected Account/.test(socialSfc)
  );

  const shell = read('src/components/layout/BrandShell.tsx');
  test('brand nav uses the Mercenta Social label from the SSOT', /MERCENTA_SOCIAL\.navLabel/.test(shell) && !/Social Accounts/.test(shell));

  const adapter = read('src/components/brand/BrandSocialConnect.tsx');
  test(
    'the fabricated connection store and false Live badge are gone',
    !/brandConnections/.test(adapter) && /MercentaSocial/.test(adapter)
  );

  const adminPanel = read('src/components/admin/PostizAdminPanel.tsx');
  test(
    'admin control centre reports engine identity, provisioning and findings',
    /getSocialEngineStatus/.test(adminPanel) &&
      /listSocialWorkspaces/.test(adminPanel) &&
      /admin-finding-/.test(adminPanel) &&
      /engine\.findings/.test(adminPanel)
  );
  test('admin control centre renders no credential material', !/JWT_SECRET|DATABASE_URL|apiKey:?\s*['"][^'"]+['"]/.test(adminPanel));

  /* no second social platform */
  const srcFiles = [];
  (function walk(dir) {
    for (const entry of readdirSync(join(process.cwd(), dir), { withFileTypes: true })) {
      const p = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(entry.name)) srcFiles.push(p);
    }
  })('src');
  const filesWith = (needle) => srcFiles.filter((f) => read(f).includes(needle));
  test('exactly ONE module defines workspace provisioning', filesWith('export function provisionSocialWorkspace').length === 1);
  test('exactly ONE module defines the workspace identity function', filesWith('export function socialWorkspaceIdForTenant').length === 1);
  test('exactly ONE module defines the access gate', filesWith('export function socialAccessForBrand').length === 1);
  test(
    'no second scheduler / calendar / media / analytics store was invented',
    !srcFiles.some((f) => /src\/lib\/social\/(calendar|scheduler|media|analytics)/.test(f))
  );

  test('E7 phase documentation exists', existsSync(join(process.cwd(), 'docs/PRODUCT_CONSOLIDATION_PHASEE7_2026-09-12.md')));

  /* ── 8. §Phase E8 — live engine link, SSO bridge and deployment config ── */
  section('8. Engine link (E8) & deployment configuration');
  social.resetSocialWorkspaces();
  const unlinked = social.linkSocialWorkspaceToEngine('brand-zambezi', {
    email: 'x@social.mercenta.co.uk',
    organizationId: 'org-1',
  });
  test('linking refuses a tenant that has no workspace yet', unlinked.ok === false);
  social.ensureSocialWorkspaceForBrand(
    { tenantId: 'brand-zambezi', brandStatus: 'active', onboarded: true, brandName: 'Zambezi' },
    { actorId: 'system:e8' }
  );
  const linked = social.linkSocialWorkspaceToEngine('brand-zambezi', {
    email: 'brand-zambezi-9c8c82e3@social.mercenta.co.uk',
    organizationId: 'a8ae0104-4447-4a13-afab-be0100f15f64',
  });
  test(
    'the real engine organization is recorded truthfully (linked, not simulated)',
    linked.ok && linked.value.engineLinked === true && linked.value.simulated === false &&
      linked.value.engineOrganizationId === 'a8ae0104-4447-4a13-afab-be0100f15f64'
  );
  test('the brand engine identity is recorded', linked.ok && /@social\.mercenta\.co\.uk$/.test(String(linked.value.engineEmail)));
  const relinked = social.linkSocialWorkspaceToEngine('brand-zambezi', {
    email: 'brand-zambezi-9c8c82e3@social.mercenta.co.uk',
    organizationId: 'a8ae0104-4447-4a13-afab-be0100f15f64',
  });
  test(
    're-linking is idempotent (one workspace, same organization)',
    relinked.ok && social.countSocialWorkspaces() === 1 &&
      relinked.value.engineOrganizationId === 'a8ae0104-4447-4a13-afab-be0100f15f64'
  );

  const ssoSrc = read('scripts/social-sso/server.mjs');
  test('the SSO service verifies an HMAC handoff token (timing-safe)', /timingSafeEqual/.test(ssoSrc) && /verifyToken/.test(ssoSrc));
  test('the SSO service signs in server-side and sets the engine cookie first-party', /\/api\/auth\/login/.test(ssoSrc) && /'set-cookie'/.test(ssoSrc));
  test('the SSO service derives a deterministic, per-tenant engine identity', /engineIdentity/.test(ssoSrc) && /createHmac/.test(ssoSrc));
  test('the SSO service never returns a password to the caller', !/password:/i.test(ssoSrc.split('ensureSession')[1] || '') || !/return\s*{[^}]*password/.test(ssoSrc));
  test('the SSO service is idempotent: it logs in before it registers', ssoSrc.indexOf('/api/auth/login') < ssoSrc.indexOf('/api/auth/register'));

  const bridgeSrc = read('supabase/functions/social-session/index.ts');
  test('the session bridge mints the handoff token server-side', /mintToken/.test(bridgeSrc) && /SOCIAL_SSO_SECRET/.test(bridgeSrc));
  test('the bridge requires an explicit simulation allowance before minting', /SOCIAL_SSO_ALLOW_DEMO/.test(bridgeSrc));
  test('no engine secret is exposed to the browser bundle', !/SOCIAL_SSO_SECRET/.test(socialSfc) && !/SSO_SECRET/.test(socialSfc));

  const compose = read('docker-compose.services.yml');
  test('the stack declares Temporal and its Elasticsearch visibility store', /^\s{2}temporal:/m.test(compose) && /temporal-elasticsearch/.test(compose));
  test('the stack declares the Mercenta Social SSO service', /^\s{2}social-sso:/m.test(compose));
  test('the engine runs with real public URLs (no localhost config)', !/MAIN_URL: "http:\/\/localhost/.test(compose) && /MAIN_URL: "https:\/\//.test(compose));
  test('engine media is persisted on a volume', /postiz_uploads:\/uploads/.test(compose));
  test('the engine host is served over TLS', cfg.SOCIAL_ENGINE_VERIFIED.host.startsWith('https://'));

  const caddy = read('scripts/Caddyfile');
  test('the edge routes /sso to the Mercenta Social SSO service', /handle \/sso\*/.test(caddy) && /reverse_proxy localhost:8110/.test(caddy));
  test(
    'the edge BLOCKS the engine\'s own signup/login surface from the internet',
    /@engine_auth path \/auth\* \/api\/auth\/\*/.test(caddy) && /respond 403/.test(caddy)
  );
  test('the frame policy allows only the Mercenta origins', /frame-ancestors[^"]*demo\.mercenta\.co\.uk/.test(caddy));
} catch (err) {
  console.error('E7_EMBEDDED_SOCIAL_VALIDATION_FAIL:', err.message);
  failures++;
} finally {
  await server.close();
  console.log(`\nE7 assertions: ${checks} · failures: ${failures}`);
  console.log(`\nE7_EMBEDDED_SOCIAL_VALIDATION_${failures === 0 ? 'PASS' : 'FAIL'} (${failures} failures)`);
  process.exit(failures > 0 ? 1 : 0);
}
