/**
 * §PUBLIC CONTENT PROGRAMME (2026-11-19) — THE ONE OWNER OF THE NEW PUBLIC PAGES.
 *
 * WHY THIS EXISTS
 * ---------------
 * The approved navigation needs sixteen public destinations that did not exist.
 * Rather than sixteen hand-written components (which drift, and which is how a
 * site acquires sixteen different voices), the CONTENT lives here as data and one
 * component renders any of them. One voice, one layout language, one place to
 * correct a claim.
 *
 * THE CONTENT RULES (non-negotiable, and gated)
 * ---------------------------------------------
 *  1. CHANNEL-NEUTRAL. The retail channel is never named. `scripts/lint-wording.mjs`
 *     fails the build if it is.
 *  2. NO UNEVIDENCED CLAIM. No client counts, no results, no testimonials, no
 *     certifications, no prices. `scripts/validate-public-claims.mjs` fails the
 *     build on any of the eight forbidden claim families.
 *  3. LIVE vs PLANNED IS STATED. Where a capability is not yet live it says so in
 *     the body, so a reader is never misled. This is the platform's own standing
 *     rule about simulation and planned work.
 *  4. NO MECHANISM. The pages say what a brand gets, never how the business is
 *     structured, who we hold accounts with, or what the commercial terms are.
 *
 * Every word below is written from those rules. Nothing here is filler: each page
 * answers a real question a brand asks before it talks to us.
 */

import type { PublicImageRole } from '@/config/homepageImagery';

export type PublicContentPageId =
  | 'order-automation'
  | 'client-portal'
  | 'listing-health'
  | 'reporting-analytics'
  /* §IMAGERY-ERA NAVIGATION REPAIR (2026-11-20) — the "1P Infrastructure"
     group was declared in PUBLIC_NAV but had NO page behind any of its seven
     links, so every one of them rendered a blank screen. These are those pages. */
  | 'vendor-of-record'
  | 'import-compliance'
  | 'brand-registry'
  | 'pricing-governance'
  | 'advertising-search'
  | 'creative-assets'
  | 'product-launch'
  /* Two standalone pages the navigation also pointed at with nothing behind
     them: the institutional-partnership page and the UK retail guide. */
  | 'institutional-partners'
  | 'uk-retail-guide'
  | 'new-to-uk-market'
  | 'scaling-consumer-brands'
  | 'agencies-service-partners'
  | 'categories'
  | 'partnerships'
  | 'why-mercenta'
  | 'insights'
  | 'blog'
  | 'case-studies'
  | 'guides'
  | 'pricing'
  | 'contact';

/** A block of page content: a heading, then paragraphs and/or a bullet list. */
export interface PublicContentBlock {
  heading: string;
  body?: string[];
  bullets?: string[];
  /**
   * §PUBLIC SURFACES BATCH 5 (2026-11-27) — an optional picture for this block.
   *
   * A ROLE, never a path: the picture's file names and its alt text are owned by
   * `src/config/homepageImagery.ts`, so no page can hardcode `/imagery/...` and no page can ship a
   * picture without alt text. Optional because most blocks do not need one — a page with a picture in
   * every block reads as a gallery, not a page.
   */
  media?: PublicImageRole;
}

/** An honest statement of what is live and what is not. */
export interface PublicContentAvailability {
  label: string;
  detail: string;
}

/**
 * §PUBLIC SURFACES BATCH 5 PART 2 (2026-11-27) — A LABELLED WORKED ILLUSTRATION.
 *
 * WHY THIS EXISTS. The page standard the owner set for these pages is: an opening, what you get,
 * how it works, **a labelled worked illustration**, what it does NOT do, and one next step. The
 * model could express everything except the illustration: `blocks` are prose and bullets, and a
 * bullet list cannot be *labelled*, so the example a reader actually needs — the service running,
 * stage by stage — had nowhere to live and the pages read as a wall of paragraphs.
 *
 * WHAT IT IS. A labelled sequence: one short label per stage (the step's name) and one sentence
 * saying what happens at it. It is rendered as a numbered, labelled run rather than prose, which is
 * what makes a long page readable and what stops these pages looking identical to each other.
 *
 * WHAT IT MAY NOT CONTAIN — the same rules that bind every word on these pages:
 *   · it is an illustration of the SEQUENCE, never of an amount. No figure, no price, no percentage:
 *     stage copy carries no number that would read as a claim about money or results;
 *   · it never names the retail channel and never describes Mercenta's commercial terms;
 *   · it must be true of the service as it actually works today, or the page's own `availability`
 *     block must say which part is not yet live.
 * `scripts/validate-public-page-standard.mjs` fails the build if a figure appears here.
 */
export interface PublicWorkedIllustration {
  /** The illustration's own title — what the example is of, in one line. */
  label: string;
  /** One or two sentences framing the example before the stages. */
  intro: string;
  /** The labelled stages, IN ORDER. `label` names the stage; `detail` says what happens. */
  stages: { label: string; detail: string }[];
}

export interface PublicContentPage {
  id: PublicContentPageId;
  /** The canonical path — exactly as it appears in the address bar. */
  path: string;
  /** The navigation group this page belongs to. */
  navGroup: string;
  /** The label used in navigation. */
  navLabel: string;
  title: string;
  description: string;
  eyebrow: string;
  heading: string;
  lede: string;
  blocks: PublicContentBlock[];
  /** §PUBLIC SURFACES BATCH 5 — an optional opening picture, shown beside the page's lede. */
  hero?: PublicImageRole;
  /**
   * §PUBLIC SURFACES BATCH 5 PART 2 (2026-11-27) — the labelled worked illustration.
   *
   * The example that shows the service running, stage by stage. It is what turns a page of
   * paragraphs into something a reader can follow, and it is the piece of the page standard the
   * blocks could not express. Optional on the TYPE so a page cannot fail to compile, but
   * `scripts/validate-public-page-standard.mjs` requires it on every page in the batch's scope, so
   * an enrichment batch cannot ship half-finished.
   */
  illustration?: PublicWorkedIllustration;
  /**
   * §PUBLIC SURFACES BATCH 5 PART 2 (2026-11-27) — what this page's service does NOT do.
   *
   * The honest section, and the one that earns the rest of the page. Short statements only: a limit
   * is a limit, not a paragraph of excuses. Same gate as `illustration` — required by the standard
   * for the pages in the batch's scope.
   */
  limits?: string[];
  /** Present when part of the page describes something not yet live. */
  availability?: PublicContentAvailability;
  /** Optional closing call to action; defaults to the Explore assessment. */
  cta?: { label: string; to: 'explore-uk-market-fit' | 'contact' };
}

