/**
 * §P8 — THE CHANNEL IDENTIFIER (ASIN) — the ONE owner of the rule.
 *
 * Programme decision 10, verbatim:
 *
 *   "Brand may add it if the product already exists on Amazon; otherwise
 *    Mercenta populates it when Amazon accepts the product in the catalogue (in
 *    simulation: a clearly-simulated placeholder — the code never invents a
 *    real-looking ASIN)."
 *
 * What this module therefore refuses, and why:
 *
 * - **A placeholder from a brand.** `SIM-ASIN-…` means "no real identifier
 *   exists yet". A brand typing one would be asserting an identifier it does not
 *   have, so it is refused with `ASIN_PLACEHOLDER`.
 * - **A declaration without the existing-listing confirmation.** The brand may
 *   only supply an ASIN for a product that is ALREADY on the channel; without
 *   that confirmation the request fails closed with
 *   `ASIN_REQUIRES_EXISTING_LISTING` and the Mercenta channel path is used
 *   instead.
 * - **Anything that is not the channel's identifier shape.** Ten alphanumeric
 *   characters (`ASIN_SHAPE`). The platform validates the SHAPE only — it cannot
 *   verify existence, so it records the SOURCE and never claims verification.
 * - **A silent downgrade.** A channel-assigned identifier is the product's
 *   identity; a later brand declaration cannot overwrite it
 *   (`ASIN_AUTHORITY_ORDER`) — that needs the attributed admin override.
 *
 * HONEST BASIS (never overstated): the register records **no public Vendor
 * catalogue/item API** (`AV-035`, source S14), so there is no documented Amazon
 * API the platform could call to fetch an ASIN. The identifier is either the
 * brand's own declaration or the channel's response through the existing
 * mock-first SP-API seam — never a value Mercenta made up.
 *
 * The generated placeholder is deliberately UNMISTAKABLE (`SIM-ASIN-…`): it can
 * never be mistaken for the 10-character real shape, which is the whole point.
 *
 * Zero imports beyond types; zero side effects.
 */
import type { AsinSource, AsinState } from '@/types';

/** The channel's identifier length. */
export const ASIN_LENGTH = 10;

/** The identifier SHAPE (10 alphanumeric characters). */
export const ASIN_PATTERN = /^[A-Z0-9]{10}$/;

/**
 * The unmistakable simulation prefix. It is intentionally NOT a valid shape, so
 * a placeholder can never be confused with a real identifier.
 */
export const ASIN_SIMULATION_PREFIX = 'SIM-ASIN-';

/** The refusal codes the domain returns (stated, never silently coerced). */
export const ASIN_REFUSALS = {
  shape: 'ASIN_SHAPE — a channel identifier is 10 alphanumeric characters.',
  placeholder:
    'ASIN_PLACEHOLDER — a simulated placeholder cannot be supplied as a real identifier.',
  requiresExistingListing:
    'ASIN_REQUIRES_EXISTING_LISTING — a brand may supply an identifier only for a product that already exists on the channel.',
  authorityOrder:
    'ASIN_AUTHORITY_ORDER — the channel-assigned identifier cannot be replaced by a brand declaration.',
  reasonRequired:
    'ASIN_REASON_REQUIRED — an override of the channel identifier requires a stated reason.',
} as const;

/**
 * The documented rule, stated WHERE the identifier is handled so the
 * precondition cannot be forgotten (the P7 `INVOICE_NUMBER_RULES` pattern).
 */
export const ASIN_RULES: readonly string[] = [
  'A brand may supply the identifier itself only for a product that already exists on the channel.',
  'Otherwise Mercenta populates it when the channel accepts the product into the catalogue.',
  'Until a real identifier exists the value is a clearly-simulated SIM-ASIN-… placeholder — never a plausible-looking identifier.',
  'A channel-assigned identifier is the product identity; replacing it requires an attributed admin override with a stated reason.',
];

/** Where the rule comes from — quoted on the surfaces that show the identifier. */
export const ASIN_RULE_SOURCE =
  'Programme decision 10 · register AV-035 (no public Vendor catalogue/item API)';

