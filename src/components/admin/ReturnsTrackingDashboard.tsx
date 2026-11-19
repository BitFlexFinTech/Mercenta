/**
 * §Batch-16 — Returns warehouse tracking dashboard (admin).
 * Tracks: received at warehouse → quality checked → forwarded to brand → confirmed.
 */
import { useState, useMemo } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { useBrands } from '@/data/queries';
import { Badge, Button, Card, DataTable, StatusBadge } from '@/components/ui';
import { returnTrackingStatusPresentation } from '@/lib/statusPresentation';
import { cn } from '@/utils/cn';
import { demoReturns } from '@/data/demoStore';
import {
  getAllReturnTracking, recordQualityCheck, recordForwardToBrand, recordBrandConfirmation,
} from '@/lib/warehouse/returnsTracking';
import { DEMO_WAREHOUSE_PARTNER, type ReturnTrackingStatus, type ReturnTrackingEntry } from '@/types';
import { Warehouse, PackageCheck, Truck, CheckCircle2, Search, Boxes } from 'lucide-react';
/**
 * §UI/UX Wave 2 completion — this surface is migrated onto the same workspace
 * architecture as Operations Overview (frame → header → toolbar → metric band →
 * record queue → context rail), and RecordDrawer is the QUEUE → PREVIEW step.
 * The DataTable queue itself is unchanged (its responsive/empty contracts hold).
 */
import {
  ContextPanel,
  MetricBand,
  RecordDrawer,
  RecordFieldList,
  SegmentedControl,
  WorkspaceFrame,
  WorkspaceHeader,
  WorkspaceSection,
} from '@/components/shared/workspace';

const STATUS_STEPS: { status: ReturnTrackingStatus; label: string; icon: typeof Warehouse }[] = [
  { status: 'received_at_warehouse', label: 'Received at warehouse', icon: Warehouse },
  { status: 'quality_checked', label: 'Quality checked', icon: PackageCheck },
  { status: 'forwarded_to_brand', label: 'Forwarded to brand', icon: Truck },
  { status: 'confirmed_by_brand', label: 'Confirmed by brand', icon: CheckCircle2 },
];

const STATUS_INDEX: Record<ReturnTrackingStatus, number> = {
  received_at_warehouse: 0, quality_checked: 1, forwarded_to_brand: 2, confirmed_by_brand: 3,
};

