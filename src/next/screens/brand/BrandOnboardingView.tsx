import { useState } from 'react';
import { Check, CheckCircle2, ShieldCheck } from 'lucide-react';
import {
  InlineStatus,
  PageHeader,
} from '@/next/components/ConsolePrimitives';
import { NoticeBanner, SectionCard } from '@/next/components/ConsoleCharts';
import {
  COMMERCIAL_MODELS,
  COMMERCIAL_MODEL_ORDER,
  checkCommercialModelSelection,
} from '@/config/commercialModel';
import { fulfillmentTrackLabel, FULFILLMENT_TRACK_HINTS } from '@/config/fulfillmentTrack';
import { APPROVED_CATEGORIES, type BrandProfile, type BrandRegion } from '@/types';

export interface BankDirectoryOption {
  name: string;
  swift: string;
  accountFormat: string;
  routingLabel?: string;
  routingExample?: string;
}

export interface BrandOnboardingViewProps {
  profile: BrandProfile;
  banksForNation: BankDirectoryOption[];
  logisticsSlaAccepted: boolean;
  chargebackIndemnityAccepted: boolean;
  allGateDocsApproved: boolean;
  onUpdateProfile: (patch: Partial<BrandProfile>) => void;
  onCompleteOnboarding: (opts: {
    poRulesAcknowledged: boolean;
    logisticsSla: boolean;
    chargebackIndemnity: boolean;
  }) => void;
  onNavigateSettings?: () => void;
}

const REGIONS: { value: BrandRegion; label: string }[] = [
  { value: 'north_america', label: 'North America (US / Canada)' },
  { value: 'europe', label: 'Europe (EU / Non-EU)' },
  { value: 'africa', label: 'Africa' },
];

const NATIONS_BY_REGION: Record<BrandRegion, string[]> = {
  north_america: ['United States', 'Canada'],
  europe: ['Germany', 'France', 'Italy', 'Netherlands', 'Spain', 'United Kingdom'],
  africa: ['Zimbabwe', 'South Africa', 'Kenya', 'Nigeria', 'Ghana', 'Ethiopia', 'Tanzania', 'Rwanda'],
};

const STEPS = [
  { id: 1, label: 'Brand Profile' },
  { id: 2, label: 'Distribution & Model' },
  { id: 3, label: 'Banking' },
  { id: 4, label: 'Fulfillment Track' },
  { id: 5, label: 'Legal SLAs' },
  { id: 6, label: 'Operational Rules' },
];

