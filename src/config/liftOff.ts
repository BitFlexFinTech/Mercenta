/**
 * §LIFT OFF — THE LAUNCH PROGRAMME (the ONE owner of everything the programme says).
 *
 * WHAT THIS IS
 * ------------
 * "Lift Off | By Mercenta" is Mercenta's own-named launch programme. It mirrors the
 * rules of the retail channel's new-product launch programme EXACTLY — Mercenta, as
 * the proxy that holds and operates the channel account, runs the whole thing for a
 * brand, and that is what the brand pays for.
 *
 * It is a DIFFERENT customer to the plain "manage my UK distribution" service the
 * established brands take. Both paths exist; this file owns only the programme.
 *
 * RULES COME FROM A REAL SOURCE, NEVER INVENTED (see `LIFT_OFF_RULES_SOURCES`).
 * The programme's mechanics below are a faithful summary of the channel's published
 * launch programme. The channel-specific NUMERIC thresholds are NOT hardcoded as
 * ours: `LIFT_OFF_TERMS_VERIFIED` is `false` until they are checked against the live
 * programme terms, exactly as `src/config/amazonRelationshipGovernance.ts` fails
 * closed. Every surface that renders a rule reads it from HERE.
 *
 * CHANNEL-NEUTRAL BY DEFAULT
 * --------------------------
 * This file is scanned by `scripts/lint-wording.mjs`, so it names no retail channel:
 * it says "the retail channel"/"the channel". Outward-facing public copy states the
 * OUTCOME only (per `src/config/positioning.ts` §1); the mechanism (the rules) is
 * shown to a brand INSIDE its logged-in workspace, never published.
 */

/* ── 1. Identity (declared ONCE) ─────────────────────────────────────────── */

/** The programme's own name — a named programme, not "Mercenta X". */
export const LIFT_OFF_NAME = 'Lift Off';

/** The endorsement line under the name. */
export const LIFT_OFF_ENDORSEMENT = 'By Mercenta';

/** How the name + endorsement are shown together. */
export const LIFT_OFF_WORDMARK = `${LIFT_OFF_NAME} | ${LIFT_OFF_ENDORSEMENT}`;

/** The public route the programme page lives at. */
export const LIFT_OFF_PATH = '/lift-off';

/** The public button label that opens the programme page. */
export const LIFT_OFF_CTA = 'See the Lift Off programme';

/** Stable data-testid anchors (shared by the e2e specs and the validator). */
export const LIFT_OFF_TESTIDS = {
  brandSection: 'lift-off-brand-section',
  brandEligibility: 'lift-off-eligibility',
  publicPage: 'lift-off-page',
  publicCta: 'lift-off-public-cta',
} as const;

/* ── 2. Where this stops being the distribution service ──────────────────── */

/** One line: what Lift Off is, and who it is for. Plain, outcome-first. */
export const LIFT_OFF_SUMMARY =
  'Lift Off launches a product onto the UK retail channel with a large opening order, ' +
  'so a new brand is not left waiting for orders that never come. Mercenta runs the ' +
  'whole programme for the brand, start to finish.';

/** The two customers, stated so the contrast is explicit and never blurred. */
export const LIFT_OFF_VS_DISTRIBUTION = {
  programme: {
    label: LIFT_OFF_NAME,
    for: 'A brand that is new to the retail channel.',
    gets: 'Mercenta runs the launch: the opening order, the sell-through, the returns and the advertising support.',
  },
  distribution: {
    label: 'Managed UK distribution',
    for: 'An established brand already selling, that wants the retail side carried for it.',
    gets: 'Mercenta manages the existing UK distribution through its infrastructure. No launch programme.',
  },
} as const;

/* ── 3. The rules (mirrored from the channel's published programme) ──────── */

