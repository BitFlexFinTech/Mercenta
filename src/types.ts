/**
 * §5/M12 — the brand's COMMERCIAL RELATIONSHIP with Mercenta, read from the
 * canonical `src/config/commercialModel.ts`. Not a duplicate shape: the union is
 * imported so it cannot drift from the single source of truth.
 */
import type { CommercialModelSelection } from '@/config/commercialModel';
/**
 * §P13 — the acknowledgement-timeliness union is owned by
 * `src/config/purchaseOrders.ts` (beside the rule it describes) and imported
 * here so `AckHistoryEntry` cannot drift from it. Type-only, so no runtime cycle
 * exists with the config module (which imports the rejection-code table).
 */
import type { PoAckTimeliness } from '@/config/purchaseOrders';
/** Re-exported so `import('@/types').PoAckTimeliness` resolves for consumers. */
export type { PoAckTimeliness };

/**
 * §P9 (programme decision 4) — the `carrier` environment is REMOVED. A carrier
 * never logs into Mercenta: Mercenta operates DHL + Palletline **by API**, so
 * there is no carrier session, no carrier shell and no carrier login. REPOINTED
 * from the old contract `'home' | 'login' | 'brand' | 'admin' | 'carrier'`
 * (matrix `D01-07` / `D10-13`).
 */
export type Environment = 'home' | 'login' | 'brand' | 'admin';

/**
 * §13 — The only valid product categories anywhere a category can be selected
 * (onboarding, catalog upload, Marketing ICP builder). These mirror the
 * categories the retail account actually has access to. Never submit a
 * category outside this list.
 */
export const APPROVED_CATEGORIES = [
  'Home',
  'Baby',
  'Office Products',
  'Health & Personal Care',
  'Kitchen',
  'Consumer Electronics',
  'Automotive',
  'Grocery',
  'Personal Computer',
  'Apparel',
] as const;

export type ApprovedCategory = (typeof APPROVED_CATEGORIES)[number];

export function isApprovedCategory(value: unknown): value is ApprovedCategory {
  return (
    typeof value === 'string' &&
    (APPROVED_CATEGORIES as readonly string[]).includes(value)
  );
}

/**
 * §P9 (programme decision 4) — the `'3PL Carrier'` role is REMOVED with the
 * carrier surface it belonged to. REPOINTED from the old contract
 * `… | 'Super Admin' | '3PL Carrier'`.
 */
export type SessionRole =
  | 'Brand Partner'
  | 'Mercenta Admin'
  | 'Super Admin';

export type AdminDepartment = 'business_dev' | 'logistics' | 'compliance' | 'super_admin';

export type StaffRole =
  | 'Super Admin'
  | 'Business Development'
  | 'Logistics Coordinator'
  | 'Cross-Border Logistics Lead'
  | 'UK HMRC Compliance Specialist'
  | 'Carrier Integration Manager';

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  channel: string;
  active: boolean;
  /** §Stage-25 — 'full' may mutate admin state; 'view_only' is read-only ops. */
  permissionTier: import('./types').StaffPermissionTier;
}

/**
 * §P9 (programme decision 1) — carriers are DHL + Palletline ONLY. `fedex` and
 * `bak` are no longer carrier identities: they appear nowhere in the type, the
 * labels, the lane-capability table or the UI. Their REFUSAL is still proven —
 * see `src/config/shipping.ts → RETIRED_CARRIER_IDS`. REPOINTED from the old
 * contract `'dhl' | 'fedex' | 'bak' | 'palletline'`.
 */
export type CarrierId = 'dhl' | 'palletline';

/**
 * §P5 — THE MERCENTA HUB IS REMOVED AS A SHIPMENT STAGE.
 *
 * The mandatory `mercenta_hub` stage (matrix `D09-13`, register `AV-027`, Founder
 * decision T-4) forced every consignment through a Mercenta UK hub that Amazon
 * nowhere requires — and the same repository declared direct-to-destination the
 * default route (`AV-026`). The canonical destination is **the fulfilment centre
 * on the purchase order** (`PurchaseOrder.shipToParty`, the channel's
 * `shipToPartyId` — register `S5`), so the stage before "live on channel" is
 * arrival at THAT destination, not at a Mercenta site.
 *
 * The ONE owner of "which FC is this PO's destination" is
 * `src/config/destinationFc.ts`.
 */
export type ShipmentStage =
  | 'factory_intake'
  | 'bak_depot'
  | 'international_forwarding'
  | 'uk_port_hmrc'
  | 'destination_fc'
  | 'live_amazon';

export const STAGE_LABELS: Record<ShipmentStage, string> = {
  factory_intake: 'Factory Intake',
  bak_depot: 'Regional Hub / Depot Processing',
  international_forwarding: 'International Forwarding',
  uk_port_hmrc: 'UK Port / HMRC Clearance',
  destination_fc: 'Destination Fulfilment Centre',
  live_amazon: 'Live on retail-channel',
};

export const STAGE_ORDER: ShipmentStage[] = [
  'factory_intake',
  'bak_depot',
  'international_forwarding',
  'uk_port_hmrc',
  'destination_fc',
  'live_amazon',
];

/**
 * §P9 — THE ONE owner of the shipment STATUS → STAGE mapping.
 *
 * WHY THIS MOVED HERE
 * -------------------
 * The mapping lived as a private function inside `GlobalStateContext`
 * (`statusToStage`), while the canonical conformance collection
 * (`src/data/demoStore.ts → demoShipments`) never had its `stage` updated at all.
 * A milestone change therefore produced two different records for the same
 * consignment: the context copy moved stage, the canonical copy did not — so a
 * page reading one and writing the other could show a control whose value never
 * changed. Declaring the mapping HERE (next to `STATUS_LABELS` / `STAGE_LABELS`,
 * the canonical status vocabulary) gives the writer in `demoStore` and the
 * context the SAME derivation, so they cannot drift.
 *
 * `bak_depot` remains a STAGE id (the mid-transit 'in the carrier network' state);
 * it is not a carrier identity (decision 1 removed `bak` as a carrier).
 */
export const STATUS_TO_STAGE: Record<ShipmentStatus, ShipmentStage> = {
  factory_intake: 'factory_intake',
  bak_depot: 'bak_depot',
  sea_transit: 'international_forwarding',
  air_transit: 'international_forwarding',
  uk_customs_cleared: 'uk_port_hmrc',
  /** §P5 — the hub stage is gone; arrival at the PO's destination FC replaces it. */
  destination_fc: 'destination_fc',
  live_amazon: 'live_amazon',
};

export type ShipmentStatus =
  | 'factory_intake'
  | 'bak_depot'
  | 'sea_transit'
  | 'air_transit'
  | 'uk_customs_cleared'
  | 'destination_fc'
  | 'live_amazon';

export const STATUS_LABELS: Record<ShipmentStatus, string> = {
  factory_intake: 'Factory Intake',
  bak_depot: 'In the carrier network',
  sea_transit: 'Sea Transit',
  air_transit: 'Air Transit',
  uk_customs_cleared: 'UK Customs Cleared',
  destination_fc: 'Delivered to Destination FC',
  live_amazon: 'Live on retail-channel',
};

/* §Phase D2 — the per-status colour map that lived here (STATUS_COLORS) was
   deleted: shipment status presentation now comes from the canonical layer
   (src/lib/statusPresentation.ts → shipmentStatusPresentation), so the brand
   logistics hub and the admin logistics workspace can no longer render the same
   domain status differently. (§P9 repoint: the old contract named the carrier
   dashboard, which no longer exists.) */

export interface Shipment {
  id: string;
  reference: string;
  title: string;
  customer: string;
  value: number;
  status: ShipmentStatus;
  carrier: CarrierId;
  stage: ShipmentStage;
  cbm: number;
  origin: string;
  destination: string;
  date: string;
  trackingNumber: string;
  /** §WAVE 3 — the canonical ETA projection (see `ShipmentEta`). */
  eta?: ShipmentEta;
}

/**
 * §WAVE 3 — SHIPMENT ETA (a REAL domain capability, not a display label).
 *
 * WHAT AN ETA HERE ACTUALLY IS
 * ----------------------------
 * No live carrier is connected, so Mercenta must never present a fabricated
 * carrier ETA. The ETA is DERIVED, deterministically, from the consignment's own
 * canonical record — and it always states its BASIS, so a derived estimate can
 * never be mistaken for a provider-confirmed arrival:
 *
 *   `channel_window`   — the applicable PO window (delivery window for prepaid,
 *                        ship window for collect) is the committed basis.
 *   `simulated_transit`— the window basis adjusted deterministically for a
 *                        recorded delay/exception (a SIMULATED slip).
 *   `delivered`        — the consignment is already at the destination; no
 *                        forward ETA applies.
 *   `unavailable`      — no window was declared for the PO. The ETA is ABSENT
 *                        rather than invented (fail closed).
 *
 * `simulated` is true for every derived basis, because no provider has confirmed
 * the date. When a live carrier eventually reports an ETA, that value arrives
 * with `simulated: false` and a provider `source` — the shape already supports
 * it, so no component needs to change.
 */
export type ShipmentEtaBasis =
  | 'channel_window'
  | 'simulated_transit'
  | 'delivered'
  | 'unavailable';

export interface ShipmentEta {
  /** ISO date (YYYY-MM-DD), or null when the basis is `unavailable`/`delivered`. */
  date: string | null;
  basis: ShipmentEtaBasis;
  /** True when the date is derived/simulated — never a provider confirmation. */
  simulated: boolean;
  /** Where the estimate comes from. Rendered verbatim; never hidden. */
  source: string;
}

/** §Batch-21 — Product image slot with metadata. */
export interface ProductImage {
  /** Slot identifier: 'main', 'alt1'..'alt6', 'lifestyle', 'packaging' */
  slot: string;
  /** URL or data URI of the image. */
  url: string;
  /** Whether this image passes Amazon's requirements. */
  compliant: boolean;
  /** Validation results per requirement. */
  checks?: { id: string; label: string; severity: 'error' | 'warning' | 'info'; passed: boolean }[];
  /** Last verified timestamp. */
  verifiedAt?: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  image: string; // legacy — main image URL
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
  /**
   * §Stage-24 item setup — case-pack data, not a single "quantity" field.
   * unitsPerCase = sellable units per master carton; the case itself is
   * separately orderable only when caseOrderable is true.
   */
  unitsPerCase?: number;
  caseOrderable?: boolean;
  /** §Stage-24 — Product Tax Code (defaults to general taxable). */
  productTaxCode?: string;
  /** §Batch-2 — Manage Product Availability: in-stock/out-of-stock toggle. */
  isAvailable?: boolean;
  /** §Batch-2 — Lead time in days for replenishment. */
  leadTimeDays?: number;
}

/* ── §Functional-completion (2026-09-17) — Listing Analyzer ─────────
 * Brand-facing automated catalogue/listing analysis (§8). The engine is
 * DETERMINISTIC: it derives marketplace estimates from the existing
 * salesEstimator and productCompleteness logic (never a duplicated
 * engine), and every figure is explicitly labelled estimated/simulated.
 * The review statuses below back the workflow: Mercenta prepares the
 * analysis → the brand approves/edits/rejects each suggested improvement.
 * ─────────────────────────────────────────────────────────────────── */

export type ListingReviewStatus = 'suggested' | 'approved' | 'edited' | 'rejected';

export interface ListingRecommendation {
  /** Stable per product+area, e.g. `${sku}__hero_image`. */
  id: string;
  sku: string;
  area: string;
  title: string;
  detail: string;
  impact: string;
  status: ListingReviewStatus;
  /** Mercenta's suggested wording/content improvement. */
  suggestedCopy?: string;
  /** The brand's edited version when it chose to edit. */
  editedCopy?: string;
  reviewedAt?: string;
}

export interface ListingDimensionScore {
  key: string;
  label: string;
  /** 0 – 100. */
  score: number;
  note: string;
}

export interface ProductListingAnalysis {
  sku: string;
  brandId: string;
  productName: string;
  analyzedAt: string;
  /** Overall listing health 0–100. */
  healthScore: number;
  healthLevel: 'poor' | 'fair' | 'good' | 'strong';
  /** Prepared-by (always Mercenta in the workflow). */
  preparedBy: string;
  /** One score per dimension. */
  dimensions: ListingDimensionScore[];
  /** Simulated/estimated market position. Never live data. */
  estimates: {
    monthlyUnitsLow: number;
    monthlyUnitsHigh: number;
    monthlyRevenueMidGbp: number;
    annualRevenueMidGbp: number;
    priceGbp: number;
    bsrBand: string;
    velocityPerMonth: number;
    demandSignal: 'low' | 'medium' | 'high';
    categoryPosition: string;
    competitivePosition: string;
    opportunityIndicators: string[];
  };
  recommendations: ListingRecommendation[];
  /** Honest data-source sentence rendered with the analysis. */
  simulationLabel: string;
}

/** Default PTC per Stage-24 (general taxable — A_GEN_TAX in Amazon's taxonomy). */
export const DEFAULT_PRODUCT_TAX_CODE = 'A_GEN_TAX';

/* ────────────────────────────────────────────────────────────────────
 * §Phase E3 — Catalog / product management (submission lifecycle)
 * ──────────────────────────────────────────────────────────────── */

/**
 * §Phase E3 — the canonical catalog-submission state.
 *
 * This is the EXISTING vocabulary, not a new one: `src/lib/spapi/transform.ts`
 * declares the same values (plus the local `pending` pseudo-state) and the
 * seed submission rows in `src/data/demoData.ts` use the same four. Nothing
 * new is introduced here — the states are lifted into the domain types file so
 * the submission store, the seam and the UI cannot drift apart.
 */
export type CatalogSubmissionStatus =
  | 'submitted'
  | 'under_amazon_review'
  | 'live'
  | 'rejected';

/** Which client handled a submission — 'mock' until real credentials exist. */
export type CatalogClientMode = 'mock' | 'real';

/**
 * §Phase E3 — ONE canonical catalog-submission record.
 *
 * Replaces the four-field seed shape (`SeedSubmission`). `simulated` is
 * REQUIRED and explicit: a submission that never reached a live provider must
 * never be representable as a real retail result (rule: simulation is truthful).
 */
export interface ProductSubmission {
  /** Canonical id: `sub-<brandId>-<sku>` — replaying a submission cannot duplicate. */
  id: string;
  brandId: string;
  /** The canonical product this submission belongs to (by id, not by copy). */
  productId: string;
  productName: string;
  sku: string;
  asin?: string;
  status: CatalogSubmissionStatus;
  rejectionReason?: string;
  submittedAt: string;
  /** The provider tracking id returned by the seam (mock or real). */
  submissionId: string;
  mode: CatalogClientMode;
  /** TRUE whenever the submission could not have reached a live provider. */
  simulated: boolean;
  /** Number of status polls recorded against this submission. */
  polls: number;
  lastPolledAt?: string;
}

/**
 * §Phase E3 — product completeness.
 *
 * DERIVED from the submission prerequisites the existing `api.submitCatalogItem`
 * already enforces (`REQUIRED_SUBMISSION_FIELDS`) — no invented checklist.
 */
export interface ProductCompleteness {
  /** True when every prerequisite field carries a real value. */
  complete: boolean;
  /** The prerequisite fields still missing or empty. */
  missing: string[];
  /** Human labels for `missing`, in form order. */
  missingLabels: string[];
  /** 0–100: satisfied prerequisites / total prerequisites. */
  percent: number;
}

/**
 * §Phase E3 — whether a product may legitimately be submitted at all.
 *
 * `readyForSubmission` is the AND of product completeness and the EXISTING
 * compliance gate. A product that is not compliant is never reported ready.
 */
export interface CatalogReadiness {
  complete: boolean;
  /** The existing `evaluateComplianceGate(...).cleared` verdict for the tenant. */
  compliant: boolean;
  readyForSubmission: boolean;
  missing: string[];
  missingLabels: string[];
  /** Present-but-not-approved compliance documents (never weakened here). */
  blocking: { type: string; status: string }[];
}
/* ────────────────────────────────────────────────────────────────────
 * §P8 — INVENTORY LINKED TO THE BRAND'S CATALOGUE + THE CHANNEL IDENTIFIER
 *
 * Programme decision 5: per catalogue product the brand keeps an inventory
 * record — image · SKU · ASIN · available · UoM (Eaches/Cases) · on-hand ·
 * committed · inbound · safety stock — entered INSIDE Mercenta, never by
 * logging into a retail channel.
 *
 * Programme decision 10: the brand may supply the ASIN itself ONLY when the
 * product already exists on the channel; otherwise Mercenta populates it when
 * the channel accepts the product. Until a real identifier exists the value is
 * an unmistakably simulated `SIM-ASIN-…` placeholder — the code never invents a
 * plausible-looking ASIN.
 *
 * Declared ONCE here (rule §03). The behaviour lives in
 * `src/lib/catalog/asin.ts` (the identifier) and `src/lib/inventory/**` (the
 * stock figures). No component re-declares any of these.
 * ──────────────────────────────────────────────────────────────── */

/**
 * The unit a stock figure is ENTERED and SHOWN in (decision 5).
 *
 * This is the channel's own payload vocabulary — `Cases` / `Eaches`
 * (discrepancy register **AV-029**, status CONFIRMED) — so the two cannot
 * diverge. Quantities are always STORED in eaches; the unit is how the brand
 * works, and the conversion uses the product's own case pack.
 */
export type InventoryUom = 'eaches' | 'cases';

/** The three stock buckets an inventory movement can change. */
export type InventoryBucket = 'on_hand' | 'committed' | 'inbound';

/**
 * The kinds of movement the ledger accepts. Every figure is DERIVED from the
 * ledger, so stock can never be edited into existence without a provenance.
 */
export type InventoryMovementType =
  | 'opening'
  | 'receipt'
  | 'dispatch'
  | 'commitment'
  | 'release'
  | 'inbound_expected'
  | 'inbound_cancelled'
  | 'adjustment';

/**
 * §P8 — ONE append-only inventory movement (the canonical stock provenance).
 *
 * `quantityDelta` is ALWAYS in eaches; the entry the actor actually made is
 * retained beside it (`enteredQuantity` / `enteredUom` / `unitsPerCaseUsed`) so
 * a case-based entry is auditable and never silently reinterpreted.
 */
export interface InventoryMovement {
  id: string;
  brandId: string;
  sku: string;
  productId: string;
  bucket: InventoryBucket;
  /** Signed delta in EACHES — the canonical unit. */
  quantityDelta: number;
  /** What the actor typed, in the unit they typed it in. */
  enteredQuantity: number;
  enteredUom: InventoryUom;
  /** The case pack used for the conversion (1 when the entry was in eaches). */
  unitsPerCaseUsed: number;
  type: InventoryMovementType;
  /** REQUIRED for an `adjustment` (a counted correction must say why). */
  reason?: string;
  actorId: string;
  recordedAt: string;
}

/** §P8 — the brand's own working settings for one catalogue product. */
export interface InventorySettings {
  brandId: string;
  sku: string;
  productId: string;
  uom: InventoryUom;
  /** The reorder trigger, in EACHES. */
  safetyStock: number;
  updatedAt: string;
  updatedBy: string;
}

/**
 * §P8 — who supplied the channel identifier (decision 10).
 *
 * `brand_declared` requires the brand to confirm the product ALREADY exists on
 * the channel; `channel_assigned` is Mercenta populating it from the channel's
 * acceptance. Nothing else may write it.
 */
export type AsinSource = 'brand_declared' | 'channel_assigned';

/** §P8 — the canonical per-product channel identifier record. */
export interface ProductIdentifier {
  brandId: string;
  sku: string;
  productId: string;
  asin: string;
  source: AsinSource;
  /** TRUE whenever the value could not have come from a live channel response. */
  simulated: boolean;
  /** The brand's required confirmation that the listing already exists. */
  brandConfirmedExistingListing?: boolean;
  recordedAt: string;
  recordedBy: string;
  note?: string;
}

