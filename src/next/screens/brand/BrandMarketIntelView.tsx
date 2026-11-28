import { useState } from 'react';
import { Check, Info, Pencil, Save, ScanSearch, TrendingUp, X } from 'lucide-react';
import {
  ConsoleTable,
  InlineStatus,
  MetricStrip,
  PageHeader,
  type ConsoleColumn,
} from '@/next/components/ConsolePrimitives';
import {
  ConsoleTabs,
  NoticeBanner,
  SectionCard,
  formatGbp,
} from '@/next/components/ConsoleCharts';
import {
  COMMERCIAL_MODELS,
  type CommercialModel,
} from '@/config/commercialModel';
import {
  estimateAmazonSales,
  modelBornToRunOpportunity,
  salesDataProviderModes,
} from '@/lib/intelligence/salesEstimator';
import {
  APPROVED_CATEGORIES,
  type ListingRecommendation,
  type Product,
  type ProductListingAnalysis,
} from '@/types';

export interface CompetitorPositionRow {
  id: string;
  brand: string;
  positionLabel: string;
}

export interface ProductPerformanceRow {
  product: Product;
  analysis: ProductListingAnalysis;
}

export interface BrandMarketIntelViewProps {
  brandName: string;
  brandCategory: string;
  commercialModel: CommercialModel;
  totalCategoryEstMonthlyGbp: number;
  trackedBrandsTotal: number;
  categoryBrandsCount: number;
  competitors: CompetitorPositionRow[];
  productPerformance: ProductPerformanceRow[];
  selectedSku: string;
  onSelectSku: (sku: string) => void;
  selectedAnalysis: ProductListingAnalysis | null;
  busyRecommendationId: string | null;
  actionNotice: string | null;
  actionError: string | null;
  onReviewRecommendation: (
    rec: ListingRecommendation,
    decision: 'approved' | 'edited' | 'rejected',
    editedCopy?: string
  ) => void;
}

type IntelTab = 'market' | 'analyzer' | 'estimator';

