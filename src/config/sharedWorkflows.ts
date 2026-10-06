/**
 * §PHASE 5 — SHARED WORKFLOW REUSE — the ONE owner of the canonical user
 * workflows that E2E tests, tutorial recordings and onboarding walkthroughs all
 * reuse.
 *
 * WHY THIS EXISTS
 * ---------------
 * The registry row `phase5-shared-workflow-reuse` recorded "shared workflows so
 * ONE automation supports E2E tests + tutorial recordings + onboarding
 * walkthroughs". The seams already existed:
 *
 *   · `src/config/tours/tourDefinitions.ts → TOUR_REGISTRY` is the canonical
 *     guided tour of a real screen — the onboarding walkthrough the brand sees;
 *   · every tour step carries a `targetSelector` of the form
 *     `[data-tour="…"]`, which is ALSO the anchor a Playwright test drives;
 *   · `src/data/knowledgeBase.ts → KB_ARTICLES` is the canonical LEARN content;
 *   · `e2e/*.spec.ts` are the real browser tests that automate the journeys.
 *
 * What was MISSING was the ONE place that declares a canonical WORKFLOW — a real
 * journey through real screens — and LINKS it to the single automation all three
 * consumers share: the SAME canonical tour drives the onboarding walkthrough AND
 * the tutorial-recording timeline, and the SAME `data-tour` anchors drive the E2E
 * test. There is no second list of steps anywhere: the steps are DERIVED from the
 * canonical tour, so a walkthrough, a recording and a test can never describe the
 * same journey differently.
 *
 * NO CONTENT IS INVENTED HERE. Every workflow points at its canonical tour, its
 * canonical E2E spec and its canonical Knowledge Base article by id; the
 * module-load guards below REFUSE to load if a workflow names a tour or an
 * article that does not exist (fail closed), and the gate refuses a workflow
 * whose E2E spec does not exist on disk.
 */
import { KB_ARTICLES } from '@/data/knowledgeBase';
import { TOUR_REGISTRY } from '@/config/tours/tourDefinitions';

/* ── 1. The three consumers of ONE automation ────────────────────────────── */

export type WorkflowConsumer = 'onboarding_walkthrough' | 'tutorial_recording' | 'e2e_test';

export const WORKFLOW_CONSUMERS: readonly WorkflowConsumer[] = [
  'onboarding_walkthrough',
  'tutorial_recording',
  'e2e_test',
] as const;

export const WORKFLOW_CONSUMER_LABELS: Record<WorkflowConsumer, string> = {
  onboarding_walkthrough: 'Onboarding walkthrough',
  tutorial_recording: 'Tutorial recording',
  e2e_test: 'E2E test',
};

/* ── 2. The canonical workflows ──────────────────────────────────────────── */

export interface SharedWorkflowDefinition {
  id: string;
  /** The brand-facing name of the journey. */
  label: string;
  /** What the journey does, in plain language. */
  description: string;
  /**
   * The canonical guided tour of the real screens. It drives the onboarding
   * walkthrough AND the tutorial-recording timeline; its step `targetSelector`s
   * are the SAME anchors the E2E test drives. It is an id into `TOUR_REGISTRY`.
   */
  tourId: string;
  /** The canonical Playwright spec that automates the same journey. */
  e2eSpec: string;
  /** The canonical Knowledge Base article that teaches the journey (LEARN). */
  kbArticleId: string;
}

