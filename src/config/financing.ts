/**
 * §PHASE 6 — THE INTERNAL CAPITAL / FINANCING CONFIGURATION (the ONE owner).
 *
 * Model B (buy / resell / distribution) means Mercenta acquires the goods from
 * the brand and is repaid by the retail channel, so it needs WORKING CAPITAL in
 * the window between paying the brand and being paid by the channel. This module
 * is the ONE place the capital FACILITY's terms live, so no component or model
 * ever re-derives an advance rate, a fee, a term or a concentration limit.
 *
 * TWO DISTINCT FACTS, never collapsed (the same discipline as `src/config/vat.ts`):
 *   • the PRODUCTION facility — `CAPITAL_FACILITY_CONFIGURED` stays `false` until
 *     the real facility terms are a decided commercial matter. While it is false
 *     the platform computes NO production capital figure; and
 *   • the DEMO ILLUSTRATION — `DEMO_CAPITAL_FACILITY` below, a labelled example
 *     so the founder can see the real arithmetic. It is NEVER presented as
 *     Mercenta's actual facility, and its values are examples, not commitments.
 *
 * Financing is an INTERNAL treasury concern: it is never exposed to a brand merely
 * because a purchase is financed (see `.clinerules/mercenta-business-model.md`).
 */

/**
 * The declared terms of a working-capital facility. Every field is a fact about
 * the FACILITY, never about a particular brand or product.
 */
export interface CapitalFacilityTerms {
  /** The most the facility will have drawn at any one time (GBP). */
  facilityCapacityGbp: number;
  /** The undrawn capital available right now (GBP). */
  availableCapitalGbp: number;
  /** The fraction of a purchase's supplier cost the facility advances (0–1). */
  advanceRate: number;
  /** The fee charged on the drawn advance, as a percentage PER TERM. */
  feeRatePctPerTerm: number;
  /** The financing term in days — the period an advance is outstanding. */
  termDays: number;
  /** The most one brand may take of the total funding, as a percentage. */
  concentrationLimitPct: number;
  /** The currency the facility is denominated in. */
  currency: string;
  /** True once the real facility terms have been decided. */
  configured: boolean;
  /** Human-readable statement of whether this is the real facility. */
  label: string;
  /** What the numbers do and do NOT mean. */
  disclaimer: string;
}

/**
 * §PHASE 6 — whether Mercenta's REAL facility terms have been decided. Mirrors
 * `src/config/commercial.ts → VAT_TREATMENT_CONFIGURED`: while this is `false`,
 * any capital figure on screen is a labelled illustration and NOT a production
 * determination.
 */
export const CAPITAL_FACILITY_CONFIGURED = false;

/**
 * §PHASE 6 — THE DEMO ILLUSTRATION. Example facility terms chosen only so the
 * founder can see real arithmetic. Deliberately a separate constant from the
 * production facility so the demo can never be mistaken for Mercenta's real
 * terms. The values are NOT a commitment and NOT advice.
 */
export const DEMO_CAPITAL_FACILITY: CapitalFacilityTerms = {
  facilityCapacityGbp: 500_000,
  availableCapitalGbp: 500_000,
  advanceRate: 0.85,
  feeRatePctPerTerm: 2.5,
  termDays: 60,
  concentrationLimitPct: 40,
  currency: 'GBP',
  configured: false,
  label: 'Illustrative example — a working-capital facility (not Mercenta’s actual facility)',
  disclaimer:
    'Illustration only. Mercenta’s real facility terms are an external commercial decision and are NOT configured; the advance rate, fee, term, capacity and concentration limit shown are example values chosen to demonstrate the arithmetic.',
};
