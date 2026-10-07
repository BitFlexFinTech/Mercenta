/**
 * §PHASE 9 — THE LOCALIZATION, SEO AND HREFLANG FRAMEWORK (the ONE owner).
 *
 * WHY THIS EXISTS
 * ---------------
 * The registry row `phase9-localization-seo-hreflang` records the localization work
 * that is NOT about currency: the LOCALE-level presentation rules and the search
 * metadata that must agree with them —
 *
 *   · number / date / time FORMATS (how "1,234.5" and "31/01/2026" read per locale);
 *   · the TIMEZONE of each canonical source market;
 *   · the LOCALIZED-URL strategy;
 *   · SEO — a FAIL-CLOSED hreflang rule, so a crawler is only ever pointed at pages
 *     that are actually served in a language Mercenta actually publishes; and
 *   · the declared MARKET-SPECIFIC MESSAGING SLOTS.
 *
 * It does NOT re-declare what other owners already own. Locales and currencies are the
 * ONE owner's job (`src/config/localisation.ts`, the locale · display · settlement
 * separation); the public routes and their metadata are the SEO foundation's job
 * (`src/lib/seo/publicRoutes.ts`). This module BRIDGES them: it adds the presentation
 * conventions and the hreflang rule, and it references the existing owners rather than
 * retyping them.
 *
 * THE HONEST, UNCOMPROMISING hreflang RULE
 * ----------------------------------------
 * A hreflang alternate points a search engine at a page in a specific language. Mercenta
 * today publishes content in **ONE** language only — English (en-GB). Declaring
 * `fr-FR` / `de-DE` / … alternates would FABRICATE pages that do not exist, which is
 * worse than declaring none: it tells a crawler to fetch a page Mercenta never serves.
 * So:
 *
 *   · `SERVED_CONTENT_LOCALES` is the HONEST list of languages the platform actually
 *     serves content in — it is `['en-GB']` today, and it CONTAINS the hreflang
 *     default so the rule is true by construction;
 *   · the hreflang rule is FAIL-CLOSED — an alternate is emitted ONLY for a served
 *     locale; a locale not in `SERVED_CONTENT_LOCALES` is REFUSED, never emitted;
 *   · `x-default` is always present and points at the SAME canonical URL as the served
 *     default (a self-reference), never at an invented locale page.
 *
 * `SUPPORTED_LOCALES` (the reader's locale SUGGESTIONS) is a DIFFERENT, WIDER concept and
 * is never confused with `SERVED_CONTENT_LOCALES` (the languages actually published).
 *
 * THE FORMATS ARE DERIVED, NOT RETYPED
 * ------------------------------------
 * The number separators below are read from `Intl.NumberFormat` for each locale, so they
 * CANNOT be hand-typed wrongly and cannot drift from the platform's own `Intl` runtime.
 * Only the genuinely non-derivable facts (date order, time cycle, week start, measurement
 * system) are declared, and the gate cross-checks them.
 *
 * NO AI, no clock, no randomness, no network: this module is fully deterministic.
 */
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@/config/localisation';

/* ── The languages the platform ACTUALLY serves content in (honest) ────────── */

/**
 * The locales Mercenta actually PUBLISHES content in. Today that is English (en-GB)
 * only. This is the ONLY list a hreflang alternate may be emitted for. Widening it
 * requires actually serving that language — the gate refuses a locale added here that
 * is not also a declared supported locale.
 */
export const SERVED_CONTENT_LOCALES: readonly string[] = ['en-GB'];

/** The hreflang default locale — must be a served content locale. */
export const HREFLANG_DEFAULT_LOCALE = 'en-GB';

/** The hreflang fallback for a reader in no specific language market. */
export const HREFLANG_X_DEFAULT = 'x-default';

/** Pinned: hreflang alternates may only ever be emitted for a SERVED content locale. */
export const HREFLANG_ONLY_FOR_SERVED_LOCALES = true;

/** Pinned: `x-default` always self-references the served default (never an invented page). */
export const HREFLANG_X_DEFAULT_IS_SELF = true;

/** Pinned: this is the ONE owner of the hreflang + format rules. */
export const ONE_LOCALISATION_SEO_OWNER = true;

/** Pinned: the SEO locale set IS the served content locale set (no second list). */
export const SEO_LOCALES_ARE_SERVED_CONTENT_LOCALES = true;

/** Pinned: a hreflang alternate requires a PUBLIC (indexable) route. */
export const HREFLANG_REQUIRES_PUBLIC_ROUTE = true;

/* ── The localized-URL strategy ────────────────────────────────────────────── */

export type LocalizedUrlStrategyId = 'path_prefix';

