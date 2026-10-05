/**
 * §RATE-LIMIT — THE PUBLIC-ENDPOINT RATE-LIMIT GATE.
 *
 * WHY THIS EXISTS
 * ---------------
 * The registry row `batch-4-rate-limiting` records that NO public-facing Edge
 * Function implemented rate limiting, and that the file it had once cited
 * (`supabase/functions/_shared/rateLimit.ts`) had NEVER existed across the full
 * git history. The launch gate's final security audit also declares rate limiting.
 * This gate makes the limiter REAL and keeps it real:
 *
 *   1. COVERAGE — every Edge Function folder in the repository is DISCOVERED, and
 *      every discovered function must have a declared policy AND call the guard.
 *      A new function with no policy, or one that skips the guard, FAILS here.
 *   2. ONE OWNER — `FUNCTION_BUCKETS` in the module must EQUAL the discovered
 *      folder set, so the list cannot drift from reality.
 *   3. PREFLIGHT IS EXEMPT — in every function the guard call must sit AFTER the
 *      CORS `OPTIONS` branch, so a browser preflight is never rate-limited.
 *   4. THE LIMITER IS EXECUTED, not read as text (Node's TypeScript stripping):
 *      under-limit allows, at-limit allows, over-limit REFUSES with a positive
 *      retry, a new window RESETS, a different caller is independent, and an
 *      UNKNOWN bucket falls back to the DEFAULT (never unlimited).
 *   5. THE REFUSAL IS HONEST — 429, a JSON body that says `simulated: false` and
 *      names the code, `Retry-After`, and the CORS headers preserved.
 *   6. NO HIDDEN WORK — the limiter makes no network call and uses no randomness.
 *
 * Usage: node scripts/validate-rate-limiting.mjs  (exit 1 on any failure)
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';

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

const MODULE = 'supabase/functions/_shared/rateLimit.ts';
const rl = await import(new URL(MODULE, ROOT).href);

/* ── 1. DISCOVER every Edge Function folder (excluding the shared folders) ─── */
const fnDirs = readdirSync(new URL('supabase/functions/', ROOT), { withFileTypes: true })
  .filter((e) => e.isDirectory() && !e.name.startsWith('_'))
  .map((e) => e.name)
  .filter((name) => exists(new URL(`supabase/functions/${name}/index.ts`, ROOT)))
  .sort();

test(`every Edge Function folder is discovered (${fnDirs.length})`, fnDirs.length > 0, fnDirs.join(', '));
test(
  'FUNCTION_BUCKETS in the module EQUALS the discovered function folders (one owner)',
  JSON.stringify([...rl.FUNCTION_BUCKETS].sort()) === JSON.stringify(fnDirs),
  `module ${JSON.stringify([...rl.FUNCTION_BUCKETS].sort())} vs folders ${JSON.stringify(fnDirs)}`
);
const missingPolicy = fnDirs.filter((f) => !rl.RATE_LIMIT_POLICIES[f]);
test('every discovered function has a DECLARED policy', missingPolicy.length === 0, missingPolicy.join(', '));
const orphanPolicy = Object.keys(rl.RATE_LIMIT_POLICIES).filter((k) => !fnDirs.includes(k));
test('no policy exists for a bucket that is not a function', orphanPolicy.length === 0, orphanPolicy.join(', '));
test(
  'the DEFAULT policy exists and is finite and positive (an unknown bucket is never unlimited)',
  Number.isFinite(rl.DEFAULT_RATE_LIMIT_POLICY.limit) &&
    rl.DEFAULT_RATE_LIMIT_POLICY.limit > 0 &&
    Number.isFinite(rl.DEFAULT_RATE_LIMIT_POLICY.windowMs) &&
    rl.DEFAULT_RATE_LIMIT_POLICY.windowMs > 0
);

/* ── 2. EVERY function imports the ONE limiter, calls it with its own bucket,
 *       and does so AFTER the CORS preflight branch. ─────────────────────── */
