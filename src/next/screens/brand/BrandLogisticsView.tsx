import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Barcode,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Info,
  MapPin,
  Package,
  Plane,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Ship,
  Truck,
  X,
} from 'lucide-react';
import { OPERATIONAL_TRUTH, freightSemantics } from '@/config/logisticsGeo';
import { etaPresentation, isEtaAtRisk } from '@/lib/logistics/shipmentEta';
import { appointmentPresentation } from '@/lib/shipping/deliveryAppointment';
import { performanceLabel, type DeliveryPerformance } from '@/lib/logistics/deliveryPerformance';
import type { OperationalLeg, OperationalMapModel } from '@/lib/logistics/operationsMap';
import { providerModeFor, isCarrierOperational, type CarrierEligibility } from '@/lib/shipping/carrierEligibility';
import { shipmentStatusPresentation } from '@/lib/statusPresentation';
import type { IntegrationId, IntegrationMode } from '@/integrations/types';
import {
  STAGE_LABELS,
  STATUS_LABELS,
  type DeliveryAppointment,
  type FreightTerm,
  type PurchaseOrderLineItem,
  type ShipmentEta,
  type ShipmentStage,
  type ShipmentStatus,
} from '@/types';
import {
  ConsoleTable,
  ErrorStateBlock,
  InlineStatus,
  LoadingRows,
  MetricStrip,
  PageHeader,
  SlideOverDrawer,
  type ConsoleColumn,
  type MetricItem,
} from '@/next/components/ConsolePrimitives';

export interface LogisticsRowItem {
  id: string;
  reference: string;
  title: string;
  poNumber: string;
  brandId: string;
  customer: string;
  value: number;
  status: ShipmentStatus;
  carrier: string;
  stage: ShipmentStage;
  cbm: number;
  origin: string;
  destination: string;
  date: string;
  trackingNumber: string;
  delayed: boolean;
  exception: boolean;
  waybill: string | null;
  freightTerm: FreightTerm | null;
  simulated?: boolean;
  eta?: ShipmentEta;
  appointment?: DeliveryAppointment;
}

export interface UnshippedAcceptedPo {
  id: string;
  poNumber: string;
  freightTerm?: FreightTerm | null;
  brandCategory?: string;
  defaultCarrier: string;
  lineItems: PurchaseOrderLineItem[];
}

export interface BrandLogisticsViewProps {
  brandDisplayName: string;
  tenantLabel: string;
  isBrandSession: boolean;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;

  rows: LogisticsRowItem[];
  model: OperationalMapModel;
  performance: DeliveryPerformance;
  etaCoverage: {
    dated: number;
    simulated: number;
    delivered: number;
    unavailable: number;
    total: number;
  };
  eligibility: CarrierEligibility;
  providerModes: Partial<Record<IntegrationId, IntegrationMode>>;
  deepLinkPoNumber?: string | null;

  acceptedUnshippedPos: UnshippedAcceptedPo[];
  onCreateShipment?: (
    poId: string,
    asn: {
      shipDate: string;
      carrier: string;
      cartons: Array<{
        sku: string;
        quantity: number;
        weightKg: number;
        lengthCm: number;
        widthCm: number;
        heightCm: number;
      }>;
      lotNumber?: string;
      expiryDate?: string;
    }
  ) => Promise<{ ok: boolean; shipmentId?: string; warnings: string[]; error?: string }>;
  onDownloadHtml: (filename: string, html: string) => void;

  renderDocumentQueueSlot: (
    openArtefact: (kind: 'carrier_label' | 'freight_waybill', shipmentId: string | null) => void
  ) => ReactNode;
  renderDocumentPackSlot: (
    selectedLeg: OperationalLeg | null,
    selectedRow: LogisticsRowItem | null,
    openArtefact: (kind: 'carrier_label' | 'freight_waybill', shipmentId: string) => void
  ) => ReactNode;
  providerConfigsSlot: ReactNode;
  renderTrackingProducts?: (poNumber: string, shipmentId: string) => ReactNode;
}

const CARRIER_LABELS: Record<string, string> = {
  dhl: 'DHL Express',
  palletline: 'Palletline',
  amazon_partner: 'Channel-arranged carrier',
};

function carrierLabel(carrier: string): string {
  return CARRIER_LABELS[carrier] ?? carrier;
}

function mapTone(tone: string) {
  if (tone === 'success') return 'success' as const;
  if (tone === 'warning' || tone === 'brass') return 'warning' as const;
  if (tone === 'danger') return 'danger' as const;
  if (tone === 'info') return 'info' as const;
  return 'neutral' as const;
}

const MILESTONES: {
  status: ShipmentStatus;
  label: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  { status: 'factory_intake', label: 'Factory Intake', icon: Package },
  { status: 'bak_depot', label: 'Regional Hub / Depot', icon: MapPin },
  { status: 'sea_transit', label: 'Sea Transit', icon: Ship },
  { status: 'air_transit', label: 'Air Transit', icon: Plane },
  { status: 'uk_customs_cleared', label: 'UK Customs Cleared', icon: FileText },
  { status: 'destination_fc', label: 'Delivered to Destination FC', icon: MapPin },
  { status: 'live_amazon', label: 'Live on retail-channel', icon: Truck },
];