export interface LocalizedUrlStrategy {
  id: LocalizedUrlStrategyId;
  label: string;
  description: string;
  /** The segment that means "the default locale" — the bare path, no prefix. */
  defaultLocalePrefix: string;
  /** How a non-default served locale maps to a URL segment (a rule, not a page). */
  segmentRule: string;
}

/**
 * HOW a localized URL is shaped — declared ONCE. Today the default locale sits at the
 * path root and no other locale is served, so the ONLY URL in force is the default.
 * This is a RULE for the shape a future localized page would take; it claims no page
 * exists that does not.
 */
export const LOCALIZED_URL_STRATEGY: LocalizedUrlStrategy = {
  id: 'path_prefix',
  label: 'Path prefix (default locale at root)',
  description:
    'The default locale (en-GB) is served at the path root with no prefix; a future non-default locale would be served under its own language prefix (for example /fr/…). Only the default locale is served today.',
  defaultLocalePrefix: '',
  segmentRule: 'A non-default served locale is prefixed with its language subtag, lower-cased (for example "fr" for fr-FR).',
};

/* ── Number / date / time format conventions (separators DERIVED) ───────────── */

export interface LocaleFormatConvention {
  locale: string;
  /** Decimal separator, read from Intl.NumberFormat (never hand-typed). */
  decimalSeparator: string;
  /** Thousands/group separator, read from Intl.NumberFormat (never hand-typed). */
  groupSeparator: string;
  /** The order day, month and year appear in a short numeric date. */
  dateOrder: 'dmy' | 'mdy' | 'ymd';
  /** Whether times are shown on a 24-hour or 12-hour clock. */
  timeCycle: '24h' | '12h';
  /** Whether the week is presented as beginning on Monday. */
  weekStartsOnMonday: boolean;
  /** The measurement system a reader in this locale expects. */
  measurementSystem: 'metric' | 'imperial';
  /** A worked number example built from the DERIVED separators. */
  numbersExample: string;
  /** A worked short-date example built from the date order. */
  dateExample: string;
}

/** The non-derivable facts, declared once per locale. */
interface DeclaredLocaleFormat {
  locale: string;
  dateOrder: 'dmy' | 'mdy' | 'ymd';
  timeCycle: '24h' | '12h';
  weekStartsOnMonday: boolean;
  measurementSystem: 'metric' | 'imperial';
}

const DECLARED_LOCALE_FORMATS: readonly DeclaredLocaleFormat[] = [
  { locale: 'en-GB', dateOrder: 'dmy', timeCycle: '24h', weekStartsOnMonday: true, measurementSystem: 'metric' },
  { locale: 'en-US', dateOrder: 'mdy', timeCycle: '12h', weekStartsOnMonday: false, measurementSystem: 'imperial' },
  { locale: 'en-CA', dateOrder: 'ymd', timeCycle: '12h', weekStartsOnMonday: false, measurementSystem: 'metric' },
  { locale: 'en-ZW', dateOrder: 'dmy', timeCycle: '24h', weekStartsOnMonday: true, measurementSystem: 'metric' },
  { locale: 'en-ZA', dateOrder: 'dmy', timeCycle: '24h', weekStartsOnMonday: true, measurementSystem: 'metric' },
  { locale: 'en-NG', dateOrder: 'dmy', timeCycle: '24h', weekStartsOnMonday: true, measurementSystem: 'metric' },
  { locale: 'en-KE', dateOrder: 'dmy', timeCycle: '24h', weekStartsOnMonday: true, measurementSystem: 'metric' },
  { locale: 'en-AE', dateOrder: 'dmy', timeCycle: '24h', weekStartsOnMonday: true, measurementSystem: 'metric' },
  { locale: 'fr-FR', dateOrder: 'dmy', timeCycle: '24h', weekStartsOnMonday: true, measurementSystem: 'metric' },
  { locale: 'de-DE', dateOrder: 'dmy', timeCycle: '24h', weekStartsOnMonday: true, measurementSystem: 'metric' },
  { locale: 'es-ES', dateOrder: 'dmy', timeCycle: '24h', weekStartsOnMonday: true, measurementSystem: 'metric' },
  { locale: 'it-IT', dateOrder: 'dmy', timeCycle: '24h', weekStartsOnMonday: true, measurementSystem: 'metric' },
  { locale: 'nl-NL', dateOrder: 'dmy', timeCycle: '24h', weekStartsOnMonday: true, measurementSystem: 'metric' },
  { locale: 'pl-PL', dateOrder: 'dmy', timeCycle: '24h', weekStartsOnMonday: true, measurementSystem: 'metric' },
  { locale: 'tr-TR', dateOrder: 'dmy', timeCycle: '24h', weekStartsOnMonday: true, measurementSystem: 'metric' },
  { locale: 'pt-BR', dateOrder: 'dmy', timeCycle: '24h', weekStartsOnMonday: false, measurementSystem: 'metric' },
  { locale: 'ar-AE', dateOrder: 'dmy', timeCycle: '24h', weekStartsOnMonday: false, measurementSystem: 'metric' },
];

