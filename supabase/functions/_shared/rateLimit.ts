/**
 * §RATE-LIMIT — THE ONE RATE LIMITER FOR THE PUBLIC EDGE FUNCTIONS.
 *
 * WHY THIS EXISTS
 * ---------------
 * Every Edge Function in this folder answers on a public HTTPS endpoint, and each
 * one exposes an UNAUTHENTICATED path (its simulation path, an OAuth callback or a
 * webhook). Until this module existed there was NO limit on how many times one
 * caller could hit any of them, so a single script could drive unbounded work —
 * the launch gate's final security audit declares rate limiting, and THIS is its
 * owner. `scripts/validate-rate-limiting.mjs` is its gate.
 *
 * WHAT IT IS — AND WHAT IT HONESTLY IS NOT
 * ----------------------------------------
 * This is a FIXED-WINDOW counter kept IN MEMORY in the function's own isolate.
 * Supabase Edge Functions run as many short-lived Deno isolates, so this limit is
 * PER INSTANCE and BEST-EFFORT: it stops one abusive caller hammering a warm
 * instance, but it is NOT a global, cluster-wide quota.
 *
 * A durable, cluster-wide limiter (Postgres or a hosted counter) plugs in through
 * the `RateLimitStore` seam below WITHOUT changing any function — the same
 * mock-first swap the rest of the platform uses. That upgrade is recorded in
 * `PRODUCTION_READINESS.md` and is deliberately NOT pretended to exist here.
 *
 * HONESTY RULES THIS MODULE KEEPS
 *   · It is DETERMINISTIC — `checkRateLimit` takes the clock as a parameter, so the
 *     gate drives it exactly instead of hoping.
 *   · It makes NO network call and uses NO randomness (asserted by the gate with
 *     comments stripped); the ONLY clock read is the guard's default when a caller
 *     supplies no clock, which is why `checkRateLimit` takes the clock explicitly.
 *   · An UNKNOWN bucket falls back to the DEFAULT policy — never unlimited. No
 *     provider mode is involved, so the "unknown is never simulation" rule is
 *     untouched.
 */

export interface RateLimitPolicy {
  /** Requests allowed per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the current window resets. 0 while the request is allowed. */
  retryAfterSeconds: number;
  windowMs: number;
  bucket: string;
  identity: string;
}

export interface RateLimitStore {
  /** Record one request and return the count within the current window. */
  hit(key: string, windowMs: number, now: number): { count: number; windowStart: number };
}

/**
 * The canonical bucket list — the Edge Functions that call the guard. Kept here so
 * a policy exists for every function; `scripts/validate-rate-limiting.mjs` fails if
 * a function folder has no policy or a function skips the guard.
 */
export const FUNCTION_BUCKETS: readonly string[] = [
  'spapi',
  'dhl',
  'palletline',
  'integration-connect',
  'spapi-token-exchange',
  'xero-token',
  'xero-webhook',
  'instantly-reply-webhook',
  'send-email',
  'esign-envelope',
  'catalog-import',
  'discovery-directory',
  'payouts-transfer',
  'health-check',
  'daily-digest',
];

/** Used for any bucket without a declared policy — the limiter is never unlimited. */
export const DEFAULT_RATE_LIMIT_POLICY: RateLimitPolicy = { limit: 60, windowMs: 60_000 };

/**
 * Per-function policies, declared ONCE. Read-heavy simulated proxies are generous;
 * endpoints that WRITE a credential or money are tight; external systems posting to
 * a webhook may legitimately burst, so those are loosest. A deployment may override
 * any of these with `RATE_LIMIT_<BUCKET>_LIMIT` / `RATE_LIMIT_<BUCKET>_WINDOW_MS`.
 */
export const RATE_LIMIT_POLICIES: Record<string, RateLimitPolicy> = {
  spapi: { limit: 120, windowMs: 60_000 },
  dhl: { limit: 120, windowMs: 60_000 },
  palletline: { limit: 120, windowMs: 60_000 },
  'integration-connect': { limit: 30, windowMs: 60_000 },
  'spapi-token-exchange': { limit: 30, windowMs: 60_000 },
  'payouts-transfer': { limit: 30, windowMs: 60_000 },
  'xero-token': { limit: 60, windowMs: 60_000 },
  'send-email': { limit: 60, windowMs: 60_000 },
  'esign-envelope': { limit: 60, windowMs: 60_000 },
  'catalog-import': { limit: 60, windowMs: 60_000 },
  'discovery-directory': { limit: 60, windowMs: 60_000 },
  'xero-webhook': { limit: 300, windowMs: 60_000 },
  'instantly-reply-webhook': { limit: 300, windowMs: 60_000 },
  // §BATCH10 — the readiness/digest pair. `health-check` is a cheap operator read
  // (generous); `daily-digest` is a once-a-morning cron trigger (tight).
  'health-check': { limit: 120, windowMs: 60_000 },
  'daily-digest': { limit: 12, windowMs: 60_000 },
};