/** TRUE when a value has the channel's identifier shape. */
export function isAsinShape(value: string | undefined | null): boolean {
  return typeof value === 'string' && ASIN_PATTERN.test(value.trim().toUpperCase());
}

/** TRUE when a value is the unmistakable simulation placeholder. */
export function isSimulatedAsin(value: string | undefined | null): boolean {
  return typeof value === 'string' && value.trim().toUpperCase().startsWith(ASIN_SIMULATION_PREFIX);
}

/** Normalise what a human typed (trim + upper case) — never invents characters. */
export function normaliseAsinInput(value: string): string {
  return value.trim().toUpperCase();
}

/**
 * The clearly-simulated placeholder for a product.
 *
 * DETERMINISTIC from the SKU (a re-run produces the same value) and
 * deliberately not a valid shape, so it can never be read as a real identifier.
 */
export function simulatedAsinFor(sku: string): string {
  const safe = sku.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return `${ASIN_SIMULATION_PREFIX}${safe || 'UNKNOWN'}`;
}

/** A validated identifier, or the refusal to state. */
export type AsinValidation =
  | { ok: true; asin: string }
  | { ok: false; error: string };

/**
 * Validate a BRAND-supplied identifier against decision 10.
 *
 * `productExistsOnChannel` is the brand's own required confirmation that the
 * listing already exists — without it the request fails closed, because the
 * Mercenta channel path (not the brand) owns the identifier in that case.
 */
export function validateBrandAsin(
  rawValue: string,
  productExistsOnChannel: boolean
): AsinValidation {
  const value = normaliseAsinInput(rawValue ?? '');
  if (!productExistsOnChannel) return { ok: false, error: ASIN_REFUSALS.requiresExistingListing };
  if (!value) return { ok: false, error: ASIN_REFUSALS.shape };
  if (isSimulatedAsin(value)) return { ok: false, error: ASIN_REFUSALS.placeholder };
  if (!isAsinShape(value)) return { ok: false, error: ASIN_REFUSALS.shape };
  return { ok: true, asin: value };
}

/** A channel identifier the seam returned — accepted only in a legitimate shape. */
export function validateChannelAsin(rawValue: string): AsinValidation {
  const value = normaliseAsinInput(rawValue ?? '');
  if (!value) return { ok: false, error: ASIN_REFUSALS.shape };
  // The seam may legitimately return its own simulated placeholder while the
  // provider is mocked; anything else must be the channel's real shape.
  if (isSimulatedAsin(value)) return { ok: true, asin: value };
  if (!isAsinShape(value)) return { ok: false, error: ASIN_REFUSALS.shape };
  return { ok: true, asin: value };
}

/**
 * May this identifier be replaced by a later write from `source`?
 *
 * A channel-assigned identifier outranks a brand declaration, so a brand cannot
 * quietly downgrade it. An admin override is a separate, attributed path.
 */
export function canReplaceIdentifier(
  existing: { asin: string; source: AsinSource } | undefined,
  incoming: AsinSource
): boolean {
  if (!existing) return true;
  if (existing.source === 'channel_assigned' && incoming === 'brand_declared') return false;
  return true;
}

/** How far the product has got towards having an identifier (derived). */
export function deriveAsinState(
  identifier: { asin: string } | undefined,
  hasSubmissionAwaitingResult: boolean
): AsinState {
  if (identifier) return 'assigned';
  return hasSubmissionAwaitingResult ? 'pending_channel' : 'none';
}

/** Human labels for the derived state (single source for UI copy). */
export const ASIN_STATE_LABELS: Record<AsinState, string> = {
  none: 'No identifier yet',
  pending_channel: 'Pending the channel’s acceptance',
  assigned: 'Identifier recorded',
};

/** Human labels for the source (single source for UI copy). */
export const ASIN_SOURCE_LABELS: Record<AsinSource, string> = {
  brand_declared: 'Supplied by the brand (listing already on the channel)',
  channel_assigned: 'Populated by Mercenta from the channel’s acceptance',
};
