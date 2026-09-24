/**
 * §10 — SP-API client adapter.
 *
 * CREDENTIAL RULE (§14): credentials come exclusively from the integration
 * connection record created by the Integrations wizard — never from raw
 * env vars. A live token is retrieved through the secret store referenced
 * by the connection; this module refuses to run against a disconnected or
 * sandbox-only connection.
 *
 * Transport is injectable for automated tests; in production it is `fetch`
 * calling the Edge Function proxies (which hold the encrypted refresh token).
 */
import { channelShipmentLabelsAvailability } from '@/config/shipping';

export interface SpApiCredentials {
  /** Secret-store reference holding the LWA refresh token (never the token itself). */
  secretRef: string;
  marketplaceId: string;
  /** False while the §14 connect only completed in sandbox mode. */
  verified: boolean;
}

export interface SubmissionResult {
  ok: boolean;
  submissionId?: string;
  status?: 'submitted' | 'under_amazon_review';
  error?: string;
}

/**
 * §P4 — ONE line of a purchase-order acknowledgement, in the shape the retail
 * channel's `submitAcknowledgement` operation consumes.
 *
 * `orderedQty` is carried because it is the channel's OWN field (the channel
 * knows what it ordered); it lets the seam refuse an over-acknowledgement
 * without the caller restating the rule.
 */
export interface AcknowledgementLine {
  sku: string;
  ackStatus: 'accepted' | 'rejected' | 'backordered';
  orderedQty: number;
  acknowledgedQty: number;
  /** Required when `ackStatus === 'backordered'`. */
  scheduledShipDate?: string;
  unitPrice: number;
}

/** The channel's response to an acknowledgement submission. */
export interface AcknowledgementResult {
  ok: boolean;
  /** The channel's own acknowledgement reference (present when ok). */
  acknowledgementId?: string;
  /** The channel's aggregate decision for the submitted lines. */
  status?: 'accepted' | 'partially_accepted' | 'rejected';
  error?: string;
}

export interface AcknowledgementPayload {
  purchaseOrderNumber: string;
  lines: AcknowledgementLine[];
}

/**
 * §P11 — ONE line of a retail-channel purchase order as the CHANNEL issues it.
 *
 * `vendorSku` is the channel's own order field and is what Mercenta routes by:
 * the PO is addressed to Mercenta, and the brand is identified from the SKUs
 * the channel ordered (`src/lib/commerce/channelPurchaseOrderIngestion.ts`).
 */
export interface ChannelPurchaseOrderLine {
  /** The SKU the channel ordered (the brand's own vendor SKU). */
  vendorSku: string;
  /** The channel identifier, when the product is accepted on the channel. */
  asin?: string;
  quantity: number;
  unitPrice: number;
  commodityCode?: string;
  productName?: string;
}

/**
 * §P11 — a purchase order as the retail channel issues it, addressed to
 * Mercenta. Programme decision 3: this IS the purchase-order record — there is
 * no second, Mercenta-created PO — so the fields here are the fields the
 * canonical `PurchaseOrder` is built from.
 *
 * `simulated` is declared BY THE SEAM (the boundary that actually knows), so the
 * ingestion path never has to guess whether a channel response was live.
 */
export interface ChannelPurchaseOrder {
  /** The channel's PO identity (addressed to Mercenta). */
  purchaseOrderId: string;
  poValue: number;
  orderDate: string;
  /** The FC on the PO (register `S5`) — the destination the channel declared. */
  shipToPartyId: string;
  freightTerm?: 'collect' | 'prepaid';
  /** Present for Freight Collect POs (the channel's own ship window). */
  shipWindowStart?: string;
  shipWindowEnd?: string;
  /** Present for Freight Prepaid POs (the channel's own delivery window). */
  deliveryWindowStart?: string;
  deliveryWindowEnd?: string;
  lines: ChannelPurchaseOrderLine[];
  /** TRUE whenever this response could not have come from a live channel call. */
  simulated: boolean;
}

