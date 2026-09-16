/**
 * §27 (M13 Phase 10) — runtime AI usage log + cost protection.
 *
 * Every runtime model call passes through here: it is recorded (model, task,
 * tokens, estimated cost, timestamp, entity, cache hit/miss, result status) and
 * it is REFUSED when a configured ceiling would be exceeded. No API key is ever
 * held or logged — the caller supplies its own credential.
 *
 * The log is in-memory for the demo session (the live seam is the same optional
 * Supabase dual-write used elsewhere). Nothing here fabricates live billing data:
 * costs are ESTIMATES derived from the model policy.
 */
import { AI_SPEND_CEILINGS } from '@/config/operatingCosts';
import { selectRuntimeModelForTask, type RuntimeModelDecision } from './modelPolicy';

export type AiCallStatus = 'ok' | 'error' | 'refused_budget' | 'cache_hit' | 'handled_without_model';

export interface AiUsageEntry {
  id: string;
  at: string;
  taskId: string;
  model: string | null;
  tier: RuntimeModelDecision['tier'];
  tokens: number;
  estimatedCostGbp: number;
  entity?: string;
  cache: 'hit' | 'miss';
  status: AiCallStatus;
  note?: string;
}

const entries: AiUsageEntry[] = [];
let seq = 0;

export function resetAiUsageLog(): void {
  entries.length = 0;
  seq = 0;
}

