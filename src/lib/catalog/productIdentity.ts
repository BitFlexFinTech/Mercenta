/**
 * §PHASE 10 — THE PRODUCT IDENTITY LAYER — the ONE owner of the rules.
 *
 * The acquisition unit is: BRAND + ASIN + SOURCE MARKETPLACE (handoff §9). An
 * opportunity must be able to say, honestly, HOW a source-market product relates
 * to the UK one — `exact` · `probable` · `related` · `none` · `unknown` — and it
 * must never invent an identifier or guess a relationship it cannot establish.
 *
 * WHAT THIS OWNS (and nothing else owns):
 *   · IDENTIFIER CLASSIFICATION — a raw token is a channel identifier (ASIN) or
 *     a barcode (GTIN-8/12/13/14), or it is REFUSED. The channel identifier
 *     shape is NOT re-declared here: it is read from the canonical owner
 *     (`src/lib/catalog/asin.ts`), so the two can never drift.
 *   · THE GS1 CHECK DIGIT — the published modulo-10 rule. A barcode whose check
 *     digit does not match is REFUSED, never accepted as "close enough".
 *   · NORMALISED IDENTITY — brand · model · product name reduced to the SAME
 *     canonical text key the rest of the platform uses (`normalizeBrandKey`).
 *   · THE MATCH RELATIONSHIP — derived from STRONG identity (a shared barcode or
 *     channel identifier, or an identical normalised identity) first, then from
 *     the brand/model relationship, and ONLY then from a stated observation. It
 *     FAILS CLOSED to `unknown` when there is nothing to compare.
 *
 * WHAT IT REFUSES TO DO
 * ---------------------
 * - It never invents an identifier, and never accepts a malformed one.
 * - It never promotes a guess to a match: with insufficient evidence the answer
 *   is `unknown`, not `exact`.
 * - It is PURE and DETERMINISTIC: no clock, no randomness, no network, no AI.
 *
 * HONEST BASIS (`unknown` is a real answer): the platform can verify an
 * identifier's SHAPE and CHECK DIGIT, never that it EXISTS on the channel. An
 * `exact` relationship therefore means "the identities we hold agree", never
 * "the channel confirmed it".
 */
import { isAsinShape, normaliseAsinInput } from '@/lib/catalog/asin';
import { normalizeBrandKey } from '@/lib/intelligence/prospectPipeline';
import type { ProductOpportunity } from '@/types';

/** The declared relationship vocabulary — the SAME enum the canonical entity uses. */
export type MatchRelationship = ProductOpportunity['matchRelationship'];

/* ── Identity vocabulary (single source for the rules) ───────────────────── */

/** A barcode is one of exactly four GTIN lengths. */
export const GTIN_LENGTHS = [8, 12, 13, 14] as const;
export type GtinLength = (typeof GTIN_LENGTHS)[number];

/** What a raw identifier turned out to be. */
export type IdentifierKind = 'asin' | 'gtin8' | 'gtin12' | 'gtin13' | 'gtin14';

/** The refusals this owner states — never a silent coercion. */
export const PRODUCT_IDENTITY_REFUSALS = {
  empty: 'IDENTIFIER_EMPTY — an empty value carries no identity.',
  barcodeNotGtin:
    'IDENTIFIER_NOT_A_GTIN — a barcode carries 8, 12, 13 or 14 digits; that length is not one of them.',
  barcodeBadCheckDigit:
    'IDENTIFIER_BAD_CHECK_DIGIT — the barcode’s GS1 check digit does not match its payload.',
  unrecognised:
    'IDENTIFIER_UNRECOGNISED — the value matches neither a channel identifier nor a barcode.',
} as const;

/**
 * The rules, stated WHERE identifiers are handled so the preconditions cannot be
 * forgotten. Pinned by the gate.
 */
export const PRODUCT_IDENTITY_RULES: readonly string[] = [
  'The channel identifier shape is read from the canonical ASIN owner — never re-declared.',
  'A barcode is accepted only when its GS1 check digit matches; otherwise it is refused.',
  'Digits are read as a barcode only; a channel identifier must carry at least one letter.',
  'The match relationship uses strong identity first, brand/model second, a stated observation third.',
  'With nothing to compare against, the relationship is `unknown` — never `exact`, never a guess.',
] as const;

