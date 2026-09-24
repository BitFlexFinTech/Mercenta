/**
 * §P12 — THE ONE OWNER OF THE CHANNEL INVENTORY PUSH.
 *
 * Programme `docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md` §4 P12;
 * register **`AV-040`**. §P8 built Mercenta's own inventory model (programme
 * decision 5) and recorded the honest limit that "the push direction —
 * `submitInventoryUpdate` — is P12's declared scope". This owner is that push.
 *
 * THE FIGURE IS NEVER TYPED IN. The quantity pushed is DERIVED from the canonical
 * append-only movement ledger (`src/lib/inventory/inventoryRecord.ts →
 * bucketTotals`), which is the same derivation the inventory surface shows — so the
 * channel cannot be told a number that disagrees with what Mercenta reports.
 *
 * FAIL-CLOSED GUARDS (checked BEFORE any channel call)
 * ---------------------------------------------------
 *   · an unnamed SKU is refused;
 *   · a NEGATIVE derived on-hand is refused — a stock push cannot report negative
 *     stock (the ledger may legitimately go oversold AVAILABLE; on-hand itself may
 *     not be pushed as a negative figure);
 *   · a `Cases` push without the product's own case pack is refused, through the
 *     canonical conversion (never a silent case-reads-as-one-each);
 *   · a `Cases` push whose derived quantity is not a whole number of cases is
 *     refused rather than rounded (rounding would misstate stock to the channel).
 *
 * HONEST LIMIT: `AV-035` records that no Vendor inventory-availability API exists,
 * so there is nothing to READ — this operation only ever pushes, and the ledger is
 * in memory in this environment like the rest of the simulated commerce store.
 */
import type { InventoryMovement } from '@/types';
import type { InventoryUpdatePayload, InventoryUpdateResult } from '@/lib/spapi/client';
import { bucketTotals, unitsPerCaseOf } from './inventoryRecord';

/** The seam shape this owner needs — the SP-API client satisfies it exactly. */
export interface ChannelInventoryReader {
  submitInventoryUpdate(payload: InventoryUpdatePayload): Promise<InventoryUpdateResult>;
}

export type ChannelInventoryUnit = InventoryUpdatePayload['unitOfMeasure'];

export interface ChannelInventoryPushRecord {
  sku: string;
  brandId: string;
  /** The quantity pushed, in the declared unit. */
  quantity: number;
  unitOfMeasure: ChannelInventoryUnit;
  /** The EACHES equivalent the canonical ledger derivation produced. */
  eaches: number;
  /** The channel's own acknowledgement reference. */
  submissionId?: string;
  pushedAt: string;
  mode: 'mock' | 'real';
  simulated: boolean;
  /** A stated refusal — never a silent no-op. */
  refusal?: string;
}

export const CHANNEL_INVENTORY_PUSH_REFUSALS = {
  skuMissing: 'INVENTORY_SKU_MISSING — a stock push must name the SKU it reports.',
  negativeOnHand:
    'INVENTORY_PUSH_NEGATIVE — the derived on-hand is negative, so there is no stock figure to push; correct the ledger first.',
  casePackUnknown:
    'INVENTORY_CASE_PACK_UNKNOWN — a case-based push needs the product’s case pack (units per case); none is declared.',
  caseConversionLossy:
    'INVENTORY_CASE_CONVERSION_LOSSY — the derived on-hand is not a whole number of cases, so pushing cases would misstate stock to the channel; push in Eaches instead.',
} as const;

/**
 * Push a product's DERIVED on-hand stock to the channel in the declared unit.
 *
 * The ledger is the source: nothing here accepts a quantity typed by a caller.
 */
export async function pushInventoryToChannel(input: {
  reader: ChannelInventoryReader;
  /** The catalogue product whose stock is being pushed. */
  product: { sku: string; brandId: string; unitsPerCase?: number };
  /** The canonical movement ledger for that product — the ONE source of the figure. */
  movements: readonly InventoryMovement[];
  /** The unit the channel is told (the channel's own vocabulary, `AV-029`). */
  unitOfMeasure?: ChannelInventoryUnit;
}): Promise<ChannelInventoryPushRecord> {
  const unitOfMeasure: ChannelInventoryUnit = input.unitOfMeasure ?? 'Eaches';
  const base = {
    sku: input.product.sku,
    brandId: input.product.brandId,
    unitOfMeasure,
    pushedAt: new Date().toISOString(),
  };
  const refusal = (
    refusalReason: string,
    quantity = 0,
    eaches = 0
  ): ChannelInventoryPushRecord => ({ ...base, quantity, eaches, mode: 'mock', simulated: false, refusal: refusalReason });

  const sku = input.product.sku?.trim();
  if (!sku) return refusal(CHANNEL_INVENTORY_PUSH_REFUSALS.skuMissing);

  const { onHand } = bucketTotals(input.movements);
  if (!Number.isFinite(onHand)) return refusal(CHANNEL_INVENTORY_PUSH_REFUSALS.negativeOnHand);
  if (onHand < 0) return refusal(CHANNEL_INVENTORY_PUSH_REFUSALS.negativeOnHand, onHand, onHand);

  let quantity = onHand;
  if (unitOfMeasure === 'Cases') {
    const unitsPerCase = unitsPerCaseOf(input.product);
    if (!unitsPerCase) return refusal(CHANNEL_INVENTORY_PUSH_REFUSALS.casePackUnknown, onHand, onHand);
    if (onHand % unitsPerCase !== 0) {
      return refusal(CHANNEL_INVENTORY_PUSH_REFUSALS.caseConversionLossy, onHand, onHand);
    }
    quantity = onHand / unitsPerCase;
  }

  const response = await input.reader.submitInventoryUpdate({
    sku,
    quantity,
    unitOfMeasure,
  });
  if (!response.ok) {
    return refusal(response.error ?? 'INVENTORY_PUSH_REFUSED', quantity, onHand);
  }
  return {
    ...base,
    quantity,
    eaches: onHand,
    ...(response.submissionId ? { submissionId: response.submissionId } : {}),
    /** The seam's OWN claim, recorded verbatim — never inferred from configuration. */
    mode: response.simulated ? 'mock' : 'real',
    simulated: !!response.simulated,
  };
}