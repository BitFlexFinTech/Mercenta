import { useMemo, useState } from 'react';
import { fulfillmentTrackLabel } from '@/config/fulfillmentTrack';
import { brandInboxAddress, useBrandComms } from '@/components/shared/BrandComm';
import { useApp } from '@/context/GlobalStateContext';
import {
  demoProfileChangeRequests,
  renameBrand,
  reviewProfileChangeRequest,
  setBrandTrack,
} from '@/data/api';
import {
  useBrandAgreements,
  useBrands,
  useCanonicalStoreVersion,
  useComplianceDocuments,
  useContracts,
  useMessages,
  usePurchaseOrders,
} from '@/data/queries';
import { getAcquisitionSummary, listAcquisitionProspects } from '@/lib/acquisition/outreachLifecycle';
import {
  addCrmNote,
  addCrmTask,
  buildBrandTimeline,
  crmNotes,
  crmTasks,
  getCrmMeta,
  setBrandAccountOwner,
  setBrandLifecycle,
  setBrandTags,
  setCrmTaskStatus,
} from '@/lib/crm/crmStore';
import { downloadCsv } from '@/lib/csv';
import { getOnboardingForProspect } from '@/lib/onboarding/onboardingLifecycle';
import { getPersistenceStatus } from '@/data/acquisitionStore';
import {
  complianceDocStatusPresentation,
  contractStatusPresentation,
  poStatusPresentation,
} from '@/lib/statusPresentation';
import {
  APPROVED_CATEGORIES,
  CRM_LIFECYCLE_LABELS,
  CRM_LIFECYCLE_STAGES,
  type CrmLifecycleStage,
} from '@/types';
import {
  BrandCrmView,
  type CrmBrandListItem,
  type CrmCohort,
} from './BrandCrmView';

function mapTone(t: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  if (t === 'success' || t === 'warning' || t === 'danger' || t === 'info') return t;
  return 'neutral';
}

