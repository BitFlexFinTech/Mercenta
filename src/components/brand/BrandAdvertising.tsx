/**
 * §Functional-completion (2026-09-17) — Brand-side advertising surface.
 *
 * The brand sees ONLY its own tenant's advertising state (budget, spend,
 * campaigns, Mercenta's recommended monthly budget). The wording stays
 * brand-facing ("advertising performance", "channel advertising") — the
 * underlying provider is an integration detail, never the headline here.
 *
 * Simulation-first: every figure is deterministic seed or a decision the
 * brand made this session; nothing is ever presented as live ad data.
 * The brand's Approve / Amend / Reject on a recommendation is the
 * attribution point — no budget is treated as granted until the brand
 * explicitly decides (mirrors the payout approval rule).
 */
import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useApp } from '@/context/GlobalStateContext';
import { useAdSpendBudgets, useAdCampaigns, useAdSpendRecommendations } from '@/data/queries';
import { reviewAdSpendRecommendation } from '@/data/api';
import { scopedBrandId } from '@/lib/auth/rbac';
import { Badge, Button, Card, DataTable, Input, LoadingState, Skeleton } from '@/components/ui';
import { cn } from '@/utils/cn';
import type { AdCampaign, AdSpendRecommendation } from '@/types';
import { WorkspaceFrame, WorkspaceHeader } from '@/components/shared/workspace';
import {
  Wallet, Gauge, Percent, CircleDollarSign,
  Save, Check, X, Pencil, TrendingUp, Info,
} from 'lucide-react';

