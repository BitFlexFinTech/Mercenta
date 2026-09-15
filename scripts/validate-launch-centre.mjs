// §31 / Phase M13 — MERCENTA LAUNCH CENTRE validator.
//
// Proves the founder's own launch workflow is REAL and honest:
//   • all 14 §31 platforms are present, each with a site, a signup route and the
//     requirements page;
//   • NO automated submission or platform API is claimed anywhere (the honesty
//     invariant), and per-platform requirements are marked NOT yet verified;
//   • the submission package is complete and contains no unsupported claim wording;
//   • the state machine is real: unknown platforms are REFUSED, mark-submitted is
//     attributable in the canonical audit trail, and reset restores the baseline;
//   • the surface is Super-Admin only;
//   • zero network calls.
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';

let networkCalls = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = (...args) => {
  networkCalls += 1;
  console.error('[validate-launch-centre] UNEXPECTED network call:', args[0]);
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
  const cfg = await server.ssrLoadModule('/src/config/launchPlatforms.ts');
  const store = await server.ssrLoadModule('/src/data/launchStore.ts');
  const pkg = await server.ssrLoadModule('/src/lib/founder/launchPackage.ts');
  const demo = await server.ssrLoadModule('/src/data/demoStore.ts');

  /* ── the platform registry ─────────────────────────────────────────────── */
  test('exactly the 14 §31 platforms are declared',
    cfg.LAUNCH_PLATFORMS.length === 14, String(cfg.LAUNCH_PLATFORMS.length));
  const ids = cfg.LAUNCH_PLATFORMS.map((p) => p.id);
  test('every platform id is unique', new Set(ids).size === ids.length);
  const expected = ['Product Hunt', 'Indie Hackers', 'Hacker News', 'BetaList', 'SourceForge',
    'Uneed', 'Peerlist', 'Microlaunch', 'AlternativeTo', 'Dev Hunt', 'SaaSHub',
    'Launching Next', 'StartupBase', 'Tiny Startups'];
  test('the platform names match the §31 list exactly',
    expected.every((n) => cfg.LAUNCH_PLATFORMS.some((p) => p.name === n)),
    cfg.LAUNCH_PLATFORMS.map((p) => p.name).join(', '));
  test('every platform carries a site, a signup route and a requirements page',
    cfg.LAUNCH_PLATFORMS.every((p) =>
      /^https:\/\//.test(p.siteUrl) &&
      /^https:\/\//.test(p.signupUrl) &&
      /^https:\/\//.test(p.requirementsUrl)));
  test('every platform states who the audience is and what it expects',
    cfg.LAUNCH_PLATFORMS.every((p) => p.audience.length > 10 && p.knownRequirements.length > 0));

  /* ── the honesty invariants (§31) ─────────────────────────────────────── */
  test('NO platform claims an authorised submission API',
    cfg.LAUNCH_PLATFORMS.every((p) => p.apiAvailable === false));
  test('NO platform claims its requirements have been verified',
    cfg.LAUNCH_PLATFORMS.every((p) => p.requirementsVerified === false));
  test('the standing disclaimer denies integration and automated submission',
    /no automated submission/i.test(cfg.LAUNCH_CENTRE_DISCLAIMER) &&
      /claims no integration/i.test(cfg.LAUNCH_CENTRE_DISCLAIMER));

  /* ── the submission package ────────────────────────────────────────────── */
  const profile = cfg.DEFAULT_LAUNCH_PROFILE;
  const hunt = cfg.LAUNCH_PLATFORMS.find((p) => p.id === 'product_hunt');
  const text = pkg.buildSubmissionPackage(hunt, profile);
  test('the package carries name, tagline, both descriptions, categories, website and founder',
    ['Mercenta Partners', profile.tagline, profile.shortDescription.slice(0, 40),
      profile.longDescription.slice(0, 40), profile.categories[0], profile.website,
      profile.founderProfile.slice(0, 20)].every((s) => text.includes(s)));
  test('the package tells the founder to verify the requirements page',
    text.includes(hunt.requirementsUrl) && /NOT YET VERIFIED/i.test(text));
  test('the package repeats that no automated submission exists',
    /no automated submission/i.test(text));
  test('the package contains no unsupported claim wording',
    !/\bguaranteed?\b|\bwe sell directly to\b|\bbypass\b/i.test(text));
  test('the package is tailored per platform (name + audience differ)',
    pkg.buildSubmissionPackage(cfg.LAUNCH_PLATFORMS[1], profile).includes(cfg.LAUNCH_PLATFORMS[1].name) &&
      pkg.buildSubmissionPackage(cfg.LAUNCH_PLATFORMS[1], profile) !== text);
/* ── the state machine ─────────────────────────────────────────────────── */
  store.resetLaunchStore();
  const baseline = store.getLaunchRecords();
  test('the store boots one record per platform, all unprepared',
    baseline.length === 14 &&
      baseline.every((r) => r.profileStatus === 'not_prepared' && r.submittedAt === null));
  test('an unknown platform is REFUSED (fail-closed)',
    store.markLaunchSubmitted({ platformId: 'not_a_platform', actorId: 'x' }).ok === false &&
      store.updateLaunchRecord({ platformId: 'not_a_platform', actorId: 'x', patch: {} }).ok === false);
  test('no platform is "complete" before it is submitted',
    baseline.every((r) => !pkg.launchPlatformIsComplete(r)));

  const auditBefore = demo.demoAuditLog.filter((e) => e.entityType === 'mercenta_launch_platform').length;
  const prep = store.updateLaunchRecord({
    platformId: 'product_hunt',
    actorId: 'super-admin:founder',
    patch: { profileStatus: 'prepared' },
    reason: 'Prepared in validator',
  });
  test('preparing a profile records the change',
    prep.ok === true && prep.record.profileStatus === 'prepared');
  test('preparing is NOT the same as submitting (the checklist distinguishes them)',
    prep.ok === true && pkg.launchPlatformIsComplete(prep.record) === false);

  const submitted = store.markLaunchSubmitted({
    platformId: 'product_hunt',
    actorId: 'super-admin:founder',
  });
  test('mark-submitted sets the status AND a timestamp',
    submitted.ok === true &&
      submitted.record.profileStatus === 'submitted' &&
      !!submitted.record.submittedAt);
  test('a submitted platform is complete and drops out of the outstanding list',
    pkg.launchPlatformIsComplete(submitted.record) === true &&
      !pkg
        .outstandingPlatforms(store.getLaunchRecords())
        .some(({ platform }) => platform.id === 'product_hunt'));
  test('the checklist still shows the verify-on-platform item outstanding',
    pkg.buildSubmissionChecklist(hunt, submitted.record).some((i) => i.verifyOnPlatform && !i.done));

  const auditAfter = demo.demoAuditLog.filter((e) => e.entityType === 'mercenta_launch_platform');
  test('every launch mutation is attributable in the canonical audit trail',
    auditAfter.length === auditBefore + 2 &&
      auditAfter.every((e) => e.actorId === 'super-admin:founder') &&
      auditAfter.some((e) => e.action === 'launch_platform_submitted'));
  test('the audit trail exposes the launch history',
    store.launchAuditHistory().length === auditAfter.length);

  store.resetLaunchStore();
  test('reset returns the centre to its baseline',
    store.getLaunchSummary().submitted === 0 && store.getLaunchSummary().accountsCreated === 0);

  /* ── Super-Admin-only surface ──────────────────────────────────────────── */
  const panel = read('src/components/admin/SuperAdminPanel.tsx');
  const shell = read('src/components/layout/AdminShell.tsx');
  test('the Launch Centre is a Super Admin tab',
    /\{activeTab === 'launch' && <LaunchCentre \/>\}/.test(panel));
  test('Super Admin itself is role-gated in the shell',
    /adminView === 'super_admin' && \(isSuper \? <SuperAdminPanel \/> : <AccessDenied \/>\)/.test(shell));

  test('the launch centre makes ZERO network calls', networkCalls === 0, `observed ${networkCalls}`);
} catch (err) {
  console.error('[validate-launch-centre] THREW:', err);
  failures++;
}

console.log(`\nLAUNCH_CENTRE_VALIDATION_${failures === 0 ? 'PASS' : `FAIL (${failures})`} (${checks} checks)`);
process.exit(failures === 0 ? 0 : 1);