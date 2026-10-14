import { useEffect, useState, useMemo } from 'react';
import { useRecordDeepLink } from '@/lib/runtime/recordDeepLink';
import { useBrands, useProducts, useCatalogSubmissions, useCanonicalStoreVersion } from '@/data/queries';
import { updateProductAvailability, updateProductCost, latestSubmissionForProduct } from '@/data/demoStore';
import { useApp } from '@/context/GlobalStateContext';
import { Button } from '@/components/ui';
import { cn } from '@/utils/cn';
import { DataTable } from '@/components/shared/DataTable';
import type { DataTableColumn } from '@/components/shared/DataTable';
import type { DemoProduct } from '@/data/demoData';
import type { ProductSubmission } from '@/types';
import { evaluateProductCompleteness } from '@/lib/catalog/productCompleteness';
import { SUBMISSION_STATUS_LABELS } from '@/lib/spapi/transform';
import { X, Package, Filter } from 'lucide-react';
import { ImageSetEditor } from '@/components/shared/ImageUploader';
import { APPROVED_CATEGORIES } from '@/types';
import {
  adminOverrideAsin,
  inventoryForProduct,
  listInventoryMovements,
} from '@/lib/inventory/inventoryLifecycle';
import {
  INVENTORY_DERIVATION_BASIS,
  INVENTORY_STATUS_LABELS,
  INVENTORY_UOM_LABELS,
} from '@/lib/inventory/inventoryRecord';
import { ASIN_RULES, ASIN_SOURCE_LABELS } from '@/lib/catalog/asin';
/** §P12 — the channel stock push (`submitInventoryUpdate`) goes through the seam. */
import { pushProductInventoryToChannel } from '@/data/api';
import {
  ContextPanel,
  MetricBand,
  RecordFieldList,
  WorkspaceFrame,
  WorkspaceGrid,
  WorkspaceHeader,
  WorkspaceSection,
  type MetricTileData,
} from '@/components/shared/workspace';

