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

import type { FetchLike } from './client';

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

/** Module-level so the whole app shares one simulated Amazon world. */
const submissions = new Map<string, MockSubmissionState>();
let submissionCounter = 0;

export function resetMockAmazonState(): void {
  submissions.clear();
  submissionCounter = 0;
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
  };
}
