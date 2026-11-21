import { useEffect, useMemo, useState } from 'react';
import { useIntegrations } from '@/integrations/IntegrationsContext';
import { createEsignClient } from '@/lib/esign/esign';
import { useRecordDeepLink } from '@/lib/runtime/recordDeepLink';
import { useBrands, useContracts, useFulfillmentScores } from '@/data/queries';
import {
  CONTRACT_STATUS_LABELS,
  renewalUrgency,
  createRenewalDraft,
  createTrackAmendment,
} from '@/lib/contracts';
import { buildDistributionAgreement } from '@/lib/agreement';
import { fulfillmentTrackLabel } from '@/config/fulfillmentTrack';
import { COMMISSION_RATE_PLACEHOLDER, MONTHLY_FEE_PLACEHOLDER_GBP } from '@/config/commercial';
import { useApp } from '@/context/GlobalStateContext';
/**
 * §SSOT S7 — THE contract-cycle writers. The panel's drafts now go to the
 * CANONICAL store (never local component state), and the panel offers the two
 * real closing paths — renew (advance the term) and terminate — so the work
 * layer's `contract_renewal` item clears BY DOING THE WORK.
 */
import { saveContractDraft, renewContract, terminateContract } from '@/data/demoStore';
import type { Contract, FulfillmentTrack } from '@/types';
import type { DemoBrandRow } from '@/data/demoData';
import { Badge, Button, Card, Input } from '@/components/ui';
import { WorkspaceFrame, WorkspaceHeader } from '@/components/shared/workspace';
import { DataTable } from '@/components/shared/DataTable';
import { cn } from '@/utils/cn';
import { FileText, Lock, Plus, Eye, X, History, RotateCcw, CheckCircle2, Clock, AlertTriangle, Ban } from 'lucide-react';

function UrgencyBadge({ renewalDate }: { renewalDate: string }) {
  const urgency = renewalUrgency(renewalDate, new Date().toISOString());
  if (urgency === 'ok') return null;
  const map: Record<string, string> = {
    expired: 'bg-red-500/15 text-red-300 border-red-500/20',
    '7d': 'bg-red-500/15 text-red-300 border-red-500/20',
    '30d': 'bg-amber-500/15 text-amber-300 border-amber-500/20',
    '60d': 'bg-blue-500/15 text-blue-300 border-blue-500/20',
  };
  const label = urgency === 'expired' ? 'Expired' : `≤ ${urgency.replace('d', '')} days`;
  return <Badge className={cn('text-ds-micro', map[urgency])}>{label}</Badge>;
}

/** Pre-fill commercial terms from the brand's fulfillment-track data (§5). */
function prefillTerms(
  brand: DemoBrandRow,
  scores: { brandId: string; track: FulfillmentTrack }[]
): { rate: number; fee: number; track: FulfillmentTrack } {
  const score = scores.find((s) => s.brandId === brand.id);
  return {
    rate: COMMISSION_RATE_PLACEHOLDER,
    fee: MONTHLY_FEE_PLACEHOLDER_GBP,
    track: score?.track ?? 'unassigned',
  };
}

