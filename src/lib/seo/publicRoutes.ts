/**
 * §SEO FOUNDATION — THE PUBLIC ROUTE / METADATA SINGLE SOURCE OF TRUTH.
 *
 * WHY THIS EXISTS
 * ---------------
 * The platform is a single-page application whose PATH is the only signal a
 * crawler, a share card or an AI-search crawler can see. Before this module the
 * runtime set `document.title` ONCE (`main.tsx`) and the static `index.html`
 * carried ONE unconditional canonical (`https://<domain>/`), so every route —
 * /faq, /uk-market-access, /explore-uk-market-fit — was served with the
 * homepage's title and canonicalised back to the homepage. `robots.txt` and
 * `sitemap.xml` were hand-maintained separately and had already drifted
 * (`/explore-uk-market-fit`, a real public page, was missing from the sitemap).
 *
 * This module declares, ONCE:
 *   - which paths are PUBLIC and what metadata each carries,
 *   - which paths are PRIVATE (fail-closed: never indexable),
 *   - what an UNKNOWN path means (noindex — never the homepage's canonical).
 *
 * WHAT IT IS NOT
 * --------------
 * - It is NOT a content system and it generates NO pages: route identity and
 *   metadata only. Mass-generating commercial-intent content is out of scope.
 * - It is NOT a second router. The application's environment/view state remains
 *   the mechanism; this module only says what the ADDRESS means.
 * - It never names the retail channel in outward-facing metadata (the wording
 *   gate scans this file like every other `src/` file).
 * - It never invents a claim. Every description is a factual restatement of the
 *   platform's own public surfaces.
 *
 * CONSUMED BY
 * -----------
 *   `src/lib/seo/routeMetadata.ts`            — builds + applies DOM metadata
 *   `src/components/shared/RouteMetadata.tsx` — mounts it for every environment
 *   `src/components/marketing/Home.tsx`       — path ↔ public view mapping
 *   `scripts/validate-seo-foundation.mjs`     — pins robots.txt/sitemap.xml
 */
import { BRAND_DOMAIN, BRAND_LEGAL_NAME, BRAND_NAME } from '@/config/brand';
import { EXPLORE_UK_MARKET_FIT_PATH } from '@/config/ukMarketFit';
/** §LIFT OFF — the public route is declared in the programme's OWN owner. */
import { LIFT_OFF_PATH } from '@/config/liftOff';
/**
 * §B7 (2026-09-29) — THE HOME DESCRIPTION IS DERIVED FROM ITS OWNER.
 *
 * `src/config/positioning.ts` §1 is the ONE declaration of what Mercenta says in
 * public, and PUBLIC_PROMISE is that declaration's one-sentence promise. The home
 * route's description used to be a second wording of it (the RETIRED positioning),
 * so the homepage's search description and its own hero described the business two
 * different ways. It now reads the owner.
 */
import { PUBLIC_PROMISE } from '@/config/positioning';

/** The public page ids — the SAME union `PublicNav` renders. */
export type PublicRoutePage =
  | 'home'
  | 'how-it-works'
  | 'uk-market-access'
  | 'for-brands'
  | 'faq'
  | 'privacy'
  | 'terms'
  | 'explore-uk-market-fit'
  | 'lift-off';

export interface PublicRouteDefinition {
  /** The canonical path, exactly as it appears in the address bar. */
  path: string;
  /** The public view this path resolves to. */
  page: PublicRoutePage;
  /** The route's own document title. The home route keeps the brand title. */
  title: string;
  /** A factual one-sentence description of the page. */
  description: string;
  /** Crawl instructions for a public route are always indexable. */
  robots: 'index, follow';
  changefreq: 'weekly' | 'monthly';
  /** Sitemap priority as a string (the sitemap schema is textual). */
  priority: string;
}

/**
 * The canonical public routes. ORDER IS THE SITEMAP ORDER.
 * Adding a public page means adding ONE row here, and the validator then
 * requires it in `robots.txt`'s allow list, in `sitemap.xml`, and in the
 * path→view mapping — so the three can never drift apart again.
 */