/** §P8 — the derived stock position of one product (never stored). */
export type InventoryStatus = 'out_of_stock' | 'below_safety_stock' | 'in_stock';

/** §P8 — how far the product has got towards having a channel identifier. */
export type AsinState = 'none' | 'pending_channel' | 'assigned';

/**
 * §P8 — the DERIVED inventory view of one catalogue product.
 *
 * Every figure is derived on read from the movement ledger plus the settings, so
 * there is no second copy to drift (the §P6/§P7 rule). `available` may be
 * negative — an oversold position is STATED, never clamped.
 */
export interface InventoryRecord {
  brandId: string;
  sku: string;
  productId: string;
  uom: InventoryUom;
  onHand: number;
  committed: number;
  inbound: number;
  safetyStock: number;
  /** on-hand − committed (in eaches). Negative means oversold. */
  available: number;
  status: InventoryStatus;
  /** The channel identifier, when one exists (never invented). */
  asin?: string;
  asinSource?: AsinSource;
  asinSimulated?: boolean;
  identifierState: AsinState;
  movementCount: number;
  updatedAt?: string;
}

/** §P8 — the ONE derived roll-up of a tenant's inventory. */
export interface InventorySummary {
  products: number;
  unitsOnHand: number;
  unitsCommitted: number;
  unitsInbound: number;
  unitsAvailable: number;
  belowSafetyStock: number;
  outOfStock: number;
  withIdentifier: number;
  simulatedIdentifiers: number;
}




/* ────────────────────────────────────────────────────────────────────
 * §Phase E4 — Commerce / Amazon-style OPERATIONAL SIMULATION
 *
 * The lifecycle is built on the EXISTING operational vocabulary
 * (`PurchaseOrder`, `PurchaseOrderStatus`, `Shipment`, `Deduction`, the
 * helpdesk case) plus the ONE new canonical operational record and the
 * invoice/payment artefacts the platform had no canonical home for. No second
 * compliance system, no second PO vocabulary, no second store, no second DB.
 * ──────────────────────────────────────────────────────────────── */

/**
 * §Phase E4 — truthful provenance for an operational commerce record.
 * `simulation` is the only mode reachable while no live provider credentials
 * exist; it is written explicitly and never inferred or silently upgraded.
 */
export type CommerceMode = 'simulation' | 'live';

/**
 * §Phase E4 — every operational step is recorded as ONE canonical activity, so
 * the lifecycle is auditable and the simulation provenance lives on the record
 * itself rather than being duplicated onto unrelated objects.
 */
export type CommerceActivityType =
  | 'po_created'
  | 'po_acknowledged'
  | 'po_fulfilment_started'
  | 'shipment_advanced'
  | 'po_received'
  | 'invoice_issued'
  /**
   * §S9 — the RECEIPT → INVOICE automation REFUSED to raise the invoice the
   * receipt would otherwise have produced (an undeclared term, a state that does
   * not permit an invoice, or a refusal from the canonical writer such as a
   * zero-value invoice). The receipt itself stands — the goods arrived — so the
   * refusal is recorded on the same canonical trail rather than swallowed.
   */
  | 'invoice_automation_refused'
  /**
   * §P7 — a retail-channel invoice was CANCELLED. The channel's documented rule
   * (register S11 / `AV-022`) is that a wrong invoice is cancelled and must be
   * re-sent under a NEW Invoice ID, so cancellation is a real operational step
   * on the same canonical trail — never a silent edit of an issued invoice.
   */
  | 'invoice_cancelled'
  | 'payment_recorded'
  | 'exception_raised'
  | 'dispute_opened'
  | 'dispute_resolved';

export interface CommerceActivity {
  /** Deterministic id: `com-<brandId>-<type>-<sequence>`. */
  id: string;
  brandId: string;
  type: CommerceActivityType;
  /** The resulting operational state (e.g. a `PurchaseOrderStatus`). */
  status: string;
  purchaseOrderId?: string;
  shipmentId?: string;
  invoiceId?: string;
  deductionId?: string;
  detail: string;
  actorId: string;
  mode: CommerceMode;
  /** TRUE whenever the step could not have run against a live provider. */
  simulated: boolean;
  at: string;
}

/**
 * §Phase E4 — whether a product may enter the commerce simulation.
 *
 * DERIVED from the E3 catalog lifecycle (product completeness + the EXISTING
 * compliance gate + the latest submission state). Never a second compliance
 * rule set, and never a weaker one.
 */
export interface CommerceEligibility {
  eligible: boolean;
  brandId: string;
  sku: string;
  productId?: string;
  /** Human-readable reasons the product is not eligible (empty when eligible). */
  reasons: string[];
  /** The E3 readiness verdict this was derived from. */
  readiness: CatalogReadiness;
  /** The latest E3 submission state, when one exists. */
  submissionStatus?: CatalogSubmissionStatus;
}

/**
 * §P7 — THE PAYMENT TERMS MERCENTA OFFERS ON A RETAIL-CHANNEL INVOICE.
 *
 * Declared ONCE here (the types file owns enum-like unions, exactly like
 * `PO_REJECTION_CODES`), then consumed by `src/lib/commerce/invoiceTerms.ts`,
 * which is the single owner of the arithmetic derived from them. Terms are
 * chosen PER INVOICE (programme decision 2) — there is no global term.
 */
export const INVOICE_TERM_CHOICES = [14, 30, 60] as const;
export type InvoiceTermDays = (typeof INVOICE_TERM_CHOICES)[number];

/** §Phase E4 — canonical SIMULATED invoice raised against a commerce PO. */
export interface CommerceInvoice {
  /**
   * Deterministic id. The FIRST invoice for a PO is `cinv-<brandId>-<poNumber>`;
   * a replacement after a cancellation gets the allocation ordinal appended
   * (`…-r2`), so the id and the number move together (§P7 — `AV-022`).
   */
  id: string;
  brandId: string;
  purchaseOrderId: string;
  poNumber: string;
  /**
   * §P7 — the invoice number, allocated by the ONE registry
   * (`src/lib/commerce/invoiceRegistry.ts`). Unique and NEVER reused: the number
   * of a cancelled invoice stays consumed for ever (`AV-022`).
   */
  number: string;
  lines: { description: string; amountGbp: number }[];
  subtotalGbp: number;
  /**
   * §P7 — `cancelled` is a real terminal state (a wrong invoice is cancelled by
   * the channel and re-sent under a NEW Invoice ID — `AV-022`). A cancelled
   * invoice is never a receivable and never carries a payment.
   */
  status: 'issued' | 'paid' | 'cancelled';
  /**
   * §P7 — the terms THIS invoice carries (`14 | 30 | 60`). Optional because the
   * pre-P7 ledger has rows that predate the choice; an absent value resolves to
   * the declared default in `invoiceTerms.ts` — the derivation is NEVER guessed
   * in a component.
   */
  termDays?: InvoiceTermDays;
  currency: 'GBP';
  mode: CommerceMode;
  simulated: boolean;
  issuedAt: string;
  paidAt?: string;
  /** §P7 — when and why the invoice was cancelled (present when `cancelled`). */
  cancelledAt?: string;
  cancellationReason?: string;
  /** §P7 — the invoice this replacement supersedes (`AV-022` re-issue chain). */
  replacesInvoiceId?: string;
  /** §P7 — the replacement raised after this invoice was cancelled. */
  replacedByInvoiceId?: string;
}

/** §Phase E4 — canonical SIMULATED payment settled against an invoice. */
export interface CommercePayment {
  /** Deterministic id: `cpay-<brandId>-<invoiceId>`. */
  id: string;
  brandId: string;
  invoiceId: string;
  purchaseOrderId: string;
  amountGbp: number;
  status: 'settled';
  method: 'simulated_bank_transfer';
  mode: CommerceMode;
  simulated: boolean;
  at: string;
}

/* ── §M6 — Payment reconciliation, payout eligibility, payout lifecycle ───── */

/**
 * The VAT treatment applied to the money flow.
 *
 * §ACCOUNTING RULE — this is an EXTERNAL business/accounting decision. The
 * repository does not invent one: until the treatment is configured,
 * `configuration_required` is carried through every financial record so nothing
 * downstream can present a production tax result that was never decided.
 */
export type VatTreatment =
  | 'configuration_required'
  | 'standard_20'
  | 'zero_rated'
  | 'exempt'
  | 'reverse_charge';

/** The canonical state of a received payment's reconciliation. */
export type PaymentReconciliationState = 'pending' | 'reconciled' | 'exception';

/**
 * §M6 — the DETERMINISTIC reconciliation of a retail-channel payment to the
 * PO/invoice identity it actually belongs to. Nothing in the platform may treat
 * a payment's PO as "assumed": this record is the evidence.
 */
export interface PaymentReconciliation {
  /** Deterministic id: `rec-<paymentId>`. One per payment, ever. */
  id: string;
  paymentId: string;
  invoiceId: string;
  /** The canonical PO id. */
  purchaseOrderId: string;
  purchaseOrderNumber: string;
  brandId: string;
  amountGbp: number;
  currency: 'GBP';
  /** Where the money came from (payment method/source as recorded). */
  paymentSource: string;
  paymentDate: string;
  state: PaymentReconciliationState;
  reconciledAt?: string;
  reconciledBy?: string;
  exceptionReason?: string;
  /**
   * The canonical money breakdown, derived from the PO/payment facts — never
   * from a UI display value.
   */
  fact: {
    poValueGbp: number;
    commissionRatePct: number;
    commissionAmountGbp: number;
    /** Deductions borne by the brand (accepted/resolved). */
    deductionsAppliedGbp: number;
    /** Deductions still open/disputed — these BLOCK payout eligibility. */
    deductionsUnresolvedGbp: number;
    deductionsUnresolvedCount: number;
    fulfilmentFeesGbp: number;
    netToBrandGbp: number;
    vatTreatment: VatTreatment;
    vatConfigured: boolean;
    /** Only present when a VAT treatment has actually been configured. */
    vatAmountGbp?: number;
  };
  /** The accounting representation written through the canonical Xero seam. */
  accounting: {
    provider: string;
    mode: 'simulation' | 'live' | 'unavailable';
    represented: boolean;
    representationId?: string;
    postedAt?: string;
    error?: string;
    simulated: boolean;
  };
  payoutEligible: boolean;
  payoutBlockedReason?: string;
  mode: CommerceMode;
  simulated: boolean;
}

/** Brand payout destination review state. Unverified destinations can never be paid. */
export type PayoutDestinationStatus = 'unverified' | 'verified' | 'rejected' | 'suspended';

export interface BrandPayoutDestination {
  id: string;
  brandId: string;
  accountName: string;
  /** Masked reference only — a full account number is never held in the app. */
  accountRefMasked: string;
  bankName: string;
  country: string;
  currency: 'GBP';
  status: PayoutDestinationStatus;
  /** How the destination was checked (manual bank verification, provider call…). */
  verificationMethod?: string;
  verificationRef?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  failureReason?: string;
  mode: CommerceMode;
  simulated: boolean;
}

/**
 * The canonical payout lifecycle for one commission. `Commission.status` stays
 * the ACCOUNTING state (accrued/invoiced/paid); this record owns the operational
 * payout state machine, so a payout can be pending → eligible → submitted →
 * settled/failed and retried without inventing a second money ledger.
 */
export type PayoutState = 'pending' | 'eligible' | 'submitted' | 'settled' | 'failed';

export interface CommissionPayout {
  /** Deterministic id: `payout-<commissionId>`. One payout identity per commission. */
  id: string;
  commissionId: string;
  brandId: string;
  purchaseOrderId: string;
  reconciliationId?: string;
  destinationId?: string;
  netAmountGbp: number;
  currency: 'GBP';
  state: PayoutState;
  attempts: number;
  transferId?: string;
  mode: 'mock' | 'real';
  submittedAt?: string;
  settledAt?: string;
  failedAt?: string;
  failureReason?: string;
  /** Why the payout is not eligible yet (present while state is pending). */
  blockedReason?: string;
  vatTreatment: VatTreatment;
  simulated: boolean;
}


export interface ActivityLog {
  id: string;
  timestamp: string;
  shipmentRef: string;
  carrier: CarrierId;
  message: string;
  status: ShipmentStatus;
}

/**
 * §Phase C — ICP brand-ORIGIN region.
 *
 * 'uk' was added in Phase C: 7 of the 10 canonical Brand Intelligence prospects
 * are UK-market brands (`ukPresence: true`, no `countries` list) and had no
 * derivable origin region under the previous 4-region model, so they could not
 * enter the ICP acquisition universe at all. Lead.region is client-side only
 * (no `leads` table exists in supabase/migrations), so widening the union has no
 * database ripple.
 */
export type LeadRegion = 'us' | 'eu' | 'uk' | 'africa' | 'canada';

export interface Lead {
  id: string;
  persona: string;
  company: string;
  location: string;
  email: string;
  priority: 'High' | 'Medium';
  outreachStatus:
    | 'Scraped'
    | 'Enriched'
    | 'Sequenced'
    | 'Email Sent'
    | 'Replied'
    | 'Meeting Booked';
  segment: string;
  fitScore: number;
  region: LeadRegion;
  /** §Phase A — canonical Brand Intelligence prospect link. Identity + evidence
   *  survive every stage: BI prospect → ICP lead → outreach → opportunity.
   *  Absent for leads with no canonical BI counterpart (seeded demo fixtures,
   *  CSVs for unknown brands). */
  prospectId?: string;
}

export interface Campaign {
  id: string;
  name: string;
  status: 'Scaling' | 'Active' | 'Paused';
  costPerLead: number;
  leads: number;
  dispatched: number;
  replies: number;
  meetings: number;
}

export interface ApiLogEntry {
  id: string;
  timestamp: string;
  method: string;
  endpoint: string;
  payload: Record<string, unknown>;
  status: number;
}

export interface RevenuePoint {
  month: string;
  revenue: number;
  orders: number;
}

export interface CarrierVolumePoint {
  month: string;
  courier: number;
  freight: number;
}

export type BrandRegion = 'north_america' | 'europe' | 'africa';

export interface BrandProfile {
  businessName: string;
  region: BrandRegion;
  nation: string;
  taxId: string;
  email: string;
  phone: string;
  signatory: string;
  agreed: boolean;
  bic: string;
  iban: string;
  payoutCurrency: string;
  dhlConnected: boolean;
  onboarded: boolean;
  /** §5 — fulfillment track assigned to this brand */
  fulfillmentTrack: FulfillmentTrack;
  /** §3 — compliance gate status; 'blocked' prevents catalog sync */
  complianceGateStatus: 'blocked' | 'in_review' | 'cleared';
  /** §5 — answer to the working-capital qualification question */
  workingCapitalAnswer?: 'yes' | 'partially' | 'no';
  /** §13 — product category selected during onboarding, one of APPROVED_CATEGORIES */
  category?: string;
  /**
   * §5/M12 — the brand's commercial relationship with Mercenta, chosen during
   * onboarding and persisted per brand. Undefined = not yet selected, which the
   * onboarding gate REFUSES (fail-closed). It is INTERNAL between Mercenta and the
   * brand and can never change which retail-channel compliance documents apply.
   */
  commercialModel?: CommercialModelSelection;
}
export type DemoRegion = 'uk' | 'usa' | 'europe';

/**
 * §P9 (programme decision 1) — only Mercenta's two carrier accounts hold tokens.
 * REPOINTED from the old contract `{ dhl?; fedex?; bak? }`.
 */
export interface CarrierTokens {
  dhl?: string;
}

export type FinancialCurrency = 'USD' | 'EUR' | 'GBP' | 'ZWL';

export interface FinancialRecord {
  id: string;
  currency: FinancialCurrency;
  label: string;
  amount: number;
  type: 'receivable' | 'payable' | 'payout';
  date: string;
  note?: string;
  taxRef?: string;
}

/**
 * Legacy per-region compliance record used by the regional demo dossiers.
 * (The §3/§4 compliance-gate document type is `ComplianceDocument` below.)
 */
export interface RegionalComplianceDoc {
  id: string;
  title: string;
  type: string;
  status: 'verified' | 'pending' | 'expiring';
  region: string;
  detail?: string;
}

export interface RegionalDossier {
  region: DemoRegion;
  profile: BrandProfile;
  products: Product[];
  shipments: Shipment[];
  financials: FinancialRecord[];
  compliance: RegionalComplianceDoc[];
  tokens: CarrierTokens;
}

/* ────────────────────────────────────────────────────────────────────
 * §2 — Data model additions (Supabase table equivalents in comments)
 * ──────────────────────────────────────────────────────────────── */

/** §5 Fulfillment Track */
export type FulfillmentTrack = 'direct_fulfillment' | 'financed' | 'unassigned';

export interface FulfillmentScore {
  brandId: string;
  tradingHistoryScore: number; // 0-20: years exporting
  exportExperienceScore: number; // 0-15: prior UK/EU export, existing EORI
  scaleScore: number; // 0-20: self-reported revenue / catalog size
  workingCapitalScore: number; // 0-20: can brand front 30-90 days of stock?
  categoryRiskScore: number; // 0-15: perishable/hazmat lowers this
  reliabilityScore: number; // 0-10: on-time ship rate once live (0 pre-launch)
  totalScore: number; // sum, 0-100
  /** auto-assigned at totalScore >= 65 ? direct_fulfillment : financed */
  track: FulfillmentTrack;
  manualOverride: boolean;
  overrideReason?: string;
  lastCalculated: string;
}

/** §4 Contract Cycle */
export interface Contract {
  id: string;
  brandId: string;
  type: 'distribution_agreement' | 'nda' | 'rate_card_addendum';
  status:
    | 'draft'
    | 'sent'
    | 'under_review'
    | 'signed'
    | 'active'
    | 'expiring'
    | 'terminated';
  commissionRate: number; // % of net PO value
  monthlyFee: number; // flat GBP
  fulfillmentTrack: FulfillmentTrack;
  effectiveDate: string;
  renewalDate: string;
  documentUrl: string;
  signatories: { name: string; email: string; signedAt?: string }[];
  version: number;
}

/** §Priority-1 — Companies House verification record for a brand company. */
export interface CompanyVerification {
  id: string;
  brandId: string;
  companyNumber: string;
  companyName: string;
  /** Registrar status: active companies verify cleanly; dissolved do not. */
  status: 'verified' | 'not_found' | 'dissolved' | 'error';
  incorporatedAt?: string;
  sicCodes?: string[];
  verifiedAt?: string;
  lastError?: string;
  /** 'simulation' until a live Companies House connection verifies records. */
  source: 'simulation' | 'live';
}

/** §Priority-1 — HMRC filing record (VAT/CT submission lifecycle). */
export interface HmrcFiling {
  id: string;
  brandId: string;
  vrn: string;
  period: string;
  type: 'vat_return' | 'ct_return';
  status: 'accepted' | 'rejected' | 'error';
  submissionId?: string;
  rejectionReason?: string;
  filedAt?: string;
  agency: 'simulation' | 'live';
}

/**
 * §3 Compliance gate documents
 *
 * §M2 — the lifecycle now also carries `rejected` (submitted, verification
 * failed — the document must be REPLACED) and `superseded` (a later version of
 * the same document requirement replaced it; retained so the audit trail shows
 * what was previously on file). Both block the gate, exactly like `missing`.
 */
