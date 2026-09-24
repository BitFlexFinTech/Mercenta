/**
 * §P11 — THE ONE OWNER of CHANNEL PURCHASE-ORDER INGESTION (mock-first).
 *
 * Programme `docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md` decision 3:
 *
 *   **One PO record = the PO from Amazon.** The Mercenta→brand commercial
 *   position is DERIVED from the brand's Model A/B. **No second PO document.
 *   No "Create PO" anywhere.**
 *
 * So a purchase order is never created inside Mercenta. It ARRIVES, addressed to
 * Mercenta, and Mercenta's job is to identify the brand it belongs to and route
 * it into that brand's workspace:
 *
 *   retail channel → Mercenta → the correct brand
 *
 * This module is that routing step. It is the ONLY place a channel PO becomes a
 * canonical `PurchaseOrder`, and it FAILS CLOSED on everything it cannot route:
 *
 *   · a PO with no lines                          → refused (`CHANNEL_PO_EMPTY`)
 *   · a line that matches no catalogue product    → refused (out of scope — the
 *     approved-category catalogue is the platform's own limit)
 *   · lines that map to MORE THAN ONE brand       → refused (needs Mercenta review;
 *     a channel PO is one brand's order)
 *
 * TENANT ISOLATION: the brand is DERIVED from the channel PO's own lines, never
 * supplied by a caller, so a PO can never be filed against a tenant whose
 * catalogue does not contain the ordered products.
 *
 * MOCK-FIRST: the channel read goes through `src/lib/spapi` — the MockAmazon
 * client until real LWA credentials are configured in the Integrations wizard,
 * then the real client with ZERO changes here. The seam itself declares whether
 * the response was simulated; the ingested record then carries that provenance
 * (`mode`/`simulated`) and never presents a simulated PO as a live channel
 * transaction.
 *
 * COMMERCIAL POSITION: this module never computes a margin. The Mercenta→brand
 * commercial position is derived from the brand's Model A/B by the canonical
 * owner (`src/lib/finance/commercialModel.ts`); the PO's `commissionRate` /
 * `commissionAmount` carry the platform's declared `COMMISSION_RATE_PLACEHOLDER`
 * exactly like every other purchase-order record.
 *
 * HONEST LIMIT: reading the channel's own PO STATUS (`getPurchaseOrdersStatus`,
 * the receiving sync) is **P12's** seam work (`AV-040`). Nothing here claims a
 * live channel reading.
 */
import type { PurchaseOrder, ShipToParty } from '@/types';
import { demoAuditLog, demoPurchaseOrders } from '@/data/demoStore';
import { COMMISSION_RATE_PLACEHOLDER } from '@/config/commercial';
import { fcByCode } from '@/config/destinationFc';
import { notifyCanonicalStoreChange } from '@/lib/domain/canonicalSignal';
import type {
  ChannelPurchaseOrder,
  ChannelPurchaseOrderReadResult,
} from '@/lib/spapi/client';

/** The channel this ingestion path reads. Declared once (never re-typed). */
export const CHANNEL_PO_SOURCE = 'amazon_vendor_central';

/**
 * The routing catalogue: the products Mercenta may sell on the channel. A
 * channel PO line is matched to one of these by its vendor SKU (the channel's
 * own order field) and, when the product has been accepted, by its ASIN.
 */
export interface ChannelCatalogueEntry {
  sku: string;
  brandId: string;
  /** The channel identifier, once the product is accepted on the channel. */
  asin?: string;
}

/** Why a channel PO could not be routed. Fail-closed codes, never free text. */
export type ChannelRoutingRefusal =
  | 'CHANNEL_PO_EMPTY'
  | 'CHANNEL_PO_LINE_NOT_IN_CATALOGUE'
  | 'CHANNEL_PO_CROSSES_TENANTS';

export type ChannelRoutingVerdict =
  | { ok: true; brandId: string }
  | { ok: false; code: ChannelRoutingRefusal; reason: string };


/**
 * Route a channel PO to its brand from the PO's OWN lines.
 *
 * Nothing is guessed: an unmatched line refuses the whole PO (a partial
 * ingestion would file a PO whose contents Mercenta cannot fully account for).
 */
