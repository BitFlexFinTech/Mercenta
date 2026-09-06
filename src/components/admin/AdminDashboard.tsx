import { useState, useMemo } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { Card, Badge } from '@/components/ui';
import { cn } from '@/utils/cn';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { CARRIER_VOLUME_DATA } from '@/data/demoCharts';
import { ALL_DEMO_BRANDS } from '@/data/demoData';
import { STATUS_COLORS, STATUS_LABELS } from '@/types';
import {
  useBrands,
  useCommissions,
  useComplianceDocuments,
  useContracts,
  usePurchaseOrders,
} from '@/data/queries';
import { renewalUrgency } from '@/lib/contracts';
import type { AdminDepartment } from '@/types';
import {
  TrendingUp,
  Users,
  Package,
  Truck,
  DollarSign,
  Sparkles,
  ShieldCheck,
  Boxes,
  FileCheck2,
  Plane,
  Ship,
} from 'lucide-react';

const DEPARTMENTS: { id: AdminDepartment; label: string; icon: typeof Sparkles }[] = [
  { id: 'business_dev', label: 'Business Development', icon: Sparkles },
  { id: 'logistics', label: 'Logistics Coordination', icon: Truck },
  { id: 'compliance', label: 'Compliance & Trade Legals', icon: FileCheck2 },
];