export function BrandOnboardingView({
  profile,
  banksForNation,
  logisticsSlaAccepted,
  chargebackIndemnityAccepted,
  allGateDocsApproved,
  onUpdateProfile,
  onCompleteOnboarding,
  onNavigateSettings,
}: BrandOnboardingViewProps) {
  const [step, setStep] = useState(1);
  const [checks, setChecks] = useState({ exclusive: false, compliance: false, payment: false });
  const [legal, setLegal] = useState({
    logisticsSla: logisticsSlaAccepted,
    chargebackIndemnity: chargebackIndemnityAccepted,
  });
  const [guidanceAck, setGuidanceAck] = useState(false);

  if (profile.onboarded) {
    const gateCleared = allGateDocsApproved && logisticsSlaAccepted && chargebackIndemnityAccepted;
    return (
      <div className="space-y-6">
        <PageHeader
          title="Onboarding & Legal Summary"
          description={`${profile.businessName || 'Your brand'} onboarding submission is locked on record.`}
          actions={
            onNavigateSettings ? (
              <button
                type="button"
                onClick={onNavigateSettings}
                className="px-3.5 py-2 rounded-md border border-zinc-300 bg-white text-[12px] font-medium text-zinc-900 hover:bg-zinc-50"
              >
                Request Profile / Bank Change in Settings
              </button>
            ) : undefined
          }
        />

        <NoticeBanner
          tone={gateCleared ? 'success' : 'warning'}
          title={gateCleared ? 'Compliance Gate Cleared' : 'Compliance Gate In Progress'}
          message={
            gateCleared
              ? 'All compliance documents approved, agreements signed, and distribution contract active.'
              : 'Onboarding is submitted; remaining compliance documents are under review.'
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SectionCard title="Brand Profile">
            <dl className="divide-y divide-zinc-200 text-[12px]">
              {[
                ['Business Name', profile.businessName],
                ['Category', profile.category],
                ['Region', profile.region?.replace(/_/g, ' ')],
                ['Nation', profile.nation],
                ['Tax ID', profile.taxId],
                ['Contact Email', profile.email],
                ['Phone', profile.phone],
              ].map(([k, v]) => (
                <div key={String(k)} className="py-2 flex items-center justify-between gap-4">
                  <dt className="text-zinc-500">{k}</dt>
                  <dd className="font-medium text-zinc-950 text-right">{v || '—'}</dd>
                </div>
              ))}
            </dl>
          </SectionCard>

          <SectionCard title="Legal & Commercial Model">
            <dl className="divide-y divide-zinc-200 text-[12px]">
              <div className="py-2 flex items-center justify-between gap-4">
                <dt className="text-zinc-500">Authorized Signatory</dt>
                <dd className="font-medium text-zinc-950">{profile.signatory || '—'}</dd>
              </div>
              <div className="py-2 flex items-center justify-between gap-4">
                <dt className="text-zinc-500">Commercial Model</dt>
                <dd className="font-medium text-zinc-950">
                  {profile.commercialModel === 'commission_agent'
                    ? COMMERCIAL_MODELS.commission_agent.label
                    : profile.commercialModel === 'buy_resell'
                      ? COMMERCIAL_MODELS.buy_resell.label
                      : 'Not selected'}
                </dd>
              </div>
              <div className="py-2 flex items-center justify-between gap-4">
                <dt className="text-zinc-500">Logistics SLA (§4.1)</dt>
                <dd>
                  <InlineStatus
                    label={logisticsSlaAccepted ? 'Accepted' : 'Pending'}
                    tone={logisticsSlaAccepted ? 'success' : 'warning'}
                  />
                </dd>
              </div>
              <div className="py-2 flex items-center justify-between gap-4">
                <dt className="text-zinc-500">Chargeback Indemnity (§4.2)</dt>
                <dd>
                  <InlineStatus
                    label={chargebackIndemnityAccepted ? 'Accepted' : 'Pending'}
                    tone={chargebackIndemnityAccepted ? 'success' : 'warning'}
                  />
                </dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard title="Banking & Payouts">
            <dl className="divide-y divide-zinc-200 text-[12px]">
              {[
                ['SWIFT / BIC', profile.bic],
                ['IBAN / Account', profile.iban],
                ['Payout Currency', profile.payoutCurrency],
                ['Working Capital', profile.workingCapitalAnswer],
              ].map(([k, v]) => (
                <div key={String(k)} className="py-2 flex items-center justify-between gap-4">
                  <dt className="text-zinc-500">{k}</dt>
                  <dd className="font-mono text-zinc-950">{v || '—'}</dd>
                </div>
              ))}
            </dl>
          </SectionCard>

          <SectionCard title="Fulfillment Track">
            <dl className="divide-y divide-zinc-200 text-[12px]">
              <div className="py-2 flex items-center justify-between gap-4">
                <dt className="text-zinc-500">Assigned Track</dt>
                <dd className="font-medium text-zinc-950 capitalize">
                  {profile.fulfillmentTrack.replace(/_/g, ' ')}
                </dd>
              </div>
              <div className="py-2 flex items-center justify-between gap-4">
                <dt className="text-zinc-500">Compliance Gate</dt>
                <dd className="font-medium text-zinc-950 capitalize">
                  {profile.complianceGateStatus.replace(/_/g, ' ')}
                </dd>
              </div>
            </dl>
          </SectionCard>
        </div>
      </div>
    );
  }

  const recommendedTrack =
    profile.workingCapitalAnswer === 'yes' ? 'direct_fulfillment' : 'financed';
  const banks = banksForNation;

  const canNext =
    (step === 1 &&
      Boolean(
        profile.businessName &&
          profile.region &&
          profile.nation &&
          profile.taxId &&
          profile.email &&
          profile.category
      )) ||
    (step === 2 &&
      Boolean(
        profile.signatory &&
          checks.exclusive &&
          checks.compliance &&
          checks.payment &&
          checkCommercialModelSelection(profile.commercialModel).ok
      )) ||
    (step === 3 && Boolean(profile.bic && profile.iban && profile.workingCapitalAnswer)) ||
    (step === 4 && profile.fulfillmentTrack !== 'unassigned') ||
    (step === 5 && legal.logisticsSla && legal.chargebackIndemnity) ||
    (step === 6 && guidanceAck);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Brand Onboarding & Legal"
        description="Complete all six onboarding steps to establish your distribution agreement, commercial model, banking details, and fulfillment track."
      />

      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
        {STEPS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              if (s.id <= step) setStep(s.id);
            }}
            className={`px-3 py-2 rounded border text-left text-[12px] ${
              step === s.id
                ? 'border-zinc-950 bg-zinc-950 text-white font-medium'
                : step > s.id
                  ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900'
                  : 'border-zinc-200 bg-white text-zinc-500'
            }`}
          >
            <div className="font-mono text-[11px] flex items-center justify-between">
              <span>Step {s.id}</span>
              {step > s.id && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
            </div>
            <div className="truncate mt-0.5">{s.label}</div>
          </button>
        ))}
      </div>

      <SectionCard title={`Step ${step}: ${STEPS[step - 1].label}`}>
        <div className="space-y-4 text-[12px] max-w-2xl">
          {step === 1 && (
            <>
              <label className="block space-y-1">
                <span className="text-zinc-600">Business Name</span>
                <input
                  value={profile.businessName}
                  onChange={(e) => onUpdateProfile({ businessName: e.target.value })}
                  className="w-full px-3 py-2 rounded border border-zinc-300 bg-white text-zinc-950"
                />
              </label>
              <div className="space-y-1.5">
                <span className="text-zinc-600 block">Approved Category</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {APPROVED_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => onUpdateProfile({ category: cat })}
                      className={`px-2.5 py-1.5 rounded border text-left ${
                        profile.category === cat
                          ? 'border-[#C2410C] bg-orange-50 text-zinc-950 font-medium'
                          : 'border-zinc-200 bg-white text-zinc-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-zinc-600">Region</span>
                  <select
                    value={profile.region}
                    onChange={(e) =>
                      onUpdateProfile({ region: e.target.value as BrandRegion, nation: '' })
                    }
                    className="w-full px-2.5 py-2 rounded border border-zinc-300 bg-white text-zinc-950"
                  >
                    {REGIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-zinc-600">Country / Nation</span>
                  <select
                    value={profile.nation}
                    onChange={(e) => onUpdateProfile({ nation: e.target.value })}
                    className="w-full px-2.5 py-2 rounded border border-zinc-300 bg-white text-zinc-950"
                  >
                    <option value="">Select nation…</option>
                    {(NATIONS_BY_REGION[profile.region] ?? []).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-zinc-600">Tax ID / VAT / EIN</span>
                  <input
                    value={profile.taxId}
                    onChange={(e) => onUpdateProfile({ taxId: e.target.value })}
                    className="w-full px-2.5 py-2 rounded border border-zinc-300 bg-white text-zinc-950"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-zinc-600">Contact Email</span>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => onUpdateProfile({ email: e.target.value })}
                    className="w-full px-2.5 py-2 rounded border border-zinc-300 bg-white text-zinc-950"
                  />
                </label>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <label className="block space-y-1">
                <span className="text-zinc-600">Authorized Signatory Name</span>
                <input
                  value={profile.signatory}
                  onChange={(e) => onUpdateProfile({ signatory: e.target.value })}
                  className="w-full px-3 py-2 rounded border border-zinc-300 bg-white text-zinc-950"
                />
              </label>
              <div className="space-y-2">
                {(
                  [
                    ['exclusive', 'I confirm Mercenta acts as Exclusive UK Importer of Record'],
                    ['compliance', 'I agree to comply with UK HMRC customs and UKCA requirements'],
                    ['payment', 'I accept the negotiated Ex-Works wholesale payout terms'],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-zinc-800">
                    <input
                      type="checkbox"
                      checked={checks[key]}
                      onChange={(e) => setChecks({ ...checks, [key]: e.target.checked })}
                    />
                    {label}
                  </label>
                ))}
              </div>
              <div className="pt-2 border-t border-zinc-200 space-y-2">
                <div className="font-semibold text-zinc-950">Commercial Relationship with Mercenta</div>
                {COMMERCIAL_MODEL_ORDER.map((id) => {
                  const def = COMMERCIAL_MODELS[id];
                  const selected = profile.commercialModel === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onUpdateProfile({ commercialModel: id })}
                      className={`w-full text-left p-3 rounded border ${
                        selected
                          ? 'border-[#C2410C] bg-orange-50'
                          : 'border-zinc-200 bg-white hover:bg-zinc-50'
                      }`}
                    >
                      <div className="font-medium text-zinc-950">{def.label}</div>
                      <div className="text-zinc-600 mt-0.5">{def.summary}</div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <label className="block space-y-1">
                <span className="text-zinc-600">Select Bank</span>
                <select
                  value={profile.bic}
                  onChange={(e) => onUpdateProfile({ bic: e.target.value })}
                  className="w-full px-2.5 py-2 rounded border border-zinc-300 bg-white text-zinc-950"
                >
                  <option value="">Select bank…</option>
                  {banks.map((b) => (
                    <option key={b.swift} value={b.swift}>
                      {b.name} ({b.swift})
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-zinc-600">IBAN / Account Number</span>
                <input
                  value={profile.iban}
                  onChange={(e) => onUpdateProfile({ iban: e.target.value })}
                  className="w-full px-3 py-2 rounded border border-zinc-300 bg-white font-mono text-zinc-950"
                />
              </label>
              <div className="space-y-1">
                <span className="text-zinc-600 block">
                  Can your business fund 30–90 days of stock before Mercenta payment lands?
                </span>
                <div className="flex gap-2">
                  {(['yes', 'partially', 'no'] as const).map((ans) => (
                    <button
                      key={ans}
                      type="button"
                      onClick={() => onUpdateProfile({ workingCapitalAnswer: ans })}
                      className={`px-3 py-1.5 rounded border capitalize ${
                        profile.workingCapitalAnswer === ans
                          ? 'border-[#C2410C] bg-orange-50 font-medium text-zinc-950'
                          : 'border-zinc-200 bg-white text-zinc-700'
                      }`}
                    >
                      {ans}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <NoticeBanner
                tone="info"
                message={`System provisional recommendation: ${fulfillmentTrackLabel(recommendedTrack)}`}
              />
              {(['direct_fulfillment', 'financed'] as const).map((track) => (
                <button
                  key={track}
                  type="button"
                  onClick={() => onUpdateProfile({ fulfillmentTrack: track })}
                  className={`w-full text-left p-3 rounded border ${
                    profile.fulfillmentTrack === track
                      ? 'border-[#C2410C] bg-orange-50'
                      : 'border-zinc-200 bg-white'
                  }`}
                >
                  <div className="font-medium text-zinc-950">{fulfillmentTrackLabel(track)}</div>
                  <div className="text-zinc-600 mt-0.5">{FULFILLMENT_TRACK_HINTS[track]}</div>
                </button>
              ))}
            </div>
          )}

          {step === 5 && (
            <div className="space-y-3">
              <label className="flex items-start gap-2 text-zinc-800">
                <input
                  type="checkbox"
                  checked={legal.logisticsSla}
                  onChange={(e) => setLegal({ ...legal, logisticsSla: e.target.checked })}
                />
                <span>Accept Schedule 4.1 Logistics SLAs</span>
              </label>
              <label className="flex items-start gap-2 text-zinc-800">
                <input
                  type="checkbox"
                  checked={legal.chargebackIndemnity}
                  onChange={(e) =>
                    setLegal({ ...legal, chargebackIndemnity: e.target.checked })
                  }
                />
                <span>Accept Schedule 4.2 Chargeback & Shortage Indemnity</span>
              </label>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-3">
              <div className="rounded border border-zinc-200 bg-zinc-50 p-3 text-zinc-700">
                Purchase orders must be acknowledged within 24 hours on Mercenta. Unconfirmed POs
                risk automated channel deductions.
              </div>
              <label className="flex items-center gap-2 font-medium text-zinc-950">
                <input
                  type="checkbox"
                  checked={guidanceAck}
                  onChange={(e) => setGuidanceAck(e.target.checked)}
                />
                <ShieldCheck className="w-4 h-4 text-[#C2410C]" aria-hidden="true" />
                I acknowledge MOQ, packaging, and PO acknowledgement rules
              </label>
            </div>
          )}

          <div className="pt-4 border-t border-zinc-200 flex items-center justify-between">
            <button
              type="button"
              disabled={step === 1}
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              className="px-3.5 py-1.5 rounded border border-zinc-300 bg-white text-zinc-700 disabled:opacity-40"
            >
              Previous
            </button>
            {step < 6 ? (
              <button
                type="button"
                disabled={!canNext}
                onClick={() => setStep((s) => Math.min(6, s + 1))}
                className="px-4 py-1.5 rounded bg-[#C2410C] text-white font-medium hover:bg-[#9A3412] disabled:opacity-40"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                disabled={!canNext}
                onClick={() =>
                  onCompleteOnboarding({
                    poRulesAcknowledged: guidanceAck,
                    logisticsSla: legal.logisticsSla,
                    chargebackIndemnity: legal.chargebackIndemnity,
                  })
                }
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded bg-[#C2410C] text-white font-medium hover:bg-[#9A3412] disabled:opacity-40"
              >
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                Complete Onboarding
              </button>
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
