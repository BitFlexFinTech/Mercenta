/**
 * §Stage-1 Demo store — THE single demo-mode source of truth.
 *
 * Every admin/brand view reads through here while DEMO_MODE is on. When a
 * real integration connects, its fetcher replaces the array for that module
 * only; consumers never change. Mutations (e.g. PO accept/reject) mutate
 * these arrays so all views see changes immediately (single source of truth).
 */
import type {
  ComplianceDocument,
  Commission,
  Contract,
  Message,
  PurchaseOrder,
  AuditLogEntry,
  ShippingMargin,
  CarrierMarkupConfig,
  Product,
  ProductSubmission,
  CatalogClientMode,
  CommerceActivity,
  CommerceActivityType,
  CommerceInvoice,
  CommercePayment,
  CommerceMode,
} from '@/types';
import {
  ALL_DEMO_BRANDS,
  DEMO_COMPLIANCE_DOCS,
  DEMO_CONTRACTS,
  DEMO_MESSAGES,
  DEMO_PRODUCTS,
  DEMO_PURCHASE_ORDERS,
  DEMO_SHIPMENTS,
  type DemoBrandRow,
  type DemoProduct,
} from './demoData';
import { notifyCanonicalStoreChange } from './prospectStore';

export type { DemoBrandRow } from './demoData';
export { ALL_DEMO_BRANDS } from './demoData';

export const demoBrands: DemoBrandRow[] = ALL_DEMO_BRANDS.map((b) => ({
  id: b.id,
  category: b.category,
  track: b.track,
  contractStatus: b.contractStatus,
  profile: { businessName: b.name },
}));

/** Products joined to their owning brand (Global Catalog Manager uses this). */
export const demoProducts = DEMO_PRODUCTS;

export const demoContracts: Contract[] = [...DEMO_CONTRACTS];

export const demoComplianceDocs: ComplianceDocument[] = [...DEMO_COMPLIANCE_DOCS];

export const demoMessages: Message[] = [...DEMO_MESSAGES];

export const demoPurchaseOrders: PurchaseOrder[] = [...DEMO_PURCHASE_ORDERS];

export const demoShipments = DEMO_SHIPMENTS.map((s, i) => ({
  ...s,
  /** Deterministic operational flags for Logistics Control. */
  delayed: i % 4 === 1,
  exception: i % 7 === 3,
}));

export const demoAuditLog: AuditLogEntry[] = [];
export const demoShippingMargins: ShippingMargin[] = [];

// §6 — deterministic demo ledger rows: Mercenta's corporate-account cost vs the
// marked-up label price collected from the brand upfront (placeholder rates
// pending real carrier contracts — see config/commercial.ts).
demoShipments.forEach((s, i) => {
  const carrierCost = Math.round(s.value * 0.055 * 100) / 100;
  const brandBilled = Math.round(s.value * 0.07 * 100) / 100;
  demoShippingMargins.push({
    id: `sm-${s.id}`,
    shipmentId: s.id,
    brandId: s.brandId ?? '',
    carrier: s.carrier,
    carrierCostPrice: carrierCost,
    brandBilledPrice: brandBilled,
    createdAt: new Date(Date.now() - (i + 1) * 864e5).toISOString(),
  });
});

/** §Stage-6 — Brand CRM mutations. */
export function setBrandTrack(
  brandId: string,
  track: 'direct_fulfillment' | 'financed',
  _reason: string
): boolean {
  const b = demoBrands.find((x) => x.id === brandId);
  if (!b) return false;
  b.track = track;
  return true;
}

export function renameBrand(brandId: string, businessName: string): boolean {
  const b = demoBrands.find((x) => x.id === brandId);
  if (!b || !businessName.trim()) return false;
  b.profile.businessName = businessName.trim();
  const demo = ALL_DEMO_BRANDS.find((x) => x.id === brandId);
  if (demo) demo.name = businessName.trim();
  return true;
}

/**
 * §Phase E2E — issue (or re-affirm) the canonical DISTRIBUTION AGREEMENT
 * contract for a brand tenant.
 *
 * The compliance gate has always required a signed/active distribution
 * agreement (`hasSignedDistributionAgreement`), but contracts were SEED-ONLY:
 * a brand created through the real application → approval → onboarding path
 * could never obtain one, so its compliance gate could never clear and the
 * catalog lifecycle could never start. This is the missing OPERATOR action,
 * writing to the ONE canonical `demoContracts` store (no second contract
 * system). Deterministic id (`contract-<brandId>`) matching the seeded
 * convention, so replaying it updates the same agreement in place.
 */
export function ensureDistributionAgreement(input: {
  brandId: string;
  signatoryName: string;
  signatoryEmail: string;
  commissionRate: number;
  monthlyFee: number;
  fulfillmentTrack: Contract['fulfillmentTrack'];
  effectiveDate: string;
  renewalDate: string;
}): Contract {
  const existing = demoContracts.find(
    (c) => c.brandId === input.brandId && c.type === 'distribution_agreement'
  );
  const signedAt = new Date().toISOString();
  if (existing) {
    existing.status = 'active';
    existing.signatories = [
      { name: input.signatoryName, email: input.signatoryEmail, signedAt },
    ];
    return existing;
  }
  const contract: Contract = {
    id: `contract-${input.brandId}`,
    brandId: input.brandId,
    type: 'distribution_agreement',
    status: 'active',
    commissionRate: input.commissionRate,
    monthlyFee: input.monthlyFee,
    fulfillmentTrack: input.fulfillmentTrack,
    effectiveDate: input.effectiveDate,
    renewalDate: input.renewalDate,
    documentUrl: '',
    signatories: [{ name: input.signatoryName, email: input.signatoryEmail, signedAt }],
    version: 1,
  };
  demoContracts.push(contract);
  return contract;
}
/** §Stage-6 — Compliance Approvals mutations. */
export function setComplianceDocStatus(
  docId: string,
  status: ComplianceDocument['status'],
  reviewer: string
): boolean {
  const d = demoComplianceDocs.find((x) => x.id === docId);
  if (!d) return false;
  d.status = status;
  d.reviewedBy = reviewer;
  return true;
}

/** §Stage-6 — amend an existing shipment's carrier/status. */
export function amendShipment(
  shipmentId: string,
  patch: { carrier?: string; status?: string }
): boolean {
  const s = demoShipments.find((x) => x.id === shipmentId);
  if (!s) return false;
  if (patch.carrier) s.carrier = patch.carrier;
  if (patch.status) s.status = patch.status;
  return true;
}

