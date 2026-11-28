import { Download } from 'lucide-react';
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
} from '@/next/components/ConsolePrimitives';
import {
  ConsoleBarChart,
  NoticeBanner,
  SectionCard,
  formatGbp,
} from '@/next/components/ConsoleCharts';
import { deductionTypeLabel } from '@/config/deductions';
import { deductionStatusPresentation } from '@/lib/statusPresentation';
import type { Deduction } from '@/types';

export interface BrandReportsViewProps {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  brandName: string;
  period: 30 | 60 | 90;
  onChangePeriod: (p: 30 | 60 | 90) => void;
  hasPos: boolean;
  asinRate: number;
  confirmedLines: number;
  totalLines: number;
  oosCount: number;
  totalSkus: number;
  openPoQty: number;
  openPoCount: number;
  canonicalOnHand?: number;
  netPpm: number;
  dispatchSeries: { month: string; units: number }[];
  salesSeries: { month: string; value: number }[];
  deductions: Deduction[];
  onExportCsv: () => void;
}

export function BrandReportsView({
  loading,
  error,
  onRetry,
  brandName,
  period,
  onChangePeriod,
  hasPos,
  asinRate,
  confirmedLines,
  totalLines,
  oosCount,
  totalSkus,
  openPoQty,
  openPoCount,
  canonicalOnHand,
  netPpm,
  dispatchSeries,
  salesSeries,
  deductions,
  onExportCsv,
}: BrandReportsViewProps) {
  const metrics: MetricItem[] = [
    {
      id: 'asin',
      label: 'ASIN confirmation rate',
      value: `${asinRate}%`,
      context: totalLines > 0 ? `${confirmedLines}/${totalLines} PO lines` : 'No lines',
    },
    {
      id: 'oos',
      label: 'SKUs marked OOS',
      value: String(oosCount),
      context: `of ${totalSkus} catalog SKUs`,
    },
    {
      id: 'open',
      label: 'Open PO units',
      value: openPoQty.toLocaleString('en-GB'),
      context: `${openPoCount} open PO(s)`,
    },
    {
      id: 'onhand',
      label: 'Canonical on-hand',
      value: canonicalOnHand === undefined ? '—' : canonicalOnHand.toLocaleString('en-GB'),
      context: 'From movement ledger',
    },
    {
      id: 'netppm',
      label: 'Net PPM proxy',
      value: formatGbp(netPpm),
      context: 'Per 1,000 units shipped',
    },
  ];

  const deductionCols: ConsoleColumn<Deduction>[] = [
    { key: 'date', header: 'Date', render: (d) => <span className="font-mono">{d.date}</span> },
    {
      key: 'po',
      header: 'PO',
      mobilePrimary: true,
      render: (d) => (
        <div>
          <div className="font-mono font-medium text-zinc-950">{d.purchaseOrderId}</div>
          <div className="text-[12px] text-zinc-600">{deductionTypeLabel(d.type)}</div>
        </div>
      ),
    },
    { key: 'amt', header: 'Amount', align: 'right', render: (d) => formatGbp(d.amountGbp, 2) },
    {
      key: 'status',
      header: 'Status',
      render: (d) => {
        const pres = deductionStatusPresentation(d.status);
        return <InlineStatus label={pres.label} tone={pres.tone} />;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description={`Operational confirmation rates, ledger on-hand inventory, and dispatch volume for ${brandName || 'your brand'}.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded border border-zinc-200 p-0.5 bg-white text-[12px]">
              {([30, 60, 90] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onChangePeriod(p)}
                  className={`px-2.5 py-1 rounded ${
                    period === p ? 'bg-zinc-950 text-white font-medium' : 'text-zinc-600'
                  }`}
                >
                  Last {p}d
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={!hasPos}
              onClick={onExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-zinc-300 bg-white text-[12px] font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              Export CSV
            </button>
          </div>
        }
      />

      {error && <ErrorStateBlock message={error} onRetry={onRetry} />}
      {!error && loading && <LoadingRows rows={5} label="Loading reports…" />}

      {!error && !loading && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {metrics.map((m) => (
              <div key={m.id} className="border border-zinc-200 bg-white rounded-md p-4">
                <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-500">
                  {m.label}
                </div>
                <div className="mt-1.5 text-[20px] font-semibold text-zinc-950 tabular-nums font-mono">
                  {m.value}
                </div>
                <div className="mt-1 text-[12px] text-zinc-600 truncate">{m.context}</div>
              </div>
            ))}
          </div>

          {!hasPos ? (
            <EmptyStateBlock
              title={`No purchase orders in the last ${period} days`}
              description="Accepted and shipped purchase orders in the selected window populate dispatch charts."
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SectionCard title="Monthly Dispatched Units">
                <ConsoleBarChart
                  data={dispatchSeries.map((d) => ({ label: d.month, value: d.units }))}
                  formatValue={(v) => `${Math.round(v).toLocaleString('en-GB')} u`}
                />
              </SectionCard>
              <SectionCard title="Monthly Shipped Wholesale Value">
                <ConsoleBarChart
                  data={salesSeries.map((s) => ({ label: s.month, value: s.value }))}
                  formatValue={(v) => formatGbp(v)}
                />
              </SectionCard>
            </div>
          )}

          <SectionCard title="Tenant Deductions Summary">
            <NoticeBanner
              tone="info"
              message="Manage open deduction disputes on the Sales Analytics & Deductions page."
            />
            <div className="mt-3">
              <ConsoleTable
                rows={deductions}
                columns={deductionCols}
                rowKey={(d) => d.id}
                emptyTitle="No deductions recorded"
                emptyDescription="Deductions appear here whenever raised on your POs."
              />
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}
