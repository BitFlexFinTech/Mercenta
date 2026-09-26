/**
 * §CG — THE CONVERSION GATE'S DECISION, IN ONE PURE MODULE (FAIL CLOSED).
 *
 * THE RECORDED SCOPE THIS MODULE CLOSES
 * -------------------------------------
 * `requirements-registry.json → phase15-conversion` records the conversion launch
 * gate as *"form validation, spam protection, submission reliability"* with the
 * remainder *"spam protection and submission reliability remain"*. The three gaps
 * were real (verified 2026-09-26 against the code, before any implementation):
 *
 *   1. validation was three checks only — no URL format check, and `skuCount` was
 *      `parseInt(...)`, so a non-numeric answer became `NaN`;
 *   2. there was NO spam protection anywhere in the public path (grep for
 *      honeypot / rate-limit / spam found nothing);
 *   3. submission reliability was absent: the submit handler had no `try/catch`,
 *      so a rejection from link verification left the button on "..." forever with
 *      no message, and a double submit could record two applications.
 *
 * WHAT THIS MODULE OWNS
 * ---------------------
 * ONE deterministic decision for one submission attempt:
 *
 *     validate the answers → evaluate the spam signals → accept, or reject with
 *     the declared code and the declared honest sentence
 *
 * RULES IT OBEYS (the project's own rules, not preferences):
 *   · PURE — no clock read, no store write, no network. `now` and the session's
 *     attempt ledger are PASSED IN, exactly like the PO-ACK window owner's
 *     `now: Date | string | number` seam (`src/lib/commerce/poAcknowledgementWindow.ts`).
 *   · FAIL CLOSED — a missing, non-string, non-finite or unparseable signal is a
 *     REJECTION (`verification_unavailable`), never a silent acceptance.
 *   · ONE SOURCE OF TRUTH — every threshold, field limit and message comes from
 *     `src/config/partnerApplication.ts`. Nothing is re-derived here.
 *   · HONEST — the applicant is told which signal refused them and that nothing
 *     was recorded; the applicant-facing text is never invented in a component.
 */
import {
  APPLICATION_SPAM_POLICY,
  PARTNER_APPLICATION_LIMITS,
  applicationMessage,
  isDeclaredCountry,
  type ApplicationLinkKind,
  type ApplicationSubmissionCode,
} from '@/config/partnerApplication';

/** The raw strings exactly as the form holds them (nothing pre-validated). */
export interface RawApplicationInput {
  companyName: string;
  country: string | null;
  phone: string;
  skuCount: string;
  websiteUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  referralSource: string;
  description: string;
}

/** The accepted, canonical payload handed to `submitApplication`. */
export interface NormalisedApplication {
  companyName: string;
  country: string;
  phone: string | null;
  skuCount: number | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  referralSource: string | null;
  description: string | null;
}

/** Which control an issue belongs to (so the form can focus the first one). */
export type ApplicationFieldName =
  | 'companyName'
  | 'country'
  | 'phone'
  | 'skuCount'
  | 'websiteUrl'
  | 'instagramUrl'
  | 'facebookUrl'
  | 'referralSource'
  | 'description'
  | 'form';

export interface FieldIssue {
  field: ApplicationFieldName;
  code: ApplicationSubmissionCode;
  message: string;
}

/** One attempt this session — REJECTED attempts are recorded too. */
export interface AttemptRecord {
  at: number;
  fingerprint: string;
  /**
   * Whether this attempt was actually RECORDED as an application.
   *
   * This distinction is the difference between a truthful and a false message. A
   * `too_fast` refusal was never received, so telling an applicant who retries with
   * the same answers that it "was already received" would be a lie. The RATE limit
   * counts every attempt (a free retry is not a rate limit); the DUPLICATE rule
   * counts only attempts that really produced a record.
   */
  recorded: boolean;
}

/** The signal that decided a decision (evidence; never shown to an applicant). */
export type DecisionSignal =
  | 'none'
  | 'validation'
  | 'size'
  | 'honeypot'
  | 'timing'
  | 'rate'
  | 'duplicate'
  | 'unavailable';

export interface SubmissionDecision {
  outcome: 'accept' | 'reject';
  code: ApplicationSubmissionCode;
  /** The declared applicant-facing sentence (empty only on `accepted`). */
  message: string;
  field?: ApplicationFieldName;
  issues: FieldIssue[];
  normalised?: NormalisedApplication;
  retryAfterMs?: number;
  signal: DecisionSignal;
}

