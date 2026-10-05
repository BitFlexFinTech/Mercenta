/**
 * §BATCH10 — THE HEALTH-CHECK + DAILY-DIGEST GATE.
 *
 * WHY THIS EXISTS
 * ---------------
 * The registry row `batch10-health-check-digest` records that a "health-check
 * function" was meant to exist, that a `daily-digest` Edge Function was meant to
 * call it and include its results with a triage summary, and that NEITHER file has
 * EVER existed in this repository across the full git history. Meanwhile
 * `supabase/migrations/025_cron_daily_digest.sql` posts every morning to
 * `/functions/v1/daily-digest`. This gate makes the pair REAL and keeps it real:
 *
 *   1. THE OWNER IS EXECUTED, not read as text (Node's TypeScript stripping):
 *      all-pass ⇒ healthy/ok; any fail ⇒ unhealthy/critical; an unknown ⇒
 *      healthy/warning (never dressed as a pass); the triage summary NAMES what
 *      needs attention; the evaluator is DETERMINISTIC.
 *   2. THE UNCONFIGURED PATH IS HONEST — with no data source configured the
 *      collector reports `unknown` (never a pass, never an invented value).
 *   3. ONE OWNER — both Edge Functions import the SAME shared module, so there is
 *      exactly one definition of readiness.
 *   4. EACH FUNCTION IS RATE-LIMITED with its OWN bucket, AFTER the CORS
 *      preflight branch, and reports `simulated: false`.
 *   5. NO FABRICATION — neither the owner nor the functions use randomness.
 *
 * Usage: node scripts/validate-health-digest.mjs  (exit 1 on any failure)
 */
import { readFileSync, existsSync } from 'node:fs';

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
const exists = (p) => existsSync(new URL(p, ROOT));
/** Strip comments so a prose mention never satisfies — or breaks — a code check. */
const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

const OWNER = 'supabase/functions/_shared/readiness.ts';
const HEALTH = 'supabase/functions/health-check/index.ts';
const DIGEST = 'supabase/functions/daily-digest/index.ts';

/* ── 0. the artefacts exist ───────────────────────────────────────────────── */
test('the shared readiness owner exists', exists(OWNER));
test('the health-check function exists', exists(HEALTH));
test('the daily-digest function exists', exists(DIGEST));
if (!exists(OWNER) || !exists(HEALTH) || !exists(DIGEST)) {
  console.log(`\nHEALTH_DIGEST_VALIDATION_FAIL (${failures})`);
  process.exit(1);
}

const owner = await import(new URL(OWNER, ROOT).href);

/* ── 1. THE EVALUATOR IS EXECUTED ──────────────��───────────��──────────────── */
const passA = { id: 'supabase_env', status: 'pass', detail: 'configured' };
const passB = { id: 'supabase_api', status: 'pass', detail: 'answered' };
const failB = { id: 'supabase_api', status: 'fail', detail: 'HTTP 500' };
const unkB = { id: 'supabase_api', status: 'unknown', detail: 'cannot probe' };

const allPass = owner.evaluateReadiness([passA, passB]);
test('all checks pass ⇒ healthy, severity ok', allPass.healthy === true && allPass.severity === 'ok');
test('all-pass triage summary states the count', /All 2 readiness checks passed\./.test(allPass.triageSummary), allPass.triageSummary);

const oneFail = owner.evaluateReadiness([passA, failB]);
test('any failing check ⇒ UNHEALTHY, severity critical', oneFail.healthy === false && oneFail.severity === 'critical');
test('a failing check is NAMED in the triage summary', oneFail.triageSummary.includes('supabase_api'), oneFail.triageSummary);

const oneUnknown = owner.evaluateReadiness([passA, unkB]);
test('an unknown check stays HEALTHY but is a warning (never dressed as a pass)', oneUnknown.healthy === true && oneUnknown.severity === 'warning');
test('an unknown check is NAMED in the triage summary', oneUnknown.triageSummary.includes('supabase_api'), oneUnknown.triageSummary);

const mixed = owner.evaluateReadiness([failB, unkB]);
test('a failure outranks an unknown (critical, and both are counted)',
  mixed.severity === 'critical' && /1 failing/.test(mixed.triageSummary) && /1 unverified/.test(mixed.triageSummary),
  mixed.triageSummary);

test('the evaluator is DETERMINISTIC (same input ⇒ identical result)',
  JSON.stringify(owner.evaluateReadiness([passA, unkB])) === JSON.stringify(owner.evaluateReadiness([passA, unkB])));

test('the evaluator does not mutate its input',
  (() => { const input = [passA, passB]; const before = JSON.stringify(input); owner.evaluateReadiness(input); return JSON.stringify(input) === before; })());

/* ── 2. the UNCONFIGURED path is HONEST (no invented values) ───────────────── */
const noEnv = () => undefined;
const unconfigured = await owner.collectServerChecks(noEnv, async () => {
  throw new Error('collectServerChecks must NOT reach the network when unconfigured');
});
test('unconfigured ⇒ the env check is unknown (never a pass)',
  unconfigured.find((c) => c.id === 'supabase_env')?.status === 'unknown');