export interface ComplianceDocument {
  id: string;
  brandId: string;
  type:
    | 'letter_of_authorization'
    | 'brand_registry_confirmation'
    | 'product_safety_ukca'
    | 'insurance_certificate'
    // Category-specific documents required by Amazon UK:
    | 'baby_product_safety'          // Baby (EN 71 / EN 1888)
    | 'cosmetic_notification_cpnp'   // Health & Personal Care (CPNP/SCNP)
    | 'food_contact_material'        // Kitchen (Food Contact Compliance)
    | 'weee_compliance'              // Consumer Electronics, Personal Computer
    | 'type_approval'                // Automotive (Type Approval Docs)
    | 'food_safety_certificate'      // Grocery (HACCP/BRC)
    | 'textile_labelling_compliance';// Apparel
  status:
    | 'missing'
    | 'uploaded'
    | 'under_review'
    | 'approved'
    | 'rejected'
    | 'superseded'
    | 'expiring'
    | 'expired';
  fileUrl?: string;
  expiryDate?: string;
  reviewedBy?: string;
  /** §M2 — reference printed on the document (certificate/policy number). */
  reference?: string;
  /** §M2 — issuing body named on the document. */
  issuer?: string;
  /**
   * §M2 — document version. Absent means version 1 (backwards compatible with
   * every seeded record). A replacement after rejection/supersession increments
   * this and sets `supersedesDocumentId`.
   */
  version?: number;
  /** §M2 — the document record this version replaced (rejected/superseded one). */
  supersedesDocumentId?: string;
  /** §M2 — cached verification verdict; the RECORDS remain the audit source. */
  verificationStatus?: DocumentVerificationStatus;
  /** §M2 — the record currently authoritative for this document version. */
  latestVerificationId?: string;
}

/* ── §M2 — Document verification ─────────────────────────────────────────── */

/**
 * The verification verdict for a document version. `verified` never means
 * "an external authority approved it" unless the latest verification record has
 * `external: true`; the record — not this summary — carries that evidence.
 */
export type DocumentVerificationStatus =
  | 'not_requested'
  | 'pending'
  | 'verified'
  | 'failed'
  | 'unavailable'
  | 'manual_review_required';

/** How the decision was reached. Manual is a first-class operational path. */
export type DocumentVerificationMethod = 'automated' | 'manual';

/**
 * Where a verdict came from. Only `external_provider` ever means a third party
 * actually verified the document. `simulation` is the deterministic mock seam
 * (unmistakably simulated, never presented as real verification).
 */
export type DocumentVerificationProviderSource =
  | 'internal_rules'
  | 'simulation'
  | 'manual_operator'
  | 'external_provider'
  | 'unavailable';

export interface DocumentVerificationRecord {
  id: string;
  documentId: string;
  brandId: string;
  documentType: ComplianceDocument['type'];
  documentVersion: number;
  status: DocumentVerificationStatus;
  method: DocumentVerificationMethod;
  source: DocumentVerificationProviderSource;
  /** The seam that produced this verdict (e.g. `internal_structural_rules`). */
  providerId: string;
  /** Human/provider identity of who or what verified the document. */
  verifierIdentity: string;
  /** TRUE only when a real external provider returned this result. */
  external: boolean;
  /** TRUE when this verdict came from the deterministic simulation seam. */
  simulated: boolean;
  /** Provider resolution mode the seam saw (`simulation`, `live`, `unknown`…). */
  providerMode: string;
  verifiedAt: string;
  result: 'pass' | 'fail' | 'refused';
  evidenceReference?: string;
  failureReason?: string;
  notes?: string;
  /** The earlier record this one replaces (version replacement). */
  supersedesRecordId?: string;
  /** TRUE once a later verification record for the same requirement supersedes it. */
  superseded?: boolean;
}

/** §11 Billing — flat monthly Stripe subscription */
export interface Subscription {
  id: string;
  brandId: string;
  planTier: 'starter' | 'growth';
  monthlyFee: number;
  stripeSubscriptionId: string;
  status: 'active' | 'past_due' | 'canceled';
}

/** §10/§11 — commission accrued per real PO */
export interface Commission {
  id: string;
  brandId: string;
  purchaseOrderId: string;
  poValue: number;
  commissionRate: number;
  commissionAmount: number;
  status: 'accrued' | 'invoiced' | 'paid';
  createdAt: string;
}

/** §8/§9 Messaging hub — unified log across automation and staff */
export interface Message {
  id: string;
  brandId: string;
  leadId?: string;
  channel: 'email' | 'sms' | 'in_app' | 'call' | 'team_note';
  direction: 'inbound' | 'outbound';
  subject?: string;
  body: string;
  sentBy: 'automation' | 'staff';
  requiresHuman: boolean;
  createdAt: string;
  /**
   * §Stage-23/24 — optional linkage to the specific commercial object the
   * conversation is about. This is what makes it a support system tied to
   * real operations rather than a generic inbox.
   */
  poRef?: string;
  submissionId?: string;
}

/** §12 Ad spend dashboard */
export interface AdSpendBudget {
  brandId: string;
  monthlyBudgetGbp: number;
  spendToDateGbp: number;
  acos: number;
  tacos: number;
  status: 'not_configured' | 'active' | 'paused';
}

/* ── §Functional-completion (2026-09-17) — Advertising depth ───────
 * Campaign-level data + recommended-spend approvals + manual budget
 * input. Real Amazon Ads activation stays deferred; every value here is
 * deterministic simulation seed data, explicitly labelled as such on every
 * surface that renders it. Adding these shapes does NOT change
 * AdSpendBudget (the established §12 seam) — it extends what consumers
 * can read and write through the seam.
 * ───────────────────────────────────────────────────────────────── */

export type AdCampaignStatus = 'active' | 'paused' | 'ended';

/** One simulated advertising campaign belonging to a brand's tenant. */
export interface AdCampaign {
  id: string;
  brandId: string;
  name: string;
  status: AdCampaignStatus;
  /** Monthly budget allocated to this campaign (GBP). */
  monthlyBudgetGbp: number;
  /** Spend recorded to date this month (GBP). */
  spendToDateGbp: number;
  /** Impressions served to date. */
  impressions: number;
  /** Clicks recorded to date. */
  clicks: number;
  /** Sales attributed to the campaign to date (GBP). */
  attributedSalesGbp: number;
  /** ACOS: spend / attributed sales (0..1), null when no sales yet. */
  acos: number | null;
  /** Placement/device target, e.g. 'Sponsored Products'. */
  placement: string;
  /** Data source label — always simulation until live credentials exist. */
  sourceLabel: string;
}

export type AdSpendRecommendationStatus =
  | 'proposed'
  | 'approved'
  | 'amended'
  | 'rejected';

/**
 * A deterministic recommended monthly budget for a brand's advertising,
 * prepared by Mercenta and APPROVED/AMENDED/REJECTED by the brand. The
 * automated chain stops at 'proposed' — no budget is treated as granted
 * until the brand explicitly decides.
 */
export interface AdSpendRecommendation {
  id: string;
  brandId: string;
  month: string; // YYYY-MM
  /** Mercenta's proposed monthly budget (GBP) — derived, never live data. */
  recommendedMonthlyBudgetGbp: number;
  /** The basis for the recommendation, derived from the simulated seed. */
  basis: string;
  status: AdSpendRecommendationStatus;
  /** Posted by Mercenta on preparation. */
  createdAt: string;
  /** Set when the brand (or admin on its behalf) decides. */
  reviewedAt?: string;
  /** Actor id (brand user or 'admin' + name) of the deciding party. */
  actorDisplay?: string;
  /** When amended, the budget the brand actually approved. */
  amendedBudgetGbp?: number;
  /** Optional brand note attached at decision time. */
  note?: string;
}

/* ── §19.1 Deductions / chargebacks ledger ─────────────────────────── */

export type DeductionType =
  | 'late_shipment'
  | 'shortage_claim'
  | 'mislabeled_carton'
  | 'non_compliance_fine'
  | 'co_op'
  | 'return_charge'
  | 'unfilled_by_cancel_date'
  | 'po_on_time_accuracy'
  | 'other';

export type DeductionStatus = 'open' | 'disputed' | 'accepted' | 'resolved';

export type DisputeOutcome = 'won' | 'lost' | 'partial';

export interface Deduction {
  id: string;
  brandId: string;
  /** PO number the deduction was raised against (e.g. "PO-9003"). */
  purchaseOrderId: string;
  type: DeductionType;
  amountGbp: number;
  reason: string;
  status: DeductionStatus;
  evidenceNotes?: string;
  date: string; // ISO date the deduction was posted
  /** Present once staff open a dispute against the deduction. */
  dispute?: {
    openedAt: string;
    notes: string;
    outcome?: DisputeOutcome;
  };
  /** §Phase E4 — provenance for exceptions raised by the commerce simulation. */
  mode?: CommerceMode;
  simulated?: boolean;
}

/* ── §PO workflow (brand-facing Purchase Orders tab) ──────────────── */

/* ── §Freight term for PO ship-window vs delivery-window distinction ── */

/**
 * §Freight term for PO ship-window vs delivery-window distinction.
 *
 * WHAT IS CONFIRMED (docs/AMAZON_VENDOR_TRUTH_VALIDATION_2026-09-20.md S3/S7)
 * --------------------------------------------------------------------------
 * - `collect` (the retail channel arranges and pays the carrier — "WePay"):
 *   the PO carries a **Ship Window** (earliest/latest ship date).
 * - `prepaid` (the vendor arranges the carrier — "TheyPay"): the PO carries a
 *   **Delivery Window** (the range the carrier must deliver to the destination
 *   within).
 *
 * WHAT IS NOT CONFIRMED — AND IS THEREFORE NOT ASSERTED HERE
 * ---------------------------------------------------------
 * An earlier version of this comment asserted that "the vendor must submit a
 * Routing Request by 10am Pacific the day before the ship window closes". That
 * deadline is **NOT established by any Amazon source reached**
 * (`docs/AMAZON_VENDOR_TRUTH_VALIDATION_2026-09-20.md` → discrepancy `AV-013`;
 * register entry: "UNKNOWN — reclassify to a Mercenta operational target, or
 * remove until Amazon confirms"). It is therefore NOT stated as a channel rule
 * anywhere in this codebase.
 *
 * What the product DOES hold is Mercenta's OWN operational readiness target —
 * prepare and file the routing/booking step before the ship window closes, so a
 * consignment is never dispatched against a window that has already ended. That
 * target is declared once in `src/lib/shipping/routingReadiness.ts`, is labelled
 * as Mercenta-owned, and is never attributed to the retail channel.
 */
export type FreightTerm = 'collect' | 'prepaid';
export type PurchaseOrderStatus =
  | 'received'
  | 'under_review'
  | 'accepted'
  | 'rejected'
  | 'ready_to_fulfil'
  | 'shipped'
  | 'delivered';

/**
 * §P7 — A RETAIL-CHANNEL INVOICE NUMBER, AS THE REGISTRY CONSUMED IT.
 *
 * The canonical ledger row behind `AV-022`. It is an append-only record: a row is
 * never deleted and a `number` is never reissued — a cancelled invoice VOIDS its
 * row (recording when and why) and the replacement takes a NEW number.
 */
export interface InvoiceNumberAllocation {
  /** The number itself — the registry key. Unique for ever. */
  number: string;
  purchaseOrderId: string;
  poNumber: string;
  brandId: string;
  /** 1 for the PO's first invoice; 2+ for a re-issue after a cancellation. */
  ordinal: number;
  /** The invoice that consumed this number. */
  invoiceId: string;
  allocatedAt: string;
  /** Set when the invoice carrying this number was cancelled — stays consumed. */
  voidedAt?: string;
  voidReason?: string;
}

/**
 * §P7 — THE RECEIVING STATUS OF A PURCHASE ORDER.
 *
 * The retail channel's OWN concept (register `AV-018` / source `S5`:
 * `receivingStatus` = *"the Amazon fulfillment center received status and
 * received quantity"*). Declared ONCE here; the derivation, the labels and the
 * invoice gate live in `src/lib/commerce/receivingStatus.ts`.
 *
 * The status is DERIVED from the per-line received quantity the receiving step
 * logs — never stored as a second copy that could drift (the §P6 rule).
 */
export const RECEIVING_STATUSES = ['not_received', 'partially_received', 'received'] as const;
export type ReceivingStatus = (typeof RECEIVING_STATUSES)[number];

/**
 * §P5 — THE DESTINATION CARRIED ON THE PURCHASE ORDER.
 *
 * The retail channel states the destination **on each purchase order** as its
 * ship-to party, whose id is the fulfilment-centre code (`shipToPartyId` = FC
 * code — Amazon developer docs, register `S5`; `AV-017` records that the PO
 * itself, not any Mercenta list, is authoritative). This is the ONE place the
 * destination is declared, so `src/config/destinationFc.ts` can resolve it and
 * a shipment can never be given an invented destination.
 *
 * OPTIONAL ON PURPOSE: a PO that genuinely does not declare its ship-to party
 * resolves to an EXPLICIT "not declared" destination
 * (`DESTINATION_NOT_DECLARED`), which the map renders as a schematic leg. It is
 * never defaulted to a hub or to any other Mercenta-chosen site.
 */
export interface ShipToParty {
  /** The channel-assigned party id — the fulfilment-centre CODE (e.g. `LBA1`). */
  partyId: string;
  /** The FC name exactly as the PO/channel declares it, when given. */
  name?: string;
  /** The declared city, when given (this is what the map can locate). */
  city?: string;
  /** The declared postcode, when given. */
  postcode?: string;
}

export interface PurchaseOrder {
  id: string;
  brandId: string;
  poNumber: string;
  status: PurchaseOrderStatus;
  /**
   * §P5 — the destination the CHANNEL declared on this PO. The shipment derived
   * from this PO takes its destination from here (`src/config/destinationFc.ts`),
   * so the Mercenta Hub is no longer a destination anywhere in the platform.
   */
  shipToParty?: ShipToParty;
  poValue: number; // net GBP
  commissionRate: number;
  commissionAmount: number;
  orderDate: string;
  /** Required when status === 'rejected'. Logged, never discarded. */
  rejectionReason?: string;
  /**
   * §Stage-24 — PO acknowledgment (Vendor Central semantics).
   * Hard business rule: unacknowledged after 24h from receipt = at risk of
   * forced cancellation. Deadline is orderDate + 24h; surfaced as a countdown.
   */
  acknowledgedAt?: string;
  /**
   * §Vendor-Central deep-dive — freight responsibility determines window type.
   * `collect`: Amazon arranges carrier → Ship Window (shipWindowStart / shipWindowEnd).
   * `prepaid`: vendor arranges carrier → Delivery Window (deliveryWindowStart / deliveryWindowEnd).
   */
  freightTerm?: FreightTerm;
  /** Earliest ship date (Freight Collect POs). */
  shipWindowStart?: string;
  /**
   * Latest ship date. The consignment must be dispatched within the ship
   * window; Mercenta's own readiness target is declared in
   * `src/lib/shipping/routingReadiness.ts` (Mercenta-owned, never presented as a
   * channel deadline — see `AV-013`).
   */
  shipWindowEnd?: string;
  /** Earliest delivery date (Freight Prepaid POs). */
  deliveryWindowStart?: string;
  /** Latest delivery date — carrier must deliver to FC by this date. */
  deliveryWindowEnd?: string;
  lineItems: PurchaseOrderLineItem[];
  /**
   * §Phase E4 — provenance of an OPERATIONAL-SIMULATION PO. Absent on legacy
   * seed rows (unknown provenance is never re-labelled as simulation).
   */
  mode?: CommerceMode;
  simulated?: boolean;
  /** §Phase E4 — the canonical catalog product the PO was raised against. */
  originProductId?: string;
  /**
   * §P7 — WHEN the channel's receiving step completed for this PO. Written by
   * the ONE receiving path (`src/lib/commerce/commerceLifecycle.ts →
   * receiveCommercePurchaseOrder`). The receiving STATUS itself is DERIVED from
   * the line quantities (`src/lib/commerce/receivingStatus.ts`), so there is no
   * second copy to drift; this timestamp cannot be derived and is therefore
   * recorded.
   */
  receivedAt?: string;
  /**
   * §P13 / S4 — THE ON-BEHALF REJECTION DRAFT Mercenta produced for this PO, and
   * the brand's approval of it. Produced (idempotently, attributed and audited) at
   * the final notification stage and DERIVED for its content by the rule's owner,
   * so the surface, the record and the writer can never state different windows.
   */
  onBehalfDraft?: PoOnBehalfDraftRecord;
}

/** §Stage-24 — line-item level acknowledgment, not whole-PO toggle. */
export type LineAckStatus = 'unacknowledged' | 'accepted' | 'rejected' | 'backordered';

/** Real Vendor Central rejection reason codes (not free text). */
export const PO_REJECTION_CODES = [
  'TemporarilyUnavailable',
  'InvalidProductIdentifier',
  'ObsoleteProduct',
] as const;
export type PoRejectionCode = (typeof PO_REJECTION_CODES)[number];

export interface PurchaseOrderLineItem {
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  commodityCode: string;
  /**
   * §WAVE 3 — THE RETAIL CHANNEL'S PER-LINE BACKORDER PERMISSION.
   *
   * This is the channel's own field (documented in
   * `docs/AMAZON_VENDOR_TRUTH_VALIDATION_2026-09-20.md` S3/S4 and registered as
   * `AV-010`): a line may be backordered ONLY when the channel positively allows
   * it. It is set from the channel's order data — the demo fixtures declare it
   * explicitly (see `src/data/demoData.ts`), and a real integration would map it
   * from the channel's response.
   *
   * FAIL CLOSED: `true` permits a backorder; `false`, `undefined` and any
   * unknown value do NOT. The gate lives in `src/lib/commerce/backorderGate.ts`
   * and is enforced at the domain boundary
   * (`src/data/api.ts → acknowledgePurchaseOrder`), not only in the UI.
   */
  isBackOrderAllowed?: boolean;
  /** §Stage-24 acknowledgment fields. */
  ackStatus?: LineAckStatus;
  /** Accepted or backordered units — NEVER greater than `quantity`. */
  acknowledgedQty?: number;
  /** Required when ackStatus === 'backordered'. */
  scheduledShipDate?: string;
  /**
   * §30-day backorder restock rule — backordered items lose visibility on the
   * retail channel after 30 days without restock. This field is set at
   * acknowledgment time as scheduledShipDate + 30d.
   */
  backorderRestockDeadline?: string;
  /** Required when ackStatus === 'rejected' — a real code, not free text. */
  rejectionCode?: PoRejectionCode;
  /**
   * §Batch-3 — Full ordered-quantity and acknowledgment-status history per PO line.
   * Each acknowledgment event appends an entry. Never overwritten server-side.
   */
  ackHistory?: AckHistoryEntry[];
  /**
   * §Stage-25 — units the retail channel's receiving system actually logged
   * as received. Populated at delivery-time reconciliation; compared against
   * `acknowledgedQty` to auto-raise shortage deductions.
   */
  receivedQty?: number;
  /**
   * §Batch-3 — Cost-price at acknowledgment time.
   * If the brand acknowledges with a different unit price than what's in the PO,
   * this field is set and a warning is surfaced. Invoicing should use this price.
   */
  acknowledgedUnitPrice?: number;
}

/** §Batch-3 — A single acknowledgment event in the line's history. */
export interface AckHistoryEntry {
  acknowledgedAt: string; // ISO timestamp
  ackStatus: LineAckStatus;
  acknowledgedQty: number;
  rejectionCode?: PoRejectionCode;
  scheduledShipDate?: string;
  /** The unit price acknowledged (may differ from original PO line price). */
  unitPrice: number;
  /**
   * §P13 — how THIS decision met the channel's 24-hour window
   * (`PO_ACK_TIMELINESS` in `src/config/purchaseOrders.ts`): decided inside the
   * window (`on_time`), past the limit where only a rejection is valid (`late`),
   * or the required rejection Mercenta performed on the brand's behalf at the
   * final notification stage (`on_behalf`). Recorded per event so the audit trail
   * shows WHEN each decision was made relative to the rule.
   */
  timeliness?: PoAckTimeliness;
}

