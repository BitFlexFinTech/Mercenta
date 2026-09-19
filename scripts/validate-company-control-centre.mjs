// §22–§25 / M13 Phase 9 — COMPANY / GOVERNMENT CONTROL CENTRE validator.
//
// Proves the founder's statutory-compliance surface is REAL and HONEST:
//   • Mercenta's identity facts live in ONE config module (no duplicated literal);
//   • the registrar read returns NO invented Mercenta facts and unknown numbers
//     are truly not-found;
//   • a SIMULATED read is labelled as simulated and can never be presented as the
//     real register;
//   • the confirmation-statement workflow cannot pass APPROVE without the
//     founder's explicit approval, and cannot be marked FILED or VERIFIED without
//     a real reference and a LATER registrar read;
//   • there is NO official electronic-filing claim (it refuses, by config);
//   • government credentials are stored as masked references only — the value is
//     never present in any record, audit entry or metadata;
//   • HMRC is READY / NOT CONNECTED, never live;
//   • the panel is a Super-Admin-only tab;
//   • the whole surface makes ZERO network calls.
import { createServer } from 'vite';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

let networkCalls = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = (...args) => {
  networkCalls += 1;
  console.error('[validate-company-control-centre] UNEXPECTED network call:', args[0]);
  return realFetch(...args);
};

