/**
 * §Stage-1 Demo dataset — CANONICAL 20 REAL BRANDS.
 *
 * Phase 4: the demo tenant universe is exactly **20 REAL companies**
 * (10 UK + 10 international). Every brand here is a real business/brand;
 * all operational records attached to them (POs, shipments, invoices,
 * compliance evidence) are SIMULATED and truthfully labelled (PO-SIM- ids,
 * `simulated: true`, simulated:// evidence) — the company itself is real.
 *
 * The dataset preserves the legitimate real international brands that were
 * already present in the Brand Intelligence universe (Tapatío, Cholula,
 * Valentina, Fly By Jing, LocknLock) and the real UK brands already seeded
 * as prospects (Astonish, Seep, Delphis Eco, Kit & Kin).
 *
 * Category coverage: all TEN approved Amazon UK Vendor Central categories
 * (types.ts APPROVED_CATEGORIES) are represented across the 20.
 *
 * Shapes mirror the live integration payloads so src/data/api.ts can swap
 * seed → live without any UI change.
 */
import { DEFAULT_PRODUCT_TAX_CODE } from '@/types';
import {
  PO_ACKNOWLEDGEMENT_HOURS,
  PO_ACK_ON_BEHALF_WINDOW_HOURS,
  PO_ACK_STATUSES_WITH_OBLIGATION,
} from '@/config/purchaseOrders';
import type {
  ComplianceDocument,
  Contract,
  FreightTerm,
  FulfillmentTrack,
  OperatingVertical,
  Message,
  Product,
  ProductImage,
  ProductSubmission,
  PurchaseOrder,
  PurchaseOrderStatus,
  ShipmentEta,
  DeliveryAppointment,
} from '@/types';
import { COMMISSION_RATE_PLACEHOLDER, MONTHLY_FEE_PLACEHOLDER_GBP } from '@/config/commercial';
import { AMAZON_PARTNERED_CARRIER } from '@/config/shipping';
import { declaredShipToParty, destinationLabelForPo } from '@/config/destinationFc';
import { resolveShippingLane, selectCarrierForLane } from '@/lib/shipping/carrierRouting';
import type { CommercialModel } from '@/config/commercialModel';

export interface DemoBrand {
  id: string;
  name: string;
  category: string;
  region: 'north_america' | 'europe' | 'africa';
  nation: string;
  email: string;
  signatory: string;
  track: 'direct_fulfillment' | 'financed';
  /**
   * §WAVE 3g (2026-11-25) — the brand's OPERATING VERTICAL. `core` is this
   * platform's own retail-channel business; `bws` and `talent_commerce` are the
   * other two operating models. Every brand the demo holds belongs to `core` — none
   * is a BWS or Talent Commerce brand — and recording that is the honest state
   * rather than inventing one.
   */
  vertical: OperatingVertical;
  contractStatus: Contract['status'];
  /**
   * §5/M12 — this brand's commercial relationship with Mercenta. INTERNAL to
   * Mercenta+brand, and completely separate from the retail-channel compliance
   * documentation the brand's products need. Never assume every brand is the
   * same model (the demo deliberately mixes both).
   */
  commercialModel: CommercialModel;
  /**
   * §Phase 4 — UK versus International origin market. Both groups are
   * first-class in the SAME acquisition/distribution architecture — there is
   * deliberately no UK-only platform and no separate navigation.
   */
  market: 'uk' | 'international';
  /** §Phase 4 — the real brand's public website (evidence for §12). */
  website: string;
}

/** §Phase 4 — real brand websites (public evidence, not invented facts).
 *  §BATCH 7 (Part 4.2) — REPOINTED to the canonical demo universe. This map used to
 *  carry 20 entries from the retired 17-brand universe (seep, regatta, clipper, …);
 *  those ids no longer resolve to a brand, so the extra keys were dead references
 *  kept alive only here. It now declares exactly the four canonical brands. */
const BRAND_SITE: Record<string, string> = {
  'brand-astonish': 'https://astonishcleaning.com',
  'brand-tapatio': 'https://tapatiohotsauce.com',
  'brand-lecreuset': 'https://www.lecreuset.co.uk',
  'brand-kitkin': 'https://kitandkin.com',
};

/**
 * §19/M12 / §Phase 4 — the two brands the investor demo names "Brand A" and
 * "Brand B". Declared ONCE here (not re-typed in the demo, the Founder Centre
 * or a validator) so the demo story and its evidence cannot drift apart.
 * Model A (commission-style) runs on a real UK brand; Model B (buy/resell)
 * runs on a real international brand — both models are exercised.
 */
export const DEMO_MODEL_A_BRAND_ID = 'brand-astonish';
export const DEMO_MODEL_B_BRAND_ID = 'brand-tapatio';

/**
 * §P2 (owner decision D1, 2026-10-02) — the demo universe is THREE businesses,
 * not twenty. All are real companies and each row carries the real brand's
 * public website as §12 evidence; nothing unverified (ASINs, sales, rankings,
 * revenue, contracts, contact people) is asserted as fact.
 *
 *   Brand A — Astonish (Model A, commission/agent) — CLEARED, trading tenant.
 *   Brand B — Tapatío  (Model B, buy/resell)       — CLEARED, trading tenant.
 *   Brand C — Le Creuset (Model B, buy/resell)     — BLOCKED compliance-scenario
 *             tenant: its documents are not approved, so the compliance gate
 *             blocks it (the demo's compliance-gate demonstration).
 *
 * Two CLEARED trading tenants are kept so "one business cannot see another's
 * data" (tenant isolation) stays provable; the blocked tenant demonstrates the
 * gate. The TEN approved Amazon categories remain KNOWN to the system through
 * the Amazon vendor-code registry (`src/config/amazonVendorCodes.ts`) — the demo
 * no longer carries one business per category. The retired 17-brand universe is
 * recorded in the git history and `docs/CLEANUP_AND_VERIFICATION_PLAN_2026-09-30.md`.
 */
