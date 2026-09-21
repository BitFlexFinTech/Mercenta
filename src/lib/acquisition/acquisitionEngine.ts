/**
 * §Founder OS — BRAND ACQUISITION / OUTREACH ENGINE (canonical pipeline model).
 *
 * The acquisition lifecycle is:
 *
 *   PROSPECT → RESEARCH → QUALIFICATION → OPPORTUNITY → OUTREACH → FOLLOW-UP
 *   → RESPONSE → MEETING/ENGAGEMENT → DUE DILIGENCE → ONBOARDING → ACTIVE BRAND
 *
 * This module DERIVES that lifecycle from the canonical records that already
 * exist (the Brand Intelligence prospect store, the outreach records, the
 * responses, the opportunities and the onboarding records). It is a projection,
 * not a second pipeline: nothing here invents a lead, a score or a stage, and
 * there is exactly ONE place that decides what stage a prospect is in.
 *
 * NON-NEGOTIABLE RULES
 * -------------------
 * - A PROSPECT IS NOT A BRAND. `acquisitionRecords()` returns prospects; a row
 *   only carries a `brandId` once a canonical onboarding for that prospect has
 *   COMPLETED (`isProspectActivatedBrand`). Nothing silently promotes a prospect
 *   into a tenant.
 * - TENANT ISOLATION. Acquisition is internal Mercenta IP. Every row is
 *   platform-scoped; brand sessions must never reach this module (the Control
 *   Centre is Super Admin only, guarded at render).
 * - DETERMINISTIC. Stage derivation is pure; ids are the canonical prospect ids;
 *   dates come from the records themselves plus the declared follow-up cadence.
 * - AMAZON WORDING. Acquisition copy must never claim a guaranteed PO or an
 *   Amazon relationship — the wording gate (`npm run validate:wording`) covers
 *   this surface like every other.
 */
import type { PaletteDomain } from '@/config/themes';
import type { BrandProspect, OutreachStatus } from '@/types';
import { ensureProspectStore, getProspects } from '@/data/prospectStore';
import {
  getCurrentOutreach,
  getOnboardingForProspect,
  getOpportunityForProspect,
  getOutreachForProspect,
  getResponsesForProspect,
} from '@/data/acquisitionStore';
import { normalizeBrandKey } from '@/lib/intelligence/prospectPipeline';
import { OUTREACH_FOLLOW_UP_DAYS, addDays, daysBetween, demoToday } from '@/lib/work/workStore';

export type AcquisitionStageId =
  | 'prospect'
  | 'research'
  | 'qualification'
  | 'opportunity'
  | 'outreach'
  | 'follow_up'
  | 'response'
  | 'meeting'
  | 'due_diligence'
  | 'onboarding'
  | 'active_brand';

export interface AcquisitionStageDefinition {
  id: AcquisitionStageId;
  label: string;
  description: string;
  /** Ascending progression order — used for sorting and for "next stage". */
  order: number;
  /** The EXISTING admin destination where this stage is acted on. */
  destination: string;
  domain: PaletteDomain;
}

export const ACQUISITION_STAGES: readonly AcquisitionStageDefinition[] = [
  { id: 'prospect', label: 'Prospect', description: 'Identified, not yet researched.', order: 1, destination: 'crm', domain: 'intelligence' },
  { id: 'research', label: 'Research', description: 'Canonical evidence being gathered.', order: 2, destination: 'brand_intelligence', domain: 'intelligence' },
  { id: 'qualification', label: 'Qualification', description: 'Scored against the ICP; a decision is owed.', order: 3, destination: 'brand_intelligence', domain: 'intelligence' },
  { id: 'opportunity', label: 'Opportunity', description: 'An opportunity record exists.', order: 4, destination: 'crm', domain: 'orders' },
  { id: 'outreach', label: 'Outreach', description: 'A recommendation exists (draft → approval → send).', order: 5, destination: 'crm', domain: 'communications' },
  { id: 'follow_up', label: 'Follow-up', description: 'Contacted with no reply inside the declared cadence.', order: 6, destination: 'crm', domain: 'communications' },
  { id: 'response', label: 'Response', description: 'The brand replied.', order: 7, destination: 'crm', domain: 'communications' },
  { id: 'meeting', label: 'Meeting / engagement', description: 'A meeting, negotiation or pilot is in progress.', order: 8, destination: 'crm', domain: 'communications' },
  { id: 'due_diligence', label: 'Due diligence', description: 'Qualified — terms and readiness being checked.', order: 9, destination: 'onboarding_pipeline', domain: 'compliance' },
  { id: 'onboarding', label: 'Onboarding', description: 'A canonical onboarding is in progress.', order: 10, destination: 'onboarding_pipeline', domain: 'compliance' },
  { id: 'active_brand', label: 'Active brand', description: 'Onboarding completed — now a tenant.', order: 11, destination: 'crm', domain: 'orders' },
] as const;

