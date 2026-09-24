/**
 * §P8 — INVENTORY LIFECYCLE (the domain write path).
 *
 * Every write goes through here, so the rules are enforced in the DOMAIN — not
 * merely hidden in a UI. The guards are the same ones the rest of the platform
 * uses: RBAC (`canMutate`), TENANT ISOLATION (a tenant-pinned actor may only act
 * on its OWN products) and an attributed, audited write for every change.
 *
 * The figures themselves are never stored: `listBrandInventory` derives them
 * from the canonical append-only ledger through
 * `src/lib/inventory/inventoryRecord.ts` (the ONE owner), so a stock number
 * cannot exist without a movement behind it.
 *
 * Honest limits (recorded, not hidden):
 * - the ledger is IN-MEMORY in this environment (the D4 persistence port has no
 *   inventory table; the P7 invoice ledger reports the same limit);
 * - nothing here contacts a channel — `submitInventoryUpdate` is P12's scope,
 *   and the identifier is only ever the brand's own declaration or the channel's
 *   response through the existing mock-first seam.
 */
import type {
  InventoryMovement,
  InventoryRecord,
  InventorySettings,
  InventorySummary,
  ProductIdentifier,
} from '@/types';
import type { AcquisitionActor } from '@/lib/acquisition/outreachLifecycle';
import {
  bucketTotals,
  deriveInventoryRecord,
  isInventoryUom,
  summariseInventory,
  unitsPerCaseOf,
  validateMovement,
  INVENTORY_DEFAULT_SETTINGS,
  INVENTORY_REFUSALS,
} from './inventoryRecord';
import {
  ASIN_REFUSALS,
  canReplaceIdentifier,
  isSimulatedAsin,
  validateBrandAsin,
  validateChannelAsin,
} from '@/lib/catalog/asin';
import * as store from '@/data/demoStore';

/**
 * The actor performing an inventory action. A brand session carries its
 * `tenantId`, exactly like the E2/E3 actors, and the domain then refuses any
 * action on another tenant's product.
 */
export interface InventoryActor extends AcquisitionActor {
  tenantId?: string;
}

export type InventoryResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

const FORBIDDEN = 'FORBIDDEN — the acting account is view-only.';
const CROSS_TENANT = 'CROSS_TENANT — that product belongs to another tenant.';
const NOT_FOUND = 'NOT_FOUND — no such product in this tenant’s catalogue.';
const BRAND_ACTOR_REQUIRED = 'A brand-pinned actor may not override the channel identifier.';

/** Tenant isolation guard — a pinned actor may act ONLY on its own products. */
function crossTenant(actor: InventoryActor, brandId: string): boolean {
  return !!actor.tenantId && actor.tenantId !== brandId;
}

/** A submission the channel has NOT yet resolved ⇒ the identifier is pending. */
function awaitingChannelResult(brandId: string, sku: string): boolean {
  const latest = store.latestSubmissionForProduct(brandId, sku);
  if (!latest) return false;
  return latest.status === 'submitted' || latest.status === 'under_amazon_review';
}

/** Derive ONE product's inventory record from canonical state, or undefined. */
function deriveOne(brandId: string, sku: string): InventoryRecord | undefined {
  const product = store.findCatalogProduct(brandId, sku);
  if (!product) return undefined;
  const settings = store.getInventorySettings(brandId, sku);
  return deriveInventoryRecord({
    brandId,
    sku,
    productId: product.id,
    uom: settings?.uom ?? INVENTORY_DEFAULT_SETTINGS.uom,
    safetyStock: settings?.safetyStock ?? INVENTORY_DEFAULT_SETTINGS.safetyStock,
    movements: store.getInventoryMovements(brandId, sku),
    identifier: store.getProductIdentifier(brandId, sku),
    awaitingChannelResult: awaitingChannelResult(brandId, sku),
  });
}

/** One product's derived inventory record (the tenant-scoped read). */
export function inventoryForProduct(
  brandId: string,
  sku: string,
  actor: InventoryActor
): InventoryResult<InventoryRecord> {
  if (crossTenant(actor, brandId)) return { ok: false, error: CROSS_TENANT };
  const record = deriveOne(brandId, sku);
  if (!record) return { ok: false, error: NOT_FOUND };
  return { ok: true, value: record };
}

