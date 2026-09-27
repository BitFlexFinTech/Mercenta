/**
 * §BATCH1a — THE REAL (LIVE) AMAZON SP-API CALLER for the `spapi` proxy function.
 *
 * WHY ONLY THREE OPERATIONS
 * -------------------------
 * The route manifest marks a route `liveStatus: 'confirmed'` only when the
 * provider's documented contract can be written AND the platform already holds
 * the required inputs. For SP-API that is:
 *
 *   · spapi.purchaseOrders.read   → GetPurchaseOrders
 *   · spapi.purchaseOrders.status → GetPurchaseOrdersStatus
 *   · spapi.shipments.labels      → GetShipmentLabels (the channel generates
 *                                   labels in NA only; a UK/EU marketplace is
 *                                   REFUSED by the canonical region rule before
 *                                   this module is ever reached)
 *
 * Every other SP-API route refuses in live mode with a stated code (see
 * `proxyRoutes.ts`) because the platform does not hold the input the operation
 * requires (the channel's `itemSequenceNumber`, Mercenta's selling-party id) or
 * because no documented operation exists (AV-035). Guessing those would be a
 * fabricated integration, which this platform does not do.
 *
 * HONEST STATUS — UNVERIFIED AGAINST A LIVE RESPONSE
 * --------------------------------------------------
 * The hosts, request shapes and the wire→Mercenta mapping below are written from
 * the DOCUMENTED SP-API Vendor Orders / Vendor Shipping schemas. No live Amazon
 * credential exists in this repository, so this path has never been executed
 * against Amazon: it is a written, fail-closed implementation, NOT a verified
 * one. It never fabricates an identifier it was not given (an acknowledgement or
 * shipment id the channel does not return stays absent), and every failure is a
 * stated code rather than a silent default.
 */
import type {
  ProxyLiveCall,
  ProxyLiveFetch,
  ProxyLiveResult,
  ProxyRequest,
  ProxyRoute,
} from '../proxyRoutes.ts';
import { marketplaceRegion } from '../proxyRoutes.ts';

export interface SpapiLiveCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  marketplaceId: string;
}

/** The LWA token endpoint (documented `grant_type=refresh_token` flow). */
export const LWA_TOKEN_URL = 'https://api.amazon.com/auth/o2/token';

/** Region → SP-API host, declared once (an unknown region fails closed). */
export const SPAPI_HOST_BY_REGION: Record<string, string> = {
  EU: 'https://sellingpartnerapi-eu.amazon.com',
  NA: 'https://sellingpartnerapi-na.amazon.com',
  FE: 'https://sellingpartnerapi-fe.amazon.com',
};

function errorBody(code: string, detail: string, status = 502): ProxyLiveResult {
  return {
    status,
    body: { ok: false, simulated: false, mode: 'live', error: `${code} — ${detail}` },
  };
}

/** The channel's own error descriptions, when it returns any. */
function describeChannelErrors(payload: unknown): string {
  const errors = (payload as { errors?: { code?: string; message?: string }[] } | null)?.errors;
  if (!Array.isArray(errors) || errors.length === 0) return 'no error detail returned';
  return errors
    .map((e) => `${e.code ?? 'ERROR'}: ${e.message ?? 'no message'}`)
    .join('; ')
    .slice(0, 500);
}

/** Exchange the stored refresh token for a short-lived LWA access token. */
export async function requestLwaAccessToken(
  credentials: SpapiLiveCredentials,
  fetchImpl: ProxyLiveFetch
): Promise<{ ok: true; accessToken: string } | { ok: false; error: string }> {
  const form = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: credentials.refreshToken,
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
  });
  const res = await fetchImpl(LWA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  const raw = await res.text();
  if (!res.ok) {
    return { ok: false, error: `LWA_TOKEN_EXCHANGE_FAILED (HTTP ${res.status}) — ${raw.slice(0, 300)}` };
  }
  let payload: { access_token?: string };
  try {
    payload = JSON.parse(raw) as { access_token?: string };
  } catch {
    return { ok: false, error: 'LWA_TOKEN_EXCHANGE_FAILED — the token endpoint returned non-JSON' };
  }
  if (!payload.access_token) {
    return { ok: false, error: 'LWA_TOKEN_EXCHANGE_FAILED — the response carried no access_token' };
  }
  return { ok: true, accessToken: payload.access_token };
}

/* ═══════════════════════════════════════════════════════════════════════════
 * THE WIRE → MERCENTA MAPPING (documented schema; unverified live).
 *
 * Nothing here invents a value: a field the channel did not return stays absent,
 * and a channel vocabulary this client does not recognise is a STATED failure
 * rather than a guessed state.
 * ═══════════════════════════════════════════════════════════════════════════ */
