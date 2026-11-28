import { ArrowRight } from 'lucide-react';
import { ConsoleBarChart, SectionCard, formatGbp, type ChartDatum } from '@/next/components/ConsoleCharts';
import {
  ConsoleTable,
  ErrorStateBlock,
  InlineStatus,
  LoadingRows,
  MetricStrip,
  PageHeader,
  type ConsoleColumn,
  type MetricItem,
  type SemanticTone,
} from '@/next/components/ConsolePrimitives';

export interface OverviewPoRow {
  id: string;
  poNumber: string;
  orderDateLabel: string;
  unitCount: number;
  poValue: number;
  statusLabel: string;
  statusTone: SemanticTone;
}

export interface OverviewShipmentRow {
  id: string;
  poNumber: string;
  carrier: string;
  reference: string;
  route: string;
  statusLabel: string;
  statusTone: SemanticTone;
  hasException: boolean;
}

export interface OverviewCommissionRow {
  id: string;
  poNumber: string;
  poValue: number;
  commissionAmount: number;
  netShare: number;
  statusLabel: string;
  statusTone: SemanticTone;
  createdAt: string;
}

export interface OverviewComplianceItem {
  label: string;
  present: boolean;
  statusLabel: string;
}

export interface BrandOverviewViewProps {
  brandName: string;
  contractStatusLabel: string;
  trackLabel: string;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
  earningsMetrics: MetricItem[];
  accountMetrics: MetricItem[];
  monthlySeries: ChartDatum[];
  openPos: OverviewPoRow[];
  activeShipments: OverviewShipmentRow[];
  commissions: OverviewCommissionRow[];
  complianceGateCleared: boolean;
  complianceSummaryLabel: string;
  complianceDocs: OverviewComplianceItem[];
  recentMessages: { id: string; subject: string; direction: string; at: string }[];
  onNavigate: (viewId: string, poNumber?: string) => void;
}