/** §11 demo billing rows derived from the same POs (single source of truth). */
export const demoSubscriptions = ALL_DEMO_BRANDS.filter((_, i) => i % 2 === 0).map(
  (b, i) => ({
    id: `sub-${b.id}`,
    brandId: b.id,
    planTier: (i % 2 === 0 ? 'growth' : 'starter') as 'starter' | 'growth',
    monthlyFee: i % 2 === 0 ? 499 : 199,
    stripeSubscriptionId: '',
    status: 'active' as const,
  })
);

/**
 * §Phase D6 — THE commission projection (single source of truth = the PO store).
 *
 * Commissions used to be computed ONCE at module load, so a purchase order
 * accepted at runtime (the Vendor Central acknowledgement the demo drives)
 * never accrued a commission and the payout ledger could never grow. The
 * accrual is now DERIVED from the canonical `demoPurchaseOrders` store at read
 * time — one source of truth, no second ledger — while the ONE piece of real
 * state a projection cannot derive (that a payout was actually settled) is
 * remembered in `SETTLED_COMMISSION_IDS`.
 *
 * Ids stay canonical (`comm-<poId>`), so a settled commission keeps its identity
 * across reads and can never be paid twice.
 */
const SETTLEABLE_PO_STATUSES: ReadonlySet<string> = new Set([
  'accepted',
  'ready_to_fulfil',
  'shipped',
  'delivered',
]);

/** The settlement ledger — the only stored commission state (status `paid`). */
const SETTLED_COMMISSION_IDS = new Set<string>();

/** Deterministic reset for demo/test replay (the canonical reset hook). */
export function resetSettledCommissions(): void {
  SETTLED_COMMISSION_IDS.clear();
}

export function listCommissionsForPayout(): Commission[] {
  return demoPurchaseOrders
    .filter((po) => SETTLEABLE_PO_STATUSES.has(po.status))
    .map((po) => {
      const id = `comm-${po.id}`;
      const settled = SETTLED_COMMISSION_IDS.has(id);
      return {
        id,
        brandId: po.brandId,
        purchaseOrderId: po.poNumber,
        poValue: po.poValue,
        commissionRate: po.commissionRate,
        commissionAmount: po.commissionAmount,
        status: (settled ? 'paid' : po.poValue >= 10_000 ? 'accrued' : 'invoiced') as Commission['status'],
        createdAt: po.orderDate,
      };
    });
}

/**
 * Snapshot of the SAME projection for the demo-seed generator and the seed
 * validators (they need a build-time array, not a live read). It is produced by
 * the function above, so the two can never drift structurally.
 */
export const demoCommissions: Commission[] = listCommissionsForPayout();

export function getCommission(id: string): Commission | undefined {
  return listCommissionsForPayout().find((c) => c.id === id);
}

/** Moves a commission to its terminal `paid` state (idempotent; the double-payout
 *  guard itself lives in `settleCommission`). */
export function markCommissionPaid(id: string): Commission | null {
  const commission = getCommission(id);
  if (!commission) return null;
  SETTLED_COMMISSION_IDS.add(id);
  return { ...commission, status: 'paid' };
}

/**
 * §Phase E3 — THE canonical catalog-submission store.
 *
 * Before E3 these were six read-only derived rows that NOTHING ever wrote to:
 * `submitCatalogItem` returned a tracking id that was thrown away, so the admin
 * retail pipeline could never reflect a real submission. They are now a mutable,
 * tenant-keyed store with the canonical `ProductSubmission` shape, carrying
 * their simulated provenance explicitly (derived fixtures, never real results).
 *
 * Ids are CANONICAL (`sub-<brandId>-<sku>`), so re-submitting the same product
 * updates its record in place instead of duplicating it (D4 idempotence), and
 * `simulated` is never absent.
 */
export const demoProductSubmissions: ProductSubmission[] = DEMO_PRODUCTS.slice(0, 6).map((p, i) => ({
  id: `sub-${p.brandId}-${p.sku}`,
  brandId: p.brandId,
  productId: p.id,
  productName: p.name,
  sku: p.sku,
  asin: i % 3 === 0 ? `B0${p.sku.replace(/-/g, '')}` : undefined,
  status: (['live', 'under_amazon_review', 'rejected'] as const)[i % 3],
  rejectionReason:
    i % 3 === 2 ? 'GTIN barcode does not match declared listing attributes.' : undefined,
  submittedAt: new Date(Date.now() - (i + 1) * 864e5).toISOString(),
  // Derived fixture, never a real provider result — labelled as simulated.
  submissionId: `SEED-SIM-${String(i + 1).padStart(5, '0')}`,
  mode: 'mock',
  simulated: true,
  polls: 0,
}));

/** Back-compat alias: the canonical store, under its previous export name. */
export const demoSubmissions = demoProductSubmissions;

/** Canonical id for a product's submission (idempotent by tenant + sku). */
export function catalogSubmissionId(brandId: string, sku: string): string {
  return `sub-${brandId}-${sku}`;
}

/**
 * Record (or re-record) a submission for a product. Called by the submission
 * seam on success, so the resulting state is observable everywhere at once.
 * NEVER sets `live`/`asin` — a freshly submitted product is `submitted`; only a
 * poll may advance it.
 */
export function recordCatalogSubmission(input: {
  brandId: string;
  productId: string;
  productName: string;
  sku: string;
  submissionId: string;
  mode: CatalogClientMode;
  simulated: boolean;
}): ProductSubmission {
  const id = catalogSubmissionId(input.brandId, input.sku);
  const record: ProductSubmission = {
    id,
    brandId: input.brandId,
    productId: input.productId,
    productName: input.productName,
    sku: input.sku,
    status: 'submitted',
    submittedAt: new Date().toISOString(),
    submissionId: input.submissionId,
    mode: input.mode,
    simulated: input.simulated,
    polls: 0,
  };
  const existing = demoProductSubmissions.findIndex((s) => s.id === id);
  if (existing >= 0) demoProductSubmissions[existing] = record;
  else demoProductSubmissions.unshift(record);
  notifyCanonicalStoreChange();
  return record;
}
/** Update a submission's resulting state (status / rejection / polls). */
export function updateCatalogSubmission(
  id: string,
  patch: Partial<Omit<ProductSubmission, 'id' | 'brandId'>>
): ProductSubmission | null {
  const idx = demoProductSubmissions.findIndex((s) => s.id === id);
  if (idx < 0) return null;
  const current = demoProductSubmissions[idx];
  const next: ProductSubmission = { ...current, ...patch, id: current.id, brandId: current.brandId };
  demoProductSubmissions[idx] = next;
  notifyCanonicalStoreChange();
  return next;
}

