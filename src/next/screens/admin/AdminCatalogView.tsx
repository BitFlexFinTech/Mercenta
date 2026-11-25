/**
 * §WAVE 3d (2026-11-25) — ADMIN global catalog (presentation).
 * Products across every brand with their real submission state, prices and the
 * eligibility flags the domain already derives. No product or submission mutation
 * exists in the data layer, so this screen reports rather than pretends.
 */
import {
  ConsoleHeader,
  ConsoleTable,
  ErrorStateBlock,
  InlineStatus,
  LoadingRows,
  MetricStrip,
  SlideOverDrawer,
  type ConsoleColumn,
  type MetricItem,
} from '@/next/components/ConsolePrimitives';
import { SectionCard, formatGbp } from '@/next/components/ConsoleCharts';
import type { CatalogSubmissionStatus } from '@/types';

export interface AdminCatalogRow {
  id: string;
  brandId: string;
  name: string;
  sku: string;
  brandName: string;
  exWorksPrice: number;
  ukRetailPrice: number;
  commodityCode: string;
  vatStatus: string;
  hazmat: boolean;
  available: boolean;
  submissionStatus?: CatalogSubmissionStatus;
  rejectionReason?: string;
}

export interface AdminCatalogViewProps {
  rows: AdminCatalogRow[];
  totalProducts: number;
  brandOptions: { id: string; name: string }[];
  submissionStatuses: string[];
  brandFilter: string;
  submissionFilter: string;
  search: string;
  liveCount: number;
  awaitingReviewCount: number;
  rejectedCount: number;
  unavailableCount: number;
  selected: AdminCatalogRow | null;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
  onChangeBrand: (value: string) => void;
  onChangeSubmission: (value: string) => void;
  onChangeSearch: (value: string) => void;
  onSelect: (row: AdminCatalogRow | null) => void;
}

const SUBMISSION_LABELS: Record<CatalogSubmissionStatus, string> = {
  submitted: 'Submitted',
  under_amazon_review: 'Under channel review',
  live: 'Live on channel',
  rejected: 'Rejected',
};

const SUBMISSION_TONES: Record<CatalogSubmissionStatus, 'neutral' | 'success' | 'warning' | 'danger'> =
  {
    submitted: 'neutral',
    under_amazon_review: 'warning',
    live: 'success',
    rejected: 'danger',
  };

