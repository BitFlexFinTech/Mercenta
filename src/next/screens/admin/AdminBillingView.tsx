import {
  EmptyStateBlock,
  ErrorStateBlock,
  InlineStatus,
  LoadingRows,
  MetricStrip,
  PageHeader,
  SlideOverDrawer,
  type MetricItem,
} from '@/next/components/ConsolePrimitives';
import { ConsoleTabs, NoticeBanner, SectionCard, formatGbp } from '@/next/components/ConsoleCharts';

export type BillingFocus = 'all' | 'subscriptions' | 'commissions' | 'deductions';

export interface RemittanceStatementDetail {
  brandName: string;
  statementNumber: string;
  periodStart: string;
  periodEnd: string;
  grossTotal: number;
  commissionTotal: number;
  deductionsTotal: number;
  netPaid: number;
  lines: {
    poNumber: string;
    grossValue: number;
    commission: number;
    deductions: { type: string; amountGbp: number }[];
    net: number;
  }[];
}

export interface AdminBillingBrandCard {
  brandId: string;
  brandName: string;
  planTier?: string;
  subStatus?: string;
  invoiceNumber: string;
  invoiceSubtotalGbp: number;
  invoiceNotes: string[];
  shippingMarginGbp: number;
  deductionsTotalGbp: number;
  hasCommissions: boolean;
  remittance: RemittanceStatementDetail;
}

export interface AdminBillingViewProps {
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  stripeLive: boolean;
  focus: BillingFocus;
  onFocusChange: (focus: BillingFocus) => void;
  totalBrands: number;
  periodInvoicedGbp: number;
  activeSubscriptionsCount: number;
  shippingMarginGbp: number;
  totalDeductionsGbp: number;
  deductionsPostedCount: number;
  brands: AdminBillingBrandCard[];
  onExportCommissionCsv: (brandId: string) => void;
  selectedStatement: RemittanceStatementDetail | null;
  onSelectStatement: (stmt: RemittanceStatementDetail | null) => void;
}

