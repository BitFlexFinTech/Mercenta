import { useEffect, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { BRAND_NAME, BRAND_LEGAL_NAME } from '@/config/brand';
import { APPROVED_CATEGORIES, AGREEMENT_VERSIONS, type BrandAgreementType } from '@/types';
import { acceptBrandAgreement } from '@/data/api';
import { BANKS_BY_COUNTRY, type BankEntry } from '@/data/banksByCountry';
import {
  COMMERCIAL_MODELS,
  COMMERCIAL_MODEL_ORDER,
  checkCommercialModelSelection,
} from '@/config/commercialModel';
import { BrandMark } from '@/components/shared/BrandMark';
import { Button, Input, Select, Checkbox } from '@/components/ui';
import { fulfillmentTrackLabel, FULFILLMENT_TRACK_HINTS } from '@/config/fulfillmentTrack';
import { BrandGuidance } from '@/components/shared/BrandGuidance';
import { cn } from '@/utils/cn';
import type { BrandRegion, FulfillmentTrack, FinancingPartner } from '@/types';
import { getFinancingPartnerForRegion } from '@/types';
import {
  Building2,
  FileText,
  Landmark,
  Route,
  Check,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Globe2,
  Scale,
  ScrollText,
} from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Brand Profile', icon: Building2 },
  { id: 2, label: 'Legal Agreement', icon: FileText },
  { id: 3, label: 'Banking', icon: Landmark },
  { id: 4, label: 'Fulfillment Track', icon: Route },
  { id: 5, label: 'Legal Agreements', icon: ScrollText },
  { id: 6, label: 'Operational Guidance', icon: Scale },
];
// §Stage-20.2 — the former "3PL Carrier Integration" step was REMOVED:
// carrier relationships are admin-managed (Super Admin).
// §P9 (programme decision 4) — the "3PL Carrier Terminal" it referenced is itself
// REMOVED: a carrier never logs into Mercenta. Brands never configure
// DHL/Palletline connections themselves.
// §Batch-15 — step 5 added for required MOQ/pricing/packaging/PO-rejection guidance.

const REGIONS: { value: BrandRegion; label: string }[] = [
  { value: 'north_america', label: 'North America (US / Canada)' },
  { value: 'europe', label: 'Europe (EU / Non-EU)' },
  { value: 'africa', label: 'Africa' },
];

const NATIONS_BY_REGION: Record<BrandRegion, { value: string; label: string }[]> = {
  north_america: [
    { value: 'United States', label: 'United States' },
    { value: 'Canada', label: 'Canada' },
  ],
  europe: [
    { value: 'Germany', label: 'Germany' },
    { value: 'France', label: 'France' },
    { value: 'Italy', label: 'Italy' },
    { value: 'Netherlands', label: 'Netherlands' },
    { value: 'Spain', label: 'Spain' },
    { value: 'United Kingdom', label: 'United Kingdom (Non-EU)' },
  ],
  africa: [
    { value: 'Zimbabwe', label: 'Zimbabwe' },
    { value: 'South Africa', label: 'South Africa' },
    { value: 'Kenya', label: 'Kenya' },
    { value: 'Nigeria', label: 'Nigeria' },
    { value: 'Ghana', label: 'Ghana' },
    { value: 'Ethiopia', label: 'Ethiopia' },
    { value: 'Tanzania', label: 'Tanzania' },
    { value: 'Rwanda', label: 'Rwanda' },
  ],
};

const TAX_ID_LABELS: Record<BrandRegion, string> = {
  north_america: 'EIN (Employer Identification Number)',
  europe: 'VAT Number',
  africa: 'TIN / BP Number',
};

const TAX_ID_PLACEHOLDERS: Record<BrandRegion, string> = {
  north_america: 'e.g. 12-3456789',
  europe: 'e.g. DE123456789',
  africa: 'e.g. BP-12345-2026',
};

