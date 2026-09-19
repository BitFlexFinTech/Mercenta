/**
 * §12 — Homepage content model. Single source of truth for every editable
 * string/image slot on the public homepage.
 *
 * Home.tsx renders FROM this model (never hardcoded strings), the Super Admin
 * Homepage Editor edits a draft of it, and "Publish" promotes the draft to
 * the live copy. Icons are logical names resolved to components by Home.
 *
 * §UI/UX Wave 2 — the copy was completely reassessed for the redesigned
 * homepage. Two rules govern every string in this file:
 *
 *  1. CHANNEL-NEUTRAL POSITIONING (§19/§33). Public copy describes Mercenta's
 *     commercial value to brands using channel-neutral language ("managed
 *     retail-channel operations", "channel distribution", "purchase-order
 *     management"). The platform's provider-specific operational reality
 *     (Amazon Vendor Central) is represented ONLY in the internal application,
 *     never in customer-facing positioning. No claim of partnership,
 *     endorsement, guaranteed purchase orders or guaranteed sales appears here.
 *  2. NO MARKET-SIZE THEATRE. TAM/SAM market-size content was removed from the
 *     public homepage. Every remaining section has a stated reason to exist.
 */

export type HomeIconName =
  | 'truck' | 'shield' | 'package' | 'trending'
  | 'target' | 'award' | 'check' | 'plane' | 'ship';

export interface HomeCardItem {
  /** Optional display label (route steps show a region name). */
  region?: string;
  title: string;
  description: string;
  /** Optional second line (route cards). */
  route?: string;
  icon?: HomeIconName;
  flag?: string;
}

export interface HomepageContent {
  hero: {
    eyebrow: string;
    headingStart: string;
    headingHighlight: string;
    subheading: string;
    primaryCta: string;
    secondaryCta: string;
    trustBadges: [string, string, string];
  };
  tracker: {
    reference: string;
    cargoLabel: string;
    freightMode: string;
    stages: { label: string; done: boolean }[];
  };
  /** What the platform is, in three moves (onboard → operate → see). */
  about: {
    heading: string;
    subheading: string;
    points: HomeCardItem[];
  };
  /** The connected operating capabilities the platform provides. */
  services: {
    heading: string;
    subheading: string;
    cards: HomeCardItem[];
  };
  /** The commercial-operations story: brand → … → growth. */
  route: {
    heading: string;
    subheading: string;
    steps: HomeCardItem[];
  };
  /** §UI/UX Wave 2 — visibility & control (brand sees what Mercenta sees). */
  visibility: {
    heading: string;
    subheading: string;
    points: HomeCardItem[];
  };
  /** §UI/UX Wave 2 — proactive brand success protection. */
  protection: {
    heading: string;
    subheading: string;
    points: HomeCardItem[];
  };
  finalCta: {
    heading: string;
    subheading: string;
    buttonLabel: string;
    stampLine1: string;
    stampLine2: string;
  };
}


