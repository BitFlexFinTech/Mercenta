// §BATCH1b — THE CONNECT-WIZARD BACKEND GATE ("the fake-key rehearsal").
//
// WHY THIS EXISTS
// ---------------
// The Founder's one-click promise is: "when I get the API keys … everything syncs
// with no more work to be done." That was NOT true: the wizard's "Test Connection
// & Save" ran a browser-side ping and kept the key in memory, the OAuth exchange
// called an Edge Function that did not exist, and a provider with no API was marked
// "Live" without anything having been verified.
//
// This gate EXECUTES the real handler code (Node TypeScript stripping — not a text
// match) and proves, with a scripted transport and a recording Vault writer:
//
//   1. PARITY — the client's declared live-test set and the server's declared
//      registry are IDENTICAL, so the wizard can never ask for a verification the
//      backend refuses, or vice versa.
//   2. NO FAKE SUCCESS — for EVERY declared provider, a transport that fails/throws
//      yields an honest failure. Nothing anywhere can succeed without a real call.
//   3. THE FAKE-KEY REHEARSAL — a bad key is rejected with the provider's own error
//      and NOTHING is stored; a good key stores the credential and returns only a
//      `vault:` reference (never the value).
//   4. NO HALF-CONNECTION — a provider that accepted the key but whose Vault write
//      failed is reported as FAILED, not as connected.
//   5. FAIL CLOSED — an undeclared provider, a missing key and a missing server
//      secret each refuse with a STATED code naming the exact missing input, with
//      zero network calls and zero writes.
//   6. SIMULATION IS EXPLICIT — only on `simulate: true`, with ZERO network calls,
//      ZERO writes, and a `mock:` reference that can never be mistaken for live.
//   7. THE OAUTH EXCHANGE — the same rehearsal for `spapi-token-exchange`: the real
//      Amazon LWA host and form body, an honest rejection for a bad code, a Vault
//      write for a good one, and a fail-closed 503 when the server secret is absent.
//   8. WIZARD WIRING — the panel actually uses the server path, sends the
//      redirect_uri, stores the returned reference, and NEVER marks a no-API
//      provider as connected.
//   9. ONE VAULT WRITER — the write path exists in exactly one module.
//
// Every mutation-sensitive assertion below was PROVED ABLE TO FAIL (see the
// session report): the mutated file was restored byte-identical.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

let failures = 0;
let checks = 0;
const test = (name, ok, detail) => {
  checks++;
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) {
    failures++;
    if (detail !== undefined) console.log(`      ${String(detail).slice(0, 400)}`);
  }
};

const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
const moduleUrl = (p) => new URL(p, ROOT).href;

const PROVIDER_CONNECT = 'supabase/functions/_shared/providerConnect.ts';
const TOKEN_EXCHANGE = 'supabase/functions/_shared/tokenExchange.ts';
const VAULT = 'supabase/functions/_shared/vault.ts';
const PANEL = 'src/components/admin/integrations/IntegrationsPanel.tsx';
const TEST_CALLS = 'src/lib/integrations/testCalls.ts';
const CONNECT_CLIENT = 'src/lib/integrations/connectClient.ts';
const MIGRATION = 'supabase/migrations/028_create_integration_connections.sql';

const connect = await import(moduleUrl(PROVIDER_CONNECT));
const exchange = await import(moduleUrl(TOKEN_EXCHANGE));

/** A scripted transport + recording Vault writer. */
function makeDeps({ responder, writeOk = true } = {}) {
  const calls = [];
  const writes = [];
  const deps = {
    transport: async (url, init) => {
      calls.push({ url, method: init.method, headers: init.headers, body: init.body });
      const r = responder(url, init);
      if (r instanceof Error) throw r;
      return { ok: r.status >= 200 && r.status < 300, status: r.status, text: async () => r.body ?? '' };
    },
    writeSecret: async (name, value, description) => {
      if (writeOk) writes.push({ name, value, description });
      return writeOk;
    },
    // Mirror of `credentialSecretName` (vault.ts) — section 9 pins the real source.
    secretName: (id, provider) => `integration_${id}${provider ? `_${provider}` : ''}`,
    now: () => '2026-09-28T00:00:00.000Z',
  };
  return { deps, calls, writes };
}

const declared = connect.declaredTests();
const split = (pair) => {
  const i = pair.lastIndexOf('/');
  return { integrationId: pair.slice(0, i), provider: pair.slice(i + 1) };
};

/* ═══ 1. PARITY — the client's set === the server's set ══════════════════════ */
const clientEntries = [...read(TEST_CALLS).matchAll(
  /integrationId:\s*'([a-z_]+)',\s*provider:\s*'([a-z_]*)'/g
)].map((m) => `${m[1]}/${m[2]}`).sort();
test(
  'parity: the client declares the SAME providers as the server registry',
  JSON.stringify(clientEntries) === JSON.stringify(declared),
  `client ${clientEntries.join(', ')} | server ${declared.join(', ')}`
);
test('parity: the declared set is non-empty (the registry cannot silently empty)', declared.length === 8, `${declared.length}`);

