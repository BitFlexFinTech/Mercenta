/**
 * §PHASE 9 — THE LOCALIZATION / SEO RESOLVER — the pure rules over the ONE owner.
 *
 * The owner (`src/config/localisationSeo.ts`) declares the presentation conventions, the
 * localized-URL strategy, the market timezones and the hreflang rule; this module applies
 * them. It is PURE and DETERMINISTIC: no clock, no randomness, no network, no AI.
 *
 * THE RULES IT ENFORCES:
 *   · a hreflang alternate is emitted ONLY for a language Mercenta ACTUALLY serves content
 *     in (`SERVED_CONTENT_LOCALES`); a language not served is REFUSED
 *     (HREFLANG_LOCALE_NOT_SERVED) — never emitted, so no crawler is ever pointed at an
 *     invented page;
 *   · alternates are emitted ONLY for a PUBLIC (indexable) route; a private or unknown
 *     path is REFUSED (HREFLANG_ROUTE_NOT_PUBLIC);
 *   · `x-default` self-references the served default — it is never a different locale;
 *   · the formatting of a locale not declared supported is REFUSED and the declared
 *     default is used instead, with the reason noted.
 *
 * It NEVER re-derives a route: the canonical public routes come from the SEO foundation
 * (`src/lib/seo/publicRoutes.ts`), the canonical markets from the acquisition owner, and
 * the canonical suggestions from the localisation owner.
 */
import {
  COUNTRY_LOCALISATION_SUGGESTIONS,
  DEFAULT_LOCALE,
  type CountryLocalisationSuggestion,
} from '@/config/localisation';
import {
  HREFLANG_DEFAULT_LOCALE,
  HREFLANG_ONLY_FOR_SERVED_LOCALES,
  HREFLANG_REQUIRES_PUBLIC_ROUTE,
  HREFLANG_X_DEFAULT,
  HREFLANG_X_DEFAULT_IS_SELF,
  LOCALISATION_SEO_BASIS,
  LOCALISATION_SEO_DISCLAIMER,
  LOCALISATION_SEO_REFUSALS,
  LOCALISATION_SEO_RULES,
  LOCALIZED_URL_STRATEGY,
  LOCALE_FORMAT_CONVENTIONS,
  MARKET_MESSAGING_SLOTS,
  MARKET_TIMEZONES,
  ONE_LOCALISATION_SEO_OWNER,
  SEO_LOCALES_ARE_SERVED_CONTENT_LOCALES,
  SERVED_CONTENT_LOCALES,
  type LocaleFormatConvention,
  type LocalizedUrlStrategy,
  type MarketMessagingSlot,
} from '@/config/localisationSeo';
import { canonicalUrlForPublicPage, PUBLIC_ROUTES, resolveRoute } from '@/lib/seo/publicRoutes';
import { SOURCE_MARKETS } from '@/lib/intelligence/acquisitionStrategy';
import { isSupportedLocale } from './resolveLocalisation';

const SERVED = new Set(SERVED_CONTENT_LOCALES);

/** TRUE only for a locale Mercenta actually serves content in. */
export function isServedContentLocale(value: string | null | undefined): boolean {
  return typeof value === 'string' && SERVED.has(value);
}

export type HreflangRefusal = 'HREFLANG_ROUTE_NOT_PUBLIC' | 'HREFLANG_LOCALE_NOT_SERVED';

export interface HreflangAlternate {
  /** The hreflang value — a served locale, or `x-default`. */
  hreflang: string;
  /** The absolute URL that language serves. */
  href: string;
}

export interface HreflangDecision {
  path: string;
  public: boolean;
  /** The canonical URL for the path, or `null` when the path is not public. */
  canonicalUrl: string | null;
  alternates: HreflangAlternate[];
  xDefault: string | null;
  refused: HreflangRefusal | null;
  reason: string;
}

/**
 * The hreflang alternates for a path. FAIL CLOSED: a non-public path is REFUSED. When the
 * path is public, one self-referencing alternate is emitted per SERVED content locale, plus
 * `x-default` — which self-references the served default, never an invented page.
 */
export function buildHreflangAlternates(pathname: string): HreflangDecision {
  const resolved = resolveRoute(pathname);
  if (resolved.kind !== 'public') {
    return {
      path: resolved.path,
      public: false,
      canonicalUrl: null,
      alternates: [],
      xDefault: null,
      refused: 'HREFLANG_ROUTE_NOT_PUBLIC',
      reason: LOCALISATION_SEO_REFUSALS.routeNotPublic,
    };
  }
  const href = canonicalUrlForPublicPage(resolved.route.page);
  const alternates: HreflangAlternate[] = SERVED_CONTENT_LOCALES.map((locale) => ({ hreflang: locale, href }));
  alternates.push({ hreflang: HREFLANG_X_DEFAULT, href });
  return {
    path: resolved.path,
    public: true,
    canonicalUrl: href,
    alternates,
    xDefault: href,
    refused: null,
    reason: `${resolved.path} is public, so it carries a self-referencing alternate for each served content locale plus x-default.`,
  };
}

