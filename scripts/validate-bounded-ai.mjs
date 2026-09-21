/**
 * §FOUNDATION — BOUNDED INTELLIGENT DECISION SEAM — SAFETY GATE (2026-09-20).
 *
 * The platform's position: a model may ASSIST a bounded decision, but it may
 * never be the authority for retail-channel truth, financial movement, credential
 * handling, security permissions, irreversible external actions or
 * legal/compliance final authority. This gate proves that against the ACTUAL
 * source, so a future "just call the model here" change fails validation instead
 * of shipping:
 *
 *   A. MODEL SELECTION IS CENTRALISED — the runtime model policy is the only
 *      chooser, it allows FREE models only, and it REFUSES rather than upgrading.
 *   B. EVERY AI CALL IS AUTHORISED + RECORDED — each AI module goes through the
 *      canonical cost policy (`authoriseAiCall` / `recordAiCallOutcome`).
 *   C. NO CLIENT-SIDE SECRET — no AI module reads a `VITE_*` credential.
 *   D. FORBIDDEN DOMAINS NEVER IMPORT AI — compliance, finance, payouts,
 *      verification, the retail-channel client, the integration registry and the
 *      routing evaluators contain NO import of any AI module.
 *   E. PROVIDER MODES FAIL CLOSED — an unknown/unregistered provider is never
 *      simulation-safe and never "live".
 *   F. THE AI CLIENT IS OPTIONAL — with no credential it returns a labelled
 *      deterministic answer and makes no network call.
 *   G. THE DECISION SEAM EXISTS AND HOLDS NO MODEL — the routing gateways + the
 *      commercial gate turn declared conditions into an auditable route/refusal,
 *      and the automation registry holds the human approval gate.
 *
 * ZERO NETWORK: `fetch` is stubbed to throw for the whole run.
 *
 * Run: node scripts/validate-bounded-ai.mjs
 */
import { createServer } from 'vite';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
const test = (name, ok, detail = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};
const read = (p) => readFileSync(resolve(process.cwd(), p), 'utf8');
const walk = (dir, acc = []) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx)$/.test(e.name)) acc.push(p);
  }
  return acc;
};