export function routeChannelPurchaseOrder(
  po: ChannelPurchaseOrder,
  catalogue: ChannelCatalogueEntry[]
): ChannelRoutingVerdict {
  const lines = po.lines ?? [];
  if (lines.length === 0) {
    return {
      ok: false,
      code: 'CHANNEL_PO_EMPTY',
      reason: `${po.purchaseOrderId}: the channel returned a purchase order with no lines — nothing to route.`,
    };
  }

  const brands = new Set<string>();
  for (const line of lines) {
    const bySku = catalogue.find(
      (e) => e.sku.toLowerCase() === (line.vendorSku ?? '').toLowerCase()
    );
    const match =
      bySku ?? (line.asin ? catalogue.find((e) => e.asin && e.asin === line.asin) : undefined);
    if (!match) {
      return {
        ok: false,
        code: 'CHANNEL_PO_LINE_NOT_IN_CATALOGUE',
        reason: `${po.purchaseOrderId}: line SKU ${line.vendorSku} matches no product in the Mercenta catalogue — out of scope, held for Mercenta review.`,
      };
    }
    brands.add(match.brandId);
  }

  if (brands.size > 1) {
    return {
      ok: false,
      code: 'CHANNEL_PO_CROSSES_TENANTS',
      reason: `${po.purchaseOrderId}: lines map to more than one brand (${[...brands]
        .sort()
        .join(', ')}) — a channel PO is one brand's order and is held for Mercenta review.`,
    };
  }

  return { ok: true, brandId: [...brands][0]! };
}

/** The minimal channel read this owner needs — the SP-API client satisfies it. */
export interface ChannelPoReader {
  fetchPurchaseOrders(sinceIso: string): Promise<ChannelPurchaseOrderReadResult>;
}

export interface ChannelIngestionOutcome {
  channelPurchaseOrderId: string;
  status: 'ingested' | 'already_present' | 'refused';
  /** The tenant the PO was routed to, or null when it was refused. */
  brandId: string | null;
  reason?: string;
  po?: PurchaseOrder;
}

export interface ChannelIngestionResult {
  ok: boolean;
  /**
   * Which seam produced the read — stated by the CALLER that selected the client
   * (`src/lib/spapi`), never guessed here. `mock` means NO live channel call.
   */
  mode?: 'mock' | 'real';
  /** How many POs the channel returned for this read. */
  polled: number;
  ingested: number;
  alreadyPresent: number;
  refused: number;
  outcomes: ChannelIngestionOutcome[];
  error?: string;
}

/** The destination the CHANNEL declared. An unknown code is never replaced. */
function shipToPartyFor(shipToPartyId: string): ShipToParty {
  const known = fcByCode(shipToPartyId);
  if (!known) return { partyId: shipToPartyId };
  return {
    partyId: known.code,
    name: known.name,
    city: known.city,
    postcode: known.postcode,
  };
}

/**
 * Build the ONE canonical record from the channel's own PO. The value is
 * recomputed from the channel's own lines (the detail is the truth) and the
 * channel's declared total is retained in the audit record, so a mismatch is
 * visible rather than silently adopted.
 */
function buildPurchaseOrder(
  channelPo: ChannelPurchaseOrder,
  brandId: string,
  now: Date
): PurchaseOrder {
  const poValue =
    Math.round(channelPo.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0) * 100) / 100;
  const windows =
    channelPo.freightTerm === 'collect'
      ? {
          shipWindowStart: channelPo.shipWindowStart,
          shipWindowEnd: channelPo.shipWindowEnd,
        }
      : {
          deliveryWindowStart: channelPo.deliveryWindowStart,
          deliveryWindowEnd: channelPo.deliveryWindowEnd,
        };
  const declaredWindow =
    channelPo.freightTerm === 'collect'
      ? windows.shipWindowStart && windows.shipWindowEnd
        ? windows
        : {}
      : windows.deliveryWindowStart && windows.deliveryWindowEnd
        ? windows
        : {};
  return {
    /** Deterministic: replaying the same channel PO cannot mint a second record. */
    id: `po-channel-${channelPo.purchaseOrderId}`,
    brandId,
    /** Decision 3 — the record's number IS the channel's own PO number. */
    poNumber: channelPo.purchaseOrderId,
    status: 'received',
    shipToParty: shipToPartyFor(channelPo.shipToPartyId),
    poValue,
    commissionRate: COMMISSION_RATE_PLACEHOLDER,
    commissionAmount: Math.round(((poValue * COMMISSION_RATE_PLACEHOLDER) / 100) * 100) / 100,
    orderDate: channelPo.orderDate,
    freightTerm: channelPo.freightTerm,
    ...declaredWindow,
    lineItems: channelPo.lines.map((l) => ({
      sku: l.vendorSku,
      productName: l.productName ?? l.vendorSku,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      commodityCode: l.commodityCode ?? '00000000',
    })),
    /** Truthful provenance — present only when the seam says it was simulated. */
    ...(channelPo.simulated ? { mode: 'simulation' as const, simulated: true } : {}),
    /** Retained so no surface has to re-derive when the PO arrived. */
    receivedAt: now.toISOString(),
  };
}


