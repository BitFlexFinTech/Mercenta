/**
 * §PHASE 3 / ITEM 2 — SERVER-SIDE ASIN TENANT SCOPE + ACCESS AUDIT.
 *
 * THE HOLE THIS CLOSES
 * --------------------
 * `supabase/functions/spapi/index.ts` proved only that the caller is an operator. It
 * never proved that an ASIN in the payload belongs to the brand session making the
 * call, and it recorded nothing. So a route accepting an ASIN could touch another
 * brand's listing with Mercenta's credentials, with no log of it existing.
 *
 * THE RULE, AS IMPLEMENTED
 *   · every ASIN in a request payload is checked against `brand_asin_scope`;
 *   · an ASIN with NO row for that brand is REFUSED with 403 — never filtered out, so a
 *     caller cannot mistake a partial result for the whole truth;
 *   · an ASIN in a session with NO brand tenant is also REFUSED 403: an operator
 *     session is not a licence to touch an arbitrary ASIN (fail-closed);
 *   · every live ASIN access writes one `spapi_access_audit` row;
 *   · if that row CANNOT be written, the call is REFUSED (503) rather than performed
 *     unlogged — an unlogged access is the defect the DPP forbids.
 *
 * Amazon's Data Protection Policy calls for exactly this pair: tenant isolation plus an
 * access record. `docs/AMAZON_COMPLIANCE.md` states the same in submission language.
 */

/** Retention window in days. `030_spapi_audit_retention.sql` MUST agree (a gate checks). */
export const SPAPI_AUDIT_RETENTION_DAYS = 90;

export type AuditResult = 'granted' | 'refused' | 'error';

export interface CallerIdentity {
  /** `tenant_id` claim — the BRAND's id. Null for a staff session. */
  brandId: string | null;
  /** Email or sub claim, so an audit row is never anonymous. */
  actor: string;
}

/** A refusal carrying the HTTP status the function must return. */
export class TenantScopeRefusal extends Error {
  constructor(
    readonly code: 'TENANT_ASSERTION_REQUIRED' | 'ASIN_NOT_IN_BRAND_SCOPE' | 'TENANT_AUDIT_UNAVAILABLE',
    readonly status: 403 | 503,
    message: string
  ) {
    super(`${code} — ${message}`);
    this.name = 'TenantScopeRefusal';
  }
}

function supabaseEnv(): { url: string; key: string } | null {
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  return url && key ? { url, key } : null;
}

/** Decode a JWT payload without verifying it — verification is the platform's job. */
function jwtPayload(token: string): Record<string, unknown> | null {
  const part = token.split('.')[1];
  if (!part) return null;
  try {
    const padded = part.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * The caller's identity. `tenant_id` may sit at the top level or under `app_metadata` —
 * different migrations in this repo read different shapes, so both are accepted rather
 * than assuming one.
 */
export function callerFromAuthorization(header: string | null): CallerIdentity | null {
  if (!header) return null;
  const token = header.replace(/^bearer\s+/i, '').trim();
  if (!token) return null;
  const payload = jwtPayload(token);
  if (!payload) return null;
  const meta = (payload.app_metadata ?? {}) as Record<string, unknown>;
  const rawBrand = payload.tenant_id ?? meta.tenant_id ?? null;
  const brandId = typeof rawBrand === 'string' && rawBrand.trim() ? rawBrand.trim() : null;
  const actor =
    (typeof payload.email === 'string' && payload.email) ||
    (typeof payload.sub === 'string' && payload.sub) ||
    'unknown-actor';
  return { brandId, actor };
}

const ASIN_KEY = /^(asin|amazonProductIdentifier)$/i;
const ASIN_VALUE = /^[A-Z0-9]{10}$/;

/**
 * Every ASIN present in a payload, at any depth. Route patterns here carry no `{asin}`
 * segment — ASINs travel INSIDE item payloads (`amazonProductIdentifier`), so a
 * path-based check would find none.
 */
export function asinsInPayload(input: unknown): string[] {
  const found = new Set<string>();
  const walk = (value: unknown, key: string): void => {
    if (typeof value === 'string') {
      if (ASIN_KEY.test(key)) {
        const v = value.trim().toUpperCase();
        if (ASIN_VALUE.test(v)) found.add(v);
      }
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) walk(item, key);
      return;
    }
    if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) walk(v, k);
    }
  };
  walk(input, '');
  return [...found];
}

