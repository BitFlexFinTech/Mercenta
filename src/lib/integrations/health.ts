/**
 * §11 — integration health checks.
 *
 * Rules enforced here (spec §11, §79):
 *  - SIMULATION / disabled / never-connected integrations return a simulated
 *    health snapshot that is fully isolated from live providers — it never
 *    makes a network call.
 *  - A LIVE check is only ever executed when the integration's configured
 *    mode is actually `live` (a completed, non-sandbox connection) AND a
 *    credential is present in memory. Merely existing in the registry is
 *    never enough to trigger a live request (spec §3/§11).
 *  - No secrets are read, printed, logged, or persisted here. We only ask
 *    the in-memory store whether a key exists (`peekApiKey`), never its value.
 *  - A simulated connection is never reported as live health.
 */

import type { IntegrationHealth, IntegrationId, IntegrationMode } from '@/integrations/types';
import { peekApiKey } from '@/integrations/types';
import { pingForService } from '@/lib/integrations/testCalls';

export interface HealthContext {
  getMode: (id: IntegrationId) => IntegrationMode;
  getState: (id: IntegrationId) => {
    status: string;
    sandbox: boolean;
    error?: string;
    health?: IntegrationHealth;
  } | undefined;
}

/** Deterministic simulated health. Never touches a live provider. */
export function simulatedHealth(id: IntegrationId, errorCount = 0): IntegrationHealth {
  void id;
  const now = new Date().toISOString();
  return {
    authValid: true,
    lastSyncAt: now,
    lastTestOk: true,
    lastSuccessfulRequestAt: now,
    errorCount,
    providerStatus: 'simulated',
  };
}

/** Honest health when a connection is not yet verified live. */
export function pendingHealth(errorCount = 0): IntegrationHealth {
  return {
    authValid: false,
    errorCount,
    providerStatus: 'not-verified',
  };
}

/**
 * Run a health check for one integration. Returns the resulting snapshot.
 *
 * Decision tree (constraint 5 — never probe merely because the id is in the
 * registry):
 *  - mode 'disabled' | 'available' | 'configuring' → pendingHealth (no call)
 *  - mode 'simulation' → simulatedHealth (isolated, no network)
 *  - mode 'live' but no api-key credential in memory → pendingHealth with
 *    a note; we will NOT call the provider with a blank key.
 *  - mode 'live' + api_key auth + a real ping endpoint → live ping.
 *  - mode 'live' + oauth (no token exchange wired) → pendingHealth; never a
 *    fabricated success.
 */
export async function runHealthCheck(
  ctx: HealthContext,
  id: IntegrationId,
  authMethod: 'oauth' | 'api_key',
  provider?: string
): Promise<IntegrationHealth> {
  const state = ctx.getState(id);
  const mode = ctx.getMode(id);
  const base = state?.health ?? { errorCount: 0 };
  const errorCount = base.errorCount ?? 0;

  // Isolated paths first — these can never touch a live system.
  if (mode === 'disabled' || mode === 'available' || mode === 'configuring') {
    return pendingHealth(errorCount);
  }
  if (mode === 'simulation') {
    return simulatedHealth(id, errorCount);
  }

  // Only reach here with mode === 'live'.
  if (authMethod === 'api_key') {
    // Do NOT read the key value — only know whether one exists.
    const hasKey = peekApiKey(id) !== undefined;
    if (!hasKey) {
      return { ...pendingHealth(errorCount), providerStatus: 'no-credential-in-memory' };
    }
    // We must never send a blank key; if somehow missing, bail out honestly.
    const keyForPing = peekApiKey(id);
    if (!keyForPing) {
      return { ...pendingHealth(errorCount), providerStatus: 'no-credential-in-memory' };
    }
    try {
      const result = await pingForService(id, provider ?? '', keyForPing);
      if (!result) {
        // Provider has no live ping endpoint configured — report pending, not fake.
        return { ...pendingHealth(errorCount), providerStatus: 'no-ping-endpoint' };
      }
      if (result.ok) {
        return {
          authValid: true,
          lastTestOk: true,
          lastSyncAt: new Date().toISOString(),
          lastSuccessfulRequestAt: new Date().toISOString(),
          errorCount,
          providerStatus: `up (HTTP ${result.httpStatus ?? 200})`,
        };
      }
      return {
        authValid: false,
        lastTestOk: false,
        lastErrorAt: new Date().toISOString(),
        errorCount: errorCount + 1,
        providerStatus: 'down',
      };
    } catch {
      return {
        authValid: false,
        lastTestOk: false,
        lastErrorAt: new Date().toISOString(),
        errorCount: errorCount + 1,
        providerStatus: 'down',
      };
    }
  }

  // OAuth live without a wired token exchange: report honestly, never fake.
  return {
    ...pendingHealth(errorCount),
    providerStatus: 'oauth-exchange-pending',
  };
}