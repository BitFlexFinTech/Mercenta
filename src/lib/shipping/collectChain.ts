/**
 * §P6 — THE DOCUMENTED COLLECT CHAIN (Freight Collect / channel-arranged lane).
 *
 * WHAT IS DOCUMENTED (and therefore what this module may assert)
 * -------------------------------------------------------------
 * `docs/AMAZON_VENDOR_TRUTH_VALIDATION_2026-09-20.md` §5.6 and the programme's
 * research table (`docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md` §3):
 *
 *   1. A collect vendor submits a **shipment request** (`SubmitShipments`), and
 *      the purchase order **must already be confirmed** — "Unconfirmed purchase
 *      orders cause the request to fail".
 *   2. `requestedPickUp` must be **"a date at least two business days after the
 *      current date"** (register `AV-014` — the documented replacement for the
 *      deleted, unsupported "10am Pacific" claim).
 *   3. The channel then returns **routing instructions** through
 *      `GetShipmentDetails`, which carries the **ARN** and the pickup/carrier
 *      details, and "only returns a response after carrier assignment, which
 *      occurs either on the same day as the scheduled pickup or one day prior".
 *
 * SO THE CHAIN IS: request → carrier assigned → ARN → pickup.
 *
 * WHAT THIS MODULE REFUSES TO DO
 * ------------------------------
 * It never invents a chain state. Steps 2–4 are facts the CHANNEL produces, so
 * they are read from the instruction's own channel record
 * (`ChannelInstructionOutcome.routingInstructions`, written by the SP-API seam)
 * and are reported `awaiting_channel` until that record genuinely carries them.
 * An ARN that is not on the record cannot be produced by this module — a
 * fabricated ARN would be a fake live-provider outcome.
 */
import type { ChannelInstruction, PurchaseOrder } from '@/types';
import { STAGE_BY_STATUS } from '@/data/brandDossiers';
import { STAGE_ORDER } from '@/types';

/**
 * The channel's pickup lead time — a DOCUMENTED channel rule (not Mercenta's own
 * readiness target, which is `src/lib/shipping/routingReadiness.ts` and is
 * attributed to Mercenta, never to the channel).
 */
export const PICKUP_LEAD_TIME = {
  businessDays: 2,
  owner: 'retail channel' as const,
  label: 'Channel pickup lead time',
  basis:
    'requestedPickUp must be "a date at least two business days after the current date" (register AV-014; the documented replacement for the removed, unsupported "10am Pacific" claim).',
} as const;

/**
 * The earliest date the channel accepts as `requestedPickUp` — the documented
 * two-BUSINESS-day lead time, counted from `from` and skipping weekends.
 */
export function earliestRequestedPickUp(from: Date = new Date()): string {
  const date = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  let remaining = PICKUP_LEAD_TIME.businessDays;
  while (remaining > 0) {
    date.setUTCDate(date.getUTCDate() + 1);
    const day = date.getUTCDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }
  return date.toISOString().slice(0, 10);
}

/** The channel's routing instructions exactly as recorded — or null. Never derived. */
export function routingInstructionsOnRecord(
  instruction?: ChannelInstruction | null
): NonNullable<ChannelInstruction['outcome']>['routingInstructions'] | null {
  return instruction?.outcome?.routingInstructions ?? null;
}

/** The ARN the channel returned, or null. There is no other source for an ARN. */
export function arnOnRecord(instruction?: ChannelInstruction | null): string | null {
  return routingInstructionsOnRecord(instruction)?.arn ?? null;
}

export type CollectChainStepId = 'shipment_request' | 'carrier_assigned' | 'arn' | 'pickup';

/**
 * `done`              — the step is evidenced on the record;
 * `awaiting_channel`  — the step is the CHANNEL's next action (never guessed);
 * `scheduled`         — a date is declared for the step (pickup date);
 * `not_applicable`    — the lane is not channel-arranged.
 */
export type CollectChainStepState = 'done' | 'awaiting_channel' | 'scheduled' | 'not_applicable';

export interface CollectChainStep {
  id: CollectChainStepId;
  label: string;
  state: CollectChainStepState;
  /** What is actually true right now, in one sentence. */
  detail: string;
  /** The documented basis for asserting this step at all. */
  basis: string;
  /** ISO date/time the step was evidenced, when it was. */
  at?: string;
}

export interface CollectChain {
  /** True only for a Freight Collect PO — the only lane the channel arranges. */
  applies: boolean;
  steps: CollectChainStep[];
  /** The ARN from the channel record, or null. Never fabricated. */
  arn: string | null;
  /** The pickup date Mercenta requested (or must request). */
  requestedPickUp: string | null;
  /** The honest summary sentence the UI renders verbatim. */
  notice: string;
}