/**
 * §P13 / S4 — THE ON-BEHALF REJECTION DRAFT (the record of what was drafted and who approved it).
 *
 * Mercenta OPERATES the retail-channel account and Amazon documents that *"Vendors must reject any purchase
 * order that is on hold past the 24-hour time limit."* When a purchase order reaches the final notification
 * stage without the brand's decision, Mercenta DRAFTS the channel-required rejection and asks the brand to
 * approve it. Nothing executes without that approval.
 *
 * The DRAFT'S CONTENT is never stored: it is derived by the rule's owner
 * (`src/lib/commerce/poAcknowledgementWindow.ts → poOnBehalfRejectionDraft`), so the draft the brand reads and
 * the rejection Mercenta performs cannot state different things. What IS stored is what cannot be derived —
 * the draft's CONTENT ADDRESS (`digest`, which is what an approval approves, and which is therefore how a stale
 * approval is refused), its instants, and its ATTRIBUTION: who produced it and who approved it. The production
 * and the approval each write a canonical audit record (`purchase_order_on_behalf_draft_created` /
 * `purchase_order_on_behalf_rejection_approved`).
 */
export interface PoOnBehalfDraftRecord {
  /** Content-addressed identity of THIS draft: `draft-<poId>-<digest>`. */
  id: string;
  digest: string;
  /** The channel's own documented rejection reason the draft carries — never an invented code. */
  rejectionCode: PoRejectionCode;
  /** The rule the draft states, quoted from its config owner. */
  ruleText: string;
  acknowledgementDeadline: string | null;
  autoRejectAt: string | null;
  /** When Mercenta produced the draft. */
  createdAt: string;
  /** WHO produced it — Mercenta's declared automatic identity. */
  createdBy: string;
  /** WHO approved it (a human), and when. Absent until the brand approves. */
  approvedBy?: string;
  approvedAt?: string;
  /** TRUE when the approval was performed by Mercenta staff as an attributed override. */
  approvedByAdmin?: boolean;
}

/* ── §P4 — THE INSTRUCTION-TO-MERCENTA RECORD (the proxy model's write path) ── */

/**
 * §P4 — WHAT A BRAND MAY INSTRUCT MERCENTA TO DO.
 *
 * A brand NEVER communicates with the retail channel: its decision is an
 * INSTRUCTION to Mercenta, which then performs the channel action through the
 * integration (`.clinerules/mercenta-business-model.md`). The brand's only jobs
 * are accept/reject/backorder → download & print its documents → ship on time;
 * **Mercenta raises the routing/shipment request and files the ASN**.
 *
 * Declared ONCE here and consumed by the store, the Mercenta-side proxy
 * processor and every surface — no component keeps its own copy.
 */
export type ChannelInstructionType =
  /** The brand's per-line accept / reject / backorder decision. */
  | 'po_acknowledgement'
  /**
   * Programme decision 9 — the ASN is AUTOMATIC on acceptance, so the brand
   * intervenes only when its PHYSICAL packing differs from the acknowledged
   * volumes. This is an instruction to Mercenta, never a filing by the brand.
   */
  | 'packing_correction';

export type ChannelInstructionState =
  /** Written by the brand's decision; awaiting Mercenta's channel action. */
  | 'pending_mercenta_action'
  /** Mercenta performed the channel action; the outcome is on the record. */
  | 'actioned'
  /** Mercenta could not complete it (the channel refused) — reason recorded. */
  | 'refused';

export interface ChannelInstructionLine {
  sku: string;
  ackStatus: 'accepted' | 'rejected' | 'backordered';
  /** The channel's ordered quantity — the ceiling an acknowledgement cannot pass. */
  orderedQty: number;
  /** Accepted or backordered units; 0 for a rejected line. */
  acknowledgedQty: number;
  /** Required when `ackStatus === 'backordered'`. */
  scheduledShipDate?: string;
  rejectionCode?: PoRejectionCode;
  unitPrice: number;
}

/** One carton the brand says it actually packed (packing correction only). */
export interface ChannelInstructionCarton {
  sku: string;
  quantity: number;
}

/** How MERCENTA actioned an instruction — every step attributed and honest. */
export interface ChannelInstructionOutcome {
  actionedAt: string;
  /** The channel-side acknowledgement, through the SP-API seam. */
  channelAcknowledgement?: {
    ok: boolean;
    acknowledgementId?: string;
    status?: 'accepted' | 'partially_accepted' | 'rejected';
    /** `mock` means NO live call occurred — recorded, never inferred. */
    mode: 'mock' | 'real';
    error?: string;
  };
  /** The routing / shipment request Mercenta raised. */
  routingRequest?: {
    raised: boolean;
    /** The carrier, or the channel-arranged carrier on a Freight Collect PO. */
    carrier: string;
    /** TRUE when the channel books the carrier (Freight Collect). */
    channelArrangesCarrier: boolean;
    reference: string;
    /**
     * §P6 — the pickup date Mercenta requested when it raised the request.
     *
     * The channel documents that `requestedPickUp` must be "a date at least two
     * business days after the current date" (register `AV-014`), so the date is
     * computed by `src/lib/shipping/collectChain.ts → earliestRequestedPickUp`
     * rather than typed in. It is the date the CHANNEL was asked for; it is not a
     * confirmation that a pickup happened.
     */
    requestedPickUp?: string;
    /**
     * §P12 — the channel's OWN reference for the shipment request
     * (`SubmitShipments`). ABSENT when the request could not be submitted to the
     * channel, and never invented: the local `reference` stays the platform's own
     * label for the request.
     */
    channelShipmentRequestId?: string;
    /** §P12 — the seam's provenance for the request (`mock` = no live call occurred). */
    mode?: 'mock' | 'real';
  };
  /**
   * §P6 — the routing instructions the CHANNEL returned (Freight Collect only).
   *
   * Populated from the channel response (`GetShipmentDetails`), which carries the
   * ARN and the pickup/carrier details and "only returns a response after carrier
   * assignment". It is ABSENT until the channel genuinely returns one, and the
   * collect chain reports `awaiting_channel` while it is — an ARN is never
   * fabricated (`src/lib/shipping/collectChain.ts`).
   */
  routingInstructions?: {
    /** The channel's Amazon Reference Number. */
    arn?: string;
    /** The carrier the channel assigned. */
    carrier?: string;
    /** When the channel assigned it (ISO). */
    assignedAt?: string;
    /** The pickup date the channel acknowledged, when it differs from the request. */
    pickupDate?: string;
    /** `mock` means NO live call occurred — recorded from the seam, never inferred. */
    mode: 'mock' | 'real';
  };
  /** The ASN Mercenta filed (automatic on acceptance). */
  asn?: {
    filed: boolean;
    shipmentId?: string;
    reference?: string;
    note?: string;
    /**
     * §P4 — the shortage-claim deduction the ASN seam raised when the filed
     * quantities were below the acknowledged ones. Recorded so the brand sees the
     * consequence of its own stated packing rather than a silent ledger entry.
     */
    deductionId?: string;
    /**
     * §P12 — the CHANNEL's own reference for the filed ASN
     * (`submitShipmentConfirmations`). Absent when the channel did not accept the
     * confirmation, so "filed locally" and "accepted by the channel" are never
     * conflated.
     */
    channelConfirmationId?: string;
    /** §P12 — the seam's provenance for the channel confirmation. */
    channelMode?: 'mock' | 'real';
  };
  /**
   * §P6 — THE DOCUMENT PACK WAS GENERATED FOR THIS PO (programme decision 9:
   * "on PO acceptance, the ASN/shipment/documents are AUTOMATIC").
   *
   * The pack itself is DERIVED on read from canonical state
   * (`src/lib/documents/poDocumentPack.ts`) — it is deliberately not stored, so
   * there can be no second copy to drift. These fields record only WHEN the
   * automatic generation happened and how complete it was at that moment, which
   * is the evidence the notification and the audit trail reference.
   */
  documentsGeneratedAt?: string;
  /** Applicable documents at generation time. */
  documentCount?: number;
  /** How many of those were ready at generation time. */
  documentsReady?: number;
  /** Present when Mercenta could not complete the action. */
  refusedReason?: string;
}

export interface ChannelInstruction {
  /** Deterministic and idempotent — an instruction can never be duplicated. */
  id: string;
  type: ChannelInstructionType;
  brandId: string;
  purchaseOrderId: string;
  poNumber: string;
  /** Who issued the instruction (the brand's staff id, or an admin on its behalf). */
  issuedBy: string;
  issuedAt: string;
  state: ChannelInstructionState;
  /** The brand's decision, recorded VERBATIM and never re-derived. */
  lines: ChannelInstructionLine[];
  /** Packing correction only — the cartons the brand actually packed. */
  cartons?: ChannelInstructionCarton[];
  note?: string;
  outcome?: ChannelInstructionOutcome;
  mode: CommerceMode;
  simulated: boolean;
}

/** §4 — persisted admin/automation actions. Written on every override. */
export interface AuditLogEntry {
  id: string;
  createdAt: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  brandId?: string | null;
  reason: string;
  metadata?: Record<string, unknown>;
}

/** §6 — shipping margin ledger (extends shipment records). */
export interface ShippingMargin {
  id: string;
  shipmentId: string;
  brandId: string;
  carrier: string;
  /** What the carrier actually charges Mercenta against its corporate account. */
  carrierCostPrice: number; // GBP
  /** The marked-up label price collected from the brand upfront. */
  brandBilledPrice: number; // GBP
  createdAt: string;
}
/* ── §Batch-14 — Amazon UK Fulfilment Centres ────────────────────────── */

/** Admin-editable list of Amazon UK FCs, seed with real codes. */
export const DEFAULT_UK_FC_LIST: AmazonFulfilmentCentre[] = [
  { code: 'LBA1', name: 'Doncaster (LBA1)', city: 'Doncaster', postcode: 'DN4 5FB' },
  { code: 'LBA2', name: 'Doncaster (LBA2)', city: 'Doncaster', postcode: 'DN4 5GE' },
  { code: 'LBA3', name: 'Doncaster (LBA3)', city: 'Doncaster', postcode: 'DN4 5HJ' },
  { code: 'LBA4', name: 'Doncaster (LBA4)', city: 'Doncaster', postcode: 'DN4 5JN' },
  { code: 'LCY1', name: 'London (LCY1)', city: 'London', postcode: 'E16 1FA' },
  { code: 'LCY2', name: 'Tilbury (LCY2)', city: 'Tilbury', postcode: 'RM18 8AA' },
  { code: 'LCY3', name: 'Dartford (LCY3)', city: 'Dartford', postcode: 'DA2 6QR' },
  { code: 'LCY8', name: 'Rochester (LCY8)', city: 'Rochester', postcode: 'ME2 4LU' },
  { code: 'LTN1', name: 'Milton Keynes (LTN1)', city: 'Milton Keynes', postcode: 'MK1 1SH' },
  { code: 'LTN2', name: 'Hemel Hempstead (LTN2)', city: 'Hemel Hempstead', postcode: 'HP2 7BW' },
  { code: 'LTN4', name: 'Dunstable (LTN4)', city: 'Dunstable', postcode: 'LU6 3FE' },
  { code: 'LTN7', name: 'Bedford (LTN7)', city: 'Bedford', postcode: 'MK44 3DA' },
  { code: 'MAN1', name: 'Manchester (MAN1)', city: 'Manchester', postcode: 'M50 2LA' },
  { code: 'MAN2', name: 'Warrington (MAN2)', city: 'Warrington', postcode: 'WA5 3YA' },
  { code: 'MAN3', name: 'Bolton (MAN3)', city: 'Bolton', postcode: 'BL5 1DU' },
  { code: 'MAN4', name: 'Chesterfield (MAN4)', city: 'Chesterfield', postcode: 'S43 3FF' },
  { code: 'MAN8', name: 'St Helens (MAN8)', city: 'St Helens', postcode: 'WA9 5AF' },
  { code: 'BHX2', name: 'Birmingham (BHX2)', city: 'Birmingham', postcode: 'B37 7YR' },
  { code: 'BHX3', name: 'Daventry (BHX3)', city: 'Daventry', postcode: 'NN11 8FG' },
  { code: 'BHX4', name: 'Coalville (BHX4)', city: 'Coalville', postcode: 'LE67 3FJ' },
  { code: 'EDI4', name: 'Dunfermline (EDI4)', city: 'Dunfermline', postcode: 'KY11 8UR' },
  { code: 'CWL1', name: 'Swansea (CWL1)', city: 'Swansea', postcode: 'SA6 8QH' },
];

export interface AmazonFulfilmentCentre {
  code: string;
  name: string;
  city: string;
  postcode: string;
}

/* ── §Batch-14 — Shipping cost estimate calculator ──────────────────── */

export interface ShippingEstimateInput {
  carrier: CarrierId;
  /** Total carton weight in kg. */
  totalWeightKg: number;
  /** Total volume in cubic metres. */
  totalCbm: number;
  /** Number of cartons. */
  cartonCount: number;
  /** Whether this is palletised freight (Palletline-specific). */
  palletised?: boolean;
  /** Number of pallets (for Palletline). */
  palletCount?: number;
}

/* ── §Batch-13 — Helpdesk / Ticketing ───────────────────────────────── */

export type TicketStatus = 'open' | 'pending' | 'resolved';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketSource = 'live_chat' | 'email' | 'phone' | 'in_app';

/**
 * §Canonical model §15 — a brand case is NOT sent straight to Amazon. It is
 * reviewed by Mercenta Admin first; only an approved, corrected case may be
 * escalated to the provider.
 */
export type CaseEscalationState =
  | 'brand_submitted'          // brand opened the case — awaiting Mercenta review
  | 'under_mercenta_review'    // Mercenta Admin is reviewing / correcting it
  | 'awaiting_brand_info'      // Admin requested more information from the brand
  | 'approved_for_escalation'  // reviewed and correct — may be escalated
  | 'escalated_to_provider'    // submitted to Amazon; awaiting its response
  | 'provider_responded'       // Amazon has responded
  | 'resolved'                 // Mercenta resolved it
  | 'closed';                  // rejected / no further action

export type CaseAdminDecision = 'approve_escalation' | 'request_info' | 'reject';

/** What a case is about — drives linking + admin routing. */
export type CaseCategory =
  | 'po_question'
  | 'shipment_issue'
  | 'delivery_issue'
  | 'deduction'
  | 'payment_issue'
  | 'compliance_question'
  | 'catalogue_issue'
  | 'amazon_related'
  | 'general';

export interface Ticket {
  id: string;
  brandId: string;
  /** The conversation thread (messages on this ticket). */
  messageIds: string[];
  /** Latest message preview for queue display. */
  lastMessagePreview: string;
  lastMessageAt: string;
  /** Escalation/status tracking. */
  status: TicketStatus;
  priority: TicketPriority;
  /** Staff member assigned to handle this ticket. */
  assignedToStaffId?: string;
  /** How the ticket was created. */
  source: TicketSource;
  subject: string;
  /** ISO timestamp of when the ticket was opened. */
  createdAt: string;
  /** SLA target resolution timestamp. */
  slaDeadline?: string;
  /** Whether the ticket has been seen by staff since last brand message. */
  seenByStaff: boolean;
  /** For live chat: whether the brand user is currently online. */
  brandOnline?: boolean;
  /** Category/tag for routing. */
  category?: string;

  /* ── §Canonical model §15 — canonical brand CASE fields (additive) ────── */

  /** Human-readable case reference, e.g. "MC-0007". */
  caseRef?: string;
  /** Strongly-typed case category (falls back to the legacy `category`). */
  caseCategory?: CaseCategory;
  /** Where the case is in the Mercenta-review → escalation workflow. */
  escalationState?: CaseEscalationState;
  /** Related operational records — the case's real consequences. */
  relatedPoNumber?: string;
  relatedShipmentId?: string;
  relatedDeductionId?: string;
  relatedPaymentId?: string;
  relatedComplianceDocId?: string;
  /** Mercenta Admin owner (distinct from the general assigned staff). */
  adminOwnerStaffId?: string;
  /** Mercenta's review decision (recorded, never silently overwritten). */
  adminReview?: {
    reviewedByStaffId: string;
    reviewedAt: string;
    decision: CaseAdminDecision;
    note?: string;
  };
  /** The provider (Amazon) case, once escalated. Idempotency key is retained. */
  amazonCase?: {
    referenceId: string;
    openedAt: string;
    mode: 'simulation' | 'live';
    simulated: boolean;
    /** The idempotency key used — a retry reuses the same provider case. */
    requestKey: string;
  };
  /** The provider's response (recorded verbatim for the brand to see). */
  providerResponse?: {
    respondedAt: string;
    outcome: 'accepted' | 'rejected' | 'info_required' | 'closed';
    response: string;
  };
  /** Mercenta's resolution. */
  resolution?: {
    resolvedByStaffId: string;
    resolvedAt: string;
    note: string;
  };
  /** Last mutation timestamp. */
  updatedAt?: string;
}

export interface HelpdeskMetrics {
  openCount: number;
  pendingCount: number;
  resolvedToday: number;
  overdueSla: number;
  avgResolutionTimeMinutes: number;
  unassignedCount: number;
}

/* ── §Batch-18 — Bank financing partners per region ───────────────── */

export type FinancingPartnerType = 'invoice_finance' | 'trade_finance' | 'development_finance' | 'venture_debt';

export interface FinancingPartner {
  id: string;
  /** Partner name for display. */
  name: string;
  /** Region this partner serves. */
  region: BrandRegion | 'global';
  /** Type of financing offered. */
  type: FinancingPartnerType;
  /** Advance rate (e.g. 0.85 = 85% advance against invoice). */
  advanceRate: number;
  /** Typical APR / fee range as display string. */
  feeRange: string;
  /** Typical turnaround time for funding. */
  turnaroundDays: string;
  /** Minimum invoice / PO value. */
  minDealSize: string;
  /** Maximum deal size. */
  maxDealSize: string;
  /** Whether this partner is a demo/mock partner. */
  isMock: boolean;
  /** Description for the onboarding display. */
  description: string;
  /** Website URL. */
  website?: string;
  /** Whether the partner is currently active. */
  active: boolean;
}

