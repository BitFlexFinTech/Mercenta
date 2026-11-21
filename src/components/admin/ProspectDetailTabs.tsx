/* Brand Intelligence detail sub-tabs: Overview, Amazon, Commercial, People, Mercenta Fit, History */
import { useState } from 'react';
import { Card, Badge, Button } from '@/components/ui';
import { cn } from '@/utils/cn';
import type { BrandProspect } from '@/types';
import { getProspect, getProspectTimeline, updateProspect, recordLifecycleEvent } from '@/data/prospectStore';
import { ExternalLink, StickyNote } from 'lucide-react';

export function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex items-center justify-between"><span className="text-muted text-xs">{label}</span><span className="text-strong text-xs font-medium truncate ml-2">{value}</span></div>;
}

export function ScoreBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return <div><div className="flex items-center justify-between text-ds-label mb-0.5"><span className="text-muted">{label}</span><span className={cn('font-medium', color)}>{value}/{max}</span></div><div className="w-full h-1.5 bg-surface-raised rounded-full overflow-hidden"><div className={cn('h-full rounded-full', color.replace('text-', 'bg-'))} style={{ width: `${(value / max) * 100}%` }} /></div></div>;
}
export function OverviewTab({ p }: { p: BrandProspect }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-muted uppercase">Scores</h4>
      <ScoreBar label="Amazon UK Demand" value={p.score.amazonDemand} max={25} color="text-state-info" />
      <ScoreBar label="PO Potential" value={p.score.poPotential} max={20} color="text-state-success" />
      <ScoreBar label="Growth" value={p.score.growth} max={15} color="text-state-warning" />
      <ScoreBar label="Distribution" value={p.score.distributionOpenness} max={15} color="text-purple-400" />
      <ScoreBar label="Acceptance" value={p.score.acceptanceProbability} max={10} color="text-cyan-400" />
      <ScoreBar label="Mercenta Fit" value={p.score.mercentaFit} max={10} color="text-accent-400" />
      <ScoreBar label="Logistics" value={p.score.logisticsSuitability} max={5} color="text-pink-400" />
    </div>
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-muted uppercase">Summary</h4>
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
  const AB: Record<string, string> = { DIRECT_AMAZON_RETAIL: 'bg-state-success/10 text-state-success', AMAZON_PRESENT_BUT_UNCLEAR: 'bg-state-warning/10 text-state-warning', MARKETPLACE_HEAVY: 'bg-state-info/10 text-state-info', MARKETPLACE_ONLY_OBSERVED: 'bg-tint text-strong', NO_CURRENT_OFFER: 'bg-state-danger/10 text-state-danger', UNKNOWN: 'bg-tint text-muted' };
  return <div className="space-y-2">
    <h4 className="text-xs font-semibold text-muted uppercase">{p.asins.length} ASIN{p.asins.length !== 1 ? 's' : ''}</h4>
    {p.asins.map(a => <div key={a.asin} className="bg-surface-raised rounded-ds-md p-2.5 space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-strong">{a.title}</span>
        <Badge className={cn('text-ds-micro border', AB[a.amazonOfferClass] ?? '')}>{a.amazonOfferClass.replace(/_/g, ' ')}</Badge>
        <a href={a.amazonUrl} target="_blank" rel="noreferrer" className="ml-auto"><ExternalLink className="w-3 h-3 text-muted hover:text-accent-400" /></a>
      </div>
      <div className="flex items-center gap-3 text-ds-micro text-muted flex-wrap">
        <span>£{a.price.toFixed(2)}</span><span>★ {a.rating}</span><span>{a.reviewCount} reviews</span><span>BSR #{a.bsr}</span>
        {a.estimatedSales ? <span>~{a.estimatedSales}/mo</span> : null}
        {a.estimatedRevenue ? <span>~£{a.estimatedRevenue}/mo</span> : null}
        <span>{a.sellerCount} sellers</span>
        {a.prime ? <Badge className="text-ds-micro bg-blue-500/10 text-state-info">Prime</Badge> : null}
      </div>
    </div>)}
  </div>;
}

