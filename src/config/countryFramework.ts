/**
 * §PHASE 9 — THE COUNTRY FRAMEWORK — the ONE owner of the rules.
 *
 * Every country Mercenta deals with is classified into ONE OR MORE of six roles:
 *
 *   · AMAZON_MARKETPLACE            a country where the retail channel actually
 *                                   operates a marketplace (FACTUAL — sourced).
 *   · BRAND_ORIGIN_MARKET          a market Mercenta sources brands FROM.
 *   · ACQUISITION_PRIORITY_MARKET  a brand-origin market prioritised for outreach.
 *   · ACCELERATOR_PRIORITY_MARKET  a market in the acceleration programme.
 *   · LOCALIZATION_ONLY            a market localised for but NOT sourced from and
 *                                   NOT a marketplace.
 *   · FUTURE_MARKET                a market considered for the future, not active.
 *
 * A country may hold SEVERAL roles (the United Kingdom is both a marketplace and a
 * brand-origin market); it may never hold a role it has not earned.
 *
 * TWO KINDS OF ROLE, NEVER BLURRED:
 *   · FACTUAL — `amazon_marketplace`. Membership is a published fact and is CITED
 *     to its source; it is NOT a Mercenta opinion.
 *   · POLICY  — the priority / localisation-only / future roles. These are
 *     MERCENTA'S OWN decisions, declared here (the same discipline as
 *     `src/config/commercialModel.ts`), and are shipped UNCONFIGURED with a
 *     labelled DEMO illustration rather than invented as a production decision.
 *
 * THE ONE HARD INVARIANT:
 *   **Zimbabwe (ZW) is technically supported as an operating/home market and must
 *   NEVER be represented as an Amazon marketplace.** It is declared a brand-origin
 *   market here and the gate fails if any change ever makes it a marketplace. The
 *   sourced marketplace list below does not contain Zimbabwe, so the invariant is
 *   true by construction AND pinned (`ZIMBABWE_IS_NEVER_AN_AMAZON_MARKETPLACE`).
 *
 * The COMMERCIAL RELATIONSHIP is unaffected: this framework classifies countries,
 * it never changes a brand's commercial model, compliance or settlement.
 */

/* ── The six roles ───────────────────────────────────────────────────────── */

export type CountryRole =
  | 'amazon_marketplace'
  | 'brand_origin_market'
  | 'acquisition_priority_market'
  | 'accelerator_priority_market'
  | 'localization_only'
  | 'future_market';

/** FACTUAL roles are sourced externally; POLICY roles are Mercenta's own. */
export type CountryRoleKind = 'factual' | 'policy';

export interface CountryRoleDefinition {
  id: CountryRole;
  label: string;
  description: string;
  kind: CountryRoleKind;
  /** Where a country earns this role. */
  source: string;
}

export const COUNTRY_ROLES: Record<CountryRole, CountryRoleDefinition> = {
  amazon_marketplace: {
    id: 'amazon_marketplace',
    label: 'Amazon marketplace',
    description: 'A country where the retail channel actually operates a marketplace.',
    kind: 'factual',
    source:
      'Amazon’s own published marketplace-IDs reference (SP-API “Marketplace IDs”). Membership is a fact, not a Mercenta opinion.',
  },
  brand_origin_market: {
    id: 'brand_origin_market',
    label: 'Brand-origin market',
    description: 'A market Mercenta sources brands FROM (destination is always the UK).',
    kind: 'factual',
    source: 'The canonical source-market owner (`src/lib/intelligence/acquisitionStrategy.ts` → `SOURCE_MARKETS`).',
  },
  acquisition_priority_market: {
    id: 'acquisition_priority_market',
    label: 'Acquisition priority market',
    description: 'A brand-origin market Mercenta prioritises for outreach.',
    kind: 'policy',
    source: 'A Mercenta policy decision (declared here; shipped unconfigured until the Founder sets it).',
  },
  accelerator_priority_market: {
    id: 'accelerator_priority_market',
    label: 'Accelerator priority market',
    description: 'A market in Mercenta’s acceleration programme.',
    kind: 'policy',
    source: 'A Mercenta policy decision (declared here; shipped unconfigured until the Founder sets it).',
  },
  localization_only: {
    id: 'localization_only',
    label: 'Localisation-only market',
    description: 'A market the platform localises for, but neither sources from nor is a marketplace in.',
    kind: 'policy',
    source: 'A Mercenta policy decision (declared here; empty until the Founder sets it).',
  },
  future_market: {
    id: 'future_market',
    label: 'Future market',
    description: 'A market considered for the future but not active today.',
    kind: 'policy',
    source: 'A Mercenta policy decision (declared here; empty until the Founder sets it).',
  },
};

/** Pinned: Zimbabwe is NEVER an Amazon marketplace (it is a brand-origin market). */
export const ZIMBABWE_IS_NEVER_AN_AMAZON_MARKETPLACE = true;

/** Pinned: a country holds the marketplace role ONLY with a sourced marketplace id. */
export const MARKETPLACE_ROLE_REQUIRES_A_SOURCED_ID = true;

