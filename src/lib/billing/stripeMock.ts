/**
 * §11/§14 — MOCK Stripe client (mock-first policy).
 *
 * Implements the EXACT same method signatures and result shapes as the
 * transport-backed real client in stripe.ts, so the Billing panel runs
 * identically until real Stripe keys are connected in the wizard.
 * All identifiers are unmistakably fake (`mock:` prefix) and every UI surface
 * consuming this client labels itself "(Mock)".
 *
 * Simulated behaviours:
 *  - startSubscription always succeeds with a `mock:sub-…` id;
 *  - every 5th created subscription reports `past_due` on status checks so
 *    the dunning path stays testable;
 *  - cancelling an unknown id fails with a realistic error.
 */

import type { PlanTier, SubscriptionResult } from './stripe';

export interface MockSubscriptionState {
  id: string;
  brandId: string;
  planTier: PlanTier;
  /** Deterministic dunning schedule: every 5th subscription goes past_due. */
  willDun: boolean;
  cancelled: boolean;
}

const subscriptions = new Map<string, MockSubscriptionState>();
let counter = 0;

export function resetMockStripeState(): void {
  subscriptions.clear();
  counter = 0;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

 
export function createMockStripeClient(_edgeFunctionBase?: string) {
  return {
    async startSubscription(
      brandId: string,
      planTier: PlanTier,
      _customerEmail: string
    ): Promise<SubscriptionResult> {
      await delay(200);
      counter += 1;
      const id = `mock:sub-${String(counter).padStart(5, '0')}`;
      subscriptions.set(id, {
        id,
        brandId,
        planTier,
        willDun: counter % 5 === 0,
        cancelled: false,
      });
      return { ok: true, stripeSubscriptionId: id };
    },

    async cancelSubscription(stripeSubscriptionId: string): Promise<{ ok: boolean; error?: string }> {
      await delay(150);
      const sub = subscriptions.get(stripeSubscriptionId);
      if (!sub) {
        return { ok: false, error: `No such subscription: ${stripeSubscriptionId}` };
      }
      if (sub.cancelled) {
        return { ok: false, error: 'Subscription already cancelled' };
      }
      sub.cancelled = true;
      return { ok: true };
    },

    async getSubscriptionStatus(
      stripeSubscriptionId: string
    ): Promise<{ ok: boolean; status?: string; error?: string }> {
      await delay(120);
      const sub = subscriptions.get(stripeSubscriptionId);
      if (!sub) {
        return { ok: false, error: `No such subscription: ${stripeSubscriptionId}` };
      }
      if (sub.cancelled) return { ok: true, status: 'canceled' };
      return { ok: true, status: sub.willDun ? 'past_due' : 'active' };
    },
  };
}
