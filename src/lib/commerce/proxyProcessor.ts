/**
 * §P4 — THE MERCENTA-SIDE PROXY PROCESSOR.
 *
 * WHAT MERCENTA DOES WITH A BRAND'S INSTRUCTION
 * --------------------------------------------
 * Mercenta holds the retail-channel account; the brand does not. A brand's
 * decision is an INSTRUCTION (see `./channelInstructions`), and MERCENTA — and
 * only Mercenta — then performs the channel action through the integration:
 *
 *   instruction (pending)
 *     → submitAcknowledgement        (SP-API seam, mock-first, Mercenta-side)
 *     → raise the routing / shipment request   (Freight Collect POs)
 *     → file the ASN                  (AUTOMATIC on acceptance — decision 9)
 *     → outcome written back onto the same instruction, attributed + audited
 *
 * The brand performs NONE of those steps: it sees the resulting STATUS, because
 * a brand communicating with the channel would breach the channel's terms.
 *
 * HONESTY RULES
 * -------------
 * - If the channel does NOT accept the acknowledgement, the routing request and
 *   the ASN are NOT filed, and the instruction is `refused` with the channel's
 *   own error. Nothing is claimed that did not happen.
 * - The acknowledgement's `mode` is recorded from the seam (`mock` = NO live
 *   call occurred). It is never inferred from configuration.
 * - The automatic ASN carries clearly-simulated lot/expiry where the category
 *   requires them — never real warehouse or manufacturing data.
 * - Every process is idempotent: the shipment id is derived from the PO, so a
 *   replayed instruction cannot create a second consignment.
 */
import type { AsnDetail } from '@/data/api';
import type { ChannelInstruction, ChannelInstructionOutcome, PurchaseOrder } from '@/types';
import { createShipmentForPO } from '@/data/api';
import { demoBrands, demoProducts, demoPurchaseOrders } from '@/data/demoStore';
import { AMAZON_PARTNERED_CARRIER } from '@/config/shipping';
import { selectCarrierForShipment } from '@/lib/shipping/carrierRouting';
import { createSPApiClientForConnection } from '@/lib/spapi';
import { spApiConnectionCredentials } from '@/integrations/connections';
import {
  getChannelInstruction,
  markChannelInstructionActioned,
  markChannelInstructionRefused,
  pendingChannelInstructions,
  recordChannelRoutingInstructions,
} from './channelInstructions';
import { buildPoDocumentPack } from '@/lib/documents/poDocumentPack';
import { earliestRequestedPickUp } from '@/lib/shipping/collectChain';
import { palletsForCartons } from '@/lib/shipping/asnPallets';
import { emitPoDocumentsReady } from '@/lib/events/eventFeed';
import {
  fileChannelShipmentConfirmation,
  raiseChannelShipmentRequest,
  readChannelRoutingInstructions,
} from '@/lib/shipping/channelShipmentOperations';

/**
 * The attributed Mercenta-side actor for every automatic channel action. Using a
 * named actor (never the brand's id) is what makes the audit trail show that
 * MERCENTA performed the step.
 */
export const PROXY_ACTOR_ID = 'mercenta-proxy-automation';

/** Categories where lot + expiry are mandatory on the ASN (mirrors the seam). */
const LOT_REQUIRED_CATEGORIES = ['Grocery', 'Health & Personal Care'];

/** The labelled SIMULATED lot reference for an automatic ASN. */
export function simulatedLotFor(po: PurchaseOrder): string {
  return `SIM-LOT-${po.poNumber}`;
}

/** The labelled SIMULATED expiry for an automatic ASN (+548 days, as E4 uses). */
export function simulatedExpiryDate(): string {
  return new Date(Date.now() + 548 * 864e5).toISOString().slice(0, 10);
}

/**
 * Build the ASN Mercenta files.
 *
 * A packing CORRECTION states the cartons the brand physically packed; every
 * other instruction is fulfilled from the ACKNOWLEDGED volumes, because the ASN
 * is automatic on acceptance and the brand is never asked for carton detail.
 */
