import { useApp } from '@/context/GlobalStateContext';
import { useBrandAgreements } from '@/data/queries';
import { Card, Badge } from '@/components/ui';
import { cn } from '@/utils/cn';
import { CheckCircle2, MessageSquare, ShieldCheck } from 'lucide-react';

export function OnboardingSummary({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const { brandProfile, session, gateDocs } = useApp();
  const brandAgreements = useBrandAgreements().data?.data ?? [];
  const brandId = session?.tenantId ?? '';
  const logisticsSlaAccepted = brandAgreements.some((a) => a.brandId === brandId && a.agreementType === 'logistics_sla');
  const chargebackIndemnityAccepted = brandAgreements.some((a) => a.brandId === brandId && a.agreementType === 'chargeback_indemnity');
  const allDocsApproved = gateDocs.every((d) => d.status === 'approved');
  const gateCleared = allDocsApproved && logisticsSlaAccepted && chargebackIndemnityAccepted;

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        <div>
          <h2 className="text-lg font-semibold text-white">Onboarding Complete</h2>
          <p className="text-xs text-zinc-500 mt-0.5">{brandProfile.businessName || 'Your brand'} is fully onboarded</p>
        </div>
      </div>
      {gateCleared ? (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 text-sm text-emerald-200 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Compliance Gate Cleared</p>
            <p className="text-xs text-emerald-300/70 mt-1">All compliance documents approved, agreements signed, and distribution contract active.</p>
          </div>
        </div>
      ) : (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-sm text-amber-200 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Compliance Gate In Progress</p>
            <p className="text-xs text-amber-300/70 mt-1">Some documents are still pending review.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Brand Profile" subtitle="Completed">
          <div className="space-y-2 px-1 pb-1">
            <Row label="Business Name" value={brandProfile.businessName} />
            <Row label="Category" value={brandProfile.category} />
            <Row label="Region" value={brandProfile.region?.replace(/_/g, ' ')} />
            <Row label="Country" value={brandProfile.nation} />
            <Row label="Tax ID" value={brandProfile.taxId} />
            <Row label="Email" value={brandProfile.email} />
            <Row label="Phone" value={brandProfile.phone} />
          </div>
        </Card>
        <Card title="Legal Agreement" subtitle="Signed">
          <div className="space-y-2 px-1 pb-1">
            <Row label="Signatory" value={brandProfile.signatory} />
            <Row label="Agreement" value="Master Wholesale and Distribution" />
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Exclusive UK Importer of Record confirmed</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>UK HMRC and UKCA compliance acknowledged</span>
            </div>
          </div>
        </Card>
        <Card title="Banking" subtitle="Configured">
          <div className="space-y-2 px-1 pb-1">
            <Row label="BIC" value={brandProfile.bic} />
            <Row label="IBAN" value={brandProfile.iban} />
            <Row label="Payout Currency" value={brandProfile.payoutCurrency} />
            <Row label="Working Capital" value={brandProfile.workingCapitalAnswer} />
          </div>
        </Card>
        <Card title="Fulfillment Track" subtitle="Assigned">
          <div className="space-y-2 px-1 pb-1">
            <Row label="Track" value={brandProfile.fulfillmentTrack?.replace(/_/g, ' ')} />
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{brandProfile.fulfillmentTrack === 'direct_fulfillment' ? 'Brand handles fulfilment' : 'Mercenta handles fulfilment'}</span>
            </div>
          </div>
        </Card>
        <Card title="Legal Agreements" subtitle={logisticsSlaAccepted && chargebackIndemnityAccepted ? 'Both Accepted' : 'Pending'}>
          <div className="space-y-2 px-1 pb-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-300">Logistics SLAs (S.4.1)</span>
              <Badge className={cn('text-[9px]', logisticsSlaAccepted ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300')}>{logisticsSlaAccepted ? 'Accepted' : 'Pending'}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-300">Chargeback Indemnity (S.4.2)</span>
              <Badge className={cn('text-[9px]', chargebackIndemnityAccepted ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300')}>{chargebackIndemnityAccepted ? 'Accepted' : 'Pending'}</Badge>
            </div>
          </div>
        </Card>
        <Card title="Operational Guidance" subtitle="Completed">
          <div className="space-y-2 px-1 pb-1">
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="text-zinc-300">MOQ, pricing, packaging standards reviewed</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="text-zinc-300">PO acknowledgment workflow understood</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="text-zinc-300">Shipping and returns process acknowledged</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="bg-ink-850 border border-amber-500/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <MessageSquare className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-white">Need to change your onboarding details?</p>
            <p className="text-xs text-zinc-400 mt-1">
              Your onboarding is locked as submitted. To request changes, open a support ticket in{' '}
              <button onClick={() => onNavigate?.('settings')} className="text-brass-400 hover:text-brass-300 underline underline-offset-2">Settings</button>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.04] py-1">
      <span className="text-[11px] text-zinc-500">{label}</span>
      <span className="text-[11px] text-zinc-300 font-medium truncate ml-4 max-w-[200px]">{value || '\u2014'}</span>
    </div>
  );
}