export const PUBLIC_PLATFORM_PAGES: readonly PublicContentPage[] = [
  {
    id: 'order-automation',
    path: '/platform/order-automation',
    navGroup: 'Platform',
    navLabel: 'Order Automation',
    title: 'Order Automation',
    description:
      'How orders reach Mercenta, how a brand is asked for its decision, and what happens next.',
    eyebrow: 'Platform',
    heading: 'Orders arrive, and you decide.',
    lede:
      'Mercenta carries the retail side of your business. Orders land in one workspace, with what they are worth and what is waiting on you. You approve, amend or decline — and that decision is what we act on.',
    blocks: [
      {
        heading: 'What lands in your workspace',
        bullets: [
          'The order itself, with quantities, lines and the value behind it.',
          'Anything that has to be resolved before it can move.',
          'The date it has to leave by.',
        ],
      },
      {
        heading: 'What you are asked to do',
        body: [
          'One decision, on the record: approve it, amend it, or decline it. Nothing is assumed on your behalf, and nothing moves until you have answered.',
        ],
      },
      {
        heading: 'What happens after your decision',
        body: [
          'Mercenta takes it from there — the movement, the paperwork and the communication back to the channel. You see the outcome in the same place you made the decision.',
        ],
      },
    ],
  },
  {
    id: 'client-portal',
    path: '/platform/client-portal',
    navGroup: 'Platform',
    navLabel: 'Client Portal',
    title: 'Client Portal',
    description:
      'The single workspace where a brand sees its orders, movement, documents, compliance and payments.',
    eyebrow: 'Platform',
    heading: 'One place to watch it happen.',
    lede:
      'Your portal is where the retail side of your business lives: what is moving, what is waiting on you, what has landed and what has been paid.',
    blocks: [
      {
        heading: 'What is in the portal',
        bullets: [
          'Orders, and the decision waiting on each one.',
          'Consignments in transit, with their milestones.',
          'Documents and compliance, and what is due for renewal.',
          'Invoices, settlements and every deduction explained against the order behind it.',
        ],
      },
      {
        heading: 'Who sees what',
        body: [
          'Your workspace shows your products, your orders and your money — never another brand’s. Access is role-based, and every material action is recorded with who did it and when.',
        ],
      },
      {
        heading: 'Access',
        body: [
          'The portal is reached through Partner Login. Brand accounts are created during onboarding.',
        ],
      },
    ],
    cta: { label: 'Partner Login', to: 'contact' },
  },
  {
    id: 'listing-health',
    path: '/platform/listing-health',
    navGroup: 'Platform',
    navLabel: 'Listing Health Optimisation',
    title: 'Listing Health Optimisation',
    description:
      'Keeping a product’s listing accurate, complete and compliant so it keeps selling.',
    eyebrow: 'Platform',
    heading: 'A listing that is accurate keeps selling.',
    lede:
      'A product that is described wrongly, missing a document, or out of step with the requirement stops selling — often without anyone noticing. Mercenta watches that, and tells you before it becomes a problem.',
    blocks: [
      {
        heading: 'What is checked',
        bullets: [
          'Whether every requirement that applies to the product is present and current.',
          'Whether the listing still matches the product you actually supply.',
          'Anything that has lapsed and would put an order on hold.',
        ],
      },
      {
        heading: 'How you hear about it',
        body: [
          'A finding appears against the product, with what is missing and what to do about it. You keep the decisions about the product; we keep the requirement current.',
        ],
      },
    ],
  },
  {
    id: 'reporting-analytics',
    path: '/platform/reporting-analytics',
    navGroup: 'Platform',
    navLabel: 'Reporting & Analytics',
    title: 'Reporting & Analytics',
    description:
      'One place to see what sold, what moved, what it cost and what was settled.',
    eyebrow: 'Platform',
    heading: 'The picture, without the spreadsheet.',
    lede:
      'Reports are built from the same records you see in your workspace, so a figure in a report and a figure on an order can never disagree.',
    blocks: [
      {
        heading: 'What you can see',
        bullets: [
          'Sales by product and by period, from the orders themselves.',
          'Movement and delivery performance.',
          'Settlements and deductions, reconciled against the orders behind them.',
        ],
      },
      {
        heading: 'Why it is trustworthy',
        body: [
          'Every number is derived from a tenant-scoped record. Nothing on Mercenta is a decorative chart: if a figure appears, there is a record behind it.',
        ],
      },
    ],
  },
];
/* ── Solutions ────────────────────────────────────────────────────────────── */