/**
 * Build the chain for a PO from its own records.
 *
 * `shipmentStatus` is the consignment's canonical status, used only for the final
 * pickup step (a consignment that has left the pre-collection stage has been
 * collected).
 */
export function buildCollectChain(input: {
  po: PurchaseOrder;
  instruction?: ChannelInstruction | null;
  /**
   * The consignment's canonical status. Typed as `string` on purpose: the map's
   * `OperationalLeg.status` is a string, and the lookup below is GUARDED against
   * the canonical status map — an unrecognised value yields no stage rather than
   * an invented one.
   */
  shipmentStatus?: string | null;
  now?: Date;
}): CollectChain {
  const { po, instruction } = input;
  const outcome = instruction?.outcome ?? null;
  const routing = outcome?.routingRequest ?? null;
  const instructions = routingInstructionsOnRecord(instruction);
  const arn = instructions?.arn ?? null;
  const applies = po.freightTerm === 'collect';

  const requestedPickUp =
    routing?.requestedPickUp ?? (applies ? earliestRequestedPickUp(input.now) : null);

  const stage =
    input.shipmentStatus && input.shipmentStatus in STAGE_BY_STATUS
      ? STAGE_BY_STATUS[input.shipmentStatus as keyof typeof STAGE_BY_STATUS]
      : null;
  const collected =
    !!stage && STAGE_ORDER.indexOf(stage) > STAGE_ORDER.indexOf('factory_intake');

  const steps: CollectChainStep[] = [
    {
      id: 'shipment_request',
      label: 'Shipment request submitted',
      state: !applies ? 'not_applicable' : routing?.raised ? 'done' : 'awaiting_channel',
      detail: !applies
        ? 'Mercenta arranges carriage on this PO, so no channel shipment request applies.'
        : routing?.raised
          ? `Mercenta submitted the shipment request (${routing.reference}) after the channel confirmed the PO.`
          : 'Mercenta submits the shipment request once the channel confirms the purchase order — an unconfirmed PO causes the request to fail.',
      basis:
        'A collect vendor submits a shipment request (SubmitShipments); "Unconfirmed purchase orders cause the request to fail".',
      ...(routing?.raised && outcome?.actionedAt ? { at: outcome.actionedAt } : {}),
    },
    {
      id: 'carrier_assigned',
      label: 'Carrier assigned by the channel',
      state: !applies
        ? 'not_applicable'
        : instructions?.assignedAt
          ? 'done'
          : 'awaiting_channel',
      detail: !applies
        ? 'The channel does not assign a carrier on this lane.'
        : instructions?.assignedAt
          ? `The channel assigned ${instructions.carrier ?? 'its carrier'} on ${instructions.assignedAt}.`
          : 'The channel assigns the carrier after the request; assignment occurs on the same day as the scheduled pickup or one day prior.',
      basis:
        'Carrier assignment "occurs either on the same day as the scheduled pickup or one day prior to the pickup date" (GetShipmentDetails).',
      ...(instructions?.assignedAt ? { at: instructions.assignedAt } : {}),
    },
    {
      id: 'arn',
      label: 'Routing instructions returned (ARN)',
      state: !applies ? 'not_applicable' : arn ? 'done' : 'awaiting_channel',
      detail: !applies
        ? 'No channel routing instructions apply to this lane.'
        : arn
          ? `The channel returned routing instructions carrying ARN ${arn}.`
          : 'The channel returns routing instructions — including the ARN — only after carrier assignment, so no ARN exists on this record yet.',
      basis:
        'Routing instructions come from GetShipmentDetails, which returns the ARN and the pickup/carrier details.',
      ...(arn && instructions?.assignedAt ? { at: instructions.assignedAt } : {}),
    },
    {
      id: 'pickup',
      label: 'Collected by the channel',
      state: !applies
        ? 'not_applicable'
        : collected
          ? 'done'
          : requestedPickUp
            ? 'scheduled'
            : 'awaiting_channel',
      detail: !applies
        ? 'This consignment is not collected by the channel.'
        : collected
          ? 'The consignment has left the pre-collection stage, so it has been collected.'
          : requestedPickUp
            ? `Pickup is scheduled no earlier than ${requestedPickUp} — the channel requires at least ${PICKUP_LEAD_TIME.businessDays} business days' notice.`
            : 'No pickup date is on the record.',
      basis: PICKUP_LEAD_TIME.basis,
    },
  ];

  return {
    applies,
    steps,
    arn,
    requestedPickUp,
    notice: applies
      ? `Freight Collect: the retail channel arranges and collects the consignment. ${PICKUP_LEAD_TIME.basis}`
      : 'Freight Prepaid: Mercenta arranges carriage, so the channel collect chain does not apply.',
  };
}
