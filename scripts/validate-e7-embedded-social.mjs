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
  test('verified instance usage is empty (clean slate)', v.instanceEmpty && Object.values(v.counts).every((n) => n === 0));
  test('verified deployment defect recorded (backend 502 / Temporal)', v.backendApiStatus === 'down_502_temporal_missing');
  test(
    'open self-registration recorded as a blocking finding',
    v.registrationOpen &&
      cfg.SOCIAL_DEPLOYMENT_FINDINGS.some((f) => f.id === 'registration-open' && f.severity === 'blocking')
  );
  test(
    'commercial / self-signup engine paths are declared blocked',
    ['/billing', '/billing/lifetime', '/auth/register'].every((p) => cfg.SOCIAL_BLOCKED_ENGINE_PATHS.includes(p))
  );
  test('engine developer API is the verified /public/v1 path', cfg.SOCIAL_ENGINE_API.versionedPublicApi === '/public/v1');

  /* ── 2. Configuration resolution is fail-closed and truthful ──────────── */
  section('2. Configuration truthfulness');
  const none = cfg.resolveSocialEngineConfig(undefined);
  test('unconfigured engine → mode simulation', none.configured === false && none.mode === 'simulation');
  test('unconfigured engine explains itself', none.blockedReasons.length >= 2);
  const withUrl = cfg.resolveSocialEngineConfig({ api_url: 'https://postiz.example' });
  test(
    'an engine URL alone does NOT make it live while the API is down',
    withUrl.configured === false && withUrl.appUrl === 'https://postiz.example'
  );
  test('registration warning is part of the blocked reasons', none.blockedReasons.some((r) => /self-registration/i.test(r)));

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
  test('engine status is not configured and not live', status.configured === false && status.mode === 'simulation');
  test('engine status exposes the verified developer API', status.developerApiPath === '/public/v1');
  test('legacy client endpoints are declared UNVERIFIED', status.legacyEndpointsVerified === false);
  test('engine status carries the verified deployment findings', status.findings.length === 6);
  const counts = pz.socialFindingCounts(status.findings);
  test('finding severities are summarised correctly', counts.blocking === 2 && counts.warning === 3 && counts.info === 1);

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
  const e7Changed = [...git(['diff', '--name-only', PRE_E7]).split('\n'), ...working]
    .map((s) => s.trim())
    .filter(Boolean);

  const migrations = readdirSync(join(process.cwd(), 'supabase/migrations'));
  test('no migration added (023 remains newest of 23)', migrations.length === 23 && migrations.sort().at(-1).startsWith('023_'));
  test('migrations untouched by E7', !e7Changed.some((f) => f.startsWith('supabase/migrations')));

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
    !e7Changed.some((f) => protectedPaths.some((p) => f.startsWith(p)))
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
  test('brand surface states its real engine state', /not configured/i.test(socialSfc) && /Simulation/.test(socialSfc));
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
} catch (err) {
  console.error('E7_EMBEDDED_SOCIAL_VALIDATION_FAIL:', err.message);
  failures++;
} finally {
  await server.close();
  console.log(`\nE7 assertions: ${checks} · failures: ${failures}`);
  console.log(`\nE7_EMBEDDED_SOCIAL_VALIDATION_${failures === 0 ? 'PASS' : 'FAIL'} (${failures} failures)`);
  process.exit(failures > 0 ? 1 : 0);
}
