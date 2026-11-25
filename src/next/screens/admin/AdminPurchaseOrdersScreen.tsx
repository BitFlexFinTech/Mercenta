/**
 * §WAVE 3 (2026-11-25) — admin purchase orders (data + actions).
 * The acknowledgement goes through the SAME canonical command the brand workspace
 * uses, so there is one business path and one audit trail.
 */
import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useBrands, usePurchaseOrders } from '@/data/queries';
import type { PoLineAckSubmission } from '@/data/api';
import type { PurchaseOrder, PurchaseOrderStatus } from '@/types';
import { runPoAcknowledgement } from '@/next/screens/brand/poActions';
import { isOpenPo, sumGbp } from './adminPortfolio';
import { AdminPurchaseOrdersView, type AdminPoRow } from './AdminPurchaseOrdersView';

const STATUS_ORDER: PurchaseOrderStatus[] = [
  'received',
  'under_review',
  'accepted',
  'ready_to_fulfil',
  'shipped',
  'delivered',
  'rejected',
];

export function AdminPurchaseOrdersScreen({
  initialBrandId,
}: {
  initialBrandId?: string | null;
}) {
  const qc = useQueryClient();
  const brandsQ = useBrands();
  const posQ = usePurchaseOrders();

  const [brandFilter, setBrandFilter] = useState<string>(initialBrandId ?? 'all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<PurchaseOrder | null>(null);
  const [busyPoId, setBusyPoId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const brands = brandsQ.data?.data ?? [];
  const pos = posQ.data?.data ?? [];

  function brandNameOfId(id: string): string {
    return brands.find((brand) => brand.id === id)?.profile.businessName ?? id;
  }

  const rows = useMemo<AdminPoRow[]>(() => {
    const query = search.trim().toLowerCase();
    return pos
      .filter((po) => brandFilter === 'all' || po.brandId === brandFilter)
      .filter((po) => statusFilter === 'all' || po.status === statusFilter)
      .filter((po) => {
        if (!query) return true;
        const name = brands.find((brand) => brand.id === po.brandId)?.profile.businessName ?? '';
        return (
          po.poNumber.toLowerCase().includes(query) || name.toLowerCase().includes(query)
        );
      })
      .map((po) => ({ po, brandName: brandNameOfId(po.brandId) }));
  }, [pos, brands, brandFilter, statusFilter, search]);

  const openPos = pos.filter(isOpenPo);

  async function handleAcknowledge(po: PurchaseOrder): Promise<void> {
    setBusyPoId(po.id);
    const lines: PoLineAckSubmission[] = po.lineItems.map((line) => ({
      sku: line.sku,
      ackStatus: 'accepted',
      acknowledgedQty: line.quantity,
    }));
    const result = await runPoAcknowledgement(qc, po.id, lines);
    setBusyPoId(null);
    setNotice(result.notice || (result.ok ? 'Order acknowledged.' : 'Acknowledgement failed.'));
    if (result.ok) setSelected(null);
  }

  function handleExportCsv(): void {
    const header = ['PO number', 'Brand', 'Value GBP', 'Status', 'Ordered', 'Lines'];
    const body = rows.map((row) => [
      row.po.poNumber,
      row.brandName,
      row.po.poValue.toFixed(2),
      row.po.status,
      row.po.orderDate.slice(0, 10),
      String(row.po.lineItems.length),
    ]);
    const csv = [header, ...body]
      .map((cells) => cells.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mercenta-purchase-orders.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AdminPurchaseOrdersView
      rows={rows}
      totalCount={pos.length}
      brandOptions={brands.map((brand) => ({
        id: brand.id,
        name: brand.profile.businessName,
      }))}
      brandFilter={brandFilter}
      statusFilter={statusFilter}
      search={search}
      statusOptions={STATUS_ORDER}
      openValue={sumGbp(openPos.map((po) => po.poValue))}
      awaitingAckCount={pos.filter((po) => po.status === 'received').length}
      selected={selected}
      busyPoId={busyPoId}
      notice={notice}
      isLoading={posQ.isPending || brandsQ.isPending}
      isError={posQ.isError || brandsQ.isError}
      errorMessage={String(posQ.error ?? brandsQ.error ?? '') || undefined}
      onRetry={() => {
        void posQ.refetch();
        void brandsQ.refetch();
      }}
      onChangeBrand={setBrandFilter}
      onChangeStatus={setStatusFilter}
      onChangeSearch={setSearch}
      onExportCsv={handleExportCsv}
      onSelect={setSelected}
      onAcknowledge={(po) => void handleAcknowledge(po)}
    />
  );
}