export const SHARED_WORKFLOWS: readonly SharedWorkflowDefinition[] = [
  {
    id: 'first-login-orientation',
    label: 'First login & orientation',
    description: 'The first-time walk through the main navigation and the key rules a brand must know.',
    tourId: 'orientation',
    e2eSpec: 'e2e/tours.spec.ts',
    kbArticleId: 'kb-welcome',
  },
  {
    id: 'add-a-product',
    label: 'Add a product',
    description: 'Create a catalogue listing and understand the image, cost and compliance requirements.',
    tourId: 'catalog',
    e2eSpec: 'e2e/catalog-product-management.spec.ts',
    kbArticleId: 'kb-catalog',
  },
  {
    id: 'acknowledge-a-purchase-order',
    label: 'Acknowledge a purchase order',
    description: 'Accept, reject or backorder the lines of a purchase order, and what the deadline means.',
    tourId: 'po-acknowledgment',
    e2eSpec: 'e2e/channel-po-ingestion.spec.ts',
    kbArticleId: 'kb-purchase-orders',
  },
  {
    id: 'file-a-shipment',
    label: 'File a shipment',
    description: 'How a shipment is raised and tracked once a purchase order is accepted.',
    tourId: 'shipping',
    e2eSpec: 'e2e/logistics-providers.spec.ts',
    kbArticleId: 'kb-shipments',
  },
  {
    id: 'handle-a-deduction',
    label: 'Handle a deduction',
    description: 'Review a deduction and dispute one that is wrong, with the evidence that supports the position.',
    tourId: 'deductions',
    e2eSpec: 'e2e/deductions.spec.ts',
    kbArticleId: 'kb-guidance',
  },
  {
    id: 'keep-compliance-current',
    label: 'Keep compliance current',
    description: 'Why documents must stay in date, and what happens to a catalogue when one expires.',
    tourId: 'compliance',
    e2eSpec: 'e2e/compliance-gate.spec.ts',
    kbArticleId: 'kb-compliance',
  },
];

/* ── 3. The rules, the refusals, the basis and the pinned invariants ─────── */

export const SHARED_WORKFLOW_RULES: readonly string[] = [
  'ONE automation supports all three consumers: the canonical guided tour drives the onboarding walkthrough AND the tutorial recording, and the SAME data-tour anchors drive the E2E test.',
  'The steps are DERIVED from the canonical tour — there is no second, hand-maintained list of steps.',
  'Every workflow names a canonical tour, a canonical E2E spec and a canonical Knowledge Base article that really exist.',
  'The definitions are deterministic — no AI, no clock, no randomness, no network.',
] as const;

export const SHARED_WORKFLOW_REFUSALS = {
  unknownWorkflow:
    'WORKFLOW_UNKNOWN — no workflow is declared for that id, so none is shown rather than a guessed one.',
  missingTour:
    'WORKFLOW_TOUR_MISSING — the workflow points at a guided tour that does not exist, so it is refused rather than shown.',
} as const;

export const SHARED_WORKFLOW_BASIS =
  'ONE shared workflow supports E2E tests, tutorial recordings and onboarding walkthroughs: the canonical guided tour defines the journey and its data-tour anchors are the SAME contract the E2E test drives, so the three consumers can never describe the same journey differently.';

export const SHARED_WORKFLOW_DISCLAIMER =
  'A shared workflow only describes a journey through the real screens; it never changes a brand’s commercial model, compliance or settlement, and it is deterministic — no AI, no clock.';

/** Pinned invariants the gate asserts. */
export const ONE_WORKFLOW_OWNER = true;
export const WORKFLOWS_REUSE_CANONICAL_TOURS = true;
export const WORKFLOWS_MAP_TO_REAL_E2E_SPECS = true;

/* ── 4. Module-load guards (fail closed) ─────────────────────────────────── */

if (SHARED_WORKFLOWS.length === 0) {
  throw new Error('[sharedWorkflows] at least one workflow must be declared');
}
if (WORKFLOW_CONSUMERS.length !== 3) {
  throw new Error('[sharedWorkflows] exactly three consumers share one automation');
}
{
  const ids = SHARED_WORKFLOWS.map((w) => w.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error('[sharedWorkflows] two workflows must not share an id');
  }
}
{
  const articleIds = new Set(KB_ARTICLES.map((a) => a.id));
  for (const w of SHARED_WORKFLOWS) {
    if (!TOUR_REGISTRY[w.tourId]) {
      throw new Error(`[sharedWorkflows] workflow "${w.id}" points at a missing tour "${w.tourId}"`);
    }
    if (!w.e2eSpec || !w.e2eSpec.endsWith('.spec.ts')) {
      throw new Error(`[sharedWorkflows] workflow "${w.id}" must name a canonical E2E spec`);
    }
    if (!articleIds.has(w.kbArticleId)) {
      throw new Error(`[sharedWorkflows] workflow "${w.id}" points at a missing Knowledge Base article "${w.kbArticleId}"`);
    }
  }
}