/** ASINs that arrived as query parameters (GET reads). */
export function asinsInQuery(query: Record<string, string> | undefined): string[] {
  if (!query) return [];
  return Object.entries(query)
    .filter(([k]) => ASIN_KEY.test(k))
    .map(([, v]) => v.trim().toUpperCase())
    .filter((v) => ASIN_VALUE.test(v));
}

async function scopeRows(brandId: string, asin: string): Promise<number> {
  const env = supabaseEnv();
  if (!env) {
    // No server credentials means the assertion CANNOT be performed — refuse rather
    // than let an unchecked call through.
    throw new TenantScopeRefusal(
      'TENANT_ASSERTION_REQUIRED',
      403,
      'the server cannot verify ASIN ownership (no Supabase server credentials configured).'
    );
  }
  const url =
    `${env.url}/rest/v1/brand_asin_scope?select=asin` +
    `&brand_id=eq.${encodeURIComponent(brandId)}&asin=eq.${encodeURIComponent(asin)}`;
  const res = await fetch(url, {
    headers: { apikey: env.key, Authorization: `Bearer ${env.key}`, Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new TenantScopeRefusal(
      'TENANT_ASSERTION_REQUIRED',
      403,
      `the ownership lookup failed (HTTP ${res.status}), so ownership is unproven.`
    );
  }
  const rows = (await res.json()) as unknown[];
  return Array.isArray(rows) ? rows.length : 0;
}

/** THE ASSERTION — one ASIN must belong to the brand. Refuses with 403, never filters. */
export async function assertAsinBelongsToBrand(
  jwtBrandId: string | null,
  asin: string
): Promise<void> {
  if (!jwtBrandId) {
    throw new TenantScopeRefusal(
      'TENANT_ASSERTION_REQUIRED',
      403,
      `ASIN ${asin} cannot be attributed to a brand: the session carries no brand tenant.`
    );
  }
  if ((await scopeRows(jwtBrandId, asin)) === 0) {
    throw new TenantScopeRefusal(
      'ASIN_NOT_IN_BRAND_SCOPE',
      403,
      `ASIN ${asin} is not in brand_asin_scope for the session's brand.`
    );
  }
}

/** Every ASIN in the request, asserted in turn. Stops at the first refusal. */
export async function assertAsinsBelongToBrand(
  jwtBrandId: string | null,
  asins: readonly string[]
): Promise<void> {
  for (const asin of asins) await assertAsinBelongsToBrand(jwtBrandId, asin);
}

/** One append-only audit row. Throws when not written — callers must fail closed. */
export async function writeSpapiAudit(entry: {
  actor: string;
  brandId: string | null;
  asin: string;
  route: string;
  result: AuditResult;
}): Promise<void> {
  const env = supabaseEnv();
  if (!env) {
    throw new TenantScopeRefusal(
      'TENANT_AUDIT_UNAVAILABLE',
      503,
      'the access log cannot be written (no Supabase server credentials configured).'
    );
  }
  const res = await fetch(`${env.url}/rest/v1/spapi_access_audit`, {
    method: 'POST',
    headers: {
      apikey: env.key,
      Authorization: `Bearer ${env.key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      actor: entry.actor,
      brand_id: entry.brandId,
      asin: entry.asin,
      route: entry.route,
      result: entry.result,
    }),
  });
  if (!res.ok) {
    throw new TenantScopeRefusal(
      'TENANT_AUDIT_UNAVAILABLE',
      503,
      `the access log write failed (HTTP ${res.status}); the call was not performed unlogged.`
    );
  }
}