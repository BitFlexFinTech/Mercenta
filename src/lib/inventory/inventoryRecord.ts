/**
 * §P8 — THE INVENTORY RECORD — the ONE owner of the stock figures.
 *
 * Programme decision 5: per catalogue product the record carries image · SKU ·
 * ASIN · available · UoM (Eaches/Cases) · on-hand · committed · inbound ·
 * safety stock. The brand keeps it INSIDE Mercenta; it is never a channel
 * reading.
 *
 * THE RULE THIS MODULE ENFORCES — every figure is DERIVED, never stored:
 * on-hand, committed and inbound are the sum of an APPEND-ONLY movement ledger,
 * and `available` is on-hand − committed. There is therefore no stored copy of a
 * stock figure that could drift from the movements it claims to describe (the
 * §P6/§P7 rule). A number cannot be edited into existence without a provenance.
 *
 * WHAT IT REFUSES (fail closed, never coerced):
 * - an undeclared unit (`INVENTORY_UOM_UNKNOWN`)
 * - a CASE-based entry for a product whose case pack is unknown or zero
 *   (`INVENTORY_CASE_PACK_UNKNOWN`) — a case is never silently read as 1 each
 * - a zero / non-finite / wrongly-signed quantity (`INVENTORY_QUANTITY_INVALID`)
 * - any movement that would take a bucket below zero
 *   (`INVENTORY_NEGATIVE_BUCKET`)
 * - a counted correction with no stated reason
 *   (`INVENTORY_ADJUSTMENT_REASON_REQUIRED`)
 *
 * HONEST BASIS (never overstated): the truth register records that **no Vendor
 * inventory-availability API exists**, so any inventory model is Mercenta's own
 * (truth validation §769 — "REQUIRES BUSINESS DECISION"), and pushing stock TO
 * the channel — `submitInventoryUpdate` — is the declared **P12** scope. Nothing
 * here claims a channel reading.
 *
 * Zero imports beyond types; zero side effects.
 */
import type {
  InventoryBucket,
  InventoryMovement,
  InventoryMovementType,
  InventoryRecord,
  InventoryStatus,
  InventorySummary,
  InventoryUom,
} from '@/types';
import { deriveAsinState } from '@/lib/catalog/asin';

/** The declared units (decision 5). */
export const INVENTORY_UOMS: readonly InventoryUom[] = ['eaches', 'cases'];

/** Human labels — the channel's own vocabulary, AV-029 CONFIRMED. */
export const INVENTORY_UOM_LABELS: Record<InventoryUom, string> = {
  eaches: 'Eaches',
  cases: 'Cases',
};

/** TRUE only for a declared unit — an unknown unit is refused, never coerced. */
export function isInventoryUom(value: unknown): value is InventoryUom {
  return typeof value === 'string' && (INVENTORY_UOMS as readonly string[]).includes(value);
}

/** The three buckets a movement can change. */
export const INVENTORY_BUCKETS: readonly InventoryBucket[] = ['on_hand', 'committed', 'inbound'];

/** Human labels for the buckets. */
export const INVENTORY_BUCKET_LABELS: Record<InventoryBucket, string> = {
  on_hand: 'On hand',
  committed: 'Committed',
  inbound: 'Inbound',
};

/** The declared movement types, in the order they are offered. */
export const INVENTORY_MOVEMENT_TYPES: readonly InventoryMovementType[] = [
  'opening',
  'receipt',
  'dispatch',
  'commitment',
  'release',
  'inbound_expected',
  'inbound_cancelled',
  'adjustment',
];

/** Human labels for the movement types. */
export const INVENTORY_MOVEMENT_TYPE_LABELS: Record<InventoryMovementType, string> = {
  opening: 'Opening balance',
  receipt: 'Stock received',
  dispatch: 'Stock dispatched',
  commitment: 'Committed to an order',
  release: 'Commitment released',
  inbound_expected: 'Inbound expected',
  inbound_cancelled: 'Inbound cancelled',
  adjustment: 'Counted correction',
};