export const PUBLIC_SOLUTION_PAGES: readonly PublicContentPage[] = [
  {
    id: 'new-to-uk-market',
    path: '/solutions/new-to-uk-market',
    navGroup: 'Solutions',
    navLabel: 'New to UK Market',
    title: 'New to the UK Market',
    description:
      'For brands outside the UK that want the market opened for them without building a UK business.',
    eyebrow: 'Solutions',
    heading: 'You make it. We open the market.',
    lede:
      'Entering the UK normally means an entity, a warehouse, a compliance stack and a team who already know the buyers. Mercenta removes that list rather than managing it.',
    blocks: [
      {
        heading: 'What you do not have to build',
        bullets: [
          'A UK company, or a UK address for your customers to deal with.',
          'Your own warehousing and fulfilment operation.',
          'A compliance function to keep documents current.',
        ],
      },
      {
        heading: 'What you keep',
        body: [
          'Your product, your brand, your pricing and every decision about them. What you hand over is the retail side — the orders, the movement, the paperwork and the payments.',
        ],
      },
      {
        heading: 'Where to start',
        body: [
          'Start with an honest read on whether the UK wants your product. It costs nothing and is worth having whether or not you go further with us.',
        ],
      },
    ],
    cta: { label: 'Explore UK Market Fit', to: 'explore-uk-market-fit' },
  },
  {
    id: 'scaling-consumer-brands',
    path: '/solutions/scaling-consumer-brands',
    navGroup: 'Solutions',
    navLabel: 'Scaling Consumer Brands',
    title: 'Scaling Consumer Brands',
    description:
      'For brands already selling in the UK that want the retail side carried for them.',
    eyebrow: 'Solutions',
    heading: 'Growing without the operations growing with it.',
    lede:
      'A brand that is already selling here usually finds that growth adds operational weight faster than it adds margin. Mercenta absorbs the weight instead.',
    blocks: [
      {
        heading: 'Where the weight comes from',
        bullets: [
          'More orders means more to track, reconcile and keep on top of.',
          'More products means more documentation to keep current.',
          'More movement means more deductions to explain.',
        ],
      },
      {
        heading: 'What changes',
        body: [
          'The work moves to one workspace and one counterparty, with the decisions still yours. You keep the product and the brand; we keep the retail side running.',
        ],
      },
    ],
  },
  {
    id: 'agencies-service-partners',
    path: '/solutions/agencies-service-partners',
    navGroup: 'Solutions',
    navLabel: 'Agencies and Service Partners',
    title: 'Agencies and Service Partners',
    description:
      'For agencies and consultants whose brand clients need the UK retail side operated.',
    eyebrow: 'Solutions',
    heading: 'A partner for the part you do not operate.',
    lede:
      'Agencies are good at the things agencies are for: strategy, brand, growth. Mercenta is the operating layer underneath, so a client does not have to be told to find one.',
    blocks: [
      {
        heading: 'How it fits',
        bullets: [
          'You keep the client relationship and the brand work.',
          'Mercenta operates the orders, movement, paperwork and payments.',
          'The client sees one workspace, and so do you.',
        ],
      },
      {
        heading: 'Talking to us',
        body: [
          'If you would like to discuss working with Mercenta on behalf of a client, get in touch and we will explain how the arrangement works.',
        ],
      },
    ],
    cta: { label: 'Contact Mercenta', to: 'contact' },
  },
];

/* ── Company ──────────────────────────────────────────────────────────────── */

export const PUBLIC_COMPANY_PAGES: readonly PublicContentPage[] = [
  {
    id: 'why-mercenta',
    path: '/company/why-mercenta',
    navGroup: 'Company',
    navLabel: 'Why Mercenta',
    title: 'Why Mercenta',
    description:
      'What Mercenta does differently, and why the UK retail side is a job worth handing over.',
    eyebrow: 'Company',
    heading: 'The UK is a market, not a destination.',
    lede:
      'Plenty of brands would sell here if selling here were not a second business. Mercenta is the business they would otherwise have had to build.',
    blocks: [
      {
        heading: 'What we are',
        body: [
          'Mercenta is a UK wholesale distribution and market-entry partner. We take the retail side of a brand’s business off its desk — from the production line to the shelf — and give it one place to watch it happen.',
        ],
      },
      {
        heading: 'What makes it different',
        bullets: [
          'One counterparty for the whole retail side, not a stack of suppliers.',
          'The decisions stay with the brand; the operation does not.',
          'Everything is visible in one workspace, updated as it moves.',
        ],
      },
      {
        heading: 'What we will not do',
        body: [
          'We will not tell you the UK wants your product before we have looked. We will not publish a number we cannot point at a record for. And we will not claim a relationship we do not hold.',
        ],
      },
    ],
  },
  {
    id: 'partnerships',
    path: '/company/partnerships',
    navGroup: 'Company',
    navLabel: 'Partnerships',
    title: 'Partnerships',
    description:
      'Working with Mercenta as an agency, a service partner or a distribution partner.',
    eyebrow: 'Company',
    heading: 'Working with Mercenta.',
    lede:
      'Mercenta works with brands directly, and with the agencies, consultants and distributors who already serve them.',
    blocks: [
      {
        heading: 'Ways to work together',
        bullets: [
          'Referring a brand that needs the UK retail side operated.',
          'Operating as a service partner alongside Mercenta.',
          'Discussing a distribution arrangement for a specific category.',
        ],
      },
      {
        heading: 'What we ask of a partner',
        body: [
          'Accuracy about what is being offered, and honesty about what a brand can expect. We hold ourselves to the same standard in public.',
        ],
      },
    ],
    cta: { label: 'Contact Mercenta', to: 'contact' },
  },
];

/* ── Categories ───────────────────────────────────────────────────────────── */

export const PUBLIC_CATEGORY_PAGE: PublicContentPage = {
  id: 'categories',
  path: '/categories',
  /* §PUBLIC SURFACES BATCH 2 (2026-11-27) — REPOINTED, NOT LEFT DANGLING. The header's
     "Categories" group is deleted (it duplicated this same destination inside "Solutions"), so this
     page must name the group that ACTUALLY publishes it. A page naming a group that is no longer in
     `PUBLIC_NAV` is a pointer to something removed — the exact class the removal-coherence rule
     forbids — so it now names "Solutions", which carries Category Specialization. */
  navGroup: 'Solutions',
  navLabel: 'All Categories',
  title: 'Categories',
  description:
    'The ten product categories Mercenta distributes in the UK, and how a brand fits into one.',
  eyebrow: 'Categories',
  heading: 'Where your brand fits.',
  lede:
    'Mercenta distributes across ten approved categories. If your product sits outside them, we will tell you honestly rather than take it on.',
  /* §PUBLIC SURFACES BATCH 5 (2026-11-27) — the page opens with a picture of stocked grocery shelving
     (the homepage set's own role, so no new file was fetched for it) rather than opening as text only. */
  hero: 'shelves-grocery',
  blocks: [
    {
      heading: 'The ten approved categories',
      body: [
        'The list below is read directly from the platform’s own approved category register, so this page can never disagree with what the business actually operates in.',
      ],
    },
    {
      heading: 'Not sure which one you are?',
      body: [
        'A product sometimes sits between two. Tell us what you make and we will tell you where it belongs, or that it does not fit.',
      ],
    },
  ],
  cta: { label: 'Explore UK Market Fit', to: 'explore-uk-market-fit' },
};