for (const f of fnDirs) {
  const src = stripComments(read(`supabase/functions/${f}/index.ts`));
  test(`${f}: imports the ONE limiter`, /_shared\/rateLimit\.ts/.test(src));
  const calls = [...src.matchAll(/rateLimitGuard\(req,\s*'([^']+)'/g)].map((m) => m[1]);
  test(`${f}: calls rateLimitGuard exactly once, with its own bucket`, calls.length === 1 && calls[0] === f, calls.join(', ') || 'no call');
  const optAt = src.indexOf("=== 'OPTIONS'");
  const guardAt = src.indexOf('rateLimitGuard(req,');
  test(
    `${f}: the guard sits AFTER the CORS preflight branch (OPTIONS is exempt)`,
    optAt < 0 || guardAt > optAt,
    `optionsAt=${optAt} guardAt=${guardAt}`
  );
}

/* ── 3. THE LIMITER IS EXECUTED (deterministic clock passed in) ───────────── */
const T0 = 1_000_000;
const policy3 = { limit: 3, windowMs: 1000 };
const run = (store, bucket, identity, now) =>
  rl.checkRateLimit(store, bucket, identity, policy3, now);

const store = rl.createMemoryRateLimitStore();
const s1 = run(store, 'demo', 'caller-a', T0);
const s2 = run(store, 'demo', 'caller-a', T0);
const s3 = run(store, 'demo', 'caller-a', T0);
const s4 = run(store, 'demo', 'caller-a', T0);
test('under the limit is allowed', s1.allowed && s2.allowed && s3.allowed);
test('remaining counts down to zero', s1.remaining === 2 && s3.remaining === 0);
test('over the limit is REFUSED with a positive retry', s4.allowed === false && s4.retryAfterSeconds > 0, JSON.stringify(s4));
const other = run(store, 'demo', 'caller-b', T0);
test('a different caller has its own independent window', other.allowed === true && other.remaining === 2);
const nextWindow = run(store, 'demo', 'caller-a', T0 + 1000);
test('a new window RESETS the counter', nextWindow.allowed === true && nextWindow.remaining === 2);

/* deterministic — two fresh stores fed the same sequence agree exactly */
const seq = (s) => [run(s, 'demo', 'z', T0), run(s, 'demo', 'z', T0), run(s, 'demo', 'z', T0 + 1000)];
test(
  'deterministic (same inputs ⇒ identical decisions)',
  JSON.stringify(seq(rl.createMemoryRateLimitStore())) ===
    JSON.stringify(seq(rl.createMemoryRateLimitStore()))
);

/* ── 4. policyFor — declared default, the DEFAULT fallback, and env override ─ */
test(
  'policyFor returns the DECLARED policy for a known bucket',
  rl.policyFor('spapi', () => undefined).limit === rl.RATE_LIMIT_POLICIES.spapi.limit
);
test(
  'policyFor falls back to the DEFAULT for an UNKNOWN bucket (never unlimited)',
  rl.policyFor('who-knows', () => undefined).limit === rl.DEFAULT_RATE_LIMIT_POLICY.limit
);
test(
  'policyFor honours a positive env override',
  rl.policyFor('spapi', (k) => (k === 'RATE_LIMIT_SPAPI_LIMIT' ? '7' : undefined)).limit === 7
);
test(
  'policyFor IGNORES a nonsense env override and keeps the declared default',
  rl.policyFor('spapi', (k) => (k === 'RATE_LIMIT_SPAPI_LIMIT' ? '-3' : undefined)).limit ===
    rl.RATE_LIMIT_POLICIES.spapi.limit
);

/* ── 5. the GUARD — allowed ⇒ null; over ⇒ a truthful 429 ────────────────── */
const identityReq = new Request('https://demo.test/functions/v1/spapi', {
  headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' },
});
test('clientIdentity uses the first x-forwarded-for hop', rl.clientIdentity(identityReq) === '203.0.113.7');
test(
  'clientIdentity falls back to unknown when no address header is present',
  rl.clientIdentity(new Request('https://demo.test/x')) === 'unknown'
);

const cors = { 'Access-Control-Allow-Origin': '*' };
const gStore = rl.createMemoryRateLimitStore();
const gOpts = { store: gStore, now: T0, policy: { limit: 1, windowMs: 1000 } };
test('the guard returns null while the caller is allowed', rl.rateLimitGuard(identityReq, 'spapi', cors, gOpts) === null);
const blocked = rl.rateLimitGuard(identityReq, 'spapi', cors, gOpts);
test('the guard returns a 429 once the caller is over the limit', blocked instanceof Response && blocked.status === 429);
test('the 429 carries a Retry-After header', blocked.headers.get('Retry-After') === '1');
test('the 429 preserves the caller CORS headers', blocked.headers.get('Access-Control-Allow-Origin') === '*');
const refusal = await blocked.json();
test(
  'the 429 is a truthful refusal (code named, NOT reported as simulated)',
  refusal.code === 'RATE_LIMITED' && refusal.simulated === false && refusal.retryAfterSeconds === 1,
  JSON.stringify(refusal)
);

/* ── 6. NO HIDDEN WORK — no network call, no randomness (comments stripped) ─ */
const moduleCode = stripComments(read(MODULE));
test('the limiter makes NO network call', !/fetch\s*\(|XMLHttpRequest|axios/.test(moduleCode));
test('the limiter uses NO randomness', !/Math\.random/.test(moduleCode));

/* ── Summary ──────────────────────────────────────────────────────────────── */
console.log('');
console.log(`Rate limiting: ${fnDirs.length} functions covered · ${checks} assertions`);
console.log(failures === 0 ? 'RATE_LIMITING_VALIDATION_PASS' : `RATE_LIMITING_VALIDATION_FAIL (${failures})`);
if (failures > 0) process.exit(1);