/**
 * §GS1 — the published modulo-10 check digit.
 *
 * The check digit is the last character. Working from the digit immediately
 * left of it, weights alternate 3, 1, 3, 1 …; the check digit is
 * `(10 − sum mod 10) mod 10`. This is the same rule for every GTIN length.
 */
export function isValidGs1CheckDigit(digits: string): boolean {
  if (!/^\d+$/.test(digits)) return false;
  if (digits.length < 2) return false;
  const payload = digits.slice(0, -1);
  const check = Number(digits.slice(-1));
  let sum = 0;
  let weight = 3;
  for (let i = payload.length - 1; i >= 0; i -= 1) {
    sum += Number(payload[i]) * weight;
    weight = weight === 3 ? 1 : 3;
  }
  return (10 - (sum % 10)) % 10 === check;
}

/** TRUE only for one of the four declared GTIN lengths. */
export function isGtinLength(length: number): length is GtinLength {
  return (GTIN_LENGTHS as readonly number[]).includes(length);
}

/** The kind a barcode of this length is. */
export function gtinKindFor(length: GtinLength): IdentifierKind {
  return `gtin${length}` as IdentifierKind;
}


/* ── Classification ──────────────────────────────────────────────────────── */

/** The result of reading ONE raw identifier. */
export type ClassifiedIdentifier =
  | { ok: true; kind: IdentifierKind; value: string }
  | { ok: false; kind: 'unknown'; value: string; error: string };

/**
 * Read ONE raw token.
 *
 * DETERMINISTIC and FAIL CLOSED. An all-digit token is a BARCODE candidate only
 * (a channel identifier always carries at least one letter, so a bare number can
 * never be mistaken for one); anything else must have the channel identifier
 * shape, which is read from the canonical ASIN owner.
 */
export function classifyIdentifier(raw: string): ClassifiedIdentifier {
  const value = (raw ?? '').trim();
  if (!value) return { ok: false, kind: 'unknown', value, error: PRODUCT_IDENTITY_REFUSALS.empty };

  if (/^\d+$/.test(value)) {
    if (!isGtinLength(value.length)) {
      return { ok: false, kind: 'unknown', value, error: PRODUCT_IDENTITY_REFUSALS.barcodeNotGtin };
    }
    if (!isValidGs1CheckDigit(value)) {
      return {
        ok: false,
        kind: 'unknown',
        value,
        error: PRODUCT_IDENTITY_REFUSALS.barcodeBadCheckDigit,
      };
    }
    return { ok: true, kind: gtinKindFor(value.length), value };
  }

  const asin = normaliseAsinInput(value);
  if (isAsinShape(asin)) return { ok: true, kind: 'asin', value: asin };

  return { ok: false, kind: 'unknown', value, error: PRODUCT_IDENTITY_REFUSALS.unrecognised };
}

/** The identifiers a product carries, reduced to the canonical fields. */
export interface ParsedIdentifiers {
  /** Every accepted identifier, in first-seen order, de-duplicated. */
  accepted: { kind: IdentifierKind; value: string }[];
  /** Every refused value with the stated reason (the raw value is preserved). */
  refused: { value: string; error: string }[];
  /** The channel identifier, or `null`. */
  sourceAsin: string | null;
  /** The first barcode of any length, or `null`. */
  gtin: string | null;
  /** The first GTIN-13 (EAN-13), or `null`. */
  ean: string | null;
  /** The first GTIN-12 (UPC-A), or `null`. */
  upc: string | null;
}

