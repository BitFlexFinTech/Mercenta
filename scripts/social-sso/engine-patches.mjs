/**
 * §Phase E9 — ENGINE PATCHES applied to the deployed Postiz v1.47.0 container.
 *
 * These are fixes for REAL defects in the third-party engine that block Mercenta
 * Social's live workflows. They live in the engine container (not in Mercenta),
 * so they are lost if the image is re-pulled — run this script after any engine
 * upgrade, then restart the engine processes.
 *
 * Usage (from anywhere; the container runs on the services droplet):
 *   ssh root@46.101.75.185 "docker exec -i root-postiz-1 node -" < scripts/social-sso/engine-patches.mjs
 *
 * ── PATCH 1 — Nostr publishing fails: "expected Uint8Array, got type=string" ──
 * File: libraries/nestjs-libraries/src/integrations/social/nostr.provider.ts
 *       (and the compiled copies under apps/{orchestrator,backend}/dist/...)
 *
 * `authenticate()` correctly converts the brand's hex private key into a
 * Uint8Array before calling `getPublicKey()`, but `post()` and `comment()` pass
 * the stored hex STRING straight into `finalizeEvent()`, which requires a
 * Uint8Array. The result is that connecting a Nostr channel succeeds while every
 * publication fails with:
 *
 *   Error: expected Uint8Array, got type=string
 *     at schnorrGetPublicKey (…/secp256k1.ts)
 *     at finalizeEvent (…/index.js)
 *     at NostrProvider.post (…/nostr.provider.ts:178)
 *
 * The patch converts the key at both call sites. It is idempotent.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const TARGETS = [
  '/app/libraries/nestjs-libraries/src/integrations/social/nostr.provider.ts',
  '/app/apps/orchestrator/dist/libraries/nestjs-libraries/src/integrations/social/nostr.provider.js',
  '/app/apps/backend/dist/libraries/nestjs-libraries/src/integrations/social/nostr.provider.js',
];

const CONVERTED = 'Uint8Array.from(Buffer.from(String(password), "hex"))';

/** Source form:  finalizeEvent(\n  {...},\n  password\n);   */
const SRC_RE = /(finalizeEvent\([\s\S]*?\},[\s\n]*)password([\s\n]*\);)/g;
/** Compiled form: finalizeEvent({\n ... \n}, password); */
const DIST_MARKER = '}, password);';

let changed = 0;
for (const file of TARGETS) {
  if (!existsSync(file)) {
    console.log(`skip (absent): ${file}`);
    continue;
  }
  const before = readFileSync(file, 'utf8');
  let after = before;

  if (before.includes(DIST_MARKER)) {
    after = before.split(DIST_MARKER).join(`}, ${CONVERTED});`);
  }
  after = after.replace(SRC_RE, `$1${CONVERTED}$2`);

  if (after !== before) {
    writeFileSync(file, after);
    changed++;
    console.log(`patched: ${file}`);
  } else if (before.includes(CONVERTED)) {
    console.log(`already patched: ${file}`);
  } else {
    console.log(`NO MATCH (engine source changed?): ${file}`);
  }
}

console.log(
  `\n${changed} file(s) changed. Now restart the engine processes:\n` +
    `  docker exec root-postiz-1 pm2 restart backend orchestrator`
);
