/**
 * §WAVE 3 (2026-11-25) — the ADMIN logistics hub (presentation).
 *
 * What this screen is for: seeing every shipment in the portfolio, spotting the
 * ones with a carrier exception first, and opening one to its real detail. It
 * performs no mutation — the carrier commands belong to the shipment workflow —
 * so it claims no capability it does not have.
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
import { SectionCard } from '@/next/components/ConsoleCharts';
import { shipmentStatusPresentation } from '@/lib/statusPresentation';
import type { DemoShipment } from '@/data/demoData';

export interface AdminShipmentRow {
  shipment: DemoShipment;
  brandName: string;
}

export interface AdminLogisticsViewProps {
  rows: AdminShipmentRow[];
  totalCount: number;
  carrierOptions: string[];
  carrierFilter: string;
  statusFilter: string;
  statusOptions: string[];
  search: string;
  exceptionsOnly: boolean;
  activeCount: number;
  exceptionCount: number;
  selected: DemoShipment | null;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
  onChangeCarrier: (value: string) => void;
  onChangeStatus: (value: string) => void;
  onChangeSearch: (value: string) => void;
  onToggleExceptions: () => void;
  onSelect: (shipment: DemoShipment | null) => void;
}

export function AdminLogisticsView({
  rows,
  totalCount,
  carrierOptions,
  carrierFilter,
  statusFilter,
  statusOptions,
  search,
  exceptionsOnly,
  activeCount,
  exceptionCount,
  selected,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  onChangeCarrier,
  onChangeStatus,
  onChangeSearch,
  onToggleExceptions,
  onSelect,
}: AdminLogisticsViewProps) {
  const metrics: MetricItem[] = [
    {
      id: 'active',
      label: 'Shipments in transit',
      value: String(activeCount),
      context: 'Not yet resolved',
    },
    {
      id: 'exceptions',
      label: 'Carrier exceptions',
      value: String(exceptionCount),
      context: exceptionCount > 0 ? 'Needs a decision' : 'None outstanding',
      onClick: onToggleExceptions,
    },
    {
      id: 'total',
      label: 'All shipments',
      value: String(totalCount),
      context: 'Portfolio total',
    },
  ];

  const columns: ConsoleColumn<AdminShipmentRow>[] = [
    {
      key: 'shipment',
      header: 'Shipment',
      mobilePrimary: true,
      render: (row) => (
        <div className="min-w-0">
          <div className="font-mono text-ds-label text-zinc-950">
            {row.shipment.poNumber ?? row.shipment.reference}
          </div>
          <div className="text-ds-label text-zinc-500 truncate">{row.brandName}</div>
        </div>
      ),
    },
    {
      key: 'carrier',
      header: 'Carrier',
      hideOnMobile: true,
      render: (row) => <span className="text-ds-label text-zinc-700">{row.shipment.carrier}</span>,
    },
    {
      key: 'route',
      header: 'Route',
      hideOnMobile: true,
      render: (row) => (
        <span className="text-ds-label text-zinc-600 truncate">
          {row.shipment.origin} → {row.shipment.destination}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const pres = shipmentStatusPresentation(row.shipment.status);
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
      key: 'exception',
      header: 'Exception',
      align: 'right',
      render: (row) =>
        row.shipment.exception ? (
          <InlineStatus label="Raised" tone="danger" dataStatus="exception" />
        ) : (
          <span className="text-ds-label text-zinc-400">—</span>
        ),
    },
  ];

  return (
    <div>
      <ConsoleHeader
        eyebrow="Mercenta · Operations"
        title="Logistics hub"
        description="Every shipment in the portfolio, carrier by carrier, with the ones needing a decision first."
      />

      {isError ? (
        <ErrorStateBlock
          title="Shipments could not be loaded"
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
              placeholder="Search PO or reference"
              aria-label="Search shipments"
              className="px-3 py-2 text-ds-body border border-zinc-300 rounded-ds-md bg-white text-zinc-950 w-64"
            />
            <select
              value={carrierFilter}
              onChange={(event) => onChangeCarrier(event.target.value)}
              aria-label="Filter by carrier"
              className="px-3 py-2 text-ds-body border border-zinc-300 rounded-ds-md bg-white text-zinc-950"
            >
              <option value="all">All carriers</option>
              {carrierOptions.map((carrier) => (
                <option key={carrier} value={carrier}>
                  {carrier}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => onChangeStatus(event.target.value)}
              aria-label="Filter by status"
              className="px-3 py-2 text-ds-body border border-zinc-300 rounded-ds-md bg-white text-zinc-950"
            >
              <option value="all">All statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {shipmentStatusPresentation(status as DemoShipment['status']).label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onToggleExceptions}
              aria-pressed={exceptionsOnly}
              className={`px-3 py-2 text-ds-label font-medium rounded-ds-md border ${
                exceptionsOnly
                  ? 'border-zinc-900 bg-zinc-950 text-white'
                  : 'border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50'
              }`}
            >
              Exceptions only
            </button>
          </div>
<SectionCard title="Shipments" description={`${rows.length} of ${totalCount} shown`}>
            <ConsoleTable
              rows={rows}
              columns={columns}
              rowKey={(row) => row.shipment.id}
              onRowClick={(row) => onSelect(row.shipment)}
              emptyTitle="No shipments match these filters"
              emptyDescription="Clear the filters to see the whole portfolio."
            />
          </SectionCard>
        </>
      )}

      <SlideOverDrawer
        open={Boolean(selected)}
        onClose={() => onSelect(null)}
        title={selected ? selected.poNumber ?? selected.reference : ''}
        subtitle={selected ? shipmentStatusPresentation(selected.status).label : undefined}
        testId="admin-shipment-drawer"
      >
        {selected && (
          <dl className="grid grid-cols-2 gap-3 text-ds-body">
            <div>
              <dt className="text-ds-label text-zinc-500">Carrier</dt>
              <dd className="font-medium text-zinc-950">{selected.carrier}</dd>
            </div>
            <div>
              <dt className="text-ds-label text-zinc-500">Reference</dt>
              <dd className="font-mono text-ds-label text-zinc-950">{selected.reference}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-ds-label text-zinc-500">Route</dt>
              <dd className="font-medium text-zinc-950">
                {selected.origin} → {selected.destination}
              </dd>
            </div>
            {selected.exception && (
              <div className="col-span-2">
                <dt className="text-ds-label text-zinc-500">Exception</dt>
                <dd className="text-ds-body text-state-danger">
                  {typeof selected.exception === 'string'
                    ? selected.exception
                    : 'A carrier exception is recorded against this shipment.'}
                </dd>
              </div>
            )}
          </dl>
        )}
      </SlideOverDrawer>
    </div>
  );
}
