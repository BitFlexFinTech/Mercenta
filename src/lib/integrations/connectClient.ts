/**
 * §BATCH1b — the client side of the connect backend.
 *
 * ONE place builds the Edge-Function URL and ONE shape is returned, so the wizard
 * never hand-rolls a fetch and can never mistake a network failure for a success.
 *
 * FAIL-CLOSED BY CONSTRUCTION: anything that is not a parsed `{ ok: true }` from the
 * function is reported as a failure. An unreachable/deployed-elsewhere function
 * yields `CONNECT_SERVICE_UNAVAILABLE` — never a pretend connection.
 *
 * The credential is sent ONCE, server-side only; it is never persisted here.
 */

export interface ServerConnectResult {
  ok: boolean;
  mode?: 'real' | 'simulation' | string;
  simulated?: boolean;
  secretRef?: string;
  httpStatus?: number;
  marketplaceId?: string;
  expiresIn?: number;
  code?: string;
  error?: string;
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

/** `${supabaseUrl}/functions/v1/...`, or the same-origin proxy fallback. */
export function functionsBase(): string {
  const supabaseUrl =
    typeof import.meta !== 'undefined' && import.meta.env.VITE_SUPABASE_URL
      ? (import.meta.env.VITE_SUPABASE_URL as string).replace(/\/$/, '')
      : '';
  return supabaseUrl ? `${supabaseUrl}/functions/v1` : '/api/functions/v1';
}

function anonKey(): string {
  return typeof import.meta !== 'undefined' && import.meta.env.VITE_SUPABASE_ANON_KEY
    ? (import.meta.env.VITE_SUPABASE_ANON_KEY as string)
    : '';
}

async function postFunction(
  name: string,
  payload: Record<string, unknown>,
  fetchImpl: FetchLike,
  accessToken?: string | null
): Promise<ServerConnectResult> {
  try {
    const res = await fetchImpl(`${functionsBase()}/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken ?? anonKey()}`,
      },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as ServerConnectResult;
    if (typeof data?.ok !== 'boolean') throw new Error('unexpected response shape');
    return data;
  } catch (err) {
    return {
      ok: false,
      code: 'CONNECT_SERVICE_UNAVAILABLE',
      error:
        `The connect service (${name}) could not be reached, so NOTHING was verified or stored. ` +
        `Deploy the Supabase Edge Function first. (${err instanceof Error ? err.message : String(err)})`,
    };
  }
}

/** Harmless provider test + Vault write, server-side. */
export function connectProvider(args: {
  integrationId: string;
  provider: string;
  fields: Record<string, string>;
  accessToken?: string | null;
  simulate?: boolean;
  fetchImpl?: FetchLike;
}): Promise<ServerConnectResult> {
  return postFunction(
    'integration-connect',
    {
      integrationId: args.integrationId,
      provider: args.provider,
      fields: args.fields,
      ...(args.simulate ? { simulate: true } : {}),
    },
    args.fetchImpl ?? fetch,
    args.accessToken
  );
}

/** SP-API authorization-code exchange + Vault write, server-side. */
export function exchangeSpapiCode(args: {
  code: string;
  clientId: string;
  redirectUri: string;
  marketplaceId: string;
  accessToken?: string | null;
  simulate?: boolean;
  fetchImpl?: FetchLike;
}): Promise<ServerConnectResult> {
  return postFunction(
    'spapi-token-exchange',
    {
      code: args.code,
      clientId: args.clientId,
      redirectUri: args.redirectUri,
      marketplaceId: args.marketplaceId,
      ...(args.simulate ? { simulate: true } : {}),
    },
    args.fetchImpl ?? fetch,
    args.accessToken
  );
}
