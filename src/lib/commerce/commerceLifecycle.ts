/**
 * §Phase E4 — COMMERCE / AMAZON-STYLE OPERATIONAL SIMULATION.
 *
 * The operational commerce lifecycle the brand portal and the admin surface
 * drive, built ENTIRELY on the existing architecture (mirroring E1/E2/E3):
 *
 *   E3-ready catalog product
 *     → OPERATIONAL ELIGIBILITY (derived from E3, never a second rule set)
 *     → SIMULATED PURCHASE ORDER
 *     → PO ACKNOWLEDGEMENT
 *     → FULFILMENT / SHIPMENT (existing ASN seam)
 *     → RECEIVING (existing delivery reconciliation)
 *     → SIMULATED INVOICE
 *     → SIMULATED PAYMENT
 *     → EXCEPTIONS / CHARGEBACKS (existing Deduction ledger)
 *     → DISPUTE / RESOLUTION
 *     → resulting operational state
 *
 * Rules this module enforces — none of them newly invented:
 * - TENANT ISOLATION IN THE DOMAIN: a brand-pinned actor may act only on its
 *   own operational records; a cross-tenant attempt is refused here, never
 *   merely hidden in the UI.
 * - RBAC IN THE DOMAIN: a view-only actor cannot mutate anything.
 * - ELIGIBILITY IS DERIVED, NOT RE-DECLARED: the verdict comes from the E3
 *   catalog readiness (completeness + the EXISTING compliance gate) plus the
 *   latest submission state.
 * - SIMULATION IS TRUTHFUL: every record is written with
 *   `mode: 'simulation'`, `simulated: true`. No live provider is ever called;
 *   no email is ever sent; no fabricated "real" result is produced.
 * - PERSISTENCE goes through the EXISTING D4 port: memory adapter by default
 *   (zero network, honestly non-durable), Supabase when credentials exist.
 * - IDEMPOTENT: every operational step is keyed by a canonical deterministic id,
 *   so replaying it cannot duplicate the record or re-apply the transition.
 */
import type {
  CommerceActivity,
  CommerceActivityType,
  CommerceEligibility,
  CommerceInvoice,
  CommercePayment,
  Deduction,
  DeductionType,
  DisputeOutcome,
  InvoiceTermDays,
  PurchaseOrder,
  ReceivingStatus,
} from '@/types';
import type { AcquisitionActor } from '@/lib/acquisition/outreachLifecycle';
import { evaluateCatalogReadiness } from '@/lib/catalog/catalogLifecycle';
import {
  acknowledgePurchaseOrder,
  createShipmentForPO,
  createSimulatedPurchaseOrder,
  fetchPurchaseOrder,
} from '@/data/api';
import { createPersistenceMirror, getDomainRepository } from '@/data/domainRepository';
import * as store from '@/data/demoStore';
import { findOrCreateTicketForBrand } from '@/lib/helpdesk/ticketStore';
import { notifyCanonicalStoreChange } from '@/lib/domain/canonicalSignal';
import { getChannelInstructionForPO, markChannelInstructionActioned } from './channelInstructions';
/** §P13 / S7 — the acknowledgement obligation family has ONE owner (the config). */
import { PO_ACK_STATUSES_WITH_OBLIGATION } from '@/config/purchaseOrders';
import { beginProxyProcessing } from './proxyProcessor';
import {
  INVOICE_TERM_CHOICES,
  INVOICE_TERM_DAYS,
  invoiceDueDate,
  isInvoiceTermDays,
} from './invoiceTerms';
import {
  invoiceAmountIsValid,
  invoiceCannotBeCancelled,
  invoiceIdForOrdinal,
  nextInvoiceNumber,
} from './invoiceRegistry';
import { invoiceReceiptGate, RECEIVING_STATUS_LABELS, summariseReceiving } from './receivingStatus';
import type { ReceivingSummary } from './receivingStatus';
import {
  applyChannelReceivingReading as applyChannelReceivingReadingOwner,
  type ChannelReceivingApplyResult,
  type ChannelReceivingReading,
} from './channelReceivingSync';

/**
 * The actor performing an operational commerce action. Extends the acquisition
 * actor with an OPTIONAL tenant pin, exactly like `OnboardingActor` (E2) and
 * `CatalogActor` (E3): a brand session carries its `tenantId` and the domain
 * then refuses any action on another tenant's record.
 */
export interface CommerceActor extends AcquisitionActor {
  tenantId?: string;
}

export type CommerceResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; reasons?: string[] };

const FORBIDDEN = 'FORBIDDEN — the acting account is view-only.';
const CROSS_TENANT = 'CROSS_TENANT — that operational record belongs to another tenant.';
const NOT_FOUND = 'NOT_FOUND — no such operational record.';
const NOT_ELIGIBLE = 'NOT_ELIGIBLE — the product has not completed the catalog lifecycle.';

/** The ONLY mode reachable in this environment. Positively identified. */
const SIMULATION = store.COMMERCE_SIMULATION_MODE;

/** Tenant isolation guard — a pinned actor may act ONLY on its own records. */
function crossTenant(actor: CommerceActor, brandId: string): boolean {
  return !!actor.tenantId && actor.tenantId !== brandId;
}

