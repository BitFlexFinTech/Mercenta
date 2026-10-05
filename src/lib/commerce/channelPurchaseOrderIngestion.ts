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
 * §P12 — REPOINTED (old contract recorded). This module's honest limit used to
 * read: *"reading the channel's own PO STATUS (`getPurchaseOrdersStatus`, the
 * receiving sync) is P12's seam work (`AV-040`). Nothing here claims a live
 * channel reading."*
 *
 * P12 built that read (`src/lib/commerce/channelReceivingSync.ts`). This module
 * still makes NO channel-status claim of its own: ingestion routes the PO from its
 * own lines, and the channel's status is read by that separate owner.
 *
 * §BATCH 2c (`AV-024`) — REPOINTED (old contract recorded). This module's re-read
 * branch used to report `already_present` and change NOTHING, whatever the channel
 * said, which is now known to be wrong: the retail channel can change a purchase
 * order after it is issued and the vendor is required to fulfil the UPDATED one
 * (register `AV-024`), so a changed order kept its SUPERSEDED quantities and a
 * brand could ship a superseded purchase order. A polled read is now COMPARED
 * against the held record and a documented change is recorded as a channel-issued
 * REVISION (`src/lib/commerce/poRevisions.ts`), audited as `po_revision_received`,
 * idempotent by CONTENT — a replay of the same channel read finds no change and
 * records nothing — and refused outright when the changed order no longer routes or
 * would move between tenants. The counter `revised` was added for it;
 * `ingested`/`alreadyPresent`/`refused` keep their existing meanings, so no existing
 * consumer's number changes meaning.
 */
import type { PurchaseOrder, ShipToParty } from '@/types';
import { demoAuditLog, demoPurchaseOrders } from '@/data/demoStore';
import { COMMISSION_RATE_PLACEHOLDER } from '@/config/commercial';
import { fcByCode } from '@/config/destinationFc';
import { notifyCanonicalStoreChange } from '@/lib/domain/canonicalSignal';
import {
  applyChannelPoRevision,
  deriveChannelPoRevision,
} from '@/lib/commerce/poRevisions';
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
  status:
    | 'ingested'
    /** §BATCH 2c (`AV-024`) — the channel CHANGED an order this record already held. */
    | 'revised'
    | 'already_present'
    | 'refused';
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
  /**
   * §BATCH 2c (`AV-024`) — how many CHANNEL-ISSUED REVISIONS this read recorded. A
   * replay of the same channel read records nothing (the record already matches the
   * channel's read), so this can never count the same change twice.
   */
  revised: number;
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
    /**
     * §BATCH 2c (`AV-024`) — the channel's declared BASELINE, recorded at ingestion
     * so a later poll compares against what the channel actually said rather than
     * against an absent value. `revisionNumber` starts at 0: the channel has
     * changed nothing since Mercenta filed this order.
     */
    revisionNumber: 0,
    ...(channelPo.orderType
      ? { channelOrderType: channelPo.orderType }
      : {}),
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
  /** The Founder / Super Admin performing the read — every outcome is attributed. */
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
      revised: 0,
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
      /**
       * §BATCH 2c (`AV-024`) — THE CHANNEL MAY HAVE CHANGED THIS ORDER.
       *
       * §BATCH 2c — REPOINTED (old contract recorded): this branch reported
       * `already_present` and changed NOTHING, whatever the channel now said. The
       * retail channel can change a purchase order after it is issued and the
       * vendor is required to fulfil the UPDATED one (register `AV-024`), so that
       * behaviour silently kept the SUPERSEDED quantities — a brand could ship a
       * superseded purchase order. The read is now COMPARED against the record and
       * a documented change is recorded as a channel-issued REVISION.
       *
       * FAIL CLOSED: a changed read that no longer routes, or that routes to a
       * DIFFERENT tenant, is refused and the held order is left exactly as it is.
       * A channel order is one brand's order and never moves between tenants.
       */
      const verdict = routeChannelPurchaseOrder(channelPo, input.catalogue);
      if (!verdict.ok) {
        outcomes.push({
          channelPurchaseOrderId: channelPo.purchaseOrderId,
          status: 'refused',
          brandId: null,
          reason: `${verdict.reason} The order already held is left exactly as it is.`,
        });
        continue;
      }
      if (verdict.brandId !== existing.brandId) {
        outcomes.push({
          channelPurchaseOrderId: channelPo.purchaseOrderId,
          status: 'refused',
          brandId: null,
          reason:
            `${channelPo.purchaseOrderId} is held for ${existing.brandId}, but the channel's read now routes to ` +
            `${verdict.brandId} — a channel order is one brand's order and never moves between tenants. Held for ` +
            `Mercenta review; nothing was changed.`,
        });
        continue;
      }

      const now = clock();
      const derived = deriveChannelPoRevision(existing, channelPo, now.toISOString());
      if (!derived.ok) {
        if (derived.code === 'CHANNEL_REVISION_UNCHANGED') {
          outcomes.push({
            channelPurchaseOrderId: channelPo.purchaseOrderId,
            status: 'already_present',
            brandId: existing.brandId,
            po: existing,
            reason:
              `${channelPo.purchaseOrderId} is already held for ${existing.brandId} at version ` +
              `${existing.revisionNumber ?? 0} — the channel's read carries no change against it.`,
          });
        } else {
          outcomes.push({
            channelPurchaseOrderId: channelPo.purchaseOrderId,
            status: 'refused',
            brandId: null,
            reason: derived.reason,
          });
        }
        continue;
      }

      const revision = derived.revision;
      /**
       * NO SEPARATE REPLAY GUARD IS NEEDED — and one would be harmful. Applying a
       * revision leaves the record matching the channel's read, so a replay finds no
       * change and reports `already_present`; a guard keyed on the digest would
       * instead SKIP a genuine re-read of an earlier snapshot and leave the record
       * holding a superseded version, which is the defect `AV-024` is about.
       */
      applyChannelPoRevision(existing, revision, channelPo);
      notifyCanonicalStoreChange();
      demoAuditLog.push({
        id: `audit-${now.getTime()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: now.toISOString(),
        actorId: input.actorId,
        action: 'po_revision_received',
        entityType: 'purchase_order',
        entityId: existing.id,
        brandId: existing.brandId,
        reason:
          `${input.actorId}: the retail channel changed ${channelPo.purchaseOrderId} — revision ` +
          `${revision.revisionNumber} recorded (${revision.changeKinds.join(', ')})${revision.simulated ? '. Simulated channel read; no live channel call was made.' : '.'}`,
        metadata: {
          actorId: input.actorId,
          channelSource: CHANNEL_PO_SOURCE,
          revisionNumber: revision.revisionNumber,
          revisionDigest: revision.digest,
          changeKinds: revision.changeKinds,
          previousPoValue: revision.previousPoValue,
          newPoValue: revision.newPoValue,
          undercutsAcknowledgement: revision.undercutsAcknowledgement,
          simulated: revision.simulated,
        },
      });
      outcomes.push({
        channelPurchaseOrderId: channelPo.purchaseOrderId,
        status: 'revised',
        brandId: existing.brandId,
        po: existing,
        reason: `${channelPo.purchaseOrderId}: revision ${revision.revisionNumber} recorded — ${revision.changeKinds.join(', ')}.`,
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
    /**
     * §BATCH 2c (`AV-024`) — a channel-issued revision is counted SEPARATELY from an
     * ingestion, so a read's report can never present a revised order as a new one
     * (or hide the change inside `already_present`).
     */
    revised: outcomes.filter((o) => o.status === 'revised').length,
    outcomes,
  };
}