export function getCatalogSubmission(id: string): ProductSubmission | undefined {
  return demoProductSubmissions.find((s) => s.id === id);
}

/** Every submission owned by a tenant (the only read a brand scope may make). */
export function getSubmissionsForBrand(brandId: string): ProductSubmission[] {
  return demoProductSubmissions.filter((s) => s.brandId === brandId);
}

/** The most recent submission for one product — the derived catalog state. */
export function latestSubmissionForProduct(
  brandId: string,
  sku: string
): ProductSubmission | undefined {
  const mine = demoProductSubmissions.filter((s) => s.brandId === brandId && s.sku === sku);
  if (!mine.length) return undefined;
  return mine.reduce((a, b) => (b.submittedAt > a.submittedAt ? b : a));
}

/**
 * §Phase E3 — create or update a product for a tenant.
 *
 * Idempotent by (brandId, sku) so a replayed creation cannot duplicate a SKU.
 * The product is written into the SAME canonical catalog collection the admin
 * catalog and `fetchProducts` already read — there is no second product store.
 */
export function addCatalogProduct(brandId: string, product: Product): DemoProduct {
  const existing = DEMO_PRODUCTS.findIndex((p) => p.brandId === brandId && p.sku === product.sku);
  if (existing >= 0) {
    const merged: DemoProduct = {
      ...DEMO_PRODUCTS[existing],
      ...product,
      brandId,
      id: DEMO_PRODUCTS[existing].id,
    };
    DEMO_PRODUCTS[existing] = merged;
    notifyCanonicalStoreChange();
    return merged;
  }
  const created: DemoProduct = {
    ...product,
    id: product.id || `prd-${brandId}-${product.sku}`,
    brandId,
  };
  DEMO_PRODUCTS.push(created);
  notifyCanonicalStoreChange();
  return created;
}

/** Find one tenant's product by SKU (tenant-scoped, never global). */
export function findCatalogProduct(brandId: string, sku: string): DemoProduct | undefined {
  return DEMO_PRODUCTS.find((p) => p.brandId === brandId && p.sku === sku);
}

/** Every product owned by a tenant. */
export function productsForBrandFromStore(brandId: string): DemoProduct[] {
  return DEMO_PRODUCTS.filter((p) => p.brandId === brandId);
}

/** §Phase E3 — catalog operations are audited on the existing platform log. */
export function recordCatalogAudit(
  action: string,
  entityId: string,
  brandId: string,
  reason: string,
  actorId: string,
  metadata: Record<string, unknown> = {}
): AuditLogEntry {
  const entry: AuditLogEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    actorId,
    action,
    entityType: 'catalog_submission',
    entityId,
    brandId,
    reason,
    metadata,
  };
  demoAuditLog.push(entry);
  return entry;
}


/* ── §Phase E4 — Commerce / operational-simulation stores ──────────────────
 *
 * ONE canonical home for the operational commerce records that the D4
 * persistence port mirrors. The PO and shipment STATE stays on the EXISTING
 * `demoPurchaseOrders` / `demoShipments` arrays (never duplicated); these
 * stores hold the canonical operational activity trail, the simulated invoice
 * and the simulated payment.
 */

export const demoCommerceActivities: CommerceActivity[] = [];
export const demoCommerceInvoices: CommerceInvoice[] = [];
export const demoCommercePayments: CommercePayment[] = [];

/** The number derived so far for one (brand, activity-type) pair. */
export function nextCommerceSequence(brandId: string, type: CommerceActivityType): number {
  return demoCommerceActivities.filter((a) => a.brandId === brandId && a.type === type).length + 1;
}

/** Deterministic id for one operational activity step. */
export function commerceActivityId(
  brandId: string,
  type: CommerceActivityType,
  sequence: number
): string {
  return `com-${brandId}-${type}-${sequence}`;
}

/**
 * Append ONE operational activity. IDEMPOTENT by canonical id: a replayed step
 * returns the existing record instead of duplicating the trail.
 */
export function recordCommerceActivity(
  activity: Omit<CommerceActivity, 'at'> & { at?: string }
): CommerceActivity {
  const existing = demoCommerceActivities.find((a) => a.id === activity.id);
  if (existing) return existing;
  const record: CommerceActivity = {
    ...activity,
    at: activity.at ?? new Date().toISOString(),
  };
  demoCommerceActivities.push(record);
  return record;
}

export function getCommerceActivity(id: string): CommerceActivity | undefined {
  return demoCommerceActivities.find((a) => a.id === id);
}

export function getAllCommerceActivities(): CommerceActivity[] {
  return demoCommerceActivities;
}

export function getCommerceActivitiesForBrand(brandId: string): CommerceActivity[] {
  return demoCommerceActivities.filter((a) => a.brandId === brandId);
}

/** Upsert a simulated invoice — idempotent on the canonical id. */
export function recordCommerceInvoice(invoice: CommerceInvoice): CommerceInvoice {
  const existing = demoCommerceInvoices.find((i) => i.id === invoice.id);
  if (existing) return existing;
  demoCommerceInvoices.push(invoice);
  return invoice;
}

export function updateCommerceInvoice(
  id: string,
  patch: Partial<CommerceInvoice>
): CommerceInvoice | undefined {
  const invoice = demoCommerceInvoices.find((i) => i.id === id);
  if (!invoice) return undefined;
  Object.assign(invoice, patch);
  return invoice;
}

export function getCommerceInvoice(id: string): CommerceInvoice | undefined {
  return demoCommerceInvoices.find((i) => i.id === id);
}

/** The canonical invoice for a PO — the invoice is keyed by the PO, never copied. */
export function getCommerceInvoiceForPo(purchaseOrderId: string): CommerceInvoice | undefined {
  return demoCommerceInvoices.find((i) => i.purchaseOrderId === purchaseOrderId);
}

export function getCommerceInvoicesForBrand(brandId: string): CommerceInvoice[] {
  return demoCommerceInvoices.filter((i) => i.brandId === brandId);
}

/** Upsert a simulated payment — idempotent on the canonical id. */
export function recordCommercePayment(payment: CommercePayment): CommercePayment {
  const existing = demoCommercePayments.find((p) => p.id === payment.id);
  if (existing) return existing;
  demoCommercePayments.push(payment);
  return payment;
}

