/**
 * §PHASE B (2026-10-13) — REAL BROWSER AUTHENTICATION.
 *
 * WHY THIS EXISTS
 * ---------------
 * The second audit found the platform's ONLY real security gap on the identity
 * side: the server was already correct — `payouts-transfer` verifies the bearer
 * token against Supabase's own `/auth/v1/user` endpoint and then reads
 * `app_metadata.role` + `app_metadata.tenant_id`
 * (`supabase/functions/payouts-transfer/index.ts:188–200`), and RLS expects the
 * same claim (`002_create_brands.sql:18`:
 * `USING (id = (auth.jwt() ->> 'tenant_id')::uuid)`) — but the BROWSER never
 * obtained such a token. `signIn(env, role)` minted a session from a role picker,
 * so every RLS policy was correct and unexercised.
 *
 * This module is the missing half. It does NOT replace the demo session: the
 * `DemoSession` shape (`src/lib/auth/rbac.ts`) is deliberately REUSED, so no
 * shell, view, allowlist or nav filter changes.
 *
 * THE CLAIM CONTRACT (one definition, consumed by both sides)
 * ----------------------------------------------------------
 *   app_metadata.role       'super_admin' | 'admin_staff' | 'brand'
 *   app_metadata.tenant_id  the brand's uuid — REQUIRED for a brand session
 *
 * The server's own vocabulary is the authority (`OPERATOR_ROLES` in
 * `supabase/functions/_shared/operatorAuth.ts:18`, `APPROVER_ROLES` in
 * `payouts-transfer/index.ts:53` — both `['super_admin', 'admin_staff']`). This
 * module maps THAT vocabulary onto the frontend `SessionRole`, in one place, so
 * the two can never drift.
 *
 * PURE vs IMPURE: `mapClaimsToSession` is PURE (no network, no clock, no
 * randomness) so `scripts/validate-real-auth.mjs` can drive it exactly.
 */
import type { SessionRole } from '@/types';
import { tierForRole, type DemoSession } from '@/lib/auth/rbac';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { isLiveEnvironment } from '@/config/environment';

/** The server's role vocabulary — the authority, not a parallel invention. */
export type PlatformClaimRole = 'super_admin' | 'admin_staff' | 'brand';

export interface PlatformClaims {
  role: PlatformClaimRole;
  tenantId: string | null;
}

/** The role a claim maps to on the frontend. Unknown → the LEAST privilege. */
export function roleForClaim(claimRole: string | null | undefined): SessionRole {
  switch (String(claimRole ?? '').trim().toLowerCase()) {
    case 'super_admin':
      return 'Super Admin';
    case 'admin_staff':
      return 'Mercenta Admin';
    default:
      /* Fail closed: an unrecognised claim is a BRAND, never staff. */
      return 'Brand Partner';
  }
}

/**
 * Turn verified claims into the session the rest of the app already understands.
 *
 * Fail-closed rules (each one proved by `scripts/validate-real-auth.mjs`):
 *   · an unknown role becomes `Brand Partner` — never staff;
 *   · a BRAND session with NO `tenant_id` is REFUSED (null) — a brand with no
 *     tenant cannot be scoped, so it must not be admitted;
 *   · staff sessions carry NO `tenantId`, so a staff account can never be
 *     mistaken for a brand tenant.
 */
export function mapClaimsToSession(claims: PlatformClaims): DemoSession | null {
  const role = roleForClaim(claims.role);
  const tier = tierForRole(role);

  if (tier === 'brand') {
    const tenantId = (claims.tenantId ?? '').trim();
    if (!tenantId) return null;
    return { tier, role, tenantId };
  }

  return { tier, role };
}

/** Read the claims off a Supabase user object. Never trusts anything else. */
export function claimsFromUser(user: {
  app_metadata?: Record<string, unknown>;
} | null): PlatformClaims {
  const meta = user?.app_metadata ?? {};
  const rawTenant = meta.tenant_id;
  return {
    role: String(meta.role ?? '').trim().toLowerCase() as PlatformClaimRole,
    tenantId: typeof rawTenant === 'string' && rawTenant.trim() ? rawTenant.trim() : null,
  };
}

/**
 * Is REAL authentication the required path right now?
 *
 * Only when BOTH hold: a Supabase project is configured, AND the platform is in
 * `live` mode. In `demo` the demo sign-in stays exactly as it was — the platform
 * must remain fully usable with no credential and no Supabase project.
 */
export function isRealAuthAvailable(): boolean {
  return isSupabaseConfigured && isLiveEnvironment();
}

export interface CredentialSignInResult {
  ok: boolean;
  /** A plain sentence safe to show the operator — never a raw provider error. */
  error?: string;
  session?: DemoSession;
}

/**
 * Sign in with email + password and resolve the platform session.
 *
 * Deliberately reports the SAME message for a wrong password and an unknown
 * address, so the form cannot be used to discover which accounts exist.
 */
export async function signInWithCredentials(
  email: string,
  password: string
): Promise<CredentialSignInResult> {
  if (!supabase) {
    return { ok: false, error: 'This platform is not configured for sign-in yet.' };
  }
  const address = email.trim();
  if (!address || !password) {
    return { ok: false, error: 'Enter your email address and password.' };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: address,
    password,
  });

  if (error || !data.user) {
    return { ok: false, error: 'Those sign-in details were not recognised.' };
  }

  const session = mapClaimsToSession(claimsFromUser(data.user));
  if (!session) {
    /* Authenticated, but not ADMISSIBLE — a brand with no tenant. Sign back out
       so a half-built session is never left behind. */
    await supabase.auth.signOut();
    return {
      ok: false,
      error:
        'This account is not linked to a brand yet. Ask Mercenta to finish setting it up.',
    };
  }
  return { ok: true, session };
}

/** The session behind an already-established Supabase session, or null. */
export async function loadPlatformSession(): Promise<DemoSession | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return null;
  return mapClaimsToSession(claimsFromUser(user));
}

export function signOutReal(): void {
  void supabase?.auth.signOut().catch(() => {
    /* Signing out locally must never be blocked by a network failure. */
  });
}
