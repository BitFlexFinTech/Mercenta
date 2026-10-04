// §Batch-0 — THE PLATFORM-MODE PERSISTENCE GATE.
//
// WHY THIS EXISTS
// ---------------
// `src/config/environment.ts` is THE ONE SWITCH (P1): the single owner of the
// platform's demo/live decision. Before §Batch-0 that decision lived only in the
// browser (the Vite build variable plus a localStorage override), so flipping it
// on one device left every other device — and every other operator — on the old
// mode.
//
// §Batch-0 adds a PERSISTENCE SEAM (`src/lib/platform/platformConfig.ts`) that
// writes the switch's decision to Supabase (`platform_config`) and reads it back
// on load, so the mode applies to EVERY device. This gate proves the seam is
// real, fail-soft and single-owner — by EXECUTING it (Vite ssrLoadModule, so the
// project's `@` alias resolves) and by reading the source that must call it:
//
//   1. the seam declares ONE key (`platform_mode`) and nothing else;
//   2. the seam NEVER throws, with or without a database;
//   3. with NO database it returns null (read) / false (write) — never a fake
//      success and never a fabricated value;
//   4. hydration is fail-soft: with nothing persisted the mode is unchanged;
//   5. the seam is NOT a second environment owner — it holds no storage key and
//      reads no Vite build variable (the SSOT check in validate-environment
//      therefore stays true);
//   6. the OWNER persists a switch change and hydrates on load through the seam
//      (a one-directional dependency: environment → platformConfig);
//   7. the app boot performs the hydration;
//   8. the surfaces FOLLOW the one switch (the demo notice, the login surface,
//      the switch surface) instead of a hardcoded demo constant;
//   9. the obsolete hardcoded `DEMO_MODE` constant is GONE — a stale second
//      source of truth the switch replaced (it read `true` even in live).
//
// The Supabase `platform_config` table and the Supabase credentials are a LATER,
// PROTECTED step (`supabase/migrations` is a protected path): without them the
// seam is a silent no-op and the platform keeps running in demo — which is
// exactly what this gate asserts.
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';

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

/**
 * Strip comments before scanning for forbidden CODE — a comment that merely
 * MENTIONS the old constant (or the rule that removed it) is documentation, not
 * a live reference. (Same convention as scripts/validate-d4-persistence.mjs.)
 */
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });

try {
  const cfg = await server.ssrLoadModule('/src/lib/platform/platformConfig.ts');
  const sb = await server.ssrLoadModule('/src/lib/supabase.ts');
  const env = await server.ssrLoadModule('/src/config/environment.ts');

  const configured = Boolean(sb.isSupabaseConfigured);

  /* 1. ONE declared key */
  test(
    'the platform-mode key is declared once',
    cfg.PLATFORM_MODE_CONFIG_KEY === 'platform_mode',
    String(cfg.PLATFORM_MODE_CONFIG_KEY)
  );

  /* 2 & 3. read is fail-soft and never invents a value */
  let readVal = Symbol('unset');
  let readThrew = false;
  try {
    readVal = await cfg.readPlatformMode();
  } catch (e) {
    readThrew = true;
  }
  test('readPlatformMode NEVER throws', readThrew === false);
  test(
    'readPlatformMode returns null or a real mode — never a fabricated value',
    readVal === null || readVal === 'demo' || readVal === 'live',
    String(readVal)
  );

  if (!configured) {
    /* 3. with no database, both directions are honest no-ops */
    let writeVal = Symbol('unset');
    let writeThrew = false;
    try {
      writeVal = await cfg.writePlatformMode('demo');
    } catch (e) {
      writeThrew = true;
    }
    test('with NO database, writePlatformMode NEVER throws', writeThrew === false);
    test('with NO database, readPlatformMode returns null (fail-soft)', readVal === null, String(readVal));
    test(
      'with NO database, writePlatformMode returns false — never a false success',
      writeVal === false,
      String(writeVal)
    );
  } else {
    console.log('  (Supabase IS configured — write assertions skipped so this gate never writes real config)');
  }

  /* 4. hydration is fail-soft */
  env.setEnvironmentMode('demo');
  let hydrateThrew = false;
  try {
    await env.hydrateEnvironmentModeFromDb();
  } catch (e) {
    hydrateThrew = true;
  }
  test('hydrateEnvironmentModeFromDb NEVER throws', hydrateThrew === false);
  test(
    configured
      ? 'hydrate leaves the mode a valid value'
      : 'with nothing persisted, hydrate leaves the mode unchanged (fail-soft)',
    configured
      ? env.environmentMode() === 'demo' || env.environmentMode() === 'live'
      : env.environmentMode() === 'demo',
    env.environmentMode()
  );

  /* 5. the seam is NOT a second owner */
  const seam = read('src/lib/platform/platformConfig.ts');
  test(
    'the seam does NOT read VITE_ENVIRONMENT (the owner stays src/config/environment.ts)',
    !/VITE_ENVIRONMENT/.test(seam)
  );
  test('the seam does NOT hold the environment storage key', !/mercenta\.environment\.v1/.test(seam));

  /* 6. the owner persists + hydrates through the seam */
  const envSrc = read('src/config/environment.ts');
  test('the environment owner PERSISTS a switch change through the seam', /writePlatformMode\(/.test(envSrc));
  test(
    'the environment owner HYDRATES from the seam (exports hydrateEnvironmentModeFromDb, reads it)',
    /export async function hydrateEnvironmentModeFromDb/.test(envSrc) && /readPlatformMode\(/.test(envSrc)
  );

  /* 7. the boot hydrates */
  const main = read('src/main.tsx');
  test('the app boot performs the hydration', /hydrateEnvironmentModeFromDb/.test(main));

  /* 8. the surfaces follow the ONE switch */
  const banner = stripComments(read('src/components/shared/DemoBanner.tsx'));
  test(
    'the demo notice follows the ONE switch (environmentMode/subscribeEnvironment), not a hardcoded constant',
    /environmentMode/.test(banner) && /subscribeEnvironment/.test(banner) && !/\bDEMO_MODE\b/.test(banner)
  );
  const login = stripComments(read('src/components/auth/Login.tsx'));
  test(
    'the login surface gates its demo brands on the ONE switch',
    /environmentMode/.test(login) && /subscribeEnvironment/.test(login)
  );
  const sim = stripComments(read('src/components/admin/integrations/SimulationControl.tsx'));
  test(
    'the switch surface states the CURRENT mode in words (data-environment-banner)',
    /data-environment-banner=/.test(sim)
  );

  /* 9. no stale second source: the obsolete DEMO_MODE constant is gone */
  const demoSrc = stripComments(read('src/config/demo.ts'));
  test('the obsolete hardcoded DEMO_MODE constant no longer exists', !/\bDEMO_MODE\b/.test(demoSrc));
} finally {
  await server.close();
}

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.error(`✗ ${failures} platform-mode check(s) FAILED`);
  process.exit(1);
}
console.log('✓ the platform mode persists through ONE fail-soft seam (the switch stays the single owner)');
