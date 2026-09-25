/**
 * §Functional-completion (2026-09-17) — Knowledge Base article store (§14).
 * Canonical, deterministic help articles surfaced contextually from tour
 * steps (UserTour → article). Wording follows the same outward-facing
 * rules as every brand surface (channel distribution, never unsupported
 * claims).
 */
import type { KBArticle } from '@/types';
import { PO_ACKNOWLEDGEMENT_HOURS, PO_ACK_ONBOARDING_STATEMENT } from '@/config/purchaseOrders';

export const KB_ARTICLES: KBArticle[] = [
  {
    id: 'kb-welcome',
    title: 'Welcome — how your brand works with Mercenta',
    summary: 'The retail channel places orders with Mercenta; Mercenta routes them into your brand workspace for your decision.',
    sections: [
      { heading: 'The flow', body: 'A retail-channel purchase order is issued to Mercenta as the channel intermediary. Mercenta identifies your brand and routes the order into your workspace. Your approve / reject / modify decision is an instruction to Mercenta, which communicates the outcome through the channel integration.' },
      { heading: 'Your part', body: 'Acknowledge purchase orders, keep your catalogue and compliance documents current, ship on time, and tell Mercenta when your physical packing differs from the acknowledged quantities. Mercenta files the shipment documents and communicates with the channel.' },
    ],
  },
  {
    id: 'kb-dashboard',
    title: 'Your dashboard',
    summary: 'The dashboard shows your real tenant data — orders, shipments, compliance and payouts — and nothing decorative.',
    sections: [
      { heading: 'At a glance', body: 'Every number on the dashboard is derived from your own purchase orders, shipments, compliance documents, deductions and payout records. A card that shows a count can be clicked to open the detail it came from.' },
      { heading: 'Health', body: 'Compliance and account health reflects the actual state of your documents and distribution agreement — if a document is missing the gate shows it.' },
    ],
  },
  {
    id: 'kb-purchase-orders',
    /**
     * §P13 / S8 — REPOINTED (old contract recorded). This article used to read:
     *
     *   title:   'Purchase orders & the 24-hour rule'
     *   summary: 'Acknowledge each purchase order within 24 hours and acknowledge only
     *             what you can actually ship.'
     *   body:    'An unacknowledged order after 24 hours is flagged and can lead to a
     *             vendor-performance deduction. Check your purchase order list every day.'
     *
     * The body asserted a consequence the platform's own discrepancy register records
     * as UNSUPPORTED (`docs/AMAZON_RECONCILIATION_STATUS.md` AV-003 — no Amazon source
     * documents a vendor-performance rating or its triggers). The rule, its short form
     * and the documented rejection reasons now come from the ONE owner
     * (`src/config/purchaseOrders.ts → PO_ACK_ONBOARDING_STATEMENT`); this article is
     * the target of both acknowledgement tour steps' `learnMore` link, so it can no
     * longer teach a different rule from the tours. Asserted by
     * `scripts/validate-po-acknowledgement-onboarding-surfaces.mjs`.
     */
    title: `Purchase orders & the ${PO_ACKNOWLEDGEMENT_HOURS}-hour acknowledgement rule`,
    summary: PO_ACK_ONBOARDING_STATEMENT.shortText,
    sections: [
      { heading: 'Acknowledging', body: 'For each line you can accept the full quantity, reject it, or backorder it. You cannot acknowledge more than the ordered quantity, and you acknowledge at or below the PO unit price.' },
      { heading: 'The window', body: PO_ACK_ONBOARDING_STATEMENT.text },
      { heading: 'Rejection reasons', body: `If you reject a line, you must use one of the channel's documented reason codes: ${PO_ACK_ONBOARDING_STATEMENT.rejectionCodes.join(' · ')}. Mercenta reviews avoidable rejections with you, because Mercenta is the vendor of record on the channel account.` },
      { heading: 'Accuracy', body: 'If your shipment information (ASN) differs from what you acknowledged, the channel may apply an inaccuracy deduction. Count every carton before sealing.' },
    ],
  },
  {
    id: 'kb-catalog',
    title: 'Product catalogue requirements',
    summary: 'Each product needs, at minimum: SKU, EAN, ex-works price, retail price, case-pack quantity, commodity code and images.',
    sections: [
      { heading: 'Prerequisites', body: 'The catalogue lists the exact prerequisites for every submission. Missing prerequisites block the submission — that is a gate, not a cosmetic warning.' },
      { heading: 'Images', body: 'A listing needs a high-resolution hero image and ideally lifestyle and detail shots. Listings without imagery underperform and are flagged by the Listing Analyzer.' },
      { heading: 'Regulated products', body: 'Products in regulated categories (for example Grocery, or Health & Personal Care) must carry the correct paperwork AND — where the channel requires it — lot numbers and expiry dates on shipments.' },
    ],
  },
{
    id: 'kb-shipments',
    title: 'Logistics Hub & ASNs',
    summary: 'Ship to the UK through Mercenta’s carrier accounts — international via DHL, UK domestic via Palletline — and file exact shipment information.',
    sections: [
      { heading: 'Carriers', body: 'International shipments travel on Mercenta’s DHL account; UK domestic shipments use Mercenta’s Palletline account. Brands do not pick arbitrary carriers.' },
      { heading: 'ASN accuracy', body: 'The carton contents, quantities and — for regulated items — lot numbers and expiry dates on your shipment information must match what you acknowledged.' },
      { heading: 'Compliance stays independent', body: 'Compliance documentation requirements are separate from your commercial terms with Mercenta and are never bypassed by them.' },
    ],
  },
  {
    id: 'kb-compliance',
    title: 'UK compliance — the hard gate',
    summary: 'The compliance gate must be cleared before a product can be submitted to the retail channel. Manual approval cannot replace a required document.',
    sections: [
      { heading: 'What is required', body: 'The documents your products need depend on their category and the applicable UK rules. Nothing can enter the catalogue → purchase-order workflow until every applicable required document is present and approved.' },
      { heading: 'If something expires', body: 'Keep documents current. Where a document expires, the catalogue is disabled and no new purchase orders can be received until it is restored.' },
      { heading: 'Mercenta’s part', body: 'Mercenta handles customs basics such as EORI/VAT registration. You keep your own compliance documentation current and upload it for verification.' },
    ],
  },
  {
    id: 'kb-guidance',
    title: 'Operational guidance & advertising budget',
    summary: 'Where to set your team permissions, notification preferences and how the recommended advertising budget flow works.',
    sections: [
      { heading: 'Account settings', body: 'Bank information, team roles and permissions, PO outages, return addresses and notifications all live in Settings. Your commercial relationship with Mercenta is shown read-only there.' },
      { heading: 'Advertising budget', body: 'Mercenta prepares a recommended monthly advertising budget from deterministic estimates. Nothing is spent until you approve, amend or reject it — your decision is final and recorded.' },
    ],
  },
];

export function getKnowledgeArticle(id: string): KBArticle | undefined {
  return KB_ARTICLES.find((a) => a.id === id);
}