export function aiUsageEntries(): AiUsageEntry[] {
  return entries;
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

/** Spend so far today / this month, from the log itself. */
export function spendToday(now = new Date()): number {
  const key = dayKey(now.toISOString());
  return entries.filter((e) => dayKey(e.at) === key).reduce((sum, e) => sum + e.estimatedCostGbp, 0);
}

export function spendThisMonth(now = new Date()): number {
  const key = monthKey(now.toISOString());
  return entries.filter((e) => monthKey(e.at) === key).reduce((sum, e) => sum + e.estimatedCostGbp, 0);
}

export type CostProtectionState = 'normal' | 'warning' | 'exceeded';

/**
 * §27 — the cost-protection state. `exceeded` means non-essential AI calls are
 * REFUSED until the founder raises the ceiling.
 */
export function costProtectionState(now = new Date()): {
  state: CostProtectionState;
  reason: string;
  dailySpendGbp: number;
  monthlySpendGbp: number;
  monthlyRemainingGbp: number;
} {
  const dailySpendGbp = spendToday(now);
  const monthlySpendGbp = spendThisMonth(now);
  const monthlyRemainingGbp = Math.max(0, AI_SPEND_CEILINGS.monthlyGbp - monthlySpendGbp);
  if (monthlySpendGbp >= AI_SPEND_CEILINGS.monthlyGbp || dailySpendGbp >= AI_SPEND_CEILINGS.dailyGbp) {
    return {
      state: 'exceeded',
      reason: `Ceiling reached (monthly £${monthlySpendGbp.toFixed(2)}/£${AI_SPEND_CEILINGS.monthlyGbp}, daily £${dailySpendGbp.toFixed(2)}/£${AI_SPEND_CEILINGS.dailyGbp}). Non-essential AI calls are refused.`,
      dailySpendGbp,
      monthlySpendGbp,
      monthlyRemainingGbp,
    };
  }
  if (monthlySpendGbp >= AI_SPEND_CEILINGS.monthlyGbp * AI_SPEND_CEILINGS.warningShare) {
    return {
      state: 'warning',
      reason: `Above ${Math.round(AI_SPEND_CEILINGS.warningShare * 100)}% of the monthly AI ceiling.`,
      dailySpendGbp,
      monthlySpendGbp,
      monthlyRemainingGbp,
    };
  }
  return {
    state: 'normal',
    reason: 'Within the configured AI ceilings.',
    dailySpendGbp,
    monthlySpendGbp,
    monthlyRemainingGbp,
  };
}

export interface AiCallRequest {
  taskId: string;
  entity?: string;
  /** A previously computed result may be reused (prompt de-duplication). */
  cachedResultAvailable?: boolean;
  /** Essential calls may still run at the warning level (never when exceeded). */
  essential?: boolean;
  tokens?: number;
  now?: Date;
}

export interface AiCallDecision {
  allowed: boolean;
  decision: RuntimeModelDecision;
  reason: string;
  status: AiCallStatus;
  /** Where the caller should read the value from when the call is refused. */
  fallback: 'deterministic' | 'cached' | 'none';
}

/**
 * Authorise a runtime AI call. Records the attempt in the usage log and refuses
 * it when the policy or the ceiling forbids it — the call site must then fall
 * back rather than proceed.
 */
export function authoriseAiCall(request: AiCallRequest): AiCallDecision {
  const now = request.now ?? new Date();
  const decision = selectRuntimeModelForTask(request.taskId);
  const protection = costProtectionState(now);
  const record = (status: AiCallStatus, tokens: number, reason: string, cost: number) => {
    seq += 1;
    entries.push({
      id: `ai-${seq}`,
      at: now.toISOString(),
      taskId: request.taskId,
      model: decision.model,
      tier: decision.tier,
      tokens,
      estimatedCostGbp: cost,
      entity: request.entity,
      cache: request.cachedResultAvailable ? 'hit' : 'miss',
      status,
      note: reason,
    });
  };

  if (request.cachedResultAvailable) {
    record('cache_hit', 0, 'Cached result reused — no model call made.', 0);
    return { allowed: false, decision, reason: 'Cached result reused.', status: 'cache_hit', fallback: 'cached' };
  }
  if (decision.refused || decision.model === null) {
    // A deterministic/local task is HANDLED WITHOUT A MODEL — that is not a
    // budget refusal, and the log must not confuse the two.
    const withoutModel = decision.tier === 'deterministic' || decision.tier === 'local';
    record(withoutModel ? 'handled_without_model' : 'refused_budget', 0, decision.reason, 0);
    return {
      allowed: false,
      decision,
      reason: decision.reason,
      status: withoutModel ? 'handled_without_model' : 'refused_budget',
      fallback: withoutModel ? 'deterministic' : 'none',
    };
  }
  if (protection.state === 'exceeded' && !request.essential) {
    record('refused_budget', 0, protection.reason, 0);
    return { allowed: false, decision, reason: protection.reason, status: 'refused_budget', fallback: 'none' };
  }
  record('ok', request.tokens ?? 0, 'Authorised by the runtime model policy.', decision.estimatedCostGbp);
  return { allowed: true, decision, reason: decision.reason, status: 'ok', fallback: 'none' };
}

/** Record the real outcome/tokens of an authorised call once it returns. */
export function recordAiCallOutcome(input: {
  taskId: string;
  tokens: number;
  status: 'ok' | 'error';
  note?: string;
  now?: Date;
}): void {
  seq += 1;
  entries.push({
    id: `ai-${seq}`,
    at: (input.now ?? new Date()).toISOString(),
    taskId: input.taskId,
    model: null,
    tier: 'free_model',
    tokens: input.tokens,
    estimatedCostGbp: 0,
    cache: 'miss',
    status: input.status,
    note: input.note ?? 'Call outcome recorded (tokens only; cost already logged at authorisation).',
  });
}

export interface AiUsageSummary {
  calls: number;
  tokens: number;
  estimatedCostGbp: number;
  cacheHits: number;
  cacheMisses: number;
  refused: number;
  errors: number;
  byTask: { taskId: string; calls: number; tokens: number; estimatedCostGbp: number }[];
  dailySpendGbp: number;
  monthlySpendGbp: number;
  ceilingMonthlyGbp: number;
  projectionMonthlyGbp: number;
  protection: ReturnType<typeof costProtectionState>;
}

/**
 * §27/§34 — the usage summary the cost dashboard renders. The monthly projection
 * extrapolates the run-rate from the days elapsed in the current month; it is an
 * ESTIMATE and is labelled as one on screen.
 */
export function aiUsageSummary(now = new Date()): AiUsageSummary {
  const monthEntries = entries.filter((e) => monthKey(e.at) === monthKey(now.toISOString()));
  const tokens = monthEntries.reduce((s, e) => s + e.tokens, 0);
  const byTaskMap = new Map<string, { taskId: string; calls: number; tokens: number; estimatedCostGbp: number }>();
  for (const e of monthEntries) {
    const row = byTaskMap.get(e.taskId) ?? { taskId: e.taskId, calls: 0, tokens: 0, estimatedCostGbp: 0 };
    row.calls += 1;
    row.tokens += e.tokens;
    row.estimatedCostGbp += e.estimatedCostGbp;
    byTaskMap.set(e.taskId, row);
  }
  const protection = costProtectionState(now);
  const dayOfMonth = now.getUTCDate();
  const daysInMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
  const projection = dayOfMonth > 0 ? (protection.monthlySpendGbp / dayOfMonth) * daysInMonth : 0;
  return {
    calls: monthEntries.length,
    tokens,
    estimatedCostGbp: protection.monthlySpendGbp,
    cacheHits: monthEntries.filter((e) => e.status === 'cache_hit').length,
    cacheMisses: monthEntries.filter((e) => e.cache === 'miss' && e.status !== 'refused_budget' && e.status !== 'handled_without_model').length,
    refused: monthEntries.filter((e) => e.status === 'refused_budget').length,
    errors: monthEntries.filter((e) => e.status === 'error').length,
    byTask: [...byTaskMap.values()].sort((a, b) => b.estimatedCostGbp - a.estimatedCostGbp),
    dailySpendGbp: protection.dailySpendGbp,
    monthlySpendGbp: protection.monthlySpendGbp,
    ceilingMonthlyGbp: AI_SPEND_CEILINGS.monthlyGbp,
    projectionMonthlyGbp: Math.round(projection * 10000) / 10000,
    protection,
  };
}