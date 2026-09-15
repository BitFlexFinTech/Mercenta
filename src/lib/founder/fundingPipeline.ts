/**
 * §10/§31 (M13 continuation) — FOUNDER FUNDING / ACCELERATOR PIPELINE.
 *
 * This is the founder's OWN pipeline (Super Admin only) for real accelerator,
 * residency and ecosystem opportunities. Four rules make it safe:
 *
 *   1. NO INVENTED TERMS. Every researched fact carries a claim class
 *      (`third_party_research` / `pending_confirmation`) and its source. Where the
 *      research states no amount, the amount is `null` — not a plausible guess.
 *   2. NO CLAIMED APPLICATION. `submissionClaimed` is always `false` and the
 *      submission record is created ONLY when the FOUNDER records one with their
 *      own reference. Mercenta never submits to a third party on its own.
 *   3. THE §31 APPROVAL GATE IS REAL. A move into SUBMITTED (or any later stage)
 *      is REFUSED unless a founder approval has actually been recorded AND the
 *      founder has supplied a submission reference. `recordFundingSubmission`
 *      also refuses without an explicit confirmation flag.
 *   4. GENERATION IS DETERMINISTIC. The application text is assembled from the
 *      record with no model call, then linted by the EXISTING wording gates
 *      (`lintOutwardWording` + `lintAmazonWording`); unsafe copy is REPORTED, not
 *      silently sanitised. Zero network calls anywhere in this module.
 */
import { BRAND_DOMAIN, BRAND_LEGAL_NAME, BRAND_NAME } from '@/config/brand';
import { FOUNDER_HONESTY_NOTICE, FOUNDER_PITCHES } from '@/config/founderContent';
import { lintOutwardWording } from '@/lib/discovery/wordingSafety';
import { lintAmazonWording } from '@/lib/intelligence/amazonWording';
import { CLAIM_LABELS, type ClaimClass } from '@/lib/intelligence/opportunityDiscovery';

/* ── §10 — the real founder opportunities (researched, NOT verified) ──────── */

export type FundingOpportunityType =
  | 'accelerator_programme'
  | 'residency_programme'
  | 'ecosystem_membership';

export const FUNDING_OPPORTUNITY_TYPE_LABELS: Record<FundingOpportunityType, string> = {
  accelerator_programme: 'Accelerator programme',
  residency_programme: 'Residency programme',
  ecosystem_membership: 'Ecosystem / membership',
};

/** A researched fact that can never be quoted without its claim class + source. */
export interface SourcedFundingClaim {
  value: string;
  claim: ClaimClass;
  source: string;
}

export interface FounderFundingOpportunity {
  id: string;
  organisation: string;
  url: string;
  opportunityType: FundingOpportunityType;
  geography: string;
  /** `null` when the research states no amount. NEVER invented. */
  fundingAmount: SourcedFundingClaim | null;
  /** `null` when the research states no terms. NEVER invented. */
  equityTerms: SourcedFundingClaim | null;
  eligibility: SourcedFundingClaim;
  /** `null` = the research did not state a deadline. Verify before submitting. */
  applicationDeadline: string | null;
  deadlineClaim: ClaimClass;
  requiredDocuments: readonly string[];
  nextAction: string;
  notes: string;
  /** ALWAYS false in this build — the founder has not confirmed the current terms. */
  verifiedByFounder: false;
  /** ALWAYS false — no application has been submitted to any programme. */
  submissionClaimed: false;
}

const RESEARCH_DATE = 'founder-supplied research, 2026-09-15';

/**
 * The three REAL founder opportunities (§10). Each is a live route the founder
 * intends to work — not example data — and each states its claim class so no
 * surface can present researched terms as verified facts.
 */
