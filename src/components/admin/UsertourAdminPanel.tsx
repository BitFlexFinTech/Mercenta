/**
 * §Multi-tour — Admin tour management panel.
 *
 * Lists all 9 built-in brand tours with status info (auto-start, force-first,
 * step count, target roles/views) and a preview action. Internal tool.
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, Button, Badge } from '@/components/ui';
import { cn } from '@/utils/cn';
import { Layers, Eye, ChevronDown, ChevronUp, X, HelpCircle, CheckCircle2, ChevronRight } from 'lucide-react';
import { ALL_TOUR_DEFINITIONS, TOUR_REGISTRY, type TourDefinition, type TourStep } from '@/config/tours/tourDefinitions';

/* ── Step-list collapsible ──────────────────────────────────────── */

function StepList({ steps }: { steps: TourDefinition['steps'] }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {steps.length} step{steps.length !== 1 ? 's' : ''}
      </button>
      {open && (
        <ol className="mt-2 space-y-1.5 pl-4 list-decimal">
          {steps.map((s) => (
            <li key={s.id} className="text-[10px] text-zinc-400 leading-relaxed">
              <span className="text-zinc-200">{s.title}</span>
              <span className="text-zinc-500"> — {s.description.slice(0, 60)}{s.description.length > 60 ? '…' : ''}</span>
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
    <div className="relative flex flex-col rounded-xl bg-ink-850 border border-white/[0.06] overflow-hidden transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,0,0,0.3)]">
      {/* Preview area — step count summary */}
      <div className="flex min-h-0 flex-1 items-center justify-center bg-white/[0.02] border-b border-white/[0.06] px-4 py-6">
        <div className="text-center">
          <Layers className="w-8 h-8 text-brass-400/60 mx-auto mb-2" />
          <div className="text-[11px] text-zinc-500">{tour.steps.length} guided steps</div>
          {tour.autoStartViews && tour.autoStartViews.length > 0 && (
            <div className="text-[10px] text-zinc-600 mt-1">
              Triggers on: {tour.autoStartViews.join(', ')}
            </div>
          )}
        </div>
      </div>

      {/* Footer — name + status + actions */}
      <div className="flex flex-none flex-col gap-1.5 px-4 py-3">
        {/* Row 1: name + status */}
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">
            {tour.name}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            <span className={cn('w-1.5 h-1.5 rounded-full', tour.autoStart ? 'bg-emerald-400' : 'bg-zinc-500/40')} />
            <span className={cn('text-[10px] font-medium', tour.autoStart ? 'text-emerald-300' : 'text-zinc-500')}>
              {tour.autoStart ? 'Published' : 'Draft'}
            </span>
          </span>
        </div>

        {/* Row 2: badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {tour.forceFirst && (
            <Badge className="text-[9px] bg-amber-500/15 text-amber-300 border-amber-500/20">Required</Badge>
          )}
          {tour.autoStartViews && tour.autoStartViews.length > 0 && (
            <Badge className="text-[9px] bg-blue-500/15 text-blue-300 border-blue-500/20">
              {tour.autoStartViews.length} trigger{tour.autoStartViews.length !== 1 ? 's' : ''}
            </Badge>
          )}
          <Badge className="text-[9px] bg-zinc-500/15 text-zinc-400 border-zinc-500/20">
            {tour.steps.length} step{tour.steps.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Row 3: description + actions */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-[10px] text-zinc-500 leading-relaxed flex-1 line-clamp-2">
            {tour.description}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              className="text-[10px] px-2 py-1"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="w-[460px] bg-ink-900 border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-brass-400" />
            <span className="text-sm font-medium text-white">{tour.name}</span>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors" aria-label="Close preview">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step content */}
        <div className="px-5 py-6">
          <div className="flex items-center gap-1.5 mb-1">
            {tour.steps.map((_, i) => (
              <span key={i} className={cn('w-2 h-2 rounded-full', i === stepIndex ? 'bg-brass-500' : 'bg-zinc-700')} />
            ))}
          </div>
          <p className="text-[10px] text-zinc-500 mb-3">
            Step {stepIndex + 1} of {tour.steps.length} &middot; Position: {step.position}
          </p>
          <h4 className="text-sm font-semibold text-white mb-2">{step.title}</h4>
          <p className="text-xs text-zinc-400 leading-relaxed mb-4">{step.description}</p>

          {/* Target selector info */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-2 mb-4">
            <div className="text-[10px] text-zinc-500">Target element</div>
            <code className="text-[10px] text-brass-300 font-mono">{step.targetSelector}</code>
          </div>

          {/* Debug: show all steps in compact list */}
          <details className="text-[10px] text-zinc-500">
            <summary className="cursor-pointer hover:text-zinc-300 transition-colors">All steps</summary>
            <ol className="mt-2 space-y-1 pl-4 list-decimal">
              {tour.steps.map((s, i) => (
                <li key={s.id} className={cn(i === stepIndex ? 'text-zinc-200' : 'text-zinc-500')}>
                  {s.title} — <span className="text-zinc-600">{s.targetSelector}</span>
                </li>
              ))}
            </ol>
          </details>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-white/[0.06]">
          <Button size="sm" variant="ghost" className="text-[10px]" onClick={onClose}>
            Close
          </Button>
          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <Button size="sm" variant="secondary" className="text-[10px]" onClick={handlePrev}>
                Previous
              </Button>
            )}
            {isLast ? (
              <Button size="sm" className="text-[10px]" onClick={handleNext}>
                <CheckCircle2 className="w-3 h-3 mr-1" /> Done
              </Button>
            ) : (
              <Button size="sm" className="text-[10px]" onClick={handleNext}>
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
    <div className="space-y-4">
      <Card className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Onboarding Tours</h3>
            <p className="text-[11px] text-zinc-500 mt-1">
              Internal tour management — {totalTours} tours defined for the brand portal.
              Tours are rendered by the built-in TourEngine at runtime.
            </p>
          </div>
          <Badge className="text-[10px] bg-brass-500/15 text-brass-300 border-brass-500/20">
            {totalTours} tours
          </Badge>
        </div>

        {/* Summary bar */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-2 text-center">
            <div className="text-lg font-semibold text-white">{totalTours}</div>
            <div className="text-[10px] text-zinc-500">Total Tours</div>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-2 text-center">
            <div className="text-lg font-semibold text-emerald-300">{publishedCount}</div>
            <div className="text-[10px] text-zinc-500">Auto-start (Published)</div>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-2 text-center">
            <div className="text-lg font-semibold text-amber-300">{requiredCount}</div>
            <div className="text-[10px] text-zinc-500">Required (Force-first)</div>
          </div>
        </div>

        {/* Tour grid */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
          {ALL_TOUR_DEFINITIONS.map((tour) => (
            <TourCard key={tour.id} tour={tour} />
          ))}
        </div>
      </Card>

      {/* Preview modal */}
      {previewTour && (
        <TourPreviewModal tour={previewTour} onClose={() => setPreviewTourId(null)} />
      )}
    </div>
  );
}
