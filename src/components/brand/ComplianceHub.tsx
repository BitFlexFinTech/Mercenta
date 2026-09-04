import { useMemo, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { Badge, Button, Card } from '@/components/ui';
import { cn } from '@/utils/cn';
import {
  Eye,
  FileCheck2,
  ShieldCheck,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { MERCENTA_EORI, MERCENTA_VAT } from '@/config/customs';
import { generateCustomsDocBundle, type CustomsDocumentBundle } from '@/lib/customsDocs';
import { useBrands, useProducts, usePurchaseOrders, useComplianceDocuments, useContracts } from '@/data/queries';
import { uploadComplianceDoc } from '@/data/api';
import { evaluateComplianceGate, REQUIRED_DOCUMENT_TYPES } from '@/lib/compliance';

/**
 * §Stage-3 rewritten compliance hub.
 *
 * - UK EORI / UK VAT are NOT brand requirements: Mercenta is Importer of Record
 *   and its own numbers are auto-populated into every document.
 * - EU market section removed (UK-only); it exists as a feature-flagged
 *   disabled module under Super Admin → Settings (EU_MARKET_ENABLED=false).
 * - Customs documentation is AUTO-GENERATED from PO + product data; the
 *   brand reviews and confirms instead of recreating documents.
 */

export function ComplianceHub() {
  const brandsQuery = useBrands();
  const productsQuery = useProducts();
  const posQuery = usePurchaseOrders();
  // Stable identities so the doc-bundle useMemo deps are meaningful.
  const brandsList = useMemo(() => brandsQuery.data?.data ?? [], [brandsQuery.data]);
  const productsList = useMemo(() => productsQuery.data?.data ?? [], [productsQuery.data]);
  const posListRaw = useMemo(() => posQuery.data?.data ?? [], [posQuery.data]);
  // §Stage-20.3 SECURITY FIX — scope to THIS brand's POs only. Previously the
  // customs-bundle generator processed every brand's purchase orders.
  const { session } = useApp();
  const tenantId = session?.tier === 'brand' ? (session.tenantId ?? null) : null;
  const posList = useMemo(
    () => (tenantId ? posListRaw.filter((p) => p.brandId === tenantId) : posListRaw),
    [posListRaw, tenantId]
  );
  /** Accepted-or-later POs get their customs bundle generated automatically. */
  const billablePOs = useMemo(
    () =>
      posList.filter((po) =>
        ['accepted', 'ready_to_fulfil', 'shipped', 'delivered'].includes(po.status)
      ),
    [posList]
  );

  const [previewDoc, setPreviewDoc] = useState<CustomsDocumentBundle | null>(null);

  const docBundles = useMemo(
    () =>
      billablePOs.map((po) => {
        const brand = brandsList.find((b) => b.id === po.brandId);
        const products = productsList.filter((p) => p.brandId === po.brandId);
        return {
          po,
          brandName: brand?.profile.businessName ?? po.brandId,
          docs: generateCustomsDocBundle({
            po,
            brandName: brand?.profile.businessName ?? '',
            products,
          }),
        };
      }),
    [billablePOs, brandsList, productsList]
  );

  return (
    <div className="p-6 space-y-4 max-w-[1400px] mx-auto">
      <div>
        <h2 className="text-lg font-semibold text-white">Compliance &amp; Customs Hub</h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          UK market compliance — customs documents are auto-generated and
          pre-filled for your review
        </p>
      </div>

      {/* Importer of Record — handled by Mercenta, never the brand */}
      <Card title="Importer of Record — handled by Mercenta">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 px-1 pb-1">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium text-white">UK EORI Number</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Held by Mercenta as Importer of Record — <span className="font-mono">{MERCENTA_EORI}</span>.
              You never need to register.
            </p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium text-white">UK VAT Registration</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Mercenta's VAT number is used on all imports —{' '}
              <span className="font-mono">{MERCENTA_VAT}</span>. Auto-applied to every document.
            </p>
          </div>
        </div>
      </Card>

      {/* Auto-generated customs documentation */}
      <Card title="Customs Documentation — auto-generated, pre-filled">
        <p className="text-[11px] text-zinc-500 px-1 pb-3">
          Generated from your purchase-order data and product master. Review each
          pre-filled document and confirm — no manual form-filling required.
        </p>
        {docBundles.length === 0 && (
          <p className="text-xs text-zinc-600 px-1 py-2">
            No accepted purchase orders yet — documents are generated automatically
            once a PO is accepted.
          </p>
        )}
        <div className="space-y-4">
          {docBundles.map(({ po, brandName, docs }) => (
            <div key={po.id} className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="font-mono text-xs text-brass">{po.poNumber}</span>
                  <span className="text-[11px] text-zinc-500 ml-2">{brandName}</span>
                </div>
                <Badge className="text-[10px] bg-emerald-500/15 text-emerald-300 border-emerald-500/20 capitalize">
                  {po.status.replace(/_/g, ' ')}
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {docs.map((doc) => (
                  <button
                    key={doc.type}
                    onClick={() => setPreviewDoc(doc)}
                    className={cn(
                      'text-left bg-ink-900 border border-white/[0.06] hover:border-brass/40 rounded-lg p-3 transition-colors group'
                    )}
                  >
                    <FileCheck2 className="w-4 h-4 text-brass mb-1.5" />
                    <div className="text-[11px] font-medium text-white">{doc.title}</div>
                    <ul className="mt-1 space-y-0.5">
                      {doc.preFilled.slice(0, 2).map((f) => (
                        <li key={f.label} className="font-mono text-[9px] text-zinc-600 truncate">
                          {f.label}: {f.value}
                        </li>
                      ))}
                    </ul>
                    <span className="inline-flex items-center gap-1 text-[10px] text-brass mt-2 opacity-70 group-hover:opacity-100">
                      <Eye className="w-3 h-3" /> Review &amp; confirm
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Document preview modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-3xl bg-white max-h-[85vh] overflow-auto p-0">
            <iframe
              title={previewDoc.title}
              srcDoc={previewDoc.html}
              className="w-full h-[60vh]"
            />
            <div className="p-4 flex items-center justify-between bg-ink-850">
              <span className="text-xs text-zinc-400">
                {previewDoc.title} — pre-filled from PO data. Confirming locks these values.
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setPreviewDoc(null)}>Close</Button>
                <Button onClick={() => setPreviewDoc(null)}>Review &amp; Confirm</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}


/** Compliance document upload card with expiry tracking */
function ComplianceUploadCard({ brandId, brandName }: { brandId: string | null; brandName: string }) {
  const docsQuery = useComplianceDocuments();
  const contractsQuery = useContracts();
  const allDocs = docsQuery.data?.data ?? [];
  const allContracts = contractsQuery.data?.data ?? [];
  const brandDocs = brandId ? allDocs.filter(function(d) { return d.brandId === brandId; }) : [];
  const hasSignedAgreement = allContracts.some(function(c) { return c.brandId === brandId && (c.status === 'signed' || c.status === 'active'); });
  const gate = evaluateComplianceGate(brandDocs, hasSignedAgreement);
  const [uploaded, setUploaded] = useState<string | null>(null);
  const [docVersion, setDocVersion] = useState(0);
  void docVersion;

  function handleUpload(type: string) {
    if (!brandId) return;
    uploadComplianceDoc(brandId, type, 'brand');
    setUploaded(type);
    setDocVersion(function(v) { return v + 1; });
    setTimeout(function() { setUploaded(null); }, 3000);
  }

  function expiryStatus(doc: { status: string; expiryDate?: string }) {
    if (!doc.expiryDate) return null;
    var days = Math.ceil((new Date(doc.expiryDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    if (doc.status === 'expired' || days < 0) return { label: 'Expired', color: 'bg-red-500/15 text-red-300' };
    if (days <= 30) return { label: 'Expires in ' + days + 'd', color: 'bg-amber-500/15 text-amber-300' };
    if (days <= 60) return { label: 'Expires in ' + days + 'd', color: 'bg-blue-500/15 text-blue-300' };
    return null;
  }

  if (!brandId) {
    return (
      <Card title="Compliance Documents" subtitle="Upload required compliance documents">
        <p className="text-xs text-zinc-600 px-1 py-4">Sign in to manage compliance documents.</p>
      </Card>
    );
  }

  return (
    <Card title="Compliance Documents" subtitle="Upload required documents to clear the compliance gate">
      <div className="space-y-3 p-1">
        <div className={cn('rounded-lg p-3 text-xs flex items-center gap-2', gate.cleared ? 'bg-emerald-500/10 text-emerald-200 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-200 border border-amber-500/20')}>
          {gate.cleared ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
          {gate.cleared ? 'Compliance gate cleared - all required documents approved.' : 'Compliance gate not yet cleared - ' + (gate.missing.length + gate.blocking.length) + ' item(s) remain.'}
        </div>
        <div className="divide-y divide-white/[0.04]">
          {REQUIRED_DOCUMENT_TYPES.map(function(type) {
            var doc = brandDocs.find(function(d) { return d.type === type; });
            var status = doc ? doc.status : 'missing';
            var isUploading = uploaded === type;
            var expiry = doc ? expiryStatus(doc) : null;
            return (
              <div key={type} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-zinc-300 capitalize truncate">{type.replace(/_/g, ' ')}</span>
                  {expiry && (
                    <Badge className={cn('text-[9px]', expiry.color)}>
                      <Clock className="w-2.5 h-2.5 mr-0.5" />{expiry.label}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge className={cn('text-[9px]',
                    status === 'approved' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20' :
                    status === 'under_review' || status === 'uploaded' ? 'bg-amber-500/15 text-amber-300 border-amber-500/20' :
                    status === 'expiring' ? 'bg-blue-500/15 text-blue-300 border-blue-500/20' :
                    status === 'expired' ? 'bg-red-500/15 text-red-300 border-red-500/20' :
                    'bg-zinc-500/15 text-zinc-400 border-zinc-500/20'
                  )}>{status.replace(/_/g, ' ')}</Badge>
                  {status !== 'approved' && (
                    <Button className="text-[10px]" onClick={function() { handleUpload(type); }} disabled={isUploading}>
                      {isUploading ? 'Uploading...' : <><Upload className="w-3 h-3 mr-1" />Upload</>}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {uploaded && <p className="text-[10px] text-emerald-400">Document uploaded and marked for review.</p>}
        <p className="text-[10px] text-zinc-600">Required: Letter of Authorization, Product Safety (UKCA), Insurance Certificate, Brand Registry Confirmation. A signed distribution agreement is also required.</p>
      </div>
    </Card>
  );
}