export function getCommercePayment(id: string): CommercePayment | undefined {
  return demoCommercePayments.find((p) => p.id === id);
}

export function getCommercePaymentsForInvoice(invoiceId: string): CommercePayment[] {
  return demoCommercePayments.filter((p) => p.invoiceId === invoiceId);
}

export function getCommercePaymentsForBrand(brandId: string): CommercePayment[] {
  return demoCommercePayments.filter((p) => p.brandId === brandId);
}

/**
 * §Phase E4 — commerce operations are audited on the EXISTING platform log
 * (`demoAuditLog`). No second audit system.
 */
export function recordCommerceAudit(
  action: string,
  entityId: string,
  brandId: string,
  reason: string,
  actorId: string,
  metadata: Record<string, unknown> = {}
): AuditLogEntry {
  const entry: AuditLogEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    actorId,
    action,
    entityType: 'commerce',
    entityId,
    brandId,
    reason,
    metadata,
  };
  demoAuditLog.push(entry);
  return entry;
}

/** The truthful mode of the commerce simulation in this environment. */
export const COMMERCE_SIMULATION_MODE: CommerceMode = 'simulation';



/** §19.1 deductions ledger — DERIVED from demoPurchaseOrders (never
 *  hand-maintained PO references), covering every lifecycle state:
 *  open, disputed (pending outcome), accepted, resolved (won/lost). */
export const demoDeductions: import('@/types').Deduction[] = (() => {
  const byIndex = (i: number) =>
    demoPurchaseOrders[i % Math.max(demoPurchaseOrders.length, 1)];
  const iso = (daysAgo: number) =>
    new Date(Date.now() - daysAgo * 864e5).toISOString().slice(0, 10);
  const rows: Array<
    Omit<import('@/types').Deduction, 'id' | 'brandId' | 'purchaseOrderId'> & { poIdx: number }
  > = [
    { poIdx: 1, type: 'late_shipment', amountGbp: 84.5, reason: 'Shipment confirmed after the required-by date.', status: 'open', date: iso(6) },
    { poIdx: 4, type: 'shortage_claim', amountGbp: 212.0, reason: 'Received quantity 12 units short of PO line 1.', status: 'disputed', evidenceNotes: 'Carrier POD shows full carton count; weighing ticket requested.', dispute: { openedAt: iso(3), notes: 'POD + carton photos submitted to the retail channel; awaiting review.', outcome: undefined }, date: iso(9) },
    { poIdx: 7, type: 'mislabeled_carton', amountGbp: 65.0, reason: 'Carton label barcode did not scan at receiving.', status: 'accepted', evidenceNotes: 'Label print error confirmed internally.', date: iso(14) },
    { poIdx: 10, type: 'non_compliance_fine', amountGbp: 150.0, reason: 'Missing safety documentation on imported line.', status: 'resolved', dispute: { openedAt: iso(21), notes: 'Documentation existed but was not attached to the shipment record.', outcome: 'won' }, date: iso(28) },
    { poIdx: 13, type: 'co_op', amountGbp: 40.0, reason: 'Co-op marketing accrual per programme terms.', status: 'open', date: iso(4) },
    { poIdx: 13, type: 'co_op', amountGbp: 40.0, reason: 'Co-op marketing accrual per programme terms.', status: 'open', date: iso(4) },
    { poIdx: 2, type: 'unfilled_by_cancel_date', amountGbp: 320.0, reason: 'PO auto-cancelled before full quantity received — charged per retail channel vendor shipment manual.', status: 'open', date: iso(5) },
    { poIdx: 8, type: 'po_on_time_accuracy', amountGbp: 175.5, reason: 'Missed Freight Ready Date — carrier could not deliver within the assigned delivery window.', status: 'open', date: iso(7) },
    { poIdx: 16, type: 'shortage_claim', amountGbp: 96.25, reason: 'Carton short by 5 units vs ASIN receiving report.', status: 'resolved', dispute: { openedAt: iso(30), notes: 'Re-count confirmed shortage.', outcome: 'lost' }, date: iso(35) },
  ];
  return rows.flatMap((r, i) => {
    const po = byIndex(r.poIdx);
    if (!po) return [];
    const { poIdx: _poIdx, ...rest } = r;
    void _poIdx;
    return [{
      ...rest,
      id: `ded-${i + 1}`,
      brandId: po.brandId,
      purchaseOrderId: po.poNumber,
    }];
  });
})();

/** §19.1 deduction mutations — visible to every view immediately. */
export function setDeductionStatus(
  id: string,
  status: import('@/types').DeductionStatus
): import('@/types').Deduction | null {
  const d = demoDeductions.find((x) => x.id === id);
  if (!d) return null;
  d.status = status;
  return d;
}

export function disputeDeduction(id: string, notes: string): import('@/types').Deduction | null {
  const d = demoDeductions.find((x) => x.id === id);
  if (!d || !notes.trim()) return null;
  d.status = 'disputed';
  d.dispute = {
    openedAt: new Date().toISOString().slice(0, 10),
    notes: notes.trim(),
    outcome: d.dispute?.outcome,
  };
  // §7D — audit trail: opening a dispute is an admin action that must be
  // attributable in the platform-wide Admin Audit Log.
  demoAuditLog.push({
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    actorId: 'admin',
    action: 'deduction_disputed',
    entityType: 'deduction',
    entityId: d.id,
    brandId: d.brandId,
    reason: `Dispute opened on ${d.type.replace(/_/g, ' ')} (${d.purchaseOrderId}): ${notes.trim()}`,
  });
  return d;
}

export function recordDisputeOutcome(
  id: string,
  outcome: import('@/types').DisputeOutcome
): import('@/types').Deduction | null {
  const d = demoDeductions.find((x) => x.id === id);
  if (!d || !d.dispute) return null;
  d.dispute.outcome = outcome;
  d.status = 'resolved';
  // §7D — audit trail: dispute resolutions are recorded with the outcome so the
  // Admin Audit Log is a complete, attributable record of the workflow.
  demoAuditLog.push({
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    actorId: 'admin',
    action: 'deduction_dispute_resolved',
    entityType: 'deduction',
    entityId: d.id,
    brandId: d.brandId,
    reason: `Dispute resolved as ${outcome} on ${d.type.replace(/_/g, ' ')} (${d.purchaseOrderId})`,
  });
  return d;
}