/* ── Commercial ───────────────────────────────────────────────────────────── */

export const PUBLIC_COMMERCIAL_PAGES: readonly PublicContentPage[] = [
  {
    id: 'pricing',
    path: '/commercial/pricing',
    navGroup: 'Commercial',
    navLabel: 'Pricing',
    title: 'Pricing',
    description:
      'How Mercenta’s commercial arrangement works, and why terms are agreed per brand rather than published as a price list.',
    eyebrow: 'Commercial',
    heading: 'Terms agreed per brand, not a published price list.',
    lede:
      'Mercenta does not sell a subscription with a posted price. What it costs to carry the UK retail side depends on the products, the volumes and the work — so it is agreed with each brand.',
    blocks: [
      {
        heading: 'Why there is no price list',
        body: [
          'A single number would be wrong for almost everybody. Publishing one would mean either overcharging a small range or losing money on a complex one, and neither is honest.',
        ],
      },
      {
        heading: 'What is agreed, and when',
        bullets: [
          'What Mercenta carries, and what the brand keeps.',
          'The commercial basis, agreed in writing before anything moves.',
          'What is charged and what is deducted, shown separately so nothing hides inside a margin.',
        ],
      },
      {
        heading: 'How to get a real answer',
        body: [
          'Tell us what you make and where you sell. We will tell you what the arrangement would look like — including if the honest answer is that it does not suit you.',
        ],
      },
    ],
    cta: { label: 'Contact Mercenta', to: 'contact' },
  },
  {
    id: 'contact',
    path: '/contact',
    navGroup: 'Commercial',
    navLabel: 'Contact',
    title: 'Contact',
    description: 'How to reach Mercenta Partners Ltd, and what happens after you do.',
    eyebrow: 'Contact',
    heading: 'Talk to a person.',
    lede:
      'Whether you are a brand, an agency or a partner, an enquiry reaches a person at Mercenta rather than a queue.',
    blocks: [
      {
        heading: 'What to tell us',
        bullets: [
          'What you make, and where it is made.',
          'Where you sell today, if anywhere.',
          'What you want the UK to look like in a year.',
        ],
      },
      {
        heading: 'What happens next',
        body: [
          'We read it, and we answer. If the UK market is not a fit for the product we will say so plainly, because that is more useful to you than a slow no.',
        ],
      },
      {
        heading: 'Applying to distribute',
        body: [
          'Brands ready to apply can use Request Partner Access, which starts the partner application. Mercenta’s registered company details and contact address are in the footer of every page.',
        ],
      },
    ],
    cta: { label: 'Explore UK Market Fit', to: 'explore-uk-market-fit' },
  },
];

/* ── Resources ────────────────────────────────────────────────────────────── */

export const PUBLIC_RESOURCE_PAGES: readonly PublicContentPage[] = [
  {
    id: 'insights',
    path: '/resources/insights',
    navGroup: 'Resources',
    navLabel: 'Insights',
    title: 'Insights',
    description: 'What Mercenta is seeing in UK market entry and wholesale distribution.',
    eyebrow: 'Resources',
    heading: 'What we are seeing.',
    lede:
      'Notes on entering the UK, on wholesale distribution, and on the operational detail that decides whether a product keeps selling.',
    blocks: [
      {
        heading: 'Where these come from',
        body: [
          'Everything published here comes from the work itself — the enquiries we receive, the products we are asked to assess, and the problems brands bring us. Nothing is invented to fill a page.',
        ],
      },
      {
        heading: 'Starting with the market question',
        body: [
          'The most useful thing we publish is the honest read on whether the UK wants a product. That is what the UK Market Fit assessment exists to produce.',
        ],
      },
    ],
    cta: { label: 'Explore UK Market Fit', to: 'explore-uk-market-fit' },
  },
  {
    id: 'blog',
    path: '/resources/blog',
    navGroup: 'Resources',
    navLabel: 'Blog',
    title: 'Blog',
    description: 'Short pieces on UK distribution, compliance and getting a product onto a shelf.',
    eyebrow: 'Resources',
    heading: 'Shorter notes.',
    lede: 'Brief pieces on the practical questions we are asked most often about selling into the UK.',
    blocks: [
      {
        heading: 'What gets written',
        bullets: [
          'What UK buyers actually ask a brand for.',
          'What has to be true before a product can be listed.',
          'What a brand keeps, and what it can hand over.',
        ],
      },
      {
        heading: 'Nothing here is a sales page',
        body: ['If a piece does not help you decide something, it does not get published.'],
      },
    ],
  },
  {
    id: 'case-studies',
    path: '/resources/case-studies',
    navGroup: 'Resources',
    navLabel: 'Case Studies',
    title: 'Case Studies',
    description: 'How Mercenta works with brands. Published only with the brand’s consent.',
    eyebrow: 'Resources',
    heading: 'How it works in practice.',
    lede:
      'We publish how an arrangement actually runs only where the brand has agreed to it — and we never publish a result we cannot stand behind.',
    blocks: [
      {
        heading: 'Why this page is short for now',
        body: [
          'A case study that names a brand, a category or a figure requires that brand’s consent and a record behind every number. Until those exist, this page says so rather than filling the space with a story that did not happen.',
        ],
      },
      {
        heading: 'What we can tell you today',
        body: [
          'How the process works end to end is on How It Works, and what a brand keeps is on For Brands. Those are true today and need nobody’s permission.',
        ],
      },
    ],
    availability: {
      label: 'Published as consent is given',
      detail:
        'No case study is published without the brand’s agreement and a supporting record. This is a deliberate limit, not an oversight.',
    },
  },
  {
    id: 'guides',
    path: '/resources/guides',
    navGroup: 'Resources',
    navLabel: 'Guides',
    title: 'Guides',
    description: 'Practical guides to entering the UK market and operating the retail side.',
    eyebrow: 'Resources',
    heading: 'The practical version.',
    lede: 'Step-by-step guides for the questions a brand has before it commits to the UK.',
    blocks: [
      {
        heading: 'Guides to start with',
        bullets: [
          'Working out whether the UK wants your product.',
          'What a UK buyer needs from a brand before it will list.',
          'What changes when someone else carries the retail side.',
        ],
      },
      {
        heading: 'How to use them',
        body: [
          'Each guide is written to be read in one sitting and to leave you able to decide something. None require a call with us first.',
        ],
      },
    ],
  },
];

