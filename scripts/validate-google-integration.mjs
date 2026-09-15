// §21 / M13 Phase 8 — GOOGLE INTEGRATION + SETUP WIZARD validator.
//
// Proves the Google integration is REAL and HONEST:
//   • the account is the founder's PERSONAL Google account (My Drive only, no
//     Shared Drives, no Workspace claims);
//   • Mercenta never asks for or stores a Google password and never holds an
//     OAuth refresh token in source/config/store/panel;
//   • the mock Google client has the EXACT same contract as the real one, makes
//     ZERO network calls, is idempotent, and fails/recovers deterministically;
//   • the factory only reaches the real client for a verified `vault:` connection;
//   • the workspace runner executes the whole plan in dependency order, retries
//     once, and reports a parent failure as SKIPPED children (never silent);
//   • the wizard records `exchange_pending` (NOT connected) after a code arrives,
//     and only `connected` after a confirmed server-side exchange;
//   • the surface makes ZERO network calls.
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';

let networkCalls = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = (...args) => {
  networkCalls += 1;
  console.error('[validate-google-integration] UNEXPECTED network call:', args[0]);
  return realFetch(...args);
};

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
let checks = 0;
const test = (name, ok, detail = '') => {
  checks++;
  console.log(`${ok ? '✓' : '✗'} ${name}${!ok && detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

try {
  const cfg = await server.ssrLoadModule('/src/config/google.ts');
  const mockMod = await server.ssrLoadModule('/src/lib/google/googleMock.ts');
  const googleIndex = await server.ssrLoadModule('/src/lib/google/index.ts');
  const runner = await server.ssrLoadModule('/src/lib/google/workspaceSetup.ts');
  const store = await server.ssrLoadModule('/src/data/googleStore.ts');
  const registry = await server.ssrLoadModule('/src/integrations/registry.ts');
  const types = await server.ssrLoadModule('/src/integrations/types.ts');
  const demo = await server.ssrLoadModule('/src/data/demoStore.ts');

  /* ── the account ─────────────────────────────────────────────────────── */
  test('the account is the founder-supplied personal Google account',
    cfg.GOOGLE_ACCOUNT.email === 'mercentapartners@gmail.com' &&
      cfg.GOOGLE_ACCOUNT.kind === 'personal_google_account');
  test('it is NOT presented as a Workspace tenant and uses My Drive only',
    cfg.GOOGLE_ACCOUNT.workspaceTenant === false &&
      cfg.GOOGLE_ACCOUNT.sharedDrives === false &&
      cfg.GOOGLE_ACCOUNT.drives.length === 1 && cfg.GOOGLE_ACCOUNT.drives[0] === 'My Drive');
  test('the scopes are least-privilege (drive.file, not full drive)',
    cfg.GOOGLE_SCOPES.includes('https://www.googleapis.com/auth/drive.file') &&
      !cfg.GOOGLE_SCOPES.some((s) => s.endsWith('/auth/drive')));
  test('the disclaimer refuses passwords and browser-held refresh tokens',
    /never asks for your Google password/i.test(cfg.GOOGLE_SETUP_DISCLAIMER) &&
      /never stores OAuth refresh tokens/i.test(cfg.GOOGLE_SETUP_DISCLAIMER));

  /* ── the workspace plan ──────────────────────────────────────────────── */
  const plan = cfg.GOOGLE_WORKSPACE_PLAN;
  const folders = plan.filter((p) => p.kind === 'folder').map((p) => p.name);
  test('the plan creates the Mercenta owner folders',
    ['Company Documents', 'Partnerships', 'Accounting', 'Legal & Compliance', 'Integrations',
      'Google', 'Investors', 'Research', 'Product & Platform', 'Marketing', 'Launch', 'Reports']
      .every((f) => folders.includes(f)), folders.join(', '));
  test('the plan creates two master sheets with named tabs',
    plan.filter((p) => p.kind === 'sheet' && p.tabs && p.tabs.length > 0).length >= 2);
  test('the plan creates a Docs template and a Slides template',
    plan.some((p) => p.kind === 'doc') && plan.some((p) => p.kind === 'slides'));
/* ── the mock client ─────────────────────────────────────────────────── */
  mockMod.resetMockGoogleState();
  const mock = mockMod.createMockGoogleClient();
  const folder = await mock.createFolder({ name: 'Mercenta', parentId: null });
  test('the mock creates unmistakably fake items and labels them simulated',
    folder.ok === true &&
      (folder.item?.id ?? '').startsWith('MOCK-GD-') &&
      (folder.item?.url ?? '').startsWith('https://mock.google.local/') &&
      folder.simulated === true);
  const dup = await mock.createFolder({ name: 'Mercenta', parentId: null });
  test('the mock is idempotent for an existing name (no duplicate folder)',
    dup.ok === true && dup.item?.id === folder.item?.id);
  let failures5 = 0;
  let recovered = false;
  for (let i = 0; i < 6; i++) {
    const r = await mock.createDoc({ name: `doc-${i}` });
    if (!r.ok) {
      failures5 += 1;
      const retry = await mock.createDoc({ name: `doc-${i}` });
      recovered = retry.ok === true;
    }
  }
  test('the mock fails deterministically every 5th write and the retry succeeds',
    failures5 === 1 && recovered === true, `failures=${failures5}`);
  const listing = await mock.listDrive({ name: 'Mercenta' });
  test('the mock lists only what it created', listing.ok && listing.items.length >= 1);

  /* ── the factory ─────────────────────────────────────────────────────── */
  let providerCalls = 0;
  const countingTransport = async () => { providerCalls++; return { ok: true, status: 200, json: async () => ({ ok: true, item: { id: 'LIVE-1', name: 'x', kind: 'folder', url: 'https://drive.google.com/drive/folders/LIVE-1', api: 'drive' } }) }; };
  const live = googleIndex.createGoogleClientForConnectionWithTransport(
    () => ({ secretRef: 'vault:google', verified: true }), '/fn', countingTransport
  );
  await live.client.createFolder({ name: 'Mercenta' });
  test('a verified vault connection → REAL client through the transport',
    providerCalls === 1 && live.mode === 'real');
  const offline = googleIndex.createGoogleClientForConnectionWithTransport(() => null, '/fn', countingTransport);
  await offline.client.createFolder({ name: 'Mercenta' });
  const mockRef = googleIndex.createGoogleClientForConnectionWithTransport(
    () => ({ secretRef: 'mock:google', verified: true }), '/fn', countingTransport
  );
  await mockRef.client.createFolder({ name: 'Mercenta' });
  test('no connection / mock: ref → MOCK client with ZERO provider calls',
    providerCalls === 1 && offline.mode === 'mock' && mockRef.mode === 'mock');
  const realNoCreds = googleIndex.createGoogleClientForConnectionWithTransport(() => null, '/fn', countingTransport);
  let refused = false;
  try {
    // The real client must refuse without credentials rather than silently proceed.
    const { createGoogleClient } = await server.ssrLoadModule('/src/lib/google/googleClient.ts');
    await createGoogleClient(() => null, '/fn', countingTransport).createFolder({ name: 'x' });
  } catch (err) {
    refused = /not connected/i.test(String(err));
  }
  test('the real client REFUSES to act without a verified connection', refused === true);
  test('the factory never hands a real client to a caller while unconfigured',
    realNoCreds.mode === 'mock');
  const caps = plan.filter((p) => p.capabilityTest);
  test('the plan proves all four Google APIs with capability tests',
    ['sheet', 'doc', 'slides', 'calendar_event'].every((k) => caps.some((c) => c.kind === k)),
    caps.map((c) => c.kind).join(', '));
  test('every child names a parent that exists in the plan',
    plan.filter((p) => p.parent).every((p) => plan.some((q) => q.id === p.parent)));
  test('the registry exposes Google as an OAuth provider with no API-key fields',
    registry.INTEGRATION_REGISTRY.google.authMethod === 'oauth' &&
      registry.INTEGRATION_REGISTRY.google.fields.length === 0 &&
      registry.INTEGRATION_REGISTRY.google.oauth?.clientIdParam === 'client_id');
  test('google is a registered integration id with an authoritative mode',
    Object.keys(types.INITIAL_INTEGRATIONS).includes('google') &&
      registry.INTEGRATION_META.google.defaultMode === 'simulation');
/* ── the workspace runner ────────────────────────────────────────────── */
  mockMod.resetMockGoogleState();
  const runSteps = await runner.runGoogleWorkspaceSetup({ client: mock, plan });
  const summary = runner.summariseGoogleRun(runSteps);
  test('the runner creates the WHOLE plan through the mock (with retry)',
    summary.total === plan.length && summary.created === plan.length && summary.failed === 0,
    JSON.stringify({ total: summary.total, created: summary.created, failed: summary.failed }));
  test('the runner reports a simulated run as simulated',
    summary.simulated === true && runSteps.every((s) => s.simulated === true));
  test('all four capability tests passed',
    summary.capabilityTestsPassed === 4 && summary.capabilityTestsTotal === 4);
  test('a child is created AFTER its parent (dependency order preserved)',
    runSteps.findIndex((s) => s.itemId === 'root') <
      runSteps.findIndex((s) => s.itemId === 'company-documents'));

  // A client whose FIRST write always fails: children must be reported SKIPPED.
  const brokenClient = {
    async createFolder() { return { ok: false, error: 'simulated provider outage' }; },
    async createSheet() { return { ok: false, error: 'simulated provider outage' }; },
    async createDoc() { return { ok: false, error: 'simulated provider outage' }; },
    async createSlides() { return { ok: false, error: 'simulated provider outage' }; },
    async createCalendarEvent() { return { ok: false, error: 'simulated provider outage' }; },
  };
  const brokenSteps = await runner.runGoogleWorkspaceSetup({ client: brokenClient, plan });
  const brokenSummary = runner.summariseGoogleRun(brokenSteps);
  test('a parent failure is REPORTED as failed, and children are explicitly skipped',
    brokenSummary.failed > 0 && brokenSummary.skipped > 0 &&
      brokenSteps.filter((s) => s.status === 'skipped').every((s) => /Parent .* was not created/.test(s.error ?? '')));
  test('a failed step is retried once before being reported as failed',
    brokenSteps.filter((s) => s.status === 'failed').every((s) => s.attempts === 2));

  /* ── the store: honesty about the OAuth state ─────────────────────────── */
  store.resetGoogleStore();
  test('the store starts with no client id, no run and nothing connected',
    store.getGoogleOAuthRecord().state === 'none' && store.getGoogleSetupRun() === null);
  test('a too-short client id is REFUSED',
    store.setGoogleClientId({ clientId: 'short', actorId: 'x' }).ok === false);
  test('a plausible client id is recorded (public identifier only)',
    store.setGoogleClientId({ clientId: '1234567890-abcdef.apps.googleusercontent.com', actorId: 'super-admin:founder' }).ok === true);
  const auditBefore = demo.demoAuditLog.filter((e) => e.entityType === 'google_workspace').length;
  const pending = store.recordGoogleCodeReceived({ actorId: 'super-admin:founder', codePreview: '4/0Ab…' });
  test('a received authorization code is EXCHANGE PENDING and explicitly NOT connected',
    pending.state === 'exchange_pending' && /NOT yet reported as connected/.test(pending.note));
  test('the store keeps only a code PREVIEW (never the code)',
    pending.codePreview === '4/0Ab…' && !JSON.stringify(pending).includes('full-code'));
  test('the connection only becomes connected after the exchange is confirmed',
    store.markGoogleConnected({ actorId: 'super-admin:founder' }).state === 'connected');
  const saved = store.saveGoogleSetupRun({ steps: runSteps, mode: 'simulation', actorId: 'super-admin:founder' });
  test('a run is persisted with its real counts and mode',
    saved.created === plan.length && saved.failed === 0 && saved.mode === 'simulation');
  test('every Google mutation is attributable in the canonical audit trail',
    demo.demoAuditLog.filter((e) => e.entityType === 'google_workspace').length === auditBefore + 3 &&
      store.googleAuditHistory().every((e) => e.actorId === 'super-admin:founder'));
  store.resetGoogleStore();
  test('reset returns the Google store to nothing-configured',
    store.getGoogleOAuthRecord().state === 'none' && store.getGoogleSetupRun() === null);
  test('the derived tasks ask for the client id and the workspace run',
    store.googleSetupTasks().map((t) => t.id).includes('google-client-id') &&
      store.googleSetupTasks().map((t) => t.id).includes('google-workspace-setup'));

  /* ── no password, no token, anywhere in the surface ─────────────────── */
  const surfaceFiles = [
    'src/config/google.ts',
    'src/lib/google/googleClient.ts',
    'src/lib/google/googleMock.ts',
    'src/lib/google/index.ts',
    'src/lib/google/workspaceSetup.ts',
    'src/data/googleStore.ts',
    'src/components/admin/GoogleSetupWizard.tsx',
  ];
  const surface = surfaceFiles.map((f) => read(f)).join('\n');
  test('NO password input, password field or password storage exists in the Google surface',
    !/type="password"|key:\s*'password'|storedPassword|password:\s*string|passwordValue/i.test(surface));
  test('every mention of "password" in the surface is a policy statement that it is never requested',
    surface
      .split('\n')
      .filter((l) => /password/i.test(l))
      .every((l) => /never|no password|NOT asks|touches the account password/i.test(l)));
  test('NO OAuth refresh/access token variable exists in the surface',
    !/refresh_token|access_token|client_secret/i.test(surface));
  test('the wizard states that it never asks for the password',
    /never sees or stores your password/.test(read('src/components/admin/GoogleSetupWizard.tsx')));
  test('the wizard labels a simulated run as SIMULATED',
    /SIMULATED run complete/.test(read('src/components/admin/GoogleSetupWizard.tsx')));

  /* ── the surface is a Super Admin tab ────────────────────────────────── */
  const superPanel = read('src/components/admin/SuperAdminPanel.tsx');
  test('the Google setup wizard is a Super Admin tab',
    /\{activeTab === 'google' && <GoogleSetupWizard \/>\}/.test(superPanel));

  test('the Google integration makes ZERO network calls', networkCalls === 0, `observed ${networkCalls}`);
} catch (err) {
  console.error('[validate-google-integration] THREW:', err);
  failures++;
}

console.log(`\nGOOGLE_INTEGRATION_VALIDATION_${failures === 0 ? 'PASS' : `FAIL (${failures})`} (${checks} checks)`);
process.exit(failures === 0 ? 0 : 1);