/**
 * §PHASE 4 — THE LEARNING LOOP — the ONE owner of the brand education loop.
 *
 * WHY THIS EXISTS
 * ---------------
 * The Phase-4 seam already existed in pieces but had NO owner:
 *
 *   · `src/config/commercialReadiness.ts` tags every brand-facing guidance topic
 *     with an `academyStage: 1|2|3|4|5` (WHICH curriculum stage will teach it);
 *   · `src/config/ukMarketFit.ts → PRE_AUDIT_EDUCATIONAL_GAPS` records the real
 *     concepts a brand arrives WITHOUT (the gap the Academy must close);
 *   · `src/data/knowledgeBase.ts → KB_ARTICLES` is the canonical LEARN content;
 *   · `src/config/tours/tourDefinitions.ts → TOUR_REGISTRY` is the canonical WATCH
 *     content (the guided tours of the real screens).
 *
 * What was MISSING was the LOOP itself: the ONE place that declares how a brand
 * actually progresses through a topic — LEARN → WATCH → DO → VALIDATE → COMPLETE —
 * and, critically, the rule that a topic is NEVER complete merely because the
 * brand said so. The VALIDATE stage is a GATE: it is satisfied only by a REAL
 * signal that the brand can do the step, never by a click.
 *
 * THIS MODULE IS THAT OWNER. It declares the five stages, the two pinned
 * invariants and the per-gap sources, and it DERIVES the topic list from the
 * canonical educational gaps — there is no second, hand-maintained list.
 *
 * THE FIVE STAGES (canonical order):
 *   · LEARN    — read the canonical Knowledge Base article.
 *   · WATCH    — complete the canonical guided tour of the real screen.
 *   · DO       — perform the real action in the product.
 *   · VALIDATE — PROVE it (a real signal, never an assertion). This is the GATE.
 *   · COMPLETE — the topic is closed; reached only once VALIDATE is satisfied.
 *
 * NO CONTENT IS INVENTED HERE. Every topic points at its canonical LEARN article
 * and its canonical WATCH tour; a topic whose sources did not exist was left out
 * rather than guessed.
 */
import {
  PRE_AUDIT_EDUCATIONAL_GAPS,
  type PreAuditEducationalGapId,
} from '@/config/ukMarketFit';

/* ── 1. The five stages, in canonical order ──────────────────────────────── */

export type LearningStageId = 'learn' | 'watch' | 'do' | 'validate' | 'complete';

export const LEARNING_STAGE_ORDER: readonly LearningStageId[] = [
  'learn',
  'watch',
  'do',
  'validate',
  'complete',
] as const;

/** The KIND of evidence that satisfies a stage. */
export type LearningEvidenceKind =
  | 'article_read'
  | 'tour_completed'
  | 'action_performed'
  | 'validation_passed'
  | 'closure';

export interface LearningStageDefinition {
  id: LearningStageId;
  label: string;
  /** What the stage means, in plain language. */
  meaning: string;
  /** What the brand actually does. */
  action: string;
  /** The KIND of canonical evidence that satisfies the stage. */
  evidenceKind: LearningEvidenceKind;
  /** TRUE for the ONE gate stage (VALIDATE). */
  gate: boolean;
}

export const LEARNING_STAGES: Record<LearningStageId, LearningStageDefinition> = {
  learn: {
    id: 'learn',
    label: 'Learn',
    meaning: 'Understand the concept from the canonical Knowledge Base article.',
    action: 'Read the article.',
    evidenceKind: 'article_read',
    gate: false,
  },
  watch: {
    id: 'watch',
    label: 'Watch',
    meaning: 'See the real screen performed in the canonical guided tour.',
    action: 'Complete the guided tour.',
    evidenceKind: 'tour_completed',
    gate: false,
  },
  do: {
    id: 'do',
    label: 'Do',
    meaning: 'Perform the real action in the product — not a simulation of it.',
    action: 'Perform the step in the live product.',
    evidenceKind: 'action_performed',
    gate: false,
  },
  validate: {
    id: 'validate',
    label: 'Validate',
    meaning: 'Prove the brand can actually do the step. A click is not proof.',
    action: 'Pass the validation gate with a real signal.',
    evidenceKind: 'validation_passed',
    gate: true,
  },
  complete: {
    id: 'complete',
    label: 'Complete',
    meaning: 'The topic is closed — reached only once validation is satisfied.',
    action: 'Nothing — this stage is reached automatically.',
    evidenceKind: 'closure',
    gate: false,
  },
};

/* ── 2. The pinned invariants (a comment cannot guarantee these) ──────────── */

/** A topic is NEVER complete from a click; VALIDATE needs a real signal. */
export const VALIDATE_REQUIRES_EVIDENCE = true;

/** A stage cannot begin before every earlier stage is done. */
export const STAGES_ARE_SEQUENTIAL = true;

/** The loop is deterministic — no AI, no clock, no randomness, no network. */
export const LEARNING_LOOP_IS_DETERMINISTIC = true;

/** The ONE gate stage. */
export const LEARNING_GATE_STAGE: LearningStageId = 'validate';

/* ── 3. The topics — DERIVED from the canonical educational gaps ──────────── */

/**
 * The canonical LEARN article and WATCH tour for each educational gap. This
 * adds ONLY the two source references the gap records do not carry; the topic
 * list itself is DERIVED from `PRE_AUDIT_EDUCATIONAL_GAPS`, so the two cannot
 * drift. Every id below is a real id in its canonical owner (`KB_ARTICLES` /
 * `TOUR_REGISTRY`), asserted by the gate.
 */
export interface LearningSource {
  articleId: string;
  tourId: string;
}