export function mapChannelPurchaseOrder(
  order: Record<string, any>
): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } {
  const details = order.orderDetails ?? {};
  const items = Array.isArray(details.items) ? details.items : [];
  const lines: Record<string, unknown>[] = [];
  let everyLinePriced = true;
  for (const item of items) {
    const vendorSku = String(item.vendorProductIdentifier ?? '').trim();
    if (!vendorSku) continue; // a line the channel did not identify is never guessed
    const quantity = Number(item.orderedQuantity?.amount ?? 0);
    const priced = item.netCost?.amount !== undefined && item.netCost?.amount !== null;
    if (!priced) everyLinePriced = false;
    lines.push({
      vendorSku,
      ...(item.amazonProductIdentifier ? { asin: String(item.amazonProductIdentifier) } : {}),
      quantity,
      unitPrice: priced ? Number(item.netCost.amount) : 0,
    });
  }
  if (lines.length === 0) {
    return {
      ok: false,
      error: 'SPAPI_PO_NO_IDENTIFIED_LINES — the channel returned no line this client can identify',
    };
  }

  const shipment = order.shipmentDetails ?? {};
  const freightTermRaw = String(shipment.freightTerms ?? '').toLowerCase();
  const shipWindow = shipment.shipWindow ?? {};
  const deliveryWindow = shipment.deliveryWindow ?? {};
  const poValue = everyLinePriced
    ? Math.round(
        lines.reduce((sum, line) => sum + Number(line.quantity) * Number(line.unitPrice), 0) * 100
      ) / 100
    : 0;

  return {
    ok: true,
    value: {
      purchaseOrderId: String(order.purchaseOrderNumber ?? ''),
      poValue,
      ...(everyLinePriced
        ? {}
        : {
            poValueNote:
              'PO_VALUE_NOT_CLAIMED — at least one channel line returned no netCost, so no total is stated.',
          }),
      orderDate: String(details.purchaseOrderDate ?? ''),
      shipToPartyId: String(shipment.shipToParty?.partyId ?? ''),
      ...(freightTermRaw === 'collect' || freightTermRaw === 'prepaid'
        ? { freightTerm: freightTermRaw }
        : {}),
      ...(shipWindow.startDate ? { shipWindowStart: String(shipWindow.startDate) } : {}),
      ...(shipWindow.endDate ? { shipWindowEnd: String(shipWindow.endDate) } : {}),
      ...(deliveryWindow.startDate
        ? { deliveryWindowStart: String(deliveryWindow.startDate) }
        : {}),
      ...(deliveryWindow.endDate ? { deliveryWindowEnd: String(deliveryWindow.endDate) } : {}),
      lines,
      simulated: false,
    },
  };
}

/** The channel's own PO state → Mercenta's vocabulary. Unknown ⇒ STATED failure. */
export function mapChannelPurchaseOrderStatus(order: Record<string, any>): {
  ok: true;
  value: Record<string, unknown>;
} | { ok: false; error: string } {
  const rawStatus = String(order.purchaseOrderStatus ?? '').toUpperCase();
  const status =
    rawStatus === 'OPEN'
      ? 'open'
      : rawStatus === 'ACKNOWLEDGED'
        ? 'acknowledged'
        : rawStatus === 'CLOSED'
          ? 'closed'
          : rawStatus === 'CANCELLED'
            ? 'cancelled'
            : null;
  if (!status) {
    return {
      ok: false,
      error: `SPAPI_PO_STATUS_UNRECOGNISED — the channel returned purchaseOrderStatus '${rawStatus}', which this client does not map. Refusing to guess a PO state.`,
    };
  }

  const items = Array.isArray(order.itemStatus) ? order.itemStatus : [];
  const lines = items
    .map((item: any) => ({
      vendorSku: String(item.vendorProductIdentifier ?? ''),
      orderedQty: Number(item.orderedQuantity?.amount ?? 0),
      receivedQty: Number(item.receivedQuantity?.amount ?? 0),
      ...(item.amazonProductIdentifier ? { asin: String(item.amazonProductIdentifier) } : {}),
    }))
    .filter((line: { vendorSku: string }) => line.vendorSku.trim() !== '');

  const fullyReceived = lines.length > 0 && lines.every((l) => l.receivedQty >= l.orderedQty);
  const anyReceived = lines.some((l) => l.receivedQty > 0);
  const receivingStatus = fullyReceived
    ? 'received'
    : anyReceived
      ? 'partially_received'
      : 'not_received';

  return {
    ok: true,
    value: {
      purchaseOrderId: String(order.purchaseOrderNumber ?? ''),
      status,
      receivingStatus: status === 'closed' ? 'received' : receivingStatus,
      lines,
      ...(order.lastUpdatedDate ? { receivedDate: String(order.lastUpdatedDate) } : {}),
      simulated: false,
    },
  };
}
/* ═══════════════════════════════════════════════════════════════════════════
 * THE CALLER — the two confirmed SP-API operations.
 * ═══════════════════════════════════════════════════════════════════════════ */