export function asnForInstruction(
  instruction: ChannelInstruction,
  po: PurchaseOrder
): AsnDetail {
  const brand = demoBrands.find((b) => b.id === po.brandId);
  const laneDecision = selectCarrierForShipment({ brandNation: brand?.nation });
  /**
   * Freight Collect ⇒ the CHANNEL arranges the carrier, so the partnered
   * carrier is the honest value (AV-039: no Mercenta carrier account is claimed
   * on a channel-paid lane). Freight Prepaid ⇒ Mercenta's own account, resolved
   * by the canonical routing rule — never chosen by a component.
   */
  const carrier = po.freightTerm === 'collect' ? AMAZON_PARTNERED_CARRIER : laneDecision.carrier;
  const needsLot = !!brand && LOT_REQUIRED_CATEGORIES.includes(brand.category);

  const cartons = instruction.cartons?.length
    ? instruction.cartons
        .filter((c) => c.quantity > 0)
        .map((c) => ({
          sku: c.sku,
          quantity: c.quantity,
          weightKg: Math.max(1, Math.round(c.quantity * 0.4)),
          lengthCm: 40,
          widthCm: 30,
          heightCm: 25,
        }))
    : /**
       * Automatic ASN: the cartons follow the INSTRUCTION's acknowledged volumes
       * (the decision Mercenta is acting on), never a re-read of the PO — so what
       * the brand accepted is exactly what is declared to the channel. An absent
       * per-line `ackStatus` is `accepted` (`instructionLineFor`), which is why a
       * seeded acceptance still ships.
       */
      instruction.lines
        .filter((l) => l.ackStatus !== 'rejected')
        .map((l) => {
          const quantity = l.acknowledgedQty;
          return {
            sku: l.sku,
            quantity,
            weightKg: Math.max(1, Math.round(quantity * 0.4)),
            lengthCm: 40,
            widthCm: 30,
            heightCm: 25,
          };
        });

  /**
   * §BATCH 2n (`AV-016`) — THE PALLET STRUCTURE (the carton→pallet grouping).
   *
   * Derived from the SAME cartons by the ONE owner
   * (`src/lib/shipping/asnPallets.ts`), so the channel confirmation and every
   * document describe the identical loading and the structure can never drift from
   * the cartons it groups. The channel documents the ASN as carrying
   * "carton + pallet structures".
   */
  const pallets = palletsForCartons(po.poNumber, cartons);

  return {
    cartons,
    pallets,
    /** Dispatched within the channel's ship window when one is declared. */
    shipDate: po.shipWindowStart ?? new Date().toISOString().slice(0, 10),
    carrier,
    proNumber: `PRO-${po.poNumber}`,
    bolNumber: `BOL-${po.poNumber}`,
    lotNumber: needsLot ? simulatedLotFor(po) : undefined,
    expiryDate: needsLot ? simulatedExpiryDate() : undefined,
  };
}

/**
 * §P4 — Mercenta processes ONE instruction: the channel acknowledgement, the
 * routing/shipment request and the ASN filing, in that order.
 *
 * Idempotent: an instruction that is not `pending_mercenta_action` is returned
 * untouched, so a replay (a re-render, a repeated call, a validator) cannot
 * re-issue a channel action.
 */