/**
 * A tenant's whole inventory — one record per catalogue product, derived.
 * A view-only actor MAY read; a tenant-pinned actor may read only its own.
 */
export function listBrandInventory(
  brandId: string,
  actor: InventoryActor
): InventoryResult<InventoryRecord[]> {
  if (crossTenant(actor, brandId)) return { ok: false, error: CROSS_TENANT };
  const records = store
    .productsForBrandFromStore(brandId)
    .map((p) => deriveOne(brandId, p.sku))
    .filter((r): r is InventoryRecord => !!r);
  return { ok: true, value: records };
}

/** The tenant's derived roll-up (the ONE summary — never re-derived by a view). */
export function inventorySummaryForBrand(
  brandId: string,
  actor: InventoryActor
): InventoryResult<InventorySummary> {
  const list = listBrandInventory(brandId, actor);
  if (!list.ok) return list;
  return { ok: true, value: summariseInventory(list.value) };
}

/** One product's movement ledger (the provenance the brand can inspect). */
export function listInventoryMovements(
  brandId: string,
  sku: string,
  actor: InventoryActor
): InventoryResult<InventoryMovement[]> {
  if (crossTenant(actor, brandId)) return { ok: false, error: CROSS_TENANT };
  return { ok: true, value: store.getInventoryMovements(brandId, sku) };
}

/**
 * Record a stock movement — the ONLY way a stock figure changes.
 *
 * Every refusal comes from `validateMovement` (the single rule set): an
 * undeclared unit, a case entry without a case pack, a zero quantity, a
 * correction without a reason, and any movement that would take its bucket
 * below zero.
 */
export function recordStockMovement(
  input: {
    brandId: string;
    sku: string;
    type: unknown;
    quantity: number;
    uom: unknown;
    bucket?: InventoryMovement['bucket'];
    reason?: string;
  },
  actor: InventoryActor
): InventoryResult<InventoryMovement> {
  if (!actor.canMutate) return { ok: false, error: FORBIDDEN };
  if (crossTenant(actor, input.brandId)) return { ok: false, error: CROSS_TENANT };
  const product = store.findCatalogProduct(input.brandId, input.sku);
  if (!product) return { ok: false, error: NOT_FOUND };

  const movements = store.getInventoryMovements(input.brandId, input.sku);
  const validation = validateMovement(
    {
      type: input.type,
      quantity: input.quantity,
      uom: input.uom,
      bucket: input.bucket,
      reason: input.reason,
    },
    unitsPerCaseOf(product),
    bucketTotals(movements)
  );
  if (!validation.ok) return { ok: false, error: validation.error };

  const movement = store.recordInventoryMovement({
    brandId: input.brandId,
    sku: input.sku,
    productId: product.id,
    bucket: validation.bucket,
    type: validation.type,
    quantityDelta: validation.quantityDelta,
    enteredQuantity: Math.abs(Number(input.quantity)),
    enteredUom: input.uom as InventoryMovement['enteredUom'],
    unitsPerCaseUsed: validation.unitsPerCaseUsed,
    reason: input.reason?.trim() || undefined,
    actorId: actor.staffId,
  });

  store.recordCatalogAudit(
    `inventory_${movement.type}`,
    `${input.brandId}:${input.sku}`,
    input.brandId,
    `${actor.staffId}: ${movement.type} ${movement.enteredQuantity} ${movement.enteredUom} → ${movement.quantityDelta} eaches against ${movement.bucket}${movement.reason ? ` — ${movement.reason}` : ''}`,
    actor.staffId,
    {
      bucket: movement.bucket,
      type: movement.type,
      quantityDelta: movement.quantityDelta,
      enteredUom: movement.enteredUom,
      unitsPerCaseUsed: movement.unitsPerCaseUsed,
    },
    'inventory_movement'
  );

  return { ok: true, value: movement };
}

/**
 * Set the brand's own working settings for a product (unit + reorder trigger).
 *
 * The unit must be DECLARED and the trigger must be a finite non-negative number
 * of eaches — neither is coerced.
 */
