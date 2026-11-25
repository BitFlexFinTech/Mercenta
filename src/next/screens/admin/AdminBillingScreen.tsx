/**
 * §WAVE 3c (2026-11-25) — admin billing (data).
 * Read-only by DESIGN: the data layer exposes no commission or invoice mutation,
 * so this screen reports and drills down and performs nothing it cannot.
 */
import { useMemo, useState } from 'react';
import { useBrands, useCommissions, useDeductions, useSubscriptions } from '@/data/queries';
import { AdminBillingView, type AdminCommissionRow, type AdminSubscriptionRow } from './AdminBillingView';

export function AdminBillingScreen() {
  const brandsQ = useBrands();
  const commQ = useCommissions();
  const subsQ = useSubscriptions();
  const dedQ = useDeductions();

  const [brandFilter, setBrandFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AdminCommissionRow | null>(null);

  const brands = brandsQ.data?.data ?? [];
  const commissions = commQ.data?.data ?? [];
  const subscriptions = subsQ.data?.data ?? [];
  const deductions = dedQ.data?.data ?? [];

  const brandName = (brandId: string): string =>
    brands.find((brand) => brand.id === brandId)?.profile.businessName ?? brandId;

  const statusOptions = useMemo(
    () => Array.from(new Set(commissions.map((c) => c.status))).sort(),
    [commissions]
  );

  const rows = useMemo<AdminCommissionRow[]>(() => {
    const query = search.trim().toLowerCase();
    return commissions
      .filter((c) => brandFilter === 'all' || c.brandId === brandFilter)
      .filter((c) => statusFilter === 'all' || c.status === statusFilter)
      .filter((c) => {
        if (!query) return true;
        return `${c.purchaseOrderId} ${brandName(c.brandId)}`.toLowerCase().includes(query);
      })
      .map((c) => ({ commission: c, brandName: brandName(c.brandId) }));
  }, [commissions, brands, brandFilter, statusFilter, search]);

  const sumByStatus = (status: 'accrued' | 'invoiced' | 'paid'): number =>
    commissions.filter((c) => c.status === status).reduce((t, c) => t + c.commissionAmount, 0);

  const subscriptionRows: AdminSubscriptionRow[] = subscriptions
    .filter((s) => brandFilter === 'all' || s.brandId === brandFilter)
    .map((s) => ({ subscription: s, brandName: brandName(s.brandId) }));

  const selectedDeductions = selected
    ? deductions.filter((d) => d.brandId === selected.commission.brandId)
    : [];

  return (
    <AdminBillingView
      rows={rows}
      subscriptions={subscriptionRows}
      totalCommissions={commissions.length}
      brandOptions={brands.map((brand) => ({ id: brand.id, name: brand.profile.businessName }))}
      statusOptions={statusOptions}
      brandFilter={brandFilter}
      statusFilter={statusFilter}
      search={search}
      accruedValue={sumByStatus('accrued')}
      invoicedValue={sumByStatus('invoiced')}
      paidValue={sumByStatus('paid')}
      monthlyRunRate={subscriptions
        .filter((s) => s.status === 'active')
        .reduce((total, s) => total + s.monthlyFee, 0)}
      openDeductionValue={deductions
        .filter((d) => d.status === 'open' || d.status === 'disputed')
        .reduce((total, d) => total + d.amountGbp, 0)}
      selected={selected}
      selectedDeductions={selectedDeductions}
      isLoading={commQ.isPending || brandsQ.isPending || subsQ.isPending}
      isError={commQ.isError || brandsQ.isError || subsQ.isError}
      errorMessage={String(commQ.error ?? brandsQ.error ?? subsQ.error ?? '') || undefined}
      onRetry={() => {
        void commQ.refetch();
        void brandsQ.refetch();
        void subsQ.refetch();
      }}
      onChangeBrand={setBrandFilter}
      onChangeStatus={setStatusFilter}
      onChangeSearch={setSearch}
      onSelect={setSelected}
    />
  );
}