import { useState } from 'react';
import type { TourDefinition } from '@/config/tours/tourDefinitions';
import {
  EmptyStateBlock,
  InlineStatus,
  MetricStrip,
  SlideOverDrawer,
} from '@/next/components/ConsolePrimitives';
import { ConsolePageHeader } from '@/next/components/ConsolePageHeader';
import { SectionCard } from '@/next/components/ConsoleCharts';

export type TourStatusFilter = 'all' | 'published' | 'draft' | 'required';

export interface AdminUsertourViewProps {
  totalTours: number;
  publishedCount: number;
  requiredCount: number;
  draftCount: number;
  tours: TourDefinition[];
  tourQuery: string;
  onTourQueryChange: (next: string) => void;
  tourStatus: TourStatusFilter;
  onTourStatusChange: (next: TourStatusFilter) => void;
  onResetFilters: () => void;
}

export function AdminUsertourView({
  totalTours,
  publishedCount,
  requiredCount,
  draftCount,
  tours,
  tourQuery,
  onTourQueryChange,
  tourStatus,
  onTourStatusChange,
  onResetFilters,
}: AdminUsertourViewProps) {
  const [previewTour, setPreviewTour] = useState<TourDefinition | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [expandedTourId, setExpandedTourId] = useState<string | null>(null);

  const step = previewTour?.steps[stepIndex] ?? null;

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        title="Onboarding Tours"
        description="Guided brand portal walkthroughs rendered by TourEngine at runtime. Inspect triggers and preview each step."
        meta={
          <>
            <span>{totalTours} tours</span>
            <span>{publishedCount} auto-start</span>
            <span>{requiredCount} required</span>
          </>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={tourQuery}
              onChange={(e) => onTourQueryChange(e.target.value)}
              placeholder="Search tours…"
              aria-label="Search onboarding tours"
              className="w-52 px-2.5 py-1.5 rounded border border-hairline-strong bg-surface-raised text-[12px] text-ink-950"
            />
            <select
              value={tourStatus}
              onChange={(e) => onTourStatusChange(e.target.value as TourStatusFilter)}
              aria-label="Filter tours by status"
              className="px-2.5 py-1.5 rounded border border-hairline-strong bg-surface-raised text-[12px] text-ink-950"
            >
              <option value="all">Status: all</option>
              <option value="published">Published</option>
              <option value="required">Required (force-first)</option>
              <option value="draft">Draft (on request)</option>
            </select>
          </div>
        }
      />

      <MetricStrip
        columns={4}
        items={[
          {
            id: 'tours-total',
            label: 'Total tours',
            value: String(totalTours),
            context: `${tours.length} in view`,
            active: tourStatus === 'all',
            onClick: onResetFilters,
          },
          {
            id: 'tours-published',
            label: 'Auto-start (Published)',
            value: String(publishedCount),
            context: 'Launch automatically',
            active: tourStatus === 'published',
            onClick: () => onTourStatusChange('published'),
          },
          {
            id: 'tours-required',
            label: 'Required (Force-first)',
            value: String(requiredCount),
            context: 'Completed before others',
            active: tourStatus === 'required',
            onClick: () => onTourStatusChange('required'),
          },
          {
            id: 'tours-draft',
            label: 'Draft',
            value: String(draftCount),
            context: 'Available on request only',
            active: tourStatus === 'draft',
            onClick: () => onTourStatusChange('draft'),
          },
        ]}
      />

      <SectionCard
        title="Tour Catalogue"
        description="Definitions shared with the brand portal TourEngine runtime."
      >
        {tours.length === 0 ? (
          <EmptyStateBlock
            title="No tours match"
            description="Reset the status filter or search query to inspect all tours."
            actionLabel="Show all tours"
            onAction={onResetFilters}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tours.map((t) => {
              const stepsOpen = expandedTourId === t.id;
              return (
                <div
                  key={t.id}
                  className="border border-hairline rounded-md bg-surface-raised p-4 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-[14px] font-semibold text-ink-950">{t.name}</h3>
                      <InlineStatus
                        label={t.autoStart ? 'Published' : 'Draft'}
                        tone={t.autoStart ? 'success' : 'neutral'}
                      />
                    </div>
                    <p className="text-[12px] text-ink-600">{t.description}</p>
                    <div className="text-[11px] font-mono text-faint">
                      {t.steps.length} steps
                      {t.forceFirst ? ' · Required' : ''}
                      {t.autoStartViews?.length
                        ? ` · Triggers: ${t.autoStartViews.join(', ')}`
                        : ''}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-hairline space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setExpandedTourId(stepsOpen ? null : t.id)}
                        className="text-[12px] text-ink-600 hover:text-ink-950"
                      >
                        {stepsOpen ? 'Hide steps' : `Inspect ${t.steps.length} steps`}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStepIndex(0);
                          setPreviewTour(t);
                        }}
                        className="px-2.5 py-1 rounded border border-hairline-strong bg-surface-raised text-[12px] font-medium text-ink-900 hover:bg-surface"
                      >
                        Preview
                      </button>
                    </div>
                    {stepsOpen && (
                      <ol className="list-decimal pl-4 space-y-1 text-[11px] text-ink-600">
                        {t.steps.map((s) => (
                          <li key={s.id}>
                            <span className="font-medium text-ink-900">{s.title}</span> —{' '}
                            {s.description.slice(0, 68)}
                            {s.description.length > 68 ? '…' : ''}
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <SlideOverDrawer
        open={previewTour !== null}
        onClose={() => setPreviewTour(null)}
        title={previewTour?.name ?? ''}
        subtitle={
          previewTour ? `Step ${stepIndex + 1} of ${previewTour.steps.length}` : undefined
        }
        testId="tour-preview-drawer"
        footer={
          previewTour ? (
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setPreviewTour(null)}
                className="px-3 py-1.5 rounded border border-hairline-strong bg-surface-raised text-[12px] text-secondary"
              >
                Close
              </button>
              <div className="flex items-center gap-2">
                {stepIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                    className="px-3 py-1.5 rounded border border-hairline-strong bg-surface-raised text-[12px] text-ink-800"
                  >
                    Previous
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (stepIndex < previewTour.steps.length - 1) {
                      setStepIndex((i) => i + 1);
                    } else {
                      setPreviewTour(null);
                    }
                  }}
                  className="px-3.5 py-1.5 rounded bg-[var(--mr-accent)] text-on-dark text-[12px] font-medium hover:bg-[var(--mr-accent-600)]"
                >
                  {stepIndex < previewTour.steps.length - 1 ? 'Next step' : 'Done'}
                </button>
              </div>
            </div>
          ) : undefined
        }
      >
        {previewTour && step && (
          <div className="space-y-4">
            <div className="border border-hairline rounded-md p-4 bg-surface/60 space-y-2">
              <div className="text-[11px] font-mono text-faint">
                Position: {step.position}
              </div>
              <h3 className="text-[15px] font-semibold text-ink-950">{step.title}</h3>
              <p className="text-[13px] text-secondary leading-relaxed">{step.description}</p>
            </div>
            <div className="border border-hairline rounded-md p-3 text-[12px]">
              <div className="text-faint mb-1">Target selector</div>
              <code className="font-mono text-[var(--mr-accent)]">{step.targetSelector}</code>
            </div>
            <ol className="list-decimal pl-5 space-y-1 text-[12px] text-ink-600">
              {previewTour.steps.map((s, idx) => (
                <li
                  key={s.id}
                  className={idx === stepIndex ? 'font-semibold text-ink-950' : ''}
                >
                  {s.title}
                </li>
              ))}
            </ol>
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
}
