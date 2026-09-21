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
 *
 * §Phase M11 — RAIL CORRECTION. The canonical business model (§6) fixes the
 * payout rails as **Payoneer (DEFAULT)** and **Wise (secondary)** — Founder
 * decision T-1, reconciled in code on 2026-09-21. Stripe is
 * NOT a payout rail — it bills the flat monthly brand subscription only. The
 * rail is therefore resolved through `src/config/payouts.ts` (the single source
 * of truth) and `createPayoutClient` now returns the rail-appropriate client.
 * The simulated transfer-id prefix stays `mock_tr_` (every pinned test layer
 * asserts it) with the rail appended — `mock_tr_payoneer_000001` — so a
 * simulated payout can never be mistaken for the other rail.
 */

import {
  DEFAULT_PAYOUT_RAIL,
  assertPayoutRail,
  PAYOUT_RAILS,
  type PayoutRail,
} from '@/config/payouts';

export interface PayoutClient {
  readonly mode: 'mock' | 'real';
  /** §6 — which rail this client pays through. Absent = pre-M11 Stripe ledger. */
  readonly rail?: PayoutRail;
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

/**
 * §Phase M11 — the RAIL-AWARE real client.
 *
 * Posts to the flat `payouts-transfer` Edge Function, which holds the rail
 * credentials (Wise / Payoneer) server-side and forwards the idempotency key to
 * the rail itself, so even a retry storm cannot double-pay. The rail is part of
 * the request, so one function serves both rails without the caller knowing
 * which credential store is live.
 *
 * This SUPERSEDES the Stripe payout client: Stripe is not a payout rail (§6).
 */
export class RealPayoutRailClient implements PayoutClient {
  readonly mode = 'real' as const;
  readonly rail: PayoutRail;
  constructor(
    rail: PayoutRail,
    private readonly secretRef: string,
    private readonly edgeFunctionBase: string,
    private readonly transport: import('@/lib/spapi/client').FetchLike
  ) {
    this.rail = rail;
  }

  async createTransfer(input: {
    idempotencyKey: string;
    amountGbp: number;
    destinationAccountId: string;
  }): Promise<{ ok: boolean; transferId?: string; error?: string }> {
    const res = await this.transport(`${this.edgeFunctionBase}/payouts-transfer`, {
      method: 'POST',
      headers: { 'X-Secret-Ref': this.secretRef, 'Idempotency-Key': input.idempotencyKey },
      body: { ...input, rail: this.rail },
    });
    const body = (await res.json()) as { transferId?: string; error?: string };
    if (!res.ok) return { ok: false, error: body.error ?? `HTTP ${res.status}` };
    return { ok: true, transferId: body.transferId };
  }
}

/**
 * §Phase M11 — the rail-aware MOCK client. Shares the SAME simulated ledger as
 * `MockStripePayoutClient` (one ledger, not two), so a replayed idempotency key
 * returns the same simulated transfer no matter which rail client is active.
 *
 * The id is unmistakably simulated AND names the rail: `mock_tr_wise_000001`.
 * A `mock:`-prefixed secret reference can never reach a live transport.
 */
export class MockPayoutRailClient implements PayoutClient {
  readonly mode = 'mock' as const;
  readonly rail: PayoutRail;
  constructor(rail: PayoutRail = DEFAULT_PAYOUT_RAIL) {
    this.rail = rail;
  }

