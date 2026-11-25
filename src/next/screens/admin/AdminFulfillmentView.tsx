import { fulfillmentTrackLabel, FULFILLMENT_TRACK_LABELS } from '@/config/fulfillmentTrack';
/**
 * §WAVE 3d (2026-11-25) — ADMIN fulfilment track (presentation).
 *
 * Why a brand is on the track it is on: the domain scores six components and
 * derives the track at a documented threshold. This screen shows that arithmetic
 * per brand, including whether a human overrode it — no score is recomputed here.
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
import { SectionCard, ConsoleProgressTrack } from '@/next/components/ConsoleCharts';
import type { FulfillmentScore, FulfillmentTrack } from '@/types';

export interface AdminFulfillmentRow {
  score: FulfillmentScore;
  brandName: string;
}

export interface AdminFulfillmentViewProps {
  rows: AdminFulfillmentRow[];
  totalScored: number;
  trackOptions: string[];
  search: string;
  trackFilter: string;
  directCount: number;
  financedCount: number;
  overriddenCount: number;
  selected: AdminFulfillmentRow | null;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
  onChangeSearch: (value: string) => void;
  onChangeTrack: (value: string) => void;
  onSelect: (row: AdminFulfillmentRow | null) => void;
}

const COMPONENTS: { key: keyof FulfillmentScore; label: string; max: number }[] = [
  { key: 'tradingHistoryScore', label: 'Trading history', max: 20 },
  { key: 'exportExperienceScore', label: 'Export experience', max: 15 },
  { key: 'scaleScore', label: 'Scale', max: 20 },
  { key: 'workingCapitalScore', label: 'Working capital', max: 20 },
  { key: 'categoryRiskScore', label: 'Category risk', max: 15 },
  { key: 'reliabilityScore', label: 'Reliability once live', max: 10 },
];

export function AdminFulfillmentView({
  rows,
  totalScored,
  trackOptions,
  search,
  trackFilter,
  directCount,
  financedCount,
  overriddenCount,
  selected,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  onChangeSearch,
  onChangeTrack,
  onSelect,
}: AdminFulfillmentViewProps) {
  const metrics: MetricItem[] = [
    { id: 'scored', label: 'Brands scored', value: String(totalScored), context: 'Portfolio total' },
    {
      id: 'direct',
      /* §WAVE 3d — the label comes from the canonical owner, never a local copy:
         the retail channel has its own programme of the same name, which is why
         `src/config/fulfillmentTrack.ts` exists. */
      label: FULFILLMENT_TRACK_LABELS.direct_fulfillment,
      value: String(directCount),
      context: 'Scored at or above the threshold',
      onClick: () => onChangeTrack('direct_fulfillment'),
      active: trackFilter === 'direct_fulfillment',
    },
    {
      id: 'financed',
      label: FULFILLMENT_TRACK_LABELS.financed,
      value: String(financedCount),
      context: 'Below the threshold',
      onClick: () => onChangeTrack('financed'),
      active: trackFilter === 'financed',
    },
    {
      id: 'overridden',
      label: 'Overridden by staff',
      value: String(overriddenCount),
      context: 'Track set by a human decision',
    },
  ];

  const columns: ConsoleColumn<AdminFulfillmentRow>[] = [
    {
      key: 'brand',
      header: 'Brand',
      mobilePrimary: true,
      render: (row) => <span className="font-medium text-zinc-950">{row.brandName}</span>,
    },
    {
      key: 'score',
      header: 'Score',
      align: 'right',
      render: (row) => (
        <span className="tabular-nums font-medium text-zinc-950">
          {row.score.totalScore} / 100
        </span>
      ),
    },
    {
      key: 'track',
      header: 'Track',
      render: (row) => (
        <InlineStatus
          label={fulfillmentTrackLabel(row.score.track)}
          tone={row.score.track === 'direct_fulfillment' ? 'success' : 'info'}
          dataStatus={row.score.track}
        />
      ),
    },
    {
      key: 'override',
      header: 'Override',
      align: 'right',
      render: (row) =>
        row.score.manualOverride ? (
          <InlineStatus label="Set by staff" tone="warning" dataStatus="override" />
        ) : (
          <span className="text-ds-label text-zinc-400">—</span>
        ),
    },
  ];
return (
    <div>
      <ConsoleHeader
        eyebrow="Mercenta · Catalogue & Commerce"
        title="Fulfilment track"
        description="Why each brand is on the track it is on, component by component."
      />

      {isError ? (
        <ErrorStateBlock
          title="Fulfilment scores could not be loaded"
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
              placeholder="Search brand"
              aria-label="Search brands"
              className="px-3 py-2 text-ds-body border border-zinc-300 rounded-ds-md bg-white text-zinc-950 w-64"
            />
            <select
              value={trackFilter}
              onChange={(event) => onChangeTrack(event.target.value)}
              aria-label="Filter by track"
              className="px-3 py-2 text-ds-body border border-zinc-300 rounded-ds-md bg-white text-zinc-950"
            >
              <option value="all">All tracks</option>
              {trackOptions.map((track) => (
                <option key={track} value={track}>
                  {fulfillmentTrackLabel(track as FulfillmentTrack)}
                </option>
              ))}
            </select>
          </div>

          <SectionCard title="Brands" description={`${rows.length} of ${totalScored} shown`}>
            <ConsoleTable
              rows={rows}
              columns={columns}
              rowKey={(row) => row.score.brandId}
              onRowClick={(row) => onSelect(row)}
              emptyTitle="No brands match these filters"
              emptyDescription="Clear the filters to see the whole portfolio."
            />
          </SectionCard>
        </>
      )}

      <SlideOverDrawer
        open={Boolean(selected)}
        onClose={() => onSelect(null)}
        title={selected ? selected.brandName : ''}
        subtitle={selected ? `Total ${selected.score.totalScore} / 100` : undefined}
        testId="admin-fulfillment-drawer"
      >
        {selected && (
          <div className="space-y-4">
            <div className="space-y-3">
              {COMPONENTS.map((component) => {
                const value = selected.score[component.key] as number;
                return (
                  <ConsoleProgressTrack
                    key={String(component.key)}
                    value={value}
                    max={component.max}
                    label={`${component.label} · ${value} of ${component.max}`}
                  />
                );
              })}
            </div>

            <div className="border-t border-zinc-200 pt-3 space-y-1">
              <div className="flex items-center justify-between text-ds-body">
                <span className="text-zinc-600">Derived track</span>
                <span className="font-medium text-zinc-950">
                  {fulfillmentTrackLabel(selected.score.track)}
                </span>
              </div>
              {selected.score.manualOverride && (
                <p className="text-ds-body text-state-warning">
                  Overridden by staff
                  {selected.score.overrideReason ? ` — ${selected.score.overrideReason}` : ''}.
                </p>
              )}
              {!selected.score.manualOverride && (
                <p className="text-ds-label text-zinc-500">
                  Assigned automatically from the score; no human override is recorded.
                </p>
              )}
            </div>
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
}