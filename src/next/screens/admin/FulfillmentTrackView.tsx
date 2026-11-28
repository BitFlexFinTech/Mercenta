import { useState } from 'react';
import {
  ConsoleTable,
  EmptyStateBlock,
  ErrorStateBlock,
  InlineStatus,
  LoadingRows,
  PageHeader,
  SlideOverDrawer,
  type ConsoleColumn,
} from '@/next/components/ConsolePrimitives';
import {
  ConsoleProgressTrack,
  ConsoleTabs,
  NoticeBanner,
  SectionCard,
  formatGbp,
} from '@/next/components/ConsoleCharts';

export type FulfillmentTrackKey = 'direct_fulfillment' | 'financed' | 'unassigned';

export interface FulfillmentRow {
  brandId: string;
  brandName: string;
  category: string;
  totalScore: number;
  track: FulfillmentTrackKey;
  trackLabel: string;
  manualOverride: boolean;
  overrideReason?: string;
  borderline: boolean;
  lastCalculated: string;
  tradingHistoryScore: number;
  exportExperienceScore: number;
  scaleScore: number;
  workingCapitalScore: number;
  categoryRiskScore: number;
  reliabilityScore: number;
}

export interface SimulatorInputState {
  yearsExporting: number;
  priorUkEuExport: boolean;
  hasEori: boolean;
  annualRevenueGbp: number;
  catalogSize: number;
  workingCapitalAnswer: 'yes' | 'partially' | 'no';
  hazmatOrPerishableCategory: boolean;
}

export interface SimulatorOutputState {
  totalScore: number;
  proposedTrack: FulfillmentTrackKey;
  proposedTrackLabel: string;
  needsManualReview: boolean;
  components: { label: string; value: number; max: number }[];
}

export interface FulfillmentTrackViewProps {
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  rows: FulfillmentRow[];
  filteredRows: FulfillmentRow[];
  trackFilter: FulfillmentTrackKey | 'all';
  onTrackFilterChange: (t: FulfillmentTrackKey | 'all') => void;
  minScore: string;
  onMinScoreChange: (v: string) => void;
  maxScore: string;
  onMaxScoreChange: (v: string) => void;
  recalcMessage: string | null;
  onBulkRecalculate: () => void;
  selectedRow: FulfillmentRow | null;
  onSelectRow: (brandId: string | null) => void;
  onApplyOverride: (brandId: string, track: FulfillmentTrackKey, reason: string) => void;
  simulatorInputs: SimulatorInputState;
  onSimulatorInputsChange: (next: SimulatorInputState) => void;
  simulatorOutput: SimulatorOutputState;
  trackOptions: { value: FulfillmentTrackKey; label: string }[];
}

