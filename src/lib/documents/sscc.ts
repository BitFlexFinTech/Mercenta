/**
 * §P6 — THE SSCC-18 CARTON IDENTIFIER (the ONE owner).
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The ASN the retail channel receives carries a **container identifier per
 * carton** — `cartons[].cartonIdentifiers[{ containerIdentificationType: "SSCC", … }]`
 * (`docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md` §3, register: SSCC
 * carton labels are **vendor-generated**; truth-validation §5.7 records that the
 * ASN carries "**SSCC** container identifiers, with carton/pallet structure").
 * Mercenta is the vendor, so Mercenta GENERATES the identifiers. Before P6 the
 * platform mentioned SSCC once, in guidance copy, and generated none.
 *
 * THE PLACEHOLDER RULE (mock-first, unmistakable)
 * -----------------------------------------------
 * A real SSCC-18 begins with a **GS1 company prefix**, which Mercenta holds no
 * licence for in this environment. The prefix is therefore declared HERE, once,
 * as an explicitly UNASSIGNED placeholder:
 *
 *   · the numeric prefix is all zeros — it is not a prefix assigned to Mercenta;
 *   · `status` says so in machine-readable form (`placeholder_unassigned`);
 *   · every label carries `placeholderLabel` (`XX-PENDING-GS1-LICENCE`) so the
 *     printed artefact can never be mistaken for a licensed identifier;
 *   · activating the real prefix is a CREDENTIAL step only: replace
 *     `SSCC_GS1_PREFIX.value` with the licensed prefix and nothing else changes
 *     — the check digit, the serial derivation and every caller are untouched
 *     (`PRODUCTION_READINESS.md` records it as an active placeholder).
 *
 * DETERMINISM
 * -----------
 * The serial reference is derived from the PO number and the carton index with a
 * pure hash — no clock, no randomness — so the same PO always produces the same
 * carton identifiers, a reprint is byte-identical, and a validator can assert it.
 */

/**
 * The GS1 company prefix the platform generates SSCCs under.
 *
 * `value` is an UNASSIGNED placeholder (all zeros) — see the file header. It is
 * deliberately NOT a plausible-looking licensed prefix.
 */
export const SSCC_GS1_PREFIX = {
  /** The declared prefix. All zeros = unmistakably unassigned. */
  value: '0000000',
  status: 'placeholder_unassigned' as const,
  /** The word carried on every printed carton label. */
  placeholderLabel: 'XX-PENDING-GS1-LICENCE',
  /** The GS1 extension digit (0 = a carton/unit load, the documented default). */
  extensionDigit: '0',
  note:
    'Mercenta holds no GS1 company prefix in this environment, so every SSCC is generated under an unassigned all-zero placeholder prefix and each label states it. Entering the licensed GS1 prefix replaces this value — no other code changes.',
} as const;

/** The number of digits an SSCC-18 always carries. */
export const SSCC_LENGTH = 18;

/**
 * GS1 check digit (mod-10, weights 3/1 from the right) for a base of 17 digits.
 *
 * This is the published GS1 algorithm: the digits of the base are weighted 3, 1,
 * 3, 1 … starting from the RIGHTMOST digit, the sum is taken modulo 10, and the
 * check digit is 10 minus that remainder (0 when the remainder is 0).
 */
export function ssccCheckDigit(base17: string): number {
  const digits = base17.replace(/\D/g, '');
  if (digits.length !== SSCC_LENGTH - 1) {
    throw new Error(`An SSCC check digit needs ${SSCC_LENGTH - 1} base digits, received ${digits.length}.`);
  }
  let sum = 0;
  for (let i = 0; i < digits.length; i += 1) {
    const digit = Number(digits[digits.length - 1 - i]);
    sum += digit * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

/**
 * A deterministic 9-digit serial reference for one carton.
 *
 * FNV-1a over `${poNumber}#${cartonIndex}` — pure, order-independent and stable
 * across processes, so a reprinted label is identical.
 */
function serialReference(poNumber: string, cartonIndex: number): string {
  const input = `${poNumber}#${cartonIndex}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return String(hash % 1_000_000_000).padStart(9, '0');
}

/** Build a complete SSCC-18 from a 9-digit serial reference. */
export function buildSscc18(serial: string): string {
  const serial9 = serial.replace(/\D/g, '').padStart(9, '0').slice(-9);
  const base = `${SSCC_GS1_PREFIX.extensionDigit}${SSCC_GS1_PREFIX.value}${serial9}`;
  return `${base}${ssccCheckDigit(base)}`;
}

/**
 * The SSCC-18 for one carton of one purchase order.
 *
 * `cartonIndex` is 1-based: carton 1 of 3, carton 2 of 3, and so on. The index is
 * part of the hashed input, so two cartons of the same PO never collide and a
 * carton keeps its identifier when the pack is regenerated.
 */
export function ssccForCarton(poNumber: string, cartonIndex: number): string {
  return buildSscc18(serialReference(poNumber, Math.max(1, Math.trunc(cartonIndex))));
}

/** Is this SSCC-18 structurally valid (18 digits + a correct check digit)? */
export function isValidSscc18(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== SSCC_LENGTH || digits !== value) return false;
  return ssccCheckDigit(digits.slice(0, SSCC_LENGTH - 1)) === Number(digits[SSCC_LENGTH - 1]);
}

/** True while the identifier is generated under the unassigned placeholder prefix. */
export function usesPlaceholderPrefix(value: string): boolean {
  return value.startsWith(`${SSCC_GS1_PREFIX.extensionDigit}${SSCC_GS1_PREFIX.value}`);
}

/** The sentence every carton label carries, so the artefact states its own status. */
export const SSCC_PLACEHOLDER_NOTICE = `Generated under the unassigned placeholder GS1 prefix ${SSCC_GS1_PREFIX.value} (${SSCC_GS1_PREFIX.placeholderLabel}) — not a licensed GS1 identifier. ${SSCC_GS1_PREFIX.note}`;