export const FOUNDER_FUNDING_OPPORTUNITIES: readonly FounderFundingOpportunity[] = [
  {
    id: 'fund-solo-founders',
    organisation: 'Solo Founders Program',
    url: 'https://solofounders.com/program',
    opportunityType: 'accelerator_programme',
    geography: 'San Francisco, United States — in person',
    fundingAmount: {
      value:
        'USD 100,000 investment on founder-friendly terms (as researched — verify the current terms before relying on them)',
      claim: 'third_party_research',
      source: `https://solofounders.com/program (${RESEARCH_DATE})`,
    },
    equityTerms: {
      value: '2.5% equity (as researched — verify the current terms before relying on them)',
      claim: 'third_party_research',
      source: `https://solofounders.com/program (${RESEARCH_DATE})`,
    },
    eligibility: {
      value:
        'A three-month in-person San Francisco programme for solo founders (as researched — verify current eligibility and application requirements before submission)',
      claim: 'third_party_research',
      source: `https://solofounders.com/program (${RESEARCH_DATE})`,
    },
    applicationDeadline: null,
    deadlineClaim: 'pending_confirmation',
    requiredDocuments: [
      'Founder statement',
      'One-page company profile',
      'Product description',
      'Traction summary',
    ],
    nextAction:
      'Founder verifies the current eligibility and application requirements on the programme site, then prepares the application from the generated draft.',
    notes:
      'Real founder opportunity. Terms are RESEARCHED ONLY: nothing here is verified by the founder, no application exists, and nothing has been submitted.',
    verifiedByFounder: false,
    submissionClaimed: false,
  },
  {
    id: 'fund-the-bridge',
    organisation: 'The Bridge',
    url: 'https://www.join-thebridge.com/',
    opportunityType: 'residency_programme',
    geography: 'San Francisco, United States — residency',
    fundingAmount: null,
    equityTerms: null,
    eligibility: {
      value:
        'A San Francisco residency aimed at very early non-US founders (as researched — verify current eligibility and application requirements before submission)',
      claim: 'third_party_research',
      source: `https://www.join-thebridge.com/ (${RESEARCH_DATE})`,
    },
    applicationDeadline: null,
    deadlineClaim: 'pending_confirmation',
    requiredDocuments: ['Founder statement', 'One-page company profile', 'Product description'],
    nextAction:
      'Founder verifies the current eligibility and application requirements on the programme site, then prepares the application from the generated draft.',
    notes:
      'Real founder opportunity, researched as an Entrepreneurs First-backed residency. The research states NO funding amount and NO equity terms, so both fields are left NULL rather than invented.',
    verifiedByFounder: false,
    submissionClaimed: false,
  },
  {
    id: 'fund-ignyte-difc',
    organisation: 'Ignyte by DIFC',
    url: 'https://www.ignyte.ae/',
    opportunityType: 'ecosystem_membership',
    geography: 'Dubai International Financial Centre, United Arab Emirates',
    fundingAmount: null,
    equityTerms: null,
    eligibility: {
      value:
        'A DIFC-backed startup ecosystem connecting startups with investors, mentors, corporate opportunities and other ecosystem resources; the site currently describes a free community tier as well as paid membership options (as researched — verify current application/membership requirements before submitting)',
      claim: 'third_party_research',
      source: `https://www.ignyte.ae/ (${RESEARCH_DATE})`,
    },
    applicationDeadline: null,
    deadlineClaim: 'pending_confirmation',
    requiredDocuments: ['One-page company profile', 'Product description', 'Founder statement'],
    nextAction:
      'Founder verifies the current membership/application requirements on the site, then prepares the membership application from the generated draft.',
    notes:
      'Real founder opportunity carried as an ecosystem/membership route. No membership has been applied for and no funding terms are stated in the research, so none are shown.',
    verifiedByFounder: false,
    submissionClaimed: false,
  },
] as const;

/* ── §31 — the exact application pipeline ────────────────────────────────── */

