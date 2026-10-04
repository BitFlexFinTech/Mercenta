/**
 * §PHASE 3 — DELTA FULFILLMENT adapter (live client).
 *
 * Delta Fulfillment is Mercenta's **3PL partner** (`src/config/fulfillment.ts`).
 * A 3PL is a FULFILMENT partner, NOT a carrier: DHL and Palletline move goods,
 * Delta Fulfillment would HOLD and handle them (UK warehousing, an inventory
 * buffer, consolidation, pick/pack and the final-mile hand-off). That is why this
 * adapter lives under `src/lib/fulfillment/` and not with the carriers, and why
 * adding it does NOT touch the `CarrierId` list or the DHL+Palletline lane rule.
 *
 * Credentials come exclusively from an integration connection record — never raw
 * env vars — and a live token is retrieved through the secret store referenced by
 * the connection. This module refuses to run against a disconnected or
 * sandbox-only connection. Transport is injectable for automated tests; in
 * production it POSTs through the server-side Edge Function proxy, which holds the
 * encrypted credentials and calls Delta Fulfillment's API. The wire format is
 * deliberately centralised here so only this file changes when the real contract
 * is confirmed.
 */
import type { FetchLike } from '@/lib/spapi/client';

export interface DeltaFulfillmentCredentials {
  /** Secret-store reference holding the real Delta Fulfillment credential. */
  secretRef: string;
  /** Delta Fulfillment account/site id (non-secret operational metadata). */
  accountId?: string;
  /** False while the Integrations connect only completed in sandbox mode. */
  verified: boolean;
}

/** Inbound lifecycle: goods arriving INTO Delta Fulfillment's UK warehouse. */
export type DeltaInboundMilestone =
  | 'receipt_created'
  | 'in_transit_to_3pl'
  | 'received_at_3pl'
  | 'putaway'
  | 'on_hold'
  | 'rejected';

export interface DeltaInboundReceiptInput {
  /** Internal Mercenta reference (the shipment id / PO number). */
  reference: string;
  /** Delta Fulfillment warehouse the goods are consigned to, when declared. */
  warehouse?: string;
  /** Number of units (or the unit count on the pallet(s)). */
  units: number;
  totalWeightKg?: number;
  expectedDate?: string;
}

export interface DeltaInboundReceiptResult {
  ok: boolean;
  receiptNumber?: string;
  /** 'created' means the inbound receipt note is available. */
  labelState?: 'created' | 'pending';
  error?: string;
}

export interface DeltaInboundReceiptStatusResult {
  ok: boolean;
  milestone?: DeltaInboundMilestone;
  /** True while the warehouse holds the receipt for review (quarantine / over/short). */
  onHold?: boolean;
  exceptionReason?: string;
  /** Units actually received, once counted. */
  receivedUnits?: number;
  error?: string;
}

/** The UK inventory buffer held for a SKU (never a channel figure). */
export interface DeltaInventoryLevelResult {
  ok: boolean;
  sku?: string;
  onHandUnits?: number;
  allocatedUnits?: number;
  availableUnits?: number;
  error?: string;
}

/** Outbound lifecycle: goods leaving the 3PL for the channel's fulfilment centre. */
export type DeltaDispatchMilestone =
  | 'dispatch_created'
  | 'allocated'
  | 'picked'
  | 'packed'
  | 'handed_to_carrier'
  | 'delivered_to_fc'
  | 'exception';

export interface DeltaDispatchInput {
  /** Internal Mercenta reference (the PO number the dispatch fulfils). */
  reference: string;
  sku: string;
  units: number;
  /** The destination fulfilment centre the goods are dispatched to. */
  destinationFc?: string;
}

export interface DeltaDispatchResult {
  ok: boolean;
  dispatchNumber?: string;
  /** 'created' means the pick/pack note + hand-off manifest are available. */
  labelState?: 'created' | 'pending';
  error?: string;
}

export interface DeltaDispatchStatusResult {
  ok: boolean;
  milestone?: DeltaDispatchMilestone;
  estimatedDelivery?: string;
  /** True when the warehouse flags an exception requiring Mercenta attention. */
  exception?: boolean;
  exceptionReason?: string;
  error?: string;
}

export interface DeltaFulfillmentInvoiceResult {
  ok: boolean;
  /** What Delta Fulfillment charged MERCENTA — never what the brand was charged. */
  fulfilmentCostGbp?: number;
  invoiceNumber?: string;
  error?: string;
}

