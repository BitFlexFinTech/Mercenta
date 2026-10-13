/**
 * §PHASE B (2026-10-13) — EVERY EDGE FUNCTION MUST AUTHENTICATE ITS CALLER.
 *
 * THE DEFECTS THIS GATE EXISTS FOR (all found and fixed on 2026-10-13)
 * --------------------------------------------------------------------
 * 1. `xero-webhook` defaulted its secret to the literal `'demo-webhook-secret'` —
 *    a value committed to this repository — and then SKIPPED the signature check
 *    when the secret matched that literal. An unconfigured deployment therefore
 *    accepted a forged Xero event body from anyone.
 * 2. `instantly-reply-webhook` ran its shared-secret check only `if
 *    (expectedSecret)`, and the default was `''`. An unset variable meant NO
 *    check at all on an endpoint that classifies and persists replies.
 * 3. `xero-token` was documented `--no-verify-jwt` with no caller check, so an
 *    anonymous caller could exchange a code using Mercenta's Xero client secret,
 *    receive the tokens, and write them into `xero_connections` with the
 *    service-role key.
 *
 * These are THREE INSTANCES OF ONE CLASS: a function that authenticates nobody.
 * Fixing the instances without a class gate is how the fourth one appears, so
 * this gate enumerates EVERY function and fails on the pattern itself.
 *
 * THE RULE IT ENFORCES
 * --------------------
 * Every Edge Function must authenticate its caller in one of exactly two ways:
 *   (a) Supabase JWT verification stays ON (the default), so the gateway rejects
 *       an unauthenticated request before the function body runs; or
 *   (b) it is a genuine third-party endpoint (`--no-verify-jwt`) AND it
 *       authenticates the caller by a verifiable shared secret or HMAC, AND it is
 *       declared in `PUBLIC_ENDPOINTS` below with a reason.
 * Anything else FAILS. An undeclared public endpoint fails, so a new one cannot
 * be introduced by accident.
 */
import { fileURLToPath } from 'node:url';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

let failures = 0;
let checks = 0;
const test = (name, ok, detail) => {
  checks++;
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) {
    failures++;
    if (detail !== undefined) console.log(`      ${String(detail).slice(0, 500)}`);
  }
};

const ROOT = new URL('../', import.meta.url);
const rootDir = fileURLToPath(ROOT);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');

const stripComments = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1 ');

/**
 * Endpoints whose caller is a THIRD PARTY that cannot hold a Supabase session.
 * Each entry states WHY it may skip JWT verification and WHAT proves its caller.
 * An endpoint NOT listed here may not use `--no-verify-jwt`.
 */
const PUBLIC_ENDPOINTS = {
  'xero-webhook': {
    reason: 'Xero posts server-to-server and cannot present a Supabase JWT',
    proves: 'HMAC-SHA256 over the raw body via x-xero-signature (timing-safe)',
  },
  'instantly-reply-webhook': {
    reason: 'Instantly.ai posts server-to-server and cannot present a Supabase JWT',
    proves: 'shared secret in X-Webhook-Secret or the Authorization bearer value',
  },
};

/* Discover EVERY function — never a hand-maintained list. */
const functionsDir = join(rootDir, 'supabase/functions');
/* Underscore-prefixed folders (`_shared`, `_types`) hold shared modules, not
   deployable endpoints, so they are excluded — discovered by prefix, never named. */
const functionNames = readdirSync(functionsDir).filter(
  (entry) =>
    !entry.startsWith('_') &&
    !entry.startsWith('.') &&
    statSync(join(functionsDir, entry)).isDirectory()
);

test(
  `every Edge Function was discovered (${functionNames.length})`,
  functionNames.length >= 15,
  `found: ${functionNames.join(', ')}`
);

/* ── class guard 1: no secret may fall back to a published literal ──────── */
const SECRET_ENV =
  /Deno\.env\.get\(\s*['"]([A-Z0-9_]*(?:SECRET|KEY|TOKEN)[A-Z0-9_]*)['"]\s*\)\s*\?\?\s*(['"])(.*?)\2/;
const fallbackSecrets = [];
for (const name of functionNames) {
  const code = stripComments(read(`supabase/functions/${name}/index.ts`));
  const m = code.match(SECRET_ENV);
  if (m && m[3].trim().length > 0) fallbackSecrets.push(`${name}: ${m[1]} ?? '${m[3]}'`);
}
test(
  'NO edge function falls back to a LITERAL secret when its env var is unset',
  fallbackSecrets.length === 0,
  fallbackSecrets.join('\n      ')
);