export function setInventorySettings(
  input: {
    brandId: string;
    sku: string;
    uom?: unknown;
    safetyStock?: number;
    reason?: string;
  },
  actor: InventoryActor
): InventoryResult<InventorySettings> {
  if (!actor.canMutate) return { ok: false, error: FORBIDDEN };
  if (crossTenant(actor, input.brandId)) return { ok: false, error: CROSS_TENANT };
  const product = store.findCatalogProduct(input.brandId, input.sku);
  if (!product) return { ok: false, error: NOT_FOUND };

  const current = store.getInventorySettings(input.brandId, input.sku);
  if (input.uom !== undefined && !isInventoryUom(input.uom)) {
    return { ok: false, error: INVENTORY_REFUSALS.uomUnknown };
  }
  if (
    input.safetyStock !== undefined &&
    (!Number.isFinite(input.safetyStock) || input.safetyStock < 0)
  ) {
    return { ok: false, error: INVENTORY_REFUSALS.safetyStockInvalid };
  }

  const settings = store.upsertInventorySettings({
    brandId: input.brandId,
    sku: input.sku,
    productId: product.id,
    uom: (input.uom as InventorySettings['uom']) ?? current?.uom ?? INVENTORY_DEFAULT_SETTINGS.uom,
    safetyStock:
      input.safetyStock ?? current?.safetyStock ?? INVENTORY_DEFAULT_SETTINGS.safetyStock,
    updatedBy: actor.staffId,
  });

  store.recordCatalogAudit(
    'inventory_settings_updated',
    `${input.brandId}:${input.sku}`,
    input.brandId,
    `${actor.staffId}: inventory unit ${settings.uom}, safety stock ${settings.safetyStock} eaches${input.reason ? ` — ${input.reason}` : ''}`,
    actor.staffId,
    { uom: settings.uom, safetyStock: settings.safetyStock },
    'inventory_settings'
  );

  return { ok: true, value: settings };
}

/**
 * DECISION 10 — the brand supplies the identifier itself.
 *
 * Permitted ONLY for a product that already exists on the channel (the brand's
 * required confirmation), and never with a simulated placeholder. A
 * channel-assigned identifier cannot be replaced this way.
 */
export function declareBrandAsin(
  input: {
    brandId: string;
    sku: string;
    asin: string;
    productExistsOnChannel: boolean;
    note?: string;
  },
  actor: InventoryActor
): InventoryResult<ProductIdentifier> {
  if (!actor.canMutate) return { ok: false, error: FORBIDDEN };
  if (crossTenant(actor, input.brandId)) return { ok: false, error: CROSS_TENANT };
  const product = store.findCatalogProduct(input.brandId, input.sku);
  if (!product) return { ok: false, error: NOT_FOUND };

  const validation = validateBrandAsin(input.asin, input.productExistsOnChannel);
  if (!validation.ok) return { ok: false, error: validation.error };

  const existing = store.getProductIdentifier(input.brandId, input.sku);
  if (!canReplaceIdentifier(existing, 'brand_declared')) {
    return { ok: false, error: ASIN_REFUSALS.authorityOrder };
  }

  const identifier = store.recordProductIdentifier({
    brandId: input.brandId,
    sku: input.sku,
    productId: product.id,
    asin: validation.asin,
    source: 'brand_declared',
    // The platform validates the SHAPE only and never claims to have checked the
    // listing, so a brand declaration is NOT marked simulated but is also never
    // presented as channel-confirmed.
    simulated: false,
    brandConfirmedExistingListing: true,
    recordedBy: actor.staffId,
    note: input.note?.trim() || 'Supplied by the brand — the listing already exists on the channel.',
  });

  store.recordCatalogAudit(
    'inventory_identifier_declared',
    `${input.brandId}:${input.sku}`,
    input.brandId,
    `${actor.staffId}: brand declared the channel identifier for ${input.sku} (existing listing confirmed)`,
    actor.staffId,
    { sku: input.sku, source: 'brand_declared', simulated: false },
    'product_identifier'
  );

  return { ok: true, value: identifier };
}

