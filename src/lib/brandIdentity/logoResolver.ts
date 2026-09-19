/**
 * §UI/UX Wave 1 — BRAND LOGO / IDENTITY RESOLUTION SEAM (mock-first).
 *
 * Auto-resolves a brand's logo identity deterministically:
 *
 *   1. AUTHORISED OVERRIDE   — a per-tenant record set by the brand profile
 *                              owner (never cross-tenant). Highest priority.
 *   2. DEMO IDENTITY         — canonical deterministic identity
 *                              (src/data/brandLogos.ts); rendered as a local
 *                              monogram data-URI. Truthfully labelled "(demo
 *                              identity)" — never presented as live artwork.
 *   3. SENSIBLE FALLBACK     — algorithmically-derived monogram (initials).
 *
 * A future provider supplies real logos THROUGH THE SAME SEAM: swap the
 * demo identity branch for a provider fetch behind the same return shape.
 * Nothing outside this module knows or cares which source is active, and
 * the demo makes ZERO network calls and holds ZERO credentials.
 */
import {
  BRAND_LOGO_IDENTITIES,
  BRAND_LOGO_TERM_OVERRIDES,
} from '@/data/brandLogos';

/** Per-tenant authorised overrides (in-memory mock store, `durable:false`). */
const overrideStore: Map<string, string> = new Map();

export type BrandLogoSource =
  | 'authorised_override'
  | 'demo_identity'
  | 'monogram_fallback';

export interface ResolvedBrandLogo {
  /** null when only the non-image monogram fallback applies. */
  url: string | null;
  /** Machine-readable provenance — never claims a live provider. */
  source: BrandLogoSource;
  displayName: string;
  /** Monogram initials used by the Avatar fallback path. */
  monogram: string;
}

export function normalizeBrandTerm(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Algorithmic initials, e.g. "Manchester United" → "MU". */
export function monogramFor(name: string, max = 2): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0 && /[a-z0-9]/i.test(w));
  let initials = words
    .slice(0, max)
    .map((w) => w[0].toUpperCase())
    .join('');
  if (initials.length === 0) initials = (name[0] ?? 'B').toUpperCase();
  return initials;
}

/** Local, deterministic monogram "logo" as an SVG data URI. */
export function monogramDataUri(monogram: string, bg: string, fg: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="20" fill="${bg}"/><text x="48" y="60" font-family="system-ui, sans-serif" font-size="40" font-weight="600" fill="${fg}" text-anchor="middle" dominant-baseline="middle" letter-spacing="1">${monogram}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Locale-independent demo palette (stable per term). */
function paletteFor(term: string, dark: boolean): { bg: string; fg: string } {
  let h = 0;
  for (let i = 0; i < term.length; i++) h = (h * 31 + term.charCodeAt(i)) % 360;
  if (dark) return { bg: `hsl(${h} 22% 22%)`, fg: `hsl(${h} 35% 82%)` };
  return { bg: `hsl(${h} 45% 92%)`, fg: `hsl(${h} 55% 34%)` };
}

function identityFor(term: string): { displayName: string; monogram: string } | null {
  const hit = BRAND_LOGO_IDENTITIES.find((b) => b.term === term);
  if (hit) return { displayName: hit.displayName, monogram: hit.monogram };
  const override = BRAND_LOGO_TERM_OVERRIDES[term];
  if (override) return { displayName: override, monogram: monogramFor(override) };
  return null;
}

/**
 * Resolves a brand's logo identity. `tenantId` MUST be the current session's
 * tenant — the override store is keyed by tenant, so a brand can never read
 * another tenant's authorised logo.
 */
export function resolveBrandLogo(args: {
  /** Current session tenant id (null for public/staff contexts). */
  tenantId?: string | null;
  brandId: string;
  brandName: string;
  dark?: boolean;
}): ResolvedBrandLogo {
  const displayName = args.brandName.trim() || 'Brand';
  const term = normalizeBrandTerm(args.brandName);
  const monogram = monogramFor(displayName);

  // 1. Authorised override — strictly tenant-scoped.
  const overrideKey = args.tenantId ? `${args.tenantId}::${args.brandId}` : null;
  if (overrideKey && overrideStore.has(overrideKey)) {
    const url = overrideStore.get(overrideKey);
    return {
      url: url ?? null,
      source: 'authorised_override',
      displayName,
      monogram,
    };
  }

  // 2. Canonical deterministic identity (demo).
  const identity = identityFor(term) ?? identityFor('mercenta partners');
  if (identity) {
    const { bg, fg } = paletteFor(term, args.dark ?? false);
    return {
      url: monogramDataUri(identity.monogram, bg, fg),
      source: 'demo_identity',
      displayName: identity.displayName,
      monogram: identity.monogram,
    };
  }

  // 3. Sensible fallback.
  const { bg, fg } = paletteFor(term, args.dark ?? false);
  return {
    url: monogramDataUri(monogram, bg, fg),
    source: 'monogram_fallback',
    displayName,
    monogram,
  };
}

/** Authorised override (brand profile owner or Super Admin only — callers
 *  enforce RBAC; this seam never does). */
export function setBrandLogoOverride(
  tenantId: string,
  brandId: string,
  url: string | null
): void {
  const key = `${tenantId}::${brandId}`;
  if (url) overrideStore.set(key, url);
  else overrideStore.delete(key);
}

export function getBrandLogoOverride(
  tenantId: string,
  brandId: string
): string | null {
  return overrideStore.get(`${tenantId}::${brandId}`) ?? null;
}

/** Test/validation hook — restores a pristine override store. */
export function _resetBrandLogoOverrides(): void {
  overrideStore.clear();
}