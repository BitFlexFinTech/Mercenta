/**
 * §Phase E2 — Admin onboarding pipeline (the operating surface for onboarding).
 *
 * Renders the CANONICAL onboarding records (`listOnboardingPipeline`) and can
 * actually OPERATE each one inline: record the brand's acceptance, complete the
 * ordered steps, and complete onboarding so the brand becomes operational. Every
 * action goes through `src/lib/onboarding/onboardingLifecycle.ts`, where RBAC and
 * tenant scoping are enforced — hiding a button is never the authorisation.
 *
 * Nothing on this screen is seeded: every number is derived from live store state
 * (and is 0 when nothing has been onboarded yet).
 */
import { useMemo, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { useCanonicalStoreVersion } from '@/data/queries';
import { getPersistenceStatus } from '@/data/acquisitionStore';
import { Badge, Button, Card, EmptyState, StatusBadge } from '@/components/ui';
import { cn } from '@/utils/cn';
import type { OnboardingStatus, OnboardingStepId } from '@/types';
import { onboardingStatusPresentation } from '@/lib/statusPresentation';
import {
  acceptOnboarding,
  completeOnboardingStep,
  finishBrandOnboarding,
  listOnboardingPipeline,
  type OnboardingPipelineRow,
} from '@/lib/onboarding/onboardingLifecycle';
import { ClipboardList, BadgeCheck, CheckCircle2, ChevronRight } from 'lucide-react';

const ORIGIN_LABELS: Record<string, string> = {
  acquisition_opportunity: 'Acquisition',
  partner_application: 'Application',
  manual_creation: 'Manual',
};

const STEP_STYLES: Record<string, string> = {
  pending: 'bg-white/[0.05] text-zinc-400 border-white/[0.08]',
  in_progress: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
  done: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
};

export function OnboardingPipeline() {
  const { actingStaffId, canCurrentUserMutate } = useApp();
  const version = useCanonicalStoreVersion();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<OnboardingStatus | 'all'>('all');
  void version; // canonical store change signal → re-read the derived rows

  const rows = listOnboardingPipeline();
  const persistence = getPersistenceStatus();
  const actor = useMemo(
    () => ({ staffId: actingStaffId, canMutate: canCurrentUserMutate }),
    [actingStaffId, canCurrentUserMutate]
  );

  /** Every count below is DERIVED from the records — never a seeded number. */
  const counts = {
    total: rows.length,
    initiated: rows.filter((r) => r.onboarding.status === 'initiated').length,
    active: rows.filter(
      (r) => r.onboarding.status === 'accepted' || r.onboarding.status === 'in_progress'
    ).length,
    completed: rows.filter((r) => r.onboarding.status === 'completed').length,
  };
  const visible =
    filter === 'all'
      ? rows
      : filter === 'in_progress'
        ? rows.filter((r) => r.onboarding.status === 'accepted' || r.onboarding.status === 'in_progress')
        : rows.filter((r) => r.onboarding.status === filter);
  const open = rows.find((r) => r.onboarding.id === openId) ?? null;

  function run<T>(
    result: { ok: true; value: T } | { ok: false; error: string },
    message: string
  ): boolean {
    if (!result.ok) {
      setError(result.error);
      setNotice(null);
      return false;
    }
    setError(null);
    setNotice(message);
    return true;
  }

  function handleAccept(row: OnboardingPipelineRow) {
    run(
      acceptOnboarding(row.onboarding.id, actor, 'Acceptance recorded by operations'),
      `${row.onboarding.businessName} acceptance recorded.`
    );
  }

  function handleStep(row: OnboardingPipelineRow, stepId: OnboardingStepId) {
    run(completeOnboardingStep(row.onboarding.id, stepId, actor), `Step completed: ${stepId}.`);
  }

  function handleFinish(row: OnboardingPipelineRow) {
    run(
      finishBrandOnboarding(row.onboarding.id, actor),
      `${row.onboarding.businessName} is now an operational brand.`
    );
  }

  const filterChips: { key: OnboardingStatus | 'all'; label: string; value: number }[] = [
    { key: 'all', label: 'All', value: counts.total },
    { key: 'initiated', label: 'Awaiting acceptance', value: counts.initiated },
    { key: 'in_progress', label: 'In progress', value: counts.active },
    { key: 'completed', label: 'Operational', value: counts.completed },
  ];

  return (
    <Card title="Onboarding Pipeline">
      <div className="px-1 pb-1 space-y-3" data-section="onboarding-pipeline">
        <p className="text-[11px] text-zinc-500">
          Canonical onboarding records for brands handed off into the platform — from a qualified
          acquisition opportunity, an approved partner application, or an operator-created brand.
          Each row can be operated inline: record acceptance, complete the ordered steps, then
          complete onboarding so the brand becomes operational. The acquisition relationship is
          retained on the record; nothing is duplicated.
        </p>

        {/* Drill-down: each count filters the list to exactly that state. */}
        <div className="flex flex-wrap gap-2 text-[10px]">
          {filterChips.map((chip) => (
            <button
              key={chip.key}
              data-pipeline-filter={chip.key}
              onClick={() => setFilter(chip.key)}
              className={cn(
                'px-2 py-1 rounded-md border transition-colors',
                filter === chip.key
                  ? 'bg-brass-500/15 text-brass border-brass/30'
                  : 'text-zinc-400 border-white/[0.08] hover:text-white'
              )}
            >
              {chip.label}: <span className="font-mono text-white">{chip.value}</span>
            </button>
          ))}
        </div>

        {notice && <p className="text-[11px] text-emerald-400" data-notice="ok">{notice}</p>}
        {error && <p className="text-[11px] text-red-300" data-notice="error">{error}</p>}

        <div className="text-[10px] text-zinc-500" data-section="persistence-status">
          Persistence:{' '}
          <span
            className={cn(
              'font-mono',
              persistence.state === 'failed'
                ? 'text-red-400'
                : persistence.state === 'durable'
                  ? 'text-emerald-300'
                  : 'text-zinc-400'
            )}
          >
            {persistence.state}
          </span>
          {persistence.state === 'memory-only' &&
            ' — no Supabase connection in this environment: onboarding state is session-only, not durable.'}
        </div>

        {rows.length === 0 ? (
          <EmptyState
            title="No onboarding records yet"
            description="Start onboarding from a qualified opportunity (Brand Intelligence → prospect → Outreach) or approve a partner application to create the first onboarding record."
          />
        ) : visible.length === 0 ? (
          <p className="text-[11px] text-zinc-600">No onboarding records in this state.</p>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {visible.map((row) => (
              <div key={row.onboarding.id}>
                <button
                  data-onboarding-row={row.onboarding.status}
                  onClick={() => setOpenId(openId === row.onboarding.id ? null : row.onboarding.id)}
                  className="w-full flex items-center justify-between gap-2 px-1 py-2 text-left hover:bg-white/[0.02]"
                >
                  <span className="min-w-0">
                    <span className="text-xs font-medium text-white inline-flex items-center gap-1.5">
                      <ClipboardList className="w-3 h-3 text-brass-400" />
                      {row.onboarding.businessName}
                    </span>
                    <span className="block text-[10px] text-zinc-500 font-mono">
                      {row.onboarding.brandId} · {ORIGIN_LABELS[row.onboarding.origin] ?? row.onboarding.origin} ·{' '}
                      {row.stepsDone}/{row.stepsTotal} steps
                      {row.onboarding.prospectId ? ` · prospect ${row.onboarding.prospectId}` : ''}
                      {row.onboarding.applicationId ? ` · ${row.onboarding.applicationId}` : ''}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge
                      className="text-[10px] capitalize"
                      dataStatus={onboardingStatusPresentation(row.onboarding.status).dataStatus}
                      tone={onboardingStatusPresentation(row.onboarding.status).tone}
                    >
                      {onboardingStatusPresentation(row.onboarding.status).label}
                    </StatusBadge>
                    <ChevronRight
                      className={cn(
                        'w-3.5 h-3.5 text-zinc-500 transition-transform',
                        openId === row.onboarding.id && 'rotate-90'
                      )}
                    />
                  </span>
                </button>
                {open?.onboarding.id === row.onboarding.id && (
                  <OnboardingDetail
                    row={row}
                    canMutate={canCurrentUserMutate}
                    onAccept={() => handleAccept(row)}
                    onStep={(stepId) => handleStep(row, stepId)}
                    onFinish={() => handleFinish(row)}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

/** §Phase E2 — one onboarding record's detail: ordered steps + the real origin. */
function OnboardingDetail({
  row,
  canMutate,
  onAccept,
  onStep,
  onFinish,
}: {
  row: OnboardingPipelineRow;
  canMutate: boolean;
  onAccept: () => void;
  onStep: (stepId: OnboardingStepId) => void;
  onFinish: () => void;
}) {
  const o = row.onboarding;
  return (
    <div className="border border-white/[0.06] rounded-lg p-3 mb-2 space-y-2" data-section="onboarding-detail">
      {row.opportunity && (
        <p className="text-[10px] text-zinc-400">
          Originating opportunity{' '}
          <span className="font-mono text-zinc-300">{row.opportunity.id}</span> · stage{' '}
          <span className="capitalize">{row.opportunity.stage}</span> · BI {row.opportunity.biScore}/100 ·
          brand <span className="text-zinc-300">{row.prospectBrand ?? o.businessName}</span>
        </p>
      )}
      <ol className="space-y-1">
        {o.steps.map((s) => (
          <li
            key={s.id}
            data-onboarding-step={s.id}
            className="flex items-center justify-between gap-2 border-b border-white/[0.04] pb-1"
          >
            <span className="text-[11px] text-zinc-300">
              <span className="font-mono text-[9px] text-zinc-500 mr-1.5">{s.id}</span>
              {s.label}
              {s.completedBy && <span className="text-[9px] text-zinc-600 ml-1.5">by {s.completedBy}</span>}
            </span>
            {/* The shared Button primitive only forwards `data-state`, so the step
                identity lives on this wrapper — the machine-readable contract the
                E2E drives. */}
            <span className="flex items-center gap-2 flex-shrink-0" data-step={s.id}>
              <Badge className={cn('text-[9px] capitalize', STEP_STYLES[s.status])}>
                {s.status.replace('_', ' ')}
              </Badge>
              {s.status !== 'done' && o.status !== 'completed' && (
                <Button
                  size="sm"
                  variant="tertiary"
                  className="text-[10px]"
                  data-state="pipeline-complete-step"
                  data-step={s.id}
                  disabled={!canMutate}
                  onClick={() => onStep(s.id)}
                >
                  Complete
                </Button>
              )}
            </span>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        {o.status === 'initiated' && (
          <Button
            className="text-xs"
            variant="secondary"
            data-state="pipeline-accept"
            disabled={!canMutate}
            onClick={onAccept}
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />Record acceptance
          </Button>
        )}
        {o.status !== 'completed' ? (
          <Button className="text-xs" data-state="pipeline-finish" disabled={!canMutate} onClick={onFinish}>
            <BadgeCheck className="w-3.5 h-3.5 mr-1.5" />Complete onboarding
          </Button>
        ) : (
          <p className="text-[10px] text-emerald-300">
            Operational brand — tenant {o.brandId}
            {o.completedAt ? ` (completed ${o.completedAt.slice(0, 10)})` : ''}.
            {o.acceptedAt ? ` Accepted ${o.acceptedAt.slice(0, 10)}.` : ''}
          </p>
        )}
        <span className="text-[9px] text-zinc-600">
          record <span className="font-mono">{o.id}</span> · initiated {o.initiatedAt.slice(0, 10)} by{' '}
          {o.initiatedBy}
        </span>
        {!canMutate && (
          <span className="text-[10px] text-amber-300">Read-only account — onboarding actions are refused.</span>
        )}
      </div>
    </div>
  );
}

