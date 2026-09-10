/**
 * §Priority-1/§14 — MOCK DHL Express client (mock-first policy).
 *
 * Implements the EXACT same method signatures and result shapes as the real
 * client in client.ts, so every downstream feature (waybill booking, label
 * state, milestone polling, pickup) runs identically against simulated
 * responses until real DHL Enterprise credentials are configured in the
 * Integrations wizard. All identifiers are unmistakably fake (`MOCK-DHL-…`
 * waybills, `SIM-TRK-…` tracking numbers) and every UI surface consuming this
 * client labels itself "(Mock)".
 *
 * Simulated behaviours (all deterministic — same call order ⇒ same result):
 *  - createShipment always books a new waybill with a created label;
 *  - getShipmentStatus ADVANCES a waybill through the real DHL lifecycle:
 *      label_created → pickup_scheduled → picked_up → in_transit →
 *      customs_clearance → delivered;
 *  - every 6th waybill throws an EXCEPTION at the in_transit milestone
 *    (customs hold). The NEXT poll is the retry and reports the same
 *    milestone recovered (exception cleared), proving retry semantics;
 *  - simulateTransientFailure(waybill) makes the NEXT poll fail once with a
 *    provider_unavailable error; the following poll succeeds — the
 *    deterministic retry path;
 *  - unknown waybills fail exactly like the real tracking API would.
 *
 * NOTE: real DHL reports the CURRENT milestone; the mock advances on each
 * poll to simulate the PASSAGE OF TIME. This is the honest simulation of
 * "a shipment progressing through the network", mirroring how the SP-API
 * mock advances submissions on successive polls.
 */

import type { DhlClient, DhlMilestone } from './client';

const MILESTONE_SEQUENCE: DhlMilestone[] = [
  'pickup_scheduled',
  'picked_up',
  'in_transit',
  'customs_clearance',
  'delivered',
];

export interface MockDhlShipmentState {
  waybill: string;
  reference: string;
  trackingNumber: string;
  /** Number of successful status polls — drives the lifecycle progression. */
  polls: number;
  /** every 6th waybill throws an exception at the in_transit milestone. */
  willException: boolean;
  exceptionOngoing: boolean;
  /** When set, the next poll fails once (deterministic transient failure). */
  failNextPoll: boolean;
}

const shipments = new Map<string, MockDhlShipmentState>();
let waybillCounter = 0;

export function resetMockDhlState(): void {
  shipments.clear();
  waybillCounter = 0;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function createMockDhlClient(): Pick<DhlClient, 'createShipment' | 'getShipmentStatus' | 'requestPickup'> {
  return {
    async createShipment(input: {
      reference: string;
      origin: string;
      destination: string;
      cartons: number;
      service?: string;
    }): Promise<{ ok: boolean; waybill?: string; trackingNumber?: string; labelState?: 'created' | 'pending'; error?: string }> {
      await delay(200);
      waybillCounter += 1;
      const waybill = `MOCK-DHL-${String(waybillCounter).padStart(4, '0')}`;
      const trackingNumber = `SIM-TRK-${String(waybillCounter).padStart(8, '0')}`;
      shipments.set(waybill, {
        waybill,
        reference: input.reference,
        trackingNumber,
        polls: 0,
        willException: waybillCounter % 6 === 0,
        exceptionOngoing: false,
        failNextPoll: false,
      });
      return { ok: true, waybill, trackingNumber, labelState: 'created' };
    },

    async getShipmentStatus(waybill: string) {
      return getMockShipmentStatus(waybill);
    },

    async requestPickup(_waybill: string, _pickupDate: string): Promise<{ ok: boolean; error?: string }> {
      await delay(120);
      return { ok: true };
    },
  };
}

export async function getMockShipmentStatus(waybill: string): Promise<{
  ok: boolean;
  milestone?: DhlMilestone;
  estimatedDelivery?: string;
  exception?: boolean;
  exceptionReason?: string;
  delayed?: boolean;
  error?: string;
}> {
  await delay(150);
  const st = shipments.get(waybill);
  if (!st) return { ok: false, error: 'Unknown waybill number (mock)' };

  // Deterministic transient failure: exactly one failed poll, then recovery.
  if (st.failNextPoll) {
    st.failNextPoll = false;
    return { ok: false, error: 'DHL provider unavailable (simulated transient failure — retry to recover)' };
  }

  // Deliveries stay delivered once reached.
  if (st.polls >= MILESTONE_SEQUENCE.length) {
    return { ok: true, milestone: 'delivered', estimatedDelivery: 'Complete' };
  }

  st.polls += 1;
  const milestone = MILESTONE_SEQUENCE[st.polls - 1];

  // Exception path: every 6th waybill throws a customs hold at in_transit.
  if (st.willException && milestone === 'in_transit' && !st.exceptionOngoing) {
    st.exceptionOngoing = true;
    return {
      ok: true,
      milestone: 'in_transit',
      exception: true,
      exceptionReason: 'Customs hold (simulated) — documentation review required',
      delayed: true,
    };
  }
  // Retry after an exception: same milestone, exception cleared.
  if (st.exceptionOngoing && milestone === 'in_transit') {
    st.exceptionOngoing = false;
    return {
      ok: true,
      milestone: 'in_transit',
      exception: false,
      exceptionReason: 'Cleared after documentation resubmission (retry recovered)',
    };
  }
  const delayed = milestone === 'in_transit' && st.waybill.endsWith('3');
  return { ok: true, milestone, delayed };
}

/** Deterministically make the next poll fail once (then recover). */
export function simulateDhlTransientFailure(waybill: string): boolean {
  const st = shipments.get(waybill);
  if (!st) return false;
  st.failNextPoll = true;
  return true;
}

/** Look up a mock waybill by its Mercenta shipment reference (for UI/demos). */
export function mockWaybillForReference(reference: string): string | undefined {
  for (const st of shipments.values()) {
    if (st.reference === reference) return st.waybill;
  }
  return undefined;
}