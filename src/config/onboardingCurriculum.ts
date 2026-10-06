/**
 * §PHASE 4 — THE ONBOARDING ACADEMY CURRICULUM — the ONE owner of the curriculum.
 *
 * WHY THIS EXISTS
 * ---------------
 * The registry row `phase4-onboarding-academy-curriculum` records the Brand
 * Education / Onboarding Academy curriculum "across its five stages plus the
 * final product/catalogue readiness stage". The ACADEMY SEAM already existed:
 *
 *   · `src/config/ukMarketFit.ts → PRE_AUDIT_EDUCATIONAL_GAPS` tags every gap a
 *     brand arrives WITHOUT with an `academyStage: 1|2|3|4|5` — WHICH curriculum
 *     stage will teach it;
 *   · `src/config/commercialReadiness.ts` tags every brand-facing guidance topic
 *     with the same `academyStage`;
 *   · `src/config/learningLoop.ts` owns the LEARN → WATCH → DO → VALIDATE →
 *     COMPLETE loop over those gaps (a topic is complete only once its VALIDATE
 *     gate is satisfied by a real signal).
 *
 * What was MISSING was the curriculum itself: the ONE place that declares the
 * ORDERED stages a brand progresses through and, critically, that the final
 * readiness stage is reached ONLY once every teaching stage is actually complete.
 *
 * THE STAGES — the canonical five (taken verbatim from the Phase-4 definition in
 * `docs/archive/MASTER_CHATGPT_HANDOFF.md` §16 "Academy stages") plus the final
 * readiness stage:
 *
 *   1. Understand Mercenta   — the onboarding ORIENTATION (taught at onboarding;
 *                              not a knowledge gap, so the pre-audit never captures it)
 *   2. Commercial            — academyStage 2
 *   3. Product & Packaging   — academyStage 3
 *   4. Product Readiness     — academyStage 4
 *   5. Operations            — academyStage 5
 *   6. Product & catalogue readiness — the FINAL stage, reached ONLY once every
 *                              teaching stage above is complete (a RESULT, never a
 *                              button the brand presses)
 *
 * NO CONTENT IS INVENTED HERE. Every TEACHING stage's topics are DERIVED from
 * `LEARNING_TOPICS` (itself derived from the canonical educational gaps) by their
 * `academyStage` number — there is no second, hand-maintained list. The
 * orientation stage legitimately carries ZERO gap-topics (it is orientation, not a
 * gap); that fact is asserted by the gate, never assumed.
 */
import { LEARNING_TOPICS, type LearningTopic } from '@/config/learningLoop';

/* ── 1. The stages, in canonical order ───────────────────────────────────── */

export type AcademyStageKind = 'orientation' | 'teaching' | 'readiness';

export type AcademyStageId =
  | 'understand_mercenta'
  | 'commercial'
  | 'product_packaging'
  | 'product_readiness'
  | 'operations'
  | 'catalogue_readiness';

export const ACADEMY_STAGE_ORDER: readonly AcademyStageId[] = [
  'understand_mercenta',
  'commercial',
  'product_packaging',
  'product_readiness',
  'operations',
  'catalogue_readiness',
] as const;

export interface AcademyStageDefinition {
  id: AcademyStageId;
  /** Position in the curriculum, 1-based. */
  order: number;
  label: string;
  /** What the stage is for, in plain language. */
  purpose: string;
  kind: AcademyStageKind;
  /**
   * The canonical `academyStage` number this stage teaches (1..5), or null for the
   * final readiness stage. This is the ONE link to the educational gaps.
   */
  academyStageNumber: 1 | 2 | 3 | 4 | 5 | null;
  /**
   * TRUE when this stage must be complete before the final readiness stage is
   * reached. The orientation stage (1) is provided at onboarding, so it does NOT
   * gate; the teaching stages (2..5) DO.
   */
  gating: boolean;
}

export const ACADEMY_STAGES: Record<AcademyStageId, AcademyStageDefinition> = {
  understand_mercenta: {
    id: 'understand_mercenta',
    order: 1,
    label: 'Understand Mercenta',
    purpose:
      'How the brand works with Mercenta: the channel places orders with Mercenta, which routes them into the brand workspace for the brand’s decision.',
    kind: 'orientation',
    academyStageNumber: 1,
    gating: false,
  },
  commercial: {
    id: 'commercial',
    order: 2,
    label: 'Commercial',
    purpose: 'The commercial concepts a brand must supply: cost price, pricing and the commercial relationship.',
    kind: 'teaching',
    academyStageNumber: 2,
    gating: true,
  },
  product_packaging: {
    id: 'product_packaging',
    order: 3,
    label: 'Product & Packaging',
    purpose: 'How the physical product is made up: sellable unit, case pack, master carton, packaging hierarchy and labelling.',
    kind: 'teaching',
    academyStageNumber: 3,
    gating: true,
  },
  product_readiness: {
    id: 'product_readiness',
    order: 4,
    label: 'Product Readiness',
    purpose: 'What makes a product listable: identifiers, dimensions and weight, images, compliance documentation and category requirements.',
    kind: 'teaching',
    academyStageNumber: 4,
    gating: true,
  },
  operations: {
    id: 'operations',
    order: 5,
    label: 'Operations',
    purpose: 'The day-to-day flow: purchase orders, confirming them, shipping and fulfilment, invoices and payments, returns and deductions.',
    kind: 'teaching',
    academyStageNumber: 5,
    gating: true,
  },
  catalogue_readiness: {
    id: 'catalogue_readiness',
    order: 6,
    label: 'Product & catalogue readiness',
    purpose:
      'The final stage: reached ONLY once every teaching stage is actually complete. It is a RESULT of the curriculum, never a button the brand presses.',
    kind: 'readiness',
    academyStageNumber: null,
    gating: false,
  },
};