/** §P11 — the channel PO read's result shape (identical for mock and real). */
export interface ChannelPurchaseOrderReadResult {
  ok: boolean;
  purchaseOrders?: ChannelPurchaseOrder[];
  error?: string;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * §P12 — THE REMAINING DOCUMENTED VENDOR OPERATIONS (`AV-040`).
 *
 * `submitAcknowledgement` was built in §P4 and the PO read in §P11. The seven
 * operations declared here are the REST of the channel's documented vendor
 * surface. They are declared ONCE, in this file, and implemented by BOTH clients
 * with identical signatures and shapes — so the domain owners added in §P12 run
 * identically before and after real LWA credentials are configured.
 *
 * Every result carries the seam's own provenance (`simulated`) and every failure
 * is a STATED code, never free text the caller has to parse: a refusal is
 * information, and a caller must never guess why an operation did not happen.
 * ═══════════════════════════════════════════════════════════════════════════ */

/** §P12 — one line of the channel's OWN receiving state for a PO (`AV-018`). */
export interface ChannelPurchaseOrderStatusLine {
  vendorSku: string;
  asin?: string;
  /** What the channel ordered. */
  orderedQty: number;
  /** What the channel's fulfilment centre has logged as RECEIVED. */
  receivedQty: number;
}

/**
 * §P12 — the channel's own status for one purchase order — the RECEIVING SYNC.
 *
 * Source `S5` / register `AV-018`: `receivingStatus` is *"the Amazon fulfillment
 * center received status and received quantity"*. Both the PO state and the
 * receiving state are the CHANNEL's; nothing here is derived by Mercenta.
 */
export interface ChannelPurchaseOrderStatus {
  purchaseOrderId: string;
  /** The channel's own PO state. */
  status: 'open' | 'acknowledged' | 'received' | 'closed' | 'cancelled';
  /** The channel's own receiving status, mapped onto Mercenta's vocabulary. */
  receivingStatus: 'not_received' | 'partially_received' | 'received';
  lines: ChannelPurchaseOrderStatusLine[];
  /** Present once the channel has logged a receipt. */
  receivedDate?: string;
  /** TRUE whenever this response could not have come from a live channel call. */
  simulated: boolean;
}

export interface ChannelPurchaseOrdersStatusResult {
  ok: boolean;
  statuses?: ChannelPurchaseOrderStatus[];
  /**
   * §P12 — ids the CHANNEL does not know. Reported separately (rather than
   * silently omitted) because a caller must not read "absent" as "not received".
   */
  unknownPurchaseOrderIds?: string[];
  error?: string;
}

/**
 * §P12 — a shipment request (`SubmitShipments`).
 *
 * Programme decision 11: the channel documents multi-purchase-order grouping in
 * this payload (`"purchaseOrders": [ {…}, {…} ]`), so the request carries the
 * consignment's DECLARED SET — one PO today, 1..n by design.
 */
export interface ShipmentRequestPayload {
  /** The declared purchase orders (1..n) the request covers. */
  purchaseOrderNumbers: string[];
  freightTerm: 'collect' | 'prepaid';
  /** The FC the channel declared on the PO. */
  shipToPartyId: string;
  /** Required on a Freight Collect PO (`AV-014`: two business days' notice). */
  requestedPickUp?: string;
  /** The carrier, when Mercenta arranges carriage (Freight Prepaid). */
  carrier?: string;
}

export interface ShipmentRequestResult {
  ok: boolean;
  /** The channel's own reference for the request. */
  shipmentRequestId?: string;
  /**
   * `carrier_assignment_pending` is the channel's documented post-request state:
   * routing instructions exist only after carrier assignment.
   */
  status?: 'submitted' | 'carrier_assignment_pending';
  simulated?: boolean;
  error?: string;
}

/**
 * §P12 — `GetShipmentDetails`: the routing instructions the channel returns.
 *
 * The channel *"only returns a response after carrier assignment, which occurs
 * either on the same day as the scheduled pickup or one day prior"*, so `arn` is
 * ABSENT until the channel genuinely assigns one. This client never invents one.
 */
export interface ShipmentDetailsResult {
  ok: boolean;
  /** The channel's Amazon Reference Number — absent until assignment. */
  arn?: string;
  /** The carrier the channel assigned. */
  carrier?: string;
  assignedAt?: string;
  pickupDate?: string;
  status?: 'carrier_assignment_pending' | 'carrier_assigned';
  simulated?: boolean;
  error?: string;
}

/**
 * §P12 — `GetShipmentLabels`. The channel generates labels in **NA only**, so for
 * a UK/EU marketplace this is a RULE-DRIVEN REFUSAL (`refused: true`), not a
 * provider failure: the operation is simply not offered here, and the platform
 * must never present a channel-generated label for a UK/EU consignment.
 */
export interface ShipmentLabelsResult {
  ok: boolean;
  /** TRUE when the request was refused BY THE CHANNEL'S OWN REGION RULE. */
  refused?: boolean;
  refusedReason?: string;
  labels?: { labelId: string; trackingId: string }[];
  simulated?: boolean;
  error?: string;
}

/**
 * §P12 — one carton of a shipment confirmation (the ASN).
 *
 * The channel references the purchase order PER CARTON
 * (`itemDetails.purchaseOrderNumber`), which is what makes a multi-PO
 * consignment confirmable.
 */
export interface ShipmentConfirmationCarton {
  cartonId: string;
  vendorSku: string;
  quantity: number;
  /** The PO this carton carries (per-carton reference — programme §3). */
  purchaseOrderNumber: string;
  /** Required where the category mandates lot traceability. */
  lotNumber?: string;
  expiryDate?: string;
}

/** §P12 — the ASN payload (`submitShipmentConfirmations`). */
export interface ShipmentConfirmationPayload {
  /** The shipment the cartons belong to. */
  shipmentId: string;
  /** Every purchase order the confirmation covers (1..n). */
  purchaseOrderNumbers: string[];
  cartons: ShipmentConfirmationCarton[];
  carrier?: string;
}

export interface ShipmentConfirmationResult {
  ok: boolean;
  /** The channel's own confirmation reference. */
  confirmationId?: string;
  status?: 'accepted' | 'rejected';
  simulated?: boolean;
  error?: string;
}

/**
 * §P12 — one invoice submitted to the channel's accounts-payable system.
 *
 * The channel's documented invoicing rules (`AV-022`) are enforced by the
 * platform's own invoice registry FIRST (a unique, never-reused number; no
 * zero-value invoice). This payload carries the invoice AS THE REGISTRY ISSUED
 * IT — the client never re-numbers, re-dates or re-prices it.
 */
export interface InvoiceSubmissionPayload {
  purchaseOrderNumber: string;
  invoiceNumber: string;
  invoiceDate: string;
  currency: string;
  total: number;
  lines: { vendorSku: string; quantity: number; unitPrice: number }[];
}

export interface InvoiceSubmissionResult {
  ok: boolean;
  submissionId?: string;
  status?: 'submitted' | 'accepted' | 'rejected';
  simulated?: boolean;
  error?: string;
}

/**
 * §P12 — a vendor inventory update: the PUSH direction of Mercenta's own
 * inventory model (decision 5 · `AV-035`: no Vendor inventory-availability API
 * exists, so there is nothing to READ).
 */
export interface InventoryUpdatePayload {
  sku: string;
  quantity: number;
  unitOfMeasure: 'Eaches' | 'Cases';
}

export interface InventoryUpdateResult {
  ok: boolean;
  submissionId?: string;
  simulated?: boolean;
  error?: string;
}

export type FetchLike = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: unknown }
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