export interface LiftOffTerm {
  id: string;
  /** Short label. */
  label: string;
  /** What it means, plainly. */
  detail: string;
  /**
   * How this term is known to us. `published_programme` = summarised from the
   * channel's published programme material; `mercenta_process` = how Mercenta
   * operates it on the brand's behalf; `requires_verification` = a channel-specific
   * detail that must be checked against the live terms before it is relied on.
   */
  basis: 'published_programme' | 'mercenta_process' | 'requires_verification';
}

export const LIFT_OFF_TERMS: readonly LiftOffTerm[] = [
  {
    id: 'opening_order',
    label: 'A large opening order (the launch buy)',
    detail:
      'Instead of waiting for the channel to order a few units, the brand sets a large ' +
      'opening quantity for the launch. The channel raises that order up front so the ' +
      'product starts with real stock behind it.',
    basis: 'published_programme',
  },
  {
    id: 'order_is_asked_for',
    label: 'The order is asked for, not waited for',
    detail:
      'Normally the channel orders based on past sales, which a brand-new product has none of. ' +
      'The programme lets the order be requested directly, so a launch is not stuck at zero.',
    basis: 'published_programme',
  },
  {
    id: 'return_rights',
    label: 'Return rights on unsold stock',
    detail:
      'For stock that has not sold by the end of the sell-through window, the brand holds ' +
      'return rights \u2014 the unsold units come back to the brand rather than being written off.',
    basis: 'published_programme',
  },
  {
    id: 'advertising_support',
    label: 'Advertising support at launch',
    detail:
      'The programme pairs the opening order with advertising support on the launched product, ' +
      'so the product gets seen during the window that matters most.',
    basis: 'published_programme',
  },
  {
    id: 'sell_through_window',
    label: 'A ten-week sell-through window',
    detail:
      'The clock starts the day the product is in stock and buyable. The opening quantity has ' +
      'ten weeks to sell through before unsold stock is eligible to return.',
    basis: 'published_programme',
  },
  {
    id: 'channel_decides',
    label: 'The channel decides, not Mercenta',
    detail:
      'The programme is by invitation and the channel controls eligibility and final approval. ' +
      'Mercenta prepares and runs the submission, but Mercenta does not decide the channel\u2019s ' +
      'outcome and never promises a place.',
    basis: 'published_programme',
  },
  {
    id: 'mercenta_runs_it',
    label: 'Mercenta runs the whole programme',
    detail:
      'Mercenta holds the channel account, prepares the launch, submits it, watches the sell-through ' +
      'window, handles any returns, and reports it back to the brand in one workspace.',
    basis: 'mercenta_process',
  },
  {
    id: 'numeric_thresholds',
    label: 'The exact numbers are checked, not guessed',
    detail:
      'The programme carries channel-specific numeric limits (a ceiling on the opening-order value, ' +
      'a floor on the unit cost, a time-in-stock limit and a bulk restriction). Mercenta checks these ' +
      'against the live terms for each launch rather than publishing a guess as a rule.',
    basis: 'requires_verification',
  },
] as const;

/**
 * Where the rules come from — the named, published sources the summary above rests on
 * (the `data-must-be-real-sources` rule). Read by `scripts/validate-lift-off.mjs`.
 */
export const LIFT_OFF_RULES_SOURCES: readonly string[] = [
  'Jungle Scout — "Born to Run Program: Benefits & Requirements"',
  'Tinuiti — "What is the Born To Run Program?"',
  'Pattern — "What Is the Born to Run Program?"',
  'ChannelSight — "How to Launch New Products with Born to Run"',
  'Amazowl SOP — "Definition: Born to Run Program"',
] as const;

/**
 * TRUE only once the channel-specific rules have been verified against the live
 * programme terms. FALSE today, so every surface says so rather than implying a
 * verified rule. (Same fail-closed discipline as `AMAZON_TOS_VERIFICATION_REQUIRED`.)
 */
export const LIFT_OFF_TERMS_VERIFIED = false;

