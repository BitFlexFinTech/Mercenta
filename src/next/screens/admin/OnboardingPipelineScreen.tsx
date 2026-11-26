import { useMemo, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { getPersistenceStatus } from '@/data/acquisitionStore';
import { useCanonicalStoreVersion } from '@/data/queries';
import {
  acceptOnboarding,
  completeOnboardingStep,
  finishBrandOnboarding,
  listOnboardingPipeline,
} from '@/lib/onboarding/onboardingLifecycle';
import { onboardingStatusPresentation } from '@/lib/statusPresentation';
import type { OnboardingStepId } from '@/types';
import {
  OnboardingPipelineView,
  type OnboardingFilter,
  type OnboardingPipelineItem,
} from './OnboardingPipelineView';

const ORIGIN_LABELS: Record<string, string> = {
  acquisition_opportunity: 'Acquisition',
  partner_application: 'Application',
  manual_creation: 'Manual',
};

function mapTone(t: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  if (t === 'success' || t === 'warning' || t === 'danger' || t === 'info') return t;
  return 'neutral';
}

export function OnboardingPipelineScreen() {
  const { actingStaffId, canCurrentUserMutate } = useApp();
  const version = useCanonicalStoreVersion();
  const [filter, setFilter] = useState<OnboardingFilter>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const rawRows = useMemo(() => {
    void version;
    return listOnboardingPipeline();
  }, [version]);

  const persistence = useMemo(() => {
    void version;
    return getPersistenceStatus();
  }, [version]);

  const actor = useMemo(
    () => ({ staffId: actingStaffId, canMutate: canCurrentUserMutate }),
    [actingStaffId, canCurrentUserMutate]
  );

  const items: OnboardingPipelineItem[] = useMemo(
    () =>
      rawRows.map((row) => {
        const o = row.onboarding;
        const pres = onboardingStatusPresentation(o.status);
        return {
          id: o.id,
          brandId: o.brandId,
          businessName: o.businessName,
          originLabel: ORIGIN_LABELS[o.origin] ?? o.origin,
          prospectId: o.prospectId,
          applicationId: o.applicationId,
          status: o.status,
          statusLabel: pres.label,
          statusTone: mapTone(pres.tone),
          stepsDone: row.stepsDone,
          stepsTotal: row.stepsTotal,
          initiatedAt: o.initiatedAt,
          initiatedBy: o.initiatedBy,
          acceptedAt: o.acceptedAt,
          completedAt: o.completedAt,
          opportunitySummary: row.opportunity
            ? `Opportunity ${row.opportunity.id} · Stage ${row.opportunity.stage} · BI ${row.opportunity.biScore}/100`
            : undefined,
          poRulesAcknowledgedAt: o.poRulesAcknowledgedAt,
          poRulesAcknowledgedBy: o.poRulesAcknowledgedBy,
          steps: o.steps.map((s) => ({
            id: s.id,
            label: s.label,
            status: s.status,
            completedBy: s.completedBy,
          })),
        };
      }),
    [rawRows]
  );

  const visible = useMemo(() => {
    if (filter === 'all') return items;
    if (filter === 'in_progress') {
      return items.filter((r) => r.status === 'accepted' || r.status === 'in_progress');
    }
    return items.filter((r) => r.status === filter);
  }, [items, filter]);

  const counts = {
    total: items.length,
    initiated: items.filter((r) => r.status === 'initiated').length,
    active: items.filter((r) => r.status === 'accepted' || r.status === 'in_progress').length,
    completed: items.filter((r) => r.status === 'completed').length,
  };

  function run<T>(res: { ok: true; value: T } | { ok: false; error: string }, msg: string) {
    if (!res.ok) {
      setActionError(res.error);
      setNotice(null);
      return;
    }
    setActionError(null);
    setNotice(msg);
  }

  return (
    <OnboardingPipelineView
      loading={false}
      error={null}
      canMutate={canCurrentUserMutate}
      persistenceState={persistence.state}
      counts={counts}
      filter={filter}
      onFilterChange={setFilter}
      rows={visible}
      openId={openId}
      onToggleOpen={(id) => setOpenId((prev) => (prev === id ? null : id))}
      notice={notice}
      actionError={actionError}
      onAccept={(id) =>
        run(acceptOnboarding(id, actor, 'Acceptance recorded by operations'), 'Acceptance recorded.')
      }
      onCompleteStep={(id, stepId) =>
        run(completeOnboardingStep(id, stepId as OnboardingStepId, actor), `Completed step: ${stepId}.`)
      }
      onFinishOnboarding={(id) =>
        run(finishBrandOnboarding(id, actor), 'Brand onboarding completed and operational.')
      }
    />
  );
}
