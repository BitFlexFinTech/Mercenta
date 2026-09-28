/**
 * §PUBLIC MESSAGING — THE ONE OWNER OF WHAT MERCENTA SAYS IN PUBLIC.
 *
 * WHY THIS EXISTS
 * ---------------
 * The eight public pages each said something different, and all of them were
 * written from the platform's INTERNAL specification outward: they described how
 * the business is built (which relationships we hold, how the rules are enforced,
 * what the commercial structure is) instead of what a brand gets. That is both a
 * positioning failure and a competitive one — a public page that explains our
 * operating model hands it to anyone who reads it.
 *
 * This module is the single owner of the public message. Every public surface
 * reads from here, so the eight pages cannot drift apart again, and
 * `scripts/validate-public-claims.mjs` fails the build if the internal detail
 * returns.
 *
 * THE TWO RULES THIS FILE ENCODES
 * -------------------------------
 *  1. SAY THE OUTCOME, NEVER THE MECHANISM. A brand is told what stops being
 *     their problem and what they get. They are never told how the business is
 *     structured, who we hold accounts with, how the rules are enforced, or what
 *     the commercial terms are.
 *  2. TWO AUDIENCES, BOTH FIRST-CLASS. Brands outside the UK entering the market,
 *     and brands already selling here who want the retail side carried for them.
 *
 * IDENTITY IS NOT DUPLICATED HERE: the company facts come from
 * `src/config/company.ts` (the statutory owner) and the brand strings from
 * `src/config/brand.ts`. This file derives the public one-liners from those, so a
 * change to the registered office or the legal name flows to every public surface
 * from ONE edit.
 */
import { BRAND_LEGAL_NAME, BRAND_DOMAIN } from './brand';
import { COMPANY_REGISTRATION } from './company';

/* ── 1. The category and the promise ─────────────────────────────────────── */

/** What we call ourselves. Not an agency, not a distributor, not a broker. */
export const PUBLIC_CATEGORY = 'Retail channel partner';

/**
 * THE promise, in one sentence. Outcome only: it says what stops being the
 * brand's job, not how we do it.
 */
export const PUBLIC_PROMISE =
  'Mercenta takes the UK retail side of your business off your desk — from the production line to the shelf — ' +
  'and gives you one place to watch it happen.';

/** The hero sub-line: who it is for and what they keep. */
export const PUBLIC_HERO_SUBHEADING =
  'Mercenta is the retail channel partner for brands that want the UK handled. You keep the product, the brand ' +
  'and every decision. We carry the orders, the freight, the paperwork and the payments.';

/* ── 2. The two audiences (both first-class) ─────────────────────────────── */

export interface PublicAudience {
  id: 'outside-uk' | 'already-uk';
  heading: string;
  body: string;
}

export const PUBLIC_AUDIENCES: readonly PublicAudience[] = [
  {
    id: 'outside-uk',
    heading: 'You are outside the UK',
    body:
      'You have built something that travels. What stops you is the list the UK asks of a seller before it will ' +
      'buy: a presence here, the right paperwork, somewhere for the stock to live, and a way onto the shelf. ' +
      'We take that whole list off you.',
  },
  {
    id: 'already-uk',
    heading: 'You are already selling in the UK',
    body:
      'The orders are coming, and the retail side has quietly turned into a second job — the one nobody has time ' +
      'for. Hand it over, and put the week back into product, brand and growth.',
  },
] as const;

/* ── 3. The four outcomes ("what changes") ───────────────────────────────── */

export interface PublicOutcome {
  id: 'no-logistics' | 'no-compliance-admin' | 'no-chasing-money' | 'no-guessing';
  title: string;
  body: string;
}

export const PUBLIC_OUTCOMES: readonly PublicOutcome[] = [
  {
    id: 'no-logistics',
    title: 'You stop being a logistics department',
    body:
      'Getting stock from your line onto a UK shelf — moved, landed, cleared and delivered — stops being something ' +
      'you coordinate.',
  },
  {
    id: 'no-compliance-admin',
    title: 'You stop doing compliance admin',
    body:
      'The requirements, the renewals and the paperwork stay current, so nothing quietly lapses and puts a hold on ' +
      'an order.',
  },
  {
    id: 'no-chasing-money',
    title: 'You stop chasing the money',
    body:
      'Settlements arrive on the terms you agreed, and every deduction is explained against the order behind it.',
  },
  {
    id: 'no-guessing',
    title: 'You stop guessing where things are',
    body:
      'Orders, stock in transit, documents and payments sit in one workspace, updated as they move — not in a ' +
      'report that lands after the decision was already made.',
  },
] as const;