/* ═══ 2. NO FAKE SUCCESS — every declared provider, failing transport ════════ */
for (const pair of declared) {
  const { integrationId, provider } = split(pair);
  const { deps, calls, writes } = makeDeps({ responder: () => new Error('network down') });
  const out = await connect.handleProviderConnect(
    { integrationId, provider, fields: { api_key: 'rehearsal-key' } },
    deps
  );
  test(
    `no fake success: ${pair} fails honestly when the provider is unreachable`,
    out.body.ok === false && out.secretsWritten.length === 0 && writes.length === 0 && calls.length === 1,
    JSON.stringify(out.body).slice(0, 200)
  );
}

/* ═══ 3a. THE FAKE-KEY REHEARSAL — a BAD key ════════════════════════════════ */
for (const pair of declared) {
  const { integrationId, provider } = split(pair);
  const { deps, calls, writes } = makeDeps({
    responder: () => ({ status: 401, body: '{"error":"invalid_key"}' }),
  });
  const out = await connect.handleProviderConnect(
    { integrationId, provider, fields: { api_key: 'sk-fake-bad-key' } },
    deps
  );
  const calledHost = calls[0]?.url ?? '';
  test(
    `fake-key rehearsal: ${pair} — bad key rejected by a REAL call, nothing stored`,
    out.body.ok === false &&
      out.body.code === 'CREDENTIAL_REJECTED' &&
      out.body.httpStatus === 401 &&
      typeof out.body.error === 'string' &&
      out.body.error.includes('401') &&
      writes.length === 0 &&
      calls.length === 1 &&
      /^https:\/\//.test(calledHost),
    `${out.body.code} | ${calledHost}`
  );
  test(
    `fake-key rehearsal: ${pair} — the key was sent to the provider, never returned to the caller`,
    !JSON.stringify(out.body).includes('sk-fake-bad-key'),
    JSON.stringify(out.body).slice(0, 160)
  );
}

/* ═══ 3b. THE FAKE-KEY REHEARSAL — a GOOD key ═══════════════════════════════ */
for (const pair of declared) {
  const { integrationId, provider } = split(pair);
  const { deps, writes } = makeDeps({ responder: () => ({ status: 200, body: '{"ok":true}' }) });
  const out = await connect.handleProviderConnect(
    { integrationId, provider, fields: { api_key: 'sk-rehearsal-good-key' } },
    deps
  );
  const ref = String(out.body.secretRef ?? '');
  test(
    `fake-key rehearsal: ${pair} — good key verified and stored, ONLY a vault: reference returned`,
    out.body.ok === true &&
      out.body.mode === 'real' &&
      out.body.simulated === false &&
      ref.startsWith('vault:') &&
      writes.length === 1 &&
      writes[0].value === 'sk-rehearsal-good-key' &&
      !JSON.stringify(out.body).includes('sk-rehearsal-good-key'),
    `${ref} | writes ${writes.length}`
  );
}

/* ═══ 4. NO HALF-CONNECTION — verified but unstorable is a FAILURE ══════════ */
{
  const { deps, writes } = makeDeps({ responder: () => ({ status: 200, body: '' }), writeOk: false });
  const out = await connect.handleProviderConnect(
    { integrationId: 'openrouter', provider: '', fields: { api_key: 'sk-key' } },
    deps
  );
  test(
    'no half-connection: a verified key whose Vault write failed is reported as FAILED',
    out.body.ok === false && out.body.code === 'VAULT_WRITE_FAILED' && writes.length === 0,
    JSON.stringify(out.body).slice(0, 200)
  );
}

/* ═══ 5. FAIL CLOSED — undeclared provider / missing key ════════════════════ */
{
  const { deps, calls, writes } = makeDeps({ responder: () => ({ status: 200, body: '' }) });
  const out = await connect.handleProviderConnect(
    { integrationId: 'keepa', provider: '', fields: { api_key: 'sk-key' } },
    deps
  );
  test(
    'fail closed: an undeclared provider refuses with TEST_ENDPOINT_NOT_DECLARED, zero calls, zero writes',
    out.body.ok === false &&
      out.body.code === 'TEST_ENDPOINT_NOT_DECLARED' &&
      calls.length === 0 &&
      writes.length === 0,
    JSON.stringify(out.body).slice(0, 220)
  );
}
{
  const { deps, calls, writes } = makeDeps({ responder: () => ({ status: 200, body: '' }) });
  const out = await connect.handleProviderConnect(
    { integrationId: 'openrouter', provider: '', fields: {} },
    deps
  );
  test(
    'fail closed: a missing key refuses with CREDENTIAL_REQUIRED, zero calls, zero writes',
    out.body.ok === false && out.body.code === 'CREDENTIAL_REQUIRED' && calls.length === 0 && writes.length === 0,
    JSON.stringify(out.body).slice(0, 200)
  );
}

