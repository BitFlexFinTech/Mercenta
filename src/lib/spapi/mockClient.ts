/**
 * §10/§14 — MOCK Amazon SP-API client.
 *
 * Standing rule (mock-first): a missing real credential is never a reason to
 * stop building. This client implements the EXACT same method signatures and
 * data shapes as the real client returned by createSpApiClient(), so every
 * downstream feature (catalog submission, PO polling, shipment confirmation)
 * runs identically against simulated responses until real LWA credentials are
 * configured in the Integrations wizard. Swapping to the real client is a
 * credentials change only — zero code changes elsewhere.
 *
 * Simulated behaviours:
 *  - catalog submissions advance Submitted → Under Amazon Review → Live
 *    on successive polls; every Nth submission comes back Rejected with a
 *    realistic reason so that path stays testable too;
 *  - PO polling returns a rotating set of POs in different states;
 *  - shipment confirmation always succeeds.
 */

import type {
  AcknowledgementPayload,
  AcknowledgementResult,
  ChannelPurchaseOrder,
  ChannelPurchaseOrderLine,
  ChannelPurchaseOrderReadResult,
  ChannelPurchaseOrdersStatusResult,
  FetchLike,
  InventoryUpdatePayload,
  InventoryUpdateResult,
  InvoiceSubmissionPayload,
  InvoiceSubmissionResult,
  ShipmentConfirmationPayload,
  ShipmentConfirmationResult,
  ShipmentDetailsResult,
  ShipmentLabelsResult,
  ShipmentRequestPayload,
  ShipmentRequestResult,
} from './client';
import { simulatedAsinFor } from '@/lib/catalog/asin';
import { DEMO_PRODUCTS } from '@/data/demoData';
import { declaredShipToParty } from '@/config/destinationFc';
import { channelShipmentLabelsAvailability } from '@/config/shipping';
import { TRUCKLOAD_CONFIRMATION_LIMIT } from '@/lib/shipping/consolidation';
import { UK_MARKETPLACE_ID } from './transform';

export interface SubmissionResult {
  ok: boolean;
  submissionId?: string;
  status?: 'submitted' | 'under_amazon_review';
  error?: string;
}

export interface MockSubmissionState {
  id: string;
  polls: number;
  /** Deterministic rejection schedule: every 4th submission rejects. */
  willReject: boolean;
}

const REJECTION_REASONS = [
  'TITLE attribute missing required brand name element',
  'product_images: main image below 1000px minimum requirement',
  'browse_node mapping invalid for approved category',
];

/**
 * §P4 — the channel's refusals for an acknowledgement submission.
 *
 * Both restate a rule the platform ALREADY enforces at its own domain boundary
 * (`src/data/api.ts → acknowledgePurchaseOrder`), so the mock adds no invented
 * channel rule: an acknowledgement can never exceed the ordered quantity, and a
 * backordered line always carries a scheduled ship date. They are reachable by
 * calling the seam directly, which is how the failure path stays genuinely
 * testable (a normal product flow cannot reach them).
 *
 * An acknowledgement in which EVERY line is rejected is NOT a refusal — it is a
 * legitimate vendor outcome (the channel's own `itemConfirmationStatus` carries
 * `REJECTED`), so the mock returns it as `status: 'rejected'`.
 */
const ACK_REFUSALS = {
  empty:
    'ACKNOWLEDGEMENT_EMPTY — a submission with no lines carries no decision.',
  overQuantity:
    'ACKNOWLEDGEMENT_EXCEEDS_ORDER — acknowledged quantity cannot exceed the ordered quantity on a line.',
  backorderWithoutDate:
    'ACKNOWLEDGEMENT_MISSING_DATE — a backordered line requires a scheduled ship date.',
} as const;

/** Module-level so the whole app shares one simulated Amazon world. */
const submissions = new Map<string, MockSubmissionState>();
let submissionCounter = 0;

/** §P4 — deterministic acknowledgement references (`MOCK-ACK-00001`). */
let acknowledgementCounter = 0;

