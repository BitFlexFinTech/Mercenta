/**
 * §11 — Stripe adapter for the flat monthly brand subscription.
 *
 * Same credential discipline as the SP-API client (§14): credentials come
 * only from the wizard's Stripe connection record; disconnected or
 * sandbox-only connections refuse to operate. Commission billing does NOT
 * touch Stripe — it is event-driven from real purchase orders and invoiced
 * internally (see invoice.ts).
 */
import type { FetchLike } from '@/lib/spapi/client';
import { createMockStripeClient } from './stripeMock';

export interface StripeCredentials {
  secretRef: string;
  verified: boolean;
}

export type PlanTier = 'starter' | 'growth';

/** Placeholder pricing — pending commercial sign-off (§0 money rule). */
export const PLAN_FEES_PLACEHOLDER_GBP: Record<PlanTier, number> = {
  starter: 199,
  growth: 499,
};

export interface SubscriptionResult {
  ok: boolean;
  stripeSubscriptionId?: string;
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

export function createStripeClient(
  getCredentials: () => StripeCredentials | null,
  edgeFunctionBase: string,
  transport: FetchLike = defaultFetch
) {
  function requireCredentials(): StripeCredentials {
    const creds = getCredentials();
    if (!creds) {
      throw new Error('Stripe not connected — connect Stripe in Integration Settings.');
    }
    if (!creds.verified) {
      throw new Error(
        'Stripe connection is sandbox-only — complete a live OAuth connect to enable billing.'
      );
    }
    return creds;
  }

  return {
    /** Start (or restart) a brand's flat monthly subscription checkout. */
    async startSubscription(
      brandId: string,
      planTier: PlanTier,
      customerEmail: string
    ): Promise<SubscriptionResult> {
      const creds = requireCredentials();
      const res = await transport(`${edgeFunctionBase}/subscriptions`, {
        method: 'POST',
        headers: { 'X-Secret-Ref': creds.secretRef },
        body: { brandId, planTier, customerEmail },
      });
      const body = (await res.json()) as SubscriptionResult;
      if (!res.ok) return { ok: false, error: body.error ?? `HTTP ${res.status}` };
      return { ok: true, stripeSubscriptionId: body.stripeSubscriptionId };
    },

    /** Cancel a brand's subscription. */
    async cancelSubscription(stripeSubscriptionId: string): Promise<{ ok: boolean; error?: string }> {
      const creds = requireCredentials();
      const res = await transport(`${edgeFunctionBase}/subscriptions/cancel`, {
        method: 'POST',
        headers: { 'X-Secret-Ref': creds.secretRef },
        body: { stripeSubscriptionId },
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        return { ok: false, error: body.error ?? `HTTP ${res.status}` };
      }
      return { ok: true };
    },

    /** Read live subscription state (plan tier, past_due etc.). */
    async getSubscriptionStatus(
      stripeSubscriptionId: string
    ): Promise<{ ok: boolean; status?: string; error?: string }> {
      const creds = requireCredentials();
      const res = await transport(
        `${edgeFunctionBase}/subscriptions/${encodeURIComponent(stripeSubscriptionId)}`,
        { method: 'GET', headers: { 'X-Secret-Ref': creds.secretRef } }
      );
      const body = (await res.json()) as { status?: string; error?: string };
      if (!res.ok) return { ok: false, error: body.error ?? `HTTP ${res.status}` };
      return { ok: true, status: body.status };
    },
  };
}

/* ── Factory (mock-first policy) ──────────────────────────────────────────
 * A verified live connection returns the REAL client; anything else returns
 * the MOCK client (unmistakable `mock:` ids). Nothing outside this factory
 * knows or cares which implementation is active. */
export function createStripeClientForConnection(
  getConnection: () => StripeCredentials | null,
  edgeFunctionBase: string,
  transport: FetchLike = defaultFetch
) {
  const creds = getConnection();
  if (creds && creds.verified && creds.secretRef) {
    return createStripeClient(() => creds, edgeFunctionBase, transport);
  }
  return createMockStripeClient(edgeFunctionBase);
}
