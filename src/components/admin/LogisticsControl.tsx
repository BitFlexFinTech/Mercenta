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
import { useIntegrations } from '@/integrations/IntegrationsContext';
import { LogisticsMapCanvas } from '@/components/shared/logistics/LogisticsMapCanvas';
import { buildOperationalMap } from '@/lib/logistics/operationsMap';
import {
  MAP_TRUTH_NOTICE,
  OPERATIONAL_TRUTH,
  OPERATIONAL_TRUTH_ORDER,
} from '@/config/logisticsGeo';
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

  /* ── §Logistics-map — the SAME operational map the brand hub uses ──────
     This is the Mercenta-side counterpart, so it is deliberately cross-tenant:
     the ops team's job is to see every brand's consignments. The map reads the
     canonical shipment feed and the canonical provider modes, so its LIVE /
     SIMULATED / AMBIENT labelling can never disagree with the brand surface. */
  const { modes } = useIntegrations();
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [mapTruth, setMapTruth] = useState('all');

  const mapModel = useMemo(
    () =>
      buildOperationalMap(
        shipments.map((s) => ({
          id: s.id,
          reference: s.reference,
          title: s.title,
          poNumber: s.poNumber,
          brandId: s.brandId,
          carrier: s.carrier,
          status: s.status,
          origin: s.origin,
          destination: s.destination,
          value: s.value,
          delayed: s.delayed,
          exception: s.exception,
          waybill: s.waybill ?? null,
          trackingNumber: s.trackingNumber ?? null,
          freightTerm: poByNumber.get(s.poNumber)?.freightTerm ?? null,
          simulated: poByNumber.get(s.poNumber)?.simulated,
          providerModes: modes,
        }))
      ),
    [shipments, poByNumber, modes]
  );

  /**
   * The map obeys the SAME focus filter as the tables below, plus an evidence
   * filter. A filter that changed the tables but not the map would make the map
   * decorative.
   */
  const mapVisibleIds = useMemo(() => {
    const ids = new Set<string>();
    for (const leg of mapModel.legs) {
      if (mapTruth !== 'all' && leg.truth !== mapTruth) continue;
      if (focus === 'in_transit' && !IN_TRANSIT.includes(leg.status)) continue;
      if (focus === 'delayed' && !leg.delayed) continue;
      if (focus === 'exceptions' && !leg.exception) continue;
      ids.add(leg.id);
    }
    return ids;
  }, [mapModel.legs, mapTruth, focus]);

  const selectedLeg = mapModel.legs.find((l) => l.id === selectedShipmentId) ?? null;
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
        title="Logistics Hub"
        description="Operational view — shipments in transit, delays and exceptions by brand and PO. Shipment state feeds the canonical work layer, so an exception becomes an actionable item rather than a passive row."
        meta={
          <>
            <span className="font-mono text-ds-label text-zinc-500">{shipments.length} shipments</span>
            <span className="font-mono text-ds-label text-zinc-500">{groups.length} brands</span>
            <span className="font-mono text-ds-label text-zinc-500">focus: {focus.replace(/_/g, ' ')}</span>
            <span className="font-mono text-ds-label text-zinc-500">
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
                    ? 'rounded-lg bg-brass-500 px-2.5 py-1 text-ds-label font-medium text-white'
                    : 'rounded-lg bg-white/[0.04] px-2.5 py-1 text-ds-label font-medium text-zinc-400 hover:bg-white/[0.08] hover:text-white'
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
                  <li key={w.id} className="text-ds-label leading-snug text-zinc-400">
                    <span className="font-medium text-zinc-200">{WORK_SOURCE_LABELS[w.source]}</span>
                    {' · '}
                    {w.title}
                    {w.dueDate && <span className="font-mono text-zinc-600"> · due {w.dueDate}</span>}
                  </li>
                ))}
                {logisticsWork.length === 0 && (
                  <li className="text-ds-label text-zinc-500">No open logistics work.</li>
                )}
              </ul>
              <p className="mt-2 text-ds-label leading-snug text-zinc-400">
                These are the same items Work Management and the derived calendar show — resolving
                one there stops its reminder here too.
              </p>
            </ContextPanel>
            <ContextPanel title="Lifecycle">
              <p className="text-ds-label leading-snug text-zinc-400">
                PO → acknowledgement → fulfilment → shipment → delivery → exception → resolution →
                return → close. Every stage is deterministic simulation; nothing here is a live
                carrier response.
              </p>
            </ContextPanel>

            <ContextPanel title="Consignment inspector">
              {selectedLeg ? (
                <div className="space-y-2" data-testid="admin-logistics-inspector">
                  <StatusBadge
                    tone={OPERATIONAL_TRUTH[selectedLeg.truth].tone}
                    dataStatus={selectedLeg.truth}
                  >
                    {OPERATIONAL_TRUTH[selectedLeg.truth].label}
                  </StatusBadge>
                  <RecordFieldList
                    fields={[
                      { label: 'Reference', value: selectedLeg.reference },
                      { label: 'PO', value: selectedLeg.poNumber || '—' },
                      { label: 'Brand', value: brandName(selectedLeg.brandId) },
                      { label: 'Carrier', value: selectedLeg.carrier },
                      { label: 'Origin', value: selectedLeg.origin.raw || '—' },
                      { label: 'Destination', value: selectedLeg.destination.raw || '—' },
                      { label: 'Value', value: `£${selectedLeg.value.toLocaleString()}` },
                    ]}
                  />
                  <p className="text-ds-micro leading-relaxed text-zinc-500" data-testid="admin-logistics-truth-reason">
                    {selectedLeg.truthReason}
                  </p>
                  {selectedLeg.channelArranged && (
                    <p className="text-ds-micro text-palette-indigo">
                      Channel-arranged carriage — Mercenta did not select this carrier.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-ds-label text-zinc-500" data-testid="admin-logistics-inspector-empty">
                  Select a consignment on the map to see its route and evidence state.
                </p>
              )}
            </ContextPanel>
          </>
        }
      >
      {focus !== 'all' && visibleGroups.length === 0 && (
        <Card className="p-4">
          <p className="text-xs text-zinc-500">No shipments match the current focus.</p>
        </Card>
      )}

      <WorkspaceSection
        title="Operational map"
        description="Every brand's consignments on one surface, positioned by the canonical stage. Cross-tenant by design — this is the Mercenta operations view."
        domain="logistics"
        action={
          <div className="flex flex-wrap items-center gap-1.5" data-testid="logistics-map-evidence">
            {(['all', ...OPERATIONAL_TRUTH_ORDER] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setMapTruth(t)}
                data-testid={`logistics-map-evidence-${t}`}
                className={
                  mapTruth === t
                    ? 'rounded-lg bg-brass-500 px-2.5 py-1 text-ds-label font-medium text-white'
                    : 'rounded-lg bg-white/[0.04] px-2.5 py-1 text-ds-label font-medium text-zinc-400 hover:bg-white/[0.08] hover:text-white'
                }
              >
                {t === 'all' ? 'All evidence' : OPERATIONAL_TRUTH[t].label}
              </button>
            ))}
          </div>
        }
      >
        <LogisticsMapCanvas
          model={mapModel}
          visibleIds={mapVisibleIds}
          selectedId={selectedShipmentId}
          onSelect={setSelectedShipmentId}
          testId="admin-logistics-map"
          className="h-[280px] sm:h-[360px] lg:h-[420px]"
        />
        <p className="text-ds-micro text-zinc-600">{MAP_TRUTH_NOTICE}</p>
        {mapModel.schematic.length > 0 && (
          <p className="text-ds-micro text-zinc-600" data-testid="admin-logistics-schematic-notice">
            {mapModel.schematic.length} consignment
            {mapModel.schematic.length === 1 ? '' : 's'} declare an unresolvable location and are listed
            below rather than plotted at an invented coordinate.
          </p>
        )}
      </WorkspaceSection>

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
                      <span className="ml-2 text-ds-micro px-1.5 py-0.5 rounded bg-brass-500/15 text-brass-400 border border-brass-500/20">
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
                        <Badge className="text-ds-micro bg-amber-500/15 text-amber-300 border-amber-500/20">
                          Delayed
                        </Badge>
                      )}
                      {s.exception && (
                        <Badge className="text-ds-micro bg-red-500/15 text-red-300 border-red-500/20">
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
