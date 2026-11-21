import { useMemo, useRef, useState, type CSSProperties } from 'react';
import { BRAND_NAME } from '@/config/brand';
import { PRODUCT_CATEGORIES, MONTHLY_REVENUE_OPTIONS } from '@/types';
import {
  APPLICATION_SPAM_POLICY,
  PARTNER_APPLICATION_COUNTRIES,
  PARTNER_APPLICATION_LIMITS,
  applicationMessage,
} from '@/config/partnerApplication';
import {
  evaluateApplicationSubmission,
  fingerprintFromRaw,
  type ApplicationFieldName,
  type FieldIssue,
} from '@/lib/onboarding/applicationGuard';
import {
  getApplicationAttempts,
  recordApplicationAttempt,
  submitApplication,
  updateApplicationLinkStatus,
} from '@/data/applicationStore';
/* §CG — the ONE verifier, now used the NON-BLOCKING way. It used to run INSIDE the
 * submit handler, so a slow (10s per link) or CORS-blocked third-party check held
 * the applicant's button open; the application is now recorded first and the
 * result is attached when it resolves. */
import { verifyLinksNonBlocking } from '@/lib/verification/linkVerifier';
import { ArrowLeft, Send, CheckCircle2, Globe, Instagram, Facebook, Search } from 'lucide-react';
import { BrandMark } from '@/components/shared/BrandMark';

/**
 * §CG — the honeypot is positioned OFF-SCREEN rather than `display:none`, because
 * some form-filling bots skip `display:none` inputs. It is `aria-hidden`, cannot
 * be tabbed to, and is never announced — a person cannot reach it, a bot filling
 * every field completes it, and its declared name/label live in the config.
 */
const HONEYPOT_STYLE: CSSProperties = {
  position: 'absolute',
  left: '-9999px',
  top: 0,
  width: 1,
  height: 1,
  overflow: 'hidden',
};

/** One field's declared refusal, rendered under its own control (never a summary only). */
function FieldError({ field, issues }: { field: ApplicationFieldName; issues: FieldIssue[] }) {
  const found = issues.find((i) => i.field === field);
  if (!found) return null;
  return (
    <p
      id={`cg-${field}-error`}
      data-cg-error={field}
      role="alert"
      className="text-ds-micro text-red-400 mt-1"
    >
      {found.message}
    </p>
  );
}

interface PartnerApplicationFormProps {
  onBack: () => void;
  onSubmitted: () => void;
}