/* ═══════════════════════════════════════════════════════════════════════════
 * §P12 — THE SIMULATED CHANNEL'S SHIPMENT / RECEIVING / INVOICE / STOCK WORLD.
 *
 * One in-memory world, so the operations are COHERENT with each other the way a
 * real channel's are: a shipment request must exist before routing instructions
 * can be returned, and a confirmed shipment is what makes the channel's own
 * receiving sync report a receipt. Every identifier is unmistakably simulated
 * (`MOCK-SHP-REQ-…`, `MOCK-ARN-…`, `MOCK-ASN-…`, `MOCK-INV-ACK-…`,
 * `MOCK-INV-UPD-…`) and nothing here makes a network call.
 * ═══════════════════════════════════════════════════════════════════════════ */

/** §P12 — the channel's refusals for the operations added in this phase. */
const OPS_REFUSALS = {
  statusIdsEmpty:
    'PURCHASE_ORDER_IDS_EMPTY — a receiving sync must name at least one purchase order.',
  shipmentRequestEmpty:
    'SHIPMENT_REQUEST_EMPTY — a shipment request must name the purchase order(s) it covers.',
  shipmentRequestDuplicate:
    'SHIPMENT_REQUEST_DUPLICATE — a purchase order is declared twice in the same request.',
  shipmentRequestTooLarge:
    `SHIPMENT_REQUEST_TOO_LARGE — above the channel's limit of ${TRUCKLOAD_CONFIRMATION_LIMIT} shipment confirmations for a truckload shipment.`,
  shipmentRequestUnknown:
    'SHIPMENT_REQUEST_UNKNOWN — the channel has no such shipment request, so it returns no routing instructions.',
  confirmationEmpty:
    'SHIPMENT_CONFIRMATION_EMPTY — an ASN with no cartons declares nothing.',
  confirmationNoPurchaseOrders:
    'SHIPMENT_CONFIRMATION_NO_PURCHASE_ORDERS — an ASN must name the purchase order(s) it covers.',
  confirmationCartonWithoutPo:
    'SHIPMENT_CONFIRMATION_CARTON_WITHOUT_PO — every carton must reference the purchase order it carries.',
  confirmationCartonPoNotDeclared:
    'SHIPMENT_CONFIRMATION_CARTON_PO_NOT_DECLARED — a carton references a purchase order the confirmation does not declare.',
  invoiceNumberMissing: 'INVOICE_NUMBER_MISSING — the channel requires an Invoice ID (AV-022).',
  invoiceZeroValue: 'INVOICE_ZERO_VALUE — a zero-value invoice fails (AV-022).',
  invoiceNumberReused:
    'INVOICE_NUMBER_ALREADY_USED — invoice numbers are unique and are never reused (AV-022).',
  inventorySkuMissing: 'INVENTORY_SKU_MISSING — an update must name the SKU it reports.',
  inventoryQuantityInvalid:
    'INVENTORY_QUANTITY_INVALID — a pushed quantity must be a number that is zero or greater.',
  inventoryUnitUndeclared:
    'INVENTORY_UNIT_UNDECLARED — a push must declare the unit of measure (Eaches/Cases).',
} as const;

interface MockShipmentRequest {
  shipmentRequestId: string;
  purchaseOrderNumbers: string[];
  requestedPickUp?: string;
  /** Reads so far — the channel answers with routing instructions only after assignment. */
  detailReads: number;
}

const shipmentRequests = new Map<string, MockShipmentRequest>();
let shipmentRequestCounter = 0;

interface MockConfirmedShipment {
  confirmationId: string;
  receivedDate: string;
  /** Received quantity per SKU, as the ASN declared it. */
  receivedBySku: Record<string, number>;
}

const confirmedShipments = new Map<string, MockConfirmedShipment>();
let confirmationCounter = 0;

/** The channel's consumed invoice numbers — the documented never-reused rule. */
const usedInvoiceNumbers = new Set<string>();
let invoiceCounter = 0;

let inventoryUpdateCounter = 0;

