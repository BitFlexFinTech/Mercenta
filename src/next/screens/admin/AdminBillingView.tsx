/**
 * §WAVE 3c (2026-11-25) — ADMIN billing (presentation).
 *
 * What it is: oversight of the money across the portfolio — commission accrued,
 * invoiced and paid per brand, the monthly subscription run-rate, and open
 * deductions. There is NO commission or invoice MUTATION in the data layer, so
 * this screen performs none and claims none; review and settlement stay with the
 * finance flows that own them.
 */
import {
  ConsoleHeader,
  ConsoleTable,
  ErrorStateBlock,
  InlineStatus,
  LoadingRows,
  MetricStrip,
  SlideOverDrawer,
  toSemanticTone,
  type ConsoleColumn,
  type MetricItem,
} from '@/next/components/ConsolePrimitives';
import { SectionCard, formatGbp } from '@/next/components/ConsoleCharts';
import { commissionStatusPresentation } from '@/lib/statusPresentation';
import type { Commission, Deduction, Subscription } from '@/types';

export interface AdminCommissionRow {
  commission: Commission;
  brandName: string;
}

export interface AdminSubscriptionRow {
  subscription: Subscription;
  brandName: string;
}

export interface AdminBillingViewProps {
  rows: AdminCommissionRow[];
  subscriptions: AdminSubscriptionRow[];
  totalCommissions: number;
  brandOptions: { id: string; name: string }[];
  statusOptions: string[];
  brandFilter: string;
  statusFilter: string;
  search: string;
  accruedValue: number;
  invoicedValue: number;
  paidValue: number;
  monthlyRunRate: number;
  openDeductionValue: number;
  selected: AdminCommissionRow | null;
  selectedDeductions: Deduction[];
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
  onChangeBrand: (value: string) => void;
  onChangeStatus: (value: string) => void;
  onChangeSearch: (value: string) => void;
  onSelect: (row: AdminCommissionRow | null) => void;
}

