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
