#!/usr/bin/env node
/**
 * §S1-a — PROVIDER MODE SAFETY REGRESSION VALIDATOR.
 *
 * Consolidates the "UNKNOWN ≠ SIMULATION" contract into ONE place and proves it
 * against the REAL modules (no mocks of the code under test):
 *
 *   A. THE PREDICATE — `isProviderSimulationSafe` is true for `simulation` and
 *      false for EVERY other state, including a missing/undefined mode.
 *   B. RESOLUTION — an unregistered or unknown provider resolves to
 *      `not_registered`; a registered provider resolves authoritatively.
 *   C. DERIVATION — `modeForState`: a sandbox connection is never live, an
 *      operator `disabled` always wins, and `needs_attention` distinguishes
 *      error from degraded.
 *   D. REGISTRY INVARIANTS — every registered provider has an authoritative
 *      default mode, NO provider defaults to `live`, and nothing claims a
 *      non-sandbox connection at boot.
 *   E. SCENARIO ENGINE — behavioural refusal: a scenario is refused for every
 *      unsafe mode AND when no mode lookup is supplied at all (the gate's
 *      default is `unknown`, never simulation), and only runs positively when
 *      every required provider resolves `simulation`.
 *
 * §19 — only a POSITIVELY resolved `simulation` is simulation-safe.
 *
 * Usage: node scripts/validate-provider-mode-safety.mjs
 * Exit code: 0 if every assertion passes, 1 on any failure.
 */
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
const test = (name, ok, detail = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) failures++;
};

/** Every state that must NEVER be treated as simulation-safe. */
const UNSAFE_MODES = [
  'available',
  'configuring',
  'live',
  'degraded',
  'error',
  'disabled',
  'unknown',
  'not_registered',
];