  async createTransfer(input: {
    idempotencyKey: string;
    amountGbp: number;
    destinationAccountId: string;
  }): Promise<{ ok: boolean; transferId?: string; error?: string }> {
    await new Promise((r) => setTimeout(r, 50));
    if (input.amountGbp <= 0) {
      return { ok: false, error: 'transfer amount must be positive' };
    }
    const existing = mockTransfers.get(input.idempotencyKey);
    if (existing) {
      // Same key → same simulated transfer (idempotent replay), on ANY rail.
      return { ok: true, transferId: existing.transferId };
    }
    transferCounter += 1;
    const transferId = `${PAYOUT_RAILS[this.rail].simulationIdPrefix}${String(
      transferCounter
    ).padStart(6, '0')}`;
    mockTransfers.set(input.idempotencyKey, { transferId, amountGbp: input.amountGbp });
    return { ok: true, transferId };
  }
}

/** Transport used by the real client; injectable for tests (mirrors DHL). */
function defaultPayoutTransport(): import('@/lib/spapi/client').FetchLike {
  return async (url, init) => {
    const res = await fetch(url, {
      method: init?.method ?? 'GET',
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
    return { ok: res.ok, status: res.status, json: () => res.json() };
  };
}

/**
 * §Phase M11 — the rail-first factory. Mock until VERIFIED non-mock credentials
 * exist; otherwise the real rail client. An unknown rail is REFUSED
 * (`assertPayoutRail`) rather than silently re-routed to another provider.
 */
export function createRailPayoutClient(
  input: {
    rail?: string | null;
    secretRef?: string;
    verified?: boolean;
  } | null,
  edgeFunctionBase = '/functions/v1',
  transport: import('@/lib/spapi/client').FetchLike = defaultPayoutTransport()
): PayoutClient {
  const rail = assertPayoutRail(input?.rail ?? DEFAULT_PAYOUT_RAIL);
  const creds = input ?? null;
  if (creds && creds.verified && creds.secretRef && !creds.secretRef.startsWith('mock:')) {
    return new RealPayoutRailClient(rail, creds.secretRef, edgeFunctionBase, transport);
  }
  return new MockPayoutRailClient(rail);
}

/**
 * Mock-first seam (kept as the canonical entry point — every existing call site
 * keeps working). §Phase M11: this now resolves through `createRailPayoutClient`
 * with the canonical DEFAULT rail (Payoneer), so the Stripe-only contract is gone.
 */
export function createPayoutClient(
  creds: { secretRef: string; verified: boolean } | null,
  edgeFunctionBase = '/functions/v1',
  rail: string | null = DEFAULT_PAYOUT_RAIL
): PayoutClient {
  return createRailPayoutClient(
    creds ? { rail, secretRef: creds.secretRef, verified: creds.verified } : { rail },
    edgeFunctionBase
  );
}

/**
 * §Phase D6 — the payout contract recognises exactly two tracks, while the
 * canonical `FulfillmentTrack` also has `'unassigned'` (a brand not yet assigned
 * a model). The existing surfaces already default that case to `financed`
 * (`fetchBrands` maps a missing track with `?? 'financed'`; the agreement builder
 * does the same), so this normaliser keeps ONE convention instead of letting the
 * fee clause silently differ between screens. It is deliberately total: no
 * payout can be computed under an undefined clause.
 */
export function normalisePayoutTrack(track: string): 'direct_fulfillment' | 'financed' {
  return track === 'direct_fulfillment' ? 'direct_fulfillment' : 'financed';
}

/* ── Fee math ────────────────────────────────────────────────────────── */

/** Contract clause difference: financed track deducts a handling fee.
 *  PLACEHOLDER £0 — pending commercial sign-off (§0 money rule). */
export const FINANCED_FULFILMENT_FEE_PLACEHOLDER_GBP = 0;

/**
 * §Phase D6 — make the payout path IMMUNE to the corpus's two `commissionRate`
 * conventions.
 *
 * The canonical convention is PERCENT (`types.ts` "…% of net PO value",
 * `COMMISSION_RATE_PLACEHOLDER = 12`, `spapi/transform` ÷100, the seeded
 * POs/contracts). Two generation paths write a FRACTION instead
 * (`api.ts` generated PO `0.07`, `scenarioEngine` `0.07`), so feeding a raw rate
 * into percent-based maths can under-charge a commission by ~100×.
 *
 * The RECORDED `commissionAmount` is the canonical money value, so the effective
 * percentage is derived from it whenever present; otherwise a value below 1 is
 * normalised as a fraction. Deterministic and side-effect free — no data rewrite,
 * no second rate stored anywhere.
 */
export function resolveCommissionRatePct(input: {
  commissionRate: number;
  commissionAmount?: number;
  poValue: number;
}): number {
  const { commissionRate, commissionAmount, poValue } = input;
  if (commissionAmount && commissionAmount > 0 && poValue > 0) {
    return Math.round((commissionAmount / poValue) * 100 * 10000) / 10000;
  }
  if (commissionRate > 0 && commissionRate < 1) {
    return Math.round(commissionRate * 100 * 10000) / 10000;
  }
  return commissionRate;
}

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



