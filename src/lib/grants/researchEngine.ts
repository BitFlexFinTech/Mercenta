/**
 * §Batch-9 — Grants & Investors research engine + application drafting.
 *
 * §31/M13c honesty rule (root-cause fix): the stored draft state is INTERNAL
 * only. `approveGrantDraft` / `approveInvestorDraft` record an internal approval
 * WITH the approver's identity and can never represent an external submission —
 * the legacy `submitted` / `sent` states were removed for that reason. An
 * external event is representable ONLY through `recordGrantSubmission` /
 * `recordInvestorSubmission`, which refuse without an explicit founder
 * confirmation, a prior internal approval and the founder's own reference.
 */
import type { GrantOpportunity, InvestorOpportunity, GrantApplicationDraft, InvestorOutreachDraft, GrantsInvestorsReport } from '@/types';
import { createGrantsDataSource } from './dataSources';

export interface GrantsResearchOptions {
  category?: string;
  minFitScore?: number;
  activeOnly?: boolean;
}

export async function runGrantsResearch(opts: GrantsResearchOptions = {}): Promise<GrantsInvestorsReport> {
  const source = createGrantsDataSource();
  const [allGrants, allInvestors] = await Promise.all([source.fetchGrants(), source.fetchInvestors()]);
  let grants = allGrants;
  if (opts.category) grants = grants.filter((g) => g.category === opts.category);
  if (opts.minFitScore) grants = grants.filter((g) => g.fitScore >= opts.minFitScore!);
  if (opts.activeOnly) grants = grants.filter((g) => g.status !== 'closed');
  grants.sort((a, b) => b.fitScore - a.fitScore);
  let investors = allInvestors;
  if (opts.minFitScore) investors = investors.filter((i) => i.fitScore >= opts.minFitScore!);
  investors.sort((a, b) => b.fitScore - a.fitScore);
  return { generatedAt: new Date().toISOString(), grants, investors, grantsDrafts: [], investorDrafts: [], source: source.mode, sourceLabel: source.mode === 'mock' ? 'Grants & Investors (Mock)' : 'Live APIs' };
}

const draftsStore: GrantApplicationDraft[] = [];
const investorDraftsStore: InvestorOutreachDraft[] = [];

export function draftGrantApplication(grant: GrantOpportunity): GrantApplicationDraft {
  const content = [
    '# Grant Application: ' + grant.title,
    '',
    '## Applicant: Mercenta Partners Ltd',
    '## Grant Provider: ' + grant.provider,
    '',
    '### Executive Summary',
    'Mercenta Partners Ltd is a UK-based wholesale distribution platform connecting international brands to the UK\'s national retail network. We are seeking ' + grant.amountRange + ' in funding to scale our operations, enhance our technology platform, and expand our supplier network across Africa.',
    '',
    '### Problem Statement',
    'International brands face significant barriers to entering the UK retail market: complex compliance requirements, logistics coordination, and the need for a trusted UK-based partner. Mercenta solves this by providing end-to-end distribution services.',
    '',
    '### Solution',
    'Mercenta\'s platform handles everything from factory intake to retail-channel delivery. We manage compliance documentation, purchase order acknowledgment, ASN filing, and deductions management.',
    '',
    '### Why Mercenta Fits This Grant',
    grant.fitReason,
    '',
    '### Eligibility Confirmation',
    grant.eligibility,
    '',
    '### Budget Breakdown',
    '- Platform development and technology enhancement: 40%',
    '- Supplier network expansion (Africa): 30%',
    '- UK distribution hub capacity: 20%',
    '- Compliance and certification: 10%',
    '',
    '### Timeline',
    '- Month 1-3: Platform enhancement and supplier onboarding',
    '- Month 4-6: Scale operations and expand product categories',
    '- Month 7-9: Launch expanded supplier network',
    '- Month 10-12: Full operational scale',
    '',
    '### Contact',
    'Mercenta Partners Ltd',
    'tadii@mercenta.co.uk',
    '---',
    'This is an AI-generated draft staged for review. It has NOT been submitted.',
  ].join('\n');
  const draft: GrantApplicationDraft = { grantId: grant.id, grantTitle: grant.title, content, status: 'draft', createdAt: new Date().toISOString() };
  draftsStore.push(draft);
  return draft;
}

export function draftInvestorOutreach(investor: InvestorOpportunity): InvestorOutreachDraft {
  const content = [
    'Subject: Introduction — Mercenta Partners: Connecting African Brands to UK Retail',
    '',
    'Dear ' + investor.name + ' team,',
    '',
    'I\'m reaching out to introduce Mercenta Partners, a UK-based wholesale distribution platform connecting international brands to the UK\'s national retail network.',
    '',
    'We\'ve built an end-to-end platform handling compliance, logistics, purchase order management, and deductions. We work with ' + investor.sectors.slice(0, 2).join(' and ') + ' brands across 10 approved product categories.',
    '',
    'Why we\'re a fit for ' + investor.name + ':',
    investor.fitReason,
    '',
    'We\'re currently raising a ' + investor.stage.replace(/_/g, ' ') + ' round and looking for partners who understand the intersection of international trade, supply chain technology, and retail distribution.',
    '',
    'Would you be open to a brief conversation about how Mercenta is transforming trade between Africa and the UK?',
    '',
    'Best regards,',
    'Tadii',
    'Mercenta Partners Ltd',
    'tadii@mercenta.co.uk',
    '---',
    'This is an AI-generated outreach draft staged for review. It has NOT been sent.',
  ].join('\n');
  const draft: InvestorOutreachDraft = { investorId: investor.id, investorName: investor.name, content, status: 'draft', createdAt: new Date().toISOString() };
  investorDraftsStore.push(draft);
  return draft;
}