export function CommercialTab({ p }: { p: BrandProspect }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-muted uppercase">Wholesale</h4>
      <div className="space-y-1 text-xs">
        <InfoRow label="Available" value={p.wholesale.wholesaleAvailable ? 'Yes' : 'No'} />
        <InfoRow label="Distributor Prg" value={p.wholesale.distributorProgramme ? 'Yes' : 'No'} />
        <InfoRow label="Retailer Prg" value={p.wholesale.retailerProgramme ? 'Yes' : 'No'} />
      </div>
    </div>
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-muted uppercase">Distributors</h4>
      {p.distributors.length === 0 ? <p className="text-xs text-faint">None identified</p> : p.distributors.map((d, i) => <div key={i} className="bg-surface-raised rounded-ds-md p-2 space-y-1">
        <div className="text-xs font-medium text-strong">{d.company}</div>
        <div className="text-ds-micro text-muted">{d.territory}{d.exclusive ? ' · Exclusive' : ''}</div>
        {d.suggestedApproach ? <div className="text-ds-micro text-accent-400">Approach: {d.suggestedApproach.replace(/_/g, ' ')}</div> : null}
      </div>)}
    </div>
  </div>;
}
export function PeopleTab({ p }: { p: BrandProspect }) {
  return <div className="space-y-2">
    <h4 className="text-xs font-semibold text-muted uppercase">{p.contacts.length} Decision-maker{p.contacts.length !== 1 ? 's' : ''}</h4>
    {p.contacts.length === 0 ? <p className="text-xs text-faint">No contacts identified</p> : p.contacts.map((c, i) => <div key={i} className="bg-surface-raised rounded-ds-md p-2.5 space-y-1">
      <div className="text-xs font-medium text-strong">{c.name}</div>
      <div className="text-ds-micro text-muted">{c.jobTitle} · {c.company}</div>
      {c.linkedInUrl ? <div className="text-ds-micro"><a href={c.linkedInUrl} target="_blank" rel="noreferrer" className="text-accent-400">LinkedIn <ExternalLink className="w-3 h-3 inline" /></a></div> : null}
      {c.email ? <div className="text-ds-micro text-muted">{c.email} <Badge className="text-ds-micro ml-1 bg-tint text-muted">{c.emailConfidence.replace(/_/g, ' ')}</Badge></div> : null}
    </div>)}
  </div>;
}

export function MercentaFitTab({ p, tierColors: colors }: { p: BrandProspect; tierColors: Record<string, string> }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-muted uppercase">Fit Analysis</h4>
      <div className="space-y-1 text-xs">
        <InfoRow label="SKU Breadth" value={`${p.asins.length} ASINs`} />
        <InfoRow label="Repeat Purchase" value={['Grocery', 'Home', 'Baby', 'Health & Personal Care', 'Kitchen'].includes(p.category) ? 'Yes' : 'Mixed'} />
        <InfoRow label="PO Suitability" value={p.asins.length >= 2 ? 'Good' : 'Limited'} />
        <InfoRow label="Self-Service" value={p.wholesale.wholesaleAvailable ? 'High' : 'Investigate'} />
      </div>
    </div>
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-muted uppercase">Recommendation</h4>
      {p.disqualified
        ? <div className="bg-state-danger/10 border border-state-danger/20 rounded-ds-md p-3"><p className="text-xs text-state-danger font-medium">Disqualified</p><p className="text-ds-micro text-state-danger/70 mt-1">{p.disqualificationReason}</p></div>
        : <div className="space-y-1.5">
            <div className="bg-surface-raised rounded-ds-md p-2.5 text-xs">
              <p className="text-strong">Score: <span className={cn('font-bold', colors[p.score.tier])}>{p.score.total}/100</span></p>
              <p className="text-muted mt-1 capitalize">{p.score.tier.replace(/_/g, ' ')}</p>
            </div>
            {p.contacts.length > 0
              ? <div className="bg-accent-500/5 border border-accent-500/10 rounded-ds-md p-2.5">
                  <p className="text-ds-micro text-accent-300">Contact <span className="font-medium">{p.contacts[0].name}</span> ({p.contacts[0].jobTitle})</p></div>
              : null}
          </div>}
    </div>
  </div>;
}