export function BrandMarketIntelView({
  brandName,
  brandCategory,
  commercialModel,
  totalCategoryEstMonthlyGbp,
  trackedBrandsTotal,
  categoryBrandsCount,
  competitors,
  productPerformance,
  selectedSku,
  onSelectSku,
  selectedAnalysis,
  busyRecommendationId,
  actionNotice,
  actionError,
  onReviewRecommendation,
}: BrandMarketIntelViewProps) {
  const [tab, setTab] = useState<IntelTab>('market');
  const [showAllCompetitors, setShowAllCompetitors] = useState(false);
  const [marketDetail, setMarketDetail] = useState<'all' | 'competitors' | 'products' | 'insights'>(
    'all'
  );

  // Listing Analyzer inline editor
  const [editingRecId, setEditingRecId] = useState<string | null>(null);
  const [editCopy, setEditCopy] = useState('');

  // Sales Estimator inputs
  const [estCategory, setEstCategory] = useState(brandCategory || APPROVED_CATEGORIES[0]);
  const [estPrice, setEstPrice] = useState('24.99');
  const [estCompetitors, setEstCompetitors] = useState('12');
  const [estReviews, setEstReviews] = useState('0');
  const [estPackSize, setEstPackSize] = useState('1');
  const [estMaturity, setEstMaturity] = useState('2');
  const [showBornToRun, setShowBornToRun] = useState(false);

  const visibleCompetitors = showAllCompetitors ? competitors : competitors.slice(0, 9);

  const estimate = estimateAmazonSales({
    category: estCategory,
    priceGbp: Number(estPrice) || 0,
    competitorCount: Number(estCompetitors) || 0,
    reviewCount: Number(estReviews) || 0,
    packSize: Number(estPackSize) || 1,
    listingMaturity: Number(estMaturity) || 3,
  });

  const bornToRun = showBornToRun
    ? modelBornToRunOpportunity({
        category: estCategory,
        priceGbp: Number(estPrice) || 0,
        competitorCount: Number(estCompetitors) || 0,
        reviewCount: Number(estReviews) || 0,
        packSize: Number(estPackSize) || 1,
        listingMaturity: Number(estMaturity) || 3,
        currentlyOnAmazon: false,
        model: commercialModel,
      })
    : null;

  const providerModes = salesDataProviderModes();

  const perfColumns: ConsoleColumn<ProductPerformanceRow>[] = [
    {
      key: 'sku',
      header: 'Product',
      mobilePrimary: true,
      render: (r) => (
        <div>
          <div className="font-medium text-ink-950">{r.product.name}</div>
          <div className="text-[11px] font-mono text-faint">
            {r.product.sku} · {r.analysis.estimates.monthlyUnitsLow}–
            {r.analysis.estimates.monthlyUnitsHigh} est. units/mo
          </div>
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Retail Price',
      align: 'right',
      render: (r) => formatGbp(r.analysis.estimates.priceGbp, 2),
    },
    {
      key: 'revenue',
      header: 'Est. Monthly Revenue',
      align: 'right',
      render: (r) => formatGbp(r.analysis.estimates.monthlyRevenueMidGbp),
    },
    {
      key: 'demand',
      header: 'Demand',
      render: (r) => (
        <InlineStatus
          label={r.analysis.estimates.demandSignal}
          tone={
            r.analysis.estimates.demandSignal === 'high'
              ? 'success'
              : r.analysis.estimates.demandSignal === 'medium'
                ? 'warning'
                : 'neutral'
          }
        />
      ),
    },
    {
      key: 'health',
      header: 'Listing Health',
      align: 'right',
      render: (r) => (
        <span className="font-mono text-[12px]">
          {r.analysis.healthLevel} ({r.analysis.healthScore}/100)
        </span>
      ),
    },
    {
      key: 'action',
      header: '',
      align: 'right',
      render: (r) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectSku(r.product.sku);
            setTab('analyzer');
          }}
          className="px-2.5 py-1 rounded border border-hairline-strong bg-surface-raised text-[12px] font-medium text-ink-900 hover:bg-surface"
        >
          Analyse
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6" data-testid="brand-market-intel">
      <PageHeader
        title="Market Intelligence"
        description="Qualitative category positioning, deterministic listing diagnostics, and simulated UK retail-channel sales modelling."
        meta={
          <>
            <span className="font-medium text-ink-800">
              {brandName} · {brandCategory}
            </span>
            <span className="font-mono tabular-nums">
              {trackedBrandsTotal} modelled brands ({categoryBrandsCount} in category)
            </span>
          </>
        }
      />

      <NoticeBanner
        tone="info"
        title="Planning estimates only — no live marketplace data"
        message="All category sizes, demand signals, and revenue ranges below are deterministic estimates from Mercenta's planning dataset. External competitors are described qualitatively and internal partner scoring is never shown on brand surfaces."
      />

      <ConsoleTabs
        tabs={[
          { id: 'market', label: 'Your UK Market' },
          { id: 'analyzer', label: 'Listing Analyzer', count: productPerformance.length },
          { id: 'estimator', label: 'Sales Estimator' },
        ]}
        value={tab}
        onChange={setTab}
        ariaLabel="Market intelligence tools"
      />

      {tab === 'market' && (
        <div className="space-y-6">
          <MetricStrip
            columns={4}
            items={[
              {
                id: 'cat-size',
                label: 'Est. Category Size',
                value: `${formatGbp(Math.round(totalCategoryEstMonthlyGbp / 1000))}k/mo`,
                context: `UK ${brandCategory} planning estimate`,
                onClick: () => setMarketDetail('insights'),
                active: marketDetail === 'insights',
              },
              {
                id: 'cat-growth',
                label: 'Category Growth (Est.)',
                value: '+12%',
                context: 'Modelled YoY benchmark',
                onClick: () => setMarketDetail('insights'),
              },
              {
                id: 'brands-tracked',
                label: 'Comparable Brands',
                value: String(categoryBrandsCount),
                context: `Tracked in ${brandCategory}`,
                onClick: () => {
                  setMarketDetail('competitors');
                  setShowAllCompetitors(true);
                },
                active: marketDetail === 'competitors',
              },
              {
                id: 'products-analysed',
                label: 'Your SKUs Analysed',
                value: String(productPerformance.length),
                context: 'Listing Analyzer coverage',
                onClick: () => setMarketDetail('products'),
                active: marketDetail === 'products',
              },
            ]}
          />

          <div className="flex flex-wrap items-center gap-1.5">
            {(['all', 'competitors', 'products', 'insights'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setMarketDetail(d)}
                className={`px-2.5 py-1 rounded text-[12px] font-medium border ${
                  marketDetail === d
                    ? 'border-ink-950 bg-ink-950 text-on-dark'
                    : 'border-hairline bg-surface-raised text-secondary hover:bg-surface'
                }`}
              >
                {d === 'all'
                  ? 'Show all sections'
                  : d === 'competitors'
                    ? 'Competitors'
                    : d === 'products'
                      ? 'Product Performance'
                      : 'Market Insights'}
              </button>
            ))}
          </div>

          {(marketDetail === 'all' || marketDetail === 'competitors') && (
            <SectionCard
              title={`Brands in ${brandCategory}`}
              description="Qualitative positioning only — external brands are described without numeric internal scores."
              actions={
                competitors.length > 9 ? (
                  <button
                    type="button"
                    onClick={() => setShowAllCompetitors((v) => !v)}
                    className="text-[12px] font-medium text-[var(--mr-accent)] hover:underline"
                  >
                    {showAllCompetitors ? 'Show fewer' : `Show all ${competitors.length}`}
                  </button>
                ) : undefined
              }
            >
              {competitors.length === 0 ? (
                <p className="text-[12px] text-faint">
                  No comparable brands tracked in {brandCategory} yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {visibleCompetitors.map((c) => (
                    <div
                      key={c.id}
                      className="rounded border border-hairline bg-surface/60 px-3.5 py-2.5"
                    >
                      <div className="text-[14px] font-medium text-ink-950">{c.brand}</div>
                      <div className="text-[12px] text-ink-600 mt-0.5">{c.positionLabel}</div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          )}

          {(marketDetail === 'all' || marketDetail === 'products') && (
            <SectionCard
              title="Catalogue Performance Estimates"
              description="Deterministic estimates using the same engine as Listing Analyzer."
            >
              <ConsoleTable
                rows={productPerformance}
                columns={perfColumns}
                rowKey={(r) => r.product.sku}
                onRowClick={(r) => {
                  onSelectSku(r.product.sku);
                  setTab('analyzer');
                }}
                emptyTitle="No catalogue products yet"
                emptyDescription="Add SKUs in Product Catalog to see deterministic demand and health estimates."
              />
            </SectionCard>
          )}

          {(marketDetail === 'all' || marketDetail === 'insights') && (
            <SectionCard title="Market Insights">
              <div className="space-y-2 text-[14px] text-secondary leading-relaxed">
                <p>
                  Your brand is aligned to <span className="font-medium text-ink-950">{brandCategory}</span>{' '}
                  in the UK market — one of {APPROVED_CATEGORIES.length} approved categories.
                </p>
                <p>
                  Mercenta tracks <span className="font-medium text-ink-950">{trackedBrandsTotal}</span>{' '}
                  modelled brands overall, including{' '}
                  <span className="font-medium text-ink-950">{categoryBrandsCount}</span> in{' '}
                  {brandCategory}.
                </p>
              </div>
            </SectionCard>
          )}
        </div>
      )}

      {tab === 'analyzer' && (
        <div className="space-y-6" data-testid="listing-analyzer">
          {actionNotice && <NoticeBanner tone="success" message={actionNotice} />}
          {actionError && <NoticeBanner tone="danger" message={actionError} />}

          {productPerformance.length === 0 ? (
            <SectionCard title="Listing Analyzer">
              <p className="text-[14px] text-ink-600">
                Add products to your catalogue to inspect listing dimensions and Mercenta suggestions.
              </p>
            </SectionCard>
          ) : (
            <>
              <SectionCard
                title="Listing Health & Dimensions"
                description="Select any catalogue SKU to review deterministic listing diagnostics."
              >
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <label className="block space-y-1 min-w-[260px] flex-1 max-w-md">
                    <span className="text-[12px] text-ink-600">Catalogue Product</span>
                    <select
                      value={selectedSku}
                      onChange={(e) => onSelectSku(e.target.value)}
                      className="w-full px-3 py-2 rounded border border-hairline-strong bg-surface-raised text-[14px] text-ink-950"
                    >
                      {productPerformance.map(({ product }) => (
                        <option key={product.sku} value={product.sku}>
                          {product.name} ({product.sku})
                        </option>
                      ))}
                    </select>
                  </label>
                  {selectedAnalysis && (
                    <div className="flex items-center gap-3">
                      <ScanSearch className="w-4 h-4 text-[var(--mr-accent)]" aria-hidden="true" />
                      <span className="text-[14px] font-medium text-ink-950">
                        Health: {selectedAnalysis.healthScore}/100 ({selectedAnalysis.healthLevel})
                      </span>
                    </div>
                  )}
                </div>

                {selectedAnalysis && (
                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedAnalysis.dimensions.map((d) => (
                      <div key={d.key} className="rounded border border-hairline p-3 space-y-1.5">
                        <div className="flex items-center justify-between text-[12px]">
                          <span className="font-medium text-ink-950">{d.label}</span>
                          <span className="font-mono font-medium text-ink-950">{d.score}/100</span>
                        </div>
                        <div className="h-1.5 w-full rounded bg-tint overflow-hidden">
                          <div
                            className={`h-full ${
                              d.score >= 70
                                ? 'bg-emerald-600'
                                : d.score >= 45
                                  ? 'bg-amber-600'
                                  : 'bg-red-600'
                            }`}
                            style={{ width: `${Math.max(2, d.score)}%` }}
                          />
                        </div>
                        <p className="text-[12px] text-ink-600">{d.note}</p>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              {selectedAnalysis && (
                <SectionCard
                  title="Estimated Market Position"
                  description={selectedAnalysis.simulationLabel}
                >
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px]">
                    {[
                      [
                        'Est. Units / Month',
                        `${selectedAnalysis.estimates.monthlyUnitsLow}–${selectedAnalysis.estimates.monthlyUnitsHigh}`,
                      ],
                      ['Est. Revenue / Month', formatGbp(selectedAnalysis.estimates.monthlyRevenueMidGbp)],
                      ['Est. Revenue / Year', formatGbp(selectedAnalysis.estimates.annualRevenueMidGbp)],
                      ['Retail Price', formatGbp(selectedAnalysis.estimates.priceGbp, 2)],
                      ['Est. BSR Band', selectedAnalysis.estimates.bsrBand],
                      ['Velocity / Month', String(selectedAnalysis.estimates.velocityPerMonth)],
                      ['Demand Signal', selectedAnalysis.estimates.demandSignal],
                      ['Category Position', selectedAnalysis.estimates.categoryPosition],
                    ].map(([k, v]) => (
                      <div key={k} className="rounded border border-hairline bg-surface/70 p-2.5">
                        <div className="text-[11px] uppercase tracking-[0.05em] text-faint">{k}</div>
                        <div className="mt-1 font-mono font-medium text-ink-950">{v}</div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {selectedAnalysis && (
                <SectionCard
                  title="Suggested Improvements"
                  description="Review, approve, edit, or reject each recommendation. Decisions are one-shot and audited."
                >
                  {selectedAnalysis.recommendations.length === 0 ? (
                    <p className="text-[14px] text-ink-600">No suggestions for this listing right now.</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedAnalysis.recommendations.map((rec) => {
                        const isEditing = editingRecId === rec.id;
                        const busy = busyRecommendationId === rec.id;
                        return (
                          <div key={rec.id} className="rounded border border-hairline p-4 space-y-2">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <div className="text-[14px] font-semibold text-ink-950">
                                  {rec.title}
                                </div>
                                <p className="text-[12px] text-ink-600 mt-0.5">{rec.detail}</p>
                                <p className="text-[11px] font-mono text-faint mt-0.5">
                                  Impact: {rec.impact}
                                </p>
                              </div>
                              <InlineStatus
                                label={
                                  rec.status === 'suggested'
                                    ? 'Suggested by Mercenta'
                                    : rec.status === 'approved'
                                      ? 'Approved by you'
                                      : rec.status === 'edited'
                                        ? 'Edited by you'
                                        : 'Rejected by you'
                                }
                                tone={
                                  rec.status === 'approved'
                                    ? 'success'
                                    : rec.status === 'edited'
                                      ? 'warning'
                                      : rec.status === 'rejected'
                                        ? 'danger'
                                        : 'info'
                                }
                              />
                            </div>

                            {rec.suggestedCopy && (
                              <div className="rounded bg-surface border border-hairline px-3 py-2 text-[12px] text-ink-800">
                                <span className="font-mono uppercase text-[11px] text-faint mr-1.5">
                                  Suggestion:
                                </span>
                                {rec.suggestedCopy}
                              </div>
                            )}
                            {rec.editedCopy && (
                              <div className="rounded bg-amber-50/70 border border-state-warning/20 px-3 py-2 text-[12px] text-ink-900">
                                <span className="font-mono uppercase text-[11px] text-state-warning mr-1.5">
                                  Your copy:
                                </span>
                                {rec.editedCopy}
                              </div>
                            )}

                            {rec.status === 'suggested' && !isEditing && (
                              <div className="flex flex-wrap gap-2 pt-1">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => onReviewRecommendation(rec, 'approved')}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-[var(--mr-accent)] text-on-dark text-[12px] font-medium hover:bg-[var(--mr-accent-600)] disabled:opacity-40"
                                >
                                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => {
                                    setEditingRecId(rec.id);
                                    setEditCopy(rec.suggestedCopy ?? '');
                                  }}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-hairline-strong bg-surface-raised text-[12px] font-medium text-ink-900 hover:bg-surface disabled:opacity-40"
                                >
                                  <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => onReviewRecommendation(rec, 'rejected')}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-hairline-strong bg-surface-raised text-[12px] font-medium text-state-danger hover:bg-state-danger/10 disabled:opacity-40"
                                >
                                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                                  Reject
                                </button>
                              </div>
                            )}

                            {rec.status === 'suggested' && isEditing && (
                              <div className="space-y-2 pt-1">
                                <textarea
                                  rows={3}
                                  value={editCopy}
                                  onChange={(e) => setEditCopy(e.target.value)}
                                  className="w-full px-3 py-2 rounded border border-hairline-strong bg-surface-raised text-[12px] text-ink-950"
                                />
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => {
                                      onReviewRecommendation(rec, 'edited', editCopy);
                                      setEditingRecId(null);
                                    }}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-[var(--mr-accent)] text-on-dark text-[12px] font-medium hover:bg-[var(--mr-accent-600)]"
                                  >
                                    <Save className="w-3.5 h-3.5" aria-hidden="true" />
                                    Confirm Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingRecId(null)}
                                    className="px-3 py-1.5 rounded border border-hairline-strong bg-surface-raised text-[12px] text-secondary"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </SectionCard>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'estimator' && (
        <SectionCard
          title="Retail-Channel Sales Estimator"
          description={`Enter known product inputs to model an estimated monthly sales band and Mercenta economics under your commercial model (${COMMERCIAL_MODELS[commercialModel].label}).`}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[12px] mb-5">
            <label className="space-y-1">
              <span className="text-ink-600">Category</span>
              <select
                value={estCategory}
                onChange={(e) => setEstCategory(e.target.value)}
                className="w-full px-2.5 py-2 rounded border border-hairline-strong bg-surface-raised text-ink-950"
              >
                {APPROVED_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-ink-600">Retail Price (£)</span>
              <input
                value={estPrice}
                onChange={(e) => setEstPrice(e.target.value)}
                className="w-full px-2.5 py-2 rounded border border-hairline-strong bg-surface-raised font-mono text-ink-950"
              />
            </label>
            <label className="space-y-1">
              <span className="text-ink-600">Pack Size (units/sale)</span>
              <input
                value={estPackSize}
                onChange={(e) => setEstPackSize(e.target.value)}
                className="w-full px-2.5 py-2 rounded border border-hairline-strong bg-surface-raised font-mono text-ink-950"
              />
            </label>
            <label className="space-y-1">
              <span className="text-ink-600">Competing Listings</span>
              <input
                value={estCompetitors}
                onChange={(e) => setEstCompetitors(e.target.value)}
                className="w-full px-2.5 py-2 rounded border border-hairline-strong bg-surface-raised font-mono text-ink-950"
              />
            </label>
            <label className="space-y-1">
              <span className="text-ink-600">Existing Reviews</span>
              <input
                value={estReviews}
                onChange={(e) => setEstReviews(e.target.value)}
                className="w-full px-2.5 py-2 rounded border border-hairline-strong bg-surface-raised font-mono text-ink-950"
              />
            </label>
            <label className="space-y-1">
              <span className="text-ink-600">Listing Maturity</span>
              <select
                value={estMaturity}
                onChange={(e) => setEstMaturity(e.target.value)}
                className="w-full px-2.5 py-2 rounded border border-hairline-strong bg-surface-raised text-ink-950"
              >
                <option value="1">1 — Brand new</option>
                <option value="2">2 — Early</option>
                <option value="3">3 — Established</option>
                <option value="4">4 — Strong</option>
                <option value="5">5 — Category leader</option>
              </select>
            </label>
          </div>

          <div className="rounded border border-hairline bg-surface/70 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[14px] font-semibold text-ink-950">Estimated Monthly Sales</span>
              <InlineStatus
                label={`${estimate.confidence} confidence`}
                tone={
                  estimate.confidence === 'high'
                    ? 'success'
                    : estimate.confidence === 'medium'
                      ? 'info'
                      : 'warning'
                }
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[12px] font-mono tabular-nums">
              <div className="rounded border border-hairline bg-surface-raised p-3">
                <div className="text-[11px] uppercase font-sans text-faint">Orders / Month</div>
                <div className="mt-1 text-[16px] font-semibold text-ink-950">
                  {estimate.estimatedMonthlyOrders.low} – {estimate.estimatedMonthlyOrders.high}
                </div>
              </div>
              <div className="rounded border border-hairline bg-surface-raised p-3">
                <div className="text-[11px] uppercase font-sans text-faint">Units / Month</div>
                <div className="mt-1 text-[16px] font-semibold text-ink-950">
                  {estimate.estimatedMonthlyUnits.low} – {estimate.estimatedMonthlyUnits.high}
                </div>
              </div>
              <div className="rounded border border-hairline bg-surface-raised p-3">
                <div className="text-[11px] uppercase font-sans text-faint">Revenue / Month</div>
                <div className="mt-1 text-[16px] font-semibold text-state-success">
                  {formatGbp(estimate.estimatedMonthlyRevenueGbp.low)} –{' '}
                  {formatGbp(estimate.estimatedMonthlyRevenueGbp.high)}
                </div>
              </div>
            </div>

            <p className="text-[12px] text-ink-600">
              Midpoint {formatGbp(estimate.estimatedMonthlyRevenueGbp.mid)}/month ·{' '}
              {formatGbp(estimate.estimatedAnnualRevenueGbp.mid)}/year. {estimate.confidenceReason}
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-hairline space-y-2">
            <button
              type="button"
              onClick={() => setShowBornToRun((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-hairline-strong bg-surface-raised text-[12px] font-medium text-ink-900 hover:bg-surface"
            >
              <TrendingUp className="w-3.5 h-3.5 text-[var(--mr-accent)]" aria-hidden="true" />
              {showBornToRun ? 'Hide' : 'Model'} a new-to-channel launch
            </button>

            {bornToRun && (
              <div className="rounded border border-hairline bg-surface p-3.5 text-[12px] space-y-1.5">
                <div className="font-semibold text-ink-950">Launch Modelling — Simulation Only</div>
                <div className="font-mono text-secondary">
                  New to channel: {bornToRun.newToAmazon ? 'yes' : 'no'} · Projected initial demand{' '}
                  {bornToRun.projectedInitialMonthlyOrders} orders/mo · Suggested first qty{' '}
                  {bornToRun.suggestedLaunchQuantity} units · Launch revenue{' '}
                  {formatGbp(bornToRun.estimatedLaunchRevenueGbp)}
                </div>
                <div className="font-mono text-secondary">{bornToRun.economics.formula}</div>
                <div className="text-state-warning">
                  Programme status: {bornToRun.programmeStatus} — Mercenta does not claim channel
                  approval and submits nothing to Amazon.
                </div>
              </div>
            )}

            <div className="space-y-1 pt-2 text-[11px] text-faint">
              {estimate.disclaimers.map((d) => (
                <p key={d} className="flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{d}</span>
                </p>
              ))}
              <p>
                Data providers: {providerModes.map((p) => `${p.provider} → ${p.mode}`).join(' · ')} —
                no live marketplace connection claimed.
              </p>
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
