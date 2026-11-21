/**
 * §CG — THE CONVERSION GATE (`/src/components/auth/PartnerApplicationForm.tsx`).
 *
 * THE RECORDED SCOPE THIS GATE MAKES AUDITABLE
 * --------------------------------------------
 * `requirements-registry.json → phase15-conversion` recorded the conversion launch
 * gate as *"form validation, spam protection, submission reliability"* with the
 * remainder *"spam protection and submission reliability remain"*. This gate
 * asserts the three capabilities exist, sit in the declared owners, and cannot
 * regress silently.
 *
 * Asserted (zero network — `fetch` is sabotaged before any module loads):
 *   1  the SSOT (`src/config/partnerApplication.ts`) declares every threshold, every
 *      limit, every message and the country list EXACTLY ONCE (a grep across all of
 *      `src/` proves no component or test re-declares one);
 *   2  the pure guard (`src/lib/onboarding/applicationGuard.ts`) is PURE (no clock,
 *      no network, no store) and FAILS CLOSED — every signal is exercised against
 *      the real module: honeypot, fill time, session rate, duplicate, URL/field
 *      validation, and the malformed-input paths. Since the 2026-09-26 Founder
 *      decision the PHONE NUMBER is COMPULSORY, so an empty, whitespace-only or
 *      separator-only answer must refuse as `missing_phone` and never be recorded;
 *   3  the store enforces the duplicate fail-safe at the domain boundary, records
 *      REFUSED attempts in the session budget, and patches link verification after
 *      the record exists;
 *   4  the FORM binds all of it: the honeypot is unannounced and unfocusable, every
 *      declared field renders its own accessible refusal, the submit path is
 *      guarded by a synchronous ref, the handler cannot leave the button stuck, and
 *      verification runs AFTER the write (never holding the applicant open);
 *   5  the two registry rows that this session reconciled are still true: the 3PL
 *      carrier surface is gone (§P9) and the 390x844 shell test carries its repair;
 *   6  the browser spec and the DEPLOYED live script carry the gate's legs.
 *
 * Run: node scripts/validate-conversion-gate.mjs
 */
import { createServer } from 'vite';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ── Zero-network guard: this gate must never reach the network ─────────────── */

let fetchCalls = 0;
globalThis.fetch = () => {
  fetchCalls++;
  throw new Error('NETWORK_CALL_ATTEMPTED');
};