export function resetMockAmazonState(): void {
  submissions.clear();
  submissionCounter = 0;
  acknowledgementCounter = 0;
  shipmentRequests.clear();
  shipmentRequestCounter = 0;
  confirmedShipments.clear();
  confirmationCounter = 0;
  usedInvoiceNumbers.clear();
  invoiceCounter = 0;
  inventoryUpdateCounter = 0;
}

/** The padded simulated reference helper (one form, so ids cannot drift apart). */
const mockRef = (prefix: string, counter: number) => `${prefix}${String(counter).padStart(5, '0')}`;

/**
 * §P11 — THE SIMULATED CHANNEL'S PURCHASE-ORDER POOL.
 *
 * A retail-channel PO is ADDRESSED TO MERCENTA and its lines carry the SKUs the
 * channel ordered, which is what Mercenta routes by. The simulator therefore
 * derives every line from the CANONICAL catalogue (`DEMO_PRODUCTS`) rather than
 * retyping a second list of SKUs — the same single-source-of-truth rule the
 * runtime routing obeys, so a simulated PO is routable exactly as a real one.
 *
 * The pool deliberately contains:
 *   · routable POs for BOTH cleared tenants (so routing to the correct brand is
 *     exercised, not merely declared), and
 *   · ONE PO whose line matches no catalogue product, so the ingestion owner's
 *     fail-closed refusal is genuinely reachable from the product rather than
 *     only from a unit test.
 *
 * Every identity is unmistakably simulated (`MOCK-PO-…`), exactly as before.
 */
function simulatedLinesFor(brandId: string, baseQuantity: number): ChannelPurchaseOrderLine[] {
  return DEMO_PRODUCTS.filter((p) => p.brandId === brandId).map((p, i) => ({
    vendorSku: p.sku,
    quantity: baseQuantity + i * 5,
    unitPrice: p.exWorksPrice,
    commodityCode: p.commodityCode,
    productName: p.name,
  }));
}

const OUT_OF_CATALOGUE_LINE: ChannelPurchaseOrderLine = {
  vendorSku: 'MOCK-UNKNOWN-0001',
  quantity: 24,
  unitPrice: 9.5,
  commodityCode: '00000000',
  productName: 'Simulated channel line outside the Mercenta catalogue',
};

function simulatedChannelPo(input: {
  purchaseOrderId: string;
  brandId: string;
  baseQuantity: number;
  freightTerm: 'collect' | 'prepaid';
  dayOffset: number;
  fcIndex: number;
}): ChannelPurchaseOrder {
  const lines = simulatedLinesFor(input.brandId, input.baseQuantity);
  const poValue =
    Math.round(lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0) * 100) / 100;
  const orderDate = new Date(Date.now() - input.dayOffset * 864e5).toISOString().slice(0, 10);
  const base = new Date(orderDate).getTime();
  const iso = (days: number) => new Date(base + days * 864e5).toISOString().slice(0, 10);
  return {
    purchaseOrderId: input.purchaseOrderId,
    poValue,
    orderDate,
    shipToPartyId: declaredShipToParty(input.fcIndex).partyId,
    freightTerm: input.freightTerm,
    ...(input.freightTerm === 'collect'
      ? { shipWindowStart: iso(14), shipWindowEnd: iso(21) }
      : { deliveryWindowStart: iso(21), deliveryWindowEnd: iso(28) }),
    lines,
    simulated: true,
  };
}

