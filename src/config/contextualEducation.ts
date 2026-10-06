/**
 * §PHASE 5 — CONTEXTUAL EDUCATION — the ONE owner of the "why do we need this?"
 * explanations attached to real fields on the real screens.
 *
 * WHY THIS EXISTS
 * ---------------
 * The registry row `phase5-contextual-education` recorded "contextual field
 * explanations ("why do we need this?") attached to the real screens, reusing the
 * existing Knowledge Base + UserTour architecture". The seams already existed:
 *
 *   · `src/data/knowledgeBase.ts → KB_ARTICLES` is the canonical LEARN content
 *     (the help articles surfaced contextually from tour steps);
 *   · `src/config/tours/tourDefinitions.ts → TOUR_REGISTRY` is the canonical WATCH
 *     content (the guided tours of the real screens);
 *   · `src/components/shared/TourEngine.tsx` already renders a "Learn more" link
 *     from a tour step to its Knowledge Base article.
 *
 * What was MISSING was the owner of the FIELD explanations themselves: the ONE
 * place that says, for a real input on a real screen, WHY it is needed — and that
 * LINKS that explanation to the canonical article (LEARN) and the canonical guided
 * tour of that screen (WATCH), instead of writing a second copy of the help text.
 *
 * NO CONTENT IS DUPLICATED HERE. Every explanation points at a canonical Knowledge
 * Base article by id; the article's title and body stay the single owner of the
 * help text. Every screen points at a canonical guided tour by id. A field whose
 * canonical article did not exist would be a defect, so the module-load guards
 * below REFUSE to load at all in that case (fail closed) — and the resolver refuses
 * it again at runtime.
 */
import { KB_ARTICLES } from '@/data/knowledgeBase';
import { TOUR_REGISTRY } from '@/config/tours/tourDefinitions';

/* ── 1. The real screens the explanations attach to ──────────────────────── */

export type ContextualScreenId =
  | 'product-catalog'
  | 'purchase-orders'
  | 'logistics'
  | 'compliance'
  | 'billing'
  | 'settings';

export interface ContextualScreenDefinition {
  id: ContextualScreenId;
  /** The brand-facing name of the screen. */
  label: string;
  /**
   * The canonical guided tour of this screen (WATCH), or null when the screen has
   * no guided tour. It is an id into `TOUR_REGISTRY`.
   */
  tourId: string | null;
}

export const CONTEXTUAL_SCREENS: Record<ContextualScreenId, ContextualScreenDefinition> = {
  'product-catalog': { id: 'product-catalog', label: 'Product catalogue', tourId: 'catalog' },
  'purchase-orders': { id: 'purchase-orders', label: 'Purchase orders', tourId: 'po-acknowledgment' },
  logistics: { id: 'logistics', label: 'Logistics Hub', tourId: 'shipping' },
  compliance: { id: 'compliance', label: 'Compliance', tourId: 'compliance' },
  billing: { id: 'billing', label: 'Billing & deductions', tourId: 'deductions' },
  settings: { id: 'settings', label: 'Settings & team', tourId: 'team-management' },
};

export const CONTEXTUAL_SCREEN_ORDER: readonly ContextualScreenId[] = [
  'product-catalog',
  'purchase-orders',
  'logistics',
  'compliance',
  'billing',
  'settings',
] as const;

/* ── 2. The field explanations ───────────────────────────────────────────── */

export interface ContextualExplanation {
  /** Stable key of the real field the explanation attaches to. */
  key: string;
  /** The real screen the field lives on. */
  screen: ContextualScreenId;
  /** The brand-facing label of the field. */
  label: string;
  /** The short answer to "why do we need this?" — plain language. */
  why: string;
  /** The canonical Knowledge Base article (LEARN) that teaches it, by id. */
  articleId: string;
}

