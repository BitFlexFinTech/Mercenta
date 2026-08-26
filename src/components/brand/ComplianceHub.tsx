import { Card, Badge } from '@/components/ui';
import { cn } from '@/utils/cn';
import { CheckCircle2, AlertCircle, Clock, ShieldCheck } from 'lucide-react';

const UK_REQUIREMENTS = [
  {
    id: 'ukca',
    label: 'UKCA Marking',
    description: 'UK Conformity Assessed marking required for goods placed on the UK market',
    status: 'verified',
    detail: 'Certificate UKCA-2026-0042 issued',
  },
  {
    id: 'eori',
    label: 'UK EORI Number',
    description: 'Economic Operators Registration & Identification for HMRC customs',
    status: 'verified',
    detail: 'GB123456789000 — Active',
  },
  {
    id: 'vat',
    label: 'UK VAT Registration',
    description: 'VAT number registered with HM Revenue & Customs',
    status: 'verified',
    detail: 'GB 487 6392 21 — Verified',
  },
  {
    id: 'cosmetic',
    label: 'Cosmetic Product Notification (SCPN)',
    description: 'Required for cosmetic products sold in the UK post-Brexit',
    status: 'pending',
    detail: 'Submission in progress — 2 of 3 products notified',
  },
];

const EU_REQUIREMENTS = [
  {
    id: 'ce',
    label: 'CE Marking',
    description: 'EU conformity marking for products placed on the EU market',
    status: 'pending',
    detail: 'Not yet required — UK-first distribution',
  },
  {
    id: 'eu_eori',
    label: 'EU EORI Number',
    description: 'Required if exporting beyond UK into EU territories',
    status: 'not_required',
    detail: 'Optional — activate when EU expansion begins',
  },
  {
    id: 'reach',
    label: 'REACH Compliance',
    description: 'EU chemical regulation compliance for substances',
    status: 'pending',
    detail: 'Pending — activate for EU market entry',
  },
  {
    id: 'gpsr',
    label: 'EU GPSR (General Product Safety)',
    description: 'New EU product safety regulation effective Dec 2024',
    status: 'not_required',
    detail: 'Not yet required for UK-only distribution',
  },
];

export function ComplianceHub() {
  return (
    <div className="p-6 space-y-4 max-w-[1400px] mx-auto">
      <div>
        <h2 className="text-lg font-semibold text-white">Market Readiness & Compliance Hub</h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Regulatory verification requirements for UK and EU market access
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* UK Requirements */}
        <Card
          title="UK Market Requirements"
          subtitle="Primary destination — mandatory"
          action={
            <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/20">
              <ShieldCheck className="w-3 h-3" />
              Primary
            </Badge>
          }
        >
          <div className="divide-y divide-white/[0.04]">
            {UK_REQUIREMENTS.map((req) => (
              <ComplianceRow key={req.id} req={req} />
            ))}
          </div>
        </Card>

        {/* EU Requirements */}
        <Card
          title="EU Market Requirements"
          subtitle="Secondary destination — conditional"
          action={
            <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/20">
              Secondary
            </Badge>
          }
        >
          <div className="divide-y divide-white/[0.04]">
            {EU_REQUIREMENTS.map((req) => (
              <ComplianceRow key={req.id} req={req} />
            ))}
          </div>
        </Card>
      </div>

      {/* Summary Banner */}
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-white">
              UK Market Readiness: 94.2%
            </div>
            <div className="text-xs text-zinc-500 mt-0.5">
              3 of 4 primary requirements verified. 1 pending submission. EU readiness
              deferred until UK channel is fully operational.
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-emerald-400">94.2%</div>
            <div className="text-xs text-zinc-500">Compliance Score</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function ComplianceRow({
  req,
}: {
  req: {
    id: string;
    label: string;
    description: string;
    status: string;
    detail: string;
  };
}) {
  const statusConfig: Record<
    string,
    { icon: React.ReactNode; color: string; badge: string }
  > = {
    verified: {
      icon: <CheckCircle2 className="w-4 h-4" />,
      color: 'text-emerald-400',
      badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
    },
    pending: {
      icon: <Clock className="w-4 h-4" />,
      color: 'text-amber-400',
      badge: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
    },
    not_required: {
      icon: <AlertCircle className="w-4 h-4" />,
      color: 'text-zinc-500',
      badge: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',
    },
  };

  const config = statusConfig[req.status];

  return (
    <div className="flex items-start gap-3 px-5 py-3.5">
      <div className={cn('mt-0.5', config.color)}>{config.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-white">{req.label}</span>
          <Badge className={config.badge}>
            {req.status === 'verified'
              ? 'Verified'
              : req.status === 'pending'
              ? 'Pending'
              : 'N/A'}
          </Badge>
        </div>
        <p className="text-xs text-zinc-500 mt-0.5">{req.description}</p>
        <p className={cn('text-xs mt-1 font-medium', config.color)}>{req.detail}</p>
      </div>
    </div>
  );
}