export function AdminCatalogView({
  rows,
  totalProducts,
  brandOptions,
  submissionStatuses,
  brandFilter,
  submissionFilter,
  search,
  liveCount,
  awaitingReviewCount,
  rejectedCount,
  unavailableCount,
  selected,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  onChangeBrand,
  onChangeSubmission,
  onChangeSearch,
  onSelect,
}: AdminCatalogViewProps) {
  const metrics: MetricItem[] = [
    { id: 'products', label: 'Products', value: String(totalProducts), context: 'Across the portfolio' },
    {
      id: 'live',
      label: 'Live on channel',
      value: String(liveCount),
      context: 'Accepted and selling',
      onClick: () => onChangeSubmission('live'),
      active: submissionFilter === 'live',
    },
    {
      id: 'review',
      label: 'Awaiting review',
      value: String(awaitingReviewCount),
      context: 'Submitted or under review',
      onClick: () => onChangeSubmission('awaiting'),
      active: submissionFilter === 'awaiting',
    },
    {
      id: 'unavailable',
      label: 'Not available',
      value: String(unavailableCount),
      context: `${rejectedCount} rejected by the channel`,
    },
  ];

  const columns: ConsoleColumn<AdminCatalogRow>[] = [
    {
      key: 'product',
      header: 'Product',
      mobilePrimary: true,
      render: (row) => (
        <div className="min-w-0">
          <div className="font-medium text-zinc-950 truncate">{row.name}</div>
          <div className="font-mono text-ds-label text-zinc-500">
            {row.sku} · {row.brandName}
          </div>
        </div>
      ),
    },
    {
      key: 'exWorks',
      header: 'Ex-works',
      align: 'right',
      render: (row) => <span className="tabular-nums">{formatGbp(row.exWorksPrice, 2)}</span>,
    },
    {
      key: 'retail',
      header: 'UK retail',
      align: 'right',
      hideOnMobile: true,
      render: (row) => <span className="tabular-nums">{formatGbp(row.ukRetailPrice, 2)}</span>,
    },
    {
      key: 'submission',
      header: 'Submission',
      render: (row) =>
        row.submissionStatus ? (
          <InlineStatus
            label={SUBMISSION_LABELS[row.submissionStatus]}
            tone={SUBMISSION_TONES[row.submissionStatus]}
            dataStatus={row.submissionStatus}
          />
        ) : (
          <InlineStatus label="Not submitted" tone="neutral" dataStatus="not_submitted" />
        ),
    },
    {
      key: 'available',
      header: 'Availability',
      align: 'right',
      render: (row) =>
        row.available ? (
          <span className="text-ds-label text-zinc-500">Available</span>
        ) : (
          <InlineStatus label="Unavailable" tone="danger" dataStatus="unavailable" />
        ),
    },
  ];
return (
    <div>
      <ConsoleHeader
        eyebrow="Mercenta · Catalogue"
        title="Global catalog"
        description="Every product across the portfolio, with its real submission state and eligibility flags."
      />

      {isError ? (
        <ErrorStateBlock
          title="Catalog could not be loaded"
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
              placeholder="Search product or SKU"
              aria-label="Search products"
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
              value={submissionFilter}
              onChange={(event) => onChangeSubmission(event.target.value)}
              aria-label="Filter by submission state"
              className="px-3 py-2 text-ds-body border border-zinc-300 rounded-ds-md bg-white text-zinc-950"
            >
              <option value="all">All submission states</option>
              {submissionStatuses.map((status) => (
                <option key={status} value={status}>
                  {SUBMISSION_LABELS[status as CatalogSubmissionStatus]}
                </option>
              ))}
            </select>
          </div>

          <SectionCard title="Products" description={`${rows.length} of ${totalProducts} shown`}>
            <ConsoleTable
              rows={rows}
              columns={columns}
              rowKey={(row) => row.id}
              onRowClick={(row) => onSelect(row)}
              emptyTitle="No products match these filters"
              emptyDescription="Clear the filters to see the whole catalogue."
            />
          </SectionCard>
        </>
      )}

      <SlideOverDrawer
        open={Boolean(selected)}
        onClose={() => onSelect(null)}
        title={selected ? selected.name : ''}
        subtitle={selected ? `${selected.brandName} · ${selected.sku}` : undefined}
        testId="admin-catalog-drawer"
      >
        {selected && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-ds-body">
              <div>
                <dt className="text-ds-label text-zinc-500">Ex-works price</dt>
                <dd className="font-medium text-zinc-950 tabular-nums">
                  {formatGbp(selected.exWorksPrice, 2)}
                </dd>
              </div>
              <div>
                <dt className="text-ds-label text-zinc-500">UK retail price</dt>
                <dd className="font-medium text-zinc-950 tabular-nums">
                  {formatGbp(selected.ukRetailPrice, 2)}
                </dd>
              </div>
              <div>
                <dt className="text-ds-label text-zinc-500">Commodity code</dt>
                <dd className="font-mono text-ds-label text-zinc-950">{selected.commodityCode}</dd>
              </div>
              <div>
                <dt className="text-ds-label text-zinc-500">VAT treatment</dt>
                <dd className="font-medium text-zinc-950">{selected.vatStatus}</dd>
              </div>
            </dl>

            {selected.hazmat && (
              <p className="text-ds-body text-state-warning">
                Flagged as hazardous material — carrier and category rules apply.
              </p>
            )}

            <div>
              <div className="text-ds-label text-zinc-500 mb-1">Channel submission</div>
              {selected.submissionStatus ? (
                <div className="space-y-1">
                  <InlineStatus
                    label={SUBMISSION_LABELS[selected.submissionStatus]}
                    tone={SUBMISSION_TONES[selected.submissionStatus]}
                    dataStatus={selected.submissionStatus}
                  />
                  {selected.rejectionReason && (
                    <p className="text-ds-body text-state-danger">{selected.rejectionReason}</p>
                  )}
                </div>
              ) : (
                <p className="text-ds-body text-zinc-600">
                  This product has not been submitted to the channel.
                </p>
              )}
            </div>
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
}