/**
 * §RUNTIME PARITY (R1) — THE PRODUCT'S ADDRESS LAYER (single source of truth).
 *
 * WHY THIS EXISTS
 * ---------------
 * Before this module the product had NO address: `environment` initialised to
 * the literal `'home'` and `adminView` / `brandView` were plain `useState`, so
 * `window.history.pushState` was called from exactly ONE place in the whole app
 * (`marketing/Home.tsx`, public pages only). The URL read `/` inside the Admin
 * Hub, inside the Brand Portal and on the public site, which meant:
 *   - a refresh silently signed the user out (nothing to restore into),
 *   - Back/Forward could not move between product views,
 *   - no product surface could be linked, bookmarked or reloaded.
 *
 * This module declares, ONCE, what a product path MEANS. It is NOT a router:
 * the application's environment/view state remains the mechanism (exactly as
 * `publicRoutes.ts` states for the public side). It only says what an ADDRESS
 * means, and it is pure so a validator can assert its decisions directly.
 *
 * FAIL-CLOSED
 * -----------
 * An unknown segment returns `null` — never a guessed environment. This mirrors
 * `isProviderSimulationSafe` (integrations) and `checkCommercialModelSelection`
 * (commercial model): an unknown state is never defaulted into something
 * meaningful. The caller decides what an unrecognised address means, and the
 * RBAC allowlist (`canAccessEnvironment`) remains the ONLY gate on a session.
 */

/** The three product environments and their address prefixes. */
export const PRODUCT_ENVIRONMENT_PREFIXES = {
  admin: '/admin',
  brand: '/brand',
  carrier: '/carrier',
} as const;

export type ProductEnvironment = keyof typeof PRODUCT_ENVIRONMENT_PREFIXES;

/** The view a product environment opens on when the address names none. */
export const PRODUCT_DEFAULT_VIEW: Record<ProductEnvironment, string> = {
  admin: 'overview',
  brand: 'overview',
  carrier: 'manifest',
};

export interface ParsedProductPath {
  environment: ProductEnvironment;
  /**
   * The declared view segment, or `null` when the address names only the
   * environment (`/admin` → the environment's default view).
   */
  view: string | null;
}

/** Normalise a pathname: drop query/hash, collapse `//`, strip trailing `/`. */
function normalise(pathname: string): string {
  const raw = (pathname.split('?')[0] ?? '').split('#')[0] ?? '';
  const collapsed = raw.replace(/\/{2,}/g, '/');
  const stripped = collapsed.replace(/\/+$/, '');
  return stripped === '' ? '/' : stripped;
}

/**
 * Parse an address into a product environment + view. FAIL-CLOSED: a path that
 * is not a declared product prefix (or whose segment is not a plain slug)
 * returns `null` rather than guessing.
 */
export function parseProductPath(pathname: string): ParsedProductPath | null {
  const path = normalise(pathname);
  for (const [environment, prefix] of Object.entries(PRODUCT_ENVIRONMENT_PREFIXES) as [
    ProductEnvironment,
    string,
  ][]) {
    if (path === prefix) return { environment, view: null };
    if (path.startsWith(`${prefix}/`)) {
      const rest = path.slice(prefix.length + 1);
      // One segment only; a nested path is not a declared product address.
      if (!rest || rest.includes('/')) return null;
      if (!/^[a-z0-9][a-z0-9_-]*$/i.test(rest)) return null;
      return { environment, view: rest };
    }
  }
  return null;
}

/** The canonical address for an environment (+ optional view). */
export function buildProductPath(
  environment: ProductEnvironment,
  view?: string | null
): string {
  const prefix = PRODUCT_ENVIRONMENT_PREFIXES[environment];
  const resolved = view && view.trim() ? view.trim() : PRODUCT_DEFAULT_VIEW[environment];
  return `${prefix}/${resolved}`;
}

/**
 * The view an address names for a given environment, else its default view.
 *
 * §RUNTIME PARITY — FAIL-CLOSED against the shell's OWN renderable set. A URL
 * segment that no render branch matches (`/admin/super-admin` — the declared id
 * is `super_admin`) would otherwise render an empty workspace: an address that
 * loads cleanly and shows nothing, which no other gate can see. An unknown
 * segment resolves to the environment's declared default view instead.
 */
export function viewFromProductPath(environment: ProductEnvironment, pathname: string): string {
  const parsed = parseProductPath(pathname);
  if (parsed && parsed.environment === environment && parsed.view) return parsed.view;
  return PRODUCT_DEFAULT_VIEW[environment];
}

/** As `viewFromProductPath`, but refusing any view the shell cannot render. */
export function resolveProductView(
  environment: ProductEnvironment,
  pathname: string,
  renderable: readonly string[]
): string {
  const declared = viewFromProductPath(environment, pathname);
  return renderable.includes(declared) ? declared : PRODUCT_DEFAULT_VIEW[environment];
}

/**
 * Does this address already declare (this) product environment? Used when an
 * environment change must decide whether the current view segment may be kept.
 */
export function pathDeclaresEnvironment(
  environment: ProductEnvironment,
  pathname: string
): boolean {
  return parseProductPath(pathname)?.environment === environment;
}

/**
 * The live pathname, or `/` outside the browser (validators SSR-render these
 * shells; the pure functions above must still be callable there).
 */
export function currentPathname(): string {
  return typeof window === 'undefined' ? '/' : window.location.pathname;
}

/**
 * Write a product address into the address bar. A no-op outside the browser
 * (validators/SSR import the pure functions above; only the app navigates).
 */
export function pushProductPath(environment: ProductEnvironment, view?: string | null): void {
  if (typeof window === 'undefined') return;
  const target = buildProductPath(environment, view);
  if (window.location.pathname === target) return;
  window.history.pushState({ environment, view: view ?? null }, '', target);
}