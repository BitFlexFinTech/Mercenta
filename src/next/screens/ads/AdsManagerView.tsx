import { useMemo, useState } from 'react';
import { Check, Info, Pencil, Save, Search, X } from 'lucide-react';
import type { AdCampaign, AdSpendBudget, AdSpendRecommendation } from '@/types';
import type { AdsSurfacePolicy } from '@/next/adsConfig';
import {
  ConsoleTable,
  EmptyStateBlock,
  ErrorStateBlock,
  InlineStatus,
  LoadingRows,
  MetricStrip,
  SlideOverDrawer,
  type ConsoleColumn,
  type MetricItem,
} from '@/next/components/ConsolePrimitives';
import { ConsolePageHeader } from '@/next/components/ConsolePageHeader';

export interface AdsPortfolioRow {
  brandId: string;
  brandName: string;
  budget: number;
  spend: number;
  remaining: number;
  utilPct: number;
  acos: number | null;
  tacos: number | null;
  status: AdSpendBudget['status'];
}

export interface AdsManagerViewProps {
  policy: AdsSurfacePolicy;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;

  /** True only when the amazon_ads integration mode resolves to live. */
  isLiveIntegration: boolean;
  integrationModeLabel: string;

  /** Brand-scope fields (when policy.scope === 'brand'). */
  tenantId: string | null;
  brandName: string;
  brandBudget: AdSpendBudget | null;
  brandCampaigns: AdCampaign[];
  brandRecommendations: AdSpendRecommendation[];

  /** Admin-scope fields (when policy.scope === 'admin'). */
  portfolioRows: AdsPortfolioRow[];
  campaignsByBrand: Map<string, AdCampaign[]>;
  recommendationsByBrand: Map<string, AdSpendRecommendation[]>;

  /** RBAC guard for staff admin actions (set budget, review on behalf). */
  canStaffMutate: boolean;
  actingStaffLabel: string;

  /** Command callbacks wired by AdsManagerScreen. */
  onSaveBudget: (
    brandId: string,
    monthlyBudgetGbp: number
  ) => Promise<{ ok: boolean; error?: string; message?: string }>;
  onDecideRecommendation: (
    recId: string,
    decision: 'approved' | 'amended' | 'rejected',
    opts?: { amendedBudgetGbp?: number; note?: string }
  ) => Promise<{ ok: boolean; error?: string; message?: string }>;
}