export const CONTEXTUAL_EXPLANATIONS: readonly ContextualExplanation[] = [
  {
    key: 'product.ean',
    screen: 'product-catalog',
    label: 'EAN / barcode',
    why: 'The retail channel identifies each product by its barcode, so a catalogue entry without one cannot be listed. It must match the barcode physically printed on your packaging.',
    articleId: 'kb-catalog',
  },
  {
    key: 'product.commodityCode',
    screen: 'product-catalog',
    label: 'Commodity (HS) code',
    why: 'The commodity code tells customs what the goods are. It is needed to clear an international shipment and to work out the duty treatment, so it is captured once on the product.',
    articleId: 'kb-catalog',
  },
  {
    key: 'product.exWorksPrice',
    screen: 'product-catalog',
    label: 'Ex-works price',
    why: 'The ex-works price is what your product costs at your premises, before carriage. Mercenta uses it as the basis of your commercial terms, so it has to be stated on the product.',
    articleId: 'kb-catalog',
  },
  {
    key: 'product.casePack',
    screen: 'product-catalog',
    label: 'Case-pack quantity',
    why: 'The case-pack quantity is how many units are in one carton. It has to be exact because it drives how a purchase order is split into shippable cartons.',
    articleId: 'kb-catalog',
  },
  {
    key: 'po.acknowledgedQuantity',
    screen: 'purchase-orders',
    label: 'Acknowledged quantity',
    why: 'Acknowledging tells Mercenta, line by line, exactly what you can actually supply. Mercenta passes the outcome to the retail channel, so you acknowledge at or below the ordered quantity — never above.',
    articleId: 'kb-purchase-orders',
  },
  {
    key: 'po.rejectionReason',
    screen: 'purchase-orders',
    label: 'Rejection reason',
    why: 'When you cannot supply a line, the reason records why. It gives Mercenta what it needs to handle the line with the retail channel, so the outcome is explained rather than silent.',
    articleId: 'kb-purchase-orders',
  },
  {
    key: 'po.unitPrice',
    screen: 'purchase-orders',
    label: 'PO unit price',
    why: 'The purchase order carries the price the retail channel is ordering at. You acknowledge at that price or below; a higher acknowledgement would be refused.',
    articleId: 'kb-purchase-orders',
  },
  {
    key: 'shipment.cartonCount',
    screen: 'logistics',
    label: 'Carton count',
    why: 'The carton count is what the carrier is told to collect. It must match what you actually seal, because the shipment information Mercenta files has to describe the real consignment.',
    articleId: 'kb-shipments',
  },
  {
    key: 'shipment.lotExpiry',
    screen: 'logistics',
    label: 'Lot number / expiry date',
    why: 'For regulated products, the retail channel requires the lot number and expiry date on the shipment. They belong to the physical goods, so they are captured against the consignment.',
    articleId: 'kb-shipments',
  },
  {
    key: 'compliance.documentReference',
    screen: 'compliance',
    label: 'Document reference / expiry',
    why: 'Compliance is a hard gate: a product cannot be listed until every applicable required document is present and approved. The reference and expiry let Mercenta verify the document and know when it lapses.',
    articleId: 'kb-compliance',
  },
  {
    key: 'deduction.disputeEvidence',
    screen: 'billing',
    label: 'Dispute evidence',
    why: 'A deduction reduces what Mercenta is paid. To dispute one, the evidence that supports your position has to be attached, so the dispute is decided on the record rather than on assertion.',
    articleId: 'kb-guidance',
  },
  {
    key: 'settings.bankDetails',
    screen: 'settings',
    label: 'Bank details (payee)',
    why: 'Payouts are made to the account you nominate, and only after Mercenta approves the payout. The details are held in Settings so the payee is under your control.',
    articleId: 'kb-guidance',
  },
];

/* ── 3. The rules and the refusals, stated once ──────────────────────────── */

export const CONTEXTUAL_EDUCATION_RULES: readonly string[] = [
  'Every explanation LINKS to a canonical Knowledge Base article; the article stays the single owner of the help text.',
  'Every explanation is attached to a REAL screen, and each screen names its canonical guided tour.',
  'An explanation whose canonical article does not exist is REFUSED — the owner will not load with one.',
  'The explanations are deterministic — no AI, no clock, no randomness, no network.',
] as const;

export const CONTEXTUAL_EDUCATION_REFUSALS = {
  unknownField:
    'CONTEXTUAL_HELP_UNKNOWN — no explanation is declared for that field, so none is shown rather than a guessed one.',
  missingArticle:
    'CONTEXTUAL_HELP_ARTICLE_MISSING — the explanation points at a Knowledge Base article that does not exist, so it is refused rather than shown.',
} as const;

export const CONTEXTUAL_EDUCATION_BASIS =
  'Each real field on a real screen carries a short "why do we need this?" explanation that LINKS to the canonical Knowledge Base article which teaches it and to the canonical guided tour of that screen — the help text is never duplicated.';

export const CONTEXTUAL_EDUCATION_DISCLAIMER =
  'Contextual education only explains a field; it never changes a brand’s commercial model, compliance or settlement, and it is deterministic — no AI, no clock.';

/** Pinned invariants the gate asserts. */
export const EXPLANATIONS_REUSE_CANONICAL_KB = true;
export const EXPLANATIONS_ATTACH_TO_REAL_SCREENS = true;

/* ── 4. Module-load guards (fail closed) ─────────────────────────────────── */

if (CONTEXTUAL_EXPLANATIONS.length === 0) {
  throw new Error('[contextualEducation] at least one explanation must be declared');
}
{
  const keys = CONTEXTUAL_EXPLANATIONS.map((e) => e.key);
  if (new Set(keys).size !== keys.length) {
    throw new Error('[contextualEducation] two explanations must not share a field key');
  }
}
{
  const articleIds = new Set(KB_ARTICLES.map((a) => a.id));
  for (const e of CONTEXTUAL_EXPLANATIONS) {
    if (!articleIds.has(e.articleId)) {
      throw new Error(`[contextualEducation] field "${e.key}" points at a missing Knowledge Base article "${e.articleId}"`);
    }
  }
}
{
  const declaredScreens = new Set(CONTEXTUAL_SCREEN_ORDER);
  for (const id of CONTEXTUAL_SCREEN_ORDER) {
    const screen = CONTEXTUAL_SCREENS[id];
    if (!screen) {
      throw new Error(`[contextualEducation] screen "${id}" is not declared`);
    }
    if (screen.tourId !== null && !TOUR_REGISTRY[screen.tourId]) {
      throw new Error(`[contextualEducation] screen "${id}" points at a missing tour "${screen.tourId}"`);
    }
  }
  for (const e of CONTEXTUAL_EXPLANATIONS) {
    if (!declaredScreens.has(e.screen)) {
      throw new Error(`[contextualEducation] field "${e.key}" attaches to an unknown screen "${e.screen}"`);
    }
  }
}
