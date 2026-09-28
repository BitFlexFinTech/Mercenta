/**
 * §12 — Homepage content model. Single source of truth for every editable
 * string/image slot on the public homepage.
 *
 * Home.tsx renders FROM this model (never hardcoded strings), the Super Admin
 * Homepage Editor edits a draft of it, and "Publish" promotes the draft to
 * the live copy. Icons are logical names resolved to components by Home.
 *
 * §PUBLIC MESSAGING (2026-09-28) — THE COPY WAS REBUILT FROM THE OUTCOME UP.
 * The owner of the public message is now `src/config/positioning.ts`; the
 * defaults below are BUILT FROM it, so Home, the other seven public pages and
 * the footer cannot say different things. Three rules govern every string:
 *
 *  1. SAY THE OUTCOME, NEVER THE MECHANISM. The page tells a brand what stops
 *     being their job and what they get. It never explains how the business is
 *     structured, who we hold accounts with, how the rules are enforced, or what
 *     the commercial terms are — that was the leak this rebuild closes.
 *  2. TWO AUDIENCES, BOTH FIRST-CLASS. Brands outside the UK entering the market,
 *     and brands already selling here who want the retail side carried.
 *  3. NO UNEVIDENCED CLAIM. No client counts, no "trusted by", no guarantees, and
 *     the retail channel is never named (`scripts/lint-wording.mjs`).
 *
 * `scripts/validate-public-claims.mjs` fails the build if any of that returns.
 */

import {
  PUBLIC_AUDIENCES,
  PUBLIC_HERO_SUBHEADING,
  PUBLIC_OUTCOMES,
  PUBLIC_REASONS_TO_STAY,
  PUBLIC_SOFTWARE_EXPERIENCE,
} from './positioning';

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


/**
 * Icons for the generated cards — logical names Home resolves to components.
 * Declared here so the copy model stays free of component imports.
 */
const AUDIENCE_ICONS: readonly HomeIconName[] = ['plane', 'check'];
const OUTCOME_ICONS: readonly HomeIconName[] = ['truck', 'shield', 'trending', 'package'];
const REASON_ICONS: readonly HomeIconName[] = ['award', 'check', 'target', 'shield'];

export const DEFAULT_HOMEPAGE_CONTENT: HomepageContent = {
  hero: {
    eyebrow: 'Retail channel partner — United Kingdom',
    headingStart: 'Your products on UK shelves',
    headingHighlight: 'without building a UK business.',
    subheading: PUBLIC_HERO_SUBHEADING,
    primaryCta: 'Explore UK Market Fit',
    /**
     * §Phase 1 — this is the HEADER utility action label, not a hero button.
     * Partner Login must not sit beside the primary hero CTA (the two actions
     * serve different audiences and need distinct hierarchy), so it is rendered
     * by PublicNav in the header and the field is retained here as the single
     * source for its label (and for the Homepage Editor).
     */
    secondaryCta: 'Partner Login',
    trustBadges: ['Registered in England & Wales', 'One partner from production line to shelf', 'Your brand stays yours'],
  },
  tracker: {
    reference: 'MCT-2418',
    cargoLabel: 'Consumer goods',
    freightMode: 'AIR FREIGHT',
    stages: [
      { label: 'Origin collected', done: true },
      { label: 'Export airport', done: true },
      { label: 'Air transit', done: true },
      { label: 'UK customs cleared', done: true },
      { label: 'On shelf', done: false },
    ],
  },
  about: {
    heading: 'Two kinds of brand come to us',
    subheading:
      'One is outside the UK and wants in. The other is already here and wants the retail side carried. Both end up in ' +
      'the same place — the product stays yours, the operation becomes ours.',
    points: PUBLIC_AUDIENCES.map((audience, i) => ({
      title: audience.heading,
      description: audience.body,
      icon: AUDIENCE_ICONS[i % AUDIENCE_ICONS.length],
    })),
  },
  services: {
    heading: 'What changes when a retailer becomes your partner',
    subheading: 'Not a feature list. The four things that stop being your job.',
    cards: PUBLIC_OUTCOMES.map((outcome, i) => ({
      title: outcome.title,
      description: outcome.body,
      icon: OUTCOME_ICONS[i % OUTCOME_ICONS.length],
    })),
  },
  route: {
    heading: 'Why brands stay',
    subheading: 'These four come up in almost every conversation we have.',
    steps: PUBLIC_REASONS_TO_STAY.map((reason, i) => ({
      title: reason.title,
      description: reason.body,
      icon: REASON_ICONS[i % REASON_ICONS.length],
    })),
  },
  visibility: {
    heading: 'Inside your workspace',
    subheading: PUBLIC_SOFTWARE_EXPERIENCE,
    points: [
      {
        title: 'Every order, in one queue',
        description:
          'What has come in, what it is worth and what is waiting on a decision from you — with the ones that need you soonest at the top.',
        icon: 'package',
      },
      {
        title: 'Every document, in its place',
        description:
          'What is approved, what is coming up for renewal and what is holding something back — so a piece of paper never stalls an order quietly.',
        icon: 'shield',
      },
      {
        title: 'Every payment, explained',
        description:
          'What has settled, what is still to come and what each deduction was for — shown against the order that caused it.',
        icon: 'trending',
      },
    ],
  },
  protection: {
    heading: 'When something goes wrong, you hear it from us',
    subheading: 'Nothing in this business is risk-free. What matters is who tells you, and how quickly.',
    points: [
      {
        title: 'A problem is never hidden',
        description:
          'A late consignment, a failed delivery, a document that is rejected — you are told, and told what is being done about it.',
        icon: 'target',
      },
      {
        title: 'A payment is never quietly absorbed',
        description:
          'If a figure looks wrong, it is held and reviewed rather than paid out or written off without you seeing it.',
        icon: 'shield',
      },
      {
        title: 'Your approval comes first',
        description:
          'Nothing happens to your products or your money that you have not agreed to. That is the whole point of the partnership.',
        icon: 'check',
      },
    ],
  },
  finalCta: {
    heading: 'Ready to find out whether the UK wants your products?',
    subheading:
      'Start with an honest read on the market — free, and worth having whether or not you go any further with {{brand}}.',
    buttonLabel: 'Explore UK Market Fit',
    stampLine1: 'UK market',
    stampLine2: 'assessment',
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