/* ── 4. The software story, told as experience ───────────────────────────
 * The platform is the differentiator, but we sell what it FEELS like to work
 * with us — never what it is built from. The claims below are the only public
 * statements about the software: they describe what a brand sees and does.
 */

export const PUBLIC_SOFTWARE_EXPERIENCE =
  'One workspace instead of twelve email threads. You will see a shipment move, a document clear and a payment ' +
  'land before you think to ask — no spreadsheets, no chase calls, no month-end surprise.';

/* ── 5. Why brands stay ──────────────────────────────────────────────────── */

export interface PublicReason {
  title: string;
  body: string;
}

export const PUBLIC_REASONS_TO_STAY: readonly PublicReason[] = [
  {
    title: 'One partner, not five suppliers',
    body:
      'A forwarder, a customs agent, a warehouse, a compliance adviser and a retail contact is five relationships, ' +
      'five invoices and five people to chase. This is one.',
  },
  {
    title: 'Your brand stays yours',
    body:
      'You approve, amend or decline. Nothing happens to your products that you did not agree to, and your brand ' +
      'and your pricing remain your decisions.',
  },
  {
    title: 'Software you will actually use',
    body: PUBLIC_SOFTWARE_EXPERIENCE,
  },
  {
    title: 'We tell you the truth first',
    body:
      'If a figure is an estimate, we say so. If something has gone wrong, you hear it from us before you have to ' +
      'go looking for it.',
  },
] as const;

/* ── 6. The markets we take brands from ──────────────────────────────────── */

/** Every source market we work with. Named so a brand can find itself here. */
export const PUBLIC_MARKETS: readonly string[] = [
  'Europe',
  'North America',
  'Latin America',
  'Africa',
  'the Middle East',
  'Asia',
  'Oceania',
] as const;

/* ── 7. The public company lines (DERIVED — never retyped) ────────────────
 * These are the ONLY company facts that belong on a public surface. Real
 * companies publish their legal identity. They do not publish incorporation
 * dates, company status or SIC codes, and neither do we.
 */

export const PUBLIC_COMPANY_NAME = BRAND_LEGAL_NAME;
export const PUBLIC_COMPANY_NUMBER = COMPANY_REGISTRATION.companyNumber;

/** The registered office, read from the register. `null` until it has been read. */
export const PUBLIC_REGISTERED_OFFICE = COMPANY_REGISTRATION.registrar.registeredOfficeAddress;

/** The jurisdiction line, e.g. "Registered in England & Wales". */
export const PUBLIC_JURISDICTION_LINE = `Registered in ${COMPANY_REGISTRATION.jurisdiction}`;

/** Public contact addresses, derived from the brand domain (never hardcoded). */
export const PUBLIC_CONTACT_EMAIL = `hello@${BRAND_DOMAIN}`;
export const PUBLIC_PRIVACY_EMAIL = `privacy@${BRAND_DOMAIN}`;
export const PUBLIC_LEGAL_EMAIL = `legal@${BRAND_DOMAIN}`;

/**
 * THE FOOTER'S LEGAL BLOCK — one string, built from the derived facts above, so
 * the footer, the privacy policy and the terms can never disagree about the
 * company's identity. The registered-office segment is omitted (never invented)
 * until the register has been read.
 */
export function publicCompanyLine(): string {
  const parts = [
    PUBLIC_COMPANY_NAME,
    `${PUBLIC_JURISDICTION_LINE.replace(/^Registered in /, 'Registered in ')}${
      PUBLIC_COMPANY_NUMBER ? `, company number ${PUBLIC_COMPANY_NUMBER}` : ''
    }`,
  ];
  if (PUBLIC_REGISTERED_OFFICE) parts.push(`Registered office: ${PUBLIC_REGISTERED_OFFICE}`);
  return parts.join(' · ');
}