/** The honest note shown wherever the programme terms are displayed. */
export const LIFT_OFF_VERIFICATION_NOTE =
  'These terms summarise the retail channel\u2019s published launch programme. Mercenta mirrors the ' +
  'channel\u2019s rules and verifies the channel-specific numbers against the live terms for each launch; ' +
  'Mercenta does not control the channel\u2019s decisions and promises no place in the programme.';


/* ── 4. Eligibility — what Mercenta checks ───────────────────────────────── */

export type LiftOffEligibilityId =
  | 'approved_category'
  | 'catalogue_product'
  | 'compliance_cleared'
  | 'commercial_model_set';

export interface LiftOffEligibilityRule {
  id: LiftOffEligibilityId;
  label: string;
  /** What the check means, in plain words. */
  detail: string;
}

/**
 * The criteria Mercenta CAN assess from a brand's own real records. The channel's
 * numeric thresholds are deliberately NOT here — they are verified per launch
 * (`numeric_thresholds`) rather than computed from invented numbers.
 */
export const LIFT_OFF_ELIGIBILITY_RULES: readonly LiftOffEligibilityRule[] = [
  {
    id: 'approved_category',
    label: 'Your product is in an approved category',
    detail: 'Lift Off only runs in the categories Mercenta is approved to operate in.',
  },
  {
    id: 'catalogue_product',
    label: 'You have at least one product in your catalogue',
    detail: 'A launch needs a product. Add it to your catalogue to start.',
  },
  {
    id: 'compliance_cleared',
    label: 'Your compliance documents are cleared',
    detail: 'The channel will not list a product whose required documents are outstanding.',
  },
  {
    id: 'commercial_model_set',
    label: 'Your commercial relationship is agreed',
    detail: 'How Mercenta and you share the money must be agreed before a launch runs.',
  },
] as const;

/* ── 5. Interest status vocabulary (fail-closed) ─────────────────────────── */

export type LiftOffInterestStatus =
  | 'not_registered'
  | 'registered'
  | 'with_mercenta'
  | 'submitted_to_channel'
  | 'live';

export const LIFT_OFF_INTEREST_LABELS: Record<LiftOffInterestStatus, string> = {
  not_registered: 'Not registered',
  registered: 'Registered your interest',
  with_mercenta: 'Being prepared by Mercenta',
  submitted_to_channel: 'Submitted to the channel',
  live: 'Live',
};

/** The declared statuses, so nothing can invent a sixth. */
export const LIFT_OFF_INTEREST_STATUSES: readonly LiftOffInterestStatus[] = [
  'not_registered',
  'registered',
  'with_mercenta',
  'submitted_to_channel',
  'live',
] as const;

/* ── 6. Public copy (OUTCOME ONLY — never the mechanism) ─────────────────── */

export const LIFT_OFF_PUBLIC_HEADLINE = 'Launch your product, not a waiting game';

export const LIFT_OFF_PUBLIC_SUMMARY =
  'Most new products stall on the UK retail channel because the opening order is too small to be ' +
  'seen. Lift Off is our launch programme for brands that are new to the channel: we run the launch ' +
  'for you, with a large opening order behind it, and we carry the whole thing end to end.';

/** Outcome-only points: what changes for the brand, never how it is done. */
export const LIFT_OFF_PUBLIC_POINTS: readonly { title: string; body: string }[] = [
  {
    title: 'Your product starts with real stock behind it',
    body: 'The launch does not begin with a trickle of units \u2014 it begins with an opening order worth launching.',
  },
  {
    title: 'A new product is protected, not stranded',
    body: 'Lift Off is built for a brand-new product, so a launch that does not move does not leave you holding it.',
  },
  {
    title: 'Mercenta runs all of it',
    body: 'You keep the product, the brand and every decision. We carry the launch, the paperwork and the channel side.',
  },
  {
    title: 'One workspace, watched end to end',
    body: 'You see the launch, the stock and the outcome move in one place \u2014 not in a report that lands too late.',
  },
] as const;

