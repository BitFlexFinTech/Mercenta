/**
 * §WAVE 3f (2026-11-25) — ADMIN monitoring (presentation).
 *
 * Honesty is the whole point of this screen. `src/lib/monitoring/health.ts` exists
 * because an older dashboard INVENTED a database/Edge-Function response time; it
 * computes a deterministic readiness from the integration modes the client actually
 * holds and states what it cannot see. This screen renders that, and says the same
 * thing on the page.
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
import { NoticeBanner, SectionCard } from '@/next/components/ConsoleCharts';
import type { HealthResult } from '@/lib/monitoring/health';
import { INTEGRATION_MODE_LABELS } from '@/integrations/types';
import type { ProviderResolutionMode } from '@/integrations/types';

export interface AdminProviderRow {
  id: string;
  label: string;
  category: string;
  mode: ProviderResolutionMode;
  needsAttention: boolean;
  secretName?: string;
}

export interface AdminMonitoringViewProps {
  rows: AdminProviderRow[];
  readiness: HealthResult;
  totalProviders: number;
  categoryOptions: string[];
  modeOptions: string[];
  categoryFilter: string;
  modeFilter: string;
  attentionOnly: boolean;
  liveCount: number;
  simulationCount: number;
  attentionCount: number;
  selected: AdminProviderRow | null;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
  onChangeCategory: (value: string) => void;
  onChangeMode: (value: string) => void;
  onToggleAttention: () => void;
  onSelect: (row: AdminProviderRow | null) => void;
}

/** The two states that sit outside `IntegrationMode` itself. */
const EXTRA_MODE_LABELS: Record<'unknown' | 'not_registered', string> = {
  unknown: 'Unknown — failing closed',
  not_registered: 'Not registered',
};

/** The canonical label for a resolved mode, including the two states outside it. */
export function modeLabel(mode: ProviderResolutionMode): string {
  if (mode === 'unknown' || mode === 'not_registered') return EXTRA_MODE_LABELS[mode];
  return INTEGRATION_MODE_LABELS[mode];
}

export function AdminMonitoringView({
  rows,
  readiness,
  totalProviders,
  categoryOptions,
  modeOptions,
  categoryFilter,
  modeFilter,
  attentionOnly,
  liveCount,
  simulationCount,
  attentionCount,
  selected,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  onChangeCategory,
  onChangeMode,
  onToggleAttention,
  onSelect,
}: AdminMonitoringViewProps) {
  const metrics: MetricItem[] = [
    {
      id: 'providers',
      label: 'Integrations',
      value: String(totalProviders),
      context: 'Registered with the platform',
    },
    {
      id: 'attention',
      label: 'Needing attention',
      value: String(attentionCount),
      context: attentionCount > 0 ? 'Degraded or erroring' : 'None degraded or erroring',
      onClick: onToggleAttention,
      active: attentionOnly,
    },
    { id: 'live', label: 'Live', value: String(liveCount), context: 'Genuinely connected' },
    {
      id: 'simulation',
      label: 'Simulated',
      value: String(simulationCount),
      context: 'Usable, and labelled as simulation',
    },
  ];

  const columns: ConsoleColumn<AdminProviderRow>[] = [
    {
      key: 'provider',
      header: 'Integration',
      mobilePrimary: true,
      render: (row) => (
        <div className="min-w-0">
          <div className="font-medium text-zinc-950 truncate">{row.label}</div>
          <div className="text-ds-label text-zinc-500 truncate">{row.category}</div>
        </div>
      ),
    },
    {
      key: 'mode',
      header: 'Mode',
      render: (row) => (
        <InlineStatus
          label={modeLabel(row.mode)}
          tone={row.needsAttention ? 'danger' : row.mode === 'live' ? 'success' : 'neutral'}
          dataStatus={String(row.mode)}
        />
      ),
    },
    {
      key: 'secret',
      header: 'Server secret',
      hideOnMobile: true,
      render: (row) => (
        <span className="font-mono text-ds-label text-zinc-600">{row.secretName ?? 'Not needed'}</span>
      ),
    },
  ];
return (
    <div>
      <ConsoleHeader
        eyebrow="Mercenta · Governance & Support"
        title="Monitoring"
        description="The readiness the client can honestly see: the environment, and the mode every integration resolves to."
      />

      {isError ? (
        <ErrorStateBlock
          title="Integration modes could not be read"
          message={errorMessage}
          onRetry={onRetry}
        />
      ) : isLoading ? (
        <LoadingRows rows={8} />
      ) : (
        <>
          <div className="mb-6 space-y-3">
            <NoticeBanner
              tone={readiness.healthy ? 'success' : readiness.severity === 'critical' ? 'danger' : 'warning'}
              title={readiness.healthy ? 'Client readiness: healthy' : 'Client readiness: attention needed'}
              message={readiness.summary}
            />
            {/* The health module's own limitation, stated on the page: a browser
                cannot probe the database or the Edge Functions, so this screen never
                claims it did. */}
            <p className="text-ds-label text-zinc-500">
              A browser cannot probe the database or the Edge Functions, so this view never
              reports their response times. It reflects the mode each integration resolves to in
              the current environment.
            </p>
          </div>

          <MetricStrip items={metrics} columns={4} />

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(event) => onChangeCategory(event.target.value)}
              aria-label="Filter by category"
              className="px-3 py-2 text-ds-body border border-zinc-300 rounded-ds-md bg-white text-zinc-950"
            >
              <option value="all">All categories</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <select
              value={modeFilter}
              onChange={(event) => onChangeMode(event.target.value)}
              aria-label="Filter by mode"
              className="px-3 py-2 text-ds-body border border-zinc-300 rounded-ds-md bg-white text-zinc-950"
            >
              <option value="all">All modes</option>
              {modeOptions.map((mode) => (
                <option key={mode} value={mode}>
                  {modeLabel(mode as ProviderResolutionMode)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onToggleAttention}
              aria-pressed={attentionOnly}
              className={`px-3 py-2 text-ds-label font-medium rounded-ds-md border ${
                attentionOnly
                  ? 'border-zinc-900 bg-zinc-950 text-white'
                  : 'border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50'
              }`}
            >
              Needs attention only
            </button>
          </div>

          <SectionCard title="Integrations" description={`${rows.length} of ${totalProviders} shown`}>
            <ConsoleTable
              rows={rows}
              columns={columns}
              rowKey={(row) => row.id}
              onRowClick={(row) => onSelect(row)}
              emptyTitle="No integrations match these filters"
              emptyDescription="Clear the filters to see every registered integration."
            />
          </SectionCard>
        </>
      )}

      <SlideOverDrawer
        open={Boolean(selected)}
        onClose={() => onSelect(null)}
        title={selected ? selected.label : ''}
        subtitle={selected ? selected.category : undefined}
        testId="admin-monitoring-drawer"
      >
        {selected && (
          <dl className="grid grid-cols-2 gap-3 text-ds-body">
            <div>
              <dt className="text-ds-label text-zinc-500">Resolved mode</dt>
              <dd className="font-medium text-zinc-950">{modeLabel(selected.mode)}</dd>
            </div>
            <div>
              <dt className="text-ds-label text-zinc-500">Needs attention</dt>
              <dd className="font-medium text-zinc-950">{selected.needsAttention ? 'Yes' : 'No'}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-ds-label text-zinc-500">Server-side secret</dt>
              <dd className="font-mono text-ds-label text-zinc-950">
                {selected.secretName ?? 'This provider needs no secret'}
              </dd>
            </div>
          </dl>
        )}
      </SlideOverDrawer>
    </div>
  );
}