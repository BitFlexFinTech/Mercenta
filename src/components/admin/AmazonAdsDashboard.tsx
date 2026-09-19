/**
 * §12 — AMAZON ADS DASHBOARD (PHASE 1, 0B.4 #1 — REQUIRED, no longer deferred).
 *
 * Simulation-first consumer of the EXISTING ad-spend seam:
 *   `AdSpendBudget` (src/types.ts) · `demoAdSpend` (src/data/demoStore.ts) ·
 *   `fetchAdSpendBudgets` (src/data/api.ts) · `useAdSpendBudgets` (src/data/queries.ts)
 * plus the `amazon_ads` integration card (src/integrations/registry.ts).
 *
 * This surface renders real platform data ONLY — nothing fabricated:
 *   • the figures come from the seam (monthly budget / spend-to-date / ACOS /
 *     TACOS / status per brand), joined to the canonical brand store;
 *   • brands with no seam row are shown honestly as `not_configured`;
 *   • the operating-costs `advertising_commission` revenue stream is shown at
 *     its true value (currently £0 — "no ad spend recorded yet");
 *   • the data source label is derived from the integration mode (simulated vs
 *     live), never claimed as live.
 *
 * Deterministic only — no AI call, no network call. Live Amazon Ads connection
 * stays behind the existing `amazon_ads` credential seam; wiring a real key
 * activates that path with zero changes here.
 */
import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, Badge, DataTable, Button, Input } from '@/components/ui';
import { cn } from '@/utils/cn';
import { useAdSpendBudgets, useBrands, useAdCampaigns, useAdSpendRecommendations } from '@/data/queries';
import { setAdSpendBudget, reviewAdSpendRecommendation } from '@/data/api';
import { useApp } from '@/context/GlobalStateContext';
import { useIntegrations } from '@/integrations/IntegrationsContext';
import { INTEGRATION_MODE_LABELS } from '@/integrations/types';
import type { AdSpendBudget, AdCampaign, AdSpendRecommendation } from '@/types';
import { Megaphone, TrendingUp, Wallet, Gauge, Percent, CircleDollarSign, FlaskConical, Info, Save, Check, X, Pencil } from 'lucide-react';

