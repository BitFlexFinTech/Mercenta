/**
 * §PHASE 9 — THE COUNTRY RESOLVER — the pure rules over the ONE owner.
 *
 * The owner (`src/config/countryFramework.ts`) declares the vocabulary; this module
 * applies it. It is PURE and DETERMINISTIC: no clock, no randomness, no network,
 * no AI.
 *
 * THE RULES IT ENFORCES:
 *   · a country holds the marketplace role ONLY where the channel publishes a
 *     marketplace id — and Zimbabwe NEVER does;
 *   · a brand-origin market is exactly the canonical source-market list — there is
 *     no second, hand-maintained list;
 *   · the priority / localisation-only / future roles come only from Mercenta’s own
 *     declared policy sets;
 *   · an unlisted country resolves to NO roles and is REFUSED (fail closed) — it is
 *     never guessed into a role it has not earned.
 */
import {
  AMAZON_MARKETPLACES,
  AMAZON_MARKETPLACE_SOURCE,
  COUNTRY_FRAMEWORK_BASIS,
  COUNTRY_FRAMEWORK_DISCLAIMER,
  COUNTRY_PRIORITY_POLICY_CONFIGURED,
  COUNTRY_ROLES,
  DEMO_ACCELERATOR_PRIORITY_MARKETS,
  DEMO_ACQUISITION_PRIORITY_MARKETS,
  FUTURE_MARKETS,
  HOME_ORIGIN_MARKET,
  LOCALIZATION_ONLY_MARKETS,
  ZIMBABWE_IS_NEVER_AN_AMAZON_MARKETPLACE,
  type AmazonMarketplace,
  type CountryContinent,
  type CountryRole,
  type CountryRoleDefinition,
} from '@/config/countryFramework';
import { SOURCE_MARKETS } from '@/lib/intelligence/acquisitionStrategy';

/** Normalise a country (name-free; ISO alpha-2 only) to its canonical code, or null. */
function normalizeCode(country: string | null | undefined): string | null {
  if (typeof country !== 'string') return null;
  const trimmed = country.trim();
  return trimmed ? trimmed.toUpperCase() : null;
}

export interface CountryResolution {
  code: string;
  label: string;
  continent: CountryContinent;
  /** The roles the country holds — may be empty only for an unlisted country. */
  roles: CountryRole[];
  /** The channel's marketplace id where the country is a marketplace, else null. */
  marketplaceId: string | null;
}

/** TRUE only where the channel publishes a marketplace id for this country. */
export function isAmazonMarketplace(country: string | null | undefined): boolean {
  const code = normalizeCode(country);
  return Boolean(code && AMAZON_MARKETPLACES[code]);
}

/** The marketplace record for a country, or null (fail closed). */
export function marketplaceFor(country: string | null | undefined): AmazonMarketplace | null {
  const code = normalizeCode(country);
  return code ? AMAZON_MARKETPLACES[code] ?? null : null;
}

/**
 * The roles a country holds. FAIL CLOSED: an unlisted country (and a null/blank
 * input) yields an EMPTY list — it is never guessed into a role.
 */
export function rolesForCountry(country: string | null | undefined): CountryRole[] {
  const code = normalizeCode(country);
  if (!code) return [];
  const roles: CountryRole[] = [];
  if (AMAZON_MARKETPLACES[code]) roles.push('amazon_marketplace');
  if (SOURCE_MARKETS[code]) roles.push('brand_origin_market');
  if (DEMO_ACQUISITION_PRIORITY_MARKETS.includes(code)) roles.push('acquisition_priority_market');
  if (DEMO_ACCELERATOR_PRIORITY_MARKETS.includes(code)) roles.push('accelerator_priority_market');
  if (LOCALIZATION_ONLY_MARKETS.includes(code)) roles.push('localization_only');
  if (FUTURE_MARKETS.includes(code)) roles.push('future_market');
  return roles;
}

/** Resolve one country to its label, continent and roles — or null (fail closed). */
export function resolveCountry(country: string | null | undefined): CountryResolution | null {
  const code = normalizeCode(country);
  if (!code) return null;
  const roles = rolesForCountry(code);
  if (roles.length === 0) return null;
  const marketplace = AMAZON_MARKETPLACES[code];
  const origin = SOURCE_MARKETS[code];
  const label = marketplace?.label ?? origin?.label ?? code;
  const continent: CountryContinent =
    marketplace?.continent ?? (origin?.region as CountryContinent) ?? 'europe';
  return {
    code,
    label,
    continent,
    roles,
    marketplaceId: marketplace?.marketplaceId ?? null,
  };
}

/** Every declared country that holds a given role, sorted by label. */
export function countriesByRole(role: CountryRole): CountryResolution[] {
  return allCountries().filter((c) => c.roles.includes(role));
}

/** Every country the framework declares (a resolver, never a second list). */
function allCountries(): CountryResolution[] {
  const codes = new Set<string>([
    ...Object.keys(AMAZON_MARKETPLACES),
    ...Object.keys(SOURCE_MARKETS),
    ...DEMO_ACQUISITION_PRIORITY_MARKETS,
    ...DEMO_ACCELERATOR_PRIORITY_MARKETS,
    ...LOCALIZATION_ONLY_MARKETS,
    ...FUTURE_MARKETS,
  ]);
  return [...codes]
    .map((code) => resolveCountry(code))
    .filter((c): c is CountryResolution => c !== null)
    .sort((a, b) => a.label.localeCompare(b.label));
}

/* ── The founder-facing summary ──────────────────────────────────────────── */

export interface CountryFrameworkSummary {
  roles: CountryRoleDefinition[];
  countryCount: number;
  marketplaceCount: number;
  countries: CountryResolution[];
  byRole: Record<CountryRole, number>;
  /** TRUE only when Zimbabwe holds no marketplace role (pinned invariant). */
  zimbabweNeverMarketplace: boolean;
  /** FALSE until the Founder sets a production priority policy. */
  priorityPolicyConfigured: boolean;
  basis: string;
  disclaimer: string;
  source: string;
}

/** Summarise the framework for the founder surface. Derived — nothing retyped. */
export function buildCountryFrameworkSummary(): CountryFrameworkSummary {
  const countries = allCountries();
  const byRole = Object.keys(COUNTRY_ROLES).reduce(
    (acc, id) => {
      acc[id as CountryRole] = countries.filter((c) => c.roles.includes(id as CountryRole)).length;
      return acc;
    },
    {} as Record<CountryRole, number>
  );
  return {
    roles: Object.values(COUNTRY_ROLES),
    countryCount: countries.length,
    marketplaceCount: countries.filter((c) => c.roles.includes('amazon_marketplace')).length,
    countries,
    byRole,
    zimbabweNeverMarketplace:
      ZIMBABWE_IS_NEVER_AN_AMAZON_MARKETPLACE && !isAmazonMarketplace(HOME_ORIGIN_MARKET),
    priorityPolicyConfigured: COUNTRY_PRIORITY_POLICY_CONFIGURED,
    basis: COUNTRY_FRAMEWORK_BASIS,
    disclaimer: COUNTRY_FRAMEWORK_DISCLAIMER,
    source: AMAZON_MARKETPLACE_SOURCE,
  };
}

