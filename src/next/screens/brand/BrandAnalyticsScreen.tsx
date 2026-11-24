import { useMemo, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { useCanonicalStoreVersion, usePurchaseOrders } from '@/data/queries';
import { assertBrandScope } from '@/lib/auth/rbac';
import {
  listBrandCommerceExceptions,
  openCommerceDispute,
  type CommerceActor,
} from '@/lib/commerce/commerceLifecycle';
import { deductionTypeLabel } from '@/config/deductions';
import { BrandAnalyticsView, type SkuStatRow } from './BrandAnalyticsView';

export function BrandAnalyticsScreen() {
  const { session, brandProfile } = useApp();
  const poQ = usePurchaseOrders();
  const version = useCanonicalStoreVersion();
  void version;

  const [disputeNotice, setDisputeNotice] = useState<string | null>(null);
  const [disputeError, setDisputeError] = useState<string | null>(null);

  const pos = useMemo(
    () => assertBrandScope(session, poQ.data?.data ?? []),
    [session, poQ.data]
  );
  const accepted = useMemo(
    () =>
      pos.filter((p) =>
        ['accepted', 'ready_to_fulfil', 'shipped', 'delivered'].includes(p.status)
      ),
    [pos]
  );

  const totalValue = useMemo(
    () => accepted.reduce((s, p) => s + p.poValue, 0),
    [accepted]
  );
  const totalUnits = useMemo(
    () =>
      accepted.reduce(
        (s, p) => s + p.lineItems.reduce((sl, li) => sl + li.quantity, 0),
        0
      ),
    [accepted]
  );
  const avgOrder = accepted.length ? Math.round(totalValue / accepted.length) : 0;

  const skuStats = useMemo<SkuStatRow[]>(() => {
    const map = new Map<string, SkuStatRow>();
    for (const po of accepted) {
      for (const li of po.lineItems) {
        if (li.ackStatus === 'rejected') continue;
        const u = li.acknowledgedQty ?? li.quantity;
        const cur = map.get(li.sku) ?? { sku: li.sku, name: li.productName, units: 0, revenue: 0 };
        cur.units += u;
        cur.revenue += u * li.unitPrice;
        map.set(li.sku, cur);
      }
    }
    return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 12);
  }, [accepted]);

  const monthlySeries = useMemo(() => {
    const rev = new Map<string, number>();
    const vol = new Map<string, number>();
    for (const po of accepted) {
      const k = po.orderDate.slice(0, 7);
      rev.set(k, (rev.get(k) ?? 0) + po.poValue);
      vol.set(
        k,
        (vol.get(k) ?? 0) + po.lineItems.reduce((sl, li) => sl + li.quantity, 0)
      );
    }
    return [...new Set([...rev.keys(), ...vol.keys()])]
      .sort()
      .slice(-6)
      .map((month) => ({ month, revenue: rev.get(month) ?? 0, volume: vol.get(month) ?? 0 }));
  }, [accepted]);

  const brandId = session?.tier === 'brand' ? session.tenantId ?? null : null;
  const actor = useMemo<CommerceActor>(
    () => ({ staffId: `brand:${brandId ?? 'none'}`, canMutate: true, tenantId: brandId ?? undefined }),
    [brandId]
  );

  const deductions = useMemo(() => {
    void version;
    if (!brandId) return [];
    const res = listBrandCommerceExceptions(brandId, actor);
    return res.ok ? res.value : [];
  }, [brandId, actor, version]);

  async function handleSubmitDispute(deductionId: string, notes: string): Promise<boolean> {
    setDisputeNotice(null);
    setDisputeError(null);
    const res = await openCommerceDispute(deductionId, notes, actor);
    if (!res.ok) {
      setDisputeError(`${res.error}${res.reasons?.length ? ` — ${res.reasons.join('; ')}` : ''}`);
      return false;
    }
    setDisputeNotice(
      `${res.value.purchaseOrderId} — ${deductionTypeLabel(res.value.type)} marked ${res.value.status}.`
    );
    return true;
  }

  return (
    <BrandAnalyticsView
      loading={poQ.isPending}
      error={poQ.isError ? String(poQ.error) : null}
      onRetry={() => void poQ.refetch()}
      brandName={brandProfile.businessName || 'Your brand'}
      hasPos={pos.length > 0}
      totalValue={totalValue}
      acceptedCount={accepted.length}
      avgOrder={avgOrder}
      totalUnits={totalUnits}
      activeSkuCount={skuStats.length}
      monthlySeries={monthlySeries}
      skuStats={skuStats}
      deductions={deductions}
      disputeNotice={disputeNotice}
      disputeError={disputeError}
      onSubmitDispute={handleSubmitDispute}
    />
  );
}
export default BrandAnalyticsScreen;
