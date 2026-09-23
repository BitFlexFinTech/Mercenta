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
import { demoBrands, demoPurchaseOrders } from '@/data/demoStore';
import { AMAZON_PARTNERED_CARRIER } from '@/config/shipping';
import { selectCarrierForShipment } from '@/lib/shipping/carrierRouting';
import { createSPApiClientForConnection } from '@/lib/spapi';
import { spApiConnectionCredentials } from '@/integrations/connections';
import {
  getChannelInstruction,
  markChannelInstructionActioned,
  markChannelInstructionRefused,
  pendingChannelInstructions,
} from './channelInstructions';

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

  return {
    cartons,
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
      },
      asn: { filed: false, note: 'NOT_APPLICABLE — every line was rejected, so there is nothing to ship.' },
    });
    return getChannelInstruction(id);
  }

  const routingRequest: NonNullable<ChannelInstructionOutcome['routingRequest']> = {
    raised: true,
    carrier: asnForInstruction(instruction, po).carrier,
    channelArrangesCarrier: po.freightTerm === 'collect',
    reference: `RR-${po.poNumber}`,
  };

  /* ── 3. The ASN (automatic on acceptance — decision 9) ──────────────────── */
  const asn = asnForInstruction(instruction, po);
  const filed = createShipmentForPO(po.id, asn, PROXY_ACTOR_ID);
  const asnOutcome: NonNullable<ChannelInstructionOutcome['asn']> = filed.ok
    ? {
        filed: true,
        shipmentId: filed.shipmentId,
        reference: `${asn.carrier.slice(0, 2).toUpperCase()}-${po.poNumber}`,
        ...(filed.deductionId ? { deductionId: filed.deductionId } : {}),
      }
    : { filed: false, note: filed.error ?? 'the ASN seam refused the filing.' };

  const outcome: ChannelInstructionOutcome = {
    actionedAt: new Date().toISOString(),
    channelAcknowledgement,
    routingRequest,
    asn: asnOutcome,
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

  markChannelInstructionActioned(id, outcome);
  return getChannelInstruction(id);
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
