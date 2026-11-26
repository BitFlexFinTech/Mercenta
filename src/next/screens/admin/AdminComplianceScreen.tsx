import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useApp } from '@/context/GlobalStateContext';
import { uploadComplianceDoc } from '@/data/api';
import { useBrands, useComplianceDocuments, useProducts } from '@/data/queries';
import { defaultIntegrationMode } from '@/integrations/registry';
import { generateUkcaDeclaration } from '@/lib/customsDocs';
import { useRecordDeepLink } from '@/lib/runtime/recordDeepLink';
import {
  complianceDocStatusPresentation,
  documentVerificationStatusPresentation,
} from '@/lib/statusPresentation';
import {
  recordManualDocumentVerification,
  verifyDocumentVersion,
} from '@/lib/verification/documentVerification';
import type { ComplianceDocument } from '@/types';
import type { SemanticTone } from '@/next/components/ConsolePrimitives';
import {
  AdminComplianceView,
  type ComplianceBrandGroup,
  type ComplianceDeclarationBundle,
  type ComplianceDocRow,
  type ComplianceReviewFilter,
} from './AdminComplianceView';

function mapTone(t: string): SemanticTone {
  if (t === 'success' || t === 'warning' || t === 'danger' || t === 'info') return t;
  return 'neutral';
}

