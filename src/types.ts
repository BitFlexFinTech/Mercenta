export type Environment = 'home' | 'login' | 'brand' | 'admin' | 'carrier';

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

export type SessionRole =
  | 'Brand Partner'
  | 'Mercenta Admin'
  | 'Super Admin'
  | '3PL Carrier';

export type AdminDepartment = 'business_dev' | 'logistics' | 'compliance' | 'super_admin';

export type StaffRole =
  | 'Super Admin'
  | 'Business Development'
  | 'Logistics Coordinator'
  | 'Cross-Border Logistics Lead'
  | 'UK HMRC Compliance Specialist'
  | 'Harare BAK Depot Lead'
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

export type CarrierId = 'dhl' | 'fedex' | 'bak' | 'palletline';

export type ShipmentStage =
  | 'factory_intake'
  | 'bak_depot'
  | 'international_forwarding'
  | 'uk_port_hmrc'
  | 'mercenta_hub'
  | 'live_amazon';

export const STAGE_LABELS: Record<ShipmentStage, string> = {
  factory_intake: 'Factory Intake',
  bak_depot: 'Regional Hub / Depot Processing',
  international_forwarding: 'International Forwarding',
  uk_port_hmrc: 'UK Port / HMRC Clearance',
  mercenta_hub: 'Mercenta UK Distribution Hub',
  live_amazon: 'Live on retail-channel',
};

export const STAGE_ORDER: ShipmentStage[] = [
  'factory_intake',
  'bak_depot',
  'international_forwarding',
  'uk_port_hmrc',
  'mercenta_hub',
  'live_amazon',
];

export type ShipmentStatus =
  | 'factory_intake'
  | 'bak_depot'
  | 'sea_transit'
  | 'air_transit'
  | 'uk_customs_cleared'
  | 'mercenta_hub'
  | 'live_amazon';

export const STATUS_LABELS: Record<ShipmentStatus, string> = {
  factory_intake: 'Factory Intake',
  bak_depot: 'In BAK Depot',
  sea_transit: 'Sea Transit',
  air_transit: 'Air Transit',
  uk_customs_cleared: 'UK Customs Cleared',
  mercenta_hub: 'Mercenta UK Hub',
  live_amazon: 'Live on retail-channel',
};

export const STATUS_COLORS: Record<ShipmentStatus, string> = {
  factory_intake: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
  bak_depot: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  sea_transit: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  air_transit: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  uk_customs_cleared: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  mercenta_hub: 'bg-brass-500/20 text-brass-400 border-brass-500/30',
  live_amazon: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};

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

/** §Phase E4 — canonical SIMULATED invoice raised against a commerce PO. */
export interface CommerceInvoice {
  /** Deterministic id: `cinv-<brandId>-<poNumber>`. */
  id: string;
  brandId: string;
  purchaseOrderId: string;
  poNumber: string;
  number: string;
  lines: { description: string; amountGbp: number }[];
  subtotalGbp: number;
  status: 'issued' | 'paid';
  currency: 'GBP';
  mode: CommerceMode;
  simulated: boolean;
  issuedAt: string;
  paidAt?: string;
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
  fedexConnected: boolean;
  bakConnected: boolean;
  onboarded: boolean;
  /** §5 — fulfillment track assigned to this brand */
  fulfillmentTrack: FulfillmentTrack;
  /** §3 — compliance gate status; 'blocked' prevents catalog sync */
  complianceGateStatus: 'blocked' | 'in_review' | 'cleared';
  /** §5 — answer to the working-capital qualification question */
  workingCapitalAnswer?: 'yes' | 'partially' | 'no';
  /** §13 — product category selected during onboarding, one of APPROVED_CATEGORIES */
  category?: string;
}
export type DemoRegion = 'africa' | 'usa' | 'europe';

export interface CarrierTokens {
  dhl?: string;
  fedex?: string;
  bak?: string;
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

/** §3 Compliance gate documents */
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
  status: 'missing' | 'uploaded' | 'under_review' | 'approved' | 'expiring' | 'expired';
  fileUrl?: string;
  expiryDate?: string;
  reviewedBy?: string;
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
 * §Vendor-Central deep-dive — determines which window type applies:
 * - `collect` (Amazon arranges carrier → "WePay"): PO has a **Ship Window** 
 *   (earliest/latest ship date). Vendor must submit Routing Request by 10am 
 *   Pacific the day before the ship window closes.
 * - `prepaid` (vendor arranges carrier → "TheyPay"): PO has a **Delivery Window**
 *   (date range the carrier must actually deliver to the FC).
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

export interface PurchaseOrder {
  id: string;
  brandId: string;
  poNumber: string;
  status: PurchaseOrderStatus;
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
  /** Latest ship date — Routing Request due by 10am Pacific day before this closes. */
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
    description: 'Review and accept/reject POs here. Remember: rejection affects your vendor performance — read the guidance in Settings > Operational Guidance.',
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
    title: 'Inbound Shipments',
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
  { id: 'first_shipment', label: 'Create your first shipment', hint: 'File an ASN for an accepted PO' },
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
    description: 'Purchase Orders, Inbound Shipments, Returns only.',
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

export interface GrantApplicationDraft {
  grantId: string;
  grantTitle: string;
  /** The AI-generated application content. */
  content: string;
  /** Status: draft = staged for review, submitted = approved and sent. */
  status: 'draft' | 'submitted';
  createdAt: string;
  submittedAt?: string;
  /** Who submitted it. */
  submittedBy?: string;
}

export interface InvestorOutreachDraft {
  investorId: string;
  investorName: string;
  /** The AI-generated outreach email content. */
  content: string;
  status: 'draft' | 'sent';
  createdAt: string;
  sentAt?: string;
  sentBy?: string;
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
phone: string | null;
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