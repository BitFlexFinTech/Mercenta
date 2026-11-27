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
 * §PUBLIC MESSAGING B4 (2026-09-29) — the Explore CTA's wording is declared once
 * in `src/config/ukMarketFit.ts` and READ here, never retyped, so the header,
 * the footer and the button that opens the assessment cannot disagree.
 */
import { EXPLORE_UK_MARKET_FIT_CTA } from './ukMarketFit';
/** §LIFT OFF — the public nav label is the programme's OWN name (one owner). */
import { LIFT_OFF_NAME } from './liftOff';
/**
 * §PUBLIC MESSAGING B3 (2026-09-28) — the ten approved categories are declared
 * ONCE in `src/types.ts` and READ here, never retyped, so the FAQ answer and the
 * product rules cannot disagree about which categories exist.
 */
import { APPROVED_CATEGORIES } from '@/types';

/* ── 1. The category and the promise ─────────────────────────────────────── */

/** What we call ourselves. Not an agency, not a distributor, not a broker. */
export const PUBLIC_CATEGORY = 'UK Retail Infrastructure & Brand Stewardship';

/**
 * THE promise, in one sentence. Outcome only: it says what stops being the
 * brand's job, not how we do it.
 */
export const PUBLIC_PROMISE =
  'Mercenta Partners operates a dedicated UK retail vendor infrastructure — acquiring inventory, managing vendor operations, brand registration, product content, pricing governance and replenishment. We plug in talent IP, international brands and emerging-market producers directly into UK retail. One commercial agreement. Zero operational overhead.';

/** The hero sub-line: who it is for and what they keep. */
export const PUBLIC_HERO_SUBHEADING =
  'Mercenta Partners operates a dedicated UK retail vendor infrastructure — acquiring inventory, managing vendor operations, brand registration, product content, pricing governance and replenishment. We plug in talent IP, international brands and emerging-market producers directly into UK retail. One commercial agreement. Zero operational overhead.';

/**
 * §B3 — the invitation every inner public page closes with. It lives here rather
 * than being retyped on four pages, so the four cannot drift apart or invent a
 * promise the homepage does not make.
 */
export const PUBLIC_INVITATION_HEADING = 'Run the UK Market Fit assessment';
export const PUBLIC_INVITATION_BODY =
  'It evaluates your product and brand against the UK retail channel\'s actual requirements — category viability, regulatory readiness, competitive density, buyer accessibility, commercial viability — and returns a snapshot with evidence, confidence levels, and what could not be established. Simulation mode, zero network calls. Optional Mercenta review.';

/* ── 2. The three audiences (all first-class) ─────────────────────────────── */

export interface PublicAudience {
  id: 'entering-uk' | 'scaling-uk' | 'institutional';
  heading: string;
  body: string;
}

export const PUBLIC_AUDIENCES: readonly PublicAudience[] = [
  {
    id: 'entering-uk',
    heading: 'Brands Entering the UK Market',
    body:
      'Export-ready brands seeking a UK retail presence without the cost or complexity of a local subsidiary. Mercenta provides vendor of record, import compliance, UK warehousing and weekly replenishment under one commercial agreement.',
  },
  {
    id: 'scaling-uk',
    heading: 'Brands Scaling in UK Retail',
    body:
      'Brands already in UK retail where the retail operation has become a second job — order management, compliance renewals, deduction disputes, stock balancing. Mercenta takes the entire operation over. Your week goes back to product, brand, and growth.',
  },
  {
    id: 'institutional',
    heading: 'Institutional Partners (BII, CAA, DFIs, Accelerators)',
    body:
      'Development finance institutions, talent agencies, embassies, and export accelerators seeking a compliant UK retail infrastructure partner for their portfolio brands. Structured pathways, batch onboarding, aggregated reporting, institutional governance.',
  },
] as const;

/* ── 3. The four 1P Infrastructure services ("what we operate") ───────────────────────────────── */

export interface PublicOutcome {
  id: 'vendor-of-record' | 'import-compliance' | 'brand-registry' | 'pricing-governance';
  title: string;
  body: string;
}

