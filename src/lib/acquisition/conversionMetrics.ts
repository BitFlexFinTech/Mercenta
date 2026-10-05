/**
 * §ACQ-CONVERSION — acquisition conversion measurement (the ONE owner).
 *
 * WHY THIS EXISTS
 * ---------------
 * The prospective-brand / outbound system reported COUNTS (pipeline totals,
 * per-stage, follow-ups overdue) but derived NO conversion rates, so the
 * placement / list / copy diagnosis step was impossible: "we sent 40 and got 3
 * replies" cannot tell you whether the problem is the list or the message.
 *
 * WHAT IT IS — AND, MORE IMPORTANTLY, WHAT IT IS NOT
 * --------------------------------------------------
 * This module IS the ONE place the funnel is defined. It DERIVES every figure
 * from the canonical acquisition lifecycle that already exists — the stage a
 * prospect is in (`acquisitionStageOf` in `./acquisitionEngine`, whose single
 * input is the canonical records: the prospect store, the outreach records, the
 * responses and the onboarding). It adds NO new state, invents NO lead, score
 * or stage, and re-classifies NOTHING.
 *
 * Because each funnel step is defined as "at or beyond a CANONICAL stage", there
 * is no second definition that could contradict the canonical classifier
 * (`classifyInboundReply`): a prospect's stage already reflects that classifier's
 * outcome (an `interested` outreach status is set from `classification.wantsHuman`).
 * The registry row that requested this work names exactly that requirement — the
 * definitions must not contradict the canonical classifier — and the way it is
 * satisfied is by reading the canonical stage rather than re-deciding intent.
 *
 * THE CANONICAL FUNNEL (each step = "reached this stage or beyond")
 * ----------------------------------------------------------------
 *   CONTACTED   stage >= FOLLOW-UP    a canonical outreach was actually SENT
 *   REPLIED     stage >= RESPONSE     a canonical response record exists
 *   ENGAGED     stage >= MEETING      a meeting / negotiation / pilot is in progress
 *   CONVERTED   stage == ACTIVE BRAND a canonical onboarding COMPLETED
 *
 * Note CONTACTED deliberately excludes the `outreach` stage: `outreach` means a
 * recommendation EXISTS (a draft), not that anything was sent — counting a draft
 * as a contact would inflate every rate.
 *
 * Pure and deterministic: takes the canonical records, returns counts and rates.
 * The rate is `null` (never a misleading 0) when its denominator is 0.
 */
import {
  ACQUISITION_STAGES,
  type AcquisitionRecord,
  type AcquisitionStageId,
} from '@/lib/acquisition/acquisitionEngine';

/* ── The funnel definition (the ONE place it lives) ───────────────────────── */

export type FunnelStepId = 'contacted' | 'replied' | 'engaged' | 'converted';

export interface FunnelStepDefinition {
  id: FunnelStepId;
  label: string;
  /** What counts as having reached this step, in plain words. */
  description: string;
  /** The canonical stage at (or beyond) which a prospect counts as reached. */
  thresholdStage: AcquisitionStageId;
  /** When true, only the exact threshold stage counts (the terminal step). */
  exact: boolean;
}

export const ACQUISITION_FUNNEL_STEPS: readonly FunnelStepDefinition[] = [
  {
    id: 'contacted',
    label: 'Contacted',
    description: 'A canonical outreach was sent to this prospect.',
    thresholdStage: 'follow_up',
    exact: false,
  },
  {
    id: 'replied',
    label: 'Replied',
    description: 'A canonical response record exists for this prospect.',
    thresholdStage: 'response',
    exact: false,
  },
  {
    id: 'engaged',
    label: 'Engaged',
    description: 'A meeting, negotiation or pilot is in progress.',
    thresholdStage: 'meeting',
    exact: false,
  },
  {
    id: 'converted',
    label: 'Converted',
    description: 'A canonical onboarding completed — the prospect is now a tenant.',
    thresholdStage: 'active_brand',
    exact: true,
  },
];