const MOCK_PO_POOL: ChannelPurchaseOrder[] = [
  simulatedChannelPo({
    purchaseOrderId: 'MOCK-PO-8841',
    brandId: 'brand-astonish',
    baseQuantity: 120,
    freightTerm: 'prepaid',
    dayOffset: 3,
    fcIndex: 1,
  }),
  simulatedChannelPo({
    purchaseOrderId: 'MOCK-PO-8842',
    brandId: 'brand-tapatio',
    baseQuantity: 80,
    freightTerm: 'collect',
    dayOffset: 4,
    fcIndex: 2,
  }),
  simulatedChannelPo({
    purchaseOrderId: 'MOCK-PO-8843',
    brandId: 'brand-astonish',
    baseQuantity: 240,
    freightTerm: 'collect',
    dayOffset: 6,
    fcIndex: 3,
  }),
  /** The fail-closed path: no catalogue product matches this PO's line. */
  {
    purchaseOrderId: 'MOCK-PO-8844',
    poValue: 5120.0,
    orderDate: new Date(Date.now() - 5 * 864e5).toISOString().slice(0, 10),
    shipToPartyId: declaredShipToParty(4).partyId,
    freightTerm: 'prepaid',
    deliveryWindowStart: new Date(Date.now() + 16 * 864e5).toISOString().slice(0, 10),
    deliveryWindowEnd: new Date(Date.now() + 23 * 864e5).toISOString().slice(0, 10),
    lines: [OUT_OF_CATALOGUE_LINE],
    simulated: true,
  },
];

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Same shape as the transport-backed real client: an object with
 * submitCatalogItem / getSubmissionStatus / fetchPurchaseOrders /
 * confirmShipment. `transport` is accepted (and ignored) so call sites can
 * pass the exact same argument list they pass to createSpApiClient().
 */
 
