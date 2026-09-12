import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useApp } from '@/context/GlobalStateContext';
import { Card, Badge, Button, Input, Select } from '@/components/ui';
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
import { useContracts, useBrandAgreements, useCatalogSubmissions } from '@/data/queries';
import { BrandGuidance } from '@/components/shared/BrandGuidance';
import { ImageSetEditor } from '@/components/shared/ImageUploader';
import { generateDefaultProductImages } from '@/lib/amazon/productImageValidator';
import { CsvCatalogImport } from '@/components/shared/CsvCatalogImport';

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

  /** The tenant's submissions — the CANONICAL store, filtered by tenant. */
  const submissions = (useCatalogSubmissions().data?.data ?? []).filter(
    (s) => s.brandId === brandId
  );
  const submissionBySku = new Map(submissions.map((s) => [s.sku, s] as const));

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
    <div className="p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Master Product Catalog</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Wholesale pricing schema and UK compliance metadata
          </p>
        </div>
        <Button onClick={() => { setShowAdd(true); setShowCsvImport(false); }} disabled={!gateCleared}>
          {gateCleared ? <Plus className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
          {gateCleared ? 'Add New Product' : 'Catalog Locked'}
        </Button>
        <Button variant="ghost" className="text-xs" onClick={() => { setShowCsvImport(!showCsvImport); setShowAdd(false); }} disabled={!gateCleared}>
          <Upload className="w-3.5 h-3.5 mr-1" /> CSV Import
        </Button>
      </div>

      {!gateCleared && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-sm text-amber-200">
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
              <li key={b.type} className="text-amber-300">
                • Pending review: {b.type.replace(/_/g, ' ')} ({b.status})
              </li>
            ))}
          </ul>
        </div>
      )}

      {gateError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-300">
          {gateError}
        </div>
      )}

      {/* §Phase E3 — catalog readiness, derived from the existing rules only. */}
      {gateCleared && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4 text-xs">
          <div className="flex items-center justify-between gap-3">
            <div className="text-zinc-300">
              <span className="font-medium text-white">Catalog readiness</span>{' '}
              · {products.length} product{products.length === 1 ? '' : 's'} in your catalog ·{' '}
              {incompleteCount === 0
                ? 'all product information complete'
                : `${incompleteCount} product(s) still missing required information`}
            </div>
            <Badge className={cn('text-[10px]', 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20')}>
              Compliance gate cleared
            </Badge>
          </div>
          {incompleteCount > 0 && (
            <ul className="mt-2 space-y-1 text-amber-300">
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
            <p className="mt-2 text-zinc-500">
              Products may be submitted. Submissions run through the retail-channel seam and are
              processed in SIMULATION until live credentials are configured.
            </p>
          )}
        </div>
      )}

      {submissionNotice && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3 text-xs text-zinc-300">
          {submissionNotice}
        </div>
      )}

      {showCsvImport && brandId && (
        <CsvCatalogImport brandId={brandId} onComplete={() => { setShowCsvImport(false); }} />
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-xs text-zinc-500">
                <th className="text-left font-medium px-4 py-3">Product</th>
                <th className="text-left font-medium px-4 py-3">SKU / Barcode</th>
                <th className="text-right font-medium px-4 py-3">Ex-Works (£)</th>
                <th className="text-right font-medium px-4 py-3">UK MSRP (£)</th>
                <th className="text-left font-medium px-4 py-3">Commodity Code</th>
                <th className="text-left font-medium px-4 py-3">Case Pack</th>
                <th className="text-left font-medium px-4 py-3">Tax Code</th>
                <th className="text-left font-medium px-4 py-3">VAT</th>
                <th className="text-center font-medium px-4 py-3">Hazmat</th>
                <th className="text-left font-medium px-4 py-3">Dimensions (cm)</th>
                <th className="text-right font-medium px-4 py-3">Weight</th>
                <th className="text-center font-medium px-4 py-3">Availability</th>
                <th className="text-right font-medium px-4 py-3">Lead Time</th>
                <th className="text-center font-medium px-4 py-3">Submission</th>
                <th className="text-center font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {products.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-white/[0.02] transition-colors text-zinc-300"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl w-8 h-8 flex items-center justify-center bg-ink-900 rounded-lg">
                        {p.image}
                      </span>
                      <span className="text-sm font-medium text-white">
                        {p.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs font-mono text-zinc-400">{p.sku}</div>
                    <div className="text-[10px] font-mono text-zinc-600 mt-0.5">
                      {p.barcode}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-white">
                    £{p.exWorksPrice.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-zinc-300">
                    £{p.ukRetailPrice.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-zinc-400">
                    {p.commodityCode}
                  </td>
                  {/* §Stage-24 item setup — case pack + product tax code */}
                  <td className="px-4 py-3 text-xs text-zinc-400">
                    {p.unitsPerCase ?? '—'} units/case
                    {p.caseOrderable && (
                      <span className="ml-1 text-brass-400">(case orderable)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-zinc-400">
                    {p.productTaxCode ?? 'A_GEN_TAX'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={
                        p.vatStatus === 'Zero-rated'
                          ? 'bg-blue-500/15 text-blue-300 border-blue-500/20'
                          : 'bg-zinc-500/15 text-zinc-300 border-zinc-500/20'
                      }
                    >
                      {p.vatStatus}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {p.hazmat ? (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-400">
                        <Flame className="w-3 h-3" />
                        Yes
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-600">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400">
                    {p.length}×{p.width}×{p.height}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-zinc-400">
                    {p.weight} kg
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => {
                        import('@/data/demoStore').then((m) => {
                          m.updateProductAvailability(p.sku, !p.isAvailable);
                        });
                      }}
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors',
                        p.isAvailable !== false
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-red-500/15 text-red-300'
                      )}
                    >
                      {p.isAvailable !== false ? 'In Stock' : 'OOS'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-zinc-400">
                    {p.leadTimeDays != null ? `${p.leadTimeDays}d` : '—'}
                  </td>
                  {/* §Phase E3 — the product's resulting catalog state, DERIVED
                      from the canonical submission store (never duplicated). */}
                  <td className="px-4 py-3 text-center">
                    {(() => {
                      const sub = submissionBySku.get(p.sku);
                      const complete = completenessBySku.get(p.sku)?.complete ?? false;
                      if (!sub) {
                        return complete ? (
                          <span className="text-[10px] text-zinc-500">Ready to submit</span>
                        ) : (
                          <span className="text-[10px] text-amber-300">Incomplete</span>
                        );
                      }
                      return (
                        <span
                          className={cn(
                            'text-[10px] px-2 py-0.5 rounded-full font-medium',
                            sub.status === 'live'
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : sub.status === 'rejected'
                              ? 'bg-red-500/15 text-red-300'
                              : sub.status === 'under_amazon_review'
                              ? 'bg-blue-500/15 text-blue-300'
                              : 'bg-zinc-500/15 text-zinc-300'
                          )}
                        >
                          {SUBMISSION_STATUS_LABELS[sub.status]}
                          {sub.simulated ? ' (sim)' : ''}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <button
                        onClick={() => setEditingSku(p.sku)}
                        className="text-[10px] text-brass-400 hover:text-brass-300 transition-colors"
                      >
                        Edit Cost
                      </button>
                      {/* §Phase E3 — submit when genuinely ready; poll the
                          simulated processing when a submission exists. */}
                      {(() => {
                        const sub = submissionBySku.get(p.sku);
                        if (sub && sub.status !== 'live' && sub.status !== 'rejected') {
                          return (
                            <button
                              onClick={() => void handlePollSubmission(sub.id)}
                              disabled={busySku === sub.id}
                              className="text-[10px] text-brass-400 hover:text-brass-300 transition-colors inline-flex items-center gap-1 disabled:opacity-50"
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
                            className="text-[10px] text-brass-400 hover:text-brass-300 transition-colors inline-flex items-center gap-1 disabled:opacity-40"
                          >
                            <Send className="w-3 h-3" />
                            {busySku === p.sku ? 'Submitting…' : sub ? 'Resubmit' : 'Submit'}
                          </button>
                        );
                      })()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
    </div>
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
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-ink-850 border-l border-white/[0.08] h-full overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] sticky top-0 bg-ink-850 z-10">
          <h3 className="text-sm font-semibold text-white">
            {guidanceAcked ? 'Add New Product' : 'Before You Add a Product'}
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        {!guidanceAcked ? (
          <div className="p-5 space-y-4">
            <p className="text-xs text-zinc-500">
              Please review this quick guidance on pricing, packaging, and PO
              rejections — understanding these factors helps protect your vendor
              performance.
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
          <div className="border-t border-white/[0.06] pt-3 mt-2">
            <p className="text-[10px] text-zinc-500 font-medium mb-2 flex items-center gap-1">
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
              className="rounded border-white/[0.15] bg-ink-900 text-brass-500 focus:ring-brass-500/30"
            />
            <span className="text-xs text-zinc-400">Contains hazardous materials</span>
          </label>
          <div className="pt-2">
            {gateBlocked && (
              <p className="mb-2 text-[11px] text-amber-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Submission disabled — compliance gate not cleared.
              </p>
            )}
            {!gateBlocked && !completeness.complete && (
              <div className="mb-2 text-[11px] text-amber-300">
                <p>Missing required information:</p>
                <ul className="mt-1 space-y-0.5 text-amber-300/90">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-ink-850 border border-white/[0.08] rounded-xl p-5 w-80 shadow-2xl">
        <h3 className="text-sm font-semibold text-white mb-1">Edit Item Cost</h3>
        <p className="text-[10px] text-zinc-500 mb-4">
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