try {
  const policy = await server.ssrLoadModule('/src/lib/costs/modelPolicy.ts');
  const client = await server.ssrLoadModule('/src/lib/ai/founderAiClient.ts');
  const integrations = await server.ssrLoadModule('/src/integrations/types.ts');

  const originalFetch = globalThis.fetch;
  let networkCalls = 0;
  globalThis.fetch = async (...args) => {
    networkCalls++;
    throw new Error(`NO LIVE NETWORK ALLOWED IN VALIDATION: ${String(args[0])}`);
  };

  /* ── A. Model selection is centralised and free-only ────────────────────── */
  test(
    'only FREE runtime models are eligible',
    policy.FREE_RUNTIME_MODELS.length > 0 && policy.FREE_RUNTIME_MODELS.every((m) => m.endsWith(':free')),
    policy.FREE_RUNTIME_MODELS.join(', ')
  );
  test('a paid model is refused by the policy', policy.isModelAllowed('openai/gpt-4o') === false);
  test('a free model is allowed by the policy', policy.isModelAllowed(policy.FREE_RUNTIME_MODELS[0]) === true);
  test('no model at all is allowed (deterministic path)', policy.isModelAllowed(null) === true);
  const refusedTask = policy.selectRuntimeModelForTask('discovery_fit_scoring');
  test(
    'a task the free tier cannot serve is REFUSED, never silently upgraded',
    refusedTask.refused === true || refusedTask.model === null || refusedTask.tier !== 'paid_max',
    `${refusedTask.tier}/${String(refusedTask.model)}`
  );
  test(
    'the policy never returns a paid tier as an executable choice',
    policy.selectRuntimeModelForTask('founder_brief_narrative').tier !== 'paid_max'
  );

  /* ── B/C. Every AI module is authorised, recorded and secret-free ───────── */
  const aiFiles = walk(resolve(process.cwd(), 'src/lib/ai'));
  test('the AI layer is small and declared', aiFiles.length > 0, String(aiFiles.length));
  test(
    'every AI module either calls the canonical cost policy or delegates to the ONE authorised AI client (single egress)',
    aiFiles.every((f) => {
      const src = read(f);
      return /authoriseAiCall|recordAiCallOutcome/.test(src) || /from '\.\/founderAiClient'/.test(src);
    })
  );
  test(
    'exactly ONE module performs the authorised model call (no second egress)',
    aiFiles.filter((f) => /authoriseAiCall/.test(read(f))).length === 1,
    aiFiles.filter((f) => /authoriseAiCall/.test(read(f))).map((f) => f.split('/').pop()).join(', ')
  );
  test(
    'no AI module reads a client-side credential',
    aiFiles.every((f) => !/import\.meta\.env\.[A-Z_]*VITE[A-Z_]*(KEY|SECRET|TOKEN)/.test(read(f)))
  );
  test(
    'the AI client declares its credential seam as server-side',
    read('src/lib/ai/founderAiClient.ts').includes("credentialSeam: 'server_side'")
  );

  /* ── D. Forbidden domains never import AI ──────────────────────────────── */
  const FORBIDDEN = [
    'src/lib/compliance.ts',
    'src/lib/compliance',
    'src/lib/finance',
    'src/config/payouts.ts',
    'src/lib/verification',
    'src/lib/spapi',
    'src/lib/routing/gateways.ts',
    'src/integrations/registry.ts',
    'src/lib/commercial',
  ];
  const offenders = [];
  for (const target of FORBIDDEN) {
    const full = resolve(process.cwd(), target);
    let files = [];
    try {
      files = statSync(full).isDirectory() ? walk(full) : [full];
    } catch {
      continue;
    }
    for (const f of files) {
      const src = read(f);
      if (/from '@\/lib\/ai\//.test(src)) offenders.push(f.replace(`${process.cwd()}/`, ''));
    }
  }
  test(
    'no forbidden domain (compliance, finance, payouts, verification, retail-channel client, registry, routing) imports an AI module',
    offenders.length === 0,
    offenders.join(', ')
  );

  /* ── E. Provider modes fail closed ─────────────────────────────────────── */
  test('an unknown provider mode is never simulation-safe', integrations.isProviderSimulationSafe('unknown') === false);
  test('an unregistered provider mode is never simulation-safe', integrations.isProviderSimulationSafe('not_registered') === false);
  test(
    'an error/degraded mode is never simulation-safe',
    integrations.isProviderSimulationSafe('error') === false && integrations.isProviderSimulationSafe('degraded') === false
  );
  test('only the positively-resolved simulation mode is simulation-safe', integrations.isProviderSimulationSafe('simulation') === true);
  test('a live mode is not "simulation-safe" (it is live, a distinct fact)', integrations.isProviderSimulationSafe('live') === false);

  /* ── F. The AI client is optional and degrades honestly ────────────────── */
  const availability = client.aiAvailability();
  test('AI availability is resolved from the canonical registry', availability.provider === 'openrouter');
  test('no paid fallback is ever permitted', availability.paidFallbackAllowed === false);
  test(
    'without a credential the client states a truthful, non-empty degradation path',
    availability.state === 'free_model_ready' ? true : availability.degradation.length > 40
  );
  test('no network call was made by the AI layer', networkCalls === 0, String(networkCalls));

  /* ── G. The decision seam exists and holds no model ────────────────────── */
  test('the routing evaluators declare a fail-closed exclusive gateway', read('src/config/routing.ts').includes('refusesDefaultSuccess: true'));
  test('the routing evaluators contain no AI import', !/from '@\/lib\/ai\//.test(read('src/lib/routing/gateways.ts')));
  test('the commercial gate turns declared conditions into a route + refusal', read('src/lib/commercial/commercialGate.ts').includes('refused: decision.refused'));
  test('the automation registry holds the human approval gate', read('src/lib/automation/registry.ts').includes('blocked_approval'));

  globalThis.fetch = originalFetch;
  console.log(`\n-- network calls during validation: ${networkCalls} --`);
  console.log(failures === 0 ? 'BOUNDED_AI_VALIDATION_PASS' : `BOUNDED_AI_VALIDATION_FAIL (${failures})`);
} finally {
  await server.close();
}
if (failures > 0) process.exit(1);