export const FUNDING_APPLICATION_STAGES = [
  'discovered',
  'qualified',
  'preparing',
  'ready_for_review',
  'founder_approval',
  'submitted',
  'follow_up',
  'interview',
  'decision',
] as const;

export type FundingApplicationStage = (typeof FUNDING_APPLICATION_STAGES)[number];

export const FUNDING_STAGE_LABELS: Record<FundingApplicationStage, string> = {
  discovered: 'Discovered',
  qualified: 'Qualified',
  preparing: 'Preparing',
  ready_for_review: 'Ready for review',
  founder_approval: 'Founder approval',
  submitted: 'Submitted (founder-recorded)',
  follow_up: 'Follow-up',
  interview: 'Interview',
  decision: 'Decision',
};

/** Stages that mean an application EXISTS externally. Never reachable by inference. */
export const POST_SUBMISSION_STAGES: readonly FundingApplicationStage[] = [
  'submitted',
  'follow_up',
  'interview',
  'decision',
];

/** Declared facts the UI, the validators and the command centre all read. */
export const FUNDING_SUBMISSION_IS_A_FOUNDER_ACTION = true;
export const FUNDING_GENERATION_IS_AUTOMATED = true;

export const FUNDING_PIPELINE_DISCLAIMER =
  'Mercenta does not submit applications to third parties. Generation may be automated; the founder verifies the current requirements, approves, and submits personally — this pipeline only records what the founder has actually done.';

/** The founder-supplied record that an application was really submitted. */
export interface FundingSubmission {
  /** The reference/confirmation the FOUNDER supplies. Never generated here. */
  reference: string;
  /** The date the founder states it was submitted. */
  submittedAt: string;
  recordedBy: string;
}

export interface FundingApproval {
  approvedBy: string;
  approvedAt: string;
}

export interface FundingPipelineEntry {
  opportunityId: string;
  stage: FundingApplicationStage;
  /** `null` until the founder actually records an approval. */
  approval: FundingApproval | null;
  /** `null` until the founder actually records a submission. */
  submission: FundingSubmission | null;
  /** Set when a draft has been generated in this session (no external effect). */
  draftGeneratedAt: string | null;
  /** The single clear next action for the founder at this stage. */
  nextAction: string;
}

export interface FundingTransition {
  opportunityId: string;
  from: FundingApplicationStage;
  to: FundingApplicationStage;
  actor: string;
  at: string;
  reason: string;
}

/* ── §31 — the founder's next action at every stage ──────────────────────── */

export const FUNDING_STAGE_NEXT_ACTION: Record<FundingApplicationStage, string> = {
  discovered: 'Qualify it: verify the current eligibility on the programme’s own site.',
  qualified: 'Generate the application draft and assemble the required documents.',
  preparing: 'Finish the required documents, then mark it ready for review.',
  ready_for_review: 'Read the draft yourself; record your approval only if it is right.',
  founder_approval:
    'Submit it yourself through the programme’s own channel, then record the submission reference here.',
  submitted: 'Wait for their response and schedule the follow-up.',
  follow_up: 'Send the follow-up; move it to interview when they respond.',
  interview: 'Prepare with Founder Investor Centre practice mode; record the decision when it lands.',
  decision: 'Record the outcome and the reasoning here.',
};

export function nextActionForStage(stage: FundingApplicationStage): string {
  return FUNDING_STAGE_NEXT_ACTION[stage];
}

const STAGE_INDEX: Record<FundingApplicationStage, number> = Object.fromEntries(
  FUNDING_APPLICATION_STAGES.map((s, i) => [s, i])
) as Record<FundingApplicationStage, number>;

export function isFundingStage(value: string): value is FundingApplicationStage {
  return (FUNDING_APPLICATION_STAGES as readonly string[]).includes(value);
}

export function getFounderFundingOpportunity(
  id: string
): FounderFundingOpportunity | undefined {
  return FOUNDER_FUNDING_OPPORTUNITIES.find((o) => o.id === id);
}

