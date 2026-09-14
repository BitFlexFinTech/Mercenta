/**
 * Commercial terms — PLACEHOLDERS.
 *
 * ⚠️ These values involve money and have NOT been commercially signed off.
 * They exist so the document generator and contract templates can be built
 * end-to-end. Replace with agreed terms (or wire to a settings table) before
 * anything customer-facing or legally binding is produced from them.
 */
export const COMMISSION_RATE_PLACEHOLDER = 12; // % of net PO value
export const MONTHLY_FEE_PLACEHOLDER_GBP = 250; // flat GBP

/**
 * §8 auto-approval threshold: commission invoices below this amount are
 * auto-generated and sent; at/above it they are held for one-click admin
 * approval in the daily digest. PLACEHOLDER pending commercial sign-off.
 */
export const COMMISSION_AUTO_APPROVE_THRESHOLD_PLACEHOLDER_GBP = 10_000;

/**
 * §M6 — VAT TREATMENT IS AN EXTERNAL BUSINESS/ACCOUNTING DECISION.
 *
 * The platform must be able to EXPRESS the final treatment cleanly, but it must
 * never invent one. Until this decision is taken and configured here, every
 * financial record carries `configuration_required` and no VAT amount is
 * computed or presented as a production figure.
 *
 * To configure it: set `VAT_TREATMENT` to the agreed treatment and flip
 * `VAT_TREATMENT_CONFIGURED` to true (and, if the treatment implies a rate,
 * `VAT_RATE_PCT`). The canonical money flow reads this ONE source, so the
 * reconciliation, the payout and the accounting representation all agree.
 */
export type ConfiguredVatTreatment =
  | 'configuration_required'
  | 'standard_20'
  | 'zero_rated'
  | 'exempt'
  | 'reverse_charge';

export const VAT_TREATMENT: ConfiguredVatTreatment = 'configuration_required';
export const VAT_TREATMENT_CONFIGURED = false;
/** Only meaningful once a treatment is configured and it is a rated one. */
export const VAT_RATE_PCT_PLACEHOLDER = 20;