/** Default transport: POSTs through the server-side Edge Function proxy. */
const defaultFetch: FetchLike = async (url, init) => {
  const res = await fetch(url, {
    method: init?.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  return { ok: res.ok, status: res.status, json: () => res.json() };
};

export function createSpApiClient(
  getCredentials: () => SpApiCredentials | null,
  edgeFunctionBase: string,
  transport: FetchLike = defaultFetch
) {
  function requireCredentials(): SpApiCredentials {
    const creds = getCredentials();
    if (!creds) {
      throw new Error('SP-API is not connected. Ask your admin to enable it in Integration Settings.');
    }
    if (!creds.verified) {
      throw new Error(
        'SP-API connection is sandbox-only — complete a live OAuth connect to enable submissions.'
      );
    }
    return creds;
  }

  return {
    /** §10 step 2/3 — submit a transformed payload, returns tracking id. */
    async submitCatalogItem(payload: unknown): Promise<SubmissionResult> {
      const creds = requireCredentials();
      const res = await transport(`${edgeFunctionBase}/catalog-items`, {
        method: 'POST',
        headers: { 'X-Secret-Ref': creds.secretRef },
        body: payload,
      });
      const body = (await res.json()) as {
        submissionId?: string;
        status?: SubmissionResult['status'];
        error?: string;
      };
      if (!res.ok) return { ok: false, error: body.error ?? `HTTP ${res.status}` };
      return { ok: true, submissionId: body.submissionId, status: body.status ?? 'submitted' };
    },

    /** §10 step 3 — poll submission status. */
    async getSubmissionStatus(submissionId: string): Promise<{
      ok: boolean;
      status?: 'submitted' | 'under_amazon_review' | 'live' | 'rejected';
      rejectionReason?: string;
      /**
       * §P8 — the identifier the channel returns once it ACCEPTS the product
       * (decision 10). Read straight from the channel's own response; never
       * derived, defaulted or invented by the platform.
       */
      asin?: string;
      error?: string;
    }> {
      const creds = requireCredentials();
      const res = await transport(
        `${edgeFunctionBase}/catalog-items/${encodeURIComponent(submissionId)}`,
        { method: 'GET', headers: { 'X-Secret-Ref': creds.secretRef } }
      );
      const body = (await res.json()) as {
        status?: 'submitted' | 'under_amazon_review' | 'live' | 'rejected';
        rejectionReason?: string;
        asin?: string;
        error?: string;
      };
      if (!res.ok) return { ok: false, error: body.error ?? `HTTP ${res.status}` };
      return {
        ok: true,
        status: body.status,
        rejectionReason: body.rejectionReason,
        asin: body.asin,
      };
    },

    /**
     * §10 step 4 / §P11 — fetch purchase orders received from the channel since
     * a timestamp, WITH the fields the ingestion path routes by (the lines).
     *
     * §P11 — REPOINTED (old contract recorded): this read previously returned
     * only `{ purchaseOrderId, poValue }`, which carried nothing a PO could be
     * ROUTED by (decision 3: the PO is addressed to Mercenta and the brand is
     * identified from it). The channel's own PO payload is now returned whole.
     * A row the channel returns without lines is returned as-is — the ingestion
     * owner refuses it, and this client never invents a line.
     */
    async fetchPurchaseOrders(sinceIso: string): Promise<ChannelPurchaseOrderReadResult> {
      const creds = requireCredentials();
      const res = await transport(
        `${edgeFunctionBase}/purchase-orders?since=${encodeURIComponent(sinceIso)}`,
        { method: 'GET', headers: { 'X-Secret-Ref': creds.secretRef } }
      );
      const body = (await res.json()) as {
        purchaseOrders?: ChannelPurchaseOrder[];
        error?: string;
      };
      if (!res.ok) return { ok: false, error: body.error ?? `HTTP ${res.status}` };
      return {
        ok: true,
        /**
         * A live channel response is never `simulated`; the flag is stated
         * explicitly rather than left to a caller to infer from the mode.
         */
        purchaseOrders: (body.purchaseOrders ?? []).map((p) => ({ ...p, simulated: false })),
      };
    },

    /** §10 step 5 — confirm shipment once goods are dispatched. */
    async confirmShipment(purchaseOrderId: string): Promise<{ ok: boolean; error?: string }> {
      const creds = requireCredentials();
      const res = await transport(
        `${edgeFunctionBase}/shipments/confirm`,
        { method: 'POST', headers: { 'X-Secret-Ref': creds.secretRef }, body: { purchaseOrderId } }
      );
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        return { ok: false, error: body.error ?? `HTTP ${res.status}` };
      }
      return { ok: true };
    },

    /**
     * §P4 — `submitAcknowledgement` (AV-040): transmit the brand's per-line
     * accept / reject / backorder decision to the retail channel.
     *
     * MERCENTA-SIDE ONLY. A brand never calls this: its decision is an
     * INSTRUCTION to Mercenta (`src/lib/commerce/channelInstructions.ts`) and
     * `src/lib/commerce/proxyProcessor.ts` — acting as Mercenta — is what
     * performs the channel action. Calling it with no verified connection
     * throws, exactly like every other method here.
     */
    async submitAcknowledgement(payload: AcknowledgementPayload): Promise<AcknowledgementResult> {
      const creds = requireCredentials();
      const res = await transport(`${edgeFunctionBase}/acknowledgements`, {
        method: 'POST',
        headers: { 'X-Secret-Ref': creds.secretRef },
        body: payload,
      });
      const body = (await res.json()) as AcknowledgementResult;
      if (!res.ok) return { ok: false, error: body.error ?? `HTTP ${res.status}` };
      return { ok: true, acknowledgementId: body.acknowledgementId, status: body.status ?? 'accepted' };
    },

    /**
     * §P12 — `getPurchaseOrdersStatus` (`AV-040`): THE RECEIVING SYNC.
     *
     * Reads the channel's OWN PO state and receiving state (source `S5` /
     * register `AV-018` — *"the Amazon fulfillment center received status and
     * received quantity"*) for the ids Mercenta asks about. Ids the channel does
     * not know are returned SEPARATELY, never silently dropped: "absent" must
     * never be readable as "not received".
     */
    async getPurchaseOrdersStatus(
      purchaseOrderIds: string[]
    ): Promise<ChannelPurchaseOrdersStatusResult> {
      const creds = requireCredentials();
      const ids = purchaseOrderIds.map((v) => v.trim()).filter(Boolean);
      if (ids.length === 0) {
        return {
          ok: false,
          error: 'PURCHASE_ORDER_IDS_EMPTY — a receiving sync must name at least one purchase order.',
        };
      }
      const res = await transport(
        `${edgeFunctionBase}/purchase-orders/status?ids=${encodeURIComponent(ids.join(','))}`,
        { method: 'GET', headers: { 'X-Secret-Ref': creds.secretRef } }
      );
      const body = (await res.json()) as {
        statuses?: ChannelPurchaseOrderStatus[];
        unknownPurchaseOrderIds?: string[];
        error?: string;
      };
      if (!res.ok) return { ok: false, error: body.error ?? `HTTP ${res.status}` };
      return {
        ok: true,
        /** A live channel response is never `simulated` — stated, not inferred. */
        statuses: (body.statuses ?? []).map((s) => ({ ...s, simulated: false })),
        unknownPurchaseOrderIds: body.unknownPurchaseOrderIds ?? [],
      };
    },

    /**
     * §P12 — `submitShipmentRequest` (`SubmitShipments`).
     *
     * Carries the consignment's DECLARED purchase-order set (1..n — programme
     * decision 11). The channel answers with its own reference and the
     * `carrier_assignment_pending` state; routing instructions follow ONLY after
     * carrier assignment (`getShipmentDetails`).
     */
    async submitShipmentRequest(payload: ShipmentRequestPayload): Promise<ShipmentRequestResult> {
      const creds = requireCredentials();
      if ((payload.purchaseOrderNumbers ?? []).filter(Boolean).length === 0) {
        return {
          ok: false,
          error: 'SHIPMENT_REQUEST_EMPTY — a shipment request must name the purchase order(s) it covers.',
        };
      }
      const res = await transport(`${edgeFunctionBase}/shipments/request`, {
        method: 'POST',
        headers: { 'X-Secret-Ref': creds.secretRef },
        body: payload,
      });
      const body = (await res.json()) as {
        shipmentRequestId?: string;
        status?: ShipmentRequestResult['status'];
        error?: string;
      };
      if (!res.ok) return { ok: false, error: body.error ?? `HTTP ${res.status}` };
      return {
        ok: true,
        shipmentRequestId: body.shipmentRequestId,
        status: body.status ?? 'carrier_assignment_pending',
        simulated: false,
      };
    },

    /**
     * §P12 — `getShipmentDetails`: the channel's routing instructions.
     *
     * A response exists only AFTER carrier assignment; `arn` therefore stays
     * ABSENT until the channel returns one. This client never fabricates an ARN —
     * a fabricated ARN would be a fake live-provider outcome.
     */
    async getShipmentDetails(shipmentRequestId: string): Promise<ShipmentDetailsResult> {
      const creds = requireCredentials();
      const res = await transport(
        `${edgeFunctionBase}/shipments/${encodeURIComponent(shipmentRequestId)}/details`,
        { method: 'GET', headers: { 'X-Secret-Ref': creds.secretRef } }
      );
      const body = (await res.json()) as Omit<ShipmentDetailsResult, 'ok' | 'simulated'> & {
        error?: string;
      };
      if (!res.ok) return { ok: false, error: body.error ?? `HTTP ${res.status}` };
      return {
        ok: true,
        /** Only what the channel returned — no field is defaulted here. */
        ...(body.arn ? { arn: body.arn } : {}),
        ...(body.carrier ? { carrier: body.carrier } : {}),
        ...(body.assignedAt ? { assignedAt: body.assignedAt } : {}),
        ...(body.pickupDate ? { pickupDate: body.pickupDate } : {}),
        status: body.arn ? 'carrier_assigned' : 'carrier_assignment_pending',
        simulated: false,
      };
    },

    /**
     * §P12 — `getShipmentLabels`. REFUSED BY RULE for a UK/EU marketplace.
     *
     * The channel generates shipment labels in NA only, so the availability rule
     * is read from its ONE canonical owner (`src/config/shipping.ts`) and the
     * refusal is returned BEFORE any credential or network work. A marketplace
     * the platform does not know fails closed the same way.
     */
    async getShipmentLabels(shipmentId: string): Promise<ShipmentLabelsResult> {
      const availability = channelShipmentLabelsAvailability(getCredentials()?.marketplaceId);
      if (!availability.available) {
        return { ok: false, refused: true, refusedReason: availability.reason };
      }
      const creds = requireCredentials();
      const res = await transport(
        `${edgeFunctionBase}/shipments/${encodeURIComponent(shipmentId)}/labels`,
        { method: 'GET', headers: { 'X-Secret-Ref': creds.secretRef } }
      );
      const body = (await res.json()) as {
        labels?: { labelId: string; trackingId: string }[];
        error?: string;
      };
      if (!res.ok) return { ok: false, error: body.error ?? `HTTP ${res.status}` };
      return { ok: true, labels: body.labels ?? [], simulated: false };
    },

    /**
     * §P12 — `submitShipmentConfirmations`: THE ASN (`AV-015`).
     *
     * The confirmation must reach the channel BEFORE the goods reach the FC
     * ("Missing or delayed shipment confirmations result in chargebacks"), and
     * each carton names the PO it carries, so a multi-PO consignment confirms in
     * ONE submission.
     */
    async submitShipmentConfirmations(
      payload: ShipmentConfirmationPayload
    ): Promise<ShipmentConfirmationResult> {
      const creds = requireCredentials();
      const cartons = payload.cartons ?? [];
      if (cartons.length === 0) {
        return {
          ok: false,
          error: 'SHIPMENT_CONFIRMATION_EMPTY — an ASN with no cartons declares nothing.',
        };
      }
      const res = await transport(`${edgeFunctionBase}/shipments/confirmations`, {
        method: 'POST',
        headers: { 'X-Secret-Ref': creds.secretRef },
        body: payload,
      });
      const body = (await res.json()) as {
        confirmationId?: string;
        status?: ShipmentConfirmationResult['status'];
        error?: string;
      };
      if (!res.ok) return { ok: false, error: body.error ?? `HTTP ${res.status}` };
      return {
        ok: true,
        confirmationId: body.confirmationId,
        status: body.status ?? 'accepted',
        simulated: false,
      };
    },

    /**
     * §P12 — `submitInvoices`: the invoice is handed to the channel's
     * accounts-payable system AS THE REGISTRY ISSUED IT (`AV-022`).
     *
     * API invoicing additionally requires parallel testing with the channel's AP
     * team before payments process (register `S11`) — a business activation step
     * recorded in `PRODUCTION_READINESS.md`, not a code change.
     */
    async submitInvoices(payload: InvoiceSubmissionPayload): Promise<InvoiceSubmissionResult> {
      const creds = requireCredentials();
      const res = await transport(`${edgeFunctionBase}/invoices`, {
        method: 'POST',
        headers: { 'X-Secret-Ref': creds.secretRef },
        body: payload,
      });
      const body = (await res.json()) as {
        submissionId?: string;
        status?: InvoiceSubmissionResult['status'];
        error?: string;
      };
      if (!res.ok) return { ok: false, error: body.error ?? `HTTP ${res.status}` };
      return {
        ok: true,
        submissionId: body.submissionId,
        status: body.status ?? 'submitted',
        simulated: false,
      };
    },

    /**
     * §P12 — `submitInventoryUpdate`: the PUSH direction of Mercenta's own
     * inventory model (decision 5). `AV-035` records that no Vendor
     * inventory-availability API exists, so there is nothing to READ — this
     * operation only ever pushes.
     */
    async submitInventoryUpdate(payload: InventoryUpdatePayload): Promise<InventoryUpdateResult> {
      const creds = requireCredentials();
      const res = await transport(`${edgeFunctionBase}/inventory`, {
        method: 'POST',
        headers: { 'X-Secret-Ref': creds.secretRef },
        body: payload,
      });
      const body = (await res.json()) as { submissionId?: string; error?: string };
      if (!res.ok) return { ok: false, error: body.error ?? `HTTP ${res.status}` };
      return { ok: true, submissionId: body.submissionId, simulated: false };
    },
  };
}

