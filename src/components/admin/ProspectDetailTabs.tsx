/* Brand Intelligence detail sub-tabs: Overview, Amazon, Commercial, People, Mercenta Fit, History */
import { Card, Badge } from '@/components/ui';
import { cn } from '@/utils/cn';
import type { BrandProspect } from '@/types';
import { getProspectTimeline } from '@/data/prospectStore';
import { ExternalLink } from 'lucide-react';

export function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex items-center justify-between"><span className="text-zinc-500 text-xs">{label}</span><span className="text-zinc-300 text-xs font-medium truncate ml-2">{value}</span></div>;
}

export function ScoreBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return <div><div className="flex items-center justify-between text-[11px] mb-0.5"><span className="text-zinc-400">{label}</span><span className={cn('font-medium', color)}>{value}/{max}</span></div><div className="w-full h-1.5 bg-ink-850 rounded-full overflow-hidden"><div className={cn('h-full rounded-full', color.replace('text-', 'bg-'))} style={{ width: `${(value / max) * 100}%` }} /></div></div>;
}
export function OverviewTab({ p }: { p: BrandProspect }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-zinc-400 uppercase">Scores</h4>
      <ScoreBar label="Amazon UK Demand" value={p.score.amazonDemand} max={25} color="text-blue-400" />
      <ScoreBar label="PO Potential" value={p.score.poPotential} max={20} color="text-emerald-400" />
      <ScoreBar label="Growth" value={p.score.growth} max={15} color="text-amber-400" />
      <ScoreBar label="Distribution" value={p.score.distributionOpenness} max={15} color="text-purple-400" />
      <ScoreBar label="Acceptance" value={p.score.acceptanceProbability} max={10} color="text-cyan-400" />
      <ScoreBar label="Mercenta Fit" value={p.score.mercentaFit} max={10} color="text-brass-400" />
      <ScoreBar label="Logistics" value={p.score.logisticsSuitability} max={5} color="text-pink-400" />
    </div>
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-zinc-400 uppercase">Summary</h4>
      <div className="space-y-1 text-xs">
        <InfoRow label="ASINs" value={String(p.asins.length)} />
        <InfoRow label="Est. Sales/mo" value={String(p.asins.reduce((s, a) => s + (a.estimatedSales ?? 0), 0))} />
        <InfoRow label="Est. Revenue/mo" value={String(p.asins.reduce((s, a) => s + (a.estimatedRevenue ?? 0), 0))} />
        <InfoRow label="Maturity" value={p.brandMaturity.replace(/_/g, ' ')} />
        <InfoRow label="UK Presence" value={p.ukPresence ? 'Yes' : 'Unknown'} />
        <InfoRow label="Distributors" value={String(p.distributors.length)} />
        <InfoRow label="Contacts" value={String(p.contacts.length)} />
        <InfoRow label="Growth Signals" value={String(p.growthSignals.length)} />
        {p.lastChecked?<InfoRow label="Last checked" value={p.lastChecked.slice(0,10)} />:null}
        {p.nextCheck?<InfoRow label="Next check" value={p.nextCheck.slice(0,10)} />:null}
        <InfoRow label="Status" value={p.outreachStatus.replace(/_/g, ' ')} />
        {p.incumbentChallenged?.length ? <InfoRow label="Challenging" value={p.incumbentChallenged.join(', ')} /> : null}
      </div>
    </div>
  </div>;
}
export function AmazonTab({ p }: { p: BrandProspect }) {
  const AB: Record<string, string> = { DIRECT_AMAZON_RETAIL: 'bg-emerald-500/15 text-emerald-300', AMAZON_PRESENT_BUT_UNCLEAR: 'bg-amber-500/15 text-amber-300', MARKETPLACE_HEAVY: 'bg-blue-500/15 text-blue-300', MARKETPLACE_ONLY_OBSERVED: 'bg-zinc-500/15 text-zinc-300', NO_CURRENT_OFFER: 'bg-red-500/15 text-red-300', UNKNOWN: 'bg-zinc-500/10 text-zinc-500' };
  return <div className="space-y-2">
    <h4 className="text-xs font-semibold text-zinc-400 uppercase">{p.asins.length} ASIN{p.asins.length !== 1 ? 's' : ''}</h4>
    {p.asins.map(a => <div key={a.asin} className="bg-ink-850 rounded-lg p-2.5 space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-white">{a.title}</span>
        <Badge className={cn('text-[9px] border', AB[a.amazonOfferClass] ?? '')}>{a.amazonOfferClass.replace(/_/g, ' ')}</Badge>
        <a href={a.amazonUrl} target="_blank" rel="noreferrer" className="ml-auto"><ExternalLink className="w-3 h-3 text-zinc-500 hover:text-brass-400" /></a>
      </div>
      <div className="flex items-center gap-3 text-[10px] text-zinc-500 flex-wrap">
        <span>£{a.price.toFixed(2)}</span><span>★ {a.rating}</span><span>{a.reviewCount} reviews</span><span>BSR #{a.bsr}</span>
        {a.estimatedSales ? <span>~{a.estimatedSales}/mo</span> : null}
        {a.estimatedRevenue ? <span>~£{a.estimatedRevenue}/mo</span> : null}
        <span>{a.sellerCount} sellers</span>
        {a.prime ? <Badge className="text-[9px] bg-blue-500/10 text-blue-300">Prime</Badge> : null}
      </div>
    </div>)}
  </div>;
}

