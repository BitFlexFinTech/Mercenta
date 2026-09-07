/**
 * §Stage-1 Demo dataset.
 *
 * 10 demo brands spanning ALL approved categories, each with catalog,
 * fulfillment track, contract (varied states), compliance docs (varied),
 * message history, purchase orders (every workflow state), and shipments
 * across every carrier (DHL / FedEx / BAK Logistics / Amazon-partnered).
 *
 * Shapes mirror the live integration payloads so src/data/api.ts can swap
 * seed → live without any UI change.
 */
import { DEFAULT_PRODUCT_TAX_CODE } from '@/types';
import type {
  ComplianceDocument,
  Contract,
  Message,
  PurchaseOrder,
  PurchaseOrderStatus,
  ProductImage,
} from '@/types';
import { COMMISSION_RATE_PLACEHOLDER, MONTHLY_FEE_PLACEHOLDER_GBP } from '@/config/commercial';

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
}

/** All ten approved categories are covered exactly once. */
export const DEMO_BRANDS: DemoBrand[] = [
  { id: 'brand-zambezi', name: 'Zambezi Organic Extracts Ltd', category: 'Health & Personal Care', region: 'africa', nation: 'Zimbabwe', email: 'trade@zambeziorganics.co.zw', signatory: 'Tendai Moyo', track: 'financed', contractStatus: 'active' },
  { id: 'brand-nordhaus', name: 'Nordhaus Living ApS', category: 'Home', region: 'europe', nation: 'Denmark', email: 'sales@nordhaus.dk', signatory: 'Mette Sørensen', track: 'direct_fulfillment', contractStatus: 'signed' },
  { id: 'brand-littlekiwi', name: 'Little Kiwi Baby Co', category: 'Baby', region: 'north_america', nation: 'United States', email: 'hello@littlekiwi.co', signatory: 'Dana Whitfield', track: 'financed', contractStatus: 'sent' },
  { id: 'brand-deskforge', name: 'DeskForge Supplies Inc', category: 'Office Products', region: 'north_america', nation: 'United States', email: 'export@deskforge.com', signatory: 'Ray Coleman', track: 'direct_fulfillment', contractStatus: 'active' },
  { id: 'brand-munich', name: 'Munich Clean-Care GmbH', category: 'Health & Personal Care', region: 'europe', nation: 'Germany', email: 'trade@muc-cleancare.de', signatory: 'Klaus Bauer', track: 'direct_fulfillment', contractStatus: 'draft' },
  { id: 'brand-culinaryforge', name: 'Culinary Forge B.V.', category: 'Kitchen', region: 'europe', nation: 'Netherlands', email: 'orders@culinaryforge.nl', signatory: 'Anouk de Vries', track: 'financed', contractStatus: 'active' },
  { id: 'brand-voltaic', name: 'Voltaic Audio LLC', category: 'Consumer Electronics', region: 'north_america', nation: 'United States', email: 'b2b@voltaicaudio.com', signatory: 'Marcus Reed', track: 'direct_fulfillment', contractStatus: 'sent' },
  { id: 'brand-apexdrive', name: 'ApexDrive Auto Care Ltd', category: 'Automotive', region: 'north_america', nation: 'United States', email: 'sales@apexdrive.com', signatory: 'Priya Nair', track: 'financed', contractStatus: 'active' },
  { id: 'brand-harvestlane', name: 'Harvest Lane Foods Pty', category: 'Grocery', region: 'africa', nation: 'South Africa', email: 'exports@harvestlane.co.za', signatory: 'Sipho Dlamini', track: 'financed', contractStatus: 'signed' },
  { id: 'brand-saharathreads', name: 'Sahara Threads SARL', category: 'Apparel', region: 'africa', nation: 'Morocco', email: 'contact@saharathreads.ma', signatory: 'Yasmine El Fassi', track: 'direct_fulfillment', contractStatus: 'under_review' },
];

// Personal Computer category — one more brand so every category is covered.
export const DEMO_BRAND_PC: DemoBrand = {
  id: 'brand-pixelperch',
  name: 'PixelPerch Accessories Inc',
  category: 'Personal Computer',
  region: 'north_america',
  nation: 'United States',
  email: 'partners@pixelperch.com',
  signatory: 'Elliot Shaw',
  track: 'direct_fulfillment',
  contractStatus: 'active',
};

export const ALL_DEMO_BRANDS: DemoBrand[] = [...DEMO_BRANDS, DEMO_BRAND_PC];

/**
 * Brands that have cleared the compliance gate and thus have operational
 * data (products, POs, shipments). All other brands are still in onboarding
 * with only their profile, compliance docs, and contract visible.
 *
 * Zambezi: Health & Personal Care — all 4 base docs + cosmetic_notification_cpnp approved,
 *          contract active, both agreements accepted. ✅ CLEARED
 * DeskForge: Office Products — all 4 base docs approved (no category-specific extras),
 *            contract active, both agreements accepted. ✅ CLEARED
 */
export const CLEARED_BRAND_IDS: string[] = [
  'brand-zambezi',
  'brand-deskforge',
];

/**
 * The row shape served for brands via api.fetchBrands() (canonical definition —
 * demoStore re-exports it; views import from HERE, never from demoStore).
 */
export interface DemoBrandRow {
  id: string;
  category: string;
  track: string;
  contractStatus: string;
  profile: { businessName: string };
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

export interface DemoProduct {
  id: string;
  brandId: string;
  name: string;
  sku: string;
  barcode: string;
  image: string;
  /** §Batch-21 — full image set with validation. */
  productImages?: ProductImage[];
  exWorksPrice: number;
  ukRetailPrice: number;
  commodityCode: string;
  vatStatus: string;
  hazmat: boolean;
  length: number;
  width: number;
  height: number;
  weight: number;
  /** §Stage-24 item setup — case pack + product tax code. */
  unitsPerCase?: number;
  caseOrderable?: boolean;
  productTaxCode?: string;
  /** §Batch-2 — Manage Product Availability: in-stock/out-of-stock toggle. */
  isAvailable?: boolean;
  /** §Batch-2 — Lead time in days for replenishment. */
  leadTimeDays?: number;
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
        // One bulk order (nordhaus #2 → PO-9003) is intentionally oversized so
        // the §13 auto-approve HOLD path (PO value ≥ threshold) is exercised
        // in demo data alongside the auto-invoice path.
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

    // Base docs: cleared brands get all approved, others get rotating pattern
    const baseDocs = COMPLIANCE_TYPES.map((type, ti) => ({
      id: `cd-${brand.id}-${ti}`,
      brandId: brand.id,
      type,
      status: isCleared ? 'approved' as const : pattern[ti],
    }));

    // Category-specific docs: cleared brands get approved, others get missing
    const extraDocs = (CATEGORY_EXTRA_DOCS[brand.category] ?? []).map((extra, ei) => ({
      id: `cd-${brand.id}-extra-${ei}`,
      brandId: brand.id,
      type: extra.type,
      status: isCleared ? 'approved' as const : 'missing' as const,
    }));

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

/* ── §10 retail-pipeline submission records ─────────────────────────── */

export interface SeedSubmission {
  id: string;
  brandId: string;
  productName: string;
  sku: string;
  asin?: string;
  status: 'submitted' | 'under_amazon_review' | 'live' | 'rejected';
  rejectionReason?: string;
  submittedAt: string;
}
