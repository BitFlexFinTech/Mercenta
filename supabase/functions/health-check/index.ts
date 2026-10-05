/**
 * §BATCH10 — THE `health-check` EDGE FUNCTION.
 *
 * The registry row `batch10-health-check-digest` records that this function was
 * supposed to exist and NEVER did (checked across the full git history). It now
 * exists and answers an HONEST server-side readiness result.
 *
 * WHAT IT DOES
 *   · gathers the server-side checks through the ONE shared owner
 *     (`supabase/functions/_shared/readiness.ts → collectServerChecks`);
 *   · evaluates them through the SAME owner (`evaluateReadiness`), which produces
 *     the severity and a plain-language triage summary;
 *   · returns that result with `simulated: false`.
 *
 * WHAT IT HONESTLY IS NOT
 *   · It NEVER fabricates a reading. With no data source configured it reports the
 *     two checks as `unknown` and says so — it does not invent a latency, a
 *     version or an "ok".
 *   · It performs NO provider call and reads NO tenant data, so it needs no
 *     operator session and stays inside the demoable-without-credentials rule.
 */
import { rateLimitGuard } from '../_shared/rateLimit.ts';
import { collectServerChecks, evaluateReadiness } from '../_shared/readiness.ts';

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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders() });
  const limited = rateLimitGuard(req, 'health-check', corsHeaders());
  if (limited) return limited;

  const checks = await collectServerChecks(denoEnv, fetch);
  const result = evaluateReadiness(checks);

  // 503 only when a check genuinely FAILED (something configured is broken). An
  // unconfigured server is `warning`/200 — it is honest, not down.
  return json(
    {
      ok: result.healthy,
      simulated: false,
      source: 'health-check',
      generatedAt: new Date().toISOString(),
      healthy: result.healthy,
      severity: result.severity,
      checks: result.checks,
      triageSummary: result.triageSummary,
    },
    result.severity === 'critical' ? 503 : 200
  );
});
