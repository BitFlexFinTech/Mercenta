/**
 * §PHASE 4 — THE ONBOARDING ACADEMY CURRICULUM RESOLVER — the pure rules over the owner.
 *
 * The owner (`src/config/onboardingCurriculum.ts`) declares the stages; this module
 * applies them. It is PURE and DETERMINISTIC: no clock, no randomness, no network,
 * no AI.
 *
 * THE RULES IT ENFORCES:
 *   · the curriculum is SEQUENTIAL — a stage cannot begin before every earlier
 *     GATING stage is complete;
 *   · a topic counts as complete for a stage ONLY when its learning loop is complete
 *     — which REQUIRES the VALIDATE gate to be satisfied by a real signal. This
 *     resolver calls `resolveLearningProgress`, so "the brand said it is done" can
 *     never close a stage;
 *   · the final readiness stage is reached ONLY once every gating stage is complete;
 *     it is a RESULT, never a button;
 *   · an unknown stage is REFUSED (fail closed).
 */
import {
  ACADEMY_STAGES,
  ACADEMY_STAGE_ORDER,
  ACADEMY_STAGE_TOPICS,
  CURRICULUM_BASIS,
  CURRICULUM_DISCLAIMER,
  FINAL_READINESS_REQUIRES_ALL_STAGES,
  READINESS_STAGE_ID,
  type AcademyStageDefinition,
  type AcademyStageId,
} from '@/config/onboardingCurriculum';
import {
  resolveLearningProgress,
  type LearningSignals,
} from '@/lib/education/resolveLearningProgress';

/** The real signals a brand's curriculum progress is derived from, per topic. */
export type CurriculumSignals = Record<string, LearningSignals>;

export type AcademyStageState = 'complete' | 'in_progress' | 'locked';

export interface AcademyStageProgress {
  id: AcademyStageId;
  order: number;
  kind: AcademyStageDefinition['kind'];
  label: string;
  gating: boolean;
  topicIds: string[];
  completedTopicIds: string[];
  state: AcademyStageState;
}

export type CurriculumRefusal = 'CURRICULUM_STAGE_UNKNOWN';

export interface CurriculumProgress {
  stages: AcademyStageProgress[];
  /** The first stage not yet complete (or the readiness stage when everything is). */
  currentStageId: AcademyStageId;
  /** TRUE only when every GATING stage is complete. */
  readinessReached: boolean;
  refused: CurriculumRefusal | null;
}

/** TRUE only when a topic's learning loop is complete (VALIDATE satisfied). */
function topicComplete(topicId: string, signals: CurriculumSignals): boolean {
  return resolveLearningProgress(topicId, signals[topicId] ?? {}).complete;
}

/**
 * Resolve a brand's position in the curriculum from its real per-topic signals.
 *
 * FAIL CLOSED: a topic with a validation signal but no performed action is NOT
 * complete (the learning loop refuses it), so no stage can be closed that way.
 */
export function resolveCurriculumProgress(signals: CurriculumSignals = {}): CurriculumProgress {
  const stages: AcademyStageProgress[] = [];
  let priorGatingComplete = true;

  for (const id of ACADEMY_STAGE_ORDER) {
    const def = ACADEMY_STAGES[id];
    const topics = ACADEMY_STAGE_TOPICS[id];
    const completedTopicIds = topics.filter((t) => topicComplete(t.id, signals)).map((t) => t.id);

    let state: AcademyStageState;
    if (def.kind === 'orientation') {
      // Orientation is provided when the brand onboards; it is not a gap, so it
      // never blocks and is treated as settled.
      state = 'complete';
    } else if (def.kind === 'readiness') {
      // The capstone is reached ONLY once every gating stage is complete.
      state = priorGatingComplete ? 'complete' : 'locked';
    } else {
      const allDone = topics.length > 0 && completedTopicIds.length === topics.length;
      state = allDone ? 'complete' : priorGatingComplete ? 'in_progress' : 'locked';
    }

    stages.push({
      id,
      order: def.order,
      kind: def.kind,
      label: def.label,
      gating: def.gating,
      topicIds: topics.map((t) => t.id),
      completedTopicIds,
      state,
    });

    if (def.gating && state !== 'complete') priorGatingComplete = false;
  }

  const currentStageId =
    ACADEMY_STAGE_ORDER.find((id) => stages.find((s) => s.id === id)?.state !== 'complete') ??
    READINESS_STAGE_ID;

  const readinessReached = stages.find((s) => s.id === READINESS_STAGE_ID)?.state === 'complete';

  return { stages, currentStageId, readinessReached, refused: null };
}

