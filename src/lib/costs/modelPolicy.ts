/**
 * §27 (M13 Phase 10) + PHASE 1 — MERCENTA RUNTIME MODEL POLICY (FREE-ONLY).
 *
 * Hard rule (founder directive, Phase 1): the Mercenta PLATFORM RUNTIME may ONLY
 * use FREE models. There is NO paid-model fallback and NO silent paid upgrade.
 * This is the platform's runtime policy — it says nothing about the model used
 * to BUILD the software.
 *
 * This module is the only place a runtime model id is chosen, and it prefers the
 * cheapest thing that can do the job:
 *
 *   1. deterministic code / rules  (no model at all)
 *   2. a cached result             (no call)
 *   3. local / database computation
 *   4. an approved FREE model, when eligible
 *   5. otherwise REFUSED — a paid model is never an option
 *
 * A task that needs something more capable than the approved free model is
 * REFUSED (`refused: true`) rather than upgraded to a paid model. This is the
 * PLATFORM's policy — it says nothing about the model used to BUILD the
 * software.
 */
import { COST_MODEL_INPUTS } from '@/config/operatingCosts';

/** Free models eligible for the Mercenta runtime. Nothing else may ever be called. */
export const FREE_RUNTIME_MODELS = [
  'deepseek/deepseek-v4-flash:free',
] as const;

export type RuntimeTier = 'deterministic' | 'cache' | 'local' | 'free_model' | 'paid_max';

export interface RuntimeTaskSpec {
  /** Stable id used for the usage log and prompt de-duplication. */
  id: string;
  description: string;
  /** True when deterministic code can answer this (no model call at all). */
  deterministic: boolean;
  /** True when the answer can be cached/deduplicated across runs. */
  cacheable: boolean;
  /** True when the answer can be computed locally from stored data. */
  locallyComputable: boolean;
  /** True when a free model is good enough. */
  freeModelSufficient: boolean;
  /** Estimated output tokens — used for the per-operation budget check. */
  estimatedTokens: number;
  /** Estimated GBP per call for the paid tier. */
  estimatedCostGbp: number;
}

export interface RuntimeModelDecision {
  taskId: string;
  tier: RuntimeTier;
  model: string | null;
  estimatedCostGbp: number;
  /** True when no model call may be made. */
  refused: boolean;
  reason: string;
}

/**
 * Deterministic task catalogue. Adding a task here (rather than calling a model
 * ad hoc) is what keeps the runtime cheap and auditable.
 */
export const RUNTIME_TASKS: Record<string, RuntimeTaskSpec> = {
  discovery_fit_scoring: {
    id: 'discovery_fit_scoring',
    description: 'Score a discovery lead against Mercenta’s ICP with one line of evidence.',
    deterministic: false,
    cacheable: true,
    locallyComputable: false,
    freeModelSufficient: false,
    estimatedTokens: 300,
    estimatedCostGbp: 0.0006,
  },
  alert_triage_summary: {
    id: 'alert_triage_summary',
    description: 'Summarise a monitoring alert into a short operator note.',
    deterministic: false,
    cacheable: true,
    locallyComputable: false,
    freeModelSufficient: false,
    estimatedTokens: 400,
    estimatedCostGbp: 0.0008,
  },
  estimated_sales_narrative: {
    id: 'estimated_sales_narrative',
    description: 'Explain an ASIN sales estimate in one sentence.',
    deterministic: true,
    cacheable: true,
    locallyComputable: true,
    freeModelSufficient: true,
    estimatedTokens: 150,
    estimatedCostGbp: 0.0003,
  },
  /**
   * §Founder OS — the OPTIONAL narrative on top of the deterministic founder
   * brief. The facts are always computed locally; only the prose is a model
   * call, it is cached, and a free model is sufficient. Without a credential the
   * task is refused and the brief is still complete.
   */
  founder_brief_narrative: {
    id: 'founder_brief_narrative',
    description: 'Summarise the deterministic founder brief facts in a short narrative.',
    deterministic: false,
    cacheable: true,
    locallyComputable: false,
    freeModelSufficient: true,
    estimatedTokens: 400,
    estimatedCostGbp: 0.0008,
  },
  /** §Founder OS — rephrase an "Ask Mercenta" answer that is already computed. */
  founder_ask_answer: {
    id: 'founder_ask_answer',
    description: 'Rephrase an already-computed canonical answer to a founder question.',
    deterministic: false,
    cacheable: true,
    locallyComputable: false,
    freeModelSufficient: true,
    estimatedTokens: 300,
    estimatedCostGbp: 0.0006,
  },
};

/** Per-operation budget from the single source of truth. */
export function perOperationBudgetGbp(): number {
  return COST_MODEL_INPUTS.find((i) => i.id === 'ai_cost_per_operation_budget_gbp')?.value ?? 0.02;
}

/**
 * Choose the cheapest tier that can do the task. A task whose estimated cost
 * exceeds the per-operation budget is REFUSED (never silently upgraded).
 */
export function selectRuntimeModel(spec: RuntimeTaskSpec): RuntimeModelDecision {
  const budget = perOperationBudgetGbp();
  if (spec.deterministic) {
    return {
      taskId: spec.id,
      tier: 'deterministic',
      model: null,
      estimatedCostGbp: 0,
      refused: false,
      reason: 'Deterministic code answers this — no model call is made.',
    };
  }
  if (spec.estimatedCostGbp > budget && !spec.freeModelSufficient) {
    return {
      taskId: spec.id,
      tier: 'free_model',
      model: null,
      estimatedCostGbp: spec.estimatedCostGbp,
      refused: true,
      reason: `The estimated cost (£${spec.estimatedCostGbp}) exceeds the per-operation budget (£${budget}). Refused rather than upgrading to a more expensive model.`,
    };
  }
  if (spec.locallyComputable) {
    return {
      taskId: spec.id,
      tier: 'local',
      model: null,
      estimatedCostGbp: 0,
      refused: false,
      reason: 'Computed locally from stored data.',
    };
  }
  if (spec.freeModelSufficient) {
    return {
      taskId: spec.id,
      tier: 'free_model',
      model: FREE_RUNTIME_MODELS[0],
      estimatedCostGbp: 0,
      refused: false,
      reason: 'An approved free model is sufficient for this task.',
    };
  }
  return {
    taskId: spec.id,
    tier: 'free_model',
    model: null,
    estimatedCostGbp: 0,
    refused: true,
    reason: 'No approved free model is sufficient for this task and the Mercenta runtime policy permits ONLY free models — refused (no paid fallback).',
  };
}

/** Convenience: select by task id, refusing an unknown task (fail-closed). */
export function selectRuntimeModelForTask(taskId: string): RuntimeModelDecision {
  const spec = RUNTIME_TASKS[taskId];
  if (!spec) {
    return {
      taskId,
      tier: 'free_model',
      model: null,
      estimatedCostGbp: 0,
      refused: true,
      reason: `"${taskId}" is not a declared runtime task — refusing to guess a model.`,
    };
  }
  return selectRuntimeModel(spec);
}

/** Guard used by every runtime call site: only FREE models (or no model) are allowed. */
export function isModelAllowed(model: string | null): boolean {
  if (model === null) return true;
  return (FREE_RUNTIME_MODELS as readonly string[]).includes(model);
}