export function ContractsAdminPanel() {
  const { integrations } = useIntegrations();
  const { actingStaffId, canCurrentUserMutate } = useApp();
  const actor = actingStaffId ?? 'staff:contracts';
  const esign = integrations.esignature;
  const esignLive = esign?.status === 'connected' && !esign.sandbox;

  const [lastEnvelope, setLastEnvelope] = useState<string | null>(null);

  const brandsQuery = useBrands();
  const contractsQuery = useContracts();
  const scoresQuery = useFulfillmentScores();

  const [generateFor, setGenerateFor] = useState<DemoBrandRow | null>(null);
  const [viewingContract, setViewingContract] = useState<Contract | null>(null);

  const brands = brandsQuery.data?.data ?? [];
  /**
   * §SSOT S7 — the table is the CANONICAL store, drafts included. The panel no
   * longer keeps a parallel `extraDrafts` array in local state; every draft is
   * written through `saveContractDraft` and returns via `useContracts`, which the
   * canonical change signal refetches.
   */
  const allContracts = useMemo(() => contractsQuery.data?.data ?? [], [contractsQuery.data]);

  /**
   * §BATCH 7 (Part 4.1a) — DEEP LINK. `/admin/contracts_admin?contract=<id>` opens
   * THAT agreement's document viewer, so a renewal notice lands on the contract it
   * names rather than on the contract list. Applied ONCE per id.
   */
  const deepLinkContract = useRecordDeepLink('contract');
  useEffect(() => {
    if (!deepLinkContract) return;
    const match = allContracts.find((c) => c.id === deepLinkContract);
    if (!match) return;
    setViewingContract(match);
  }, [deepLinkContract, allContracts]);

  return (
    <WorkspaceFrame className="space-y-4">
      <WorkspaceHeader
        eyebrow="ADMIN HUB · CONTRACTS"
        title="Contract Cycle"
        description="Full CRM — generate from template, send for e-signature, track renewals."
        actions={
          <Button
            variant="accent"
            onClick={() => setGenerateFor(brands[0] ?? null)}
            className="text-xs"
            disabled={brands.length === 0}
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> New Contract
          </Button>
        }
      />

      {lastEnvelope && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-ds-md p-2.5 text-ds-label text-state-success">
          Last e-sign envelope sent: <code className="font-mono">{lastEnvelope}</code>
        </div>
      )}

      {!esignLive && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-ds-md p-3 text-ds-label text-state-warning flex items-start gap-2">
          <Lock className="w-3.5 h-3.5 mt-0.5 text-amber-300 flex-shrink-0" />
          <span>
            E-signature runs in <strong>(Mock) mode</strong> — envelopes are
            simulated (ids like <code>mock:env-…</code>, lifecycles advance on
            each status poll, every 4th is declined) until DocuSign or PandaDoc
            is connected and verified in Integration Settings.
          </span>
        </div>
      )}

      {/* Contracts table — §Stage-19.2 search/filter/sort/pagination */}
      <Card>
        <DataTable
          rows={allContracts}
          columns={[
            { key: 'brand', header: 'Brand', value: (c) => brands.find((b) => b.id === c.brandId)?.profile.businessName ?? c.brandId },
            { key: 'type', header: 'Type', value: (c) => c.type.replace(/_/g, ' ') },
            { key: 'commissionRate', header: 'Comm.', value: (c) => c.commissionRate, render: (c) => <span className="font-mono text-xs">{c.commissionRate}%</span>, className: 'text-right' },
            { key: 'monthlyFee', header: 'Fee', value: (c) => c.monthlyFee, render: (c) => <span className="font-mono text-xs">£{c.monthlyFee}</span>, className: 'text-right' },
            {
              key: 'status',
              header: 'Status',
              value: (c) => CONTRACT_STATUS_LABELS[c.status],
              render: (c) => (
                <Badge
                  className={cn(
                    'text-ds-micro',
                    c.status === 'active' || c.status === 'signed'
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'
                      : c.status === 'draft'
                        ? 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20'
                        : 'bg-blue-500/15 text-blue-300 border-blue-500/20'
                  )}
                >
                  {CONTRACT_STATUS_LABELS[c.status]}
                </Badge>
              ),
            },
            {
              key: 'renewalDate',
              header: 'Renewal',
              value: (c) => c.renewalDate,
              render: (c) => (
                <span className="whitespace-nowrap">
                  <button
                    onClick={() => setViewingContract(c)}
                    className="text-ds-label text-brass hover:underline mr-3 inline-flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" /> View
                  </button>
                  <span className="font-mono text-ds-label">{c.renewalDate}</span>{' '}
                  <UrgencyBadge renewalDate={c.renewalDate} />
                </span>
              ),
              className: 'text-right',
            },
          ]}
          searchText={(c) =>
            `${brands.find((b) => b.id === c.brandId)?.profile.businessName ?? ''} ${c.type} ${CONTRACT_STATUS_LABELS[c.status]} ${c.renewalDate}`
          }
          filters={[
            {
              key: 'status',
              label: 'Status',
              explicitOptions: Object.keys(CONTRACT_STATUS_LABELS),
              match: (c, sel) => c.status === sel,
            },
          ]}
          emptyMessage="No contracts match."
          /* §Wave 3 Part 5 — the table owns the loading region now, so the surface
             cannot declare "No contracts match." while its queries still resolve. */
          loading={contractsQuery.isPending || brandsQuery.isPending}
          dataTable="contract-cycle"
          caption="Contract cycle"
        />
      </Card>

      {generateFor && (
        <GenerateModal
          brand={generateFor}
          scores={scoresQuery.data?.data ?? []}
          esignLive={esignLive}
          onClose={() => setGenerateFor(null)}
          onCreate={(draft) => saveContractDraft(draft, actor)}
          onSend={(envelopeId) => setLastEnvelope(envelopeId)}
        />
      )}

      {/* Contract document viewer with version history */}
      {viewingContract && (
        <ContractDetailModal
          contract={viewingContract}
          allContracts={allContracts}
          brands={brands}
          canMutate={canCurrentUserMutate}
          actor={actor}
          onClose={() => setViewingContract(null)}
        />
      )}
    </WorkspaceFrame>
  );
}