export const GAP_LEARNING_SOURCE: Record<PreAuditEducationalGapId, LearningSource> = {
  wholesale_cost_price: { articleId: 'kb-catalog', tourId: 'catalog' },
  moq: { articleId: 'kb-catalog', tourId: 'catalog' },
  case_pack: { articleId: 'kb-catalog', tourId: 'catalog' },
  master_carton: { articleId: 'kb-catalog', tourId: 'catalog' },
  sellable_unit: { articleId: 'kb-catalog', tourId: 'catalog' },
  packaging_hierarchy: { articleId: 'kb-catalog', tourId: 'catalog' },
  labelling: { articleId: 'kb-catalog', tourId: 'catalog' },
  product_identifiers: { articleId: 'kb-catalog', tourId: 'catalog' },
  dimensions_weight: { articleId: 'kb-catalog', tourId: 'catalog' },
  product_images: { articleId: 'kb-catalog', tourId: 'catalog' },
  compliance_documentation: { articleId: 'kb-compliance', tourId: 'compliance' },
  category_requirements: { articleId: 'kb-compliance', tourId: 'compliance' },
  purchase_orders: { articleId: 'kb-purchase-orders', tourId: 'po-acknowledgment' },
  po_acknowledgement: { articleId: 'kb-purchase-orders', tourId: 'po-acknowledgment' },
  shipping_fulfilment: { articleId: 'kb-shipments', tourId: 'shipping' },
  invoices_payments: { articleId: 'kb-guidance', tourId: 'billing' },
  returns_deductions: { articleId: 'kb-guidance', tourId: 'deductions' },
};

export interface LearningTopic {
  /** The canonical educational-gap id — the SAME id the Academy seam uses. */
  id: PreAuditEducationalGapId;
  label: string;
  /** REUSES the Phase-4 academy seam (`ukMarketFit` / `commercialReadiness`). */
  academyStage: 1 | 2 | 3 | 4 | 5;
  /** The canonical LEARN article. */
  articleId: string;
  /** The canonical WATCH tour. */
  tourId: string;
}

/** DERIVED from the canonical gaps — never a second, hand-maintained list. */
export const LEARNING_TOPICS: readonly LearningTopic[] = PRE_AUDIT_EDUCATIONAL_GAPS.map((gap) => ({
  id: gap.id,
  label: gap.label,
  academyStage: gap.academyStage,
  articleId: GAP_LEARNING_SOURCE[gap.id].articleId,
  tourId: GAP_LEARNING_SOURCE[gap.id].tourId,
}));

/* ── 4. The labelled DEMO signals ─────────────────────────────────────────── */

/** The topic the founder surface illustrates the loop with. */
export const DEMO_LEARNING_TOPIC_ID: PreAuditEducationalGapId = 'moq';

/**
 * A LABELLED DEMO signal set: the brand has read the article, watched the tour
 * and performed the action, but has NOT yet passed validation — so the loop
 * stands at VALIDATE and is NOT complete. This is the honest illustration of the
 * rule that a topic is never closed merely because the brand acted.
 */
export const DEMO_LEARNING_SIGNALS = {
  articleRead: true,
  tourCompleted: true,
  actionPerformed: true,
  validationPassed: false,
} as const;

/* ── 5. The rules, the basis and the refusals, stated once ────────────────── */

export const LEARNING_LOOP_RULES: readonly string[] = [
  'A topic is complete ONLY once its VALIDATE stage is satisfied by a real signal — never by the brand asserting it is done.',
  'A stage cannot begin before every earlier stage is done.',
  'LEARN and WATCH reuse the canonical Knowledge Base article and the canonical guided tour; there is no second content owner.',
  'The loop is deterministic — no AI, no clock, no randomness, no network.',
  'A validation signal that arrives before the action is performed is REFUSED (fail closed).',
] as const;

export const LEARNING_LOOP_REFUSALS = {
  unknownTopic: 'LEARNING_TOPIC_UNKNOWN — that topic is not one the loop declares, so it holds no stage.',
  validationWithoutAction:
    'VALIDATION_WITHOUT_ACTION — validation cannot be satisfied before the step has actually been performed.',
} as const;

export const LEARNING_LOOP_BASIS =
  'The brand learning loop runs LEARN → WATCH → DO → VALIDATE → COMPLETE over the canonical educational gaps. LEARN reads the canonical Knowledge Base article, WATCH completes the canonical guided tour, DO performs the real action, and VALIDATE is a GATE satisfied only by a real signal — a topic is never complete merely because the brand said so.';

export const LEARNING_LOOP_DISCLAIMER =
  'The loop tracks a brand’s education progress; it never changes a brand’s commercial model, compliance or settlement, and it is deterministic — no AI, no clock.';

/* ── 6. Module-load guards (fail closed) ─────────────────────────────────── */

if (LEARNING_STAGE_ORDER.length !== 5) {
  throw new Error('[learningLoop] the loop must declare exactly five stages');
}
if (LEARNING_STAGE_ORDER.filter((id) => LEARNING_STAGES[id].gate).length !== 1) {
  throw new Error('[learningLoop] exactly ONE stage must be the gate');
}
if (LEARNING_STAGES[LEARNING_GATE_STAGE].gate !== true) {
  throw new Error('[learningLoop] the declared gate stage must be a gate');
}
for (const gap of PRE_AUDIT_EDUCATIONAL_GAPS) {
  const src = GAP_LEARNING_SOURCE[gap.id];
  if (!src || !src.articleId || !src.tourId) {
    throw new Error(`[learningLoop] gap "${gap.id}" has no canonical learning source`);
  }
}
if (LEARNING_TOPICS.length !== PRE_AUDIT_EDUCATIONAL_GAPS.length) {
  throw new Error('[learningLoop] the topic list must cover every canonical educational gap');
}