export const DEFAULT_HOMEPAGE_CONTENT: HomepageContent = {
  hero: {
    eyebrow: 'Managed retail-channel operations — United Kingdom',
    headingStart: 'Your brand, listed, ordered',
    headingHighlight: 'and paid — without the infrastructure.',
    subheading:
      'Mercenta is the operating layer between your brand and the retail channel. We manage the orders, fulfilment, logistics, finance and compliance that come with selling at retail scale, and you work inside one platform that shows you every order, shipment, document and payment as it happens.',
    primaryCta: 'See if your brand qualifies',
    secondaryCta: 'Partner Login',
    trustBadges: ['UK ESTABLISHED', 'COMPLIANCE-GATED ONBOARDING', 'EVERY ACTION AUDITED'],
  },
  tracker: {
    reference: 'BXB-2847',
    cargoLabel: 'Mixed Consumer Goods',
    freightMode: 'SEA FREIGHT',
    stages: [
      { label: 'Factory Intake', done: true },
      { label: 'In Transit', done: true },
      { label: 'UK Customs Cleared', done: true },
      { label: 'UK Retail Live', done: false },
    ],
  },
  about: {
    heading: 'How Mercenta works with your brand',
    subheading:
      'Three moves. No new systems, no new team, no infrastructure build — you keep selling, we run the commercial operation.',
    points: [
      {
        title: 'Onboard once, properly',
        description:
          'Submit your products and your compliance documentation. Nothing reaches the catalogue until every applicable requirement is present and approved, so the operation starts clean.',
        icon: 'check',
      },
      {
        title: 'Mercenta operates the channel',
        description:
          'Purchase orders arrive in your workspace. You approve, amend or reject them, and Mercenta handles acknowledgement, fulfilment, carrier booking, customs paperwork, delivery and reconciliation.',
        icon: 'truck',
      },
      {
        title: 'You see everything, live',
        description:
          'Orders, shipments, documents, deductions and payments appear in your portal as they happen — not in a monthly report that arrives after the decisions were already made.',
        icon: 'package',
      },
    ],
  },
  services: {
    heading: 'One platform for the whole commercial operation',
    subheading:
      'These are not separate products bolted together. They are one operating platform where a purchase order, its shipment, its documents, its invoice and its payment stay connected to each other.',
    cards: [
      {
        title: 'Purchase-order management',
        description:
          'Every order in one queue with its value, deadline and status. Approve, amend or reject, with a full audit trail of who decided what and when.',
        icon: 'package',
      },
      {
        title: 'Fulfilment & logistics',
        description:
          'Shipment creation is order-gated: a shipment can only be raised against a valid order that belongs to you. International moves by DHL, UK domestic by Palletline.',
        icon: 'truck',
      },
      {
        title: 'Finance & reconciliation',
        description:
          'Invoices, payments, deductions and chargebacks reconciled against the orders that caused them, with payout proposals visible before anything is settled.',
        icon: 'trending',
      },
      {
        title: 'Compliance, enforced',
        description:
          'Category-aware documentation requirements are enforced as a hard gate. No manual override can bypass a regulatory requirement — it can only change workflow state.',
        icon: 'shield',
      },
      {
        title: 'Communications & cases',
        description:
          'Message threads and cases stay attached to the order, shipment or deduction they concern, so context never gets lost in an inbox.',
        icon: 'target',
      },
      {
        title: 'Commercial intelligence',
        description:
          'Demand signals, listing quality and category performance for the products you actually sell — presented as estimates, clearly distinguished from confirmed facts.',
        icon: 'award',
      },
    ],
  },
  route: {
    heading: 'From your product to a running commercial operation',
    subheading:
      'One connected chain — each stage feeding the next, none of them disconnected from the rest.',
    steps: [
      { title: 'Brand', description: 'You join as a brand with its own workspace, users, roles and commercial terms.', icon: 'check' },
      { title: 'Products', description: 'Catalogued with the paperwork each category actually requires.', icon: 'package' },
      { title: 'Commercial operations', description: 'Your commercial relationship is agreed, recorded and audited.', icon: 'target' },
      { title: 'Orders', description: 'Purchase orders land in your queue with the value and the deadline attached.', icon: 'truck' },
      { title: 'Fulfilment', description: 'Orders are acknowledged and prepared against the correct quantities.', icon: 'truck' },
      { title: 'Logistics', description: 'Carrier booking, labels, customs paperwork and tracking, end to end.', icon: 'ship' },
      { title: 'Finance', description: 'Invoices, payments, deductions and payout proposals reconciled per order.', icon: 'trending' },
      { title: 'Compliance', description: 'Documentation versioned and verified — never a one-off tick at onboarding.', icon: 'shield' },
      { title: 'Visibility', description: 'Every one of the above visible to you in one place, in real time.', icon: 'award' },
      { title: 'Growth', description: 'More products, more categories, more channels — without rebuilding the operation.', icon: 'plane' },
    ],
  },
  visibility: {
    heading: 'You see exactly what we see',
    subheading:
      'Complete operational visibility is the product, not a reporting extra. There is no monthly summary that hides what happened in the meantime.',
    points: [
      {
        title: 'Live order and shipment state',
        description:
          'Where every order is, which carrier has it, where it is in transit and when it will arrive — updated as the operation moves, not afterwards.',
        icon: 'truck',
      },
      {
        title: 'Financial position per order',
        description:
          'Order value, deductions applied, what is reconciled and what is still pending, connected back to the order that produced it.',
        icon: 'trending',
      },
      {
        title: 'Documentation status',
        description:
          'Which compliance documents are approved, which are expiring and which are blocking a product from trading — with the requirement that applies to that category.',
        icon: 'shield',
      },
    ],
  },
  protection: {
    heading: 'Built to stop deadlines becoming problems',
    subheading:
      'Commercial operations fail quietly: a window closes, a document expires, an order goes unacknowledged. The platform is designed to make deadlines, urgency and required actions visible before they cost you.',
    points: [
      {
        title: 'Deadlines are visible, not buried',
        description:
          'Acknowledgement windows, ship windows and renewal dates surface as deadlines with the action each one needs.',
        icon: 'target',
      },
      {
        title: 'Urgency has a route',
        description:
          'Anything blocked, overdue or at risk is prioritised into a queue with a named destination, so it is obvious who or what resolves it.',
        icon: 'award',
      },
      {
        title: 'Every action is attributable',
        description:
          'Approvals, overrides and escalations are recorded with the actor, the reason and the object concerned — for Mercenta and for your brand.',
        icon: 'check',
      },
    ],
  },
  finalCta: {
    heading: 'Ready to run your UK commercial operation properly?',
    subheading:
      'Join brands already operating through {{brand}} — the same platform, your own workspace.',
    buttonLabel: 'See if your brand qualifies',
    stampLine1: 'Onboarding',
    stampLine2: 'Compliance gated',
  },
};