const CURRENCIES_BY_REGION: Record<BrandRegion, { value: string; label: string }[]> = {
  north_america: [
    { value: 'USD', label: 'USD — US Dollars ($)' },
    { value: 'GBP', label: 'GBP — British Pounds (£)' },
  ],
  europe: [
    { value: 'EUR', label: 'EUR — Euros (€)' },
    { value: 'GBP', label: 'GBP — British Pounds (£)' },
  ],
  africa: [
    { value: 'GBP', label: 'GBP — British Pounds (£)' },
    { value: 'USD', label: 'USD — US Dollars ($)' },
    { value: 'EUR', label: 'EUR — Euros (€)' },
  ],
};

export function OnboardingWizard({ initialStep = 1 }: { initialStep?: number }) {
  const { session, brandProfile, setBrandProfile, completeOnboarding } = useApp();
  const [step, setStep] = useState(initialStep);
  const [checks, setChecks] = useState({
    exclusive: false,
    compliance: false,
    payment: false,
  });
  const [guidanceAck, setGuidanceAck] = useState(false);
  const [legalAgreements, setLegalAgreements] = useState({
    logisticsSla: false,
    chargebackIndemnity: false,
  });

  const update = (field: string, value: string) =>
    setBrandProfile({ ...brandProfile, [field]: value });

  const updateRegion = (region: BrandRegion) => {
    setBrandProfile({
      ...brandProfile,
      region,
      nation: '',
      payoutCurrency: region === 'north_america' ? 'USD' : region === 'europe' ? 'EUR' : 'GBP',
    });
  };

  const canProceed = () => {
    if (step === 1)
      return (
        brandProfile.businessName &&
        brandProfile.region &&
        brandProfile.nation &&
        brandProfile.taxId &&
        brandProfile.email
      ) && !!brandProfile.category;
    if (step === 2)
      return (
        !!brandProfile.signatory &&
        checks.exclusive &&
        checks.compliance &&
        checks.payment &&
        // §5/M12 — fail-closed: no commercial relationship, no continuation.
        checkCommercialModelSelection(brandProfile.commercialModel).ok
      );
    if (step === 3)
      return brandProfile.bic && brandProfile.iban && !!brandProfile.workingCapitalAnswer;
    if (step === 4) return !!brandProfile.fulfillmentTrack && brandProfile.fulfillmentTrack !== 'unassigned';
    if (step === 5) return legalAgreements.logisticsSla && legalAgreements.chargebackIndemnity;
    if (step === 6) return guidanceAck;
    return true;
  };

  /** Provisional auto-score recommendation from what the brand answered so far. */
  const recommendedTrack: FulfillmentTrack =
    brandProfile.workingCapitalAnswer === 'yes' ? 'direct_fulfillment' : 'financed';

  // Pre-fill the confirmation step with the recommendation until the brand edits it.
  useEffect(() => {
    if (step === 4 && (!brandProfile.fulfillmentTrack || brandProfile.fulfillmentTrack === 'unassigned')) {
      setBrandProfile({ ...brandProfile, fulfillmentTrack: recommendedTrack });
    }
  }, [step, brandProfile, recommendedTrack, setBrandProfile]);

  // §Stage-20.2 — no brand-side carrier connection testing; completion no
  // longer writes dhlConnected from wizard state. (§P9 repoint: the old contract
  // also named fedexConnected/bakConnected, which no longer exist.)
  const handleFinish = () => {
    // §Legal — persist mandatory brand agreement acceptances before finishing
    const brandId = session?.tenantId || `brand-${Date.now()}`;
    if (legalAgreements.logisticsSla) {
      acceptBrandAgreement(brandId, 'logistics_sla' as BrandAgreementType, AGREEMENT_VERSIONS.logistics_sla);
    }
    if (legalAgreements.chargebackIndemnity) {
      acceptBrandAgreement(brandId, 'chargeback_indemnity' as BrandAgreementType, AGREEMENT_VERSIONS.chargeback_indemnity);
    }
    /**
     * §P13 / S8 — THE LINK. The operational-guidance step's acknowledgement used to be
     * LOCAL STATE ONLY: the brand ticked the box, the wizard closed, and nothing on the
     * canonical onboarding record said the brand had ever been shown the channel's
     * purchase-order rule. It is now passed to the canonical domain writer
     * (`onboardingLifecycle.acknowledgePurchaseOrderRules`, reached through
     * `completeOnboarding`), which records WHAT was acknowledged (the rule's own text)
     * against the brand's onboarding record, attributed and audited. A brand that has
     * not acknowledged cannot claim it: the flag is passed, never assumed.
     */
    completeOnboarding({ poRulesAcknowledged: guidanceAck });
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <BrandMark alt="Mercenta Partners mark" className="w-9 h-9" />
            <span className="text-lg font-semibold text-strong">{BRAND_NAME}</span>
          </div>
          <h1 className="text-2xl font-bold text-strong mb-1">Brand Onboarding</h1>
          <p className="text-sm text-muted">
                        Global wholesale trade platform — scale your brand into the UK market
          </p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-between mb-8 px-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isDone = step > s.id;
            return (
              <div key={s.id} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      'w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300',
                      isDone
                        ? 'bg-emerald-500/20 text-state-success border border-emerald-500/30'
                        : isActive
                        ? 'bg-accent-500 text-on-accent shadow-ds-raised'
                        : 'bg-surface-raised text-faint border border-hairline'
                    )}
                  >
                    {isDone ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-ds-micro font-medium transition-colors',
                      isActive ? 'text-strong' : 'text-faint'
                    )}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'flex-1 h-px mx-2 mb-5 transition-colors',
                      step > s.id ? 'bg-emerald-500/30' : 'bg-tint'
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="bg-surface-raised border border-hairline rounded-ds-lg p-6 min-h-[340px]">
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-base font-semibold text-strong mb-1">Brand Profile</h2>
              <p className="text-xs text-muted mb-4">
                Tell us about your business and primary contact
              </p>
              <Input
                label="Business Name"
                value={brandProfile.businessName}
                onChange={(e) => update('businessName', e.target.value)}
                placeholder="e.g. Astonish"
                required
              />
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted">Product Category</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {APPROVED_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => update('category', cat)}
                      className={cn(
                        'text-ds-micro px-2.5 py-2 rounded-ds-md border transition-colors text-left',
                        brandProfile.category === cat
                          ? 'border-accent-500/50 bg-accent-500/10 text-strong'
                          : 'border-hairline text-muted hover:border-hairline-strong'
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-accent-400">
                <Globe2 className="w-3.5 h-3.5" />
                <span>Select your region to unlock country options</span>
              </div>
              <Select
                label="Region"
                value={brandProfile.region}
                onChange={(e) => updateRegion(e.target.value as BrandRegion)}
                options={REGIONS}
                required
              />
              <Select
                label="Country / Nation"
                value={brandProfile.nation}
                onChange={(e) => update('nation', e.target.value)}
                options={NATIONS_BY_REGION[brandProfile.region]}
                required
              />
              <Input
                label={TAX_ID_LABELS[brandProfile.region]}
                value={brandProfile.taxId}
                onChange={(e) => update('taxId', e.target.value)}
                placeholder={TAX_ID_PLACEHOLDERS[brandProfile.region]}
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Primary Contact Email"
                  type="email"
                  value={brandProfile.email}
                  onChange={(e) => update('email', e.target.value)}
                  placeholder="name@brand.com"
                  required
                />
                <Input
                  label="Phone"
                  value={brandProfile.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  placeholder="+1 / +44 / +263 ..."
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-base font-semibold text-strong mb-1">
                UK Master Wholesale & Distribution Agreement
              </h2>
              <p className="text-xs text-muted mb-2">
                Review and accept the terms below
              </p>
              <div className="bg-surface border border-hairline rounded-ds-md p-4 max-h-44 overflow-y-auto text-xs text-muted leading-relaxed">
                <p className="mb-3">
                  This Master Wholesale & Distribution Agreement ("Agreement") is entered
                  into between {BRAND_LEGAL_NAME} ("Mercenta"), acting as the Exclusive UK
                  Importer of Record, and the undersigned Brand ("Brand").
                </p>
                <p className="mb-3">
                  <strong className="text-strong">1. Appointment.</strong> Mercenta is
                  hereby appointed as the exclusive UK importer and wholesale distributor
                  of the Brand's products, routing inventory via direct UK retail placement
                  through established national retail networks.
                </p>
                <p className="mb-3">
                  <strong className="text-strong">2. Importer of Record.</strong> Mercenta
                  shall hold valid UK EORI numbers, manage HMRC customs declarations, and
                  ensure full UKCA compliance for all imported goods — regardless of
                  whether the Brand originates from North America, Europe, or Africa.
                </p>
                <p className="mb-3">
                  <strong className="text-strong">3. Exclusivity.</strong> The Brand
                  grants Mercenta exclusive rights to import, clear, and distribute its
                                    products through the retail channel within the United Kingdom territory.
                </p>
                <p className="mb-3">
                  <strong className="text-strong">4. Payment Terms.</strong> Mercenta
                  shall purchase inventory at agreed Ex-Works wholesale prices and remit
                  payouts to the Brand's nominated banking account in the selected payout
                  currency.
                </p>
                <p>
                  <strong className="text-strong">5. Compliance.</strong> The Brand
                  warrants that all products meet applicable UK and EU regulatory
                  standards, including labelling, hazardous materials, and food safety
                  requirements where applicable.
                </p>
              </div>
              <Input
                label="Authorized Signatory Name"
                value={brandProfile.signatory}
                onChange={(e) => update('signatory', e.target.value)}
                placeholder="Full legal name"
                required
              />
              <div className="space-y-2.5 pt-1">
                <Checkbox
                  label="I confirm Mercenta acts as Exclusive UK Importer of Record for my brand"
                  checked={checks.exclusive}
                  onChange={(c) => setChecks({ ...checks, exclusive: c })}
                  required
                />
                <Checkbox
                  label="I agree to comply with all UK HMRC customs and UKCA regulatory requirements"
                  checked={checks.compliance}
                  onChange={(c) => setChecks({ ...checks, compliance: c })}
                  required
                />
                <Checkbox
                  label="I accept the wholesale pricing and payout terms as negotiated"
                  checked={checks.payment}
                  onChange={(c) => setChecks({ ...checks, payment: c })}
                  required
                />
              </div>

              {/* §5/M12 — THE COMMERCIAL RELATIONSHIP. Internal between Mercenta and
                  the brand; it is a DIFFERENT concept from the retail-channel
                  compliance documents the products need, and it can never change
                  which documents are required. */}
              <div className="border-t border-hairline pt-4 space-y-2.5">
                <div>
                  <h3 className="text-xs font-semibold text-strong">
                    Commercial Relationship with Mercenta
                  </h3>
                  <p className="text-ds-micro text-muted mt-1">
                    Choose how Mercenta and your brand trade. This is a private commercial
                    agreement between us — it does <strong className="text-muted">not</strong> change
                    the retail-channel compliance documents your products require, and no
                    commercial model removes a compliance requirement.
                  </p>
                </div>
                <div className="grid gap-2" data-testid="commercial-model-options">
                  {COMMERCIAL_MODEL_ORDER.map((id) => {
                    const def = COMMERCIAL_MODELS[id];
                    const selected = brandProfile.commercialModel === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        data-testid={`commercial-model-${id}`}
                        onClick={() =>
                          setBrandProfile({ ...brandProfile, commercialModel: id })
                        }
                        className={cn(
                          'text-left rounded-ds-md border px-3 py-2.5 transition-colors',
                          selected
                            ? 'border-accent-500/50 bg-accent-500/10'
                            : 'border-hairline hover:border-hairline-strong'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'w-3.5 h-3.5 rounded-full border flex-shrink-0',
                              selected ? 'border-accent-400 bg-accent-400' : 'border-hairline-strong'
                            )}
                          />
                          <span className={cn('text-xs font-medium', selected ? 'text-strong' : 'text-strong')}>
                            {def.label}
                          </span>
                        </div>
                        <p className="text-ds-micro text-muted mt-1 leading-relaxed">{def.summary}</p>
                      </button>
                    );
                  })}
                </div>
                {!checkCommercialModelSelection(brandProfile.commercialModel).ok && (
                  <p className="text-ds-micro text-state-warning/90" data-testid="commercial-model-required">
                    Commercial relationship required — onboarding cannot continue until you
                    choose Model A or Model B.
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-base font-semibold text-strong mb-1">Banking Details</h2>
              <p className="text-xs text-muted mb-4">
                Where should we send your wholesale payouts?
              </p>

              {(() => {
                const nation = brandProfile.nation;
                const banks = nation ? (BANKS_BY_COUNTRY[nation] ?? []) : [];
                if (!nation) return <p className="text-xs text-faint">Select a country in step 1 to see available banks.</p>;

                const bankOptions = banks.map((b) => ({ value: b.swift, label: `${b.name} (${b.swift})` }));
                const selectedBank = banks.find((b) => b.swift === brandProfile.bic);

                return (
                  <>
                    <div>
                      <label className="text-xs font-medium text-muted mb-1.5 block">Select Your Bank</label>
                      <select
                        value={brandProfile.bic}
                        onChange={(e) => update('bic', e.target.value)}
                        className="w-full bg-surface-overlay border border-hairline rounded-ds-md px-3 py-2 text-xs text-strong focus:outline-none focus:border-accent-500/40 appearance-none"
                        required
                      >
                        <option value="">-- Select bank --</option>
                        {bankOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      {selectedBank && (
                        <div className="bg-accent-500/5 border border-accent-500/20 rounded-ds-md p-3 mt-2 text-ds-micro text-muted space-y-1">
                          <p><span className="text-muted">Account format:</span> {selectedBank.accountFormat}</p>
                          {selectedBank.routingLabel && <p><span className="text-muted">{selectedBank.routingLabel}:</span> {selectedBank.routingExample}</p>}
                          <p><span className="text-muted">SWIFT/BIC:</span> <span className="text-strong font-mono">{selectedBank.swift}</span> (pre-filled)</p>
                        </div>
                      )}
                    </div>
                    <Input label="IBAN / Account Number" value={brandProfile.iban} onChange={(e) => update('iban', e.target.value)} placeholder={selectedBank ? `e.g. ${selectedBank.accountFormat}` : 'Enter account number'} required />
                  </>
                );
              })()}

              <Select
                label="Payout Currency"
                value={brandProfile.payoutCurrency}
                onChange={(e) => update('payoutCurrency', e.target.value)}
                options={CURRENCIES_BY_REGION[brandProfile.region]}
              />
              <div className="bg-accent-500/10 border border-accent-500/20 rounded-ds-md p-3 text-xs text-muted">
                Payouts are processed bi-weekly. Available currencies are based on your
                region selection ({REGIONS.find((r) => r.value === brandProfile.region)?.label}).
                GBP is always available for UK retail reconciliation.
              </div>

              {/* §5 — working-capital qualification question */}
              <div>
                <label className="text-xs font-medium text-muted mb-1.5 block">
                  Working Capital Qualification
                </label>
                <p className="text-xs text-muted mb-2">
                  Can your business fund 30–90 days of stock before Mercenta payment lands?
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { value: 'yes', label: 'Yes' },
                      { value: 'partially', label: 'Partially' },
                      { value: 'no', label: 'No' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => update('workingCapitalAnswer', opt.value)}
                      className={cn(
                        'text-xs px-3 py-2 rounded-ds-md border transition-colors',
                        brandProfile.workingCapitalAnswer === opt.value
                          ? 'border-accent-500/50 bg-accent-500/10 text-strong'
                          : 'border-hairline text-muted hover:border-hairline-strong'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-ds-micro text-faint mt-1.5">
                  This directly affects your fulfillment track assessment.
                </p>
              </div>

              {/* §Stage-2 — fulfillment model selection moved to its own step (4) */}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-base font-semibold text-strong mb-1">Fulfillment Track</h2>
              <p className="text-xs text-muted mb-2">
                Confirm how your goods reach the UK. This is pre-filled with the
                system's provisional recommendation based on your answers — you can
                change it. Mercenta may adjust the final track after document review;
                any change to a signed agreement is issued as a formal amendment,
                never a silent edit.
              </p>

              <div className="bg-state-success/10 border border-state-success/20 rounded-ds-md p-3 text-xs text-muted">
                System recommendation:{' '}
                <span className="text-strong font-medium">
                  {fulfillmentTrackLabel(recommendedTrack)}
                </span>{' '}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    {
                      value: 'direct_fulfillment',
                      label: fulfillmentTrackLabel('direct_fulfillment'),
                      hint: FULFILLMENT_TRACK_HINTS.direct_fulfillment,
                    },
                    {
                      value: 'financed',
                      label: fulfillmentTrackLabel('financed'),
                      hint: FULFILLMENT_TRACK_HINTS.financed,
                    },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update('fulfillmentTrack', opt.value)}
                    className={cn(
                      'text-left px-3 py-2.5 rounded-ds-md border transition-colors relative',
                      brandProfile.fulfillmentTrack === opt.value
                        ? 'border-accent-500/50 bg-accent-500/10'
                        : 'border-hairline hover:border-hairline-strong'
                    )}
                  >
                    {recommendedTrack === opt.value && (
                      <span className="absolute top-1.5 right-1.5 text-ds-micro px-1.5 py-0.5 rounded-ds-sm bg-state-success/10 text-state-success border border-state-success/20">
                        Recommended
                      </span>
                    )}
                    <span className="block text-xs font-medium text-strong">{opt.label}</span>
                    <span className="block text-ds-micro text-muted mt-0.5">{opt.hint}</span>
                  </button>
                ))}
              </div>

              {/* §Batch-18 — Show regional financing partner when financed track is selected */}
              {brandProfile.fulfillmentTrack === 'financed' && (function() {
                const region = brandProfile.region as BrandRegion;
                const partners = getFinancingPartnerForRegion(region);
                if (partners.length === 0) return null;
                return (
                  <div className="bg-emerald-500/5 border border-state-success/20 rounded-ds-md p-3">
                    <p className="text-ds-micro font-medium text-state-success mb-1.5">Your Region's Financing Partner</p>
                    {partners.map(function(p) {
                      return (
                        <div key={p.id} className="text-ds-micro text-muted space-y-0.5">
                          <p className="text-strong font-medium">{p.name}</p>
                          <p>{p.description}</p>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-1 text-ds-micro">
                            <span className="text-muted">Advance rate:</span>
                            <span className="font-mono text-strong">{(p.advanceRate * 100).toFixed(0)}%</span>
                            <span className="text-muted">Fees:</span>
                            <span className="font-mono text-strong">{p.feeRange}</span>
                            <span className="text-muted">Turnaround:</span>
                            <span className="font-mono text-strong">{p.turnaroundDays}</span>
                            <span className="text-muted">Deal size:</span>
                            <span className="font-mono text-strong">{p.minDealSize} – {p.maxDealSize}</span>
                          </div>
                        </div>
                      );
                    })}
                    <p className="text-ds-micro text-faint mt-1.5">
                      This financing option is available to qualifying brands on the financed track.
                    </p>
                  </div>
                );
              })()}
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-base font-semibold text-strong mb-1">Mandatory Legal Agreements</h2>
              <p className="text-xs text-muted mb-2">
                Please review and accept both agreements below. You must scroll through each
                section and click "I have read and agree" for each one before you can continue.
              </p>

              {/* 4.1 — Logistics SLAs & Carrier Alignment */}
              <div className="border border-hairline rounded-ds-md overflow-hidden">
                <div className="bg-surface/80 border-b border-hairline px-4 py-2.5">
                  <h3 className="text-xs font-semibold text-strong">
                    4.1 — Logistics SLAs & Carrier Alignment
                  </h3>
                </div>
                <div className="bg-surface border-hairline p-4 max-h-36 overflow-y-auto text-xs text-muted leading-relaxed">
                  <p className="mb-3">
                    The Supplier explicitly acknowledges that all logistical executions under
                    this Agreement must strictly align with retail-channel vendor core metrics.
                    The Platform dictates the exclusive utilization of DHL Express / DHL Cargo
                    via integrated API label generation.
                  </p>
                  <p className="mb-3">
                    The Supplier guarantees a Minimum Purchase Order Acceptance Rate of 95% and
                    an On-Time Shipment Rate of 98% within the designated retail-channel shipping window.
                  </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2.5 border-t border-hairline bg-surface-tint">
                  <input
                    type="checkbox"
                    id="agreement-logistics"
                    checked={legalAgreements.logisticsSla}
                    onChange={(e) =>
                      setLegalAgreements({ ...legalAgreements, logisticsSla: e.target.checked })
                    }
                    className="w-3.5 h-3.5 accent-[var(--mr-accent)]"
                  />
                  <label htmlFor="agreement-logistics" className="text-ds-micro text-muted cursor-pointer select-none">
                    I have read and agree to the Logistics SLAs &amp; Carrier Alignment terms
                  </label>
                </div>
              </div>

              {/* 4.2 — Automated Chargeback Remediation & Financial Indemnity */}
              <div className="border border-hairline rounded-ds-md overflow-hidden">
                <div className="bg-surface/80 border-b border-hairline px-4 py-2.5">
                  <h3 className="text-xs font-semibold text-strong">
                    4.2 — Automated Chargeback Remediation & Financial Indemnity
                  </h3>
                </div>
                <div className="bg-surface border-hairline p-4 max-h-36 overflow-y-auto text-xs text-muted leading-relaxed">
                  <p className="mb-3">
                    In the event that the retail channel issues an operational chargeback,
                    cost-deduction, or logistical penalty resulting from Supplier
                    negligence—including but not limited to: late handovers to DHL, missing
                    Advanced Shipping Notices (ASNs), barcode non-compliance, or structural
                    packaging defects—the Platform reserves the absolute right to automatically
                    trace, attribute, and deduct 100% of the financial penalty directly from the
                    Supplier's next rolling wholesale payout disbursement.
                  </p>
                  <p className="mb-3">
                    Furthermore, the Supplier agrees to indemnify the Platform against any
                    systemic account-level restrictions caused by a breach of these operational
                    metrics.
                  </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2.5 border-t border-hairline bg-surface-tint">
                  <input
                    type="checkbox"
                    id="agreement-chargeback"
                    checked={legalAgreements.chargebackIndemnity}
                    onChange={(e) =>
                      setLegalAgreements({ ...legalAgreements, chargebackIndemnity: e.target.checked })
                    }
                    className="w-3.5 h-3.5 accent-[var(--mr-accent)]"
                  />
                  <label htmlFor="agreement-chargeback" className="text-ds-micro text-muted cursor-pointer select-none">
                    I have read and agree to the Chargeback Remediation &amp; Financial Indemnity terms
                  </label>
                </div>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-base font-semibold text-strong mb-1">Operational Guidance</h2>
              {/*
                §P13 / S8 — REPOINTED (old contract recorded): this paragraph used to read
                *"…understanding how pricing, packaging, and PO rejections affect your
                vendor performance is essential for a successful partnership."* — an
                unsupported consequence claim (AV-003). The rule itself now comes from its
                ONE owner (`PO_ACK_ONBOARDING_STATEMENT`).
              */}
              <p className="text-xs text-muted mb-2">
                Please review the following operational information. This is a required step —
                pricing, packaging and the channel's purchase-order acknowledgement rule are
                what a successful partnership is built on.
              </p>
              <BrandGuidance
                requireAck
                ack={guidanceAck}
                onAckChange={setGuidanceAck}
              />
            </div>
          )}


        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Button>
          {step < 6 ? (
            <Button
              onClick={() => setStep((s) => Math.min(6, s + 1))}
              disabled={!canProceed()}
            >
              Continue
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button onClick={handleFinish}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              Complete Onboarding
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
