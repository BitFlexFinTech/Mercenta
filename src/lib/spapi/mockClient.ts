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

import type { AcknowledgementPayload, AcknowledgementResult, FetchLike } from './client';

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

export function resetMockAmazonState(): void {
  submissions.clear();
  submissionCounter = 0;
  acknowledgementCounter = 0;
}

const MOCK_PO_POOL = [
  { purchaseOrderId: 'MOCK-PO-8841', poValue: 12480.0 },
  { purchaseOrderId: 'MOCK-PO-8842', poValue: 8315.5 },
  { purchaseOrderId: 'MOCK-PO-8843', poValue: 21940.75 },
  { purchaseOrderId: 'MOCK-PO-8844', poValue: 5120.0 },
];
let poRotation = 0;

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
      if (st.polls >= 3) return { ok: true, status: 'live' };
      if (st.polls === 2) return { ok: true, status: 'under_amazon_review' };
      return { ok: true, status: 'submitted' };
    },

    async fetchPurchaseOrders(_sinceIso: string): Promise<{
      ok: boolean;
      purchaseOrders?: { purchaseOrderId: string; poValue: number }[];
      error?: string;
    }> {
      await delay(150);
      // Rotate: each poll surfaces the next 2 POs from the pool.
      const start = poRotation % MOCK_PO_POOL.length;
      poRotation += 1;
      const pos = [0, 1].map(
        (i) => MOCK_PO_POOL[(start + i) % MOCK_PO_POOL.length]
      );
      return { ok: true, purchaseOrders: pos };
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
  };
}
