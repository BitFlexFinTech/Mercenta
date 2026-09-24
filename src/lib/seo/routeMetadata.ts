/**
 * §SEO FOUNDATION — ROUTE METADATA BUILDER + APPLIER (pure, then imperative).
 *
 * `buildRouteMetadata` is PURE (no DOM, no clock, no network) so a validator can
 * assert its decisions directly. `applyRouteMetadata` is the ONE place the
 * document's metadata is written, so title/canonical/robots can never be set by
 * two competing code paths (which is how the homepage canonical ended up on
 * every route).
 *
 * FAIL-CLOSED RULES
 * -----------------
 * - An AUTHENTICATED app environment ('brand' | 'admin') is private
 *   regardless of the path: the session, not the URL, decides. A crawler can
 *   never reach that state, and a real user in it must not advertise an
 *   indexable page either.
 *   §P9 (programme decision 4) — REPOINTED from `('brand' | 'admin' | 'carrier')`:
 *   the carrier environment no longer exists.
 * - An unknown path is `noindex, nofollow` with NO canonical. We never point an
 *   arbitrary URL at the homepage.
 * - A private/unknown route REMOVES the canonical link rather than leaving the
 *   bootstrap one in place; a stale canonical is worse than none.
 */
import type { Environment } from '@/types';
import { BRAND_NAME } from '@/config/brand';
import {
  PUBLIC_ROUTE_BY_PAGE,
  resolveRoute,
  SITE_ORIGIN,
  type PublicRoutePage,
} from './publicRoutes';

export type RobotsDirective = 'index, follow' | 'noindex, nofollow';

export interface RouteMetadata {
  /** Where the metadata came from — kept so a surface can explain itself. */
  kind: 'public' | 'private' | 'unknown';
  path: string;
  title: string;
  description: string;
  robots: RobotsDirective;
  /** Absolute canonical URL, or `null` when the route must not be canonicalised. */
  canonicalUrl: string | null;
  /** The public view this path maps to (public routes only). */
  publicPage: PublicRoutePage | null;
  reason: string;
}

export interface RouteMetadataInput {
  pathname: string;
  environment: Environment;
}

const PRIVATE_ENVIRONMENTS: readonly Environment[] = ['brand', 'admin'];

export function buildRouteMetadata(input: RouteMetadataInput): RouteMetadata {
  const resolved = resolveRoute(input.pathname);

  if (PRIVATE_ENVIRONMENTS.includes(input.environment)) {
    return {
      kind: 'private',
      path: resolved.path,
      title: `${BRAND_NAME} — Portal`,
      description: `Authenticated Mercenta portal session. This surface is private and is not published to search engines.`,
      robots: 'noindex, nofollow',
      canonicalUrl: null,
      publicPage: null,
      reason: `The active app environment is "${input.environment}" (authenticated), so the document must not be indexed.`,
    };
  }

  if (resolved.kind === 'public') {
    const { route } = resolved;
    return {
      kind: 'public',
      path: route.path,
      title: route.title,
      description: route.description,
      robots: route.robots,
      canonicalUrl: route.path === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${route.path}`,
      publicPage: route.page,
      reason: `${route.path} is a declared public route.`,
    };
  }

  return {
    kind: resolved.kind,
    path: resolved.path,
    title: `${BRAND_NAME}`,
    description: `This address is not a published page of the ${BRAND_NAME} platform.`,
    robots: 'noindex, nofollow',
    canonicalUrl: null,
    publicPage: null,
    reason: resolved.reason,
  };
}

/** The metadata for a declared public page — used by in-app navigation. */
export function metadataForPublicPage(page: PublicRoutePage): RouteMetadata {
  const route = PUBLIC_ROUTE_BY_PAGE[page];
  return buildRouteMetadata({ pathname: route.path, environment: 'home' });
}

/* ── DOM application (the ONLY writer of these document tags) ─────────────── */

function upsertMeta(doc: Document, attr: 'name' | 'property', key: string, content: string): void {
  let el = doc.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = doc.createElement('meta');
    el.setAttribute(attr, key);
    doc.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * Write the metadata into the live document. Idempotent: calling it twice with
 * the same metadata is a no-op in effect, and it never appends duplicates.
 */
export function applyRouteMetadata(meta: RouteMetadata, doc: Document = document): void {
  doc.title = meta.title;
  upsertMeta(doc, 'name', 'description', meta.description);
  upsertMeta(doc, 'name', 'robots', meta.robots);
  upsertMeta(doc, 'name', 'googlebot', meta.robots);
  upsertMeta(doc, 'property', 'og:title', meta.title);
  upsertMeta(doc, 'property', 'og:description', meta.description);
  upsertMeta(doc, 'name', 'twitter:title', meta.title);
  upsertMeta(doc, 'name', 'twitter:description', meta.description);

  // The canonical link is the bootstrap tag with a stable id, so there is
  // exactly ONE canonical element in the document at all times.
  let link = doc.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (meta.canonicalUrl === null) {
    if (link) link.remove();
    upsertMeta(doc, 'property', 'og:url', `${SITE_ORIGIN}/`);
    return;
  }
  if (!link) {
    link = doc.createElement('link');
    link.setAttribute('rel', 'canonical');
    doc.head.appendChild(link);
  }
  link.setAttribute('href', meta.canonicalUrl);
  upsertMeta(doc, 'property', 'og:url', meta.canonicalUrl);
}