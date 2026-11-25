/**
 * §WAVE 3g (2026-11-25) — A VERTICAL PORTFOLIO (presentation).
 *
 * ONE screen serves all three operating models: it is scoped by the vertical it is
 * given, and when that vertical holds no brands it says so plainly instead of
 * showing another vertical's brands under this heading.
 */
import {
  ConsoleHeader,
  ConsoleTable,
  ErrorStateBlock,
  LoadingRows,
  MetricStrip,
  SlideOverDrawer,
  type ConsoleColumn,
  type MetricItem,
} from '@/next/components/ConsolePrimitives';
import { SectionCard, formatGbp } from '@/next/components/ConsoleCharts';
import type { DemoBrandRow } from '@/data/demoData';
import type { OperatingVertical } from '@/types';

export interface VerticalBrandRow {
  brand: DemoBrandRow;
  products: number;
  openPos: number;
  poValue: number;
  shipments: number;
}

export interface VerticalPortfolioViewProps {
  vertical: OperatingVertical;
  verticalLabel: string;
  emptyCopy: string;
  rows: VerticalBrandRow[];
  productCount: number;
  openPoCount: number;
  portfolioValue: number;
  selected: VerticalBrandRow | null;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
  onSelect: (row: VerticalBrandRow | null) => void;
}

export function VerticalPortfolioView({
  vertical,
  verticalLabel,
  emptyCopy,
  rows,
  productCount,
  openPoCount,
  portfolioValue,
  selected,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  onSelect,
}: VerticalPortfolioViewProps) {
  const metrics: MetricItem[] = [
    {
      id: 'brands',
      label: 'Brands',
      value: String(rows.length),
      context: `In ${verticalLabel}`,
    },
    { id: 'products', label: 'Products', value: String(productCount), context: 'Across those brands' },
    { id: 'open-pos', label: 'Open purchase orders', value: String(openPoCount), context: 'Not yet delivered' },
    {
      id: 'value',
      label: 'Portfolio value',
      value: formatGbp(portfolioValue),
      context: 'Total PO value',
    },
  ];

  const columns: ConsoleColumn<VerticalBrandRow>[] = [
    {
      key: 'brand',
      header: 'Brand',
      mobilePrimary: true,
      render: (row) => (
        <div className="min-w-0">
          <div className="font-medium text-zinc-950 truncate">{row.brand.profile.businessName}</div>
          <div className="text-ds-label text-zinc-500 truncate">{row.brand.category}</div>
        </div>
      ),
    },
    {
      key: 'products',
      header: 'Products',
      align: 'right',
      render: (row) => <span className="tabular-nums">{row.products}</span>,
    },
    {
      key: 'openPos',
      header: 'Open POs',
      align: 'right',
      render: (row) => <span className="tabular-nums">{row.openPos}</span>,
    },
    {
      key: 'value',
      header: 'PO value',
      align: 'right',
      hideOnMobile: true,
      render: (row) => <span className="tabular-nums">{formatGbp(row.poValue)}</span>,
    },
    {
      key: 'shipments',
      header: 'Shipments',
      align: 'right',
      hideOnMobile: true,
      render: (row) => <span className="tabular-nums">{row.shipments}</span>,
    },
  ];
return (
    <div>
      <ConsoleHeader
        eyebrow={`Mercenta · ${verticalLabel}`}
        title={`${verticalLabel} portfolio`}
        description="The brands this operating model holds, with their catalogue, orders and movements."
      />

      {isError ? (
        <ErrorStateBlock
          title="The portfolio could not be loaded"
          message={errorMessage}
          onRetry={onRetry}
        />
      ) : isLoading ? (
        <LoadingRows rows={6} />
      ) : (
        <>
          <MetricStrip items={metrics} columns={4} />

          <SectionCard
            title="Brands"
            description={
              rows.length === 0
                ? emptyCopy
                : `${rows.length} brand${rows.length === 1 ? '' : 's'} in ${verticalLabel}`
            }
          >
            <ConsoleTable
              rows={rows}
              columns={columns}
              rowKey={(row) => row.brand.id}
              onRowClick={(row) => onSelect(row)}
              /* The empty state carries the REASON, not a generic "no records". */
              emptyTitle={`Nothing is onboarded in ${verticalLabel} yet`}
              emptyDescription={emptyCopy}
            />
          </SectionCard>
        </>
      )}

      <SlideOverDrawer
        open={Boolean(selected)}
        onClose={() => onSelect(null)}
        title={selected ? selected.brand.profile.businessName : ''}
        subtitle={selected ? `${selected.brand.category} · ${verticalLabel}` : undefined}
        testId="vertical-brand-drawer"
      >
        {selected && (
          <dl className="grid grid-cols-2 gap-3 text-ds-body">
            <div>
              <dt className="text-ds-label text-zinc-500">Contract</dt>
              <dd className="font-medium text-zinc-950">
                {selected.brand.contractStatus.replace(/_/g, ' ')}
              </dd>
            </div>
            <div>
              <dt className="text-ds-label text-zinc-500">Nation</dt>
              <dd className="font-medium text-zinc-950">{selected.brand.nation}</dd>
            </div>
            <div>
              <dt className="text-ds-label text-zinc-500">Products</dt>
              <dd className="font-medium text-zinc-950 tabular-nums">{selected.products}</dd>
            </div>
            <div>
              <dt className="text-ds-label text-zinc-500">Open purchase orders</dt>
              <dd className="font-medium text-zinc-950 tabular-nums">{selected.openPos}</dd>
            </div>
            <div>
              <dt className="text-ds-label text-zinc-500">PO value</dt>
              <dd className="font-medium text-zinc-950 tabular-nums">
                {formatGbp(selected.poValue)}
              </dd>
            </div>
            <div>
              <dt className="text-ds-label text-zinc-500">Shipments</dt>
              <dd className="font-medium text-zinc-950 tabular-nums">{selected.shipments}</dd>
            </div>
          </dl>
        )}
      </SlideOverDrawer>
    </div>
  );
}