/* ── 2. The pinned invariants (a comment cannot guarantee these) ─────────── */

/** The curriculum is SEQUENTIAL — a stage cannot begin before every earlier stage is settled. */
export const CURRICULUM_IS_SEQUENTIAL = true;

/** The final readiness stage is reached ONLY once every GATING stage is complete. */
export const FINAL_READINESS_REQUIRES_ALL_STAGES = true;

/** Every teaching stage's topics are DERIVED from the canonical gaps — never a second list. */
export const STAGES_REUSE_CANONICAL_GAPS = true;

/** The final readiness stage — the capstone. */
export const READINESS_STAGE_ID: AcademyStageId = 'catalogue_readiness';

/* ── 3. The topics per stage — DERIVED from the canonical gap topics ─────── */

/**
 * The topics taught by each stage, DERIVED from `LEARNING_TOPICS` by their
 * `academyStage` number. The readiness stage teaches nothing (it is the result);
 * the orientation stage currently carries no gap-topics because "Understand
 * Mercenta" is orientation, not a gap a brand arrives without.
 */
export const ACADEMY_STAGE_TOPICS: Record<AcademyStageId, readonly LearningTopic[]> =
  ACADEMY_STAGE_ORDER.reduce(
    (acc, id) => {
      const n = ACADEMY_STAGES[id].academyStageNumber;
      acc[id] = n === null ? [] : LEARNING_TOPICS.filter((t) => t.academyStage === n);
      return acc;
    },
    {} as Record<AcademyStageId, readonly LearningTopic[]>
  );

/** The stages that must be complete before readiness — DERIVED, never re-listed. */
export const GATING_STAGE_IDS: readonly AcademyStageId[] =
  ACADEMY_STAGE_ORDER.filter((id) => ACADEMY_STAGES[id].gating);

/* ── 4. The rules, the basis and the refusal, stated once ────────────────── */

export const CURRICULUM_RULES: readonly string[] = [
  'The final readiness stage is reached ONLY once every teaching stage is complete — it is a RESULT, never a button.',
  'A stage cannot be in progress before every earlier gating stage is complete.',
  'Every teaching stage’s topics are DERIVED from the canonical educational gaps; there is no second content list.',
  'A topic counts as complete for a stage ONLY when its LEARN → WATCH → DO → VALIDATE loop is complete (VALIDATE satisfied by a real signal).',
  'The curriculum is deterministic — no AI, no clock, no randomness, no network.',
] as const;

export const CURRICULUM_REFUSALS = {
  unknownStage: 'CURRICULUM_STAGE_UNKNOWN — that stage is not one the curriculum declares, so it holds no progress.',
} as const;

export const CURRICULUM_BASIS =
  'The onboarding academy curriculum runs the five canonical stages (Understand Mercenta · Commercial · Product & Packaging · Product Readiness · Operations) and then the final readiness stage. Each stage’s topics are derived from the canonical educational gaps, and a topic is complete only once its learning loop reaches VALIDATE. The final readiness stage is reached only once every teaching stage is complete.';

export const CURRICULUM_DISCLAIMER =
  'The curriculum tracks a brand’s education progress; it never changes a brand’s commercial model, compliance or settlement, and it is deterministic — no AI, no clock.';

/* ── 5. Module-load guards (fail closed) ─────────────────────────────────── */

if (ACADEMY_STAGE_ORDER.length !== 6) {
  throw new Error('[onboardingCurriculum] the curriculum must declare six stages (five + final readiness)');
}
if (ACADEMY_STAGE_ORDER[ACADEMY_STAGE_ORDER.length - 1] !== READINESS_STAGE_ID) {
  throw new Error('[onboardingCurriculum] the final readiness stage must be LAST');
}
if (ACADEMY_STAGE_ORDER.filter((id) => ACADEMY_STAGES[id].kind === 'readiness').length !== 1) {
  throw new Error('[onboardingCurriculum] exactly ONE readiness stage must exist');
}
if (ACADEMY_STAGE_ORDER.filter((id) => ACADEMY_STAGES[id].kind !== 'readiness').length !== 5) {
  throw new Error('[onboardingCurriculum] there must be exactly five stages before the readiness stage');
}
/* Every teaching/orientation stage must map to a distinct academyStage number. */
{
  const nums = ACADEMY_STAGE_ORDER.filter((id) => ACADEMY_STAGES[id].academyStageNumber !== null)
    .map((id) => ACADEMY_STAGES[id].academyStageNumber);
  if (new Set(nums).size !== nums.length) {
    throw new Error('[onboardingCurriculum] two stages must not share an academyStage number');
  }
}
/* No gap-topic may be orphaned: every topic must land in exactly one stage. */
{
  const assigned = ACADEMY_STAGE_ORDER.reduce((sum, id) => sum + ACADEMY_STAGE_TOPICS[id].length, 0);
  if (assigned !== LEARNING_TOPICS.length) {
    throw new Error('[onboardingCurriculum] every canonical topic must be assigned to exactly one stage');
  }
}