/** Read the decimal + group separators straight from the platform's own Intl runtime. */
function numberSeparators(locale: string): { decimalSeparator: string; groupSeparator: string } {
  // 1,234,567.5 — a value large enough to group in EVERY locale (some locales only group
  // at five digits, so a 4-digit sample would hide their group separator).
  const parts = new Intl.NumberFormat(locale).formatToParts(1234567.5);
  const decimalSeparator = parts.find((p) => p.type === 'decimal')?.value ?? '.';
  const groupSeparator = parts.find((p) => p.type === 'group')?.value ?? ',';
  return { decimalSeparator, groupSeparator };
}

function numbersExampleFor(decimalSeparator: string, groupSeparator: string): string {
  return `1${groupSeparator}234${decimalSeparator}5`;
}

function dateExampleFor(order: 'dmy' | 'mdy' | 'ymd'): string {
  if (order === 'mdy') return '01/31/2026';
  if (order === 'ymd') return '2026-01-31';
  return '31/01/2026';
}

/** Every declared supported locale's format conventions, separators derived from Intl. */
export const LOCALE_FORMAT_CONVENTIONS: Record<string, LocaleFormatConvention> = Object.fromEntries(
  DECLARED_LOCALE_FORMATS.map((d) => {
    const { decimalSeparator, groupSeparator } = numberSeparators(d.locale);
    return [
      d.locale,
      {
        locale: d.locale,
        decimalSeparator,
        groupSeparator,
        dateOrder: d.dateOrder,
        timeCycle: d.timeCycle,
        weekStartsOnMonday: d.weekStartsOnMonday,
        measurementSystem: d.measurementSystem,
        numbersExample: numbersExampleFor(decimalSeparator, groupSeparator),
        dateExample: dateExampleFor(d.dateOrder),
      } satisfies LocaleFormatConvention,
    ];
  })
);

/* ── The timezone of each canonical source market (declared facts) ─────────── */

/**
 * The authoritative IANA timezone used to present times for a reader in each canonical
 * source market. A market that spans several zones uses its commercial reference zone
 * (the same discipline as citing one marketplace): this is a declared, reviewable
 * reference, not a claim that a country has a single zone.
 */
export const MARKET_TIMEZONES: Record<string, string> = {
  GB: 'Europe/London',
  IE: 'Europe/Dublin',
  DE: 'Europe/Berlin',
  FR: 'Europe/Paris',
  NL: 'Europe/Amsterdam',
  IT: 'Europe/Rome',
  ES: 'Europe/Madrid',
  PL: 'Europe/Warsaw',
  TR: 'Europe/Istanbul',
  ZW: 'Africa/Harare',
  ZA: 'Africa/Johannesburg',
  KE: 'Africa/Nairobi',
  NG: 'Africa/Lagos',
  GH: 'Africa/Accra',
  MA: 'Africa/Casablanca',
  AE: 'Asia/Dubai',
  SA: 'Asia/Riyadh',
  IN: 'Asia/Kolkata',
  SG: 'Asia/Singapore',
  CN: 'Asia/Shanghai',
  JP: 'Asia/Tokyo',
  KR: 'Asia/Seoul',
  VN: 'Asia/Ho_Chi_Minh',
  ID: 'Asia/Jakarta',
  US: 'America/New_York',
  CA: 'America/Toronto',
  MX: 'America/Mexico_City',
  BR: 'America/Sao_Paulo',
  CL: 'America/Santiago',
  AU: 'Australia/Sydney',
  NZ: 'Pacific/Auckland',
};

/* ── Market-specific messaging slots (declared; no invented copy) ──────────── */

export interface MarketMessagingSlot {
  id: string;
  label: string;
  /** WHERE the market-specific value comes from — the canonical owner, never retyped here. */
  canonicalOwner: string;
}

/**
 * The SLOTS whose wording already varies by market, each naming the ONE owner that
 * holds the value. This module declares the slots so a surface can list them; it holds
 * NO copy of its own, so there is no second source of market wording to drift.
 */
export const MARKET_MESSAGING_SLOTS: readonly MarketMessagingSlot[] = [
  { id: 'display_currency', label: 'Display currency', canonicalOwner: 'src/config/localisation.ts' },
  { id: 'settlement_currency', label: 'Settlement currency (from commercial terms)', canonicalOwner: 'src/config/commercialModel.ts' },
  { id: 'number_format', label: 'Number formatting', canonicalOwner: 'src/config/localisationSeo.ts (LOCALE_FORMAT_CONVENTIONS)' },
  { id: 'date_format', label: 'Date formatting', canonicalOwner: 'src/config/localisationSeo.ts (LOCALE_FORMAT_CONVENTIONS)' },
  { id: 'timezone', label: 'Time zone', canonicalOwner: 'src/config/localisationSeo.ts (MARKET_TIMEZONES)' },
  { id: 'payment_rail', label: 'Payment rail', canonicalOwner: 'src/config/payouts.ts' },
  { id: 'public_promise', label: 'Public promise', canonicalOwner: 'src/config/positioning.ts' },
];

