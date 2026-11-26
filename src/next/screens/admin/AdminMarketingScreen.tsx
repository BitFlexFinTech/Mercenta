/**
 * §WAVE 3d (2026-11-25) — admin marketing (data).
 * Reads the canonical campaigns across every brand. Read-only: the Ads Manager owns
 * campaign status changes, and this screen does not duplicate that action.
 */
import { useMemo, useState } from 'react';
import { useAdCampaigns, useBrands } from '@/data/queries';
import { AdminMarketingView, type AdminMarketingRow } from './AdminMarketingView';

export function AdminMarketingScreen() {
  const campaignsQ = useAdCampaigns();
  const brandsQ = useBrands();

  const [brandFilter, setBrandFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AdminMarketingRow | null>(null);

  /* §FRONTEND-REDESIGN BATCH 3 — memoised at source (stable identity for deps). */
  const campaigns = useMemo(() => campaignsQ.data?.data ?? [], [campaignsQ.data]);
  const brands = useMemo(() => brandsQ.data?.data ?? [], [brandsQ.data]);

  const allRows = useMemo<AdminMarketingRow[]>(
    () =>
      campaigns.map((campaign) => ({
        id: campaign.id,
        brandId: campaign.brandId,
        brandName:
          brands.find((brand) => brand.id === campaign.brandId)?.profile.businessName ??
          campaign.brandId,
        name: campaign.name,
        status: campaign.status,
        monthlyBudgetGbp: campaign.monthlyBudgetGbp,
        spendToDateGbp: campaign.spendToDateGbp,
        impressions: campaign.impressions,
        clicks: campaign.clicks,
        attributedSalesGbp: campaign.attributedSalesGbp,
      })),
    [campaigns, brands]
  );

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allRows
      .filter((row) => brandFilter === 'all' || row.brandId === brandFilter)
      .filter((row) => statusFilter === 'all' || row.status === statusFilter)
      .filter((row) =>
        query ? `${row.name} ${row.brandName}`.toLowerCase().includes(query) : true
      );
  }, [allRows, brandFilter, statusFilter, search]);

  const statusOptions = useMemo(
    () => Array.from(new Set(allRows.map((row) => row.status))).sort(),
    [allRows]
  );

  return (
    <AdminMarketingView
      rows={rows}
      totalCampaigns={allRows.length}
      brandOptions={brands.map((brand) => ({ id: brand.id, name: brand.profile.businessName }))}
      statusOptions={statusOptions}
      brandFilter={brandFilter}
      statusFilter={statusFilter}
      search={search}
      totalBudget={allRows.reduce((total, row) => total + row.monthlyBudgetGbp, 0)}
      totalSpend={allRows.reduce((total, row) => total + row.spendToDateGbp, 0)}
      totalAttributed={allRows.reduce((total, row) => total + row.attributedSalesGbp, 0)}
      activeCount={allRows.filter((row) => row.status === 'active').length}
      selected={selected}
      isLoading={campaignsQ.isPending || brandsQ.isPending}
      isError={campaignsQ.isError || brandsQ.isError}
      errorMessage={String(campaignsQ.error ?? brandsQ.error ?? '') || undefined}
      onRetry={() => {
        void campaignsQ.refetch();
        void brandsQ.refetch();
      }}
      onChangeBrand={setBrandFilter}
      onChangeStatus={setStatusFilter}
      onChangeSearch={setSearch}
      onSelect={setSelected}
    />
  );
}