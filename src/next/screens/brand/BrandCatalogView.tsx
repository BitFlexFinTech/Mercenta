import { useState } from 'react';
import { Flame, Lock, Plus, RefreshCw, Send, ShieldAlert, Upload } from 'lucide-react';
import {
  ConsoleTable,
  InlineStatus,
  LoadingRows,
  MetricStrip,
  PageHeader,
  SlideOverDrawer,
  type ConsoleColumn,
  type MetricItem,
} from '@/next/components/ConsolePrimitives';
import { NoticeBanner, SectionCard } from '@/next/components/ConsoleCharts';
import { ProductThumb } from '@/components/shared/ProductThumb';
import { ASIN_STATE_LABELS, deriveAsinState } from '@/lib/catalog/asin';
import { SUBMISSION_STATUS_LABELS } from '@/lib/spapi/transform';
import type { Product, ProductCompleteness, ProductIdentifier, ProductSubmission } from '@/types';

export interface BrandCatalogRowMeta {
  product: Product;
  completeness: ProductCompleteness;
  identifier?: ProductIdentifier;
  latestSubmission?: ProductSubmission;
  isAvailable: boolean;
}

export interface BrandCatalogViewProps {
  loading: boolean;
  products: BrandCatalogRowMeta[];
  gateCleared: boolean;
  gateStatusLabel: string;
  gateMissing: string[];
  gateBlocking: { type: string; status: string }[];
  incompleteCount: number;
  submissionNotice: string | null;
  gateError: string | null;
  busySku: string | null;
  onToggleAvailability: (sku: string, nextAvailable: boolean) => void;
  onEditCost: (sku: string, newPrice: number) => void;
  onSubmitProduct: (product: Product) => void;
  onPollSubmission: (submissionId: string) => void;
  onAddProduct: (product: Product) => void;
  onImportCsvText: (csvText: string) => Promise<{ ok: boolean; summary: string }>;
}

