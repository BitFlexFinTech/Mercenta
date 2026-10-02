// §P1 — THE ONE SWITCH — the environment gate.
//
// WHY THIS EXISTS
// ---------------
// Before P1 there was no single demo/live switch: the "live vs simulated"
// decision was made in THREE unrelated places — the data layer (whether a
// Supabase client was created from environment variables), each external
// provider (its own IntegrationMode), and several surfaces (their own badges).
// `docs/CLEANUP_AND_VERIFICATION_PLAN_2026-09-30.md` (§3 P1) requires ONE owner,
// `src/config/environment.ts`, and this gate proves its rules by EXECUTING the
// real modules (Vite ssrLoadModule, so the project's `@` alias resolves):
//
//   1. the build default is DEMO, which needs NO credential;
//   2. in `demo` the seed fallback returns the seed (a fully usable demo);
//   3. in `demo` an unconfigured provider defaults to SIMULATION (safe);
//   4. the switch flips the WHOLE platform to `live`;
//   5. in `live` the seed fallback returns NOTHING — a live platform can never
//      serve a fake row;
//   6. in `live` an unconfigured provider is UNAVAILABLE (`available`), NEVER
//      simulation, and is NOT simulation-safe;
//   7. the fail-closed rule (`isProviderSimulationSafe` — only `simulation` is
//      safe) is UNCHANGED and not weakened;
//   8. `live` maps REGISTRY DEFAULTS only — an explicit simulation override is
//      not silently broken;
//   9. exactly ONE module reads `VITE_ENVIRONMENT` and holds the environment
//      storage key (the SSOT), the data layer routes every seed fallback through
//      the owner, the provider-mode machine reads the owner, and the switch is
//      operable in one obvious place.

import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

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
const rootDir = fileURLToPath(ROOT);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });

try {
  const env = await server.ssrLoadModule('/src/config/environment.ts');
  const types = await server.ssrLoadModule('/src/integrations/types.ts');
  const registry = await server.ssrLoadModule('/src/integrations/registry.ts');

  /* 1. the build default is DEMO — no credential required */
  env.resetEnvironmentMode();
  test(
    'the build default is DEMO (no VITE_ENVIRONMENT set) and needs no credential',
    env.environmentMode() === 'demo' && env.isDemoEnvironment() === true && env.isLiveEnvironment() === false,
    `mode=${env.environmentMode()}`
  );

  /* 2. demo keeps the seed */
  test(
    'demo: the seed fallback returns the seed (a fully usable demo)',
    JSON.stringify(env.seedFallback([1, 2, 3])) === JSON.stringify([1, 2, 3]),
    JSON.stringify(env.seedFallback([1, 2, 3]))
  );

  /* 3. demo: an unconfigured provider defaults to SIMULATION and is safe */
  test(
    'demo: an unconfigured provider defaults to SIMULATION (safe)',
    env.environmentDefaultMode('simulation') === 'simulation' &&
      types.modeForState(undefined, 'simulation') === 'simulation' &&
      types.isProviderSimulationSafe('simulation') === true
  );

  /* 4. flip the ONE switch to live */
  env.setEnvironmentMode('live');
  test('the switch flips the WHOLE platform to LIVE', env.isLiveEnvironment() === true && env.environmentMode() === 'live');

  /* 5. live NEVER falls back to the seed */
  test(
    'live NEVER falls back to the seed (no fake row)',
    JSON.stringify(env.seedFallback([1, 2, 3])) === '[]',
    JSON.stringify(env.seedFallback([1, 2, 3]))
  );

  /* 6. live: an unconfigured provider is UNAVAILABLE, never simulation */
  test(
    'live: an unconfigured provider is UNAVAILABLE (available), never simulation, and is NOT simulation-safe',
    env.environmentDefaultMode('simulation') === 'available' &&
      types.modeForState(undefined, 'simulation') === 'available' &&
      types.isProviderSimulationSafe(types.modeForState(undefined, 'simulation')) === false
  );

  /* 7. the fail-closed rule is intact: ONLY simulation is safe */
  test(
    'the fail-closed rule is intact: only SIMULATION is simulation-safe',
    types.isProviderSimulationSafe('simulation') === true &&
      ['available', 'configuring', 'live', 'degraded', 'error', 'disabled', 'unknown', 'not_registered', undefined].every(
        (m) => types.isProviderSimulationSafe(m) === false
      )
  );

  /* 8. live maps REGISTRY DEFAULTS only — an explicit simulation override is not broken */
  test(
    'live does NOT alter an explicit simulation override (only registry defaults are mapped)',
    types.modeForState({ status: 'connected', sandbox: true }, 'simulation') === 'simulation'
  );

  /* a real (non-sandbox) connect still resolves live */
  test(
    'a real (non-sandbox) connect still resolves LIVE',
    types.modeForState({ status: 'connected', sandbox: false }, 'simulation') === 'live'
  );

  /* 9. the canonical provider-default resolution reads the owner */
  test(
    'the canonical provider default resolution reports an unconfigured provider UNAVAILABLE in live',
    registry.defaultIntegrationMode('amazon_sp_api') === 'available',
    String(registry.defaultIntegrationMode('amazon_sp_api'))
  );

  /* restore demo for the source checks below (and for any later work) */
  env.resetEnvironmentMode();
  test('reset returns to the build default (demo)', env.isDemoEnvironment() === true);

  /* 10. SOURCE — the data layer reads the owner, not its own flag */
  const api = read('src/data/api.ts');
  test(
    'the data layer routes every seed fallback through the owner (seedFallback)',
    /seedFallback\(/.test(api) &&
      !/return \{ data: seed\.slice\(\)/.test(api) &&
      !/return \{ data: seed, source: 'seed' \}/.test(api) &&
      !/return \{ data: demoBrands, source: 'seed' \}/.test(api) &&
      !/\[\.\.\.seed\]/.test(api)
  );

  /* 11. SOURCE — the provider-mode machine reads the owner */
  const typesSrc = read('src/integrations/types.ts');
  test('the provider-mode machine reads the owner (modeForState → environmentDefaultMode)', /environmentDefaultMode/.test(typesSrc));

  /* 12. SOURCE — exactly ONE owner of the environment */
  const files = [];
  (function walk(dir) {
    for (const entry of readdirSync(join(rootDir, dir), { withFileTypes: true })) {
      const p = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(entry.name)) files.push(p);
    }
  })('src');
  const readsEnvVar = files.filter((f) => /VITE_ENVIRONMENT/.test(read(f)));
  test(
    'exactly ONE module reads VITE_ENVIRONMENT (the owner)',
    readsEnvVar.length === 1 && readsEnvVar[0] === 'src/config/environment.ts',
    readsEnvVar.join(', ')
  );
  const ownsKey = files.filter((f) => /mercenta\.environment\.v1/.test(read(f)));
  test(
    'exactly ONE module owns the environment storage key',
    ownsKey.length === 1 && ownsKey[0] === 'src/config/environment.ts',
    ownsKey.join(', ')
  );

  /* 13. SOURCE — the switch is operable in one obvious place */
  const simControl = read('src/components/admin/integrations/SimulationControl.tsx');
  test(
    'the switch is operable in ONE obvious place (Simulation Control Centre)',
    /EnvironmentSwitch/.test(simControl) &&
      /setEnvironmentMode\(/.test(simControl) &&
      /data-environment-switch=/.test(simControl)
  );
} finally {
  await server.close();
}

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.error(`✗ ${failures} environment check(s) FAILED`);
  process.exit(1);
}
console.log('✓ the ONE SWITCH behaves correctly (demo needs no credential; live never fakes a row or a provider)');