function forbidden<T>(): CommerceResult<T> {
  return { ok: false, error: FORBIDDEN };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** ONE persistence mirror for commerce writes (the existing D4 port). */
const persistence = createPersistenceMirror();

/** Honest persistence status for the commerce store (memory-only by default). */
export function getCommercePersistenceStatus() {
  return persistence.status();
}

export async function flushCommercePersistence(): Promise<void> {
  await persistence.flush();
}

/** The truthful mode of the operational commerce simulation. */
export function commerceMode(): 'simulation' | 'live' {
  return SIMULATION;
}

/**
 * Record ONE operational step: the canonical activity, the platform audit entry
 * and the durable mirror. This is the single write path for the lifecycle.
 */
function recordStep(input: {
  brandId: string;
  type: CommerceActivityType;
  status: string;
  detail: string;
  actorId: string;
  purchaseOrderId?: string;
  shipmentId?: string;
  invoiceId?: string;
  deductionId?: string;
}): CommerceActivity {
  const sequence = store.nextCommerceSequence(input.brandId, input.type);
  const activity = store.recordCommerceActivity({
    id: store.commerceActivityId(input.brandId, input.type, sequence),
    brandId: input.brandId,
    type: input.type,
    status: input.status,
    purchaseOrderId: input.purchaseOrderId,
    shipmentId: input.shipmentId,
    invoiceId: input.invoiceId,
    deductionId: input.deductionId,
    detail: input.detail,
    actorId: input.actorId,
    mode: SIMULATION,
    simulated: true,
  });
  persistence.write('commerce_activities', activity.id, () =>
    getDomainRepository().persistCommerceActivity(activity, input.brandId)
  );
  store.recordCommerceAudit(
    `commerce_${input.type}`,
    activity.id,
    input.brandId,
    `${input.actorId}: ${input.detail}`,
    input.actorId,
    {
      type: input.type,
      status: input.status,
      mode: activity.mode,
      simulated: activity.simulated,
      purchaseOrderId: input.purchaseOrderId,
      shipmentId: input.shipmentId,
      invoiceId: input.invoiceId,
      deductionId: input.deductionId,
    }
  );
  return activity;
}

/** Mirror one canonical operational PO through the existing D4 port. */
function mirrorPo(po: PurchaseOrder): void {
  persistence.write('commerce_purchase_orders', po.id, () =>
    getDomainRepository().persistCommercePurchaseOrder(po, po.brandId)
  );
}

/** Stamp explicit simulation provenance onto a canonical PO (never inferred). */
function stampSimulation(po: PurchaseOrder): PurchaseOrder {
  po.mode = SIMULATION;
  po.simulated = true;
  return po;
}

/**
 * §Phase E4 — OPERATIONAL ELIGIBILITY for ONE product.
 *
 * DERIVED from the E3 catalog lifecycle: the product must (a) exist, (b) be
 * complete, (c) pass the EXISTING compliance gate, and (d) carry a submission
 * that has not been rejected. Nothing here re-implements compliance.
 */
export async function evaluateCommerceEligibility(
  brandId: string,
  sku: string,
  actor: CommerceActor
): Promise<CommerceResult<CommerceEligibility>> {
  if (crossTenant(actor, brandId)) return { ok: false, error: CROSS_TENANT };

  const product = store.findCatalogProduct(brandId, sku);
  const readiness = await evaluateCatalogReadiness(
    brandId,
    product as unknown as Record<string, unknown> | undefined
  );
  const submission = store.latestSubmissionForProduct(brandId, sku);

  const reasons: string[] = [];
  if (!product) reasons.push('No catalog product exists for this SKU in the tenant.');
  if (!readiness.complete) {
    reasons.push(
      `Product information is incomplete (${readiness.missing.length} required field(s) missing).`
    );
  }
  if (!readiness.compliant) reasons.push('The compliance gate is not cleared for this tenant.');
  if (!readiness.readyForSubmission) {
    reasons.push('The product is not READY (completeness and compliance must both pass).');
  }
  if (!submission) {
    reasons.push('The product has no catalog submission — submit it before commerce.');
  } else if (submission.status === 'rejected') {
    reasons.push('The latest catalog submission was REJECTED — resubmit and pass before commerce.');
  }

  return {
    ok: true,
    value: {
      eligible: reasons.length === 0,
      brandId,
      sku,
      productId: product?.id,
      reasons,
      readiness,
      submissionStatus: submission?.status,
    },
  };
}


/* ── 1. SIMULATED PURCHASE ORDER ─────────────────────────────────────────── */

/**
 * §Phase E4 — raise a SIMULATED purchase order for an ELIGIBLE product.
 *
 * Refuses (with NO state mutation) when the product has not completed the E3
 * catalog lifecycle. Uses the SIMULATION-SAFE creation path: no email, no
 * provider call. Idempotent per (tenant, product).
 */
export async function createCommercePurchaseOrder(
  brandId: string,
  sku: string,
  quantity: number,
  actor: CommerceActor
): Promise<CommerceResult<PurchaseOrder>> {
  if (!actor.canMutate) return forbidden();
  if (crossTenant(actor, brandId)) return { ok: false, error: CROSS_TENANT };

  const eligibility = await evaluateCommerceEligibility(brandId, sku, actor);
  if (!eligibility.ok) return { ok: false, error: eligibility.error };
  if (!eligibility.value.eligible) {
    // Refusal MUST NOT mutate state — nothing is written on this path.
    return { ok: false, error: NOT_ELIGIBLE, reasons: eligibility.value.reasons };
  }

  const product = store.findCatalogProduct(brandId, sku);
  if (!product) return { ok: false, error: NOT_FOUND };
  if (!Number.isFinite(quantity) || quantity < 1) {
    return { ok: false, error: 'INVALID_QUANTITY — a purchase order needs at least 1 unit.' };
  }

  const result = createSimulatedPurchaseOrder(
    brandId,
    [
      {
        sku,
        productName: product.name,
        quantity: Math.floor(quantity),
        unitPrice: product.exWorksPrice,
        commodityCode: product.commodityCode,
      },
    ],
    product.id,
    actor.tenantId ? undefined : actor.staffId
  );
  if (!result.ok) return { ok: false, error: result.error };

  const po = stampSimulation(result.po);
  mirrorPo(po);

  if (result.created) {
    recordStep({
      brandId,
      type: 'po_created',
      status: po.status,
      detail: `SIMULATED PO ${po.poNumber} created for ${sku} — ${Math.floor(quantity)} unit(s), GBP ${po.poValue.toFixed(2)}. No email sent; no live provider contacted.`,
      actorId: actor.staffId,
      purchaseOrderId: po.id,
    });
  }
  return { ok: true, value: po };
}

/* ── 2. PO ACKNOWLEDGEMENT ───────────────────────────────────────────────── */

/**
 * §Phase E4 — acknowledge a simulated PO (all lines accepted).
 * Enforces the legal transition, refuses a duplicate acknowledgement, and
 * records the audit trail with simulation provenance.
 *
 * §P4 — DIRECTION CORRECTED. The brand's decision is an INSTRUCTION to Mercenta
 * (`./channelInstructions`); the channel action is Mercenta's and runs through
 * `./proxyProcessor`. The domain function no longer implies the brand performs
 * the channel steps, and it stays SYNCHRONOUS (the browser specs and the commerce
 * lifecycle call it synchronously) — writing the instruction is synchronous and
 * Mercenta's side of the chain then runs and lands its outcome on the record.
 */
export function acknowledgeCommercePurchaseOrder(
  poId: string,
  actor: CommerceActor
): CommerceResult<PurchaseOrder> {
  if (!actor.canMutate) return forbidden();
  const po = fetchPurchaseOrder(poId);
  if (!po) return { ok: false, error: NOT_FOUND };
  if (crossTenant(actor, po.brandId)) return { ok: false, error: CROSS_TENANT };
  if (po.acknowledgedAt) {
    return { ok: false, error: 'ALREADY_ACKNOWLEDGED — duplicate acknowledgement refused.' };
  }
  /**
   * §P13 / S7 — the obligation family has ONE owner: the SAME config array the
   * acknowledgement window consumes (`src/config/purchaseOrders.ts →
   * PO_ACK_STATUSES_WITH_OBLIGATION`), never a re-typed literal. The value is
   * unchanged (`received` / `under_review`).
   */
  if (!PO_ACK_STATUSES_WITH_OBLIGATION.includes(po.status)) {
    return {
      ok: false,
      error: `ILLEGAL_TRANSITION — a PO in "${po.status}" cannot be acknowledged.`,
    };
  }

  const lineAcks = po.lineItems.map((l) => ({
    sku: l.sku,
    ackStatus: 'accepted' as const,
    acknowledgedQty: l.quantity,
  }));
  const res = acknowledgePurchaseOrder(
    poId,
    lineAcks,
    actor.tenantId ? undefined : actor.staffId
  );
  if (!res.ok) return { ok: false, error: res.error ?? 'ACKNOWLEDGEMENT_FAILED' };

  const updated = stampSimulation(fetchPurchaseOrder(poId) ?? po);
  mirrorPo(updated);
  recordStep({
    brandId: updated.brandId,
    type: 'po_acknowledged',
    status: updated.status,
    detail: `SIMULATED PO ${updated.poNumber} acknowledged — ${updated.lineItems.length} line(s) accepted`,
    actorId: actor.staffId,
    purchaseOrderId: updated.id,
  });

  /** §P4 — the brand's part is done; MERCENTA now performs the channel action. */
  if (res.instructionId) {
    recordStep({
      brandId: updated.brandId,
      type: 'po_acknowledged',
      status: updated.status,
      detail: `SIMULATED INSTRUCTION ${res.instructionId} issued to Mercenta for PO ${updated.poNumber} — Mercenta performs the channel acknowledgement, the routing request and the ASN filing.`,
      actorId: actor.staffId,
      purchaseOrderId: updated.id,
    });
    beginProxyProcessing(res.instructionId);
  }
  return { ok: true, value: updated };
}

/* ── 3. FULFILMENT / SHIPMENT ────────────────────────────────────────────── */

/**
 * §Phase E4 — fulfil an acknowledged PO through the EXISTING ASN seam.
 *
 * The shipment is created by `createShipmentForPO` (the real seam used in
 * production); with no live carrier credentials its carrier path is the
 * simulated one, so nothing is booked externally.
 *
 * §P4 — THIS IS MERCENTA'S CHANNEL ACTION, NOT THE BRAND'S JOB. Under the proxy
 * model the brand's only jobs are accept/reject/backorder → download & print its
 * documents → ship on time; **Mercenta raises the shipment request and files the
 * ASN**. This function is therefore the Mercenta-side path (the automated
 * `./proxyProcessor` is the same action, derived from the brand's instruction),
 * and it records its result on that instruction so the record shows WHO acted.
 * A brand surface never calls it.
 */
export function fulfilCommercePurchaseOrder(
  poId: string,
  actor: CommerceActor,
  carrier = 'dhl'
): CommerceResult<{ po: PurchaseOrder; shipmentId: string }> {
  if (!actor.canMutate) return forbidden();
  const po = fetchPurchaseOrder(poId);
  if (!po) return { ok: false, error: NOT_FOUND };
  if (crossTenant(actor, po.brandId)) return { ok: false, error: CROSS_TENANT };
  if (po.status !== 'accepted' && po.status !== 'ready_to_fulfil') {
    return { ok: false, error: `ILLEGAL_TRANSITION — a PO in "${po.status}" cannot be fulfilled.` };
  }

  const cartons = po.lineItems
    .filter((l) => l.ackStatus !== 'rejected')
    .map((l) => ({
      sku: l.sku,
      quantity: l.acknowledgedQty ?? l.quantity,
      weightKg: 1,
      lengthCm: 40,
      widthCm: 30,
      heightCm: 30,
    }));
  if (cartons.length === 0) {
    return { ok: false, error: 'NOTHING_TO_SHIP — this PO has no accepted lines.' };
  }

  const res = createShipmentForPO(
    poId,
    {
      cartons,
      shipDate: new Date().toISOString().slice(0, 10),
      carrier,
      /**
       * Regulated/perishable categories REQUIRE a lot number and expiry on the
       * ASN. These are SIMULATED values for a SIMULATED shipment — never real
       * warehouse or manufacturing data.
       */
      lotNumber: `SIM-LOT-${po.poNumber}`,
      expiryDate: new Date(Date.now() + 548 * 864e5).toISOString().slice(0, 10),
    },
    actor.tenantId ? undefined : actor.staffId
  );
  if (!res.ok || !res.shipmentId) {
    return { ok: false, error: res.error ?? 'FULFILMENT_FAILED' };
  }

  const shipped = stampSimulation(store.setPurchaseOrderStatus(poId, 'shipped') ?? po);
  mirrorPo(shipped);
  recordStep({
    brandId: shipped.brandId,
    type: 'po_fulfilment_started',
    status: shipped.status,
    detail: `SIMULATED shipment ${res.shipmentId} created for PO ${shipped.poNumber} via ${carrier}`,
    actorId: actor.staffId,
    purchaseOrderId: shipped.id,
    shipmentId: res.shipmentId,
  });
  recordStep({
    brandId: shipped.brandId,
    type: 'shipment_advanced',
    status: 'factory_intake',
    detail: `SIMULATED shipment ${res.shipmentId} at factory intake`,
    actorId: actor.staffId,
    purchaseOrderId: shipped.id,
    shipmentId: res.shipmentId,
  });

  /**
   * §P4 — record Mercenta's action on the brand's instruction, so the canonical
   * record shows the ASN was filed by MERCENTA (not by the brand).
   */
  const instruction = getChannelInstructionForPO(poId, 'po_acknowledgement');
  if (instruction && instruction.state === 'pending_mercenta_action') {
    markChannelInstructionActioned(instruction.id, {
      actionedAt: new Date().toISOString(),
      routingRequest: {
        raised: true,
        carrier,
        channelArrangesCarrier: po.freightTerm === 'collect',
        reference: `RR-${po.poNumber}`,
      },
      asn: { filed: true, shipmentId: res.shipmentId, reference: `${carrier.slice(0, 2).toUpperCase()}-${po.poNumber}` },
    });
  }
  return { ok: true, value: { po: shipped, shipmentId: res.shipmentId } };
}

/** The EXISTING freight track, in order. No new shipment vocabulary is added. */
const FREIGHT_TRACK = [
  'factory_intake',
  'bak_depot',
  'sea_transit',
  'uk_customs_cleared',
  /**
   * §P5 REPOINTED THIS (old contract, for the record): the step after customs was
   * `mercenta_hub`. No channel source requires a Mercenta-owned hub, so the step
   * is now arrival at the PO's declared destination FC (`destination_fc`), which
   * is what the carrier's `delivered` milestone actually means.
   */
  'destination_fc',
  'live_amazon',
];

/**
 * §Phase E4 — advance a simulated shipment ONE step along the existing track.
 * Refuses once the track is exhausted; no live carrier API is called.
 */
export function advanceCommerceShipment(
  shipmentId: string,
  actor: CommerceActor
): CommerceResult<{ shipmentId: string; status: string }> {
  if (!actor.canMutate) return forbidden();
  const shipment = store.demoShipments.find((s) => s.id === shipmentId);
  if (!shipment) return { ok: false, error: NOT_FOUND };
  if (crossTenant(actor, shipment.brandId)) return { ok: false, error: CROSS_TENANT };

  const index = FREIGHT_TRACK.indexOf(shipment.status);
  if (index < 0 || index >= FREIGHT_TRACK.length - 1) {
    return {
      ok: false,
      error: `ILLEGAL_TRANSITION — the shipment is already at "${shipment.status}".`,
    };
  }
  const previous = shipment.status;
  const next = FREIGHT_TRACK[index + 1];
  shipment.status = next;

  const linkedPo = store
    .getCommerceActivitiesForBrand(shipment.brandId)
    .find((a) => a.shipmentId === shipmentId)?.purchaseOrderId;
  recordStep({
    brandId: shipment.brandId,
    type: 'shipment_advanced',
    status: next,
    detail: `SIMULATED shipment ${shipmentId}: ${previous} → ${next}`,
    actorId: actor.staffId,
    purchaseOrderId: linkedPo,
    shipmentId,
  });
  notifyCanonicalStoreChange();
  return { ok: true, value: { shipmentId, status: next } };
}

/* ── 4. RECEIVING ────────────────────────────────────────────────────────── */

/**
 * §Phase E4 — receive a shipped PO.
 *
 * Reuses the EXISTING delivery-time reconciliation (`reconcileDelivery`), which
 * compares received against acknowledged quantities and auto-raises shortage
 * deductions. Default receiving records the full acknowledged quantity; an
 * explicit `receivedBySku` map exercises the exception path.
 */
export function receiveCommercePurchaseOrder(
  poId: string,
  actor: CommerceActor,
  receivedBySku?: Record<string, number>
): CommerceResult<{
  po: PurchaseOrder;
  shortfalls: { sku: string; confirmedQty: number; receivedQty: number }[];
  deductions: Deduction[];
  /** §P7 — the receiving status the channel's concept resolves to (`AV-018`). */
  receivingStatus: ReceivingStatus;
  /** §P7 — the full receipt picture (ordered / confirmed / received / short). */
  receiving: ReceivingSummary;
}> {
  if (!actor.canMutate) return forbidden();
  const po = fetchPurchaseOrder(poId);
  if (!po) return { ok: false, error: NOT_FOUND };
  if (crossTenant(actor, po.brandId)) return { ok: false, error: CROSS_TENANT };
  if (po.status !== 'shipped' && po.status !== 'ready_to_fulfil' && po.status !== 'accepted') {
    return { ok: false, error: `ILLEGAL_TRANSITION — a PO in "${po.status}" cannot be received.` };
  }

  const received: Record<string, number> =
    receivedBySku ??
    Object.fromEntries(
      po.lineItems
        .filter((l) => l.ackStatus !== 'rejected')
        .map((l) => [l.sku, l.acknowledgedQty ?? l.quantity] as const)
    );

  const reconciliation = store.reconcileDelivery(poId, received, actor.staffId);
  if (!reconciliation) return { ok: false, error: NOT_FOUND };

  const delivered = stampSimulation(
    store.setPurchaseOrderStatus(poId, 'delivered') ?? reconciliation.po
  );
  mirrorPo(delivered);
  /**
   * §P7 — the receipt is recorded on the PO. The STATUS is derived from the line
   * quantities (`receivingStatus.ts`), so only the timestamp is written here; the
   * invoice gate reads the derived status, never a stale copy.
   */
  const receivedAt = new Date().toISOString();
  store.setPurchaseOrderReceivedAt(poId, receivedAt);
  const receiving = summariseReceiving(delivered);
  recordStep({
    brandId: delivered.brandId,
    type: 'po_received',
    status: delivered.status,
    detail:
      reconciliation.shortfalls.length === 0
        ? `SIMULATED receiving complete for ${delivered.poNumber} — received matches acknowledged · receiving status ${RECEIVING_STATUS_LABELS[receiving.status]} (${receiving.receivedUnits}/${receiving.confirmedUnits} units)`
        : `SIMULATED receiving logged ${reconciliation.shortfalls.length} shortfall line(s) on ${delivered.poNumber} · receiving status ${RECEIVING_STATUS_LABELS[receiving.status]} (${receiving.receivedUnits}/${receiving.confirmedUnits} units)`,
    actorId: actor.staffId,
    purchaseOrderId: delivered.id,
  });

  // Exceptions auto-raised by reconciliation are stamped with provenance and
  // recorded on the SAME canonical activity trail.
  for (const deduction of reconciliation.deductionsCreated) {
    deduction.mode = SIMULATION;
    deduction.simulated = true;
    recordStep({
      brandId: delivered.brandId,
      type: 'exception_raised',
      status: deduction.status,
      detail: `SIMULATED shortage exception ${deduction.id} raised by receiving: ${deduction.reason}`,
      actorId: actor.staffId,
      purchaseOrderId: delivered.id,
      deductionId: deduction.id,
    });
  }

  return {
    ok: true,
    value: {
      po: delivered,
      shortfalls: reconciliation.shortfalls,
      deductions: reconciliation.deductionsCreated,
      receivingStatus: receiving.status,
      receiving,
    },
  };
}

/* ── 4b. §P12 — THE CHANNEL'S OWN RECEIVING READING ─────────────────────── */

/**
 * §P12 — APPLY the CHANNEL'S OWN receiving reading to the canonical purchase
 * order.
 *
 * §P7 recorded the honest limit that the receiving status was established by
 * Mercenta's OWN receiving step because the channel's receiving system was
 * simulated. §P12 reads the channel directly
 * (`src/lib/commerce/channelReceivingSync.ts` → `getPurchaseOrdersStatus`), and
 * this function is that reading's write path into the canonical store — through
 * the SAME canonical receiving step, so the derived status, the reconciliation
 * and the shortage deductions are all the existing ones.
 *
 * FAIL CLOSED (inherited from the owner, not re-implemented here): a SIMULATED
 * reading is refused outright, so a simulated quantity can never appear as
 * received stock. In this environment every reading is simulated, so this path
 * refuses — and says exactly why.
 */
export function applyChannelReceivingReadingToStore(
  reading: ChannelReceivingReading,
  actor: CommerceActor
): ChannelReceivingApplyResult {
  return applyChannelReceivingReadingOwner({
    reading,
    actorId: actor.staffId,
    writer: {
      receive: ({ poId, receivedBySku, actorId }) => {
        const result = receiveCommercePurchaseOrder(
          poId,
          {
            staffId: actorId,
            canMutate: actor.canMutate,
            ...(actor.tenantId ? { tenantId: actor.tenantId } : {}),
          },
          receivedBySku
        );
        if (!result.ok) return { ok: false, error: result.error };
        return { ok: true, receivingStatus: result.value.receivingStatus };
      },
    },
  });
}

/* ── 5. SIMULATED INVOICE ────────────────────────────────────────────────── */

/**
 * §Phase E4, extended by §P7 — issue the SIMULATED goods invoice for a PO that
 * has been RECEIVED.
 *
 * §P7 adds the documented channel rules (`AV-022`) to this ONE write path:
 *  - the PO must have been RECEIVED — the receipt gate lives in
 *    `src/lib/commerce/receivingStatus.ts` and fails closed (`AV-018`);
 *  - the number is allocated by the ONE registry and is unique + NEVER reused;
 *  - a ZERO-VALUE invoice FAILS;
 *  - the terms (`14 | 30 | 60`) are chosen PER INVOICE and carried on the record,
 *    so the derived due date is the invoice's own (programme decision 2).
 *
 * Idempotent: an ACTIVE invoice for the PO is returned rather than duplicated.
 * Commission figures are taken from the canonical PO's own computed fields — no
 * duplicated commission maths, and no Xero/Wise/Stripe call.
 */
export function issueCommerceInvoice(
  poId: string,
  actor: CommerceActor,
  options: { termDays?: InvoiceTermDays } = {}
): CommerceResult<CommerceInvoice> {
  if (!actor.canMutate) return forbidden();
  const po = fetchPurchaseOrder(poId);
  if (!po) return { ok: false, error: NOT_FOUND };
  if (crossTenant(actor, po.brandId)) return { ok: false, error: CROSS_TENANT };

  const existing = store.getCommerceInvoiceForPo(poId);
  if (existing && existing.status !== 'cancelled') return { ok: true, value: existing };

  if (po.status !== 'delivered') {
    return {
      ok: false,
      error: `ILLEGAL_TRANSITION — an invoice requires a DELIVERED PO (currently "${po.status}").`,
    };
  }

  /* §P7 — the RECEIPT gate: an invoice is raised only AFTER receipt. */
  const receipt = invoiceReceiptGate(po);
  if (!receipt.allowed) return { ok: false, error: receipt.reason };

  /* §P7 — terms are chosen PER INVOICE; an undeclared value is REFUSED. */
  const termDays = options.termDays ?? INVOICE_TERM_DAYS;
  if (!isInvoiceTermDays(termDays)) {
    return {
      ok: false,
      error: `INVOICE_TERM_RULE — "${String(options.termDays)}" is not a declared term; Mercenta offers ${INVOICE_TERM_CHOICES.join('/')} days on an invoice (programme decision 2).`,
    };
  }

  const goodsLines = po.lineItems
    .filter((l) => l.ackStatus !== 'rejected')
    .map((l) => {
      const qty = l.receivedQty ?? l.acknowledgedQty ?? l.quantity;
      return {
        description: `${l.sku} — ${qty} × £${l.unitPrice.toFixed(2)} received on ${po.poNumber}`,
        amountGbp: round2(qty * l.unitPrice),
      };
    });
  const lines = [
    ...goodsLines,
    ...(po.commissionAmount > 0
      ? [
          {
            description: `Distribution commission on ${po.poNumber} (${(po.commissionRate * 100).toFixed(1)}%)`,
            amountGbp: round2(po.commissionAmount),
          },
        ]
      : []),
  ];

  const subtotalGbp = round2(lines.reduce((s, l) => s + l.amountGbp, 0));

  /* §P7 / AV-022 — a ZERO-VALUE invoice FAILS. Never issued, never rounded up. */
  if (!invoiceAmountIsValid(subtotalGbp)) {
    return {
      ok: false,
      error: `INVOICE_ZERO_VALUE — a zero-value invoice fails validation and was not issued (AV-022). The received quantity on ${po.poNumber} totals GBP 0.00.`,
    };
  }

  /* §P7 / AV-022 — the ONE registry allocates a number that is never reused. */
  const { number, ordinal } = nextInvoiceNumber(store.getInvoiceNumberLedger(), po);
  const priorInvoices = store.getAllCommerceInvoicesForPo(po.id);
  const superseded = priorInvoices[priorInvoices.length - 1];

  const invoice: CommerceInvoice = {
    id: invoiceIdForOrdinal(po.brandId, po.poNumber, ordinal),
    brandId: po.brandId,
    purchaseOrderId: po.id,
    poNumber: po.poNumber,
    number,
    lines,
    subtotalGbp,
    status: 'issued',
    termDays,
    currency: 'GBP',
    mode: SIMULATION,
    simulated: true,
    issuedAt: new Date().toISOString(),
    replacesInvoiceId: ordinal > 1 ? superseded?.id : undefined,
  };
  store.recordCommerceInvoice(invoice);
  /* The allocation is recorded in the SAME step as the invoice, so a number can
     never be handed out without an invoice consuming it. */
  store.recordInvoiceNumberAllocation({
    number,
    purchaseOrderId: po.id,
    poNumber: po.poNumber,
    brandId: po.brandId,
    ordinal,
    invoiceId: invoice.id,
    allocatedAt: invoice.issuedAt,
  });
  /* `AV-022` re-issue chain: the cancelled invoice points forward to its
     replacement, so the journal reads as a version history, never as a gap. */
  if (superseded) {
    store.updateCommerceInvoice(superseded.id, { replacedByInvoiceId: invoice.id });
  }
  persistence.write('commerce_invoices', invoice.id, () =>
    getDomainRepository().persistCommerceInvoice(invoice, invoice.brandId)
  );
  recordStep({
    brandId: invoice.brandId,
    type: 'invoice_issued',
    status: invoice.status,
    detail: `SIMULATED invoice ${invoice.number} issued for ${po.poNumber} — GBP ${invoice.subtotalGbp.toFixed(2)} · ${termDays}-day terms (${receipt.reason}) · derived due ${invoiceDueDate(invoice)}. No accounting provider contacted.`,
    actorId: actor.staffId,
    purchaseOrderId: po.id,
    invoiceId: invoice.id,
  });
  return { ok: true, value: invoice };
}

/* ── 5b. CANCELLING AN ISSUED INVOICE (AV-022) ───────────────────────────── */

/**
 * §P7 — CANCEL an issued invoice.
 *
 * Documented channel rule (`AV-022`, source `S11`): a wrong invoice is cancelled
 * and re-sent under a **NEW Invoice ID**. That is why invoice numbers are never
 * reused — cancelling VOIDS the number for ever, and the next
 * `issueCommerceInvoice` hands out the next ordinal instead.
 *
 * Refused (fail closed) when the invoice is not in force: it may not be cancelled
 * twice, and a SETTLED invoice may not be cancelled at all — money has moved, so
 * the correction belongs on the ledger (credit / deduction path), never in a
 * rewrite of an issued record. The reason is REQUIRED, attributed and audited.
 */
export function cancelCommerceInvoice(
  invoiceId: string,
  actor: CommerceActor,
  reason: string
): CommerceResult<CommerceInvoice> {
  if (!actor.canMutate) return forbidden();
  const invoice = store.getCommerceInvoice(invoiceId);
  if (!invoice) return { ok: false, error: NOT_FOUND };
  if (crossTenant(actor, invoice.brandId)) return { ok: false, error: CROSS_TENANT };
  if (!reason || !reason.trim()) {
    return {
      ok: false,
      error:
        'INVOICE_CANCEL_REASON_REQUIRED — a cancellation must state why (AV-022); it is attributed and audited.',
    };
  }
  if (invoiceCannotBeCancelled(invoice)) {
    return {
      ok: false,
      error: `INVOICE_NOT_CANCELLABLE — only an ISSUED invoice can be cancelled (this one is "${invoice.status}").`,
    };
  }
  if (store.getCommercePaymentsForInvoice(invoice.id).length > 0) {
    return {
      ok: false,
      error: `INVOICE_NOT_CANCELLABLE — invoice ${invoice.number} has a settled payment; a paid invoice is corrected on the ledger, never cancelled.`,
    };
  }

  const at = new Date().toISOString();
  const updated =
    store.updateCommerceInvoice(invoice.id, {
      status: 'cancelled',
      cancelledAt: at,
      cancellationReason: reason.trim(),
    }) ?? invoice;
  /* The NUMBER stays consumed for ever — voided, never freed (`AV-022`). */
  store.voidInvoiceNumberAllocation(invoice.number, reason.trim(), at);
  persistence.write('commerce_invoices', updated.id, () =>
    getDomainRepository().persistCommerceInvoice(updated, updated.brandId)
  );
  recordStep({
    brandId: updated.brandId,
    type: 'invoice_cancelled',
    status: updated.status,
    detail: `SIMULATED invoice ${updated.number} CANCELLED for ${updated.poNumber} — ${reason.trim()}. The number stays consumed for ever; the correction must be issued under a NEW Invoice ID (AV-022).`,
    actorId: actor.staffId,
    purchaseOrderId: updated.purchaseOrderId,
    invoiceId: updated.id,
  });
  return { ok: true, value: updated };
}


/* ── 6. SIMULATED PAYMENT ────────────────────────────────────────────────── */

/**
 * §Phase E4 — settle a SIMULATED payment against an issued invoice.
 * Idempotent: an invoice with a settled payment returns the existing record.
 * No payment provider is contacted.
 */
export function recordCommercePayment(
  invoiceId: string,
  actor: CommerceActor
): CommerceResult<CommercePayment> {
  if (!actor.canMutate) return forbidden();
  const invoice = store.getCommerceInvoice(invoiceId);
  if (!invoice) return { ok: false, error: NOT_FOUND };
  if (crossTenant(actor, invoice.brandId)) return { ok: false, error: CROSS_TENANT };

  const existing = store.getCommercePaymentsForInvoice(invoiceId)[0];
  if (existing) return { ok: true, value: existing };

  const payment: CommercePayment = {
    id: `cpay-${invoice.brandId}-${invoice.id}`,
    brandId: invoice.brandId,
    invoiceId: invoice.id,
    purchaseOrderId: invoice.purchaseOrderId,
    amountGbp: invoice.subtotalGbp,
    status: 'settled',
    method: 'simulated_bank_transfer',
    mode: SIMULATION,
    simulated: true,
    at: new Date().toISOString(),
  };
  store.recordCommercePayment(payment);
  store.updateCommerceInvoice(invoice.id, { status: 'paid', paidAt: payment.at });
  persistence.write('commerce_payments', payment.id, () =>
    getDomainRepository().persistCommercePayment(payment, payment.brandId)
  );
  persistence.write('commerce_invoices', invoice.id, () =>
    getDomainRepository().persistCommerceInvoice(
      store.getCommerceInvoice(invoice.id) ?? invoice,
      invoice.brandId
    )
  );
  recordStep({
    brandId: payment.brandId,
    type: 'payment_recorded',
    status: payment.status,
    detail: `SIMULATED payment of GBP ${payment.amountGbp.toFixed(2)} settled against ${invoice.number}. No payment provider contacted.`,
    actorId: actor.staffId,
    purchaseOrderId: invoice.purchaseOrderId,
    invoiceId: invoice.id,
  });
  return { ok: true, value: payment };
}

/* ── 7. EXCEPTIONS / CHARGEBACKS ─────────────────────────────────────────── */

/**
 * §Phase E4 — raise a SIMULATED operational exception against a PO.
 * Uses the EXISTING Deduction ledger (no second chargeback system).
 */
export function raiseCommerceException(
  poId: string,
  type: DeductionType,
  amountGbp: number,
  reason: string,
  actor: CommerceActor,
  /**
   * §Phase E2E — optional deterministic id so a replayable demo run lands the
   * SAME ledger identity. The operator/brand UI passes nothing and keeps the
   * original generated id.
   */
  opts?: { id?: string }
): CommerceResult<Deduction> {
  if (!actor.canMutate) return forbidden();
  const po = fetchPurchaseOrder(poId);
  if (!po) return { ok: false, error: NOT_FOUND };
  if (crossTenant(actor, po.brandId)) return { ok: false, error: CROSS_TENANT };
  if (!reason.trim()) return { ok: false, error: 'A reason is required for an exception.' };

  const deduction = store.createDeductionInStore({
    id: opts?.id,
    brandId: po.brandId,
    purchaseOrderId: po.poNumber,
    type,
    amountGbp: round2(amountGbp),
    reason: reason.trim(),
    status: 'open',
    date: new Date().toISOString().slice(0, 10),
    evidenceNotes: 'Raised by the operational commerce simulation (no live provider).',
    mode: SIMULATION,
    simulated: true,
  });
  recordStep({
    brandId: po.brandId,
    type: 'exception_raised',
    status: deduction.status,
    detail: `SIMULATED exception (${type}) on ${po.poNumber} — GBP ${deduction.amountGbp.toFixed(2)}: ${reason.trim()}`,
    actorId: actor.staffId,
    purchaseOrderId: po.id,
    deductionId: deduction.id,
  });
  return { ok: true, value: deduction };
}

/** §Phase E4 — open a dispute against an existing exception. */
export function openCommerceDispute(
  deductionId: string,
  notes: string,
  actor: CommerceActor
): CommerceResult<Deduction> {
  if (!actor.canMutate) return forbidden();
  const existing = store.demoDeductions.find((d) => d.id === deductionId);
  if (!existing) return { ok: false, error: NOT_FOUND };
  if (crossTenant(actor, existing.brandId)) return { ok: false, error: CROSS_TENANT };
  if (!notes.trim()) return { ok: false, error: 'Dispute notes are required.' };

  const updated = store.disputeDeduction(deductionId, notes);
  if (!updated) return { ok: false, error: 'DISPUTE_FAILED' };
  updated.mode = SIMULATION;
  updated.simulated = true;
  recordStep({
    brandId: updated.brandId,
    type: 'dispute_opened',
    status: updated.status,
    detail: `SIMULATED dispute opened on ${updated.type} (${updated.purchaseOrderId})`,
    actorId: actor.staffId,
    deductionId: updated.id,
  });
  return { ok: true, value: updated };
}

/** §Phase E4 — resolve a dispute with a real outcome (won/lost/partial). */
export function resolveCommerceDispute(
  deductionId: string,
  outcome: DisputeOutcome,
  actor: CommerceActor
): CommerceResult<Deduction> {
  if (!actor.canMutate) return forbidden();
  /**
   * §Phase E2E — RESOLUTION IS AN OPERATOR DECISION.
   *
   * A brand may EVIDENCE and OPEN a dispute about its own deduction, but it must
   * never declare the outcome of that dispute on its own behalf ("brand cannot
   * falsely declare itself the winner"). Before this guard the brand portal's
   * shared commerce panel exposed a "Resolve (won)" control and the domain
   * accepted it, so a brand could award itself the money. The operator decision
   * is a genuine domain authorisation, not a hidden button.
   */
  if (actor.tenantId) {
    return {
      ok: false,
      error:
        'FORBIDDEN — dispute resolution is a Mercenta operations decision; a brand-pinned account cannot declare its own outcome.',
    };
  }
  const existing = store.demoDeductions.find((d) => d.id === deductionId);
  if (!existing) return { ok: false, error: NOT_FOUND };
  if (crossTenant(actor, existing.brandId)) return { ok: false, error: CROSS_TENANT };
  if (!existing.dispute) {
    return { ok: false, error: 'ILLEGAL_TRANSITION — the deduction has no open dispute.' };
  }
  if (existing.status === 'resolved') {
    return { ok: false, error: 'ILLEGAL_TRANSITION — the dispute is already resolved.' };
  }

  const updated = store.recordDisputeOutcome(deductionId, outcome);
  if (!updated) return { ok: false, error: 'RESOLUTION_FAILED' };
  updated.mode = SIMULATION;
  updated.simulated = true;
  recordStep({
    brandId: updated.brandId,
    type: 'dispute_resolved',
    status: updated.status,
    detail: `SIMULATED dispute resolved as ${outcome} on ${updated.purchaseOrderId}`,
    actorId: actor.staffId,
    deductionId: updated.id,
  });
  return { ok: true, value: updated };
}

/**
 * §Phase E4 — escalate an operational exception to the EXISTING helpdesk case
 * model (`ticketStore`). No parallel case system is created.
 */
export function openCommerceCase(
  poId: string,
  subject: string,
  actor: CommerceActor
): CommerceResult<{ ticketId: string }> {
  if (!actor.canMutate) return forbidden();
  const po = fetchPurchaseOrder(poId);
  if (!po) return { ok: false, error: NOT_FOUND };
  if (crossTenant(actor, po.brandId)) return { ok: false, error: CROSS_TENANT };

  const ticket = findOrCreateTicketForBrand(po.brandId, subject, 'email', 'fulfillment');
  recordStep({
    brandId: po.brandId,
    type: 'exception_raised',
    status: 'case_open',
    detail: `SIMULATED operational case ${ticket.id} opened for ${po.poNumber}: ${subject}`,
    actorId: actor.staffId,
    purchaseOrderId: po.id,
  });
  return { ok: true, value: { ticketId: ticket.id } };
}

/* ── 8. READ MODELS (tenant-scoped) ──────────────────────────────────────── */

/**
 * Read models follow the same rule as every mutator: a brand-pinned actor sees
 * ONLY its own records; an ops actor (no tenant pin) sees the whole operation.
 * A brand is never able to read another tenant's POs, shipments, invoices,
 * payments or exceptions through these functions.
 */
export function listBrandCommerceActivity(
  brandId: string,
  actor: CommerceActor
): CommerceResult<CommerceActivity[]> {
  if (crossTenant(actor, brandId)) return { ok: false, error: CROSS_TENANT };
  return { ok: true, value: store.getCommerceActivitiesForBrand(brandId) };
}

export function listAllCommerceActivity(
  actor: CommerceActor
): CommerceResult<CommerceActivity[]> {
  if (actor.tenantId) return { ok: false, error: CROSS_TENANT };
  return { ok: true, value: store.getAllCommerceActivities() };
}

export function listBrandCommerceInvoices(
  brandId: string,
  actor: CommerceActor
): CommerceResult<CommerceInvoice[]> {
  if (crossTenant(actor, brandId)) return { ok: false, error: CROSS_TENANT };
  return { ok: true, value: store.getCommerceInvoicesForBrand(brandId) };
}

export function listAllCommerceInvoices(
  actor: CommerceActor
): CommerceResult<CommerceInvoice[]> {
  if (actor.tenantId) return { ok: false, error: CROSS_TENANT };
  return { ok: true, value: store.demoCommerceInvoices };
}

export function listBrandCommercePayments(
  brandId: string,
  actor: CommerceActor
): CommerceResult<CommercePayment[]> {
  if (crossTenant(actor, brandId)) return { ok: false, error: CROSS_TENANT };
  return { ok: true, value: store.getCommercePaymentsForBrand(brandId) };
}

export function listAllCommercePayments(
  actor: CommerceActor
): CommerceResult<CommercePayment[]> {
  if (actor.tenantId) return { ok: false, error: CROSS_TENANT };
  return { ok: true, value: store.demoCommercePayments };
}

export function listBrandCommerceExceptions(
  brandId: string,
  actor: CommerceActor
): CommerceResult<Deduction[]> {
  if (crossTenant(actor, brandId)) return { ok: false, error: CROSS_TENANT };
  return { ok: true, value: store.demoDeductions.filter((d) => d.brandId === brandId) };
}

export function listAllCommerceExceptions(actor: CommerceActor): CommerceResult<Deduction[]> {
  if (actor.tenantId) return { ok: false, error: CROSS_TENANT };
  return { ok: true, value: store.demoDeductions };
}

/** The canonical PO for a commerce record, tenant-guarded. */
export function getCommercePurchaseOrder(
  poId: string,
  actor: CommerceActor
): CommerceResult<PurchaseOrder> {
  const po = fetchPurchaseOrder(poId);
  if (!po) return { ok: false, error: NOT_FOUND };
  if (crossTenant(actor, po.brandId)) return { ok: false, error: CROSS_TENANT };
  return { ok: true, value: po };
}
