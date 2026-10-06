/**
 * §PHASE 5 — THE SHARED WORKFLOW RESOLVER — the pure rules over the ONE owner.
 *
 * The owner (`src/config/sharedWorkflows.ts`) declares the canonical workflows;
 * this module applies them. It is PURE and DETERMINISTIC: no clock, no
 * randomness, no network, no AI, no filesystem.
 *
 * THE RULES IT ENFORCES:
 *   · the steps of a workflow are DERIVED from the canonical guided tour, so
 *     there is no second, hand-maintained list of steps — and the anchors it
 *     exposes are the SAME `data-tour` selectors a Playwright test drives;
 *   · ONE automation supports all three consumers (onboarding walkthrough,
 *     tutorial recording, E2E test), so the three can never describe the same
 *     journey differently;
 *   · an UNKNOWN workflow id is REFUSED (fail closed) — no workflow is guessed;
 *   · a workflow that points at a guided tour which does not exist is REFUSED
 *     (fail closed) rather than shown as if it worked.
 */
import { getKnowledgeArticle } from '@/data/knowledgeBase';
import { TOUR_REGISTRY } from '@/config/tours/tourDefinitions';
import {
  SHARED_WORKFLOWS,
  SHARED_WORKFLOW_BASIS,
  SHARED_WORKFLOW_DISCLAIMER,
  ONE_WORKFLOW_OWNER,
  WORKFLOWS_MAP_TO_REAL_E2E_SPECS,
  WORKFLOWS_REUSE_CANONICAL_TOURS,
  WORKFLOW_CONSUMERS,
  WORKFLOW_CONSUMER_LABELS,
  type SharedWorkflowDefinition,
  type WorkflowConsumer,
} from '@/config/sharedWorkflows';

export type SharedWorkflowRefusal = 'WORKFLOW_UNKNOWN' | 'WORKFLOW_TOUR_MISSING';

/** One real step of the journey, DERIVED from the canonical tour. */
export interface ResolvedWorkflowStep {
  id: string;
  title: string;
  /** The shared anchor contract — the `data-tour` selector a test also drives. */
  anchor: string;
}

export interface ResolvedSharedWorkflow {
  id: string;
  label: string;
  description: string;
  tourId: string;
  tourName: string;
  e2eSpec: string;
  articleId: string;
  articleTitle: string;
  /** DERIVED from the canonical tour — never a second list. */
  steps: ResolvedWorkflowStep[];
  stepCount: number;
  /** The consumers that share this ONE automation. */
  consumers: WorkflowConsumer[];
  refused: SharedWorkflowRefusal | null;
}

/** The refusal object for a workflow that cannot be shown. */
function refusal(id: string, code: SharedWorkflowRefusal): ResolvedSharedWorkflow {
  return {
    id,
    label: '',
    description: '',
    tourId: '',
    tourName: '',
    e2eSpec: '',
    articleId: '',
    articleTitle: '',
    steps: [],
    stepCount: 0,
    consumers: [...WORKFLOW_CONSUMERS],
    refused: code,
  };
}

/** The canonical workflow for an id, or null (fail closed). */
export function findSharedWorkflow(id: string | null | undefined): SharedWorkflowDefinition | null {
  if (typeof id !== 'string' || id.length === 0) return null;
  return SHARED_WORKFLOWS.find((w) => w.id === id) ?? null;
}

/**
 * Resolve ONE workflow against the canonical tour registry + Knowledge Base.
 * Exported so the gate can exercise the fail-closed branch directly (a workflow
 * whose tour does not exist must be REFUSED, not shown).
 */