export const ACQUISITION_STAGE_BY_ID: Record<AcquisitionStageId, AcquisitionStageDefinition> = Object.fromEntries(
  ACQUISITION_STAGES.map((s) => [s.id, s])
) as Record<AcquisitionStageId, AcquisitionStageDefinition>;

export type FollowUpState = 'none' | 'scheduled' | 'due' | 'overdue';

export interface AcquisitionRecord {
  /** Canonical BI prospect id — identity survives BI → ICP → CRM → tenant. */
  prospectId: string;
  brand: string;
  category: string;
  website?: string;
  /** Deterministic dedup key (the canonical normalised brand key). */
  dedupeKey: string;
  stage: AcquisitionStageId;
  stageLabel: string;
  stageOrder: number;
  /** The next stage this record can legitimately reach. */
  nextStage: AcquisitionStageId | null;
  /** The existing destination the next action is performed in. */
  destination: string;
  domain: PaletteDomain;
  /** Canonical BI score/tier snapshot — INTERNAL, never exposed to a brand. */
  score: number;
  tier: BrandProspect['score']['tier'];
  disqualified: boolean;
  disqualificationReason?: string;
  owner: string;
  source: string;
  /** ISO date of the last canonical research update. */
  lastResearched: string;
  /** The declared follow-up date when the record is in an active outreach state. */
  followUpDue: string | null;
  followUpState: FollowUpState;
  outreachStatus: OutreachStatus;
  outreachId: string | null;
  outreachApproval: string | null;
  responseCount: number;
  opportunityId: string | null;
  opportunityStage: string | null;
  onboardingId: string | null;
  onboardingStatus: string | null;
  /** Set ONLY once a canonical onboarding completed — a prospect is not a brand. */
  brandId: string | null;
  nextAction: { label: string; detail: string };
}

/* ── Stage derivation (the ONE place the lifecycle is decided) ─────────────── */

const ACTIVE_OUTREACH_STATUSES: OutreachStatus[] = [
  'contacted',
  'opened',
  'replied',
  'interested',
  'meeting_scheduled',
  'negotiating',
  'pilot',
];

const ENGAGED_OUTREACH_STATUSES: OutreachStatus[] = ['meeting_scheduled', 'negotiating', 'pilot'];

/**
 * Derive the acquisition stage for one prospect from canonical records only.
 * Evaluated from the most advanced state backwards, so the first match wins and
 * a record can never be reported in two stages at once.
 */
export function acquisitionStageOf(prospect: BrandProspect): AcquisitionStageId {
  const onboarding = getOnboardingForProspect(prospect.id);
  if (onboarding && (onboarding.status === 'completed' || onboarding.completedAt)) return 'active_brand';
  if (onboarding) return 'onboarding';

  const opportunity = getOpportunityForProspect(prospect.id);
  if (opportunity && (opportunity.stage === 'qualified' || opportunity.stage === 'won')) return 'due_diligence';

  if (ENGAGED_OUTREACH_STATUSES.includes(prospect.outreachStatus)) return 'meeting';

  if (getResponsesForProspect(prospect.id).length > 0) return 'response';

  const outreach = getOutreachForProspect(prospect.id);
  const sent = outreach.some((o) => o.status === 'sent' || o.status === 'opened' || o.status === 'replied');
  if (sent) return 'follow_up';

  if (outreach.length > 0) return 'outreach';

  if (opportunity) return 'opportunity';

  if (prospect.score.tier !== 'unscored' || prospect.disqualified) return 'qualification';

  if (prospect.outreachStatus === 'researching' || prospect.lastResearched) return 'research';

  return 'prospect';
}

/** The next legitimate stage — null at the end of the lifecycle. */
export function nextAcquisitionStage(stage: AcquisitionStageId): AcquisitionStageId | null {
  const definition = ACQUISITION_STAGE_BY_ID[stage];
  const next = ACQUISITION_STAGES.find((s) => s.order === definition.order + 1);
  return next?.id ?? null;
}

