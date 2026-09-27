/**
 * §BATCH1a — OPERATOR AUTHORISATION for the integration proxies.
 *
 * WHY: these functions can read the retail channel with Mercenta's own
 * credentials. A BRAND must never be able to trigger a live channel read, so a
 * LIVE call requires an operator role — the same rule `payouts-transfer` applies
 * to brand money.
 *
 * HOW THE CLAIM IS TRUSTED: the role is read from the JWT payload, which is only
 * safe because Supabase's gateway VERIFIES the token signature before the
 * function runs. These functions must be deployed with JWT verification ON
 * (`supabase functions deploy <name>` — never `--no-verify-jwt`). This is
 * recorded as a deployment requirement in PRODUCTION_READINESS.md.
 *
 * SIMULATION needs no role: it performs no provider call and reads no tenant
 * data, which is what keeps the whole platform demoable without credentials.
 */
export const OPERATOR_ROLES: readonly string[] = ['super_admin', 'admin_staff'];

export interface VerifiedOperator {
  actorId: string;
  role: string;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), '='));
    const parsed = JSON.parse(json) as Record<string, unknown>;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/** The operator behind a verified Authorization header, or null. */
export function operatorFromAuthorization(
  authorization: string | null | undefined
): VerifiedOperator | null {
  const header = (authorization ?? '').trim();
  if (!header.toLowerCase().startsWith('bearer ')) return null;
  const payload = decodeJwtPayload(header.slice(7).trim());
  if (!payload) return null;
  const role = String(payload.role ?? payload.app_role ?? '');
  const actorId = String(payload.sub ?? '');
  if (!OPERATOR_ROLES.includes(role)) return null;
  return { actorId, role };
}
