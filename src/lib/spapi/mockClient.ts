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
  FetchLike,
} from './client';
import { simulatedAsinFor } from '@/lib/catalog/asin';
import { DEMO_PRODUCTS } from '@/data/demoData';
import { declaredShipToParty } from '@/config/destinationFc';

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
  };
}
