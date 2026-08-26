import { useState } from 'react';
import { useApp } from '@/store';
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
import { CARRIER_VOLUME_DATA } from '@/mockData';
import { STATUS_COLORS, STATUS_LABELS } from '@/types';
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

const COMPLIANCE_DOCS = [
  { brand: 'Sweet Pea Botanicals', docType: 'ZIMRA CD1 Form', region: 'Africa', status: 'verified' },
  { brand: 'Lone Star Organics', docType: 'US FCC/FDA Exemption', region: 'North America', status: 'pending' },
  { brand: 'Alpen Naturals GmbH', docType: 'CE Declaration', region: 'Europe', status: 'verified' },
  { brand: 'Highland Tea Estates', docType: 'ZIMRA CD1 Form', region: 'Africa', status: 'pending' },
  { brand: 'Bella Pelle Skincare', docType: 'CE Declaration', region: 'Europe', status: 'verified' },
  { brand: 'Maple Wellness Co', docType: 'EIN Registration', region: 'North America', status: 'pending' },
];

export function AdminDashboard({ department }: { department?: AdminDepartment }) {
  const { shipments, leads, campaigns, products } = useApp();
  const [activeDept, setActiveDept] = useState<AdminDepartment>(department || 'business_dev');

  const totalRevenue = shipments.reduce((sum, s) => sum + s.value, 0);
  const activeBrands = 12;
  const totalShipments = shipments.length;
  const totalLeads = leads.length;

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
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
                  ? 'bg-neon-500 text-white'
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
              value={`£${(totalRevenue / 1000).toFixed(0)}k`}
              trend="↗ 12.5%"
              trendUp
              icon={<DollarSign className="w-4 h-4" />}
            />
            <StatCard
              label="Active Brands"
              value={String(activeBrands)}
              trend="↗ 3 new"
              trendUp
              icon={<Users className="w-4 h-4" />}
            />
            <StatCard
              label="Total Shipments"
              value={String(totalShipments)}
              trend="↗ 8%"
              trendUp
              icon={<Truck className="w-4 h-4" />}
            />
            <StatCard
              label="Pipeline Leads"
              value={String(totalLeads)}
              trend="↗ 5 new"
              trendUp
              icon={<Package className="w-4 h-4" />}
            />
          </div>

          <Card
            title="Business Development — Explee AI Client Finder"
            subtitle="Global brand sourcing engine — US, EU, Africa & Canada"
            action={
              <Badge className="bg-neon-500/15 text-neon-400 border-neon-500/20">
                <Sparkles className="w-3 h-3" />
                Active
              </Badge>
            }
          >
            <div className="p-5">
              <p className="text-sm text-zinc-400 mb-4">
                The Explee AI agent continuously scans global trade directories to source
                high-intent brands across four target segments. Navigate to the full Explee
                Client Finder via the sidebar for the complete configuration wizard and live
                lead table.
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
              value={String(shipments.filter((s) => s.carrier === 'dhl').length)}
              trend="Air courier"
              trendUp
              icon={<Plane />}
            />
            <StatCard
              label="FedEx Shipments"
              value={String(shipments.filter((s) => s.carrier === 'fedex').length)}
              trend="Air courier"
              trendUp
              icon={<Plane />}
            />
            <StatCard
              label="BAK Heavy Freight"
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
              value={String(COMPLIANCE_DOCS.filter((d) => d.status === 'verified').length)}
              trend="Compliant"
              trendUp
              icon={<ShieldCheck className="w-4 h-4" />}
            />
            <StatCard
              label="Pending Review"
              value={String(COMPLIANCE_DOCS.filter((d) => d.status === 'pending').length)}
              trend="Awaiting"
              trendUp={false}
              icon={<FileCheck2 className="w-4 h-4" />}
            />
            <StatCard
              label="Total Brands"
              value={String(COMPLIANCE_DOCS.length)}
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
                  {COMPLIANCE_DOCS.map((doc) => (
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
    </div>
  );
}

function StatCard({
  label,
  value,
  trend,
  trendUp,
  icon,
}: {
  label: string;
  value: string;
  trend: string;
  trendUp: boolean;
  icon: React.ReactNode;
}) {
  return (
    <Card className="p-5">
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
    </Card>
  );
}
