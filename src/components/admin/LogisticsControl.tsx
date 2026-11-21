import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { useBrands, usePurchaseOrders, useShipmentsAll } from '@/data/queries';
import { DemoBanner } from '@/components/shared/DemoBanner';
import { Badge, Button, Card, DataTable, StatusBadge } from '@/components/ui';
import { shipmentStatusPresentation } from '@/lib/statusPresentation';
import { Container, RefreshCw, Ship } from 'lucide-react';
import type { DemoShipment } from '@/data/demoData';
import type { ChannelInstruction, PurchaseOrder, ShipmentStatus } from '@/types';
import { advanceShipmentViaDhl } from '@/lib/dhl/domain';
import { resolveProviderMode } from '@/integrations/types';
/* §P9 (programme decision 4) — the ONE canonical writer of a consignment's
   milestone. The console reads its rows from the canonical store (React Query),
   so it MUST write through the same owner; a context-only setter left the row's
   own value and status badge unchanged. */
import { setShipmentMilestone } from '@/data/demoStore';
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
import { buildOperationalMap } from '@/lib/logistics/operationsMap';
import { useRecordDeepLink } from '@/lib/runtime/recordDeepLink';
/**
 * §P10 (programme §4 P10) — the Logistics Hub's completion surfaces, each backed by its
 * ONE owner: the cross-tenant document queue (the SAME rule the brand's badge counts),
 * the carrier PROVIDER CONFIGURATION (`D10-10`) and the consolidation posture
 * (programme decision 11).
 */
import { PoDocumentQueuePanel } from '@/components/shared/logistics/PoDocumentQueuePanel';
import { CarrierProviderConfigurationPanel } from '@/components/shared/logistics/CarrierProviderConfigurationPanel';
import {
  SupplyRouteEscalationPanel,
  type SupplyRouteConsignment,
} from '@/components/shared/logistics/SupplyRouteEscalationPanel';
import { carrierProviderConfigurations } from '@/lib/shipping/providerConfiguration';
import { listChannelInstructions } from '@/lib/commerce/channelInstructions';
import { OPERATIONAL_TRUTH } from '@/config/logisticsGeo';
import { useWorkItems } from '@/lib/work/useWork';
import { WORK_SOURCE_LABELS, demoToday, daysBetween } from '@/lib/work/workStore';
import type { WorkSource } from '@/lib/work/types';

/**
 * §P9 (programme decision 4) — THE CARRIER-EVENT CONSOLE, REHOMED.
 *
 * WHAT MOVED AND WHY
 * ------------------
 * P9 removed the 3PL carrier surface completely (the carrier environment, role,
 * shell + its three views, `CarrierDashboard`, `BakLogistics` and the admin
 * `Carrier Monitor`). Carrier users do not exist: Mercenta operates its carrier
 * accounts **by API**.
 *
 * Removing the portal must NOT remove the capability it carried — a carrier
 * event that advances a consignment, and the request/response log behind it —
 * so the capability moves to its canonical owner: the MERCENTA Admin Logistics
 * Hub, which is the Mercenta-side operator of those accounts. Same domain call
 * (`advanceShipmentViaDhl`), same canonical `ShipmentStatus` transitions, same
 * `DataTable` structural hooks (`carrier-manifest`) the repointed specs assert.
 *
 * WHAT IS DIFFERENT (and better)
 * ------------------------------
 *   · The advance is attributed to the acting Founder / Super Admin
 *     (`mercenta-admin-logistics`), not to a fictional carrier login.
 *   · The shipment's OWN `brandId` is passed (the old terminal hardcoded
 *     `brand-astonish` for every row).
 *   · The retired `fedex`/`bak` carrier contexts are gone (decision 1).
 *   · Fail-closed is unchanged: a provider that does not positively resolve
 *     simulation/live is REFUSED by the domain and nothing is advanced.
 */
const CARRIER_MILESTONES: ShipmentStatus[] = [
  'factory_intake',
  'bak_depot',
  'sea_transit',
  'air_transit',
  'uk_customs_cleared',
  /** §P5 — the pre-live arrival state (was `mercenta_hub`). */
  'destination_fc',
  'live_amazon',
];

