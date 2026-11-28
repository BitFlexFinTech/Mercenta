import { useMemo, useState } from 'react';
import { demoReturns } from '@/data/demoStore';
import { useBrands } from '@/data/queries';
import { returnTrackingStatusPresentation } from '@/lib/statusPresentation';
import {
  getAllReturnTracking,
  recordBrandConfirmation,
  recordForwardToBrand,
  recordQualityCheck,
} from '@/lib/warehouse/returnsTracking';
import { DEMO_WAREHOUSE_PARTNER, type ReturnTrackingStatus } from '@/types';
import type { MetricItem, SemanticTone } from '@/next/components/ConsolePrimitives';
import { AdminReturnsView } from './AdminReturnsView';

const STAGE_STEPS: { status: ReturnTrackingStatus; label: string }[] = [
  { status: 'received_at_warehouse', label: 'Received at warehouse' },
  { status: 'quality_checked', label: 'Quality checked' },
  { status: 'forwarded_to_brand', label: 'Forwarded to brand' },
  { status: 'confirmed_by_brand', label: 'Confirmed by brand' },
];

export function AdminReturnsScreen() {
  const brandsQuery = useBrands();
  const brands = useMemo(() => brandsQuery.data?.data ?? [], [brandsQuery.data]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<'all' | ReturnTrackingStatus>('all');
  const [notice, setNotice] = useState<string | null>(null);
  const [mutationStamp, setMutationStamp] = useState(0);

  const allTracking = useMemo(() => {
    void mutationStamp;
    return getAllReturnTracking().sort((a, b) =>
      b.receivedAtWarehouse.localeCompare(a.receivedAtWarehouse)
    );
  }, [mutationStamp]);

  const brandName = (id: string) =>
    brands.find((b) => b.id === id)?.profile.businessName ?? id;

  const stats = useMemo(
    () => ({
      received: allTracking.filter((t) => t.status === 'received_at_warehouse').length,
      checked: allTracking.filter((t) => t.status === 'quality_checked').length,
      forwarded: allTracking.filter((t) => t.status === 'forwarded_to_brand').length,
      confirmed: allTracking.filter((t) => t.status === 'confirmed_by_brand').length,
    }),
    [allTracking]
  );

  const rows = useMemo(() => {
    const byStage =
      stageFilter === 'all' ? allTracking : allTracking.filter((t) => t.status === stageFilter);
    const q = searchQuery.trim().toLowerCase();
    const list = !q
      ? byStage
      : byStage.filter((t) => {
          const bn = brandName(t.brandId).toLowerCase();
          return (
            bn.includes(q) ||
            t.inboundTrackingNumber.toLowerCase().includes(q) ||
            (t.forwardedTrackingNumber ?? '').toLowerCase().includes(q) ||
            t.returnId.toLowerCase().includes(q)
          );
        });

    return list.map((entry) => {
      const info = demoReturns.find((r) => r.id === entry.returnId);
      const pres = returnTrackingStatusPresentation(entry.status);
      return {
        entry,
        brandName: brandName(entry.brandId),
        productName: info?.productName ?? entry.returnId,
        quantity: info?.quantity,
        statusLabel: pres.label,
        statusTone: pres.tone as SemanticTone,
      };
    });
  }, [allTracking, stageFilter, searchQuery, brands]);

  const selectedRow = useMemo(
    () => rows.find((r) => r.entry.id === selectedId) ?? null,
    [rows, selectedId]
  );

  const metrics: MetricItem[] = [
    {
      id: 'rt-received',
      label: 'Received',
      value: String(stats.received),
      context: 'At warehouse',
      active: stageFilter === 'received_at_warehouse',
      onClick: () => setStageFilter('received_at_warehouse'),
    },
    {
      id: 'rt-checked',
      label: 'Quality checked',
      value: String(stats.checked),
      context: stats.checked > 0 ? 'Awaiting forwarding' : 'None queued',
      active: stageFilter === 'quality_checked',
      onClick: () => setStageFilter('quality_checked'),
    },
    {
      id: 'rt-forwarded',
      label: 'Forwarded',
      value: String(stats.forwarded),
      context: 'With carrier to brand',
      active: stageFilter === 'forwarded_to_brand',
      onClick: () => setStageFilter('forwarded_to_brand'),
    },
    {
      id: 'rt-confirmed',
      label: 'Confirmed',
      value: String(stats.confirmed),
      context: 'Closed',
      active: stageFilter === 'confirmed_by_brand',
      onClick: () => setStageFilter('confirmed_by_brand'),
    },
  ];

  function handleAdvanceStage(trackingId: string) {
    const t = getAllReturnTracking().find((x) => x.id === trackingId);
    if (!t) return;
    if (t.status === 'received_at_warehouse') {
      const updated = recordQualityCheck(
        trackingId,
        true,
        'Auto-checked at demo. Passed visual inspection.'
      );
      if (updated) setNotice(`Quality check recorded for return ${updated.returnId}.`);
    } else if (t.status === 'quality_checked') {
      const suffix = String(
        1000 + Array.from(trackingId).reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 9000, 0)
      ).padStart(4, '0');
      const updated = recordForwardToBrand(trackingId, 'DHL', `DHL-UK-FWD-88${suffix}`, 'ra-1');
      if (updated) setNotice('Return forwarded to brand via DHL.');
    } else if (t.status === 'forwarded_to_brand') {
      const updated = recordBrandConfirmation(trackingId);
      if (updated) setNotice(`Brand confirmed receipt of return ${updated.returnId}.`);
    }
    setSelectedId(trackingId);
    setMutationStamp((s) => s + 1);
  }

  return (
    <AdminReturnsView
      loading={brandsQuery.isPending && brands.length === 0}
      totalCount={allTracking.length}
      confirmedCount={stats.confirmed}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      stageFilter={stageFilter}
      onStageFilterChange={setStageFilter}
      stats={stats}
      metrics={metrics}
      rows={rows}
      selectedRow={selectedRow}
      onSelectRow={setSelectedId}
      onAdvanceStage={handleAdvanceStage}
      notice={notice}
      warehousePartner={DEMO_WAREHOUSE_PARTNER}
      stageSteps={STAGE_STEPS.map((s, idx) => ({
        status: s.status,
        label: s.label,
        count: allTracking.filter((t) => t.status === s.status).length,
        reachedIndex: idx,
      }))}
    />
  );
}