const CT_COLORS: Record<string, string> = {
  created: 'bg-state-success/10 text-state-success',
  updated: 'bg-state-info/10 text-state-info',
  disqualified: 'bg-state-warning/10 text-state-warning',
  requalified: 'bg-cyan-500/15 text-cyan-300',
  unchanged: 'bg-tint text-muted',
};

/** §Phase B — auditable change history for a canonical prospect. */
export function HistoryTab({ p }: { p: BrandProspect }) {
  const events = getProspectTimeline(p.id);
  if (events.length === 0) return <p className="text-xs text-faint">No change events recorded yet.</p>;
  return <div className="space-y-1.5">
    {events.slice(-10).reverse().map((e) => (
      <div key={e.id} className="flex items-start gap-2 bg-surface-raised border border-hairline rounded-ds-md p-2">
        <Badge className={cn('text-ds-micro px-1.5 py-0.5 font-mono', CT_COLORS[e.changeType] ?? 'text-muted')}>{e.changeType}</Badge>
        <div className="flex-1 min-w-0">
          <p className="text-ds-label text-strong">{e.summary}</p>
          <p className="text-ds-micro text-muted font-mono">{e.timestamp.slice(0, 16).replace('T', ' ')} · {e.runId}{e.field ? ` · ${e.field}` : ''}{e.before && e.after ? ` · ${e.before} → ${e.after}` : ''}</p>
        </div>
      </div>
    ))}
  </div>;
}

/**
 * §Workstream B (Step C, 2026-09-17) — INTERNAL notes editor (authorised Super
 * Admin only; the whole BI surface is role-gated). Writes through the existing
 * canonical `updateProspect` seam (no second datastore) and records an audited
 * 'updated → notes' lifecycle event on the prospect timeline. Internal notes are
 * never rendered on brand-facing surfaces.
 */
export function NotesTab({ p, onChanged }: { p: BrandProspect; onChanged?: () => void }) {
  // Boot the draft from the LIVE canonical store (never a stale prop) so a
  // remount after a save reflects what is actually persisted in-session.
  const live = getProspect(p.id) ?? p;
  const [draft, setDraft] = useState(live.notes ?? '');
  const [saved, setSaved] = useState<string | null>(null);

  const save = () => {
    const before = (p.notes ?? '').trim();
    const after = (draft ?? '').trim();
    const updated = { ...p, notes: after };
    updateProspect(updated);
    recordLifecycleEvent({
      id: `evt-note-${p.id}-${Date.now()}`,
      runId: 'manual',
      prospectId: p.id,
      brand: p.brand,
      changeType: 'updated',
      field: 'notes',
      before: before.slice(0, 80) || '(none)',
      after: after.slice(0, 80) || '(cleared)',
      summary: 'Internal notes updated by operator',
      timestamp: new Date().toISOString(),
    });
    setSaved('Internal notes saved — visible to authorised staff only.');
    onChanged?.();
  };

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-muted uppercase flex items-center gap-1.5">
        <StickyNote className="w-3 h-3 text-accent-400" /> Internal Notes / Acquisition Rationale
      </h4>
      {p.whyInteresting && (
        <div className="bg-accent-500/5 border border-accent-500/15 rounded-ds-md p-2">
          <p className="text-ds-micro text-accent-300 uppercase">Why this prospect</p>
          <p className="text-ds-label text-accent-300 leading-relaxed">{p.whyInteresting}</p>
        </div>
      )}
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Internal notes: evidence, acquisition rationale, next-step rationale… (never shown to the brand)"
        rows={6}
        className="w-full bg-surface border border-hairline rounded-ds-sm px-2.5 py-2 text-xs text-strong font-mono focus:outline-none focus:border-accent-500/40"
        aria-label="Internal notes"
      />
      <div className="flex items-center gap-2">
        <Button className="text-xs" onClick={save}>Save notes</Button>
        {saved && <span className="text-ds-micro text-state-success">{saved}</span>}
      </div>
    </div>
  );
}