/* ── §UI/UX Wave 2 completion — PERSISTED-CONTENT NORMALISATION ─────────────
 *
 * REAL DEFECT FIXED. `fetchHomepageContent()` returned whatever the
 * `homepage_content` row held, and migration 001 seeds that row as
 * `'{}'::jsonb`. `HomeShell` then passed it straight into `<Home content=… />`,
 * which reads `c.hero.eyebrow`, `c.visibility.heading`, `c.visibility.points`
 * etc. UNGUARDED — so a configured Supabase deployment rendered the public
 * homepage from `{}` and threw. The Homepage Editor had the same exposure
 * (`setContent(r.draft ?? r.live)`).
 *
 * The fix belongs at the content-model seam, not in `Home`: any persisted
 * payload is normalised onto the canonical default BEFORE it is used, so a
 * partial/legacy row can never produce a partial render. Rules:
 *
 *  - a field is taken from the persisted payload only when it is a NON-EMPTY
 *    value of the right kind; otherwise the canonical default is used;
 *  - a list keeps only entries that carry a real title AND description; if none
 *    survive, the canonical default list is used;
 *  - nothing is invented — the fallback is always the canonical published copy,
 *    never a synthesised placeholder.
 *
 * This is deliberately the SINGLE place this merge happens (the same rule the
 * rest of the codebase follows for canonical shapes).
 */
export function normaliseHomepageContent(raw: unknown): HomepageContent {
  const d = DEFAULT_HOMEPAGE_CONTENT;
  const isObj = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null && !Array.isArray(v);
  const obj = (v: unknown): Record<string, unknown> => (isObj(v) ? v : {});
  const str = (v: unknown, fallback: string): string =>
    typeof v === 'string' && v.trim().length > 0 ? v : fallback;
  const list = (v: unknown, fallback: unknown[]): unknown[] =>
    Array.isArray(v) && v.length > 0 ? v : fallback;
  const cards = (v: unknown, fallback: HomeCardItem[]): HomeCardItem[] => {
    if (!Array.isArray(v)) return fallback;
    const kept = v.filter(
      (c): c is HomeCardItem =>
        isObj(c) &&
        typeof c.title === 'string' &&
        c.title.trim().length > 0 &&
        typeof c.description === 'string' &&
        c.description.trim().length > 0
    );
    return kept.length > 0 ? kept : fallback;
  };

  const hero = obj(raw ? obj(raw).hero : undefined);
  const tracker = obj(raw ? obj(raw).tracker : undefined);
  const about = obj(raw ? obj(raw).about : undefined);
  const services = obj(raw ? obj(raw).services : undefined);
  const route = obj(raw ? obj(raw).route : undefined);
  const visibility = obj(raw ? obj(raw).visibility : undefined);
  const protection = obj(raw ? obj(raw).protection : undefined);
  const finalCta = obj(raw ? obj(raw).finalCta : undefined);

  return {
    hero: {
      eyebrow: str(hero.eyebrow, d.hero.eyebrow),
      headingStart: str(hero.headingStart, d.hero.headingStart),
      headingHighlight: str(hero.headingHighlight, d.hero.headingHighlight),
      subheading: str(hero.subheading, d.hero.subheading),
      primaryCta: str(hero.primaryCta, d.hero.primaryCta),
      secondaryCta: str(hero.secondaryCta, d.hero.secondaryCta),
      trustBadges: (() => {
        const b = list(hero.trustBadges, d.hero.trustBadges);
        const three = b.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
        return (three.length === 3 ? three : d.hero.trustBadges) as [string, string, string];
      })(),
    },
    tracker: {
      reference: str(tracker.reference, d.tracker.reference),
      cargoLabel: str(tracker.cargoLabel, d.tracker.cargoLabel),
      freightMode: str(tracker.freightMode, d.tracker.freightMode),
      stages: (() => {
        const s = list(tracker.stages, d.tracker.stages);
        const kept = s
          .filter((x): x is Record<string, unknown> => isObj(x) && typeof x.label === 'string' && x.label.trim().length > 0)
          .map((x) => ({ label: x.label as string, done: x.done === true }));
        return kept.length > 0 ? kept : d.tracker.stages;
      })(),
    },
    about: {
      heading: str(about.heading, d.about.heading),
      subheading: str(about.subheading, d.about.subheading),
      points: cards(about.points, d.about.points),
    },
    services: {
      heading: str(services.heading, d.services.heading),
      subheading: str(services.subheading, d.services.subheading),
      cards: cards(services.cards, d.services.cards),
    },
    route: {
      heading: str(route.heading, d.route.heading),
      subheading: str(route.subheading, d.route.subheading),
      steps: cards(route.steps, d.route.steps),
    },
    visibility: {
      heading: str(visibility.heading, d.visibility.heading),
      subheading: str(visibility.subheading, d.visibility.subheading),
      points: cards(visibility.points, d.visibility.points),
    },
    protection: {
      heading: str(protection.heading, d.protection.heading),
      subheading: str(protection.subheading, d.protection.subheading),
      points: cards(protection.points, d.protection.points),
    },
    finalCta: {
      heading: str(finalCta.heading, d.finalCta.heading),
      subheading: str(finalCta.subheading, d.finalCta.subheading),
      buttonLabel: str(finalCta.buttonLabel, d.finalCta.buttonLabel),
      stampLine1: str(finalCta.stampLine1, d.finalCta.stampLine1),
      stampLine2: str(finalCta.stampLine2, d.finalCta.stampLine2),
    },
  };
}

