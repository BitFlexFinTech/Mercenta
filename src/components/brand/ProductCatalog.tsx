import { useMemo, useState } from 'react';
import { useRecordDeepLink, useFocusRecordElement } from '@/lib/runtime/recordDeepLink';
import { useQueryClient } from '@tanstack/react-query';
import { useApp } from '@/context/GlobalStateContext';
import { Card, Badge, Button, DataTable, Input, Select } from '@/components/ui';
import { WorkspaceFrame, WorkspaceHeader } from '@/components/shared/workspace';
import { cn } from '@/utils/cn';
import { Plus, X, Flame, Lock, ShieldAlert, ImageUp, Upload, Send, RefreshCw } from 'lucide-react';
import type { Product } from '@/types';
import { evaluateComplianceGate } from '@/lib/compliance';
import { evaluateProductCompleteness } from '@/lib/catalog/productCompleteness';
import {
  pollCatalogSubmission,
  submitCatalogProduct,
  type CatalogActor,
} from '@/lib/catalog/catalogLifecycle';
import { SUBMISSION_STATUS_LABELS } from '@/lib/spapi/transform';
import { useContracts, useBrandAgreements, useCatalogSubmissions, useCanonicalStoreVersion } from '@/data/queries';
import { getProductIdentifier, latestSubmissionForProduct } from '@/data/demoStore';
import { ASIN_STATE_LABELS, deriveAsinState } from '@/lib/catalog/asin';
import { BrandGuidance } from '@/components/shared/BrandGuidance';
import { ImageSetEditor } from '@/components/shared/ImageUploader';
import { generateDefaultProductImages } from '@/lib/amazon/productImageValidator';
import { CsvCatalogImport } from '@/components/shared/CsvCatalogImport';
import { ProductThumb } from '@/components/shared/ProductThumb';

