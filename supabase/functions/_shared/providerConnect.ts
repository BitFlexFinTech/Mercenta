/**
 * §BATCH1b — THE CONNECT WIZARD'S BACKEND HALF (steps 2 and 3).
 *
 * WHAT WAS MISSING
 * ----------------
 * The wizard's "Test Connection & Save" ran a test IN THE BROWSER
 * (`src/lib/integrations/testCalls.ts`) and then held the key in memory only.
 * There was no server-side exchange, no encrypted storage, and — for every
 * provider except the six the browser happened to know — no test at all. So a
 * real key could never become a real connection.
 *
 * WHAT THIS DOES
 *   1. performs the harmless test call SERVER-SIDE with the submitted key (the
 *      browser never has to reach the provider, so CORS and key exposure both go);
 *   2. on a genuine 2xx, writes the credential to Supabase Vault and returns ONLY
 *      the `vault:<name>` reference — exactly what `src/integrations/connections.ts`
 *      needs to hand the real provider clients their credentials;
 *   3. on a provider whose harmless test endpoint is NOT declared, REFUSES with a
 *      stated code naming the exact missing input. It never invents an endpoint and
 *      never fakes a success;
 *   4. SIMULATION is never implicit: it happens only when the caller explicitly
 *      asks (`simulate: true`), performs ZERO network calls, stores NOTHING, and is
 *      labelled `simulated: true` with a `mock:` reference the live factories
 *      reject.
 *
 * The handler takes its side effects as DEPENDENCIES so the fake-key rehearsal
 * gate can execute this exact code with a scripted transport and a recording
 * vault writer — see `scripts/validate-connect-wizard-backend.mjs`.
 */

export interface ConnectTransportResponse {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
}

export type ConnectTransport = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string }
) => Promise<ConnectTransportResponse>;

export interface ConnectDeps {
  transport: ConnectTransport;
  /** Writes the credential to Vault. Returns false when Vault is unreachable. */
  writeSecret: (name: string, value: string, description?: string) => Promise<boolean>;
  /** Deterministic secret naming so a re-connect updates rather than duplicates. */
  secretName: (integrationId: string, provider: string) => string;
  now: () => string;
}

export interface ConnectRequest {
  integrationId?: string;
  provider?: string;
  /** Wizard field values. `api_key` is the credential; others are configuration. */
  fields?: Record<string, string>;
  /** Explicit, never implied. */
  simulate?: boolean;
}

export interface ConnectOutcome {
  status: number;
  body: Record<string, unknown>;
  /** Proved for the gate: a simulation must make zero network calls. */
  networkCalls: number;
  /** Proved for the gate: nothing may be stored unless a test genuinely passed. */
  secretsWritten: string[];
}

/**
 * A harmless (read-only, zero-side-effect) endpoint that proves a key is valid.
 * `harmless` is REQUIRED and is the reason the call is safe to repeat.
 */
export interface ProviderTest {
  url: string;
  method: 'GET' | 'POST';
  headers: (credential: string, fields: Record<string, string>) => Record<string, string>;
  body?: (credential: string, fields: Record<string, string>) => unknown;
  /** Why this call cannot change anything at the provider. */
  harmless: string;
}

const bearer = (credential: string) => ({ Authorization: `Bearer ${credential}` });
const jsonHeaders = { 'Content-Type': 'application/json' } as Record<string, string>;

/**
 * THE DECLARED TEST REGISTRY — one entry per provider whose harmless endpoint is
 * EVIDENCED IN THIS REPOSITORY (`src/lib/integrations/testCalls.ts`, the project's
 * own canonical harmless-test module).
 *
 * A provider NOT listed here has no declared test: the wizard refuses it with
 * `TEST_ENDPOINT_NOT_DECLARED` rather than guessing a URL or faking success.
 * `declaredTests()` is asserted by the gate so this list cannot silently shrink.
 */
export const PROVIDER_TESTS: Record<string, Record<string, ProviderTest>> = {
  openrouter: {
    '': {
      url: 'https://openrouter.ai/api/v1/auth/key',
      method: 'GET',
      headers: bearer,
      harmless: 'Reads key metadata for the submitted key. Changes nothing.',
    },
  },
  /**
   * §IMAGERY (2026-11-20) — Google Gemini.
   *
   * The harmless test LISTS ONE MODEL: it proves the key is accepted by the
   * Generative Language API without generating anything, so connecting the
   * wizard costs nothing and cannot burn image quota. Generating an image to
   * "test" would be the opposite of harmless.
   */
  gemini: {
    '': {
      url: 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1',
      method: 'GET',
      headers: (credential) => ({ 'x-goog-api-key': credential }),
      harmless: 'Lists one model the key can reach. Generates nothing and changes nothing.',
    },
  },
  hunter: {
    '': {
      url: 'https://api.hunter.io/v2/account?api_key={credential}',
      method: 'GET',
      headers: () => ({}),
      harmless: 'Reads the account record. Changes nothing.',
    },
  },
  instantly: {
    '': {
      url: 'https://api.instantly.ai/api/v1/account/list?api_key={credential}',
      method: 'GET',
      headers: () => ({}),
      harmless: 'Lists the sending accounts. Changes nothing.',
    },
  },
  email: {
    postmark: {
      url: 'https://api.postmarkapp.com/server',
      method: 'GET',
      headers: (credential) => ({ Accept: 'application/json', 'X-Postmark-Server-Token': credential }),
      harmless: 'Reads the server record. Sends no email.',
    },
    sendgrid: {
      url: 'https://api.sendgrid.com/v3/scopes',
      method: 'GET',
      headers: bearer,
      harmless: 'Reads the key scopes. Sends no email.',
    },
  },
  lead_sourcing: {
    apollo: {
      url: 'https://api.apollo.io/v1/auth/health',
      method: 'POST',
      headers: () => jsonHeaders,
      body: (credential) => ({ api_key: credential }),
      harmless: 'Auth health check. Reads nothing and changes nothing.',
    },
    instantly: {
      url: 'https://api.instantly.ai/api/v1/account/list?api_key={credential}',
      method: 'GET',
      headers: () => ({}),
      harmless: 'Lists the sending accounts. Changes nothing.',
    },
  },
};