export const DEMO_FINANCING_PARTNERS: FinancingPartner[] = [
  {
    id: 'fin-uk-marketinvoice',
    name: 'MarketInvoice',
    region: 'europe',
    type: 'invoice_finance',
    advanceRate: 0.85,
    feeRange: '1.5% – 4.5% per 30 days',
    turnaroundDays: '24–48 hours',
    minDealSize: '£5,000',
    maxDealSize: '£2,000,000',
    isMock: true,
    description: 'UK-based invoice and PO finance provider. Funds against confirmed purchase orders with 85% advance within 48 hours.',
    website: 'https://www.marketinvoice.com',
    active: true,
  },
  {
    id: 'fin-uk-optimum',
    name: 'Optimum Finance',
    region: 'europe',
    type: 'invoice_finance',
    advanceRate: 0.85,
    feeRange: '1.8% – 5.0% per 30 days',
    turnaroundDays: '24–72 hours',
    minDealSize: '£10,000',
    maxDealSize: '£1,500,000',
    isMock: true,
    description: 'SME-focused invoice finance for UK businesses. Flexible facility that grows with your PO volume.',
    website: 'https://www.optimumfinance.co.uk',
    active: true,
  },
  {
    id: 'fin-uk-time',
    name: 'Time Finance',
    region: 'europe',
    type: 'invoice_finance',
    advanceRate: 0.85,
    feeRange: '1.5% – 4.0% per 30 days',
    turnaroundDays: '24–48 hours',
    minDealSize: '£5,000',
    maxDealSize: '£1,000,000',
    isMock: true,
    description: 'UK alternative finance provider offering invoice discounting and PO finance for growing businesses.',
    website: 'https://www.timefinance.com',
    active: true,
  },
  {
    id: 'fin-us-behalf',
    name: 'Behalf (US)',
    region: 'north_america',
    type: 'trade_finance',
    advanceRate: 0.90,
    feeRange: '2.0% – 6.0% per 30 days',
    turnaroundDays: '24–48 hours',
    minDealSize: '$5,000',
    maxDealSize: '$500,000',
    isMock: true,
    description: 'US-based trade finance provider. Funds B2B purchases with net-30/60/90 terms, 90% advance against PO.',
    website: 'https://www.behalf.com',
    active: true,
  },
  {
    id: 'fin-us-triumph',
    name: 'Triumph Business Capital',
    region: 'north_america',
    type: 'invoice_finance',
    advanceRate: 0.90,
    feeRange: '1.5% – 5.0% per 30 days',
    turnaroundDays: '24–48 hours',
    minDealSize: '$10,000',
    maxDealSize: '$5,000,000',
    isMock: true,
    description: 'US invoice factoring and PO finance provider. Specialises in cross-border trade finance for importers.',
    website: 'https://www.triumphbc.com',
    active: true,
  },
  {
    id: 'fin-eu-iwoca',
    name: 'iwoca',
    region: 'europe',
    type: 'trade_finance',
    advanceRate: 0.80,
    feeRange: '1.2% – 4.0% per 30 days',
    turnaroundDays: '24–48 hours',
    minDealSize: '€5,000',
    maxDealSize: '€500,000',
    isMock: true,
    description: 'European trade finance platform. Revenue-based financing available in multiple EU currencies.',
    website: 'https://www.iwoca.co.uk',
    active: true,
  },
  {
    id: 'fin-africa-bii',
    name: 'British International Investment',
    region: 'africa',
    type: 'development_finance',
    advanceRate: 0.70,
    feeRange: '3.0% – 8.0% per annum',
    turnaroundDays: '4–8 weeks',
    minDealSize: '£250,000',
    maxDealSize: '£10,000,000',
    isMock: true,
    description: 'The UK government\'s development finance institution. Mandated to finance UK-Africa trade — a strong fit for DCTS-tariff-sourced products from African partners.',
    website: 'https://www.bii.co.uk',
    active: true,
  },
];

export function getFinancingPartnerForRegion(region: BrandRegion): FinancingPartner[] {
  return DEMO_FINANCING_PARTNERS.filter((p) => p.region === region && p.active);
}

export function getFinancingPartnerById(id: string): FinancingPartner | undefined {
  return DEMO_FINANCING_PARTNERS.find((p) => p.id === id);
}
/* ── §Batch-12 — Brand onboarding tour / checklist ─────────────────── */
/** §Functional-completion — Knowledge Base article link shown on a tour step. */
export interface KBArticle {
  id: string;
  title: string;
  summary: string;
  sections: { heading: string; body: string }[];
}

export const TOUR_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Mercenta Partners',
    description: 'This quick tour will show you around the brand portal. You can revisit this guide anytime from the Help menu.',
    targetSelector: '[data-tour="brand-dashboard"]',
    position: 'bottom' as const,
    action: 'next' as const,
  },
  {
    id: 'dashboard',
    title: 'Your Dashboard',
    description: 'Your dashboard shows your revenue, active shipments, compliance score, and any deductions at a glance.',
    targetSelector: '[data-tour="brand-dashboard"]',
    position: 'bottom' as const,
    action: 'next' as const,
  },
  {
    id: 'purchase_orders',
    title: 'Purchase Orders',
    // §P13 / S8 — REPOINTED (old contract recorded): this step used to read
    // *"Review and accept/reject POs here. Remember: rejection affects your vendor
    // performance — read the guidance in Settings > Operational Guidance."* — an
    // unsupported consequence claim (AV-003). `src/types.ts` may NOT import the rule's
    // config owner (the config imports THESE types), so this legacy constant points at
    // the owner instead of re-typing it; the live tours render the owner's own
    // statement (`src/config/tours/tourDefinitions.ts`).
    description: 'Review and accept or reject POs here. The channel\'s acknowledgement rule is stated in full, from its single owner, in Settings > Operational Guidance.',
    targetSelector: '[data-tour="nav-purchase_orders"]',
    position: 'right' as const,
    action: 'next' as const,
  },
  {
    id: 'catalog',
    title: 'Product Catalog',
    description: 'Upload and manage your products. Your first product submission requires compliance gate approval — see the compliance section for details.',
    targetSelector: '[data-tour="nav-catalog"]',
    position: 'right' as const,
    action: 'next' as const,
  },
  {
    id: 'logistics',
    title: 'Logistics Hub',
    description: 'Track shipments from your factory to the UK retail fulfilment network. Use DHL for parcel freight and Palletline for palletised loads.',
    targetSelector: '[data-tour="nav-logistics"]',
    position: 'right' as const,
    action: 'next' as const,
  },
  {
    id: 'compliance',
    title: 'UK Compliance',
    description: 'Submit required compliance documents. The compliance gate must be cleared before you can submit products to the retail channel.',
    targetSelector: '[data-tour="nav-compliance"]',
    position: 'right' as const,
    action: 'next' as const,
  },
  {
    id: 'settings',
    title: 'Settings & Guidance',
    description: 'Manage your bank info, team permissions, PO outages, return addresses, and notification preferences. The Operational Guidance section explains Net PPM, packaging standards, and PO rejection consequences.',
    targetSelector: '[data-tour="nav-settings"]',
    position: 'right' as const,
    action: 'finish' as const,
  },
];

export interface TourProgress {
  /** Which tour steps have been completed (by id). */
  completedSteps: string[];
  /** Whether the full onboarding tour has been dismissed. */
  tourDismissed: boolean;
  /** Checklist items completed (by id). */
  checklistCompleted: string[];
  /** IDs of tours that have been fully completed. */
  toursCompleted: string[];
  /** IDs of tours that have been skipped. */
  toursSkipped: string[];
  /** The currently active tour ID, if any. */
  currentTourId: string | null;
  /** Per-tour completed step IDs. */
  tourStepsCompleted: Record<string, string[]>;
}

export const DEFAULT_TOUR_PROGRESS: TourProgress = {
  completedSteps: [],
  tourDismissed: false,
  checklistCompleted: [],
  toursCompleted: [],
  toursSkipped: [],
  currentTourId: null,
  tourStepsCompleted: {},
};

export const CHECKLIST_ITEMS = [
  { id: 'first_product', label: 'Add your first product', hint: 'Upload a product to the catalog' },
  { id: 'first_po', label: 'Acknowledge your first PO', hint: 'Accept or reject a purchase order' },
  { id: 'first_shipment', label: 'Ship your first accepted PO', hint: 'Mercenta files the ASN — your part is to ship on time' },
  { id: 'compliance_cleared', label: 'Clear compliance gate', hint: 'Submit all required documents' },
  { id: 'guidance_read', label: 'Review operational guidance', hint: 'Understand Net PPM, packaging, and PO rejection impact' },
];

export type TourStepId = (typeof TOUR_STEPS)[number]['id'];
export type ChecklistItemId = (typeof CHECKLIST_ITEMS)[number]['id'];
export interface ShippingEstimate {
  /** Estimated base carrier cost (before Mercenta markup). */
  baseCarrierCost: number;
  /** Mercenta markup applied (GBP or percentage). */
  markupApplied: number;
  /** Total price shown to brand. */
  brandPrice: number;
  /** Currency. */
  currency: 'GBP';
  /** Carrier used for this estimate. */
  carrier: string;
  /** Indicates if mock rates were used. */
  mockRate: boolean;
}

/** §Batch-14 — Per-carrier markup config (admin-settable, global with per-carrier override). */
export interface CarrierMarkupConfig {
  /** Unique id. */
  id: string;
  /** Carrier this applies to ('global' = default for all). */
  carrier: CarrierId | 'global';
  /** Markup type. */
  markupType: 'percentage' | 'fixed';
  /** The markup value: 0.05 = 5% for percentage, or GBP amount for fixed. */
  markupValue: number;
  /** Whether this config is active. */
  active: boolean;
  /** Label for admin UI. */
  label: string;
}

/* ── §Canonical model §11/§12 — shipping lane routing + commercial model ── */

/** Whether a shipment moves internationally or within the UK. */
export type ShippingLane = 'international' | 'uk_domestic';

/** The canonical carrier decision for a shipment (rule-driven, auditable). */
export interface CarrierRouteDecision {
  lane: ShippingLane;
  /** The Mercenta carrier account that operates this lane. */
  carrier: CarrierId;
  /** Why this carrier was chosen (human-readable, auditable). */
  reason: string;
}

/**
 * §12 — the full shipping commercial breakdown. Both sides of the transaction
 * are preserved: what Mercenta pays the carrier AND what the brand is charged.
 */
export interface ShippingCommercialBreakdown {
  carrier: CarrierId;
  lane: ShippingLane;
  /** Carrier list cost before Mercenta's negotiated discount. */
  carrierListCost: number;
  /** Negotiated discount fraction Mercenta has with the carrier. */
  negotiatedDiscountPct: number;
  /** The negotiated discount value. */
  negotiatedDiscountAmount: number;
  /** What Mercenta ACTUALLY pays the carrier (list − discount). */
  carrierInvoiceCost: number;
  /** Mercenta mark-up applied to the carrier invoice cost. */
  markUpAmount: number;
  /** Fuel/surcharge applied. */
  surchargeAmount: number;
  /** Fixed handling fee. */
  handlingFee: number;
  /** Amount charged to the brand, excluding VAT. */
  brandAmountCharged: number;
  /** VAT treatment actually applied (never silently assumed). */
  vatTreatment: 'standard' | 'zero_rated' | 'exempt' | 'not_applicable';
  vatRate: number;
  /** VAT charged to the brand on the shipping sale (output VAT). */
  vatAmount: number;
  /** VAT Mercenta can reclaim on the carrier invoice (input VAT). */
  inputVatRecoverable: number;
  /** Net VAT Mercenta owes HMRC (output − input). */
  vatPayableToHmrc: number;
  /** Total the brand pays (brandAmountCharged + VAT). */
  brandAmountChargedIncVat: number;
  /** Gross shipping margin = brand charge (ex-VAT) − carrier invoice cost. */
  grossShippingMargin: number;
  /** Margin retained after VAT payable to HMRC. */
  netMercentaRevenue: number;
  currency: 'GBP';
  /** True while the underlying carrier cost comes from the mock rate card. */
  mockRate: boolean;
  /** True while the commercial terms are placeholders pending sign-off. */
  placeholderTerms: boolean;
}

/* ── §Stage-25 — Brand CRM depth (timeline / tasks / notes / segmentation) ── */

export const CRM_LIFECYCLE_STAGES = [
  'lead',
  'onboarding',
  'active',
  'at_risk',
  'churned',
] as const;
export type CrmLifecycleStage = (typeof CRM_LIFECYCLE_STAGES)[number];

export const CRM_LIFECYCLE_LABELS: Record<CrmLifecycleStage, string> = {
  lead: 'Lead',
  onboarding: 'Onboarding',
  active: 'Active',
  at_risk: 'At Risk',
  churned: 'Churned',
};

/** Assignable follow-up task tied to a brand record. */
export interface CrmTask {
  id: string;
  brandId: string;
  title: string;
  dueDate: string; // ISO date
  assignedToStaffId: string;
  status: 'open' | 'done';
  createdAt: string;
  createdByStaffId: string;
}

/** Free-text internal note, timestamped and attributed to the author. */
export interface CrmNote {
  id: string;
  brandId: string;
  body: string;
  authorStaffId: string;
  createdAt: string;
}

/**
 * Admin-definable relationship metadata per brand — tags/segmentation,
 * lifecycle stage and the staff member who owns this brand relationship.
 * Distinct from fulfillment track (an operational routing concept).
 */
export interface BrandCrmMeta {
  brandId: string;
  tags: string[];
  lifecycleStage: CrmLifecycleStage;
  accountOwnerStaffId: string | null;
}

/* ── §Stage-25 — staff RBAC tiers ─────────────────────────────────────────── */

export type StaffPermissionTier = 'full' | 'view_only';

export const STAFF_TIER_CAPABILITIES: Record<
  StaffPermissionTier,
  { label: string; canMutate: boolean }
> = {
  full: { label: 'Full admin', canMutate: true },
  view_only: { label: 'View-only ops', canMutate: false },
};

/* ── §Stage-25 — brand self-service profile/banking change requests ──────── */

export type ProfileChangeField = 'businessName' | 'email' | 'phone' | 'signatory' | 'iban' | 'bic';

export interface ProfileChangeRequest {
  id: string;
  brandId: string;
  field: ProfileChangeField;
  currentValue: string;
  requestedValue: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  reviewedByStaffId?: string;
  reviewedAt?: string;
  reviewNote?: string;
}


/* ── §Batch-2 — Brand Settings suite types ─────────────────────────── */

/** Bank Information — payout account for Stripe Connect transfers. */
export interface BrandBankInfo {
  id: string;
  brandId: string;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  sortCode: string;
  iban?: string;
  bic?: string;
  currency: string;
  /** Changes require admin approval before taking effect. */
  status: 'current' | 'pending_approval';
  requestedChange?: {
    field: keyof BrandBankInfo;
    currentValue: string;
    requestedValue: string;
    reason: string;
    requestedAt: string;
  };
}

/** Brand-side multi-user permission roles. §Batch-29 — Role presets with enforced nav-item visibility. */
export type BrandPermissionRole = 'Owner' | 'Shipping' | 'Accounts' | 'Compliance';

/** §Batch-29 — Role preset with human-readable label and description. */
export interface BrandRolePreset {
  role: BrandPermissionRole;
  label: string;
  description: string;
  allowedViews: string[];
}

export const BRAND_ROLE_PRESETS: BrandRolePreset[] = [
  {
    role: 'Owner',
    label: 'Owner',
    description: 'Full access to everything, plus invite/manage team members.',
    allowedViews: ['overview', 'onboarding', 'contracts', 'purchase_orders', 'catalog',
      'logistics', 'compliance', 'analytics', 'documents', 'returns', 'reports',
      'settings', 'team'],
  },
  {
    role: 'Shipping',
    label: 'Shipping',
    description: 'Purchase Orders, Logistics Hub, Returns only.',
    allowedViews: ['overview', 'purchase_orders', 'logistics', 'returns', 'settings'],
  },
  {
    role: 'Accounts',
    label: 'Accounts/Finance',
    description: 'Contracts, Reports, Documents & Account, Settings (Bank Information only).',
    allowedViews: ['overview', 'contracts', 'reports', 'documents', 'settings'],
  },
  {
    role: 'Compliance',
    label: 'Compliance',
    description: 'Onboarding & Legal, UK Compliance, Contracts only.',
    allowedViews: ['overview', 'onboarding', 'compliance', 'contracts'],
  },
];

export interface BrandTeamMember {
  id: string;
  brandId: string;
  name: string;
  email: string;
  role: BrandPermissionRole;
  active: boolean;
  invitedAt: string;
}

/** Purchase Order Outage — brand declares they can't fulfil POs. */
export interface BrandPoOutage {
  id: string;
  brandId: string;
  startDate: string; // ISO date
  endDate: string;   // ISO date
  reason: string;
  /** Suppressed/flag PO-routing during this window. */
  status: 'active' | 'expired' | 'cancelled';
  createdAt: string;
  /** Admin note if outage prompted a real Vendor Central PO submission. */
  adminNote?: string;
}

/** Return address for routing customer returns. */
export interface BrandReturnAddress {
  id: string;
  brandId: string;
  label: string; // e.g. "UK Returns — Standard"
  companyName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postalCode: string;
  country: string;
  contactName: string;
  contactPhone: string;
  /** True = used as default return address. */
  isDefault: boolean;
}

/** Notification preference — channel + event type subscription. */
export type NotificationEventType =
  | 'po_received'
  | 'po_acknowledgment_deadline'
  | 'shipment_departed'
  | 'shipment_delivered'
  | 'compliance_doc_approved'
  | 'compliance_doc_rejected'
  | 'deduction_raised'
  | 'contract_renewal'
  | 'outage_about_to_start'
  | 'return_authorized';

export type NotificationChannel = 'email' | 'in_app' | 'sms';

export interface NotificationPreference {
  id: string;
  brandId: string;
  eventType: NotificationEventType;
  channels: NotificationChannel[];
  enabled: boolean;
}

/* ── §Batch-16 — Warehousing partner for returns handling ──────────── */

export interface WarehousingPartner {
  id: string;
  name: string;
  /** UK-registered address of the warehouse. */
  address: string;
  city: string;
  postcode: string;
  /** Contact name for returns coordination. */
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  /** Whether this partner is actively used for returns. */
  active: boolean;
  /** Whether this is a mock partner for demo. */
  isMock: boolean;
  /** Services offered. */
  services: string[];
  /** Notes about this partner's capabilities. */
  notes: string;
}

export const DEMO_WAREHOUSE_PARTNER: WarehousingPartner = {
  id: 'wh-001',
  name: 'UK Returns Hub (Mercenta Designated)',
  address: 'Unit 12, Phoenix Distribution Centre, Rugby',
  city: 'Rugby',
  postcode: 'CV23 0WE',
  contactName: 'Returns Team',
  contactEmail: 'returns@mercenta.co.uk',
  contactPhone: '+44 7700 900999',
  active: true,
  isMock: true,
  services: ['Returns receipt & inspection', 'Quality check logging', 'Repack & forward to brand', 'Disposal processing'],
  notes: 'Mock partner until a real UK 3PL/returns-handling provider is contracted. This is Mercenta\'s registered return address on the retail account.',
};

export type ReturnTrackingStatus = 'received_at_warehouse' | 'quality_checked' | 'forwarded_to_brand' | 'confirmed_by_brand';

export interface ReturnTrackingEntry {
  id: string;
  returnId: string;
  brandId: string;
  /** When the warehouse received the goods. */
  receivedAtWarehouse: string; // ISO date
  /** Carrier + tracking number for the inbound leg. */
  inboundCarrier: string;
  inboundTrackingNumber: string;
  /** Condition noted on receipt. */
  conditionOnReceipt: string;
  /** Whether quality inspection passed. */
  qualityCheckPassed: boolean;
  qualityCheckNotes?: string;
  qualityCheckedAt?: string;
  /** When forwarded back to the brand. */
  forwardedToBrandAt?: string;
  forwardedCarrier?: string;
  forwardedTrackingNumber?: string;
  /** Forwarded to which brand return address. */
  forwardedToAddressId?: string;
  /** When the brand confirmed receipt. */
  confirmedByBrandAt?: string;
  /** Current status in the return flow. */
  status: ReturnTrackingStatus;
  /** Any deductions linked to this return. */
  linkedDeductionId?: string;
}
export type AlertSeverity = 'critical' | 'high' | 'info';

export interface TriageResult {
  severity: AlertSeverity;
  summary: string;
  fixSuggestion: string | null;
  actionable: boolean;
  source: 'mock' | 'openrouter';
}

/* ── §Legal — Brand agreement acceptances ────────────────────────────── */

export type BrandAgreementType = 'logistics_sla' | 'chargeback_indemnity';

export const AGREEMENT_VERSIONS: Record<BrandAgreementType, string> = {
  logistics_sla: '1.0',
  chargeback_indemnity: '1.0',
};

export const AGREEMENT_LABELS: Record<BrandAgreementType, string> = {
  logistics_sla: 'Logistics SLAs & Carrier Alignment',
  chargeback_indemnity: 'Automated Chargeback Remediation & Financial Indemnity',
};

export interface BrandAgreement {
  id: string;
  brandId: string;
  agreementType: BrandAgreementType;
  acceptedAt: string; // ISO timestamp
  version: string;
}