function nextActionFor(prospect: BrandProspect, stage: AcquisitionStageId): { label: string; detail: string } {
  switch (stage) {
    case 'prospect':
      return { label: 'Research the brand', detail: 'Gather canonical evidence (products, channel presence, restrictions) before scoring.' };
    case 'research':
      return { label: 'Complete research', detail: 'Finish the evidence set so the ICP score can be computed.' };
    case 'qualification':
      return prospect.disqualified
        ? { label: 'Review disqualification', detail: prospect.disqualificationReason ?? 'Disqualified — requalify only with new evidence.' }
        : { label: 'Decide qualification', detail: 'Accept the ICP score or disqualify with a reason.' };
    case 'opportunity':
      return { label: 'Prepare outreach', detail: 'Prepare a recommendation for founder review — nothing is sent without approval.' };
    case 'outreach':
      return { label: 'Approve or modify the outreach', detail: 'A recommendation exists and is awaiting a human decision.' };
    case 'follow_up':
      return { label: `Follow up ${prospect.brand}`, detail: `No reply yet — the declared cadence is ${OUTREACH_FOLLOW_UP_DAYS} days.` };
    case 'response':
      return { label: 'Review the response', detail: 'A reply was received — route it and set the next step.' };
    case 'meeting':
      return { label: 'Progress the engagement', detail: 'Meeting, negotiation or pilot in progress — record the outcome.' };
    case 'due_diligence':
      return { label: 'Start onboarding', detail: 'Qualified — begin the canonical onboarding (eligibility is gated).' };
    case 'onboarding':
      return { label: 'Complete the onboarding steps', detail: 'Each incomplete step is already derived as work with an SLA deadline.' };
    case 'active_brand':
      return { label: 'Open the brand workspace', detail: 'Onboarding completed — this prospect is now a tenant.' };
  }
}

function followUpStateFor(prospect: BrandProspect, stage: AcquisitionStageId): FollowUpState {
  if (!ACTIVE_OUTREACH_STATUSES.includes(prospect.outreachStatus)) return 'none';
  if (stage !== 'follow_up') return 'scheduled';
  const due = addDays(prospect.lastResearched, OUTREACH_FOLLOW_UP_DAYS);
  const left = daysBetween(demoToday(), due);
  if (left < 0) return 'overdue';
  if (left === 0) return 'due';
  return 'scheduled';
}

/* ── The canonical record set ──────────────────────────────────────────────── */

function toRecord(prospect: BrandProspect): AcquisitionRecord {
  const stage = acquisitionStageOf(prospect);
  const definition = ACQUISITION_STAGE_BY_ID[stage];
  const current = getCurrentOutreach(prospect.id);
  const opportunity = getOpportunityForProspect(prospect.id);
  const onboarding = getOnboardingForProspect(prospect.id);
  const followUpState = followUpStateFor(prospect, stage);
  const followUpDue = ACTIVE_OUTREACH_STATUSES.includes(prospect.outreachStatus)
    ? addDays(prospect.lastResearched, OUTREACH_FOLLOW_UP_DAYS)
    : null;
  return {
    prospectId: prospect.id,
    brand: prospect.brand,
    category: prospect.category,
    website: prospect.website,
    dedupeKey: normalizeBrandKey(prospect.brand),
    stage,
    stageLabel: definition.label,
    stageOrder: definition.order,
    nextStage: nextAcquisitionStage(stage),
    destination: definition.destination,
    domain: definition.domain,
    score: prospect.score.total,
    tier: prospect.score.tier,
    disqualified: prospect.disqualified,
    disqualificationReason: prospect.disqualificationReason,
    owner: prospect.owner ? `staff:${prospect.owner}` : 'staff:mercenta-ops',
    source: prospect.source,
    lastResearched: prospect.lastResearched,
    followUpDue,
    followUpState,
    outreachStatus: prospect.outreachStatus,
    outreachId: current?.id ?? null,
    outreachApproval: current?.status ?? null,
    responseCount: getResponsesForProspect(prospect.id).length,
    opportunityId: opportunity?.id ?? null,
    opportunityStage: opportunity?.stage ?? null,
    onboardingId: onboarding?.id ?? null,
    onboardingStatus: onboarding?.status ?? null,
    // A prospect becomes a brand ONLY when the canonical onboarding completed.
    brandId:
      onboarding && (onboarding.status === 'completed' || onboarding.completedAt) ? onboarding.brandId : null,
    nextAction: nextActionFor(prospect, stage),
  };
}

/**
 * Every prospect with its derived lifecycle position. Deterministic ordering:
 * most advanced stage first, then by canonical prospect id.
 */
export function acquisitionRecords(): AcquisitionRecord[] {
  ensureProspectStore();
  return getProspects()
    .map(toRecord)
    .sort((a, b) => b.stageOrder - a.stageOrder || a.prospectId.localeCompare(b.prospectId));
}

export function acquisitionStageCounts(): Record<AcquisitionStageId, number> {
  const counts = Object.fromEntries(ACQUISITION_STAGES.map((s) => [s.id, 0])) as Record<AcquisitionStageId, number>;
  for (const row of acquisitionRecords()) counts[row.stage] += 1;
  return counts;
}

