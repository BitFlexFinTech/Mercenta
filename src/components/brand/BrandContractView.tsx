import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { useContracts } from '@/data/queries';
import { useRecordDeepLink } from '@/lib/runtime/recordDeepLink';
import {
  CONTRACT_STATUS_LABELS,
  renewalUrgency,
} from '@/lib/contracts';
import { buildDistributionAgreement } from '@/lib/agreement';
import { Badge, Button, Card, LoadingState } from '@/components/ui';
import { WorkspaceFrame, WorkspaceHeader } from '@/components/shared/workspace';
import { cn } from '@/utils/cn';
import { Download, Eye, X } from 'lucide-react';

function UrgencyBadge({ renewalDate, now }: { renewalDate: string; now: string }) {
  const urgency = renewalUrgency(renewalDate, now);
  if (urgency === 'ok') return null;
  const map: Record<string, string> = {
    expired: 'bg-red-500/15 text-red-300 border-red-500/20',
    '7d': 'bg-red-500/15 text-red-300 border-red-500/20',
    '30d': 'bg-state-warning/10 text-state-warning border-state-warning/20',
    '60d': 'bg-state-info/10 text-state-info border-blue-500/20',
  };
  const label = urgency === 'expired' ? 'Expired' : `Renews in ≤ ${urgency.replace('d', '')} days`;
  return <Badge className={cn('text-ds-micro', map[urgency])}>{label}</Badge>;
}

export function BrandContractView() {
  const { brandProfile, session } = useApp();
  const contractsQuery = useContracts();
  const now = new Date().toISOString();
  // §Stage-20.3 SECURITY FIX — a brand sees ONLY its own contracts. This
  // component previously rendered every brand's agreements unfiltered.
  const tenantId = session?.tier === 'brand' ? (session.tenantId ?? null) : null;

  const contracts = useMemo(
    () =>
      (contractsQuery.data?.data ?? [])
        .filter((c) => (tenantId ? c.brandId === tenantId : true))
        .filter((c) => c.status !== 'draft'),
    [contractsQuery.data, tenantId]
  );

  const [viewingId, setViewingId] = useState<string | null>(null);
  const viewing = contracts.find((c) => c.id === viewingId) ?? null;

  /**
   * §BATCH 7 (Part 4.1a) — DEEP LINK. `/brand/contracts?contract=<id>` opens THAT
   * agreement's document viewer, so a renewal notice lands on the contract it
   * names rather than on the contracts list. Applied ONCE per id.
   */
  const deepLinkContract = useRecordDeepLink('contract');
  useEffect(() => {
    if (!deepLinkContract) return;
    if (!contracts.some((c) => c.id === deepLinkContract)) return;
    setViewingId(deepLinkContract);
  }, [deepLinkContract, contracts]);

  /** Render the real clause-block contract for a given agreement record. */
  const renderAgreement = (contract: (typeof contracts)[number]) =>
    buildDistributionAgreement({
      businessName: brandProfile.businessName || 'Brand',
      commissionRate: contract.commissionRate,
      monthlyFee: contract.monthlyFee,
      category: 'Home',
      fulfillmentTrack:
        contract.fulfillmentTrack === 'unassigned'
          ? 'financed'
          : contract.fulfillmentTrack,
      date: contract.effectiveDate || undefined,
    });

  const download = (contract: (typeof contracts)[number]) => {
    const blob = new Blob([renderAgreement(contract)], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `distribution-agreement-${contract.version}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <WorkspaceFrame className="space-y-4" testId="brand-contracts">
      <WorkspaceHeader
        eyebrow="BRAND PORTAL · COMPLIANCE"
        title="Contracts"
        description="Your distribution agreements — status, renewal dates and signed copies"
      />

      {contractsQuery.isPending && <Card><LoadingState rows={3} label="Loading your agreements…" /></Card>}

      {!contractsQuery.isPending && contracts.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-xs text-muted">
            No contracts yet — your distribution agreement is generated when you
            complete onboarding.
          </p>
        </Card>
      )}

      {!contractsQuery.isPending && contracts.map((c) => (
        <Card key={c.id}>
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <h3 className="text-sm font-semibold text-strong capitalize">
                {c.type.replace(/_/g, ' ')} — v{c.version}
              </h3>
              <p className="text-ds-label text-muted mt-0.5">
                Effective {c.effectiveDate || '—'} · Renews {c.renewalDate || '—'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <UrgencyBadge renewalDate={c.renewalDate} now={now} />
              <Badge
                className={cn(
                  'text-ds-micro',
                  c.status === 'active' || c.status === 'signed'
                    ? 'bg-state-success/10 text-state-success border-state-success/20'
                    : 'bg-state-info/10 text-state-info border-blue-500/20'
                )}
              >
                {CONTRACT_STATUS_LABELS[c.status]}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <div className="text-ds-micro text-faint font-medium mb-1">Commission</div>
              <div className="font-mono text-sm text-strong">{c.commissionRate}%</div>
            </div>
            <div>
              <div className="text-ds-micro text-faint font-medium mb-1">Monthly Fee</div>
              <div className="font-mono text-sm text-strong">£{c.monthlyFee}</div>
            </div>
            <div>
              <div className="text-ds-micro text-faint font-medium mb-1">Track</div>
              <div className="text-sm capitalize text-strong">
                {c.fulfillmentTrack.replace(/_/g, ' ')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className="text-ds-label text-accent inline-flex items-center gap-1 cursor-pointer hover:underline"
              onClick={() => setViewingId(c.id)}
            >
              <Eye className="w-3 h-3" /> Open document
            </span>
          </div>
        </Card>
      ))}

      {/* Full-document viewer */}
      {viewing && (
        <div className="fixed inset-0 z-[60] bg-surface-hover backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col bg-surface-raised border-hairline">
            <div className="flex items-center justify-between px-5 py-4 border-b border-hairline">
              <div>
                <h3 className="text-sm font-semibold text-strong capitalize">
                  {viewing.type.replace(/_/g, ' ')} — v{viewing.version}
                </h3>
                <p className="text-ds-micro text-muted mt-0.5">
                  Generated from the {viewing.fulfillmentTrack.replace(/_/g, ' ')} clause set
                </p>
              </div>
              <button onClick={() => setViewingId(null)} className="text-muted hover:text-strong">
                <X className="w-4 h-4" />
              </button>
            </div>
            <pre className="flex-1 overflow-y-auto px-6 py-4 text-ds-label leading-relaxed text-strong whitespace-pre-wrap font-mono">
              {renderAgreement(viewing)}
            </pre>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-hairline">
              <Button variant="ghost" onClick={() => download(viewing)} className="text-xs">
                <Download className="w-3.5 h-3.5 mr-1.5" /> Download copy
              </Button>
              <Button onClick={() => setViewingId(null)}>Close</Button>
            </div>
          </Card>
        </div>
      )}

      <p className="text-ds-micro text-faint">
        Commercial rates shown are placeholders pending sign-off. Signed copies are
        also available through the e-signature provider once live-wired.
      </p>
    </WorkspaceFrame>
  );
}
