import { ArrowRight } from 'lucide-react';
import {
  ConsoleBarChart,
  ConsoleProgressTrack,
  ConsoleTrendChart,
  NoticeBanner,
  SectionCard,
  formatGbp,
  type ChartDatum,
} from '@/next/components/ConsoleCharts';
import {
  ConsoleTable,
  EmptyStateBlock,
  ErrorStateBlock,
  InlineStatus,
  LoadingRows,
  MetricStrip,
  PageHeader,
  type ConsoleColumn,
  type MetricItem,
  type SemanticTone,
} from '@/next/components/ConsolePrimitives';

export interface OverviewRevenueRow {
  id: string;
  label: string;
  gbp: number;
  source: string;
}

export interface OverviewPipelineStage {
  id: string;
  label: string;
  count: number;
  sharePct: number;
}

export interface OverviewFulfilmentRow {
  id: string;
  ref: string;
  title: string;
  meta: string;
  status: string;
  tone: SemanticTone;
  targetView: string;
}

export interface OverviewMessageRow {
  id: string;
  subject: string;
  meta: string;
  badgeLabel: string;
  tone: SemanticTone;
}

export interface AdminOverviewViewProps {
  loading: boolean;
  error: boolean;
  partialError: boolean;
  onRetry: () => void;
  onNavigate?: (view: string) => void;
  headerSummary: string;
  awaitingActionCount: number;
  awaitingValueGbp: number;
  shipmentsCount: number;
  renewalsCount: number;
  moneyMetrics: MetricItem[];
  operationalMetrics: MetricItem[];
  volumeMetrics: MetricItem[];
  pipelineTotal: number;
  pipelineStages: OverviewPipelineStage[];
  revenueStreams: OverviewRevenueRow[];
  totalRevenueGbp: number;
  monthlyCostGbp: number;
  providerCount: number;
  grossProfitGbp: number;
  marginPct: number;
  provisional: boolean;
  orderValueTrend: ChartDatum[];
  orderCountTrend: ChartDatum[];
  valueByBrand: ChartDatum[];
  docStatusBreakdown: { label: string; value: number }[];
  totalDocs: number;
  shipmentStatusBreakdown: { label: string; value: number }[];
  carrierBreakdown: { label: string; value: number }[];
  shipmentExceptions: number;
  delayedShipments: number;
  valueInMotionGbp: number;
  fulfilmentRows: OverviewFulfilmentRow[];
  recentMessages: OverviewMessageRow[];
}

