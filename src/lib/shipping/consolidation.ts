/**
 * §P10 (programme `docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md` §4 P10)
 * — CONSOLIDATION POSTURE (programme decision 11).
 *
 * THE DECISION, RECORDED IN CODE (not only in a document)
 * -------------------------------------------------------
 * The channel DOES document multi-purchase-order grouping, and the programme's research
 * table records it verbatim (programme §3): the shipment request payload carries
 * `"purchaseOrders": [ {…}, {…} ]`, the ASN references the purchase order **per carton**
 * (`itemDetails.purchaseOrderNumber`), and there is *"a limit of 100 shipment
 * confirmations for every truckload shipment"*.
 *
 * Today POs arrive separately, so the platform ships **one purchase order = one
 * consignment**, and the Founder decided (decision 11, 2026-09-22) that consolidation is
 * **DEFERRED but NOT designed out**: the model supports **1..n purchase orders** on a
 * consignment, while the grouping input is not implemented.
 *
 * WHAT IS REAL HERE
 * -----------------
 * The 1..n shape is FUNCTIONAL, today, in this one owner: a consignment's declared
 * purchase orders are normalised and validated whether it declares one or many. What is
 * deferred is the INPUT — nothing writes more than one yet, because purchase orders
 * arrive separately.
 *
 * §P12 — REPOINTED (old contract recorded): this comment used to say the grouping
 * "arrives with the channel's shipment request, which is P12's declared SP-API scope".
 * P12 DELIVERED that shipment request
 * (`src/lib/shipping/channelShipmentOperations.ts` → `submitShipmentRequest`, carrying
 * the declared set), so what remains deferred is the grouping INPUT only — the Founder's
 * decision 11 stands, and `shipmentRequestImplemented` records the delivered half.
 *
 * THE INVARIANTS THAT MUST SURVIVE THE DEFERRAL
 * ---------------------------------------------
 *   1. TENANT ISOLATION: a consignment never groups purchase orders from two brands.
 *   2. COMPLETENESS: a consignment declares every purchase order it carries.
 *   3. NO DUPLICATES: declaring the same purchase order twice is a data error, refused.
 *   4. The channel's truckload confirmation limit is stated here so a future grouping
 *      implementation cannot silently exceed it.
 */

/** The channel's declared bound, verbatim from the research table (programme §3). */
export const TRUCKLOAD_CONFIRMATION_LIMIT = 100;

export interface ConsolidationPosture {
  /** DEFERRED by Founder decision — never silently implemented, never designed out. */
  status: 'deferred';
  decision: string;
  /** What the platform does today. */
  today: string;
  /** What the model supports (functionally, in this owner). */
  modelSupports: string;
  /** The documented channel evidence the decision rests on. */
  evidence: readonly string[];
  /** What would activate grouping (declared scope, not implemented here). */
  activation: string;
  /**
   * §P12 — TRUE once the declared activation (the channel's shipment request)
   * exists in the seam. The POSTURE stays `deferred`: the Founder's decision 11 is
   * about the grouping INPUT arriving with separately-issued purchase orders, not
   * about the seam operation.
   */
  shipmentRequestImplemented: boolean;
  /** The invariants a future grouping implementation must honour. */
  invariants: readonly string[];
}

/**
 * THE canonical consolidation posture. One declaration, consumed by the brand Logistics
 * Hub, the admin Logistics Hub, the programme document and the validator — so the
 * surfaces and the documentation cannot drift apart.
 */
