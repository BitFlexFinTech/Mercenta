/**
 * §Stage-1 Demo store — THE single demo-mode source of truth.
 *
 * Every admin/brand view reads through here while the platform is in demo
 * (`src/config/environment.ts → environmentMode()`, the ONE switch). When a
 * real integration connects, its fetcher replaces the array for that module
 * only; consumers never change. Mutations (e.g. PO accept/reject) mutate
 * these arrays so all views see changes immediately (single source of truth).
 */
import type {
  BrandPayoutDestination,
  CommissionPayout,
  ComplianceDocument,
  DocumentVerificationRecord,
  Commission,
  Contract,
  Deduction,
  Message,
  PaymentReconciliation,
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
  InvoiceNumberAllocation,
  CommercePayment,
  CommerceMode,
  AdCampaign,
  AdCampaignStatus,
  AdSpendRecommendation,
  AdSpendBudget,
  CreativeAsset,
  CreativeAssetFormat,
  CreativeAssetStatus,
  CreativeAssetUpdate,
  ListingRecommendation,
  ListingReviewStatus,
  InventoryMovement,
  InventorySettings,
  ProductIdentifier,
  /* §P9 — the canonical milestone writer below types its argument with the
     canonical shipment status, and derives `stage` from the ONE mapping. */
  ShipmentStatus,
} from '@/types';
/* §P9 — the ONE shipment status → stage mapping (a VALUE, so imported separately
   from the type-only block above; declared once in `src/types.ts`). */
import { STATUS_TO_STAGE, isResolvedShipmentStatus } from '@/types';
import {
  ALL_DEMO_BRANDS,
  DEMO_COMPLIANCE_DOCS,
  DEMO_CONTRACTS,
  DEMO_MESSAGES,
  DEMO_PRODUCTS,
  DEMO_PURCHASE_ORDERS,
  DEMO_SHIPMENTS,
  DEMO_WORKFLOW_PURCHASE_ORDERS,
  type DemoBrandRow,
  type DemoProduct,
  type DemoShipment,
} from './demoData';
import { notifyCanonicalStoreChange } from '@/lib/domain/canonicalSignal';
import { simulatedAsinFor } from '@/lib/catalog/asin';
import {
  COMMERCIAL_MODEL_ORDER,
  DEMO_ACQUISITION_SHARE_PCT,
  DEMO_COMMISSION_RATE_PCT,
  RETAIL_CHANNEL_COMPLIANCE_IS_MODEL_INDEPENDENT,
  isCommercialModel,
  resolveCommercialModel,
  type CommercialModel,
  type ResolvedCommercialModel,
} from '@/config/commercialModel';

export type { DemoBrandRow } from './demoData';
export { ALL_DEMO_BRANDS } from './demoData';

export const demoBrands: DemoBrandRow[] = ALL_DEMO_BRANDS.map((b) => ({
  id: b.id,
  category: b.category,
  track: b.track,
  contractStatus: b.contractStatus,
  profile: { businessName: b.name },
  nation: b.nation,
}));

/** Products joined to their owning brand (Global Catalog Manager uses this). */
export const demoProducts = DEMO_PRODUCTS;

export const demoContracts: Contract[] = [...DEMO_CONTRACTS];

export const demoComplianceDocs: ComplianceDocument[] = [...DEMO_COMPLIANCE_DOCS];

export const demoMessages: Message[] = [...DEMO_MESSAGES];

export const demoPurchaseOrders: PurchaseOrder[] = [...DEMO_PURCHASE_ORDERS];

/**
 * §SSOT — the consignment collection IS the seed, and nothing is re-derived here.
 *
 * REPOINTED (the old contract, recorded): this used to RE-DERIVE the delay and
 * exception flags with the same position arithmetic the seed already used
 * (`delayed: i % 4 === 1` / `exception: i % 7 === 3`), so one fact had two writers
 * in two files. The scenario is now declared ONCE
 * (`DEMO_SHIPMENT_EXCEPTION_SCENARIO` in `demoData.ts`), and from then on the flags
 * are domain state with ONE owner: the writers below.
 */
export const demoShipments: DemoShipment[] = DEMO_SHIPMENTS.map((s) => ({ ...s }));

export const demoAuditLog: AuditLogEntry[] = [];
export const demoShippingMargins: ShippingMargin[] = [];

/**
 * §M7 — record the UPFRONT brand shipping charge against the existing shipping
 * margin ledger (idempotent by shipment: one margin row per shipment, ever).
 */
export function recordShippingMargin(margin: ShippingMargin): ShippingMargin {
  const existing = demoShippingMargins.find((m) => m.id === margin.id);
  if (existing) {
    Object.assign(existing, margin);
    return existing;
  }
  demoShippingMargins.push(margin);
  return margin;
}

export function getShippingMargin(shipmentId: string): ShippingMargin | undefined {
  return demoShippingMargins.find((m) => m.shipmentId === shipmentId);
}

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
  notifyCanonicalStoreChange();
  return contract;
}

/* ── §SSOT S7 — THE CANONICAL CONTRACT-CYCLE WRITERS ─────────────────────────
 *
 * WHY THIS EXISTS. Before S7 `demoContracts` had NO writer anywhere in the
 * platform — every reference was a READ — and `ContractsAdminPanel` kept its
 * drafts in LOCAL React state (`extraDrafts`), so a newly generated agreement, a
 * renewal draft and a track amendment all vanished on reload and the panel was a
 * SECOND source of truth for contracts. The work layer's `contract_renewal` item
 * therefore had no closing path at all (`WORK_SOURCE_CLOSING.contract_renewal.
 * writer === null`).
 *
 * These four functions are now the ONLY writers of the contract cycle. Every one
 * records WHY and WHO on the EXISTING platform audit log (`demoAuditLog`) and
 * announces the canonical change, so the work layer, the CRM timeline and every
 * query-backed surface re-read the same truth.
 */

/** Audit one contract-cycle mutation on the existing platform log. */
function pushContractAudit(
  contractId: string,
  brandId: string,
  action: string,
  reason: string,
  actor: string
): void {
  demoAuditLog.push({
    id: `audit-contract-${contractId}-${action}-${demoAuditLog.length + 1}`,
    createdAt: new Date().toISOString(),
    actorId: actor,
    action,
    entityType: 'contract',
    entityId: contractId,
    brandId,
    reason,
  });
  notifyCanonicalStoreChange();
}

/**
 * §SSOT S7 — write a contract DRAFT to the canonical store (idempotent by id).
 *
 * The ONE writer for every draft the cycle produces: a newly generated
 * agreement, a renewal draft and a track amendment. It REPLACES the panel's
 * former local `extraDrafts` state, so a draft is now observable by every
 * consumer of `fetchContracts()` and cannot drift from the canonical store.
 */
export function saveContractDraft(draft: Contract, actor = 'staff:contracts'): Contract {
  const existing = demoContracts.find((c) => c.id === draft.id);
  if (existing) {
    Object.assign(existing, draft);
    pushContractAudit(
      draft.id,
      draft.brandId,
      'contract_draft_updated',
      `Draft ${draft.type} updated (v${draft.version})`,
      actor
    );
    return existing;
  }
  demoContracts.push(draft);
  pushContractAudit(
    draft.id,
    draft.brandId,
    'contract_draft_created',
    `Draft ${draft.type} created (v${draft.version})`,
    actor
  );
  /* §CANONICAL PROPAGATION — signal the change in THIS function too, so the
     canonical-propagation gate sees the writer itself announce (the audit helper
     above already signals; a second bump is a harmless version increment). */
  notifyCanonicalStoreChange();
  return draft;
}

/**
 * §SSOT S7 — RENEW a contract: advance its term by one year, in place.
 *
 * The work layer's `contract_renewal` item exists while a contract's
 * `renewalDate` sits inside the horizon. Renewing advances `effectiveDate` to the
 * old `renewalDate` and `renewalDate` a year on, bumps the version and re-affirms
 * the agreement (status `active`), so the item clears BY DOING THE WORK rather than
 * by hiding the task. A terminated contract cannot be renewed (fail-closed:
 * returns null and changes nothing). The prior term is preserved on the audit log.
 */
export function renewContract(contractId: string, actor = 'staff:contracts'): Contract | null {
  const c = demoContracts.find((x) => x.id === contractId);
  if (!c || c.status === 'terminated') return null;
  const priorRenewal = c.renewalDate;
  const next = new Date(new Date(priorRenewal).getTime() + 365 * 864e5).toISOString().slice(0, 10);
  c.effectiveDate = priorRenewal;
  c.renewalDate = next;
  c.version += 1;
  c.status = 'active';
  pushContractAudit(
    contractId,
    c.brandId,
    'contract_renewed',
    `Renewed ${c.type}: term ${priorRenewal} → ${next} (v${c.version})`,
    actor
  );
  /* §CANONICAL PROPAGATION — the writer itself announces the term change. */
  notifyCanonicalStoreChange();
  return c;
}