export function ReturnsTrackingDashboard() {
  const { actingStaff } = useApp();
  const brandsQuery = useBrands();
  const brands = useMemo(() => brandsQuery.data?.data ?? [], [brandsQuery.data]);
  const [searchQuery, setSearchQuery] = useState('');
  /**
   * §UI/UX Wave 2 completion — `selectedId` was previously written by the row
   * click and by the Advance action but never read anywhere, so clicking a
   * return row did nothing visible (a real dead interaction). It now drives the
   * record-preview drawer.
   */
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** REAL stage filter + density over the queue. */
  const [stageFilter, setStageFilter] = useState<'all' | ReturnTrackingStatus>('all');
  const [density, setDensity] = useState<'compact' | 'comfortable'>('compact');
  /**
   * §UI/UX Wave 2 completion — mutation stamp (the project's established
   * `mutationStamp` pattern, as used by ListingAnalyzer / AmazonAdsDashboard /
   * BrandAdvertising). The returns store mutates its record objects in place, so
   * a `useMemo` keyed only on the (unchanged) array reference would keep serving
   * stale counts after an Advance. The stamp is bumped on every real mutation and
   * is part of the memo dependencies, so the metric band, filter and drawer always
   * read the CURRENT record.
   */
  const [mutationStamp, setMutationStamp] = useState(0);

  const allTracking = useMemo(function() {
    void mutationStamp;
    return getAllReturnTracking().sort(function(a, b) { return b.receivedAtWarehouse.localeCompare(a.receivedAtWarehouse); });
  }, [mutationStamp]);
  const selectedTracking = allTracking.find(function(t) { return t.id === selectedId; }) ?? null;
  const filtered = useMemo(function() {
    void mutationStamp;
    const byStage = stageFilter === 'all' ? allTracking : allTracking.filter(function(t) { return t.status === stageFilter; });
    if (!searchQuery.trim()) return byStage;
    const q = searchQuery.toLowerCase();
    return byStage.filter(function(t) {
      const bn = brands.find(function(b) { return b.id === t.brandId; })?.profile.businessName ?? t.brandId;
      return bn.toLowerCase().includes(q) || t.inboundTrackingNumber.toLowerCase().includes(q) || (t.forwardedTrackingNumber || '').toLowerCase().includes(q) || t.returnId.toLowerCase().includes(q);
    });
  }, [allTracking, searchQuery, brands, stageFilter, mutationStamp]);

  const brandName = function(id: string) { return brands.find(function(b) { return b.id === id; })?.profile.businessName ?? id; };
  const returnInfo = function(returnId: string) { return demoReturns.find(function(r) { return r.id === returnId; }); };

  const stats = useMemo(function() {
    void mutationStamp;
    return {
      received: allTracking.filter(function(t) { return t.status === 'received_at_warehouse'; }).length,
      checked: allTracking.filter(function(t) { return t.status === 'quality_checked'; }).length,
      forwarded: allTracking.filter(function(t) { return t.status === 'forwarded_to_brand'; }).length,
      confirmed: allTracking.filter(function(t) { return t.status === 'confirmed_by_brand'; }).length,
    };
  }, [allTracking, mutationStamp]);

  function showNotice(msg: string) { setNotice(msg); setTimeout(function() { setNotice(null); }, 4000); }

  function handleNextStage(trackingId: string) {
    const t = getAllReturnTracking().find(function(x) { return x.id === trackingId; });
    if (!t) return;
    if (t.status === 'received_at_warehouse') {
      const updated = recordQualityCheck(trackingId, true, 'Auto-checked at demo. Passed visual inspection.');
      if (updated) showNotice('Quality check recorded for return ' + updated.returnId + '.');
    } else if (t.status === 'quality_checked') {
      /**
       * §UI/UX Wave 2 completion — REAL DEFECT FIXED. This suffix was
       * `Math.floor(1000 + Math.random() * 9000)`, so the same forward produced a
       * different tracking number on every run (a non-deterministic workflow:
       * reload/re-run never reproduced the same record). It is now derived
       * deterministically from the tracking record's own id, so the value is
       * stable and reproducible while still unique per record.
       */
      const suffix = String(
        1000 + (Array.from(trackingId).reduce(function(h, ch) { return (h * 31 + ch.charCodeAt(0)) % 9000; }, 0))
      ).padStart(4, '0');
      const updated = recordForwardToBrand(trackingId, 'DHL', 'DHL-UK-FWD-88' + suffix, 'ra-1');
      if (updated) showNotice('Return forwarded to brand via DHL.');
    } else if (t.status === 'forwarded_to_brand') {
      const updated = recordBrandConfirmation(trackingId);
      if (updated) showNotice('Brand confirmed receipt of return ' + updated.returnId + '.');
    }
    setSelectedId(trackingId);
    /* §UI/UX Wave 2 completion — the store mutated a record in place; bump the
       stamp so every derived figure re-reads the CURRENT record. */
    setMutationStamp(function(s) { return s + 1; });
  }
return (
    <WorkspaceFrame>
      <WorkspaceHeader
        eyebrow="Admin Hub · Logistics"
        title="Returns Warehouse Tracking"
        description="Internal forwarding flow — received at warehouse to confirmed by brand"
        meta={
          <>
            <span className="text-ds-label text-zinc-500">
              Records <span className="font-mono text-zinc-300">{allTracking.length}</span>
            </span>
            <span className="text-ds-label text-zinc-500">
              Confirmed <span className="font-mono text-zinc-300">{stats.confirmed}</span>
            </span>
          </>
        }
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] flex-1 sm:max-w-md">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" aria-hidden="true" />
              <input type="text" value={searchQuery} onChange={function(e) { setSearchQuery(e.target.value); }}
                aria-label="Search return tracking"
                placeholder="Search by brand, tracking number, or return…"
                className="w-full bg-ink-900 border border-hairline rounded-ds-md pl-8 pr-3 py-1.5 text-xs text-strong placeholder-zinc-600 focus:outline-none focus:border-brass-500/40" />
            </div>
            <SegmentedControl
              ariaLabel="Filter by stage"
              active={stageFilter}
              onSelect={function(id) { setStageFilter(id as 'all' | ReturnTrackingStatus); }}
              items={[
                { id: 'all', label: 'All', count: allTracking.length },
                { id: 'received_at_warehouse', label: 'Received', count: stats.received },
                { id: 'quality_checked', label: 'Checked', count: stats.checked },
                { id: 'forwarded_to_brand', label: 'Forwarded', count: stats.forwarded },
                { id: 'confirmed_by_brand', label: 'Confirmed', count: stats.confirmed },
              ]}
            />
            <span className="ml-auto flex items-center gap-2">
              <span className="hidden text-ds-micro uppercase tracking-[0.14em] text-zinc-600 sm:inline">
                Density
              </span>
              <SegmentedControl
                ariaLabel="Row density"
                active={density}
                onSelect={function(id) { setDensity(id as 'compact' | 'comfortable'); }}
                items={[
                  { id: 'compact', label: 'Compact' },
                  { id: 'comfortable', label: 'Comfortable' },
                ]}
              />
            </span>
          </div>
        }
      />

      {notice && <div role="status" className="mb-3 bg-emerald-500/10 border border-emerald-500/20 rounded-ds-md p-3 text-xs text-emerald-300">{notice}</div>}

      <MetricBand
        columns={4}
        items={[
          { id: 'rt-received', label: 'Received', value: String(stats.received), context: 'At warehouse', onOpen: function() { setStageFilter('received_at_warehouse'); } },
          {
            id: 'rt-checked', label: 'Quality checked', value: String(stats.checked),
            tone: stats.checked > 0 ? 'warning' : 'neutral',
            statusText: stats.checked > 0 ? 'Awaiting forwarding' : 'None queued',
            onOpen: function() { setStageFilter('quality_checked'); },
          },
          { id: 'rt-forwarded', label: 'Forwarded', value: String(stats.forwarded), context: 'With carrier to brand', onOpen: function() { setStageFilter('forwarded_to_brand'); } },
          {
            id: 'rt-confirmed', label: 'Confirmed', value: String(stats.confirmed),
            tone: 'success',
            statusText: 'Closed',
            onOpen: function() { setStageFilter('confirmed_by_brand'); },
          },
        ]}
      />

      <WorkspaceSection
        title="Return queue"
        domain="logistics"
        description="Open a return record to preview its forwarding state, or advance it from the queue."
      >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