export function PartnerApplicationForm({ onBack, onSubmitted }: PartnerApplicationFormProps) {
  const [companyName, setCompanyName] = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<{ name: string; code: string } | null>(null);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [category, setCategory] = useState<string>(PRODUCT_CATEGORIES[0]);
  const [skuCount, setSkuCount] = useState('');
  const [monthlyRevenue, setMonthlyRevenue] = useState<string>(MONTHLY_REVENUE_OPTIONS[0]);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [referralSource, setReferralSource] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [issues, setIssues] = useState<FieldIssue[]>([]);
  const [honeypot, setHoneypot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  /* §CG — the clock seam: elapsed time is measured from the moment this form
   * mounted. `submittingRef` stops a double click SYNCHRONOUSLY, before React can
   * flush `submitting` — the state guard alone is one paint too late, which is how
   * a double click used to create two applications. */
  const renderedAtRef = useRef<number>(Date.now());
  const submittingRef = useRef(false);

  const filteredCountries = useMemo(() => {
    if (!countrySearch) return PARTNER_APPLICATION_COUNTRIES;
    const q = countrySearch.toLowerCase();
    return PARTNER_APPLICATION_COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.includes(q)
    );
  }, [countrySearch]);

  const selectCountry = (c: { name: string; code: string }) => {
    setSelectedCountry(c);
    setCountrySearch(c.name);
    setPhoneCode(c.code);
    setShowCountryDropdown(false);
  };

  /**
   * §CG — THE ONE SUBMIT PATH.
   *
   * §CG — REPOINTED (old contract recorded, never weakened): the previous handler
   * did three inline checks (company name / country / at least one link — no URL
   * format, no SKU validation), then `await verifyLinks(...)` BEFORE the write (a
   * real third-party fetch, 10s per link, with no ceiling on the applicant's
   * patience), then `submitApplication(...)`, with no `try/catch` (a throw left the
   * button on "..." forever, with no message) and no duplicate protection. All
   * three original rules still hold — they are now enforced by the declared owner
   * (`evaluateApplicationSubmission`) and rendered per field, and verification runs
   * AFTER the application is recorded.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError('');
    setIssues([]);

    let handedOff = false;
    try {
      const now = Date.now();
      const raw = {
        companyName,
        country: selectedCountry?.name ?? null,
        phone: phoneNumber,
        skuCount,
        websiteUrl,
        instagramUrl,
        facebookUrl,
        referralSource,
        description,
      };

      const decision = evaluateApplicationSubmission({
        raw,
        honeypot,
        elapsedMs: now - renderedAtRef.current,
        attempts: getApplicationAttempts(now),
        now,
      });

      // §CG — EVERY attempt is counted, accepted or refused. A refusal that costs
      // a bot nothing is not a rate limit.
      recordApplicationAttempt({
        code: decision.code,
        fingerprint: fingerprintFromRaw(raw),
        recorded: decision.outcome === 'accept',
        at: now,
      });

      if (decision.outcome === 'reject') {
        setIssues(decision.issues);
        /* §CG — EVERY MESSAGE IS ANNOUNCED EXACTLY ONCE.
         * A refusal that blames a field is rendered under that control (which is
         * then focused); only a refusal that has no field to blame — the honeypot,
         * the fill time, the session budget, the duplicate window, an unavailable
         * signal — is shown in the form-level notice. Rendering the same sentence
         * twice inside two `role="alert"` regions makes a screen reader announce it
         * twice and makes the applicant read it twice for no benefit. */
        const blamesAField = Boolean(decision.field) && decision.field !== 'form';
        setError(blamesAField ? '' : decision.message);
        if (decision.field && decision.field !== 'form') {
          document.getElementById(`cg-${decision.field}`)?.focus();
        }
        return;
      }

      const normalised = decision.normalised;
      if (!normalised) {
        setError(applicationMessage('verification_unavailable'));
        return;
      }

      const application = submitApplication({
        companyName: normalised.companyName,
        country: normalised.country,
        category,
        /* §PHONE — COMPULSORY, so this is never null: the guard refuses an empty
         * answer before this line is reached, and `NormalisedApplication.phone` is a
         * `string`. The applicant's digits carry their country's declared dialling
         * code, which the control above shows them. */
        phone: `${phoneCode} ${normalised.phone}`.trim(),
        skuCount: normalised.skuCount,
        monthlyRevenue,
        websiteUrl: normalised.websiteUrl,
        instagramUrl: normalised.instagramUrl,
        facebookUrl: normalised.facebookUrl,
        // §CG — verification has NOT run yet, and the record never claims it has.
        websiteStatus: null,
        instagramStatus: null,
        facebookStatus: null,
        referralSource: normalised.referralSource,
        description: normalised.description,
        opts: { now },
      });

      handedOff = true;
      setSubmitting(false);
      submittingRef.current = false;
      onSubmitted();

      // §CG — SUBMISSION RELIABILITY: the application is recorded, so the applicant
      // is finished. The real link check runs afterwards and only AMENDS the stored
      // provenance; a slow or blocked check can no longer hold anyone open.
      void verifyLinksNonBlocking({
        websiteUrl: normalised.websiteUrl,
        instagramUrl: normalised.instagramUrl,
        facebookUrl: normalised.facebookUrl,
      })
        .then((result) => {
          updateApplicationLinkStatus(application.id, result);
        })
        .catch(() => {
          /* A failure here changes nothing about the recorded application. */
        });
    } catch {
      setError(applicationMessage('verification_unavailable'));
      setIssues([
        {
          field: 'form',
          code: 'verification_unavailable',
          message: applicationMessage('verification_unavailable'),
        },
      ]);
    } finally {
      if (!handedOff) {
        setSubmitting(false);
        submittingRef.current = false;
      }
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl">
        <button onClick={onBack} className="flex items-center gap-2 text-xs text-zinc-500 hover:text-strong transition-colors mb-8">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
        </button>
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <BrandMark alt="Mercenta Partners mark" className="w-10 h-10" />
            <span className="text-xl font-semibold text-strong">{BRAND_NAME}</span>
          </div>
          <h1 className="text-2xl font-bold text-strong mb-1">Request Partner Access</h1>
          <p className="text-sm text-zinc-500">Apply to distribute your products in the UK</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/*
            §CG — THE HONEYPOT. Off-screen, unannounced, not focusable. A person
            never sees it and never fills it; a form-filling bot completes every
            field it can find and is refused. Name, label and class are declared
            once in `APPLICATION_SPAM_POLICY`.
          */}
          <div
            className={APPLICATION_SPAM_POLICY.honeypot.cssClassName}
            style={HONEYPOT_STYLE}
            aria-hidden="true"
            data-cg-honeypot
          >
            <label htmlFor="cg-honeypot" className="block text-xs font-medium text-zinc-400 mb-1.5">
              {APPLICATION_SPAM_POLICY.honeypot.label}
            </label>
            <input
              id="cg-honeypot"
              name={APPLICATION_SPAM_POLICY.honeypot.fieldName}
              type="text"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>
          {error && (
            <div
              data-cg-notice
              role="alert"
              className="bg-red-500/10 border border-red-500/30 rounded-ds-md p-3 text-sm text-red-400"
            >
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Company Name <span className="text-red-400">*</span></label>
            <input id="cg-companyName" data-cg-field="companyName" type="text" value={companyName} onChange={e => setCompanyName(e.target.value)}
              aria-invalid={issues.some(i => i.field === 'companyName')}
              aria-describedby={issues.some(i => i.field === 'companyName') ? 'cg-companyName-error' : undefined}
              className="w-full bg-zinc-900 border border-hairline rounded-ds-md px-3 py-2 text-sm text-strong placeholder-zinc-600 focus:outline-none focus:border-brass-500/40"
              placeholder="Your registered business name" />
            <FieldError field="companyName" issues={issues} />
          </div>
          <div className="relative">
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Country <span className="text-red-400">*</span></label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none" />
              <input id="cg-country" data-cg-field="country" type="text" value={countrySearch} onChange={e => { setCountrySearch(e.target.value); setShowCountryDropdown(true); if (selectedCountry && e.target.value !== selectedCountry.name) setSelectedCountry(null); }}
                onFocus={() => setShowCountryDropdown(true)} onBlur={() => setTimeout(() => setShowCountryDropdown(false), 200)}
                aria-invalid={issues.some(i => i.field === 'country')}
                aria-describedby={issues.some(i => i.field === 'country') ? 'cg-country-error' : undefined}
                className="w-full bg-zinc-900 border border-hairline rounded-ds-md pl-9 pr-3 py-2 text-sm text-strong placeholder-zinc-600 focus:outline-none focus:border-brass-500/40"
                placeholder="Type your country name..." />
            </div>
            {showCountryDropdown && filteredCountries.length > 0 && (
              <div className="absolute z-50 mt-1 w-full bg-zinc-900 border border-hairline rounded-ds-md shadow-ds-overlay max-h-48 overflow-y-auto">
                {filteredCountries.map((c) => (
                  <button key={c.name} type="button" onMouseDown={() => selectCountry(c)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-brass-500/10 transition-colors flex items-center justify-between ${selectedCountry?.name === c.name ? 'bg-brass-500/15 text-brass-400' : 'text-strong'}`}>
                    <span>{c.name}</span>
                    <span className="text-xs text-zinc-500 font-mono">{c.code}</span>
                  </button>
                ))}
              </div>
            )}
            {selectedCountry && (
              <p className="text-ds-micro text-emerald-400 mt-1">Selected: {selectedCountry.name} ({selectedCountry.code})</p>
            )}
            <FieldError field="country" issues={issues} />
          </div>
          {selectedCountry && (
            <div>
              {/* §PHONE — REPOINTED (Founder decision, 2026-09-26). The comment that
                  stood here recorded that the `*` had been REMOVED because the domain
                  did not enforce a phone (`BrandApplication.phone` was nullable) and
                  that making one COMPULSORY was a commercial decision for the Founder
                  rather than a defect fix. That decision has now been taken: the guard
                  refuses an empty answer as `missing_phone` and the stored record type
                  is non-nullable, so the `*` is BACK and the label matches the domain
                  exactly — it claims nothing the domain does not enforce. */}
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Phone Number <span className="text-red-400">*</span></label>
              <div className="flex gap-2">
                <div className="flex-shrink-0 bg-zinc-900 border border-hairline rounded-ds-md px-3 py-2 text-sm text-zinc-400 font-mono flex items-center">
                  {phoneCode || '—'}
                </div>
                <input id="cg-phone" data-cg-field="phone" type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)}
                  aria-invalid={issues.some(i => i.field === 'phone')}
                  aria-describedby={issues.some(i => i.field === 'phone') ? 'cg-phone-error' : undefined}
                  className="w-full bg-zinc-900 border border-hairline rounded-ds-md px-3 py-2 text-sm text-strong placeholder-zinc-600 focus:outline-none focus:border-brass-500/40"
                  placeholder="Your phone number after the country code" />
              </div>
              <p className="text-ds-micro text-zinc-600 mt-1">Your country code is auto-filled. Enter the rest of your number.</p>
              <FieldError field="phone" issues={issues} />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Product Category <span className="text-red-400">*</span></label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full bg-zinc-900 border border-hairline rounded-ds-md px-3 py-2 text-sm text-strong focus:outline-none focus:border-brass-500/40 appearance-none cursor-pointer">
              {PRODUCT_CATEGORIES.map(cat => <option key={cat} value={cat} className="bg-zinc-900">{cat}</option>)}
            </select>
          </div>
<div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Number of SKUs</label>
            <input id="cg-skuCount" data-cg-field="skuCount" type="number" value={skuCount} onChange={e => setSkuCount(e.target.value)}
              aria-invalid={issues.some(i => i.field === 'skuCount')}
              aria-describedby={issues.some(i => i.field === 'skuCount') ? 'cg-skuCount-error' : undefined}
              className="w-full bg-zinc-900 border border-hairline rounded-ds-md px-3 py-2 text-sm text-strong placeholder-zinc-600 focus:outline-none focus:border-brass-500/40"
              placeholder="Approximate number of products" />
            <FieldError field="skuCount" issues={issues} />

          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Current Monthly Revenue</label>
            <select value={monthlyRevenue} onChange={e => setMonthlyRevenue(e.target.value)}
              className="w-full bg-zinc-900 border border-hairline rounded-ds-md px-3 py-2 text-sm text-strong focus:outline-none focus:border-brass-500/40 appearance-none cursor-pointer">
              {MONTHLY_REVENUE_OPTIONS.map(opt => <option key={opt} value={opt} className="bg-zinc-900">{opt}</option>)}
            </select>
          </div>
          <div className="border-t border-hairline pt-5">
            <p className="text-xs text-zinc-500 mb-3">Provide at least one link so we can verify your brand:</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 flex items-center gap-1.5"><Globe className="w-3 h-3 text-zinc-500" /> Website URL</label>
                <input id="cg-websiteUrl" data-cg-field="websiteUrl" type="text" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)}
                  aria-invalid={issues.some(i => i.field === 'websiteUrl')}
                  aria-describedby={issues.some(i => i.field === 'websiteUrl') ? 'cg-websiteUrl-error' : undefined}
                  className="w-full bg-zinc-900 border border-hairline rounded-ds-md px-3 py-2 text-sm text-strong placeholder-zinc-600 focus:outline-none focus:border-brass-500/40"
                  placeholder="https://your-company.com" />
                <FieldError field="websiteUrl" issues={issues} />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 flex items-center gap-1.5"><Instagram className="w-3 h-3 text-zinc-500" /> Instagram URL</label>
                <input id="cg-instagramUrl" data-cg-field="instagramUrl" type="text" value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)}
                  aria-invalid={issues.some(i => i.field === 'instagramUrl')}
                  aria-describedby={issues.some(i => i.field === 'instagramUrl') ? 'cg-instagramUrl-error' : undefined}
                  className="w-full bg-zinc-900 border border-hairline rounded-ds-md px-3 py-2 text-sm text-strong placeholder-zinc-600 focus:outline-none focus:border-brass-500/40"
                  placeholder="https://instagram.com/your-brand" />
                <FieldError field="instagramUrl" issues={issues} />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 flex items-center gap-1.5"><Facebook className="w-3 h-3 text-zinc-500" /> Facebook URL</label>
                <input id="cg-facebookUrl" data-cg-field="facebookUrl" type="text" value={facebookUrl} onChange={e => setFacebookUrl(e.target.value)}
                  aria-invalid={issues.some(i => i.field === 'facebookUrl')}
                  aria-describedby={issues.some(i => i.field === 'facebookUrl') ? 'cg-facebookUrl-error' : undefined}
                  className="w-full bg-zinc-900 border border-hairline rounded-ds-md px-3 py-2 text-sm text-strong placeholder-zinc-600 focus:outline-none focus:border-brass-500/40"
                  placeholder="https://facebook.com/your-brand" />
                <FieldError field="facebookUrl" issues={issues} />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">How did you hear about us?</label>
            <input id="cg-referralSource" data-cg-field="referralSource" type="text" value={referralSource} onChange={e => setReferralSource(e.target.value)}
              aria-invalid={issues.some(i => i.field === 'referralSource')}
              aria-describedby={issues.some(i => i.field === 'referralSource') ? 'cg-referralSource-error' : undefined}
              className="w-full bg-zinc-900 border border-hairline rounded-ds-md px-3 py-2 text-sm text-strong placeholder-zinc-600 focus:outline-none focus:border-brass-500/40"
              placeholder="e.g. UK Trade Fair, LinkedIn, Google" />
            <FieldError field="referralSource" issues={issues} />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Tell us about your products and why you want UK market access</label>
            <textarea id="cg-description" data-cg-field="description" value={description} onChange={e => setDescription(e.target.value)}
              maxLength={PARTNER_APPLICATION_LIMITS.description.max} rows={4}
              aria-invalid={issues.some(i => i.field === 'description')}
              aria-describedby={issues.some(i => i.field === 'description') ? 'cg-description-error' : undefined}
              className="w-full bg-zinc-900 border border-hairline rounded-ds-md px-3 py-2 text-sm text-strong placeholder-zinc-600 focus:outline-none focus:border-brass-500/40 resize-none"
              placeholder="Describe your product line, target customers, and why you're looking to enter the UK market..." />
            <p className="text-ds-micro text-zinc-600 text-right mt-1">{description.length}/{PARTNER_APPLICATION_LIMITS.description.max}</p>
            <FieldError field="description" issues={issues} />
          </div>
          <button type="submit" disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-brass-500 hover:bg-brass-600 text-strong font-medium px-6 py-3 rounded-ds-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? <>...</> : <><Send className="w-4 h-4" /> Submit Application</>}
          </button>
        </form>
      </div>
    </div>
  );
}
export function ApplicationReceived({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-strong mb-3">Application Received</h1>
        <p className="text-sm text-zinc-400 leading-relaxed mb-8">Our team will review your brand and respond within 2 business days.</p>
        <button onClick={onBack} className="inline-flex items-center gap-2 text-sm text-brass-400 hover:text-brass-300 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
        </button>
      </div>
    </div>
  );
}
