import { useMemo, useState } from 'react';
import { useRecordDeepLink, useFocusRecordElement } from '@/lib/runtime/recordDeepLink';
import { useQueryClient } from '@tanstack/react-query';
import { useApp } from '@/context/GlobalStateContext';
import { Badge, Button, Card, LoadingState, StatusBadge } from '@/components/ui';
import { WorkspaceFrame, WorkspaceHeader } from '@/components/shared/workspace';
import { cn } from '@/utils/cn';
import { complianceDocStatusPresentation } from '@/lib/statusPresentation';
import {
  Eye,
  FileCheck2,
  ShieldCheck,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { MERCENTA_EORI, MERCENTA_VAT } from '@/config/customs';
import { generateCustomsDocBundle, type CustomsDocumentBundle } from '@/lib/customsDocs';
import { useBrands, useProducts, usePurchaseOrders, useComplianceDocuments, useContracts, useBrandAgreements } from '@/data/queries';
import { uploadComplianceDoc } from '@/data/api';
import { confirmCustomsDocument, isCustomsDocumentConfirmed } from '@/data/demoStore';
import { evaluateComplianceGate, getRequiredDocumentsForCategory, CATEGORY_DOC_LABELS, REQUIRED_DOCUMENT_TYPES, latestDocumentsByType } from '@/lib/compliance';
import {
  documentVerificationStanding,
  replaceComplianceDocument,
} from '@/lib/verification/documentVerification';
import { defaultIntegrationMode } from '@/integrations/registry';
import type { ApprovedCategory } from '@/types';

/**
 * §Stage-3 rewritten compliance hub.
 *
 * - UK EORI / UK VAT are NOT brand requirements: Mercenta is Importer of Record
 *   and its own numbers are auto-populated into every document.
 * - EU market section removed (UK-only); it exists as a feature-flagged
 *   disabled module under Super Admin → Settings (EU_MARKET_ENABLED=false).
 * - Customs documentation is AUTO-GENERATED from PO + product data; the
 *   brand reviews and confirms instead of recreating documents.
 */

export function ComplianceHub() {
  const brandsQuery = useBrands();
  const productsQuery = useProducts();
  const posQuery = usePurchaseOrders();
  // Stable identities so the doc-bundle useMemo deps are meaningful.
  const brandsList = useMemo(() => brandsQuery.data?.data ?? [], [brandsQuery.data]);
  const productsList = useMemo(() => productsQuery.data?.data ?? [], [productsQuery.data]);
  const posListRaw = useMemo(() => posQuery.data?.data ?? [], [posQuery.data]);
  // §Stage-20.3 SECURITY FIX — scope to THIS brand's POs only. Previously the
  // customs-bundle generator processed every brand's purchase orders.
  const { session, brandProfile } = useApp();
  const tenantId = session?.tier === 'brand' ? (session.tenantId ?? null) : null;
  const posList = useMemo(
    () => (tenantId ? posListRaw.filter((p) => p.brandId === tenantId) : posListRaw),
    [posListRaw, tenantId]
  );
  /** Accepted-or-later POs get their customs bundle generated automatically. */
  const billablePOs = useMemo(
    () =>
      posList.filter((po) =>
        ['accepted', 'ready_to_fulfil', 'shipped', 'delivered'].includes(po.status)
      ),
    [posList]
  );

  const [previewDoc, setPreviewDoc] = useState<CustomsDocumentBundle | null>(null);
  /**
   * §P3 — a confirmation is recorded in the canonical store; this counter is
   * bumped when it happens so the tiles re-render and reflect the confirmed
   * state. (Referenced in the tile key below, which is what makes the re-render
   * real — the store read itself happens during render via `isConfirmed`.)
   */
  const [confirmTick, setConfirmTick] = useState(0);
  const [previewPoId, setPreviewPoId] = useState<string | null>(null);
  const isConfirmed = (poId: string, docType: string) => isCustomsDocumentConfirmed(`${poId}:${docType}`);
  /**
   * §P3 — the ONE writer behind "Review & Confirm": it records the brand's
   * confirmation of the previewed document on the canonical audit log and closes
   * the modal. Before P3 the control only closed the modal — it promised a
   * confirmation that never happened.
   */
  const confirmPreviewDoc = () => {
    if (!previewDoc || !previewPoId) return;
    confirmCustomsDocument(
      `${previewPoId}:${previewDoc.type}`,
      tenantId ?? '',
      tenantId ?? 'brand',
      `Brand confirmed the auto-generated ${previewDoc.title} for ${previewPoId}`
    );
    setConfirmTick((t) => t + 1);
    setPreviewDoc(null);
    setPreviewPoId(null);
  };

  const docBundles = useMemo(
    () =>
      billablePOs.map((po) => {
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
      }),
    [billablePOs, brandsList, productsList]
  );

  return (
    <WorkspaceFrame className="space-y-4">
      <WorkspaceHeader
        eyebrow="BRAND PORTAL · COMPLIANCE"
        title="Compliance & Customs"
        description="UK market compliance — customs documents are auto-generated and pre-filled for your review. Mercenta is the Importer of Record; statutory documents remain your responsibility."
      />

      {/* Importer of Record — handled by Mercenta, never the brand */}
      <Card title="Importer of Record — handled by Mercenta">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 px-1 pb-1">
          <div className="bg-state-success/10 border border-state-success/20 rounded-ds-md p-3">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-state-success" />
              <span className="text-xs font-medium text-strong">UK EORI Number</span>
            </div>
            <p className="text-ds-label text-muted">
              Held by Mercenta as Importer of Record — <span className="font-mono">{MERCENTA_EORI}</span>.
              You never need to register.
            </p>
          </div>
          <div className="bg-state-success/10 border border-state-success/20 rounded-ds-md p-3">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-state-success" />
              <span className="text-xs font-medium text-strong">UK VAT Registration</span>
            </div>
            <p className="text-ds-label text-muted">
              Mercenta's VAT number is used on all imports —{' '}
              <span className="font-mono">{MERCENTA_VAT}</span>. Auto-applied to every document.
            </p>
          </div>
        </div>
      </Card>

      {/* Compliance documents + gate state — §Phase 7F: mounted so the brand's
          document approval state is user-visible on this page (was previously
          dead UI). Its gate uses the same canonical business rule as the
          Product Catalog. */}
      <ComplianceUploadCard
        brandId={tenantId}
        brandName={brandProfile?.businessName ?? ''}
        category={brandProfile?.category as ApprovedCategory | undefined}
      />

      {/* Auto-generated customs documentation */}
      <Card title="Customs Documentation — auto-generated, pre-filled">
        <p className="text-ds-label text-muted px-1 pb-3">
          Generated from your purchase-order data and product master. Review each
          pre-filled document and confirm — no manual form-filling required.
        </p>
        {/* §Wave 3 Part 5 — and it must not claim the brand has no accepted
            orders while those orders are still resolving. */}
        {posQuery.isPending && (
          <LoadingState rows={3} label="Loading documentation for your accepted orders…" />
        )}
        {!posQuery.isPending && docBundles.length === 0 && (
          <p className="text-xs text-faint px-1 py-2">
            No accepted purchase orders yet — documents are generated automatically
            once a PO is accepted.
          </p>
        )}
        <div className="space-y-4">
          {!posQuery.isPending && docBundles.map(({ po, brandName, docs }) => (
            <div key={po.id} className="bg-tint border border-hairline rounded-ds-md p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="font-mono text-xs text-accent">{po.poNumber}</span>
                  <span className="text-ds-label text-muted ml-2">{brandName}</span>
                </div>
                <Badge className="text-ds-micro bg-state-success/10 text-state-success border-state-success/20 capitalize">
                  {po.status.replace(/_/g, ' ')}
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {docs.map((doc) => {
                  const confirmed = isConfirmed(po.id, doc.type);
                  return (
                    <button
                      key={doc.type + confirmTick}
                      onClick={() => { setPreviewDoc(doc); setPreviewPoId(po.id); }}
                      className={cn(
                        'text-left bg-surface border rounded-ds-md p-3 transition-colors group',
                        confirmed ? 'border-emerald-500/30' : 'border-hairline hover:border-accent/40'
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <FileCheck2 className="w-4 h-4 text-accent mb-1.5" />
                        {confirmed && (
                          <Badge className="text-ds-micro bg-state-success/10 text-state-success border-state-success/20">
                            Confirmed
                          </Badge>
                        )}
                      </div>
                      <div className="text-ds-label font-medium text-strong">{doc.title}</div>
                      <ul className="mt-1 space-y-0.5">
                        {doc.preFilled.slice(0, 2).map((f) => (
                          <li key={f.label} className="font-mono text-ds-micro text-faint truncate">
                            {f.label}: {f.value}
                          </li>
                        ))}
                      </ul>
                      <span className="inline-flex items-center gap-1 text-ds-micro text-accent mt-2 opacity-70 group-hover:opacity-100">
                        <Eye className="w-3 h-3" /> {confirmed ? 'Review' : <>Review &amp; confirm</>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Document preview modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-[60] bg-surface-hover backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-3xl bg-tint max-h-[85vh] overflow-auto p-0">
            <iframe
              title={previewDoc.title}
              srcDoc={previewDoc.html}
              className="w-full h-[60vh]"
            />
            <div className="p-4 flex items-center justify-between bg-surface-raised">
              <span className="text-xs text-muted">
                {previewDoc.title} — pre-filled from PO data. Confirming records your confirmation of these values.
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => { setPreviewDoc(null); setPreviewPoId(null); }}>Close</Button>
                {previewPoId && isConfirmed(previewPoId, previewDoc.type) ? (
                  <Button disabled>Confirmed</Button>
                ) : (
                  <Button onClick={confirmPreviewDoc}>Review &amp; Confirm</Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </WorkspaceFrame>
  );
}


/** Compliance document upload card with expiry tracking + gate state. */
function ComplianceUploadCard({
  brandId,
  brandName,
  category,
}: {
  brandId: string | null;
  brandName: string;
  category?: ApprovedCategory;
}) {
  const docsQuery = useComplianceDocuments();
  const contractsQuery = useContracts();
  const agreementsQuery = useBrandAgreements();
  const allDocs = useMemo(() => docsQuery.data?.data ?? [], [docsQuery.data]);
  const allContracts = contractsQuery.data?.data ?? [];
  const allAgreements = agreementsQuery.data?.data ?? [];
  const brandDocs = brandId ? allDocs.filter(function(d) { return d.brandId === brandId; }) : [];
  const hasSignedAgreement = allContracts.some(function(c) { return c.brandId === brandId && (c.status === 'signed' || c.status === 'active'); });
  const logisticsSlaAccepted = brandId
    ? allAgreements.some(function(a) { return a.brandId === brandId && a.agreementType === 'logistics_sla'; })
    : false;
  const chargebackIndemnityAccepted = brandId
    ? allAgreements.some(function(a) { return a.brandId === brandId && a.agreementType === 'chargeback_indemnity'; })
    : false;
  // §7B repair — agreement boolean MUST occupy the `hasSignedAgreement`
  // parameter, not `category` (an array `docs` in slot 2 type-checks because
  // both are positional; the previous shift fed the boolean into `category`).
  // §Phase 7F — category-aware required list + full agreement inputs so this
  // card's gate agrees EXACTLY with the Product Catalog gate (categories with an
  // extra document previously fell through to the base-only computation).
  const requiredTypes = category ? getRequiredDocumentsForCategory(category) : REQUIRED_DOCUMENT_TYPES;
  const gate = evaluateComplianceGate(brandDocs, category, hasSignedAgreement, logisticsSlaAccepted, chargebackIndemnityAccepted);
  // §M2 — the verification standing: required / submitted / under review /
  // passed / failed / needs replacement, with the reason each is blocking.
  // Computed from the SAME records the gate above used.
  const standing = brandId
    ? documentVerificationStanding(brandId, category, brandDocs, gate)
    : null;
  const latestDocs = latestDocumentsByType(brandDocs);

  /**
   * §BATCH 7 (Part 4.1a) — DEEP LINK. `/brand/compliance?doc=<id>` marks and
   * scrolls to THAT document's requirement row, so a "compliance doc awaiting
   * review" notice lands on the document it names rather than on the hub. (Before
   * this change the notice did NOTHING when clicked.) The document is resolved to
   * the canonical requirement TYPE — the row this surface renders — and a document
   * with no row here is a no-op, never an invented record.
   */
  const deepLinkDoc = useRecordDeepLink('compliance');
  const deepLinkDocType = useMemo(() => {
    if (!deepLinkDoc) return null;
    const doc = allDocs.find(function(d) { return d.id === deepLinkDoc; });
    return doc ? doc.type : null;
  }, [deepLinkDoc, allDocs]);
  useFocusRecordElement(deepLinkDocType ? `[data-record-id="${deepLinkDocType}"]` : null);
  const [uploaded, setUploaded] = useState<string | null>(null);
  const [replacementNote, setReplacementNote] = useState<string | null>(null);
  const qc = useQueryClient();
  const { reviewGateDocument } = useApp();

  function handleUpload(type: string) {
    if (!brandId) return;
    // §Phase A — the write is canonical (demoStore + optional Supabase row). The
    // returned doc id also exists in the in-session gate list, so the Product
    // Catalog gate is moved to the SAME state this card reports.
    //
    // §M2 — evidence is attached ONLY when the resolved provider mode is
    // positively `simulation`; in every other mode nothing is claimed about the
    // artefact, so an automated verification cannot pass a document that does
    // not exist.
    const simulated = defaultIntegrationMode('companies_house') === 'simulation';
    const { docId } = uploadComplianceDoc(
      brandId,
      type,
      'brand',
      simulated
        ? {
            fileUrl: `simulated://compliance/${brandId}/${type}`,
            reference: `SIM-${type.toUpperCase()}-${brandId.replace(/^brand-/, '').toUpperCase()}`,
            issuer: 'Simulated issuing body (no external provider)',
          }
        : undefined
    );
    reviewGateDocument(docId, 'under_review');
    // §Phase A — re-read the canonical docs so this card's own status badge
    // reflects the write immediately. Previously the row stayed on its old
    // status until a reload (the removed `docVersion` state was never read).
    void qc.invalidateQueries({ queryKey: ['compliance-documents'] });
    setUploaded(type);
    setTimeout(function() { setUploaded(null); }, 3000);
  }

  /**
   * §M2 — replace a rejected/expired document with a new version. The previous
   * version is superseded (kept for audit) and the requirement stays BLOCKED
   * until the replacement itself passes verification.
   */
  function handleReplace(type: string) {
    if (!brandId) return;
    const doc = latestDocs.get(type);
    if (!doc) return;
    const result = replaceComplianceDocument({
      documentId: doc.id,
      actor: { staffId: 'brand', canMutate: true, tenantId: brandId },
      reason: 'Brand supplied a replacement after the previous version failed verification.',
      fileUrl: `simulated://compliance/${brandId}/${type}`,
      reference: `SIM-${type.toUpperCase()}-${brandId.replace(/^brand-/, '').toUpperCase()}-R`,
      issuer: 'Simulated issuing body (no external provider)',
    });
    if (!result.ok) {
      setReplacementNote(result.error);
      return;
    }
    setReplacementNote(null);
    void qc.invalidateQueries({ queryKey: ['compliance-documents'] });
    setUploaded(type);
    setTimeout(function() { setUploaded(null); }, 3000);
  }

  function expiryStatus(doc: { status: string; expiryDate?: string }) {
    if (!doc.expiryDate) return null;
    const days = Math.ceil((new Date(doc.expiryDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    if (doc.status === 'expired' || days < 0) return { label: 'Expired', color: 'bg-state-danger/10 text-state-danger' };
    if (days <= 30) return { label: 'Expires in ' + days + 'd', color: 'bg-state-warning/10 text-state-warning' };
    if (days <= 60) return { label: 'Expires in ' + days + 'd', color: 'bg-state-info/10 text-state-info' };
    return null;
  }

  if (!brandId) {
    return (
      <Card title="Compliance Documents" subtitle="Upload required compliance documents">
        <p className="text-xs text-faint px-1 py-4">Sign in to manage compliance documents.</p>
      </Card>
    );
  }

  return (
    <Card title="Compliance Documents" subtitle="Upload required documents to clear the compliance gate">
      <div className="space-y-3 p-1">
        <div className={cn('rounded-ds-md p-3 text-xs flex items-center gap-2', gate.cleared ? 'bg-state-success/10 text-state-success border border-state-success/20' : 'bg-state-warning/10 text-state-warning border border-state-warning/20')}>
          {gate.cleared ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
          {gate.cleared ? 'Compliance gate cleared - all required documents approved.' : 'Compliance gate not yet cleared - ' + (gate.missing.length + gate.blocking.length) + ' item(s) remain.'}
        </div>
        <div className="divide-y divide-hairline-06">
          {requiredTypes.map(function(type) {
            // §M2 — read the LATEST version of the requirement.
            const doc = latestDocs.get(type);
            const status = doc ? doc.status : 'missing';
            const isUploading = uploaded === type;
            const expiry = doc ? expiryStatus(doc) : null;
            const row = standing?.rows.find(function(r) { return r.type === type; });
            const verification = row && row.verification ? row.verification : null;
            return (
              <div key={type} data-record-id={type} className="flex items-center justify-between py-2.5 gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-strong capitalize truncate">{type.replace(/_/g, ' ')}</span>
                    {row && row.scope === 'conditional' && (
                      <Badge className="text-ds-micro bg-tint text-muted border-hairline">conditional</Badge>
                    )}
                    {expiry && (
                      <Badge className={cn('text-ds-micro', expiry.color)}>
                        <Clock className="w-2.5 h-2.5 mr-0.5" />{expiry.label}
                      </Badge>
                    )}
                  </div>
                  {row && row.blockingReason && (
                    <p className="text-ds-micro text-muted mt-0.5 truncate">{row.blockingReason}</p>
                  )}
                  {verification && (
                    <p className="text-ds-micro text-faint mt-0.5 truncate">
                      {`${verification.simulated ? 'Simulated verification' : verification.external ? 'External verification' : 'Automated verification'} — ${verification.result} (${verification.providerId}${verification.simulated ? ', simulated' : ''})`}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge
                    className="text-ds-micro"
                    dataStatus={complianceDocStatusPresentation(status).dataStatus}
                    tone={complianceDocStatusPresentation(status).tone}
                  >
                    {complianceDocStatusPresentation(status).label}
                  </StatusBadge>
                  {row && row.needsReplacement && (
                    <Button variant="ghost" className="text-ds-micro" onClick={function() { handleReplace(type); }}>
                      Replace
                    </Button>
                  )}
                  {status !== 'approved' && (
                    <Button className="text-ds-micro" onClick={function() { handleUpload(type); }} disabled={isUploading}>
                      {isUploading ? 'Uploading...' : <><Upload className="w-3 h-3 mr-1" />Upload</>}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {uploaded && <p className="text-ds-micro text-state-success">Document uploaded and marked for review.</p>}
        {replacementNote && <p className="text-ds-micro text-state-danger">{replacementNote}</p>}
        <p className="text-ds-micro text-faint">Required: {requiredTypes.map((t) => CATEGORY_DOC_LABELS[t] ?? t.replace(/_/g, ' ')).join(', ')}. A signed distribution agreement is also required.</p>
      </div>
    </Card>
  );
}