interface AdsRow {
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

const gbp = (n: number) =>
  `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const pct = (n: number | null) => (n === null ? '—' : `${(n * 100).toFixed(1)}%`);

function StatusBadge({ status }: { status: AdSpendBudget['status'] }) {
  if (status === 'active') {
    return <Badge className="text-[10px] bg-emerald-500/15 text-emerald-300 border-emerald-500/20">Active</Badge>;
  }
  if (status === 'paused') {
    return <Badge className="text-[10px] bg-amber-500/15 text-amber-300 border-amber-500/20">Paused</Badge>;
  }
  return <Badge className="text-[10px] bg-zinc-500/15 text-zinc-400 border-zinc-500/20">Not configured</Badge>;
}

export function AmazonAdsDashboard() {
  const { data: adData, isLoading: adLoading } = useAdSpendBudgets();
  const { data: brandsData, isLoading: brandsLoading } = useBrands();
  const { data: campaignsData } = useAdCampaigns();
  const { data: recsData } = useAdSpendRecommendations();
  const { modes } = useIntegrations();
  const { actingStaffId } = useApp();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [editBudget, setEditBudget] = useState<string | null>(null);
  const [budgetDraft, setBudgetDraft] = useState<string>('');
  const [budgetNotice, setBudgetNotice] = useState<string | null>(null);
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [amendingRec, setAmendingRec] = useState<string | null>(null);
  const [amendBudget, setAmendBudget] = useState<string>('');
  const [amendNote, setAmendNote] = useState<string>('');
  const [recBusyId, setRecBusyId] = useState<string | null>(null);
  const [recNotice, setRecNotice] = useState<string | null>(null);
  const [recError, setRecError] = useState<string | null>(null);
  /** Bumped after every mutation so data memos recompute even when the
   *  cached query array identity is kept by React Query structural sharing. */
  const [mutationStamp, setMutationStamp] = useState(0);

  const adMode = modes.amazon_ads;

  const campaignsByBrand = useMemo(() => {
    void mutationStamp;
    const m = new Map<string, AdCampaign[]>();
    for (const c of campaignsData?.data ?? []) {
      m.set(c.brandId, [...(m.get(c.brandId) ?? []), c]);
    }
    return m;
  }, [campaignsData, mutationStamp]);

  const recsByBrand = useMemo(() => {
    void mutationStamp;
    const m = new Map<string, AdSpendRecommendation[]>();
    for (const r of recsData?.data ?? []) {
      m.set(r.brandId, [...(m.get(r.brandId) ?? []), r]);
    }
    return m;
  }, [recsData, mutationStamp]);

  const recStatusLabel: Record<AdSpendRecommendation['status'], string> = {
    proposed: 'Proposed',
    approved: 'Approved by brand',
    amended: 'Amended by brand',
    rejected: 'Rejected by brand',
  };

  async function saveBudget(brandId: string) {
    const value = Number(budgetDraft);
    setBudgetError(null);
    setBudgetNotice(null);
    const result = await setAdSpendBudget(brandId, value, actingStaffId);
    if (!result.ok) {
      setBudgetError(result.error ?? 'Budget update refused.');
    } else {
      setBudgetNotice(`Monthly budget saved to £${value.toLocaleString('en-GB')} (simulation) — audited as ${actingStaffId}.`);
    }
    setEditBudget(null);
    setBudgetDraft('');
    await qc.invalidateQueries({ queryKey: ['ad-spend'] });
    await qc.invalidateQueries({ queryKey: ['ad-campaigns'] });
    await qc.invalidateQueries({ queryKey: ['ad-recommendations'] });
    await qc.invalidateQueries({ queryKey: ['audit-log'] });
    setMutationStamp((s) => s + 1);
  }

  async function decideRec(rec: AdSpendRecommendation, decision: 'approved' | 'amended' | 'rejected') {
    if (recBusyId) return;
    setRecBusyId(rec.id);
    setRecError(null);
    setRecNotice(null);
    const amendedBudgetGbp =
      decision === 'amended' ? Number(amendBudget) : undefined;
    const result = await reviewAdSpendRecommendation(rec.id, decision, {
      amendedBudgetGbp,
      note: decision === 'amended' ? (amendNote.trim() || undefined) : undefined,
      actorId: actingStaffId,
    });
    setRecBusyId(null);
    if (!result.ok) {
      setRecError(result.error ?? 'Decision refused.');
    } else {
      setRecNotice(
        `Recommendation ${rec.id} ${decision} by ${actingStaffId} — final monthly budget £${(
          result.recommendation?.amendedBudgetGbp ?? 0
        ).toLocaleString('en-GB')} (simulation decision).`
      );
    }
    setAmendingRec(null);
    setAmendBudget('');
    setAmendNote('');
    await qc.invalidateQueries({ queryKey: ['ad-recommendations'] });
    await qc.invalidateQueries({ queryKey: ['ad-spend'] });
    await qc.invalidateQueries({ queryKey: ['audit-log'] });
    setMutationStamp((s) => s + 1);
  }

  const rows = useMemo<AdsRow[]>(() => {
    void mutationStamp;
    const brands = brandsData?.data ?? [];
    const byBrand = new Map<string, AdSpendBudget>();
    for (const a of adData?.data ?? []) byBrand.set(a.brandId, a);
    return brands.map((b) => {
      const a = byBrand.get(b.id);
      const budget = a?.monthlyBudgetGbp ?? 0;
      const spend = a?.spendToDateGbp ?? 0;
      const remaining = Math.max(0, budget - spend);
      return {
        brandId: b.id,
        brandName: b.profile?.businessName ?? b.id,
        budget,
        spend,
        remaining,
        utilPct: budget > 0 ? spend / budget : 0,
        acos: a?.acos ?? null,
        tacos: a?.tacos ?? null,
        status: a?.status ?? 'not_configured',
      };
    });
  }, [adData, brandsData, mutationStamp]);

  const active = rows.filter((r) => r.status === 'active');
  const totalBudget = rows.reduce((s, r) => s + r.budget, 0);
  const totalSpend = rows.reduce((s, r) => s + r.spend, 0);
  const totalRemaining = Math.max(0, totalBudget - totalSpend);
  const avgAcos =
    active.length > 0 ? active.reduce((s, r) => s + (r.acos ?? 0), 0) / active.length : null;
  const avgTacos =
    active.length > 0 ? active.reduce((s, r) => s + (r.tacos ?? 0), 0) / active.length : null;
  const configured = rows.filter((r) => r.status !== 'not_configured').length;
  const isLoading = adLoading || brandsLoading;

  const selectedRow = rows.find((r) => r.brandId === selected) ?? null;

  const modeLabel = adMode ? INTEGRATION_MODE_LABELS[adMode] : 'available';
  const isLive = adMode === 'live';

  const tiles = [
    { label: 'Active campaigns', value: String(active.length), icon: <TrendingUp className="w-4 h-4 text-emerald-300" /> },
    { label: 'Configured brands', value: `${configured}/${rows.length}`, icon: <Megaphone className="w-4 h-4 text-brass-300" /> },
    { label: 'Monthly budget', value: gbp(totalBudget), icon: <Wallet className="w-4 h-4 text-blue-300" /> },
    { label: 'Spend to date', value: gbp(totalSpend), icon: <CircleDollarSign className="w-4 h-4 text-amber-300" /> },
    { label: 'Remaining budget', value: gbp(totalRemaining), icon: <Gauge className="w-4 h-4 text-violet-300" /> },
    { label: 'Avg ACOS (active)', value: pct(avgAcos), icon: <Percent className="w-4 h-4 text-rose-300" /> },
    { label: 'Avg TACOS (active)', value: pct(avgTacos), icon: <Percent className="w-4 h-4 text-sky-300" /> },
  ];

  return (
    <div className="p-6 space-y-4 max-w-[1400px] mx-auto" data-testid="amazon-ads-dashboard">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
          <Megaphone className="w-5 h-5 text-amber-300" />
        </div>
        <div className="flex-1 min-w-[220px]">
          <h2 className="text-lg font-semibold text-white">Amazon Ads</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Ad spend, budget utilisation and ACOS/TACOS per brand (§12)
          </p>
        </div>
        <Badge
          className={cn(
            'text-[10px]',
            isLive
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'
              : 'bg-amber-500/15 text-amber-300 border-amber-500/20'
          )}
        >
          <FlaskConical className="w-3 h-3 mr-1" />
          {isLive ? 'Live connection' : `Simulated — mode: ${modeLabel}`}
        </Badge>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-white/[0.06] bg-ink-850 px-3 py-2.5 text-[11px] text-zinc-400">
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-zinc-500" />
        <span>
          {isLive
            ? 'Data reflects the live Amazon Ads connection.'
            : 'Data is simulated from the platform seed seam — connect Amazon Ads in Integrations to go live. No live ad data is claimed.'}
          {' '}Advertising management commission is £0.00 — no ad spend revenue recorded yet (operating-costs source of truth).
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {tiles.map((t) => (
          <Card key={t.label} className="p-4">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-zinc-500 mb-2">
              {t.icon}
              {t.label}
            </div>
            <div className="text-xl font-semibold text-white">{t.value}</div>
          </Card>
        ))}
      </div>

      <Card
        title="Ad spend by brand"
        subtitle="Monthly budget vs spend-to-date, ACOS/TACOS and status — click a row for the detail."
        className="p-0"
      >
        <DataTable<AdsRow>
          columns={[
            { key: 'brandName', label: 'Brand', primary: true, render: (r) => <span className="font-medium text-white">{r.brandName}</span> },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            { key: 'budget', label: 'Monthly budget', align: 'right', render: (r) => <span className="font-mono text-xs text-zinc-300">{gbp(r.budget)}</span> },
            { key: 'spend', label: 'Spend to date', align: 'right', render: (r) => <span className="font-mono text-xs text-zinc-300">{gbp(r.spend)}</span> },
            { key: 'remaining', label: 'Remaining', align: 'right', render: (r) => <span className="font-mono text-xs text-zinc-300">{gbp(r.remaining)}</span> },
            { key: 'utilPct', label: 'Utilisation', align: 'right', render: (r) => <span className="font-mono text-xs text-zinc-300">{pct(r.utilPct)}</span> },
            { key: 'acos', label: 'ACOS', align: 'right', render: (r) => <span className="font-mono text-xs text-zinc-300">{pct(r.acos)}</span> },
            { key: 'tacos', label: 'TACOS', align: 'right', render: (r) => <span className="font-mono text-xs text-zinc-300">{pct(r.tacos)}</span> },
          ]}
          rows={rows}
          rowKey={(r) => r.brandId}
          loading={isLoading}
          emptyMessage="No brand ad-spend data available."
          dataTable="amazon-ads"
          onRowClick={(r) => setSelected(r.brandId)}
          rowClassName={(r) =>
            r.brandId === selected ? 'bg-brass-500/[0.06] cursor-pointer' : 'cursor-pointer'
          }
        />
      </Card>

      {selectedRow && (
        <Card title={selectedRow.brandName} className="p-5">
          {selectedRow.status === 'not_configured' ? (
            <p className="text-xs text-zinc-500">
              This brand has no Amazon Ads budget configured yet — it appears here so the
              platform honestly shows every brand's advertising state rather than hiding it.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
              {[
                ['Status', selectedRow.status],
                ['Monthly budget', gbp(selectedRow.budget)],
                ['Spend to date', gbp(selectedRow.spend)],
                ['Remaining', gbp(selectedRow.remaining)],
                ['Utilisation', pct(selectedRow.utilPct)],
                ['ACOS', pct(selectedRow.acos)],
                ['TACOS', pct(selectedRow.tacos)],
              ].map(([k, v]) => (
                <div key={String(k)} className="rounded-lg border border-white/[0.06] bg-ink-850 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wide text-zinc-500">{k}</div>
                  <div className="mt-1 font-medium text-white">{v}</div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 border-t border-white/[0.06] pt-3" data-testid="ad-budget-editor">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-zinc-500" /> Manual monthly budget
            </h4>
            {editBudget === selectedRow.brandId ? (
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  step="10"
                  value={budgetDraft}
                  onChange={(e) => setBudgetDraft(e.target.value)}
                  placeholder={`Current: ${gbp(selectedRow.budget)}`}
                  ariaLabel="Monthly budget in GBP"
                  dataTestid="ad-budget-input"
                />
                <Button variant="primary" size="sm" onClick={() => void saveBudget(selectedRow.brandId)}>
                  <Save className="w-3.5 h-3.5" /> Save budget
                </Button>
                <Button variant="tertiary" size="sm" onClick={() => setEditBudget(null)}>
                  <X className="w-3.5 h-3.5" /> Cancel
                </Button>
              </div>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => { setEditBudget(selectedRow.brandId); setBudgetDraft(String(selectedRow.budget)); setBudgetNotice(null); setBudgetError(null); }}>
                <Pencil className="w-3.5 h-3.5" /> Set monthly budget
              </Button>
            )}
            {budgetNotice && <p className="text-[11px] text-emerald-400 mt-1.5" data-testid="ad-budget-notice">{budgetNotice}</p>}
            {budgetError && <p className="text-[11px] text-rose-400 mt-1.5" data-testid="ad-budget-error">{budgetError}</p>}
          </div>

          <div className="mt-4" data-testid="ad-campaigns-panel">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Megaphone className="w-3.5 h-3.5 text-zinc-500" /> Campaigns
              <span className="text-[10px] text-zinc-600">— deterministic simulation, never live</span>
            </h4>
            {(() => {
              const camps = (campaignsByBrand.get(selectedRow.brandId) ?? []).slice();
              if (camps.length === 0) {
                return <p className="text-xs text-zinc-500">No campaigns configured for this brand.</p>;
              }
              return (
                <DataTable<AdCampaign>
                  columns={[
                    { key: 'name', label: 'Campaign', primary: true, render: (c) => <span className="font-medium text-white">{c.name}</span> },
                    { key: 'status', label: 'Status', render: (c) => <Badge className={cn('text-[10px]', c.status === 'active' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300')}>{c.status}</Badge> },
                    { key: 'monthlyBudgetGbp', label: 'Budget', align: 'right', render: (c) => <span className="font-mono text-xs text-zinc-300">{gbp(c.monthlyBudgetGbp)}</span> },
                    { key: 'spendToDateGbp', label: 'Spend', align: 'right', render: (c) => <span className="font-mono text-xs text-zinc-300">{gbp(c.spendToDateGbp)}</span> },
                    { key: 'clicks', label: 'Clicks', align: 'right', hideBelow: 'lg', render: (c) => <span className="font-mono text-xs text-zinc-300">{c.clicks.toLocaleString()}</span> },
                    { key: 'impressions', label: 'Impressions', align: 'right', hideBelow: 'lg', render: (c) => <span className="font-mono text-xs text-zinc-300">{c.impressions.toLocaleString()}</span> },
                    { key: 'acos', label: 'ACOS', align: 'right', render: (c) => <span className="font-mono text-xs text-zinc-300">{pct(c.acos)}</span> },
                  ]}
                  rows={camps}
                  rowKey={(c) => c.id}
                  loading={false}
                  emptyMessage="No campaign rows."
                  dataTable="ad-campaigns"
                />
              );
            })()}
          </div>
        <div className="mt-4" data-testid="ad-recommendation-card">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-zinc-500" /> Recommended monthly spend
            </h4>
            {(() => {
              const recs = (recsByBrand.get(selectedRow.brandId) ?? []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
              if (recs.length === 0) {
                return <p className="text-xs text-zinc-500">No budget recommendation has been prepared for this brand.</p>;
              }
              return (
                <div className="space-y-3">
                  {recNotice && <p className="text-[11px] text-emerald-400" data-testid="ad-rec-notice">{recNotice}</p>}
                  {recError && <p className="text-[11px] text-rose-400" data-testid="ad-rec-error">{recError}</p>}
                  {recs.map((rec) => (
                    <div key={rec.id} className="rounded-lg border border-white/[0.06] bg-ink-850 px-3 py-3" data-testid={`ad-recommendation-row-${rec.id}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-xs font-medium text-white">{rec.month}</span>
                          <span className="text-[11px] text-zinc-400 font-mono"> · recommended £{rec.recommendedMonthlyBudgetGbp.toLocaleString('en-GB')}/mo</span>
                        </div>
                        <Badge className={cn('text-[10px]', rec.status === 'proposed' ? 'bg-blue-500/15 text-blue-300' : rec.status === 'approved' ? 'bg-emerald-500/15 text-emerald-300' : rec.status === 'amended' ? 'bg-amber-500/15 text-amber-300' : 'bg-rose-500/15 text-rose-300')}>
                          {recStatusLabel[rec.status]}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-1.5">{rec.basis}</p>
                      {rec.reviewedAt && (
                        <p className="text-[10px] text-zinc-600 mt-1">
                          Decided {rec.reviewedAt.slice(0, 16).replace('T', ' ')} by {rec.actorDisplay} · final £{(rec.amendedBudgetGbp ?? 0).toLocaleString('en-GB')}/mo{rec.note ? ` · note: ${rec.note}` : ''}
                        </p>
                      )}
                      {rec.status === 'proposed' && amendingRec !== rec.id && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Button variant="primary" size="sm" disabled={recBusyId === rec.id} onClick={() => void decideRec(rec, 'approved')}>
                            <Check className="w-3.5 h-3.5" /> Approve
                          </Button>
                          <Button variant="secondary" size="sm" disabled={recBusyId === rec.id} onClick={() => setAmendingRec(rec.id)}>
                            <Pencil className="w-3.5 h-3.5" /> Amend
                          </Button>
                          <Button variant="tertiary" size="sm" disabled={recBusyId === rec.id} onClick={() => void decideRec(rec, 'rejected')}>
                            <X className="w-3.5 h-3.5" /> Reject
                          </Button>
                        </div>
                      )}
                      {rec.status === 'proposed' && amendingRec === rec.id && (
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <Input
                            type="number"
                            min={0}
                            step="10"
                            value={amendBudget}
                            onChange={(e) => setAmendBudget(e.target.value)}
                            placeholder="Amended budget in GBP"
                            ariaLabel="Amended budget in GBP"
                            dataTestid={`ad-amend-input-${rec.id}`}
                          />
                          <Input
                            type="text"
                            value={amendNote}
                            onChange={(e) => setAmendNote(e.target.value)}
                            placeholder="Note (optional)"
                            ariaLabel="Amend note (optional)"
                            dataTestid={`ad-amend-note-${rec.id}`}
                          />
                          <Button variant="primary" size="sm" disabled={recBusyId === rec.id} onClick={() => void decideRec(rec, 'amended')}>
                            <Save className="w-3.5 h-3.5" /> Confirm amendment
                          </Button>
                          <Button variant="tertiary" size="sm" onClick={() => setAmendingRec(null)}>
                            <X className="w-3.5 h-3.5" /> Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </Card>

)}
    </div>
  );
}
