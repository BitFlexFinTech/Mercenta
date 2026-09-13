import { useState, useMemo, type ComponentType } from 'react';
import { Card, Badge, Button, Input, StatusBadge } from '@/components/ui';
import { cn } from '@/utils/cn';
import { useApp } from '@/context/GlobalStateContext';
import { usePurchaseOrders, useShipmentsAll } from '@/data/queries';
import { BRAND_NAME } from '@/config/brand';
import { shipmentStatusPresentation } from '@/lib/statusPresentation';
import type { Shipment, ShipmentStatus } from '@/types';
import {
  Plane,
  Ship,
  Upload,
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
} from 'lucide-react';

const BASE_DOCS = [
  { id: 'invoice', label: 'Commercial Invoice', icon: FileText },
  { id: 'packing', label: 'Detailed Packing List', icon: Package },
];

const REGION_DOCS: Record<string, { id: string; label: string; icon: typeof FileText }[]> = {
  us: [{ id: 'fcc_fda', label: 'US FCC / FDA Exemptions', icon: FileText }],
  eu: [{ id: 'ce', label: 'CE Declarations', icon: FileText }],
  africa: [{ id: 'cd1', label: 'Export CD1 Form', icon: FileText }],
};

function getRegionFromOrigin(origin: string): 'us' | 'eu' | 'africa' {
  if (origin.includes('USA') || origin.includes('Texas') || origin.includes('United States')) return 'us';
  if (origin.includes('Germany') || origin.includes('Munich') || origin.includes('Milan') || origin.includes('France') || origin.includes('Netherlands') || origin.includes('Italy') || origin.includes('Spain')) return 'eu';
  return 'africa';
}