export function ProductCatalog() {
  const { products, addProduct, gateDocs, brandProfile, session } = useApp();
  const qc = useQueryClient();
  const contracts = useContracts().data?.data ?? [];
  const [showAdd, setShowAdd] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [guidanceAcked, setGuidanceAcked] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);
  const [editingSku, setEditingSku] = useState<string | null>(null);
  const [_costEdit, setCostEdit] = useState('');
  /**
   * §Phase D — the availability toggle writes to the canonical catalog store but
   * nothing re-read the session projection, so the control had NO visible
   * consequence until an unrelated re-render. The local override gives the click
   * immediate, deterministic feedback while the store write (the real state)
   * still happens — the two cannot drift because every other read path uses the
   * canonical store.
   */
  const [availabilityOverride, setAvailabilityOverride] = useState<Record<string, boolean>>({});
  /** §Phase E3 — the outcome of the last submit/poll, stated honestly. */
  const [submissionNotice, setSubmissionNotice] = useState<string | null>(null);
  const [busySku, setBusySku] = useState<string | null>(null);

  // §Batch-5 — distribution agreement is now derived from the Contract, not a second doc.
  const brandId = session?.tenantId;
  const hasSignedAgreement = brandId
    ? contracts.some((c) => c.brandId === brandId && c.type === 'distribution_agreement' && (c.status === 'signed' || c.status === 'active'))
    : false;
  // §Legal — brand agreement checks for the compliance gate
  const brandAgreements = useBrandAgreements().data?.data ?? [];
  const logisticsSlaAccepted = brandId
    ? brandAgreements.some((a) => a.brandId === brandId && a.agreementType === 'logistics_sla')
    : false;
  const chargebackIndemnityAccepted = brandId
    ? brandAgreements.some((a) => a.brandId === brandId && a.agreementType === 'chargeback_indemnity')
    : false;

  // §3 — hard gate: catalog sync is blocked until every required
  // ComplianceDocument is approved AND the distribution agreement is signed.
  // This is the client-side check; the server-side trigger enforces it independently.
  const gate = evaluateComplianceGate(gateDocs, brandProfile?.category as import('@/types').ApprovedCategory | undefined, hasSignedAgreement, logisticsSlaAccepted, chargebackIndemnityAccepted);
  const gateCleared = gate.cleared;

  /* ── §Phase E3 — the submission lifecycle for THIS tenant ─────────── */

  /**
   * The brand acts as itself: `tenantId` pins the actor to this brand, so the
   * domain refuses any action on another tenant's catalog record. `canMutate`
   * is true because a brand may always manage its OWN products.
   */
  const actor = useMemo<CatalogActor>(
    () => ({ staffId: `brand:${brandId ?? 'none'}`, canMutate: true, tenantId: brandId }),
    [brandId]
  );

  /** §Phase E3 — the CANONICAL submission store (tenant-filtered at read time). */
  const submissionsQuery = useCatalogSubmissions();
  const submissionsData = submissionsQuery.data;

  /**
   * §P8 — the canonical store change signal, so a channel identifier recorded by
   * the surface (or by the channel's acceptance) is visible here immediately.
   */
  const canonicalVersion = useCanonicalStoreVersion();
  void canonicalVersion;

  /**
   * §Phase E6 (G3) — ONE canonical latest-submission derivation.
   *
   * This previously built a local map (`new Map(submissions.map(s => [s.sku, s]))`)
   * in which the LAST array element won — not guaranteed to be the newest by
   * `submittedAt` — so after a resubmission the brand could be shown a superseded
   * record as its current catalog state. It now uses the canonical
   * `demoStore.latestSubmissionForProduct` (the same helper the E3 domain and both
   * admin surfaces use). The memo is keyed on the canonical query result, so React
   * re-renders still propagate.
   */
  const latestSubmissionForSku = useMemo(() => {
    void submissionsData; // reactivity anchor: the canonical submission query result
    return (sku: string) => (brandId ? latestSubmissionForProduct(brandId, sku) : undefined);
  }, [submissionsData, brandId]);

  /**
   * §BATCH 7 (Part 4.1a) — DEEP LINK. `/brand/catalog?submission=<id>` marks and
   * scrolls to THAT submission's product row, so a "rejected catalog submission"
   * notice lands on the record it names rather than on the catalogue. (Before this
   * change the notice did NOTHING when clicked.) The submission is resolved from
   * the canonical submission store by its own id — never re-derived — and a
   * submission that is not on this page is a no-op, not an invented record.
   */
  const deepLinkSubmission = useRecordDeepLink('submission');
  const deepLinkSubmissionSku = useMemo(() => {
    if (!deepLinkSubmission) return null;
    const sub = (submissionsData?.data ?? []).find((s) => s.id === deepLinkSubmission);
    return sub ? sub.sku : null;
  }, [deepLinkSubmission, submissionsData]);
  useFocusRecordElement(
    deepLinkSubmissionSku ? `[data-testid="catalog-asin-${deepLinkSubmissionSku}"]` : null
  );

  /** Completeness is DERIVED from the canonical prerequisite list per product. */
  const completenessBySku = new Map(
    products.map((p) => [
      p.sku,
      evaluateProductCompleteness(p as unknown as Record<string, unknown>),
    ] as const)
  );
  const incompleteCount = [...completenessBySku.values()].filter((c) => !c.complete).length;

  /** §Phase E3 — SUBMIT through the existing seam (completeness + gate inside). */
  async function handleSubmitForSubmission(p: Product) {
    if (!brandId) return;
    setBusySku(p.sku);
    setSubmissionNotice(null);
    const result = await submitCatalogProduct(
      brandId,
      p as unknown as Record<string, unknown>,
      actor
    );
    setBusySku(null);
    if (!result.ok) {
      setSubmissionNotice(`${p.sku}: ${result.error}`);
      return;
    }
    setSubmissionNotice(
      `${p.sku}: submitted — tracking ${result.value.submissionId} · ${SUBMISSION_STATUS_LABELS[result.value.status]}${result.value.simulated ? ' (SIMULATED — no live retail call)' : ''}`
    );
    await qc.invalidateQueries({ queryKey: ['catalog-submissions'] });
  }

  /** §Phase E3 — advance the SIMULATED processing to a result. */
  async function handlePollSubmission(submissionId: string) {
    setBusySku(submissionId);
    setSubmissionNotice(null);
    const result = await pollCatalogSubmission(submissionId, actor);
    setBusySku(null);
    if (!result.ok) {
      setSubmissionNotice(result.error);
      return;
    }
    setSubmissionNotice(
      `${result.value.sku}: ${SUBMISSION_STATUS_LABELS[result.value.status]}${result.value.rejectionReason ? ` — ${result.value.rejectionReason}` : ''}${result.value.simulated ? ' (SIMULATED)' : ''}`
    );
    await qc.invalidateQueries({ queryKey: ['catalog-submissions'] });
  }

  const handleAdd = (p: Product) => {
    if (!gateCleared) {
      setGateError(
        `Catalog submission blocked — ${gate.missing.length} missing / ${gate.blocking.length} pending document(s).`
      );
      return;
    }
    setGateError(null);
    addProduct(p);
    setShowAdd(false);
  };

  return (
    <WorkspaceFrame className="space-y-4">
      <WorkspaceHeader
        eyebrow="BRAND PORTAL · CATALOGUE"
        title="Master Product Catalog"
        description="Wholesale pricing schema, UK compliance metadata and the canonical submission gate."
        actions={
          <>
            <Button onClick={() => { setShowAdd(true); setShowCsvImport(false); }} disabled={!gateCleared}>
              {gateCleared ? <Plus className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              {gateCleared ? 'Add New Product' : 'Catalog Locked'}
            </Button>
            <Button variant="ghost" className="text-xs" onClick={() => { setShowCsvImport(!showCsvImport); setShowAdd(false); }} disabled={!gateCleared}>
              <Upload className="w-3.5 h-3.5 mr-1" /> CSV Import
            </Button>
          </>
        }
      />

      {!gateCleared && (
        <div className="bg-amber-500/10 border border-state-warning/20 rounded-ds-md p-4 text-sm text-state-warning">
          <div className="flex items-center gap-2 mb-2 font-medium">
            <ShieldAlert className="w-4 h-4" />
            Catalog Sync Disabled — Compliance Gate{' '}
            {brandProfile.complianceGateStatus === 'in_review' ? 'In Review' : 'Blocked'}
          </div>
          <p className="text-xs leading-relaxed">
            Product submission to retail channels is disabled until every required
            compliance document for your category is approved.
          </p>
          <ul className="mt-2 text-xs space-y-1">
            {gate.missing.map((m) => (
              <li key={m} className="text-red-300">
                • Missing: {m.replace(/_/g, ' ')}
              </li>
            ))}
            {gate.blocking.map((b) => (
              <li key={b.type} className="text-state-warning">
                • Pending review: {b.type.replace(/_/g, ' ')} ({b.status})
              </li>
            ))}
          </ul>
        </div>
      )}

      {gateError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-ds-md p-3 text-xs text-red-300">
          {gateError}
        </div>
      )}

      {/* §Phase E3 — catalog readiness, derived from the existing rules only. */}
      {gateCleared && (
        <div className="bg-tint border border-hairline rounded-ds-md p-4 text-xs">
          <div className="flex items-center justify-between gap-3">
            <div className="text-strong">
              <span className="font-medium text-strong">Catalog readiness</span>{' '}
              · {products.length} product{products.length === 1 ? '' : 's'} in your catalog ·{' '}
              {incompleteCount === 0
                ? 'all product information complete'
                : `${incompleteCount} product(s) still missing required information`}
            </div>
            <Badge className={cn('text-ds-micro', 'bg-state-success/10 text-state-success border-state-success/20')}>
              Compliance gate cleared
            </Badge>
          </div>
          {incompleteCount > 0 && (
            <ul className="mt-2 space-y-1 text-state-warning">
              {[...completenessBySku.entries()]
                .filter(([, c]) => !c.complete)
                .map(([sku, c]) => (
                  <li key={sku}>
                    • {sku}: missing {c.missingLabels.join(', ')}
                  </li>
                ))}
            </ul>
          )}
          {incompleteCount === 0 && (
            <p className="mt-2 text-muted">
              Products may be submitted. Submissions run through the retail-channel seam and are
              processed in SIMULATION until live credentials are configured.
            </p>
          )}
        </div>
      )}

      {submissionNotice && (
        <div className="bg-tint border border-hairline rounded-ds-md p-3 text-xs text-strong">
          {submissionNotice}
        </div>
      )}

      {showCsvImport && brandId && (
        <CsvCatalogImport brandId={brandId} onComplete={() => { setShowCsvImport(false); }} />
      )}

{/* §Phase D — canonical DataTable. Fifteen catalogue columns are NOT
          squeezed into a phone viewport: below md every product renders as a
          labelled card (all fields + all actions reachable, nothing clipped,
          no horizontal page overflow). At md+ the semantic table progressively
          discloses the secondary trade/logistics columns at lg. */}
      <Card>
        <DataTable
          dataTable="product-catalogue"
          caption="Product catalogue"
          rows={products}
          rowKey={(p) => p.id}
          emptyMessage="No products in your catalogue yet."
          columns={[
            {
              key: 'product',
              label: 'Product',
              primary: true,
              render: (p) => (
                <div className="flex items-center gap-2.5">
                  {/* §Wave-3 Part 3.1 (§BATCH 6, 2026-10-10) — the owner enlarged
                      this catalogue thumbnail 32px → 64px. It renders through the
                      ONE owner (`ProductThumb`), whose placeholder glyph/icon now
                      scale with the box; nothing else in the cell moved. */}
                  <ProductThumb product={p} size={64} className="rounded-ds-md" />
                  <span className="text-sm font-medium text-strong">{p.name}</span>
                </div>
              ),
            },
            {
              key: 'sku',
              label: 'SKU / Barcode',
              render: (p) => {
                /**
                 * §P8 — DECISION 5/10: the product's channel identifier is shown
                 * per catalogue product WITH ITS SOURCE, inside the identity cell
                 * rather than as an extra column. Two reasons, both real: the
                 * identifier belongs with the SKU/barcode it identifies, and the
                 * catalogue table is already wide — an extra column pushed the
                 * row's own controls under the floating chat control and broke an
                 * existing browser contract (found by the E3 catalog spec).
                 *
                 * The value is never invented here: it is either the brand's own
                 * declaration for an existing listing or what Mercenta recorded
                 * from the channel's acceptance (a simulated placeholder until a
                 * live response exists).
                 */
                const identifier = brandId ? getProductIdentifier(brandId, p.sku) : undefined;
                const state = deriveAsinState(identifier, !!latestSubmissionForSku(p.sku));
                return (
                  <div data-testid={`catalog-asin-${p.sku}`}>
                    <div className="text-xs font-mono text-muted">{p.sku}</div>
                    <div className="text-ds-micro font-mono text-faint mt-0.5">{p.barcode}</div>
                    <div className="text-ds-micro mt-0.5">
                      {identifier ? (
                        <>
                          <span className="font-mono text-strong">{identifier.asin}</span>
                          <span className="text-faint">
                            {' '}
                            · {identifier.source === 'brand_declared' ? 'brand' : 'channel'}
                            {identifier.simulated ? ' (simulated)' : ''}
                          </span>
                        </>
                      ) : (
                        <span className="text-faint">{ASIN_STATE_LABELS[state]}</span>
                      )}
                    </div>
                  </div>
                );
              },
            },
            {
              key: 'exWorks',
              label: 'Ex-Works (£)',
              align: 'right',
              render: (p) => (
                <span className="text-sm font-semibold text-strong">£{p.exWorksPrice.toFixed(2)}</span>
              ),
            },
            {
              key: 'msrp',
              label: 'UK MSRP (£)',
              align: 'right',
              render: (p) => (
                <span className="text-sm text-strong">£{p.ukRetailPrice.toFixed(2)}</span>
              ),
            },
            {
              key: 'commodity',
              label: 'Commodity Code',
              hideBelow: 'lg',
              render: (p) => (
                <span className="text-xs font-mono text-muted">{p.commodityCode}</span>
              ),
            },
            {
              key: 'casePack',
              label: 'Case Pack',
              hideBelow: 'lg',
              render: (p) => (
                <span className="text-xs text-muted">
                  {p.unitsPerCase ?? '—'} units/case
                  {p.caseOrderable && <span className="ml-1 text-accent-400">(case orderable)</span>}
                </span>
              ),
            },
            {
              key: 'taxCode',
              label: 'Tax Code',
              hideBelow: 'lg',
              render: (p) => (
                <span className="text-xs font-mono text-muted">
                  {p.productTaxCode ?? 'A_GEN_TAX'}
                </span>
              ),
            },
            {
              key: 'vat',
              label: 'VAT',
              hideBelow: 'lg',
              render: (p) => (
                <Badge
                  className={
                    p.vatStatus === 'Zero-rated'
                      ? 'bg-state-info/10 text-state-info border-blue-500/20'
                      : 'bg-tint text-strong border-hairline'
                  }
                >
                  {p.vatStatus}
                </Badge>
              ),
            },
            {
              key: 'hazmat',
              label: 'Hazmat',
              align: 'center',
              hideBelow: 'lg',
              render: (p) =>
                p.hazmat ? (
                  <span className="inline-flex items-center gap-1 text-xs text-state-warning">
                    <Flame className="w-3 h-3" />
                    Yes
                  </span>
                ) : (
                  <span className="text-xs text-faint">No</span>
                ),
            },
            {
              key: 'dimensions',
              label: 'Dimensions (cm)',
              hideBelow: 'lg',
              render: (p) => (
                <span className="text-xs text-muted">
                  {p.length}×{p.width}×{p.height}
                </span>
              ),
            },
            {
              key: 'weight',
              label: 'Weight',
              align: 'right',
              hideBelow: 'lg',
              render: (p) => <span className="text-xs text-muted">{p.weight} kg</span>,
            },
            {
              key: 'availability',
              label: 'Availability',
              align: 'center',
              render: (p) => {
                const isAvailable = availabilityOverride[p.sku] ?? p.isAvailable !== false;
                return (
                  <button
                    onClick={() => {
                      const next = !isAvailable;
                      setAvailabilityOverride((prev) => ({ ...prev, [p.sku]: next }));
                      void import('@/data/demoStore').then((m) => {
                        m.updateProductAvailability(p.sku, next);
                      });
                    }}
                    aria-label={`Toggle availability for ${p.sku}`}
                    aria-pressed={!isAvailable}
                    className={cn(
                      'text-ds-micro px-2 py-0.5 rounded-full font-medium transition-colors',
                      isAvailable
                        ? 'bg-state-success/10 text-state-success'
                        : 'bg-red-500/15 text-red-300'
                    )}
                  >
                    {isAvailable ? 'In Stock' : 'OOS'}
                  </button>
                );
              },
            },
            {
              key: 'leadTime',
              label: 'Lead Time',
              align: 'right',
              hideBelow: 'lg',
              render: (p) => (
                <span className="text-xs text-muted">
                  {p.leadTimeDays != null ? `${p.leadTimeDays}d` : '—'}
                </span>
              ),
            },
{
              key: 'submission',
              label: 'Submission',
              align: 'center',
              render: (p) => {
                const sub = latestSubmissionForSku(p.sku);
                const complete = completenessBySku.get(p.sku)?.complete ?? false;
                if (!sub) {
                  return complete ? (
                    <span className="text-ds-micro text-muted">Ready to submit</span>
                  ) : (
                    <span className="text-ds-micro text-state-warning">Incomplete</span>
                  );
                }
                return (
                  <span
                    className={cn(
                      'text-ds-micro px-2 py-0.5 rounded-full font-medium',
                      sub.status === 'live'
                        ? 'bg-state-success/10 text-state-success'
                        : sub.status === 'rejected'
                        ? 'bg-red-500/15 text-red-300'
                        : sub.status === 'under_amazon_review'
                        ? 'bg-state-info/10 text-state-info'
                        : 'bg-tint text-strong'
                    )}
                  >
                    {SUBMISSION_STATUS_LABELS[sub.status]}
                    {sub.simulated ? ' (sim)' : ''}
                  </span>
                );
              },
            },
            {
              key: 'actions',
              label: 'Actions',
              align: 'center',
              render: (p) => (
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={() => setEditingSku(p.sku)}
                    className="text-ds-micro text-accent-400 hover:text-accent-300 transition-colors"
                  >
                    Edit Cost
                  </button>
                  {(() => {
                    const sub = latestSubmissionForSku(p.sku);
                    if (sub && sub.status !== 'live' && sub.status !== 'rejected') {
                      return (
                        <button
                          onClick={() => void handlePollSubmission(sub.id)}
                          disabled={busySku === sub.id}
                          className="text-ds-micro text-accent-400 hover:text-accent-300 transition-colors inline-flex items-center gap-1 disabled:opacity-50"
                        >
                          <RefreshCw className="w-3 h-3" />
                          {busySku === sub.id ? 'Polling…' : 'Check result'}
                        </button>
                      );
                    }
                    const ready = completenessBySku.get(p.sku)?.complete ?? false;
                    return (
                      <button
                        onClick={() => void handleSubmitForSubmission(p)}
                        disabled={!gateCleared || !ready || busySku === p.sku}
                        title={ready ? 'Submit through the retail-channel seam' : 'Product information is incomplete'}
                        className="text-ds-micro text-accent-400 hover:text-accent-300 transition-colors inline-flex items-center gap-1 disabled:opacity-40"
                      >
                        <Send className="w-3 h-3" />
                        {busySku === p.sku ? 'Submitting…' : sub ? 'Resubmit' : 'Submit'}
                      </button>
                    );
                  })()}
                </div>
              ),
            },
          ]}
        />
      </Card>

      {showAdd && (
        <AddProductPanel
          onClose={() => { setShowAdd(false); setGuidanceAcked(false); }}
          onAdd={handleAdd}
          gateBlocked={!gateCleared}
          guidanceAcked={guidanceAcked}
          onGuidanceAck={() => setGuidanceAcked(true)}
        />
      )}

      {/* §Batch-2 — Edit Item Cost modal */}
      {editingSku && (
        <CostEditPanel
          sku={editingSku}
          onClose={() => { setEditingSku(null); setCostEdit(''); }}
          onSave={(sku, newPrice) => {
            import('@/data/demoStore').then((m) => m.updateProductCost(sku, newPrice));
            setEditingSku(null);
            setCostEdit('');
          }}
        />
      )}
    </WorkspaceFrame>
  );
}

