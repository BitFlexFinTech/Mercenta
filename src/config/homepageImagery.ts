/**
 * §HOMEPAGE IMAGERY (2026-11-20) — ONE PLACE THAT NAMES EVERY PICTURE.
 *
 * WHY THIS MODULE EXISTS
 * ----------------------
 * The four homepage designs must look different from each other. Until now they
 * shared nine section components in the same order, which is why they looked
 * identical. A large part of the fix is that each design now composes its OWN
 * sections and its OWN imagery — and no design may hardcode an image path, or
 * the four would drift and one broken filename would be invisible.
 *
 * WHERE THE FILES COME FROM, AND WHAT THEY COST
 * ---------------------------------------------
 * All of them are **CC0 / Public Domain Mark**, fetched by
 * `scripts/fetch-placeholder-imagery.mjs` from Openverse (openverse.org).
 * CC0 and PDM permit commercial use with **no attribution requirement**, which
 * is what a public marketing site needs.
 *
 * They cost nothing. Paid image generation was ruled out by the Founder, and
 * Google's free tier allows ZERO image requests anyway (`limit: 0` on
 * `generate_content_free_tier_requests`).
 *
 * THEY ARE PLACEHOLDERS, AND REPLACING ONE IS ONE FILE
 * ---------------------------------------------------
 * Swap `public/imagery/<role>-lg.webp` and `<role>-sm.webp` for your own
 * picture, keep the name, and nothing else changes. `public/imagery/CREDITS.md`
 * records where each one came from and its licence.
 *
 * KNOWN LIMIT, STATED HONESTLY: the free pool tops out around 1024px wide. That
 * is right for a section image shown at 500–800px and too small for a
 * full-bleed hero — so no design uses one as a full-bleed background. Nothing
 * has been upscaled.
 */

/** Every picture the homepage may use. The role IS the filename stem. */
export type HomeImageRole =
  | 'warehouse-aisle'
  | 'warehouse-racks'
  | 'port-containers'
  | 'port-cranes'
  | 'shelves-aisle'
  | 'shelves-grocery'
  | 'shelves-stock'
  | 'boxes-stacked'
  | 'desk-notebook'
  | 'desk-laptop'
  | 'desk-tablet'
  | 'desk-phone';

export interface HomeImageDefinition {
  /** What the picture shows, written for a screen reader. Never decorative. */
  alt: string;
  /** Which part of the business the picture belongs to. */
  group: 'goods' | 'port' | 'retail' | 'work';
}

export const HOME_IMAGES: Record<HomeImageRole, HomeImageDefinition> = {
  'warehouse-aisle': { alt: 'Racked storage aisles inside a distribution warehouse', group: 'goods' },
  'warehouse-racks': { alt: 'High-bay racking in a distribution centre', group: 'goods' },
  'port-containers': { alt: 'Stacked shipping containers at a container terminal', group: 'port' },
  'port-cranes': { alt: 'Container cranes loading a ship at port', group: 'port' },
  'shelves-aisle': { alt: 'A supermarket aisle being replenished, with goods in trolleys', group: 'retail' },
  'shelves-grocery': { alt: 'Retail shelving holding packaged goods', group: 'retail' },
  'shelves-stock': { alt: 'A supermarket aisle during a refit, beside an open empty freezer cabinet', group: 'retail' },
  'boxes-stacked': { alt: 'Stacked cardboard cartons ready for dispatch', group: 'goods' },
  'desk-notebook': { alt: 'A work desk with a notebook and pen', group: 'work' },
  'desk-laptop': { alt: 'A laptop showing performance charts on a desk', group: 'work' },
  'desk-tablet': { alt: 'A tablet displaying a reporting dashboard', group: 'work' },
  'desk-phone': { alt: 'A desk with a phone and an open notebook', group: 'work' },
};

/**
 * §PUBLIC SURFACES BATCH 5 (2026-11-27) — THE TEN CATEGORY PICTURES.
 *
 * The categories page needs one photograph per approved category, and the owner asked for a page that
 * is not boring. They come from the SAME licensed pool and the same fetch script as the homepage set
 * (CC0 / Public Domain Mark, committed locally, recorded in `public/imagery/CREDITS.md`), because a
 * second source would mean a second licence story to keep true.
 *
 * EACH ROLE IS A PICTURE OF THAT KIND OF PRODUCT, NOT A CLAIM. Nothing here may be presented as a
 * brand Mercenta works with, a client, or a live listing: the alt text describes what the photograph
 * shows, and the page's captions do the same.
 */
export type CategoryImageRole =
  | 'cat-home'
  | 'cat-baby'
  | 'cat-office'
  | 'cat-health'
  | 'cat-kitchen'
  | 'cat-electronics'
  | 'cat-automotive'
  | 'cat-grocery'
  | 'cat-computer'
  | 'cat-apparel';

