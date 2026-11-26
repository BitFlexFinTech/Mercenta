import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PO_ACK_STATUSES_WITH_OBLIGATION } from '@/config/purchaseOrders';
import { useApp } from '@/context/GlobalStateContext';
import {
  applyListingReviewOverrides,
  approveOnBehalfRejection,
  pollSubmissionStatus,
  reviewListingRecommendation,
} from '@/data/api';
import {
  useBrands,
  useCanonicalStoreVersion,
  useCatalogSubmissions,
  useComplianceDocuments,
  useProducts,
  usePurchaseOrders,
} from '@/data/queries';
import { analyzeProductListing } from '@/lib/intelligence/listingAnalyzer';
import { poOnBehalfRejectionDraft } from '@/lib/commerce/poAcknowledgementWindow';
import { processPendingChannelInstructions } from '@/lib/commerce/proxyProcessor';
import {
  complianceDocStatusPresentation,
  poStatusPresentation,
  submissionStatusPresentation,
} from '@/lib/statusPresentation';
import { recordManualDocumentVerification } from '@/lib/verification/documentVerification';
import type { MetricItem, SemanticTone } from '@/next/components/ConsolePrimitives';
import {
  TalentApprovalsView,
  type ApprovalListingRow,
  type ApprovalQueueTab,
} from './TalentApprovalsView';

function mapTone(t: string): SemanticTone {
  if (t === 'success' || t === 'warning' || t === 'danger' || t === 'info') return t;
  return 'neutral';
}