/** True only for a plain object — anything else fails closed. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The hosts each social kind may legitimately point at. */
const SOCIAL_HOSTS: Record<Exclude<ApplicationLinkKind, 'website'>, readonly string[]> = {
  instagram: ['instagram.com'],
  facebook: ['facebook.com', 'fb.com'],
};

/** The declared link fields, paired with their refusal codes. */
const LINK_FIELDS: ReadonlyArray<{
  key: 'websiteUrl' | 'instagramUrl' | 'facebookUrl';
  kind: ApplicationLinkKind;
  code: ApplicationSubmissionCode;
}> = [
  { key: 'websiteUrl', kind: 'website', code: 'invalid_website_url' },
  { key: 'instagramUrl', kind: 'instagram', code: 'invalid_instagram_url' },
  { key: 'facebookUrl', kind: 'facebook', code: 'invalid_facebook_url' },
];

/** A string value or '' — never throws, never coerces a non-string into text. */
function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function issue(
  field: ApplicationFieldName,
  code: ApplicationSubmissionCode,
  vars: { min?: number; max?: number } = {}
): FieldIssue {
  return { field, code, message: applicationMessage(code, vars) };
}

/**
 * Parse a submitted link into a canonical https URL, or return `null`.
 * Rejects any non-http(s) scheme (`javascript:`, `data:`, `mailto:`), a host with
 * no dot, an over-long value, or a social link that does not point at that network
 * — a Yahoo address typed into the Instagram field is an answer error, not a
 * verification result to discover later.
 */
