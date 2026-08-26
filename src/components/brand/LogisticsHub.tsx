import { useState } from 'react';
import { Card, Badge, Button, Input } from '@/components/ui';
import { cn } from '@/utils/cn';
import { useApp } from '@/store';
import { STATUS_COLORS, STATUS_LABELS } from '@/types';
import type { Shipment } from '@/types';
import {
  Plane,
  Ship,
  Upload,
  FileText,
  Printer,
  Package,
  MapPin,
  X,
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
  const { shipments } = useApp();
  const [tab, setTab] = useState<'air' | 'sea'>('air');
  const [uploadedDocs, setUploadedDocs] = useState<Set<string>>(new Set());
  const [waybillShipment, setWaybillShipment] = useState<string | null>(null);

  const toggleDoc = (id: string) =>
    setUploadedDocs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const filteredShipments = shipments.filter((s) =>
    tab === 'air' ? s.carrier === 'dhl' || s.carrier === 'fedex' : s.carrier === 'bak'
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
              ? 'bg-neon-500 text-white'
              : 'bg-ink-850 text-zinc-400 hover:text-white border border-white/[0.06]'
          )}
        >
          <Plane className="w-4 h-4" />
          Air Courier (DHL / FedEx)
        </button>
        <button
          onClick={() => setTab('sea')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            tab === 'sea'
              ? 'bg-neon-500 text-white'
              : 'bg-ink-850 text-zinc-400 hover:text-white border border-white/[0.06]'
          )}
        >
          <Ship className="w-4 h-4" />
          Heavy Sea / Air Freight (BAK Logistics)
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
                          : 'border-dashed border-white/[0.1] text-zinc-500 hover:border-neon-500/30 hover:text-zinc-300'
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
                Region-specific docs shown for: <span className="text-neon-400 font-medium">{regionKey === 'us' ? 'US origin' : regionKey === 'eu' ? 'European origin' : 'African origin'}</span>
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
                  <Badge className={STATUS_COLORS[s.status]}>
                    {STATUS_LABELS[s.status]}
                  </Badge>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setWaybillShipment(s.id)}
                  >
                    <Printer className="w-3 h-3" />
                    Waybill
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {waybillShipment && (
        <WaybillModal
          shipment={shipments.find((s) => s.id === waybillShipment)!}
          onClose={() => setWaybillShipment(null)}
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
            <div className="text-xl font-bold uppercase tracking-tight">Boxbee Commerce</div>
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