let pass = 0;
let fail = 0;
const failures = [];
function check(name, ok, detail = '') {
  if (ok) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const readSrc = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
/** Source with comments removed — so a DOCUMENTED example can never satisfy an assertion. */
const codeOf = (rel) => stripComments(readSrc(rel));
const exists = (rel) => existsSync(path.join(ROOT, rel));

/** Every source file under src/ (so a duplicate declaration cannot hide). */
function walk(dir, out = []) {
  for (const entry of readdirSync(path.join(ROOT, dir))) {
    const rel = `${dir}/${entry}`;
    const st = statSync(path.join(ROOT, rel));
    if (st.isDirectory()) walk(rel, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(rel);
  }
  return out;
}

const SRC_FILES = walk('src');
const CONFIG = 'src/config/partnerApplication.ts';
const GUARD = 'src/lib/onboarding/applicationGuard.ts';
const STORE = 'src/data/applicationStore.ts';
const FORM = 'src/components/auth/PartnerApplicationForm.tsx';
const SPEC = 'e2e/conversion-gate.spec.ts';
const LIVE = 'scripts/verify-demo-live.mjs';

console.log('\n§CG — conversion gate (validation · spam protection · submission reliability)\n');

/* ── 1. THE FILES EXIST ───────────────────────────────────────────────────── */

for (const file of [CONFIG, GUARD, STORE, FORM, SPEC]) {
  check(`the increment ships ${file}`, exists(file));
}

/* ── 2. ONE DECLARATION OF EVERY THRESHOLD ────────────────────────────────── */

const configSrc = readSrc(CONFIG);
const configCode = codeOf(CONFIG);

for (const [name, pattern] of [
  ['the honeypot field', /honeypot:\s*\{/],
  ['the minimum fill time', /minFillMs:\s*[\d_]+/],
  ['the session attempt window', /window:\s*\{\s*maxAttempts:\s*\d+,\s*windowMs:/],
  ['the duplicate window', /duplicate:\s*\{\s*windowMs:/],
  ['the field limits', /PARTNER_APPLICATION_LIMITS\s*=\s*\{/],
  ['the verification promise', /APPLICATION_VERIFICATION_PROMISE\s*=\s*\{/],
  ['the country list', /PARTNER_APPLICATION_COUNTRIES\s*=\s*\[/],
  ['the message vocabulary', /APPLICATION_SUBMISSION_MESSAGES:\s*Record</],
]) {
  check(`the SSOT declares ${name}`, pattern.test(configCode));
}

/** A literal that may appear ONLY in the SSOT, nowhere else under src/. */
function declaredOnlyInConfig(label, literal) {
  const offenders = SRC_FILES.filter((rel) => rel !== CONFIG && codeOf(rel).includes(literal));
  check(
    `ONE source of truth: ${label} appears only in the SSOT (${literal})`,
    offenders.length === 0,
    offenders.join(', ')
  );
}
declaredOnlyInConfig('the honeypot field name', 'company_fax');
declaredOnlyInConfig('the minimum fill time', '2_500');
declaredOnlyInConfig('the 10-minute attempt window', '10 * 60_000');
declaredOnlyInConfig('the duplicate window', 'duplicate: { windowMs: 60_000 }');
declaredOnlyInConfig('the country list', "'United Kingdom', code: '+44'");

check(
  'the retired in-component country list is GONE (it lived in the form before this increment)',
  !SRC_FILES.some((rel) => codeOf(rel).includes('COUNTRIES_WITH_CODES')),
  SRC_FILES.filter((rel) => codeOf(rel).includes('COUNTRIES_WITH_CODES')).join(', ')
);
check(
  'the retired inline rule text is GONE from the form (the sentence lives in the SSOT)',
  !codeOf(FORM).includes('Please provide at least one link so we can verify your brand.') &&
    configSrc.includes('Please provide at least one link so we can verify your brand.'),
  'the form still hardcodes the sentence'
);
check(
  'the description ceiling is not re-typed in the form',
  !codeOf(FORM).includes('maxLength={200}') && codeOf(FORM).includes('PARTNER_APPLICATION_LIMITS.description.max')
);

/* ── 3. THE PURE GUARD, EXERCISED AGAINST THE REAL MODULE ─────────────────── */

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
const cfg = await server.ssrLoadModule('/src/config/partnerApplication.ts');
const guard = await server.ssrLoadModule('/src/lib/onboarding/applicationGuard.ts');
const store = await server.ssrLoadModule('/src/data/applicationStore.ts');

const policy = cfg.APPLICATION_SPAM_POLICY;
const LATER = 1_800_000_000_000; // an injected clock, never read from the machine

const validRaw = {
  companyName: 'Cape Verdant Ltd',
  country: 'United Kingdom',
  phone: '2079460958',
  skuCount: '12',
  websiteUrl: 'https://capeverdant.example',
  instagramUrl: '',
  facebookUrl: '',
  referralSource: 'UK Trade Fair',
  description: 'A real applicant.',
};
const validFingerprint = guard.applicationFingerprint({
  companyName: validRaw.companyName,
  country: validRaw.country,
  websiteUrl: validRaw.websiteUrl,
  instagramUrl: null,
  facebookUrl: null,
});

function decide(overrides = {}, signals = {}) {
  return guard.evaluateApplicationSubmission({
    raw: { ...validRaw, ...overrides },
    honeypot: '',
    elapsedMs: policy.minFillMs + 7_500,
    attempts: [],
    now: LATER,
    ...signals,
  });
}
const outcomeOf = (d) => `${d.outcome}:${d.code}`;

const CASES = [
  ['a complete, well-formed application is ACCEPTED', {}, {}, 'accept:accepted'],
  ['a missing company name is refused', { companyName: '   ' }, {}, 'reject:missing_company'],
  ['a one-character company name is refused', { companyName: 'A' }, {}, 'reject:invalid_company'],
  ['a missing country is refused', { country: null }, {}, 'reject:missing_country'],
  ['a country the form does not offer is refused', { country: 'Narnia' }, {}, 'reject:unknown_country'],
  ['no link at all is refused', { websiteUrl: '', instagramUrl: '', facebookUrl: '' }, {}, 'reject:no_link'],
  ['a javascript: URL is refused', { websiteUrl: 'javascript:alert(1)' }, {}, 'reject:invalid_website_url'],
  ['a non-http scheme is refused', { websiteUrl: 'ftp://example.com' }, {}, 'reject:invalid_website_url'],
  ['a hostname with no dot is refused', { websiteUrl: 'localhost' }, {}, 'reject:invalid_website_url'],
  ['a Yahoo link in the Instagram field is refused', { instagramUrl: 'https://yahoo.com/x' }, {}, 'reject:invalid_instagram_url'],
  ['a bare facebook.com page is accepted and normalised', { facebookUrl: 'facebook.com/yourbrand' }, {}, 'accept:accepted'],
  ['a non-numeric product count is refused (NaN is not a number)', { skuCount: 'abc' }, {}, 'reject:invalid_sku_count'],
  ['a zero product count is refused', { skuCount: '0' }, {}, 'reject:invalid_sku_count'],
  ['a two-digit phone number is refused', { phone: '12' }, {}, 'reject:invalid_phone'],
  /* §PHONE — the Founder made the phone COMPULSORY on 2026-09-26. These four cases
   * are the refusal contract: an absent, blank, separator-only or non-string answer
   * is REFUSED (never coerced to "no phone, carry on"), and the separators a person
   * actually types are stripped before the digits are counted. */
  ['a MISSING phone number is refused (it is compulsory)', { phone: '' }, {}, 'reject:missing_phone'],
  ['a whitespace-only phone number is refused', { phone: '   ' }, {}, 'reject:missing_phone'],
  ['a separator-only phone number is refused (absent, not "empty ⇒ accepted")', { phone: '---' }, {}, 'reject:missing_phone'],
  ['a NON-STRING phone number FAILS CLOSED as missing', { phone: undefined }, {}, 'reject:missing_phone'],
  ['a phone number typed with the usual separators is accepted and normalised', { phone: '+44 (0) 20 7946 0958' }, {}, 'accept:accepted'],
  ['an over-long description is refused', { description: 'x'.repeat(201) }, {}, 'reject:field_too_long'],
  [
    'an over-large payload is refused',
    {
      websiteUrl: `https://example.com/${'a'.repeat(370)}`,
      instagramUrl: `https://instagram.com/${'a'.repeat(370)}`,
      facebookUrl: `https://facebook.com/${'a'.repeat(370)}`,
    },
    {},
    'reject:payload_too_large',
  ],
  ['a filled honeypot is refused', {}, { honeypot: 'bot' }, 'reject:honeypot_filled'],
  ['a NON-STRING honeypot FAILS CLOSED', {}, { honeypot: undefined }, 'reject:verification_unavailable'],
  ['a missing elapsed time FAILS CLOSED', {}, { elapsedMs: undefined }, 'reject:verification_unavailable'],
  ['a NaN elapsed time FAILS CLOSED', {}, { elapsedMs: Number.NaN }, 'reject:verification_unavailable'],
  ['a negative elapsed time FAILS CLOSED', {}, { elapsedMs: -5 }, 'reject:verification_unavailable'],
  ['a submission faster than the declared minimum is refused', {}, { elapsedMs: policy.minFillMs - 1_000 }, 'reject:too_fast'],
  ['a submission exactly at the declared minimum is accepted', {}, { elapsedMs: policy.minFillMs }, 'accept:accepted'],
  ['a non-finite clock FAILS CLOSED', {}, { now: Number.NaN }, 'reject:verification_unavailable'],
  ['a malformed attempt ledger FAILS CLOSED', {}, { attempts: [{ at: 'x', fingerprint: '' }] }, 'reject:verification_unavailable'],
  ['an attempt without its recorded flag FAILS CLOSED', {}, { attempts: [{ at: LATER, fingerprint: 'f' }] }, 'reject:verification_unavailable'],
  ['a non-array attempt ledger FAILS CLOSED', {}, { attempts: null }, 'reject:verification_unavailable'],
  [
    'the session attempt budget refuses an attempt over the declared maximum',
    {},
    { attempts: [0, 1, 2].map((i) => ({ at: LATER - 1_000 * i, fingerprint: `other-${i}`, recorded: i === 0 })) },
    'reject:attempt_limit',
  ],
  [
    'the SAME application inside the duplicate window is refused',
    {},
    { attempts: [{ at: LATER - 1_000, fingerprint: validFingerprint, recorded: true }] },
    'reject:duplicate_submission',
  ],
  [
    'the same application OUTSIDE the duplicate window is accepted',
    {},
    { attempts: [{ at: LATER - policy.duplicate.windowMs - 1, fingerprint: validFingerprint, recorded: true }] },
    'accept:accepted',
  ],
  [
    'a REFUSED earlier attempt does NOT make the retry a duplicate (the message stays true)',
    {},
    { attempts: [{ at: LATER - 1_000, fingerprint: validFingerprint, recorded: false }] },
    'accept:accepted',
  ],
];

for (const [name, overrides, signals, expected] of CASES) {
  const decision = decide(overrides, signals);
  check(name, outcomeOf(decision) === expected, `got ${outcomeOf(decision)}, expected ${expected}`);
}

/* ── 3b. §PHONE — THE COMPULSORY ANSWER (Founder decision, 2026-09-26) ───────── */

check(
  'the accepted payload ALWAYS carries a phone (it is compulsory, never null)',
  typeof decide().normalised?.phone === 'string' && (decide().normalised?.phone ?? '').length > 0,
  String(decide().normalised?.phone)
);
check(
  'the separators a person types are stripped before the digits are counted',
  decide({ phone: '+44 (0) 20 7946 0958' }).normalised?.phone === '4402079460958',
  String(decide({ phone: '+44 (0) 20 7946 0958' }).normalised?.phone)
);
check(
  'missing_phone is declared in the SSOT vocabulary AND is applicant-fixable',
  typeof cfg.APPLICATION_SUBMISSION_MESSAGES.missing_phone === 'string' &&
    cfg.APPLICATION_SUBMISSION_MESSAGES.missing_phone.length > 0 &&
    cfg.APPLICANT_FIXABLE_CODES.includes('missing_phone')
);
check(
  'the missing-phone sentence says WHY it is needed (not "invalid input")',
  /phone number/i.test(cfg.applicationMessage('missing_phone')) &&
    /contact you/i.test(cfg.applicationMessage('missing_phone')),
  cfg.applicationMessage('missing_phone')
);
check(
  'a phone refusal blames the phone FIELD (so the form focuses it)',
  decide({ phone: '' }).field === 'phone',
  String(decide({ phone: '' }).field)
);
/* NEGATIVE — the type-level invariant, asserted against the DECLARATIONS (a local
 * reassignment variable inside the guard is not a contract). `phone: string | null`
 * on any of these three is what allowed the old optional contract; if it returns,
 * the domain can once again record an application nobody can be contacted about. */
check(
  'NEGATIVE: the accepted-payload type declares a NON-NULLABLE phone',
  /export interface NormalisedApplication[\s\S]*?\n  phone: string;/.test(readSrc(GUARD)) &&
    !/export interface NormalisedApplication[\s\S]*?\n  phone: string \| null;/.test(readSrc(GUARD))
);
check(
  'NEGATIVE: the stored-application type declares a NON-NULLABLE phone',
  /export interface BrandApplication \{[\s\S]*?\n  phone: string;/.test(readSrc('src/types.ts')) &&
    !/export interface BrandApplication \{[\s\S]*?\n  phone: string \| null;/.test(readSrc('src/types.ts'))
);
check(
  'NEGATIVE: the canonical writer refuses a nullable phone in its input contract',
  /export function submitApplication\(input: \{[\s\S]*?\n  phone: string;/.test(readSrc(STORE)) &&
    !/export function submitApplication\(input: \{[\s\S]*?\n  phone: string \| null;/.test(readSrc(STORE))
);
check(
  'NEGATIVE: the guard — not the form — is where the missing phone is refused',
  /issue\('phone', 'missing_phone'\)/.test(codeOf(GUARD))
);
check(
  'NEGATIVE: the form can no longer write a null phone',
  !/phone:\s*normalised\.phone \?/.test(codeOf(FORM)) && /phone: `\$\{phoneCode\}/.test(codeOf(FORM))
);
check(
  'the reviewer can READ the compulsory number on the application card',
  /\{app\.phone\}/.test(readSrc('src/components/admin/ApplicationsPanel.tsx')),
  'the admin card would collect a required phone and hide it'
);

/* ── 4. PURITY, NORMALISATION AND THE TIME-BASED REFUSALS ─────────────────── */

const guardCode = codeOf(GUARD);
check('the guard never reads a clock (the time is injected)', !/Date\.now\(|new Date\(/.test(guardCode));
check('the guard never calls fetch', !/\bfetch\s*\(/.test(guardCode));
check('the guard never imports a store (it decides, it does not record)', !/from '@\/data\//.test(guardCode));
check('the guard imports the SSOT and nothing else', /from '@\/config\/partnerApplication'/.test(readSrc(GUARD)));

check(
  'a bare domain is normalised to https',
  guard.normaliseUrl('example.com', 'website') === 'https://example.com'
);
check(
  'scheme case, www and the trailing slash are normalised away',
  guard.normaliseUrl('HTTPS://WWW.Example.COM/x/', 'website') === 'https://example.com/x'
);
check(
  'a query string is NOT part of the canonical website identity',
  guard.normaliseUrl('example.com/a?token=s3cret#frag', 'website') === 'https://example.com/a'
);
check(
  'an Instagram handle is normalised to the canonical profile URL',
  guard.normaliseUrl('instagram.com/Brand.Name', 'instagram') === 'https://instagram.com/Brand.Name'
);
check(
  'a Facebook alias (fb.com) is normalised to facebook.com',
  guard.normaliseUrl('fb.com/yourbrand', 'facebook') === 'https://facebook.com/yourbrand'
);
check('a data: URL is refused', guard.normaliseUrl('data:text/html,<b>x', 'website') === null);
check('a mailto: URL is refused', guard.normaliseUrl('mailto:a@b.com', 'website') === null);
check('an over-long URL is refused', guard.normaliseUrl(`https://example.com/${'a'.repeat(400)}`, 'website') === null);

check(
  'the fingerprint is stable across case and surrounding whitespace',
  guard.fingerprintFromRaw({ ...validRaw, companyName: '  CAPE   verdant LTD ' }) === validFingerprint
);
check(
  'the fingerprint changes when the answers genuinely change',
  guard.fingerprintFromRaw({ ...validRaw, country: 'Spain' }) !== validFingerprint
);
check(
  'a refused attempt fingerprints the SAME payload the same way as an accepted one',
  guard.fingerprintFromRaw(validRaw) === validFingerprint
);

const tooFast = decide({}, { elapsedMs: 100 });
check(
  'the too-fast refusal states how long the applicant must wait',
  tooFast.retryAfterMs === policy.minFillMs - 100,
  String(tooFast.retryAfterMs)
);
const rateLimited = decide({}, {
  attempts: [0, 1, 2].map((i) => ({ at: LATER - policy.window.windowMs + 1_000 + i, fingerprint: `o-${i}`, recorded: i === 0 })),
});
check(
  'the rate-limit refusal states when the budget frees up',
  rateLimited.code === 'attempt_limit' && rateLimited.retryAfterMs > 0 && rateLimited.retryAfterMs <= policy.window.windowMs,
  String(rateLimited.retryAfterMs)
);
check(
  'only the applicant-fixable codes can carry a field (a bot refusal never blames an input)',
  tooFast.field === undefined && rateLimited.field === undefined
);
check(
  'a refused submission NEVER returns a normalised payload to record',
  decide({ companyName: '' }).normalised === undefined
);
check(
  'the plugin-free message interpolation has no unresolved placeholder left',
  !cfg.applicationMessage('invalid_phone', { min: 6, max: 15 }).includes('{') &&
    cfg.applicationMessage('invalid_phone', { min: 6, max: 15 }).includes('6–15')
);

/* ── 5. THE STORE: SESSION BUDGET, DOMAIN FAIL-SAFE, DEFERRED PATCH ────────── */

store.resetApplicationAttempts();
const now1 = LATER;
const applicationsBefore = store.demoApplications.length;

const firstDecision = guard.evaluateApplicationSubmission({
  raw: validRaw,
  honeypot: '',
  elapsedMs: 10_000,
  attempts: store.getApplicationAttempts(now1),
  now: now1,
});
check('the first real attempt is accepted', firstDecision.outcome === 'accept');
store.recordApplicationAttempt({
  code: firstDecision.code,
  fingerprint: guard.fingerprintFromRaw(validRaw),
  recorded: true,
  at: now1,
});
check('an accepted attempt is counted against the session budget', store.getApplicationAttempts(now1).length === 1);

const repeatDecision = guard.evaluateApplicationSubmission({
  raw: validRaw,
  honeypot: '',
  elapsedMs: 10_000,
  attempts: store.getApplicationAttempts(now1),
  now: now1,
});
check(
  'the SAME application inside the duplicate window is refused by the guard (the form path)',
  repeatDecision.code === 'duplicate_submission',
  repeatDecision.code
);
store.recordApplicationAttempt({
  code: repeatDecision.code,
  fingerprint: guard.fingerprintFromRaw(validRaw),
  recorded: false,
  at: now1,
});
check('a REFUSED attempt is counted too (a free retry is not a rate limit)', store.getApplicationAttempts(now1).length === 2);
check('a refused attempt is NOT recorded as an application', store.demoApplications.length === applicationsBefore);
check(
  'the session budget expires with the declared window',
  store.getApplicationAttempts(now1 + policy.window.windowMs + 1).length === 0
);
store.resetApplicationAttempts();
check('resetApplicationAttempts clears the session budget', store.applicationAttempts.length === 0);

const submission = (over = {}) => ({
  companyName: 'Dedupe Fail-Safe Ltd',
  country: 'United Kingdom',
  category: 'Home',
  /* §PHONE — compulsory since the 2026-09-26 Founder decision, so no fixture can
   * hand the writer a null phone any more. */
  phone: '+44 2079460958',
  skuCount: 5,
  monthlyRevenue: '£5k–£20k',
  websiteUrl: 'https://dedupe.example',
  instagramUrl: null,
  facebookUrl: null,
  websiteStatus: null,
  instagramStatus: null,
  facebookStatus: null,
  referralSource: null,
  description: null,
  ...over,
});

const countBefore = store.demoApplications.length;
const created = store.submitApplication(submission({ opts: { now: LATER } }));
check('a first submission is recorded', store.demoApplications.length === countBefore + 1);

const duplicateCall = store.submitApplication(submission({ opts: { now: LATER + 1_000 } }));
check(
  'the DOMAIN BOUNDARY refuses a second record for the same brand inside the duplicate window',
  store.demoApplications.length === countBefore + 1,
  `${store.demoApplications.length - countBefore - 1} extra record(s)`
);
check('the duplicate call returns the ORIGINAL record (no second identity is invented)', duplicateCall.id === created.id);
check(
  'the record was created with NO verification claim (verification has not run yet)',
  created.websiteStatus === null && created.instagramStatus === null && created.facebookStatus === null
);

const explicitId = store.submitApplication(
  submission({ opts: { id: 'app-cg-explicit', now: LATER + 2_000 } })
);
check(
  'an explicit deterministic id is never collapsed into another record (the investor-demo contract)',
  explicitId.id === 'app-cg-explicit' && store.demoApplications.length === countBefore + 2
);

store.submitApplication(submission({ opts: { now: LATER + 3_000, dedupeWindowMs: 0 } }));
check(
  'the duplicate window can be disabled explicitly (0) by a caller that owns its own idempotency',
  store.demoApplications.length === countBefore + 3
);

const patched = store.updateApplicationLinkStatus(created.id, { websiteStatus: 'verified' });
check('link verification is attached AFTER the record exists', patched.websiteStatus === 'verified');
check(
  'a link that was not checked is left untouched (no invented result)',
  patched.instagramStatus === null && patched.facebookStatus === null
);
check(
  'patching a record that does not exist changes nothing',
  store.updateApplicationLinkStatus('app-cg-missing', { websiteStatus: 'verified' }) === null
);

const storeCode = codeOf(STORE);
check('the store declares the attempt ledger exactly once', (storeCode.match(/export const applicationAttempts/g) ?? []).length === 1);
check('the ledger is pruned (bounded memory)', /function pruneApplicationAttempts/.test(storeCode));
check('the store reads the duplicate window from the SSOT', /APPLICATION_SPAM_POLICY\.duplicate\.windowMs/.test(storeCode));
check('the store exposes the deferred verification patch', /export function updateApplicationLinkStatus/.test(storeCode));

/* ── 6. THE FORM BINDS ALL OF IT ──────────────────────────────────────────── */

const formCode = codeOf(FORM);
check('the form delegates every rule to the guard', /import[\s\S]{0,120}evaluateApplicationSubmission/.test(readSrc(FORM)) && /evaluateApplicationSubmission\(/.test(formCode));
check('the form feeds the guard the session budget', /getApplicationAttempts\(/.test(formCode));
check('the form records EVERY attempt (accepted or refused)', /recordApplicationAttempt\(/.test(formCode));
check('the form uses the NON-BLOCKING verifier', /verifyLinksNonBlocking\(/.test(formCode));
check('the old blocking verifier is gone from the form', !/\bverifyLinks\(/.test(formCode) && !/await\s+verifyLinks/.test(formCode));
check('verification runs AFTER the application exists', formCode.indexOf('submitApplication(') < formCode.indexOf('verifyLinksNonBlocking('));
check('the submit path cannot leave the button stuck (try / catch / finally)', /\btry\s*\{/.test(formCode) && /\}\s*catch\s*\{/.test(formCode) && /\}\s*finally\s*\{/.test(formCode));
check('a synchronous ref stops a double submit before React can flush state', /submittingRef\.current\)\s*return/.test(formCode));
check('the elapsed time comes from the form-mount seam', /renderedAtRef\.current/.test(formCode));
check('the form does not parse numbers itself (the guard owns NaN)', !/parseInt\(/.test(formCode));

check('the honeypot renders from the SSOT', /APPLICATION_SPAM_POLICY\.honeypot\.fieldName/.test(formCode));
check('the honeypot is not announced to assistive technology', /data-cg-honeypot[\s\S]{0,200}aria-hidden="true"|aria-hidden="true"[\s\S]{0,200}data-cg-honeypot/.test(formCode));
check('the honeypot cannot be tabbed to', /tabIndex=\{-1\}/.test(formCode));
check('the honeypot is not autofilled', /autoComplete="off"/.test(formCode));
check('the honeypot is positioned off-screen, not display:none', /left:\s*'-9999px'/.test(formCode));

const declaredFields = ['companyName', 'country', 'phone', 'skuCount', 'websiteUrl', 'instagramUrl', 'facebookUrl', 'referralSource', 'description'];
for (const field of declaredFields) {
  check(`the form renders the declared refusal for ${field}`, formCode.includes(`<FieldError field="${field}"`));
}
check(
  'every control is addressable by the gate (data-cg-field)',
  declaredFields.every((f) => formCode.includes(`data-cg-field="${f}"`)),
  declaredFields.filter((f) => !formCode.includes(`data-cg-field="${f}"`)).join(', ')
);
check('every control exposes its invalid state', (formCode.match(/aria-invalid=/g) ?? []).length >= declaredFields.length);
check('every control points at its own message', (formCode.match(/aria-describedby=/g) ?? []).length >= declaredFields.length);
check('refusals are announced (role="alert")', /role="alert"/.test(formCode));
check(
  'each refusal is announced EXACTLY ONCE (a field refusal is not repeated in the notice)',
  /blamesAField/.test(formCode) && /setError\(blamesAField \? '' : decision\.message\)/.test(formCode)
);
check('the form-level refusal is separately addressable', /data-cg-notice/.test(formCode));
check('browser-native validation cannot pre-empt the declared messages', /noValidate/.test(formCode));
check(
  'the form is now allowed (and required) to claim the phone is required — §PHONE REPOINTED',
  /* §REPOINTED §BATCH 7 (2026-11-21) — `text-red-400`/`text-zinc-600` became
     `text-state-danger`/`text-faint`. The assertion's subject is unchanged (the phone
     label is marked required in the CRITICAL colour, and no longer marked optional);
     only the canonical class names it reads moved. */
  /Phone Number <span className="text-state-danger">\*<\/span>/.test(readSrc(FORM)) &&
    !/Phone Number <span className="text-faint">\(optional\)<\/span>/.test(readSrc(FORM)),
  'the label still disagrees with the domain about the phone'
);

/* ── 7. THE TWO REGISTRY ROWS THIS SESSION RECONCILED ─────────────────────── */

check(
  'the retired 3PL carrier shell is GONE (§P9) — the "carrier disposition" row is not unfinished work',
  !exists('src/components/layout/CarrierShell.tsx') && !exists('src/components/carrier')
);
/* The §P9 repoint lives in COMMENTS by design (`codeOf` strips them), so this one
 * assertion reads the raw file: the evidence of the retirement IS the annotation
 * that records where the retired tier used to be. */
check('the RBAC tables carry the §P9 repoint', /§P9/.test(readSrc('src/lib/auth/rbac.ts')));
check(
  'the 390x844 shell test carries its repair (the "timeout under load" row is already repaired)',
  /test\.slow\(\)/.test(readSrc('e2e/app-shell.spec.ts'))
);

const registry = JSON.parse(readSrc('requirements-registry.json'));
const conversion = registry.entries.find((e) => e.id === 'phase15-conversion');
check('the registry still carries the conversion row', Boolean(conversion));
check(
  'the conversion row records the three capabilities as DONE (no longer "remain")',
  Boolean(conversion) && /spam protection/.test(conversion.description) && /DONE/.test(conversion.description),
  conversion ? conversion.description : 'row missing'
);
check(
  'the conversion row is reconciled to built_and_tested',
  Boolean(conversion) && conversion.status === 'built_and_tested',
  conversion ? conversion.status : 'row missing'
);
check(
  'the row records the Founder decision that made the phone COMPULSORY (§PHONE REPOINTED)',
  Boolean(conversion) &&
    /COMPULSORY/i.test(conversion.description) &&
    /missing_phone/.test(conversion.description),
  conversion ? 'the row does not record the compulsory-phone decision' : 'row missing'
);

/* ── 8. THE BROWSER SPEC AND THE DEPLOYED LIVE LEGS ───────────────────────── */

const specSrc = readSrc(SPEC);
check('the browser spec drives the honeypot through its declared hook', /data-cg-honeypot/.test(specSrc));
/* §PHONE — the applicant-visible half of the compulsory-phone contract must be proved
 * in a real browser, not only by the domain gate. */
check(
  'the browser spec proves a MISSING phone is refused under the phone control',
  /data-cg-error="phone"/.test(specSrc) && /#cg-phone/.test(specSrc)
);
check('the browser spec reads the declared form-level refusal', /data-cg-notice/.test(specSrc));
check('the browser spec drives the declared minimum fill time', /§CG minFillMs=\d+/.test(specSrc));

const SPECS_THAT_SUBMIT = ['e2e/access-gate.spec.ts', 'e2e/status-semantics.spec.ts', SPEC];
for (const rel of SPECS_THAT_SUBMIT) {
  const src = readSrc(rel);
  const marker = src.match(/§CG minFillMs=(\d+)/);
  check(`${rel} declares the conversion gate's minimum fill time`, Boolean(marker), 'no §CG minFillMs marker');
  if (!marker) continue;
  const declared = Number(marker[1]);
  check(`${rel}: the declared wait is not below the SSOT minimum`, declared >= policy.minFillMs, `${declared} < ${policy.minFillMs}`);
  /* The wait may be written as the literal or through a named constant — but the
   * constant MUST equal the declared marker, so the two can never drift apart. */
  const constant = src.match(/const MIN_FILL_MS = (\d+);/);
  const usesLiteral = new RegExp(`waitForTimeout\\(${declared}\\b`).test(src);
  const usesConstant =
    Boolean(constant) && Number(constant[1]) === declared && /waitForTimeout\(MIN_FILL_MS\)/.test(src);
  check(
    `${rel}: the spec really waits that long`,
    usesLiteral || usesConstant,
    usesLiteral ? '' : 'no matching waitForTimeout found'
  );
}

check('the DEPLOYED live script carries the conversion gate legs', /§P13\/CG/.test(readSrc(LIVE)));

/* ── 9. THE GATE IS REGISTERED (a gate nothing runs is not a gate) ─────────── */

const pkg = JSON.parse(readSrc('package.json'));
check(
  'the gate is REGISTERED as an npm script that really runs this file',
  pkg.scripts['validate:conversion-gate'] === 'node scripts/validate-conversion-gate.mjs',
  pkg.scripts['validate:conversion-gate'] ?? 'not registered'
);

/* ── 10. ZERO NETWORK ─────────────────────────────────────────────────────── */

check('zero network calls: the conversion gate never reaches the network', fetchCalls === 0, `${fetchCalls} intercepted call(s)`);

console.log(
  `\n§CG — ${pass} assertions PASS, ${fail} FAIL` +
    `${fetchCalls === 0 ? ' · 0 network calls' : ` · ${fetchCalls} NETWORK CALLS`}\n`
);
if (fail > 0) {
  console.log('Failures:');
  for (const f of failures) console.log(`  · ${f}`);
  console.log('');
}
await server.close();
process.exit(fail === 0 && fetchCalls === 0 ? 0 : 1);