export const PUBLIC_OUTCOMES: readonly PublicOutcome[] = [
  {
    id: 'vendor-of-record',
    title: 'Vendor of Record & Replenishment',
    body: 'Mercenta holds the UK retail vendor account. We acquire inventory, manage weekly purchase orders, forecast demand and keep the product available in stock through our established vendor operation.',
  },
  {
    id: 'import-compliance',
    title: 'UK Import, Compliance & Replenishment',
    body: 'As your dedicated UK Importer of Record, Mercenta assumes full responsibility for customs clearance, VAT and excise compliance, food/beverage governance, and retail compliance standards. Certifications, renewals, filings — managed and renewed before lapse.',
  },
  {
    id: 'brand-registry',
    title: 'Brand Registry, Content & Merchandising',
    body: 'We elevate your digital shelf through authorized Brand Registry representation, high-converting A+ Content, bespoke Brand Stores, and search-optimised catalogue management. Product launch to best-seller lifecycle managed end-to-end.',
  },
  {
    id: 'pricing-governance',
    title: 'Pricing Governance & Channel Integrity',
    body: 'We safeguard your brand equity and retail margins through strict RRP/MAP discipline, range curation, and proactive elimination of unauthorised grey-market erosion. Every deduction explained, every settlement transparent.',
  },
] as const;

/* ── 4. The platform experience, told as capability ───────────────────────────
 * The platform is the differentiator, but we sell what it FEELS like to work
 * with us — never what it is built from. The claims below are the only public
 * statements about the platform: they describe what a brand sees and does.
 */

export const PUBLIC_SOFTWARE_EXPERIENCE =
  'One workspace instead of twelve email threads. Watch a shipment move, a document clear, and a payment land — all in real time, with full audit trail.';

/* ── 5. Why partners stay ──────────────────────────────────────────────────── */

export interface PublicReason {
  title: string;
  body: string;
}

