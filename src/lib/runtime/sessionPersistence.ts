/**
 * §RUNTIME PARITY (R2) — DEMO SESSION PERSISTENCE (tab-scoped, re-validated).
 *
 * WHY THIS EXISTS
 * ---------------
 * `environment`, `role` and `session` were plain `useState`, so pressing F5 in
 * the Admin Hub silently signed the user out and returned them to the public
 * marketing homepage with no message. Nothing about the session survived a
 * refresh, which is why the product appeared to "vanish".
 *
 * DESIGN DECISIONS (deliberate, and they are the whole point of this module)
 * -------------------------------------------------------------------------
 *   - `sessionStorage`, NOT `localStorage`: a demo session must die with the
 *     tab. `localStorage` would leave one person's demo session alive for the
 *     next person on the same machine — a tenant-isolation hazard in a
 *     multi-tenant product.
 *   - The stored value is re-validated on restore through the SAME
 *     `canAccessEnvironment` allowlist `signIn` uses. A tampered, stale or
 *     hand-edited value is REJECTED, never trusted.
 *   - The stored tier must agree with the role's own tier (`tierForRole`) and
 *     the environment must be one the tier may enter; otherwise nothing is
 *     restored.
 *   - A tenant id is only ever accepted for a brand-tier session.
 *   - Fail-closed: any malformed value (bad JSON, wrong shape, unknown role)
 *     returns `null` — never a partial or defaulted session.
 *
 * This module creates NO session of its own. It only remembers one that the
 * canonical `signIn` / activation paths already created.
 */
import type { Environment, SessionRole } from '@/types';
import { canAccessEnvironment, tierForRole, type DemoSession, type SessionTier } from '@/lib/auth/rbac';

const KEY = 'mercenta.session.v1';

export interface PersistedSession {
  environment: Environment;
  tier: SessionTier;
  role: SessionRole;
  /** Brand sessions only — never persisted for any other tier. */
  tenantId?: string;
}

const TIERS: readonly SessionTier[] = ['brand', 'admin_staff', 'super_admin', '3pl'];
const ROLES: readonly SessionRole[] = ['Brand Partner', 'Mercenta Admin', 'Super Admin', '3PL Carrier'];
const ENVIRONMENTS: readonly Environment[] = ['home', 'login', 'brand', 'admin', 'carrier'];

function isPersistedSession(value: unknown): value is PersistedSession {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.environment === 'string' &&
    ENVIRONMENTS.includes(v.environment as Environment) &&
    typeof v.tier === 'string' &&
    TIERS.includes(v.tier as SessionTier) &&
    typeof v.role === 'string' &&
    ROLES.includes(v.role as SessionRole) &&
    (v.tenantId === undefined || typeof v.tenantId === 'string')
  );
}

/**
 * Read the persisted session, RE-VALIDATED. Returns `null` for anything that
 * does not survive the canonical RBAC allowlist.
 */
export function readPersistedSession(): PersistedSession | null {
  if (typeof window === 'undefined') return null;
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isPersistedSession(parsed)) return null;

  // Re-validate against the canonical RBAC model — never trust the storage.
  if (tierForRole(parsed.role) !== parsed.tier) return null;
  if (!canAccessEnvironment(parsed.tier, parsed.environment)) return null;
  if (parsed.tier !== 'brand' && parsed.tenantId) return null;
  if (parsed.environment === 'home' || parsed.environment === 'login') return null;

  return parsed.tenantId ? parsed : { ...parsed, tenantId: undefined };
}

/** Remember a session (no-op outside the browser). */
export function writePersistedSession(session: PersistedSession | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!session) {
      window.sessionStorage.removeItem(KEY);
      return;
    }
    window.sessionStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    /* storage disabled — the session simply does not persist */
  }
}

/** Forget the session entirely (sign-out). */
export function clearPersistedSession(): void {
  writePersistedSession(null);
}

/** Build the persisted shape from the app's own session state. */
export function toPersistedSession(
  environment: Environment,
  session: DemoSession | null,
  role: SessionRole | null
): PersistedSession | null {
  if (!session || !role) return null;
  return {
    environment,
    tier: session.tier,
    role,
    ...(session.tier === 'brand' && session.tenantId ? { tenantId: session.tenantId } : {}),
  };
}