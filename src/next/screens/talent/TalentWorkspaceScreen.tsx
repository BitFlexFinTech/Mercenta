import { useEffect, useMemo, useState } from 'react';
import { useBrandComms } from '@/components/shared/BrandComm';
import { fulfillmentTrackLabel } from '@/config/fulfillmentTrack';
import { useApp } from '@/context/GlobalStateContext';
import { ensureProspectStore, getProspects } from '@/data/prospectStore';
import {
  useBrands,
  useCanonicalStoreVersion,
  useCatalogSubmissions,
  useCommissions,
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
import {
  computeBrandNetShare,
  normalisePayoutTrack,
  resolveCommissionRatePct,
} from '@/lib/billing/payouts';
import { evaluateProductCompleteness } from '@/lib/catalog/productCompleteness';
import { analyzeProductListing } from '@/lib/intelligence/listingAnalyzer';
import { buildUkOpportunityStatesSummary } from '@/lib/intelligence/ukOpportunityStates';
import {
  commissionStatusPresentation,
  submissionStatusPresentation,
} from '@/lib/statusPresentation';
import { formatGbp } from '@/next/components/ConsoleCharts';
import type { MetricItem, SemanticTone } from '@/next/components/ConsolePrimitives';
import { SuperAdminScreen } from '@/next/screens/admin/SuperAdminScreen';
import type { OpportunityStage } from '@/types';
import {
  TalentWorkspaceView,
  type TalentWorkspaceSection,
} from './TalentWorkspaceView';

const TIER_LABELS: Record<string, string> = {
  tier_1: 'Attack Now',
  tier_2: 'High Prob',
  tier_3: 'Upside',
  tier_4: 'Reserve',
  unscored: 'Below',
};

function mapTone(t: string): SemanticTone {
  if (t === 'success' || t === 'warning' || t === 'danger' || t === 'info') return t;
  return 'neutral';
}

export function TalentWorkspaceScreen({
  section,
  allowedBrandIds,
  onNavigateView,
}: {
  section: TalentWorkspaceSection;
  allowedBrandIds?: Set<string> | null;
  onNavigateView?: (viewId: string) => void;
}) {
  const { session, actingStaff, actingStaffId, canCurrentUserMutate, refreshLeadsFromProspects } =
    useApp();
  const comms = useBrandComms();
  const { integrations, modes } = useIntegrations();
  const brandsQ = useBrands();
  const productsQ = useProducts();
  const posQ = usePurchaseOrders();
  const commQ = useCommissions();
  const submissionsQ = useCatalogSubmissions();
  const version = useCanonicalStoreVersion();

  const [ready, setReady] = useState(false);
  const [tick, setTick] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    ensureProspectStore();
    setReady(true);
  }, []);

  const brands = useMemo(() => {
    const raw = brandsQ.data?.data ?? [];
    return allowedBrandIds ? raw.filter((b) => allowedBrandIds.has(b.id)) : raw;
  }, [brandsQ.data, allowedBrandIds]);

  const products = useMemo(() => {
    const raw = productsQ.data?.data ?? [];
    return allowedBrandIds ? raw.filter((p) => allowedBrandIds.has(p.brandId)) : raw;
  }, [productsQ.data, allowedBrandIds]);

  const pos = useMemo(() => {
    const raw = posQ.data?.data ?? [];
    return allowedBrandIds ? raw.filter((p) => allowedBrandIds.has(p.brandId)) : raw;
  }, [posQ.data, allowedBrandIds]);

  const commissionsRaw = useMemo(() => {
    const raw = commQ.data?.data ?? [];
    return allowedBrandIds ? raw.filter((c) => allowedBrandIds.has(c.brandId)) : raw;
  }, [commQ.data, allowedBrandIds]);

  const submissionsRaw = useMemo(
    () => submissionsQ.data?.data ?? [],
    [submissionsQ.data]
  );

  const brandMap = useMemo(
    () => new Map(brands.map((b) => [b.id, b])),
    [brands]
  );

  const rawProspects = useMemo(() => {
    void version;
    void tick;
    void ready;
    return getProspects();
  }, [version, tick, ready]);

  const acqRows = useMemo(() => {
    void version;
    void tick;
    return listAcquisitionProspects();
  }, [version, tick]);

  const acqSummary = useMemo(() => {
    void version;
    void tick;
    return getAcquisitionSummary();
  }, [version, tick]);

  const rightsHolders = useMemo(
    () =>
      brands.map((b) => ({
        id: b.id,
        businessName: b.profile.businessName,
        category: b.category,
        nation: b.nation ?? '',
        trackLabel: fulfillmentTrackLabel(b.track),
        contractStatus: b.contractStatus,
        contactPhone: b.profile.phone || '—',
        skuCount: products.filter((p) => p.brandId === b.id).length,
        poValueGbp: pos
          .filter((p) => p.brandId === b.id)
          .reduce((s, p) => s + p.poValue, 0),
      })),
    [brands, products, pos]
  );

  const productReadiness = useMemo(
    () =>
      products.map((p) => {
        const comp = evaluateProductCompleteness(p as unknown as Record<string, unknown>);
        const analysis = analyzeProductListing(p as unknown as Record<string, unknown>, {
          category: brandMap.get(p.brandId)?.category ?? 'Home',
          brandId: p.brandId,
        });
        const sub = submissionsRaw.find(
          (s) => s.brandId === p.brandId && s.sku === p.sku
        );
        const subPres = sub ? submissionStatusPresentation(sub.status) : null;
        const imgCount = Array.isArray(p.productImages)
          ? p.productImages.length
          : p.image
            ? 1
            : 0;
        return {
          id: p.id,
          brandId: p.brandId,
          brandName: brandMap.get(p.brandId)?.profile.businessName ?? p.brandId,
          sku: p.sku,
          name: p.name,
          complete: comp.complete,
          missingFields: comp.missingLabels,
          submissionStatus: subPres?.label ?? 'Not submitted',
          submissionTone: subPres ? mapTone(subPres.tone) : ('neutral' as SemanticTone),
          listingScore: analysis.healthScore,
          imageCount: imgCount,
        };
      }),
    [products, brandMap, submissionsRaw]
  );

  const commissions = useMemo(
    () =>
      commissionsRaw.map((c) => {
        const brand = brandMap.get(c.brandId);
        const track = normalisePayoutTrack(brand?.track ?? 'financed');
        const rate = resolveCommissionRatePct({
          commissionRate: c.commissionRate,
          commissionAmount: c.commissionAmount,
          poValue: c.poValue,
        });
        const net = computeBrandNetShare({
          poValue: c.poValue,
          commissionRatePct: rate,
          fulfillmentTrack: track,
        });
        const pres = commissionStatusPresentation(c.status);
        return {
          id: c.id,
          brandName: brand?.profile.businessName ?? c.brandId,
          poNumber: c.purchaseOrderId,
          poValueGbp: c.poValue,
          commissionRatePct: rate,
          commissionAmountGbp: c.commissionAmount,
          netBrandShareGbp: net,
          statusLabel: pres.label,
          statusTone: mapTone(pres.tone),
          createdAt: c.createdAt.slice(0, 10),
        };
      }),
    [commissionsRaw, brandMap]
  );

  const prospects = useMemo(
    () =>
      rawProspects.map((p) => {
        const rel = getRelationshipContext(p.id);
        const acq = acqRows.find((r) => r.prospect.id === p.id);
        return {
          id: p.id,
          brand: p.brand,
          category: p.category,
          totalScore: p.score.total,
          tierLabel: TIER_LABELS[p.score.tier] ?? p.score.tier,
          offerSummary: (p.asins[0]?.amazonOfferClass ?? 'UNKNOWN').replace(/_/g, ' '),
          acquisitionStage: acq?.stage ?? 'not enrolled',
          opportunityStage: rel?.opportunity?.stage,
          opportunityId: rel?.opportunity?.id,
          canPrepare: !rel?.current && !rel?.opportunity,
          canApprove: rel?.current?.status === 'pending_approval',
          canSend: rel?.current?.status === 'approved',
          canRespond: rel?.current?.status === 'sent',
          canCreateOpp: Boolean(rel?.responses.length && !rel?.opportunity),
          whyInteresting: p.whyInteresting ?? '',
        };
      }),
    [rawProspects, acqRows]
  );

  const ukStates = useMemo(() => {
    const availability = (providerId: string) => {
      const state = integrations[providerId as keyof typeof integrations];
      return Boolean(state && state.status === 'connected');
    };
    return buildUkOpportunityStatesSummary(availability).states.map((s) => ({
      stateId: s.id,
      label: s.label,
      evidenceSource: s.evidenceLabels.join(', ') || 'Canonical store',
      available: s.assertable,
    }));
  }, [integrations]);

  const brandValueChart = useMemo(
    () =>
      rightsHolders
        .slice()
        .sort((a, b) => b.poValueGbp - a.poValueGbp)
        .slice(0, 6)
        .map((r) => ({
          label: r.businessName.split(' ')[0] ?? r.businessName,
          value: Math.round(r.poValueGbp),
          hint: r.businessName,
        })),
    [rightsHolders]
  );

  /* §FRONTEND-REDESIGN BATCH 4 — HOOK-ORDER DEFECT FIXED AT SOURCE.
     v1 returned early for a super-admin `settings` visit BEFORE these two
     useMemo calls, so that one route ran fewer hooks than every other render of
     this component. React throws "Rendered fewer hooks than expected" the moment
     the section changes — the crash was one navigation away. The hooks now run
     first, unconditionally; the early return follows them. */
  const actor = useMemo(
    () => ({ staffId: actingStaffId, canMutate: canCurrentUserMutate }),
    [actingStaffId, canCurrentUserMutate]
  );

  const transport = useMemo(
    () => resolveOutreachTransport(integrations.email, comms.emailClient).transport,
    [integrations.email, comms.emailClient]
  );

  if (section === 'settings' && session?.tier === 'super_admin') {
    return <SuperAdminScreen onNavigateView={onNavigateView} />;
  }

  const totalNetBrandShare = commissions.reduce((s, c) => s + c.netBrandShareGbp, 0);
  const totalCommissions = commissions.reduce((s, c) => s + c.commissionAmountGbp, 0);
  const completeSkus = productReadiness.filter((p) => p.complete).length;

  const metrics: MetricItem[] =
    section === 'royalties'
      ? [
          {
            id: 'net-share',
            label: 'Counterparty Net Share',
            value: formatGbp(totalNetBrandShare, 2),
          },
          {
            id: 'mercenta-comm',
            label: 'Mercenta Commission',
            value: formatGbp(totalCommissions, 2),
          },
          {
            id: 'entries',
            label: 'Settlement Records',
            value: String(commissions.length),
          },
          {
            id: 'paid',
            label: 'Settled Entries',
            value: String(commissionsRaw.filter((c) => c.status === 'paid').length),
          },
        ]
      : [
          { id: 'rh', label: 'Rights Holders (Brands)', value: String(brands.length) },
          {
            id: 'skus',
            label: 'Spec-Complete SKUs',
            value: `${completeSkus} / ${products.length}`,
          },
          {
            id: 'opp',
            label: 'Acquisition Opportunities',
            value: String(acqSummary.opportunities),
          },
          {
            id: 'po',
            label: 'Cumulative PO Value',
            value: formatGbp(pos.reduce((s, p) => s + p.poValue, 0)),
          },
        ];

  const integrationStatuses = Object.entries(integrations).map(([id, cfg]) => ({
    id,
    label: id.replace(/_/g, ' ').toUpperCase(),
    mode: modes[id as keyof typeof modes] ?? 'simulation',
    status: cfg?.status ?? 'disconnected',
  }));

  const errObj = brandsQ.error || productsQ.error || posQ.error || commQ.error;
  const error =
    errObj instanceof Error ? errObj.message : errObj ? 'Failed to load Talent Commerce data.' : null;

  return (
    <TalentWorkspaceView
      section={section}
      loading={!ready || brandsQ.isPending || productsQ.isPending || posQ.isPending || commQ.isPending}
      error={error}
      onRetry={() => {
        void brandsQ.refetch();
        void productsQ.refetch();
        void posQ.refetch();
        void commQ.refetch();
      }}
      canMutate={canCurrentUserMutate}
      metrics={metrics}
      rightsHolders={rightsHolders}
      productReadiness={productReadiness}
      commissions={commissions}
      prospects={prospects}
      ukStates={ukStates}
      brandValueChart={brandValueChart}
      integrationStatuses={integrationStatuses}
      actingStaffName={actingStaff?.name ?? 'Mercenta Operator'}
      statusMessage={statusMessage}
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
      onNavigateView={(viewId) => onNavigateView?.(viewId)}
    />
  );
}
