/**
 * §PHASE 11 — THE FOUNDER INTELLIGENCE RESOLVER — the pure rules over the ONE owner.
 *
 * The owner (`src/config/founderIntelligence.ts`) declares the founder-question universe
 * and the rule over it; this module applies it. It is PURE and DETERMINISTIC: no clock,
 * no randomness, no network, no AI.
 *
 * THE RULES IT ENFORCES:
 *   · a question that is not declared is REFUSED (FOUNDER_QUESTION_UNKNOWN);
 *   · the DATA behind an answer comes ONLY from its declared canonical owner — AI is
 *     REFUSED as the producer of any data (FOUNDER_AI_MAY_ONLY_SUMMARISE), and so is a
 *     human (FOUNDER_DATA_REQUIRES_CANONICAL_OWNER);
 *   · AI (or a human, or the canonical owner) MAY produce a SUMMARY over the data.
 *
 * It re-derives no figure: the summary reports WHERE each answer's data comes from and
 * proves, live, that an AI-supplied figure is refused.
 */
import {
  FOUNDER_INTELLIGENCE_AI_MAY_ONLY_SUMMARISE,
  FOUNDER_INTELLIGENCE_ANSWERS_FROM_CANONICAL_DATA,
  FOUNDER_INTELLIGENCE_BASIS,
  FOUNDER_INTELLIGENCE_DISCLAIMER,
  FOUNDER_INTELLIGENCE_FAILS_CLOSED,
  FOUNDER_INTELLIGENCE_RULES,
  FOUNDER_QUESTION_IDS,
  FOUNDER_QUESTIONS,
  ONE_FOUNDER_INTELLIGENCE_OWNER,
  type FounderAnswerProduceKind,
  type FounderAnswerSource,
  type FounderQuestion,
} from '@/config/founderIntelligence';

const BY_ID = new Map(FOUNDER_QUESTIONS.map((q) => [q.id, q]));

/** Resolve a declared founder question by id — never throws, reports honestly. */
export function resolveFounderQuestion(id: string): {
  found: boolean;
  question: FounderQuestion | null;
} {
  const question = BY_ID.get(id) ?? null;
  return { found: question !== null, question };
}

export type FounderIntelligenceRefusal =
  | 'FOUNDER_QUESTION_UNKNOWN'
  | 'FOUNDER_AI_MAY_ONLY_SUMMARISE'
  | 'FOUNDER_DATA_REQUIRES_CANONICAL_OWNER';

export interface FounderAnswerDecision {
  questionId: string;
  question: FounderQuestion | null;
  kind: FounderAnswerProduceKind;
  source: FounderAnswerSource;
  allowed: boolean;
  refusal: FounderIntelligenceRefusal | null;
  reason: string;
}

/**
 * Decide whether a piece of a founder answer may be produced by `source`. FAIL CLOSED: an
 * unknown question is refused; AI producing the DATA is refused (AI may only summarise);
 * any non-canonical producer of the DATA is refused. Only the canonical owner supplies data.
 */
export function evaluateFounderAnswer(
  questionId: string,
  kind: FounderAnswerProduceKind,
  source: FounderAnswerSource
): FounderAnswerDecision {
  const resolved = resolveFounderQuestion(questionId);
  const q = resolved.question;
  if (!q) {
    return {
      questionId,
      question: null,
      kind,
      source,
      allowed: false,
      refusal: 'FOUNDER_QUESTION_UNKNOWN',
      reason: 'That is not a declared founder question, so it is refused rather than guessed.',
    };
  }
  if (kind === 'data' && source === 'ai') {
    return {
      questionId,
      question: q,
      kind,
      source,
      allowed: false,
      refusal: 'FOUNDER_AI_MAY_ONLY_SUMMARISE',
      reason: 'AI may summarise an answer, but it may never supply the data behind one.',
    };
  }
  if (kind === 'data' && source !== 'canonical_owner') {
    return {
      questionId,
      question: q,
      kind,
      source,
      allowed: false,
      refusal: 'FOUNDER_DATA_REQUIRES_CANONICAL_OWNER',
      reason: `The data for “${q.question}” must come from its declared canonical owner (${q.dataOwner}).`,
    };
  }
  return {
    questionId,
    question: q,
    kind,
    source,
    allowed: true,
    refusal: null,
    reason:
      kind === 'data'
        ? `The data is supplied by its canonical owner (${q.dataOwner}).`
        : 'A summary over the canonical data is allowed.',
  };
}

/* ── The founder-facing summary over the canonical questions ───────────────── */

export interface FounderIntelligenceSummary {
  questions: {
    id: string;
    question: string;
    about: string;
    dataOwner: string;
    aiMaySummarise: boolean;
  }[];
  questionCount: number;
  aiSummarisableCount: number;
  dataOwnerCount: number;
  oneOwner: boolean;
  answersFromCanonicalData: boolean;
  aiMayOnlySummarise: boolean;
  failsClosed: boolean;
  /** A live demonstration: an AI-supplied figure is REFUSED (fail-closed proof). */
  exampleRefusal: { question: string; refusal: FounderIntelligenceRefusal | null; reason: string };
  rules: readonly string[];
  basis: string;
  disclaimer: string;
}

/**
 * Summarise the founder intelligence for the founder surface. The `exampleRefusal` is
 * computed LIVE from the resolver, so the surface shows the rule actually firing rather
 * than merely describing it.
 */
export function buildFounderIntelligenceSummary(): FounderIntelligenceSummary {
  const questions = FOUNDER_QUESTIONS.map((q) => ({
    id: q.id,
    question: q.question,
    about: q.about,
    dataOwner: q.dataOwner,
    aiMaySummarise: q.aiMaySummarise,
  }));

  // A live proof: an AI attempt to SUPPLY THE DATA must be refused.
  const sample = evaluateFounderAnswer('what-needs-attention', 'data', 'ai');

  return {
    questions,
    questionCount: questions.length,
    aiSummarisableCount: questions.filter((q) => q.aiMaySummarise).length,
    dataOwnerCount: new Set(questions.map((q) => q.dataOwner)).size,
    oneOwner: ONE_FOUNDER_INTELLIGENCE_OWNER,
    answersFromCanonicalData: FOUNDER_INTELLIGENCE_ANSWERS_FROM_CANONICAL_DATA,
    aiMayOnlySummarise: FOUNDER_INTELLIGENCE_AI_MAY_ONLY_SUMMARISE,
    failsClosed: FOUNDER_INTELLIGENCE_FAILS_CLOSED,
    exampleRefusal: {
      question: sample.question?.question ?? 'what-needs-attention',
      refusal: sample.refusal,
      reason: sample.reason,
    },
    rules: FOUNDER_INTELLIGENCE_RULES,
    basis: FOUNDER_INTELLIGENCE_BASIS,
    disclaimer: FOUNDER_INTELLIGENCE_DISCLAIMER,
  };
}

/** The canonical question ids — re-exported for a surface/gate to quote. */
export const FOUNDER_INTELLIGENCE_QUESTION_IDS = FOUNDER_QUESTION_IDS;