/* ── The aggregate ────────────────────────────────────────────────────────── */

/** Every content page, in navigation order. */
/* ── 1P Infrastructure ──────────────────────────────────────────────────────
 * §NAVIGATION REPAIR (2026-11-20). These seven pages did not exist. The
 * "1P Infrastructure" navigation group declared all seven and every one of them
 * rendered a blank screen. Written to the same rules as the pages above: what a
 * brand GETS, never how the business is structured, who we hold accounts with,
 * or what the commercial terms are.
 */
const PAGE_VENDOR_OF_RECORD: PublicContentPage = {
  id: 'vendor-of-record',
  path: '/infrastructure/vendor-of-record',
  navGroup: 'Retail Infrastructure',
  navLabel: 'Vendor of Record & Replenishment',
  title: 'Vendor of Record & Replenishment',
  description:
    'How a brand sells into UK retail through Mercenta as its vendor of record, without setting up a UK company.',
  eyebrow: 'Retail Infrastructure',
  heading: 'A UK vendor of record, without a UK company.',
  lede:
    'UK retail buyers deal with a UK supplier. Being your vendor of record means Mercenta is that supplier — holding the trading relationship, the stock obligation and the paperwork — while the brand stays entirely yours.',
  hero: 'warehouse-racks',
  blocks: [
    {
      heading: 'What you get',
      bullets: [
        'A UK trading counterparty on the purchase order.',
        'Stock held and replenished against real orders, not forecasts.',
        'One commercial relationship instead of several.',
        'No UK subsidiary, no UK payroll and no UK filing run by you.',
      ],
      media: 'boxes-stacked',
    },
    {
      heading: 'What stays yours',
      body: [
        'The brand, the product, the pricing strategy and the customer relationship. Mercenta does not own your brand, does not rename it, and does not sell it anywhere you have not agreed.',
      ],
    },
    {
      heading: 'What you stop building',
      body: [
        'A sales office, a warehouse, a finance function working in a second currency, and the regulatory work that comes with all three. Those are what stand between a good product and a UK shelf.',
      ],
    },
  ],
  /* §PUBLIC SURFACES BATCH 5 PART 2 (2026-11-27) — the example that shows the service running. */
  illustration: {
    label: 'How a first order runs',
    intro:
      'This is the sequence for a single order, from the buyer’s request to the money reaching you. The stages do not change with the size of the order.',
    stages: [
      {
        label: 'The order arrives',
        detail:
          'A UK buyer raises an order against Mercenta, in the buyer’s own system. Nothing is sent to you to administer.',
      },
      {
        label: 'You decide',
        detail: 'The order appears in your workspace with what it is worth. You approve it, amend it or decline it.',
      },
      {
        label: 'We carry it',
        detail:
          'Once you have decided, the movement, the paperwork and the buyer relationship are Mercenta’s to run.',
      },
      {
        label: 'You are settled',
        detail: 'The settlement is reconciled against the order behind it and shown to you in the same workspace.',
      },
    ],
  },
  limits: [
    'We do not own your brand, rename it, or sell it anywhere you have not agreed.',
    'We do not take over your product decisions or your pricing strategy.',
    'We do not act on an order without your decision, and we do not treat a delay as consent.',
  ],
  cta: { label: 'Talk to us about your brand', to: 'contact' },
};

const PAGE_IMPORT_COMPLIANCE: PublicContentPage = {
  id: 'import-compliance',
  path: '/infrastructure/import-compliance',
  navGroup: 'Retail Infrastructure',
  navLabel: 'UK Import, Compliance & Replenishment',
  title: 'UK Import, Compliance & Replenishment',
  description:
    'The import, product-compliance and replenishment sequence a brand goes through before its product can legally sell in the UK.',
  eyebrow: 'Retail Infrastructure',
  heading: 'It arrives in the UK legally, and it is ready to sell.',
  lede:
    'Importing is a sequence, not a step. Mercenta runs the whole sequence — the customs entry, the product compliance your category requires, and the movement into stock — and holds the record of each.',
  hero: 'port-containers',
  blocks: [
    {
      heading: 'What we handle',
      bullets: [
        'Import declarations and duty.',
        'Category-specific product compliance, checked before anything ships.',
        'Movement into UK stock, not to a holding address.',
        'The evidence that all three were done.',
      ],
      media: 'port-cranes',
    },
    {
      heading: 'What we need from you',
      body: [
        'The product specification, the safety documentation your market requires, and honest lead times. If a document is missing we say which one and stop — we do not ship and hope.',
      ],
    },
    {
      heading: 'Why it stops when it has to',
      body: [
        'A shipment refused at the border costs more than a shipment that waited. Nothing enters stock until its category requirements are satisfied, and no exception is made for a launch date.',
      ],
    },
  ],
  /* §PUBLIC SURFACES BATCH 5 PART 2 (2026-11-27) — the sequence, stage by stage. */
  illustration: {
    label: 'The import sequence, in order',
    intro:
      'Every consignment runs the same stages. The order is the point: a document that arrives after the goods is a problem, not a formality.',
    stages: [
      {
        label: 'Documents read',
        detail: 'The specification and the safety documentation are read before anything is booked to travel.',
      },
      {
        label: 'Entry prepared',
        detail: 'The entry is prepared and the amount owed is established while the goods are still where they are.',
      },
      {
        label: 'Cleared',
        detail: 'The consignment is cleared, and anything the border asks for is answered while it is still in transit.',
      },
      {
        label: 'Into stock',
        detail: 'The goods move into UK stock with the evidence that the earlier stages happened.',
      },
    ],
  },
  limits: [
    'We do not move goods ahead of a missing document, and we do not promise a launch date regardless of it.',
    'We do not decide which compliance documents your product needs — that is set by the product and its category.',
    'We do not clear a consignment we cannot evidence.',
  ],
  cta: { label: 'Check your product fits', to: 'explore-uk-market-fit' },
};

