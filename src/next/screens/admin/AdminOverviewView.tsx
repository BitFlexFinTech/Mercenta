/**
 * §WAVE 3 (2026-11-25) — the ADMIN portfolio overview (presentation).
 * Pure: every value arrives as a prop; no hooks, no data access.
 */
import { ArrowUpRight } from 'lucide-react';
import {
  ConsoleHeader,
  ConsoleTable,
  ErrorStateBlock,
  InlineStatus,
  LoadingRows,
  MetricStrip,
  type ConsoleColumn,
  type MetricItem,
} from '@/next/components/ConsolePrimitives';
import { SectionCard, formatGbp } from '@/next/components/ConsoleCharts';

export interface AttentionItem {
  id: string;
  brand: string;
  label: string;
  context: string;
  tone: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  /** Absent when no screen can act on it yet — the row is then plain information,
   *  never a link that lands on a placeholder. */
  onClick?: () => void;
}

export interface BrandRow {
  id: string;
  name: string;
  category: string;
  contractStatus: string;
  openPos: number;
  poValue: number;
  complianceLabel: string;
  complianceClear: boolean;
  activeShipments: number;
  openDeductionValue: number;
}

export interface AdminOverviewViewProps {
  brandCount: number;
  portfolioValue: number;
  openPoCount: number;
  inTransitCount: number;
  exceptionCount: number;
  complianceGapCount: number;
  settledCommissionValue: number;
  brandRows: BrandRow[];
  attention: AttentionItem[];
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
  onOpenBrand: (brandId: string) => void;
  onOpenLogistics: () => void;
}

const COLUMNS: ConsoleColumn<BrandRow>[] = [
  {
    key: 'brand',
    header: 'Brand',
    mobilePrimary: true,
    render: (row) => (
      <div className="min-w-0">
        <div className="font-medium text-strong truncate">{row.name}</div>
        <div className="text-ds-label text-faint truncate">{row.category}</div>
      </div>
    ),
  },
  {
    key: 'contract',
    header: 'Contract',
    hideOnMobile: true,
    render: (row) => <span className="text-ds-label text-muted">{row.contractStatus}</span>,
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
    render: (row) => <span className="tabular-nums">{formatGbp(row.poValue)}</span>,
  },
  {
    key: 'compliance',
    header: 'Compliance',
    render: (row) => (
      <InlineStatus
        label={row.complianceClear ? 'Complete' : 'Incomplete'}
        tone={row.complianceClear ? 'success' : 'warning'}
        dataStatus={row.complianceClear ? 'complete' : 'incomplete'}
      />
    ),
  },
  {
    key: 'shipments',
    header: 'In transit',
    align: 'right',
    hideOnMobile: true,
    render: (row) => <span className="tabular-nums">{row.activeShipments}</span>,
  },
  {
    key: 'deductions',
    header: 'Open deductions',
    align: 'right',
    hideOnMobile: true,
    render: (row) => (
      <span className="tabular-nums">
        {row.openDeductionValue > 0 ? formatGbp(row.openDeductionValue) : '—'}
      </span>
    ),
  },
];

export function AdminOverviewView({
  brandCount,
  portfolioValue,
  openPoCount,
  inTransitCount,
  exceptionCount,
  complianceGapCount,
  brandRows,
  attention,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  onOpenBrand,
  onOpenLogistics,
}: AdminOverviewViewProps) {
  const metrics: MetricItem[] = [
    {
      id: 'portfolio-value',
      label: 'Portfolio PO value',
      value: formatGbp(portfolioValue),
      context: `${brandCount} brands`,
    },
    {
      id: 'open-pos',
      label: 'Open purchase orders',
      value: String(openPoCount),
      context: 'Awaiting action or in fulfilment',
    },
    {
      id: 'in-transit',
      label: 'Shipments in transit',
      value: String(inTransitCount),
      context:
        exceptionCount > 0 ? `${exceptionCount} with a carrier exception` : 'No carrier exceptions',
    },
    {
      id: 'compliance-gaps',
      label: 'Compliance gaps',
      value: String(complianceGapCount),
      context:
        complianceGapCount === 0 ? 'Every brand is complete' : 'Brands with missing documents',
    },
  ];

  return (
    <div>
      <ConsoleHeader
        eyebrow="Mercenta · Portfolio"
        title="Portfolio overview"
        description="Every brand, every open order and every shipment that needs attention — in one place."
      />

      {isError ? (
        <ErrorStateBlock
          title="The portfolio could not be loaded"
          message={errorMessage || 'An unexpected error stopped the portfolio from loading.'}
          onRetry={onRetry}
        />
      ) : isLoading ? (
        <LoadingRows rows={6} />
      ) : (
        <>
          <MetricStrip items={metrics} columns={4} />

          <div className="space-y-6">
            <SectionCard
              title="Needs attention"
              description="Acknowledgements due, carrier exceptions and incomplete documentation."
              testId="admin-attention"
            >
              {attention.length === 0 ? (
                <p className="text-ds-body text-muted">Nothing needs attention right now.</p>
              ) : (
                <ul className="divide-y divide-hairline-06">
                  {attention.map((item) => {
                    const body = (
                      <>
                        <div className="min-w-0">
                          <div className="text-ds-body text-strong truncate">{item.label}</div>
                          <div className="text-ds-label text-faint truncate">
                            {item.brand} · {item.context}
                          </div>
                        </div>
                        <span className="flex items-center gap-2 shrink-0">
                          {/* A tone pill only where the row actually goes somewhere;
                              an "Action" label on a row with no action is a false
                              affordance. */}
                          {item.onClick && (
                            <>
                              <InlineStatus
                                label={item.tone === 'danger' ? 'Blocked' : 'Action'}
                                tone={item.tone}
                              />
                              <ArrowUpRight className="w-4 h-4 text-quiet" aria-hidden="true" />
                            </>
                          )}
                        </span>
                      </>
                    );
                    return (
                      <li key={item.id}>
                        {item.onClick ? (
                          <button
                            type="button"
                            onClick={item.onClick}
                            className="w-full flex items-center justify-between gap-3 py-2.5 text-left hover:bg-surface rounded-ds-sm px-1"
                          >
                            {body}
                          </button>
                        ) : (
                          <div className="w-full flex items-center justify-between gap-3 py-2.5 px-1">
                            {body}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </SectionCard>

            <SectionCard
              title="Brands"
              description="Open a brand to work its purchase orders."
              testId="admin-brand-table"
            >
              <ConsoleTable
                rows={brandRows}
                columns={COLUMNS}
                rowKey={(row) => row.id}
                onRowClick={(row) => onOpenBrand(row.id)}
                emptyTitle="No brands yet"
                emptyDescription="Brands appear here once they are onboarded."
              />
            </SectionCard>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onOpenLogistics}
                className="px-3 py-2 text-ds-label font-medium rounded-ds-md border border-hairline-strong bg-surface-raised text-ink-800 hover:bg-surface"
              >
                Open logistics hub
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}