function downloadRenderedArtefact(
  onDownloadHtml: (filename: string, html: string) => void,
  node: HTMLElement | null,
  filename: string,
  title: string
): void {
  if (!node) return;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>
    body{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#000;padding:32px}
    dl{display:grid;grid-template-columns:auto 1fr;gap:8px 24px;margin:0}
    dt{color:#555}
  </style></head><body>${node.innerHTML}</body></html>`;
  onDownloadHtml(filename, html);
}

export function BrandLogisticsView({
  brandDisplayName,
  tenantLabel,
  isBrandSession,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  rows,
  model,
  performance,
  etaCoverage,
  eligibility,
  providerModes,
  deepLinkPoNumber,
  acceptedUnshippedPos,
  onCreateShipment,
  onDownloadHtml,
  renderDocumentQueueSlot,
  renderDocumentPackSlot,
  providerConfigsSlot,
  renderTrackingProducts,
}: BrandLogisticsViewProps) {
  const [query, setQuery] = useState('');
  const [truthFilter, setTruthFilter] = useState('all');
  const [laneFilter, setLaneFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [insight, setInsight] = useState<'performance' | 'eta' | null>(null);

  const [waybillId, setWaybillId] = useState<string | null>(null);
  const [labelsId, setLabelsId] = useState<string | null>(null);
  const [trackingId, setTrackingId] = useState<string | null>(null);

  const [asnDrawerOpen, setAsnDrawerOpen] = useState(false);
  const [asnPoId, setAsnPoId] = useState('');
  const [asnShipDate, setAsnShipDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [asnLotNumber, setAsnLotNumber] = useState('');
  const [asnExpiryDate, setAsnExpiryDate] = useState('');
  const [asnQuantities, setAsnQuantities] = useState<Record<string, number>>({});
  const [asnBusy, setAsnBusy] = useState(false);
  const [asnNotice, setAsnNotice] = useState<string | null>(null);
  const [asnError, setAsnError] = useState<string | null>(null);

  useEffect(() => {
    if (!deepLinkPoNumber) return;
    const match = rows.find((r) => r.poNumber === deepLinkPoNumber);
    if (match) setSelectedId(match.id);
  }, [deepLinkPoNumber, rows]);

  useEffect(() => {
    if (!asnDrawerOpen || acceptedUnshippedPos.length === 0) return;
    const chosen = acceptedUnshippedPos.find((p) => p.id === asnPoId) ?? acceptedUnshippedPos[0];
    setAsnPoId(chosen.id);
    const nextQty: Record<string, number> = {};
    for (const line of chosen.lineItems) {
      if (line.ackStatus !== 'rejected') {
        nextQty[line.sku] = line.acknowledgedQty ?? line.quantity;
      }
    }
    setAsnQuantities(nextQty);
  }, [asnDrawerOpen, asnPoId, acceptedUnshippedPos]);

  const visibleLegs = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return model.legs.filter((leg) => {
      if (truthFilter !== 'all' && leg.truth !== truthFilter) return false;
      if (statusFilter !== 'all' && leg.status !== statusFilter) return false;
      if (laneFilter === 'international' && leg.origin.place?.kind !== 'brand_facility') return false;
      if (laneFilter === 'uk' && leg.origin.place?.kind !== 'uk_gateway') return false;
      if (laneFilter === 'exceptions' && !(leg.exception || leg.delayed)) return false;
      if (needle) {
        const haystack = [
          leg.reference,
          leg.title,
          leg.poNumber,
          leg.origin.raw,
          leg.destination.raw,
          leg.carrier,
          STATUS_LABELS[leg.status as ShipmentStatus] ?? leg.status,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [model.legs, query, truthFilter, statusFilter, laneFilter]);

  const selectedLeg = useMemo(
    () => model.legs.find((l) => l.id === selectedId) ?? null,
    [model.legs, selectedId]
  );
  const selectedRow = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId]
  );

  const rowById = (id: string) => rows.find((r) => r.id === id) ?? null;

  const statusOptions = useMemo(
    () => [...new Set(model.legs.map((l) => l.status))],
    [model.legs]
  );

  const inTransitCount = model.legs.filter(
    (l) => l.status === 'sea_transit' || l.status === 'air_transit' || l.status === 'bak_depot'
  ).length;

  const topMetrics: MetricItem[] = [
    {
      id: 'consignments',
      label: 'Consignments',
      value: String(model.legs.length),
      context: `${model.mapped.length} plotted · ${model.schematic.length} schematic`,
    },
    {
      id: 'moving',
      label: 'In transit',
      value: String(inTransitCount),
      context: 'Sea, air and depot movement',
    },
    {
      id: 'exceptions',
      label: 'Exceptions / delayed',
      value: String(model.exceptionCount),
      context: model.exceptionCount > 0 ? 'Needs attention' : 'No exception flags',
    },
    {
      id: 'simulated',
      label: 'Simulated legs',
      value: String(model.truthCounts.simulated),
      context: 'Provider resolves to simulation',
    },
  ];

  const evidenceMetrics: MetricItem[] = [
    {
      id: 'live',
      label: 'Live verified',
      value: String(model.truthCounts.live_verified),
      context:
        model.truthCounts.live_verified === 0
          ? 'No live carrier credentials held'
          : 'Live carrier reference present',
    },
    {
      id: 'ambient',
      label: 'Ambient / context',
      value: String(model.truthCounts.ambient),
      context: 'No positive provider resolution',
    },
    {
      id: 'delivery-performance',
      label: 'On-time delivery',
      value: performanceLabel(performance.onTimeRate),
      context:
        performance.delivered === 0
          ? 'No delivered consignment yet'
          : `${performance.onTime}/${performance.delivered} delivered on schedule`,
      active: insight === 'performance',
      onClick: () => setInsight((c) => (c === 'performance' ? null : 'performance')),
      testId: 'kpi-delivery-performance',
      valueTestId: 'kpi-delivery-performance-value',
    },
    {
      id: 'eta-coverage',
      label: 'ETA coverage',
      value: `${etaCoverage.dated}/${etaCoverage.total}`,
      context:
        etaCoverage.total === 0
          ? 'No consignments in scope'
          : `${etaCoverage.simulated} simulated · ${etaCoverage.delivered} delivered · ${etaCoverage.unavailable} unavailable`,
      active: insight === 'eta',
      onClick: () => setInsight((c) => (c === 'eta' ? null : 'eta')),
      testId: 'kpi-eta-coverage',
      valueTestId: 'kpi-eta-coverage-value',
    },
  ];

  const columns: ConsoleColumn<OperationalLeg>[] = [
    {
      key: 'ref',
      header: 'Consignment',
      render: (leg) => (
        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono font-semibold text-ink-950">{leg.reference}</span>
            {leg.poNumber && (
              <span className="font-mono text-[12px] text-faint">{leg.poNumber}</span>
            )}
          </div>
          <div className="text-[12px] text-ink-600 truncate max-w-[260px]">{leg.title}</div>
          <div className="text-[11px] text-faint">
            Evidence: {OPERATIONAL_TRUTH[leg.truth].short} · {carrierLabel(leg.carrier)}
          </div>
        </div>
      ),
    },
    {
      key: 'route',
      header: 'Declared Route',
      render: (leg) => (
        <div className="text-[12px] text-secondary space-y-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span>{leg.origin.raw || 'Origin not declared'}</span>
            <ArrowRight className="w-3 h-3 text-quiet shrink-0" aria-hidden="true" />
            <span>{leg.destination.raw || 'Destination not declared'}</span>
          </div>
          {!leg.geometry && (
            <div className="text-[11px] text-faint">Location not resolvable (schematic)</div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (leg) => {
        const status = shipmentStatusPresentation(leg.status);
        return (
          <div className="space-y-1">
            <InlineStatus
              label={status.label}
              tone={mapTone(status.tone)}
              dataStatus={status.dataStatus}
            />
            {(leg.exception || leg.delayed) && (
              <div className="flex items-center gap-1 text-[11px] text-state-warning">
                <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                Exception
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'value',
      header: 'Value / Vol',
      align: 'right',
      hideOnMobile: true,
      render: (leg) => (
        <div className="font-mono text-right">
          <div className="text-ink-950 font-semibold">£{leg.value.toLocaleString('en-GB')}</div>
          <div className="text-[11px] text-faint">{leg.cbm} CBM</div>
        </div>
      ),
    },
    {
      key: 'artefacts',
      header: 'Documents & Track',
      render: (leg) => (
        <div className="flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            data-testid={`logistics-waybill-${leg.id}`}
            onClick={() => setWaybillId(leg.id)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-hairline bg-surface-raised text-[12px] font-medium text-ink-800 hover:bg-surface"
          >
            <Printer className="w-3 h-3" aria-hidden="true" />
            Waybill
          </button>
          <button
            type="button"
            data-testid={`logistics-labels-${leg.id}`}
            onClick={() => setLabelsId(leg.id)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-hairline bg-surface-raised text-[12px] font-medium text-ink-800 hover:bg-surface"
          >
            <Barcode className="w-3 h-3" aria-hidden="true" />
            Labels
          </button>
          <button
            type="button"
            data-testid={`logistics-track-${leg.id}`}
            onClick={() => setTrackingId(leg.id)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-hairline bg-surface-raised text-[12px] font-medium text-ink-800 hover:bg-surface"
          >
            <Truck className="w-3 h-3" aria-hidden="true" />
            Track
          </button>
        </div>
      ),
    },
  ];

  async function handleSubmitAsn() {
    if (!onCreateShipment || !asnPoId || asnBusy) return;
    const po = acceptedUnshippedPos.find((p) => p.id === asnPoId);
    if (!po) return;
    setAsnBusy(true);
    setAsnError(null);
    setAsnNotice(null);

    const cartons = po.lineItems
      .filter((l) => l.ackStatus !== 'rejected' && (asnQuantities[l.sku] ?? 0) > 0)
      .map((l) => ({
        sku: l.sku,
        quantity: asnQuantities[l.sku] ?? 0,
        weightKg: 5,
        lengthCm: 30,
        widthCm: 20,
        heightCm: 20,
      }));

    const res = await onCreateShipment(po.id, {
      shipDate: asnShipDate,
      carrier: po.defaultCarrier,
      cartons,
      ...(asnLotNumber.trim() ? { lotNumber: asnLotNumber.trim() } : {}),
      ...(asnExpiryDate ? { expiryDate: asnExpiryDate } : {}),
    });
    setAsnBusy(false);
    if (!res.ok) {
      setAsnError(res.error ?? 'Unable to record consignment ASN.');
      return;
    }
    setAsnNotice(
      [
        `Consignment ${res.shipmentId ?? ''} created for ${po.poNumber}.`,
        ...res.warnings,
      ]
        .filter(Boolean)
        .join(' ')
    );
    setAsnDrawerOpen(false);
    if (res.shipmentId) setSelectedId(res.shipmentId);
  }

  if (isError) {
    return (
      <div>
        <PageHeader
          title="Logistics Hub"
          description="Inbound consignments, route provenance, freight terms, and shipping document packs."
        />
        <ErrorStateBlock
          title="Unable to load consignments"
          message={errorMessage}
          onRetry={onRetry}
        />
      </div>
    );
  }

  const waybillRow = waybillId ? rowById(waybillId) : null;
  const labelsRow = labelsId ? rowById(labelsId) : null;
  const trackingRow = trackingId ? rowById(trackingId) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Logistics Hub"
        description="Consignments Mercenta moves on your behalf, declared routes, carrier evidence states, and PO shipping document packs."
        meta={
          <>
            <span>
              {isBrandSession ? 'Tenant' : 'Scope'}:{' '}
              <strong className="text-ink-950">{tenantLabel}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <InlineStatus
              label={
                model.truthCounts.live_verified > 0
                  ? 'Live carrier verified'
                  : 'Simulated carrier legs'
              }
              tone={model.truthCounts.live_verified > 0 ? 'success' : 'info'}
              dataStatus={model.truthCounts.live_verified > 0 ? 'live' : 'simulation'}
            />
            <span aria-hidden="true">·</span>
            <span data-testid="logistics-scope-count">
              <strong className="font-mono text-ink-950">{model.legs.length}</strong> in scope
            </span>
          </>
        }
        actions={
          <>
            {acceptedUnshippedPos.length > 0 && onCreateShipment && (
              <button
                type="button"
                onClick={() => setAsnDrawerOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[var(--mr-accent)] text-on-dark text-[12px] font-medium hover:bg-[var(--mr-accent-600)] whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                Create ASN consignment
              </button>
            )}
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-hairline-strong bg-surface-raised text-[12px] font-medium text-ink-900 hover:bg-surface whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              Refresh feed
            </button>
          </>
        }
      />

      {asnNotice && (
        <div
          role="status"
          className="border border-state-success/20 bg-state-success/10 rounded-md px-4 py-3 text-[14px] text-ink-900 flex items-center justify-between gap-3"
        >
          <span>{asnNotice}</span>
          <button
            type="button"
            onClick={() => setAsnNotice(null)}
            className="text-[12px] text-ink-600 hover:text-ink-950"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Two clean 4-column metric bands */}
      <MetricStrip items={topMetrics} loading={isLoading} columns={4} />
      <MetricStrip items={evidenceMetrics} loading={isLoading} columns={4} />

      {/* Insight drill-down panel when On-time delivery or ETA coverage is clicked */}
      {insight && (
        <div
          className="border border-hairline bg-surface-raised rounded-md p-4 space-y-3"
          data-testid={`logistics-insight-${insight}`}
        >
          <div className="flex items-center justify-between border-b border-hairline pb-2.5">
            <h2 className="text-[14px] font-semibold text-ink-950">
              {insight === 'performance' ? 'Delivery performance breakdown' : 'ETA & appointment basis'}
            </h2>
            <button
              type="button"
              onClick={() => setInsight(null)}
              aria-label="Close insight detail"
              className="p-1 rounded text-faint hover:text-ink-900"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {insight === 'performance' ? (
            <div className="space-y-3" data-testid="delivery-performance-detail">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: 'Consignments', value: String(performance.total) },
                  { label: 'Delivered', value: String(performance.delivered) },
                  { label: 'In transit', value: String(performance.inTransit) },
                  { label: 'Exceptions', value: String(performance.exceptions) },
                  { label: 'On-time', value: String(performance.onTime) },
                  { label: 'On-time rate', value: performanceLabel(performance.onTimeRate) },
                  { label: 'Exception rate', value: performanceLabel(performance.exceptionRate) },
                  {
                    label: 'Provider-verified',
                    value: `${performance.verifiedDelivered} of ${performance.delivered}`,
                  },
                ].map((item) => (
                  <div key={item.label} className="border border-hairline rounded px-3 py-2 bg-surface/40">
                    <div className="text-[11px] uppercase tracking-[0.06em] text-faint">{item.label}</div>
                    <div className="mt-0.5 font-mono text-[14px] font-semibold text-ink-950">
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
              <ul className="space-y-1 text-[12px] text-ink-600">
                {performance.sources.map((src) => (
                  <li key={src}>{src}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="space-y-2" data-testid="eta-basis-detail">
              {rows.length === 0 ? (
                <p className="text-[14px] text-ink-600">No consignments in scope.</p>
              ) : (
                <ul className="divide-y divide-hairline-06">
                  {rows.map((row) => {
                    const pres = row.eta
                      ? etaPresentation(row.eta)
                      : {
                          label: 'ETA unavailable',
                          detail: 'No ETA projection attached to this consignment.',
                          tone: 'unavailable' as const,
                        };
                    const appView = row.appointment ? appointmentPresentation(row.appointment) : null;
                    return (
                      <li
                        key={row.id}
                        className="py-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[12px]"
                        data-testid={`eta-basis-${row.reference}`}
                      >
                        <span className="font-mono font-semibold text-ink-950">{row.reference}</span>
                        <span className="font-medium text-ink-800">{pres.label}</span>
                        <span className="text-ink-600">{pres.detail}</span>
                        {isEtaAtRisk(
                          row.eta ?? { date: null, basis: 'unavailable', simulated: false, source: '' },
                          row.delayed,
                          row.exception
                        ) && (
                          <span className="text-state-warning font-medium">At risk against window</span>
                        )}
                        {appView && (
                          <span className="basis-full text-ink-600">
                            <strong className="text-ink-900">Delivery appointment: {appView.label}.</strong>{' '}
                            {appView.windowDetail}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* Shipping Documents Download Queue */}
      <section className="border border-hairline bg-surface-raised rounded-md p-5 space-y-3">
        <div>
          <h2 className="text-[16px] font-semibold text-ink-950">Shipping documents</h2>
          <p className="text-[12px] text-ink-600">
            Accepted purchase orders whose document pack is ready to download and print before dispatch.
          </p>
        </div>
        {renderDocumentQueueSlot((kind, shipmentId) => {
          if (!shipmentId) return;
          if (kind === 'carrier_label') setLabelsId(shipmentId);
          else setWaybillId(shipmentId);
        })}
      </section>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="w-4 h-4 text-quiet absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search reference, PO, origin…"
            aria-label="Search consignments"
            data-testid="logistics-search"
            className="pl-9 pr-3 py-1.5 text-[14px] border border-hairline-strong rounded-md bg-surface-raised text-ink-950 w-64 focus:outline-2 focus:outline-[var(--mr-accent)]"
          />
        </div>
        <select
          value={truthFilter}
          onChange={(e) => setTruthFilter(e.target.value)}
          aria-label="Filter by travel evidence"
          className="px-3 py-1.5 text-[14px] border border-hairline-strong rounded-md bg-surface-raised text-ink-950"
        >
          <option value="all">Evidence: all</option>
          <option value="live_verified">
            {OPERATIONAL_TRUTH.live_verified.label} ({model.truthCounts.live_verified})
          </option>
          <option value="simulated">
            {OPERATIONAL_TRUTH.simulated.label} ({model.truthCounts.simulated})
          </option>
          <option value="ambient">
            {OPERATIONAL_TRUTH.ambient.label} ({model.truthCounts.ambient})
          </option>
        </select>
        <select
          value={laneFilter}
          onChange={(e) => setLaneFilter(e.target.value)}
          aria-label="Filter by lane"
          className="px-3 py-1.5 text-[14px] border border-hairline-strong rounded-md bg-surface-raised text-ink-950"
        >
          <option value="all">Lane: all</option>
          <option value="international">International origin</option>
          <option value="uk">UK gateway origin</option>
          <option value="exceptions">Exceptions only</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
          className="px-3 py-1.5 text-[14px] border border-hairline-strong rounded-md bg-surface-raised text-ink-950"
        >
          <option value="all">Status: all</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s as ShipmentStatus] ?? s}
            </option>
          ))}
        </select>
        {(query || truthFilter !== 'all' || laneFilter !== 'all' || statusFilter !== 'all') && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setTruthFilter('all');
              setLaneFilter('all');
              setStatusFilter('all');
            }}
            className="px-3 py-1.5 rounded-md border border-hairline bg-surface-raised text-[12px] font-medium text-secondary hover:bg-surface"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Consignments Table + Right Rail */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2 space-y-3">
          {isLoading ? (
            <LoadingRows rows={4} label="Loading your consignments…" />
          ) : (
            <ConsoleTable
              rows={visibleLegs}
              columns={columns}
              rowKey={(leg) => leg.id}
              selectedKey={selectedId}
              onRowClick={(leg) => setSelectedId((c) => (c === leg.id ? null : leg.id))}
              emptyTitle="No consignments match"
              emptyDescription="Clear filters or accept a purchase order to trigger consignment ASN creation."
              emptyActionLabel={
                query || truthFilter !== 'all' || laneFilter !== 'all' || statusFilter !== 'all'
                  ? 'Clear filters'
                  : undefined
              }
              onEmptyAction={() => {
                setQuery('');
                setTruthFilter('all');
                setLaneFilter('all');
                setStatusFilter('all');
              }}
            />
          )}
          <p className="text-[12px] text-faint">
            Booking a consignment happens through the canonical ASN flow on Purchase Orders — freight cannot be booked without an eligible PO.
          </p>
        </div>

        {/* Context Rail: Eligibility + Carrier Providers */}
        <aside className="space-y-4">
          <div className="border border-hairline bg-surface-raised rounded-md p-4 space-y-3">
            <h2 className="text-[14px] font-semibold text-ink-950">How carriage is arranged</h2>
            <div className="space-y-1">
              <div className="text-[12px] font-medium text-state-info">
                Freight Collect — Channel-arranged
              </div>
              <p className="text-[12px] text-ink-600">
                Retail-channel-arranged. Mercenta carrier accounts are refused on collect POs.
              </p>
            </div>
            <div className="space-y-1">
              <div className="text-[12px] font-medium text-[var(--mr-accent)]">
                Freight Prepaid — Mercenta-arranged
              </div>
              <p className="text-[12px] text-ink-600">
                International uses DHL Express; UK domestic uses Palletline. Admin overrides are audited.
              </p>
            </div>

            <div className="border-t border-hairline pt-3 space-y-1.5" data-testid="carrier-eligibility">
              <div className="text-[11px] uppercase tracking-[0.06em] text-faint">
                Eligibility for consignment in scope
              </div>
              <div className="text-[12px] text-secondary" data-testid="carrier-eligibility-lane">
                Lane: {eligibility.lane === 'uk_domestic' ? 'UK domestic' : 'International'} ·{' '}
                {eligibility.channelArranged ? 'channel-arranged' : 'Mercenta-arranged'}
              </div>
              {eligibility.permitted.length > 0 && (
                <div className="text-[12px] text-ink-900" data-testid="carrier-eligibility-permitted">
                  Permitted:{' '}
                  <span className="font-mono">
                    {eligibility.permitted
                      .map((c) => `${carrierLabel(c)} (${providerModeFor(providerModes, c)})`)
                      .join(', ')}
                  </span>
                </div>
              )}
              {eligibility.overrideCandidates.length > 0 && (
                <div className="text-[12px] text-ink-600" data-testid="carrier-eligibility-override">
                  Override only:{' '}
                  <span className="font-mono">
                    {eligibility.overrideCandidates.map((c) => carrierLabel(c)).join(', ')}
                  </span>
                </div>
              )}
              {eligibility.blocked.length > 0 && (
                <ul className="space-y-0.5 text-[12px] text-faint" data-testid="carrier-eligibility-blocked">
                  {eligibility.blocked.map((entry) => (
                    <li key={entry.carrier}>
                      <span className="font-mono">{entry.carrier}</span> refused — {entry.reason}
                      {!isCarrierOperational(providerModeFor(providerModes, entry.carrier)) && (
                        <span> ({providerModeFor(providerModes, entry.carrier)})</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {eligibility.permitted.length === 0 && !eligibility.channelArranged && (
                <p className="text-[12px] text-state-warning" data-testid="carrier-eligibility-none">
                  No Mercenta carrier account is operational on this lane right now.
                </p>
              )}
            </div>
          </div>

          <div className="border border-hairline bg-surface-raised rounded-md p-4 space-y-2" data-testid="brand-carrier-providers">
            <h2 className="text-[14px] font-semibold text-ink-950">Carrier providers</h2>
            {providerConfigsSlot}
          </div>
        </aside>
      </div>

      {/* Consignment Inspector Slide-over Drawer */}
      <SlideOverDrawer
        open={Boolean(selectedLeg && selectedRow)}
        onClose={() => setSelectedId(null)}
        title={selectedLeg?.reference ?? 'Consignment'}
        subtitle={selectedLeg ? `${selectedLeg.title} · ${selectedLeg.poNumber || 'No PO'}` : undefined}
        testId="logistics-inspector"
        footer={
          selectedLeg ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setWaybillId(selectedLeg.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-hairline-strong bg-surface-raised text-[12px] font-medium text-ink-900 hover:bg-surface"
              >
                <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                Waybill
              </button>
              <button
                type="button"
                onClick={() => setLabelsId(selectedLeg.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-hairline-strong bg-surface-raised text-[12px] font-medium text-ink-900 hover:bg-surface"
              >
                <Barcode className="w-3.5 h-3.5" aria-hidden="true" />
                Labels
              </button>
              <button
                type="button"
                onClick={() => setTrackingId(selectedLeg.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[var(--mr-accent)] text-on-dark text-[12px] font-medium hover:bg-[var(--mr-accent-600)]"
              >
                <Truck className="w-3.5 h-3.5" aria-hidden="true" />
                Track timeline
              </button>
            </div>
          ) : undefined
        }
      >
        {selectedLeg && selectedRow && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <InlineStatus
                label={shipmentStatusPresentation(selectedLeg.status).label}
                tone={mapTone(shipmentStatusPresentation(selectedLeg.status).tone)}
                dataStatus={shipmentStatusPresentation(selectedLeg.status).dataStatus}
              />
              <span className="text-quiet">·</span>
              <InlineStatus
                label={OPERATIONAL_TRUTH[selectedLeg.truth].label}
                tone={mapTone(OPERATIONAL_TRUTH[selectedLeg.truth].tone)}
                dataStatus={selectedLeg.truth}
              />
              {(selectedLeg.exception || selectedLeg.delayed) && (
                <>
                  <span className="text-quiet">·</span>
                  <InlineStatus label="Exception / Delay" tone="warning" dataStatus="exception" />
                </>
              )}
            </div>

            <dl className="grid grid-cols-2 gap-3 text-[12px] border border-hairline rounded-md p-3">
              <div>
                <dt className="text-faint">Stage</dt>
                <dd className="font-medium text-ink-950">
                  {STAGE_LABELS[selectedLeg.stage] ?? selectedLeg.stage}
                </dd>
              </div>
              <div>
                <dt className="text-faint">PO Reference</dt>
                <dd className="font-mono font-medium text-ink-950">{selectedLeg.poNumber || '—'}</dd>
              </div>
              <div>
                <dt className="text-faint">Carrier</dt>
                <dd className="font-medium text-ink-950">{carrierLabel(selectedLeg.carrier)}</dd>
              </div>
              <div>
                <dt className="text-faint">Value / Volume</dt>
                <dd className="font-mono font-medium text-ink-950">
                  £{selectedLeg.value.toLocaleString('en-GB')} · {selectedLeg.cbm} CBM
                </dd>
              </div>
              <div>
                <dt className="text-faint">Declared Origin</dt>
                <dd className="font-mono text-ink-900">{selectedLeg.origin.raw || '—'}</dd>
              </div>
              <div>
                <dt className="text-faint">Declared Destination</dt>
                <dd className="font-mono text-ink-900">{selectedLeg.destination.raw || '—'}</dd>
              </div>
            </dl>

            {/* ETA & Appointment */}
            <div className="border border-hairline rounded-md p-3 space-y-1.5 text-[12px]">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-faint uppercase tracking-[0.06em] text-[11px]">ETA Projection</span>
                <span
                  className="font-mono font-semibold text-ink-950"
                  data-testid="logistics-eta-value"
                  data-eta-basis={selectedRow.eta?.basis ?? 'none'}
                >
                  {selectedRow.eta ? etaPresentation(selectedRow.eta).label : 'ETA unavailable'}
                </span>
              </div>
              {selectedRow.eta && (
                <p className="text-ink-600" data-testid="logistics-eta-basis">
                  {etaPresentation(selectedRow.eta).detail}
                </p>
              )}
              {selectedRow.appointment && (
                <div
                  className="pt-1 border-t border-hairline space-y-0.5"
                  data-testid="logistics-appointment"
                  data-appointment-state={selectedRow.appointment.state}
                  data-appointment-window={selectedRow.appointment.window.code}
                >
                  <p className="text-ink-900 font-medium">
                    Delivery appointment: {appointmentPresentation(selectedRow.appointment).label}
                  </p>
                  <p className="text-ink-600">
                    {appointmentPresentation(selectedRow.appointment).windowDetail}
                  </p>
                  <p className="text-faint" data-testid="logistics-appointment-basis">
                    {appointmentPresentation(selectedRow.appointment).detail}
                  </p>
                </div>
              )}
            </div>

            {/* Evidence Explanation */}
            <div className="border border-hairline bg-surface/70 rounded-md p-3 space-y-1 text-[12px]">
              <div className="font-semibold text-ink-900 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" aria-hidden="true" />
                Why this leg is {OPERATIONAL_TRUTH[selectedLeg.truth].short}
              </div>
              <p className="text-secondary" data-testid="logistics-truth-reason">
                {selectedLeg.truthReason}
              </p>
              <p className="text-faint">
                {selectedLeg.origin.reason} {selectedLeg.destination.reason}
              </p>
            </div>

            {/* Freight Term & Carriage Responsibility */}
            <div className="border border-hairline rounded-md p-3 space-y-1.5 text-[12px]">
              <div className="text-[11px] uppercase tracking-[0.06em] text-faint">
                Carriage responsibility
              </div>
              {freightSemantics(selectedLeg.freightTerm) ? (
                <>
                  <div
                    className={`font-semibold ${
                      freightSemantics(selectedLeg.freightTerm)!.channelArranged
                        ? 'text-state-info'
                        : 'text-[var(--mr-accent)]'
                    }`}
                  >
                    {selectedLeg.freightTerm === 'collect'
                      ? 'FREIGHT COLLECT — CHANNEL-ARRANGED'
                      : 'FREIGHT PREPAID — MERCENTA-ARRANGED'}
                  </div>
                  <p className="text-ink-600">
                    {freightSemantics(selectedLeg.freightTerm)!.arranges}
                  </p>
                </>
              ) : (
                <p className="text-ink-600">
                  No declared freight term on PO — Mercenta does not assert who arranges carriage.
                </p>
              )}
              {selectedLeg.expectedCarrier && (
                <p className="text-ink-600">
                  Lane rule expects{' '}
                  <span className="font-mono font-medium">{carrierLabel(selectedLeg.expectedCarrier)}</span>.
                </p>
              )}
              {selectedLeg.channelArranged && (
                <p className="text-state-info">Channel-arranged: Mercenta does not select this carrier.</p>
              )}
              {selectedLeg.carrierValidationError && (
                <p className="text-state-warning">{selectedLeg.carrierValidationError}</p>
              )}
            </div>

            {/* Documents for this PO */}
            <div className="border border-hairline rounded-md p-3 space-y-2">
              <h3 className="text-[14px] font-semibold text-ink-950">Documents for this PO</h3>
              {renderDocumentPackSlot(selectedLeg, selectedRow, (kind, sId) => {
                if (kind === 'carrier_label') setLabelsId(sId);
                else setWaybillId(sId);
              })}
            </div>
          </div>
        )}
      </SlideOverDrawer>

      {/* Waybill Modal */}
      {waybillRow && (
        <WaybillDialog
          brandDisplayName={brandDisplayName}
          shipment={waybillRow}
          onDownloadHtml={onDownloadHtml}
          onClose={() => setWaybillId(null)}
        />
      )}

      {/* Shipping Labels Modal */}
      {labelsRow && (
        <LabelsDialog
          brandDisplayName={brandDisplayName}
          shipment={labelsRow}
          onDownloadHtml={onDownloadHtml}
          onClose={() => setLabelsId(null)}
        />
      )}

      {/* Tracking Milestones Modal */}
      {trackingRow && (
        <TrackingDialog
          shipment={trackingRow}
          productsSlot={renderTrackingProducts?.(trackingRow.poNumber, trackingRow.id)}
          onClose={() => setTrackingId(null)}
        />
      )}

      {/* Create Consignment ASN Drawer (for accepted unshipped POs) */}
      <SlideOverDrawer
        open={asnDrawerOpen}
        onClose={() => setAsnDrawerOpen(false)}
        title="Create ASN consignment"
        subtitle="Creates a consignment strictly from an accepted, unshipped Purchase Order."
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-secondary mb-1">
              Accepted Purchase Order
            </label>
            <select
              value={asnPoId}
              onChange={(e) => setAsnPoId(e.target.value)}
              className="w-full px-3 py-2 text-[14px] border border-hairline-strong rounded-md bg-surface-raised text-ink-950"
            >
              {acceptedUnshippedPos.map((po) => (
                <option key={po.id} value={po.id}>
                  {po.poNumber} · {carrierLabel(po.defaultCarrier)}
                </option>
              ))}
            </select>
          </div>
          {(() => {
            const po = acceptedUnshippedPos.find((p) => p.id === asnPoId);
            if (!po) return null;
            const requiresLot =
              po.brandCategory === 'Grocery' || po.brandCategory === 'Health & Personal Care';
            return (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-medium text-secondary mb-1">
                      Ship date
                    </label>
                    <input
                      type="date"
                      value={asnShipDate}
                      onChange={(e) => setAsnShipDate(e.target.value)}
                      className="w-full px-3 py-2 text-[14px] border border-hairline-strong rounded-md bg-surface-raised"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-secondary mb-1">
                      Assigned carrier (rule)
                    </label>
                    <div className="px-3 py-2 text-[14px] border border-hairline rounded-md bg-surface text-ink-800">
                      {carrierLabel(po.defaultCarrier)}
                    </div>
                  </div>
                </div>
                {requiresLot && (
                  <div className="grid grid-cols-2 gap-3 border border-state-warning/20 bg-state-warning/10 rounded-md p-3">
                    <div>
                      <label className="block text-[12px] font-medium text-ink-800 mb-1">
                        Lot number (required)
                      </label>
                      <input
                        type="text"
                        value={asnLotNumber}
                        onChange={(e) => setAsnLotNumber(e.target.value)}
                        placeholder="e.g. LOT-2026-01"
                        className="w-full px-3 py-1.5 text-[14px] border border-hairline-strong rounded bg-surface-raised"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-ink-800 mb-1">
                        Expiry date (required)
                      </label>
                      <input
                        type="date"
                        value={asnExpiryDate}
                        onChange={(e) => setAsnExpiryDate(e.target.value)}
                        className="w-full px-3 py-1.5 text-[14px] border border-hairline-strong rounded bg-surface-raised"
                      />
                    </div>
                  </div>
                )}
                <div className="border border-hairline rounded-md divide-y divide-hairline-06">
                  {po.lineItems
                    .filter((l) => l.ackStatus !== 'rejected')
                    .map((l) => (
                      <div key={l.sku} className="px-3 py-2.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-mono text-[12px] font-semibold text-ink-950">
                            {l.sku}
                          </div>
                          <div className="text-[12px] text-ink-600 truncate">{l.productName}</div>
                        </div>
                        <label className="flex items-center gap-2 text-[12px] text-ink-600">
                          Qty
                          <input
                            type="number"
                            min={0}
                            max={l.acknowledgedQty ?? l.quantity}
                            value={asnQuantities[l.sku] ?? 0}
                            onChange={(e) =>
                              setAsnQuantities((prev) => ({
                                ...prev,
                                [l.sku]: Number(e.target.value),
                              }))
                            }
                            className="w-20 px-2 py-1 border border-hairline-strong rounded text-right font-mono"
                          />
                        </label>
                      </div>
                    ))}
                </div>
              </>
            );
          })()}
          {asnError && (
            <div className="border border-state-danger/20 bg-state-danger/10 rounded-md p-3 text-[12px] text-state-danger">
              {asnError}
            </div>
          )}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              disabled={asnBusy || !asnPoId}
              onClick={() => void handleSubmitAsn()}
              className="px-4 py-2 rounded-md bg-[var(--mr-accent)] text-on-dark text-[12px] font-medium hover:bg-[var(--mr-accent-600)] disabled:opacity-50"
            >
              {asnBusy ? 'Submitting…' : 'Create consignment ASN'}
            </button>
            <button
              type="button"
              onClick={() => setAsnDrawerOpen(false)}
              className="px-4 py-2 rounded-md border border-hairline text-[12px] font-medium text-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      </SlideOverDrawer>
    </div>
  );
}

/* ── ARTEFACT MODALS ──────────────────────────────────────────────────────── */

function WaybillDialog({
  brandDisplayName,
  shipment,
  onDownloadHtml,
  onClose,
}: {
  brandDisplayName: string;
  shipment: LogisticsRowItem;
  onDownloadHtml: (filename: string, html: string) => void;
  onClose: () => void;
}) {
  const printableRef = useRef<HTMLDivElement | null>(null);
  return (
    <SlideOverDrawer
      open
      onClose={onClose}
      title="Freight waybill"
      subtitle="Printable consignment document generated from the canonical shipment record."
      testId="logistics-waybill-dialog"
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-md border border-hairline bg-surface-raised text-[12px] font-medium text-secondary"
          >
            Close
          </button>
          <button
            type="button"
            data-testid="logistics-waybill-download"
            onClick={() =>
              downloadRenderedArtefact(
                onDownloadHtml,
                printableRef.current,
                `waybill-${shipment.trackingNumber || shipment.reference}.html`,
                'Freight waybill'
              )
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-hairline-strong bg-surface-raised text-[12px] font-medium text-ink-900 hover:bg-surface"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            Download
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[var(--mr-accent)] text-on-dark text-[12px] font-medium hover:bg-[var(--mr-accent-600)]"
          >
            <Printer className="w-3.5 h-3.5" aria-hidden="true" />
            Print
          </button>
        </div>
      }
    >
      <div ref={printableRef} className="rounded-md bg-surface border border-hairline p-5 text-ink-950">
        <div className="mb-4 flex items-center justify-between border-b-2 border-hairline-strong pb-3">
          <div>
            <div className="text-[16px] font-bold uppercase tracking-tight">{brandDisplayName}</div>
            <div className="text-[12px] text-faint">Freight Waybill</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-faint uppercase">Tracking no.</div>
            <div className="font-mono text-[14px] font-bold">{shipment.trackingNumber}</div>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
          <div>
            <dt className="text-faint">Reference</dt>
            <dd className="font-semibold">{shipment.reference}</dd>
          </div>
          <div>
            <dt className="text-faint">Date</dt>
            <dd className="font-semibold">{shipment.date}</dd>
          </div>
          <div>
            <dt className="text-faint">Origin</dt>
            <dd className="font-semibold">{shipment.origin}</dd>
          </div>
          <div>
            <dt className="text-faint">Destination</dt>
            <dd className="font-semibold">{shipment.destination}</dd>
          </div>
          <div>
            <dt className="text-faint">Consignee</dt>
            <dd className="font-semibold">{shipment.customer}</dd>
          </div>
          <div>
            <dt className="text-faint">Value / Volume</dt>
            <dd className="font-mono font-semibold">
              £{shipment.value.toLocaleString('en-GB')} · {shipment.cbm} CBM
            </dd>
          </div>
          <div>
            <dt className="text-faint">Carrier</dt>
            <dd className="font-semibold uppercase">{carrierLabel(shipment.carrier)}</dd>
          </div>
        </dl>
        <div className="mt-4 border-2 border-dashed border-hairline-strong p-4 text-center">
          <div className="mb-1 text-[11px] text-faint uppercase">Barcode</div>
          <div className="font-mono text-[20px] tracking-widest">{shipment.trackingNumber}</div>
          <div className="mt-3 flex justify-center gap-0.5">
            {Array.from({ length: 40 }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 2,
                  height: (i + shipment.reference.length) % 3 === 0 ? 32 : 24,
                  backgroundColor: '#000',
                  opacity: i % 4 === 0 ? 1 : 0.35,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </SlideOverDrawer>
  );
}

function LabelsDialog({
  brandDisplayName,
  shipment,
  onDownloadHtml,
  onClose,
}: {
  brandDisplayName: string;
  shipment: LogisticsRowItem;
  onDownloadHtml: (filename: string, html: string) => void;
  onClose: () => void;
}) {
  const printableRef = useRef<HTMLDivElement | null>(null);
  return (
    <SlideOverDrawer
      open
      onClose={onClose}
      title="Shipping labels"
      subtitle="Manual label template until carrier credential is active."
      testId="logistics-labels-dialog"
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-md border border-hairline bg-surface-raised text-[12px] font-medium text-secondary"
          >
            Close
          </button>
          <button
            type="button"
            data-testid="logistics-labels-download"
            onClick={() =>
              downloadRenderedArtefact(
                onDownloadHtml,
                printableRef.current,
                `shipping-label-${shipment.poNumber || shipment.reference}.html`,
                'Shipping label'
              )
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-hairline-strong bg-surface-raised text-[12px] font-medium text-ink-900 hover:bg-surface"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            Download
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[var(--mr-accent)] text-on-dark text-[12px] font-medium hover:bg-[var(--mr-accent-600)]"
          >
            <Printer className="w-3.5 h-3.5" aria-hidden="true" />
            Print labels
          </button>
        </div>
      }
    >
      <div
        ref={printableRef}
        className="rounded-md bg-surface border border-hairline p-6 font-mono text-ink-950"
      >
        <div className="mb-4 border-b-2 border-hairline-strong pb-3 text-center">
          <div className="text-[16px] font-bold uppercase">Shipping Label</div>
          <div className="text-[12px] text-faint">{brandDisplayName}</div>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[12px]">
          <dt className="font-bold">Brand:</dt>
          <dd>{shipment.customer || shipment.brandId || '—'}</dd>
          <dt className="font-bold">PO Number:</dt>
          <dd>{shipment.poNumber || '—'}</dd>
          <dt className="font-bold">Destination FC:</dt>
          <dd>{shipment.destination}</dd>
          <dt className="font-bold">Carton Number:</dt>
          <dd>_ / _</dd>
          <dt className="font-bold">Reference:</dt>
          <dd>{shipment.reference}</dd>
        </dl>
      </div>
    </SlideOverDrawer>
  );
}

function TrackingDialog({
  shipment,
  productsSlot,
  onClose,
}: {
  shipment: LogisticsRowItem;
  productsSlot?: ReactNode;
  onClose: () => void;
}) {
  const currentIdx = MILESTONES.findIndex((m) => m.status === shipment.status);
  const pastCutoff = currentIdx >= 0;
  const status = shipmentStatusPresentation(shipment.status);

  return (
    <SlideOverDrawer
      open
      onClose={onClose}
      title={`Tracking — ${shipment.reference}`}
      subtitle={`${shipment.origin} → ${shipment.destination} · ${carrierLabel(shipment.carrier)}`}
      testId="logistics-tracking-dialog"
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-ink-950 text-on-dark text-[12px] font-medium hover:bg-ink-800"
          >
            Close
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2 border border-hairline rounded-md px-3 py-2 bg-surface">
          <InlineStatus
            label={status.label}
            tone={mapTone(status.tone)}
            dataStatus={status.dataStatus}
          />
          <span className="text-[12px] text-ink-600">
            Stage: {STAGE_LABELS[shipment.stage as keyof typeof STAGE_LABELS] ?? shipment.stage}
          </span>
          <span className="text-[12px] text-faint">· Ship date {shipment.date}</span>
        </div>

        <ol className="space-y-1">
          {MILESTONES.map((m, i) => {
            const isCompleted = pastCutoff && i <= currentIdx;
            const isCurrent = i === currentIdx;
            const Icon = m.icon;
            return (
              <li key={m.status} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full border ${
                      isCompleted
                        ? 'bg-state-success/10 text-state-success border-state-success/20'
                        : isCurrent
                          ? 'bg-state-warning/10 text-state-warning border-state-warning/20'
                          : 'bg-surface text-quiet border-hairline'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </span>
                  {i < MILESTONES.length - 1 && (
                    <span
                      className={`h-6 w-px ${isCompleted ? 'bg-state-success' : 'bg-tint-strong'}`}
                    />
                  )}
                </div>
                <div className="flex-1 pb-3">
                  <div className="flex items-center gap-2 text-[14px]">
                    <span
                      className={
                        isCompleted
                          ? 'font-medium text-state-success'
                          : isCurrent
                            ? 'font-semibold text-state-warning'
                            : 'text-faint'
                      }
                    >
                      {m.label}
                    </span>
                    <span className="text-[11px] font-mono text-faint">
                      {isCurrent ? 'CURRENT' : isCompleted ? 'DONE' : ''}
                    </span>
                  </div>
                  {isCurrent && (
                    <div className="text-[12px] text-ink-600 mt-0.5">
                      {carrierLabel(shipment.carrier).toUpperCase()} — last update: {shipment.date}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {productsSlot && (
          <div className="border-t border-hairline pt-4 space-y-2">
            <h3 className="text-[14px] font-semibold text-ink-950">Products in this shipment</h3>
            {productsSlot}
          </div>
        )}
      </div>
    </SlideOverDrawer>
  );
}