const defaultFetch: FetchLike = async (url, init) => {
  const res = await fetch(url, {
    method: init?.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  return { ok: res.ok, status: res.status, json: () => res.json() };
};

export function createDeltaFulfillmentClient(
  getCredentials: () => DeltaFulfillmentCredentials | null,
  edgeFunctionBase: string,
  transport: FetchLike = defaultFetch
) {
  function requireCredentials(): DeltaFulfillmentCredentials {
    const creds = getCredentials();
    if (!creds) {
      throw new Error(
        'Delta Fulfillment is not connected. Ask your admin to enable it in Integration Settings.'
      );
    }
    if (!creds.verified) {
      throw new Error(
        'Delta Fulfillment connection is sandbox-only — complete a live connect to book real receipts and dispatches.'
      );
    }
    return creds;
  }


  return {
    /** Book an inbound receipt and generate the receipt note. */
    async createInboundReceipt(
      input: DeltaInboundReceiptInput
    ): Promise<DeltaInboundReceiptResult> {
      const creds = requireCredentials();
      const res = await transport(`${edgeFunctionBase}/delta-fulfillment/inbound-receipts`, {
        method: 'POST',
        headers: { 'X-Secret-Ref': creds.secretRef },
        body: { ...input, accountId: creds.accountId },
      });
      const body = (await res.json()) as {
        receiptNumber?: string;
        labelState?: 'created' | 'pending';
        error?: string;
      };
      if (!res.ok) return { ok: false, error: body.error ?? `HTTP ${res.status}` };
      return {
        ok: true,
        receiptNumber: body.receiptNumber,
        labelState: body.labelState ?? 'created',
      };
    },

    /** Read the current inbound milestone for a receipt. */
    async getInboundReceiptStatus(
      receiptNumber: string
    ): Promise<DeltaInboundReceiptStatusResult> {
      const creds = requireCredentials();
      const res = await transport(
        `${edgeFunctionBase}/delta-fulfillment/inbound-receipts/${encodeURIComponent(
          receiptNumber
        )}`,
        { method: 'GET', headers: { 'X-Secret-Ref': creds.secretRef } }
      );
      const body = (await res.json()) as {
        milestone?: DeltaInboundMilestone;
        onHold?: boolean;
        exceptionReason?: string;
        receivedUnits?: number;
        error?: string;
      };
      if (!res.ok) return { ok: false, error: body.error ?? `HTTP ${res.status}` };
      return {
        ok: true,
        milestone: body.milestone,
        onHold: body.onHold,
        exceptionReason: body.exceptionReason,
        receivedUnits: body.receivedUnits,
      };
    },

    /** Read the UK inventory buffer held for a SKU. */
    async getInventoryLevel(sku: string): Promise<DeltaInventoryLevelResult> {
      const creds = requireCredentials();
      const res = await transport(
        `${edgeFunctionBase}/delta-fulfillment/inventory/${encodeURIComponent(sku)}`,
        { method: 'GET', headers: { 'X-Secret-Ref': creds.secretRef } }
      );
      const body = (await res.json()) as {
        sku?: string;
        onHandUnits?: number;
        allocatedUnits?: number;
        availableUnits?: number;
        error?: string;
      };
      if (!res.ok) return { ok: false, error: body.error ?? `HTTP ${res.status}` };
      return {
        ok: true,
        sku: body.sku ?? sku,
        onHandUnits: body.onHandUnits,
        allocatedUnits: body.allocatedUnits,
        availableUnits: body.availableUnits,
      };
    },

    /** Create an outbound dispatch (pick/pack + hand-off) to the channel's FC. */
    async createDispatch(input: DeltaDispatchInput): Promise<DeltaDispatchResult> {
      const creds = requireCredentials();
      const res = await transport(`${edgeFunctionBase}/delta-fulfillment/dispatches`, {
        method: 'POST',
        headers: { 'X-Secret-Ref': creds.secretRef },
        body: { ...input, accountId: creds.accountId },
      });
      const body = (await res.json()) as {
        dispatchNumber?: string;
        labelState?: 'created' | 'pending';
        error?: string;
      };
      if (!res.ok) return { ok: false, error: body.error ?? `HTTP ${res.status}` };
      return {
        ok: true,
        dispatchNumber: body.dispatchNumber,
        labelState: body.labelState ?? 'created',
      };
    },

    /** Read the current outbound milestone for a dispatch. */
    async getDispatchStatus(dispatchNumber: string): Promise<DeltaDispatchStatusResult> {
      const creds = requireCredentials();
      const res = await transport(
        `${edgeFunctionBase}/delta-fulfillment/dispatches/${encodeURIComponent(
          dispatchNumber
        )}`,
        { method: 'GET', headers: { 'X-Secret-Ref': creds.secretRef } }
      );
      const body = (await res.json()) as {
        milestone?: DeltaDispatchMilestone;
        estimatedDelivery?: string;
        exception?: boolean;
        exceptionReason?: string;
        error?: string;
      };
      if (!res.ok) return { ok: false, error: body.error ?? `HTTP ${res.status}` };
      return {
        ok: true,
        milestone: body.milestone,
        estimatedDelivery: body.estimatedDelivery,
        exception: body.exception,
        exceptionReason: body.exceptionReason,
      };
    },

    /**
     * The fulfilment invoice for a dispatch. This is what Delta Fulfillment
     * charged MERCENTA; it is never what the brand was charged.
     */
    async getFulfillmentInvoice(
      dispatchNumber: string
    ): Promise<DeltaFulfillmentInvoiceResult> {
      const creds = requireCredentials();
      const res = await transport(
        `${edgeFunctionBase}/delta-fulfillment/dispatches/${encodeURIComponent(
          dispatchNumber
        )}/invoice`,
        { method: 'GET', headers: { 'X-Secret-Ref': creds.secretRef } }
      );
      const body = (await res.json()) as {
        fulfilmentCostGbp?: number;
        invoiceNumber?: string;
        error?: string;
      };
      if (!res.ok) return { ok: false, error: body.error ?? `HTTP ${res.status}` };
      return {
        ok: true,
        fulfilmentCostGbp: body.fulfilmentCostGbp,
        invoiceNumber: body.invoiceNumber,
      };
    },
  };
}

/** Type-identity helper so call sites can name the client shape. */
export type DeltaFulfillmentClient = ReturnType<typeof createDeltaFulfillmentClient>;