/** Memory cap for the in-isolate store — bounded, swept by window (never a timer). */
const MAX_TRACKED_KEYS = 10_000;

/**
 * The in-memory fixed-window store. Deterministic: the result depends ONLY on the
 * arguments, never on wall-clock time read inside the store.
 */
export function createMemoryRateLimitStore(): RateLimitStore {
  const windows = new Map<string, { count: number; windowStart: number }>();
  return {
    hit(key, windowMs, now) {
      const windowStart = Math.floor(now / windowMs) * windowMs;
      if (windows.size >= MAX_TRACKED_KEYS) {
        // Bound memory: drop every window that has already ended.
        for (const [k, v] of windows) {
          if (v.windowStart < windowStart) windows.delete(k);
        }
      }
      const current = windows.get(key);
      if (!current || current.windowStart !== windowStart) {
        const next = { count: 1, windowStart };
        windows.set(key, next);
        return next;
      }
      current.count += 1;
      return current;
    },
  };
}

export const defaultRateLimitStore: RateLimitStore = createMemoryRateLimitStore();

/** The Supabase gateway always forwards the client address in `x-forwarded-for`. */
export function clientIdentity(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return (
    req.headers.get('x-real-ip')?.trim() ||
    req.headers.get('cf-connecting-ip')?.trim() ||
    'unknown'
  );
}

const denoEnv = (key: string): string | undefined =>
  typeof Deno !== 'undefined' ? Deno.env.get(key) : undefined;

/** The effective policy for a bucket, with the declared defaults and an env override. */
export function policyFor(
  bucket: string,
  env: (key: string) => string | undefined = denoEnv
): RateLimitPolicy {
  const base = RATE_LIMIT_POLICIES[bucket] ?? DEFAULT_RATE_LIMIT_POLICY;
  const prefix = `RATE_LIMIT_${bucket.replace(/[^a-z0-9]/gi, '_').toUpperCase()}`;
  const limit = Number(env(`${prefix}_LIMIT`));
  const windowMs = Number(env(`${prefix}_WINDOW_MS`));
  return {
    limit: Number.isFinite(limit) && limit > 0 ? limit : base.limit,
    windowMs: Number.isFinite(windowMs) && windowMs > 0 ? windowMs : base.windowMs,
  };
}

/**
 * Count one request against `bucket:identity` and decide. The clock is a PARAMETER
 * so the result is reproducible and the gate can prove every branch.
 */
export function checkRateLimit(
  store: RateLimitStore,
  bucket: string,
  identity: string,
  policy: RateLimitPolicy,
  now: number
): RateLimitDecision {
  const { count, windowStart } = store.hit(`${bucket}:${identity}`, policy.windowMs, now);
  const allowed = count <= policy.limit;
  const resetAt = windowStart + policy.windowMs;
  return {
    allowed,
    limit: policy.limit,
    remaining: Math.max(0, policy.limit - count),
    retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil((resetAt - now) / 1000)),
    windowMs: policy.windowMs,
    bucket,
    identity,
  };
}

/**
 * The one-line guard every public function calls, immediately after its CORS
 * preflight branch (OPTIONS is exempt so a browser's preflight is never blocked):
 *
 *   const limited = rateLimitGuard(req, 'spapi', corsHeaders());
 *   if (limited) return limited;
 *
 * Returns a 429 `Response` when the caller is over the limit, otherwise `null`.
 */
export function rateLimitGuard(
  req: Request,
  bucket: string,
  cors: Record<string, string>,
  opts: { store?: RateLimitStore; now?: number; policy?: RateLimitPolicy } = {}
): Response | null {
  const policy = opts.policy ?? policyFor(bucket);
  const now = opts.now ?? Date.now();
  const identity = clientIdentity(req);
  const decision = checkRateLimit(opts.store ?? defaultRateLimitStore, bucket, identity, policy, now);
  if (decision.allowed) return null;
  return new Response(
    JSON.stringify({
      ok: false,
      simulated: false,
      code: 'RATE_LIMITED',
      error:
        `Too many requests — the limit for this endpoint is ${decision.limit} per ` +
        `${Math.round(decision.windowMs / 1000)}s. Retry in ${decision.retryAfterSeconds}s.`,
      retryAfterSeconds: decision.retryAfterSeconds,
    }),
    {
      status: 429,
      headers: {
        ...cors,
        'Content-Type': 'application/json',
        'Retry-After': String(decision.retryAfterSeconds),
        'X-RateLimit-Limit': String(decision.limit),
        'X-RateLimit-Remaining': '0',
      },
    }
  );
}
