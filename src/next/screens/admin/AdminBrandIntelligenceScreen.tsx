import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useBrandComms } from '@/components/shared/BrandComm';
import { useApp } from '@/context/GlobalStateContext';
import {
  ensureProspectStore,
  getChanges,
  getProspectTimeline,
  getRuns,
  getProspects,
  recordLifecycleEvent,
  updateProspect,
} from '@/data/prospectStore';
import { useCanonicalStoreVersion } from '@/data/queries';
import { useIntegrations } from '@/integrations/IntegrationsContext';
import {
  approveOutreach,
  createOpportunityFromResponse,
  getRelationshipContext,
  listAcquisitionProspects,
  modifyOutreach,
  prepareOutreach,
  rejectOutreach,
  sendOutreach,
  setOpportunityStage,
  simulateResponse,
} from '@/lib/acquisition/outreachLifecycle';
import { resolveOutreachTransport } from '@/lib/acquisition/outreachSender';
import { createBrandIntelligenceClient } from '@/lib/intelligence/brandIntelligenceClient';
import {
  disqualifyProspect,
  getPipelineStatus,
  requalifyProspect,
  runBrandIntelligence,
} from '@/lib/intelligence/prospectLifecycle';
import {
  beginBrandOnboarding,
  completeOnboardingStep,
  finishBrandOnboarding,
  getOnboardingForProspect,
  isOnboardingEligible,
} from '@/lib/onboarding/onboardingLifecycle';
import type { BrandProspect, OnboardingStepId, OpportunityStage } from '@/types';
import {
  AdminBrandIntelligenceView,
  type OutreachWorkflowSnapshot,
  type ProspectRowItem,
} from './AdminBrandIntelligenceView';

const TIER_LABELS: Record<string, string> = {
  tier_1: 'Attack Now',
  tier_2: 'High Prob',
  tier_3: 'Upside',
  tier_4: 'Reserve',
  unscored: 'Below',
};

const OFFER_ORDER = [
  'DIRECT_AMAZON_RETAIL',
  'AMAZON_PRESENT_BUT_UNCLEAR',
  'MARKETPLACE_HEAVY',
  'MARKETPLACE_ONLY_OBSERVED',
  'NO_CURRENT_OFFER',
  'UNKNOWN',
];

function bestOfferClass(p: BrandProspect): string {
  if (!p.asins?.length) return 'UNKNOWN';
  return p.asins.reduce(
    (best, a) =>
      OFFER_ORDER.indexOf(a.amazonOfferClass) < OFFER_ORDER.indexOf(best)
        ? a.amazonOfferClass
        : best,
    p.asins[0].amazonOfferClass
  );
}

const biClient = createBrandIntelligenceClient();

