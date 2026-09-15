// §10/§31 (M13 continuation) — FOUNDER FUNDING / ACCELERATOR PIPELINE validator.
//
// Proves the founder's own funding pipeline is REAL and HONEST:
//   • the three §10 opportunities are the REAL routes (exact URLs), carried with
//     claim classes — never presented as verified terms;
//   • anything the research did not state is NULL, not invented;
//   • the §31 stage machine matches the required order exactly;
//   • SUBMITTED (and every later stage) is UNREACHABLE without a recorded founder
//     approval AND the founder's own submission reference;
//   • no submission is ever claimed, generated or recorded implicitly;
//   • generation is deterministic, wording-linted, and states NOT SUBMITTED;
//   • the surface consumes THIS module (no parallel pipeline) and the whole run
//     makes ZERO network calls.
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';

let networkCalls = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = (...args) => {
  networkCalls += 1;
  console.error('[validate-funding-pipeline] UNEXPECTED network call:', args[0]);
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

const REQUIRED_STAGES = [
  'discovered',
  'qualified',
  'preparing',
  'ready_for_review',
  'founder_approval',
  'submitted',
  'follow_up',
  'interview',
  'decision',
];
const REQUIRED_URLS = [
  'https://solofounders.com/program',
  'https://www.join-thebridge.com/',
  'https://www.ignyte.ae/',
];
const CLAIM_CLASSES = [
  'confirmed_fact',
  'estimate',
  'simulation',
  'third_party_research',
  'pending_confirmation',
];

try {
  const fp = await server.ssrLoadModule('/src/lib/founder/fundingPipeline.ts');
  const founderContent = await server.ssrLoadModule('/src/config/founderContent.ts');

  /* ── §10 — the three REAL founder opportunities ────────────────────────── */
  const opportunities = fp.FOUNDER_FUNDING_OPPORTUNITIES;
  test('exactly the three §10 opportunities are carried', opportunities.length === 3,
    `${opportunities.length}`);
  test('every §10 opportunity uses its REAL url (no invented route)',
    REQUIRED_URLS.every((u) => opportunities.some((o) => o.url === u)) &&
      opportunities.every((o) => REQUIRED_URLS.includes(o.url)),
    opportunities.map((o) => o.url).join(' '));
  test('no opportunity claims a submission and none is founder-verified',
    opportunities.every((o) => o.submissionClaimed === false && o.verifiedByFounder === false));
  test('every researched fact carries a declared claim class + source',
    opportunities.every((o) =>
      [o.fundingAmount, o.equityTerms, o.eligibility].every(
        (c) => c === null || (CLAIM_CLASSES.includes(c.claim) && c.source.length > 10 && c.value.length > 10)
      )),
    'an unlabelled or unsourced claim would be indistinguishable from a verified fact');
  test('claims the research did not state are NULL (never invented)',
    opportunities.filter((o) => o.fundingAmount === null).length === 2 &&
      opportunities.filter((o) => o.equityTerms === null).length === 2,
    'only the Solo Founders Program research states an amount and terms');
  test('no deadline is invented (the research stated none)',
    opportunities.every((o) => o.applicationDeadline === null));
  test('every opportunity tells the founder to VERIFY the current requirements',
    opportunities.every((o) => /verify/i.test(`${o.nextAction} ${o.eligibility.value} ${o.notes}`)));

  /* ── §31 — the stage machine ──────────────────────────────────────────── */
  test('the pipeline order matches §31 exactly',
    JSON.stringify(fp.FUNDING_APPLICATION_STAGES) === JSON.stringify(REQUIRED_STAGES),
    fp.FUNDING_APPLICATION_STAGES.join(' → '));
  test('submission is declared a FOUNDER action and generation is declared automated',
    fp.FUNDING_SUBMISSION_IS_A_FOUNDER_ACTION === true && fp.FUNDING_GENERATION_IS_AUTOMATED === true);
  test('the pipeline disclaimer states that Mercenta submits nothing',
    /does not submit applications to third parties/.test(fp.FUNDING_PIPELINE_DISCLAIMER));

  fp.resetFundingPipeline();
  const atRest = fp.getFundingPipeline();
  test('every opportunity starts DISCOVERED with no approval and no submission',
    atRest.length === 3 &&
      atRest.every((e) => e.stage === 'discovered' && e.approval === null && e.submission === null));
  test('at rest the summary reports ZERO recorded submissions',
    fp.fundingPipelineSummary().recordedSubmissions === 0);

  /* ── §31 — the founder-approval gate is REAL ─────────────────────────── */
  const id = 'fund-solo-founders';
  const skipSubmit = fp.advanceFundingStage({ opportunityId: id, to: 'submitted', actor: 'validator' });
  test('SUBMITTED is REFUSED without a recorded founder approval',
    skipSubmit.ok === false && /FOUNDER APPROVAL/.test(skipSubmit.error), skipSubmit.error ?? '');
  const skipInterview = fp.advanceFundingStage({ opportunityId: id, to: 'interview', actor: 'validator' });
  test('a later post-submission stage is REFUSED too (no approval, no submission)',
    skipInterview.ok === false, skipInterview.error ?? '');
  const unknown = fp.advanceFundingStage({ opportunityId: 'fund-does-not-exist', to: 'qualified', actor: 'validator' });
  test('an unknown opportunity is REFUSED (fail-closed)',
    unknown.ok === false && /Unknown funding opportunity/.test(unknown.error));
  const unknownStage = fp.advanceFundingStage({ opportunityId: id, to: 'almost_submitted', actor: 'validator' });
  test('an unknown stage is REFUSED (fail-closed)',
    unknownStage.ok === false && /Unknown funding stage/.test(unknownStage.error));
  const nameless = fp.recordFounderApproval({ opportunityId: id, approvedBy: '   ' });
  test('an approval that does not name the founder is REFUSED', nameless.ok === false, nameless.error ?? '');
  const premature = fp.recordFundingSubmission({
    opportunityId: id, actor: 'validator', reference: 'REF-123', confirmed: true,
  });
  test('recording a submission before approval is REFUSED',
    premature.ok === false && /approval before/.test(premature.error));
  const unconfirmed = fp.recordFundingSubmission({
    opportunityId: id, actor: 'validator', reference: 'REF-123', confirmed: false,
  });
  test('recording a submission without explicit confirmation is REFUSED',
    unconfirmed.ok === false && /explicit founder confirmation/.test(unconfirmed.error));

  const approved = fp.recordFounderApproval({
    opportunityId: id, approvedBy: 'Founder', at: '2026-09-15T09:00:00.000Z',
  });
  test('a founder approval is recorded and moves the opportunity to FOUNDER APPROVAL',
    approved.ok === true && approved.entry.stage === 'founder_approval' &&
      approved.entry.approval?.approvedBy === 'Founder', approved.ok ? '' : approved.error);
  test('recording an approval does NOT record a submission',
    fp.getFundingPipelineEntry(id)?.submission === null);
  const noReference = fp.recordFundingSubmission({
    opportunityId: id, actor: 'Founder', reference: '  ', confirmed: true,
  });
  test('an approved submission with no reference is still REFUSED',
    noReference.ok === false && /reference is required/.test(noReference.error));
  const stillBlocked = fp.advanceFundingStage({ opportunityId: id, to: 'submitted', actor: 'validator' });
  test('SUBMITTED stays unreachable until the founder records their own reference',
    stillBlocked.ok === false && /submission reference/.test(stillBlocked.error));

  const recorded = fp.recordFundingSubmission({
    opportunityId: id, actor: 'Founder', reference: 'SF-APP-2026-0001', confirmed: true,
    at: '2026-09-15T10:00:00.000Z',
  });
  test('with approval + confirmation + reference the founder submission is recorded',
    recorded.ok === true && recorded.entry.stage === 'submitted' &&
      recorded.entry.submission?.reference === 'SF-APP-2026-0001', recorded.ok ? '' : recorded.error);
  test('the submission date is the FOUNDER-supplied one (nothing auto-generated)',
    recorded.ok === true && recorded.entry.submission?.submittedAt === '2026-09-15T10:00:00.000Z' &&
      recorded.entry.submission?.recordedBy === 'Founder');
  const backwards = fp.advanceFundingStage({ opportunityId: id, to: 'preparing', actor: 'validator' });
  test('a submitted application cannot be moved backwards',
    backwards.ok === false && /cannot be moved backwards/.test(backwards.error));
  const audit = fp.fundingPipelineAudit();
  test('the audit trail records only the real transitions (approval, then submission)',
    audit.length === 2 && audit[0].to === 'founder_approval' && audit[1].to === 'submitted',
    audit.map((a) => a.to).join(','));
  test('the summary now reports exactly ONE recorded submission',
    fp.fundingPipelineSummary().recordedSubmissions === 1);

/* ── §10/§31/§32 — deterministic generation ──────────────────────────── */
  test('generation for an unknown opportunity returns NO draft (fail-closed)',
    fp.generateFundingApplication('fund-does-not-exist') === null);
  const draft = fp.generateFundingApplication('fund-the-bridge', {
    generatedAt: '2026-09-15T11:00:00.000Z',
  });
  test('a real opportunity generates a deterministic draft',
    draft !== null && draft.basis === 'deterministic_template' &&
      draft.generatedAt === '2026-09-15T11:00:00.000Z');
  test('the draft always declares NOT SUBMITTED',
    draft.submissionStatus === 'NOT SUBMITTED — draft for founder review' &&
      /NOT SUBMITTED/.test(draft.content));
  test('the draft passes the EXISTING outward wording gate and programme claim rules',
    draft.lintPassed === true, draft.lintReasons.join('; '));
  test('the draft labels each researched claim, and unstated terms say so',
    /Third-party research/.test(draft.content) && /NOT STATED in the research/.test(draft.content));
  const sixty = founderContent.FOUNDER_PITCHES.find((p) => p.id === 'sixty_seconds');
  test('the draft reuses the CANONICAL founder statement (no second pitch copy)',
    Boolean(sixty) && draft.content.includes(sixty.body));
  test('the draft carries the canonical honesty notice',
    draft.content.includes(founderContent.FOUNDER_HONESTY_NOTICE));
  const draftReplay = fp.generateFundingApplication('fund-the-bridge', {
    generatedAt: '2026-09-15T11:00:00.000Z',
  });
  test('generation is deterministic across replays (identical digest)',
    JSON.stringify(draft) === JSON.stringify(draftReplay));

  fp.resetFundingPipeline();
  test('reset returns the pipeline to the honest initial state',
    fp.getFundingPipeline().every((e) => e.stage === 'discovered' && e.submission === null) &&
      fp.fundingPipelineAudit().length === 0);

  /* ── the surface is wired to THIS module ─────────────────────────────── */
  const panel = read('src/components/admin/GrantsInvestorsSection.tsx');
  const moduleSrc = read('src/lib/founder/fundingPipeline.ts');
  test('the founder surface consumes the funding pipeline module (no parallel pipeline)',
    /from '@\/lib\/founder\/fundingPipeline'/.test(panel) &&
      /FOUNDER_FUNDING_OPPORTUNITIES/.test(panel) &&
      /generateFundingApplication/.test(panel) &&
      /recordFundingSubmission/.test(panel));
  test('the surface exposes stable test ids for the pipeline',
    /data-testid="funding-pipeline"/.test(panel) && /data-testid="funding-submit"/.test(panel));
  test('the surface never claims Mercenta submitted an application',
    !/submitted automatically|Mercenta has submitted|we have submitted/i.test(panel));
  test('the module contains no fetch/XHR, no browser storage and no credential literal',
    !/\bfetch\s*\(|XMLHttpRequest|localStorage|sessionStorage/.test(moduleSrc) &&
      !/password|api[_-]?key/.test(moduleSrc));
  test('the module never hardcodes a fabricated submission state',
    !/status:\s*'submitted'|submitted:\s*true/.test(moduleSrc));

  test('the funding pipeline makes ZERO network calls', networkCalls === 0, `observed ${networkCalls}`);
} catch (err) {
  console.error('[validate-funding-pipeline] THREW:', err);
  failures++;
}

console.log(`\nFUNDING_PIPELINE_VALIDATION_${failures === 0 ? 'PASS' : `FAIL (${failures})`} (${checks} checks)`);
process.exit(failures === 0 ? 0 : 1);
