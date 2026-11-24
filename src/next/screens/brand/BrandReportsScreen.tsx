import { useMemo, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { useCanonicalStoreVersion, usePurchaseOrders } from '@/data/queries';
import { assertBrandScope } from '@/lib/auth/rbac';
import { inventorySummaryForBrand } from '@/lib/inventory/inventoryLifecycle';
import { listBrandCommerceExceptions } from '@/lib/commerce/commerceLifecycle';
import { downloadCsv } from '@/lib/csv';
import { BrandReportsView } from './BrandReportsView';

export function BrandReportsScreen() {
  const { session, brandProfile, products } = useApp();
  const canonicalVersion = useCanonicalStoreVersion();
  void canonicalVersion;

  const poQ = usePurchaseOrders();
  const [period, setPeriod] = useState<30 | 60 | 90>(90);

  const inventoryBrandId = session?.tier === 'brand' ? session.tenantId ?? null : null;
  const inventorySummary = useMemo(() => {
    void canonicalVersion;
    if (!inventoryBrandId) return undefined;
    const res = inventorySummaryForBrand(inventoryBrandId, {
      staffId: `brand:${inventoryBrandId}`,
      canMutate: false,
      tenantId: inventoryBrandId,
    });
    return res.ok ? res.value : undefined;
  }, [inventoryBrandId, canonicalVersion]);

  const deductions = useMemo(() => {
    void canonicalVersion;
    if (!inventoryBrandId) return [];
    const res = listBrandCommerceExceptions(inventoryBrandId, {
      staffId: `brand:${inventoryBrandId}`,
      canMutate: false,
      tenantId: inventoryBrandId,
    });
    return res.ok ? res.value : [];
  }, [inventoryBrandId, canonicalVersion]);

  const pos = useMemo(
    () => assertBrandScope(session, poQ.data?.data ?? []),
    [session, poQ.data]
  );
  const cutoff = new Date(Date.now() - period * 864e5).toISOString().slice(0, 10);
  const rp = pos.filter((p) => p.orderDate >= cutoff);
  const openPOs = rp.filter((p) =>
    ['received', 'under_review', 'accepted', 'ready_to_fulfil'].includes(p.status)
  );
  const shippedAndDelivered = rp.filter(
    (p) => p.status === 'shipped' || p.status === 'delivered'
  );
  const totalLines = rp.reduce((s, p) => s + p.lineItems.length, 0);
  const confirmedLines = rp.reduce(
    (s, p) =>
      s +
      p.lineItems.filter((l) => l.ackStatus === 'accepted' || l.ackStatus === 'backordered')
        .length,
    0
  );
  const asinRate = totalLines > 0 ? Math.round((confirmedLines / totalLines) * 100) : 0;
  const oosCount = products.filter((p) => p.isAvailable === false).length;
  const totalValueShipped = shippedAndDelivered.reduce((s, p) => s + p.poValue, 0);
  const totalUnitsShipped = shippedAndDelivered.reduce(
    (s, p) => s + p.lineItems.reduce((sl, li) => sl + li.quantity, 0),
    0
  );
  const netPpm = totalUnitsShipped > 0 ? Math.round((totalValueShipped / totalUnitsShipped) * 1000) : 0;
  const openPoQty = openPOs.reduce(
    (s, p) => s + p.lineItems.reduce((sl, li) => sl + li.quantity, 0),
    0
  );

  const dispatchSeries = useMemo(() => {
    const b = new Map<string, number>();
    for (const po of shippedAndDelivered) {
      const k = po.orderDate.slice(0, 7);
      b.set(k, (b.get(k) ?? 0) + po.lineItems.reduce((sl, li) => sl + li.quantity, 0));
    }
    return [...b]
      .sort((a, c) => a[0].localeCompare(c[0]))
      .slice(-6)
      .map(([month, units]) => ({ month, units }));
  }, [shippedAndDelivered]);

  const salesSeries = useMemo(() => {
    const b = new Map<string, number>();
    for (const po of shippedAndDelivered) {
      const k = po.orderDate.slice(0, 7);
      b.set(k, (b.get(k) ?? 0) + po.poValue);
    }
    return [...b]
      .sort((a, c) => a[0].localeCompare(c[0]))
      .slice(-6)
      .map(([month, value]) => ({ month, value }));
  }, [shippedAndDelivered]);

  function handleExportCsv() {
    const rows = rp.map((po) => {
      const units = po.lineItems.reduce((s, l) => s + l.quantity, 0);
      return [po.poNumber, po.status, String(po.poValue), String(units), `${asinRate}%`];
    });
    downloadCsv('brand-reports.csv', ['PO', 'Status', 'Value', 'Units', 'ASIN Rate'], rows);
  }

  return (
    <BrandReportsView
      loading={poQ.isPending}
      error={poQ.isError ? String(poQ.error) : null}
      onRetry={() => void poQ.refetch()}
      brandName={brandProfile.businessName || 'Your brand'}
      period={period}
      onChangePeriod={setPeriod}
      hasPos={pos.length > 0}
      asinRate={asinRate}
      confirmedLines={confirmedLines}
      totalLines={totalLines}
      oosCount={oosCount}
      totalSkus={products.length}
      openPoQty={openPoQty}
      openPoCount={openPOs.length}
      canonicalOnHand={inventorySummary?.unitsOnHand}
      netPpm={netPpm}
      dispatchSeries={dispatchSeries}
      salesSeries={salesSeries}
      deductions={deductions}
      onExportCsv={handleExportCsv}
    />
  );
}
export default BrandReportsScreen;
