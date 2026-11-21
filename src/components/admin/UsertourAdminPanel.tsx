/**
 * §Multi-tour — Admin tour management panel.
 *
 * Lists all 9 built-in brand tours with status info (auto-start, force-first,
 * step count, target roles/views) and a preview action. Internal tool.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Button, Badge } from '@/components/ui';
import { cn } from '@/utils/cn';
import { Layers, Eye, ChevronDown, ChevronUp, X, HelpCircle, CheckCircle2, ChevronRight } from 'lucide-react';
import { ALL_TOUR_DEFINITIONS, TOUR_REGISTRY, type TourDefinition, type TourStep } from '@/config/tours/tourDefinitions';
import {
  ContextPanel,
  MetricBand,
  WorkspaceFrame,
  WorkspaceHeader,
  WorkspaceSection,
  type MetricTileData,
} from '@/components/shared/workspace';

/* ── Step-list collapsible ──────────────────────────────────────── */

function StepList({ steps }: { steps: TourDefinition['steps'] }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-ds-micro text-muted hover:text-strong transition-colors"
      >
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {steps.length} step{steps.length !== 1 ? 's' : ''}
      </button>
      {open && (
        <ol className="mt-2 space-y-1.5 pl-4 list-decimal">
          {steps.map((s) => (
            <li key={s.id} className="text-ds-micro text-muted leading-relaxed">
              <span className="text-strong">{s.title}</span>
              <span className="text-muted"> — {s.description.slice(0, 60)}{s.description.length > 60 ? '…' : ''}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/* ── Tour card ──────────────────────────────────────────────────── */

function TourCard({ tour }: { tour: TourDefinition }) {
  return (
    <div className="relative flex flex-col rounded-ds-lg bg-surface-raised border border-hairline overflow-hidden transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-ds-raised">
      {/* Preview area — step count summary */}
      <div className="flex min-h-0 flex-1 items-center justify-center bg-tint border-b border-hairline px-4 py-6">
        <div className="text-center">
          <Layers className="w-8 h-8 text-accent-400/60 mx-auto mb-2" />
          <div className="text-ds-label text-muted">{tour.steps.length} guided steps</div>
          {tour.autoStartViews && tour.autoStartViews.length > 0 && (
            <div className="text-ds-micro text-faint mt-1">
              Triggers on: {tour.autoStartViews.join(', ')}
            </div>
          )}
        </div>
      </div>

      {/* Footer — name + status + actions */}
      <div className="flex flex-none flex-col gap-1.5 px-4 py-3">
        {/* Row 1: name + status */}
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-strong">
            {tour.name}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            <span className={cn('w-1.5 h-1.5 rounded-full', tour.autoStart ? 'bg-emerald-400' : 'bg-state-muted/40')} />
            <span className={cn('text-ds-micro font-medium', tour.autoStart ? 'text-state-success' : 'text-muted')}>
              {tour.autoStart ? 'Published' : 'Draft'}
            </span>
          </span>
        </div>

        {/* Row 2: badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {tour.forceFirst && (
            <Badge className="text-ds-micro bg-state-warning/10 text-state-warning border-state-warning/20">Required</Badge>
          )}
          {tour.autoStartViews && tour.autoStartViews.length > 0 && (
            <Badge className="text-ds-micro bg-state-info/10 text-state-info border-state-info/20">
              {tour.autoStartViews.length} trigger{tour.autoStartViews.length !== 1 ? 's' : ''}
            </Badge>
          )}
          <Badge className="text-ds-micro bg-tint text-muted border-hairline">
            {tour.steps.length} step{tour.steps.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Row 3: description + actions */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-ds-micro text-muted leading-relaxed flex-1 line-clamp-2">
            {tour.description}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              className="text-ds-micro px-2 py-1"
              onClick={() => window.dispatchEvent(new CustomEvent('tour:preview', { detail: { tourId: tour.id } }))}
            >
              <Eye className="w-3 h-3" />
              Preview
            </Button>
          </div>
        </div>

        {/* Row 4: step detail collapsible */}
        <StepList steps={tour.steps} />
      </div>
    </div>
  );
}

/* ── Tour preview modal ──────────────────────────────────────────── */

function TourPreviewModal({ tour, onClose }: { tour: TourDefinition; onClose: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = tour.steps[stepIndex];
  const isLast = stepIndex === tour.steps.length - 1;

  const handleNext = useCallback(() => {
    if (stepIndex < tour.steps.length - 1) setStepIndex((i) => i + 1);
    else onClose();
  }, [stepIndex, tour.steps.length, onClose]);

  const handlePrev = useCallback(() => {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  }, [stepIndex]);

  // Reset step index when tour changes
  useEffect(() => { setStepIndex(0); }, [tour.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-hover" onClick={onClose}>
      <div
        className="w-[460px] bg-surface border border-hairline rounded-ds-lg shadow-ds-overlay overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-hairline">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-accent-400" />
            <span className="text-sm font-medium text-strong">{tour.name}</span>
          </div>
          <button onClick={onClose} className="text-muted hover:text-strong transition-colors" aria-label="Close preview">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step content */}
        <div className="px-5 py-6">
          <div className="flex items-center gap-1.5 mb-1">
            {tour.steps.map((_, i) => (
              <span key={i} className={cn('w-2 h-2 rounded-full', i === stepIndex ? 'bg-accent-500' : 'bg-surface-overlay')} />
            ))}
          </div>
          <p className="text-ds-micro text-muted mb-3">
            Step {stepIndex + 1} of {tour.steps.length} &middot; Position: {step.position}
          </p>
          <h4 className="text-sm font-semibold text-strong mb-2">{step.title}</h4>
          <p className="text-xs text-muted leading-relaxed mb-4">{step.description}</p>

          {/* Target selector info */}
          <div className="bg-tint border border-hairline rounded-ds-md px-3 py-2 mb-4">
            <div className="text-ds-micro text-muted">Target element</div>
            <code className="text-ds-micro text-accent-300 font-mono">{step.targetSelector}</code>
          </div>

          {/* Debug: show all steps in compact list */}
          <details className="text-ds-micro text-muted">
            <summary className="cursor-pointer hover:text-strong transition-colors">All steps</summary>
            <ol className="mt-2 space-y-1 pl-4 list-decimal">
              {tour.steps.map((s, i) => (
                <li key={s.id} className={cn(i === stepIndex ? 'text-strong' : 'text-muted')}>
                  {s.title} — <span className="text-faint">{s.targetSelector}</span>
                </li>
              ))}
            </ol>
          </details>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-hairline">
          <Button size="sm" variant="ghost" className="text-ds-micro" onClick={onClose}>
            Close
          </Button>
          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <Button size="sm" variant="secondary" className="text-ds-micro" onClick={handlePrev}>
                Previous
              </Button>
            )}
            {isLast ? (
              <Button size="sm" className="text-ds-micro" onClick={handleNext}>
                <CheckCircle2 className="w-3 h-3 mr-1" /> Done
              </Button>
            ) : (
              <Button size="sm" className="text-ds-micro" onClick={handleNext}>
                Next <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function UsertourAdminPanel() {
  const [previewTourId, setPreviewTourId] = useState<string | null>(null);
  const totalTours = ALL_TOUR_DEFINITIONS.length;
  const publishedCount = ALL_TOUR_DEFINITIONS.filter((t) => t.autoStart).length;
  const requiredCount = ALL_TOUR_DEFINITIONS.filter((t) => t.forceFirst).length;

  /* §Sprint 2 — real filtering over the ONE canonical tour registry. */
  const [tourQuery, setTourQuery] = useState('');
  const [tourStatus, setTourStatus] = useState<'all' | 'published' | 'draft' | 'required'>('all');
  const visibleTours = useMemo(() => {
    const q = tourQuery.trim().toLowerCase();
    return ALL_TOUR_DEFINITIONS.filter((t) => {
      if (tourStatus === 'published' && !t.autoStart) return false;
      if (tourStatus === 'draft' && t.autoStart) return false;
      if (tourStatus === 'required' && !t.forceFirst) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q)
      );
    });
  }, [tourQuery, tourStatus]);

  const tourMetrics: MetricTileData[] = [
    {
      id: 'tours-total',
      label: 'Total Tours',
      value: String(totalTours),
      size: 'hero',
      tone: 'info',
      statusText: `${visibleTours.length} in view`,
      context: 'Guided tours defined for the brand portal',
      domain: 'catalogue',
      onOpen: () => { setTourStatus('all'); setTourQuery(''); },
      testId: 'tours-metric-total',
      valueTestId: 'tours-metric-total-value',
    },
    {
      id: 'tours-published',
      label: 'Auto-start (Published)',
      value: String(publishedCount),
      tone: 'success',
      statusText: 'Launch automatically',
      context: 'Tours that start without an explicit request',
      domain: 'compliance',
      onOpen: () => setTourStatus('published'),
      testId: 'tours-metric-published',
      valueTestId: 'tours-metric-published-value',
    },
    {
      id: 'tours-required',
      label: 'Required (Force-first)',
      value: String(requiredCount),
      tone: requiredCount > 0 ? 'warning' : 'success',
      statusText: 'Must be seen',
      context: 'Tours the brand must complete before others',
      domain: 'finance',
      onOpen: () => setTourStatus('required'),
      testId: 'tours-metric-required',
      valueTestId: 'tours-metric-required-value',
    },
    {
      id: 'tours-draft',
      label: 'Draft',
      value: String(totalTours - publishedCount),
      tone: 'neutral',
      statusText: 'Not auto-started',
      context: 'Tours available on request only',
      domain: 'logistics',
      onOpen: () => setTourStatus('draft'),
      testId: 'tours-metric-draft',
      valueTestId: 'tours-metric-draft-value',
    },
  ];

  // Listen for tour:preview custom event from TourCard buttons
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.tourId) setPreviewTourId(detail.tourId);
    };
    window.addEventListener('tour:preview', handler);
    return () => window.removeEventListener('tour:preview', handler);
  }, []);

  const previewTour = previewTourId ? (TOUR_REGISTRY[previewTourId] ?? null) : null;

  return (
    <WorkspaceFrame className="space-y-4">
      <WorkspaceHeader
        eyebrow="Admin Hub · Governance"
        title="Onboarding Tours"
        description="Internal tour management — the guided onboarding tours defined for the brand portal. Tours are rendered by the built-in TourEngine at runtime; this surface manages and previews them, it does not replace them."
        meta={
          <>
            <span className="font-mono text-ds-label text-muted">{totalTours} tours</span>
            <span className="font-mono text-ds-label text-muted">{publishedCount} published</span>
            <span className="font-mono text-ds-label text-muted">{requiredCount} required</span>
            <span className="font-mono text-ds-label text-muted">
              {visibleTours.length} in view
            </span>
          </>
        }
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={tourQuery}
              onChange={(e) => setTourQuery(e.target.value)}
              placeholder="Search tours"
              data-testid="tours-search"
              className="w-48 bg-surface border border-hairline rounded-ds-md px-3 py-1.5 text-xs text-strong"
            />
            <select
              aria-label="Tour status filter"
              value={tourStatus}
              onChange={(e) => setTourStatus(e.target.value as 'all' | 'published' | 'draft' | 'required')}
              data-testid="tours-status-filter"
              className="cursor-pointer rounded-ds-sm border border-hairline bg-surface px-2 py-1.5 text-xs text-strong"
            >
              <option value="all">Status: all</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="required">Required</option>
            </select>
          </div>
        }
      />

      <MetricBand items={tourMetrics} columns={4} />

      <WorkspaceSection
        title="Tour catalogue"
        description="Each tour is a real definition rendered by the TourEngine — previewing here launches the same steps the brand sees."
        domain="compliance"
      >
        {/* Tour grid */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
          {visibleTours.map((tour) => (
            <TourCard key={tour.id} tour={tour} />
          ))}
        </div>
        {visibleTours.length === 0 && (
          <Card className="p-6">
            <p className="text-xs text-faint">No tours match the current filters.</p>
          </Card>
        )}
      </WorkspaceSection>

      <ContextPanel title="Tour engine">
        <p className="text-ds-label leading-snug text-muted">
          Tours are launched by the TourEngine in the brand shell. Dismissal, step completion and
          force-first ordering are owned by that engine — this panel only lists and previews the
          definitions, so a tour can never be duplicated into a second implementation here.
        </p>
      </ContextPanel>

      {/* Preview modal */}
      {previewTour && (
        <TourPreviewModal tour={previewTour} onClose={() => setPreviewTourId(null)} />
      )}
    </WorkspaceFrame>
  );
}