function ProductDetailModal(props: { product: DemoProduct; submission?: ProductSubmission; canMutate: boolean; onClose: () => void }) {
  const { product, submission, canMutate, onClose } = props;
  const brands = useBrands().data?.data ?? [];
  const bn = brands.find(function(b) { return b.id === product.brandId; })?.profile.businessName ?? product.brandId;
  const bc = brands.find(function(b) { return b.id === product.brandId; })?.category ?? '';
  const [tab, setTab] = useState('detail');
  const [av, setAv] = useState(product.isAvailable ?? true);
  const [lt, setLt] = useState(product.leadTimeDays ?? 14);
  const [ep, setEp] = useState(product.exWorksPrice);
  const [sv, setSv] = useState<string | null>(null);
  /**
   * §P8 — the product's inventory + channel identifier (decision 5 / decision
   * 10), read from the canonical owners. The ADMIN OVERRIDE is the attributed
   * correction path; it requires a stated reason and is refused for a
   * brand-pinned actor inside the domain.
   */
  const { actingStaffId } = useApp();
  const canonicalVersion = useCanonicalStoreVersion();
  void canonicalVersion;
  /**
   * A MERCENTA staff actor: no tenant pin, so the domain's brand-actor refusal
   * on the override path does not apply (and the override is attributed).
   */
  const inventoryActor = { staffId: actingStaffId, canMutate };
  const inventoryResult = inventoryForProduct(product.brandId, product.sku, inventoryActor);
  const inventory = inventoryResult.ok ? inventoryResult.value : undefined;
  const ledgerResult = listInventoryMovements(product.brandId, product.sku, inventoryActor);
  const ledger = ledgerResult.ok ? ledgerResult.value : [];
  const [overrideAsin, setOverrideAsin] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [invNotice, setInvNotice] = useState<string | null>(null);
  /**
   * §P12 — the CHANNEL stock push (`submitInventoryUpdate`). §P8 recorded this as
   * P12's declared scope; it is MERCENTA's action (a brand never contacts the
   * channel), and the quantity is derived by the owner from the ledger above —
   * never typed in here.
   */
  const [pushNotice, setPushNotice] = useState<string | null>(null);
  const [pushBusy, setPushBusy] = useState(false);

  async function handlePushStock() {
    if (!canMutate) return;
    setPushBusy(true);
    try {
      const record = await pushProductInventoryToChannel({ productId: product.id });
      setPushNotice(
        record.refusal
          ? record.refusal
          : `Reported ${record.quantity} ${record.unitOfMeasure} to the channel (${record.eaches} eaches)${
              record.simulated ? ' — simulated submission, no live channel call was made' : ''
            }. ${record.submissionId ?? ''}`.trim()
      );
    } finally {
      setPushBusy(false);
    }
  }

  /** §P8 — the attributed admin override of the channel identifier. */
  function handleOverrideAsin() {
    const res = adminOverrideAsin(
      {
        brandId: product.brandId,
        sku: product.sku,
        asin: overrideAsin,
        reason: overrideReason,
      },
      inventoryActor
    );
    setInvNotice(res.ok ? `Identifier recorded: ${res.value.asin}` : res.error);
  }
  // §Phase E5 (G4) — RBAC: catalog MUTATIONS require a full-permission account.
  // The disabled buttons are an affordance; these guards are the enforcement.
  function ha() { if (!canMutate) return; updateProductAvailability(product.sku, av, lt); setSv('Availability updated.'); setTimeout(function() { setSv(null); }, 3000); }
  function hp() { if (!canMutate) return; updateProductCost(product.sku, ep); setSv('Price updated.'); setTimeout(function() { setSv(null); }, 3000); }
  return (
    <div className='fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4'>
      <div className='bg-ink-850 border border-white/[0.08] rounded-ds-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col'>
        <div className='flex items-center justify-between px-5 py-4 border-b border-white/[0.06]'>
          <div className='flex items-center gap-3'><Package className='w-5 h-5 text-brass-400' /><div><h2 className='text-sm font-semibold text-white'>{product.name}</h2><p className='text-ds-micro text-zinc-500 font-mono'>{product.sku} · {product.barcode}</p></div></div>
          <button onClick={onClose} className='text-zinc-400 hover:text-white'><X className='w-4 h-4' /></button>
        </div>
        <div className='flex gap-1 px-5 pt-3 border-b border-white/[0.06]'>
          {['detail', 'images', 'pricing', 'inventory'].map(function(t) { return (
            <button key={t} onClick={function() { setTab(t); }} className={cn('px-3 py-1.5 text-ds-label font-medium rounded-t', tab === t ? 'text-white border-b-2 border-brass-500' : 'text-zinc-500 hover:text-zinc-300')}>{t === 'detail' ? 'Details' : t === 'images' ? 'Images (5)' : t === 'pricing' ? 'Pricing' : 'Inventory'}</button>
          );})}
        </div>
        <div className='flex-1 overflow-y-auto p-5 space-y-4'>
          {/* ── Detail Tab ── */}
          {tab === 'detail' && (
            <div className='grid grid-cols-2 gap-4 text-xs'>
              <div className='space-y-2'>
                <div><span className='text-zinc-500'>Brand</span><p className='text-white font-medium'>{bn}</p></div>
                <div><span className='text-zinc-500'>Category</span><p className='text-white font-medium'>{bc}</p></div>
                <div><span className='text-zinc-500'>Commodity Code</span><p className='text-white font-mono'>{product.commodityCode}</p></div>
                <div><span className='text-zinc-500'>VAT Status</span><p className='text-white'>{product.vatStatus}</p></div>
                <div><span className='text-zinc-500'>Hazmat</span><p className='text-white'>{product.hazmat ? 'Yes' : 'No'}</p></div>
              </div>
              <div className='space-y-2'>
                <div><span className='text-zinc-500'>Unit Price (Ex-Works)</span><p className='text-white font-mono'>GBP {product.exWorksPrice.toFixed(2)}</p></div>
                <div><span className='text-zinc-500'>UK Retail Price</span><p className='text-white font-mono'>GBP {product.ukRetailPrice.toFixed(2)}</p></div>
                <div><span className='text-zinc-500'>Dimensions</span><p className='text-white font-mono'>{product.length} × {product.width} × {product.height} cm</p></div>
                <div><span className='text-zinc-500'>Weight</span><p className='text-white font-mono'>{product.weight} kg</p></div>
                {product.unitsPerCase != null && (
                  <div><span className='text-zinc-500'>Units Per Case</span><p className='text-white font-mono'>{product.unitsPerCase} {product.caseOrderable ? '(orderable)' : ''}</p></div>
                )}
              </div>
              {/* Availability edit section */}
              <div className='col-span-2 border-t border-white/[0.06] pt-3 mt-2'>
                <p className='text-zinc-400 mb-2 font-medium'>Availability</p>
                <div className='flex items-center gap-4'>
                  <label className='flex items-center gap-2 text-zinc-300'>
                    <input type='checkbox' checked={av} onChange={function(e) { setAv(e.target.checked); }}
                      className='rounded-ds-sm border-white/[0.2] bg-ink-900 accent-brass-500' />
                    Available for new POs
                  </label>
                  <div className='flex items-center gap-2'>
                    <span className='text-zinc-500 text-ds-micro'>Lead time:</span>
                    <input type='number' value={lt} min={1} max={90} onChange={function(e) { setLt(parseInt(e.target.value) || 1); }}
                      className='w-16 bg-ink-900 border border-white/[0.08] rounded-ds-sm px-1.5 py-1 text-xs text-white text-center' /> days
                  </div>
                  <Button className='text-ds-micro' data-state="catalog-save-availability" disabled={!canMutate}
                    title={canMutate ? undefined : 'View-only staff cannot change product availability'} onClick={ha}>Save Availability</Button>
                </div>
              </div>
              {/* §Phase E3 — readiness + the resulting submission state. Both are
                  DERIVED (canonical prerequisites + canonical submission store);
                  simulated provenance is stated explicitly, never implied live. */}
              <div className='col-span-2 border-t border-white/[0.06] pt-3 mt-2'>
                <p className='text-zinc-400 mb-2 font-medium'>Catalog readiness &amp; submission</p>
                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <span className='text-zinc-500'>Product information</span>
                    {(() => {
                      const c = evaluateProductCompleteness(product as unknown as Record<string, unknown>);
                      return (
                        <p className={c.complete ? 'text-emerald-400' : 'text-amber-300'}>
                          {c.complete ? 'Complete' : `Missing: ${c.missingLabels.join(', ')}`}
                        </p>
                      );
                    })()}
                  </div>
                  <div>
                    <span className='text-zinc-500'>Submission</span>
                    {submission ? (
                      <p className='text-white'>
                        {SUBMISSION_STATUS_LABELS[submission.status]}
                        {submission.simulated ? ' (simulated)' : ''} · tracking{' '}
                        <span className='font-mono'>{submission.submissionId || '—'}</span>
                        {submission.rejectionReason ? ` — ${submission.rejectionReason}` : ''}
                      </p>
                    ) : (
                      <p className='text-zinc-500'>Not yet submitted</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
{/* ── Images Tab ── */}
          {tab === 'images' && (
            <div>
              <ImageSetEditor
                images={product.productImages ?? []}
                onImagesChange={function() { /* admin view - images shown from catalog */ }}
                editable={false}
              />
            </div>
          )}
          {/* ── Pricing Tab ── */}
          {tab === 'pricing' && (
            <div className='space-y-3 max-w-sm'>
              <div>
                <label className='text-ds-micro text-zinc-500 font-medium block mb-1'>Ex-Works Price (GBP)</label>
                <input type='number' step='0.01' value={ep} onChange={function(e) { setEp(Number(e.target.value)); }}
                  className='w-full bg-ink-900 border border-white/[0.08] rounded-ds-sm px-2.5 py-2 text-sm text-white' />
              </div>
              <div className='text-ds-micro text-zinc-500 space-y-1'>
                <p>UK Retail: <span className='font-mono text-zinc-300'>GBP {product.ukRetailPrice.toFixed(2)}</span></p>
                <p>Implied margin: <span className='font-mono text-zinc-300'>{((product.ukRetailPrice - ep) / product.ukRetailPrice * 100).toFixed(1)}%</span></p>
              </div>
              <Button className='text-xs' data-state="catalog-update-price" disabled={!canMutate}
                title={canMutate ? undefined : 'View-only staff cannot change product pricing'} onClick={hp}>Update Price</Button>
              {sv && <p className='text-ds-micro text-emerald-400'>{sv}</p>}
            </div>
          )}
          {/* ── §P8 Inventory Tab — decision 5 / decision 10 ── */}
          {tab === 'inventory' && (
            <div className='space-y-4' data-testid="catalog-inventory-tab">
              <div className='grid grid-cols-2 gap-3 text-xs'>
                <div>
                  <span className='text-zinc-500 block mb-1'>Position (derived from the ledger)</span>
                  {inventory ? (
                    <div className='space-y-0.5 text-zinc-200'>
                      <p>On hand: <span className='font-mono'>{inventory.onHand}</span> · committed: <span className='font-mono'>{inventory.committed}</span> · inbound: <span className='font-mono'>{inventory.inbound}</span></p>
                      <p>Available: <span className={cn('font-mono', inventory.available < 0 ? 'text-red-300' : 'text-white')}>{inventory.available}</span> · safety stock: <span className='font-mono'>{inventory.safetyStock}</span> · unit: {INVENTORY_UOM_LABELS[inventory.uom]}</p>
                      <p className={inventory.status === 'in_stock' ? 'text-emerald-400' : inventory.status === 'out_of_stock' ? 'text-red-300' : 'text-amber-300'}>{INVENTORY_STATUS_LABELS[inventory.status]}</p>
                    </div>
                  ) : (
                    <p className='text-zinc-500'>No inventory record for this product.</p>
                  )}
                </div>
                <div data-testid="catalog-inventory-identifier">
                  <span className='text-zinc-500 block mb-1'>Channel identifier</span>
                  {inventory?.asin ? (
                    <div className='space-y-0.5 text-zinc-200'>
                      <p className='font-mono'>{inventory.asin}</p>
                      <p className='text-ds-micro text-zinc-500'>
                        {inventory.asinSource ? ASIN_SOURCE_LABELS[inventory.asinSource] : ''}
                        {inventory.asinSimulated ? ' (simulated placeholder)' : ''}
                      </p>
                    </div>
                  ) : (
                    <p className='text-zinc-500'>No identifier recorded yet.</p>
                  )}
                </div>
              </div>
              <p className='text-ds-micro text-zinc-500 leading-relaxed'>{INVENTORY_DERIVATION_BASIS}</p>

              <div className='border-t border-white/[0.06] pt-3 space-y-2'>
                <p className='text-zinc-400 font-medium'>Override the channel identifier</p>
                <div className='flex flex-wrap gap-2'>
                  <input value={overrideAsin} onChange={function(e) { setOverrideAsin(e.target.value); }}
                    placeholder='Identifier (10 alphanumeric)' disabled={!canMutate}
                    className='bg-ink-900 border border-white/[0.08] rounded-ds-sm px-2.5 py-2 text-xs text-white' />
                  <input value={overrideReason} onChange={function(e) { setOverrideReason(e.target.value); }}
                    placeholder='Reason (required)' disabled={!canMutate}
                    className='bg-ink-900 border border-white/[0.08] rounded-ds-sm px-2.5 py-2 text-xs text-white flex-1 min-w-[12rem]' />
                  <Button className='text-xs' data-state="catalog-override-identifier" disabled={!canMutate}
                    title={canMutate ? undefined : 'View-only staff cannot override the identifier'}
                    onClick={handleOverrideAsin}>Record identifier</Button>
                </div>
                {invNotice && <p className='text-ds-micro text-amber-300' data-testid="catalog-inventory-notice">{invNotice}</p>}
                <ul className='text-ds-micro text-zinc-500 space-y-0.5'>
                  {ASIN_RULES.map(function(r) { return <li key={r}>• {r}</li>; })}
                </ul>
              </div>

              <div className='border-t border-white/[0.06] pt-3 space-y-2' data-testid="catalog-inventory-channel-push">
                <p className='text-zinc-400 font-medium'>Push stock to the channel</p>
                <p className='text-ds-micro text-zinc-500 leading-relaxed'>
                  submitInventoryUpdate — Mercenta reports this position to the channel. The quantity
                  is DERIVED from the movement ledger above, never typed in; only Eaches/Cases are
                  pushed, and a case push needs the product's own case pack.
                </p>
                <Button className='text-xs' data-state="catalog-inventory-push" disabled={!canMutate || pushBusy}
                  title={canMutate ? undefined : 'View-only staff cannot push stock to the channel'}
                  onClick={handlePushStock}>Report stock to channel</Button>
                {pushNotice && <p className='text-ds-micro text-amber-300' data-testid="catalog-inventory-push-notice">{pushNotice}</p>}
              </div>

              <div className='border-t border-white/[0.06] pt-3'>
                <p className='text-zinc-400 font-medium mb-1'>Movement ledger ({ledger.length})</p>
                <ul className='max-h-40 overflow-y-auto space-y-0.5 text-ds-micro text-zinc-400' data-testid="catalog-inventory-ledger">
                  {ledger.map(function(m) { return (
                    <li key={m.id} className='flex flex-wrap gap-x-3'>
                      <span className='font-mono'>{m.recordedAt.slice(0, 10)}</span>
                      <span>{m.type}</span>
                      <span className='font-mono'>{m.quantityDelta > 0 ? '+' : ''}{m.quantityDelta}</span>
                      <span className='text-zinc-600'>{m.enteredQuantity} {m.enteredUom} · {m.bucket} · {m.actorId}</span>
                    </li>
                  ); })}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main Catalog Manager ── */
export function CatalogManagerAdmin() {
  // §Phase E5 (G4) — the EXISTING staff permission tier gates catalog mutations.
  const { canCurrentUserMutate } = useApp();
  const brandsQuery = useBrands();
  const productsQuery = useProducts();
  const brands = useMemo(() => brandsQuery.data?.data ?? [], [brandsQuery.data]);
  const products = useMemo(() => productsQuery.data?.data ?? [], [productsQuery.data]);
  /** §Phase E3 — the CANONICAL submission store (all tenants; admin scope). */
  const submissionsQuery = useCatalogSubmissions();
  const submissions = useMemo(
    function() { return submissionsQuery.data?.data ?? []; },
    [submissionsQuery.data]
  );
  const [selectedProduct, setSelectedProduct] = useState<DemoProduct | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  /* §Sprint 2 — the metric band's drill-downs narrow the SAME list (one source). */
  const [focus, setFocus] = useState<'all' | 'not_submitted' | 'inactive'>('all');

  /**
   * §BATCH 7 (Part 4.1a) — DEEP LINK. `/admin/catalog?submission=<id>` opens the
   * PRODUCT of that submission in the detail modal, so a rejected-submission
   * notice lands on the record it names rather than on the catalogue. (Before
   * this change the notice did NOTHING when clicked.) The product is resolved
   * through the submission's OWN canonical links — `productId` first, then the
   * (brand, sku) pair — never by re-deriving which product a submission means.
   */
  const deepLinkSubmission = useRecordDeepLink('submission');
  useEffect(() => {
    if (!deepLinkSubmission) return;
    const sub = submissions.find(function(s) { return s.id === deepLinkSubmission; });
    if (!sub) return;
    const product =
      products.find(function(p) { return p.id === sub.productId; }) ??
      products.find(function(p) { return p.brandId === sub.brandId && p.sku === sub.sku; });
    if (!product) return;
    setSelectedProduct(product);
  }, [deepLinkSubmission, submissions, products]);

  /**
   * §Phase E5 (G9) — ONE canonical latest-submission derivation.
   *
   * This previously re-implemented the "latest per (brand, sku)" reduce locally,
   * duplicating logic the E3 domain already owns. It now reads the canonical
   * `demoStore.latestSubmissionForProduct` (the same function the E3 lifecycle
   * uses), so the admin projection can never drift from the domain. The memo is
   * keyed on the canonical query result, so React re-renders still propagate.
   */
  const latestSubmission = useMemo(
    function() {
      void submissions; // reactivity anchor: the canonical submission query result
      return function(brandId: string, sku: string): ProductSubmission | undefined {
        return latestSubmissionForProduct(brandId, sku);
      };
    },
    [submissions]
  );

  const brandName = (id: string) => brands.find(function(b) { return b.id === id; })?.profile.businessName ?? id;
  const brandCategory = (id: string) => brands.find(function(b) { return b.id === id; })?.category ?? '';

  // Build a map of brandId → category for quick lookup
  const brandCategoryMap = useMemo(function() {
    const m = new Map<string, string>();
    for (const b of brands) m.set(b.id, b.category);
    return m;
  }, [brands]);

  // Filter products by brand category
  const filteredProducts = useMemo(function() {
    let rows = products;
    if (categoryFilter !== 'all') {
      rows = rows.filter(function(p) {
        return brandCategoryMap.get(p.brandId) === categoryFilter;
      });
    }
    if (focus === 'not_submitted') {
      rows = rows.filter(function(p) { return !latestSubmissionForProduct(p.brandId, p.sku); });
    }
    if (focus === 'inactive') {
      rows = rows.filter(function(p) { return p.isAvailable === false; });
    }
    return rows;
  }, [products, categoryFilter, brandCategoryMap, focus]);

  const notSubmitted = products.filter(function(p) { return !latestSubmissionForProduct(p.brandId, p.sku); });
  const inactive = products.filter(function(p) { return p.isAvailable === false; });
  const catalogueCategoryCount = new Set(products.map(function(p) { return brandCategoryMap.get(p.brandId) ?? 'Uncategorized'; })).size;
  const metrics: MetricTileData[] = [
    {
      id: 'catalog-products',
      label: 'Products',
      value: String(products.length),
      size: 'hero',
      tone: 'info',
      statusText: `${filteredProducts.length} in view`,
      context: 'Catalogue records across every brand tenant',
      domain: 'catalogue',
      onOpen: function() { setFocus('all'); setCategoryFilter('all'); },
      testId: 'catalog-metric-products',
      valueTestId: 'catalog-metric-products-value',
    },
    {
      id: 'catalog-brands',
      label: 'Owning brands',
      value: String(brands.length),
      tone: 'info',
      statusText: `${catalogueCategoryCount} categories`,
      context: 'Brands with catalogue records',
      domain: 'compliance',
      onOpen: function() { setFocus('all'); setCategoryFilter('all'); },
      testId: 'catalog-metric-brands',
      valueTestId: 'catalog-metric-brands-value',
    },
    {
      id: 'catalog-not-submitted',
      label: 'Not submitted',
      value: String(notSubmitted.length),
      tone: notSubmitted.length > 0 ? 'warning' : 'success',
      statusText: notSubmitted.length > 0 ? 'Awaiting channel submission' : 'All submitted',
      context: 'Products with no catalogue submission record',
      domain: 'logistics',
      onOpen: function() { setFocus('not_submitted'); },
      testId: 'catalog-metric-not-submitted',
      valueTestId: 'catalog-metric-not-submitted-value',
    },
    {
      id: 'catalog-inactive',
      label: 'Inactive',
      value: String(inactive.length),
      tone: inactive.length > 0 ? 'danger' : 'success',
      statusText: inactive.length > 0 ? 'Not sellable' : 'All active',
      context: 'Products marked unavailable',
      domain: 'finance',
      onOpen: function() { setFocus('inactive'); },
      testId: 'catalog-metric-inactive',
      valueTestId: 'catalog-metric-inactive-value',
    },
  ];

  // Count products per category
  const categoryCounts = useMemo(function() {
    const counts = new Map<string, number>();
    for (const p of products) {
      const cat = brandCategoryMap.get(p.brandId) ?? 'Uncategorized';
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
    return counts;
  }, [products, brandCategoryMap]);

  const columns: DataTableColumn<DemoProduct>[] = [
    { key: 'name', header: 'Product', value: function(p: DemoProduct) { return p.name; } },
    { key: 'sku', header: 'SKU', value: function(p: DemoProduct) { return p.sku; } },
    { key: 'brand', header: 'Brand', value: function(p: DemoProduct) { return brandName(p.brandId); } },
    { key: 'category', header: 'Category', value: function(p: DemoProduct) { return brandCategory(p.brandId); } },
    { key: 'price', header: 'Price', value: function(p: DemoProduct) { return 'GBP ' + p.exWorksPrice.toFixed(2); } },
    { key: 'status', header: 'Status', value: function(p: DemoProduct) { return p.isAvailable !== false ? 'Active' : 'Inactive'; } },
    // §Phase E3 — the product's resulting catalog state (derived, tenant-keyed).
    { key: 'submission', header: 'Submission', value: function(p: DemoProduct) {
        const sub = latestSubmission(p.brandId, p.sku);
        if (!sub) return 'Not submitted';
        return SUBMISSION_STATUS_LABELS[sub.status] + (sub.simulated ? ' (sim)' : '');
      } },
  ];

  return (
    <WorkspaceFrame className="space-y-4">
      <WorkspaceHeader
        eyebrow="Admin Hub · Catalogue"
        title="Global Catalog Manager"
        description="Every catalogue record, its owning brand tenant and its channel-submission state. Product readiness is derived from the same canonical submission records the brand sees."
        meta={
          <>
            <span className="font-mono text-ds-label text-zinc-500">
              {filteredProducts.length} of {products.length} products
            </span>
            <span className="font-mono text-ds-label text-zinc-500">{brands.length} brands</span>
            <span className="font-mono text-ds-label text-zinc-500">focus: {focus.replace(/_/g, ' ')}</span>
          </>
        }
        toolbar={
          <div className='flex items-center gap-1.5 flex-wrap'>
            <Filter className='w-3.5 h-3.5 text-zinc-500 mr-1' />
            <button onClick={function() { setCategoryFilter('all'); }}
              data-testid="catalog-cat-all"
              className={cn('px-2.5 py-1 rounded-ds-md text-ds-label font-medium transition-colors',
                categoryFilter === 'all' ? 'bg-brass-500 text-white' : 'bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08]'
              )}>
              All ({products.length})
            </button>
            {APPROVED_CATEGORIES.map(function(cat) {
              const count = categoryCounts.get(cat) ?? 0;
              if (count === 0) return null;
              return (
                <button key={cat} onClick={function() { setCategoryFilter(cat); }}
                  data-testid={`catalog-cat-${cat}`}
                  className={cn('px-2.5 py-1 rounded-ds-md text-ds-label font-medium transition-colors',
                    categoryFilter === cat ? 'bg-brass-500 text-white' : 'bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08]'
                  )}>
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        }
      />

      <MetricBand items={metrics} columns={4} />

      <WorkspaceGrid
        rail={
          <>
            <ContextPanel title="Catalogue readiness">
              <RecordFieldList
                fields={[
                  { label: 'Products', value: String(products.length) },
                  { label: 'In view', value: String(filteredProducts.length) },
                  { label: 'Not submitted', value: String(notSubmitted.length) },
                  { label: 'Inactive', value: String(inactive.length) },
                  { label: 'Category filter', value: categoryFilter === 'all' ? 'All approved categories' : categoryFilter },
                ]}
              />
              <p className="mt-2 text-ds-label leading-snug text-zinc-400">
                A catalogue item becomes PO-eligible only once its compliance documents are
                approved — the compliance gate is enforced in the domain, not on this screen.
              </p>
            </ContextPanel>
            <ContextPanel title="Channel submission">
              <p className="text-ds-label leading-snug text-zinc-400">
                Submission state is the canonical record the brand also sees; entries marked
                &ldquo;(sim)&rdquo; are deterministic simulation and no channel API was contacted.
              </p>
            </ContextPanel>
          </>
        }
      >
        <WorkspaceSection
          title="Catalogue records"
          description="Owning brand, price, availability and the latest channel submission."
          domain="catalogue"
        >
          <DataTable
            rows={filteredProducts}
            columns={columns}
            searchText={function(p) { return p.name + ' ' + p.sku + ' ' + brandName(p.brandId) + ' ' + brandCategory(p.brandId); }}
            onRowClick={function(p) { setSelectedProduct(p); }}
            emptyMessage={categoryFilter !== 'all' ? 'No products in this category.' : 'No products match the current filters.'}
            /* §Wave 3 Part 5 — the table owns the loading region, so the
               catalogue cannot declare itself empty while the product and brand
               queries are still resolving (browser-measured defect). */
            loading={productsQuery.isPending || brandsQuery.isPending || submissionsQuery.isPending}
            dataTable="global-catalogue"
            caption="Global catalogue"
          />
        </WorkspaceSection>
      </WorkspaceGrid>

      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          submission={latestSubmission(selectedProduct.brandId, selectedProduct.sku)}
          canMutate={canCurrentUserMutate}
          onClose={function() { setSelectedProduct(null); }}
        />
      )}
    </WorkspaceFrame>
  );
}