export function AdminBillingView({
  rows,
  subscriptions,
  totalCommissions,
  brandOptions,
  statusOptions,
  brandFilter,
  statusFilter,
  search,
  accruedValue,
  invoicedValue,
  paidValue,
  monthlyRunRate,
  openDeductionValue,
  selected,
  selectedDeductions,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  onChangeBrand,
  onChangeStatus,
  onChangeSearch,
  onSelect,
}: AdminBillingViewProps) {
  const metrics: MetricItem[] = [
    {
      id: 'accrued',
      label: 'Commission accrued',
      value: formatGbp(accruedValue),
      context: 'Earned, not yet invoiced',
      onClick: () => onChangeStatus('accrued'),
      active: statusFilter === 'accrued',
    },
    {
      id: 'invoiced',
      label: 'Awaiting payment',
      value: formatGbp(invoicedValue),
      context: 'Invoiced, not settled',
      onClick: () => onChangeStatus('invoiced'),
      active: statusFilter === 'invoiced',
    },
    {
      id: 'paid',
      label: 'Settled',
      value: formatGbp(paidValue),
      context: 'Paid to Mercenta',
      onClick: () => onChangeStatus('paid'),
      active: statusFilter === 'paid',
    },
    {
      id: 'subscriptions',
      label: 'Subscription run-rate',
      value: formatGbp(monthlyRunRate),
      context: 'Per month, active plans',
    },
  ];

  const columns: ConsoleColumn<AdminCommissionRow>[] = [
    {
      key: 'brand',
      header: 'Brand',
      mobilePrimary: true,
      render: (row) => (
        <div className="min-w-0">
          <div className="font-medium text-strong truncate">{row.brandName}</div>
          <div className="font-mono text-ds-label text-faint">{row.commission.purchaseOrderId}</div>
        </div>
      ),
    },
    {
      key: 'poValue',
      header: 'PO value',
      align: 'right',
      render: (row) => (
        <span className="tabular-nums">{formatGbp(row.commission.poValue)}</span>
      ),
    },
    {
      key: 'commission',
      header: 'Commission',
      align: 'right',
      render: (row) => (
        <span className="tabular-nums font-medium text-strong">
          {formatGbp(row.commission.commissionAmount, 2)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const pres = commissionStatusPresentation(row.commission.status);
        return (
          <InlineStatus
            label={pres.label}
            tone={toSemanticTone(pres.tone)}
            dataStatus={pres.dataStatus}
          />
        );
      },
    },
    {
      key: 'created',
      header: 'Accrued',
      align: 'right',
      hideOnMobile: true,
      render: (row) => (
        <span className="tabular-nums text-ds-label text-muted">
          {row.commission.createdAt.slice(0, 10)}
        </span>
      ),
    },
  ];
return (
    <div>
      <ConsoleHeader
        eyebrow="Mercenta · Finance"
        title="Billing"
        description="Commission across the portfolio, the subscription run-rate, and what is still open."
      />

      {isError ? (
        <ErrorStateBlock
          title="Billing records could not be loaded"
          message={errorMessage}
          onRetry={onRetry}
        />
      ) : isLoading ? (
        <LoadingRows rows={8} />
      ) : (
        <>
          <MetricStrip items={metrics} columns={4} />

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={search}
              onChange={(event) => onChangeSearch(event.target.value)}
              placeholder="Search brand or PO"
              aria-label="Search commission records"
              className="px-3 py-2 text-ds-body border border-hairline-strong rounded-ds-md bg-surface-raised text-strong w-64"
            />
            <select
              value={brandFilter}
              onChange={(event) => onChangeBrand(event.target.value)}
              aria-label="Filter by brand"
              className="px-3 py-2 text-ds-body border border-hairline-strong rounded-ds-md bg-surface-raised text-strong"
            >
              <option value="all">All brands</option>
              {brandOptions.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => onChangeStatus(event.target.value)}
              aria-label="Filter by status"
              className="px-3 py-2 text-ds-body border border-hairline-strong rounded-ds-md bg-surface-raised text-strong"
            >
              <option value="all">All statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {commissionStatusPresentation(status as Commission['status']).label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-6">
            <SectionCard
              title="Commission"
              description={`${rows.length} of ${totalCommissions} shown`}
            >
              <ConsoleTable
                rows={rows}
                columns={columns}
                rowKey={(row) => row.commission.id}
                onRowClick={(row) => onSelect(row)}
                emptyTitle="No commission records match these filters"
                emptyDescription="Clear the filters to see the whole portfolio."
              />
            </SectionCard>
<SectionCard
              title="Subscriptions"
              description="The flat monthly plan each brand is on."
              testId="admin-subscriptions"
            >
              {subscriptions.length === 0 ? (
                <p className="text-ds-body text-muted">No subscriptions are recorded yet.</p>
              ) : (
                <ul className="divide-y divide-hairline-06">
                  {subscriptions.map((row) => (
                    <li
                      key={row.subscription.id}
                      className="py-2.5 flex items-center justify-between gap-3 text-ds-body"
                    >
                      <span className="min-w-0 truncate">
                        {row.brandName} · {row.subscription.planTier}
                      </span>
                      <span className="flex items-center gap-3 shrink-0">
                        <span className="tabular-nums text-secondary">
                          {formatGbp(row.subscription.monthlyFee, 2)}/mo
                        </span>
                        <InlineStatus
                          label={row.subscription.status.replace(/_/g, ' ')}
                          tone={row.subscription.status === 'active' ? 'success' : 'warning'}
                          dataStatus={row.subscription.status}
                        />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>
        </>
      )}

      <SlideOverDrawer
        open={Boolean(selected)}
        onClose={() => onSelect(null)}
        title={selected ? selected.commission.purchaseOrderId : ''}
        subtitle={selected ? selected.brandName : undefined}
        testId="admin-billing-drawer"
      >
        {selected && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-ds-body">
              <div>
                <dt className="text-ds-label text-faint">PO value</dt>
                <dd className="font-medium text-strong tabular-nums">
                  {formatGbp(selected.commission.poValue, 2)}
                </dd>
              </div>
              <div>
                <dt className="text-ds-label text-faint">Commission</dt>
                <dd className="font-medium text-strong tabular-nums">
                  {formatGbp(selected.commission.commissionAmount, 2)}
                </dd>
              </div>
              <div>
                <dt className="text-ds-label text-faint">Rate applied</dt>
                <dd className="font-medium text-strong tabular-nums">
                  {(selected.commission.commissionRate * 100).toFixed(2)}%
                </dd>
              </div>
              <div>
                <dt className="text-ds-label text-faint">Accrued</dt>
                <dd className="font-medium text-strong">
                  {selected.commission.createdAt.slice(0, 10)}
                </dd>
              </div>
            </dl>

            <div>
              <div className="text-ds-label text-faint mb-1">Deductions on this order</div>
              {selectedDeductions.length === 0 ? (
                <p className="text-ds-body text-muted">
                  No deductions were raised on this order.
                </p>
              ) : (
                <ul className="divide-y divide-hairline-06 border border-hairline rounded-ds-md">
                  {selectedDeductions.map((deduction) => (
                    <li
                      key={deduction.id}
                      className="px-3 py-2 flex items-center justify-between gap-3 text-ds-body"
                    >
                      <span className="min-w-0 truncate">
                        {deduction.reason} · {deduction.status}
                      </span>
                      <span className="tabular-nums shrink-0">
                        {formatGbp(deduction.amountGbp, 2)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
}