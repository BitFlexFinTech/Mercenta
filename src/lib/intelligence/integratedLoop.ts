/**
 * §PHASE 12 — THE INTEGRATED LOOP RESOLVER — the pure rules over the ONE owner.
 *
 * The owner (`src/config/integratedLoop.ts`) declares the loop and the rule over it; this
 * module applies it. It is PURE and DETERMINISTIC: no clock, no randomness, no network, no AI.
 *
 * THE RULES IT ENFORCES:
 *   · a stage that is not declared is REFUSED (INTEGRATED_LOOP_STAGE_UNKNOWN);
 *   · the ENTRY stage has no predecessor — offering it one is REFUSED
 *     (INTEGRATED_LOOP_ENTRY_HAS_NO_PREDECESSOR);
 *   · the loop is FORWARD-ONLY: a stage is reached ONLY from its declared predecessor, so a
 *     back-step, a skip or a jump is REFUSED (INTEGRATED_LOOP_TRANSITION_ILLEGAL);
 *   · reaching a stage from its declared predecessor is ALLOWED.
 *
 * It re-derives no figure: it reports WHERE each stage's behaviour comes from (its canonical
 * owner) and proves, live, that an illegal move is refused.
 */
import {
  INTEGRATED_LOOP_CLOSES_INTO_FOUNDER_INTELLIGENCE,
  INTEGRATED_LOOP_ENTRY_STAGE_ID,
  INTEGRATED_LOOP_FINAL_STAGE_ID,
  INTEGRATED_LOOP_BASIS,
  INTEGRATED_LOOP_DISCLAIMER,
  INTEGRATED_LOOP_IS_FORWARD_ONLY,
  INTEGRATED_LOOP_PREDECESSOR,
  INTEGRATED_LOOP_RULES,
  INTEGRATED_LOOP_STAGE_IDS,
  INTEGRATED_LOOP_STAGES_HAVE_CANONICAL_OWNERS,
  INTEGRATED_LOOP_STAGES,
  ONE_INTEGRATED_LOOP_OWNER,
  type IntegratedLoopStage,
} from '@/config/integratedLoop';

const BY_ID = new Map(INTEGRATED_LOOP_STAGES.map((s) => [s.id, s]));

/** Resolve a declared stage by id — never throws, reports honestly. */
export function resolveIntegratedStage(id: string): {
  found: boolean;
  stage: IntegratedLoopStage | null;
} {
  const stage = BY_ID.get(id) ?? null;
  return { found: stage !== null, stage };
}

/** The declared predecessor of a stage (null for the entry stage; undefined if unknown). */
export function predecessorOf(stageId: string): string | null | undefined {
  return INTEGRATED_LOOP_PREDECESSOR[stageId];
}

export type IntegratedLoopRefusal =
  | 'INTEGRATED_LOOP_STAGE_UNKNOWN'
  | 'INTEGRATED_LOOP_ENTRY_HAS_NO_PREDECESSOR'
  | 'INTEGRATED_LOOP_TRANSITION_ILLEGAL';

export interface IntegratedLoopTransitionDecision {
  toId: string;
  fromId: string | null;
  stage: IntegratedLoopStage | null;
  allowed: boolean;
  refusal: IntegratedLoopRefusal | null;
  reason: string;
}

/**
 * Decide whether the loop may move from `fromId` to `toId`. FAIL CLOSED: an unknown stage is
 * refused; giving the ENTRY stage a predecessor is refused; and any move that is not the ONE
 * declared forward step (its exact predecessor) is refused. Only the declared predecessor may
 * reach a stage.
 */