try {
  const types = await server.ssrLoadModule('/src/integrations/types.ts');
  const registry = await server.ssrLoadModule('/src/integrations/registry.ts');
  const scenarioEngine = await server.ssrLoadModule('/src/lib/simulation/scenarioEngine.ts');

  const {
    isProviderSimulationSafe,
    resolveProviderMode,
    modeForState,
    INTEGRATION_MODE_LABELS,
    INITIAL_INTEGRATIONS,
  } = types;

  /* ── A. THE PREDICATE ────────────────────────────────────────────────── */
  console.log('\n── A. The simulation-safe predicate ──');

  test('`simulation` IS simulation-safe', isProviderSimulationSafe('simulation') === true);
  for (const mode of UNSAFE_MODES) {
    test(`FAIL-CLOSED: "${mode}" is NOT simulation-safe`, isProviderSimulationSafe(mode) === false);
  }
  test(
    'FAIL-CLOSED: a missing mode (undefined) is NOT simulation-safe',
    isProviderSimulationSafe(undefined) === false
  );

  /* ── B. RESOLUTION ───────────────────────────────────────────────────── */
  console.log('\n── B. Provider-mode resolution ──');

  test(
    'an empty modes map resolves a registered provider to `not_registered`',
    resolveProviderMode({}, 'amazon_sp_api') === 'not_registered'
  );
  test(
    'a provider absent from the map resolves to `not_registered`',
    resolveProviderMode({ amazon_sp_api: 'simulation' }, 'totally_unknown_provider') ===
      'not_registered'
  );
  test(
    'an explicit mode is returned unchanged',
    resolveProviderMode({ amazon_sp_api: 'simulation' }, 'amazon_sp_api') === 'simulation'
  );
  test(
    '`defaultIntegrationMode` is authoritative for a registered provider',
    registry.defaultIntegrationMode('amazon_sp_api') === 'simulation',
    registry.defaultIntegrationMode('amazon_sp_api')
  );
  test(
    '`defaultIntegrationMode` refuses an unregistered provider (never simulation)',
    registry.defaultIntegrationMode('not_a_registered_provider') === 'not_registered'
  );
  for (const id of ['dhl', 'palletline', 'xero', 'companies_house', 'hmrc', 'wise', 'payoneer']) {
    test(
      `registered scenario/finance provider "${id}" resolves authoritatively to simulation`,
      registry.defaultIntegrationMode(id) === 'simulation',
      registry.defaultIntegrationMode(id)
    );
  }

  /* ── C. DERIVATION ───────────────────────────────────────────────────── */
  console.log('\n── C. modeForState derivation ──');

  const sandboxConnected = modeForState({ status: 'connected', sandbox: true }, 'available');
  test('a SANDBOX connection derives `simulation` (never live)', sandboxConnected === 'simulation');
  test('a sandbox connection IS simulation-safe', isProviderSimulationSafe(sandboxConnected) === true);

  const liveConnected = modeForState({ status: 'connected', sandbox: false }, 'simulation');
  test('a NON-sandbox connection derives `live`', liveConnected === 'live');
  test('a live connection is NOT simulation-safe', isProviderSimulationSafe(liveConnected) === false);

  test(
    'operator `disabled` wins over a sandbox connection',
    modeForState({ status: 'connected', sandbox: true, disabled: true }, 'simulation') === 'disabled'
  );
  test(
    '`connecting` derives `configuring`',
    modeForState({ status: 'connecting', sandbox: false }, 'simulation') === 'configuring'
  );
  test(
    '`code_received` derives `configuring`',
    modeForState({ status: 'code_received', sandbox: false }, 'simulation') === 'configuring'
  );
  test(
    '`needs_attention` WITH an error derives `error`',
    modeForState({ status: 'needs_attention', sandbox: false, error: 'boom' }, 'simulation') === 'error'
  );
  test(
    '`needs_attention` WITHOUT an error derives `degraded`',
    modeForState({ status: 'needs_attention', sandbox: false }, 'simulation') === 'degraded'
  );
  test(
    'a disconnected provider falls back to the declared default mode',
    modeForState({ status: 'disconnected', sandbox: false }, 'available') === 'available'
  );

  /* ── D. REGISTRY INVARIANTS ──────────────────────────────────────────── */
  console.log('\n── D. Registry invariants ──');

  const order = registry.INTEGRATION_ORDER;
  test('the registry declares at least one provider', order.length > 0, String(order.length));

  const missingMeta = order.filter((id) => !registry.INTEGRATION_META[id]);
  test('every registered provider has metadata', missingMeta.length === 0, missingMeta.join(', '));

  const unknownDefault = order.filter(
    (id) => !INTEGRATION_MODE_LABELS[registry.INTEGRATION_META[id]?.defaultMode]
  );
  test(
    'every provider default mode is a real, declared mode',
    unknownDefault.length === 0,
    unknownDefault.join(', ')
  );

  const liveByDefault = order.filter((id) => registry.INTEGRATION_META[id].defaultMode === 'live');
  test(
    'NO provider defaults to `live` (live is only ever a verified connection)',
    liveByDefault.length === 0,
    liveByDefault.join(', ')
  );

  const notRegistered = order.filter((id) => registry.defaultIntegrationMode(id) === 'not_registered');
  test(
    'every registered provider resolves to something other than `not_registered`',
    notRegistered.length === 0,
    notRegistered.join(', ')
  );

  const claimsLiveAtBoot = order.filter((id) => {
    const state = INITIAL_INTEGRATIONS[id];
    return state?.status === 'connected' && !state.sandbox;
  });
  test(
    'NO provider claims a non-sandbox (live) connection at boot',
    claimsLiveAtBoot.length === 0,
    claimsLiveAtBoot.join(', ')
  );

  /* ── E. SCENARIO ENGINE — BEHAVIOURAL REFUSAL ────────────────────────── */
  console.log('\n── E. Scenario engine refuses non-simulation execution ──');

  const refused = await scenarioEngine.runScenario('NORMAL_PO', { getMode: () => 'unknown' });
  test('an `unknown` provider REFUSES the scenario', refused.status === 'safety_refused', refused.status);
  test(
    'the refusal states why (provider + resolved mode)',
    typeof refused.safetyReason === 'string' &&
      refused.safetyReason.includes('amazon_sp_api') &&
      refused.safetyReason.includes('unknown'),
    refused.safetyReason
  );

  for (const mode of UNSAFE_MODES) {
    const res = await scenarioEngine.runScenario('NORMAL_PO', { getMode: () => mode });
    test(
      `FAIL-CLOSED: scenario refused when the provider resolves "${mode}"`,
      res.status === 'safety_refused',
      res.status
    );
  }

  const noLookup = await scenarioEngine.runScenario('NORMAL_PO', {});
  test(
    'FAIL-CLOSED: with NO mode lookup supplied the gate defaults to `unknown` and refuses',
    noLookup.status === 'safety_refused',
    noLookup.status
  );

  const scenarios = scenarioEngine.listScenarios();
  test(
    'the scenario surface is enumerable (9 declared scenarios)',
    scenarios.length === 9,
    String(scenarios.length)
  );

  const ok = await scenarioEngine.runScenario('NORMAL_PO', {
    getMode: () => 'simulation',
    seed: 4242,
    timestamp: '2026-01-05T00:00:00.000Z',
    brandId: 'brand-astonish',
  });
  test(
    'POSITIVE PATH: the scenario runs when every required provider is simulation',
    ok.status === 'ok',
    ok.error ?? ok.status
  );
  test('the simulated run records its steps and audit ids', ok.steps.length > 0 && ok.auditIds.length > 0);

  console.log(
    failures === 0
      ? '\nPROVIDER_MODE_SAFETY_VALIDATION_PASS'
      : `\nPROVIDER_MODE_SAFETY_VALIDATION_FAIL (${failures})`
  );
} finally {
  await server.close();
}
if (failures > 0) process.exit(1);