/** Version history timeline for a brand's contracts */

/** Generate-from-template modal: pre-fills from §5 track data, previews doc. */
function GenerateModal({
  brand,
  scores,
  esignLive,
  onClose,
  onCreate,
  onSend,
}: {
  brand: DemoBrandRow;
  scores: { brandId: string; track: FulfillmentTrack }[];
  esignLive: boolean;
  onClose: () => void;
  onCreate: (draft: Contract) => void;
  /** Envelope id from the (real or mock) e-sign client after creation. */
  onSend: (envelopeId: string | null, error?: string) => void;
}) {
  const terms = prefillTerms(brand, scores);
  const [rate, setRate] = useState(String(terms.rate));
  const [fee, setFee] = useState(String(terms.fee));
  const [track, setTrack] = useState<FulfillmentTrack>(terms.track);

  const previewText = buildDistributionAgreement({
    businessName: brand.profile.businessName,
    commissionRate: Number(rate) || 0,
    monthlyFee: Number(fee) || 0,
    category: brand.category,
    fulfillmentTrack: track === 'unassigned' ? 'financed' : track,
  });

  const handleCreate = async () => {
    const today = new Date();
    const inOneYear = new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000);
    const draft: Contract = {
      id: `contract-${brand.id}-${Date.now()}`,
      brandId: brand.id,
      type: 'distribution_agreement',
      status: 'draft',
      commissionRate: Number(rate) || 0,
      monthlyFee: Number(fee) || 0,
      fulfillmentTrack: track,
      effectiveDate: today.toISOString().slice(0, 10),
      renewalDate: inOneYear.toISOString().slice(0, 10),
      documentUrl: '',
      signatories: [],
      version: 1,
    };
    onCreate(draft);

    // Send through the factory seam: the real client activates purely by
    // returning a verified connection with a Vault-backed secretRef here.
    // Until the /esign/envelope Edge Function is deployed and the wizard
    // stores real refs (see PRODUCTION_READINESS.md), getConnection yields
    // null and the MOCK client answers — zero code changes at go-live.
    const esignClient = createEsignClient(() => null, '/fn');
    const res = await esignClient.sendForSignature({
      contractId: draft.id,
      documentText: previewText,
      signatoryName: brand.profile.businessName,
      signatoryEmail: 'signatory-PENDING@example.com',
    });
    onSend(res.ok && res.envelopeId ? res.envelopeId : null, res.ok ? undefined : res.error);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-surface-hover backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-xl bg-ink-850 border-hairline max-h-[85vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-1">
          <FileText className="w-5 h-5 text-brass" />
          <h3 className="text-base font-semibold text-strong">
            New Contract — {brand.profile.businessName}
          </h3>
        </div>
        <p className="text-xs text-zinc-500 mb-4">
          Pre-filled from the brand's fulfillment-track assessment ({track.replace(/_/g, ' ')}).
        </p>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <Input label="Commission (%)" value={rate} onChange={(e) => setRate(e.target.value)} />
          <Input label="Monthly Fee (£)" value={fee} onChange={(e) => setFee(e.target.value)} />
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Track</label>
            <select
              value={track}
              onChange={(e) => setTrack(e.target.value as FulfillmentTrack)}
              className="w-full bg-ink-900 border border-hairline rounded-ds-sm px-2.5 py-2 text-xs text-strong cursor-pointer"
            >
              <option value="direct_fulfillment">{fulfillmentTrackLabel('direct_fulfillment')}</option>
              <option value="financed">{fulfillmentTrackLabel('financed')}</option>
              <option value="unassigned">{fulfillmentTrackLabel('unassigned')}</option>
            </select>
          </div>
        </div>

        <pre className="bg-ink rounded-ds-md border border-hairline p-3 text-ds-micro text-zinc-400 whitespace-pre-wrap max-h-48 overflow-y-auto mb-4">
          {previewText}
        </pre>

        {!esignLive && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-ds-md p-2.5 text-ds-label text-state-warning mb-3 flex items-start gap-1.5">
            <Lock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            No verified e-sign connection — the envelope will be SIMULATED
            (mock client, id like mock:env-…).
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} className="text-xs">
            {esignLive ? 'Create & Send for E-Signature' : 'Create & Send (Mock E-Signature)'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

/* STAGE4 - Contract version history components */
/* STAGE4 - Contract version history components */


/** Version history timeline for a brand's contracts */
function ContractVersionHistory({ contracts, currentVersion }: { contracts: Contract[]; currentVersion: number }) {
  const sorted = useMemo(() => [...contracts].sort((a, b) => b.version - a.version), [contracts]);
  return (
    <div className="space-y-0">
      {sorted.map((c, i) => {
        const isCurrent = c.version === currentVersion;
        const isLast = i === sorted.length - 1;
        return (
          <div key={c.id} className="relative flex gap-4 pb-6 last:pb-0">
            {!isLast && <div className="absolute left-[11px] top-5 bottom-0 w-px bg-tint" />}
            <div className={cn('w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border-2 border-ink-850 z-10', isCurrent ? 'bg-brass-500' : c.status === 'active' || c.status === 'signed' ? 'bg-emerald-500' : 'bg-zinc-600')}>
              {isCurrent ? <FileText className="w-3 h-3 text-strong" /> : <Clock className="w-3 h-3 text-strong" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-medium text-strong">Version {c.version}{isCurrent && <span className="text-ds-micro text-brass-400 ml-1.5">(Current)</span>}</span>
                <Badge className={cn('text-ds-micro', c.status === 'active' || c.status === 'signed' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20' : c.status === 'draft' ? 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20' : 'bg-blue-500/15 text-blue-300 border-blue-500/20')}>{CONTRACT_STATUS_LABELS[c.status]}</Badge>
              </div>
              <div className="text-ds-micro text-zinc-500 space-y-0.5">
                <span>{c.type.replace(/_/g, ' ')} - {c.commissionRate}% - {c.monthlyFee}/mo - {c.fulfillmentTrack.replace(/_/g, ' ')}</span>
                <div className="flex items-center gap-3"><span>Effective: {c.effectiveDate}</span><span>Renewal: {c.renewalDate}</span></div>
                {c.signatories.length > 0 && <div className="flex items-center gap-1 mt-0.5"><CheckCircle2 className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400/80">{c.signatories.length} signator{c.signatories.length === 1 ? 'y' : 'ies'}</span></div>}
              </div>
            </div>
          </div>
        );
      })}
      {sorted.length === 0 && <p className="text-xs text-zinc-600 text-center py-6">No version history available.</p>}
    </div>
  );
}


/** Contract detail modal with document view and version history tabs */
function ContractDetailModal({ contract, allContracts, brands, canMutate, actor, onClose }: {
  contract: Contract;
  allContracts: Contract[];
  brands: DemoBrandRow[];
  canMutate: boolean;
  actor: string;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'document' | 'history'>('document');
  const brandId = contract.brandId;
  const brandName = brands.find((b) => b.id === brandId)?.profile.businessName ?? brandId;
  const brandCategory = brands.find((b) => b.id === brandId)?.category ?? 'Home';
  const brandVersions = useMemo(() => allContracts.filter((c) => c.brandId === brandId), [allContracts, brandId]);
  /* §SSOT S7 — all four write paths go to the CANONICAL store (no local state). */
  const handleCreateRenewalDraft = () => { saveContractDraft(createRenewalDraft(contract), actor); onClose(); };
  const handleCreateAmendment = () => { const newTrack = contract.fulfillmentTrack === 'financed' ? 'direct_fulfillment' : 'financed'; saveContractDraft(createTrackAmendment(contract, newTrack), actor); onClose(); };
  /* The two real CLOSING paths for the work layer's `contract_renewal` item. */
  const handleRenew = () => { renewContract(contract.id, actor); onClose(); };
  const handleTerminate = () => { terminateContract(contract.id, actor, 'Terminated from the Contract Cycle console'); onClose(); };
  return (
    <div className="fixed inset-0 z-[60] bg-surface-hover backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col bg-ink-850 border-hairline">
        <div className="flex items-center justify-between px-5 py-4 border-b border-hairline">
          <div>
            <h3 className="text-sm font-semibold text-strong">{contract.type.replace(/_/g, ' ')} - {brandName}<Badge className={cn('text-ds-micro ml-2', 'bg-blue-500/15 text-blue-300 border-blue-500/20')}>v{contract.version} - {CONTRACT_STATUS_LABELS[contract.status]}</Badge></h3>
            <p className="text-ds-micro text-zinc-500 mt-0.5">{contract.fulfillmentTrack.replace(/_/g, ' ')} track - {contract.commissionRate}% - {contract.monthlyFee}/mo</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-strong"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex gap-1 px-5 pt-3 border-b border-hairline">
          <button onClick={() => setTab('document')} className={cn('px-3 py-1.5 text-ds-label font-medium rounded-t transition-colors', tab === 'document' ? 'text-strong border-b-2 border-brass-500' : 'text-zinc-500 hover:text-zinc-300')}><FileText className="w-3.5 h-3.5 inline mr-1" /> Document</button>
          <button onClick={() => setTab('history')} className={cn('px-3 py-1.5 text-ds-label font-medium rounded-t transition-colors', tab === 'history' ? 'text-strong border-b-2 border-brass-500' : 'text-zinc-500 hover:text-zinc-300')}><History className="w-3.5 h-3.5 inline mr-1" /> Version History ({brandVersions.length})</button>
        </div>
        {tab === 'document' && (
          <>
            <pre className="flex-1 overflow-y-auto px-6 py-4 text-ds-label leading-relaxed text-zinc-300 whitespace-pre-wrap font-mono">
              {buildDistributionAgreement({ businessName: brandName, commissionRate: contract.commissionRate, monthlyFee: contract.monthlyFee, category: brandCategory, fulfillmentTrack: contract.fulfillmentTrack === 'unassigned' ? 'financed' : contract.fulfillmentTrack })}
            </pre>
            <div className="flex items-center justify-between px-5 py-3 border-t border-hairline">
              <div className="flex items-center gap-2">
                {canMutate && contract.status !== 'draft' && <Button className="text-ds-micro" variant="ghost" onClick={handleCreateRenewalDraft}><RotateCcw className="w-3 h-3 mr-1" /> Create Renewal Draft</Button>}
                {canMutate && contract.status === 'active' && <Button className="text-ds-micro" variant="ghost" onClick={handleCreateAmendment}><AlertTriangle className="w-3 h-3 mr-1" /> Create Track Amendment</Button>}
                {canMutate && contract.status !== 'terminated' && <Button className="text-ds-micro" variant="ghost" onClick={handleRenew}><CheckCircle2 className="w-3 h-3 mr-1" /> Renew (advance term)</Button>}
                {canMutate && contract.status !== 'terminated' && <Button className="text-ds-micro" variant="ghost" onClick={handleTerminate}><Ban className="w-3 h-3 mr-1" /> Terminate</Button>}
              </div>
              <Button variant="ghost" onClick={onClose}>Close</Button>
            </div>
          </>
        )}
        {tab === 'history' && (
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <p className="text-ds-label text-zinc-500 mb-4">{brandVersions.length} version(s) of {brandName}'s distribution agreement.</p>
            <ContractVersionHistory contracts={brandVersions} currentVersion={contract.version} />
          </div>
        )}
      </Card>
    </div>
  );
}
