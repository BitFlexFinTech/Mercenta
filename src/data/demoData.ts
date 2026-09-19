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
import type {
  ComplianceDocument,
  Contract,
  FulfillmentTrack,
  Message,
  Product,
  ProductImage,
  ProductSubmission,
  PurchaseOrder,
  PurchaseOrderStatus,
} from '@/types';
import { COMMISSION_RATE_PLACEHOLDER, MONTHLY_FEE_PLACEHOLDER_GBP } from '@/config/commercial';
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

/** §Phase 4 — real brand websites (public evidence, not invented facts). */
const BRAND_SITE: Record<string, string> = {
  'brand-astonish': 'https://astonishcleaning.com',
  'brand-seep': 'https://seepuk.com',
  'brand-delphis': 'https://delphiseco.com',
  'brand-kitkin': 'https://kitandkin.com',
  'brand-bulldog': 'https://bulldogskincare.com',
  'brand-joseph': 'https://josephjoseph.com',
  'brand-roberts': 'https://www.robertsradio.co.uk',
  'brand-clipper': 'https://www.clipper-teas.com',
  'brand-regatta': 'https://www.regatta.com',
  'brand-autoglym': 'https://www.autoglym.com',
  'brand-tapatio': 'https://tapatiohotsauce.com',
  'brand-cholula': 'https://cholula.com',
  'brand-valentina': 'https://valentina.mx',
  'brand-flybyjing': 'https://flybyjing.com',
  'brand-lecreuset': 'https://www.lecreuset.co.uk',
  'brand-smeg': 'https://www.smeguk.com',
  'brand-moleskine': 'https://www.moleskine.com/en',
  'brand-sennheiser': 'https://www.sennheiser.com',
  'brand-logitech': 'https://www.logitech.com/en-gb',
  'brand-vileda': 'https://www.vileda.co.uk',
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
 * Phase 4 — canonical **20 REAL brands** (10 UK + 10 international). All ten
 * approved categories are covered. UK list first, international second. The
 * international group preserves the real brands already present in the BI
 * prospect universe (Tapatío, Cholula, Valentina, Fly By Jing). Every row
 * carries the real brand's public website as §12 evidence; nothing that is
 * unverified (ASINs, sales, rankings, revenue, contracts, contact people) is
 * asserted as fact on the canonical record.
 */
export const DEMO_BRANDS: DemoBrand[] = [
  // ── UK (10) ──────────────────────────────────────────────────────
  { id: 'brand-astonish', name: 'Astonish', category: 'Home', region: 'europe', nation: 'United Kingdom', email: 'trade@astonish.example', signatory: 'Trade team (contact TBC)', track: 'financed', contractStatus: 'active', commercialModel: 'commission_agent', market: 'uk', website: BRAND_SITE['brand-astonish'] },
  { id: 'brand-seep', name: 'Seep', category: 'Home', region: 'europe', nation: 'United Kingdom', email: 'trade@seep.example', signatory: 'Trade team (contact TBC)', track: 'direct_fulfillment', contractStatus: 'signed', commercialModel: 'buy_resell', market: 'uk', website: BRAND_SITE['brand-seep'] },
  { id: 'brand-delphis', name: 'Delphis Eco', category: 'Home', region: 'europe', nation: 'United Kingdom', email: 'trade@delphis.example', signatory: 'Trade team (contact TBC)', track: 'direct_fulfillment', contractStatus: 'active', commercialModel: 'commission_agent', market: 'uk', website: BRAND_SITE['brand-delphis'] },
  { id: 'brand-kitkin', name: 'Kit & Kin', category: 'Baby', region: 'europe', nation: 'United Kingdom', email: 'trade@kitandkin.example', signatory: 'Trade team (contact TBC)', track: 'direct_fulfillment', contractStatus: 'sent', commercialModel: 'commission_agent', market: 'uk', website: BRAND_SITE['brand-kitkin'] },
  { id: 'brand-bulldog', name: 'Bulldog Skincare', category: 'Health & Personal Care', region: 'europe', nation: 'United Kingdom', email: 'trade@bulldog.example', signatory: 'Trade team (contact TBC)', track: 'direct_fulfillment', contractStatus: 'draft', commercialModel: 'buy_resell', market: 'uk', website: BRAND_SITE['brand-bulldog'] },
  { id: 'brand-joseph', name: 'Joseph Joseph', category: 'Kitchen', region: 'europe', nation: 'United Kingdom', email: 'trade@joseph.example', signatory: 'Trade team (contact TBC)', track: 'direct_fulfillment', contractStatus: 'active', commercialModel: 'commission_agent', market: 'uk', website: BRAND_SITE['brand-joseph'] },
  { id: 'brand-roberts', name: 'Roberts Radio', category: 'Consumer Electronics', region: 'europe', nation: 'United Kingdom', email: 'trade@roberts.example', signatory: 'Trade team (contact TBC)', track: 'direct_fulfillment', contractStatus: 'signed', commercialModel: 'buy_resell', market: 'uk', website: BRAND_SITE['brand-roberts'] },
  { id: 'brand-clipper', name: 'Clipper Teas', category: 'Grocery', region: 'europe', nation: 'United Kingdom', email: 'trade@clipper.example', signatory: 'Trade team (contact TBC)', track: 'direct_fulfillment', contractStatus: 'signed', commercialModel: 'commission_agent', market: 'uk', website: BRAND_SITE['brand-clipper'] },
  { id: 'brand-regatta', name: 'Regatta', category: 'Apparel', region: 'europe', nation: 'United Kingdom', email: 'trade@regatta.example', signatory: 'Trade team (contact TBC)', track: 'direct_fulfillment', contractStatus: 'active', commercialModel: 'buy_resell', market: 'uk', website: BRAND_SITE['brand-regatta'] },
  { id: 'brand-autoglym', name: 'Autoglym', category: 'Automotive', region: 'europe', nation: 'United Kingdom', email: 'trade@autoglym.example', signatory: 'Trade team (contact TBC)', track: 'direct_fulfillment', contractStatus: 'active', commercialModel: 'commission_agent', market: 'uk', website: BRAND_SITE['brand-autoglym'] },
  // ── International (10) — real brands already present as BI prospects ──
  { id: 'brand-tapatio', name: 'Tapatío', category: 'Grocery', region: 'north_america', nation: 'United States', email: 'trade@tapatio.example', signatory: 'Trade team (contact TBC)', track: 'direct_fulfillment', contractStatus: 'active', commercialModel: 'buy_resell', market: 'international', website: BRAND_SITE['brand-tapatio'] },
  { id: 'brand-cholula', name: 'Cholula', category: 'Grocery', region: 'north_america', nation: 'United States', email: 'trade@cholula.example', signatory: 'Trade team (contact TBC)', track: 'direct_fulfillment', contractStatus: 'active', commercialModel: 'commission_agent', market: 'international', website: BRAND_SITE['brand-cholula'] },
  { id: 'brand-valentina', name: 'Valentina', category: 'Grocery', region: 'north_america', nation: 'United States', email: 'trade@valentina.example', signatory: 'Trade team (contact TBC)', track: 'financed', contractStatus: 'signed', commercialModel: 'buy_resell', market: 'international', website: BRAND_SITE['brand-valentina'] },
  { id: 'brand-flybyjing', name: 'Fly By Jing', category: 'Grocery', region: 'north_america', nation: 'United States', email: 'trade@flybyjing.example', signatory: 'Trade team (contact TBC)', track: 'direct_fulfillment', contractStatus: 'active', commercialModel: 'commission_agent', market: 'international', website: BRAND_SITE['brand-flybyjing'] },
  { id: 'brand-locknlock', name: 'LocknLock', category: 'Kitchen', region: 'europe', nation: 'South Korea', email: 'trade@locknlock.example', signatory: 'Trade team (contact TBC)', track: 'direct_fulfillment', contractStatus: 'signed', commercialModel: 'buy_resell', market: 'international', website: BRAND_SITE['brand-locknlock'] },
  { id: 'brand-lecreuset', name: 'Le Creuset', category: 'Kitchen', region: 'europe', nation: 'France', email: 'trade@lecreuset.example', signatory: 'Trade team (contact TBC)', track: 'direct_fulfillment', contractStatus: 'active', commercialModel: 'buy_resell', market: 'international', website: BRAND_SITE['brand-lecreuset'] },
  { id: 'brand-moleskine', name: 'Moleskine', category: 'Office Products', region: 'europe', nation: 'Italy', email: 'trade@moleskine.example', signatory: 'Trade team (contact TBC)', track: 'direct_fulfillment', contractStatus: 'active', commercialModel: 'commission_agent', market: 'international', website: BRAND_SITE['brand-moleskine'] },
  { id: 'brand-sennheiser', name: 'Sennheiser', category: 'Consumer Electronics', region: 'europe', nation: 'Germany', email: 'trade@sennheiser.example', signatory: 'Trade team (contact TBC)', track: 'direct_fulfillment', contractStatus: 'sent', commercialModel: 'buy_resell', market: 'international', website: BRAND_SITE['brand-sennheiser'] },
  { id: 'brand-vileda', name: 'Vileda', category: 'Home', region: 'europe', nation: 'Germany', email: 'trade@vileda.example', signatory: 'Trade team (contact TBC)', track: 'direct_fulfillment', contractStatus: 'signed', commercialModel: 'commission_agent', market: 'international', website: BRAND_SITE['brand-vileda'] },
  { id: 'brand-logitech', name: 'Logitech', category: 'Personal Computer', region: 'europe', nation: 'Switzerland', email: 'trade@logitech.example', signatory: 'Trade team (contact TBC)', track: 'direct_fulfillment', contractStatus: 'active', commercialModel: 'buy_resell', market: 'international', website: BRAND_SITE['brand-logitech'] },
];

// Personal Computer category — Logitech (real) is the Personal Computer
// member of the canonical 20 above. Kept as a named re-export so existing
// consumers of the old single-PC export keep compiling; the row itself is a
// REFERENCE into DEMO_BRANDS (never a second brand source).
export const DEMO_BRAND_PC: DemoBrand =
  DEMO_BRANDS.find((b) => b.category === 'Personal Computer')!;

/**
 * §Phase 7F / §Phase 4 — Deterministic compliance-scenario tenants.
 *
 * These brands reached the PORTAL (onboarded = true) but are NOT gate-cleared,
 * so the compliance gate can be genuinely exercised in the meaningful states
 * the product claims to support (see `COMPLIANCE_SCENARIO_DOC_STATES` and the
 * compliance matrix in PROJECT_STATUS.md). Phase 4 repointed them onto REAL
 * brands from the canonical 20 (the previous tenants were invented companies):
 *
 *   Le Creuset  — 0/5 required docs approved (Kitchen → 5 required)
 *   Autoglym    — 4/5 required docs approved (Automotive → 5 required)
 *
 * Their contracts are 'active' and both mandatory §4.1/§4.2 agreements are
 * accepted (derived automatically), so the ONLY reason their gate blocks is
 * the document state — exactly what the compliance-gate E2E asserts. The
 * entries are references into DEMO_BRANDS (single source of truth).
 */
export const DEMO_BRANDS_COMPLIANCE_SCENARIOS: DemoBrand[] = [
  DEMO_BRANDS.find((b) => b.id === 'brand-lecreuset')!,
  DEMO_BRANDS.find((b) => b.id === 'brand-autoglym')!,
];

/**
 * ALL_DEMO_BRANDS — THE canonical universe = the 20 real brands. Exactly one
 * source of truth: there is deliberately no second (fake) brand list anywhere.
 */
export const ALL_DEMO_BRANDS: DemoBrand[] = [...DEMO_BRANDS];

/**
 * §Phase 4 / §16 — REPRESENTATIVE demo-login subset.
 *
 * The one-click login deliberately shows a *representative* set of cards, NOT
 * one button per brand (20 buttons would overwhelm investors). The subset is
 * declared here next to the canonical 20 and every ID is a reference into it —
 * so the login UI can never become a second, hidden source of brands. All the
 * operational demo accounts behind these cards are real canonical 20 tenants.
 */
export const DEMO_LOGIN_BRAND_IDS: string[] = [
  'brand-astonish',
  'brand-tapatio',
  'brand-kitkin',
  'brand-bulldog',
  'brand-lecreuset',
  'brand-autoglym',
];

/**
 * Brands that have cleared the compliance gate and thus have operational
 * data (products, POs, shipments). All other brands are still in onboarding
 * with only their profile, compliance docs, and contract visible.
 *
 * Phase 4: the two cleared operational tenants are ONE UK brand (Astonish,
 * Home) and ONE international brand (Tapatío, Grocery) — both real, and both
 * demonstrate the Money Chain end-to-end in simulated mode.
 */
export const CLEARED_BRAND_IDS: string[] = [
  'brand-astonish',
  'brand-tapatio',
];

/**
 * §Phase 7F — compliance-scenario tenant IDs (portal-accessible, NOT cleared).
 * Deterministic demo states so the compliance gate can be genuinely exercised.
 * See `DEMO_BRANDS_COMPLIANCE_SCENARIOS` above and `COMPLIANCE_SCENARIO_DOC_STATES` below.
 */
export const COMPLIANCE_SCENARIO_BRAND_IDS: string[] = [
  'brand-lecreuset',
  'brand-autoglym',
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
  category: string;
  /** §Phase D6 — the CANONICAL track union (was `string`), so a payout can rely
   *  on the financed-fee clause without a cast or a silent default. */
  track: FulfillmentTrack;
  contractStatus: string;
  profile: { businessName: string };
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

export const DEMO_PURCHASE_ORDERS: PurchaseOrder[] = ALL_DEMO_BRANDS
  .filter((b) => CLEARED_BRAND_IDS.includes(b.id))
  .flatMap(
  (brand, bi) =>
    [0, 1].map((pi): PurchaseOrder => {
      const status = poStatusFor(bi, pi);
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
      }));
      const poValue =
        Math.round(items.reduce((s, i) => s + i.quantity * i.unitPrice, 0) * 100) / 100;
      const orderDate = new Date(Date.now() - (pi + 1) * 9 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
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

/* ── Shipments for accepted/shipped/delivered POs, across all carriers ── */

const CARRIER_CYCLE = ['dhl', 'fedex', 'bak', 'palletline', 'amazon_partner'] as const;

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
}

export const DEMO_SHIPMENTS: DemoShipment[] = DEMO_PURCHASE_ORDERS.filter(
  (po) => po.status in SHIPMENT_STATUS_BY_PO
).map((po, i) => {
  const brand = ALL_DEMO_BRANDS.find((b) => b.id === po.brandId)!;
  const carrier = CARRIER_CYCLE[i % CARRIER_CYCLE.length];
  return {
    id: `shipment-${po.id}`,
    brandId: po.brandId,
    poNumber: po.poNumber,
    carrier,
    reference: `${carrier.slice(0, 2).toUpperCase()}-${po.poNumber}`,
    title: `${brand.name.split(' ')[0]} — ${po.poNumber}`,
    value: po.poValue,
    status: SHIPMENT_STATUS_BY_PO[po.status]!,
    origin: `${brand.nation} depot`,
    destination: 'Mercenta UK Hub',
    delayed: i % 4 === 1,
    exception: i % 7 === 3,
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
    // First brand renews INSIDE the §13 60-day window — exercises the
    // urgency badge + renewal-draft path in demo data (staggered renewals).
    renewalDate: i === 0 ? `${year}-10-01` : `${year + 1}-0${(i % 8) + 1}-01`,
    documentUrl: '',
    signatories:
      brand.contractStatus === 'draft' || brand.contractStatus === 'sent'
        ? []
        : [{ name: brand.signatory, email: brand.email }],
    version: 1,
  };
});

/* ── Compliance docs — rotating state patterns + category-specific ── */

const COMPLIANCE_PATTERNS: ComplianceDocument['status'][][] = [
  ['approved', 'approved', 'approved', 'approved'], // fully cleared (pattern 0)
  ['approved', 'under_review', 'missing', 'approved'], // partially blocked (pattern 1)
  ['uploaded', 'uploaded', 'under_review', 'missing'], // early stage (pattern 2)
];

/**
 * §Phase 7F — Explicit per-required-type document states for the
 * compliance-scenario tenants (overrides the rotating pattern so the gate can
 * be exercised in exactly these states — the compliance MATRIX):
 *
 * NOTE on 'missing': every required document still HAS a demo record (the seed
 * generates records for all required types); a 'missing' status means
 * present-but-not-approved, so the canonical gate classifies it as BLOCKING —
 * the same convention the pre-existing rotating patterns already used.
 *
 * | tenant (brandId)  | approved / total | present-but-not-approved                  | expected gate |
 * |-------------------|------------------|------------------------------------------|----------------|
 * | brand-lecreuset   | 0 / 5            | 5 (uploaded ×2, under_review ×1, missing ×1, rejected ×1) | BLOCKED     |
 * | brand-autoglym    | 4 / 5            | 1 (type_approval missing)                   | BLOCKED     |
 *
 * Both tenants have an active contract + both §4.1/§4.2 agreements accepted,
 * so the document state is the sole reason the gate blocks.
 */
export const COMPLIANCE_SCENARIO_DOC_STATES: Record<
  string,
  Partial<Record<ComplianceDocument['type'], ComplianceDocument['status']>>
> = {
  'brand-lecreuset': {
    letter_of_authorization: 'uploaded',
    product_safety_ukca: 'under_review',
    insurance_certificate: 'uploaded',
    brand_registry_confirmation: 'missing',
    // §M2 — the rejected lifecycle state, exercised end-to-end (the brand sees
    // the failure reason and the Replace action on this row).
    food_contact_material: 'rejected',
  },
  'brand-autoglym': {
    letter_of_authorization: 'approved',
    product_safety_ukca: 'approved',
    insurance_certificate: 'approved',
    brand_registry_confirmation: 'approved',
    type_approval: 'missing',
  },
};

const COMPLIANCE_TYPES: ComplianceDocument['type'][] = [
  'letter_of_authorization',
  'product_safety_ukca',
  'insurance_certificate',
  'brand_registry_confirmation',
];

/** Category-specific extra compliance docs per Amazon UK requirements. */
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
  (brand, bi) => {
    const pattern = COMPLIANCE_PATTERNS[bi % COMPLIANCE_PATTERNS.length];
    const isCleared = CLEARED_BRAND_IDS.includes(brand.id);
    // §Phase 7F — explicit scenario override (see COMPLIANCE_SCENARIO_DOC_STATES).
    const scenario = COMPLIANCE_SCENARIO_DOC_STATES[brand.id];

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

    // Base docs: cleared brands get all approved; scenario tenants use their
    // declared statuses; everyone else gets the rotating pattern.
    const baseDocs = COMPLIANCE_TYPES.map((type, ti) => {
      const status = scenario?.[type] ?? (isCleared ? ('approved' as const) : pattern[ti]);
      return {
        id: `cd-${brand.id}-${ti}`,
        brandId: brand.id,
        type,
        status,
        version: 1,
        ...evidence(type, status),
      };
    });

    // Category-specific docs: cleared brands get approved; scenario tenants use
    // the declared status (so a missing 5th doc is exactly representable);
    // everyone else gets missing.
    const extraDocs = (CATEGORY_EXTRA_DOCS[brand.category] ?? []).map((extra, ei) => {
      const status = scenario?.[extra.type] ?? (isCleared ? ('approved' as const) : ('missing' as const));
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
