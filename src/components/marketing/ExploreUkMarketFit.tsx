/**
 * §PHASE 1 — EXPLORE UK MARKET FIT (public pre-audit surface).
 *
 * The public, progressive assessment. It collects ONLY what cannot be researched
 * reliably, runs the deterministic research seam, and returns the UK Opportunity
 * Snapshot. It is a guided commercial assessment — not a purchase-order
 * predictor, not an acceptance guarantee, not a sales promise and not a single
 * "success score".
 *
 * DESIGN RULES OBEYED
 * ------------------
 * - It reuses the existing public marketing visual language (ink surfaces,
 *   parchment/steel text, the saturated palette tokens, PublicNav/PublicFooter).
 *   No new visual language, no redesign of any existing surface.
 * - It is PROGRESSIVE: four declared steps, and the result can send the visitor
 *   back to supply only the missing information.
 * - It LABELS simulation. When the research came from the deterministic seam the
 *   surface says so, in the result and in the badge — never presented as live
 *   research.
 * - It never renders a number that was not supplied or derived from a real one.
 * - It states what could not be established rather than hiding it.
 */
import { useCallback, useMemo, useState } from 'react';
import { ArrowRight, ArrowLeft, RefreshCw, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { PublicNav, type PublicPage } from './PublicNav';
import { PublicFooter } from './PublicFooter';
import { APPROVED_CATEGORIES } from '@/types';
import type { PreAuditAssessment, PreAuditInput } from '@/types';
import {
  EXPLORE_UK_MARKET_FIT_CTA,
  EXPLORE_UK_MARKET_FIT_SUMMARY,
  PRE_AUDIT_STEPS,
  PRE_AUDIT_TESTIDS,
  UK_PRESENCE_CLASSES,
  type PreAuditStepId,
} from '@/config/ukMarketFit';
import { assessUkMarketFit, validatePreAuditInput } from '@/lib/preaudit/ukMarketFitEngine';
import {
  preAuditResearchStatus,
  resolvePreAuditResearchProvider,
  type PreAuditResearchResult,
} from '@/lib/preaudit/researchProvider';
import {
  PRE_AUDIT_DEMO_PUBLIC_SESSION,
  attachAssessmentResult,
  requestMercentaReview,
  startAssessment,
} from '@/data/preAuditStore';
import { cn } from '@/utils/cn';

const COUNTRIES = [
  'United States', 'United Kingdom', 'Germany', 'France', 'Netherlands', 'Spain', 'Italy',
  'Poland', 'Sweden', 'Ireland', 'Canada', 'Australia', 'New Zealand', 'Japan', 'Singapore',
  'India', 'United Arab Emirates', 'Saudi Arabia', 'South Africa', 'Kenya', 'Ghana',
  'Nigeria', 'Egypt', 'Morocco', 'Tanzania', 'Namibia', 'Rwanda', 'Uganda', 'Ethiopia',
  'Tunisia', 'Mauritius', 'Zimbabwe', 'Brazil', 'Mexico', 'Turkey', 'South Korea',
];

const field =
  'w-full rounded-lg border border-white/[0.12] bg-ink-900 px-3 py-2 text-sm text-parchment placeholder:text-zinc-600 focus:border-palette-indigo focus:outline-none';
const labelCls = 'mb-1.5 block text-xs font-medium text-steel';
const hintCls = 'mt-1 text-ds-label text-zinc-500';

function StepRail({ current }: { current: PreAuditStepId }) {
  const index = PRE_AUDIT_STEPS.findIndex((s) => s.id === current);
  return (
    <ol className="mb-8 flex flex-wrap gap-2" data-testid="uk-market-fit-steps">
      {PRE_AUDIT_STEPS.map((s, i) => (
        <li
          key={s.id}
          className={cn(
            'rounded-full border px-3 py-1 font-mono text-ds-micro uppercase tracking-[0.2em]',
            i === index
              ? 'border-palette-indigo bg-palette-indigo/10 text-parchment'
              : i < index
                ? 'border-white/[0.12] text-zinc-400'
                : 'border-white/[0.06] text-zinc-600'
          )}
        >
          {i + 1}. {s.title}
        </li>
      ))}
    </ol>
  );
}

export function ExploreUkMarketFit({
  onNavigate,
  onOpenPortal,
}: {
  onNavigate: (p: PublicPage) => void;
  onOpenPortal: () => void;
}) {
  const [step, setStep] = useState<PreAuditStepId>('identity');
  const [input, setInput] = useState<Partial<PreAuditInput>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [research, setResearch] = useState<PreAuditResearchResult | null>(null);
  const [record, setRecord] = useState<PreAuditAssessment | null>(null);
  const [reviewRequested, setReviewRequested] = useState(false);
  const [contactEmail, setContactEmail] = useState('');

  const status = useMemo(() => preAuditResearchStatus(), []);
  const stepIndex = PRE_AUDIT_STEPS.findIndex((s) => s.id === step);

  const set = useCallback(<K extends keyof PreAuditInput>(key: K, value: PreAuditInput[K]) => {
    setInput((prev) => ({ ...prev, [key]: value }));
  }, []);

  /** Step 1 → 2. Required fields only. */
  const submitIdentity = useCallback(() => {
    const v = validatePreAuditInput(input);
    setErrors(v.errors);
    if (!v.valid) return;
    setStep('products');
  }, [input]);

  /**
   * Step 2 → 3 → 4. Research runs, then the assessment is recorded and shown.
   * Deterministic: the same input yields the same fixture and the same result.
   */
  const runAssessment = useCallback(async () => {
    setBusy(true);
    try {
      const complete: PreAuditInput = {
        brandName: input.brandName!.trim(),
        website: input.website!.trim(),
        country: input.country!.trim(),
        category: input.category!.trim(),
        productName: input.productName?.trim() || undefined,
        productIdentifiers: input.productIdentifiers,
        existingUkPresence: input.existingUkPresence,
        sourceMarketplacePresence: input.sourceMarketplacePresence,
        wholesaleCost: input.wholesaleCost,
        retailPrice: input.retailPrice,
        moq: input.moq,
        casePack: input.casePack,
        leadTimeDays: input.leadTimeDays,
        origin: input.origin,
        knownDocumentation: input.knownDocumentation,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
      };

      const provider = resolvePreAuditResearchProvider();
      const result = await provider.fetchBrandResearch({
        brandName: complete.brandName,
        website: complete.website,
        country: complete.country,
        category: complete.category,
        productName: complete.productName,
        productIdentifiers: complete.productIdentifiers,
        origin: complete.origin,
      });
      setResearch(result);

      const created = startAssessment(
        { kind: 'public_session', sessionId: PRE_AUDIT_DEMO_PUBLIC_SESSION },
        complete
      );
      const assessment = assessUkMarketFit(created.id, complete, result);
      const withResult = attachAssessmentResult(created.id, assessment);
      setRecord(withResult ?? created);
      setStep('result');
    } finally {
      setBusy(false);
    }
  }, [input]);

  /** Result → back to step 2, pre-filled, to supply ONLY the missing information. */
  const supplyMissing = useCallback(() => setStep('products'), []);

  const submitReview = useCallback(() => {
    if (!record) return;
    const updated = requestMercentaReview(record.id, {
      name: input.contactName,
      email: contactEmail || input.contactEmail,
    });
    if (updated) setRecord(updated);
    setReviewRequested(true);
  }, [contactEmail, input.contactName, input.contactEmail, record]);

  const restart = useCallback(() => {
    setInput({});
    setErrors({});
    setResearch(null);
    setRecord(null);
    setReviewRequested(false);
    setContactEmail('');
    setStep('identity');
  }, []);

  const snapshot = record?.snapshot ?? null;

  return (
    <div className="min-h-screen bg-ink text-parchment font-plex">
      <PublicNav
        currentPage="explore-uk-market-fit"
        onNavigate={onNavigate}
        onOpenPortal={onOpenPortal}
      />
      <main className="pt-24 pb-16 px-6" data-testid={PRE_AUDIT_TESTIDS.surface}>
        <div className="max-w-4xl mx-auto">
          <section className="text-center mb-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.14] bg-white/[0.04] px-3 py-1 font-mono text-ds-label uppercase tracking-[0.25em] text-[var(--mr-accent-700)]">
              <Info className="w-3 h-3" aria-hidden="true" />
              {status.simulationSafe ? 'Simulated research' : 'Live research'}
            </span>
            <h1 className="font-display text-3xl md:text-4xl font-semibold mt-5">
              {EXPLORE_UK_MARKET_FIT_CTA}
            </h1>
            <p className="text-sm text-steel max-w-2xl mx-auto mt-4 leading-relaxed">
              {EXPLORE_UK_MARKET_FIT_SUMMARY}
            </p>
            <p
              className="mt-3 text-ds-label text-zinc-500"
              data-testid={PRE_AUDIT_TESTIDS.researchSource}
            >
              Research source: {status.label} — {status.reason}
            </p>
          </section>

          <StepRail current={step} />

          {step === 'identity' && (
            <section
              className="bg-ink-900 border border-white/[0.06] rounded-xl p-6 md:p-8"
              data-testid={PRE_AUDIT_TESTIDS.step('identity')}
            >
              <h2 className="font-display text-xl font-semibold mb-1">Your brand</h2>
              <p className="text-xs text-steel mb-6">{PRE_AUDIT_STEPS[0].rationale}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls} htmlFor="ukmf-brand">Brand name</label>
                  <input
                    id="ukmf-brand"
                    className={field}
                    value={input.brandName ?? ''}
                    onChange={(e) => set('brandName', e.target.value)}
                    placeholder="Your brand"
                    data-testid="ukmf-brand-name"
                  />
                  {errors.brandName && <p className="mt-1 text-ds-label text-palette-red">{errors.brandName}</p>}
                </div>
                <div>
                  <label className={labelCls} htmlFor="ukmf-website">Website</label>
                  <input
                    id="ukmf-website"
                    className={field}
                    value={input.website ?? ''}
                    onChange={(e) => set('website', e.target.value)}
                    placeholder="https://example.com"
                    data-testid="ukmf-website"
                  />
                  {errors.website && <p className="mt-1 text-ds-label text-palette-red">{errors.website}</p>}
                  <p className={hintCls}>The website is the primary research anchor.</p>
                </div>
                <div>
                  <label className={labelCls} htmlFor="ukmf-country">Country you trade from</label>
                  <select
                    id="ukmf-country"
                    className={field}
                    value={input.country ?? ''}
                    onChange={(e) => set('country', e.target.value)}
                    data-testid="ukmf-country"
                  >
                    <option value="">Select a country</option>
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {errors.country && <p className="mt-1 text-ds-label text-palette-red">{errors.country}</p>}
                </div>
                <div>
                  <label className={labelCls} htmlFor="ukmf-category">Product category</label>
                  <select
                    id="ukmf-category"
                    className={field}
                    value={input.category ?? ''}
                    onChange={(e) => set('category', e.target.value)}
                    data-testid="ukmf-category"
                  >
                    <option value="">Select a category</option>
                    {APPROVED_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="Other">Other / not listed</option>
                  </select>
                  {errors.category && <p className="mt-1 text-ds-label text-palette-red">{errors.category}</p>}
                  <p className={hintCls}>
                    Mercenta evaluates a defined set of categories for this route. Choosing another
                    category still runs the assessment and says so honestly.
                  </p>
                </div>
              </div>
              <div className="mt-8 flex items-center gap-3">
                <button
                  type="button"
                  onClick={submitIdentity}
                  className="inline-flex items-center gap-2 rounded-lg bg-palette-indigo px-6 py-3 font-semibold text-on-palette transition-colors hover:opacity-90"
                  data-testid={PRE_AUDIT_TESTIDS.next}
                >
                  Continue
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('home')}
                  className="text-xs text-zinc-400 hover:text-brass-400 transition-colors"
                >
                  Back to the homepage
                </button>
              </div>
            </section>
          )}


          {step === 'products' && (
            <section
              className="bg-ink-900 border border-white/[0.06] rounded-xl p-6 md:p-8"
              data-testid={PRE_AUDIT_TESTIDS.step('products')}
            >
              <h2 className="font-display text-xl font-semibold mb-1">Your products</h2>
              <p className="text-xs text-steel mb-6">{PRE_AUDIT_STEPS[1].rationale}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls} htmlFor="ukmf-product">Product name</label>
                  <input
                    id="ukmf-product"
                    className={field}
                    value={input.productName ?? ''}
                    onChange={(e) => set('productName', e.target.value)}
                    placeholder="Optional"
                    data-testid="ukmf-product-name"
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="ukmf-identifiers">Product identifiers</label>
                  <input
                    id="ukmf-identifiers"
                    className={field}
                    value={(input.productIdentifiers ?? []).join(', ')}
                    onChange={(e) =>
                      set(
                        'productIdentifiers',
                        e.target.value
                          .split(',')
                          .map((v) => v.trim())
                          .filter(Boolean)
                      )
                    }
                    placeholder="ASIN, EAN, UPC or GTIN — optional"
                    data-testid="ukmf-identifiers"
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="ukmf-origin">Origin / ship-from country</label>
                  <input
                    id="ukmf-origin"
                    className={field}
                    value={input.origin ?? ''}
                    onChange={(e) => set('origin', e.target.value)}
                    placeholder="Optional"
                    data-testid="ukmf-origin"
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="ukmf-lead">Production lead time (days)</label>
                  <input
                    id="ukmf-lead"
                    type="number"
                    min={0}
                    className={field}
                    value={input.leadTimeDays ?? ''}
                    onChange={(e) => set('leadTimeDays', e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="Optional"
                    data-testid="ukmf-lead-time"
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="ukmf-moq">Minimum order quantity</label>
                  <input
                    id="ukmf-moq"
                    type="number"
                    min={0}
                    className={field}
                    value={input.moq ?? ''}
                    onChange={(e) => set('moq', e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="Optional"
                    data-testid="ukmf-moq"
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="ukmf-case">Case pack quantity</label>
                  <input
                    id="ukmf-case"
                    type="number"
                    min={0}
                    className={field}
                    value={input.casePack ?? ''}
                    onChange={(e) => set('casePack', e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="Optional"
                    data-testid="ukmf-case-pack"
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="ukmf-cost">Your wholesale / cost price (£)</label>
                  <input
                    id="ukmf-cost"
                    type="number"
                    min={0}
                    step="0.01"
                    className={field}
                    value={input.wholesaleCost ?? ''}
                    onChange={(e) => set('wholesaleCost', e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="Optional"
                    data-testid="ukmf-wholesale-cost"
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="ukmf-price">Intended retail price (£)</label>
                  <input
                    id="ukmf-price"
                    type="number"
                    min={0}
                    step="0.01"
                    className={field}
                    value={input.retailPrice ?? ''}
                    onChange={(e) => set('retailPrice', e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="Optional"
                    data-testid="ukmf-retail-price"
                  />
                  <p className={hintCls}>
                    A spread is only calculated when BOTH figures are supplied. No figure is invented.
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className={labelCls} htmlFor="ukmf-docs">
                    Documentation you already hold (comma separated)
                  </label>
                  <input
                    id="ukmf-docs"
                    className={field}
                    value={(input.knownDocumentation ?? []).join(', ')}
                    onChange={(e) =>
                      set(
                        'knownDocumentation',
                        e.target.value
                          .split(',')
                          .map((v) => v.trim())
                          .filter(Boolean)
                      )
                    }
                    placeholder="Optional — e.g. test reports, declarations of conformity"
                    data-testid="ukmf-docs"
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="ukmf-contact-name">Contact name</label>
                  <input
                    id="ukmf-contact-name"
                    className={field}
                    value={input.contactName ?? ''}
                    onChange={(e) => set('contactName', e.target.value)}
                    placeholder="Only needed if you want a review"
                    data-testid="ukmf-contact-name"
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="ukmf-contact-email">Contact email</label>
                  <input
                    id="ukmf-contact-email"
                    type="email"
                    className={field}
                    value={input.contactEmail ?? ''}
                    onChange={(e) => set('contactEmail', e.target.value)}
                    placeholder="Only needed if you want a review"
                    data-testid="ukmf-contact-email"
                  />
                </div>
              </div>
              <div className="mt-8 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep('identity')}
                  className="inline-flex items-center gap-2 border border-white/[0.2] hover:border-brass/60 text-white px-5 py-3 rounded-lg transition-colors text-sm"
                  data-testid={PRE_AUDIT_TESTIDS.back}
                >
                  <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => void runAssessment()}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-lg bg-palette-indigo px-6 py-3 font-semibold text-on-palette transition-colors hover:opacity-90 disabled:opacity-50"
                  data-testid={PRE_AUDIT_TESTIDS.submit}
                >
                  {busy ? (
                    <span
                      className="inline-flex items-center gap-2"
                      data-testid={PRE_AUDIT_TESTIDS.step('research')}
                    >
                      <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
                      Running the assessment…
                    </span>
                  ) : (
                    <>
                      Run my UK Market Fit assessment
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </>
                  )}
                </button>
              </div>
            </section>
          )}


          {step === 'result' && snapshot && (
            <section data-testid={PRE_AUDIT_TESTIDS.step('result')}>
              <div
                className="bg-ink-900 border border-white/[0.06] rounded-xl p-6 md:p-8"
                data-testid={PRE_AUDIT_TESTIDS.result}
              >
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span
                    className="rounded-full border border-white/[0.14] bg-white/[0.04] px-3 py-1 font-mono text-ds-micro uppercase tracking-[0.2em]"
                    data-testid={PRE_AUDIT_TESTIDS.qualification}
                  >
                    {snapshot.qualificationLabel}
                  </span>
                  <span className="rounded-full border border-white/[0.14] px-3 py-1 font-mono text-ds-micro uppercase tracking-[0.2em] text-steel">
                    UK presence {snapshot.presenceLabel}
                  </span>
                  {snapshot.simulationLabel && (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full border border-stamp/60 px-3 py-1 font-mono text-ds-micro uppercase tracking-[0.2em] text-stamp"
                      data-testid={PRE_AUDIT_TESTIDS.simulationBadge}
                    >
                      <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                      Simulated research
                    </span>
                  )}
                </div>
                <h2 className="font-display text-2xl font-semibold mb-2">{snapshot.headline}</h2>
                {snapshot.simulationLabel && (
                  <p className="text-ds-label text-zinc-500 mb-4">{snapshot.simulationLabel}</p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  {snapshot.indicators.map((ind) => (
                    <div
                      key={ind.id}
                      className="rounded-xl border-t-[3px] border border-white/[0.06] bg-ink-850 p-5"
                      style={{
                        borderTopColor:
                          ind.state === 'favourable'
                            ? 'var(--mr-palette-green)'
                            : ind.state === 'workable'
                              ? 'var(--mr-palette-cyan)'
                              : ind.state === 'constrained'
                                ? 'var(--mr-palette-red)'
                                : 'var(--mr-palette-orange)',
                      }}
                      data-testid={PRE_AUDIT_TESTIDS.indicator(ind.id)}
                    >
                      <p className="font-mono text-ds-micro uppercase tracking-[0.2em] text-zinc-500">
                        {ind.label}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-parchment">
                        {ind.state === 'favourable'
                          ? 'Favourable'
                          : ind.state === 'workable'
                            ? 'Workable'
                            : ind.state === 'constrained'
                              ? 'Constrained'
                              : 'Not established'}
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-steel">{ind.rationale}</p>
                      <p className="mt-3 text-ds-micro text-zinc-600">
                        basis: {ind.basis} · confidence: {ind.confidence}
                        {ind.regulatory ? ' · regulatory, not commercial' : ''}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-ds-label text-zinc-500">
                  These three indicators are deliberately separate. Catalogue eligibility is about
                  requirements, commercial opportunity is about the commercial case, and supply
                  viability is about supply reliability — none of them is a success score.
                </p>
              </div>


              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {snapshot.sections.map((s) => (
                  <div
                    key={s.id}
                    className="bg-ink-900 border border-white/[0.06] rounded-xl p-6"
                    data-testid={PRE_AUDIT_TESTIDS.snapshotSection(s.id)}
                  >
                    <h3 className="font-display text-base font-semibold mb-3">{s.title}</h3>
                    <ul className="space-y-2">
                      {s.statements.map((t, i) => (
                        <li key={i} className="flex gap-2 text-xs leading-relaxed text-steel">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-brass" aria-hidden="true" />
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                    {s.unknowns.length > 0 && (
                      <p className="mt-3 text-ds-micro text-zinc-600">
                        Unknowns: {s.unknowns.length} — listed under Open Questions.
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {snapshot.openQuestions.length > 0 && (
                <div
                  className="mt-6 bg-ink-900 border border-white/[0.06] rounded-xl p-6"
                  data-testid={PRE_AUDIT_TESTIDS.openQuestions}
                >
                  <h3 className="font-display text-base font-semibold mb-3">What is still open</h3>
                  <ul className="space-y-2">
                    {snapshot.openQuestions.map((q, i) => (
                      <li key={i} className="flex gap-2 text-xs leading-relaxed text-steel">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[var(--mr-palette-orange)]" aria-hidden="true" />
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={supplyMissing}
                    className="mt-4 text-xs text-brass-400 hover:text-brass transition-colors"
                  >
                    Supply the missing information and re-run
                  </button>
                </div>
              )}

              {snapshot.educationalGaps.length > 0 && (
                <div
                  className="mt-6 bg-ink-900 border border-white/[0.06] rounded-xl p-6"
                  data-testid={PRE_AUDIT_TESTIDS.gap}
                >
                  <h3 className="font-display text-base font-semibold mb-2">
                    Things you may not need to know yet
                  </h3>
                  <p className="text-xs text-steel mb-4">
                    Mercenta records these so that onboarding can teach them in context rather than
                    assuming them. Nothing here is required to finish this assessment.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {snapshot.educationalGaps.map((g) => (
                      <span
                        key={g.id}
                        className="rounded-full border border-white/[0.1] px-3 py-1 text-ds-micro text-zinc-400"
                      >
                        {g.label} · stage {g.academyStage}
                      </span>
                    ))}
                  </div>
                </div>
              )}


              <div className="mt-6 bg-ink-900 border border-white/[0.06] rounded-xl p-6">
                <h3 className="font-display text-base font-semibold mb-2">Recommended next step</h3>
                <p className="text-xs leading-relaxed text-steel">
                  {snapshot.recommendedNextStep.replace(/^Recommended next step:\s*/, '')}
                </p>

                {reviewRequested ? (
                  <p className="mt-4 inline-flex items-center gap-2 text-xs text-[var(--mr-palette-green)]">
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    Review requested. Mercenta can now see this assessment. Your brand is still a
                    prospect — a Mercenta partnership starts only after a separate, gated onboarding.
                  </p>
                ) : (
                  <div className="mt-4 flex flex-col sm:flex-row sm:items-end gap-3">
                    <div className="flex-1">
                      <label className={labelCls} htmlFor="ukmf-review-email">
                        Email for the review (only used to reply)
                      </label>
                      <input
                        id="ukmf-review-email"
                        type="email"
                        className={field}
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="you@example.com"
                        data-testid="ukmf-review-email"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={submitReview}
                      className="inline-flex items-center gap-2 rounded-lg border border-white/[0.2] hover:border-brass/60 px-5 py-2.5 text-sm text-white transition-colors"
                      data-testid={PRE_AUDIT_TESTIDS.requestReview}
                    >
                      Ask Mercenta to review this
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-6 bg-ink-900 border border-white/[0.06] rounded-xl p-6">
                <p className="text-ds-label leading-relaxed text-zinc-500">{snapshot.disclaimer}</p>
                {snapshot.couldNotEstablish.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {snapshot.couldNotEstablish.map((c, i) => (
                      <li key={i} className="text-ds-label text-zinc-600">{c}</li>
                    ))}
                  </ul>
                )}
                {research && (
                  <p className="mt-3 text-ds-micro text-zinc-600">
                    Research: {research.providerId} · mode {research.mode} · network calls{' '}
                    {research.networkCalls}
                  </p>
                )}
                <button
                  type="button"
                  onClick={restart}
                  className="mt-4 text-xs text-zinc-400 hover:text-brass-400 transition-colors"
                  data-testid={PRE_AUDIT_TESTIDS.restart}
                >
                  Run another assessment
                </button>
              </div>
            </section>
          )}

          {step === 'result' && !snapshot && (
            <section className="bg-ink-900 border border-white/[0.06] rounded-xl p-6">
              <p className="text-sm text-steel">
                No result is available for this assessment. Nothing has been claimed.
              </p>
              <button
                type="button"
                onClick={restart}
                className="mt-4 text-xs text-brass-400 hover:text-brass"
              >
                Start again
              </button>
            </section>
          )}

          <p className="mt-10 text-center font-mono text-ds-micro uppercase tracking-[0.2em] text-zinc-600">
            {UK_PRESENCE_CLASSES.length} declared UK presence classes · every indicator shows its
            basis, evidence, observed values, thresholds, confidence and unknowns
          </p>
        </div>
      </main>
      <PublicFooter onNavigate={onNavigate} onOpenPortal={onOpenPortal} />
    </div>
  );
}

