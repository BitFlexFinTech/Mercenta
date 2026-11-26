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
  ConsoleHeader,
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
        <ConsoleHeader title="Overview" description="Loading operational state…" />
        <MetricStrip items={[]} loading columns={4} />
        <LoadingRows rows={5} label="Loading portfolio overview…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6" data-testid="dashboard-error">
        <ConsoleHeader title="Overview" description="Operational state could not be loaded." />
        <ErrorStateBlock
          title="Overview records unavailable"
          message="Could not read purchase orders, brands, or compliance documents from the canonical store."
          onRetry={onRetry}
        />
      </div>
    );
  }

  const revenueColumns: ConsoleColumn<OverviewRevenueRow>[] = [
    { key: 'label', header: 'Revenue stream', render: (r) => <span className="font-medium text-ink-950">{r.label}</span> },
    { key: 'gbp', header: 'Recorded', align: 'right', render: (r) => formatGbp(r.gbp) },
    { key: 'source', header: 'Basis', hideOnMobile: true, render: (r) => <span className="text-ds-label text-faint">{r.source}</span> },
  ];

  const fulfilmentColumns: ConsoleColumn<OverviewFulfilmentRow>[] = [
    { key: 'ref', header: 'Reference', render: (r) => <span className="font-mono text-ds-label font-medium text-ink-950">{r.ref}</span> },
    {
      key: 'title',
      header: 'Consignment / Order',
      render: (r) => (
        <div>
          <div className="font-medium text-ink-950">{r.title}</div>
          <div className="text-ds-label text-faint">{r.meta}</div>
        </div>
      ),
    },
    { key: 'status', header: 'Status', align: 'right', render: (r) => <InlineStatus label={r.status} tone={r.tone} /> },
  ];

  return (
    <div className="space-y-6" data-testid="dashboard-loaded">
      <ConsoleHeader
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
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-ds-md bg-ink-950 text-on-dark text-ds-label font-medium hover:bg-ink-800 whitespace-nowrap"
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
        <div className="pt-2 border-t border-hairline">
          <div className="text-ds-micro font-medium uppercase tracking-[0.06em] text-faint mb-3">
            Operations
          </div>
          <MetricStrip items={operationalMetrics} columns={4} />
        </div>
        <div className="pt-2 border-t border-hairline">
          <div className="text-ds-micro font-medium uppercase tracking-[0.06em] text-faint mb-3">
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
                  className="text-ds-label font-medium text-[#C2410C] hover:underline"
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
                  className="text-left border border-hairline rounded-ds-md p-3 hover:bg-surface transition-colors"
                >
                  <div className="text-ds-micro uppercase tracking-[0.06em] text-faint">{s.label}</div>
                  <div className="mt-1 text-ds-page font-semibold font-mono tabular-nums text-ink-950">
                    {s.count}
                  </div>
                  <div className="mt-2">
                    <ConsoleProgressTrack value={s.count} max={Math.max(1, pipelineTotal)} />
                  </div>
                  <div className="mt-1 text-ds-micro font-mono tabular-nums text-faint">{s.sharePct}% of POs</div>
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
                  className="inline-flex items-center gap-1 text-ds-label font-medium text-[#C2410C] hover:underline"
                >
                  Open Accounting <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )
            }
          >
            <ConsoleTable rows={revenueStreams} columns={revenueColumns} rowKey={(r) => r.id} pageSize={10} />
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-hairline pt-4 text-ds-label">
              <div className="flex items-center justify-between border border-hairline rounded-ds-md px-3 py-2">
                <span className="text-faint">Total recorded revenue</span>
                <span className="font-mono font-semibold tabular-nums text-ink-950">
                  {formatGbp(totalRevenueGbp)}
                </span>
              </div>
              <div className="flex items-center justify-between border border-hairline rounded-ds-md px-3 py-2">
                <span className="text-faint">Monthly cost base ({providerCount} providers)</span>
                <span className="font-mono font-semibold tabular-nums text-ink-950">
                  {formatGbp(monthlyCostGbp)}
                </span>
              </div>
              <div className="flex items-center justify-between border border-hairline rounded-ds-md px-3 py-2">
                <span className="text-faint">Gross profit {provisional ? '(provisional)' : ''}</span>
                <span className="font-mono font-semibold tabular-nums text-ink-950">
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
                <div className="mt-3 pt-3 border-t border-hairline flex flex-wrap gap-3 text-ds-micro font-mono text-faint">
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
                  className="text-ds-label font-medium text-[#C2410C] hover:underline"
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
                  className="text-ds-label font-medium text-[#C2410C] hover:underline"
                >
                  Open
                </button>
              )
            }
          >
            {docStatusBreakdown.length === 0 ? (
              <p className="text-ds-label text-faint">No compliance documents recorded yet.</p>
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
                  className="text-ds-label font-medium text-[#C2410C] hover:underline"
                >
                  Open
                </button>
              )
            }
          >
            {shipmentsCount === 0 ? (
              <p className="text-ds-label text-faint">
                No consignments yet. Distribution appears once a PO moves into dispatch.
              </p>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="text-ds-micro uppercase tracking-[0.06em] text-faint mb-2">
                    By status
                  </div>
                  <ul className="space-y-1.5 text-ds-label">
                    {shipmentStatusBreakdown.map((s) => (
                      <li key={s.label} className="flex items-center justify-between">
                        <span className="text-secondary">{s.label}</span>
                        <span className="font-mono tabular-nums font-medium text-ink-950">{s.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="border-t border-hairline pt-3">
                  <div className="text-ds-micro uppercase tracking-[0.06em] text-faint mb-2">
                    By carrier
                  </div>
                  <ul className="space-y-1.5 text-ds-label">
                    {carrierBreakdown.map((c) => (
                      <li key={c.label} className="flex items-center justify-between">
                        <span className="text-secondary">{c.label}</span>
                        <span className="font-mono tabular-nums font-medium text-ink-950">{c.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="border-t border-hairline pt-3 text-ds-label text-faint font-mono tabular-nums">
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
                  className="text-ds-label font-medium text-[#C2410C] hover:underline"
                >
                  Open Messages
                </button>
              )
            }
          >
            {recentMessages.length === 0 ? (
              <p className="text-ds-label text-faint">No recent communications recorded.</p>
            ) : (
              <ul className="divide-y divide-hairline-06">
                {recentMessages.map((m) => (
                  <li key={m.id} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <InlineStatus label={m.badgeLabel} tone={m.tone} />
                      <button
                        type="button"
                        onClick={() => onNavigate?.('messages')}
                        className="text-ds-micro font-medium text-[#C2410C] hover:underline"
                      >
                        Open
                      </button>
                    </div>
                    <p className="mt-1 text-ds-label font-medium text-ink-950 line-clamp-2">{m.subject}</p>
                    <p className="mt-0.5 text-ds-micro text-faint">{m.meta}</p>
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