/**
 * §SSOT S7 — TERMINATE a contract. The other closing path for the
 * `contract_renewal` item: a terminated contract is excluded from the renewal
 * derivation, so the item clears. Idempotent (a second call changes nothing);
 * the reason is required and recorded. An UNKNOWN contract is refused.
 */
export function terminateContract(
  contractId: string,
  actor = 'staff:contracts',
  reason = 'Terminated by Mercenta'
): Contract | null {
  const c = demoContracts.find((x) => x.id === contractId);
  if (!c) return null;
  if (c.status === 'terminated') return c;
  c.status = 'terminated';
  pushContractAudit(contractId, c.brandId, 'contract_terminated', reason, actor);
  /* §CANONICAL PROPAGATION — the writer itself announces the termination. */
  notifyCanonicalStoreChange();
  return c;
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
  notifyCanonicalStoreChange();
  return true;
}

/* ── §M2 — Document verification (canonical store) ─────────────────────────
 *
 * ONE append-only ledger of verification records for every compliance document
 * version. The document's own `status` remains the canonical requirement state;
 * these records are the evidence trail (who/what verified it, how, when, the
 * result and any failure reason). Nothing else stores verification verdicts.
 */
export const demoDocumentVerifications: DocumentVerificationRecord[] = [];

/** Returns the doc to the store baseline (used by the deterministic demo reset). */
export function resetDocumentVerifications(): void {
  demoDocumentVerifications.length = 0;
}

export function findComplianceDoc(docId: string): ComplianceDocument | undefined {
  return demoComplianceDocs.find((x) => x.id === docId);
}

/** §M2 — compliance/verification actions are audited on the platform log. */
export function recordComplianceAudit(
  action: string,
  entityId: string,
  brandId: string,
  reason: string,
  actorId: string,
  metadata: Record<string, unknown> = {}
): AuditLogEntry {
  const entry: AuditLogEntry = {
    id: `audit-compliance-${demoAuditLog.length + 1}-${action}`,
    createdAt: new Date().toISOString(),
    actorId,
    action,
    entityType: 'compliance_document',
    entityId,
    brandId,
    reason,
    metadata,
  };
  demoAuditLog.push(entry);
  notifyCanonicalStoreChange();
  return entry;
}

/**
 * §P3 — THE BRAND'S CONFIRMATION OF AN AUTO-GENERATED CUSTOMS DOCUMENT.
 *
 * The brand-facing compliance hub presents Mercenta's auto-generated customs
 * documents (commercial invoice, packing list, UKCA declaration) and asks the
 * brand to review and confirm them — "confirming locks these values"
 * (`docs/MERCENTA_BUSINESS_MODEL.md`: the brand reviews and confirms, it never
 * recreates a document). Until P3 the "Review & Confirm" control only CLOSED the
 * preview modal: it promised a confirmation that was never recorded. This is the
 * ONE writer that records that confirmation, on the SAME canonical audit log
 * (`recordComplianceAudit`) every other compliance action uses — no second
 * audit system. The key is `poId:docType`, so a confirmation is per document.
 */
const demoCustomsConfirmations = new Set<string>();

export function confirmCustomsDocument(
  key: string,
  brandId: string,
  actorId: string,
  reason: string
): void {
  demoCustomsConfirmations.add(key);
  recordComplianceAudit('customs_document_confirmed', key, brandId, reason, actorId, {
    confirmedKey: key,
  });
}

export function isCustomsDocumentConfirmed(key: string): boolean {
  return demoCustomsConfirmations.has(key);
}

/** §Stage-6 — amend an existing shipment's carrier/status. */
export function amendShipment(
  shipmentId: string,
  patch: { carrier?: string; status?: string }
): boolean {
  const s = demoShipments.find((x) => x.id === shipmentId);
  if (!s) return false;
  if (patch.carrier && patch.carrier !== s.carrier) {
    const from = s.carrier;
    s.carrier = patch.carrier;
    pushShipmentAudit(s.id, s.brandId, 'shipment_carrier_amended', `Carrier ${from} → ${patch.carrier}`);
    notifyCanonicalStoreChange();
  }
  /**
   * §SSOT — REPOINTED (the old contract, recorded): the status branch used to
   * assign `s.status` DIRECTLY, making this a SECOND writer of a consignment's
   * milestone — no `STATUS_TO_STAGE` conformance check, no canonical notify, and
   * none of the resolved-milestone transition that clears an in-transit
   * delay/exception. Status now goes through the ONE writer, which fails closed on
   * an unknown milestone.
   */
  if (patch.status) {
    if (!setShipmentMilestone(shipmentId, patch.status as ShipmentStatus)) return false;
  }
  return true;
}

/**
 * §SSOT — THE ONE AUDIT LINE for consignment state. Every consignment mutation
 * (milestone, carrier, exception raised/cleared/refused) records WHY it happened
 * and WHO did it, exactly like the rest of the platform's domain writes.
 *
 * It SIGNALS the canonical change itself, following the established pattern for an
 * audit helper (`recordComplianceAudit`): a function that writes to a canonical
 * collection must announce it, which is what keeps the logistics projection
 * dynamic — asserted by `scripts/validate-canonical-propagation.mjs`.
 */
function pushShipmentAudit(
  shipmentId: string,
  brandId: string,
  action: string,
  reason: string,
  actor = 'system:consignment'
): void {
  demoAuditLog.push({
    id: `audit-shipment-${shipmentId}-${action}-${demoAuditLog.length + 1}`,
    createdAt: new Date().toISOString(),
    actorId: actor,
    action,
    entityType: 'shipment',
    entityId: shipmentId,
    brandId,
    reason,
  });
  notifyCanonicalStoreChange();
}

/**
 * §P9 (programme decision 4) — THE CANONICAL WRITER for a consignment's milestone.
 *
 * WHY THIS EXISTS
 * ---------------
 * The removed 3PL carrier terminal applied a milestone with a CONTEXT setter
 * (`updateShipmentStatus`) that mutated a context-owned copy of the shipments
 * while the canonical collection (`demoShipments`, which every query-backed
 * surface reads) stayed untouched. Repointing the carrier-event console onto the
 * admin Logistics Hub exposed exactly that: the select's own value and the row's
 * status badge never moved, because the page read the store and the control wrote
 * the context.
 *
 * This is now the ONE writer. It:
 *   · refuses an UNKNOWN consignment (returns false — fail-closed, never a
 *     silently-created record);
 *   · writes `status` AND the derived `stage` from the ONE mapping in
 *     `src/types.ts` (`STATUS_TO_STAGE`), so the two can never disagree;
 *   · notifies the canonical signal, so every query-backed surface (the admin
 *     Logistics Hub, the brand hub, reports) reflects the change.
 *
 * It makes no network call and contacts no carrier.
 */
export function setShipmentMilestone(
  shipmentId: string,
  status: ShipmentStatus
): boolean {
  const s = demoShipments.find((x) => x.id === shipmentId);
  if (!s) return false;
  /**
   * Fail-closed on an unrecognised status: the value can arrive from a `<select>`
   * (a cast), so it is checked against the canonical mapping rather than trusted.
   * An unknown value changes NOTHING and is refused, exactly like an unknown
   * consignment.
   */
  if (!(status in STATUS_TO_STAGE)) return false;
  s.status = status;
  /**
   * §SSOT — THE CLOSING TRANSITION. A consignment at a resolved milestone is no
   * longer in transit, so an in-transit delay/exception CANNOT survive the
   * milestone that ends transit. This is what makes the work layer's
   * `shipment_exception` item closable BY DOING THE WORK — advancing the
   * consignment — instead of by marking the task done while the record still says
   * exception (the two-sources-of-truth failure this replaces). See
   * `SHIPMENT_RESOLVED_STATUSES` in `src/types.ts`.
   */
  if (isResolvedShipmentStatus(status) && (s.delayed || s.exception)) {
    s.delayed = false;
    s.exception = false;
    pushShipmentAudit(
      s.id,
      s.brandId,
      'shipment_exception_cleared',
      `Milestone ${status} ends transit — the in-transit delay/exception was cleared automatically`
    );
  }
  /* The canonical conformance collection carries `status` (its `stage` lives on
     the legacy `Shipment` shape, which derives it from `STATUS_TO_STAGE`). */
  notifyCanonicalStoreChange();
  return true;
}

