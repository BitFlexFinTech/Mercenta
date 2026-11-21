/**
 * §Brand Intelligence — Brand Partner mode.
 * Shows the brand's own Amazon market intelligence using the same engine.
 */
import { useMemo, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { Card } from '@/components/ui';
import { getProspects } from '@/data/prospectStore';
import { APPROVED_CATEGORIES } from '@/types';
import { analyzeProductListing } from '@/lib/intelligence/listingAnalyzer';
import { Package, ArrowUpRight } from 'lucide-react';
import {
  ContextPanel,
  MetricBand,
  RecordFieldList,
  WorkspaceFrame,
  WorkspaceHeader,
  WorkspaceSection,
  type MetricTileData,
} from '@/components/shared/workspace';

/**
 * §Workstream B (Decision 1, 2026-09-17) — brand-facing category positioning is
 * QUALITATIVE ONLY. Proprietary internal scores, tiers and methodology are never
 * rendered on a brand surface. The qualitative label is derived from the existing
 * public data model (brandMaturity) — no new data, no internal scores leaked.
 */
const QUALITATIVE_POSITION: Record<string, string> = {
  challenger: 'Growing challenger',
  established: 'Established brand',
  mega: 'Leading brand',
  niche: 'Niche brand',
};
function qualitativePosition(p: { brandMaturity?: string }, selfBrand: boolean): string {
  if (selfBrand) return 'Your brand';
  const known = QUALITATIVE_POSITION[p.brandMaturity ?? ''];
  return known ?? 'Comparable brand';
}

export function BrandIntelligence() {
  const { brandProfile, session, products } = useApp();
  const brandName = brandProfile?.businessName ?? (session?.tenantId ?? 'Your Brand');
  const brandCategory = brandProfile?.category ?? 'Home';
  const tenantId = session?.tenantId;

  const catData = useMemo(() => {
    const scored = getProspects().filter((p) => !p.disqualified);
    const sameCat = scored.filter((p) => p.category === brandCategory);
    return { scored, sameCat };
  }, [brandCategory]);

  /** §Functional-completion — per-SKU estimated performance + opportunity,
   *  derived from the SAME deterministic analyzer the Listing Analyzer uses
   *  (no second engine). Products are already tenant-scoped by the session. */
  const productPerformance = useMemo(() => {
    const competitorBrandCount = catData.sameCat.length;
    return products.map((p) => ({
      product: p,
      analysis: analyzeProductListing(p as unknown as Record<string, unknown>, {
        category: brandCategory,
        brandId: tenantId,
        competitorBrandCount,
      }),
    }));
  }, [products, brandCategory, tenantId, catData.sameCat.length]);

  const totalEst = catData.sameCat.reduce((s, p) => s + p.asins.reduce((s2, a) => s2 + (a.estimatedRevenue ?? 0), 0), 0);

  /* §Sprint 2 — metric drill-downs. A brand surface stays QUALITATIVE: the
     tiles open the existing detail (competitor list / product table / insights)
     and never expose an internal score or tier. */
  const [showAllCompetitors, setShowAllCompetitors] = useState(false);
  const [detail, setDetail] = useState<'none' | 'competitors' | 'products' | 'insights'>('none');
  const competitorRows = showAllCompetitors ? catData.sameCat : catData.sameCat.slice(0, 9);

  const metrics: MetricTileData[] = [
    {
      id: 'bi-category-size',
      label: 'Category Size',
      value: `£${(totalEst / 1000).toFixed(0)}k/mo`,
      size: 'hero',
      tone: 'info',
      statusText: 'Estimated',
      context: 'Estimated UK retail revenue across your category',
      domain: 'finance',
      onOpen: () => setDetail('insights'),
      testId: 'bi-metric-category-size',
      valueTestId: 'bi-metric-category-size-value',
    },
    {
      id: 'bi-category-growth',
      label: 'Category Growth',
      value: '+12%',
      tone: 'success',
      statusText: 'Estimated YoY',
      context: 'Planning estimate, not measured marketplace data',
      domain: 'catalogue',
      onOpen: () => setDetail('insights'),
      testId: 'bi-metric-category-growth',
      valueTestId: 'bi-metric-category-growth-value',
    },
    {
      id: 'bi-brands-tracked',
      label: 'Brands Tracked',
      value: String(catData.sameCat.length),
      tone: 'warning',
      statusText: 'In your category',
      context: 'Comparable brands Mercenta currently models in your category',
      domain: 'logistics',
      onOpen: () => { setDetail('competitors'); setShowAllCompetitors(true); },
      testId: 'bi-metric-brands-tracked',
      valueTestId: 'bi-metric-brands-tracked-value',
    },
    {
      id: 'bi-products',
      label: 'Your products analysed',
      value: String(productPerformance.length),
      tone: 'info',
      statusText: 'Deterministic estimates',
      context: 'Catalogue products with an estimated performance range',
      domain: 'compliance',
      onOpen: () => setDetail('products'),
      testId: 'bi-metric-products',
      valueTestId: 'bi-metric-products-value',
    },
  ];

  return (
    <WorkspaceFrame className="space-y-4">
      <WorkspaceHeader
        eyebrow="Brand Portal · Market Intelligence"
        title="Your UK Market"
        description="Market intelligence for your brand in the UK market. Every figure is a planning estimate derived from the same deterministic model as the Listing Analyzer — no live marketplace data and no proprietary internal scoring is shown on a brand surface."
        entity={
          <span className="text-ds-label text-muted">
            {brandName} · {brandCategory}
          </span>
        }
        meta={
          <>
            <span className="font-mono text-ds-label text-muted">
              {catData.scored.length} brands modelled
            </span>
            <span className="font-mono text-ds-label text-muted">
              {catData.sameCat.length} in {brandCategory}
            </span>
            <span className="font-mono text-ds-label text-muted">
              showing {competitorRows.length} competitor{competitorRows.length === 1 ? '' : 's'}
            </span>
          </>
        }
        toolbar={
          <div className="flex flex-wrap items-center gap-1.5">
            {(['none', 'competitors', 'products', 'insights'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDetail(d)}
                data-testid={`bi-detail-${d}`}
                className={
                  detail === d
                    ? 'rounded-ds-md bg-accent-500 px-2.5 py-1 text-ds-label font-medium text-strong'
                    : 'rounded-ds-md bg-tint px-2.5 py-1 text-ds-label font-medium text-muted hover:bg-tint hover:text-strong'
                }
              >
                {d === 'none' ? 'Overview' : d === 'competitors' ? 'Competitors' : d === 'products' ? 'Your products' : 'Insights'}
              </button>
            ))}
          </div>
        }
      />

      <MetricBand items={metrics} columns={4} />

      {/* §BATCH 4 (2026-10-10) — REMOVED: the tenant-scoped relationship graph
          (`BrandRelationshipMap`). It was the same relationship builder as the
          Mercenta Brain, which the owner instructed us to remove completely.
          Its absence is guarded by `scripts/validate-mercenta-brain.mjs`. */}

      {(detail === 'none' || detail === 'competitors') && (
      <WorkspaceSection
        title="Brands in Your Category"
        description="Qualitative positioning only — external brands are described, never scored."
        domain="logistics"
        action={
          catData.sameCat.length > 9 ? (
            <button
              type="button"
              onClick={() => setShowAllCompetitors((v) => !v)}
              data-testid="bi-toggle-competitors"
              className="text-ds-label text-accent-400 hover:text-accent-300"
            >
              {showAllCompetitors ? 'Show fewer' : `Show all ${catData.sameCat.length}`}
            </button>
          ) : undefined
        }
      >
        {catData.sameCat.length === 0 ? <Card className="p-6 text-center"><p className="text-xs text-faint">No competitor data available yet.</p></Card> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {competitorRows.map(p => (
              <Card key={p.id} className="p-3 flex items-center justify-between">
                <div><span className="text-xs font-medium text-strong">{p.brand}</span><div className="text-ds-micro text-muted mt-0.5">{qualitativePosition(p, p.brand === brandName)}</div></div>
              </Card>
            ))}
          </div>
        )}
      </WorkspaceSection>
      )}

      {(detail === 'none' || detail === 'products') && (
      <WorkspaceSection
        title="Your product performance"
        description="Deterministic estimates, never live data."
        domain="catalogue"
      >
        <div data-testid="bi-product-performance">
          <h3 className="text-sm font-semibold text-strong mb-2 flex items-center gap-1.5">
            <Package className="w-4 h-4 text-accent-400" /> Your product performance
            <span className="text-ds-micro text-faint">— deterministic estimates, never live data</span>
          </h3>
          {productPerformance.length === 0 ? (
            <p className="text-xs text-faint">No catalogue products yet — add products to see estimated performance.</p>
          ) : (
            <ul className="divide-y divide-hairline-06 rounded-ds-md border border-hairline bg-surface-raised">
              {productPerformance.map(({ product: p, analysis: a }) => (
                <li key={p.sku} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3.5 py-2.5" data-testid={`bi-sku-${p.sku}`}>
                  <div className="min-w-0 flex-1">
                    <span className="block text-xs font-medium text-strong truncate">{p.name}</span>
                    <span className="block text-ds-micro text-muted font-mono">{p.sku} · est. {a.estimates.monthlyUnitsLow}–{a.estimates.monthlyUnitsHigh} u/mo · £{a.estimates.priceGbp.toFixed(2)}</span>
                  </div>
                  <span className="text-ds-micro uppercase text-faint hidden md:inline">Revenue</span>
                  <span className="text-xs font-mono text-state-success">£{(a.estimates.monthlyRevenueMidGbp / 1000).toFixed(0)}k/mo</span>
                  <span className="text-ds-micro uppercase text-faint hidden md:inline">Demand</span>
                  <span className={a.estimates.demandSignal === 'high' ? 'text-state-success' : a.estimates.demandSignal === 'medium' ? 'text-state-warning' : 'text-muted'}>{a.estimates.demandSignal}</span>
                  <span className="text-ds-micro uppercase text-faint hidden md:inline">Opportunity</span>
                  <span className="text-ds-micro text-accent-400">{a.estimates.opportunityIndicators[0] ?? '—'}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-faint" />
                </li>
              ))}
            </ul>
          )}
          <p className="text-ds-micro text-faint mt-2">
            Estimates derived from the same deterministic model as the Listing Analyzer — planning ranges, not measured marketplace data.
          </p>
        </div>
      </WorkspaceSection>
      )}

      {(detail === 'none' || detail === 'insights') && (
      <WorkspaceSection title="Market Insights" domain="finance">
        <Card className="p-4">
        <h3 className="text-sm font-semibold text-strong mb-2">Market Insights</h3>
        <div className="space-y-2 text-xs text-muted">
          <p>Your brand is in <span className="text-accent-400">{brandCategory}</span> in the UK market, one of {APPROVED_CATEGORIES.length} approved categories.</p>
          <p>We track <span className="text-strong">{catData.scored.length}</span> brands total. Of those, <span className="text-strong">{catData.sameCat.length}</span> are in {brandCategory}.</p>
          <p>This intelligence updates weekly. Use these insights to understand your competitive position and identify growth opportunities.</p>
        </div>
        </Card>
      </WorkspaceSection>
      )}

      <ContextPanel title="How to read this">
        <RecordFieldList
          fields={[
            { label: 'Your brand', value: brandName },
            { label: 'Your category', value: brandCategory },
            { label: 'Comparable brands', value: String(catData.sameCat.length) },
            { label: 'Products analysed', value: String(productPerformance.length) },
            { label: 'Data source', value: 'Deterministic model (no live data)' },
          ]}
        />
        <p className="mt-2 text-ds-label leading-snug text-muted">
          Estimates are planning ranges produced by the same engine as the Listing Analyzer.
          They are not measured marketplace results and this surface never displays Mercenta&apos;s
          internal scoring.
        </p>
      </ContextPanel>
    </WorkspaceFrame>
  );
}