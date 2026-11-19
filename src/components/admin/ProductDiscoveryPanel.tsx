/**
 * §Workstream B (Step B, 2026-09-17) — INTERNAL product discovery (Super Admin).
 *
 * Derives a product-level opportunity table from the CANONICAL BI evidence only:
 * each ACTIVE prospect's own ASIN records (BSR, price, reviews, estimated
 * sales/revenue, offer class) + the existing opportunity/category assessment.
 *
 * NON-NEGOTIABLES:
 *  - NOT a second engine: no new scoring model, no new stores, no new providers.
 *  - Every marketplace figure is the prospect's OWN stored evidence (which is a
 *    simulated/estimated seam today) — nothing is fabricated by this panel.
 *  - The demand flag is a DETERMINISTIC derivation over existing fields
 *    (documented below), never a measured claim.
 *  - Zero network calls; no live providers or AI.
 */
import { getProspects } from '@/data/prospectStore';
import { categoryEligibility } from '@/lib/intelligence/opportunityDiscovery';
import type { ProspectASIN } from '@/types';
import { Card, Badge } from '@/components/ui';
import { cn } from '@/utils/cn';
import { PackageSearch, Info } from 'lucide-react';

interface ProductRow {
  brand: string;
  prospectId: string;
  product: string;
  category: string;
  eligible: boolean;
  asin: string;
  price: number | null;
  bsr: number | null;
  reviews: number;
  rating: number | null;
  estSales: number;
  estRevenue: number;
  sellers: number;
  demand: 'High' | 'Medium' | 'Low' | 'Limited';
}

/**
 * Deterministic demand signal derived ONLY from stored evidence.
 *   High: est sales ≥ 500/mo OR ≥ 2000 reviews (clear marketplace scale).
 *   Medium: est sales ≥ 100/mo OR ≥ 400 reviews (meaningful traction).
 *   Low: an ASIN exists with some traction evidence.
 *   Limited: the record has no measurable sales/review signal.
 * No field here is invented; thresholds are documented so results are
 * reproducible and the real-data seam (keepa/amazon_sp_api) can later replace
 * the simulated evidence without any change to this derivation contract.
 */
function demandSignal(a: ProspectASIN): ProductRow['demand'] {
  const sales = a.estimatedSales ?? 0;
  const reviews = a.reviewCount ?? 0;
  if (sales >= 500 || reviews >= 2000) return 'High';
  if (sales >= 100 || reviews >= 400) return 'Medium';
  if (a.estimatedSales !== undefined || (a.reviewCount ?? 0) > 0) return 'Low';
  return 'Limited';
}

export function ProductDiscoveryPanel() {
  const rows: ProductRow[] = [];
  for (const p of getProspects()) {
    if (p.disqualified) continue;
    const elig = categoryEligibility(p.category);
    for (const a of p.asins) {
      rows.push({
        brand: p.brand,
        prospectId: p.id,
        product: a.title,
        category: a.category || p.category,
        eligible: elig.eligibility === 'eligible',
        asin: a.asin,
        price: a.price,
        bsr: a.bsr,
        reviews: a.reviewCount ?? 0,
        rating: a.rating,
        estSales: Math.round(a.estimatedSales ?? 0),
        estRevenue: Math.round(a.estimatedRevenue ?? 0),
        sellers: a.sellerCount ?? 0,
        demand: demandSignal(a),
      });
    }
  }
  rows.sort((a, b) => b.estRevenue - a.estRevenue);

  const demandTone: Record<string, string> = {
    High: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    Medium: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    Low: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    Limited: 'text-zinc-500 bg-zinc-500/10 border-zinc-500/30',
  };

return (
<Card title="Product Discovery (internal)" className="mt-2">
      <p className="text-ds-label text-zinc-400">
        Top candidate products by stored marketplace evidence. Derived from the canonical BI ASIN seam —
        <span className="text-zinc-300">simulated/estimated</span> until Keepa/Amazon credentials are live
        (then the same evidence seam carries real values). No network calls are made by this view.
      </p>
      <p className="text-ds-micro text-zinc-600 mt-1 flex items-start gap-1.5">
        <Info className="w-3.5 h-3.5 text-zinc-500 shrink-0" /> Demand: High (est sales ≥ 500/mo or ≥ 2000 reviews) · Medium (≥100/mo or ≥400 reviews) · Low (signal present) · Limited (no measurable signal). Qualitative derivation — not a Mercenta score.
      </p>
      <div className="overflow-x-auto mt-2">
        <table className="w-full text-ds-label" data-table="product-discovery">
          <thead>
            <tr className="text-left text-zinc-500 border-b border-hairline">
              <th className="py-1 px-2">Brand</th>
              <th className="py-1 px-2">Product</th>
              <th className="py-1 px-2">Category</th>
              <th className="py-1 px-2 text-right">Price</th>
              <th className="py-1 px-2 text-right">BSR</th>
              <th className="py-1 px-2 text-right">Reviews</th>
              <th className="py-1 px-2 text-right">Est sales/mo</th>
              <th className="py-1 px-2 text-right">Est revenue/mo</th>
              <th className="py-1 px-2 text-right">Sellers</th>
              <th className="py-1 px-2">Demand</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline-06">
            {rows.slice(0, 60).map((r) => (
              <tr key={`${r.prospectId}-${r.asin}`} className="hover:bg-tint">
                <td className="py-1 px-2 font-mono text-zinc-300">{r.brand}</td>
                <td className="py-1 px-2 text-zinc-200 truncate max-w-[220px]">{r.product}</td>
                <td className="py-1 px-2 text-zinc-400">{r.category}{r.eligible ? '' : ' ⚠'}</td>
                <td className="py-1 px-2 text-right font-mono text-zinc-300">{r.price ? `£${r.price.toFixed(2)}` : '—'}</td>
                <td className="py-1 px-2 text-right font-mono text-zinc-300">{r.bsr ?? '—'}</td>
                <td className="py-1 px-2 text-right font-mono text-zinc-300">{r.reviews.toLocaleString()}</td>
                <td className="py-1 px-2 text-right font-mono text-zinc-300">{r.estSales.toLocaleString()}</td>
                <td className="py-1 px-2 text-right font-mono text-zinc-300">£{r.estRevenue.toLocaleString()}</td>
                <td className="py-1 px-2 text-right font-mono text-zinc-300">{r.sellers}</td>
                <td className="py-1 px-2"><Badge className={cn('text-ds-micro', demandTone[r.demand] ?? demandTone.Limited)}>{r.demand}</Badge></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={10} className="py-3 text-center text-zinc-600">No product evidence in the canonical universe yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-ds-micro text-zinc-600 mt-2 flex items-center gap-1.5">
        <PackageSearch className="w-3.5 h-3.5 text-zinc-500" /> {rows.length} product records across {new Set(rows.map((r) => r.brand)).size} candidate brands (disqualified prospects excluded).
      </p>
    </Card>
  );
}

export default ProductDiscoveryPanel;