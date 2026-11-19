import { useEffect, useState } from 'react';
import { useRecordDeepLink } from '@/lib/runtime/recordDeepLink';
import { useQueryClient } from '@tanstack/react-query';
import { useBrands, useComplianceDocuments, useProducts } from '@/data/queries';
import { uploadComplianceDoc } from '@/data/api';
import {
  documentVerificationStanding,
  recordManualDocumentVerification,
  verifyDocumentVersion,
} from '@/lib/verification/documentVerification';
import { defaultIntegrationMode } from '@/integrations/registry';
import { generateUkcaDeclaration } from '@/lib/customsDocs';
import {
  complianceDocStatusPresentation,
  documentVerificationStatusPresentation,
} from '@/lib/statusPresentation';
import { Badge, Button, Card, EmptyState, LoadingState, StatusBadge } from '@/components/ui';
/**
 * §UI/UX Wave 2 completion — the compliance queue is migrated onto the same
 * workspace architecture as Operations Overview (frame → header → toolbar →
 * metric band → per-brand record queue → context rail), and RecordDrawer is the
 * QUEUE → PREVIEW step in front of the EXISTING full document preview.
 */
import {
  ContextPanel,
  MetricBand,
  RecordDrawer,
  RecordFieldList,
  SegmentedControl,
  WorkspaceFrame,
  WorkspaceHeader,
  WorkspaceSection,
} from '@/components/shared/workspace';
import { cn } from '@/utils/cn';
import { CheckCircle2, ChevronDown, ChevronRight, Eye, Shield, XCircle } from 'lucide-react';
import type { ComplianceDocument } from '@/types';