export function AdminOverviewView({
  loading,
  error,
  partialError,
  onRetry,
  onNavigate,
  headerSummary,
  awaitingActionCount,
  awaitingValueGbp,
  shipmentsCount,
  renewalsCount,
  moneyMetrics,
  operationalMetrics,
  volumeMetrics,
  pipelineTotal,
  pipelineStages,
  revenueStreams,
  totalRevenueGbp,
  monthlyCostGbp,
  providerCount,
  grossProfitGbp,
  marginPct,
  provisional,
  orderValueTrend,
  orderCountTrend,
  valueByBrand,
  docStatusBreakdown,
  totalDocs,
  shipmentStatusBreakdown,
  carrierBreakdown,
  shipmentExceptions,
  delayedShipments,
  valueInMotionGbp,
  fulfilmentRows,
  recentMessages,
}: AdminOverviewViewProps) {
  if (loading) {
    return (
      <div className="space-y-6" data-testid="dashboard-loading" aria-busy="true">
        <PageHeader title="Overview" description="Loading operational state…" />
        <MetricStrip items={[]} loading columns={4} />
        <LoadingRows rows={5} label="Loading portfolio overview…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6" data-testid="dashboard-error">
        <PageHeader title="Overview" description="Operational state could not be loaded." />
        <ErrorStateBlock
          title="Overview records unavailable"
          message="Could not read purchase orders, brands, or compliance documents from the canonical store."
          onRetry={onRetry}
        />
      </div>
    );
  }

  const revenueColumns: ConsoleColumn<OverviewRevenueRow>[] = [
    { key: 'label', header: 'Revenue stream', render: (r) => <span className="font-medium text-zinc-950">{r.label}</span> },
    { key: 'gbp', header: 'Recorded', align: 'right', render: (r) => formatGbp(r.gbp) },
    { key: 'source', header: 'Basis', hideOnMobile: true, render: (r) => <span className="text-[12px] text-zinc-600">{r.source}</span> },
  ];

  const fulfilmentColumns: ConsoleColumn<OverviewFulfilmentRow>[] = [
    { key: 'ref', header: 'Reference', render: (r) => <span className="font-mono text-[12px] font-medium text-zinc-950">{r.ref}</span> },
    {
      key: 'title',
      header: 'Consignment / Order',
      render: (r) => (
        <div>
          <div className="font-medium text-zinc-950">{r.title}</div>
          <div className="text-[12px] text-zinc-500">{r.meta}</div>
        </div>
      ),
    },
    { key: 'status', header: 'Status', align: 'right', render: (r) => <InlineStatus label={r.status} tone={r.tone} /> },
  ];

  return (
    <div className="space-y-6" data-testid="dashboard-loaded">
      <PageHeader
        title="Overview"
        description={headerSummary}
        meta={
          <>
            <InlineStatus
              label={awaitingActionCount > 0 ? `${awaitingActionCount} awaiting action` : 'Queue clear'}
              tone={awaitingActionCount > 0 ? 'warning' : 'success'}
            />
            <span className="font-mono tabular-nums">{formatGbp(awaitingValueGbp)} open PO value</span>
            <span className="font-mono tabular-nums">{shipmentsCount} shipments in motion</span>
            <span className="font-mono tabular-nums">{renewalsCount} renewals in window</span>
          </>
        }
        actions={
          onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('purchase_orders_admin')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-zinc-950 text-white text-[12px] font-medium hover:bg-zinc-800 whitespace-nowrap"
            >
              Review purchase orders
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )
        }
      />

      {partialError && (
        <NoticeBanner
          tone="warning"
          title="Some supporting records could not be read"
          message="Available canonical records are shown below. Check Monitoring for source health."
        />
      )}

      <SectionCard
        title="Business position"
        description="Hero money metrics derived live from purchase orders, operating cost summary, and the commerce invoice ledger."
      >
        <MetricStrip items={moneyMetrics} columns={4} />
        <div className="pt-2 border-t border-zinc-200">
          <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-500 mb-3">
            Operations
          </div>
          <MetricStrip items={operationalMetrics} columns={4} />
        </div>
        <div className="pt-2 border-t border-zinc-200">
          <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-500 mb-3">
            Portfolio volume
          </div>
          <MetricStrip items={volumeMetrics} columns={4} />
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard
            title="Order pipeline"
            description="Distribution of every purchase order across canonical status families."
            actions={
              onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('purchase_orders_admin')}
                  className="text-[12px] font-medium text-[#C2410C] hover:underline"
                >
                  Open queue
                </button>
              )
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {pipelineStages.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onNavigate?.('purchase_orders_admin')}
                  className="text-left border border-zinc-200 rounded-md p-3 hover:bg-zinc-50 transition-colors"
                >
                  <div className="text-[11px] uppercase tracking-[0.06em] text-zinc-500">{s.label}</div>
                  <div className="mt-1 text-[20px] font-semibold font-mono tabular-nums text-zinc-950">
                    {s.count}
                  </div>
                  <div className="mt-2">
                    <ConsoleProgressTrack value={s.count} max={Math.max(1, pipelineTotal)} />
                  </div>
                  <div className="mt-1 text-[11px] font-mono tabular-nums text-zinc-500">{s.sharePct}% of POs</div>
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Financial performance"
            description="Canonical revenue streams and monthly operating cost base."
            actions={
              onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('super_admin')}
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-[#C2410C] hover:underline"
                >
                  Open Accounting <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )
            }
          >
            <ConsoleTable rows={revenueStreams} columns={revenueColumns} rowKey={(r) => r.id} pageSize={10} />
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-zinc-200 pt-4 text-[12px]">
              <div className="flex items-center justify-between border border-zinc-200 rounded-md px-3 py-2">
                <span className="text-zinc-600">Total recorded revenue</span>
                <span className="font-mono font-semibold tabular-nums text-zinc-950">
                  {formatGbp(totalRevenueGbp)}
                </span>
              </div>
              <div className="flex items-center justify-between border border-zinc-200 rounded-md px-3 py-2">
                <span className="text-zinc-600">Monthly cost base ({providerCount} providers)</span>
                <span className="font-mono font-semibold tabular-nums text-zinc-950">
                  {formatGbp(monthlyCostGbp)}
                </span>
              </div>
              <div className="flex items-center justify-between border border-zinc-200 rounded-md px-3 py-2">
                <span className="text-zinc-600">Gross profit {provisional ? '(provisional)' : ''}</span>
                <span className="font-mono font-semibold tabular-nums text-zinc-950">
                  {formatGbp(grossProfitGbp)} ({marginPct}%)
                </span>
              </div>
            </div>
          </SectionCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SectionCard
              title="Order value by month"
              description="Purchase-order GBP value across latest six months."
            >
              <ConsoleTrendChart
                data={orderValueTrend}
                emptyText="No dated purchase orders recorded yet."
              />
              {orderCountTrend.length > 0 && (
                <div className="mt-3 pt-3 border-t border-zinc-200 flex flex-wrap gap-3 text-[11px] font-mono text-zinc-500">
                  {orderCountTrend.map((pt) => (
                    <span key={pt.label}>
                      {pt.label}: {pt.value} POs
                    </span>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Value by brand"
              description="Top brands ranked by purchase-order value."
            >
              <ConsoleBarChart
                data={valueByBrand}
                emptyText="No purchase-order value recorded yet."
              />
            </SectionCard>
          </div>

          <SectionCard
            title="Fulfilment in motion"
            description="Live consignments or accepted POs awaiting dispatch."
            actions={
              onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('logistics')}
                  className="text-[12px] font-medium text-[#C2410C] hover:underline"
                >
                  Open Logistics
                </button>
              )
            }
          >
            {fulfilmentRows.length === 0 ? (
              <EmptyStateBlock
                title="Nothing in fulfilment right now"
                description="Accepted and ready-to-fulfil purchase orders or active consignments appear here."
              />
            ) : (
              <ConsoleTable
                rows={fulfilmentRows}
                columns={fulfilmentColumns}
                rowKey={(r) => r.id}
                onRowClick={(r) => onNavigate?.(r.targetView)}
                pageSize={10}
              />
            )}
          </SectionCard>
        </div>

        <aside className="space-y-6">
          <SectionCard
            title="Compliance posture"
            description={`${totalDocs} document record(s)`}
            actions={
              onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('compliance')}
                  className="text-[12px] font-medium text-[#C2410C] hover:underline"
                >
                  Open
                </button>
              )
            }
          >
            {docStatusBreakdown.length === 0 ? (
              <p className="text-[12px] text-zinc-500">No compliance documents recorded yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {docStatusBreakdown.map((seg) => (
                  <li key={seg.label}>
                    <ConsoleProgressTrack
                      value={seg.value}
                      max={Math.max(1, totalDocs)}
                      label={`${seg.label} (${seg.value})`}
                    />
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            title="Logistics status"
            description={`${shipmentsCount} total consignment(s)`}
            actions={
              onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('logistics')}
                  className="text-[12px] font-medium text-[#C2410C] hover:underline"
                >
                  Open
                </button>
              )
            }
          >
            {shipmentsCount === 0 ? (
              <p className="text-[12px] text-zinc-500">
                No consignments yet. Distribution appears once a PO moves into dispatch.
              </p>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.06em] text-zinc-500 mb-2">
                    By status
                  </div>
                  <ul className="space-y-1.5 text-[12px]">
                    {shipmentStatusBreakdown.map((s) => (
                      <li key={s.label} className="flex items-center justify-between">
                        <span className="text-zinc-700">{s.label}</span>
                        <span className="font-mono tabular-nums font-medium text-zinc-950">{s.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="border-t border-zinc-200 pt-3">
                  <div className="text-[11px] uppercase tracking-[0.06em] text-zinc-500 mb-2">
                    By carrier
                  </div>
                  <ul className="space-y-1.5 text-[12px]">
                    {carrierBreakdown.map((c) => (
                      <li key={c.label} className="flex items-center justify-between">
                        <span className="text-zinc-700">{c.label}</span>
                        <span className="font-mono tabular-nums font-medium text-zinc-950">{c.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="border-t border-zinc-200 pt-3 text-[12px] text-zinc-600 font-mono tabular-nums">
                  {shipmentExceptions} exception(s) · {delayedShipments} delayed · {formatGbp(valueInMotionGbp)} in motion
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Recent communications"
            actions={
              onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('messages')}
                  className="text-[12px] font-medium text-[#C2410C] hover:underline"
                >
                  Open Messages
                </button>
              )
            }
          >
            {recentMessages.length === 0 ? (
              <p className="text-[12px] text-zinc-500">No recent communications recorded.</p>
            ) : (
              <ul className="divide-y divide-zinc-200">
                {recentMessages.map((m) => (
                  <li key={m.id} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <InlineStatus label={m.badgeLabel} tone={m.tone} />
                      <button
                        type="button"
                        onClick={() => onNavigate?.('messages')}
                        className="text-[11px] font-medium text-[#C2410C] hover:underline"
                      >
                        Open
                      </button>
                    </div>
                    <p className="mt-1 text-[13px] font-medium text-zinc-950 line-clamp-2">{m.subject}</p>
                    <p className="mt-0.5 text-[11px] text-zinc-500">{m.meta}</p>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
