/**
 * §Stage-7 — REAL integration test calls.
 *
 * Each "Test Connection & Save" performs an actual authenticated ping to the
 * provider. No fake success messages: success requires the API to accept the
 * key; anything else is reported verbatim as "Needs attention".
 *
 * `fetchImpl` is injectable for tests; production uses the browser fetch.
 */

export interface PingResult {
  ok: boolean;
  httpStatus?: number;
  /** Authentic failure text — surfaced verbatim in the card, never replaced. */
  error?: string;
  data?: unknown;
}

export type PingFetch = (url: string, init?: RequestInit) => Promise<Response>;

async function fetchWithTimeout(
  fetchImpl: PingFetch,
  url: string,
  init: RequestInit,
  ms = 9000
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetchImpl(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

function classify(res: Response, data: unknown): PingResult {
  const anyData = data as { error?: string; ok?: boolean } | undefined;
  const apiError =
    anyData && typeof anyData === 'object'
      ? anyData.error ?? (anyData.ok === false ? 'API reported an error' : undefined)
      : undefined;
  const ok = res.ok && !apiError;
  return {
    ok,
    httpStatus: res.status,
    ...(ok ? { data } : { error: apiError ?? `HTTP ${res.status}` }),
  };
}

export async function pingOpenRouter(
  key: string,
  fetchImpl: PingFetch = fetch
): Promise<PingResult> {
  try {
    const res = await fetchWithTimeout(
      fetchImpl,
      'https://openrouter.ai/api/v1/auth/key',
      { method: 'GET', headers: { Authorization: `Bearer ${key}` } }
    );
    return classify(res, await res.json().catch(() => undefined));
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function pingHunter(
  key: string,
  fetchImpl: PingFetch = fetch
): Promise<PingResult> {
  try {
    const res = await fetchWithTimeout(
      fetchImpl,
      `https://api.hunter.io/v2/account?api_key=${encodeURIComponent(key)}`,
      { method: 'GET' }
    );
    return classify(res, await res.json().catch(() => undefined));
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function pingInstantly(
  key: string,
  fetchImpl: PingFetch = fetch
): Promise<PingResult> {
  try {
    const res = await fetchWithTimeout(
      fetchImpl,
      `https://api.instantly.ai/api/v1/account/list?api_key=${encodeURIComponent(key)}`,
      { method: 'GET' }
    );
    return classify(res, await res.json().catch(() => undefined));
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function pingApollo(
  key: string,
  fetchImpl: PingFetch = fetch
): Promise<PingResult> {
  try {
    const res = await fetchWithTimeout(fetchImpl, 'https://api.apollo.io/v1/auth/health', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: key }),
    });
    return classify(res, await res.json().catch(() => undefined));
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function pingPostmark(
  key: string,
  fetchImpl: PingFetch = fetch
): Promise<PingResult> {
  try {
    const res = await fetchWithTimeout(
      fetchImpl,
      'https://api.postmarkapp.com/server',
      { headers: { Accept: 'application/json', 'X-Postmark-Server-Token': key } }
    );
    return classify(res, await res.json().catch(() => undefined));
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function pingSendGrid(
  key: string,
  fetchImpl: PingFetch = fetch
): Promise<PingResult> {
  try {
    const res = await fetchWithTimeout(
      fetchImpl,
      'https://api.sendgrid.com/v3/scopes',
      { headers: { Authorization: `Bearer ${key}` } }
    );
    return classify(res, await res.json().catch(() => undefined));
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Dispatch a real ping for an integration card + chosen provider. */
export async function pingForService(
  integrationId: string,
  provider: string,
  key: string,
  fetchImpl?: PingFetch
): Promise<PingResult | null> {
  const p = provider.toLowerCase();
  switch (integrationId) {
    case 'openrouter':
      return pingOpenRouter(key, fetchImpl);
    case 'hunter':
      return pingHunter(key, fetchImpl);
    case 'instantly':
      return pingInstantly(key, fetchImpl);
    case 'email':
      return p === 'sendgrid' ? pingSendGrid(key, fetchImpl) : pingPostmark(key, fetchImpl);
    case 'lead_sourcing':
      if (p === 'apollo') return pingApollo(key, fetchImpl);
      if (p === 'instantly') return pingInstantly(key, fetchImpl);
      return null; // CSV import: no live API to ping
    default:
      return null;
  }
}