/**
 * §31/M13c — INTERNAL approval of a staged draft.
 *
 * Root-cause fix for the legacy false-submission state: this no longer writes a
 * `submitted` status. It records an INTERNAL approval with the approver's
 * identity, and nothing else. Internal approval is NOT an external event, and no
 * surface can read it as one because the state is named for what it is.
 *
 * Fail-closed: an approval must name its approver, and only a `draft` can be
 * approved.
 */
export function approveGrantDraft(grantId: string, approvedBy: string): GrantApplicationDraft | null {
  if (!approvedBy.trim()) return null;
  const draft = draftsStore.find((d) => d.grantId === grantId && d.status === 'draft');
  if (!draft) return null;
  draft.status = 'approved_internally';
  draft.approvedAt = new Date().toISOString();
  draft.approvedBy = approvedBy.trim();
  return draft;
}

/** §31/M13c — same rule for investor outreach: internal approval only. */
export function approveInvestorDraft(investorId: string, approvedBy: string): InvestorOutreachDraft | null {
  if (!approvedBy.trim()) return null;
  const draft = investorDraftsStore.find((d) => d.investorId === investorId && d.status === 'draft');
  if (!draft) return null;
  draft.status = 'approved_internally';
  draft.approvedAt = new Date().toISOString();
  draft.approvedBy = approvedBy.trim();
  return draft;
}

/* ── §31/M13c — founder-recorded EXTERNAL submission (never automatic) ───── */

export type DraftSubmissionResult<T> = { ok: true; draft: T } | { ok: false; error: string };

/**
 * Records a submission THE FOUNDER has already made themselves, using the
 * `fundingPipeline.recordFundingSubmission` gate as the precedent. Refused
 * without an explicit confirmation, without a prior internal approval, without a
 * reference, or on a duplicate. Mercenta never submits on the founder's behalf,
 * so this is the ONLY path that can represent an external submission.
 */
export function recordGrantSubmission(input: {
  grantId: string;
  actor: string;
  reference: string;
  confirmed: boolean;
  at?: string;
}): DraftSubmissionResult<GrantApplicationDraft> {
  const draft = draftsStore.find((d) => d.grantId === input.grantId);
  if (!draft) return { ok: false, error: `Unknown grant draft: ${input.grantId}` };
  if (!input.confirmed) {
    return { ok: false, error: 'Refused: recording a submission requires an explicit founder confirmation.' };
  }
  if (draft.status !== 'approved_internally') {
    return { ok: false, error: 'Refused: record the internal approval before recording a submission.' };
  }
  if (draft.submission) {
    return { ok: false, error: 'A submission is already recorded for this grant.' };
  }
  if (input.reference.trim().length < 3) {
    return {
      ok: false,
      error: 'Refused: a submission reference is required (the confirmation the provider gave you).',
    };
  }
  draft.submission = {
    reference: input.reference.trim(),
    submittedAt: input.at ?? new Date().toISOString(),
    recordedBy: input.actor.trim() || 'unattributed',
  };
  return { ok: true, draft };
}

/** §31/M13c — the investor-outreach equivalent of `recordGrantSubmission`. */
export function recordInvestorSubmission(input: {
  investorId: string;
  actor: string;
  reference: string;
  confirmed: boolean;
  at?: string;
}): DraftSubmissionResult<InvestorOutreachDraft> {
  const draft = investorDraftsStore.find((d) => d.investorId === input.investorId);
  if (!draft) return { ok: false, error: `Unknown investor draft: ${input.investorId}` };
  if (!input.confirmed) {
    return { ok: false, error: 'Refused: recording a send requires an explicit founder confirmation.' };
  }
  if (draft.status !== 'approved_internally') {
    return { ok: false, error: 'Refused: record the internal approval before recording a send.' };
  }
  if (draft.submission) {
    return { ok: false, error: 'A send is already recorded for this investor.' };
  }
  if (input.reference.trim().length < 3) {
    return {
      ok: false,
      error: 'Refused: a reference is required (the confirmation you received).',
    };
  }
  draft.submission = {
    reference: input.reference.trim(),
    sentAt: input.at ?? new Date().toISOString(),
    recordedBy: input.actor.trim() || 'unattributed',
  };
  return { ok: true, draft };
}

/** Declared facts the UI and the validators both read. */
export const DRAFT_SUBMISSION_IS_A_FOUNDER_ACTION = true;

export const DRAFT_INTERNAL_APPROVAL_DISCLAIMER =
  'Approving a draft here records an INTERNAL approval only. Mercenta submits and sends nothing on the founder’s behalf: the founder submits or sends it personally, then records the reference.';

export function getGrantsDrafts(): GrantApplicationDraft[] { return [...draftsStore]; }
export function getInvestorDrafts(): InvestorOutreachDraft[] { return [...investorDraftsStore]; }