export const CONSOLIDATION_POSTURE: ConsolidationPosture = {
  status: 'deferred',
  decision: 'Programme decision 11 (2026-09-22): deferred, but not designed out.',
  today:
    'One purchase order = one consignment. Each incoming channel PO is shipped on its own consignment.',
  modelSupports:
    'A consignment declares 1..n purchase orders. The declaration, its validation and its invariants are implemented in this owner; only the grouping input is deferred.',
  evidence: [
    'The channel\'s shipment request payload carries "purchaseOrders": [ {…}, {…} ] — grouping is documented.',
    'The ASN references the purchase order per carton (itemDetails.purchaseOrderNumber).',
    '"a limit of 100 shipment confirmations for every truckload shipment".',
  ],
  activation:
    'The channel shipment request (SubmitShipments + the per-carton PO reference) — declared as P12’s scope and DELIVERED by P12: src/lib/shipping/channelShipmentOperations.ts submits the consignment’s declared 1..n purchase-order set through the SP-API seam. The grouping INPUT (choosing several purchase orders into one consignment) remains a product decision, because purchase orders still arrive separately.',
  /** §P12 — the declared activation is IMPLEMENTED (the seam operation exists). */
  shipmentRequestImplemented: true,
  invariants: [
    'A consignment never groups purchase orders belonging to different brands.',
    'A grouped consignment declares every purchase order it carries; an empty declaration is refused.',
    'A duplicate purchase-order declaration is refused as a data error, not silently de-duplicated.',
    `No grouping may exceed ${TRUCKLOAD_CONFIRMATION_LIMIT} shipment confirmations for a truckload shipment.`,
  ],
};

export interface ConsignmentPurchaseOrderDeclaration {
  /** The consignment's canonical purchase order (the store's single value today). */
  poNumber: string;
  /**
   * Additional purchase orders the consignment declares. Nothing writes these yet — the
   * grouping input is deferred — but the shape is accepted and validated NOW, so enabling
   * grouping is an input change rather than a model change.
   */
  poNumbers?: readonly string[];
}

export interface ConsignmentPurchaseOrders {
  /** The declared set, normalised (never empty, never duplicated). */
  poNumbers: string[];
  /** True when the consignment carries more than one purchase order. */
  grouped: boolean;
  posture: ConsolidationPosture;
}

/** Declared purchase orders of a consignment, normalised and validated (1..n). */
export function consignmentPurchaseOrders(
  declaration: ConsignmentPurchaseOrderDeclaration
): ConsignmentPurchaseOrders {
  const poNumber = declaration.poNumber?.trim();
  if (!poNumber) {
    throw new Error(
      'A consignment must declare its purchase order; an empty declaration is refused.'
    );
  }
  const extra = (declaration.poNumbers ?? []).map((value) => value.trim()).filter(Boolean);
  const duplicates = extra.filter(
    (value) => value === poNumber || extra.indexOf(value) !== extra.lastIndexOf(value)
  );
  if (duplicates.length > 0) {
    throw new Error(
      `Duplicate purchase-order declaration refused: ${[...new Set(duplicates)].join(', ')}.`
    );
  }
  const poNumbers = [poNumber, ...extra];
  return { poNumbers, grouped: poNumbers.length > 1, posture: CONSOLIDATION_POSTURE };
}

export interface ConsolidationCheckInput {
  /** The consignment's brand — the tenant boundary that must not be crossed. */
  brandId: string;
  purchaseOrders: readonly { poNumber: string; brandId: string }[];
}

export type ConsolidationCheck =
  | { ok: true; poNumbers: string[] }
  | { ok: false; error: string };

/**
 * The pre-condition a future grouping implementation must pass: at least one purchase
 * order, every purchase order belonging to the consignment's own brand, each declared
 * once, within the channel's truckload confirmation limit. Refusals are returned as
 * values (not thrown) so a caller can surface the exact reason.
 */
export function checkConsolidatable(input: ConsolidationCheckInput): ConsolidationCheck {
  if (input.purchaseOrders.length === 0) {
    return { ok: false, error: 'A consignment must declare at least one purchase order.' };
  }
  const seen = new Set<string>();
  for (const po of input.purchaseOrders) {
    if (po.brandId !== input.brandId) {
      return {
        ok: false,
        error: `Consolidation refused: purchase order ${po.poNumber} belongs to another brand. A consignment never groups across tenants.`,
      };
    }
    if (seen.has(po.poNumber)) {
      return {
        ok: false,
        error: `Consolidation refused: purchase order ${po.poNumber} is declared twice.`,
      };
    }
    seen.add(po.poNumber);
  }
  if (seen.size > TRUCKLOAD_CONFIRMATION_LIMIT) {
    return {
      ok: false,
      error: `Consolidation refused: ${seen.size} purchase orders exceed the channel's limit of ${TRUCKLOAD_CONFIRMATION_LIMIT} shipment confirmations for a truckload shipment.`,
    };
  }
  return { ok: true, poNumbers: [...seen] };
}
