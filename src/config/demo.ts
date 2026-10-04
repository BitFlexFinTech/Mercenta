/**
 * §Demo-mode configuration — the demo COPY and labels only.
 *
 * The DEMO-vs-LIVE decision is OWNED by the ONE SWITCH
 * (`src/config/environment.ts → environmentMode()`); this module no longer
 * decides it. While the platform is in demo, every module is populated from
 * src/data/demoStore.ts, shaped EXACTLY like the live integration's response so
 * switching to live data requires zero UI changes. The data-fetching layer
 * (src/data/api.ts) decides seed-vs-live per module from the owner.
 *
 * §Batch-0 (2026-10-04) — the old hardcoded `DEMO_MODE = true` constant was
 * REMOVED. It always read `true` (even in live), so once every surface followed
 * the switch it was a stale second source of truth. `environmentMode()` is now
 * the ONLY answer to "is the platform in demo?".
 */
export const DEMO_BANNER_TEXT =
  'Investor Demo Mode — all data is simulated for presentation purposes. Connect real integrations in Settings to activate live data flow.';

/**
 * §SSOT S4 (2026-09-27) — THE LABEL FOR SIMULATED OPERATIONAL STATE PRESENTED AS WORK.
 *
 * Why this exists: the operating layer derives work items from the seeded
 * operational records (compliance documents, consignments, invoices, channel POs).
 * In demo mode those records are SIMULATED — no provider is contacted and no live
 * network call is made — but on the work surfaces they read as live operational
 * state. The label is declared ONCE here and rendered by the work workspace, so a
 * surface that shows simulated operational state as work says so, in the same
 * words, everywhere.
 *
 * It follows the established convention of a declared, reusable label
 * (`src/config/ukMarketFit.ts → PRE_AUDIT_SIMULATION_LABEL`) rather than copy
 * pasted into each component.
 */
export const DEMO_OPERATIONAL_STATE_LABEL =
  'Simulated operational state — seeded demo records, no live provider';
