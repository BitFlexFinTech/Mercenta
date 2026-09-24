/**
 * §P12 — THE ONE OWNER OF THE CHANNEL'S OWN RECEIVING STATE (the receiving sync).
 *
 * Programme `docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md` §4 P12;
 * register **`AV-040`**; source `S5` / register **`AV-018`**:
 *
 *   `receivingStatus` = *"the Amazon fulfillment center received status and
 *   received quantity"*.
 *
 * Until §P12, Mercenta's receiving status was established ONLY by Mercenta's own
 * receiving step (`src/lib/commerce/receivingStatus.ts` said so honestly, and named
 * `getPurchaseOrdersStatus` as P12's work). This module is that sync: it reads the
 * CHANNEL's own PO state and per-line received quantities through the SP-API seam
 * (mock-first) and reports them against the canonical purchase order.
 *
 * WHAT IS DELIBERATELY SEPARATED
 * ------------------------------
 *   · `readChannelReceivingStatus` is PURE — it reads and compares, writes nothing.
 *     So the validator can execute the real mapping arithmetic against a live or a
 *     simulated channel without touching canonical state.
 *   · `applyChannelReceivingReading` is the WRITE path, and it FAILS CLOSED on
 *     provenance: a SIMULATED channel reading is never written into a canonical
 *     purchase order as a receipt. Writing a simulated quantity would turn a
 *     simulation into an apparent real receipt — the one thing mock-first policy
 *     forbids outright.
 *
 * TENANT ISOLATION: a reading is matched to a canonical PO by its number (which IS
 * the channel's PO number — decision 3), and the apply path refuses an actor whose
 * tenant pin differs from the PO's brand.
 *
 * HONEST LIMIT: with no live LWA connection the seam's mock answers, so every
 * reading is marked `simulated` and none of it can be applied. The sync becomes
 * operational the moment real credentials are configured — a credentials change,
 * not a code change.
 */
import type { PurchaseOrder, ReceivingStatus } from '@/types';
import type {
  ChannelPurchaseOrderStatus,
  ChannelPurchaseOrdersStatusResult,
} from '@/lib/spapi/client';
import { demoPurchaseOrders } from '@/data/demoStore';
import { deriveReceivingStatus } from './receivingStatus';

/** The seam shape this owner needs — the SP-API client satisfies it exactly. */
export interface ChannelReceivingStatusReader {
  getPurchaseOrdersStatus(purchaseOrderIds: string[]): Promise<ChannelPurchaseOrdersStatusResult>;
}

export interface ChannelReceivingLineReading {
  vendorSku: string;
  /** What the channel ordered. */
  orderedQty: number;
  /** What the channel's FC has logged as received. */
  receivedQty: number;
}

export interface ChannelReceivingReading {
  /** The channel's own PO identity (the canonical `poNumber` — decision 3). */
  channelPurchaseOrderId: string;
  poId: string;
  brandId: string;
  /** The channel's own PO state. */
  channelStatus: ChannelPurchaseOrderStatus['status'];
  /** The channel's own receiving state, mapped onto Mercenta's vocabulary. */
  channelReceivingStatus: ReceivingStatus;
  lines: ChannelReceivingLineReading[];
  receivedDate?: string;
  /** Mercenta's own derived status — reported for comparison, never overwritten by a read. */
  mercentaReceivingStatus: ReceivingStatus;
  /** TRUE when the channel's view and Mercenta's own disagree. */
  differs: boolean;
  /** TRUE whenever this reading could not have come from a live channel call. */
  simulated: boolean;
}

export interface ChannelReceivingRefusal {
  channelPurchaseOrderId: string;
  reason: string;
}

export interface ChannelReceivingSyncResult {
  ok: boolean;
  /**
   * `unknown` when the channel returned no readable status at all — never guessed
   * from configuration.
   */
  mode: 'mock' | 'real' | 'unknown';
  readings: ChannelReceivingReading[];
  refused: ChannelReceivingRefusal[];
  /** Ids the CHANNEL does not know — reported, never silently dropped. */
  unknownPurchaseOrderIds: string[];
  error?: string;
}

export const CHANNEL_RECEIVING_SYNC_REFUSALS = {
  notInStore:
    'PO_NOT_IN_STORE — the channel reported a purchase order Mercenta does not hold, so there is nothing to sync it against.',
} as const;

/** The provenance of a set of readings — stated from the seam's own flags. */
function modeOf(readings: readonly ChannelReceivingReading[]): 'mock' | 'real' | 'unknown' {
  if (readings.length === 0) return 'unknown';
  return readings.every((r) => r.simulated) ? 'mock' : 'real';
}

/**
 * Read the channel's own PO + receiving state for the purchase orders given
 * (default: every purchase order Mercenta holds), and report each against its
 * canonical record. Writes NOTHING.
 */
