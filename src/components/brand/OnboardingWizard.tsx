import { useState } from 'react';
import { useApp } from '@/store';
import { Button, Input, Select, Checkbox } from '@/components/ui';
import { cn } from '@/utils/cn';
import type { BrandRegion } from '@/types';
import {
  Building2,
  FileText,
  Landmark,
  Truck,
  Check,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Upload,
  CheckCircle2,
  Globe2,
} from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Brand Profile', icon: Building2 },
  { id: 2, label: 'Legal Agreement', icon: FileText },
  { id: 3, label: 'Banking', icon: Landmark },
  { id: 4, label: '3PL Carrier Integration', icon: Truck },
];

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
  europe: 'VAT / EORI Number',
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

export function OnboardingWizard() {
  const { brandProfile, setBrandProfile, completeOnboarding } = useApp();
  const [step, setStep] = useState(1);
  const [checks, setChecks] = useState({
    exclusive: false,
    compliance: false,
    payment: false,
  });
  const [carrierTests, setCarrierTests] = useState({
    dhl: 'idle' as 'idle' | 'testing' | 'success',
    fedex: 'idle' as 'idle' | 'testing' | 'success',
    bak: 'idle' as 'idle' | 'testing' | 'success',
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
      );
    if (step === 2)
      return brandProfile.signatory && checks.exclusive && checks.compliance && checks.payment;
    if (step === 3) return brandProfile.bic && brandProfile.iban;
    return true;
  };

  const testConnection = (carrier: 'dhl' | 'fedex' | 'bak') => {
    setCarrierTests((prev) => ({ ...prev, [carrier]: 'testing' }));
    setTimeout(() => {
      setCarrierTests((prev) => ({ ...prev, [carrier]: 'success' }));
      setBrandProfile({ ...brandProfile, [`${carrier}Connected`]: true });
    }, 2000);
  };

  const handleFinish = () => {
    setBrandProfile({
      ...brandProfile,
      dhlConnected: carrierTests.dhl === 'success',
      fedexConnected: carrierTests.fedex === 'success',
      bakConnected: carrierTests.bak === 'success',
    });
    completeOnboarding();
  };

  const isAfrican = brandProfile.region === 'africa';

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-lg bg-neon-500 flex items-center justify-center text-white font-bold">
              B
            </div>
            <span className="text-lg font-semibold text-white">Boxbee Commerce</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Brand Onboarding</h1>
          <p className="text-sm text-zinc-500">
            Global 1P Wholesale Trade Platform — scale your brand into the UK market
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
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : isActive
                        ? 'bg-neon-500 text-white shadow-lg shadow-neon-500/30'
                        : 'bg-ink-850 text-zinc-600 border border-white/[0.08]'
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
                      'text-[10px] font-medium transition-colors',
                      isActive ? 'text-white' : 'text-zinc-600'
                    )}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'flex-1 h-px mx-2 mb-5 transition-colors',
                      step > s.id ? 'bg-emerald-500/30' : 'bg-white/[0.06]'
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="bg-ink-850 border border-white/[0.06] rounded-xl p-6 min-h-[340px]">
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-base font-semibold text-white mb-1">Brand Profile</h2>
              <p className="text-xs text-zinc-500 mb-4">
                Tell us about your business and primary contact
              </p>
              <Input
                label="Business Name"
                value={brandProfile.businessName}
                onChange={(e) => update('businessName', e.target.value)}
                placeholder="e.g. Sweet Pea Botanicals"
                required
              />
              <div className="flex items-center gap-2 text-xs text-neon-400">
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
              <h2 className="text-base font-semibold text-white mb-1">
                UK Master Wholesale & Distribution Agreement
              </h2>
              <p className="text-xs text-zinc-500 mb-2">
                Review and accept the terms below
              </p>
              <div className="bg-ink-900 border border-white/[0.06] rounded-lg p-4 max-h-44 overflow-y-auto text-xs text-zinc-400 leading-relaxed">
                <p className="mb-3">
                  This Master Wholesale & Distribution Agreement ("Agreement") is entered
                  into between Boxbee Commerce Ltd ("Boxbee"), acting as the Exclusive UK
                  Importer of Record, and the undersigned Brand ("Brand").
                </p>
                <p className="mb-3">
                  <strong className="text-zinc-300">1. Appointment.</strong> Boxbee is
                  hereby appointed as the exclusive UK importer and wholesale distributor
                  of the Brand's products, routing inventory via UK-established 1P Amazon
                  Vendor Central distribution networks.
                </p>
                <p className="mb-3">
                  <strong className="text-zinc-300">2. Importer of Record.</strong> Boxbee
                  shall hold valid UK EORI numbers, manage HMRC customs declarations, and
                  ensure full UKCA compliance for all imported goods — regardless of
                  whether the Brand originates from North America, Europe, or Africa.
                </p>
                <p className="mb-3">
                  <strong className="text-zinc-300">3. Exclusivity.</strong> The Brand
                  grants Boxbee exclusive rights to import, clear, and distribute its
                  products through Amazon 1P channels within the United Kingdom territory.
                </p>
                <p className="mb-3">
                  <strong className="text-zinc-300">4. Payment Terms.</strong> Boxbee
                  shall purchase inventory at agreed Ex-Works wholesale prices and remit
                  payouts to the Brand's nominated banking account in the selected payout
                  currency.
                </p>
                <p>
                  <strong className="text-zinc-300">5. Compliance.</strong> The Brand
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
                  label="I confirm Boxbee acts as Exclusive UK Importer of Record for my brand"
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
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-base font-semibold text-white mb-1">Banking Details</h2>
              <p className="text-xs text-zinc-500 mb-4">
                Where should we send your wholesale payouts?
              </p>
              <Input
                label="SWIFT/BIC Code"
                value={brandProfile.bic}
                onChange={(e) => update('bic', e.target.value)}
                placeholder="e.g. BARTZWHXXXX"
                required
              />
              <Input
                label="IBAN / Account Number"
                value={brandProfile.iban}
                onChange={(e) => update('iban', e.target.value)}
                placeholder="e.g. ZW64 BART 0000 1234 5678 90"
                required
              />
              <Select
                label="Payout Currency"
                value={brandProfile.payoutCurrency}
                onChange={(e) => update('payoutCurrency', e.target.value)}
                options={CURRENCIES_BY_REGION[brandProfile.region]}
              />
              <div className="bg-neon-500/10 border border-neon-500/20 rounded-lg p-3 text-xs text-zinc-400">
                Payouts are processed bi-weekly. Available currencies are based on your
                region selection ({REGIONS.find((r) => r.value === brandProfile.region)?.label}).
                GBP is always available for UK Vendor Central reconciliation.
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5 animate-fade-in">
              <h2 className="text-base font-semibold text-white mb-1">
                3PL Carrier Integration
              </h2>
              <p className="text-xs text-zinc-500 mb-2">
                Connect your logistics accounts to enable shipment tracking
              </p>

              {/* DHL */}
              <CarrierCard
                name="DHL Express"
                description="Global air courier parcels — available for all regions (US, EU, Africa)"
                color="text-amber-400"
                fields={['Account Number', 'API Client ID', 'Client Secret', 'Webhook URL']}
                testState={carrierTests.dhl}
                onTest={() => testConnection('dhl')}
              />

              {/* FedEx */}
              <CarrierCard
                name="FedEx International"
                description="Global air courier parcels — available for all regions (US, EU, Africa)"
                color="text-purple-400"
                fields={['Account Number', 'API Client ID', 'Client Secret', 'Webhook URL']}
                testState={carrierTests.fedex}
                onTest={() => testConnection('fedex')}
              />

              {/* BAK — conditional */}
              {isAfrican && (
                <CarrierCard
                  name="BAK Logistics Integration"
                  description="Heavy freight consolidation, bonded warehousing & multi-modal African transport — available when African networks are needed"
                  color="text-blue-400"
                  fields={[
                    'BAK Client Account Number',
                    'Primary Consolidation Depot',
                  ]}
                  depotOptions
                  hasFileUpload
                  fileLabel="ZIMRA Customs Clearing Power of Attorney"
                  testState={carrierTests.bak}
                  onTest={() => testConnection('bak')}
                />
              )}

              {!isAfrican && (
                <div className="bg-ink-900 border border-white/[0.04] rounded-lg p-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Truck className="w-4 h-4 text-blue-500/50" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-600">BAK Logistics Integration</h3>
                    <p className="text-[11px] text-zinc-700 mt-0.5">
                      Available for African-origin brands. BAK provides heavy freight
                      consolidation and bonded warehousing for Southern African transport
                      networks. Your region ({REGIONS.find((r) => r.value === brandProfile.region)?.label})
                      uses DHL/FedEx for courier service.
                    </p>
                  </div>
                </div>
              )}
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
          {step < 4 ? (
            <Button
              onClick={() => setStep((s) => Math.min(4, s + 1))}
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

function CarrierCard({
  name,
  description,
  color,
  fields,
  depotOptions,
  hasFileUpload,
  fileLabel,
  testState,
  onTest,
}: {
  name: string;
  description: string;
  color: string;
  fields: string[];
  depotOptions?: boolean;
  hasFileUpload?: boolean;
  fileLabel?: string;
  testState: 'idle' | 'testing' | 'success';
  onTest: () => void;
}) {
  return (
    <div className="bg-ink-900 border border-white/[0.06] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className={`text-sm font-semibold ${color}`}>{name}</h3>
          <p className="text-[11px] text-zinc-600">{description}</p>
        </div>
        {testState === 'success' && (
          <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            API Connection Live & Bonded Account Linked
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {fields.map((field) =>
          depotOptions && field === 'Primary Consolidation Depot' ? (
            <Select
              key={field}
              label={field}
              options={[
                { value: 'Harare Willowvale Depot', label: 'Harare Willowvale Depot' },
                { value: 'Bulawayo Hub', label: 'Bulawayo Hub' },
                { value: 'Mutare Transit Hub', label: 'Mutare Transit Hub' },
              ]}
            />
          ) : (
            <Input key={field} label={field} placeholder={field} />
          )
        )}
      </div>
      {hasFileUpload && (
        <div className="mt-2.5">
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            {fileLabel}
          </label>
          <div className="border border-dashed border-white/[0.1] rounded-lg px-4 py-3 flex items-center gap-2 text-xs text-zinc-500 hover:border-neon-500/30 cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5" />
            Click to upload PDF / DOC
          </div>
        </div>
      )}
      <div className="mt-3 flex items-center gap-3">
        <Button size="sm" variant="secondary" onClick={onTest} disabled={testState === 'testing'}>
          {testState === 'testing' ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Testing Connection...
            </>
          ) : (
            'Test Connection'
          )}
        </Button>
        {testState === 'testing' && (
          <div className="flex-1 h-1 bg-ink-700 rounded-full overflow-hidden">
            <div className="h-full bg-neon-500 rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        )}
      </div>
    </div>
  );
}
