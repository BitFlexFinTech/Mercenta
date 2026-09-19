/**
 * §Brand Intelligence — Brand Partner mode.
 * Shows the brand's own Amazon market intelligence using the same engine.
 */
import { useMemo } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { Card } from '@/components/ui';
import { getProspects } from '@/data/prospectStore';
import { APPROVED_CATEGORIES } from '@/types';
import { analyzeProductListing } from '@/lib/intelligence/listingAnalyzer';
import { BarChart3, TrendingUp, ShoppingBag, Users, Package, ArrowUpRight } from 'lucide-react';

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

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brass-500/15 flex items-center justify-center"><BarChart3 className="w-5 h-5 text-brass-400" /></div>
        <div><h2 className="text-lg font-semibold text-white">Your UK Market</h2><p className="text-xs text-zinc-500 mt-0.5">Market intelligence for <span className="text-brass-400">{brandName}</span> in <span className="text-brass-400">{brandCategory}</span></p></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-3"><div className="flex items-center gap-2 mb-1"><BarChart3 className="w-3.5 h-3.5 text-blue-400" /><span className="text-[10px] text-zinc-500 uppercase">Category Size</span></div><span className="text-2xl font-bold text-blue-400">£{(totalEst / 1000).toFixed(0)}k/mo</span><p className="text-[10px] text-zinc-600 mt-1">Estimated UK retail revenue</p></Card>
        <Card className="p-3"><div className="flex items-center gap-2 mb-1"><TrendingUp className="w-3.5 h-3.5 text-emerald-400" /><span className="text-[10px] text-zinc-500 uppercase">Category Growth</span></div><span className="text-2xl font-bold text-emerald-400">+12%</span><p className="text-[10px] text-zinc-600 mt-1">Estimated YoY growth</p></Card>
        <Card className="p-3"><div className="flex items-center gap-2 mb-1"><ShoppingBag className="w-3.5 h-3.5 text-amber-400" /><span className="text-[10px] text-zinc-500 uppercase">Brands Tracked</span></div><span className="text-2xl font-bold text-amber-400">{catData.sameCat.length}</span><p className="text-[10px] text-zinc-600 mt-1">In your category</p></Card>
        <Card className="p-3"><div className="flex items-center gap-2 mb-1"><Users className="w-3.5 h-3.5 text-brass-400" /><span className="text-[10px] text-zinc-500 uppercase">Competitor Brands</span></div><span className="text-2xl font-bold text-brass-400">{catData.sameCat.length}</span><p className="text-[10px] text-zinc-600 mt-1">Brands tracked in your category</p></Card>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Brands in Your Category</h3>
        {catData.sameCat.length === 0 ? <Card className="p-6 text-center"><p className="text-xs text-zinc-600">No competitor data available yet.</p></Card> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {catData.sameCat.slice(0, 9).map(p => (
              <Card key={p.id} className="p-3 flex items-center justify-between">
                <div><span className="text-xs font-medium text-white">{p.brand}</span><div className="text-[10px] text-zinc-500 mt-0.5">{qualitativePosition(p, p.brand === brandName)}</div></div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Card className="p-4">
        <div data-testid="bi-product-performance">
          <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-1.5">
            <Package className="w-4 h-4 text-brass-400" /> Your product performance
            <span className="text-[10px] text-zinc-600">— deterministic estimates, never live data</span>
          </h3>
          {productPerformance.length === 0 ? (
            <p className="text-xs text-zinc-600">No catalogue products yet — add products to see estimated performance.</p>
          ) : (
            <ul className="divide-y divide-white/[0.05] rounded-lg border border-white/[0.06] bg-ink-850">
              {productPerformance.map(({ product: p, analysis: a }) => (
                <li key={p.sku} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3.5 py-2.5" data-testid={`bi-sku-${p.sku}`}>
                  <div className="min-w-0 flex-1">
                    <span className="block text-xs font-medium text-white truncate">{p.name}</span>
                    <span className="block text-[10px] text-zinc-500 font-mono">{p.sku} · est. {a.estimates.monthlyUnitsLow}–{a.estimates.monthlyUnitsHigh} u/mo · £{a.estimates.priceGbp.toFixed(2)}</span>
                  </div>
                  <span className="text-[10px] uppercase text-zinc-600 hidden md:inline">Revenue</span>
                  <span className="text-xs font-mono text-emerald-300">£{(a.estimates.monthlyRevenueMidGbp / 1000).toFixed(0)}k/mo</span>
                  <span className="text-[10px] uppercase text-zinc-600 hidden md:inline">Demand</span>
                  <span className={a.estimates.demandSignal === 'high' ? 'text-emerald-300' : a.estimates.demandSignal === 'medium' ? 'text-amber-300' : 'text-zinc-500'}>{a.estimates.demandSignal}</span>
                  <span className="text-[10px] uppercase text-zinc-600 hidden md:inline">Opportunity</span>
                  <span className="text-[10px] text-brass-400">{a.estimates.opportunityIndicators[0] ?? '—'}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-zinc-600" />
                </li>
              ))}
            </ul>
          )}
          <p className="text-[10px] text-zinc-600 mt-2">
            Estimates derived from the same deterministic model as the Listing Analyzer — planning ranges, not measured marketplace data.
          </p>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-semibold text-white mb-2">Market Insights</h3>
        <div className="space-y-2 text-xs text-zinc-400">
          <p>Your brand is in <span className="text-brass-400">{brandCategory}</span> in the UK market, one of {APPROVED_CATEGORIES.length} approved categories.</p>
          <p>We track <span className="text-white">{catData.scored.length}</span> brands total. Of those, <span className="text-white">{catData.sameCat.length}</span> are in {brandCategory}.</p>
          <p>This intelligence updates weekly. Use these insights to understand your competitive position and identify growth opportunities.</p>
        </div>
      </Card>
    </div>
  );
}