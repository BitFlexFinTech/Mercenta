/**
 * §27/§34 (M13 Phase 10) — OPERATING COSTS (Super Admin only).
 *
 * The founder's cost, usage and contribution view:
 *   - every provider line with its plan, fixed cost, usage, budget, variance and
 *     an explicit source label (MANUAL / ESTIMATED / SIMULATED / NOT CONNECTED);
 *   - AI/OpenRouter usage from the REAL runtime usage log: calls, tokens, cost,
 *     cache hit/miss, refusals, daily + monthly ceilings and the cost-protection
 *     state;
 *   - revenue per §25 stream and the derived contribution;
 *   - cost per brand / opportunity / lead / AI operation;
 *   - the derived inputs for pricing decisions (break-even subscription, CAC
 *     tolerance), each flagged as requiring founder approval.
 *
 * Nothing here claims live spend: no billing API is connected.
 */
import { useCallback, useState } from 'react';
import { Badge, Button, Card, NoPermissionState } from '@/components/ui';
import { cn } from '@/utils/cn';
import { useApp } from '@/context/GlobalStateContext';
import {
  AI_SPEND_CEILINGS,
  COST_MODEL_INPUTS,
  OPERATING_COSTS_DISCLAIMER,
  type CostSourceLabel,
} from '@/config/operatingCosts';
import { operatingCostSummary, type OperatingCostSummary } from '@/lib/costs/costSummary';
import { FREE_RUNTIME_MODELS, RUNTIME_TASKS, selectRuntimeModel } from '@/lib/costs/modelPolicy';
import { aiUsageEntries, resetAiUsageLog, type AiUsageEntry } from '@/lib/costs/usageLog';
import { Wallet, RefreshCw } from 'lucide-react';

function sourceClass(source: CostSourceLabel): string {
  switch (source) {
    case 'NOT CONNECTED':
      return 'bg-tint text-muted border-hairline';
    case 'ESTIMATED':
      return 'bg-state-warning/10 text-state-warning border-state-warning/20';
    case 'SIMULATED':
      return 'bg-sky-500/15 text-state-info border-sky-500/20';
    case 'LIVE':
      return 'bg-state-success/10 text-state-success border-state-success/20';
    default:
      return 'bg-tint text-strong border-hairline-strong';
  }
}