/** The resolution of a single stage, or a fail-closed refusal for an unknown id. */
export interface StageResolution {
  stage: AcademyStageProgress | null;
  refused: CurriculumRefusal | null;
}

/** Resolve ONE stage by id. An unknown id is REFUSED (fail closed). */
export function resolveCurriculumStage(
  stageId: string | null | undefined,
  signals: CurriculumSignals = {}
): StageResolution {
  if (typeof stageId !== 'string' || !ACADEMY_STAGE_ORDER.includes(stageId as AcademyStageId)) {
    return { stage: null, refused: 'CURRICULUM_STAGE_UNKNOWN' };
  }
  const progress = resolveCurriculumProgress(signals);
  return { stage: progress.stages.find((s) => s.id === stageId) ?? null, refused: null };
}

/* ── The labelled DEMO signals ────────────────────────────────────────────── */

const FULL_SIGNALS: LearningSignals = {
  articleRead: true,
  tourCompleted: true,
  actionPerformed: true,
  validationPassed: true,
};

/**
 * A LABELLED DEMO signal set: the brand has completed the Commercial and
 * Product & Packaging stages in full, and started Product Readiness (only its
 * first topic is complete). The curriculum therefore stands at Product Readiness
 * and the final readiness stage is honestly NOT reached.
 */
export const DEMO_CURRICULUM_SIGNALS: CurriculumSignals = (() => {
  const signals: CurriculumSignals = {};
  const complete = (id: AcademyStageId) => {
    for (const t of ACADEMY_STAGE_TOPICS[id]) signals[t.id] = { ...FULL_SIGNALS };
  };
  complete('commercial');
  complete('product_packaging');
  const firstReadiness = ACADEMY_STAGE_TOPICS.product_readiness[0];
  if (firstReadiness) signals[firstReadiness.id] = { ...FULL_SIGNALS };
  return signals;
})();

/* ── The founder-facing summary ──────────────────────────────────────────── */

export interface OnboardingCurriculumSummary {
  /** The six stages, with their derived topic counts. */
  stages: {
    id: AcademyStageId;
    order: number;
    label: string;
    kind: AcademyStageDefinition['kind'];
    gating: boolean;
    topicCount: number;
  }[];
  stageCount: number;
  teachingStageCount: number;
  readinessStageId: AcademyStageId;
  topicCount: number;
  /** TRUE — the final readiness stage requires every teaching stage. */
  finalReadinessRequiresAllStages: boolean;
  /** A labelled DEMO position, resolved from the labelled DEMO signals. */
  demo: {
    currentStageId: AcademyStageId;
    currentStageLabel: string;
    readinessReached: boolean;
    stages: {
      id: AcademyStageId;
      label: string;
      state: AcademyStageState;
      completedTopics: number;
      totalTopics: number;
    }[];
  };
  basis: string;
  disclaimer: string;
}

/** Summarise the curriculum for the founder surface. Derived — nothing retyped. */
export function buildOnboardingCurriculumSummary(): OnboardingCurriculumSummary {
  const demoProgress = resolveCurriculumProgress(DEMO_CURRICULUM_SIGNALS);
  return {
    stages: ACADEMY_STAGE_ORDER.map((id) => ({
      id,
      order: ACADEMY_STAGES[id].order,
      label: ACADEMY_STAGES[id].label,
      kind: ACADEMY_STAGES[id].kind,
      gating: ACADEMY_STAGES[id].gating,
      topicCount: ACADEMY_STAGE_TOPICS[id].length,
    })),
    stageCount: ACADEMY_STAGE_ORDER.length,
    teachingStageCount: ACADEMY_STAGE_ORDER.filter((id) => ACADEMY_STAGES[id].kind !== 'readiness').length,
    readinessStageId: READINESS_STAGE_ID,
    topicCount: ACADEMY_STAGE_ORDER.reduce((sum, id) => sum + ACADEMY_STAGE_TOPICS[id].length, 0),
    finalReadinessRequiresAllStages: FINAL_READINESS_REQUIRES_ALL_STAGES,
    demo: {
      currentStageId: demoProgress.currentStageId,
      currentStageLabel: ACADEMY_STAGES[demoProgress.currentStageId].label,
      readinessReached: demoProgress.readinessReached,
      stages: demoProgress.stages.map((s) => ({
        id: s.id,
        label: s.label,
        state: s.state,
        completedTopics: s.completedTopicIds.length,
        totalTopics: s.topicIds.length,
      })),
    },
    basis: CURRICULUM_BASIS,
    disclaimer: CURRICULUM_DISCLAIMER,
  };
}
