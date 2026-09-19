import { useMemo, useState } from 'react';
import { useBrands, usePurchaseOrders, useShipmentsAll } from '@/data/queries';
import { DemoBanner } from '@/components/shared/DemoBanner';
import { Badge, Card, DataTable, StatusBadge } from '@/components/ui';
import { shipmentStatusPresentation } from '@/lib/statusPresentation';
import { Container, Ship } from 'lucide-react';
import type { DemoShipment } from '@/data/demoData';
import type { PurchaseOrder } from '@/types';
import {
  ContextPanel,
  MetricBand,
  RecordFieldList,
  WorkspaceFrame,
  WorkspaceGrid,
  WorkspaceHeader,
  WorkspaceSection,
  type MetricTileData,
} from '@/components/shared/workspace';
import { useWorkItems } from '@/lib/work/useWork';
import { WORK_SOURCE_LABELS, demoToday, daysBetween } from '@/lib/work/workStore';
import type { WorkSource } from '@/lib/work/types';

const IN_TRANSIT = ['sea_transit', 'air_transit', 'factory_intake'];

/** §Sprint 2 — the logistics side of the deterministic operating layer. */
const LOGISTICS_WORK_SOURCES: WorkSource[] = ['shipment_exception', 'po_acknowledgement', 'po_window'];

/**
 * §Stage-6 — LOGISTICS CONTROL (operational view).
 * Which shipments are in transit, which are delayed/exception — grouped by
 * brand and PO. This is the ops team's day view; carrier API health lives in
 * the separate Carrier Integration Monitor.
 */
