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
 * reads from here, so the eight pages cannot drift apart again. The red-line
 * DATA in §11 is what `scripts/validate-public-claims.mjs` compiles into a build
 * gate — PENDING: that gate is landed in batch B8, so until it exists this list
 * is the contract and the copy below is the only thing holding it. (The header
 * previously stated the gate as if it were already running. It was not, and a
 * gate that is claimed but absent is worse than one that is honestly pending.)
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
/**
 * §PUBLIC MESSAGING B3 (2026-09-28) — the ten approved categories are declared
 * ONCE in `src/types.ts` and READ here, never retyped, so the FAQ answer and the
 * product rules cannot disagree about which categories exist.
 */
import { APPROVED_CATEGORIES } from '@/types';

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

/**
 * §B3 — the invitation every inner public page closes with. It lives here rather
 * than being retyped on four pages, so the four cannot drift apart or invent a
 * promise the homepage does not make.
 */
export const PUBLIC_INVITATION_HEADING = 'Find out whether the UK wants your products';
export const PUBLIC_INVITATION_BODY =
  'The market assessment on this site is free, and the read is worth having whether or not you take it any ' +
  'further.';

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

/* ── 8. How it works — the journey, told as outcomes ───────────────────────
 * A genuine sequence, and therefore the ONE thing on these pages that may carry
 * numbers: a step order is information, not decoration. It says what happens to
 * a brand's product and to the brand's decisions — never how the operation is
 * built, who it is bought from, or what the commercial terms are.
 */

export interface PublicStep {
  title: string;
  body: string;
}

export const PUBLIC_HOW_IT_WORKS: readonly PublicStep[] = [
  {
    title: 'Tell us what you make',
    body:
      'Send the product, the brand and where it is made. You get an honest read on whether the UK market ' +
      'wants it — before either of us spends anything.',
  },
  {
    title: 'We agree what stays yours',
    body:
      'The product, the brand, the pricing and every decision about them stay with you. What you hand over ' +
      'is the retail side: the orders, the movement, the paperwork and the payments.',
  },
  {
    title: 'We make it saleable here',
    body:
      'Everything the UK asks of a seller before it will buy — a presence, the paperwork, somewhere for the ' +
      'stock to live and a way onto the shelf — stops being a list you work through.',
  },
  {
    title: 'Orders start arriving',
    body:
      'They land in your workspace with what they are worth and what is waiting on you. You approve, amend ' +
      'or decline, and that decision is what we act on.',
  },
  {
    title: 'You watch it land, and get paid',
    body:
      'Goods, documents and money move in one place you can see, and settlements arrive on the terms you ' +
      'agreed — every deduction explained against the order behind it.',
  },
] as const;

/* ── 9. UK market access — the barriers, told as outcomes ─────────────────
 * The same four barriers the two audiences describe in §2, stated once here as
 * the list a brand measures itself against. Naming the barrier is the point;
 * explaining how it is cleared is the red line, so none of that mechanism
 * appears — no regulated position, no authority, no intermediary, no supplier.
 */

export interface PublicBarrier {
  title: string;
  body: string;
}

export const PUBLIC_BARRIERS: readonly PublicBarrier[] = [
  {
    title: 'A presence in the UK',
    body:
      'The UK expects a seller it can hold to. You get one without opening an office, a warehouse or a ' +
      'payroll here.',
  },
  {
    title: 'The paperwork, kept current',
    body:
      'The registrations, certificates and renewals that stand between a product and a shelf stay up to ' +
      'date — and stay off your desk.',
  },
  {
    title: 'Somewhere for the stock to live',
    body:
      'Your stock is received and moved on from here, so you are not paying for space in a country you do ' +
      'not operate in.',
  },
  {
    title: 'A way onto the shelf',
    body:
      'The retail side of the market — the buyers, the terms, the delivery expectations — is what we do ' +
      'every day, so it is not something you learn from scratch.',
  },
] as const;

/* ── 10. For brands — the split, and the answers ──────────────────────────
 * `PUBLIC_BRAND_SPLIT` is the honest answer to "who does what": one row per
 * thing a brand keeps, paired with what we carry instead. It is the ONLY
 * canonical statement of that division, so no page can contradict another.
 * `PUBLIC_FAQ` derives every answer it can from the sections above, so an
 * answer cannot drift from the page it came from.
 */

export interface PublicSplit {
  /** What the brand keeps. */
  keep: string;
  /** What Mercenta carries instead of them. */
  carried: string;
}

export const PUBLIC_BRAND_SPLIT: readonly PublicSplit[] = [
  { keep: 'Your product and your brand', carried: 'Getting it onto a UK shelf, moved, landed and delivered' },
  { keep: 'Your pricing', carried: 'The paperwork that has to stay current for it to keep selling' },
  { keep: 'Your approvals', carried: 'The orders, the buyers and the delivery expectations behind them' },
  { keep: 'Your decisions', carried: 'The invoices, the deductions and the chasing behind the money' },
] as const;

export interface PublicFaqItem {
  q: string;
  a: string;
}

/** Built from §6, so the answer can never disagree with the markets list. */
export const PUBLIC_MARKETS_SENTENCE =
  `Brands reach us from ${PUBLIC_MARKETS.slice(0, -1).join(', ')} and ` +
  `${PUBLIC_MARKETS[PUBLIC_MARKETS.length - 1]}.`;

/**
 * THE PUBLIC ANSWERS. Every answer that can be derived IS derived, so a change
 * to the promise, the outcomes, the markets or the statutory record flows to the
 * FAQ from one edit. The answers that are written out carry no mechanism, no
 * commercial arithmetic, no supplier and no third party's vocabulary.
 */
export const PUBLIC_FAQ: readonly PublicFaqItem[] = [
  { q: 'What is Mercenta?', a: PUBLIC_PROMISE },
  {
    q: 'Who is this for?',
    a:
      'Two kinds of brand. One is outside the UK and wants in; the other is already selling here and wants ' +
      'the retail side carried. Both want the same thing — the product stays theirs and the operation stops ' +
      'being theirs.',
  },
  {
    q: 'What stops being my job?',
    a: `Four things. ${PUBLIC_OUTCOMES.map((o) => o.title).join(' · ')}.`,
  },
  {
    q: 'What stays mine?',
    a:
      'The product, the brand, the pricing and every decision about them. You approve, amend or decline — ' +
      'nothing happens to your products or your money that you have not agreed to.',
  },
  { q: 'Where do your brands come from?', a: PUBLIC_MARKETS_SENTENCE },
  {
    q: 'Which product categories do you work in?',
    a: `We work in ten product categories: ${APPROVED_CATEGORIES.join(', ')}.`,
  },
  {
    q: 'What does it cost?',
    a:
      'What you pay is agreed privately with you before anything starts, and it is never published here. It ' +
      'does not change without your agreement.',
  },
  {
    q: 'How does a brand get started?',
    a:
      'Start with the market assessment on this site. If that read is worth acting on, we take you through ' +
      'the rest — your details, your products and the documents the UK will ask for.',
  },
  {
    q: 'What happens when something goes wrong?',
    a:
      'You hear it from us. If a figure is an estimate we say so; if a consignment is late or a document is ' +
      'rejected, you are told what happened and what is being done about it.',
  },
  {
    q: 'Where is Mercenta based?',
    a: `${PUBLIC_COMPANY_NAME} is a UK company. ${PUBLIC_JURISDICTION_LINE}.`,
  },
] as const;

/* ── 11. THE RED LINES — what a public surface may never say ──────────────
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
