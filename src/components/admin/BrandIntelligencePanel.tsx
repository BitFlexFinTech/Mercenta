/* Brand Intel panel — canonical store-backed universe + lifecycle controls. */
import { useState, useMemo, useEffect } from 'react';
import { Card, Badge, Input, Button } from '@/components/ui';
import { cn } from '@/utils/cn';
import { createBrandIntelligenceClient } from '@/lib/intelligence/brandIntelligenceClient';
import { ProspectDetailPanel } from './ProspectDetailPanel';
import { ensureProspectStore, getProspects, getRuns, getChanges } from '@/data/prospectStore';
import { useCanonicalStoreVersion } from '@/data/queries';
import { runBrandIntelligence, getPipelineStatus, requalifyProspect } from '@/lib/intelligence/prospectLifecycle';
import type { IntelligenceRun, ProspectChangeEvent } from '@/types';
import { Target, TrendingUp, Users, AlertTriangle, Search, Play, History, ShieldBan } from 'lucide-react';

const cl = createBrandIntelligenceClient();
const TB: Record<string,string> = {tier_1:'bg-emerald-500/15 text-emerald-300',tier_2:'bg-blue-500/15 text-blue-300',tier_3:'bg-amber-500/15 text-amber-300',tier_4:'bg-zinc-500/15 text-zinc-400',unscored:'bg-zinc-500/5 text-zinc-600'};
const TL: Record<string,string> = {tier_1:'Attack Now',tier_2:'High Prob',tier_3:'Upside',tier_4:'Reserve',unscored:'Below'};
const AO = ['DIRECT_AMAZON_RETAIL','AMAZON_PRESENT_BUT_UNCLEAR','MARKETPLACE_HEAVY','MARKETPLACE_ONLY_OBSERVED','NO_CURRENT_OFFER','UNKNOWN'];
function bs(p:any):string{if(!p.asins?.length)return'UNKNOWN';return p.asins.reduce((b:string,a:any)=>AO.indexOf(a.amazonOfferClass)<AO.indexOf(b)?a.amazonOfferClass:b,p.asins[0].amazonOfferClass);}