<Card className="p-0 overflow-hidden">
        {/* §Phase D4 — canonical DataTable: cards below md, table at md+; the
            Advance action stays reachable at every width. */}
        <DataTable
          caption="Return tracking"
          rows={filtered}
          rowKey={(t) => t.id}
          emptyMessage="No return tracking entries found."
          onRowClick={(t) => setSelectedId(t.id)}
          rowActions={(t) =>
            t.status !== 'confirmed_by_brand' ? (
              <Button className="text-ds-micro" onClick={() => handleNextStage(t.id)}>
                Advance
              </Button>
            ) : null
          }
          columns={[
            {
              key: 'brand',
              label: 'Brand',
              hideBelow: 'lg',
              render: (t) => <span className="font-medium text-zinc-200">{brandName(t.brandId)}</span>,
            },
            {
              key: 'return',
              label: 'Return',
              primary: true,
              render: (t) => {
                const info = returnInfo(t.returnId);
                return (
                  <span className="block">
                    <span className="block text-zinc-300">{info?.productName ?? t.returnId}</span>
                    <span className="block font-mono text-ds-micro text-zinc-600">
                      {t.returnId} · {info?.quantity ?? '?'} units
                    </span>
                  </span>
                );
              },
            },
            {
              key: 'inbound',
              label: 'Inbound',
              hideBelow: 'sm',
              render: (t) => (
                <span className="block">
                  <span className="block font-mono text-ds-micro text-zinc-400">{t.inboundTrackingNumber}</span>
                  <span className="block text-ds-micro text-zinc-600">{t.inboundCarrier}</span>
                </span>
              ),
            },
            {
              key: 'status',
              label: 'Status',
              render: (t) => {
                const idx = STATUS_INDEX[t.status];
                const p = returnTrackingStatusPresentation(t.status);
                return (
                  <span className="flex items-center gap-1">
                    {STATUS_STEPS.map((s, i) => (
                      <span
                        key={s.status}
                        aria-hidden="true"
                        className={cn('h-2 w-2 rounded-full', i <= idx ? 'bg-brass-500' : 'bg-zinc-700')}
                      />
                    ))}
                    <StatusBadge className="text-ds-micro" dataStatus={p.dataStatus} tone={p.tone}>
                      {p.label}
                    </StatusBadge>
                  </span>
                );
              },
            },
            {
              key: 'forwarded',
              label: 'Forwarded',
              hideBelow: 'md',
              render: (t) =>
                t.forwardedTrackingNumber ? (
                  <span className="block">
                    <span className="block font-mono text-ds-micro text-zinc-400">{t.forwardedTrackingNumber}</span>
                    <span className="block text-ds-micro text-zinc-600">{t.forwardedCarrier}</span>
                  </span>
                ) : (
                  <span className="text-zinc-600">—</span>
                ),
            },
          ]}
        />
      </Card>
      </div>
      <div role="complementary" aria-label="Context" className="min-w-0 space-y-4">
        <ContextPanel title="Warehouse partner">
          <div className="flex items-center gap-2">
            <Boxes className="h-4 w-4 text-brass-400" aria-hidden="true" />
            <span className="text-xs font-medium text-strong">{DEMO_WAREHOUSE_PARTNER.name}</span>
            <Badge className="text-ds-micro bg-amber-500/15 text-amber-300">(Mock)</Badge>
          </div>
          <p className="mt-1.5 text-ds-micro text-zinc-500">
            {DEMO_WAREHOUSE_PARTNER.address}, {DEMO_WAREHOUSE_PARTNER.postcode}
          </p>
          <p className="mt-1.5 text-ds-micro leading-snug text-zinc-500">{DEMO_WAREHOUSE_PARTNER.notes}</p>
        </ContextPanel>
        <ContextPanel title="Forwarding stages">
          {allTracking.length === 0 ? (
            <p className="text-ds-label text-zinc-500">No returns in the flow.</p>
          ) : (
            <ol className="space-y-1.5">
              {STATUS_STEPS.map(function(s, i) {
                const n = allTracking.filter(function(t) { return STATUS_INDEX[t.status] === i; }).length;
                const p = returnTrackingStatusPresentation(s.status);
                return (
                  <li key={s.status} className="flex items-center justify-between gap-2">
                    <StatusBadge className="text-ds-micro" dataStatus={p.dataStatus} tone={p.tone}>
                      {s.label}
                    </StatusBadge>
                    <span className="font-mono text-ds-label text-zinc-300">{n}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </ContextPanel>
      </div>
      </div>
      </WorkspaceSection>

      {/* ── QUEUE → PREVIEW → ACT ──────────────────────────────────────────
          The drawer previews the REAL return-tracking record and carries the
          same real stage-advance action the queue row exposes. */}
      <RecordDrawer
        open={selectedTracking !== null}
        onClose={function() { setSelectedId(null); }}
        title={selectedTracking ? selectedTracking.returnId : ''}
        subtitle={selectedTracking ? brandName(selectedTracking.brandId) : undefined}
        testId="return-record-drawer"
        footer={
          selectedTracking ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-ds-micro text-zinc-600">
                {selectedTracking.status === 'confirmed_by_brand' ? 'Flow complete' : 'Next stage available'}
              </span>
              {selectedTracking.status !== 'confirmed_by_brand' && (
                <Button className="text-ds-micro" data-state="return-drawer-advance" onClick={function() { handleNextStage(selectedTracking.id); }}>
                  Advance stage
                </Button>
              )}
            </div>
          ) : undefined
        }
      >
        {selectedTracking ? (
          <ReturnPreviewBody
            tracking={selectedTracking}
            brandName={brandName(selectedTracking.brandId)}
            returnInfo={returnInfo(selectedTracking.returnId)}
          />
        ) : null}
      </RecordDrawer>
    </WorkspaceFrame>
  );
}

/* ── RECORD PREVIEW BODY ────────────────────────────────────────────────────
 * Only the sections a return-tracking record genuinely supports are rendered
 * (summary, condition/quality notes, forwarding, stage timeline).
 */
function ReturnPreviewBody({
  tracking,
  brandName,
  returnInfo,
}: {
  tracking: ReturnTrackingEntry;
  brandName: string;
  returnInfo: { productName?: string; quantity?: number; reason?: string } | undefined;
}) {
  const status = returnTrackingStatusPresentation(tracking.status);
  const stageIndex = STATUS_INDEX[tracking.status];
  return (
    <div className="space-y-4">
      <StatusBadge dataStatus={status.dataStatus} tone={status.tone}>
        {status.label}
      </StatusBadge>

      <RecordFieldList
        fields={[
          { label: 'Brand', value: brandName },
          { label: 'Return', value: tracking.returnId },
          { label: 'Product', value: returnInfo?.productName ?? '—' },
          { label: 'Quantity', value: returnInfo?.quantity !== undefined ? `${returnInfo.quantity} units` : '—' },
          { label: 'Received', value: tracking.receivedAtWarehouse },
          { label: 'Condition on receipt', value: tracking.conditionOnReceipt },
          { label: 'Inbound carrier', value: `${tracking.inboundCarrier} · ${tracking.inboundTrackingNumber}` },
          { label: 'Quality check', value: tracking.qualityCheckedAt ? (tracking.qualityCheckPassed ? 'Passed' : 'Failed') : 'Not yet performed' },
        ]}
      />

      {tracking.qualityCheckNotes && (
        <section aria-label="Quality check notes">
          <h3 className="mb-1.5 text-ds-label font-semibold uppercase tracking-[0.14em] text-zinc-400">
            Quality check notes
          </h3>
          <p className="text-ds-label leading-snug text-zinc-400">{tracking.qualityCheckNotes}</p>
        </section>
      )}

      <section aria-label="Forwarding">
        <h3 className="mb-1.5 text-ds-label font-semibold uppercase tracking-[0.14em] text-zinc-400">
          Forwarding
        </h3>
        <RecordFieldList
          fields={[
            { label: 'Forwarded', value: tracking.forwardedToBrandAt ?? 'Not yet' },
            { label: 'Forward carrier', value: tracking.forwardedCarrier ?? '—' },
            { label: 'Forward tracking', value: tracking.forwardedTrackingNumber ?? '—' },
            { label: 'Confirmed by brand', value: tracking.confirmedByBrandAt ?? 'Not yet' },
          ]}
        />
      </section>

      <section aria-label="Stage timeline">
        <h3 className="mb-1.5 text-ds-label font-semibold uppercase tracking-[0.14em] text-zinc-400">
          Stage timeline
        </h3>
        <ol className="space-y-1.5">
          {STATUS_STEPS.map(function(s, i) {
            const reached = i <= stageIndex;
            return (
              <li key={s.status} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={cn('h-2 w-2 rounded-full', reached ? 'bg-brass-500' : 'bg-zinc-700')}
                />
                <span className={cn('text-ds-label', reached ? 'text-zinc-200' : 'text-zinc-600')}>
                  {s.label}
                </span>
                <span className="ml-auto text-ds-micro text-zinc-600">
                  {reached ? 'reached' : 'pending'}
                </span>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}