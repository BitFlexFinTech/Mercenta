/**
 * §Brand Intelligence — Brand Partner mode.
 * Shows the brand's own Amazon market intelligence using the same engine.
 */
import { useMemo } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { Card, Badge } from '@/components/ui';
import { cn } from '@/utils/cn';
import { createBrandIntelligenceClient } from '@/lib/intelligence/brandIntelligenceClient';
import { SEED_PROSPECTS } from '@/data/brandProspectSeed';
import { EXTRA_PROSPECTS } from '@/data/brandExtraSeed';
import { APPROVED_CATEGORIES } from '@/types';
import { BarChart3, TrendingUp, ShoppingBag, Users } from 'lucide-react';

const client = createBrandIntelligenceClient();

export function BrandIntelligence() {
  const { brandProfile, session } = useApp();
  const brandName = brandProfile?.businessName ?? (session?.tenantId ?? 'Your Brand');
  const brandCategory = brandProfile?.category ?? 'Home';

  const catData = useMemo(() => {
    const all = [...SEED_PROSPECTS, ...EXTRA_PROSPECTS];
    const scored = all.map(p => client.scoreProspect(p)).filter(p => !p.disqualified);
    const sameCat = scored.filter(p => p.category === brandCategory);
    return { scored, sameCat };
  }, [brandCategory]);

  const totalEst = catData.sameCat.reduce((s, p) => s + p.asins.reduce((s2, a) => s2 + (a.estimatedRevenue ?? 0), 0), 0);

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brass-500/15 flex items-center justify-center"><BarChart3 className="w-5 h-5 text-brass-400" /></div>
        <div><h2 className="text-lg font-semibold text-white">Your Amazon Market</h2><p className="text-xs text-zinc-500 mt-0.5">Market intelligence for <span className="text-brass-400">{brandName}</span> in <span className="text-brass-400">{brandCategory}</span></p></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-3"><div className="flex items-center gap-2 mb-1"><BarChart3 className="w-3.5 h-3.5 text-blue-400" /><span className="text-[10px] text-zinc-500 uppercase">Category Size</span></div><span className="text-2xl font-bold text-blue-400">£{(totalEst / 1000).toFixed(0)}k/mo</span><p className="text-[10px] text-zinc-600 mt-1">Estimated Amazon UK revenue</p></Card>
        <Card className="p-3"><div className="flex items-center gap-2 mb-1"><TrendingUp className="w-3.5 h-3.5 text-emerald-400" /><span className="text-[10px] text-zinc-500 uppercase">Category Growth</span></div><span className="text-2xl font-bold text-emerald-400">+12%</span><p className="text-[10px] text-zinc-600 mt-1">Estimated YoY growth</p></Card>
        <Card className="p-3"><div className="flex items-center gap-2 mb-1"><ShoppingBag className="w-3.5 h-3.5 text-amber-400" /><span className="text-[10px] text-zinc-500 uppercase">Brands Tracked</span></div><span className="text-2xl font-bold text-amber-400">{catData.sameCat.length}</span><p className="text-[10px] text-zinc-600 mt-1">In your category</p></Card>
        <Card className="p-3"><div className="flex items-center gap-2 mb-1"><Users className="w-3.5 h-3.5 text-brass-400" /><span className="text-[10px] text-zinc-500 uppercase">Competitors</span></div><span className="text-2xl font-bold text-brass-400">{catData.sameCat.length}</span><p className="text-[10px] text-zinc-600 mt-1">Strong brands in category</p></Card>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Brands in Your Category</h3>
        {catData.sameCat.length === 0 ? <Card className="p-6 text-center"><p className="text-xs text-zinc-600">No competitor data available yet.</p></Card> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {catData.sameCat.slice(0, 9).map(p => (
              <Card key={p.id} className="p-3 flex items-center justify-between">
                <div><span className="text-xs font-medium text-white">{p.brand}</span><div className="text-[10px] text-zinc-500 mt-0.5">Score: {p.score.total}/100</div></div>
                <Badge className={cn('text-[9px]', p.score.tier === 'tier_1' ? 'bg-emerald-500/15 text-emerald-300' : p.score.tier === 'tier_2' ? 'bg-blue-500/15 text-blue-300' : 'bg-zinc-500/15 text-zinc-400')}>{p.score.tier.replace(/_/g, ' ')}</Badge>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Card className="p-4">
        <h3 className="text-sm font-semibold text-white mb-2">Market Insights</h3>
        <div className="space-y-2 text-xs text-zinc-400">
          <p>Your brand is in <span className="text-brass-400">{brandCategory}</span> on Amazon UK, one of {APPROVED_CATEGORIES.length} approved categories.</p>
          <p>We track <span className="text-white">{catData.scored.length}</span> brands total. Of those, <span className="text-white">{catData.sameCat.length}</span> are in {brandCategory}.</p>
          <p>This intelligence updates weekly. Use these insights to understand your competitive position and identify growth opportunities.</p>
        </div>
      </Card>
    </div>
  );
}