export function evaluateLoopTransition(
  toId: string,
  fromId: string | null
): IntegratedLoopTransitionDecision {
  const resolved = resolveIntegratedStage(toId);
  const stage = resolved.stage;
  if (!stage) {
    return {
      toId,
      fromId,
      stage: null,
      allowed: false,
      refusal: 'INTEGRATED_LOOP_STAGE_UNKNOWN',
      reason: 'That is not a declared loop stage, so it is refused rather than guessed.',
    };
  }
  const declaredPredecessor = INTEGRATED_LOOP_PREDECESSOR[toId] ?? null;
  if (toId === INTEGRATED_LOOP_ENTRY_STAGE_ID) {
    // The entry stage is reached from nothing.
    if (fromId !== null && fromId !== undefined && fromId !== '') {
      return {
        toId,
        fromId,
        stage,
        allowed: false,
        refusal: 'INTEGRATED_LOOP_ENTRY_HAS_NO_PREDECESSOR',
        reason: `“${stage.label}” is the entry stage of the loop, so it has no predecessor.`,
      };
    }
    return {
      toId,
      fromId: null,
      stage,
      allowed: true,
      refusal: null,
      reason: `“${stage.label}” is the entry stage — the loop starts here.`,
    };
  }
  if (!fromId || fromId !== declaredPredecessor) {
    return {
      toId,
      fromId,
      stage,
      allowed: false,
      refusal: 'INTEGRATED_LOOP_TRANSITION_ILLEGAL',
      reason: `The loop is forward-only: “${stage.label}” is reached only from its declared predecessor (${declaredPredecessor}).`,
    };
  }
  return {
    toId,
    fromId,
    stage,
    allowed: true,
    refusal: null,
    reason: `Reached “${stage.label}” from its declared predecessor (${declaredPredecessor}).`,
  };
}

/* ── The founder-facing summary over the canonical loop ────────────────────── */

export interface IntegratedLoopSummary {
  stages: {
    id: string;
    label: string;
    about: string;
    dataOwner: string;
    predecessor: string | null;
  }[];
  stageCount: number;
  distinctOwnerCount: number;
  entryStageId: string;
  finalStageId: string;
  closesIntoFounderIntelligence: boolean;
  oneOwner: boolean;
  forwardOnly: boolean;
  stagesHaveCanonicalOwners: boolean;
  /** A live demonstration: a back-step in the loop is REFUSED (fail-closed proof). */
  exampleRefusal: { from: string; to: string; refusal: IntegratedLoopRefusal | null; reason: string };
  rules: readonly string[];
  basis: string;
  disclaimer: string;
}

/**
 * Summarise the integrated loop for the founder surface. The `exampleRefusal` is computed LIVE
 * from the resolver, so the surface shows the rule actually firing rather than merely
 * describing it.
 */
export function buildIntegratedLoopSummary(): IntegratedLoopSummary {
  const stages = INTEGRATED_LOOP_STAGES.map((s) => ({
    id: s.id,
    label: s.label,
    about: s.about,
    dataOwner: s.dataOwner,
    predecessor: INTEGRATED_LOOP_PREDECESSOR[s.id] ?? null,
  }));

  // A live proof: reaching the FINAL stage from itself (a back-step) must be refused.
  const sample = evaluateLoopTransition(INTEGRATED_LOOP_FINAL_STAGE_ID, INTEGRATED_LOOP_FINAL_STAGE_ID);

  return {
    stages,
    stageCount: stages.length,
    distinctOwnerCount: new Set(stages.map((s) => s.dataOwner)).size,
    entryStageId: INTEGRATED_LOOP_ENTRY_STAGE_ID,
    finalStageId: INTEGRATED_LOOP_FINAL_STAGE_ID,
    closesIntoFounderIntelligence: INTEGRATED_LOOP_CLOSES_INTO_FOUNDER_INTELLIGENCE,
    oneOwner: ONE_INTEGRATED_LOOP_OWNER,
    forwardOnly: INTEGRATED_LOOP_IS_FORWARD_ONLY,
    stagesHaveCanonicalOwners: INTEGRATED_LOOP_STAGES_HAVE_CANONICAL_OWNERS,
    exampleRefusal: {
      from: sample.fromId ?? INTEGRATED_LOOP_FINAL_STAGE_ID,
      to: sample.toId,
      refusal: sample.refusal,
      reason: sample.reason,
    },
    rules: INTEGRATED_LOOP_RULES,
    basis: INTEGRATED_LOOP_BASIS,
    disclaimer: INTEGRATED_LOOP_DISCLAIMER,
  };
}

/** The canonical stage ids — re-exported for a surface/gate to quote. */
export const INTEGRATED_LOOP_IDS = INTEGRATED_LOOP_STAGE_IDS;

