/**
 * §BATCH10 — THE ONE SERVER-SIDE READINESS OWNER (health-check + daily-digest).
 *
 * WHY THIS EXISTS
 * ---------------
 * The registry row `batch10-health-check-digest` recorded that a "health-check
 * function" was meant to exist, that the `daily-digest` Edge Function was meant to
 * call it and include its results with a TRIAGE SUMMARY, and that NEITHER file has
 * EVER existed in this repository (checked across the full git history). The
 * `pg_cron` migration (`supabase/migrations/025_cron_daily_digest.sql`) therefore
 * posts every morning to `/functions/v1/daily-digest` — an endpoint that answered
 * nothing.
 *
 * This module is the ONE owner of the readiness decision and of the triage
 * summary. BOTH functions call it, so the rule has exactly one definition:
 *   · `health-check`  exposes a readiness result on its own endpoint;
 *   · `daily-digest`  calls the SAME owner and includes the result + the triage
 *     summary in the digest it returns.
 *
 * HONESTY RULES KEPT HERE
 *   · The EVALUATOR is PURE — `evaluateReadiness` makes no network call, reads no
 *     clock and uses no randomness. Every fact it reports is handed IN as a
 *     `ReadinessCheck`, so `scripts/validate-health-digest.mjs` can drive it
 *     exactly instead of hoping.
 *   · A check may be `unknown` — the honest state when a probe cannot be made. An
 *     `unknown` is NEVER dressed up as a pass, and it never silently disappears:
 *     it is counted and NAMED in the triage summary.
 *   · Nothing here invents a value. A `detail` states only what was observed.
 *   · The ONE piece that touches the network is `collectServerChecks`, and it does
 *     so through an INJECTED `fetchImpl` — the module itself contains no bare
 *     `fetch(` and no `Math.random`, which the gate asserts.
 */

export type CheckStatus = 'pass' | 'fail' | 'unknown';

export interface ReadinessCheck {
  /** Stable id, e.g. `supabase_env` · `supabase_api`. */
  id: string;
  status: CheckStatus;
  /** A plain sentence stating what was observed — never a fabricated value. */
  detail: string;
}

export interface ReadinessResult {
  /** Healthy means NO check failed. An `unknown` check is a warning, not a failure. */
  healthy: boolean;
  severity: 'ok' | 'warning' | 'critical';
  checks: ReadinessCheck[];
  /** Deterministic one-line triage: what needs attention, in plain words. */
  triageSummary: string;
}

/** Severity ordering, so a caller can compare two results. */
export const SEVERITY_RANK: Record<ReadinessResult['severity'], number> = {
  ok: 0,
  warning: 1,
  critical: 2,
};

/**
 * The readiness result for one or more checks — deterministic and pure.
 *
 *   · any `fail`     ⇒ unhealthy, `critical`
 *   · else any `unknown` ⇒ healthy, `warning` (honest about what it could not
 *     verify without calling it a fault)
 *   · else           ⇒ healthy, `ok`
 */
export function evaluateReadiness(checks: readonly ReadinessCheck[]): ReadinessResult {
  const failed = checks.filter((c) => c.status === 'fail');
  const unknown = checks.filter((c) => c.status === 'unknown');
  const healthy = failed.length === 0;
  const severity: ReadinessResult['severity'] =
    failed.length > 0 ? 'critical' : unknown.length > 0 ? 'warning' : 'ok';

  let triageSummary: string;
  if (failed.length === 0 && unknown.length === 0) {
    triageSummary = `All ${checks.length} readiness check${checks.length === 1 ? '' : 's'} passed.`;
  } else {
    const parts: string[] = [];
    if (failed.length > 0) {
      parts.push(`${failed.length} failing (${failed.map((c) => c.id).join(', ')})`);
    }
    if (unknown.length > 0) {
      parts.push(`${unknown.length} unverified (${unknown.map((c) => c.id).join(', ')})`);
    }
    triageSummary =
      `${parts.join(' · ')} of ${checks.length} readiness ` +
      `check${checks.length === 1 ? '' : 's'} need attention.`;
  }

  return { healthy, severity, checks: [...checks], triageSummary };
}

/**
 * A check derived from whether every required server-side environment variable is
 * present. Presence is `pass`; absence is `unknown` — a server that is not yet
 * configured cannot be probed, and calling that a FAULT would be dishonest, but
 * calling it a PASS would be worse.
 */
export function envPresenceCheck(
  id: string,
  env: (key: string) => string | undefined,
  names: readonly string[],
  detailWhenPresent: string
): ReadinessCheck {
  const missing = names.filter((n) => (env(n) ?? '').trim().length === 0);
  if (missing.length === 0) {
    return { id, status: 'pass', detail: detailWhenPresent };
  }
  return {
    id,
    status: 'unknown',
    detail: `Not configured — missing ${missing.join(', ')} (a deployment/activation step, not a fault).`,
  };
}

/** The minimal transport contract `collectServerChecks` needs — no real fetch required. */
export type ReadinessFetch = (
  url: string,
  init?: { method?: string; headers?: Record<string, string> }
) => Promise<{ ok: boolean; status: number }>;

/**
 * Gather the server-side checks. The environment reader and the network transport
 * are BOTH injected, so the gate drives this function with fakes and makes ZERO
 * real network calls.
 *
 * With no server-side data source configured this returns two honest `unknown`
 * checks and never pretends to have probed anything.
 */
export async function collectServerChecks(
  env: (key: string) => string | undefined,
  fetchImpl: ReadinessFetch
): Promise<ReadinessCheck[]> {
  const checks: ReadinessCheck[] = [
    envPresenceCheck(
      'supabase_env',
      env,
      ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
      'Server environment configured.'
    ),
  ];

  const url = (env('SUPABASE_URL') ?? '').trim();
  const key = (env('SUPABASE_SERVICE_ROLE_KEY') ?? '').trim();
  if (!url || !key) {
    checks.push({
      id: 'supabase_api',
      status: 'unknown',
      detail: 'Cannot probe — no server-side data source is configured (an activation step, not a fault).',
    });
    return checks;
  }

  try {
    const res = await fetchImpl(`${url}/rest/v1/`, {
      method: 'GET',
      headers: { apikey: key },
    });
    checks.push({
      id: 'supabase_api',
      status: res.ok ? 'pass' : 'fail',
      detail: res.ok
        ? `Data source answered (HTTP ${res.status}).`
        : `Data source returned HTTP ${res.status}.`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown transport error';
    checks.push({ id: 'supabase_api', status: 'fail', detail: `Data source unreachable: ${msg}` });
  }

  return checks;
}