export const PUBLIC_ROUTES: readonly PublicRouteDefinition[] = [
  {
    path: '/',
    page: 'home',
    // Preserved deliberately: the homepage title is the brand, as before.
    title: BRAND_NAME,
    /**
     * §B7 (2026-09-29) — DERIVED, NOT RETYPED. This description was the RETIRED
     * positioning ("a self-service wholesale distribution platform…"), which
     * `PUBLIC_CATEGORY` — "Retail channel partner" — contradicts and which B3
     * removed from every public page. It is now the owner's own one-sentence
     * promise. `index.html`'s bootstrap copy carries the SAME string, and
     * `scripts/validate-seo-foundation.mjs` fails if the two drift.
     */
    description: PUBLIC_PROMISE,
    robots: 'index, follow',
    changefreq: 'weekly',
    priority: '1.0',
  },
  {
    path: '/how-it-works',
    page: 'how-it-works',
    title: `How It Works — ${BRAND_NAME}`,
    description:
      'How a brand works through Mercenta: onboarding and compliance, catalogue readiness, purchase-order handling, UK distribution and reporting inside one portal.',
    robots: 'index, follow',
    changefreq: 'monthly',
    priority: '0.8',
  },
  {
    path: '/uk-market-access',
    page: 'uk-market-access',
    title: `UK Market Access — ${BRAND_NAME}`,
    /**
     * §B7 (2026-09-29) — the previous description published the regulated position
     * ("customs clearance" — `src/config/positioning.ts` §11 family 2) in the page's
     * search and AI-crawler description. This states the same offer in outcome
     * terms and names no mechanism, no authority and no supplier.
     */
    description:
      'What it takes for an independent brand to sell into the UK, and which parts of that Mercenta carries for you.',
    robots: 'index, follow',
    changefreq: 'monthly',
    priority: '0.7',
  },
  {
    path: '/for-brands',
    page: 'for-brands',
    title: `For Brands — ${BRAND_NAME}`,
    description:
      'What a brand gets from Mercenta: a single portal for catalogue, purchase orders, shipments, compliance documentation, returns and analytics.',
    robots: 'index, follow',
    changefreq: 'monthly',
    priority: '0.7',
  },
  {
    path: '/faq',
    page: 'faq',
    title: `FAQ — ${BRAND_NAME}`,
    description:
      'Answers to the questions brands ask about onboarding, compliance documentation, purchase orders, shipping, payments and portal access.',
    robots: 'index, follow',
    changefreq: 'monthly',
    priority: '0.7',
  },
  {
    path: '/privacy',
    page: 'privacy',
    title: `Privacy Policy — ${BRAND_NAME}`,
    description:
      /**
       * §B5 (2026-09-29) — DERIVED, NOT RETYPED. This description used to spell
       * out "Mercenta Partners Ltd" by hand, a second copy of a fact whose owner
       * is `src/config/brand.ts` (and which `positioning.ts` §7 derives its own
       * public company line from). The public surfaces are not allowed two
       * spellings of the company's name, so the literal is gone.
       */
      `How ${BRAND_LEGAL_NAME} collects, uses, shares and retains personal data, and the rights available under UK GDPR.`,
    robots: 'index, follow',
    changefreq: 'monthly',
    priority: '0.6',
  },
  {
    path: '/terms',
    page: 'terms',
    title: `Terms of Service — ${BRAND_NAME}`,
    description:
      'The terms governing use of the Mercenta Partners platform, including brand obligations, fees, payment terms and compliance responsibilities.',
    robots: 'index, follow',
    changefreq: 'monthly',
    priority: '0.6',
  },
  {
    path: EXPLORE_UK_MARKET_FIT_PATH,
    page: 'explore-uk-market-fit',
    title: `Explore UK Market Fit — ${BRAND_NAME}`,
    description:
      'A guided assessment of whether there appears to be a credible UK opportunity for a brand, based on the evidence available. A simulation-labelled assessment, never a promise.',
    robots: 'index, follow',
    changefreq: 'monthly',
    priority: '0.8',
  },
  {
    path: LIFT_OFF_PATH,
    page: 'lift-off',
    title: `Lift Off — ${BRAND_NAME}`,
    description:
      'Mercenta\u2019s launch programme for brands new to the UK retail channel: Mercenta runs the launch end to end, with a large opening order behind the product.',
    robots: 'index, follow',
    changefreq: 'monthly',
    priority: '0.8',
  },
] as const;

