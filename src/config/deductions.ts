/**
 * §SESSION 43 / BATCH 2a — DEDUCTION, DISPUTE AND RESTOCK ATTRIBUTION (ONE declaration).
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The Phase 0A audit registered three findings about DEDUCTIONS, and all three
 * have the same shape — a Mercenta invention presented as the retail channel's
 * rule:
 *
 *   · `AV-019`  — the nine `DeductionType` values were treated as real channel
 *                 chargeback codes. **No channel source reached publishes this
 *                 taxonomy** (the channel's help pages are sign-in gated and no
 *                 public API exposes it). Disposition: **RELABEL** — Mercenta's
 *                 working taxonomy until real codes are sourced.
 *   · `AV-019b` — a fourteen-day dispute window was stated as a deadline the brand
 *                 had to meet, as though the channel published it. **No channel
 *                 source reached states a deduction-dispute window.**
 *                 Disposition: **RELABEL** — Mercenta's own service standard.
 *   · `AV-020b` — a thirty-day restock countdown told the brand an unrestocked
 *                 line would stop being visible on the channel. **Not established
 *                 by any channel source.** Disposition: **RELABEL** — Mercenta's
 *                 own replenishment target, with no claim about channel visibility.
 *
 * THE RULE THIS FILE ENFORCES
 * --------------------------
 * `Mercenta invents NOTHING in the channel's name.` Each of the three values
 * below is therefore declared here WITH ITS OWN ATTRIBUTION, `verifiedAgainstChannel`
 * says plainly whether a channel source supports it (all three say `false`), and
 * `attributionNote` is the exact sentence every user-facing surface renders. A
 * number with no citation is never presented as the channel's rule.
 *
 * This module is the ONE owner of those three values and of the category labels.
 * `scripts/validate-amazon-attribution.mjs` fails if a surface presents any of
 * them as the retail channel's, or if the un-attributed wording comes back.
 */
import type { DeductionType } from '@/types';

/** Where a declared operational value comes from. Never 'channel' until sourced. */
export type AttributionSource =
  | 'mercenta_working_taxonomy'
  | 'mercenta_service_standard'
  | 'mercenta_operational_target';

/**
 * `AV-019` — Mercenta's WORKING taxonomy for grouping deductions.
 *
 * It is a real, useful internal grouping. It is **not** the channel's published
 * chargeback code list, and no surface may imply that it is.
 */
export const DEDUCTION_TAXONOMY = {
  source: 'mercenta_working_taxonomy' as AttributionSource,
  /** `false` = no retail-channel source reached publishes these categories. */
  verifiedAgainstChannel: false,
  /** The heading shown above the category chips. */
  heading: 'Deduction Categories',
  /** Rendered beside the categories so they can never be mistaken for channel codes. */
  attributionNote:
    'Mercenta working taxonomy — these categories are Mercenta’s own grouping of the ' +
    'deductions on your account, NOT the retail channel’s published chargeback codes. Real ' +
    'codes will be sourced from the channel’s own reporting before any code is presented as ' +
    'the channel’s.',
} as const;

/** The nine canonical categories, labelled once (never inline in a component). */
export const DEDUCTION_TYPE_LABELS: Record<DeductionType, string> = {
  late_shipment: 'Late shipment',
  shortage_claim: 'Shortage claim',
  mislabeled_carton: 'Mislabeled carton',
  non_compliance_fine: 'Non-compliance fine',
  co_op: 'Co-op',
  return_charge: 'Return charge',
  unfilled_by_cancel_date: 'Unfilled by cancel date',
  po_on_time_accuracy: 'PO on-time accuracy',
  other: 'Other',
};

/** The label for a category, falling back to the raw value (never a blank chip). */
export function deductionTypeLabel(type: DeductionType | string): string {
  return DEDUCTION_TYPE_LABELS[type as DeductionType] ?? String(type).replace(/_/g, ' ');
}

/**
 * `AV-019b` — Mercenta's OWN service standard for raising a deduction dispute.
 *
 * The behaviour is kept (a window is operationally necessary: evidence has to be
 * assembled and put to the channel), but the ATTRIBUTION is corrected. It is a
 * Mercenta commitment to the brand, not a deadline the channel has published.
 */
export const DEDUCTION_DISPUTE_WINDOW = {
  days: 14,
  source: 'mercenta_service_standard' as AttributionSource,
  /** `false` = no retail-channel source reached states a dispute window. */
  verifiedAgainstChannel: false,
  /** Rendered wherever the window is shown to a brand. */
  attributionNote:
    'Mercenta’s own service standard — raise a dispute within 14 days of the deduction date so ' +
    'there is time to assemble evidence and put the case to the retail channel. This is NOT a ' +
    'published channel deadline. If the channel publishes a window, it will be confirmed from ' +
    'its own reporting and stated here before anyone relies on it.',
  /** The refusal shown when a dispute is attempted after the window. */
  expiredRefusal:
    'This dispute is past Mercenta’s own 14-day service standard. It can still be recorded, ' +
    'but the outcome will depend on the retail channel accepting a late case.',
} as const;

/**
 * `AV-020b` — Mercenta's OWN replenishment target for a backordered line.
 *
 * The countdown is kept because chasing a backorder is genuinely useful, but it
 * no longer claims a channel consequence that no channel source states.
 */
export const BACKORDER_RESTOCK_TARGET = {
  days: 30,
  source: 'mercenta_operational_target' as AttributionSource,
  /** `false` = no retail-channel source states a restock/visibility deadline. */
  verifiedAgainstChannel: false,
  /** The heading shown above the countdown. */
  heading: 'Mercenta restock reminder',
  /** Rendered with the countdown, so the number is never read as a channel rule. */
  attributionNote:
    'Mercenta’s own replenishment target — a backordered line is chased for 30 days from its ' +
    'scheduled ship date. It is NOT a channel rule and makes no claim about channel visibility, ' +
    'because no channel source states such a deadline.',
  /** Shown when the target date has passed (no channel consequence is asserted). */
  overdueLabel: 'Restock target passed — Mercenta will chase this line',
} as const;

