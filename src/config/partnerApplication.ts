/**
 * §CG — THE PARTNER-APPLICATION CONVERSION GATE (ONE declaration).
 *
 * The `phase15-conversion` roadmap row records this gate's scope as *"form
 * validation, spam protection, submission reliability"* and its remainder as
 * *"spam protection and submission reliability remain"*. This file is the SINGLE
 * SOURCE OF TRUTH for every number and every honest message that gate uses, so no
 * component and no test hardcodes a threshold of its own
 * (`.clinerules/03-single-source-of-truth.md`).
 *
 * WHAT THIS GATE IS — AND IS NOT
 * ------------------------------
 * The public application form has no account and no credential in front of it, so
 * the only signals available are the ones the browser can supply WITHOUT a
 * third-party service: whether a field no human can see was filled, how long the
 * form was on screen before submission, how many times this SESSION has already
 * tried, and whether the same application was already submitted moments ago.
 * That is what is declared here.
 *
 * It is deliberately NOT a CAPTCHA and NOT a reputation service: neither is
 * available without an external provider, and inventing a score would be a lie.
 * Every decision this gate makes is deterministic and reproducible — a rejection
 * can always be explained by naming the signal that caused it.
 *
 * FAIL CLOSED: an unknown, missing or uncomputable signal is a REJECTION, never a
 * silent acceptance (`src/lib/onboarding/applicationGuard.ts`).
 *
 * SUBMISSION RELIABILITY IS A SEPARATE, EXPLICIT PROMISE
 * -----------------------------------------------------
 * `verificationNeverBlocksSubmission` records the rule that link verification —
 * which is a REAL fetch of the applicant's own website/social page and can take up
 * to 10s per link, or never return in a browser that CORS-blocks it — must NEVER
 * hold the applicant's submission open. The application is recorded first; the
 * verification result is attached when it resolves.
 */

/** Every rejection reason this gate can return (one vocabulary, no free text). */
export type ApplicationSubmissionCode =
  | 'accepted'
  | 'missing_company'
  | 'invalid_company'
  | 'missing_country'
  | 'unknown_country'
  | 'no_link'
  | 'invalid_website_url'
  | 'invalid_instagram_url'
  | 'invalid_facebook_url'
  | 'invalid_phone'
  | 'invalid_sku_count'
  | 'field_too_long'
  | 'payload_too_large'
  | 'honeypot_filled'
  | 'too_fast'
  | 'duplicate_submission'
  | 'attempt_limit'
  | 'verification_unavailable';

/**
 * The ONE honest sentence shown for each outcome. A rejection is never silent and
 * never vague: it names the signal, states that nothing was recorded, and tells a
 * genuine applicant what to do next. `{min}` / `{max}` are filled from the limits
 * declared below by `applicationMessage()` — never re-typed by a component.
 */
export const APPLICATION_SUBMISSION_MESSAGES: Record<ApplicationSubmissionCode, string> = {
  accepted: '',
  missing_company: 'Company name is required.',
  invalid_company: 'Company name must be between {min} and {max} characters.',
  missing_country: 'Please select your country.',
  unknown_country: 'Please choose your country from the list provided.',
  no_link: 'Please provide at least one link so we can verify your brand.',
  invalid_website_url: 'Please enter a valid website address, for example https://your-company.com.',
  invalid_instagram_url: 'Please enter a valid Instagram profile URL, for example https://instagram.com/your-brand.',
  invalid_facebook_url: 'Please enter a valid Facebook page URL, for example https://facebook.com/your-brand.',
  invalid_phone: 'Please enter a phone number of {min}–{max} digits.',
  invalid_sku_count: 'Please enter the number of products as a whole number.',
  field_too_long: 'Please keep this answer under {max} characters.',
  payload_too_large: 'This application is too large to submit. Please shorten your answers and try again.',
  honeypot_filled:
    'This submission was flagged as automated and was NOT recorded. If you are a real applicant, please re-open the form and submit again without filling the optional fax field.',
  too_fast:
    'This form was submitted faster than a person can read it, so it was NOT recorded. Please review your answers and submit again.',
  duplicate_submission:
    'This application was already received and was NOT recorded twice. Our team will respond within 2 business days.',
  attempt_limit:
    'Too many submission attempts from this browser. Nothing further was recorded — please wait and try again, or contact us directly.',
  verification_unavailable:
    'We could not verify that this submission came from a person, so nothing was recorded. Please reload the page and try again.',
};

/** Field-level limits. Enforced in the guard, rendered by the form, asserted by the gate. */
export const PARTNER_APPLICATION_LIMITS = {
  companyName: { min: 2, max: 120 },
  country: { max: 80 },
  phone: { minDigits: 6, maxDigits: 15 },
  skuCount: { min: 1, max: 1_000_000 },
  referralSource: { max: 80 },
  description: { max: 200 },
  url: { max: 400 },
  /** Total characters accepted across all free-text fields in one submission. */
  totalPayload: { max: 1_200 },
} as const;

/**
 * The spam policy. Every threshold is declared here with its reason — a number a
 * reader cannot explain is a number that should not exist.
 */
