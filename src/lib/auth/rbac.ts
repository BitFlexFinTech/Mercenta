/**
 * Role-Based Access Control — single source of truth for session tiers,
 * which environments each tier may enter, and which nav views it may see.
 *
 * Client-side this gates navigation instantly; server-side the same model is
 * enforced by RLS policies (migrations 0001–0008) plus Edge Functions using
 * the verified session token. Client-supplied IDs are never trusted for
 * authorization — they only ever narrow an already-scoped query.
 */
import type { Environment, SessionRole } from '@/types';

export type SessionTier = 'brand' | 'admin_staff' | 'super_admin' | '3pl';

export interface DemoSession {
  tier: SessionTier;
  /** Brand sessions are pinned to exactly one tenant id. */
  tenantId?: string;
  role: SessionRole;
}

/** Maps every login role to its security tier. */
export function tierForRole(role: SessionRole): SessionTier {
  switch (role) {
    case 'Super Admin': return 'super_admin';
    case 'Mercenta Admin': return 'admin_staff';
    case '3PL Carrier': return '3pl';
    default: return 'brand';
  }
}

/** Which app environments each tier may enter. */
export const TIER_ENVIRONMENTS: Record<SessionTier, Environment[]> = {
  brand: ['home', 'login', 'brand'],
  admin_staff: ['home', 'login', 'admin'],
  super_admin: ['home', 'login', 'brand', 'admin', 'carrier'],
  '3pl': ['home', 'login', 'carrier'],
};

export function canAccessEnvironment(tier: SessionTier, env: Environment): boolean {
  if (env === 'home' || env === 'login') return true;
  return TIER_ENVIRONMENTS[tier].includes(env);
}

/**
 * Nav-view allowlist per tier. '*' = full access within that tier's
 * environment. The 3PL demo account is restricted strictly to logistics /
 * fulfillment scopes — never CRM, billing, compliance or marketing data.
 */
export const VIEW_ALLOWLIST: Record<SessionTier, '*' | string[]> = {
  brand: [
    'overview', 'onboarding', 'contracts', 'purchase_orders', 'catalog',
    'logistics', 'compliance', 'analytics', 'documents',
    'returns', 'reports', 'settings',
  ],
  admin_staff: [
    'overview', 'crm', 'onboarding_pipeline', 'fulfillment_track', 'retail_pipeline',
    'purchase_orders_admin', 'logistics', 'carriers', 'catalog', 'compliance',
    'billing', 'contracts_admin', 'messages', 'marketing',
    // super_admin + integrations views require the super_admin tier
  ],
  super_admin: '*',
  '3pl': ['manifest', 'bak', 'auditor'],
};

export function canAccessView(tier: SessionTier, viewId: string): boolean {
  const allow = VIEW_ALLOWLIST[tier];
  return allow === '*' || allow.includes(viewId);
}

export function filterNavForTier<T extends { id: string }>(
  tier: SessionTier,
  items: T[]
): T[] {
  return items.filter((i) => canAccessView(tier, i.id));
}

/* ── §Stage-25 — staff permission tiers ───────────────────────────────────── */

import type { StaffMember, StaffPermissionTier } from '@/types';

/** Only 'full'-tier staff may mutate admin-controlled state. */
export function staffCanMutate(
  member: Pick<StaffMember, 'permissionTier' | 'active'> | null | undefined
): boolean {
  return !!member && member.active && member.permissionTier === 'full';
}

export function tierLabel(tier: StaffPermissionTier): string {
  return tier === 'full' ? 'Full admin' : 'View-only ops';
}

/**
 * §Stage-26 — server-side-equivalent tenant guard for demo mode.
 * Brand sessions are pinned to exactly one tenant; any fetch for another
 * brand's data returns an EMPTY result (never an error that leaks whether
 * the record exists) and is logged. Live mode enforces the same rule in RLS
 * policies + Edge Functions from the verified session token.
 */
export function scopedBrandId(session: DemoSession | null): string | null {
  return session?.tier === 'brand' ? (session.tenantId ?? null) : null;
}

export function assertBrandScope<T extends { brandId?: string }>(
  session: DemoSession | null,
  rows: T[]
): T[] {
  if (session?.tier !== 'brand') return rows;
  const pinned = session.tenantId;
  return rows.filter((r) => r.brandId === pinned);
}

/** Cross-tenant access attempt → blocked (empty result), never leaked. */
export function isCrossTenantAccess(session: DemoSession | null, brandId: string): boolean {
  return session?.tier === 'brand' && session.tenantId !== brandId;
}