const PAGE_BRAND_REGISTRY: PublicContentPage = {
  id: 'brand-registry',
  path: '/infrastructure/brand-registry',
  navGroup: 'Retail Infrastructure',
  navLabel: 'Brand Registry, Content & Merchandising',
  title: 'Brand Registry, Content & Merchandising',
  description:
    'How a brand catalogue is registered, written and merchandised in UK retail so the listing matches the brand.',
  eyebrow: 'Retail Infrastructure',
  heading: 'Your brand, presented the way you would present it.',
  lede:
    'The listing is the shop. Mercenta builds and maintains it — titles, images, copy and structure — against your brand rules rather than against a template.',
  hero: 'page-product-display',
  blocks: [
    {
      heading: 'What we build and hold',
      bullets: [
        'Product listings that meet your brand standards.',
        'Image and copy libraries kept consistent across the range.',
        'A record of every change to a public listing, and who approved it.',
      ],
      media: 'shelves-grocery',
    },
    {
      heading: 'Who decides the words',
      body: [
        'You do. Mercenta drafts, you approve, and the approved version is what publishes. A brand’s own language is not rewritten to suit a template.',
      ],
    },
    {
      heading: 'What you can see',
      body: [
        'Every listing, its current state and what changed since you last looked. Nothing about your brand goes live without an approved version behind it.',
      ],
    },
  ],
  /* §PUBLIC SURFACES BATCH 5 PART 2 (2026-11-27) — a listing's own path, stage by stage. */
  illustration: {
    label: 'A listing, from draft to live',
    intro:
      'Every listing follows the same path. Nothing publishes without an approved version behind it.',
    stages: [
      {
        label: 'Your brand rules',
        detail:
          'The first step is capturing how your brand is written and shown, so the listing starts from your standard rather than a template.',
      },
      {
        label: 'Drafted',
        detail: 'The title, the images and the copy are drafted against your rules and what the category expects.',
      },
      {
        label: 'You approve',
        detail:
          'You read it and approve it. The approved version is the one that publishes, and the draft stays on the record.',
      },
      {
        label: 'Watched',
        detail:
          'Once live it is checked against the product you actually supply, and every change is recorded with who approved it.',
      },
    ],
  },
  limits: [
    'We do not rewrite your brand’s language to suit a template.',
    'We do not publish a listing, an image or a claim you have not approved.',
    'We do not invent a product detail that is not on the specification.',
  ],
  cta: { label: 'Talk to us about your brand', to: 'contact' },
};

const PAGE_PRICING_GOVERNANCE: PublicContentPage = {
  id: 'pricing-governance',
  path: '/infrastructure/pricing-governance',
  navGroup: 'Retail Infrastructure',
  navLabel: 'Pricing Governance & Channel Integrity',
  title: 'Pricing Governance & Channel Integrity',
  description:
    'How Mercenta holds a single price position for a brand in UK retail, and what happens when it moves.',
  eyebrow: 'Retail Infrastructure',
  heading: 'One price position, held in place.',
  lede:
    'Price drift is what erodes a brand in a new market: three sellers, three prices, and a customer who learns to wait. Mercenta holds one price position and defends it.',
  hero: 'shelves-grocery',
  blocks: [
    {
      heading: 'What we watch',
      bullets: [
        'The price a customer actually pays, not the price on a label.',
        'Where the product appears, and at what price.',
        'Any movement that undercuts the agreed position.',
      ],
    },
    {
      heading: 'What we do about it',
      body: [
        'We correct it, and we record the correction with its reason. Where a correction needs a commercial decision, it comes to you before anything is changed.',
      ],
    },
    {
      heading: 'What you see',
      body: [
        'The agreed position, the current position, and every movement between the two — in the same place, with the date it happened.',
      ],
      media: 'desk-tablet',
    },
  ],
  /* §PUBLIC SURFACES BATCH 5 PART 2 (2026-11-27) — the loop that keeps a position where it was set. */
  illustration: {
    label: 'A price position, held',
    intro:
      'A position is not set once. This is the loop that keeps it where you agreed it should be.',
    stages: [
      { label: 'Agreed', detail: 'You set the position, and what may move and what may not.' },
      {
        label: 'Monitored',
        detail: 'The price a customer actually pays is watched, not the label on the page.',
      },
      {
        label: 'Corrected',
        detail:
          'A movement that undercuts the position is corrected, and the correction is recorded with its reason.',
      },
      {
        label: 'Escalated',
        detail: 'A correction that needs a commercial decision comes to you before anything changes.',
      },
    ],
  },
  limits: [
    'We do not set your prices, and we do not move the position without your agreement.',
    'We do not police sellers with legal threats, and we do not claim to control a market.',
    'We do not hide a correction that was made against your position.',
  ],
  cta: { label: 'Talk to us about your brand', to: 'contact' },
};

