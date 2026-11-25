/**
 * §BRAND REDESIGN (2026-11-19) — THE HOMEPAGE DESIGN AXIS.
 *
 * THE ONE OWNER of which homepage composition renders. This is NOT a theme and
 * NOT a brand: it is a fourth, independent axis, deliberately separated from
 *
 *   · BRAND IDENTITY      — `src/config/themes.ts` (`BRAND_PALETTE`)
 *   · APPEARANCE          — `brand-dark` / `brand-light` (`themes.ts`)
 *   · HOMEPAGE DESIGN     — THIS FILE
 *   · APPLICATION PRESENTATION — the authenticated shells, which use the brand
 *     identity and the appearance, and never a homepage design.
 *
 * The four designs are the four supplied HTML directions (A-Monolith, B-Grid,
 * C-Signal, D-Mark). They differ in COMPOSITION only: all four render the SAME
 * content and the SAME tracker animation, so they can never disagree about what
 * Mercenta says or about how the shipment tracker behaves.
 *
 * THE SELECTION IS PLATFORM-WIDE AND PERSISTED: it rides the existing
 * `homepage_content` draft/publish payload (`src/data/api.ts`), so the owner
 * changes it from Super Admin with no code change, rebuild or redeploy, and it
 * survives sessions and restarts.
 *
 * §INITIAL SELECTION — OWNER DECISION (fixed, 2026-11-19): Design A (Monolith)
 * is the default public homepage. This is not an agent's preference.
 */

import {
  PUBLIC_HOW_IT_WORKS,
  PUBLIC_PROMISE,
  PUBLIC_INVITATION_HEADING,
} from './positioning';
import { APPROVED_CATEGORIES } from '@/types';

/**
 * The supplied homepage directions.
 *
 * §BATCH 3 (2026-11-21) — `e-concept` is the approved Concept 3 direction,
 * added ADDITIVELY. It does not replace A–D: the owner's fixed decision that
 * Design A (Monolith) is the published default is unchanged, and E is selected
 * in the Super Admin Homepage Editor exactly like the others.
 */
export type HomepageDesignId =
  | 'a-monolith'
  | 'b-grid'
  | 'c-signal'
  | 'd-mark'
  | 'e-concept';

export interface HomepageDesignMeta {
  id: HomepageDesignId;
  /** Owner-facing label (Super Admin). */
  label: string;
  /** Owner-facing one-line description of what makes this design distinct. */
  description: string;
  /** The supplied HTML files this design implements. */
  source: string;
}

export const HOMEPAGE_DESIGN_ORDER: readonly HomepageDesignId[] = [
  'a-monolith',
  'b-grid',
  'c-signal',
  'd-mark',
  'e-concept',
];

/**
 * §RESTORED 2026-11-25 — THE DEFAULT IS A, AND THE CLAIM THAT SWITCHED IT IS WITHDRAWN.
 *
 * The working tree carried an edit setting this to `'e-concept'` under a one-line
 * comment asserting *"§OWNER DECISION — Lovable Concept 3 (e-concept) is the initial
 * public homepage"*. No such decision is recorded anywhere in this repository, and the
 * edit CONTRADICTED the decision that IS recorded — three times, dated, and in this
 * very file:
 *
 *   · the header above — "§INITIAL SELECTION — OWNER DECISION (fixed, 2026-11-19):
 *     Design A (Monolith) is the default public homepage", and "This is not an agent's
 *     preference";
 *   · the §BATCH 3 note above — "the owner's fixed decision that Design A (Monolith) is
 *     the published default is unchanged";
 *   · Design A's own metadata below — "…The default."
 * and outside this file by `e2e/homepage-designs.spec.ts` ("A — Monolith is the
 * published default on first load", which FAILED with the tree as it stood) and by
 * `scripts/validate-e6-brand-surfaces.mjs` ("NOTHING ELSE MOVES. Design A remains the
 * published default.").
 *
 * An unattributed comment does not overrule five recorded sources, and swapping the
 * PUBLIC FRONT PAGE is not a change an assistant may make on its own initiative. The
 * default is therefore restored. `e-concept` keeps its place in
 * `HOMEPAGE_DESIGN_ORDER`, is fully selectable in the Super Admin Homepage Editor
 * exactly like the others, and if the Owner DOES want E as the front page it is a
 * one-line change plus the four describers named above — put to the Owner, never
 * assumed on their behalf.
 */
export const DEFAULT_HOMEPAGE_DESIGN: HomepageDesignId = 'a-monolith';

