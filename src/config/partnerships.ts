/**
 * §16/§41.13/M12 — PARTNERSHIPS / FUNDRAISING CENTRE DATA (Super Admin only).
 *
 * TWO HARD RULES this file exists to enforce:
 *   1. NO FABRICATED PARTNERSHIPS. Every target below is a PLANNED approach: each
 *      carries `relationshipExists: false`, and the trade-programme registry
 *      (`acquisitionStrategy.ts`) declares all routes `prospective_partnership`.
 *   2. NO FABRICATED INVESTOR COMMITMENTS. The fundraising plan is a PLAN —
 *      target, use of funds and milestones — with zero claimed commitments.
 */
import type { TradeProgrammeId } from '@/lib/intelligence/acquisitionStrategy';

/** Who the founder intends to approach, and through which route. */
export type PartnerTargetKind = 'trade_body' | 'brand' | 'service_partner' | 'investor';

export interface PartnerTarget {
  id: string;
  name: string;
  kind: PartnerTargetKind;
  /** Source market or scope this target covers. */
  market: string;
  /** The programme route it represents (prospective). */
  programme?: TradeProgrammeId;
  /** What Mercenta wants from this approach. */
  objective: string;
  /** Pipeline stage of the APPROACH (never of a relationship that does not exist). */
  stage: PartnerPipelineStage;
  /**
   * ALWAYS false in this build — no relationship with any listed body has been
   * agreed. The field exists so the UI cannot accidentally present a planned
   * approach as an existing partnership.
   */
  relationshipExists: false;
}

export const PARTNER_PIPELINE_STAGES = [
  'not_approached',
  'approached',
  'in_discussion',
  'agreed',
] as const;
export type PartnerPipelineStage = (typeof PARTNER_PIPELINE_STAGES)[number];

export const PARTNER_PIPELINE_LABELS: Record<PartnerPipelineStage, string> = {
  not_approached: 'Not approached',
  approached: 'Approached',
  in_discussion: 'In discussion',
  agreed: 'Agreed (none yet)',
};

/**
 * The founder's planned approach list. These are ROUTES, not relationships: each
 * body is a generic category target (department, embassy, chamber, export agency)
 * that the founder intends to approach per source market.
 */
export const FOUNDER_PARTNER_TARGETS: readonly PartnerTarget[] = [
  {
    id: 'target-dbt-uk',
    name: 'UK Department for Business and Trade (route)',
    kind: 'trade_body',
    market: 'United Kingdom',
    programme: 'dbt',
    objective: 'Market-entry introductions and access to inbound trade delegations.',
    stage: 'not_approached',
    relationshipExists: false,
  },
  {
    id: 'target-embassy-zw',
    name: 'British Embassy route — Zimbabwe',
    kind: 'trade_body',
    market: 'Zimbabwe',
    programme: 'british_embassy',
    objective: 'Warm introductions to export-ready Zimbabwean brands.',
    stage: 'not_approached',
    relationshipExists: false,
  },
  {
    id: 'target-embassy-ae',
    name: 'British Embassy route — UAE',
    kind: 'trade_body',
    market: 'United Arab Emirates',
    programme: 'british_embassy',
    objective: 'Introductions to Gulf brands seeking a UK route to market.',
    stage: 'not_approached',
    relationshipExists: false,
  },
  {
    id: 'target-chamber-uk',
    name: 'Chamber of commerce route — UK regional',
    kind: 'trade_body',
    market: 'United Kingdom',
    programme: 'chamber_of_commerce',
    objective: 'Member directories and referral relationships for Strategy A brands.',
    stage: 'not_approached',
    relationshipExists: false,
  },
  {
    id: 'target-export-za',
    name: 'National export agency route — South Africa',
    kind: 'trade_body',
    market: 'South Africa',
    programme: 'export_agency',
    objective: 'Brands already seeking an export route into the UK.',
    stage: 'not_approached',
    relationshipExists: false,
  },
  {
    id: 'target-bilateral-in',
    name: 'Bilateral business council route — India',
    kind: 'trade_body',
    market: 'India',
    programme: 'bilateral_business_council',
    objective: 'Curated brand introductions in the UK–India corridor.',
    stage: 'not_approached',
    relationshipExists: false,
  },
] as const;

/** Guard for any surface that renders a target: never imply an agreement. */
export function partnerTargetStatusLabel(t: PartnerTarget): string {
  if (t.relationshipExists) return 'Agreed relationship';
  return `${PARTNER_PIPELINE_LABELS[t.stage]} · prospective route (no partnership exists)`;
}

/* ─ Fundraising plan (a PLAN — no commitments claimed) ───────────────────── */

export interface FundraisingUseOfFunds {
  label: string;
  /** Share of the round (%). */
  pct: number;
  note: string;
}

export interface FundraisingMilestone {
  label: string;
  detail: string;
}

export interface FundraisingPlan {
  /** Target raise in GBP. */
  targetGbp: number;
  instrument: string;
  /** Explicitly zero until an investor actually commits. */
  committedGbp: 0;
  useOfFunds: readonly FundraisingUseOfFunds[];
  milestones: readonly FundraisingMilestone[];
  /** A declared fact for the UI and the validators. */
  commitmentsClaimed: false;
  note: string;
}

export const FUNDRAISING_PLAN: FundraisingPlan = {
  targetGbp: 250_000,
  instrument: 'Equity (SEIS/EIS to be confirmed with advisers — not yet verified)',
  committedGbp: 0,
  useOfFunds: [
    {
      label: 'Activating live provider accounts',
      pct: 30,
      note: 'Credentials + completion work (DHL, Palletline, retail-channel seam, Xero, Wise). Not a rebuild — the workflows already run end to end.',
    },
    {
      label: 'Brand acquisition',
      pct: 45,
      note: 'Outreach against the ranked speed-to-revenue pipeline, per source market.',
    },
    {
      label: 'Compliance & legal scale-up',
      pct: 20,
      note: 'Documentation, verification providers and contracting at volume.',
    },
    { label: 'Operating reserve', pct: 5, note: 'Runway buffer.' },
  ],
  milestones: [
    {
      label: 'First brands live against real provider accounts',
      detail: 'Simulation → live activation for the carriers, accounting and payout rails.',
    },
    {
      label: 'First purchase order through to a settled payout',
      detail:
        'Order → invoice → payment → reconciliation → human-approved payout → settlement.',
    },
    {
      label: 'Repeatable acquisition rate per source market',
      detail:
        'Measured with market-access tagging: discovered → contacted → qualified → onboarded → revenue.',
    },
  ],
  commitmentsClaimed: false,
  note: 'Plan only. No investment has been committed, agreed or received; the instrument has not been verified with advisers.',
};

/** Aggregate pipeline metrics the founder measures the approach by. */
export interface PartnershipMetrics {
  targetsTotal: number;
  approached: number;
  inDiscussion: number;
  agreed: number;
}

export function partnershipMetrics(
  targets: readonly PartnerTarget[] = FOUNDER_PARTNER_TARGETS
): PartnershipMetrics {
  return {
    targetsTotal: targets.length,
    approached: targets.filter((t) => t.stage === 'approached').length,
    inDiscussion: targets.filter((t) => t.stage === 'in_discussion').length,
    agreed: targets.filter((t) => t.stage === 'agreed').length,
  };
}