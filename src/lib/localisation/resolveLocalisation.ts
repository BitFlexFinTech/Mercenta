/**
 * §PHASE 9 — THE LOCALISATION RESOLVER — the pure rules over the ONE owner.
 *
 * The owner (`src/config/localisation.ts`) declares the vocabulary; this module
 * applies it. It is PURE and DETERMINISTIC: no clock, no randomness, no network,
 * no AI.
 *
 * THE THREE RULES IT ENFORCES:
 *   · an EXPLICIT choice always wins and is never overwritten;
 *   · a detected country produces a SUGGESTION only (`forced` is always false);
 *   · the SETTLEMENT currency is NEVER inferred — it is taken only from the
 *     commercial terms the caller supplies, else it is `null` and the reason is
 *     noted.
 *
 * An unsupported locale/currency is REFUSED (not presented) and the resolution
 * falls back to the suggestion or the declared default instead.
 */
import {
  COUNTRY_LOCALISATION_SUGGESTIONS,
  CURRENCY_CONCEPTS_ARE_SEPARATE,
  DEFAULT_DISPLAY_CURRENCY,
  DEFAULT_LOCALE,
  LOCALISATION_BASIS,
  LOCALISATION_DISCLAIMER,
  LOCALISATION_REFUSALS,
  SUGGESTIONS_NEVER_FORCE,
  SUPPORTED_CURRENCIES,
  SUPPORTED_LOCALES,
  LOCALISATION_CONCEPTS,
  type CountryLocalisationSuggestion,
} from '@/config/localisation';
import { SOURCE_MARKETS } from '@/lib/intelligence/acquisitionStrategy';

/** Where a resolved value came from. */
export type LocalisationFieldSource = 'explicit' | 'suggestion' | 'default';

/** TRUE only for a locale the platform declares it can present. */
export function isSupportedLocale(value: string | null | undefined): boolean {
  return typeof value === 'string' && SUPPORTED_LOCALES.includes(value);
}

/** TRUE only for a currency the platform declares it can display. */
export function isSupportedCurrency(value: string | null | undefined): boolean {
  return typeof value === 'string' && SUPPORTED_CURRENCIES.includes(value.toUpperCase());
}

export interface LocalisationResolution {
  locale: string;
  displayCurrency: string;
  /** The commercial-terms currency, or `null` (never inferred). */
  settlementCurrency: string | null;
  localeSource: LocalisationFieldSource;
  displayCurrencySource: LocalisationFieldSource;
  /** TRUE when at least one value came from a country-based suggestion. */
  suggested: boolean;
  /** ALWAYS false — a resolution never forces an explicit choice. */
  forced: false;
  /** Stated reasons (a refusal, or why the settlement currency is absent). */
  notes: string[];
}

/**
 * Resolve the three concepts for a reader. Pure.
 *
 * `settlementCurrency` is passed through ONLY when it is a supported currency; it
 * is never derived from `explicitLocale`, `explicitDisplayCurrency` or
 * `detectedCountry`.
 */
export function resolveLocalisation(input: {
  explicitLocale?: string | null;
  explicitDisplayCurrency?: string | null;
  detectedCountry?: string | null;
  settlementCurrency?: string | null;
}): LocalisationResolution {
  const notes: string[] = [];
  const country =
    typeof input.detectedCountry === 'string' && input.detectedCountry.trim()
      ? input.detectedCountry.trim().toUpperCase()
      : null;
  const suggestion = country ? COUNTRY_LOCALISATION_SUGGESTIONS[country] : undefined;

  let locale = DEFAULT_LOCALE;
  let localeSource: LocalisationFieldSource = 'default';
  if (input.explicitLocale) {
    if (isSupportedLocale(input.explicitLocale)) {
      locale = input.explicitLocale;
      localeSource = 'explicit';
    } else {
      notes.push(`${LOCALISATION_REFUSALS.unknownLocale} (${input.explicitLocale})`);
    }
  }
  if (localeSource !== 'explicit' && suggestion) {
    locale = suggestion.suggestedLocale;
    localeSource = 'suggestion';
  }

  let displayCurrency = DEFAULT_DISPLAY_CURRENCY;
  let displayCurrencySource: LocalisationFieldSource = 'default';
  if (input.explicitDisplayCurrency) {
    if (isSupportedCurrency(input.explicitDisplayCurrency)) {
      displayCurrency = input.explicitDisplayCurrency.toUpperCase();
      displayCurrencySource = 'explicit';
    } else {
      notes.push(`${LOCALISATION_REFUSALS.unknownCurrency} (${input.explicitDisplayCurrency})`);
    }
  }
  if (displayCurrencySource !== 'explicit' && suggestion) {
    displayCurrency = suggestion.suggestedDisplayCurrency;
    displayCurrencySource = 'suggestion';
  }

  let settlementCurrency: string | null = null;
  if (input.settlementCurrency) {
    if (isSupportedCurrency(input.settlementCurrency)) {
      settlementCurrency = input.settlementCurrency.toUpperCase();
    } else {
      notes.push(`${LOCALISATION_REFUSALS.unknownCurrency} (${input.settlementCurrency})`);
    }
  }

  const suggested = localeSource === 'suggestion' || displayCurrencySource === 'suggestion';
  if (!settlementCurrency && suggested) notes.push(LOCALISATION_REFUSALS.settlementNotInferred);

  return {
    locale,
    displayCurrency,
    settlementCurrency,
    localeSource,
    displayCurrencySource,
    suggested,
    forced: false,
    notes,
  };
}

/* ── The founder-facing summary over the canonical source markets ────────── */

export interface LocalisationSummary {
  concepts: { id: string; label: string; description: string; source: string }[];
  conceptsSeparate: boolean;
  suggestionsNeverForce: boolean;
  defaultLocale: string;
  defaultDisplayCurrency: string;
  markets: {
    countryCode: string;
    countryLabel: string;
    suggestedLocale: string;
    suggestedDisplayCurrency: string;
  }[];
  basis: string;
  disclaimer: string;
}

/**
 * Summarise the framework for the founder surface: the SAME suggestions the
 * resolver uses, but ONLY for countries the platform canonically sources from
 * (`SOURCE_MARKETS`), so a suggestion can never be offered for a market the
 * platform does not operate. Derived — nothing is retyped.
 */
export function buildLocalisationSummary(): LocalisationSummary {
  const markets = Object.keys(SOURCE_MARKETS)
    .map((code) => COUNTRY_LOCALISATION_SUGGESTIONS[code])
    .filter((s): s is CountryLocalisationSuggestion => Boolean(s))
    .map((s) => ({
      countryCode: s.countryCode,
      countryLabel: SOURCE_MARKETS[s.countryCode]?.label ?? s.countryCode,
      suggestedLocale: s.suggestedLocale,
      suggestedDisplayCurrency: s.suggestedDisplayCurrency,
    }));
  return {
    concepts: Object.values(LOCALISATION_CONCEPTS).map((c) => ({
      id: c.id,
      label: c.label,
      description: c.description,
      source: c.source,
    })),
    conceptsSeparate: CURRENCY_CONCEPTS_ARE_SEPARATE,
    suggestionsNeverForce: SUGGESTIONS_NEVER_FORCE,
    defaultLocale: DEFAULT_LOCALE,
    defaultDisplayCurrency: DEFAULT_DISPLAY_CURRENCY,
    markets,
    basis: LOCALISATION_BASIS,
    disclaimer: LOCALISATION_DISCLAIMER,
  };
}