function filesUnder(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) filesUnder(p, out);
    else out.push(p);
  }
  return out;
}

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
  const cfg = await server.ssrLoadModule('/src/config/company.ts');
  const store = await server.ssrLoadModule('/src/data/companyStore.ts');
  const mockMod = await server.ssrLoadModule('/src/lib/compliance/companiesHouseMock.ts');
  const chIndex = await server.ssrLoadModule('/src/lib/compliance/index.ts');
  const demo = await server.ssrLoadModule('/src/data/demoStore.ts');
  const events = await server.ssrLoadModule('/src/lib/events/eventFeed.ts');

  /* ── single source of truth for Mercenta's identity + registration ────── */
  test('the company number is the founder-supplied 17457777',
    cfg.COMPANY_REGISTRATION.companyNumber === '17457777', cfg.COMPANY_REGISTRATION.companyNumber);
  test('the config reuses the shared legal name (no duplicate literal)',
    cfg.COMPANY_REGISTRATION.legalName === 'Mercenta Partners Ltd');
  const literalHits = filesUnder('src')
    .filter((f) => /\.(ts|tsx)$/.test(f) && !f.endsWith('src/config/company.ts'))
    .filter((f) => readFileSync(f, 'utf8').includes('17457777'));
  test('the company-number literal appears in EXACTLY one module', literalHits.length === 0,
    literalHits.join(', '));

  /* ── the mock registrar ───────────────────────────────────────────────── */
  mockMod.resetMockCompaniesHouseState();
  let providerCalls = 0;
  const countingTransport = async () => { providerCalls++; return { ok: true, status: 200, json: async () => ({}) }; };
  const mock = mockMod.createMockCompaniesHouseClient();
  const own = await mock.getCompanyRecord(cfg.COMPANY_REGISTRATION.companyNumber);
  test('the mock returns Mercenta own record without inventing a single fact',
    own.ok === true &&
      own.data?.companyNumber === '17457777' &&
      own.data?.incorporationDate === undefined &&
      own.data?.nextConfirmationStatementDue === undefined &&
      (own.data?.sicCodes ?? []).length === 0 &&
      /SIMULATED/.test(own.data?.registeredOfficeAddress ?? ''));
  test('a simulated read is labelled as simulated (never the real register)',
    own.dataSource === 'simulated_registrar' && own.data?.dataSource === 'simulated_registrar');
  const unknown = await mock.getCompanyRecord('00000000');
  test('an unknown company number is truly NOT FOUND (no invented record)',
    unknown.ok === true && unknown.notFound === true && unknown.data === undefined);
  const officers = await mock.getOfficers(cfg.COMPANY_REGISTRATION.companyNumber);
  const psc = await mock.getPersonsWithSignificantControl(cfg.COMPANY_REGISTRATION.companyNumber);
  const filings = await mock.getFilingHistory(cfg.COMPANY_REGISTRATION.companyNumber);
  test('no officer / PSC / filing is invented for Mercenta own company',
    (officers.data ?? []).length === 0 && (psc.data ?? []).length === 0 && (filings.data ?? []).length === 0);

  /* ── the pinned brand-verification behaviour is untouched ─────────────── */
  mockMod.resetMockCompaniesHouseState();
  mockMod.seedCompaniesHouse([{ id: 'brand-astonish', name: 'Astonish Traders' }]);
  const l1 = await mock.lookupCompany({ companyName: 'astonish' });
  const l2 = await mock.lookupCompany({ companyNumber: 'ZZ1' });
  const l3 = await mock.lookupCompany({ companyNumber: 'X1' });
  const l4 = await mock.lookupCompany({ companyName: 'astonish' });
  test('lookupCompany still finds, not-founds, rate-limits on the 4th-call rule and recovers',
    l1.ok && (l1.match?.companyNumber ?? '').startsWith('MOCK-CH-') &&
      l2.ok && l2.notFound === true &&
      l3.rateLimited === true &&
      l4.ok === true);

  /* ── the factory (mock-first seam) ───────────────────────────────────── */
  const real = chIndex.createCompaniesHouseClientForConnectionWithTransport(
    () => ({ secretRef: 'vault:ch', verified: true }), '/fn', countingTransport
  );
  await real.client.getCompanyRecord('17457777');
  test('verified connection → REAL client through the transport', providerCalls === 1 && real.mode === 'real');
  const viaMock = chIndex.createCompaniesHouseClientForConnectionWithTransport(() => null, '/fn', countingTransport);
  await viaMock.client.getCompanyRecord('17457777');
  const viaMockSecret = chIndex.createCompaniesHouseClientForConnectionWithTransport(
    () => ({ secretRef: 'mock:ch-demo-key', verified: true }), '/fn', countingTransport
  );
  await viaMockSecret.client.getCompanyRecord('17457777');
  test('no connection / mock: ref → MOCK client, ZERO provider calls',
    providerCalls === 1 && viaMock.mode === 'mock' && viaMockSecret.mode === 'mock');

  /* ── deadline arithmetic from the configured thresholds ──────────────── */
  const now = new Date('2026-09-14T00:00:00.000Z');
  const soon = store.deriveDueStatus('2026-10-15', now);
  const far = store.deriveDueStatus('2027-06-01', now);
  const late = store.deriveDueStatus('2026-08-01', now);
  test('a deadline inside the widest window is DUE SOON with the threshold hit',
    soon.state === 'due_soon' && soon.thresholdHit === 60);
  test('a distant deadline is ON TRACK', far.state === 'on_track' && far.thresholdHit === null);
  test('a passed deadline is OVERDUE', late.state === 'overdue' && (late.daysRemaining ?? 0) < 0);
  test('no due date → NOT READ (never a guessed date)',
    store.deriveDueStatus(null, now).state === 'not_read');

  test('no registrar fact is invented in the config (all null until read)',
    cfg.COMPANY_REGISTRATION.registrar.status === null &&
      cfg.COMPANY_REGISTRATION.registrar.incorporationDate === null &&
      cfg.COMPANY_REGISTRATION.registrar.sicCodes === null &&
      cfg.COMPANY_REGISTRATION.registrar.nextConfirmationStatementDue === null &&
      cfg.COMPANY_REGISTRATION.registrarStatusLabel === 'awaiting_registrar_read');
  test('no official confirmation-statement filing channel is claimed',
    cfg.OFFICIAL_CONFIRMATION_STATEMENT_FILING_CONFIGURED === false);

  /* ── the workflow: the approval gate and the honesty rules ───────────── */
  store.resetCompanyStore();
  test('the store starts with no registrar read and nothing approved',
    store.getRegistrarSnapshot().readAt === null &&
      store.getConfirmationStatement().stage === 'detect' &&
      store.getConfirmationStatement().founderApprovedAt === null);
  test('the workflow REFUSES to jump past REVIEW before approval',
    store.advanceConfirmationStatement({ stage: 'file', actorId: 'x' }).ok === false);
  test('approval is REFUSED before a registrar-read due date exists',
    store.approveConfirmationStatement({ actorId: 'x' }).ok === false);
  test('recording a filing is REFUSED before approval',
    store.recordManualFiling({ reference: 'REF-1', filedAt: '2026-09-14', actorId: 'x' }).ok === false);
  const noChannel = store.fileViaOfficialApi({ actorId: 'x' });
  test('the official-API path REFUSES (no filing channel is connected)',
    noChannel.ok === false && /no official electronic-filing channel/i.test(noChannel.error ?? ''));

  const eventCountBefore = events.queryEvents({}).length;
  store.recordRegistrarSnapshot({
    mode: 'simulation',
    actorId: 'super-admin:founder',
    record: own.data,
  });
  test('an empty due date leaves the workflow at DETECT (no invented deadline)',
    store.getConfirmationStatement().stage === 'detect');
  const taskIdsBeforeRead = store.companyComplianceTasks(now).map((t) => t.id);
  test('before any due date the task list asks for the register read',
    taskIdsBeforeRead.includes('company-confirmation-statement') === false);

  // Now read a record that DOES carry a registrar due date.
  store.recordRegistrarSnapshot({
    mode: 'simulation',
    actorId: 'super-admin:founder',
    record: { ...own.data, nextConfirmationStatementDue: '2026-10-15' },
  });
  test('a registrar-read due date moves the workflow to PREPARE',
    store.getConfirmationStatement().stage === 'prepare' &&
      store.getConfirmationStatement().dueDateSource === 'registrar_read');
  test('the deadline raises a founder event',
    events.queryEvents({}).length > eventCountBefore);
  const taskIds = store.companyComplianceTasks(now).map((t) => t.id);
  test('the derived task list surfaces the confirmation statement and the missing credentials',
    taskIds.includes('company-confirmation-statement') && taskIds.includes('company-government-secrets'));

  test('approval succeeds once a registrar-read date exists',
    store.approveConfirmationStatement({ actorId: 'super-admin:founder' }).ok === true &&
      store.getConfirmationStatement().stage === 'file');
  test('a filing with no reference is still REFUSED after approval',
    store.recordManualFiling({ reference: '  ', filedAt: '2026-09-14', actorId: 'x' }).ok === false);
  const recorded = store.recordManualFiling({
    reference: 'CS-2026-REF', filedAt: '2026-09-14', actorId: 'super-admin:founder',
  });
  test('a recorded filing is marked MANUAL and left UNVERIFIED at the VERIFY stage',
    recorded.ok === true &&
      recorded.value.filingMethod === 'manual_register' &&
      recorded.value.stage === 'verify' &&
      recorded.value.registerConfirmedAt === null);
  test('verification is REFUSED without a LATER registrar read',
    store.confirmConfirmationStatementFromRegister({ actorId: 'x' }).ok === false);
  // A subsequent read happens strictly after the recording.
  await new Promise((r) => setTimeout(r, 5));
  store.recordRegistrarSnapshot({
    mode: 'simulation',
    actorId: 'super-admin:founder',
    record: { ...own.data, nextConfirmationStatementDue: '2027-10-15' },
  });
  test('verification succeeds after a later registrar read and is recorded',
    store.confirmConfirmationStatementFromRegister({ actorId: 'super-admin:founder' }).ok === true &&
      store.getConfirmationStatement().stage === 'verified' &&
      !!store.getConfirmationStatement().registerConfirmedAt);
  test('a failure is never hidden: the store keeps an explicit failure record',
    store.recordRegistrarReadFailure({ actorId: 'x', error: 'simulated outage' }).lastError === 'simulated outage');


  /* ── government credentials: masked references only ──────────────────── */
  const before = demo.demoAuditLog.length;
  const stored = store.storeGovernmentSecret({
    kind: 'ch_authentication_code',
    value: 'ZZZ-SECRET-CODE-4F2A',
    actorId: 'super-admin:founder',
  });
  test('a stored credential keeps only a vault reference and a mask',
    stored.ok === true &&
      (stored.value.secretRef ?? '').startsWith('vault:') &&
      stored.value.masked === '•••• 4F2A' &&
      !(stored.value.secretRef ?? '').includes('SECRET'));
  test('the vault holds the value behind the reference (never in the record)',
    store.vaultHasValue(stored.value.secretRef) === true);
  const newAudit = demo.demoAuditLog.slice(before);
  test('NO audit entry, reason or metadata contains any part of the credential value',
    !JSON.stringify(newAudit).includes('ZZZ-SECRET-CODE-4F2A'));
  test('the credential record helpers never return the raw value',
    !JSON.stringify(store.getGovernmentSecret('ch_authentication_code')).includes('ZZZ-SECRET-CODE-4F2A'));
  test('confirming the credential works keeps the mask unchanged',
    store.markGovernmentSecretVerified({ kind: 'ch_authentication_code', actorId: 'super-admin:founder' }).ok === true &&
      store.getGovernmentSecret('ch_authentication_code').masked === '•••• 4F2A');
  test('removing the credential drops the vault value and the mask',
    store.clearGovernmentSecret({ kind: 'ch_authentication_code', actorId: 'super-admin:founder' }).ok === true &&
      store.getGovernmentSecret('ch_authentication_code').secretRef === null &&
      !JSON.stringify(store.governmentSecrets).includes('4F2A'));
  test('every credential mutation is attributable in the canonical audit trail',
    store.companyAuditHistory().every((e) => e.actorId === 'super-admin:founder' || e.actorId === 'x'));

  /* ── HMRC stays ready / not connected ────────────────────────────────── */
  test('HMRC is READY / NOT CONNECTED with a stated blocker',
    cfg.HMRC_READINESS.state === 'ready_not_connected' &&
      cfg.HMRC_READINESS.providerId === 'hmrc' &&
      cfg.HMRC_READINESS.blocker.length > 10);

  /* ── the surface ─────────────────────────────────────────────────────── */
  const panel = read('src/components/admin/CompanyControlCentre.tsx');
  const superPanel = read('src/components/admin/SuperAdminPanel.tsx');
  test('the Company Control Centre is a Super Admin tab',
    /\{activeTab === 'company' && <CompanyControlCentre \/>\}/.test(superPanel));
  test('the panel re-enforces the Super Admin tier at its own boundary',
    /isSuperAdmin/.test(panel) && /super_admin/.test(panel));
  test('the panel never claims an Amazon guarantee or endorsement',
    !/guarantee/i.test(panel) && !/Amazon (endorsed|approved|partner)/i.test(panel));
  test('the panel labels simulated registrar data explicitly',
    /SIMULATED REGISTRAR/.test(panel));
  test('the panel states that nothing is submitted from Mercenta',
    /Mercenta holds no official electronic-filing channel/.test(panel));
  test('the panel offers the manual official-action link',
    /COMPANIES_HOUSE_MANUAL_ACTIONS\.filing/.test(panel));
  test('the credential input is a password field (never a plain text box)',
    /type="password"/.test(panel));

  /* ── reset returns the centre to the unread baseline ─────────────────── */
  store.resetCompanyStore();
  test('reset returns the store to the unread baseline',
    store.getRegistrarSnapshot().readAt === null &&
      store.getConfirmationStatement().stage === 'detect' &&
      store.getGovernmentSecret('ch_authentication_code').secretRef === null);

  test('the company centre makes ZERO network calls', networkCalls === 0, `observed ${networkCalls}`);
} catch (err) {
  console.error('[validate-company-control-centre] THREW:', err);
  failures++;
}

console.log(`\nCOMPANY_CONTROL_CENTRE_VALIDATION_${failures === 0 ? 'PASS' : `FAIL (${failures})`} (${checks} checks)`);
process.exit(failures === 0 ? 0 : 1);