/**
 * §SSOT — THE ONE RAISER for a consignment's in-transit exception flags.
 *
 * WHY IT EXISTS. `delayed` / `exception` are the ONLY gate on the work layer's
 * `shipment_exception` item, and before this writer they had THREE writers: the
 * seed (position arithmetic), the DHL seam (which could only ever SET them), and
 * the investor-demo script assigning `shipment.delayed` DIRECTLY. One fact, three
 * owners — so the work list could disagree with the record it points at.
 *
 * Semantics preserved exactly: it RAISES (never clears by omission — a carrier that
 * reports no problem has not reported a recovery), and it is idempotent.
 *
 * FAIL CLOSED against a self-contradiction: a consignment already at a resolved
 * milestone is REFUSED the flag, the record is untouched, and the refusal is
 * audited rather than silently accepted.
 */
export function raiseShipmentException(
  shipmentId: string,
  flags: { delayed?: boolean; exception?: boolean },
  actor: string,
  reason: string
): boolean {
  const s = demoShipments.find((x) => x.id === shipmentId);
  if (!s) return false;
  if (isResolvedShipmentStatus(s.status)) {
    pushShipmentAudit(
      s.id,
      s.brandId,
      'shipment_exception_refused',
      `REFUSED: ${s.status} is a resolved milestone, so an in-transit delay/exception cannot apply — ${reason}`,
      actor
    );
    notifyCanonicalStoreChange();
    return false;
  }
  const delayed = flags.delayed === true;
  const exception = flags.exception === true;
  if (!delayed && !exception) return true; // nothing raised (no new problem reported)
  const changed = (delayed && !s.delayed) || (exception && !s.exception);
  s.delayed = s.delayed || delayed;
  s.exception = s.exception || exception;
  if (changed) {
    pushShipmentAudit(s.id, s.brandId, exception ? 'shipment_exception' : 'shipment_delayed', reason, actor);
  }
  notifyCanonicalStoreChange();
  return true;
}

/**
 * §SSOT — THE ONE CLEARER for a consignment's in-transit exception flags.
 *
 * The closing path the work layer was missing: before this existed, nothing but a
 * demo script could clear the flags, so "Exception — <ref>" stayed open for ever
 * and the only way to hide it was to mark the TASK done while the RECORD still said
 * exception. Idempotent — clearing an already-clear consignment changes nothing and
 * is not an error — and fail-closed on an unknown consignment.
 */