export const APPLICATION_SPAM_POLICY = {
  /**
   * A field no human can see, no human can tab to and no screen reader announces.
   * A person leaves it empty; a form-filling bot completes it and is rejected.
   * The visible label is deliberately plausible (the field is reachable in the
   * DOM, so it must not look like a trap to an assistive technology).
   */
  honeypot: {
    fieldName: 'company_fax',
    label: 'Fax (optional)',
    /** Off-screen, not display:none — some bots skip display:none inputs. */
    cssClassName: 'mr-honeypot-field',
  },
  /**
   * A person cannot read and complete this form in under ~2.5 seconds; a script
   * can. Below this, the submission is refused and NOT recorded.
   */
  minFillMs: 2_500,
  /**
   * A SESSION may make at most 3 attempts in 10 minutes. REJECTED attempts are
   * counted (including honeypot/too-fast refusals) — otherwise a bot could retry
   * the same refused submit forever at no cost.
   */
  window: { maxAttempts: 3, windowMs: 10 * 60_000 },
  /**
   * The same application (same company + country + links) resubmitted within one
   * minute is a double-submit, not a second brand.
   */
  duplicate: { windowMs: 60_000 },
} as const;

/**
 * What the gate promises about link verification. Declared as data so the promise
 * is testable rather than a comment: verification is a REAL check and it must
 * never be able to hold a submission open.
 */
export const APPLICATION_VERIFICATION_PROMISE = {
  /** The check is a real fetch of the applicant's own links, not a simulated result. */
  verificationIsLive: true,
  /**
   * Submission is recorded BEFORE the check runs; the result is attached when it
   * resolves. The applicant is never blocked on a third-party response.
   */
  verificationNeverBlocksSubmission: true,
  /** The per-link ceiling the verifier itself declares (`linkVerifier.ts`). */
  perLinkTimeoutMs: 10_000,
} as const;

/** The three optional brand links, in the order the form presents them. */
export const APPLICATION_LINK_KINDS = ['website', 'instagram', 'facebook'] as const;
export type ApplicationLinkKind = (typeof APPLICATION_LINK_KINDS)[number];

/** The refusal codes caused by the applicant's own answers (they can fix these). */
export const APPLICANT_FIXABLE_CODES: readonly ApplicationSubmissionCode[] = [
  'missing_company',
  'invalid_company',
  'missing_country',
  'unknown_country',
  'no_link',
  'invalid_website_url',
  'invalid_instagram_url',
  'invalid_facebook_url',
  'invalid_phone',
  'invalid_sku_count',
  'field_too_long',
  'payload_too_large',
];

/** The codes that mean "nothing was recorded" rather than "fix this field". */
export const NOT_RECORDED_CODES: readonly ApplicationSubmissionCode[] = [
  'honeypot_filled',
  'too_fast',
  'attempt_limit',
  'verification_unavailable',
];

/** Interpolate a declared message template (`{min}` / `{max}`) without inventing prose. */
export function applicationMessage(
  code: ApplicationSubmissionCode,
  vars: { min?: number | string; max?: number | string } = {}
): string {
  return APPLICATION_SUBMISSION_MESSAGES[code]
    .replace('{min}', String(vars.min ?? ''))
    .replace('{max}', String(vars.max ?? ''));
}

/**
 * The countries the application form offers, with their dialling codes.
 *
 * ONE declaration, TWO consumers: the search-then-select control renders this list
 * and the guard validates against it — so the UI can never offer a country the
 * domain would refuse as `unknown_country`, and no test has to maintain a copy.
 * (Previously this list lived inside `PartnerApplicationForm.tsx`, which is why a
 * country outside it could be typed in and accepted.)
 */
export const PARTNER_APPLICATION_COUNTRIES = [
  { name: 'United States', code: '+1' },
  { name: 'Canada', code: '+1' },
  { name: 'United Kingdom', code: '+44' },
  { name: 'Germany', code: '+49' },
  { name: 'France', code: '+33' },
  { name: 'Italy', code: '+39' },
  { name: 'Netherlands', code: '+31' },
  { name: 'Spain', code: '+34' },
  { name: 'Denmark', code: '+45' },
  { name: 'Sweden', code: '+46' },
  { name: 'Norway', code: '+47' },
  { name: 'Poland', code: '+48' },
  { name: 'Zimbabwe', code: '+263' },
  { name: 'South Africa', code: '+27' },
  { name: 'Kenya', code: '+254' },
  { name: 'Nigeria', code: '+234' },
  { name: 'Ghana', code: '+233' },
  { name: 'Ethiopia', code: '+251' },
  { name: 'Tanzania', code: '+255' },
  { name: 'Rwanda', code: '+250' },
  { name: 'Morocco', code: '+212' },
  { name: 'Botswana', code: '+267' },
  { name: 'Mauritius', code: '+230' },
  { name: 'Egypt', code: '+20' },
  { name: 'Australia', code: '+61' },
  { name: 'New Zealand', code: '+64' },
  { name: 'Japan', code: '+81' },
  { name: 'South Korea', code: '+82' },
  { name: 'China', code: '+86' },
  { name: 'India', code: '+91' },
  { name: 'Brazil', code: '+55' },
  { name: 'Mexico', code: '+52' },
  { name: 'UAE', code: '+971' },
  { name: 'Turkey', code: '+90' },
  { name: 'Israel', code: '+972' },
] as const;

export type PartnerApplicationCountry = (typeof PARTNER_APPLICATION_COUNTRIES)[number];

const DECLARED_COUNTRY_NAMES: ReadonlySet<string> = new Set(
  PARTNER_APPLICATION_COUNTRIES.map((c) => c.name)
);

/** True ONLY for a country this form actually offers (fail closed on anything else). */
export function isDeclaredCountry(name: unknown): name is string {
  return typeof name === 'string' && DECLARED_COUNTRY_NAMES.has(name);
}

/** The dialling code for a declared country, or `null`. */
export function diallingCodeFor(name: string): string | null {
  return PARTNER_APPLICATION_COUNTRIES.find((c) => c.name === name)?.code ?? null;
}

