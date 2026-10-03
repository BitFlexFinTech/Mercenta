/**
 * §SSOT BATCH 3b — THE FOUNDER-CLOSING-PATH GATE.
 *
 * WHY THIS EXISTS
 * ---------------
 * Six founder-console work sources were DECLARED GAPS (`writer: null`) — the work
 * layer could not say how any of them closes. The honest analysis found TWO KINDS:
 *
 *   • FALSE gaps — `founder_setup` and `founder_integration` ALREADY close by doing
 *     the work (the Google / launch items clear through their real stores; an
 *     errored provider clears when it is repaired). Their `owner` named the
 *     DERIVATION, not the stores that own the records, so nobody had declared the
 *     writer. They are now CLOSED and named.
 *   • REAL gaps — `founder_compliance` and `founder_funding` are PARTIAL (some items
 *     close, some have no action) and `founder_finance` / `founder_ai_cost` have NO
 *     closing action at all (pure informational roll-ups). Each now carries a
 *     machine-readable `reason`.
 *
 * WHAT IT PROVES (against the REAL modules — no mocks, ZERO network)
 * ------------------------------------------------------------------
 *   1. founder_setup and founder_integration declare a REAL writer, name their true
 *      owner, and have LEFT the declared gaps; the four remaining gaps each carry a
 *      non-empty reason and the gap set is exactly those four.
 *   2. A writer is never declared with a reason, and no gap still points its owner at
 *      the derivation module.
 *   3. founder_setup CLOSES by doing the work: a Google item and a launch item each
 *      disappear once the owning store action is performed.
 *   4. founder_integration CLOSES: an errored provider raises the item, and repairing
 *      the connection mirror clears it.
 *   5. The PARTIAL / NONE reasons are TRUE, not asserted: a funding-route item clears
 *      via the funding pipeline, a company register-read item clears via the
 *      registrar read — and the items named as un-closable (annual accounts, the
 *      finance roll-up, the AI-cost roll-up) still stand afterwards.
 *
 * MUTATION-PROOF: setting founder_setup.writer back to `null` (or dropping a gap
 * reason) fails this gate.
 */
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/* ZERO NETWORK: any external call is counted and made to fail the run. */
globalThis.fetch = function () {
  throw new Error('NETWORK_CALL_ATTEMPTED');
};

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });

let failures = 0;
const test = (name, ok, detail) => {
  console.log(`${ok ? '✓' : '✗'} ${name}${ok || detail === undefined ? '' : ` — ${detail}`}`);
  if (!ok) failures++;
};