export function resolveSharedWorkflowDefinition(def: SharedWorkflowDefinition): ResolvedSharedWorkflow {
  const tour = TOUR_REGISTRY[def.tourId];
  if (!tour) return refusal(def.id, 'WORKFLOW_TOUR_MISSING');
  const article = getKnowledgeArticle(def.kbArticleId);
  const steps: ResolvedWorkflowStep[] = tour.steps.map((s) => ({
    id: s.id,
    title: s.title,
    anchor: s.targetSelector,
  }));
  return {
    id: def.id,
    label: def.label,
    description: def.description,
    tourId: tour.id,
    tourName: tour.name,
    e2eSpec: def.e2eSpec,
    articleId: def.kbArticleId,
    articleTitle: article?.title ?? '',
    steps,
    stepCount: steps.length,
    consumers: [...WORKFLOW_CONSUMERS],
    refused: null,
  };
}

/**
 * Resolve a canonical workflow by id.
 *
 * FAIL CLOSED: an unknown workflow id is REFUSED (`WORKFLOW_UNKNOWN`) and the
 * result carries no steps — the caller shows nothing rather than a guess.
 */
export function resolveSharedWorkflow(id: string): ResolvedSharedWorkflow {
  const def = findSharedWorkflow(id);
  if (!def) return refusal(id, 'WORKFLOW_UNKNOWN');
  return resolveSharedWorkflowDefinition(def);
}

/* ── The labelled DEMO workflow ──────────────────────────────────────────── */

/** The workflow the founder surface illustrates with — resolved live, never retyped. */
export const DEMO_WORKFLOW_ID = 'acknowledge-a-purchase-order';

/* ── The founder-facing summary ──────────────────────────────────────────── */

export interface SharedWorkflowSummary {
  /** The three consumers that share ONE automation. */
  consumers: { id: WorkflowConsumer; label: string }[];
  consumerCount: number;
  /** Every declared workflow, with its derived steps and its canonical links. */
  workflows: {
    id: string;
    label: string;
    description: string;
    tourId: string;
    tourName: string;
    e2eSpec: string;
    articleTitle: string;
    stepCount: number;
    anchors: string[];
  }[];
  workflowCount: number;
  /** A labelled DEMO workflow, resolved from the owner — never retyped. */
  demo: {
    id: string;
    label: string;
    stepCount: number;
    anchors: string[];
    consumerCount: number;
  } | null;
  oneOwner: boolean;
  reuseCanonicalTours: boolean;
  mapToRealE2eSpecs: boolean;
  basis: string;
  disclaimer: string;
}

/** Summarise the shared workflows for the founder surface. Derived, never retyped. */
export function buildSharedWorkflowSummary(): SharedWorkflowSummary {
  const workflows = SHARED_WORKFLOWS.map((def) => {
    const r = resolveSharedWorkflowDefinition(def);
    return {
      id: r.id,
      label: r.label,
      description: r.description,
      tourId: r.tourId,
      tourName: r.tourName,
      e2eSpec: r.e2eSpec,
      articleTitle: r.articleTitle,
      stepCount: r.stepCount,
      anchors: r.steps.map((s) => s.anchor),
    };
  });

  const demo = resolveSharedWorkflow(DEMO_WORKFLOW_ID);

  return {
    consumers: WORKFLOW_CONSUMERS.map((id) => ({ id, label: WORKFLOW_CONSUMER_LABELS[id] })),
    consumerCount: WORKFLOW_CONSUMERS.length,
    workflows,
    workflowCount: workflows.length,
    demo: demo.refused
      ? null
      : {
          id: demo.id,
          label: demo.label,
          stepCount: demo.stepCount,
          anchors: demo.steps.map((s) => s.anchor),
          consumerCount: demo.consumers.length,
        },
    oneOwner: ONE_WORKFLOW_OWNER,
    reuseCanonicalTours: WORKFLOWS_REUSE_CANONICAL_TOURS,
    mapToRealE2eSpecs: WORKFLOWS_MAP_TO_REAL_E2E_SPECS,
    basis: SHARED_WORKFLOW_BASIS,
    disclaimer: SHARED_WORKFLOW_DISCLAIMER,
  };
}
