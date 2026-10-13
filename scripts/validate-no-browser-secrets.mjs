/**
 * §PHASE B (2026-10-13) — NO PROVIDER SECRET MAY REACH THE BROWSER.
 *
 * THE DEFECT THIS GATE EXISTS FOR
 * -------------------------------
 * `src/integrations/IntegrationsContext.tsx` auto-connected OpenRouter, Hunter
 * and Instantly by reading `import.meta.env.VITE_OPENROUTER_API_KEY` (and two
 * siblings) directly in the browser, and `registry.ts →
 * hasLiveCredentialHint()` did the same to decide whether to show a hint.
 *
 * Vite INLINES every `VITE_*` value into the JavaScript bundle it builds. A
 * provider key supplied that way is therefore:
 *   · downloadable by anyone who opens the site — no login required; and
 *   · permanent in the built files, so unsetting the variable does not withdraw
 *     it and the key must be rotated at the provider to be safe.
 *
 * The fix routes every provider secret through Supabase Vault server-side. This
 * gate is what stops the pattern from coming back — a fix with no gate is how the
 * same defect returns.
 *
 * It FAILS on:
 *   1  any `import.meta.env` read of a secret-shaped name anywhere in `src/`;
 *   2  any secret-shaped `VITE_*` name declared in `.env.example`;
 *   3  the client registry's server-secret providers drifting from the server's
 *      allowlist (`supabase/functions/_shared/integrationSecrets.ts`);
 *   4  `serverSecrets.ts` reading `import.meta.env` itself;
 *   5  the edge function reading Vault BEFORE authorising the caller;
 *   6  the removed browser helpers (`hasLiveCredentialHint`, `demoKeyHint`)
 *      reappearing anywhere in live source.
 */
import { createServer } from 'vite';
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

/** Every `.ts`/`.tsx` file under `src/`, discovered — never a retyped list. */
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}
const srcFiles = walk(join(rootDir, 'src'));

/* A "secret-shaped" name: API keys, secrets, tokens, passwords. */
const SECRET_NAME = /(_API_KEY|_SECRET|_TOKEN|_PASSWORD|_ACCESS_KEY)\b/i;

/**
 * Remove COMMENTS, so a check reads CODE and never prose.
 *
 * This is not a convenience — it is required. The project's own rules demand an
 * inline `§Phase … — REPOINTED` comment recording the old contract whenever a
 * contract is repointed (`CLAUDE`/`.clinerules` removal-coherence rule), and the
 * fix for this very defect writes comments naming `import.meta.env`,
 * `hasLiveCredentialHint` and `demoKeyHint`. A gate that scanned comments would
 * therefore FAIL the correct fix and PASS a fix that left no explanation — both
 * backwards. Strings are stripped too, so a name quoted only for display cannot
 * satisfy or break a check.
 */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ') /* block comments */
    .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1 '); /* line comments (not http://) */
}
const codeOf = (p) => stripComments(read(p));