export function AdminDashboard({ department, onNavigate }: { department?: AdminDepartment; onNavigate?: (view: string) => void }) {
  const { shipments, leads, campaigns } = useApp();
  const [activeDept, setActiveDept] = useState<AdminDepartment>(department || 'business_dev');
  /** §Stage-17 fix #4 — every summary card opens a drill-down detail modal. */
  const [openCard, setOpenCard] = useState<string | null>(null);

  const totalRevenue = useMemo(() => shipments.reduce((sum, s) => sum + s.value, 0), [shipments]);
  // §Stage-17 — derive from the canonical demo dataset, never hardcode a count.
  const activeBrands = ALL_DEMO_BRANDS.length;
  const totalShipments = shipments.length;
  const totalLeads = leads.length;

  /* ── §Stage-19.7 — Overview defined with REAL content ─────────────── */
  const brandsList = useBrands().data?.data ?? [];
  const posAll = usePurchaseOrders().data?.data ?? [];
  const commissionsAll = useCommissions().data?.data ?? [];
  const complianceDocsAll = useComplianceDocuments().data?.data ?? [];
  const contractsAll = useContracts().data?.data ?? [];

  const brandNameById = useMemo(() => new Map(
    brandsList.map((b) => [b.id, b.profile.businessName] as const)
  ), [brandsList]);
  const brandRegionById = useMemo(() => new Map(
    ALL_DEMO_BRANDS.map((b) => [b.id, b.region] as const)
  ), []);
  const complianceDocsAgg = useMemo(() => complianceDocsAll.slice(0, 8).map((d) => ({
    brand: brandNameById.get(d.brandId) ?? 'Unknown',
    region: brandRegionById.get(d.brandId) ?? 'north_america',
    docType: d.type,
    status: d.status === 'approved' ? 'verified' : 'pending',
  })), [complianceDocsAll, brandNameById, brandRegionById]);
  const monthPrefix = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const revenueThisMonth = useMemo(() => commissionsAll
    .filter((c) => (c.createdAt ?? '').startsWith(monthPrefix))
    .reduce((a, c) => a + c.commissionAmount, 0), [commissionsAll, monthPrefix]);
  const posAwaitingAction = useMemo(() => posAll.filter(
    (p) => p.status === 'received' || p.status === 'under_review'
  ), [posAll]);
  const docsAwaitingReview = useMemo(() => complianceDocsAll.filter(
    (d) => d.status === 'under_review' || d.status === 'uploaded'
  ), [complianceDocsAll]);
  const renewalsSoon = useMemo(() => contractsAll
    .map((c) => ({
      c,
      urgency: renewalUrgency(c.renewalDate, new Date().toISOString()),
    }))
    .filter(({ urgency }) => urgency !== 'ok'), [contractsAll]);
  // Category performance: PO value aggregated per owning brand's category.
  const poValueByBrand = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of posAll) {
      map.set(p.brandId, (map.get(p.brandId) ?? 0) + p.poValue);
    }
    return map;
  }, [posAll]);
  const poValueByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of ALL_DEMO_BRANDS) {
      const v = poValueByBrand.get(b.id) ?? 0;
      map.set(b.category, (map.get(b.category) ?? 0) + v);
    }
    return map;
  }, [poValueByBrand]);
  const topCategories = useMemo(() => [...poValueByCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5), [poValueByCategory]);

  // Compliance gate: count brands with all docs approved vs blocked
  const complianceGateCleared = useMemo(() => ALL_DEMO_BRANDS.filter(function(b) {
    var brandDocs = complianceDocsAll.filter(function(d) { return d.brandId === b.id; });
    var hasContract = contractsAll.some(function(c) { return c.brandId === b.id && (c.status === 'signed' || c.status === 'active'); });
    var requiredTypes = ['letter_of_authorization', 'product_safety_ukca', 'insurance_certificate', 'brand_registry_confirmation'];
    var allApproved = requiredTypes.every(function(t) { return brandDocs.some(function(d) { return d.type === t && d.status === 'approved'; }); });
    return allApproved && hasContract;
  }).length, [complianceDocsAll, contractsAll]);
  const complianceGateBlocked = ALL_DEMO_BRANDS.length - complianceGateCleared;

  const OVERVIEW_CARDS: { label: string; value: string; trend: string; trendUp: boolean; icon: React.ReactNode }[] = [
    {
      label: 'Revenue This Month',
      value: `£${revenueThisMonth.toLocaleString()}`,
      trend: 'commissions',
      trendUp: true,
      icon: <DollarSign className="w-4 h-4" />,
    },
    {
      label: 'POs Awaiting Action',
      value: String(posAwaitingAction.length),
      trend: 'review needed',
      trendUp: false,
      icon: <Package className="w-4 h-4" />,
    },
    {
      label: 'Docs Awaiting Review',
      value: String(docsAwaitingReview.length),
      trend: 'compliance',
      trendUp: false,
      icon: <FileCheck2 className="w-4 h-4" />,
    },
    {
      label: 'Compliance Gate',
      value: complianceGateCleared + '/' + ALL_DEMO_BRANDS.length + ' cleared',
      trend: complianceGateBlocked > 0 ? complianceGateBlocked + ' blocked' : 'all clear',
      trendUp: complianceGateBlocked === 0,
      icon: <ShieldCheck className="w-4 h-4" />,
    },
    {
      label: 'Renewals Due ≤60d',
      value: String(renewalsSoon.length),
      trend: 'contracts',
      trendUp: false,
      icon: <Users className="w-4 h-4" />,
    },
    {
      label: 'Top Category',
      value: topCategories[0]?.[0] ?? '—',
      trend: `£${Math.round(topCategories[0]?.[1] ?? 0).toLocaleString()} PO value`,
      trendUp: true,
      icon: <Boxes className="w-4 h-4" />,
    },
  ];

  /** Detail payloads behind each card — the data the number is made of. */
  const CARD_DETAILS: Record<
    string,
    { title: string; subtitle: string; rows: string[][]; headers: string[] }
  > = {
    'Total Portfolio Revenue': {
      title: 'Portfolio Revenue — shipment ledger',
      subtitle: `£${totalRevenue.toLocaleString()} across ${shipments.length} shipments`,
      headers: ['Reference', 'Title', 'Carrier', 'Status', 'Value (£)'],
      rows: shipments.map((s) => [
        s.reference,
        s.title,
        s.carrier.toUpperCase(),
        STATUS_LABELS[s.status],
        s.value.toLocaleString(),
      ]),
    },
    'Active Brands': {
      title: 'Active Brands — canonical demo dataset',
      subtitle: `${activeBrands} brands covering all approved categories`,
      headers: ['Brand', 'Category', 'Nation', 'Track'],
      rows: ALL_DEMO_BRANDS.map((b) => [b.name, b.category, b.nation, b.track.replace(/_/g, ' ')]),
    },
    'Total Shipments': {
      title: 'All Shipments',
      subtitle: `${totalShipments} shipments in the aggregate manifest`,
      headers: ['Reference', 'Title', 'Origin', 'Destination', 'CBM'],
      rows: shipments.map((s) => [s.reference, s.title, s.origin, s.destination, String(s.cbm)]),
    },
    'Pipeline Leads': {
      title: 'Pipeline Leads — sourcing engine output',
      subtitle: `${totalLeads} leads · ${leads.filter((l) => l.priority === 'High').length} high priority`,
      headers: ['Company', 'Persona', 'Region', 'Priority', 'Fit'],
      rows: leads.map((l) => [l.company, l.persona, l.region.toUpperCase(), l.priority, String(l.fitScore)]),
    },
    'DHL Shipments': {
      title: 'DHL Shipments',
      subtitle: 'Air courier lane detail',
      headers: ['Reference', 'Title', 'Status', 'Value (£)'],
      rows: shipments
        .filter((s) => s.carrier === 'dhl')
        .map((s) => [s.reference, s.title, STATUS_LABELS[s.status], s.value.toLocaleString()]),
    },
    'FedEx Shipments': {
      title: 'FedEx Shipments',
      subtitle: 'Air courier lane detail',
      headers: ['Reference', 'Title', 'Status', 'Value (£)'],
      rows: shipments
        .filter((s) => s.carrier === 'fedex')
        .map((s) => [s.reference, s.title, STATUS_LABELS[s.status], s.value.toLocaleString()]),
    },
    'BAK Heavy Freight': {
      title: 'BAK Logistics — heavy freight',
      subtitle: 'Sea/air freight lane detail',
      headers: ['Reference', 'Title', 'Status', 'Value (£)'],
      rows: shipments
        .filter((s) => s.carrier === 'bak')
        .map((s) => [s.reference, s.title, STATUS_LABELS[s.status], s.value.toLocaleString()]),
    },
    'Verified Documents': {
      title: 'Verified Compliance Documents',
      subtitle: 'Customs & trade documentation cleared for trading',
      headers: ['Brand', 'Document', 'Region'],
      rows: complianceDocsAgg.filter((d) => d.status === 'verified').map((d) => [
        d.brand,
        d.docType,
        d.region,
      ]),
    },
    'Pending Review': {
      title: 'Documents Pending Review',
      subtitle: 'These block first PO until verified',
      headers: ['Brand', 'Document', 'Region'],
      rows: complianceDocsAgg.filter((d) => d.status === 'pending').map((d) => [
        d.brand,
        d.docType,
        d.region,
      ]),
    },
    /* ── §Stage-19.7 overview drill-downs ── */
    'Revenue This Month': {
      title: 'Revenue This Month — commissions',
      subtitle: `£${revenueThisMonth.toLocaleString()} in ${monthPrefix}`,
      headers: ['PO', 'Brand', 'Status', 'Commission (£)'],
      rows: commissionsAll
        .filter((c) => (c.createdAt ?? '').startsWith(monthPrefix))
        .map((c) => [
          c.purchaseOrderId,
          brandNameById.get(c.brandId) ?? c.brandId,
          c.status,
          c.commissionAmount.toFixed(2),
        ]),
    },
    'POs Awaiting Action': {
      title: 'Purchase Orders Awaiting Action',
      subtitle: `${posAwaitingAction.length} POs in received / under review`,
      headers: ['PO', 'Brand', 'Status', 'Value (£)'],
      rows: posAwaitingAction.map((p) => [
        p.poNumber,
        brandNameById.get(p.brandId) ?? p.brandId,
        p.status.replace(/_/g, ' '),
        p.poValue.toLocaleString(),
      ]),
    },
    'Docs Awaiting Review': {
      title: 'Compliance Docs Awaiting Review',
      subtitle: `${docsAwaitingReview.length} document(s)`,
      headers: ['Brand', 'Type', 'Status'],
      rows: docsAwaitingReview.map((d) => [
        brandNameById.get(d.brandId) ?? d.brandId,
        d.type.replace(/_/g, ' '),
        d.status.replace(/_/g, ' '),
      ]),
    },
    'Renewals Due ≤60d': {
      title: 'Upcoming Contract Renewals',
      subtitle: `${renewalsSoon.length} contract(s) inside the renewal window`,
      headers: ['Brand', 'Type', 'Renewal', 'Urgency'],
      rows: renewalsSoon.map(({ c, urgency }) => [
        brandNameById.get(c.brandId) ?? c.brandId,
        c.type.replace(/_/g, ' '),
        c.renewalDate,
        urgency === 'expired' ? 'EXPIRED' : `≤ ${urgency.replace('d', '')} days`,
      ]),
    },
    'Top Category': {
      title: 'Category Performance — PO value by category',
      subtitle: 'All approved categories, ranked',
      headers: ['Category', 'PO Value (£)'],
      rows: topCategories.map(([cat, v]) => [cat, Math.round(v).toLocaleString()]),
    },
  };

  const detail = openCard ? CARD_DETAILS[openCard] : null;



  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* §Stage-19.7 — Business Overview (real metrics, all clickable) */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-3">Business Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {OVERVIEW_CARDS.map((c) => (
            <StatCard
              key={c.label}
              label={c.label}
              value={c.value}
              trend={c.trend}
              trendUp={c.trendUp}
              icon={c.icon}
              onClick={() => setOpenCard(c.label)}
            />
          ))}
        </div>
      </div>

      {/* Department Switcher */}
      <div className="flex items-center gap-2 flex-wrap">
        {DEPARTMENTS.map((dept) => {
          const Icon = dept.icon;
          const isActive = activeDept === dept.id;
          return (
            <button
              key={dept.id}
              onClick={() => setActiveDept(dept.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brass-500 text-white'
                  : 'bg-ink-850 text-zinc-400 hover:text-white border border-white/[0.06]'
              )}
            >
              <Icon className="w-4 h-4" />
              {dept.label}
            </button>
          );
        })}
      </div>

      {/* Business Development Department */}
      {activeDept === 'business_dev' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              label="Total Portfolio Revenue"
              onClick={() => setOpenCard('Total Portfolio Revenue')}
              value={`£${(totalRevenue / 1000).toFixed(0)}k`}
              trend="↗ 12.5%"
              trendUp
              icon={<DollarSign className="w-4 h-4" />}
            />
            <StatCard
              label="Active Brands"
              onClick={() => setOpenCard('Active Brands')}
              value={String(activeBrands)}
              trend="↗ 3 new"
              trendUp
              icon={<Users className="w-4 h-4" />}
            />
            <StatCard
              label="Total Shipments"
              onClick={() => setOpenCard('Total Shipments')}
              value={String(totalShipments)}
              trend="↗ 8%"
              trendUp
              icon={<Truck className="w-4 h-4" />}
            />
            <StatCard
              label="Pipeline Leads"
              onClick={() => setOpenCard('Pipeline Leads')}
              value={String(totalLeads)}
              trend="↗ 5 new"
              trendUp
              icon={<Package className="w-4 h-4" />}
            />
          </div>

          <Card
            title="Business Development — Brand Sourcing"
            subtitle="Global brand sourcing engine — US, EU, Africa & Canada"
            action={
              <Badge className="bg-brass-500/15 text-brass-400 border-brass-500/20">
                <Sparkles className="w-3 h-3" />
                Active
              </Badge>
            }
          >
            <div className="p-5">
              <p className="text-sm text-zinc-400 mb-4">
                Sourcing scans global trade directories to source high-intent brands
                across four target segments. Navigate to Marketing Hub for the
                configuration wizard and live lead table.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {campaigns.map((c) => (
                  <div
                    key={c.id}
                    className="bg-ink-900 border border-white/[0.06] rounded-lg p-3"
                  >
                    <div className="text-xs font-medium text-white truncate">{c.name}</div>
                    <div className="text-lg font-bold text-white mt-1">{c.leads}</div>
                    <div className="text-[10px] text-zinc-500">leads · £{c.costPerLead}/lead</div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Logistics Coordination Department */}
      {activeDept === 'logistics' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              label="DHL Shipments"
              onClick={() => setOpenCard('DHL Shipments')}
              value={String(shipments.filter((s) => s.carrier === 'dhl').length)}
              trend="Air courier"
              trendUp
              icon={<Plane />}
            />
            <StatCard
              label="FedEx Shipments"
              onClick={() => setOpenCard('FedEx Shipments')}
              value={String(shipments.filter((s) => s.carrier === 'fedex').length)}
              trend="Air courier"
              trendUp
              icon={<Plane />}
            />
            <StatCard
              label="BAK Heavy Freight"
              onClick={() => setOpenCard('BAK Heavy Freight')}
              value={String(shipments.filter((s) => s.carrier === 'bak').length)}
              trend="Sea/air freight"
              trendUp
              icon={<Ship />}
            />
          </div>

          <Card
            title="Carrier Volume Comparison"
            subtitle="Courier (DHL/FedEx) vs Heavy Freight (BAK Logistics)"
          >
            <div className="p-4 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={CARRIER_VOLUME_DATA}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="courierGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#A855F7" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#A855F7" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="freightGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis
                    dataKey="month"
                    stroke="#52525b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#52525b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#121214',
                      border: '1px solid #ffffff10',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} iconType="circle" />
                  <Area
                    type="monotone"
                    dataKey="courier"
                    name="Courier (DHL/FedEx)"
                    stroke="#A855F7"
                    strokeWidth={2.5}
                    fill="url(#courierGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="freight"
                    name="Heavy Freight (BAK)"
                    stroke="#F59E0B"
                    strokeWidth={2.5}
                    fill="url(#freightGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Aggregate Container Manifest" subtitle="All active shipments across carriers">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-xs text-zinc-500">
                    <th className="text-left font-medium px-5 py-3">Reference</th>
                    <th className="text-left font-medium px-4 py-3">Title</th>
                    <th className="text-left font-medium px-4 py-3">Carrier</th>
                    <th className="text-left font-medium px-4 py-3">Origin</th>
                    <th className="text-center font-medium px-4 py-3">CBM</th>
                    <th className="text-left font-medium px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {shipments.map((s) => (
                    <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3.5 text-xs font-mono text-zinc-400">{s.reference}</td>
                      <td className="px-4 py-3.5 text-sm font-medium text-white">{s.title}</td>
                      <td className="px-4 py-3.5 text-xs uppercase text-zinc-400">{s.carrier}</td>
                      <td className="px-4 py-3.5 text-xs text-zinc-400">{s.origin}</td>
                      <td className="px-4 py-3.5 text-center text-sm text-zinc-300">{s.cbm}</td>
                      <td className="px-4 py-3.5">
                        <Badge className={STATUS_COLORS[s.status]}>
                          {STATUS_LABELS[s.status]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Compliance & Trade Legals Department */}
      {activeDept === 'compliance' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              label="Verified Documents"
              onClick={() => setOpenCard('Verified Documents')}
              value={String(complianceDocsAgg.filter((d) => d.status === 'verified').length)}
              trend="Compliant"
              trendUp
              icon={<ShieldCheck className="w-4 h-4" />}
            />
            <StatCard
              label="Pending Review"
              onClick={() => setOpenCard('Pending Review')}
              value={String(complianceDocsAgg.filter((d) => d.status === 'pending').length)}
              trend="Awaiting"
              trendUp={false}
              icon={<FileCheck2 className="w-4 h-4" />}
            />
            <StatCard
              label="Total Brands"
              onClick={() => setOpenCard('Active Brands')}
              value={String(complianceDocsAgg.length)}
              trend="Global"
              trendUp
              icon={<Boxes className="w-4 h-4" />}
            />
          </div>

          <Card
            title="Customs & Trade Documentation"
            subtitle="EORI, EIN, and ZIMRA customs clearance verification"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-xs text-zinc-500">
                    <th className="text-left font-medium px-5 py-3">Brand</th>
                    <th className="text-left font-medium px-4 py-3">Document Type</th>
                    <th className="text-left font-medium px-4 py-3">Region</th>
                    <th className="text-center font-medium px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {complianceDocsAgg.map((doc) => (
                    <tr key={doc.brand} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3.5 text-sm font-medium text-white">{doc.brand}</td>
                      <td className="px-4 py-3.5 text-xs text-zinc-400">{doc.docType}</td>
                      <td className="px-4 py-3.5 text-xs text-zinc-400">{doc.region}</td>
                      <td className="px-4 py-3.5 text-center">
                        <Badge
                          className={cn(
                            'text-[10px]',
                            doc.status === 'verified'
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'
                              : 'bg-amber-500/15 text-amber-300 border-amber-500/20'
                          )}
                        >
                          {doc.status === 'verified' ? 'Verified' : 'Pending Review'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* §Stage-17 fix #4 — card drill-down modal */}
      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpenCard(null)}
        >
          <div
            className="bg-ink-900 border border-white/[0.08] rounded-xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between p-5 border-b border-white/[0.06]">
              <div>
                <h3 className="text-sm font-semibold text-white">{detail.title}</h3>
                <p className="text-xs text-zinc-500 mt-0.5">{detail.subtitle}</p>
              </div>
              <button
                onClick={() => setOpenCard(null)}
                className="text-zinc-500 hover:text-white text-lg leading-none px-2"
                aria-label="Close detail view"
              >
                ×
              </button>
            </div>
            <div className="overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-ink-900">
                  <tr className="border-b border-white/[0.06] text-xs text-zinc-500">
                    {detail.headers.map((h) => (
                      <th key={h} className="text-left font-medium px-4 py-2.5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                      {detail.rows.map((row, i) => (
                        <tr key={i} className="text-zinc-300">
                          {row.map((cell, j) => {
                            const isPo = typeof cell === 'string' && /^PO-\d+/.test(cell);
                            const isBrand = j === 1 && typeof cell === 'string' && cell.length > 0 && !cell.startsWith('PO-');
                            return (
                              <td key={j} className="px-4 py-2 text-xs truncate max-w-[220px]">
                                {isPo && onNavigate ? (
                                  <button onClick={() => { setOpenCard(null); onNavigate('purchase_orders_admin'); }}
                                    className="text-brass-400 hover:text-brass-300 underline underline-offset-2 transition-colors">{cell}</button>
                                ) : isBrand && onNavigate ? (
                                  <button onClick={() => { setOpenCard(null); onNavigate('crm'); }}
                                    className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors">{cell}</button>
                                ) : <span>{cell}</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
              </table>
              {detail.rows.length === 0 && (
                <p className="text-xs text-zinc-600 text-center py-8">No underlying records.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  trend,
  trendUp,
  icon,
  onClick,
}: {
  label: string;
  value: string;
  trend: string;
  trendUp: boolean;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Card
      className={cn(
        'p-5',
        onClick && 'cursor-pointer hover:border-white/[0.14] transition-colors'
      )}
    >
      <button
        type="button"
        disabled={!onClick}
        onClick={onClick}
        className="w-full text-left disabled:cursor-default"
      >
        <div className="flex items-start justify-between mb-3">
          <span className="text-xs text-zinc-500 font-medium">{label}</span>
          <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-zinc-400">
            {icon}
          </div>
        </div>
        <div className="flex items-end justify-between">
          <span className="text-2xl font-bold text-white tracking-tight">{value}</span>
          <span
            className={cn(
              'flex items-center gap-1 text-xs font-medium',
              trendUp ? 'text-emerald-400' : 'text-crimson-accent'
            )}
          >
            <TrendingUp className="w-3 h-3" />
            {trend}
          </span>
        </div>
        {onClick && (
          <span className="mt-2 block text-[10px] text-zinc-600 group-hover:text-zinc-400">
            Click for underlying data →
          </span>
        )}
      </button>
    </Card>
  );
}
