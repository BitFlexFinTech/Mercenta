/**
 * §Priority-1 — non-React connection registry.
 *
 * The IntegrationsContext (React) persists the connection map to localStorage
 * and mirrors it here so non-React domain code (api.ts factories, scenario
 * engine, carrier seam) can resolve whether a VERIFIED LIVE connection
 * exists for a provider — the single deciding input for the mock-first
 * factories. Nothing here reads, stores, or exposes secret VALUES: only the
 * non-secret connection metadata (status, sandbox flag, secret-ref handle).
 */

import type { IntegrationsMap } from './types';
import type { SpApiCredentials } from '@/lib/spapi/client';
import type { ChCredentials } from '@/lib/compliance/companiesHouseClient';
import type { GoogleCredentials } from '@/lib/google/googleClient';
import { UK_MARKETPLACE_ID } from '@/lib/spapi/transform';

let inMemory: IntegrationsMap | null = null;

/** Mirror the current map (IntegrationsContext calls this after every change). */
export function rememberIntegrations(map: IntegrationsMap): void {
  inMemory = map;
}

/** Read the latest mirror — null before any provider mounts. */
export function loadIntegrationsSync(): IntegrationsMap | null {
  return inMemory;
}

/**
 * Resolve SP-API credentials for the mock-first factory. Today no connect can
 * complete non-sandbox (the Edge Functions are not wired), so this returns
 * null and the mock adapter runs — exactly as required. When a verified,
 * non-sandbox connection with a secret-ref is stored (later, via the same
 * wizard), the factory receives these credentials and runs the LIVE adapter
 * with ZERO domain-workflow changes.
 */
export function spApiConnectionCredentials(): SpApiCredentials | null {
  const map = loadIntegrationsSync();
  if (!map) return null;
  const s = map.amazon_sp_api;
  if (!s) return null;
  if (
    s.status === 'connected' &&
    !s.sandbox &&
    !s.disabled &&
    s.metadata?.secretRef &&
    s.metadata.secretRef.startsWith('vault:')
  ) {
    return {
      secretRef: s.metadata.secretRef,
      marketplaceId: s.metadata.marketplaceId ?? UK_MARKETPLACE_ID,
      verified: true,
    };
  }
  return null;
}

/**
 * §22–§25 (M13 Phase 9) — resolve Companies House credentials for the mock-first
 * factory, exactly like `spApiConnectionCredentials`. Only a VERIFIED,
 * non-sandbox connection holding a `vault:` secret reference yields credentials;
 * anything else (including a `mock:` ref or no connection at all) returns null so
 * the deterministic mock client runs. Swapping simulation → live is
 * credentials-only: no domain workflow changes.
 */
export function companiesHouseConnectionCredentials(): ChCredentials | null {
  const map = loadIntegrationsSync();
  const s = map?.companies_house;
  if (!s) return null;
  if (
    s.status === 'connected' &&
    !s.sandbox &&
    !s.disabled &&
    s.metadata?.secretRef &&
    s.metadata.secretRef.startsWith('vault:')
  ) {
    return { secretRef: s.metadata.secretRef, verified: true };
  }
  return null;
}

/**
 * §21 (M13 Phase 8) — resolve Google credentials for the mock-first factory.
 * Same rule as the other providers: only a VERIFIED, non-sandbox connection with
 * a `vault:` secret reference yields credentials, so a `mock:` ref or an
 * unexchanged OAuth code can never reach a live Google API call.
 */
export function googleConnectionCredentials(): GoogleCredentials | null {
  const map = loadIntegrationsSync();
  const s = map?.google;
  if (!s) return null;
  if (
    s.status === 'connected' &&
    !s.sandbox &&
    !s.disabled &&
    s.metadata?.secretRef &&
    s.metadata.secretRef.startsWith('vault:')
  ) {
    return { secretRef: s.metadata.secretRef, verified: true };
  }
  return null;
}
