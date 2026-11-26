import {
  EmptyStateBlock,
  ErrorStateBlock,
  InlineStatus,
  MetricStrip,
  ConsoleHeader,
  type MetricItem,
} from '@/next/components/ConsolePrimitives';
import { ConsoleProgressTrack, NoticeBanner, SectionCard } from '@/next/components/ConsoleCharts';

export type OnboardingFilter = 'all' | 'initiated' | 'in_progress' | 'completed';

export interface OnboardingPipelineItem {
  id: string;
  brandId: string;
  businessName: string;
  originLabel: string;
  prospectId?: string;
  applicationId?: string;
  status: string;
  statusLabel: string;
  statusTone: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  stepsDone: number;
  stepsTotal: number;
  initiatedAt: string;
  initiatedBy: string;
  acceptedAt?: string;
  completedAt?: string;
  opportunitySummary?: string;
  poRulesAcknowledgedAt?: string;
  poRulesAcknowledgedBy?: string;
  steps: {
    id: string;
    label: string;
    status: 'pending' | 'in_progress' | 'done';
    completedBy?: string;
  }[];
}

export interface OnboardingPipelineViewProps {
  loading: boolean;
  error: string | null;
  canMutate: boolean;
  persistenceState: string;
  counts: {
    total: number;
    initiated: number;
    active: number;
    completed: number;
  };
  filter: OnboardingFilter;
  onFilterChange: (f: OnboardingFilter) => void;
  rows: OnboardingPipelineItem[];
  openId: string | null;
  onToggleOpen: (id: string) => void;
  notice: string | null;
  actionError: string | null;
  onAccept: (id: string) => void;
  onCompleteStep: (id: string, stepId: string) => void;
  onFinishOnboarding: (id: string) => void;
}