export function LogisticsHub() {
  const { session, products } = useApp();
  const shipmentsQuery = useShipmentsAll();
  const posQuery = usePurchaseOrders();
  const [tab, setTab] = useState<'air' | 'sea' | 'pallet'>('air');
  const [uploadedDocs, setUploadedDocs] = useState<Set<string>>(new Set());
  const [waybillShipment, setWaybillShipment] = useState<string | null>(null);
  const [trackingShipment, setTrackingShipment] = useState<string | null>(null);
  const [labelsShipment, setLabelsShipment] = useState<string | null>(null);

  const toggleDoc = (id: string) =>
    setUploadedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  // §7D — live shipment feed (single source of truth: demoShipments via
  // useShipmentsAll) so shipments created in-session (auto-created drafts,
  // filed ASNs) appear immediately. Tenant-scoped for brand sessions — a brand
  // only ever sees its OWN shipments. Rows are normalised to the canonical
  // Shipment shape (same enrichment brandDossiers applies) so every modal
  // receives a well-formed shipment.
  const liveShipments = ((shipmentsQuery.data?.data ?? []) as unknown as Shipment[])
    .filter((s) => session?.tier !== 'brand' || (s as unknown as { brandId?: string }).brandId === session?.tenantId)
    .map((s) => ({
      id: s.id,
      reference: s.reference,
      title: s.title,
      customer: (s as unknown as { customer?: string }).customer ?? '',
      value: s.value,
      status: s.status,
      carrier: s.carrier,
      stage: s.stage ?? 'factory_intake',
      cbm: (s as unknown as { cbm?: number }).cbm ?? Math.max(6, Math.round(s.value / 9000)),
      origin: s.origin,
      destination: s.destination,
      date: (s as unknown as { date?: string }).date ?? '',
      trackingNumber: (s as unknown as { trackingNumber?: string }).trackingNumber ?? '',
    }));

  const filteredShipments = liveShipments.filter((s) =>
    tab === 'air' ? s.carrier === 'dhl' || s.carrier === 'fedex' :
    tab === 'pallet' ? s.carrier === 'palletline' : s.carrier === 'bak'
  );

  // Determine region-specific docs based on the first filtered shipment's origin
  const regionSample = filteredShipments[0];
  const regionKey = regionSample ? getRegionFromOrigin(regionSample.origin) : 'africa';
  const regionDocs = REGION_DOCS[regionKey] || REGION_DOCS.africa;
  const allDocs = [...BASE_DOCS, ...regionDocs];

  return (
    <div className="p-6 space-y-4 max-w-[1400px] mx-auto">
      <div>
        <h2 className="text-lg font-semibold text-white">Integrated Logistics Hub</h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Forward & export booking room — split by cargo rules
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('air')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            tab === 'air'
              ? 'bg-brass-500 text-white'
              : 'bg-ink-850 text-zinc-400 hover:text-white border border-white/[0.06]'
          )}
        >
          <Plane className="w-4 h-4" />
          DHL Express (parcel/general)
        </button>
        <button
          onClick={() => setTab('sea')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            tab === 'sea'
              ? 'bg-brass-500 text-white'
              : 'bg-ink-850 text-zinc-400 hover:text-white border border-white/[0.06]'
          )}
        >
          <Ship className="w-4 h-4" />
          Sea Freight (BAK Logistics)
        </button>
        <button
          onClick={() => setTab('pallet')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            tab === 'pallet'
              ? 'bg-brass-500 text-white'
              : 'bg-ink-850 text-zinc-400 hover:text-white border border-white/[0.06]'
          )}
        >
          <Package className="w-4 h-4" />
          Palletised (Palletline)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Booking Form */}
        <Card title="New Booking" className="lg:col-span-1">
          <div className="p-5 space-y-3">
            <Input label="Shipment Reference" placeholder="BOX-2026-XXX" />
            <Input label="Origin" placeholder={tab === 'air' ? 'Austin, Texas, USA' : 'Durban, South Africa'} />
            <Input label="Destination" placeholder="London, UK" />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Weight (kg)" type="number" placeholder="0" />
              <Input label="Volume (CBM)" type="number" placeholder="0" />
            </div>

            {/* Document Drop Zones */}
            <div className="pt-2">
              <label className="block text-xs font-medium text-zinc-400 mb-2">
                Customs Documentation
              </label>
              <div className="space-y-2">
                {allDocs.map((doc) => {
                  const Icon = doc.icon;
                  const uploaded = uploadedDocs.has(doc.id);
                  return (
                    <button
                      key={doc.id}
                      onClick={() => toggleDoc(doc.id)}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-xs transition-all',
                        uploaded
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'border-dashed border-white/[0.1] text-zinc-500 hover:border-brass-500/30 hover:text-zinc-300'
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="flex-1 text-left">{doc.label}</span>
                      {uploaded ? (
                        <span className="text-[10px]">Uploaded ✓</span>
                      ) : (
                        <Upload className="w-3 h-3" />
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-zinc-600 mt-2">
                Region-specific docs shown for: <span className="text-brass-400 font-medium">{regionKey === 'us' ? 'US origin' : regionKey === 'eu' ? 'European origin' : 'African origin'}</span>
              </p>
            </div>

            <Button className="w-full mt-2">Create Booking</Button>
          </div>
        </Card>

        {/* Active Shipments */}
        <Card title={`${tab === 'air' ? 'Air Courier' : 'Heavy Freight'} Manifest`} className="lg:col-span-2">
          <div className="divide-y divide-white/[0.04]">
            {filteredShipments.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white truncate">
                    {s.title}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                    <MapPin className="w-3 h-3" />
                    {s.origin} → {s.destination}
                  </div>
                </div>
                <div className="text-right mx-4">
                  <div className="text-sm font-semibold text-white">
                    £{Math.round(s.value / 1000)}k
                  </div>
                  <div className="text-xs text-zinc-600">{s.cbm} CBM</div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <StatusBadge
                    dataStatus={shipmentStatusPresentation(s.status).dataStatus}
                    tone={shipmentStatusPresentation(s.status).tone}
                  >
                    {shipmentStatusPresentation(s.status).label}
                  </StatusBadge>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setWaybillShipment(s.id)}
                  >
                    <Printer className="w-3 h-3" />
                    Waybill
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setLabelsShipment(s.id)}
                  >
                    <Barcode className="w-3 h-3" />
                    Labels
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setTrackingShipment(s.id)}
                  >
                    <Truck className="w-3 h-3" />
                    Track
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {trackingShipment && (
        <ShipmentTrackingTimeline
          shipment={liveShipments.find((s) => s.id === trackingShipment)!}
          products={products}
          poProducts={(() => {
            const s = liveShipments.find((x) => x.id === trackingShipment);
            if (!s) return [];
            const pos = posQuery.data?.data ?? [];
            // Match by removing 'shipment-' prefix from shipment ID to get PO ID
            const poId = s.id.replace(/^shipment-/, '');
            const po = pos.find((p) => p.id === poId);
            return po?.lineItems?.map((li) => li.sku) ?? [];
          })()}
          onClose={() => setTrackingShipment(null)}
        />
      )}
      {waybillShipment && (
        <WaybillModal
          shipment={liveShipments.find((s) => s.id === waybillShipment)!}
          onClose={() => setWaybillShipment(null)}
        />
      )}
      {labelsShipment && (
        <LabelsModal
          shipment={liveShipments.find((s) => s.id === labelsShipment)!}
          onClose={() => setLabelsShipment(null)}
        />
      )}
    </div>
  );
}

function WaybillModal({
  shipment,
  onClose,
}: {
  shipment: Shipment;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white text-black rounded-xl max-w-lg w-full p-8 shadow-2xl animate-fade-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-black"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-black">
          <div>
            <div className="text-xl font-bold uppercase tracking-tight">{BRAND_NAME}</div>
            <div className="text-xs text-zinc-500">Freight Waybill / Shipping Label</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-zinc-500">Tracking No.</div>
            <div className="text-sm font-mono font-bold">{shipment.trackingNumber}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs mb-6">
          <div>
            <div className="text-zinc-500 mb-1">Reference</div>
            <div className="font-semibold">{shipment.reference}</div>
          </div>
          <div>
            <div className="text-zinc-500 mb-1">Date</div>
            <div className="font-semibold">{shipment.date}</div>
          </div>
          <div>
            <div className="text-zinc-500 mb-1">Origin</div>
            <div className="font-semibold">{shipment.origin}</div>
          </div>
          <div>
            <div className="text-zinc-500 mb-1">Destination</div>
            <div className="font-semibold">{shipment.destination}</div>
          </div>
          <div>
            <div className="text-zinc-500 mb-1">Customer</div>
            <div className="font-semibold">{shipment.customer}</div>
          </div>
          <div>
            <div className="text-zinc-500 mb-1">Value</div>
            <div className="font-semibold">£{shipment.value.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-zinc-500 mb-1">Volume</div>
            <div className="font-semibold">{shipment.cbm} CBM</div>
          </div>
          <div>
            <div className="text-zinc-500 mb-1">Carrier</div>
            <div className="font-semibold uppercase">{shipment.carrier}</div>
          </div>
        </div>

        <div className="border-2 border-dashed border-zinc-300 p-4 text-center mb-4">
          <div className="text-xs text-zinc-500 mb-2">Barcode</div>
          <div className="font-mono text-2xl tracking-widest">{shipment.trackingNumber}</div>
          <div className="flex gap-0.5 mt-3 justify-center">
            {Array.from({ length: 40 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'w-0.5',
                  (i + shipment.reference.length) % 3 === 0 ? 'h-8 bg-black' : 'h-6 bg-black'
                )}
                style={{ opacity: (i % 4 === 0 ? 1 : 0.3) }}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="w-3.5 h-3.5" />
            Print
          </Button>
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}

/**
 * §Stage-6 — Shipment Tracking Timeline (brand-facing).
 * Shows carrier milestones based on shipment status, plus SKU / EAN
 * detail for products in the shipment's purchase order.
 */
const MILESTONES: { status: ShipmentStatus; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { status: 'factory_intake', label: 'Factory Intake', icon: Package },
  { status: 'bak_depot', label: 'In BAK Depot', icon: WarehouseIcon },
  { status: 'sea_transit', label: 'Sea Transit', icon: Ship },
  { status: 'air_transit', label: 'Air Transit', icon: Plane },
  { status: 'uk_customs_cleared', label: 'UK Customs Cleared', icon: CheckCircle2 },
  { status: 'mercenta_hub', label: 'Mercenta UK Hub', icon: MapPin },
  { status: 'live_amazon', label: 'Live on retail channel', icon: Truck },
];

function WarehouseIcon(props: { className?: string }) {
  return <Package className={props.className} />;
}

function MilestoneIcon({ status }: { status: ShipmentStatus }) {
  const m = MILESTONES.find((m) => m.status === status);
  const Icon = m?.icon ?? Clock;
  return <Icon className="w-5 h-5" />;
}

function getNextMilestones(current: ShipmentStatus): (typeof MILESTONES) {
  const idx = MILESTONES.findIndex((m) => m.status === current);
  if (idx === -1) return MILESTONES;
  return MILESTONES.slice(0, idx + 2);
}

function LabelsModal({
  shipment,
  onClose,
}: {
  // §7D — canonical Shipment plus the row-level identifiers the label needs
  // (brandId/poNumber live on the canonical demoShipment rows).
  shipment: Shipment & { brandId?: string; poNumber?: string };
  onClose: () => void;
}) {
  /**
   * TODO: Replace with DHL API call when enterprise account is live
   * POST /shipments/v4  or  GET /labels/{shipmentId}
   */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white text-black rounded-xl max-w-3xl w-full p-8 shadow-2xl animate-fade-in" style={{ fontFamily: 'monospace' }}>
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-black"><X className="w-4 h-4" /></button>
        <div className="text-center mb-6">
          <div className="text-xs text-zinc-500 mb-2">
            Carrier labels will be generated automatically once the DHL integration is live.<br />
            For now, please use the manual label template below.
          </div>
        </div>
        <div className="border-2 border-black p-6 rounded-none mb-6 bg-white" id="printable-label">
          <div className="text-center border-b-2 border-black pb-3 mb-4">
            <div className="text-lg font-bold uppercase">Shipping Label</div>
            <div className="text-xs text-zinc-500">{BRAND_NAME}</div>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs mb-4">
            <div className="font-bold">Brand:</div><div>{shipment.customer || shipment.brandId}</div>
            <div className="font-bold">PO Number:</div><div>{shipment.poNumber || '—'}</div>
            <div className="font-bold">Destination FC:</div><div>{shipment.destination}</div>
            <div className="font-bold">Carton Number:</div><div>_ / _</div>
            <div className="font-bold">Reference:</div><div>{shipment.reference}</div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button onClick={() => window.print()}><Printer className="w-3 h-3" /> Print Labels</Button>
        </div>
      </div>
    </div>
  );
}
function ShipmentTrackingTimeline({
  shipment,
  products,
  poProducts,
  onClose,
}: {
  shipment: Shipment;
  products: { id: string; sku: string; barcode: string; name: string; image?: string; productImages?: { url: string }[] }[];
  poProducts: string[];
  onClose: () => void;
}) {
  const currentIdx = MILESTONES.findIndex((m) => m.status === shipment.status);
  const visibleMilestones = getNextMilestones(shipment.status);
  const pastCutoff = currentIdx >= 0;

  const shipmentProducts = products.filter((p) => poProducts.includes(p.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white text-black rounded-xl max-w-2xl w-full p-6 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-black"><X className="w-4 h-4" /></button>
        <div className="mb-6 pb-4 border-b border-zinc-200">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-lg font-bold flex items-center gap-2"><Truck className="w-5 h-5" /> Shipment Tracking</div>
              <div className="text-xs text-zinc-500 mt-1">{shipment.reference} &middot; {shipment.carrier.toUpperCase()}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-zinc-500">Tracking No.</div>
              <div className="text-sm font-mono font-bold">{shipment.trackingNumber}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs mt-3">
            <div><span className="text-zinc-500">Origin:</span> <span className="font-semibold">{shipment.origin}</span></div>
            <div><span className="text-zinc-500">Destination:</span> <span className="font-semibold">{shipment.destination}</span></div>
            <div><span className="text-zinc-500">Value:</span> <span className="font-semibold">&pound;{shipment.value.toLocaleString()}</span></div>
            <div><span className="text-zinc-500">Ship date:</span> <span className="font-semibold">{shipment.date}</span></div>
          </div>
        </div>
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-zinc-700 mb-3 flex items-center gap-2"><Clock className="w-4 h-4" /> Carrier Milestones</h3>
          <div className="space-y-0">
            {MILESTONES.map((m, i) => {
              const isCompleted = pastCutoff && i <= currentIdx;
              const isCurrent = i === currentIdx;
              return (
                <div key={m.status} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center ring-2", isCompleted ? "bg-emerald-500 text-white ring-emerald-500/30" : isCurrent ? "bg-amber-400 text-white ring-amber-400/30 animate-pulse" : "bg-zinc-100 text-zinc-400 ring-zinc-200/50")}>
                      {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <MilestoneIcon status={m.status} />}
                    </div>
                    {i < MILESTONES.length - 1 && <div className={cn("w-0.5 h-8", isCompleted ? "bg-emerald-400" : "bg-zinc-200")} />}
                  </div>
                  <div className="flex-1 pb-6">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-sm font-medium", isCompleted ? "text-emerald-700" : isCurrent ? "text-amber-700" : "text-zinc-400")}>{m.label}</span>
                      {isCurrent && <Badge className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0">CURRENT</Badge>}
                      {isCompleted && !isCurrent && <Badge className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0">DONE</Badge>}
                    </div>
                    {isCurrent && <p className="text-xs text-zinc-500 mt-1">{shipment.carrier.toUpperCase()} &mdash; last update: {shipment.date}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {shipmentProducts.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-zinc-700 mb-3 flex items-center gap-2"><Barcode className="w-4 h-4" /> Products in this Shipment ({shipmentProducts.length})</h3>
            <div className="space-y-2">
              {shipmentProducts.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg bg-zinc-50 border border-zinc-200">
                  {p.productImages?.[0]?.url || p.image ? <img src={p.productImages?.[0]?.url || p.image || ""} alt={p.name} className="w-10 h-10 rounded object-cover bg-zinc-200" />
                    : <div className="w-10 h-10 rounded bg-zinc-200 flex items-center justify-center"><Package className="w-5 h-5 text-zinc-400" /></div>}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-zinc-700 truncate">{p.name}</div>
                    <div className="text-xs text-zinc-500 flex items-center gap-3 mt-0.5">
                      <span>SKU: <code className="font-mono bg-zinc-200 px-1 rounded">{p.sku}</code></span>
                      <span>EAN: <code className="font-mono bg-zinc-200 px-1 rounded">{p.barcode || "\u2014"}</code></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex justify-end mt-6 pt-4 border-t border-zinc-200"><Button onClick={onClose}>Close</Button></div>
      </div>
    </div>
  );
}

