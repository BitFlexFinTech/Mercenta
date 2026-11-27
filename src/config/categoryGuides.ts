/**
 * §PUBLIC SURFACES BATCH 5 (2026-11-27) — THE ONE OWNER OF WHAT EACH CATEGORY IS.
 *
 * WHY THIS EXISTS. The categories page used to print the ten approved categories as ten identical
 * pills (measured: `PublicContentPage.tsx` mapped `APPROVED_CATEGORIES` into styled `<li>`s). A pill
 * tells a brand its category exists; it does not tell it whether its product BELONGS there, whether
 * it is the kind of product that works, or what usually goes wrong. Those are the three questions a
 * brand actually arrives with, so each category now answers them.
 *
 * Keyed to the approved list, not to a copy of it: `category` is typed `ApprovedCategory`, so a
 * category that is not approved cannot be written here at all — the build fails on the type — and
 * `scripts/validate-category-guides.mjs` fails if any approved category is missing.
 *
 * WHAT THIS COPY MAY NOT DO (the same four rules as `publicPages.ts`):
 *   · it never names the retail channel;
 *   · it makes no claim about results, sales, clients or rankings — there is not one figure here;
 *   · it never states a programme rule as fact;
 *   · it never describes Mercenta's mechanism or commercial terms.
 * What it does is describe PRODUCTS and the practical thing that decides whether they work in UK
 * retail. That is knowledge the business already has, and it is why this page is worth reading
 * rather than a list of names.
 */
import type { ApprovedCategory } from '@/types';
import type { PublicImageRole } from '@/config/homepageImagery';

export interface CategoryGuide {
  /** One of the ten approved categories. The type makes an unapproved one impossible. */
  category: ApprovedCategory;
  /** What belongs in this category, in plain words. */
  belongs: string;
  /** The qualities a product needs to do well here. */
  strong: string;
  /** What usually goes wrong — the honest part, and the reason to trust the page. */
  watchOut: string;
  /** A representative photograph of this kind of product. Alt text lives with the picture. */
  image: PublicImageRole;
  /** What the photograph shows, for the caption under it. */
  caption: string;
}

export const CATEGORY_GUIDES: readonly CategoryGuide[] = [
  {
    category: 'Home',
    belongs:
      'Storage, textiles, small furniture, lighting and the household essentials a home replaces or upgrades every year.',
    strong:
      'Compact, obviously useful at a glance, packed to survive a courier, and light enough that carriage does not eat the margin.',
    watchOut:
      'Glass and flat-pack are where this category loses money — breakage in transit and dimensional weight both cost more than the sale returns.',
    image: 'cat-home',
    caption: 'Household goods of the kind that fill this category.',
  },
  {
    category: 'Baby',
    belongs:
      'Feeding, bathing, nursery textiles, travel accessories and early-years play — the repeat purchases of a child’s first three years.',
    strong:
      'Complete safety paperwork before the first listing, unambiguous age grading, and something a parent buys again within the year.',
    watchOut:
      'Anything without traceable safety documentation stops at compliance, however strong the demand looks.',
    image: 'cat-baby',
    caption: 'Feeding, bathing and nursery items typical of this category.',
  },
  {
    category: 'Office Products',
    belongs:
      'Stationery, paper, filing, desk accessories and the consumables an office reorders without thinking about it.',
    strong:
      'Sold in packs, reordered on a cycle, and named precisely enough that a buyer can find the exact size or specification again.',
    watchOut:
      'Single units move slowly here; this is a category that rewards the multipack and a consistent pack size.',
    image: 'cat-office',
    caption: 'Stationery and desk supplies typical of this category.',
  },
  {
    category: 'Health & Personal Care',
    belongs:
      'Skincare, oral care, supplements, first aid and personal hygiene — products bought on routine rather than on impulse.',
    strong:
      'Ingredient and claim wording that is compliant at the first submission, and packaging that survives a postal journey without leaking.',
    watchOut:
      'An unsubstantiated claim is the most common reason a product in this category stalls, and the hardest to fix after launch.',
    image: 'cat-health',
    caption: 'Personal care and wellness products typical of this category.',
  },
  {
    category: 'Kitchen',
    belongs: 'Cookware, bakeware, utensils, food storage and small countertop appliances.',
    strong:
      'One clear job done well, durable materials, and dimensions stated plainly enough to know it fits a standard cupboard.',
    watchOut:
      'Hand-wash-only items come back. The expectation here is dishwasher-safe, and anything less generates returns.',
    image: 'cat-kitchen',
    caption: 'Cookware and kitchen tools typical of this category.',
  },
{
    category: 'Consumer Electronics',
    belongs:
      'Accessories, audio, charging and small connected devices, where the accessory is often the volume.',
    strong:
      'Compatibility stated precisely, UK plug and voltage correct, and a warranty route that genuinely exists for a UK buyer.',
    watchOut:
      'A missing UK plug, or a compatibility line that assumes too much, is an immediate return and a poor review.',
    image: 'cat-electronics',
    caption: 'Consumer electronics and accessories typical of this category.',
  },
  {
    category: 'Automotive',
    belongs:
      'Car care, interior accessories, tools, mats and seasonal kit — much of it bought against a specific vehicle.',
    strong:
      'Fitment stated by make, model and year of manufacture, and materials that survive weather and washing.',
    watchOut:
      '“Universal fit” causes returns. A fitment table removes the guesswork, and most of the complaints with it.',
    image: 'cat-automotive',
    caption: 'A classic car — the kind whose parts this category supplies.',
  },
  {
    category: 'Grocery',
    belongs:
      'Ambient food and drink, snacks, store-cupboard ingredients and speciality lines that travel without refrigeration.',
    strong:
      'Shelf life long enough to clear a distribution cycle, allergen information complete, and packaging that survives a pallet.',
    watchOut:
      'A short shelf life destroys the economics of a slow-moving line long before the product itself is at fault.',
    image: 'cat-grocery',
    caption: 'Packaged ambient grocery products typical of this category.',
  },
  {
    category: 'Personal Computer',
    belongs:
      'Laptops, desktops, monitors, components and peripherals — the hardware bought against a specification.',
    strong:
      'The specification written exactly as it ships, and a warranty honoured in the UK rather than referred abroad.',
    watchOut:
      'A model number that differs from the marketed name is the classic mismatch here, and it is the buyer who discovers it.',
    image: 'cat-computer',
    caption: 'Computer hardware and peripherals typical of this category.',
  },
  {
    category: 'Apparel',
    belongs:
      'Everyday clothing, workwear, accessories and footwear, where size and fit decide everything.',
    strong:
      'A size guide that matches the actual garment, consistent sizing across the range, and returns handling that does not swallow the margin.',
    watchOut:
      'Inconsistent sizing is the biggest single cause of returns in this category — and returns are where the profit goes.',
    image: 'cat-apparel',
    caption: 'Clothing on a retail rail, typical of this category.',
  },
] as const;