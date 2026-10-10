/**
 * §LOGISTICS HUB — BRAND INBOUND SHIPMENTS / FREIGHT WORKSPACE.
 *
 * PRESERVED (unchanged functional system):
 *   - tenant-scoped shipment feed (`useShipmentsAll` + session tenant filter)
 *   - the carrier/cargo split the brand books against
 *   - Waybill, Labels and Track artefacts + the tracking milestone timeline
 *   - the products-in-shipment listing joined from PO line items
 *
 * REPLACED (presentation):
 *   - the old page was a pale card grid (hardcoded light-mode zinc classes on a
 *     dark shell) with three carrier tabs, a non-functional "New Booking" form
 *     whose inputs were never wired to anything, and a flat shipment list.
 *   - it is now an OPERATIONS WORKSPACE built on the canonical workspace
 *     primitives, centred on a real interactive operational MAP whose geometry
 *     comes from `src/lib/logistics/operationsMap.ts`.
 *
 * TRUTH RULES ENFORCED HERE
 *   - Every leg carries a LIVE VERIFIED / SIMULATED / AMBIENT label derived from
 *     the authoritative provider modes (`isProviderSimulationSafe`). Unknown
 *     providers are never presented as simulation (§Integration modes).
 *   - Freight Collect legs are labelled CHANNEL-ARRANGED: Mercenta is never shown
 *     as choosing the channel's carrier.
 *   - The old non-functional booking form was REMOVED, not restyled: real booking
 *     happens through the canonical ASN flow on Purchase Orders. Shipping a form
 *     that looks like it books freight but does nothing would be a placeholder.
 *   - The retired mandatory linear logistics chain is NOT reintroduced; stages
 *     come from the canonical status → stage map.
 */
import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { Badge, Button, Input, LoadingState, StatusBadge } from '@/components/ui';
import { cn } from '@/utils/cn';
import { useApp } from '@/context/GlobalStateContext';
import { useBrands, useCanonicalStoreVersion, usePurchaseOrders, useShipmentsAll } from '@/data/queries';
import { useIntegrations } from '@/integrations/IntegrationsContext';
import { BRAND_NAME } from '@/config/brand';
import {
  MAP_TRUTH_NOTICE,
  OPERATIONAL_TRUTH,
  OPERATIONAL_TRUTH_ORDER,
  freightSemantics,
} from '@/config/logisticsGeo';
import { buildOperationalMap } from '@/lib/logistics/operationsMap';
import { currentQueryParam } from '@/lib/runtime/productRoutes';
import { etaPresentation, isEtaAtRisk } from '@/lib/logistics/shipmentEta';
import { appointmentPresentation } from '@/lib/shipping/deliveryAppointment';
import { buildDeliveryPerformance, performanceLabel } from '@/lib/logistics/deliveryPerformance';
import {
  deriveCarrierEligibility,
  isCarrierOperational,
  providerModeFor,
  type CarrierEligibility,
} from '@/lib/shipping/carrierEligibility';
import { LogisticsMapCanvas } from '@/components/shared/logistics/LogisticsMapCanvas';
import { ProductThumb } from '@/components/shared/ProductThumb';
import { LogisticsHero } from '@/components/shared/logistics/LogisticsHero';
/**
 * §P6 — "Documents for this PO": the document pack surface. It renders the pack
 * built by its ONE owner (`src/lib/documents/poDocumentPack.ts`) and opens the
 * EXISTING waybill / label dialogues for the two artefacts they already render.
 */
import { PoDocumentPackPanel } from '@/components/shared/logistics/PoDocumentPackPanel';
/**
 * §P1-fix (owner decision D3 = print AND download) — the ONE browser file-export
 * helper the platform already exposes. The carrier-label and waybill dialogues use
 * it to download their OWN rendered artefact, so the brand can DOWNLOAD a DHL /
 * Palletline label as well as print it.
 */
import { downloadHtml } from '@/lib/founder/documentExport';
/**
 * §P10 (programme §4 P10) — the Hub's completion surfaces, each backed by its ONE owner:
 * the download QUEUE (same rule as the badge), the CARRIER PROVIDER CONFIGURATION and the
 * CONSOLIDATION posture (programme decision 11).
 */
import { PoDocumentQueuePanel } from '@/components/shared/logistics/PoDocumentQueuePanel';
import { CarrierProviderConfigurationPanel } from '@/components/shared/logistics/CarrierProviderConfigurationPanel';
import { carrierProviderConfigurations } from '@/lib/shipping/providerConfiguration';
import { listChannelInstructions } from '@/lib/commerce/channelInstructions';
import {
  ContextPanel,
  RecordFieldList,
  SegmentedControl,
  WorkspaceFrame,
  WorkspaceGrid,
  WorkspaceHeader,
  WorkspaceSection,
  MetricBand,
  type MetricTileData,
} from '@/components/shared/workspace';
import { shipmentStatusPresentation } from '@/lib/statusPresentation';
import {
  STAGE_LABELS,
  STATUS_LABELS,
  type ChannelInstruction,
  type Shipment,
  type ShipmentStatus,
} from '@/types';
import {
  Plane,
  Ship,
  FileText,
  Printer,
  Package,
  MapPin,
  X,
  CheckCircle2,
  Clock,
  Truck,
  Search,
  Barcode,
  AlertTriangle,
  Info,
  Route,
  ArrowRight,
  Download,
} from 'lucide-react';

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
  /** §P5 — was 'Mercenta UK Hub'; the destination is the FC on the PO. */
  { status: 'destination_fc', label: 'Delivered to Destination FC', icon: MapPin },
  { status: 'live_amazon', label: 'Live on retail-channel', icon: Truck },
];

/** Brand-facing carrier labels. The lane rule decides which is applicable. */
const CARRIER_LABELS: Record<string, string> = {
  dhl: 'DHL Express',
  palletline: 'Palletline',
  /* §P9 (programme decision 1) — `fedex: 'FedEx'` and `bak: 'BAK Logistics'` are
     REMOVED: neither is a Mercenta account. An id with no label falls through to
     the raw value below rather than being presented as a carrier. */
  amazon_partner: 'Channel-arranged carrier',
};

function carrierLabel(carrier: string): string {
  return CARRIER_LABELS[carrier] ?? carrier;
}

/**
 * §Dialog chrome — one shape for every drawer on this surface.
 * The design system owns the frame; the print sheet inside stays white on
 * purpose, because a waybill/label is a printed artefact.
 */
