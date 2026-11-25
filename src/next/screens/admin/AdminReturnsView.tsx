/**
 * §WAVE 3b (2026-11-25) — ADMIN returns tracking (presentation).
 *
 * What it is for: seeing every return across the portfolio, how much of it turned
 * into a deduction, and opening one to its real detail. Recording a return belongs
 * to the channel/brand flow, so this screen claims only what it does.
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
import { deductionStatusPresentation } from '@/lib/statusPresentation';
import type { BrandReturn, Deduction } from '@/types';

export interface AdminReturnRow {
  ret: BrandReturn;
  brandName: string;
  deduction?: Deduction;
}

export interface AdminReturnsViewProps {
  rows: AdminReturnRow[];
  totalCount: number;
  brandOptions: { id: string; name: string }[];
  reasonOptions: string[];
  brandFilter: string;
  reasonFilter: string;
  search: string;
  unitsReturned: number;
  openDeductionValue: number;
  selected: AdminReturnRow | null;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
  onChangeBrand: (value: string) => void;
  onChangeReason: (value: string) => void;
  onChangeSearch: (value: string) => void;
  onSelect: (row: AdminReturnRow | null) => void;
}

export function AdminReturnsView({
  rows,
  totalCount,
  brandOptions,
  reasonOptions,
  brandFilter,
  reasonFilter,
  search,
  unitsReturned,
  openDeductionValue,
  selected,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  onChangeBrand,
  onChangeReason,
  onChangeSearch,
  onSelect,
}: AdminReturnsViewProps) {
  const metrics: MetricItem[] = [
    {
      id: 'returns',
      label: 'Returns recorded',
      value: String(totalCount),
      context: 'Across the portfolio',
    },
    {
      id: 'units',
      label: 'Units returned',
      value: String(unitsReturned),
      context: 'Sum of recorded quantities',
    },
    {
      id: 'deductions',
      label: 'Open deduction value',
      value: formatGbp(openDeductionValue),
      context: 'Raised against returns',
    },
  ];

  const columns: ConsoleColumn<AdminReturnRow>[] = [
    {
      key: 'brand',
      header: 'Brand',
      mobilePrimary: true,
      render: (row) => (
        <div className="min-w-0">
          <div className="font-medium text-strong truncate">{row.brandName}</div>
          <div className="font-mono text-ds-label text-faint">{row.ret.poNumber}</div>
        </div>
      ),
    },
    {
      key: 'product',
      header: 'Product',
      render: (row) => (
        <div className="min-w-0">
          <div className="text-ds-body text-ink-900 truncate">{row.ret.productName}</div>
          <div className="font-mono text-ds-label text-faint">{row.ret.productSku}</div>
        </div>
      ),
    },
    {
      key: 'qty',
      header: 'Units',
      align: 'right',
      render: (row) => <span className="tabular-nums">{row.ret.quantity}</span>,
    },
    {
      key: 'reason',
      header: 'Reason',
      hideOnMobile: true,
      render: (row) => (
        <span className="text-ds-label text-muted">{row.ret.reason.replace(/_/g, ' ')}</span>
      ),
    },
    {
      key: 'deduction',
      header: 'Deduction',
      align: 'right',
      render: (row) => {
        if (!row.deduction) return <span className="text-ds-label text-quiet">—</span>;
        const pres = deductionStatusPresentation(row.deduction.status);
        return (
          <InlineStatus
            label={formatGbp(row.deduction.amountGbp, 2)}
            tone={toSemanticTone(pres.tone)}
            dataStatus={pres.dataStatus}
          />
        );
      },
    },
    {
      key: 'date',
      header: 'Recorded',
      align: 'right',
      hideOnMobile: true,
      render: (row) => (
        <span className="tabular-nums text-ds-label text-muted">
          {row.ret.returnDate.slice(0, 10)}
        </span>
      ),
    },
  ];

  return (
    <div>
      <ConsoleHeader
        eyebrow="Mercenta · Operations"
        title="Returns tracking"
        description="Every return across the portfolio, and the deduction it raised."
      />

      {isError ? (
        <ErrorStateBlock
          title="Returns could not be loaded"
          message={errorMessage}
          onRetry={onRetry}
        />
      ) : isLoading ? (
        <LoadingRows rows={8} />
      ) : (
        <>
<div className="mb-4 flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={search}
              onChange={(event) => onChangeSearch(event.target.value)}
              placeholder="Search PO, SKU or product"
              aria-label="Search returns"
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
              value={reasonFilter}
              onChange={(event) => onChangeReason(event.target.value)}
              aria-label="Filter by reason"
              className="px-3 py-2 text-ds-body border border-hairline-strong rounded-ds-md bg-surface-raised text-strong"
            >
              <option value="all">All reasons</option>
              {reasonOptions.map((reason) => (
                <option key={reason} value={reason}>
                  {reason.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <SectionCard title="Returns" description={`${rows.length} of ${totalCount} shown`}>
            <ConsoleTable
              rows={rows}
              columns={columns}
              rowKey={(row) => row.ret.id}
              onRowClick={(row) => onSelect(row)}
              emptyTitle="No returns match these filters"
              emptyDescription="Clear the filters to see the whole portfolio."
            />
          </SectionCard>
        </>
      )}
<SlideOverDrawer
        open={Boolean(selected)}
        onClose={() => onSelect(null)}
        title={selected ? selected.ret.productName : ''}
        subtitle={selected ? `${selected.brandName} · ${selected.ret.poNumber}` : undefined}
        testId="admin-return-drawer"
      >
        {selected && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-ds-body">
              <div>
                <dt className="text-ds-label text-faint">Units</dt>
                <dd className="font-medium text-strong tabular-nums">{selected.ret.quantity}</dd>
              </div>
              <div>
                <dt className="text-ds-label text-faint">Reason</dt>
                <dd className="font-medium text-strong">
                  {selected.ret.reason.replace(/_/g, ' ')}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-ds-label text-faint">Recorded</dt>
                <dd className="font-medium text-strong">{selected.ret.returnDate.slice(0, 10)}</dd>
              </div>
            </dl>

            <div>
              <div className="text-ds-label text-faint mb-1">Description</div>
              <p className="text-ds-body text-ink-800">{selected.ret.description}</p>
            </div>

            <div>
              <div className="text-ds-label text-faint mb-1">Linked deduction</div>
              {selected.deduction ? (
                <p className="text-ds-body text-ink-800">
                  {formatGbp(selected.deduction.amountGbp, 2)} ·{' '}
                  {deductionStatusPresentation(selected.deduction.status).label}
                </p>
              ) : (
                <p className="text-ds-body text-muted">
                  No deduction was raised against this return.
                </p>
              )}
            </div>
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
}