const PAGE_ADVERTISING_SEARCH: PublicContentPage = {
  id: 'advertising-search',
  path: '/infrastructure/advertising-search',
  navGroup: 'Retail Infrastructure',
  navLabel: 'Advertising & Search Optimisation',
  title: 'Advertising & Search Optimisation',
  description:
    'How Mercenta makes a product visible to buyers already searching for it, and reports honestly on what it costs.',
  eyebrow: 'Retail Infrastructure',
  heading: 'Found by the people already looking.',
  lede:
    'Demand already exists for most products. The work is being visible at the moment somebody searches — without paying to reach people who were never going to buy.',
  hero: 'desk-laptop',
  blocks: [
    {
      heading: 'What we run',
      bullets: [
        'Paid placement against the terms that actually convert.',
        'Organic visibility work on the listing itself.',
        'Spend limits you set, rather than limits discovered afterwards.',
      ],
      media: 'desk-phone',
    },
    {
      heading: 'What we report',
      body: [
        'Spend, what it produced, and what it cost per sale — by term. A term that does not pay is stopped, and the date it was stopped is on the record.',
      ],
    },
    {
      heading: 'Where the ceiling sits',
      body: [
        'You set the ceiling before anything runs, and a campaign that reaches it stops there. Reaching the ceiling is a decision you made, not a bill that arrives afterwards.',
      ],
    },
  ],
  /* §PUBLIC SURFACES BATCH 5 PART 2 (2026-11-27) — how a term is added, and how it is dropped. */
  illustration: {
    label: 'A search term, from found to kept',
    intro:
      'Most of the work is deciding what not to pay for. This is how a term is added, and how it is dropped.',
    stages: [
      {
        label: 'Found',
        detail: 'A term is chosen because people already search it and the product answers it.',
      },
      {
        label: 'Tested',
        detail: 'A small, capped amount of spend establishes whether the term converts.',
      },
      {
        label: 'Kept or stopped',
        detail:
          'A term that converts is kept and given more room; one that does not is stopped, and the date is recorded.',
      },
      {
        label: 'Reported',
        detail:
          'Spend, what it produced and what it cost per sale appear together, so the decision can be checked.',
      },
    ],
  },
  limits: [
    'We do not promise a position, a volume or a return. Nobody can promise those, and a supplier who does is guessing with your money.',
    'We do not spend beyond the ceiling you set.',
    'We do not keep a term running because it looks busy rather than because it pays.',
  ],
  cta: { label: 'Explore UK market fit', to: 'explore-uk-market-fit' },
};

const PAGE_CREATIVE_ASSETS: PublicContentPage = {
  id: 'creative-assets',
  path: '/infrastructure/creative-assets',
  navGroup: 'Retail Infrastructure',
  navLabel: 'Creative Assets & Merchandising',
  title: 'Creative Assets & Merchandising',
  description:
    'The product photography, copy and placement assets a brand needs to sell well in UK retail.',
  eyebrow: 'Retail Infrastructure',
  heading: 'The images and the words that actually sell it.',
  lede:
    'A product photographed badly reads as a cheap product. Mercenta produces the assets a category needs — on-brand, correctly sized for each placement, and reusable.',
  hero: 'page-photo-studio',
  blocks: [
    {
      heading: 'What we produce',
      bullets: [
        'Product photography against each placement’s requirements.',
        'Copy that describes the product accurately.',
        'Assets sized for every placement, from a search result to a detail page.',
      ],
      media: 'page-product-display',
    },
    {
      heading: 'What you approve',
      body: [
        'Every asset follows your brand rules and is approved before it publishes. Nothing about the product is invented — no claim, no comparison, and no ingredient that is not on the specification.',
      ],
    },
    {
      heading: 'What it saves you',
      body: [
        'A photographer, a copywriter and a designer, commissioned once per range instead of once per market.',
      ],
    },
  ],
  /* §PUBLIC SURFACES BATCH 5 PART 2 (2026-11-27) — one shoot, and everything it has to produce. */
  illustration: {
    label: 'One shoot, every placement',
    intro:
      'A single product shoot produces everything the placements need. The sequence is the same for every product, in every category.',
    stages: [
      {
        label: 'Brief',
        detail:
          'Your brand rules and what the category expects of an image are read first, so the shoot starts from a specification.',
      },
      {
        label: 'Shot',
        detail:
          'Photography is produced against that specification, including the angles and the detail shots the placements ask for.',
      },
      {
        label: 'Written',
        detail: 'Copy is written to describe the product, and nothing is added that is not on the specification.',
      },
      {
        label: 'Sized',
        detail:
          'Each asset is cut for the placement it will appear in, from a small search result to a full detail page.',
      },
    ],
  },
  limits: [
    'We do not invent a claim, a comparison or an ingredient that is not on the specification.',
    'We do not publish an asset you have not approved, and we do not restyle your brand to follow a trend.',
    'We do not book a fresh shoot for every placement — removing that cost is the point of the work.',
  ],
  cta: { label: 'Talk to us about your brand', to: 'contact' },
};

const PAGE_PRODUCT_LAUNCH: PublicContentPage = {
  id: 'product-launch',
  path: '/infrastructure/product-launch',
  navGroup: 'Retail Infrastructure',
  navLabel: 'Product Launch & Catalogue Management',
  title: 'Product Launch & Catalogue Management',
  description:
    'How a product launches into UK retail in the right order, so visibility arrives when the stock can satisfy it.',
  eyebrow: 'Retail Infrastructure',
  heading: 'A launch, not a listing going live.',
  lede:
    'Most launches fail quietly: the listing appears, nobody finds it, and the stock sits. Mercenta launches in an order that puts a found, correct, in-stock product in front of buyers.',
  hero: 'warehouse-aisle',
  blocks: [
    {
      heading: 'Before it goes live',
      bullets: [
        'Compliance satisfied and evidenced.',
        'Listing built and approved.',
        'Stock in place and replenishable.',
        'Price position agreed and set.',
      ],
      media: 'boxes-stacked',
    },
    {
      heading: 'On launch',
      body: [
        'Visibility work starts on the day the product can actually be bought. Being found before you can be bought is money spent for nothing.',
      ],
    },
    {
      heading: 'After launch',
      body: [
        'Replenishment, listing health and price position are watched continuously, because a launch is a start rather than an event.',
      ],
    },
  ],
  /* §PUBLIC SURFACES BATCH 5 PART 2 (2026-11-27) — the order a launch has to run in. */
  illustration: {
    label: 'A launch, in order',
    intro:
      'The order is deliberate: a product should be found only when it can be bought. This is the sequence that makes that true.',
    stages: [
      {
        label: 'Ready',
        detail: 'Compliance is satisfied and evidenced, and the listing is built and approved.',
      },
      {
        label: 'Stocked',
        detail: 'Stock is in place and replenishable, so a first order does not become a delay.',
      },
      { label: 'Priced', detail: 'The price position is agreed and set before anything is promoted.' },
      { label: 'Found', detail: 'Visibility work starts on the day the product can be bought, not before.' },
    ],
  },
  limits: [
    'We do not promote a product before it can be bought.',
    'We do not launch with a listing we cannot keep in stock.',
    'We do not promise that a launch produces sales. A launch removes the reasons a good product fails; it does not decide the outcome.',
  ],
  cta: { label: 'Explore UK market fit', to: 'explore-uk-market-fit' },
};

