/**
 * §PHASE 15 — THE HONEST HEALTH / READINESS OWNER (2026-10-05).
 *
 * The admin monitoring dashboard MUST NOT fabricate health. Before this owner it
 * did: a "health check" was `Math.random() > 0.2`, and the result line INVENTED a
 * database / Edge-Function response time ("Database: ok … Response: 240ms"). That
 * is simulated data presented as a real probe — a lie.
 *
 * This owner computes a DETERMINISTIC readiness from signals the CLIENT actually
 * holds — the environment switch and the integration modes (each derived by the
 * canonical `modeForState`) — and it states plainly what it CANNOT see: a browser
 * cannot probe the database or the Edge Functions, so it never claims to.
 *
 * Pure and deterministic: same inputs ⇒ same result; no network, no clock, no
 * randomness. Proved by `scripts/validate-health-readiness.mjs`.
 */
import type { EnvironmentMode } from '@/config/environment';
import type { IntegrationMode } from '@/integrations/types';

export interface ProviderHealth {
  id: string;
  mode: IntegrationMode;
}

export interface HealthResult {
  healthy: boolean;
  severity: 'critical' | 'high' | 'info';
  summary: string;
}

/** The two modes that mean an integration genuinely needs attention. */
const ATTENTION: ReadonlySet<IntegrationMode> = new Set<IntegrationMode>(['error', 'degraded']);

/**
 * Compute an HONEST client-readiness result. A `degraded`/`error` integration mode
 * is the ONLY thing that makes it unhealthy, and the summary NAMES the providers.
 * With no such provider the result is healthy and says so — it never claims the
 * database or the Edge Functions were probed.
 */
export function computeReadiness(
  environment: EnvironmentMode,
  providers: readonly ProviderHealth[]
): HealthResult {
  const attention = providers.filter((p) => ATTENTION.has(p.mode));
  if (attention.length > 0) {
    const errored = attention.filter((p) => p.mode === 'error').length;
    const degraded = attention.filter((p) => p.mode === 'degraded').length;
    return {
      healthy: false,
      severity: errored > 0 ? 'critical' : 'high',
      summary:
        `Client readiness: ${attention.length} integration${attention.length === 1 ? '' : 's'} need attention ` +
        `(${errored} error, ${degraded} degraded) — ${attention.map((p) => p.id).join(', ')}. ` +
        `Environment: ${environment}.`,
    };
  }
  return {
    healthy: true,
    severity: 'info',
    summary:
      `Client readiness OK. Environment: ${environment}. ${providers.length} integration` +
      `${providers.length === 1 ? '' : 's'} registered, none needing attention. ` +
      `(Browser-side check — the database and Edge Functions are not probed from here.)`,
  };
}