export function normaliseUrl(raw: unknown, kind: ApplicationLinkKind): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > PARTNER_APPLICATION_LIMITS.url.max) return null;
  if (!/^https?:\/\//i.test(trimmed) && /^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return null;
  let parsed: URL;
  try {
    parsed = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  if (!host.includes('.') || !/^[a-z0-9.-]+$/.test(host)) return null;
  if (kind === 'website') {
    const path = parsed.pathname.replace(/\/+$/, '');
    return `https://${host}${path}`;
  }
  if (!SOCIAL_HOSTS[kind].includes(host)) return null;
  const handle = parsed.pathname.replace(/^\/+|\/+$/g, '');
  if (!handle || !/^[A-Za-z0-9._-]+$/.test(handle)) return null;
  return `https://${SOCIAL_HOSTS[kind][0]}/${handle}`;
}

/**
 * A stable identity for "the same application". Derived from the answers that
 * identify a brand — never from the timestamp — so two submissions of the same
 * brand inside the duplicate window produce the SAME key.
 */
export function applicationFingerprint(
  input: Pick<
    NormalisedApplication,
    'companyName' | 'country' | 'websiteUrl' | 'instagramUrl' | 'facebookUrl'
  >
): string {
  const part = (value: string | null) => (value ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
  return [
    part(input.companyName),
    part(input.country),
    part(input.websiteUrl),
    part(input.instagramUrl),
    part(input.facebookUrl),
  ].join('|');
}

/**
 * The fingerprint of a RAW submission (before normalisation). Used to record a
 * REFUSED attempt against the session budget, so the same payload retried is the
 * same attempt. Links are normalised here too, so an accepted and a refused
 * submission of the same answers produce the SAME key — one definition, not two.
 */
export function fingerprintFromRaw(raw: unknown): string {
  if (!isRecord(raw)) return 'invalid-payload';
  return applicationFingerprint({
    companyName: text(raw.companyName).trim(),
    country: text(raw.country).trim(),
    websiteUrl: normaliseUrl(raw.websiteUrl, 'website'),
    instagramUrl: normaliseUrl(raw.instagramUrl, 'instagram'),
    facebookUrl: normaliseUrl(raw.facebookUrl, 'facebook'),
  });
}

export type ValidationResult =
  | { ok: true; normalised: NormalisedApplication }
  | { ok: false; issues: FieldIssue[] };

/**
 * Validate every answer and produce the canonical payload. Fail closed: a
 * non-object input, a country the form does not offer, a malformed link, a
 * non-numeric product count or an over-long answer is refused with the declared
 * code and sentence — never quietly accepted or coerced.
 */
export function validateApplicationInput(raw: unknown): ValidationResult {
  if (!isRecord(raw)) {
    return { ok: false, issues: [issue('form', 'verification_unavailable')] };
  }
  const issues: FieldIssue[] = [];
  const limits = PARTNER_APPLICATION_LIMITS;

  const companyName = text(raw.companyName).trim();
  if (!companyName) {
    issues.push(issue('companyName', 'missing_company'));
  } else if (companyName.length < limits.companyName.min || companyName.length > limits.companyName.max) {
    issues.push(issue('companyName', 'invalid_company', limits.companyName));
  }

  const countryRaw = text(raw.country).trim();
  let country: string | null = null;
  if (!countryRaw) {
    issues.push(issue('country', 'missing_country'));
  } else if (!isDeclaredCountry(countryRaw)) {
    issues.push(issue('country', 'unknown_country'));
  } else {
    country = countryRaw;
  }

  const phoneDigits = text(raw.phone).replace(/[\s()+-]/g, '');
  let phone: string | null = null;
  if (phoneDigits) {
    const { minDigits, maxDigits } = limits.phone;
    if (!/^\d+$/.test(phoneDigits) || phoneDigits.length < minDigits || phoneDigits.length > maxDigits) {
      issues.push(issue('phone', 'invalid_phone', { min: minDigits, max: maxDigits }));
    } else {
      phone = phoneDigits;
    }
  }

  const skuRaw = text(raw.skuCount).trim();
  let skuCount: number | null = null;
  if (skuRaw) {
    const parsed = Number(skuRaw);
    if (
      !/^\d+$/.test(skuRaw) ||
      !Number.isSafeInteger(parsed) ||
      parsed < limits.skuCount.min ||
      parsed > limits.skuCount.max
    ) {
      issues.push(issue('skuCount', 'invalid_sku_count'));
    } else {
      skuCount = parsed;
    }
  }

  const links: Record<'websiteUrl' | 'instagramUrl' | 'facebookUrl', string | null> = {
    websiteUrl: null,
    instagramUrl: null,
    facebookUrl: null,
  };
  let linksProvided = 0;
  for (const field of LINK_FIELDS) {
    const value = text(raw[field.key]).trim();
    if (!value) continue;
    linksProvided += 1;
    const normalised = normaliseUrl(value, field.kind);
    if (!normalised) {
      issues.push(issue(field.key, field.code));
    } else {
      links[field.key] = normalised;
    }
  }
  if (linksProvided === 0) {
    issues.push(issue('websiteUrl', 'no_link'));
  }

  const referralSource = text(raw.referralSource).trim() || null;
  if (referralSource && referralSource.length > limits.referralSource.max) {
    issues.push(issue('referralSource', 'field_too_long', { max: limits.referralSource.max }));
  }
  const description = text(raw.description).trim() || null;
  if (description && description.length > limits.description.max) {
    issues.push(issue('description', 'field_too_long', { max: limits.description.max }));
  }

  const totalChars =
    companyName.length +
    countryRaw.length +
    phoneDigits.length +
    skuRaw.length +
    Object.values(links).join('').length +
    (referralSource?.length ?? 0) +
    (description?.length ?? 0);
  if (totalChars > limits.totalPayload.max) {
    issues.push(issue('form', 'payload_too_large'));
  }

  if (issues.length > 0) return { ok: false, issues };
  if (!country) return { ok: false, issues: [issue('country', 'unknown_country')] };

  return {
    ok: true,
    normalised: {
      companyName,
      country,
      phone,
      skuCount,
      websiteUrl: links.websiteUrl,
      instagramUrl: links.instagramUrl,
      facebookUrl: links.facebookUrl,
      referralSource,
      description,
    },
  };
}

/* ── THE SPAM SIGNALS ─────────────────────────────────────────────────────────
 * Four signals, all available without a third-party service, all declared in the
 * config. Evaluated in the order a genuine applicant could plausibly trip: a
 * filled honeypot is never a person; an impossible fill time is never a person;
 * the session's own attempt budget comes next; then the duplicate window.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface SpamSignalInput {
  /** The raw value of the declared honeypot field — must be a string. */
  honeypot: unknown;
  /** Milliseconds between the form mounting and this submit attempt. */
  elapsedMs: unknown;
  /** This session's attempts, REJECTED ones included. */
  attempts: readonly AttemptRecord[];
  /** Of the normalised payload (see `applicationFingerprint`). */
  fingerprint: string;
  /** Epoch milliseconds, injected — this module never reads a clock. */
  now: unknown;
}

export type SpamSignalDecision =
  | { outcome: 'accept' }
  | {
      outcome: 'reject';
      code: ApplicationSubmissionCode;
      message: string;
      retryAfterMs?: number;
      signal: DecisionSignal;
    };

function retryIn(ms: number): number {
  return Math.max(0, Math.ceil(ms));
}

/**
 * Decide on the spam signals alone. FAIL CLOSED at every step: an absent honeypot
 * value, a non-finite elapsed time, a non-finite clock or a malformed attempt
 * ledger is `verification_unavailable` — never an acceptance.
 */
export function evaluateSpamSignals(input: SpamSignalInput): SpamSignalDecision {
  const policy = APPLICATION_SPAM_POLICY;
  const refuse = (
    code: ApplicationSubmissionCode,
    signal: DecisionSignal,
    retryAfterMs?: number
  ): SpamSignalDecision => ({
    outcome: 'reject',
    code,
    message: applicationMessage(code),
    ...(retryAfterMs === undefined ? {} : { retryAfterMs: retryIn(retryAfterMs) }),
    signal,
  });

  if (typeof input.honeypot !== 'string') return refuse('verification_unavailable', 'unavailable');
  if (input.honeypot.trim().length > 0) return refuse('honeypot_filled', 'honeypot');

  const elapsed = typeof input.elapsedMs === 'number' ? input.elapsedMs : Number.NaN;
  if (!Number.isFinite(elapsed) || elapsed < 0) return refuse('verification_unavailable', 'unavailable');
  if (elapsed < policy.minFillMs) return refuse('too_fast', 'timing', policy.minFillMs - elapsed);

  const now = typeof input.now === 'number' ? input.now : Number.NaN;
  if (!Number.isFinite(now)) return refuse('verification_unavailable', 'unavailable');

  if (!Array.isArray(input.attempts)) return refuse('verification_unavailable', 'unavailable');
  const ledger: AttemptRecord[] = [];
  for (const entry of input.attempts) {
    if (!isRecord(entry)) return refuse('verification_unavailable', 'unavailable');
    const at = entry.at;
    const fingerprint = entry.fingerprint;
    const recorded = entry.recorded;
    if (
      typeof at !== 'number' ||
      !Number.isFinite(at) ||
      typeof fingerprint !== 'string' ||
      typeof recorded !== 'boolean'
    ) {
      return refuse('verification_unavailable', 'unavailable');
    }
    ledger.push({ at, fingerprint, recorded });
  }

  const inWindow = ledger.filter((entry) => entry.at > now - policy.window.windowMs);
  if (inWindow.length >= policy.window.maxAttempts) {
    const oldest = Math.min(...inWindow.map((entry) => entry.at));
    return refuse('attempt_limit', 'rate', policy.window.windowMs - (now - oldest));
  }

  /* §CG — only a RECORDED application can make a second submission a duplicate.
   * A refused attempt was never received, so an applicant told to fix their
   * answers (or to slow down) must be able to submit them again. */
  const duplicates = ledger.filter(
    (entry) =>
      entry.recorded === true &&
      entry.fingerprint === input.fingerprint &&
      entry.at > now - policy.duplicate.windowMs
  );
  if (duplicates.length > 0) {
    const mostRecent = Math.max(...duplicates.map((entry) => entry.at));
    return refuse('duplicate_submission', 'duplicate', policy.duplicate.windowMs - (now - mostRecent));
  }

  return { outcome: 'accept' };
}

/**
 * The gate's input: the raw answers plus the three signals the component can
 * observe. `fingerprint` is deliberately NOT an input — the gate derives it from
 * the normalised payload, so a caller cannot supply a fingerprint that does not
 * match the answers being submitted.
 */
export interface SubmissionInput extends Omit<SpamSignalInput, 'fingerprint'> {
  /** The raw form answers, exactly as held by the component. */
  raw: unknown;
}

/**
 * THE GATE'S ONE DECISION for one attempt: answers first, then the spam signals.
 * On acceptance it returns the canonical payload the store must record; on
 * refusal it returns the declared code, the declared honest sentence and (where
 * the refusal is time-based) how long the applicant must wait.
 */
export function evaluateApplicationSubmission(input: SubmissionInput): SubmissionDecision {
  const validation = validateApplicationInput(input.raw);
  if (!validation.ok) {
    const first = validation.issues[0];
    return {
      outcome: 'reject',
      code: first.code,
      message: first.message,
      field: first.field,
      issues: validation.issues,
      signal: first.code === 'payload_too_large' ? 'size' : 'validation',
    };
  }

  const normalised = validation.normalised;
  const spam = evaluateSpamSignals({
    honeypot: input.honeypot,
    elapsedMs: input.elapsedMs,
    attempts: input.attempts,
    fingerprint: applicationFingerprint(normalised),
    now: input.now,
  });

  if (spam.outcome === 'reject') {
    return {
      outcome: 'reject',
      code: spam.code,
      message: spam.message,
      issues: [],
      ...(spam.retryAfterMs === undefined ? {} : { retryAfterMs: spam.retryAfterMs }),
      signal: spam.signal,
    };
  }

  return { outcome: 'accept', code: 'accepted', message: '', issues: [], normalised, signal: 'none' };
}