function money(n: number): string {
  return `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function OperatingCostsPanel() {
  const { session } = useApp();
  const [summary, setSummary] = useState<OperatingCostSummary>(() => operatingCostSummary());
  const [entries, setEntries] = useState<AiUsageEntry[]>(() =>
    [...aiUsageEntries()].slice(-25).reverse()
  );

  const isSuperAdmin = session?.tier === 'super_admin';

  /** Re-read the log + derived figures after any mutation. */
  const refresh = useCallback(() => {
    setSummary(operatingCostSummary());
    setEntries([...aiUsageEntries()].slice(-25).reverse());
  }, []);

  if (!isSuperAdmin) {
    /* §OPENSHIP BATCH 8 — the refusal renders THROUGH the one owner. */
    return (
      <NoPermissionState description="Platform costs and AI spend controls are restricted to the Super Admin tier." />
    );
  }

  return (
    <div className="space-y-4" data-testid="operating-costs">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-strong flex items-center gap-2">
              <Wallet className="w-4 h-4" /> Operating costs
            </h2>
            <p className="text-ds-label text-muted mt-1">{OPERATING_COSTS_DISCLAIMER}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge
              className={cn(
                'text-ds-micro',
                summary.ai.protection.state === 'exceeded'
                  ? 'bg-state-danger/10 text-state-danger border-state-danger/20'
                  : summary.ai.protection.state === 'warning'
                    ? 'bg-state-warning/10 text-state-warning border-state-warning/20'
                    : 'bg-state-success/10 text-state-success border-state-success/20'
              )}
            >
              AI cost protection: {summary.ai.protection.state}
            </Badge>
            <Button
              variant="tertiary"
              size="sm"
              className="text-xs"
              onClick={() => {
                resetAiUsageLog();
                refresh();
              }}
            >
              <RefreshCw className="w-3 h-3 mr-1" /> Clear demo usage log
            </Button>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-4 mt-4 text-ds-label">
          <div className="rounded-ds-md border border-hairline bg-surface-raised px-2.5 py-2">
            <p className="text-ds-micro text-muted">Fixed monthly (MANUAL)</p>
            <p className="text-sm font-bold text-strong" data-testid="cost-fixed">
              {money(summary.monthlyFixedGbp)}
            </p>
          </div>
          <div className="rounded-ds-md border border-hairline bg-surface-raised px-2.5 py-2">
            <p className="text-ds-micro text-muted">AI usage this month (ESTIMATED)</p>
            <p className="text-sm font-bold text-strong" data-testid="cost-ai-month">
              {money(summary.ai.monthlySpendGbp)}
            </p>
          </div>
          <div className="rounded-ds-md border border-hairline bg-surface-raised px-2.5 py-2">
            <p className="text-ds-micro text-muted">Projected month (ESTIMATED)</p>
            <p className="text-sm font-bold text-strong">{money(summary.projectedMonthGbp)}</p>
          </div>
          <div className="rounded-ds-md border border-hairline bg-surface-raised px-2.5 py-2">
            <p className="text-ds-micro text-muted">Total this month</p>
            <p className="text-sm font-bold text-strong" data-testid="cost-total-month">
              {money(summary.monthlyTotalGbp)}
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-5" title="Provider costs" subtitle="Plan, fixed cost, usage, budget and variance — every figure labelled">
        <div className="space-y-1.5" data-testid="cost-providers">
          {summary.providers.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-ds-md border border-hairline bg-surface-raised px-3 py-2"
              data-testid="cost-provider"
            >
              <div className="min-w-[220px]">
                <p className="text-xs text-strong">{p.name}</p>
                <p className="text-ds-micro text-muted">
                  {p.plan} · {p.billing} · {p.category}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-ds-micro text-muted">
                <span>fixed {money(p.fixedMonthlyGbp)}</span>
                <span>usage {money(p.estimatedTotalGbp - p.fixedMonthlyGbp)}</span>
                <span>budget {money(p.usageBudgetGbp)}</span>
                <span className={cn(p.varianceGbp < 0 ? 'text-state-danger' : 'text-muted')}>
                  variance {money(p.varianceGbp)}
                </span>
                <Badge className={cn('text-ds-micro', sourceClass(p.source))}>{p.source}</Badge>
                {p.manageUrl && (
                  <a className="text-state-info/90" href={p.manageUrl} target="_blank" rel="noreferrer">
                    manage
                  </a>
                )}
              </div>
              <p className="w-full text-ds-micro text-faint">{p.note}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card
        className="p-5"
        title="AI / OpenRouter usage"
        subtitle={`Runtime policy: FREE models only (${FREE_RUNTIME_MODELS.join(', ')}). Ceilings £${AI_SPEND_CEILINGS.dailyGbp}/day, £${AI_SPEND_CEILINGS.monthlyGbp}/month.`}
      >
        <div className="grid gap-2 sm:grid-cols-4 text-ds-label">
          <div className="rounded-ds-md border border-hairline bg-surface-raised px-2.5 py-2">
            <p className="text-ds-micro text-muted">Calls</p>
            <p className="text-sm font-bold text-strong" data-testid="ai-calls">{summary.ai.calls}</p>
          </div>
          <div className="rounded-ds-md border border-hairline bg-surface-raised px-2.5 py-2">
            <p className="text-ds-micro text-muted">Tokens</p>
            <p className="text-sm font-bold text-strong">{summary.ai.tokens}</p>
          </div>
          <div className="rounded-ds-md border border-hairline bg-surface-raised px-2.5 py-2">
            <p className="text-ds-micro text-muted">Cache hit / miss</p>
            <p className="text-sm font-bold text-strong">
              {summary.ai.cacheHits} / {summary.ai.cacheMisses}
            </p>
          </div>
          <div className="rounded-ds-md border border-hairline bg-surface-raised px-2.5 py-2">
            <p className="text-ds-micro text-muted">Refused by budget</p>
            <p className="text-sm font-bold text-strong" data-testid="ai-refused">{summary.ai.refused}</p>
          </div>
        </div>
        <p className="text-ds-micro text-muted mt-2" data-testid="ai-protection-reason">
          {summary.ai.protection.reason} · projected month {money(summary.ai.projectionMonthlyGbp)} (ESTIMATED)
        </p>

        <div className="mt-3">
          <p className="text-ds-micro text-muted mb-1">Per-task usage this month</p>
          {summary.ai.byTask.length === 0 ? (
            <p className="text-ds-label text-muted" data-testid="ai-usage-empty">
              No runtime AI calls have been made in this session. Nothing is claimed.
            </p>
          ) : (
            <ul className="space-y-1" data-testid="ai-task-rows">
              {summary.ai.byTask.map((t) => (
                <li key={t.taskId} className="flex items-center justify-between text-ds-micro text-muted">
                  <span className="font-mono">{t.taskId}</span>
                  <span>
                    {t.calls} calls · {t.tokens} tokens · {money(t.estimatedCostGbp)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <details className="mt-3">
          <summary className="text-ds-label text-muted cursor-pointer">Recent usage entries ({entries.length})</summary>
          {entries.length === 0 ? (
            <p className="text-ds-micro text-faint mt-1">The log is empty.</p>
          ) : (
            <ul className="mt-1 space-y-0.5" data-testid="ai-usage-entries">
              {entries.map((e) => (
                <li key={e.id} className="text-ds-micro font-mono text-muted">
                  {e.at} · {e.taskId} · {e.model ?? 'no model'} · {e.tokens} tok · {money(e.estimatedCostGbp)} ·{' '}
                  {e.status} · cache {e.cache}
                </li>
              ))}
            </ul>
          )}
        </details>

        <details className="mt-3">
          <summary className="text-ds-label text-muted cursor-pointer">Runtime model policy (cheapest suitable first)</summary>
          <ul className="mt-1 space-y-0.5" data-testid="model-policy">
            {Object.values(RUNTIME_TASKS).map((spec) => {
              const d = selectRuntimeModel(spec);
              return (
                <li key={spec.id} className="text-ds-micro text-muted">
                  {spec.id} → {d.tier} {d.model ? `(${d.model})` : '(no model call)'} — {d.reason}
                </li>
              );
            })}
          </ul>
        </details>
      </Card>
<div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5" title="Revenue by stream" subtitle="§25 — each stream is modelled separately, never blended">
          <ul className="space-y-1" data-testid="revenue-streams">
            {summary.revenue.streams.map((s) => (
              <li key={s.id} className="flex items-center justify-between text-ds-label">
                <span className="text-strong">{s.label}</span>
                <span className="text-muted">
                  {money(s.gbp)} <span className="text-ds-micro text-faint">· {s.source}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-strong mt-2" data-testid="revenue-total">
            Total {money(summary.revenue.totalGbp)} <span className="text-ds-micro text-muted">(demo data)</span>
          </p>
        </Card>

        <Card className="p-5" title="Contribution" subtitle="Provisional while any input still requires founder approval">
          <div className="grid gap-2 sm:grid-cols-3 text-ds-label">
            <div className="rounded-ds-md border border-hairline bg-surface-raised px-2.5 py-2">
              <p className="text-ds-micro text-muted">Gross contribution</p>
              <p className="text-sm font-bold text-strong" data-testid="contribution-gross">
                {money(summary.contribution.grossGbp)}
              </p>
            </div>
            <div className="rounded-ds-md border border-hairline bg-surface-raised px-2.5 py-2">
              <p className="text-ds-micro text-muted">Margin</p>
              <p className="text-sm font-bold text-strong">{summary.contribution.marginPct}%</p>
            </div>
            <div className="rounded-ds-md border border-hairline bg-surface-raised px-2.5 py-2">
              <p className="text-ds-micro text-muted">Status</p>
              <p className="text-sm font-bold text-strong">
                {summary.contribution.provisional ? 'provisional' : 'confirmed'}
              </p>
            </div>
          </div>
          <p className="text-ds-micro text-faint mt-2">
            Commission and shipping margin come from the canonical demo stores. Subscription revenue is £0.00 because no
            price has been approved.
          </p>
        </Card>
      </div>

      <Card className="p-5" title="Unit economics" subtitle="What each unit of the platform costs at the current run-rate">
        <div className="grid gap-2 sm:grid-cols-4 text-ds-label" data-testid="unit-economics">
          <div className="rounded-ds-md border border-hairline bg-surface-raised px-2.5 py-2">
            <p className="text-ds-micro text-muted">Cost per brand ({summary.units.brands})</p>
            <p className="text-sm font-bold text-strong">{money(summary.perUnit.perBrandGbp)}</p>
          </div>
          <div className="rounded-ds-md border border-hairline bg-surface-raised px-2.5 py-2">
            <p className="text-ds-micro text-muted">Cost per opportunity ({summary.units.opportunities})</p>
            <p className="text-sm font-bold text-strong">{money(summary.perUnit.perOpportunityGbp)}</p>
          </div>
          <div className="rounded-ds-md border border-hairline bg-surface-raised px-2.5 py-2">
            <p className="text-ds-micro text-muted">Cost per lead ({summary.units.leads})</p>
            <p className="text-sm font-bold text-strong">{money(summary.perUnit.perLeadGbp)}</p>
          </div>
          <div className="rounded-ds-md border border-hairline bg-surface-raised px-2.5 py-2">
            <p className="text-ds-micro text-muted">Cost per AI operation ({summary.units.aiOperations})</p>
            <p className="text-sm font-bold text-strong">{money(summary.perUnit.perAiOperationGbp)}</p>
          </div>
        </div>
        <p className="text-ds-micro text-faint mt-2">
          Brand / opportunity / lead counts are read from the canonical stores; AI operations are the real logged calls.
        </p>
      </Card>

      <Card className="p-5" title="Pricing inputs (founder approval required)" subtitle="Derived, never hard-coded pricing">
        <ul className="space-y-1" data-testid="cost-inputs">
          {COST_MODEL_INPUTS.map((i) => (
            <li key={i.id} className="text-ds-label text-strong flex flex-wrap items-center gap-2">
              <span>{i.label}:</span>
              <span className="text-strong">
                {i.unit === 'percent' ? `${i.value}%` : i.unit === 'GBP/month' ? `${money(i.value)}/month` : money(i.value)}
              </span>
              {i.requiresFounderApproval && (
                <Badge className="text-ds-micro bg-state-warning/10 text-state-warning border-state-warning/20">
                  requires founder approval
                </Badge>
              )}
              <span className="w-full text-ds-micro text-faint">{i.note}</span>
            </li>
          ))}
        </ul>
        <p className="text-ds-label text-muted mt-2" data-testid="derived-min-subscription">
          Break-even subscription per brand at the target margin:{' '}
          <span className="text-strong">
            {summary.derived.minSubscriptionGbp === null ? 'not computable yet' : money(summary.derived.minSubscriptionGbp)}
          </span>
        </p>
        <p className="text-ds-micro text-faint">{summary.derived.minSubscriptionNote}</p>
        <p className="text-ds-micro text-faint mt-1">
          CAC tolerance: {money(summary.derived.cacToleranceGbp)} — {summary.derived.cacToleranceNote}
        </p>
      </Card>
    </div>
  );
}