export const DEMO_BRANDS: DemoBrand[] = [
  // Brand A — Astonish (Model A, commission/agent); CLEARED, trading tenant.
  { id: 'brand-astonish', vertical: 'core', name: 'Astonish', category: 'Home', region: 'europe', nation: 'United Kingdom', email: 'trade@astonish.example', signatory: 'Trade team (contact TBC)', track: 'financed', contractStatus: 'active', commercialModel: 'commission_agent', market: 'uk', website: BRAND_SITE['brand-astonish'] },
  // Brand B — Tapatío (Model B, buy/resell); CLEARED, trading tenant.
  { id: 'brand-tapatio', vertical: 'core', name: 'Tapatío', category: 'Grocery', region: 'north_america', nation: 'United States', email: 'trade@tapatio.example', signatory: 'Trade team (contact TBC)', track: 'direct_fulfillment', contractStatus: 'active', commercialModel: 'buy_resell', market: 'international', website: BRAND_SITE['brand-tapatio'] },
  // Brand C — Le Creuset (Model B, buy/resell); BLOCKED compliance-scenario tenant.
  { id: 'brand-lecreuset', vertical: 'core', name: 'Le Creuset', category: 'Kitchen', region: 'europe', nation: 'France', email: 'trade@lecreuset.example', signatory: 'Trade team (contact TBC)', track: 'direct_fulfillment', contractStatus: 'signed', commercialModel: 'buy_resell', market: 'international', website: BRAND_SITE['brand-lecreuset'] },
  // Brand D — Kit & Kin: a brand STILL IN ONBOARDING (not yet in the portal). It
  // demonstrates the onboarding wizard AND an UNAPPROVED brand (contract 'sent',
  // so the shell keeps it in the onboarding wizard rather than the operational
  // workspace). No operational data.
  { id: 'brand-kitkin', vertical: 'core', name: 'Kit & Kin', category: 'Baby', region: 'europe', nation: 'United Kingdom', email: 'trade@kitandkin.example', signatory: 'Trade team (contact TBC)', track: 'direct_fulfillment', contractStatus: 'sent', commercialModel: 'commission_agent', market: 'uk', website: BRAND_SITE['brand-kitkin'] },
];

// §P2 — the retired single-PC re-export (`DEMO_BRAND_PC`) is gone with the
// reduced brand list: nothing imported it, and the Personal Computer category
// remains KNOWN to the system through the Amazon vendor-code registry
// (`src/config/amazonVendorCodes.ts`), not through a demo brand.

/**
 * §P2 — the demo's compliance-scenario tenant. It is Le Creuset (Brand C), which
 * reaches the PORTAL (onboarded) but is NOT gate-cleared, so the compliance gate
 * is genuinely exercised in the blocked state (see `DEMO_COMPLIANCE_SCENARIOS` and
 * the compliance matrix in PROJECT_STATUS.md). Its document statuses are declared
 * BY NAME in `DEMO_COMPLIANCE_SCENARIO_BY_BRAND` below; its contract is 'signed'
 * and both mandatory §4.1/§4.2 agreements are accepted (derived automatically), so
 * the ONLY reason its gate blocks is the document state — exactly what the
 * compliance-gate browser test asserts. The entry is a REFERENCE into DEMO_BRANDS
 * (single source of truth).
 */
export const DEMO_BRANDS_COMPLIANCE_SCENARIOS: DemoBrand[] = [
  DEMO_BRANDS.find((b) => b.id === 'brand-lecreuset')!,
];

/**
 * ALL_DEMO_BRANDS — THE canonical universe = the THREE demo businesses. Exactly
 * one source of truth: there is deliberately no second (fake) brand list anywhere.
 */
export const ALL_DEMO_BRANDS: DemoBrand[] = [...DEMO_BRANDS];

/**
 * §P2 (owner decision D1) — the one-click demo login shows THREE cards: the two
 * DEMO businesses (Brand A Astonish, Brand B Tapatío — one per commercial model,
 * both trading) plus the BLOCKED compliance-scenario tenant (Brand C Le Creuset),
 * so an operator can see BOTH gate states. Every id is a reference into
 * `DEMO_BRANDS`, so the login UI can never become a second, hidden source of brands.
 */
export const DEMO_LOGIN_BRAND_IDS: string[] = [
  'brand-astonish',
  'brand-tapatio',
  'brand-lecreuset',
  'brand-kitkin',
];

/**
 * Brands that have cleared the compliance gate and thus have operational data
 * (products, POs, shipments). In the §P2 universe the TWO cleared trading
 * tenants are Brand A (Astonish, Home) and Brand B (Tapatío, Grocery) — both
 * demonstrate the Money Chain end-to-end in simulated mode AND provide the two
 * data-bearing parties the tenant-isolation proof needs. Brand C (Le Creuset)
 * is the blocked compliance-scenario tenant and carries profile/docs/contract only.
 */
export const CLEARED_BRAND_IDS: string[] = [
  'brand-astonish',
  'brand-tapatio',
];

/**
 * §P2 — compliance-scenario tenant IDs (portal-accessible, NOT cleared).
 * Deterministic demo state so the compliance gate can be genuinely exercised.
 * See `DEMO_BRANDS_COMPLIANCE_SCENARIOS` above and `DEMO_COMPLIANCE_SCENARIOS` below.
 */
export const COMPLIANCE_SCENARIO_BRAND_IDS: string[] = [
  'brand-lecreuset',
];

/**
 * Every demo tenant that completed onboarding and therefore lives in the
 * PORTAL (brand shell + nav). Cleared tenants also get operational data
 * (products/POs/shipments); scenario tenants reach the portal with empty
 * operational data so their compliance state is the only variable under test.
 */
export const PORTAL_BRAND_IDS: string[] = [
  ...CLEARED_BRAND_IDS,
  ...COMPLIANCE_SCENARIO_BRAND_IDS,
];

/**
 * The row shape served for brands via api.fetchBrands() (canonical definition —
 * demoStore re-exports it; views import from HERE, never from demoStore).
 */
