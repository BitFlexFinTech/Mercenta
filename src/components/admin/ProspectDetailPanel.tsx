/**
 * Prospect Detail Panel — main container with header, sub-tab navigation, and tab content.
 * Tab bodies are imported from ProspectDetailTabs.
 */
import { useState } from 'react';
import { Card, Badge, Button } from '@/components/ui';
import { cn } from '@/utils/cn';
import type { BrandProspect } from '@/types';
import { OverviewTab, AmazonTab, CommercialTab, PeopleTab, MercentaFitTab, HistoryTab, NotesTab } from './ProspectDetailTabs';
import { AcquisitionWorkflow } from './AcquisitionWorkflow';
import { disqualifyProspect } from '@/lib/intelligence/prospectLifecycle';
import { X, ShoppingCart, Building2, Users, Target, Globe, History, ShieldBan, RotateCcw, Send, StickyNote } from 'lucide-react';

const TC: Record<string, string> = { tier_1: 'text-emerald-400', tier_2: 'text-blue-400', tier_3: 'text-amber-400', tier_4: 'text-zinc-400', unscored: 'text-zinc-600' };
const TL: Record<string, string> = { tier_1: 'Attack', tier_2: 'High Prob', tier_3: 'Upside', tier_4: 'Reserve', unscored: 'Below' };

export function ProspectDetailPanel({ prospect, onClose, onMutated }: { prospect: BrandProspect; onClose: () => void; onMutated?: () => void }) {
  const [tab, setTab] = useState<'overview' | 'amazon' | 'commercial' | 'people' | 'mercenta' | 'history' | 'outreach' | 'notes'>('overview');
  const p = prospect;
  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: Target }, { id: 'amazon' as const, label: 'Amazon', icon: ShoppingCart },
    { id: 'commercial' as const, label: 'Commercial', icon: Building2 }, { id: 'people' as const, label: 'People', icon: Users },
    { id: 'mercenta' as const, label: 'Mercenta Fit', icon: Globe },
    // §Phase C — ICP enrolment → outreach → approval → send → response → opportunity.
    { id: 'outreach' as const, label: 'Outreach', icon: Send },
    // §Workstream B (Step C) — internal notes / acquisition rationale editor.
    { id: 'notes' as const, label: 'Notes', icon: StickyNote },
    { id: 'history' as const, label: 'History', icon: History },
  ];
  const handleDisqualify = () => {
    const reason = window.prompt('Disqualification reason:');
    if (reason === null) return;
    disqualifyProspect(p.id, reason || 'Disqualified by operator');
    onMutated?.();
    onClose();
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-ds-lg bg-brass-500/15 flex items-center justify-center"><Target className="w-5 h-5 text-brass-400" /></div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-strong">{p.brand}</h3>
              <Badge className={cn('text-ds-micro border', TC[p.score.tier])}>{TL[p.score.tier]}</Badge>
              <span className={cn('text-xl font-bold', TC[p.score.tier])}>{p.score.total}<span className="text-xs text-zinc-600">/100</span></span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {p.lastChecked?<Badge className="text-ds-micro bg-ink-850 text-zinc-400">checked {p.lastChecked.slice(0,10)}</Badge>:null}
              {p.nextCheck?<Badge className="text-ds-micro bg-ink-850 text-zinc-400">next {p.nextCheck.slice(0,10)}</Badge>:null}
              {!p.disqualified&&<Button variant="danger" className="text-ds-micro px-2 py-1" onClick={handleDisqualify}><ShieldBan className="w-3 h-3 text-crimson-accent" />Disqualify</Button>}
              {p.disqualified&&<Badge className="text-ds-micro bg-amber-500/15 text-amber-300">disqualified</Badge>}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">{p.category}{p.website ? <> · <a href={p.website} target="_blank" rel="noreferrer" className="text-brass-400 hover:underline">{p.website.replace('https://', '')}</a></> : null}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-ds-md hover:bg-tint text-zinc-500"><X className="w-4 h-4" /></button>
      </div>

      {p.whyInteresting && <div className="bg-brass-500/5 border border-brass-500/15 rounded-ds-md p-3"><p className="text-xs text-brass-300 leading-relaxed">{p.whyInteresting}</p></div>}

      <div className="flex items-center gap-1 flex-wrap bg-ink-850 border border-hairline rounded-ds-md p-0.5">
        {tabs.map(t => { const Ic = t.icon; return (
          <button key={t.id} onClick={() => setTab(t.id)} className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-ds-sm text-ds-micro font-medium transition-colors', tab === t.id ? 'bg-brass-500 text-strong' : 'text-zinc-400 hover:text-strong')}><Ic className="w-3 h-3" />{t.label}</button>
        ); })}
      </div>

      {tab === 'overview' && <OverviewTab p={p} />}
      {tab === 'amazon' && <AmazonTab p={p} />}
      {tab === 'commercial' && <CommercialTab p={p} />}
      {tab === 'people' && <PeopleTab p={p} />}
      {tab === 'mercenta' && <MercentaFitTab p={p} tierColors={TC} />}
      {tab === 'outreach' && (
        <div data-section="acquisition-workflow">
          <AcquisitionWorkflow prospectId={p.id} onChanged={onMutated} />
        </div>
      )}
      {tab === 'notes' && <NotesTab p={p} onChanged={onMutated} />}
      {tab === 'history' && <HistoryTab p={p} />}
    </Card>
  );
}