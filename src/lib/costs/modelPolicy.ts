/**
 * §27 (M13 Phase 10) — MERCENTA RUNTIME MODEL POLICY.
 *
 * Hard rule: the platform's MAXIMUM paid runtime model is DeepSeek V4 Flash.
 * This module is the only place a runtime model id is chosen, and it prefers the
 * cheapest thing that can do the job:
 *
 *   1. deterministic code / rules  (no model at all)
 *   2. a cached result             (no call)
 *   3. local / database computation
 *   4. a free model, when eligible
 *   5. DeepSeek V4 Flash — the most expensive model Mercenta may use
 *
 * A task that would REQUIRE something more capable than the maximum is REFUSED
 * (`refused: true`) rather than silently upgraded to a costlier model. This is
 * the PLATFORM's policy — it says nothing about the model used to BUILD the
 * software.
 */
import { COST_MODEL_INPUTS } from '@/config/operatingCosts';

/** The maximum paid runtime model. Nothing more expensive may ever be selected. */
export const MAX_PAID_RUNTIME_MODEL = 'deepseek/deepseek-v4-flash' as const;

/** Free models that are eligible for the cheap tier. */
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
      tier: 'paid_max',
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
      reason: 'A free model is sufficient for this task.',
    };
  }
  return {
    taskId: spec.id,
    tier: 'paid_max',
    model: MAX_PAID_RUNTIME_MODEL,
    estimatedCostGbp: spec.estimatedCostGbp,
    refused: false,
    reason: 'DeepSeek V4 Flash — the maximum paid runtime model Mercenta may use.',
  };
}

/** Convenience: select by task id, refusing an unknown task (fail-closed). */
export function selectRuntimeModelForTask(taskId: string): RuntimeModelDecision {
  const spec = RUNTIME_TASKS[taskId];
  if (!spec) {
    return {
      taskId,
      tier: 'paid_max',
      model: null,
      estimatedCostGbp: 0,
      refused: true,
      reason: `"${taskId}" is not a declared runtime task — refusing to guess a model.`,
    };
  }
  return selectRuntimeModel(spec);
}

/** Guard used by every runtime call site: a costlier model can never be chosen. */
export function isModelAllowed(model: string | null): boolean {
  if (model === null) return true;
  return model === MAX_PAID_RUNTIME_MODEL || (FREE_RUNTIME_MODELS as readonly string[]).includes(model);
}