test('unconfigured ⇒ the api check is unknown and makes NO network call',
  unconfigured.find((c) => c.id === 'supabase_api')?.status === 'unknown');
test('unconfigured ⇒ the result is honest (healthy, warning)',
  owner.evaluateReadiness(unconfigured).severity === 'warning');

/* injected env + injected transport — still ZERO real network */
const envWith = (map) => (k) => map[k];
let probeUrl = null;
const okFetch = async (url) => { probeUrl = url; return { ok: true, status: 200 }; };
const configured = await owner.collectServerChecks(
  envWith({ SUPABASE_URL: 'https://demo.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-key' }),
  okFetch
);
test('configured + a reachable data source ⇒ both checks pass',
  configured.every((c) => c.status === 'pass'), JSON.stringify(configured));
test('the probe targets the injected base url', typeof probeUrl === 'string' && probeUrl.startsWith('https://demo.supabase.co/'));

const failing = await owner.collectServerChecks(
  envWith({ SUPABASE_URL: 'https://demo.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-key' }),
  async () => ({ ok: false, status: 503 })
);
test('configured but the data source errors ⇒ a FAIL (unhealthy)',
  owner.evaluateReadiness(failing).healthy === false &&
    failing.find((c) => c.id === 'supabase_api')?.status === 'fail');

const throwing = await owner.collectServerChecks(
  envWith({ SUPABASE_URL: 'https://demo.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-key' }),
  async () => { throw new Error('boom'); }
);
test('configured but unreachable ⇒ a FAIL, never a fabricated pass',
  throwing.find((c) => c.id === 'supabase_api')?.status === 'fail');

/* ── 3. NO FABRICATION in the owner ───────────────────────────────────────── */
const ownerCode = stripComments(read(OWNER));
test('the owner uses NO randomness', !/Math\.random/.test(ownerCode));
test('the owner contains no bare network call (transport is injected)',
  !/(^|[^.\w])fetch\s*\(/.test(ownerCode));

/* ── 4. ONE OWNER + RATE-LIMIT WIRING, both functions ─────────────────────── */
for (const [file, bucket, label] of [
  [HEALTH, 'health-check', 'health-check'],
  [DIGEST, 'daily-digest', 'daily-digest'],
]) {
  const src = stripComments(read(file));
  test(`${label}: imports the ONE shared readiness owner`, /_shared\/readiness\.ts/.test(src));
  const calls = [...src.matchAll(/rateLimitGuard\(req,\s*'([^']+)'/g)].map((m) => m[1]);
  test(`${label}: calls rateLimitGuard exactly once, with its own bucket`,
    calls.length === 1 && calls[0] === bucket, calls.join(', ') || 'no call');
  const optAt = src.indexOf("=== 'OPTIONS'");
  const guardAt = src.indexOf('rateLimitGuard(req,');
  test(`${label}: the guard sits AFTER the CORS preflight branch`,
    optAt >= 0 && guardAt > optAt, `optionsAt=${optAt} guardAt=${guardAt}`);
  test(`${label}: reports simulated: false (never dressed as a live probe)`, /simulated:\s*false/.test(src));
  test(`${label}: uses NO randomness`, !/Math\.random/.test(src));
}

/* the digest INCLUDES the health result + the triage summary */
const digestSrc = stripComments(read(DIGEST));
test('daily-digest: includes the health result in its output', /health:\s*\{/.test(digestSrc) && /evaluateReadiness\(/.test(digestSrc));
test('daily-digest: includes the triage summary produced by the owner',
  /triageSummary:\s*health\.triageSummary/.test(digestSrc));
test('daily-digest: never invents a section when no canonical content was supplied',
  /content:\s*body\.digest\s*\?\?\s*null/.test(digestSrc) && /never invents a section/.test(read(DIGEST)));

/* the health-check function EXPOSES the readiness result */
const healthSrc = stripComments(read(HEALTH));
test('health-check: evaluates the readiness owner and returns its checks',
  /evaluateReadiness\(/.test(healthSrc) && /checks:\s*result\.checks/.test(healthSrc));
test('health-check: returns 503 ONLY when a check genuinely failed (critical)',
  /result\.severity === 'critical' \? 503 : 200/.test(healthSrc));

/* ── 5. the ONE limiter knows both buckets ───────────────────────────────── */
const rl = await import(new URL('supabase/functions/_shared/rateLimit.ts', ROOT).href);
test('the rate limiter declares a policy for health-check', Boolean(rl.RATE_LIMIT_POLICIES['health-check']));
test('the rate limiter declares a policy for daily-digest', Boolean(rl.RATE_LIMIT_POLICIES['daily-digest']));
test('the rate limiter lists both buckets in FUNCTION_BUCKETS',
  rl.FUNCTION_BUCKETS.includes('health-check') && rl.FUNCTION_BUCKETS.includes('daily-digest'));

/* ── Summary ──────────────────────────────────────────────────────────────── */
console.log('');
console.log(`Health-check + daily-digest: ${checks} assertions`);
console.log(failures === 0 ? 'HEALTH_DIGEST_VALIDATION_PASS' : `HEALTH_DIGEST_VALIDATION_FAIL (${failures})`);
if (failures > 0) process.exit(1);