/* ── class guard 2: a secret check may not be optional-by-default ───────── */
const optionalAuth = [];
for (const name of functionNames) {
  const code = stripComments(read(`supabase/functions/${name}/index.ts`));
  /* Bind the guard to the SAME variable that defaults to empty. An earlier draft
     paired the empty default with ANY unrelated truthiness guard, which flagged
     four innocent functions — a false-positive machine rather than a gate. */
  const m = code.match(
    /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*[^;]*?Deno\.env\.get\(\s*['"][A-Z0-9_]*(?:SECRET|KEY|TOKEN)[A-Z0-9_]*['"]\s*\)\s*\?\?\s*''/
  );
  if (!m) continue;
  const variable = m[1];
  /* A POSITIVE truthiness guard on that variable — not the `if (!x)` refusal,
     which is the correct fail-closed form. */
  const truthyGuard = new RegExp(`if\\s*\\(\\s*${variable}\\s*\\)\\s*\\{`).test(code);
  const refusal = new RegExp(`if\\s*\\(\\s*!\\s*${variable}\\s*\\)`).test(code);
  if (truthyGuard && !refusal) {
    optionalAuth.push(`${name}: \`${variable}\` defaults to '' and is then used as a positive guard (fail-open)`);
  }
}
test(
  'NO edge function makes its secret check OPTIONAL (defaults to empty + gates on truthiness)',
  optionalAuth.length === 0,
  optionalAuth.join('\n      ')
);

/* ── per-function: the authentication method must be real and declared ──── */
for (const name of functionNames) {
  const raw = read(`supabase/functions/${name}/index.ts`);
  const code = stripComments(raw);
  /* The ACTUAL deploy instruction, not a mention of the flag.
     A docstring that says "deploy with JWT verification ON (never --no-verify-jwt)"
     is the OPPOSITE of using the flag, so matching the bare string would fail the
     correct code and pass the defective one — backwards. This requires the flag on
     the SAME LINE as the deploy command. */
  const usesNoVerify = /functions deploy [a-z0-9-]+[^\n]*--no-verify-jwt/.test(raw);

  if (!usesNoVerify) {
    /* Path (a): the gateway verifies the JWT before the body runs. */
    test(`${name}: JWT verification stays ON (default deploy)`, true);
    continue;
  }

  /* Path (b): a declared third-party endpoint must PROVE its caller. */
  const declared = PUBLIC_ENDPOINTS[name];
  const hasHmac = /timingSafeEqual/.test(code);
  const hasSharedSecret = /Invalid webhook secret/.test(code);
  const refusesWhenUnset =
    /if\s*\(!expectedSecret\)/.test(code) || /if\s*\(!getWebhookSecret\(\)\)/.test(code);

  test(
    `${name}: may use --no-verify-jwt ONLY because it is a DECLARED third-party endpoint`,
    Boolean(declared),
    declared ? declared.reason : 'NOT DECLARED — a new public endpoint must be declared deliberately'
  );
  test(
    `${name}: authenticates its caller by HMAC or a shared secret (never nobody)`,
    hasHmac || hasSharedSecret,
    `hmac=${hasHmac} sharedSecret=${hasSharedSecret}`
  );
  test(
    `${name}: REFUSES when its secret is not configured (fail-closed, not fail-open)`,
    refusesWhenUnset,
    'expected an explicit `if (!<secret>)` refusal'
  );
}

/* ── the three repaired functions, pinned specifically ──────────────────── */
const xeroWebhook = read('supabase/functions/xero-webhook/index.ts');
test(
  "xero-webhook: the published fallback literal 'demo-webhook-secret' is gone",
  !/demo-webhook-secret/.test(stripComments(xeroWebhook)),
  'a secret published in the repository authenticates nobody'
);
test(
  'xero-webhook: getWebhookSecret returns null when unset, so the caller fails closed',
  /string \| null/.test(xeroWebhook) && /return secret\.length > 0 \? secret : null/.test(xeroWebhook)
);
test(
  'xero-webhook: nothing compares the secret to a literal in order to SKIP verification',
  !/isDemo/.test(stripComments(xeroWebhook))
);

const xeroTokenCode = stripComments(read('supabase/functions/xero-token/index.ts'));
test(
  'xero-token: requires a verified operator session before any Xero call or DB write',
  /operatorFromAuthorization/.test(xeroTokenCode) &&
    xeroTokenCode.indexOf('operatorFromAuthorization') < xeroTokenCode.indexOf('identity.xero.com')
);
test(
  'xero-token: no longer instructs deploying it with --no-verify-jwt',
  !/functions deploy xero-token --no-verify-jwt/.test(read('supabase/functions/xero-token/index.ts'))
);
const tokenManagerSrc = read('src/services/xero/tokenManager.ts');
test(
  'xero-token: the client attaches the session token (otherwise it would always 403)',
  /authHeaders/.test(tokenManagerSrc) && /Authorization/.test(tokenManagerSrc)
);

const instantlyCode = stripComments(read('supabase/functions/instantly-reply-webhook/index.ts'));
test(
  'instantly-reply-webhook: the secret is required and an unset value refuses (503)',
  /if\s*\(!expectedSecret\)/.test(instantlyCode) && /503/.test(instantlyCode)
);

console.log(
  failures === 0 ? 'EDGE_FUNCTION_AUTH_PASS' : `EDGE_FUNCTION_AUTH_FAIL (${failures} of ${checks})`
);
if (failures > 0) process.exitCode = 1;
