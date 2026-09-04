/**
 * §Batch-12 — Brand onboarding tour engine + checklist.
 */
import { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { cn } from '@/utils/cn';
import { TOUR_STEPS, CHECKLIST_ITEMS, DEFAULT_TOUR_PROGRESS, type TourProgress } from '@/types';
import { Button } from '@/components/ui';
import { X, ChevronRight, CheckCircle2, Circle, HelpCircle } from 'lucide-react';

/* ── Reactive per-brand progress store ───────────────────────────── */
// Module-level Map persists progress across renders.
// A version counter makes it reactive: every mutation increments the
// version, and useTourStore subscribes to it via useState + useEffect.

const tourProgressMap = new Map<string, TourProgress>();
let _tourVersion = 0;
const _versionListeners = new Set<() => void>();

function bumpVersion() {
  _tourVersion++;
  _versionListeners.forEach((fn) => fn());
}

export function getTourProgress(brandId: string): TourProgress {
  return tourProgressMap.get(brandId) ?? { ...DEFAULT_TOUR_PROGRESS };
}

export function setTourProgress(brandId: string, p: TourProgress): void {
  tourProgressMap.set(brandId, p);
  bumpVersion();
}

export function markTourStepCompleted(brandId: string, stepId: string): void {
  const p = getTourProgress(brandId);
  if (!p.completedSteps.includes(stepId)) {
    p.completedSteps = [...p.completedSteps, stepId];
    setTourProgress(brandId, p);
  }
}

export function dismissTour(brandId: string): void {
  const p = getTourProgress(brandId);
  p.tourDismissed = true;
  setTourProgress(brandId, p);
}

export function markChecklistItem(brandId: string, itemId: string): void {
  const p = getTourProgress(brandId);
  if (!p.checklistCompleted.includes(itemId)) {
    p.checklistCompleted = [...p.checklistCompleted, itemId];
    setTourProgress(brandId, p);
  }
}

export function resetTour(brandId: string): void {
  setTourProgress(brandId, { ...DEFAULT_TOUR_PROGRESS });
}

/** Reactive hook: returns brand's TourProgress and triggers re-render on mutation. */
function useTourProgressReactive(brandId: string): TourProgress {
  const [v, setV] = useState(0);
  useEffect(() => {
    const update = () => setV((n) => n + 1);
    _versionListeners.add(update);
    return () => { _versionListeners.delete(update); };
  }, [brandId]);
   
  return useMemo(() => getTourProgress(brandId), [brandId, v]);
}

/* ── Positioning helper ──────────────────────────────────────────── */

/**
 * Returns the bounding rect of the tour's target element on the page,
 * falling back to viewport center if the element isn't found.
 */
function getTargetRect(targetSelector: string): { top: number; left: number; width: number; height: number } | null {
  const el = document.querySelector(targetSelector);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
}

/* ── Tour step card ────────────────────────────────────────────── */

function TourStepCard(props: {
  step: (typeof TOUR_STEPS)[number]; currentIndex: number; totalSteps: number;
  onNext: () => void; onFinish: () => void; onSkip: () => void;
}) {
  const { step, currentIndex, totalSteps, onNext, onFinish, onSkip } = props;
  const dots = Array.from({ length: totalSteps }, function(_, i) { return i; });
  const targetRect = useMemo(function() { return getTargetRect(step.targetSelector); }, [step.targetSelector]);

  // Compute tooltip position based on step.position and target element
  const tooltipStyle = useMemo(function(): React.CSSProperties {
    if (!targetRect) {
      // Fallback: center of viewport
      return { position: 'fixed', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 50 };
    }

    const gap = 12; // px gap between target and tooltip
    const tooltipWidth = 400;

    if (step.position === 'right') {
      return {
        position: 'fixed',
        top: `${Math.max(8, targetRect.top + targetRect.height / 2 - 80)}px`,
        left: `${Math.min(targetRect.left + targetRect.width + gap, window.innerWidth - tooltipWidth - 16)}px`,
        zIndex: 50,
      };
    }
    // 'bottom' or default: below the target
    return {
      position: 'fixed',
      top: `${targetRect.top + targetRect.height + gap}px`,
      left: `${Math.max(8, Math.min(targetRect.left + targetRect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - 16))}px`,
      zIndex: 50,
    };
  }, [targetRect, step.position]);

  return (
    <div style={tooltipStyle} className="w-[400px] bg-ink-900 border border-white/[0.08] rounded-xl shadow-2xl p-4 animate-fade-in">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-brass-400" />
          <span className="text-xs font-medium text-white">{step.title}</span>
        </div>
        <button onClick={onSkip} className="text-zinc-500 hover:text-white transition-colors" aria-label="Dismiss tour"><X className="w-3.5 h-3.5" /></button>
      </div>
      <p className="text-[11px] text-zinc-400 leading-relaxed mb-3">{step.description}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {dots.map(function(i) {
            return <span key={i} className={cn('w-1.5 h-1.5 rounded-full', i === currentIndex ? 'bg-brass-500' : 'bg-zinc-700')} />;
          })}
        </div>
        <div className="flex items-center gap-2">
          {step.action === 'finish' ? (
            <Button className="text-[10px]" onClick={onFinish}><CheckCircle2 className="w-3 h-3 mr-1" /> Got it</Button>
          ) : (
            <Button className="text-[10px]" onClick={onNext}>Next <ChevronRight className="w-3 h-3 ml-1" /></Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Checklist widget ──────────────────────────────────────────── */

function ChecklistWidget(props: { brandId: string; compact?: boolean }) {
  const { brandId, compact } = props;
  const progress = getTourProgress(brandId);
  const completed = progress.checklistCompleted;

  return (
    <div className={cn(compact ? '' : 'bg-ink-900 border border-white/[0.06] rounded-lg p-3')}>
      {!compact && (
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-brass-400" />
          <span className="text-xs font-medium text-white">Onboarding Checklist</span>
        </div>
      )}
      <div className="space-y-1">
        {CHECKLIST_ITEMS.map(function(item) {
          const done = completed.includes(item.id);
          return (
            <div key={item.id} className="flex items-center gap-2 text-[10px]">
              {done
                ? <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                : <Circle className="w-3 h-3 text-zinc-600 flex-shrink-0" />}
              <span className={cn(done ? 'text-zinc-500 line-through' : 'text-zinc-400')}>{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main TourEngine component ─────────────────────────────────── */

interface TourEngineProps { currentView: string; isBrandPortal: boolean; }

export function TourEngine(props: TourEngineProps) {
  const { currentView, isBrandPortal } = props;
  const { session } = useApp();
  const brandId = session?.tenantId ?? '';
  const progress = useTourProgressReactive(brandId);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const remainingSteps = useMemo(function() {
    return TOUR_STEPS.filter(function(s) { return !progress.completedSteps.includes(s.id); });
  }, [progress.completedSteps]);

  useEffect(function() {
    if (!isBrandPortal || progress.tourDismissed || remainingSteps.length === 0) return;
    if (currentStepIndex >= remainingSteps.length) return;
    const navMap: Record<string, string> = {
      'nav-purchase_orders': 'purchase_orders', 'nav-catalog': 'catalog',
      'nav-logistics': 'logistics', 'nav-compliance': 'compliance', 'nav-settings': 'settings',
    };
    const step = remainingSteps[currentStepIndex];
    const navId = step.targetSelector.replace('[data-tour="nav-', '').replace('"]', '');
    if (navMap[navId] && currentView === navMap[navId]) {
      setCurrentStepIndex(function(i) { return Math.min(i + 1, remainingSteps.length - 1); });
    }
  }, [isBrandPortal, progress.tourDismissed, remainingSteps, currentStepIndex, currentView]);

  const showTour = isBrandPortal && !progress.tourDismissed && remainingSteps.length > 0 && currentStepIndex < remainingSteps.length;
  const currentStep = showTour ? remainingSteps[currentStepIndex] : null;

  function handleNext() {
    if (currentStepIndex < remainingSteps.length - 1) { setCurrentStepIndex(function(i) { return i + 1; }); }
    else { handleFinish(); }
  }
  function handleFinish() {
    if (currentStep) markTourStepCompleted(brandId, currentStep.id);
    dismissTour(brandId); setCurrentStepIndex(0);
  }
  /** X button: dismisses the tour without marking remaining steps done. User can restart later. */
  function handleDismiss() {
    dismissTour(brandId); setCurrentStepIndex(0);
  }

  return (
    <>
      {showTour && currentStep && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 pointer-events-none" />
          <TourStepCard step={currentStep} currentIndex={currentStepIndex} totalSteps={remainingSteps.length}
            onNext={handleNext} onFinish={handleFinish} onSkip={handleDismiss} />
        </>
      )}
      {isBrandPortal && brandId && !getTourProgress(brandId).tourDismissed && (
        <div className="fixed bottom-4 right-4 z-30 w-56">
          <ChecklistWidget brandId={brandId} compact />
        </div>
      )}
    </>
  );
}

/* ── Exported hooks ────────────────────────────────────────────── */

export function useTourProgress(brandId: string): TourProgress {
  return useTourProgressReactive(brandId);
}

export function useChecklist(brandId: string) {
  const progress = useTourProgress(brandId);
  return {
    progress,
    allDone: CHECKLIST_ITEMS.every(function(i) { return progress.checklistCompleted.includes(i.id); }),
    doneCount: progress.checklistCompleted.length,
    total: CHECKLIST_ITEMS.length,
  };
}