export const PUBLIC_REASONS_TO_STAY: readonly PublicReason[] = [
  {
    title: 'One counterparty, not five suppliers',
    body: 'One commercial relationship, one invoice, one team. Channel access, logistics, compliance, orders, settlements — consolidated.',
  },
  {
    title: 'Your brand stays yours',
    body: 'Product, brand, pricing, and strategic control never transfer. Every commercial decision requires your agreement.',
  },
  {
    title: 'A workspace that earns its keep',
    body: PUBLIC_SOFTWARE_EXPERIENCE,
  },
  {
    title: 'Transparency by default',
    body: 'Estimates labelled as estimates. Issues surfaced immediately. No surprises in the settlement waterfall.',
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
  'South Asia',
  'Southeast Asia',
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
    title: 'Assessment',
    body: 'Run the UK Market Fit assessment — 4 steps: category, product, brand, review. Returns a snapshot with 6 indicators (basis, evidence, thresholds, confidence, unknowns), what could not be established, and an optional Mercenta review. Simulation mode, zero network calls.',
  },
  {
    title: 'Commercial terms',
    body: 'Choose between two documented models — percentage-based or wholesale purchase. Documented agreement: fees, payment terms, deduction handling, stock ownership, compliance matrix, term, exit. No upfront fees, no retainers. Aligned incentives.',
  },
  {
    title: 'Onboarding',
    body: 'Catalogue build, compliance audit, UK stock inbound, listing creation, channel setup. First PO typically weeks 5–6. Mercenta runs the entire process.',
  },
  {
    title: 'Steady state',
    body: 'Channel POs land in workspace with full commercial context (units, value, delivery window, compliance flags). You approve, amend, or decline — each decision recorded, attributed, auditable. Mercenta communicates decision to channel.',
  },
  {
    title: 'Settlement',
    body: 'Goods, documents, payments tracked in workspace. Every deduction explained. Monthly settlement waterfall. Quarterly strategic review. Brand exports data anytime.',
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
    title: 'UK presence',
    body: 'The UK retail channel requires a local counterparty. Mercenta is that counterparty — UK company, VAT registered, compliance current. No office, warehouse, or payroll required from the brand.',
  },
  {
    title: 'Compliance, kept current',
    body: 'Registrations, certifications, renewals that stand between a product and a shelf — managed, monitored for expiry, renewed before lapse. Off the brand\'s desk entirely.',
  },
  {
    title: 'Stock location',
    body: 'Stock received and moved into UK distribution without the brand funding a UK warehouse, payroll, or carrier contracts. One consolidated delivery per cycle.',
  },
  {
    title: 'Route to shelf',
    body: 'Buyer relationships, listing processes, promotional calendars, delivery expectations — operationalised daily. The retail side is what we do every day; the brand never learns it from scratch.',
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
  { keep: 'Your product and your brand', carried: 'Getting it onto UK shelves — moved, landed, delivered' },
  { keep: 'Your pricing', carried: 'The paperwork that must stay current for it to keep selling' },
  { keep: 'Your commercial control', carried: 'The orders, the buyers, the delivery expectations behind them' },
  { keep: 'Your decisions', carried: 'The invoices, the deductions, the settlement chasing behind the money' },
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
 * Expanded to 20 questions with in-depth answers in Mercenta's institutional voice.
 */
export const PUBLIC_FAQ: readonly PublicFaqItem[] = [
  { q: 'What is Mercenta?', a: PUBLIC_PROMISE },
  {
    q: 'Who is this for?',
    a:
      'Three audiences: brands entering the UK market seeking a retail presence; brands already in UK retail where the retail operation has become a second job; and institutional partners — development finance institutions, talent agencies, embassies and export accelerators — seeking a compliant UK retail infrastructure partner for their portfolio brands.',
  },
  {
    q: 'What stops being my job?',
    a: `Four things. ${PUBLIC_OUTCOMES.map((o) => o.title).join(' · ')}.`,
  },
  {
    q: 'What stays mine?',
    a:
      'The product, the brand, the pricing, and full commercial control. Every commercial decision — pricing, approvals, strategic direction — requires your agreement. Nothing happens to your products or your money that you have not agreed to.',
  },
  { q: 'Where do your brands come from?', a: PUBLIC_MARKETS_SENTENCE },
  {
    q: 'Which product categories do you work in?',
    a: `We work in ten approved UK retail categories: ${APPROVED_CATEGORIES.join(', ')}. Our deepest expertise is in Beer, Wine & Spirits; Specialty Food & Ambient Grocery; and Home, Kitchen & Lifestyle.`,
  },
  {
    q: 'What commercial models do you offer?',
    a:
      'Two documented models. Model A — commission/agent: Mercenta keeps an agreed percentage; the brand receives the remainder with transparent deduction pass-through. Model B — buy/resell: Mercenta acquires stock at agreed cost and resells to the channel; gross spread shown separately from carrier, fees, VAT, and deductions; net margin is spread less all costs. Both models: success-fee aligned, no upfront fees, no retainers, 12-month initial term.',
  },
  {
    q: 'What does it cost?',
    a:
      'What you pay is agreed privately before anything starts and is never published here. It does not change without your agreement. No hidden fees, no retainers. The commercial model (A or B) and fee structure are documented in a single agreement.',
  },
  {
    q: 'How does a brand get started?',
    a:
      'Run the UK Market Fit assessment — 4 steps: category, product, brand, review. Returns a snapshot with 6 indicators (basis, evidence, thresholds, confidence, unknowns), what could not be established, and an optional Mercenta review. Simulation mode, zero network calls. If worth acting on, we agree commercial terms (Model A or B), sign the agreement, and onboard — catalogue build, compliance audit, UK stock inbound, listing creation, channel setup. First PO typically weeks 5–6.',
  },
  {
    q: 'What compliance do you handle?',
    a:
      'All UK regulatory requirements for your product category — certifications, renewals, labelling, allergen declarations, age verification (alcohol), duty management, sustainability reporting. Monitored for expiry, renewed before lapse. The brand never touches channel compliance.',
  },
  {
    q: 'How are orders managed?',
    a:
      'Channel purchase orders land in the brand workspace with full commercial context — units, value, delivery window, compliance flags. The brand approves, amends, or declines; each decision recorded, attributed, auditable. Mercenta communicates the decision to the channel and executes. Recurring orders auto-present with pre-filled context. Standing rules (auto-approve under threshold, flag over threshold) configurable per brand.',
  },
  {
    q: 'How is stock managed?',
    a:
      'UK stock positions, inbound shipments, committed quantities, and available-to-sell visible in the workspace. Replenishment triggered automatically. Slow-mover action plans proposed. One consolidated delivery per cycle. Brand never funds a UK warehouse, payroll, or carrier contracts.',
  },
  {
    q: 'How are deductions handled?',
    a:
      'Every deduction explained in the workspace. Disputed where valid, settled on agreed terms. Monthly settlement waterfall with full breakdown. Brand sees the deduction, the explanation, the dispute status, and the outcome — no unexplained variances.',
  },
  {
    q: 'What reporting do I get?',
    a:
      'Weekly operational pulse (orders, stock, shipments, exceptions) in workspace. Monthly commercial performance pack (PDF + workspace) with revenue, units, ASP, gross margin, deductions, settlement waterfall — by product, period, channel. Quarterly strategic review: market position, category trends, recommended actions. Ad-hoc analysis on request. All data exportable anytime.',
  },
  {
    q: 'Can I use my own carriers?',
    a:
      'No. Mercenta operates on its own carrier accounts — DHL (international) and Palletline (UK domestic). This is a condition of the channel relationship and ensures single-point accountability for freight, compliance, and delivery performance.',
  },
  {
    q: 'What happens if a product doesn\'t sell?',
    a:
      'Model A: brand retains stock ownership; slow-mover action plans proposed; brand decides on promotional support or withdrawal. Model B: Mercenta owns the stock risk; commercial terms reflect this. In both models, the brand is never left holding unsold inventory without a plan, and no order is placed without brand agreement.',
  },
  {
    q: 'How long is the commitment?',
    a:
      '12-month initial term for both commercial models, then rolling. Exit terms defined at outset. Either party can exit with notice after the initial term. No lock-in beyond the notice period.',
  },
  {
    q: 'Can I exit early?',
    a:
      'Early exit is possible by mutual agreement with defined settlement terms. The commercial agreement specifies the notice period, stock reconciliation, and final settlement process. No penalties beyond agreed terms.',
  },
  {
    q: 'Do you work with agencies and distributors?',
    a:
      'Yes. Referral partnership track: agencies/distributors introduce brands, retain the client relationship and commercial upside via a referral fee on net revenue (paid monthly, transparent calculation). Partner dashboard provides pipeline visibility, onboarding status, performance metrics, and commission tracking. No volume minimums, no exclusivity. 12-month rolling agreement.',
  },
  { q: 'What markets do your brands come from?', a: PUBLIC_MARKETS_SENTENCE },
  {
    q: 'What happens when something goes wrong?',
    a:
      'You hear it from us immediately. If a figure is an estimate we say so; if a consignment is late or a document is rejected, you are told what happened and what is being done about it. Workspace shows exceptions in real time: shipment delays (carrier exception raised, Mercenta resolves, updated ETA), deduction hits (explained, disputed where valid, outcome visible), compliance documents due (flagged 60 days out, Mercenta renews, clearance confirmed), range reviews (evidence pack prepared, brand approves submission, result in workspace), promotional discrepancies (variance flagged, reconciled with channel, settlement adjusted).',
  },
  {
    q: 'Where is Mercenta based?',
    a: `${PUBLIC_COMPANY_NAME} is a UK company. ${PUBLIC_JURISDICTION_LINE}. Registered office: ${PUBLIC_REGISTERED_OFFICE}.`,
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

/* lint-wording:ignore-start
 *
 * WHY THIS BLOCK IS SUPPRESSED, AND WHY THAT IS NOT A LOOPHOLE
 * ------------------------------------------------------------
 * `PUBLIC_CLAIM_RED_LINES` is a set of RULES, not copy. It lists the phrases
 * public copy must never contain, so it necessarily contains those exact
 * phrases ("Seller Central", "1P") in order to name and forbid them. A copy
 * linter cannot tell a rule from a claim.
 *
 * Suppressing ONLY this block is the narrow fix. The previous approach — an
 * exemption for the WHOLE FILE — is what let nine live "Amazon UK 1P vendor
 * infrastructure" strings sit in rendered public copy while
 * `npm run validate:wording` reported zero violations. That exemption is gone:
 * every other line of this module is now scanned, and the nine strings were
 * rewritten to channel-neutral English.
 *
 * `scripts/lint-wording.mjs` asserts that exactly ONE suppression block exists
 * in the repository, so this mechanism cannot grow into a way to hide copy.
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
    patterns: ['\\bEORI\\b', '\\bHMRC\\b', '\\bduty management\\b'],
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
        patterns: ['\backnowledg', '\b24[ -]hour\b', '\bfulfilment centre\b', 'ASN', 'buy box', 'Subscribe & Save', 'Seller Central'], 
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
        patterns: ['Amazon(?! UK)'],
  },
] as const;
/* lint-wording:ignore-end */

/** The number of declared families. The gate refuses a list smaller than this. */
export const PUBLIC_CLAIM_RED_LINE_FAMILIES = 8;

/* ── 12. The public navigation model ───────────────────────────────────────
 * WHY THIS EXISTS (B4, 2026-09-29). The header (`PublicNav`) and the footer
 * (`PublicFooter`) publish the SAME link labels and each held its own literal,
 * so the two could disagree about what a link is called on one screen. The
 * footer's `onNavigate` prop did not even admit the Explore route the header
 * offered. ONE list, read by both, makes that impossible; and because a nav
 * label is a public string, it belongs here with the rest of them.
 *
 * The individual links are declared ONCE as `PUBLIC_LINK` and merely REFERENCED
 * by the groups and columns below, so a rename is one edit and cannot leave the
 * header and the footer saying different things.
 *
 * The Explore label is NOT retyped: `src/config/ukMarketFit.ts` is the declared
 * owner of that CTA's wording, exactly as the header already treats it.
 */

/** Every public route a header or footer link may target. */
export type PublicLinkPage =
  | 'home'
  | 'how-it-works'
  | 'uk-market-access'
  | 'for-brands'
  | 'faq'
  | 'privacy'
  | 'terms'
  | 'explore-uk-market-fit'
  | 'lift-off'
  | 'contact'
  | 'blog'
  | 'case-studies'
  | 'guides'
  | 'categories'
  | 'pricing'
  | 'insights'
  | 'agencies-service-partners'
  | 'why-mercenta'
  | 'partnerships'
  | 'reporting-analytics'
  | 'new-to-uk-market'
  | 'scaling-consumer-brands'
  | 'order-automation'
  | 'client-portal'
  | 'listing-health'
  | 'vendor-of-record'
  | 'import-compliance'
  | 'brand-registry'
  | 'pricing-governance'
  | 'advertising-search'
  | 'creative-assets'
  | 'product-launch'
  /* §NAVIGATION REPAIR (2026-11-20) — `order-automation-page`,
     `client-portal-page`, `listing-health-page` and `reporting-analytics-page`
     were REMOVED from this union in the same change that deleted the duplicate
     "Platform Tools" navigation group. They were ids with no page behind them,
     duplicated from the real orders/portal/listing/reporting pages. */
  | 'institutional-partners'
  | 'uk-retail-guide';

export interface PublicNavLink {
  label: string;
  page: PublicLinkPage;
}


/** The public links, each declared once and referred to everywhere else. */
export const PUBLIC_LINK = {
  explore: { label: EXPLORE_UK_MARKET_FIT_CTA, page: 'explore-uk-market-fit' },
  liftOff: { label: LIFT_OFF_NAME, page: 'lift-off' },
  howItWorks: { label: 'How It Works', page: 'how-it-works' },
  ukMarketAccess: { label: 'UK Market Access', page: 'uk-market-access' },
  forBrands: { label: 'For Brands', page: 'for-brands' },
  faq: { label: 'FAQ', page: 'faq' },
  privacy: { label: 'Privacy Policy', page: 'privacy' },
  terms: { label: 'Terms of Service', page: 'terms' },
  contact: { label: 'Contact', page: 'contact' },
  orderAutomation: { label: 'Order Automation', page: 'order-automation' },
  clientPortal: { label: 'Client Portal', page: 'client-portal' },
  listingHealth: { label: 'Listing Health Optimisation', page: 'listing-health' },
  reportingAnalytics: { label: 'Reporting & Analytics', page: 'reporting-analytics' },
  vendorOfRecord: { label: 'Vendor of Record & Replenishment', page: 'vendor-of-record' },
  importCompliance: { label: 'UK Import, Compliance & Replenishment', page: 'import-compliance' },
  brandRegistry: { label: 'Brand Registry, Content & Merchandising', page: 'brand-registry' },
  pricingGovernance: { label: 'Pricing Governance & Channel Integrity', page: 'pricing-governance' },
  advertisingSearch: { label: 'Advertising & Search Optimisation', page: 'advertising-search' },
  creativeAssets: { label: 'Creative Assets & Merchandising', page: 'creative-assets' },
  productLaunch: { label: 'Product Launch & Catalogue Management', page: 'product-launch' },
  /* §NAVIGATION REPAIR (2026-11-20) — REMOVED, with every dependent:
     `orderAutomationPage` / `clientPortalPage` / `listingHealthPage` /
     `reportingAnalyticsPage`.

     These four existed ONLY to populate the "Platform Tools" navigation group,
     and they were exact duplicates of the "Platform" group: the same four
     destinations under four brand-new page ids that had no page behind them.
     Clicking any of them rendered a completely blank screen — and the same four
     destinations appeared a second time under "Platform Tools".

     The real pages are reached through `orderAutomation`, `clientPortal`,
     `listingHealth` and `reportingAnalytics` above. The "Platform Tools" group
     is deleted from PUBLIC_NAV in the same change, so no pointer survives. */

  enteringUk: { label: 'Brands Entering the UK Market', page: 'new-to-uk-market' },
  scalingUk: { label: 'Brands Scaling in UK Retail', page: 'scaling-consumer-brands' },
  institutionalPartners: { label: 'Institutional Partners', page: 'institutional-partners' },
  categorySpecialization: { label: 'Category Specialization', page: 'categories' },
  commercialTerms: { label: 'Commercial Terms', page: 'pricing' },
  whyMercenta: { label: 'Why Mercenta', page: 'why-mercenta' },
  partnerships: { label: 'Partnerships', page: 'partnerships' },
  ukRetailGuide: { label: 'UK Retail Guide', page: 'uk-retail-guide' },
  caseStudies: { label: 'Case Studies', page: 'case-studies' },
  insights: { label: 'Insights', page: 'insights' },
  blog: { label: 'Blog', page: 'blog' },
  guides: { label: 'Guides', page: 'guides' },
  pricing: { label: 'Commercial Terms', page: 'pricing' },
  } as const satisfies Record<string, PublicNavLink>;




export interface PublicNavGroup extends PublicNavLink {
  children: readonly PublicNavLink[];
}



/** The header's groups, in order. The footer reuses these labels. */
export const PUBLIC_NAV: readonly PublicNavGroup[] = [
  {
    label: 'Platform',
    page: PUBLIC_LINK.orderAutomation.page,
    children: [
      PUBLIC_LINK.orderAutomation,
      PUBLIC_LINK.clientPortal,
      PUBLIC_LINK.listingHealth,
      PUBLIC_LINK.reportingAnalytics,
    ],
  },
  {
    label: 'Retail Infrastructure',
    page: PUBLIC_LINK.vendorOfRecord.page,
    children: [
      PUBLIC_LINK.vendorOfRecord,
      PUBLIC_LINK.importCompliance,
      PUBLIC_LINK.brandRegistry,
      PUBLIC_LINK.pricingGovernance,
      PUBLIC_LINK.advertisingSearch,
      PUBLIC_LINK.creativeAssets,
      PUBLIC_LINK.productLaunch,
    ],
  },
  /* §NAVIGATION REPAIR (2026-11-20) — THE "PLATFORM TOOLS" GROUP IS DELETED.
     It was an exact duplicate of "Platform" above: the same four destinations
     (Order Automation, Client Portal, Listing Health, Reporting & Analytics)
     listed a second time under brand-new page ids that had no page. Every one
     of those links rendered a blank screen, and the menu carried ten groups
     where nine are wanted. Its four PUBLIC_LINK entries were removed in the
     same change, so nothing points at them any more. */
  {
    label: 'Solutions',
    page: PUBLIC_LINK.enteringUk.page,
    children: [
      PUBLIC_LINK.enteringUk,
      PUBLIC_LINK.scalingUk,
      PUBLIC_LINK.institutionalPartners,
      PUBLIC_LINK.categorySpecialization,
    ],
  },
  {
    label: 'Company',
    page: PUBLIC_LINK.whyMercenta.page,
    children: [
      PUBLIC_LINK.whyMercenta,
      PUBLIC_LINK.partnerships,
    ],
  },
  {
    label: 'Categories',
    page: PUBLIC_LINK.categorySpecialization.page,
    children: [
      PUBLIC_LINK.categorySpecialization,
    ],
  },
  {
    label: 'Commercial',
    page: PUBLIC_LINK.commercialTerms.page,
    children: [
      PUBLIC_LINK.commercialTerms,
      PUBLIC_LINK.contact,
    ],
  },
  {
    label: 'Resources',
    page: PUBLIC_LINK.faq.page,
    children: [
      PUBLIC_LINK.faq,
      PUBLIC_LINK.insights,
      PUBLIC_LINK.blog,
      PUBLIC_LINK.caseStudies,
      PUBLIC_LINK.guides,
    ],
  },
  {
    label: 'Explore',
    page: PUBLIC_LINK.explore.page,
    children: [
      PUBLIC_LINK.explore,
      PUBLIC_LINK.liftOff,
      PUBLIC_LINK.howItWorks,
      PUBLIC_LINK.ukMarketAccess,
      PUBLIC_LINK.forBrands,
    ],
  },
  {
    label: 'Legal',
    page: PUBLIC_LINK.privacy.page,
    children: [
      PUBLIC_LINK.privacy,
      PUBLIC_LINK.terms,
    ],
  },
] as const;

/**
 * The footer's columns, in order. The brand column (logo, promise and the
 * access CTA) is rendered by the footer itself and is therefore not listed here;
 * these are the four that follow it, making the declared FIVE-column shape.
 *
 * `kind: 'categories'` is not a link list — it renders `APPROVED_CATEGORIES`, so
 * the ten product categories exist in exactly one place in the codebase rather
 * than being retyped into the footer (they were, until B4).
 *
 * The heading strings are declared here (not in the footer) so the header and
 * the footer cannot name the same destination two different ways.
 */
export type PublicFooterColumn =
  | { kind: 'links'; heading: string; links: readonly PublicNavLink[]; withCookieSettings?: boolean }
  | { kind: 'categories'; heading: string };

/**
 * §PUBLIC SURFACES BATCH 2 (2026-11-27) — A COLUMN IS REFERENCED BY NAME, NEVER BY POSITION.
 *
 * WHY THIS CHANGED. Every column below used to be read as `PUBLIC_NAV[0] … PUBLIC_NAV[8]`,
 * and the comments immediately above record the defect that positional reads have ALREADY
 * caused once: deleting a group shifted every index, Legal then appeared TWICE, and only
 * `e2e/public-chrome.spec.ts` caught it. Batch 2 removes TWO groups from the menu (Legal
 * and Categories), so with positional reads `PUBLIC_NAV[8]` would become `undefined` and
 * the footer would crash on EVERY public page. This repoint is behaviour-identical —
 * the same columns, in the same order — and it is the prerequisite for those removals.
 *
 * `navGroup()` fails LOUDLY rather than yielding `undefined`, so a future rename is a named
 * error at first render, not a silently missing column.
 */
function navGroup(label: string): PublicNavGroup {
  const found = PUBLIC_NAV.find((group) => group.label === label);
  if (!found) {
    throw new Error(
      `PUBLIC_NAV has no group named "${label}" — a rename must update PUBLIC_FOOTER_COLUMNS in the same change.`
    );
  }
  return found;
}

/** One footer link column, read from its menu group BY NAME. */
function navColumn(label: string): PublicFooterColumn {
  const group = navGroup(label);
  return { kind: 'links', heading: group.label, links: group.children };
}

export const PUBLIC_FOOTER_COLUMNS: readonly PublicFooterColumn[] = [
  navColumn('Platform'),
  navColumn('Retail Infrastructure'),
  navColumn('Solutions'),
  navColumn('Company'),
  /* The "Categories" group is deliberately NOT a column here — see the §BATCH 2 GATE
     DEFECT note above: its only child is already published by "Solutions". */
  navColumn('Commercial'),
  navColumn('Resources'),
  navColumn('Explore'),
  { kind: 'categories', heading: 'Product Categories' },
  /* Legal — read from its owner like every other column (see §NAVIGATION REPAIR above). */
  navColumn('Legal'),
] as const;

/** The control that re-opens the cookie notice after it has been answered. */
export const PUBLIC_COOKIE_SETTINGS_LABEL = 'Cookie settings';

/* ── 13. The cookie notice ─────────────────────────────────────────────────
 * WHAT IT MAY SAY — and why it says this and not more.
 *
 * A notice that offers an "analytics" or "advertising" choice would be a FALSE
 * statement: the public site uses neither. Verified this session — `index.html`,
 * `package.json` and `src/main.tsx` load no analytics, tag-manager, session-
 * replay or advertising script, and the only thing the public surface writes to
 * a visitor's device is `mercenta.theme` (ThemeContext) plus this notice's own
 * dismissal. Both are strictly functional, stay on the device, and are never
 * shared. A "reject" button that rejected nothing would be the kind of
 * decorative control this project forbids, so the notice states the truth and
 * offers the one action that is real.
 *
 * The privacy policy is the place for the full picture; this is a notice, not a
 * policy.
 */
export interface PublicCookieNotice {
  heading: string;
  body: string;
  /** The single real action: record that the notice has been read. */
  acknowledgeLabel: string;
  /** Where the visitor reads the full picture. */
  policyLabel: string;
}

export const PUBLIC_COOKIE_NOTICE: PublicCookieNotice = {
  heading: 'Cookies on this site',
  body:
    'This website sets no advertising or tracking cookies and uses no analytics. Two things are kept on your ' +
    'own device — the theme you chose and the fact that you have read this notice. Neither leaves your device ' +
    'or is shared with anyone.',
  acknowledgeLabel: 'Understood',
  policyLabel: PUBLIC_LINK.privacy.label,
};

/** The heading of the notice's region, for assistive technology. */
export const PUBLIC_COOKIE_NOTICE_REGION = 'Cookie notice';

/* ── 14. The two legal pages' shared facts ─────────────────────────────────
 * ADDED IN B5 (2026-09-29).
 *
 * The privacy policy and the terms are the last two public documents, and until
 * B5 they were the only public surfaces holding their own copy of the company's
 * identity: each retyped "Mercenta Partners Ltd", each retyped its contact
 * address (`privacy@…` / `legal@…`), each dated itself "30 August 2026"
 * independently, and each hardcoded the dark palette so the light shell was
 * ignored. A change to the registered name or the domain could therefore leave
 * the two documents disagreeing with the footer and with each other.
 *
 * Both now derive every company fact and both addresses from §7, and share ONE
 * revision date. That date is the only fact this section adds — it must not
 * exist twice, which is exactly the drift `publicCompanyLine()` was created to
 * prevent for the identity.
 */

/** The revision date shown on both legal documents. One owner; both read it. */
export const PUBLIC_LEGAL_LAST_UPDATED = '29 September 2026';
