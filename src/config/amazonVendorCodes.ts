/**
 * §AMAZON VENDOR CODES → CATEGORY — the SINGLE SOURCE OF TRUTH.
 *
 * WHAT THIS IS
 * ------------
 * The vendor codes Mercenta's Amazon Vendor Central account holds, and the
 * category each code is shown against IN AMAZON VENDOR CENTRAL. Provided by the
 * Founder on 2026-10-02 (owner decision). This file exists so that ANY session
 * answers "which category is <code>?" by reading the project — never by asking
 * the Founder again, and never by looking it up in a chat transcript.
 *
 * THE RULES (Founder instruction, 2026-10-02)
 * -------------------------------------------
 *  1. The `category` string is stored VERBATIM, exactly as Amazon Vendor Central
 *     shows it. It is NOT normalised to, reworded from, or merged with
 *     `APPROVED_CATEGORIES` (`src/types.ts`). Two codes carry a COMPOUND label
 *     ("Personal Computers Office", "Home & Kitchen") and one is a shorthand
 *     ("HPCA"); the Founder's instruction is to keep every string exactly as
 *     Amazon writes it. Do not "tidy" it.
 *  2. A code whose category Amazon has NOT yet been confirmed carries
 *     `category: null`, `categoryConfirmed: false` and a `note`. LINKING a
 *     confirmed category to those codes is BLOCKED until the Founder confirms
 *     with Amazon (owner decision, 2026-10-02). NEVER guess which category a
 *     blank code is — that is the exact defect this rule prevents.
 */

export interface AmazonVendorCode {
  /** The Vendor Central vendor code, verbatim. */
  code: string;
  /**
   * The category AS AMAZON VENDOR CENTRAL SHOWS IT, verbatim — or `null` when the
   * Founder has not yet confirmed this code's category with Amazon.
   */
  category: string | null;
  /** False ONLY while the Founder has not yet confirmed the category with Amazon. */
  categoryConfirmed: boolean;
  /** Present when the category is unconfirmed — states the exact blocker. */
  note?: string;
}

const UNCONFIRMED_NOTE =
  'To Be Confirmed — awaiting the Founder’s confirmation with the retail channel before a category is linked to this code. Do not guess.';

/**
 * The registry. Order is the Founder's list as provided (2026-10-02); it is
 * preserved so the record reads in the order it was given.
 */
export const AMAZON_VENDOR_CODES: readonly AmazonVendorCode[] = [
  { code: '310JT', category: 'Baby', categoryConfirmed: true },
  { code: '3X0JM', category: 'Kitchen', categoryConfirmed: true },
  { code: '7HGME', category: 'Office', categoryConfirmed: true },
  { code: 'AP4KM', category: 'Grocery', categoryConfirmed: true },
  { code: 'RWOOY', category: 'Personal Computers Office', categoryConfirmed: true },
  { code: 'SURX3', category: 'Home & Kitchen', categoryConfirmed: true },
  { code: 'SV5QE', category: null, categoryConfirmed: false, note: UNCONFIRMED_NOTE },
  { code: 'SV5UD', category: 'HPCA (Health & Personal Care', categoryConfirmed: true },
  { code: 'SV76D', category: null, categoryConfirmed: false, note: UNCONFIRMED_NOTE },
  { code: 'X10KV', category: 'Automotive', categoryConfirmed: true },
] as const;

/**
 * The Amazon Vendor Central category for a code, or `null` when the code is
 * unknown OR its category is not yet confirmed. `null` is the honest answer in
 * both cases — never a guessed category.
 */
export function categoryForVendorCode(code: string): string | null {
  const entry = AMAZON_VENDOR_CODES.find((v) => v.code === code);
  return entry && entry.categoryConfirmed ? entry.category : null;
}

/** The raw registry entry for a code (or undefined when the code is unknown). */
export function vendorCodeEntry(code: string): AmazonVendorCode | undefined {
  return AMAZON_VENDOR_CODES.find((v) => v.code === code);
}

/** True ONLY when the code exists AND its category is confirmed (never for a blank code). */
export function isVendorCodeCategoryConfirmed(code: string): boolean {
  return AMAZON_VENDOR_CODES.some((v) => v.code === code && v.categoryConfirmed);
}
