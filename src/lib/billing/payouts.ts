/**
 * §8 Stage-8 — Commission payouts to brands.
 *
 * AUDITED PATTERN (Separate Charges and Transfers): Amazon pays Mercenta
 * directly as vendor of record — no Stripe charge mediates the sale. When a
 * PO's proceeds land, Mercenta creates a Stripe `transfer` to the brand's
 * Connect account for its net share. Nothing here ever creates a charge.
 *
 * Money rules enforced by this module:
 *   1. DOUBLE-PAYOUT GUARD: a commission settles once; second attempt refused.
 *   2. PAID ONLY AFTER CONFIRMATION: status moves to `paid` strictly after
 *      the transfer client reports success — never optimistically before.
 *   3. FEE MATH: net share = PO value − Retail Performance Fee (commission),
 *      minus the financed-fulfilment fee when track is `financed`
 *      (contract clause difference; placeholder £0 pending sign-off).
 *
 * Mock-first: MockStripePayoutClient runs until real Stripe Connect
 * credentials are configured; signatures/shapes match the real client.
 */

export interface PayoutClient {
  readonly mode: 'mock' | 'real';
  /** Creates a transfer to the brand's Connect account. Idempotent by key. */
  createTransfer(input: {
    idempotencyKey: string;
    amountGbp: number;
    destinationAccountId: string;
  }): Promise<{ ok: boolean; transferId?: string; error?: string }>;
}

/** Module-level simulated transfer ledger shared across instances. */
const mockTransfers = new Map<string, { transferId: string; amountGbp: number }>();

export function resetMockPayouts(): void {
  mockTransfers.clear();
}

let transferCounter = 0;

export class MockStripePayoutClient implements PayoutClient {
  readonly mode = 'mock' as const;

  async createTransfer(input: {
    idempotencyKey: string;
    amountGbp: number;
    destinationAccountId: string;
  }): Promise<{ ok: boolean; transferId?: string; error?: string }> {
    await new Promise((r) => setTimeout(r, 50));
    const existing = mockTransfers.get(input.idempotencyKey);
    if (existing) {
      // Same key → same transfer returned (idempotent replay).
      return { ok: true, transferId: existing.transferId };
    }
    if (input.amountGbp <= 0) {
      return { ok: false, error: 'transfer amount must be positive' };
    }
    transferCounter += 1;
    const transferId = `mock_tr_${String(transferCounter).padStart(6, '0')}`;
    mockTransfers.set(input.idempotencyKey, { transferId, amountGbp: input.amountGbp });
    return { ok: true, transferId };
  }

  static has(idempotencyKey: string): boolean {
    return mockTransfers.has(idempotencyKey);
  }
}

/** Real client — the payouts Edge Function holds the Stripe secret key and
 *  forwards the idempotency key to Stripe itself, so even a retry storm
 *  cannot double-pay. Selected by createPayoutClient() when verified
 *  non-mock credentials exist. */
export class RealStripePayoutClient implements PayoutClient {
  readonly mode = 'real' as const;
  constructor(
    private readonly secretRef: string,
    private readonly edgeFunctionBase: string,
    private readonly transport: import('@/lib/spapi/client').FetchLike
  ) {}

  async createTransfer(input: {
    idempotencyKey: string;
    amountGbp: number;
    destinationAccountId: string;
  }): Promise<{ ok: boolean; transferId?: string; error?: string }> {
    const res = await this.transport(`${this.edgeFunctionBase}/payouts/transfer`, {
      method: 'POST',
      headers: { 'X-Secret-Ref': this.secretRef, 'Idempotency-Key': input.idempotencyKey },
      body: input,
    });
    const body = (await res.json()) as { transferId?: string; error?: string };
    if (!res.ok) return { ok: false, error: body.error ?? `HTTP ${res.status}` };
    return { ok: true, transferId: body.transferId };
  }
}

/** Mock-first seam: mock until verified, non-mock credentials exist. */
export function createPayoutClient(
  creds: { secretRef: string; verified: boolean } | null,
  edgeFunctionBase = '/functions/v1/billing'
): PayoutClient {
  if (creds && creds.verified && !creds.secretRef.startsWith('mock:')) {
    const transport: import('@/lib/spapi/client').FetchLike = async (url, init) => {
      const res = await fetch(url, {
        method: init?.method ?? 'GET',
        headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
        body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      });
      return { ok: res.ok, status: res.status, json: () => res.json() };
    };
    return new RealStripePayoutClient(creds.secretRef, edgeFunctionBase, transport);
  }
  return new MockStripePayoutClient();
}

/* ── Fee math ────────────────────────────────────────────────────────── */

/** Contract clause difference: financed track deducts a handling fee.
 *  PLACEHOLDER £0 — pending commercial sign-off (§0 money rule). */
export const FINANCED_FULFILMENT_FEE_PLACEHOLDER_GBP = 0;

export function computeBrandNetShare(input: {
  poValue: number;
  commissionRatePct: number;
  fulfillmentTrack: 'direct_fulfillment' | 'financed';
}): number {
  const commission = Math.round(((input.poValue * input.commissionRatePct) / 100) * 100) / 100;
  const financedFee =
    input.fulfillmentTrack === 'financed' ? FINANCED_FULFILMENT_FEE_PLACEHOLDER_GBP : 0;
  return Math.round((input.poValue - commission - financedFee) * 100) / 100;
}

/* ── Settlement (double-payout guard lives here) ─────────────────────── */

export interface SettleableCommission {
  id: string;
  brandId: string;
  poValue: number;
  commissionRate: number;
  status: 'accrued' | 'invoiced' | 'paid';
}

export interface SettlementResult {
  ok: boolean;
  transferId?: string;
  netShareGbp?: number;
  error?: string;
}

/**
 * Settles one commission via a Stripe Connect transfer. Refuses commissions
 * already `paid` (guard #1) and marks `paid` only after the transfer client
 * confirms success (guard #2). `markPaid` persists the state change — in the
 * app this is the api.ts Supabase update; tests inject a spy.
 */
export async function settleCommission(
  commission: SettleableCommission,
  opts: {
    fulfillmentTrack: 'direct_fulfillment' | 'financed';
    destinationAccountId: string;
    client: PayoutClient;
    markPaid: (commissionId: string, transferId: string) => Promise<void>;
  }
): Promise<SettlementResult> {
  if (commission.status === 'paid') {
    return { ok: false, error: `commission ${commission.id} is already paid — refusing double payout` };
  }
  const netShareGbp = computeBrandNetShare({
    poValue: commission.poValue,
    commissionRatePct: commission.commissionRate,
    fulfillmentTrack: opts.fulfillmentTrack,
  });
  const result = await opts.client.createTransfer({
    idempotencyKey: `comm_${commission.id}`,
    amountGbp: netShareGbp,
    destinationAccountId: opts.destinationAccountId,
  });
  if (!result.ok) {
    return { ok: false, error: result.error ?? 'transfer failed — commission left unpaid' };
  }
  await opts.markPaid(commission.id, result.transferId!);
  return { ok: true, transferId: result.transferId, netShareGbp };
}



