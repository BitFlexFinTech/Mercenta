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
 * §INITIAL SELECTION — OWNER DECISION (2026-11-19, SUPERSEDED 2026-11-27):
 * Design A (Monolith) was the default public homepage. On 2026-11-27 the Owner
 * stated plainly, in their own words: *"the default homepage should be E —
 * Concept 3"*. That is the current decision and it wins over the 2026-11-19 one.
 * This is not an agent's preference, in either direction.
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
 * added ADDITIVELY. It did not replace A–D, and at the time A remained the
 * default. §OWNER DECISION 2026-11-27 turned that round: E is now the default
 * (see `DEFAULT_HOMEPAGE_DESIGN` below); A–D stay selectable in the Super Admin
 * Homepage Editor exactly like before.
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
 * §OWNER DECISION 2026-11-27 — THE DEFAULT PUBLIC HOMEPAGE IS NOW E (CONCEPT 3).
 *
 * The Owner said, verbatim: *"the default homepage should be E — Concept 3"*.
 *
 * WHY THIS IS THE ASSISTANT'S TO CHANGE NOW, AND WAS NOT BEFORE. Until today the
 * recorded decision was Design A (2026-11-19), and a working-tree edit that
 * switched it to E was restored because no decision existed behind it — swapping
 * the PUBLIC FRONT PAGE is never an assistant's initiative. This note is that
 * decision, in the Owner's own words and dated: the authority now exists, so the
 * one-line change and its describers are made together.
 *
 * The four describers this file itself named have all been repointed in the same
 * change, so no source still claims A is the default:
 *   · this file's header and §BATCH 3 note — record A as SUPERSEDED;
 *   · `src/config/homepageDesign.ts` Design A metadata — "The default." removed;
 *   · `e2e/homepage-designs.spec.ts` — now asserts E on first load;
 *   · `scripts/validate-e6-brand-surfaces.mjs` — the "Design A remains the
 *     published default" note now states E, per the same decision.
 *
 * A–D remain fully selectable in the Super Admin Homepage Editor; this changes
 * only which design a visitor sees first. Reverting is the same one line.
 */
export const DEFAULT_HOMEPAGE_DESIGN: HomepageDesignId = 'e-concept';

export const HOMEPAGE_DESIGNS: Record<HomepageDesignId, HomepageDesignMeta> = {
  'a-monolith': {
    id: 'a-monolith',
    label: 'A — Monolith',
    description:
      'Restrained and premium: a thin orange rule, generous space, the tracker set directly into the hero.',
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
      'The approved Concept 3 direction: a 12-column hero split with the shipment tracker in the right-hand column, a construction grid, four modular tiles and a five-stage journey on a sticky rail. The published default (owner decision, 2026-11-27).',
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