function LogisticDialog({
  title,
  subtitle,
  onClose,
  children,
  width = 'max-w-lg',
  testId,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
  testId: string;
}) {
  /* Escape closes the dialog — the expected keyboard contract for a modal. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      data-testid={testId}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          'relative max-h-[92vh] w-full overflow-y-auto rounded-t-ds-lg border border-white/[0.08] bg-ink-850 shadow-ds-overlay sm:rounded-ds-lg',
          width
        )}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-white/[0.06] bg-ink-850/95 px-4 py-3 backdrop-blur">
          <div className="min-w-0">
            <h2 className="text-ds-title font-semibold text-white">{title}</h2>
            {subtitle && <p className="mt-0.5 text-ds-label text-zinc-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-ds-sm p-1.5 text-zinc-500 transition-ds duration-ds-fast hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

/* ── §P1-fix — download a dialogue's OWN rendered artefact ───────────────── */

/**
 * Download a rendered artefact's file (owner decision D3 = print AND download).
 * The node passed in IS the dialogue's own renderer — one renderer per artefact —
 * so its `innerHTML` becomes a self-contained HTML file and no second copy of the
 * label/waybill markup exists. The base stylesheet stands in for the app's utility
 * classes and the barcode bars carry their own inline sizes, so the file is faithful.
 */
function downloadRenderedArtefact(node: HTMLElement | null, filename: string, title: string): void {
  if (!node) return;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>
    body{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#000;padding:32px}
    dl{display:grid;grid-template-columns:auto 1fr;gap:8px 24px;margin:0}
    dt{color:#555}
  </style></head><body>${node.innerHTML}</body></html>`;
  downloadHtml(filename, html);
}

/* ── WAYBILL ──────────────────────────────────────────────────────────── */

function WaybillModal({ shipment, onClose }: { shipment: Shipment; onClose: () => void }) {
  const printableRef = useRef<HTMLDivElement | null>(null);
  return (
    <LogisticDialog
      title="Freight waybill"
      subtitle="Printable consignment document — generated from the canonical shipment record."
      onClose={onClose}
      testId="logistics-waybill-dialog"
    >
      <div ref={printableRef} className="rounded-ds-md bg-white p-5 text-black" id="printable-waybill">
        <div className="mb-4 flex items-center justify-between border-b-2 border-black pb-3">
          <div>
            <div className="text-base font-bold uppercase tracking-tight">{BRAND_NAME}</div>
            <div className="text-ds-label text-zinc-600">Freight Waybill</div>
          </div>
          <div className="text-right">
            <div className="text-ds-label text-zinc-600">Tracking no.</div>
            <div className="font-mono text-ds-body font-bold">{shipment.trackingNumber}</div>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-ds-label">
          <div>
            <dt className="text-zinc-500">Reference</dt>
            <dd className="font-semibold">{shipment.reference}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Date</dt>
            <dd className="font-semibold">{shipment.date}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Origin</dt>
            <dd className="font-semibold">{shipment.origin}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Destination</dt>
            <dd className="font-semibold">{shipment.destination}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Consignee</dt>
            <dd className="font-semibold">{shipment.customer}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Value</dt>
            <dd className="font-semibold">£{shipment.value.toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Volume</dt>
            <dd className="font-semibold">{shipment.cbm} CBM</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Carrier</dt>
            <dd className="font-semibold uppercase">{carrierLabel(shipment.carrier)}</dd>
          </div>
        </dl>

        <div className="mt-4 border-2 border-dashed border-zinc-300 p-4 text-center">
          <div className="mb-2 text-ds-label text-zinc-600">Barcode</div>
          <div className="font-mono text-xl tracking-widest">{shipment.trackingNumber}</div>
          <div className="mt-3 flex justify-center gap-0.5">
            {Array.from({ length: 40 }).map((_, i) => (
              /*
                §P1-fix — the bar sizes are INLINE, not utility classes, so the
                downloaded waybill file keeps its barcode (utilities are not carried
                into the standalone HTML).
              */
              <div
                key={i}
                style={{
                  width: 2,
                  height: (i + shipment.reference.length) % 3 === 0 ? 32 : 24,
                  backgroundColor: '#000',
                  opacity: i % 4 === 0 ? 1 : 0.3,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        {/* §P1-fix — DOWNLOAD beside Print (owner decision D3). */}
        <Button
          variant="secondary"
          data-testid="logistics-waybill-download"
          onClick={() =>
            downloadRenderedArtefact(
              printableRef.current,
              `waybill-${shipment.trackingNumber || shipment.reference}.html`,
              'Freight waybill'
            )
          }
        >
          <Download className="h-3.5 w-3.5" />
          Download
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="h-3.5 w-3.5" />
          Print
        </Button>
      </div>
    </LogisticDialog>
  );
}

/* ── CARRIER LABELS ───────────────────────────────────────────────────── */

function LabelsModal({
  shipment,
  onClose,
}: {
  // §7D — canonical Shipment plus the row-level identifiers the label needs
  // (brandId/poNumber live on the canonical demoShipment rows).
  shipment: Shipment & { brandId?: string; poNumber?: string };
  onClose: () => void;
}) {
  const printableRef = useRef<HTMLDivElement | null>(null);
  return (
    <LogisticDialog
      title="Shipping labels"
      subtitle="Carrier labels are generated through the carrier seam; until that account is live this manual template is the printable artefact."
      onClose={onClose}
      width="max-w-3xl"
      testId="logistics-labels-dialog"
    >
      <div ref={printableRef} className="rounded-ds-md bg-white p-6 font-mono text-black" id="printable-label">
        <div className="mb-4 border-b-2 border-black pb-3 text-center">
          <div className="text-ds-title font-bold uppercase">Shipping Label</div>
          <div className="text-ds-label text-zinc-600">{BRAND_NAME}</div>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-ds-label">
          <dt className="font-bold">Brand:</dt>
          <dd>{shipment.customer || shipment.brandId}</dd>
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
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        {/* §P1-fix — DOWNLOAD beside Print (owner decision D3: the brand may DOWNLOAD
            a DHL/Palletline carrier label as well as print it). */}
        <Button
          variant="secondary"
          data-testid="logistics-labels-download"
          onClick={() =>
            downloadRenderedArtefact(
              printableRef.current,
              `shipping-label-${shipment.poNumber || shipment.reference}.html`,
              'Shipping label'
            )
          }
        >
          <Download className="h-3 w-3" />
          Download
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="h-3 w-3" />
          Print labels
        </Button>
      </div>
    </LogisticDialog>
  );
}

/* ── TRACKING TIMELINE ────────────────────────────────────────────────── */

function MilestoneIcon({ status }: { status: ShipmentStatus }) {
  const m = MILESTONES.find((x) => x.status === status);
  const Icon = m?.icon ?? Clock;
  return <Icon className="h-4 w-4" />;
}

function ShipmentTrackingTimeline({
  shipment,
  products,
  poProducts,
  onClose,
}: {
  shipment: Shipment;
  products: {
    id: string;
    sku: string;
    barcode: string;
    name: string;
    image?: string;
    productImages?: { url: string }[];
  }[];
  poProducts: string[];
  onClose: () => void;
}) {
  const currentIdx = MILESTONES.findIndex((m) => m.status === shipment.status);
  const pastCutoff = currentIdx >= 0;
  const shipmentProducts = products.filter((p) => poProducts.includes(p.id));

  return (
    <LogisticDialog
      title={`Tracking — ${shipment.reference}`}
      subtitle={`${shipment.origin} → ${shipment.destination} · ${carrierLabel(shipment.carrier)}`}
      onClose={onClose}
      width="max-w-2xl"
      testId="logistics-tracking-dialog"
    >
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-ds-md border border-white/[0.06] bg-white/[0.02] px-3 py-2">
        <StatusBadge
          dataStatus={shipmentStatusPresentation(shipment.status).dataStatus}
          tone={shipmentStatusPresentation(shipment.status).tone}
        >
          {shipmentStatusPresentation(shipment.status).label}
        </StatusBadge>
        <span className="text-ds-micro text-zinc-500">
          Stage: {STAGE_LABELS[shipment.stage] ?? shipment.stage}
        </span>
        <span className="text-ds-micro text-zinc-600">· Ship date {shipment.date}</span>
      </div>

      <RecordFieldList
        className="mb-5"
        fields={[
          { label: 'Reference', value: shipment.reference },
          {
            label: 'Tracking no.',
            value: <span className="font-mono">{shipment.trackingNumber}</span>,
          },
          { label: 'Origin', value: shipment.origin },
          { label: 'Destination', value: shipment.destination },
          { label: 'Value', value: `£${shipment.value.toLocaleString()}` },
          { label: 'Volume', value: `${shipment.cbm} CBM` },
        ]}
      />

      <WorkspaceSection title="Carrier milestones">
        <ol>
          {MILESTONES.map((m, i) => {
            const isCompleted = pastCutoff && i <= currentIdx;
            const isCurrent = i === currentIdx;
            return (
              <li key={m.status} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-full ring-2',
                      isCompleted
                        ? 'bg-state-success/15 text-state-success ring-state-success/25'
                        : isCurrent
                          ? 'bg-state-warning/15 text-state-warning ring-state-warning/25'
                          : 'bg-white/[0.03] text-zinc-600 ring-white/[0.06]'
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <MilestoneIcon status={m.status} />
                    )}
                  </span>
                  {i < MILESTONES.length - 1 && (
                    <span
                      className={cn('h-7 w-0.5', isCompleted ? 'bg-state-success/50' : 'bg-white/[0.08]')}
                    />
                  )}
                </div>
                <div className="flex-1 pb-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        'text-ds-body font-medium',
                        isCompleted
                          ? 'text-state-success'
                          : isCurrent
                            ? 'text-state-warning'
                            : 'text-zinc-500'
                      )}
                    >
                      {m.label}
                    </span>
                    {isCurrent && (
                      <Badge className="border-white/[0.08] bg-state-warning/15 text-ds-micro text-state-warning">
                        CURRENT
                      </Badge>
                    )}
                    {isCompleted && !isCurrent && (
                      <Badge className="border-white/[0.08] bg-state-success/15 text-ds-micro text-state-success">
                        DONE
                      </Badge>
                    )}
                  </div>
                  {isCurrent && (
                    <p className="mt-1 text-ds-micro text-zinc-500">
                      {carrierLabel(shipment.carrier).toUpperCase()} — last update: {shipment.date}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </WorkspaceSection>

      {shipmentProducts.length > 0 && (
        <WorkspaceSection
          title={`Products in this shipment (${shipmentProducts.length})`}
          className="mt-4"
        >
          <ul className="space-y-2">
            {shipmentProducts.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-ds-md border border-white/[0.06] bg-white/[0.02] p-2"
              >
                <ProductThumb product={p} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-ds-body font-medium text-zinc-200">{p.name}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-3 text-ds-micro text-zinc-500">
                    <span>
                      SKU: <code className="rounded bg-white/[0.06] px-1 font-mono">{p.sku}</code>
                    </span>
                    <span>
                      EAN:{' '}
                      <code className="rounded bg-white/[0.06] px-1 font-mono">
                        {p.barcode || '—'}
                      </code>
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </WorkspaceSection>
      )}

      <div className="mt-5 flex justify-end border-t border-white/[0.06] pt-4">
        <Button onClick={onClose}>Close</Button>
      </div>
    </LogisticDialog>
  );
}

/* ── TRUTH LEGEND ─────────────────────────────────────────────────────── */

/**
 * The map's truth legend. It states the CLAIM each state makes, so a reader can
 * never mistake an ambient context arc for confirmed live tracking.
 */
function TruthLegend({ counts }: { counts: Record<string, number> }) {
  const swatch: Record<string, string> = {
    live_verified: 'bg-state-success',
    simulated: 'bg-state-info',
    ambient: 'bg-zinc-600',
  };
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5" data-testid="logistics-map-legend">
      {OPERATIONAL_TRUTH_ORDER.map((truth) => {
        const p = OPERATIONAL_TRUTH[truth];
        return (
          <li
            key={truth}
            className="flex items-center gap-1.5"
            data-testid={`logistics-legend-${truth}`}
            title={p.claim}
          >
            <span
              aria-hidden="true"
              className={cn('h-2 w-2 flex-shrink-0 rounded-full', swatch[truth])}
            />
            <span className="text-ds-micro font-medium uppercase tracking-[0.12em] text-zinc-400">
              {p.label}
            </span>
            <span className="font-mono text-ds-micro text-zinc-600">{counts[truth] ?? 0}</span>
          </li>
        );
      })}
    </ul>
  );
}

/* ── FREIGHT-TERM BADGE ───────────────────────────────────────────────── */

function FreightTermChip({ term }: { term: 'collect' | 'prepaid' | null }) {
  const semantics = freightSemantics(term);
  if (!semantics) {
    return (
      <span className="rounded-ds-sm border border-white/[0.08] px-1.5 py-px text-ds-micro text-zinc-500">
        Freight term not declared
      </span>
    );
  }
  return (
    <span
      className={cn(
        'rounded-ds-sm border px-1.5 py-px text-ds-micro font-medium',
        semantics.channelArranged
          ? 'border-palette-indigo/40 bg-palette-indigo/10 text-palette-indigo'
          : 'border-palette-orange/40 bg-palette-orange/10 text-palette-orange'
      )}
      data-testid={`freight-term-${semantics.term}`}
      title={semantics.label}
    >
      {semantics.term === 'collect' ? 'FREIGHT COLLECT — CHANNEL-ARRANGED' : 'FREIGHT PREPAID — MERCENTA-ARRANGED'}
    </span>
  );
}

/* ── MAIN WORKSPACE ───────────────────────────────────────────────────── */

export function LogisticsHub() {
  const { session, products } = useApp();
  const shipmentsQuery = useShipmentsAll();
  const posQuery = usePurchaseOrders();
  /**
   * §Wave 3 Part 5 — THE ONE LOADING FLAG for the logistics picture. While a
   * query resolves its `.data` is undefined, so the consignment list is [] and
   * this surface used to state "No consignment matches the current filters."
   * BOTH in the list and as the map's overlay — a false claim about the
   * operator's shipments (measured in a real browser with a slow data source;
   * the message was painted during load and gone once the data arrived).
   */
  const logisticsPending = shipmentsQuery.isPending || posQuery.isPending;
  const { modes, integrations } = useIntegrations();

  const [query, setQuery] = useState('');
  const [truthFilter, setTruthFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [laneFilter, setLaneFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [waybillShipment, setWaybillShipment] = useState<string | null>(null);
  const [trackingShipment, setTrackingShipment] = useState<string | null>(null);
  const [labelsShipment, setLabelsShipment] = useState<string | null>(null);
  /** §WAVE 3 — which derived-insight drill-down is open (metric tiles open these). */
  const [insight, setInsight] = useState<'performance' | 'eta' | null>(null);
  /**
   * §P6 — the canonical instruction store's change signal, plus the brand names
   * the document pack prints. Mercenta's outcome (the ASN it filed, the routing
   * request, the channel's routing instructions) lands on the instruction record,
   * so the pack must re-read it the moment it changes — no reload.
   */
  const canonicalVersion = useCanonicalStoreVersion();
  void canonicalVersion; // §P6 — canonical change signal → re-read Mercenta's outcome
  const brandsQuery = useBrands();

  /**
   * The instruction Mercenta actioned for a PO. The ACKNOWLEDGEMENT is the PO's
   * primary decision record (the same rule `BrandPurchaseOrders` uses), so the
   * pack reads the ASN Mercenta actually filed rather than guessing one.
   */
  const instructionForPo = (poId: string): ChannelInstruction | undefined => {
    const list = listChannelInstructions().filter((i) => i.purchaseOrderId === poId);
    return list.find((i) => i.type === 'po_acknowledgement') ?? list[0];
  };



  /**
   * §Tenant isolation — a brand session only ever reads its OWN purchase orders.
   * The freight term lives on the PO, never on the shipment, so this join is
   * what lets the hub state Collect vs Prepaid truthfully.
   */
  const scopedPos = useMemo(
    () =>
      (posQuery.data?.data ?? []).filter(
        (po) => session?.tier !== 'brand' || po.brandId === session?.tenantId
      ),
    [posQuery.data, session?.tier, session?.tenantId]
  );
  const poByNumber = useMemo(() => {
    const map = new Map<string, (typeof scopedPos)[number]>();
    for (const po of scopedPos) map.set(po.poNumber, po);
    return map;
  }, [scopedPos]);

  /**
   * §7D — live shipment feed (single source of truth: demoShipments via
   * useShipmentsAll) so shipments created in-session (auto-created drafts,
   * filed ASNs) appear immediately. Tenant-scoped for brand sessions — a brand
   * only ever sees its OWN shipments. Rows are normalised to the canonical
   * Shipment shape so every dialog receives a well-formed shipment.
   *
   * §Logistics-map — the real stage is derived from the canonical status → stage
   * map (previously every row defaulted to 'factory_intake', which is why the
   * old progress display was meaningless).
   */
  const liveShipments = useMemo(
    () =>
      ((shipmentsQuery.data?.data ?? []) as unknown as Shipment[])
        .filter(
          (s) =>
            session?.tier !== 'brand' ||
            (s as unknown as { brandId?: string }).brandId === session?.tenantId
        )
        .map((s) => {
          const raw = s as unknown as {
            brandId?: string;
            poNumber?: string;
            delayed?: boolean;
            exception?: boolean;
            waybill?: string;
            title?: string;
            /** §WAVE 3 — the canonical ETA projection from the data layer. */
            eta?: import('@/types').ShipmentEta | null;
            /** §BATCH 2i (`AV-045`) — the canonical appointment projection from the data layer. */
            appointment?: import('@/types').DeliveryAppointment | null;
          };
          const po = raw.poNumber ? poByNumber.get(raw.poNumber) : undefined;
          return {
            id: s.id,
            reference: s.reference,
            title: s.title || raw.title || s.reference,
            poNumber: raw.poNumber ?? '',
            brandId: raw.brandId ?? '',
            customer: (s as unknown as { customer?: string }).customer ?? '',
            value: s.value,
            status: s.status,
            carrier: s.carrier,
            stage: s.stage,
            cbm: (s as unknown as { cbm?: number }).cbm ?? Math.max(6, Math.round(s.value / 9000)),
            origin: s.origin,
            destination: s.destination,
            date: (s as unknown as { date?: string }).date ?? '',
            trackingNumber: (s as unknown as { trackingNumber?: string }).trackingNumber ?? '',
            delayed: Boolean(raw.delayed),
            exception: Boolean(raw.exception),
            waybill: raw.waybill ?? null,
            freightTerm: po?.freightTerm ?? null,
            simulated: po?.simulated,
            /** §WAVE 3 — the canonical ETA projection attached by the data layer. */
            eta: raw.eta ?? undefined,
            /** §BATCH 2i (`AV-045`) — the canonical appointment projection attached by the data layer. */
            appointment: raw.appointment ?? undefined,
          };
        }),
    [shipmentsQuery.data, session?.tier, session?.tenantId, poByNumber]
  );

  /**
   * §Dashboard-cleanup P0 — PO-scoped deep link.
   *
   * The accepted-PO action ("Open shipping documents") arrives here as
   * `/brand/logistics?po=PO-9002`. The Hub selects that consignment as soon as its
   * rows are available, so the operator lands on the PO's route, freight
   * responsibility and document actions instead of an unselected list. Applied
   * ONCE per PO value; it never overrides a selection the operator makes after.
   */
  const deepLinkPo = useMemo(() => currentQueryParam('po'), []);
  const appliedDeepLink = useRef<string | null>(null);
  useEffect(() => {
    if (!deepLinkPo || appliedDeepLink.current === deepLinkPo) return;
    const match = liveShipments.find((s) => (s as unknown as { poNumber?: string }).poNumber === deepLinkPo);
    if (!match) return;
    appliedDeepLink.current = deepLinkPo;
    setSelectedId(match.id);
  }, [deepLinkPo, liveShipments]);

  const model = useMemo(
    () => buildOperationalMap(liveShipments.map((s) => ({ ...s, providerModes: modes }))),
    [liveShipments, modes]
  );

  /**
   * §WAVE 3 — DELIVERY PERFORMANCE.
   *
   * A deterministic projection over the SAME tenant-scoped canonical legs the map
   * plots. It introduces no analytics subsystem and no history: every figure is
   * counted from the consignment records that actually exist here, provider-
   * verified deliveries are counted separately from simulated ones, and a rate
   * with no sample is reported as "No sample yet" rather than as a fabricated
   * percentage.
   */
  const performance = useMemo(
    () =>
      buildDeliveryPerformance(
        model.legs.map((leg) => ({
          status: leg.status,
          stage: leg.stage,
          truth: leg.truth,
          delayed: leg.delayed,
          exception: leg.exception,
        }))
      ),
    [model.legs]
  );

  /** §WAVE 3 — ETA coverage across the consignments in scope. */
  const etaCoverage = useMemo(() => {
    let dated = 0;
    let simulated = 0;
    let delivered = 0;
    let unavailable = 0;
    for (const shipment of liveShipments) {
      const eta = shipment.eta;
      if (!eta) {
        unavailable += 1;
        continue;
      }
      if (eta.basis === 'delivered') delivered += 1;
      else if (eta.basis === 'unavailable') unavailable += 1;
      else {
        dated += 1;
        if (eta.simulated) simulated += 1;
      }
    }
    return { dated, simulated, delivered, unavailable, total: liveShipments.length };
  }, [liveShipments]);

  /**
   * §WAVE 3 — CARRIER ELIGIBILITY for the consignment in scope.
   *
   * Derived from the freight term, the lane, the declared lane capability of each
   * Mercenta account and the AUTHORITATIVE provider state — never from a
   * hardcoded "DHL for international, Palletline for UK". A provider that is not
   * positively operational is refused, with its actual state named.
   */
  const eligibility: CarrierEligibility = useMemo(() => {
    /**
     * The consignment the panel describes: the selected one, else the first leg in
     * scope. The lane inputs come from that consignment's OWN resolved context
     * (its declared origin and freight term) — never from the tenant id, which is
     * not a nation.
     */
    const leg = model.legs.find((l) => l.id === selectedId) ?? model.legs[0];
    return deriveCarrierEligibility({
      brandNation: null,
      originCountry: leg?.origin.raw ?? null,
      destinationCountry: leg?.destination.raw ?? null,
      freightTerm: leg?.freightTerm ?? undefined,
      providerModes: modes,
    });
  }, [model.legs, selectedId, modes]);

  const visibleIds = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const ids = new Set<string>();
    for (const leg of model.legs) {
      if (truthFilter !== 'all' && leg.truth !== truthFilter) continue;
      if (statusFilter !== 'all' && leg.status !== statusFilter) continue;
      if (laneFilter === 'international' && leg.origin.place?.kind !== 'brand_facility') continue;
      if (laneFilter === 'uk' && leg.origin.place?.kind !== 'uk_gateway') continue;
      if (laneFilter === 'exceptions' && !(leg.exception || leg.delayed)) continue;
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
        if (!haystack.includes(needle)) continue;
      }
      ids.add(leg.id);
    }
    return ids;
  }, [model.legs, query, truthFilter, statusFilter, laneFilter]);

  const visibleLegs = useMemo(
    () => model.legs.filter((leg) => visibleIds.has(leg.id)),
    [model.legs, visibleIds]
  );

  /**
   * §WAVE 3 — the Hero's brand lanes come from the SAME canonical legs the
   * operational map plots, so the cinematic view and the operational view can
   * never disagree about a consignment, its route or its truth state. Legs the
   * user has filtered out are NOT dropped from the hero: the hero is a fixed
   * network view, and the operational filters belong to the operational
   * surfaces below it.
   */
  const heroLegs = useMemo(
    () =>
      model.legs.map((leg) => ({
        id: leg.id,
        reference: leg.reference,
        title: leg.title,
        origin: leg.origin.place,
        destination: leg.destination.place,
        truth: leg.truth,
        exception: leg.exception || leg.delayed,
      })),
    [model.legs]
  );
  const visibleTruthCounts = useMemo(() => {
    const out: Record<string, number> = { live_verified: 0, simulated: 0, ambient: 0 };
    for (const leg of visibleLegs) out[leg.truth] += 1;
    return out;
  }, [visibleLegs]);

  const selected = model.legs.find((l) => l.id === selectedId) ?? null;

  /**
   * §P10 — THE CARRIER PROVIDER CONFIGURATION (matrix `D10-10`).
   *
   * Derived by its ONE owner from the canonical shipping config + the AUTHORITATIVE
   * provider modes + the non-secret connection state. The Hub re-derives no mode, no
   * lane and no account label — and it never sees Mercenta's cost base.
   */
  const providerConfigurations = useMemo(
    () => carrierProviderConfigurations({ modes, connections: integrations }),
    [modes, integrations]
  );

  /**
   * §P6 — the purchase order behind the selected consignment, and the shipment
   * row the carrier artefacts read from.
   *
   * A consignment is created FROM a purchase order (`shipment-${po.id}`), and the
   * PO carries the destination the documents must name (P5). When no PO is in the
   * tenant's scope, no pack applies — the surface says so rather than rendering a
   * pack with an invented destination. The carrier reference comes from the same
   * tenant-scoped row the map plotted, never from a second lookup.
   */
  const selectedPo = useMemo(
    () => (selected?.poNumber ? poByNumber.get(selected.poNumber) ?? null : null),
    [selected?.poNumber, poByNumber]
  );
  const selectedRow = useMemo(
    () => (selected ? liveShipments.find((s) => s.id === selected.id) ?? null : null),
    [selected, liveShipments]
  );

  const statusOptions = useMemo(
    () => [
      { id: 'all', label: 'All statuses', count: model.legs.length },
      ...[...new Set(model.legs.map((l) => l.status))].map((s) => ({
        id: s,
        label: STATUS_LABELS[s as ShipmentStatus] ?? s,
        count: model.legs.filter((l) => l.status === s).length,
      })),
    ],
    [model.legs]
  );

  const kpiItems: MetricTileData[] = [
    {
      id: 'consignments',
      label: 'Consignments in scope',
      value: String(model.legs.length),
      context: `${model.mapped.length} plotted · ${model.schematic.length} schematic`,
      domain: 'logistics',
    },
    {
      id: 'moving',
      label: 'In transit',
      value: String(
        model.legs.filter(
          (l) => l.status === 'sea_transit' || l.status === 'air_transit' || l.status === 'bak_depot'
        ).length
      ),
      context: 'Sea, air and depot movement',
      domain: 'logistics',
    },
    {
      id: 'exceptions',
      label: 'Exceptions / delayed',
      value: String(model.exceptionCount),
      context: model.exceptionCount > 0 ? 'Needs operational attention' : 'No exception flags',
      tone: model.exceptionCount > 0 ? 'warning' : 'success',
      statusText: model.exceptionCount > 0 ? 'attention' : 'clear',
    },
    {
      id: 'simulated',
      label: 'Simulated legs',
      value: String(model.truthCounts.simulated),
      context: 'Carrier provider positively simulates — zero network calls',
      tone: 'info',
      statusText: 'simulation',
    },
    {
      id: 'live',
      label: 'Live verified',
      value: String(model.truthCounts.live_verified),
      context:
        model.truthCounts.live_verified === 0
          ? 'No live carrier credentials held — nothing is claimed live'
          : 'Provider live and provider reference present',
      tone: model.truthCounts.live_verified === 0 ? 'neutral' : 'success',
      statusText: model.truthCounts.live_verified === 0 ? 'not verified' : 'verified',
    },
    {
      id: 'ambient',
      label: 'Ambient / contextual',
      value: String(model.truthCounts.ambient),
      context: 'No positive provider resolution — context only',
      tone: 'neutral',
      statusText: 'context',
    },
    {
      id: 'delivery-performance',
      label: 'On-time delivery',
      value: performanceLabel(performance.onTimeRate),
      context:
        performance.delivered === 0
          ? 'No delivered consignment yet — no rate is claimed'
          : `${performance.onTime}/${performance.delivered} delivered without a recorded delay`,
      tone: performance.onTimeRate === null ? 'neutral' : performance.onTimeRate >= 0.9 ? 'success' : 'warning',
      statusText: performance.onTimeRate === null ? 'no sample' : 'derived',
      domain: 'logistics',
      testId: 'kpi-delivery-performance',
      valueTestId: 'kpi-delivery-performance-value',
      onOpen: () => setInsight('performance'),
    },
    {
      id: 'eta-coverage',
      label: 'ETA coverage',
      value: `${etaCoverage.dated}/${etaCoverage.total}`,
      context:
        etaCoverage.total === 0
          ? 'No consignments in scope'
          : `${etaCoverage.simulated} simulated · ${etaCoverage.delivered} delivered · ${etaCoverage.unavailable} unavailable`,
      tone: etaCoverage.unavailable > 0 ? 'warning' : 'neutral',
      statusText: etaCoverage.simulated > 0 ? 'simulated' : 'derived',
      domain: 'logistics',
      testId: 'kpi-eta-coverage',
      valueTestId: 'kpi-eta-coverage-value',
      onOpen: () => setInsight('eta'),
    },
  ];

  const shipmentById = (id: string) => liveShipments.find((s) => s.id === id)!;

  /**
   * §WAVE 3 — the canonical ETA of the SELECTED consignment (null when it has
   * none). Read from the same tenant-scoped rows the map plots, so the inspector
   * can never describe a consignment it was not given.
   */
  const selectedEta = useMemo(
    () => liveShipments.find((s) => s.id === selectedId)?.eta ?? null,
    [liveShipments, selectedId]
  );

  /**
   * §BATCH 2i (`AV-045`) — the SELECTED consignment's delivery appointment, and
   * its presentation in the owner's own words. Derived from the same
   * tenant-scoped rows the map plots, so the inspector can never describe an
   * appointment the operator was not given.
   */
  const selectedAppointment = useMemo(
    () => liveShipments.find((s) => s.id === selectedId)?.appointment ?? null,
    [liveShipments, selectedId]
  );
  const selectedAppointmentView = useMemo(
    () => (selectedAppointment ? appointmentPresentation(selectedAppointment) : null),
    [selectedAppointment]
  );

  return (
    <WorkspaceFrame>
      <WorkspaceHeader
        eyebrow="Brand portal · Logistics"
        title="Logistics Hub"
        description="Every consignment Mercenta moves on your behalf, plotted on the operational map. Selecting a consignment exposes its route, its carrier position and who actually arranges carriage."
        entity={
          <>
            <span className="text-ds-micro font-semibold uppercase tracking-[0.14em] text-zinc-500">
              {session?.tier === 'brand' ? 'Tenant' : 'Environment'}
            </span>
            <span className="text-ds-label text-zinc-200">
              {session?.tenantId ?? 'Mercenta operations'}
            </span>
          </>
        }
        status={
          <StatusBadge
            tone={model.truthCounts.live_verified > 0 ? 'success' : 'info'}
            dataStatus={model.truthCounts.live_verified > 0 ? 'live' : 'simulation'}
          >
            {model.truthCounts.live_verified > 0 ? 'Live carrier verified' : 'Simulated carrier legs'}
          </StatusBadge>
        }
        meta={
          <>
            <span className="text-ds-micro text-zinc-500" data-testid="logistics-scope-count">
              {model.legs.length} consignments in scope
            </span>
            <span className="text-ds-micro text-zinc-600">{MAP_TRUTH_NOTICE}</span>
          </>
        }
        actions={
          <Button variant="secondary" onClick={() => shipmentsQuery.refetch()}>
            <Route className="h-3.5 w-3.5" />
            Refresh feed
          </Button>
        }
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1 [&>input]:pl-8">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600"
                aria-hidden="true"
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search reference, PO, origin, destination…"
                ariaLabel="Search consignments"
                dataTestid="logistics-search"
              />
            </div>
            <SegmentedControl
              ariaLabel="Travel evidence"
              active={truthFilter}
              onSelect={setTruthFilter}
              items={[
                { id: 'all', label: 'All', count: visibleLegs.length },
                {
                  id: 'live_verified',
                  label: OPERATIONAL_TRUTH.live_verified.label,
                  count: model.truthCounts.live_verified,
                },
                {
                  id: 'simulated',
                  label: OPERATIONAL_TRUTH.simulated.label,
                  count: model.truthCounts.simulated,
                },
                {
                  id: 'ambient',
                  label: OPERATIONAL_TRUTH.ambient.label,
                  count: model.truthCounts.ambient,
                },
              ]}
            />
            <SegmentedControl
              ariaLabel="Lane filter"
              active={laneFilter}
              onSelect={setLaneFilter}
              items={[
                { id: 'all', label: 'All lanes' },
                { id: 'international', label: 'International origin' },
                { id: 'uk', label: 'UK gateway origin' },
                { id: 'exceptions', label: 'Exceptions' },
              ]}
            />
          </div>
        }
      />

      <MetricBand items={kpiItems} loading={shipmentsQuery.isLoading} />

      {/*
        §WAVE 3 — DERIVED-INSIGHT DRILL-DOWNS.
        The delivery-performance and ETA tiles open the detail BEHIND the number
        (never a static figure with no drill-down), and both state their basis
        plainly: a rate with no delivered sample says so, and every ETA is
        labelled derived/simulated rather than presented as carrier data.
      */}
      {insight && (
        <div className="mt-3" data-testid={`logistics-insight-${insight}`}>
          <ContextPanel
            title={insight === 'performance' ? 'Delivery performance' : 'ETA basis'}
            action={
              <button
                type="button"
                onClick={() => setInsight(null)}
                aria-label="Close insight detail"
                className="rounded-ds-sm p-1 text-zinc-500 transition-ds duration-ds-fast hover:bg-white/[0.06] hover:text-white"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            }
          >
            {insight === 'performance' ? (
              <div className="space-y-3 p-3" data-testid="delivery-performance-detail">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
                    <div key={item.label} className="rounded-ds-sm border border-white/[0.06] bg-ink-900 px-2.5 py-2">
                      <p className="text-ds-micro uppercase tracking-[0.12em] text-zinc-500">{item.label}</p>
                      <p className="mt-0.5 font-mono text-ds-label text-white">{item.value}</p>
                    </div>
                  ))}
                </div>
                <ul className="space-y-1">
                  {performance.sources.map((source) => (
                    <li key={source} className="text-ds-micro leading-relaxed text-zinc-500">
                      {source}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="space-y-3 p-3" data-testid="eta-basis-detail">
                <ul className="space-y-1.5">
                  {liveShipments.map((shipment) => {
                    const eta = shipment.eta;
                    const presentation = eta
                      ? etaPresentation(eta)
                      : { label: 'ETA unavailable', detail: 'No ETA projection is attached to this consignment.', tone: 'unavailable' as const };
                    /** §BATCH 2i (`AV-045`) — the appointment, in the owner's own words. */
                    const appointmentView = shipment.appointment
                      ? appointmentPresentation(shipment.appointment)
                      : null;
                    return (
                      <li
                        key={shipment.id}
                        className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-white/[0.04] pb-1.5 last:border-0"
                        data-testid={`eta-basis-${shipment.reference}`}
                      >
                        <span className="font-mono text-ds-micro text-zinc-300">{shipment.reference}</span>
                        <span className="text-ds-label text-white">{presentation.label}</span>
                        <span className="text-ds-micro text-zinc-500">{presentation.detail}</span>
                        {isEtaAtRisk(eta ?? { date: null, basis: 'unavailable', simulated: false, source: '' }, shipment.delayed, shipment.exception) && (
                          <span className="text-ds-micro text-state-warning">At risk against its declared window</span>
                        )}
                        {appointmentView && (
                          <span
                            data-testid={`appointment-${shipment.reference}`}
                            data-appointment-state={shipment.appointment?.state ?? 'unknown'}
                            data-appointment-window={shipment.appointment?.window.code ?? 'unknown'}
                            className="basis-full text-ds-micro leading-relaxed text-zinc-400"
                          >
                            <span className="text-zinc-300">Delivery appointment: {appointmentView.label}.</span>{' '}
                            {appointmentView.windowDetail}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {liveShipments.length === 0 && (
                  <p className="text-ds-body text-zinc-500">No consignments in scope for this tenant.</p>
                )}
              </div>
            )}
          </ContextPanel>
        </div>
      )}

      {/* ── §P10 — THE DOWNLOAD QUEUE: the destination the nav badge counts ──
          Decision 6 makes the document pack the Hub's core deliverable, and the brand's
          remaining job is to download & print it before dispatch. The badge and the
          notification already counted this queue; this is the surface that renders it,
          from the SAME ONE rule, so the count always has a reachable set of rows. */}
      <WorkspaceSection
        title="Shipping documents"
        description="Every accepted purchase order whose document pack is ready to download and print, until its consignment is dispatched."
        domain="logistics"
        className="mt-4"
      >
        <PoDocumentQueuePanel
          pos={scopedPos}
          brandNameFor={(brandId) =>
            brandsQuery.data?.data.find((b) => b.id === brandId)?.profile.businessName ?? brandId
          }
          brandNationFor={(brandId) =>
            brandsQuery.data?.data.find((b) => b.id === brandId)?.nation ?? null
          }
          products={products}
          instructionForPo={instructionForPo}
          shipmentForPo={(poNumber) => {
            const row = liveShipments.find((s) => s.poNumber === poNumber);
            return row
              ? {
                  id: row.id,
                  status: row.status,
                  carrier: row.carrier ?? '',
                  trackingNumber: row.trackingNumber ?? null,
                  waybill: row.waybill ?? null,
                }
              : null;
          }}
          onOpenCarrierArtefact={(kind, shipmentId) => {
            if (!shipmentId) return;
            if (kind === 'carrier_label') setLabelsShipment(shipmentId);
            else setWaybillShipment(shipmentId);
          }}
          scope="brand"
        />
      </WorkspaceSection>

      {/*
        §WAVE 3 — THE CINEMATIC LOGISTICS HERO.
        It is the HERO SECTION of this same page, not a second page: a fixed
        camera, non-interactive global inbound network view built from authentic
        geography, carrying the same LIVE VERIFIED / SIMULATED / AMBIENT truth
        states as the operational surfaces below it. The operational controls
        (search, evidence filters, consignment list, inspector, artefacts) stay
        fully interactive underneath — exactly as required.
      */}
      <div className="mt-4">
        <LogisticsHero legs={heroLegs} />
      </div>

      <WorkspaceGrid
        className="mt-4"
        rail={
          <>
            {selected ? (
              <ContextPanel
                title="Consignment inspector"
                action={
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    aria-label="Clear selection"
                    className="rounded-ds-sm p-1 text-zinc-500 transition-ds duration-ds-fast hover:bg-white/[0.06] hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                }
              >
                <div className="space-y-3 p-3" data-testid="logistics-inspector">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge
                      dataStatus={shipmentStatusPresentation(selected.status).dataStatus}
                      tone={shipmentStatusPresentation(selected.status).tone}
                    >
                      {shipmentStatusPresentation(selected.status).label}
                    </StatusBadge>
                    <StatusBadge
                      tone={OPERATIONAL_TRUTH[selected.truth].tone}
                      dataStatus={selected.truth}
                    >
                      {OPERATIONAL_TRUTH[selected.truth].label}
                    </StatusBadge>
                    {(selected.exception || selected.delayed) && (
                      <StatusBadge tone="warning" dataStatus="exception">
                        <AlertTriangle className="mr-1 inline h-3 w-3" aria-hidden="true" />
                        Exception
                      </StatusBadge>
                    )}
                  </div>

                  <div>
                    <p className="text-ds-title font-semibold text-white">{selected.reference}</p>
                    <p className="mt-0.5 text-ds-label text-zinc-500">{selected.title}</p>
                  </div>

                  <RecordFieldList
                    fields={[
                      { label: 'Stage', value: STAGE_LABELS[selected.stage] ?? selected.stage },
                      { label: 'PO', value: selected.poNumber || '—' },
                      { label: 'Carrier', value: carrierLabel(selected.carrier) },
                      { label: 'Value', value: `£${selected.value.toLocaleString()}` },
                      { label: 'Volume', value: `${selected.cbm} CBM` },
                      {
                        label: 'Declared origin',
                        value: (
                          <span className="font-mono text-ds-micro">{selected.origin.raw || '—'}</span>
                        ),
                      },
                      {
                        label: 'Declared destination',
                        value: (
                          <span className="font-mono text-ds-micro">
                            {selected.destination.raw || '—'}
                          </span>
                        ),
                      },
                      /**
                       * §WAVE 3 — the consignment's ETA, with its BASIS always
                       * stated. A derived or simulated date is never presented as
                       * carrier-confirmed data, and a consignment with no declared
                       * window says "ETA unavailable" rather than inventing one.
                       */
                      {
                        label: 'ETA',
                        value: (
                          <span
                            className="text-ds-micro"
                            data-testid="logistics-eta-value"
                            data-eta-basis={selectedEta?.basis ?? 'none'}
                          >
                            {selectedEta ? etaPresentation(selectedEta).label : 'ETA unavailable'}
                          </span>
                        ),
                      },
                    ]}
                  />

                  {selectedEta && (
                    <p className="text-ds-micro leading-relaxed text-zinc-500" data-testid="logistics-eta-basis">
                      {etaPresentation(selectedEta).detail}
                    </p>
                  )}

                  {/*
                    §BATCH 2i (`AV-045`) — the delivery appointment, in the owner's
                    own words: the state, the window rule's verdict, and the basis.
                    Appointment-based inbound delivery is the retail channel's own
                    documented model, so the operator sees it where the ETA lives.
                  */}
                  {selectedAppointment && selectedAppointmentView && (
                    <>
                      <p
                        className="text-ds-micro leading-relaxed text-zinc-400"
                        data-testid="logistics-appointment"
                        data-appointment-state={selectedAppointment.state}
                        data-appointment-window={selectedAppointment.window.code}
                      >
                        <span className="text-zinc-300">Delivery appointment: {selectedAppointmentView.label}.</span>{' '}
                        {selectedAppointmentView.windowDetail}
                      </p>
                      <p
                        className="text-ds-micro leading-relaxed text-zinc-500"
                        data-testid="logistics-appointment-basis"
                      >
                        {selectedAppointmentView.detail}
                      </p>
                    </>
                  )}

                  <div className="rounded-ds-md border border-white/[0.06] bg-white/[0.02] p-2.5">
                    <p className="mb-1 flex items-center gap-1.5 text-ds-micro font-semibold uppercase tracking-[0.14em] text-zinc-500">
                      <Info className="h-3 w-3" aria-hidden="true" />
                      Why this leg is {OPERATIONAL_TRUTH[selected.truth].short}
                    </p>
                    <p
                      className="text-ds-micro leading-relaxed text-zinc-400"
                      data-testid="logistics-truth-reason"
                    >
                      {selected.truthReason}
                    </p>
                    <p className="mt-1.5 text-ds-micro leading-relaxed text-zinc-600">
                      {selected.origin.reason} {selected.destination.reason}
                    </p>
                  </div>

                  <div className="rounded-ds-md border border-white/[0.06] bg-white/[0.02] p-2.5">
                    <p className="mb-1 text-ds-micro font-semibold uppercase tracking-[0.14em] text-zinc-500">
                      Who arranges carriage
                    </p>
                    <FreightTermChip term={selected.freightTerm} />
                    {freightSemantics(selected.freightTerm) ? (
                      <p className="mt-1.5 text-ds-micro leading-relaxed text-zinc-400">
                        {freightSemantics(selected.freightTerm)!.arranges}
                      </p>
                    ) : (
                      <p className="mt-1.5 text-ds-micro leading-relaxed text-zinc-500">
                        This consignment has no declared freight term on its purchase order, so Mercenta
                        does not assert who arranges carriage.
                      </p>
                    )}
                    {selected.expectedCarrier && (
                      <p className="mt-1.5 text-ds-micro text-zinc-500">
                        Lane rule expects{' '}
                        <span className="font-mono">{carrierLabel(selected.expectedCarrier)}</span>.
                      </p>
                    )}
                    {selected.channelArranged && (
                      <p className="mt-1.5 text-ds-micro text-palette-indigo">
                        Channel-arranged: Mercenta does not select this carrier.
                      </p>
                    )}
                    {selected.carrierValidationError && (
                      <p className="mt-1.5 text-ds-micro text-state-warning">
                        {selected.carrierValidationError}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setWaybillShipment(selected.id)}>
                      <Printer className="h-3 w-3" />
                      Waybill
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setLabelsShipment(selected.id)}>
                      <Barcode className="h-3 w-3" />
                      Labels
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setTrackingShipment(selected.id)}>
                      <Truck className="h-3 w-3" />
                      Track
                    </Button>
                  </div>
                </div>
              </ContextPanel>
            ) : (
              <ContextPanel title="Consignment inspector">
                <div className="p-3" data-testid="logistics-inspector-empty">
                  <p className="text-ds-body text-zinc-500">
                    Select a consignment on the map or in the list to see its route, evidence state and
                    who arranges carriage.
                  </p>
                </div>
              </ContextPanel>
            )}
            {/*
              §P6 — "DOCUMENTS FOR THIS PO" (programme decisions 6 and 9).
              The pack is the Logistics Hub's core deliverable: every document the
              purchase order has, each with its own readiness, plus the documented
              channel collect chain on a Freight Collect lane. It is built by its
              ONE owner and opened through the EXISTING waybill/label dialogues.
            */}
            {selectedPo ? (
              <ContextPanel title="Documents for this PO">
                <div className="p-3">
                  <PoDocumentPackPanel
                    po={selectedPo}
                    brandName={
                      brandsQuery.data?.data.find((b) => b.id === selectedPo.brandId)?.profile
                        .businessName ?? selectedPo.brandId
                    }
                    brandNation={
                      brandsQuery.data?.data.find((b) => b.id === selectedPo.brandId)?.nation ?? null
                    }
                    products={products}
                    carrier={{
                      carrier: selected?.carrier ?? '',
                      trackingNumber: selectedRow?.trackingNumber ?? null,
                      waybill: selectedRow?.waybill ?? null,
                    }}
                    instruction={instructionForPo(selectedPo.id)}
                    shipmentStatus={selected?.status ?? null}
                    onOpenCarrierArtefact={(kind) =>
                      kind === 'carrier_label'
                        ? setLabelsShipment(selected?.id ?? '')
                        : setWaybillShipment(selected?.id ?? '')
                    }
                  />
                </div>
              </ContextPanel>
            ) : (
              <ContextPanel title="Documents for this PO">
                <div className="p-3" data-testid="po-documents-unavailable">
                  <p className="text-ds-body text-zinc-500">
                    This consignment is not linked to a purchase order in your scope, so no document
                    pack applies. A document is only ever produced from a PO you own.
                  </p>
                </div>
              </ContextPanel>
            )}



            <ContextPanel title="How carriage is arranged">
              <div className="space-y-2.5 p-3">
                <div>
                  <FreightTermChip term="collect" />
                  <p className="mt-1 text-ds-micro leading-relaxed text-zinc-400">
                    Retail-channel-arranged. The carrier is not Mercenta’s choice, and a Mercenta carrier
                    account is refused on this PO.
                  </p>
                </div>
                <div>
                  <FreightTermChip term="prepaid" />
                  <p className="mt-1 text-ds-micro leading-relaxed text-zinc-400">
                    Mercenta arranges carriage. International → DHL, UK domestic → Palletline. No single
                    carrier is universal; an admin override is attributed and audited.
                  </p>
                </div>

                {/*
                  §WAVE 3 — THE DERIVED ELIGIBILITY TRAIL.
                  The rule above is the DECLARATION; this is the DERIVATION for the
                  consignment in scope: which account is permitted right now, which
                  is override-only, and which is refused — each with the real
                  provider state that produced the decision. A carrier is never
                  eligible merely because it is available.
                */}
                <div className="border-t border-white/[0.06] pt-2.5" data-testid="carrier-eligibility">
                  <p className="text-ds-micro uppercase tracking-[0.12em] text-zinc-500">
                    Eligibility for the consignment in scope
                  </p>
                  <p className="mt-1 text-ds-micro leading-relaxed text-zinc-400" data-testid="carrier-eligibility-lane">
                    Lane: {eligibility.lane === 'uk_domestic' ? 'UK domestic' : 'International'}
                    {eligibility.channelArranged ? ' · carriage arranged by the retail channel' : ' · carriage arranged by Mercenta'}
                  </p>
                  {eligibility.permitted.length > 0 && (
                    <p className="mt-1 text-ds-micro text-zinc-300" data-testid="carrier-eligibility-permitted">
                      Permitted now:{' '}
                      <span className="font-mono">
                        {eligibility.permitted
                          .map((c) => `${carrierLabel(c)} (${providerModeFor(modes, c)})`)
                          .join(', ')}
                      </span>
                    </p>
                  )}
                  {eligibility.overrideCandidates.length > 0 && (
                    <p className="mt-1 text-ds-micro text-zinc-400" data-testid="carrier-eligibility-override">
                      Override only (attributed + audited):{' '}
                      <span className="font-mono">{eligibility.overrideCandidates.map((c) => carrierLabel(c)).join(', ')}</span>
                    </p>
                  )}
                  {eligibility.blocked.length > 0 && (
                    <ul className="mt-1 space-y-0.5" data-testid="carrier-eligibility-blocked">
                      {eligibility.blocked.map((entry) => (
                        <li key={entry.carrier} className="text-ds-micro leading-relaxed text-zinc-500">
                          <span className="font-mono">{entry.carrier}</span> refused — {entry.reason}
                          {!isCarrierOperational(providerModeFor(modes, entry.carrier)) && (
                            <span className="text-zinc-600"> (state: {providerModeFor(modes, entry.carrier)})</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {eligibility.permitted.length === 0 && !eligibility.channelArranged && (
                    <p className="mt-1 text-ds-micro text-state-warning" data-testid="carrier-eligibility-none">
                      No Mercenta account is operational on this lane right now — no carrier may be selected until a
                      provider state positively resolves to simulation or live.
                    </p>
                  )}
                </div>
              </div>
            </ContextPanel>

            {/*
              §P10 — CARRIER PROVIDER CONFIGURATION (matrix `D10-10`).
              The brand sees WHICH Mercenta account serves its lane, what it is declared
              capable of, and its truthful operational state. It cannot configure one and
              never holds a credential: the lane decides, Mercenta configures.
            */}
            <ContextPanel title="Carrier providers">
              <div className="p-3" data-testid="brand-carrier-providers">
                <CarrierProviderConfigurationPanel
                  configurations={providerConfigurations}
                  scope="brand"
                />
              </div>
            </ContextPanel>

          </>
        }
      >
        <WorkspaceSection
          title="Operational map"
          description="Consignments at their declared coordinates, positioned along their route by the canonical stage."
          domain="logistics"
          action={<TruthLegend counts={visibleTruthCounts} />}
        >
          <LogisticsMapCanvas
            model={model}
            visibleIds={visibleIds}
            selectedId={selectedId}
            onSelect={setSelectedId}
            loading={logisticsPending}
            className="h-[280px] sm:h-[360px] lg:h-[440px]"
          />
          {model.schematic.length > 0 && (
            <p className="text-ds-micro text-zinc-600" data-testid="logistics-schematic-notice">
              {model.schematic.length} consignment{model.schematic.length === 1 ? '' : 's'} declare a
              location the platform cannot resolve (for example “Brand warehouse”) and are therefore NOT
              plotted — they are listed below rather than placed at an invented coordinate.
            </p>
          )}
        </WorkspaceSection>

        <WorkspaceSection
          title={`Consignments (${visibleLegs.length})`}
          description="Every consignment in the current filter, with its declared route, evidence state and the artefacts you can produce for it."
          domain="logistics"
          action={
            <SegmentedControl
              ariaLabel="Status filter"
              active={statusFilter}
              onSelect={setStatusFilter}
              items={statusOptions}
            />
          }
        >
          {logisticsPending ? (
            <LoadingState rows={4} label="Loading your consignments…" />
          ) : visibleLegs.length === 0 ? (
            <p
              className="rounded-ds-md border border-white/[0.06] bg-white/[0.02] px-3 py-6 text-center text-ds-body text-zinc-500"
              data-testid="logistics-list-empty"
            >
              No consignment matches the current filters.
            </p>
          ) : (
            <ul className="divide-y divide-white/[0.04] overflow-hidden rounded-ds-md border border-white/[0.06]">
              {visibleLegs.map((leg) => {
                const status = shipmentStatusPresentation(leg.status);
                const active = leg.id === selectedId;
                return (
                  <li key={leg.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(leg.id)}
                      aria-current={active ? 'true' : undefined}
                      data-testid={`logistics-row-${leg.id}`}
                      data-truth={leg.truth}
                      className={cn(
                        'flex w-full flex-col gap-2 px-3 py-2.5 text-left transition-ds duration-ds-fast sm:flex-row sm:items-center sm:gap-4',
                        active ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-ds-body font-semibold text-white">
                            {leg.reference}
                          </span>
                          <span className="font-mono text-ds-micro text-zinc-600">{leg.poNumber}</span>
                          <StatusBadge tone={OPERATIONAL_TRUTH[leg.truth].tone} dataStatus={leg.truth}>
                            {OPERATIONAL_TRUTH[leg.truth].short}
                          </StatusBadge>
                        </span>
                        {/* The canonical consignment title (e.g. "Tapatío — PO-9002"). */}
                        <span className="mt-0.5 block truncate text-ds-micro text-zinc-400">
                          {leg.title}
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-ds-micro text-zinc-500">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" aria-hidden="true" />
                            {leg.origin.raw || 'origin not declared'}
                          </span>
                          <ArrowRight className="h-3 w-3 text-zinc-700" aria-hidden="true" />
                          <span>{leg.destination.raw || 'destination not declared'}</span>
                          {!leg.geometry && (
                            <span className="text-zinc-600">· not plotted (location undeclared)</span>
                          )}
                        </span>
                      </span>

                      <span className="flex flex-wrap items-center gap-2 sm:flex-shrink-0">
                        <StatusBadge dataStatus={status.dataStatus} tone={status.tone}>
                          {status.label}
                        </StatusBadge>
                        {(leg.exception || leg.delayed) && (
                          <span className="inline-flex items-center gap-1 text-ds-micro text-state-warning">
                            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                            Exception
                          </span>
                        )}
                        <span className="font-mono text-ds-label text-zinc-300">
                          £{Math.round(leg.value / 1000)}k
                        </span>
                        <span className="text-ds-micro text-zinc-600">{leg.cbm} CBM</span>
                      </span>
                    </button>

                    <div className="flex flex-wrap gap-1.5 px-3 pb-2.5">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setWaybillShipment(leg.id)}
                        data-testid={`logistics-waybill-${leg.id}`}
                      >
                        <Printer className="h-3 w-3" />
                        Waybill
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setLabelsShipment(leg.id)}
                        data-testid={`logistics-labels-${leg.id}`}
                      >
                        <Barcode className="h-3 w-3" />
                        Labels
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setTrackingShipment(leg.id)}
                        data-testid={`logistics-track-${leg.id}`}
                      >
                        <Truck className="h-3 w-3" />
                        Track
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </WorkspaceSection>
      </WorkspaceGrid>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={() => setStatusFilter('all')}>
          Clear status filter
        </Button>
        <Button variant="secondary" onClick={() => setTruthFilter('all')}>
          Clear evidence filter
        </Button>
        <span className="text-ds-micro text-zinc-600">
          Booking a consignment happens on Purchase Orders through the canonical ASN flow — Mercenta files
          the ASN against the accepted PO, so freight cannot be booked without a valid PO.
        </span>
      </div>

      {trackingShipment && (
        <ShipmentTrackingTimeline
          shipment={shipmentById(trackingShipment)}
          products={products}
          poProducts={(() => {
            const s = shipmentById(trackingShipment);
            const poId = s.id.replace(/^shipment-/, '');
            const po = scopedPos.find((p) => p.id === poId);
            return po?.lineItems?.map((li) => li.sku) ?? [];
          })()}
          onClose={() => setTrackingShipment(null)}
        />
      )}
      {waybillShipment && (
        <WaybillModal
          shipment={shipmentById(waybillShipment)}
          onClose={() => setWaybillShipment(null)}
        />
      )}
      {labelsShipment && (
        <LabelsModal
          shipment={shipmentById(labelsShipment) as Shipment & { brandId?: string; poNumber?: string }}
          onClose={() => setLabelsShipment(null)}
        />
      )}
    </WorkspaceFrame>
  );
}