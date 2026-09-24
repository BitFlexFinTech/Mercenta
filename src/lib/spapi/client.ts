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

    /** §10 step 4 — fetch purchase orders received since a timestamp. */
    async fetchPurchaseOrders(sinceIso: string): Promise<{
      ok: boolean;
      purchaseOrders?: { purchaseOrderId: string; poValue: number }[];
      error?: string;
    }> {
      const creds = requireCredentials();
      const res = await transport(
        `${edgeFunctionBase}/purchase-orders?since=${encodeURIComponent(sinceIso)}`,
        { method: 'GET', headers: { 'X-Secret-Ref': creds.secretRef } }
      );
      const body = (await res.json()) as {
        purchaseOrders?: { purchaseOrderId: string; poValue: number }[];
        error?: string;
      };
      if (!res.ok) return { ok: false, error: body.error ?? `HTTP ${res.status}` };
      return { ok: true, purchaseOrders: body.purchaseOrders ?? [] };
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

