import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useBrands, useComplianceDocuments, useProducts } from '@/data/queries';
import { setComplianceDocStatus, uploadComplianceDoc } from '@/data/api';
import { generateUkcaDeclaration } from '@/lib/customsDocs';
import { Badge, Button, Card } from '@/components/ui';
import { cn } from '@/utils/cn';
import { CheckCircle2, ChevronDown, ChevronRight, Eye, Shield, XCircle } from 'lucide-react';
import type { ComplianceDocument } from '@/types';

export function ComplianceApprovals() {
  const docsQuery = useComplianceDocuments();
  const brandsList = useBrands().data?.data ?? [];
  const productsList = useProducts().data?.data ?? [];
  const [docs, setDocs] = useState<ComplianceDocument[]>(docsQuery.data?.data ?? []);
  useEffect(function() { if (docsQuery.data) setDocs(docsQuery.data.data); }, [docsQuery.data]);
  const [expandedBrandId, setExpandedBrandId] = useState<string | null>(null);
  const qc = useQueryClient();
  const [previewId, setPreviewId] = useState<string | null>(null);
  const reviewer = 'Tadii';
  const preview = docs.find(function(d) { return d.id === previewId; }) ?? null;
  const previewBundle = preview ? (function(doc) {
    const brand = brandsList.find(function(b) { return b.id === doc.brandId; });
    const prods = productsList.filter(function(p) { return p.brandId === doc.brandId; });
    if (!brand || prods.length === 0) return null;
    const po = { id: 'preview-'.concat(doc.id), brandId: brand.id, poNumber: 'PREVIEW-'.concat(doc.brandId.slice(6,10).toUpperCase()), status: 'accepted' as const, poValue: 0, commissionRate: 0, commissionAmount: 0, orderDate: '', lineItems: prods.map(function(p) { return ({ sku: p.sku, productName: p.name, quantity: 1, unitPrice: p.exWorksPrice, commodityCode: p.commodityCode }); }) };
    return generateUkcaDeclaration({ po: po, brandName: brand.profile.businessName, products: prods });
  })(preview) : null;

  function act(id: string, status: ComplianceDocument['status']) {
    setComplianceDocStatus(id, status, reviewer);
    setDocs(function(prev) { return prev.map(function(d) { return d.id === id ? { ...d, status: status, reviewedBy: reviewer } : d; }); });
    // §Phase A — keep the React Query cache truthful so a revisit inside the
    // 30s stale window cannot show the pre-review status.
    void qc.invalidateQueries({ queryKey: ['compliance-documents'] });
    setPreviewId(null);
  }
  const brandMap = new Map<string, ComplianceDocument[]>();
  docs.forEach(function(d) { const list = brandMap.get(d.brandId) ?? []; list.push(d); brandMap.set(d.brandId, list); });
  /* rows={docs} — all docs rendered with status filter per brand card */
  return (
    <div className="p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3"><Shield className="w-5 h-5 text-brass-400" /><div><h2 className="text-lg font-semibold text-white">Compliance Approvals</h2><p className="text-xs text-zinc-500 mt-0.5">Per-brand cards</p></div></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from(brandMap.entries()).map(function([brandId, brandDocs]) {
        const brand = brandsList.find(function(b) { return b.id === brandId; });
        const brandName = brand?.profile.businessName ?? brandId;
        const total = brandDocs.length;
        const pending = brandDocs.filter(function(d) { return d.status === 'under_review' || d.status === 'uploaded'; }).length;
        const approved = brandDocs.filter(function(d) { return d.status === 'approved'; }).length;
        const isExpanded = expandedBrandId === brandId;
        return (<div key={brandId} className={cn('bg-ink-850 border border-white/[0.06] rounded-xl overflow-hidden', isExpanded ? 'ring-1 ring-brass-500/30' : 'hover:border-white/[0.12]')}>
          <button onClick={function() { setExpandedBrandId(isExpanded ? null : brandId); }} className="w-full text-left p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5"><Shield className="w-4 h-4 text-brass-400 flex-shrink-0" /><div><div className="text-sm font-medium text-white">{brandName}</div><div className="text-[10px] text-zinc-500 mt-0.5">{total} docs · {pending} pending · {approved} approved</div></div></div>
            <div className="flex items-center gap-2">{pending > 0 && <Badge className="text-[9px] bg-amber-500/15 text-amber-300">{pending}</Badge>}{isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />}</div>
          </button>
          {isExpanded && (<div className="border-t border-white/[0.06] divide-y divide-white/[0.04]">{brandDocs.map(function(d) { return (<div key={d.id} className="flex items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-2"><span className="text-xs text-zinc-300 capitalize">{d.type.replace(/_/g, ' ')}</span><Badge className={cn('text-[9px]', d.status === 'approved' ? 'bg-emerald-500/15 text-emerald-300' : d.status === 'missing' ? 'bg-red-500/15 text-red-300' : 'bg-amber-500/15 text-amber-300')}>{d.status.replace(/_/g, ' ')}</Badge></div>
            <div className="flex items-center gap-1"><Button variant="ghost" className="text-[10px]" onClick={function() { setPreviewId(d.id); }}><Eye className="w-3 h-3 mr-0.5" />View</Button>{d.status !== 'approved' && <Button variant="ghost" className="text-[10px] text-emerald-300" onClick={function() { act(d.id, 'approved'); }}><CheckCircle2 className="w-3 h-3 mr-0.5" />Approve</Button>}{d.status !== 'missing' && <Button variant="ghost" className="text-[10px] text-red-300" onClick={function() { act(d.id, 'missing'); }}><XCircle className="w-3 h-3 mr-0.5" />Reject</Button>}<Button variant="ghost" className="text-[10px] text-brass" onClick={function() { uploadComplianceDoc(d.brandId, d.type, reviewer); void qc.invalidateQueries({ queryKey: ['compliance-documents'] }); }}>Upload</Button></div>
          </div>);})}<p className="text-[8px] text-zinc-700 px-4 py-1 text-right">Actions attributed as admin on behalf of brand</p></div>)}
        </div>);
      })}</div>
      {preview && previewBundle && (function() {
        const bundle = previewBundle;
        const docBrand = brandsList.find(function(b) { return b.id === preview.brandId; });
        return (<div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col bg-ink-850 border-white/[0.08]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <span className="text-sm font-semibold text-white capitalize">{preview.type.replace(/_/g, ' ')} — {docBrand?.profile.businessName}</span>
              <button onClick={function() { setPreviewId(null); }} className="text-zinc-400 hover:text-white">✕</button>
            </div>
            <iframe title="doc-preview" srcDoc={bundle?.html ?? '<p>No preview.</p>'} className="w-full h-[60vh] bg-white" />
            <div className="flex justify-end gap-2 p-4 border-t border-white/[0.06]">
              <Button variant="ghost" onClick={function() { setPreviewId(null); }}>Close</Button>
              <Button onClick={function() { act(preview.id, 'approved'); }} className="text-xs"><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve</Button>
              <Button variant="ghost" onClick={function() { act(preview.id, 'missing'); }} className="text-xs text-red-300"><XCircle className="w-3.5 h-3.5 mr-1" /> Reject</Button>
            </div>
          </Card>
        </div>);
      })()}
    </div>
  );
}
