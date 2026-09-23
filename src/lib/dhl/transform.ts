/**
 * §Priority-1 — DHL transform + safe mock configuration.
 *
 * Maps provider-reported DHL milestones onto canonical domain shipment
 * statuses, and holds the SAFE MOCK configuration an operator sees in the
 * Integrations Hub for simulation mode. Mock values are deliberately
 * unmistakable (never plausible production values), are never secrets, and
 * are never sent to a live endpoint.
 */
import type { DhlMilestone } from './client';
import type { ShipmentStatus } from '@/types';

/**
 * Milestone → domain status mapping. Single source of truth:
 * every DHL-sourced domain transition uses this map, mock OR live.
 */
export const MILESTONE_TO_STATUS: Record<DhlMilestone, ShipmentStatus> = {
  label_created: 'factory_intake',
  pickup_scheduled: 'factory_intake',
  picked_up: 'bak_depot',
  in_transit: 'air_transit',
  customs_clearance: 'uk_customs_cleared',
  /**
   * §P5 REPOINTED THIS (old contract, for the record): `delivered` mapped to
   * `mercenta_hub`. A DHL `delivered` milestone means the goods reached the
   * destination on the purchase order, so it maps to `destination_fc`.
   */
  delivered: 'destination_fc',
};

export function milestoneToShipmentStatus(milestone: DhlMilestone): ShipmentStatus {
  return MILESTONE_TO_STATUS[milestone];
}

/** Reverse mapping for display: domain status → latest DHL milestone label. */
export const STATUS_TO_MILESTONE_LABEL: Record<ShipmentStatus, string> = {
  factory_intake: 'Label created / Pickup scheduled',
  bak_depot: 'Picked up',
  sea_transit: 'In transit (sea)',
  air_transit: 'In transit (air)',
  uk_customs_cleared: 'Customs clearance',
  /** §P5 — was 'Delivered to Mercenta hub'; the destination is the PO's FC. */
  destination_fc: 'Delivered to the destination FC',
  live_amazon: 'Live on channel',
};

/**
 * §Mock-credential rule — safe, deterministic, simulation-only DHL config.
 * These are NOT real secrets and MUST never reach a live provider; the
 * factory (index.ts) refuses to forward them to a live transport.
 */
export const DHL_MOCK_CREDENTIALS: {
  apiKey: string;
  accountNumber: string;
  mode: 'simulation';
  description: string;
} = {
  apiKey: 'mock:dhl-eu-demo-key',
  accountNumber: 'MOCK-DHL-ACCOUNT-0001',
  mode: 'simulation',
  description:
    'Simulation-only DHL Express configuration. No real DHL network call is made, no waybill leaves Mercenta, and no label is billable. Enter real DHL Enterprise credentials in Integrations → DHL to activate the live adapter.',
};

export function isMockDhlSecret(secretRef: string): boolean {
  return secretRef.startsWith('mock:');
}