export interface DemoBrandRow {
  id: string;
  /** §WAVE 3g — the operating vertical; absent on a row mapped from a database that
   *  predates it, so readers resolve it explicitly rather than assuming. */
  vertical?: OperatingVertical;
  category: string;
  /** §Phase D6 — the CANONICAL track union (was `string`), so a payout can rely
   *  on the financed-fee clause without a cast or a silent default. */
  track: FulfillmentTrack;
  contractStatus: string;
  /**
   * §P13 / S5 — the brand's own contact record. `phone` is the brand's DECLARED
   * instant-message destination for notifications; it is OPTIONAL because the demo
   * holds no verified number for any brand, and its absence is exactly why the
   * instant-message channel fails CLOSED rather than sending to a fabricated
   * address (`src/lib/commerce/poAcknowledgementNotifications.ts →
   * poAckDestinationFor`). Nothing else reads it.
   */
  profile: { businessName: string; phone?: string };
  /**
   * §Canonical model §11 — the brand's nation, used by the shipping-lane
   * routing rule (UK domestic → Palletline, international → DHL). Optional so
   * a legacy/Supabase row without the column still loads; an unknown nation is
   * routed as international (the conservative default).
   */
  nation?: string;
}

/* ── Generated catalogs (2 SKUs per brand, realistic placeholder images) ── */

/**
 * Deterministic placeholder product images using picsum.photos with product-id seed.
 * Each product gets a unique, repeatable photo that looks like a real product shot.
 */
function productImageUrl(productId: string, slot: string = 'main'): string {
  return `https://picsum.photos/seed/${productId}${slot === 'main' ? '' : '-' + slot}/400/400`;
}

const CATEGORY_EMOJI: Record<string, string> = {}; // kept for backward compat; image URLs used instead

/**
 * §Phase E3 — a canonical `Product` PLUS its owning brand tenant.
 *
 * The product shape is declared ONCE (`Product` in src/types.ts). This
 * interface previously re-declared all 20 of those fields verbatim, so the two
 * declarations could silently drift; it now extends the canonical type instead.
 */
export interface DemoProduct extends Product {
  /** The owning brand tenant — the canonical E1/E2 identity. */
  brandId: string;
}

function skuFor(brand: DemoBrand, n: number): string {
  return `${brand.id.slice(6, 10).toUpperCase()}-${String(n).padStart(3, '0')}`;
}

export const DEMO_PRODUCTS: DemoProduct[] = ALL_DEMO_BRANDS
  .filter((b) => CLEARED_BRAND_IDS.includes(b.id))
  .flatMap((brand, bi) =>
  [1, 2].map((n) => ({
    id: `${brand.id}-p${n}`,
    brandId: brand.id,
    name: `${brand.name.split(' ')[0]} ${brand.category} Line ${n}`,
    sku: skuFor(brand, n),
    barcode: `600${String(bi + 1).padStart(2, '0')}${String(n).padStart(3, '0')}${n}45`,
    image: productImageUrl(`${brand.id}-p${n}`),
    exWorksPrice: 8 + n * 4 + bi,
    ukRetailPrice: 24 + n * 9 + bi * 2,
    commodityCode: brand.category === 'Grocery' ? '2106909899' : brand.category === 'Apparel' ? '6115950090' : '3304990090',
    vatStatus: n === 1 ? 'Standard 20%' : 'Zero-rated',
    hazmat: brand.category === 'Automotive' && n === 2,
    length: 12 + n, width: 10 + n, height: 18 + n, weight: 0.4 + n * 0.2,
    // §Stage-24 item setup — case-pack + product tax code (not a bare quantity).
    unitsPerCase: 6 + bi * 2 + n * 4,
    caseOrderable: n === 1,
    productTaxCode: DEFAULT_PRODUCT_TAX_CODE,
  }))
);

export function productsForBrand(brandId: string): DemoProduct[] {
  return DEMO_PRODUCTS.filter((p) => p.brandId === brandId);
}

/* ── Purchase orders — every workflow state represented ─────────────── */

const PO_STATUSES: PurchaseOrderStatus[] = [
  'received', 'under_review', 'accepted', 'rejected',
  'ready_to_fulfil', 'shipped', 'delivered',
];

const REJECTION_REASONS = [
  'Quantity exceeds confirmed production capacity for the quarter.',
  'Requested delivery window conflicts with scheduled maintenance shutdown.',
];

function poStatusFor(brandIndex: number, poIndex: number): PurchaseOrderStatus {
  // Deterministic spread: every brand gets a different workflow position.
  return PO_STATUSES[(brandIndex + poIndex) % PO_STATUSES.length];
}

