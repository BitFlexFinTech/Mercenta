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
  };
}

