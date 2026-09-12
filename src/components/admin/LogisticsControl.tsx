import { useMemo } from 'react';
import { useBrands, usePurchaseOrders, useShipmentsAll } from '@/data/queries';
import { DemoBanner } from '@/components/shared/DemoBanner';
import { Badge, Card } from '@/components/ui';
import { cn } from '@/utils/cn';
import { AlertTriangle, Container, Ship } from 'lucide-react';
import type { DemoShipment } from '@/data/demoData';
import type { PurchaseOrder } from '@/types';

const IN_TRANSIT = ['sea_transit', 'air_transit', 'factory_intake'];

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

  return (
    <div className="p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center">
          <Container className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Logistics Control</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Operational view — shipments in transit, delays and exceptions by brand
            and PO
          </p>
        </div>
      </div>

      <DemoBanner />

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4"><div className="text-xs text-zinc-500 mb-1">In Transit</div><div className="text-2xl font-bold text-white">{inTransit.length}</div></Card>
        <Card className="p-4"><div className="text-xs text-zinc-500 mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-amber-400" /> Delayed</div><div className="text-2xl font-bold text-amber-400">{delayed.length}</div></Card>
        <Card className="p-4"><div className="text-xs text-zinc-500 mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-red-400" /> Exceptions</div><div className="text-2xl font-bold text-red-400">{exceptions.length}</div></Card>
      </div>

      {groups.map(([brandId, list]) => (
        <Card key={brandId} title={brandName(brandId)}>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] text-zinc-600">
                <th className="text-left py-2 pl-1">PO</th>
                <th className="text-left py-2">Carrier</th>
                <th className="text-left py-2">Reference</th>
                <th className="text-left py-2">Status</th>
                <th className="text-right py-2 pr-1">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {list.map((s) => {
                const transit = IN_TRANSIT.includes(s.status);
                return (
                  <tr key={s.id} className={cn(transit && s.delayed && 'bg-amber-500/5')}>
                    <td className="py-2 pl-1 font-mono text-brass">
                      {s.poNumber}
                      {poFor(s.poNumber)?.simulated === true && (
                        <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-brass-500/15 text-brass-400 border border-brass-500/20">(sim)</span>
                      )}
                    </td>
                    <td className="py-2 capitalize">{s.carrier.replace('_', ' ')}</td>
                    <td className="py-2 font-mono text-zinc-400">{s.reference}</td>
                    <td className="py-2">
                      <span className={cn('capitalize', transit ? 'text-zinc-200' : 'text-emerald-400')}>
                        {s.status.replace(/_/g, ' ')}
                      </span>
                      {transit && s.delayed && (
                        <Badge className="ml-2 text-[9px] bg-amber-500/15 text-amber-300 border-amber-500/20">Delayed</Badge>
                      )}
                      {s.exception && (
                        <Badge className="ml-2 text-[9px] bg-red-500/15 text-red-300 border-red-500/20">Exception</Badge>
                      )}
                    </td>
                    <td className="py-2 pr-1 text-right font-mono text-white">
                      £{s.value.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      ))}
    </div>
  );
}

// Keep Ship import referenced for potential header use.
void Ship;
