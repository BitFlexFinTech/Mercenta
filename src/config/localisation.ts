/**
 * §PHASE 9 — THE LOCALISATION / CURRENCY FRAMEWORK — the ONE owner of the rules.
 *
 * THREE CONCEPTS THAT MUST NEVER BE COLLAPSED:
 *
 *   1. LOCALE               how a person reads language, numbers and dates.
 *   2. DISPLAY CURRENCY     the currency an amount is SHOWN in to a reader.
 *   3. SETTLEMENT CURRENCY  the currency the COMMERCIAL TERMS are expressed in —
 *                           what the brand is actually paid in.
 *
 * They are different facts. A UK reader may read a Zimbabwean brand's figures in
 * one display currency while the brand is settled in another; and a brand's
 * settlement currency is a COMMERCIAL-TERMS fact that is NEVER inferred from the
 * reader's locale or a display choice. Collapsing any two of them is how a
 * platform starts showing a brand a number it was never paid.
 *
 * COUNTRY DETECTION RECOMMENDS, NEVER FORCES. A detected country yields a
 * SUGGESTED locale and display currency; an EXPLICIT choice always wins and is
 * never overwritten. `SUGGESTIONS_NEVER_FORCE` and
 * `CURRENCY_CONCEPTS_ARE_SEPARATE` are pinned `true` so a change that collapsed
 * the concepts or silently forced a suggestion fails the gate.
 *
 * HONEST BASIS: the recommendations below are DEFAULTS a reader may accept, not a
 * claim about any brand's commercial terms. The platform declares no production
 * settlement currency here — that lives on the commercial relationship.
 */

/** The three concepts, named once. */
export type LocalisationConcept = 'locale' | 'display_currency' | 'settlement_currency';

export interface LocalisationConceptDefinition {
  id: LocalisationConcept;
  label: string;
  description: string;
  /** Where the value genuinely comes from (never collapsed with another concept). */
  source: string;
}

export const LOCALISATION_CONCEPTS: Record<LocalisationConcept, LocalisationConceptDefinition> = {
  locale: {
    id: 'locale',
    label: 'Locale',
    description: 'How language, numbers and dates are presented to a reader.',
    source: 'The reader’s own locale — an explicit choice, else a country-based suggestion, else the default.',
  },
  display_currency: {
    id: 'display_currency',
    label: 'Display currency',
    description: 'The currency an amount is SHOWN in to a reader.',
    source: 'The reader’s own display preference — never the brand’s commercial terms.',
  },
  settlement_currency: {
    id: 'settlement_currency',
    label: 'Settlement currency',
    description: 'The currency the COMMERCIAL TERMS are expressed in — what the brand is actually paid in.',
    source: 'The commercial relationship ONLY. Never inferred from the locale, the display currency or a detected country.',
  },
};

/** Pinned: the three concepts are SEPARATE and are never collapsed. */
export const CURRENCY_CONCEPTS_ARE_SEPARATE = true;

/** Pinned: a country-based suggestion is a RECOMMENDATION and is never forced. */
export const SUGGESTIONS_NEVER_FORCE = true;

/* ── Defaults + the declared supported sets ─────────────────────────────── */

/** The default locale, used only when nothing else is known. */
export const DEFAULT_LOCALE = 'en-GB';

/** The default display currency, used only when nothing else is known. */
export const DEFAULT_DISPLAY_CURRENCY = 'GBP';

/** BCP-47 locale tags the platform declares it can present. */
export const SUPPORTED_LOCALES: readonly string[] = [
  'en-GB', 'en-US', 'en-CA', 'en-ZW', 'en-ZA', 'en-NG', 'en-KE', 'en-AE',
  'fr-FR', 'de-DE', 'es-ES', 'it-IT', 'nl-NL', 'pl-PL', 'tr-TR', 'pt-BR', 'ar-AE',
];

/** ISO 4217 currencies the platform declares it can display. */
export const SUPPORTED_CURRENCIES: readonly string[] = [
  'GBP', 'USD', 'EUR', 'ZAR', 'AED', 'INR', 'CAD', 'AUD', 'NGN', 'KES', 'TRY', 'BRL',
];