export function CommercialTab({ p }: { p: BrandProspect }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-zinc-400 uppercase">Wholesale</h4>
      <div className="space-y-1 text-xs">
        <InfoRow label="Available" value={p.wholesale.wholesaleAvailable ? 'Yes' : 'No'} />
        <InfoRow label="Distributor Prg" value={p.wholesale.distributorProgramme ? 'Yes' : 'No'} />
        <InfoRow label="Retailer Prg" value={p.wholesale.retailerProgramme ? 'Yes' : 'No'} />
      </div>
    </div>
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-zinc-400 uppercase">Distributors</h4>
      {p.distributors.length === 0 ? <p className="text-xs text-zinc-600">None identified</p> : p.distributors.map((d, i) => <div key={i} className="bg-ink-850 rounded-lg p-2 space-y-1">
        <div className="text-xs font-medium text-white">{d.company}</div>
        <div className="text-[10px] text-zinc-500">{d.territory}{d.exclusive ? ' · Exclusive' : ''}</div>
        {d.suggestedApproach ? <div className="text-[10px] text-brass-400">Approach: {d.suggestedApproach.replace(/_/g, ' ')}</div> : null}
      </div>)}
    </div>
  </div>;
}
export function PeopleTab({ p }: { p: BrandProspect }) {
  return <div className="space-y-2">
    <h4 className="text-xs font-semibold text-zinc-400 uppercase">{p.contacts.length} Decision-maker{p.contacts.length !== 1 ? 's' : ''}</h4>
    {p.contacts.length === 0 ? <p className="text-xs text-zinc-600">No contacts identified</p> : p.contacts.map((c, i) => <div key={i} className="bg-ink-850 rounded-lg p-2.5 space-y-1">
      <div className="text-xs font-medium text-white">{c.name}</div>
      <div className="text-[10px] text-zinc-400">{c.jobTitle} · {c.company}</div>
      {c.linkedInUrl ? <div className="text-[10px]"><a href={c.linkedInUrl} target="_blank" rel="noreferrer" className="text-brass-400">LinkedIn <ExternalLink className="w-3 h-3 inline" /></a></div> : null}
      {c.email ? <div className="text-[10px] text-zinc-500">{c.email} <Badge className="text-[8px] ml-1 bg-zinc-500/10 text-zinc-400">{c.emailConfidence.replace(/_/g, ' ')}</Badge></div> : null}
    </div>)}
  </div>;
}

export function MercentaFitTab({ p, tierColors: colors }: { p: BrandProspect; tierColors: Record<string, string> }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-zinc-400 uppercase">Fit Analysis</h4>
      <div className="space-y-1 text-xs">
        <InfoRow label="SKU Breadth" value={`${p.asins.length} ASINs`} />
        <InfoRow label="Repeat Purchase" value={['Grocery', 'Home', 'Baby', 'Health & Personal Care', 'Kitchen'].includes(p.category) ? 'Yes' : 'Mixed'} />
        <InfoRow label="PO Suitability" value={p.asins.length >= 2 ? 'Good' : 'Limited'} />
        <InfoRow label="Self-Service" value={p.wholesale.wholesaleAvailable ? 'High' : 'Investigate'} />
      </div>
    </div>
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-zinc-400 uppercase">Recommendation</h4>
      {p.disqualified
        ? <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3"><p className="text-xs text-red-400 font-medium">Disqualified</p><p className="text-[10px] text-red-300/70 mt-1">{p.disqualificationReason}</p></div>
        : <div className="space-y-1.5">
            <div className="bg-ink-850 rounded-lg p-2.5 text-xs">
              <p className="text-zinc-300">Score: <span className={cn('font-bold', colors[p.score.tier])}>{p.score.total}/100</span></p>
              <p className="text-zinc-500 mt-1 capitalize">{p.score.tier.replace(/_/g, ' ')}</p>
            </div>
            {p.contacts.length > 0
              ? <div className="bg-brass-500/5 border border-brass-500/10 rounded-lg p-2.5">
                  <p className="text-[10px] text-brass-300">Contact <span className="font-medium">{p.contacts[0].name}</span> ({p.contacts[0].jobTitle})</p></div>
              : null}
          </div>}
    </div>
  </div>;
}

const CT_COLORS: Record<string, string> = {
  created: 'bg-emerald-500/15 text-emerald-300',
  updated: 'bg-blue-500/15 text-blue-300',
  disqualified: 'bg-amber-500/15 text-amber-300',
  requalified: 'bg-cyan-500/15 text-cyan-300',
  unchanged: 'bg-zinc-500/10 text-zinc-500',
};

/** §Phase B — auditable change history for a canonical prospect. */
export function HistoryTab({ p }: { p: BrandProspect }) {
  const events = getProspectTimeline(p.id);
  if (events.length === 0) return <p className="text-xs text-zinc-600">No change events recorded yet.</p>;
  return <div className="space-y-1.5">
    {events.slice(-10).reverse().map((e) => (
      <div key={e.id} className="flex items-start gap-2 bg-ink-850 border border-white/[0.06] rounded-lg p-2">
        <Badge className={cn('text-[8px] px-1.5 py-0.5 font-mono', CT_COLORS[e.changeType] ?? 'text-zinc-500')}>{e.changeType}</Badge>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-zinc-300">{e.summary}</p>
          <p className="text-[9px] text-zinc-500 font-mono">{e.timestamp.slice(0, 16).replace('T', ' ')} · {e.runId}{e.field ? ` · ${e.field}` : ''}{e.before && e.after ? ` · ${e.before} → ${e.after}` : ''}</p>
        </div>
      </div>
    ))}
  </div>;
}