/** TRUE only for a declared movement type. */
export function isInventoryMovementType(value: unknown): value is InventoryMovementType {
  return (
    typeof value === 'string' &&
    (INVENTORY_MOVEMENT_TYPES as readonly string[]).includes(value)
  );
}

/** The refusal codes the domain returns (stated, never silently swallowed). */
export const INVENTORY_REFUSALS = {
  uomUnknown: 'INVENTORY_UOM_UNKNOWN — that unit of measure is not declared.',
  casePackUnknown:
    'INVENTORY_CASE_PACK_UNKNOWN — a case-based entry needs the product’s case pack (units per case); none is declared.',
  quantityInvalid: 'INVENTORY_QUANTITY_INVALID — a movement quantity must be a finite, non-zero number.',
  negativeBucket: 'INVENTORY_NEGATIVE_BUCKET — that movement would take the stock figure below zero.',
  adjustmentReasonRequired:
    'INVENTORY_ADJUSTMENT_REASON_REQUIRED — a counted correction requires a stated reason.',
  movementTypeUnknown: 'INVENTORY_MOVEMENT_TYPE_UNKNOWN — that movement type is not declared.',
  safetyStockInvalid:
    'INVENTORY_SAFETY_STOCK_INVALID — the reorder trigger must be a finite number of eaches, zero or more.',
  adjustmentBucketRequired:
    'INVENTORY_ADJUSTMENT_BUCKET_REQUIRED — a counted correction must name the bucket it corrects.',
} as const;

/** The documented rule, stated where the figures are handled. */
export const INVENTORY_RULES: readonly string[] = [
  'Every figure is derived from an append-only movement ledger — on-hand, committed and inbound are the sum of the movements recorded against them.',
  'Available = on-hand − committed. It may be negative: an oversold position is stated, never clamped to zero.',
  'Stock is entered in Eaches or Cases; a case-based entry uses the product’s own case pack and is refused when no case pack is declared.',
  'A counted correction requires a stated reason; every movement is attributed to the actor who recorded it.',
];

/** The honest basis of the whole model, shown wherever the figures are. */
export const INVENTORY_DERIVATION_BASIS =
  'Mercenta’s own model — no Vendor inventory-availability API exists (register AV-035 / truth validation §769), so these figures are entered inside Mercenta and are never a channel reading. Pushing stock to the channel is submitInventoryUpdate (P12).';

/** The unit vocabulary's authority (so it is never presented as invented). */
export const INVENTORY_UOM_SOURCE = 'AV-029 — the channel’s own payload vocabulary is Cases / Eaches';

/**
 * The declared fallback settings for a product the brand has not configured.
 * It is a DECLARED default (eaches, no reorder trigger) — never an invented
 * stock figure: the ledger still supplies every quantity.
 */
export const INVENTORY_DEFAULT_SETTINGS = { uom: 'eaches', safetyStock: 0 } as const;

/** The declared bucket a movement type changes (null = the caller names it). */
export function bucketForMovementType(type: InventoryMovementType): InventoryBucket | null {
  switch (type) {
    case 'opening':
    case 'receipt':
    case 'dispatch':
      return 'on_hand';
    case 'commitment':
    case 'release':
      return 'committed';
    case 'inbound_expected':
    case 'inbound_cancelled':
      return 'inbound';
    case 'adjustment':
      return null;
  }
}

/** Does this type ADD to its bucket, or REMOVE from it? (`adjustment` is signed) */
export function movementAdds(type: InventoryMovementType): boolean {
  switch (type) {
    case 'opening':
    case 'receipt':
    case 'commitment':
    case 'inbound_expected':
      return true;
    case 'dispatch':
    case 'release':
    case 'inbound_cancelled':
      return false;
    case 'adjustment':
      // A correction is whatever the actor states, so it is signed, not added.
      return true;
  }
}