/* ── §31 — pipeline state (in-memory; founder-only, no external effect) ──── */

let entries: FundingPipelineEntry[] = [];
let transitions: FundingTransition[] = [];

export function ensureFundingPipeline(): void {
  if (entries.length > 0) return;
  entries = FOUNDER_FUNDING_OPPORTUNITIES.map((o) => ({
    opportunityId: o.id,
    stage: 'discovered' as FundingApplicationStage,
    approval: null,
    submission: null,
    draftGeneratedAt: null,
    nextAction: nextActionForStage('discovered'),
  }));
}

export function getFundingPipeline(): FundingPipelineEntry[] {
  ensureFundingPipeline();
  return entries.map((e) => ({ ...e }));
}

export function getFundingPipelineEntry(
  opportunityId: string
): FundingPipelineEntry | undefined {
  ensureFundingPipeline();
  const entry = entries.find((e) => e.opportunityId === opportunityId);
  return entry ? { ...entry } : undefined;
}

export function fundingPipelineAudit(): FundingTransition[] {
  return [...transitions];
}

export function resetFundingPipeline(): void {
  entries = [];
  transitions = [];
  ensureFundingPipeline();
}

function recordTransition(
  entry: FundingPipelineEntry,
  to: FundingApplicationStage,
  actor: string,
  at: string,
  reason: string
): void {
  transitions.push({
    opportunityId: entry.opportunityId,
    from: entry.stage,
    to,
    actor,
    at,
    reason,
  });
  entry.stage = to;
  entry.nextAction = nextActionForStage(to);
}

/**
 * §31 — move a funding opportunity along the pipeline. Fail-closed on an unknown
 * opportunity or stage, and the POST-SUBMISSION stages are unreachable without a
 * recorded founder approval AND the founder's own submission reference.
 */
export function advanceFundingStage(input: {
  opportunityId: string;
  to: FundingApplicationStage;
  actor: string;
  at?: string;
  reason?: string;
}): FundingMutationResult {
  ensureFundingPipeline();
  const entry = entries.find((e) => e.opportunityId === input.opportunityId);
  if (!entry || !getFounderFundingOpportunity(input.opportunityId)) {
    return { ok: false, error: `Unknown funding opportunity: ${input.opportunityId}` };
  }
  if (!isFundingStage(input.to)) {
    return { ok: false, error: `Unknown funding stage: ${String(input.to)}` };
  }
  if (entry.stage === input.to) {
    return { ok: false, error: `Already at ${FUNDING_STAGE_LABELS[input.to]}.` };
  }
  const to = input.to;
  const forwarding = STAGE_INDEX[to] > STAGE_INDEX[entry.stage];

  if (POST_SUBMISSION_STAGES.includes(to)) {
    if (!entry.approval) {
      return {
        ok: false,
        error: `${FUNDING_STAGE_LABELS[to]} requires a recorded FOUNDER APPROVAL first — Mercenta never records a submission that has not happened.`,
      };
    }
    if (!entry.submission) {
      return {
        ok: false,
        error: `${FUNDING_STAGE_LABELS[to]} requires your own submission reference first — record it with "record submission".`,
      };
    }
  }
  if (!forwarding && entry.submission) {
    return {
      ok: false,
      error:
        'An application that has already been submitted cannot be moved backwards — record the outcome instead.',
    };
  }

  const at = input.at ?? new Date().toISOString();
  recordTransition(
    entry,
    to,
    input.actor,
    at,
    input.reason ?? `Stage moved to ${FUNDING_STAGE_LABELS[to]}.`
  );
  return { ok: true, entry: { ...entry } };
}

export type FundingMutationResult =
  | { ok: true; entry: FundingPipelineEntry }
  | { ok: false; error: string };


/**
 * §31 — record the FOUNDER'S OWN approval. This is not a submission: it only
 * unlocks the ability to record one. An approval must name the founder.
 */