/** Every declared `integrationId/provider` pair — asserted by the gate. */
export function declaredTests(): string[] {
  const out: string[] = [];
  for (const [id, byProvider] of Object.entries(PROVIDER_TESTS)) {
    for (const provider of Object.keys(byProvider)) out.push(`${id}/${provider}`);
  }
  return out.sort();
}

export function resolveProviderTest(
  integrationId: string,
  provider: string
): ProviderTest | null {
  const byProvider = PROVIDER_TESTS[integrationId];
  if (!byProvider) return null;
  return byProvider[provider] ?? byProvider[''] ?? null;
}

/** `{credential}` placeholders become the URL-encoded submitted key. */
function materialise(text: string, credential: string): string {
  return text.replace(/\{credential\}/g, encodeURIComponent(credential));
}

/** Short, honest error text — the provider's own words where they exist. */
function honestError(status: number, raw: string): string {
  const trimmed = raw.trim().slice(0, 300);
  if (!trimmed) return `Provider rejected the credential (HTTP ${status}).`;
  return `Provider rejected the credential (HTTP ${status}): ${trimmed}`;
}


export async function handleProviderConnect(
  req: ConnectRequest,
  deps: ConnectDeps
): Promise<ConnectOutcome> {
  const integrationId = (req.integrationId ?? '').trim();
  const provider = (req.provider ?? '').trim();
  const fields = req.fields ?? {};
  const credential = (fields.api_key ?? '').trim();

  if (!integrationId) {
    return {
      status: 400,
      networkCalls: 0,
      secretsWritten: [],
      body: { ok: false, code: 'INTEGRATION_REQUIRED', error: 'No integration was named.' },
    };
  }

  const test = resolveProviderTest(integrationId, provider);

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
        integrationId,
        provider,
        httpStatus: 200,
        secretRef: `mock:${integrationId}${provider ? `-${provider}` : ''}`,
        testedAt: deps.now(),
        note: 'Simulated connect — no provider call was made and no credential was stored.',
      },
    };
  }

  /* ── FAIL CLOSED — no declared harmless test, so no claim can be made ──── */
  if (!test) {
    return {
      status: 400,
      networkCalls: 0,
      secretsWritten: [],
      body: {
        ok: false,
        code: 'TEST_ENDPOINT_NOT_DECLARED',
        error:
          `No harmless test endpoint is declared for '${integrationId}/${provider || '(default)'}'. ` +
          'Nothing was stored. Declare an evidence-backed endpoint in ' +
          'supabase/functions/_shared/providerConnect.ts before a real key can be verified.',
      },
    };
  }

  if (!credential) {
    return {
      status: 400,
      networkCalls: 0,
      secretsWritten: [],
      body: {
        ok: false,
        code: 'CREDENTIAL_REQUIRED',
        error: 'An API key is required. Nothing was stored.',
      },
    };
  }

  /* ── REAL TEST — a genuine call, then (only on success) a vault write ──── */
  let networkCalls = 0;
  let res: ConnectTransportResponse;
  try {
    networkCalls += 1;
    res = await deps.transport(materialise(test.url, credential), {
      method: test.method,
      headers: test.headers(credential, fields),
      ...(test.body ? { body: JSON.stringify(test.body(credential, fields)) } : {}),
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
        error: `Could not reach ${test.url}: ${err instanceof Error ? err.message : String(err)}`,
      },
    };
  }

  if (!res.ok) {
    const raw = await res.text().catch(() => '');
    return {
      status: 400,
      networkCalls,
      secretsWritten: [],
      body: {
        ok: false,
        mode: 'real',
        simulated: false,
        httpStatus: res.status,
        code: 'CREDENTIAL_REJECTED',
        error: honestError(res.status, raw),
      },
    };
  }

  /* The test passed. Store it — and if storage fails, say so: a verified key
     that was NOT stored is not a connection. */
  const name = deps.secretName(integrationId, provider);
  const stored = await deps.writeSecret(
    name,
    credential,
    `Mercenta integration credential for ${integrationId}${provider ? ` (${provider})` : ''}`
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
        httpStatus: res.status,
        code: 'VAULT_WRITE_FAILED',
        error:
          'The key was accepted by the provider but could NOT be stored in Vault, so no connection ' +
          'was created. Check the Supabase service-role key and the vault extension.',
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
      integrationId,
      provider,
      httpStatus: res.status,
      secretRef: `vault:${name}`,
      testedAt: deps.now(),
      note: 'Real test call succeeded and the credential was stored server-side in Vault.',
    },
  };
}
