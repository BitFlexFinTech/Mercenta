import { useState } from 'react';
import { useBrands, useContracts, usePurchaseOrders as usePOsHook, useComplianceDocuments as useCompDocsHook, useBrandAgreements } from '@/data/queries';
import { renameBrand, setBrandTrack } from '@/data/api';
import { APPROVED_CATEGORIES } from '@/types';
import { fulfillmentTrackLabel } from '@/config/fulfillmentTrack';
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
import {
  ContextPanel,
  MetricBand,
  RecordFieldList,
  WorkspaceFrame,
  WorkspaceHeader,
  type MetricTileData,
} from '@/components/shared/workspace';

function ChangeRequestReview({ brandId }: { brandId: string }) {
  const { actingStaffId, canCurrentUserMutate } = useApp();
  const [version, setVersion] = useState(0);
  void version;
  const pending = demoProfileChangeRequests.filter(function(r) { return r.brandId === brandId && r.status === 'pending'; });
  if (pending.length === 0) return null;
  return (
    <Card title="Change Requests">
      <div className="px-1 pb-1 space-y-2">{pending.map(function(r) { return (
        <div key={r.id} className="border border-hairline rounded-ds-md p-2">
          <p className="text-ds-label text-zinc-200">{r.field}: {r.currentValue || '(empty)'} → {r.requestedValue}</p>
          <p className="text-ds-micro text-zinc-500">Reason: {r.reason}</p>
          <div className="flex gap-2 mt-1">
            <Button className="text-ds-micro" disabled={!canCurrentUserMutate} onClick={function() { reviewProfileChangeRequest(r.id, true, actingStaffId); setVersion(function(v) { return v + 1; }); }}>Approve</Button>
            <Button className="text-ds-micro" disabled={!canCurrentUserMutate} onClick={function() { reviewProfileChangeRequest(r.id, false, actingStaffId, 'Rejected'); setVersion(function(v) { return v + 1; }); }}>Reject</Button>
          </div>
        </div>
      );})}</div>
    </Card>
  );
}
export function BrandCRM() {
  const brandsQuery = useBrands();
  const contractsQuery = useContracts();
  const posHook = usePOsHook();
  const compDocsHook = useCompDocsHook();
  const poQuery = { data: posHook.data?.data ?? [] };
  const complianceDocs = compDocsHook.data?.data ?? [];
  const brandAgreementsQuery = useBrandAgreements();
  const brands = brandsQuery.data?.data ?? [];
  /**
   * §Wave 3 Part 5 — ONE LOADING FLAG. Every read here destructured `.data`
   * only, so while the queries resolved the band asserted "0 / No active
   * contract" about a brand book it had not loaded yet (measured by
   * `validate-state-coverage.mjs`: the pending render differed from the seeded
   * one and carried no loading state).
   */
  const crmPending =
    brandsQuery.isPending || contractsQuery.isPending || posHook.isPending ||
    compDocsHook.isPending || brandAgreementsQuery.isPending;
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
  /* §Sprint 2 — the metric band's drill-downs narrow this ONE list (no second
     data source). Default cohort shows every canonical brand. */
  const [cohort, setCohort] = useState<'all' | 'with_po' | 'with_docs' | 'no_contract'>('all');
  const inCohort = function(b: typeof brands[number]) {
    if (cohort === 'all') return true;
    if (cohort === 'with_po') return poQuery.data.some(function(p) { return p.brandId === b.id; });
    if (cohort === 'with_docs') return complianceDocs.some(function(d) { return d.brandId === b.id; });
    return b.contractStatus !== 'active';
  };
  const filtered = brands.filter(function(b) { return inCohort(b) && (categoryFilter === 'all' || b.category === categoryFilter) && (!brandQuery.trim() || b.profile.businessName.toLowerCase().includes(brandQuery.toLowerCase())); });
  const brandsWithPos = brands.filter(function(b) { return poQuery.data.some(function(p) { return p.brandId === b.id; }); });
  const brandsWithDocs = brands.filter(function(b) { return complianceDocs.some(function(d) { return d.brandId === b.id; }); });
  const brandsWithoutContract = brands.filter(function(b) { return b.contractStatus !== 'active'; });
  const metrics: MetricTileData[] = [
    {
      id: 'crm-brands',
      label: 'Brands',
      value: String(brands.length),
      size: 'hero',
      tone: 'info',
      statusText: `${filtered.length} in view`,
      context: 'Canonical brand tenants on the platform',
      domain: 'catalogue',
      onOpen: function() { setCohort('all'); setCategoryFilter('all'); setBrandQuery(''); },
      testId: 'crm-metric-brands',
      valueTestId: 'crm-metric-brands-value',
    },
    {
      id: 'crm-with-po',
      label: 'With POs',
      value: String(brandsWithPos.length),
      tone: 'success',
      statusText: 'Trading',
      context: 'Brands that have raised at least one PO',
      domain: 'logistics',
      onOpen: function() { setCohort('with_po'); },
      testId: 'crm-metric-with-po',
      valueTestId: 'crm-metric-with-po-value',
    },
    {
      id: 'crm-with-docs',
      label: 'With documents',
      value: String(brandsWithDocs.length),
      tone: 'info',
      statusText: 'Compliance visible',
      context: 'Brands with compliance documents on file',
      domain: 'compliance',
      onOpen: function() { setCohort('with_docs'); },
      testId: 'crm-metric-with-docs',
      valueTestId: 'crm-metric-with-docs-value',
    },
    {
      id: 'crm-no-contract',
      label: 'No active contract',
      value: String(brandsWithoutContract.length),
      tone: brandsWithoutContract.length > 0 ? 'warning' : 'success',
      statusText: brandsWithoutContract.length > 0 ? 'Follow up' : 'All contracted',
      context: 'Brands whose contract is not active — a follow-up candidate',
      domain: 'finance',
      onOpen: function() { setCohort('no_contract'); },
      testId: 'crm-metric-no-contract',
      valueTestId: 'crm-metric-no-contract-value',
    },
  ];
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
    <WorkspaceFrame className="space-y-4">
      <WorkspaceHeader
        eyebrow="Admin Hub · CRM"
        title="Brand CRM"
        description="The canonical brand-tenant list with its contract, compliance and track state. Every admin action here is performed on behalf of the brand and attributed in the audit log."
        meta={
          <>
            <span className="font-mono text-ds-label text-zinc-500">
              {filtered.length} of {brands.length} brands
            </span>
            <span className="font-mono text-ds-label text-zinc-500">cohort: {cohort.replace(/_/g, ' ')}</span>
          </>
        }
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={brandQuery}
              onChange={function(e) { setBrandQuery(e.target.value); }}
              placeholder="Search brands"
              aria-label="Search brands"
              data-testid="crm-search"
              className="w-48 bg-ink-900 border border-hairline rounded-ds-md px-3 py-1.5 text-xs text-strong"
            />
            <div className="flex flex-wrap gap-1 text-ds-micro">
              {allCats.map(function(c) { return (<button key={c} onClick={function() { setCategoryFilter(c); }} data-testid={`crm-cat-${c}`} className={cn('px-1.5 py-0.5 rounded-ds-sm', categoryFilter === c ? 'bg-brass-500/20 text-brass-300' : 'text-zinc-500 hover:text-strong')}>{c === 'all' ? 'All' : c}</button>);})}
            </div>
          </div>
        }
        actions={
          <Button className="text-ds-micro" variant="ghost" onClick={function() { downloadCsv('brands.csv', ['Name', 'Category', 'Track', 'Contract'], filtered.map(function(b) { return [b.profile.businessName, b.category, b.track, b.contractStatus]; })); }}>
            <Download className="w-3 h-3 mr-1" /> Export CSV
          </Button>
        }
      />

      <MetricBand items={metrics} columns={4} loading={crmPending} />

      {/* §Phase C — pre-onboarding acquisition relationships (same canonical context) */}
      <AcquisitionRelationships />
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-4 space-y-3">
        <Card className="p-0 overflow-hidden">
          <div className="p-3 border-b border-hairline flex items-center justify-between">
            <span className="text-ds-micro font-semibold uppercase tracking-[0.14em] text-zinc-500">Brands</span>
            <span className="font-mono text-ds-label text-zinc-500">{filtered.length}</span>
          </div>
          <div className="max-h-[500px] overflow-y-auto divide-y divide-hairline-06">{filtered.map(function(b) { return (<button key={b.id} onClick={function() { selectBrand(b.id); }} data-testid={`crm-brand-${b.id}`} className={cn('w-full text-left px-3 py-2.5', selectedId === b.id ? 'bg-brass-500/10' : 'hover:bg-tint')}><div className="text-xs font-medium text-strong">{b.profile.businessName}</div><div className="text-ds-micro text-zinc-500 mt-0.5">{b.category}</div></button>);})}
            {filtered.length === 0 && <p className="px-3 py-4 text-ds-label text-zinc-600">No brands match the current filters.</p>}
          </div>
        </Card>
          <ContextPanel title="Portfolio context">
            <RecordFieldList
              fields={[
                { label: 'Brands', value: String(brands.length) },
                { label: 'In view', value: String(filtered.length) },
                { label: 'Category', value: categoryFilter === 'all' ? 'All approved categories' : categoryFilter },
                { label: 'Selected', value: selected ? selected.profile.businessName : 'None' },
              ]}
            />
            <p className="mt-2 text-ds-label leading-snug text-zinc-400">
              The CRM lists the same canonical tenants the PO, compliance and finance workspaces
              operate on — nothing is re-derived for this screen.
            </p>
          </ContextPanel>
        </div>
        <div className="col-span-12 md:col-span-8 space-y-3">
          {!selected && <Card className="p-8 text-center"><p className="text-xs text-zinc-600">Select a brand.</p></Card>}
          {selected && !activeSection && (<><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{sections.map(function(s) { const Icon = s.icon; return (<button key={s.id} onClick={function() { setActiveSection(s.id); }} className="bg-ink-850 border border-hairline hover:border-brass-500/40 rounded-ds-lg p-3.5 text-left"><Icon className="w-4 h-4 text-brass-400 inline" /><span className="text-xs font-medium text-strong ml-1.5">{s.label}</span></button>);})}</div><ChangeRequestReview brandId={selected.id} /></>)}
          {selected && activeSection && (<Card className="p-4"><div className="flex items-center justify-between mb-3 border-b border-hairline pb-2"><span className="text-sm font-semibold text-strong">{sections.find(function(s) { return s.id === activeSection; })?.label}</span><button onClick={function() { setActiveSection(null); }} className="text-zinc-500 hover:text-strong"><X className="w-3.5 h-3.5" /></button></div>
            {activeSection === 'detail' && (<div className="space-y-2"><div className="flex items-center gap-2"><input type="text" value={nameDraft} onChange={function(e) { setNameDraft(e.target.value); }} className="flex-1 bg-ink-900 border border-hairline rounded-ds-sm px-2 py-1.5 text-xs text-strong" /><Button className="text-ds-micro" onClick={function() { if (nameDraft.trim() && nameDraft.trim() !== selected.profile.businessName) { renameBrand(selected.id, nameDraft.trim()); setSavedNote('Name updated.'); setTimeout(function() { setSavedNote(null); }, 3000); } }}>Rename</Button></div>{savedNote && <p className="text-ds-micro text-emerald-400">{savedNote}</p>}<div className="text-ds-label space-y-1"><div className="flex justify-between"><span className="text-zinc-500">Category</span><span className="text-zinc-300">{selected.category}</span></div><div className="flex justify-between"><span className="text-zinc-500">Track</span><span className="text-zinc-300 capitalize">{selected.track.replace(/_/g, ' ')}</span></div><div className="flex justify-between"><span className="text-zinc-500">Contract</span><span className="text-zinc-300 capitalize">{selected.contractStatus.replace(/_/g, ' ')}</span></div></div><p className="text-ds-micro text-zinc-700 mt-2 text-right">Admin action on behalf of brand</p></div>)}
            {activeSection === 'fulfillment' && (<div className="space-y-2"><select value={trackDraft} onChange={function(e) { setTrackDraft(e.target.value as 'direct_fulfillment' | 'financed'); }} className="bg-ink-900 border border-hairline rounded-ds-sm px-2 py-1.5 text-xs text-strong"><option value="direct_fulfillment">{fulfillmentTrackLabel('direct_fulfillment')}</option><option value="financed">{fulfillmentTrackLabel('financed')}</option></select><input type="text" value={overrideReason} onChange={function(e) { setOverrideReason(e.target.value); }} placeholder="Override reason" className="bg-ink-900 border border-hairline rounded-ds-sm px-2 py-1.5 text-xs text-strong ml-2" /><Button className="text-ds-micro" onClick={function() { if (!overrideReason.trim()) { setSavedNote('Override reason is required before applying.'); setTimeout(function() { setSavedNote(null); }, 3000); return; } setBrandTrack(selected.id, trackDraft, overrideReason); setSavedNote('Track updated.'); setTimeout(function() { setSavedNote(null); }, 3000); }}>Override</Button>{savedNote && <p className="text-ds-micro text-emerald-400">{savedNote}</p>}<p className="text-ds-micro text-zinc-700 mt-2 text-right">Admin action on behalf of brand</p></div>)}
            {activeSection === 'compliance' && (<div className="space-y-1">{brandDocs.length === 0 ? <p className="text-xs text-zinc-600">No documents.</p> : brandDocs.map(function(d) { return (<div key={d.id} className="flex items-center justify-between border-b border-hairline py-1.5"><span className="text-xs text-zinc-300 capitalize">{d.type.replace(/_/g, ' ')}</span>{(() => { const p = complianceDocStatusPresentation(d.status); return (<StatusBadge className="text-ds-micro" dataStatus={p.dataStatus} tone={p.tone}>{p.label}</StatusBadge>); })()}</div>);})}</div>)}
            {activeSection === 'agreements' && (<div className="space-y-1">{brandAgreements.length === 0 ? <p className="text-xs text-zinc-500">No agreements accepted yet.</p> : brandAgreements.map(function(a) { return (<div key={a.id} className="flex items-center justify-between border-b border-hairline py-1.5"><span className="text-xs text-zinc-300">{a.agreementType === 'logistics_sla' ? 'Logistics SLAs (§4.1)' : 'Chargeback Indemnity (§4.2)'}</span><div className="flex items-center gap-2"><Badge className="text-ds-micro bg-emerald-500/15 text-emerald-300">Accepted v{a.version}</Badge><span className="text-ds-micro text-zinc-600">{new Date(a.acceptedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></div></div>);})}</div>)}
            {activeSection === 'history' && (<div>{brandPOs.length > 0 && <div><p className="text-ds-micro text-zinc-500 font-medium">Recent POs</p>{brandPOs.slice(0,5).map(function(po) { return (<div key={po.id} className="flex items-center justify-between text-xs border-b border-hairline py-1"><span className="font-mono text-zinc-300">{po.poNumber}</span>{(() => { const p = poStatusPresentation(po.status); return (<StatusBadge className="text-ds-micro" dataStatus={p.dataStatus} tone={p.tone}>{p.label}</StatusBadge>); })()}</div>);})}</div>}{brandContracts.length > 0 && <div className="mt-2"><p className="text-ds-micro text-zinc-500 font-medium">Contracts</p>{brandContracts.map(function(c) { return (<div key={c.id} className="flex items-center justify-between text-xs border-b border-hairline py-1"><span className="text-zinc-300 capitalize">{c.type.replace(/_/g, ' ')}</span>{(() => { const p = contractStatusPresentation(c.status); return (<StatusBadge className="text-ds-micro" dataStatus={p.dataStatus} tone={p.tone}>{p.label}</StatusBadge>); })()}</div>);})}</div>}</div>)}
            {activeSection === 'contact' && <BrandCommPanel brandId={selected.id} brandName={selected.profile.businessName} poRef={undefined} />}
            {activeSection === 'crm_depth' && <BrandCrmDepth brandId={selected.id} />}
          </Card>)}
        </div>
      </div>
    </WorkspaceFrame>
  );
}

