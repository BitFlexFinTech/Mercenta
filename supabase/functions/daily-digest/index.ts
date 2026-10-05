/**
 * §BATCH10 — THE `daily-digest` EDGE FUNCTION.
 *
 * The registry row `batch10-health-check-digest` records that this function was
 * supposed to exist and NEVER did, while `supabase/migrations/025_cron_daily_digest.sql`
 * has always posted every morning (`daily-digest-0700-uk`) to
 * `/functions/v1/daily-digest` — an endpoint that answered nothing. It now exists.
 *
 * WHAT IT DOES
 *   · CALLS THE HEALTH CHECK — it uses the SAME shared owner
 *     (`supabase/functions/_shared/readiness.ts`) the `health-check` function
 *     serves, so there is one definition of readiness and not two;
 *   · INCLUDES the health results in the digest output;
 *   · adds a TRIAGE SUMMARY (produced by the owner, not retyped here);
 *   · includes canonical digest CONTENT when a data-connected caller supplies it,
 *     and states plainly when none was supplied — it never invents a section.
 *
 * HONESTY
 *   · `simulated: false` always: this endpoint produces the digest, it does not
 *     pretend a real external send happened.
 *   · It makes no provider call and needs no operator session, so the whole
 *     platform stays demoable without credentials.
 */
import { rateLimitGuard } from '../_shared/rateLimit.ts';
import { collectServerChecks, evaluateReadiness } from '../_shared/readiness.ts';

const MAX_BODY_BYTES = 256 * 1024;

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  });
}

const denoEnv = (key: string): string | undefined =>
  typeof Deno !== 'undefined' ? Deno.env.get(key) : undefined;

interface DigestRequest {
  /** Canonical digest content, built by `src/lib/automation/digest.ts → buildDailyDigest` and passed by a connected caller. */
  digest?: unknown;
  source?: string;
  schedule?: string;
}

async function readBody(req: Request): Promise<DigestRequest> {
  if (req.method !== 'POST') return {};
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as DigestRequest) : {};
  } catch {
    return {};
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders() });
  const limited = rateLimitGuard(req, 'daily-digest', corsHeaders());
  if (limited) return limited;

  const body = await readBody(req);

  // The SAME owner the health-check function serves — never a second definition.
  const checks = await collectServerChecks(denoEnv, fetch);
  const health = evaluateReadiness(checks);

  const digest = {
    generatedAt: new Date().toISOString(),
    source: typeof body.source === 'string' && body.source ? body.source : 'manual',
    schedule: typeof body.schedule === 'string' && body.schedule ? body.schedule : null,
    health: {
      healthy: health.healthy,
      severity: health.severity,
      checks: health.checks,
    },
    triageSummary: health.triageSummary,
    content: body.digest ?? null,
    contentNote:
      body.digest === undefined || body.digest === null
        ? 'No canonical digest content was supplied, so none is reported — the digest never invents a section. Supply it from src/lib/automation/digest.ts → buildDailyDigest.'
        : 'Canonical digest content supplied by the caller (built by src/lib/automation/digest.ts → buildDailyDigest).',
  };

  return json({ ok: true, simulated: false, source: 'daily-digest', digest }, 200);
});
