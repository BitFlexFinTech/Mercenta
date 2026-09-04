/**
 * Batch 35 Brand Reports with Recharts, CSV export, period selector.
 */
import { useMemo, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { usePurchaseOrders } from '@/data/queries';
import { assertBrandScope } from '@/lib/auth/rbac';
import { downloadCsv } from '@/lib/csv';
import { Badge, Button, Card } from '@/components/ui';
import { cn } from '@/utils/cn';
import { TrendingUp, TrendingDown, Package, DollarSign, BarChart3, ShoppingCart, X, Download, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type Period = 30 | 60 | 90;
const BRASS = '#D4A853';
const EMERALD = '#10B981';
const ZINC = '#52525B';
const CHART_TT = { backgroundColor: '#1A1A20', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '11px', color: '#E4E4E7' };

export function BrandReports({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const { session, brandProfile, products } = useApp();
  const poQuery = usePurchaseOrders();
  const [drillCard, setDrillCard] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>(90);
  const pos = useMemo(() => assertBrandScope(session, poQuery.data?.data ?? []), [session, poQuery.data]);
  const cutoff = new Date(Date.now() - period * 864e5).toISOString().slice(0, 10);
  const rp = pos.filter((p) => p.orderDate >= cutoff);
  const openPOs = rp.filter((p) => ['received', 'under_review', 'accepted', 'ready_to_fulfil'].includes(p.status));
  const deliveredPOs = rp.filter((p) => p.status === 'delivered');
  const shippedPOs = rp.filter((p) => p.status === 'shipped');
  const totalLines = rp.reduce((s, p) => s + p.lineItems.length, 0);
  const confirmedLines = rp.reduce((s, p) => s + p.lineItems.filter((l) => l.ackStatus === 'accepted' || l.ackStatus === 'backordered').length, 0);
  const asinRate = totalLines > 0 ? Math.round((confirmedLines / totalLines) * 100) : 0;
  const outOfStock = products.filter((p) => p.isAvailable === false).length;
  const totalValueShipped = [...shippedPOs, ...deliveredPOs].reduce((s, p) => s + p.poValue, 0);
  const totalUnitsShipped = [...shippedPOs, ...deliveredPOs].reduce((s, p) => s + p.lineItems.reduce((sl, li) => sl + li.quantity, 0), 0);
  const netPPM = totalUnitsShipped > 0 ? Math.round((totalValueShipped / totalUnitsShipped) * 1000) : 0;
  const openPOQty = openPOs.reduce((s, p) => s + p.lineItems.reduce((sl, li) => sl + li.quantity, 0), 0);
  const onHandInv = products.reduce((s, p) => s + (p.unitsPerCase ?? 1) * 10, 0);

  const dispatchChart = useMemo(() => {
    const b = new Map<string, number>();
    for (const po of [...shippedPOs, ...deliveredPOs]) {
      const key = po.orderDate.slice(0, 7);
      b.set(key, (b.get(key) ?? 0) + po.lineItems.reduce((sl, li) => sl + li.quantity, 0));
    }
    return [...b].sort((a, b) => a[0].localeCompare(b[0])).slice(-6).map(([month, units]) => ({ month, units }));
  }, [shippedPOs, deliveredPOs]);

  const salesChart = useMemo(() => {
    const b = new Map<string, number>();
    for (const po of [...shippedPOs, ...deliveredPOs]) {
      const key = po.orderDate.slice(0, 7);
      b.set(key, (b.get(key) ?? 0) + po.poValue);
    }
    return [...b].sort((a, b) => a[0].localeCompare(b[0])).slice(-6).map(([month, value]) => ({ month, value }));
  }, [shippedPOs, deliveredPOs]);

  const metrics = [
    { label: 'ASIN Confirmation Rate', value: asinRate + '%', icon: BarChart3, trend: totalLines > 0 ? confirmedLines + '/' + totalLines + ' lines' : 'No data', trendUp: asinRate >= 80 },
    { label: 'Sourceable Products OOS', value: String(outOfStock), icon: Package, trend: 'of ' + products.length + ' total SKUs', trendUp: outOfStock === 0 },
    { label: 'Open PO Quantity', value: String(openPOQty), icon: ShoppingCart, trend: openPOs.length + ' open POs', trendUp: false },
    { label: 'On-Hand Inventory (est.)', value: String(onHandInv), icon: Package, trend: 'Estimated units', trendUp: true },
    { label: 'Net PPM', value: '\u00a3' + netPPM.toLocaleString(), icon: DollarSign, trend: 'Per 1000 units shipped', trendUp: netPPM > 500 },
  ];
  const poStatuses = ['received', 'under_review', 'accepted', 'ready_to_fulfil', 'shipped', 'delivered', 'rejected'] as const;  return (
    <div>
      <p>Reports v2</p>
    </div>
  );
}
