/**
 * §PHASE 3 — MOCK DELTA FULFILLMENT client (mock-first policy).
 *
 * Implements the EXACT same method signatures and result shapes as the real
 * client in `client.ts`, so every 3PL-routed purchase order is fully demoable
 * with ZERO network calls until real Delta Fulfillment credentials are
 * configured. Identifiers are unmistakably fake (`MOCK-DLT-…` receipts and
 * dispatches, `SIM-DLT-TRK-…` tracking) and every UI surface consuming this
 * client labels itself as simulated.
 *
 * Simulated behaviours (all deterministic — same call order ⇒ same result):
 *  - createInboundReceipt always books a receipt with a created note;
 *  - getInboundReceiptStatus ADVANCES it through the real inbound lifecycle:
 *      receipt_created → in_transit_to_3pl → received_at_3pl → putaway;
 *  - every 7th receipt is held for review (on_hold) at received_at_3pl; the NEXT
 *    poll is the retry and reports the hold CLEARED (retry semantics);
 *  - createDispatch always books a dispatch;
 *  - getDispatchStatus ADVANCES it through the real outbound lifecycle:
 *      dispatch_created → allocated → picked → packed → handed_to_carrier →
 *      delivered_to_fc;
 *  - every 5th dispatch raises a warehouse EXCEPTION at handed_to_carrier; the
 *    NEXT poll is the retry and reports the exception cleared;
 *  - simulateDeltaTransientFailure(d) makes the NEXT poll fail once;
 *  - getInventoryLevel returns a deterministic simulated buffer for a SKU;
 *  - unknown receipts/dispatches fail exactly like the real API would.
 */
import type { DeltaFulfillmentClient, DeltaInboundMilestone, DeltaDispatchMilestone } from './client';

const INBOUND_SEQUENCE: DeltaInboundMilestone[] = [
  'receipt_created',
  'in_transit_to_3pl',
  'received_at_3pl',
  'putaway',
];

const DISPATCH_SEQUENCE: DeltaDispatchMilestone[] = [
  'dispatch_created',
  'allocated',
  'picked',
  'packed',
  'handed_to_carrier',
  'delivered_to_fc',
];

interface MockReceiptState {
  receiptNumber: string;
  reference: string;
  units: number;
  polls: number;
  willHold: boolean;
  holdOngoing: boolean;
  failNextPoll: boolean;
}

interface MockDispatchState {
  dispatchNumber: string;
  reference: string;
  trackingNumber: string;
  sku: string;
  units: number;
  polls: number;
  willException: boolean;
  exceptionOngoing: boolean;
  failNextPoll: boolean;
}

const receipts = new Map<string, MockReceiptState>();
const dispatches = new Map<string, MockDispatchState>();
let receiptCounter = 0;
let dispatchCounter = 0;

