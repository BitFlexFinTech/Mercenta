/** §Batch-9 — Grants & Investors research engine + application drafting. */
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

export function approveGrantDraft(grantId: string, submittedBy: string): GrantApplicationDraft | null {
  const draft = draftsStore.find((d) => d.grantId === grantId && d.status === 'draft');
  if (!draft) return null;
  draft.status = 'submitted';
  draft.submittedAt = new Date().toISOString();
  draft.submittedBy = submittedBy;
  return draft;
}

export function approveInvestorDraft(investorId: string, sentBy: string): InvestorOutreachDraft | null {
  const draft = investorDraftsStore.find((d) => d.investorId === investorId && d.status === 'draft');
  if (!draft) return null;
  draft.status = 'sent';
  draft.sentAt = new Date().toISOString();
  draft.sentBy = sentBy;
  return draft;
}

export function getGrantsDrafts(): GrantApplicationDraft[] { return [...draftsStore]; }
export function getInvestorDrafts(): InvestorOutreachDraft[] { return [...investorDraftsStore]; }