export const HOMEPAGE_DESIGNS: Record<HomepageDesignId, HomepageDesignMeta> = {
  'a-monolith': {
    id: 'a-monolith',
    label: 'A — Monolith',
    description:
      'Restrained and premium: a thin orange rule, generous space, the tracker set directly into the hero. The default.',
    source: 'A-Monolith-dark.html / A-Monolith-light.html',
  },
  'b-grid': {
    id: 'b-grid',
    label: 'B — Grid',
    description:
      'Editorial grid: an outlined eyebrow, a full-height rule between the hero columns and a mono route strip beneath the tracker.',
    source: 'B-Grid-dark.html / B-Grid-light.html',
  },
  'c-signal': {
    id: 'c-signal',
    label: 'C — Signal',
    description:
      'The boldest: an orange highlight across the headline, a full-width orange closing band and the tagline as a moving strip.',
    source: 'C-Signal-dark.html / C-Signal-light.html',
  },
  'd-mark': {
    id: 'd-mark',
    label: 'D — Mark',
    description:
      'The mark leads: a large ghosted "m." behind the hero headline, with the tracker held clear of the type.',
    source: 'D-Mark-dark.html / D-Mark-light.html',
  },
  'e-concept': {
    id: 'e-concept',
    label: 'E — Concept 3',
    description:
      'The approved Concept 3 direction: a 12-column hero split with the shipment tracker in the right-hand column, a construction grid, four modular tiles and a five-stage journey on a sticky rail.',
    source: 'Concept3.tsx (mercenta-market-entry-main)',
  },
};


/* ── The homepage copy, adapted from the supplied HTML ───────────────────────
 *
 * §CONTENT RULE. The supplied HTML is the source of the STRUCTURE, the section
 * order and the visual language. Its WORDING is not publishable as written: it
 * names the customs position (`HMRC`, `EORI`, `UKCA`), the commercial model
 * ("we buy your inventory at wholesale") and the restricted retail channel
 * ("the UK's largest national retail buyer", "invitation-only") — all of which
 * Mercenta's own public-claims gate forbids, because they hand the operating
 * model to a competitor.
 *
 * So the sentences below keep the supplied design's RHYTHM and SECTION PURPOSE
 * and are written from the approved public-message owner (`positioning.ts`) and
 * the approved category owner (`src/types.ts`). Nothing here invents a
 * capability, a figure, a result or a relationship.
 */

/* ── §BRAND REDESIGN (2026-11-19) — THE HERO COPY IS NO LONGER DECLARED HERE ──
 *
 * MEASURED DEFECT THIS CLOSED: the four designs rendered their hero copy from
 * constants in THIS file while the Super Admin Homepage Editor edited and published
 * `content.hero.*` in `src/config/homepageContent.ts`. Two owners for one string
 * meant the owner's published edit never reached the public page — a control that
 * did nothing, and a single-source-of-truth violation.
 *
 * The homepage now renders `content.hero.eyebrow / headingStart / headingHighlight /
 * subheading` (and `content.finalCta.heading` for the closing band), so the content
 * model is the ONE owner and the editor's publish flow works. The removed constants
 * were: HOMEPAGE_EYEBROW · HOMEPAGE_HEADLINE_START · HOMEPAGE_HEADLINE_HIGHLIGHT ·
 * HOMEPAGE_LEDE · HOMEPAGE_CLOSING_HEADING. `validate-homepage-editor.mjs` pins the
 * behaviour (an edited field must appear in the rendered page).
 */

/** The four-cell manifest strip beneath the hero. */
export interface HomepageManifestCell {
  label: string;
  value: string;
}

export const HOMEPAGE_MANIFEST: readonly HomepageManifestCell[] = [
  { label: 'Route', value: 'Origin → UK' },
  { label: 'Categories', value: `${APPROVED_CATEGORIES.length} approved` },
  { label: 'Compliance', value: 'UK handled' },
  { label: 'Market', value: 'UK' },
] as const;

/** The five-step journey (the approved journey, one entry per step). */
export const HOMEPAGE_JOURNEY: readonly { title: string; body: string }[] = PUBLIC_HOW_IT_WORKS;

/**
 * §BATCH 3 — CONCEPT 3 (2026-11-21). The journey section's own label and heading.
 *
 * Declared HERE rather than written into the design component, because the
 * component must not be a second owner of approved copy (the same rule that
 * moved the hero copy out of this file and into `homepageContent.ts`). The
 * strings are the approved section title for the five-step journey.
 */
export const HOMEPAGE_JOURNEY_EYEBROW = 'How it works';
export const HOMEPAGE_JOURNEY_HEADING = 'Five steps. One tracked route.';

/** The ten approved categories, read from their owner. */
export const HOMEPAGE_CATEGORIES: readonly string[] = APPROVED_CATEGORIES;

/** The closing band. */
export const HOMEPAGE_CLOSING_EYEBROW = 'UK · Wholesale distribution';
export const HOMEPAGE_CLOSING_BUTTON = PUBLIC_INVITATION_HEADING;

/** The approved tagline, used by the C-Signal marquee. */
export const HOMEPAGE_TAGLINE = 'Global Brands. UK Distribution. Smarter Growth.';

/** Type guard for a persisted/edited design id (fail-closed to the default). */
export function isHomepageDesignId(value: unknown): value is HomepageDesignId {
  return typeof value === 'string' && (HOMEPAGE_DESIGN_ORDER as readonly string[]).includes(value);
}