/** §Stage-24 — create a deduction from operational events (ASN shortfall). */
export function createDeductionInStore(
  input: Omit<import('@/types').Deduction, 'id'> & { id?: string }
): import('@/types').Deduction {
  const ded: import('@/types').Deduction = {
    ...input,
    // §Phase E2E — an optional deterministic id makes a replayable demo run
    // produce the SAME ledger identity; the public path is unchanged.
    id: input.id ?? `ded-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  };
  demoDeductions.unshift(ded);
  return ded;
}


/** §12 ad-spend rows for a third of brands (rest not_configured). */
export const demoAdSpend = ALL_DEMO_BRANDS.filter((_, i) => i % 3 === 0).map((b) => ({
  brandId: b.id,
  monthlyBudgetGbp: 1200,
  spendToDateGbp: 480,
  acos: 0.24,
  tacos: 0.31,
  status: 'active' as const,
}));

/** §5 scores — deterministic spread incl. borderline band and low scores. */
const SCORE_TOTALS = [88, 62, 45, 79, 71, 92, 38, 84, 58, 96, 73];
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const demoFulfillmentScores = ALL_DEMO_BRANDS.map((b, i) => {
  const T = SCORE_TOTALS[i % SCORE_TOTALS.length];
  let th = clamp(Math.round(T * 0.25), 0, 20);
  const ee = clamp(Math.round(T * 0.15), 0, 15);
  const sc = clamp(Math.round(T * 0.25), 0, 20);
  const wc = clamp(Math.round(T * 0.2), 0, 20);
  const cr = clamp(Math.round(T * 0.15), 0, 15);
  let rel = T - th - ee - sc - wc - cr;
  // Fold any overflow/underflow back into the largest bucket.
  if (rel < 0 || rel > 10) {
    const over = rel;
    rel = clamp(rel, 0, 10);
    th += over - rel;
    th = clamp(th, 0, 20);
    rel = T - th - ee - sc - wc - cr;
    rel = clamp(rel, 0, 10);
  }
  const components = {
    tradingHistoryScore: th,
    exportExperienceScore: ee,
    scaleScore: sc,
    workingCapitalScore: wc,
    categoryRiskScore: cr,
    reliabilityScore: rel,
  };
  const totalScore =
    th + ee + sc + wc + cr + rel;
  return {
    brandId: b.id,
    ...components,
    totalScore,
    track: b.track as 'direct_fulfillment' | 'financed',
    manualOverride: false,
    lastCalculated: new Date().toISOString(),
  };
});

/** PO workflow mutation — visible to every view immediately. */
export function setPurchaseOrderStatus(
  id: string,
  status: PurchaseOrder['status'],
  rejectionReason?: string
): PurchaseOrder | null {
  const po = demoPurchaseOrders.find((p) => p.id === id);
  if (!po) return null;
  po.status = status;
  if (status === 'rejected') po.rejectionReason = rejectionReason;
  return po;
}

/* ── §Stage-25 — delivery-time reconciliation (confirmed vs received) ─────── */

export interface DeliveryReconciliationResult {
  po: PurchaseOrder;
  /** Lines where received < confirmed (acknowledged) quantity. */
  shortfalls: { sku: string; confirmedQty: number; receivedQty: number }[];
  deductionsCreated: import('@/types').Deduction[];
}

/**
 * §Stage-24/25 — SECOND reconciliation point. At ASN filing time the ASN is
 * validated against acknowledged quantities; here, once the retail channel's
 * receiving system logs what ACTUALLY arrived, confirmed quantity is compared
 * against received quantity per line. Any shortfall automatically raises a
 * shortage_claim Deduction so the billing ledger and operations never drift.
 */
export function reconcileDelivery(
  poId: string,
  receivedBySku: Record<string, number>,
  actorId = 'admin'
): DeliveryReconciliationResult | null {
  const po = demoPurchaseOrders.find((p) => p.id === poId);
  if (!po) return null;

  const shortfalls: DeliveryReconciliationResult['shortfalls'] = [];
  for (const line of po.lineItems) {
    const confirmed =
      line.acknowledgedQty ?? (line.ackStatus === 'accepted' ? line.quantity : 0);
    const received = Math.max(0, Math.floor(receivedBySku[line.sku] ?? 0));
    // Receiving can never exceed what was confirmed — clamp, never fabricate.
    line.receivedQty = Math.min(received, confirmed || received);
    if (confirmed > line.receivedQty) {
      shortfalls.push({
        sku: line.sku,
        confirmedQty: confirmed,
        receivedQty: line.receivedQty,
      });
    }
  }

  const deductionsCreated: import('@/types').Deduction[] = [];
  for (const s of shortfalls) {
    const unitPrice =
      po.lineItems.find((l) => l.sku === s.sku)?.unitPrice ?? 0;
    deductionsCreated.push(
      createDeductionInStore({
        brandId: po.brandId,
        purchaseOrderId: po.poNumber,
        type: 'shortage_claim',
        amountGbp:
          Math.round((s.confirmedQty - s.receivedQty) * unitPrice * 100) / 100,
        reason: `Delivery shortfall on ${po.poNumber}: SKU ${s.sku} confirmed ${s.confirmedQty}, received ${s.receivedQty}`,
        status: 'open',
        date: new Date().toISOString().slice(0, 10),
        evidenceNotes: 'Auto-raised by delivery-time reconciliation (received vs confirmed).',
      })
    );
  }

  demoAuditLog.push({
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    actorId,
    action: 'delivery_reconciliation',
    entityType: 'purchase_order',
    entityId: po.id,
    brandId: po.brandId,
    reason:
      shortfalls.length === 0
        ? 'Received matches confirmed quantities'
        : `${shortfalls.length} line shortfall(s) → ${deductionsCreated.length} deduction(s) raised`,
    metadata: { shortfalls },
  });

  return { po, shortfalls, deductionsCreated };
}

/* ── §Stage-25 — brand self-service profile/banking change requests ───────── */

/**
 * §Phase 7F — deterministic seeded pending requests so the admin CRM's
 * profile-change review UI is genuinely exercisable (previously empty → the
 * E2E could only conditionally skip). Both belong to Zambezi (the CRM's
 * default test brand); them staying 'pending' is what makes the review card
 * render. Reviewing mutates this array exactly like runtime requests.
 */
export const demoProfileChangeRequests: import('@/types').ProfileChangeRequest[] = [
  {
    id: 'pcr-seed-zambezi-signatory-001',
    brandId: 'brand-zambezi',
    field: 'signatory',
    currentValue: 'Tendai Moyo',
    requestedValue: 'Tendai A. Moyo',
    reason: 'Official signatory title update after registration change',
    status: 'pending',
    requestedAt: '2026-09-01T09:15:00.000Z',
  },
  {
    id: 'pcr-seed-zambezi-phone-002',
    brandId: 'brand-zambezi',
    field: 'phone',
    currentValue: '+263 712 345 678',
    requestedValue: '+263 713 555 999',
    reason: 'HQ phone line changed with new carrier',
    status: 'pending',
    requestedAt: '2026-09-03T14:40:00.000Z',
  },
];

export function requestProfileChange(input: {
  brandId: string;
  field: import('@/types').ProfileChangeField;
  currentValue: string;
  requestedValue: string;
  reason: string;
}): import('@/types').ProfileChangeRequest {
  if (!input.requestedValue.trim()) throw new Error('[store] requested value required');
  if (!input.reason.trim()) throw new Error('[store] reason required');
  const req: import('@/types').ProfileChangeRequest = {
    ...input,
    id: `pcr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    status: 'pending',
    requestedAt: new Date().toISOString(),
  };
  demoProfileChangeRequests.unshift(req);
  return req;
}