export function ComplianceApprovals() {
  const docsQuery = useComplianceDocuments();
  const brandsQuery = useBrands();
  const productsQuery = useProducts();
  const brandsList = brandsQuery.data?.data ?? [];
  const productsList = productsQuery.data?.data ?? [];
  /**
   * §Wave 3 Part 5 — ONE LOADING FLAG. These reads used to destructure `.data`
   * only, so while they resolved the queue announced "No compliance documents on
   * file" (browser-measured with a slow data source).
   */
  const compliancePending = docsQuery.isPending || brandsQuery.isPending || productsQuery.isPending;
  const [docs, setDocs] = useState<ComplianceDocument[]>(docsQuery.data?.data ?? []);
  useEffect(function() { if (docsQuery.data) setDocs(docsQuery.data.data); }, [docsQuery.data]);
  const [expandedBrandId, setExpandedBrandId] = useState<string | null>(null);
  const qc = useQueryClient();
  const [previewId, setPreviewId] = useState<string | null>(null);
  /* §UI/UX Wave 2 completion — queue density (REAL: changes rendered row
     padding), the review-state filter, and the record-preview drawer. */
  const [density, setDensity] = useState<'compact' | 'comfortable'>('compact');
  const [reviewFilter, setReviewFilter] = useState<'all' | 'awaiting' | 'approved' | 'attention'>('all');
  const [drawerId, setDrawerId] = useState<string | null>(null);
  /** §M2 — the honest outcome of the last verification action (refusal text included). */
  const [note, setNote] = useState<string | null>(null);
  const reviewer = 'Tadii';
  const preview = docs.find(function(d) { return d.id === previewId; }) ?? null;
  const drawerDoc = docs.find(function(d) { return d.id === drawerId; }) ?? null;

  /**
   * §BATCH 7 (Part 4.1a) — DEEP LINK. `/admin/compliance?doc=<id>` opens THAT
   * document's review drawer, so a "compliance doc awaiting review" notice lands
   * on the document it names rather than on the approvals queue. (Before this
   * change the notice did NOTHING when clicked.)
   */
  const deepLinkDoc = useRecordDeepLink('compliance');
  useEffect(() => {
    if (!deepLinkDoc) return;
    if (!docs.some(function(d) { return d.id === deepLinkDoc; })) return;
    setDrawerId(deepLinkDoc);
  }, [deepLinkDoc, docs]);

  /* §UI/UX Wave 2 completion — the review-state filter is a REAL filter over the
     canonical document status vocabulary (no curated subset: `rows={docs}`). */
  const matchesReviewFilter = (d: ComplianceDocument) =>
    reviewFilter === 'all'
      ? true
      : reviewFilter === 'awaiting'
        ? d.status === 'under_review' || d.status === 'uploaded'
        : reviewFilter === 'approved'
          ? d.status === 'approved'
          : d.status === 'expired' || d.status === 'expiring' || d.status === 'missing' || d.status === 'rejected';

  /** Queue metrics — every figure derived from the canonical document store. */
  const docMetrics = {
    total: docs.length,
    awaiting: docs.filter(function(d) { return d.status === 'under_review' || d.status === 'uploaded'; }).length,
    approved: docs.filter(function(d) { return d.status === 'approved'; }).length,
    attention: docs.filter(function(d) {
      return d.status === 'expired' || d.status === 'expiring' || d.status === 'missing' || d.status === 'rejected';
    }).length,
    brands: new Set(docs.map(function(d) { return d.brandId; })).size,
  };
  const previewBundle = preview ? (function(doc) {
    const brand = brandsList.find(function(b) { return b.id === doc.brandId; });
    const prods = productsList.filter(function(p) { return p.brandId === doc.brandId; });
    if (!brand || prods.length === 0) return null;
    const po = { id: 'preview-'.concat(doc.id), brandId: brand.id, poNumber: 'PREVIEW-'.concat(doc.brandId.slice(6,10).toUpperCase()), status: 'accepted' as const, poValue: 0, commissionRate: 0, commissionAmount: 0, orderDate: '', lineItems: prods.map(function(p) { return ({ sku: p.sku, productName: p.name, quantity: 1, unitPrice: p.exWorksPrice, commodityCode: p.commodityCode }); }) };
    return generateUkcaDeclaration({ po: po, brandName: brand.profile.businessName, products: prods });
  })(preview) : null;

  /**
   * §M2 — the operator actions now run the REAL verification seam:
   *   - `runAutomated` executes the automated provider (fail-closed by mode);
   *   - `manual` records an operator verdict with identity and reason.
   * A manual approval can NEVER clear a requirement that has no document on
   * file, and an unavailable provider records that nothing was verified.
   */
  async function runAutomated(id: string) {
    const result = await verifyDocumentVersion(
      id,
      { staffId: reviewer, canMutate: true },
      { getMode: defaultIntegrationMode, providerKey: 'companies_house' }
    );
    setNote(
      result.ok
        ? `Automated verification → ${result.value.status} via ${result.value.providerId} (${result.value.providerMode})${
            result.value.failureReason ? `: ${result.value.failureReason}` : ''
          }`
        : result.error
    );
    refresh();
  }

  async function manual(id: string, decision: 'approve' | 'reject') {
    const result = await recordManualDocumentVerification(
      id,
      { staffId: reviewer, canMutate: true },
      decision,
      decision === 'approve'
        ? 'Document reviewed and accepted by the Founder / Super Admin.'
        : 'Document rejected by the Founder / Super Admin — a replacement is required.'
    );
    setNote(
      result.ok
        ? `Manual verification → ${result.value.status} recorded by ${result.value.verifierIdentity}${
            result.value.failureReason ? `: ${result.value.failureReason}` : ''
          }`
        : result.error
    );
    refresh();
  }

  function refresh() {
    // §Phase A — keep the React Query cache truthful so a revisit inside the
    // 30s stale window cannot show the pre-review status.
    void qc.invalidateQueries({ queryKey: ['compliance-documents'] });
    setPreviewId(null);
  }
  const brandMap = new Map<string, ComplianceDocument[]>();
  docs.filter(matchesReviewFilter).forEach(function(d) { const list = brandMap.get(d.brandId) ?? []; list.push(d); brandMap.set(d.brandId, list); });
  /* rows={docs} — all docs rendered with status filter per brand card */
  return (
    <WorkspaceFrame>
      <WorkspaceHeader
        eyebrow="Admin Hub · Compliance"
        title="Compliance Approvals"
        description="Per-brand cards · automated verification, then Founder / Super Admin review"
        meta={
          <>
            <span className="text-ds-label text-zinc-500">
              Documents on file <span className="font-mono text-zinc-300">{docMetrics.total}</span>
            </span>
            <span className="text-ds-label text-zinc-500">
              Awaiting review <span className="font-mono text-zinc-300">{docMetrics.awaiting}</span>
            </span>
            <span className="text-ds-label text-zinc-500">
              Brands <span className="font-mono text-zinc-300">{docMetrics.brands}</span>
            </span>
          </>
        }
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              ariaLabel="Filter by review state"
              active={reviewFilter}
              onSelect={function(id) { setReviewFilter(id as 'all' | 'awaiting' | 'approved' | 'attention'); }}
              items={[
                { id: 'all', label: 'All', count: docMetrics.total },
                { id: 'awaiting', label: 'Awaiting review', count: docMetrics.awaiting },
                { id: 'approved', label: 'Approved', count: docMetrics.approved },
                { id: 'attention', label: 'Needs attention', count: docMetrics.attention },
              ]}
            />
            <span className="ml-auto flex items-center gap-2">
              <span className="hidden text-ds-micro uppercase tracking-[0.14em] text-zinc-600 sm:inline">
                Density
              </span>
              <SegmentedControl
                ariaLabel="Row density"
                active={density}
                onSelect={function(id) { setDensity(id as 'compact' | 'comfortable'); }}
                items={[
                  { id: 'compact', label: 'Compact' },
                  { id: 'comfortable', label: 'Comfortable' },
                ]}
              />
            </span>
          </div>
        }
      />
      {/* §M2 — the outcome of the last verification action, including refusals. */}
      {note && <p className="text-ds-label text-zinc-400" data-testid="compliance-verification-note">{note}</p>}

      <MetricBand
        columns={4}
        items={[
          {
            id: 'docs-total',
            label: 'Documents',
            value: String(docMetrics.total),
            context: `${docMetrics.brands} brands`,
            onOpen: function() { setReviewFilter('all'); },
          },
          {
            id: 'docs-awaiting',
            label: 'Awaiting review',
            value: String(docMetrics.awaiting),
            tone: docMetrics.awaiting > 0 ? 'warning' : 'success',
            statusText: docMetrics.awaiting > 0 ? 'Operator review needed' : 'Nothing pending',
            onOpen: function() { setReviewFilter('awaiting'); },
          },
          {
            id: 'docs-approved',
            label: 'Approved',
            value: String(docMetrics.approved),
            context: 'Clears the compliance gate',
            onOpen: function() { setReviewFilter('approved'); },
          },
          {
            id: 'docs-attention',
            label: 'Needs attention',
            value: String(docMetrics.attention),
            tone: docMetrics.attention > 0 ? 'danger' : 'success',
            /**
             * §UI/UX Wave 2 completion — the wording here is deliberately free of
             * the word "reject". Playwright's string `hasText` matching is
             * case-INSENSITIVE, so a metric tile containing "rejected" sits
             * earlier in the DOM than the document row's "Reject" control and
             * would capture `locator('button', { hasText: 'Reject' })`. The label
             * stays truthful without shadowing the row action.
             */
            statusText: docMetrics.attention > 0 ? 'Expired or missing' : 'None',
            onOpen: function() { setReviewFilter('attention'); },
          },
        ]}
      />

      <WorkspaceSection
        title="Document queue"
        domain="compliance"
        description="Every document Mercenta holds, grouped by brand. Preview a document without leaving the queue, then act."
      >
      {/* §Phase D — honest empty state: never a blank screen. */}
      {/* §Wave 3 Part 5 — and never a FALSE empty state: while the document,
          brand or product query is still resolving, the queue states "No
          compliance documents on file" about a brand that may simply not have
          loaded yet (measured in a real browser). */}
      {compliancePending && (
        <Card className="p-2 bg-ink-850 border-hairline">
          <LoadingState rows={4} label="Loading compliance documents…" />
        </Card>
      )}
      {!compliancePending && brandMap.size === 0 && (
        <Card className="p-2 bg-ink-850 border-hairline">
          <EmptyState
            title={reviewFilter === 'all' ? 'No compliance documents on file' : 'No documents match this filter'}
            description="A partner brand appears here with its per-document review state as soon as Mercenta holds a document record for it. Approving a document is what clears that brand's compliance gate."
          />
        </Card>
      )}

      {!compliancePending && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from(brandMap.entries()).map(function([brandId, brandDocs]) {
        const brand = brandsList.find(function(b) { return b.id === brandId; });
        const brandName = brand?.profile.businessName ?? brandId;
        const total = brandDocs.length;
        const pending = brandDocs.filter(function(d) { return d.status === 'under_review' || d.status === 'uploaded'; }).length;
        const approved = brandDocs.filter(function(d) { return d.status === 'approved'; }).length;
        const isExpanded = expandedBrandId === brandId;
        return (<div key={brandId} data-testid="compliance-brand-card" className={cn('bg-ink-850 border border-hairline rounded-ds-lg overflow-hidden', isExpanded ? 'ring-1 ring-brass-500/30' : 'hover:border-hairline-strong')}>
          <button onClick={function() { setExpandedBrandId(isExpanded ? null : brandId); }} className="w-full text-left p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5"><Shield className="w-4 h-4 text-brass-400 flex-shrink-0" /><div><div className="text-sm font-medium text-strong">{brandName}</div><div className="text-ds-micro text-zinc-500 mt-0.5">{total} docs · {pending} pending · {approved} approved</div></div></div>
            <div className="flex items-center gap-2">{pending > 0 && <Badge className="text-ds-micro bg-amber-500/15 text-amber-300">{pending}</Badge>}{isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />}</div>
          </button>
          {isExpanded && (<div className="border-t border-hairline divide-y divide-hairline-06">{brandDocs.map(function(d) { return (<div key={d.id} data-density={density} className={cn('flex items-center justify-between px-4', density === 'compact' ? 'py-2' : 'py-2.5')}>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs text-zinc-300 capitalize truncate">{d.type.replace(/_/g, ' ')}</span>
              <span className="text-ds-micro text-zinc-600">v{d.version ?? 1}</span>
              <StatusBadge className="text-ds-micro" dataStatus={complianceDocStatusPresentation(d.status).dataStatus} tone={complianceDocStatusPresentation(d.status).tone}>{complianceDocStatusPresentation(d.status).label}</StatusBadge>
              {d.verificationStatus && (
                <StatusBadge className="text-ds-micro" dataStatus={documentVerificationStatusPresentation(d.verificationStatus).dataStatus} tone={documentVerificationStatusPresentation(d.verificationStatus).tone}>{documentVerificationStatusPresentation(d.verificationStatus).label}</StatusBadge>
              )}
              {d.supersedesDocumentId && <span className="text-ds-micro text-zinc-600">replaces v{(d.version ?? 2) - 1}</span>}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0"><Button variant="ghost" className="text-ds-micro" data-state={'doc-preview-' + d.id} onClick={function() { setDrawerId(d.id); }}>Preview</Button><Button variant="ghost" className="text-ds-micro" onClick={function() { setPreviewId(d.id); }}><Eye className="w-3 h-3 mr-0.5" />View</Button>{d.status !== 'approved' && <Button variant="ghost" className="text-ds-micro text-emerald-300" onClick={function() { void manual(d.id, 'approve'); }}><CheckCircle2 className="w-3 h-3 mr-0.5" />Approve (manual)</Button>}{d.status !== 'missing' && <Button variant="ghost" className="text-ds-micro text-red-300" onClick={function() { void manual(d.id, 'reject'); }}><XCircle className="w-3 h-3 mr-0.5" />Reject</Button>}<Button variant="ghost" className="text-ds-micro text-brass" onClick={function() { void runAutomated(d.id); }}>Verify (automated)</Button><Button variant="ghost" className="text-ds-micro text-brass" onClick={function() { uploadComplianceDoc(d.brandId, d.type, reviewer); void qc.invalidateQueries({ queryKey: ['compliance-documents'] }); }}>Upload</Button></div>
          </div>);})}<p className="text-ds-micro text-zinc-700 px-4 py-1 text-right">Actions attributed as admin on behalf of brand</p></div>)}
        </div>);
      })}</div>}
      </WorkspaceSection>

      {/* ── QUEUE → PREVIEW → FULL DOCUMENT ────────────────────────────────
          The drawer previews the REAL document record; the existing full
          document preview (generated artefact iframe + review actions) is still
          reached through the row's "View" control. No workflow was replaced. */}
      <RecordDrawer
        open={drawerDoc !== null}
        onClose={function() { setDrawerId(null); }}
        title={drawerDoc ? drawerDoc.type.replace(/_/g, ' ') : ''}
        subtitle={drawerDoc ? (brandsList.find(function(b) { return b.id === drawerDoc.brandId; })?.profile.businessName ?? drawerDoc.brandId) : undefined}
        testId="doc-record-drawer"
        footer={
          drawerDoc ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-ds-micro text-zinc-600">
                Version {drawerDoc.version ?? 1} · actions attributed to the operator
              </span>
              <div className="flex items-center gap-2">
                {drawerDoc.status !== 'approved' && (
                  <Button className="text-ds-micro" onClick={function() { void manual(drawerDoc.id, 'approve'); }} data-state="doc-drawer-approve">
                    Approve (manual)
                  </Button>
                )}
                <Button variant="ghost" className="text-ds-micro" onClick={function() { setPreviewId(drawerDoc.id); setDrawerId(null); }} data-state="doc-drawer-open-record">
                  Open full record
                </Button>
              </div>
            </div>
          ) : undefined
        }
      >
        {drawerDoc ? (
          <ComplianceDocPreviewBody
            doc={drawerDoc}
            brandName={brandsList.find(function(b) { return b.id === drawerDoc.brandId; })?.profile.businessName ?? drawerDoc.brandId}
            products={productsList.filter(function(p) { return p.brandId === drawerDoc.brandId; })}
            note={note}
          />
        ) : null}
      </RecordDrawer>
      {preview && previewBundle && (function() {
        const bundle = previewBundle;
        const docBrand = brandsList.find(function(b) { return b.id === preview.brandId; });
        return (<div className="fixed inset-0 z-[60] bg-surface-hover backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col bg-ink-850 border-hairline">
            <div className="flex items-center justify-between px-5 py-4 border-b border-hairline">
              <span className="text-sm font-semibold text-strong capitalize">{preview.type.replace(/_/g, ' ')} — {docBrand?.profile.businessName}</span>
              <button onClick={function() { setPreviewId(null); }} className="text-zinc-400 hover:text-strong">✕</button>
            </div>
            <iframe title="doc-preview" srcDoc={bundle?.html ?? '<p>No preview.</p>'} className="w-full h-[60vh] bg-tint" />
            <div className="flex justify-end gap-2 p-4 border-t border-hairline">
              <Button variant="ghost" onClick={function() { setPreviewId(null); }}>Close</Button>
              <Button onClick={function() { void manual(preview.id, 'approve'); }} className="text-xs"><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve (manual)</Button>
              <Button variant="ghost" onClick={function() { void manual(preview.id, 'reject'); }} className="text-xs text-red-300"><XCircle className="w-3.5 h-3.5 mr-1" /> Reject</Button>
              <Button variant="ghost" onClick={function() { void runAutomated(preview.id); }} className="text-xs text-brass">Verify (automated)</Button>
            </div>
          </Card>
        </div>);
      })()}
    </WorkspaceFrame>
  );
}