/* ── Stage ordering (derived from the canonical stage machine) ────────────── */

const STAGE_ORDER = new Map<AcquisitionStageId, number>(
  ACQUISITION_STAGES.map((s) => [s.id, s.order]),
);

function orderOf(stage: AcquisitionStageId): number {
  const order = STAGE_ORDER.get(stage);
  if (order === undefined) throw new Error(`Unknown acquisition stage: ${stage}`);
  return order;
}

/** True when a record's stage has reached (or passed) the step's threshold. */
export function reachedStep(stage: AcquisitionStageId, step: FunnelStepDefinition): boolean {
  if (step.exact) return stage === step.thresholdStage;
  return orderOf(stage) >= orderOf(step.thresholdStage);
}

/* ── The result shapes ────────────────────────────────────────────────────── */

export interface FunnelCounts {
  contacted: number;
  replied: number;
  engaged: number;
  converted: number;
}

export interface ConversionRates {
  /** Replied / contacted. */
  replyRate: number | null;
  /** Engaged / contacted. */
  engagementRate: number | null;
  /** Converted / contacted. */
  conversionRate: number | null;
  /**
   * Engaged / replied — "of the prospects who replied, the share that moved to
   * engagement". This is the canonical "positive reply" indicator: it is derived
   * from the canonical stage the prospect reached, NOT from a second
   * classification of the reply text.
   */
  replyToEngagementRate: number | null;
}

export interface ConversionSegment {
  /** The group value (a category, a source or an owner). */
  key: string;
  counts: FunnelCounts;
  rates: ConversionRates;
}

export interface AcquisitionConversionMetrics {
  /** Total canonical prospects considered. */
  totalRecords: number;
  counts: FunnelCounts;
  rates: ConversionRates;
  byCategory: ConversionSegment[];
  bySource: ConversionSegment[];
  byOwner: ConversionSegment[];
}

/* ── Derivation ───────────────────────────────────────────────────────────── */

/** Funnel counts over a set of canonical records. */
export function funnelCounts(records: AcquisitionRecord[]): FunnelCounts {
  const counts: FunnelCounts = { contacted: 0, replied: 0, engaged: 0, converted: 0 };
  for (const record of records) {
    for (const step of ACQUISITION_FUNNEL_STEPS) {
      if (reachedStep(record.stage, step)) counts[step.id] += 1;
    }
  }
  return counts;
}

function rate(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}

/** Rates from counts. A rate with a zero denominator is `null`, never 0. */
export function conversionRates(counts: FunnelCounts): ConversionRates {
  return {
    replyRate: rate(counts.replied, counts.contacted),
    engagementRate: rate(counts.engaged, counts.contacted),
    conversionRate: rate(counts.converted, counts.contacted),
    replyToEngagementRate: rate(counts.engaged, counts.replied),
  };
}

function groupBy(
  records: AcquisitionRecord[],
  keyOf: (r: AcquisitionRecord) => string,
): ConversionSegment[] {
  const groups = new Map<string, AcquisitionRecord[]>();
  for (const record of records) {
    const key = keyOf(record) || '(unassigned)';
    const list = groups.get(key) ?? [];
    list.push(record);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .map(([key, rows]) => {
      const counts = funnelCounts(rows);
      return { key, counts, rates: conversionRates(counts) };
    })
    .sort((a, b) => b.counts.contacted - a.counts.contacted || a.key.localeCompare(b.key));
}

/** The full conversion model over the canonical records. */
export function computeConversionMetrics(records: AcquisitionRecord[]): AcquisitionConversionMetrics {
  const counts = funnelCounts(records);
  return {
    totalRecords: records.length,
    counts,
    rates: conversionRates(counts),
    byCategory: groupBy(records, (r) => r.category),
    bySource: groupBy(records, (r) => r.source),
    byOwner: groupBy(records, (r) => r.owner),
  };
}

/** A percentage label for a rate, or an honest em-dash when it is undefined. */
export function formatRate(value: number | null): string {
  return value === null ? '—' : `${Math.round(value * 100)}%`;
}