export function recordFounderApproval(input: {
  opportunityId: string;
  approvedBy: string;
  at?: string;
}): FundingMutationResult {
  ensureFundingPipeline();
  const entry = entries.find((e) => e.opportunityId === input.opportunityId);
  if (!entry || !getFounderFundingOpportunity(input.opportunityId)) {
    return { ok: false, error: `Unknown funding opportunity: ${input.opportunityId}` };
  }
  if (!input.approvedBy.trim()) {
    return { ok: false, error: 'An approval must name the founder who gave it.' };
  }
  if (entry.approval) {
    return { ok: false, error: 'An approval is already recorded for this opportunity.' };
  }
  const at = input.at ?? new Date().toISOString();
  entry.approval = { approvedBy: input.approvedBy.trim(), approvedAt: at };
  if (STAGE_INDEX[entry.stage] < STAGE_INDEX.founder_approval) {
    recordTransition(
      entry,
      'founder_approval',
      input.approvedBy.trim(),
      at,
      'Founder approval recorded (nothing is submitted by Mercenta).'
    );
  }
  return { ok: true, entry: { ...entry } };
}

/**
 * §31 — record a submission THE FOUNDER has already made themselves. Refuses
 * without an explicit confirmation, without a prior approval, or without a
 * reference: the pipeline records reality, it never invents it.
 */
export function recordFundingSubmission(input: {
  opportunityId: string;
  actor: string;
  reference: string;
  confirmed: boolean;
  at?: string;
}): FundingMutationResult {
  ensureFundingPipeline();
  const entry = entries.find((e) => e.opportunityId === input.opportunityId);
  if (!entry || !getFounderFundingOpportunity(input.opportunityId)) {
    return { ok: false, error: `Unknown funding opportunity: ${input.opportunityId}` };
  }
  if (!input.confirmed) {
    return {
      ok: false,
      error: 'Refused: recording a submission requires an explicit founder confirmation.',
    };
  }
  if (!entry.approval) {
    return { ok: false, error: 'Refused: record your approval before recording a submission.' };
  }
  if (entry.submission) {
    return { ok: false, error: 'A submission is already recorded for this opportunity.' };
  }
  if (input.reference.trim().length < 3) {
    return {
      ok: false,
      error:
        'Refused: a submission reference is required (the confirmation or reference the programme gave you).',
    };
  }
  const at = input.at ?? new Date().toISOString();
  entry.submission = {
    reference: input.reference.trim(),
    submittedAt: at,
    recordedBy: input.actor,
  };
  recordTransition(
    entry,
    'submitted',
    input.actor,
    at,
    'Founder recorded the submission they made themselves.'
  );
  return { ok: true, entry: { ...entry } };
}


/* ── §10/§31/§32 — deterministic application generation ──────────────────── */

export interface FundingApplicationDraft {
  opportunityId: string;
  organisation: string;
  url: string;
  subject: string;
  content: string;
  requiredDocuments: readonly string[];
  /** Always `deterministic_template`: no model call, identical on every replay. */
  basis: 'deterministic_template';
  /** Always true: generating a draft never submits anything. */
  submissionStatus: 'NOT SUBMITTED — draft for founder review';
  generatedAt: string;
  lintPassed: boolean;
  lintReasons: string[];
}

function describeClaim(claim: SourcedFundingClaim | null, label: string): string {
  if (!claim) {
    return `${label}: NOT STATED in the research — verify it on the programme site before relying on it.`;
  }
  return `${label}: ${claim.value} [${CLAIM_LABELS[claim.claim]} · source: ${claim.source}]`;
}

/**
 * §31 — generation is automated, submission is not. Fail-closed: an unknown
 * opportunity produces NO draft. The text is linted by the EXISTING outward
 * wording gate and the retail-channel programme claim rules; a failure is
 * reported (`lintPassed: false`) rather than quietly edited away.
 */