export function clearShipmentException(shipmentId: string, actor: string, reason: string): boolean {
  const s = demoShipments.find((x) => x.id === shipmentId);
  if (!s) return false;
  if (!s.delayed && !s.exception) return true; // already clear: idempotent, nothing recorded
  s.delayed = false;
  s.exception = false;
  pushShipmentAudit(s.id, s.brandId, 'shipment_exception_cleared', reason, actor);
  notifyCanonicalStoreChange();
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
 *
 * §P8 — REPOINTED (not weakened). These rows used to carry an INVENTED ASIN
 * (`B0<sku>`) for every third product — a plausible-looking identifier the
 * platform had no basis for, which is exactly what programme decision 10
 * forbids ("the code never invents a real-looking ASIN"). The CANONICAL home of
 * a product's identifier is now `demoProductIdentifiers` (below), written either
 * by the brand's own declaration or by Mercenta from the channel's acceptance,
 * and a submission's `asin` is only ever set from the channel's OWN response —
 * never fabricated by the seed.
 */
export const demoProductSubmissions: ProductSubmission[] = DEMO_PRODUCTS.slice(0, 6).map((p, i) => ({
  id: `sub-${p.brandId}-${p.sku}`,
  brandId: p.brandId,
  productId: p.id,
  productName: p.name,
  sku: p.sku,
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
    return merged;
  }
  const created: DemoProduct = {
    ...product,
    id: product.id || `prd-${brandId}-${product.sku}`,
    brandId,
  };
  DEMO_PRODUCTS.push(created);
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

/**
 * §Phase E3 — catalog operations are audited on the existing platform log.
 *
 * §P8 — the `entityType` is now a parameter (defaulting to the original
 * `catalog_submission`), so inventory and identifier writes are audited on the
 * SAME canonical log rather than inventing a second audit store. Existing
 * callers are unchanged.
 */
export function recordCatalogAudit(
  action: string,
  entityId: string,
  brandId: string,
  reason: string,
  actorId: string,
  metadata: Record<string, unknown> = {},
  entityType: string = 'catalog_submission'
): AuditLogEntry {
  const entry: AuditLogEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    actorId,
    action,
    entityType,
    entityId,
    brandId,
    reason,
    metadata,
  };
  demoAuditLog.push(entry);
  notifyCanonicalStoreChange();
  return entry;
}


/* ── §P8 — INVENTORY (decision 5) + THE CHANNEL IDENTIFIER (decision 10) ───
 *
 * Three canonical collections, each with ONE owner:
 *   - `demoInventoryMovements` — the APPEND-ONLY stock ledger. Every on-hand /
 *     committed / inbound figure in the platform is the SUM of these, so a stock
 *     number cannot exist without a provenance (rule §03: one representation).
 *   - `demoInventorySettings` — the brand's own uom + safety stock per product.
 *   - `demoProductIdentifiers` — the product's channel identifier, written ONLY
 *     by the brand's own declaration or by Mercenta from the channel's
 *     acceptance. See `src/lib/catalog/asin.ts`.
 *
 * The seeded identifiers are ALL the unmistakable `SIM-ASIN-…` placeholder: the
 * demo seed never fabricates a plausible real identifier (decision 10).
 * ─────────────────────────────────────────────────────────────────────── */

export const demoInventoryMovements: InventoryMovement[] = [];
export const demoInventorySettings: InventorySettings[] = [];
export const demoProductIdentifiers: ProductIdentifier[] = [];

/**
 * The deterministic demo baseline for inventory + identifiers.
 *
 * Derived from the canonical product list (never a second hand-maintained
 * fixture), so a product added to `DEMO_PRODUCTS` cannot be missing from the
 * baseline.
 */
(function seedInventoryBaseline() {
  const seededAt = new Date(Date.now() - 45 * 864e5).toISOString();
  DEMO_PRODUCTS.forEach((p, i) => {
    const uom: InventoryMovement['enteredUom'] = i % 2 === 0 ? 'eaches' : 'cases';
    const casePack = p.unitsPerCase && p.unitsPerCase > 0 ? p.unitsPerCase : 1;
    demoInventorySettings.push({
      brandId: p.brandId,
      sku: p.sku,
      productId: p.id,
      uom,
      safetyStock: 40 + i * 10,
      updatedAt: seededAt,
      updatedBy: 'seed:demo-baseline',
    });

    const at = (days: number) => new Date(Date.now() - days * 864e5).toISOString();
    const openingEaches = 120 + i * 30;
    // A receipt entered in the product's OWN unit — the case-based rows exercise
    // the single conversion in `src/lib/inventory/inventoryRecord.ts`.
    const receiptEntered = uom === 'cases' ? 3 : 24;
    const receiptEaches = receiptEntered * (uom === 'cases' ? casePack : 1);
    const commitEaches = 30 + i * 5;
    const inboundEntered = uom === 'cases' ? 6 : 48;
    const inboundEaches = inboundEntered * (uom === 'cases' ? casePack : 1);

    const row = (
      seq: number,
      bucket: InventoryMovement['bucket'],
      type: InventoryMovement['type'],
      enteredQuantity: number,
      eaches: number,
      days: number
    ): InventoryMovement => ({
      id: `inv-mv-${p.brandId}-${p.sku}-${seq}`,
      brandId: p.brandId,
      sku: p.sku,
      productId: p.id,
      bucket,
      quantityDelta: eaches,
      enteredQuantity,
      enteredUom: uom,
      unitsPerCaseUsed: uom === 'cases' ? casePack : 1,
      type,
      actorId: 'seed:demo-baseline',
      recordedAt: at(days),
    });

    demoInventoryMovements.push(
      row(1, 'on_hand', 'opening', openingEaches, openingEaches, 45),
      row(2, 'on_hand', 'receipt', receiptEntered, receiptEaches, 30),
      row(3, 'committed', 'commitment', commitEaches, commitEaches, 20),
      row(4, 'inbound', 'inbound_expected', inboundEntered, inboundEaches, 10)
    );

    // Every second product has an identifier — and it is ALWAYS the simulated
    // placeholder, so the demo never shows an identifier Mercenta cannot justify.
    if (i % 2 === 0) {
      demoProductIdentifiers.push({
        brandId: p.brandId,
        sku: p.sku,
        productId: p.id,
        asin: simulatedAsinFor(p.sku),
        source: 'channel_assigned',
        simulated: true,
        recordedAt: at(8),
        recordedBy: 'seed:demo-baseline',
        note: 'Simulated placeholder — no live channel response exists in this environment.',
      });
    }
  });
})();

/** Canonical id for one movement (deterministic per product + ordinal). */
export function inventoryMovementId(brandId: string, sku: string, seq: number): string {
  return `inv-mv-${brandId}-${sku}-${seq}`;
}

/**
 * Record ONE validated movement. Idempotent by id, so replaying a call cannot
 * double-count stock.
 */
export function recordInventoryMovement(input: {
  brandId: string;
  sku: string;
  productId: string;
  bucket: InventoryMovement['bucket'];
  type: InventoryMovement['type'];
  quantityDelta: number;
  enteredQuantity: number;
  enteredUom: InventoryMovement['enteredUom'];
  unitsPerCaseUsed: number;
  reason?: string;
  actorId: string;
}): InventoryMovement {
  const seq =
    demoInventoryMovements.filter((m) => m.brandId === input.brandId && m.sku === input.sku).length + 1;
  const id = inventoryMovementId(input.brandId, input.sku, seq);
  const existing = demoInventoryMovements.find((m) => m.id === id);
  if (existing) return existing;
  const movement: InventoryMovement = {
    id,
    brandId: input.brandId,
    sku: input.sku,
    productId: input.productId,
    bucket: input.bucket,
    quantityDelta: input.quantityDelta,
    enteredQuantity: input.enteredQuantity,
    enteredUom: input.enteredUom,
    unitsPerCaseUsed: input.unitsPerCaseUsed,
    type: input.type,
    reason: input.reason,
    actorId: input.actorId,
    recordedAt: new Date().toISOString(),
  };
  demoInventoryMovements.push(movement);
  notifyCanonicalStoreChange();
  return movement;
}

/** One product's ledger, oldest first (the derivation order). */
export function getInventoryMovements(brandId: string, sku: string): InventoryMovement[] {
  return demoInventoryMovements.filter((m) => m.brandId === brandId && m.sku === sku);
}

/** A tenant's whole ledger. */
export function getInventoryMovementsForBrand(brandId: string): InventoryMovement[] {
  return demoInventoryMovements.filter((m) => m.brandId === brandId);
}

/** Every movement in the platform (the admin/global read). */
export function getAllInventoryMovements(): InventoryMovement[] {
  return [...demoInventoryMovements];
}

/** Create or update a product's inventory settings (idempotent by tenant + sku). */
export function upsertInventorySettings(input: {
  brandId: string;
  sku: string;
  productId: string;
  uom: InventorySettings['uom'];
  safetyStock: number;
  updatedBy: string;
}): InventorySettings {
  const idx = demoInventorySettings.findIndex(
    (s) => s.brandId === input.brandId && s.sku === input.sku
  );
  const record: InventorySettings = {
    brandId: input.brandId,
    sku: input.sku,
    productId: input.productId,
    uom: input.uom,
    safetyStock: input.safetyStock,
    updatedAt: new Date().toISOString(),
    updatedBy: input.updatedBy,
  };
  if (idx >= 0) demoInventorySettings[idx] = record;
  else demoInventorySettings.push(record);
  notifyCanonicalStoreChange();
  return record;
}

/** One product's settings, or undefined when the brand has not set any. */
export function getInventorySettings(brandId: string, sku: string): InventorySettings | undefined {
  return demoInventorySettings.find((s) => s.brandId === brandId && s.sku === sku);
}

/** A tenant's settings rows. */
export function getInventorySettingsForBrand(brandId: string): InventorySettings[] {
  return demoInventorySettings.filter((s) => s.brandId === brandId);
}

/**
 * Record a product's channel identifier. Idempotent by (brandId, sku) — a
 * product has ONE identifier, so a re-record replaces it in place.
 */
export function recordProductIdentifier(input: {
  brandId: string;
  sku: string;
  productId: string;
  asin: string;
  source: ProductIdentifier['source'];
  simulated: boolean;
  brandConfirmedExistingListing?: boolean;
  recordedBy: string;
  note?: string;
}): ProductIdentifier {
  const record: ProductIdentifier = {
    brandId: input.brandId,
    sku: input.sku,
    productId: input.productId,
    asin: input.asin,
    source: input.source,
    simulated: input.simulated,
    brandConfirmedExistingListing: input.brandConfirmedExistingListing,
    recordedAt: new Date().toISOString(),
    recordedBy: input.recordedBy,
    note: input.note,
  };
  const idx = demoProductIdentifiers.findIndex(
    (i) => i.brandId === input.brandId && i.sku === input.sku
  );
  if (idx >= 0) demoProductIdentifiers[idx] = record;
  else demoProductIdentifiers.push(record);
  notifyCanonicalStoreChange();
  return record;
}

/** One product's identifier, or undefined when none exists yet. */
export function getProductIdentifier(brandId: string, sku: string): ProductIdentifier | undefined {
  return demoProductIdentifiers.find((i) => i.brandId === brandId && i.sku === sku);
}

/** Every identifier in the platform (the admin/global read). */
export function getAllProductIdentifiers(): ProductIdentifier[] {
  return [...demoProductIdentifiers];
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
/**
 * §P7 — THE CANONICAL INVOICE-NUMBER LEDGER (`AV-022`).
 *
 * Every number the registry has ever allocated, in allocation order, including
 * the numbers of invoices that were later cancelled (a cancelled number stays
 * consumed for ever — it is never reissued). Add-only: a row is voided, never
 * removed, so the "never reused" rule is provable from the ledger alone.
 */
export const demoInvoiceNumberRegistry: InvoiceNumberAllocation[] = [];

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
  notifyCanonicalStoreChange();
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

/**
 * The canonical ACTIVE invoice for a PO — the invoice is keyed by the PO, never
 * copied.
 *
 * §P7 — REPOINTED (not weakened). Before P7 this returned the FIRST invoice
 * recorded for the PO. `AV-022` makes a re-issue under a NEW Invoice ID a real
 * outcome (a wrong invoice is cancelled), so "the invoice for a PO" now means
 * the one that is still in force: the first non-cancelled row. The full journal
 * (cancelled rows included) is available through `getAllCommerceInvoicesForPo`.
 */
export function getCommerceInvoiceForPo(purchaseOrderId: string): CommerceInvoice | undefined {
  const rows = demoCommerceInvoices.filter((i) => i.purchaseOrderId === purchaseOrderId);
  return rows.find((i) => i.status !== 'cancelled') ?? rows[rows.length - 1];
}

/** §P7 — every invoice ever raised against a PO, cancelled rows included. */
export function getAllCommerceInvoicesForPo(purchaseOrderId: string): CommerceInvoice[] {
  return demoCommerceInvoices.filter((i) => i.purchaseOrderId === purchaseOrderId);
}

export function getCommerceInvoicesForBrand(brandId: string): CommerceInvoice[] {
  return demoCommerceInvoices.filter((i) => i.brandId === brandId);
}

/* ── §P7 — the invoice-number registry (`AV-022`) ─────────────────────────── */

/** The canonical ledger, in allocation order (read-only view). */
export function getInvoiceNumberLedger(): InvoiceNumberAllocation[] {
  return demoInvoiceNumberRegistry;
}

export function getInvoiceNumberAllocation(
  number: string
): InvoiceNumberAllocation | undefined {
  return demoInvoiceNumberRegistry.find((a) => a.number === number);
}

/**
 * Record ONE allocation. Idempotent on the NUMBER: re-recording an allocated
 * number returns the existing row rather than duplicating the ledger — a number
 * is consumed exactly once, for ever.
 */
export function recordInvoiceNumberAllocation(
  allocation: InvoiceNumberAllocation
): InvoiceNumberAllocation {
  const existing = getInvoiceNumberAllocation(allocation.number);
  if (existing) return existing;
  demoInvoiceNumberRegistry.push(allocation);
  notifyCanonicalStoreChange();
  return allocation;
}

/**
 * §P7 / `AV-022` R4 — VOID a number because its invoice was cancelled. The row
 * stays (ADD-ONLY) so the number can never be allocated again; only the void
 * evidence is written.
 */
export function voidInvoiceNumberAllocation(
  number: string,
  reason: string,
  at: string
): InvoiceNumberAllocation | undefined {
  const row = getInvoiceNumberAllocation(number);
  if (!row) return undefined;
  row.voidedAt = at;
  row.voidReason = reason;
  notifyCanonicalStoreChange();
  return row;
}

/** Upsert a simulated payment — idempotent on the canonical id. */
export function recordCommercePayment(payment: CommercePayment): CommercePayment {
  const existing = demoCommercePayments.find((p) => p.id === payment.id);
  if (existing) return existing;
  demoCommercePayments.push(payment);
  notifyCanonicalStoreChange();
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

/** §P7 — the whole payment ledger, so the ONE summary can be computed anywhere. */
export function getAllCommercePayments(): CommercePayment[] {
  return demoCommercePayments;
}

/** §P7 — the whole invoice ledger, so the ONE summary can be computed anywhere. */
export function getAllCommerceInvoices(): CommerceInvoice[] {
  return demoCommerceInvoices;
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
  notifyCanonicalStoreChange();
  return entry;
}

/** The truthful mode of the commerce simulation in this environment. */
export const COMMERCE_SIMULATION_MODE: CommerceMode = 'simulation';



/** §19.1 deductions ledger — DERIVED from demoPurchaseOrders (never
 *  hand-maintained PO references), covering every lifecycle state:
 *  open, disputed (pending outcome), accepted, resolved (won/lost).
 *
 *  §RUNTIME PARITY — the `poIdx` positions below address the ORIGINAL
 *  workflow PO block, not the whole seeded PO array. They were authored
 *  against a four-PO array, and indexing them into the (now larger) canonical
 *  array would silently re-point every deduction at a different PO/tenant —
 *  which is exactly what happened when the lifecycle POs were added. The
 *  positional fixture therefore reads its declared source explicitly. */
export const demoDeductions: import('@/types').Deduction[] = (() => {
  const byIndex = (i: number) =>
    DEMO_WORKFLOW_PURCHASE_ORDERS[i % Math.max(DEMO_WORKFLOW_PURCHASE_ORDERS.length, 1)];
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
  notifyCanonicalStoreChange();
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
  notifyCanonicalStoreChange();
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
  notifyCanonicalStoreChange();
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
  notifyCanonicalStoreChange();
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

/* ── §Functional-completion (2026-09-17) — Advertising depth stores ──
 * MUTABLE stores (same session-lifetime pattern as demoPurchaseOrders /
 * demoShipments) so budget edits, campaign drill-down and recommendation
 * approvals made in one surface are instantly visible in every other
 * surface this session. All rows are DETERMINISTIC SIMULATION seed —
 * every consumer must label them as such.
 * ─────────────────────────────────────────────────────────────────── */

export const demoAdCampaigns: AdCampaign[] = ALL_DEMO_BRANDS
  .filter((_, i) => i % 3 === 0)
  .flatMap((b, i) =>
    ['Sponsored Products — Hero', 'Sponsored Products — Category', 'Sponsored Display — Remarketing'].map(
      (name, ci) => ({
        id: `adcamp-${b.id.replace('brand-', '')}-${ci + 1}`,
        brandId: b.id,
        name,
        status: (ci === 2 && i % 2 === 1 ? 'paused' : 'active') as AdCampaignStatus,
        monthlyBudgetGbp: [600, 400, 200][ci],
        spendToDateGbp: [240, 160, 80][ci] + i * 5,
        impressions: 42_000 + i * 3_100 + ci * 7_500,
        clicks: 620 + i * 40 + ci * 190,
        attributedSalesGbp: 980 + i * 90 + ci * 240,
        acos: [0.21, 0.27, 0.33][ci] + i * 0.002,
        placement: 'Sponsored Products',
        sourceLabel: 'simulated_seed',
      })
    )
  );

/** Deterministic Mercenta-prepared monthly recommendations for active brands. */
export const demoAdSpendRecommendations: AdSpendRecommendation[] = ALL_DEMO_BRANDS
  .filter((_, i) => i % 3 === 0)
  .map((b, i) => ({
    id: `adrec-${b.id.replace('brand-', '')}-2026-09`,
    brandId: b.id,
    month: '2026-09',
    recommendedMonthlyBudgetGbp: 1200 + (i % 4) * 150,
    basis: 'Derived from trailing simulated spend and the category demand baseline — a deterministic estimate, never live data.',
    status: 'proposed' as const,
    createdAt: '2026-09-01T09:00:00.000Z',
  }));

export function getAdSpendBudgets(): AdSpendBudget[] {
  return demoAdSpend as AdSpendBudget[];
}

export function getAdCampaigns(): AdCampaign[] {
  return demoAdCampaigns;
}

export function getAdSpendRecommendations(): AdSpendRecommendation[] {
  return demoAdSpendRecommendations;
}

export function campaignsForBrand(brandId: string): AdCampaign[] {
  return demoAdCampaigns.filter((c) => c.brandId === brandId);
}

export function recommendationsForBrand(brandId: string): AdSpendRecommendation[] {
  return demoAdSpendRecommendations.filter((r) => r.brandId === brandId);
}



export const demoCreativeAssets: CreativeAsset[] = [];

/** Get all creative assets (admin view). */
export function getCreativeAssets(): CreativeAsset[] {
  return [...demoCreativeAssets];
}

/** Get creative assets for a specific brand. */
export function creativeAssetsForBrand(brandId: string): CreativeAsset[] {
  return demoCreativeAssets.filter((a) => a.brandId === brandId);
}

/** Get creative assets for a specific campaign. */
export function creativeAssetsForCampaign(campaignId: string): CreativeAsset[] {
  return demoCreativeAssets.filter((a) => a.campaignId === campaignId);
}

/** Create a new creative asset. */
export function createCreativeAsset(input: {
  brandId: string;
  campaignId?: string;
  formatId: CreativeAssetFormat;
  name: string;
  headline?: string;
  productSku?: string;
  logoUrl?: string;
  mediaUrl?: string;
  mediaType: 'image' | 'video';
  ctaText?: string;
  createdBy: string;
}): CreativeAsset {
  const id = 'ca-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  const now = new Date().toISOString();
  const asset: CreativeAsset = {
    id,
    brandId: input.brandId,
    campaignId: input.campaignId,
    formatId: input.formatId,
    name: input.name,
    headline: input.headline,
    productSku: input.productSku,
    logoUrl: input.logoUrl,
    mediaUrl: input.mediaUrl,
    mediaType: input.mediaType,
    ctaText: input.ctaText,
    status: 'draft',
    validationResult: undefined,
    amazonCreativeId: undefined,
    submittedAt: undefined,
    approvedAt: undefined,
    createdBy: input.createdBy,
    createdAt: now,
    updatedBy: undefined,
    updatedAt: undefined,
    sourceLabel: 'simulated_seed',
  };
  demoCreativeAssets.push(asset);
  notifyCanonicalStoreChange();
  return asset;
}

/** Update a creative asset. */
export function updateCreativeAsset(id: string, updates: CreativeAssetUpdate, actorId: string): CreativeAsset | undefined {
  const idx = demoCreativeAssets.findIndex((a) => a.id === id);
  if (idx === -1) return undefined;
  demoCreativeAssets[idx] = {
    ...demoCreativeAssets[idx],
    ...updates,
    updatedBy: actorId,
    updatedAt: new Date().toISOString(),
  };
  notifyCanonicalStoreChange();
  return demoCreativeAssets[idx];
}

/** Delete a creative asset. */
export function deleteCreativeAsset(id: string, actorId: string): boolean {
  const idx = demoCreativeAssets.findIndex((a) => a.id === id);
  if (idx === -1) return false;
  demoCreativeAssets.splice(idx, 1);
  notifyCanonicalStoreChange();
  return true;
}

/** Submit a creative asset for Amazon moderation (mock). */
export function submitCreativeAsset(id: string, actorId: string): CreativeAsset | undefined {
  const asset = updateCreativeAsset(id, {
    status: 'submitted_to_amazon',
    submittedAt: new Date().toISOString(),
  }, actorId);
  if (!asset) return undefined;
  setTimeout(() => {
    const approved = Math.random() > 0.3;
    updateCreativeAsset(id, {
      status: approved ? 'amazon_approved' : 'amazon_rejected',
      approvedAt: approved ? new Date().toISOString() : undefined,
      amazonCreativeId: approved ? 'amz-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) : undefined,
    }, 'system');
  }, 2000);
  return asset;
}


/**
 * Manual monthly-budget input. Attributed + audited. A brand with no seed
 * row receives a real row (status flips to 'active') — the same store the
 * read seam consumes, so nothing is ever edited in a shadow copy.
 */
export function setAdSpendBudgetForBrand(
  brandId: string,
  monthlyBudgetGbp: number,
  actorId: string
): { ok: boolean; budget?: AdSpendBudget; error?: string } {
  if (!Number.isFinite(monthlyBudgetGbp) || monthlyBudgetGbp < 0) {
    return { ok: false, error: 'A non-negative monthly budget is required.' };
  }
  const brand = ALL_DEMO_BRANDS.find((b) => b.id === brandId);
  if (!brand) return { ok: false, error: `Unknown brand: ${brandId}` };

  const rows = demoAdSpend as AdSpendBudget[];
  const existing = rows.find((a) => a.brandId === brandId);
  const prev = existing ? `${existing.monthlyBudgetGbp}` : 'none';
  const row = existing ?? {
    brandId,
    monthlyBudgetGbp: 0,
    spendToDateGbp: 0,
    acos: 0 as number,
    tacos: 0 as number,
    status: 'active' as const,
  };
  row.monthlyBudgetGbp = monthlyBudgetGbp;
  row.status = 'active';
  if (!existing) rows.push(row);

  demoAuditLog.push({
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    actorId,
    action: 'ad_budget_updated',
    entityType: 'ad_spend_budget',
    entityId: brandId,
    brandId,
    reason: 'Manual monthly advertising budget input (simulation).',
    metadata: { before: prev, after: `${monthlyBudgetGbp}` },
  });
  notifyCanonicalStoreChange();
  return { ok: true, budget: row };
}

/**
 * Brand (or admin-on-behalf) decision on a Mercenta-prepared budget
 * recommendation. State moves once: 'proposed' → 'approved' | 'amended'
 * | 'rejected'. A settled recommendation is never re-opened, so a budget
 * cannot be double-granted.
 */
export function reviewAdSpendRecommendation(
  id: string,
  decision: 'approved' | 'amended' | 'rejected',
  opts: { amendedBudgetGbp?: number; note?: string; actorId?: string } = {}
): { ok: boolean; recommendation?: AdSpendRecommendation; error?: string } {
  const rec = demoAdSpendRecommendations.find((r) => r.id === id);
  if (!rec) return { ok: false, error: `Unknown recommendation: ${id}` };
  if (rec.status !== 'proposed') {
    return { ok: false, error: `Recommendation already ${rec.status} — decisions are final.` };
  }
  if (decision === 'amended') {
    if (!Number.isFinite(opts.amendedBudgetGbp) || (opts.amendedBudgetGbp ?? 0) < 0) {
      return { ok: false, error: 'An amended non-negative budget is required.' };
    }
    rec.amendedBudgetGbp = opts.amendedBudgetGbp;
  } else {
    rec.amendedBudgetGbp = rec.recommendedMonthlyBudgetGbp;
  }
  rec.status = decision;
  rec.reviewedAt = new Date().toISOString();
  rec.actorDisplay = opts.actorId ?? 'unattributed';
  rec.note = (opts.note ?? '').trim() || undefined;

  demoAuditLog.push({
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    actorId: opts.actorId ?? 'unattributed',
    action: `ad_recommendation_${decision}`,
    entityType: 'ad_spend_recommendation',
    entityId: id,
    brandId: rec.brandId,
    reason: `Recommended monthly advertising budget ${decision} (simulation).`,
    metadata: { month: rec.month, budget: `${rec.amendedBudgetGbp}` },
  });
  notifyCanonicalStoreChange();
  return { ok: true, recommendation: rec };
}
/* ── §Functional-completion (2026-09-17) — Listing Analyzer reviews ──
 * Brand decision layer on top of the deterministic analyzer. The engine
 * computes the identical analysis for everyone; the STORE layers the
 * brand's own per-recommendation decision (approved / edited / rejected)
 * so the same product is analysed once and decisions persist in-session.
 * Decisions are one-shot (append-only), attributed and audited.
 * ─────────────────────────────────────────────────────────────────── */

export interface ListingReviewDecision {
  status: ListingReviewStatus;
  editedCopy?: string;
  reviewedAt: string;
  actorDisplay: string;
  note?: string;
}

/** Key: `${brandId}__${recommendationId}`. */
export const demoListingReviews: Record<string, ListingReviewDecision> = {};

export function listingReviewKey(brandId: string, recommendationId: string): string {
  return `${brandId}__${recommendationId}`;
}

export function getListingReviewsForBrand(brandId: string): Record<string, ListingReviewDecision> {
  const out: Record<string, ListingReviewDecision> = {};
  for (const [key, val] of Object.entries(demoListingReviews)) {
    if (key.startsWith(`${brandId}__`)) out[key] = val;
  }
  return out;
}

/**
 * Brand decides on one Mercenta-suggested improvement. One shot: a
 * settled recommendation is never re-opened (mirrors the ad-spend rule).
 */
export function setListingRecommendationReview(
  brandId: string,
  recommendationId: string,
  action: 'approved' | 'edited' | 'rejected',
  opts: { editedCopy?: string; note?: string; actorId?: string } = {}
): { ok: boolean; error?: string; decision?: ListingReviewDecision } {
  if (!recommendationId.trim()) return { ok: false, error: 'A recommendation id is required.' };
  if (action === 'edited' && !(opts.editedCopy ?? '').trim()) {
    return { ok: false, error: 'An edited improvement is required to approve an edit.' };
  }
  const key = listingReviewKey(brandId, recommendationId);
  if (demoListingReviews[key] && demoListingReviews[key].status !== 'suggested') {
    return { ok: false, error: `Recommendation already ${demoListingReviews[key].status} — decisions are final.` };
  }
  const decision: ListingReviewDecision = {
    status: action,
    editedCopy: action === 'edited' ? opts.editedCopy?.trim() : undefined,
    reviewedAt: new Date().toISOString(),
    actorDisplay: opts.actorId ?? 'unattributed',
    note: (opts.note ?? '').trim() || undefined,
  };
  demoListingReviews[key] = decision;

  demoAuditLog.push({
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    actorId: opts.actorId ?? 'unattributed',
    action: `listing_recommendation_${action}`,
    entityType: 'listing_recommendation',
    entityId: recommendationId,
    brandId,
    reason: `Listing improvement ${action} by the brand (simulation).`,
    metadata: { editedCopy: decision.editedCopy ?? null },
  });
  notifyCanonicalStoreChange();
  return { ok: true, decision };
}

/**
 * Overlay the brand's decisions onto an engine-produced analysis. The
 * engine stays pure; the combined result is what the UI renders.
 */
export function applyListingReviewOverrides(
  analysis: import('@/types').ProductListingAnalysis,
  brandId: string
): import('@/types').ProductListingAnalysis {
  const reviews = getListingReviewsForBrand(brandId);
  const recommendations = analysis.recommendations.map((rec) => {
    const decision = reviews[listingReviewKey(brandId, rec.id)];
    if (!decision) return rec;
    return {
      ...rec,
      status: decision.status,
      editedCopy: decision.editedCopy,
      reviewedAt: decision.reviewedAt,
    } as ListingRecommendation;
  });
  return { ...analysis, recommendations };
}

/**
 * §5 scores — deterministic spread incl. borderline band and low scores.
 *
 * §WAVE 3d FIX (2026-11-25) — A REAL DEFECT FIXED AT SOURCE.
 *
 * Before this, ONE list fed every brand (`[88, 62, 45, 79, …]`) while `track` was
 * copied from the brand row, and the two were chosen independently — so they
 * contradicted each other. Measured on the rendered screen: Astonish scored **88
 * and showed "financed"**, Le Creuset scored **45 and showed "direct
 * fulfilment"**. `FulfillmentScore` documents the rule (the track is auto-assigned
 * at totalScore >= 65) and `recalculateAllScores` implements it, but the seed went
 * through neither.
 *
 * The brand's declared track is the value other features and specs rely on, so the
 * SCORE is made consistent with it: a direct-fulfilment brand draws from totals at
 * or above the threshold, a financed brand from totals below it. The spread and the
 * borderline band (66 / 64) are preserved, and
 * `scripts/validate-fulfillment-track-consistency.mjs` fails if the two drift apart
 * again.
 */
const DIRECT_SCORE_TOTALS = [88, 79, 71, 92, 84, 96, 73, 66];
const FINANCED_SCORE_TOTALS = [45, 62, 58, 38, 51, 64];
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const demoFulfillmentScores = ALL_DEMO_BRANDS.map((b, i) => {
  const pool = b.track === 'direct_fulfillment' ? DIRECT_SCORE_TOTALS : FINANCED_SCORE_TOTALS;
  const T = pool[i % pool.length];
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
  notifyCanonicalStoreChange();
  return po;
}

/**
 * §P7 — record WHEN the channel's receiving step completed for a PO.
 *
 * The receiving STATUS is derived from the line quantities (never stored — see
 * `src/lib/commerce/receivingStatus.ts`); this timestamp is the one part of the
 * receipt that cannot be derived, so it is written here by the receiving path.
 */
export function setPurchaseOrderReceivedAt(id: string, receivedAt: string): PurchaseOrder | null {
  const po = demoPurchaseOrders.find((p) => p.id === id);
  if (!po) return null;
  po.receivedAt = receivedAt;
  notifyCanonicalStoreChange();
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

  notifyCanonicalStoreChange();
  return { po, shortfalls, deductionsCreated };
}

/* ── §Stage-25 — brand self-service profile/banking change requests ───────── */

/**
 * §Phase 7F — deterministic seeded pending requests so the admin CRM's
 * profile-change review UI is genuinely exercisable (previously empty → the
 * E2E could only conditionally skip). Both belong to the canonical cleared
 * UK tenant (Astonish — the CRM's default demo brand); them staying
 * 'pending' is what makes the review card render. Reviewing mutates this
 * array exactly like runtime requests.
 */
export const demoProfileChangeRequests: import('@/types').ProfileChangeRequest[] = [
  {
    id: 'pcr-seed-astonish-signatory-001',
    brandId: 'brand-astonish',
    field: 'signatory',
    currentValue: 'Trade team (contact TBC)',
    requestedValue: 'Trade team — updated contact on file',
    reason: 'Official signatory title update after registration change',
    status: 'pending',
    requestedAt: '2026-09-01T09:15:00.000Z',
  },
  {
    id: 'pcr-seed-astonish-phone-002',
    brandId: 'brand-astonish',
    field: 'phone',
    currentValue: '+44 0120 000 000',
    requestedValue: '+44 0120 000 111',
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
  notifyCanonicalStoreChange();
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
  notifyCanonicalStoreChange();
  return info;
}

export function approveBankChange(brandId: string): BrandBankInfo | null {
  const info = demoBankInfo.find((b) => b.brandId === brandId);
  if (!info || !info.requestedChange) return null;
  const { field, requestedValue } = info.requestedChange;
  (info as unknown as Record<string, string>)[field] = requestedValue;
  info.status = 'current';
  info.requestedChange = undefined;
  notifyCanonicalStoreChange();
  return info;
}

/* ── Team Members (brand-side multi-user) ─────────────────────────── */
export const demoTeamMembers: BrandTeamMember[] = [
  { id: 'tm-1', brandId: 'brand-astonish', name: 'Astonish — Owner (contact TBC)', email: 'trade@astonish.example', role: 'Owner', active: true, invitedAt: new Date(Date.now() - 120 * 864e5).toISOString() },
  { id: 'tm-2', brandId: 'brand-astonish', name: 'Astonish — Accounts (contact TBC)', email: 'trade@astonish.example', role: 'Accounts', active: true, invitedAt: new Date(Date.now() - 90 * 864e5).toISOString() },
  { id: 'tm-3', brandId: 'brand-astonish', name: 'Astonish — Shipping (contact TBC)', email: 'trade@astonish.example', role: 'Shipping', active: false, invitedAt: new Date(Date.now() - 60 * 864e5).toISOString() },
  { id: 'tm-4', brandId: 'brand-tapatio', name: 'Tapatío — Owner (contact TBC)', email: 'trade@tapatio.example', role: 'Owner', active: true, invitedAt: new Date(Date.now() - 110 * 864e5).toISOString() },
  { id: 'tm-5', brandId: 'brand-tapatio', name: 'Tapatío — Shipping (contact TBC)', email: 'trade@tapatio.example', role: 'Shipping', active: true, invitedAt: new Date(Date.now() - 80 * 864e5).toISOString() },
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
    id: 'out-1', brandId: 'brand-astonish',
    startDate: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 21 * 864e5).toISOString().slice(0, 10),
    reason: 'Annual factory maintenance shutdown',
    status: 'active',
    createdAt: new Date(Date.now() - 7 * 864e5).toISOString(),
  },
  {
    id: 'out-2', brandId: 'brand-tapatio',
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
  notifyCanonicalStoreChange();
  return o;
}

/* ── Return Addresses ─────────────────────────────────────────────── */
export const demoReturnAddresses: BrandReturnAddress[] = [
  {
    id: 'ra-1', brandId: 'brand-astonish', label: 'UK Returns — Standard',
    companyName: 'Astonish',
    addressLine1: 'Unit 4, Mercenta Fulfilment Park', addressLine2: 'Magna Way',
    city: 'Northampton', postalCode: 'NN3 5FZ', country: 'United Kingdom',
    contactName: 'Trade team (contact TBC)', contactPhone: '+44 7700 900123', isDefault: true,
  },
  {
    id: 'ra-2', brandId: 'brand-tapatio', label: 'UK Returns — Standard',
    companyName: 'Tapatío',
    addressLine1: 'c/o Mercenta Hub', addressLine2: 'Unit 12, Phoenix Distribution Centre',
    city: 'Rugby', postalCode: 'CV23 0WE', country: 'United Kingdom',
    contactName: 'Trade team (contact TBC)', contactPhone: '+44 7700 900456', isDefault: true,
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

/**
 * §2026-10-12 — THE INSTANT-MESSAGE SUBSCRIPTION IS REMOVED. The WhatsApp/Twilio
 * escalation feature was removed on the Owner's instruction (WhatsApp is not
 * needed), so no brand subscribes to an instant-message channel. Every brand keeps
 * the in-app and email channels (or email only, on the declared cadence).
 */
export const demoNotificationPrefs: NotificationPreference[] = ALL_DEMO_BRANDS.flatMap((b) =>
  ALL_EVENT_TYPES.map((et, i) => ({
    id: `np-${b.id}-${et}`,
    brandId: b.id,
    eventType: et,
    channels: i % 5 === 0 ? (['email'] as NotificationChannel[]) : [...DEFAULT_CHANNELS],
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
 * not exist in any store: a fake-brand return pointed at another tenant's
 * PO-9003, another at the non-existent **PO-9005** for a brand that owns no
 * products or POs at all, and their SKUs (`SPB-*`/`GSP-*`) belong to no brand.
 * The effect was visible: a brand's own dashboard showed ANOTHER TENANT'S
 * purchase-order number in its returns attention row, and the Returns ledger
 * referenced phantom products.
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
  notifyCanonicalStoreChange();
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

/**
 * Default per-carrier markup rates. Admin can change these via Super Admin Panel.
 *
 * §P9 (programme decision 1) — REPOINTED: the old seed also carried
 * `markup-fedex` ('FedEx International') and `markup-bak` ('BAK Logistics (sea
 * freight)'). Neither is a Mercenta account, so neither may appear as a
 * configurable carrier markup.
 */
export const demoCarrierMarkup: CarrierMarkupConfig[] = [
  { id: 'markup-global', carrier: 'global', markupType: 'percentage', markupValue: 0.07, active: true, label: 'Default (all carriers)' },
  { id: 'markup-dhl', carrier: 'dhl', markupType: 'percentage', markupValue: 0.07, active: true, label: 'DHL Express' },
  { id: 'markup-palletline', carrier: 'palletline', markupType: 'percentage', markupValue: 0.08, active: true, label: 'Palletline (palletised)' },
];

/** Update a carrier markup config. Returns true if found and updated. */
export function updateCarrierMarkup(id: string, updates: Partial<Pick<CarrierMarkupConfig, 'markupValue' | 'active'>>): boolean {
  const entry = demoCarrierMarkup.find((m) => m.id === id);
  if (!entry) return false;
  Object.assign(entry, updates);
  return true;
}

/* ── §M6 — canonical money-flow stores (reconciliation / payouts / destinations)
 *
 * ONE ledger each, appended to by the finance seam only. Nothing here duplicates
 * the PO store (the value/commission source) or the commission projection (the
 * payable source): these records add IDENTITY + STATE to that money.
 */

export const demoPayoutDestinations: BrandPayoutDestination[] = seedPayoutDestinations();
export const demoReconciliations: PaymentReconciliation[] = seedReconciliations();
export const demoPayouts: CommissionPayout[] = [];

export function resetFinanceStores(): void {
  demoPayoutDestinations.length = 0;
  demoPayoutDestinations.push(...seedPayoutDestinations());
  demoReconciliations.length = 0;
  demoReconciliations.push(...seedReconciliations());
  demoPayouts.length = 0;
}

/**
 * Seeded payout destinations — DERIVED from the brand list (never hand-maintained).
 * One brand is deliberately left UNVERIFIED so the "payout to an unverified
 * destination is refused" rule is reachable in the demo dataset.
 */
export function seedPayoutDestinations(): BrandPayoutDestination[] {
  return ALL_DEMO_BRANDS.map((brand) => {
    const slug = brand.id.replace(/^brand-/, '').toUpperCase();
    const unverified = brand.id === 'brand-sennheiser';
    return {
      id: `dest-${brand.id}`,
      brandId: brand.id,
      accountName: brand.name,
      accountRefMasked: `••••••${String(Math.abs(hashSlug(slug)) % 10000).padStart(4, '0')}`,
      bankName: 'Seeded demo bank (no live bank connection)',
      country: brand.nation ?? 'United Kingdom',
      currency: 'GBP' as const,
      status: unverified ? ('unverified' as const) : ('verified' as const),
      ...(unverified
        ? {}
        : {
            verificationMethod: 'Seeded demo verification (no bank provider contacted)',
            verificationRef: `SIM-DEST-${slug}`,
            verifiedAt: '2026-09-01T00:00:00.000Z',
            verifiedBy: 'staff-001',
          }),
      mode: 'simulation' as const,
      simulated: true,
    };
  });
}

function hashSlug(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) | 0;
  return h;
}

/**
 * Seeded reconciliations — DERIVED from the canonical PO + commission projection,
 * so the demo's Accounting surface is money-coherent (a payable PO has a received
 * remittance matched to it). Every seeded record is `simulated: true` and states
 * that no retail channel was contacted.
 */
export function seedReconciliations(): PaymentReconciliation[] {
  return demoCommissions.map((commission) => {
    const po = demoPurchaseOrders.find((p) => p.poNumber === commission.purchaseOrderId);
    const poId = po?.id ?? commission.purchaseOrderId;
    const deductions = demoDeductions.filter((d) => d.purchaseOrderId === commission.purchaseOrderId);
    return buildSeededReconciliation(commission, poId, deductions);
  });
}

function buildSeededReconciliation(
  commission: Commission,
  poId: string,
  deductions: Deduction[]
): PaymentReconciliation {
  return {
    id: `rec-seed-${commission.id}`,
    paymentId: `cpay-seed-${commission.id}`,
    invoiceId: `cinv-seed-${commission.id}`,
    purchaseOrderId: poId,
    purchaseOrderNumber: commission.purchaseOrderId,
    brandId: commission.brandId,
    amountGbp: commission.poValue,
    currency: 'GBP',
    paymentSource: 'seeded_demo_remittance',
    paymentDate: commission.createdAt,
    state: 'reconciled',
    reconciledAt: commission.createdAt,
    reconciledBy: 'seeded-demo-remittance',
    fact: {
      poValueGbp: commission.poValue,
      commissionRatePct: commission.commissionRate,
      commissionAmountGbp: commission.commissionAmount,
      deductionsAppliedGbp: 0,
      deductionsUnresolvedGbp: 0,
      deductionsUnresolvedCount: 0,
      fulfilmentFeesGbp: 0,
      netToBrandGbp: Math.round((commission.poValue - commission.commissionAmount) * 100) / 100,
      vatTreatment: 'configuration_required',
      vatConfigured: false,
    },
    accounting: {
      provider: 'seeded_demo_representation',
      mode: 'simulation',
      represented: true,
      representationId: `SIM-XERO-${commission.id}`,
      postedAt: commission.createdAt,
      simulated: true,
    },
    payoutEligible: deductions.length === 0,
    ...(deductions.length === 0
      ? {}
      : { payoutBlockedReason: `${deductions.length} unresolved deduction(s) on ${commission.purchaseOrderId}` }),
    mode: 'simulation',
    simulated: true,
  };
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

/* ── §5/M12 — THE BRAND'S COMMERCIAL RELATIONSHIP (canonical store) ─────────
 *
 * ONE record per brand: which of the two commercial models applies, and the
 * agreed terms that go with it. This is INTERNAL between Mercenta and the brand.
 *
 * It is a COMPLETELY SEPARATE concept from the retail-channel COMPLIANCE
 * documentation the brand's products require. Nothing in this module can add,
 * remove, waive or weaken a compliance requirement — requirements come from
 * `src/lib/compliance.ts` alone, and `RETAIL_CHANNEL_COMPLIANCE_IS_MODEL_INDEPENDENT`
 * declares that fact so a validator can pin it.
 *
 * The demo assignment lives in exactly ONE place: each demo brand's own
 * `commercialModel` field in `demoData.ts`. This store derives from it.
 */

export interface BrandCommercialModelRecord {
  brandId: string;
  model: CommercialModel;
  /** Model A — the agreed Mercenta commission rate (% of retail-channel value). */
  commissionRatePct: number;
  /** Model B — the share of retail-channel revenue paid to the brand (%). */
  brandAcquisitionSharePct: number;
  /** Where the current value came from (seed, the brand's onboarding, or an override). */
  source: 'demo_seed' | 'onboarding' | 'admin_override';
  recordedAt: string;
  recordedBy: string;
  reason: string;
}

/** Deterministic seed timestamp — never `Date.now()` (replay-digest safety). */
const COMMERCIAL_MODEL_SEED_AT = '2026-09-14T00:00:00.000Z';

function seedBrandCommercialModels(): BrandCommercialModelRecord[] {
  return ALL_DEMO_BRANDS.map((b) => ({
    brandId: b.id,
    model: b.commercialModel,
    commissionRatePct: DEMO_COMMISSION_RATE_PCT,
    brandAcquisitionSharePct: DEMO_ACQUISITION_SHARE_PCT,
    source: 'demo_seed' as const,
    recordedAt: COMMERCIAL_MODEL_SEED_AT,
    recordedBy: 'demo-seed',
    reason: 'Demo dataset assignment — Brand A runs Model A, Brand B runs Model B.',
  }));
}

export const demoBrandCommercialModels: BrandCommercialModelRecord[] = seedBrandCommercialModels();

export function getBrandCommercialModelRecord(brandId: string): BrandCommercialModelRecord | null {
  return demoBrandCommercialModels.find((r) => r.brandId === brandId) ?? null;
}

/**
 * What THIS brand's commercial relationship is. An unknown/absent brand resolves
 * `not_selected` — fail-closed, never a guessed model.
 */
export function resolveBrandCommercialModel(brandId: string): ResolvedCommercialModel {
  return resolveCommercialModel(getBrandCommercialModelRecord(brandId)?.model);
}

/**
 * Record or CHANGE a brand's commercial relationship (§5).
 *
 * Fail-closed rules:
 *   • an unknown model string is REFUSED (never a silent default);
 *   • an `admin_override` requires BOTH an actor and a reason;
 *   • every write appends a canonical audit row (history is never destroyed);
 *   • the audit row records `complianceUnchanged: true`, because this write can
 *     never touch the retail-channel compliance requirements.
 */
export function setBrandCommercialModel(input: {
  brandId: string;
  model: CommercialModel;
  actorId: string;
  reason: string;
  source?: BrandCommercialModelRecord['source'];
  commissionRatePct?: number;
  brandAcquisitionSharePct?: number;
}): { ok: true; record: BrandCommercialModelRecord } | { ok: false; error: string } {
  const source = input.source ?? 'onboarding';
  if (!input.brandId) {
    return { ok: false, error: 'A brand id is required to record a commercial relationship.' };
  }
  if (!isCommercialModel(input.model)) {
    return {
      ok: false,
      error: `"${String(input.model)}" is not a commercial model. Expected one of: ${COMMERCIAL_MODEL_ORDER.join(', ')}.`,
    };
  }
  if (source === 'admin_override' && (!input.reason.trim() || !input.actorId.trim())) {
    return {
      ok: false,
      error: 'An operator change to a commercial relationship requires both an actor and a reason (audited).',
    };
  }

  const now = new Date().toISOString();
  const existing = demoBrandCommercialModels.find((r) => r.brandId === input.brandId);

  const appendAudit = (record: BrandCommercialModelRecord, action: string) => {
    demoAuditLog.push({
      id: `audit-commercial-${demoAuditLog.length + 1}-${input.brandId}`,
      createdAt: now,
      actorId: input.actorId,
      action,
      entityType: 'brand_commercial_relationship',
      entityId: input.brandId,
      brandId: input.brandId,
      reason: input.reason,
      metadata: {
        model: record.model,
        source,
        commissionRatePct: record.commissionRatePct,
        brandAcquisitionSharePct: record.brandAcquisitionSharePct,
        complianceUnchanged: RETAIL_CHANNEL_COMPLIANCE_IS_MODEL_INDEPENDENT,
      },
    });
  };

  if (existing) {
    existing.model = input.model;
    if (input.commissionRatePct !== undefined) existing.commissionRatePct = input.commissionRatePct;
    if (input.brandAcquisitionSharePct !== undefined) {
      existing.brandAcquisitionSharePct = input.brandAcquisitionSharePct;
    }
    existing.source = source;
    existing.recordedAt = now;
    existing.recordedBy = input.actorId;
    existing.reason = input.reason;
    appendAudit(existing, source === 'admin_override' ? 'commercial_model_changed' : 'commercial_model_confirmed');
    return { ok: true, record: existing };
  }

  const record: BrandCommercialModelRecord = {
    brandId: input.brandId,
    model: input.model,
    commissionRatePct: input.commissionRatePct ?? DEMO_COMMISSION_RATE_PCT,
    brandAcquisitionSharePct: input.brandAcquisitionSharePct ?? DEMO_ACQUISITION_SHARE_PCT,
    source,
    recordedAt: now,
    recordedBy: input.actorId,
    reason: input.reason,
  };
  demoBrandCommercialModels.push(record);
  appendAudit(record, 'commercial_model_selected');
  notifyCanonicalStoreChange();
  return { ok: true, record };
}

/** The canonical audit trail for a brand's commercial relationship. */
export function commercialModelAuditFor(brandId: string): AuditLogEntry[] {
  return demoAuditLog.filter(
    (e) => e.entityType === 'brand_commercial_relationship' && e.brandId === brandId
  );
}

/** Return the store to its seeded baseline (used by the deterministic demo reset). */
export function resetBrandCommercialModels(): void {
  demoBrandCommercialModels.length = 0;
  demoBrandCommercialModels.push(...seedBrandCommercialModels());
  notifyCanonicalStoreChange();
}
