/**
 * §WAVE 3 (2026-11-25) — shared shaping for the ADMIN console.
 *
 * Everything here reads the CANONICAL domain types and the canonical helpers;
 * nothing re-derives a business rule. Admin screens differ from brand screens in
 * ONE respect only: they are not narrowed to a tenant, so the portfolio is the
 * whole visible set of brands rather than the signed-in brand.
 */
import { isResolvedShipmentStatus } from '@/types';
import type { DemoBrandRow, DemoShipment } from '@/data/demoData';
import type { PurchaseOrder } from '@/types';

/** The PO states that still need Mercenta or the brand to act. */
export const OPEN_PO_STATUSES: ReadonlySet<PurchaseOrder['status']> = new Set([
  'received',
  'under_review',
  'accepted',
  'ready_to_fulfil',
]);

export function isOpenPo(po: PurchaseOrder): boolean {
  return OPEN_PO_STATUSES.has(po.status);
}

/** A brand's display name, never an invented one. */
export function brandNameOf(brands: DemoBrandRow[], brandId: string): string {
  return brands.find((b) => b.id === brandId)?.profile.businessName ?? brandId;
}

export function sumGbp(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/** Shipments still on the road — resolved states are excluded by the canonical helper. */
export function activeShipments(shipments: DemoShipment[]): DemoShipment[] {
  return shipments.filter((shipment) => !isResolvedShipmentStatus(shipment.status));
}

export function shipmentsWithExceptions(shipments: DemoShipment[]): DemoShipment[] {
  return shipments.filter((shipment) => Boolean(shipment.exception));
}