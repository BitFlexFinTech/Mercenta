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
} from 'recharts';
import { REVENUE_DATA } from '@/mockData';
import { STAGE_LABELS, STAGE_ORDER, STATUS_COLORS, STATUS_LABELS } from '@/types';
import type { ShipmentStage } from '@/types';
import { TrendingUp, TrendingDown, Package, Truck, CheckCircle2, Boxes } from 'lucide-react';

export function BrandDashboard() {
  const { shipments, activityLogs } = useApp();
  const [timeFilter, setTimeFilter] = useState('6M');
  const [activeStage, setActiveStage] = useState<ShipmentStage | null>(null);

  const totalRevenue = shipments.reduce((sum, s) => sum + s.value, 0);
  const activeShipments = shipments.filter(
    (s) => s.status !== 'live_amazon'
  ).length;
  const complianceScore = 94.2;
  const totalCBM = shipments.reduce((sum, s) => sum + s.cbm, 0);

  const stageCounts = STAGE_ORDER.map((stage) => ({
    stage,
    count: shipments.filter((s) => s.stage === stage).length,
  }));

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          label="Revenue / Wholesale Purchases"
          value={`£${Math.round(totalRevenue / 1000)}k`}
          trend="↗ 12.5%"
          trendUp
          icon={<Boxes className="w-4 h-4" />}
        />
        <MetricCard
          label="Active Deals / Shipments"
          value={String(activeShipments)}
          trend="↗ 8%"
          trendUp
          icon={<Package className="w-4 h-4" />}
        />
        <MetricCard
          label="Win Rate / Compliance Score"
          value={`${complianceScore}%`}
          trend="↗ 2.1%"
          trendUp
          icon={<CheckCircle2 className="w-4 h-4" />}
        />
        <MetricCard
          label="Avg Deal / Volumetric Freight"
          value={`${totalCBM} CBM`}
          trend="↘ 3.2%"
          trendUp={false}
          icon={<Truck className="w-4 h-4" />}
        />
      </div>

      {/* Charts Block */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Chart */}
        <Card
          title="Revenue & Order Volume Trend"
          action={
            <div className="flex gap-1">
              {['6M', '1Y', 'All'].map((f) => (
                <button
                  key={f}
                  onClick={() => setTimeFilter(f)}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors',
                    timeFilter === f
                      ? 'bg-neon-500/20 text-neon-400'
                      : 'text-zinc-500 hover:text-zinc-300'
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          }
        >
          <div className="p-4 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={REVENUE_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#A855F7" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#A855F7" stopOpacity={0} />
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
                  tickFormatter={(v) => `£${v / 1000}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#121214',
                    border: '1px solid #ffffff10',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(v) => [`£${Number(v).toLocaleString()}`, 'Revenue']}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#A855F7"
                  strokeWidth={2.5}
                  fill="url(#revGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Pipeline Funnel */}
        <Card title="Supply Chain Pipeline Funnel" subtitle="African-to-UK logistics progression">
          <div className="p-4 space-y-2.5">
            {stageCounts.map((sc, i) => {
              const maxCount = Math.max(...stageCounts.map((s) => s.count), 1);
              const width = (sc.count / maxCount) * 100;
              const isLast = i === stageCounts.length - 1;
              return (
                <div
                  key={sc.stage}
                  className="group cursor-pointer"
                  onMouseEnter={() => setActiveStage(sc.stage)}
                  onMouseLeave={() => setActiveStage(null)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-600 font-mono w-4">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="text-xs font-medium text-zinc-300">
                        {STAGE_LABELS[sc.stage]}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-white">{sc.count}</span>
                  </div>
                  <div className="h-7 bg-ink-900 rounded-md overflow-hidden relative">
                    <div
                      className={cn(
                        'h-full rounded-md transition-all duration-500',
                        isLast ? 'bg-emerald-500/40' : 'bg-neon-500/30'
                      )}
                      style={{ width: `${Math.max(width, 8)}%` }}
                    />
                    {activeStage === sc.stage && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500">
                        {sc.count} shipment{sc.count !== 1 ? 's' : ''} at this stage
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Lower Tables Block */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Shipments */}
        <Card title="Recent Shipments / Deals">
          <div className="divide-y divide-white/[0.04]">
            {shipments.slice(0, 5).map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white truncate">
                    {s.title}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">{s.customer}</div>
                </div>
                <div className="text-sm font-semibold text-white mx-4">
                  £{Math.round(s.value / 1000)}k
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Badge className={STATUS_COLORS[s.status]}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {STATUS_LABELS[s.status]}
                  </Badge>
                  <span className="text-xs text-zinc-600 w-12 text-right">
                    {s.date}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Activity Feed */}
        <Card title="Activity Feed / Live Tracking Log">
          <div className="px-5 py-3 max-h-[320px] overflow-y-auto">
            <div className="relative">
              {activityLogs.map((log, i) => (
                <div key={log.id} className="flex gap-3 pb-4 last:pb-0 relative">
                  {i < activityLogs.length - 1 && (
                    <div className="absolute left-[7px] top-4 bottom-0 w-px bg-white/[0.06]" />
                  )}
                  <div
                    className={cn(
                      'w-3.5 h-3.5 rounded-full flex-shrink-0 mt-1 border-2 border-ink-850',
                      log.status === 'live_amazon'
                        ? 'bg-emerald-500'
                        : log.status === 'uk_customs_cleared'
                        ? 'bg-emerald-500/60'
                        : log.status === 'bak_depot'
                        ? 'bg-amber-500'
                        : 'bg-neon-500'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-white truncate">
                        {log.message}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-zinc-600">{log.timestamp}</span>
                      <span className="text-[10px] text-zinc-700">•</span>
                      <span className="text-[10px] text-zinc-600 font-mono">
                        {log.shipmentRef}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
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
          {trendUp ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          {trend}
        </span>
      </div>
    </Card>
  );
}