const IN_TRANSIT = ['sea_transit', 'air_transit', 'factory_intake'];

/** §Sprint 2 — the logistics side of the deterministic operating layer. */
const LOGISTICS_WORK_SOURCES: WorkSource[] = ['shipment_exception', 'po_acknowledgement', 'po_window'];

/**
 * §Stage-6 — LOGISTICS CONTROL (operational view).
 * Which shipments are in transit, which are delayed/exception — grouped by
 * brand and PO. This is the ops team's day view; carrier API health lives in
 * the separate Carrier Integration Monitor.
 */
export function LogisticsControl({
  onOpenIntegrations,
}: {
  /**
   * §P10 — the REAL hand-off to the canonical Integrations view, which owns the
   * provider credentials. Mercenta administers the carrier accounts there; this Hub
   * states the configuration and never becomes a second credential form.
   */
  onOpenIntegrations?: () => void;
} = {}) {
  const shipmentsQuery = useShipmentsAll();
  // Stable identity so the downstream useMemo deps don't churn every render.
  const shipments = useMemo(() => shipmentsQuery.data?.data ?? [], [shipmentsQuery.data]);
  const brandsQuery = useBrands();
  // §PHASE 3 STAGE 3 — stable identity (the route-consignment join below is a
  // useMemo input), using the same pattern as the shipments query above.
  const brands = useMemo(() => brandsQuery.data?.data ?? [], [brandsQuery.data]);
  // §Phase E5 (G6) — stable identity (the PO list is a join input below), using
  // the same pattern as the shipments query above.
  const poQuery = usePurchaseOrders();
  const pos = useMemo(() => poQuery.data?.data ?? [], [poQuery.data]);
  /**
   * §Wave 3 Part 5 — ONE LOADING FLAG. While these queries resolved, the band
   * asserted 0 in-transit / "No delays" / "No exceptions" and the list said
   * "No consignment matches the current filters." — a false statement about the
   * operator's shipments (measured by `validate-state-coverage.mjs`).
   */
  const logisticsPending = shipmentsQuery.isPending || brandsQuery.isPending || poQuery.isPending;

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

  /* ── §Logistics — the Mercenta-side counterpart of the brand hub. It is
     deliberately cross-tenant: the ops team's job is to see every brand's
     consignments. The evidence derivation reads the canonical shipment feed and
     the canonical provider modes, so its LIVE / SIMULATED / AMBIENT labelling can
     never disagree with the brand surface.
     §BATCH 3 (2026-10-10) — the interactive map was removed on the owner's
     instruction; the consignment inspector is now driven by selecting a
     consignment in the table below. */
  const { modes, integrations } = useIntegrations();
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);

  /* §P9 — the rehomed carrier-event console: one busy row at a time, and the
     provider's own answer per row (never a fabricated milestone). */
  const { addApiLog, apiLogs, products } = useApp();
  const [busyShipmentId, setBusyShipmentId] = useState<string | null>(null);
  const [lastCarrierResult, setLastCarrierResult] = useState<Record<string, string>>({});

  /**
   * §BATCH 7 (Part 4.1a) — DEEP LINK. `/admin/logistics?shipment=<id>` selects THAT
   * consignment in the inspector, so an "ASN filed" notice lands on the consignment
   * it names rather than on the logistics hub. The id is the canonical shipment id
   * (the leg id IS the shipment id — `buildOperationalMap` maps `id: input.id`).
   * Applied ONCE per value by the shared reader.
   */
  const deepLinkShipment = useRecordDeepLink('shipment');
  useEffect(() => {
    if (!deepLinkShipment) return;
    if (!shipments.some((s) => s.id === deepLinkShipment)) return;
    setSelectedShipmentId(deepLinkShipment);
  }, [deepLinkShipment, shipments]);

  /**
   * §P10 — THE CARRIER PROVIDER CONFIGURATION (matrix `D10-10`).
   *
   * Derived by its ONE owner from the canonical shipping config + the AUTHORITATIVE
   * provider modes + the non-secret connection state. This Hub re-derives no mode, no
   * lane and no account label, and it is not a credential form: the Integrations Hub
   * owns the credentials (`onOpenIntegrations` is the hand-off).
   */
  const providerConfigurations = useMemo(
    () => carrierProviderConfigurations({ modes, connections: integrations }),
    [modes, integrations]
  );

  /**
   * §PHASE 3 STAGE 3 — the consignments the Supply Route & 3PL escalation panel
   * reads. The panel derives the route from these recorded facts only
   * (`src/lib/fulfillment/routeFromRecords.ts`); nothing is invented here.
   */
  const routeConsignments: SupplyRouteConsignment[] = useMemo(
    () =>
      shipments.map((s) => {
        const brand = brands.find((b) => b.id === s.brandId);
        return {
          id: s.id,
          poNumber: s.poNumber,
          brandName: brand?.profile.businessName ?? s.brandId,
          brandNation: brand?.nation ?? null,
          origin: s.origin ?? null,
          shipmentStatus: s.status,
          appointmentRequired: !!s.appointment,
        };
      }),
    [shipments, brands]
  );

  /** The instruction Mercenta actioned for a PO — the same rule the brand Hub uses. */
  const instructionForPo = (poId: string): ChannelInstruction | undefined => {
    const list = listChannelInstructions().filter((i) => i.purchaseOrderId === poId);
    return list.find((i) => i.type === 'po_acknowledgement') ?? list[0];
  };

  /**
   * USER ACTION → DOMAIN WORKFLOW → PROVIDER CONTRACT → SIMULATION ADAPTER →
   * SIMULATED MILESTONE → DOMAIN STATE → AUDIT → EVENT → UI UPDATE.
   *
   * The operator is asking Mercenta's DHL integration for the consignment's
   * status; the provider body (mock today, live later) decides the next
   * milestone. A provider that is not positively simulation-safe is refused and
   * the shipment is left exactly as it was (fail-closed).
   */
  async function requestDhlUpdate(shipment: DemoShipment) {
    if (busyShipmentId) return;
    setBusyShipmentId(shipment.id);
    try {
      const res = await advanceShipmentViaDhl({
        shipmentId: shipment.id,
        brandId: shipment.brandId,
        manifest: {
          reference: shipment.reference,
          customer: brandName(shipment.brandId),
          origin: shipment.origin,
          destination: shipment.destination,
          value: shipment.value,
        },
        getMode: (pid) => resolveProviderMode(modes, pid),
        actorId: 'mercenta-admin-logistics',
      });
      if (res.ok && res.to) {
        /* §P9 — the milestone is applied through the CANONICAL writer (the store the
           page itself reads), so the row's own value and status badge move. */
        setShipmentMilestone(shipment.id, res.to);
        if (res.waybill) {
          addApiLog({
            id: `api-${shipment.id}-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            }),
            method: 'GET',
            endpoint: `/v1/dhl/shipments/${res.waybill}`,
            payload: { milestone: res.milestone, exception: res.exception, delayed: res.delayed },
            status: 200,
          });
        }
        setLastCarrierResult((prev) => ({
          ...prev,
          [shipment.id]: res.exception
            ? `exception: ${res.milestone ?? 'hold'} (retry recovers)`
            : `${res.from ?? ''} → ${res.to} · ${res.milestone ?? ''}`,
        }));
      } else if (res.status === 'safety_refused') {
        setLastCarrierResult((prev) => ({
          ...prev,
          [shipment.id]: `refused: ${res.safetyReason ?? 'not simulation-safe'}`,
        }));
      } else {
        setLastCarrierResult((prev) => ({
          ...prev,
          [shipment.id]: `${res.error ?? 'provider error'} — retry`,
        }));
      }
    } finally {
      setBusyShipmentId(null);
    }
  }

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

  /* §P9 — the rehomed carrier console obeys the SAME focus filter as the tables
     and the map above, so the three can never disagree about which consignments
     are on screen. */
  const carrierConsoleRows = useMemo(
    () => visibleGroups.flatMap(([, list]) => list),
    [visibleGroups]
  );

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
            <span className="font-mono text-ds-label text-muted">{shipments.length} shipments</span>
            <span className="font-mono text-ds-label text-muted">{groups.length} brands</span>
            <span className="font-mono text-ds-label text-muted">focus: {focus.replace(/_/g, ' ')}</span>
            <span className="font-mono text-ds-label text-muted">
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
                    ? 'rounded-ds-md bg-accent-500 px-2.5 py-1 text-ds-label font-medium text-on-accent'
                    : 'rounded-ds-md bg-tint px-2.5 py-1 text-ds-label font-medium text-muted hover:bg-tint hover:text-strong'
                }
              >
                {f.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        }
      />

      <DemoBanner />

      <MetricBand items={metrics} columns={4} loading={logisticsPending} />

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
                  <li key={w.id} className="text-ds-label leading-snug text-muted">
                    <span className="font-medium text-strong">{WORK_SOURCE_LABELS[w.source]}</span>
                    {' · '}
                    {w.title}
                    {w.dueDate && <span className="font-mono text-faint"> · due {w.dueDate}</span>}
                  </li>
                ))}
                {logisticsWork.length === 0 && (
                  <li className="text-ds-label text-muted">No open logistics work.</li>
                )}
              </ul>
              <p className="mt-2 text-ds-label leading-snug text-muted">
                These are the same items Work Management and the derived calendar show — resolving
                one there stops its reminder here too.
              </p>
            </ContextPanel>
            <ContextPanel title="Lifecycle">
              <p className="text-ds-label leading-snug text-muted">
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
                  <p className="text-ds-micro leading-relaxed text-muted" data-testid="admin-logistics-truth-reason">
                    {selectedLeg.truthReason}
                  </p>
                  {selectedLeg.channelArranged && (
                    <p className="text-ds-micro text-palette-indigo">
                      Channel-arranged carriage — Mercenta did not select this carrier.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-ds-label text-muted" data-testid="admin-logistics-inspector-empty">
                  Select a consignment in the table to see its route and evidence state.
                </p>
              )}
            </ContextPanel>
          </>
        }
      >
      {focus !== 'all' && visibleGroups.length === 0 && (
        <Card className="p-4">
          <p className="text-xs text-muted">No shipments match the current focus.</p>
        </Card>
      )}

      {groups.length === 0 && (
        // §M9 — honest empty state: the surface previously rendered three zero
        // metrics and nothing else, which reads like missing data rather than a
        // real state. A shipment can only exist once a PO reaches a shipping
        // status, so this is what "no operational shipments yet" looks like.
        <Card className="p-6">
          <p className="text-xs text-muted">
            No shipments are in transit. A shipment appears here only after one of
            your purchase orders reaches <span className="text-strong">ready to fulfil</span>,{' '}
            <span className="text-strong">shipped</span> or{' '}
            <span className="text-strong">delivered</span> — Mercenta never shows a
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
            loading={logisticsPending}
            rowClassName={(s) => (IN_TRANSIT.includes(s.status) && s.delayed ? 'bg-amber-500/5' : undefined)}
            /**
             * §BATCH 3 (2026-10-10) — the consignment inspector is now driven by
             * the TABLE. Before this, selection came only from the operational map
             * that has been removed, so the inspector would have become
             * unreachable. Clicking a row selects that consignment.
             */
            onRowClick={(s) => setSelectedShipmentId(s.id)}
            columns={[
              {
                key: 'poNumber',
                label: 'PO',
                primary: true,
                render: (s) => (
                  <span className="font-mono text-accent">
                    {s.poNumber}
                    {poFor(s.poNumber)?.simulated === true && (
                      <span className="ml-2 text-ds-micro px-1.5 py-0.5 rounded-ds-sm bg-accent-500/15 text-accent-400 border border-accent-500/20">
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
                render: (s) => <span className="font-mono text-muted">{s.reference}</span>,
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
                        <Badge className="text-ds-micro bg-state-warning/10 text-state-warning border-state-warning/20">
                          Delayed
                        </Badge>
                      )}
                      {s.exception && (
                        <Badge className="text-ds-micro bg-state-danger/10 text-state-danger border-state-danger/20">
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
                  <span className="font-mono text-strong">£{s.value.toLocaleString()}</span>
                ),
              },
            ]}
          />
        </WorkspaceSection>
      ))}
      {/* ── §P10 — CARRIER PROVIDER CONFIGURATION (matrix `D10-10`) ───────────
          The operator's view of how each Mercenta carrier account is configured and what
          state it is actually in — derived, fail-closed, and handed off to the ONE place
          that owns credentials rather than duplicated here. */}
      <WorkspaceSection
        title="Carrier provider configuration"
        description="How each Mercenta carrier account is configured, which lane it serves and what state it is in. Mercenta holds these accounts; a carrier never logs in, and a brand never configures one."
        domain="logistics"
      >
        <CarrierProviderConfigurationPanel
          configurations={providerConfigurations}
          scope="admin"
          onOpenIntegrations={onOpenIntegrations}
        />
      </WorkspaceSection>

      {/* ── §PHASE 3 STAGE 3 — SUPPLY ROUTE & 3PL ESCALATION ─────────────────
          The Phase 3 route model and the fail-closed escalation engine, surfaced
          for the operator: the declared 3PL partner (Delta Fulfillment), the
          escalation posture, and — per consignment — the derived route and the
          decision. A 3PL fulfils, it does not carry, so this sits beside the
          carrier configuration without changing the carrier model. */}
      <WorkspaceSection
        title="Supply route & 3PL escalation"
        description="The declared supply route for a consignment and whether a UK inventory buffer / 3PL (Delta Fulfillment) route may be appropriate. Fail-closed: while the escalation thresholds are not agreed, every decision routes to human review and no 3PL is recommended."
        domain="logistics"
      >
        <SupplyRouteEscalationPanel consignments={routeConsignments} loading={logisticsPending} />
      </WorkspaceSection>

      {/* ── §P10 — PO DOCUMENTS AWAITING DOWNLOAD ────────────────────────────
          The SAME derived queue the brand's nav badge counts, read cross-tenant so the
          ops team can see whose pack is still outstanding. The pack itself lives on the
          brand's Hub; this is the follow-up view, not a second document store. */}
      <WorkspaceSection
        title="PO documents awaiting the brand"
        description="Every accepted purchase order whose document pack is ready and whose consignment has not been dispatched — the same derived queue the brand's Logistics Hub renders."
        domain="logistics"
      >
        <PoDocumentQueuePanel
          pos={pos}
          brandNameFor={brandName}
          brandNationFor={(brandId) => brands.find((b) => b.id === brandId)?.nation ?? null}
          products={products}
          instructionForPo={instructionForPo}
          shipmentForPo={(poNumber) => {
            const row = shipments.find((s) => s.poNumber === poNumber);
            return row
              ? {
                  id: row.id,
                  status: row.status,
                  carrier: row.carrier,
                  trackingNumber: row.trackingNumber ?? null,
                  waybill: row.waybill ?? null,
                }
              : null;
          }}
          onOpenCarrierArtefact={() => {
            /* The admin console does not own the brand's print dialogues, and the pack
               reports those artefacts not-ready until a booking exists; nothing is
               fabricated here. */
          }}
          scope="admin"
        />
      </WorkspaceSection>

      {/*
        §P9 (programme decision 4) — THE REHOMED CARRIER-EVENT CONSOLE.

        The 3PL carrier surface is REMOVED (no carrier environment, role, shell,
        login card or Carrier Monitor), because Mercenta operates its carrier
        accounts by API. The capability the removed terminal carried — requesting
        a consignment's next carrier milestone and reading the request/response
        log behind it — belongs to MERCENTA, so it lives here, on the operator's
        Logistics Hub. Same domain path (`advanceShipmentViaDhl`), attributed to
        the acting Founder / Super Admin, fail-closed when a provider does not
        positively resolve simulation/live, and zero live network calls.
      */}
      <WorkspaceSection
        title="Carrier API console"
        description="Mercenta operates its carrier accounts (DHL, Palletline) by API. In simulation the carrier adapter decides the consignment's next milestone; nothing here contacts a carrier."
        domain="logistics"
      >
        <Card
          title="Bi-Directional Manifest Management"
          subtitle="Change the milestone to push the update across every environment"
          action={<RefreshCw className="w-4 h-4 text-muted" />}
        >
          <DataTable
            dataTable="carrier-manifest"
            caption="Carrier manifest"
            rows={carrierConsoleRows}
            rowKey={(s) => s.id}
            emptyMessage="No consignments are on screen for the current focus."
            loading={logisticsPending}
            columns={[
              {
                key: 'reference',
                label: 'Reference',
                primary: true,
                render: (s) => (
                  <div>
                    <div className="font-mono text-xs text-muted">{s.reference}</div>
                    <div className="mt-0.5 font-mono text-ds-micro text-faint">
                      {s.trackingNumber ?? '—'}
                    </div>
                  </div>
                ),
              },
              {
                key: 'shipment',
                label: 'Shipment',
                render: (s) => (
                  <div>
                    <div className="text-sm font-medium text-strong">{s.title}</div>
                    <div className="mt-0.5 text-xs text-muted">{brandName(s.brandId)}</div>
                  </div>
                ),
              },
              {
                key: 'carrier',
                label: 'Carrier',
                render: (s) => <span className="capitalize">{s.carrier.replace('_', ' ')}</span>,
              },
              {
                key: 'status',
                label: 'Current Status',
                align: 'center',
                render: (s) => {
                  const p = shipmentStatusPresentation(s.status);
                  return (
                    <StatusBadge dataStatus={p.dataStatus} tone={p.tone}>
                      {p.label}
                    </StatusBadge>
                  );
                },
              },
              {
                key: 'milestone',
                label: 'Update Milestone',
                render: (s) => (
                  <>
                    <select
                      value={s.status}
                      aria-label={`Update milestone for ${s.reference}`}
                      onChange={(e) => {
                        const next = e.target.value as ShipmentStatus;
                        /**
                         * §P9 — the milestone is applied through the CANONICAL writer,
                         * and the request is recorded in the console's own log, so the
                         * control's outcome matches its label (the old terminal wrote a
                         * context copy no surface rendered).
                         */
                        if (setShipmentMilestone(s.id, next)) {
                          addApiLog({
                            id: `api-${s.id}-${Date.now()}`,
                            timestamp: new Date().toLocaleTimeString('en-GB', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            }),
                            method: 'PUT',
                            endpoint: `/v1/shipments/${s.reference}/status`,
                            payload: { status: next, carrier: s.carrier },
                            status: 200,
                          });
                        }
                      }}
                      className="w-full cursor-pointer rounded-ds-sm border border-hairline bg-surface px-2.5 py-1.5 text-xs text-strong transition-colors focus:border-accent-500/60 focus:outline-none md:w-auto"
                    >
                      {CARRIER_MILESTONES.map((opt) => (
                        <option key={opt} value={opt} className="bg-surface">
                          {shipmentStatusPresentation(opt).label}
                        </option>
                      ))}
                    </select>
                    <div className="mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-ds-micro"
                        loading={busyShipmentId === s.id}
                        onClick={() => void requestDhlUpdate(s)}
                      >
                        <RefreshCw className="mr-1 h-3 w-3" />
                        DHL status → next milestone (sim)
                      </Button>
                      {lastCarrierResult[s.id] && (
                        <div className="mt-1 font-mono text-ds-micro leading-tight text-muted">
                          {lastCarrierResult[s.id]}
                        </div>
                      )}
                    </div>
                  </>
                ),
              },
            ]}
          />
        </Card>

        <Card
          title="Carrier API request log"
          subtitle="The requests this console made to the carrier adapter"
        >
          {apiLogs.length === 0 ? (
            <p className="text-ds-label text-muted">
              No carrier API requests yet. Advancing a milestone records its request here, with its
              payload — proof of what was asked and what came back.
            </p>
          ) : (
            <div className="max-h-72 space-y-1.5 overflow-y-auto" data-testid="carrier-api-log">
              {apiLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-ds-sm border border-hairline p-2 font-mono text-ds-label text-muted"
                >
                  <span className="text-faint">{log.timestamp}</span>{' '}
                  <span className="text-accent-400">{log.method}</span> {log.endpoint}
                  <span className="ml-2 text-state-success">{log.status}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </WorkspaceSection>


      </WorkspaceGrid>
    </WorkspaceFrame>
  );
}

// Keep Ship import referenced for potential header use.
void Ship;