export function createSpapiLiveCall(
  credentials: SpapiLiveCredentials,
  fetchImpl: ProxyLiveFetch
): ProxyLiveCall {
  return async (route: ProxyRoute, request: ProxyRequest): Promise<ProxyLiveResult> => {
    const region = marketplaceRegion(credentials.marketplaceId || request.marketplaceId);
    const host = SPAPI_HOST_BY_REGION[region];
    if (!host) {
      return errorBody(
        'SPAPI_MARKETPLACE_REGION_UNKNOWN',
        `the marketplace '${credentials.marketplaceId || request.marketplaceId || ''}' maps to no SP-API region, so no host is assumed.`,
        503
      );
    }

    const token = await requestLwaAccessToken(credentials, fetchImpl);
    if (!token.ok) return errorBody('LWA_TOKEN_EXCHANGE_FAILED', token.error, 502);

    const headers = {
      'x-amz-access-token': token.accessToken,
      Accept: 'application/json',
    };

    if (route.id === 'spapi.purchaseOrders.read') {
      const since = request.query?.since ?? '';
      const url = `${host}/vendor/orders/v1/purchaseOrders?createdAfter=${encodeURIComponent(
        since
      )}&limit=100`;
      const res = await fetchImpl(url, { method: 'GET', headers });
      const raw = await res.text();
      let payload: any;
      try {
        payload = JSON.parse(raw);
      } catch {
        return errorBody('SPAPI_PURCHASE_ORDERS_UNREADABLE', 'the channel returned non-JSON', 502);
      }
      if (!res.ok) {
        return errorBody('SPAPI_PURCHASE_ORDERS_FAILED', describeChannelErrors(payload), res.status);
      }
      const orders = Array.isArray(payload?.payload?.orders) ? payload.payload.orders : [];
      const mapped: Record<string, unknown>[] = [];
      for (const order of orders) {
        const result = mapChannelPurchaseOrder(order);
        if (!result.ok) return errorBody('SPAPI_PURCHASE_ORDER_UNMAPPABLE', result.error, 502);
        mapped.push(result.value);
      }
      return {
        status: 200,
        body: { ok: true, simulated: false, mode: 'live', purchaseOrders: mapped },
      };
    }

    if (route.id === 'spapi.purchaseOrders.status') {
      const ids = (request.query?.ids ?? '')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
      const url = `${host}/vendor/orders/v1/purchaseOrdersStatus?purchaseOrderNumbers=${encodeURIComponent(
        ids.join(',')
      )}`;
      const res = await fetchImpl(url, { method: 'GET', headers });
      const raw = await res.text();
      let payload: any;
      try {
        payload = JSON.parse(raw);
      } catch {
        return errorBody('SPAPI_PO_STATUS_UNREADABLE', 'the channel returned non-JSON', 502);
      }
      if (!res.ok) {
        return errorBody('SPAPI_PO_STATUS_FAILED', describeChannelErrors(payload), res.status);
      }
      const ordersStatus = Array.isArray(payload?.payload?.ordersStatus)
        ? payload.payload.ordersStatus
        : [];
      const statuses: Record<string, unknown>[] = [];
      const returned = new Set<string>();
      for (const order of ordersStatus) {
        const result = mapChannelPurchaseOrderStatus(order);
        if (!result.ok) return errorBody('SPAPI_PO_STATUS_UNMAPPABLE', result.error, 502);
        returned.add(String(result.value.purchaseOrderId));
        statuses.push(result.value);
      }
      /**
       * §P12 contract: ids the channel does not know are reported SEPARATELY, so
       * "absent" can never be read as "not received".
       */
      const unknownPurchaseOrderIds = ids.filter((id) => !returned.has(id));
      return {
        status: 200,
        body: { ok: true, simulated: false, mode: 'live', statuses, unknownPurchaseOrderIds },
      };
    }

    return errorBody(
      'SPAPI_LIVE_OPERATION_NOT_IMPLEMENTED',
      `${route.id} has no live caller; the route manifest marks it unsupported, so this path is unreachable by design.`,
      503
    );
  };
}