/**
 * Read the retail channel for purchase orders and land every routable one in the
 * canonical store. Idempotent, attributed and audited.
 */
export async function ingestChannelPurchaseOrders(input: {
  reader: ChannelPoReader;
  catalogue: ChannelCatalogueEntry[];
  sinceIso: string;
  /** The Mercenta operator performing the read — every outcome is attributed. */
  actorId: string;
  /** Injectable clock (deterministic tests). */
  now?: () => Date;
}): Promise<ChannelIngestionResult> {
  const read = await input.reader.fetchPurchaseOrders(input.sinceIso);
  if (!read.ok) {
    return {
      ok: false,
      polled: 0,
      ingested: 0,
      alreadyPresent: 0,
      refused: 0,
      outcomes: [],
      error:
        read.error ??
        'The retail channel did not return a purchase-order read; nothing was ingested.',
    };
  }

  const received = read.purchaseOrders ?? [];
  const clock = input.now ?? (() => new Date());
  const outcomes: ChannelIngestionOutcome[] = [];

  for (const channelPo of received) {
    /**
     * IDEMPOTENCY — a channel PO id is the record's identity, so a re-read can
     * never duplicate it (and an advanced PO is never reset by a replay).
     */
    const existing = demoPurchaseOrders.find((p) => p.poNumber === channelPo.purchaseOrderId);
    if (existing) {
      outcomes.push({
        channelPurchaseOrderId: channelPo.purchaseOrderId,
        status: 'already_present',
        brandId: existing.brandId,
        po: existing,
        reason: `${channelPo.purchaseOrderId} is already held for ${existing.brandId} — a channel purchase order cannot be ingested twice.`,
      });
      continue;
    }

    const verdict = routeChannelPurchaseOrder(channelPo, input.catalogue);
    if (!verdict.ok) {
      outcomes.push({
        channelPurchaseOrderId: channelPo.purchaseOrderId,
        status: 'refused',
        brandId: null,
        reason: verdict.reason,
      });
      continue;
    }

    const now = clock();
    const po = buildPurchaseOrder(channelPo, verdict.brandId, now);
    demoPurchaseOrders.push(po);
    /**
     * A canonical change is announced by the ONE signal. Emitted here, as the
     * record is filed, so the announcement is a statement of its own (the
     * canonical-propagation gate requires exactly that) and only ever fires when
     * a purchase order actually entered the store.
     */
    notifyCanonicalStoreChange();
    demoAuditLog.push({
      id: `audit-${now.getTime()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: now.toISOString(),
      actorId: input.actorId,
      action: 'po_ingested',
      entityType: 'purchase_order',
      entityId: po.id,
      brandId: verdict.brandId,
      reason: `${input.actorId}: routed channel PO ${channelPo.purchaseOrderId} to ${verdict.brandId} — ${channelPo.lines.length} line(s), GBP ${po.poValue.toFixed(2)}${
        channelPo.simulated ? '. Simulated channel read; no live channel call was made.' : '.'
      }`,
      metadata: {
        actorId: input.actorId,
        channelSource: CHANNEL_PO_SOURCE,
        channelDeclaredPoValue: channelPo.poValue,
        routedTo: verdict.brandId,
        lineCount: channelPo.lines.length,
        simulated: channelPo.simulated,
      },
    });
    outcomes.push({
      channelPurchaseOrderId: channelPo.purchaseOrderId,
      status: 'ingested',
      brandId: verdict.brandId,
      po,
    });
  }

  /** Any change to the canonical store was announced as each record was filed. */

  return {
    ok: true,
    polled: received.length,
    ingested: outcomes.filter((o) => o.status === 'ingested').length,
    alreadyPresent: outcomes.filter((o) => o.status === 'already_present').length,
    refused: outcomes.filter((o) => o.status === 'refused').length,
    outcomes,
  };
}

