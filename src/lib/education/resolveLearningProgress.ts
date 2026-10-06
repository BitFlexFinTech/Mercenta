/**
 * §PHASE 4 — THE LEARNING LOOP RESOLVER — the pure rules over the ONE owner.
 *
 * The owner (`src/config/learningLoop.ts`) declares the vocabulary; this module
 * applies it. It is PURE and DETERMINISTIC: no clock, no randomness, no network,
 * no AI.
 *
 * THE RULES IT ENFORCES:
 *   · the loop is SEQUENTIAL — a stage cannot begin before every earlier stage is
 *     done;
 *   · a topic is COMPLETE only once its VALIDATE stage is satisfied by a REAL
 *     signal — performing the action (`DO`) is NOT completion;
 *   · a validation signal that arrives before the action has been performed is
 *     REFUSED (fail closed);
 *   · an unknown topic resolves to NO stage and is REFUSED (fail closed).
 */
import {
  DEMO_LEARNING_SIGNALS,
  DEMO_LEARNING_TOPIC_ID,
  LEARNING_LOOP_BASIS,
  LEARNING_LOOP_DISCLAIMER,
  LEARNING_STAGES,
  LEARNING_STAGE_ORDER,
  LEARNING_TOPICS,
  VALIDATE_REQUIRES_EVIDENCE,
  type LearningStageDefinition,
  type LearningStageId,
  type LearningTopic,
} from '@/config/learningLoop';

/** The real signals a brand's education progress is derived from. */
export interface LearningSignals {
  /** LEARN — the canonical Knowledge Base article was read. */
  articleRead?: boolean;
  /** WATCH — the canonical guided tour was completed. */
  tourCompleted?: boolean;
  /** DO — the real action was performed in the product. */
  actionPerformed?: boolean;
  /** VALIDATE — the step was PROVEN (a real signal, never an assertion). */
  validationPassed?: boolean;
}

export type LearningStageState = 'locked' | 'available' | 'done';

export interface StageResolution {
  id: LearningStageId;
  state: LearningStageState;
}

export type LearningRefusal = 'LEARNING_TOPIC_UNKNOWN' | 'VALIDATION_WITHOUT_ACTION';

export interface LearningProgress {
  topicId: string;
  academyStage: 1 | 2 | 3 | 4 | 5 | null;
  stages: StageResolution[];
  /** The first stage not yet done (or `complete` when the topic is closed). */
  currentStage: LearningStageId;
  /** TRUE only when the VALIDATE gate is satisfied by a real signal. */
  validateSatisfied: boolean;
  /** TRUE only when VALIDATE is satisfied — never from acting alone. */
  complete: boolean;
  refused: LearningRefusal | null;
}

/** The canonical topic for an id, or null (fail closed). */
export function findLearningTopic(id: string | null | undefined): LearningTopic | null {
  if (typeof id !== 'string' || id.length === 0) return null;
  return LEARNING_TOPICS.find((t) => t.id === id) ?? null;
}

function lockedStages(): StageResolution[] {
  return LEARNING_STAGE_ORDER.map((id) => ({ id, state: 'locked' as const }));
}

/**
 * Resolve a brand's progress through one topic from its real signals.
 *
 * FAIL CLOSED: an unknown topic is refused; a validation signal that arrives
 * before the action is refused; and the topic is complete ONLY when the VALIDATE
 * gate is satisfied.
 */
export function resolveLearningProgress(
  topicId: string | null | undefined,
  signals: LearningSignals = {}
): LearningProgress {
  const topic = findLearningTopic(topicId);
  if (!topic) {
    return {
      topicId: typeof topicId === 'string' ? topicId : '',
      academyStage: null,
      stages: lockedStages(),
      currentStage: 'learn',
      validateSatisfied: false,
      complete: false,
      refused: 'LEARNING_TOPIC_UNKNOWN',
    };
  }

  const done: Record<LearningStageId, boolean> = {
    learn: false,
    watch: false,
    do: false,
    validate: false,
    complete: false,
  };

  // Sequential, evidence-driven. Each stage requires every earlier stage AND its
  // own real signal.
  done.learn = signals.articleRead === true;
  done.watch = done.learn && signals.tourCompleted === true;
  done.do = done.watch && signals.actionPerformed === true;

  // FAIL CLOSED: validation cannot precede the action.
  const refused: LearningRefusal | null =
    signals.validationPassed === true && !done.do ? 'VALIDATION_WITHOUT_ACTION' : null;

  done.validate = refused === null && done.do && signals.validationPassed === true;
  done.complete = done.validate;

  const stages: StageResolution[] = LEARNING_STAGE_ORDER.map((id) => {
    if (done[id]) return { id, state: 'done' as const };
    const idx = LEARNING_STAGE_ORDER.indexOf(id);
    const priorDone = LEARNING_STAGE_ORDER.slice(0, idx).every((p) => done[p]);
    return { id, state: priorDone ? ('available' as const) : ('locked' as const) };
  });

  const currentStage = LEARNING_STAGE_ORDER.find((id) => !done[id]) ?? 'complete';

  return {
    topicId: topic.id,
    academyStage: topic.academyStage,
    stages,
    currentStage,
    validateSatisfied: done.validate,
    complete: done.complete,
    refused,
  };
}

/* ── The founder-facing summary ──────────────────────────────────────────── */

export interface LearningLoopSummary {
  stages: LearningStageDefinition[];
  stageCount: number;
  /** The ONE gate stage (VALIDATE). */
  gateStage: LearningStageId;
  topicCount: number;
  topics: LearningTopic[];
  /** A labelled DEMO topic, resolved from the labelled DEMO signals. */
  demo: {
    topicId: string;
    label: string;
    academyStage: 1 | 2 | 3 | 4 | 5 | null;
    currentStage: LearningStageId;
    validateSatisfied: boolean;
    complete: boolean;
  };
  /** TRUE — a topic is never complete from a click (pinned invariant). */
  validateRequiresEvidence: boolean;
  basis: string;
  disclaimer: string;
}

/** Summarise the loop for the founder surface. Derived — nothing retyped. */
export function buildLearningLoopSummary(): LearningLoopSummary {
  const demoTopic = findLearningTopic(DEMO_LEARNING_TOPIC_ID);
  const demoProgress = resolveLearningProgress(DEMO_LEARNING_TOPIC_ID, DEMO_LEARNING_SIGNALS);
  return {
    stages: LEARNING_STAGE_ORDER.map((id) => LEARNING_STAGES[id]),
    stageCount: LEARNING_STAGE_ORDER.length,
    gateStage: 'validate',
    topicCount: LEARNING_TOPICS.length,
    topics: [...LEARNING_TOPICS],
    demo: {
      topicId: DEMO_LEARNING_TOPIC_ID,
      label: demoTopic?.label ?? DEMO_LEARNING_TOPIC_ID,
      academyStage: demoProgress.academyStage,
      currentStage: demoProgress.currentStage,
      validateSatisfied: demoProgress.validateSatisfied,
      complete: demoProgress.complete,
    },
    validateRequiresEvidence: VALIDATE_REQUIRES_EVIDENCE,
    basis: LEARNING_LOOP_BASIS,
    disclaimer: LEARNING_LOOP_DISCLAIMER,
  };
}