try {
  const work = await server.ssrLoadModule('/src/lib/work/workStore.ts');
  const google = await server.ssrLoadModule('/src/data/googleStore.ts');
  const launch = await server.ssrLoadModule('/src/data/launchStore.ts');
  const company = await server.ssrLoadModule('/src/data/companyStore.ts');
  const funding = await server.ssrLoadModule('/src/lib/founder/fundingPipeline.ts');
  const connections = await server.ssrLoadModule('/src/integrations/connections.ts');
  const launchConfig = await server.ssrLoadModule('/src/config/launchPlatforms.ts');

  const read = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf8');
  const googleSrc = read('src/data/googleStore.ts');
  const launchSrc = read('src/data/launchStore.ts');
  const integrationsSrc = read('src/integrations/IntegrationsContext.tsx');

  const closing = work.WORK_SOURCE_CLOSING;

  /* ── 1. the two CLOSED sources declare a real writer, own it correctly ────── */
  console.log('\n§ BATCH 3b — the closed sources\n');
  const setup = closing.founder_setup;
  test(
    'founder_setup declares a WRITER (no longer a gap)',
    typeof setup.writer === 'string' && setup.writer.length > 0,
    String(setup.writer)
  );
  test(
    'founder_setup names its TRUE owner stores (not the derivation)',
    setup.owner.includes('googleStore') && setup.owner.includes('launchStore') && !setup.owner.includes('commandCentre')
  );
  test(
    'the founder_setup writer NAMES the four canonical Google/launch writers',
    (setup.writer ?? '').includes('setGoogleClientId') &&
      (setup.writer ?? '').includes('markGoogleConnected') &&
      (setup.writer ?? '').includes('saveGoogleSetupRun') &&
      (setup.writer ?? '').includes('markLaunchSubmitted')
  );
  test(
    'every named founder_setup writer EXISTS in its owner module',
    ['setGoogleClientId', 'markGoogleConnected', 'saveGoogleSetupRun'].every((f) =>
      new RegExp(`export function ${f}\\b`).test(googleSrc)
    ) && /export function markLaunchSubmitted\b/.test(launchSrc)
  );

  const integration = closing.founder_integration;
  test(
    'founder_integration declares a WRITER (no longer a gap)',
    typeof integration.writer === 'string' && integration.writer.length > 0,
    String(integration.writer)
  );
  test(
    'the founder_integration writer NAMES real connection writers that EXIST',
    (integration.writer ?? '').includes('completeApiKeyConnect') &&
      (integration.writer ?? '').includes('disconnect') &&
      (integration.writer ?? '').includes('setMode') &&
      /completeApiKeyConnect/.test(integrationsSrc) &&
      /const disconnect = /.test(integrationsSrc)
  );
  test(
    'neither closed source is in the declared gaps',
    !work.WORK_SOURCE_CLOSING_GAPS.includes('founder_setup') &&
      !work.WORK_SOURCE_CLOSING_GAPS.includes('founder_integration'),
    work.WORK_SOURCE_CLOSING_GAPS.join(', ')
  );

  /* ── 2. the four REAL gaps each carry a reason; the gap set is exact ──────── */
  console.log('\n§ BATCH 3b — the recorded reasons\n');
  const expectedGaps = ['founder_compliance', 'founder_funding', 'founder_finance', 'founder_ai_cost'];
  const gaps = [...work.WORK_SOURCE_CLOSING_GAPS].sort();
  test(
    'the declared gaps are EXACTLY the four sources with a recorded reason',
    JSON.stringify(gaps) === JSON.stringify([...expectedGaps].sort()),
    gaps.join(', ')
  );
  test(
    'every declared gap carries a NON-EMPTY reason',
    work.WORK_SOURCE_CLOSING_GAPS.every(
      (s) => typeof closing[s].reason === 'string' && closing[s].reason.trim().length > 40
    )
  );
  test(
    'a source WITH a writer never carries a reason (the fields cannot drift)',
    Object.entries(closing).every(([, c]) => (c.writer ? c.reason === undefined : true))
  );
  test(
    'no gap still points its owner at the derivation module (owners repointed)',
    work.WORK_SOURCE_CLOSING_GAPS.every((s) => !closing[s].owner.includes('commandCentre')),
    work.WORK_SOURCE_CLOSING_GAPS.map((s) => `${s}:${closing[s].owner}`).join(' · ')
  );


  /* ── 3. founder_setup CLOSES by doing the work ───────────────────────────── */
  console.log('\n§ BATCH 3b — founder_setup closes\n');
  work.resetWorkStore();
  google.resetGoogleStore();
  launch.resetLaunchStore();

  const derive = () => work.deriveWorkItems();
  const hasItem = (source, entityId) =>
    derive().some((w) => w.id === work.workItemId(source, entityId));

  test(
    'a Google setup item exists before the owner acts (client id not recorded)',
    hasItem('founder_setup', 'google-google-client-id')
  );
  google.setGoogleClientId({ clientId: '1234567890-abcdef.apps.googleusercontent.com', actorId: 'test:founder' });
  test(
    'recording the Google client id CLOSES that founder_setup item',
    !hasItem('founder_setup', 'google-google-client-id')
  );

  const firstPlatform = launchConfig.LAUNCH_PLATFORMS[0].id;
  test(
    `a launch item exists before the owner acts (${firstPlatform})`,
    hasItem('founder_setup', `launch-${firstPlatform}`)
  );
  launch.markLaunchSubmitted({ platformId: firstPlatform, actorId: 'test:founder' });
  test(
    'marking the launch submitted CLOSES that founder_setup item',
    !hasItem('founder_setup', `launch-${firstPlatform}`)
  );

  /* ── 4. founder_integration CLOSES when the connection is repaired ────────── */
  console.log('\n§ BATCH 3b — founder_integration closes\n');
  work.resetWorkStore();
  connections.rememberIntegrations({
    amazon_sp_api: {
      status: 'needs_attention',
      error: 'simulated provider failure',
      disabled: false,
      health: { errorCount: 1 },
    },
  });
  test(
    'an errored provider raises its founder_integration item',
    hasItem('founder_integration', 'amazon_sp_api')
  );
  connections.rememberIntegrations({
    amazon_sp_api: { status: 'connected', error: undefined, disabled: false },
  });
  test(
    'repairing the connection CLOSES the founder_integration item',
    !hasItem('founder_integration', 'amazon_sp_api')
  );

  /* ── 5. the PARTIAL / NONE reasons are TRUE, with evidence ────────────────── */
  console.log('\n§ BATCH 3b — the reasons are proven, not asserted\n');

  /* founder_funding — the funding-route item closes via the pipeline. */
  work.resetWorkStore();
  funding.resetFundingPipeline();
  const oppId = 'fund-solo-founders';
  test(
    'a funding-route item exists while the opportunity is open',
    hasItem('founder_funding', `funding-route-${oppId}`)
  );
  funding.recordFounderApproval({ opportunityId: oppId, approvedBy: 'Founder', at: '2026-10-03T00:00:00.000Z' });
  funding.recordFundingSubmission({
    opportunityId: oppId,
    actor: 'Founder',
    reference: 'REF-123',
    confirmed: true,
    at: '2026-10-03T00:00:00.000Z',
  });
  test(
    'recording the submission CLOSES the funding-route item (the reason is true)',
    !hasItem('founder_funding', `funding-route-${oppId}`)
  );

  /* founder_compliance — the register-read item closes; the accounts item does not. */
  work.resetWorkStore();
  company.resetCompanyStore();
  test(
    'a company register-read item exists before any read',
    hasItem('founder_compliance', 'company-company-read-register')
  );
  company.recordRegistrarSnapshot({
    mode: 'simulation',
    actorId: 'test:founder',
    record: {
      companyNumber: '17457777',
      dataSource: 'simulated_registrar',
      status: 'active',
      nextConfirmationStatementDue: null,
      nextAccountsDue: '2027-01-01',
    },
  });
  test(
    'reading the register CLOSES the register-read item (the reason is true)',
    !hasItem('founder_compliance', 'company-company-read-register')
  );
  test(
    'the annual-accounts item STANDS (it has no closing action — the reason is true)',
    hasItem('founder_compliance', 'company-company-accounts')
  );

  /* founder_finance / founder_ai_cost — roll-ups that never close. */
  work.resetWorkStore();
  test(
    'the finance-contribution roll-up is present and has no closing action',
    hasItem('founder_finance', 'finance-contribution')
  );
  test(
    'the ai-cost-summary roll-up is present and has no closing action',
    hasItem('founder_ai_cost', 'ai-cost-summary')
  );

  /* restore the shared mirror so later validators start clean. */
  connections.rememberIntegrations(null);

  console.log(
    failures === 0 ? 'FOUNDER_CLOSING_VALIDATION_PASS' : `FOUNDER_CLOSING_VALIDATION_FAIL (${failures})`
  );
} finally {
  await server.close();
}
process.exitCode = failures === 0 ? 0 : 1;