export const PUBLIC_ROUTE_BY_PATH: Record<string, PublicRouteDefinition> = Object.fromEntries(
  PUBLIC_ROUTES.map((r) => [r.path, r])
);

export const PUBLIC_ROUTE_BY_PAGE: Record<PublicRoutePage, PublicRouteDefinition> = Object.fromEntries(
  PUBLIC_ROUTES.map((r) => [r.page, r])
) as Record<PublicRoutePage, PublicRouteDefinition>;

/**
 * Paths that must NEVER be indexed. These mirror `public/robots.txt`'s Disallow
 * list and are enforced at the document level too, because `robots.txt` only
 * governs crawling — a URL reached by any other means (a link, a bookmark, an
 * AI-search fetch) must still carry `noindex`.
 */
export const PRIVATE_ROUTE_PREFIXES: readonly string[] = [
  '/login',
  '/admin',
  '/brand',
  /* §P9 (programme decision 4) — '/carrier' is REMOVED: the carrier environment
     no longer exists, so the prefix described a route Mercenta no longer
     serves. `/carrier/…` now resolves as UNKNOWN (still `noindex, nofollow`,
     never canonicalised) — the fail-closed outcome is unchanged. */
  '/account',
  '/dashboard',
  '/internal',
  '/api/',
] as const;

/** The public site origin, derived from the ONE brand config. */
export const SITE_ORIGIN = `https://${BRAND_DOMAIN}`;

/** Normalise a pathname: drop the query/hash, collapse `//`, strip a trailing slash. */
export function normalizePath(pathname: string): string {
  const raw = (pathname.split('?')[0] ?? '').split('#')[0] ?? '';
  const collapsed = raw.replace(/\/{2,}/g, '/');
  const stripped = collapsed.replace(/\/+$/, '');
  return stripped === '' ? '/' : stripped;
}

export type ResolvedRoute =
  | { kind: 'public'; route: PublicRouteDefinition; path: string }
  | { kind: 'private'; path: string; reason: string }
  | { kind: 'unknown'; path: string; reason: string };

/**
 * Resolve a pathname to its declared identity. FAIL-CLOSED: an unrecognised path
 * is `unknown`, never treated as the homepage (which would let an arbitrary URL
 * inherit the homepage's canonical and be indexed as it).
 */
export function resolveRoute(pathname: string): ResolvedRoute {
  const path = normalizePath(pathname);
  const publicRoute = PUBLIC_ROUTE_BY_PATH[path];
  if (publicRoute) return { kind: 'public', route: publicRoute, path };

  const privatePrefix = PRIVATE_ROUTE_PREFIXES.find(
    (p) => path === p || path.startsWith(p.endsWith('/') ? p : `${p}/`)
  );
  if (privatePrefix) {
    return {
      kind: 'private',
      path,
      reason: `${path} is a private/authenticated surface (${privatePrefix}) and is never indexable.`,
    };
  }

  return {
    kind: 'unknown',
    path,
    reason: `${path} is not a declared public route, so it must not be indexed or canonicalised to another page.`,
  };
}

/** The canonical URL for a public page — the ONLY place one is composed. */
export function canonicalUrlForPublicPage(page: PublicRoutePage): string {
  const path = PUBLIC_ROUTE_BY_PAGE[page].path;
  return path === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${path}`;
}

/** The canonical URL for a path, or `null` when the path must not be indexed. */
export function canonicalUrlForPath(pathname: string): string | null {
  const resolved = resolveRoute(pathname);
  if (resolved.kind !== 'public') return null;
  return resolved.route.path === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${resolved.route.path}`;
}