/** The country that must never be a marketplace, named once. */
export const HOME_ORIGIN_MARKET = 'ZW';

/* ── The continent vocabulary (REUSED from the canonical source-market owner) ── */

export type CountryContinent =
  | 'uk'
  | 'europe'
  | 'africa'
  | 'middle_east'
  | 'asia'
  | 'north_america'
  | 'latin_america'
  | 'oceania';

/* ── AMAZON_MARKETPLACE — FACTUAL, sourced ───────────────────────────────── */

export interface AmazonMarketplace {
  /** ISO 3166-1 alpha-2 — the SAME key the canonical source-market map uses. */
  iso2: string;
  label: string;
  /** The channel's own marketplace identifier for this country. */
  marketplaceId: string;
  /** The country code AS THE SOURCE LISTS IT (the source lists GB as “UK”). */
  sourceCountryCode: string;
  continent: CountryContinent;
  source: string;
}

/** The ONE citation for the marketplace list (Amazon’s own reference). */
export const AMAZON_MARKETPLACE_SOURCE =
  'Amazon SP-API — “Marketplace IDs” (developer-docs.amazon.com/sp-api/docs/marketplace-ids), the channel’s own published list.';

/**
 * The countries where the retail channel operates a marketplace. The id for the UK
 * is the SAME value as `UK_MARKETPLACE_ID` (imported, never retyped) — the gate
 * asserts they are equal; the North American ids are asserted to be members of the
 * canonical `CHANNEL_NA_MARKETPLACE_IDS`. NOTHING here is a Mercenta opinion.
 *
 * Zimbabwe is DELIBERATELY absent: it is an operating/home market, never a
 * marketplace.
 */
export const AMAZON_MARKETPLACES: Record<string, AmazonMarketplace> = {
  CA: { iso2: 'CA', label: 'Canada', marketplaceId: 'A2EUQ1WTGCTBG2', sourceCountryCode: 'CA', continent: 'north_america', source: AMAZON_MARKETPLACE_SOURCE },
  US: { iso2: 'US', label: 'United States', marketplaceId: 'ATVPDKIKX0DER', sourceCountryCode: 'US', continent: 'north_america', source: AMAZON_MARKETPLACE_SOURCE },
  MX: { iso2: 'MX', label: 'Mexico', marketplaceId: 'A1AM78C64UM0Y8', sourceCountryCode: 'MX', continent: 'latin_america', source: AMAZON_MARKETPLACE_SOURCE },
  BR: { iso2: 'BR', label: 'Brazil', marketplaceId: 'A2Q3Y263D00KWC', sourceCountryCode: 'BR', continent: 'latin_america', source: AMAZON_MARKETPLACE_SOURCE },
  IE: { iso2: 'IE', label: 'Ireland', marketplaceId: 'A28R8C7NBKEWEA', sourceCountryCode: 'IE', continent: 'europe', source: AMAZON_MARKETPLACE_SOURCE },
  ES: { iso2: 'ES', label: 'Spain', marketplaceId: 'A1RKKUPIHCS9HS', sourceCountryCode: 'ES', continent: 'europe', source: AMAZON_MARKETPLACE_SOURCE },
  GB: { iso2: 'GB', label: 'United Kingdom', marketplaceId: 'A1F83G8C2ARO7P', sourceCountryCode: 'UK', continent: 'uk', source: AMAZON_MARKETPLACE_SOURCE },
  FR: { iso2: 'FR', label: 'France', marketplaceId: 'A13V1IB3VIYZZH', sourceCountryCode: 'FR', continent: 'europe', source: AMAZON_MARKETPLACE_SOURCE },
  BE: { iso2: 'BE', label: 'Belgium', marketplaceId: 'AMEN7PMS3EDWL', sourceCountryCode: 'BE', continent: 'europe', source: AMAZON_MARKETPLACE_SOURCE },
  NL: { iso2: 'NL', label: 'Netherlands', marketplaceId: 'A1805IZSGTT6HS', sourceCountryCode: 'NL', continent: 'europe', source: AMAZON_MARKETPLACE_SOURCE },
  DE: { iso2: 'DE', label: 'Germany', marketplaceId: 'A1PA6795UKMFR9', sourceCountryCode: 'DE', continent: 'europe', source: AMAZON_MARKETPLACE_SOURCE },
  IT: { iso2: 'IT', label: 'Italy', marketplaceId: 'APJ6JRA9NG5V4', sourceCountryCode: 'IT', continent: 'europe', source: AMAZON_MARKETPLACE_SOURCE },
  SE: { iso2: 'SE', label: 'Sweden', marketplaceId: 'A2NODRKZP88ZB9', sourceCountryCode: 'SE', continent: 'europe', source: AMAZON_MARKETPLACE_SOURCE },
  ZA: { iso2: 'ZA', label: 'South Africa', marketplaceId: 'AE08WJ6YKNBMC', sourceCountryCode: 'ZA', continent: 'africa', source: AMAZON_MARKETPLACE_SOURCE },
  PL: { iso2: 'PL', label: 'Poland', marketplaceId: 'A1C3SOZRARQ6R3', sourceCountryCode: 'PL', continent: 'europe', source: AMAZON_MARKETPLACE_SOURCE },
  EG: { iso2: 'EG', label: 'Egypt', marketplaceId: 'ARBP9OOSHTCHU', sourceCountryCode: 'EG', continent: 'africa', source: AMAZON_MARKETPLACE_SOURCE },
  TR: { iso2: 'TR', label: 'Türkiye', marketplaceId: 'A33AVAJ2PDY3EV', sourceCountryCode: 'TR', continent: 'europe', source: AMAZON_MARKETPLACE_SOURCE },
  SA: { iso2: 'SA', label: 'Saudi Arabia', marketplaceId: 'A17E79C6D8DWNP', sourceCountryCode: 'SA', continent: 'middle_east', source: AMAZON_MARKETPLACE_SOURCE },
  AE: { iso2: 'AE', label: 'United Arab Emirates', marketplaceId: 'A2VIGQ35RCS4UG', sourceCountryCode: 'AE', continent: 'middle_east', source: AMAZON_MARKETPLACE_SOURCE },
  IN: { iso2: 'IN', label: 'India', marketplaceId: 'A21TJRUUN4KGV', sourceCountryCode: 'IN', continent: 'asia', source: AMAZON_MARKETPLACE_SOURCE },
  SG: { iso2: 'SG', label: 'Singapore', marketplaceId: 'A19VAU5U5O7RUS', sourceCountryCode: 'SG', continent: 'asia', source: AMAZON_MARKETPLACE_SOURCE },
  AU: { iso2: 'AU', label: 'Australia', marketplaceId: 'A39IBJ37TRP1C6', sourceCountryCode: 'AU', continent: 'oceania', source: AMAZON_MARKETPLACE_SOURCE },
  JP: { iso2: 'JP', label: 'Japan', marketplaceId: 'A1VC38T7YXB528', sourceCountryCode: 'JP', continent: 'asia', source: AMAZON_MARKETPLACE_SOURCE },
};