export function createMockSpApiClient(_transport?: FetchLike) {
  return {
    async submitCatalogItem(payload: unknown): Promise<SubmissionResult> {
      await delay(250); // simulate network latency
      void payload;
      submissionCounter += 1;
      const id = `MOCK-SUB-${String(submissionCounter).padStart(5, '0')}`;
      submissions.set(id, {
        id,
        polls: 0,
        willReject: submissionCounter % 4 === 0,
      });
      return { ok: true, submissionId: id, status: 'submitted' };
    },

    async getSubmissionStatus(submissionId: string): Promise<{
      ok: boolean;
      status?: 'submitted' | 'under_amazon_review' | 'live' | 'rejected';
      rejectionReason?: string;
      /**
       * §P8 — the identifier the channel returns when it ACCEPTS the product
       * (decision 10). While this client is the mock, the value is the
       * unmistakable `SIM-ASIN-…` placeholder so the platform never fabricates a
       * plausible-looking identifier.
       */
      asin?: string;
      error?: string;
    }> {
      await delay(120);
      const st = submissions.get(submissionId);
      if (!st) return { ok: false, error: 'unknown submissionId (mock)' };
      st.polls += 1;
      if (st.willReject && st.polls >= 3) {
        return {
          ok: true,
          status: 'rejected',
          rejectionReason:
            REJECTION_REASONS[submissionCounter % REJECTION_REASONS.length],
        };
      }
      if (st.polls >= 3) {
        return { ok: true, status: 'live', asin: simulatedAsinFor(submissionId) };
      }
      if (st.polls === 2) return { ok: true, status: 'under_amazon_review' };
      return { ok: true, status: 'submitted' };
    },

    /**
     * §P11 — SIMULATED `fetchPurchaseOrders`.
     *
     * Same signature and result shape as the real client, so the ingestion path
     * runs identically before and after real LWA credentials are configured.
     * Returns the channel's own PO set for the requested window, so a first read
     * files the routable POs (and refuses the out-of-catalogue one), and a SECOND
     * read over the same window reports them as already held — the idempotency
     * guard and the fail-closed refusal are both reachable straight from the
     * product. Zero live network calls: the pool is in-memory and every identity
     * is unmistakably simulated (`MOCK-PO-…`).
     */
    async fetchPurchaseOrders(_sinceIso: string): Promise<ChannelPurchaseOrderReadResult> {
      await delay(150);
      return { ok: true, purchaseOrders: MOCK_PO_POOL.slice() };
    },

    async confirmShipment(_purchaseOrderId: string): Promise<{
      ok: boolean;
      error?: string;
    }> {
      await delay(120);
      return { ok: true };
    },

    /**
     * §P4 — SIMULATED `submitAcknowledgement` (AV-040).
     *
     * Same signature and result shape as the real client, so the Mercenta-side
     * proxy processor runs identically before and after real LWA credentials are
     * configured. It refuses exactly what the platform's own domain boundary
     * refuses (no accepted line / over-ordered quantity / backorder without a
     * date), so the refusal path is genuinely reachable and testable.
     *
     * The reference is unmistakably simulated (`MOCK-ACK-00001`) — it is never a
     * plausible-looking live identifier.
     */
    async submitAcknowledgement(payload: AcknowledgementPayload): Promise<AcknowledgementResult> {
      await delay(140); // simulate network latency
      const lines = payload.lines ?? [];
      if (lines.length === 0) return { ok: false, error: ACK_REFUSALS.empty };
      const overQty = lines.find((l) => l.ackStatus !== 'rejected' && l.acknowledgedQty > l.orderedQty);
      if (overQty) {
        return { ok: false, error: `${ACK_REFUSALS.overQuantity} (line ${overQty.sku})` };
      }
      const missingDate = lines.find((l) => l.ackStatus === 'backordered' && !l.scheduledShipDate);
      if (missingDate) {
        return { ok: false, error: `${ACK_REFUSALS.backorderWithoutDate} (line ${missingDate.sku})` };
      }

      acknowledgementCounter += 1;
      const acknowledgementId = `MOCK-ACK-${String(acknowledgementCounter).padStart(5, '0')}`;
      const accepted = lines.filter((l) => l.ackStatus !== 'rejected').length;
      const status: AcknowledgementResult['status'] =
        accepted === 0 ? 'rejected' : accepted === lines.length ? 'accepted' : 'partially_accepted';
      return { ok: true, acknowledgementId, status };
    },

    /**
     * §P12 — SIMULATED `getPurchaseOrdersStatus` (the receiving sync, `AV-040`).
     *
     * Answers from the simulated channel's OWN world: a PO the channel has never
     * been asked to confirm is `not_received` on every line, and a PO whose ASN
     * this mock accepted is `received` with the quantities the ASN declared. Ids
     * the channel does not know are reported as `unknownPurchaseOrderIds` — a
     * caller must never read "absent" as "not received".
     */
    async getPurchaseOrdersStatus(
      purchaseOrderIds: string[]
    ): Promise<ChannelPurchaseOrdersStatusResult> {
      await delay(140);
      const ids = purchaseOrderIds.map((v) => v.trim()).filter(Boolean);
      if (ids.length === 0) return { ok: false, error: OPS_REFUSALS.statusIdsEmpty };

      const known = new Map(MOCK_PO_POOL.map((po) => [po.purchaseOrderId, po]));
      const statuses: NonNullable<ChannelPurchaseOrdersStatusResult['statuses']> = [];
      const unknownPurchaseOrderIds: string[] = [];

      for (const id of ids) {
        const po = known.get(id);
        if (!po) {
          unknownPurchaseOrderIds.push(id);
          continue;
        }
        const confirmed = confirmedShipments.get(id);
        statuses.push({
          purchaseOrderId: id,
          status: confirmed ? 'received' : 'acknowledged',
          receivingStatus: confirmed ? 'received' : 'not_received',
          lines: po.lines.map((line) => ({
            vendorSku: line.vendorSku,
            ...(line.asin ? { asin: line.asin } : {}),
            orderedQty: line.quantity,
            receivedQty: confirmed ? confirmed.receivedBySku[line.vendorSku] ?? 0 : 0,
          })),
          ...(confirmed ? { receivedDate: confirmed.receivedDate } : {}),
          simulated: true,
        });
      }
      return { ok: true, statuses, unknownPurchaseOrderIds };
    },

    /**
     * §P12 — SIMULATED `submitShipmentRequest` (`SubmitShipments`, decision 11).
     *
     * Accepts the consignment's declared purchase-order set (1..n) and refuses
     * exactly what the channel refuses: an empty declaration, a duplicate, and
     * anything above the documented truckload-confirmation limit.
     */
    async submitShipmentRequest(payload: ShipmentRequestPayload): Promise<ShipmentRequestResult> {
      await delay(150);
      const poNumbers = (payload.purchaseOrderNumbers ?? []).map((v) => v.trim()).filter(Boolean);
      if (poNumbers.length === 0) return { ok: false, error: OPS_REFUSALS.shipmentRequestEmpty };
      const duplicate = poNumbers.find((value, i) => poNumbers.indexOf(value) !== i);
      if (duplicate) {
        return { ok: false, error: `${OPS_REFUSALS.shipmentRequestDuplicate} (${duplicate})` };
      }
      if (poNumbers.length > TRUCKLOAD_CONFIRMATION_LIMIT) {
        return { ok: false, error: OPS_REFUSALS.shipmentRequestTooLarge };
      }

      shipmentRequestCounter += 1;
      const shipmentRequestId = mockRef('MOCK-SHP-REQ-', shipmentRequestCounter);
      const request: MockShipmentRequest = {
        shipmentRequestId,
        purchaseOrderNumbers: poNumbers,
        ...(payload.requestedPickUp ? { requestedPickUp: payload.requestedPickUp } : {}),
        detailReads: 0,
      };
      for (const poNumber of poNumbers) shipmentRequests.set(poNumber, request);

      return {
        ok: true,
        shipmentRequestId,
        status: 'carrier_assignment_pending',
        simulated: true,
      };
    },

    /**
     * §P12 — SIMULATED `getShipmentDetails`.
     *
     * Mirrors the channel's documented behaviour: a response exists only AFTER
     * carrier assignment, so the FIRST read after a request reports
     * `carrier_assignment_pending` and the SECOND returns the routing
     * instructions — a simulated assignment schedule, so the collect chain can
     * genuinely advance rather than being permanently stuck. The ARN is
     * unmistakably simulated (`MOCK-ARN-…`).
     */
    async getShipmentDetails(shipmentRequestId: string): Promise<ShipmentDetailsResult> {
      await delay(120);
      const request = [...shipmentRequests.values()].find(
        (r) => r.shipmentRequestId === shipmentRequestId
      );
      if (!request) return { ok: false, error: OPS_REFUSALS.shipmentRequestUnknown };

      request.detailReads += 1;
      if (request.detailReads < 2) {
        return { ok: true, status: 'carrier_assignment_pending', simulated: true };
      }
      const assignedAt = new Date().toISOString();
      return {
        ok: true,
        status: 'carrier_assigned',
        arn: `MOCK-ARN-${request.shipmentRequestId.replace('MOCK-SHP-REQ-', '')}`,
        carrier: 'Simulated channel-appointed carrier',
        assignedAt,
        ...(request.requestedPickUp ? { pickupDate: request.requestedPickUp } : {}),
        simulated: true,
      };
    },

    /**
     * §P12 — SIMULATED `getShipmentLabels`.
     *
     * The simulated channel reads the SAME region rule as the live client
     * (`src/config/shipping.ts`) and refuses for the UK marketplace it stands in
     * for. It never fabricates a label: a simulated "Amazon label" for a UK/EU
     * consignment would be exactly the false claim the rule exists to prevent.
     */
    async getShipmentLabels(_shipmentId: string): Promise<ShipmentLabelsResult> {
      await delay(90);
      const availability = channelShipmentLabelsAvailability(UK_MARKETPLACE_ID);
      return { ok: false, refused: true, refusedReason: availability.reason };
    },

    /**
     * §P12 — SIMULATED `submitShipmentConfirmations` (the ASN, `AV-015`).
     *
     * Refuses what the channel refuses — an empty confirmation, no declared
     * purchase orders, a carton with no purchase-order reference, a carton
     * referencing a purchase order the confirmation does not declare — and then
     * records the confirmation in the simulated channel's world, which is what
     * makes the receiving sync report a receipt for those purchase orders.
     */
    async submitShipmentConfirmations(
      payload: ShipmentConfirmationPayload
    ): Promise<ShipmentConfirmationResult> {
      await delay(160);
      const cartons = payload.cartons ?? [];
      if (cartons.length === 0) return { ok: false, error: OPS_REFUSALS.confirmationEmpty };

      const declared = new Set(
        (payload.purchaseOrderNumbers ?? []).map((v) => v.trim()).filter(Boolean)
      );
      if (declared.size === 0) {
        return { ok: false, error: OPS_REFUSALS.confirmationNoPurchaseOrders };
      }
      const withoutPo = cartons.find((c) => !c.purchaseOrderNumber?.trim());
      if (withoutPo) {
        return {
          ok: false,
          error: `${OPS_REFUSALS.confirmationCartonWithoutPo} (carton ${withoutPo.cartonId})`,
        };
      }
      const outside = cartons.find((c) => !declared.has(c.purchaseOrderNumber.trim()));
      if (outside) {
        return {
          ok: false,
          error: `${OPS_REFUSALS.confirmationCartonPoNotDeclared} (carton ${outside.cartonId} → ${outside.purchaseOrderNumber})`,
        };
      }

      confirmationCounter += 1;
      const confirmationId = mockRef('MOCK-ASN-', confirmationCounter);
      const receivedDate = new Date().toISOString();
      for (const poNumber of declared) {
        const receivedBySku: Record<string, number> = {};
        for (const carton of cartons) {
          if (carton.purchaseOrderNumber.trim() !== poNumber) continue;
          receivedBySku[carton.vendorSku] = (receivedBySku[carton.vendorSku] ?? 0) + carton.quantity;
        }
        confirmedShipments.set(poNumber, { confirmationId, receivedDate, receivedBySku });
      }
      return { ok: true, confirmationId, status: 'accepted', simulated: true };
    },

    /**
     * §P12 — SIMULATED `submitInvoices`.
     *
     * The channel's own documented invoicing rules (`AV-022`) are what this
     * refuses: a missing Invoice ID, a ZERO-VALUE invoice, and a REUSED number
     * ("invoice numbers are unique and never reused"). It never re-numbers,
     * re-dates or re-prices the invoice it is given — the platform's registry is
     * the authority for all of those.
     */
    async submitInvoices(payload: InvoiceSubmissionPayload): Promise<InvoiceSubmissionResult> {
      await delay(170);
      const number = payload.invoiceNumber?.trim();
      if (!number) return { ok: false, error: OPS_REFUSALS.invoiceNumberMissing };
      if (!(payload.total > 0)) return { ok: false, error: OPS_REFUSALS.invoiceZeroValue };
      if (usedInvoiceNumbers.has(number)) {
        return { ok: false, error: `${OPS_REFUSALS.invoiceNumberReused} (${number})` };
      }
      usedInvoiceNumbers.add(number);
      invoiceCounter += 1;
      return {
        ok: true,
        submissionId: mockRef('MOCK-INV-ACK-', invoiceCounter),
        status: 'submitted',
        simulated: true,
      };
    },

    /**
     * §P12 — SIMULATED `submitInventoryUpdate`.
     *
     * The push direction of Mercenta's own inventory model (decision 5). It
     * refuses an unnamed SKU, a quantity that is not a number at or above zero
     * (a pushed stock figure cannot be negative) and an undeclared unit of
     * measure — the same vocabulary the canonical inventory owner validates
     * against (`Eaches` / `Cases`).
     */
    async submitInventoryUpdate(payload: InventoryUpdatePayload): Promise<InventoryUpdateResult> {
      await delay(130);
      if (!payload.sku?.trim()) return { ok: false, error: OPS_REFUSALS.inventorySkuMissing };
      if (!Number.isFinite(payload.quantity) || payload.quantity < 0) {
        return { ok: false, error: OPS_REFUSALS.inventoryQuantityInvalid };
      }
      if (payload.unitOfMeasure !== 'Eaches' && payload.unitOfMeasure !== 'Cases') {
        return { ok: false, error: OPS_REFUSALS.inventoryUnitUndeclared };
      }
      inventoryUpdateCounter += 1;
      return {
        ok: true,
        submissionId: mockRef('MOCK-INV-UPD-', inventoryUpdateCounter),
        simulated: true,
      };
    },
  };
}
