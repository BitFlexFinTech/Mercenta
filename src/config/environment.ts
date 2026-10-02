/**
 * §P1 — THE ONE SWITCH.
 *
 * The platform has ONE environment owner: this module. It answers the single
 * question "is the whole platform running in demo, or live?" — and nothing else
 * is allowed to decide that for itself.
 *
 *   · `demo` — seeded data, every external provider SIMULATED, every surface
 *     labelled simulated. Running it requires NO credential at all.
 *   · `live` — real data only. There is NO seed fallback (an empty platform is
 *     the CORRECT live state), and a provider with no configured credentials is
 *     UNAVAILABLE — never silently simulated.
 *
 * The build-time default comes from `VITE_ENVIRONMENT` (anything other than the
 * exact value `live` means `demo`, so the demo host needs no variable). A Super
 * Admin may flip the switch at runtime; that choice is remembered in
 * localStorage and always WINS over the build default.
 *
 * This module is PURE apart from reading the build variable and the browser's
 * localStorage, so its rules can be EXECUTED and proved by
 * `scripts/validate-environment.mjs` — the switch is not merely asserted in
 * prose.
 */
import type { IntegrationMode } from '@/integrations/types';

export type EnvironmentMode = 'demo' | 'live';

export const ENVIRONMENT_STORAGE_KEY = 'mercenta.environment.v1';

/** The build-time default. Only the exact value `live` is live; all else demo. */
function readBuildDefault(): EnvironmentMode {
  const raw = String(
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ENVIRONMENT) ?? ''
  )
    .trim()
    .toLowerCase();
  return raw === 'live' ? 'live' : 'demo';
}

/** A remembered runtime choice, if the operator has flipped the switch before. */
function readRememberedOverride(): EnvironmentMode | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(ENVIRONMENT_STORAGE_KEY);
    return raw === 'live' || raw === 'demo' ? raw : null;
  } catch {
    return null;
  }
}

const BUILD_DEFAULT: EnvironmentMode = readBuildDefault();
let currentMode: EnvironmentMode = readRememberedOverride() ?? BUILD_DEFAULT;

const listeners = new Set<() => void>();

/** The one answer to "which environment are we in?". */
export function environmentMode(): EnvironmentMode {
  return currentMode;
}

export function isDemoEnvironment(): boolean {
  return currentMode === 'demo';
}

export function isLiveEnvironment(): boolean {
  return currentMode === 'live';
}

/** The build-time default, shown when the switch has been overridden at runtime. */
export function buildDefaultEnvironmentMode(): EnvironmentMode {
  return BUILD_DEFAULT;
}

/** True when the operator has flipped the switch away from the build default. */
export function isEnvironmentOverridden(): boolean {
  return currentMode !== BUILD_DEFAULT;
}

/** Subscribe to runtime switch changes (used by the toggle UI only). */
export function subscribeEnvironment(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Flip the switch and remember it. Applies atomically: one assignment. */
export function setEnvironmentMode(mode: EnvironmentMode): void {
  if (mode !== 'demo' && mode !== 'live') return;
  currentMode = mode;
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(ENVIRONMENT_STORAGE_KEY, mode);
  } catch {
    /* private mode — in-memory only */
  }
  for (const l of listeners) l();
}

/** Forget any runtime override and return to the build-time default. */
export function resetEnvironmentMode(): void {
  currentMode = BUILD_DEFAULT;
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(ENVIRONMENT_STORAGE_KEY);
  } catch {
    /* private mode — in-memory only */
  }
  for (const l of listeners) l();
}

/**
 * THE DATA LAYER'S SEED FALLBACK IS DEMO-ONLY.
 *
 * Every repository read that would otherwise fall back to seeded fixtures when
 * the database is unconfigured (or a query FAILS) passes its seed through here.
 * In `demo` the seed is returned; in `live` it returns an EMPTY array — so a
 * live platform can never serve a fake row. This is the ONLY place that decision
 * lives.
 */
export function seedFallback<T>(seed: readonly T[]): T[] {
  return currentMode === 'demo' ? seed.slice() : [];
}

/**
 * THE ENVIRONMENT DECIDES A PROVIDER'S DEFAULT MODE.
 *
 * While a provider is unconfigured (never connected, no sandbox), its mode is
 * its registry default. In `demo` that default stands (usually `simulation` — a
 * fully usable simulated provider). In `live` a default of `simulation` resolves
 * to `available` instead, so an unconfigured provider is UNAVAILABLE and can
 * NEVER be treated as simulation.
 *
 * A provider that has POSITIVELY reported a mode before this call (an explicit
 * operator override, or a completed sandbox connect) never reaches here — this
 * function only maps a REGISTRY DEFAULT, so it cannot weaken the fail-closed
 * `isProviderSimulationSafe` rule.
 */
export function environmentDefaultMode(providerDefault: IntegrationMode): IntegrationMode {
  if (currentMode === 'live' && providerDefault === 'simulation') return 'available';
  return providerDefault;
}
