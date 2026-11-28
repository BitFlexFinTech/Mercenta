import { useState } from 'react';
import {
  ConsoleTable,
  EmptyStateBlock,
  ErrorStateBlock,
  InlineStatus,
  LoadingRows,
  MetricStrip,
  SlideOverDrawer,
  type ConsoleColumn,
  type MetricItem,
} from '@/next/components/ConsolePrimitives';
import { ConsolePageHeader } from '@/next/components/ConsolePageHeader';
import { ConsoleTabs, NoticeBanner, SectionCard, formatGbp } from '@/next/components/ConsoleCharts';

export type CatalogFocus = 'all' | 'not_submitted' | 'inactive';

export interface AdminCatalogProductRow {
  id: string;
  brandId: string;
  brandName: string;
  category: string;
  name: string;
  sku: string;
  barcode: string;
  commodityCode: string;
  vatStatus: string;
  hazmat: boolean;
  exWorksPrice: number;
  ukRetailPrice: number;
  length: number;
  width: number;
  height: number;
  weight: number;
  unitsPerCase?: number;
  caseOrderable?: boolean;
  isAvailable: boolean;
  leadTimeDays: number;
  images: string[];
  completenessComplete: boolean;
  completenessMissing: string[];
  submissionLabel: string;
  submissionTone: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  submissionSimulated?: boolean;
  submissionTrackingId?: string;
  submissionRejectionReason?: string;
  inventory?: {
    onHand: number;
    committed: number;
    inbound: number;
    available: number;
    safetyStock: number;
    uomLabel: string;
    statusLabel: string;
    statusTone: 'success' | 'warning' | 'danger';
    asin?: string;
    asinSourceLabel?: string;
    asinSimulated?: boolean;
    ledger: {
      id: string;
      recordedAt: string;
      type: string;
      quantityDelta: number;
      enteredQuantity: number;
      enteredUom: string;
      bucket: string;
      actorId: string;
    }[];
  };
}

export interface AdminCatalogViewProps {
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  canMutate: boolean;
  totalProducts: number;
  totalBrands: number;
  categoryCount: number;
  notSubmittedCount: number;
  inactiveCount: number;
  categories: { id: string; label: string; count: number }[];
  categoryFilter: string;
  onCategoryFilterChange: (cat: string) => void;
  focus: CatalogFocus;
  onFocusChange: (focus: CatalogFocus) => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  rows: AdminCatalogProductRow[];
  selectedProduct: AdminCatalogProductRow | null;
  onSelectProduct: (row: AdminCatalogProductRow | null) => void;
  inventoryDerivationBasis: string;
  asinRules: string[];
  onSaveAvailability: (sku: string, available: boolean, leadTimeDays: number) => void;
  onUpdatePrice: (sku: string, exWorksPrice: number) => void;
  onOverrideAsin: (brandId: string, sku: string, asin: string, reason: string) => string;
  onPushStock: (productId: string) => Promise<string>;
}