function AddProductPanel({
  onClose,
  onAdd,
  gateBlocked,
  guidanceAcked,
  onGuidanceAck,
}: {
  onClose: () => void;
  onAdd: (p: Product) => void;
  gateBlocked: boolean;
  guidanceAcked: boolean;
  onGuidanceAck: () => void;
}) {
  const [form, setForm] = useState({
    name: '', sku: '', barcode: '', image: '📦',
    exWorksPrice: '', ukRetailPrice: '', commodityCode: '',
    vatStatus: 'Standard 20%', hazmat: false,
    length: '', width: '', height: '', weight: '',
  });
  const [productImages, setProductImages] = useState(generateDefaultProductImages('Home'));

  /**
   * §Phase E3 — completeness is evaluated on the RAW form values.
   *
   * Previously an empty dimension was silently converted to `0` by
   * `parseFloat(...) || 0`, which made an empty product look complete to the
   * submission prerequisites. Blank means blank: the product is saved only when
   * the real prerequisites have been supplied, and the missing list is shown.
   */
  const completeness = evaluateProductCompleteness(form as unknown as Record<string, unknown>);

  const handleSubmit = () => {
    if (!completeness.complete) return;
    onAdd({
      id: `prd-${Date.now()}`,
      name: form.name, sku: form.sku, barcode: form.barcode,
      image: productImages.find((i) => i.slot === 'main')?.url ?? form.image,
      productImages,
      exWorksPrice: parseFloat(form.exWorksPrice) || 0,
      ukRetailPrice: parseFloat(form.ukRetailPrice) || 0,
      commodityCode: form.commodityCode,
      vatStatus: form.vatStatus, hazmat: form.hazmat,
      length: parseFloat(form.length) || 0,
      width: parseFloat(form.width) || 0,
      height: parseFloat(form.height) || 0,
      weight: parseFloat(form.weight) || 0,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-surface-hover backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-surface-raised border-l border-hairline h-full overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-hairline sticky top-0 bg-surface-raised z-10">
          <h3 className="text-sm font-semibold text-strong">
            {guidanceAcked ? 'Add New Product' : 'Before You Add a Product'}
          </h3>
          <button onClick={onClose} className="text-muted hover:text-strong">
            <X className="w-4 h-4" />
          </button>
        </div>
        {!guidanceAcked ? (
          <div className="p-5 space-y-4">
            <p className="text-xs text-muted">
              {/*
                §P13 / S8 — REPOINTED (old contract recorded): this line used to read
                *"Please review this quick guidance on pricing, packaging, and PO
                rejections — understanding these factors helps protect your vendor
                performance."* — an unsupported vendor-performance claim (AV-003). The
                rule itself is rendered from its ONE owner by `BrandGuidance` below.
              */}
              Please review this quick guidance on pricing, packaging, and the
              channel's purchase-order acknowledgement rule.
            </p>
            <BrandGuidance
              compact
              sections={['netppm', 'po_rejection']}
            />
            <Button className="w-full text-xs" onClick={onGuidanceAck}>
              I Understand — Continue to Add Product
            </Button>
          </div>
        ) : (
          <div className="p-5 space-y-3">
            <Input
            label="Product Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Marula Facial Oil"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="SKU"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              placeholder="SPB-MAR-050"
            />
            <Input
              label="Barcode"
              value={form.barcode}
              onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              placeholder="600123..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Ex-Works Price (£)"
              type="number"
              value={form.exWorksPrice}
              onChange={(e) => setForm({ ...form, exWorksPrice: e.target.value })}
              placeholder="8.50"
            />
            <Input
              label="UK MSRP (£)"
              type="number"
              value={form.ukRetailPrice}
              onChange={(e) => setForm({ ...form, ukRetailPrice: e.target.value })}
              placeholder="24.99"
            />
          </div>
          <Input
            label="UK Trade Tariff / Commodity Code"
            value={form.commodityCode}
            onChange={(e) => setForm({ ...form, commodityCode: e.target.value })}
            placeholder="3304990000"
          />
          <Select
            label="VAT Status"
            value={form.vatStatus}
            onChange={(e) => setForm({ ...form, vatStatus: e.target.value })}
            options={[
              { value: 'Standard 20%', label: 'Standard 20%' },
              { value: 'Zero-rated', label: 'Zero-rated' },
              { value: 'Exempt', label: 'Exempt' },
            ]}
          />
          {/* §Batch-21 — Product image set with Amazon-standard validation */}
          <div className="border-t border-hairline pt-3 mt-2">
            <p className="text-ds-micro text-muted font-medium mb-2 flex items-center gap-1">
              <ImageUp className="w-3 h-3" /> Product Images
            </p>
            <ImageSetEditor
              images={productImages}
              onImagesChange={setProductImages}
              editable
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            <Input
              label="L (cm)"
              type="number"
              value={form.length}
              onChange={(e) => setForm({ ...form, length: e.target.value })}
            />
            <Input
              label="W (cm)"
              type="number"
              value={form.width}
              onChange={(e) => setForm({ ...form, width: e.target.value })}
            />
            <Input
              label="H (cm)"
              type="number"
              value={form.height}
              onChange={(e) => setForm({ ...form, height: e.target.value })}
            />
            <Input
              label="Wt (kg)"
              type="number"
              value={form.weight}
              onChange={(e) => setForm({ ...form, weight: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.hazmat}
              onChange={(e) => setForm({ ...form, hazmat: e.target.checked })}
              className="rounded-ds-sm border-hairline-strong bg-surface text-accent-500 focus:ring-accent-500/30"
            />
            <span className="text-xs text-muted">Contains hazardous materials</span>
          </label>
          <div className="pt-2">
            {gateBlocked && (
              <p className="mb-2 text-ds-label text-state-warning flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Submission disabled — compliance gate not cleared.
              </p>
            )}
            {!gateBlocked && !completeness.complete && (
              <div className="mb-2 text-ds-label text-state-warning">
                <p>Missing required information:</p>
                <ul className="mt-1 space-y-0.5 text-state-warning/90">
                  {completeness.missingLabels.map((l) => (
                    <li key={l}>
                      • {l}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Button
              onClick={handleSubmit}
              className="w-full"
              disabled={gateBlocked || !completeness.complete}
            >
              {gateBlocked
                ? 'Blocked — Compliance Gate'
                : completeness.complete
                ? 'Save Product'
                : `Complete ${completeness.missing.length} required field(s)`}
            </Button>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
function CostEditPanel({
  sku,
  onClose,
  onSave,
}: {
  sku: string;
  onClose: () => void;
  onSave: (sku: string, newPrice: number) => void;
}) {
  const { products } = useApp();
  const product = products.find((p) => p.sku === sku);
  const [price, setPrice] = useState(String(product?.exWorksPrice ?? ''));

  if (!product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-hover">
      <div className="bg-surface-raised border border-hairline rounded-ds-lg p-5 w-80 shadow-ds-overlay">
        <h3 className="text-sm font-semibold text-strong mb-1">Edit Item Cost</h3>
        <p className="text-ds-micro text-muted mb-4">
          {product.name} · {product.sku}
        </p>
        <div className="space-y-3">
          <Input
            label="Ex-Works Price (£)"
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
          />
          <div className="flex gap-2">
            <Button
              className="text-xs"
              onClick={() => {
                const p = parseFloat(price);
                if (isNaN(p) || p <= 0) return;
                onSave(sku, p);
              }}
            >
              Update Cost
            </Button>
            <Button className="text-xs" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