/** The refusals this owner states — an unsupported value is never presented. */
export const LOCALISATION_REFUSALS = {
  unknownLocale: 'LOCALE_UNKNOWN — that locale is not one the platform declares it can present.',
  unknownCurrency: 'CURRENCY_UNKNOWN — that currency is not one the platform declares it can display.',
  settlementNotInferred:
    'SETTLEMENT_NOT_INFERRED — the settlement currency comes from the commercial terms only, never from the locale, the display currency or a detected country.',
} as const;

/** The rules, stated once and pinned by the gate. */
export const LOCALISATION_RULES: readonly string[] = [
  'Locale, display currency and settlement currency are three separate concepts.',
  'An explicit choice always wins; a country-based suggestion is never forced.',
  'The settlement currency comes from the commercial terms only and is never inferred.',
  'An unsupported locale or currency is refused, never silently presented.',
  'With nothing to go on, the declared defaults are used and the basis is stated.',
] as const;

/* ── Country → SUGGESTED locale + display currency (a recommendation only) ── */

export interface CountryLocalisationSuggestion {
  /** ISO 3166-1 alpha-2 — the SAME key the canonical source-market map uses. */
  countryCode: string;
  suggestedLocale: string;
  suggestedDisplayCurrency: string;
}

/**
 * A reader in this country is SUGGESTED these values. They are NEVER applied to
 * anyone else's figures and NEVER override an explicit choice, and they say
 * nothing about any brand's settlement currency.
 *
 * The gate asserts every key here is a declared canonical source market, so a
 * suggestion can never be offered for a country the platform does not source
 * from, and that every suggested locale/currency is in the supported sets.
 */
export const COUNTRY_LOCALISATION_SUGGESTIONS: Record<string, CountryLocalisationSuggestion> = {
  GB: { countryCode: 'GB', suggestedLocale: 'en-GB', suggestedDisplayCurrency: 'GBP' },
  US: { countryCode: 'US', suggestedLocale: 'en-US', suggestedDisplayCurrency: 'USD' },
  CA: { countryCode: 'CA', suggestedLocale: 'en-CA', suggestedDisplayCurrency: 'CAD' },
  ZW: { countryCode: 'ZW', suggestedLocale: 'en-ZW', suggestedDisplayCurrency: 'USD' },
  ZA: { countryCode: 'ZA', suggestedLocale: 'en-ZA', suggestedDisplayCurrency: 'ZAR' },
  NG: { countryCode: 'NG', suggestedLocale: 'en-NG', suggestedDisplayCurrency: 'NGN' },
  KE: { countryCode: 'KE', suggestedLocale: 'en-KE', suggestedDisplayCurrency: 'KES' },
  AE: { countryCode: 'AE', suggestedLocale: 'en-AE', suggestedDisplayCurrency: 'AED' },
  FR: { countryCode: 'FR', suggestedLocale: 'fr-FR', suggestedDisplayCurrency: 'EUR' },
  DE: { countryCode: 'DE', suggestedLocale: 'de-DE', suggestedDisplayCurrency: 'EUR' },
  ES: { countryCode: 'ES', suggestedLocale: 'es-ES', suggestedDisplayCurrency: 'EUR' },
  IT: { countryCode: 'IT', suggestedLocale: 'it-IT', suggestedDisplayCurrency: 'EUR' },
  NL: { countryCode: 'NL', suggestedLocale: 'nl-NL', suggestedDisplayCurrency: 'EUR' },
  PL: { countryCode: 'PL', suggestedLocale: 'pl-PL', suggestedDisplayCurrency: 'EUR' },
  TR: { countryCode: 'TR', suggestedLocale: 'tr-TR', suggestedDisplayCurrency: 'TRY' },
  BR: { countryCode: 'BR', suggestedLocale: 'pt-BR', suggestedDisplayCurrency: 'BRL' },
};

/** The declared basis/policy copy, sourced from this owner (never retyped in a view). */
export const LOCALISATION_BASIS =
  'Locale, display currency and settlement currency are three separate concepts. A detected country produces a SUGGESTION only — an explicit choice always wins — and a brand’s settlement currency comes from its commercial terms, never from the reader’s locale.';

export const LOCALISATION_DISCLAIMER =
  'A suggestion is a default a reader may accept; it is not a statement about any brand’s commercial terms.';