export function AdminBrandIntelligenceScreen() {
  const qc = useQueryClient();
  const comms = useBrandComms();
  const { integrations } = useIntegrations();
  const { actingStaffId, canCurrentUserMutate, refreshLeadsFromProspects } = useApp();
  const storeVersion = useCanonicalStoreVersion();

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [runningDiscovery, setRunningDiscovery] = useState(false);
  const [runStatusMessage, setRunStatusMessage] = useState<string | null>(null);
  const [localTick, setLocalTick] = useState(0);

  useEffect(() => {
    ensureProspectStore();
    setLoading(false);
  }, []);

  const actor = useMemo(
    () => ({ staffId: actingStaffId, canMutate: canCurrentUserMutate }),
    [actingStaffId, canCurrentUserMutate]
  );

  const rawProspects = useMemo(() => {
    void storeVersion;
    void localTick;
    return getProspects();
  }, [storeVersion, localTick]);

  const runs = useMemo(() => {
    void storeVersion;
    void localTick;
    return [...getRuns()].reverse();
  }, [storeVersion, localTick]);

  const changes = useMemo(() => {
    void storeVersion;
    void localTick;
    return getChanges();
  }, [storeVersion, localTick]);

  const pipelineStatus = useMemo(() => {
    void storeVersion;
    void localTick;
    return getPipelineStatus();
  }, [storeVersion, localTick]);

  const dash = useMemo(() => biClient.getDashboard(rawProspects), [rawProspects]);

  const toRowItem = (p: BrandProspect): ProspectRowItem => ({
    id: p.id,
    brand: p.brand,
    category: p.category,
    website: p.website,
    whyInteresting: p.whyInteresting,
    totalScore: p.score.total,
    tier: p.score.tier,
    tierLabel: TIER_LABELS[p.score.tier] ?? p.score.tier,
    amazonDemand: p.score.amazonDemand,
    poPotential: p.score.poPotential,
    growth: p.score.growth,
    distributionOpenness: p.score.distributionOpenness,
    acceptanceProbability: p.score.acceptanceProbability,
    mercentaFit: p.score.mercentaFit,
    logisticsSuitability: p.score.logisticsSuitability,
    offerSummary: bestOfferClass(p).replace(/_/g, ' '),
    leadDistributor: p.distributors[0]?.company ?? '—',
    leadContact: p.contacts[0]?.name ?? '—',
    disqualified: Boolean(p.disqualified),
    disqualificationReason: p.disqualificationReason,
    maturityLabel: p.brandMaturity.replace(/_/g, ' '),
    ukPresence: Boolean(p.ukPresence),
    outreachStatus: p.outreachStatus.replace(/_/g, ' '),
    notes: p.notes ?? '',
    asins: p.asins.map((a) => ({
      asin: a.asin,
      title: a.title,
      offerClass: a.amazonOfferClass,
      price: a.price,
      rating: a.rating,
      reviewCount: a.reviewCount,
      bsr: a.bsr,
      sellerCount: a.sellerCount,
      estimatedRevenue: a.estimatedRevenue,
    })),
    contacts: p.contacts.map((c) => ({
      name: c.name,
      jobTitle: c.jobTitle,
      company: c.company,
      email: c.email,
      emailConfidence: c.emailConfidence,
    })),
    distributors: p.distributors.map((d) => ({
      company: d.company,
      territory: d.territory,
      exclusive: d.exclusive,
      suggestedApproach: d.suggestedApproach,
    })),
    wholesaleAvailable: p.wholesale.wholesaleAvailable,
    distributorProgramme: p.wholesale.distributorProgramme,
    retailerProgramme: p.wholesale.retailerProgramme,
    timeline: getProspectTimeline(p.id)
      .slice(-12)
      .reverse()
      .map((e) => ({
        id: e.id,
        changeType: e.changeType,
        summary: e.summary,
        timestamp: e.timestamp,
        field: e.field,
      })),
  });

  const allMapped = useMemo(() => rawProspects.map(toRowItem), [rawProspects]);

  const activeProspects = useMemo(() => {
    let list = allMapped.filter((p) => !p.disqualified);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) => p.brand.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
      );
    }
    if (categoryFilter) list = list.filter((p) => p.category === categoryFilter);
    if (tierFilter) list = list.filter((p) => p.tier === tierFilter);
    return list.sort((a, b) => b.totalScore - a.totalScore);
  }, [allMapped, searchQuery, categoryFilter, tierFilter]);

  const disqualifiedProspects = useMemo(
    () => allMapped.filter((p) => p.disqualified),
    [allMapped]
  );

  const resolvedTransport = useMemo(
    () => resolveOutreachTransport(integrations.email, comms.emailClient),
    [integrations.email, comms.emailClient]
  );

  const workflowSnapshot: OutreachWorkflowSnapshot | null = useMemo(() => {
    if (!selectedId) return null;
    void storeVersion;
    void localTick;
    const rel = getRelationshipContext(selectedId);
    const acqRow = listAcquisitionProspects().find((r) => r.prospect.id === selectedId);
    if (!rel || !acqRow) return null;
    const onboarding = getOnboardingForProspect(selectedId);
    return {
      stage: acqRow.stage,
      revision: rel.current?.revision,
      status: rel.current?.status,
      subject: rel.current?.subject ?? '',
      body: rel.current?.body ?? '',
      evidenceSummary: rel.current?.evidenceSummary ?? '',
      canApprove: rel.current?.status === 'pending_approval',
      canSend: rel.current?.status === 'approved',
      canRespond: rel.current?.status === 'sent',
      canCreateOpportunity: rel.responses.length > 0 && !rel.opportunity,
      transportLive: resolvedTransport.transport.mode === 'live',
      opportunity: rel.opportunity
        ? {
            id: rel.opportunity.id,
            stage: rel.opportunity.stage,
            ownerStaffId: rel.opportunity.ownerStaffId ?? 'unassigned',
          }
        : undefined,
      onboarding: onboarding
        ? {
            id: onboarding.id,
            brandId: onboarding.brandId,
            status: onboarding.status,
            steps: onboarding.steps.map((s) => ({ id: s.id, label: s.label, status: s.status })),
          }
        : undefined,
      onboardingEligible: isOnboardingEligible(rel.opportunity),
    };
  }, [selectedId, storeVersion, localTick, resolvedTransport]);

  return (
    <AdminBrandIntelligenceView
      loading={loading}
      error={null}
      canMutate={canCurrentUserMutate}
      trackedCount={dash.totalBrandsTracked}
      tier1Count={dash.tier1Count}
      tier2Count={dash.tier2Count}
      distributorGaps={dash.distributorGaps}
      highPriorityCount={dash.highPriorityCount}
      disqualifiedCount={disqualifiedProspects.length}
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
      categoryFilter={categoryFilter}
      categories={[...new Set(rawProspects.map((p) => p.category))].sort()}
      onCategoryFilterChange={setCategoryFilter}
      tierFilter={tierFilter}
      onTierFilterChange={setTierFilter}
      prospects={activeProspects}
      disqualifiedProspects={disqualifiedProspects}
      runs={runs.map((r) => ({
        runId: r.runId,
        trigger: r.trigger,
        completedAt: r.completedAt,
        scannedCount: r.scannedCount,
        newCount: r.newCount,
        updatedCount: r.updatedCount,
        disqualifiedCount: r.disqualifiedCount,
        unchangedCount: r.unchangedCount,
        changes: changes
          .filter((c) => c.runId === r.runId)
          .map((c) => ({
            id: c.id,
            brand: c.brand,
            changeType: c.changeType,
            summary: c.summary,
          })),
      }))}
      nextScheduledCheck={pipelineStatus?.nextScheduledCheck}
      runningDiscovery={runningDiscovery}
      runStatusMessage={runStatusMessage}
      onRunDiscovery={async () => {
        if (runningDiscovery) return;
        setRunningDiscovery(true);
        try {
          const { run } = await runBrandIntelligence({ trigger: 'manual' });
          setRunStatusMessage(`Run ${run.runId}: ${run.summary}`);
          setLocalTick((t) => t + 1);
        } finally {
          setRunningDiscovery(false);
        }
      }}
      onRequalify={(id, brand) => {
        if (requalifyProspect(id, 'Requalified by operator')) {
          setRunStatusMessage(`${brand} requalified.`);
        }
        setLocalTick((t) => t + 1);
      }}
      onDisqualify={(id, reason) => {
        disqualifyProspect(id, reason);
        setLocalTick((t) => t + 1);
      }}
      onSaveNotes={(id, notes) => {
        const prospect = rawProspects.find((p) => p.id === id);
        if (!prospect) return;
        const before = (prospect.notes ?? '').trim();
        const after = notes.trim();
        updateProspect({ ...prospect, notes: after });
        recordLifecycleEvent({
          id: `evt-note-${id}-${Date.now()}`,
          runId: 'manual',
          prospectId: id,
          brand: prospect.brand,
          changeType: 'updated',
          field: 'notes',
          before: before.slice(0, 80) || '(none)',
          after: after.slice(0, 80) || '(cleared)',
          summary: 'Internal notes updated by operator',
          timestamp: new Date().toISOString(),
        });
        setLocalTick((t) => t + 1);
      }}
      selectedProspect={allMapped.find((p) => p.id === selectedId) ?? null}
      onSelectProspect={setSelectedId}
      workflowSnapshot={workflowSnapshot}
      onOutreachAction={async (prospectId, action, payload) => {
        const rel = getRelationshipContext(prospectId);
        const curr = rel?.current;
        if (action === 'prepare') prepareOutreach(prospectId, actor, 'email');
        else if (action === 'modify' && curr && payload) {
          modifyOutreach(
            curr.id,
            { subject: payload.subject ?? curr.subject, body: payload.body ?? curr.body },
            actor
          );
        } else if (action === 'approve' && curr) approveOutreach(curr.id, actor, 'Approved');
        else if (action === 'reject' && curr) {
          rejectOutreach(curr.id, payload?.reason ?? 'Rejected by operator', actor);
        } else if (action === 'send' && curr) {
          await sendOutreach(curr.id, actor, resolvedTransport.transport);
        } else if (action === 'simulate_response') {
          await simulateResponse(prospectId, actor);
        } else if (action === 'create_opportunity') {
          createOpportunityFromResponse(prospectId, actor);
        } else if (action === 'start_onboarding' && rel?.opportunity) {
          beginBrandOnboarding(rel.opportunity.id, actor);
        } else if (action === 'finish_onboarding') {
          const onb = getOnboardingForProspect(prospectId);
          if (onb) finishBrandOnboarding(onb.id, actor);
        }
        setLocalTick((t) => t + 1);
        void refreshLeadsFromProspects();
        void qc.invalidateQueries({ queryKey: ['messages'] });
      }}
      onCompleteOnboardingStep={(onboardingId, stepId) => {
        completeOnboardingStep(onboardingId, stepId as OnboardingStepId, actor);
        setLocalTick((t) => t + 1);
      }}
      onSetOpportunityStage={(opportunityId, stage) => {
        setOpportunityStage(opportunityId, stage as OpportunityStage, actor);
        setLocalTick((t) => t + 1);
      }}
    />
  );
}
