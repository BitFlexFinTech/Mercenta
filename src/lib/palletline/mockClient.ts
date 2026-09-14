/**
 * §Canonical model §13 — MOCK PALLETLINE client (mock-first policy).
 *
 * Implements the EXACT same method signatures and result shapes as the real
 * client in client.ts, so every UK-domestic palletised shipment is fully
 * demoable with ZERO network calls until real Palletline credentials are
 * configured. Identifiers are unmistakably fake (`MOCK-PLL-…` consignments,
 * `SIM-PLL-TRK-…` tracking) and every UI surface consuming this client labels
 * itself as simulated.
 *
 * Simulated behaviours (all deterministic — same call order ⇒ same result):
 *  - createConsignment always books a consignment with a created label;
 *  - getConsignmentStatus ADVANCES it through the real UK-domestic lifecycle:
 *      collection_scheduled → collected → at_hub → out_for_delivery → delivered;
 *  - every 7th consignment raises a DEPOT EXCEPTION at at_hub; the NEXT poll is
 *    the retry and reports the exception cleared (retry semantics);
 *  - every 5th consignment reports a FAILED DELIVERY at out_for_delivery, then
 *    the retry reports it re-booked for the next day;
 *  - simulatePalletlineTransientFailure(c) makes the NEXT poll fail once;
 *  - cancelConsignment succeeds only before collection, exactly like the real
 *    depot cut-off rule;
 *  - unknown consignments fail exactly like the real API would.
 */
import type { PalletlineClient, PalletlineMilestone } from './client';

const MILESTONE_SEQUENCE: PalletlineMilestone[] = [
  'collection_scheduled',
  'collected',
  'at_hub',
  'out_for_delivery',
  'delivered',
];

interface MockConsignmentState {
  consignmentNumber: string;
  reference: string;
  trackingNumber: string;
  pallets: number;
  totalWeightKg: number;
  polls: number;
  willException: boolean;
  exceptionOngoing: boolean;
  willFailDelivery: boolean;
  failedDeliveryReported: boolean;
  failNextPoll: boolean;
  cancelled: boolean;
}

const consignments = new Map<string, MockConsignmentState>();
let consignmentCounter = 0;

export function resetMockPalletlineState(): void {
  consignments.clear();
  consignmentCounter = 0;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Deterministic simulated carrier cost — list rate discounted, pennies. */
export function mockPalletlineCarrierCost(pallets: number, totalWeightKg: number): number {
  const perPallet = 62.5;
  const perKg = 0.042;
  return Math.round((pallets * perPallet + totalWeightKg * perKg) * 100) / 100;
}

export function createMockPalletlineClient(): PalletlineClient {
  return {
    async createConsignment(input) {
      await delay(180);
      consignmentCounter += 1;
      const consignmentNumber = `MOCK-PLL-${String(consignmentCounter).padStart(4, '0')}`;
      const trackingNumber = `SIM-PLL-TRK-${String(consignmentCounter).padStart(8, '0')}`;
      consignments.set(consignmentNumber, {
        consignmentNumber,
        reference: input.reference,
        trackingNumber,
        pallets: input.pallets,
        totalWeightKg: input.totalWeightKg ?? input.pallets * 250,
        polls: 0,
        willException: consignmentCounter % 7 === 0,
        exceptionOngoing: false,
        willFailDelivery: consignmentCounter % 5 === 0,
        failedDeliveryReported: false,
        failNextPoll: false,
        cancelled: false,
      });
      return { ok: true, consignmentNumber, trackingNumber, labelState: 'created' };
    },

    async getConsignmentStatus(consignmentNumber) {
      await delay(140);
      const st = consignments.get(consignmentNumber);
      if (!st) return { ok: false, error: 'Unknown consignment number (mock)' };
      if (st.cancelled) return { ok: false, error: 'Consignment was cancelled (mock)' };
      // Deterministic transient failure: exactly one failed poll, then recovery.
      if (st.failNextPoll) {
        st.failNextPoll = false;
        return {
          ok: false,
          error:
            'Palletline provider unavailable (simulated transient failure — retry to recover)',
        };
      }
      if (st.polls >= MILESTONE_SEQUENCE.length) {
        return { ok: true, milestone: 'delivered', estimatedDelivery: 'Complete' };
      }
      st.polls += 1;
      const milestone = MILESTONE_SEQUENCE[st.polls - 1];

      if (st.willException && milestone === 'at_hub' && !st.exceptionOngoing) {
        st.exceptionOngoing = true;
        // Stay on this milestone so the NEXT poll is the retry (mirrors the
        // failed-delivery handling below — without this the retry branch is
        // unreachable because the counter has already moved past at_hub).
        st.polls -= 1;
        return {
          ok: true,
          milestone: 'at_hub',
          exception: true,
          exceptionReason: 'Depot hold (simulated) — pallet scanned but not trunked',
          delayed: true,
        };
      }
      if (st.exceptionOngoing && milestone === 'at_hub') {
        st.exceptionOngoing = false;
        return {
          ok: true,
          milestone: 'at_hub',
          exception: false,
          exceptionReason: 'Cleared on the next trunk run (retry recovered)',
        };
      }
      if (st.willFailDelivery && milestone === 'out_for_delivery' && !st.failedDeliveryReported) {
        st.failedDeliveryReported = true;
        st.polls -= 1; // stay on this milestone until the retry
        return {
          ok: true,
          milestone: 'out_for_delivery',
          failedDelivery: true,
          exceptionReason: 'Delivery attempted — site closed (simulated); re-booked for tomorrow',
        };
      }
      return { ok: true, milestone };
    },

    async requestCollection(_consignmentNumber, _collectionDate) {
      await delay(110);
      return { ok: true };
    },

    async cancelConsignment(consignmentNumber) {
      await delay(110);
      const st = consignments.get(consignmentNumber);
      if (!st) return { ok: false, error: 'Unknown consignment number (mock)' };
      // The real depot cut-off: a collected pallet can no longer be cancelled.
      if (st.polls >= 2) {
        return {
          ok: false,
          error: 'Consignment has already been collected — cancellation refused (mock)',
        };
      }
      st.cancelled = true;
      return { ok: true };
    },

    async getConsignmentInvoice(consignmentNumber) {
      await delay(120);
      const st = consignments.get(consignmentNumber);
      if (!st) return { ok: false, error: 'Unknown consignment number (mock)' };
      return {
        ok: true,
        carrierCostGbp: mockPalletlineCarrierCost(st.pallets, st.totalWeightKg),
        invoiceNumber: `MOCK-PLL-INV-${consignmentNumber.slice(-4)}`,
      };
    },
  };
}

/** Deterministically make the next poll fail once (then recover). */
export function simulatePalletlineTransientFailure(consignmentNumber: string): boolean {
  const st = consignments.get(consignmentNumber);
  if (!st) return false;
  st.failNextPoll = true;
  return true;
}

/** Look up a mock consignment by its Mercenta shipment reference (UI/demos). */
export function mockConsignmentForReference(reference: string): string | undefined {
  for (const st of consignments.values()) {
    if (st.reference === reference) return st.consignmentNumber;
  }
  return undefined;
}
