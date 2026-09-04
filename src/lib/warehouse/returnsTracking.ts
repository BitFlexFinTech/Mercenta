/** §Batch-16 — Returns warehouse tracking store. */
import type { ReturnTrackingEntry, ReturnTrackingStatus } from '@/types';
import { demoAuditLog, demoReturns, demoReturnAddresses } from '@/data/demoStore';

const uid = (p: string) => p + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);

export const demoReturnTracking: ReturnTrackingEntry[] = [
  {
    id: 'rt-001', returnId: 'ret-1', brandId: 'brand-zambezi',
    receivedAtWarehouse: new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10),
    inboundCarrier: 'DHL', inboundTrackingNumber: 'DHL-UK-RET-77123',
    conditionOnReceipt: '2 cases with unsealed bottle caps. Product leaked in transit. Remaining 4 cases intact.',
    qualityCheckPassed: false, qualityCheckNotes: 'Leakage confirmed from defective caps. 24 units unsaleable.',
    qualityCheckedAt: new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10),
    forwardedToBrandAt: new Date(Date.now() - 4 * 864e5).toISOString().slice(0, 10),
    forwardedCarrier: 'DHL', forwardedTrackingNumber: 'DHL-UK-FWD-88234',
    forwardedToAddressId: 'ra-1',
    status: 'forwarded_to_brand',
    linkedDeductionId: 'ded-1',
  },
  {
    id: 'rt-002', returnId: 'ret-2', brandId: 'brand-zambezi',
    receivedAtWarehouse: new Date(Date.now() - 4 * 864e5).toISOString().slice(0, 10),
    inboundCarrier: 'FedEx', inboundTrackingNumber: 'FDX-UK-RET-45112',
    conditionOnReceipt: 'Moisture content exceeded spec per lab report. 12 units segregated for QC review.',
    qualityCheckPassed: false, qualityCheckNotes: 'Moisture damage confirmed. Product cannot be resold.',
    qualityCheckedAt: new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10),
    status: 'quality_checked',
    linkedDeductionId: 'ded-1',
  },
  {
    id: 'rt-003', returnId: 'ret-3', brandId: 'brand-harvestlane',
    receivedAtWarehouse: new Date(Date.now() - 10 * 864e5).toISOString().slice(0, 10),
    inboundCarrier: 'Palletline', inboundTrackingNumber: 'PLL-UK-RET-30987',
    conditionOnReceipt: 'Carton crushed by pallet over-stacking. 6 units damaged, rest intact.',
    qualityCheckPassed: true, qualityCheckNotes: 'Damaged units disposed per policy. Remaining stock intact.',
    qualityCheckedAt: new Date(Date.now() - 9 * 864e5).toISOString().slice(0, 10),
    status: 'confirmed_by_brand',
    confirmedByBrandAt: new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10),
  },
];

export function getReturnTracking(returnId: string): ReturnTrackingEntry | undefined {
  return demoReturnTracking.find((t) => t.returnId === returnId);
}

export function getReturnTrackingForBrand(brandId: string): ReturnTrackingEntry[] {
  return demoReturnTracking.filter((t) => t.brandId === brandId);
}

export function getAllReturnTracking(): ReturnTrackingEntry[] {
  return [...demoReturnTracking];
}

export function recordWarehouseReceipt(input: {
  returnId: string; brandId: string; inboundCarrier: string;
  inboundTrackingNumber: string; conditionOnReceipt: string;
}): ReturnTrackingEntry {
  const entry: ReturnTrackingEntry = {
    id: uid('rt'), returnId: input.returnId, brandId: input.brandId,
    receivedAtWarehouse: new Date().toISOString().slice(0, 10),
    inboundCarrier: input.inboundCarrier, inboundTrackingNumber: input.inboundTrackingNumber,
    conditionOnReceipt: input.conditionOnReceipt,
    qualityCheckPassed: false, status: 'received_at_warehouse',
  };
  demoReturnTracking.unshift(entry);
  demoAuditLog.push({
    id: uid('audit'), createdAt: new Date().toISOString(),
    actorId: 'system', action: 'return_received_at_warehouse',
    entityType: 'return_tracking', entityId: entry.id, brandId: input.brandId,
    reason: 'Return ' + input.returnId + ' received at warehouse via ' + input.inboundCarrier + ' (' + input.inboundTrackingNumber + ')',
  });
  return entry;
}

export function recordQualityCheck(trackingId: string, passed: boolean, notes: string): ReturnTrackingEntry | null {
  const t = demoReturnTracking.find((x) => x.id === trackingId);
  if (!t) return null;
  t.qualityCheckPassed = passed;
  t.qualityCheckNotes = notes;
  t.qualityCheckedAt = new Date().toISOString().slice(0, 10);
  t.status = 'quality_checked';
  demoAuditLog.push({
    id: uid('audit'), createdAt: new Date().toISOString(),
    actorId: 'system', action: 'return_quality_checked',
    entityType: 'return_tracking', entityId: trackingId, brandId: t.brandId,
    reason: 'Quality check: ' + (passed ? 'PASSED' : 'FAILED') + ' — ' + notes,
  });
  return t;
}

export function recordForwardToBrand(trackingId: string, carrier: string, trackingNumber: string, addressId: string): ReturnTrackingEntry | null {
  const t = demoReturnTracking.find((x) => x.id === trackingId);
  if (!t) return null;
  t.forwardedToBrandAt = new Date().toISOString().slice(0, 10);
  t.forwardedCarrier = carrier;
  t.forwardedTrackingNumber = trackingNumber;
  t.forwardedToAddressId = addressId;
  t.status = 'forwarded_to_brand';
  demoAuditLog.push({
    id: uid('audit'), createdAt: new Date().toISOString(),
    actorId: 'system', action: 'return_forwarded_to_brand',
    entityType: 'return_tracking', entityId: trackingId, brandId: t.brandId,
    reason: 'Forwarded to brand via ' + carrier + ' (' + trackingNumber + ')',
  });
  return t;
}

export function recordBrandConfirmation(trackingId: string): ReturnTrackingEntry | null {
  const t = demoReturnTracking.find((x) => x.id === trackingId);
  if (!t) return null;
  t.confirmedByBrandAt = new Date().toISOString().slice(0, 10);
  t.status = 'confirmed_by_brand';
  demoAuditLog.push({
    id: uid('audit'), createdAt: new Date().toISOString(),
    actorId: 'system', action: 'return_confirmed_by_brand',
    entityType: 'return_tracking', entityId: trackingId, brandId: t.brandId,
    reason: 'Brand confirmed receipt of forwarded return.',
  });
  return t;
}