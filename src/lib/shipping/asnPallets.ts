/**
 * §BATCH 2n (`AV-016`) — THE ONE OWNER of the ASN's PALLET-LEVEL STRUCTURE.
 *
 * WHY THIS MODULE EXISTS (the gap it closes)
 * ------------------------------------------
 * The channel documents that the shipment confirmation (the ASN) it receives
 * carries *“carton + pallet structures”* (source `S9`, register `AV-016`). From
 * P6 the platform modelled the CARTON structure — one `AsnCarton` per carton,
 * each with its own SSCC container identifier — but a carton was NEVER assigned
 * to a pallet, so the ASN had no pallet structure at all. The only pallet figure
 * anywhere was `ShippingEstimateInput.palletCount`, a loose count used for
 * freight costing — a different concept that is deliberately not reused here.
 *
 * This owner assigns every carton to a pallet, deterministically, and gives each
 * pallet its own SSCC container identifier (a pallet is a GS1 logistic unit
 * exactly as a carton is). The result is carried on the ASN record
 * (`AsnDetail.pallets`) so the grouping reaches the channel confirmation and
 * every document.
 *
 * WHAT IT IS — AND IS NOT
 * -----------------------
 * The stacking capacity comes from ONE declaration
 * (`src/config/shipping.ts → ASN_PALLET_PROFILE`), which is **Mercenta's own
 * declared packing model**, NOT a retail-channel rule: no channel source reached
 * states a cartons-per-pallet figure. The statement this owner returns says so,
 * so no surface can present Mercenta's assumption as a channel requirement.
 *
 * DETERMINISM / PURITY
 * --------------------
 * Pure — no clock, no randomness, no network, no store access. Cartons are taken
 * in loading order and chunked by the declared capacity, so the same consignment
 * always produces the same pallet structure and a reprint is identical. SSCC
 * generation lives in its own ONE owner (`src/lib/documents/sscc.ts`); this
 * module generates none of its own.
 */
import type { AsnDetail, AsnPallet } from '@/data/api';
import { ASN_PALLET_PROFILE } from '@/config/shipping';
import { ssccForPallet } from '@/lib/documents/sscc';

/** Whose model the stacking capacity is — never the retail channel. */
export const ASN_PALLET_GROUPING_OWNER = ASN_PALLET_PROFILE.owner;

/**
 * The declared capacity must be a positive integer. A zero/negative/fractional
 * capacity would silently produce empty or impossible pallets, so it FAILS
 * CLOSED at module load rather than shipping a broken structure.
 */
if (
  !Number.isInteger(ASN_PALLET_PROFILE.cartonsPerPallet) ||
  ASN_PALLET_PROFILE.cartonsPerPallet < 1
) {
  throw new Error(
    `[asnPallets] ASN_PALLET_PROFILE.cartonsPerPallet must be a positive integer, received ` +
      `${ASN_PALLET_PROFILE.cartonsPerPallet}. A pallet structure cannot be derived from it.`
  );
}

/**
 * Assign a consignment's cartons to pallets, deterministically.
 *
 * Cartons are chunked in LOADING ORDER by the declared capacity — the last pallet
 * may be partly loaded (a stated, honest fact, not hidden). Each pallet receives
 * its own SSCC-18 and its gross weight (the sum of its cartons'), and the 1-based
 * carton numbers it carries.
 *
 * `cartonsPerPallet` may be supplied explicitly (e.g. a brand's recorded pallet
 * profile); when it is not, the declared Mercenta model is used. An empty carton
 * list yields an empty structure — never a fabricated pallet.
 */
export function palletsForCartons(
  poNumber: string,
  cartons: ReadonlyArray<AsnDetail['cartons'][number]>,
  cartonsPerPallet: number = ASN_PALLET_PROFILE.cartonsPerPallet
): AsnPallet[] {
  if (!Number.isInteger(cartonsPerPallet) || cartonsPerPallet < 1) {
    throw new Error(
      `[asnPallets] a pallet needs a positive integer carton capacity, received ${cartonsPerPallet}.`
    );
  }
  const total = cartons.length;
  const palletCount = Math.ceil(total / cartonsPerPallet);
  const pallets: AsnPallet[] = [];
  for (let index = 0; index < palletCount; index += 1) {
    const slice = cartons.slice(index * cartonsPerPallet, (index + 1) * cartonsPerPallet);
    pallets.push({
      pallet: index + 1,
      of: palletCount,
      sscc: ssccForPallet(poNumber, index + 1),
      /** 1-based carton numbers, in loading order. */
      cartons: slice.map((_, offset) => index * cartonsPerPallet + offset + 1),
      weightKg: slice.reduce((sum, carton) => sum + carton.weightKg, 0),
    });
  }
  return pallets;
}

export interface AsnPalletStructure {
  /** Every pallet the consignment is loaded onto (empty when no cartons are declared). */
  pallets: AsnPallet[];
  /** Total cartons across every pallet. */
  cartonCount: number;
  /** How many cartons one pallet carries — Mercenta's declared model. */
  cartonsPerPallet: number;
  /** Whose model it is (never the retail channel). */
  owner: string;
  /** The stated basis, so no surface attributes it to the channel. */
  basis: string;
  /** The ONE operator-facing sentence describing the structure. ALWAYS present. */
  statement: string;
}

/**
 * The pallet structure plus its stated basis — what a surface renders so the
 * grouping is never shown without saying whose model produced it.
 */
export function describeAsnPalletStructure(
  poNumber: string,
  cartons: ReadonlyArray<AsnDetail['cartons'][number]>,
  cartonsPerPallet: number = ASN_PALLET_PROFILE.cartonsPerPallet
): AsnPalletStructure {
  const pallets = palletsForCartons(poNumber, cartons, cartonsPerPallet);
  const cartonCount = cartons.length;
  const statement =
    pallets.length === 0
      ? `No carton structure is on the record yet, so no pallet structure can be derived. ${ASN_PALLET_PROFILE.basis}`
      : `${cartonCount} carton${cartonCount === 1 ? '' : 's'} on ${pallets.length} pallet${
          pallets.length === 1 ? '' : 's'
        } (${cartonsPerPallet} cartons per pallet). ${ASN_PALLET_PROFILE.basis} Each pallet carries its own SSCC container identifier.`;
  return {
    pallets,
    cartonCount,
    cartonsPerPallet,
    owner: ASN_PALLET_PROFILE.owner,
    basis: ASN_PALLET_PROFILE.basis,
    statement,
  };
}