/** Whether a specific language may carry a hreflang alternate (fail closed). */
export function evaluateHreflangLocale(locale: string): { eligible: boolean; refusal: HreflangRefusal | null } {
  if (!isServedContentLocale(locale)) {
    return { eligible: false, refusal: 'HREFLANG_LOCALE_NOT_SERVED' };
  }
  return { eligible: true, refusal: null };
}

export interface LocaleFormattingResolution {
  convention: LocaleFormatConvention;
  source: 'explicit' | 'default';
  notes: string[];
}

/** Resolve a locale's formatting; an undeclared locale is REFUSED and the default is used. */
export function resolveLocaleFormatting(locale: string | null | undefined): LocaleFormattingResolution {
  const notes: string[] = [];
  if (locale && isSupportedLocale(locale) && LOCALE_FORMAT_CONVENTIONS[locale]) {
    return { convention: LOCALE_FORMAT_CONVENTIONS[locale], source: 'explicit', notes };
  }
  if (locale) {
    notes.push(`${LOCALISATION_SEO_REFUSALS.localeUnknown} (${locale})`);
  }
  return { convention: LOCALE_FORMAT_CONVENTIONS[DEFAULT_LOCALE], source: 'default', notes };
}

/* ── The founder-facing summary over the canonical markets + routes ─────────── */

export interface LocalisationSeoSummary {
  servedContentLocales: string[];
  hreflangDefault: string;
  hreflangXDefault: string;
  onlyForServedLocales: boolean;
  xDefaultIsSelf: boolean;
  oneOwner: boolean;
  seoLocalesAreServedContentLocales: boolean;
  requiresPublicRoute: boolean;
  urlStrategy: LocalizedUrlStrategy;
  formatConventions: LocaleFormatConvention[];
  formatCount: number;
  marketCount: number;
  markets: { countryCode: string; countryLabel: string; timezone: string; suggestedLocale: string }[];
  messagingSlots: MarketMessagingSlot[];
  publicRouteAlternates: { path: string; title: string; alternates: HreflangAlternate[]; xDefault: string }[];
  publicRouteCount: number;
  refusedNonPublic: number;
  rules: string[];
  basis: string;
  disclaimer: string;
}

/**
 * Summarise the framework for the founder surface. Derived from the canonical owners
 * (source markets, public routes, localisation suggestions) — nothing is retyped.
 * `markets` covers ONLY the canonical source markets that carry a declared timezone, and
 * `refusedNonPublic` proves the fail-closed route rule is live over the private + unknown
 * paths.
 */
export function buildLocalisationSeoSummary(): LocalisationSeoSummary {
  const markets = Object.keys(SOURCE_MARKETS)
    .filter((code) => MARKET_TIMEZONES[code])
    .map((code) => {
      const suggestion: CountryLocalisationSuggestion | undefined = COUNTRY_LOCALISATION_SUGGESTIONS[code];
      return {
        countryCode: code,
        countryLabel: SOURCE_MARKETS[code]?.label ?? code,
        timezone: MARKET_TIMEZONES[code],
        suggestedLocale: suggestion?.suggestedLocale ?? HREFLANG_DEFAULT_LOCALE,
      };
    });

  const publicRouteAlternates = PUBLIC_ROUTES.map((r) => {
    const decision = buildHreflangAlternates(r.path);
    return {
      path: r.path,
      title: r.title,
      alternates: decision.alternates,
      xDefault: decision.xDefault ?? '',
    };
  });

  // Prove the fail-closed route rule is live: a private and an unknown path are both refused.
  const refusedNonPublic = ['/admin', '/not-a-real-page'].filter(
    (p) => buildHreflangAlternates(p).refused !== null
  ).length;

  return {
    servedContentLocales: [...SERVED_CONTENT_LOCALES],
    hreflangDefault: HREFLANG_DEFAULT_LOCALE,
    hreflangXDefault: HREFLANG_X_DEFAULT,
    onlyForServedLocales: HREFLANG_ONLY_FOR_SERVED_LOCALES,
    xDefaultIsSelf: HREFLANG_X_DEFAULT_IS_SELF,
    oneOwner: ONE_LOCALISATION_SEO_OWNER,
    seoLocalesAreServedContentLocales: SEO_LOCALES_ARE_SERVED_CONTENT_LOCALES,
    requiresPublicRoute: HREFLANG_REQUIRES_PUBLIC_ROUTE,
    urlStrategy: { ...LOCALIZED_URL_STRATEGY },
    formatConventions: Object.values(LOCALE_FORMAT_CONVENTIONS),
    formatCount: Object.keys(LOCALE_FORMAT_CONVENTIONS).length,
    marketCount: markets.length,
    markets,
    messagingSlots: MARKET_MESSAGING_SLOTS.map((s) => ({ ...s })),
    publicRouteAlternates,
    publicRouteCount: publicRouteAlternates.length,
    refusedNonPublic,
    rules: [...LOCALISATION_SEO_RULES],
    basis: LOCALISATION_SEO_BASIS,
    disclaimer: LOCALISATION_SEO_DISCLAIMER,
  };
}

