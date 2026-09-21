/**
 * §6 — PAYOUT RAILS — THE SINGLE SOURCE OF TRUTH.
 *
 * Mercenta is the intermediary: the retail channel pays Mercenta, Xero records
 * the accounting identity, and Mercenta pays the BRAND its share through a
 * payout rail. The canonical business model fixes which rails exist and in what
 * priority:
 *
 *   DEFAULT   → Payoneer  (Mercenta's primary business + retail-channel payment account)
 *   SECONDARY → Wise      (the fallback rail, used only when deliberately chosen)
 *
 * §RUNTIME PARITY / Founder decision T-1 — RECONCILED 2026-09-21. This file and
 * the edge function previously declared the INVERSE (Wise default, Payoneer
 * secondary) while Founder decision T-1 (docs/AMAZON_RECONCILIATION_STATUS.md §4)
 * had already fixed Payoneer as the canonical PRIMARY/default account. The
 * inversion was recorded as an open contradiction owned by workstream S11 and is
 * now reconciled across all five sources. No live external account was touched:
 * rail ACTIVATION remains credential-only, and both rails still run their
 * deterministic simulation without credentials.
 *
 * Xero is NOT a payout rail — it is the accounting/reconciliation layer (§6).
 * Stripe is NOT a payout rail either: it bills the flat monthly brand
 * subscription only (§11). Both are therefore explicitly REFUSED as payout
 * rails (`assertPayoutRail`), so a mis-wired call fails closed instead of
 * quietly moving brand money through the wrong provider.
 *
 * ⚠️ Rail ACTIVATION is credential-only: with no credentials the rail runs its
 * deterministic simulation and the transfer id is unmistakably simulated.
 */

/** The rails Mercenta can pay a brand through. Nothing else. */
export type PayoutRail = 'wise' | 'payoneer';

export interface PayoutRailDefinition {
  id: PayoutRail;
  /** Operator-facing name. */
  label: string;
  /** The Mercenta account the payout leaves from, shown truthfully in the UI. */
  accountLabel: string;
  /** What the rail calls the destination of a payout. */
  destinationLabel: string;
  /** Prefix for a SIMULATED transfer id — always starts `mock_tr_`. */
  simulationIdPrefix: string;
  /** Server-side env vars that activate the live rail (never in the browser). */
  liveEnvKeys: readonly string[];
}

export const PAYOUT_RAILS: Record<PayoutRail, PayoutRailDefinition> = {
  wise: {
    id: 'wise',
    label: 'Wise',
    accountLabel: 'Wise (Mercenta business account)',
    destinationLabel: 'Wise recipient / business account id',
    // Keeps the `mock_tr_` prefix every pinned test layer asserts, with the rail
    // appended so a simulated transfer can never be mistaken for the other rail.
    simulationIdPrefix: 'mock_tr_wise_',
    liveEnvKeys: ['WISE_API_TOKEN', 'WISE_PROFILE_ID'],
  },
  payoneer: {
    id: 'payoneer',
    label: 'Payoneer',
    accountLabel: 'Payoneer (Mercenta account)',
    destinationLabel: 'Payoneer payee id',
    simulationIdPrefix: 'mock_tr_payoneer_',
    liveEnvKeys: ['PAYONEER_CLIENT_ID', 'PAYONEER_CLIENT_SECRET', 'PAYONEER_PROGRAM_ID'],
  },
} as const;

/** §6 / T-1 — Payoneer is the DEFAULT payout rail. Declared once, read everywhere. */
export const DEFAULT_PAYOUT_RAIL: PayoutRail = 'payoneer';

/** §6 / T-1 — Wise is the SECONDARY payout rail. */
export const SECONDARY_PAYOUT_RAIL: PayoutRail = 'wise';

/** Display/iteration order: default first, then secondary. */
export const PAYOUT_RAIL_ORDER: readonly PayoutRail[] = [
  DEFAULT_PAYOUT_RAIL,
  SECONDARY_PAYOUT_RAIL,
] as const;

/**
 * Providers that are registered, are used by Mercenta, and are explicitly NOT
 * payout rails. Kept as data (not a comment) so the refusal is testable.
 */
export const NON_PAYOUT_RAIL_PROVIDERS: readonly string[] = ['xero', 'stripe'] as const;

/**
 * §6/§7 — NO PAYOUT LEAVES MERCENTA WITHOUT HUMAN APPROVAL.
 *
 * The automated chain stops at a PROPOSED payout; an authorised Mercenta
 * operator must approve it before any instruction reaches the rail. Declared
 * here as a single canonical fact so no surface can imply an auto-send.
 */
export const PAYOUT_REQUIRES_HUMAN_APPROVAL = true;

/** Roles permitted to approve/execute a payout (§28). Sensitive operation. */
export const PAYOUT_APPROVER_ROLES: readonly string[] = ['super_admin', 'admin_staff'] as const;

export function isPayoutRail(value: string): value is PayoutRail {
  return value === 'wise' || value === 'payoneer';
}

/**
 * Resolve a requested rail name (typically from stored configuration) to a real
 * rail. An ABSENT request resolves to the canonical default.
 *
 * A PRESENT-but-unknown request is REFUSED rather than silently defaulted: a
 * payout must never be re-routed to a different provider than the one the
 * operator asked for. (`rail: 'stripe'` therefore throws — see
 * `NON_PAYOUT_RAIL_PROVIDERS`.)
 */
export function assertPayoutRail(requested: string | null | undefined): PayoutRail {
  if (requested == null || requested === '') return DEFAULT_PAYOUT_RAIL;
  if (isPayoutRail(requested)) return requested;
  if (NON_PAYOUT_RAIL_PROVIDERS.includes(requested)) {
    throw new Error(
      `"${requested}" is not a payout rail — Mercenta pays brands via ${PAYOUT_RAILS[
        DEFAULT_PAYOUT_RAIL
      ].label} (default) or ${PAYOUT_RAILS[SECONDARY_PAYOUT_RAIL].label} (secondary)`
    );
  }
  throw new Error(`Unknown payout rail "${requested}" — refusing to guess a destination provider`);
}

export function payoutRailDefinition(rail: PayoutRail): PayoutRailDefinition {
  return PAYOUT_RAILS[rail];
}
