/**
 * §BATCH1a — THE INTEGRATION PROXY ROUTE MANIFEST (the ONE owner).
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The REAL provider clients (`src/lib/spapi/client.ts`, `src/lib/dhl/client.ts`,
 * `src/lib/palletline/client.ts`) already call server-side Edge-Function routes
 * that DID NOT EXIST in this repository — there was no `spapi`, `dhl` or
 * `palletline` function at all (only 9 unrelated ones). So entering a real key
 * could never make anything sync: the helpers had to be written first.
 *
 * This module is the ONE declaration of:
 *   1. every route a real client calls (method + path pattern + the client
 *      method that calls it, so coverage is checkable against the CLIENT source);
 *   2. what the helper does with each route in SIMULATION (mirroring the mock
 *      clients' shapes and their deterministic behaviour);
 *   3. whether a route has a provider contract whose wire mapping this platform
 *      can already write (`liveStatus: 'confirmed'`) or does not
 *      (`liveStatus: 'unsupported'`), in which case live mode REFUSES with a
 *      STATED code and an explicit reason instead of inventing a call.
 *
 * MODE RULES (mock-first policy + fail-closed)
 * --------------------------------------------
 *  - No credential reference, or a `mock:` reference → SIMULATION. Zero network
 *    calls, every identifier unmistakably fake (`MOCK-…` / `SIM-…`) and every
 *    response labelled `simulated: true` + `mode: 'simulation'`.
 *  - A `vault:` reference → LIVE. The provider function resolves the secret
 *    server-side; if it cannot, it answers 503 and makes NO call. A refusal for
 *    an unsupported route happens BEFORE any credential or network work.
 *  - ANYTHING ELSE (unknown scheme, `live:…`, a malformed ref) → UNKNOWN →
 *    503, FAIL CLOSED. An unknown mode is NEVER treated as simulation.
 *
 * The clients are the wire contract; `scripts/validate-integration-proxy.mjs`
 * derives every route FROM the client sources and proves each one is declared
 * here and served — and it executes this module, so the gate can genuinely fail.
 */

export type ProxyProviderId = 'spapi' | 'dhl' | 'palletline';

/** The deployed Edge-Function NAME each provider's real client targets. */
export const PROXY_FUNCTION_NAME: Record<ProxyProviderId, string> = {
  spapi: 'spapi',
  dhl: 'dhl',
  palletline: 'palletline',
};

/**
 * The `edgeFunctionBase` each provider's real client is built with — the wire
 * fact a caller must pass (`createSpApiClientForConnection`, `createDhlClientForConnection`,
 * `createPalletlineClientForConnection`). Verified against the call sites in
 * `src/data/api.ts` (spapi), `src/lib/commerce/proxyProcessor.ts` (spapi),
 * `src/lib/dhl/domain.ts` (dhl) and the palletline client's own path literals.
 *
 * NOTE the asymmetry, which is why this is declared rather than assumed: the
 * spapi and dhl bases INCLUDE the function name, while Palletline is called with
 * the shared `/functions/v1` base and carries `palletline` as its first path
 * segment. A route `pattern` below is therefore always the path the FUNCTION
 * receives (after `/functions/v1/<name>` has been consumed).
 */
export const PROXY_CLIENT_BASE: Record<ProxyProviderId, string> = {
  spapi: '/functions/v1/spapi',
  dhl: '/functions/v1/dhl',
  palletline: '/functions/v1',
};

/**
 * Normalise a client-relative path into the path the FUNCTION receives: a
 * leading segment equal to the function name is consumed exactly once. Applied
 * identically at runtime (`proxyRequestTarget`) and by the validator, so the
 * derivation cannot diverge from the runtime.
 */
export function normalizeFunctionPath(provider: ProxyProviderId, clientPath: string): string {
  const segments = pathSegments(clientPath);
  if (segments[0] === PROXY_FUNCTION_NAME[provider]) segments.shift();
  return `/${segments.join('/')}`;
}


/** The one label every simulated response carries. */
export const SIMULATION_MODE = 'simulation';
export const SIMULATION_NOTE =
  'SIMULATION — no live provider call was made and no provider credential was used.';

export type ProxyLiveStatus = 'confirmed' | 'unsupported';

