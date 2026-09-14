/**
 * §Canonical model §13 — Palletline transform + safe mock configuration.
 *
 * Maps Palletline's UK-domestic consignment milestones onto the canonical
 * domain shipment statuses, and holds the SAFE MOCK configuration an operator
 * sees in the Integrations Hub for simulation mode. Mock values are deliberately
 * unmistakable (never plausible production values), are never secrets, and are
 * never sent to a live endpoint.
 */
import type { PalletlineMilestone } from './client';
import type { ShipmentStatus } from '@/types';

/**
 * Milestone → domain status mapping. Single source of truth: every
 * Palletline-sourced domain transition uses this map, mock OR live.
 *
 * NOTE (honest): the canonical `ShipmentStatus` vocabulary was designed around
 * an INTERNATIONAL journey (sea/air transit, customs). A UK-domestic pallet
 * journey has no customs leg and no distinct "final delivery" state, so:
 *   - everything still inside the Palletline network maps to `bak_depot`
 *     (the truthful nearest state — the freight is with the carrier);
 *   - only `delivered` advances the domain to `mercenta_hub`.
 * The exception / failed-delivery DETAIL is carried on the result's own flags,
 * so no information is lost by the coarse status — and no new domain status is
 * invented just to mirror a carrier's internal labels.
 */
export const PALLETLINE_MILESTONE_TO_STATUS: Record<PalletlineMilestone, ShipmentStatus> = {
  consignment_booked: 'factory_intake',
  collection_scheduled: 'factory_intake',
  collected: 'bak_depot',
  at_hub: 'bak_depot',
  out_for_delivery: 'bak_depot',
  delivered: 'mercenta_hub',
  failed_delivery: 'bak_depot',
  exception: 'bak_depot',
};

export function palletlineMilestoneToShipmentStatus(
  milestone: PalletlineMilestone
): ShipmentStatus {
  return PALLETLINE_MILESTONE_TO_STATUS[milestone];
}

/** Reverse mapping for display: domain status → latest Palletline label. */
export const STATUS_TO_PALLETLINE_LABEL: Record<ShipmentStatus, string> = {
  factory_intake: 'Consignment booked / collection scheduled',
  bak_depot: 'In the Palletline network',
  sea_transit: 'In transit (sea)',
  air_transit: 'In transit (air)',
  uk_customs_cleared: 'Cleared',
  mercenta_hub: 'Delivered to the Mercenta hub',
  live_amazon: 'Live on channel',
};

/**
 * §Mock-credential rule — safe, deterministic, simulation-only Palletline
 * configuration. These are NOT real secrets and MUST never reach a live
 * provider; the factory (index.ts) refuses to forward them to a live transport.
 */
export const PALLETLINE_MOCK_CREDENTIALS: {
  apiKey: string;
  accountNumber: string;
  mode: 'simulation';
  description: string;
} = {
  apiKey: 'mock:palletline-uk-demo-key',
  accountNumber: 'MOCK-PLL-ACCOUNT-0001',
  mode: 'simulation',
  description:
    'Simulation-only Palletline configuration. No real Palletline network call is made, no consignment leaves Mercenta, and no pallet is billable. Enter real Palletline account credentials in Integrations → Palletline to activate the live adapter.',
};

export function isMockPalletlineSecret(secretRef: string): boolean {
  return secretRef.startsWith('mock:');
}
