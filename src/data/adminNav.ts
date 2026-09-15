/**
 * §32/§34 (M13 Phase 11) — ADMIN NAVIGATION INTENT.
 *
 * The command centre lives on the admin overview, but most of its CTAs land on a
 * Super Admin TAB (Company, Google, Operating Costs, Launch Centre, Applications).
 * `onNavigate(view)` alone cannot express "Super Admin → Company tab", which
 * forced the founder to hunt through five screens.
 *
 * This tiny module carries ONE pending request across the view switch:
 *   1. the command centre calls `requestAdminNav({ view, tab })` then navigates;
 *   2. `SuperAdminPanel` consumes it once on mount and selects that tab.
 *
 * It is deliberately a single pending intent (not a store): a navigation intent
 * is consumed immediately or not at all, and a stale request must never silently
 * move the founder somewhere unexpected.
 */

export interface AdminNavRequest {
  /** An existing AdminShell view id (e.g. 'super_admin', 'brand_intelligence'). */
  view: string;
  /** An existing Super Admin tab id (e.g. 'company', 'google', 'costs'). */
  tab?: string;
  requestedAt: string;
  /** Where the request came from, for the audit trail and the validator. */
  source: string;
}

let pending: AdminNavRequest | null = null;

export function requestAdminNav(input: { view: string; tab?: string; source?: string }): AdminNavRequest {
  pending = {
    view: input.view,
    tab: input.tab,
    requestedAt: new Date().toISOString(),
    source: input.source ?? 'command-centre',
  };
  return pending;
}

/** Read the pending request WITHOUT consuming it (used by tests/validators). */
export function peekAdminNavRequest(): AdminNavRequest | null {
  return pending;
}

/**
 * Consume the pending request. Returns null when it does not apply to the caller,
 * so a panel can never select a tab it does not own.
 */
export function consumeAdminNavRequest(view: string): AdminNavRequest | null {
  if (!pending || pending.view !== view) return null;
  const taken = pending;
  pending = null;
  return taken;
}

export function resetAdminNav(): void {
  pending = null;
}