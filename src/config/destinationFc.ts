/**
 * §P5 — THE DESTINATION FULFILMENT CENTRE (the ONE owner).
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The platform used to route every consignment to a **Mercenta UK distribution
 * hub** — a hardcoded `destination: 'Mercenta UK Hub'` in the domain creators and
 * a mandatory `mercenta_hub` stage in `STAGE_ORDER`. No retail-channel source
 * requires that, and the same repository declares the direct route (brand
 * facility → the channel's destination) the default one:
 *   - matrix `D09-13` — "the Mercenta Hub is REMOVED as a destination";
 *   - register `AV-026` — "the destination is the PO's shipToParty";
 *   - register `AV-027` — the mandatory hub stage is CONTRADICTED;
 *   - Founder decision `T-4` — the Mercenta Hub is never a mandatory route.
 *
 * THE AUTHORITATIVE SOURCE is the purchase order: the channel declares its
 * ship-to party on the PO, and its id IS the fulfilment-centre code
 * (`shipToPartyId` — Amazon developer docs, register `S5`; `AV-017`). So the
 * destination is read from `PurchaseOrder.shipToParty` and resolved here, once,
 * for the domain and every surface.
 *
 * WHAT THIS MODULE DOES NOT DO
 * ----------------------------
 *  - It never invents a destination. An undeclared ship-to party resolves to
 *    `DESTINATION_NOT_DECLARED` and an unlocatable city resolves to `place: null`
 *    — the map then draws the leg as SCHEMATIC with the reason stated, exactly
 *    like every other unresolvable place in `src/config/logisticsGeo.ts`.
 *  - It keeps no second FC dataset: codes, names, cities and postcodes come from
 *    `DEFAULT_UK_FC_LIST` (`src/types.ts`), and coordinates from
 *    `logisticsGeo.resolveGeoPlace` — the canonical FC-city owner.
 */

import { DEFAULT_UK_FC_LIST, type AmazonFulfilmentCentre, type ShipToParty } from '@/types';
import { DESTINATION_NOT_DECLARED, resolveGeoPlace, type GeoPlace } from '@/config/logisticsGeo';

/**
 * The destination string recorded when a PO genuinely declares no ship-to party.
 * Declared once in `logisticsGeo.ts` (the geography module owns place strings) and
 * re-exported here so callers have the destination contract in ONE import; it is
 * deliberately unresolvable, so the map shows a schematic leg and says why — a
 * Mercenta-chosen site is never substituted for a missing channel fact.
 */
export { DESTINATION_NOT_DECLARED };

/** The unmistakable placeholder used only if the canonical FC directory is empty. */
export const DESTINATION_FALLBACK_PARTY_ID = 'XX-DESTINATION-UNDECLARED';

export interface DestinationFc {
  /** The channel-assigned party id — the FC code. */
  partyId: string;
  /** Display name, always carrying the code (e.g. `Doncaster (LBA1)`). */
  name: string;
  /** The declared city, or null when neither the PO nor the directory states one. */
  city: string | null;
  postcode: string | null;
  /** The coordinate the map plots for this destination — null fails closed. */
  place: GeoPlace | null;
  /** The string a shipment record stores and every surface renders. */
  label: string;
}

/** Look a fulfilment centre up by its channel code. Fail closed on an unknown code. */
export function fcByCode(code?: string | null): AmazonFulfilmentCentre | null {
  const key = (code ?? '').trim().toUpperCase();
  if (!key) return null;
  return DEFAULT_UK_FC_LIST.find((fc) => fc.code.toUpperCase() === key) ?? null;
}

/**
 * Resolve a PO's declared ship-to party into the destination the shipment
 * records. Returns `null` when the PO declares no party at all (the caller must
 * then record `DESTINATION_NOT_DECLARED` — never a guessed site).
 *
 * The PO's OWN declaration wins over the directory: a real channel PO may name
 * an FC this repository's convenience list does not carry, and the channel is
 * authoritative (`AV-017`). The directory only fills in what the PO left out.
 */
export function resolveDestinationFc(
  declaration?: ShipToParty | null
): DestinationFc | null {
  const partyId = (declaration?.partyId ?? '').trim();
  if (!partyId) return null;

  const known = fcByCode(partyId);
  const code = partyId.toUpperCase();
  const declaredName = (declaration?.name ?? '').trim();
  const baseName = declaredName || known?.name || `Destination FC ${code}`;
  const name = baseName.toUpperCase().includes(code) ? baseName : `${baseName} (${code})`;
  const city = ((declaration?.city ?? known?.city ?? '').trim() || null);
  const postcode = ((declaration?.postcode ?? known?.postcode ?? '').trim() || null);

  const place = city ? resolveGeoPlace(city).place : null;
  const label = postcode ? `${name}, ${postcode}` : city ? `${name}, ${city}` : name;

  return { partyId: code, name, city, postcode, place, label };
}

/**
 * The destination string for a PO — the ONE function the domain uses.
 * A PO that declares nothing yields the explicit not-declared string.
 */
export function destinationLabelForPo(
  po?: { shipToParty?: ShipToParty } | null
): string {
  return resolveDestinationFc(po?.shipToParty)?.label ?? DESTINATION_NOT_DECLARED;
}

/**
 * The ship-to party a SEEDED or SIMULATED channel PO declares.
 *
 * It is taken deterministically from the canonical FC directory, so
 *  - no second destination dataset exists,
 *  - a simulated PO still exercises the REAL resolution path (code → name → city
 *    → coordinate), and
 *  - different demo tenants genuinely arrive at different FCs.
 *
 * A live channel PO would carry this from the channel itself; nothing here
 * contacts a provider.
 */
export function declaredShipToParty(index: number): ShipToParty {
  const list = DEFAULT_UK_FC_LIST;
  if (list.length === 0) return { partyId: DESTINATION_FALLBACK_PARTY_ID };
  const fc = list[Math.abs(Math.trunc(index)) % list.length]!;
  return { partyId: fc.code, name: fc.name, city: fc.city, postcode: fc.postcode };
}

/**
 * The destination STRING a fixture records for a declared ship-to party — the
 * label resolution above, in one line, so a legacy seed never retypes an FC name
 * (single source of truth) and can never drift from the runtime derivation.
 */
export function declaredDestinationLabel(index: number): string {
  return resolveDestinationFc(declaredShipToParty(index))?.label ?? DESTINATION_NOT_DECLARED;
}