export const DEMO_WORKFLOW_PURCHASE_ORDERS: PurchaseOrder[] = ALL_DEMO_BRANDS
  .filter((b) => CLEARED_BRAND_IDS.includes(b.id))
  .flatMap(
  (brand, bi) =>
    [0, 1].map((pi): PurchaseOrder => {
      const status = poStatusFor(bi, pi);
      /**
       * §P13 / S7 — WHICH statuses owe an acknowledgement is CONFIG-owned
       * (`src/config/purchaseOrders.ts → PO_ACK_STATUSES_WITH_OBLIGATION`, the very
       * array the window owner consumes). REPOINTED: this was previously re-typed
       * inline as `status === 'received' || status === 'under_review'` in TWO places
       * in this seed. The generated seed is UNCHANGED (the array holds exactly those
       * two statuses).
       */
      const openForAcknowledgement = PO_ACK_STATUSES_WITH_OBLIGATION.includes(status);
      const items = productsForBrand(brand.id).map((p, idx) => ({
        sku: p.sku,
        productName: p.name,
        // One bulk order (cleared brand #2 → PO-9003, Tapatío) is intentionally
        // oversized so the §13 auto-approve HOLD path (PO value ≥ threshold)
        // is exercised in demo data alongside the auto-invoice path.
        quantity:
          (40 + (bi + pi + idx) * 10) * (bi === 1 && pi === 1 ? 8 : 1),
        unitPrice: p.exWorksPrice,
        commodityCode: p.commodityCode,
        /**
         * §WAVE 3 — the retail channel's per-line backorder permission.
         *
         * DECLARED FIXTURE VALUE standing in for the field the channel supplies
         * on its order data (see `src/types.ts → PurchaseOrderLineItem.isBackOrderAllowed`
         * and `docs/AMAZON_VENDOR_TRUTH_VALIDATION_2026-09-20.md` S3/S4).
         *
         * The demo must demonstrate BOTH answers on purchase orders that can
         * actually be acknowledged, so the split is declared deterministically:
         *
         *   · a PO still open for acknowledgement (received / under_review) of the
         *     SECOND cleared tenant declares `true` — the accept / reject /
         *     backorder workflow stays fully demonstrable; and
         *   · the equivalent POs of the first cleared tenant declare `false` — the
         *     fail-closed path is therefore visible in the running product, not
         *     only in a unit test.
         *
         * Nothing here weakens the gate: absent/unknown still fails closed
         * (`src/lib/commerce/backorderGate.ts`), and it is enforced at the domain
         * boundary rather than in the UI.
         */
        isBackOrderAllowed: openForAcknowledgement && bi === 1,
      }));
      const poValue =
        Math.round(items.reduce((s, i) => s + i.quantity * i.unitPrice, 0) * 100) / 100;
      /**
       * §P13 — A SEEDED OPEN PO CARRIES A REAL ACKNOWLEDGEMENT WINDOW.
       *
       * An OPEN purchase order (received / under_review) owes the brand's decision
       * inside 24 hours (`src/config/purchaseOrders.ts`), and the platform now
       * ENFORCES that at the domain boundary
       * (`src/lib/commerce/poAcknowledgementWindow.ts` +
       * `src/data/api.ts → acknowledgePurchaseOrder`): past the limit the
       * documented action is a rejection. A seeded open PO dated 9 or 18 days back
       * therefore could not be acknowledged at all, which would make the demo's
       * acknowledgement workflow — and the live verification that exercises it —
       * unreachable, and would leave the demo contradicting the rule it displays.
       *
       * So an open PO is dated INSIDE the window, while a PO that is past the
       * decision keeps its historical date and lives in history, exactly as the
       * enforced rule requires. The window is an HOUR-resolution rule, so an open
       * PO carries an instant — the same shape the simulated channel POs already
       * use (`src/lib/simulation/scenarioEngine.ts`); surfaces render the DATE
       * through `orderDateLabel()` (`src/lib/dates.ts`).
       */
      /**
       * §P13 / S4 — ONE SEEDED OPEN PO SITS INSIDE THE ON-BEHALF CLOSING WINDOW.
       *
       * The platform now offers the brand a DRAFT of the channel-required rejection
       * from the final notification stage (`PO_ACK_ON_BEHALF_WINDOW_HOURS`) and lets
       * the brand approve it (`src/data/api.ts → draftOnBehalfRejection` /
       * `approveOnBehalfRejection`). If every seeded open PO sat in the middle of its
       * window, that capability — and the live verification that exercises it —
       * would be unreachable in the running product, exactly as the S2 rule would
       * have been unreachable with POs dated 9 days back.
       *
       * So the SECOND open purchase order of the FIRST cleared tenant is dated into
       * its closing window (deadline − 1h 30m): it is still inside the 24-hour limit
       * — so the brand may still decide for itself, and an acceptance is still valid
       * — while the on-behalf draft is genuinely due. The declared schedule owns the
       * arithmetic (`PO_ACKNOWLEDGEMENT_HOURS` − `PO_ACK_ON_BEHALF_WINDOW_HOURS`),
       * never a hand-written 22.
       */
      const closingWindowPo = bi === 0 && pi === 1;
      const orderDate = openForAcknowledgement
        ? new Date(
            Date.now() -
              (closingWindowPo
                ? (PO_ACKNOWLEDGEMENT_HOURS - PO_ACK_ON_BEHALF_WINDOW_HOURS) * 3_600_000 + 30 * 60_000
                : (pi + 1) * 3 * 3_600_000)
          ).toISOString()
        : new Date(Date.now() - (pi + 1) * 9 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const freightTerm: import('@/types').FreightTerm = bi % 2 === 0 ? 'collect' : 'prepaid';
      const orderDateObj = new Date(orderDate);
      const shipWindowStart = new Date(orderDateObj.getTime() + 14 * 864e5).toISOString().slice(0, 10);
      const shipWindowEnd = new Date(orderDateObj.getTime() + 21 * 864e5).toISOString().slice(0, 10);
      const deliveryWindowStart = new Date(orderDateObj.getTime() + 21 * 864e5).toISOString().slice(0, 10);
      const deliveryWindowEnd = new Date(orderDateObj.getTime() + 28 * 864e5).toISOString().slice(0, 10);
      return {
        id: `po-${brand.id}-${pi + 1}`,
        brandId: brand.id,
        poNumber: `PO-${String(9000 + bi * 2 + pi)}`,
        status,
        /**
         * §P5 — the destination the channel declared on this PO (its ship-to
         * party, whose id is the FC code). Every seeded PO declares one, taken
         * deterministically from the canonical FC directory so different tenants
         * genuinely arrive at different fulfilment centres — and so no seeded
         * consignment can ever be routed to a Mercenta hub.
         */
        shipToParty: declaredShipToParty(bi * 2 + pi),
        poValue,
        commissionRate: COMMISSION_RATE_PLACEHOLDER,
        commissionAmount:
          Math.round(((poValue * COMMISSION_RATE_PLACEHOLDER) / 100) * 100) / 100,
        orderDate,
        freightTerm,
        ...(freightTerm === 'collect'
          ? { shipWindowStart, shipWindowEnd }
          : { deliveryWindowStart, deliveryWindowEnd }),
        ...(status === 'rejected'
          ? { rejectionReason: REJECTION_REASONS[bi % REJECTION_REASONS.length] }
          : {}),
        lineItems: items,
      };
    })
);

/* ── §RUNTIME PARITY — deterministic SIMULATED consignment seed ─────────── */

/**
 * The Logistics Hub / Logistics Control map and list can only be INSPECTED with
 * consignments, and shipment creation is PO-GATED: a consignment must derive
 * from a purchase order the brand actually owns. The cleared demo tenants
 * previously held POs only in received / under_review / accepted, so no PO ever
 * carried a shipping status and the seeded consignment set was EMPTY — the map
 * and the list rendered their honest empty states and nothing could be
 * selected, filtered or tracked.
 *
 * This block adds, for the two CLEARED demo tenants only, ONE purchase order per
 * shipping lifecycle state (ready_to_fulfil → shipped → delivered), numbered in
 * their own deterministic block (PO-9200… / PO-9210…) so the four original PO
 * numbers (PO-9000 … PO-9003) are byte-for-byte unchanged and the tenant-scoping
 * assertions that name them keep exactly their original meaning.
 *
 * These are SIMULATED demo fixtures, not live channel purchase orders, and
 * nothing here contacts a provider. Their carriers are derived from the
 * canonical lane rule (`src/lib/shipping/carrierRouting.ts`) — international →
 * DHL, UK domestic → Palletline, Freight Collect → the channel-arranged
 * carrier — so the map's truth labels stay truthful.
 */
const LIFECYCLE_PO_STATUSES: PurchaseOrderStatus[] = [
  'ready_to_fulfil',
  'shipped',
  'delivered',
];

export const DEMO_LIFECYCLE_PURCHASE_ORDERS: PurchaseOrder[] = ALL_DEMO_BRANDS
  .filter((b) => CLEARED_BRAND_IDS.includes(b.id))
  .flatMap((brand, bi) =>
    LIFECYCLE_PO_STATUSES.map((status, li): PurchaseOrder => {
      const items = productsForBrand(brand.id).map((p, idx) => ({
        sku: p.sku,
        productName: p.name,
        quantity: (60 + (bi + li + idx) * 12) * 8,
        unitPrice: p.exWorksPrice,
        commodityCode: p.commodityCode,
      }));
      const poValue =
        Math.round(items.reduce((s, i) => s + i.quantity * i.unitPrice, 0) * 100) / 100;
      const orderDate = new Date(Date.now() - (30 + li * 12) * 864e5)
        .toISOString()
        .slice(0, 10);
      const base = new Date(orderDate);
      /**
       * The first lifecycle PO keeps the brand's own declared freight term; the
       * rest are Mercenta-arranged (prepaid). Both terms therefore genuinely
       * occur in the seeded consignment set, so the map's CHANNEL-ARRANGED and
       * MERCENTA-ARRANGED labels are both exercised — never merely declared.
       */
      const freightTerm: FreightTerm =
        li === 0 ? (bi % 2 === 0 ? 'collect' : 'prepaid') : 'prepaid';
      return {
        id: `po-lifecycle-${brand.id}-${li}`,
        brandId: brand.id,
        poNumber: `PO-${9200 + bi * 10 + li}`,
        status,
        /** §P5 — the seeded lifecycle PO declares its destination FC (see above). */
        shipToParty: declaredShipToParty(bi * 3 + li + 1),
        poValue,
        commissionRate: COMMISSION_RATE_PLACEHOLDER,
        commissionAmount:
          Math.round(((poValue * COMMISSION_RATE_PLACEHOLDER) / 100) * 100) / 100,
        orderDate,
        freightTerm,
        ...(freightTerm === 'collect'
          ? {
              shipWindowStart: new Date(base.getTime() + 14 * 864e5).toISOString().slice(0, 10),
              shipWindowEnd: new Date(base.getTime() + 21 * 864e5).toISOString().slice(0, 10),
            }
          : {
              deliveryWindowStart: new Date(base.getTime() + 21 * 864e5).toISOString().slice(0, 10),
              deliveryWindowEnd: new Date(base.getTime() + 28 * 864e5).toISOString().slice(0, 10),
            }),
        lineItems: items,
      };
    })
  );

/**
 * §RUNTIME PARITY — the canonical seeded PO set is the UNION of the original
 * workflow spread and the deterministic lifecycle block above, so every
 * consumer (PO lists, brand dossiers, dashboards, the consignment seed) reads
 * ONE array and the two can never drift.
 */
export const DEMO_PURCHASE_ORDERS: PurchaseOrder[] = [
  ...DEMO_WORKFLOW_PURCHASE_ORDERS,
  ...DEMO_LIFECYCLE_PURCHASE_ORDERS,
];

/* ── Shipments for accepted/shipped/delivered POs, across all carriers ── */

/**
 * §RUNTIME PARITY — the consignment seed derives from the SAME two PO sets the
 * rest of the demo derives from (the original block + the deterministic
 * lifecycle block above), so consignments can never describe a PO that does not
 * exist. Carriers come from the canonical lane rule, never from a cycle: the
 * retired carrier set must not reappear now that consignments actually exist.
 */
const SHIPMENT_STATUS_BY_PO: Partial<Record<PurchaseOrderStatus, string>> = {
  ready_to_fulfil: 'factory_intake',
  shipped: 'sea_transit',
  delivered: 'live_amazon',
};

export interface DemoShipment {
  id: string;
  brandId: string;
  poNumber: string;
  carrier: string;
  reference: string;
  title: string;
  value: number;
  status: string;
  origin: string;
  destination: string;
  delayed: boolean;
  exception: boolean;
  /** §Priority-1 — carrier waybill / tracking once booked through the DHL seam. */
  waybill?: string;
  trackingNumber?: string;
  /**
   * §WAVE 3 — the canonical ETA, attached on READ by
   * `src/data/api.ts → attachShipmentEta` (derived from the linked PO's window +
   * the recorded delay/exception state). It is a projection, not stored state, so
   * it can never drift from the PO it is derived from.
   */
  eta?: ShipmentEta;
  /**
   * §BATCH 2i (`AV-045`) — the canonical APPOINTMENT projection, attached on
   * READ by `src/data/api.ts → attachShipmentAppointment` (derived from the
   * linked PO's declared delivery window + the consignment's milestone and
   * recorded delay/exception state). Like the ETA it is a projection, not stored
   * state, so it can never drift from the PO it is derived from.
   */
  appointment?: DeliveryAppointment;
}

/**
 * §SSOT — THE DEMO'S IN-TRANSIT EXCEPTION SCENARIO, NAMED (declared ONCE).
 *
 * WHO CARRIES AN IN-TRANSIT PROBLEM, and nothing else does. Each entry closes
 * through the ONE writer (`clearShipmentException`, or a milestone in
 * `SHIPMENT_RESOLVED_STATUSES`), so no consignment can hold work that no action
 * clears. `scripts/validate-work-layer.mjs` asserts both the declaration and the
 * closing path.
 */
const DEMO_SHIPMENT_EXCEPTION_SCENARIO: Record<string, { delayed?: boolean; exception?: boolean }> = {
  /** PO-9201 · Astonish · Palletline, in the carrier network — a real in-transit delay. */
  'shipment-po-lifecycle-brand-astonish-1': { delayed: true },
  /** PO-9210 · Tapatío · DHL, at factory intake — a real in-transit exception. */
  'shipment-po-lifecycle-brand-tapatio-0': { exception: true },
};

export const DEMO_SHIPMENTS: DemoShipment[] = DEMO_PURCHASE_ORDERS
  .filter((po) => po.status in SHIPMENT_STATUS_BY_PO)
  .map((po) => {
    const brand = ALL_DEMO_BRANDS.find((b) => b.id === po.brandId)!;
    const id = `shipment-${po.id}`;
    /**
     * §SSOT — THE DEMO'S IN-TRANSIT EXCEPTION SCENARIO, NAMED.
     *
     * REPOINTED (the old contract, recorded): these two flags used to be produced
     * by POSITION ARITHMETIC — `delayed: i % 4 === 1` and `exception: i % 7 === 3`,
     * in this file AND again in `demoStore.ts` — so the demo raised delay/exception
     * work from a loop counter rather than from a declared situation, and the same
     * fact had two writers. One consignment contradicted itself outright: PO-9212
     * was at the terminal `live_amazon` milestone while flagged delayed.
     *
     * The scenario is now an explicit, reviewable declaration of WHICH consignments
     * carry an in-transit problem, each of which closes through the ONE writer
     * (`clearShipmentException`, or a milestone in `SHIPMENT_RESOLVED_STATUSES`).
     * The assertion lives in `scripts/validate-work-layer.mjs`.
     */
    const scenario = DEMO_SHIPMENT_EXCEPTION_SCENARIO[id] ?? {};
    /**
     * Freight Collect = the retail channel arranges carriage, so the
     * channel-arranged carrier is used and Mercenta is never shown as choosing
     * it. Otherwise the canonical lane rule decides: UK domestic → Palletline,
     * international → DHL.
     */
    const carrier =
      po.freightTerm === 'collect'
        ? AMAZON_PARTNERED_CARRIER
        : selectCarrierForLane(resolveShippingLane({ brandNation: brand.nation }));
    return {
      id,
      brandId: po.brandId,
      poNumber: po.poNumber,
      carrier,
      reference: `${carrier.slice(0, 2).toUpperCase()}-${po.poNumber}`,
      title: `${brand.name.split(' ')[0]} — ${po.poNumber}`,
      value: po.poValue,
      status: SHIPMENT_STATUS_BY_PO[po.status]!,
      origin: `${brand.nation} depot`,
      /**
       * §P5 REPOINTED THIS (old contract, for the record): every seeded
       * consignment was given `destination: 'Mercenta UK Hub'`. The destination is
       * now resolved from the PO's own ship-to party — the FC the channel put on
       * the order — by the ONE owner (`src/config/destinationFc.ts`), so the seed
       * and the runtime path cannot disagree.
       */
      destination: destinationLabelForPo(po),
      /**
       * §SSOT — the flags come from the NAMED scenario above, never from the row's
       * position in this array. A consignment whose milestone is already resolved
       * carries NO in-transit flag (see `SHIPMENT_RESOLVED_STATUSES`).
       */
      delayed: scenario.delayed === true,
      exception: scenario.exception === true,
    };
  });

/* ── Contracts — varied states per brand ─────────────────────────────── */

export const DEMO_CONTRACTS: Contract[] = ALL_DEMO_BRANDS.map((brand, i) => {
  const year = 2026;
  return {
    id: `contract-${brand.id}`,
    brandId: brand.id,
    type: 'distribution_agreement',
    status: brand.contractStatus,
    commissionRate: COMMISSION_RATE_PLACEHOLDER,
    monthlyFee: MONTHLY_FEE_PLACEHOLDER_GBP,
    fulfillmentTrack: brand.track,
    effectiveDate: `${year}-0${(i % 8) + 1}-01`,
    /**
     * First brand renews INSIDE the §13 60-day window — exercises the urgency
     * badge + renewal-draft path in demo data (staggered renewals).
     *
     * §DEFECT FIXED AT SOURCE (2026-10-02) — RELATIVE, not the stale literal
     * `${year}-10-01`. The old fixed date fell into the PAST as the real calendar
     * advanced, so the Stage-9 "renewal urgency badge" assertion failed with NO
     * product change — a gate that depended on the calendar (the same class
     * `scripts/validate-operating-costs.mjs` was fixed for on 2026-10-01). 12 days
     * out keeps the demonstration true on ANY day and still matches the original
     * intent (2026-09-19 → 2026-10-01 was a 12-day gap).
     */
    renewalDate: i === 0
      ? new Date(Date.now() + 12 * 864e5).toISOString().slice(0, 10)
      : `${year + 1}-0${(i % 8) + 1}-01`,
    documentUrl: '',
    signatories:
      brand.contractStatus === 'draft' || brand.contractStatus === 'sent'
        ? []
        : [{ name: brand.signatory, email: brand.email }],
    version: 1,
  };
});

/* ── Compliance docs — NAMED state scenarios (never position arithmetic) ── */

type ComplianceDocStatus = ComplianceDocument['status'];

/**
 * The three documents EVERY brand must hold, in canonical order.
 *
 * §AV-032 — `brand_registry_confirmation` was a fourth until the Amazon-truth
 * reconciliation: "Amazon Brand Registry" is a seller/brand-owner programme with
 * no vendor obligation behind it, so a brand could be BLOCKED on a document
 * nothing requires. It is now an optional Mercenta onboarding control
 * (`src/lib/compliance.ts → OPTIONAL_MERCENTA_CONTROLS`) and is generated
 * nowhere as a required document.
 */
const BASE_COMPLIANCE_TYPES = [
  'letter_of_authorization',
  'product_safety_ukca',
  'insurance_certificate',
] as const;

type ComplianceBaseType = (typeof BASE_COMPLIANCE_TYPES)[number];

/**
 * §SSOT S4 (2026-09-27) — A COMPLIANCE-DOCUMENT SCENARIO, DECLARED BY NAME.
 *
 * OLD CONTRACT (recorded, not hidden): the status of every non-cleared brand's
 * documents came from ARITHMETIC — `COMPLIANCE_PATTERNS[bi % 3]`, an array indexed
 * by the brand's POSITION in `DEMO_BRANDS` — plus a per-brand override map for two
 * tenants. That produced 27 blocking documents and therefore 27 of the open work
 * items on the demo: more than half the list was fabricated by a row's index rather
 * than declared as a scenario, so inserting a brand silently re-rolled the state of
 * every brand after it — the same class of defect F3 found in the consignment flags.
 *
 * A scenario now declares, explicitly: the status of each required BASE document
 * and the status of the brand's CATEGORY document. The scenario a brand runs is
 * assigned BY NAME in `DEMO_COMPLIANCE_SCENARIO_BY_BRAND` below — no position
 * arithmetic anywhere, and an unassigned brand is REFUSED by
 * `complianceScenarioFor()` rather than silently inheriting someone else's state.
 *
 * NOTE on 'missing': every required document still HAS a demo record (the seed
 * generates records for all required types); a 'missing' status means
 * present-but-not-approved, so the canonical gate classifies it as BLOCKING.
 * A document that was never submitted carries NO simulated artefact.
 */
export interface ComplianceDocumentScenario {
  /** Why this scenario exists in the demo. Read by a human; asserted by the gate. */
  readonly why: string;
  /** The declared status of each REQUIRED base document. */
  readonly base: Readonly<Record<ComplianceBaseType, ComplianceDocStatus>>;
  /** The declared status of the brand's CATEGORY document, when its category has one. */
  readonly categoryDocument: ComplianceDocStatus;
}

export const DEMO_COMPLIANCE_SCENARIOS = {
  /** Both base and category documents cleared — an operational tenant can trade. */
  gate_cleared: {
    why: 'Trading tenant: every required document is approved.',
    base: {
      letter_of_authorization: 'approved',
      product_safety_ukca: 'approved',
      insurance_certificate: 'approved',
    },
    categoryDocument: 'approved',
  },

  /**
   * §P2 — the BLOCKED compliance-scenario tenant (Brand C, Le Creuset): 0 of 4
   * approved, including one 'rejected' so the failure reason + Replace action on
   * that row are exercised end-to-end (§M2). Its contract is 'active' and both
   * mandatory §4.1/§4.2 agreements are accepted, so the document state is the
   * SOLE reason the gate blocks — exactly what `e2e/compliance-gate.spec.ts` and
   * the compliance matrix assert.
   */
  gate_blocked: {
    why: 'Compliance matrix: 0 of 4 documents approved, with a missing and a rejected outcome exercised.',
    base: {
      letter_of_authorization: 'uploaded',
      product_safety_ukca: 'under_review',
      insurance_certificate: 'missing',
    },
    categoryDocument: 'rejected',
  },
} satisfies Record<string, ComplianceDocumentScenario>;

/** The declared scenario names — the ONLY values `..._BY_BRAND` may hold. */
export type ComplianceScenarioName = keyof typeof DEMO_COMPLIANCE_SCENARIOS;

/**
 * §SSOT S4 — THE DECLARED ASSIGNMENT. Every canonical brand names its scenario
 * here; there is no default and no fallback, so the demo's document states are
 * READABLE rather than computed. The gate asserts that this map covers
 * `ALL_DEMO_BRANDS` exactly, that no declared scenario is dead, and that
 * `CLEARED_BRAND_IDS` and the `gate_cleared` assignment cannot drift apart.
 */
export const DEMO_COMPLIANCE_SCENARIO_BY_BRAND: Record<string, ComplianceScenarioName> = {
  'brand-astonish': 'gate_cleared', // Brand A — cleared, trading tenant (Home)
  'brand-tapatio': 'gate_cleared', // Brand B — cleared, trading tenant (Grocery)
  'brand-lecreuset': 'gate_blocked', // Brand C — blocked compliance-scenario tenant (Kitchen)
  'brand-kitkin': 'gate_blocked', // Brand D — in-onboarding tenant (Baby); no operational data
};

/**
 * §SSOT S4 — THE OWNER OF A BRAND'S DOCUMENT STATE. FAIL CLOSED: a brand with no
 * declared scenario is REFUSED, never given another brand's state (the silent
 * default is exactly what the position arithmetic used to do).
 */
export function complianceScenarioFor(brandId: string): ComplianceDocumentScenario {
  const name = DEMO_COMPLIANCE_SCENARIO_BY_BRAND[brandId];
  if (!name) {
    throw new Error(
      `No declared compliance scenario for brand '${brandId}' — refusing to fabricate document state. ` +
        'Add an explicit entry to DEMO_COMPLIANCE_SCENARIO_BY_BRAND.',
    );
  }
  return DEMO_COMPLIANCE_SCENARIOS[name];
}

/**
 * §SSOT S4 — THE DECLARED DEMO BASELINE, ASSERTED BY THE WORK-LAYER GATE.
 *
 * A seed change that alters how many documents (or how many BLOCKING documents)
 * the demo holds must update this declaration in the same commit. That is what makes
 * a fabricated work item impossible to land unnoticed: the gate compares the derived
 * compliance work list against these numbers and fails otherwise.
 *
 * Re-measured for §P2 (four businesses, 2026-10-02): 3 base documents × 4 brands
 * (12) + 3 category documents (Tapatío/Grocery, Le Creuset/Kitchen, Kit & Kin/Baby)
 * = 15 documents. The work-layer gate defines a BLOCKING document as one whose
 * status is `missing` or `rejected`; Le Creuset (blocked) has 2 and Kit & Kin
 * (in onboarding) has 2 — its missing insurance certificate and its rejected
 * category document. Astonish and Tapatío are gate_cleared and contribute 0.
 */
export const DEMO_COMPLIANCE_BASELINE = {
  documents: 15,
  blockingDocuments: 4,
} as const;

const COMPLIANCE_TYPES = BASE_COMPLIANCE_TYPES;

/** Category-specific extra compliance docs, driven by UK/EU product law (§AV-031). */
const CATEGORY_EXTRA_DOCS: Record<string, { type: ComplianceDocument['type']; label: string }[]> = {
  'Baby': [{ type: 'baby_product_safety', label: 'Baby Product Safety (EN 71 / EN 1888)' }],
  'Health & Personal Care': [{ type: 'cosmetic_notification_cpnp', label: 'Cosmetic Product Notification (CPNP/SCNP)' }],
  'Kitchen': [{ type: 'food_contact_material', label: 'Food Contact Material Compliance' }],
  'Consumer Electronics': [{ type: 'weee_compliance', label: 'WEEE Compliance Registration' }],
  'Automotive': [{ type: 'type_approval', label: 'Type Approval Documentation' }],
  'Grocery': [{ type: 'food_safety_certificate', label: 'Food Safety Certificate (HACCP/BRC)' }],
  'Personal Computer': [{ type: 'weee_compliance', label: 'WEEE Compliance Registration' }],
  'Apparel': [{ type: 'textile_labelling_compliance', label: 'Textile Labelling Compliance' }],
};

export const DEMO_COMPLIANCE_DOCS: ComplianceDocument[] = ALL_DEMO_BRANDS.flatMap(
  (brand) => {
    /**
     * §SSOT S4 — the brand's NAMED scenario, and the ONLY input to its document
     * state. `complianceScenarioFor` FAILS CLOSED on an unassigned brand, so a new
     * brand cannot silently inherit another brand's documents (what the retired
     * `COMPLIANCE_PATTERNS[bi % 3]` lookup did).
     */
    const scenario = complianceScenarioFor(brand.id);

    /**
     * §M2 — a submitted document always carries an artefact. The demo dataset
     * uses unmistakably SIMULATED evidence (no external provider is contacted),
     * so the verification seam behaves realistically: a document that was never
     * submitted (`missing`) has NO artefact and can never pass verification.
     */
    const evidence = (type: ComplianceDocument['type'], status: ComplianceDocument['status']) =>
      status === 'missing'
        ? {}
        : {
            fileUrl: `simulated://compliance/${brand.id}/${type}`,
            reference: `SIM-${type.toUpperCase()}-${brand.id.replace(/^brand-/, '').toUpperCase()}`,
            issuer: 'Simulated issuing body (no external provider)',
          };

    // Base documents: the status is the scenario's DECLARED value. Nothing here
    // reads the brand's position in the array.
    const baseDocs = COMPLIANCE_TYPES.map((type, ti) => {
      const status = scenario.base[type];
      return {
        id: `cd-${brand.id}-${ti}`,
        brandId: brand.id,
        type,
        status,
        version: 1,
        ...evidence(type, status),
      };
    });

    // Category-specific documents: the scenario declares their status too (so a
    // missing or rejected 5th document is exactly representable).
    const extraDocs = (CATEGORY_EXTRA_DOCS[brand.category] ?? []).map((extra, ei) => {
      const status = scenario.categoryDocument;
      return {
        id: `cd-${brand.id}-extra-${ei}`,
        brandId: brand.id,
        type: extra.type,
        status,
        version: 1,
        ...evidence(extra.type, status),
      };
    });

    return [...baseDocs, ...extraDocs];
  }
);

/* ── Message threads ────────────────────────────────────────────────── */

export const DEMO_MESSAGES: Message[] = ALL_DEMO_BRANDS.flatMap((brand, bi) => {
  const base = new Date(Date.now() - (bi + 1) * 36e5).toISOString();
  const thread: Message[] = [
    {
      id: `msg-${brand.id}-1`,
      brandId: brand.id,
      channel: 'email' as const,
      direction: 'outbound' as const,
      subject: 'Welcome to Mercenta Partners onboarding',
      body: `Hi ${brand.signatory.split(' ')[0]}, your onboarding is underway. Next step: compliance review.`,
      sentBy: 'automation' as const,
      requiresHuman: false,
      createdAt: base,
    },
  ];
  // Every third brand has a hot-lead inbound reply.
  if (bi % 3 === 0) {
    thread.push({
      id: `msg-${brand.id}-2`,
      brandId: brand.id,
      channel: 'email' as const,
      direction: 'inbound' as const,
      subject: 'Re: onboarding',
      body: 'Thanks — can we talk about pricing and the first purchase order this week?',
      sentBy: 'automation' as const,
      requiresHuman: true,
      createdAt: new Date(new Date(base).getTime() + 18e5).toISOString(),
    });
  }
  return thread;
});

/* ── §10 / §Phase E3 retail-pipeline submission records ─────────────── */

/**
 * §Phase E3 — submissions have ONE canonical shape (`ProductSubmission`).
 *
 * `SeedSubmission` is kept as an alias purely so existing consumers
 * (`RetailPipeline`, `NotificationCenter`, `demoStore`, `api`) do not need to
 * rename an import. There is deliberately no second, narrower shape any more:
 * the previous four-field interface could not carry the simulated provenance or
 * the provider tracking id, which is exactly what E3 must not lose.
 */
export type SeedSubmission = ProductSubmission;