/* ═══ 6. SIMULATION IS EXPLICIT ═════════════════════════════════════════════ */
{
  const { deps, calls, writes } = makeDeps({ responder: () => ({ status: 200, body: '' }) });
  const out = await connect.handleProviderConnect(
    { integrationId: 'openrouter', provider: '', fields: { api_key: 'sk-key' }, simulate: true },
    deps
  );
  const ref = String(out.body.secretRef ?? '');
  test(
    'simulation: zero network calls, zero writes, labelled simulated, and a mock: reference',
    out.body.ok === true &&
      out.body.simulated === true &&
      out.body.mode === 'simulation' &&
      ref.startsWith('mock:') &&
      !ref.startsWith('vault:') &&
      calls.length === 0 &&
      writes.length === 0,
    `${ref} | calls ${calls.length}`
  );
}

/* ═══ 7. THE OAUTH EXCHANGE (spapi-token-exchange) ═════════════════════════ */
const exchangeDeps = (env, responder, writeOk = true) => {
  const { deps, calls, writes } = makeDeps({ responder, writeOk });
  return { deps: { ...deps, env }, calls, writes };
};
{
  /* (a) No server secret — the genuine missing input, stated exactly. */
  const { deps, calls, writes } = exchangeDeps({}, () => ({ status: 200, body: '' }));
  const out = await exchange.handleSpapiTokenExchange(
    { code: 'fake-code', clientId: 'amzn1.application.fake', redirectUri: 'https://demo.mercenta.co.uk/oauth/callback.html' },
    deps
  );
  test(
    'oauth: no server secret → 503 SPAPI_CLIENT_SECRET_MISSING, zero calls, zero writes',
    out.status === 503 &&
      out.body.code === 'SPAPI_CLIENT_SECRET_MISSING' &&
      String(out.body.error).includes('SPAPI_CLIENT_SECRET') &&
      calls.length === 0 &&
      writes.length === 0,
    JSON.stringify(out.body).slice(0, 200)
  );
}
{
  /* (b) A BAD code — the real Amazon host is called and the rejection is honest. */
  const { deps, calls, writes } = exchangeDeps(
    { SPAPI_CLIENT_SECRET: 'server-only-secret' },
    () => ({ status: 400, body: '{"error":"invalid_grant","error_description":"authorization code not found"}' })
  );
  const out = await exchange.handleSpapiTokenExchange(
    {
      code: 'fake-bad-code',
      clientId: 'amzn1.application.0EXAMPLE',
      redirectUri: 'https://demo.mercenta.co.uk/oauth/callback.html',
      marketplaceId: 'A1F83G8C2ARO7P',
    },
    deps
  );
  const req = calls[0] ?? {};
  const form = new URLSearchParams(req.body ?? '');
  test(
    'oauth: bad code → the REAL LWA host is called, and the rejection is reported honestly with nothing stored',
    out.body.ok === false &&
      out.body.code === 'CODE_REJECTED' &&
      String(out.body.error).includes('invalid_grant') &&
      writes.length === 0 &&
      calls.length === 1 &&
      req.url === 'https://api.amazon.com/auth/o2/token' &&
      req.method === 'POST',
    `${req.url} | ${out.body.code}`
  );
  test(
    'oauth: the exchange body carries grant_type/code/client_id/client_secret and the SAME redirect_uri as the popup',
    form.get('grant_type') === 'authorization_code' &&
      form.get('code') === 'fake-bad-code' &&
      form.get('client_id') === 'amzn1.application.0EXAMPLE' &&
      form.get('client_secret') === 'server-only-secret' &&
      form.get('redirect_uri') === 'https://demo.mercenta.co.uk/oauth/callback.html',
    req.body
  );
}
{
  /* (c) A GOOD code — the refresh token is stored and only the reference returned. */
  const { deps, calls, writes } = exchangeDeps(
    { SPAPI_CLIENT_SECRET: 'server-only-secret' },
    () => ({ status: 200, body: '{"refresh_token":"Atzr|REHEARSAL-REFRESH","access_token":"Atza|x","expires_in":3600}' })
  );
  const out = await exchange.handleSpapiTokenExchange(
    { code: 'fake-good-code', clientId: 'amzn1.application.0EXAMPLE', marketplaceId: 'A1F83G8C2ARO7P' },
    deps
  );
  let blob = null;
  try {
    blob = JSON.parse(writes[0]?.value ?? 'null');
  } catch {
    blob = null;
  }
  const ref = String(out.body.secretRef ?? '');
  test(
    'oauth: good code → refresh token stored in Vault as a credential blob, ONLY a vault: reference returned',
    out.body.ok === true &&
      out.body.mode === 'real' &&
      out.body.simulated === false &&
      ref.startsWith('vault:') &&
      !JSON.stringify(out.body).includes('Atzr|REHEARSAL-REFRESH') &&
      calls.length === 1 &&
      writes.length === 1 &&
      blob?.refreshToken === 'Atzr|REHEARSAL-REFRESH' &&
      blob?.marketplaceId === 'A1F83G8C2ARO7P',
    `${ref} | blob ${JSON.stringify(blob)}`
  );
}
{
  /* (d) Explicit simulation — no call, no write, mock reference. */
  const { deps, calls, writes } = exchangeDeps({}, () => ({ status: 200, body: '' }));
  const out = await exchange.handleSpapiTokenExchange({ simulate: true }, deps);
  const ref = String(out.body.secretRef ?? '');
  test(
    'oauth: explicit simulation → zero calls, zero writes, simulated label, mock: reference',
    out.body.ok === true &&
      out.body.simulated === true &&
      ref.startsWith('mock:') &&
      !ref.startsWith('vault:') &&
      calls.length === 0 &&
      writes.length === 0,
    `${ref}`
  );
}
/* ═══ 8. WIZARD WIRING — the panel uses the server path ════════════════════ */
{
  const panel = read(PANEL);
  test(
    'wiring: the wizard calls the server connect function, not a browser-side ping',
    panel.includes('connectProvider(') &&
      panel.includes('exchangeSpapiCode(') &&
      !panel.includes('pingForService'),
    panel.includes('pingForService') ? 'pingForService still referenced' : ''
  );
  test(
    'wiring: the SP-API exchange sends the redirect_uri the consent popup used',
    /redirectUri:\s*window\.location\.origin \+ '\/oauth\/callback\.html'/.test(panel)
  );
  test(
    'wiring: the returned vault reference is stored on the connection',
    /secretRef:\s*result\.secretRef/.test(panel) ||
      /\.\.\.\(data\.secretRef \? \{ secretRef: data\.secretRef \} : \{\}\)/.test(panel)
  );
  test(
    'wiring: the browser keeps NO copy of a real key after a server-side connect',
    !panel.includes('rememberApiKey') && !panel.includes('peekApiKey('),
    'the client-side secret store must not be used by the connect path'
  );
  test(
    'wiring: a provider with no API uses markManualConnect and is NEVER marked connected',
    panel.includes('markManualConnect(') &&
      !/completeApiKeyConnect\([^)]*mode:\s*'no-live-endpoint'/.test(panel) &&
      !/completeSandboxConnect\([^)]*no-live-endpoint/.test(panel)
  );
  test(
    'wiring: the panel builds no Edge-Function URL itself (connectClient is the ONE place)',
    !panel.includes('functions/v1') && read(CONNECT_CLIENT).includes('/functions/v1')
  );
}

