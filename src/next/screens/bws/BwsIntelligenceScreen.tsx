import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import {
  ensureProspectStore,
  getProspects,
} from '@/data/prospectStore';
import {
  useBrands,
  useCanonicalStoreVersion,
  useProducts,
  usePurchaseOrders,
} from '@/data/queries';
import { useIntegrations } from '@/integrations/IntegrationsContext';
import {
  approveOutreach,
  createOpportunityFromResponse,
  getAcquisitionSummary,
  getRelationshipContext,
  listAcquisitionProspects,
  prepareOutreach,
  sendOutreach,
  setOpportunityStage,
  simulateResponse,
} from '@/lib/acquisition/outreachLifecycle';
import { resolveOutreachTransport } from '@/lib/acquisition/outreachSender';
import { runBrandIntelligence } from '@/lib/intelligence/prospectLifecycle';
import { buildUkOpportunityStatesSummary } from '@/lib/intelligence/ukOpportunityStates';
import { getTamSamReport } from '@/lib/market-data/tamSamPipeline';
import { useBrandComms } from '@/components/shared/BrandComm';
import type { MetricItem } from '@/next/components/ConsolePrimitives';
import { formatGbp } from '@/next/components/ConsoleCharts';
import type { OpportunityStage } from '@/types';
import {
  BwsIntelligenceView,
  type BwsIntelligenceSection,
  type BwsProspectRow,
} from './BwsIntelligenceView';

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

function bestOffer(asins: { amazonOfferClass: string }[]): string {
  if (!asins.length) return 'UNKNOWN';
  return asins.reduce(
    (best, a) =>
      OFFER_ORDER.indexOf(a.amazonOfferClass) < OFFER_ORDER.indexOf(best)
        ? a.amazonOfferClass
        : best,
    asins[0].amazonOfferClass
  );
}

