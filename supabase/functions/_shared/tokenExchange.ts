/**
 * §BATCH1b — THE SP-API OAUTH TOKEN EXCHANGE (the wizard's missing step 2).
 *
 * `src/components/admin/integrations/IntegrationsPanel.tsx → completeOAuthExchange`
 * has always POSTed the authorization code to
 * `${supabaseUrl}/functions/v1/spapi-token-exchange` — a function that DID NOT
 * EXIST. This is it: the code is exchanged for tokens at Amazon's Login-with-Amazon
 * endpoint and the resulting credential is written to Supabase Vault, so the client
 * only ever receives the `vault:<name>` reference.
 *
 * TRUTHFULNESS CONTRACT
 *   · LIVE requires the server-side LWA client secret (`SPAPI_CLIENT_SECRET`).
 *     Without it the function FAILS CLOSED (503) with the exact missing input —
 *     it never simulates in order to look successful.
 *   · SIMULATION happens only when explicitly requested (`simulate: true`), makes
 *     ZERO network calls, stores NOTHING, and returns a `mock:` reference.
 *   · A bad code is reported with Amazon's own error text, and nothing is stored.
 */
import type { ConnectOutcome, ConnectTransport } from './providerConnect.ts';

export interface TokenExchangeDeps {
  transport: ConnectTransport;
  writeSecret: (name: string, value: string, description?: string) => Promise<boolean>;
  secretName: (integrationId: string, provider: string) => string;
  env: Record<string, string | undefined>;
  now: () => string;
}

export interface TokenExchangeRequest {
  code?: string;
  /** The public application id from Seller Central (not a secret). */
  clientId?: string;
  /** Must match the redirect_uri used for the consent screen. */
  redirectUri?: string;
  marketplaceId?: string;
  simulate?: boolean;
}

/** Amazon Login-with-Amazon token endpoint — the ONLY exchange host. */
export const SPAPI_LWA_TOKEN_URL = 'https://api.amazon.com/auth/o2/token';
export const SPAPI_DEFAULT_MARKETPLACE = 'A1F83G8C2ARO7P';
export const SPAPI_CLIENT_SECRET_ENV = 'SPAPI_CLIENT_SECRET';
export const SPAPI_CLIENT_ID_ENV = 'SPAPI_CLIENT_ID';

export async function handleSpapiTokenExchange(
  req: TokenExchangeRequest,
  deps: TokenExchangeDeps
): Promise<ConnectOutcome> {
  const integrationId = 'amazon_sp_api';

  /* ── SIMULATION — explicit only, zero network, nothing stored ──────────── */
  if (req.simulate === true) {
    return {
      status: 200,
      networkCalls: 0,
      secretsWritten: [],
      body: {
        ok: true,
        mode: 'simulation',
        simulated: true,
        marketplaceId: req.marketplaceId ?? SPAPI_DEFAULT_MARKETPLACE,
        secretRef: 'mock:amazon_sp_api-refresh-token',
        expiresIn: 3600,
        testedAt: deps.now(),
        note: 'Simulated exchange — no Amazon call was made and no token was stored.',
      },
    };
  }

  const code = (req.code ?? '').trim();
  if (!code) {
    return {
      status: 400,
      networkCalls: 0,
      secretsWritten: [],
      body: {
        ok: false,
        code: 'TOKEN_CODE_REQUIRED',
        error: 'No authorization code was supplied, so there was nothing to exchange.',
      },
    };
  }

  const clientId = (req.clientId ?? '').trim() || (deps.env[SPAPI_CLIENT_ID_ENV] ?? '').trim();
  const clientSecret = (deps.env[SPAPI_CLIENT_SECRET_ENV] ?? '').trim();

  /* ── FAIL CLOSED — the genuine missing input, stated exactly ───────────── */
  if (!clientSecret || !clientId) {
    const missing = [
      !clientId ? SPAPI_CLIENT_ID_ENV : null,
      !clientSecret ? SPAPI_CLIENT_SECRET_ENV : null,
    ].filter(Boolean).join(' and ');
    return {
      status: 503,
      networkCalls: 0,
      secretsWritten: [],
      body: {
        ok: false,
        code: 'SPAPI_CLIENT_SECRET_MISSING',
        error:
          `The server is missing ${missing}. The authorization code was NOT exchanged and nothing ` +
          'was stored. Set it as a Supabase function secret (supabase secrets set ...).',
      },
    };
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    client_secret: clientSecret,
    ...(req.redirectUri ? { redirect_uri: req.redirectUri } : {}),
  }).toString();

  let networkCalls = 0;
  let res;
  try {
    networkCalls += 1;
    res = await deps.transport(SPAPI_LWA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  } catch (err) {
    return {
      status: 502,
      networkCalls,
      secretsWritten: [],
      body: {
        ok: false,
        mode: 'real',
        simulated: false,
        code: 'PROVIDER_UNREACHABLE',
        error: `Could not reach ${SPAPI_LWA_TOKEN_URL}: ${err instanceof Error ? err.message : String(err)}`,
      },
    };
  }

  const raw = await res.text().catch(() => '');
  if (!res.ok) {
    return {
      status: 400,
      networkCalls,
      secretsWritten: [],
      body: {
        ok: false,
        mode: 'real',
        simulated: false,
        code: 'CODE_REJECTED',
        error: `Amazon rejected the authorization code (HTTP ${res.status}): ${raw.trim().slice(0, 300)}`,
      },
    };
  }

  let parsed: { refresh_token?: string; access_token?: string; expires_in?: number } = {};
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    parsed = {};
  }
  const refreshToken = (parsed.refresh_token ?? '').trim();
  if (!refreshToken) {
    return {
      status: 502,
      networkCalls,
      secretsWritten: [],
      body: {
        ok: false,
        mode: 'real',
        simulated: false,
        code: 'TOKEN_EXCHANGE_NO_REFRESH_TOKEN',
        error: 'Amazon returned no refresh token, so no durable credential could be stored.',
      },
    };
  }

  const marketplaceId = req.marketplaceId ?? SPAPI_DEFAULT_MARKETPLACE;
  const encoded = JSON.stringify({ refreshToken, clientId, marketplaceId });
  const name = deps.secretName(integrationId, 'refresh_token');
  const stored = await deps.writeSecret(
    name,
    encoded,
    `Mercenta SP-API refresh token (${marketplaceId})`
  );
  if (!stored) {
    return {
      status: 502,
      networkCalls,
      secretsWritten: [],
      body: {
        ok: false,
        mode: 'real',
        simulated: false,
        code: 'VAULT_WRITE_FAILED',
        error:
          'Amazon issued a refresh token but it could NOT be stored in Vault, so no connection was ' +
          'created. Check the Supabase service-role key and the vault extension.',
      },
    };
  }

  return {
    status: 200,
    networkCalls,
    secretsWritten: [name],
    body: {
      ok: true,
      mode: 'real',
      simulated: false,
      marketplaceId,
      secretRef: `vault:${name}`,
      expiresIn: parsed.expires_in ?? 3600,
      testedAt: deps.now(),
      note: 'Real exchange succeeded and the refresh token was stored server-side in Vault.',
    },
  };
}