export function BrandIntelligencePanel() {
  const [q,sQ]=useState('');const[cf,sCf]=useState('');const[tf,sTf]=useState('');const[sel,sSel]=useState<any>(null);
  const[sf,sSf]=useState<'score'|'brand'>('score');const[sd,sSd]=useState<'asc'|'desc'>('desc');
  const[pros,sPros]=useState<any[]>([]);const[load,sLoad]=useState(true);
  const[runs,sRuns]=useState<IntelligenceRun[]>([]);const[stat,sStat]=useState<any>(null);const[running,sRunning]=useState(false);const[exp,sExp]=useState<string|null>(null);const[msg,sMsg]=useState('');
  useEffect(()=>{ensureProspectStore();sPros(getProspects());sRuns(getRuns());sStat(getPipelineStatus());sLoad(false);},[]);
  // §Phase C — re-read the canonical universe whenever it changes (e.g. the
  // acquisition workflow advanced a prospect's outreach status).
  const storeVersion=useCanonicalStoreVersion();
  useEffect(()=>{sPros(getProspects());sRuns(getRuns());sStat(getPipelineStatus());},[storeVersion]);
const dash=useMemo(()=>cl.getDashboard(pros),[pros]);const cats=useMemo(()=>[...new Set(pros.map((p:any)=>p.category))].sort(),[pros]);
const filtered=useMemo(()=>{let r=pros.filter((p:any)=>!p.disqualified);if(q){const lq=q.toLowerCase();r=r.filter((p:any)=>p.brand.toLowerCase().includes(lq)||p.category.toLowerCase().includes(lq));}if(cf)r=r.filter((p:any)=>p.category===cf);if(tf)r=r.filter((p:any)=>p.score.tier===tf);r.sort((a:any,b:any)=>sf==='score'?(sd==='desc'?b.score.total-a.score.total:a.score.total-b.score.total):a.brand.localeCompare(b.brand));return r;},[pros,q,cf,tf,sf,sd]);
const ts=(f:'score'|'brand')=>{if(sf===f)sSd(d=>d==='desc'?'asc':'desc');else{sSf(f);sSd('desc');}};
const refresh=()=>{sPros(getProspects());sRuns(getRuns());sStat(getPipelineStatus());};
const runDiscovery=async()=>{if(running)return;sRunning(true);sMsg('');try{const{run}=await runBrandIntelligence({trigger:'manual'});refresh();sExp(run.runId);sMsg(`Run ${run.runId}: ${run.summary}`);}catch(e){sMsg('Run failed: '+String(e));}finally{sRunning(false)}};
const changesByRun=(id:string)=>getChanges().filter((c:any)=>c.runId===id);
const handleRequalify=(id:string,brand:string)=>{if(requalifyProspect(id,'Requalified by operator')){sMsg(`${brand} requalified.`);}refresh();};
const dqPros=pros.filter((p:any)=>p.disqualified);
if(load)return<div className="p-6 text-zinc-500 text-sm">Loading...</div>;
const KP = [{l:'Tracked',v:dash.totalBrandsTracked,ic:Users,c:'text-blue-400'},{l:'T1',v:dash.tier1Count,ic:Target,c:'text-emerald-400'},{l:'T2',v:dash.tier2Count,ic:TrendingUp,c:'text-blue-400'},{l:'Gaps',v:dash.distributorGaps,ic:AlertTriangle,c:'text-amber-400'},{l:'Pri',v:dash.highPriorityCount,ic:Users,c:'text-brass-400'}];
return<div className="space-y-4">
  <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-brass-500/15 flex items-center justify-center"><Target className="w-5 h-5 text-brass-400"/></div><div><h2 className="text-lg font-semibold text-white">Brand Intelligence</h2><p className="text-xs text-zinc-500">{dash.totalBrandsTracked} tracked.</p></div></div>
  <div className="grid grid-cols-5 gap-2">{KP.map(k=>{const Ic=k.ic;return<Card key={k.l} className="p-2"><div className="flex items-center gap-1 mb-0.5"><Ic className={cn('w-3 h-3',k.c)}/><span className="text-[10px] uppercase text-zinc-500">{k.l}</span></div><span className={cn('text-xl font-bold',k.c)}>{k.v}</span></Card>;})}</div>
  <Card className="p-3">
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div className="min-w-0">
        <p className="text-[10px] uppercase text-zinc-500">Pipeline Control</p>
        <p className="text-xs text-zinc-400 mt-0.5">Runs the discovery engine over the canonical universe (empty candidate intake — deterministic re-check; new discoveries are recorded only when genuinely surfaced).{stat?.nextScheduledCheck?` Next check ${stat.nextScheduledCheck.slice(0,10)}.`:''}</p>
      </div>
      <Button onClick={runDiscovery} disabled={running} className="text-xs"><Play className={cn('w-3 h-3',running?'':'text-brass-400')} />{running?'Scanning…':'Run discovery'}</Button>
    </div>
    {msg?<p className="text-[11px] text-brass-300 mt-1.5 font-mono truncate" data-run-status="1">{msg}</p>:null}
  </Card>
  <Card className="p-0">
    <h3 className="px-3 py-2 text-xs font-semibold text-white uppercase flex items-center gap-2"><History className="w-3.5 h-3.5 text-zinc-400" />Run History <Badge className="text-[9px] bg-ink-850 text-zinc-400">{runs.length}</Badge></h3>
    {runs.length===0?<p className="px-3 py-4 text-xs text-zinc-600">No runs recorded yet.</p>:(
    <div className="divide-y divide-white/[0.05]">
      {[...runs].reverse().slice(0,10).map(r=>{
        const open=exp===r.runId;
        const chvs=changesByRun(r.runId) as ProspectChangeEvent[];
        return <div key={r.runId}>
          <button className="w-full flex items-center justify-between px-3 py-1.5 text-left" onClick={()=>sExp(open?null:r.runId)}>
            <span className="text-[11px] font-mono text-zinc-300">{r.runId}</span>
            <span className="text-[10px] text-zinc-500 uppercase">{r.trigger} · {r.completedAt.slice(0,16).replace('T',' ')}</span>
          </button>
          <div className="flex flex-wrap gap-2 px-3 pt-0.5">
            <span className="text-[10px] text-zinc-500">scan {r.scannedCount}</span>
            <span className="text-[10px] text-emerald-400">+{r.newCount} new</span>
            <span className="text-[10px] text-blue-400">{r.updatedCount} upd</span>
            <span className="text-[10px] text-amber-400">{r.disqualifiedCount} dq</span>
            <span className="text-[10px] text-zinc-600">{r.unchangedCount} same</span>
          </div>
          {open&&<div className="px-3 pb-1.5 space-y-0.5">{chvs.map(c=><p key={c.id} className="text-[10px] font-mono text-zinc-400">· {c.brand} — {c.changeType}{c.field?` (${c.field})`:''}: {c.summary}</p>)}</div>}
        </div>;
      })}
    </div>)}
  </Card>
  <Card className="p-3">
    <h3 className="text-xs font-semibold text-white uppercase flex items-center gap-2"><ShieldBan className="w-3.5 h-3.5 text-amber-400" />Disqualified <Badge className="text-[9px] bg-amber-500/15 text-amber-300">{dqPros.length}</Badge></h3>
    <p className="text-[10px] text-zinc-500 mt-1">Manually or engine-disqualified prospects remain tracked and can be re-qualified. Disqualifications survive re-runs.</p>
    {dqPros.length===0?<p className="text-xs text-zinc-600 mt-2">None.</p>:
    <div className="mt-1.5 space-y-1">{dqPros.map((p:any)=><div key={p.id} className="flex items-center justify-between gap-2 bg-ink-850 border border-white/[0.06] rounded-lg px-2 py-1.5">
      <div className="min-w-0 flex-1"><span className="text-xs font-medium text-zinc-300">{p.brand}</span><p className="text-[10px] text-amber-300/80 font-mono truncate">{p.disqualificationReason||'Disqualified'}</p></div>
      <Button variant="tertiary" className="text-[10px] px-2 py-1" onClick={()=>handleRequalify(p.id,p.brand)}>Requalify</Button>
    </div>)}</div>}
  </Card>
  <div className="flex items-center gap-2"><Input value={q} onChange={e=>sQ(e.target.value)} placeholder="Search..." className="text-xs py-1 w-40"/><select value={cf} onChange={e=>sCf(e.target.value)} className="bg-ink-850 border rounded px-2 py-1 text-xs"><option value="">All</option>{cats.map(c=><option key={c} value={c}>{c}</option>)}</select><select value={tf} onChange={e=>sTf(e.target.value)} className="bg-ink-850 border rounded px-2 py-1 text-xs"><option value="">All</option><option value="tier_1">T1</option><option value="tier_2">T2</option><option value="tier_3">T3</option><option value="tier_4">T4</option></select><span className="text-xs text-zinc-600">{filtered.length}</span></div>
  <Card className="p-0 overflow-x-auto"><table className="w-full text-xs" data-testid="bi-prospect-table">
    <thead><tr className="border-b bg-ink-850/50"><th className="px-2 py-1.5 text-left text-zinc-500">#</th><th className="px-2 py-1.5 text-left text-zinc-500 cursor-pointer" onClick={()=>ts('brand')}>Brand</th><th className="px-2 py-1.5 text-left text-zinc-500">Cat</th><th className="px-2 py-1.5 text-left text-zinc-500 cursor-pointer" onClick={()=>ts('score')}>Score</th><th className="px-2 py-1.5 text-left text-zinc-500">Tier</th>{['D','PO','G','Dist','Acc','Fit','Amz','Distrib','Ctc'].map(h=><th key={h} className="px-2 py-1.5 text-left text-zinc-500">{h}</th>)}</tr></thead>
    <tbody>{filtered.map((p:any,i:number)=><tr key={p.id} onClick={()=>sSel(p)} className="border-b cursor-pointer hover:bg-white/[0.03]">
      <td className="px-2 py-1 text-zinc-500">{i+1}</td>
      <td className="px-2 py-1 font-medium text-white">{p.brand}</td>
      <td className="px-2 py-1 text-zinc-400 text-[10px]">{p.category}</td>
      <td className="px-2 py-1"><span className={cn('font-bold',p.score.total>=80?'text-emerald-400':p.score.total>=70?'text-blue-400':'text-zinc-500')}>{p.score.total}</span></td>
      <td className="px-2 py-1"><Badge className={cn('text-[9px]',TB[p.score.tier])}>{TL[p.score.tier]}</Badge></td>
      <td className="px-2 py-1 text-zinc-300 text-[10px]">{p.score.amazonDemand}</td>
      <td className="px-2 py-1 text-zinc-300 text-[10px]">{p.score.poPotential}</td>
      <td className="px-2 py-1 text-zinc-300 text-[10px]">{p.score.growth}</td>
      <td className="px-2 py-1 text-zinc-300 text-[10px]">{p.score.distributionOpenness}</td>
      <td className="px-2 py-1 text-zinc-300 text-[10px]">{p.score.acceptanceProbability}</td>
      <td className="px-2 py-1 text-zinc-300 text-[10px]">{p.score.mercentaFit}</td>
      <td className="px-2 py-1"><span className={cn('text-[9px] px-1 py-0.5 rounded',bs(p)==='DIRECT_AMAZON_RETAIL'?'bg-emerald-500/15 text-emerald-300':bs(p)==='AMAZON_PRESENT_BUT_UNCLEAR'?'bg-amber-500/15 text-amber-300':'bg-zinc-500/10 text-zinc-500')}>{bs(p).slice(0,10).replace(/_/g,' ')}</span></td>
      <td className="px-2 py-1 text-zinc-400 text-[9px]">{p.distributors[0]?.company?.slice(0,12)||'\u2014'}</td>
      <td className="px-2 py-1 text-zinc-400 text-[9px]">{p.contacts[0]?.name?.split(' ')[0]||'\u2014'}</td>
    </tr>)}
    {filtered.length===0&&<tr><td colSpan={14} className="py-8 text-center text-zinc-600">No matches</td></tr>}</tbody>
  </table></Card>
  {sel&&<ProspectDetailPanel prospect={sel} onClose={()=>sSel(null)} onMutated={refresh}/>}
</div>;
}
  