/* ── 8. THE RED LINES — what a public surface may never say ───────────────
 *
 * This list is DATA, not prose, because `scripts/validate-public-claims.mjs`
 * compiles it and fails the build when one of these returns to a public surface.
 * Each entry records WHY, so a future session cannot quietly delete an entry it
 * finds inconvenient — the gate also asserts the list never shrinks below its
 * declared size.
 *
 * The eight families:
 *   1  how the business is structured (which relationships we hold)
 *   2  the regulated position and its mechanics
 *   3  the companies we buy services from
 *   4  the commercial model and its arithmetic
 *   5  how the platform is built
 *   6  another company's rules and internal vocabulary
 *   7  claims we cannot evidence
 *   8  the retail channel's name
 */

export interface PublicClaimRedLine {
  id: string;
  label: string;
  why: string;
  /** Case-insensitive regex sources, matched against PUBLIC surfaces only. */
  patterns: readonly string[];
}

export const PUBLIC_CLAIM_RED_LINES: readonly PublicClaimRedLine[] = [
  {
    id: 'structural-ownership',
    label: 'How the business is structured',
    why: 'Naming the relationships Mercenta holds tells a competitor exactly which position to occupy.',
    patterns: ['\\bwe (hold|operate|own) the\\b', '\\bthe order is addressed\\b', '\\boperates? the [a-z ]*account\\b'],
  },
  {
    id: 'regulated-position',
    label: 'The regulated position and its mechanics',
    why: 'The regulated position is the barrier we remove; describing how it is held hands over the model.',
    patterns: ['\\bimporter of record\\b', '\\bEORI\\b', '\\bHMRC\\b', '\\bcustoms clearance\\b', '\\bduty management\\b'],
  },
  {
    id: 'service-suppliers',
    label: 'The companies we buy services from',
    why: 'Supplier names are commercially sensitive and imply relationships we do not claim in public.',
    patterns: ['\\bDHL\\b', '\\bPalletline\\b', '\\bcarrier account'],
  },
  {
    id: 'commercial-structure',
    label: 'The commercial model and its arithmetic',
    why: 'Pricing structure is agreed privately with each brand and is never published.',
    patterns: ['\\bcommission\\b', '\\brevenue share\\b', '\\bgross spread\\b', '\\bnet margin\\b', '\\bsuccess.fee\\b', '\\bmanagement fee\\b', '\\bwe buy your stock\\b'],
  },
  {
    id: 'platform-internals',
    label: 'How the platform is built',
    why: 'Enforcement mechanisms are the product; describing them publicly is the intellectual property leak.',
    patterns: ['\\bhard gate\\b', '\\bworkflow state\\b', '\\border.gated\\b', '\\bstate machine\\b', '\\bpayout rail\\b', '\\bendpoint\\b', '\\bwebhook\\b', '\\bdatabase\\b', '\\bAPI\\b'],
  },
  {
    id: 'third-party-rules',
    label: "Another company's rules and vocabulary",
    why: 'Publishing another company’s operating rules as ours implies a relationship we do not claim.',
    patterns: ['\\backnowledg', '\\b24[ -]hour\\b', '\\bfulfilment centre\\b', '\\bASN\\b', '\\bASIN\\b', '\\bBrand Registry\\b', '\\bA\\+ Content\\b', '\\bbuy box\\b', '\\bSubscribe & Save\\b', '\\bSeller Central\\b', '\\bVendor Central\\b'],
  },
  {
    id: 'unevidenced-claims',
    label: 'Claims we cannot evidence',
    why: 'An unevidenced claim is a false statement the moment it is published.',
    patterns: ['\\bguarantee', '\\btrusted by\\b', '\\bindustry.leading\\b', '\\bworld.class\\b', '\\bbest in class\\b', '\\bpartnership\\b', '\\bendorsed\\b', '\\bapproved by\\b', '\\b\\d{2,}\\s*\\+?\\s*(brands|clients|customers)\\b'],
  },
  {
    id: 'channel-name',
    label: "The retail channel's name",
    why: 'Already enforced by `validate:wording`; restated here so this gate is complete on its own.',
    patterns: ['\\bAmazon\\b'],
  },
] as const;

/** The number of declared families. The gate refuses a list smaller than this. */
export const PUBLIC_CLAIM_RED_LINE_FAMILIES = 8;
