/**
 * §P12 — THE ONE OWNER OF MERCENTA'S CHANNEL SHIPMENT OPERATIONS.
 *
 * Programme `docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md` §4 P12;
 * register **`AV-040`**. Three of the four in-code P12 declarations point here:
 *
 *   1. `GetShipmentDetails` populates the routing instructions (the ARN) —
 *      declared in §P10's honest limit and in
 *      `src/components/shared/logistics/...`'s collect chain, which reports
 *      `awaiting_channel` until an ARN genuinely exists;
 *   2. `SubmitShipments` is the **declared activation for §P10's deferred
 *      consolidation grouping** (decision 11), so the request carries the
 *      consignment's DECLARED 1..n purchase-order set and is validated by the
 *      consolidation owner before it is submitted;
 *   3. `submitShipmentConfirmations` files the ASN (`AV-015`).
 *
 * HONESTY RULES
 * -------------
 *   · An ARN is never derived, defaulted or invented: `readChannelRoutingInstructions`
 *     reports `pending` until the CHANNEL returns one (a fabricated ARN would be a
 *     fake live-provider outcome).
 *   · Every outcome carries the seam's own `simulated` flag and the mode it came
 *     from, so a simulated chain is never presented as a live channel exchange.
 *   · A refusal from the channel is RETURNED as a value, with the channel's own
 *     code, so a caller states it rather than swallowing it.
 */
import type {
  ShipmentConfirmationCarton,
  ShipmentConfirmationPayload,
  ShipmentConfirmationResult,
  ShipmentDetailsResult,
  ShipmentRequestPayload,
  ShipmentRequestResult,
} from '@/lib/spapi/client';
import type { ChannelInstruction } from '@/types';
import { checkConsolidatable } from './consolidation';
import { validateRequestedPickUp } from './collectChain';

/** The seam shape this owner needs — the SP-API client satisfies it exactly. */
export interface ChannelShipmentOperationsReader {
  submitShipmentRequest(payload: ShipmentRequestPayload): Promise<ShipmentRequestResult>;
  getShipmentDetails(shipmentRequestId: string): Promise<ShipmentDetailsResult>;
  submitShipmentConfirmations(
    payload: ShipmentConfirmationPayload
  ): Promise<ShipmentConfirmationResult>;
}

/** One purchase order as the consolidation owner needs to see it. */
export interface ShipmentRequestPurchaseOrder {
  poNumber: string;
  brandId: string;
}

export interface ChannelShipmentRequestOutcome {
  ok: boolean;
  /** The declared purchase-order set actually submitted (validated, normalised). */
  purchaseOrderNumbers: string[];
  /** The channel's own reference for the request. */
  shipmentRequestId?: string;
  status?: ShipmentRequestResult['status'];
  /** The chain then awaits carrier assignment — routing instructions follow. */
  awaitingCarrierAssignment: boolean;
  mode: 'mock' | 'real';
  simulated: boolean;
  /** A stated refusal (the consolidation invariants, or the channel's own). */
  refusal?: string;
}

/**
 * Raise the channel shipment request for a consignment's DECLARED purchase-order
 * set (1..n — decision 11).
 *
 * The declaration is validated FIRST, by the consolidation owner, so a cross-tenant
 * grouping, a duplicate or anything above the channel's truckload confirmation
 * limit is refused BEFORE a channel call is made.
 */
export async function raiseChannelShipmentRequest(input: {
  reader: ChannelShipmentOperationsReader;
  /** The declared set — the consignment's own purchase orders. */
  purchaseOrders: readonly ShipmentRequestPurchaseOrder[];
  freightTerm: 'collect' | 'prepaid';
  /** The FC the channel declared on the PO. */
  shipToPartyId: string;
  /** Required on a Freight Collect PO (`AV-014`). */
  requestedPickUp?: string;
  /** The carrier, when Mercenta arranges carriage (Freight Prepaid). */
  carrier?: string;
}): Promise<ChannelShipmentRequestOutcome> {
  const brandId = input.purchaseOrders[0]?.brandId ?? '';
  const check = checkConsolidatable({
    brandId,
    purchaseOrders: input.purchaseOrders.map((po) => ({
      poNumber: po.poNumber,
      brandId: po.brandId,
    })),
  });
  if (!check.ok) {
    return {
      ok: false,
      purchaseOrderNumbers: [],
      awaitingCarrierAssignment: false,
      mode: 'mock',
      simulated: false,
      refusal: check.error,
    };
  }

  /**
   * §BATCH 2m (`AV-014`) — ENFORCE the channel's pickup lead time at the boundary.
   *
   * The channel documents that `requestedPickUp` must be "a date at least two
   * business days after the current date". From P6 the date was DERIVED and
   * SURFACED from the owner (`./collectChain`) but a caller-supplied value was
   * never REFUSED, so a collect request could be submitted earlier than the
   * channel allows. Here the submitted value is validated BEFORE any channel call:
   * a missing, unreadable or too-early date is refused with the stated reason and
   * NO request is made. (The consolidation invariants are checked first, so an
   * empty/duplicate/cross-tenant declaration is still refused for its own reason.)
   */
  if (input.freightTerm === 'collect') {
    const pickup = validateRequestedPickUp(input.requestedPickUp);
    if (!pickup.ok) {
      return {
        ok: false,
        purchaseOrderNumbers: check.poNumbers,
        awaitingCarrierAssignment: false,
        mode: 'mock',
        simulated: false,
        refusal: `SHIPMENT_REQUEST_REFUSED — ${pickup.error}`,
      };
    }
  }

  const response = await input.reader.submitShipmentRequest({
    purchaseOrderNumbers: check.poNumbers,
    freightTerm: input.freightTerm,
    shipToPartyId: input.shipToPartyId,
    ...(input.requestedPickUp ? { requestedPickUp: input.requestedPickUp } : {}),
    ...(input.carrier ? { carrier: input.carrier } : {}),
  });
  if (!response.ok) {
    return {
      ok: false,
      purchaseOrderNumbers: check.poNumbers,
      awaitingCarrierAssignment: false,
      mode: 'mock',
      simulated: false,
      refusal: response.error ?? 'SHIPMENT_REQUEST_REFUSED',
    };
  }
  return {
    ok: true,
    purchaseOrderNumbers: check.poNumbers,
    ...(response.shipmentRequestId ? { shipmentRequestId: response.shipmentRequestId } : {}),
    ...(response.status ? { status: response.status } : {}),
    awaitingCarrierAssignment: response.status !== 'submitted',
    mode: response.simulated ? 'mock' : 'real',
    simulated: !!response.simulated,
  };
}