export function generateFundingApplication(
  opportunityId: string,
  opts: { generatedAt?: string } = {}
): FundingApplicationDraft | null {
  const opp = getFounderFundingOpportunity(opportunityId);
  if (!opp) return null;

  const founderStatement =
    FOUNDER_PITCHES.find((p) => p.id === 'sixty_seconds')?.body ?? '';

  const content = [
    `Application draft — ${opp.organisation}`,
    '',
    `Applicant: ${BRAND_LEGAL_NAME} (${BRAND_NAME})`,
    `Programme: ${opp.organisation} — ${FUNDING_OPPORTUNITY_TYPE_LABELS[opp.opportunityType]}`,
    `Programme URL: ${opp.url}`,
    `Geography: ${opp.geography}`,
    '',
    '## Terms as researched (NOT verified by the founder)',
    describeClaim(opp.fundingAmount, 'Funding amount'),
    describeClaim(opp.equityTerms, 'Equity / terms'),
    describeClaim(opp.eligibility, 'Eligibility'),
    `Application deadline: ${
      opp.applicationDeadline ??
      'NOT STATED in the research — verify the current deadline on the programme site'
    }`,
    '',
    '## Founder statement (from the canonical founder content)',
    founderStatement,
    '',
    '## Required documents for this application',
    ...opp.requiredDocuments.map((d) => `- ${d}`),
    '',
    '## Next action',
    opp.nextAction,
    '',
    '## Submission status',
    "NOT SUBMITTED. This draft has not been sent to the programme. Mercenta does not submit on the founder's behalf: the founder verifies the current requirements on the programme site, records their approval in this pipeline, and submits it personally.",
    `Enquiries for this application: partnerships@${BRAND_DOMAIN}`,
    '',
    FOUNDER_HONESTY_NOTICE,
  ].join('\n');

  const outward = lintOutwardWording(content);
  const programme = lintAmazonWording(content);
  const lintReasons = [
    ...outward.hits.map((h) => h.reason),
    ...programme.programmeHits.map((h) => h.reason),
  ];

  const generatedAt = opts.generatedAt ?? new Date().toISOString();
  const entry = entries.find((e) => e.opportunityId === opportunityId);
  if (entry) entry.draftGeneratedAt = generatedAt;

  return {
    opportunityId: opp.id,
    organisation: opp.organisation,
    url: opp.url,
    subject: `Mercenta — application to ${opp.organisation}`,
    content,
    requiredDocuments: opp.requiredDocuments,
    basis: 'deterministic_template',
    submissionStatus: 'NOT SUBMITTED — draft for founder review',
    generatedAt,
    lintPassed: outward.safe && programme.fullySafe,
    lintReasons,
  };
}

/* ── §27/§31 — the founder's funding queue at a glance ───────────────────── */

export interface FundingPipelineSummary {
  total: number;
  byStage: Record<FundingApplicationStage, number>;
  /** §31 — what needs the founder next. */
  awaitingFounderApproval: string[];
  approvedNotYetSubmitted: string[];
  recordedSubmissions: number;
}

export function fundingPipelineSummary(): FundingPipelineSummary {
  const pipeline = getFundingPipeline();
  const byStage = Object.fromEntries(
    FUNDING_APPLICATION_STAGES.map((s) => [s, 0])
  ) as Record<FundingApplicationStage, number>;
  for (const e of pipeline) byStage[e.stage] += 1;
  return {
    total: pipeline.length,
    byStage,
    awaitingFounderApproval: pipeline
      .filter((e) => !e.approval && e.stage === 'ready_for_review')
      .map((e) => e.opportunityId),
    approvedNotYetSubmitted: pipeline
      .filter((e) => Boolean(e.approval) && !e.submission)
      .map((e) => e.opportunityId),
    recordedSubmissions: pipeline.filter((e) => Boolean(e.submission)).length,
  };
}