export function AdminComplianceScreen() {
  const { actingStaff, canCurrentUserMutate } = useApp();
  const qc = useQueryClient();
  const docsQuery = useComplianceDocuments();
  const brandsQuery = useBrands();
  const productsQuery = useProducts();

  const [reviewFilter, setReviewFilter] = useState<ComplianceReviewFilter>('all');
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [fullRecordId, setFullRecordId] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const reviewer = actingStaff?.name ?? 'Tadii';

  const docs = useMemo(() => docsQuery.data?.data ?? [], [docsQuery.data]);
  const brandsList = useMemo(() => brandsQuery.data?.data ?? [], [brandsQuery.data]);
  const productsList = useMemo(() => productsQuery.data?.data ?? [], [productsQuery.data]);

  const deepLinkDoc = useRecordDeepLink('compliance');
  useEffect(() => {
    if (!deepLinkDoc) return;
    if (docs.some((d) => d.id === deepLinkDoc)) setDrawerId(deepLinkDoc);
  }, [deepLinkDoc, docs]);

  const brandNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of brandsList) map.set(b.id, b.profile.businessName);
    return map;
  }, [brandsList]);

  const docRows: ComplianceDocRow[] = useMemo(
    () =>
      docs.map((d) => {
        const st = complianceDocStatusPresentation(d.status);
        const ver = d.verificationStatus
          ? documentVerificationStatusPresentation(d.verificationStatus)
          : null;
        return {
          id: d.id,
          brandId: d.brandId,
          brandName: brandNameMap.get(d.brandId) ?? d.brandId,
          type: d.type,
          version: d.version ?? 1,
          status: d.status,
          statusLabel: st.label,
          statusTone: mapTone(st.tone),
          verificationLabel: ver ? ver.label : null,
          verificationTone: ver ? mapTone(ver.tone) : null,
          supersedesDocumentId: d.supersedesDocumentId,
          expiryDate: d.expiryDate,
          issuer: d.issuer,
        };
      }),
    [docs, brandNameMap]
  );

  const groups: ComplianceBrandGroup[] = useMemo(() => {
    /* §FRONTEND-REDESIGN BATCH 3 — the predicate lives INSIDE the memo. It is a
       closure over `reviewFilter`, so declaring it outside made its identity change
       every render and the hook lint could not verify the dependency: it reads the
       same `reviewFilter` the dep array already lists. Same behaviour, one owner. */
    const matchesFilter = (d: ComplianceDocRow) => {
      if (reviewFilter === 'all') return true;
      if (reviewFilter === 'awaiting') return d.status === 'under_review' || d.status === 'uploaded';
      if (reviewFilter === 'approved') return d.status === 'approved';
      return (
        d.status === 'expired' ||
        d.status === 'expiring' ||
        d.status === 'missing' ||
        d.status === 'rejected'
      );
    };
    const map = new Map<string, ComplianceDocRow[]>();
    for (const d of docRows) {
      if (!matchesFilter(d)) continue;
      const list = map.get(d.brandId) ?? [];
      list.push(d);
      map.set(d.brandId, list);
    }
    return Array.from(map.entries()).map(([brandId, brandDocs]) => ({
      brandId,
      brandName: brandNameMap.get(brandId) ?? brandId,
      docs: brandDocs,
      total: brandDocs.length,
      pending: brandDocs.filter((x) => x.status === 'under_review' || x.status === 'uploaded').length,
      approved: brandDocs.filter((x) => x.status === 'approved').length,
    }));
  }, [docRows, reviewFilter, brandNameMap]);

  const metrics = useMemo(
    () => ({
      total: docRows.length,
      awaiting: docRows.filter((d) => d.status === 'under_review' || d.status === 'uploaded').length,
      approved: docRows.filter((d) => d.status === 'approved').length,
      attention: docRows.filter(
        (d) =>
          d.status === 'expired' ||
          d.status === 'expiring' ||
          d.status === 'missing' ||
          d.status === 'rejected'
      ).length,
      brands: new Set(docRows.map((d) => d.brandId)).size,
    }),
    [docRows]
  );

  const drawerDoc = docRows.find((d) => d.id === drawerId) ?? null;
  const drawerProductsCount = drawerDoc
    ? productsList.filter((p) => p.brandId === drawerDoc.brandId).length
    : 0;

  const fullRecordDoc = docRows.find((d) => d.id === fullRecordId) ?? null;
  const fullRecordBundle: ComplianceDeclarationBundle | null = useMemo(() => {
    if (!fullRecordDoc) return null;
    const brand = brandsList.find((b) => b.id === fullRecordDoc.brandId);
    const prods = productsList.filter((p) => p.brandId === fullRecordDoc.brandId);
    if (!brand || prods.length === 0) return null;
    const po = {
      id: `preview-${fullRecordDoc.id}`,
      brandId: brand.id,
      poNumber: `PREVIEW-${brand.id.slice(0, 6).toUpperCase()}`,
      status: 'accepted' as const,
      poValue: 0,
      commissionRate: 0,
      commissionAmount: 0,
      orderDate: '',
      lineItems: prods.map((p) => ({
        sku: p.sku,
        productName: p.name,
        quantity: 1,
        unitPrice: p.exWorksPrice,
        commodityCode: p.commodityCode,
      })),
    };
    const generated = generateUkcaDeclaration({
      po,
      brandName: brand.profile.businessName,
      products: prods,
    });
    return {
      title: generated.title,
      poNumber: generated.poNumber,
      brandName: generated.brandName,
      preFilled: generated.preFilled,
      productNames: prods.map((p) => `${p.name} (${p.sku})`),
    };
  }, [fullRecordDoc, brandsList, productsList]);

  async function runAutomated(id: string) {
    const result = await verifyDocumentVersion(
      id,
      { staffId: reviewer, canMutate: canCurrentUserMutate },
      { getMode: defaultIntegrationMode, providerKey: 'companies_house' }
    );
    setNote(
      result.ok
        ? `Automated verification -> ${result.value.status} via ${result.value.providerId} (${result.value.providerMode})${
            result.value.failureReason ? `: ${result.value.failureReason}` : ''
          }`
        : result.error
    );
    await qc.invalidateQueries({ queryKey: ['compliance-documents'] });
    setFullRecordId(null);
  }

  async function manualVerdict(id: string, decision: 'approve' | 'reject') {
    const result = await recordManualDocumentVerification(
      id,
      { staffId: reviewer, canMutate: canCurrentUserMutate },
      decision,
      decision === 'approve'
        ? 'Document reviewed and accepted by the Founder / Super Admin.'
        : 'Document rejected by the Founder / Super Admin — a replacement is required.'
    );
    setNote(
      result.ok
        ? `Manual verification -> ${result.value.status} recorded by ${result.value.verifierIdentity}${
            result.value.failureReason ? `: ${result.value.failureReason}` : ''
          }`
        : result.error
    );
    await qc.invalidateQueries({ queryKey: ['compliance-documents'] });
    setFullRecordId(null);
  }

  const errObj = docsQuery.error || brandsQuery.error || productsQuery.error;
  const error =
    errObj instanceof Error ? errObj.message : errObj ? 'Failed to load compliance documents.' : null;

  return (
    <AdminComplianceView
      loading={docsQuery.isPending || brandsQuery.isPending || productsQuery.isPending}
      error={error}
      onRetry={() => {
        void docsQuery.refetch();
        void brandsQuery.refetch();
        void productsQuery.refetch();
      }}
      canMutate={canCurrentUserMutate}
      note={note}
      metrics={metrics}
      reviewFilter={reviewFilter}
      onReviewFilterChange={setReviewFilter}
      groups={groups}
      drawerDoc={drawerDoc}
      drawerProductsCount={drawerProductsCount}
      onSelectDrawerDoc={setDrawerId}
      fullRecordDoc={fullRecordDoc}
      fullRecordBundle={fullRecordBundle}
      onSelectFullRecordDoc={setFullRecordId}
      onManualVerdict={manualVerdict}
      onRunAutomated={runAutomated}
      onUploadOnBehalf={(brandId, type: ComplianceDocument['type']) => {
        if (!canCurrentUserMutate) return;
        uploadComplianceDoc(brandId, type, reviewer);
        void qc.invalidateQueries({ queryKey: ['compliance-documents'] });
        setNote(`Uploaded replacement ${type.replace(/_/g, ' ')} on behalf of brand.`);
      }}
    />
  );
}