/* ── Refusals, basis and the pinned rules ──────────────────────────────────── */

export const LOCALISATION_SEO_REFUSALS = {
  localeNotServed:
    'HREFLANG_LOCALE_NOT_SERVED — that language is not one Mercenta actually publishes content in, so no hreflang alternate may point at it.',
  routeNotPublic:
    'HREFLANG_ROUTE_NOT_PUBLIC — only a public (indexable) route carries hreflang alternates; a private or unknown path is refused.',
  localeUnknown:
    'SEOFORMAT_LOCALE_UNKNOWN — that locale is not one the platform declares it can present, so its formatting is refused.',
} as const;

export const LOCALISATION_SEO_RULES: readonly string[] = [
  'hreflang alternates are emitted ONLY for a language Mercenta actually serves content in.',
  'x-default always self-references the served default locale — never an invented locale page.',
  'The SEO locale set IS the served content locale set; there is no second list.',
  'A hreflang alternate requires a public (indexable) route; a private or unknown path is refused.',
  'Number separators are read from the platform’s own Intl runtime, never hand-typed.',
  'Market-specific wording lives in its canonical owner; this framework declares the slots, not the copy.',
] as const;

export const LOCALISATION_SEO_BASIS =
  'Search metadata and reader-facing formatting are the same fact seen twice: a crawler and a reader must be told the same language and the same locale conventions. Mercenta publishes content in one language today (en-GB), so every hreflang alternate is a fail-closed self-reference and no page is ever advertised that is not actually served.';

export const LOCALISATION_SEO_DISCLAIMER =
  'A hreflang alternate is a statement that a page is served in a language; it is only ever emitted for a language Mercenta actually publishes, and the SEO locale set is exactly the served content locale set.';

/* ── Module-load guards (fail closed) ──────────────────────────────────────── */

{
  if (SERVED_CONTENT_LOCALES.length === 0) {
    throw new Error('[localisationSeo] at least one served content locale must be declared');
  }
  const supported = new Set(SUPPORTED_LOCALES);
  for (const locale of SERVED_CONTENT_LOCALES) {
    if (!supported.has(locale)) {
      throw new Error(`[localisationSeo] served content locale "${locale}" is not a declared supported locale`);
    }
  }
  if (!SERVED_CONTENT_LOCALES.includes(HREFLANG_DEFAULT_LOCALE)) {
    throw new Error('[localisationSeo] the hreflang default must be a served content locale');
  }
  if (!SERVED_CONTENT_LOCALES.includes(DEFAULT_LOCALE)) {
    throw new Error('[localisationSeo] the supported default locale must be served (SEO locales = served content locales)');
  }
  // Every declared supported locale must carry a format convention (no locale left unformatted).
  for (const locale of SUPPORTED_LOCALES) {
    if (!LOCALE_FORMAT_CONVENTIONS[locale]) {
      throw new Error(`[localisationSeo] supported locale "${locale}" has no declared format convention`);
    }
  }
  // Every format convention must name a supported locale and carry distinct separators.
  for (const c of Object.values(LOCALE_FORMAT_CONVENTIONS)) {
    if (!supported.has(c.locale)) {
      throw new Error(`[localisationSeo] format convention "${c.locale}" is not a declared supported locale`);
    }
    if (!c.decimalSeparator || !c.groupSeparator) {
      throw new Error(`[localisationSeo] format convention "${c.locale}" is missing a separator`);
    }
    if (c.decimalSeparator === c.groupSeparator) {
      throw new Error(`[localisationSeo] format convention "${c.locale}" uses the same decimal and group separator`);
    }
  }
  // Every declared timezone must be a non-empty IANA-style zone.
  for (const [market, zone] of Object.entries(MARKET_TIMEZONES)) {
    if (!/^[A-Za-z]+\/[A-Za-z_]+(\/[A-Za-z_]+)?$/.test(zone)) {
      throw new Error(`[localisationSeo] market "${market}" has an invalid IANA timezone "${zone}"`);
    }
  }
  // Every messaging slot must name a canonical owner (never held here).
  for (const slot of MARKET_MESSAGING_SLOTS) {
    if (!slot.canonicalOwner) {
      throw new Error(`[localisationSeo] messaging slot "${slot.id}" must name its canonical owner`);
    }
  }
}