export function BrandOverviewView(props: BrandOverviewViewProps) {
  const {
    brandName,
    contractStatusLabel,
    trackLabel,
    isLoading,
    isError,
    errorMessage,
    onRetry,
    earningsMetrics,
    accountMetrics,
    monthlySeries,
    openPos,
    activeShipments,
    commissions,
    complianceGateCleared,
    complianceSummaryLabel,
    complianceDocs,
    recentMessages,
    onNavigate,
  } = props;

  if (isError) {
    return (
      <div className="space-y-4">
        <PageHeader title={`${brandName} Overview`} />
        <ErrorStateBlock message={errorMessage} onRetry={onRetry} />
      </div>
    );
  }

  const commissionColumns: ConsoleColumn<OverviewCommissionRow>[] = [
    {
      key: 'poNumber',
      header: 'Purchase order',
      mobilePrimary: true,
      render: (c) => <span className="font-mono font-medium text-ink-950">{c.poNumber}</span>,
    },
    {
      key: 'poValue',
      header: 'PO Value',
      align: 'right',
      render: (c) => formatGbp(c.poValue, 2),
    },
    {
      key: 'commission',
      header: 'Mercenta Fee',
      align: 'right',
      hideOnMobile: true,
      render: (c) => <span className="text-ink-600">−{formatGbp(c.commissionAmount, 2)}</span>,
    },
    {
      key: 'netShare',
      header: 'Net Share',
      align: 'right',
      render: (c) => <span className="font-semibold text-ink-950">{formatGbp(c.netShare, 2)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => <InlineStatus label={c.statusLabel} tone={c.statusTone} />,
    },
    {
      key: 'createdAt',
      header: 'Accrued',
      align: 'right',
      hideOnMobile: true,
      render: (c) => <span className="font-mono text-[12px] text-ink-600">{c.createdAt.slice(0, 10)}</span>,
    },
  ];

  return (
    <div className="space-y-6" data-testid="brand-dashboard-loaded">
      <PageHeader
        title={`${brandName} — Overview`}
        description="Observe your tenant-scoped earnings, active purchase orders, in-flight shipments, and compliance standing. Actionable tasks live in Tasks & Deadlines."
        meta={
          <>
            <span>Contract: {contractStatusLabel}</span>
            <span>Track: {trackLabel}</span>
            <InlineStatus
              label={complianceGateCleared ? 'Compliance cleared' : 'Compliance gated'}
              tone={complianceGateCleared ? 'success' : 'warning'}
            />
          </>
        }
        actions={
          <>
            <button
              type="button"
              onClick={() => onNavigate('purchase_orders')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[var(--mr-accent)] text-on-dark text-[12px] font-medium hover:bg-[var(--mr-accent-600)]"
            >
              Purchase Orders
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('work')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-hairline-strong bg-surface-raised text-[12px] font-medium text-ink-900 hover:bg-surface"
            >
              Tasks & Deadlines
            </button>
          </>
        }
      />

      {isLoading ? (
        <LoadingRows rows={6} label="Loading brand overview…" />
      ) : (
        <>
          <div className="space-y-2">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.06em] text-faint">
              Your earnings position
            </h2>
            <MetricStrip items={earningsMetrics} columns={4} />
          </div>

          <div className="space-y-2">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.06em] text-faint">
              Account telemetry
            </h2>
            <MetricStrip items={accountMetrics} columns={4} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">
            <div className="space-y-6 min-w-0">
              <SectionCard
                title="Earnings by accrual month"
                description="Derived directly from canonical commissions ledger (net brand share)."
              >
                <ConsoleBarChart
                  data={monthlySeries}
                  emptyText="Too little dated commission history yet to plot a monthly trend."
                />
              </SectionCard>

              <SectionCard
                title="Open purchase orders"
                description="Active tenant POs awaiting acknowledgement or dispatch."
                actions={
                  <button
                    type="button"
                    onClick={() => onNavigate('purchase_orders')}
                    className="text-[12px] font-medium text-[var(--mr-accent)] hover:underline"
                  >
                    Open full PO queue
                  </button>
                }
              >
                {openPos.length === 0 ? (
                  <p className="text-[12px] text-faint">No open purchase orders right now.</p>
                ) : (
                  <ul className="divide-y divide-hairline-06">
                    {openPos.map((po) => (
                      <li key={po.id} className="py-2.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => onNavigate('purchase_orders', po.poNumber)}
                            className="font-mono text-[14px] font-medium text-ink-950 hover:text-[var(--mr-accent)]"
                          >
                            {po.poNumber}
                          </button>
                          <div className="text-[12px] text-faint font-mono">
                            {po.orderDateLabel} · {po.unitCount} units
                          </div>
                        </div>
                        <div className="text-right shrink-0 space-y-0.5">
                          <div className="font-mono text-[14px] tabular-nums font-medium text-ink-950">
                            {formatGbp(po.poValue)}
                          </div>
                          <InlineStatus label={po.statusLabel} tone={po.statusTone} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>

              <SectionCard
                title="Fulfilment in motion"
                actions={
                  <button
                    type="button"
                    onClick={() => onNavigate('logistics')}
                    className="text-[12px] font-medium text-[var(--mr-accent)] hover:underline"
                  >
                    Open Logistics Hub
                  </button>
                }
              >
                {activeShipments.length === 0 ? (
                  <p className="text-[12px] text-faint">No active consignments currently in motion.</p>
                ) : (
                  <ul className="divide-y divide-hairline-06">
                    {activeShipments.map((s) => (
                      <li key={s.id} className="py-2.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => onNavigate('logistics', s.poNumber)}
                            className="font-mono text-[14px] font-medium text-ink-950 hover:text-[var(--mr-accent)]"
                          >
                            {s.reference} ({s.carrier})
                          </button>
                          <div className="text-[12px] text-faint">
                            PO {s.poNumber} · {s.route}
                          </div>
                        </div>
                        <InlineStatus
                          label={s.hasException ? `${s.statusLabel} · Exception` : s.statusLabel}
                          tone={s.hasException ? 'danger' : s.statusTone}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>

              <SectionCard
                title="Payouts & commissions"
                description="Net payouts computed through canonical Mercenta fee and track math."
              >
                <ConsoleTable
                  rows={commissions}
                  columns={commissionColumns}
                  rowKey={(c) => c.id}
                  emptyTitle="No commissions accrued yet"
                  emptyDescription="Commission records appear once purchase orders settle."
                />
              </SectionCard>
            </div>

            <aside className="space-y-4">
              <SectionCard
                title="Compliance & catalogue gate"
                description={complianceSummaryLabel}
                testId="compliance-summary"
                actions={
                  <button
                    type="button"
                    onClick={() => onNavigate('compliance')}
                    className="text-[12px] font-medium text-[var(--mr-accent)] hover:underline"
                  >
                    Manage
                  </button>
                }
              >
                <ul className="space-y-2 text-[12px]">
                  {complianceDocs.map((d) => (
                    <li key={d.label} className="flex items-center justify-between gap-2">
                      <span className="text-secondary truncate">{d.label}</span>
                      <InlineStatus label={d.statusLabel} tone={d.present ? 'success' : 'warning'} />
                    </li>
                  ))}
                </ul>
              </SectionCard>

              <SectionCard
                title="Recent messages"
                actions={
                  <button
                    type="button"
                    onClick={() => onNavigate('team')}
                    className="text-[12px] font-medium text-[var(--mr-accent)] hover:underline"
                  >
                    Inbox
                  </button>
                }
              >
                {recentMessages.length === 0 ? (
                  <p className="text-[12px] text-faint">No messages recorded for your tenant.</p>
                ) : (
                  <ul className="divide-y divide-hairline-06 text-[12px]">
                    {recentMessages.map((m) => (
                      <li key={m.id} className="py-2">
                        <div className="font-medium text-ink-950 truncate">{m.subject}</div>
                        <div className="text-[11px] font-mono text-faint">
                          {m.direction} · {m.at.slice(0, 10)}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