/** Read a list of raw identifiers into the canonical fields. Pure. */
export function parseProductIdentifiers(rawValues: readonly string[]): ParsedIdentifiers {
  const accepted: { kind: IdentifierKind; value: string }[] = [];
  const refused: { value: string; error: string }[] = [];
  const seen = new Set<string>();
  let sourceAsin: string | null = null;
  let gtin: string | null = null;
  let ean: string | null = null;
  let upc: string | null = null;

  for (const raw of rawValues ?? []) {
    const result = classifyIdentifier(raw);
    if (!result.ok) {
      refused.push({ value: result.value, error: result.error });
      continue;
    }
    if (seen.has(result.value)) continue;
    seen.add(result.value);
    accepted.push({ kind: result.kind, value: result.value });

    if (result.kind === 'asin') {
      if (sourceAsin === null) sourceAsin = result.value;
      continue;
    }
    if (gtin === null) gtin = result.value;
    if (result.kind === 'gtin13' && ean === null) ean = result.value;
    if (result.kind === 'gtin12' && upc === null) upc = result.value;
  }

  return { accepted, refused, sourceAsin, gtin, ean, upc };
}

/* ── Normalised identity ─────────────────────────────────────────────────── */

/** The identity a source-market or UK product carries. */
export interface ProductIdentityInput {
  brand?: string | null;
  model?: string | null;
  productName?: string | null;
  identifiers?: readonly string[];
}

/** The canonical, comparable form of an identity. */
export interface NormalizedProductIdentity {
  /** Canonical brand key — the SAME key the rest of the platform uses. */
  brandKey: string;
  modelKey: string;
  nameKey: string;
  /** The composite text key (`brandKey|modelKey|nameKey`); empty parts are dropped. */
  key: string;
  identifiers: ParsedIdentifiers;
}

/** Reduce an identity to its canonical, comparable form. Pure. */
export function normalizeProductIdentity(input: ProductIdentityInput): NormalizedProductIdentity {
  const brandKey = normalizeBrandKey(input.brand ?? '');
  const modelKey = normalizeBrandKey(input.model ?? '');
  const nameKey = normalizeBrandKey(input.productName ?? '');
  const key = [brandKey, modelKey, nameKey].filter(Boolean).join('|');
  return {
    brandKey,
    modelKey,
    nameKey,
    key,
    identifiers: parseProductIdentifiers(input.identifiers ?? []),
  };
}

/** The STRONG identity tokens of a normalised identity (barcode + channel id). */
function strongTokens(id: NormalizedProductIdentity): Set<string> {
  const tokens = new Set<string>();
  const { sourceAsin, gtin, ean, upc } = id.identifiers;
  for (const v of [sourceAsin, gtin, ean, upc]) if (v) tokens.add(v);
  return tokens;
}

/* ── The match relationship ──────────────────────────────────────────────── */

/** A stated UK observation (the pre-audit fixture's honest, INFERENCE-basis input). */
export interface UkListingObservation {
  exactListed?: boolean;
  equivalentListed?: boolean;
}

/**
 * Derive HOW a source identity relates to the UK identity — the ONE rule.
 *
 * Order (strongest first, then fail-closed):
 *   1. a shared STRONG token (barcode or channel identifier)          → `exact`
 *   2. an identical normalised composite identity                     → `exact`
 *   3. the same brand AND the same model                              → `probable`
 *   4. the same brand, a differing (or absent) model                  → `related`
 *   5. both identities carry a key but share nothing                  → `none`
 *   6. otherwise, a STATED observation, when one is supplied
 *   7. otherwise                                                      → `unknown` (never a guess)
 */
export function deriveMatchRelationship(input: {
  source: ProductIdentityInput;
  uk?: ProductIdentityInput | null;
  observation?: UkListingObservation | null;
}): MatchRelationship {
  const source = normalizeProductIdentity(input.source);

  if (input.uk) {
    const uk = normalizeProductIdentity(input.uk);

    const sourceStrong = strongTokens(source);
    const ukStrong = strongTokens(uk);
    for (const token of sourceStrong) if (ukStrong.has(token)) return 'exact';

    if (source.key && uk.key && source.key === uk.key) return 'exact';

    if (source.brandKey && source.brandKey === uk.brandKey) {
      if (source.modelKey && uk.modelKey && source.modelKey === uk.modelKey) return 'probable';
      return 'related';
    }

    if (source.key && uk.key) return 'none';
  }

  if (input.observation) {
    if (input.observation.exactListed) return 'exact';
    if (input.observation.equivalentListed) return 'probable';
    return 'none';
  }

  return 'unknown';
}