const gbp = (n: number) =>
  `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const pct = (n: number | null) => (n === null ? '—' : `${(n * 100).toFixed(1)}%`);

const REC_STATUS_LABEL: Record<AdSpendRecommendation['status'], string> = {
  proposed: 'Awaiting your decision',
  approved: 'Approved by you',
  amended: 'Amended by you',
  rejected: 'Rejected by you',
};

export function BrandAdvertising() {
  const { session, brandProfile } = useApp();
  const qc = useQueryClient();
  const tenantId = scopedBrandId(session);
  const brandName = brandProfile?.businessName ?? (tenantId ?? 'Your brand');

  const { data: adData, isPending: adsPending } = useAdSpendBudgets();
  const { data: campaignsData, isPending: campaignsPending } = useAdCampaigns();
  const { data: recsData, isPending: recsPending } = useAdSpendRecommendations();
  /**
   * §Wave 3 Part 5 — THE ONE LOADING FLAG. Before this, the six KPI tiles
   * asserted £0.00 budget / £0.00 spend / 0.0% utilisation and the campaign
   * panel declared "No campaigns are set up for your brand yet." while the ad
   * queries were still resolving (measured in a real browser with a slow data
   * source: the message was painted during load and gone once loaded).
   */
  const adsLoading = adsPending || campaignsPending || recsPending;

  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [amendingRec, setAmendingRec] = useState<string | null>(null);
  const [amendBudget, setAmendBudget] = useState<string>('');
  const [amendNote, setAmendNote] = useState<string>('');
  const [recBusyId, setRecBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Bumped after every mutation so tenant memos recompute even when the
   *  cached query array identity is kept by React Query structural sharing. */
  const [mutationStamp, setMutationStamp] = useState(0);

  /** Tenant-scoped: a brand row can only ever be this tenant's. */
  const budget = useMemo(
    () => {
      void mutationStamp;
      return (adData?.data ?? []).find((b) => b.brandId === tenantId) ?? null;
    },
    [adData, tenantId, mutationStamp]
  );
  const campaigns = useMemo(
    () => {
      void mutationStamp;
      return (campaignsData?.data ?? []).filter((c) => c.brandId === tenantId);
    },
    [campaignsData, tenantId, mutationStamp]
  );
  const recommendations = useMemo(
    () => {
      void mutationStamp;
      return (recsData?.data ?? [])
        .filter((r) => r.brandId === tenantId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    [recsData, tenantId, mutationStamp]
  );

  const remaining = Math.max(0, (budget?.monthlyBudgetGbp ?? 0) - (budget?.spendToDateGbp ?? 0));
  const utilPct = budget && budget.monthlyBudgetGbp > 0
    ? (budget.spendToDateGbp / budget.monthlyBudgetGbp)
    : 0;

  const selectedCampaignRow = campaigns.find((c) => c.id === selectedCampaign) ?? null;

  async function decideRec(rec: AdSpendRecommendation, decision: 'approved' | 'amended' | 'rejected') {
    if (recBusyId) return;
    setRecBusyId(rec.id);
    setError(null);
    setNotice(null);
    const result = await reviewAdSpendRecommendation(rec.id, decision, {
      amendedBudgetGbp: decision === 'amended' ? Number(amendBudget) : undefined,
      note: decision === 'amended' ? (amendNote.trim() || undefined) : undefined,
      actorId: tenantId ?? 'unattributed',
    });
    setRecBusyId(null);
    if (!result.ok) {
      setError(result.error ?? 'Decision refused.');
    } else {
      setNotice(
        `Your decision is recorded — final monthly advertising budget £${(result.recommendation?.amendedBudgetGbp ?? 0).toLocaleString('en-GB')}.`
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

  if (!tenantId) {
    return (
      <WorkspaceFrame className="space-y-4">
        <WorkspaceHeader
          eyebrow="BRAND PORTAL · ADVERTISING"
          title="Advertising performance"
          description="Budget, spend and campaign performance for your tenant only."
        />
        <Card title="Advertising performance">
          <p className="text-xs text-zinc-600">No advertising surface without a tenant session.</p>
        </Card>
      </WorkspaceFrame>
    );
  }

  const kpis = [
    { label: 'Monthly budget', value: gbp(budget?.monthlyBudgetGbp ?? 0), icon: <Wallet className="w-4 h-4 text-zinc-300" /> },
    { label: 'Spend to date', value: gbp(budget?.spendToDateGbp ?? 0), icon: <CircleDollarSign className="w-4 h-4 text-amber-300" /> },
    { label: 'Remaining budget', value: gbp(remaining), icon: <Gauge className="w-4 h-4 text-violet-300" /> },
    { label: 'Utilisation', value: pct(utilPct), icon: <TrendingUp className="w-4 h-4 text-emerald-300" /> },
    { label: 'ACOS', value: pct(budget?.acos ?? null), icon: <Percent className="w-4 h-4 text-rose-300" /> },
    { label: 'TACOS', value: pct(budget?.tacos ?? null), icon: <Percent className="w-4 h-4 text-sky-300" /> },
];
return (
    <WorkspaceFrame testId="brand-advertising" className="space-y-4">
      <WorkspaceHeader
        eyebrow="BRAND PORTAL · ADVERTISING"
        title="Your advertising performance"
        description={`Budget, spend and campaign performance for ${brandName} — your tenant only.`}
        status={
          <Badge className="text-ds-micro bg-amber-500/15 text-amber-300 border-amber-500/20">
            <Info className="w-3 h-3 mr-1" /> Simulated — no live ad connection
          </Badge>
        }
      />

      {notice && <p className="text-ds-label text-emerald-400" data-testid="ba-notice">{notice}</p>}
      {error && <p className="text-ds-label text-rose-400" data-testid="ba-error">{error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {adsLoading
          ? Array.from({ length: 6 }, (_, i) => (
              <Card key={i} className="p-4" data-state="loading">
                <Skeleton className="mb-2 h-2.5 w-20" />
                <Skeleton className="h-6 w-24" />
              </Card>
            ))
          : kpis.map((t) => (
              <Card key={t.label} className="p-4">
                <div className="flex items-center gap-2 text-ds-micro uppercase tracking-wide text-zinc-500 mb-2">
                  {t.icon}
                  {t.label}
                </div>
                <div className="text-xl font-semibold text-white">{t.value}</div>
              </Card>
            ))}
      </div>

      <Card className="p-0" title="Campaigns" subtitle="Click a campaign row for its detail.">
        {adsLoading ? (
          <LoadingState rows={4} label="Loading campaigns…" />
        ) : campaigns.length === 0 ? (
          <p className="text-xs text-zinc-500 px-3 py-3" data-testid="ba-no-campaigns">No campaigns are set up for your brand yet.</p>
        ) : (
          <DataTable<AdCampaign>
            columns={[
              { key: 'name', label: 'Campaign', primary: true, render: (c) => <span className="font-medium text-white">{c.name}</span> },
              { key: 'status', label: 'Status', render: (c) => <Badge className={cn('text-ds-micro', c.status === 'active' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300')}>{c.status}</Badge> },
              { key: 'monthlyBudgetGbp', label: 'Budget', align: 'right', render: (c) => <span className="font-mono text-xs text-zinc-300">{gbp(c.monthlyBudgetGbp)}</span> },
              { key: 'spendToDateGbp', label: 'Spend', align: 'right', render: (c) => <span className="font-mono text-xs text-zinc-300">{gbp(c.spendToDateGbp)}</span> },
              { key: 'clicks', label: 'Clicks', align: 'right', hideBelow: 'lg', render: (c) => <span className="font-mono text-xs text-zinc-300">{c.clicks.toLocaleString()}</span> },
              { key: 'acos', label: 'ACOS', align: 'right', render: (c) => <span className="font-mono text-xs text-zinc-300">{pct(c.acos)}</span> },
            ]}
            rows={campaigns}
            rowKey={(c) => c.id}
            emptyMessage="No campaign rows."
            dataTable="brand-ad-campaigns"
            onRowClick={(c) => setSelectedCampaign(c.id)}
            rowClassName={(c) => (c.id === selectedCampaign ? 'bg-brass-500/[0.06] cursor-pointer' : 'cursor-pointer')}
          />
        )}
      </Card>

      {selectedCampaignRow && (
        <div data-testid="ba-campaign-detail">
          <Card title={selectedCampaignRow.name} className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-ds-label">
              {[
                ['Status', selectedCampaignRow.status],
                ['Placement', selectedCampaignRow.placement],
                ['Impressions', selectedCampaignRow.impressions.toLocaleString()],
                ['Clicks', selectedCampaignRow.clicks.toLocaleString()],
                ['CTR', pct(selectedCampaignRow.clicks > 0 ? selectedCampaignRow.clicks / selectedCampaignRow.impressions : 0)],
                ['Attributed sales', gbp(selectedCampaignRow.attributedSalesGbp)],
                ['ACOS', pct(selectedCampaignRow.acos)],
                ['Budget', gbp(selectedCampaignRow.monthlyBudgetGbp)],
              ].map(([k, v]) => (
                <div key={String(k)} className="rounded-lg border border-white/[0.06] bg-ink-850 px-3 py-2">
                  <div className="text-ds-micro uppercase tracking-wide text-zinc-500">{k}</div>
                  <div className="mt-1 font-medium text-white">{v}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      <div data-testid="ba-recommendation-card">
        <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-brass-400" /> Recommended monthly advertising budget
        </h3>
        {adsLoading ? (
          <Card className="p-4">
            <LoadingState rows={2} label="Loading your budget recommendation…" />
          </Card>
        ) : recommendations.length === 0 ? (
          <Card className="p-4">
            <p className="text-xs text-zinc-500">Mercenta has not prepared a budget recommendation for you yet.</p>
          </Card>
        ) : (
          <Card className="p-4">
            <p className="text-ds-label text-zinc-500 mb-3">
              Mercenta prepares a recommended monthly budget from deterministic estimates. Nothing is spent until you
              approve, amend or reject it — your decision is recorded and attributed.
            </p>
            <div className="space-y-3">
              {recommendations.map((rec) => (
                <div key={rec.id} className="rounded-lg border border-white/[0.06] bg-ink-850 px-3 py-3" data-testid={`ba-recommendation-row-${rec.id}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-medium text-white">{rec.month}</span>
                      <span className="text-ds-label text-zinc-400 font-mono"> · recommended £{rec.recommendedMonthlyBudgetGbp.toLocaleString('en-GB')}/mo</span>
                    </div>
                    <Badge className={cn('text-ds-micro', rec.status === 'proposed' ? 'bg-blue-500/15 text-blue-300' : rec.status === 'approved' ? 'bg-emerald-500/15 text-emerald-300' : rec.status === 'amended' ? 'bg-amber-500/15 text-amber-300' : 'bg-rose-500/15 text-rose-300')}>
                      {REC_STATUS_LABEL[rec.status]}
                    </Badge>
                  </div>
                  <p className="text-ds-label text-zinc-500 mt-1.5">{rec.basis}</p>
                  {rec.reviewedAt && (
                    <p className="text-ds-micro text-zinc-600 mt-1">
                      Decided {rec.reviewedAt.slice(0, 16).replace('T', ' ')} · final £{(rec.amendedBudgetGbp ?? 0).toLocaleString('en-GB')}/mo{rec.note ? ` · note: ${rec.note}` : ''}
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
                        dataTestid={`ba-amend-input-${rec.id}`}
                      />
                      <Input
                        type="text"
                        value={amendNote}
                        onChange={(e) => setAmendNote(e.target.value)}
                        placeholder="Note (optional)"
                        ariaLabel="Amend note (optional)"
                        dataTestid={`ba-amend-note-${rec.id}`}
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
          </Card>
        )}
      </div>
    </WorkspaceFrame>
  );
}