export function BrandCrmScreen() {
  const { staff, actingStaffId, canCurrentUserMutate } = useApp();
  const comms = useBrandComms();
  const brandsQuery = useBrands();
  const contractsQuery = useContracts();
  const posQuery = usePurchaseOrders();
  const docsQuery = useComplianceDocuments();
  const agreementsQuery = useBrandAgreements();
  const messagesQuery = useMessages();
  const canonicalVersion = useCanonicalStoreVersion();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cohort, setCohort] = useState<CrmCohort>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [crmTick, setCrmTick] = useState(0);

  const brandsRaw = useMemo(() => brandsQuery.data?.data ?? [], [brandsQuery.data]);
  const contractsRaw = useMemo(() => contractsQuery.data?.data ?? [], [contractsQuery.data]);
  const posRaw = useMemo(() => posQuery.data?.data ?? [], [posQuery.data]);
  const docsRaw = useMemo(() => docsQuery.data?.data ?? [], [docsQuery.data]);
  const agreementsRaw = useMemo(() => agreementsQuery.data?.data ?? [], [agreementsQuery.data]);
  const messagesRaw = useMemo(() => messagesQuery.data?.data ?? [], [messagesQuery.data]);

  const items: CrmBrandListItem[] = useMemo(() => {
    void crmTick;
    void canonicalVersion;
    const todayStr = new Date().toISOString().slice(0, 10);
    return brandsRaw.map((b) => {
      const meta = getCrmMeta(b.id);
      const owner = staff.find((s) => s.id === meta.accountOwnerStaffId)?.name ?? '(unassigned)';
      const bPos = posRaw.filter((p) => p.brandId === b.id);
      const bContracts = contractsRaw.filter((c) => c.brandId === b.id);
      const bDocs = docsRaw.filter((d) => d.brandId === b.id);
      const bAgreements = agreementsRaw.filter((a) => a.brandId === b.id);
      const bMessages = messagesRaw
        .filter((m) => m.brandId === b.id)
        .sort((x, y) => x.createdAt.localeCompare(y.createdAt));

      return {
        id: b.id,
        businessName: b.profile.businessName,
        category: b.category,
        track: b.track,
        trackLabel: fulfillmentTrackLabel(b.track),
        contractStatus: b.contractStatus,
        lifecycleLabel: CRM_LIFECYCLE_LABELS[meta.lifecycleStage],
        tags: meta.tags,
        accountOwnerName: owner,
        changeRequests: demoProfileChangeRequests
          .filter((r) => r.brandId === b.id && r.status === 'pending')
          .map((r) => ({
            id: r.id,
            field: r.field,
            currentValue: r.currentValue,
            requestedValue: r.requestedValue,
            reason: r.reason,
          })),
        recentPos: bPos.slice(0, 5).map((po) => {
          const p = poStatusPresentation(po.status);
          return { poNumber: po.poNumber, statusLabel: p.label, statusTone: mapTone(p.tone) };
        }),
        contracts: bContracts.map((c) => {
          const p = contractStatusPresentation(c.status);
          return {
            typeLabel: c.type.replace(/_/g, ' '),
            statusLabel: p.label,
            statusTone: mapTone(p.tone),
          };
        }),
        docs: bDocs.map((d) => {
          const p = complianceDocStatusPresentation(d.status);
          return {
            id: d.id,
            typeLabel: d.type.replace(/_/g, ' '),
            statusLabel: p.label,
            statusTone: mapTone(p.tone),
          };
        }),
        agreements: bAgreements.map((a) => ({
          id: a.id,
          title:
            a.agreementType === 'logistics_sla'
              ? 'Logistics SLAs (§4.1)'
              : 'Chargeback Indemnity (§4.2)',
          version: a.version,
          acceptedAt: new Date(a.acceptedAt).toLocaleDateString('en-GB'),
        })),
        timeline: buildBrandTimeline(b.id).map((e) => ({
          id: e.id,
          kind: e.kind,
          label: e.label,
          at: new Date(e.at).toLocaleString(),
          detail: e.detail,
        })),
        tasks: crmTasks
          .filter((t) => t.brandId === b.id)
          .map((t) => ({
            id: t.id,
            title: t.title,
            dueDate: t.dueDate,
            assigneeName: staff.find((s) => s.id === t.assignedToStaffId)?.name ?? 'unassigned',
            status: t.status,
            overdue: t.status === 'open' && t.dueDate < todayStr,
          })),
        notes: crmNotes
          .filter((n) => n.brandId === b.id)
          .map((n) => ({
            id: n.id,
            createdAt: new Date(n.createdAt).toLocaleString(),
            authorName: staff.find((s) => s.id === n.authorStaffId)?.name ?? n.authorStaffId,
            body: n.body,
          })),
        messages: bMessages.slice(-6).map((m) => ({
          id: m.id,
          createdAt: new Date(m.createdAt).toLocaleString(),
          channel: m.channel,
          direction: m.direction,
          body: m.body,
        })),
      };
    });
  }, [brandsRaw, contractsRaw, posRaw, docsRaw, agreementsRaw, messagesRaw, staff, crmTick, canonicalVersion]);

  const filtered = useMemo(
    () =>
      items.filter((b) => {
        if (cohort === 'with_po' && b.recentPos.length === 0) return false;
        if (cohort === 'with_docs' && b.docs.length === 0) return false;
        if (cohort === 'no_contract' && b.contractStatus === 'active') return false;
        if (categoryFilter !== 'all' && b.category !== categoryFilter) return false;
        if (searchQuery.trim() && !b.businessName.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }
        return true;
      }),
    [items, cohort, categoryFilter, searchQuery]
  );

  const acqState = useMemo(() => {
    void canonicalVersion;
    const rows = listAcquisitionProspects()
      .filter((r) => r.opportunity)
      .map((r) => {
        const onb = getOnboardingForProspect(r.prospect.id);
        return {
          prospectId: r.prospect.id,
          brandName: r.prospect.brand,
          opportunityId: r.opportunity!.id,
          biScore: r.opportunity!.biScore,
          ownerStaffId: r.opportunity!.ownerStaffId,
          responseCount: r.responseCount,
          stage: r.opportunity!.stage,
          onboardingStatus: onb?.status,
          onboardingBrandId: onb?.brandId,
        };
      });
    const summary = getAcquisitionSummary();
    const persistence = getPersistenceStatus();
    return {
      summary: {
        ...summary,
        onboardedCount: rows.filter((r) => Boolean(r.onboardingStatus)).length,
        operationalCount: rows.filter((r) => r.onboardingStatus === 'completed').length,
        persistenceState: persistence.state,
        persistenceError: persistence.error,
      },
      rows,
    };
  }, [canonicalVersion]);

  const errObj = brandsQuery.error || contractsQuery.error || posQuery.error || docsQuery.error;
  const error =
    errObj instanceof Error ? errObj.message : errObj ? 'Failed to load Brand CRM.' : null;

  return (
    <BrandCrmView
      loading={
        brandsQuery.isPending ||
        contractsQuery.isPending ||
        posQuery.isPending ||
        docsQuery.isPending
      }
      error={error}
      onRetry={() => {
        void brandsQuery.refetch();
        void contractsQuery.refetch();
        void posQuery.refetch();
        void docsQuery.refetch();
      }}
      canMutate={canCurrentUserMutate}
      totalBrands={items.length}
      withPosCount={items.filter((b) => b.recentPos.length > 0).length}
      withDocsCount={items.filter((b) => b.docs.length > 0).length}
      noContractCount={items.filter((b) => b.contractStatus !== 'active').length}
      cohort={cohort}
      onCohortChange={setCohort}
      categoryFilter={categoryFilter}
      categories={['all', ...APPROVED_CATEGORIES]}
      onCategoryFilterChange={setCategoryFilter}
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
      onExportCsv={() =>
        downloadCsv(
          'brands.csv',
          ['Name', 'Category', 'Track', 'Contract'],
          filtered.map((b) => [b.businessName, b.category, b.track, b.contractStatus])
        )
      }
      brands={filtered}
      selectedBrand={items.find((b) => b.id === selectedId) ?? null}
      onSelectBrand={setSelectedId}
      acquisitionSummary={acqState.summary}
      acquisitionRows={acqState.rows}
      staffOptions={staff.map((s) => ({ id: s.id, name: s.name }))}
      lifecycleStages={CRM_LIFECYCLE_STAGES.map((st) => ({
        id: st,
        label: CRM_LIFECYCLE_LABELS[st],
      }))}
      trackOptions={[
        { value: 'direct_fulfillment', label: fulfillmentTrackLabel('direct_fulfillment') },
        { value: 'financed', label: fulfillmentTrackLabel('financed') },
      ]}
      onRenameBrand={(brandId, name) => {
        renameBrand(brandId, name);
        void brandsQuery.refetch();
      }}
      onOverrideTrack={(brandId, track, reason) => {
        setBrandTrack(brandId, track, reason);
        void brandsQuery.refetch();
      }}
      onReviewChangeRequest={(reqId, approve) => {
        reviewProfileChangeRequest(reqId, approve, actingStaffId, approve ? undefined : 'Rejected');
        setCrmTick((t) => t + 1);
      }}
      onAddTask={(brandId, title, dueDate, assigneeId) => {
        addCrmTask(
          {
            brandId,
            title,
            dueDate,
            assignedToStaffId: assigneeId || actingStaffId,
            createdByStaffId: actingStaffId,
          },
          actingStaffId
        );
        setCrmTick((t) => t + 1);
      }}
      onToggleTask={(taskId, currentStatus) => {
        setCrmTaskStatus(taskId, currentStatus === 'open' ? 'done' : 'open', actingStaffId);
        setCrmTick((t) => t + 1);
      }}
      onAddNote={(brandId, body) => {
        addCrmNote(brandId, body, actingStaffId);
        setCrmTick((t) => t + 1);
      }}
      onSetLifecycle={(brandId, stage) => {
        setBrandLifecycle(brandId, stage as CrmLifecycleStage, actingStaffId);
        setCrmTick((t) => t + 1);
      }}
      onAddTag={(brandId, currentTags, tag) => {
        setBrandTags(brandId, [...currentTags, tag], actingStaffId);
        setCrmTick((t) => t + 1);
      }}
      onSetAccountOwner={(brandId, staffId) => {
        setBrandAccountOwner(brandId, staffId, actingStaffId);
        setCrmTick((t) => t + 1);
      }}
      onSendMessage={async (brandId, brandName, subject, body) => {
        const res = await comms.sendToBrand(brandId, brandInboxAddress(brandName), subject, body);
        return res.sandbox
          ? 'Logged as sandbox send.'
          : res.ok
            ? 'Message sent and logged.'
            : `Send failed (${res.error}) — logged anyway.`;
      }}
      onLogCall={async (brandId, note) => {
        await comms.logCall(brandId, `[CALL] ${note}`);
        return 'Call logged to timeline.';
      }}
    />
  );
}
