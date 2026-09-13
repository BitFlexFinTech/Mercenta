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
import { DEMO_WAREHOUSE_PARTNER, type ReturnTrackingStatus } from '@/types';
import { Warehouse, PackageCheck, Truck, CheckCircle2, Search, Boxes } from 'lucide-react';

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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const allTracking = useMemo(function() { return getAllReturnTracking().sort(function(a, b) { return b.receivedAtWarehouse.localeCompare(a.receivedAtWarehouse); }); }, []);
  const filtered = useMemo(function() {
    if (!searchQuery.trim()) return allTracking;
    const q = searchQuery.toLowerCase();
    return allTracking.filter(function(t) {
      const bn = brands.find(function(b) { return b.id === t.brandId; })?.profile.businessName ?? t.brandId;
      return bn.toLowerCase().includes(q) || t.inboundTrackingNumber.toLowerCase().includes(q) || (t.forwardedTrackingNumber || '').toLowerCase().includes(q) || t.returnId.toLowerCase().includes(q);
    });
  }, [allTracking, searchQuery, brands]);

  const brandName = function(id: string) { return brands.find(function(b) { return b.id === id; })?.profile.businessName ?? id; };
  const returnInfo = function(returnId: string) { return demoReturns.find(function(r) { return r.id === returnId; }); };

  const stats = useMemo(function() {
    return {
      received: allTracking.filter(function(t) { return t.status === 'received_at_warehouse'; }).length,
      checked: allTracking.filter(function(t) { return t.status === 'quality_checked'; }).length,
      forwarded: allTracking.filter(function(t) { return t.status === 'forwarded_to_brand'; }).length,
      confirmed: allTracking.filter(function(t) { return t.status === 'confirmed_by_brand'; }).length,
    };
  }, [allTracking]);

  function showNotice(msg: string) { setNotice(msg); setTimeout(function() { setNotice(null); }, 4000); }

  function handleNextStage(trackingId: string) {
    const t = getAllReturnTracking().find(function(x) { return x.id === trackingId; });
    if (!t) return;
    if (t.status === 'received_at_warehouse') {
      const updated = recordQualityCheck(trackingId, true, 'Auto-checked at demo. Passed visual inspection.');
      if (updated) showNotice('Quality check recorded for return ' + updated.returnId + '.');
    } else if (t.status === 'quality_checked') {
      const updated = recordForwardToBrand(trackingId, 'DHL', 'DHL-UK-FWD-88' + Math.floor(1000 + Math.random() * 9000), 'ra-1');
      if (updated) showNotice('Return forwarded to brand via DHL.');
    } else if (t.status === 'forwarded_to_brand') {
      const updated = recordBrandConfirmation(trackingId);
      if (updated) showNotice('Brand confirmed receipt of return ' + updated.returnId + '.');
    }
    setSelectedId(trackingId);
  }
return (
    <div className="p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3">
        <Warehouse className="w-5 h-5 text-brass-400" />
        <div>
          <h2 className="text-lg font-semibold text-white">Returns Warehouse Tracking</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Internal forwarding flow — received at warehouse to confirmed by brand</p>
        </div>
      </div>

      <div className="bg-ink-900 border border-white/[0.06] rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-brass-400" />
            <span className="text-xs font-medium text-white">{DEMO_WAREHOUSE_PARTNER.name}</span>
            <Badge className="text-[8px] bg-amber-500/15 text-amber-300">(Mock)</Badge>
          </div>
          <div className="text-right text-[9px] text-zinc-500">{DEMO_WAREHOUSE_PARTNER.address}, {DEMO_WAREHOUSE_PARTNER.postcode}</div>
        </div>
        <p className="text-[10px] text-zinc-500 mt-1.5">{DEMO_WAREHOUSE_PARTNER.notes}</p>
      </div>

      {notice && <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-xs text-emerald-300">{notice}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <Card className="p-3"><p className="text-zinc-500 flex items-center gap-1"><Warehouse className="w-3 h-3" /> Received</p><p className="text-xl font-bold text-white mt-1">{stats.received}</p></Card>
        <Card className="p-3"><p className="text-zinc-500 flex items-center gap-1"><PackageCheck className="w-3 h-3" /> Qty Checked</p><p className="text-xl font-bold text-amber-400 mt-1">{stats.checked}</p></Card>
        <Card className="p-3"><p className="text-zinc-500 flex items-center gap-1"><Truck className="w-3 h-3" /> Forwarded</p><p className="text-xl font-bold text-purple-400 mt-1">{stats.forwarded}</p></Card>
        <Card className="p-3"><p className="text-zinc-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Confirmed</p><p className="text-xl font-bold text-emerald-400 mt-1">{stats.confirmed}</p></Card>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
        <input type="text" value={searchQuery} onChange={function(e) { setSearchQuery(e.target.value); }}
          placeholder="Search by brand, tracking number, or return…"
          className="w-full bg-ink-900 border border-white/[0.08] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-brass-500/40" />
      </div>
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
              <Button className="text-[10px]" onClick={() => handleNextStage(t.id)}>
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
                    <span className="block font-mono text-[10px] text-zinc-600">
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
                  <span className="block font-mono text-[10px] text-zinc-400">{t.inboundTrackingNumber}</span>
                  <span className="block text-[10px] text-zinc-600">{t.inboundCarrier}</span>
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
                    <StatusBadge className="text-[10px]" dataStatus={p.dataStatus} tone={p.tone}>
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
                    <span className="block font-mono text-[10px] text-zinc-400">{t.forwardedTrackingNumber}</span>
                    <span className="block text-[10px] text-zinc-600">{t.forwardedCarrier}</span>
                  </span>
                ) : (
                  <span className="text-zinc-600">—</span>
                ),
            },
          ]}
        />
      </Card>
    </div>
  );
}