function gbp(n: number): string {
  return `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pct(n: number | null): string {
  return n === null ? '—' : `${(n * 100).toFixed(1)}%`;
}

function statusTone(status: AdSpendBudget['status']) {
  if (status === 'active') return 'success' as const;
  if (status === 'paused') return 'warning' as const;
  return 'neutral' as const;
}

function statusText(status: AdSpendBudget['status']): string {
  if (status === 'active') return 'Active';
  if (status === 'paused') return 'Paused';
  return 'Not configured';
}

export function AdsManagerView({
  policy,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  isLiveIntegration,
  integrationModeLabel,
  tenantId,
  brandName,
  brandBudget,
  brandCampaigns,
  brandRecommendations,
  portfolioRows,
  campaignsByBrand,
  recommendationsByBrand,
  canStaffMutate,
  actingStaffLabel,
  onSaveBudget,
  onDecideRecommendation,
}: AdsManagerViewProps) {
  const [search, setSearch] = useState('');
  const [focus, setFocus] = useState<'all' | 'active' | 'not_configured' | 'over_budget'>('all');
  const [sortByUtil, setSortByUtil] = useState(false);

  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<AdCampaign | null>(null);

  const [editingBudgetBrandId, setEditingBudgetBrandId] = useState<string | null>(null);
  const [budgetDraft, setBudgetDraft] = useState('');
  const [budgetBusy, setBudgetBusy] = useState(false);

  const [amendingRecId, setAmendingRecId] = useState<string | null>(null);
  const [amendBudget, setAmendBudget] = useState('');
  const [amendNote, setAmendNote] = useState('');
  const [recBusyId, setRecBusyId] = useState<string | null>(null);

  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const filteredPortfolio = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = portfolioRows;
    if (q) {
      list = list.filter((r) => r.brandName.toLowerCase().includes(q));
    }
    if (focus === 'active') list = list.filter((r) => r.status === 'active');
    if (focus === 'not_configured') list = list.filter((r) => r.status === 'not_configured');
    if (focus === 'over_budget') list = list.filter((r) => r.utilPct >= 1);
    return sortByUtil ? [...list].sort((a, b) => b.utilPct - a.utilPct) : list;
  }, [portfolioRows, search, focus, sortByUtil]);

  const activeRows = portfolioRows.filter((r) => r.status === 'active');
  const configuredCount = portfolioRows.filter((r) => r.status !== 'not_configured').length;
  const totalBudget = portfolioRows.reduce((s, r) => s + r.budget, 0);
  const totalSpend = portfolioRows.reduce((s, r) => s + r.spend, 0);
  const totalRemaining = Math.max(0, totalBudget - totalSpend);
  const avgAcos =
    activeRows.length > 0
      ? activeRows.reduce((s, r) => s + (r.acos ?? 0), 0) / activeRows.length
      : null;
  const avgTacos =
    activeRows.length > 0
      ? activeRows.reduce((s, r) => s + (r.tacos ?? 0), 0) / activeRows.length
      : null;

  const selectedBrandRow = useMemo(
    () => portfolioRows.find((r) => r.brandId === selectedBrandId) ?? null,
    [portfolioRows, selectedBrandId]
  );

  async function handleSaveBudget(brandId: string) {
    if (!canStaffMutate || budgetBusy) return;
    setBudgetBusy(true);
    setFeedbackError(null);
    setFeedbackNotice(null);
    const res = await onSaveBudget(brandId, Number(budgetDraft));
    setBudgetBusy(false);
    if (!res.ok) {
      setFeedbackError(res.error ?? 'Budget update refused.');
      return;
    }
    setFeedbackNotice(res.message ?? 'Monthly budget updated.');
    setEditingBudgetBrandId(null);
    setBudgetDraft('');
  }

  async function handleDecideRecommendation(
    recId: string,
    decision: 'approved' | 'amended' | 'rejected'
  ) {
    if (recBusyId) return;
    if (policy.scope === 'admin' && !canStaffMutate) return;
    setRecBusyId(recId);
    setFeedbackError(null);
    setFeedbackNotice(null);
    const res = await onDecideRecommendation(recId, decision, {
      amendedBudgetGbp: decision === 'amended' ? Number(amendBudget) : undefined,
      note: decision === 'amended' ? amendNote.trim() || undefined : undefined,
    });
    setRecBusyId(null);
    if (!res.ok) {
      setFeedbackError(res.error ?? 'Decision refused.');
      return;
    }
    setFeedbackNotice(res.message ?? 'Budget recommendation updated.');
    setAmendingRecId(null);
    setAmendBudget('');
    setAmendNote('');
  }

  const headerMeta = (
    <>
      <span>{isLiveIntegration ? 'Live connection' : `Simulated · mode: ${integrationModeLabel}`}</span>
      <span aria-hidden="true">·</span>
      <span>{policy.placementContextLabel}</span>
      {policy.scope === 'brand' && (
        <>
          <span aria-hidden="true">·</span>
          <span>{brandName}</span>
        </>
      )}
    </>
  );

  if (policy.scope === 'brand' && !tenantId) {
    return (
      <div>
        <ConsolePageHeader title={policy.title} description={policy.description} meta={headerMeta} />
        <EmptyStateBlock
          title="No brand tenant active"
          description="Sign in as a brand partner to view advertising budgets, campaigns, and recommendations for your tenant."
        />
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <ConsolePageHeader title={policy.title} description={policy.description} meta={headerMeta} />
        <ErrorStateBlock
          title="Unable to load advertising records"
          message={errorMessage}
          onRetry={onRetry}
        />
      </div>
    );
  }

  const brandRemaining = Math.max(
    0,
    (brandBudget?.monthlyBudgetGbp ?? 0) - (brandBudget?.spendToDateGbp ?? 0)
  );
  const brandUtil =
    brandBudget && brandBudget.monthlyBudgetGbp > 0
      ? brandBudget.spendToDateGbp / brandBudget.monthlyBudgetGbp
      : 0;

  const brandKpis: MetricItem[] = [
    { id: 'b-budget', label: 'Monthly budget', value: gbp(brandBudget?.monthlyBudgetGbp ?? 0) },
    { id: 'b-spend', label: 'Spend to date', value: gbp(brandBudget?.spendToDateGbp ?? 0) },
    { id: 'b-remaining', label: 'Remaining', value: gbp(brandRemaining) },
    { id: 'b-util', label: 'Utilisation', value: pct(brandUtil) },
    { id: 'b-acos', label: 'ACOS', value: pct(brandBudget?.acos ?? null) },
    { id: 'b-tacos', label: 'TACOS', value: pct(brandBudget?.tacos ?? null) },
  ];

  const adminKpis: MetricItem[] = [
    {
      id: 'a-active',
      label: 'Active accounts',
      value: String(activeRows.length),
      context: 'Filter active',
      active: focus === 'active',
      onClick: () => setFocus((f) => (f === 'active' ? 'all' : 'active')),
    },
    {
      id: 'a-configured',
      label: 'Configured brands',
      value: `${configuredCount}/${portfolioRows.length}`,
      context: 'Show all brands',
      active: focus === 'all' && !sortByUtil,
      onClick: () => {
        setFocus('all');
        setSortByUtil(false);
      },
    },
    {
      id: 'a-budget',
      label: 'Monthly budget',
      value: gbp(totalBudget),
      context: 'Portfolio total',
    },
    {
      id: 'a-spend',
      label: 'Spend to date',
      value: gbp(totalSpend),
      context: 'Sort by utilisation',
      active: sortByUtil,
      onClick: () => setSortByUtil((v) => !v),
    },
    {
      id: 'a-remaining',
      label: 'Remaining budget',
      value: gbp(totalRemaining),
      context: 'Filter over budget',
      active: focus === 'over_budget',
      onClick: () => setFocus((f) => (f === 'over_budget' ? 'all' : 'over_budget')),
    },
    {
      id: 'a-acos',
      label: 'Avg ACOS (active)',
      value: pct(avgAcos),
      context: `Avg TACOS ${pct(avgTacos)}`,
    },
  ];

  const campaignColumns: ConsoleColumn<AdCampaign>[] = [
    {
      key: 'name',
      header: 'Campaign',
      render: (c) => (
        <div>
          <div className="font-medium text-ink-950">{c.name}</div>
          <div className="text-[12px] text-faint">{c.placement}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => (
        <InlineStatus
          label={c.status === 'active' ? 'Active' : c.status === 'paused' ? 'Paused' : 'Ended'}
          tone={c.status === 'active' ? 'success' : 'warning'}
          dataStatus={c.status}
        />
      ),
    },
    {
      key: 'budget',
      header: 'Budget',
      align: 'right',
      render: (c) => <span>{gbp(c.monthlyBudgetGbp)}</span>,
    },
    {
      key: 'spend',
      header: 'Spend',
      align: 'right',
      render: (c) => <span>{gbp(c.spendToDateGbp)}</span>,
    },
    {
      key: 'clicks',
      header: 'Clicks',
      align: 'right',
      hideOnMobile: true,
      render: (c) => <span>{c.clicks.toLocaleString('en-GB')}</span>,
    },
    {
      key: 'acos',
      header: 'ACOS',
      align: 'right',
      render: (c) => <span>{pct(c.acos)}</span>,
    },
  ];

  const portfolioColumns: ConsoleColumn<AdsPortfolioRow>[] = [
    {
      key: 'brand',
      header: 'Brand',
      render: (r) => <span className="font-medium text-ink-950">{r.brandName}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <InlineStatus label={statusText(r.status)} tone={statusTone(r.status)} dataStatus={r.status} />
      ),
    },
    {
      key: 'budget',
      header: 'Monthly budget',
      align: 'right',
      render: (r) => <span>{gbp(r.budget)}</span>,
    },
    {
      key: 'spend',
      header: 'Spend to date',
      align: 'right',
      render: (r) => <span>{gbp(r.spend)}</span>,
    },
    {
      key: 'remaining',
      header: 'Remaining',
      align: 'right',
      hideOnMobile: true,
      render: (r) => <span>{gbp(r.remaining)}</span>,
    },
    {
      key: 'utilPct',
      header: 'Utilisation',
      align: 'right',
      render: (r) => <span>{pct(r.utilPct)}</span>,
    },
    {
      key: 'acos',
      header: 'ACOS',
      align: 'right',
      render: (r) => <span>{pct(r.acos)}</span>,
    },
    {
      key: 'tacos',
      header: 'TACOS',
      align: 'right',
      hideOnMobile: true,
      render: (r) => <span>{pct(r.tacos)}</span>,
    },
  ];

  function renderRecommendationList(recs: AdSpendRecommendation[], allowDecision: boolean) {
    if (recs.length === 0) {
      return (
        <EmptyStateBlock
          title="No budget recommendations"
          description="Mercenta has not prepared a monthly advertising budget recommendation for this account yet."
        />
      );
    }

    return (
      <div className="border border-hairline bg-surface-raised rounded-md divide-y divide-hairline-06">
        {recs.map((rec) => {
          const isProposed = rec.status === 'proposed';
          const isAmending = amendingRecId === rec.id;
          return (
            <div key={rec.id} className="p-4 space-y-2.5" data-testid={`ads-rec-${rec.id}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-[14px] font-semibold text-ink-950">{rec.month}</span>
                  <span className="text-[12px] text-faint font-mono tabular-nums">
                    Recommended £{rec.recommendedMonthlyBudgetGbp.toLocaleString('en-GB')}/mo
                  </span>
                </div>
                <InlineStatus
                  label={policy.recStatusLabels[rec.status]}
                  tone={
                    rec.status === 'approved'
                      ? 'success'
                      : rec.status === 'amended'
                        ? 'warning'
                        : rec.status === 'rejected'
                          ? 'danger'
                          : 'info'
                  }
                  dataStatus={rec.status}
                />
              </div>

              <p className="text-[14px] text-secondary">{rec.basis}</p>

              {rec.reviewedAt && (
                <p className="text-[12px] text-faint">
                  Decided {rec.reviewedAt.slice(0, 16).replace('T', ' ')}
                  {rec.actorDisplay ? ` · ${rec.actorDisplay}` : ''}
                  {' · '}
                  Final budget £{(rec.amendedBudgetGbp ?? 0).toLocaleString('en-GB')}/mo
                  {rec.note ? ` · ${rec.note}` : ''}
                </p>
              )}

              {isProposed && allowDecision && !isAmending && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={recBusyId === rec.id}
                    onClick={() => void handleDecideRecommendation(rec.id, 'approved')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--mr-accent)] text-on-dark text-[12px] font-medium hover:bg-[var(--mr-accent-600)] disabled:opacity-50 whitespace-nowrap"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={recBusyId === rec.id}
                    onClick={() => {
                      setAmendingRecId(rec.id);
                      setAmendBudget(String(rec.recommendedMonthlyBudgetGbp));
                      setAmendNote('');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-hairline-strong bg-surface-raised text-ink-900 text-[12px] font-medium hover:bg-surface disabled:opacity-50 whitespace-nowrap"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Amend
                  </button>
                  <button
                    type="button"
                    disabled={recBusyId === rec.id}
                    onClick={() => void handleDecideRecommendation(rec.id, 'rejected')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-hairline bg-surface-raised text-secondary text-[12px] font-medium hover:bg-surface disabled:opacity-50 whitespace-nowrap"
                  >
                    <X className="w-3.5 h-3.5" />
                    Reject
                  </button>
                </div>
              )}

              {isProposed && !allowDecision && (
                <p className="text-[12px] text-faint">
                  Read-only access ({actingStaffLabel}): switch to a Full admin staff profile to decide on behalf of a brand.
                </p>
              )}

              {isProposed && allowDecision && isAmending && (
                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={amendBudget}
                    onChange={(e) => setAmendBudget(e.target.value)}
                    placeholder="Budget (GBP)"
                    aria-label="Amended monthly budget in GBP"
                    className="w-36 px-3 py-1.5 text-[14px] font-mono border border-hairline-strong rounded-md bg-surface-raised text-ink-950 focus:outline-2 focus:outline-[var(--mr-accent)]"
                  />
                  <input
                    type="text"
                    value={amendNote}
                    onChange={(e) => setAmendNote(e.target.value)}
                    placeholder="Reason or note (optional)"
                    aria-label="Amendment note"
                    className="min-w-[200px] flex-1 px-3 py-1.5 text-[14px] border border-hairline-strong rounded-md bg-surface-raised text-ink-950 focus:outline-2 focus:outline-[var(--mr-accent)]"
                  />
                  <button
                    type="button"
                    disabled={recBusyId === rec.id}
                    onClick={() => void handleDecideRecommendation(rec.id, 'amended')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--mr-accent)] text-on-dark text-[12px] font-medium hover:bg-[var(--mr-accent-600)] disabled:opacity-50 whitespace-nowrap"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmendingRecId(null)}
                    className="px-3 py-1.5 rounded-md border border-hairline bg-surface-raised text-secondary text-[12px] font-medium hover:bg-surface whitespace-nowrap"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConsolePageHeader title={policy.title} description={policy.description} meta={headerMeta} />

      {/* Truth & policy notice */}
      <div className="border border-hairline bg-surface-raised rounded-md px-4 py-3 flex items-start gap-2.5 text-[14px] text-secondary">
        <Info className="w-4 h-4 text-faint shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <span>
            {isLiveIntegration
              ? 'Data reflects the live Amazon Ads integration.'
              : 'Data is simulated from the Mercenta ad-spend seed seam — connect Amazon Ads credentials in Integration Settings to go live.'}{' '}
            {policy.commissionNote}
          </span>
          {policy.verticalRuleNote && (
            <div className="mt-1 text-[12px] text-faint">{policy.verticalRuleNote}</div>
          )}
        </div>
      </div>

      {feedbackNotice && (
        <div role="status" className="border border-state-success/20 bg-state-success/10 rounded-md px-4 py-3 text-[14px] text-state-success">
          {feedbackNotice}
        </div>
      )}
      {feedbackError && (
        <div role="alert" className="border border-state-danger/20 bg-state-danger/10 rounded-md px-4 py-3 text-[14px] text-state-danger">
          {feedbackError}
        </div>
      )}

      {policy.scope === 'brand' ? (
        <>
          <MetricStrip items={brandKpis} loading={isLoading} columns={6} />

          <section className="space-y-3">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-[16px] font-semibold text-ink-950">Campaigns</h2>
              <span className="text-[12px] text-faint">
                Select a campaign to inspect placement and attribution metrics
              </span>
            </div>
            {isLoading ? (
              <LoadingRows rows={4} label="Loading campaigns…" />
            ) : (
              <ConsoleTable
                rows={brandCampaigns}
                columns={campaignColumns}
                rowKey={(c) => c.id}
                selectedKey={selectedCampaign?.id ?? null}
                onRowClick={(c) => setSelectedCampaign(c)}
                emptyTitle="No campaigns configured"
                emptyDescription="No advertising campaigns exist for your brand yet."
                testId="ads-brand-campaigns-table"
              />
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-[16px] font-semibold text-ink-950">
              Recommended monthly budgets
            </h2>
            {isLoading ? (
              <LoadingRows rows={2} label="Loading recommendations…" />
            ) : (
              renderRecommendationList(brandRecommendations, true)
            )}
          </section>
        </>
      ) : (
        <>
          <MetricStrip items={adminKpis} loading={isLoading} columns={6} />

          <section className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-quiet absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter by brand name…"
                  aria-label="Filter brands"
                  className="w-full pl-9 pr-3 py-2 text-[14px] border border-hairline-strong rounded-md bg-surface-raised text-ink-950 focus:outline-2 focus:outline-[var(--mr-accent)]"
                />
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {(['all', 'active', 'not_configured', 'over_budget'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFocus(f)}
                    className={`px-3 py-1.5 rounded-md text-[12px] font-medium whitespace-nowrap ${
                      focus === f
                        ? 'bg-ink-950 text-on-dark'
                        : 'border border-hairline bg-surface-raised text-secondary hover:bg-surface'
                    }`}
                  >
                    {f.replace(/_/g, ' ')}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSortByUtil((v) => !v)}
                  className={`px-3 py-1.5 rounded-md text-[12px] font-medium whitespace-nowrap ${
                    sortByUtil
                      ? 'bg-[var(--mr-accent)] text-on-dark'
                      : 'border border-hairline bg-surface-raised text-secondary hover:bg-surface'
                  }`}
                >
                  {sortByUtil ? 'Sorted: utilisation' : 'Sort: utilisation'}
                </button>
              </div>
            </div>

            {isLoading ? (
              <LoadingRows rows={6} label="Loading brand advertising portfolio…" />
            ) : (
              <ConsoleTable
                rows={filteredPortfolio}
                columns={portfolioColumns}
                rowKey={(r) => r.brandId}
                selectedKey={selectedBrandId}
                onRowClick={(r) => {
                  setSelectedBrandId(r.brandId);
                  setEditingBudgetBrandId(null);
                  setSelectedCampaign(null);
                }}
                emptyTitle="No brands match the active filter"
                emptyDescription="Clear the search input or switch the portfolio filter back to all brands."
                emptyActionLabel="Reset filters"
                onEmptyAction={() => {
                  setSearch('');
                  setFocus('all');
                  setSortByUtil(false);
                }}
                testId="ads-admin-portfolio-table"
              />
            )}
          </section>
        </>
      )}

      {/* Honest Schema & Unsupported Capability Disclosure */}
      <section className="border border-hairline bg-surface-raised rounded-md p-4 space-y-1.5 text-[12px] text-ink-600">
        <div className="font-semibold text-ink-900">Scope & Backend Availability</div>
        <p>{policy.creativeAssetGapNote}</p>
        <p>{policy.campaignMutationGapNote}</p>
      </section>

      {/* Admin Brand Detail Slide-Over Drawer */}
      <SlideOverDrawer
        open={policy.scope === 'admin' && selectedBrandRow !== null}
        onClose={() => setSelectedBrandId(null)}
        title={selectedBrandRow?.brandName ?? ''}
        subtitle={
          selectedBrandRow
            ? `${statusText(selectedBrandRow.status)} · Budget ${gbp(selectedBrandRow.budget)} · Spend ${gbp(selectedBrandRow.spend)}`
            : undefined
        }
        testId="ads-brand-detail-drawer"
      >
        {selectedBrandRow && (
          <div className="space-y-6">
            {selectedBrandRow.status === 'not_configured' ? (
              <div className="border border-hairline bg-surface rounded-md p-3 text-[14px] text-secondary">
                No Amazon Ads budget row is configured for this brand yet. Setting a monthly budget creates its initial active budget configuration.
              </div>
            ) : (
              <dl className="grid grid-cols-2 gap-3 text-[14px]">
                <div className="border border-hairline rounded-md p-3">
                  <dt className="text-[11px] uppercase tracking-[0.06em] text-faint">Monthly budget</dt>
                  <dd className="mt-1 font-mono font-semibold text-ink-950">{gbp(selectedBrandRow.budget)}</dd>
                </div>
                <div className="border border-hairline rounded-md p-3">
                  <dt className="text-[11px] uppercase tracking-[0.06em] text-faint">Spend to date</dt>
                  <dd className="mt-1 font-mono font-semibold text-ink-950">{gbp(selectedBrandRow.spend)}</dd>
                </div>
                <div className="border border-hairline rounded-md p-3">
                  <dt className="text-[11px] uppercase tracking-[0.06em] text-faint">ACOS</dt>
                  <dd className="mt-1 font-mono font-semibold text-ink-950">{pct(selectedBrandRow.acos)}</dd>
                </div>
                <div className="border border-hairline rounded-md p-3">
                  <dt className="text-[11px] uppercase tracking-[0.06em] text-faint">TACOS</dt>
                  <dd className="mt-1 font-mono font-semibold text-ink-950">{pct(selectedBrandRow.tacos)}</dd>
                </div>
              </dl>
            )}

            {/* Manual monthly budget editor (RBAC gated) */}
            <div className="border-t border-hairline pt-4 space-y-2.5">
              <h3 className="text-[14px] font-semibold text-ink-950">Manual monthly budget</h3>
              {!canStaffMutate ? (
                <p className="text-[12px] text-faint">
                  View-only staff session ({actingStaffLabel}): monthly budget edits require Full admin permission.
                </p>
              ) : editingBudgetBrandId === selectedBrandRow.brandId ? (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={budgetDraft}
                    onChange={(e) => setBudgetDraft(e.target.value)}
                    aria-label="Monthly budget in GBP"
                    className="w-40 px-3 py-1.5 text-[14px] font-mono border border-hairline-strong rounded-md bg-surface-raised text-ink-950 focus:outline-2 focus:outline-[var(--mr-accent)]"
                  />
                  <button
                    type="button"
                    disabled={budgetBusy}
                    onClick={() => void handleSaveBudget(selectedBrandRow.brandId)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--mr-accent)] text-on-dark text-[12px] font-medium hover:bg-[var(--mr-accent-600)] disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save budget
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingBudgetBrandId(null)}
                    className="px-3 py-1.5 rounded-md border border-hairline bg-surface-raised text-secondary text-[12px] font-medium hover:bg-surface"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditingBudgetBrandId(selectedBrandRow.brandId);
                    setBudgetDraft(String(selectedBrandRow.budget));
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-hairline-strong bg-surface-raised text-ink-900 text-[12px] font-medium hover:bg-surface"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Set monthly budget
                </button>
              )}
            </div>

            {/* Brand campaigns */}
            <div className="border-t border-hairline pt-4 space-y-2.5">
              <h3 className="text-[14px] font-semibold text-ink-950">Campaigns</h3>
              <ConsoleTable
                rows={campaignsByBrand.get(selectedBrandRow.brandId) ?? []}
                columns={campaignColumns}
                rowKey={(c) => c.id}
                onRowClick={(c) => setSelectedCampaign(c)}
                emptyTitle="No campaigns"
                emptyDescription="No campaigns configured for this brand."
              />
            </div>

            {/* Brand budget recommendations */}
            <div className="border-t border-hairline pt-4 space-y-2.5">
              <h3 className="text-[14px] font-semibold text-ink-950">Budget recommendations</h3>
              {renderRecommendationList(
                (recommendationsByBrand.get(selectedBrandRow.brandId) ?? [])
                  .slice()
                  .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
                canStaffMutate
              )}
            </div>
          </div>
        )}
      </SlideOverDrawer>

      {/* Campaign Detail Slide-Over Drawer */}
      <SlideOverDrawer
        open={selectedCampaign !== null}
        onClose={() => setSelectedCampaign(null)}
        title={selectedCampaign?.name ?? ''}
        subtitle={selectedCampaign ? `${selectedCampaign.placement} · ${selectedCampaign.status}` : undefined}
        testId="ads-campaign-detail-drawer"
      >
        {selectedCampaign && (
          <dl className="grid grid-cols-2 gap-3 text-[14px]">
            {[
              ['Status', selectedCampaign.status],
              ['Placement', selectedCampaign.placement],
              ['Monthly budget', gbp(selectedCampaign.monthlyBudgetGbp)],
              ['Spend to date', gbp(selectedCampaign.spendToDateGbp)],
              ['Impressions', selectedCampaign.impressions.toLocaleString('en-GB')],
              ['Clicks', selectedCampaign.clicks.toLocaleString('en-GB')],
              [
                'CTR',
                pct(
                  selectedCampaign.impressions > 0
                    ? selectedCampaign.clicks / selectedCampaign.impressions
                    : 0
                ),
              ],
              ['Attributed sales', gbp(selectedCampaign.attributedSalesGbp)],
              ['ACOS', pct(selectedCampaign.acos)],
            ].map(([label, val]) => (
              <div key={String(label)} className="border border-hairline rounded-md p-3">
                <dt className="text-[11px] uppercase tracking-[0.06em] text-faint">{label}</dt>
                <dd className="mt-1 font-mono font-semibold text-ink-950">{val}</dd>
              </div>
            ))}
          </dl>
        )}
      </SlideOverDrawer>
    </div>
  );
}
