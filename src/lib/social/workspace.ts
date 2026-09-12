/**
 * §Phase E7 — MERCENTA SOCIAL DOMAIN: identity, entitlement and workspace.
 *
 * This module is the ONLY place Mercenta decides, for a given Mercenta brand
 * tenant, which Mercenta Social workspace that brand owns and whether the brand
 * may use Mercenta Social at all.
 *
 * Design rules (each asserted by scripts/validate-e7-embedded-social.mjs):
 *
 * - DETERMINISTIC: the workspace id is derived from the canonical Mercenta
 *   tenant id by a stable hash. The same tenant always resolves to the same
 *   workspace, in any session, in any order. Refreshing, re-logging-in or
 *   renewing a session therefore CANNOT produce a second workspace — there is no
 *   random component to drift.
 * - IDEMPOTENT: `provisionSocialWorkspace` reuses the existing record for the
 *   tenant and only counts the invocation. It never creates a duplicate and
 *   never overwrites the original provisioning provenance.
 * - FAIL-CLOSED: an empty/absent tenant or an unrecognised lifecycle status
 *   yields DENIED. Only the positively approved/active states grant access.
 * - TENANT-SCOPED: every read is scoped to a tenant. `readWorkspaceForTenant`
 *   refuses a cross-tenant read in the DOMAIN (not merely in the UI), so Brand A
 *   can never reach Brand B's workspace, posts, media or settings.
 * - TRUTHFUL: the engine link is reported as NOT established
 *   (`engineLinked: false`, `simulated: true`) because the deployed engine's API
 *   is currently down (502 — Temporal missing) and no server-side provisioning
 *   call exists yet. Mercenta never reports a live engine relationship it has
 *   not actually created.
 * - PERSISTENCE IS HONEST: the store is in-memory and reports `durable: false`,
 *   consistent with the platform's memory adapter default. E7 added no migration
 *   and no database.
 */
import { SOCIAL_ENGINE_VERIFIED } from '@/config/mercentaSocial';

/* ── Deterministic workspace identity ──────────────────────────────────── */

/**
 * FNV-1a 32-bit hash, hex-encoded. Stable across processes, sessions and
 * reloads — there is no `Date.now()` and no `Math.random()` in this module.
 */
