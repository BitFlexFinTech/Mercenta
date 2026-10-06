/**
 * §PHASE 7 — THE FINANCIER LIFECYCLE RESOLVER — the pure rules over the ONE owner.
 *
 * The owner (`src/config/financierLifecycle.ts`) declares the lifecycle; this
 * module applies it. It is PURE and DETERMINISTIC: no clock, no randomness, no
 * network, no AI, no filesystem.
 *
 * THE RULES IT ENFORCES:
 *   · a provider advances ONE stage at a time along the canonical order;
 *   · ACTIVE PARTNER is reachable ONLY from PILOT — a provider is never marked
 *     ACTIVE merely because it was researched (an explicit refusal code states
 *     this even though the transition map already forbids the jump);
 *   · from any active stage a provider may be REJECTED or PARKED;
 *   · a PARKED provider re-enters at RESEARCHED;
 *   · an UNKNOWN stage is REFUSED and an undeclared transition is REFUSED — both
 *     fail closed, so nothing is ever guessed.
 */
import {
  DEMO_FINANCIER_CANDIDATES,
  FINANCIER_ACTIVE_REQUIRES_PILOT,
  FINANCIER_LIFECYCLE_BASIS,
  FINANCIER_LIFECYCLE_DISCLAIMER,
  FINANCIER_LIFECYCLE_IS_FORWARD_ONLY,
  FINANCIER_LIFECYCLE_TRANSITIONS,
  FINANCIER_OFFRAMP_STAGES,
  FINANCIER_OFFRAMPS_FROM_ANY_ACTIVE_STAGE,
  FINANCIER_STAGE_LABELS,
  FINANCIER_STAGE_ORDER,
  ONE_FINANCIER_LIFECYCLE_OWNER,
  type FinancierStageId,
} from '@/config/financierLifecycle';

export type FinancierTransitionRefusal =
  | 'FINANCIER_STAGE_UNKNOWN'
  | 'FINANCIER_TRANSITION_ILLEGAL'
  | 'FINANCIER_ACTIVE_REQUIRES_PILOT';

const ALL_STAGES: readonly string[] = [...FINANCIER_STAGE_ORDER, ...FINANCIER_OFFRAMP_STAGES];

export function isFinancierStage(value: string | null | undefined): value is FinancierStageId {
  return typeof value === 'string' && ALL_STAGES.includes(value);
}

/** The legal next stages from `from`; [] for an unknown stage (fail closed). */
export function allowedFinancierNextStages(from: string): readonly FinancierStageId[] {
  return isFinancierStage(from) ? FINANCIER_LIFECYCLE_TRANSITIONS[from] : [];
}

export interface FinancierTransitionDecision {
  candidateId: string;
  from: FinancierStageId | null;
  to: FinancierStageId | null;
  allowed: boolean;
  refusal: FinancierTransitionRefusal | null;
  reason: string;
}

/**
 * Decide whether a provider may move from one stage to another. FAIL CLOSED: an
 * unknown stage, an undeclared transition, or an attempt to mark a provider ACTIVE
 * without a completed PILOT are all REFUSED — never defaulted.
 */
export function transitionFinancier(
  candidateId: string,
  from: string,
  to: string
): FinancierTransitionDecision {
  if (!isFinancierStage(from) || !isFinancierStage(to)) {
    return {
      candidateId,
      from: null,
      to: null,
      allowed: false,
      refusal: 'FINANCIER_STAGE_UNKNOWN',
      reason: 'That is not a declared lifecycle stage, so the move is refused rather than guessed.',
    };
  }
  if (to === 'active_partner' && from !== 'pilot') {
    return {
      candidateId,
      from,
      to,
      allowed: false,
      refusal: 'FINANCIER_ACTIVE_REQUIRES_PILOT',
      reason:
        'A provider is never marked ACTIVE merely because it was researched — ACTIVE PARTNER is reachable only from PILOT.',
    };
  }
  if (!FINANCIER_LIFECYCLE_TRANSITIONS[from].includes(to)) {
    return {
      candidateId,
      from,
      to,
      allowed: false,
      refusal: 'FINANCIER_TRANSITION_ILLEGAL',
      reason: `A provider may not move from ${FINANCIER_STAGE_LABELS[from]} to ${FINANCIER_STAGE_LABELS[to]}.`,
    };
  }
  return {
    candidateId,
    from,
    to,
    allowed: true,
    refusal: null,
    reason: `Allowed: ${FINANCIER_STAGE_LABELS[from]} → ${FINANCIER_STAGE_LABELS[to]}.`,
  };
}

/* ── The founder-facing summary ──────────────────────────────────────────── */

export interface FinancierLifecycleSummary {
  /** The forward path, in order, with labels. */
  stages: { id: FinancierStageId; label: string }[];
  stageCount: number;
  /** The two off-ramps. */
  offRamps: { id: FinancierStageId; label: string }[];
  /** The labelled illustrative candidates and their allowed next stages. */
  candidates: {
    id: string;
    label: string;
    stage: FinancierStageId;
    stageLabel: string;
    illustrative: boolean;
    nextStages: { id: FinancierStageId; label: string }[];
  }[];
  candidateCount: number;
  activeCount: number;
  researchedCount: number;
  oneOwner: boolean;
  forwardOnly: boolean;
  activeRequiresPilot: boolean;
  offRampsFromAnyActiveStage: boolean;
  basis: string;
  disclaimer: string;
}

/** Summarise the lifecycle for the founder surface. Derived, never retyped. */
export function buildFinancierLifecycleSummary(): FinancierLifecycleSummary {
  const candidates = DEMO_FINANCIER_CANDIDATES.map((c) => ({
    id: c.id,
    label: c.label,
    stage: c.stage,
    stageLabel: FINANCIER_STAGE_LABELS[c.stage],
    illustrative: c.illustrative,
    nextStages: FINANCIER_LIFECYCLE_TRANSITIONS[c.stage].map((n) => ({
      id: n,
      label: FINANCIER_STAGE_LABELS[n],
    })),
  }));
  return {
    stages: FINANCIER_STAGE_ORDER.map((id) => ({ id, label: FINANCIER_STAGE_LABELS[id] })),
    stageCount: FINANCIER_STAGE_ORDER.length,
    offRamps: FINANCIER_OFFRAMP_STAGES.map((id) => ({ id, label: FINANCIER_STAGE_LABELS[id] })),
    candidates,
    candidateCount: candidates.length,
    activeCount: candidates.filter((c) => c.stage === 'active_partner').length,
    researchedCount: candidates.filter((c) => c.stage === 'researched').length,
    oneOwner: ONE_FINANCIER_LIFECYCLE_OWNER,
    forwardOnly: FINANCIER_LIFECYCLE_IS_FORWARD_ONLY,
    activeRequiresPilot: FINANCIER_ACTIVE_REQUIRES_PILOT,
    offRampsFromAnyActiveStage: FINANCIER_OFFRAMPS_FROM_ANY_ACTIVE_STAGE,
    basis: FINANCIER_LIFECYCLE_BASIS,
    disclaimer: FINANCIER_LIFECYCLE_DISCLAIMER,
  };
}