export function AdminCatalogView({
  loading,
  error,
  onRetry,
  canMutate,
  totalProducts,
  totalBrands,
  categoryCount,
  notSubmittedCount,
  inactiveCount,
  categories,
  categoryFilter,
  onCategoryFilterChange,
  focus,
  onFocusChange,
  searchQuery,
  onSearchQueryChange,
  rows,
  selectedProduct,
  onSelectProduct,
  inventoryDerivationBasis,
  asinRules,
  onSaveAvailability,
  onUpdatePrice,
  onOverrideAsin,
  onPushStock,
}: AdminCatalogViewProps) {
  const [drawerTab, setDrawerTab] = useState<'detail' | 'images' | 'pricing' | 'inventory'>('detail');
  const [avDraft, setAvDraft] = useState(true);
  const [leadDraft, setLeadDraft] = useState(14);
  const [priceDraft, setPriceDraft] = useState(0);
  const [overrideAsin, setOverrideAsin] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [pushBusy, setPushBusy] = useState(false);

  function openProduct(row: AdminCatalogProductRow) {
    setAvDraft(row.isAvailable);
    setLeadDraft(row.leadTimeDays);
    setPriceDraft(row.exWorksPrice);
    setOverrideAsin('');
    setOverrideReason('');
    setActionNotice(null);
    setDrawerTab('detail');
    onSelectProduct(row);
  }

  const metrics: MetricItem[] = [
    {
      id: 'catalog-products',
      label: 'Products',
      value: String(totalProducts),
      context: `${rows.length} in view`,
      active: focus === 'all' && categoryFilter === 'all',
      onClick: () => {
        onFocusChange('all');
        onCategoryFilterChange('all');
      },
      testId: 'catalog-metric-products',
      valueTestId: 'catalog-metric-products-value',
    },
    {
      id: 'catalog-brands',
      label: 'Owning brands',
      value: String(totalBrands),
      context: `${categoryCount} categories`,
      onClick: () => {
        onFocusChange('all');
        onCategoryFilterChange('all');
      },
      testId: 'catalog-metric-brands',
      valueTestId: 'catalog-metric-brands-value',
    },
    {
      id: 'catalog-not-submitted',
      label: 'Not submitted',
      value: String(notSubmittedCount),
      context: notSubmittedCount > 0 ? 'Awaiting channel submission' : 'All submitted',
      active: focus === 'not_submitted',
      onClick: () => onFocusChange(focus === 'not_submitted' ? 'all' : 'not_submitted'),
      testId: 'catalog-metric-not-submitted',
      valueTestId: 'catalog-metric-not-submitted-value',
    },
    {
      id: 'catalog-inactive',
      label: 'Inactive',
      value: String(inactiveCount),
      context: inactiveCount > 0 ? 'Not sellable' : 'All active',
      active: focus === 'inactive',
      onClick: () => onFocusChange(focus === 'inactive' ? 'all' : 'inactive'),
      testId: 'catalog-metric-inactive',
      valueTestId: 'catalog-metric-inactive-value',
    },
  ];

  const columns: ConsoleColumn<AdminCatalogProductRow>[] = [
    {
      key: 'name',
      header: 'Product',
      mobilePrimary: true,
      render: (r) => (
        <div className="min-w-0">
          <div className="font-medium text-ink-950 truncate">{r.name}</div>
          <div className="text-[12px] font-mono text-faint">{r.sku}</div>
        </div>
      ),
    },
    {
      key: 'brand',
      header: 'Brand',
      render: (r) => <span className="text-ink-800">{r.brandName}</span>,
    },
    {
      key: 'category',
      header: 'Category',
      hideOnMobile: true,
      render: (r) => <span className="text-ink-600 text-[12px]">{r.category}</span>,
    },
    {
      key: 'price',
      header: 'Ex-Works',
      align: 'right',
      render: (r) => <span className="font-mono text-ink-900">{formatGbp(r.exWorksPrice, 2)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <InlineStatus
          label={r.isAvailable ? 'Active' : 'Inactive'}
          tone={r.isAvailable ? 'success' : 'danger'}
        />
      ),
    },
    {
      key: 'submission',
      header: 'Submission',
      render: (r) => (
        <InlineStatus
          label={`${r.submissionLabel}${r.submissionSimulated ? ' (sim)' : ''}`}
          tone={r.submissionTone}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        title="Global Catalog Manager"
        description="Every catalogue record, its owning brand tenant, and its channel-submission state. Product readiness is derived from canonical submission and compliance records."
        meta={
          <>
            <span className="font-mono">{rows.length} of {totalProducts} products</span>
            <span className="font-mono">{totalBrands} brands</span>
            <span>Focus: {focus.replace(/_/g, ' ')}</span>
          </>
        }
      />

      {error && <ErrorStateBlock message={error} onRetry={onRetry} />}

      <MetricStrip items={metrics} loading={loading} columns={4} />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px] gap-6">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onCategoryFilterChange(cat.id)}
                  data-testid={`catalog-cat-${cat.id}`}
                  className={`px-2.5 py-1 rounded text-[12px] font-medium transition-colors border ${
                    categoryFilter === cat.id
                      ? 'bg-ink-950 text-on-dark border-ink-950'
                      : 'bg-surface-raised text-ink-600 border-hairline hover:border-hairline-strong hover:text-ink-950'
                  }`}
                >
                  {cat.label} ({cat.count})
                </button>
              ))}
            </div>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder="Search SKU, product, brand…"
              aria-label="Search catalog products"
              className="w-64 rounded border border-hairline-strong bg-surface-raised px-3 py-1.5 text-[13px] text-ink-900 placeholder:text-quiet focus:border-ink-900 focus:outline-none"
            />
          </div>

          {loading ? (
            <LoadingRows rows={6} label="Loading catalogue records…" />
          ) : rows.length === 0 ? (
            <EmptyStateBlock
              title="No matching products"
              description="No products match the current category or focus filter."
              actionLabel="Reset filters"
              onAction={() => {
                onCategoryFilterChange('all');
                onFocusChange('all');
                onSearchQueryChange('');
              }}
            />
          ) : (
            <ConsoleTable
              rows={rows}
              columns={columns}
              rowKey={(r) => r.id}
              selectedKey={selectedProduct?.id ?? null}
              onRowClick={openProduct}
              testId="global-catalogue"
            />
          )}
        </div>

        <aside className="space-y-4">
          <SectionCard title="Catalogue readiness">
            <dl className="space-y-2 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-faint">Products</dt>
                <dd className="font-mono text-ink-950">{totalProducts}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-faint">In view</dt>
                <dd className="font-mono text-ink-950">{rows.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-faint">Not submitted</dt>
                <dd className="font-mono text-ink-950">{notSubmittedCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-faint">Inactive</dt>
                <dd className="font-mono text-ink-950">{inactiveCount}</dd>
              </div>
            </dl>
            <p className="mt-3 pt-3 border-t border-hairline text-[12px] text-ink-600 leading-relaxed">
              A catalogue item becomes PO-eligible only once its compliance documents are approved.
              Submissions marked (sim) use deterministic local simulation.
            </p>
          </SectionCard>
        </aside>
      </div>

      <SlideOverDrawer
        open={Boolean(selectedProduct)}
        onClose={() => onSelectProduct(null)}
        title={selectedProduct?.name ?? 'Product detail'}
        subtitle={
          selectedProduct
            ? `${selectedProduct.sku} · ${selectedProduct.barcode} · ${selectedProduct.brandName}`
            : undefined
        }
      >
        {selectedProduct && (
          <div className="space-y-5">
            <ConsoleTabs
              tabs={[
                { id: 'detail', label: 'Details' },
                { id: 'images', label: 'Images', count: selectedProduct.images.length },
                { id: 'pricing', label: 'Pricing' },
                { id: 'inventory', label: 'Inventory' },
              ]}
              value={drawerTab}
              onChange={setDrawerTab}
              ariaLabel="Product detail sections"
            />

            {actionNotice && <NoticeBanner tone="info" message={actionNotice} />}

            {drawerTab === 'detail' && (
              <div className="space-y-5">
                <dl className="grid grid-cols-2 gap-3 text-[13px]">
                  <div>
                    <dt className="text-[11px] uppercase tracking-[0.06em] text-faint">Brand</dt>
                    <dd className="mt-0.5 font-medium text-ink-950">{selectedProduct.brandName}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-[0.06em] text-faint">Category</dt>
                    <dd className="mt-0.5 text-ink-900">{selectedProduct.category}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-[0.06em] text-faint">Commodity code</dt>
                    <dd className="mt-0.5 font-mono text-ink-900">{selectedProduct.commodityCode}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-[0.06em] text-faint">VAT / Hazmat</dt>
                    <dd className="mt-0.5 text-ink-900">
                      {selectedProduct.vatStatus} · {selectedProduct.hazmat ? 'Hazmat' : 'Non-hazmat'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-[0.06em] text-faint">Dimensions</dt>
                    <dd className="mt-0.5 font-mono text-ink-900">
                      {selectedProduct.length} × {selectedProduct.width} × {selectedProduct.height} cm
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-[0.06em] text-faint">Weight</dt>
                    <dd className="mt-0.5 font-mono text-ink-900">
                      {selectedProduct.weight} kg
                      {selectedProduct.unitsPerCase != null &&
                        ` · ${selectedProduct.unitsPerCase}/case${selectedProduct.caseOrderable ? ' (orderable)' : ''}`}
                    </dd>
                  </div>
                </dl>

                <div className="border-t border-hairline pt-4 space-y-3">
                  <h3 className="text-[13px] font-semibold text-ink-950">Availability</h3>
                  <div className="flex flex-wrap items-center gap-4 text-[13px]">
                    <label className="flex items-center gap-2 text-ink-900">
                      <input
                        type="checkbox"
                        checked={avDraft}
                        disabled={!canMutate}
                        onChange={(e) => setAvDraft(e.target.checked)}
                        className="rounded border-hairline-strong"
                      />
                      Available for new POs
                    </label>
                    <label className="flex items-center gap-2 text-secondary">
                      <span>Lead time</span>
                      <input
                        type="number"
                        min={1}
                        max={90}
                        disabled={!canMutate}
                        value={leadDraft}
                        onChange={(e) => setLeadDraft(Number(e.target.value) || 1)}
                        className="w-16 rounded border border-hairline-strong px-2 py-1 text-center font-mono text-ink-900"
                      />
                      <span>days</span>
                    </label>
                    <button
                      type="button"
                      disabled={!canMutate}
                      onClick={() => {
                        onSaveAvailability(selectedProduct.sku, avDraft, leadDraft);
                        setActionNotice('Availability updated.');
                      }}
                      className="px-3 py-1.5 rounded bg-ink-950 text-on-dark text-[12px] font-medium hover:bg-ink-800 disabled:opacity-40"
                    >
                      Save availability
                    </button>
                  </div>
                </div>

                <div className="border-t border-hairline pt-4 space-y-2 text-[13px]">
                  <h3 className="text-[13px] font-semibold text-ink-950">Readiness & submission</h3>
                  <div>
                    <span className="text-faint">Product data: </span>
                    <InlineStatus
                      label={
                        selectedProduct.completenessComplete
                          ? 'Complete'
                          : `Missing: ${selectedProduct.completenessMissing.join(', ')}`
                      }
                      tone={selectedProduct.completenessComplete ? 'success' : 'warning'}
                    />
                  </div>
                  <div>
                    <span className="text-faint">Channel submission: </span>
                    <InlineStatus
                      label={`${selectedProduct.submissionLabel}${selectedProduct.submissionSimulated ? ' (simulated)' : ''}`}
                      tone={selectedProduct.submissionTone}
                    />
                    {selectedProduct.submissionTrackingId && (
                      <span className="ml-2 font-mono text-[12px] text-faint">
                        ref {selectedProduct.submissionTrackingId}
                      </span>
                    )}
                    {selectedProduct.submissionRejectionReason && (
                      <p className="mt-1 text-[12px] text-state-danger">
                        {selectedProduct.submissionRejectionReason}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {drawerTab === 'images' && (
              <div className="space-y-3">
                {selectedProduct.images.length === 0 ? (
                  <p className="text-[13px] text-faint">No product images uploaded yet.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {selectedProduct.images.map((url, idx) => (
                      <div key={`${url}-${idx}`} className="border border-hairline rounded p-2 bg-surface">
                        <img
                          src={url}
                          alt={`${selectedProduct.name} image ${idx + 1}`}
                          className="w-full h-36 object-contain rounded bg-surface-raised"
                        />
                        <div className="mt-1 text-[11px] font-mono text-faint truncate">
                          Slot {idx + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {drawerTab === 'pricing' && (
              <div className="space-y-4 max-w-sm">
                <label className="block space-y-1 text-[13px]">
                  <span className="font-medium text-ink-800">Ex-Works Price (GBP)</span>
                  <input
                    type="number"
                    step="0.01"
                    disabled={!canMutate}
                    value={priceDraft}
                    onChange={(e) => setPriceDraft(Number(e.target.value))}
                    className="w-full rounded border border-hairline-strong px-3 py-1.5 font-mono text-ink-950"
                  />
                </label>
                <dl className="space-y-1 text-[13px]">
                  <div className="flex justify-between">
                    <dt className="text-faint">UK Retail Price</dt>
                    <dd className="font-mono text-ink-950">
                      {formatGbp(selectedProduct.ukRetailPrice, 2)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-faint">Implied margin</dt>
                    <dd className="font-mono text-ink-950">
                      {selectedProduct.ukRetailPrice > 0
                        ? `${(((selectedProduct.ukRetailPrice - priceDraft) / selectedProduct.ukRetailPrice) * 100).toFixed(1)}%`
                        : '—'}
                    </dd>
                  </div>
                </dl>
                <button
                  type="button"
                  disabled={!canMutate}
                  onClick={() => {
                    onUpdatePrice(selectedProduct.sku, priceDraft);
                    setActionNotice('Ex-Works unit price updated.');
                  }}
                  className="px-3.5 py-1.5 rounded bg-ink-950 text-on-dark text-[12px] font-medium hover:bg-ink-800 disabled:opacity-40"
                >
                  Update price
                </button>
              </div>
            )}

            {drawerTab === 'inventory' && (
              <div className="space-y-5 text-[13px]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="border border-hairline rounded p-3 space-y-1">
                    <div className="text-[11px] uppercase tracking-[0.06em] text-faint">
                      Ledger position
                    </div>
                    {selectedProduct.inventory ? (
                      <>
                        <div className="font-mono text-ink-900">
                          On hand {selectedProduct.inventory.onHand} · Committed{' '}
                          {selectedProduct.inventory.committed} · Inbound{' '}
                          {selectedProduct.inventory.inbound}
                        </div>
                        <div className="font-mono text-ink-900">
                          Available {selectedProduct.inventory.available} · Safety{' '}
                          {selectedProduct.inventory.safetyStock} ({selectedProduct.inventory.uomLabel})
                        </div>
                        <InlineStatus
                          label={selectedProduct.inventory.statusLabel}
                          tone={selectedProduct.inventory.statusTone}
                        />
                      </>
                    ) : (
                      <p className="text-faint">No inventory record for this product.</p>
                    )}
                  </div>
                  <div className="border border-hairline rounded p-3 space-y-1">
                    <div className="text-[11px] uppercase tracking-[0.06em] text-faint">
                      Channel identifier
                    </div>
                    {selectedProduct.inventory?.asin ? (
                      <>
                        <div className="font-mono font-semibold text-ink-950">
                          {selectedProduct.inventory.asin}
                        </div>
                        <div className="text-[12px] text-faint">
                          {selectedProduct.inventory.asinSourceLabel ?? ''}
                          {selectedProduct.inventory.asinSimulated ? ' (simulated placeholder)' : ''}
                        </div>
                      </>
                    ) : (
                      <p className="text-faint">No identifier recorded yet.</p>
                    )}
                  </div>
                </div>

                <p className="text-[12px] text-ink-600 leading-relaxed">{inventoryDerivationBasis}</p>

                <div className="border-t border-hairline pt-4 space-y-2">
                  <h4 className="font-semibold text-ink-950">Override channel identifier</h4>
                  <div className="flex flex-wrap gap-2">
                    <input
                      value={overrideAsin}
                      disabled={!canMutate}
                      onChange={(e) => setOverrideAsin(e.target.value)}
                      placeholder="10-char ASIN"
                      className="w-36 rounded border border-hairline-strong px-2.5 py-1.5 text-[12px] font-mono"
                    />
                    <input
                      value={overrideReason}
                      disabled={!canMutate}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="Reason (required)"
                      className="flex-1 min-w-[10rem] rounded border border-hairline-strong px-2.5 py-1.5 text-[12px]"
                    />
                    <button
                      type="button"
                      disabled={!canMutate}
                      onClick={() => {
                        const msg = onOverrideAsin(
                          selectedProduct.brandId,
                          selectedProduct.sku,
                          overrideAsin,
                          overrideReason
                        );
                        setActionNotice(msg);
                      }}
                      className="px-3 py-1.5 rounded bg-ink-950 text-on-dark text-[12px] font-medium hover:bg-ink-800 disabled:opacity-40"
                    >
                      Record identifier
                    </button>
                  </div>
                  <ul className="text-[11px] text-faint space-y-0.5">
                    {asinRules.map((rule) => (
                      <li key={rule}>• {rule}</li>
                    ))}
                  </ul>
                </div>

                <div className="border-t border-hairline pt-4 space-y-2">
                  <h4 className="font-semibold text-ink-950">Push stock to channel</h4>
                  <p className="text-[12px] text-ink-600">
                    Reports the ledger-derived position to the channel (`submitInventoryUpdate`).
                  </p>
                  <button
                    type="button"
                    disabled={!canMutate || pushBusy}
                    onClick={async () => {
                      setPushBusy(true);
                      try {
                        const msg = await onPushStock(selectedProduct.id);
                        setActionNotice(msg);
                      } finally {
                        setPushBusy(false);
                      }
                    }}
                    className="px-3 py-1.5 rounded border border-hairline-strong bg-surface-raised text-[12px] font-medium text-ink-900 hover:bg-surface disabled:opacity-40"
                  >
                    {pushBusy ? 'Submitting…' : 'Report stock to channel'}
                  </button>
                </div>

                <div className="border-t border-hairline pt-4 space-y-2">
                  <h4 className="font-semibold text-ink-950">
                    Movement ledger ({selectedProduct.inventory?.ledger.length ?? 0})
                  </h4>
                  {(selectedProduct.inventory?.ledger.length ?? 0) === 0 ? (
                    <p className="text-[12px] text-faint">No ledger movements recorded.</p>
                  ) : (
                    <ul className="max-h-40 overflow-y-auto divide-y divide-hairline-06 text-[12px]">
                      {selectedProduct.inventory?.ledger.map((m) => (
                        <li key={m.id} className="py-1.5 flex flex-wrap gap-x-3 text-secondary">
                          <span className="font-mono text-faint">{m.recordedAt.slice(0, 10)}</span>
                          <span>{m.type}</span>
                          <span className="font-mono font-medium">
                            {m.quantityDelta > 0 ? '+' : ''}
                            {m.quantityDelta}
                          </span>
                          <span className="text-faint">
                            {m.enteredQuantity} {m.enteredUom} · {m.bucket} · {m.actorId}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
}
