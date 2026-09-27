/**
 * §BATCH1a — THE REAL (LIVE) DHL CALLER for the `dhl` proxy function.
 *
 * ONE CONFIRMED OPERATION: `GET /shipments/{waybill}` → DHL's Shipment Tracking
 * REST API (`https://api-eu.dhl.com/track/shipments?trackingNumber=…`).
 *
 * Booking (`POST /shipments`) and pickup (`POST /shipments/pickup`) are NOT
 * implemented live, and the route manifest says so with a stated code: a live
 * MyDHL booking needs shipper/receiver addresses and per-package weight +
 * dimensions, and the shipment domain holds an origin label, a destination label
 * and a carton count — so a live booking would have to invent the missing cargo
 * facts. Simulation covers those routes fully in the meantime.
 *
 * HONEST STATUS — UNVERIFIED AGAINST A LIVE RESPONSE: the host, header and the
 * status→milestone mapping are written from the DOCUMENTED tracking API; no live
 * DHL credential exists in this repository, so this path has never run. A status
 * code it cannot map is a STATED refusal (`DHL_STATUS_UNRECOGNISED`) that prints
 * the raw channel code — it never guesses a milestone.
 */
import type {
  ProxyLiveCall,
  ProxyLiveFetch,
  ProxyLiveResult,
  ProxyRequest,
  ProxyRoute,
} from '../proxyRoutes.ts';

export interface DhlLiveCredentials {
  apiKey: string;
  /** DHL billing account number (non-secret operational metadata). */
  accountNumber?: string;
}

export const DHL_TRACKING_HOST = 'https://api-eu.dhl.com';

/**
 * DHL's own status codes → Mercenta's milestone vocabulary. Only codes this
 * platform can justify are listed; anything else is refused, not guessed.
 */
export const DHL_STATUS_CODE_MILESTONE: Record<string, string> = {
  'pre-transit': 'label_created',
  pret: 'label_created',
  transit: 'in_transit',
  forwarded: 'in_transit',
  delivered: 'delivered',
  dl: 'delivered',
};

function errorBody(code: string, detail: string, status = 502): ProxyLiveResult {
  return {
    status,
    body: { ok: false, simulated: false, mode: 'live', error: `${code} — ${detail}` },
  };
}

/**
 * Map a DHL tracking response onto the milestone contract. The LATEST event that
 * maps wins; the channel's own description text is passed through as the
 * exception reason; nothing is fabricated when no event maps.
 */
export function mapDhlTrackingResponse(payload: any): ProxyLiveResult {
  const shipment = Array.isArray(payload?.shipments) ? payload.shipments[0] : null;
  if (!shipment) {
    return errorBody(
      'DHL_TRACKING_NOT_FOUND',
      'the tracking API returned no shipment for that number',
      404
    );
  }

  const events: any[] = Array.isArray(shipment.events) ? shipment.events : [];
  /**
   * PREFERENCE, stated explicitly rather than left to "last write wins":
   * the top-level `status.statusCode` is DHL's OWN current status, so it decides
   * the milestone whenever it maps. Only when it does not map (or is absent) is
   * the LATEST event that maps used as the fallback. If neither maps, the response
   * is refused below — a milestone is never guessed.
   */
  const aggregateKey = String(shipment?.status?.statusCode ?? '').toLowerCase();
  let milestone: string | undefined = aggregateKey
    ? DHL_STATUS_CODE_MILESTONE[aggregateKey]
    : undefined;
  if (!milestone) {
    for (const event of events) {
      const key = String(event?.statusCode ?? '').toLowerCase();
      if (key && DHL_STATUS_CODE_MILESTONE[key]) milestone = DHL_STATUS_CODE_MILESTONE[key];
    }
  }
  if (!milestone) {
    const codes = [aggregateKey, ...events.map((e) => String(e?.statusCode ?? '').toLowerCase())]
      .filter(Boolean)
      .join(', ');
    return errorBody(
      'DHL_STATUS_UNRECOGNISED',
      `the tracking API returned status codes [${codes}], none of which this client maps. Refusing to guess a milestone.`,
      502
    );
  }

  const failureEvent = events.find(
    (e) => String(e?.statusCode ?? '').toLowerCase() === 'failure'
  );
  const estimated =
    shipment.estimatedTimeOfDelivery ??
    shipment.estimatedDeliveryTime ??
    shipment.estimatedDelivery;

  return {
    status: 200,
    body: {
      ok: true,
      simulated: false,
      mode: 'live',
      milestone,
      ...(estimated ? { estimatedDelivery: String(estimated) } : {}),
      ...(failureEvent
        ? {
            exception: true,
            exceptionReason: String(
              failureEvent?.status ?? failureEvent?.description ?? 'DHL reported a failure event'
            ),
          }
        : {}),
    },
  };
}

export function createDhlLiveCall(
  credentials: DhlLiveCredentials,
  fetchImpl: ProxyLiveFetch
): ProxyLiveCall {
  return async (route: ProxyRoute, request: ProxyRequest): Promise<ProxyLiveResult> => {
    if (route.id !== 'dhl.shipments.status') {
      return errorBody(
        'DHL_LIVE_OPERATION_NOT_IMPLEMENTED',
        `${route.id} has no live caller; the route manifest marks it unsupported, so this path is unreachable by design.`,
        503
      );
    }
    const waybill = request.path.split('/').filter(Boolean).pop() ?? '';
    const url = `${DHL_TRACKING_HOST}/track/shipments?trackingNumber=${encodeURIComponent(waybill)}`;
    const res = await fetchImpl(url, {
      method: 'GET',
      headers: { 'DHL-API-Key': credentials.apiKey, Accept: 'application/json' },
    });
    const raw = await res.text();
    if (res.status === 404) {
      return errorBody(
        'DHL_TRACKING_NOT_FOUND',
        'the tracking API does not know that waybill number',
        404
      );
    }
    let payload: any;
    try {
      payload = JSON.parse(raw);
    } catch {
      return errorBody('DHL_TRACKING_UNREADABLE', 'the tracking API returned non-JSON', 502);
    }
    if (!res.ok) {
      return errorBody(
        'DHL_TRACKING_FAILED',
        `HTTP ${res.status} — ${JSON.stringify(payload).slice(0, 300)}`,
        res.status
      );
    }
    return mapDhlTrackingResponse(payload);
  };
}
