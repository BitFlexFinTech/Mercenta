/**
 * §Batch 2p (`AV-025`) — THE ONE OWNER of the FULFILMENT-TRACK LABELS.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The internal track KEYS (`direct_fulfillment` / `financed` / `unassigned`) are
 * Mercenta's OWN domain vocabulary. A surface must never show the first key's
 * human label as the retail channel's programme name: **Amazon Vendor Direct
 * Fulfillment** is a distinct dropship programme with its own APIs (discrepancy
 * register `AV-025`, sources `S1`/`S6`/`S14`). Calling Mercenta's own
 * "the brand ships the confirmed POs" concept "Direct Fulfillment" is a NAME
 * COLLISION that misleads brands and future engineers into reading an Amazon
 * programme into a Mercenta mechanic.
 *
 * So the track is labelled **"Brand-direct supply"** — Mercenta's own term for its
 * own concept — everywhere it is shown, DECLARED ONCE here and read by every
 * surface (onboarding, the admin fulfilment-track panel, the CRM, the contract
 * admin and the agreement builder). No component keeps its own copy of the label.
 *
 * The agreement clause that used to head "(DIRECT FULFILLMENT)" is renamed with
 * this owner for the same reason; it is an internal Mercenta↔brand commercial
 * document and must not borrow the channel's programme name.
 */
import type { FulfillmentTrack } from '@/types';

/**
 * The label every surface renders for a track. The `unassigned` entry is also the
 * FAIL-CLOSED fallback: an absent or unknown track reads "Unassigned", never a
 * guess at one of the two real tracks.
 */
export const FULFILLMENT_TRACK_LABELS: Record<FulfillmentTrack, string> = {
  direct_fulfillment: 'Brand-direct supply',
  financed: 'Financed',
  unassigned: 'Unassigned',
};

/** The label for a track; an absent/unknown track resolves to `unassigned` (fail-closed). */
export function fulfillmentTrackLabel(track: FulfillmentTrack | undefined | null): string {
  if (track && Object.prototype.hasOwnProperty.call(FULFILLMENT_TRACK_LABELS, track)) {
    return FULFILLMENT_TRACK_LABELS[track];
  }
  return FULFILLMENT_TRACK_LABELS.unassigned;
}

/** The one-line hint for a REAL track (used by the onboarding track cards). */
export const FULFILLMENT_TRACK_HINTS: Record<'direct_fulfillment' | 'financed', string> = {
  direct_fulfillment: 'You ship confirmed POs directly; we remit your share of net proceeds.',
  financed: 'Mercenta purchases inventory at Ex-Works and handles fulfilment.',
};