export const CATEGORY_IMAGES: Record<CategoryImageRole, HomeImageDefinition> = {
  'cat-home': { alt: 'A modern living room with a sofa, plants and soft furnishings', group: 'retail' },
  'cat-baby': { alt: 'A baby bottle resting on a nursing pillow', group: 'retail' },
  'cat-office': { alt: 'A notebook, pencil and loose paper on a desk', group: 'work' },
  'cat-health': { alt: 'Lotion and shampoo bottles standing on a tray', group: 'retail' },
  'cat-kitchen': { alt: 'Kitchen utensils standing together in a holder', group: 'retail' },
  'cat-electronics': { alt: 'A pair of wireless over-ear headphones', group: 'retail' },
  'cat-automotive': { alt: 'A classic car photographed from the side', group: 'goods' },
  'cat-grocery': { alt: 'Tinned goods stacked on a supermarket shelf', group: 'retail' },
  'cat-computer': { alt: 'A laptop, a notebook and a camera on a desk', group: 'work' },
  'cat-apparel': { alt: 'Shirts hanging along a clothes rack', group: 'retail' },
};

/**
 * §PUBLIC SURFACES BATCH 5 PART 3 (2026-11-27) — THE TWO PICTURES THE CONTENT PAGES NEEDED.
 *
 * WHY THESE EXIST. Batch 5 Part 2 opened every Retail Infrastructure page with a picture from the
 * homepage set. LOOKING at the rendered pages showed two of those choices were wrong: the price page
 * opened on a supermarket mid-refit (which reads as a closed shop) and the creative-assets page opened
 * on a near-empty desk. Both were licensed and correctly sized; both were the wrong picture. These two
 * were chosen from a labelled contact sheet by eye, then pinned in
 * `scripts/fetch-public-page-imagery.mjs`, and their licences are recorded in
 * `public/imagery/CREDITS-PAGES.md`.
 *
 * SAME RULE AS EVERY OTHER PICTURE HERE: the alt text says what the photograph shows, and nothing here
 * is presented as a brand Mercenta works with, a client, or a live listing.
 */
export type PageImageRole = 'page-product-display' | 'page-photo-studio';

export const PAGE_IMAGES: Record<PageImageRole, HomeImageDefinition> = {
  'page-product-display': {
    alt: 'Confectionery in packaging set out across the shelves of a retail display unit',
    group: 'retail',
  },
  'page-photo-studio': {
    alt: 'A photographic studio, with a white backdrop, a softbox on a stand and a ceiling light',
    group: 'work',
  },
};

/** Every picture a public surface may use: the homepage set, the ten category pictures, the page set. */
export type PublicImageRole = HomeImageRole | CategoryImageRole | PageImageRole;

/**
 * ONE LOOKUP FOR EVERY PUBLIC PICTURE. The homepage designs keep reading `HOME_IMAGES`; the public
 * content pages and the category guides read this, so no surface needs to know which set a picture
 * came from — and there is still exactly ONE place that names a picture and its alt text.
 */
export const PUBLIC_IMAGES: Record<PublicImageRole, HomeImageDefinition> = {
  ...HOME_IMAGES,
  ...CATEGORY_IMAGES,
  ...PAGE_IMAGES,
};

/** The public path prefix. Files live in `public/imagery/`. */
export const HOME_IMAGE_BASE = '/imagery';

/** The wide variant (up to ~1024px; never upscaled). */
export function homeImageLarge(role: PublicImageRole): string {
  return `${HOME_IMAGE_BASE}/${role}-lg.webp`;
}

/** The narrow variant (up to 700px). */
export function homeImageSmall(role: PublicImageRole): string {
  return `${HOME_IMAGE_BASE}/${role}-sm.webp`;
}

/* ── WHICH DESIGN USES WHICH PICTURES ─────────────────────────────────────── */

/**
 * `A — Monolith` stays almost entirely typographic: ONE picture, low in the
 * page, because a restrained institutional page earns its weight from type.
 */
export const IMAGERY_A: readonly HomeImageRole[] = ['warehouse-racks'];

/**
 * `B — Grid Editorial` is the photography-led design: a real editorial grid of
 * the physical business, goods and shelves.
 */
export const IMAGERY_B: readonly HomeImageRole[] = [
  'warehouse-aisle',
  /* NOT `shelves-aisle` here. On screen that photograph reads as an EMPTY store
     — stripped shelving and a bare floor, which for a distribution brand looks
     like a closed shop rather than a stocked one. `shelves-grocery` shows full
     aisles, which is the signal the page needs. */
  'shelves-grocery',
  'boxes-stacked',
  'port-containers',
];

/**
 * `C — Signal` is the data design: the pictures are the WORK surfaces, because
 * the argument is "you can see it", not "we have warehouses".
 */
export const IMAGERY_C: readonly HomeImageRole[] = ['desk-laptop', 'desk-tablet'];

/**
 * `D — Mark` is architectural: large, dark, structural pictures with the mark
 * carried across them. Port and racking, because those are the images with the
 * strongest geometry.
 */
export const IMAGERY_D: readonly HomeImageRole[] = [
  'port-cranes',
  'warehouse-racks',
  'shelves-grocery',
];

/**
 * §BATCH 3 — CONCEPT 3 (2026-11-21). The approved Concept 3 direction places ONE
 * photograph in the sticky column beside the five-stage journey. It is a goods
 * image, not a work image, because the journey is about the product moving from
 * origin to a UK shelf — so the visual has to show the product, not a laptop.
 */
export const IMAGERY_E: readonly HomeImageRole[] = ['warehouse-aisle'];