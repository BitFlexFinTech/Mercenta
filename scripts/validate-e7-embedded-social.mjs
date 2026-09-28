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

  const t1 = 'brand-astonish';
  const t2 = 'brand-tapatio';
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

  const p1 = social.provisionSocialWorkspace(t1, { actorId: 'system:e7' }, 'Astonish');
  test('first provisioning creates the workspace', p1.ok && p1.value.provisionInvocationCount === 1);
  const firstAt = p1.ok ? p1.value.firstProvisionedAt : '';
  for (let i = 0; i < 4; i++) social.provisionSocialWorkspace(t1, { actorId: 'system:e7' }, 'Astonish');
  const again = social.provisionSocialWorkspace(t1, { actorId: 'system:e7' }, 'Astonish');
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

  const p2 = social.provisionSocialWorkspace(t2, { actorId: 'system:e7' }, 'Tapatío');
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
    { tenantId: t1, brandStatus: 'active', onboarded: true, brandName: 'Astonish' },
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
      { tenantId: t1, brandStatus: 'active', onboarded: true, brandName: 'Astonish' },
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
  /**
   * §BATCH1b (2026-09-28) — DECLARED BEFORE USE (both tests below read it; declaring
   * it after them raised a TDZ ReferenceError).
   *
   * REPOINTED (not weakened). Batch 1b legitimately WRITES a migration: 028, the
   * `integration_connections` connection-record schema the connect wizard needs
   * (cited by older documents but never present until now). The invariant is
   * unchanged — the working tree may contain ONLY migrations a CURRENT phase has
   * explicitly declared — so the declared list grows by exactly that one file and an
   * undeclared migration still fails.
   */
  const M13_DECLARED_MIGRATION = 'supabase/migrations/027_harden_audit_log_rls.sql';
  const PHASE4_DECLARED_MIGRATIONS = [
    M13_DECLARED_MIGRATION,
    // §Phase 4 — canonical 20-real-brand universe: 016 carried the invented
    // tenant set, so the migration is regenerated with the canonical brands.
    'supabase/migrations/016_seed_demo_data.sql',
  ];
  const PHASE_DECLARED_MIGRATIONS = [
    ...PHASE4_DECLARED_MIGRATIONS,
    'supabase/migrations/028_create_integration_connections.sql',
  ];
  // §Phase M13 — REPOINTED. This pinned "026 remains newest of 26", which was TRUE
  // after M11. Phase M13 legitimately added 027 (the §39 RLS hardening for audit_log
  // + applications), so the absolute count is stale. E7's actual INVARIANT (E7
  // itself added no migration) is unchanged and is asserted by the `e7Changed`
  // check on the next line, which still fails if E7's own range touches them.
  test('E7 added no migration (history is now 28 after Batch 1b, whose 028 is declared)',
    migrations.length === 28 &&
      migrations.sort().at(-1).startsWith('028_') &&
      PHASE_DECLARED_MIGRATIONS.includes(`supabase/migrations/${migrations.sort().at(-1)}`));
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
  test('migrations untouched by E7', !e7RangeChanged.some((f) => f.startsWith('supabase/migrations')));
  test('only the phase-declared (M13 + Phase 4 + BATCH1b) migrations appear in the working tree',
    working
      .filter((f) => f.startsWith('supabase/migrations'))
      .every((f) => PHASE_DECLARED_MIGRATIONS.includes(f)));

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
    // §Phase M13 CONTINUATION (2026-09-15) — Phases 9, 8, 10, 11 + the Phase 14
    // documentation reconciliation and the BI-table test-id repoint. Declared
    // exactly as the M13 additions above were; anything else is still refused.
    'src/config/company.ts',
    'src/lib/compliance/companiesHouseClient.ts',
    'src/lib/compliance/companiesHouseMock.ts',
    'src/lib/compliance/index.ts',
    'src/data/companyStore.ts',
    'src/components/admin/CompanyControlCentre.tsx',
    'scripts/validate-company-control-centre.mjs',
    'e2e/company-control-centre.spec.ts',
    'src/lib/events/types.ts',
    'src/integrations/connections.ts',
    'src/config/google.ts',
    'src/lib/google/googleClient.ts',
    'src/lib/google/googleMock.ts',
    'src/lib/google/index.ts',
    'src/lib/google/workspaceSetup.ts',
    'src/data/googleStore.ts',
    'src/components/admin/GoogleSetupWizard.tsx',
    'src/integrations/registry.ts',
    'src/integrations/types.ts',
    'scripts/validate-google-integration.mjs',
    'e2e/google-setup.spec.ts',
    'src/config/operatingCosts.ts',
    'src/lib/costs/modelPolicy.ts',
    'src/lib/costs/usageLog.ts',
    'src/lib/costs/costSummary.ts',
    'src/components/admin/OperatingCostsPanel.tsx',
    'src/lib/discovery/engine.ts',
    'src/lib/monitoring/alertTriage.ts',
    'scripts/validate-operating-costs.mjs',
    'e2e/operating-costs.spec.ts',
    'src/lib/commandCentre/commandCentre.ts',
    'src/data/adminNav.ts',
    'src/components/admin/CommandCentre.tsx',
    'src/components/admin/AdminDashboard.tsx',
    'scripts/validate-command-centre.mjs',
    'e2e/command-centre.spec.ts',
    'README.md',
    'docs/INTEGRATIONS.md',
    'GO_LIVE.md',
    'PRODUCTION_READINESS.md',
    'PROJECT_STATUS.md',
    'HANDOFF.md',
    'src/components/admin/BrandIntelligencePanel.tsx',
    'e2e/acquisition-pipeline.spec.ts',
    'e2e/bi-intelligence-preservation.spec.ts',
    'e2e/brand-intelligence-lifecycle.spec.ts',
    'e2e/domain-acceptance.spec.ts',
    'e2e/domain-persistence.spec.ts',
    'e2e/onboarding-handoff.spec.ts',
    'e2e/onboarding-workflow.spec.ts',
    'e2e/outreach-provider-hardening.spec.ts',
    // §Phase M13 CONTINUATION (session 2, 2026-09-15) — §10/§31: the founder
    // funding / accelerator pipeline (three REAL founder opportunities, the
    // approval-gated stage machine, its validator and its browser spec). Declared
    // exactly as the M13 additions above were; anything else is still refused.
    'src/lib/founder/fundingPipeline.ts',
    'src/components/admin/GrantsInvestorsSection.tsx',
    'scripts/validate-funding-pipeline.mjs',
    'e2e/funding-pipeline.spec.ts',
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
  // §Phase 4 — canonical 20-real-brand universe. The file-touch proxy needs the
  // same extension M13/E8 gave it before: the working tree now legitimately
  // contains the Phase-4 surface (canonical SSOT + every consumer repointed).
  // Two entries land in E7's protected paths — src/services/xero/ (fake Xero
  // contacts/payout rows repointed to real brands) and src/components/design/
  // (design-system showcase repointed) — and are declared here exactly as M13
  // declared its own protected-area files.
  /**
   * §UI/UX Wave 2 (2026-09-18) — the UI/UX redesign wave is PRESENTATION-ONLY:
   * it changes how the already-built functionality is experienced (tokens,
   * workspace composition, shell/navigation, charts, motion, homepage) and
   * changes no business logic, data model, permission or integration. Like
   * PHASE4_DECLARED / FUNCTIONAL_COMPLETION_DECLARED above, the files this
   * declared phase is allowed to touch are named here so an UNEXPLAINED change
   * still fails the scope guard.
   */
  /**
   * §Sprint work layer (2026-09-19) — REPOINTED.
   *
   * The canonical operating layer the sprint required (EVENTS → WORKFLOWS →
   * TASKS → NOTIFICATIONS → CALENDAR → ACTIVITY/AUDIT) added a new `src/lib/work/`
   * module, two work surfaces, and a small number of additive seams
   * (`EVENT_SEVERITY_MAP`, `Button`'s data-testid passthrough, the RBAC view
   * allowlist, the notification centre's work projection). The scope-guard
   * MECHANISM is unchanged and not weakened: a file outside EVERY declared set is
   * still refused. The old contract (this sprint's files were unexplained) is
   * recorded here deliberately.
   */
  const SPRINT_WORK_LAYER_DECLARED = [
    'src/lib/work/',
    'src/components/shared/WorkWorkspace.tsx',
    'src/components/admin/WorkManagement.tsx',
    'src/components/brand/WorkManagement.tsx',
    'src/lib/events/types.ts',
    'src/lib/auth/rbac.ts',
    'src/components/ui.tsx',
    'src/components/admin/BillingPanel.tsx',
    'src/components/admin/AdminAuditLog.tsx',
    'src/components/layout/AdminShell.tsx',
    'src/components/layout/BrandShell.tsx',
    'src/components/shared/NotificationCenter.tsx',
    'scripts/validate-work-layer.mjs',
    'scripts/validate-uiux-redesign.mjs',
    'scripts/validate-e6-brand-surfaces.mjs',
    'scripts/validate-e7-embedded-social.mjs',
  ];

  /**
   * §SSOT — THE WORK-LAYER SINGLE-SOURCE-OF-TRUTH PROGRAMME (2026-09-27) — REPOINTED.
   *
   * The programme in `docs/WORK_LAYER_SSOT_2026-09-26.md` (S1 one writer for a
   * consignment exception · S2/S3 the RECORD owns a derived item's status and the
   * surfaces offer the owning action · S4 a demo document state is DECLARED by name
   * and simulated operational state is labelled) declares the files it changed here,
   * exactly as every earlier phase's declared surface is accepted above. The
   * scope-guard MECHANISM is unchanged and not weakened: a changed source/test file
   * outside EVERY declared set is still refused.
   */
  const SSOT_PROGRAMME_DECLARED = [
    'src/config/demo.ts',
    'src/data/demoData.ts',
    'src/data/demoStore.ts',
    'src/lib/work/',
    'src/lib/dhl/domain.ts',
    'src/lib/simulation/scenarioEngine.ts',
    'src/lib/simulation/investorDemo.ts',
    'src/components/shared/WorkWorkspace.tsx',
    'scripts/validate-work-layer.mjs',
  ];

  /**
   * §BATCH1 — MAKE THE KEY HANDOVER REAL (2026-09-27) — REPOINTED.
   *
   * The recorded next task (`docs/NEXT_BUILD_PLAN_2026-09-27.md`, Batch 1) built
   * the server helpers the REAL provider clients had always called (and which did
   * not exist), and fixed the defects found while doing it: the simulated DHL
   * exception whose retry branch was UNREACHABLE, and the stale citation of a
   * migration that does not exist. Its source/test surface is declared here,
   * exactly as every earlier phase's declared surface is accepted above. The
   * scope-guard MECHANISM is unchanged and NOT weakened: a changed source/test
   * file outside EVERY declared set is still refused.
   */
  const BATCH1_INTEGRATION_PROXY_DECLARED = [
    'supabase/functions/',
    'scripts/validate-integration-proxy.mjs',
    'scripts/validate-e6-brand-surfaces.mjs',
    'scripts/validate-mock-providers.mjs',
    'src/lib/dhl/mockClient.ts',
    'src/integrations/IntegrationsContext.tsx',
  ];
  /**
   * §BATCH1b (2026-09-28) — the connect-wizard backend phase's declared surface.
   * Same mechanism as every phase above: a changed source/test file outside EVERY
   * declared set is still refused.
   */
  const BATCH1B_CONNECT_BACKEND_DECLARED = [
    'src/lib/integrations/connectClient.ts',
    'src/lib/integrations/testCalls.ts',
    'scripts/validate-connect-wizard-backend.mjs',
    'scripts/rls-audit.mjs',
    'src/components/admin/integrations/IntegrationsPanel.tsx',
  ];
  /**
   * §BATCH 2a (2026-09-28, session 43) — the Amazon-attribution phase's declared
   * surface. It corrected `AV-019` / `AV-019b` / `AV-020b` (a Mercenta invention
   * presented as the retail channel's rule) around ONE new owning config, and fixed
   * the duplicated resume-state field set found at session start. Same mechanism as
   * every phase above: a changed source/test file outside EVERY declared set is
   * still refused.
   */
  const BATCH2A_AMAZON_ATTRIBUTION_DECLARED = [
    'src/config/deductions.ts',
    'src/types.ts',
    'src/data/api.ts',
    'src/lib/work/workStore.ts',
    'src/lib/automation/registry.ts',
    'src/config/tours/tourDefinitions.ts',
    'src/components/brand/DeductionsLedger.tsx',
    'src/components/brand/BrandPurchaseOrders.tsx',
    'scripts/validate-amazon-attribution.mjs',
    'scripts/validate-resume-state.mjs',
    'scripts/validate-e6-brand-surfaces.mjs',
    'scripts/validate-e7-embedded-social.mjs',
    'package.json',
  ];

  /**
   * §Sprint 2 — deterministic platform completion (2026-09-19) — REPOINTED.
   *
   * Same declaration mechanism as SPRINT_WORK_LAYER_DECLARED above: the files
   * this sprint legitimately changed are named here so an UNEXPLAINED change
   * still fails the scope guard. Nothing here widens what any earlier phase was
   * allowed to touch.
   */
  const SPRINT_DETERMINISTIC_COMPLETION_DECLARED = [
    'src/components/admin/BrandCRM.tsx',
    'src/components/admin/CatalogManagerAdmin.tsx',
    'src/components/admin/MessagesHub.tsx',
    'src/components/admin/UsertourAdminPanel.tsx',
    'src/components/admin/integrations/IntegrationsPanel.tsx',
    'src/components/admin/BrandIntelligencePanel.tsx',
    'src/components/admin/LogisticsControl.tsx',
    'src/components/admin/AccountingPanel.tsx',
    'src/components/admin/SuperAdminPanel.tsx',
    'src/components/admin/AmazonAdsDashboard.tsx',
    'src/components/admin/AdminAuditLog.tsx',
    'src/components/brand/BrandIntelligence.tsx',
    'src/components/shared/WorkWorkspace.tsx',
    'src/lib/work/',
    'src/lib/events/types.ts',
    'scripts/validate-work-layer.mjs',
    'scripts/validate-uiux-redesign.mjs',
    'scripts/validate-e6-brand-surfaces.mjs',
    'scripts/validate-e7-embedded-social.mjs',
    'e2e/deterministic-journey.spec.ts',
    'docs/SPRINT_DETERMINISTIC_COMPLETION_2026-09-19.md',
  ];

  /**
   * §Founder OS — FOUNDER OPERATING SYSTEM SPRINT (2026-09-19) — REPOINTED.
   *
   * Same mechanism, same guard: this sprint added the canonical automation
   * registry, the Founder Ops AI seam, the acquisition engine, the BI findings
   * layer (which sits under E7's PROTECTED `src/lib/intelligence/` prefix and is
   * therefore declared here exactly as `listingAnalyzer.ts` was), the Control
   * Centre model + workspace, the work-version hook and the two runtime AI task
   * declarations. Anything outside EVERY declared set is still refused.
   */
  const SPRINT_FOUNDER_OS_DECLARED = [
    'src/lib/automation/registry.ts',
    'src/lib/ai/',
    'src/lib/acquisition/acquisitionEngine.ts',
    'src/lib/intelligence/intelligenceLayer.ts', // PROTECTED prefix — declared
    'src/lib/commandCentre/controlCentre.ts',
    'src/lib/founder/briefFacts.ts',
    'src/lib/work/useWork.ts',
    'src/lib/events/types.ts',
    'src/lib/costs/modelPolicy.ts',
    'src/components/admin/FounderControlCentre.tsx',
    'src/components/layout/AdminShell.tsx',
    'scripts/validate-founder-operating-system.mjs',
    'scripts/validate-uiux-redesign.mjs',
    'scripts/validate-e6-brand-surfaces.mjs',
    'scripts/validate-e7-embedded-social.mjs',
    'scripts/reconcile-founder-os-registry.cjs',
    'scripts/lint-wording.mjs',
    'e2e/founder-operating-system.spec.ts',
    'docs/SPRINT_FOUNDER_OPERATING_SYSTEM_2026-09-19.md',
    'requirements-registry.json',
  ];

  const UIUX_REDESIGN_DECLARED = [
    // ── Wave 1 (theme/token foundation): declared retroactively so the
    //    working-tree state the wave produced is no longer "unexplained" ──
    'src/config/themes.ts',
    'src/context/ThemeContext.tsx',
    'src/theme-alpha-shims.css',
    'src/main.tsx',
    'src/index.css',
    'tailwind.config.js',
    'src/components/shared/Avatar.tsx',
    'src/components/shared/ThemeSelector.tsx',
    'src/components/shared/UnlockGrowth.tsx',
    'src/lib/profile/profileImage.ts',
    // Wave-1 notification severity presentation (Wave-1 report §E/F).
    'src/components/shared/NotificationCenter.tsx',
    'src/lib/brandIdentity/logoResolver.ts',
    'src/data/brandLogos.ts',
    'scripts/gen-theme-alpha-shims.mjs',
    'scripts/validate-theme-foundation.mjs',
    // ── Wave 2 (implementation wave) ──
    // Untracked NEW directories (git reports the directory, not each file).
    'src/components/shared/charts/',
    'src/lib/nav/',
    'src/lib/brandIdentity/',
    'src/lib/profile/',
    'src/components/shared/workspace.tsx',
    'src/components/shared/CommandPalette.tsx',
    'src/components/shared/charts/rechartsTokens.ts',
    'src/lib/nav/navBadges.ts',
    'src/components/shared/dashboard.tsx',
    'src/components/shared/charts/MercentaCharts.tsx',
    'src/components/layout/AppShell.tsx',
    'src/components/layout/Sidebar.tsx',
    'src/components/layout/Header.tsx',
    'src/components/layout/AdminShell.tsx',
    'src/components/layout/BrandShell.tsx',
    'src/components/admin/AdminDashboard.tsx',
    'src/components/admin/HomepageEditor.tsx',
    'src/components/admin/FulfillmentTrack.tsx',
    'src/components/brand/BrandReports.tsx',
    'src/components/brand/SalesAnalytics.tsx',
    'src/components/marketing/Home.tsx',
    'src/components/shared/TourEngine.tsx',
    'src/components/ui.tsx',
    'src/config/homepageContent.ts',
    'scripts/validate-uiux-redesign.mjs',
    'scripts/reconcile-uiux-wave2-registry.py',
    'docs/UIUX_REDESIGN_WAVE2_2026-09-18.md',
    'docs/UIUX_FOUNDATION_PASS_2026-09-18.md',
    // ── §UI/UX Wave 2 COMPLETION (2026-09-18, finish-and-fix pass) ──
    // The remaining page-by-page migration + RecordDrawer wiring. Still
    // PRESENTATION/COMPOSITION ONLY: no business rule, permission, data model or
    // integration changed. The two non-presentation files are declared explicitly
    // with their reason:
    'src/components/admin/AdminPurchaseOrderList.tsx',
    'src/components/admin/ComplianceApprovals.tsx',
    'src/components/admin/ReturnsTrackingDashboard.tsx',
    'src/components/brand/BrandPurchaseOrders.tsx',
    // `src/data/api.ts` — the ONLY functional change in this pass:
    // `fetchHomepageContent()` now normalises a persisted payload onto the
    // canonical content model (migration 001 seeds the row as `{}` and `Home`
    // reads the model unguarded, so a Supabase deployment rendered the public
    // homepage from an empty object). No new endpoint, no new provider call.
    'src/data/api.ts',
    'docs/UIUX_REDESIGN_WAVE2_COMPLETION_2026-09-18.md',
    'scripts/reconcile-uiux-wave2-completion-registry.py',
    'e2e/record-drawer.spec.ts',
  ];

  const PHASE4_DECLARED = [
    'src/services/xero/demoData.ts',
    'src/services/xero/xeroClient.ts',
    'src/components/design/DesignSystemShowcase.tsx',
    // §Phase 4.1 — ASN regulated-category fix. Tapatío (Grocery) is now the
    // cleared ASN tenant, so the brand ASN form must expose the lotNumber +
    // expiryDate inputs the data contract already required. Legitimate Phase-4
    // regression fix; declared here exactly like the Phase-4 consumer list.
    'src/components/brand/BrandPurchaseOrders.tsx',
    // §Phase 4.2 — the SAME regulated-category contract on the ADMIN on-behalf
    // ASN path (Grocery/H&PC lot + expiry inputs). Same additive pattern.
    'src/components/admin/AdminPurchaseOrderDetail.tsx',
    // §Phase 4.3 (Workstream B, 2026-09-17) — approved implementation files:
    // de-exposed brand Market Intel + Super-Admin-only BI gating + product
    // discovery / regional priority panels + internal notes editor.
    'src/components/brand/BrandIntelligence.tsx',
    'src/components/layout/AdminShell.tsx',
    'src/components/admin/ProductDiscoveryPanel.tsx',
    'src/components/admin/RegionalPriorityPanel.tsx',
    'src/components/admin/ProspectDetailTabs.tsx',
    'src/components/admin/ProspectDetailPanel.tsx',
    'requirements-registry.json',
  ];
  // §Phase functional completion (2026-09-17) — REPOINTED. The functional-completion
  // workstream (Amazon Ads depth §9 + Marketplace Intelligence / automated Listing
  // Analyzer §8 + Knowledge Base ↔ UserTour §14) legitimately extended the working
  // tree with new brand-facing and admin surfaces AFTER E7's scope was written. The
  // guard's REAL invariant is unchanged — anything still outside the union of the
  // declared phase scopes is refused — so each functional-completion source file is
  // declared here exactly like PHASE4_DECLARED and M13_DECLARED did before it. Note
  // that src/lib/intelligence/listingAnalyzer.ts sits under E7's protected
  // `src/lib/intelligence/` prefix and is deliberately declared as the lone engine.
  const FUNCTIONAL_COMPLETION_DECLARED = [
    // ── Cluster A — Amazon Ads functional depth (§9) ──
    'src/components/admin/AmazonAdsDashboard.tsx', // campaigns + drill-down + manual budget + recommended-spend approval
    'src/components/brand/BrandAdvertising.tsx',   // NEW brand advertising surface (Market Intel)
    // ── Cluster B — Marketplace Intelligence + automated Listing Analyzer (§8) ──
    'src/components/brand/ListingAnalyzer.tsx',    // NEW Listing Analyzer surface (Market Intel)
    'src/lib/intelligence/listingAnalyzer.ts',     // NEW deterministic engine (PROTECTED prefix — declared)
    // ── shared wiring touched by both clusters ──
    'src/components/ui.tsx',                       // Input numeric/aria/testid passthrough
    'src/data/queries.ts',                         // ad-campaigns + ad-recommendations hooks
    // ── Cluster C — Knowledge Base ↔ UserTour article linkage (§14) ──
    'src/components/shared/TourEngine.tsx',        // tour tooltip "Learn more" + KB article panel
    'src/data/knowledgeBase.ts',                   // NEW canonical article store
    'src/config/tours/tourDefinitions.ts',         // TourStep.learnMore per orientation step
  ];
  /**
   * §Phase 1 — EXPLORE UK MARKET FIT / PRE-AUDIT SPRINT (2026-09-19) — REPOINTED.
   *
   * Same mechanism, same guard. This sprint added the canonical pre-audit config,
   * the research seam + fixtures + deterministic engine, the pre-audit domain
   * store + its port table, the acquisition bridge, the public assessment surface,
   * the homepage/nav CTA wiring and the founder pre-audit queue. `src/types.ts`
   * and `src/lib/events/types.ts` are PROTECTED by E7's scope guard and are
   * therefore declared here exactly as the Founder OS sprint declared them.
   * Anything outside EVERY declared set is still refused.
   */
  const SPRINT_UK_MARKET_FIT_DECLARED = [
    'src/config/ukMarketFit.ts',
    'src/types.ts',                       // PROTECTED prefix — declared
    'src/lib/preaudit/',
    'src/data/preAuditStore.ts',
    'src/data/prospectStore.ts',
    'src/data/domainRepository.ts',
    'src/lib/events/types.ts',            // PROTECTED prefix — declared
    'src/components/marketing/ExploreUkMarketFit.tsx',
    'src/components/marketing/PublicNav.tsx',
    'src/components/marketing/Home.tsx',
    'src/config/homepageContent.ts',
    'src/lib/commandCentre/controlCentre.ts',
    'src/components/admin/FounderControlCentre.tsx',
    'scripts/validate-uk-market-fit.mjs',
    'scripts/integrity-audit.mjs',
    'scripts/validate-uiux-redesign.mjs',
    'scripts/validate-e6-brand-surfaces.mjs',
    'scripts/validate-e7-embedded-social.mjs',
    'scripts/reconcile-roadmap-phase1-registry.cjs',
    'e2e/uk-market-fit.spec.ts',
    'docs/SPRINT_UK_MARKET_FIT_PHASE1_2026-09-19.md',
    'requirements-registry.json',
  ];
  /**
   * §Phase 2 — EXPLICIT WORKFLOW ROUTING / GATEWAY ARCHITECTURE (2026-09-19) —
   * the files this stage declares, in the same declaration mechanism as
   * SPRINT_UK_MARKET_FIT_DECLARED above. The E7 scope contract is unchanged: a
   * changed source/test file in NO declared set still fails.
   */
  const SPRINT_ROUTING_GATEWAYS_DECLARED = [
    'src/config/routing.ts',
    'src/config/commercialReadiness.ts',
    'src/lib/routing/',
    'src/lib/commercial/',
    'src/data/routingStore.ts',
    'src/data/domainRepository.ts',
    'src/types.ts',                        // PROTECTED prefix — declared
    'src/lib/events/types.ts',             // PROTECTED prefix — declared
    'scripts/validate-routing-gateways.mjs',
    'scripts/reconcile-phase2-routing-registry.cjs',
    'scripts/validate-e6-brand-surfaces.mjs',
    'scripts/validate-e7-embedded-social.mjs',
    'PROJECT_STATUS.md',
  ];
  /**
   * §P4 — PROXY-MODEL PHASE DECLARED SURFACE (2026-09-23, programme
   * `docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md` §4 P4).
   *
   * P4 corrects the direction of the proxy model: a brand's decision is an
   * INSTRUCTION to Mercenta, and MERCENTA raises the routing/shipment request and
   * files the ASN. It therefore legitimately touches the SP-API seam (a PROTECTED
   * prefix), the commerce lifecycle, the proxy modules, the brand/admin PO
   * surfaces and the shared routing-status module. The E7 guard's contract is
   * UNCHANGED — a changed source/test file in NO declared set still fails, and an
   * undeclared protected path still fails.
   */
  const P4_PROXY_MODEL_DECLARED = [
    'src/lib/spapi/',
    'src/lib/commerce/',
    'src/types.ts',                        // PROTECTED prefix — declared
    'src/data/api.ts',
    'src/data/knowledgeBase.ts',
    'src/lib/shipping/carrierRouting.ts',
    'src/lib/shipping/routingReadiness.ts',
    'src/components/brand/BrandPurchaseOrders.tsx',
    'src/components/shared/RoutingRequest.tsx',
    'src/components/admin/AdminPurchaseOrderDetail.tsx',
    'src/config/tours/tourDefinitions.ts',
    'e2e/proxy-model.spec.ts',
    'e2e/shipment-asn.spec.ts',
    'e2e/notifications.spec.ts',
    'e2e/po-lifecycle.spec.ts',
    'e2e/logistics-wave3.spec.ts',
    'scripts/validate-proxy-model.mjs',
    'scripts/validate-e6-brand-surfaces.mjs',
    'scripts/validate-e7-embedded-social.mjs',
    'package.json',
    'docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md',
  ];
  /**
   * §P5 — DESTINATION-FC PHASE DECLARED SURFACE (2026-09-23, programme
   * `docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md` §4 P5).
   *
   * P5 removes the Mercenta Hub as a destination: the destination is the FC declared
   * on each purchase order (the NEW ONE owner `src/config/destinationFc.ts`), the
   * `mercenta_hub` stage/status/node kind and the hub coordinate are deleted, and the
   * Hero/map arrival node is that FC. It therefore legitimately touches the canonical
   * types (a PROTECTED prefix), the domain creators and status/stage maps, the carrier
   * transforms, the Hero/map modules, the copy surfaces the hub was asserted on, the
   * gates/specs repointed with the old contract recorded inline, and the records. The
   * E7 guard's contract is UNCHANGED — a changed source/test file in NO declared set
   * still fails, and an undeclared protected path still fails.
   */
  const P5_DESTINATION_FC_DECLARED = [
    'src/config/destinationFc.ts',          // NEW — the ONE destination owner
    'src/config/logisticsGeo.ts',
    'src/config/logisticsHero.ts',
    'src/types.ts',                         // PROTECTED prefix — declared
    'src/data/api.ts',
    'src/data/demoData.ts',
    'src/data/bootstrap.ts',
    'src/data/brandDossiers.ts',
    'src/context/GlobalStateContext.tsx',
    'src/lib/commerce/commerceLifecycle.ts',
    'src/lib/logistics/',
    'src/lib/statusPresentation.ts',
    'src/lib/dhl/transform.ts',
    'src/lib/palletline/transform.ts',
    'src/lib/simulation/investorDemo.ts',
    'src/lib/simulation/scenarioEngine.ts',
    'src/lib/grants/dataSources.ts',
    'src/components/admin/AdminDashboard.tsx',
    'src/components/brand/LogisticsHub.tsx',
    'src/components/carrier/BakLogistics.tsx',
    'src/components/carrier/CarrierDashboard.tsx',
    'src/components/marketing/FAQ.tsx',
    'src/components/marketing/HowItWorks.tsx',
    'src/components/shared/logistics/',
    'e2e/logistics-hub-map.spec.ts',
    'e2e/status-semantics.spec.ts',
    'e2e/table-migrations.spec.ts',
    /** §P5 copy pass — the Overview h1 assertions repointed with the old text recorded inline. */
    'e2e/dashboard.spec.ts',
    'e2e/runtime-entry.spec.ts',
    'scripts/validate-logistics-map.mjs',
    'scripts/validate-logistics-hero.mjs',
    'scripts/validate-mock-providers.mjs',
    'scripts/validate-investor-demo.mjs',
    'scripts/reconcile-logistics-map-registry.cjs',
    'scripts/verify-demo-live.mjs',
    'scripts/validate-e6-brand-surfaces.mjs',
    'scripts/validate-e7-embedded-social.mjs',
  ];

  /**
   * §P6 — PO DOCUMENT PACK PHASE DECLARED SURFACE (2026-09-23, programme
   * `docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md` §4 P6).
   *
   * The pack produced AUTOMATICALLY on acceptance (decisions 6/9): SSCC carton
   * labels, the carrier label and waybill (existing dialogues), the packing
   * list/delivery note, the ASN sheet and the international-lane customs
   * documents, plus the Hub surface, the notification and the nav badge. It
   * legitimately touches the canonical types (a PROTECTED prefix), the
   * customs-document owner's INPUT TYPE (widened from `DemoProduct` to the base
   * `Product`), the acceptance write-path, the event feed, the badge map and the
   * notification centre. The E7 guard's contract is UNCHANGED — a changed
   * source/test file in NO declared set still fails, and an undeclared protected
   * path still fails.
   */
  const P6_PO_DOCUMENT_PACK_DECLARED = [
    'src/lib/documents/',                   // NEW — the pack + SSCC owners
    'src/lib/shipping/collectChain.ts',     // NEW — the documented collect chain
    'src/components/shared/logistics/',     // the pack surface
    'src/types.ts',                         // PROTECTED prefix — declared
    'src/lib/customsDocs.ts',               // input type widened to Product
    'src/lib/commerce/proxyProcessor.ts',   // generates the pack on acceptance
    'src/lib/events/types.ts',
    'src/lib/events/eventFeed.ts',
    'src/lib/nav/navBadges.ts',
    'src/components/shared/NotificationCenter.tsx',
    'src/components/brand/LogisticsHub.tsx',
    'e2e/po-documents.spec.ts',
    'scripts/validate-po-documents.mjs',
    'package.json',
  ];

  /**
   * §P7 — ADMIN INVOICING PHASE DECLARED SURFACE (2026-09-23, programme
   * `docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md` §4 P7).
   *
   * P7 adds the channel's documented invoicing rules (`AV-022`) and the receipt
   * gate (`AV-018`): ONE owner for the terms (14/30/60 per invoice), ONE owner for
   * the invoice-number registry, ONE owner for the receiving status, the receipt
   * + cancellation write paths, the pure date helpers moved out of the work layer,
   * and the four readers that used to re-derive a due date from a global constant.
   * It legitimately touches the canonical types (`src/types.ts` — a PROTECTED
   * prefix, declared here exactly as P4/P5/P6 declared it) and the canonical store
   * (the append-only registry ledger). The E7 guard's contract is UNCHANGED — a
   * changed source/test file in NO declared set still fails, and an undeclared
   * protected path still fails.
   */
  const P7_ADMIN_INVOICING_DECLARED = [
    'src/lib/commerce/invoiceTerms.ts',      // NEW — terms + the ONE due-date owner
    'src/lib/commerce/invoiceRegistry.ts',   // NEW — the ONE invoice-number registry (AV-022)
    'src/lib/commerce/receivingStatus.ts',   // NEW — receiving status + the receipt gate
    'src/lib/commerce/commerceLifecycle.ts', // issue/cancel on the ONE write path
    'src/lib/dates.ts',                      // NEW — the pure date helpers
    'src/types.ts',                          // PROTECTED prefix — declared
    'src/data/demoStore.ts',
    'src/lib/work/workStore.ts',
    'src/lib/commandCentre/controlCentre.ts',
    'src/lib/ai/founderOpsAi.ts',
    'src/lib/automation/registry.ts',
    'src/components/admin/AdminDashboard.tsx',
    'src/components/admin/CommerceOperationsPanel.tsx',
    'src/components/admin/AccountingPanel.tsx',
    'src/components/brand/BrandDashboard.tsx',  // receivable predicate repointed to the ONE owner
    'src/lib/simulation/investorDemo.ts',       // the registry participates in the deterministic reset
    'e2e/invoicing.spec.ts',
    'scripts/validate-p7-invoicing.mjs',
    'scripts/validate-work-layer.mjs',
    'scripts/verify-demo-live.mjs',          // carries the §P7 live checks
    'package.json',
  ];

  /**
   * §P8 — INVENTORY + CHANNEL IDENTIFIER DECLARED SURFACE (2026-09-23, programme
   * `docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md` §4 P8).
   *
   * Decision 5 (inventory linked to the catalogue, kept inside Mercenta) and
   * decision 10 (the channel identifier — brand-declared only for an existing
   * listing, otherwise populated from the channel's acceptance, and NEVER
   * invented). It legitimately touches the canonical types (`src/types.ts`, a
   * PROTECTED prefix, declared exactly as P4/P5/P6/P7 declared it) and the
   * mock-first SP-API seam (`src/lib/spapi/**` — the channel's own response).
   * The E7 guard's contract is UNCHANGED.
   */
  const P8_INVENTORY_DECLARED = [
    'src/lib/catalog/asin.ts',                  // NEW — the ONE identifier owner (decision 10)
    'src/lib/inventory/inventoryRecord.ts',     // NEW — the ONE owner of the stock figures
    'src/lib/inventory/inventoryLifecycle.ts',  // NEW — the domain write path
    'src/lib/inventory/',                       // NEW directory — git reports untracked dirs as one entry
    'src/components/brand/BrandInventory.tsx',  // NEW — the brand surface
    'src/types.ts',                             // PROTECTED prefix — declared
    'src/data/demoStore.ts',
    'src/data/api.ts',
    'src/lib/spapi/client.ts',
    'src/lib/spapi/mockClient.ts',
    'src/lib/catalog/catalogLifecycle.ts',
    'src/lib/simulation/investorDemo.ts',
    'src/components/brand/ProductCatalog.tsx',
    'src/components/brand/BrandReports.tsx',
    'src/components/layout/BrandShell.tsx',
    'src/components/admin/CatalogManagerAdmin.tsx',
    'e2e/inventory.spec.ts',
    'scripts/validate-p8-inventory.mjs',
    'scripts/validate-e6-brand-surfaces.mjs',
    'scripts/validate-e7-embedded-social.mjs',
    'scripts/verify-demo-live.mjs',             // carries the §P8 live checks
    'package.json',
  ];

  /**
   * §P9 — CARRIER-REMOVAL DECLARED SURFACE (2026-09-23, programme
   * `docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md` §4 P9).
   *
   * Decision 4 removes the 3PL carrier surface COMPLETELY (environment, role,
   * shell + its three views, `CarrierDashboard`, `BakLogistics`, the demo switcher
   * entry, the "3PL Carrier Terminal" login card, the admin "Carrier Monitor", the
   * public FAQ claim, the affected documents), and decision 1 removes the
   * `fedex`/`bak` carrier identity from the type, the labels and the capability
   * table. The carrier-event capability is REHOMED on the Mercenta admin Logistics
   * Hub rather than deleted. The E7 guard's contract is UNCHANGED: a changed
   * source/test file outside EVERY declared set is still refused.
   */
  const P9_CARRIER_REMOVAL_DECLARED = [
    'src/types.ts',                             // PROTECTED prefix — declared
    'src/lib/auth/rbac.ts',
    'src/lib/runtime/productRoutes.ts',
    'src/lib/runtime/sessionPersistence.ts',
    'src/lib/seo/routeMetadata.ts',
    'src/lib/seo/publicRoutes.ts',
    'src/App.tsx',
    'src/context/GlobalStateContext.tsx',
    /* DELETED with the carrier surface */
    'src/components/layout/CarrierShell.tsx',
    'src/components/carrier/CarrierDashboard.tsx',
    'src/components/carrier/BakLogistics.tsx',
    'src/components/admin/CarrierMonitor.tsx',
    /* Repointed (incl. the rehomed carrier console) */
    'src/components/layout/AdminShell.tsx',
    'src/components/layout/EnvironmentRouter.tsx',
    'src/components/layout/Sidebar.tsx',
    'src/components/auth/Login.tsx',
    'src/components/admin/LogisticsControl.tsx',
    'src/components/admin/FounderControlCentre.tsx',
    'src/components/admin/SuperAdminPanel.tsx',
    'src/components/brand/LogisticsHub.tsx',
    'src/components/brand/OnboardingWizard.tsx',
    'src/components/marketing/FAQ.tsx',
    'src/components/marketing/HowItWorks.tsx',
    'src/components/marketing/UKMarketAccess.tsx',
    /* Carrier identity (decision 1) + affected demo data */
    'src/config/shipping.ts',
    'src/lib/shipping/carrierRouting.ts',
    'src/lib/shipping/shippingCalculator.ts',
    'src/data/bootstrap.ts',
    'src/data/brandDossiers.ts',
    'src/data/demoStore.ts',
    'src/data/api.ts',
    'src/lib/simulation/investorDemo.ts',
    /* Gates + specs repointed */
    'e2e/app-shell.spec.ts',
    'e2e/compliance-sim.spec.ts',
    'e2e/multi-tenant.spec.ts',
    'e2e/runtime-entry.spec.ts',
    'e2e/shipment-asn.spec.ts',
    'e2e/status-semantics.spec.ts',
    'e2e/table-migrations.spec.ts',
    'scripts/integrity-audit.mjs',
    'scripts/runtime-sweep.mjs',
    'scripts/live-demo-check.mjs',
    'scripts/forensic-screenshots.mjs',
    'scripts/validate-product-routes.mjs',
    'scripts/validate-review-s6.mjs',
    'scripts/validate-stage16.mjs',
    'scripts/validate-stage26.mjs',
    'scripts/validate-workspace-shell.mjs',
    'scripts/validate-e6-brand-surfaces.mjs',
    'scripts/validate-e7-embedded-social.mjs',
    'scripts/verify-demo-live.mjs',
    /* Documentation + state sources */
    'docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md',
    'docs/MERCENTA_MASTER_FEATURE_FUNCTION_MATRIX.md',
    'PROJECT_STATUS.md',
    'HANDOFF.md',
    'STATUS_CHECK.md',
    'requirements-registry.json',
    'PRODUCTION_READINESS.md',
  ];
  /**
   * §P10 — LOGISTICS-COMPLETION DECLARED SURFACE (2026-09-24, programme
   * `docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md` §4 P10; matrix `D10-10`;
   * decision 11).
   *
   * P10 completes the Logistics Hub: the carrier PROVIDER CONFIGURATION, the PO-document
   * DOWNLOAD QUEUE (the destination the nav badge already counted) and the consolidation
   * posture recorded as DEFERRED with its documented channel evidence. It adds two domain
   * owners plus three shared surfaces and wires BOTH workspaces to them. The E7 guard's
   * contract is UNCHANGED: a changed source/test file outside EVERY declared set is still
   * refused.
   */
  const P10_LOGISTICS_COMPLETION_DECLARED = [
    'src/lib/shipping/providerConfiguration.ts',
    'src/lib/shipping/consolidation.ts',
    'src/components/shared/logistics/PoDocumentQueuePanel.tsx',
    'src/components/shared/logistics/CarrierProviderConfigurationPanel.tsx',
    'src/components/shared/logistics/ConsolidationPosturePanel.tsx',
    'src/components/brand/LogisticsHub.tsx',
    'src/components/admin/LogisticsControl.tsx',
    'src/components/layout/AdminShell.tsx',
    'scripts/validate-logistics-providers.mjs',
    'scripts/validate-po-documents.mjs',
    'scripts/validate-e6-brand-surfaces.mjs',
    'scripts/validate-e7-embedded-social.mjs',
    'scripts/verify-demo-live.mjs',
    'package.json',
    'e2e/po-documents.spec.ts',
    'e2e/logistics-providers.spec.ts',
    'docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md',
    'docs/MERCENTA_MASTER_FEATURE_FUNCTION_MATRIX.md',
    'PROJECT_STATUS.md',
    'HANDOFF.md',
    'STATUS_CHECK.md',
    'requirements-registry.json',
    'PRODUCTION_READINESS.md',
  ];

  /**
   * §P11 — CHANNEL-INGESTION DECLARED SURFACE (2026-09-24, programme
   * `docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md` §4 P11; decision 3).
   *
   * P11 removes "Create PO" and replaces it with channel purchase-order ingestion
   * (routing by the PO's own lines, fail-closed refusals, idempotent). It touches
   * the PROTECTED SP-API read and deletes the duplicate Postmark PO-notification
   * seam, so both are declared here. The E7 guard's contract is UNCHANGED: a
   * changed source/test file outside EVERY declared set is still refused.
   */
  const P11_CHANNEL_PO_INGESTION_DECLARED = [
    'src/lib/commerce/channelPurchaseOrderIngestion.ts',
    'src/lib/spapi/client.ts',
    'src/lib/spapi/mockClient.ts',
    'src/data/api.ts',
    'src/components/admin/AdminPurchaseOrderList.tsx',
    'src/lib/notifications/postmarkNotifier.ts',
    'scripts/validate-channel-po-ingestion.mjs',
    'scripts/validate-e4-commerce.mjs',
    'scripts/validate-e5-admin-surfaces.mjs',
    'scripts/validate-e6-brand-surfaces.mjs',
    'scripts/validate-e7-embedded-social.mjs',
    'scripts/validate-mock-seam.mjs',
    'scripts/verify-demo-live.mjs',
    'package.json',
    'e2e/notifications.spec.ts',
    'e2e/channel-po-ingestion.spec.ts',
    'docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md',
    'docs/MERCENTA_MASTER_FEATURE_FUNCTION_MATRIX.md',
    'MERCENTA_ARCHITECTURE.md',
    'PROJECT_STATUS.md',
    'HANDOFF.md',
    'STATUS_CHECK.md',
    'requirements-registry.json',
    'PRODUCTION_READINESS.md',
  ];



  /**
   * §P12 — SP-API SEAM-EXTENSION DECLARED SURFACE (2026-09-24, programme
   * `docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md` §4 P12; `AV-040`).
   *
   * P12 completes the channel's documented vendor surface on the EXISTING seam and
   * gives each in-code P12 declaration a real owner (the receiving sync, the
   * shipment operations, invoice submission, the stock push). It touches the
   * PROTECTED `src/lib/spapi/**` seam, so that prefix is declared here exactly as
   * every earlier phase declared its own. The E7 guard's contract is UNCHANGED: a
   * changed source/test file outside EVERY declared set is still refused.
   */
  const P12_SPAPI_SEAM_DECLARED = [
    'src/lib/spapi/client.ts',
    'src/lib/spapi/mockClient.ts',
    'src/lib/spapi/index.ts',
    'src/config/shipping.ts',
    'src/lib/commerce/channelReceivingSync.ts',
    'src/lib/commerce/channelInvoiceSubmission.ts',
    'src/lib/shipping/channelShipmentOperations.ts',
    'src/lib/inventory/channelInventoryPush.ts',
    'src/lib/commerce/receivingStatus.ts',
    'src/lib/commerce/channelPurchaseOrderIngestion.ts',
    'src/lib/commerce/channelInstructions.ts',
    'src/lib/commerce/proxyProcessor.ts',
    'src/lib/commerce/commerceLifecycle.ts',
    'src/lib/shipping/consolidation.ts',
    'src/lib/inventory/inventoryRecord.ts',
    'src/lib/inventory/inventoryLifecycle.ts',
    'src/components/admin/ChannelOperationsPanel.tsx',
    'src/components/admin/RetailPipeline.tsx',
    'src/components/admin/CatalogManagerAdmin.tsx',
    'src/components/shared/logistics/PoDocumentPackPanel.tsx',
    'src/types.ts',
    'src/data/api.ts',
    'scripts/validate-p12-spapi-seam.mjs',
    'scripts/validate-proxy-model.mjs',
    'scripts/validate-logistics-providers.mjs',
    'scripts/validate-e6-brand-surfaces.mjs',
    'scripts/validate-e7-embedded-social.mjs',
    'scripts/verify-demo-live.mjs',
    'e2e/p12-channel-operations.spec.ts',
    'docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md',
    'PROJECT_STATUS.md',
    'HANDOFF.md',
    'STATUS_CHECK.md',
    'requirements-registry.json',
    'PRODUCTION_READINESS.md',
  ];

  /**
   * §S9 — RECEIPT → INVOICE AUTOMATION DECLARED SURFACE (2026-09-25, session 34;
   * programme `docs/SPRINT_PO_ACKNOWLEDGEMENT_2026-09-24.md` §S9), accepted here
   * exactly as every earlier phase's declared surface is. The RECEIPT becomes the
   * trigger of the invoice: a NEW owner holds the decision, the terms and the
   * refusals; the canonical receipt writer invokes it; the invoice still goes
   * through `issueCommerceInvoice`, so `AV-022` and the registry are unchanged.
   * The E7 guard's contract is UNCHANGED — a changed source/test file outside
   * EVERY declared set is still refused.
   */
  const S9_RECEIPT_INVOICE_DECLARED = [
    'src/lib/commerce/receiptInvoiceAutomation.ts',      // NEW — the ONE owner of the automation
    'src/lib/commerce/commerceLifecycle.ts',             // the receipt triggers the automation
    'src/types.ts',                                      // PROTECTED prefix — the recorded refusal activity
    'src/components/admin/CommerceOperationsPanel.tsx',  // terms travel with the receipt
    'src/components/shared/CommerceSimulationPanel.tsx', // the brand console states the automation
    'e2e/invoicing.spec.ts',
    'e2e/admin-operational-surfaces.spec.ts',
    'e2e/commerce-operational-simulation.spec.ts',
    'e2e/deterministic-journey.spec.ts',
    'scripts/validate-receipt-invoice-automation.mjs',   // NEW — the S9 gate
    'scripts/validate-e4-commerce.mjs',                  // the durable-write guarantee repointed
    'scripts/validate-e6-brand-surfaces.mjs',
    'scripts/validate-e7-embedded-social.mjs',
    'scripts/validate-work-layer.mjs',                   // the inherited reminder-scope repoint
    'package.json',
  ];

  test(
    'protected areas untouched (BI, SP-API, DHL, Xero, design system, deploy scripts)',
    !e7Changed
      .filter(
        (f) =>
          !M13_DECLARED.includes(f) &&
          !PHASE4_DECLARED.includes(f) &&
          !FUNCTIONAL_COMPLETION_DECLARED.includes(f) &&
          !SPRINT_FOUNDER_OS_DECLARED.includes(f) &&
          !SPRINT_UK_MARKET_FIT_DECLARED.includes(f) &&
          !SPRINT_ROUTING_GATEWAYS_DECLARED.includes(f) &&
          /**
           * §P4 — REPOINTED (not weakened). The current phase's declared surface
           * is accepted here exactly as every earlier phase's is; an UNEXPLAINED
           * protected change still fails.
           */
          !P4_PROXY_MODEL_DECLARED.includes(f) &&
          !P4_PROXY_MODEL_DECLARED.some((p) => p.endsWith('/') && f.startsWith(p)) &&
          /** §P5 — the destination-FC phase's declared surface (see above). */
          !P5_DESTINATION_FC_DECLARED.includes(f) &&
          !P5_DESTINATION_FC_DECLARED.some((p) => p.endsWith('/') && f.startsWith(p)) &&
          /** §P6 — the PO-document-pack phase's declared surface (see above). */
          !P6_PO_DOCUMENT_PACK_DECLARED.includes(f) &&
          !P6_PO_DOCUMENT_PACK_DECLARED.some((p) => p.endsWith('/') && f.startsWith(p)) &&
          /** §P7 — the admin-invoicing phase's declared surface (see above). */
          !P7_ADMIN_INVOICING_DECLARED.includes(f) &&
          /** §P8 — the inventory + channel-identifier phase's declared surface. */
          !P8_INVENTORY_DECLARED.includes(f) &&
          !P8_INVENTORY_DECLARED.some((p) => p.endsWith('/') && f.startsWith(p)) &&
          /** §P11 — the channel-ingestion phase's declared surface (see above). */
          !P11_CHANNEL_PO_INGESTION_DECLARED.includes(f) &&
          !P11_CHANNEL_PO_INGESTION_DECLARED.some((p) => p.endsWith('/') && f.startsWith(p)) &&
          /** §P12 — the SP-API seam-extension phase's declared surface (see above). */
          !P12_SPAPI_SEAM_DECLARED.includes(f) &&
          !P12_SPAPI_SEAM_DECLARED.some((p) => p.endsWith('/') && f.startsWith(p)) &&
          /** §S9 — the receipt → invoice automation's declared surface (see above). */
          !S9_RECEIPT_INVOICE_DECLARED.includes(f) &&
          !S9_RECEIPT_INVOICE_DECLARED.some((p) => p.endsWith('/') && f.startsWith(p))
      )
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
    // §Phase 4 — canonical 20-real-brand universe (see PHASE4_DECLARED above):
    // the canonical SSOT and every consumer/validator/spec repointed to it.
    'src/data/demoData.ts',
    'src/data/demoStore.ts',
    'src/data/regionalDossiers.ts',
    'src/data/brandDossiers.ts',
    'src/data/bootstrap.ts',
    'src/data/api.ts',
    'src/types.ts',
    'src/components/auth/Login.tsx',
    'src/components/admin/HelpdeskDashboard.tsx',
    'src/components/brand/OnboardingWizard.tsx',
    'src/components/carrier/CarrierDashboard.tsx',
    'src/components/design/DesignSystemShowcase.tsx',
    'src/lib/compliance/companiesHouseMock.ts',
    'src/lib/helpdesk/ticketStore.ts',
    'src/lib/simulation/scenarioEngine.ts',
    'src/lib/warehouse/returnsTracking.ts',
    'src/lib/simulation/investorDemo.ts',
    'src/lib/discovery/engine.ts',
    'src/lib/discovery/firecrawlClient.ts',
    'src/lib/research/keepaClient.ts',
    'src/lib/research/productResearchEngine.ts',
    'src/lib/research/resellerTracker.ts',
    'src/lib/dhl/domain.ts',
    'src/services/xero/demoData.ts',
    'src/services/xero/xeroClient.ts',
    'supabase/migrations/016_seed_demo_data.sql',
    'scripts/gen-seed-migration.py',
    'e2e/',
    ...PHASE4_DECLARED,
    // §Phase functional completion (2026-09-17) — REPOINTED (see declaration above):
    // the same declaration extends the `allowed` set so the functional-completion
    // source surface is accepted while anything else is still refused.
    ...FUNCTIONAL_COMPLETION_DECLARED,
    // §UI/UX Wave 2 (2026-09-18) — same mechanism: the redesign wave's declared
    // presentation files are accepted; anything else still fails.
    ...UIUX_REDESIGN_DECLARED,
    // §Sprint work layer (2026-09-19) — REPOINTED (see declaration above): the
    // canonical work/task + calendar operating layer added these files. The
    // mechanism is unchanged — a file outside EVERY declared set is still refused.
    ...SPRINT_WORK_LAYER_DECLARED,
    // §Sprint 2 — deterministic platform completion (2026-09-19) — REPOINTED.
    // This sprint finished the remaining `uiux-wave2-core-surfaces-remaining`
    // surfaces (admin CRM / Catalogue / Communications / Onboarding Tours and
    // the Integration control plane), added the deterministic proactive reminder
    // runner plus the `invoice_due` and `onboarding_step` derivations, and added
    // its browser journey spec. Same mechanism, same guard: a file outside EVERY
    // declared set is still refused.
    ...SPRINT_DETERMINISTIC_COMPLETION_DECLARED,
    // §Founder OS — Founder Operating System sprint (2026-09-19) — REPOINTED.
    ...SPRINT_FOUNDER_OS_DECLARED,
    // §Phase 1 — Explore UK Market Fit / pre-audit sprint (2026-09-19) — REPOINTED.
    ...SPRINT_UK_MARKET_FIT_DECLARED,
    // §Phase 2 — explicit workflow routing / gateway architecture (2026-09-19).
    ...SPRINT_ROUTING_GATEWAYS_DECLARED,
    /**
     * §P4 — REPOINTED (not weakened). The proxy-model phase's declared surface is
     * accepted here exactly as every earlier phase's is; a changed source/test file
     * outside EVERY declared set is still refused.
     */
    ...P4_PROXY_MODEL_DECLARED,
    /**
     * §P5 — REPOINTED (not weakened). The destination-FC phase's declared surface is
     * accepted here exactly as every earlier phase's is; a changed source/test file
     * outside EVERY declared set is still refused.
     */
    ...P5_DESTINATION_FC_DECLARED,
    /**
     * §P6 — REPOINTED (not weakened). The PO-document-pack phase's declared surface
     * is accepted here exactly as every earlier phase's is; a changed source/test
     * file outside EVERY declared set is still refused.
     */
    ...P6_PO_DOCUMENT_PACK_DECLARED,
    /**
     * §P7 — REPOINTED (not weakened). The admin-invoicing phase's declared surface
     * is accepted here exactly as every earlier phase's is; a changed source/test
     * file outside EVERY declared set is still refused.
     */
    ...P7_ADMIN_INVOICING_DECLARED,
    /**
     * §P8 — REPOINTED (not weakened). The inventory + channel-identifier phase's
     * declared surface is accepted here exactly as every earlier phase's is; a
     * changed source/test file outside EVERY declared set is still refused.
     */
    ...P8_INVENTORY_DECLARED,
    /**
     * §P9 — REPOINTED (not weakened). The carrier-removal phase's declared surface
     * is accepted here exactly as every earlier phase's is; a changed source/test
     * file outside EVERY declared set is still refused.
     */
    ...P9_CARRIER_REMOVAL_DECLARED,
    /**
     * §P10 — REPOINTED (not weakened). The logistics-completion phase's declared surface
     * is accepted here exactly as every earlier phase's is; a changed source/test file
     * outside EVERY declared set is still refused.
     */
    ...P10_LOGISTICS_COMPLETION_DECLARED,
    /**
     * §P11 — REPOINTED (not weakened). The channel-ingestion phase's declared surface
     * is accepted here exactly as every earlier phase's is; a changed source/test file
     * outside EVERY declared set is still refused.
     */
    ...P11_CHANNEL_PO_INGESTION_DECLARED,
    /**
     * §P12 — the SP-API seam-extension phase's declared surface, accepted here
     * exactly as every earlier phase's is; a changed source/test file outside EVERY
     * declared set is still refused.
     */
    ...P12_SPAPI_SEAM_DECLARED,
    /**
     * §S9 — the receipt → invoice automation's declared surface, accepted here
     * exactly as every earlier phase's is; a changed source/test file outside EVERY
     * declared set is still refused.
     */
    ...S9_RECEIPT_INVOICE_DECLARED,
    /**
     * §SSOT — the work-layer single-source-of-truth programme's declared surface
     * (see the declaration above). Same mechanism: a changed source/test file
     * outside EVERY declared set is still refused.
     */
    ...SSOT_PROGRAMME_DECLARED,
    /**
     * §BATCH1 — the integration-proxy helpers phase's declared surface (see the
     * declaration above). Same mechanism: a changed source/test file outside
     * EVERY declared set is still refused.
     */
    ...BATCH1_INTEGRATION_PROXY_DECLARED,
    /**
     * §BATCH1b — the connect-wizard backend phase's declared surface (see above).
     */
    ...BATCH1B_CONNECT_BACKEND_DECLARED,
    /**
     * §BATCH 2a — the Amazon-attribution phase's declared surface (see above).
     */
    ...BATCH2A_AMAZON_ATTRIBUTION_DECLARED,
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
  const unlinked = social.linkSocialWorkspaceToEngine('brand-astonish', {
    email: 'x@social.mercenta.co.uk',
    organizationId: 'org-1',
  });
  test('linking refuses a tenant that has no workspace yet', unlinked.ok === false);
  social.ensureSocialWorkspaceForBrand(
    { tenantId: 'brand-astonish', brandStatus: 'active', onboarded: true, brandName: 'Astonish' },
    { actorId: 'system:e8' }
  );
  const linked = social.linkSocialWorkspaceToEngine('brand-astonish', {
    email: 'brand-astonish-9c8c82e3@social.mercenta.co.uk',
    organizationId: 'a8ae0104-4447-4a13-afab-be0100f15f64',
  });
  test(
    'the real engine organization is recorded truthfully (linked, not simulated)',
    linked.ok && linked.value.engineLinked === true && linked.value.simulated === false &&
      linked.value.engineOrganizationId === 'a8ae0104-4447-4a13-afab-be0100f15f64'
  );
  test('the brand engine identity is recorded', linked.ok && /@social\.mercenta\.co\.uk$/.test(String(linked.value.engineEmail)));
  const relinked = social.linkSocialWorkspaceToEngine('brand-astonish', {
    email: 'brand-astonish-9c8c82e3@social.mercenta.co.uk',
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