export interface AcquisitionPipelineModel {
  records: AcquisitionRecord[];
  stages: {
    id: AcquisitionStageId;
    label: string;
    count: number;
    share: number;
    domain: PaletteDomain;
    destination: string;
    attention: boolean;
  }[];
  total: number;
  active: number;
  disqualified: number;
  activatedBrands: number;
  awaitingApproval: number;
  followUpsDue: number;
  followUpsOverdue: number;
  unassigned: number;
  duplicates: { dedupeKey: string; prospectIds: string[]; brands: string[] }[];
}

export function acquisitionPipeline(): AcquisitionPipelineModel {
  const records = acquisitionRecords();
  const counts = acquisitionStageCounts();
  const total = records.length;
  return {
    records,
    stages: ACQUISITION_STAGES.map((s) => ({
      id: s.id,
      label: s.label,
      count: counts[s.id],
      share: total > 0 ? counts[s.id] / total : 0,
      domain: s.domain,
      destination: s.destination,
      attention: s.id === 'qualification' || s.id === 'follow_up' || s.id === 'due_diligence',
    })),
    total,
    active: records.filter((r) => r.stage !== 'active_brand' && !r.disqualified).length,
    disqualified: records.filter((r) => r.disqualified).length,
    activatedBrands: records.filter((r) => r.brandId !== null).length,
    awaitingApproval: records.filter((r) => r.outreachApproval === 'pending_approval').length,
    followUpsDue: records.filter((r) => r.followUpState === 'due').length,
    followUpsOverdue: records.filter((r) => r.followUpState === 'overdue').length,
    unassigned: records.filter((r) => r.owner === 'staff:mercenta-ops').length,
    duplicates: findDuplicateProspects(),
  };
}

/** Records needing a human decision now: due/overdue follow-ups, unqualified, DD-ready. */
export function acquisitionAttention(): AcquisitionRecord[] {
  return acquisitionRecords().filter(
    (r) =>
      r.followUpState === 'due' ||
      r.followUpState === 'overdue' ||
      r.stage === 'qualification' ||
      r.stage === 'due_diligence' ||
      r.outreachApproval === 'pending_approval'
  );
}


/* ── Deduplication ─────────────────────────────────────────────────────────── */

/**
 * Prospects that share a canonical brand key. The canonical identity is
 * `normalizeBrandKey` — the SAME function the BI → ICP handoff uses, so a
 * duplicate can never be detected by one rule and missed by another.
 */
export function findDuplicateProspects(): { dedupeKey: string; prospectIds: string[]; brands: string[] }[] {
  const byKey = new Map<string, AcquisitionRecord[]>();
  for (const row of acquisitionRecords()) {
    const rows = byKey.get(row.dedupeKey) ?? [];
    rows.push(row);
    byKey.set(row.dedupeKey, rows);
  }
  return [...byKey.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([dedupeKey, rows]) => ({
      dedupeKey,
      prospectIds: rows.map((r) => r.prospectId),
      brands: rows.map((r) => r.brand),
    }))
    .sort((a, b) => a.dedupeKey.localeCompare(b.dedupeKey));
}

/* ── Conversion guard (a prospect is NOT a brand) ──────────────────────────── */

export interface ProspectConversionState {
  prospectId: string;
  /** True ONLY when a canonical onboarding for this prospect COMPLETED. */
  isBrand: boolean;
  brandId: string | null;
  onboardingId: string | null;
  onboardingStatus: string | null;
  /** Why the prospect has NOT become a brand yet (never a silent promotion). */
  blockingReason: string | null;
}

export function prospectConversionState(prospectId: string): ProspectConversionState {
  ensureProspectStore();
  const prospect = getProspects().find((p) => p.id === prospectId);
  if (!prospect) {
    return {
      prospectId,
      isBrand: false,
      brandId: null,
      onboardingId: null,
      onboardingStatus: null,
      blockingReason: 'No canonical prospect exists for that id.',
    };
  }
  const onboarding = getOnboardingForProspect(prospectId);
  const completed = Boolean(onboarding && (onboarding.status === 'completed' || onboarding.completedAt));
  return {
    prospectId,
    isBrand: completed,
    brandId: completed ? onboarding!.brandId : null,
    onboardingId: onboarding?.id ?? null,
    onboardingStatus: onboarding?.status ?? null,
    blockingReason: completed
      ? null
      : onboarding
        ? `Onboarding ${onboarding.status} — the prospect is not a tenant until every step completes.`
        : 'No onboarding record exists — a prospect is never silently converted into a brand.',
  };
}

/** True ONLY for a prospect whose canonical onboarding completed. */
export function isProspectActivatedBrand(prospectId: string): boolean {
  return prospectConversionState(prospectId).isBrand;
}