/** The product's declared case pack (`unitsPerCase`), or undefined. */
export function unitsPerCaseOf(
  product: { unitsPerCase?: number } | undefined | null
): number | undefined {
  const value = product?.unitsPerCase;
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

/** A converted entry, or the refusal to state. */
export type EntryConversion =
  | { ok: true; eaches: number; unitsPerCaseUsed: number }
  | { ok: false; error: string };

/**
 * Convert what the actor typed into EACHES — the ONE conversion in the platform.
 *
 * Fails closed: an undeclared unit is refused, and a CASE entry without a
 * declared case pack is refused rather than silently treated as eaches.
 */
export function convertEntryToEaches(
  quantity: number,
  uom: unknown,
  unitsPerCase: number | undefined
): EntryConversion {
  if (!isInventoryUom(uom)) return { ok: false, error: INVENTORY_REFUSALS.uomUnknown };
  if (uom === 'eaches') return { ok: true, eaches: quantity, unitsPerCaseUsed: 1 };
  if (!unitsPerCase || unitsPerCase <= 0) {
    return { ok: false, error: INVENTORY_REFUSALS.casePackUnknown };
  }
  return { ok: true, eaches: quantity * unitsPerCase, unitsPerCaseUsed: unitsPerCase };
}

/** The derived sum of one bucket across a movement ledger. */
export function bucketTotal(
  movements: readonly InventoryMovement[],
  bucket: InventoryBucket
): number {
  return movements
    .filter((m) => m.bucket === bucket)
    .reduce((sum, m) => sum + m.quantityDelta, 0);
}

/** All three bucket totals — the ONE derivation every reader uses. */
export function bucketTotals(movements: readonly InventoryMovement[]): {
  onHand: number;
  committed: number;
  inbound: number;
} {
  return {
    onHand: bucketTotal(movements, 'on_hand'),
    committed: bucketTotal(movements, 'committed'),
    inbound: bucketTotal(movements, 'inbound'),
  };
}

/**
 * The derived stock status of a position.
 *
 * `out_of_stock` is about physical stock; `below_safety_stock` compares the
 * AVAILABLE position (on-hand − committed) against the reorder trigger, so an
 * oversold position is reported as below its safety stock rather than hidden.
 */
export function inventoryStatusOf(
  onHand: number,
  available: number,
  safetyStock: number
): InventoryStatus {
  if (onHand <= 0) return 'out_of_stock';
  if (available < safetyStock) return 'below_safety_stock';
  return 'in_stock';
}

/** Human labels for the derived status (single source for UI copy). */
export const INVENTORY_STATUS_LABELS: Record<InventoryStatus, string> = {
  out_of_stock: 'Out of stock',
  below_safety_stock: 'Below safety stock',
  in_stock: 'In stock',
};

/** Everything the derived record needs — all of it canonical state. */
export interface DeriveInventoryInput {
  brandId: string;
  sku: string;
  productId: string;
  uom: InventoryUom;
  safetyStock: number;
  movements: readonly InventoryMovement[];
  identifier?: { asin: string; source: 'brand_declared' | 'channel_assigned'; simulated: boolean };
  /** TRUE when a submission exists that the channel has not yet accepted. */
  awaitingChannelResult: boolean;
}

/**
 * THE derivation — one implementation, used by every reader.
 * Nothing is stored: the record is a projection of the ledger + the settings.
 */
export function deriveInventoryRecord(input: DeriveInventoryInput): InventoryRecord {
  const { onHand, committed, inbound } = bucketTotals(input.movements);
  const available = onHand - committed;
  const last = input.movements.length
    ? input.movements.reduce((a, b) => (b.recordedAt > a.recordedAt ? b : a))
    : undefined;
  return {
    brandId: input.brandId,
    sku: input.sku,
    productId: input.productId,
    uom: input.uom,
    onHand,
    committed,
    inbound,
    safetyStock: input.safetyStock,
    available,
    status: inventoryStatusOf(onHand, available, input.safetyStock),
    asin: input.identifier?.asin,
    asinSource: input.identifier?.source,
    asinSimulated: input.identifier?.simulated,
    identifierState: deriveAsinState(input.identifier, input.awaitingChannelResult),
    movementCount: input.movements.length,
    updatedAt: last?.recordedAt,
  };
}

/** The ONE derived roll-up of a tenant's inventory (no second arithmetic). */
export function summariseInventory(records: readonly InventoryRecord[]): InventorySummary {
  return {
    products: records.length,
    unitsOnHand: records.reduce((s, r) => s + r.onHand, 0),
    unitsCommitted: records.reduce((s, r) => s + r.committed, 0),
    unitsInbound: records.reduce((s, r) => s + r.inbound, 0),
    unitsAvailable: records.reduce((s, r) => s + r.available, 0),
    belowSafetyStock: records.filter((r) => r.status === 'below_safety_stock').length,
    outOfStock: records.filter((r) => r.status === 'out_of_stock').length,
    withIdentifier: records.filter((r) => !!r.asin).length,
    simulatedIdentifiers: records.filter((r) => r.asinSimulated === true).length,
  };
}

/** What a caller asks the ledger to record, before validation. */
export interface MovementRequest {
  type: unknown;
  quantity: number;
  uom: unknown;
  /** Required for `adjustment`; the bucket to correct. */
  bucket?: InventoryBucket;
  reason?: string;
}

/** A validated movement, ready to be recorded. */
export type MovementValidation =
  | {
      ok: true;
      type: InventoryMovementType;
      bucket: InventoryBucket;
      quantityDelta: number;
      unitsPerCaseUsed: number;
    }
  | { ok: false; error: string };

/**
 * Validate ONE movement against every rule in this module — the single place a
 * movement is accepted, so the domain and the UI cannot disagree.
 *
 * `currentTotals` is the ledger's present sum, used to refuse a movement that
 * would take the bucket negative.
 */
export function validateMovement(
  request: MovementRequest,
  unitsPerCase: number | undefined,
  currentTotals: { onHand: number; committed: number; inbound: number }
): MovementValidation {
  if (!isInventoryMovementType(request.type)) {
    return { ok: false, error: INVENTORY_REFUSALS.movementTypeUnknown };
  }
  const type = request.type;

  if (type === 'adjustment' && !request.reason?.trim()) {
    return { ok: false, error: INVENTORY_REFUSALS.adjustmentReasonRequired };
  }

  const declaredBucket = bucketForMovementType(type);
  const bucket = declaredBucket ?? request.bucket;
  if (!bucket || !(INVENTORY_BUCKETS as readonly string[]).includes(bucket)) {
    return { ok: false, error: INVENTORY_REFUSALS.adjustmentBucketRequired };
  }

  const magnitude = Math.abs(Number(request.quantity));
  if (!Number.isFinite(magnitude) || magnitude === 0) {
    return { ok: false, error: INVENTORY_REFUSALS.quantityInvalid };
  }

  const conversion = convertEntryToEaches(magnitude, request.uom, unitsPerCase);
  if (!conversion.ok) return conversion;

  // `adjustment` may be stated against a bucket in either direction; every other
  // type has its direction declared by the platform.
  const signed =
    type === 'adjustment'
      ? Number(request.quantity) < 0
        ? -conversion.eaches
        : conversion.eaches
      : movementAdds(type)
        ? conversion.eaches
        : -conversion.eaches;

  const present =
    bucket === 'on_hand' ? currentTotals.onHand : bucket === 'committed' ? currentTotals.committed : currentTotals.inbound;
  if (present + signed < 0) {
    return { ok: false, error: INVENTORY_REFUSALS.negativeBucket };
  }

  return { ok: true, type, bucket, quantityDelta: signed, unitsPerCaseUsed: conversion.unitsPerCaseUsed };
}