export function AdminBillingView({
  loading,
  error,
  onRetry,
  stripeLive,
  focus,
  onFocusChange,
  totalBrands,
  periodInvoicedGbp,
  activeSubscriptionsCount,
  shippingMarginGbp,
  totalDeductionsGbp,
  deductionsPostedCount,
  brands,
  onExportCommissionCsv,
  selectedStatement,
  onSelectStatement,
}: AdminBillingViewProps) {
  const metrics: MetricItem[] = [
    {
      id: 'billing-invoiced',
      label: 'Invoiced (period)',
      value: formatGbp(periodInvoicedGbp, 2),
      context: `${totalBrands} brands · Aug 2026`,
      active: focus === 'all',
      onClick: () => onFocusChange('all'),
      testId: 'billing-metric-invoiced',
    },
    {
      id: 'billing-subs',
      label: 'Active subscriptions',
      value: String(activeSubscriptionsCount),
      context: stripeLive ? 'Stripe live' : 'Stripe (Mock) — subscription only',
      active: focus === 'subscriptions',
      onClick: () => onFocusChange('subscriptions'),
      testId: 'billing-metric-subs',
    },
    {
      id: 'billing-shipping',
      label: 'Shipping margin',
      value: formatGbp(shippingMarginGbp, 2),
      context: 'Brand-billed price less carrier cost',
      active: focus === 'commissions',
      onClick: () => onFocusChange('commissions'),
      testId: 'billing-metric-shipping',
    },
    {
      id: 'billing-deductions',
      label: 'Deductions',
      value: formatGbp(totalDeductionsGbp, 2),
      context: `${deductionsPostedCount} posted`,
      active: focus === 'deductions',
      onClick: () => onFocusChange('deductions'),
      testId: 'billing-metric-deductions',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing & Remittance"
        description="Brand subscriptions, commission invoices, and remittance statements. Gross PO value − commission − deductions = net paid per payout period."
        meta={
          <>
            <span className="font-mono">Period 2026-08-01 → 2026-08-31</span>
            <span className="font-mono">Showing {brands.length} of {totalBrands} brands</span>
          </>
        }
      />

      {!stripeLive && (
        <NoticeBanner
          tone="warning"
          title="Stripe Mock Mode"
          message="Subscription IDs are simulated and nothing is billed. Payoneer / Wise are the payout rails; Stripe is never a payout rail."
        />
      )}

      {error && <ErrorStateBlock message={error} onRetry={onRetry} />}

      <ConsoleTabs
        tabs={[
          { id: 'all', label: 'All brands', count: totalBrands },
          { id: 'subscriptions', label: 'Subscriptions', count: activeSubscriptionsCount },
          { id: 'commissions', label: 'Commission' },
          { id: 'deductions', label: 'Deductions', count: deductionsPostedCount },
        ]}
        value={focus}
        onChange={onFocusChange}
        ariaLabel="Billing focus filters"
      />

      <MetricStrip items={metrics} loading={loading} columns={4} />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_290px] gap-6">
        <div className="min-w-0 space-y-6">
          {loading ? (
            <LoadingRows rows={6} label="Loading billing records…" />
          ) : brands.length === 0 ? (
            <EmptyStateBlock
              title="No brands match"
              description="No brands match the selected billing focus filter."
              actionLabel="Show all brands"
              onAction={() => onFocusChange('all')}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {brands.map((b) => (
                  <div
                    key={b.brandId}
                    className="border border-zinc-200 bg-white rounded-md flex flex-col justify-between"
                  >
                    <div className="px-4 py-3 border-b border-zinc-200 flex items-center justify-between gap-2">
                      <span className="text-[14px] font-semibold text-zinc-950 truncate">
                        {b.brandName}
                      </span>
                      {b.planTier && (
                        <InlineStatus
                          label={b.planTier}
                          tone={b.subStatus === 'active' ? 'success' : 'neutral'}
                        />
                      )}
                    </div>
                    <div className="p-4 space-y-2 text-[13px]">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Invoice ({b.invoiceNumber})</span>
                        <span className="font-mono font-medium text-zinc-950">
                          {formatGbp(b.invoiceSubtotalGbp, 2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Shipping margin</span>
                        <span
                          className={`font-mono ${
                            b.shippingMarginGbp >= 0 ? 'text-emerald-800' : 'text-red-800'
                          }`}
                        >
                          {formatGbp(b.shippingMarginGbp, 2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Deductions</span>
                        <span className="font-mono text-red-800">
                          {formatGbp(b.deductionsTotalGbp, 2)}
                        </span>
                      </div>
                      {b.invoiceNotes.length > 0 && (
                        <p className="text-[11px] text-zinc-500 pt-1">{b.invoiceNotes.join(' · ')}</p>
                      )}
                    </div>
                    <div className="px-4 py-2.5 border-t border-zinc-200 bg-zinc-50/40 flex justify-end">
                      <button
                        type="button"
                        disabled={!b.hasCommissions}
                        onClick={() => onExportCommissionCsv(b.brandId)}
                        className="text-[12px] font-medium text-zinc-700 hover:text-zinc-950 disabled:opacity-40"
                      >
                        Export CSV
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <SectionCard
                title="Remittance statements — current period"
                description="Gross PO value − commission − deductions = net paid per payout period."
              >
                <div className="divide-y divide-zinc-200">
                  {brands.map((b) => {
                    const empty = b.remittance.lines.length === 0;
                    return (
                      <div
                        key={b.brandId}
                        className="py-3 flex flex-wrap items-center justify-between gap-3"
                      >
                        <div>
                          <div className="text-[13px] font-medium text-zinc-950">{b.brandName}</div>
                          <div className="text-[12px] font-mono text-zinc-500">
                            {b.remittance.statementNumber} · net paid{' '}
                            <span className={empty ? 'text-zinc-400' : 'text-emerald-800 font-semibold'}>
                              {formatGbp(b.remittance.netPaid, 2)}
                            </span>
                            {empty ? ' · no settled POs' : ` · ${b.remittance.lines.length} settled PO(s)`}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={empty}
                          onClick={() => onSelectStatement(b.remittance)}
                          className="text-[12px] font-medium text-[var(--mr-accent)] hover:underline disabled:opacity-40"
                        >
                          View statement
                        </button>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            </>
          )}
        </div>

        <aside className="space-y-4">
          <SectionCard title="Period summary">
            <dl className="space-y-2 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-zinc-500">Brands</dt>
                <dd className="font-mono text-zinc-950">{totalBrands}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Invoiced</dt>
                <dd className="font-mono text-zinc-950">{formatGbp(periodInvoicedGbp, 2)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Shipping margin</dt>
                <dd className="font-mono text-zinc-950">{formatGbp(shippingMarginGbp, 2)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Deductions</dt>
                <dd className="font-mono text-zinc-950">{formatGbp(totalDeductionsGbp, 2)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Active subscriptions</dt>
                <dd className="font-mono text-zinc-950">{activeSubscriptionsCount}</dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard title="Payout rails">
            <p className="text-[12px] text-zinc-600 leading-relaxed">
              Payoneer is the default payout rail and Wise is secondary. Stripe bills flat
              subscriptions only. No payout leaves Mercenta without explicit human approval.
            </p>
          </SectionCard>
        </aside>
      </div>

      <SlideOverDrawer
        open={Boolean(selectedStatement)}
        onClose={() => onSelectStatement(null)}
        title={selectedStatement ? `Statement ${selectedStatement.statementNumber}` : 'Remittance'}
        subtitle={
          selectedStatement
            ? `${selectedStatement.brandName} · ${selectedStatement.periodStart} → ${selectedStatement.periodEnd}`
            : undefined
        }
      >
        {selectedStatement && (
          <div className="space-y-5 text-[13px]">
            <dl className="grid grid-cols-2 gap-3 border border-zinc-200 rounded p-4 bg-zinc-50">
              <div>
                <dt className="text-[11px] uppercase text-zinc-500">Gross PO value</dt>
                <dd className="font-mono font-medium text-zinc-950">
                  {formatGbp(selectedStatement.grossTotal, 2)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase text-zinc-500">Commission</dt>
                <dd className="font-mono text-zinc-800">
                  −{formatGbp(selectedStatement.commissionTotal, 2)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase text-zinc-500">Deductions</dt>
                <dd className="font-mono text-red-800">
                  −{formatGbp(selectedStatement.deductionsTotal, 2)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase text-zinc-500">Net paid</dt>
                <dd className="font-mono font-semibold text-emerald-800">
                  {formatGbp(selectedStatement.netPaid, 2)}
                </dd>
              </div>
            </dl>

            <div className="space-y-2">
              <h3 className="font-semibold text-zinc-950">Settled PO breakdown</h3>
              <ul className="divide-y divide-zinc-200 border border-zinc-200 rounded">
                {selectedStatement.lines.map((line) => (
                  <li key={line.poNumber} className="p-3 space-y-1">
                    <div className="flex justify-between font-mono text-[12px]">
                      <span className="font-semibold text-zinc-950">{line.poNumber}</span>
                      <span className="font-semibold text-emerald-800">
                        Net {formatGbp(line.net, 2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[12px] text-zinc-500 font-mono">
                      <span>Gross {formatGbp(line.grossValue, 2)}</span>
                      <span>Commission −{formatGbp(line.commission, 2)}</span>
                    </div>
                    {line.deductions.length > 0 && (
                      <div className="text-[11px] text-red-700 font-mono">
                        Deductions:{' '}
                        {line.deductions
                          .map((d) => `${d.type.replace(/_/g, ' ')} −${formatGbp(d.amountGbp, 2)}`)
                          .join(', ')}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
}