export async function processChannelInstruction(
  id: string
): Promise<ChannelInstruction | undefined> {
  const instruction = getChannelInstruction(id);
  if (!instruction || instruction.state !== 'pending_mercenta_action') return instruction;

  const po = demoPurchaseOrders.find((p) => p.id === instruction.purchaseOrderId);
  if (!po) {
    markChannelInstructionRefused(
      id,
      `NOT_FOUND — purchase order ${instruction.purchaseOrderId} is no longer in the canonical store.`
    );
    return getChannelInstruction(id);
  }

  /* ── 1. The channel acknowledgement (Mercenta → retail channel) ─────────── */
  const { client, mode } = createSPApiClientForConnection({
    credentials: spApiConnectionCredentials(),
    edgeFunctionBase: '/functions/v1/spapi',
  });
  let ack: { ok: boolean; acknowledgementId?: string; status?: 'accepted' | 'partially_accepted' | 'rejected'; error?: string };
  /**
   * §BATCH 2k (`AV-011`) — the INSTANT the acknowledgement was transmitted, recorded
   * so the channel's documented 30-minute appearance window has a real start. Set only
   * once the seam has actually answered (a throw means NOTHING was transmitted, so the
   * record stays `not_submitted` rather than claiming a transmission that did not happen).
   */
  let ackSubmittedAt: string | undefined;
  try {
    ack = await client.submitAcknowledgement({
      purchaseOrderNumber: po.poNumber,
      lines: instruction.lines.map((l) => ({
        sku: l.sku,
        ackStatus: l.ackStatus,
        orderedQty: l.orderedQty,
        acknowledgedQty: l.acknowledgedQty,
        scheduledShipDate: l.scheduledShipDate,
        unitPrice: l.unitPrice,
      })),
    });
    ackSubmittedAt = new Date().toISOString();
  } catch (err) {
    /** No verified connection ⇒ the seam throws. Reported honestly, never hidden. */
    ack = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  const channelAcknowledgement: NonNullable<ChannelInstructionOutcome['channelAcknowledgement']> = {
    ok: ack.ok,
    acknowledgementId: ack.acknowledgementId,
    status: ack.status,
    mode,
    error: ack.error,
    ...(ackSubmittedAt ? { submittedAt: ackSubmittedAt } : {}),
  };

  if (!ack.ok) {
    /**
     * The channel did not accept the acknowledgement, so the routing request and
     * the ASN are NOT filed. The instruction is refused with the channel's own
     * reason and Mercenta can retry it deliberately (an attributed action).
     */
    markChannelInstructionRefused(
      id,
      `CHANNEL_REFUSED — ${ack.error ?? 'the retail channel did not accept the acknowledgement.'}`,
      { channelAcknowledgement }
    );
    return getChannelInstruction(id);
  }

  /* ── 2. The routing / shipment request (Mercenta raises it) ─────────────── */
  /**
   * A PO whose lines were ALL rejected has nothing to ship: the routing request
   * and the ASN are NOT APPLICABLE, not refused. Recording that explicitly keeps
   * "nothing to do" distinguishable from "we failed to do it".
   */
  const nothingToShip = instruction.lines.every((l) => l.ackStatus === 'rejected');
  if (nothingToShip) {
    markChannelInstructionActioned(id, {
      actionedAt: new Date().toISOString(),
      channelAcknowledgement,
      routingRequest: {
        raised: false,
        carrier: asnForInstruction(instruction, po).carrier,
        channelArrangesCarrier: po.freightTerm === 'collect',
        reference: `RR-${po.poNumber}`,
        ...(po.freightTerm === 'collect' ? { requestedPickUp: earliestRequestedPickUp() } : {}),
      },
      asn: { filed: false, note: 'NOT_APPLICABLE — every line was rejected, so there is nothing to ship.' },
    });
    return getChannelInstruction(id);
  }

  const carrier = asnForInstruction(instruction, po).carrier;
  /**
   * §P12 — THE SHIPMENT REQUEST GOES THROUGH THE CHANNEL (`SubmitShipments`).
   *
   * §P10 recorded the deferred consolidation grouping and named the channel's
   * shipment request as its declared activation; §P6 recorded that the routing
   * chain could not advance without a live channel. This is both: the request is
   * SUBMITTED through the SP-API seam (mock-first), carrying the consignment's
   * declared purchase-order set (1..n — decision 11), and the channel's own
   * reference and provenance are recorded on the outcome.
   *
   * A channel refusal STOPS the chain (nothing downstream is filed) — the same
   * rule the acknowledgement already follows.
   */
  const requestedPickUp = po.freightTerm === 'collect' ? earliestRequestedPickUp() : undefined;
  const shipmentRequest = await raiseChannelShipmentRequest({
    reader: client,
    purchaseOrders: [{ poNumber: po.poNumber, brandId: po.brandId }],
    freightTerm: po.freightTerm === 'collect' ? 'collect' : 'prepaid',
    shipToPartyId: po.shipToParty?.partyId ?? '',
    ...(requestedPickUp ? { requestedPickUp } : {}),
    ...(carrier ? { carrier } : {}),
  });

  if (!shipmentRequest.ok) {
    markChannelInstructionRefused(
      id,
      `SHIPMENT_REQUEST_REFUSED — ${
        shipmentRequest.refusal ??
        'the retail channel did not accept the shipment request for this purchase order.'
      }`,
      { channelAcknowledgement }
    );
    return getChannelInstruction(id);
  }

  const routingRequest: NonNullable<ChannelInstructionOutcome['routingRequest']> = {
    raised: true,
    carrier,
    channelArrangesCarrier: po.freightTerm === 'collect',
    /**
     * The platform's own label for the request — replaced by the CHANNEL's
     * reference when the channel returned one, so the recorded reference is the
     * one that can be quoted back to the channel.
     */
    reference: shipmentRequest.shipmentRequestId ?? `RR-${po.poNumber}`,
    /**
     * §P6 — the pickup date Mercenta asks for on a Freight Collect lane, computed
     * from the CHANNEL's own documented rule ("a date at least two business days
     * after the current date" — register `AV-014`) rather than typed in. A
     * prepaid PO has no channel pickup, so the field is absent there and the
     * consignment follows Mercenta's own readiness target instead.
     */
    ...(requestedPickUp ? { requestedPickUp } : {}),
    ...(shipmentRequest.shipmentRequestId
      ? { channelShipmentRequestId: shipmentRequest.shipmentRequestId }
      : {}),
    mode: shipmentRequest.mode,
  };

  /**
   * §P12 — THE ROUTING INSTRUCTIONS (`GetShipmentDetails`).
   *
   * The channel answers only AFTER carrier assignment, so this pass usually
   * reports `pending` and NOTHING is recorded — the collect chain keeps reporting
   * `awaiting_channel`, exactly as §P6 designed it. When the channel does return
   * instructions, they are recorded now; otherwise Mercenta's later attributed
   * read (`refreshChannelRoutingInstructions`) is what advances the chain.
   */
  const routingInstructions = shipmentRequest.shipmentRequestId
    ? await readChannelRoutingInstructions({
        reader: client,
        shipmentRequestId: shipmentRequest.shipmentRequestId,
      })
    : undefined;

  /* ── 3. The ASN (automatic on acceptance — decision 9) ──────────────────── */
  const asn = asnForInstruction(instruction, po);
  const filed = createShipmentForPO(po.id, asn, PROXY_ACTOR_ID);

  /**
   * §P12 — THE ASN GOES TO THE CHANNEL (`submitShipmentConfirmations`, `AV-015`).
   *
   * The channel requires the confirmation BEFORE the goods reach its FC
   * ("Missing or delayed shipment confirmations result in chargebacks"), and each
   * carton names the purchase order it carries — the documented per-carton
   * reference that makes a multi-PO consignment confirmable (decision 11).
   *
   * A channel refusal is NOT reported as a successful filing: the instruction is
   * refused so Mercenta retries deliberately, while the outcome states that the
   * consignment WAS recorded locally and the channel did not accept it.
   */
  const channelConfirmation = filed.ok
    ? await fileChannelShipmentConfirmation({
        reader: client,
        shipmentId: filed.shipmentId ?? `shp-${po.id}`,
        purchaseOrderNumbers: [po.poNumber],
        carrier: asn.carrier,
        cartons: asn.cartons.map((carton, index) => {
          const cartonNumber = index + 1;
          /**
           * §BATCH 2n (`AV-016`) — the pallet this carton is loaded on, read from
           * the ONE owner's structure. Every carton names its own pallet, which IS
           * the carton→pallet grouping the channel documents.
           */
          const palletId = asn.pallets?.find((p) => p.cartons.includes(cartonNumber))?.sscc;
          return {
            cartonId: `${po.poNumber}-C${cartonNumber}`,
            vendorSku: carton.sku,
            quantity: carton.quantity,
            purchaseOrderNumber: po.poNumber,
            ...(palletId ? { palletId } : {}),
            ...(asn.lotNumber ? { lotNumber: asn.lotNumber } : {}),
            ...(asn.expiryDate ? { expiryDate: asn.expiryDate } : {}),
          };
        }),
        /**
         * §BATCH 2n (`AV-016`) — the pallet-level structure itself: the channel's
         * documented "carton + pallet structures". Sent only when a structure
         * exists, so a carton-only confirmation is never padded with a fabricated
         * pallet.
         */
        ...(asn.pallets?.length
          ? {
              pallets: asn.pallets.map((pallet) => ({
                palletId: pallet.sscc,
                cartonIds: pallet.cartons.map((n) => `${po.poNumber}-C${n}`),
              })),
            }
          : {}),
      })
    : undefined;

  const asnReference = `${asn.carrier.slice(0, 2).toUpperCase()}-${po.poNumber}`;

  if (filed.ok && channelConfirmation && !channelConfirmation.ok) {
    markChannelInstructionRefused(
      id,
      `CHANNEL_ASN_REFUSED — ${
        channelConfirmation.refusal ?? 'the retail channel did not accept the shipment confirmation.'
      }`,
      {
        channelAcknowledgement,
        routingRequest,
        asn: {
          filed: true,
          shipmentId: filed.shipmentId,
          reference: asnReference,
          ...(filed.deductionId ? { deductionId: filed.deductionId } : {}),
          note: `CHANNEL_ASN_REFUSED — ${
            channelConfirmation.refusal ?? 'the retail channel did not accept the shipment confirmation.'
          } The consignment is recorded in Mercenta; the channel confirmation must be retried.`,
        },
      }
    );
    return getChannelInstruction(id);
  }

  const asnOutcome: NonNullable<ChannelInstructionOutcome['asn']> = filed.ok
    ? {
        filed: true,
        shipmentId: filed.shipmentId,
        reference: asnReference,
        /** §BATCH 2l (`AV-015`) — WHEN the ASN was filed, for the before-receipt ordering rule. */
        filedAt: new Date().toISOString(),
        ...(filed.deductionId ? { deductionId: filed.deductionId } : {}),
        ...(channelConfirmation?.confirmationId
          ? { channelConfirmationId: channelConfirmation.confirmationId }
          : {}),
        ...(channelConfirmation ? { channelMode: channelConfirmation.mode } : {}),
      }
    : { filed: false, note: filed.error ?? 'the ASN seam refused the filing.' };

  const outcome: ChannelInstructionOutcome = {
    actionedAt: new Date().toISOString(),
    channelAcknowledgement,
    routingRequest,
    asn: asnOutcome,
    /**
     * §P12 — routing instructions are recorded ONLY when the channel genuinely
     * returned them (`readChannelRoutingInstructions` produces none while carrier
     * assignment is pending), so an ARN is present on this record or absent.
     */
    ...(routingInstructions?.ok &&
    !routingInstructions.pending &&
    routingInstructions.instructions
      ? { routingInstructions: routingInstructions.instructions }
      : {}),
  };

  /**
   * A channel-accepted acknowledgement whose ASN could NOT be filed is not a
   * success: the instruction is refused so Mercenta sees it and retries, while
   * the outcome records exactly how far the chain got.
   */
  if (!filed.ok) {
    markChannelInstructionRefused(id, `ASN_REFUSED — ${asnOutcome.note}`, {
      channelAcknowledgement,
      routingRequest,
      asn: asnOutcome,
    });
    return getChannelInstruction(id);
  }

  /**
   * §P6 — THE DOCUMENT PACK, AUTOMATIC ON ACCEPTANCE (programme decisions 6/9).
   *
   * The pack is generated HERE, in the same action that files the ASN, so the
   * brand's "download & print its shipping documents" job is ready the moment the
   * PO is accepted. Nothing is stored: the pack is derived on read from canonical
   * state by `src/lib/documents/poDocumentPack.ts`, and the instruction records
   * only WHEN it was generated and how complete it was — the evidence the event
   * and the audit trail reference, with no second copy to drift.
   */
  const brand = demoBrands.find((b) => b.id === po.brandId);
  const brandName = brand?.profile.businessName ?? po.brandId;
  const pack = buildPoDocumentPack({
    po,
    brandName,
    brandNation: brand?.nation,
    products: demoProducts.filter((p) => p.brandId === po.brandId),
    asn,
    /** The carrier reference the label/waybill documents resolve against. */
    carrier: { carrier: asn.carrier },
    /** The outcome being written — the ASN sheet reports exactly what was filed. */
    instruction: { ...instruction, outcome },
  });

  const outcomeWithDocuments: ChannelInstructionOutcome = {
    ...outcome,
    documentsGeneratedAt: new Date().toISOString(),
    documentCount: pack.applicableCount,
    documentsReady: pack.readyCount,
  };

  markChannelInstructionActioned(id, outcomeWithDocuments);

  /**
   * The notification that the pack exists. It says what is READY and links to the
   * PO on the Logistics Hub — it never claims a document was filed, signed or
   * accepted by anyone.
   */
  emitPoDocumentsReady({
    poId: po.id,
    poNumber: po.poNumber,
    brandId: po.brandId,
    brandName,
    documentCount: pack.applicableCount,
    documentsReady: pack.readyCount,
    destinationLabel: pack.destinationLabel,
  });

  return getChannelInstruction(id);
}

/**
 * §P12 — MERCENTA'S ATTRIBUTED FOLLOW-UP READ of the channel's routing
 * instructions (`GetShipmentDetails`).
 *
 * WHY IT EXISTS: the channel returns routing instructions only AFTER carrier
 * assignment — a later moment than the shipment request that triggered them. So
 * the chain is: request (in `processChannelInstruction`) → assignment → ARN. This
 * function is the "assignment" step, and it is an explicit, attributed action
 * rather than a background loop, because Mercenta's operator asked for it.
 *
 * It RECORDS NOTHING WHEN NOTHING WAS RETURNED: while assignment is pending the
 * instruction is returned untouched, so the collect chain keeps reporting
 * `awaiting_channel` and no ARN is ever invented. A channel error is likewise not
 * turned into a fabricated instruction — the record simply stays as it was.
 */
export async function refreshChannelRoutingInstructions(
  instructionId: string,
  actorId: string
): Promise<ChannelInstruction | undefined> {
  const instruction = getChannelInstruction(instructionId);
  if (!instruction) return undefined;
  const shipmentRequestId = instruction.outcome?.routingRequest?.channelShipmentRequestId;
  /** No channel request ⇒ there is nothing the channel could return. */
  if (!shipmentRequestId) return instruction;

  const { client } = createSPApiClientForConnection({
    credentials: spApiConnectionCredentials(),
    edgeFunctionBase: '/functions/v1/spapi',
  });
  const result = await readChannelRoutingInstructions({ reader: client, shipmentRequestId });
  if (!result.ok || result.pending || !result.instructions) return instruction;
  return recordChannelRoutingInstructions(instructionId, result.instructions, actorId);
}

/** Drain every instruction waiting for Mercenta. Returns the processed set. */
export async function processPendingChannelInstructions(): Promise<ChannelInstruction[]> {
  const queued = pendingChannelInstructions();
  const processed: ChannelInstruction[] = [];
  for (const instruction of queued) {
    const result = await processChannelInstruction(instruction.id);
    if (result) processed.push(result);
  }
  return processed;
}

/**
 * §P4 — the FIRE-AND-FORGET entry for SYNCHRONOUS callers.
 *
 * The domain acknowledgement (`src/data/api.ts → acknowledgePurchaseOrder`) is a
 * synchronous function (the browser specs and the commerce lifecycle call it
 * synchronously), while the channel submission is genuinely asynchronous.
 * Writing the instruction stays synchronous; this wrapper then runs Mercenta's
 * side of the chain and the outcome lands on the record when it resolves.
 */
export function beginProxyProcessing(instructionId: string): void {
  void processChannelInstruction(instructionId).catch(() => {
    /** processChannelInstruction records its own refusals; a throw is unexpected. */
  });
}