export function LogisticsControl() {
  const shipmentsQuery = useShipmentsAll();
  // Stable identity so the downstream useMemo deps don't churn every render.
  const shipments = useMemo(() => shipmentsQuery.data?.data ?? [], [shipmentsQuery.data]);
  const brandsQuery = useBrands();
  const brands = brandsQuery.data?.data ?? [];
  // §Phase E5 (G6) — stable identity (the PO list is a join input below), using
  // the same pattern as the shipments query above.
  const poQuery = usePurchaseOrders();
  const pos = useMemo(() => poQuery.data?.data ?? [], [poQuery.data]);

  const brandName = (id: string) =>
    brands.find((b) => b.id === id)?.profile.businessName ?? id;

  /**
   * §Phase E5 (G6) — REAL DEFECT FIXED.
   *
   * The PO column used `pos.find((p) => p.id === s.id)`, comparing a SHIPMENT id
   * (`shipment-<poId>`) against PO ids, so it always rendered “—”. The canonical
   * shipment→PO link is `DemoShipment.poNumber`. The same canonical join also
   * yields the PO's truthful simulation provenance (G2).
   */
  const poByNumber = useMemo(() => {
    const m = new Map<string, PurchaseOrder>();
    for (const p of pos) m.set(p.poNumber, p);
    return m;
  }, [pos]);
  const poFor = (poNumber: string) => poByNumber.get(poNumber);

  const groups = useMemo(() => {
    const map = new Map<string, DemoShipment[]>();
    for (const s of shipments) {
      if (!map.has(s.brandId)) map.set(s.brandId, []);
      map.get(s.brandId)!.push(s);
    }
    return Array.from(map.entries());
  }, [shipments]);

  const inTransit = shipments.filter((s) => IN_TRANSIT.includes(s.status));
  const delayed = inTransit.filter((s) => s.delayed);
  const exceptions = shipments.filter((s) => s.exception);

  /* §Sprint 2 — the SAME deterministic work layer the Work Management surface
     uses, narrowed to the logistics sources. No second task system. */
  const logisticsWork = useWorkItems('admin').filter((w) => LOGISTICS_WORK_SOURCES.includes(w.source));
  const today = demoToday();

  /* §Sprint 2 — metric drill-downs narrow the SAME grouped shipment list. */
  const [focus, setFocus] = useState<'all' | 'in_transit' | 'delayed' | 'exceptions'>('all');
  const visibleGroups = useMemo(() => {
    if (focus === 'all') return groups;
    return groups
      .map(([brandId, list]) => {
        const rows =
          focus === 'exceptions'
            ? list.filter((s) => s.exception)
            : focus === 'delayed'
              ? list.filter((s) => IN_TRANSIT.includes(s.status) && s.delayed)
              : list.filter((s) => IN_TRANSIT.includes(s.status));
        return [brandId, rows] as [string, DemoShipment[]];
      })
      .filter(([, rows]) => rows.length > 0);
  }, [groups, focus]);

  const overdueWork = logisticsWork.filter((w) => w.dueDate !== null && w.dueDate < today);
  const dueThisWeekWork = logisticsWork.filter((w) => {
    if (!w.dueDate) return false;
    const d = daysBetween(today, w.dueDate);
    return d >= 0 && d <= 7;
  });

  const metrics: MetricTileData[] = [
    {
      id: 'logistics-in-transit',
      label: 'In Transit',
      value: String(inTransit.length),
      size: 'hero',
      tone: 'info',
      statusText: `${shipments.length} shipments total`,
      context: 'Shipments in a transit state across every brand',
      domain: 'logistics',
      onOpen: () => setFocus('in_transit'),
      testId: 'logistics-metric-in-transit',
      valueTestId: 'logistics-metric-in-transit-value',
    },
    {
      id: 'logistics-delayed',
      label: 'Delayed',
      value: String(delayed.length),
      tone: delayed.length > 0 ? 'warning' : 'success',
      statusText: delayed.length > 0 ? 'Carrier delay flagged' : 'No delays',
      context: 'In-transit shipments the carrier has flagged as late',
      domain: 'finance',
      onOpen: () => setFocus('delayed'),
      testId: 'logistics-metric-delayed',
      valueTestId: 'logistics-metric-delayed-value',
    },
    {
      id: 'logistics-exceptions',
      label: 'Exceptions',
      value: String(exceptions.length),
      tone: exceptions.length > 0 ? 'danger' : 'success',
      statusText: exceptions.length > 0 ? 'Needs resolution' : 'No exceptions',
      context: 'Shipments the carrier has raised an exception on',
      domain: 'compliance',
      onOpen: () => setFocus('exceptions'),
      testId: 'logistics-metric-exceptions',
      valueTestId: 'logistics-metric-exceptions-value',
    },
    {
      id: 'logistics-work',
      label: 'Open logistics work',
      value: String(logisticsWork.length),
      tone: logisticsWork.length > 0 ? 'warning' : 'success',
      statusText: `${overdueWork.length} overdue`,
      context: 'Acknowledgement, fulfilment-window and shipment-exception items',
      domain: 'catalogue',
      onOpen: () => setFocus('all'),
      testId: 'logistics-metric-work',
      valueTestId: 'logistics-metric-work-value',
    },
  ];

  return (
    <WorkspaceFrame className="space-y-4">
      <WorkspaceHeader
        eyebrow="Admin Hub · Logistics"
        title="Logistics Control"
        description="Operational view — shipments in transit, delays and exceptions by brand and PO. Shipment state feeds the canonical work layer, so an exception becomes an actionable item rather than a passive row."
        meta={
          <>
            <span className="font-mono text-[11px] text-zinc-500">{shipments.length} shipments</span>
            <span className="font-mono text-[11px] text-zinc-500">{groups.length} brands</span>
            <span className="font-mono text-[11px] text-zinc-500">focus: {focus.replace(/_/g, ' ')}</span>
            <span className="font-mono text-[11px] text-zinc-500">
              deterministic simulation · no live carrier call
            </span>
          </>
        }
        toolbar={
          <div className="flex flex-wrap items-center gap-1.5" data-testid="logistics-focus">
            {(['all', 'in_transit', 'delayed', 'exceptions'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFocus(f)}
                data-testid={`logistics-focus-${f}`}
                className={
                  focus === f
                    ? 'rounded-lg bg-brass-500 px-2.5 py-1 text-[11px] font-medium text-white'
                    : 'rounded-lg bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-zinc-400 hover:bg-white/[0.08] hover:text-white'
                }
              >
                {f.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        }
      />

      <DemoBanner />

      <MetricBand items={metrics} columns={4} />

      <WorkspaceGrid
        rail={
          <>
            <ContextPanel title="Operational work">
              <RecordFieldList
                fields={[
                  { label: 'Open items', value: String(logisticsWork.length) },
                  { label: 'Overdue', value: String(overdueWork.length) },
                  { label: 'Due this week', value: String(dueThisWeekWork.length) },
                ]}
              />
              <ul className="mt-2 space-y-1.5">
                {logisticsWork.slice(0, 5).map((w) => (
                  <li key={w.id} className="text-[11px] leading-snug text-zinc-400">
                    <span className="font-medium text-zinc-200">{WORK_SOURCE_LABELS[w.source]}</span>
                    {' · '}
                    {w.title}
                    {w.dueDate && <span className="font-mono text-zinc-600"> · due {w.dueDate}</span>}
                  </li>
                ))}
                {logisticsWork.length === 0 && (
                  <li className="text-[11px] text-zinc-500">No open logistics work.</li>
                )}
              </ul>
              <p className="mt-2 text-[11px] leading-snug text-zinc-400">
                These are the same items Work Management and the derived calendar show — resolving
                one there stops its reminder here too.
              </p>
            </ContextPanel>
            <ContextPanel title="Lifecycle">
              <p className="text-[11px] leading-snug text-zinc-400">
                PO → acknowledgement → fulfilment → shipment → delivery → exception → resolution →
                return → close. Every stage is deterministic simulation; nothing here is a live
                carrier response.
              </p>
            </ContextPanel>
          </>
        }
      >
      {focus !== 'all' && visibleGroups.length === 0 && (
        <Card className="p-4">
          <p className="text-xs text-zinc-500">No shipments match the current focus.</p>
        </Card>
      )}

      {groups.length === 0 && (
        // §M9 — honest empty state: the surface previously rendered three zero
        // metrics and nothing else, which reads like missing data rather than a
        // real state. A shipment can only exist once a PO reaches a shipping
        // status, so this is what "no operational shipments yet" looks like.
        <Card className="p-6">
          <p className="text-xs text-zinc-400">
            No shipments are in transit. A shipment appears here only after one of
            your purchase orders reaches <span className="text-zinc-200">ready to fulfil</span>,{' '}
            <span className="text-zinc-200">shipped</span> or{' '}
            <span className="text-zinc-200">delivered</span> — Mercenta never shows a
            placeholder shipment.
          </p>
        </Card>
      )}

      {visibleGroups.map(([brandId, list]) => (
        <WorkspaceSection key={brandId} title={brandName(brandId)} domain="logistics">
          {/* §Phase D — canonical DataTable + canonical shipment status layer:
              the same state now reads identically here, on the brand logistics
              hub and on the carrier manifest. The delayed-row highlight and the
              PO → (sim) provenance link are preserved. */}
          <DataTable
            dataTable={`logistics-${brandId}`}
            caption={`Shipments in transit for ${brandName(brandId)}`}
            rows={list}
            rowKey={(s) => s.id}
            emptyMessage="No shipments for this brand."
            rowClassName={(s) => (IN_TRANSIT.includes(s.status) && s.delayed ? 'bg-amber-500/5' : undefined)}
            columns={[
              {
                key: 'poNumber',
                label: 'PO',
                primary: true,
                render: (s) => (
                  <span className="font-mono text-brass">
                    {s.poNumber}
                    {poFor(s.poNumber)?.simulated === true && (
                      <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-brass-500/15 text-brass-400 border border-brass-500/20">
                        (sim)
                      </span>
                    )}
                  </span>
                ),
              },
              {
                key: 'carrier',
                label: 'Carrier',
                render: (s) => <span className="capitalize">{s.carrier.replace('_', ' ')}</span>,
              },
              {
                key: 'reference',
                label: 'Reference',
                hideBelow: 'lg',
                render: (s) => <span className="font-mono text-zinc-400">{s.reference}</span>,
              },
              {
                key: 'status',
                label: 'Status',
                render: (s) => {
                  const transit = IN_TRANSIT.includes(s.status);
                  const p = shipmentStatusPresentation(s.status);
                  return (
                    <span className="inline-flex flex-wrap items-center gap-2">
                      <StatusBadge dataStatus={p.dataStatus} tone={p.tone}>
                        {p.label}
                      </StatusBadge>
                      {transit && s.delayed && (
                        <Badge className="text-[9px] bg-amber-500/15 text-amber-300 border-amber-500/20">
                          Delayed
                        </Badge>
                      )}
                      {s.exception && (
                        <Badge className="text-[9px] bg-red-500/15 text-red-300 border-red-500/20">
                          Exception
                        </Badge>
                      )}
                    </span>
                  );
                },
              },
              {
                key: 'value',
                label: 'Value',
                align: 'right',
                render: (s) => (
                  <span className="font-mono text-white">£{s.value.toLocaleString()}</span>
                ),
              },
            ]}
          />
        </WorkspaceSection>
      ))}
      </WorkspaceGrid>
    </WorkspaceFrame>
  );
}

// Keep Ship import referenced for potential header use.
void Ship;
