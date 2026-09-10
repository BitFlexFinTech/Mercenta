/**
 * §Priority-1 — DHL Express adapter (live client).
 *
 * Same credential discipline as the SP-API / Stripe clients (§14):
 * credentials come exclusively from an integration connection record —
 * never raw env vars. A live token is retrieved through the secret store
 * referenced by the connection; this module refuses to run against a
 * disconnected or sandbox-only connection.
 *
 * Transport is injectable for automated tests; in production it POSTs through
 * the server-side Edge Function proxies (which hold the encrypted credentials
 * and call the real DHL Express Shipment Tracking API). The wire format here
 * follows the DHL shipment/tracking model (Shipment Tracking REST API) and is
 * deliberately centralised so only this file changes.
 *
 * Live-adapter rule: when a verified non-sandbox connection exists in the
 * Integrations Hub, the factory in index.ts returns THIS client; every
 * domain workflow receives the same method signatures from either client.
 */

export interface DhlCredentials {
  /** Secret-store reference holding the real DHL API key (never the key). */
  secretRef: string;
  /** DHL billing account number (non-secret operational metadata). */
  accountNumber?: string;
  /** False while the Integrations connect only completed in sandbox mode. */
  verified: boolean;
}

export type DhlMilestone =
  | 'label_created'
  | 'pickup_scheduled'
  | 'picked_up'
  | 'in_transit'
  | 'customs_clearance'
  | 'delivered';

export interface DhlCreateShipmentInput {
  /** Internal Mercenta reference (e.g. the shipment id / PO number). */
  reference: string;
  origin: string;
  destination: string;
  /** Number of cartons booked on the waybill. */
  cartons: number;
  service?: string;
}

export interface DhlCreateShipmentResult {
  ok: boolean;
  waybill?: string;
  trackingNumber?: string;
  /** Label state — 'created' means the label PDF is available. */
  labelState?: 'created' | 'pending';
  error?: string;
}

export interface DhlShipmentStatusResult {
  ok: boolean;
  /** Provider-reported milestone for the waybill (deterministic in mock). */
  milestone?: DhlMilestone;
  /** Pickup / dispatch / clearance / delivery timestamps when known. */
  estimatedDelivery?: string;
  /** True when the provider flags an exception requiring attention. */
  exception?: boolean;
  exceptionReason?: string;
  /** True when the provider flags a delay (still moving, later ETA). */
  delayed?: boolean;
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

export function createDhlClient(
  getCredentials: () => DhlCredentials | null,
  edgeFunctionBase: string,
  transport: FetchLike = defaultFetch
) {
  function requireCredentials(): DhlCredentials {
    const creds = getCredentials();
    if (!creds) {
      throw new Error('DHL is not connected. Ask your admin to enable it in Integration Settings.');
    }
    if (!creds.verified) {
      throw new Error(
        'DHL connection is sandbox-only — complete a live connect to create real waybills.'
      );
    }
    return creds;
  }

  return {
    /** Book a shipment on a new waybill and generate the label. */
    async createShipment(input: DhlCreateShipmentInput): Promise<DhlCreateShipmentResult> {
      const creds = requireCredentials();
      const res = await transport(`${edgeFunctionBase}/shipments`, {
        method: 'POST',
        headers: { 'X-Secret-Ref': creds.secretRef },
        body: { ...input, accountNumber: creds.accountNumber },
      });
      const body = (await res.json()) as {
        waybill?: string;
        trackingNumber?: string;
        labelState?: 'created' | 'pending';
        error?: string;
      };
      if (!res.ok) return { ok: false, error: body.error ?? `HTTP ${res.status}` };
      return {
        ok: true,
        waybill: body.waybill,
        trackingNumber: body.trackingNumber,
        labelState: body.labelState ?? 'created',
      };
    },

    /** Read the current tracked milestone for a waybill. */
    async getShipmentStatus(waybill: string): Promise<DhlShipmentStatusResult> {
      const creds = requireCredentials();
      const res = await transport(
        `${edgeFunctionBase}/shipments/${encodeURIComponent(waybill)}`,
        { method: 'GET', headers: { 'X-Secret-Ref': creds.secretRef } }
      );
      const body = (await res.json()) as {
        milestone?: DhlMilestone;
        estimatedDelivery?: string;
        exception?: boolean;
        exceptionReason?: string;
        delayed?: boolean;
        error?: string;
      };
      if (!res.ok) return { ok: false, error: body.error ?? `HTTP ${res.status}` };
      return {
        ok: true,
        milestone: body.milestone,
        estimatedDelivery: body.estimatedDelivery,
        exception: body.exception,
        exceptionReason: body.exceptionReason,
        delayed: body.delayed,
      };
    },

    /** Schedule (or reschedule) a pickup window. */
    async requestPickup(waybill: string, pickupDate: string): Promise<{ ok: boolean; error?: string }> {
      const creds = requireCredentials();
      const res = await transport(`${edgeFunctionBase}/shipments/pickup`, {
        method: 'POST',
        headers: { 'X-Secret-Ref': creds.secretRef },
        body: { waybill, pickupDate },
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        return { ok: false, error: body.error ?? `HTTP ${res.status}` };
      }
      return { ok: true };
    },
  };
}

/** Type-identity helper so call sites can name the client shape. */
export type DhlClient = ReturnType<typeof createDhlClient>;