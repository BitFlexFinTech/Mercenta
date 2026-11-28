import { useState } from 'react';
import {
  ConsoleTable,
  EmptyStateBlock,
  ErrorStateBlock,
  InlineStatus,
  LoadingRows,
  MetricStrip,
  SlideOverDrawer,
  type ConsoleColumn,
  type MetricItem,
} from '@/next/components/ConsolePrimitives';
import { ConsolePageHeader } from '@/next/components/ConsolePageHeader';
import {
  ConsoleTrendChart,
  NoticeBanner,
  SectionCard,
  formatGbp,
} from '@/next/components/ConsoleCharts';
import {
  DEDUCTION_DISPUTE_WINDOW,
  DEDUCTION_TAXONOMY,
  deductionTypeLabel,
} from '@/config/deductions';
import { deductionStatusPresentation } from '@/lib/statusPresentation';
import type { Deduction } from '@/types';

export interface SkuStatRow {
  sku: string;
  name: string;
  units: number;
  revenue: number;
}

export interface BrandAnalyticsViewProps {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  brandName: string;
  hasPos: boolean;
  totalValue: number;
  acceptedCount: number;
  avgOrder: number;
  totalUnits: number;
  activeSkuCount: number;
  monthlySeries: { month: string; revenue: number; volume: number }[];
  skuStats: SkuStatRow[];
  deductions: Deduction[];
  disputeNotice: string | null;
  disputeError: string | null;
  onSubmitDispute: (deductionId: string, notes: string) => Promise<boolean>;
}