export function TalentApprovalsScreen({
  allowedBrandIds,
  onNavigateView,
}: {
  allowedBrandIds?: Set<string> | null;
  onNavigateView?: (viewId: string) => void;
}) {
  const qc = useQueryClient();
  const { actingStaffId, actingStaff, canCurrentUserMutate } = useApp();
  const brandsQ = useBrands();
  const productsQ = useProducts();
  const submissionsQ = useCatalogSubmissions();
  const docsQ = useComplianceDocuments();
  const posQ = usePurchaseOrders();
  const version = useCanonicalStoreVersion();

  const [activeTab, setActiveTab] = useState<ApprovalQueueTab>('submissions');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [localStamp, setLocalStamp] = useState(0);

  const brands = useMemo(() => brandsQ.data?.data ?? [], [brandsQ.data]);
  const brandNameMap = useMemo(
    () => new Map(brands.map((b) => [b.id, b.profile.businessName])),
    [brands]
  );

  const products = useMemo(() => {
    const raw = productsQ.data?.data ?? [];
    return allowedBrandIds ? raw.filter((p) => allowedBrandIds.has(p.brandId)) : raw;
  }, [productsQ.data, allowedBrandIds]);

  const submissions = useMemo(() => {
    const raw = submissionsQ.data?.data ?? [];
    return (allowedBrandIds ? raw.filter((s) => allowedBrandIds.has(s.brandId)) : raw).map((s) => {
      const pres = submissionStatusPresentation(s.status);
      return {
        id: s.id,
        brandId: s.brandId,
        brandName: brandNameMap.get(s.brandId) ?? s.brandId,
        productName: s.productName,
        sku: s.sku,
        asin: s.asin,
        status: s.status,
        statusLabel: pres.label,
        statusTone: mapTone(pres.tone),
        submittedAt: s.submittedAt.slice(0, 10),
        simulated: Boolean(s.simulated),
        rejectionReason: s.rejectionReason,
      };
    });
  }, [submissionsQ.data, allowedBrandIds, brandNameMap]);

  const brandCategoryMap = useMemo(
    () => new Map(brands.map((b) => [b.id, b.category])),
    [brands]
  );

  const listings: ApprovalListingRow[] = useMemo(() => {
    void version;
    void localStamp;
    const rows: ApprovalListingRow[] = [];
    for (const p of products) {
      const rawAnalysis = analyzeProductListing(p as unknown as Record<string, unknown>, {
        category: brandCategoryMap.get(p.brandId) ?? 'Home',
        brandId: p.brandId,
      });
      const withOverrides = applyListingReviewOverrides(rawAnalysis, p.brandId);
      for (const rec of withOverrides.recommendations) {
        rows.push({
          id: rec.id,
          brandId: p.brandId,
          brandName: brandNameMap.get(p.brandId) ?? p.brandId,
          sku: p.sku,
          productName: p.name,
          area: rec.area,
          title: rec.title,
          detail: rec.detail,
          impact: rec.impact,
          status: rec.status,
          suggestedCopy: rec.suggestedCopy,
          editedCopy: rec.editedCopy,
        });
      }
    }
    return rows;
  }, [products, brandNameMap, brandCategoryMap, version, localStamp]);

  const complianceDocs = useMemo(() => {
    const raw = docsQ.data?.data ?? [];
    return (allowedBrandIds ? raw.filter((d) => allowedBrandIds.has(d.brandId)) : raw).map((d) => {
      const pres = complianceDocStatusPresentation(d.status);
      return {
        id: d.id,
        brandId: d.brandId,
        brandName: brandNameMap.get(d.brandId) ?? d.brandId,
        docTypeLabel: d.type.replace(/_/g, ' '),
        status: d.status,
        statusLabel: pres.label,
        statusTone: mapTone(pres.tone),
        version: d.version ?? 1,
        expiryDate: d.expiryDate,
      };
    });
  }, [docsQ.data, allowedBrandIds, brandNameMap]);

  const purchaseOrders = useMemo(() => {
    const raw = posQ.data?.data ?? [];
    return (allowedBrandIds ? raw.filter((p) => allowedBrandIds.has(p.brandId)) : raw)
      .map((po) => ({ po, draft: poOnBehalfRejectionDraft(po) }))
      .filter(({ po, draft }) => PO_ACK_STATUSES_WITH_OBLIGATION.includes(po.status) || draft.available)
      .map(({ po, draft }) => {
        const pres = poStatusPresentation(po.status);
        return {
          id: po.id,
          brandId: po.brandId,
          brandName: brandNameMap.get(po.brandId) ?? po.brandId,
          poNumber: po.poNumber,
          statusLabel: pres.label,
          statusTone: mapTone(pres.tone),
          poValueGbp: po.poValue,
          orderDate: po.orderDate.slice(0, 10),
          hasDraft: draft.available,
          draftId: draft.draftId,
          draftReason: draft.ruleText,
        };
      });
  }, [posQ.data, allowedBrandIds, brandNameMap]);

  const metrics: MetricItem[] = [
    {
      id: 'sub',
      label: 'Product Submissions',
      value: String(submissions.length),
      context: `${submissions.filter((s) => s.status !== 'live').length} non-live`,
      onClick: () => setActiveTab('submissions'),
    },
    {
      id: 'lst',
      label: 'Listing Recommendations',
      value: String(listings.length),
      context: `${listings.filter((l) => l.status === 'pending').length} pending review`,
      onClick: () => setActiveTab('listings'),
    },
    {
      id: 'doc',
      label: 'Compliance Documents',
      value: String(complianceDocs.length),
      context: `${complianceDocs.filter((d) => d.status === 'under_review' || d.status === 'uploaded').length} awaiting review`,
      onClick: () => setActiveTab('compliance'),
    },
    {
      id: 'po',
      label: 'PO Ack / Draft Queue',
      value: String(purchaseOrders.length),
      context: `${purchaseOrders.filter((p) => p.hasDraft).length} on-behalf drafts`,
      onClick: () => setActiveTab('purchase_orders'),
    },
  ];

  const errObj = brandsQ.error || productsQ.error || submissionsQ.error || docsQ.error || posQ.error;
  const error =
    errObj instanceof Error ? errObj.message : errObj ? 'Failed to load approval queues.' : null;

  return (
    <TalentApprovalsView
      loading={
        brandsQ.isPending ||
        productsQ.isPending ||
        submissionsQ.isPending ||
        docsQ.isPending ||
        posQ.isPending
      }
      error={error}
      onRetry={() => {
        void brandsQ.refetch();
        void productsQ.refetch();
        void submissionsQ.refetch();
        void docsQ.refetch();
        void posQ.refetch();
      }}
      canMutate={canCurrentUserMutate}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      metrics={metrics}
      submissions={submissions}
      listings={listings}
      complianceDocs={complianceDocs}
      purchaseOrders={purchaseOrders}
      notice={notice}
      actionError={actionError}
      busyId={busyId}
      onPollSubmission={async (submissionId) => {
        setBusyId(submissionId);
        setNotice(null);
        setActionError(null);
        try {
          const sub = submissionsQ.data?.data?.find((s) => s.id === submissionId);
          const res = await pollSubmissionStatus(sub?.submissionId ?? submissionId);
          await qc.invalidateQueries({ queryKey: ['catalog-submissions'] });
          setNotice(
            res.ok
              ? `Polled ${sub?.sku ?? submissionId}: status is ${res.status ?? 'checked'}.`
              : res.error ?? 'Submission poll refused.'
          );
        } catch (err) {
          setActionError(err instanceof Error ? err.message : 'Poll failed.');
        } finally {
          setBusyId(null);
        }
      }}
      onReviewListing={async (brandId, recId, decision, editedCopy) => {
        setBusyId(recId);
        setNotice(null);
        setActionError(null);
        const res = await reviewListingRecommendation(brandId, recId, decision, {
          editedCopy,
          actorId: actingStaffId,
        });
        setBusyId(null);
        if (!res.ok) setActionError(res.error ?? 'Failed to record listing review.');
        else setNotice(`Listing recommendation marked ${decision}.`);
        setLocalStamp((s) => s + 1);
      }}
      onReviewCompliance={async (docId, decision, note) => {
        setBusyId(docId);
        setNotice(null);
        setActionError(null);
        const res = await recordManualDocumentVerification(
          docId,
          { staffId: actingStaff?.name ?? actingStaffId, canMutate: canCurrentUserMutate },
          decision,
          note?.trim() ||
            (decision === 'approve'
              ? 'Approved in Approvals queue.'
              : 'Rejected in Approvals queue — replacement required.')
        );
        setBusyId(null);
        if (!res.ok) setActionError(res.error);
        else {
          setNotice(`Compliance document ${decision === 'approve' ? 'approved' : 'rejected'}.`);
          await qc.invalidateQueries({ queryKey: ['compliance-documents'] });
        }
      }}
      onApprovePoDraft={async (poId, brandId, draftId) => {
        setBusyId(poId);
        setNotice(null);
        setActionError(null);
        const res = approveOnBehalfRejection(poId, {
          actorStaffId: actingStaffId,
          actorLabel: actingStaff?.name ?? actingStaffId,
          actorBrandId: brandId,
          draftId,
        });
        if (!res.ok) {
          setActionError(res.error ?? 'Could not approve PO draft.');
        } else {
          await processPendingChannelInstructions();
          await qc.invalidateQueries({ queryKey: ['purchase-orders'] });
          setNotice('On-behalf PO rejection draft approved and channel instruction queued.');
        }
        setBusyId(null);
      }}
      onOpenPurchaseOrders={() => onNavigateView?.('purchase-orders')}
    />
  );
}