export async function readChannelReceivingStatus(input: {
  reader: ChannelReceivingStatusReader;
  /** Defaults to the whole canonical purchase-order set. */
  purchaseOrders?: readonly PurchaseOrder[];
  /** The ids to ask about; defaults to those purchase orders' own numbers. */
  purchaseOrderIds?: readonly string[];
}): Promise<ChannelReceivingSyncResult> {
  const purchaseOrders = input.purchaseOrders ?? demoPurchaseOrders;
  const ids = (input.purchaseOrderIds ?? purchaseOrders.map((po) => po.poNumber))
    .map((value) => value.trim())
    .filter(Boolean);

  if (ids.length === 0) {
    return { ok: true, mode: 'unknown', readings: [], refused: [], unknownPurchaseOrderIds: [] };
  }

  const read = await input.reader.getPurchaseOrdersStatus(ids);
  if (!read.ok) {
    return {
      ok: false,
      mode: 'unknown',
      readings: [],
      refused: [],
      unknownPurchaseOrderIds: [],
      error:
        read.error ??
        'The retail channel did not return a purchase-order status read; nothing was synced.',
    };
  }

  const byNumber = new Map(purchaseOrders.map((po) => [po.poNumber, po]));
  const readings: ChannelReceivingReading[] = [];
  const refused: ChannelReceivingRefusal[] = [];

  for (const status of read.statuses ?? []) {
    const po = byNumber.get(status.purchaseOrderId);
    if (!po) {
      refused.push({
        channelPurchaseOrderId: status.purchaseOrderId,
        reason: CHANNEL_RECEIVING_SYNC_REFUSALS.notInStore,
      });
      continue;
    }
    const mercentaReceivingStatus = deriveReceivingStatus(po);
    readings.push({
      channelPurchaseOrderId: status.purchaseOrderId,
      poId: po.id,
      brandId: po.brandId,
      channelStatus: status.status,
      channelReceivingStatus: status.receivingStatus,
      lines: status.lines.map((line) => ({
        vendorSku: line.vendorSku,
        orderedQty: line.orderedQty,
        receivedQty: line.receivedQty,
      })),
      ...(status.receivedDate ? { receivedDate: status.receivedDate } : {}),
      mercentaReceivingStatus,
      differs: status.receivingStatus !== mercentaReceivingStatus,
      simulated: status.simulated,
    });
  }

  return {
    ok: true,
    mode: modeOf(readings),
    readings,
    refused,
    unknownPurchaseOrderIds: read.unknownPurchaseOrderIds ?? [],
  };
}

export interface ChannelReceivingWriter {
  /**
   * The canonical receiving write (wired to
   * `commerceLifecycle.receiveCommercePurchaseOrder` at the app seam). Injected
   * rather than imported so this owner stays executable in isolation.
   */
  receive(input: {
    poId: string;
    receivedBySku: Record<string, number>;
    actorId: string;
  }): { ok: boolean; error?: string; receivingStatus?: ReceivingStatus };
}

export interface ChannelReceivingApplyResult {
  ok: boolean;
  /** The canonical receiving status after the write. */
  receivingStatus?: ReceivingStatus;
  /** A stated refusal — never a silent no-op. */
  refusal?: string;
}

export const CHANNEL_RECEIVING_APPLY_REFUSALS = {
  simulatedRead:
    'CHANNEL_READ_SIMULATED — this reading was produced by the simulated channel, so it is NOT written as a canonical receipt. A simulated quantity must never appear as received stock; configure live channel credentials to sync for real.',
} as const;

/**
 * Apply a LIVE channel reading to the canonical purchase order through the
 * canonical receiving path — the ONLY way a channel reading becomes a receipt.
 *
 * FAIL CLOSED: a simulated reading is refused outright, and a refusal from the
 * canonical writer (RBAC, tenant pin, illegal transition) is passed through
 * unchanged rather than swallowed.
 */
export function applyChannelReceivingReading(input: {
  reading: ChannelReceivingReading;
  writer: ChannelReceivingWriter;
  actorId: string;
}): ChannelReceivingApplyResult {
  if (input.reading.simulated) {
    return { ok: false, refusal: CHANNEL_RECEIVING_APPLY_REFUSALS.simulatedRead };
  }
  const receivedBySku: Record<string, number> = {};
  for (const line of input.reading.lines) {
    receivedBySku[line.vendorSku] = Math.max(0, line.receivedQty);
  }
  const written = input.writer.receive({
    poId: input.reading.poId,
    receivedBySku,
    actorId: input.actorId,
  });
  if (!written.ok) return { ok: false, refusal: written.error ?? 'CHANNEL_RECEIVING_WRITE_REFUSED' };
  return {
    ok: true,
    ...(written.receivingStatus ? { receivingStatus: written.receivingStatus } : {}),
  };
}