/* ── POLICY roles — Mercenta’s own decisions (shipped UNCONFIGURED) ───────── */

/** FALSE until the Founder sets a production priority policy (never invented). */
export const COUNTRY_PRIORITY_POLICY_CONFIGURED = false;

/**
 * A LABELLED DEMO ILLUSTRATION of an acquisition-priority policy, spanning the
 * continents. It is an illustration a Founder may accept, NOT a production
 * decision — the same discipline as `DEMO_VAT_ILLUSTRATION` and
 * `DEMO_FINANCING_ROUTING`.
 */
export const DEMO_ACQUISITION_PRIORITY_MARKETS: readonly string[] = [
  'GB', 'US', 'DE', 'FR', 'ZA', 'ZW', 'AE', 'IN', 'CN', 'AU',
] as const;

/** A LABELLED DEMO illustration of an accelerator-priority policy. */
export const DEMO_ACCELERATOR_PRIORITY_MARKETS: readonly string[] = ['ZW', 'ZA', 'AE'] as const;

/** Markets localised for but not sourced from and not a marketplace — EMPTY today. */
export const LOCALIZATION_ONLY_MARKETS: readonly string[] = [] as const;

/** Markets considered for the future but not active — EMPTY today. */
export const FUTURE_MARKETS: readonly string[] = [] as const;

/* ── The rules + the refusals, stated once ───────────────────────────────── */

export const COUNTRY_FRAMEWORK_RULES: readonly string[] = [
  'Zimbabwe is an operating/home market and is never represented as an Amazon marketplace.',
  'The marketplace role is earned only where the channel publishes a marketplace id, and is cited to its source.',
  'A brand-origin market is exactly the canonical source-market owner’s list — never a second hand-maintained list.',
  'The priority, localisation-only and future roles are Mercenta’s own decisions, shipped unconfigured until the Founder sets them.',
  'An unlisted country resolves to NO roles and is refused — never guessed into a role it has not earned.',
] as const;

export const COUNTRY_FRAMEWORK_REFUSALS = {
  unknownCountry:
    'COUNTRY_UNKNOWN — that country is not one the framework declares, so it holds no role.',
  marketplaceNeedsId:
    'MARKETPLACE_NEEDS_ID — the marketplace role is only held with a published marketplace id.',
  zimbabweNeverMarketplace:
    'ZIMBABWE_NEVER_MARKETPLACE — Zimbabwe is an operating/home market and is never an Amazon marketplace.',
} as const;

export const COUNTRY_FRAMEWORK_BASIS =
  'The marketplace role is a published fact, cited to the channel’s own marketplace-IDs reference; a brand-origin market is the canonical source-market list; the priority roles are Mercenta’s own decisions and are shipped unconfigured. Zimbabwe is an operating/home market and is never a marketplace.';

export const COUNTRY_FRAMEWORK_DISCLAIMER =
  'A role says nothing about a brand’s commercial model, compliance or settlement — it only classifies the country.';

