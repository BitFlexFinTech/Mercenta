import { useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { Card, Badge, Button } from '@/components/ui';
import { cn } from '@/utils/cn';
import {
  demoApplications,
  updateApplicationStatus,
  addApprovedBrand,
  approvedApplicationBrands,
} from '@/data/applicationStore';
import { createMockMailClient } from '@/lib/mail/mail';
import type { BrandApplication, ApplicationStatus } from '@/types';
import {
  Search, CheckCircle2, XCircle, MessageSquare,
  Flag, UserPlus, ExternalLink, Clock,
} from 'lucide-react';

const STATUS_FILTERS: (ApplicationStatus | 'all')[] = ['all','pending','flagged','info_requested','approved','rejected'];
const STATUS_LABELS: Record<string, string> = { all:'All', pending:'Pending', flagged:'Flagged', info_requested:'Info Requested', approved:'Approved', rejected:'Rejected' };
const LINK_ICONS: Record<string, {icon:string;color:string;label:string}> = {
  verified:{icon:'\u2705',color:'text-emerald-400',label:'Verified'},
  unreachable:{icon:'\u274c',color:'text-red-400',label:'Unreachable'},
  no_content:{icon:'\u274c',color:'text-red-400',label:'No content'},
  not_found:{icon:'\u274c',color:'text-red-400',label:'Not found'},
  unverified_manual_check:{icon:'\u26a0\ufe0f',color:'text-amber-400',label:'Unverified \u2014 manual check needed'},
};
const PRODUCT_CATS = ['Health & Personal Care','Home','Baby','Office Products','Kitchen','Consumer Electronics','Automotive','Grocery','Apparel','Personal Computer','Other'];
const SOURCE_OPTS = ['Embassy Referral','Direct Outreach','Inbound Application','Partnership','Other'];
const mailClient = createMockMailClient();

function LinkStatus({status}: {status:string|null}) {
  if (!status) return <span className="text-xs text-zinc-600">Not provided</span>;
  const info = LINK_ICONS[status];
  if (!info) return <span className="text-xs text-zinc-400">{status}</span>;
  return <span className={cn("text-xs",info.color)}>{info.icon} {info.label}</span>;
}
function ManualBrandForm({onDone}:{onDone:()=>void}) {
  const {actingStaff} = useApp();
  const [cn,setCn]=useState('');const[ct,setCt]=useState('');const[em,setEm]=useState('');
  const[co,setCo]=useState('');const[cat,setCat]=useState(PRODUCT_CATS[0]);
  const[sk,setSk]=useState('');const[wu,setWu]=useState('');const[ig,setIg]=useState('');
  const[fb,setFb]=useState('');const[notes,setNotes]=useState('');
  const[track,setTrack]=useState<'direct_fulfillment'|'financed'>('direct_fulfillment');
  const[src,setSrc]=useState(SOURCE_OPTS[0]);const[err,setErr]=useState('');const[busy,setBusy]=useState(false);

  const submit=async()=>{
    setErr('');
    if(!cn.trim()||!ct.trim()||!em.trim()||!co.trim()){setErr('Required fields missing.');return;}
    setBusy(true);
    const bid=`brand-manual-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    addApprovedBrand({id:bid,name:cn.trim(),category:cat,country:co.trim(),email:em.trim(),signatory:ct.trim(),track});
    await mailClient.sendEmail({to:em.trim(),subject:'Welcome to Mercenta Partners',text:`Hi ${ct.trim()},\\n\\nYour brand account is ready. Log in at: https://mercenta.co.uk`});
    const adm=actingStaff?.name??'Admin';
    console.log(`[audit] Brand ${cn.trim()} created manually by ${adm} via ${src}`);
    setBusy(false);onDone();
  };

  return(<div className="space-y-4">
    {err&&<div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">{err}</div>}
    <div className="grid grid-cols-2 gap-4">
      <div><label className="block text-xs font-medium text-zinc-400 mb-1.5">Company Name *</label><input type="text" value={cn} onChange={e=>setCn(e.target.value)} className="w-full bg-zinc-900 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white" placeholder="Brand legal name"/></div>
      <div><label className="block text-xs font-medium text-zinc-400 mb-1.5">Contact Name *</label><input type="text" value={ct} onChange={e=>setCt(e.target.value)} className="w-full bg-zinc-900 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white" placeholder="Primary contact"/></div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div><label className="block text-xs font-medium text-zinc-400 mb-1.5">Email *</label><input type="email" value={em} onChange={e=>setEm(e.target.value)} className="w-full bg-zinc-900 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white" placeholder="brand@example.com"/></div>
      <div><label className="block text-xs font-medium text-zinc-400 mb-1.5">Country *</label><input type="text" value={co} onChange={e=>setCo(e.target.value)} className="w-full bg-zinc-900 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white" placeholder="e.g. Zimbabwe"/></div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div><label className="block text-xs font-medium text-zinc-400 mb-1.5">Category</label><select value={cat} onChange={e=>setCat(e.target.value)} className="w-full bg-zinc-900 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white">{PRODUCT_CATS.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
      <div><label className="block text-xs font-medium text-zinc-400 mb-1.5">SKUs</label><input type="number" value={sk} onChange={e=>setSk(e.target.value)} className="w-full bg-zinc-900 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white" placeholder="0"/></div>
    </div>
    <div><label className="block text-xs font-medium text-zinc-400 mb-1.5">Website</label><input type="text" value={wu} onChange={e=>setWu(e.target.value)} className="w-full bg-zinc-900 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white" placeholder="https://..."/></div>
    <div className="grid grid-cols-2 gap-4">
      <div><label className="block text-xs font-medium text-zinc-400 mb-1.5">Instagram</label><input type="text" value={ig} onChange={e=>setIg(e.target.value)} className="w-full bg-zinc-900 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white" placeholder="https://instagram.com/..."/></div>
      <div><label className="block text-xs font-medium text-zinc-400 mb-1.5">Facebook</label><input type="text" value={fb} onChange={e=>setFb(e.target.value)} className="w-full bg-zinc-900 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white" placeholder="https://facebook.com/..."/></div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div><label className="block text-xs font-medium text-zinc-400 mb-1.5">Fulfillment Track</label><select value={track} onChange={e=>setTrack(e.target.value as 'direct_fulfillment'|'financed')} className="w-full bg-zinc-900 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white"><option value="direct_fulfillment">Direct</option><option value="financed">Financed</option></select></div>
      <div><label className="block text-xs font-medium text-zinc-400 mb-1.5">Source</label><select value={src} onChange={e=>setSrc(e.target.value)} className="w-full bg-zinc-900 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white">{SOURCE_OPTS.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
    </div>
    <div><label className="block text-xs font-medium text-zinc-400 mb-1.5">Internal Notes</label><textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} className="w-full bg-zinc-900 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 resize-none" placeholder="Admin-only notes..."/></div>
    <div className="flex gap-2"><Button onClick={submit} disabled={busy}><UserPlus className="w-4 h-4"/>{busy?'Creating...':'Create Brand Account'}</Button><Button variant="ghost" onClick={onDone}>Cancel</Button></div>
  </div>);
}
export function ApplicationsPanel() {
  const {actingStaff,canCurrentUserMutate}=useApp();
  const [filter,setFilter]=useState<ApplicationStatus|'all'>('all');
  const [search,setSearch]=useState('');
  const [showManual,setShowManual]=useState(false);
  const [key,setKey]=useState(0);
  const [msg,setMsg]=useState('');

  const refresh=()=>setKey(k=>k+1);

  const apps=demoApplications.filter(a=>{
    if(filter!=='all'&&a.status!==filter)return false;
    if(search&&!a.companyName.toLowerCase().includes(search.toLowerCase()))return false;
    return true;
  });

  const handleAction=async(appId:string,action:ApplicationStatus,notes?:string)=>{
    const app=demoApplications.find(a=>a.id===appId);
    if(!app)return;
    const adm=actingStaff?.name??'Super Admin';
    updateApplicationStatus(appId,action,adm,notes!==undefined?notes:undefined);
    if(action==='approved'){
      addApprovedBrand({id:`brand-app-${app.id}`,name:app.companyName,category:app.category,country:app.country,
        email:`${app.companyName.toLowerCase().replace(/\\s+/g,'.')}@example.com`,signatory:app.companyName,track:'direct_fulfillment'});
      await mailClient.sendEmail({to:`${app.companyName.toLowerCase().replace(/\\s+/g,'.')}@example.com`,
        subject:'Your Mercenta Partners application has been approved',
        text:`Dear ${app.companyName},\\n\\nYour application has been approved! Log in at: https://mercenta.co.uk`});
      setMsg(`${app.companyName} approved`);
    }else if(action==='rejected'){
      await mailClient.sendEmail({to:`${app.companyName.toLowerCase().replace(/\\s+/g,'.')}@example.com`,
        subject:'Update on your Mercenta Partners application',
        text:`Dear ${app.companyName},\\n\\nThank you for your interest. We're not able to onboard your brand at this time.`});
      setMsg(`${app.companyName} rejected`);
    }else if(action==='info_requested'&&notes){
      await mailClient.sendEmail({to:`${app.companyName.toLowerCase().replace(/\\s+/g,'.')}@example.com`,
        subject:'Additional information required',
        text:`Dear ${app.companyName},\\n\\nWe need: ${notes}`});
      setMsg(`Info requested from ${app.companyName}`);
    }else if(action==='flagged'){
      setMsg(`${app.companyName} flagged for review`);
    }
    refresh();setTimeout(()=>setMsg(''),4000);
  };

  if(showManual){
    return(<Card title="Add Brand Manually" subtitle="Create a brand account directly (bypasses application form)">
      <div className="p-5"><ManualBrandForm onDone={()=>{setShowManual(false);refresh()}}/></div>
    </Card>);
  }
return(<div className="space-y-4">
    <div className="flex items-center justify-between">
      <h2 className="text-sm font-semibold text-white">Brand Applications ({demoApplications.length})</h2>
      <Button onClick={()=>setShowManual(true)}><UserPlus className="w-4 h-4"/> + Add Brand Manually</Button>
    </div>
    {msg&&<div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-sm text-emerald-400">{msg}</div>}
    <div className="flex flex-wrap gap-1">
      {STATUS_FILTERS.map(f=>(
        <button key={f} onClick={()=>setFilter(f)}
          className={cn('px-3 py-1.5 text-xs rounded-lg transition-colors',filter===f?'bg-brass-500/20 text-brass-400 border border-brass-500/30':'text-zinc-400 hover:text-white bg-white/[0.04] border border-transparent')}>
          {STATUS_LABELS[f]}
        </button>
      ))}
    </div>
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600"/>
      <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by company name..."
        className="w-full bg-zinc-900 border border-white/[0.08] rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brass-500/40"/>
    </div>
    {apps.length===0?(<div className="text-center py-12 text-zinc-500 text-sm">No applications found.</div>):(
      <div className="space-y-3">{apps.map(app=>(
        <Card key={app.id}>
          <div className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div><h3 className="text-sm font-semibold text-white">{app.companyName}</h3><p className="text-xs text-zinc-500">{app.country} · {app.category}</p></div>
              <Badge className={cn('text-[10px]',app.status==='pending'?'bg-blue-500/15 text-blue-300 border-blue-500/20':app.status==='flagged'?'bg-amber-500/15 text-amber-300 border-amber-500/20':app.status==='info_requested'?'bg-purple-500/15 text-purple-300 border-purple-500/20':app.status==='approved'?'bg-emerald-500/15 text-emerald-300 border-emerald-500/20':'bg-red-500/15 text-red-300 border-red-500/20')}>{STATUS_LABELS[app.status]}</Badge>
            </div>
            <div className="grid grid-cols-3 gap-4 text-xs mb-3">
              <div><span className="text-zinc-600">SKUs:</span><span className="text-zinc-300 ml-1">{app.skuCount??'N/A'}</span></div>
              <div><span className="text-zinc-600">Revenue:</span><span className="text-zinc-300 ml-1">{app.monthlyRevenue??'N/A'}</span></div>
              <div><span className="text-zinc-600">Submitted:</span><span className="text-zinc-300 ml-1">{new Date(app.createdAt).toLocaleDateString()}</span></div>
            </div>
            {app.description&&<p className="text-xs text-zinc-400 mb-3 line-clamp-2">{app.description}</p>}
            <div className="flex flex-wrap gap-3 mb-3">
              {app.websiteUrl&&<span className="flex items-center gap-1 text-xs text-blue-400"><ExternalLink className="w-3 h-3"/> Website <LinkStatus status={app.websiteStatus}/></span>}
              {app.instagramUrl&&<span className="flex items-center gap-1 text-xs text-pink-400"><ExternalLink className="w-3 h-3"/> Instagram <LinkStatus status={app.instagramStatus}/></span>}
              {app.facebookUrl&&<span className="flex items-center gap-1 text-xs text-blue-400"><ExternalLink className="w-3 h-3"/> Facebook <LinkStatus status={app.facebookStatus}/></span>}
            </div>
            {app.referralSource&&<p className="text-[10px] text-zinc-600 mb-3">Heard via: {app.referralSource}</p>}
            {app.adminNotes&&(
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-2 mb-3">
                <p className="text-[10px] text-amber-300/80 font-medium mb-0.5">Admin notes:</p>
                <p className="text-xs text-zinc-400">{app.adminNotes}</p>
              </div>
            )}
            {(app.status==='pending'||app.status==='flagged'||app.status==='info_requested')&&(
              <div className="flex flex-wrap gap-2 pt-3 border-t border-white/[0.06]">
                <Button size="sm" className="text-[10px]" disabled={!canCurrentUserMutate} onClick={()=>handleAction(app.id,'approved')}><CheckCircle2 className="w-3 h-3"/> Approve</Button>
                <Button size="sm" className="text-[10px]" variant="danger" disabled={!canCurrentUserMutate} onClick={()=>handleAction(app.id,'rejected')}><XCircle className="w-3 h-3"/> Reject</Button>
                <Button size="sm" className="text-[10px]" variant="secondary" disabled={!canCurrentUserMutate} onClick={()=>{const n=prompt('What additional information do you need?');if(n)handleAction(app.id,'info_requested',n);}}><MessageSquare className="w-3 h-3"/> Request Info</Button>
                <Button size="sm" className="text-[10px]" variant="ghost" disabled={!canCurrentUserMutate} onClick={()=>{const n=prompt('Add internal notes:');if(n)handleAction(app.id,'flagged',n);}}><Flag className="w-3 h-3"/> Flag for Review</Button>
              </div>
            )}
          </div>
        </Card>
      ))}</div>
    )}
  </div>);
}
