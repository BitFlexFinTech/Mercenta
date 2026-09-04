/**
 * §7 Stage-10 — Per-service budget caps for the discovery engine.
 *
 * Every paid discovery call routes through here: if the service's spend has
 * hit its cap, the call is refused BEFORE any provider request is made.
 * Caps are placeholders pending commercial sign-off; spend accrues in-memory
 * (per session) until a spend-ledger table lands server-side.
 */

export type DiscoveryService = 'openrouter' | 'firecrawl' | 'hunter' | 'companieshouse' | 'instantly';

/** PLACEHOLDER caps (GBP) — pending commercial sign-off. */
export const DISCOVERY_BUDGET_CAPS_PLACEHOLDER_GBP: Record<DiscoveryService, number> = {
  openrouter: 25,
  firecrawl: 15, // §Batch-8 — Firecrawl web-fetching for grounded research
  hunter: 10,
  companieshouse: 0, // free tier — no paid calls expected
  instantly: 40,
};

const spend: Record<DiscoveryService, number> = {
  openrouter: 0,
  firecrawl: 0,
  hunter: 0,
  companieshouse: 0,
  instantly: 0,
};

export function resetBudgets(): void {
  for (const k of Object.keys(spend) as DiscoveryService[]) spend[k] = 0;
}

export function getSpend(service: DiscoveryService): number {
  return spend[service];
}

/**
 * Records estimated spend. Returns false when the call would exceed the cap —
 * callers MUST abort the provider request in that case.
 */
export function chargeService(service: DiscoveryService, amountGbp: number): boolean {
  const next = spend[service] + amountGbp;
  if (next > DISCOVERY_BUDGET_CAPS_PLACEHOLDER_GBP[service]) return false;
  spend[service] = next;
  return true;
}

export function remainingBudget(service: DiscoveryService): number {
  return Math.max(0, DISCOVERY_BUDGET_CAPS_PLACEHOLDER_GBP[service] - spend[service]);
}
