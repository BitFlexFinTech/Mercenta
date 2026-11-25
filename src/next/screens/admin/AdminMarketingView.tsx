/**
 * §WAVE 3d (2026-11-25) — ADMIN marketing (presentation).
 *
 * The portfolio view of advertising: budget, spend and attributed sales per
 * campaign. "Return on spend" and "click-through" are plain arithmetic on two
 * canonical fields each (labelled as such), never a re-derived business rule.
 * Campaign status is changed in the Ads Manager, which owns that action.
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

export interface AdminMarketingRow {
  id: string;
  brandId: string;
  brandName: string;
  name: string;
  status: string;
  monthlyBudgetGbp: number;
  spendToDateGbp: number;
  impressions: number;
  clicks: number;
  attributedSalesGbp: number;
}

export interface AdminMarketingViewProps {
  rows: AdminMarketingRow[];
  totalCampaigns: number;
  brandOptions: { id: string; name: string }[];
  statusOptions: string[];
  brandFilter: string;
  statusFilter: string;
  search: string;
  totalBudget: number;
  totalSpend: number;
  totalAttributed: number;
  activeCount: number;
  selected: AdminMarketingRow | null;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
  onChangeBrand: (value: string) => void;
  onChangeStatus: (value: string) => void;
  onChangeSearch: (value: string) => void;
  onSelect: (row: AdminMarketingRow | null) => void;
}

/** Attributed sales per £1 of spend. Em dash when nothing has been spent. */
function returnOnSpend(spend: number, attributed: number): string {
  if (spend <= 0) return '—';
  return `${(attributed / spend).toFixed(2)}×`;
}

function clickThroughRate(clicks: number, impressions: number): string {
  if (impressions <= 0) return '—';
  return `${((clicks / impressions) * 100).toFixed(2)}%`;
}

export function AdminMarketingView({
  rows,
  totalCampaigns,
  brandOptions,
  statusOptions,
  brandFilter,
  statusFilter,
  search,
  totalBudget,
  totalSpend,
  totalAttributed,
  activeCount,
  selected,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  onChangeBrand,
  onChangeStatus,
  onChangeSearch,
  onSelect,
}: AdminMarketingViewProps) {
  const metrics: MetricItem[] = [
    {
      id: 'campaigns',
      label: 'Campaigns',
      value: String(totalCampaigns),
      context: `${activeCount} active`,
    },
    {
      id: 'budget',
      label: 'Monthly budget',
      value: formatGbp(totalBudget),
      context: 'Allocated across campaigns',
    },
    {
      id: 'spend',
      label: 'Spend to date',
      value: formatGbp(totalSpend),
      context: 'This month',
    },
    {
      id: 'attributed',
      label: 'Attributed sales',
      value: formatGbp(totalAttributed),
      context: `${returnOnSpend(totalSpend, totalAttributed)} per £1 spent`,
    },
  ];

  const columns: ConsoleColumn<AdminMarketingRow>[] = [
    {
      key: 'campaign',
      header: 'Campaign',
      mobilePrimary: true,
      render: (row) => (
        <div className="min-w-0">
          <div className="font-medium text-strong truncate">{row.name}</div>
          <div className="text-ds-label text-faint truncate">{row.brandName}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <InlineStatus
          label={row.status.replace(/_/g, ' ')}
          tone={row.status === 'active' ? 'success' : 'neutral'}
          dataStatus={row.status}
        />
      ),
    },
    {
      key: 'budget',
      header: 'Budget',
      align: 'right',
      render: (row) => <span className="tabular-nums">{formatGbp(row.monthlyBudgetGbp)}</span>,
    },
    {
      key: 'spend',
      header: 'Spend',
      align: 'right',
      hideOnMobile: true,
      render: (row) => <span className="tabular-nums">{formatGbp(row.spendToDateGbp)}</span>,
    },
    {
      key: 'attributed',
      header: 'Attributed',
      align: 'right',
      render: (row) => (
        <span className="tabular-nums">{formatGbp(row.attributedSalesGbp)}</span>
      ),
    },
    {
      key: 'ros',
      header: 'Return on spend',
      align: 'right',
      hideOnMobile: true,
      render: (row) => (
        <span className="tabular-nums">{returnOnSpend(row.spendToDateGbp, row.attributedSalesGbp)}</span>
      ),
    },
  ];
return (
    <div>
      <ConsoleHeader
        eyebrow="Mercenta · Brands & Growth"
        title="Marketing"
        description="Advertising across the portfolio: what is allocated, what is spent and what it returned."
      />

      {isError ? (
        <ErrorStateBlock
          title="Campaigns could not be loaded"
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
              placeholder="Search campaign or brand"
              aria-label="Search campaigns"
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
                  {status.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <SectionCard title="Campaigns" description={`${rows.length} of ${totalCampaigns} shown`}>
            <ConsoleTable
              rows={rows}
              columns={columns}
              rowKey={(row) => row.id}
              onRowClick={(row) => onSelect(row)}
              emptyTitle="No campaigns match these filters"
              emptyDescription="Clear the filters to see the whole portfolio."
            />
          </SectionCard>
        </>
      )}

      <SlideOverDrawer
        open={Boolean(selected)}
        onClose={() => onSelect(null)}
        title={selected ? selected.name : ''}
        subtitle={selected ? selected.brandName : undefined}
        testId="admin-marketing-drawer"
      >
        {selected && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-ds-body">
              <div>
                <dt className="text-ds-label text-faint">Status</dt>
                <dd className="font-medium text-strong">
                  {selected.status.replace(/_/g, ' ')}
                </dd>
              </div>
              <div>
                <dt className="text-ds-label text-faint">Monthly budget</dt>
                <dd className="font-medium text-strong tabular-nums">
                  {formatGbp(selected.monthlyBudgetGbp, 2)}
                </dd>
              </div>
              <div>
                <dt className="text-ds-label text-faint">Spend to date</dt>
                <dd className="font-medium text-strong tabular-nums">
                  {formatGbp(selected.spendToDateGbp, 2)}
                </dd>
              </div>
              <div>
                <dt className="text-ds-label text-faint">Attributed sales</dt>
                <dd className="font-medium text-strong tabular-nums">
                  {formatGbp(selected.attributedSalesGbp, 2)}
                </dd>
              </div>
              <div>
                <dt className="text-ds-label text-faint">Impressions</dt>
                <dd className="font-medium text-strong tabular-nums">
                  {selected.impressions.toLocaleString('en-GB')}
                </dd>
              </div>
              <div>
                <dt className="text-ds-label text-faint">Clicks</dt>
                <dd className="font-medium text-strong tabular-nums">
                  {selected.clicks.toLocaleString('en-GB')}
                </dd>
              </div>
            </dl>

            <div className="border-t border-hairline pt-3 space-y-1 text-ds-body">
              <div className="flex items-center justify-between">
                <span className="text-muted">Click-through rate</span>
                <span className="font-medium text-strong tabular-nums">
                  {clickThroughRate(selected.clicks, selected.impressions)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Return on spend</span>
                <span className="font-medium text-strong tabular-nums">
                  {returnOnSpend(selected.spendToDateGbp, selected.attributedSalesGbp)}
                </span>
              </div>
              <p className="text-ds-label text-faint pt-1">
                Both ratios are arithmetic on the two fields above. Campaign status is changed in the
                Ads Manager, which owns that action.
              </p>
            </div>
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
}