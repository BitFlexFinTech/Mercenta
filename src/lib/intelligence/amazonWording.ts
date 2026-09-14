/**
 * §17/§41 — AMAZON / RETAIL-CHANNEL WORDING SAFEGUARDS.
 *
 * WHY THIS IS A SEPARATE LIST FROM `src/lib/discovery/banned-patterns.mjs`:
 * that shared gate enforces ONE rule — outward-facing text must not name the
 * retail channel. This module enforces a DIFFERENT rule: outward-facing text
 * must not claim a relationship, approval or guarantee that Amazon has not
 * given. Two different rules, two different lists, no overlap and no
 * duplication — both are applied to generated copy.
 *
 * THE RULES (§17):
 *   • never claim Amazon approval, endorsement, partnership or a programme place;
 *   • never promise guaranteed sales, acceptance, launch or approval;
 *   • never imply Mercenta decides or controls Amazon's decision;
 *   • never present a projection as measured Amazon data;
 *   • any reference to an Amazon programme must carry the verification note,
 *     because the current Vendor terms/account agreement have NOT been checked
 *     in this build.
 */
import { lintOutwardWording, type WordingLintResult } from '@/lib/discovery/wordingSafety';

export interface AmazonWordingRule {
  /** What the text must not say (case-insensitive). */
  pattern: RegExp;
  reason: string;
}

export const AMAZON_WORDING_RULES: readonly AmazonWordingRule[] = [
  { pattern: /\bamazon\s+(approved|endorsed|partnered|accredited)\b/i, reason: 'Claims Amazon approval/endorsement, which Mercenta does not hold.' },
  { pattern: /\bapproved\s+by\s+amazon\b/i, reason: 'Claims Amazon approval.' },
  { pattern: /\bamazon\s+(partner|partnership)\b/i, reason: 'Claims an Amazon partnership.' },
  { pattern: /\bofficial\s+amazon\b/i, reason: 'Implies official Amazon status.' },
  { pattern: /\bguaranteed?\s+(sales|revenue|acceptance|approval|launch|placement|listing)\b/i, reason: 'Promises a guaranteed outcome Amazon controls.' },
  // The reverse word order is just as common in generated copy ("your sales are
  // guaranteed"), so the rule covers both directions — a safeguard that only
  // caught one phrasing would give false confidence.
  { pattern: /\b(sales|revenue|acceptance|approval|placement|listing|launch)\b[^.\n]{0,24}\bguaranteed\b/i, reason: 'Promises a guaranteed outcome Amazon controls (reversed phrasing).' },
  { pattern: /\bwe\s+(control|decide|determine)\s+(amazon|the\s+retail\s+channel)\b/i, reason: 'Implies Mercenta controls a channel decision it does not control.' },
  { pattern: /\bborn\s+to\s+run\s+(place|place\s+guaranteed|guarantee)\b/i, reason: 'Claims a place in an Amazon programme.' },
  { pattern: /\bamazon\s+will\s+(definitely|certainly|guaranteed)\b/i, reason: 'Promises an Amazon decision.' },
  { pattern: /\bwe\s+are\s+an\s+amazon\s+(vendor|seller)\s+of\s+record\s+for\s+you\b/i, reason: 'Misstates the vendor-of-record relationship.' },
];

/**
 * The current, honest state of any Amazon-programme workflow in this build.
 * Declared as constants so the estimator, the Born-to-Run model, the UI and the
 * validators all tell the same story.
 */
export const AMAZON_PROGRAMME_STATUS = 'not_confirmed_with_amazon' as const;

/**
 * TRUE until someone has verified the CURRENT Amazon Vendor terms/account
 * agreement. Any legal/TOS claim must be flagged for verification rather than
 * presented as fact.
 */
export const AMAZON_TOS_VERIFICATION_REQUIRED = true;

export const AMAZON_TOS_VERIFICATION_NOTE =
  'Verification required: this build has NOT checked the current Amazon Vendor terms / account agreement. Any statement about programme eligibility, submission requirements or legal terms must be verified against the live terms before it is relied on or shown to a brand.';

export const AMAZON_NO_APPROVAL_CLAIM =
  'Mercenta does not claim Amazon approval, endorsement or a partnership, and does not control Amazon\'s decisions.';

/** Combined verdict for generated copy: channel-naming gate + programme claims. */
export interface AmazonWordingLintResult extends WordingLintResult {
  /** True when BOTH gates pass. */
  fullySafe: boolean;
  channelHits: WordingLintResult['hits'];
  programmeHits: { pattern: string; reason: string; index: number }[];
  verificationRequired: boolean;
  verificationNote: string;
}

export function lintAmazonWording(text: string): AmazonWordingLintResult {
  const channel = lintOutwardWording(text);
  const programmeHits: AmazonWordingLintResult['programmeHits'] = [];
  for (const { pattern, reason } of AMAZON_WORDING_RULES) {
    pattern.lastIndex = 0;
    const m = pattern.exec(text);
    if (m) programmeHits.push({ pattern: pattern.source, reason, index: m.index });
  }
  return {
    safe: channel.safe && programmeHits.length === 0,
    fullySafe: channel.safe && programmeHits.length === 0,
    hits: channel.hits,
    channelHits: channel.hits,
    programmeHits,
    verificationRequired: AMAZON_TOS_VERIFICATION_REQUIRED,
    verificationNote: AMAZON_TOS_VERIFICATION_NOTE,
  };
}

/**
 * Repair generated copy: remove the offending claim, and (for any Amazon-programme
 * reference) append the neutral statement + the verification note. Deterministic —
 * no network, no model call.
 */
export function sanitiseAmazonClaim(text: string): string {
  let out = text;
  for (const { pattern } of AMAZON_WORDING_RULES) {
    pattern.lastIndex = 0;
    out = out.replace(pattern, '[removed: unverified Amazon claim]');
  }
  if (/amazon/i.test(out)) {
    const withClaim = `${out} ${AMAZON_NO_APPROVAL_CLAIM}`;
    return `${withClaim} ${AMAZON_TOS_VERIFICATION_NOTE}`;
  }
  return out;
}

/** The honest, brand-safe phrasing for the estimate disclaimer. */
export const ESTIMATE_DISCLAIMER =
  'Estimate only. These figures are modelled projections, not measured Amazon sales data or a promise of performance. Mercenta does not claim Amazon approval, endorsement or partnership, and does not control Amazon\'s decisions.';