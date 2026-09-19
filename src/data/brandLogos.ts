/**
 * §UI/UX Wave 1 — DETERMINISTIC BRAND LOGO IDENTITY DATA.
 *
 * Canonical table for auto-resolving a brand's logo identity in the DEMO.
 * This is NOT a live logo service: entries are deterministic demo identities
 * resolved locally (see src/lib/brandIdentity/logoResolver.ts).
 *
 * A future provider (e.g. a logo CDN / registry token) may supply real
 * artwork through the same resolver seam — it would REPLACE the monogram
 * identity, never bypass the tenant-scoped resolution path. No external
 * call is ever made from the demo and no credential is stored here.
 */
export interface BrandLogoIdentity {
  /** Normalised identity key (lowercased, trimmed). */
  term: string;
  /** Display name shown alongside the identity. */
  displayName: string;
  /** Deterministic monogram initials (falls back to algorithmically-derived). */
  monogram: string;
}

/** Example: a famous brand the UserTour/prospect flows may reference. */
export const BRAND_LOGO_IDENTITIES: readonly BrandLogoIdentity[] = [
  { term: 'manchester united', displayName: 'Manchester United', monogram: 'MU' },
  { term: 'mercenta partners', displayName: 'Mercenta Partners', monogram: 'MP' },
  { term: 'mercenta', displayName: 'Mercenta', monogram: 'M' },
];

/** The demo tenant brands resolve their identity algorithmically; this map
 *  keeps authoritative display-name overrides where initials alone could
 *  mislead (e.g. entity-style names). */
export const BRAND_LOGO_TERM_OVERRIDES: Readonly<Record<string, string>> = {};

export const ALL_BRAND_LOGO_TERMS: readonly string[] = BRAND_LOGO_IDENTITIES.map(
  (b) => b.term
);