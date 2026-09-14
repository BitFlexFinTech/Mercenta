/**
 * §Canonical model §9 — THE CANONICAL VAT CONFIGURATION + CALCULATION LAYER.
 *
 * VAT treatment is a BUSINESS/ACCOUNTING decision, not a UI detail. This module
 * is the ONE place a VAT amount is derived from, so no other module ever
 * hardcodes a rate into unrelated logic.
 *
 * TWO DISTINCT FACTS, never collapsed:
 *   • the PRODUCTION treatment — `src/config/commercial.ts → VAT_TREATMENT`,
 *     which stays `configuration_required` until the real decision is taken, and
 *     therefore computes NO tax figure; and
 *   • the DEMO ILLUSTRATION — `DEMO_VAT_ILLUSTRATION` below, which uses the
 *     standard UK VAT rate (20%) so the investor demo can show real arithmetic.
 *     It is labelled as an illustration everywhere it is used and is NEVER
 *     presented as a production tax determination.
 *
 * The layer supports every treatment the business needs to express: standard,
 * zero-rated, exempt, reverse charge, and explicitly unconfigured. Net / VAT /
 * gross are always returned together so a caller can never show a gross figure
 * without the VAT that composed it.
 */

/** What the platform can express. `configuration_required` = no decision yet. */
export type VatTreatment =
  | 'standard'
  | 'zero_rated'
  | 'exempt'
  | 'reverse_charge'
  | 'configuration_required';

/** The standard UK VAT rate (§9). A rate, not a conclusion about any product. */
export const UK_STANDARD_VAT_RATE_PCT = 20;

export const VAT_TREATMENT_LABELS: Record<VatTreatment, string> = {
  standard: 'Standard-rated (UK standard rate)',
  zero_rated: 'Zero-rated',
  exempt: 'Exempt',
  reverse_charge: 'Reverse charge',
  configuration_required: 'Not configured — no tax figure is computed',
};

/** Only a RATED treatment produces a VAT amount. Everything else is explicit. */
export function isRatedTreatment(treatment: VatTreatment): boolean {
  return treatment === 'standard';
}

/** A treatment that is decided (anything except the unconfigured state). */
export function isConfiguredTreatment(treatment: VatTreatment): boolean {
  return treatment !== 'configuration_required';
}

export interface VatBreakdown {
  /** The amount excluding VAT. */
  netGbp: number;
  /** The VAT amount, or 0 for a non-rated treatment (see `configured`). */
  vatGbp: number;
  /** net + vat. */
  grossGbp: number;
  treatment: VatTreatment;
  /** Present only for a rated treatment. */
  ratePct?: number;
  /** False when no treatment has been decided — `vatGbp` is then NOT a tax figure. */
  configured: boolean;
  /** Human-readable statement of what the numbers mean. */
  basis: string;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * The canonical VAT calculation. Returns net / VAT / gross TOGETHER so a caller
 * can never present a gross figure without the arithmetic behind it.
 *
 * An unconfigured or non-rated treatment returns `vatGbp: 0` with
 * `configured`/`basis` explaining precisely why — never a silent zero that looks
 * like a determination.
 */
export function computeVat(input: {
  netGbp: number;
  treatment: VatTreatment;
  /** Required for a rated treatment; ignored otherwise. */
  ratePct?: number;
}): VatBreakdown {
  const netGbp = round2(input.netGbp);

  if (input.treatment === 'configuration_required') {
    return {
      netGbp,
      vatGbp: 0,
      grossGbp: netGbp,
      treatment: 'configuration_required',
      configured: false,
      basis:
        'No VAT treatment has been decided for this supply, so no tax amount is computed. The net amount is shown unchanged and is NOT a VAT-inclusive or VAT-exclusive determination.',
    };
  }

  if (!isRatedTreatment(input.treatment)) {
    return {
      netGbp,
      vatGbp: 0,
      grossGbp: netGbp,
      treatment: input.treatment,
      ratePct: 0,
      configured: true,
      basis: `Supplied ${VAT_TREATMENT_LABELS[
        input.treatment
      ].toLowerCase()} — no VAT is charged on this supply, so gross equals net.`,
    };
  }

  const ratePct = input.ratePct ?? UK_STANDARD_VAT_RATE_PCT;
  const vatGbp = round2((netGbp * ratePct) / 100);
  return {
    netGbp,
    vatGbp,
    grossGbp: round2(netGbp + vatGbp),
    treatment: 'standard',
    ratePct,
    configured: true,
    basis: `Standard-rated at ${ratePct}% — net £${netGbp.toFixed(
      2
    )} + VAT £${vatGbp.toFixed(2)} = gross £${round2(netGbp + vatGbp).toFixed(2)}.`,
  };
}

/**
 * §9 — the DEMO ILLUSTRATION. Standard UK VAT 20%, used ONLY to show real
 * arithmetic in the investor demo. It is deliberately a separate constant from
 * the production treatment so the demo can never be mistaken for a production
 * tax determination.
 */
export const DEMO_VAT_ILLUSTRATION: {
  treatment: VatTreatment;
  ratePct: number;
  label: string;
  disclaimer: string;
} = {
  treatment: 'standard',
  ratePct: UK_STANDARD_VAT_RATE_PCT,
  label: 'Illustrative example — standard UK VAT (20%)',
  disclaimer:
    'Illustration only. The production VAT treatment of any supply is an external accounting decision and is NOT configured; no real product or service is asserted to be standard-rated.',
};

/** Convenience: the demo illustration applied to an amount. */
export function computeIllustrativeVatGbp(netGbp: number): VatBreakdown {
  return computeVat({
    netGbp,
    treatment: DEMO_VAT_ILLUSTRATION.treatment,
    ratePct: DEMO_VAT_ILLUSTRATION.ratePct,
  });
}

/**
 * §9 — CONFIGURABLE PRODUCT/SERVICE TREATMENT. A configured per-item decision
 * wins; anything unknown resolves to `configuration_required` (fail-closed —
 * the platform never assumes standard VAT for an unclassified supply).
 */
export const CONFIGURED_VAT_TREATMENT_BY_KEY: Record<string, VatTreatment> = {};

export function resolveVatTreatmentForItem(key?: string | null): VatTreatment {
  if (key && CONFIGURED_VAT_TREATMENT_BY_KEY[key] !== undefined) {
    return CONFIGURED_VAT_TREATMENT_BY_KEY[key];
  }
  return 'configuration_required';
}