export interface ProxyRoute {
  /** Stable id, used by the validator and by logs. */
  id: string;
  provider: ProxyProviderId;
  method: 'GET' | 'POST';
  /** Path RELATIVE to the provider's Edge-Function base. `{param}` = one segment. */
  pattern: string;
  /** The client method that calls this route — the coverage anchor. */
  clientMethod: string;
  /** The client file the route was derived from. */
  clientFile: string;
  /**
   * `confirmed`   — the provider's documented contract is implemented in live mode.
   * `unsupported` — live mode REFUSES (see `liveRefusal`), because the platform
   *                 does not hold a required input or the provider's contract is
   *                 not confirmed. Never silently guessed.
   */
  liveStatus: ProxyLiveStatus;
  /** Stated code returned in live mode when `liveStatus` is `unsupported`. */
  liveRefusal?: string;
  /** Why live mode refuses — the exact missing contract or missing input. */
  liveRefusalReason?: string;
  /** The channel generates this label in NA only (canonical rule: src/config/shipping.ts). */
  channelLabelRule?: boolean;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * THE ROUTES — derived from the real clients (evidence in each row).
 *
 * `liveRefusal` codes name the EXACT thing missing, so the remaining work is
 * never vague:
 *   CATALOG_ROUTE_NOT_CONFIRMED       — AV-035: no Vendor catalogue/item API was
 *                                       found in the public SP-API surface.
 *   INVENTORY_ROUTE_NOT_CONFIRMED     — AV-035: no Vendor inventory-availability
 *                                       API exists (nothing to read; the platform
 *                                       pushes to its OWN inventory model).
 *   SHIPMENT_CONFIRM_SUPERSEDED       — not a channel operation; the channel
 *                                       confirmation is the ASN (AV-015).
 *   CHANNEL_ITEM_SEQUENCE_NOT_HELD    — the channel's own `itemSequenceNumber`
 *                                       (required by the acknowledgement /
 *                                       confirmation / invoice payloads) is held
 *                                       nowhere in the platform.
 *   MERCENTA_PARTY_ID_NOT_HELD        — the channel's `sellingParty.partyId` for
 *                                       Mercenta (required by SubmitShipments) is
 *                                       held nowhere in the platform.
 *   DHL_BOOKING_INPUT_INCOMPLETE      — a live MyDHL booking needs shipper /
 *                                       receiver addresses and per-package weight
 *                                       + dimensions; the shipment domain holds
 *                                       origin/destination labels and a carton
 *                                       count only.
 *   PALLETLINE_CONTRACT_NOT_CONFIRMED — `src/lib/palletline/client.ts` records
 *                                       that the wire format is centralised but
 *                                       confirmed only once the partner contract
 *                                       is established.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export const PROXY_ROUTES: readonly ProxyRoute[] = [
  /* ── Amazon SP-API (base `/functions/v1/spapi`) ── */
  {
    id: 'spapi.catalog.submit',
    provider: 'spapi',
    method: 'POST',
    pattern: '/catalog-items',
    clientMethod: 'submitCatalogItem',
    clientFile: 'src/lib/spapi/client.ts',
    liveStatus: 'unsupported',
    liveRefusal: 'CATALOG_ROUTE_NOT_CONFIRMED',
    liveRefusalReason:
      'AV-035 — no Vendor catalogue/item submission operation was found in the public SP-API surface, so no live endpoint can be called without inventing one.',
  },
  {
    id: 'spapi.catalog.status',
    provider: 'spapi',
    method: 'GET',
    pattern: '/catalog-items/{submissionId}',
    clientMethod: 'getSubmissionStatus',
    clientFile: 'src/lib/spapi/client.ts',
    liveStatus: 'unsupported',
    liveRefusal: 'CATALOG_ROUTE_NOT_CONFIRMED',
    liveRefusalReason:
      'AV-035 — the submission it would poll has no confirmed live operation, so there is no live status to read.',
  },
  {
    id: 'spapi.purchaseOrders.read',
    provider: 'spapi',
    method: 'GET',
    pattern: '/purchase-orders',
    clientMethod: 'fetchPurchaseOrders',
    clientFile: 'src/lib/spapi/client.ts',
    liveStatus: 'confirmed',
  },
  {
    id: 'spapi.purchaseOrders.status',
    provider: 'spapi',
    method: 'GET',
    pattern: '/purchase-orders/status',
    clientMethod: 'getPurchaseOrdersStatus',
    clientFile: 'src/lib/spapi/client.ts',
    liveStatus: 'confirmed',
  },
  {
    id: 'spapi.acknowledgements.submit',
    provider: 'spapi',
    method: 'POST',
    pattern: '/acknowledgements',
    clientMethod: 'submitAcknowledgement',
    clientFile: 'src/lib/spapi/client.ts',
    liveStatus: 'unsupported',
    liveRefusal: 'CHANNEL_ITEM_SEQUENCE_NOT_HELD',
    liveRefusalReason:
      "The channel's own itemSequenceNumber is required on every acknowledgement line and is held nowhere in the platform (the channel PO read does not carry it).",
  },
  {
    id: 'spapi.shipments.request',
    provider: 'spapi',
    method: 'POST',
    pattern: '/shipments/request',
    clientMethod: 'submitShipmentRequest',
    clientFile: 'src/lib/spapi/client.ts',
    liveStatus: 'unsupported',
    liveRefusal: 'MERCENTA_PARTY_ID_NOT_HELD',
    liveRefusalReason:
      "SubmitShipments needs the channel's sellingParty/shipFromParty party id for Mercenta; the platform holds only the PO's ship-to party id.",
  },
  {
    id: 'spapi.shipments.details',
    provider: 'spapi',
    method: 'GET',
    pattern: '/shipments/{shipmentRequestId}/details',
    clientMethod: 'getShipmentDetails',
    clientFile: 'src/lib/spapi/client.ts',
    liveStatus: 'unsupported',
    liveRefusal: 'MERCENTA_PARTY_ID_NOT_HELD',
    liveRefusalReason:
      'No shipment request can exist live until SubmitShipments can be called (same missing party id), so there is nothing to read.',
  },
  {
    id: 'spapi.shipments.labels',
    provider: 'spapi',
    method: 'GET',
    pattern: '/shipments/{shipmentId}/labels',
    clientMethod: 'getShipmentLabels',
    clientFile: 'src/lib/spapi/client.ts',
    liveStatus: 'unsupported',
    liveRefusal: 'LABELS_LIVE_OPERATION_NOT_CONFIRMED',
    liveRefusalReason:
      'The channel generates shipment labels in NA only and this platform is UK-only (A1F83G8C2ARO7P), so the canonical region rule refuses the operation and there is no live path to exercise or verify here.',
    channelLabelRule: true,
  },
  {
    id: 'spapi.shipments.confirmations',
    provider: 'spapi',
    method: 'POST',
    pattern: '/shipments/confirmations',
    clientMethod: 'submitShipmentConfirmations',
    clientFile: 'src/lib/spapi/client.ts',
    liveStatus: 'unsupported',
    liveRefusal: 'CHANNEL_ITEM_SEQUENCE_NOT_HELD',
    liveRefusalReason:
      'Every shipment-confirmation item requires the channel itemSequenceNumber, which the platform does not hold.',
  },
  {
    id: 'spapi.shipments.confirm',
    provider: 'spapi',
    method: 'POST',
    pattern: '/shipments/confirm',
    clientMethod: 'confirmShipment',
    clientFile: 'src/lib/spapi/client.ts',
    liveStatus: 'unsupported',
    liveRefusal: 'SHIPMENT_CONFIRM_SUPERSEDED',
    liveRefusalReason:
      'Not a channel operation — the channel confirmation is the ASN (`submitShipmentConfirmations`, AV-015). Live mode refuses rather than inventing an endpoint.',
  },
  {
    id: 'spapi.invoices.submit',
    provider: 'spapi',
    method: 'POST',
    pattern: '/invoices',
    clientMethod: 'submitInvoices',
    clientFile: 'src/lib/spapi/client.ts',
    liveStatus: 'unsupported',
    liveRefusal: 'CHANNEL_ITEM_SEQUENCE_NOT_HELD',
    liveRefusalReason:
      'SubmitInvoices requires the channel itemSequenceNumber on every line, which the platform does not hold.',
  },
  {
    id: 'spapi.inventory.update',
    provider: 'spapi',
    method: 'POST',
    pattern: '/inventory',
    clientMethod: 'submitInventoryUpdate',
    clientFile: 'src/lib/spapi/client.ts',
    liveStatus: 'unsupported',
    liveRefusal: 'INVENTORY_ROUTE_NOT_CONFIRMED',
    liveRefusalReason:
      'AV-035 — no Vendor inventory operation was found in the public SP-API surface; the platform keeps inventory in its own canonical model.',
  },

  /* ── DHL Express (base `/functions/v1/dhl`) ── */
  {
    id: 'dhl.shipments.create',
    provider: 'dhl',
    method: 'POST',
    pattern: '/shipments',
    clientMethod: 'createShipment',
    clientFile: 'src/lib/dhl/client.ts',
    liveStatus: 'unsupported',
    liveRefusal: 'DHL_BOOKING_INPUT_INCOMPLETE',
    liveRefusalReason:
      'A live MyDHL booking needs shipper/receiver addresses and per-package weight + dimensions; the shipment domain holds origin/destination labels and a carton count only.',
  },
  {
    id: 'dhl.shipments.status',
    provider: 'dhl',
    method: 'GET',
    pattern: '/shipments/{waybill}',
    clientMethod: 'getShipmentStatus',
    clientFile: 'src/lib/dhl/client.ts',
    liveStatus: 'confirmed',
  },
  {
    id: 'dhl.shipments.pickup',
    provider: 'dhl',
    method: 'POST',
    pattern: '/shipments/pickup',
    clientMethod: 'requestPickup',
    clientFile: 'src/lib/dhl/client.ts',
    liveStatus: 'unsupported',
    liveRefusal: 'DHL_BOOKING_INPUT_INCOMPLETE',
    liveRefusalReason:
      'A pickup is booked against a booked shipment (address, package count and weight), which cannot be created live yet (same missing input).',
  },

  /* ── Palletline (base `/functions/v1`; the function receives `/consignments`…) ── */
  {
    id: 'palletline.consignments.create',
    provider: 'palletline',
    method: 'POST',
    pattern: '/consignments',
    clientMethod: 'createConsignment',
    clientFile: 'src/lib/palletline/client.ts',
    liveStatus: 'unsupported',
    liveRefusal: 'PALLETLINE_CONTRACT_NOT_CONFIRMED',
    liveRefusalReason:
      'The Palletline wire contract is not confirmed (see the note in src/lib/palletline/client.ts); live mode refuses rather than inventing endpoints.',
  },
  {
    id: 'palletline.consignments.status',
    provider: 'palletline',
    method: 'GET',
    pattern: '/consignments/{consignmentNumber}',
    clientMethod: 'getConsignmentStatus',
    clientFile: 'src/lib/palletline/client.ts',
    liveStatus: 'unsupported',
    liveRefusal: 'PALLETLINE_CONTRACT_NOT_CONFIRMED',
    liveRefusalReason:
      'The Palletline wire contract is not confirmed, so no live status endpoint can be called.',
  },
  {
    id: 'palletline.collections.request',
    provider: 'palletline',
    method: 'POST',
    pattern: '/collections',
    clientMethod: 'requestCollection',
    clientFile: 'src/lib/palletline/client.ts',
    liveStatus: 'unsupported',
    liveRefusal: 'PALLETLINE_CONTRACT_NOT_CONFIRMED',
    liveRefusalReason:
      'The Palletline wire contract is not confirmed, so no live collection endpoint can be called.',
  },
  {
    id: 'palletline.consignments.cancel',
    provider: 'palletline',
    method: 'POST',
    pattern: '/consignments/{consignmentNumber}/cancel',
    clientMethod: 'cancelConsignment',
    clientFile: 'src/lib/palletline/client.ts',
    liveStatus: 'unsupported',
    liveRefusal: 'PALLETLINE_CONTRACT_NOT_CONFIRMED',
    liveRefusalReason:
      'The Palletline wire contract is not confirmed, so no live cancellation endpoint can be called.',
  },
  {
    id: 'palletline.consignments.invoice',
    provider: 'palletline',
    method: 'GET',
    pattern: '/consignments/{consignmentNumber}/invoice',
    clientMethod: 'getConsignmentInvoice',
    clientFile: 'src/lib/palletline/client.ts',
    liveStatus: 'unsupported',
    liveRefusal: 'PALLETLINE_CONTRACT_NOT_CONFIRMED',
    liveRefusalReason:
      'The Palletline wire contract is not confirmed, so the carrier invoice cannot be read live.',
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
 * MARKETPLACE + THE CHANNEL LABEL REGION RULE (mirrored, and PINNED).
 *
 * Deno cannot import the `@/` aliases the browser config uses, so the two facts
 * below are declared here and `scripts/validate-integration-proxy.mjs` proves
 * they still match `src/config/shipping.ts` (`CHANNEL_SHIPMENT_LABEL_REGIONS`,
 * `CHANNEL_NA_MARKETPLACE_IDS`) and `src/lib/spapi/transform.ts`
 * (`UK_MARKETPLACE_ID`). A drift is a validator FAILURE, never a silent
 * divergence.
 * ═══════════════════════════════════════════════════════════════════════════ */
export const UK_MARKETPLACE_ID = 'A1F83G8C2ARO7P';
export const CHANNEL_LABEL_REGIONS: readonly string[] = ['NA'];
export const CHANNEL_NA_MARKETPLACE_IDS: readonly string[] = [
  'ATVPDKIKX0DER',
  'A2EUQ1WTGCTBG2',
  'A1AM78C64UM0Y8',
];

export function marketplaceRegion(marketplaceId: string | null | undefined): string {
  if (!marketplaceId) return 'unknown';
  if (marketplaceId === UK_MARKETPLACE_ID) return 'EU';
  if (CHANNEL_NA_MARKETPLACE_IDS.includes(marketplaceId)) return 'NA';
  return 'unknown';
}

/** TRUE only when the channel itself generates labels in the marketplace's region. */
export function channelGeneratesLabelsFor(marketplaceId: string | null | undefined): boolean {
  const region = marketplaceRegion(marketplaceId);
  return region !== 'unknown' && CHANNEL_LABEL_REGIONS.includes(region);
}

export const CHANNEL_LABEL_RULE_STATEMENT =
  'The retail channel generates shipment labels in NA only, so Mercenta never issues a channel-generated label for a UK/EU consignment. Mercenta issues its own carrier labels (DHL / Palletline) as the account holder.';

export function labelRefusalReason(marketplaceId: string | null | undefined): string {
  const region = marketplaceRegion(marketplaceId);
  return `${
    region === 'unknown' ? 'MARKETPLACE_REGION_UNKNOWN' : 'LABELS_NOT_GENERATED_IN_REGION'
  } — ${CHANNEL_LABEL_RULE_STATEMENT}`;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * ROUTE MATCHING — a literal segment always beats a `{param}` segment, so
 * `/purchase-orders/status` can never be swallowed by `/purchase-orders`.
 * ═══════════════════════════════════════════════════════════════════════════ */
export function pathSegments(path: string): string[] {
  return (path || '').split('?')[0].split('/').filter((s) => s.length > 0);
}

export function matchProxyRoute(
  provider: ProxyProviderId,
  method: string,
  path: string
): ProxyRoute | null {
  const wanted = pathSegments(path);
  let best: ProxyRoute | null = null;
  let bestScore = -1;
  for (const route of PROXY_ROUTES) {
    if (route.provider !== provider) continue;
    if (route.method !== method.toUpperCase()) continue;
    const parts = pathSegments(route.pattern);
    if (parts.length !== wanted.length) continue;
    let score = 0;
    let matched = true;
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i];
      const actual = wanted[i];
      if (part.startsWith('{') && part.endsWith('}')) {
        score += 1;
      } else if (part === actual) {
        score += 4;
      } else {
        matched = false;
        break;
      }
    }
    if (matched && score > bestScore) {
      best = route;
      bestScore = score;
    }
  }
  return best;
}

/** The named path parameters a matched route captured. */
export function routeParams(route: ProxyRoute, path: string): Record<string, string> {
  const parts = pathSegments(route.pattern);
  const wanted = pathSegments(path);
  const params: Record<string, string> = {};
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    if (part.startsWith('{') && part.endsWith('}')) {
      params[part.slice(1, -1)] = decodeURIComponent(wanted[i] ?? '');
    }
  }
  return params;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * MODE RESOLUTION — the fail-closed rule, in ONE place.
 * ═══════════════════════════════════════════════════════════════════════════ */
export type ProxyMode = 'simulation' | 'live' | 'unknown';

export const MOCK_SECRET_PREFIX = 'mock:';
export const VAULT_SECRET_PREFIX = 'vault:';

export function resolveProxyMode(secretRef?: string | null): ProxyMode {
  const ref = typeof secretRef === 'string' ? secretRef.trim() : '';
  if (ref === '') return 'simulation';
  if (ref.startsWith(MOCK_SECRET_PREFIX)) return 'simulation';
  if (ref.startsWith(VAULT_SECRET_PREFIX)) return 'live';
  return 'unknown';
}

/* ═══════════════════════════════════════════════════════════════════════════
 * THE SIMULATED WORLD (server side).
 *
 * Mirrors the mock clients' shapes AND their deterministic behaviour, so the
 * helper is a genuinely working simulation rather than a stub: a shipment
 * request must exist before routing instructions are returned, and a confirmed
 * shipment is what makes the channel's own receiving sync report a receipt.
 * Zero network calls; every identifier unmistakable.
 *
 * The advancing lifecycles mirror `src/lib/dhl/mockClient.ts` and
 * `src/lib/palletline/mockClient.ts` exactly (including the retry-after-
 * exception step and the depot cut-off on cancellation), and the refusal CODES
 * mirror `src/lib/spapi/mockClient.ts` — `scripts/validate-integration-proxy.mjs`
 * pins both, so the two simulations cannot drift apart.
 * ═══════════════════════════════════════════════════════════════════════════ */
export const SIMULATED_TODAY = '2026-01-15';
/** Pinned to `src/lib/shipping/consolidation.ts → TRUCKLOAD_CONFIRMATION_LIMIT`. */
export const TRUCKLOAD_CONFIRMATION_LIMIT = 100;
export const SIM_ASIN_PREFIX = 'SIM-ASIN-';

export const REJECTION_REASONS: readonly string[] = [
  'TITLE attribute missing required brand name element',
  'product_images: main image below 1000px minimum requirement',
  'browse_node mapping invalid for approved category',
];

/** The stated refusal CODES, mirrored from the mock clients (validator-pinned). */
export const SIM_REFUSAL_CODES = {
  ackEmpty: 'ACKNOWLEDGEMENT_EMPTY',
  ackExceedsOrder: 'ACKNOWLEDGEMENT_EXCEEDS_ORDER',
  ackMissingDate: 'ACKNOWLEDGEMENT_MISSING_DATE',
  statusIdsEmpty: 'PURCHASE_ORDER_IDS_EMPTY',
  shipmentRequestEmpty: 'SHIPMENT_REQUEST_EMPTY',
  shipmentRequestDuplicate: 'SHIPMENT_REQUEST_DUPLICATE',
  shipmentRequestTooLarge: 'SHIPMENT_REQUEST_TOO_LARGE',
  shipmentRequestUnknown: 'SHIPMENT_REQUEST_UNKNOWN',
  confirmationEmpty: 'SHIPMENT_CONFIRMATION_EMPTY',
  confirmationNoPurchaseOrders: 'SHIPMENT_CONFIRMATION_NO_PURCHASE_ORDERS',
  confirmationCartonWithoutPo: 'SHIPMENT_CONFIRMATION_CARTON_WITHOUT_PO',
  confirmationCartonPoNotDeclared: 'SHIPMENT_CONFIRMATION_CARTON_PO_NOT_DECLARED',
  invoiceNumberMissing: 'INVOICE_NUMBER_MISSING',
  invoiceZeroValue: 'INVOICE_ZERO_VALUE',
  invoiceNumberReused: 'INVOICE_NUMBER_ALREADY_USED',
  inventorySkuMissing: 'INVENTORY_SKU_MISSING',
  inventoryQuantityInvalid: 'INVENTORY_QUANTITY_INVALID',
  inventoryUnitUndeclared: 'INVENTORY_UNIT_UNDECLARED',
} as const;

export const DHL_MILESTONE_SEQUENCE: readonly string[] = [
  'pickup_scheduled',
  'picked_up',
  'in_transit',
  'customs_clearance',
  'delivered',
];

export const PALLETLINE_MILESTONE_SEQUENCE: readonly string[] = [
  'collection_scheduled',
  'collected',
  'at_hub',
  'out_for_delivery',
  'delivered',
];

export interface SimChannelPoLine {
  vendorSku: string;
  quantity: number;
  unitPrice: number;
  commodityCode?: string;
  productName?: string;
}

export interface SimChannelPo {
  purchaseOrderId: string;
  poValue: number;
  orderDate: string;
  shipToPartyId: string;
  freightTerm: 'collect' | 'prepaid';
  shipWindowStart?: string;
  shipWindowEnd?: string;
  deliveryWindowStart?: string;
  deliveryWindowEnd?: string;
  lines: SimChannelPoLine[];
}

interface SimReceipt {
  confirmationId: string;
  receivedDate: string;
  receivedBySku: Record<string, number>;
}

interface SimWorldState {
  submissionCounter: number;
  submissions: Map<string, { polls: number; willReject: boolean }>;
  acknowledgementCounter: number;
  shipmentRequestCounter: number;
  confirmationCounter: number;
  invoiceCounter: number;
  inventoryCounter: number;
  usedInvoiceNumbers: Set<string>;
  channelPos: Map<string, SimChannelPo>;
  /** PO number → the shipment request that still needs routing instructions. */
  shipmentRequests: Map<string, { shipmentRequestId: string; detailReads: number }>;
  receipts: Map<string, SimReceipt>;
  waybillCounter: number;
  waybills: Map<string, { polls: number; willException: boolean; exceptionOngoing: boolean }>;
  consignmentCounter: number;
  consignments: Map<
    string,
    {
      polls: number;
      pallets: number;
      totalWeightKg: number;
      willException: boolean;
      exceptionOngoing: boolean;
      willFailDelivery: boolean;
      failedDeliveryReported: boolean;
    }
  >;
}

let world: SimWorldState | null = null;

/** Test/rehearsal seam — the simulated world is deterministic and resettable. */
export function resetSimulatedWorld(): void {
  world = null;
}

export function counterRef(prefix: string, counter: number, width = 5): string {
  return `${prefix}${String(counter).padStart(width, '0')}`;
}

export function simulatedAsinFor(seed: string): string {
  const safe = seed.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return `${SIM_ASIN_PREFIX}${safe || 'UNKNOWN'}`;
}

/** Deterministic simulated carrier cost — the SAME formula the mock uses. */
export function simulatedPalletlineCarrierCost(pallets: number, totalWeightKg: number): number {
  const perPallet = 62.5;
  const perKg = 0.042;
  return Math.round((pallets * perPallet + totalWeightKg * perKg) * 100) / 100;
}

function dayOffset(days: number): string {
  const base = Date.parse(`${SIMULATED_TODAY}T00:00:00.000Z`);
  return new Date(base + days * 86400000).toISOString().slice(0, 10);
}

function simulatedChannelPo(
  purchaseOrderId: string,
  quantity: number,
  unitPrice: number,
  offset: number,
  freightTerm: 'collect' | 'prepaid',
  shipToPartyId: string
): SimChannelPo {
  const windows =
    freightTerm === 'collect'
      ? { shipWindowStart: dayOffset(offset - 5), shipWindowEnd: dayOffset(offset) }
      : {
          deliveryWindowStart: dayOffset(offset),
          deliveryWindowEnd: dayOffset(offset + 7),
        };
  return {
    purchaseOrderId,
    poValue: Math.round(quantity * unitPrice * 100) / 100,
    orderDate: dayOffset(offset - 10),
    shipToPartyId,
    freightTerm,
    ...windows,
    lines: [
      {
        vendorSku: 'MOCK-SKU-0001',
        quantity,
        unitPrice,
        commodityCode: 'XX-MOCK-COMMODITY',
        productName: 'Simulated channel-ordered product line',
      },
    ],
  };
}

function createWorld(): SimWorldState {
  const pos = [
    simulatedChannelPo('MOCK-PO-8841', 120, 9.5, 8, 'prepaid', 'MOCK-FC-0001'),
    simulatedChannelPo('MOCK-PO-8842', 80, 12.25, 11, 'collect', 'MOCK-FC-0002'),
  ];
  return {
    submissionCounter: 0,
    submissions: new Map(),
    acknowledgementCounter: 0,
    shipmentRequestCounter: 0,
    confirmationCounter: 0,
    invoiceCounter: 0,
    inventoryCounter: 0,
    usedInvoiceNumbers: new Set(),
    channelPos: new Map(pos.map((po) => [po.purchaseOrderId, po])),
    shipmentRequests: new Map(),
    receipts: new Map(),
    waybillCounter: 0,
    waybills: new Map(),
    consignmentCounter: 0,
    consignments: new Map(),
  };
}

function w(): SimWorldState {
  if (!world) world = createWorld();
  return world;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * THE REQUEST / OUTCOME CONTRACT
 * ═══════════════════════════════════════════════════════════════════════════ */
export interface ProxyRequest {
  provider: ProxyProviderId;
  method: string;
  /** The path AFTER the function name (e.g. `/catalog-items/ABC`). */
  path: string;
  /** Query parameters, already parsed. */
  query?: Record<string, string>;
  /** The `X-Secret-Ref` header value, when the caller sent one. */
  secretRef?: string | null;
  /** The parsed JSON body, when the caller sent one. */
  body?: unknown;
  /** The marketplace the connection is for (live mode reads the label rule). */
  marketplaceId?: string | null;
}

export interface ProxyOutcome {
  status: number;
  ok: boolean;
  body: Record<string, unknown>;
  simulated: boolean;
  liveCallAttempted: boolean;
  routeId?: string;
  refusal?: string;
}

function simBase(): Record<string, unknown> {
  return { simulated: true, mode: SIMULATION_MODE, simulationNote: SIMULATION_NOTE };
}

function refusal(code: string, statement: string): Record<string, unknown> {
  return { ...simBase(), ok: false, error: `${code} — ${statement}` };
}

/* ═══════════════════════════════════════════════════════════════════════════
 * THE SIMULATED RESPONSES — the same shapes the mock clients return.
 * ═══════════════════════════════════════════════════════════════════════════ */
export function simulatedResponse(
  route: ProxyRoute,
  request: ProxyRequest
): { status: number; body: Record<string, unknown> } {
  const base = simBase();
  const params = routeParams(route, request.path);
  const payload = (request.body ?? {}) as Record<string, any>;
  const query = request.query ?? {};
  const state = w();

  switch (route.id) {
    case 'spapi.catalog.submit': {
      state.submissionCounter += 1;
      const submissionId = counterRef('MOCK-SUB-', state.submissionCounter);
      state.submissions.set(submissionId, {
        polls: 0,
        willReject: state.submissionCounter % 4 === 0,
      });
      return { status: 200, body: { ...base, ok: true, submissionId, status: 'submitted' } };
    }

    case 'spapi.catalog.status': {
      const submissionId = params.submissionId ?? '';
      const submission = state.submissions.get(submissionId);
      if (!submission) {
        return {
          status: 200,
          body: {
            ...base,
            ok: false,
            error: `UNKNOWN_SUBMISSION_ID — this simulated helper issued no submission ${submissionId}.`,
          },
        };
      }
      submission.polls += 1;
      if (submission.willReject && submission.polls >= 3) {
        return {
          status: 200,
          body: {
            ...base,
            ok: true,
            status: 'rejected',
            rejectionReason:
              REJECTION_REASONS[state.submissionCounter % REJECTION_REASONS.length],
          },
        };
      }
      if (submission.polls >= 3) {
        return {
          status: 200,
          body: { ...base, ok: true, status: 'live', asin: simulatedAsinFor(submissionId) },
        };
      }
      if (submission.polls === 2) {
        return { status: 200, body: { ...base, ok: true, status: 'under_amazon_review' } };
      }
      return { status: 200, body: { ...base, ok: true, status: 'submitted' } };
    }

    case 'spapi.purchaseOrders.read': {
      return {
        status: 200,
        body: { ...base, ok: true, purchaseOrders: [...state.channelPos.values()] },
      };
    }

    case 'spapi.purchaseOrders.status': {
      const requested = (query.ids ?? '')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
      if (requested.length === 0) {
        return {
          status: 200,
          body: refusal(
            SIM_REFUSAL_CODES.statusIdsEmpty,
            'a receiving sync must name at least one purchase order.'
          ),
        };
      }
      const statuses: Record<string, unknown>[] = [];
      const unknownPurchaseOrderIds: string[] = [];
      for (const id of requested) {
        const po = state.channelPos.get(id);
        if (!po) {
          unknownPurchaseOrderIds.push(id);
          continue;
        }
        const receipt = state.receipts.get(id);
        statuses.push({
          purchaseOrderId: id,
          status: receipt ? 'received' : 'acknowledged',
          receivingStatus: receipt ? 'received' : 'not_received',
          lines: po.lines.map((line) => ({
            vendorSku: line.vendorSku,
            orderedQty: line.quantity,
            receivedQty: receipt ? receipt.receivedBySku[line.vendorSku] ?? 0 : 0,
          })),
          ...(receipt ? { receivedDate: receipt.receivedDate } : {}),
          simulated: true,
        });
      }
      return { status: 200, body: { ...base, ok: true, statuses, unknownPurchaseOrderIds } };
    }

    case 'spapi.acknowledgements.submit': {
      const lines = Array.isArray(payload.lines) ? payload.lines : [];
      if (lines.length === 0) {
        return {
          status: 200,
          body: refusal(
            SIM_REFUSAL_CODES.ackEmpty,
            'a submission with no lines carries no decision.'
          ),
        };
      }
      const over = lines.find(
        (l: any) => l.ackStatus !== 'rejected' && Number(l.acknowledgedQty) > Number(l.orderedQty)
      );
      if (over) {
        return {
          status: 200,
          body: refusal(
            SIM_REFUSAL_CODES.ackExceedsOrder,
            `acknowledged quantity cannot exceed the ordered quantity on a line (line ${over.sku}).`
          ),
        };
      }
      const missingDate = lines.find(
        (l: any) => l.ackStatus === 'backordered' && !l.scheduledShipDate
      );
      if (missingDate) {
        return {
          status: 200,
          body: refusal(
            SIM_REFUSAL_CODES.ackMissingDate,
            `a backordered line requires a scheduled ship date (line ${missingDate.sku}).`
          ),
        };
      }
      state.acknowledgementCounter += 1;
      const accepted = lines.filter((l: any) => l.ackStatus !== 'rejected').length;
      const status =
        accepted === 0 ? 'rejected' : accepted === lines.length ? 'accepted' : 'partially_accepted';
      return {
        status: 200,
        body: {
          ...base,
          ok: true,
          acknowledgementId: counterRef('MOCK-ACK-', state.acknowledgementCounter),
          status,
        },
      };
    }

    case 'spapi.shipments.request': {
      const poNumbers = (Array.isArray(payload.purchaseOrderNumbers)
        ? payload.purchaseOrderNumbers
        : []
      )
        .map((v: unknown) => String(v).trim())
        .filter(Boolean);
      if (poNumbers.length === 0) {
        return {
          status: 200,
          body: refusal(
            SIM_REFUSAL_CODES.shipmentRequestEmpty,
            'a shipment request must name the purchase order(s) it covers.'
          ),
        };
      }
      const duplicate = poNumbers.find((v: string, i: number) => poNumbers.indexOf(v) !== i);
      if (duplicate) {
        return {
          status: 200,
          body: refusal(
            SIM_REFUSAL_CODES.shipmentRequestDuplicate,
            `a purchase order is declared twice in the same request (${duplicate}).`
          ),
        };
      }
      if (poNumbers.length > TRUCKLOAD_CONFIRMATION_LIMIT) {
        return {
          status: 200,
          body: refusal(
            SIM_REFUSAL_CODES.shipmentRequestTooLarge,
            `above the channel's limit of ${TRUCKLOAD_CONFIRMATION_LIMIT} shipment confirmations for a truckload shipment.`
          ),
        };
      }
      state.shipmentRequestCounter += 1;
      const shipmentRequestId = counterRef('MOCK-SHP-REQ-', state.shipmentRequestCounter);
      for (const poNumber of poNumbers) {
        state.shipmentRequests.set(poNumber, { shipmentRequestId, detailReads: 0 });
      }
      return {
        status: 200,
        body: {
          ...base,
          ok: true,
          shipmentRequestId,
          status: 'carrier_assignment_pending',
        },
      };
    }

    case 'spapi.shipments.details': {
      const shipmentRequestId = params.shipmentRequestId ?? '';
      const entry = [...state.shipmentRequests.values()].find(
        (r) => r.shipmentRequestId === shipmentRequestId
      );
      if (!entry) {
        return {
          status: 200,
          body: refusal(
            SIM_REFUSAL_CODES.shipmentRequestUnknown,
            'the channel has no such shipment request, so it returns no routing instructions.'
          ),
        };
      }
      entry.detailReads += 1;
      if (entry.detailReads < 2) {
        return { status: 200, body: { ...base, ok: true, status: 'carrier_assignment_pending' } };
      }
      return {
        status: 200,
        body: {
          ...base,
          ok: true,
          status: 'carrier_assigned',
          arn: `MOCK-ARN-${shipmentRequestId.replace('MOCK-SHP-REQ-', '')}`,
          carrier: 'Simulated channel-appointed carrier',
          assignedAt: `${SIMULATED_TODAY}T09:00:00.000Z`,
        },
      };
    }

    case 'spapi.shipments.labels': {
      const marketplaceId = request.marketplaceId ?? UK_MARKETPLACE_ID;
      return {
        status: 200,
        body: {
          ...base,
          ok: false,
          refused: true,
          refusedReason: labelRefusalReason(marketplaceId),
        },
      };
    }

    case 'spapi.shipments.confirmations': {
      const cartons = Array.isArray(payload.cartons) ? payload.cartons : [];
      if (cartons.length === 0) {
        return {
          status: 200,
          body: refusal(
            SIM_REFUSAL_CODES.confirmationEmpty,
            'an ASN with no cartons declares nothing.'
          ),
        };
      }
      const declared = new Set(
        (Array.isArray(payload.purchaseOrderNumbers) ? payload.purchaseOrderNumbers : [])
          .map((v: unknown) => String(v).trim())
          .filter(Boolean)
      );
      if (declared.size === 0) {
        return {
          status: 200,
          body: refusal(
            SIM_REFUSAL_CODES.confirmationNoPurchaseOrders,
            'an ASN must name the purchase order(s) it covers.'
          ),
        };
      }
      const withoutPo = cartons.find((c: any) => !String(c.purchaseOrderNumber ?? '').trim());
      if (withoutPo) {
        return {
          status: 200,
          body: refusal(
            SIM_REFUSAL_CODES.confirmationCartonWithoutPo,
            `every carton must reference the purchase order it carries (carton ${withoutPo.cartonId}).`
          ),
        };
      }
      const outside = cartons.find(
        (c: any) => !declared.has(String(c.purchaseOrderNumber).trim())
      );
      if (outside) {
        return {
          status: 200,
          body: refusal(
            SIM_REFUSAL_CODES.confirmationCartonPoNotDeclared,
            `a carton references a purchase order the confirmation does not declare (carton ${outside.cartonId}).`
          ),
        };
      }
      state.confirmationCounter += 1;
      const confirmationId = counterRef('MOCK-ASN-', state.confirmationCounter);
      const receivedDate = `${SIMULATED_TODAY}T12:00:00.000Z`;
      for (const poNumber of declared) {
        const receivedBySku: Record<string, number> = {};
        for (const carton of cartons) {
          if (String(carton.purchaseOrderNumber).trim() !== poNumber) continue;
          const sku = String(carton.vendorSku);
          receivedBySku[sku] = (receivedBySku[sku] ?? 0) + Number(carton.quantity ?? 0);
        }
        state.receipts.set(poNumber as string, { confirmationId, receivedDate, receivedBySku });
      }
      return { status: 200, body: { ...base, ok: true, confirmationId, status: 'accepted' } };
    }

    case 'spapi.shipments.confirm': {
      return { status: 200, body: { ...base, ok: true } };
    }

    case 'spapi.invoices.submit': {
      const invoiceNumber = String(payload.invoiceNumber ?? '').trim();
      if (!invoiceNumber) {
        return {
          status: 200,
          body: refusal(
            SIM_REFUSAL_CODES.invoiceNumberMissing,
            'the channel requires an Invoice ID (AV-022).'
          ),
        };
      }
      if (!(Number(payload.total) > 0)) {
        return {
          status: 200,
          body: refusal(SIM_REFUSAL_CODES.invoiceZeroValue, 'a zero-value invoice fails (AV-022).'),
        };
      }
      if (state.usedInvoiceNumbers.has(invoiceNumber)) {
        return {
          status: 200,
          body: refusal(
            SIM_REFUSAL_CODES.invoiceNumberReused,
            `invoice numbers are unique and are never reused (${invoiceNumber}).`
          ),
        };
      }
      state.usedInvoiceNumbers.add(invoiceNumber);
      state.invoiceCounter += 1;
      return {
        status: 200,
        body: {
          ...base,
          ok: true,
          submissionId: counterRef('MOCK-INV-ACK-', state.invoiceCounter),
          status: 'submitted',
        },
      };
    }

    case 'spapi.inventory.update': {
      if (!String(payload.sku ?? '').trim()) {
        return {
          status: 200,
          body: refusal(
            SIM_REFUSAL_CODES.inventorySkuMissing,
            'an update must name the SKU it reports.'
          ),
        };
      }
      if (!Number.isFinite(Number(payload.quantity)) || Number(payload.quantity) < 0) {
        return {
          status: 200,
          body: refusal(
            SIM_REFUSAL_CODES.inventoryQuantityInvalid,
            'a pushed quantity must be a number that is zero or greater.'
          ),
        };
      }
      if (payload.unitOfMeasure !== 'Eaches' && payload.unitOfMeasure !== 'Cases') {
        return {
          status: 200,
          body: refusal(
            SIM_REFUSAL_CODES.inventoryUnitUndeclared,
            'a push must declare the unit of measure (Eaches/Cases).'
          ),
        };
      }
      state.inventoryCounter += 1;
      return {
        status: 200,
        body: {
          ...base,
          ok: true,
          submissionId: counterRef('MOCK-INV-UPD-', state.inventoryCounter),
        },
      };
    }

    /* ── DHL Express ── */
    case 'dhl.shipments.create': {
      state.waybillCounter += 1;
      const waybill = counterRef('MOCK-DHL-', state.waybillCounter, 4);
      const trackingNumber = counterRef('SIM-TRK-', state.waybillCounter, 8);
      state.waybills.set(waybill, {
        polls: 0,
        willException: state.waybillCounter % 6 === 0,
        exceptionOngoing: false,
      });
      return {
        status: 200,
        body: { ...base, ok: true, waybill, trackingNumber, labelState: 'created' },
      };
    }

    case 'dhl.shipments.status': {
      const waybill = params.waybill ?? '';
      const shipment = state.waybills.get(waybill);
      if (!shipment) {
        return {
          status: 200,
          body: {
            ...base,
            ok: false,
            error: `UNKNOWN_WAYBILL — this simulated helper issued no waybill ${waybill}.`,
          },
        };
      }
      if (shipment.polls >= DHL_MILESTONE_SEQUENCE.length) {
        return {
          status: 200,
          body: { ...base, ok: true, milestone: 'delivered', estimatedDelivery: 'Complete' },
        };
      }
      shipment.polls += 1;
      const milestone = DHL_MILESTONE_SEQUENCE[shipment.polls - 1];
      if (shipment.willException && milestone === 'in_transit' && !shipment.exceptionOngoing) {
        shipment.exceptionOngoing = true;
        shipment.polls -= 1; // hold the milestone so the NEXT poll is the retry (parity with the fixed mock)
        return {
          status: 200,
          body: {
            ...base,
            ok: true,
            milestone,
            exception: true,
            exceptionReason: 'Customs hold (simulated) — documentation review required',
            delayed: true,
          },
        };
      }
      if (shipment.exceptionOngoing && milestone === 'in_transit') {
        shipment.exceptionOngoing = false;
        return {
          status: 200,
          body: {
            ...base,
            ok: true,
            milestone,
            exception: false,
            exceptionReason: 'Cleared after documentation resubmission (retry recovered)',
          },
        };
      }
      return { status: 200, body: { ...base, ok: true, milestone } };
    }

    case 'dhl.shipments.pickup': {
      return { status: 200, body: { ...base, ok: true } };
    }

    /* ── Palletline ── */
    case 'palletline.consignments.create': {
      state.consignmentCounter += 1;
      const consignmentNumber = counterRef('MOCK-PLL-', state.consignmentCounter, 4);
      const trackingNumber = counterRef('SIM-PLL-TRK-', state.consignmentCounter, 8);
      const pallets = Number(payload.pallets ?? 1) || 1;
      state.consignments.set(consignmentNumber, {
        polls: 0,
        pallets,
        totalWeightKg: Number(payload.totalWeightKg ?? pallets * 250) || pallets * 250,
        willException: state.consignmentCounter % 7 === 0,
        exceptionOngoing: false,
        willFailDelivery: state.consignmentCounter % 5 === 0,
        failedDeliveryReported: false,
      });
      return {
        status: 200,
        body: { ...base, ok: true, consignmentNumber, trackingNumber, labelState: 'created' },
      };
    }

    case 'palletline.consignments.status': {
      const consignmentNumber = params.consignmentNumber ?? '';
      const consignment = state.consignments.get(consignmentNumber);
      if (!consignment) {
        return {
          status: 200,
          body: {
            ...base,
            ok: false,
            error: `UNKNOWN_CONSIGNMENT — this simulated helper issued no consignment ${consignmentNumber}.`,
          },
        };
      }
      if (consignment.polls >= PALLETLINE_MILESTONE_SEQUENCE.length) {
        return {
          status: 200,
          body: { ...base, ok: true, milestone: 'delivered', estimatedDelivery: 'Complete' },
        };
      }
      consignment.polls += 1;
      const milestone = PALLETLINE_MILESTONE_SEQUENCE[consignment.polls - 1];
      if (consignment.willException && milestone === 'at_hub' && !consignment.exceptionOngoing) {
        consignment.exceptionOngoing = true;
        consignment.polls -= 1; // stay on the milestone so the NEXT poll is the retry
        return {
          status: 200,
          body: {
            ...base,
            ok: true,
            milestone,
            exception: true,
            exceptionReason: 'Depot hold (simulated) — pallet scanned but not trunked',
            delayed: true,
          },
        };
      }
      if (consignment.exceptionOngoing && milestone === 'at_hub') {
        consignment.exceptionOngoing = false;
        return {
          status: 200,
          body: {
            ...base,
            ok: true,
            milestone,
            exception: false,
            exceptionReason: 'Cleared on the next trunk run (retry recovered)',
          },
        };
      }
      if (
        consignment.willFailDelivery &&
        milestone === 'out_for_delivery' &&
        !consignment.failedDeliveryReported
      ) {
        consignment.failedDeliveryReported = true;
        consignment.polls -= 1; // stay on the milestone until the retry
        return {
          status: 200,
          body: {
            ...base,
            ok: true,
            milestone,
            failedDelivery: true,
            exceptionReason:
              'Delivery attempted — site closed (simulated); re-booked for tomorrow',
          },
        };
      }
      return { status: 200, body: { ...base, ok: true, milestone } };
    }

    case 'palletline.collections.request': {
      return { status: 200, body: { ...base, ok: true } };
    }

    case 'palletline.consignments.cancel': {
      const consignmentNumber = params.consignmentNumber ?? '';
      const consignment = state.consignments.get(consignmentNumber);
      if (!consignment) {
        return {
          status: 200,
          body: {
            ...base,
            ok: false,
            error: `UNKNOWN_CONSIGNMENT — this simulated helper issued no consignment ${consignmentNumber}.`,
          },
        };
      }
      // The real depot cut-off: a collected pallet can no longer be cancelled.
      if (consignment.polls >= 2) {
        return {
          status: 200,
          body: {
            ...base,
            ok: false,
            error:
              'CONSIGNMENT_ALREADY_COLLECTED — cancellation refused once the pallet has been collected.',
          },
        };
      }
      return { status: 200, body: { ...base, ok: true } };
    }

    case 'palletline.consignments.invoice': {
      const consignmentNumber = params.consignmentNumber ?? '';
      const consignment = state.consignments.get(consignmentNumber);
      if (!consignment) {
        return {
          status: 200,
          body: {
            ...base,
            ok: false,
            error: `UNKNOWN_CONSIGNMENT — this helper holds no consignment ${consignmentNumber}, so it cannot state a carrier cost.`,
          },
        };
      }
      return {
        status: 200,
        body: {
          ...base,
          ok: true,
          carrierCostGbp: simulatedPalletlineCarrierCost(
            consignment.pallets,
            consignment.totalWeightKg
          ),
          invoiceNumber: `MOCK-PLL-INV-${consignmentNumber.slice(-4)}`,
        },
      };
    }

    default: {
      return {
        status: 404,
        body: {
          ...base,
          ok: false,
          error: `UNROUTED_SIMULATED_OPERATION — no simulated response is declared for ${route.id}.`,
        },
      };
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
 * THE RUNTIME ENTRY POINT — the path/query the provider function must use.
 * ═══════════════════════════════════════════════════════════════════════════ */
export function proxyRequestTarget(
  url: string,
  provider: ProxyProviderId
): { path: string; query: Record<string, string> } {
  const parsed = new URL(url, 'http://localhost');
  const segments = pathSegments(parsed.pathname);
  const afterV1 = segments.indexOf('v1');
  const rest = afterV1 >= 0 ? segments.slice(afterV1 + 1) : segments;
  const query: Record<string, string> = {};
  parsed.searchParams.forEach((value, key) => {
    query[key] = value;
  });
  return { path: normalizeFunctionPath(provider, `/${rest.join('/')}`), query };
}

/* ═══════════════════════════════════════════════════════════════════════════
 * THE ORCHESTRATOR — routing, mode, simulation, fail-closed, live.
 * ═══════════════════════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════════════════
 * THE LIVE-CALL CONTRACT
 *
 * Declared ONCE here: the provider functions own the hosts and auth headers,
 * and `scripts/validate-integration-proxy.mjs` executes these callers with a
 * SPY fetch so the asserted URLs and bodies are real, not described.
 * ═══════════════════════════════════════════════════════════════════════════ */
export type ProxyLiveFetch = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string }
) => Promise<{ ok: boolean; status: number; text: () => Promise<string> }>;

export type ProxyLiveResult = { status: number; body: Record<string, unknown> };
export type ProxyLiveCall = (route: ProxyRoute, request: ProxyRequest) => Promise<ProxyLiveResult>;

export interface ProxyRuntime {
  /**
   * TRUE only when the provider function RESOLVED a server-side credential for
   * this request (from the function's own environment or the Vault). Never true
   * for a simulated request — simulation never touches credentials.
   */
  serverCredentialsResolved: boolean;
  /**
   * Performs the REAL provider call. Supplied by the provider function, which
   * owns the host names and auth headers. It is NEVER invoked in simulation, in
   * an unsupported-route refusal or when credentials could not be resolved — the
   * validator proves that with a call spy that throws.
   */
  liveCall?: (
    route: ProxyRoute,
    request: ProxyRequest
  ) => Promise<{ status: number; body: Record<string, unknown> }>;
}

export async function handleProxyRequest(
  request: ProxyRequest,
  runtime: ProxyRuntime
): Promise<ProxyOutcome> {
  if (!PROXY_FUNCTION_NAME[request.provider]) {
    return {
      status: 404,
      ok: false,
      simulated: false,
      liveCallAttempted: false,
      body: {
        ok: false,
        error: `UNKNOWN_PROVIDER — '${request.provider}' has no integration proxy function.`,
      },
    };
  }

  const route = matchProxyRoute(request.provider, request.method, request.path);
  if (!route) {
    return {
      status: 404,
      ok: false,
      simulated: false,
      liveCallAttempted: false,
      body: {
        ok: false,
        error: `UNROUTED_OPERATION — ${request.method} ${request.path} is not a declared route for '${request.provider}'.`,
      },
    };
  }

  const mode = resolveProxyMode(request.secretRef);

  /* UNKNOWN mode — FAIL CLOSED. An unrecognised credential reference is never
   * treated as simulation, and never as live. */
  if (mode === 'unknown') {
    return {
      status: 503,
      ok: false,
      simulated: false,
      liveCallAttempted: false,
      routeId: route.id,
      refusal: 'PROVIDER_MODE_UNKNOWN',
      body: {
        ok: false,
        simulated: false,
        mode: 'unknown',
        error: `PROVIDER_MODE_UNKNOWN — the credential reference '${String(
          request.secretRef
        ).slice(0, 12)}…' is neither 'mock:' nor 'vault:'. Refusing, rather than treating an unknown mode as simulation.`,
      },
    };
  }

  /* SIMULATION — the mock-first path. Zero credentials, zero network calls. */
  if (mode === 'simulation') {
    const simulated = simulatedResponse(route, request);
    return {
      status: simulated.status,
      ok: simulated.body.ok === true,
      simulated: true,
      liveCallAttempted: false,
      routeId: route.id,
      body: simulated.body,
    };
  }

  /* The channel-label region rule is decided by the canonical rule, not by the
   * provider call: a UK/EU marketplace is REFUSED before any other work. */
  if (route.channelLabelRule && !channelGeneratesLabelsFor(request.marketplaceId)) {
    return {
      status: 200,
      ok: false,
      simulated: false,
      liveCallAttempted: false,
      routeId: route.id,
      refusal: 'LABELS_NOT_GENERATED_IN_REGION',
      body: {
        ok: false,
        simulated: false,
        mode: 'live',
        refused: true,
        refusedReason: labelRefusalReason(request.marketplaceId),
      },
    };
  }

  /* LIVE. A route with no confirmed provider contract REFUSES with a stated
   * code — before any credential or network work. */
  if (route.liveStatus === 'unsupported') {
    return {
      status: 503,
      ok: false,
      simulated: false,
      liveCallAttempted: false,
      routeId: route.id,
      refusal: route.liveRefusal,
      body: {
        ok: false,
        simulated: false,
        mode: 'live',
        refusal: route.liveRefusal,
        error: `${route.liveRefusal} — ${route.liveRefusalReason}`,
      },
    };
  }

  /* LIVE but no server-side credential — 503, never a pretend success. */
  if (!runtime.serverCredentialsResolved || !runtime.liveCall) {
    return {
      status: 503,
      ok: false,
      simulated: false,
      liveCallAttempted: false,
      routeId: route.id,
      refusal: 'PROXY_CREDENTIALS_UNAVAILABLE',
      body: {
        ok: false,
        simulated: false,
        mode: 'live',
        refusal: 'PROXY_CREDENTIALS_UNAVAILABLE',
        error:
          'PROXY_CREDENTIALS_UNAVAILABLE — the connection is live but the server holds no credential for it; refusing to pretend the call happened.',
      },
    };
  }

  try {
    const live = await runtime.liveCall(route, request);
    return {
      status: live.status,
      ok: live.body.ok === true,
      simulated: false,
      liveCallAttempted: true,
      routeId: route.id,
      body: live.body,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown transport error';
    return {
      status: 502,
      ok: false,
      simulated: false,
      liveCallAttempted: true,
      routeId: route.id,
      refusal: 'PROVIDER_CALL_FAILED',
      body: {
        ok: false,
        simulated: false,
        mode: 'live',
        error: `PROVIDER_CALL_FAILED — ${message}`,
      },
    };
  }
}
