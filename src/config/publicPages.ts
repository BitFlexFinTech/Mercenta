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
    hero: 'boxes-stacked',
    blocks: [
      {
        heading: 'What lands in your workspace',
        bullets: [
          'The order itself, with quantities, lines and the value behind it.',
          'Anything that has to be resolved before it can move.',
          'The date it has to leave by.',
        ],
        media: 'desk-laptop',
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
    /* §PUBLIC SURFACES BATCH 5 PART 3 (2026-11-27) — the example that shows the service running. */
    illustration: {
      label: 'An order, from arrival to decision',
      intro:
        'Every order runs the same path. The stages do not change with the size of the order or the number of lines on it.',
      stages: [
        {
          label: 'It arrives',
          detail:
            'An order raised against Mercenta by a UK buyer appears in your workspace, with its lines and quantities.',
        },
        {
          label: 'It is read',
          detail:
            'Anything that has to be resolved before the order can move is identified and shown against it, rather than left to be discovered later.',
        },
        {
          label: 'You decide',
          detail:
            'One decision, on the record: approve it, amend it or decline it. Nothing moves until you have answered.',
        },
        {
          label: 'It moves',
          detail:
            'The movement, the paperwork and the reply to the buyer are carried for you, and the outcome appears beside the decision you made.',
        },
      ],
    },
    limits: [
      'We do not approve an order on your behalf, and we do not treat silence as approval.',
      'We do not change quantities or prices without your decision.',
      'We do not promise that an order will arrive. We carry the orders that do.',
    ],
    cta: { label: 'Explore UK Market Fit', to: 'explore-uk-market-fit' },
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
    hero: 'desk-tablet',
    blocks: [
      {
        heading: 'What is in the portal',
        bullets: [
          'Orders, and the decision waiting on each one.',
          'Consignments in transit, with their milestones.',
          'Documents and compliance, and what is due for renewal.',
          'Invoices, settlements and every deduction explained against the order behind it.',
        ],
        media: 'warehouse-aisle',
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
    /* §PUBLIC SURFACES BATCH 5 PART 3 (2026-11-27) — one product's life, stage by stage. */
    illustration: {
      label: 'Your product, from listing to settlement',
      intro:
        'This is the life of one product in the portal. Every stage sits on the same record, so a figure at one end can be checked against the order at the other.',
      stages: [
        {
          label: 'Registered',
          detail:
            'The product is set up with the requirements and documents that apply to it, and shown as ready or waiting.',
        },
        {
          label: 'Ordered',
          detail: 'An order arrives against it, and the decision waiting on you appears beside it.',
        },
        {
          label: 'Moved',
          detail: 'The consignment is tracked with its milestones, from collection through to delivery.',
        },
        {
          label: 'Settled',
          detail:
            'The invoice and every deduction are shown against the order behind them, and what you were paid sits on the same record.',
        },
      ],
    },
    limits: [
      'We do not show you another brand’s products, orders or money. The workspace is yours alone.',
      'We do not leave a deduction unexplained: every line is shown against the order behind it.',
      'We do not create access for anyone who has not been given a named account during onboarding.',
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
    hero: 'shelves-grocery',
    blocks: [
      {
        heading: 'What is checked',
        bullets: [
          'Whether every requirement that applies to the product is present and current.',
          'Whether the listing still matches the product you actually supply.',
          'Anything that has lapsed and would put an order on hold.',
        ],
        media: 'page-product-display',
      },
      {
        heading: 'How you hear about it',
        body: [
          'A finding appears against the product, with what is missing and what to do about it. You keep the decisions about the product; we keep the requirement current.',
        ],
      },
      {
        heading: 'What stays yours',
        body: [
          'The product, the description and the decision about both. A finding is a prompt rather than an instruction: what changes about your product remains your call.',
        ],
      },
    ],
    /* §PUBLIC SURFACES BATCH 5 PART 3 (2026-11-27) — what happens between one check and the next. */
    illustration: {
      label: 'A listing, checked and corrected',
      intro:
        'This is what happens between one check and the next. The point is that you hear about a problem while it is still cheap to fix.',
      stages: [
        {
          label: 'Checked',
          detail: 'Every requirement that applies to the product is read against what is actually held for it.',
        },
        {
          label: 'Compared',
          detail: 'The listing is compared with the product you supply, so a description that has drifted is found.',
        },
        {
          label: 'Reported',
          detail: 'A finding appears against the product, naming what is missing and what to do about it.',
        },
        {
          label: 'Corrected',
          detail: 'You supply or approve the correction, and the finding closes with the date it was resolved.',
        },
      ],
    },
    limits: [
      'We do not change your listing without your approval.',
      'We do not decide what a product must have: that is set by the product and its category, not by us.',
      'We do not assume a listing stays healthy. It is watched, and a finding is raised when it is not.',
    ],
    cta: { label: 'Explore UK Market Fit', to: 'explore-uk-market-fit' },
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
    hero: 'desk-laptop',
    blocks: [
      {
        heading: 'What you can see',
        bullets: [
          'Sales by product and by period, from the orders themselves.',
          'Movement and delivery performance.',
          'Settlements and deductions, reconciled against the orders behind them.',
        ],
        media: 'desk-tablet',
      },
      {
        heading: 'Why it is trustworthy',
        body: [
          'Every number is derived from a tenant-scoped record. Nothing on Mercenta is a decorative chart: if a figure appears, there is a record behind it.',
        ],
      },
      {
        heading: 'Who can see a report',
        body: [
          'A report is scoped to your workspace like everything else. No figure on it is drawn from another brand’s trading, and there is no shared view across brands.',
        ],
      },
    ],
    /* §PUBLIC SURFACES BATCH 5 PART 3 (2026-11-27) — how a figure is traced back to its record. */
    illustration: {
      label: 'One figure, traced back to its record',
      intro:
        'A report is only worth reading if you can follow a number back to the thing that produced it. This is the path every figure here takes.',
      stages: [
        {
          label: 'The order',
          detail: 'The order is the first record, carrying its lines, quantities and the value behind it.',
        },
        {
          label: 'The movement',
          detail: 'The consignment and its delivery are recorded against that same order.',
        },
        {
          label: 'The settlement',
          detail: 'The invoice, the payment and any deduction are matched to it.',
        },
        {
          label: 'The report',
          detail:
            'A figure is summed from those records, so a report and an order can never disagree about the same thing.',
        },
      ],
    },
    limits: [
      'We do not publish a figure we cannot point at a record for.',
      'We do not present an estimate as though it were a measurement.',
      'We do not build a report around another brand’s trading.',
    ],
    cta: { label: 'Explore UK Market Fit', to: 'explore-uk-market-fit' },
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
    /* §PUBLIC SURFACES BATCH 5 PART 4 (2026-11-28) — the page opens with a picture rather than as
       text only. The goods in this service arrive by sea, and a container being worked at a terminal
       is the honest opening image for a brand sending its product into a new market. */
    hero: 'port-cranes',
    blocks: [
      {
        heading: 'What you do not have to build',
        bullets: [
          'A UK company, or a UK address for your customers to deal with.',
          'Your own warehousing and fulfilment operation.',
          'A compliance function to keep documents current.',
        ],
        /* The warehousing a brand would otherwise have had to build, shown rather than described. */
        media: 'warehouse-racks',
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
    /* §PUBLIC SURFACES BATCH 5 PART 4 (2026-11-28) — the worked example. The sequence only: it
       carries no amount, no price and no percentage, because an illustration of the ORDER of the
       work must never become an invented claim about the money it produces. */
    illustration: {
      label: 'From your factory to a UK shelf',
      intro:
        'The stages below run in the same order whether you are sending one pallet or a container. This is the sequence of the work, not a forecast of the volume.',
      stages: [
        {
          label: 'Look first',
          detail:
            'Before anything is shipped, we tell you honestly whether the UK market wants this product, and what would have to change if it does not.',
        },
        {
          label: 'Fit to sell here',
          detail:
            'The product is checked against what UK retail expects of it — labelling, safety paperwork, packaging and the space it takes on a shelf.',
        },
        {
          label: 'Arrive',
          detail:
            'Goods move into the UK and are held here, so you are not running an import operation from another country while also making the product.',
        },
        {
          label: 'Sell and settle',
          detail:
            'Orders are picked, packed and despatched from the UK, and the money that comes back is reconciled and settled with you.',
        },
      ],
    },
    limits: [
      'We do not set up a UK company for you; what we remove is the need for one, not the choice to have one.',
      'We do not tell you the UK wants your product before we have looked, and we do not take on a product that does not fit.',
      'We do not promise that orders will come. We carry the orders that do.',
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
    /* §PUBLIC SURFACES BATCH 5 PART 4 (2026-11-28) — the page opens with a picture. This page is
       about volume and the work volume brings, so it opens on a working warehouse aisle rather than
       on a desk. */
    hero: 'warehouse-aisle',
    blocks: [
      {
        heading: 'Where the weight comes from',
        bullets: [
          'More orders means more to track, reconcile and keep on top of.',
          'More products means more documentation to keep current.',
          'More movement means more deductions to explain.',
        ],
        /* The tracking and reconciliation work, shown as the desk it lands on today. */
        media: 'desk-laptop',
      },
      {
        heading: 'What changes',
        body: [
          'The work moves to one workspace and one counterparty, with the decisions still yours. You keep the product and the brand; we keep the retail side running.',
        ],
      },
    ],
    /* §PUBLIC SURFACES BATCH 5 PART 4 (2026-11-28) — the worked example: what growth adds, and which
       of it stops landing on the brand. No amount, no price and no percentage appears here. */
    illustration: {
      label: 'Where the extra work goes',
      intro:
        'Growth adds orders, products and movement. The stages below show what each of those adds, and which of it stops landing on your desk.',
      stages: [
        {
          label: 'More orders',
          detail:
            'Every new order has to be captured, confirmed and reconciled. Past a certain volume that stops being a spreadsheet and becomes a job.',
        },
        {
          label: 'More products',
          detail:
            'Each additional line needs its documentation kept current, or it holds up the orders sitting around it.',
        },
        {
          label: 'More movement',
          detail:
            'More despatches mean more tracking, more exceptions, and more paperwork to answer for when something does not go to plan.',
        },
        {
          label: 'One workspace',
          detail:
            'All of it lands in one place, with the decisions still yours and the administration no longer sitting on your side.',
        },
      ],
    },
    limits: [
      'We do not take over your brand, your pricing or your product decisions — those stay with you.',
      'We do not promise that more volume is more profit. What is charged and what is deducted are shown apart, so you can judge it yourself.',
      'We do not hide a charge inside a figure, and we do not present a projection as though it were a result.',
    ],
    cta: { label: 'Contact Mercenta', to: 'contact' },
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
    /* §PUBLIC SURFACES BATCH 5 PART 4 (2026-11-28) — this page is a conversation between a partner
       and Mercenta, so it opens on a working desk with a phone and a notebook rather than on goods. */
    hero: 'desk-phone',
    blocks: [
      {
        heading: 'How it fits',
        bullets: [
          'You keep the client relationship and the brand work.',
          'Mercenta operates the orders, movement, paperwork and payments.',
          'The client sees one workspace, and so do you.',
        ],
        /* The part the agency hands over: goods leaving on the client’s behalf. */
        media: 'boxes-stacked',
      },
      {
        heading: 'Talking to us',
        body: [
          'If you would like to discuss working with Mercenta on behalf of a client, get in touch and we will explain how the arrangement works.',
        ],
      },
    ],
    /* §PUBLIC SURFACES BATCH 5 PART 4 (2026-11-28) — the worked example: an engagement from the
       agency’s side. No amount, no price and no percentage appears here. */
    illustration: {
      label: 'How a client engagement runs',
      intro:
        'You keep the strategy and the brand work. The stages below are the operating layer underneath, which your client never has to be told to go and find.',
      stages: [
        {
          label: 'You bring the client',
          detail:
            'The relationship stays yours, and so does everything you were engaged to do — the positioning, the creative and the growth plan.',
        },
        {
          label: 'We take the operation',
          detail:
            'Orders, movement, paperwork and payment for that client sit with Mercenta instead of on their desk or on yours.',
        },
        {
          label: 'One view for both',
          detail:
            'Your client sees what is moving in their own workspace, and you see the same picture, so nothing has to be relayed second-hand.',
        },
        {
          label: 'You stay the front door',
          detail:
            'Day to day the client deals with you; we are the part behind you that they do not have to manage themselves.',
        },
      ],
    },
    limits: [
      'The client relationship stays yours. We do not take it over or stand in front of it.',
      'We do not do the brand, strategy or creative work — that is what your business is for.',
      'We do not accept a client product that does not fit an approved category, or one that cannot be documented.',
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
    /* §PUBLIC SURFACES BATCH 5 PART 5 (2026-11-28) — the page opens with a picture rather than as
       text only. The subject is the operation a brand would otherwise have had to build, and high-bay
       racking in a distribution centre is the honest image of it. */
    hero: 'warehouse-racks',
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
        /* The reporting surface the page promises — “one workspace, updated as it moves” — shown
           rather than described. */
        media: 'desk-tablet',
      },
      {
        heading: 'What we will not do',
        body: [
          'We will not tell you the UK wants your product before we have looked. We will not publish a number we cannot point at a record for. And we will not claim a relationship we do not hold.',
        ],
      },
    ],
    /* §PUBLIC SURFACES BATCH 5 PART 5 (2026-11-28) — the worked example: the work that moves off a
       brand’s desk and into one place, stage by stage. The SEQUENCE only — no amount, no price and no
       percentage, because an illustration of the order of the work is never a claim about the money
       it produces. */
    illustration: {
      label: 'The job that leaves your desk',
      intro:
        'Mercenta takes on the retail side of the business — everything that is not the product itself. These are the stages that move off your desk and into one place.',
      stages: [
        {
          label: 'Demand',
          detail:
            'What the UK actually wants from the range is worked out before anything is committed, so the first decision is an informed one.',
        },
        {
          label: 'Orders',
          detail:
            'Orders are captured, confirmed and tracked as they arrive, rather than being re-typed into a spreadsheet by hand.',
        },
        {
          label: 'Movement',
          detail:
            'Goods are held, picked, packed and despatched from the UK, with the tracking sitting in the same place as the order.',
        },
        {
          label: 'Money',
          detail:
            'What comes back is reconciled against what was sent and settled with you, so both sides are looking at the same picture.',
        },
      ],
    },
    limits: [
      'We do not make the product, set your prices, or decide what your brand stands for — those stay with you.',
      'We do not promise that the UK will buy, and we will say so plainly when the evidence says it will not.',
      'We do not publish a figure we cannot point at a record for.',
    ],
    cta: { label: 'Explore UK Market Fit', to: 'explore-uk-market-fit' },
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
    /* §PUBLIC SURFACES BATCH 5 PART 5 (2026-11-28) — the page opens with a picture. A partnership is
       an arrangement worked out between people, so it opens on a working session over plans rather
       than on goods. */
    hero: 'desk-laptop',
    blocks: [
      {
        heading: 'Ways to work together',
        bullets: [
          'Referring a brand that needs the UK retail side operated.',
          'Operating as a service partner alongside Mercenta.',
          'Discussing a distribution arrangement for a specific category.',
        ],
        /* Goods ready for dispatch: what a distribution arrangement actually moves. */
        media: 'boxes-stacked',
      },
      {
        heading: 'What we ask of a partner',
        body: [
          'Accuracy about what is being offered, and honesty about what a brand can expect. We hold ourselves to the same standard in public.',
        ],
      },
    ],
    /* §PUBLIC SURFACES BATCH 5 PART 5 (2026-11-28) — the worked example: the order a partnership runs
       in, whatever shape it takes. The sequence only — no amount, no price and no percentage. */
    illustration: {
      label: 'How it runs, start to finish',
      intro:
        'A referral, an operating arrangement and a distribution agreement follow the same order. These are the stages, not the terms.',
      stages: [
        {
          label: 'The conversation',
          detail:
            'We start with what the client needs and what you already do for them, so the arrangement is built around a real gap rather than a template.',
        },
        {
          label: 'The fit',
          detail:
            'We are honest about whether it fits — the categories, the volume and the way the client already works — before anything is agreed.',
        },
        {
          label: 'The agreement',
          detail:
            'What each side does, and who owns the client relationship, is written down, so nothing is left to an assumption made on either side.',
        },
        {
          label: 'The operation',
          detail:
            'From then on the retail side runs in one place, and the partner sees the same picture the brand does, at the level they are entitled to.',
        },
      ],
    },
    limits: [
      'We do not take a partner’s clients, or approach them directly behind the partner’s back.',
      'We do not claim a relationship or a capability we do not hold, in public or in private.',
      'We do not promise a volume of work — what it produces depends on the brands it serves.',
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
      /* §PUBLIC SURFACES BATCH 5 PART 4 (2026-11-28) — a picture inside a block, so the page is not
         a column of cards and text with a single photograph at the top. */
      media: 'shelves-aisle',
    },
    {
      heading: 'Not sure which one you are?',
      body: [
        'A product sometimes sits between two. Tell us what you make and we will tell you where it belongs, or that it does not fit.',
      ],
    },
  ],
  /* §PUBLIC SURFACES BATCH 5 PART 4 (2026-11-28) — the worked example: how a product is placed. The
     sequence only; it carries no amount, no price and no percentage. */
  illustration: {
    label: 'How a product is placed in a category',
    intro:
      'Placement is decided by what the product is and how it behaves in retail, not by where a brand would prefer it to sit.',
    stages: [
      {
        label: 'Tell us what you make',
        detail:
          'A short description of the product is enough to start; the specification and the packaging follow if it looks like a fit.',
      },
      {
        label: 'We place it',
        detail:
          'The product is matched to the approved category it actually belongs in, including where two of them are close together.',
      },
      {
        label: 'It is measured',
        detail:
          'That category’s own expectations — documentation, safety, packaging and size — are what the product is then measured against.',
      },
      {
        label: 'You hear either way',
        detail:
          'If the product does not fit an approved category, we say so plainly rather than take it on and hope it finds a home.',
      },
    ],
  },
  limits: [
    'We do not take on a product that sits outside the approved categories, however good the product is.',
    'We do not move a product into a category to make it fit; the product decides where it belongs.',
    'We do not add a category because a brand asks for one. The approved list is what the business operates in.',
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
    /* §PUBLIC SURFACES BATCH 5 PART 6 (2026-11-28) — the page opens with a picture rather than as text
       only. The subject is an arrangement worked out and written down, and a notebook and pen on a desk
       is the honest image of it: a published price list is precisely what this page says does not
       exist. */
    hero: 'desk-notebook',
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
          'What is charged and what is deducted, shown separately so nothing hides inside the total.',
        ],
        /* The working session the section describes — terms worked through together, over the plans
           for the range. */
        media: 'desk-laptop',
      },
      {
        heading: 'How to get a real answer',
        body: [
          'Tell us what you make and where you sell. We will tell you what the arrangement would look like — including if the honest answer is that it does not suit you.',
        ],
      },
    ],
    /* §PUBLIC SURFACES BATCH 5 PART 6 (2026-11-28) — the worked example: the order in which terms are
       agreed. The SEQUENCE only — no amount, no price and no percentage, because a page about pricing
       must never publish a figure it has not agreed with anybody. */
    illustration: {
      label: 'How terms are agreed',
      intro:
        'An arrangement is worked out with the brand rather than taken off a price list. These are the stages, in the order they happen.',
      stages: [
        {
          label: 'What you make',
          detail:
            'The range, the volumes and where the products already sell are the starting point, because the work follows the products.',
        },
        {
          label: 'What we would carry',
          detail:
            'Which parts of the retail side Mercenta would take on is set out plainly, so both sides are describing the same job.',
        },
        {
          label: 'The basis, in writing',
          detail:
            'How the arrangement is paid for is agreed and written down before anything moves, with what is charged and what is deducted listed separately.',
        },
        {
          label: 'Looked at again',
          detail:
            'The arrangement is reviewed as the products and the volumes change, rather than being fixed once and left alone.',
        },
      ],
    },
    limits: [
      'We do not publish a price list, and we do not quote a number before we understand the products and the work involved.',
      'We do not hide a charge inside a total; what is charged and what is deducted are shown separately.',
      'We do not agree terms that suit us and not the brand — if the honest answer is that it does not fit, we say so.',
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
    /* §PUBLIC SURFACES BATCH 5 PART 6 (2026-11-28) — the page opens with a picture. The subject is
       reaching a person, and a telephone beside an open notebook on a desk is the honest image of it. */
    hero: 'desk-phone',
    blocks: [
      {
        heading: 'What to tell us',
        bullets: [
          'What you make, and where it is made.',
          'Where you sell today, if anywhere.',
          'What you want the UK to look like in a year.',
        ],
        /* What you write down before getting in touch: the same desk, one step earlier. */
        media: 'desk-notebook',
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
    /* §PUBLIC SURFACES BATCH 5 PART 6 (2026-11-28) — the worked example: what happens after an enquiry
       arrives. The SEQUENCE only — no amount, no price and no percentage. */
    illustration: {
      label: 'What happens after you get in touch',
      intro:
        'An enquiry reaches a person rather than a queue. These are the stages that follow, whoever you are and whatever you are asking.',
      stages: [
        {
          label: 'It is read',
          detail:
            'The enquiry is read by someone who can answer it, rather than being sorted by a form or left to sit unanswered.',
        },
        {
          label: 'You hear back',
          detail:
            'You get a reply from a person — a real answer, or a straight question — rather than a message that says only that it arrived.',
        },
        {
          label: 'The fit is checked',
          detail:
            'If it needs it, we look at what you make and where it sells before saying whether the UK retail side is a fit for the product.',
        },
        {
          label: 'You hear either way',
          detail:
            'If it is not a fit you are told plainly and quickly, because a fast no is more useful to you than a slow maybe.',
        },
      ],
    },
    limits: [
      'We do not put an enquiry into a queue or an automated form; it reaches a person.',
      'We do not say the UK will want a product before we have looked at it.',
      'We do not pass an enquiry to anyone outside Mercenta.',
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
    /* §PUBLIC SURFACES BATCH 5 PART 7 (2026-11-28) — the page opens with a picture. The subject is
       the reading of the work — what the operation shows — so it opens on a reporting screen rather
       than on goods. */
    hero: 'desk-tablet',
    blocks: [
      {
        heading: 'Where these come from',
        body: [
          'Everything published here comes from the work itself — the enquiries we receive, the products we are asked to assess, and the problems brands bring us. Nothing is invented to fill a page.',
        ],
        /* The work the notes come from: the operation itself. */
        media: 'warehouse-aisle',
      },
      {
        heading: 'Starting with the market question',
        body: [
          'The most useful thing we publish is the honest read on whether the UK wants a product. That is what the UK Market Fit assessment exists to produce.',
        ],
      },
    ],
    /* §PUBLIC SURFACES BATCH 5 PART 7 (2026-11-28) — the worked example: how something observed in
       the work becomes a published note. The SEQUENCE only — no amount, no price and no percentage. */
    illustration: {
      label: 'How a note gets published',
      intro:
        'What appears here comes from the work rather than from a publishing schedule. These are the stages between something being noticed and it appearing on this page.',
      stages: [
        {
          label: 'It is noticed',
          detail:
            'Something shows up in the work — an enquiry we receive, a product we are asked to assess, or a problem a brand brings to us.',
        },
        {
          label: 'It is checked',
          detail:
            'Before it is written up, the observation is checked against the records behind it, so it describes what happened rather than what we assumed.',
        },
        {
          label: 'It is written plainly',
          detail:
            'It is written so a brand can act on it, without jargon and without a conclusion the evidence in front of us does not support.',
        },
        {
          label: 'It is published',
          detail:
            'If it cannot help a brand decide something, it is not published at all, however interesting the observation happens to be.',
        },
      ],
    },
    limits: [
      'We do not publish anything we cannot point at a record for.',
      'We do not publish a brand’s information, a client’s name or a figure without the agreement that has to sit behind it.',
      'We do not write a piece to fill a publishing schedule; nothing goes up that does not help a decision.',
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
    /* §PUBLIC SURFACES BATCH 5 PART 7 (2026-11-28) — the page opens with a picture. The page calls
       itself “shorter notes”, so it opens on the notebook the notes are written in. */
    hero: 'desk-notebook',
    blocks: [
      {
        heading: 'What gets written',
        bullets: [
          'What UK buyers actually ask a brand for.',
          'What has to be true before a product can be listed.',
          'What a brand keeps, and what it can hand over.',
        ],
        /* Answering a question properly, once, rather than leaving it to a call. */
        media: 'desk-laptop',
      },
      {
        heading: 'Nothing here is a sales page',
        body: ['If a piece does not help you decide something, it does not get published.'],
      },
    ],
    /* §PUBLIC SURFACES BATCH 5 PART 7 (2026-11-28) — the worked example: what happens to a question
       between it being asked and it being answered in writing. The SEQUENCE only — no figure. */
    illustration: {
      label: 'What a short note answers',
      intro:
        'Every piece here answers one practical question a brand has actually asked us. These are the stages between the question arriving and the answer being published.',
      stages: [
        {
          label: 'The question arrives',
          detail:
            'A brand asks something specific — what a buyer needs, what has to be true before a listing, or what can be handed over.',
        },
        {
          label: 'It is answered once',
          detail:
            'The answer is written down properly, so the same question can be answered without a call and without waiting on a reply.',
        },
        {
          label: 'It is kept short',
          detail:
            'A note is written to be read in one sitting, because a long piece nobody finishes does not help anybody decide.',
        },
        {
          label: 'It is checked',
          detail:
            'Anything stated as fact is checked against the work behind it before the note is published under Mercenta’s name.',
        },
      ],
    },
    limits: [
      'We do not publish a sales page dressed up as an article.',
      'We do not write about a brand or a client without that brand’s or client’s agreement.',
      'We do not publish a figure we cannot source, or a claim we cannot stand behind.',
    ],
    cta: { label: 'Explore UK Market Fit', to: 'explore-uk-market-fit' },
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
    /* §PUBLIC SURFACES BATCH 5 PART 7 (2026-11-28) — the page opens with a picture. A case study is
       about work that ran, so it opens on the operation rather than on a document. */
    hero: 'warehouse-racks',
    blocks: [
      {
        heading: 'Why this page is short for now',
        body: [
          'A case study that names a brand, a category or a figure requires that brand’s consent and a record behind every number. Until those exist, this page says so rather than filling the space with a story that did not happen.',
        ],
        /* The goods an arrangement actually moves — the subject a case study would describe once the
           brand concerned has agreed to it. */
        media: 'boxes-stacked',
      },
      {
        heading: 'What we can tell you today',
        body: [
          'How the process works end to end is on How It Works, and what a brand keeps is on For Brands. Those are true today and need nobody’s permission.',
        ],
      },
    ],
    /* §PUBLIC SURFACES BATCH 5 PART 7 (2026-11-28) — the worked example: the stages that must be
       passed before anything is published here. The SEQUENCE only — no amount, no price and no
       percentage, because a case study's numbers may only be published with the brand's consent and a
       record behind them. */
    illustration: {
      label: 'How a case study would be published',
      intro:
        'A case study is published only when the brand concerned has agreed to it and there is a record behind every statement. These are the stages, in order.',
      stages: [
        {
          label: 'The work happens',
          detail:
            'An arrangement runs, and what actually happened is recorded as it happens rather than reconstructed from memory afterwards.',
        },
        {
          label: 'The brand is asked',
          detail:
            'The brand is asked directly whether it is willing to be described, and it may decline at any point without giving a reason.',
        },
        {
          label: 'The record is checked',
          detail:
            'Every statement that would go into the piece is matched to the record behind it, and anything that cannot be matched is left out.',
        },
        {
          label: 'It is published',
          detail:
            'Only then is anything published. Where consent or a record is missing, this page stays short and says exactly why.',
        },
      ],
    },
    limits: [
      'We do not publish a case study without the brand’s explicit agreement.',
      'We do not publish a result, a figure or a name that has no record behind it.',
      'We do not invent a story to fill this page; a short page is the honest version of it.',
    ],
    availability: {
      label: 'Published as consent is given',
      detail:
        'No case study is published without the brand’s agreement and a supporting record. This is a deliberate limit, not an oversight.',
    },
    cta: { label: 'Contact Mercenta', to: 'contact' },
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
    /* §PUBLIC SURFACES BATCH 5 PART 7 (2026-11-28) — the page opens with a picture. The guides are
       written from the operation, so the page opens on the operation. */
    hero: 'warehouse-aisle',
    blocks: [
      {
        heading: 'Guides to start with',
        bullets: [
          'Working out whether the UK wants your product.',
          'What a UK buyer needs from a brand before it will list.',
          'What changes when someone else carries the retail side.',
        ],
        /* Reading it through and deciding, in one sitting — what the guides exist for. */
        media: 'desk-tablet',
      },
      {
        heading: 'How to use them',
        body: [
          'Each guide is written to be read in one sitting and to leave you able to decide something. None require a call with us first.',
        ],
      },
    ],
    /* §PUBLIC SURFACES BATCH 5 PART 7 (2026-11-28) — the worked example: how a guide is put together
       and kept true. The SEQUENCE only — no figure. */
    illustration: {
      label: 'How a guide is put together',
      intro:
        'Each guide is written from the questions brands actually ask, in the order they ask them. These are the stages it goes through before it is published.',
      stages: [
        {
          label: 'The question is chosen',
          detail:
            'A guide starts from a question we are asked often enough that answering it once, properly, is worth writing down.',
        },
        {
          label: 'The answer is tested',
          detail:
            'The answer is checked against the work behind it, so a guide describes how it really runs rather than how it is meant to.',
        },
        {
          label: 'It is written to be used',
          detail:
            'It is written so a brand can read it in one sitting and act on it, with no call to us needed first.',
        },
        {
          label: 'It is kept current',
          detail:
            'A guide that stops being true is corrected or withdrawn, because a stale guide is worse than no guide at all.',
        },
      ],
    },
    limits: [
      'We do not write a guide to lead into a sales conversation; each one stands on its own.',
      'We do not give advice we would not follow in our own operation.',
      'We do not describe a step we cannot show, or a result we cannot point at a record for.',
    ],
    cta: { label: 'Explore UK Market Fit', to: 'explore-uk-market-fit' },
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
  /* §PUBLIC SURFACES BATCH 5 PART 4 (2026-11-28) — the page opens with a picture. A portfolio of
     brands from many countries arrives by sea, so the opening image is a container terminal. */
  hero: 'port-containers',
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
      /* The reporting the sentence above promises, shown as the screen it is read on. */
      media: 'desk-tablet',
    },
    {
      heading: 'What we do not claim',
      body: [
        'Naming a kind of institution is not a claim that any named organisation is a Mercenta partner, client or endorser. Nothing on this page should be read as an existing relationship or an approval by any institution.',
      ],
    },
  ],
  /* §PUBLIC SURFACES BATCH 5 PART 4 (2026-11-28) — the worked example: a portfolio brand reaching the
     UK. The sequence only; it carries no amount, no price and no percentage. */
  illustration: {
    label: 'How a brand in a portfolio reaches the UK',
    intro:
      'The stages below are what happens between an institution introducing a brand and that brand selling here. The institution stays the route in; Mercenta does the operating.',
    stages: [
      {
        label: 'A brand is put forward',
        detail:
          'A brand in the portfolio is looked at against what the UK market actually buys, before anyone commits to shipping anything.',
      },
      {
        label: 'It is assessed honestly',
        detail:
          'The product, its documentation and its packaging are measured against the category it would sit in, and the answer may be no.',
      },
      {
        label: 'It is set up to sell',
        detail:
          'Compliance, listing and stock are put in place for that brand, so that it can be bought rather than merely announced.',
      },
      {
        label: 'It runs, and it reports',
        detail:
          'Orders, movement and payment run through Mercenta, and the brand can then be reported on to a board or to a funder.',
      },
    ],
  },
  limits: [
    'Naming a kind of institution is not a claim that we work with it, and no organisation is named here as a partner, client or endorser.',
    'We do not promise an outcome for any brand in a portfolio; each one is assessed on the product in front of us.',
    'We do not assess a portfolio as a whole. Every brand is looked at on its own products and its own paperwork.',
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
  /* §PUBLIC SURFACES BATCH 5 PART 7 (2026-11-28) — the page opens with a picture. The guide is about
     the market goods arrive into, so it opens on goods arriving rather than on a chart. */
  hero: 'port-containers',
  blocks: [
    {
      heading: 'Where the numbers come from',
      bullets: [
        'Office for National Statistics — retail sales, prices and population.',
        'World Bank — trade and output for the UK and for corridor countries.',
        'Published periods only. A projection is labelled as one, and an estimate is never dressed as a measurement.',
      ],
      /* The destination the figures describe: the UK retail shelf. */
      media: 'shelves-grocery',
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
  /* §PUBLIC SURFACES BATCH 5 PART 7 (2026-11-28) — the worked example: how a figure is ADMITTED to
     this page. The SEQUENCE only, and deliberately carrying no figure of its own — a page whose whole
     argument is that every number must name its source must not illustrate itself with a number. */
  illustration: {
    label: 'How a figure reaches this page',
    intro:
      'A market guide is only useful if you can check it. These are the stages a figure passes through before it is allowed to appear here.',
    stages: [
      {
        label: 'The publisher is named',
        detail:
          'A figure is only considered if a named body publishes it — a national statistics office, or a development bank — and that body is recorded with it.',
      },
      {
        label: 'The period is recorded',
        detail:
          'The period the figure describes is recorded alongside it, so it can never be read as more current than it actually is.',
      },
      {
        label: 'It is checked',
        detail:
          'The figure is checked against the publication it came from, and a projection is labelled as a projection rather than shown as a measurement.',
      },
      {
        label: 'It is shown, or left out',
        detail:
          'If the source has not answered, the figure is left off the page and the missing source is named, rather than an old number being shown as if it were current.',
      },
    ],
  },
  limits: [
    'We do not show a figure without naming the body that published it and the period it covers.',
    'We do not present an estimate or a projection as a measurement.',
    'We do not fill a gap with an older number; where a source has not answered, the figure is absent.',
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

/**
 * The content groups, DERIVED from the pages themselves (never retyped).
 *
 * §CORRECTED 2026-11-28 (BATCH 5 PART 4) — THIS COMMENT WAS FALSE, AND SO WAS THE CONSTANT. It said
 * "DERIVED from the pages themselves (never retyped)" while the code retyped five group names — and
 * those five omitted `'Retail Infrastructure'`, which SEVEN pages in `PUBLIC_CONTENT_PAGES` carry, so
 * the list could not have described the pages it claimed to be derived from. Nothing consumed it, so
 * nothing broke; the comment was simply untrue, which is the defect. The list is now genuinely
 * computed from each page's own `navGroup`, in declaration order, so it cannot disagree again. The
 * HEADER's own group order is a separate owner (`PUBLIC_NAV` in `src/config/positioning.ts`) and is
 * deliberately not duplicated here.
 */
export const PUBLIC_CONTENT_NAV_GROUPS: readonly { group: string; pages: PublicContentPage[] }[] =
  Array.from(new Set(PUBLIC_CONTENT_PAGES.map((p) => p.navGroup))).map((group) => ({
    group,
    pages: PUBLIC_CONTENT_PAGES.filter((p) => p.navGroup === group),
  }));

