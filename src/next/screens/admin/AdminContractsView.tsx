/**
 * §WAVE 3c (2026-11-25) — ADMIN contract cycle (presentation).
 * Oversight of the paperwork: what each brand has signed, what is still moving and
 * which commercial terms are attached. There is no contract-mutation API, so this
 * screen reports the cycle rather than pretending to advance it.
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
import { contractStatusPresentation } from '@/lib/statusPresentation';
import type { BrandAgreement, Contract } from '@/types';

export interface AdminContractRow {
  contract: Contract;
  brandName: string;
}

export interface AdminContractsViewProps {
  rows: AdminContractRow[];
  totalContracts: number;
  brandOptions: { id: string; name: string }[];
  statusOptions: string[];
  brandFilter: string;
  statusFilter: string;
  search: string;
  activeCount: number;
  awaitingSignatureCount: number;
  endedCount: number;
  selected: AdminContractRow | null;
  selectedAgreements: BrandAgreement[];
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
  onChangeBrand: (value: string) => void;
  onChangeStatus: (value: string) => void;
  onChangeSearch: (value: string) => void;
  onSelect: (row: AdminContractRow | null) => void;
}

export function AdminContractsView({
  rows,
  totalContracts,
  brandOptions,
  statusOptions,
  brandFilter,
  statusFilter,
  search,
  activeCount,
  awaitingSignatureCount,
  endedCount,
  selected,
  selectedAgreements,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  onChangeBrand,
  onChangeStatus,
  onChangeSearch,
  onSelect,
}: AdminContractsViewProps) {
  const metrics: MetricItem[] = [
    {
      id: 'active',
      label: 'Active contracts',
      value: String(activeCount),
      context: 'Signed and running',
    },
    {
      id: 'awaiting',
      label: 'Awaiting signature',
      value: String(awaitingSignatureCount),
      context: 'Draft, sent or under review',
    },
    {
      id: 'ended',
      label: 'Expiring or ended',
      value: String(endedCount),
      context: 'Needs renewal or closed',
    },
  ];

  const columns: ConsoleColumn<AdminContractRow>[] = [
    {
      key: 'brand',
      header: 'Brand',
      mobilePrimary: true,
      render: (row) => (
        <div className="min-w-0">
          <div className="font-medium text-zinc-950 truncate">{row.brandName}</div>
          <div className="text-ds-label text-zinc-500 truncate">
            {row.contract.type.replace(/_/g, ' ')}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const pres = contractStatusPresentation(row.contract.status);
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
      key: 'rate',
      header: 'Commission',
      align: 'right',
      render: (row) => (
        <span className="tabular-nums">{(row.contract.commissionRate * 100).toFixed(2)}%</span>
      ),
    },
    {
      key: 'fee',
      header: 'Monthly fee',
      align: 'right',
      hideOnMobile: true,
      render: (row) => (
        <span className="tabular-nums">{formatGbp(row.contract.monthlyFee, 2)}</span>
      ),
    },
    {
      key: 'track',
      header: 'Track',
      hideOnMobile: true,
      render: (row) => (
        <span className="text-ds-label text-zinc-600">
          {row.contract.fulfillmentTrack.replace(/_/g, ' ')}
        </span>
      ),
    },
  ];
return (
    <div>
      <ConsoleHeader
        eyebrow="Mercenta · Finance & Legal"
        title="Contract cycle"
        description="What each brand has signed, what is still moving, and the commercial terms attached."
      />

      {isError ? (
        <ErrorStateBlock
          title="Contracts could not be loaded"
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
              placeholder="Search brand or contract type"
              aria-label="Search contracts"
              className="px-3 py-2 text-ds-body border border-zinc-300 rounded-ds-md bg-white text-zinc-950 w-64"
            />
            <select
              value={brandFilter}
              onChange={(event) => onChangeBrand(event.target.value)}
              aria-label="Filter by brand"
              className="px-3 py-2 text-ds-body border border-zinc-300 rounded-ds-md bg-white text-zinc-950"
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
              className="px-3 py-2 text-ds-body border border-zinc-300 rounded-ds-md bg-white text-zinc-950"
            >
              <option value="all">All statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {contractStatusPresentation(status as Contract['status']).label}
                </option>
              ))}
            </select>
          </div>

          <SectionCard title="Contracts" description={`${rows.length} of ${totalContracts} shown`}>
            <ConsoleTable
              rows={rows}
              columns={columns}
              rowKey={(row) => row.contract.id}
              onRowClick={(row) => onSelect(row)}
              emptyTitle="No contracts match these filters"
              emptyDescription="Clear the filters to see the whole portfolio."
            />
          </SectionCard>
        </>
      )}

      <SlideOverDrawer
        open={Boolean(selected)}
        onClose={() => onSelect(null)}
        title={selected ? selected.contract.type.replace(/_/g, ' ') : ''}
        subtitle={selected ? selected.brandName : undefined}
        testId="admin-contract-drawer"
      >
        {selected && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-ds-body">
              <div>
                <dt className="text-ds-label text-zinc-500">Status</dt>
                <dd className="font-medium text-zinc-950">
                  {contractStatusPresentation(selected.contract.status).label}
                </dd>
              </div>
              <div>
                <dt className="text-ds-label text-zinc-500">Commission</dt>
                <dd className="font-medium text-zinc-950 tabular-nums">
                  {(selected.contract.commissionRate * 100).toFixed(2)}%
                </dd>
              </div>
              <div>
                <dt className="text-ds-label text-zinc-500">Monthly fee</dt>
                <dd className="font-medium text-zinc-950 tabular-nums">
                  {formatGbp(selected.contract.monthlyFee, 2)}
                </dd>
              </div>
              <div>
                <dt className="text-ds-label text-zinc-500">Fulfilment track</dt>
                <dd className="font-medium text-zinc-950">
                  {selected.contract.fulfillmentTrack.replace(/_/g, ' ')}
                </dd>
              </div>
            </dl>

            <div>
              <div className="text-ds-label text-zinc-500 mb-1">
                Accepted agreements
              </div>
              {selectedAgreements.length === 0 ? (
                <p className="text-ds-body text-zinc-600">
                  No separate agreements are recorded for this brand.
                </p>
              ) : (
                <ul className="divide-y divide-zinc-200 border border-zinc-200 rounded-ds-md">
                  {selectedAgreements.map((agreement) => (
                    <li
                      key={agreement.id}
                      className="px-3 py-2 flex items-center justify-between gap-3 text-ds-body"
                    >
                      <span className="min-w-0 truncate">
                        {agreement.agreementType.replace(/_/g, ' ')}
                      </span>
                      <span className="text-ds-label text-zinc-600 shrink-0">
                        v{agreement.version} · {agreement.acceptedAt.slice(0, 10)}
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