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

/**
 * §IMAGERY (2026-11-20) — Google Gemini.
 *
 * Lists one model, which proves the key is accepted by the Generative Language
 * API while generating nothing. A key that can list models is a key the imagery
 * generator can then use.
 */
export async function pingGemini(
  key: string,
  fetchImpl: PingFetch = fetch
): Promise<PingResult> {
  try {
    const res = await fetchWithTimeout(
      fetchImpl,
      'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1',
      { method: 'GET', headers: { 'x-goog-api-key': key } }
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

/**
 * §BATCH1b — DOES THIS PROVIDER HAVE A SERVER-SIDE LIVE TEST?
 *
 * The wizard must NOT try to verify a provider that has no API at all (CSV import),
 * and must NOT claim one is verified. This is the CLIENT's declaration of which
 * providers have a harmless live test.
 *
 * It must stay IDENTICAL to the server's declared set
 * (`supabase/functions/_shared/providerConnect.ts → PROVIDER_TESTS`), and
 * `scripts/validate-connect-wizard-backend.mjs` DERIVES BOTH and fails if they
 * diverge — so the two can never drift into a state where the wizard asks for a
 * verification the backend will refuse, or vice versa.
 */
export const LIVE_TEST_ENDPOINTS: ReadonlyArray<{ integrationId: string; provider: string }> = [
  { integrationId: 'openrouter', provider: '' },
  { integrationId: 'gemini', provider: '' },
  { integrationId: 'hunter', provider: '' },
  { integrationId: 'instantly', provider: '' },
  { integrationId: 'email', provider: 'postmark' },
  { integrationId: 'email', provider: 'sendgrid' },
  { integrationId: 'lead_sourcing', provider: 'apollo' },
  { integrationId: 'lead_sourcing', provider: 'instantly' },
];

export function hasLiveTestEndpoint(integrationId: string, provider: string): boolean {
  const p = provider.toLowerCase();
  return LIVE_TEST_ENDPOINTS.some(
    (e) => e.integrationId === integrationId && e.provider.toLowerCase() === p
  );
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
