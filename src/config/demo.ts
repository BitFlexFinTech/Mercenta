/**
 * §Demo-mode configuration.
 *
 * DEMO_MODE is ON until real credentials are connected via Settings →
 * Integrations. In demo mode every module is populated from src/data/demoStore.ts,
 * shaped EXACTLY like the live integration's response so switching to live
 * data requires zero UI changes. The data-fetching layer (src/data/api.ts)
 * decides seed-vs-live per module based on connection status.
 */
export const DEMO_MODE = true;

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