export function resetMockDeltaState(): void {
  receipts.clear();
  dispatches.clear();
  receiptCounter = 0;
  dispatchCounter = 0;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Deterministic simulated fulfilment cost — storage + pick/pack, pennies. */
export function mockDeltaFulfillmentCost(units: number): number {
  const perUnit = 1.85;
  const storage = 12.5;
  return Math.round((units * perUnit + storage) * 100) / 100;
}

/** Deterministic simulated UK inventory buffer for a SKU. */
export function mockDeltaInventoryLevel(sku: string): {
  onHandUnits: number;
  allocatedUnits: number;
  availableUnits: number;
} {
  let h = 0;
  for (let i = 0; i < sku.length; i += 1) h = (h * 31 + sku.charCodeAt(i)) >>> 0;
  const onHandUnits = 40 + (h % 460);
  const allocatedUnits = h % 25;
  return { onHandUnits, allocatedUnits, availableUnits: onHandUnits - allocatedUnits };
}

export function createMockDeltaFulfillmentClient(): DeltaFulfillmentClient {
  return {
    async createInboundReceipt(input) {
      await delay(170);
      receiptCounter += 1;
      const receiptNumber = `MOCK-DLT-RCPT-${String(receiptCounter).padStart(4, '0')}`;
      receipts.set(receiptNumber, {
        receiptNumber,
        reference: input.reference,
        units: input.units,
        polls: 0,
        willHold: receiptCounter % 7 === 0,
        holdOngoing: false,
        failNextPoll: false,
      });
      return { ok: true, receiptNumber, labelState: 'created' };
    },

    async getInboundReceiptStatus(receiptNumber) {
      await delay(130);
      const st = receipts.get(receiptNumber);
      if (!st) return { ok: false, error: 'Unknown inbound receipt number (mock)' };
      if (st.failNextPoll) {
        st.failNextPoll = false;
        return {
          ok: false,
          error:
            'Delta Fulfillment provider unavailable (simulated transient failure — retry to recover)',
        };
      }
      if (st.polls >= INBOUND_SEQUENCE.length) {
        return { ok: true, milestone: 'putaway', receivedUnits: st.units };
      }
      st.polls += 1;
      const milestone = INBOUND_SEQUENCE[st.polls - 1];

      if (st.willHold && milestone === 'received_at_3pl' && !st.holdOngoing) {
        st.holdOngoing = true;
        st.polls -= 1; // stay on this milestone so the NEXT poll is the retry
        return {
          ok: true,
          milestone: 'received_at_3pl',
          onHold: true,
          exceptionReason: 'Inbound receipt held for review (simulated) — over/short count',
        };
      }
      if (st.holdOngoing && milestone === 'received_at_3pl') {
        st.holdOngoing = false;
        return {
          ok: true,
          milestone: 'received_at_3pl',
          onHold: false,
          exceptionReason: 'Hold cleared on review (retry recovered)',
        };
      }
      return {
        ok: true,
        milestone,
        receivedUnits: milestone === 'putaway' ? st.units : undefined,
      };
    },

    async getInventoryLevel(sku) {
      await delay(120);
      return { ok: true, sku, ...mockDeltaInventoryLevel(sku) };
    },

    async createDispatch(input) {
      await delay(170);
      dispatchCounter += 1;
      const dispatchNumber = `MOCK-DLT-DSP-${String(dispatchCounter).padStart(4, '0')}`;
      const trackingNumber = `SIM-DLT-TRK-${String(dispatchCounter).padStart(8, '0')}`;
      dispatches.set(dispatchNumber, {
        dispatchNumber,
        reference: input.reference,
        trackingNumber,
        sku: input.sku,
        units: input.units,
        polls: 0,
        willException: dispatchCounter % 5 === 0,
        exceptionOngoing: false,
        failNextPoll: false,
      });
      return { ok: true, dispatchNumber, labelState: 'created' };
    },

    async getDispatchStatus(dispatchNumber) {
      await delay(130);
      const st = dispatches.get(dispatchNumber);
      if (!st) return { ok: false, error: 'Unknown dispatch number (mock)' };
      if (st.failNextPoll) {
        st.failNextPoll = false;
        return {
          ok: false,
          error:
            'Delta Fulfillment provider unavailable (simulated transient failure — retry to recover)',
        };
      }
      if (st.polls >= DISPATCH_SEQUENCE.length) {
        return { ok: true, milestone: 'delivered_to_fc', estimatedDelivery: 'Complete' };
      }
      st.polls += 1;
      const milestone = DISPATCH_SEQUENCE[st.polls - 1];

      if (st.willException && milestone === 'handed_to_carrier' && !st.exceptionOngoing) {
        st.exceptionOngoing = true;
        st.polls -= 1; // stay on this milestone so the NEXT poll is the retry
        return {
          ok: true,
          milestone: 'handed_to_carrier',
          exception: true,
          exceptionReason:
            'Warehouse exception (simulated) — hand-off manifest rejected, awaiting correction',
        };
      }
      if (st.exceptionOngoing && milestone === 'handed_to_carrier') {
        st.exceptionOngoing = false;
        return {
          ok: true,
          milestone: 'handed_to_carrier',
          exception: false,
          exceptionReason: 'Exception cleared (retry recovered)',
        };
      }
      return { ok: true, milestone };
    },

    async getFulfillmentInvoice(dispatchNumber) {
      await delay(120);
      const st = dispatches.get(dispatchNumber);
      if (!st) return { ok: false, error: 'Unknown dispatch number (mock)' };
      return {
        ok: true,
        fulfilmentCostGbp: mockDeltaFulfillmentCost(st.units),
        invoiceNumber: `MOCK-DLT-INV-${dispatchNumber.slice(-4)}`,
      };
    },
  };
}

/** Deterministically make the NEXT dispatch poll fail once (then recover). */
export function simulateDeltaTransientFailure(dispatchNumber: string): boolean {
  const st = dispatches.get(dispatchNumber);
  if (!st) return false;
  st.failNextPoll = true;
  return true;
}

/** Look up a mock dispatch by its Mercenta reference (UI/demos). */
export function mockDispatchForReference(reference: string): string | undefined {
  for (const st of dispatches.values()) {
    if (st.reference === reference) return st.dispatchNumber;
  }
  return undefined;
}