export function FulfillmentTrackView({
  loading,
  error,
  onRetry,
  rows,
  filteredRows,
  trackFilter,
  onTrackFilterChange,
  minScore,
  onMinScoreChange,
  maxScore,
  onMaxScoreChange,
  recalcMessage,
  onBulkRecalculate,
  selectedRow,
  onSelectRow,
  onApplyOverride,
  simulatorInputs,
  onSimulatorInputsChange,
  simulatorOutput,
  trackOptions,
}: FulfillmentTrackViewProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'compare' | 'simulator' | 'history'>('list');
  const [historyBrandId, setHistoryBrandId] = useState<string>('');
  const [overrideTrack, setOverrideTrack] = useState<FulfillmentTrackKey>('direct_fulfillment');
  const [overrideReason, setOverrideReason] = useState('');

  function openBrand(row: FulfillmentRow) {
    setOverrideTrack(row.track);
    setOverrideReason(row.overrideReason ?? '');
    onSelectRow(row.brandId);
  }

  const columns: ConsoleColumn<FulfillmentRow>[] = [
    {
      key: 'brand',
      header: 'Brand',
      mobilePrimary: true,
      render: (r) => <span className="font-medium text-ink-950">{r.brandName}</span>,
    },
    {
      key: 'category',
      header: 'Category',
      render: (r) => <span className="text-[12px] text-ink-600">{r.category}</span>,
    },
    {
      key: 'totalScore',
      header: 'Score',
      align: 'right',
      render: (r) => (
        <span className={`font-mono font-semibold ${r.borderline ? 'text-state-warning' : 'text-ink-950'}`}>
          {r.totalScore}
        </span>
      ),
    },
    {
      key: 'track',
      header: 'Track',
      render: (r) => (
        <InlineStatus
          label={r.trackLabel}
          tone={
            r.track === 'direct_fulfillment'
              ? 'success'
              : r.track === 'financed'
                ? 'info'
                : 'neutral'
          }
        />
      ),
    },
    {
      key: 'status',
      header: 'Review status',
      render: (r) =>
        r.borderline ? (
          <InlineStatus label="Needs review" tone="warning" />
        ) : r.manualOverride ? (
          <InlineStatus label="Manual override" tone="info" />
        ) : (
          <span className="text-[12px] text-faint">Auto</span>
        ),
    },
    {
      key: 'lastCalculated',
      header: 'Calculated',
      align: 'right',
      hideOnMobile: true,
      render: (r) => <span className="font-mono text-[12px] text-faint">{r.lastCalculated}</span>,
    },
  ];

  const historyTarget = rows.find((r) => r.brandId === historyBrandId) ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fulfillment Track"
        description="Auto-scored brand placement — Brand-direct supply vs Financed, per brand."
        actions={
          <button
            type="button"
            onClick={onBulkRecalculate}
            className="px-3.5 py-2 rounded border border-hairline-strong bg-surface-raised text-[12px] font-medium text-ink-900 hover:bg-surface"
          >
            Bulk recalculate
          </button>
        }
      />

      {error && <ErrorStateBlock message={error} onRetry={onRetry} />}
      {recalcMessage && <NoticeBanner tone="success" message={recalcMessage} />}

      <ConsoleTabs
        tabs={[
          { id: 'list', label: 'Scorecard list', count: filteredRows.length },
          { id: 'compare', label: 'Compare matrix', count: rows.length },
          { id: 'simulator', label: 'What-if simulator' },
          { id: 'history', label: 'Score breakdown' },
        ]}
        value={activeTab}
        onChange={setActiveTab}
        ariaLabel="Fulfillment track views"
      />

      {activeTab === 'list' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-[13px]">
            <select
              value={trackFilter}
              onChange={(e) => onTrackFilterChange(e.target.value as FulfillmentTrackKey | 'all')}
              className="rounded border border-hairline-strong bg-surface-raised px-2.5 py-1.5 text-ink-900"
            >
              <option value="all">All tracks</option>
              {trackOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 text-ink-600">
              <span>Score ≥</span>
              <input
                type="number"
                value={minScore}
                onChange={(e) => onMinScoreChange(e.target.value)}
                placeholder="0"
                className="w-16 rounded border border-hairline-strong bg-surface-raised px-2 py-1 font-mono text-ink-900"
              />
            </label>
            <label className="flex items-center gap-1.5 text-ink-600">
              <span>Score ≤</span>
              <input
                type="number"
                value={maxScore}
                onChange={(e) => onMaxScoreChange(e.target.value)}
                placeholder="100"
                className="w-16 rounded border border-hairline-strong bg-surface-raised px-2 py-1 font-mono text-ink-900"
              />
            </label>
            <span className="ml-auto font-mono text-[12px] text-faint">
              {filteredRows.length} of {rows.length} brands
            </span>
          </div>

          {loading ? (
            <LoadingRows rows={5} label="Loading fulfilment scores…" />
          ) : filteredRows.length === 0 ? (
            <EmptyStateBlock
              title="No brands match"
              description="Adjust track or score range filters."
              actionLabel="Clear filters"
              onAction={() => {
                onTrackFilterChange('all');
                onMinScoreChange('');
                onMaxScoreChange('');
              }}
            />
          ) : (
            <ConsoleTable
              rows={filteredRows}
              columns={columns}
              rowKey={(r) => r.brandId}
              selectedKey={selectedRow?.brandId ?? null}
              onRowClick={openBrand}
              testId="fulfillment-scores"
            />
          )}
        </div>
      )}

      {activeTab === 'compare' && (
        <SectionCard title="Score comparison matrix">
          <ConsoleTable
            rows={rows}
            rowKey={(r) => r.brandId}
            onRowClick={openBrand}
            columns={[
              {
                key: 'brand',
                header: 'Brand',
                mobilePrimary: true,
                render: (r) => <span className="font-medium text-ink-950">{r.brandName}</span>,
              },
              { key: 'total', header: 'Total', align: 'right', render: (r) => <span className="font-mono">{r.totalScore}</span> },
              { key: 'hist', header: 'History', align: 'right', render: (r) => <span className="font-mono">{r.tradingHistoryScore}/20</span> },
              { key: 'exp', header: 'Export', align: 'right', render: (r) => <span className="font-mono">{r.exportExperienceScore}/15</span> },
              { key: 'scale', header: 'Scale', align: 'right', render: (r) => <span className="font-mono">{r.scaleScore}/20</span> },
              { key: 'wc', header: 'Working Cap', align: 'right', render: (r) => <span className="font-mono">{r.workingCapitalScore}/20</span> },
              { key: 'cat', header: 'Category', align: 'right', render: (r) => <span className="font-mono">{r.categoryRiskScore}/15</span> },
              { key: 'rel', header: 'Reliability', align: 'right', render: (r) => <span className="font-mono">{r.reliabilityScore}/10</span> },
              {
                key: 'track',
                header: 'Track',
                render: (r) => <InlineStatus label={r.trackLabel} tone={r.track === 'direct_fulfillment' ? 'success' : 'info'} />,
              },
            ]}
          />
        </SectionCard>
      )}

      {activeTab === 'simulator' && (
        <SectionCard
          title="What-if scoring simulator"
          description="Adjust scoring inputs to preview the deterministic track assignment without writing any record."
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-3 text-[13px]">
              <label className="block space-y-1">
                <span className="text-ink-600">Years exporting</span>
                <input
                  type="number"
                  value={simulatorInputs.yearsExporting}
                  onChange={(e) =>
                    onSimulatorInputsChange({ ...simulatorInputs, yearsExporting: Number(e.target.value) })
                  }
                  className="w-full rounded border border-hairline-strong px-2.5 py-1.5 font-mono"
                />
              </label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={simulatorInputs.priorUkEuExport}
                    onChange={(e) =>
                      onSimulatorInputsChange({ ...simulatorInputs, priorUkEuExport: e.target.checked })
                    }
                  />
                  Prior UK/EU export
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={simulatorInputs.hasEori}
                    onChange={(e) =>
                      onSimulatorInputsChange({ ...simulatorInputs, hasEori: e.target.checked })
                    }
                  />
                  Has EORI number
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={simulatorInputs.hazmatOrPerishableCategory}
                    onChange={(e) =>
                      onSimulatorInputsChange({
                        ...simulatorInputs,
                        hazmatOrPerishableCategory: e.target.checked,
                      })
                    }
                  />
                  Hazmat / perishable category
                </label>
              </div>
              <label className="block space-y-1">
                <span className="text-ink-600">Annual revenue (GBP)</span>
                <input
                  type="number"
                  value={simulatorInputs.annualRevenueGbp}
                  onChange={(e) =>
                    onSimulatorInputsChange({ ...simulatorInputs, annualRevenueGbp: Number(e.target.value) })
                  }
                  className="w-full rounded border border-hairline-strong px-2.5 py-1.5 font-mono"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-ink-600">Catalog size (SKUs)</span>
                <input
                  type="number"
                  value={simulatorInputs.catalogSize}
                  onChange={(e) =>
                    onSimulatorInputsChange({ ...simulatorInputs, catalogSize: Number(e.target.value) })
                  }
                  className="w-full rounded border border-hairline-strong px-2.5 py-1.5 font-mono"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-ink-600">Working capital (30–90 days)</span>
                <select
                  value={simulatorInputs.workingCapitalAnswer}
                  onChange={(e) =>
                    onSimulatorInputsChange({
                      ...simulatorInputs,
                      workingCapitalAnswer: e.target.value as 'yes' | 'partially' | 'no',
                    })
                  }
                  className="w-full rounded border border-hairline-strong px-2.5 py-1.5"
                >
                  <option value="yes">Yes</option>
                  <option value="partially">Partially</option>
                  <option value="no">No</option>
                </select>
              </label>
            </div>

            <div className="space-y-4">
              <div className="border border-hairline rounded p-4 text-center bg-surface/50">
                <div className="text-[36px] font-semibold font-mono text-ink-950">
                  {simulatorOutput.totalScore}
                </div>
                <div className="text-[12px] text-faint">Projected Total Score</div>
                <div className="mt-2">
                  <InlineStatus
                    label={simulatorOutput.proposedTrackLabel}
                    tone={simulatorOutput.proposedTrack === 'direct_fulfillment' ? 'success' : 'info'}
                  />
                </div>
                {simulatorOutput.needsManualReview && (
                  <p className="mt-2 text-[12px] text-state-warning">
                    Borderline score (55–74) — held for manual review
                  </p>
                )}
              </div>
              <div className="space-y-2.5">
                {simulatorOutput.components.map((c) => (
                  <ConsoleProgressTrack
                    key={c.label}
                    label={`${c.label} (${c.value}/${c.max})`}
                    value={c.value}
                    max={c.max}
                  />
                ))}
              </div>
            </div>
          </div>
        </SectionCard>
      )}

      {activeTab === 'history' && (
        <SectionCard title="Score history snapshot" description="Score breakdown tracked across recalculations.">
          <div className="space-y-4">
            <select
              value={historyBrandId}
              onChange={(e) => setHistoryBrandId(e.target.value)}
              className="rounded border border-hairline-strong bg-surface-raised px-2.5 py-1.5 text-[13px]"
            >
              <option value="">Select a brand…</option>
              {rows.map((r) => (
                <option key={r.brandId} value={r.brandId}>
                  {r.brandName} ({r.totalScore})
                </option>
              ))}
            </select>
            {historyTarget && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[13px]">
                <div className="border border-hairline rounded p-3">
                  <div className="text-faint text-[11px] uppercase">Total</div>
                  <div className="font-mono font-semibold text-ink-950">{historyTarget.totalScore}</div>
                </div>
                <div className="border border-hairline rounded p-3">
                  <div className="text-faint text-[11px] uppercase">Track</div>
                  <div className="text-ink-950">{historyTarget.trackLabel}</div>
                </div>
                <div className="border border-hairline rounded p-3">
                  <div className="text-faint text-[11px] uppercase">History / Export</div>
                  <div className="font-mono">
                    {historyTarget.tradingHistoryScore}/20 · {historyTarget.exportExperienceScore}/15
                  </div>
                </div>
                <div className="border border-hairline rounded p-3">
                  <div className="text-faint text-[11px] uppercase">Last run</div>
                  <div className="font-mono">{historyTarget.lastCalculated}</div>
                </div>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      <SlideOverDrawer
        open={Boolean(selectedRow)}
        onClose={() => onSelectRow(null)}
        title={selectedRow?.brandName ?? 'Brand scorecard'}
        subtitle={
          selectedRow ? `${selectedRow.category} · Calculated ${selectedRow.lastCalculated}` : undefined
        }
      >
        {selectedRow && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border border-hairline rounded p-4 bg-surface">
              <div>
                <div className="text-[11px] uppercase tracking-[0.06em] text-faint">Total score</div>
                <div className="text-[28px] font-semibold font-mono text-ink-950">
                  {selectedRow.totalScore} / 100
                </div>
              </div>
              <div className="text-right space-y-1">
                <InlineStatus
                  label={selectedRow.trackLabel}
                  tone={selectedRow.track === 'direct_fulfillment' ? 'success' : 'info'}
                />
                {selectedRow.borderline && (
                  <div>
                    <InlineStatus label="Borderline (55–74): Needs review" tone="warning" />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-[13px] font-semibold text-ink-950">Score breakdown</h3>
              <ConsoleProgressTrack
                label={`Trading history (${selectedRow.tradingHistoryScore}/20)`}
                value={selectedRow.tradingHistoryScore}
                max={20}
              />
              <ConsoleProgressTrack
                label={`Export experience (${selectedRow.exportExperienceScore}/15)`}
                value={selectedRow.exportExperienceScore}
                max={15}
              />
              <ConsoleProgressTrack
                label={`Scale (${selectedRow.scaleScore}/20)`}
                value={selectedRow.scaleScore}
                max={20}
              />
              <ConsoleProgressTrack
                label={`Working capital (${selectedRow.workingCapitalScore}/20)`}
                value={selectedRow.workingCapitalScore}
                max={20}
              />
              <ConsoleProgressTrack
                label={`Category risk (${selectedRow.categoryRiskScore}/15)`}
                value={selectedRow.categoryRiskScore}
                max={15}
              />
              <ConsoleProgressTrack
                label={`Reliability (${selectedRow.reliabilityScore}/10)`}
                value={selectedRow.reliabilityScore}
                max={10}
              />
            </div>

            <div className="border-t border-hairline pt-4 space-y-3">
              <h3 className="text-[13px] font-semibold text-ink-950">Manual track override</h3>
              <p className="text-[12px] text-ink-600">
                Overrides take precedence over the auto-scoring engine and are logged to the audit trail.
              </p>
              <select
                value={overrideTrack}
                onChange={(e) => setOverrideTrack(e.target.value as FulfillmentTrackKey)}
                className="w-full rounded border border-hairline-strong bg-surface-raised px-2.5 py-2 text-[13px]"
              >
                {trackOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Reason (required — logged to audit trail)"
                className="w-full rounded border border-hairline-strong px-2.5 py-2 text-[13px]"
              />
              <button
                type="button"
                disabled={!overrideReason.trim()}
                onClick={() => onApplyOverride(selectedRow.brandId, overrideTrack, overrideReason)}
                className="px-4 py-2 rounded bg-[var(--mr-accent)] text-on-dark text-[12px] font-medium hover:bg-[var(--mr-accent-600)] disabled:opacity-40"
              >
                Apply override
              </button>
            </div>

            {selectedRow.track === 'financed' && (
              <div className="border-t border-hairline pt-4 space-y-2 text-[13px]">
                <h3 className="font-semibold text-ink-950">Financing status</h3>
                <p className="text-[12px] text-faint">
                  PO Finance Facility A · Drawn: {formatGbp(0)} · Headroom unallocated until external credit provider is connected.
                </p>
              </div>
            )}
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
}