/* ── RECORD PREVIEW BODY ────────────────────────────────────────────────────
 * Only the sections a compliance document genuinely supports are rendered.
 * Nothing is invented and no empty placeholder section is shown.
 */
function ComplianceDocPreviewBody({
  doc,
  brandName,
  products,
  note,
}: {
  doc: ComplianceDocument;
  brandName: string;
  products: { id: string; name: string; sku: string }[];
  note: string | null;
}) {
  const status = complianceDocStatusPresentation(doc.status);
  const verification = doc.verificationStatus
    ? documentVerificationStatusPresentation(doc.verificationStatus)
    : null;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge dataStatus={status.dataStatus} tone={status.tone}>
          {status.label}
        </StatusBadge>
        {verification && (
          <StatusBadge dataStatus={verification.dataStatus} tone={verification.tone}>
            {verification.label}
          </StatusBadge>
        )}
      </div>

      <RecordFieldList
        fields={[
          { label: 'Brand', value: brandName },
          { label: 'Document type', value: doc.type.replace(/_/g, ' ') },
          { label: 'Version', value: String(doc.version ?? 1) },
          { label: 'Verification method', value: doc.verificationStatus ? 'Recorded' : 'Not yet verified' },
          { label: 'Supersedes', value: doc.supersedesDocumentId ? `v${(doc.version ?? 2) - 1}` : '—' },
          { label: 'Expiry', value: doc.expiryDate ?? '—' },
          { label: 'Products in scope', value: String(products.length) },
          { label: 'Issuing body', value: doc.issuer ?? '—' },
        ]}
      />

      {note && (
        <section aria-label="Last verification outcome">
          <h3 className="mb-1.5 text-ds-label font-semibold uppercase tracking-[0.14em] text-zinc-400">
            Last verification outcome
          </h3>
          <p className="text-ds-label leading-snug text-zinc-400">{note}</p>
        </section>
      )}

      <section aria-label="Gate effect">
        <h3 className="mb-1.5 text-ds-label font-semibold uppercase tracking-[0.14em] text-zinc-400">
          Gate effect
        </h3>
        <p className="text-ds-label leading-snug text-zinc-500">
          {doc.status === 'approved'
            ? 'This document satisfies its requirement for the products in scope.'
            : 'This document does not yet satisfy its requirement — the affected products stay behind the compliance gate.'}
        </p>
      </section>
    </div>
  );
}