/**
 * DECISION 10 — MERCENTA populates the identifier from the channel.
 *
 * Called when the channel ACCEPTS the product into the catalogue (the catalog
 * submission lifecycle), so the identifier is recorded from the channel's OWN
 * response — never fabricated. While the provider is mocked that response is the
 * unmistakable `SIM-ASIN-…` placeholder and `simulated` is TRUE.
 *
 * Idempotent: an unchanged re-record writes no duplicate audit fact.
 */
export function populateAsinFromChannel(
  input: {
    brandId: string;
    sku: string;
    asin: string;
    simulated: boolean;
    note?: string;
  },
  actor: InventoryActor
): InventoryResult<ProductIdentifier> {
  if (!actor.canMutate) return { ok: false, error: FORBIDDEN };
  if (crossTenant(actor, input.brandId)) return { ok: false, error: CROSS_TENANT };
  const product = store.findCatalogProduct(input.brandId, input.sku);
  if (!product) return { ok: false, error: NOT_FOUND };

  const validation = validateChannelAsin(input.asin);
  if (!validation.ok) return { ok: false, error: validation.error };

  const existing = store.getProductIdentifier(input.brandId, input.sku);
  if (
    existing &&
    existing.asin === validation.asin &&
    existing.source === 'channel_assigned' &&
    existing.simulated === input.simulated
  ) {
    return { ok: true, value: existing };
  }

  const identifier = store.recordProductIdentifier({
    brandId: input.brandId,
    sku: input.sku,
    productId: product.id,
    asin: validation.asin,
    source: 'channel_assigned',
    simulated: input.simulated,
    recordedBy: actor.staffId,
    note:
      input.note?.trim() ||
      (input.simulated
        ? 'Populated by Mercenta from the channel’s acceptance — SIMULATED, no live channel response exists.'
        : 'Populated by Mercenta from the channel’s acceptance.'),
  });

  store.recordCatalogAudit(
    'inventory_identifier_recorded',
    `${input.brandId}:${input.sku}`,
    input.brandId,
    `${actor.staffId}: channel identifier recorded for ${input.sku} from the channel’s acceptance${input.simulated ? ' (SIMULATED — no live channel response)' : ''}`,
    actor.staffId,
    { sku: input.sku, source: 'channel_assigned', simulated: input.simulated },
    'product_identifier'
  );

  return { ok: true, value: identifier };
}

/**
 * ADMIN OVERRIDE — replace the channel identifier, attributed and with a REASON.
 *
 * Refused for a brand-pinned actor: a brand may never rewrite the identifier the
 * channel assigned. The override exists for a data-entry correction, and the
 * reason is part of the audit record.
 */
export function adminOverrideAsin(
  input: { brandId: string; sku: string; asin: string; reason: string },
  actor: InventoryActor
): InventoryResult<ProductIdentifier> {
  if (!actor.canMutate) return { ok: false, error: FORBIDDEN };
  if (actor.tenantId) return { ok: false, error: BRAND_ACTOR_REQUIRED };
  if (!input.reason?.trim()) return { ok: false, error: ASIN_REFUSALS.reasonRequired };
  const product = store.findCatalogProduct(input.brandId, input.sku);
  if (!product) return { ok: false, error: NOT_FOUND };

  const validation = validateChannelAsin(input.asin);
  if (!validation.ok) return { ok: false, error: validation.error };

  const identifier = store.recordProductIdentifier({
    brandId: input.brandId,
    sku: input.sku,
    productId: product.id,
    asin: validation.asin,
    source: 'channel_assigned',
    simulated: isSimulatedAsin(validation.asin),
    recordedBy: actor.staffId,
    note: `Overridden by ${actor.staffId} — ${input.reason.trim()}`,
  });

  store.recordCatalogAudit(
    'inventory_identifier_overridden',
    `${input.brandId}:${input.sku}`,
    input.brandId,
    `${actor.staffId}: identifier for ${input.sku} overridden — ${input.reason.trim()}`,
    actor.staffId,
    { sku: input.sku, simulated: identifier.simulated, reason: input.reason.trim() },
    'product_identifier'
  );

  return { ok: true, value: identifier };
}