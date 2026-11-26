import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useApp } from '@/context/GlobalStateContext';
import {
  useBrandAgreements,
  useBrands,
  useComplianceDocuments,
  useContracts,
  useProducts,
  usePurchaseOrders,
} from '@/data/queries';
import { uploadComplianceDoc } from '@/data/api';
import { confirmCustomsDocument, isCustomsDocumentConfirmed } from '@/data/demoStore';
import { generateCustomsDocBundle, type CustomsDocumentBundle } from '@/lib/customsDocs';
import {
  CATEGORY_DOC_LABELS,
  evaluateComplianceGate,
  getRequiredDocumentsForCategory,
  latestDocumentsByType,
  REQUIRED_DOCUMENT_TYPES,
} from '@/lib/compliance';
import { documentVerificationStanding, replaceComplianceDocument } from '@/lib/verification/documentVerification';
import { defaultIntegrationMode } from '@/integrations/registry';
import type { ApprovedCategory } from '@/types';
import { BrandComplianceView, type ComplianceRequirementRow } from './BrandComplianceView';

export function BrandComplianceScreen() {
  const { session, brandProfile, reviewGateDocument } = useApp();
  const qc = useQueryClient();
  const brandsQ = useBrands();
  const productsQ = useProducts();
  const posQ = usePurchaseOrders();
  const docsQ = useComplianceDocuments();
  const contractsQ = useContracts();
  const agreementsQ = useBrandAgreements();

  const tenantId = session?.tier === 'brand' ? session.tenantId ?? null : null;
  const category = brandProfile?.category as ApprovedCategory | undefined;

  const [uploadedNotice, setUploadedNotice] = useState<string | null>(null);
  const [replacementError, setReplacementError] = useState<string | null>(null);
  const [busyType, setBusyType] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ poId: string; doc: CustomsDocumentBundle } | null>(
    null
  );
  const [confirmTick, setConfirmTick] = useState(0);

  const allDocs = useMemo(() => docsQ.data?.data ?? [], [docsQ.data]);
  const brandDocs = useMemo(
    () => (tenantId ? allDocs.filter((d) => d.brandId === tenantId) : []),
    [allDocs, tenantId]
  );
  const allContracts = contractsQ.data?.data ?? [];
  const allAgreements = agreementsQ.data?.data ?? [];
  const hasSignedAgreement = allContracts.some(
    (c) => c.brandId === tenantId && (c.status === 'signed' || c.status === 'active')
  );
  const logisticsSlaAccepted = tenantId
    ? allAgreements.some((a) => a.brandId === tenantId && a.agreementType === 'logistics_sla')
    : false;
  const chargebackIndemnityAccepted = tenantId
    ? allAgreements.some(
        (a) => a.brandId === tenantId && a.agreementType === 'chargeback_indemnity'
      )
    : false;

  const requiredTypes = category ? getRequiredDocumentsForCategory(category) : REQUIRED_DOCUMENT_TYPES;
  const gate = evaluateComplianceGate(
    brandDocs,
    category,
    hasSignedAgreement,
    logisticsSlaAccepted,
    chargebackIndemnityAccepted
  );
  const standing = tenantId ? documentVerificationStanding(tenantId, category, brandDocs, gate) : null;
  const latestDocs = latestDocumentsByType(brandDocs);

  const requirements = useMemo<ComplianceRequirementRow[]>(() => {
    return requiredTypes.map((type) => {
      const doc = latestDocs.get(type);
      const status = doc ? doc.status : 'missing';
      const row = standing?.rows.find((r) => r.type === type);
      const v = row?.verification ?? null;
      let expiryLabel: string | null = null;
      if (doc?.expiryDate) {
        const days = Math.ceil((new Date(doc.expiryDate).getTime() - Date.now()) / 864e5);
        expiryLabel = doc.status === 'expired' || days < 0 ? 'Expired' : `${days}d remaining`;
      }
      return {
        type,
        label: CATEGORY_DOC_LABELS[type] ?? type.replace(/_/g, ' '),
        doc,
        status,
        scope: row?.scope,
        blockingReason: row?.blockingReason ?? undefined,
        verificationSummary: v
          ? `${v.simulated ? 'Simulated' : v.external ? 'External' : 'Automated'} — ${v.result} (${v.providerId})`
          : undefined,
        expiryLabel,
        needsReplacement: Boolean(row?.needsReplacement),
      };
    });
  }, [requiredTypes, latestDocs, standing]);

  const brandsList = useMemo(() => brandsQ.data?.data ?? [], [brandsQ.data]);
  const productsList = useMemo(() => productsQ.data?.data ?? [], [productsQ.data]);
  const posList = useMemo(() => {
    const raw = posQ.data?.data ?? [];
    const scoped = tenantId ? raw.filter((p) => p.brandId === tenantId) : raw;
    return scoped.filter((po) =>
      ['accepted', 'ready_to_fulfil', 'shipped', 'delivered'].includes(po.status)
    );
  }, [posQ.data, tenantId]);

  const customsGroups = useMemo(() => {
    void confirmTick;
    return posList.map((po) => {
      const brand = brandsList.find((b) => b.id === po.brandId);
      const products = productsList.filter((p) => p.brandId === po.brandId);
      return {
        po,
        brandName: brand?.profile.businessName ?? po.brandId,
        docs: generateCustomsDocBundle({
          po,
          brandName: brand?.profile.businessName ?? '',
          products,
        }),
      };
    });
  }, [posList, brandsList, productsList, confirmTick]);

  function handleUploadDoc(type: string) {
    if (!tenantId) return;
    setBusyType(type);
    setReplacementError(null);
    const simulated = defaultIntegrationMode('companies_house') === 'simulation';
    const { docId } = uploadComplianceDoc(
      tenantId,
      type,
      'brand',
      simulated
        ? {
            fileUrl: `simulated://compliance/${tenantId}/${type}`,
            reference: `SIM-${type.toUpperCase()}-${tenantId.replace(/^brand-/, '').toUpperCase()}`,
            issuer: 'Simulated issuing body (no external provider)',
          }
        : undefined
    );
    reviewGateDocument(docId, 'under_review');
    void qc.invalidateQueries({ queryKey: ['compliance-documents'] });
    setUploadedNotice(`Uploaded ${type.replace(/_/g, ' ')} — submitted for compliance review.`);
    setBusyType(null);
  }

  function handleReplaceDoc(type: string) {
    if (!tenantId) return;
    const doc = latestDocs.get(type);
    if (!doc) return;
    const result = replaceComplianceDocument({
      documentId: doc.id,
      actor: { staffId: 'brand', canMutate: true, tenantId },
      reason: 'Brand supplied replacement after previous version failed verification.',
      fileUrl: `simulated://compliance/${tenantId}/${type}`,
      reference: `SIM-${type.toUpperCase()}-${tenantId.replace(/^brand-/, '').toUpperCase()}-R`,
      issuer: 'Simulated issuing body (no external provider)',
    });
    if (!result.ok) {
      setReplacementError(result.error);
      return;
    }
    setReplacementError(null);
    void qc.invalidateQueries({ queryKey: ['compliance-documents'] });
    setUploadedNotice(`Replaced ${type.replace(/_/g, ' ')} — marked for fresh review.`);
  }

  return (
    <BrandComplianceView
      hasTenant={Boolean(tenantId)}
      loading={docsQ.isPending || posQ.isPending}
      gateCleared={gate.cleared}
      remainingBlockers={gate.missing.length + gate.blocking.length}
      requirements={requirements}
      requiredLabelsSummary={requiredTypes
        .map((t) => CATEGORY_DOC_LABELS[t] ?? t.replace(/_/g, ' '))
        .join(', ')}
      uploadedNotice={uploadedNotice}
      replacementError={replacementError}
      busyType={busyType}
      onUploadDoc={handleUploadDoc}
      onReplaceDoc={handleReplaceDoc}
      customsGroups={customsGroups}
      isCustomsConfirmed={(poId, docType) => isCustomsDocumentConfirmed(`${poId}:${docType}`)}
      previewDoc={previewDoc}
      onOpenPreview={(poId, doc) => setPreviewDoc({ poId, doc })}
      onClosePreview={() => setPreviewDoc(null)}
      onConfirmPreview={() => {
        if (!previewDoc) return;
        confirmCustomsDocument(
          `${previewDoc.poId}:${previewDoc.doc.type}`,
          tenantId ?? '',
          tenantId ?? 'brand',
          `Brand confirmed auto-generated ${previewDoc.doc.title} for ${previewDoc.poId}`
        );
        setConfirmTick((t) => t + 1);
        setPreviewDoc(null);
      }}
    />
  );
}
export default BrandComplianceScreen;