export function BrandCatalogView({
  loading,
  products,
  gateCleared,
  gateStatusLabel,
  gateMissing,
  gateBlocking,
  incompleteCount,
  submissionNotice,
  gateError,
  busySku,
  onToggleAvailability,
  onEditCost,
  onSubmitProduct,
  onPollSubmission,
  onAddProduct,
  onImportCsvText,
}: BrandCatalogViewProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [guidanceAcked, setGuidanceAcked] = useState(false);
  const [showCsv, setShowCsv] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvResult, setCsvResult] = useState<string | null>(null);
  const [csvBusy, setCsvBusy] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [costDraft, setCostDraft] = useState('');

  const [form, setForm] = useState({
    name: '',
    sku: '',
    barcode: '',
    exWorksPrice: '',
    ukRetailPrice: '',
    commodityCode: '',
    vatStatus: 'Standard 20%',
    hazmat: false,
    length: '',
    width: '',
    height: '',
    weight: '',
  });

  const liveCount = products.filter((r) => r.latestSubmission?.status === 'live').length;
  const readyCount = products.filter((r) => r.completeness.complete).length;

  const metrics: MetricItem[] = [
    { id: 'skus', label: 'Catalogue SKUs', value: String(products.length) },
    { id: 'ready', label: 'Submission ready', value: String(readyCount) },
    { id: 'live', label: 'Live on channel', value: String(liveCount) },
    {
      id: 'gate',
      label: 'Compliance gate',
      value: gateCleared ? 'Cleared' : gateStatusLabel,
      context: gateCleared ? 'Submissions permitted' : `${gateMissing.length + gateBlocking.length} blocker(s)`,
    },
  ];

  const columns: ConsoleColumn<BrandCatalogRowMeta>[] = [
    {
      key: 'product',
      header: 'Product',
      mobilePrimary: true,
      render: ({ product: p }) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <ProductThumb product={p} size={40} className="rounded" />
          <div className="min-w-0">
            <div className="font-medium text-zinc-950 truncate">{p.name}</div>
            <div className="text-[11px] font-mono text-zinc-500">
              {p.commodityCode || 'No commodity code'} · {p.vatStatus}
              {p.hazmat ? ' · Hazmat' : ''}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'sku',
      header: 'SKU / ASIN',
      render: ({ product: p, identifier, latestSubmission }) => {
        const state = deriveAsinState(identifier, Boolean(latestSubmission));
        return (
          <div data-testid={`catalog-asin-${p.sku}`} className="text-[12px]">
            <div className="font-mono text-zinc-950">{p.sku}</div>
            <div className="font-mono text-[11px] text-zinc-500">{p.barcode || 'No barcode'}</div>
            <div className="text-[11px] text-zinc-600 mt-0.5">
              {identifier ? (
                <span className="font-mono">
                  {identifier.asin} · {identifier.source === 'brand_declared' ? 'brand' : 'channel'}
                  {identifier.simulated ? ' (sim)' : ''}
                </span>
              ) : (
                <span>{ASIN_STATE_LABELS[state]}</span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'exWorks',
      header: 'Ex-Works',
      align: 'right',
      render: ({ product: p }) => `£${p.exWorksPrice.toFixed(2)}`,
    },
    {
      key: 'msrp',
      header: 'UK MSRP',
      align: 'right',
      hideOnMobile: true,
      render: ({ product: p }) => `£${p.ukRetailPrice.toFixed(2)}`,
    },
    {
      key: 'dims',
      header: 'Case / Dims',
      hideOnMobile: true,
      render: ({ product: p }) => (
        <span className="text-[12px] text-zinc-600 font-mono">
          {p.unitsPerCase ?? '—'} u/cs · {p.length}×{p.width}×{p.height}cm · {p.weight}kg
        </span>
      ),
    },
    {
      key: 'availability',
      header: 'Availability',
      render: ({ product: p, isAvailable }) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleAvailability(p.sku, !isAvailable);
          }}
          aria-pressed={!isAvailable}
          className={`px-2 py-0.5 rounded border text-[11px] font-medium ${
            isAvailable
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {isAvailable ? 'In Stock' : 'OOS'}
        </button>
      ),
    },
    {
      key: 'submission',
      header: 'Submission',
      render: ({ latestSubmission, completeness }) => {
        if (!latestSubmission) {
          return (
            <InlineStatus
              label={completeness.complete ? 'Ready to submit' : 'Incomplete'}
              tone={completeness.complete ? 'neutral' : 'warning'}
            />
          );
        }
        const tone =
          latestSubmission.status === 'live'
            ? 'success'
            : latestSubmission.status === 'rejected'
              ? 'danger'
              : 'info';
        return (
          <InlineStatus
            label={`${SUBMISSION_STATUS_LABELS[latestSubmission.status]}${latestSubmission.simulated ? ' (sim)' : ''}`}
            tone={tone}
          />
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: ({ product: p, latestSubmission, completeness }) => {
        const canPoll =
          latestSubmission &&
          latestSubmission.status !== 'live' &&
          latestSubmission.status !== 'rejected';
        return (
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEditingProduct(p);
                setCostDraft(String(p.exWorksPrice));
              }}
              className="text-[12px] font-medium text-zinc-700 hover:text-zinc-950 underline"
            >
              Edit cost
            </button>
            {canPoll && latestSubmission ? (
              <button
                type="button"
                disabled={busySku === latestSubmission.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onPollSubmission(latestSubmission.id);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-zinc-300 bg-white text-[12px] font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-40"
              >
                <RefreshCw className="w-3 h-3" aria-hidden="true" />
                {busySku === latestSubmission.id ? 'Checking…' : 'Check result'}
              </button>
            ) : (
              <button
                type="button"
                disabled={!gateCleared || !completeness.complete || busySku === p.sku}
                onClick={(e) => {
                  e.stopPropagation();
                  onSubmitProduct(p);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#C2410C] text-white text-[12px] font-medium hover:bg-[#9A3412] disabled:opacity-40"
              >
                <Send className="w-3 h-3" aria-hidden="true" />
                {busySku === p.sku ? 'Submitting…' : latestSubmission ? 'Resubmit' : 'Submit'}
              </button>
            )}
          </div>
        );
      },
    },
  ];

  async function handleCsvCommit() {
    if (!csvText.trim()) return;
    setCsvBusy(true);
    const res = await onImportCsvText(csvText);
    setCsvBusy(false);
    setCsvResult(res.summary);
    if (res.ok) setCsvText('');
  }

  function handleSaveNewProduct() {
    if (!form.name.trim() || !form.sku.trim()) return;
    onAddProduct({
      id: `prd-${Date.now()}`,
      name: form.name.trim(),
      sku: form.sku.trim(),
      barcode: form.barcode.trim(),
      image: '',
      exWorksPrice: parseFloat(form.exWorksPrice) || 0,
      ukRetailPrice: parseFloat(form.ukRetailPrice) || 0,
      commodityCode: form.commodityCode.trim(),
      vatStatus: form.vatStatus,
      hazmat: form.hazmat,
      length: parseFloat(form.length) || 0,
      width: parseFloat(form.width) || 0,
      height: parseFloat(form.height) || 0,
      weight: parseFloat(form.weight) || 0,
    });
    setShowAdd(false);
    setGuidanceAcked(false);
    setForm({
      name: '',
      sku: '',
      barcode: '',
      exWorksPrice: '',
      ukRetailPrice: '',
      commodityCode: '',
      vatStatus: 'Standard 20%',
      hazmat: false,
      length: '',
      width: '',
      height: '',
      weight: '',
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Product Catalog"
        description="Wholesale pricing schema, UK compliance metadata, availability toggles, and canonical retail-channel submissions."
        actions={
          <>
            <button
              type="button"
              disabled={!gateCleared}
              onClick={() => setShowCsv((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-zinc-300 bg-white text-[12px] font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-40"
            >
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
              CSV Import
            </button>
            <button
              type="button"
              disabled={!gateCleared}
              onClick={() => {
                setShowAdd(true);
                setGuidanceAcked(false);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#C2410C] text-white text-[12px] font-medium hover:bg-[#9A3412] disabled:opacity-40"
            >
              {gateCleared ? <Plus className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              {gateCleared ? 'Add Product' : 'Catalog Locked'}
            </button>
          </>
        }
      />

      <MetricStrip items={metrics} columns={4} loading={loading} />

      {!gateCleared && (
        <NoticeBanner
          tone="warning"
          title={`Catalog Sync Blocked — Compliance Gate ${gateStatusLabel}`}
          message={
            <div className="space-y-1">
              <p>
                Retail-channel product submissions stay locked until all required compliance documents
                and legal agreements are approved.
              </p>
              <div className="text-[11px] font-mono">
                {gateMissing.map((m) => `Missing: ${m.replace(/_/g, ' ')}`).join(' · ')}
                {gateBlocking.map((b) => `Pending: ${b.type.replace(/_/g, ' ')} (${b.status})`).join(' · ')}
              </div>
            </div>
          }
        />
      )}

      {gateError && <NoticeBanner tone="danger" title="Submission blocked" message={gateError} />}
      {submissionNotice && <NoticeBanner tone="info" title="Submission status" message={submissionNotice} />}
      {gateCleared && incompleteCount > 0 && (
        <NoticeBanner
          tone="warning"
          title={`${incompleteCount} SKU(s) missing required submission metadata`}
          message="Supply commodity code, VAT status, hazmat declaration, and case dimensions before submitting."
        />
      )}

      {showCsv && (
        <SectionCard
          title="Bulk CSV Catalog Import"
          description="Paste CSV rows with header: name,sku,barcode,exWorksPrice,ukRetailPrice,commodityCode,vatStatus,hazmat,length,width,height,weight"
        >
          <div className="space-y-3">
            <textarea
              rows={5}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="name,sku,barcode,exWorksPrice,ukRetailPrice,commodityCode,vatStatus,hazmat,length,width,height,weight"
              className="w-full px-3 py-2 rounded border border-zinc-300 bg-white font-mono text-[12px] text-zinc-950"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={csvBusy || !csvText.trim()}
                onClick={() => void handleCsvCommit()}
                className="px-3.5 py-1.5 rounded bg-[#C2410C] text-white text-[12px] font-medium hover:bg-[#9A3412] disabled:opacity-40"
              >
                {csvBusy ? 'Importing…' : 'Validate & Import CSV'}
              </button>
              <button
                type="button"
                onClick={() => setShowCsv(false)}
                className="px-3 py-1.5 rounded border border-zinc-300 bg-white text-[12px] text-zinc-700"
              >
                Close
              </button>
            </div>
            {csvResult && <p className="text-[12px] text-zinc-700">{csvResult}</p>}
          </div>
        </SectionCard>
      )}

      {loading ? (
        <LoadingRows rows={6} label="Loading product catalog…" />
      ) : (
        <ConsoleTable
          rows={products}
          columns={columns}
          rowKey={(r) => r.product.id}
          testId="product-catalogue"
          emptyTitle="No products in your catalogue yet"
          emptyDescription="Add SKUs manually or via CSV import once your compliance gate is cleared."
        />
      )}

      <SlideOverDrawer
        open={showAdd}
        onClose={() => {
          setShowAdd(false);
          setGuidanceAcked(false);
        }}
        title={guidanceAcked ? 'Add New Product' : 'Before You Add a Product'}
      >
        {!guidanceAcked ? (
          <div className="space-y-4 text-[12px] text-zinc-700">
            <div className="rounded border border-zinc-200 bg-zinc-50 p-4 space-y-2">
              <div className="font-semibold text-zinc-950 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-[#C2410C]" aria-hidden="true" />
                Pricing, Packaging & PO Rule Confirmation
              </div>
              <p>
                Ensure Ex-Works pricing leaves sufficient channel Net PPM margin after UK import
                freight and duty, and confirm barcodes/commodity codes match carton labels to avoid
                PO acknowledgement penalties.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setGuidanceAcked(true)}
              className="w-full px-4 py-2 rounded bg-[#C2410C] text-white text-[12px] font-medium hover:bg-[#9A3412]"
            >
              I Understand — Continue to Add Product
            </button>
          </div>
        ) : (
          <div className="space-y-3 text-[12px]">
            <label className="block space-y-1">
              <span className="text-zinc-600">Product Name</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded border border-zinc-300 bg-white text-zinc-950"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-zinc-600">SKU</span>
                <input
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded border border-zinc-300 bg-white font-mono text-zinc-950"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-zinc-600">Barcode</span>
                <input
                  value={form.barcode}
                  onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded border border-zinc-300 bg-white font-mono text-zinc-950"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-zinc-600">Ex-Works (£)</span>
                <input
                  type="number"
                  value={form.exWorksPrice}
                  onChange={(e) => setForm({ ...form, exWorksPrice: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded border border-zinc-300 bg-white tabular-nums text-zinc-950"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-zinc-600">UK MSRP (£)</span>
                <input
                  type="number"
                  value={form.ukRetailPrice}
                  onChange={(e) => setForm({ ...form, ukRetailPrice: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded border border-zinc-300 bg-white tabular-nums text-zinc-950"
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-zinc-600">Commodity Code</span>
                <input
                  value={form.commodityCode}
                  onChange={(e) => setForm({ ...form, commodityCode: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded border border-zinc-300 bg-white font-mono text-zinc-950"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-zinc-600">VAT Status</span>
                <select
                  value={form.vatStatus}
                  onChange={(e) => setForm({ ...form, vatStatus: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded border border-zinc-300 bg-white text-zinc-950"
                >
                  <option value="Standard 20%">Standard 20%</option>
                  <option value="Zero-rated">Zero-rated</option>
                  <option value="Exempt">Exempt</option>
                </select>
              </label>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  ['length', 'L (cm)'],
                  ['width', 'W (cm)'],
                  ['height', 'H (cm)'],
                  ['weight', 'Wt (kg)'],
                ] as const
              ).map(([fieldKey, label]) => (
                <label key={fieldKey} className="block space-y-1">
                  <span className="text-zinc-600">{label}</span>
                  <input
                    type="number"
                    value={form[fieldKey]}
                    onChange={(e) => setForm({ ...form, [fieldKey]: e.target.value })}
                    className="w-full px-2 py-1.5 rounded border border-zinc-300 bg-white tabular-nums text-zinc-950"
                  />
                </label>
              ))}
            </div>
            <label className="inline-flex items-center gap-2 text-zinc-700">
              <input
                type="checkbox"
                checked={form.hazmat}
                onChange={(e) => setForm({ ...form, hazmat: e.target.checked })}
              />
              <Flame className="w-3.5 h-3.5 text-amber-700" aria-hidden="true" />
              Contains hazardous materials
            </label>
            <button
              type="button"
              disabled={!form.name.trim() || !form.sku.trim()}
              onClick={handleSaveNewProduct}
              className="w-full px-4 py-2 rounded bg-[#C2410C] text-white text-[12px] font-medium hover:bg-[#9A3412] disabled:opacity-40"
            >
              Save Product to Catalogue
            </button>
          </div>
        )}
      </SlideOverDrawer>

      <SlideOverDrawer
        open={Boolean(editingProduct)}
        onClose={() => setEditingProduct(null)}
        title={editingProduct ? `Edit Ex-Works Cost — ${editingProduct.sku}` : 'Edit Cost'}
        subtitle={editingProduct?.name}
      >
        {editingProduct && (
          <div className="space-y-4 text-[12px]">
            <label className="block space-y-1">
              <span className="text-zinc-600">New Ex-Works Cost (£)</span>
              <input
                type="number"
                step="0.01"
                value={costDraft}
                onChange={(e) => setCostDraft(e.target.value)}
                className="w-full px-3 py-2 rounded border border-zinc-300 bg-white tabular-nums text-zinc-950"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const val = parseFloat(costDraft);
                  if (!Number.isNaN(val) && val > 0) {
                    onEditCost(editingProduct.sku, val);
                    setEditingProduct(null);
                  }
                }}
                className="px-4 py-2 rounded bg-[#C2410C] text-white font-medium hover:bg-[#9A3412]"
              >
                Update Cost
              </button>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="px-4 py-2 rounded border border-zinc-300 bg-white text-zinc-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
}
