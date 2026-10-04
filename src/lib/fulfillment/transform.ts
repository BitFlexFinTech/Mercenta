/**
 * §PHASE 3 — Delta Fulfillment transform + safe mock configuration.
 *
 * Maps Delta Fulfillment's OUTBOUND dispatch milestones onto the canonical domain
 * shipment statuses, and holds the SAFE MOCK configuration an operator sees in the
 * Integrations Hub for simulation mode. Mock values are deliberately unmistakable
 * (never plausible production values), are never secrets, and are never sent to a
 * live endpoint.
 *
 * NOTE (honest): the canonical `ShipmentStatus` vocabulary was designed around an
 * INTERNATIONAL journey. A 3PL-buffered route has two legs — INBOUND (goods into
 * Delta's UK warehouse) and OUTBOUND (a dispatch out to the channel's fulfilment
 * centre). Only the OUTBOUND dispatch is a shipment leg, so only IT is mapped
 * here; the inbound receipt lifecycle (`DeltaInboundMilestone`) is a fulfilment-
 * partner receipt state and is deliberately NOT forced into `ShipmentStatus`,
 * because mapping "held in a 3PL warehouse" onto the carrier vocabulary would be
 * misleading. `delivered_to_fc` advances the domain to `destination_fc` (§P5 — the
 * goods reached the destination ON THE PURCHASE ORDER); everything still inside the
 * Delta network maps to `bak_depot` (the truthful nearest state — the freight is
 * with the carrier), and the exception DETAIL is carried on the result's own flags
 * so no information is lost by the coarse status.
 */
import type { DeltaDispatchMilestone } from './client';
import type { ShipmentStatus } from '@/types';

/** Dispatch milestone → domain status. Single source of truth, mock OR live. */
export const DELTA_DISPATCH_MILESTONE_TO_STATUS: Record<DeltaDispatchMilestone, ShipmentStatus> = {
  dispatch_created: 'factory_intake',
  allocated: 'bak_depot',
  picked: 'bak_depot',
  packed: 'bak_depot',
  handed_to_carrier: 'bak_depot',
  /** §P5 — delivered means the PO's destination FC. */
  delivered_to_fc: 'destination_fc',
  exception: 'bak_depot',
};

export function deltaDispatchMilestoneToShipmentStatus(
  milestone: DeltaDispatchMilestone
): ShipmentStatus {
  return DELTA_DISPATCH_MILESTONE_TO_STATUS[milestone];
}

/** Reverse mapping for display: domain status → latest Delta Fulfillment label. */
export const STATUS_TO_DELTA_LABEL: Record<ShipmentStatus, string> = {
  factory_intake: 'Dispatch created',
  bak_depot: 'In the Delta Fulfillment network',
  sea_transit: 'In transit (sea)',
  air_transit: 'In transit (air)',
  uk_customs_cleared: 'Cleared',
  destination_fc: 'Delivered to the destination FC',
  live_amazon: 'Live on channel',
};

/**
 * §Mock-credential rule — safe, deterministic, simulation-only Delta Fulfillment
 * configuration. These are NOT real secrets and MUST never reach a live provider;
 * the factory (`index.ts`) refuses to forward them to a live transport.
 */
export const DELTA_MOCK_CREDENTIALS: {
  apiKey: string;
  accountId: string;
  mode: 'simulation';
  description: string;
} = {
  apiKey: 'mock:delta-fulfillment-3pl-demo-key',
  accountId: 'MOCK-DLT-ACCOUNT-0001',
  mode: 'simulation',
  description:
    'Simulation-only Delta Fulfillment configuration. No real Delta Fulfillment call is made, no goods move, and no storage or pick/pack is billable. Enter real Delta Fulfillment account details in Integrations → Delta Fulfillment to activate the live adapter.',
};

export function isMockDeltaSecret(secretRef: string): boolean {
  return secretRef.startsWith('mock:');
}