export function BwsIntelligenceScreen({
  section,
  allowedBrandIds,
  onNavigateView,
}: {
  section: BwsIntelligenceSection;
  allowedBrandIds?: Set<string> | null;
  onNavigateView?: (viewId: string) => void;
}) {
  const { leads, actingStaffId, canCurrentUserMutate, refreshLeadsFromProspects } = useApp();
  const comms = useBrandComms();
  const { integrations } = useIntegrations();
  const brandsQ = useBrands();
  const productsQ = useProducts();
  const posQ = usePurchaseOrders();
  const storeVersion = useCanonicalStoreVersion();

  const [ready, setReady] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [runningDiscovery, setRunningDiscovery] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    ensureProspectStore();
    setReady(true);
  }, []);

  const allBrands = useMemo(() => {
    const raw = brandsQ.data?.data ?? [];
    if (!allowedBrandIds) return raw;
    return raw.filter((b) => allowedBrandIds.has(b.id));
  }, [brandsQ.data, allowedBrandIds]);

  const products = useMemo(() => productsQ.data?.data ?? [], [productsQ.data]);
  const pos = useMemo(() => posQ.data?.data ?? [], [posQ.data]);

  const rawProspects = useMemo(() => {
    void storeVersion;
    void tick;
    void ready;
    return getProspects();
  }, [storeVersion, tick, ready]);

  const acqSummary = useMemo(() => {
    void storeVersion;
    void tick;
    return getAcquisitionSummary();
  }, [storeVersion, tick]);

  const ukStates = useMemo(() => {
    void storeVersion;
    void tick;
    const availability = (providerId: string) => {
      const state = integrations[providerId as keyof typeof integrations];
      return Boolean(state && state.status === 'connected');
    };
    const summary = buildUkOpportunityStatesSummary(availability);
    return summary.states.map((st) => ({
      stateId: st.id,
      label: st.label,
      evidenceSource: st.evidenceLabels.join(', ') || 'Canonical store',
      available: st.assertable,
      reason: st.reason,
    }));
  }, [integrations, storeVersion, tick]);

  const acqRows = useMemo(() => {
    void storeVersion;
    void tick;
    return listAcquisitionProspects();
  }, [storeVersion, tick]);

  const mappedProspects: BwsProspectRow[] = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rawProspects
      .map((p) => {
        const offer = bestOffer(p.asins);
        const rel = getRelationshipContext(p.id);
        const acq = acqRows.find((r) => r.prospect.id === p.id);
        return {
          id: p.id,
          brand: p.brand,
          category: p.category,
          website: p.website,
          whyInteresting: p.whyInteresting ?? '',
          totalScore: p.score.total,
          tier: p.score.tier,
          tierLabel: TIER_LABELS[p.score.tier] ?? p.score.tier,
          offerSummary: offer.replace(/_/g, ' '),
          rawOfferClass: offer,
          ukPresence: Boolean(p.ukPresence),
          disqualified: Boolean(p.disqualified),
          disqualificationReason: p.disqualificationReason,
          leadDistributor: p.distributors[0]?.company ?? 'None recorded',
          leadContact: p.contacts[0]?.name ?? '—',
          wholesaleAvailable: p.wholesale.wholesaleAvailable,
          distributorProgramme: p.wholesale.distributorProgramme,
          outreachStatus: p.outreachStatus.replace(/_/g, ' '),
          acquisitionStage: acq?.stage ?? 'not enrolled',
          canPrepareOutreach:
            !rel?.current && !rel?.opportunity,
          canApproveOutreach: rel?.current?.status === 'pending_approval',
          canSendOutreach: rel?.current?.status === 'approved',
          canSimulateResponse: rel?.current?.status === 'sent',
          canCreateOpportunity: Boolean(rel?.responses.length && !rel?.opportunity),
          opportunityId: rel?.opportunity?.id,
          opportunityStage: rel?.opportunity?.stage,
          asins: p.asins.map((a) => ({
            asin: a.asin,
            title: a.title,
            offerClass: a.amazonOfferClass,
            price: a.price,
            rating: a.rating,
            reviewCount: a.reviewCount,
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
        };
      })
      .filter((r) => {
        if (q && !r.brand.toLowerCase().includes(q) && !r.category.toLowerCase().includes(q)) {
          return false;
        }
        if (tierFilter && r.tier !== tierFilter) return false;
        return true;
      });
  }, [rawProspects, acqRows, searchQuery, tierFilter]);

  const countryRows = useMemo(() => {
    const regions = new Map<
      string,
      { label: string; brandCount: number; productCount: number; leadCount: number; openPoValueGbp: number }
    >();
    for (const b of allBrands) {
      const key = (b.nation || 'Unspecified').toLowerCase();
      const existing = regions.get(key) ?? {
        label: b.nation || 'Unspecified origin',
        brandCount: 0,
        productCount: 0,
        leadCount: 0,
        openPoValueGbp: 0,
      };
      existing.brandCount += 1;
      existing.productCount += products.filter((p) => p.brandId === b.id).length;
      existing.openPoValueGbp += pos
        .filter((po) => po.brandId === b.id)
        .reduce((s, po) => s + po.poValue, 0);
      regions.set(key, existing);
    }
    for (const l of leads) {
      const key = (l.region || 'eu').toLowerCase();
      const existing = regions.get(key) ?? {
        label: `${l.region.toUpperCase()} Leads`,
        brandCount: 0,
        productCount: 0,
        leadCount: 0,
        openPoValueGbp: 0,
      };
      existing.leadCount += 1;
      regions.set(key, existing);
    }
    return Array.from(regions.entries()).map(([regionKey, v]) => ({ regionKey, ...v }));
  }, [allBrands, products, pos, leads]);

  const categoryBenchmarks = useMemo(() => {
    const report = getTamSamReport();
    return report.categories.map((c) => ({
      category: c.category,
      tamLabel: `£${c.tamGbpBillions.toFixed(1)}B`,
      samLabel: `£${c.samGbpBillions.toFixed(2)}B`,
      sharePct: c.samPercentage,
      rationale: c.description,
    }));
  }, []);

  const pitchTargetCount = rawProspects.filter(
    (p) => !p.disqualified && bestOffer(p.asins) !== 'DIRECT_AMAZON_RETAIL'
  ).length;
  const totalPoVal = pos.reduce((s, po) => s + po.poValue, 0);

  const metrics: MetricItem[] = [
    {
      id: 'brands',
      label: 'Brands on platform',
      value: String(allBrands.length),
      context: `${products.length} catalog SKUs`,
      onClick: () => onNavigateView?.('brand-portfolio'),
    },
    {
      id: 'prospects',
      label: 'Tracked prospects',
      value: String(rawProspects.length),
      context: `${pitchTargetCount} non-1P pitch targets`,
      onClick: () => onNavigateView?.('pitch-targets'),
    },
    {
      id: 'acq',
      label: 'Acquisition opportunities',
      value: String(acqSummary.opportunities),
      context: `${acqSummary.enrolled} enrolled in outreach`,
      onClick: () => onNavigateView?.('acquisition-pipeline'),
    },
    {
      id: 'po-val',
      label: 'Wholesale PO volume',
      value: formatGbp(totalPoVal),
      context: `${pos.length} purchase orders`,
      onClick: () => onNavigateView?.('wholesale-distribution'),
    },
  ];

  const actor = useMemo(
    () => ({ staffId: actingStaffId, canMutate: canCurrentUserMutate }),
    [actingStaffId, canCurrentUserMutate]
  );

  const transport = useMemo(
    () => resolveOutreachTransport(integrations.email, comms.emailClient).transport,
    [integrations.email, comms.emailClient]
  );

  const errObj = brandsQ.error || productsQ.error || posQ.error;
  const error =
    errObj instanceof Error ? errObj.message : errObj ? 'Failed to load BWS intelligence data.' : null;

  return (
    <BwsIntelligenceView
      section={section}
      loading={!ready || brandsQ.isPending || productsQ.isPending || posQ.isPending}
      error={error}
      onRetry={() => {
        void brandsQ.refetch();
        void productsQ.refetch();
        void posQ.refetch();
      }}
      canMutate={canCurrentUserMutate}
      metrics={metrics}
      countryRows={countryRows}
      categoryBenchmarks={categoryBenchmarks}
      opportunityStates={ukStates}
      prospects={mappedProspects}
      selectedProspect={mappedProspects.find((p) => p.id === selectedId) ?? null}
      onSelectProspect={setSelectedId}
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
      tierFilter={tierFilter}
      onTierFilterChange={setTierFilter}
      runningDiscovery={runningDiscovery}
      statusMessage={statusMessage}
      onRunDiscovery={async () => {
        if (runningDiscovery) return;
        setRunningDiscovery(true);
        try {
          const res = await runBrandIntelligence({ trigger: 'manual' });
          setStatusMessage(`Discovery scan ${res.run.runId}: ${res.run.summary}`);
          setTick((t) => t + 1);
        } finally {
          setRunningDiscovery(false);
        }
      }}
      onNavigateSection={(viewId) => onNavigateView?.(viewId)}
      onOutreachAction={async (prospectId, action) => {
        const rel = getRelationshipContext(prospectId);
        const curr = rel?.current;
        if (action === 'prepare') prepareOutreach(prospectId, actor, 'email');
        else if (action === 'approve' && curr) approveOutreach(curr.id, actor, 'Approved');
        else if (action === 'send' && curr) await sendOutreach(curr.id, actor, transport);
        else if (action === 'simulate_response') await simulateResponse(prospectId, actor);
        else if (action === 'create_opportunity') createOpportunityFromResponse(prospectId, actor);
        setStatusMessage(`Recorded acquisition action (${action.replace(/_/g, ' ')}).`);
        setTick((t) => t + 1);
        void refreshLeadsFromProspects();
      }}
      onSetOpportunityStage={(opportunityId, stage) => {
        setOpportunityStage(opportunityId, stage as OpportunityStage, actor);
        setStatusMessage(`Updated opportunity stage to ${stage.replace(/_/g, ' ')}.`);
        setTick((t) => t + 1);
      }}
    />
  );
}
