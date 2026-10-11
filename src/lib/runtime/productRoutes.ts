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

/**
 * §P9 (programme decision 4) — THE TWO PRODUCT ENVIRONMENTS AND THEIR ADDRESS
 * PREFIXES. REPOINTED from the old contract, which declared a third,
 * `carrier: '/carrier'`. A carrier never logs into Mercenta (DHL + Palletline are
 * operated by API), so `/carrier/…` is no longer a product address and now fails
 * closed to `null` like any other unknown path.
 */
export const PRODUCT_ENVIRONMENT_PREFIXES = {
  admin: '/admin',
  brand: '/brand',
} as const;

export type ProductEnvironment = keyof typeof PRODUCT_ENVIRONMENT_PREFIXES;

/** The view a product environment opens on when the address names none. */
export const PRODUCT_DEFAULT_VIEW: Record<ProductEnvironment, string> = {
  admin: 'overview',
  brand: 'overview',
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
 * §Dashboard-cleanup P0 — drive navigation from a CHILD surface.
 *
 * `pushProductPath` writes the address but cannot change the shell's view: the
 * shell owns that state and re-reads the address on `popstate` (Back/Forward).
 * This helper performs the same write AND dispatches `popstate`, so a child (the
 * accepted-PO "Open shipping documents" action) can move the operator to the
 * Logistics Hub — with an optional query, e.g. `?po=PO-9002` — using the
 * EXISTING address layer rather than a second navigation mechanism.
 */
export function navigateProductView(
  environment: ProductEnvironment,
  view?: string | null,
  query?: Record<string, string>
): void {
  if (typeof window === 'undefined') return;
  const target = buildProductPath(environment, view);
  const qs = query && Object.keys(query).length > 0 ? `?${new URLSearchParams(query).toString()}` : '';
  window.history.pushState({ environment, view: view ?? null }, '', target + qs);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

/**
 * Read one query parameter from the CURRENT address (used for a PO-scoped deep
 * link into the Logistics Hub). Returns null outside the browser or when absent.
 */
export function currentQueryParam(key: string): string | null {
  if (typeof window === 'undefined') return null;
  const value = new URLSearchParams(window.location.search).get(key);
  return value && value.trim() ? value.trim() : null;
}

/* ── §BATCH 7 (Part 4.1a) — THE RECORD DEEP-LINK REGISTRY (single source) ──
 *
 * A notice in the shell names a RECORD, not just a section: "Contract
 * commercial_agreement renews ≤ 7 days" is about ONE contract record. This
 * registry declares, ONCE, the query key each record kind uses in a product
 * address, so that:
 *   · the notification centre writes the key through `recordLinkQuery` (never a
 *     hand-written string);
 *   · the surface that OWNS the record reads the SAME key through
 *     `currentQueryParam`; and
 *   · `scripts/validate-batch7-deeplinks.mjs` can assert the two ends agree —
 *     a notice can never name a record whose surface reads a different key.
 *
 * `po` is the key the Logistics Hub and both purchase-order lists already use
 * (the pre-existing contract, declared here so there is only one place that
 * knows it); every other kind is declared here for the first time.
 */
export const RECORD_LINK_PARAMS = {
  /** A purchase order, by its `poNumber` (e.g. `PO-9002`). */
  po: 'po',
  /** A contract/agreement record, by its id. */
  contract: 'contract',
  /** A brand's fulfillment score, by the brand id. */
  score: 'score',
  /** A catalog submission, by its id. */
  submission: 'submission',
  /** A deduction/chargeback, by its id. */
  deduction: 'deduction',
  /** A compliance document, by its id. */
  compliance: 'doc',
  /** A consignment, by its id. */
  shipment: 'shipment',
  /** A simulated commerce invoice, by its id. */
  invoice: 'invoice',
  /** A unit of work, by its id. */
  work: 'work',
} as const;

export type RecordLinkKind = keyof typeof RECORD_LINK_PARAMS;

/**
 * The ONE query object a record deep link uses. Callers pass the record's own
 * identifier — never a view name, never a section — so the address carries the
 * record and the owning surface can open it.
 */
export function recordLinkQuery(kind: RecordLinkKind, id: string): Record<string, string> {
  return { [RECORD_LINK_PARAMS[kind]]: id };
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