/* ── 1. no browser read of a secret-shaped env var ──────────────────────── */
const browserSecretReads = [];
for (const file of srcFiles) {
  const src = stripComments(readFileSync(file, 'utf8'));
  for (const m of src.matchAll(/import\.meta\.env(?:\.([A-Za-z0-9_]+)|\[['"]([A-Za-z0-9_]+)['"]\])/g)) {
    const name = m[1] ?? m[2] ?? '';
    if (SECRET_NAME.test(name)) {
      browserSecretReads.push(`${file.replace(rootDir, '')}: ${name}`);
    }
  }
}
test(
  `NO browser file reads a secret-shaped \`import.meta.env\` value (scanned ${srcFiles.length} files)`,
  browserSecretReads.length === 0,
  browserSecretReads.join('\n      ')
);
test(
  'the scan actually inspected files (a check that finds nothing to scan is a FAILURE)',
  srcFiles.length > 100,
  `files=${srcFiles.length}`
);

/* ── 2. no secret-shaped VITE_ name in .env.example ─────────────────────── */
const envExample = read('.env.example');
const envSecrets = [...envExample.matchAll(/^\s*(VITE_[A-Z0-9_]+)\s*=/gm)]
  .map((m) => m[1])
  .filter((name) => SECRET_NAME.test(name));
test(
  'no secret-shaped `VITE_*` variable is declared in .env.example',
  envSecrets.length === 0,
  envSecrets.join(', ')
);
test(
  '.env.example still declares the two browser-safe Supabase values',
  /VITE_SUPABASE_URL\s*=/.test(envExample) && /VITE_SUPABASE_ANON_KEY\s*=/.test(envExample)
);

/* ── 3. client registry ⇄ server allowlist cannot drift ─────────────────── */
const registrySrc = read('src/integrations/registry.ts');
const clientProviders = [
  ...new Set(
    [...registrySrc.matchAll(/^\s*([a-z_]+):\s*\{[^}]*serverSecretName:/gm)].map((m) => m[1])
  ),
].sort();
const serverSrc = read('supabase/functions/_shared/integrationSecrets.ts');
const allowlistBody = (serverSrc.match(/INTEGRATION_SECRET_PROVIDERS[^=]*=\s*\[([\s\S]*?)\]/) || [
  ,
  '',
])[1];
const serverProviders = [...new Set((allowlistBody.match(/'([a-z_]+)'/g) || []).map((s) => s.replace(/'/g, '')))].sort();

test(
  'the client registry declares at least one server-side secret provider',
  clientProviders.length > 0,
  clientProviders.join(', ')
);
test(
  'the SERVER allowlist declares at least one provider (never an empty allowlist that passes)',
  serverProviders.length > 0,
  serverProviders.join(', ')
);
test(
  'the client registry and the server allowlist name the SAME providers',
  clientProviders.join(',') === serverProviders.join(','),
  `client=[${clientProviders.join(', ')}] server=[${serverProviders.join(', ')}]`
);

/* ── 4. the probe module never touches import.meta.env ──────────────────── */
const probeSrc = codeOf('src/integrations/serverSecrets.ts');
test(
  'serverSecrets.ts exists and NEVER reads import.meta.env (code, not comments)',
  !/import\.meta\.env/.test(probeSrc)
);
test(
  'serverSecrets.ts fails CLOSED (every failure path resolves to no known secrets)',
  /NO_SECRETS/.test(probeSrc) && /return NO_SECRETS;/.test(probeSrc) && /catch\s*\{[\s\S]*?return NO_SECRETS;/.test(probeSrc)
);

/* ── 5. the edge function authorises BEFORE it touches Vault ─────────────── */
const fnRaw = read('supabase/functions/integration-secrets-status/index.ts');
const fnSrc = stripComments(fnRaw);
/* The CALL, not the import at the top of the file. */
const authPos = fnSrc.lastIndexOf('operatorFromAuthorization');
const vaultPos = fnSrc.lastIndexOf('listVaultSecretNames');
test(
  'the status function calls operatorFromAuthorization at all',
  authPos >= 0
);
test(
  'the status function AUTHORISES before it reads Vault',
  authPos >= 0 && vaultPos > authPos,
  `authCallAt=${authPos} vaultCallAt=${vaultPos}`
);
test(
  'the status function returns only a BOOLEAN per provider (no value field can leak)',
  /present\[id\]\s*=\s*names\.length\s*>\s*0/.test(fnSrc) &&
    !/decrypted_secret/.test(fnSrc) &&
    !/readVaultSecret/.test(fnSrc)
);
test(
  'the function DOCUMENTS that JWT verification must stay ON (read in the raw source)',
  /--no-verify-jwt/.test(fnRaw) && /never\s+`?--no-verify-jwt/.test(fnRaw)
);

/* ── 6. the removed browser helpers stay removed (in CODE) ──────────────── */
const removed = [];
for (const file of srcFiles) {
  const src = stripComments(readFileSync(file, 'utf8'));
  if (/\bdemoKeyHint\b/.test(src)) removed.push(`${file.replace(rootDir, '')}: demoKeyHint`);
  if (/\bhasLiveCredentialHint\b/.test(src)) removed.push(`${file.replace(rootDir, '')}: hasLiveCredentialHint`);
}
test(
  `the removed browser helpers (demoKeyHint, hasLiveCredentialHint) exist NOWHERE in src/ code`,
  removed.length === 0,
  removed.join('\n      ')
);
test(
  'the removal is EXPLAINED where it happened (a REPOINTED note survives in the raw source)',
  /REPOINTED/.test(read('src/integrations/registry.ts')) &&
    /REPOINTED/.test(read('src/integrations/IntegrationsContext.tsx'))
);

/* ── 7. the mapping itself still works (module executed, not just read) ─── */
const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
try {
  const registry = await server.ssrLoadModule('/src/integrations/registry.ts');
  const resolved = clientProviders.map((id) => `${id}:${registry.serverSecretNameFor(id)}`);
  test(
    'every provider the client knows has a resolvable server secret NAME at runtime',
    clientProviders.length > 0 &&
      clientProviders.every((id) => typeof registry.serverSecretNameFor(id) === 'string'),
    resolved.join(' | ')
  );
  test(
    'a provider with no server-side key resolves to null (never a fabricated name)',
    registry.serverSecretNameFor('stripe') === null
  );
} finally {
  await server.close();
}

console.log(
  failures === 0
    ? 'NO_BROWSER_SECRETS_PASS'
    : `NO_BROWSER_SECRETS_FAIL (${failures} of ${checks})`
);
if (failures > 0) process.exitCode = 1;

