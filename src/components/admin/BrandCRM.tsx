import { useState } from 'react';
import { useBrands, useContracts, usePurchaseOrders as usePOsHook, useComplianceDocuments as useCompDocsHook, useBrandAgreements } from '@/data/queries';
import { renameBrand, setBrandTrack } from '@/data/api';
import { APPROVED_CATEGORIES } from '@/types';
import { Badge, Button, Card, StatusBadge } from '@/components/ui';
import { complianceDocStatusPresentation, contractStatusPresentation, poStatusPresentation } from '@/lib/statusPresentation';
import { BrandCommPanel } from '@/components/shared/BrandComm';
import { BrandCrmDepth } from '@/components/admin/BrandCrmDepth';
import { AcquisitionRelationships } from '@/components/admin/AcquisitionRelationships';
import { cn } from '@/utils/cn';
import { Users, Edit3, Route, Shield, MessageSquare, X, Download, FileText } from 'lucide-react';
import { demoProfileChangeRequests, reviewProfileChangeRequest } from '@/data/api';
import { useApp } from '@/context/GlobalStateContext';
import { downloadCsv } from '@/lib/csv';

function ChangeRequestReview({ brandId }: { brandId: string }) {
  const { actingStaffId, canCurrentUserMutate } = useApp();
  const [version, setVersion] = useState(0);
  void version;
  const pending = demoProfileChangeRequests.filter(function(r) { return r.brandId === brandId && r.status === 'pending'; });
  if (pending.length === 0) return null;
  return (
    <Card title="Change Requests">
      <div className="px-1 pb-1 space-y-2">{pending.map(function(r) { return (
        <div key={r.id} className="border border-white/[0.06] rounded-lg p-2">
          <p className="text-[11px] text-zinc-200">{r.field}: {r.currentValue || '(empty)'} → {r.requestedValue}</p>
          <p className="text-[10px] text-zinc-500">Reason: {r.reason}</p>
          <div className="flex gap-2 mt-1">
            <Button className="text-[10px]" disabled={!canCurrentUserMutate} onClick={function() { reviewProfileChangeRequest(r.id, true, actingStaffId); setVersion(function(v) { return v + 1; }); }}>Approve</Button>
            <Button className="text-[10px]" disabled={!canCurrentUserMutate} onClick={function() { reviewProfileChangeRequest(r.id, false, actingStaffId, 'Rejected'); setVersion(function(v) { return v + 1; }); }}>Reject</Button>
          </div>
        </div>
      );})}</div>
    </Card>
  );
}
export function BrandCRM() {
  const brandsQuery = useBrands();
  const contractsQuery = useContracts();
  const poQuery = { data: usePOsHook().data?.data ?? [] };
  const complianceDocs = useCompDocsHook().data?.data ?? [];
  const brandAgreementsQuery = useBrandAgreements();
  const brands = brandsQuery.data?.data ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [trackDraft, setTrackDraft] = useState<'direct_fulfillment' | 'financed'>('financed');
  const [overrideReason, setOverrideReason] = useState('');
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [brandQuery, setBrandQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const selected = brands.find(function(b) { return b.id === selectedId; }) ?? null;
  const brandContracts = selected ? (contractsQuery.data?.data ?? []).filter(function(c) { return c.brandId === selected.id; }) : [];
  const brandPOs = selected ? poQuery.data.filter(function(p) { return p.brandId === selected.id; }) : [];
  const brandDocs = selected ? complianceDocs.filter(function(d) { return d.brandId === selected.id; }) : [];
  const brandAgreements = selected ? (brandAgreementsQuery.data?.data ?? []).filter(function(a) { return a.brandId === selected.id; }) : [];
  function selectBrand(id: string) {
    setSelectedId(id); setActiveSection(null); setSavedNote(null);
    const b = brands.find(function(x) { return x.id === id; });
    setNameDraft(b?.profile.businessName ?? '');
    setTrackDraft((b?.track as 'direct_fulfillment' | 'financed') ?? 'financed');
    setOverrideReason('');
  }
  const allCats = ['all', ...APPROVED_CATEGORIES];
  const filtered = brands.filter(function(b) { return (categoryFilter === 'all' || b.category === categoryFilter) && (!brandQuery.trim() || b.profile.businessName.toLowerCase().includes(brandQuery.toLowerCase())); });
  const sections = selected ? [
    { id: 'detail', label: 'Brand Detail', icon: Edit3 },
    { id: 'fulfillment', label: 'Fulfillment Track', icon: Route },
    { id: 'compliance', label: 'Compliance', icon: Shield },
    { id: 'agreements', label: 'Agreements', icon: FileText },
    { id: 'history', label: 'History', icon: Users },
    { id: 'contact', label: 'Contact', icon: MessageSquare },
    { id: 'crm_depth', label: 'CRM Tools', icon: Users },
  ] : [];
  return (
    <div className="p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3"><Users className="w-5 h-5 text-brass-400" /><div><h2 className="text-lg font-semibold text-white">Brand CRM</h2><p className="text-xs text-zinc-500 mt-0.5">Card-based layout</p></div>
        <div className="ml-auto">
          <Button className="text-[10px]" variant="ghost" onClick={function() { downloadCsv('brands.csv', ['Name', 'Category', 'Track', 'Contract'], filtered.map(function(b) { return [b.profile.businessName, b.category, b.track, b.contractStatus]; })); }}>
            <Download className="w-3 h-3 mr-1" /> Export CSV
          </Button>
        </div>
      </div>
      {/* §Phase C — pre-onboarding acquisition relationships (same canonical context) */}
      <AcquisitionRelationships />
      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 md:col-span-4 p-0 overflow-hidden">
          <div className="p-3 border-b border-white/[0.06] space-y-2">
            <input type="text" value={brandQuery} onChange={function(e) { setBrandQuery(e.target.value); }} placeholder="Search brands" className="w-full bg-ink-900 border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white" />
            <div className="flex flex-wrap gap-1 text-[9px]">{allCats.map(function(c) { return (<button key={c} onClick={function() { setCategoryFilter(c); }} className={cn('px-1.5 py-0.5 rounded', categoryFilter === c ? 'bg-brass-500/20 text-brass-300' : 'text-zinc-500 hover:text-white')}>{c === 'all' ? 'All' : c}</button>);})}</div>
          </div>
          <div className="max-h-[500px] overflow-y-auto divide-y divide-white/[0.04]">{filtered.map(function(b) { return (<button key={b.id} onClick={function() { selectBrand(b.id); }} className={cn('w-full text-left px-3 py-2.5', selectedId === b.id ? 'bg-brass-500/10' : 'hover:bg-white/[0.02]')}><div className="text-xs font-medium text-white">{b.profile.businessName}</div><div className="text-[9px] text-zinc-500 mt-0.5">{b.category}</div></button>);})}</div>
        </Card>
        <div className="col-span-12 md:col-span-8 space-y-3">
          {!selected && <Card className="p-8 text-center"><p className="text-xs text-zinc-600">Select a brand.</p></Card>}
          {selected && !activeSection && (<><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{sections.map(function(s) { const Icon = s.icon; return (<button key={s.id} onClick={function() { setActiveSection(s.id); }} className="bg-ink-850 border border-white/[0.06] hover:border-brass-500/40 rounded-xl p-3.5 text-left"><Icon className="w-4 h-4 text-brass-400 inline" /><span className="text-xs font-medium text-white ml-1.5">{s.label}</span></button>);})}</div><ChangeRequestReview brandId={selected.id} /></>)}
          {selected && activeSection && (<Card className="p-4"><div className="flex items-center justify-between mb-3 border-b border-white/[0.06] pb-2"><span className="text-sm font-semibold text-white">{sections.find(function(s) { return s.id === activeSection; })?.label}</span><button onClick={function() { setActiveSection(null); }} className="text-zinc-500 hover:text-white"><X className="w-3.5 h-3.5" /></button></div>
            {activeSection === 'detail' && (<div className="space-y-2"><div className="flex items-center gap-2"><input type="text" value={nameDraft} onChange={function(e) { setNameDraft(e.target.value); }} className="flex-1 bg-ink-900 border border-white/[0.08] rounded px-2 py-1.5 text-xs text-white" /><Button className="text-[10px]" onClick={function() { if (nameDraft.trim() && nameDraft.trim() !== selected.profile.businessName) { renameBrand(selected.id, nameDraft.trim()); setSavedNote('Name updated.'); setTimeout(function() { setSavedNote(null); }, 3000); } }}>Rename</Button></div>{savedNote && <p className="text-[10px] text-emerald-400">{savedNote}</p>}<div className="text-[11px] space-y-1"><div className="flex justify-between"><span className="text-zinc-500">Category</span><span className="text-zinc-300">{selected.category}</span></div><div className="flex justify-between"><span className="text-zinc-500">Track</span><span className="text-zinc-300 capitalize">{selected.track.replace(/_/g, ' ')}</span></div><div className="flex justify-between"><span className="text-zinc-500">Contract</span><span className="text-zinc-300 capitalize">{selected.contractStatus.replace(/_/g, ' ')}</span></div></div><p className="text-[8px] text-zinc-700 mt-2 text-right">Admin action on behalf of brand</p></div>)}
            {activeSection === 'fulfillment' && (<div className="space-y-2"><select value={trackDraft} onChange={function(e) { setTrackDraft(e.target.value as 'direct_fulfillment' | 'financed'); }} className="bg-ink-900 border border-white/[0.08] rounded px-2 py-1.5 text-xs text-white"><option value="direct_fulfillment">Direct Fulfillment</option><option value="financed">Financed</option></select><input type="text" value={overrideReason} onChange={function(e) { setOverrideReason(e.target.value); }} placeholder="Override reason" className="bg-ink-900 border border-white/[0.08] rounded px-2 py-1.5 text-xs text-white ml-2" /><Button className="text-[10px]" onClick={function() { if (!overrideReason.trim()) { setSavedNote('Override reason is required before applying.'); setTimeout(function() { setSavedNote(null); }, 3000); return; } setBrandTrack(selected.id, trackDraft, overrideReason); setSavedNote('Track updated.'); setTimeout(function() { setSavedNote(null); }, 3000); }}>Override</Button>{savedNote && <p className="text-[10px] text-emerald-400">{savedNote}</p>}<p className="text-[8px] text-zinc-700 mt-2 text-right">Admin action on behalf of brand</p></div>)}
            {activeSection === 'compliance' && (<div className="space-y-1">{brandDocs.length === 0 ? <p className="text-xs text-zinc-600">No documents.</p> : brandDocs.map(function(d) { return (<div key={d.id} className="flex items-center justify-between border-b border-white/[0.04] py-1.5"><span className="text-xs text-zinc-300 capitalize">{d.type.replace(/_/g, ' ')}</span>{(() => { const p = complianceDocStatusPresentation(d.status); return (<StatusBadge className="text-[9px]" dataStatus={p.dataStatus} tone={p.tone}>{p.label}</StatusBadge>); })()}</div>);})}</div>)}
            {activeSection === 'agreements' && (<div className="space-y-1">{brandAgreements.length === 0 ? <p className="text-xs text-zinc-500">No agreements accepted yet.</p> : brandAgreements.map(function(a) { return (<div key={a.id} className="flex items-center justify-between border-b border-white/[0.04] py-1.5"><span className="text-xs text-zinc-300">{a.agreementType === 'logistics_sla' ? 'Logistics SLAs (§4.1)' : 'Chargeback Indemnity (§4.2)'}</span><div className="flex items-center gap-2"><Badge className="text-[9px] bg-emerald-500/15 text-emerald-300">Accepted v{a.version}</Badge><span className="text-[8px] text-zinc-600">{new Date(a.acceptedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></div></div>);})}</div>)}
            {activeSection === 'history' && (<div>{brandPOs.length > 0 && <div><p className="text-[10px] text-zinc-500 font-medium">Recent POs</p>{brandPOs.slice(0,5).map(function(po) { return (<div key={po.id} className="flex items-center justify-between text-xs border-b border-white/[0.04] py-1"><span className="font-mono text-zinc-300">{po.poNumber}</span>{(() => { const p = poStatusPresentation(po.status); return (<StatusBadge className="text-[9px]" dataStatus={p.dataStatus} tone={p.tone}>{p.label}</StatusBadge>); })()}</div>);})}</div>}{brandContracts.length > 0 && <div className="mt-2"><p className="text-[10px] text-zinc-500 font-medium">Contracts</p>{brandContracts.map(function(c) { return (<div key={c.id} className="flex items-center justify-between text-xs border-b border-white/[0.04] py-1"><span className="text-zinc-300 capitalize">{c.type.replace(/_/g, ' ')}</span>{(() => { const p = contractStatusPresentation(c.status); return (<StatusBadge className="text-[9px]" dataStatus={p.dataStatus} tone={p.tone}>{p.label}</StatusBadge>); })()}</div>);})}</div>}</div>)}
            {activeSection === 'contact' && <BrandCommPanel brandId={selected.id} brandName={selected.profile.businessName} poRef={undefined} />}
            {activeSection === 'crm_depth' && <BrandCrmDepth brandId={selected.id} />}
          </Card>)}
        </div>
      </div>
    </div>
  );
}