export function stableHash(value: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * The canonical Mercenta Social workspace id for a Mercenta tenant.
 * PURE and total: the same tenant always yields the same id.
 */
export function socialWorkspaceIdForTenant(tenantId: string): string {
  const tenant = String(tenantId ?? '').trim();
  if (!tenant) return '';
  return `msoc-${stableHash(tenant)}`;
}

/* ── Records ───────────────────────────────────────────────────────────── */

export interface SocialWorkspaceRecord {
  /** Deterministic id — the Mercenta Social workspace identity. */
  workspaceId: string;
  /** The authoritative Mercenta tenant that owns this workspace. */
  tenantId: string;
  brandName: string;
  firstProvisionedAt: string;
  lastProvisionedAt: string;
  provisionedBy: string;
  /** How many times provisioning was invoked — idempotency is observable. */
  provisionInvocationCount: number;
  /** The engine-side organization id, once a real link exists. */
  engineOrganizationId: string | null;
  /** The brand's deterministic engine identity (email), once known. */
  engineEmail: string | null;
  /** True ONLY when the engine link was actually established. */
  engineLinked: boolean;
  /** True while the workspace exists only in Mercenta's own domain state. */
  simulated: boolean;
  /** The real engine version once a link is established. */
  engineVersion: string | null;
}

/** The store. In-memory by design; `durable` is reported, never assumed. */
const workspaces = new Map<string, SocialWorkspaceRecord>();

export interface SocialWorkspaceActor {
  /** The Mercenta actor performing provisioning. */
  actorId: string;
  /** Optional tenant pin — a pinned actor may act only on its own tenant. */
  tenantId?: string;
}

export type SocialResult<T> = { ok: true; value: T } | { ok: false; error: string };

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * AUTOMATIC PROVISIONING — idempotent by tenant.
 *
 * Driven by the Mercenta brand lifecycle when a brand becomes approved/active.
 * The first call CREATES the workspace; every later call (refresh, re-login,
 * session renewal, repeated activation) REUSES it and only increments the
 * invocation counter. A cross-tenant attempt by a pinned actor is refused.
 */
export function provisionSocialWorkspace(
  tenantId: string,
  actor: SocialWorkspaceActor,
  brandName?: string
): SocialResult<SocialWorkspaceRecord> {
  const tenant = String(tenantId ?? '').trim();
  if (!tenant) {
    return {
      ok: false,
      error: 'INVALID — a Mercenta tenant is required to provision Mercenta Social.',
    };
  }
  if (actor.tenantId && actor.tenantId !== tenant) {
    return { ok: false, error: 'CROSS_TENANT — that tenant does not belong to the acting account.' };
  }

  const existing = workspaces.get(tenant);
  if (existing) {
    existing.lastProvisionedAt = nowIso();
    existing.provisionInvocationCount += 1;
    if (brandName) existing.brandName = brandName;
    return { ok: true, value: { ...existing } };
  }

  const now = nowIso();
  const record: SocialWorkspaceRecord = {
    workspaceId: socialWorkspaceIdForTenant(tenant),
    tenantId: tenant,
    brandName: brandName ?? tenant,
    firstProvisionedAt: now,
    lastProvisionedAt: now,
    provisionedBy: actor.actorId,
    provisionInvocationCount: 1,
    // No engine link exists yet: the deployed engine API is down (502, Temporal
    // missing) and the server-side provisioning call is not implemented. This is
    // reported truthfully rather than simulated as a success.
    engineOrganizationId: null,
    engineEmail: null,
    engineLinked: false,
    simulated: true,
    engineVersion: null,
  };
  workspaces.set(tenant, record);
  return { ok: true, value: { ...record } };
}

/** Read ONE workspace by its owning tenant. Never lists across tenants. */
export function getSocialWorkspace(tenantId: string): SocialWorkspaceRecord | undefined {
  const tenant = String(tenantId ?? '').trim();
  if (!tenant) return undefined;
  const found = workspaces.get(tenant);
  return found ? { ...found } : undefined;
}

/**
 * TENANT ISOLATION, ENFORCED IN THE DOMAIN: a requester may read only the
 * workspace of its own tenant. A cross-tenant read is refused, not filtered.
 */
export function readWorkspaceForTenant(
  requesterTenantId: string,
  targetTenantId: string
): SocialResult<SocialWorkspaceRecord> {
  const requester = String(requesterTenantId ?? '').trim();
  const target = String(targetTenantId ?? '').trim();
  if (!requester) return { ok: false, error: 'FORBIDDEN — no tenant on the acting session.' };
  if (requester !== target) {
    return {
      ok: false,
      error: 'CROSS_TENANT — that Mercenta Social workspace belongs to another tenant.',
    };
  }
  const record = workspaces.get(target);
  if (!record) {
    return { ok: false, error: 'NOT_FOUND — no Mercenta Social workspace for this tenant.' };
  }
  return { ok: true, value: { ...record } };
}

/** Admin/operations read model. Brand surfaces must never call this. */
export function listSocialWorkspaces(): SocialWorkspaceRecord[] {
  return [...workspaces.values()].map((r) => ({ ...r }));
}

export function countSocialWorkspaces(): number {
  return workspaces.size;
}

/** Honest persistence status for the social domain (memory adapter). */
export function getSocialPersistenceStatus(): { backend: 'memory'; durable: false; note: string } {
  return {
    backend: 'memory',
    durable: false,
    note: 'Workspace identity is derived deterministically from the Mercenta tenant; records are in-memory and are not claimed to be durable.',
  };
}

/** The real engine version the domain would link to, once linking is possible. */
export function socialEngineVersion(): string {
  return SOCIAL_ENGINE_VERIFIED.version;
}

/**
 * §Phase E8 — RECORD THE ENGINE LINK for a provisioned workspace.
 *
 * The values come from the server-side bridge (the `social-session` edge
 * function, which resolves them from the engine). Mercenta never invents an
 * engine organization id here: an empty organization id leaves the workspace
 * unlinked and reported as such.
 *
 * Idempotent: the same engine organization reported repeatedly is a no-op that
 * only bumps the observed call count, so a refresh or a re-login cannot produce
 * a second link or a second workspace.
 */
export function linkSocialWorkspaceToEngine(
  tenantId: string,
  link: { email: string; organizationId: string; engineVersion?: string }
): SocialResult<SocialWorkspaceRecord> {
  const tenant = String(tenantId ?? '').trim();
  const existing = workspaces.get(tenant);
  if (!existing) {
    return { ok: false, error: 'NOT_FOUND — provision the Mercenta Social workspace before linking an engine organization.' };
  }
  existing.lastProvisionedAt = nowIso();
  existing.provisionInvocationCount += 1;
  if (link.email) existing.engineEmail = link.email;
  if (link.organizationId) {
    existing.engineOrganizationId = link.organizationId;
    existing.engineLinked = true;
    existing.simulated = false;
    existing.engineVersion = link.engineVersion ?? SOCIAL_ENGINE_VERIFIED.version;
  }
  return { ok: true, value: { ...existing } };
}

/** Verification/test-only reset. Production code paths never call this. */
export function resetSocialWorkspaces(): void {
  workspaces.clear();
}

/* ── Access gate — Mercenta remains authoritative for entitlement ──────── */

/**
 * The Mercenta brand lifecycle states Mercenta Social understands.
 *
 * `suspended`, `deactivated` and `terminated` are modelled here so that access
 * is ALREADY fail-closed the moment the Mercenta brand lifecycle gains them —
 * no new brand status enum was invented for E7, and no existing one was
 * redefined.
 */
export type SocialBrandLifecycleStatus =
  | 'approved'
  | 'active'
  | 'pending'
  | 'in_review'
  | 'rejected'
  | 'suspended'
  | 'deactivated'
  | 'terminated'
  | 'unknown';

const KNOWN_STATUSES: readonly string[] = [
  'approved',
  'active',
  'pending',
  'in_review',
  'rejected',
  'suspended',
  'deactivated',
  'terminated',
];

/** The ONLY states that grant Mercenta Social access. */
const ALLOWED_STATUSES: readonly string[] = ['approved', 'active'];

export interface SocialAccessDecision {
  allowed: boolean;
  status: SocialBrandLifecycleStatus;
  reason: string;
}

/**
 * May this Mercenta brand use Mercenta Social?
 *
 * FAIL-CLOSED: only a positively established approved/active brand with a
 * tenant and completed onboarding is allowed. Missing tenant, missing/unusable
 * status, an unapproved status, or a suspended/deactivated/terminated status all
 * DENY. Access is DERIVED on every call and never stored, so revoking a brand
 * revokes Mercenta Social immediately and cannot drift out of sync.
 */
export function socialAccessForBrand(input: {
  tenantId?: string | null;
  brandStatus?: string | null;
  onboarded?: boolean;
}): SocialAccessDecision {
  const tenant = String(input.tenantId ?? '').trim();
  if (!tenant) {
    return {
      allowed: false,
      status: 'unknown',
      reason: 'DENIED — no Mercenta tenant on the session, so no Mercenta Social workspace can be resolved.',
    };
  }

  const raw = String(input.brandStatus ?? '').trim().toLowerCase();
  const status: SocialBrandLifecycleStatus = (KNOWN_STATUSES.includes(raw)
    ? raw
    : 'unknown') as SocialBrandLifecycleStatus;

  if (!ALLOWED_STATUSES.includes(status)) {
    const reasons: Record<string, string> = {
      pending: 'DENIED — this brand has not yet been approved by Mercenta.',
      in_review: 'DENIED — this brand is still under review by Mercenta.',
      rejected: 'DENIED — this brand was not approved.',
      suspended: 'DENIED — access is suspended. Existing content is preserved.',
      deactivated: 'DENIED — this brand is deactivated. Existing content is preserved.',
      terminated: 'DENIED — this partnership has ended.',
      unknown:
        'DENIED — the brand status could not be established, so access is refused (fail-closed).',
    };
    return { allowed: false, status, reason: reasons[status] ?? reasons.unknown };
  }

  if (input.onboarded === false) {
    return {
      allowed: false,
      status,
      reason: 'DENIED — brand onboarding is not yet complete.',
    };
  }

  return {
    allowed: true,
    status,
    reason: 'Approved Mercenta brand — Mercenta Social is included in this partnership.',
  };
}

/**
 * The AUTOMATIC PROVISIONING entry point used by the brand lifecycle.
 *
 * Access first (fail-closed), then idempotent provisioning. An unapproved brand
 * is refused before any workspace is created, and a repeated call for an
 * approved brand can only ever reuse the single existing workspace.
 */
export function ensureSocialWorkspaceForBrand(
  input: {
    tenantId?: string | null;
    brandStatus?: string | null;
    onboarded?: boolean;
    brandName?: string;
  },
  actor: SocialWorkspaceActor
): SocialResult<SocialWorkspaceRecord> {
  const decision = socialAccessForBrand(input);
  if (!decision.allowed) {
    return { ok: false, error: decision.reason };
  }
  return provisionSocialWorkspace(
    String(input.tenantId ?? '').trim(),
    { ...actor, tenantId: actor.tenantId ?? String(input.tenantId ?? '').trim() },
    input.brandName
  );
}