/**
 * Admin review of a self-service change request. When approving a
 * businessName change the brand row is renamed through the same mutation the
 * CRM uses; banking fields are returned for the caller to persist onto the
 * brand profile (single write path, no silent direct edits).
 */
export function reviewProfileChangeRequest(
  id: string,
  approve: boolean,
  reviewedByStaffId: string,
  reviewNote?: string
): import('@/types').ProfileChangeRequest | null {
  const req = demoProfileChangeRequests.find((r) => r.id === id);
  if (!req || req.status !== 'pending') return null;
  req.status = approve ? 'approved' : 'rejected';
  req.reviewedByStaffId = reviewedByStaffId;
  req.reviewedAt = new Date().toISOString();
  if (reviewNote) req.reviewNote = reviewNote;
  if (approve && req.field === 'businessName') {
    renameBrand(req.brandId, req.requestedValue);
  }
  demoAuditLog.push({
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    actorId: reviewedByStaffId,
    action: approve ? 'profile_change_approved' : 'profile_change_rejected',
    entityType: 'profile_change_request',
    entityId: req.id,
    brandId: req.brandId,
    reason: `${req.field}: ${req.currentValue || '(empty)'} → ${req.requestedValue}${reviewNote ? ` — ${reviewNote}` : ''}`,
  });
  return req;
}

/* ── §Batch-2 — Brand Settings suite seed data ────────────────────── */

import type {
  BrandBankInfo,
  BrandTeamMember,
  BrandPoOutage,
  BrandReturnAddress,
  NotificationPreference,
  BrandReturn,
  NotificationEventType,
  NotificationChannel,
} from '@/types';

/* ── Bank Information (one per brand) ─────────────────────────────── */
export const demoBankInfo: BrandBankInfo[] = ALL_DEMO_BRANDS.map((b, i) => ({
  id: `bank-${b.id}`,
  brandId: b.id,
  accountHolderName: b.name,
  bankName: ['Barclays', 'HSBC', 'Lloyds', 'NatWest', 'Standard Chartered'][i % 5],
  accountNumber: `${10000000 + i * 1111}`.slice(0, 8),
  sortCode: `20-${20 + i}-${10 + i}`,
  iban: `GB${i}${i}BARC${20000000 + i * 111111}`,
  bic: `BARCGB22`,
  currency: 'GBP',
  status: 'current',
}));

export function getBankInfo(brandId: string): BrandBankInfo | undefined {
  return demoBankInfo.find((b) => b.brandId === brandId);
}

export function requestBankChange(
  brandId: string,
  field: keyof BrandBankInfo,
  currentValue: string,
  requestedValue: string,
  reason: string
): BrandBankInfo | null {
  const info = demoBankInfo.find((b) => b.brandId === brandId);
  if (!info) return null;
  info.status = 'pending_approval';
  info.requestedChange = {
    field,
    currentValue,
    requestedValue,
    reason,
    requestedAt: new Date().toISOString(),
  };
  return info;
}

export function approveBankChange(brandId: string): BrandBankInfo | null {
  const info = demoBankInfo.find((b) => b.brandId === brandId);
  if (!info || !info.requestedChange) return null;
  const { field, requestedValue } = info.requestedChange;
  (info as unknown as Record<string, string>)[field] = requestedValue;
  info.status = 'current';
  info.requestedChange = undefined;
  return info;
}

/* ── Team Members (brand-side multi-user) ─────────────────────────── */
export const demoTeamMembers: BrandTeamMember[] = [
  { id: 'tm-1', brandId: 'brand-1', name: 'Jane Moyo', email: 'jane@zambeziextracts.co.zw', role: 'Owner', active: true, invitedAt: new Date(Date.now() - 120 * 864e5).toISOString() },
  { id: 'tm-2', brandId: 'brand-1', name: 'Tendai Banda', email: 'tendai@zambeziextracts.co.zw', role: 'Accounts', active: true, invitedAt: new Date(Date.now() - 90 * 864e5).toISOString() },
  { id: 'tm-3', brandId: 'brand-1', name: 'Chipo Dube', email: 'chipo@zambeziextracts.co.zw', role: 'Shipping', active: false, invitedAt: new Date(Date.now() - 60 * 864e5).toISOString() },
  { id: 'tm-4', brandId: 'brand-2', name: 'Kwame Asante', email: 'kwame@ghanaspices.com', role: 'Owner', active: true, invitedAt: new Date(Date.now() - 110 * 864e5).toISOString() },
  { id: 'tm-5', brandId: 'brand-2', name: 'Ama Serwaa', email: 'ama@ghanaspices.com', role: 'Shipping', active: true, invitedAt: new Date(Date.now() - 80 * 864e5).toISOString() },
];

export function addTeamMember(member: BrandTeamMember): BrandTeamMember {
  demoTeamMembers.push(member);
  return member;
}

export function updateTeamMember(id: string, updates: Partial<BrandTeamMember>): BrandTeamMember | null {
  const m = demoTeamMembers.find((x) => x.id === id);
  if (!m) return null;
  Object.assign(m, updates);
  return m;
}

export function removeTeamMember(id: string): boolean {
  const idx = demoTeamMembers.findIndex((x) => x.id === id);
  if (idx === -1) return false;
  demoTeamMembers.splice(idx, 1);
  return true;
}