export function OnboardingPipelineView({
  error,
  canMutate,
  persistenceState,
  counts,
  filter,
  onFilterChange,
  rows,
  openId,
  onToggleOpen,
  notice,
  actionError,
  onAccept,
  onCompleteStep,
  onFinishOnboarding,
}: OnboardingPipelineViewProps) {
  const metrics: MetricItem[] = [
    {
      id: 'onb-all',
      label: 'All onboarding',
      value: String(counts.total),
      active: filter === 'all',
      onClick: () => onFilterChange('all'),
    },
    {
      id: 'onb-init',
      label: 'Awaiting acceptance',
      value: String(counts.initiated),
      active: filter === 'initiated',
      onClick: () => onFilterChange('initiated'),
    },
    {
      id: 'onb-active',
      label: 'In progress',
      value: String(counts.active),
      active: filter === 'in_progress',
      onClick: () => onFilterChange('in_progress'),
    },
    {
      id: 'onb-done',
      label: 'Operational',
      value: String(counts.completed),
      active: filter === 'completed',
      onClick: () => onFilterChange('completed'),
    },
  ];

  return (
    <div className="space-y-6">
      <ConsoleHeader
        title="Onboarding Pipeline"
        description="Canonical onboarding records for brands handed off from qualified acquisition opportunities, partner applications, or manual operator creation."
        meta={
          <span className="font-mono">
            Persistence: {persistenceState}
            {persistenceState === 'memory-only' ? ' (session-only)' : ''}
          </span>
        }
      />

      {error && <ErrorStateBlock message={error} />}
      {notice && <NoticeBanner tone="success" message={notice} />}
      {actionError && <NoticeBanner tone="danger" message={actionError} />}

      <MetricStrip items={metrics} columns={4} />

      <SectionCard
        title="Brand onboarding queue"
        description="Expand a record to record brand acceptance, complete ordered steps, and make the brand operational."
      >
        {rows.length === 0 ? (
          <EmptyStateBlock
            title="No onboarding records in this view"
            description="Start onboarding from a qualified acquisition opportunity or approve a partner application."
            actionLabel={filter !== 'all' ? 'Show all' : undefined}
            onAction={filter !== 'all' ? () => onFilterChange('all') : undefined}
          />
        ) : (
          <div className="divide-y divide-hairline-06">
            {rows.map((row) => {
              const isOpen = openId === row.id;
              return (
                <div key={row.id} className="py-3">
                  <button
                    type="button"
                    data-onboarding-row={row.status}
                    onClick={() => onToggleOpen(row.id)}
                    className="w-full flex flex-wrap items-center justify-between gap-3 text-left"
                  >
                    <div className="min-w-0">
                      <div className="text-ds-body font-semibold text-ink-950">{row.businessName}</div>
                      <div className="text-ds-label font-mono text-faint">
                        {row.brandId} · {row.originLabel} · {row.stepsDone}/{row.stepsTotal} steps
                        {row.prospectId ? ` · prospect ${row.prospectId}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-28 hidden sm:block">
                        <ConsoleProgressTrack value={row.stepsDone} max={row.stepsTotal} />
                      </div>
                      <InlineStatus label={row.statusLabel} tone={row.statusTone} />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="mt-4 border border-hairline rounded-ds-sm bg-canvas-70 p-4 space-y-4">
                      {row.opportunitySummary && (
                        <p className="text-ds-label font-mono text-faint">{row.opportunitySummary}</p>
                      )}
                      <ol className="divide-y divide-hairline-06 border border-hairline rounded-ds-sm bg-surface-raised">
                        {row.steps.map((s) => (
                          <li
                            key={s.id}
                            data-onboarding-step={s.id}
                            className="px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-ds-label"
                          >
                            <div>
                              <span className="font-mono text-ds-micro text-faint mr-2">{s.id}</span>
                              <span className="text-ink-900">{s.label}</span>
                              {s.completedBy && (
                                <span className="text-ds-micro text-faint ml-2">by {s.completedBy}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <InlineStatus
                                label={s.status.replace('_', ' ')}
                                tone={
                                  s.status === 'done'
                                    ? 'success'
                                    : s.status === 'in_progress'
                                      ? 'info'
                                      : 'neutral'
                                }
                              />
                              {s.status !== 'done' && row.status !== 'completed' && (
                                <button
                                  type="button"
                                  disabled={!canMutate}
                                  onClick={() => onCompleteStep(row.id, s.id)}
                                  className="px-2.5 py-1 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-micro font-medium hover:bg-surface disabled:opacity-40"
                                >
                                  Complete
                                </button>
                              )}
                            </div>
                          </li>
                        ))}
                      </ol>

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {row.status === 'initiated' && (
                            <button
                              type="button"
                              disabled={!canMutate}
                              onClick={() => onAccept(row.id)}
                              className="px-3 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-label font-medium disabled:opacity-40"
                            >
                              Record acceptance
                            </button>
                          )}
                          {row.status !== 'completed' && (
                            <button
                              type="button"
                              disabled={!canMutate}
                              onClick={() => onFinishOnboarding(row.id)}
                              className="px-3.5 py-1.5 rounded-ds-sm bg-accent text-on-dark text-ds-label font-medium hover:brightness-95 disabled:opacity-40"
                            >
                              Complete onboarding
                            </button>
                          )}
                        </div>
                        <span className="text-ds-micro font-mono text-faint">
                          {row.id} · initiated {row.initiatedAt.slice(0, 10)} by {row.initiatedBy}
                        </span>
                      </div>

                      <div className="text-ds-label">
                        {row.poRulesAcknowledgedAt ? (
                          <InlineStatus
                            label={`PO rules acknowledged ${row.poRulesAcknowledgedAt.slice(0, 10)}${
                              row.poRulesAcknowledgedBy ? ` by ${row.poRulesAcknowledgedBy}` : ''
                            }`}
                            tone="success"
                          />
                        ) : row.status !== 'completed' ? (
                          <InlineStatus
                            label="PO acknowledgement rule pending (acknowledged in brand wizard)"
                            tone="warning"
                          />
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
