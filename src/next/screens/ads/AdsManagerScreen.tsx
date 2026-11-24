import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useApp } from '@/context/GlobalStateContext';
import { useAdCampaigns, useAdSpendBudgets, useAdSpendRecommendations, useBrands } from '@/data/queries';
import { reviewAdSpendRecommendation, setAdSpendBudget } from '@/data/api';
import { scopedBrandId } from '@/lib/auth/rbac';
import { useIntegrations } from '@/integrations/IntegrationsContext';
import { INTEGRATION_MODE_LABELS } from '@/integrations/types';
import type { AdCampaign, AdSpendBudget, AdSpendRecommendation } from '@/types';
import { resolveAdsSurfacePolicy, type AdsScope, type AdsVertical } from '@/next/adsConfig';
import { AdsManagerView, type AdsPortfolioRow } from './AdsManagerView';

export function AdsManagerScreen({
  vertical,
  scope,
  brandId,
  allowedBrandIds,
}: {
  vertical: AdsVertical;
  scope: AdsScope;
  brandId?: string;
  allowedBrandIds?: Set<string> | null;
}) {
  const qc = useQueryClient();
  const { session, brandProfile, actingStaffId, actingStaff, canCurrentUserMutate } = useApp();
  const { modes } = useIntegrations();
  const budgetsQ = useAdSpendBudgets();
  const campaignsQ = useAdCampaigns();
  const recsQ = useAdSpendRecommendations();
  const brandsQ = useBrands();
  const policy = resolveAdsSurfacePolicy(vertical, scope);
  const tenantId = brandId ?? scopedBrandId(session);

  const portfolioRows = useMemo<AdsPortfolioRow[]>(() => {
    const byBrand = new Map<string, AdSpendBudget>();
    for (const row of budgetsQ.data?.data ?? []) byBrand.set(row.brandId, row);
    return (brandsQ.data?.data ?? [])
      .filter((b) => !allowedBrandIds || allowedBrandIds.has(b.id))
      .map((b) => {
        const a = byBrand.get(b.id);
        const budget = a?.monthlyBudgetGbp ?? 0;
        const spend = a?.spendToDateGbp ?? 0;
        return {
          brandId: b.id,
          brandName: b.profile?.businessName ?? b.id,
          budget,
          spend,
          remaining: Math.max(0, budget - spend),
          utilPct: budget > 0 ? spend / budget : 0,
          acos: a?.acos ?? null,
          tacos: a?.tacos ?? null,
          status: a?.status ?? 'not_configured',
        };
      });
  }, [brandsQ.data, budgetsQ.data, allowedBrandIds]);

  const { campaignsByBrand, recsByBrand } = useMemo(() => {
    const cMap = new Map<string, AdCampaign[]>();
    for (const c of campaignsQ.data?.data ?? []) cMap.set(c.brandId, [...(cMap.get(c.brandId) ?? []), c]);
    const rMap = new Map<string, AdSpendRecommendation[]>();
    for (const r of recsQ.data?.data ?? []) rMap.set(r.brandId, [...(rMap.get(r.brandId) ?? []), r]);
    return { campaignsByBrand: cMap, recsByBrand: rMap };
  }, [campaignsQ.data, recsQ.data]);

  const invalidateAll = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['ad-spend'] }),
      qc.invalidateQueries({ queryKey: ['ad-campaigns'] }),
      qc.invalidateQueries({ queryKey: ['ad-recommendations'] }),
      qc.invalidateQueries({ queryKey: ['audit-log'] }),
    ]);

  return (
    <AdsManagerView
      policy={policy}
      isLoading={budgetsQ.isPending || campaignsQ.isPending || recsQ.isPending || (policy.scope === 'admin' && brandsQ.isPending)}
      isError={budgetsQ.isError || campaignsQ.isError || recsQ.isError || (policy.scope === 'admin' && brandsQ.isError)}
      errorMessage={String(budgetsQ.error ?? campaignsQ.error ?? recsQ.error ?? brandsQ.error ?? '') || undefined}
      onRetry={() => { void budgetsQ.refetch(); void campaignsQ.refetch(); void recsQ.refetch(); void brandsQ.refetch(); }}
      isLiveIntegration={modes.amazon_ads === 'live'}
      integrationModeLabel={modes.amazon_ads ? INTEGRATION_MODE_LABELS[modes.amazon_ads] : 'available'}
      tenantId={tenantId}
      brandName={brandProfile?.businessName || tenantId || 'Your brand'}
      brandBudget={(budgetsQ.data?.data ?? []).find((b) => b.brandId === tenantId) ?? null}
      brandCampaigns={tenantId ? campaignsByBrand.get(tenantId) ?? [] : []}
      brandRecommendations={(tenantId ? recsByBrand.get(tenantId) ?? [] : []).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))}
      portfolioRows={portfolioRows}
      campaignsByBrand={campaignsByBrand}
      recommendationsByBrand={recsByBrand}
      canStaffMutate={canCurrentUserMutate}
      actingStaffLabel={actingStaff?.name ?? actingStaffId}
      onSaveBudget={async (brandId, value) => {
        const res = await setAdSpendBudget(brandId, value, actingStaffId);
        await invalidateAll();
        return res.ok ? { ok: true, message: `Monthly budget saved to £${value.toLocaleString('en-GB')}.` } : { ok: false, error: res.error };
      }}
      onDecideRecommendation={async (recId, decision, opts) => {
        const res = await reviewAdSpendRecommendation(recId, decision, { ...opts, actorId: policy.scope === 'brand' ? (tenantId ?? 'unattributed') : actingStaffId });
        await invalidateAll();
        return res.ok ? { ok: true, message: `Decision recorded — final budget £${(res.recommendation?.amendedBudgetGbp ?? 0).toLocaleString('en-GB')}/mo.` } : { ok: false, error: res.error };
      }}
    />
  );
}
