/**
 * §P7 — CANONICAL pure date arithmetic (ONE owner).
 *
 * These two helpers were declared in `src/lib/work/workStore.ts`. §P7 moved the
 * DECLARATIONS here because the invoice-timing owner
 * (`src/lib/commerce/invoiceTerms.ts`) needs them, and importing the work layer
 * from it would create a cycle (the work layer imports the invoice terms). The
 * work layer **re-exports the same names**, so every existing consumer of
 * `workStore.addDays` / `workStore.daysBetween` is unchanged and there is still
 * exactly ONE implementation of each.
 *
 * Pure and deterministic: no clock, no randomness, no locale. Both operate on
 * the UTC day boundary the platform already standardises on (`YYYY-MM-DD`).
 */

const DAY_MS = 86_400_000;

/** Add whole days to an ISO date/timestamp, returning `YYYY-MM-DD` (UTC). */
export function addDays(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (positive when `to` is the later date). */
export function daysBetween(from: string, to: string): number {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / DAY_MS);
}