/* ── PO Outages ───────────────────────────────────────────────────── */
export const demoPoOutages: BrandPoOutage[] = [
  {
    id: 'out-1', brandId: 'brand-1',
    startDate: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 21 * 864e5).toISOString().slice(0, 10),
    reason: 'Annual factory maintenance shutdown',
    status: 'active',
    createdAt: new Date(Date.now() - 7 * 864e5).toISOString(),
  },
  {
    id: 'out-2', brandId: 'brand-2',
    startDate: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 37 * 864e5).toISOString().slice(0, 10),
    reason: 'Raw material supply disruption',
    status: 'active',
    createdAt: new Date(Date.now() - 3 * 864e5).toISOString(),
  },
];

export function addPoOutage(outage: Omit<BrandPoOutage, 'id' | 'createdAt'>): BrandPoOutage {
  const full: BrandPoOutage = {
    ...outage,
    id: `out-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  demoPoOutages.unshift(full);
  return full;
}

export function cancelPoOutage(id: string): BrandPoOutage | null {
  const o = demoPoOutages.find((x) => x.id === id);
  if (!o) return null;
  o.status = 'cancelled';
  return o;
}

/* ── Return Addresses ─────────────────────────────────────────────── */
export const demoReturnAddresses: BrandReturnAddress[] = [
  {
    id: 'ra-1', brandId: 'brand-1', label: 'UK Returns — Standard',
    companyName: 'Zambezi Organic Extracts Ltd',
    addressLine1: 'Unit 4, Mercenta Fulfilment Park', addressLine2: 'Magna Way',
    city: 'Northampton', postalCode: 'NN3 5FZ', country: 'United Kingdom',
    contactName: 'Jane Moyo', contactPhone: '+44 7700 900123', isDefault: true,
  },
  {
    id: 'ra-2', brandId: 'brand-2', label: 'UK Returns — Standard',
    companyName: 'Ghana Spice Co. Ltd',
    addressLine1: 'c/o Mercenta Hub', addressLine2: 'Unit 12, Phoenix Distribution Centre',
    city: 'Rugby', postalCode: 'CV23 0WE', country: 'United Kingdom',
    contactName: 'Kwame Asante', contactPhone: '+44 7700 900456', isDefault: true,
  },
];

export function addReturnAddress(addr: Omit<BrandReturnAddress, 'id'>): BrandReturnAddress {
  const full: BrandReturnAddress = {
    ...addr,
    id: `ra-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  };
  if (full.isDefault) demoReturnAddresses.forEach((a) => { if (a.brandId === full.brandId) a.isDefault = false; });
  demoReturnAddresses.push(full);
  return full;
}

export function updateReturnAddress(id: string, updates: Partial<BrandReturnAddress>): BrandReturnAddress | null {
  const a = demoReturnAddresses.find((x) => x.id === id);
  if (!a) return null;
  if (updates.isDefault) demoReturnAddresses.forEach((r) => { if (r.brandId === a.brandId) r.isDefault = false; });
  Object.assign(a, updates);
  return a;
}

export function removeReturnAddress(id: string): boolean {
  const idx = demoReturnAddresses.findIndex((x) => x.id === id);
  if (idx === -1) return false;
  demoReturnAddresses.splice(idx, 1);
  return true;
}

/* ── Notification Preferences ─────────────────────────────────────── */
const ALL_EVENT_TYPES: NotificationEventType[] = [
  'po_received', 'po_acknowledgment_deadline', 'shipment_departed',
  'shipment_delivered', 'compliance_doc_approved', 'compliance_doc_rejected',
  'deduction_raised', 'contract_renewal', 'outage_about_to_start', 'return_authorized',
];

const DEFAULT_CHANNELS: NotificationChannel[] = ['email', 'in_app'];

export const demoNotificationPrefs: NotificationPreference[] = ALL_DEMO_BRANDS.flatMap((b) =>
  ALL_EVENT_TYPES.map((et, i) => ({
    id: `np-${b.id}-${et}`,
    brandId: b.id,
    eventType: et,
    channels: i % 5 === 0 ? ['email'] as NotificationChannel[] : [...DEFAULT_CHANNELS],
    enabled: i % 7 !== 0,
  }))
);

export function updateNotificationPref(
  id: string,
  updates: Partial<NotificationPreference>
): NotificationPreference | null {
  const p = demoNotificationPrefs.find((x) => x.id === id);
  if (!p) return null;
  Object.assign(p, updates);
  return p;
}

/* ── Brand Returns ────────────────────────────────────────────────── */
/**
 * §Phase D6 — REAL DEFECT FIXED (tenant coherence).
 *
 * The returns seed was hand-written against a PARALLEL SKU/PO universe that does
 * not exist in any store: a Zambezi return pointed at **DeskForge's PO-9003**,
 * another at the non-existent **PO-9005** for a brand that owns no products or
 * POs at all, and their SKUs (`SPB-*`/`GSP-*`) belong to no brand. The effect was
 * visible: a brand's own dashboard showed ANOTHER TENANT'S purchase-order number
 * in its returns attention row, and the Returns ledger referenced phantom
 * products.
 *
 * Returns are now DERIVED from the canonical PO store + the canonical product
 * store, so a return can only ever reference a PO number and a SKU that its own
 * brand actually owns — the seed cannot drift from the data it describes.
 * `linkedDeductionId` is resolved from the canonical deductions for the SAME PO,
 * so a linked deduction can never belong to a different tenant either.
 */
export const demoReturns: BrandReturn[] = (() => {
  const narratives: { reason: BrandReturn['reason']; description: string; quantity: number }[] = [
    {
      reason: 'defective',
      description: 'Bottle caps not sealed on 2 cases — product leaked during transit.',
      quantity: 24,
    },
    {
      reason: 'quality_issue',
      description: 'Moisture content exceeded spec per lab report from receiving QC.',
      quantity: 12,
    },
    {
      reason: 'damaged_in_transit',
      description: 'Carton crushed by pallet over-stacking. 6 units unsaleable.',
      quantity: 6,
    },
  ];
  return narratives.flatMap((n, i) => {
    const po = demoPurchaseOrders[i % Math.max(demoPurchaseOrders.length, 1)];
    if (!po) return [];
    const product = productsForBrandFromStore(po.brandId)[0];
    if (!product) return [];
    return [
      {
        id: `ret-${i + 1}`,
        brandId: po.brandId,
        poNumber: po.poNumber,
        productSku: product.sku,
        productName: product.name,
        quantity: n.quantity,
        reason: n.reason,
        description: n.description,
        returnDate: new Date(Date.now() - (i + 2) * 864e5).toISOString().slice(0, 10),
        // Same tenant, same PO — or no link at all.
        linkedDeductionId: demoDeductions.find((d) => d.purchaseOrderId === po.poNumber)?.id,
      },
    ];
  });
})();

