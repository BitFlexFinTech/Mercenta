/**
 * §Canonical model §13 — PALLETLINE adapter (live client).
 *
 * Palletline is Mercenta's **UK-domestic palletised-freight** account (§10/§11);
 * international consignments never use it. Credentials come exclusively from an
 * integration connection record — never raw env vars — and a live token is
 * retrieved through the secret store referenced by the connection. This module
 * refuses to run against a disconnected or sandbox-only connection.
 *
 * Transport is injectable for automated tests; in production it POSTs through
 * the server-side Edge Function proxy, which holds the encrypted credentials and
 * calls Palletline's consignment API. The wire format is deliberately
 * centralised here so only this file changes when the real contract is
 * confirmed.
 */
import type { FetchLike } from '@/lib/spapi/client';

export interface PalletlineCredentials {
  /** Secret-store reference holding the real Palletline credential. */
  secretRef: string;
  /** Palletline customer account number (non-secret operational metadata). */
  accountNumber?: string;
  /** False while the Integrations connect only completed in sandbox mode. */
  verified: boolean;
}

export type PalletlineMilestone =
  | 'consignment_booked'
  | 'collection_scheduled'
  | 'collected'
  | 'at_hub'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed_delivery'
  | 'exception';

export interface PalletlineCreateConsignmentInput {
  /** Internal Mercenta reference (the shipment id / PO number). */
  reference: string;
  origin: string;
  destination: string;
  /** Number of pallets on the consignment (Palletline's unit of movement). */
  pallets: number;
  totalWeightKg?: number;
  service?: string;
}

export interface PalletlineCreateConsignmentResult {
  ok: boolean;
  consignmentNumber?: string;
  trackingNumber?: string;
  /** 'created' means the pallet label / consignment note is available. */
  labelState?: 'created' | 'pending';
  error?: string;
}

export interface PalletlineConsignmentStatusResult {
  ok: boolean;
  milestone?: PalletlineMilestone;
  estimatedDelivery?: string;
  /** True when the depot flags an exception requiring Mercenta attention. */
  exception?: boolean;
  exceptionReason?: string;
  /** True when a delivery attempt failed (the pallet returns to the depot). */
  failedDelivery?: boolean;
  delayed?: boolean;
  error?: string;
}

export interface PalletlineInvoiceResult {
  ok: boolean;
  /** What Palletline charged MERCENTA — never what the brand was charged. */
  carrierCostGbp?: number;
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

export function createPalletlineClient(
  getCredentials: () => PalletlineCredentials | null,
  edgeFunctionBase: string,
  transport: FetchLike = defaultFetch
) {
  function requireCredentials(): PalletlineCredentials {
    const creds = getCredentials();
    if (!creds) {
      throw new Error(
        'Palletline is not connected. Ask your admin to enable it in Integration Settings.'
      );
    }
    if (!creds.verified) {
      throw new Error(
        'Palletline connection is sandbox-only — complete a live connect to book real consignments.'
      );
    }
    return creds;
  }

  return {
    /** Book a consignment and generate the consignment note / label. */
    async createConsignment(
      input: PalletlineCreateConsignmentInput
    ): Promise<PalletlineCreateConsignmentResult> {
      const creds = requireCredentials();
      const res = await transport(`${edgeFunctionBase}/palletline/consignments`, {
        method: 'POST',
        headers: { 'X-Secret-Ref': creds.secretRef },
        body: { ...input, accountNumber: creds.accountNumber },
      });
      const body = (await res.json()) as {
        consignmentNumber?: string;
        trackingNumber?: string;
        labelState?: 'created' | 'pending';
        error?: string;
      };
      if (!res.ok) return { ok: false, error: body.error ?? `HTTP ${res.status}` };
      return {
        ok: true,
        consignmentNumber: body.consignmentNumber,
        trackingNumber: body.trackingNumber,
        labelState: body.labelState ?? 'created',
      };
    },

    /** Read the current milestone for a consignment. */
    async getConsignmentStatus(
      consignmentNumber: string
    ): Promise<PalletlineConsignmentStatusResult> {
      const creds = requireCredentials();
      const res = await transport(
        `${edgeFunctionBase}/palletline/consignments/${encodeURIComponent(consignmentNumber)}`,
        { method: 'GET', headers: { 'X-Secret-Ref': creds.secretRef } }
      );
      const body = (await res.json()) as {
        milestone?: PalletlineMilestone;
        estimatedDelivery?: string;
        exception?: boolean;
        exceptionReason?: string;
        failedDelivery?: boolean;
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
        failedDelivery: body.failedDelivery,
        delayed: body.delayed,
      };
    },

    /** Schedule (or reschedule) a collection window from the collection point. */
    async requestCollection(
      consignmentNumber: string,
      collectionDate: string
    ): Promise<{ ok: boolean; error?: string }> {
      const creds = requireCredentials();
      const res = await transport(`${edgeFunctionBase}/palletline/collections`, {
        method: 'POST',
        headers: { 'X-Secret-Ref': creds.secretRef },
        body: { consignmentNumber, collectionDate },
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        return { ok: false, error: body.error ?? `HTTP ${res.status}` };
      }
      return { ok: true };
    },

    /** Cancel a consignment that has not yet been collected. */
    async cancelConsignment(
      consignmentNumber: string
    ): Promise<{ ok: boolean; error?: string }> {
      const creds = requireCredentials();
      const res = await transport(
        `${edgeFunctionBase}/palletline/consignments/${encodeURIComponent(
          consignmentNumber
        )}/cancel`,
        { method: 'POST', headers: { 'X-Secret-Ref': creds.secretRef } }
      );
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        return { ok: false, error: body.error ?? `HTTP ${res.status}` };
      }
      return { ok: true };
    },

    /**
     * §12/§13 — the carrier INVOICE for a consignment. This is what Palletline
     * charged MERCENTA; it is never what the brand was charged.
     */
    async getConsignmentInvoice(
      consignmentNumber: string
    ): Promise<PalletlineInvoiceResult> {
      const creds = requireCredentials();
      const res = await transport(
        `${edgeFunctionBase}/palletline/consignments/${encodeURIComponent(
          consignmentNumber
        )}/invoice`,
        { method: 'GET', headers: { 'X-Secret-Ref': creds.secretRef } }
      );
      const body = (await res.json()) as {
        carrierCostGbp?: number;
        invoiceNumber?: string;
        error?: string;
      };
      if (!res.ok) return { ok: false, error: body.error ?? `HTTP ${res.status}` };
      return {
        ok: true,
        carrierCostGbp: body.carrierCostGbp,
        invoiceNumber: body.invoiceNumber,
      };
    },
  };
}

/** Type-identity helper so call sites can name the client shape. */
export type PalletlineClient = ReturnType<typeof createPalletlineClient>;