export type ReturnReason =
  | 'defective'
  | 'damaged_in_transit'
  | 'wrong_item'
  | 'quality_issue'
  | 'customer_return'
  | 'compliance_issue';

export interface BrandReturn {
  id: string;
  brandId: string;
  poNumber: string;
  productSku: string;
  productName: string;
  quantity: number;
  reason: ReturnReason;
  /** Detailed description of the return event. */
  description: string;
  returnDate: string; // ISO date
  /** When a return indicates a quality/compliance issue, a deduction is raised. */
  linkedDeductionId?: string;
}

/* ── §Batch-2 — Reports metrics (derived from PO/catalog/shipment data) ── */

export interface BrandReportMetrics {
  asinConfirmationRate: number;   // percentage
  sourceableProductOutOfStock: number; // SKU count
  openPOQuantity: number;
  onHandInventory: number;
  netPPM: number;                 // Net Profit Per Mille (per 1000 units)
  salesTrend: { month: string; value: number }[];
  dispatchTrend: { month: string; units: number }[];
}
/* ── §Batch-4 — Pagination types ─────────────────────────────────── */

/** Unified pagination parameters for Supabase range-based queries. */
export interface PaginationParams {
  /** Zero-based page number (default 0). */
  page?: number;
  /** Items per page (default 50, max 500). */
  pageSize?: number;
  /** Column to order by (default 'created_at'). */
  orderBy?: string;
  /** Sort direction. */
  orderDir?: 'asc' | 'desc';
}

/** Standard paginated response wrapper. */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  source: import('@/data/api').DataSource;
}

/** Convenience type for list queries that support pagination filtering. */
export interface PaginatedQueryConfig {
  brandId?: string;
  status?: string;
  search?: string;
  pagination?: PaginationParams;
}

/* ── §Batch-7 — Verified Alibaba Manufacturer Sourcing types ──────── */

/** A supplier profile extracted from Alibaba's public listing page. */
export interface ManufacturerProfile {
  /** Unique identifier for this supplier record. */
  id: string;
  companyName: string;
  /** Country where the manufacturer is based. */
  country: string;
  /** Primary product category. */
  category: string;
  /** Years in business on Alibaba. */
  yearsInBusiness: number;
  /** Has Trade Assurance badge. */
  tradeAssurance: boolean;
  /** Has verified-supplier status. */
  verifiedSupplier: boolean;
  /** Assessed capacity (products per month, if available). */
  capacity?: string;
  /** Response rate percentage (from Alibaba's stats). */
  responseRate?: number;
  /** Quality score / rating out of 5. */
  rating?: number;
  /** Number of product listings. */
  productCount: number;
  /** Whether the supplier exports to UK/Europe. */
  exportsToUk: boolean;
  /** Source URL where the data was fetched. */
  sourceUrl: string;
  /** Key product categories they specialize in. */
  specializations: string[];
  /** Minimum order quantity typical for this supplier. */
  moq?: string;
  /** Estimated price range for typical products. */
  priceRange?: string;
}

export interface ManufacturerSourcingReport {
  generatedAt: string;
  /** Total suppliers scanned. */
  scannedCount: number;
  /** Qualified suppliers sorted by score. */
  suppliers: ManufacturerProfile[];
  /** Top qualified suppliers. */
  topSuppliers: ManufacturerProfile[];
  /** Data source mode. */
  source: 'mock' | 'alibaba_public';
  /** Source label. */
  sourceLabel: string;
  /** The search category/query used. */
  searchQuery: string;
}
/* ── §Batch-9 — Grants & Investors types ─────────────────────────── */

export type GrantStatus = 'open' | 'closing_soon' | 'closed';
export type GrantCategory = 'innovation' | 'export' | 'sustainability' | 'r_and_d' | 'scale_up' | 'regional';

export interface GrantOpportunity {
  id: string;
  title: string;
  provider: string;
  category: GrantCategory;
  status: GrantStatus;
  /** Funding amount range (e.g. "£25,000 - £500,000"). */
  amountRange: string;
  /** Eligibility description. */
  eligibility: string;
  /** Application deadline ISO date. */
  deadline: string;
  /** URL to the official grant page. */
  sourceUrl: string;
  /** Summary of why this fits Mercenta. */
  fitReason: string;
  /** OpenRouter-generated fit score (0-100). */
  fitScore: number;
  /** Whether a draft application has been started. */
  draftStarted: boolean;
  /** Whether the application has been submitted. */
  submitted: boolean;
}

export type InvestorType = 'venture_capital' | 'angel' | 'accelerator' | 'government_fund' | 'corporate_venture';

export interface InvestorOpportunity {
  id: string;
  name: string;
  type: InvestorType;
  /** Focus sectors / industries. */
  sectors: string[];
  /** Typical investment range (e.g. "£500k - £5M"). */
  investmentRange: string;
  /** Stage they invest in. */
  stage: 'pre_seed' | 'seed' | 'series_a' | 'series_b' | 'growth';
  /** Whether they invest in UK companies. */
  ukFocused: boolean;
  /** URL to the investor profile / website. */
  sourceUrl: string;
  /** Summary of why this fits Mercenta. */
  fitReason: string;
  /** OpenRouter-generated fit score (0-100). */
  fitScore: number;
  /** Whether outreach has been drafted. */
  draftStarted: boolean;
  /** Whether outreach has been sent. */
  contacted: boolean;
}

/**
 * §31/M13c — the FOUNDER's own record that an EXTERNAL submission really
 * happened. Only ever created by the founder recording one themselves; Mercenta
 * never submits to a grant provider on the founder's behalf.
 */
export interface GrantSubmissionRecord {
  /** The reference/confirmation the founder supplies. Never generated here. */
  reference: string;
  submittedAt: string;
  recordedBy: string;
}

export interface GrantApplicationDraft {
  grantId: string;
  grantTitle: string;
  /** The AI-generated application content. */
  content: string;
  /**
   * INTERNAL state ONLY. `approved_internally` means the founder approved this
   * draft inside Mercenta — it never means an external submission happened. The
   * legacy `submitted` value was removed because it could be read as an
   * external event that never occurred.
   */
  status: 'draft' | 'approved_internally';
  createdAt: string;
  /** When the founder recorded the INTERNAL approval. Not a submission event. */
  approvedAt?: string;
  /** Who recorded the internal approval (an approval always names its owner). */
  approvedBy?: string;
  /**
   * `null`/absent until the FOUNDER records a real external submission with
   * their own reference. Never set by approval.
   */
  submission?: GrantSubmissionRecord | null;
}

/**
 * §31/M13c — the founder's own record that an EXTERNAL outreach send really
 * happened (see `GrantSubmissionRecord`).
 */
export interface InvestorSubmissionRecord {
  /** The confirmation/reference the founder supplies. Never generated here. */
  reference: string;
  sentAt: string;
  recordedBy: string;
}

export interface InvestorOutreachDraft {
  investorId: string;
  investorName: string;
  /** The AI-generated outreach email content. */
  content: string;
  /**
   * INTERNAL state ONLY — see `GrantApplicationDraft.status`. The legacy `sent`
   * value was removed because it could be read as an external event that never
   * occurred.
   */
  status: 'draft' | 'approved_internally';
  createdAt: string;
  /** When the founder recorded the INTERNAL approval. Not a send event. */
  approvedAt?: string;
  /** Who recorded the internal approval (an approval always names its owner). */
  approvedBy?: string;
  /** `null`/absent until the FOUNDER records a real external send themselves. */
  submission?: InvestorSubmissionRecord | null;
}

export interface GrantsInvestorsReport {
  generatedAt: string;
  grants: GrantOpportunity[];
  investors: InvestorOpportunity[];
  grantsDrafts: GrantApplicationDraft[];
  investorDrafts: InvestorOutreachDraft[];
  source: 'mock' | 'live';
  sourceLabel: string;
}

/** A product surfaced by Keepa (or equivalent UK marketplace data provider). */
export interface KeepaProduct {
  /** ASIN / product identifier. */
  asin: string;
  title: string;
  /** Keepa category node (mapped to APPROVED_CATEGORIES). */
  category: string;
  /** Current buy-box price in GBP. */
  currentPrice: number;
  /** Sales rank in the category (lower = better). */
  salesRank: number;
  /** Number of reviews. */
  reviewCount: number;
  /** Average rating out of 5. */
  averageRating: number;
  /** Brand name on the listing. */
  brandName: string;
  /** Whether the product is fulfilled by Amazon (FBA). */
  isFba: boolean;
}

/** §Batch-6 — Acceptance-probability heuristic score factors.
 * This is an INTERNAL heuristic defined by Mercenta, not a real prediction
 * from Amazon or any external party. */
export interface AcceptanceScoreFactors {
  /** Fits an approved category (0-25). */
  categoryFit: number;
  /** No restricted/prohibited flags (0-25). */
  complianceFit: number;
  /** Price point viable for wholesale model (0-25). */
  marginFit: number;
  /** No obvious trademark/IP conflict (0-25). */
  ipConflictFree: number;
}

export interface ProductGap {
  /** The ASIN / product identifier from Keepa. */
  asin: string;
  productTitle: string;
  category: string;
  /** Current retail price in GBP. */
  currentPrice: number;
  /** Sales rank. */
  salesRank: number;
  /** Estimated monthly sales volume (derived from rank). */
  estimatedMonthlySales: number;
  /** Whether this product matches something in Mercenta's catalog. */
  alreadyListed: boolean;
  /** If alreadyListed, the brand name that lists it. */
  listedByBrand?: string;
  /** Fits an approved category. */
  categoryApproved: boolean;
  /** Internal acceptance-probability heuristic score 0-100. */
  acceptanceScore: number;
  /** Breakdown of the acceptance score. */
  acceptanceFactors: AcceptanceScoreFactors;
  /** Candidate brands from the discovery engine that could source this. */
  candidateBrands: { name: string; country: string; fitScore: number }[];
  /** Reasoning text for the daily report. */
  reasoning: string;
}

export interface ProductResearchReport {
  generatedAt: string;
  /** Total products scanned. */
  scannedCount: number;
  /** Gaps found (products not in Mercenta's catalog). */
  gaps: ProductGap[];
  /** Top gaps sorted by acceptance score. */
  topGaps: ProductGap[];
  /** Data source mode. */
  source: 'mock' | 'keepa';
  /** Source URL / provider label. */
  sourceLabel: string;
}

/* ── §Access-gate — Brand applications ─────────────────────────────── */

export type LinkVerificationStatus =
  | 'verified'
  | 'unreachable'
  | 'no_content'
  | 'not_found'
  | 'unverified_manual_check';