export function addReturn(ret: Omit<BrandReturn, 'id'> & { id?: string }): BrandReturn {
  const full: BrandReturn = {
    ...ret,
    // §Phase E2E — a replayable demo run supplies its own deterministic id; the
    // public path is unchanged (timestamp + random suffix).
    id: ret.id ?? `ret-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  };
  demoReturns.unshift(full);
  return full;
}

import type { BrandAgreement, BrandAgreementType } from '@/types';

/* ── §Legal — Brand agreements store ───────────────────────────────── */

/** Seed both mandatory agreements for all 11 demo brands. */
const now = new Date();
export const demoBrandAgreements: BrandAgreement[] = ALL_DEMO_BRANDS.flatMap((brand) => [
  {
    id: `ba-${brand.id}-logistics_sla-seed`,
    brandId: brand.id,
    agreementType: 'logistics_sla' as BrandAgreementType,
    acceptedAt: new Date(now.getTime() - 864e5).toISOString(),
    version: '1.0',
  },
  {
    id: `ba-${brand.id}-chargeback_indemnity-seed`,
    brandId: brand.id,
    agreementType: 'chargeback_indemnity' as BrandAgreementType,
    acceptedAt: new Date(now.getTime() - 864e5).toISOString(),
    version: '1.0',
  },
]);

export function acceptBrandAgreement(
  brandId: string,
  agreementType: BrandAgreementType,
  version: string
): BrandAgreement {
  // Remove any existing acceptance for this brand+type (re-acceptance)
  const existingIdx = demoBrandAgreements.findIndex(
    (a) => a.brandId === brandId && a.agreementType === agreementType
  );
  if (existingIdx !== -1) {
    demoBrandAgreements.splice(existingIdx, 1);
  }
  const record: BrandAgreement = {
    id: `ba-${brandId}-${agreementType}-${Date.now()}`,
    brandId,
    agreementType,
    acceptedAt: new Date().toISOString(),
    version,
  };
  demoBrandAgreements.push(record);
  return record;
}

export function getBrandAgreements(brandId: string): BrandAgreement[] {
  return demoBrandAgreements.filter((a) => a.brandId === brandId);
}

export function hasAcceptedAgreement(brandId: string, agreementType: BrandAgreementType): boolean {
  return demoBrandAgreements.some(
    (a) => a.brandId === brandId && a.agreementType === agreementType
  );
}
export function updateProductAvailability(
  sku: string,
  isAvailable: boolean,
  leadTimeDays?: number
): boolean {
  const p = DEMO_PRODUCTS.find((x) => x.sku === sku);
  if (!p) return false;
  p.isAvailable = isAvailable;
  if (leadTimeDays !== undefined) p.leadTimeDays = leadTimeDays;
  return true;
}

export function updateProductCost(sku: string, exWorksPrice: number): boolean {
  const p = DEMO_PRODUCTS.find((x) => x.sku === sku);
  if (!p) return false;
  p.exWorksPrice = exWorksPrice;
  return true;
}

/* ── §Batch-14 — Admin-configurable carrier markup ────────────── */

/** Default per-carrier markup rates. Admin can change these via Super Admin Panel. */
export const demoCarrierMarkup: CarrierMarkupConfig[] = [
  { id: 'markup-global', carrier: 'global', markupType: 'percentage', markupValue: 0.07, active: true, label: 'Default (all carriers)' },
  { id: 'markup-dhl', carrier: 'dhl', markupType: 'percentage', markupValue: 0.07, active: true, label: 'DHL Express' },
  { id: 'markup-fedex', carrier: 'fedex', markupType: 'percentage', markupValue: 0.07, active: true, label: 'FedEx International' },
  { id: 'markup-bak', carrier: 'bak', markupType: 'percentage', markupValue: 0.05, active: true, label: 'BAK Logistics (sea freight)' },
  { id: 'markup-palletline', carrier: 'palletline', markupType: 'percentage', markupValue: 0.08, active: true, label: 'Palletline (palletised)' },
];

/** Update a carrier markup config. Returns true if found and updated. */
export function updateCarrierMarkup(id: string, updates: Partial<Pick<CarrierMarkupConfig, 'markupValue' | 'active'>>): boolean {
  const entry = demoCarrierMarkup.find((m) => m.id === id);
  if (!entry) return false;
  Object.assign(entry, updates);
  return true;
}

/* ── §Priority-1 — Compliance verification stores (Companies House / HMRC) ── */

import type { CompanyVerification, HmrcFiling } from '@/types';

export const demoCompanyVerifications: CompanyVerification[] = [];
export const demoHmrcFilings: HmrcFiling[] = [];

/** Upsert a brand's Companies House verification record (tenant-keyed). */
export function setCompanyVerification(
  brandId: string,
  patch: Omit<CompanyVerification, 'id' | 'brandId'>
): CompanyVerification {
  const existing = demoCompanyVerifications.find((v) => v.brandId === brandId);
  if (existing) {
    Object.assign(existing, patch, { brandId });
    return existing;
  }
  const record: CompanyVerification = { id: `ch-ver-${brandId}`, brandId, ...patch };
  demoCompanyVerifications.push(record);
  return record;
}

/** Append a HMRC filing record (history is append-only, tenant-keyed). */
export function pushHmrcFiling(record: Omit<HmrcFiling, 'id'>): HmrcFiling {
  const filing: HmrcFiling = {
    id: `hmrc-file-${record.brandId}-${Date.now()}-${demoHmrcFilings.length}`,
    ...record,
  };
  demoHmrcFilings.push(filing);
  return filing;
}

/** Most recent filing per (brand, type) — the current submission state. */
export function latestHmrcFiling(brandId: string, type: 'vat_return' | 'ct_return'): HmrcFiling | undefined {
  let out: HmrcFiling | undefined;
  for (const f of demoHmrcFilings) {
    if (f.brandId === brandId && f.type === type && (!out || f.filedAt! > out.filedAt!)) out = f;
  }
  return out;
}
