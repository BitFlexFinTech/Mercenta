/**
 * §Workstream B (Step B, 2026-09-17) — INTERNAL regional priority derivation
 * (Super Admin).
 *
 * Answers "which regions/markets deserve attention" from the EXISTING regional
 * taxonomy. Pure derivation over canonical data — reuses `SOURCE_MARKETS`,
 * `assessOpportunity`, `strategyForProspect` and the ICP origin-region bridge.
 * NOT a second regional scoring engine; NO network calls; NO fabricated values.
 *
 * UK remains first-class (Strategy A) and international remains first-class
 * (Strategy B / every non-UK market) — international is never deferred.
 */
import { getProspects } from '@/data/prospectStore';
import {
  assessOpportunity,
  SOURCE_MARKETS,
  strategyForProspect,
  type SourceMarketRegion,
} from '@/lib/intelligence/acquisitionStrategy';
import { deriveIcpOriginRegion } from '@/lib/intelligence/prospectPipeline';
import { Card } from '@/components/ui';
import { Map as MapIcon, Globe, TrendingUp } from 'lucide-react';

const REGION_LABELS: Record<SourceMarketRegion, string> = {
  uk: 'UK (domestic)',
  europe: 'Europe',
  africa: 'Africa',
  middle_east: 'Middle East',
  asia: 'Asia',
  north_america: 'North America',
  latin_america: 'Latin America',
  oceania: 'Oceania',
};

const REGION_ORDER: SourceMarketRegion[] = [
  'uk', 'europe', 'north_america', 'latin_america', 'africa', 'middle_east', 'asia', 'oceania',
];

interface RegionView {
  region: SourceMarketRegion;
  prospects: { brand: string; strategy: string; speedToRevenue: number; timeToRevenueWeeks: number; icpRegion: string }[];
}

export function RegionalPriorityPanel() {
  const byRegion = new Map<SourceMarketRegion, RegionView>();

  for (const p of getProspects()) {
    if (p.disqualified) continue;
    const firstCountry = (p.countries ?? [])[0] ?? '—';
    const market = SOURCE_MARKETS[firstCountry.toUpperCase()] ?? SOURCE_MARKETS[firstCountry] ?? null;
    const region: SourceMarketRegion = market?.region ?? 'europe'; // unknown origin ⇒ Europe default, never dropped
    const assess = assessOpportunity(p);
    if (!byRegion.has(region)) byRegion.set(region, { region, prospects: [] });
    byRegion.get(region)!.prospects.push({
      brand: p.brand,
      strategy: strategyForProspect(p) === 'uk_brands' ? 'Strategy A (UK)' : 'Strategy B (global → UK)',
      speedToRevenue: assess.speedToRevenueScore,
      timeToRevenueWeeks: assess.timeToRevenueWeeks,
      icpRegion: deriveIcpOriginRegion(p) ?? '—',
    });
  }

  const views = REGION_ORDER
    .filter((r) => byRegion.has(r))
    .map((r) => ({ ...byRegion.get(r)!, prospects: byRegion.get(r)!.prospects.sort((a, b) => b.speedToRevenue - a.speedToRevenue) }));

  const ukCount = views.find((v) => v.region === 'uk')?.prospects.length ?? 0;
  const intlCount = views.filter((v) => v.region !== 'uk').reduce((s, v) => s + v.prospects.length, 0);
  const total = views.reduce((s, v) => s + v.prospects.length, 0);

  return (
    <Card title="Regional Priority (internal)" className="mt-2">
      <p className="text-ds-label text-zinc-400">
        Which regions deserve attention, derived from the existing <span className="text-zinc-300">SOURCE_MARKETS</span> taxonomy and the
        canonical opportunity assessment. UK (Strategy A) stays first-class; international (Strategy B) is tracked equally — never deferred.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
        <Card className="p-2.5"><div className="flex items-center gap-1.5"><MapIcon className="w-3.5 h-3.5 text-brass-400" /><span className="text-ds-micro text-zinc-500 uppercase">Total tracked</span></div><span className="text-lg font-bold text-white">{total}</span></Card>
        <Card className="p-2.5"><div className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-emerald-400" /><span className="text-ds-micro text-zinc-500 uppercase">UK (Strategy A)</span></div><span className="text-lg font-bold text-white">{ukCount}</span></Card>
        <Card className="p-2.5"><div className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-blue-400" /><span className="text-ds-micro text-zinc-500 uppercase">International (Strategy B)</span></div><span className="text-lg font-bold text-white">{intlCount}</span></Card>
      </div>

      <div className="space-y-3 mt-2" data-section="regional-priority">
        {views.map((v) => (
          <div key={v.region} className="bg-ink-900 border border-white/[0.08] rounded-ds-md p-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-white flex items-center gap-1.5"><Globe className="w-3 h-3 text-zinc-400" />{REGION_LABELS[v.region]}</h4>
              <span className="font-mono text-ds-micro text-zinc-500">{v.prospects.length} prospect(s)</span>
            </div>
            <div className="space-y-1 text-ds-label">
              {v.prospects.slice(0, 6).map((r) => (
                <div key={r.brand} className="flex items-center justify-between">
                  <span className="text-zinc-300 font-medium">{r.brand}</span>
                  <span className="text-zinc-500 text-ds-micro font-mono">{r.strategy} · ICP {r.icpRegion} · speed {r.speedToRevenue}/100 · ~{r.timeToRevenueWeeks}w to revenue</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {views.length === 0 && <p className="text-xs text-zinc-600">No active prospects to prioritise.</p>}
      </div>
    </Card>
  );
}

export default RegionalPriorityPanel;