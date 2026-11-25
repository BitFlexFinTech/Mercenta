/**
 * §WAVE 3 (2026-11-25) — the ADMIN portfolio purchase-order monitor.
 *
 * Capability is inline, not redirected: the list filters and exports across every
 * brand, a row opens the real order detail, and an order awaiting acknowledgement
 * can be acknowledged from here through the CANONICAL command
 * (`runPoAcknowledgement` → `acknowledgePurchaseOrder`) — the same path the brand
 * workspace uses. Nothing here re-implements a domain rule.
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
import { poStatusPresentation } from '@/lib/statusPresentation';
import type { PurchaseOrder } from '@/types';

export interface AdminPoRow {
  po: PurchaseOrder;
  brandName: string;
}

export interface AdminPurchaseOrdersViewProps {
  rows: AdminPoRow[];
  totalCount: number;
  brandOptions: { id: string; name: string }[];
  brandFilter: string;
  statusFilter: string;
  search: string;
  statusOptions: string[];
  openValue: number;
  awaitingAckCount: number;
  selected: PurchaseOrder | null;
  busyPoId: string | null;
  notice: string | null;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
  onChangeBrand: (value: string) => void;
  onChangeStatus: (value: string) => void;
  onChangeSearch: (value: string) => void;
  onExportCsv: () => void;
  onSelect: (po: PurchaseOrder | null) => void;
  onAcknowledge: (po: PurchaseOrder) => void;
}

export function AdminPurchaseOrdersView({
  rows,
  totalCount,
  brandOptions,
  brandFilter,
  statusFilter,
  search,
  statusOptions,
  openValue,
  awaitingAckCount,
  selected,
  busyPoId,
  notice,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  onChangeBrand,
  onChangeStatus,
  onChangeSearch,
  onExportCsv,
  onSelect,
  onAcknowledge,
}: AdminPurchaseOrdersViewProps) {
  const metrics: MetricItem[] = [
    {
      id: 'po-total',
      label: 'Purchase orders',
      value: String(totalCount),
      context: 'Across the portfolio',
    },
    {
      id: 'po-open-value',
      label: 'Open value',
      value: formatGbp(openValue),
      context: 'Not yet delivered',
    },
    {
      id: 'po-awaiting',
      label: 'Awaiting acknowledgement',
      value: String(awaitingAckCount),
      context: awaitingAckCount > 0 ? 'Action needed today' : 'Nothing outstanding',
    },
  ];

  const columns: ConsoleColumn<AdminPoRow>[] = [
    {
      key: 'po',
      header: 'Purchase order',
      mobilePrimary: true,
      render: (row) => (
        <div className="min-w-0">
          <div className="font-mono text-ds-label text-strong">{row.po.poNumber}</div>
          <div className="text-ds-label text-faint truncate">{row.brandName}</div>
        </div>
      ),
    },
    {
      key: 'value',
      header: 'Value',
      align: 'right',
      render: (row) => <span className="tabular-nums">{formatGbp(row.po.poValue)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const pres = poStatusPresentation(row.po.status);
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
      key: 'ordered',
      header: 'Ordered',
      align: 'right',
      hideOnMobile: true,
      render: (row) => (
        <span className="tabular-nums text-ds-label text-muted">
          {row.po.orderDate.slice(0, 10)}
        </span>
      ),
    },
    {
      key: 'lines',
      header: 'Lines',
      align: 'right',
      hideOnMobile: true,
      render: (row) => <span className="tabular-nums">{row.po.lineItems.length}</span>,
    },
  ];

  return (
    <div>
      <ConsoleHeader
        eyebrow="Mercenta · Operations"
        title="Purchase orders"
        description="Every purchase order across the portfolio, with the brand it belongs to and the action it needs."
        actions={
          <button
            type="button"
            onClick={onExportCsv}
            className="px-3 py-2 text-ds-label font-medium rounded-ds-md border border-hairline-strong bg-surface-raised text-ink-800 hover:bg-surface"
          >
            Export CSV
          </button>
        }
      />

      {notice && (
        <p role="status" className="mb-4 text-ds-label text-secondary">
          {notice}
        </p>
      )}
{isError ? (
        <ErrorStateBlock
          title="Purchase orders could not be loaded"
          message={errorMessage}
          onRetry={onRetry}
        />
      ) : isLoading ? (
        <LoadingRows rows={8} />
      ) : (
        <>
          <MetricStrip items={metrics} columns={3} />

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={search}
              onChange={(event) => onChangeSearch(event.target.value)}
              placeholder="Search PO number or brand"
              aria-label="Search purchase orders"
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
                  {poStatusPresentation(status as PurchaseOrder['status']).label}
                </option>
              ))}
            </select>
          </div>

          <SectionCard title="Orders" description={`${rows.length} of ${totalCount} shown`}>
            <ConsoleTable
              rows={rows}
              columns={columns}
              rowKey={(row) => row.po.id}
              onRowClick={(row) => onSelect(row.po)}
              emptyTitle="No orders match these filters"
              emptyDescription="Clear the filters to see the whole portfolio."
            />
          </SectionCard>
        </>
      )}
<SlideOverDrawer
        open={Boolean(selected)}
        onClose={() => onSelect(null)}
        title={selected ? selected.poNumber : ''}
        subtitle={selected ? poStatusPresentation(selected.status).label : undefined}
        testId="admin-po-drawer"
      >
        {selected && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-ds-body">
              <div>
                <dt className="text-ds-label text-faint">Value</dt>
                <dd className="font-medium text-strong tabular-nums">
                  {formatGbp(selected.poValue)}
                </dd>
              </div>
              <div>
                <dt className="text-ds-label text-faint">Ordered</dt>
                <dd className="font-medium text-strong">{selected.orderDate.slice(0, 10)}</dd>
              </div>
            </dl>

            <ul className="divide-y divide-hairline-06 border border-hairline rounded-ds-md">
              {selected.lineItems.map((line) => (
                <li
                  key={line.sku}
                  className="px-3 py-2 flex items-center justify-between gap-3 text-ds-body"
                >
                  <span className="min-w-0 truncate">{line.productName}</span>
                  <span className="tabular-nums text-muted shrink-0">
                    {line.quantity} × {formatGbp(line.unitPrice, 2)}
                  </span>
                </li>
              ))}
            </ul>

            {selected.status === 'received' && (
              <button
                type="button"
                disabled={busyPoId === selected.id}
                onClick={() => onAcknowledge(selected)}
                className="w-full px-3 py-2 text-ds-label font-medium rounded-ds-md bg-accent text-on-dark hover:bg-accent-600 disabled:opacity-50"
              >
                {busyPoId === selected.id ? 'Acknowledging…' : 'Acknowledge all lines as accepted'}
              </button>
            )}
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
}