/* ═══ 9. ONE VAULT WRITER + the schema the reference lives in ══════════════ */
{
  const vault = read(VAULT);
  test(
    'vault: the write path exists, is deterministic-named, and returns false rather than pretending',
    vault.includes('export async function writeVaultSecret(') &&
      /export function credentialSecretName\(/.test(vault) &&
      /integration_\$\{safe\(integrationId\)\}/.test(vault) &&
      /return false;/.test(vault)
  );
  test(
    'vault: the writer returns only a boolean — the secret VALUE is never handed back',
    /export async function writeVaultSecret\([\s\S]*?\): Promise<boolean>/.test(vault) &&
      !/writeVaultSecret[\s\S]{0,400}return value/.test(vault)
  );
  const migration = read(MIGRATION);
  test(
    'schema: integration_connections exists, RLS on, secret_ref constrained to `vault:`, live requires a ref',
    /create table if not exists integration_connections/i.test(migration) &&
      /alter table integration_connections enable row level security/i.test(migration) &&
      /secret_ref text check \(secret_ref is null or secret_ref like 'vault:%'\)/i.test(migration) &&
      /check \(sandbox or secret_ref is not null\)/i.test(migration)
  );
  test(
    'schema: no policy is blanket-open and none permits DELETE',
    !/using\s*\(\s*true\s*\)/i.test(migration) && !/for\s+delete/i.test(migration)
  );
}

console.log(`\nConnect wizard backend: ${declared.length} declared providers · ${checks} checks`);
console.log(
  failures === 0 ? 'CONNECT_WIZARD_BACKEND_PASS' : `CONNECT_WIZARD_BACKEND_FAIL (${failures}/${checks})`
);
process.exit(failures === 0 ? 0 : 1);