export const PRODUCT_CATEGORIES = [
  'Health & Personal Care',
  'Home',
  'Baby',
  'Office Products',
  'Kitchen',
  'Consumer Electronics',
  'Automotive',
  'Grocery',
  'Apparel',
  'Personal Computer',
  'Other',
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const MONTHLY_REVENUE_OPTIONS = [
  'Under £5k',
  '£5k–£20k',
  '£20k–£50k',
  '£50k–£100k',
  '£100k+',
] as const;

export type MonthlyRevenue = (typeof MONTHLY_REVENUE_OPTIONS)[number];

export type ApplicationStatus =
  | 'pending'
  | 'flagged'
  | 'info_requested'
  | 'approved'
  | 'rejected';

export interface BrandApplication {
  id: string;
  companyName: string;
  country: string;
  /**
   * §PHONE — COMPULSORY (Founder decision, 2026-09-26).
   *
   * §PHONE — REPOINTED: this was `string | null` while the phone was optional, and
   * the application form wrote `null` for a blank answer. An application without a
   * contact number is now refused by the guard (`missing_phone`) before this writer
   * is reached, and the type says so: no caller can construct an application that
   * has no phone. (The three validator fixtures that used to pass `phone: null`
   * were updated in the same increment.)
   */
  phone: string;
  category: string;
  skuCount: number | null;
  monthlyRevenue: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  websiteStatus: LinkVerificationStatus | null;
  instagramStatus: LinkVerificationStatus | null;
  facebookStatus: LinkVerificationStatus | null;
  referralSource: string | null;
  description: string | null;
  status: ApplicationStatus;
  adminNotes: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
}

export const BRAND_SOURCE_OPTIONS = [
  'Embassy Referral',
  'Direct Outreach',
  'Inbound Application',
  'Partnership',
  'Other',
] as const;

/* ── §Brand Intelligence — Amazon Brand Discovery & Prospect Scoring ── */

/** §Amazon Retail presence classification for a given ASIN. */
export type AmazonOfferClassification =
  | 'DIRECT_AMAZON_RETAIL'
  | 'AMAZON_PRESENT_BUT_UNCLEAR'
  | 'MARKETPLACE_HEAVY'
  | 'MARKETPLACE_ONLY_OBSERVED'
  | 'NO_CURRENT_OFFER'
  | 'UNKNOWN';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

/** Every AI-generated or researched statement is tagged with its ontological class. */
export type EvidenceClassification =
  | 'FACT'
  | 'ESTIMATE'
  | 'INFERENCE'
  | 'RECOMMENDATION'
  | 'UNKNOWN';

/** Single evidence datum with source attribution. */
export interface ProspectEvidence {
  /** The field this evidence pertains to (e.g. 'uk_distributor', 'amazon_restriction'). */
  field: string;
  /** The observed value. */
  value: string;
  /** Human-readable source name. */
  source: string;
  /** URL where the evidence was observed. */
  sourceUrl: string;
  /** ISO date of observation. */
  dateObserved: string;
  confidence: ConfidenceLevel;
  classification: EvidenceClassification;
  /** Free-form notes from the researcher. */
  notes?: string;
}

/** An ASIN belonging to a prospect brand, with observed Amazon metrics. */
export interface ProspectASIN {
  asin: string;
  title: string;
  category: string;
  subcategory?: string;
  /** Current buy-box price in GBP. */
  price: number;
  packSize?: string;
  rating: number;
  reviewCount: number;
  /** Best Sellers Rank (lower = better). */
  bsr: number;
  subcategoryRank?: number;
  /** URL on Amazon UK. */
  amazonUrl: string;
  /** Who currently holds the Featured Offer. */
  featuredOffer?: string;
  /** Number of marketplace sellers observed. */
  sellerCount: number;
  /** Whether Amazon Retail appears to be a seller. */
  amazonRetailSeller: boolean;
  /** Marketplace sellers observed. */
  marketplaceSellers?: string[];
  /** Prime eligibility. */
  prime: boolean;
  /** Search terms with estimated volume. */
  searchTerms?: { term: string; estimatedMonthlySearches: number }[];
  /** Estimated monthly unit sales. */
  estimatedSales?: number;
  /** Estimated monthly revenue in GBP. */
  estimatedRevenue?: number;
  /** Classification of Amazon's offer structure for this ASIN. */
  amazonOfferClass: AmazonOfferClassification;
  /** Confidence in the classification. */
  amazonOfferConfidence: ConfidenceLevel;
  /** Last date Amazon offer data was observed. */
  lastObserved: string;
  /** Evidence trail for key data points. */
  evidence: ProspectEvidence[];
  /** Data source label. */
  sourceLabel: string;
}
export type DistributorStatus =
  | 'NONE_FOUND'
  | 'BRAND_DIRECT'
  | 'DISTRIBUTOR_IDENTIFIED'
  | 'EXCLUSIVE_DISTRIBUTOR'
  | 'UNKNOWN';

/** A detected distributor relationship for a prospect brand. */
export interface ProspectDistributor {
  company: string;
  website: string;
  /** Territory covered (e.g. 'UK', 'UK & Ireland', 'Europe'). */
  territory: string;
  exclusive: boolean;
  contact?: string;
  email?: string;
  phone?: string;
  /** Source of the distributor information. */
  source: string;
  /** URL where distributor relationship was found. */
  sourceUrl: string;
  confidence: ConfidenceLevel;
  /** Evidence for this relationship. */
  evidence: ProspectEvidence[];
  /** Suggested approach: 'approach_brand' | 'approach_distributor' | 'approach_both'. */
  suggestedApproach?: 'approach_brand' | 'approach_distributor' | 'approach_both';
}

export type ContactConfidence = 'verified' | 'pattern_derived' | 'public_generic' | 'unverified';

/** A commercial decision-maker contact for a prospect brand. */
export interface ProspectContact {
  name: string;
  jobTitle: string;
  linkedInUrl?: string;
  company: string;
  country?: string;
  email?: string;
  emailConfidence: ContactConfidence;
  phone?: string;
  phoneConfidence: ContactConfidence;
  source: string;
  /** ISO date when contact info was last verified. */
  lastVerified: string;
  evidence: ProspectEvidence[];
}

export type RestrictionSeverity = 'hard' | 'conditional' | 'unknown';

/** An Amazon or marketplace restriction detected for a brand. */
export interface ProspectRestriction {
  /** Brief description of the restriction. */
  description: string;
  severity: RestrictionSeverity;
  /** Verbatim text of the restriction if available. */
  restrictionText?: string;
  source: string;
  sourceUrl: string;
  dateObserved: string;
  evidence: ProspectEvidence[];
}

export type BrandMaturity =
  | 'incumbent'
  | 'challenger'
  | 'emerging'
  | 'niche'
  | 'amazon_native'
  | 'amazon_sophisticated';

export type ProspectTier = 'tier_1' | 'tier_2' | 'tier_3' | 'tier_4' | 'unscored';

/** Seven-dimension scoring model for brand prospects. Total = 100. */
export interface ProspectScore {
  /** Amazon UK demand (0-25). */
  amazonDemand: number;
  /** Amazon PO potential (0-20). */
  poPotential: number;
  /** Challenger / growth potential (0-15). */
  growth: number;
  /** Distribution openness / gap (0-15). */
  distributionOpenness: number;
  /** Likelihood of acceptance (0-10, independent of PO potential). */
  acceptanceProbability: number;
  /** Mercenta self-service fit (0-10). */
  mercentaFit: number;
  /** Margin / logistics suitability (0-5). */
  logisticsSuitability: number;
  /** Weighted total (0-100). */
  total: number;
  tier: ProspectTier;
  /** ISO date when score was calculated. */
  calculatedAt: string;
}
export type GrowthSignalType =
  | 'major_growth_announcement'
  | 'new_national_retailer'
  | 'amazon_growth'
  | 'funding'
  | 'new_distributor'
  | 'major_product_launch'
  | 'new_stockist'
  | 'retail_expansion'
  | 'international_expansion'
  | 'uk_launch'
  | 'increased_amazon_reviews'
  | 'social_traction';

/** A detected growth signal for a prospect brand. */
export interface GrowthSignal {
  type: GrowthSignalType;
  description: string;
  /** Score contribution (e.g. +5 for major growth announcement). */
  scoreContribution: number;
  source: string;
  sourceUrl: string;
  dateObserved: string;
  confidence: ConfidenceLevel;
  evidence: ProspectEvidence[];
}

export type OutreachStatus =
  | 'uncontacted'
  | 'researching'
  | 'ready_to_contact'
  | 'contacted'
  | 'opened'
  | 'replied'
  | 'interested'
  | 'meeting_scheduled'
  | 'negotiating'
  | 'pilot'
  | 'won'
  | 'lost'
  | 'nurture'
  | 'disqualified';

/** Wholesale / trade programme information for a prospect brand. */
export interface ProspectWholesale {
  wholesaleAvailable: boolean;
  distributorProgramme: boolean;
  retailerProgramme: boolean;
  minimumOrderQuantity?: string;
  tradePricingAvailable?: boolean;
  tradeUrl?: string;
  retailerApplicationUrl?: string;
  source: string;
  sourceUrl: string;
  confidence: ConfidenceLevel;
  evidence: ProspectEvidence[];
}
/** The full aggregated prospect record — one per brand. */
export interface BrandProspect {
  /** Unique prospect ID. */
  id: string;
  /** Brand name. */
  brand: string;
  /** Approved category. */
  category: string;
  /** Official brand website. */
  website?: string;
  /** Countries where the brand operates. */
  countries?: string[];
  /** UK-specific presence. */
  ukPresence?: boolean;
  /** Brand maturity classification. */
  brandMaturity: BrandMaturity;
  /** If challenger, which incumbent(s) they're taking share from. */
  incumbentChallenged?: string[];
  /** Human-readable summary of why this brand is interesting. */
  whyInteresting?: string;
  /** Amazon UK ASINs discovered for this brand. */
  asins: ProspectASIN[];
  /** Detected distributor relationships. */
  distributors: ProspectDistributor[];
  /** Wholesale / trade programme information. */
  wholesale: ProspectWholesale;
  /** Detected marketplace restrictions (Amazon prohibition etc.). */
  restrictions: ProspectRestriction[];
  /** Detected growth signals. */
  growthSignals: GrowthSignal[];
  /** Commercial decision-makers. */
  contacts: ProspectContact[];
  /** Scoring results. */
  score: ProspectScore;
  /** Current outreach status. */
  outreachStatus: OutreachStatus;
  /** Outreach records (emails, LinkedIn messages). */
  outreach?: ProspectOutreachRecord[];
  /** ISO date when prospect was first created. */
  createdAt: string;
  /** ISO date of last research update. */
  lastResearched: string;
  /** ISO date of last Amazon data check. */
  lastAmazonCheck?: string;
  /** ISO date of last distributor check. */
  lastDistributorCheck?: string;
  /** ISO date of last contact verification. */
  lastContactCheck?: string;
  /** ISO timestamp when the BI lifecycle engine last checked this prospect. */
  lastChecked?: string;
  /** ISO timestamp when the next discovery re-check is due. */
  nextCheck?: string;
  /** All evidence collected for this prospect. */
  evidence: ProspectEvidence[];
  /** Whether this prospect is hard-disqualified. */
  disqualified: boolean;
  /** Reason for disqualification if applicable. */
  disqualificationReason?: string;
  /** Data source mode. */
  source: 'mock' | 'live';
  /** Research owner (admin staff ID). */
  owner?: string;
  /** Internal notes. */
  notes?: string;
  /**
   * §16/M12 — which market-access route surfaced this opportunity: source
   * country, trade programme, referral/partner source, campaign. The TYPE lives
   * in `src/lib/intelligence/acquisitionStrategy.ts` (single source of truth);
   * it is referenced here as a type-only import so the domain model cannot drift
   * from the strategy layer and no runtime cycle is created.
   */
  marketAccess?: import('@/lib/intelligence/acquisitionStrategy').MarketAccessTag;
}

/**
 * §Phase C — human-in-the-loop approval state of an outreach recommendation.
 * Additive: the original union was `'draft' | 'sent' | 'opened' | 'replied'`
 * and only the (previously unused) generator produced `'draft'`.
 */
export type OutreachApprovalStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'sent'
  | 'opened'
  | 'replied';

/** An outreach message (email or LinkedIn) generated for a prospect. */
export interface ProspectOutreachRecord {
  id: string;
  prospectId: string;
  contactId?: string;
  /** 'email' | 'linkedin' */
  channel: string;
  subject?: string;
  body: string;
  status: OutreachApprovalStatus;
  /** ISO date sent. */
  sentAt?: string;
  /** Follow-up sequence position (0 = initial, 3 = day 3, 7 = day 7, etc.). */
  sequenceDay: number;
  /** §Phase C — revision counter; increments on every operator modification. */
  revision?: number;
  /** §Phase C — BI evidence summary: WHY this brand is being contacted. */
  evidenceSummary?: string;
  /** §Phase C — operator audit of the human approval decision. */
  approvalNote?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  modifiedBy?: string;
  modifiedAt?: string;
  /**
   * §Phase C — which transport produced the send. 'simulation' = deterministic
   * sandbox path (no external network); 'live' = a connected provider adapter.
   */
  transport?: 'simulation' | 'live';
  /** §Phase C — the ICP lead this recommendation was prepared for. */
  leadId?: string;
  /**
   * §Phase D2 — traceability REFERENCE to the canonical BI intelligence that was
   * available when this revision was prepared. Ids + counts only: the
   * intelligence itself is NEVER copied into this record — it is always re-read
   * from the canonical prospect by `prospectId`.
   */
  intelligenceRef?: ProspectIntelligenceRef;
}

/** Weekly snapshot of brand intelligence scores for trend tracking. */
export interface IntelligenceSnapshot {
  snapshotDate: string;
  brandId: string;
  brand: string;
  category: string;
  score: ProspectScore;
  totalAsins: number;
  estimatedMonthlyRevenue?: number;
  distributorStatus: DistributorStatus;
  outreachStatus: OutreachStatus;
}

/** Configuration for the intelligence pipeline run. */
export interface IntelligencePipelineConfig {
  /** Categories to scan (defaults to APPROVED_CATEGORIES). */
  categories: string[];
  /** Minimum monthly estimated units per product. */
  minMonthlyUnits?: number;
  /** Minimum monthly estimated revenue per product (GBP). */
  minMonthlyRevenue?: number;
  /** Minimum rating. */
  minRating?: number;
  /** Minimum review count. */
  minReviews?: number;
  /** Maximum number of products to scan per category. */
  maxProductsPerCategory: number;
  /** Maximum number of brands to return. */
  maxBrands: number;
  /** Whether to automatically disqualify brands with hard restrictions. */
  autoDisqualify: boolean;
}

/** Summary intelligence dashboard data for the Super Admin view. */
export interface IntelligenceDashboard {
  totalBrandsTracked: number;
  tier1Count: number;
  tier2Count: number;
  tier3Count: number;
  tier4Count: number;
  newThisWeek: number;
  distributorGaps: number;
  highPriorityCount: number;
  categoryBreakdown: { category: string; count: number }[];
  topProspect?: BrandProspect;
  generatedAt: string;
}

/** Status of a recorded Brand Intelligence discovery run. */
export type IntelligenceRunStatus = 'running' | 'completed' | 'failed';

/** What triggered an intelligence discovery run. */
export type IntelligenceRunTrigger = 'manual' | 'scheduled' | 'seed';

/** Kind of change recorded against a canonical prospect. */
export type ProspectChangeType = 'created' | 'updated' | 'disqualified' | 'requalified' | 'unchanged';

/**
 * A recorded Brand Intelligence discovery run — the pipeline's audit/history.
 * Retained across runs so previous searches never disappear.
 */
export interface IntelligenceRun {
  runId: string;
  startedAt: string;
  completedAt: string;
  status: IntelligenceRunStatus;
  trigger: IntelligenceRunTrigger;
  mode: 'mock' | 'live';
  scannedCount: number;
  newCount: number;
  updatedCount: number;
  disqualifiedCount: number;
  unchangedCount: number;
  /** Prospect ids that changed during this run (excludes unchanged). */
  changedProspectIds: string[];
  candidatesCount: number;
  errorCount: number;
  summary: string;
}

/** A single auditable change event against a canonical prospect. */
export interface ProspectChangeEvent {
  id: string;
  runId: string;
  prospectId: string;
  brand: string;
  changeType: ProspectChangeType;
  timestamp: string;
  /** The field that changed (e.g. 'score', 'disqualified', 'discovery'). */
  field?: string;
  /** Previous value (human-readable). */
  before?: string;
  /** New value (human-readable). */
  after?: string;
  summary: string;
}

/** Derived pipeline status from the canonical prospect store. */
export interface IntelligencePipelineStatus {
  totalTracked: number;
  activeCount: number;
  disqualifiedCount: number;
  runCount: number;
  lastRun?: IntelligenceRun;
  lastCheckedAt?: string;
  nextScheduledCheck?: string;
}

/* ── §Phase C — acquisition: outreach response → opportunity → CRM ─────── */

/** Lifecycle of a prospect-backed commercial opportunity. */
export type OpportunityStage =
  | 'new'
  | 'contacted'
  | 'responded'
  | 'qualified'
  | 'won'
  | 'lost';

/** A deterministic, simulated (or live) inbound reply to an outreach send. */
export interface OutreachResponse {
  id: string;
  prospectId: string;
  outreachId?: string;
  receivedAt: string;
  channel: string;
  from: string;
  body: string;
  /** Intent classification from the canonical classifyInboundReply contract. */
  wantsHuman: boolean;
  classificationReason?: string;
  /** true when generated by the simulation path (no live provider inbound). */
  simulated: boolean;
  handledBy?: string;
}

/**
 * §Phase C — the commercial opportunity created from a qualified prospect
 * interaction. Carries the canonical prospect identity plus the BI evidence
 * snapshot taken at creation, so the CRM relationship stays traceable to the
 * Brand Intelligence record it came from.
 */
export interface Opportunity {
  id: string;
  /** Canonical BI prospect id — identity survives BI → ICP → CRM. */
  prospectId: string;
  brand: string;
  category: string;
  stage: OpportunityStage;
  /** BI score snapshot at creation (never re-derived downstream). */
  biScore: number;
  biTier: ProspectTier;
  /** Why this brand was identified/qualified — BI evidence summary. */
  evidenceSummary: string;
  contactName?: string;
  contactEmail?: string;
  leadId?: string;
  outreachId?: string;
  responseId?: string;
  ownerStaffId?: string;
  /** Set once the prospect onboards into a demo/brand tenant. Unset before. */
  brandId?: string;
  createdAt: string;
  updatedAt: string;
}

/** Kind of audited acquisition event (relationship timeline). */
export type AcquisitionEventType =
  | 'enrolled'
  | 'outreach_prepared'
  | 'outreach_modified'
  | 'outreach_approved'
  | 'outreach_rejected'
  | 'outreach_sent'
  | 'response_received'
  | 'opportunity_created'
  | 'opportunity_stage_changed'
  /* §Phase E1 — opportunity → brand onboarding hand-off */
  | 'onboarding_started'
  | 'onboarding_accepted'
  | 'onboarding_step_completed'
  /* §P13 / S8 — the brand acknowledged the channel's PO acknowledgement rule */
  | 'onboarding_po_rules_acknowledged'
  | 'onboarding_completed';

/** A single audited acquisition transition for a canonical prospect. */
export interface AcquisitionEvent {
  id: string;
  prospectId: string;
  brand: string;
  type: AcquisitionEventType;
  at: string;
  actor: string;
  summary: string;
  detail?: string;
}

/**
 * §Phase C — THE canonical relationship context for one prospect: the BI record
 * plus every acquisition artefact and the messages logged for it in the ONE
 * canonical message store. CRM views render this and never keep a second
 * conversation history.
 */
export interface AcquisitionRelationship {
  prospect: BrandProspect;
  /** Every outreach revision, oldest first (history is never discarded). */
  outreach: ProspectOutreachRecord[];
  /** Latest outreach revision (the current recommendation), if any. */
  current: ProspectOutreachRecord | null;
  responses: OutreachResponse[];
  opportunity: Opportunity | null;
  events: AcquisitionEvent[];
  /** Canonical messages keyed by the prospect identity (no duplicate store). */
  messages: Message[];
}

/* ── §PHASE 1 — EXPLORE UK MARKET FIT / PRE-AUDIT (canonical entities) ─────
 *
 * The pre-audit layer answers ONE question before a brand commits to anything:
 * does there appear to be a credible UK opportunity? Its canonical records are
 * declared here, alongside every other canonical entity, because this is the
 * ONE types file (see `.clinerules` — single source of truth).
 *
 * RELATIONSHIP TO WHAT ALREADY EXISTS (nothing is duplicated):
 *   - The prospect remains `BrandProspect` in the canonical BI store. A
 *     pre-audit that qualifies FEEDS that store; it does not create a parallel
 *     universe and it never creates a brand tenant.
 *   - `Opportunity` (above) remains the ACQUISITION opportunity. `ProductOpportunity`
 *     here is a PRODUCT-level record inside the pre-audit and is deliberately a
 *     different entity at a different granularity.
 *   - The commercial relationship remains `src/config/commercialModel.ts`. The
 *     `SupplyProfile` here is the pre-audit's supply view, not the commercial
 *     relationship.
 *
 * All enums used below are declared in `src/config/ukMarketFit.ts` (single
 * source of truth) and imported type-only, so a value can never drift.
 */
import type {
  PreAuditEvidenceBasis,
  PreAuditIndicatorId,
  PreAuditIndicatorState,
  PreAuditQualification,
  PreAuditStatus,
  PreAuditEducationalGapId,
  UkMarketFitDimensionId,
  UkOpportunitySnapshotSectionId,
  UkPresenceOutcome,
} from '@/config/ukMarketFit';

/**
 * WHO OWNS A PRE-AUDIT RECORD. Ownership is explicit and is the ONLY thing the
 * read scoping is allowed to trust — a public visitor's assessment is never
 * visible to another visitor, and a brand tenant can never read another
 * tenant's (or Mercenta's internal) opportunity research.
 */
export type PreAuditOwner =
  | { kind: 'public_session'; sessionId: string }
  | { kind: 'ops'; tenantId: string }
  | { kind: 'brand'; tenantId: string };

/** One piece of evidence, always carrying where it came from and how solid it is. */
export interface PreAuditEvidence {
  /** The field/claim this evidence supports (e.g. 'uk_presence', 'review_volume'). */
  field: string;
  /** The observed value, exactly as observed — never rounded into a claim. */
  value: string;
  /** The declared source id (`src/config/ukMarketFit.ts → PRE_AUDIT_RESEARCH_SOURCES`). */
  sourceId: string;
  /** Human-readable source label. */
  source: string;
  /** URL when the source is a real public page; empty for a simulated seam. */
  sourceUrl: string;
  /** ISO date of observation. */
  observedAt: string;
  basis: PreAuditEvidenceBasis;
  /** Never 'high' for simulated evidence — the engine enforces this. */
  confidence: ConfidenceLevel;
  /** FACT / ESTIMATE / INFERENCE / RECOMMENDATION / UNKNOWN (canonical vocabulary). */
  classification: EvidenceClassification;
  note?: string;
}

/** A declared deterministic rule with the value it actually observed. */
export interface PreAuditRule {
  id: string;
  threshold: string;
  observed: string;
}

/**
 * ONE indicator. It is deliberately qualitative and it must expose its basis,
 * its evidence, its observed values, the threshold/logic used, its confidence
 * and its unknowns — an indicator that hides any of these is not allowed to be
 * rendered (see `ukMarketFitEngine.ts`).
 */
export interface PreAuditIndicator {
  id: PreAuditIndicatorId;
  label: string;
  question: string;
  state: PreAuditIndicatorState;
  /** Plain-language reason for the state, phrased with a declared hedge. */
  rationale: string;
  basis: PreAuditEvidenceBasis;
  evidence: PreAuditEvidence[];
  observed: string[];
  rules: PreAuditRule[];
  confidence: ConfidenceLevel;
  unknowns: string[];
  /** True when this indicator is about regulatory requirements, not commerce. */
  regulatory: boolean;
}

/** The result of ONE of the seven assessment dimensions. */
export interface UkMarketFitDimensionResult {
  id: UkMarketFitDimensionId;
  label: string;
  /** What the evidence suggests — never a fact claim. */
  finding: string;
  basis: PreAuditEvidenceBasis;
  evidence: PreAuditEvidence[];
  confidence: ConfidenceLevel;
  unknowns: string[];
  /** True when nothing could be established and the dimension is honestly empty. */
  indeterminate: boolean;
}

/** One section of the UK Opportunity Snapshot. */
export interface UkOpportunitySnapshotSection {
  id: UkOpportunitySnapshotSectionId;
  title: string;
  /** Hedged statements — the engine asserts a declared hedge is present. */
  statements: string[];
  basis: PreAuditEvidenceBasis;
  confidence: ConfidenceLevel;
  unknowns: string[];
}

/** The complete UK Opportunity Snapshot — the assessment's result. */
export interface UkOpportunitySnapshot {
  /** The honest one-line verdict. Never a score. */
  headline: string;
  /** §9 — DECLARED: there is no single success score, so this is always absent. */
  successScore?: never;
  presence: UkPresenceOutcome;
  presenceLabel: string;
  qualification: PreAuditQualification;
  qualificationLabel: string;
  indicators: PreAuditIndicator[];
  dimensions: UkMarketFitDimensionResult[];
  sections: UkOpportunitySnapshotSection[];
  /** What still has to be confirmed, in the brand's own terms. */
  openQuestions: string[];
  /** Educational gaps captured for the future Academy (never taught here). */
  educationalGaps: { id: PreAuditEducationalGapId; label: string; academyStage: number }[];
  recommendedNextStep: string;
  /** What the assessment was NOT able to establish — stated, never hidden. */
  couldNotEstablish: string[];
  disclaimer: string;
  /** 'simulated' whenever the research came from the deterministic seam. */
  researchMode: 'simulated' | 'live';
  simulationLabel: string | null;
}

/** What the visitor supplied (or was discovered) to run the assessment. */
export interface PreAuditInput {
  brandName: string;
  website: string;
  country: string;
  category: string;
  productName?: string;
  productIdentifiers?: string[];
  existingUkPresence?: string;
  sourceMarketplacePresence?: string;
  wholesaleCost?: number;
  retailPrice?: number;
  moq?: number;
  casePack?: number;
  leadTimeDays?: number;
  origin?: string;
  knownDocumentation?: string[];
  contactName?: string;
  contactEmail?: string;
}

/** §7 — the product-level opportunity record inside a pre-audit. */
export interface ProductOpportunity {
  id: string;
  /** The owning assessment (deterministic, never time-derived). */
  assessmentId: string;
  brand: string;
  /** Where the product trades today. */
  sourceMarket: string;
  /** Product identity, when supplied or discovered. */
  productName: string | null;
  sourceAsin: string | null;
  ukAsin: string | null;
  gtin: string | null;
  ean: string | null;
  upc: string | null;
  model: string | null;
  /** How the UK identity relates to the source identity. */
  matchRelationship: 'exact' | 'probable' | 'related' | 'none' | 'unknown';
  category: string;
  /** Evidence of demand in the source market. */
  demandEvidence: string[];
  ukPresence: UkPresenceOutcome;
  ukOpportunity: string;
  pricingEvidence: string[];
  competitionEvidence: string[];
  /** Compliance/readiness state — requirements, never a clearance. */
  readinessState: 'documented' | 'partially_documented' | 'not_documented' | 'unknown';
  supplyConsiderations: string[];
  confidence: ConfidenceLevel;
  evidence: PreAuditEvidence[];
  createdAt: string;
}

/** §7 — the supply view for an opportunity (NOT the commercial relationship). */
export interface SupplyProfile {
  id: string;
  assessmentId: string;
  origin: string | null;
  shipFrom: string | null;
  productionLeadTimeDays: number | null;
  exportLeadTimeDays: number | null;
  freightMode: 'air' | 'sea' | 'road' | 'unknown';
  transitEstimateDays: number | null;
  customsRequired: boolean;
  ukFinalMile: boolean;
  /** Declared planning buffer — never presented as a carrier commitment. */
  safetyBufferDays: number | null;
  planningLeadTimeDays: number | null;
  variability: 'low' | 'medium' | 'high' | 'unknown';
  moq: number | null;
  casePack: number | null;
  /** What is still unknown about supply — stated, never guessed. */
  unknowns: string[];
  evidence: PreAuditEvidence[];
}

/** §7 — the brand-level opportunity record. */
export interface BrandOpportunity {
  id: string;
  /** Canonical brand identity key (`normalizeBrandKey`) — the SAME key BI uses. */
  dedupeKey: string;
  brand: string;
  website: string;
  sourceMarket: string;
  category: string;
  researchStatus: 'not_started' | 'simulated' | 'live' | 'unavailable';
  ukMarketStatus: UkPresenceOutcome;
  opportunityEvidence: string[];
  qualification: PreAuditQualification;
  nextAction: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
  /** Ids of the evidence records this opportunity rests on. */
  evidenceRefs: string[];
}

/**
 * THE canonical pre-audit assessment record. One per assessment run, owned by
 * exactly one `PreAuditOwner`. Persisted through the SAME domain persistence
 * port as every other domain artefact (no second store, no second database).
 */
export interface PreAuditAssessment {
  id: string;
  owner: PreAuditOwner;
  status: PreAuditStatus;
  input: PreAuditInput;
  brandOpportunity: BrandOpportunity;
  productOpportunities: ProductOpportunity[];
  supplyProfile: SupplyProfile;
  /** Present only once the assessment reached a result. */
  snapshot: UkOpportunitySnapshot | null;
  /** Present when research could not run — the honest degraded state. */
  researchUnavailableReason: string | null;
  /** The canonical prospect this fed, once fed. Null until then. */
  fedProspectId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** The outcome of feeding a qualified pre-audit into the acquisition pipeline. */
export interface PreAuditAcquisitionFeed {
  ok: boolean;
  reason: string;
  assessmentId: string;
  prospectId: string | null;
  /** True when this created a NEW canonical prospect; false when it reused one. */
  created: boolean;
  /** The canonical acquisition stage the prospect now sits in. */
  stage: string | null;
  /** Always false — a pre-audit can never create a brand tenant. */
  createdBrandTenant: false;
}

/* ── §Phase E1 — brand onboarding (opportunity → operational tenant) ─────── */

/**
 * Onboarding lifecycle for an accepted/qualified acquisition opportunity.
 *
 * This record is the canonical bridge between the PRE-onboarding relationship
 * (the BI prospect + its acquisition Opportunity) and the OPERATIONAL brand
 * tenant. It carries the SAME `prospectId` and `opportunityId`, so the
 * acquisition history is never lost, and the `brandId` it introduces is the
 * tenant identity the opportunity onboards INTO — there is no second brand
 * identity system.
 */
export type OnboardingStatus = 'initiated' | 'accepted' | 'in_progress' | 'completed';

/** The canonical onboarding steps, completed strictly in order. */
export type OnboardingStepId =
  | 'profile'
  | 'legal_agreements'
  | 'banking'
  | 'carriers'
  | 'compliance';

export type OnboardingStepStatus = 'pending' | 'in_progress' | 'done';

export interface OnboardingStep {
  id: OnboardingStepId;
  label: string;
  status: OnboardingStepStatus;
  completedAt?: string;
  completedBy?: string;
  note?: string;
}

export interface BrandOnboarding {
  /**
   * Deterministic per origin: `onb-<prospectId>` for an acquisition opportunity,
   * `onb-app-<applicationId>` for an approved partner application.
   */
  id: string;
  /** Canonical BI prospect id (acquisition origin only) — identity survives BI → ICP → CRM → tenant. */
  prospectId?: string;
  /** The originating acquisition opportunity (acquisition origin only). */
  opportunityId?: string;
  /** The originating partner application (application origin only). */
  applicationId?: string;
  /** The brand TENANT identity this onboarding creates. */
  brandId: string;
  businessName: string;
  category: string;
  track: FulfillmentTrack;
  status: OnboardingStatus;
  steps: OnboardingStep[];
  /** Provenance — which real entry point this onboarding started from. */
  origin: 'acquisition_opportunity' | 'partner_application' | 'manual_creation';
  /** BI score/tier snapshot carried from the opportunity (acquisition origin only). */
  biScore?: number;
  biTier?: ProspectTier;
  initiatedAt: string;
  initiatedBy: string;
  /** Set when the BRAND accepts (wizard submission) — a distinct audited act. */
  acceptedAt?: string;
  acceptedBy?: string;
  /**
   * §P13 / S8 — THE LINK TO THE PO ACKNOWLEDGEMENT OBLIGATION.
   *
   * Set when the brand acknowledged the channel's documented purchase-order
   * acknowledgement rule in the onboarding wizard's operational-guidance step. It is
   * a canonical, audited act (`acknowledgePurchaseOrderRules`), and
   * `poRulesRuleText` records the EXACT wording the brand was shown (the rule's own
   * config-owned text at the time), so the record proves what was acknowledged and
   * can never be reconstructed from a later version of the rule.
   */
  poRulesAcknowledgedAt?: string;
  poRulesAcknowledgedBy?: string;
  poRulesRuleText?: string;
  completedAt?: string;
  completedBy?: string;
}

/* ── §Phase D2 — canonical BI intelligence access (read-by-reference) ────── */

/** A keyed part of the canonical BI record, with its actual populated state. */
export type ProspectIntelligenceSectionKey =
  | 'identity'
  | 'market'
  | 'asins'
  | 'contacts'
  | 'distributors'
  | 'wholesale'
  | 'restrictions'
  | 'growthSignals'
  | 'evidence'
  | 'score'
  | 'lifecycle';

/**
 * One section of the canonical BI intelligence. `count` is what BI actually
 * holds — 0 is reported explicitly (a section is never silently dropped because
 * it happens to be empty, and it is never fabricated when it is).
 */
export interface ProspectIntelligenceSection {
  key: ProspectIntelligenceSectionKey;
  label: string;
  count: number;
  populated: boolean;
}

/**
 * Traceability of the intelligence back to its canonical BI provenance:
 * run ids, timeline event ids, snapshot dates and the observed evidence sources.
 * Every entry is an ID or an observation source recorded by BI — no new data.
 */
export interface ProspectIntelligenceProvenance {
  prospectId: string;
  /** Canonical discovery run ids that produced/updated this record. */
  runIds: string[];
  /** Canonical change-event ids on this prospect's BI timeline. */
  changeEventIds: string[];
  /** Canonical score snapshot dates recorded for this brand. */
  snapshotDates: string[];
  /** Distinct evidence sources and how many evidence items each contributed. */
  evidenceSources: { source: string; count: number }[];
  /** Distinct evidence source URLs (where BI observed it). */
  evidenceSourceUrls: string[];
  /** Amazon URLs observed on the record's ASINs. */
  asinSourceUrls: string[];
}

/**
 * What BI actually holds for this prospect, expressed as counts plus the exact
 * score factors. Deliberately NOT a copy of any ASIN/contact/evidence record —
 * values are read from the live canonical record through `ProspectIntelligence.prospect`.
 */
export interface ProspectIntelligenceDigest {
  asinCount: number;
  contactCount: number;
  distributorCount: number;
  restrictionCount: number;
  growthSignalCount: number;
  evidenceCount: number;
  marketplaceSellerObserved: boolean;
  wholesaleProgramme: boolean;
  /** Exact seven-dimension score factors, read from the canonical record. */
  scoreFactors: {
    amazonDemand: number;
    poPotential: number;
    growth: number;
    distributionOpenness: number;
    acceptanceProbability: number;
    mercentaFit: number;
    logisticsSuitability: number;
  };
  scoreTotal: number;
  scoreTier: ProspectTier;
  scoreCalculatedAt: string;
  /** Every canonical section with its populated state (all 11 always present). */
  sections: ProspectIntelligenceSection[];
}

/**
 * THE acquisition-facing view of a canonical Brand Intelligence prospect.
 * `prospect` is the SAME object the canonical BI store holds — this view is a
 * live projection, never a second intelligence record that can drift.
 */
export interface ProspectIntelligence {
  prospectId: string;
  prospect: BrandProspect;
  digest: ProspectIntelligenceDigest;
  provenance: ProspectIntelligenceProvenance;
  lifecycle: {
    outreachStatus: OutreachStatus;
    disqualified: boolean;
    disqualificationReason?: string;
    createdAt: string;
    lastResearched: string;
    lastChecked?: string;
    nextCheck?: string;
  };
}

/**
 * §Phase D2 — the reference stored on an outreach revision: what BI held when the
 * operator prepared it. Ids + counts + the score snapshot only.
 */
export interface ProspectIntelligenceRef {
  prospectId: string;
  capturedAt: string;
  /** Outreach revision this reference was captured for. */
  revision: number;
  asinCount: number;
  contactCount: number;
  distributorCount: number;
  restrictionCount: number;
  growthSignalCount: number;
  evidenceCount: number;
  scoreTotal: number;
  scoreTier: ProspectTier;
  /** Canonical sections that were populated at preparation time. */
  populatedSections: ProspectIntelligenceSectionKey[];
}

/** Derived acquisition pipeline counts (admin overview). */
export interface AcquisitionPipelineSummary {
  prospects: number;
  enrolled: number;
  awaitingApproval: number;
  approved: number;
  sent: number;
  responded: number;
  opportunities: number;
}

/** A brand-level view for Brand Partner self-service intelligence. */
export interface BrandMarketIntelligence {
  brandName: string;
  category: string;
  estimatedMonthlySales: number;
  estimatedMonthlyRevenue: number;
  categoryAverageSales: number;
  categoryMarketSize: number;
  topCompetitors: { brand: string; estimatedSales: number; marketShare: number }[];
  salesTrend: { month: string; sales: number }[];
  priceDistribution: { range: string; count: number }[];
  reviewDistribution: { range: string; count: number }[];
  categoryGrowth: number;
  generatedAt: string;
  source: 'mock' | 'live';
  sourceLabel: string;
}
export type BrandSource = (typeof BRAND_SOURCE_OPTIONS)[number];

/* ── §PHASE 2 — EXPLICIT WORKFLOW ROUTING + COMMERCIAL READINESS ────────────
 *
 * The canonical records for explicit routing and for commercial readiness.
 * Declared HERE, in the ONE types file, alongside every other canonical entity.
 *
 * RELATIONSHIP TO WHAT ALREADY EXISTS (nothing is duplicated):
 *   - A routing decision POINTS AT the canonical record it is about
 *     (`subject`), exactly like a work item does — it never re-identifies it.
 *   - It does NOT replace the automation registry, the work layer, the event
 *     feed or the audit log: those remain the mechanisms. This record is the
 *     AUDITABLE EXPLANATION of a routing choice.
 *   - Commercial readiness REFERENCES the Phase 1 entities by id
 *     (`assessmentId`, `productOpportunityId`, `supplyProfileId`). It is not a
 *     second opportunity model.
 *
 * Enums live in the two config SSOTs and are imported type-only so a value can
 * never drift.
 */
import type {
  GatewayKind,
  GatewayStructureFindingKind,
  JoinPolicy,
  JoinState,
  RouteBranchOutcome,
  RouteRefusalReason,
} from '@/config/routing';
import type {
  CommercialConditionId,
  CommercialTermFieldId,
  CommercialValueBasis,
  CommercialViabilityRoute,
  PackConceptId,
} from '@/config/commercialReadiness';

/**
 * WHO OWNS A ROUTING DECISION. The same three-way ownership the pre-audit store
 * established is reused verbatim rather than re-invented: a public visitor's
 * decision is never visible to another visitor, a brand sees only its own, and
 * ops sees everything. Aliased (not re-declared) so the two can never diverge.
 */
export type RoutingOwner = PreAuditOwner;

/** The canonical record a routing decision/routing workflow is about. */
export interface RoutingSubjectRef {
  /** e.g. 'purchase_order', 'preaudit_assessment', 'product_opportunity'. */
  type: string;
  id: string;
  label: string;
}

/** ONE evaluated condition, with the rule and the value it actually observed. */
export interface RouteConditionEvaluation {
  /** The declared condition id (never invented at evaluation time). */
  id: string;
  label: string;
  /** The declared rule, stated in full — a condition is never a black box. */
  rule: string;
  /** The observed value, exactly as observed. */
  observed: string;
  /** What a satisfied condition required. */
  expected: string;
  /** True only when the condition positively held. */
  met: boolean;
  /** Set when the condition could not be evaluated — the fail-closed reason. */
  notEvaluatedReason: string | null;
  /** The route this condition selects. */
  routeId: string;
}

/** ONE branch of a gateway, with its own independent outcome. */
export interface RouteBranchResult {
  routeId: string;
  label: string;
  outcome: RouteBranchOutcome;
  /** What the branch does — and where it is acted on (never a new screen). */
  action: string;
  destination: string;
  /** The observed reason for this outcome, in plain language. */
  reason: string;
  /** The declared next step when the outcome needs attention; null otherwise. */
  nextStep: string | null;
  /** 1-based attempt number — a retry is visible, not hidden. */
  attempt: number;
  /**
   * True when this branch's outcome must remain visible even if another branch
   * succeeded. Always true: branch isolation is structural, not a per-branch
   * choice.
   */
  observable: true;
  /** The declared compensation when this branch failed. Null ⇒ human review. */
  compensation: string | null;
}

/** The fan-in state of a gateway (never inferred from the initiating operation). */
export interface RouteJoinState {
  policy: JoinPolicy;
  state: JoinState;
  requiredRouteIds: string[];
  optionalRouteIds: string[];
  satisfiedRouteIds: string[];
  failedRouteIds: string[];
  retryableRouteIds: string[];
  timedOutRouteIds: string[];
  humanReviewRouteIds: string[];
  /** The declared quorum, when the policy is `quorum`. */
  quorum: number | null;
  /** True ONLY when the declared completion condition is genuinely met. */
  complete: boolean;
  reason: string;
}

/** A structural defect found in the gateway definition itself. */
export interface GatewayStructureFinding {
  kind: GatewayStructureFindingKind;
  detail: string;
  routeId: string | null;
  conditionId: string | null;
}

/**
 * THE canonical routing decision — the auditable explanation of ONE routing
 * choice. It is written through the SAME domain persistence port and the SAME
 * audit registry as every other domain artefact (no second store, no second
 * database, no second event system).
 */
export interface WorkflowRoutingDecision {
  /** Deterministic: `route-<workflowId>-<gatewayId>-<conditionDigest>`. */
  id: string;
  workflowId: string;
  gatewayId: string;
  gatewayKind: GatewayKind;
  owner: RoutingOwner;
  subject: RoutingSubjectRef;
  conditions: RouteConditionEvaluation[];
  branches: RouteBranchResult[];
  selectedRouteIds: string[];
  /** True when the gateway refused to select a route. A refusal is not an error. */
  refused: boolean;
  refusalReason: RouteRefusalReason | null;
  refusalDetail: string | null;
  /** Present when the gateway declares a fan-in; null otherwise. */
  join: RouteJoinState | null;
  /** True only when the workflow is genuinely complete. */
  terminal: boolean;
  /**
   * DECLARED FALSE: completion is never inferred from the initiating operation
   * having succeeded. Typed as the literal so it cannot be set true.
   */
  completionInferredFromInitiator: false;
  /** Idempotency key — `<workflowId>|<gatewayId>|<conditionDigest>`. */
  idempotencyKey: string;
  conditionDigest: string;
  /** DECLARED TRUE: a failing branch never erases a sibling branch's success. */
  branchIsolationPreserved: true;
  /** Structural analysis of the gateway definition (§8). */
  structure: GatewayStructureFinding[];
  actor: string;
  createdAt: string;
  updatedAt: string;
}

/* ── Phase 2 — commercial terms, pack profile and the readiness record ────── */

/**
 * ONE commercial value with its provenance. A number NEVER travels without its
 * basis: `assumed`/`unknown` values are labelled wherever they are shown and can
 * never by themselves justify a `ready` route.
 */
export interface CommercialTermValue {
  field: CommercialTermFieldId;
  label: string;
  /** The value, or null when it is genuinely not established. */
  value: number | string | null;
  /** The unit the value is expressed in (never implicit). */
  unit: string;
  /** actual | observed | calculated | estimated | assumed | unknown. */
  basis: CommercialValueBasis;
  /** Where the value came from, when it came from anywhere. */
  source: string | null;
  /** ISO date of observation, when observed. */
  observedAt: string | null;
  confidence: ConfidenceLevel;
  /** Plain-language note, e.g. why a value is only an estimate. */
  note: string | null;
}

/**
 * §17 — the first-class pack model. Seven DISTINCT concepts, plus the validated
 * carton arithmetic. Deliberately not folded into `SupplyProfile.moq/casePack`.
 */
export interface PackProfile {
  /** The brand's minimum order quantity (units). */
  brandMoq: number | null;
  /** The manufacturer's minimum production batch (units). */
  productionMoq: number | null;
  /** Units per case. */
  casePack: number | null;
  /** Cases per master carton. */
  casesPerCarton: number | null;
  /** Derived: casePack × casesPerCarton. Null unless both inputs exist. */
  unitsPerMasterCarton: number | null;
  /** The PO quantity — a commercial decision, never derived from an MOQ. */
  poQuantity: number | null;
  /** What was actually shipped — recorded separately from what was ordered. */
  shipmentQuantity: number | null;
  /** Cartons per pallet (freight costing, not unit economics). */
  cartonsPerPallet: number | null;
  /** True only when the declared pack arithmetic actually holds. */
  valid: boolean;
  /** The honest statement of what is wrong / missing, when it is. */
  issue: string | null;
  /** The declared rule this profile was validated against. */
  rule: string;
}

/**
 * §10 — the DECLARED commercial assessment inputs that are neither commercial
 * terms nor the pack profile (per-unit costs, intended order quantity, projected
 * demand, declared supply capacity/variability and lead times).
 *
 * Retained ON the readiness record so a RE-ASSESSMENT uses the SAME basis that
 * produced the current route instead of inventing new inputs. This is what makes
 * "brand supplies information → reassess" a real, reproducible business step.
 */
export interface CommercialReadinessAssessmentInput {
  perUnitLogisticsCostGbp: number | null;
  perUnitChannelCostGbp: number | null;
  intendedOrderQuantity: number | null;
  projectedDemandUnits: number | null;
  declaredSupplyCapacityUnits: number | null;
  supplyVariability: 'low' | 'medium' | 'high' | 'unknown';
  planningLeadTimeDays: number | null;
  agreedMaxLeadTimeDays: number | null;
}

/**
 * THE canonical commercial readiness record. It REFERENCES the Phase 1 entities
 * by id and never re-creates them; it carries the terms, the pack profile, the
 * evaluated conditions and the route the gate selected.
 */
export interface CommercialReadinessRecord {
  id: string;
  owner: RoutingOwner;
  /** The Phase 1 assessment this readiness belongs to (the ONE assessment identity). */
  assessmentId: string;
  /** The Phase 1 product opportunity, when readiness is product-level. */
  productOpportunityId: string | null;
  /** The canonical brand SKU / product reference this readiness is about. */
  productRef: string | null;
  /** The human label of the product (for the surface — never a second identity). */
  productLabel: string | null;
  /** The Phase 1 supply profile, by reference — never copied. */
  supplyProfileId: string;
  /** Canonical brand identity key (`normalizeBrandKey`) — the SAME key BI uses. */
  dedupeKey: string;
  terms: CommercialTermValue[];
  pack: PackProfile;
  /** The evaluated conditions, in declared order. */
  conditions: RouteConditionEvaluation[];
  /** The selected route. Exactly one (exclusive gateway). */
  route: CommercialViabilityRoute;
  /** True when the gateway refused — always accompanied by a refusal reason. */
  refused: boolean;
  refusalReason: RouteRefusalReason | null;
  /** The routing decision that produced this record. */
  routingDecisionId: string;
  /** What is missing or unevaluable — stated, never hidden. */
  missingInputs: string[];
  /** The commercial field ids that are genuinely missing (for the brand's action). */
  missingTermFieldIds: CommercialTermFieldId[];
  /** What still has to be confirmed by a human. */
  openQuestions: string[];
  /** §10 — the retained assessment basis so a reassessment is reproducible. */
  assessmentInput: CommercialReadinessAssessmentInput | null;
  /** §17 — always shown wherever an MOQ is presented. */
  moqDisclaimer: string;
  nextStep: string;
  createdAt: string;
  updatedAt: string;
}