const PAGE_INSTITUTIONAL_PARTNERS: PublicContentPage = {
  id: 'institutional-partners',
  path: '/solutions/institutional-partners',
  navGroup: 'Solutions',
  navLabel: 'Institutional Partners',
  title: 'Institutional Partners',
  description:
    'How development finance institutions, export agencies, embassies and trade bodies partner with Mercenta to bring their brands into the UK.',
  eyebrow: 'Solutions',
  heading: 'A route into the UK for the brands you represent.',
  lede:
    'Development finance institutions, export promotion agencies, embassies and trade bodies already carry brands that could sell in the UK and cannot get there alone. This page sets out what Mercenta does for institutions like these.',
  blocks: [
    {
      heading: 'Who this is for',
      bullets: [
        'Development finance institutions with portfolio brands.',
        'Export promotion agencies and trade bodies.',
        'Embassies and consulates supporting home-market exporters.',
        'Accelerators and investment funds with consumer brands.',
      ],
    },
    {
      heading: 'What it makes possible',
      body: [
        'A compliant route to UK retail for the brands in your portfolio, one accountable counterparty instead of several, and reporting you can put in front of your own board or funders.',
      ],
    },
    {
      heading: 'What we do not claim',
      body: [
        'Naming a kind of institution is not a claim that any named organisation is a Mercenta partner, client or endorser. Nothing on this page should be read as an existing relationship or an approval by any institution.',
      ],
    },
  ],
  cta: { label: 'Talk to us about working together', to: 'contact' },
};

const PAGE_UK_RETAIL_GUIDE: PublicContentPage = {
  id: 'uk-retail-guide',
  path: '/resources/uk-retail-guide',
  navGroup: 'Resources',
  navLabel: 'UK Retail Guide',
  title: 'UK Retail Guide',
  description:
    'The UK retail market with its sources attached — every figure names the body that published it and the period it covers.',
  eyebrow: 'Resources',
  heading: 'The UK retail market, with its sources attached.',
  lede:
    'A market guide is only useful if you can check it. Every figure on this page names the body that published it and the period it covers, and a figure with no publisher is not shown at all.',
  blocks: [
    {
      heading: 'Where the numbers come from',
      bullets: [
        'Office for National Statistics — retail sales, prices and population.',
        'World Bank — trade and output for the UK and for corridor countries.',
        'Published periods only. A projection is labelled as one, and an estimate is never dressed as a measurement.',
      ],
    },
    {
      heading: 'How to read a figure here',
      body: [
        'Each figure carries its publisher, its publication and the period it describes. If a source has not answered, the figure is absent rather than guessed, and the page says which source is missing.',
      ],
    },
    {
      heading: 'What this is not',
      body: [
        'This is not a sales forecast for your product. It describes the market a product would enter, so a conversation about your brand can start from real numbers instead of from optimism.',
      ],
    },
  ],
  availability: {
    label: 'Live figures — sources being connected',
    detail:
      'The ONS and World Bank sources are declared and reachable, but this page does not yet render their live figures. Rather than show an old number as if it were current, no figure is shown until the live connection is in place.',
  },
  cta: { label: 'Explore UK market fit', to: 'explore-uk-market-fit' },
};

export const PUBLIC_CONTENT_PAGES: readonly PublicContentPage[] = [
  ...PUBLIC_PLATFORM_PAGES,
  /* §NAVIGATION REPAIR (2026-11-20) — the seven "1P Infrastructure" pages that
     PUBLIC_NAV linked to but which did not exist, so every one rendered blank. */
  PAGE_VENDOR_OF_RECORD,
  PAGE_IMPORT_COMPLIANCE,
  PAGE_BRAND_REGISTRY,
  PAGE_PRICING_GOVERNANCE,
  PAGE_ADVERTISING_SEARCH,
  PAGE_CREATIVE_ASSETS,
  PAGE_PRODUCT_LAUNCH,
  ...PUBLIC_SOLUTION_PAGES,
  /* §NAVIGATION REPAIR — "Institutional Partners" sat in the Solutions group
     with no page behind it. */
  PAGE_INSTITUTIONAL_PARTNERS,
  ...PUBLIC_COMPANY_PAGES,
  PUBLIC_CATEGORY_PAGE,
  ...PUBLIC_COMMERCIAL_PAGES,
  ...PUBLIC_RESOURCE_PAGES,
  /* §NAVIGATION REPAIR — "UK Retail Guide" sat in Resources with no page. */
  PAGE_UK_RETAIL_GUIDE,
];

/** Path → page, for the route resolver. */
export const PUBLIC_CONTENT_PAGE_BY_PATH: Record<string, PublicContentPage> = Object.fromEntries(
  PUBLIC_CONTENT_PAGES.map((p) => [p.path, p])
);

/** Page id → page. */
export const PUBLIC_CONTENT_PAGE_BY_ID: Record<string, PublicContentPage> = Object.fromEntries(
  PUBLIC_CONTENT_PAGES.map((p) => [p.id, p])
);

/** The navigation groups, DERIVED from the pages themselves (never retyped). */
export const PUBLIC_CONTENT_NAV_GROUPS: readonly { group: string; pages: PublicContentPage[] }[] = [
  'Platform',
  'Solutions',
  'Company',
  'Commercial',
  'Resources',
].map((group) => ({ group, pages: PUBLIC_CONTENT_PAGES.filter((p) => p.navGroup === group) }));