/**
 * §P12 — READ the routing instructions the channel returns for a shipment request
 * (`GetShipmentDetails`) and map them onto the canonical record shape
 * (`ChannelInstructionOutcome.routingInstructions`).
 *
 * The channel returns a response only AFTER carrier assignment, so `pending` is the
 * truthful outcome until then and NO instruction object is produced — the collect
 * chain keeps reporting `awaiting_channel`, exactly as §P6 designed it to. An ARN
 * is never fabricated here.
 */
export interface ChannelRoutingInstructionsOutcome {
  ok: boolean;
  /** Present only once the channel has genuinely returned routing instructions. */
  instructions?: NonNullable<ChannelInstruction['outcome']>['routingInstructions'];
  /** TRUE while the channel has not assigned a carrier. */
  pending: boolean;
  mode: 'mock' | 'real';
  refusal?: string;
}

export async function readChannelRoutingInstructions(input: {
  reader: ChannelShipmentOperationsReader;
  shipmentRequestId: string;
}): Promise<ChannelRoutingInstructionsOutcome> {
  const response = await input.reader.getShipmentDetails(input.shipmentRequestId);
  if (!response.ok) {
    return {
      ok: false,
      pending: true,
      mode: 'mock',
      refusal: response.error ?? 'SHIPMENT_DETAILS_REFUSED',
    };
  }
  const mode: 'mock' | 'real' = response.simulated ? 'mock' : 'real';
  if (!response.arn) {
    /** No ARN ⇒ the channel has not assigned a carrier. Stated, not invented. */
    return { ok: true, pending: true, mode };
  }
  return {
    ok: true,
    pending: false,
    mode,
    instructions: {
      arn: response.arn,
      ...(response.carrier ? { carrier: response.carrier } : {}),
      ...(response.assignedAt ? { assignedAt: response.assignedAt } : {}),
      ...(response.pickupDate ? { pickupDate: response.pickupDate } : {}),
      mode,
    },
  };
}

export interface ChannelShipmentConfirmationOutcome {
  ok: boolean;
  confirmationId?: string;
  status?: ShipmentConfirmationResult['status'];
  mode: 'mock' | 'real';
  simulated: boolean;
  /** A stated refusal — the channel's own code, or the platform's own guard. */
  refusal?: string;
}

/**
 * §P12 — FILE the shipment confirmation (the ASN) through the channel seam
 * (`AV-015`). Every carton carries the purchase order it belongs to, so a
 * multi-PO consignment confirms in ONE submission (decision 11's documented shape).
 */
export async function fileChannelShipmentConfirmation(input: {
  reader: ChannelShipmentOperationsReader;
  shipmentId: string;
  purchaseOrderNumbers: readonly string[];
  cartons: readonly ShipmentConfirmationCarton[];
  carrier?: string;
}): Promise<ChannelShipmentConfirmationOutcome> {
  const purchaseOrderNumbers = input.purchaseOrderNumbers.map((v) => v.trim()).filter(Boolean);
  if (input.cartons.length === 0) {
    return {
      ok: false,
      mode: 'mock',
      simulated: false,
      refusal: 'SHIPMENT_CONFIRMATION_EMPTY — there are no cartons to declare to the channel.',
    };
  }
  if (purchaseOrderNumbers.length === 0) {
    return {
      ok: false,
      mode: 'mock',
      simulated: false,
      refusal:
        'SHIPMENT_CONFIRMATION_NO_PURCHASE_ORDERS — the confirmation does not name the purchase order(s) it covers.',
    };
  }

  const response = await input.reader.submitShipmentConfirmations({
    shipmentId: input.shipmentId,
    purchaseOrderNumbers,
    cartons: input.cartons.map((c) => ({ ...c })),
    ...(input.carrier ? { carrier: input.carrier } : {}),
  });
  if (!response.ok) {
    return {
      ok: false,
      mode: 'mock',
      simulated: false,
      refusal: response.error ?? 'SHIPMENT_CONFIRMATION_REFUSED',
    };
  }
  return {
    ok: true,
    ...(response.confirmationId ? { confirmationId: response.confirmationId } : {}),
    ...(response.status ? { status: response.status } : {}),
    mode: response.simulated ? 'mock' : 'real',
    simulated: !!response.simulated,
  };
}