export function BrandAnalyticsView({
  loading,
  error,
  onRetry,
  brandName,
  hasPos,
  totalValue,
  acceptedCount,
  avgOrder,
  totalUnits,
  activeSkuCount,
  monthlySeries,
  skuStats,
  deductions,
  disputeNotice,
  disputeError,
  onSubmitDispute,
}: BrandAnalyticsViewProps) {
  const [chartTab, setChartTab] = useState<'revenue' | 'volume'>('revenue');
  const [disputingId, setDisputingId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const metrics: MetricItem[] = [
    {
      id: 'revenue',
      label: 'Accepted PO revenue',
      value: formatGbp(totalValue),
      context: `${acceptedCount} accepted POs`,
    },
    {
      id: 'avg',
      label: 'Average order',
      value: formatGbp(avgOrder),
      context: 'Per accepted PO',
    },
    {
      id: 'units',
      label: 'Units shipped / ordered',
      value: totalUnits.toLocaleString('en-GB'),
      context: `${activeSkuCount} active SKUs`,
    },
    {
      id: 'deductions',
      label: 'Total deductions',
      value: formatGbp(
        deductions.reduce((s, d) => s + d.amountGbp, 0),
        2
      ),
      context: `${deductions.length} posted ledger item(s)`,
    },
  ];

  const skuColumns: ConsoleColumn<SkuStatRow>[] = [
    {
      key: 'name',
      header: 'Product / SKU',
      mobilePrimary: true,
      render: (s) => (
        <div>
          <div className="font-medium text-ink-950">{s.name}</div>
          <div className="text-[11px] font-mono text-faint">{s.sku}</div>
        </div>
      ),
    },
    {
      key: 'units',
      header: 'Confirmed Units',
      align: 'right',
      render: (s) => s.units.toLocaleString('en-GB'),
    },
    {
      key: 'revenue',
      header: 'Wholesale Value',
      align: 'right',
      render: (s) => formatGbp(s.revenue),
    },
  ];

  const deductionColumns: ConsoleColumn<Deduction>[] = [
    {
      key: 'date',
      header: 'Date',
      render: (d) => <span className="font-mono text-[12px] text-ink-600">{d.date}</span>,
    },
    {
      key: 'po',
      header: 'PO',
      mobilePrimary: true,
      render: (d) => (
        <div>
          <div className="font-mono font-medium text-ink-950">{d.purchaseOrderId}</div>
          <div className="text-[12px] text-ink-600">{deductionTypeLabel(d.type)}</div>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (d) => formatGbp(d.amountGbp, 2),
    },
    {
      key: 'status',
      header: 'Status',
      render: (d) => {
        const pres = deductionStatusPresentation(d.status);
        return (
          <InlineStatus
            label={`${pres.label}${d.simulated ? ' (sim)' : ''}`}
            tone={pres.tone}
            dataStatus={pres.dataStatus}
          />
        );
      },
    },
    {
      key: 'action',
      header: 'Dispute',
      align: 'right',
      render: (d) =>
        d.status === 'open' && !d.dispute ? (
          <button
            type="button"
            data-tour="deductions-dispute-btn"
            onClick={() => {
              setDisputingId(d.id);
              setNotes('');
            }}
            className="px-2.5 py-1 rounded bg-[var(--mr-accent)] text-on-dark text-[12px] font-medium hover:bg-[var(--mr-accent-600)]"
          >
            Dispute
          </button>
        ) : (
          <span className="text-[12px] text-faint">
            {d.dispute?.outcome ? `Outcome: ${d.dispute.outcome}` : d.dispute ? 'Submitted' : '—'}
          </span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        title="Sales Analytics"
        description={`Wholesale order performance, top SKUs, and tenant deductions ledger for ${brandName || 'your brand'}.`}
      />

      <MetricStrip items={metrics} columns={4} loading={loading} />

      {error && <ErrorStateBlock message={error} onRetry={onRetry} />}
      {!error && loading && <LoadingRows rows={5} label="Loading sales analytics…" />}

      {!error && !loading && !hasPos && (
        <EmptyStateBlock
          title="No purchase orders recorded yet"
          description="Accepted retail-channel POs will populate revenue and SKU velocity curves here."
        />
      )}

      {!error && !loading && hasPos && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SectionCard
            title={chartTab === 'revenue' ? 'Monthly Revenue Trend' : 'Monthly Unit Volume'}
            actions={
              <div className="inline-flex rounded border border-hairline p-0.5 bg-surface text-[12px]">
                {(['revenue', 'volume'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setChartTab(t)}
                    className={`px-2.5 py-1 rounded ${
                      chartTab === t ? 'bg-surface-raised text-ink-950 font-medium shadow-xs' : 'text-ink-600'
                    }`}
                  >
                    {t === 'revenue' ? 'Revenue' : 'Volume'}
                  </button>
                ))}
              </div>
            }
          >
            <ConsoleTrendChart
              data={monthlySeries.map((m) => ({
                label: m.month,
                value: chartTab === 'revenue' ? m.revenue : m.volume,
              }))}
              formatValue={(v) =>
                chartTab === 'revenue' ? formatGbp(v) : `${Math.round(v).toLocaleString('en-GB')} u`
              }
            />
          </SectionCard>

          <ConsoleTable
            rows={skuStats}
            columns={skuColumns}
            rowKey={(s) => s.sku}
            emptyTitle="No confirmed SKU sales yet"
            emptyDescription="Top-performing SKUs appear after PO lines are acknowledged."
          />
        </div>
      )}

      <section data-tour="deductions-ledger" className="space-y-3">
        <NoticeBanner
          tone="info"
          title={DEDUCTION_TAXONOMY.heading}
          message={`${DEDUCTION_TAXONOMY.attributionNote} ${DEDUCTION_DISPUTE_WINDOW}`}
        />
        {disputeNotice && <NoticeBanner tone="success" message={disputeNotice} />}
        {disputeError && <NoticeBanner tone="danger" title="Dispute refused" message={disputeError} />}
        <ConsoleTable
          rows={deductions}
          columns={deductionColumns}
          rowKey={(d) => d.id}
          emptyTitle="No deductions posted"
          emptyDescription="Any shortage, compliance, or chargeback deductions applied to your POs appear here."
        />
      </section>

      <SlideOverDrawer
        open={Boolean(disputingId)}
        onClose={() => setDisputingId(null)}
        title="Submit Deduction Dispute"
        subtitle="Provide ASN / POD / carton evidence notes to challenge this deduction."
      >
        <div className="space-y-3 text-[12px]">
          <textarea
            rows={5}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe delivery proof, ASN timestamps, or photo verification…"
            className="w-full px-3 py-2 rounded border border-hairline-strong bg-surface-raised text-ink-950"
          />
          <button
            type="button"
            disabled={!notes.trim() || !disputingId}
            onClick={async () => {
              if (!disputingId) return;
              const ok = await onSubmitDispute(disputingId, notes);
              if (ok) {
                setDisputingId(null);
                setNotes('');
              }
            }}
            className="px-4 py-2 rounded bg-[var(--mr-accent)] text-on-dark font-medium hover:bg-[var(--mr-accent-600)] disabled:opacity-40"
          >
            Submit Dispute Evidence
          </button>
        </div>
      </SlideOverDrawer>
    </div>
  );
}
